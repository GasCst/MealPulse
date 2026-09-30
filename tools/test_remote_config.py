#!/usr/bin/env python3
"""Verify the same Supabase URL lookup and voice request used by the phone.

Run with venv_mlx_tts/bin/python tools/test_remote_config.py.
Credentials are loaded from local environment/.env, never embedded or printed.
"""
import argparse
import io
import json
import os
from pathlib import Path
import time
import urllib.request
import wave

from dotenv import dotenv_values


def test_supabase_remote_config():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--voice", default="zio_italiano")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    config = {**dotenv_values(root / ".env"), **os.environ}
    base = config["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = config["EXPO_PUBLIC_SUPABASE_ANON_KEY"]
    request = urllib.request.Request(
        base + "/rest/v1/app_config?key=eq.tts_api_url&select=value",
        headers={"apikey": key, "Authorization": "Bearer " + key},
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        rows = json.load(response)
    if not rows or not rows[0].get("value"):
        raise RuntimeError("No TTS URL configured in Supabase")
    target = rows[0]["value"].rstrip("/")
    print("Supabase TTS endpoint:", target)
    with urllib.request.urlopen(target + "/health", timeout=5) as response:
        health = json.load(response)
    if health.get("status") != "ok" or not health.get("model_loaded"):
        raise RuntimeError("TTS model is not ready")
    aliases = {"zio_italiano": "napoletano", "chef_sarcastico": "chef_gordon",
               "diva_ironica": "diva", "if_sara": "sara"}
    expected = aliases.get(args.voice, args.voice)
    request = urllib.request.Request(
        target + "/api/v1/tts/roast",
        data=json.dumps({"text": "Uè, guagliò! Jamme, oggi partiamo con energia.",
                         "voice": args.voice, "language": "it"}).encode(),
        headers={"Content-Type": "application/json", "Accept": "audio/wav"},
    )
    started = time.monotonic()
    with urllib.request.urlopen(request, timeout=28) as response:
        audio = response.read()
        actual = response.headers.get("X-Voice-Id")
        if actual != expected:
            raise RuntimeError(f"Wrong voice: expected {expected}, received {actual}")
        print("Voice:", actual, "Engine:", response.headers.get("X-Engine"))
    with wave.open(io.BytesIO(audio)) as wav:
        if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) != (24000, 1, 2):
            raise RuntimeError("Unexpected WAV format")
        if wav.getnframes() <= 2400:
            raise RuntimeError("Empty or truncated voice audio")
    output = root / ".tmp" / "tts-diagnostics" / (args.voice + "-remote.wav")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(audio)
    print(f"Verified remote config, correct voice and WAV in {time.monotonic() - started:.2f}s.")
    print("Audio saved:", output)


if __name__ == "__main__":
    test_supabase_remote_config()
