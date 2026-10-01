import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExtraNutrients, MacroValues, NutritionInfo, nutritionNumber, scaleExtras } from './nutritionData';
import type { FoodItem } from './foodDatabaseService';

export type LabelNutrition = MacroValues & ExtraNutrients;
const storageKey = (barcode: string) => `@mealpulse_product_label_v1_${barcode}`;

/** Private label corrections apply only to an exact barcode, never to a brand/name match. */
export async function saveProductLabel(barcode: string | undefined, values: LabelNutrition, referenceUnit: 'g' | 'ml') {
  if (!barcode || !/^\d{8,14}$/.test(barcode)) return;
  await AsyncStorage.setItem(storageKey(barcode), JSON.stringify({ values, referenceUnit, savedAt: new Date().toISOString() }));
}

export async function applyProductLabel(food: FoodItem): Promise<FoodItem> {
  if (!food.barcode || !/^\d{8,14}$/.test(food.barcode)) return food;
  try {
    const raw = await AsyncStorage.getItem(storageKey(food.barcode));
    if (!raw) return food;
    const saved = JSON.parse(raw);
    if (!saved.values || !['g', 'ml'].includes(saved.referenceUnit) ||
      ['calories', 'proteinG', 'carbsG', 'fatG'].some(key => nutritionNumber(saved.values[key]) === undefined)) return food;
    const nutrition: NutritionInfo = { ...food.nutrition, version: 1, source: 'user_label', referenceUnit: saved.referenceUnit, barcode: food.barcode, updatedAt: saved.savedAt, warnings: [] };
    return {
      ...food, ...scaleExtras({}, 1), ...saved.values, nutrition, weightG: 100, baseWeightG: 100,
      portion: `100 ${saved.referenceUnit}`, baseCalories: saved.values.calories,
      baseProteinG: saved.values.proteinG, baseCarbsG: saved.values.carbsG, baseFatG: saved.values.fatG,
    };
  } catch { return food; }
}
