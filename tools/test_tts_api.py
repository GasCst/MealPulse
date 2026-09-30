"""Contract/routing/cache tests without downloading or generating model weights."""
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

os.environ["TTS_ENGINE"] = "mlx"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient
import main
from tts_audio_cache import DiskAudioCache


class FakeEngine:
    identity = "model-test@revision-1"
    model = object()

    def __init__(self):
        self.calls = []

    def synthesize(self, text, profile, language, temperature, speed):
        self.calls.append((text, profile["voice_id"], language))
        return np.sin(np.arange(2400, dtype=np.float32) * 0.12)


class FakeDialect:
    cache_identity = "dialect-test-1"
    enabled = True
    api_key = "test"

    def adapt(self, text, voice_id, language):
        return text, "native" if voice_id == "napoletano" else "not_requested"


class TtsContractTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.engine = FakeEngine()
        main._mlx_engine = self.engine
        main._dialect_adapter = FakeDialect()
        main._disk_audio_cache = DiskAudioCache(self.directory.name)
        main._audio_cache.clear()
        main._voice_cache.clear()
        main._default_model_speakers.clear()
        main._voice_cache["napoletano"] = {
            "voice_id": "napoletano", "engine": "Qwen3-TTS-MLX",
            "filename": "napoletano.wav", "reference_sha256": "original-ref",
            "conditioning_sha256": "crop-and-transcript-1",
        }
        main._default_voice_id = "napoletano"
        # No context manager: do not run actual model startup in these tests.
        self.client = TestClient(main.app)

    def tearDown(self):
        self.client.close()
        self.directory.cleanup()

    def post(self, **kwargs):
        return self.client.post("/api/v1/tts/roast", json={"text": "Uè guagliò, jamme!", "voice": "zio_italiano", **kwargs})

    def test_installed_client_alias_and_pcm_contract(self):
        response = self.post()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["x-voice-id"], "napoletano")
        self.assertEqual(response.headers["x-engine"], "Qwen3-TTS-MLX")
        info = sf.info(io.BytesIO(response.content))
        self.assertEqual((info.samplerate, info.channels, info.subtype), (24000, 1, "PCM_16"))
        self.assertEqual(self.engine.calls[0][2], "it")

    def test_aliases_reuse_identical_audio(self):
        first = self.post()
        second = self.post(voice="zio_napoletano")
        self.assertEqual(second.content, first.content)
        self.assertEqual(second.headers["x-audio-cached"], "true")
        self.assertEqual(len(self.engine.calls), 1)

    def test_entire_text_and_language_are_in_cache_key(self):
        prefix = "Una frase introduttiva sufficientemente lunga da superare sessanta caratteri. "
        self.post(text=prefix + "2000 calorie.")
        self.post(text=prefix + "1700 calorie.")
        self.post(text=prefix + "1700 calorie.", language="en")
        self.assertEqual(len(self.engine.calls), 3)

    def test_model_and_conditioning_changes_invalidate_cache(self):
        self.post()
        self.engine.identity = "model-test@revision-2"
        self.post()
        main._voice_cache["napoletano"]["conditioning_sha256"] = "crop-and-transcript-2"
        self.post()
        self.assertEqual(len(self.engine.calls), 3)

    def test_bad_requests_never_use_a_different_voice(self):
        self.assertEqual(self.post(voice="unknown").status_code, 422)
        self.assertEqual(self.post(language="xx").status_code, 422)
        self.assertEqual(self.post(speed=-1).status_code, 422)
        self.assertEqual(self.post(text=" ").status_code, 400)
        self.assertEqual(len(self.engine.calls), 0)

    def test_legacy_speaker_stays_on_xtts(self):
        import base64
        main._default_model_speakers["claribel_dervla"] = {"voice_id": "claribel_dervla", "engine": "XTTS-v2"}
        buffer = io.BytesIO()
        sf.write(buffer, np.ones(2400, dtype=np.float32) * 0.2, 24000, format="WAV")
        with patch.object(main, "_legacy_worker") as worker:
            worker.call.return_value = {"wav": base64.b64encode(buffer.getvalue()).decode()}
            response = self.post(voice="claribel_dervla")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["x-engine"], "XTTS-v2")
            self.assertEqual(response.headers["x-voice-id"], "claribel_dervla")
            self.assertEqual(len(self.engine.calls), 0)


if __name__ == "__main__":
    unittest.main()
