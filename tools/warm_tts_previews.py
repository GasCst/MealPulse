"""Generate the installed app's exact voice previews into the server cache."""
import argparse
import io
import json
from pathlib import Path
import re
import time
import urllib.request
import wave

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:8000")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
source = (root / "components/VoiceSelectorModal.tsx").read_text()
voices = re.findall(r"id: '([^']+)',\s*name: '([^']+)'", source)
report = []
for index, (voice, name) in enumerate(voices, 1):
    text = ("Uè wagliò!... Sono il tuo Coach Personale, oggi si mangia sano e verace!" if voice == "zio_italiano"
            else "Benvenuto in cucina!... Meno scuse, zero carboidrati extra e massima disciplina!" if voice == "chef_sarcastico"
            else f"Inizializzazione completata... Sono {name}, il tuo assistente nutrizionale personale!")
    start = time.monotonic()
    req = urllib.request.Request(args.url.rstrip("/") + "/api/v1/tts/roast",
        data=json.dumps({"text": text, "voice": voice}).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=28) as response:
        data = response.read()
        with wave.open(io.BytesIO(data)) as wav:
            assert wav.getnframes() > 2400
        row = dict(voice=voice, resolved=response.headers["X-Voice-Id"],
                   cached=response.headers["X-Audio-Cached"], seconds=round(time.monotonic() - start, 3))
    report.append(row)
    print(f"{index}/{len(voices)} {row}", flush=True)
    Path("/tmp/mealpulse-tts-preview-timings.json").write_text(json.dumps(report, indent=2))
print(f"Ready: {len(report)} voice previews", flush=True)
