"""Keep legacy XTTS speaker IDs working in their original, isolated environment."""
import json
import os
from pathlib import Path
import queue
import subprocess
import threading


class XttsBridge:
    def __init__(self):
        self.process = None
        self._lock = threading.Lock()
        self._responses = queue.Queue()

    def _start(self):
        root = Path(__file__).resolve().parent
        python = os.getenv("TTS_LEGACY_PYTHON", str(root / "tts_env" / "bin" / "python"))
        env = {**os.environ, "TTS_ENGINE": "xtts", "PYTORCH_ENABLE_MPS_FALLBACK": "1"}
        self._responses = queue.Queue()
        self.process = subprocess.Popen(
            [python, "-u", str(root / "tools" / "xtts_worker.py")],
            cwd=root, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            text=True, bufsize=1, start_new_session=True,
        )
        responses, process = self._responses, self.process

        def read_responses():
            try:
                for line in process.stdout:
                    responses.put(json.loads(line))
            except Exception as exc:
                responses.put({"error": str(exc)})
            finally:
                responses.put({"error": "XTTS worker stopped"})

        threading.Thread(target=read_responses, daemon=True).start()

    def call(self, command, **kwargs):
        with self._lock:
            if self.process is None or self.process.poll() is not None:
                self._start()
            self.process.stdin.write(json.dumps({"command": command, **kwargs}) + "\n")
            self.process.stdin.flush()
            try:
                response = self._responses.get(timeout=120)
            except queue.Empty:
                self.close()
                raise TimeoutError("XTTS worker timed out")
            if "error" in response:
                raise RuntimeError(response["error"])
            return response

    def close(self):
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.process = None
