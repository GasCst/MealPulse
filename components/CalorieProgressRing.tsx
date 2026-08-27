import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
  FadeInUp,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface HeroCalorieCardProps {
  eatenCalories: number;
  burnedCalories?: number;
  targetCalories: number;
  carbLeft?: number;
  proteinLeft?: number;
  fatLeft?: number;
  includeBurnedInBudget?: boolean;
}

export const CalorieProgressRing: React.FC<HeroCalorieCardProps> = ({
  eatenCalories,
  burnedCalories = 0,
  targetCalories = 2000,
  carbLeft = 150,
  proteinLeft = 118,
  fatLeft = 75,
  includeBurnedInBudget = true,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const effectiveBurned = includeBurnedInBudget ? burnedCalories : 0;
  const kcalLeft = Math.max(0, targetCalories - eatenCalories + effectiveBurned);

  const size = 156;
  const strokeWidth = 11;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progressShared = useSharedValue(0);
  const countShared = useSharedValue(0);
  const [displayedNum, setDisplayedNum] = useState<number>(kcalLeft);

  // Animated widths for macro nutrient bars
  const carbProgress = useSharedValue(0);
  const proteinProgress = useSharedValue(0);
  const fatProgress = useSharedValue(0);

  const effectiveTargetCarbs = 250;
  const effectiveTargetProtein = 140;
  const effectiveTargetFat = 70;

  useEffect(() => {
    const effectiveTarget = includeBurnedInBudget ? targetCalories + burnedCalories : targetCalories;
    const targetPct = Math.min(1, Math.max(0, eatenCalories / (effectiveTarget || 1)));

    progressShared.value = withTiming(targetPct, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });
    countShared.value = withTiming(kcalLeft, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });

    const cPct = Math.min(1, Math.max(0.08, (effectiveTargetCarbs - carbLeft) / effectiveTargetCarbs));
    const pPct = Math.min(1, Math.max(0.08, (effectiveTargetProtein - proteinLeft) / effectiveTargetProtein));
    const fPct = Math.min(1, Math.max(0.08, (effectiveTargetFat - fatLeft) / effectiveTargetFat));

    carbProgress.value = withTiming(cPct, { duration: 900, easing: Easing.out(Easing.cubic) });
    proteinProgress.value = withTiming(pPct, { duration: 900, easing: Easing.out(Easing.cubic) });
    fatProgress.value = withTiming(fPct, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [eatenCalories, targetCalories, burnedCalories, includeBurnedInBudget, kcalLeft, carbLeft, proteinLeft, fatLeft]);

  useAnimatedReaction(
    () => Math.round(countShared.value),
    (val, prev) => {
      if (val !== prev) {
        runOnJS(setDisplayedNum)(val);
      }
    }
  );

  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progressShared.value);
    return {
      strokeDashoffset,
    };
  });

  const carbBarStyle = useAnimatedStyle(() => ({
    width: `${carbProgress.value * 100}%`,
  }));

  const proteinBarStyle = useAnimatedStyle(() => ({
    width: `${proteinProgress.value * 100}%`,
  }));

  const fatBarStyle = useAnimatedStyle(() => ({
    width: `${fatProgress.value * 100}%`,
  }));

  const formatMacro = (val?: number): string => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const rounded = Math.round(val * 10) / 10;
    return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(500)}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          borderWidth: 1,
        },
      ]}
    >
      {/* Top Stats Row */}
      <View style={styles.topStatsRow}>
        {/* Left Stat: Eaten */}
        <View style={[styles.sideStatPill, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <View style={[styles.sideStatIconBox, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
            <Ionicons name="restaurant" size={15} color={colors.coral} />
          </View>
          <Text style={[styles.sideStatValue, { color: colors.textPrimary }]}>{eatenCalories}</Text>
          <Text style={[styles.sideStatLabel, { color: colors.textSecondary }]}>{t('eaten')}</Text>
        </View>

        {/* Center Progress Ring */}
        <View style={styles.gaugeCenterContainer}>
          <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <Defs>
                <LinearGradient id="heroCardGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#BEF264" />
                  <Stop offset="100%" stopColor="#84CC16" />
                </LinearGradient>
              </Defs>

              {/* Background Track Circle */}
              <Circle
                cx={center}
                cy={center}
                r={radius}
                stroke={isDarkMode ? '#242C38' : '#E2E8F0'}
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Animated Front Progress Arc */}
              <AnimatedCircle
                cx={center}
                cy={center}
                r={radius}
                stroke="url(#heroCardGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                animatedProps={animatedCircleProps}
                strokeLinecap="round"
                fill="transparent"
                rotation="-90"
                origin={`${center}, ${center}`}
              />
            </Svg>

            {/* Center Text Overlay */}
            <View style={styles.centerTextContainer}>
              <View style={[styles.flashIconCircle, { backgroundColor: colors.limeGlow }]}>
                <Ionicons name="flash" size={16} color={colors.lime} />
              </View>
              <Text style={[styles.centerKcalNumber, { color: colors.textPrimary }]}>
                {displayedNum}
              </Text>
              <Text style={[styles.centerKcalLabel, { color: colors.textSecondary }]}>
                {t('kcal_left')}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Stat: Burned */}
        <View style={[styles.sideStatPill, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <View style={[styles.sideStatIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
            <Ionicons name="flame" size={15} color={colors.emerald} />
          </View>
          <Text style={[styles.sideStatValue, { color: colors.textPrimary }]}>{burnedCalories}</Text>
          <Text style={[styles.sideStatLabel, { color: colors.textSecondary }]}>{t('burned')}</Text>
        </View>
      </View>

      {/* Bottom Macros Pill Row */}
      <View style={styles.macrosRow}>
        {/* Carbs */}
        <View style={[styles.macroPill, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <View style={styles.macroHeader}>
            <Text style={[styles.macroPillTitle, { color: colors.textMuted }]}>{t('carb_left')}</Text>
            <View style={[styles.macroDot, { backgroundColor: colors.amber }]} />
          </View>
          <Text style={[styles.macroPillValue, { color: colors.textPrimary }]}>
            {formatMacro(carbLeft)} <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('g_left')}</Text>
          </Text>
          <View style={[styles.macroTrack, { backgroundColor: isDarkMode ? '#283144' : '#E2E8F0' }]}>
            <Animated.View style={[styles.macroBar, { backgroundColor: colors.amber }, carbBarStyle]} />
          </View>
        </View>

        {/* Protein */}
        <View style={[styles.macroPill, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <View style={styles.macroHeader}>
            <Text style={[styles.macroPillTitle, { color: colors.textMuted }]}>{t('protein_left')}</Text>
            <View style={[styles.macroDot, { backgroundColor: colors.emerald }]} />
          </View>
          <Text style={[styles.macroPillValue, { color: colors.textPrimary }]}>
            {formatMacro(proteinLeft)} <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('g_left')}</Text>
          </Text>
          <View style={[styles.macroTrack, { backgroundColor: isDarkMode ? '#283144' : '#E2E8F0' }]}>
            <Animated.View style={[styles.macroBar, { backgroundColor: colors.emerald }, proteinBarStyle]} />
          </View>
        </View>

        {/* Fat */}
        <View style={[styles.macroPill, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <View style={styles.macroHeader}>
            <Text style={[styles.macroPillTitle, { color: colors.textMuted }]}>{t('fat_left')}</Text>
            <View style={[styles.macroDot, { backgroundColor: colors.coral }]} />
          </View>
          <Text style={[styles.macroPillValue, { color: colors.textPrimary }]}>
            {formatMacro(fatLeft)} <Text style={{ fontSize: 10, color: colors.textSecondary }}>{t('g_left')}</Text>
          </Text>
          <View style={[styles.macroTrack, { backgroundColor: isDarkMode ? '#283144' : '#E2E8F0' }]}>
            <Animated.View style={[styles.macroBar, { backgroundColor: colors.coral }, fatBarStyle]} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  topStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideStatPill: {
    width: 82,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sideStatIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  sideStatValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  sideStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  gaugeCenterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  centerKcalNumber: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  centerKcalLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  macroPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  macroPillValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  macroTrack: {
    width: '100%',
    height: 5,
    borderRadius: 2.5,
    marginTop: 6,
    overflow: 'hidden',
  },
  macroBar: {
    height: '100%',
    borderRadius: 2.5,
  },
});
