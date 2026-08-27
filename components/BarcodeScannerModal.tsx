import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { FoodDatabaseService, FoodItem } from '@/services/foodDatabaseService';
import { UnitService, GRAMS_PER_OZ } from '@/services/unitService';
import { AdBanner } from '@/components/AdBanner';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded: (meal: { name: string; calories: number; protein: number; carbs: number; fat: number }) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onMealAdded,
}) => {
  const { t, language } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { unitSystem, isPro } = useSubscription();
  const [permission, requestPermission] = useCameraPermissions();

  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundFood, setFoundFood] = useState<FoodItem | null>(null);
  const [activeUnit, setActiveUnit] = useState<'g' | 'oz'>(() => (unitSystem === 'imperial' ? 'oz' : 'g'));
  const [inputValue, setInputValue] = useState<string>('100');
  const [scanned, setScanned] = useState(false);
  const lastScannedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      lastScannedCodeRef.current = null;
      setError(null);
      setFoundFood(null);
      setInputValue('100');
      setBarcode('');
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible]);

  const fetchBarcode = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setLoading(true);
    setError(null);
    setFoundFood(null);

    try {
      const item = await FoodDatabaseService.fetchFoodByBarcode(cleanCode, language);
      if (item) {
        setFoundFood(item);
        if (activeUnit === 'oz') {
          const oz = ((item.weightG || 100) / GRAMS_PER_OZ).toFixed(1);
          setInputValue(oz.endsWith('.0') ? oz.slice(0, -2) : oz);
        } else {
          setInputValue(item.weightG?.toString() || '100');
        }
      } else {
        setError('Codice a barre non trovato nel database (3.3M alimenti). Prova a digitare il nome nella ricerca.');
      }
    } catch (e: any) {
      setError('Errore di connessione durante la ricerca del codice a barre. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || loading || data === lastScannedCodeRef.current) return;
    setScanned(true);
    lastScannedCodeRef.current = data;
    setBarcode(data);
    fetchBarcode(data);
  };

  const handleConfirmAdd = () => {
    if (!foundFood) return;

    const numVal = parseFloat(inputValue.replace(',', '.')) || 0;
    const computedGrams = activeUnit === 'oz' ? Math.round(numVal * GRAMS_PER_OZ) : Math.round(numVal);
    const safeGrams = Math.max(1, computedGrams);

    const baseKcal = foundFood.baseCalories ?? foundFood.calories ?? 0;
    const baseProtein = foundFood.baseProteinG ?? foundFood.proteinG ?? 0;
    const baseCarbs = foundFood.baseCarbsG ?? foundFood.carbsG ?? 0;
    const baseFat = foundFood.baseFatG ?? foundFood.fatG ?? 0;
    const baseWeight = foundFood.baseWeightG || 100;

    const recalculated = UnitService.recalculateMacros(
      baseKcal,
      baseProtein,
      baseCarbs,
      baseFat,
      baseWeight,
      safeGrams
    );

    const displayName = foundFood.brand
      ? `${foundFood.name} (${foundFood.brand})`
      : foundFood.name;

    onMealAdded({
      name: displayName,
      calories: recalculated.calories,
      protein: recalculated.proteinG,
      carbs: recalculated.carbsG,
      fat: recalculated.fatG,
    });

    setBarcode('');
    setFoundFood(null);
    onClose();
  };

  const numVal = parseFloat(inputValue.replace(',', '.')) || 0;
  const currentGrams = activeUnit === 'oz' ? Math.max(0, numVal * GRAMS_PER_OZ) : Math.max(0, numVal);

  const baseKcal = foundFood?.baseCalories ?? foundFood?.calories ?? 0;
  const baseProtein = foundFood?.baseProteinG ?? foundFood?.proteinG ?? 0;
  const baseCarbs = foundFood?.baseCarbsG ?? foundFood?.carbsG ?? 0;
  const baseFat = foundFood?.baseFatG ?? foundFood?.fatG ?? 0;
  const baseWeight = foundFood?.baseWeightG || 100;

  const currentMacros = UnitService.recalculateMacros(
    baseKcal,
    baseProtein,
    baseCarbs,
    baseFat,
    baseWeight,
    currentGrams
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#111D17' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={{ fontSize: 24 }}>🏷️</Text>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('barcode_title', 'Scanner Barcode 🏷️')}</Text>
                <Text style={styles.headerSub}>3.3M+ Prodotti Open Food Facts</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1E2F26' : '#F1F5F9' }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Live Camera Viewfinder Box */}
            <View style={styles.scannerBox}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'],
                  }}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                >
                  <View style={styles.cameraOverlay}>
                    <View style={styles.viewfinderFrame}>
                      <View style={styles.scanLine} />
                    </View>
                    <Text style={styles.scannerPrompt}>
                      {scanned ? 'Codice Rilevato! Ricerca in corso...' : 'Inquadra il codice a barre del cibo'}
                    </Text>
                    {scanned && (
                      <TouchableOpacity
                        style={styles.rescanBtn}
                        onPress={() => {
                          setScanned(false);
                          lastScannedCodeRef.current = null;
                        }}
                      >
                        <Ionicons name="refresh" size={14} color="#0F172A" />
                        <Text style={styles.rescanBtnText}>Scansiona un altro</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </CameraView>
              ) : (
                <View style={styles.noPermBox}>
                  <Ionicons name="camera-outline" size={44} color={colors.coral} />
                  <Text style={styles.noPermText}>Autorizza la fotocamera per scansionare i codici a barre</Text>
                  <TouchableOpacity style={[styles.grantPermBtn, { backgroundColor: colors.coral }]} onPress={requestPermission}>
                    <Text style={styles.grantPermBtnText}>Consenti Fotocamera 📷</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Input EAN (Manual Fallback) */}
            <View style={styles.manualEanRow}>
              <TextInput
                style={[styles.eanInput, { color: colors.textPrimary, borderColor: isDarkMode ? '#2E473A' : '#CBD5E1' }]}
                placeholder="Oppure inserisci codice (es. 8000500310427)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={barcode}
                onChangeText={setBarcode}
                onSubmitEditing={() => fetchBarcode(barcode)}
              />
              <TouchableOpacity
                style={[styles.searchEanBtn, { backgroundColor: colors.coral }]}
                onPress={() => fetchBarcode(barcode)}
              >
                <Ionicons name="search" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Loading / Feedback */}
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.coral} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Interrogazione 3.3M+ alimenti Open Food Facts...
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* AdMob Advertisement Banner (Non-PRO users) */}
            {!isPro && <AdBanner location="barcode_scanner" />}

            {/* Scanned Product Card */}
            {foundFood && (
              <View style={[styles.resultCard, { backgroundColor: isDarkMode ? '#192C22' : '#F8FAFC', borderColor: isDarkMode ? '#2C493A' : '#E2E8F0' }]}>
                <View style={styles.resultHeader}>
                  {foundFood.imageUrl ? (
                    <Image source={{ uri: foundFood.imageUrl }} style={styles.resultImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.resultEmojiBox}>
                      <Text style={{ fontSize: 32 }}>{foundFood.emoji || '🍽️'}</Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {foundFood.name}
                    </Text>
                    {foundFood.brand ? (
                      <Text style={styles.resultBrand}>{foundFood.brand}</Text>
                    ) : null}
                    <Text style={[styles.resultKcal, { color: colors.coral }]}>
                      {currentMacros.calories} kcal
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Base: {baseKcal} kcal / {baseWeight}g
                    </Text>
                  </View>
                </View>

                {/* Unit Switch & Quantity Input */}
                <View style={styles.portionRow}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[
                        styles.unitSmallBtn,
                        activeUnit === 'g' && { backgroundColor: colors.coral },
                      ]}
                      onPress={() => {
                        if (activeUnit !== 'g') {
                          setActiveUnit('g');
                          setInputValue(String(Math.round(currentGrams)));
                        }
                      }}
                    >
                      <Text style={[styles.unitSmallText, activeUnit === 'g' && { color: '#FFFFFF', fontWeight: '800' }]}>g</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitSmallBtn,
                        activeUnit === 'oz' && { backgroundColor: colors.coral },
                      ]}
                      onPress={() => {
                        if (activeUnit !== 'oz') {
                          setActiveUnit('oz');
                          const oz = (currentGrams / GRAMS_PER_OZ).toFixed(1);
                          setInputValue(oz.endsWith('.0') ? oz.slice(0, -2) : oz);
                        }
                      }}
                    >
                      <Text style={[styles.unitSmallText, activeUnit === 'oz' && { color: '#FFFFFF', fontWeight: '800' }]}>oz</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.gramsInputBox}>
                    <TextInput
                      style={[styles.gramsInput, { color: colors.textPrimary, borderColor: isDarkMode ? '#2E473A' : '#CBD5E1' }]}
                      keyboardType="decimal-pad"
                      value={inputValue}
                      onChangeText={setInputValue}
                    />
                    <Text style={[styles.gramsUnit, { color: colors.textSecondary }]}>{activeUnit}</Text>
                  </View>
                </View>

                {/* Macro Pills */}
                <View style={styles.macroRow}>
                  <View style={[styles.macroBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.macroVal, { color: '#DC2626' }]}>
                      {currentMacros.proteinG}g
                    </Text>
                    <Text style={styles.macroLabel}>Proteine</Text>
                  </View>

                  <View style={[styles.macroBadge, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.macroVal, { color: '#D97706' }]}>
                      {currentMacros.carbsG}g
                    </Text>
                    <Text style={styles.macroLabel}>Carboidrati</Text>
                  </View>

                  <View style={[styles.macroBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.macroVal, { color: '#0284C7' }]}>
                      {currentMacros.fatG}g
                    </Text>
                    <Text style={styles.macroLabel}>Grassi</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.addFoodBtn, { backgroundColor: colors.coral }]}
                  onPress={handleConfirmAdd}
                  activeOpacity={0.85}
                >
                  <Text style={styles.addFoodBtnText}>Aggiungi al Diario ➕</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
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
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerBox: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    height: 190,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#BEF264',
    position: 'relative',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  viewfinderFrame: {
    width: 220,
    height: 90,
    borderWidth: 2,
    borderColor: '#BEF264',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanLine: {
    width: '90%',
    height: 2,
    backgroundColor: '#EF4444',
  },
  scannerPrompt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#BEF264',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 6,
  },
  rescanBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  noPermBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  noPermText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  grantPermBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  grantPermBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  manualEanRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  eanInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  searchEanBtn: {
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  resultCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    gap: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  unitSmallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  resultEmojiBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultName: {
    fontSize: 15,
    fontWeight: '800',
  },
  resultBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  resultKcal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  portionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  gramsInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gramsInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '800',
    minWidth: 60,
    textAlign: 'center',
  },
  gramsUnit: {
    fontSize: 13,
    fontWeight: '700',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBadge: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  addFoodBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addFoodBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
