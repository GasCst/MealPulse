/**
 * AI Vision & Voice Nutrition Service — Powered by Google Gemini AI
 * High-speed multimodality for instant photo & spoken voice meal recognition.
 */

export interface MealVisionResult {
  food_name: string;
  estimated_weight_g: number;
  item_count?: number;
  unit_weight_g?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: number;
  health_score: 'A' | 'B' | 'C' | 'D' | string;
  insights: string;
}

export interface VoiceMealItem {
  name: string;
  portion: string;
  weight_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  emoji: string;
}

export interface VoiceMealParsedResult {
  speech_transcription?: string;
  meal_title: string;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  items: VoiceMealItem[];
}

/**
 * Ultra-resilient JSON parser with regex extraction fallbacks
 */
function safeParseMealResult(rawText: string, defaultName: string = 'Scanned Meal'): MealVisionResult {
  let cleanJson = (rawText || '').trim();

  // Strip markdown code fences (```json ... ``` or ``` ...)
  cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();

  const firstBrace = cleanJson.indexOf('{');
  const lastBrace = cleanJson.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before closing braces
  cleanJson = cleanJson.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

  try {
    const parsed = JSON.parse(cleanJson);
    const estWeight = Math.round(
      parsed.estimated_weight_g ||
      (parsed.item_count && parsed.unit_weight_g ? parsed.item_count * parsed.unit_weight_g : 180)
    );

    let score: 'A' | 'B' | 'C' | 'D' = 'B';
    if (typeof parsed.health_score === 'string') {
      const upper = parsed.health_score.toUpperCase().trim();
      if (['A', 'B', 'C', 'D'].includes(upper)) {
        score = upper as any;
      }
    } else if (typeof parsed.health_score === 'number') {
      score = parsed.health_score >= 80 ? 'A' : parsed.health_score >= 50 ? 'B' : parsed.health_score >= 30 ? 'C' : 'D';
    }

    let insightsText = 'Nutritious and balanced plate.';
    if (typeof parsed.insights === 'string') {
      insightsText = parsed.insights;
    } else if (Array.isArray(parsed.insights)) {
      insightsText = parsed.insights.join(' ');
    }

    return {
      food_name: parsed.food_name || defaultName,
      estimated_weight_g: estWeight > 0 ? estWeight : 180,
      item_count: parsed.item_count || 1,
      unit_weight_g: parsed.unit_weight_g || estWeight,
      calories: Math.max(0, Math.round(parsed.calories || 250)),
      protein_g: Math.max(0, Math.round((parsed.protein_g ?? 12) * 10) / 10),
      carbs_g: Math.max(0, Math.round((parsed.carbs_g ?? 25) * 10) / 10),
      fat_g: Math.max(0, Math.round((parsed.fat_g ?? 8) * 10) / 10),
      confidence: parsed.confidence || 0.95,
      health_score: score,
      insights: insightsText,
    };
  } catch (err) {
    console.warn('[AI Vision] Primary JSON.parse failed, attempting regex field extraction:', err);

    // Regex Fallback Extractor
    const extractStr = (key: string, def: string) => {
      const match = rawText.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, 'i'));
      return match ? match[1].trim() : def;
    };
    const extractNum = (key: string, def: number) => {
      const match = rawText.match(new RegExp(`"${key}"\\s*:\\s*([\\d.]+)`, 'i'));
      return match ? parseFloat(match[1]) : def;
    };

    const extractedName = extractStr('food_name', defaultName);
    const extractedCal = Math.round(extractNum('calories', 280));
    const extractedProtein = Math.round(extractNum('protein_g', 15) * 10) / 10;
    const extractedCarbs = Math.round(extractNum('carbs_g', 30) * 10) / 10;
    const extractedFat = Math.round(extractNum('fat_g', 10) * 10) / 10;
    const extractedWeight = Math.round(extractNum('estimated_weight_g', 180));
    const extractedInsights = extractStr('insights', 'Piatto bilanciato e nutriente.');

    return {
      food_name: extractedName,
      estimated_weight_g: extractedWeight,
      item_count: 1,
      unit_weight_g: extractedWeight,
      calories: extractedCal,
      protein_g: extractedProtein,
      carbs_g: extractedCarbs,
      fat_g: extractedFat,
      confidence: 0.9,
      health_score: 'B',
      insights: extractedInsights,
    };
  }
}

/**
 * Fast Google Gemini Vision API Call
 */
async function callGeminiVisionAPI(base64Data: string, apiKey: string): Promise<MealVisionResult> {
  const prompt = `Identify the food dish in this photo with high accuracy. Return ONLY valid JSON:
{
  "food_name": "dish name (string)",
  "estimated_weight_g": 180,
  "calories": 300,
  "protein_g": 15,
  "carbs_g": 30,
  "fat_g": 10,
  "health_score": "A"|"B"|"C"|"D",
  "insights": "1 short advice sentence"
}`;

  // Prioritize active, high-throughput Google Gemini models
  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
  ];

  let lastError = '';

  for (let i = 0; i < endpointsToTry.length; i++) {
    const url = endpointsToTry[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      console.log(`[AI Fast Vision] Calling model ${i + 1}: ${url.split('?')[0]}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 1024,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text.trim();
        console.log(`[AI Fast Vision] SUCCESS from endpoint ${i + 1}:`, rawText);
        return safeParseMealResult(rawText, 'Pasto Scansionato');
      } else if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
        console.warn(`[AI Fast Vision] Endpoint ${i + 1} error:`, lastError);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e.message || String(e);
      console.warn(`[AI Fast Vision] Endpoint ${i + 1} failed:`, lastError);
    }
  }

  throw new Error(`AI Vision Scanner Error: ${lastError || 'Could not analyze photo. Please try again.'}`);
}

/**
 * Passes photo directly to Google Gemini Fast Vision API.
 */
export async function analyzeMealPlateImage(
  base64Image: string,
  userApiKey?: string
): Promise<MealVisionResult> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').trim();

  if (!cleanBase64) {
    throw new Error('Image data is empty. Please select or take a photo again.');
  }

  const inAppKey = userApiKey?.trim();
  const envGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  const geminiKey = inAppKey || envGeminiKey || 'AQ.Ab8RN6JYx8SCCc6JIN9uPWNj2ad2DuH8bpdK3Jg2eLJ9AYxAXg';

  return await callGeminiVisionAPI(cleanBase64, geminiKey);
}

/**
 * Parses spoken voice descriptions using Gemini AI
 */
export async function parseMealFromVoiceText(
  speechText: string,
  userApiKey?: string
): Promise<VoiceMealParsedResult> {
  const cleanText = speechText.trim();
  if (!cleanText) {
    throw new Error('Voice description is empty.');
  }

  const inAppKey = userApiKey?.trim();
  const envGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  const apiKey = inAppKey || envGeminiKey || 'AQ.Ab8RN6JYx8SCCc6JIN9uPWNj2ad2DuH8bpdK3Jg2eLJ9AYxAXg';

  const prompt = `You are an expert AI nutritionist. Convert the user's spoken meal description into a structured list of foods with accurate portion weights (in grams), calories, and macronutrients (protein, carbs, fat), plus a suitable emoji for each item.
Language: Italian / Multilingual.

User Spoken Description: "${cleanText}"

Return ONLY valid JSON in this exact structure:
{
  "meal_title": "string (e.g. 'Pranzo Bilanciato' or 'Colazione')",
  "total_calories": 550,
  "total_protein_g": 45,
  "total_carbs_g": 60,
  "total_fat_g": 12,
  "items": [
    {
      "name": "string (e.g. 'Riso Basmati')",
      "portion": "string (e.g. '150g')",
      "weight_g": 150,
      "calories": 195,
      "protein_g": 4,
      "carbs_g": 42,
      "fat_g": 0.5,
      "emoji": "🍚"
    }
  ]
}`;

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
  ];

  let lastError = '';

  for (const url of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 1024,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        let rawText = data.candidates[0].content.parts[0].text.trim();
        rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();

        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          rawText = rawText.substring(firstBrace, lastBrace + 1);
        }

        const parsed: VoiceMealParsedResult = JSON.parse(rawText);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          return {
            meal_title: parsed.meal_title || 'Pasto Rilevato',
            total_calories: Math.round(parsed.total_calories || parsed.items.reduce((acc, i) => acc + (i.calories || 0), 0)),
            total_protein_g: Math.round((parsed.total_protein_g || parsed.items.reduce((acc, i) => acc + (i.protein_g || 0), 0)) * 10) / 10,
            total_carbs_g: Math.round((parsed.total_carbs_g || parsed.items.reduce((acc, i) => acc + (i.carbs_g || 0), 0)) * 10) / 10,
            total_fat_g: Math.round((parsed.total_fat_g || parsed.items.reduce((acc, i) => acc + (i.fat_g || 0), 0)) * 10) / 10,
            items: parsed.items.map((it) => ({
              name: it.name || 'Alimento',
              portion: it.portion || `${it.weight_g || 100}g`,
              weight_g: Math.round(it.weight_g || 100),
              calories: Math.round(it.calories || 0),
              protein_g: Math.round((it.protein_g || 0) * 10) / 10,
              carbs_g: Math.round((it.carbs_g || 0) * 10) / 10,
              fat_g: Math.round((it.fat_g || 0) * 10) / 10,
              emoji: it.emoji || '🍽️',
            })),
          };
        }
      } else if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e.message || String(e);
    }
  }

  throw new Error(`AI Voice Error: ${lastError || 'Impossibile elaborare la descrizione vocale.'}`);
}

/**
 * Parses spoken audio recording directly using Google Gemini Multimodal Audio API
 */
export async function parseMealFromAudioBase64(
  base64Audio: string,
  mimeType: string = 'audio/mp4',
  userApiKey?: string
): Promise<VoiceMealParsedResult> {
  const cleanAudio = base64Audio.replace(/^data:audio\/\w+;base64,/, '').trim();
  if (!cleanAudio) {
    throw new Error('Audio recording data is empty.');
  }

  const inAppKey = userApiKey?.trim();
  const envGeminiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();
  const apiKey = inAppKey || envGeminiKey || 'AQ.Ab8RN6JYx8SCCc6JIN9uPWNj2ad2DuH8bpdK3Jg2eLJ9AYxAXg';

  const prompt = `You are an expert AI speech-to-nutrition recognizer. Listen to the user's spoken meal audio carefully.
1. Transcribe the user's spoken words accurately (in Italian or the spoken language).
2. Identify all foods mentioned, estimate their weight in grams, and calculate their calories and macronutrients (protein, carbs, fat).
3. Assign a matching emoji for each food item.

Return ONLY valid JSON in this exact structure:
{
  "speech_transcription": "transcription of what the user said (string)",
  "meal_title": "string (e.g. 'Pranzo Bilanciato' or 'Colazione')",
  "total_calories": 550,
  "total_protein_g": 45,
  "total_carbs_g": 60,
  "total_fat_g": 12,
  "items": [
    {
      "name": "string (e.g. 'Riso Basmati')",
      "portion": "string (e.g. '150g')",
      "weight_g": 150,
      "calories": 195,
      "protein_g": 4,
      "carbs_g": 42,
      "fat_g": 0.5,
      "emoji": "🍚"
    }
  ]
}`;

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
  ];

  let lastError = '';

  for (const url of endpointsToTry) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'audio/mp4',
                    data: cleanAudio,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            maxOutputTokens: 1024,
            temperature: 0.1,
          },
        }),
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!data.error && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        let rawText = data.candidates[0].content.parts[0].text.trim();
        rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/g, '').trim();

        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
          rawText = rawText.substring(firstBrace, lastBrace + 1);
        }

        let parsed: any = null;
        try {
          rawText = rawText.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          parsed = JSON.parse(rawText);
        } catch {
          // Attempt recovery
          parsed = null;
        }

        if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
          return {
            speech_transcription: parsed.speech_transcription || '',
            meal_title: parsed.meal_title || 'Pasto Vocale Riconosciuto',
            total_calories: Math.round(parsed.total_calories || parsed.items.reduce((acc: number, i: any) => acc + (i.calories || 0), 0)),
            total_protein_g: Math.round((parsed.total_protein_g || parsed.items.reduce((acc: number, i: any) => acc + (i.protein_g || 0), 0)) * 10) / 10,
            total_carbs_g: Math.round((parsed.total_carbs_g || parsed.items.reduce((acc: number, i: any) => acc + (i.carbs_g || 0), 0)) * 10) / 10,
            total_fat_g: Math.round((parsed.total_fat_g || parsed.items.reduce((acc: number, i: any) => acc + (i.fat_g || 0), 0)) * 10) / 10,
            items: parsed.items.map((it: any) => ({
              name: it.name || 'Alimento',
              portion: it.portion || `${it.weight_g || 100}g`,
              weight_g: Math.round(it.weight_g || 100),
              calories: Math.round(it.calories || 0),
              protein_g: Math.round((it.protein_g || 0) * 10) / 10,
              carbs_g: Math.round((it.carbs_g || 0) * 10) / 10,
              fat_g: Math.round((it.fat_g || 0) * 10) / 10,
              emoji: it.emoji || '🍽️',
            })),
          };
        }
      } else if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      lastError = e.message || String(e);
    }
  }

  throw new Error(`AI Audio Recognition Error: ${lastError || 'Impossibile elaborare la registrazione audio.'}`);
}
