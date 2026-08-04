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
  health_score: number;
  insights: string;
}

/**
 * Executes Real Google Gemini Vision API Call with base64 image and step-by-step logging
 */
async function callGeminiVisionAPI(base64Data: string, apiKey: string): Promise<MealVisionResult> {
  const prompt = `You are a world-class AI nutritionist vision scanner. Examine this food photo carefully.
Perform object counting and volumetric weight estimation:
1. Count individual items if distinct (e.g. 5 walnuts, 3 eggs, 12 grapes, 2 tomatoes).
2. Estimate standard weight per single item (e.g. 1 walnut = 5g, 1 egg = 50g, 1 grape = 4.5g).
3. Multiply item count by unit weight to compute total estimated weight in grams (e.g. 5 walnuts * 5g = 25g total weight).
4. Calculate exact calories & macros proportional to that estimated total weight in grams.

Return ONLY a valid JSON object with keys:
"food_name" (string, e.g. "5 Whole Walnuts" or "2 Sliced Tomatoes"),
"estimated_weight_g" (number, total grams e.g. 25),
"item_count" (number, count e.g. 5),
"unit_weight_g" (number, grams per unit e.g. 5),
"calories" (number),
"protein_g" (number),
"carbs_g" (number),
"fat_g" (number),
"confidence" (number 0.85-0.99),
"health_score" (number 1-10),
"insights" (short 1-sentence explanation e.g. "Counted 5 walnuts (~5g each) = 25g total portion weight."). Do NOT wrap in markdown formatting or triple backticks.`;

  const endpointsToTry = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
  ];

  let lastError = '';

  for (let i = 0; i < endpointsToTry.length; i++) {
    const url = endpointsToTry[i];
    console.log(`[AI Vision Step 3.${i + 1}] Requesting Gemini API URL: ${url.split('?')[0]}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          },
        }),
      });

      console.log(`[AI Vision Step 4.${i + 1}] HTTP Response Status: ${response.status}`);
      const data = await response.json();
      console.log(`[AI Vision Step 4.${i + 1}] Response Data:`, JSON.stringify(data));

      if (!data.error && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        const rawText = data.candidates[0].content.parts[0].text.trim();
        const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const estWeight = Math.round(parsed.estimated_weight_g || (parsed.item_count && parsed.unit_weight_g ? parsed.item_count * parsed.unit_weight_g : 150));

        console.log(`[AI Vision Step 5] SUCCESS! Food: "${parsed.food_name}", Count: ${parsed.item_count || 1}, Weight: ${estWeight}g, Calories: ${parsed.calories}`);

        return {
          food_name: parsed.food_name || 'AI Analyzed Food',
          estimated_weight_g: estWeight,
          item_count: parsed.item_count || 1,
          unit_weight_g: parsed.unit_weight_g || estWeight,
          calories: Math.round(parsed.calories || 150),
          protein_g: Math.round((parsed.protein_g || 5) * 10) / 10,
          carbs_g: Math.round((parsed.carbs_g || 20) * 10) / 10,
          fat_g: Math.round((parsed.fat_g || 2) * 10) / 10,
          confidence: parsed.confidence || 0.96,
          health_score: parsed.health_score || 9,
          insights: parsed.insights || `Counted portion (~${estWeight}g total). Nutritious whole food.`,
        };
      } else if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
        console.warn(`[AI Vision Step 4.${i + 1} Warning] Google API Error: ${lastError}`);
      }
    } catch (e: any) {
      lastError = e.message || String(e);
      console.warn(`[AI Vision Step 4.${i + 1} Error] Fetch Exception: ${lastError}`);
    }
  }

  // Dynamic Model Discovery: Query Google AI to find active vision model for this key
  console.log('[AI Vision Step 3.Discovery] Querying Google AI ListModels endpoint...');
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();

    if (listData.models && Array.isArray(listData.models)) {
      // Find candidate model that is NOT currently rate-limited (excluding gemini-2.5-flash if 429)
      const visionModels = listData.models.filter(
        (m: any) => m.supportedGenerationMethods?.includes('generateContent') && (m.name.includes('flash') || m.name.includes('vision') || m.name.includes('gemini'))
      );

      for (const visionModel of visionModels) {
        if (!visionModel.name) continue;
        console.log(`[AI Vision Step 3.Discovery] Trying active model: ${visionModel.name}`);
        const dynamicUrl = `https://generativelanguage.googleapis.com/v1beta/${visionModel.name}:generateContent?key=${apiKey}`;
        const response = await fetch(dynamicUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          }),
        });

        const data = await response.json();
        console.log('[AI Vision Step 4.Discovery] Response Data:', JSON.stringify(data));

        if (!data.error && data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text.trim();
          const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanJson);
          const estWeight = Math.round(parsed.estimated_weight_g || (parsed.item_count && parsed.unit_weight_g ? parsed.item_count * parsed.unit_weight_g : 150));
          return {
            food_name: parsed.food_name || 'AI Analyzed Food',
            estimated_weight_g: estWeight,
            item_count: parsed.item_count || 1,
            unit_weight_g: parsed.unit_weight_g || estWeight,
            calories: Math.round(parsed.calories || 150),
            protein_g: Math.round((parsed.protein_g || 5) * 10) / 10,
            carbs_g: Math.round((parsed.carbs_g || 20) * 10) / 10,
            fat_g: Math.round((parsed.fat_g || 2) * 10) / 10,
            confidence: parsed.confidence || 0.96,
            health_score: parsed.health_score || 9,
            insights: parsed.insights || 'Nutritious meal detected by Google Gemini.',
          };
        }
      }
    }
  } catch (err: any) {
    console.warn('[AI Vision Step 3.Discovery Error]', err.message);
  }

  throw new Error(`Google Gemini API Rate Limit / Error: ${lastError}`);
}

/**
 * Executes Real OpenAI GPT-4o-mini Vision API Call with base64 image
 */
async function callOpenAiVisionAPI(base64Data: string, apiKey: string): Promise<MealVisionResult> {
  console.log('[AI Vision Step 3] Requesting OpenAI GPT-4o-mini Vision API...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'You are an expert AI nutritionist scanner. Carefully analyze this image of food or fruit. Count distinct items if applicable (e.g., 5 walnuts, 3 eggs). Estimate single unit weight in grams and total portion weight. Return a JSON object with keys: "food_name" (string), "estimated_weight_g" (number), "item_count" (number), "unit_weight_g" (number), "calories" (number), "protein_g" (number), "carbs_g" (number), "fat_g" (number), "confidence" (number 0.85-0.99), "health_score" (number 1-10), "insights" (short 1-sentence advice).',
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Data}` },
            },
          ],
        },
      ],
    }),
  });

  console.log(`[AI Vision Step 4] OpenAI Response Status: ${response.status}`);
  const data = await response.json();
  console.log('[AI Vision Step 4] OpenAI Response Data:', JSON.stringify(data));

  if (data.error) {
    throw new Error(`OpenAI API Error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  if (data.choices && data.choices[0]?.message?.content) {
    const parsed = JSON.parse(data.choices[0].message.content);
    const estWeight = Math.round(parsed.estimated_weight_g || (parsed.item_count && parsed.unit_weight_g ? parsed.item_count * parsed.unit_weight_g : 150));
    return {
      food_name: parsed.food_name || 'AI Analyzed Food',
      estimated_weight_g: estWeight,
      item_count: parsed.item_count || 1,
      unit_weight_g: parsed.unit_weight_g || estWeight,
      calories: Math.round(parsed.calories || 150),
      protein_g: Math.round((parsed.protein_g || 5) * 10) / 10,
      carbs_g: Math.round((parsed.carbs_g || 20) * 10) / 10,
      fat_g: Math.round((parsed.fat_g || 2) * 10) / 10,
      confidence: parsed.confidence || 0.95,
      health_score: parsed.health_score || 9,
      insights: parsed.insights || 'Nutritious whole food option detected by OpenAI Vision.',
    };
  }

  throw new Error('OpenAI Vision API did not return a valid completion response.');
}

/**
 * Passes photo directly to Google Gemini or OpenAI Vision API using API Key.
 * With automatic failover!
 */
export async function analyzeMealPlateImage(
  base64Image: string,
  userApiKey?: string
): Promise<MealVisionResult> {
  console.log('====================================================');
  console.log('[AI Vision Step 1] Starting AI Plate Recognition...');
  console.log(`[AI Vision Step 1] Raw base64 length: ${base64Image ? base64Image.length : 0} characters`);

  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').trim();

  if (!cleanBase64) {
    console.error('[AI Vision Step 1 ERROR] Image base64 string is empty!');
    throw new Error('Image data is empty. Please select or take a photo again.');
  }

  const inAppKey = userApiKey?.trim();
  const envGeminiKey =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim() ||
    'AQ.Ab8RN6JYx8SCCc6JIN9uPWNj2ad2DuH8bpdK3Jg2eLJ9AYxAXg';
  const envOpenAiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY?.trim();

  console.log(`[AI Vision Step 2] In-App Key set: ${inAppKey ? 'YES (' + inAppKey.substring(0, 6) + '...)' : 'NO'}`);
  console.log(`[AI Vision Step 2] ENV Gemini Key set: ${envGeminiKey ? 'YES (' + envGeminiKey.substring(0, 6) + '...)' : 'NO'}`);
  console.log(`[AI Vision Step 2] ENV OpenAI Key set: ${envOpenAiKey ? 'YES (' + envOpenAiKey.substring(0, 6) + '...)' : 'NO'}`);

  // 1. Try Gemini Key first if available
  const geminiKey = inAppKey || envGeminiKey;
  if (geminiKey) {
    try {
      console.log('[AI Vision Step 2] Executing Google Gemini API Call...');
      return await callGeminiVisionAPI(cleanBase64, geminiKey);
    } catch (e: any) {
      console.warn('[AI Vision Step 2 Notice] Gemini API rate limit or error encountered:', e.message);
      // Fall through to OpenAI if OpenAI key exists
      if (envOpenAiKey) {
        console.log('[AI Vision Failover] Automatic failover to OpenAI GPT-4o Vision API...');
        return await callOpenAiVisionAPI(cleanBase64, envOpenAiKey);
      }
      throw e;
    }
  }

  // 2. Try OpenAI Key if available
  const openAiKey = inAppKey && inAppKey.startsWith('sk-') ? inAppKey : envOpenAiKey;
  if (openAiKey) {
    console.log('[AI Vision Step 2] Executing OpenAI GPT-4o Vision API Call...');
    return await callOpenAiVisionAPI(cleanBase64, openAiKey);
  }

  throw new Error(
    'Missing API Key! Please tap the 🔑 Key Icon at the top right of the Home screen and paste your Google Gemini Key (starts with AIzaSy...).'
  );
}
