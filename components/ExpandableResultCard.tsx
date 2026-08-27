import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MealVisionResult } from '@/services/aiVisionService';

interface ExpandableResultCardProps {
  scanResult: MealVisionResult;
  onSave: () => void;
}

export const ExpandableResultCard: React.FC<ExpandableResultCardProps> = ({
  scanResult,
  onSave,
}) => {
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(12);
  const contentOpacity = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);

  useEffect(() => {
    cardScale.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.exp) });
    cardOpacity.value = withTiming(1, { duration: 350 });

    contentTranslateY.value = withDelay(150, withTiming(0, { duration: 350 }));
    contentOpacity.value = withDelay(150, withTiming(1, { duration: 350 }));

    checkmarkScale.value = withDelay(
      250,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
  }, [scanResult]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animatedCheckmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  return (
    <Animated.View style={[styles.resultCard, animatedCardStyle]}>
      <View style={styles.resultHeader}>
        <Animated.View style={animatedCheckmarkStyle}>
          <Ionicons name="checkmark-circle" size={28} color="#84CC16" />
        </Animated.View>
        <Text style={styles.resultDishName}>{scanResult.food_name}</Text>
      </View>

      <Animated.View style={animatedContentStyle}>
        {/* Weight & Item Count Badge */}
        <View style={styles.portionBadge}>
          <Text style={styles.portionText}>
            ⚖️ Estimated Portion: {scanResult.estimated_weight_g || 150}g
            {scanResult.item_count && scanResult.item_count > 1
              ? ` (${scanResult.item_count} pcs × ${scanResult.unit_weight_g || Math.round(scanResult.estimated_weight_g / scanResult.item_count)}g/ea)`
              : ''}
          </Text>
        </View>

        <View style={styles.calBigBox}>
          <Text style={styles.resultCalNum}>{scanResult.calories}</Text>
          <Text style={styles.resultKcalUnit}>Total Kcal</Text>
        </View>

        {/* Macro Breakdown */}
        <View style={styles.macroSplitGrid}>
          <View style={styles.macroCol}>
            <Text style={styles.macroVal}>{scanResult.protein_g}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroVal}>{scanResult.carbs_g}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroCol}>
            <Text style={styles.macroVal}>{scanResult.fat_g}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>

        {/* AI Insight Coach Note */}
        {scanResult.insights && (
          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Ionicons name="bulb-outline" size={16} color="#84CC16" />
              <Text style={styles.insightTitle}>AI Nutrition Coach Note</Text>
            </View>
            <Text style={styles.insightText}>{scanResult.insights}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveMealBtn} onPress={onSave} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={18} color="#0F172A" />
          <Text style={styles.saveMealBtnText}>Save Meal Log</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginTop: 12,
    marginBottom: 20,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  resultDishName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  portionBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  portionText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  calBigBox: {
    alignItems: 'center',
    marginVertical: 6,
  },
  resultCalNum: {
    fontSize: 38,
    fontWeight: '900',
    color: '#84CC16',
    lineHeight: 42,
  },
  resultKcalUnit: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  macroSplitGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  macroCol: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  macroLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  insightBox: {
    backgroundColor: '#F7FEE7',
    borderWidth: 1,
    borderColor: '#BEF264',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#365314',
  },
  insightText: {
    fontSize: 12,
    color: '#3f6212',
    lineHeight: 17,
  },
  saveMealBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveMealBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
});
