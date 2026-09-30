import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tts_audio_cache import DiskAudioCache


class DiskAudioCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.cache = DiskAudioCache(self.temp.name, max_items=2)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(b"\x01\x00" * 2400)
        self.wav = buffer.getvalue()

    def test_survives_new_cache_instance(self):
        self.cache.put("a" * 64, self.wav)
        self.assertEqual(DiskAudioCache(self.temp.name).get("a" * 64), self.wav)

    def test_eviction_by_item_count(self):
        for key in "abc":
            self.cache.put(key * 64, self.wav)
        self.assertIsNone(self.cache.get("a" * 64))
        self.assertEqual(self.cache.get("c" * 64), self.wav)

    def test_eviction_by_bytes(self):
        self.cache.max_bytes = len(self.wav)
        self.cache.put("a" * 64, self.wav)
        self.cache.put("b" * 64, self.wav)
        self.assertIsNone(self.cache.get("a" * 64))
        self.assertEqual(self.cache.get("b" * 64), self.wav)

    def test_expired_and_corrupt_audio_are_misses(self):
        self.cache.put("a" * 64, self.wav)
        path = Path(self.temp.name) / ("a" * 64 + ".wav")
        os.utime(path, (1, 1))
        self.assertIsNone(self.cache.get("a" * 64))
        path.write_bytes(b"not audio")
        self.assertIsNone(self.cache.get("a" * 64))

    def test_invalid_keys_rejected(self):
        with self.assertRaises(ValueError):
            self.cache.put("../../outside", self.wav)

    def test_clear_only_removes_owned_cache_files(self):
        self.cache.put("a" * 64, self.wav)
        unrelated = Path(self.temp.name) / "reference.wav"
        unrelated.write_bytes(self.wav)
        self.cache.clear()
        self.assertIsNone(self.cache.get("a" * 64))
        self.assertTrue(unrelated.exists())


if __name__ == "__main__":
    unittest.main()
