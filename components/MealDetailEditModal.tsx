import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LoggedMeal } from '@/app/(tabs)/index';
import { NutritionDetailsService, DetailedNutrients } from '@/services/nutritionDetailsService';

interface MealDetailEditModalProps {
  visible: boolean;
  meal: LoggedMeal | null;
  onClose: () => void;
  onSave: (updatedMeal: LoggedMeal) => void;
  onDelete: (mealId: string) => void;
}

import * as Haptics from 'expo-haptics';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

export const MealDetailEditModal: React.FC<MealDetailEditModalProps> = ({
  visible,
  meal,
  onClose,
  onSave,
  onDelete,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [weightG, setWeightG] = useState(100);
  const [weightInput, setWeightInput] = useState('100');
  const [baseWeightG, setBaseWeightG] = useState(100);
  const [baseCalories, setBaseCalories] = useState(0);
  const [baseProtein, setBaseProtein] = useState(0);
  const [baseCarbs, setBaseCarbs] = useState(0);
  const [baseFat, setBaseFat] = useState(0);
  const [portionText, setPortionText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (meal) {
      setName(meal.name || '');
      setBrand(meal.brand || '');
      
      const cat = (meal.category || 'breakfast').toLowerCase();
      if (cat.includes('lunch')) setCategory('lunch');
      else if (cat.includes('dinner')) setCategory('dinner');
      else if (cat.includes('snack')) setCategory('snack');
      else setCategory('breakfast');

      // 1. Determine current weight accurately (e.g. 25g)
      let curWeight = 100;
      if (meal.weightG && meal.weightG > 0) {
        curWeight = meal.weightG;
      } else if (meal.portion) {
        const parsed = parseInt(meal.portion.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) {
          curWeight = parsed;
        }
      }

      // 2. Standard base reference weight (100g standard)
      const bWeight = meal.baseWeightG && meal.baseWeightG > 0 ? meal.baseWeightG : 100;

      setWeightG(curWeight);
      setWeightInput(String(curWeight));
      setBaseWeightG(bWeight);

      // 3. Base macro calculation (normalize to baseWeightG, e.g. 100g)
      let bCal = meal.baseCalories;
      let bProt = meal.baseProtein;
      let bCarb = meal.baseCarbs;
      let bFat = meal.baseFat;

      // If base macros per 100g are not provided, calculate rate per bWeight (100g)
      if (bCal === undefined || bCal <= 0) {
        const ratio = curWeight > 0 ? bWeight / curWeight : 1;
        bCal = Math.round((meal.calories || 0) * ratio);
        bProt = Math.round((meal.protein || 0) * ratio * 10) / 10;
        bCarb = Math.round((meal.carbs || 0) * ratio * 10) / 10;
        bFat = Math.round((meal.fat || 0) * ratio * 10) / 10;
      }

      setBaseCalories(bCal);
      setBaseProtein(bProt ?? 0);
      setBaseCarbs(bCarb ?? 0);
      setBaseFat(bFat ?? 0);
      setPortionText(meal.portion || `${curWeight}g`);
    }
  }, [meal]);

  if (!meal) return null;

  // Real-time scaled values
  const currentRatio = baseWeightG > 0 ? weightG / baseWeightG : 1;
  const currentCalories = Math.max(0, Math.round(baseCalories * currentRatio));
  const currentProtein = Math.max(0, Math.round(baseProtein * currentRatio * 10) / 10);
  const currentCarbs = Math.max(0, Math.round(baseCarbs * currentRatio * 10) / 10);
  const currentFat = Math.max(0, Math.round(baseFat * currentRatio * 10) / 10);

  // Micro-nutrient & detailed calculation
  const detailedNutrients: DetailedNutrients = NutritionDetailsService.getDetailedProfile({
    name,
    calories: currentCalories,
    protein: currentProtein,
    carbs: currentCarbs,
    fat: currentFat,
    weightG,
    fiber_g: meal.fiber_g !== undefined ? Math.round(meal.fiber_g * currentRatio * 10) / 10 : undefined,
    sugar_g: meal.sugar_g !== undefined ? Math.round(meal.sugar_g * currentRatio * 10) / 10 : undefined,
    saturated_fat_g: meal.saturated_fat_g !== undefined ? Math.round(meal.saturated_fat_g * currentRatio * 10) / 10 : undefined,
    sodium_mg: meal.sodium_mg !== undefined ? Math.round(meal.sodium_mg * currentRatio) : undefined,
    potassium_mg: meal.potassium_mg !== undefined ? Math.round(meal.potassium_mg * currentRatio) : undefined,
    calcium_mg: meal.calcium_mg !== undefined ? Math.round(meal.calcium_mg * currentRatio) : undefined,
    iron_mg: meal.iron_mg !== undefined ? Math.round(meal.iron_mg * currentRatio * 10) / 10 : undefined,
    vitamin_c_mg: meal.vitamin_c_mg !== undefined ? Math.round(meal.vitamin_c_mg * currentRatio * 10) / 10 : undefined,
    vitamin_d_iu: meal.vitamin_d_iu !== undefined ? Math.round(meal.vitamin_d_iu * currentRatio) : undefined,
    vitamin_a_iu: meal.vitamin_a_iu !== undefined ? Math.round(meal.vitamin_a_iu * currentRatio) : undefined,
    vitamin_b12_mcg: meal.vitamin_b12_mcg !== undefined ? Math.round(meal.vitamin_b12_mcg * currentRatio * 10) / 10 : undefined,
    magnesium_mg: meal.magnesium_mg !== undefined ? Math.round(meal.magnesium_mg * currentRatio) : undefined,
    zinc_mg: meal.zinc_mg !== undefined ? Math.round(meal.zinc_mg * currentRatio * 10) / 10 : undefined,
  });

  const handleAdjustWeight = (delta: number) => {
    try {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const next = Math.max(1, Math.min(2500, weightG + delta));
    setWeightG(next);
    setWeightInput(String(next));
  };

  const handleSetWeight = (text: string) => {
    setWeightInput(text);
    const cleaned = text.replace(/[^0-9]/g, '');
    const val = parseInt(cleaned, 10);
    if (!isNaN(val) && val > 0) {
      setWeightG(Math.min(2500, val));
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert(t('error', 'Errore'), t('enter_food_name', 'Inserisci un nome valido per l\'alimento.'));
      return;
    }

    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const safeWeight = Math.max(1, weightG);

    const updatedMeal: LoggedMeal = {
      ...meal,
      name: name.trim(),
      brand: brand.trim() || undefined,
      category,
      calories: currentCalories,
      protein: currentProtein,
      carbs: currentCarbs,
      fat: currentFat,
      weightG: safeWeight,
      baseWeightG,
      baseCalories,
      baseProtein,
      baseCarbs,
      baseFat,
      portion: `${safeWeight}g`,
      fiber_g: detailedNutrients.fiberG,
      sugar_g: detailedNutrients.sugarG,
      saturated_fat_g: detailedNutrients.saturatedFatG,
      sodium_mg: detailedNutrients.sodiumMg,
      potassium_mg: detailedNutrients.potassiumMg,
      calcium_mg: detailedNutrients.calciumMg,
      iron_mg: detailedNutrients.ironMg,
      vitamin_c_mg: detailedNutrients.vitaminCMg,
      vitamin_d_iu: detailedNutrients.vitaminDIU,
      vitamin_a_iu: detailedNutrients.vitaminAIU,
      vitamin_b12_mcg: detailedNutrients.vitaminB12Mcg,
      magnesium_mg: detailedNutrients.magnesiumMg,
      zinc_mg: detailedNutrients.zincMg,
    };

    onSave(updatedMeal);
    onClose();
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const totalMacroCal = currentCarbs * 4 + currentProtein * 4 + currentFat * 9;
  const carbPct = totalMacroCal > 0 ? Math.round(((currentCarbs * 4) / totalMacroCal) * 100) : 33;
  const protPct = totalMacroCal > 0 ? Math.round(((currentProtein * 4) / totalMacroCal) * 100) : 33;
  const fatPct = totalMacroCal > 0 ? Math.max(0, 100 - carbPct - protPct) : 34;

  const categories = [
    { key: 'breakfast', label: t('meal_breakfast', 'Colazione'), emoji: '🥐' },
    { key: 'lunch', label: t('meal_lunch', 'Pranzo'), emoji: '🥗' },
    { key: 'dinner', label: t('meal_dinner', 'Cena'), emoji: '🥩' },
    { key: 'snack', label: t('meal_snack', 'Spuntino'), emoji: '🍏' },
  ] as const;

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={[styles.sheetContainer, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBadge, { backgroundColor: isDarkMode ? '#1F2E25' : '#F1F9F1' }]}>
                {meal.imageUri ? (
                  <Image source={{ uri: meal.imageUri }} style={styles.headerThumbImg} />
                ) : (
                  <Text style={{ fontSize: 26 }}>{meal.emoji || '🍽️'}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {t('edit_food', 'Dettagli Alimento')}
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                  {category === 'breakfast'
                    ? '🥐 ' + t('meal_breakfast', 'Colazione')
                    : category === 'lunch'
                    ? '🥗 ' + t('meal_lunch', 'Pranzo')
                    : category === 'dinner'
                    ? '🥩 ' + t('meal_dinner', 'Cena')
                    : '🍏 ' + t('meal_snack', 'Spuntino')}
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. Name & Brand Inputs */}
            <View style={styles.inputSection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('food_name_label', 'Nome Alimento')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDarkMode ? '#1A2920' : '#F8FAFC',
                    color: colors.textPrimary,
                    borderColor: isDarkMode ? '#284033' : '#E2E8F0',
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="es. Latte Zymil"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12 }]}>
                {t('brand_label', 'Marca / Produttore')}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: isDarkMode ? '#1A2920' : '#F8FAFC',
                    color: colors.textPrimary,
                    borderColor: isDarkMode ? '#284033' : '#E2E8F0',
                  },
                ]}
                value={brand}
                onChangeText={setBrand}
                placeholder="es. Parmalat (opzionale)"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* 2. Category Selector */}
            <View style={styles.categorySection}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                {t('category_label', 'Categoria Pasto')}
              </Text>
              <View style={styles.categoryPillsRow}>
                {categories.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSelected
                            ? colors.coral
                            : isDarkMode
                            ? '#1A2920'
                            : '#F1F5F9',
                          borderColor: isSelected
                            ? colors.coral
                            : isDarkMode
                            ? '#243A2E'
                            : '#E2E8F0',
                        },
                      ]}
                      onPress={() => setCategory(cat.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
                      <Text
                        style={[
                          styles.catPillText,
                          {
                            color: isSelected ? '#FFFFFF' : colors.textPrimary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Weight & Portion Control */}
            <View style={[styles.weightBox, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
              <View style={styles.weightHeaderRow}>
                <View>
                  <Text style={[styles.weightTitle, { color: colors.textPrimary }]}>
                    {t('portion_weight', 'Quantità / Porzione')}
                  </Text>
                  <Text style={[styles.weightSubtitle, { color: colors.textSecondary }]}>
                    {t('adjust_weight_auto_scale', 'Regola la grammatura per ricalcolare i valori')}
                  </Text>
                </View>

                {/* Direct Number Input */}
                <View style={[styles.weightInputWrap, { backgroundColor: isDarkMode ? '#121F17' : '#FFFFFF', borderColor: colors.coral }]}>
                  <TextInput
                    style={[styles.weightInputText, { color: colors.textPrimary }]}
                    keyboardType="number-pad"
                    value={weightInput}
                    onChangeText={handleSetWeight}
                    onBlur={() => {
                      if (!weightInput || parseInt(weightInput, 10) <= 0) {
                        setWeightG(1);
                        setWeightInput('1');
                      }
                    }}
                    maxLength={4}
                  />
                  <Text style={[styles.weightUnitLabel, { color: colors.textSecondary }]}>g</Text>
                </View>
              </View>

              {/* Quick Stepper Buttons */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDarkMode ? '#203328' : '#EEF2F6' }]}
                  onPress={() => handleAdjustWeight(-50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>-50g</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDarkMode ? '#203328' : '#EEF2F6' }]}
                  onPress={() => handleAdjustWeight(-10)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>-10g</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDarkMode ? '#203328' : '#EEF2F6' }]}
                  onPress={() => handleAdjustWeight(10)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+10g</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDarkMode ? '#203328' : '#EEF2F6' }]}
                  onPress={() => handleAdjustWeight(50)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+50g</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: isDarkMode ? '#203328' : '#EEF2F6' }]}
                  onPress={() => handleAdjustWeight(100)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+100g</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Calories Hero & Primary Macro Cards */}
            <View style={[styles.macroSectionCard, { backgroundColor: isDarkMode ? '#1A2920' : '#FFFFFF', borderColor: isDarkMode ? '#284033' : '#EDF2F7' }]}>
              <View style={styles.calHeroRow}>
                <View>
                  <Text style={[styles.calHeroLabel, { color: colors.textSecondary }]}>
                    {t('total_calories', 'Calorie Totali')}
                  </Text>
                  <Text style={[styles.calHeroValue, { color: colors.coral }]}>
                    {currentCalories} <Text style={styles.calHeroUnit}>{t('kcal', 'KCAL')}</Text>
                  </Text>
                </View>

                {/* Macro mini proportions bar */}
                <View style={styles.macroProportionWrap}>
                  <View style={styles.macroBarTrack}>
                    <View style={[styles.macroBarSegment, { width: `${carbPct}%`, backgroundColor: '#38BDF8' }]} />
                    <View style={[styles.macroBarSegment, { width: `${protPct}%`, backgroundColor: '#F43F5E' }]} />
                    <View style={[styles.macroBarSegment, { width: `${fatPct}%`, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={[styles.macroRatioText, { color: colors.textMuted }]}>
                    {carbPct}% C · {protPct}% P · {fatPct}% F
                  </Text>
                </View>
              </View>

              {/* 3 Main Macro Pills */}
              <View style={styles.mainMacrosGrid}>
                {/* Carbs */}
                <View style={[styles.macroColCard, { backgroundColor: isDarkMode ? '#142018' : '#F0F9FF', borderColor: '#38BDF8' }]}>
                  <Text style={[styles.macroColName, { color: '#38BDF8' }]}>🌾 {t('carb_left', 'Carboidrati')}</Text>
                  <Text style={[styles.macroColValue, { color: colors.textPrimary }]}>
                    {currentCarbs} <Text style={styles.macroColUnit}>g</Text>
                  </Text>
                </View>

                {/* Protein */}
                <View style={[styles.macroColCard, { backgroundColor: isDarkMode ? '#142018' : '#FFF1F2', borderColor: '#F43F5E' }]}>
                  <Text style={[styles.macroColName, { color: '#F43F5E' }]}>🥩 {t('protein_left', 'Proteine')}</Text>
                  <Text style={[styles.macroColValue, { color: colors.textPrimary }]}>
                    {currentProtein} <Text style={styles.macroColUnit}>g</Text>
                  </Text>
                </View>

                {/* Fat */}
                <View style={[styles.macroColCard, { backgroundColor: isDarkMode ? '#142018' : '#FFFBEB', borderColor: '#F59E0B' }]}>
                  <Text style={[styles.macroColName, { color: '#F59E0B' }]}>🥑 {t('fat_left', 'Grassi')}</Text>
                  <Text style={[styles.macroColValue, { color: colors.textPrimary }]}>
                    {currentFat} <Text style={styles.macroColUnit}>g</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* 5. Comprehensive Micronutrients, Vitamins & Minerals */}
            <View style={styles.microSection}>
              <View style={styles.microSectionHeader}>
                <Ionicons name="sparkles-outline" size={18} color="#BEF264" />
                <Text style={[styles.microSectionTitle, { color: colors.textPrimary }]}>
                  {t('micronutrients_title', 'Dettagli Nutrizionali, Vitamine & Minerali')}
                </Text>
              </View>

              {/* Specific Sub-Macros & Details Grid */}
              <View style={styles.microGrid}>
                {/* Fibre */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🥗</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('fibers', 'Fibre')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.fiberG} g</Text>
                  </View>
                </View>

                {/* Zuccheri */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🍬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('sugars', 'Zuccheri')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.sugarG} g</Text>
                  </View>
                </View>

                {/* Grassi Saturi */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🧈</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('sat_fat', 'Grassi Saturi')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.saturatedFatG} g</Text>
                  </View>
                </View>

                {/* Sodio */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🧂</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('sodium', 'Sodio')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.sodiumMg} mg</Text>
                  </View>
                </View>

                {/* Potassio */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🍌</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('potassium', 'Potassio')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.potassiumMg} mg</Text>
                  </View>
                </View>

                {/* Calcio */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🥛</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('calcium', 'Calcio')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.calciumMg} mg</Text>
                  </View>
                </View>

                {/* Ferro */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🥩</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('iron', 'Ferro')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.ironMg} mg</Text>
                  </View>
                </View>

                {/* Vitamina C */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🍊</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('vitamin_c', 'Vitamina C')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.vitaminCMg} mg</Text>
                  </View>
                </View>

                {/* Vitamina D */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>☀️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('vitamin_d', 'Vitamina D')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.vitaminDIU} IU</Text>
                  </View>
                </View>

                {/* Vitamina A */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🥕</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('vitamin_a', 'Vitamina A')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.vitaminAIU} IU</Text>
                  </View>
                </View>

                {/* Vitamina B12 */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🐟</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('vitamin_b12', 'Vitamina B12')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.vitaminB12Mcg} µg</Text>
                  </View>
                </View>

                {/* Magnesio */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🥜</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('magnesium', 'Magnesio')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.magnesiumMg} mg</Text>
                  </View>
                </View>

                {/* Zinco */}
                <View style={[styles.microCard, { backgroundColor: isDarkMode ? '#18271E' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
                  <Text style={styles.microIcon}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.microLabel, { color: colors.textSecondary }]}>{t('zinc', 'Zinco')}</Text>
                    <Text style={[styles.microValue, { color: colors.textPrimary }]}>{detailedNutrients.zincMg} mg</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: '#EF4444' }]}
              onPress={handleDelete}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
              <Text style={styles.deleteBtnText}>{t('delete', 'Elimina')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.coral }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>{t('save_changes', 'Salva Modifiche')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {/* Custom Delete Confirmation Modal */}
    <DeleteConfirmModal
      visible={showDeleteConfirm}
      itemName={name}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={() => {
        setShowDeleteConfirm(false);
        onDelete(meal.id);
        onClose();
      }}
    />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '92%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 18,
    paddingBottom: 32,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerThumbImg: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollBody: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  inputSection: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 13,
  },
  weightBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  weightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weightTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  weightSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  weightInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    minWidth: 80,
    justifyContent: 'center',
  },
  weightInputText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 40,
    padding: 0,
  },
  weightUnitLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  stepBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroSectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  calHeroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  calHeroLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calHeroValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  calHeroUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroProportionWrap: {
    alignItems: 'flex-end',
    width: 140,
  },
  macroBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 4,
  },
  macroBarSegment: {
    height: '100%',
  },
  macroRatioText: {
    fontSize: 11,
    fontWeight: '600',
  },
  mainMacrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroColCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  macroColName: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  macroColValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroColUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  microSection: {
    marginTop: 4,
  },
  microSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  microSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  microGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  microCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  microIcon: {
    fontSize: 20,
  },
  microLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  microValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  deleteBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
