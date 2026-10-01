const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function fixture(fetchImpl) {
  const modules = new Map(), storage = new Map();
  const asyncStorage = { getItem: async key => storage.get(key) || null, setItem: async (key, value) => { storage.set(key, value); } };
  function load(file) {
    file = path.resolve(root, file);
    if (modules.has(file)) return modules.get(file);
    const exports = {}; modules.set(file, exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
    vm.runInNewContext(outputText, { exports, console: { log() {}, warn() {} }, process: { env: {} }, Date, AbortController, setTimeout, clearTimeout,
      fetch: fetchImpl || (async () => { throw new Error('Unexpected network request'); }),
      require(name) {
        if (name === '@react-native-async-storage/async-storage') return { default: asyncStorage };
        if (name === '@/services/voiceTextStyle') return {};
        if (name.startsWith('.')) return load(path.join(path.dirname(file), name + '.ts'));
        throw new Error(`Unexpected import: ${name}`);
      },
    });
    return exports;
  }
  return { data: load('services/nutritionData.ts'), details: load('services/nutritionDetailsService.ts'), corrections: load('services/productNutritionCorrections.ts'), load, storage };
}
const product = (nutriments = {}, extras = {}) => ({ code: '8000000000001', product_name: 'Test product', nutriments: { 'energy-kcal_100g': 184, proteins_100g: 6.2, carbohydrates_100g: 4.4, fat_100g: 15, ...nutriments }, ...extras });
const food = values => ({ id: 'off_8000000000001', name: 'Product', barcode: '8000000000001', portion: '100g', weightG: 100, baseWeightG: 100, emoji: '🍽️', ...values, baseCalories: values.calories, baseProteinG: values.proteinG, baseCarbsG: values.carbsG, baseFatG: values.fatG });

test('all products preserve declared kcal and decimal macros, with source and exact barcode', () => {
  const { data } = fixture();
  for (const p of [product(), product({ 'energy-kcal_100g': 160, fat_100g: 13 }, { code: '8000000000002' })]) {
    const n = data.readOffNutrition(p);
    assert.equal(n.calories, p.nutriments['energy-kcal_100g']);
    assert.equal(n.proteinG, 6.2); assert.equal(n.carbsG, 4.4);
    assert.equal(n.nutrition.barcode, p.code); assert.equal(n.nutrition.source, 'open_food_facts');
  }
});
test('serving-only values are normalized using a declared 40g serving, including micros', () => {
  const { data } = fixture();
  const n = data.readOffNutrition({ serving_size: '40 g', nutriments: { 'energy-kcal_serving': 144, proteins_serving: 3.2, carbohydrates_serving: 28, fat_serving: 2, calcium_serving: 0.04 } });
  assert.equal(n.calories, 360); assert.equal(n.proteinG, 8); assert.equal(n.carbsG, 70); assert.equal(n.fatG, 5); assert.equal(n.calciumMg, 100);
});
test('package size and naked serving_quantity never become an assumed nutrient basis', () => {
  const { data } = fixture();
  const n = { 'energy-kcal_serving': 50, proteins_serving: 2, carbohydrates_serving: 5, fat_serving: 2 };
  assert.equal(data.readOffNutrition({ quantity: '30g', nutriments: n }), null);
  assert.equal(data.readOffNutrition({ serving_quantity: 30, nutriments: n }), null);
});
test('per100 values win over per-serving and contributor-specific raw values', () => {
  const { data } = fixture();
  const n = data.readOffNutrition(product({ 'energy-kcal_serving': 55, proteins_serving: 2, calcium_100g: .120, calcium_value: 120, calcium_unit: 'mg' }, { serving_size: '30g', quantity: '175g' }));
  assert.equal(n.calories, 184); assert.equal(n.proteinG, 6.2); assert.equal(n.calciumMg, 120);
});
test('all zero is valid; missing macros are not silently converted to zero', () => {
  const { data } = fixture();
  assert.equal(data.readOffNutrition(product({ 'energy-kcal_100g': 0, proteins_100g: 0, carbohydrates_100g: 0, fat_100g: 0 })).calories, 0);
  for (const key of ['energy-kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'fat_100g']) {
    const p = product(); delete p.nutriments[key]; assert.equal(data.readOffNutrition(p), null);
  }
});
test('invalid and impossible nutrition is rejected for any product', () => {
  const { data } = fixture();
  for (const invalid of [-1, NaN, Infinity, '', 'not a number', null]) assert.equal(data.readOffNutrition(product({ proteins_100g: invalid })), null);
  assert.equal(data.readOffNutrition(product({ proteins_100g: 150 })), null);
  assert.equal(data.readOffNutrition(product({ 'energy-kcal_100g': 18400 })), null);
  assert.equal(data.readOffNutrition(product({}, { no_nutrition_data: 'on' })), null);
});
test('kJ-only labels convert to kcal; conflicting declared energy is warned, not overwritten', () => {
  const { data } = fixture();
  const p = product({ 'energy_100g': 418.4 }); delete p.nutriments['energy-kcal_100g'];
  assert.equal(data.readOffNutrition(p).calories, 100);
  const n = data.readOffNutrition(product({ energy_100g: 418.4 }));
  assert.equal(n.calories, 184); assert.ok(n.nutrition.warnings.includes('energy_conflict'));
});
test('normalized mineral and vitamin grams convert to mg, µg and appropriate vitamin D IU', () => {
  const { data } = fixture();
  const n = data.readOffNutrition(product({ sodium_100g: .292, potassium_100g: .358, calcium_100g: .12, iron_100g: .0026, magnesium_100g: .080, zinc_100g: .0045, 'vitamin-c_100g': .053, 'vitamin-d_100g': .000005, 'vitamin-a_100g': .0008, 'vitamin-b12_100g': .0000024 }));
  for (const [key, expected] of Object.entries({ sodiumMg: 292, potassiumMg: 358, calciumMg: 120, ironMg: 2.6, magnesiumMg: 80, zincMg: 4.5, vitaminCMg: 53, vitaminDIU: 200, vitaminAMcg: 800, vitaminB12Mcg: 2.4 })) assert.equal(n[key], expected, key);
  assert.equal(n.vitaminAIU, undefined);
});
test('salt converts to sodium even for declared zero, and contradictory salt is flagged', () => {
  const { data } = fixture();
  assert.equal(data.readOffNutrition(product({ salt_100g: .73 })).sodiumMg, 292);
  assert.equal(data.readOffNutrition(product({ salt_100g: 0 })).sodiumMg, 0);
  assert.ok(data.readOffNutrition(product({ salt_100g: 10, sodium_100g: .01 })).nutrition.warnings.includes('salt_conflict'));
});
test('unknown micros remain unknown; a declared zero stays zero for every food name', () => {
  const { details } = fixture();
  for (const name of ['banana', 'Parmigiano', 'salmon', 'Philadelphia', 'carrots']) {
    const n = details.NutritionDetailsService.getDetailedProfile({ name, calories: 184, protein: 6.2, carbs: 4.4, fat: 15 });
    for (const key of ['sodiumMg', 'calciumMg', 'ironMg', 'vitaminCMg', 'vitaminDIU', 'vitaminAIU', 'vitaminB12Mcg']) assert.equal(n[key], undefined);
    assert.equal(details.NutritionDetailsService.getDetailedProfile({ name, calories: 0, sodium_mg: 0 }).sodiumMg, 0);
  }
});
test('sugars greater than carbs and saturated fat greater than fat are flagged and not shown as facts', () => {
  const { data } = fixture();
  const n = data.readOffNutrition(product({ sugars_100g: 50, 'saturated-fat_100g': 50 }, { data_quality_errors_tags: ['en:nutrition-data-error'] }));
  assert.equal(n.sugarG, undefined); assert.equal(n.saturatedFatG, undefined);
  for (const key of ['sugars_conflict', 'fat_conflict', 'database_quality']) assert.ok(n.nutrition.warnings.includes(key));
});
test('liquid servings use ml and are not converted to grams or ounces', () => {
  const { data } = fixture();
  const n = data.readOffNutrition({ serving_size: '20 cl', nutriments: { 'energy-kcal_serving': 84, proteins_serving: 0, carbohydrates_serving: 21.2, fat_serving: 0 } });
  assert.equal(n.calories, 42); assert.equal(n.carbsG, 10.6); assert.equal(n.nutrition.referenceUnit, 'ml');
  const glass = data.scaleFoodPortion(food(n), 250);
  assert.equal(glass.calories, 105); assert.equal(glass.carbsG, 26.5); assert.equal(glass.portion, '250 ml');
});
test('prepared food values are not mixed with as-sold values', () => {
  const { data } = fixture();
  assert.equal(data.readOffNutrition(product({ 'energy-kcal_prepared_100g': 50, proteins_prepared_100g: 2 })).calories, 184);
});
test('50g to 150g to 50g scales every nutrient once and preserves the base', () => {
  const { data } = fixture();
  const f = food(data.readOffNutrition(product({ calcium_100g: .120, 'vitamin-b12_100g': .0000024 })));
  const half = data.scaleFoodPortion(f, 50), bigger = data.scaleFoodPortion(half, 150), back = data.scaleFoodPortion(bigger, 50);
  assert.equal(half.calories, 92); assert.equal(half.calciumMg, 60); assert.equal(half.vitaminB12Mcg, 1.2);
  assert.equal(bigger.calciumMg, 180); assert.equal(back.calciumMg, 60); assert.equal(back.proteinG, 3.1); assert.equal(back.baseCalories, 184);
});
test('editing the same logged portion does not halve micronutrients again', () => {
  const { data, details } = fixture();
  const meal = { nutrition: { version: 1 }, weightG: 50, calcium_mg: 60, vitamin_b12_mcg: 1.2 };
  const extras = details.mealFieldsToExtras(meal);
  assert.equal(details.extrasToMealFields(data.scaleExtras(extras, 50 / meal.weightG)).calcium_mg, 60);
  assert.equal(details.extrasToMealFields(data.scaleExtras(extras, 100 / meal.weightG)).vitamin_b12_mcg, 2.4);
});
test('legacy fabricated or wrongly converted vitamins do not become verified new data', () => {
  const { details } = fixture();
  assert.equal(details.mealFieldsToExtras({ calories: 184, vitamin_c_mg: 53, calcium_mg: 500 }).vitaminCMg, undefined);
});
test('label corrections work for every barcode and never change another variant with the same name', async () => {
  const { data, corrections } = fixture();
  const f = food(data.readOffNutrition(product({ calcium_100g: .12 })));
  await corrections.saveProductLabel(f.barcode, { calories: 200, proteinG: 8.4, carbsG: 3.7, fatG: 16 }, 'g');
  const corrected = await corrections.applyProductLabel(f);
  assert.equal(corrected.calories, 200); assert.equal(corrected.nutrition.source, 'user_label');
  assert.equal(corrected.calciumMg, undefined); // Blank label field must clear original database data.
  const other = await corrections.applyProductLabel({ ...f, barcode: '8000000000002' });
  assert.equal(other.calories, 184); assert.equal(other.calciumMg, 120);
});
test('decimal commas are preserved and incomplete numbers rejected in manual/label entry', () => {
  const { data } = fixture();
  assert.equal(data.nutritionNumber('6,2'), 6.2); assert.equal(data.nutritionNumber('0'), 0);
  for (const text of ['', '-3', '12g', '2..3', 'Infinity']) assert.equal(data.nutritionNumber(text), undefined);
});
test('search keeps different barcodes with the same name, and refuses incomplete OFF products', async () => {
  const raw = [product(), product({}, { code: '8000000000002' }), product({ proteins_100g: undefined }, { code: '8000000000003' })];
  const f = fixture(async url => ({ ok: true, json: async () => url.includes('search.openfoodfacts') ? { hits: raw } : { products: raw } }));
  const results = await f.load('services/foodDatabaseService.ts').FoodDatabaseService.searchFoods('test product', 'it');
  assert.equal(results.filter(f => f.barcode).length, 2);
});
test('barcode results use the same conversions and local label corrections as text search', async () => {
  const raw = product({ calcium_100g: .12 });
  const f = fixture(async () => ({ ok: true, json: async () => ({ status: 1, product: raw }) }));
  const db = f.load('services/foodDatabaseService.ts').FoodDatabaseService;
  assert.equal((await db.fetchFoodByBarcode(raw.code)).calciumMg, 120);
  await f.corrections.saveProductLabel(raw.code, { calories: 210, proteinG: 8, carbsG: 4, fatG: 18 }, 'g');
  assert.equal((await db.fetchFoodByBarcode(raw.code)).calories, 210);
});
function aiFixture(answer) {
  const f = fixture(async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: typeof answer === 'string' ? answer : JSON.stringify(answer) }] } }] }) }));
  return f.load('services/aiVisionService.ts');
}
test('photo response respects declared zero and decimal grams instead of fixed fallback macros', async () => {
  const ai = aiFixture({ food_name: 'Tea', estimated_weight_g: 200, calories: 0, protein_g: .2, carbs_g: 0, fat_g: 0 });
  const n = await ai.analyzeMealPlateImage('photo', 'test-key');
  assert.equal(n.calories, 0); assert.equal(n.protein_g, .2); assert.equal(n.confidence, 0);
});
test('photo responses missing calories/macros are rejected instead of inventing a meal', async () => {
  const ai = aiFixture({ food_name: 'Meal', estimated_weight_g: 200, calories: 160 });
  await assert.rejects(ai.analyzeMealPlateImage('photo', 'test-key'), /Incomplete nutrition/);
});
test('voice text and audio totals come from actual items, not contradictory model totals', async () => {
  const ai = aiFixture({ total_calories: 9999, items: [{ name: 'Food', weight_g: 50, calories: 92, protein_g: 3.1, carbs_g: 2.2, fat_g: 7.5 }] });
  for (const promise of [ai.parseMealFromVoiceText('food', 'test-key'), ai.parseMealFromAudioBase64('audio', 'audio/mp4', 'test-key')]) {
    const n = await promise; assert.equal(n.total_calories, 92); assert.equal(n.total_protein_g, 3.1); assert.equal(n.items[0].weight_g, 50);
  }
});
test('voice parsers refuse incomplete items instead of silently writing zero', async () => {
  const ai = aiFixture({ items: [{ name: 'Food', weight_g: 50, calories: 92 }] });
  await assert.rejects(ai.parseMealFromVoiceText('food', 'test-key'), /Incomplete nutrition/);
  await assert.rejects(ai.parseMealFromAudioBase64('audio', 'audio/mp4', 'test-key'), /Incomplete nutrition/);
});

test('refreshing a search selection uses the current product record and preserves its portion', async () => {
  const f = fixture(async () => ({ ok: true, json: async () => ({ status: 1, product: product({ 'energy-kcal_100g': 200, calcium_100g: .12 }) }) }));
  const db = f.load('services/foodDatabaseService.ts').FoodDatabaseService;
  const selected = f.data.scaleFoodPortion(food(f.data.readOffNutrition(product({ 'energy-kcal_100g': 160 }))), 50);
  const [current] = await db.refreshFoodsForLogging([selected], 'it');
  assert.equal(current.calories, 100); assert.equal(current.calciumMg, 60); assert.equal(current.weightG, 50);
});
test('unavailable product details prevent the whole selection from logging fabricated fallback values', async () => {
  const f = fixture(async () => ({ ok: true, json: async () => ({ status: 0 }) }));
  const db = f.load('services/foodDatabaseService.ts').FoodDatabaseService;
  await assert.rejects(db.refreshFoodsForLogging([food(f.data.readOffNutrition(product()))], 'it'), /unavailable/);
});
test('user label corrections and generic/AI foods are preserved without a speculative brand lookup', async () => {
  const f = fixture(); const db = f.load('services/foodDatabaseService.ts').FoodDatabaseService;
  const corrected = food({ calories: 200, proteinG: 8, carbsG: 4, fatG: 16, nutrition: { version: 1, source: 'user_label', referenceUnit: 'g' } });
  assert.equal((await db.refreshFoodsForLogging([corrected], 'it'))[0].calories, 200);
  assert.equal((await db.refreshFoodsForLogging([{ ...corrected, barcode: undefined }], 'it'))[0].calories, 200);
});
test('photo and voice reject macros that cannot fit the stated portion', async () => {
  const ai = aiFixture({ food_name: 'Food', estimated_weight_g: 10, calories: 100, protein_g: 200, carbs_g: 0, fat_g: 0 });
  await assert.rejects(ai.analyzeMealPlateImage('photo', 'test-key'), /Invalid nutrition/);
  const voice = aiFixture({ items: [{ name: 'Food', weight_g: 10, calories: 100, protein_g: 200, carbs_g: 0, fat_g: 0 }] });
  await assert.rejects(voice.parseMealFromVoiceText('food', 'test-key'), /Invalid nutrition/);
});
test('package volume units identify ml without inventing gram/ml density', () => {
  const { data } = fixture();
  for (const quantity of ['1 Quart', '1/2 gal', '1 lt', '32 fl oz (946 ml)']) assert.equal(data.readOffNutrition(product({}, { quantity })).nutrition.referenceUnit, 'ml');
});
