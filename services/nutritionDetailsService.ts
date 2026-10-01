import { ExtraNutrients, nutritionNumber, roundNutrition } from './nutritionData';

export interface DetailedNutrients extends ExtraNutrients {
  calories: number; proteinG: number; carbsG: number; fatG: number; weightG: number;
}

export class NutritionDetailsService {
  /** Missing micronutrients stay unknown. No estimates based on the food's name. */
  static getDetailedProfile(meal: {
    name: string; calories: number; protein?: number; carbs?: number; fat?: number; weightG?: number;
    fiber_g?: number; sugar_g?: number; saturated_fat_g?: number; salt_g?: number; sodium_mg?: number;
    potassium_mg?: number; calcium_mg?: number; iron_mg?: number; magnesium_mg?: number; zinc_mg?: number;
    vitamin_c_mg?: number; vitamin_d_iu?: number; vitamin_a_iu?: number; vitamin_a_mcg?: number; vitamin_b12_mcg?: number;
  }): DetailedNutrients {
    const known = (value: unknown) => {
      const n = nutritionNumber(value);
      return n === undefined ? undefined : roundNutrition(n);
    };
    return {
      calories: Math.round(meal.calories), proteinG: roundNutrition(meal.protein ?? 0),
      carbsG: roundNutrition(meal.carbs ?? 0), fatG: roundNutrition(meal.fat ?? 0), weightG: meal.weightG ?? 100,
      fiberG: known(meal.fiber_g), sugarG: known(meal.sugar_g), saturatedFatG: known(meal.saturated_fat_g), saltG: known(meal.salt_g),
      sodiumMg: known(meal.sodium_mg), potassiumMg: known(meal.potassium_mg), calciumMg: known(meal.calcium_mg),
      ironMg: known(meal.iron_mg), magnesiumMg: known(meal.magnesium_mg), zincMg: known(meal.zinc_mg),
      vitaminCMg: known(meal.vitamin_c_mg), vitaminDIU: known(meal.vitamin_d_iu),
      vitaminAIU: known(meal.vitamin_a_iu), vitaminAMcg: known(meal.vitamin_a_mcg), vitaminB12Mcg: known(meal.vitamin_b12_mcg),
    };
  }
}

export const MEAL_EXTRA_FIELDS = {
  fiberG: 'fiber_g', sugarG: 'sugar_g', saturatedFatG: 'saturated_fat_g', saltG: 'salt_g', sodiumMg: 'sodium_mg',
  potassiumMg: 'potassium_mg', calciumMg: 'calcium_mg', ironMg: 'iron_mg', magnesiumMg: 'magnesium_mg',
  zincMg: 'zinc_mg', vitaminCMg: 'vitamin_c_mg', vitaminDIU: 'vitamin_d_iu', vitaminAIU: 'vitamin_a_iu',
  vitaminAMcg: 'vitamin_a_mcg', vitaminB12Mcg: 'vitamin_b12_mcg',
} as const;
export function extrasToMealFields(extras: ExtraNutrients) {
  return Object.fromEntries(Object.entries(MEAL_EXTRA_FIELDS).map(([key, field]) => [field, extras[key as keyof ExtraNutrients]]));
}
export function mealFieldsToExtras(meal: Record<string, any>): ExtraNutrients {
  // Old releases persisted guessed vitamins and incorrectly converted OFF units.
  // There is no evidence allowing those values to be presented as declared facts.
  return Object.fromEntries(Object.entries(MEAL_EXTRA_FIELDS).map(([key, field]) => [key, meal.nutrition?.version === 1 ? nutritionNumber(meal[field]) : undefined]));
}
