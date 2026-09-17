# 🥗 MealPulse AI — AI-Powered Vision Nutritionist, Macro Scanner & Voice Coach

**MealPulse AI** is a state-of-the-art mobile application built with **React Native (Expo SDK 54)** and powered by **Google Gemini Vision AI**, **OpenAI GPT-4o-mini**, and **Coqui XTTS-v2 Zero-Shot Voice Cloning**. It enables users to snap a photo of any food plate or fruit, automatically count individual items (e.g. 5 walnuts, 3 eggs), estimate volumetric portion weights in grams, calculate precise macros (calories, protein, carbs, fat), receive humorous voice roasts & coaching from customizable AI personalities, track intermittent fasting & daily hydration, and sync everything securely to a **Supabase Cloud Database**.

---

## ✨ Features & Architecture Highlights

### 📸 Real-Time AI Vision Scanner
- Analyzes food photos instantly using **Google Gemini 2.5 Flash / 2.0 Flash** & **OpenAI Vision**.
- **Photo Source Picker**: Take a live photo with camera or choose from gallery on any meal tap.
- Recognizes dish names, individual component breakdown, portion gram estimates, freshness, and macro distributions.
- Supports scanning non-food objects with playful AI roasts and zero-calorie fallback.

### 🎙️ AI Voice Coach & Zero-Shot Speech Synthesis (Coqui XTTS-v2)
- **5 Iconic Personality Characters**:
  1. 🤌 **Zio Napoletano**: Warm, passionate, and protective defender of authentic Mediterranean food.
  2. 👨‍🍳 **Chef Gordon**: Severe, uncompromising, sarcastic Michelin-star disciplinarian.
  3. 💅 **Diva Snob**: Milanese high-fashion influencer disgusted by cheap junk food.
  4. ⚡ **Stand-up Comico**: Sharp Roman stand-up cabaret comedian with punchlines.
  5. 🎙️ **Sara Gen-Z**: Energetic, unfiltered fitness bestie living on meme logic.
- **58+ Neural Voices**: Extensive library of pre-calculated neural voices accessible via the Pro Voice Selector modal with detailed timbre, tone, and cadence profiles.
- **5 Dedicated Spoken Touchpoints**:
  1. 🌅 **Morning AI Nutrition Briefing**: 10-second daily briefing with caloric and protein targets.
  2. 💧 **Hydration Voice Coach**: Spoken encouragements and milestone celebrations on every glass logged.
  3. 🍽️ **Meal Roast Commentary**: Instant humorous critique and macro summary right after scanning a plate.
  4. 📖 **Daily Voice Recap**: Evening debrief reviewing daily calorie budget compliance and workout burn.
  5. 🏆 **Streak Record Celebration**: High-energy audio fanfare celebrating consecutive tracking milestones.
- **Independent vs. Global Voice Preferences**:
  - Setting a preferred personal AI coach in the Pro menu updates all ambient features across the app.
  - Meal roasts in **AI Photoscan** allow independent on-the-fly voice selection without overriding the user's personal assistant settings.

### ⚡ Native Apple Silicon Metal (MPS) & Zero-Copy Audio Engine
- Python 3.11 backend leveraging **Apple Silicon GPU Metal Performance Shaders (`mps`)** and **Apple Accelerate AMX matrix coprocessors**.
- Ultra-low latency voice cloning (~1.8s–7.2s for first generation, **0.002s instant response** with in-memory LRU audio caching).
- Dynamic endpoint resolution: client dynamically resolves backend URL from Supabase `app_config` (`tts_api_url`) with seamless offline fallback to native speech (`expo-speech`).

### 🍩 Dynamic Daily Macro Targets & Radial Navigation
- **3 Circular SVG Progress Rings**: Protein, Carbs, and Fats with real-time gram counters and percentage badges.
- **Radial FAB Expander**: Smooth expanding 4-button radial menu (`+` action button) for rapid logging (Breakfast, Lunch, Dinner, Snack, Water, and Meal Diary).
- Smooth 60 FPS transitions powered by **React Native Reanimated**.

### 💧 Persistent Hydration & Intermittent Fasting
- Increment (`+250 ml`, `+500 ml`) and decrement (`-250 ml`) buttons with real-time visual progress.
- Fasting timer supporting 16:8, 18:6, 20:4, and custom windows with elapsed countdowns and milestone logs.

### ☁️ Full-Stack Supabase Cloud Persistence & Guest Migration
- 100% cloud sync across `meal_logs`, `water_logs`, `user_biometrics`, `fasting_logs`, `user_habits`, `journal_entries`, `promo_events`, and `subscriptions`.
- Strict **Row Level Security (RLS)** (`auth.uid() = user_id`).
- **Atomic Guest-to-Account Migration**: Full offline functionality for guests in `AsyncStorage`; upon sign-in/registration, all logs are idempotently upserted to Supabase without duplicates.
- **`signOutSafe` Guard**: Flushes in-flight writes before session cleanup to prevent data race conditions.

### 💎 Unified PRO Entitlements & Rewarded AdMob Integration
- Unified RevenueCat + Supabase PRO key validation (`PRO_ENTITLEMENT_KEYS`).
- **`VoiceFeatureAdModal`**: Seamless Google AdMob rewarded ad gate for free and guest users, allowing temporary feature unlocks after viewing sponsor clips.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile App** | [React Native](https://reactnative.dev/), [Expo SDK 54](https://docs.expo.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Routing** | [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation) |
| **Animation** | [React Native Reanimated v3](https://docs.swmansion.com/react-native-reanimated/), [React Native SVG](https://github.com/software-mansion/react-native-svg) |
| **Vision AI** | [Google Gemini 2.5 Flash / 2.0 Flash](https://ai.google.dev/), [OpenAI GPT-4o-mini Vision](https://platform.openai.com/) |
| **Speech AI (TTS)** | [Coqui XTTS-v2](https://github.com/coqui-ai/TTS), FastAPI, PyTorch 2.14 with Apple Silicon Metal (`mps`) |
| **Backend & DB** | [Supabase](https://supabase.com/) (PostgreSQL, Realtime Auth, Storage, Row Level Security) |
| **Monetization** | [RevenueCat SDK](https://www.revenuecat.com/) (`react-native-purchases`), [Google Mobile Ads](https://github.com/invertase/react-native-google-mobile-ads) |

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
The server will initialize on `http://0.0.0.0:8000` with zero-copy RAM caching.

### 5. Running the Mobile App
```bash
npx expo start -c
```

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

## 📄 License
This project is proprietary and confidential. All rights reserved.
