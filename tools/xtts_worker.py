"""Private stdin/stdout worker; exposes no extra network port."""
import base64
from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
protocol = sys.stdout
with redirect_stdout(sys.stderr):
    import main
    import numpy as np
    import soundfile as sf
    import torch
    main.load_default_model_speakers()

for line in sys.stdin:
    try:
        payload = json.loads(line)
        with redirect_stdout(sys.stderr):
            if payload["command"] == "voices":
                unique = {p["voice_id"]: p for p in main._default_model_speakers.values()}
                result = {"voices": [
                    {k: p[k] for k in ("voice_id", "name", "gender", "emoji", "desc", "category")}
                    for p in unique.values()
                ]}
            elif payload["command"] == "warmup":
                main.load_xtts_model()
                result = {"ready": True}
            elif payload["command"] == "synthesize":
                profile = main.resolve_voice_profile(payload["voice_id"])
                model = main.load_xtts_model()
                with torch.inference_mode():
                    out = model.inference(
                        text=payload["text"], language=payload["language"],
                        gpt_cond_latent=profile["gpt_cond_latent"],
                        speaker_embedding=profile["speaker_embedding"],
                        temperature=payload["temperature"], speed=payload["speed"],
                        enable_text_splitting=True,
                    )
                audio = out["wav"]
                if isinstance(audio, torch.Tensor):
                    audio = audio.cpu().numpy()
                buffer = io.BytesIO()
                sf.write(buffer, np.asarray(audio), 24000, format="WAV", subtype="FLOAT")
                result = {"wav": base64.b64encode(buffer.getvalue()).decode()}
            else:
                raise ValueError("Unknown worker command")
    except Exception as exc:
        result = {"error": str(exc)}
    protocol.write(json.dumps(result) + "\n")
    protocol.flush()
