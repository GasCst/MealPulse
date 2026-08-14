# 🥗 MealPulse AI — AI-Powered Vision Nutritionist & Macro Scanner

**MealPulse AI** is a state-of-the-art mobile application built with **React Native (Expo SDK 54)** and powered by **Google Gemini Vision AI** & **OpenAI GPT-4o-mini**. It enables users to snap a photo of any food plate or fruit, automatically count individual items (e.g. 5 walnuts, 3 eggs), estimate volumetric portion weights in grams, calculate precise macros (calories, protein, carbs, fat), track intermittent fasting & daily hydration, and sync everything securely to a **Supabase Cloud Database**.

---

## ✨ Features & Architecture Highlights

- 📸 **Real-Time AI Vision Scanner**:
  - Analyzes food photos instantly using Google Gemini 2.5 Flash / 2.0 Flash & OpenAI Vision.
  - Photo Source Picker on every tap: Choose between taking a live photo or picking from photo library.
  - Recognizes dish names, portion estimates, freshness, and macro distributions with high accuracy.
- 🍩 **Dynamic Daily Macro Targets Card**:
  - 3 Circular SVG Donut Progress Rings (**Protein**, **Carbs**, **Fats**) side-by-side in a single row.
  - Displays real-time macro grams and percentage badges.
  - Powered by React Native Reanimated with a smooth **3D vertical perspective rotation entrance on scroll**.
- 💧 **Persistent Hydration Tracker**:
  - Incremental (`+250 ml`, `+500 ml`) and decremental (`-250 ml` with auto-disable at 0 ml) quick-action buttons.
  - Instant local cache & Supabase `water_logs` cloud sync.
- ⏱️ **Intermittent Fasting Timer**:
  - Tracks active fasting windows, elapsed time, progress percentages, and fasting history.
- ☁️ **Full-Stack Supabase Cloud Persistence**:
  - 100% Cloud Persistence across `meal_logs`, `water_logs`, `user_biometrics`, `fasting_logs`, `user_habits`, `journal_entries`, `promo_events`, and `subscriptions`.
  - Enforces strict Row Level Security (RLS) policies (`auth.uid() = user_id` for SELECT, INSERT, UPDATE, DELETE).
- 🛡️ **Hardened Guest-to-Account Sync Architecture**:
  - **Local Guest Storage**: Unauthenticated users can log meals, water, and biometrics stored safely in local `AsyncStorage`.
  - **100% Atomic Cloud Migration**: Upon sign-in/up, `SupabaseService.syncLocalCacheToCloud()` uploads guest data to the user's Supabase account. Guest keys are purged *only* upon 100% complete upload success (atomic commit).
  - **Zero Duplicates**: Every meal uses a client-generated unique ID (`meal_1723538400000_a1b2c3d`) with Supabase `.upsert()` for total idempotency across multiple login/logout cycles.
  - **In-Flight Write Guard (`signOutSafe`)**: Prevents race conditions on logout by ensuring active writes finish cleanly before session resets.
- 💎 **Unified PRO Entitlements & AdMob Engine**:
  - Unified RevenueCat + Supabase PRO key verification (`PRO_ENTITLEMENT_KEYS`).
  - Google AdMob integration (Free tier watches sponsor ads before scanning; PRO tier scans instantly with zero ads).
- 🌐 **Multi-Language Support (i18n)**:
  - Multi-language support (English, Italian, Spanish, French, German) via `LanguageContext`.

---

## 🛠️ Tech Stack

- **Core Framework**: [Expo SDK 54](https://docs.expo.dev/) (React Native with TypeScript)
- **Navigation**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Animations & Graphics**: [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) & [React Native SVG](https://github.com/software-mansion/react-native-svg)
- **AI Models**:
  - [Google Gemini REST API](https://ai.google.dev/) (`gemini-2.5-flash`, `gemini-2.0-flash`)
  - [OpenAI GPT-4o-mini Vision API](https://platform.openai.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Realtime Auth, RLS Policies)
- **Subscriptions & Billing**: [RevenueCat SDK](https://www.revenuecat.com/) (`react-native-purchases`)
- **Advertising**: Google Mobile Ads SDK (`react-native-google-mobile-ads`)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or v20+)
- npm or yarn
- Java JDK 17 (for Android native builds)
- [Expo Go app](https://expo.dev/go) or Android Emulator / Physical Device

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/GasCst/MealPulse.git
cd MealPulse
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=your-google-gemini-api-key
EXPO_PUBLIC_OPENAI_API_KEY=your-openai-api-key
EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY=your-revenuecat-google-key
EXPO_PUBLIC_REVENUECAT_APPLE_KEY=your-revenuecat-apple-key
```

### 4. Running Locally
Start the Metro bundler:
```bash
npx expo start -c
```

---

## 🤖 Android Native Build (`.aab` / `.apk`)

To generate a signed production bundle (`.aab`) locally:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH="/Users/gascs/.nvm/versions/node/v24.15.0/bin:$PATH"
cd android && ./gradlew bundleRelease
```

The compiled release bundle will be located at:
`android/app/build/outputs/bundle/release/app-release.aab`

---

## 📄 License
This project is proprietary and confidential. All rights reserved.
