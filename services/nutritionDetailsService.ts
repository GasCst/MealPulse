/**
 * Nutrition Details Service
 * Calculates and estimates complete macro and micronutrient profiles (Vitamins & Minerals)
 * for logged meals and OpenFoodFacts items.
 */

export interface DetailedNutrients {
  // Main Macros
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  weightG: number;

  // Detailed Fats & Carbs
  fiberG: number;
  sugarG: number;
  saturatedFatG: number;

  // Minerals & Electrolytes
  sodiumMg: number;
  potassiumMg: number;
  calciumMg: number;
  ironMg: number;
  magnesiumMg: number;
  zincMg: number;

  // Key Vitamins
  vitaminCMg: number;
  vitaminDIU: number;
  vitaminAIU: number;
  vitaminB12Mcg: number;
}

export class NutritionDetailsService {
  /**
   * Calculates or estimates comprehensive nutritional breakdown for a meal
   */
  static getDetailedProfile(meal: {
    name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    weightG?: number;
    fiber_g?: number;
    sugar_g?: number;
    saturated_fat_g?: number;
    sodium_mg?: number;
    potassium_mg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    vitamin_c_mg?: number;
    vitamin_d_iu?: number;
    vitamin_a_iu?: number;
    vitamin_b12_mcg?: number;
    magnesium_mg?: number;
    zinc_mg?: number;
  }): DetailedNutrients {
    const name = (meal.name || '').toLowerCase();
    const weight = meal.weightG || 100;
    const factor = weight / 100;

    const cal = Math.max(0, Math.round(meal.calories || 0));
    const p = Math.max(0, Math.round((meal.protein || 0) * 10) / 10);
    const c = Math.max(0, Math.round((meal.carbs || 0) * 10) / 10);
    const f = Math.max(0, Math.round((meal.fat || 0) * 10) / 10);

    // If already provided via OpenFoodFacts or manual entry, use them
    let fiber = meal.fiber_g;
    let sugar = meal.sugar_g;
    let satFat = meal.saturated_fat_g;
    let sodium = meal.sodium_mg;
    let potassium = meal.potassium_mg;
    let calcium = meal.calcium_mg;
    let iron = meal.iron_mg;
    let vitC = meal.vitamin_c_mg;
    let vitD = meal.vitamin_d_iu;
    let vitA = meal.vitamin_a_iu;
    let vitB12 = meal.vitamin_b12_mcg;
    let magnesium = meal.magnesium_mg;
    let zinc = meal.zinc_mg;

    // Smart culinary heuristics based on food categories if specific micronutrients are missing
    if (fiber === undefined) {
      if (name.includes('insalat') || name.includes('salad') || name.includes('verdur') || name.includes('broccoli') || name.includes('spinac')) {
        fiber = Math.round(2.6 * factor * 10) / 10;
      } else if (name.includes('mela') || name.includes('apple') || name.includes('frutt') || name.includes('banana') || name.includes('aranc')) {
        fiber = Math.round(2.4 * factor * 10) / 10;
      } else if (name.includes('pasta') || name.includes('riso') || name.includes('pane') || name.includes('bread') || name.includes('cereali') || name.includes('avena')) {
        fiber = Math.round(3.0 * factor * 10) / 10;
      } else if (name.includes('legum') || name.includes('ceci') || name.includes('fagiol') || name.includes('lenticchie')) {
        fiber = Math.round(7.0 * factor * 10) / 10;
      } else {
        fiber = Math.round(Math.min(c * 0.12, 5) * 10) / 10;
      }
    }

    if (sugar === undefined) {
      if (name.includes('mela') || name.includes('apple') || name.includes('banana') || name.includes('frutt') || name.includes('aranc') || name.includes('succo')) {
        sugar = Math.round(c * 0.85 * 10) / 10;
      } else if (name.includes('latte') || name.includes('milk') || name.includes('yogurt')) {
        sugar = Math.round(c * 0.95 * 10) / 10;
      } else if (name.includes('dolce') || name.includes('biscott') || name.includes('torta') || name.includes('cioccolat') || name.includes('croissant') || name.includes('cornetto')) {
        sugar = Math.round(c * 0.5 * 10) / 10;
      } else {
        sugar = Math.round(Math.min(c * 0.15, 8) * 10) / 10;
      }
    }

    if (satFat === undefined) {
      if (name.includes('burro') || name.includes('butter')) {
        satFat = Math.round(f * 0.65 * 10) / 10;
      } else if (name.includes('formagg') || name.includes('cheese') || name.includes('mozzarella') || name.includes('parmigiano')) {
        satFat = Math.round(f * 0.60 * 10) / 10;
      } else if (name.includes('latte') || name.includes('milk')) {
        satFat = Math.round(f * 0.60 * 10) / 10;
      } else if (name.includes('carne') || name.includes('beef') || name.includes('maiale') || name.includes('bistecca')) {
        satFat = Math.round(f * 0.40 * 10) / 10;
      } else if (name.includes('olio') || name.includes('oil') || name.includes('avocado') || name.includes('salmone') || name.includes('noci')) {
        satFat = Math.round(f * 0.15 * 10) / 10; // Rich in unsaturated healthy fats
      } else {
        satFat = Math.round(f * 0.30 * 10) / 10;
      }
    }

    if (sodium === undefined) {
      if (name.includes('pizza') || name.includes('prosciutto') || name.includes('salame') || name.includes('parmigiano') || name.includes('patatine') || name.includes('chips')) {
        sodium = Math.round(550 * factor);
      } else if (name.includes('pane') || name.includes('sandwich') || name.includes('burger') || name.includes('pasta')) {
        sodium = Math.round(280 * factor);
      } else if (name.includes('latte') || name.includes('milk') || name.includes('uova') || name.includes('egg')) {
        sodium = Math.round(90 * factor);
      } else if (name.includes('caffe') || name.includes('coffee') || name.includes('tè') || name.includes('tea') || name.includes('frutt') || name.includes('mela')) {
        sodium = Math.round(5 * factor);
      } else {
        sodium = Math.round(75 * factor);
      }
    }

    if (potassium === undefined) {
      if (name.includes('banana')) {
        potassium = Math.round(358 * factor);
      } else if (name.includes('patat') || name.includes('potato') || name.includes('spinac') || name.includes('avocado')) {
        potassium = Math.round(485 * factor);
      } else if (name.includes('salmone') || name.includes('pollo') || name.includes('carne') || name.includes('beef')) {
        potassium = Math.round(360 * factor);
      } else if (name.includes('latte') || name.includes('milk') || name.includes('yogurt')) {
        potassium = Math.round(150 * factor);
      } else if (name.includes('caffe') || name.includes('coffee')) {
        potassium = Math.round(49 * factor);
      } else {
        potassium = Math.round(180 * factor);
      }
    }

    if (calcium === undefined) {
      if (name.includes('parmigiano') || name.includes('grana')) {
        calcium = Math.round(1160 * factor);
      } else if (name.includes('formagg') || name.includes('cheese') || name.includes('mozzarella')) {
        calcium = Math.round(500 * factor);
      } else if (name.includes('latte') || name.includes('milk') || name.includes('yogurt')) {
        calcium = Math.round(120 * factor);
      } else if (name.includes('spinac') || name.includes('broccoli') || name.includes('mandorle')) {
        calcium = Math.round(90 * factor);
      } else if (name.includes('uova') || name.includes('egg')) {
        calcium = Math.round(50 * factor);
      } else {
        calcium = Math.round(20 * factor);
      }
    }

    if (iron === undefined) {
      if (name.includes('carne') || name.includes('beef') || name.includes('bistecca') || name.includes('fegato')) {
        iron = Math.round(2.6 * factor * 10) / 10;
      } else if (name.includes('spinac') || name.includes('legum') || name.includes('lenticchie') || name.includes('ceci')) {
        iron = Math.round(3.2 * factor * 10) / 10;
      } else if (name.includes('uova') || name.includes('egg')) {
        iron = Math.round(1.8 * factor * 10) / 10;
      } else if (name.includes('cioccolato') || name.includes('avena')) {
        iron = Math.round(2.1 * factor * 10) / 10;
      } else {
        iron = Math.round(0.8 * factor * 10) / 10;
      }
    }

    if (vitC === undefined) {
      if (name.includes('aranc') || name.includes('orange') || name.includes('limon') || name.includes('agrumi') || name.includes('kiwi') || name.includes('fragol')) {
        vitC = Math.round(53 * factor);
      } else if (name.includes('peperon') || name.includes('broccoli') || name.includes('pomodor')) {
        vitC = Math.round(40 * factor);
      } else if (name.includes('mela') || name.includes('apple') || name.includes('banana')) {
        vitC = Math.round(5 * factor);
      } else {
        vitC = 0;
      }
    }

    if (vitD === undefined) {
      if (name.includes('salmone') || name.includes('salmon') || name.includes('sgombro') || name.includes('tonno')) {
        vitD = Math.round(400 * factor);
      } else if (name.includes('uova') || name.includes('egg')) {
        vitD = Math.round(44 * factor);
      } else if (name.includes('latte') || name.includes('milk') || name.includes('zymil')) {
        vitD = Math.round(40 * factor);
      } else {
        vitD = 0;
      }
    }

    if (vitA === undefined) {
      if (name.includes('carot') || name.includes('carrot') || name.includes('zucca')) {
        vitA = Math.round(835 * factor);
      } else if (name.includes('spinac') || name.includes('uova') || name.includes('burro') || name.includes('formagg')) {
        vitA = Math.round(160 * factor);
      } else if (name.includes('latte') || name.includes('milk')) {
        vitA = Math.round(46 * factor);
      } else {
        vitA = Math.round(10 * factor);
      }
    }

    if (vitB12 === undefined) {
      if (name.includes('carne') || name.includes('beef') || name.includes('salmone') || name.includes('tonno')) {
        vitB12 = Math.round(2.4 * factor * 10) / 10;
      } else if (name.includes('uova') || name.includes('egg')) {
        vitB12 = Math.round(0.9 * factor * 10) / 10;
      } else if (name.includes('latte') || name.includes('milk') || name.includes('zymil') || name.includes('yogurt') || name.includes('formagg')) {
        vitB12 = Math.round(0.5 * factor * 10) / 10;
      } else {
        vitB12 = 0;
      }
    }

    if (magnesium === undefined) {
      if (name.includes('cioccolato') || name.includes('mandorle') || name.includes('noci') || name.includes('avena')) {
        magnesium = Math.round(80 * factor);
      } else if (name.includes('spinac') || name.includes('legum') || name.includes('banana')) {
        magnesium = Math.round(35 * factor);
      } else if (name.includes('caffe') || name.includes('coffee') || name.includes('latte')) {
        magnesium = Math.round(12 * factor);
      } else {
        magnesium = Math.round(15 * factor);
      }
    }

    if (zinc === undefined) {
      if (name.includes('carne') || name.includes('beef') || name.includes('ostriche')) {
        zinc = Math.round(4.5 * factor * 10) / 10;
      } else if (name.includes('uova') || name.includes('legum') || name.includes('formagg') || name.includes('pollo')) {
        zinc = Math.round(1.5 * factor * 10) / 10;
      } else {
        zinc = Math.round(0.4 * factor * 10) / 10;
      }
    }

    return {
      calories: cal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      weightG: weight,
      fiberG: Math.max(0, fiber || 0),
      sugarG: Math.max(0, sugar || 0),
      saturatedFatG: Math.max(0, satFat || 0),
      sodiumMg: Math.max(0, sodium || 0),
      potassiumMg: Math.max(0, potassium || 0),
      calciumMg: Math.max(0, calcium || 0),
      ironMg: Math.max(0, iron || 0),
      vitaminCMg: Math.max(0, vitC || 0),
      vitaminDIU: Math.max(0, vitD || 0),
      vitaminAIU: Math.max(0, vitA || 0),
      vitaminB12Mcg: Math.max(0, vitB12 || 0),
      magnesiumMg: Math.max(0, magnesium || 0),
      zincMg: Math.max(0, zinc || 0),
    };
  }
}
