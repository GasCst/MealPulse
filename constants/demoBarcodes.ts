/**
 * Demo fallback barcode database used when OpenFoodFacts API is offline or returns 404.
 */
export interface DemoBarcodeFood {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

export const DEMO_BARCODES: Record<string, DemoBarcodeFood> = {
  '8000500003787': {
    name: 'Nutella Ferrero 400g',
    brand: 'Ferrero',
    calories: 539,
    protein: 6.3,
    carbs: 57.5,
    fat: 30.9,
    serving: '100g',
  },
  '8000300000000': {
    name: 'Kinder Bueno',
    brand: 'Ferrero',
    calories: 572,
    protein: 8.6,
    carbs: 49.5,
    fat: 37.3,
    serving: '100g',
  },
  '3017620422003': {
    name: 'Nutella Biscuits',
    brand: 'Ferrero',
    calories: 513,
    protein: 7.4,
    carbs: 64,
    fat: 24.5,
    serving: '100g',
  },
};
