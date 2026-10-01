"""Generate original, offline UI sound packs (no samples or third-party licenses).

Run after generate_button_sounds.py. Existing classic cues are preserved.
The checked-in TypeScript catalog uses static requires for Metro/Android raw assets.
"""
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets/sounds"
RATE = 44100
THEMES = [
    ("classic", "✨", "#B4CF42"), ("minimal", "🫧", "#9CB6C6"),
    ("nature", "🌿", "#7BCB95"), ("water", "💧", "#79C6ED"),
    ("christmas", "🎄", "#E7B653"), ("halloween", "🎃", "#ECA05C"),
    ("horror", "👻", "#BE9DEB"), ("space", "🛸", "#97ACFF"),
    ("arcade", "👾", "#ECA0E0"), ("comic", "🤡", "#F2D575"),
    ("raspberry", "😝", "#ED9AAF"), ("fart", "💨", "#BEBD7C"),
]
# All packs have tiny direction cues and longer important confirmations.
ROLES = {
    "tap": (.070, [(0, .070, 840, 770)]),
    "up": (.110, [(0, .110, 650, 1050)]),
    "down": (.105, [(0, .105, 680, 390)]),
    "confirm": (.235, [(0, .14, 660, 660), (.085, .15, 880, 880)]),
    "complete": (.370, [(0, .14, 523, 523), (.09, .15, 659, 659), (.19, .18, 1046, 1046)]),
    "delete": (.170, [(0, .10, 450, 340), (.075, .095, 290, 220)]),
    "scan": (.195, [(0, .080, 1170, 1300), (.09, .105, 1570, 1350)]),
    "voice": (.270, [(0, .11, 440, 470), (.08, .11, 554, 554), (.17, .10, 659, 690)]),
}
CLASSIC = {
    "tap": ("soft-pop", .28), "navigate": ("navigate", .22), "open": ("open", .27),
    "close": ("close", .22), "select": ("select", .20), "increment": ("increment", .17),
    "decrement": ("decrement", .17), "confirm": ("confirm", .40), "complete": ("complete", .42),
    "delete": ("delete", .30), "scan": ("scan", .32), "voice": ("voice", .30),
    "reward": ("reward", .34), "primary": ("primary", .35),
    "toggle-on": ("toggle-on", .22), "toggle-off": ("toggle-off", .20),
}
ACTION_ROLE = {
    "tap": "tap", "navigate": "tap", "open": "up", "close": "down", "select": "tap",
    "increment": "up", "decrement": "down", "confirm": "confirm", "complete": "complete",
    "delete": "delete", "scan": "scan", "voice": "voice", "reward": "complete",
    "primary": "confirm", "toggle-on": "up", "toggle-off": "down",
}


def render(theme, role):
    duration, notes = ROLES[role]
    rng = random.Random(f"mealpulse-v1-{theme}-{role}")
    values = []
    filtered_noise = 0
    for i in range(round(duration * RATE)):
        timestamp = i / RATE
        filtered_noise = .86 * filtered_noise + .14 * rng.uniform(-1, 1)
        sample = 0
        for onset, length, start, end in notes:
            t = timestamp - onset
            if not 0 <= t < length:
                continue
            progress = t / length
            envelope = min(1, t / .004) ** 2 * min(1, (length - t) / .015) ** 2
            envelope *= math.exp(-progress * (2.3 if theme != "horror" else .8))
            frequency_scale = {"minimal": .9, "nature": 2.4, "water": .68, "christmas": 1.2,
                               "halloween": .48, "horror": .23, "space": 1.0, "arcade": 1.3,
                               "comic": .8, "raspberry": .22, "fart": .12}[theme]
            phase = 2 * math.pi * frequency_scale * (start * t + (end - start) * t * t / (2 * length))
            if theme == "minimal":
                tone = math.sin(phase)
            elif theme == "nature":  # bird chirps and a very light breath
                tone = math.sin(phase + 1.8 * math.sin(2 * math.pi * 21 * t)) + .18 * filtered_noise
            elif theme == "water":  # rounded bubble resonances
                tone = math.sin(phase + 2.3 * math.exp(-t * 42)) + .25 * math.sin(phase * 1.7)
            elif theme == "christmas":  # tiny original bell motifs, not a copyrighted melody
                tone = math.sin(phase) + .4 * math.sin(2.76 * phase) * math.exp(-t * 18) + .18 * math.sin(5.4 * phase) * math.exp(-t * 35)
            elif theme == "halloween":
                tone = math.sin(phase + 2.2 * math.sin(phase * .503)) + .25 * math.sin(phase * 1.41)
            elif theme == "horror":
                tone = .6 * math.sin(phase) + .5 * math.sin(phase * 1.067) + .22 * filtered_noise
            elif theme == "space":
                tone = math.sin(phase + 2.8 * (1 - progress) * math.sin(phase * 1.5))
            elif theme == "arcade":  # band-limited square-ish tone
                tone = sum(math.sin(phase * k) / k for k in (1, 3, 5, 7)) * .7
            elif theme == "comic":  # slide whistle / elastic boing
                tone = math.sin(phase + 5 * math.sin(2 * math.pi * 13 * t) * math.exp(-t * 12))
            else:  # deliberately silly lip buzz / low rumble
                vibrato = phase + 1.8 * math.sin(2 * math.pi * (29 if theme == "raspberry" else 17) * t)
                buzz = sum(math.sin(vibrato * k) / k for k in (1, 2, 3, 4, 5))
                flutter = .65 + .35 * math.sin(2 * math.pi * 43 * t) ** 2
                tone = (buzz + (1.0 if theme == "fart" else .3) * filtered_noise) * flutter
            sample += envelope * tone
        values.append(sample)
    scale = .52 / max(abs(value) for value in values)
    return b"".join(struct.pack("<h", round(value * scale * 32767)) for value in values)


def catalog():
    lines = ["// Generated by tools/generate_sound_themes.py. All samples are original and local.",
             "export const BUTTON_SOUNDS = {"]
    for kind, (filename, volume) in CLASSIC.items():
        lines.append(f"  '{kind}': {{ asset: require('@/assets/sounds/{filename}.wav'), volume: {volume} }},")
    lines += ["} as const;", "export type ButtonSoundKind = keyof typeof BUTTON_SOUNDS;",
              "export const BUTTON_SOUND_KINDS = Object.keys(BUTTON_SOUNDS) as ButtonSoundKind[];", "",
              "export const SOUND_EFFECTS = {"]
    for kind, (filename, _) in CLASSIC.items():
        lines.append(f"  '{kind}': {{ asset: BUTTON_SOUNDS['{kind}'].asset, resource: 'assets_sounds_{filename.replace('-', '')}', theme: 'classic', label: 'sound_action_{kind.replace('-', '_')}' }},")
    for theme, _, _ in THEMES[1:]:
        for role in ROLES:
            lines.append(f"  '{theme}-{role}': {{ asset: require('@/assets/sounds/{theme}-{role}.wav'), resource: 'assets_sounds_{theme}{role}', theme: '{theme}', label: 'sound_effect_{role}' }},")
    lines += ["} as const;", "export type SoundEffectId = keyof typeof SOUND_EFFECTS;", "",
              "export const SOUND_THEMES = ["]
    for theme, emoji, color in THEMES:
        mapping = {kind: kind if theme == "classic" else f"{theme}-{ACTION_ROLE[kind]}" for kind in CLASSIC}
        entries = ", ".join(f"'{kind}': '{effect}'" for kind, effect in mapping.items())
        lines.append(f"  {{ id: '{theme}', label: 'sound_theme_{theme}', emoji: '{emoji}', color: '{color}', cues: {{ {entries} }} }},")
    lines += ["] as const;", "export type SoundThemeId = typeof SOUND_THEMES[number]['id'];", "",
              "export type SoundChoice = SoundEffectId | 'silent';",
              "export interface ButtonSoundPreferences {",
              "  theme: SoundThemeId;", "  overrides: Partial<Record<ButtonSoundKind, SoundChoice>>;", "}",
              "export const DEFAULT_SOUND_PREFERENCES: ButtonSoundPreferences = { theme: 'classic', overrides: {} };", "",
              "export function resolveButtonSound(kind: ButtonSoundKind, preferences: ButtonSoundPreferences): SoundChoice {",
              "  const theme = SOUND_THEMES.find(item => item.id === preferences.theme) || SOUND_THEMES[0];",
              "  return preferences.overrides[kind] ?? theme.cues[kind];", "}", "",
              "export function sanitizeSoundPreferences(raw: unknown): ButtonSoundPreferences {",
              "  if (!raw || typeof raw !== 'object') return { theme: 'classic', overrides: {} };",
              "  const value = raw as Record<string, unknown>;",
              "  const theme = SOUND_THEMES.find(item => item.id === value.theme)?.id || 'classic';",
              "  const overrides: ButtonSoundPreferences['overrides'] = {};",
              "  if (value.overrides && typeof value.overrides === 'object') {",
              "    for (const kind of BUTTON_SOUND_KINDS) {",
              "      const effect = (value.overrides as Record<string, unknown>)[kind];",
              "      if (effect === 'silent' || (typeof effect === 'string' && Object.hasOwn(SOUND_EFFECTS, effect))) {",
              "        overrides[kind] = effect as SoundChoice;", "      }", "    }", "  }",
              "  return { theme, overrides };", "}", ""]
    return "\n".join(lines)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for theme, _, _ in THEMES[1:]:
        for role in ROLES:
            with wave.open(str(OUTPUT / f"{theme}-{role}.wav"), "wb") as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(RATE)
                audio.writeframes(render(theme, role))
    (ROOT / "constants/buttonSounds.ts").write_text(catalog())
    print(f"{len(THEMES)} themes, {len(CLASSIC) + (len(THEMES) - 1) * len(ROLES)} original effects")
