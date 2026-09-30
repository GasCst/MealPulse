"""Measure uncached XTTS inference with fixed prompts/seeds on this Mac."""
import json
from pathlib import Path
import random
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import main
import torch
import numpy as np

model = main.load_xtts_model()
main.cache_voice_latents_for_file(str(Path(main.VOICES_DIR) / "napoletano.wav"), model)
profile = main.resolve_voice_profile("zio_italiano")
print("Attention:", type(model.gpt.gpt.h[0].attn).__name__, flush=True)
prompts = ["Uè wagliò! Sono il tuo Coach Personale, oggi si mangia sano e verace!",
           "Buongiorno! Oggi hai un budget di duemila calorie. Mangia bene e non dimenticare di bere acqua!"]
results = []
for threads in [6, 1, 2, 4, 6]:
    torch.set_num_threads(threads)
    for index, text in enumerate(prompts):
        random.seed(104 + index)
        np.random.seed(104 + index)
        torch.manual_seed(104 + index)
        if model.device.type == "mps":
            torch.mps.synchronize()
        start = time.perf_counter()
        with torch.inference_mode():
            out = model.inference(text=text, language="it",
                gpt_cond_latent=profile["gpt_cond_latent"],
                speaker_embedding=profile["speaker_embedding"],
                temperature=.75, speed=1., enable_text_splitting=True)
        if model.device.type == "mps":
            torch.mps.synchronize()
        elapsed = time.perf_counter() - start
        duration = len(out["wav"]) / 24000
        row = dict(threads=threads, prompt=index, seconds=round(elapsed, 3),
                   audio_seconds=round(duration, 3), rtf=round(elapsed / duration, 3))
        results.append(row)
        print(json.dumps(row), flush=True)
Path("/tmp/mealpulse-tts-thread-benchmark.json").write_text(json.dumps(results, indent=2))
