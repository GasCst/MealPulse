"""
MealPulse AI — local voice cloning with MLX/Qwen and compatible XTTS speakers.
"""

import io
import os
import glob
import time
import logging
import threading
import re
import unicodedata
import base64
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

try:
    # Keep MLX and the older Coqui/Transformers environment isolated.
    if os.getenv("TTS_ENGINE", "xtts").lower() == "mlx":
        raise ImportError("PyTorch runs only in the legacy voice worker")
    import torch
    import torchaudio
    HAS_TORCH = True
    # Patch 1: PyTorch 2.6+ compatibilità checkpoint deserialization
    _orig_torch_load = torch.load
    def _safe_torch_load(*args, **kwargs):
        if "weights_only" not in kwargs:
            kwargs["weights_only"] = False
        return _orig_torch_load(*args, **kwargs)
    torch.load = _safe_torch_load

    # Patch 2: torchaudio 2.11+ compatibilità (evita torchcodec non disponibile su ARM64 Linux slim)
    def _safe_torchaudio_load(filepath, *args, **kwargs):
        import soundfile as sf
        data, sr = sf.read(filepath, dtype='float32')
        tensor = torch.from_numpy(data)
        if tensor.ndim == 1:
            tensor = tensor.unsqueeze(0)
        elif tensor.ndim == 2:
            tensor = tensor.t()
        return tensor, sr
    torchaudio.load = _safe_torchaudio_load
except ImportError:
    torch = None  # type: ignore
    HAS_TORCH = False

import hashlib
from collections import OrderedDict
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException, status, Response, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from tts_audio_cache import DiskAudioCache

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MealPulse-TTS] %(message)s"
)
logger = logging.getLogger("mealpulse_xtts")

# Cache LRU in memoria per audio generati: risposta istantanea (0 ms) per riproduzioni e switch voci
_audio_cache: OrderedDict[str, bytes] = OrderedDict()
_audio_cache_lock = threading.Lock()
MAX_CACHE_ITEMS = 300
_disk_audio_cache = DiskAudioCache(os.getenv(
    "TTS_AUDIO_CACHE_DIR", os.path.join(os.path.dirname(__file__), ".tmp", "tts-audio-cache")))
# Bump when changing model weights or synthesis settings that are not in the key.
AUDIO_CACHE_VERSION = "mealpulse-tts-3"

def get_from_audio_cache(key: str) -> Optional[bytes]:
    with _audio_cache_lock:
        if key in _audio_cache:
            _audio_cache.move_to_end(key)
            return _audio_cache[key]
    data = _disk_audio_cache.get(key)
    if data is not None:
        with _audio_cache_lock:
            _audio_cache[key] = data
            if len(_audio_cache) > MAX_CACHE_ITEMS:
                _audio_cache.popitem(last=False)
    return data

def put_in_audio_cache(key: str, data: bytes):
    with _audio_cache_lock:
        _audio_cache[key] = data
        if len(_audio_cache) > MAX_CACHE_ITEMS:
            _audio_cache.popitem(last=False)
    _disk_audio_cache.put(key, data)

# Device detection (Apple Silicon MPS / CUDA / CPU)
def resolve_device() -> str:
    forced = os.getenv("TTS_DEVICE", "").strip().lower()
    if HAS_TORCH and torch is not None:
        try:
            # MPS does the heavy computation on the GPU; excess CPU threads add
            # dispatch overhead. Benchmarked on Apple Silicon, with env override.
            default_threads = "1" if (forced == "mps" or (
                not forced and torch.backends.mps.is_available())) else "6"
            num_threads = int(os.getenv("OMP_NUM_THREADS", default_threads))
            torch.set_num_threads(num_threads)
            logger.info(f"PyTorch CPU threads configured to: {num_threads}")
        except Exception:
            pass
    if forced in ("mps", "cuda", "cpu"):
        return forced
    if HAS_TORCH and torch is not None:
        if torch.backends.mps.is_available():
            logger.info("Apple Silicon MPS (Metal Performance Shaders) detected and active.")
            return "mps"
        if torch.cuda.is_available():
            logger.info("NVIDIA CUDA GPU detected and active.")
            return "cuda"
    logger.info("Using multi-threaded CPU acceleration.")
    return "cpu"

ENGINE = os.getenv("TTS_ENGINE", "xtts").lower()
if ENGINE not in ("mlx", "xtts"):
    raise ValueError("TTS_ENGINE must be 'mlx' or 'xtts'")
DEVICE = "metal" if ENGINE == "mlx" else resolve_device()
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
VOICES_DIR = os.getenv("VOICES_DIR", os.path.join(os.path.dirname(__file__), "assets", "voices"))

# Global singleton model and voice cache holder
_tts_model = None
_model_lock = threading.Lock()
_inference_lock = threading.Lock()
_voice_cache: Dict[str, Dict[str, Any]] = {}
_default_voice_id: Optional[str] = None
_mlx_engine = None
_legacy_worker = None
_dialect_adapter = None

# Aliases per retrocompatibilità con i vecchi ID client dell'app mobile
VOICE_ID_ALIASES = {
    "zio_italiano": "napoletano",
    "chef_sarcastico": "chef_gordon",
    "diva_ironica": "diva",
    "roastmaster": "roastmaster",
    "if_sara": "sara",
    "im_nicola": "napoletano",
    "zio_napoletano": "napoletano",
    "diva_snob": "diva",
    "stand_up_comico": "roastmaster",
    "sara_gen_z": "sara",
}


def normalize_voice_id(value: str) -> str:
    """Match installed clients' ASCII IDs to XTTS's accented speaker names."""
    value = unicodedata.normalize("NFKD", value.strip().lower().replace("ı", "i"))
    value = "".join(char for char in value if not unicodedata.combining(char))
    return re.sub(r"[\s-]+", "_", value)

# Nomi leggibili per i personaggi MealPulse
CHARACTER_METADATA = {
    "napoletano": {"name": "Zio Napoletano", "emoji": "🤌", "desc": "Verace, passionale, napoletano"},
    "chef_gordon": {"name": "Chef Gordon", "emoji": "👨‍🍳", "desc": "Spietato, autoritario, severo"},
    "diva": {"name": "Diva Snob", "emoji": "💅", "desc": "Milanese snob, chic, sarcastica"},
    "roastmaster": {"name": "Stand-up Comico", "emoji": "⚡", "desc": "Comico romano da cabaret"},
    "sara": {"name": "Sara Gen-Z", "emoji": "🎙️", "desc": "Fitness bestie dinamica e tagliente"},
}

# Cache delle 58 voci di base di XTTS-v2 pre-calcolate
_default_model_speakers: Dict[str, Dict[str, Any]] = {}

FEMALE_SPEAKERS = {
    "claribel dervla", "daisy studious", "gracie wise", "tammie ema", "alison dietlinde",
    "ana florence", "annmarie nele", "asya anara", "brenda stern", "gitta nikolina",
    "henriette usha", "sofia hellen", "tammy grit", "tanja adelina", "vjollca johnnie",
    "nova hogarth", "maja ruoho", "uta obando", "lidiya szekeres", "chandra macfarland",
    "szofi granger", "camilla holmström", "lilya stainthorpe", "zofija kendrick", "narelle moon",
    "barbora maclean", "alexandra hisakawa", "alma maría", "rosemary okafor", "ige behringer"
}


def load_default_model_speakers() -> int:
    """Carica i tensori pre-calcolati delle 58 voci native di base da speakers_xtts.pth."""
    global _default_model_speakers
    _default_model_speakers.clear()

    candidate_paths = (
        glob.glob(os.path.expanduser("~/Library/Application Support/tts/**/speakers_xtts.pth"), recursive=True) +
        glob.glob(os.path.expanduser("~/.local/share/tts/**/speakers_xtts.pth"), recursive=True) +
        glob.glob("/root/.local/share/tts/**/speakers_xtts.pth", recursive=True) +
        [os.path.join(os.path.dirname(__file__), "speakers_xtts.pth")]
    )

    valid_path = None
    for p in candidate_paths:
        if os.path.isfile(p):
            valid_path = p
            break

    if not valid_path:
        logger.warning("No 'speakers_xtts.pth' found. Default model speakers will not be loaded.")
        return 0

    try:
        t0 = time.time()
        logger.info(f"Loading 58 default XTTS-v2 model speakers from '{valid_path}'...")
        speakers_dict = torch.load(valid_path, map_location="cpu", weights_only=False)

        count = 0
        for spk_name, spk_tensors in speakers_dict.items():
            if isinstance(spk_tensors, dict) and "gpt_cond_latent" in spk_tensors and "speaker_embedding" in spk_tensors:
                slug = normalize_voice_id(spk_name)
                gender = "female" if spk_name.lower() in FEMALE_SPEAKERS else "male"
                spk_entry = {
                    "voice_id": slug,
                    "name": spk_name,
                    "gender": gender,
                    "emoji": "🤖",
                    "desc": f"Voce neurale di base ({'Femminile' if gender == 'female' else 'Maschile'} / Robot)",
                    "category": "model_default",
                    "gpt_cond_latent": spk_tensors["gpt_cond_latent"],
                    "speaker_embedding": spk_tensors["speaker_embedding"],
                    "cached_at": time.time(),
                }
                _default_model_speakers[slug] = spk_entry
                _default_model_speakers[spk_name.lower()] = spk_entry
                count += 1

        elapsed = time.time() - t0
        logger.info(f"Loaded {count} default model speakers in {elapsed:.3f}s.")
        return count
    except Exception as exc:
        logger.error(f"Error loading speakers_xtts.pth: {exc}", exc_info=True)
        return 0


def load_xtts_model():
    """Carica il modello XTTS-v2 singleton sul device selezionato (MPS / CPU / CUDA)."""
    global _tts_model
    if _tts_model is None:
        with _model_lock:
            if _tts_model is None:
                logger.info(f"Loading Coqui XTTS-v2 ({MODEL_NAME}) on device '{DEVICE}'...")
                start_t = time.time()
                try:
                    from TTS.api import TTS
                    tts_instance = TTS(model_name=MODEL_NAME, progress_bar=False)
                    try:
                        tts_instance.to(DEVICE)
                    except Exception as dev_err:
                        logger.warning(f"Device transfer to '{DEVICE}' failed: {dev_err}. Falling back to CPU.")
                        tts_instance.to("cpu")
                    _tts_model = tts_instance.synthesizer.tts_model
                    elapsed = time.time() - start_t
                    logger.info(f"XTTS-v2 loaded successfully in {elapsed:.2f}s.")
                except Exception as exc:
                    logger.error(f"Fatal error loading XTTS-v2: {exc}", exc_info=True)
                    raise RuntimeError(f"Unable to load XTTS-v2 model: {exc}")
    return _tts_model


def cache_voice_latents_for_file(file_path: str, model) -> Optional[str]:
    """
    Estrae e memorizza in RAM i tensori gpt_cond_latent e speaker_embedding
    per un singolo file audio .wav.
    """
    global _voice_cache, _default_voice_id
    filename = os.path.basename(file_path)
    voice_id = normalize_voice_id(os.path.splitext(filename)[0])

    try:
        start_t = time.time()
        logger.info(f"Pre-calculating voice latents for '{voice_id}' from {filename}...")
        gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(audio_path=[file_path])
        with open(file_path, "rb") as reference:
            reference_sha256 = hashlib.sha256(reference.read()).hexdigest()
        
        _voice_cache[voice_id] = {
            "voice_id": voice_id,
            "file_path": file_path,
            "filename": filename,
            "reference_sha256": reference_sha256,
            "gpt_cond_latent": gpt_cond_latent,
            "speaker_embedding": speaker_embedding,
            "cached_at": time.time(),
        }
        elapsed = time.time() - start_t
        logger.info(f"Voice '{voice_id}' cached in RAM successfully in {elapsed:.2f}s.")

        if _default_voice_id is None or voice_id in ("napoletano", "zio_italiano"):
            _default_voice_id = voice_id

        return voice_id
    except Exception as exc:
        logger.error(f"Failed to pre-calculate latents for '{filename}': {exc}", exc_info=True)
        return None


def scan_and_cache_voices(model) -> int:
    """Scansiona la directory assets/voices e calcola i latents in RAM per tutti i .wav."""
    os.makedirs(VOICES_DIR, exist_ok=True)
    audio_files = glob.glob(os.path.join(VOICES_DIR, "*.wav")) + glob.glob(os.path.join(VOICES_DIR, "*.mp3"))
    
    cached_count = 0
    logger.info(f"Scanning voices directory '{VOICES_DIR}': found {len(audio_files)} audio files.")
    for fpath in audio_files:
        vid = cache_voice_latents_for_file(fpath, model)
        if vid:
            cached_count += 1
            
    if cached_count == 0:
        logger.warning(
            f"No .wav reference voice files found in '{VOICES_DIR}'. "
            f"Please place your reference audio clips (e.g. napoletano.wav, chef_gordon.wav) in {VOICES_DIR}."
        )
    return cached_count


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Prepare cloning references once before accepting phone requests."""
    global _mlx_engine, _legacy_worker, _default_voice_id, _dialect_adapter
    logger.info("Starting MealPulse TTS (%s)...", ENGINE)
    logger.info(f"Target device: {DEVICE} | Voices directory: {VOICES_DIR}")
    try:
        from tts_dialect import DialectAdapter
        _dialect_adapter = DialectAdapter()
        if ENGINE == "mlx":
            from mlx_tts_engine import MlxTtsEngine
            from tts_xtts_bridge import XttsBridge
            _mlx_engine = MlxTtsEngine(VOICES_DIR)
            _mlx_engine.load()
            _voice_cache.update(_mlx_engine.profiles)
            _default_voice_id = "napoletano" if "napoletano" in _voice_cache else next(iter(_voice_cache), None)
            _legacy_worker = XttsBridge()
            for profile in _legacy_worker.call("voices")["voices"]:
                profile["engine"] = "XTTS-v2"
                _default_model_speakers[profile["voice_id"]] = profile
            if os.getenv("TTS_LEGACY_WARMUP", "1") == "1":
                _legacy_worker.call("warmup")
        else:
            model = load_xtts_model()
            scan_and_cache_voices(model)
            load_default_model_speakers()
        logger.info("Startup complete: %d cloned voices, %d legacy speakers.", len(_voice_cache),
                    len({p['voice_id'] for p in _default_model_speakers.values()}))
    except Exception as exc:
        logger.error(f"Startup error during model/voice initialization: {exc}", exc_info=True)
        if _legacy_worker:
            _legacy_worker.close()
        if _dialect_adapter:
            _dialect_adapter.close()
        raise
    try:
        yield
    finally:
        logger.info("Shutting down MealPulse TTS...")
        if _legacy_worker:
            _legacy_worker.close()
        if _dialect_adapter:
            _dialect_adapter.close()
        _voice_cache.clear()
        _default_model_speakers.clear()


# Istanza FastAPI
app = FastAPI(
    title="MealPulse AI - Local Voice Cloning",
    description="Zero-shot multi-voice speech synthesis engine for viral Italian food roasts.",
    version="3.0.0",
    lifespan=lifespan
)

# Configurazione CORS per consentire chiamate da Expo Web, simulatori e client mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Voice-Id", "X-Engine", "X-Audio-Cached", "X-Generation-Time", "X-Queue-Time"],
)


# Modelli Pydantic
class TTSRequest(BaseModel):
    text: str = Field(..., description="Testo da sintetizzare in voce (es. roast nutrizionale)", min_length=1)
    voice_id: Optional[str] = Field(None, description="ID della voce registrata (es. 'napoletano', 'chef_gordon', 'claribel_dervla')")
    voice: Optional[str] = Field(None, description="Alias di compatibilità per voice_id")
    language: str = Field("it", description="Codice lingua ISO (default: 'it')")
    temperature: Optional[float] = Field(0.75, ge=0.1, le=1.2, description="Temperatura di campionamento per espressività")
    speed: Optional[float] = Field(1.0, ge=0.75, le=1.3, description="Velocità di riproduzione audio")


def resolve_voice_profile(requested_voice: Optional[str]) -> Dict[str, Any]:
    """Risolve l'ID voce considerando voci comiche, voci di default del modello, alias e fallback."""
    clean_id = normalize_voice_id(requested_voice or "")
    clean_slug = clean_id

    # 1. Verifica alias retrocompatibili
    if clean_id in VOICE_ID_ALIASES:
        clean_id = VOICE_ID_ALIASES[clean_id]
        clean_slug = clean_id

    # 2. Controlla tra le 5 voci comiche personalizzate
    if clean_id in _voice_cache:
        return _voice_cache[clean_id]
    if clean_slug in _voice_cache:
        return _voice_cache[clean_slug]

    # 3. Controlla tra le 58 voci di base del modello
    if clean_slug in _default_model_speakers:
        return _default_model_speakers[clean_slug]
    if clean_id in _default_model_speakers:
        return _default_model_speakers[clean_id]

    # Never silently substitute a different speaker for an explicit selection.
    if clean_id:
        raise HTTPException(status_code=422, detail=f"Unknown voice: {requested_voice}")

    # 4. Default only when the client did not select a voice.
    if _default_voice_id and _default_voice_id in _voice_cache:
        logger.warning(f"Voice '{requested_voice}' not found. Falling back to default '{_default_voice_id}'.")
        return _voice_cache[_default_voice_id]

    # 5. Fallback sulla prima voce comica o prima voce di base
    if _voice_cache:
        first_key = next(iter(_voice_cache.keys()))
        logger.warning(f"Voice '{requested_voice}' not found. Falling back to first available '{first_key}'.")
        return _voice_cache[first_key]

    if _default_model_speakers:
        first_def = next(iter(_default_model_speakers.keys()))
        return _default_model_speakers[first_def]

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Nessun profilo vocale disponibile in RAM."
    )


# ==============================================================================
# ENDPOINT PRINCIPALI
# ==============================================================================

@app.post("/api/tts")
@app.post("/api/v1/tts/roast")
def generate_speech(payload: TTSRequest, request: Request):
    """Return the same PCM16 WAV contract to old and new mobile clients."""
    from mlx_tts_engine import normalize_speech_text
    text = normalize_speech_text(payload.text)
    if not text:
        raise HTTPException(status_code=400, detail="Il parametro 'text' non può essere vuoto.")
    language = payload.language.lower().split("-")[0]
    supported_languages = {"it", "en", "es", "fr", "de", "zh", "ja", "pt", "ru", "ko"}
    if language not in supported_languages:
        raise HTTPException(status_code=422, detail=f"Unsupported language: {payload.language}")
    requested_voice = payload.voice_id or payload.voice or _default_voice_id
    profile = resolve_voice_profile(requested_voice)
    voice_id = profile["voice_id"]
    use_mlx = ENGINE == "mlx" and profile.get("engine") == "Qwen3-TTS-MLX"
    engine_name = "Qwen3-TTS-MLX" if use_mlx else "XTTS-v2"
    engine_identity = _mlx_engine.identity if use_mlx else MODEL_NAME
    device = "metal" if use_mlx else (os.getenv("TTS_DEVICE", "mps") if ENGINE == "mlx" else DEVICE)
    speed = float(payload.speed) if payload.speed is not None else 1.0
    temperature = float(payload.temperature) if payload.temperature is not None else 0.75
    cache_key = hashlib.sha256(repr((
        AUDIO_CACHE_VERSION, engine_identity, voice_id, profile.get("reference_sha256"),
        profile.get("conditioning_sha256"), language, speed, temperature, text,
        _dialect_adapter.cache_identity if _dialect_adapter else None,
    )).encode("utf-8")).hexdigest()
    headers = {
        "X-Voice-Id": voice_id,
        "X-Voice-Source": "reference" if "filename" in profile else "model_default",
        "X-Voice-Reference": profile.get("filename", ""),
        "X-Voice-Reference-SHA256": profile.get("reference_sha256", ""),
        "X-Engine": engine_name, "X-Device": device, "Cache-Control": "no-store",
    }
    cached = get_from_audio_cache(cache_key)
    if cached:
        return Response(content=cached, media_type="audio/wav", headers={
            **headers, "X-Audio-Cached": "true", "X-Generation-Time": "0", "X-Queue-Time": "0",
        })
    logger.info("TTS client=%s voice=%s engine=%s language=%s chars=%d",
                request.client.host if request.client else "unknown", voice_id,
                engine_name, language, len(text))
    queued_at = time.perf_counter()
    try:
        # Serialize mutable model state. Cached audio and health remain available.
        with _inference_lock:
            start = time.perf_counter()
            cached = get_from_audio_cache(cache_key)
            if cached:
                return Response(content=cached, media_type="audio/wav", headers={
                    **headers, "X-Audio-Cached": "true", "X-Generation-Time": "0",
                    "X-Queue-Time": f"{start - queued_at:.3f}",
                })
            speech_text, dialect_status = _dialect_adapter.adapt(text, voice_id, language) if _dialect_adapter else (text, "unavailable")
            if use_mlx:
                wav = _mlx_engine.synthesize(speech_text, profile, language, temperature, speed)
            elif ENGINE == "mlx":
                result = _legacy_worker.call("synthesize", text=speech_text, voice_id=voice_id,
                                             language=language, temperature=temperature, speed=speed)
                wav, _ = sf.read(io.BytesIO(base64.b64decode(result["wav"])), dtype="float32")
            else:
                model = load_xtts_model()
                with torch.inference_mode():
                    out = model.inference(
                        text=speech_text, language=language, gpt_cond_latent=profile["gpt_cond_latent"],
                        speaker_embedding=profile["speaker_embedding"], temperature=temperature,
                        speed=speed, enable_text_splitting=True,
                    )
                wav = out["wav"]
                if isinstance(wav, torch.Tensor):
                    wav = wav.cpu().numpy()
            wav = np.asarray(wav, dtype=np.float32).reshape(-1)
            if wav.size == 0 or not np.isfinite(wav).all():
                raise RuntimeError("Invalid audio from speech model")
            peak = np.max(np.abs(wav))
            if peak > 0:
                wav = wav / peak * 0.95
            buffer = io.BytesIO()
            sf.write(buffer, wav, 24000, format="WAV", subtype="PCM_16")
            wav_bytes = buffer.getvalue()
            # A transient rewrite failure must not permanently cache Italian
            # speech for a character configured to speak Neapolitan.
            if dialect_status != "unavailable" or voice_id != "napoletano" or not _dialect_adapter or not _dialect_adapter.enabled:
                put_in_audio_cache(cache_key, wav_bytes)
            elapsed = time.perf_counter() - start
        duration = len(wav) / 24000.0
        logger.info("TTS %s/%s generated %.2fs audio in %.2fs; queue %.2fs",
                    voice_id, engine_name, duration, elapsed, start - queued_at)
        return Response(content=wav_bytes, media_type="audio/wav", headers={
            **headers, "X-Audio-Duration": f"{duration:.2f}",
            "X-Generation-Time": f"{elapsed:.3f}", "X-Queue-Time": f"{start - queued_at:.3f}",
            "X-Audio-Cached": "false",
            "X-Dialect-Status": dialect_status,
        })
    except Exception as exc:
        logger.error("Speech generation error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Generazione vocale non riuscita. Riprova.") from exc


@app.get("/api/voices")
@app.get("/api/v1/tts/voices")
async def list_available_voices():
    """
    Restituisce l'elenco completo di tutte le voci disponibili:
    - 5 voci comiche roast personalizzate
    - 58 voci native di base del modello (robot / standard)
    """
    roast_list = []
    for vid, profile in _voice_cache.items():
        meta = CHARACTER_METADATA.get(vid, {})
        roast_list.append({
            "id": vid,
            "name": meta.get("name", vid.replace("_", " ").title()),
            "emoji": meta.get("emoji", "🎙️"),
            "description": meta.get("desc", f"Voce comica clonata da {profile.get('filename', vid)}"),
            "category": "roast_character",
            "gender": "character",
            "is_default_model": False,
            "cached": True,
            "engine": profile.get("engine", "XTTS-v2"),
        })

    seen_slugs = set()
    default_speakers_list = []
    for slug, profile in _default_model_speakers.items():
        actual_slug = profile["voice_id"]
        if actual_slug in seen_slugs:
            continue
        seen_slugs.add(actual_slug)
        default_speakers_list.append({
            "id": actual_slug,
            "name": profile["name"],
            "emoji": profile.get("emoji", "🤖"),
            "description": profile.get("desc", "Voce AI di base del modello"),
            "category": "model_default",
            "gender": profile.get("gender", "neutral"),
            "is_default_model": True,
            "cached": True,
            "engine": profile.get("engine", "XTTS-v2"),
        })

    # Ordina le voci di default alfabeticamente per nome
    default_speakers_list.sort(key=lambda v: v["name"])
    all_voices = roast_list + default_speakers_list

    return {
        "voices": all_voices,
        "roast_characters": roast_list,
        "default_speakers": default_speakers_list,
        "total": len(all_voices),
        "total_roast": len(roast_list),
        "total_default_speakers": len(default_speakers_list),
        "default_voice": _default_voice_id,
        "device": DEVICE,
        "engine": "Qwen3-TTS-MLX" if ENGINE == "mlx" else "XTTS-v2"
    }


@app.post("/api/voices/reload")
def reload_voices():
    """
    Riscansiona la cartella assets/voices e ricalcola i latents in RAM
    senza dover riavviare il server.
    """
    try:
        with _inference_lock:
            if ENGINE == "mlx":
                profiles = _mlx_engine.reload_references()
                _voice_cache.clear()
                _voice_cache.update(profiles)
                count = len(profiles)
            else:
                model = load_xtts_model()
                _voice_cache.clear()
                count = scan_and_cache_voices(model)
            with _audio_cache_lock:
                _audio_cache.clear()
            _disk_audio_cache.clear()
        return {
            "status": "success",
            "message": f"Ricaricate con successo {count} voci in RAM.",
            "voices_loaded": list(_voice_cache.keys()),
            "default_voice": _default_voice_id
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Errore durante il reload delle voci: {exc}")


@app.get("/health")
async def health_check():
    """Health check dettagliato con stato del modello, device e voci in RAM."""
    return {
        "status": "ok",
        "service": "mealpulse-tts",
        "engine": "Qwen3-TTS-MLX" if ENGINE == "mlx" else "Coqui XTTS-v2",
        "model": _mlx_engine.identity if _mlx_engine else MODEL_NAME,
        "device": DEVICE,
        "model_loaded": bool(_mlx_engine and _mlx_engine.model is not None) if ENGINE == "mlx" else _tts_model is not None,
        "legacy_speakers_count": len({p["voice_id"] for p in _default_model_speakers.values()}),
        "dialect_rewrite_enabled": bool(_dialect_adapter and _dialect_adapter.enabled and _dialect_adapter.api_key),
        "voices_cached_count": len(_voice_cache),
        "audio_cache_count": len(_audio_cache),
        "voices_available": list(_voice_cache.keys()),
        "default_voice": _default_voice_id,
        "voices_dir": VOICES_DIR
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, workers=1)
