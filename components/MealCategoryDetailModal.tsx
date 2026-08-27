import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { LoggedMeal } from '@/app/(tabs)/index';
import { MealDetailEditModal } from '@/components/MealDetailEditModal';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';

interface MealCategoryDetailModalProps {
  visible: boolean;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null;
  meals: LoggedMeal[];
  targetCalories: number;
  onClose: () => void;
  onDeleteMeal: (mealId: string) => void;
  onUpdateMeal?: (updatedMeal: LoggedMeal) => void;
  onAddMore: (category: 'breakfast' | 'lunch' | 'dinner' | 'snack') => void;
}

export const MealCategoryDetailModal: React.FC<MealCategoryDetailModalProps> = ({
  visible,
  category,
  meals,
  targetCalories,
  onClose,
  onDeleteMeal,
  onUpdateMeal,
  onAddMore,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [selectedMealForEdit, setSelectedMealForEdit] = useState<LoggedMeal | null>(null);
  const [mealToDelete, setMealToDelete] = useState<LoggedMeal | null>(null);

  if (!category) return null;

  const categoryTitles: Record<string, { title: string; emoji: string; color: string }> = {
    breakfast: { title: t('meal_breakfast'), emoji: '🥐', color: '#FF6B4A' },
    lunch: { title: t('meal_lunch'), emoji: '🥗', color: '#4CAF50' },
    dinner: { title: t('meal_dinner'), emoji: '🥩', color: '#FFA726' },
    snack: { title: t('meal_snack'), emoji: '🍏', color: '#84CC16' },
  };

  const currentConfig = categoryTitles[category] || { title: category, emoji: '🍽️', color: colors.coral };

  const formatMacro = (val?: number): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  };

  const totalCalories = Math.round(meals.reduce((sum, m) => sum + (m.calories || 0), 0));
  const totalProtein = Math.round(meals.reduce((sum, m) => sum + (m.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(meals.reduce((sum, m) => sum + (m.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(meals.reduce((sum, m) => sum + (m.fat || 0), 0) * 10) / 10;

  const handleDeletePrompt = (meal: LoggedMeal) => {
    setMealToDelete(meal);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheetContainer, { backgroundColor: isDarkMode ? '#13201A' : '#FFFFFF' }]}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={[styles.categoryIconBadge, { backgroundColor: isDarkMode ? '#1F2E25' : '#F1F9F1' }]}>
                  <Text style={{ fontSize: 24 }}>{currentConfig.emoji}</Text>
                </View>
                <View>
                  <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                    {currentConfig.title}
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                    {meals.length} {meals.length === 1 ? t('item_logged') : t('items_logged')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Macro Summary Strip */}
            <View style={[styles.macroSummaryBox, { backgroundColor: isDarkMode ? '#1A2920' : '#F8FAFC', borderColor: isDarkMode ? '#243A2E' : '#E2E8F0' }]}>
              <View style={styles.macroSummaryCol}>
                <Text style={[styles.macroSummaryNum, { color: currentConfig.color }]}>{totalCalories}</Text>
                <Text style={styles.macroSummaryLabel}>/ {targetCalories} {t('kcal')}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroSummaryCol}>
                <Text style={[styles.macroSummaryNum, { color: colors.textPrimary }]}>{formatMacro(totalProtein)}g</Text>
                <Text style={styles.macroSummaryLabel}>{t('protein_left')}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroSummaryCol}>
                <Text style={[styles.macroSummaryNum, { color: colors.textPrimary }]}>{formatMacro(totalCarbs)}g</Text>
                <Text style={styles.macroSummaryLabel}>{t('carb_left')}</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroSummaryCol}>
                <Text style={[styles.macroSummaryNum, { color: colors.textPrimary }]}>{formatMacro(totalFat)}g</Text>
                <Text style={styles.macroSummaryLabel}>{t('fat_left')}</Text>
              </View>
            </View>

            {/* List of All Logged Meals for this category */}
            <ScrollView style={styles.mealsList} contentContainerStyle={styles.mealsListContent} showsVerticalScrollIndicator={false}>
              {meals.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>🥣</Text>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t('no_food_logged_yet')}</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    {t('add_items_to_track')}
                  </Text>
                </View>
              ) : (
                meals.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.mealItemCard,
                      {
                        backgroundColor: isDarkMode ? '#1A2A21' : '#FFFFFF',
                        borderColor: isDarkMode ? '#243C2E' : '#EDF2F7',
                      },
                    ]}
                    onPress={() => setSelectedMealForEdit(item)}
                    activeOpacity={0.75}
                  >
                    {/* Left Icon or Image */}
                    <View style={[styles.foodThumbBox, { backgroundColor: isDarkMode ? '#142019' : '#F1F9F1' }]}>
                      {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={styles.foodThumbImg} />
                      ) : (
                        <Text style={{ fontSize: 24 }}>{item.emoji || '🍽️'}</Text>
                      )}
                    </View>

                    {/* Center Details */}
                    <View style={styles.mealInfoCol}>
                      <Text style={[styles.mealItemName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.mealMacroPillsRow}>
                        <Text style={[styles.mealKcalBadge, { color: colors.coral }]}>
                          {item.calories} {t('kcal').toLowerCase()}
                        </Text>
                        <Text style={[styles.mealMacroText, { color: colors.textSecondary }]}>
                          {item.weightG ? `• ${item.weightG}g ` : ''}• {formatMacro(item.protein)}g P • {formatMacro(item.carbs)}g C • {formatMacro(item.fat)}g F
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        {item.time ? (
                          <Text style={[styles.mealTimeText, { color: colors.textMuted }]}>{item.time}</Text>
                        ) : null}
                        <Text style={[styles.editHintText, { color: colors.coral }]}>
                          • {t('tap_to_edit', 'Tocca per modificare / dettagli')}
                        </Text>
                      </View>
                    </View>

                    {/* Right Delete Action */}
                    <TouchableOpacity
                      style={styles.deleteItemBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDeletePrompt(item);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActionsRow}>
              <TouchableOpacity
                style={[
                  styles.addMoreBtn,
                  {
                    backgroundColor: isDarkMode ? '#1C2E24' : '#F0FAF0',
                    borderColor: colors.coral,
                  },
                ]}
                onPress={() => {
                  onClose();
                  onAddMore(category);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.coral} />
                <Text style={[styles.addMoreBtnText, { color: colors.coral }]}>{t('add_food')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.coral }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={styles.doneBtnText}>{t('done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Meal Detail & Edit Modal */}
      {selectedMealForEdit && (
        <MealDetailEditModal
          visible={!!selectedMealForEdit}
          meal={selectedMealForEdit}
          onClose={() => setSelectedMealForEdit(null)}
          onSave={(updated) => {
            onUpdateMeal?.(updated);
            setSelectedMealForEdit(null);
          }}
          onDelete={(id) => {
            onDeleteMeal(id);
            setSelectedMealForEdit(null);
          }}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        visible={!!mealToDelete}
        itemName={mealToDelete?.name}
        onClose={() => setMealToDelete(null)}
        onConfirm={() => {
          if (mealToDelete) {
            onDeleteMeal(mealToDelete.id);
            setMealToDelete(null);
          }
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    paddingBottom: 36,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  macroSummaryCol: {
    alignItems: 'center',
  },
  macroSummaryNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  macroSummaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  macroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
    opacity: 0.5,
  },
  mealsList: {
    maxHeight: 340,
  },
  mealsListContent: {
    gap: 10,
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
  },
  mealItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  foodThumbBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  foodThumbImg: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  mealInfoCol: {
    flex: 1,
  },
  mealItemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  mealMacroPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  mealKcalBadge: {
    fontSize: 12,
    fontWeight: '800',
    marginRight: 4,
  },
  mealMacroText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  mealTimeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  editHintText: {
    fontSize: 10,
    fontWeight: '700',
  },
  deleteItemBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  addMoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  addMoreBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  doneBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 20,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
