# 🥗 MealPulse AI — AI-Powered Vision Nutritionist, Macro Scanner & Voice Coach

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-blue?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5%20(New%20Arch)-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![MLX Metal](https://img.shields.io/badge/MLX-Metal%20(Apple%20Silicon)-222222)](https://github.com/ml-explore/mlx)

**MealPulse AI** is a cutting-edge mobile nutrition and calorie tracking platform built with **React Native (Expo SDK 54, React Native New Architecture)** and powered by **Google Gemini 2.5/2.0 Flash Vision AI**, **OpenAI GPT-4o-mini**, and a local **Apple Silicon Qwen3-TTS/MLX voice cloning engine with compatible XTTS-v2 speakers**.

Snap a photo of any food plate or fruit, automatically count individual items (e.g., 5 walnuts, 3 eggs), estimate volumetric portion weights in grams, estimate macronutrients (calories, protein, carbs, fat), receive humorous voice roasts & coaching from customizable AI personalities, track intermittent fasting & daily hydration, synchronize real-time active calories & steps with **Apple Health** and **Google Health Connect**, and save meal totals to **Supabase Cloud**.

---

## ✨ Features & Architecture Highlights

### 📸 Real-Time AI Vision Scanner
- **Dual AI Engine**: Powered by **Google Gemini 2.5 Flash / 2.0 Flash** & **OpenAI GPT-4o-mini Vision**.
- **Versatile Input**: Instant high-resolution camera capture or camera roll / photo gallery picker for any meal slot.
- **Granular Itemization**: Automatically detects dish names, breaks down individual ingredients, counts discrete items (nuts, eggs, slices), and estimates volumetric gram weights.
- **Macronutrient Breakdown**: Delivers instant calorie totals, protein, carbohydrate, and fat distributions.
- **Playful Non-Food Detection**: Recognizes non-edible objects with humorous AI roasts and zero-calorie safe fallbacks.

### 🏷️ Food data, label corrections & nutrient provenance

All Open Food Facts search and barcode results pass through the same normalizer and numerical checks. This fixes the interpretation of dataset values; it does **not** certify that every community entry matches every package currently sold.

- **Consistent basis**: prefer normalized `*_100g` fields; convert serving-only values only when the serving explicitly gives grams or millilitres. Package size and contributor `*_value` fields are never treated as per-100 values. Liquids retain ml; there is no assumed gram/ml density conversion. Decimal macro values are preserved.
- **Correct units**: OFF normalized nutrient values are grams, even when `*_unit` describes a contributor's mg/µg input. Convert minerals and vitamin C to mg, B12/A to µg, and vitamin D to IU internally (shown and entered as µg). Vitamin A is never converted to IU without knowing its form. Salt and sodium conversions follow the standard 2.5 ratio.
- **Missing and conflicting data**: reject incomplete or impossible main nutrition data; flag energy conflicts, sugars above carbs, saturated fat above total fat, salt/sodium inconsistencies and OFF nutrition quality errors. Warnings are consistency checks, not independent laboratory verification. Declared zero remains zero. Missing vitamins/minerals stay unknown, displayed as `—`, and are not guessed from food names.
- **Current product records**: before logging a selected OFF search result, resolve its exact barcode against the product API (bounded to three simultaneous lookups, with a five-minute cache). If required nutrition is unavailable, the selection remains open with an error instead of logging zeros or falling back to another product.
- **Visible source**: distinguish OFF, generic-food estimates, AI estimates, manual entries and user-entered labels. OFF entries can expose the exact barcode, product page, label photo and record update date. A record update date does not establish a formulation's current accuracy.
- **Label corrections for any food**: open a product's portion editor or a logged meal's details and choose **Correggi dall’etichetta / Correct from label**. Enter values per 100 g or 100 ml and the portion actually consumed. Optional nutrients can remain blank. Salt/sodium convert automatically; A/D/B12 use µg. Private corrections are remembered on that device for the exact barcode only. They never replace another variant by name or brand and do not write to the public OFF database.
- **Voice/photo/manual input**: voice and plate recognition remain estimates; malformed responses no longer generate invented fallback calories/macros. Voice totals are computed from the parsed items, then shown in the selection list for review before logging. The manual form accepts decimal commas and uses an explicit 100g basis. Catalog, barcode and meal editing scale macros and known micronutrients once for the selected quantity.
- **Older history and cloud scope**: existing meal calories/macros are preserved. Micronutrients saved before this fix may have been fabricated or converted incorrectly, so they remain unverified/unknown until corrected from a label. Main totals continue to sync to Supabase; extra nutrients, provenance and private barcode corrections currently remain in device storage. There is no claim of cross-device synchronization for those extra fields.

Reference: [OFF nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/) and [OFF data verification](https://support.openfoodfacts.org/help/en-gb/9-open-food-facts/29-is-the-information-and-data-on-products-verified). Exact package labels and quantities are required to resolve product variants, reformulations and cooked/raw differences.

### 🎙️ AI Voice Coach & Voice Cloning (Qwen3-TTS/MLX and XTTS-v2)
- **5 Iconic Personality Characters**:
  1. 🤌 **Zio Napoletano**: Warm, passionate, and protective defender of authentic Mediterranean cuisine.
  2. 👨‍🍳 **Chef Gordon**: Uncompromising, sharp, Michelin-star sarcastic disciplinarian.
  3. 💅 **Diva Snob**: Milanese high-fashion influencer disgusted by processed junk food.
  4. ⚡ **Stand-up Comico**: Sharp Roman stand-up cabaret comedian packed with punchlines.
  5. 🎙️ **Sara Gen-Z**: Energetic, unfiltered fitness bestie living on meme logic.
- **63 Neural Voices Library**: 58+ pre-calculated neural voices plus 5 custom cloned characters accessible via the Pro Voice Selector modal with detailed timbre, tone, language, and cadence profiles.
- **5 Dedicated Spoken Touchpoints**:
  1. 🌅 **Morning AI Nutrition Briefing**: Live spoken summary of the selected day's calories eaten, activity calories burned, remaining calorie budget and remaining protein. It shares the ring's budget calculation and respects the setting for including activity calories. Meals, activity sync, date, voice and language changes refresh the text and invalidate stale audio. Numeric facts come directly from the homepage; AI adds a short encouragement in the selected voice's style, including Neapolitan.
  2. 💧 **Hydration Voice Coach**: Spoken encouragements and milestone celebrations on every glass logged.
  3. 🍽️ **Meal Roast Commentary**: Instant humorous critique and macro breakdown right after logging or scanning a plate.
  4. 📖 **Daily Voice Recap**: Evening debrief reviewing daily calorie budget compliance and workout burn.
  5. 🏆 **Streak Record Celebration**: High-energy audio fanfare celebrating consecutive tracking milestones.
- **Independent vs. Global Voice Preferences**:
  - Global personal AI coach setting in the Pro menu personalizes all ambient audio across the app.
  - Meal roasts in **AI Photoscan** allow independent on-the-fly voice selection without overriding the user's global assistant.

### ⚡ Apple Silicon Metal & Audio Cache
- **MLX/Metal**: Qwen3-TTS 1.7B Base/4 bit clones the five reference voices. An isolated PyTorch/MPS worker preserves the 58 XTTS speakers.
- **Neapolitan Text**: Dialect-aware prompts and an optional Gemini text adapter for installed clients preserve numeric facts. Speech synthesis stays on the Mac. See [setup and limitations](docs/LOCAL_TTS.md).
- **Multi-Tier Audio Caching**:
  - **In-Memory LRU Cache**: Fast audio return without model inference for repeated sentences and voice previews.
  - **Persistent Bounded Disk Cache (`DiskAudioCache`)**: Persists synthesized WAV files across server restarts (`.tmp/tts-audio-cache`, bounded to 300 files / 256 MiB with 7-day TTL and SHA-256 content keying).
- **Concurrency & Serialization**: Thread-safe model inference (`_inference_lock`) protects mutable model state while keeping FastAPI's HTTP event loop unblocked for health checks and cache hits.
- **Strict Voice Resolution**: Rejects invalid voice IDs with HTTP 422 instead of silent speaker substitution; clean fallback only when no voice is requested.
- **Auditable Response Headers**: Includes `X-Voice-Id`, `X-Voice-Source`, `X-Voice-Reference`, `X-Voice-Reference-SHA256`, and `X-Audio-Cached` for full provenance.
- **Dynamic Endpoint Resolution**: Mobile requests read Supabase `app_config.tts_api_url` before contacting the Mac, sharing concurrent lookups and using a 2.5-second lookup timeout. The saved URL is used only when Supabase is unavailable. A stale Mac address can trigger the phone's native `expo-speech` fallback, which does not preserve cloned voices.

### 📊 Advanced Analytics & Progress Tracking (`app/(tabs)/analytics.tsx`)
- **Flexible Timeframes**: Switch between **Today**, **Week**, and **Month** views.
- **Calorie Intake vs. Target Goal**: Dynamic progress tracking displaying logged calories, remaining budget, or over-goal indicators.
- **Calorie Trend Charts**: Interactive bar charts tracking daily calorie consumption against user target lines.
- **Macro Distribution & Daily Averages**: Comprehensive averages for calories, protein, carbs, and fats over the selected timeframe.
- **Multi-Language Support (7 Languages)**: Fully localized in Italian, English, Spanish, French, German, Chinese, and Japanese with locale-aware number and date formatting.
- **Empty States & Guided Onboarding**: Helpful prompts guiding users to log meals when data is absent.

### 🏃 Health & Activity Synchronization
- **Apple HealthKit & Google Health Connect**: Integrated via `healthSyncService.ts` and `react-native-health-connect`.
- **Automatic Calorie Deficit Adjustment**: Automatically reads **Active Calories Burned** and **Steps** to calculate dynamic net calorie allowances.
- **Policy Compliance**: Fully adheres to Google Play Health policy and includes in-app medical and nutrition disclaimers.

### ⚡ Quick Action FAB & Dynamic Macro Dashboard
- **Quick Action FAB (`QuickActionFab`)**: Sleek spring-animated bottom sheet modal with staggered entrance transforms, haptic feedback, and quick shortcuts:
  - 🥗 **Add Food**: Quick meal logging by category (Breakfast, Lunch, Dinner, Snack).
  - 📸 **Quick Scan**: Direct launch into AI Vision Food Scanner.
  - 💧 **Add Water**: Rapid hydration logging.
  - 📖 **Diary**: Jump straight to food diary history.
- **Dynamic Daily Macro Targets**: 3 Circular SVG Progress Rings (Protein, Carbs, Fats) with real-time gram counters, target percentages, and dynamic badges.
- **60 FPS Animations**: Powered by **React Native Reanimated v4**.

### 🔘 Button Sounds & Loading Feedback
- **Action-aware sound feedback**: App-owned buttons use 16 original local cues. Quantity increases/decreases and selections use short, quiet ticks; saving portions and finishing use different melodic confirmations. Navigation, opening/closing panels, scans, voice playback, major actions, rewards and switch states each have their own cue.
- **Consistent across languages**: Each button declares its action sound explicitly; changing the interface language does not change its assigned sound.
- **Reliable local playback**: Android preloads the short WAVs into a native SoundPool; iOS, web and development builds use Expo players. Distinct rapid presses are retained, including presses made during loading. Only the same bubbled press event is deduplicated. Different action cues finish without stopping each other, and failed players are retried with a fallback. Button sounds never stop the TTS player or change its audio mode. See the [sound palette](assets/sounds/README.md).
- **Optional sound**: Toggle **Button sounds / Suoni dei pulsanti** in Menu PRO. The preference is saved on the device.
- **Voice preparation**: Briefing, hydration coach, daily recap, celebrations, voice previews and meal roasts show a spinner while preparing text, generating speech, downloading the WAV and starting the player. New labels follow the selected language.
- **Scoped playback**: Each voice feature shows its own loading/playback state. Repeated generation taps are blocked; cancelled server requests cannot start stale audio or device-speech fallback.
- **Other slow actions**: Health synchronization and purchase restoration display button loading feedback.

### 💧 Hydration & Intermittent Fasting Tracker
- **Hydration Logging**: Instant increment (`+250 ml`, `+500 ml`) and decrement (`-250 ml`) buttons with visual fill animations.
- **Fasting Protocols**: Supports 16:8, 18:6, 20:4, circadian rhythms, and custom windows with countdown timers, elapsed progress rings, and milestone notifications.

### ☁️ Full-Stack Supabase Cloud Persistence & Guest Migration
- **Cloud Synchronization**: Real-time sync across `meal_logs`, `water_logs`, `user_biometrics`, `fasting_logs`, `user_habits`, `journal_entries`, `promo_events`, and `subscriptions`.
- **Row Level Security (RLS)**: Strict PostgreSQL security rules ensuring users only access their own data (`auth.uid() = user_id`).
- **Atomic Guest-to-Account Migration**: Full offline functionality for unauthenticated guests in `AsyncStorage`; upon sign-in or registration, all local logs are idempotently migrated to Supabase without duplicates.
- **`signOutSafe` Concurrency Guard**: Flushes in-flight network writes before session teardown to prevent data loss.

### 💎 Unified PRO Entitlements & Rewarded AdMob Gateway
- **RevenueCat Integration**: Multi-platform subscription management (`react-native-purchases` v10.6) supporting Google Play Billing & Apple App Store in-app purchases.
- **Rewarded Ad Gateway (`VoiceFeatureAdModal`)**: Seamless Google AdMob rewarded video ads (with Web fallback) allowing free/guest users to temporarily unlock PRO voice features.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile App** | [React Native 0.81.5](https://reactnative.dev/) (New Architecture), [Expo SDK 54](https://docs.expo.dev/), [React 19.1](https://react.dev/), [TypeScript 5.9](https://www.typescriptlang.org/) |
| **Navigation** | [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Animations & UI** | [React Native Reanimated v4](https://docs.swmansion.com/react-native-reanimated/), [React Native SVG](https://github.com/software-mansion/react-native-svg), Expo Haptics |
| **Vision AI** | [Google Gemini 2.5 Flash / 2.0 Flash](https://ai.google.dev/), [OpenAI GPT-4o-mini Vision](https://platform.openai.com/) |
| **Speech AI (TTS)** | Qwen3-TTS, MLX/Metal, compatible Coqui XTTS-v2/PyTorch speakers, FastAPI, Uvicorn, SoundFile |
| **Backend & Cloud** | [Supabase](https://supabase.com/) (PostgreSQL, Realtime Auth, Storage, Row Level Security) |
| **Health Sync** | [Google Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect), Apple HealthKit |
| **Monetization** | [RevenueCat SDK](https://www.revenuecat.com/) (`react-native-purchases`), [Google Mobile Ads](https://github.com/invertase/react-native-google-mobile-ads) |

---

## 📁 Repository Structure

```text
├── app/                        # Expo Router file-based pages and navigation
│   ├── (tabs)/                 # Main app tabs (Dashboard, Analytics, Habits, Journal, Log, Pro)
│   ├── auth/                   # Authentication screens (Sign in, Sign up, Forgot Password)
│   ├── onboarding.tsx          # Multi-step biometrics & macro goals onboarding flow
│   └── _layout.tsx             # Root layout with providers & navigation shell
├── assets/                     # App icons, splash screens, illustrations, and audio
│   ├── sounds/                 # 16 original bundled action sounds
│   └── voices/                 # Reference WAV audio files for zero-shot voice cloning
├── components/                 # Reusable UI components
│   ├── navbar/                 # QuickActionFab, AnimatedTabItem, custom bottom tab bar
│   ├── CircularProgress.tsx    # SVG macro progress rings
│   ├── VoiceFeatureAdModal.tsx # Rewarded AdMob modal for unlocking PRO voices
│   ├── ui/FeedbackPressable.tsx# Native button wrappers with optional tap audio
│   └── PaywallModal.tsx        # RevenueCat PRO subscription paywall
├── hooks/                      # Shared UI behavior, voice loading and sound preference
├── constants/                  # Colors, typography, meal types, and multi-language translations
├── context/                    # React Contexts (Auth, Subscription, Theme, Language)
├── services/                   # Business logic and external API integrations
│   ├── aiVisionService.ts      # Gemini & OpenAI meal vision processing
│   ├── voiceCoachService.ts    # TTS client, playback management, and caching
│   ├── buttonSoundService.ts   # Preloaded tap audio and persisted mute preference
│   ├── voiceTextStyle.ts       # Language/dialect prompts and complete speech cache keys
│   ├── remoteConfigService.ts # Supabase TTS endpoint lookup and offline fallback
│   ├── healthSyncService.ts    # Apple HealthKit & Google Health Connect sync
│   ├── supabaseService.ts      # Cloud database operations and guest data migration
│   └── revenueCatService.ts    # In-app purchase & entitlement verification
├── tools/                      # Deterministic verification & benchmark scripts (WAT Framework)
│   ├── verify_all_tts_voices.py# Automated verification of all 63 neural voices
│   ├── warm_tts_previews.py    # Pre-warms cache for voice selector previews
│   └── benchmark_tts_threads.py# Multi-thread vs single-thread MPS benchmark
├── workflows/                  # Standard Operating Procedures (SOPs)
├── main.py                     # Compatible FastAPI voice server (MLX + XTTS)
├── mlx_tts_engine.py           # Pinned Qwen3-TTS model and reference conditioning
├── tts_dialect.py              # Optional Neapolitan text adaptation with numeric guards
├── tts_xtts_bridge.py          # Isolated legacy XTTS worker interface
├── tts_audio_cache.py          # Persistent bounded disk cache for generated speech
└── start_native_tts.sh         # Launch script for the Apple Silicon TTS server
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 20.19+** & **npm** (Expo SDK 54 minimum)
- **Python 3.11** (for the native Apple Silicon TTS server)
- **Java JDK 17** (for local Android release builds)
- [Expo Go app](https://expo.dev/go) or Android Emulator / Physical Device

### 2. Installation
```bash
git clone https://github.com/GasCst/MealPulse.git
cd MealPulse
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-google-gemini-api-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=your-revenuecat-google-key
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=your-revenuecat-apple-key
EXPO_PUBLIC_TTS_API_URL=http://<YOUR_LAN_IP>:8000
```

### 4. Running the Native Speech (TTS) Server
The Mac launcher now uses Qwen3-TTS/MLX for cloned characters and keeps XTTS-v2
for the 58 standard speakers. See [local TTS setup, dialect and benchmarks](docs/LOCAL_TTS.md).
To start the Apple Silicon voice server:
```bash
python3.11 -m venv venv_mlx_tts
venv_mlx_tts/bin/python -m pip install -r requirements-mlx.in
chmod +x start_native_tts.sh
./start_native_tts.sh
```
Keep the existing `tts_env` environment for the 58 XTTS voices; MLX runs in its
own environment. The server listens on all interfaces at port 8000 after loading
and warming the models. Repeated audio is served from RAM or the bounded disk cache.

#### Phone connectivity and system-voice fallback

The phone reads the server address from the `tts_api_url` row in Supabase's
`app_config` table. Keep that value aligned with the Mac's current reachable
address, for example `http://<MAC_LAN_IP>:8000`; editing only `.env` does not update
Supabase. The table is publicly readable and protected from client writes by RLS.
Endpoint changes must be made by an authorized administrator or server publisher.
No automatic Mac IP publisher is configured in this repository.

For a LAN address, both devices need network access to the Mac and the Mac must
remain awake. After updating the address, fully close and reopen older installed
versions, then try a new message to avoid their cached address/audio. Changing
the server engine or the Supabase URL does not require a new Google Play AAB.
The improved client lookup, translations and interface changes require a new
app build or a compatible update to reach an installed app.

Verify the entire path, including a WAV from Zio Napoletano:

```bash
venv_mlx_tts/bin/python tools/test_remote_config.py
```

#### Pre-warming & Verifying TTS Voices:
```bash
# Pre-warm selector preview clips into cache
venv_mlx_tts/bin/python tools/warm_tts_previews.py

# Verify all 63 neural voices against the running server
venv_mlx_tts/bin/python tools/verify_all_tts_voices.py --url http://localhost:8000
```

### 5. Running the Mobile App
```bash
npx expo start -c
```
- Press `a` to open in Android Emulator / device.
- Press `i` to open in iOS Simulator.
- Press `w` to open in Web browser.

---

## 🤖 Android Native Release Build (`.aab`)

To compile a signed production Android App Bundle (`.aab`) for Google Play Console:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
cd android && ./gradlew bundleRelease
```

The output bundle will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

The nutrition-data release is **2.5.10**, Android version code **120**. Keep
`app.json` and `android/app/build.gradle` versions synchronized before the next build.

---

## 🧪 Testing & Verification Scripts (WAT Architecture)

```bash
npx tsc --noEmit
npm run lint
venv_mlx_tts/bin/python -m unittest discover -s tools -p 'test_tts*.py'
node --test tools/test_remote_config.cjs
node --test tools/test_ui_feedback.cjs
node --test tools/test_morning_briefing.cjs
node --test tools/test_nutrition_data.cjs
```

The nutrition suite covers serving/100g conversion, g/mg/µg/IU units, declared zero versus missing values, liquid volumes, quality flags, portion re-editing, barcode-specific label corrections, and malformed photo/voice responses.

The Python suite covers routing, voice aliases, WAV format, cache invalidation,
number pronunciation and dialect rewrite guards. The JavaScript tests cover
changed Mac addresses, concurrent lookups and offline fallbacks. Live voice
verification checks transport and voice provenance; perceived naturalness still
requires listening.

The UI feedback suite checks button coverage, action categories, disabled controls, mute persistence,
distinct audio assets, rapid presses, presses during preload, event deduplication,
serialized player commands, retry/fallback recovery, native Android resource mapping
and cancellation during mute/release, as well as
voice loading through WAV download/player setup, request cancellation and stale
playback callbacks. Listen to the tap sound and test TTS on a physical phone using
the Google Play internal testing track before promoting a release.

The morning briefing suite checks meal and walking updates, the activity-budget setting,
zero remaining targets, bounded context-aware caching, all supported languages and
Neapolitan wording. It also renders the actual card to verify updates with the same
voice, delayed-response cancellation and voice/language changes.

Additional verification tools:
- **TTS Cache Test**: `venv_mlx_tts/bin/python tools/test_tts_audio_cache.py`
- **TTS Thread Benchmark**: `tts_env/bin/python tools/benchmark_tts_threads.py`
- **Supabase Persistence Verification**: `python3 tools/verify_supabase_persistence.py`
- **Health Sync Verification**: `python3 tools/verify_health_sync.py`

---

## 📄 License
This project is proprietary and confidential. All rights reserved.
