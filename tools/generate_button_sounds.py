"""Render MealPulse's original UI cues using only the Python standard library."""

import math
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "sounds"

# Duration, then (onset, note duration, start Hz, end Hz, relative amplitude).
# Short, quieter step cues; longer melodic cues for saving and finishing.
CUES = {
    "navigate": (0.075, [(0, 0.075, 720, 690, 1)]),
    "open": (0.115, [(0, 0.115, 560, 850, 1)]),
    "close": (0.085, [(0, 0.085, 650, 400, 1)]),
    "select": (0.055, [(0, 0.055, 1050, 1050, 1)]),
    "increment": (0.045, [(0, 0.045, 920, 1120, 1)]),
    "decrement": (0.045, [(0, 0.045, 640, 460, 1)]),
    "confirm": (0.230, [(0, 0.130, 660, 660, 0.85), (0.075, 0.155, 880, 880, 1)]),
    "complete": (0.310, [(0, 0.130, 523.25, 523.25, 0.8), (0.075, 0.140, 659.25, 659.25, 0.9), (0.150, 0.160, 1046.5, 1046.5, 1)]),
    "delete": (0.160, [(0, 0.100, 420, 380, 1), (0.060, 0.100, 310, 280, 0.85)]),
    "scan": (0.155, [(0, 0.075, 1180, 1180, 0.85), (0.060, 0.095, 1560, 1400, 1)]),
    "voice": (0.210, [(0, 0.110, 440, 470, 0.8), (0.060, 0.110, 554.37, 554.37, 0.9), (0.120, 0.090, 659.25, 659.25, 1)]),
    "reward": (0.330, [(0, 0.120, 783.99, 783.99, 0.7), (0.060, 0.130, 987.77, 987.77, 0.8), (0.120, 0.130, 1174.66, 1174.66, 0.9), (0.180, 0.150, 1567.98, 1567.98, 1)]),
    "primary": (0.180, [(0, 0.110, 523.25, 523.25, 0.85), (0.060, 0.120, 698.46, 698.46, 1)]),
    "toggle-on": (0.095, [(0, 0.095, 700, 940, 1)]),
    "toggle-off": (0.095, [(0, 0.095, 700, 490, 1)]),
}


def render(duration, notes):
    samples = []
    for i in range(round(duration * SAMPLE_RATE)):
        timestamp = i / SAMPLE_RATE
        value = 0.0
        for onset, length, start_hz, end_hz, amplitude in notes:
            t = timestamp - onset
            if not 0 <= t < length:
                continue
            attack = min(1.0, t / 0.004)
            tail = min(1.0, (length - t) / 0.015)
            envelope = math.sin(attack * math.pi / 2) ** 2 * tail ** 2 * math.exp(-t / (length * 0.27))
            phase = 2 * math.pi * (start_hz * t + (end_hz - start_hz) * t * t / (2 * length))
            tone = 0.78 * math.sin(phase) + 0.16 * math.sin(2 * phase) * math.exp(-t / 0.025) + 0.06 * math.sin(3.07 * phase) * math.exp(-t / 0.012)
            value += amplitude * envelope * tone
        samples.append(value)
    scale = 0.52 / max(abs(x) for x in samples)
    return b"".join(struct.pack("<h", round(x * scale * 32767)) for x in samples)


def write_wav(path, data):
    with wave.open(str(path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(SAMPLE_RATE)
        audio.writeframes(data)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (duration, notes) in CUES.items():
        write_wav(OUTPUT / f"{name}.wav", render(duration, notes))
    print(f"Rendered {len(CUES)} original UI cues in {OUTPUT}")
