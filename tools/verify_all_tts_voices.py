"""Exercise every voice ID shipped in the app against the running TTS service.

Run with tts_env/bin/python tools/verify_all_tts_voices.py --url http://MAC_IP:8000
Writes per-voice WAVs and a JSON report for listening and regression checks.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import re
import time
import urllib.request
import wave


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--output", default="/tmp/mealpulse-voice-verification")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    ids = re.findall(r"id: '([^']+)'", (root / "components/VoiceSelectorModal.tsx").read_text())
    aliases = {"zio_italiano": "napoletano", "chef_sarcastico": "chef_gordon",
               "diva_ironica": "diva", "if_sara": "sara"}
    report = []
    hashes = set()
    for index, voice in enumerate(ids, 1):
        expected = aliases.get(voice, voice)
        entry = {"requested": voice, "expected": expected}
        started = time.monotonic()
        try:
            req = urllib.request.Request(args.url.rstrip("/") + "/api/v1/tts/roast",
                data=json.dumps({"text": "Ciao! Questa è la mia voce. Buon appetito!", "voice": voice}).encode(),
                headers={"Content-Type": "application/json", "Accept": "audio/wav"})
            with urllib.request.urlopen(req, timeout=28) as response:
                data = response.read()
                entry.update(status=response.status, resolved=response.headers.get("X-Voice-Id"),
                             source=response.headers.get("X-Voice-Source"),
                             reference=response.headers.get("X-Voice-Reference"))
                assert response.status == 200
                assert entry["resolved"] == expected, entry
                if voice in aliases or voice == "roastmaster":
                    assert entry["reference"] == expected + ".wav", entry
                    assert entry["source"] == "reference", entry
                    ref_hash = hashlib.sha256((root / "assets/voices" / (expected + ".wav")).read_bytes()).hexdigest()
                    assert response.headers.get("X-Voice-Reference-SHA256") == ref_hash
                else:
                    assert entry["source"] == "model_default", entry
            with wave.open(io.BytesIO(data)) as wav:
                assert wav.getframerate() == 24000 and wav.getsampwidth() == 2
                assert wav.getnchannels() == 1 and wav.getnframes() > 2400
                entry["duration"] = round(wav.getnframes() / wav.getframerate(), 3)
            digest = hashlib.sha256(data).hexdigest()
            assert digest not in hashes, "Two different voices returned identical audio"
            hashes.add(digest)
            (output / (voice + ".wav")).write_bytes(data)
            entry.update(ok=True, sha256=digest)
        except Exception as exc:
            entry.update(ok=False, error=str(exc))
        entry["seconds"] = round(time.monotonic() - started, 3)
        report.append(entry)
        (output / "report.json").write_text(json.dumps(report, indent=2))
        print(f"{index}/{len(ids)} {voice}: {entry}", flush=True)
    failures = [entry for entry in report if not entry["ok"]]
    print(f"Verified {len(report) - len(failures)}/{len(ids)} voices. Report: {output / 'report.json'}")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
