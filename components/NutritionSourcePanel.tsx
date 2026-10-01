import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Linking, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { NutritionInfo, ExtraNutrients, MacroValues, nutritionNumber, plausibleMacros } from '@/services/nutritionData';
import { saveProductLabel } from '@/services/productNutritionCorrections';

type LabelValues = MacroValues & ExtraNutrients;
interface Props {
  info?: NutritionInfo;
  values?: LabelValues; // Values per 100 g/ml, not the currently selected portion.
  onCorrect?: (values: LabelValues, info: NutritionInfo) => void;
}
const fields: { key: keyof LabelValues; label: string; unit: string }[] = [
  { key: 'calories', label: 'kcal', unit: 'kcal' },
  { key: 'proteinG', label: 'protein_left', unit: 'g' },
  { key: 'carbsG', label: 'carb_left', unit: 'g' },
  { key: 'fatG', label: 'fat_left', unit: 'g' },
  { key: 'fiberG', label: 'fibers', unit: 'g' },
  { key: 'sugarG', label: 'sugars', unit: 'g' },
  { key: 'saturatedFatG', label: 'sat_fat', unit: 'g' },
  { key: 'saltG', label: 'nutrition_salt', unit: 'g' },
  { key: 'sodiumMg', label: 'sodium', unit: 'mg' },
  { key: 'potassiumMg', label: 'potassium', unit: 'mg' },
  { key: 'calciumMg', label: 'calcium', unit: 'mg' },
  { key: 'ironMg', label: 'iron', unit: 'mg' },
  { key: 'magnesiumMg', label: 'magnesium', unit: 'mg' },
  { key: 'zincMg', label: 'zinc', unit: 'mg' },
  { key: 'vitaminCMg', label: 'vitamin_c', unit: 'mg' },
  { key: 'vitaminDIU', label: 'vitamin_d', unit: 'µg' },
  { key: 'vitaminAMcg', label: 'vitamin_a', unit: 'µg' },
  { key: 'vitaminB12Mcg', label: 'vitamin_b12', unit: 'µg' },
];

export function NutritionSourcePanel({ info, values, onCorrect }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [labelUnit, setLabelUnit] = useState<'g' | 'ml'>(info?.referenceUnit || 'g');
  useEffect(() => { setEditing(false); }, [info?.barcode]);
  const unit = editing ? labelUnit : info?.referenceUnit || 'g';
  const startEdit = () => {
    setLabelUnit(info?.referenceUnit || 'g');
    setInputs(Object.fromEntries(fields.map(f => [f.key, values?.[f.key] === undefined ? '' : String(f.key === 'vitaminDIU' ? values[f.key]! / 40 : values[f.key])])));
    setEditing(true);
  };
  const apply = async () => {
    const parsed = Object.fromEntries(fields.map(f => [f.key, nutritionNumber(inputs[f.key])])) as unknown as LabelValues;
    if (parsed.vitaminDIU !== undefined) parsed.vitaminDIU *= 40;
    const invalid = fields.some((f, index) => index < 4 ? parsed[f.key] === undefined : !!inputs[f.key]?.trim() && parsed[f.key] === undefined);
    if (invalid || !plausibleMacros(parsed, unit) ||
      (parsed.sugarG !== undefined && parsed.sugarG > parsed.carbsG + 0.5) ||
      (parsed.saturatedFatG !== undefined && parsed.saturatedFatG > parsed.fatG + 0.5) ||
      (parsed.saltG !== undefined && parsed.sodiumMg !== undefined && Math.abs(parsed.sodiumMg - parsed.saltG * 400) > 1)) {
      Alert.alert(t('error'), t('nutrition_invalid')); return;
    }
    setBusy(true);
    try {
      const nextInfo: NutritionInfo = { ...info, version: 1, source: 'user_label', referenceUnit: unit, updatedAt: new Date().toISOString(), warnings: [] };
      await saveProductLabel(info?.barcode, parsed, unit);
      onCorrect?.(parsed, nextInfo);
      setEditing(false);
    } catch { Alert.alert(t('error'), t('nutrition_save_error')); }
    finally { setBusy(false); }
  };
  const updateInput = (key: keyof LabelValues, text: string) => {
    setInputs(prev => {
      const updated = { ...prev, [key]: text };
      const value = nutritionNumber(text);
      if (value !== undefined && key === 'saltG') updated.sodiumMg = String(Math.round(value * 400 * 1000) / 1000);
      if (value !== undefined && key === 'sodiumMg') updated.saltG = String(Math.round(value / 400 * 1000) / 1000);
      return updated;
    });
  };
  return <View style={[styles.card, { borderColor: colors.textSecondary }]}>
    <Text style={[styles.title, { color: colors.textPrimary }]}>{t('nutrition_source')} · {t(`nutrition_source_${info?.source || 'legacy'}`)}</Text>
    <Text style={[styles.help, { color: colors.textSecondary }]}>{t(info?.source === 'open_food_facts' ? 'nutrition_off_help' : info?.source === 'user_label' || info?.source === 'manual' ? 'nutrition_manual_help' : 'nutrition_estimate_help')}</Text>
    {!!info?.warnings?.length && <Text style={[styles.help, { color: colors.coral }]}>{t('nutrition_warning')}</Text>}
    {info?.barcode && <Text style={[styles.help, { color: colors.textSecondary }]}>{t('nutrition_barcode')}: {info.barcode}</Text>}
    {info?.updatedAt && <Text style={[styles.help, { color: colors.textSecondary }]}>{t('nutrition_updated')}: {info.updatedAt.slice(0, 10)}</Text>}
    <View style={styles.links}>
      {info?.sourceUrl && <TouchableOpacity sound="open" onPress={() => Linking.openURL(info.sourceUrl!).catch(() => Alert.alert(t('error'), t('nutrition_link_error')))}><Text style={{ color: colors.coral }}>{t('nutrition_product')}</Text></TouchableOpacity>}
      {info?.labelImageUrl && <TouchableOpacity sound="open" onPress={() => Linking.openURL(info.labelImageUrl!).catch(() => Alert.alert(t('error'), t('nutrition_link_error')))}><Text style={{ color: colors.coral }}>{t('nutrition_label_photo')}</Text></TouchableOpacity>}
    </View>
    {onCorrect && !editing && <TouchableOpacity style={styles.edit} sound="open" onPress={startEdit}><Text style={{ color: colors.coral, fontWeight: '700' }}>{t('nutrition_correct')}</Text></TouchableOpacity>}
    {editing && <View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('nutrition_per_100')} {unit}</Text>
      <View style={styles.links}>{(['g', 'ml'] as const).map(choice => <TouchableOpacity key={choice} sound="select" onPress={() => setLabelUnit(choice)} accessibilityRole="radio" accessibilityState={{ checked: unit === choice }}><Text style={{ color: unit === choice ? colors.coral : colors.textSecondary, fontWeight: '700' }}>{choice === unit ? '● ' : '○ '}100 {choice}</Text></TouchableOpacity>)}</View>
      <Text style={[styles.help, { color: colors.textSecondary }]}>{t('nutrition_optional_help')}</Text>
      {(showExtras ? fields : fields.slice(0, 4)).map(f => <View key={f.key} style={styles.row}>
        <Text style={{ flex: 1, color: colors.textPrimary }}>{t(f.label)} ({f.unit})</Text>
        <TextInput accessibilityLabel={`${t(f.label)} / 100 ${unit}`} style={[styles.input, { color: colors.textPrimary, borderColor: colors.textSecondary }]} keyboardType="decimal-pad" value={inputs[f.key] || ''} onChangeText={text => updateInput(f.key, text)} placeholder="—" placeholderTextColor={colors.textSecondary} />
      </View>)}
      <TouchableOpacity style={styles.edit} sound="open" onPress={() => setShowExtras(v => !v)}><Text style={{ color: colors.coral }}>{t('micronutrients_title')}</Text></TouchableOpacity>
      <View style={styles.links}>
        <TouchableOpacity disabled={busy} accessibilityLabel={t('nutrition_apply')} accessibilityState={{ busy, disabled: busy }} sound="confirm" onPress={apply}>{busy ? <ActivityIndicator size="small" color={colors.coral} /> : <Text style={{ color: colors.coral, fontWeight: '700' }}>{t('nutrition_apply')}</Text>}</TouchableOpacity>
        <TouchableOpacity disabled={busy} sound="close" onPress={() => setEditing(false)}><Text style={{ color: colors.textSecondary }}>{t('cancel')}</Text></TouchableOpacity>
      </View>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, marginVertical: 12, gap: 7 },
  title: { fontSize: 13, fontWeight: '700' }, help: { fontSize: 12, lineHeight: 18 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, paddingVertical: 5 }, edit: { paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  input: { width: 96, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, textAlign: 'right' },
});
