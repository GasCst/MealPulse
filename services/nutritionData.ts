import type { FoodItem } from './foodDatabaseService';
/** Nutrition values are measurements from a source, never proof of label accuracy. */
export interface NutritionInfo {
  version: 1;
  source: 'open_food_facts' | 'ai_estimate' | 'local_estimate' | 'manual' | 'user_label';
  referenceUnit: 'g' | 'ml';
  barcode?: string;
  sourceUrl?: string;
  labelImageUrl?: string;
  updatedAt?: string;
  warnings?: string[];
}

export interface MacroValues { calories: number; proteinG: number; carbsG: number; fatG: number }
export interface ExtraNutrients {
  fiberG?: number; sugarG?: number; saturatedFatG?: number; saltG?: number;
  sodiumMg?: number; potassiumMg?: number; calciumMg?: number; ironMg?: number;
  magnesiumMg?: number; zincMg?: number; vitaminCMg?: number;
  vitaminDIU?: number; vitaminAMcg?: number; vitaminAIU?: number; vitaminB12Mcg?: number;
}
export const EXTRA_NUTRIENT_KEYS: (keyof ExtraNutrients)[] = [
  'fiberG', 'sugarG', 'saturatedFatG', 'saltG', 'sodiumMg', 'potassiumMg', 'calciumMg',
  'ironMg', 'magnesiumMg', 'zincMg', 'vitaminCMg', 'vitaminDIU', 'vitaminAMcg', 'vitaminAIU', 'vitaminB12Mcg',
];

/** Reject empty, negative, nonfinite and partially parsed inputs; accept Italian decimal commas. */
export function nutritionNumber(value: unknown): number | undefined {
  if (typeof value === 'string') {
    const text = value.trim().replace(',', '.');
    if (!/^\d+(?:\.\d+)?$/.test(text)) return undefined;
    value = Number(text);
  }
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}
export const roundNutrition = (value: number) => Math.round(value * 1000) / 1000;

export function plausibleMacros(values: MacroValues, unit: 'g' | 'ml'): boolean {
  const { calories, proteinG, carbsG, fatG } = values;
  return [calories, proteinG, carbsG, fatG].every(value => nutritionNumber(value) !== undefined) &&
    calories <= 1000 && (unit === 'ml' || (proteinG <= 100 && carbsG <= 100 && fatG <= 100 && proteinG + carbsG + fatG <= 110));
}

export function scaleExtras(values: ExtraNutrients, ratio: number): ExtraNutrients {
  return Object.fromEntries(EXTRA_NUTRIENT_KEYS.map(key => {
    const n = nutritionNumber(values[key]);
    return [key, n === undefined ? undefined : roundNutrition(n * ratio)];
  }));
}

/** Micros already describe food.weightG; macros may also carry a pristine base. */
export function scaleFoodPortion(food: FoodItem, quantity: number): FoodItem {
  const weight = Math.max(0.1, quantity);
  const base = food.baseWeightG || food.weightG || 100;
  const macroRatio = weight / base;
  return {
    ...food, ...scaleExtras(food, weight / (food.weightG || base)), weightG: weight,
    portion: `${weight} ${food.nutrition?.referenceUnit || 'g'}`,
    calories: Math.round((food.baseCalories ?? food.calories) * macroRatio),
    proteinG: roundNutrition((food.baseProteinG ?? food.proteinG) * macroRatio),
    carbsG: roundNutrition((food.baseCarbsG ?? food.carbsG) * macroRatio),
    fatG: roundNutrition((food.baseFatG ?? food.fatG) * macroRatio),
    baseWeightG: base, baseCalories: food.baseCalories ?? food.calories,
    baseProteinG: food.baseProteinG ?? food.proteinG, baseCarbsG: food.baseCarbsG ?? food.carbsG,
    baseFatG: food.baseFatG ?? food.fatG,
  };
}

export function correctFoodLabel(food: FoodItem, values: MacroValues & ExtraNutrients, nutrition: NutritionInfo): FoodItem {
  return scaleFoodPortion({
    ...food, ...scaleExtras({}, 1), ...values, nutrition, weightG: 100, baseWeightG: 100,
    baseCalories: values.calories, baseProteinG: values.proteinG, baseCarbsG: values.carbsG, baseFatG: values.fatG,
  }, food.weightG);
}

/** OFF *_100g and *_serving fields are normalized to grams (energy: kcal/kJ).
 * *_value fields retain the contributor's unit and must not be mixed with them.
 * Source: Product Opener API schema and lib/ProductOpener/Food.pm. */
export function readOffNutrition(product: any): (MacroValues & ExtraNutrients & { nutrition: NutritionInfo }) | null {
  const n = product?.nutriments;
  if (!n || product.no_nutrition_data === 'on') return null;
  const warnings: string[] = [];
  const servingText = String(product.serving_size || '');
  const servingMatch = servingText.match(/(\d+(?:[.,]\d+)?)\s*(kg|mg|g|ml|cl|l)\b/i);
  const servingUnit = servingMatch?.[2]?.toLowerCase();
  const isVolume = /ml/i.test(String(product.nutrition_data_per || '')) ||
    ['ml', 'cl', 'l'].includes(servingUnit || '') ||
    (!servingUnit && (['ml', 'cl', 'l'].includes(String(product.product_quantity_unit || '').toLowerCase()) ||
      /\d\s*(ml|cl|l|lt|litres?|liters?|gal|gallons?|quarts?|pints?|fl\s*oz)\b/i.test(String(product.quantity || ''))));
  const referenceUnit = isVolume ? 'ml' : 'g';
  const unitFactor: Record<string, number> = { kg: 1000, mg: 0.001, g: 1, ml: 1, cl: 10, l: 1000 };
  const servingQuantity = servingMatch
    ? nutritionNumber(servingMatch[1])! * unitFactor[servingUnit!]
    : undefined;
  // A naked serving_quantity may be grams OR ml. Without the unit it is ambiguous.
  const read = (key: string): number | undefined => {
    if (n[`${key}_100g`] !== undefined && nutritionNumber(n[`${key}_100g`]) === undefined) return undefined;
    const per100 = nutritionNumber(n[`${key}_100g`]);
    if (per100 !== undefined) {
      if (!isVolume && !key.startsWith('energy') && per100 > 100) { warnings.push('nutrient_range'); return undefined; }
      return per100;
    }
    const perServing = nutritionNumber(n[`${key}_serving`]);
    if (perServing !== undefined && servingQuantity && servingQuantity > 0) {
      return perServing * 100 / servingQuantity;
    }
    const base = nutritionNumber(n[key]);
    if (base === undefined) return undefined;
    if (product.nutrition_data_per === '100g' || product.nutrition_data_per === '100ml') return base;
    if (product.nutrition_data_per === 'serving' && servingQuantity && servingQuantity > 0) return base * 100 / servingQuantity;
    return undefined;
  };
  let calories = read('energy-kcal');
  const kj = read('energy-kj') ?? read('energy');
  if (calories === undefined && kj !== undefined) calories = kj / 4.184;
  const proteinG = read('proteins'), carbsG = read('carbohydrates'), fatG = read('fat');
  // Incomplete products cannot be logged as if unknown macros were zero.
  if (calories === undefined || proteinG === undefined || carbsG === undefined || fatG === undefined) return null;
  if (!plausibleMacros({ calories, proteinG, carbsG, fatG }, referenceUnit)) return null;
  if (kj !== undefined && Math.abs(calories - kj / 4.184) > Math.max(10, calories * 0.1)) warnings.push('energy_conflict');
  const macroEnergy = 4 * proteinG + 4 * carbsG + 9 * fatG;
  // Fiber, alcohol and polyols change this relationship: warn, never overwrite label energy.
  if (Math.abs(calories - macroEnergy) > Math.max(40, calories * 0.35)) warnings.push('energy_macros');
  const extras: ExtraNutrients = {};
  const set = (key: keyof ExtraNutrients, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) extras[key] = roundNutrition(value);
  };
  set('fiberG', read('fiber'));
  const sugar = read('sugars'), saturated = read('saturated-fat');
  if (sugar !== undefined && sugar > carbsG + 0.5) warnings.push('sugars_conflict');
  else set('sugarG', sugar);
  if (saturated !== undefined && saturated > fatG + 0.5) warnings.push('fat_conflict');
  else set('saturatedFatG', saturated);
  const sodium = read('sodium'), salt = read('salt');
  if (sodium !== undefined && salt !== undefined && Math.abs(sodium - salt / 2.5) > Math.max(0.05, sodium * 0.1)) warnings.push('salt_conflict');
  set('sodiumMg', sodium !== undefined ? sodium * 1000 : salt !== undefined ? salt * 400 : undefined);
  set('saltG', salt !== undefined ? salt : sodium !== undefined ? sodium * 2.5 : undefined);
  for (const [off, app] of Object.entries({ potassium: 'potassiumMg', calcium: 'calciumMg', iron: 'ironMg', magnesium: 'magnesiumMg', zinc: 'zincMg', 'vitamin-c': 'vitaminCMg' })) {
    const value = read(off);
    set(app as keyof ExtraNutrients, value === undefined ? undefined : value * 1000);
  }
  const b12 = read('vitamin-b12'), d = read('vitamin-d'), a = read('vitamin-a');
  set('vitaminB12Mcg', b12 === undefined ? undefined : b12 * 1e6);
  set('vitaminDIU', d === undefined ? undefined : d * 1e6 * 40);
  // Vitamin A is expressed as µg; IU depends on the chemical form. Do not guess it.
  set('vitaminAMcg', a === undefined ? undefined : a * 1e6);
  const qualityTags = product.data_quality_errors_tags || [];
  if (Array.isArray(qualityTags) && qualityTags.some((tag: string) => /nutrition|nutriment|energy/i.test(tag))) warnings.push('database_quality');
  if (Object.keys(n).some(key => key.endsWith('_modifier') && n[key] === '<')) warnings.push('less_than');
  const code = String(product.code || '').trim();
  const timestamp = nutritionNumber(product.last_modified_t);
  return {
    calories: Math.round(calories), proteinG: roundNutrition(proteinG), carbsG: roundNutrition(carbsG), fatG: roundNutrition(fatG), ...extras,
    nutrition: {
      version: 1, source: 'open_food_facts', referenceUnit, barcode: code || undefined,
      sourceUrl: code ? `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}` : undefined,
      labelImageUrl: product.image_nutrition_url || product.image_nutrition_small_url || undefined,
      updatedAt: timestamp !== undefined && timestamp < 8e12 ? new Date(timestamp * 1000).toISOString() : undefined,
      warnings: [...new Set(warnings)],
    },
  };
}
