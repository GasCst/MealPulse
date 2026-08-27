export type UnitSystem = 'metric' | 'imperial';

export const GRAMS_PER_OZ = 28.3495231;
export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;
export const ML_PER_FLOZ = 29.5735296;

export class UnitService {
  /**
   * Format food weight in grams or ounces
   */
  static formatFoodWeight(grams: number, system: UnitSystem = 'metric', includeUnit: boolean = true): string {
    const safeG = Math.max(0, grams || 0);
    if (system === 'imperial') {
      const oz = (safeG / GRAMS_PER_OZ).toFixed(1);
      const cleanOz = oz.endsWith('.0') ? oz.slice(0, -2) : oz;
      return includeUnit ? `${cleanOz} oz` : cleanOz;
    }
    const rounded = Math.round(safeG);
    return includeUnit ? `${rounded}g` : `${rounded}`;
  }

  /**
   * Get numeric food weight according to selected unit system
   */
  static getFoodWeightValue(grams: number, system: UnitSystem = 'metric'): number {
    const safeG = Math.max(0, grams || 0);
    if (system === 'imperial') {
      return Number((safeG / GRAMS_PER_OZ).toFixed(1));
    }
    return Math.round(safeG);
  }

  /**
   * Convert user input in g or oz back to integer grams
   */
  static convertInputToGrams(value: number, unit: 'g' | 'oz'): number {
    const safeVal = Math.max(0, value || 0);
    if (unit === 'oz') {
      return Math.round(safeVal * GRAMS_PER_OZ);
    }
    return Math.round(safeVal);
  }

  /**
   * Get weight unit label ('g' or 'oz')
   */
  static getWeightUnitLabel(system: UnitSystem = 'metric'): string {
    return system === 'imperial' ? 'oz' : 'g';
  }

  /**
   * Get body weight unit label ('kg' or 'lbs')
   */
  static getBodyWeightUnitLabel(system: UnitSystem = 'metric'): string {
    return system === 'imperial' ? 'lbs' : 'kg';
  }

  /**
   * Format human body weight (kg / lbs)
   */
  static formatBodyWeight(kg: number, system: UnitSystem = 'metric'): string {
    const safeKg = Math.max(0, kg || 0);
    if (system === 'imperial') {
      const lbs = Math.round(safeKg / KG_PER_LB);
      return `${lbs} lbs`;
    }
    return `${Math.round(safeKg * 10) / 10} kg`;
  }

  /**
   * Convert body weight input in kg or lbs back to kg
   */
  static convertBodyWeightToKg(value: number, system: UnitSystem = 'metric'): number {
    const safeVal = Math.max(0, value || 0);
    if (system === 'imperial') {
      return Math.round((safeVal * KG_PER_LB) * 10) / 10;
    }
    return safeVal;
  }

  /**
   * Format liquid volume (ml / fl oz)
   */
  static formatLiquid(ml: number, system: UnitSystem = 'metric'): string {
    const safeMl = Math.max(0, ml || 0);
    if (system === 'imperial') {
      const floz = Math.round(safeMl / ML_PER_FLOZ);
      return `${floz} fl oz`;
    }
    return `${Math.round(safeMl)} ml`;
  }

  /**
   * Recalculate nutrition macros proportionally when changing food portion / weight
   */
  static recalculateMacros(
    baseCalories: number,
    baseProtein: number,
    baseCarbs: number,
    baseFat: number,
    baseWeightG: number,
    newWeightG: number
  ): {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    weightG: number;
  } {
    const safeBaseWeight = Math.max(1, baseWeightG || 100);
    const safeNewWeight = Math.max(0, newWeightG || 0);
    const ratio = safeNewWeight / safeBaseWeight;

    return {
      calories: Math.round(baseCalories * ratio),
      proteinG: Math.round(baseProtein * ratio * 10) / 10,
      carbsG: Math.round(baseCarbs * ratio * 10) / 10,
      fatG: Math.round(baseFat * ratio * 10) / 10,
      weightG: safeNewWeight,
    };
  }
}
