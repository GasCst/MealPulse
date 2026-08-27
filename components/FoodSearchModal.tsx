import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import {
  FoodDatabaseService,
  FoodItem,
  getLocalizedPopularFoods,
} from '@/services/foodDatabaseService';
import { UnitService, GRAMS_PER_OZ } from '@/services/unitService';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { FoodQuantityModal } from '@/components/FoodQuantityModal';
import { VocalSearchModal } from '@/components/VocalSearchModal';

export { FoodItem };

interface FoodSearchModalProps {
  visible: boolean;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  onClose: () => void;
  onSelectScanAI: () => void;
  onAddFoods: (foods: FoodItem[]) => void;
  scannedItem?: FoodItem | null;
}

type FilterCategory = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const FoodSearchModal: React.FC<FoodSearchModalProps> = ({
  visible,
  mealType = 'breakfast',
  onClose,
  onSelectScanAI,
  onAddFoods,
  scannedItem,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t, language } = useLanguage();
  const { unitSystem, isPro, openPaywall } = useSubscription();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
  const [foodsList, setFoodsList] = useState<FoodItem[]>(() => getLocalizedPopularFoods(language));
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showVocalModal, setShowVocalModal] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef<number>(0);

  // Initialize foods and reset search on open or language change
  useEffect(() => {
    if (visible) {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchRequestIdRef.current++;
      setSearchQuery('');
      setSelectedItems([]);
      setSelectedCategory('all');
      setIsSearching(false);
      setFoodsList(getLocalizedPopularFoods(language));
    }
  }, [visible, language]);

  const performSearch = async (queryText: string, currentReqId: number) => {
    const clean = queryText.trim();
    if (!clean) {
      if (currentReqId === searchRequestIdRef.current) {
        setIsSearching(false);
        const currentBase = getLocalizedPopularFoods(language);
        if (selectedCategory === 'all') {
          setFoodsList(currentBase);
        } else {
          setFoodsList(currentBase.filter((f) => f.category === selectedCategory));
        }
      }
      return;
    }

    try {
      const results = await FoodDatabaseService.searchFoods(clean, language);
      if (currentReqId === searchRequestIdRef.current) {
        setFoodsList(results);
        setIsSearching(false);
      }
    } catch (err) {
      if (currentReqId === searchRequestIdRef.current) {
        const local = FoodDatabaseService.getLocalMatches(clean, language);
        setFoodsList(local);
        setIsSearching(false);
      }
    }
  };

  // Live debounced search against Open Food Facts (3.3M+ items)
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const currentReqId = ++searchRequestIdRef.current;
    const clean = searchQuery.trim();

    if (!clean) {
      setIsSearching(false);
      const currentBase = getLocalizedPopularFoods(language);
      if (selectedCategory === 'all') {
        setFoodsList(currentBase);
      } else {
        setFoodsList(currentBase.filter((f) => f.category === selectedCategory));
      }
      return;
    }

    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      performSearch(searchQuery, currentReqId);
    }, 250);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery, selectedCategory, language]);

  const handleCategoryFilter = (cat: FilterCategory) => {
    setSelectedCategory(cat);
    const currentBase = getLocalizedPopularFoods(language);
    if (!searchQuery.trim()) {
      if (cat === 'all') {
        setFoodsList(currentBase);
      } else {
        setFoodsList(currentBase.filter((f) => f.category === cat));
      }
    }
  };

  const handleClearSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchRequestIdRef.current++;
    setSearchQuery('');
    setIsSearching(false);
    const currentBase = getLocalizedPopularFoods(language);
    if (selectedCategory === 'all') {
      setFoodsList(currentBase);
    } else {
      setFoodsList(currentBase.filter((f) => f.category === selectedCategory));
    }
  };

  const handleSubmitSearch = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const currentReqId = ++searchRequestIdRef.current;
    if (searchQuery.trim()) {
      setIsSearching(true);
      performSearch(searchQuery, currentReqId);
    }
  };

  const toggleItem = (food: FoodItem) => {
    if (selectedItems.some((i) => i.id === food.id)) {
      setSelectedItems(selectedItems.filter((i) => i.id !== food.id));
    } else {
      setSelectedItems([...selectedItems, food]);
    }
  };

  const handleOpenQuantityModal = (food: FoodItem) => {
    const existing = selectedItems.find((i) => i.id === food.id);
    setEditingFood(existing || food);
    setShowQuantityModal(true);
  };

  const handleSaveQuantity = (updatedFood: FoodItem) => {
    setSelectedItems((prev) => {
      const idx = prev.findIndex((i) => i.id === updatedFood.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedFood;
        return copy;
      }
      return [...prev, updatedFood];
    });

    setFoodsList((prev) =>
      prev.map((item) => (item.id === updatedFood.id ? updatedFood : item))
    );
  };

  const handleAddSelected = () => {
    if (selectedItems.length > 0) {
      onAddFoods(selectedItems);
      setSelectedItems([]);
      onClose();
    }
  };

  const handleBarcodeMealAdded = (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => {
    setShowBarcodeScanner(false);
    const newFood: FoodItem = {
      id: `bc_${Date.now()}`,
      name: meal.name,
      calories: meal.calories,
      portion: '1 porzione',
      weightG: 100,
      baseCalories: meal.calories,
      baseProteinG: meal.protein,
      baseCarbsG: meal.carbs,
      baseFatG: meal.fat,
      baseWeightG: 100,
      emoji: '🏷️',
      proteinG: meal.protein,
      carbsG: meal.carbs,
      fatG: meal.fat,
    };
    onAddFoods([newFood]);
    onClose();
  };

  const mealNameTranslated = t(`meal_${mealType}`) || mealType;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#0B1410' : '#F4F7F5' }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={colors.coral} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{mealNameTranslated}</Text>
            <Text style={styles.databaseBadge}>3.3M+ Database OpenFoodFacts</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={() => setShowBarcodeScanner(true)} activeOpacity={0.7}>
            <Ionicons name="barcode-outline" size={24} color={colors.coral} />
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBarContainer}>
          <View style={[styles.searchBar, { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF' }]}>
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.coral} style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            )}
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={t('search_food_placeholder') || 'Cerca qualsiasi cibo o marca (Farfalle, De Cecco, Nutella)...'}
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSubmitSearch}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF' }]}
            activeOpacity={0.8}
            onPress={() => setShowBarcodeScanner(true)}
          >
            <Ionicons name="barcode-outline" size={18} color={colors.coral} />
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>Barcode</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF' }]}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              onSelectScanAI();
            }}
          >
            <Ionicons name="scan-outline" size={18} color={colors.coral} />
            <Text style={[styles.quickActionText, { color: colors.textPrimary }]}>{t('scan_with_ai')}</Text>
          </TouchableOpacity>
        </View>

        {/* Vocal AI Search Button (Exclusive PRO feature) */}
        <TouchableOpacity
          style={[
            styles.vocalActionBtn,
            {
              backgroundColor: isDarkMode ? '#1E1B4B' : '#F5F3FF',
              borderColor: '#8B5CF6',
            },
          ]}
          activeOpacity={0.8}
          onPress={() => {
            if (!isPro) {
              openPaywall('vocal_ai_search');
              return;
            }
            setShowVocalModal(true);
          }}
        >
          <View style={styles.vocalIconBox}>
            <Ionicons name="mic" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.vocalTextBox}>
            <View style={styles.vocalTitleRow}>
              <Text style={[styles.vocalActionTitle, { color: isDarkMode ? '#E0E7FF' : '#4C1D95' }]}>
                {t('vocal_ai_search', 'Scansione Vocale AI')}
              </Text>
              <View style={styles.vocalProBadge}>
                <Text style={styles.vocalProBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.vocalActionSub}>
              {t('vocal_ai_subtitle', 'Descrivi a voce il tuo pasto con Gemini AI')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
        </TouchableOpacity>

        {/* Category Filters */}
        <View style={styles.filterStripContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterStrip}>
            {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as FilterCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedCategory === cat ? colors.coral : isDarkMode ? '#14221B' : '#FFFFFF',
                  },
                ]}
                onPress={() => handleCategoryFilter(cat)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedCategory === cat ? '#FFFFFF' : colors.textSecondary,
                    },
                  ]}
                >
                  {cat === 'all' ? (language === 'it' ? 'Tutti' : 'All') : t(`meal_${cat}`) || cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results List */}
        <ScrollView style={styles.scrollList} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: selectedItems.length > 0 ? 100 : 40 }}>
          {/* Scanned Barcode Floating Card (if passed) */}
          {scannedItem && (
            <View style={styles.sectionBox}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {language === 'it' ? 'Alimento Scansionato di Recente' : 'Recently Scanned Food'}
              </Text>
              <View style={[styles.foodRow, { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF', borderColor: colors.coral, borderWidth: 1.5 }]}>
                <View style={styles.emojiBox}>
                  <Text style={{ fontSize: 24 }}>{scannedItem.emoji}</Text>
                </View>
                <View style={styles.foodInfo}>
                  <Text style={[styles.foodName, { color: colors.textPrimary }]} numberOfLines={1}>{scannedItem.name}</Text>
                  <Text style={[styles.foodMeta, { color: colors.textSecondary }]}>
                    {scannedItem.calories} kcal • {scannedItem.portion}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Search Results */}
          <View style={styles.sectionBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                {searchQuery.trim()
                  ? (isSearching
                      ? (language === 'it' ? '🔍 Ricerca nel database 3.3M+...' : '🔍 Searching database...')
                      : `${t('search_results') || 'Risultati Ricerca'} (${foodsList.length})`)
                  : (language === 'it' ? '⭐ Alimenti Suggeriti & Base' : '⭐ Suggested Foods & Staples')}
              </Text>
              {isSearching && (
                <ActivityIndicator size="small" color={colors.coral} />
              )}
            </View>

            {foodsList.length === 0 && !isSearching && searchQuery.trim().length > 0 && (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="nutrition-outline" size={42} color="#94A3B8" />
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  {language === 'it' ? `Nessun risultato per "${searchQuery}"` : `No results for "${searchQuery}"`}
                </Text>
                <Text style={styles.emptyStateSub}>
                  {language === 'it'
                    ? 'Prova a cercare un nome generico (es. biscotti, petto di pollo) o usa lo scanner barcode.'
                    : 'Try searching for a broader term or scan the barcode.'}
                </Text>
              </View>
            )}

            {foodsList.map((item) => {
              const selectedMatch = selectedItems.find((i) => i.id === item.id);
              const isSelected = !!selectedMatch;
              const currentItem = selectedMatch || item;
              const displayWeightStr = UnitService.formatFoodWeight(currentItem.weightG || 100, unitSystem);
              const isCustomWeight = currentItem.weightG && currentItem.weightG !== (currentItem.baseWeightG || 100);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.foodRow,
                    { backgroundColor: isDarkMode ? '#14221B' : '#FFFFFF' },
                    isSelected && { borderColor: colors.coral, borderWidth: 1.5 },
                  ]}
                  onPress={() => handleOpenQuantityModal(currentItem)}
                  activeOpacity={0.7}
                >
                  {/* Thumbnail / Emoji */}
                  <View style={styles.emojiBox}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.productThumb} resizeMode="contain" />
                    ) : (
                      <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
                    )}
                  </View>

                  {/* Food Info & Macros */}
                  <View style={styles.foodInfo}>
                    <Text style={[styles.foodName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.brand ? (
                      <Text style={styles.brandText} numberOfLines={1}>{item.brand}</Text>
                    ) : null}

                    {/* Quantity & Reference Badge Row */}
                    <View style={styles.macroRow}>
                      {/* Interactive Portion Chip */}
                      <TouchableOpacity
                        style={[
                          styles.portionChipBtn,
                          {
                            backgroundColor: isCustomWeight
                              ? (isDarkMode ? '#3A2016' : '#FFEDD5')
                              : (isDarkMode ? '#1A2E22' : '#F1F5F9'),
                            borderColor: isCustomWeight ? colors.coral : (isDarkMode ? '#2D4B39' : '#CBD5E1'),
                          },
                        ]}
                        onPress={() => handleOpenQuantityModal(currentItem)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="scale-outline" size={11} color={colors.coral} />
                        <Text
                          style={[
                            styles.portionChipText,
                            { color: isCustomWeight ? colors.coral : colors.textPrimary },
                          ]}
                        >
                          {displayWeightStr}
                        </Text>
                        <Ionicons name="pencil" size={10} color={colors.coral} style={{ marginLeft: 2 }} />
                      </TouchableOpacity>

                      {/* Calorie value */}
                      <Text style={[styles.calorieBadge, { color: colors.coral }]}>
                        {currentItem.calories} kcal
                      </Text>

                      {/* Macros Pills */}
                      <Text style={[styles.macroPill, { backgroundColor: '#FEE2E2', color: '#DC2626' }]}>
                        P: {currentItem.proteinG || 0}g
                      </Text>
                      <Text style={[styles.macroPill, { backgroundColor: '#FEF3C7', color: '#D97706' }]}>
                        C: {currentItem.carbsG || 0}g
                      </Text>
                      <Text style={[styles.macroPill, { backgroundColor: '#E0F2FE', color: '#0284C7' }]}>
                        F: {currentItem.fatG || 0}g
                      </Text>
                    </View>
                  </View>

                  {/* Selection Button */}
                  <TouchableOpacity
                    style={[
                      styles.addCircle,
                      { backgroundColor: isSelected ? colors.coral : isDarkMode ? '#22382D' : '#F1F5F9' },
                    ]}
                    onPress={() => toggleItem(currentItem)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={isSelected ? 'checkmark' : 'add'}
                      size={20}
                      color={isSelected ? '#FFFFFF' : colors.coral}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Floating Bottom Add Button */}
        {selectedItems.length > 0 && (
          <View style={styles.bottomBarContainer}>
            <TouchableOpacity
              style={[styles.addMealBtn, { backgroundColor: colors.coral }]}
              onPress={handleAddSelected}
              activeOpacity={0.85}
            >
              <Text style={styles.addMealBtnText}>
                {t('add_to_meal_btn')} {mealNameTranslated}
              </Text>
              <View style={styles.badgeCircle}>
                <Text style={styles.badgeText}>{selectedItems.length}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Barcode Scanner Modal Integration */}
        <BarcodeScannerModal
          visible={showBarcodeScanner}
          onClose={() => setShowBarcodeScanner(false)}
          onMealAdded={handleBarcodeMealAdded}
        />

        {/* Vocal AI Search Modal Integration */}
        <VocalSearchModal
          visible={showVocalModal}
          onClose={() => setShowVocalModal(false)}
          onMealsAdded={(meals) => {
            const convertedItems: FoodItem[] = meals.map((m, idx) => {
              const safeWeight = m.weightG && m.weightG > 0 ? m.weightG : 100;
              const ratio = 100 / safeWeight;
              return {
                id: `vocal_${Date.now()}_${idx}`,
                name: m.name,
                calories: m.calories,
                portion: m.portion || `${safeWeight}g`,
                weightG: safeWeight,
                baseCalories: Math.round(m.calories * ratio),
                baseProteinG: Math.round((m.protein || 0) * ratio * 10) / 10,
                baseCarbsG: Math.round((m.carbs || 0) * ratio * 10) / 10,
                baseFatG: Math.round((m.fat || 0) * ratio * 10) / 10,
                baseWeightG: 100,
                emoji: '🎙️',
                proteinG: m.protein,
                carbsG: m.carbs,
                fatG: m.fat,
              };
            });
            onAddFoods(convertedItems);
            onClose();
          }}
        />

        {/* Food Quantity & Portion Editor Modal */}
        <FoodQuantityModal
          visible={showQuantityModal}
          food={editingFood}
          onClose={() => setShowQuantityModal(false)}
          onConfirm={handleSaveQuantity}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  databaseBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 2,
  },
  moreBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  vocalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  vocalIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vocalTextBox: {
    flex: 1,
  },
  vocalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vocalActionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  vocalProBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  vocalProBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  vocalActionSub: {
    fontSize: 11,
    color: '#8B5CF6',
    marginTop: 1,
    fontWeight: '500',
  },
  filterStripContainer: {
    marginBottom: 10,
  },
  filterStrip: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  sectionBox: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productThumb: {
    width: 38,
    height: 38,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  portionChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  portionChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  calorieBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  macroPill: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  foodMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  addCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  addMealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  addMealBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  badgeCircle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
});
