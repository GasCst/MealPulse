/**
 * Food Database Service — Powered by Open Food Facts (3.3M+ Products)
 * Supports full multilingual live search, barcode lookup, and curated localized staple food library.
 */

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  portion: string;
  weightG: number;
  baseCalories?: number;
  baseProteinG?: number;
  baseCarbsG?: number;
  baseFatG?: number;
  baseWeightG?: number;
  emoji: string;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  potassiumMg?: number;
  calciumMg?: number;
  ironMg?: number;
  vitaminCMg?: number;
  vitaminDIU?: number;
  vitaminAIU?: number;
  vitaminB12Mcg?: number;
  magnesiumMg?: number;
  zincMg?: number;
  imageUrl?: string;
  barcode?: string;
  category?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

interface LocalizedBaseFood {
  id: string;
  emoji: string;
  calories: number;
  weightG: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  names: Record<string, { name: string; portion: string }>;
}

const BASE_FOODS_DATA: LocalizedBaseFood[] = [
  // Colazione / Breakfast
  {
    id: 'base_1',
    emoji: '🥚',
    calories: 140,
    weightG: 100,
    proteinG: 13,
    carbsG: 1,
    fatG: 10,
    category: 'breakfast',
    names: {
      it: { name: 'Uova Intere (2 uova medie)', portion: '2 uova (100g)' },
      en: { name: 'Whole Eggs (2 medium eggs)', portion: '2 eggs (100g)' },
      es: { name: 'Huevos Enteros (2 medianos)', portion: '2 huevos (100g)' },
      fr: { name: 'Œufs Entiers (2 moyens)', portion: '2 œufs (100g)' },
      de: { name: 'Ganze Eier (2 Stück)', portion: '2 Eier (100g)' },
    },
  },
  {
    id: 'base_2',
    emoji: '🥣',
    calories: 150,
    weightG: 40,
    proteinG: 5,
    carbsG: 27,
    fatG: 3,
    category: 'breakfast',
    names: {
      it: { name: "Fiocchi d'Avena (Porridge)", portion: '40g a crudo' },
      en: { name: 'Rolled Oats (Porridge)', portion: '40g dry' },
      es: { name: 'Copos de Avena', portion: '40g en seco' },
      fr: { name: "Flocons d'Avoine", portion: '40g crus' },
      de: { name: 'Haferflocken (Porridge)', portion: '40g trocken' },
    },
  },
  {
    id: 'base_3',
    emoji: '🥛',
    calories: 110,
    weightG: 170,
    proteinG: 18,
    carbsG: 6,
    fatG: 0,
    category: 'breakfast',
    names: {
      it: { name: 'Yogurt Greco 0% Grassi', portion: '1 vasetto (170g)' },
      en: { name: 'Greek Yogurt 0% Fat', portion: '1 tub (170g)' },
      es: { name: 'Yogur Griego 0% Grasa', portion: '1 tarrina (170g)' },
      fr: { name: 'Yaourt Grec 0% MG', portion: '1 pot (170g)' },
      de: { name: 'Griechischer Joghurt 0% Fett', portion: '1 Becher (170g)' },
    },
  },
  {
    id: 'base_4',
    emoji: '🥛',
    calories: 95,
    weightG: 200,
    proteinG: 7,
    carbsG: 10,
    fatG: 3,
    category: 'breakfast',
    names: {
      it: { name: 'Latte Parzialmente Scremato', portion: '1 tazza (200ml)' },
      en: { name: 'Semi-Skimmed Milk', portion: '1 cup (200ml)' },
      es: { name: 'Leche Semidesnatada', portion: '1 taza (200ml)' },
      fr: { name: 'Lait Demi-Écrémé', portion: '1 verre (200ml)' },
      de: { name: 'Fettarme Milch (1.5%)', portion: '1 Tasse (200ml)' },
    },
  },
  {
    id: 'base_5',
    emoji: '☕',
    calories: 2,
    weightG: 30,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    category: 'breakfast',
    names: {
      it: { name: 'Caffè Espresso (senza zucchero)', portion: '1 tazzina (30ml)' },
      en: { name: 'Espresso Coffee (no sugar)', portion: '1 cup (30ml)' },
      es: { name: 'Café Solo / Espresso', portion: '1 taza (30ml)' },
      fr: { name: 'Café Expresso (sans sucre)', portion: '1 tasse (30ml)' },
      de: { name: 'Espresso (ungesüßt)', portion: '1 Tasse (30ml)' },
    },
  },
  {
    id: 'base_6',
    emoji: '🍞',
    calories: 100,
    weightG: 27,
    proteinG: 3,
    carbsG: 20,
    fatG: 1,
    category: 'breakfast',
    names: {
      it: { name: 'Fette Biscottate Integrali (3 pz)', portion: '3 fette (27g)' },
      en: { name: 'Whole Wheat Rusks (3 pcs)', portion: '3 slices (27g)' },
      es: { name: 'Tostadas Integrales (3 uds)', portion: '3 tostadas (27g)' },
      fr: { name: 'Biscottes Complètes (3 pcs)', portion: '3 biscottes (27g)' },
      de: { name: 'Vollkorn-Zwieback (3 Stk)', portion: '3 Scheiben (27g)' },
    },
  },
  {
    id: 'base_7',
    emoji: '🍯',
    calories: 60,
    weightG: 20,
    proteinG: 0,
    carbsG: 16,
    fatG: 0,
    category: 'breakfast',
    names: {
      it: { name: 'Miele Naturale', portion: '1 cucchiaino (20g)' },
      en: { name: 'Pure Honey', portion: '1 teaspoon (20g)' },
      es: { name: 'Miel Pura', portion: '1 cucharadita (20g)' },
      fr: { name: 'Miel Pur', portion: '1 c. à café (20g)' },
      de: { name: 'Reiner Bienenhonig', portion: '1 TL (20g)' },
    },
  },
  {
    id: 'base_8',
    emoji: '🥜',
    calories: 120,
    weightG: 20,
    proteinG: 6,
    carbsG: 3,
    fatG: 10,
    category: 'breakfast',
    names: {
      it: { name: 'Burro di Arachidi 100%', portion: '1 cucchiaio (20g)' },
      en: { name: 'Peanut Butter 100%', portion: '1 tablespoon (20g)' },
      es: { name: 'Mantequilla de Cacahuete', portion: '1 cucharada (20g)' },
      fr: { name: "Beurre de Cacahuète 100%", portion: '1 c. à soupe (20g)' },
      de: { name: 'Erdnussbutter 100%', portion: '1 EL (20g)' },
    },
  },

  // Proteine / Carni / Pesce
  {
    id: 'base_9',
    emoji: '🍗',
    calories: 165,
    weightG: 150,
    proteinG: 35,
    carbsG: 0,
    fatG: 4,
    category: 'lunch',
    names: {
      it: { name: 'Petto di Pollo alla Griglia', portion: '1 fetta media (150g)' },
      en: { name: 'Grilled Chicken Breast', portion: '1 medium piece (150g)' },
      es: { name: 'Pechuga de Pollo a la Plancha', portion: '1 filete (150g)' },
      fr: { name: 'Blanc de Poulet Grillé', portion: '1 filet (150g)' },
      de: { name: 'Gegrillte Hähnchenbrust', portion: '1 Portion (150g)' },
    },
  },
  {
    id: 'base_10',
    emoji: '🐟',
    calories: 280,
    weightG: 140,
    proteinG: 28,
    carbsG: 0,
    fatG: 18,
    category: 'dinner',
    names: {
      it: { name: 'Filetto di Salmone al Forno', portion: '1 trancio (140g)' },
      en: { name: 'Baked Salmon Fillet', portion: '1 fillet (140g)' },
      es: { name: 'Filete de Salmón al Horno', portion: '1 lomo (140g)' },
      fr: { name: 'Pavé de Saumon Rôti', portion: '1 pavé (140g)' },
      de: { name: 'Lachsfilet aus dem Ofen', portion: '1 Filet (140g)' },
    },
  },
  {
    id: 'base_11',
    emoji: '🥩',
    calories: 240,
    weightG: 150,
    proteinG: 32,
    carbsG: 0,
    fatG: 12,
    category: 'dinner',
    names: {
      it: { name: 'Bistecca di Manzo / Filetto', portion: '1 porzione (150g)' },
      en: { name: 'Beef Steak / Fillet', portion: '1 steak (150g)' },
      es: { name: 'Filete de Ternera / Bistec', portion: '1 filete (150g)' },
      fr: { name: 'Steak de Bœuf Grillé', portion: '1 steak (150g)' },
      de: { name: 'Rindersteak / Filet', portion: '1 Steak (150g)' },
    },
  },
  {
    id: 'base_12',
    emoji: '🐟',
    calories: 110,
    weightG: 100,
    proteinG: 25,
    carbsG: 0,
    fatG: 1,
    category: 'lunch',
    names: {
      it: { name: 'Tonno al Naturale (Sgocciolato)', portion: '1 lattina (100g)' },
      en: { name: 'Canned Tuna in Water (Drained)', portion: '1 can (100g)' },
      es: { name: 'Atún al Natural (Escurrido)', portion: '1 lata (100g)' },
      fr: { name: 'Thon au Naturel (Égoutté)', portion: '1 boîte (100g)' },
      de: { name: 'Thunfisch im eigenen Saft', portion: '1 Dose (100g)' },
    },
  },
  {
    id: 'base_13',
    emoji: '🍳',
    calories: 50,
    weightG: 100,
    proteinG: 11,
    carbsG: 1,
    fatG: 0,
    category: 'breakfast',
    names: {
      it: { name: "Albumi d'Uovo", portion: '100g albumi' },
      en: { name: 'Liquid Egg Whites', portion: '100g egg whites' },
      es: { name: 'Claras de Huevo', portion: '100g claras' },
      fr: { name: "Blancs d'Œufs", portion: '100g blancs' },
      de: { name: 'Eiklar / Eiweiß', portion: '100g Eiklar' },
    },
  },

  // Primi Piatti & Carboidrati
  {
    id: 'base_14',
    emoji: '🍝',
    calories: 280,
    weightG: 80,
    proteinG: 10,
    carbsG: 58,
    fatG: 1,
    category: 'lunch',
    names: {
      it: { name: 'Pasta di Semola (Spaghetti / Penne / Farfalle)', portion: '80g a crudo' },
      en: { name: 'Semolina Pasta (Penne / Spaghetti / Farfalle)', portion: '80g dry' },
      es: { name: 'Pasta de Sémola (Pajaritas / Espaguetis)', portion: '80g en seco' },
      fr: { name: 'Pâtes de Semoule (Farfalle / Penne)', portion: '80g crues' },
      de: { name: 'Hartweizen-Nudeln (Penne / Farfalle)', portion: '80g trocken' },
    },
  },
  {
    id: 'base_15',
    emoji: '🍚',
    calories: 275,
    weightG: 80,
    proteinG: 6,
    carbsG: 62,
    fatG: 1,
    category: 'lunch',
    names: {
      it: { name: 'Riso Basmati / Bianco', portion: '80g a crudo' },
      en: { name: 'Basmati / Jasmine White Rice', portion: '80g dry' },
      es: { name: 'Arroz Basmati / Blanco', portion: '80g en seco' },
      fr: { name: 'Riz Basmati / Blanc', portion: '80g cru' },
      de: { name: 'Basmati-Reis / Weißer Reis', portion: '80g trocken' },
    },
  },
  {
    id: 'base_16',
    emoji: '🍞',
    calories: 150,
    weightG: 60,
    proteinG: 6,
    carbsG: 28,
    fatG: 2,
    category: 'lunch',
    names: {
      it: { name: 'Pane Integrale Fresco', portion: '2 fette (60g)' },
      en: { name: 'Whole Wheat Bread', portion: '2 slices (60g)' },
      es: { name: 'Pan Integral Fresco', portion: '2 rebanadas (60g)' },
      fr: { name: 'Pain Complet Frais', portion: '2 tranches (60g)' },
      de: { name: 'Frisches Vollkornbrot', portion: '2 Scheiben (60g)' },
    },
  },
  {
    id: 'base_17',
    emoji: '🍝',
    calories: 380,
    weightG: 250,
    proteinG: 12,
    carbsG: 70,
    fatG: 6,
    category: 'lunch',
    names: {
      it: { name: 'Pasta al Pomodoro & Basilico', portion: '1 piatto (250g)' },
      en: { name: 'Pasta with Tomato & Basil Sauce', portion: '1 bowl (250g)' },
      es: { name: 'Pasta con Tomate y Albahaca', portion: '1 plato (250g)' },
      fr: { name: 'Pâtes Sauce Tomate & Basilic', portion: '1 assiette (250g)' },
      de: { name: 'Pasta mit Tomaten-Basilikum-Sauce', portion: '1 Teller (250g)' },
    },
  },
  {
    id: 'base_18',
    emoji: '🍕',
    calories: 260,
    weightG: 120,
    proteinG: 10,
    carbsG: 34,
    fatG: 9,
    category: 'dinner',
    names: {
      it: { name: 'Pizza Margherita (1 trancio)', portion: '1 trancio (120g)' },
      en: { name: 'Margherita Pizza (1 slice)', portion: '1 slice (120g)' },
      es: { name: 'Pizza Margarita (1 porción)', portion: '1 porción (120g)' },
      fr: { name: 'Pizza Margherita (1 part)', portion: '1 part (120g)' },
      de: { name: 'Pizza Margherita (1 Stück)', portion: '1 Stück (120g)' },
    },
  },
  {
    id: 'base_19',
    emoji: '🥔',
    calories: 140,
    weightG: 180,
    proteinG: 3,
    carbsG: 32,
    fatG: 0,
    category: 'lunch',
    names: {
      it: { name: 'Patate Lesse / al Vapore', portion: '1 porzione (180g)' },
      en: { name: 'Boiled / Steamed Potatoes', portion: '1 portion (180g)' },
      es: { name: 'Patatas Cocidas', portion: '1 ración (180g)' },
      fr: { name: 'Pommes de Terre Vapeur', portion: '1 portion (180g)' },
      de: { name: 'Gekochte Kartoffeln', portion: '1 Portion (180g)' },
    },
  },

  // Grassi Sani
  {
    id: 'base_20',
    emoji: '🫒',
    calories: 90,
    weightG: 10,
    proteinG: 0,
    carbsG: 0,
    fatG: 10,
    category: 'lunch',
    names: {
      it: { name: "Olio Extravergine d'Oliva (EVO)", portion: '1 cucchiaio (10g)' },
      en: { name: 'Extra Virgin Olive Oil (EVOO)', portion: '1 tablespoon (10g)' },
      es: { name: 'Aceite de Oliva Virgen Extra (AOVE)', portion: '1 cucharada (10g)' },
      fr: { name: "Huile d'Olive Vierge Extra", portion: '1 c. à soupe (10g)' },
      de: { name: 'Natives Olivenöl Extra', portion: '1 EL (10g)' },
    },
  },
  {
    id: 'base_21',
    emoji: '🥑',
    calories: 160,
    weightG: 100,
    proteinG: 2,
    carbsG: 3,
    fatG: 15,
    category: 'lunch',
    names: {
      it: { name: 'Avocado Maturo', portion: 'Mezzo avocado (100g)' },
      en: { name: 'Ripe Avocado', portion: 'Half avocado (100g)' },
      es: { name: 'Aguacate Maduro', portion: 'Medio aguacate (100g)' },
      fr: { name: 'Avocat Mûr', portion: 'Demi avocat (100g)' },
      de: { name: 'Reife Avocado', portion: 'Halbe Avocado (100g)' },
    },
  },
  {
    id: 'base_22',
    emoji: '🥜',
    calories: 175,
    weightG: 30,
    proteinG: 6,
    carbsG: 4,
    fatG: 16,
    category: 'snack',
    names: {
      it: { name: 'Mandorle / Noci Sgusciate', portion: '1 pugnetto (30g)' },
      en: { name: 'Raw Almonds / Walnuts', portion: '1 handful (30g)' },
      es: { name: 'Almendras / Nueces Crudas', portion: '1 puñado (30g)' },
      fr: { name: 'Amandes / Noix Brutes', portion: '1 poignée (30g)' },
      de: { name: 'Mandeln / Walnüsse', portion: '1 Handvoll (30g)' },
    },
  },
  {
    id: 'base_23',
    emoji: '🧀',
    calories: 120,
    weightG: 30,
    proteinG: 10,
    carbsG: 0,
    fatG: 8,
    category: 'dinner',
    names: {
      it: { name: 'Parmigiano Reggiano / Grana DOP', portion: '1 porzione (30g)' },
      en: { name: 'Parmesan Cheese (Parmigiano)', portion: '1 portion (30g)' },
      es: { name: 'Queso Parmesano Curado', portion: '1 porción (30g)' },
      fr: { name: 'Parmesan Reggiano AOP', portion: '1 portion (30g)' },
      de: { name: 'Parmigiano Reggiano DOP', portion: '1 Portion (30g)' },
    },
  },

  // Frutta & Snack
  {
    id: 'base_24',
    emoji: '🍎',
    calories: 80,
    weightG: 150,
    proteinG: 0,
    carbsG: 19,
    fatG: 0,
    category: 'snack',
    names: {
      it: { name: 'Mela Fresca', portion: '1 frutto medio (150g)' },
      en: { name: 'Fresh Apple', portion: '1 medium fruit (150g)' },
      es: { name: 'Manzana Fresca', portion: '1 pieza mediana (150g)' },
      fr: { name: 'Pomme Fraîche', portion: '1 fruit moyen (150g)' },
      de: { name: 'Frischer Apfel', portion: '1 mittlerer Apfel (150g)' },
    },
  },
  {
    id: 'base_25',
    emoji: '🍌',
    calories: 105,
    weightG: 120,
    proteinG: 1,
    carbsG: 27,
    fatG: 0,
    category: 'snack',
    names: {
      it: { name: 'Banana Matura', portion: '1 frutto medio (120g)' },
      en: { name: 'Ripe Banana', portion: '1 medium banana (120g)' },
      es: { name: 'Plátano Maduro', portion: '1 plátano (120g)' },
      fr: { name: 'Banane Mûre', portion: '1 banane moyenne (120g)' },
      de: { name: 'Reife Banane', portion: '1 mittlere Banane (120g)' },
    },
  },
  {
    id: 'base_26',
    emoji: '🍓',
    calories: 50,
    weightG: 150,
    proteinG: 1,
    carbsG: 11,
    fatG: 0,
    category: 'snack',
    names: {
      it: { name: 'Fragole Fresche', portion: '1 tazza (150g)' },
      en: { name: 'Fresh Strawberries', portion: '1 cup (150g)' },
      es: { name: 'Fresas Frescas', portion: '1 taza (150g)' },
      fr: { name: 'Fraises Fraîches', portion: '1 bol (150g)' },
      de: { name: 'Frische Erdbeeren', portion: '1 Schale (150g)' },
    },
  },
  {
    id: 'base_27',
    emoji: '🍫',
    calories: 120,
    weightG: 20,
    proteinG: 2,
    carbsG: 6,
    fatG: 10,
    category: 'snack',
    names: {
      it: { name: 'Cioccolato Fondente 85%', portion: '2 quadratini (20g)' },
      en: { name: 'Dark Chocolate 85%', portion: '2 squares (20g)' },
      es: { name: 'Chocolate Negro 85%', portion: '2 onzas (20g)' },
      fr: { name: 'Chocolat Noir 85%', portion: '2 carrés (20g)' },
      de: { name: 'Dunkle Schokolade 85%', portion: '2 Stücke (20g)' },
    },
  },
  {
    id: 'base_28',
    emoji: '🥗',
    calories: 25,
    weightG: 150,
    proteinG: 2,
    carbsG: 4,
    fatG: 0,
    category: 'lunch',
    names: {
      it: { name: 'Insalata Mista Verde', portion: '1 porzione (150g)' },
      en: { name: 'Mixed Green Salad', portion: '1 bowl (150g)' },
      es: { name: 'Ensalada Mixta Verde', portion: '1 plato (150g)' },
      fr: { name: 'Salade Verte Composée', portion: '1 assiette (150g)' },
      de: { name: 'Gemischter Grüner Salat', portion: '1 Schale (150g)' },
    },
  },
];

export function getLocalizedPopularFoods(lang: string = 'it'): FoodItem[] {
  const normLang = (lang || 'it').toLowerCase().slice(0, 2);
  return BASE_FOODS_DATA.map((item) => {
    const loc = item.names[normLang] || item.names.en || item.names.it;
    return {
      id: item.id,
      name: loc.name,
      portion: loc.portion,
      calories: item.calories,
      weightG: item.weightG,
      baseCalories: item.calories,
      baseProteinG: item.proteinG,
      baseCarbsG: item.carbsG,
      baseFatG: item.fatG,
      baseWeightG: item.weightG,
      emoji: item.emoji,
      proteinG: item.proteinG,
      carbsG: item.carbsG,
      fatG: item.fatG,
      category: item.category,
    };
  });
}

export const POPULAR_BASE_FOODS: FoodItem[] = getLocalizedPopularFoods('it');

/**
 * Assigns an appropriate food emoji based on keywords
 */
export function getFoodEmojiFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('acqua') || lower.includes('water') || lower.includes('eau') || lower.includes('wasser') || lower.includes('minerale') || lower.includes('sorbello') || lower.includes('sant\'anna') || lower.includes('levissima')) return '💧';
  if (lower.includes('thé') || lower.includes('tea') || lower.includes('tisana')) return '🫖';
  if (lower.includes('coca') || lower.includes('pepsi') || lower.includes('soda') || lower.includes('bibita') || lower.includes('cola')) return '🥤';
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('penne') || lower.includes('farfalle') || lower.includes('fusilli') || lower.includes('tagliatelle') || lower.includes('macaroni') || lower.includes('riso') || lower.includes('rice') || lower.includes('noodle')) return '🍝';
  if (lower.includes('pollo') || lower.includes('chicken') || lower.includes('tacchino') || lower.includes('turkey') || lower.includes('poulet') || lower.includes('hähnchen')) return '🍗';
  if (lower.includes('carne') || lower.includes('bistecca') || lower.includes('manzo') || lower.includes('beef') || lower.includes('hamburger') || lower.includes('burger') || lower.includes('steak') || lower.includes('viande')) return '🥩';
  if (lower.includes('salmone') || lower.includes('salmon') || lower.includes('pesce') || lower.includes('fish') || lower.includes('tonno') || lower.includes('tuna') || lower.includes('saumon')) return '🐟';
  if (lower.includes('uov') || lower.includes('egg') || lower.includes('oeuf') || lower.includes('huevo') || lower.includes('eier')) return '🥚';
  if (lower.includes('insalata') || lower.includes('salad') || lower.includes('salat') || lower.includes('ensalada') || lower.includes('verdura')) return '🥗';
  if (lower.includes('pane') || lower.includes('bread') || lower.includes('toast') || lower.includes('fette') || lower.includes('pan') || lower.includes('brot')) return '🍞';
  if (lower.includes('mela') || lower.includes('apple') || lower.includes('manzana') || lower.includes('pomme') || lower.includes('apfel')) return '🍎';
  if (lower.includes('banana') || lower.includes('plátano') || lower.includes('banane')) return '🍌';
  if (lower.includes('avocado') || lower.includes('aguacate')) return '🥑';
  if (lower.includes('latte') || lower.includes('milk') || lower.includes('yogurt') || lower.includes('formaggio') || lower.includes('cheese') || lower.includes('lait') || lower.includes('leche') || lower.includes('milch')) return '🥛';
  if (lower.includes('caff') || lower.includes('coffee') || lower.includes('cappuccino') || lower.includes('café') || lower.includes('kaffee')) return '☕';
  if (lower.includes('cioccolato') || lower.includes('chocolate') || lower.includes('schokolade') || lower.includes('barretta')) return '🍫';
  if (lower.includes('biscott') || lower.includes('cookie') || lower.includes('keks') || lower.includes('galleta') || lower.includes('baiocchi') || lower.includes('gocciole')) return '🍪';
  if (lower.includes('dolce') || lower.includes('cake') || lower.includes('torta') || lower.includes('kuchen') || lower.includes('gâteau')) return '🍰';
  if (lower.includes('croissant') || lower.includes('cornetto') || lower.includes('brioche')) return '🥐';
  if (lower.includes('arancia') || lower.includes('orange') || lower.includes('succo') || lower.includes('juice') || lower.includes('jus')) return '🍊';
  if (lower.includes('frutta') || lower.includes('fruit') || lower.includes('mirtilli') || lower.includes('fragole') || lower.includes('fresa') || lower.includes('erdbeere')) return '🍓';
  if (lower.includes('patat') || lower.includes('potato') || lower.includes('fries') || lower.includes('kartoffel')) return '🍟';
  if (lower.includes('snack') || lower.includes('popcorn') || lower.includes('patatine') || lower.includes('chips')) return '🍿';
  return '🍽️';
}

export class FoodDatabaseService {
  private static searchCache = new Map<string, FoodItem[]>();
  private static barcodeCache = new Map<string, FoodItem>();

  /**
   * Helper to parse and normalize OpenFoodFacts product payloads from both
   * search-a-licious (hits) and CGI/API v2 (products).
   */
  private static parseOffProduct(p: any, normLang: string, cleanQuery: string): FoodItem | null {
    if (!p || typeof p !== 'object') return null;

    const nutriments = p.nutriments || {};

    // 1. Calculate energy in kcal (per 100g, or per serving, or converted from kJ)
    let rawKcal =
      nutriments['energy-kcal_100g'] ??
      nutriments['energy-kcal_serving'] ??
      nutriments['energy-kcal'] ??
      nutriments['energy-kcal_value'];

    if (rawKcal == null) {
      if (nutriments['energy-kj_100g']) {
        rawKcal = nutriments['energy-kj_100g'] / 4.184;
      } else if (nutriments['energy_100g']) {
        rawKcal = nutriments['energy_100g'] / 4.184;
      } else {
        rawKcal = 0;
      }
    }
    let kcal = Math.max(0, Math.round(rawKcal));

    // 2. Localized product name
    let localizedName = '';
    if (normLang === 'it') {
      localizedName = p.product_name_it || p.product_name || p.generic_name_it || p.product_name_en || p.generic_name;
    } else if (normLang === 'es') {
      localizedName = p.product_name_es || p.product_name || p.generic_name_es || p.product_name_en || p.generic_name;
    } else if (normLang === 'fr') {
      localizedName = p.product_name_fr || p.product_name || p.generic_name_fr || p.product_name_en || p.generic_name;
    } else if (normLang === 'de') {
      localizedName = p.product_name_de || p.product_name || p.generic_name_de || p.product_name_en || p.generic_name;
    } else {
      localizedName = p.product_name_en || p.product_name || p.generic_name_en || p.generic_name;
    }

    if (!localizedName || typeof localizedName !== 'string' || localizedName.trim().length === 0) {
      localizedName = p.product_name || p.generic_name || cleanQuery;
    }
    localizedName = (localizedName || '').trim();

    // Must have a valid name
    if (!localizedName || localizedName.length < 2) {
      return null;
    }

    // 3. Brands
    let brandName = '';
    if (Array.isArray(p.brands)) {
      brandName = p.brands.filter(Boolean).map((b: string) => String(b).trim()).join(', ');
    } else if (typeof p.brands === 'string') {
      brandName = p.brands.trim();
    } else if (p.brand_owner && typeof p.brand_owner === 'string') {
      brandName = p.brand_owner.trim();
    }

    const protein = Math.max(0, Math.round(nutriments.proteins_100g ?? nutriments.proteins_serving ?? nutriments.proteins ?? 0));
    const carbs = Math.max(0, Math.round(nutriments.carbohydrates_100g ?? nutriments.carbohydrates_serving ?? nutriments.carbohydrates ?? 0));
    const fat = Math.max(0, Math.round(nutriments.fat_100g ?? nutriments.fat_serving ?? nutriments.fat ?? 0));
    const serving = (p.serving_size && typeof p.serving_size === 'string' && p.serving_size.trim()) || (p.quantity && typeof p.quantity === 'string' && p.quantity.trim()) || '100g';
    const image = p.image_front_small_url || p.image_small_url || p.image_front_url || p.image_url || undefined;

    // Auto-calculate kcal if macros are present but energy was 0
    if (kcal <= 0 && (protein > 0 || carbs > 0 || fat > 0)) {
      kcal = Math.round(protein * 4 + carbs * 4 + fat * 9);
    }

    const code = p.code ? String(p.code).trim() : '';

    // Micronutrient extraction from OpenFoodFacts
    const fiber = nutriments.fiber_100g !== undefined || nutriments.fiber_serving !== undefined
      ? Math.max(0, Math.round((nutriments.fiber_100g ?? nutriments.fiber_serving ?? 0) * 10) / 10)
      : undefined;
    const sugars = nutriments.sugars_100g !== undefined || nutriments.sugars_serving !== undefined
      ? Math.max(0, Math.round((nutriments.sugars_100g ?? nutriments.sugars_serving ?? 0) * 10) / 10)
      : undefined;
    const satFat = nutriments['saturated-fat_100g'] !== undefined || nutriments['saturated-fat_serving'] !== undefined
      ? Math.max(0, Math.round((nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat_serving'] ?? 0) * 10) / 10)
      : undefined;
    const sodium = nutriments.sodium_100g !== undefined || nutriments.salt_100g !== undefined
      ? Math.max(0, Math.round((nutriments.sodium_100g ?? (nutriments.salt_100g ? nutriments.salt_100g * 400 : 0)) * 1000) / 1000)
      : undefined;
    const potassium = nutriments.potassium_100g !== undefined
      ? Math.max(0, Math.round(nutriments.potassium_100g))
      : undefined;
    const calcium = nutriments.calcium_100g !== undefined
      ? Math.max(0, Math.round(nutriments.calcium_100g))
      : undefined;
    const iron = nutriments.iron_100g !== undefined
      ? Math.max(0, Math.round(nutriments.iron_100g * 10) / 10)
      : undefined;
    const vitC = nutriments['vitamin-c_100g'] !== undefined
      ? Math.max(0, Math.round(nutriments['vitamin-c_100g'] * 10) / 10)
      : undefined;
    const vitD = nutriments['vitamin-d_100g'] !== undefined
      ? Math.max(0, Math.round(nutriments['vitamin-d_100g']))
      : undefined;
    const vitA = nutriments['vitamin-a_100g'] !== undefined
      ? Math.max(0, Math.round(nutriments['vitamin-a_100g']))
      : undefined;
    const vitB12 = nutriments['vitamin-b12_100g'] !== undefined
      ? Math.max(0, Math.round(nutriments['vitamin-b12_100g'] * 10) / 10)
      : undefined;
    const magnesium = nutriments.magnesium_100g !== undefined
      ? Math.max(0, Math.round(nutriments.magnesium_100g))
      : undefined;
    const zinc = nutriments.zinc_100g !== undefined
      ? Math.max(0, Math.round(nutriments.zinc_100g * 10) / 10)
      : undefined;

    return {
      id: `off_${code || Math.random().toString(36).substring(2, 9)}`,
      name: localizedName.length > 60 ? localizedName.substring(0, 58) + '...' : localizedName,
      brand: brandName.length > 35 ? brandName.substring(0, 32) + '...' : brandName,
      calories: kcal,
      portion: serving,
      weightG: 100,
      baseCalories: kcal,
      baseProteinG: protein,
      baseCarbsG: carbs,
      baseFatG: fat,
      baseWeightG: 100,
      emoji: getFoodEmojiFromName(localizedName),
      proteinG: protein,
      carbsG: carbs,
      fatG: fat,
      fiberG: fiber,
      sugarG: sugars,
      saturatedFatG: satFat,
      sodiumMg: sodium,
      potassiumMg: potassium,
      calciumMg: calcium,
      ironMg: iron,
      vitaminCMg: vitC,
      vitaminDIU: vitD,
      vitaminAIU: vitA,
      vitaminB12Mcg: vitB12,
      magnesiumMg: magnesium,
      zincMg: zinc,
      imageUrl: image,
      barcode: code || undefined,
    };
  }

  /**
   * Fast offline search across pre-loaded staples library
   */
  static getLocalMatches(query: string, language: string = 'it'): FoodItem[] {
    const cleanQuery = query.trim().toLowerCase();
    const normLang = (language || 'it').toLowerCase().slice(0, 2);
    const baseFoods = getLocalizedPopularFoods(normLang);

    if (!cleanQuery) return baseFoods;

    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    return baseFoods.filter((item) => {
      const name = item.name.toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      return tokens.every((tok) => name.includes(tok) || brand.includes(tok));
    });
  }

  /**
   * Resilient, multi-tier full-text search combining Search-a-licious and production OFF CGI endpoints
   * with automatic fallback, deduplication, and intelligent relevance ranking.
   */
  static async searchFoods(query: string, language: string = 'it'): Promise<FoodItem[]> {
    const cleanQuery = query.trim().toLowerCase();
    const normLang = (language || 'it').toLowerCase().slice(0, 2);

    if (!cleanQuery) {
      return getLocalizedPopularFoods(normLang);
    }

    const cacheKey = `${normLang}_${cleanQuery}`;
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const offlineMatches = this.getLocalMatches(cleanQuery, normLang);
    const liveItems: FoodItem[] = [];
    const seenBarcodes = new Set<string>();
    const seenNames = new Set<string>();

    const headers = {
      'User-Agent': 'MealPulse/1.0 (Android; info@mealpulse.app)',
      'Accept': 'application/json',
    };

    // Helper to add items without duplicates
    const addValidItems = (items: any[]) => {
      for (const raw of items) {
        const parsed = this.parseOffProduct(raw, normLang, cleanQuery);
        if (!parsed) continue;

        if (parsed.barcode && seenBarcodes.has(parsed.barcode)) continue;
        const nameKey = `${parsed.name.toLowerCase()}_${(parsed.brand || '').toLowerCase()}`;
        if (seenNames.has(nameKey)) continue;

        if (parsed.barcode) seenBarcodes.add(parsed.barcode);
        seenNames.add(nameKey);
        liveItems.push(parsed);
      }
    };

    // --- Tier 1: Search-a-licious (Elasticsearch Engine for Open Food Facts) ---
    try {
      const searchUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(cleanQuery)}&lang=${normLang}&page_size=40`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2600);

      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.hits)) {
          addValidItems(data.hits);
        }
      }
    } catch (e) {
      // Tier 1 timeout/failure handled silently -> proceeds to Tier 2
    }

    // --- Tier 2: Country CGI Endpoint (Rock-solid fallback or enhancement) ---
    if (liveItems.length < 6) {
      try {
        const cgiUrl = `https://${normLang}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=40&lc=${normLang}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(cgiUrl, {
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            addValidItems(data.products);
          }
        }
      } catch (e) {
        // Tier 2 error handled -> proceeds to Tier 3 if empty
      }
    }

    // --- Tier 3: World CGI Endpoint (Global fallback if country returned 0) ---
    if (liveItems.length === 0 && normLang !== 'en') {
      try {
        const worldCgiUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=40`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const res = await fetch(worldCgiUrl, {
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            addValidItems(data.products);
          }
        }
      } catch (e) {
        // Tier 3 failure handled
      }
    }

    // Relevance Ranking:
    // Boost exact matches, startsWith, brand matches, and items with images
    liveItems.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aBrand = (a.brand || '').toLowerCase();
      const bBrand = (b.brand || '').toLowerCase();

      let aScore = 0;
      let bScore = 0;

      if (aName === cleanQuery) aScore += 100;
      if (bName === cleanQuery) bScore += 100;

      if (aName.startsWith(cleanQuery)) aScore += 40;
      if (bName.startsWith(cleanQuery)) bScore += 40;

      if (aName.includes(cleanQuery)) aScore += 20;
      if (bName.includes(cleanQuery)) bScore += 20;

      if (aBrand.includes(cleanQuery)) aScore += 15;
      if (bBrand.includes(cleanQuery)) bScore += 15;

      if (a.imageUrl) aScore += 5;
      if (b.imageUrl) bScore += 5;

      return bScore - aScore;
    });

    const finalResults = this.mergeSearchResults(offlineMatches, liveItems);

    if (finalResults.length > 0) {
      this.searchCache.set(cacheKey, finalResults);
    }

    return finalResults;
  }

  /**
   * Barcode scanner lookup with multi-endpoint fallback across Open Food Facts (3.3M products)
   */
  static async fetchFoodByBarcode(barcode: string, language: string = 'it'): Promise<FoodItem | null> {
    const cleanCode = barcode.trim();
    if (!cleanCode) return null;

    const normLang = (language || 'it').toLowerCase().slice(0, 2);
    const cacheKey = `${normLang}_${cleanCode}`;

    if (this.barcodeCache.has(cacheKey)) {
      return this.barcodeCache.get(cacheKey)!;
    }

    const endpoints = [
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      `https://${normLang}.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanCode)}.json`,
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(cleanCode)}.json`,
      `https://${normLang}.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
      `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(cleanCode)}.json`,
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'MealPulse/1.0 (Android; info@mealpulse.app)',
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue;

        const data = await res.json();
        if (data.status === 1 && data.product) {
          const item = this.parseOffProduct(data.product, normLang, cleanCode);
          if (item) {
            item.barcode = cleanCode;
            this.barcodeCache.set(cacheKey, item);
            return item;
          }
        }
      } catch (err) {
        // Try next endpoint in loop
      }
    }

    return null;
  }

  private static mergeSearchResults(offline: FoodItem[], live: FoodItem[]): FoodItem[] {
    if (live.length === 0) return offline;
    if (offline.length === 0) return live;

    const combined: FoodItem[] = [];
    const seenNames = new Set<string>();

    // Put top live matches first (so users get live products like 'Pan di Stelle' right away)
    for (const item of live) {
      const key = `${item.name.toLowerCase()}_${(item.brand || '').toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    // Append offline staples that aren't already included
    for (const item of offline) {
      const key = `${item.name.toLowerCase()}_${(item.brand || '').toLowerCase()}`;
      if (!seenNames.has(key)) {
        seenNames.add(key);
        combined.push(item);
      }
    }

    return combined;
  }
}
