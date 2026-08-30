import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export interface ScannedNutritionData {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_weight_g?: number;
  item_count?: number;
  unit_weight_g?: number;
  insights?: string;
  health_score?: 'A' | 'B' | 'C' | 'D';
  image_uri?: string;
}

interface AINutritionResultModalProps {
  visible: boolean;
  data: ScannedNutritionData | null;
  onClose: () => void;
  onConfirm: (finalData: ScannedNutritionData & { servingMultiplier: number }) => void;
}

export const AINutritionResultModal: React.FC<AINutritionResultModalProps> = ({
  visible,
  data,
  onClose,
  onConfirm,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [servingMultiplier, setServingMultiplier] = useState<number>(1.0);

  if (!data) return null;

  const currentCalories = Math.round(data.calories * servingMultiplier);
  const currentProtein = Math.round(data.protein_g * servingMultiplier);
  const currentCarbs = Math.round(data.carbs_g * servingMultiplier);
  const currentFat = Math.round(data.fat_g * servingMultiplier);
  const currentWeight = Math.round((data.estimated_weight_g || 100) * servingMultiplier);

  const healthScore = data.health_score || (data.protein_g > 15 && data.fat_g < 15 ? 'A' : data.fat_g > 20 ? 'C' : 'B');

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'A': return '#4CAF50';
      case 'B': return '#84CC16';
      case 'C': return '#FFA726';
      case 'D': return '#EF4444';
      default: return '#84CC16';
    }
  };

  const getScoreDescription = (score: string) => {
    switch (score) {
      case 'A':
        return 'Super nutrient-dense, rich in lean protein and essential vitamins with minimal saturated fat.';
      case 'B':
        return 'Healthy and balanced. Nutrient-packed fuel providing steady sustained energy.';
      case 'C':
        return data.insights || 'Neutral balance of essential nutrients alongside moderate fats and sugars. Enjoy in moderation.';
      case 'D':
        return 'High in calories and saturated fats. Best paired with fiber and plenty of hydration.';
      default:
        return data.insights || 'Balanced macro profile.';
    }
  };

  const handleConfirm = () => {
    onConfirm({
      ...data,
      calories: currentCalories,
      protein_g: currentProtein,
      carbs_g: currentCarbs,
      fat_g: currentFat,
      estimated_weight_g: currentWeight,
      servingMultiplier,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#0B1410' : '#F2F9F2' }]}>
        {/* Top Close Button */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.coral} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Dish Title & Image Row */}
          <View style={styles.dishHeaderRow}>
            <View style={styles.titleAndMacrosCol}>
              <Text style={[styles.dishTitle, { color: colors.textPrimary }]}>
                {data.food_name}
              </Text>

              {/* 2x2 Macro Grid */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentCalories}</Text>
                  <Text style={styles.macroUnit}>{t('kcal')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentProtein}g</Text>
                  <Text style={styles.macroUnit}>{t('protein_left')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentCarbs}g</Text>
                  <Text style={styles.macroUnit}>{t('carb_left')}</Text>
                </View>
                <View style={styles.macroCell}>
                  <Text style={[styles.macroNum, { color: colors.textPrimary }]}>{currentFat}g</Text>
                  <Text style={styles.macroUnit}>{t('fat_left')}</Text>
                </View>
              </View>
            </View>

            {/* Food Image / Visual */}
            <View style={styles.foodImageContainer}>
              {data.image_uri ? (
                <Image source={{ uri: data.image_uri }} style={styles.foodImage} />
              ) : (
                <View style={[styles.foodImagePlaceholder, { backgroundColor: isDarkMode ? '#1A2E22' : '#EFF8F2' }]}>
                  <Text style={{ fontSize: 64 }}>🍽️</Text>
                </View>
              )}
            </View>
          </View>

          {/* Serving Section */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>{t('serving')}</Text>
            <View style={[styles.servingBox, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              {/* Stepper */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServingMultiplier(Math.max(0.5, +(servingMultiplier - 0.5).toFixed(1)))}
                >
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                  {servingMultiplier.toFixed(1)}
                </Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setServingMultiplier(+(servingMultiplier + 0.5).toFixed(1))}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Portion Dropdown Display */}
              <View style={[styles.portionDisplay, { borderColor: isDarkMode ? '#22382D' : '#E2E8F0' }]}>
                <Text style={[styles.portionText, { color: colors.textPrimary }]}>
                  {t('portion')} ({currentWeight}g)
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </View>
            </View>
          </View>

          {/* Nutrition Health Grade Section */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>{t('nutrition')}</Text>
            <View style={[styles.gradeCard, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              <View style={[styles.gradeCircle, { borderColor: getScoreColor(healthScore) }]}>
                <Text style={[styles.gradeLetter, { color: getScoreColor(healthScore) }]}>
                  {healthScore}
                </Text>
              </View>
              <View style={styles.gradeDetails}>
                <Text style={[styles.gradeDesc, { color: colors.textSecondary }]}>
                  {getScoreDescription(healthScore)}
                </Text>
              </View>
            </View>
          </View>

          {/* Medical Disclaimer */}
          <View style={[styles.medicalNoteBox, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
            <Ionicons name="medkit-outline" size={14} color={colors.lime} style={{ marginTop: 2 }} />
            <Text style={[styles.medicalNoteText, { color: colors.textSecondary }]}>
              {t('medical_disclaimer_text')}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom Confirm Button */}
        <View style={styles.bottomBarContainer}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.coral }]}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>{t('confirm')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dishHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  titleAndMacrosCol: {
    flex: 1,
    paddingRight: 16,
  },
  dishTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 28,
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  macroCell: {
    width: '45%',
  },
  macroNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  macroUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  foodImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  servingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 10,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  portionDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  portionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  gradeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  gradeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLetter: {
    fontSize: 24,
    fontWeight: '900',
  },
  gradeDetails: {
    flex: 1,
  },
  gradeDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B4A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  medicalNoteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 80,
  },
  medicalNoteText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
});
