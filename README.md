# 🥗 MealPulse AI — AI-Powered Vision Nutritionist, Macro Scanner & Voice Coach

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-blue?logo=expo&logoColor=white)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5%20(New%20Arch)-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PyTorch MPS](https://img.shields.io/badge/PyTorch-Metal%20(Apple%20Silicon)-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)

**MealPulse AI** is a cutting-edge mobile nutrition and calorie tracking platform built with **React Native (Expo SDK 54, React Native New Architecture)** and powered by **Google Gemini 2.5/2.0 Flash Vision AI**, **OpenAI GPT-4o-mini**, and a custom **Apple Silicon Metal (MPS) Coqui XTTS-v2 Zero-Shot Voice Cloning Engine**.

Snap a photo of any food plate or fruit, automatically count individual items (e.g., 5 walnuts, 3 eggs), estimate volumetric portion weights in grams, calculate precise macronutrients (calories, protein, carbs, fat), receive humorous voice roasts & coaching from customizable AI personalities, track intermittent fasting & daily hydration, synchronize real-time active calories & steps with **Apple Health** and **Google Health Connect**, and persist everything securely to **Supabase Cloud**.

---

## ✨ Features & Architecture Highlights

### 📸 Real-Time AI Vision Scanner
- **Dual AI Engine**: Powered by **Google Gemini 2.5 Flash / 2.0 Flash** & **OpenAI GPT-4o-mini Vision**.
- **Versatile Input**: Instant high-resolution camera capture or camera roll / photo gallery picker for any meal slot.
- **Granular Itemization**: Automatically detects dish names, breaks down individual ingredients, counts discrete items (nuts, eggs, slices), and estimates volumetric gram weights.
- **Macronutrient Breakdown**: Delivers instant calorie totals, protein, carbohydrate, and fat distributions.
- **Playful Non-Food Detection**: Recognizes non-edible objects with humorous AI roasts and zero-calorie safe fallbacks.

### 🎙️ AI Voice Coach & Zero-Shot Speech Synthesis (Coqui XTTS-v2)
- **5 Iconic Personality Characters**:
  1. 🤌 **Zio Napoletano**: Warm, passionate, and protective defender of authentic Mediterranean cuisine.
  2. 👨‍🍳 **Chef Gordon**: Uncompromising, sharp, Michelin-star sarcastic disciplinarian.
  3. 💅 **Diva Snob**: Milanese high-fashion influencer disgusted by processed junk food.
  4. ⚡ **Stand-up Comico**: Sharp Roman stand-up cabaret comedian packed with punchlines.
  5. 🎙️ **Sara Gen-Z**: Energetic, unfiltered fitness bestie living on meme logic.
- **63 Neural Voices Library**: 58+ pre-calculated neural voices plus 5 custom cloned characters accessible via the Pro Voice Selector modal with detailed timbre, tone, language, and cadence profiles.
- **5 Dedicated Spoken Touchpoints**:
  1. 🌅 **Morning AI Nutrition Briefing**: 10-second morning briefing outlining caloric and protein targets for the day.
  2. 💧 **Hydration Voice Coach**: Spoken encouragements and milestone celebrations on every glass logged.
  3. 🍽️ **Meal Roast Commentary**: Instant humorous critique and macro breakdown right after logging or scanning a plate.
  4. 📖 **Daily Voice Recap**: Evening debrief reviewing daily calorie budget compliance and workout burn.
  5. 🏆 **Streak Record Celebration**: High-energy audio fanfare celebrating consecutive tracking milestones.
- **Independent vs. Global Voice Preferences**:
  - Global personal AI coach setting in the Pro menu personalizes all ambient audio across the app.
  - Meal roasts in **AI Photoscan** allow independent on-the-fly voice selection without overriding the user's global assistant.

### ⚡ Native Apple Silicon Metal (MPS) & Multi-Tier Audio Cache Engine
- **PyTorch Metal Performance Shaders (`mps`)**: High-performance Python 3.11 backend accelerated by Apple Silicon GPU and AMX matrix coprocessors.
- **Multi-Tier Audio Caching**:
  - **In-Memory LRU Cache**: Ultra-fast **0 ms** instant audio return for repeated sentences and voice previews.
  - **Persistent Bounded Disk Cache (`DiskAudioCache`)**: Persists synthesized WAV files across server restarts (`.tmp/tts-audio-cache`, bounded to 300 files / 256 MiB with 7-day TTL and SHA-256 content keying).
- **Concurrency & Serialization**: Thread-safe model inference (`_inference_lock`) avoids XTTS internal state corruption while keeping FastAPI's HTTP event loop unblocked for health checks and cache hits.
- **Strict Voice Resolution**: Rejects invalid voice IDs with HTTP 422 instead of silent speaker substitution; clean fallback only when no voice is requested.
- **Auditable Response Headers**: Includes `X-Voice-Id`, `X-Voice-Source`, `X-Voice-Reference`, `X-Voice-Reference-SHA256`, and `X-Audio-Cached` for full provenance.
- **Dynamic Endpoint Resolution & Offline Fallback**: Client resolves backend TTS URL dynamically from Supabase `app_config` (`tts_api_url`) with seamless offline fallback to native speech (`expo-speech`).

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

### 💧 Hydration & Intermittent Fasting Tracker
- **Hydration Logging**: Instant increment (`+250 ml`, `+500 ml`) and decrement (`-250 ml`) buttons with visual fill animations.
- **Fasting Protocols**: Supports 16:8, 18:6, 20:4, circadian rhythms, and custom windows with countdown timers, elapsed progress rings, and milestone notifications.

### ☁️ Full-Stack Supabase Cloud Persistence & Guest Migration
- **100% Cloud Synchronization**: Real-time sync across `meal_logs`, `water_logs`, `user_biometrics`, `fasting_logs`, `user_habits`, `journal_entries`, `promo_events`, and `subscriptions`.
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
| **Speech AI (TTS)** | [Coqui XTTS-v2](https://github.com/coqui-ai/TTS), PyTorch (Metal/MPS on Apple Silicon), FastAPI, Uvicorn, SoundFile |
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
├── assets/                     # App icons, splash screens, illustrations, and TTS voice samples
│   └── voices/                 # Reference WAV audio files for zero-shot voice cloning
├── components/                 # Reusable UI components
│   ├── navbar/                 # QuickActionFab, AnimatedTabItem, custom bottom tab bar
│   ├── CircularProgress.tsx    # SVG macro progress rings
│   ├── VoiceFeatureAdModal.tsx # Rewarded AdMob modal for unlocking PRO voices
│   └── PaywallModal.tsx        # RevenueCat PRO subscription paywall
├── constants/                  # Colors, typography, meal types, and multi-language translations
├── context/                    # React Contexts (Auth, Subscription, Theme, Language)
├── services/                   # Business logic and external API integrations
│   ├── aiVisionService.ts      # Gemini & OpenAI meal vision processing
│   ├── voiceCoachService.ts    # XTTS client, playback management, and caching
│   ├── healthSyncService.ts    # Apple HealthKit & Google Health Connect sync
│   ├── supabaseService.ts      # Cloud database operations and guest data migration
│   └── revenueCatService.ts    # In-app purchase & entitlement verification
├── tools/                      # Deterministic verification & benchmark scripts (WAT Framework)
│   ├── verify_all_tts_voices.py# Automated verification of all 63 neural voices
│   ├── warm_tts_previews.py    # Pre-warms cache for voice selector previews
│   └── benchmark_tts_threads.py# Multi-thread vs single-thread MPS benchmark
├── workflows/                  # Standard Operating Procedures (SOPs)
├── main.py                     # High-performance FastAPI server with XTTS-v2 & Metal acceleration
├── tts_audio_cache.py          # Persistent bounded disk cache for generated speech
└── start_native_tts.sh         # Launch script for the Apple Silicon TTS server
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or v20+) & **npm**
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
To start the Coqui XTTS-v2 voice server on Apple Silicon (MPS):
```bash
chmod +x start_native_tts.sh
./start_native_tts.sh
```
The server will initialize on `http://0.0.0.0:8000` with zero-copy RAM caching and bounded disk caching.

#### Pre-warming & Verifying TTS Voices:
```bash
# Pre-warm selector preview clips into cache
tts_env/bin/python tools/warm_tts_previews.py

# Verify all 63 neural voices against the running server
tts_env/bin/python tools/verify_all_tts_voices.py --url http://localhost:8000
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

---

## 🧪 Testing & Verification Scripts (WAT Architecture)

MealPulse AI implements the **WAT (Workflows, Agents, Tools)** architecture:
- **TTS Cache Test**: `tts_env/bin/python tools/test_tts_audio_cache.py`
- **TTS Thread Benchmark**: `tts_env/bin/python tools/benchmark_tts_threads.py`
- **Supabase Persistence Verification**: `python3 tools/verify_supabase_persistence.py`
- **Health Sync Verification**: `python3 tools/verify_health_sync.py`

---

## 📄 License
This project is proprietary and confidential. All rights reserved.
