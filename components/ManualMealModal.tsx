import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/context/LanguageContext';

interface FoodItem {
  id: string;
  name: string;
  nameIt: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  category: string;
}

const LOCAL_FOOD_DB: FoodItem[] = [
  { id: '1', name: 'Chicken Breast (Grilled)', nameIt: 'Petto di Pollo alla Griglia', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g', category: '🥩 Proteine' },
  { id: '2', name: 'White Rice (Cooked)', nameIt: 'Riso Bianco Cotto', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, serving: '100g', category: '🌾 Carboidrati' },
  { id: '3', name: 'Pasta with Tomato Sauce', nameIt: 'Pasta al Pomodoro', calories: 158, protein: 5.5, carbs: 31, fat: 1.2, serving: '100g', category: '🍝 Pasta & Primi' },
  { id: '4', name: 'Egg (Whole, Boiled)', nameIt: 'Uovo Sodo Grande', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, serving: '1 uovo (50g)', category: '🥚 Uova & Latticini' },
  { id: '5', name: 'Greek Yogurt 0%', nameIt: 'Yogurt Greco 0% Grassi', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, serving: '100g', category: '🥛 Latticini' },
  { id: '6', name: 'Pizza Margherita', nameIt: 'Pizza Margherita (Fetta)', calories: 250, protein: 10, carbs: 32, fat: 9, serving: '1 fetta (100g)', category: '🍕 Fast Food' },
  { id: '7', name: 'Apple (Fresh)', nameIt: 'Mela Fresca', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, serving: '1 mela media (150g)', category: '🍎 Frutta' },
  { id: '8', name: 'Salmon Fillet (Baked)', nameIt: 'Filetto di Salmone al Forno', calories: 206, protein: 22, carbs: 0, fat: 13, serving: '100g', category: '🐟 Pesce' },
  { id: '9', name: 'Extra Virgin Olive Oil', nameIt: 'Olio Extravergine d\'Oliva', calories: 119, protein: 0, carbs: 0, fat: 13.5, serving: '1 cucchiaio (13ml)', category: '🥑 Grassi Sani' },
  { id: '10', name: 'Banana', nameIt: 'Banana Fresca', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, serving: '1 banana media (118g)', category: '🍌 Frutta' },
  { id: '11', name: 'Oats / Oatmeal', nameIt: 'Fiocchi d\'Avena', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, serving: '100g', category: '🥣 Colazione' },
  { id: '12', name: 'Almonds', nameIt: 'Mandorle Tostate', calories: 579, protein: 21, carbs: 22, fat: 49, serving: '30g (manciata)', category: '🥜 Frutta Secca' },
  { id: '13', name: 'Avocado', nameIt: 'Avocado Fresco', calories: 160, protein: 2, carbs: 8.5, fat: 15, serving: '1/2 avocado (100g)', category: '🥑 Grassi Sani' },
  { id: '14', name: 'Mozzarella di Bufala', nameIt: 'Mozzarella di Bufala', calories: 280, protein: 16, carbs: 1.5, fat: 23, serving: '100g', category: '🧀 Formaggi' },
  { id: '15', name: 'Protein Shake (Whey)', nameIt: 'Shake Proteico Whey', calories: 120, protein: 24, carbs: 2, fat: 1.5, serving: '1 misurino (30g)', category: '💪 Integratori' },
  { id: '16', name: 'Espresso Coffee', nameIt: 'Caffè Espresso (senza zucchero)', calories: 2, protein: 0.1, carbs: 0, fat: 0, serving: '1 tazzina', category: '☕ Bevande' },
];

interface ManualMealModalProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void;
}

export const ManualMealModal: React.FC<ManualMealModalProps> = ({
  visible,
  onClose,
  onMealAdded,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'search' | 'custom'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom meal input state
  const [customName, setCustomName] = useState('');
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  const filteredFoods = LOCAL_FOOD_DB.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameIt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectFood = (item: FoodItem) => {
    onMealAdded({
      name: item.nameIt,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    });
    onClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const kcal = parseInt(customCalories, 10) || 0;
    const p = parseFloat(customProtein) || 0;
    const c = parseFloat(customCarbs) || 0;
    const f = parseFloat(customFat) || 0;

    onMealAdded({
      name: customName.trim(),
      calories: kcal,
      protein: p,
      carbs: c,
      fat: f,
    });

    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>{t('manual_logger_title')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Segmented Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'search' && styles.activeTabItem]}
              onPress={() => setActiveTab('search')}
            >
              <Ionicons name="search" size={16} color={activeTab === 'search' ? '#0F172A' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
                Offline Food DB
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'custom' && styles.activeTabItem]}
              onPress={() => setActiveTab('custom')}
            >
              <Ionicons name="create-outline" size={16} color={activeTab === 'custom' ? '#0F172A' : '#64748B'} />
              <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
                Quick Custom Entry
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'search' ? (
            <View style={styles.tabContent}>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cerca pollo, riso, mela, pasta..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.foodList} showsVerticalScrollIndicator={false}>
                {filteredFoods.map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.foodRow}
                    onPress={() => handleSelectFood(food)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodName}>{food.nameIt}</Text>
                      <Text style={styles.foodCategory}>{food.category} • {food.serving}</Text>
                    </View>
                    <View style={styles.foodMacros}>
                      <Text style={styles.foodKcal}>{food.calories} kcal</Text>
                      <Text style={styles.foodMacroSub}>P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g</Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color="#84CC16" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <ScrollView style={styles.customForm} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Nome Pasto / Cibo *</Text>
              <TextInput
                style={styles.input}
                placeholder="es. Panino Bresaola e Parmigiano"
                placeholderTextColor="#94A3B8"
                value={customName}
                onChangeText={setCustomName}
              />

              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Calorie (kcal) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="es. 450"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    value={customCalories}
                    onChangeText={setCustomCalories}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Proteine (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="es. 32"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={customProtein}
                    onChangeText={setCustomProtein}
                  />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Carboidrati (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="es. 48"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={customCarbs}
                    onChangeText={setCustomCarbs}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Grassi (g)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="es. 12"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                    value={customFat}
                    onChangeText={setCustomFat}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, !customName.trim() && styles.disabledSaveBtn]}
                onPress={handleAddCustom}
                disabled={!customName.trim()}
              >
                <Text style={styles.saveBtnText}>Aggiungi al Diario ➕</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabItem: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
    fontWeight: '800',
  },
  tabContent: {
    maxHeight: 400,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  foodList: {
    maxHeight: 320,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  foodCategory: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodKcal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#84CC16',
  },
  foodMacroSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  customForm: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  saveBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledSaveBtn: {
    backgroundColor: '#E2E8F0',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
