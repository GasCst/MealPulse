"""
MealPulse AI — Coqui XTTS-v2 Zero-Shot Voice Cloning Microservice
FastAPI backend for multi-voice zero-shot speech synthesis with in-memory latent pre-caching.
Optimized for Apple Silicon ARM64 (MPS/CPU) and multi-voice management.
"""

import io
import os
import glob
import time
import logging
import threading
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager

try:
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
from fastapi import FastAPI, HTTPException, status, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [MealPulse-XTTS] %(message)s"
)
logger = logging.getLogger("mealpulse_xtts")

# Cache LRU in memoria per audio generati: risposta istantanea (0 ms) per riproduzioni e switch voci
_audio_cache: OrderedDict[str, bytes] = OrderedDict()
_audio_cache_lock = threading.Lock()
MAX_CACHE_ITEMS = 300

def get_from_audio_cache(key: str) -> Optional[bytes]:
    with _audio_cache_lock:
        if key in _audio_cache:
            _audio_cache.move_to_end(key)
            return _audio_cache[key]
    return None

def put_in_audio_cache(key: str, data: bytes):
    with _audio_cache_lock:
        _audio_cache[key] = data
        if len(_audio_cache) > MAX_CACHE_ITEMS:
            _audio_cache.popitem(last=False)

# Device detection (Apple Silicon MPS / CUDA / CPU)
def resolve_device() -> str:
    forced = os.getenv("TTS_DEVICE", "").strip().lower()
    if HAS_TORCH and torch is not None:
        try:
            num_threads = int(os.getenv("OMP_NUM_THREADS", "6"))
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

DEVICE = resolve_device()
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
VOICES_DIR = os.getenv("VOICES_DIR", os.path.join(os.path.dirname(__file__), "assets", "voices"))

# Global singleton model and voice cache holder
_tts_model = None
_model_lock = threading.Lock()
_voice_cache: Dict[str, Dict[str, Any]] = {}
_default_voice_id: Optional[str] = None

# Aliases per retrocompatibilità con i vecchi ID client dell'app mobile
VOICE_ID_ALIASES = {
    "zio_italiano": "napoletano",
    "chef_sarcastico": "chef_gordon",
    "diva_ironica": "diva",
    "roastmaster": "roastmaster",
    "if_sara": "sara",
}

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
                slug = spk_name.lower().replace(" ", "_")
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
    voice_id = os.path.splitext(filename)[0].lower()

    try:
        start_t = time.time()
        logger.info(f"Pre-calculating voice latents for '{voice_id}' from {filename}...")
        gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(audio_path=[file_path])
        
        _voice_cache[voice_id] = {
            "voice_id": voice_id,
            "file_path": file_path,
            "filename": filename,
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
    """Ciclo di vita dell'applicazione: inizializza XTTS-v2 e pre-calcola i latents in RAM."""
    logger.info("Starting MealPulse XTTS Microservice...")
    logger.info(f"Target device: {DEVICE} | Voices directory: {VOICES_DIR}")
    try:
        model = load_xtts_model()
        scan_and_cache_voices(model)
        load_default_model_speakers()
        logger.info(f"Startup complete: {len(_voice_cache)} comedy voices, {len(_default_model_speakers)//2} default speakers cached in RAM.")
    except Exception as exc:
        logger.error(f"Startup error during model/voice initialization: {exc}", exc_info=True)
    yield
    logger.info("Shutting down MealPulse XTTS Microservice...")
    _voice_cache.clear()
    _default_model_speakers.clear()


# Istanza FastAPI
app = FastAPI(
    title="MealPulse AI - XTTS-v2 Voice Cloning Microservice",
    description="Zero-shot multi-voice speech synthesis engine for viral Italian food roasts.",
    version="2.0.0",
    lifespan=lifespan
)

# Configurazione CORS per consentire chiamate da Expo Web, simulatori e client mobile
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Modelli Pydantic
class TTSRequest(BaseModel):
    text: str = Field(..., description="Testo da sintetizzare in voce (es. roast nutrizionale)", min_length=1)
    voice_id: Optional[str] = Field(None, description="ID della voce registrata (es. 'napoletano', 'chef_gordon', 'claribel_dervla')")
    voice: Optional[str] = Field(None, description="Alias di compatibilità per voice_id")
    language: str = Field("it", description="Codice lingua ISO (default: 'it')")
    temperature: Optional[float] = Field(0.75, description="Temperatura di campionamento per espressività")
    speed: Optional[float] = Field(1.0, description="Velocità di riproduzione audio")


def resolve_voice_profile(requested_voice: Optional[str]) -> Dict[str, Any]:
    """Risolve l'ID voce considerando voci comiche, voci di default del modello, alias e fallback."""
    clean_id = (requested_voice or "").strip().lower()
    clean_slug = clean_id.replace(" ", "_")

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

    # 4. Fallback sulla voce di default
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
async def generate_speech(payload: TTSRequest):
    """
    Endpoint per la sintesi vocale con Zero-Shot Voice Cloning.
    Usa i tensori gpt_cond_latent e speaker_embedding pre-calcolati in RAM.
    """
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Il parametro 'text' non può essere vuoto.")

    requested_voice = payload.voice_id or payload.voice or _default_voice_id
    voice_profile = resolve_voice_profile(requested_voice)
    voice_id = voice_profile["voice_id"]
    speed = float(payload.speed) if payload.speed is not None else 1.10
    temperature = float(payload.temperature) if payload.temperature is not None else 0.70

    # 1. Controlla la cache LRU in RAM: risposta istantanea (0 ms) se già sintetizzato
    cache_key = hashlib.sha256(f"{voice_id}_{payload.language}_{speed:.2f}_{text}".encode("utf-8")).hexdigest()
    cached_wav = get_from_audio_cache(cache_key)
    if cached_wav:
        logger.info(f"Audio cache HIT for voice '{voice_id}' (instant 0 ms return)")
        return Response(
            content=cached_wav,
            media_type="audio/wav",
            headers={
                "Content-Type": "audio/wav",
                "X-Voice-Id": voice_id,
                "X-Audio-Cached": "true",
                "X-Engine": "XTTS-v2",
                "X-Device": DEVICE,
                "Cache-Control": "public, max-age=86400",
            }
        )

    try:
        model = load_xtts_model()
        logger.info(f"Generating XTTS audio for voice '{voice_id}' (lang='{payload.language}', speed={speed}): \"{text[:45]}...\"")
        start_t = time.time()

        # Inferenza zero-shot ultra-veloce con torch.inference_mode()
        infer_ctx = torch.inference_mode if HAS_TORCH and hasattr(torch, "inference_mode") else torch.no_grad
        with infer_ctx():
            out = model.inference(
                text=text,
                language=payload.language,
                gpt_cond_latent=voice_profile["gpt_cond_latent"],
                speaker_embedding=voice_profile["speaker_embedding"],
                temperature=temperature,
                speed=speed,
                enable_text_splitting=True
            )

        wav = out["wav"]
        if isinstance(wav, torch.Tensor):
            wav = wav.cpu().numpy()

        # Normalizzazione del picco audio a 0.95 per evitare clipping e garantire volume omogeneo
        max_val = np.max(np.abs(wav))
        if max_val > 0:
            wav = (wav / max_val) * 0.95

        # Codifica in formato WAV 24000Hz PCM 16-bit
        buffer = io.BytesIO()
        sf.write(buffer, wav, 24000, format="WAV", subtype="PCM_16")
        buffer.seek(0)
        wav_bytes = buffer.read()

        elapsed = time.time() - start_t
        duration_sec = len(wav) / 24000.0
        rtf = elapsed / max(duration_sec, 0.01)
        logger.info(f"Audio generated in {elapsed:.2f}s (duration: {duration_sec:.2f}s, RTF: {rtf:.2f}).")

        # Salva l'audio nella cache LRU in RAM
        put_in_audio_cache(cache_key, wav_bytes)

        return Response(
            content=wav_bytes,
            media_type="audio/wav",
            headers={
                "Content-Type": "audio/wav",
                "X-Voice-Id": voice_id,
                "X-Audio-Duration": f"{duration_sec:.2f}",
                "X-Generation-Time": f"{elapsed:.2f}",
                "X-Audio-Cached": "false",
                "X-Engine": "XTTS-v2",
                "X-Device": DEVICE,
                "Cache-Control": "public, max-age=3600",
            }
        )
    except Exception as exc:
        logger.error(f"Speech generation error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Errore durante la generazione vocale XTTS: {str(exc)}"
        )


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
        "engine": "XTTS-v2"
    }


@app.post("/api/voices/reload")
async def reload_voices():
    """
    Riscansiona la cartella assets/voices e ricalcola i latents in RAM
    senza dover riavviare il server.
    """
    try:
        model = load_xtts_model()
        count = scan_and_cache_voices(model)
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
        "service": "mealpulse-tts-xtts",
        "engine": "Coqui XTTS-v2",
        "device": DEVICE,
        "model_loaded": _tts_model is not None,
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
