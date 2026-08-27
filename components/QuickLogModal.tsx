import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface QuickLogModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal: (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
  onLogWater?: (amountMl: number) => void;
  onLogWeight?: (weightKg: number) => void;
  mealBudgets?: {
    breakfast: { current: number; target: number };
    lunch: { current: number; target: number };
    dinner: { current: number; target: number };
    snack: { current: number; target: number };
  };
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  visible,
  onClose,
  onSelectMeal,
  onLogWater,
  onLogWeight,
  mealBudgets = {
    breakfast: { current: 490, target: 450 },
    snack: { current: 130, target: 200 },
    lunch: { current: 250, target: 600 },
    dinner: { current: 200, target: 600 },
  },
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'meal' | 'water' | 'weight'>('meal');

  const getMealStatus = (current: number, target: number) => {
    const diff = target - current;
    if (diff < 0) {
      return { text: `${Math.abs(diff)} ${t('kcal_over')}`, isOver: true };
    }
    return { text: `${diff} ${t('kcal_left_small')}`, isOver: false };
  };

  const breakfastStatus = getMealStatus(mealBudgets.breakfast.current, mealBudgets.breakfast.target);
  const snackStatus = getMealStatus(mealBudgets.snack.current, mealBudgets.snack.target);
  const lunchStatus = getMealStatus(mealBudgets.lunch.current, mealBudgets.lunch.target);
  const dinnerStatus = getMealStatus(mealBudgets.dinner.current, mealBudgets.dinner.target);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheetContainer, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
              {/* Sheet Handle */}
              <View style={styles.handle} />

              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('quick_log_title')}</Text>

              {/* Segment Switcher */}
              <View style={[styles.segmentContainer, { backgroundColor: isDarkMode ? '#1B2E24' : '#F1F5F9' }]}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    activeTab === 'meal' && [
                      styles.segmentBtnActive,
                      { backgroundColor: isDarkMode ? '#224732' : '#D1FADF' },
                    ],
                  ]}
                  onPress={() => setActiveTab('meal')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={14}
                    color={activeTab === 'meal' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: activeTab === 'meal' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B' },
                      activeTab === 'meal' && styles.segmentBtnTextActive,
                    ]}
                  >
                    {t('meal')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    activeTab === 'water' && [
                      styles.segmentBtnActive,
                      { backgroundColor: isDarkMode ? '#224732' : '#D1FADF' },
                    ],
                  ]}
                  onPress={() => setActiveTab('water')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="water-outline"
                    size={14}
                    color={activeTab === 'water' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: activeTab === 'water' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B' },
                      activeTab === 'water' && styles.segmentBtnTextActive,
                    ]}
                  >
                    {t('water')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    activeTab === 'weight' && [
                      styles.segmentBtnActive,
                      { backgroundColor: isDarkMode ? '#224732' : '#D1FADF' },
                    ],
                  ]}
                  onPress={() => setActiveTab('weight')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={14}
                    color={activeTab === 'weight' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B'}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      { color: activeTab === 'weight' ? (isDarkMode ? '#66BB6A' : '#15803D') : '#64748B' },
                      activeTab === 'weight' && styles.segmentBtnTextActive,
                    ]}
                  >
                    {t('weight')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              {activeTab === 'meal' && (
                <View style={styles.gridContainer}>
                  {/* Row 1 */}
                  <View style={styles.gridRow}>
                    {/* Breakfast */}
                    <TouchableOpacity
                      style={[
                        styles.mealCard,
                        { backgroundColor: isDarkMode ? '#2A1815' : '#FFF0ED', borderColor: '#FFD5CC' },
                      ]}
                      onPress={() => {
                        onClose();
                        onSelectMeal('breakfast');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.plusCircle, { backgroundColor: '#FF6B4A' }]}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.mealCardTitle, { color: colors.textPrimary }]}>{t('meal_breakfast')}</Text>
                      <Text style={[styles.mealCardStatus, { color: breakfastStatus.isOver ? '#EF4444' : '#64748B' }]}>
                        {breakfastStatus.text}
                      </Text>
                    </TouchableOpacity>

                    {/* Snack */}
                    <TouchableOpacity
                      style={[
                        styles.mealCard,
                        { backgroundColor: isDarkMode ? '#13281E' : '#EFF8F2', borderColor: '#C8E6C9' },
                      ]}
                      onPress={() => {
                        onClose();
                        onSelectMeal('snack');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.plusCircle, { backgroundColor: '#4CAF50' }]}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.mealCardTitle, { color: colors.textPrimary }]}>{t('meal_snack')}</Text>
                      <Text style={[styles.mealCardStatus, { color: snackStatus.isOver ? '#EF4444' : '#4CAF50' }]}>
                        {snackStatus.text}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.gridRow}>
                    {/* Lunch */}
                    <TouchableOpacity
                      style={[
                        styles.mealCard,
                        { backgroundColor: isDarkMode ? '#172E1B' : '#F4FBF1', borderColor: '#DCFCE7' },
                      ]}
                      onPress={() => {
                        onClose();
                        onSelectMeal('lunch');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.plusCircle, { backgroundColor: '#FF8A65' }]}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.mealCardTitle, { color: colors.textPrimary }]}>{t('meal_lunch')}</Text>
                      <Text style={[styles.mealCardStatus, { color: lunchStatus.isOver ? '#EF4444' : '#4CAF50' }]}>
                        {lunchStatus.text}
                      </Text>
                    </TouchableOpacity>

                    {/* Dinner */}
                    <TouchableOpacity
                      style={[
                        styles.mealCard,
                        { backgroundColor: isDarkMode ? '#2B2715' : '#FFF9E6', borderColor: '#FEF08A' },
                      ]}
                      onPress={() => {
                        onClose();
                        onSelectMeal('dinner');
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.plusCircle, { backgroundColor: '#FFA726' }]}>
                        <Ionicons name="add" size={20} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.mealCardTitle, { color: colors.textPrimary }]}>{t('meal_dinner')}</Text>
                      <Text style={[styles.mealCardStatus, { color: dinnerStatus.isOver ? '#EF4444' : '#64748B' }]}>
                        {dinnerStatus.text}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeTab === 'water' && (
                <View style={styles.extraTabBox}>
                  <Text style={[styles.extraTabLabel, { color: colors.textPrimary }]}>{t('log_water_intake')}</Text>
                  <View style={styles.waterStepperRow}>
                    <TouchableOpacity
                      style={styles.waterQuickBtn}
                      onPress={() => {
                        if (onLogWater) onLogWater(250);
                        onClose();
                      }}
                    >
                      <Ionicons name="water" size={20} color="#0284C7" />
                      <Text style={styles.waterBtnText}>+250 ml (1 {t('glasses')})</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.waterQuickBtn}
                      onPress={() => {
                        if (onLogWater) onLogWater(500);
                        onClose();
                      }}
                    >
                      <Ionicons name="water" size={24} color="#0284C7" />
                      <Text style={styles.waterBtnText}>+500 ml (2 {t('glasses')})</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {activeTab === 'weight' && (
                <View style={styles.extraTabBox}>
                  <Text style={[styles.extraTabLabel, { color: colors.textPrimary }]}>{t('log_weight_today')}</Text>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: colors.coral }]}
                    onPress={() => {
                      if (onLogWeight) onLogWeight(70);
                      onClose();
                    }}
                  >
                    <Text style={styles.confirmBtnText}>{t('save_settings')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentBtnTextActive: {
    fontWeight: '800',
  },
  gridContainer: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mealCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    minHeight: 115,
    justifyContent: 'space-between',
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
  },
  mealCardStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  extraTabBox: {
    paddingVertical: 16,
    alignItems: 'center',
    gap: 16,
  },
  extraTabLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  waterStepperRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  waterQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    paddingVertical: 16,
    borderRadius: 18,
    gap: 8,
  },
  waterBtnText: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
