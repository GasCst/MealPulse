"""Qwen3-TTS voice cloning on Apple Silicon; originals and HTTP API stay intact."""
import hashlib
import json
import math
import os
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

DEFAULT_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-4bit"
DEFAULT_REVISION = "37e955a1deb861c088ae5f3a67043185f3d1a60c"
LANGUAGES = {
    "it": "italian", "en": "english", "es": "spanish", "fr": "french",
    "de": "german", "zh": "chinese", "ja": "japanese", "pt": "portuguese",
    "ru": "russian", "ko": "korean",
}


def normalize_speech_text(text: str) -> str:
    """Remove theatrical pause spam without rewriting dialect or numeric facts."""
    import re
    text = text.replace("…", ".").replace("\u2019", "'")
    text = re.sub(r"\.{2,}", ".", text)
    text = re.sub(r"([!?])\.+", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def prepare_pronunciation(text: str, language: str) -> str:
    """Spell out figures for reliable speech, preserving displayed/client text."""
    import re
    from decimal import Decimal, InvalidOperation
    from num2words import num2words
    text = normalize_speech_text(text)
    if language == "it":
        text = re.sub(r"(?<=\d)\s*(?:kcal)\b", " calorie", text, flags=re.I)
        text = re.sub(r"(?<=\d)\s*g\b", " grammi", text, flags=re.I)
        text = re.sub(r"(?<=\d)\s*ml\b", " millilitri", text, flags=re.I)
        text = text.replace("%", " percento")
    if language not in {"it", "en", "es", "fr", "de", "pt", "ru", "ko"}:
        return text

    def spoken_number(match):
        raw = match.group()
        # A dot grouping three digits in Italian notation denotes thousands.
        if language == "it" and re.fullmatch(r"[+-]?[1-9]\d{0,2}(?:\.\d{3})+", raw):
            raw = raw.replace(".", "")
        else:
            raw = raw.replace(",", ".")
        try:
            value = Decimal(raw)
            # Italian num2words truncates Decimal inputs; floats use its decimal
            # speech path (e.g. 1.5 -> uno virgola cinque).
            return num2words(int(value) if value == int(value) else float(value), lang=language)
        except (ValueError, InvalidOperation, NotImplementedError, OverflowError):
            return match.group()

    return re.sub(r"(?<!\w)[+-]?\d+(?:[.,]\d+)*(?!\w)", spoken_number, text)


class MlxTtsEngine:
    name = "Qwen3-TTS-MLX"
    device = "metal"

    def __init__(self, voices_dir: str):
        self.voices_dir = Path(voices_dir)
        self.model_id = os.getenv("TTS_MLX_MODEL", DEFAULT_MODEL)
        self.revision = os.getenv("TTS_MLX_REVISION", DEFAULT_REVISION if self.model_id == DEFAULT_MODEL else "main")
        self.identity = f"{self.model_id}@{self.revision}:mlx-audio-0.5.7:references-v1:numbers-v1"
        self.model = None
        self.profiles = {}
        self._embeddings = {}

    def load(self):
        from huggingface_hub import snapshot_download
        from mlx_audio.tts.utils import load_model
        path = snapshot_download(self.model_id, revision=self.revision)
        self.model = load_model(path)
        if self.model.tokenizer is None or not self.model.speech_tokenizer.has_encoder:
            raise RuntimeError("Qwen Base tokenizer/voice cloning encoder unavailable")
        # MLX-Audio caches reference codec tokens, but recomputes the speaker
        # embedding. These immutable arrays live as long as the voice profiles.
        extract = self.model.extract_speaker_embedding

        def cached_embedding(audio, sr=24000):
            key = id(audio)
            if key in self._embeddings:
                return self._embeddings[key]
            result = extract(audio, sr)
            if any(p["ref_audio"] is audio for p in self.profiles.values()):
                self._embeddings[key] = result
            return result

        self.model.extract_speaker_embedding = cached_embedding
        self.reload_references()
        if os.getenv("TTS_MLX_WARMUP", "1") == "1" and self.profiles:
            profile = self.profiles.get("napoletano", next(iter(self.profiles.values())))
            self.synthesize("Uè guagliò, jamme!", profile)

    def reload_references(self):
        import mlx.core as mx
        manifest = json.loads((self.voices_dir / "references.json").read_text())
        profiles = {}
        for voice_id, reference in manifest.items():
            source = self.voices_dir / reference["source"]
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            if digest != reference["source_sha256"]:
                raise ValueError(f"Reference changed for {voice_id}; transcribe it again")
            audio, sr = sf.read(source, dtype="float32")
            if audio.ndim > 1:
                audio = audio.mean(axis=1)
            start = int(reference["start_seconds"] * sr)
            end = int(reference["end_seconds"] * sr)
            if not 0 <= start < end <= len(audio) or not reference["transcript"].strip():
                raise ValueError(f"Invalid reference range/transcript for {voice_id}")
            audio = audio[start:end]
            divisor = math.gcd(sr, 24000)
            if sr != 24000:
                audio = resample_poly(audio, 24000 // divisor, sr // divisor)
            conditioning_hash = hashlib.sha256(
                json.dumps(reference, sort_keys=True, ensure_ascii=False).encode()
            ).hexdigest()
            profiles[voice_id] = {
                "voice_id": voice_id, "filename": source.name,
                "file_path": str(source), "reference_sha256": digest,
                "conditioning_sha256": conditioning_hash,
                "ref_audio": mx.array(audio.astype(np.float32)),
                "ref_text": reference["transcript"],
                "engine": self.name,
            }
        # Swap only after validating every clip. No partial reload on failure.
        self.profiles = profiles
        self._embeddings.clear()
        self.model._icl_cache.clear()
        for profile in profiles.values():
            # Version-pinned adapter: populate codec/text and embedding caches
            # before accepting phone requests; this is not ASR at request time.
            inputs = self.model._prepare_icl_generation_inputs(
                "Ciao.", profile["ref_audio"], profile["ref_text"], "italian"
            )
            mx.eval(*inputs)
        mx.clear_cache()
        return profiles

    def synthesize(self, text, profile, language="it", temperature=0.75, speed=1.0):
        import mlx.core as mx
        if language not in LANGUAGES:
            raise ValueError(f"Unsupported language: {language}")
        results = list(self.model.generate(
            text=prepare_pronunciation(text, language),
            ref_audio=profile["ref_audio"], ref_text=profile["ref_text"],
            lang_code=LANGUAGES[language], temperature=temperature,
            max_tokens=768, verbose=False,
        ))
        if not results:
            raise RuntimeError("The model produced no audio")
        audio = np.concatenate([np.asarray(r.audio, dtype=np.float32).reshape(-1) for r in results])
        if audio.size == 0 or not np.isfinite(audio).all():
            raise RuntimeError("The model produced invalid audio")
        sample_rate = results[0].sample_rate
        if speed != 1.0:
            import librosa
            audio = librosa.effects.time_stretch(audio, rate=speed)
        if sample_rate != 24000:
            divisor = math.gcd(sample_rate, 24000)
            audio = resample_poly(audio, 24000 // divisor, sample_rate // divisor)
        mx.clear_cache()
        return audio
