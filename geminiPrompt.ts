/**
 * MealPulse AI — Gemini Vision Food Roast & Nutrition Engine
 * System instructions, structured JSON schema, and execution prompt for viral TTS narration.
 */

export type HealthGrade = 'junk' | 'poor' | 'balanced' | 'super_clean';

export interface MealMacros {
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  sugars_g: number;
}

export interface GeminiMealRoastResponse {
  meal_name: string;
  estimated_calories: number;
  macros: MealMacros;
  health_grade: HealthGrade;
  roast_speech: string;
}

/**
 * System Instructions for Google Gemini Vision
 * Configured for viral Italian humor, Gordon Ramsay / Carrot Weather sarcasm,
 * and 100% compliant with Google Play / Apple App Store safety policies.
 */
export const GEMINI_ROAST_SYSTEM_INSTRUCTION = `
Sei l'arbitro nutrizionale e lo chef satirico supremo di MealPulse AI.
Il tuo compito è analizzare la foto del piatto fornita dall'utente, stimare le calorie e i macronutrienti con la massima accuratezza visiva e generare una battuta pungente ed esilarante ('roast_speech') in lingua italiana, destinata a essere recitata da una voce Text-To-Speech.

================================================================================
CRITICAL POLICY & STORE SAFETY DIRECTIVES (ZERO TOLERANCE)
================================================================================
1. DIVIETO ASSOLUTO DI BODY-SHAMING:
   - NON fare mai battute sul corpo dell'utente, sul suo peso, sulla sua forma fisica, sul suo metabolismo o sul suo aspetto.
   - NON fare riferimenti a taglie, chili di troppo o estetica della persona.
   - Il bersaglio della presa in giro è ESCLUSIVAMENTE e UNICAMENTE IL CIBO / LA PIETANZA.

2. STILE COMICO & VIRALITÀ (Gordon Ramsay incontra Carrot Weather):
   - Se il cibo è 'junk' o 'poor' (fritto, unto, zeppo di zuccheri raffinati, pizza iper-condita, fast food, dolci industriali):
     Distruggi satiricamente la pietanza. Esagera le sue qualità discutibili ("Questo piatto ha abbastanza olio da richiedere un intervento della marina militare", "Questa pasta è così stracotta che sta chiedendo asilo politico").
   - Se il cibo è 'balanced' o 'super_clean' (pollo e broccoli, insalate fresche, avena e frutta, salmone e riso integrale):
     Congratulati con sarcasmo bonario ("Un piatto così salutare che persino il tuo fegato ti sta mandando una lettera di ringraziamento, ma attento a non morire di noia").
   - Lunghezza: Massima brevità ed efficacia (1-2 frasi al massimo, ideale per clip vocale TikTok/Reels di 4-8 secondi).
   - Lingua: Italiano colloquiale, brillante, naturale, senza formule robotiche o convenevoli.

================================================================================
FORMATO DI RISPOSTA (STRICT JSON ONLY)
================================================================================
Restituisci SOLO un oggetto JSON valido, senza blocchi markdown (nessun \`\`\`json), conforme a questa struttura:
{
  "meal_name": "Nome descrittivo del piatto in italiano",
  "estimated_calories": 550,
  "macros": {
    "proteins_g": 32,
    "carbs_g": 48,
    "fats_g": 18,
    "sugars_g": 6
  },
  "health_grade": "junk" | "poor" | "balanced" | "super_clean",
  "roast_speech": "Frase comica pronta per il TTS vocale in italiano."
}
`;

/**
 * Prompt utente inviato assieme all'immagine del piatto
 */
export const GEMINI_ROAST_USER_PROMPT = `
Analizza l'immagine di questo piatto di cibo.
1. Identifica ingredienti e porzioni stimate.
2. Calcola calorie totali, proteine, carboidrati, grassi e zuccheri (tutti in grammi).
3. Assegna il health_grade tra:
   - "junk": cibo spazzatura, fritti pesanti, bombe caloriche ultra-processate.
   - "poor": cibo sbilanciato con troppi grassi saturi o zuccheri.
   - "balanced": pasto equilibrato con nutrienti variegati.
   - "super_clean": pasto salutare ad alto valore nutrizionale, cibi integrali non processati.
4. Scrivi il 'roast_speech' in italiano comico e pungente, seguendo rigidamente le policy (distruggi la pietanza, nessun insulto all'utente).
Restituisci esclusivamente il JSON.
`;

/**
 * Schema JSON strutturato compatibile con responseSchema di Gemini API
 */
export const GEMINI_ROAST_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    meal_name: { type: "STRING" },
    estimated_calories: { type: "NUMBER" },
    macros: {
      type: "OBJECT",
      properties: {
        proteins_g: { type: "NUMBER" },
        carbs_g: { type: "NUMBER" },
        fats_g: { type: "NUMBER" },
        sugars_g: { type: "NUMBER" }
      },
      required: ["proteins_g", "carbs_g", "fats_g", "sugars_g"]
    },
    health_grade: {
      type: "STRING",
      enum: ["junk", "poor", "balanced", "super_clean"]
    },
    roast_speech: { type: "STRING" }
  },
  required: ["meal_name", "estimated_calories", "macros", "health_grade", "roast_speech"]
};

/**
 * Funzione client helper per invocare Google Gemini 1.5 Flash / 2.0 con l'immagine Base64
 */
export async function analyzeMealAndGenerateRoast(
  base64Image: string,
  apiKey?: string
): Promise<GeminiMealRoastResponse> {
  const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '').trim();
  const effectiveKey = apiKey?.trim() || process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim();

  if (!effectiveKey) {
    throw new Error("Chiave API Google Gemini mancante (EXPO_PUBLIC_GEMINI_API_KEY).");
  }

  // Modello Gemini ad alta velocità multimodale
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${effectiveKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: GEMINI_ROAST_SYSTEM_INSTRUCTION }]
    },
    contents: [
      {
        parts: [
          { text: GEMINI_ROAST_USER_PROMPT },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      response_mime_type: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Errore Gemini Vision (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText) {
    throw new Error("Nessuna risposta generata da Gemini per il piatto.");
  }

  // Pulizia robusta di markdown fence prima del parse
  const sanitized = candidateText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```$/g, '')
    .trim();

  const parsed: GeminiMealRoastResponse = JSON.parse(sanitized);
  return parsed;
}
