"""Bounded local WAV cache, reusable across server restarts."""
import logging
import os
from pathlib import Path
import re
import tempfile
import threading
import time

logger = logging.getLogger("mealpulse_xtts")


class DiskAudioCache:
    def __init__(self, directory, max_items=300, max_bytes=256 * 1024 * 1024,
                 max_age=7 * 24 * 3600):
        self.directory = Path(directory)
        self.max_items = max_items
        self.max_bytes = max_bytes
        self.max_age = max_age
        self.lock = threading.Lock()

    def _path(self, key):
        if not re.fullmatch(r"[a-f0-9]{64}", key):
            raise ValueError("Audio cache keys must be SHA256 hashes")
        return self.directory / (key + ".wav")

    def get(self, key):
        with self.lock:
            try:
                path = self._path(key)
                if time.time() - path.stat().st_mtime > self.max_age:
                    path.unlink()
                    return None
                data = path.read_bytes()
                if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
                    path.unlink()
                    return None
                os.utime(path, None)
                return data
            except FileNotFoundError:
                return None
            except OSError as exc:
                logger.warning("Disk audio cache read skipped: %s", exc)
                return None

    def put(self, key, data):
        if len(data) > self.max_bytes:
            return
        with self.lock:
            temporary = None
            try:
                target = self._path(key)
                self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
                with tempfile.NamedTemporaryFile(dir=self.directory, suffix=".tmp", delete=False) as file:
                    temporary = file.name
                    file.write(data)
                os.replace(temporary, target)
                temporary = None
                files = sorted(self.directory.glob("*.wav"), key=lambda p: p.stat().st_mtime, reverse=True)
                total = 0
                for index, path in enumerate(files):
                    stat = path.stat()
                    total += stat.st_size
                    if (index >= self.max_items or total > self.max_bytes
                            or time.time() - stat.st_mtime > self.max_age):
                        path.unlink()
            except OSError as exc:
                logger.warning("Disk audio cache write skipped: %s", exc)
            finally:
                if temporary:
                    Path(temporary).unlink(missing_ok=True)

    def clear(self):
        with self.lock:
            for path in self.directory.glob("*.wav"):
                if re.fullmatch(r"[a-f0-9]{64}\.wav", path.name):
                    path.unlink(missing_ok=True)
