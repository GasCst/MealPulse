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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLanguage } from '@/context/LanguageContext';
import { DEMO_BARCODES } from '@/constants/demoBarcodes';

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
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();

  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundFood, setFoundFood] = useState<any | null>(null);
  const [scanned, setScanned] = useState(false);
  const lastScannedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      lastScannedCodeRef.current = null;
      setError(null);
      setFoundFood(null);
      setBarcode('');
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible]);

  const fetchBarcodeFromOpenFoodFacts = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setFoundFood(null);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code.trim()}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const p = data.product;
        const nutriments = p.nutriments || {};
        
        const foodObj = {
          name: p.product_name_it || p.product_name || 'Alimento Scansionato',
          brand: p.brands || 'Generico',
          calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 150),
          protein: Math.round(nutriments.proteins_100g || nutriments.proteins || 0),
          carbs: Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0),
          fat: Math.round(nutriments.fat_100g || nutriments.fat || 0),
          serving: p.serving_size || '100g',
        };

        setFoundFood(foodObj);
        // Fallback for demo sample barcodes when offline or API returns 404
        if (DEMO_BARCODES[code]) {
          setFoundFood(DEMO_BARCODES[code]);
        } else {
          setError('Codice a barre non trovato nel database OpenFoodFacts. Prova a inserirlo manualmente.');
        }
      }
    } catch (e: any) {
      setError('Errore di connessione al database alimenti. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || loading || data === lastScannedCodeRef.current) return;
    setScanned(true);
    lastScannedCodeRef.current = data;
    setBarcode(data);
    fetchBarcodeFromOpenFoodFacts(data);
  };

  const handleConfirmAdd = () => {
    if (!foundFood) return;
    onMealAdded({
      name: `${foundFood.name} (${foundFood.brand})`,
      calories: foundFood.calories,
      protein: foundFood.protein,
      carbs: foundFood.carbs,
      fat: foundFood.fat,
    });
    setBarcode('');
    setFoundFood(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={{ fontSize: 22 }}>📷</Text>
              <View>
                <Text style={styles.headerTitle}>{t('barcode_title')}</Text>
                <Text style={styles.headerSub}>{t('barcode_sub')}</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
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
                  <Ionicons name="camera-outline" size={48} color="#BEF264" />
                  <Text style={styles.noPermText}>Autorizza la fotocamera per scansionare i codici a barre</Text>
                  <TouchableOpacity style={styles.grantPermBtn} onPress={requestPermission}>
                    <Text style={styles.grantPermBtnText}>Consenti Fotocamera 📷</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Input EAN (Manual Fallback) */}
            <Text style={styles.inputLabel}>Oppure Inserisci Codice EAN / Barcode Manualmente</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.input}
                placeholder="es. 8000500003787"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={barcode}
                onChangeText={setBarcode}
              />
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => {
                  setScanned(true);
                  fetchBarcodeFromOpenFoodFacts(barcode);
                }}
                disabled={loading || !barcode.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.scanBtnText}>Cerca 🔍</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Demo Barcodes Helper */}
            <View style={styles.demoBarcodesBox}>
              <Text style={styles.demoTitle}>Codici Barcode Demo da Provare:</Text>
              <View style={styles.demoRow}>
                {['8000500003787', '8000300000000', '3017620422003'].map((code) => (
                  <TouchableOpacity
                    key={code}
                    style={styles.demoChip}
                    onPress={() => {
                      setBarcode(code);
                      setScanned(true);
                      fetchBarcodeFromOpenFoodFacts(code);
                    }}
                  >
                    <Text style={styles.demoChipText}>{code}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {foundFood && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{foundFood.name}</Text>
                    <Text style={styles.resultBrand}>{foundFood.brand} • {foundFood.serving}</Text>
                  </View>
                  <Text style={styles.resultKcal}>{foundFood.calories} kcal</Text>
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroBadge}>
                    <Text style={styles.macroVal}>{foundFood.protein}g</Text>
                    <Text style={styles.macroLabel}>Proteine</Text>
                  </View>

                  <View style={styles.macroBadge}>
                    <Text style={styles.macroVal}>{foundFood.carbs}g</Text>
                    <Text style={styles.macroLabel}>Carboidrati</Text>
                  </View>

                  <View style={styles.macroBadge}>
                    <Text style={styles.macroVal}>{foundFood.fat}g</Text>
                    <Text style={styles.macroLabel}>Grassi</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.addFoodBtn} onPress={handleConfirmAdd}>
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerBox: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    height: 200,
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
    height: 100,
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
    shadowColor: '#EF4444',
    shadowRadius: 4,
    shadowOpacity: 0.8,
  },
  scannerPrompt: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    backgroundColor: '#BEF264',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  grantPermBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  scanBtn: {
    backgroundColor: '#BEF264',
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },
  demoBarcodesBox: {
    marginBottom: 14,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoChipText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    flex: 1,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#F7FEE7',
    borderWidth: 1.5,
    borderColor: '#BEF264',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  resultBrand: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  resultKcal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#84CC16',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  macroBadge: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  addFoodBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addFoodBtnText: {
    color: '#BEF264',
    fontSize: 14,
    fontWeight: '800',
  },
});
