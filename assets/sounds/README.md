# Button sound palette

All 104 WAVs are original MealPulse sounds with no third-party samples, external
licenses or paid assets. They use mono 44.1 kHz PCM 16-bit audio. The original
16 classic cues share a soft, rounded tone. Step controls are short
and quiet; important actions use longer melodic cues at a moderately higher volume.

| Cue | Used for | Duration | Playback volume |
| --- | --- | --- | --- |
| tap / soft-pop | Default feedback for a new, unclassified control | 95 ms | 28% |
| navigate | Page navigation, tab bar, back | 75 ms | 22% |
| open | Menus, dialogs and details | 115 ms | 27% |
| close | Dismiss, cancel, stop playback | 85 ms | 22% |
| select | Filters, units, dates, portion presets | 55 ms | 20% |
| increment | Increase grams, servings, calories or water | 45 ms | 17% |
| decrement | Decrease a quantity | 45 ms | 17% |
| confirm | Save portion/settings, add meals or workouts | 230 ms | 40% |
| complete | Done/finish/acknowledge | 310 ms | 42% |
| delete | Confirm removal of an item | 160 ms | 30% |
| scan | Camera, barcode scan and scanner entry points | 155 ms | 32% |
| voice | Start or retry voice playback/recording | 210 ms | 30% |
| reward | Prize wheel and rewards | 330 ms | 34% |
| primary | Authentication, analysis, health sync, purchases | 180 ms | 35% |
| toggle-on | Enable a switch | 95 ms | 22% |
| toggle-off | Disable a switch | 95 ms | 20% |

Buttons declare their cue through the shared FeedbackPressable wrappers; switches
choose their on/off cue from the new value. Labels/translations are not inspected
to guess an action. Disabled buttons stay silent. Only the same native press event
is deduplicated when it bubbles through nested controls; distinct rapid touches
are retained, including touches made while their sample loads. Different categories
finish naturally instead of stopping each other's confirmations.

Android uses a native SoundPool with eight short-sample streams. Metro's bundled
raw WAV resources are kept uncompressed for direct loading; no network is needed.
The pool uses media volume without requesting audio focus. iOS, web, Expo Go and
development builds without packaged raw resources use Expo players, with commands
serialized per selected sample (including categories that share an effect). A failed playback is retried, recreating a failed Expo
player or falling back from the native pool. Muting/releasing cancels pending cues.
Neither backend stops TTS playback or changes the shared audio mode.

Users can mute every category in Menu PRO; the existing preference is preserved.
These cues indicate the pressed action, not proof that a remote operation succeeded.

Regenerate the 15 new cues with `python3 tools/generate_button_sounds.py`.
The original default soft-pop WAV is retained. App code and assets follow the
repository license.

## Custom themes

The 11 additional packs each contain eight short motifs: tap, rising, falling,
confirmation, completion, deletion, scanner and three-note voice call. Together
with the original 16 samples this gives 12 themes and 104 distinct effects, about
1.8 MB of bundled PCM audio. Durations range from 45 to 370 ms. Peaks are normalized
below clipping; the existing per-action volumes stay in place for all themes.

Themes: minimal soft tones, nature chirps, water bubbles, Christmas bells,
Halloween, horror, space, arcade, cartoon boings, lip raspberries and low fart buzzes.
No copyrighted melodies or recordings are used. Users can mix any samples across
all 16 action categories, follow the selected theme, or silence a category.

Only the selected palette is preloaded. Up to 24 decoded samples are retained;
obsolete preview samples are unloaded. Changing themes cancels old queued sounds.
Android resource identifiers are explicitly listed in `constants/buttonSounds.ts`
and checked against the release bundle. The global mute preference is unchanged.

Run `python3 tools/generate_sound_themes.py` to regenerate the 88 extra WAVs and
static catalog deterministically. All source and generated assets are checked in.
Sound customization is included with PRO; otherwise each non-default change needs
one completed rewarded video. Previewing and restoring defaults are free.
