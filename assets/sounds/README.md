# Button sound palette

All 16 WAVs are original MealPulse sounds with no third-party samples. They share
a soft, rounded tone, using mono 44.1 kHz PCM 16-bit audio. Step controls are short
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
to guess an action. Disabled buttons stay silent. The pool preloads in batches,
throttles duplicate nested taps and replaces previous UI cues on rapid presses.
It does not stop TTS playback or change the shared audio mode.

Users can mute every category in Menu PRO; the existing preference is preserved.
These cues indicate the pressed action, not proof that a remote operation succeeded.

Regenerate the 15 new cues with `python3 tools/generate_button_sounds.py`.
The original default soft-pop WAV is retained. App code and assets follow the
repository license.
