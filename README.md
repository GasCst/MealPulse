# 🥗 MealPulse AI — AI-Powered Vision Nutritionist & Macro Scanner

**MealPulse AI** is a state-of-the-art mobile application built with **React Native (Expo SDK 54)** and powered by **Google Gemini Vision AI** & **OpenAI GPT-4o-mini**. It enables users to snap a photo of any food plate or fruit, automatically count individual items (e.g. 5 walnuts, 3 eggs), estimate volumetric portion weights in grams, calculate precise macros (calories, protein, carbs, fat), and sync everything securely to a **Supabase Cloud Database**.

---

## ✨ Features

- 📸 **Real-Time AI Vision Scanner**:
  - Analyzes food photos instantly using Google Gemini 2.0 / 2.5 Flash & OpenAI Vision.
  - Recognizes dish names, freshness, and food types with up to 99% accuracy.
- ⚖️ **Object Counting & Volumetric Weight Math**:
  - Counts individual items in photos (e.g. 5 walnuts, 12 grapes).
  - Calculates total portion weight in grams (`count × unit_weight = total_grams`).
- ☁️ **Per-Account Supabase Cloud Persistence**:
  - Automatically saves scanned meals, macros, timestamps, and food photos attached to user account IDs (`user_id`).
  - Automatically resets daily intake targets while preserving complete historical logs in the cloud.
- 📜 **Date-by-Date Meal History Timeline**:
  - Interactive history browser displaying past days' meal scans with calories, macros, and photo thumbnails.
- 💧 **Hydration Tracker**:
  - Glass-by-glass daily water intake counter with target goal tracking.
- 🔑 **Dynamic Key & Auth System**:
  - Supports Google OAuth & Email authentication via Supabase Auth.
  - In-app Custom API Key configurator allowing custom Gemini & OpenAI keys.

---

## 🛠️ Tech Stack

- **Framework**: [Expo SDK 54](https://docs.expo.dev/) (React Native with TypeScript)
- **Routing**: [Expo Router v4](https://docs.expo.dev/router/introduction/) (File-based navigation)
- **AI Models**:
  - [Google Gemini REST API](https://ai.google.dev/) (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-flash-latest`)
  - [OpenAI GPT-4o-mini Vision API](https://platform.openai.com/)
- **Backend & Cloud DB**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, RLS Policies)
- **Monetization & Purchases**: [RevenueCat SDK](https://www.revenuecat.com/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- [Expo Go app](https://expo.dev/go) on your Android or iOS device

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/mealpulse-ai.git
cd mealpulse-ai
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyYourGoogleGeminiApiKey
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-YourOpenAIApiKey
```

### 4. Database Setup (Supabase)
Run the SQL migration script located in `supabase_schema.sql` inside your Supabase project's **SQL Editor** to create the `profiles`, `subscriptions`, and `meal_logs` tables with Row Level Security.

### 5. Running Locally
Start the Expo development server:
```bash
npx expo start -c
```
Scan the QR code using the **Expo Go app** on your mobile device.

---

## 🤖 Android Deployment (Google Play Store)

To build and deploy MealPulse AI to the Google Play Store:

1. **Install EAS CLI & Log In**:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Build Android Production App Bundle (`.aab`)**:
   ```bash
   eas build --platform android --profile production
   ```
3. **Upload `.aab` to Google Play Console**:
   - Download the generated `.aab` file from EAS.
   - Upload to **Google Play Console ➔ Production Release**.

---

## 📄 License
This project is licensed under the MIT License.
