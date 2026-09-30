"""Transcribe reference clips once; synthesis never runs speech recognition.

Keeps the original recordings intact. Review the generated transcript, especially
dialect spelling, before editing references.json. Run with venv_mlx_tts Python.
"""
import hashlib
import json
import math
from pathlib import Path

import mlx_whisper
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

ROOT = Path(__file__).resolve().parents[1]
VOICES = ROOT / "assets" / "voices"


def main():
    profiles = {}
    for path in sorted(VOICES.glob("*.wav")):
        audio, sr = sf.read(path, dtype="float32")
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        divisor = math.gcd(sr, 16000)
        audio16 = resample_poly(audio, 16000 // divisor, sr // divisor).astype(np.float32)
        result = mlx_whisper.transcribe(
            audio16,
            path_or_hf_repo="mlx-community/whisper-large-v3-turbo",
            language="it",
            word_timestamps=True,
            condition_on_previous_text=False,
        )
        # End on a complete utterance; a short reference reduces prompt overhead.
        segments = result.get("segments", [])
        chosen = []
        for segment in segments:
            if float(segment["end"]) > 15 and chosen:
                break
            chosen.append(segment)
            if float(segment["end"]) >= 8:
                break
        if not chosen:
            raise RuntimeError(f"No speech found in {path.name}")
        start = max(0, float(chosen[0]["start"]) - 0.10)
        end = min(len(audio) / sr, float(chosen[-1]["end"]) + 0.15)
        transcript = " ".join(s["text"].strip() for s in chosen).strip()
        profiles[path.stem] = {
            "source": path.name,
            "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "start_seconds": round(start, 3),
            "end_seconds": round(end, 3),
            "transcript": transcript,
            "transcript_origin": "whisper-large-v3-turbo (automatic; dialect spelling may need review)",
        }
        print(path.stem, round(end - start, 2), transcript, flush=True)
    destination = VOICES / "references.json"
    destination.write_text(json.dumps(profiles, ensure_ascii=False, indent=2) + "\n")
    print(destination)


if __name__ == "__main__":
    main()
