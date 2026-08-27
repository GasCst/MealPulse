import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { FoodItem } from '@/services/foodDatabaseService';
import { UnitService, UnitSystem, GRAMS_PER_OZ } from '@/services/unitService';

interface FoodQuantityModalProps {
  visible: boolean;
  food: FoodItem | null;
  onClose: () => void;
  onConfirm: (updatedFood: FoodItem) => void;
}

type QuantityMode = 'g' | 'oz' | 'serving';

export const FoodQuantityModal: React.FC<FoodQuantityModalProps> = ({
  visible,
  food,
  onClose,
  onConfirm,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const { unitSystem } = useSubscription();

  const [activeUnit, setActiveUnit] = useState<QuantityMode>(() =>
    unitSystem === 'imperial' ? 'oz' : 'g'
  );
  const [inputValue, setInputValue] = useState<string>('100');

  // Base pristine nutrition values
  const baseWeightG = food?.baseWeightG || 100;
  const baseKcal = food?.baseCalories ?? food?.calories ?? 0;
  const baseProtein = food?.baseProteinG ?? food?.proteinG ?? 0;
  const baseCarbs = food?.baseCarbsG ?? food?.carbsG ?? 0;
  const baseFat = food?.baseFatG ?? food?.fatG ?? 0;

  // Initialize input value when food opens or changes
  useEffect(() => {
    if (visible && food) {
      const initialGrams = food.weightG || 100;
      const initialUnit = unitSystem === 'imperial' ? 'oz' : 'g';
      setActiveUnit(initialUnit);

      if (initialUnit === 'oz') {
        const ozVal = (initialGrams / GRAMS_PER_OZ).toFixed(1);
        setInputValue(ozVal.endsWith('.0') ? ozVal.slice(0, -2) : ozVal);
      } else {
        setInputValue(String(Math.round(initialGrams)));
      }
    }
  }, [visible, food, unitSystem]);

  if (!food) return null;

  // Calculate current grams based on active unit & input value
  const numVal = parseFloat(inputValue.replace(',', '.')) || 0;
  let currentGrams = 100;

  if (activeUnit === 'oz') {
    currentGrams = Math.max(0, numVal * GRAMS_PER_OZ);
  } else if (activeUnit === 'serving') {
    // 1 serving is assumed to be baseWeightG (e.g. 100g or package serving)
    currentGrams = Math.max(0, numVal * baseWeightG);
  } else {
    currentGrams = Math.max(0, numVal);
  }

  // Recalculate live macros
  const calculated = UnitService.recalculateMacros(
    baseKcal,
    baseProtein,
    baseCarbs,
    baseFat,
    baseWeightG,
    currentGrams
  );

  const handleUnitChange = (newUnit: QuantityMode) => {
    if (newUnit === activeUnit) return;
    setActiveUnit(newUnit);

    if (newUnit === 'oz') {
      const oz = (currentGrams / GRAMS_PER_OZ).toFixed(1);
      setInputValue(oz.endsWith('.0') ? oz.slice(0, -2) : oz);
    } else if (newUnit === 'g') {
      setInputValue(String(Math.round(currentGrams)));
    } else if (newUnit === 'serving') {
      const serv = (currentGrams / baseWeightG).toFixed(1);
      setInputValue(serv.endsWith('.0') ? serv.slice(0, -2) : serv);
    }
  };

  const handleStep = (delta: number) => {
    const current = parseFloat(inputValue.replace(',', '.')) || 0;
    let nextVal = current;

    if (activeUnit === 'oz') {
      nextVal = Math.max(0.5, Number((current + delta * 0.5).toFixed(1)));
    } else if (activeUnit === 'serving') {
      nextVal = Math.max(0.25, Number((current + delta * 0.25).toFixed(2)));
    } else {
      nextVal = Math.max(5, Math.round(current + delta * 25));
    }

    setInputValue(String(nextVal));
  };

  const handlePresetSelect = (grams: number) => {
    if (activeUnit === 'oz') {
      const oz = (grams / GRAMS_PER_OZ).toFixed(1);
      setInputValue(oz.endsWith('.0') ? oz.slice(0, -2) : oz);
    } else if (activeUnit === 'serving') {
      const serv = (grams / baseWeightG).toFixed(1);
      setInputValue(serv.endsWith('.0') ? serv.slice(0, -2) : serv);
    } else {
      setInputValue(String(Math.round(grams)));
    }
  };

  const handleConfirm = () => {
    const safeGrams = Math.max(1, Math.round(currentGrams));
    let portionLabel = `${safeGrams}g`;

    if (activeUnit === 'oz') {
      portionLabel = `${(safeGrams / GRAMS_PER_OZ).toFixed(1)} oz (${safeGrams}g)`;
    } else if (activeUnit === 'serving') {
      portionLabel = `${numVal} ${t('portion') || 'porzione'} (${safeGrams}g)`;
    }

    const updatedFood: FoodItem = {
      ...food,
      weightG: safeGrams,
      portion: portionLabel,
      calories: calculated.calories,
      proteinG: calculated.proteinG,
      carbsG: calculated.carbsG,
      fatG: calculated.fatG,
      baseCalories: baseKcal,
      baseProteinG: baseProtein,
      baseCarbsG: baseCarbs,
      baseFatG: baseFat,
      baseWeightG: baseWeightG,
    };

    onConfirm(updatedFood);
    onClose();
  };

  const metricPresets = [50, 80, 100, 150, 200, 250, 300];
  const imperialPresets = [
    { label: '1.8 oz (50g)', grams: 50 },
    { label: '3.5 oz (100g)', grams: 100 },
    { label: '5.3 oz (150g)', grams: 150 },
    { label: '7.0 oz (200g)', grams: 200 },
    { label: '8.8 oz (250g)', grams: 250 },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity style={styles.dismissOverlay} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheetContainer, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
          {/* Top Handle Bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleBox}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {t('quantity_portion') || 'Quantità & Porzione'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
                {language === 'it'
                  ? 'I macronutrienti si ricalcolano automaticamente'
                  : 'Macros automatically recalculate in real-time'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#22382D' : '#F1F5F9' }]} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Food Info Summary Card */}
            <View style={[styles.foodSummaryCard, { backgroundColor: isDarkMode ? '#1A2B23' : '#F8FAFC', borderColor: isDarkMode ? '#284437' : '#E2E8F0' }]}>
              <View style={styles.emojiThumb}>
                {food.imageUrl ? (
                  <Image source={{ uri: food.imageUrl }} style={styles.thumbImg} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: 28 }}>{food.emoji}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {food.name}
                </Text>
                {food.brand ? (
                  <Text style={styles.brandName} numberOfLines={1}>{food.brand}</Text>
                ) : null}
                <Text style={[styles.referenceBaseText, { color: colors.textSecondary }]}>
                  {language === 'it' ? 'Riferimento base:' : 'Base reference:'} {baseKcal} kcal / {baseWeightG}g ({((baseWeightG / GRAMS_PER_OZ).toFixed(1))} oz)
                </Text>
              </View>
            </View>

            {/* Unit Selector Tabs */}
            <View style={[styles.unitSelectorContainer, { backgroundColor: isDarkMode ? '#0F1A15' : '#EEF2F6' }]}>
              <TouchableOpacity
                style={[styles.unitTab, activeUnit === 'g' && styles.unitTabActive]}
                onPress={() => handleUnitChange('g')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitTabText, activeUnit === 'g' && styles.unitTabTextActive]}>
                  {t('unit_grams') || 'Grammi (g)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.unitTab, activeUnit === 'oz' && styles.unitTabActive]}
                onPress={() => handleUnitChange('oz')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitTabText, activeUnit === 'oz' && styles.unitTabTextActive]}>
                  {t('unit_ounces') || 'Once (oz)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.unitTab, activeUnit === 'serving' && styles.unitTabActive]}
                onPress={() => handleUnitChange('serving')}
                activeOpacity={0.8}
              >
                <Text style={[styles.unitTabText, activeUnit === 'serving' && styles.unitTabTextActive]}>
                  {t('unit_servings') || 'Porzioni'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stepper & Numeric Input Box */}
            <View style={styles.inputSection}>
              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: isDarkMode ? '#22382D' : '#F1F5F9' }]}
                onPress={() => handleStep(-1)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={24} color={colors.coral} />
              </TouchableOpacity>

              <View style={[styles.inputBox, { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF', borderColor: colors.coral }]}>
                <TextInput
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  value={inputValue}
                  onChangeText={setInputValue}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  autoFocus={false}
                />
                <Text style={[styles.inputUnitSuffix, { color: colors.coral }]}>
                  {activeUnit === 'g' ? 'g' : activeUnit === 'oz' ? 'oz' : 'x'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.stepperBtn, { backgroundColor: isDarkMode ? '#22382D' : '#F1F5F9' }]}
                onPress={() => handleStep(1)}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color={colors.coral} />
              </TouchableOpacity>
            </View>

            {/* Quick Portion Preset Chips */}
            <Text style={[styles.presetsTitle, { color: colors.textSecondary }]}>
              {language === 'it' ? 'Porzioni Rapide:' : 'Quick Portions:'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {activeUnit === 'oz'
                ? imperialPresets.map((p) => {
                    const isSelected = Math.abs(currentGrams - p.grams) < 3;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[
                          styles.presetChip,
                          { backgroundColor: isDarkMode ? '#1E3329' : '#F1F5F9' },
                          isSelected && { backgroundColor: colors.coral, borderColor: colors.coral },
                        ]}
                        onPress={() => handlePresetSelect(p.grams)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.presetChipText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                : metricPresets.map((g) => {
                    const isSelected = Math.abs(currentGrams - g) < 2;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.presetChip,
                          { backgroundColor: isDarkMode ? '#1E3329' : '#F1F5F9' },
                          isSelected && { backgroundColor: colors.coral, borderColor: colors.coral },
                        ]}
                        onPress={() => handlePresetSelect(g)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.presetChipText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                          {g}g
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>

            {/* Dynamic Real-time Recalculated Macros Card */}
            <View style={[styles.macroDisplayCard, { backgroundColor: isDarkMode ? '#182B21' : '#F8FAFC', borderColor: isDarkMode ? '#2A4738' : '#E2E8F0' }]}>
              <View style={styles.totalKcalBanner}>
                <Text style={styles.totalKcalLabel}>
                  {language === 'it' ? 'CALORIE TOTALI' : 'TOTAL CALORIES'}
                </Text>
                <Text style={[styles.totalKcalVal, { color: colors.coral }]}>
                  {calculated.calories} <Text style={{ fontSize: 16, fontWeight: '600' }}>kcal</Text>
                </Text>
                <Text style={[styles.weightPillSub, { color: colors.textSecondary }]}>
                  {Math.round(currentGrams)}g • {((currentGrams / GRAMS_PER_OZ).toFixed(1))} oz
                </Text>
              </View>

              <View style={styles.macrosThreeColumns}>
                {/* Protein */}
                <View style={[styles.macroCol, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.macroColVal, { color: '#DC2626' }]}>
                    {calculated.proteinG}g
                  </Text>
                  <Text style={styles.macroColLabel}>{t('protein_left') || 'Proteine'}</Text>
                </View>

                {/* Carbs */}
                <View style={[styles.macroCol, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.macroColVal, { color: '#D97706' }]}>
                    {calculated.carbsG}g
                  </Text>
                  <Text style={styles.macroColLabel}>{t('carb_left') || 'Carboidrati'}</Text>
                </View>

                {/* Fat */}
                <View style={[styles.macroCol, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.macroColVal, { color: '#0284C7' }]}>
                    {calculated.fatG}g
                  </Text>
                  <Text style={styles.macroColLabel}>{t('fat_left') || 'Grassi'}</Text>
                </View>
              </View>
            </View>

            {/* Confirmation Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.coral }]}
                onPress={handleConfirm}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>
                  {t('save_portion') || 'Salva Porzione'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '88%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  emojiThumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: {
    width: 44,
    height: 44,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
  },
  brandName: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 1,
  },
  referenceBaseText: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  unitSelectorContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  unitTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  unitTabActive: {
    backgroundColor: '#FF6B4A',
  },
  unitTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  unitTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 56,
    minWidth: 140,
  },
  inputField: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 0,
  },
  inputUnitSuffix: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 6,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  macroDisplayCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  totalKcalBanner: {
    alignItems: 'center',
    marginBottom: 14,
  },
  totalKcalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  totalKcalVal: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 2,
  },
  weightPillSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  macrosThreeColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  macroCol: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  macroColVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroColLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  actionsRow: {
    marginTop: 6,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 26,
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
