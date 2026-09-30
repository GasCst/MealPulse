import { TouchableOpacity } from '@/components/ui/FeedbackPressable';
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
} from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import { SupabaseService, CloudMealLog, DailyActivityCloud } from '@/services/supabaseService';
import { PaywallModal } from '@/components/PaywallModal';

type Period = 'day' | 'week' | 'month';

const PERIOD_LABELS = {
  it: ['Oggi', 'Settimana', 'Mese'],
  en: ['Today', 'Week', 'Month'],
  es: ['Hoy', 'Semana', 'Mes'],
  fr: ["Aujourd’hui", 'Semaine', 'Mois'],
  de: ['Heute', 'Woche', 'Monat'],
  zh: ['今天', '本周', '本月'],
  ja: ['今日', '今週', '今月'],
} as const;

const PROGRESS_COPY = {
  it: { subtitle: 'Il tuo percorso, giorno dopo giorno', logged: 'Calorie registrate', remaining: 'Rimanenti', over: 'Oltre obiettivo', days: 'Giorni registrati', average: 'Media per giorno registrato', trend: 'Andamento calorie', emptyTitle: 'Qui inizia il tuo progresso', emptyBody: 'Registra un pasto per vedere calorie e macronutrienti nel grafico.', noCaloriesTitle: 'Nessuna caloria registrata', noCaloriesBody: 'I pasti di questo periodo non hanno valori calorici. Controlla il pasto o aggiungine uno.', addMeal: 'Registra un pasto', burned: 'Calorie bruciate', steps: 'Passi', meals: 'Pasti registrati', refresh: 'Aggiorna progressi' },
  en: { subtitle: 'Your journey, one day at a time', logged: 'Calories logged', remaining: 'Remaining', over: 'Over goal', days: 'Days logged', average: 'Average per logged day', trend: 'Calorie trend', emptyTitle: 'Your progress starts here', emptyBody: 'Log a meal to see calories and macros in the chart.', noCaloriesTitle: 'No calories logged', noCaloriesBody: 'Meals in this period have no calorie values. Check the meal or add another.', addMeal: 'Log a meal', burned: 'Calories burned', steps: 'Steps', meals: 'Meals logged', refresh: 'Refresh progress' },
  es: { subtitle: 'Tu camino, día a día', logged: 'Calorías registradas', remaining: 'Restantes', over: 'Sobre el objetivo', days: 'Días registrados', average: 'Media por día registrado', trend: 'Evolución de calorías', emptyTitle: 'Tu progreso empieza aquí', emptyBody: 'Registra una comida para ver calorías y macros.', noCaloriesTitle: 'Sin calorías registradas', noCaloriesBody: 'Las comidas de este periodo no tienen calorías. Revisa la comida o añade otra.', addMeal: 'Registrar comida', burned: 'Calorías quemadas', steps: 'Pasos', meals: 'Comidas registradas', refresh: 'Actualizar progreso' },
  fr: { subtitle: 'Votre parcours, jour après jour', logged: 'Calories enregistrées', remaining: 'Restantes', over: "Au-dessus de l’objectif", days: 'Jours suivis', average: 'Moyenne par jour suivi', trend: 'Évolution des calories', emptyTitle: 'Votre progrès commence ici', emptyBody: 'Ajoutez un repas pour voir les calories et les macros.', noCaloriesTitle: 'Aucune calorie enregistrée', noCaloriesBody: 'Les repas de cette période n’ont pas de calories. Vérifiez-les ou ajoutez un repas.', addMeal: 'Ajouter un repas', burned: 'Calories brûlées', steps: 'Pas', meals: 'Repas enregistrés', refresh: 'Actualiser le progrès' },
  de: { subtitle: 'Dein Weg, Tag für Tag', logged: 'Erfasste Kalorien', remaining: 'Übrig', over: 'Über dem Ziel', days: 'Erfasste Tage', average: 'Durchschnitt pro erfasstem Tag', trend: 'Kalorienverlauf', emptyTitle: 'Dein Fortschritt beginnt hier', emptyBody: 'Erfasse eine Mahlzeit, um Kalorien und Makros zu sehen.', noCaloriesTitle: 'Keine Kalorien erfasst', noCaloriesBody: 'Die Mahlzeiten in diesem Zeitraum haben keine Kalorienwerte. Prüfe sie oder füge eine hinzu.', addMeal: 'Mahlzeit erfassen', burned: 'Verbrannte Kalorien', steps: 'Schritte', meals: 'Erfasste Mahlzeiten', refresh: 'Fortschritt aktualisieren' },
  zh: { subtitle: '记录每一天的进步', logged: '已记录热量', remaining: '剩余', over: '超出目标', days: '记录天数', average: '记录日平均值', trend: '热量趋势', emptyTitle: '从这里开始记录进步', emptyBody: '记录一餐后即可查看热量和营养素。', noCaloriesTitle: '尚无热量数据', noCaloriesBody: '此期间的餐食没有热量值。请检查或添加餐食。', addMeal: '记录一餐', burned: '消耗热量', steps: '步数', meals: '已记录餐数', refresh: '刷新进度' },
  ja: { subtitle: '毎日の歩みを記録', logged: '記録したカロリー', remaining: '残り', over: '目標超過', days: '記録日数', average: '記録日の平均', trend: 'カロリーの推移', emptyTitle: 'ここから記録を始めましょう', emptyBody: '食事を記録するとカロリーと栄養素が表示されます。', noCaloriesTitle: 'カロリーの記録がありません', noCaloriesBody: 'この期間の食事にはカロリー値がありません。食事を確認するか追加してください。', addMeal: '食事を記録', burned: '消費カロリー', steps: '歩数', meals: '記録した食事', refresh: '進捗を更新' },
} as const;

const DATE_LOCALES = { it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP' } as const;

const localDayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function getPeriodBounds(now: Date, period: Period) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'day') return { start: today, end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) };
  if (period === 'week') {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
    return { start: monday, end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7) };
  }
  return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
}

export default function StatisticsScreen() {
  const { user, targetCalories, burnedCaloriesToday, stepsToday } = useSubscription();
  const { t, language } = useLanguage();
  const { isDarkMode, colors } = useTheme();
  const router = useRouter();
  const copy = PROGRESS_COPY[language];

  const [loading, setLoading] = useState(true);
  const [mealLogs, setMealLogs] = useState<CloudMealLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<DailyActivityCloud[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [now, setNow] = useState(() => new Date());

  const targetCalorieGoal = Math.max(0, Number(targetCalories || 0));
  const locale = DATE_LOCALES[language];
  const number = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setNow(new Date());
    try {
      const [meals, activity] = await Promise.all([
        SupabaseService.fetchMealLogsHistory(user?.id),
        user?.id ? SupabaseService.getActivityHistory(user.id, 31) : Promise.resolve([]),
      ]);
      setMealLogs(meals);
      setActivityLogs(activity);
    } catch (error) {
      console.warn('[Progress] Could not refresh analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadAnalytics(); }, [loadAnalytics]));

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
  };

  const { start, end } = getPeriodBounds(now, period);
  const periodLogs = mealLogs.filter((meal) => {
    const date = new Date(meal.logged_at);
    return !Number.isNaN(date.getTime()) && date >= start && date < end;
  });
  const periodActivity = activityLogs.filter((item) => {
    const date = new Date(`${item.log_date}T12:00:00`);
    return !Number.isNaN(date.getTime()) && date >= start && date < end;
  });

  const totalCalories = periodLogs.reduce((sum, meal) => sum + Number(meal.calories || 0), 0);
  const totalProtein = periodLogs.reduce((sum, meal) => sum + Number(meal.protein_g || 0), 0);
  const totalCarbs = periodLogs.reduce((sum, meal) => sum + Number(meal.carbs_g || 0), 0);
  const totalFat = periodLogs.reduce((sum, meal) => sum + Number(meal.fat_g || 0), 0);
  const loggedDays = new Set(periodLogs.map((meal) => localDayKey(new Date(meal.logged_at)))).size;

  const todayKey = localDayKey(now);
  const cloudToday = periodActivity.find((item) => item.log_date === todayKey);
  const totalBurned = periodActivity.reduce((sum, item) => sum + Number(item.active_calories || 0), 0)
    + Math.max(0, Number(burnedCaloriesToday || 0) - Number(cloudToday?.active_calories || 0));
  const totalSteps = periodActivity.reduce((sum, item) => sum + Number(item.steps || 0), 0)
    + Math.max(0, Number(stepsToday || 0) - Number(cloudToday?.steps || 0));

  const chartData: { day: string; calories: number; isHighlight: boolean; from: Date; to: Date }[] = [];
  if (period === 'day') {
    for (let hour = 0; hour < 24; hour += 4) {
      chartData.push({ day: String(hour).padStart(2, '0'), calories: 0, isHighlight: now.getHours() >= hour && now.getHours() < hour + 4, from: new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour), to: new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour + 4) });
    }
  } else if (period === 'week') {
    for (let day = 0; day < 7; day++) {
      const from = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
      chartData.push({ day: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(from).replace('.', ''), calories: 0, isHighlight: localDayKey(from) === todayKey, from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1) });
    }
  } else {
    for (let day = 1; day <= new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate(); day += 7) {
      const from = new Date(start.getFullYear(), start.getMonth(), day);
      const to = new Date(start.getFullYear(), start.getMonth(), Math.min(day + 7, new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() + 1));
      chartData.push({ day: `${day}–${new Date(to.getFullYear(), to.getMonth(), to.getDate() - 1).getDate()}`, calories: 0, isHighlight: now >= from && now < to, from, to });
    }
  }

  periodLogs.forEach((meal) => {
    const date = new Date(meal.logged_at);
    const bucket = chartData.find((item) => date >= item.from && date < item.to);
    if (bucket) bucket.calories += Number(meal.calories || 0);
  });
  const chartMax = Math.max(1, ...chartData.map((item) => item.calories));
  const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const periodRange = period === 'day'
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(start)
    : period === 'month'
      ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(start)
      : `${dateFormat.format(start)} – ${dateFormat.format(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1))}`;
  const macroEnergy = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <View>
            <Text style={[styles.headerEyebrow, { color: colors.accentGreen }]}>MEALPULSE AI</Text>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('tab_progress')}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{copy.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={[styles.circleBackBtn, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}
            onPress={() => { triggerHaptic(); loadAnalytics(); }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={copy.refresh}
          >
            <Ionicons name="refresh" size={18} color={colors.lime} />
          </TouchableOpacity>
        </View>

        {/* Period Selector Tabs */}
        <View style={[styles.periodSelector, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          {(['day', 'week', 'month'] as const).map((p) => {
            const isSelected = period === p;
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodTab,
                  isSelected && [styles.periodTabActive, { backgroundColor: colors.lime }],
                ]}
                onPress={() => {
                  triggerHaptic();
                  setPeriod(p);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    { color: isSelected ? '#0F172A' : colors.textSecondary },
                    isSelected && { fontWeight: '900' },
                  ]}
                >
                  {PERIOD_LABELS[language][(['day', 'week', 'month'] as const).indexOf(p)]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hero Calories Counter */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={styles.caloriesHeroSection}
        >
          <Text style={styles.caloriesLabel}>{copy.logged}</Text>
          <View style={styles.caloriesNumberRow}>
            <Text style={styles.caloriesBigVal}>{number(totalCalories)}</Text>
            <Text style={styles.kcalUnit}>{t('kcal')}</Text>
          </View>
          <Text style={styles.heroRange}>{periodRange}</Text>
          {period === 'day' && targetCalorieGoal > 0 ? (
            <>
              <View style={styles.goalTrack}><View style={[styles.goalFill, { width: `${Math.min(100, totalCalories / targetCalorieGoal * 100)}%` }]} /></View>
              <View style={styles.heroBottom}>
                <Text style={styles.targetCalText}>{t('target_label')} {number(targetCalorieGoal)} {t('kcal')}</Text>
                <Text style={styles.targetBold}>{totalCalories <= targetCalorieGoal ? copy.remaining : copy.over}: {number(Math.abs(targetCalorieGoal - totalCalories))}</Text>
              </View>
            </>
          ) : (
            <View style={styles.heroStats}>
              <View style={styles.heroStat}><Text style={styles.heroStatValue}>{number(loggedDays)}</Text><Text style={styles.heroStatLabel}>{copy.days}</Text></View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}><Text style={styles.heroStatValue}>{number(loggedDays ? totalCalories / loggedDays : 0)}</Text><Text style={styles.heroStatLabel}>{copy.average} · {t('kcal')}</Text></View>
            </View>
          )}
        </Animated.View>

        {/* Bar Chart Container */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(500)}
          style={[styles.chartCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <View style={styles.chartTitleRow}>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>{copy.trend}</Text>
            <Text style={[styles.chartSub, { color: colors.textSecondary }]}>{periodRange}</Text>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.lime} />
            </View>
          ) : totalCalories <= 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.limeGlow }]}><Ionicons name="bar-chart-outline" size={25} color={colors.lime} /></View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{periodLogs.length > 0 ? copy.noCaloriesTitle : copy.emptyTitle}</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{periodLogs.length > 0 ? copy.noCaloriesBody : copy.emptyBody}</Text>
              <TouchableOpacity style={[styles.addMealButton, { backgroundColor: colors.lime }]} onPress={() => router.push('/(tabs)')}><Ionicons name="add" size={18} color="#0F172A" /><Text style={styles.addMealText}>{copy.addMeal}</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={styles.barsFlexRow}>
              {chartData.map((item, idx) => (
                <View key={idx} style={styles.chartColumn}>
                  <Text
                    style={[
                      styles.percentLabel,
                      { color: item.isHighlight ? colors.lime : colors.textMuted },
                      item.isHighlight && styles.percentLabelHighlight,
                    ]}
                  >
                    {item.calories > 0 ? number(item.calories) : ''}
                  </Text>

                  <View style={[styles.barTrack, { backgroundColor: isDarkMode ? '#242D3C' : '#E2E8F0' }]}>
                    {item.calories > 0 && <View style={[styles.barFill, { height: `${Math.max(7, item.calories / chartMax * 100)}%`, backgroundColor: item.isHighlight ? colors.lime : colors.accentGreen }]} />}
                  </View>

                  <Text
                    style={[
                      styles.dayText,
                      { color: item.isHighlight ? colors.textPrimary : colors.textSecondary },
                      item.isHighlight && { fontWeight: '900', color: colors.lime },
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Grid Activity & Health Cards */}
        <View style={styles.gridSection}>
          {/* Active Calories Burned Card */}
          <Animated.View
            entering={FadeInUp.delay(150).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="flame" size={16} color={colors.coral} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{copy.burned}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(totalBurned)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('kcal')}</Text>
            </Text>
          </Animated.View>

          {/* Steps Card */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <Ionicons name="footsteps" size={16} color={colors.sky} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{copy.steps}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(totalSteps)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('steps_unit')}</Text>
            </Text>
          </Animated.View>

          {/* Protein Card */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="fitness" size={16} color={colors.emerald} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('protein_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(totalProtein)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
            <View style={[styles.macroMeter, { backgroundColor: colors.inputBg }]}><View style={[styles.macroMeterFill, { width: `${macroEnergy ? totalProtein * 4 / macroEnergy * 100 : 0}%`, backgroundColor: colors.emerald }]} /></View>
          </Animated.View>

          {/* Carbs Card */}
          <Animated.View
            entering={FadeInUp.delay(300).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name="nutrition" size={16} color={colors.amber} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('carbs_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(totalCarbs)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
            <View style={[styles.macroMeter, { backgroundColor: colors.inputBg }]}><View style={[styles.macroMeterFill, { width: `${macroEnergy ? totalCarbs * 4 / macroEnergy * 100 : 0}%`, backgroundColor: colors.amber }]} /></View>
          </Animated.View>

          {/* Fat Card */}
          <Animated.View
            entering={FadeInUp.delay(350).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 107, 74, 0.15)' }]}>
                <Ionicons name="pie-chart" size={16} color={colors.coral} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{t('fat_total')}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(totalFat)} <Text style={[styles.gridValUnit, { color: colors.textSecondary }]}>{t('grams')}</Text>
            </Text>
            <View style={[styles.macroMeter, { backgroundColor: colors.inputBg }]}><View style={[styles.macroMeterFill, { width: `${macroEnergy ? totalFat * 9 / macroEnergy * 100 : 0}%`, backgroundColor: colors.coral }]} /></View>
          </Animated.View>

          {/* Total Meals Card */}
          <Animated.View
            entering={FadeInUp.delay(400).duration(400)}
            style={[styles.gridCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          >
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.limeGlow }]}>
                <Ionicons name="camera" size={16} color={colors.lime} />
              </View>
              <Text style={[styles.gridCardTitle, { color: colors.textPrimary }]}>{copy.meals}</Text>
            </View>
            <Text style={[styles.gridValNum, { color: colors.textPrimary }]}>
              {number(periodLogs.length)}
            </Text>
          </Animated.View>
        </View>
      </ScrollView>

      <PaywallModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 112,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleBackBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  headerEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  headerSubtitle: { fontSize: 13, marginTop: 3 },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 12,
    alignItems: 'center',
  },
  periodTabActive: {
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  caloriesHeroSection: {
    borderRadius: 25,
    backgroundColor: '#14251A',
    padding: 21,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  caloriesLabel: {
    color: '#D9E9DA',
    fontSize: 13,
    fontWeight: '700',
  },
  caloriesNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    marginTop: 11,
  },
  caloriesBigVal: {
    color: '#BEF264',
    fontSize: 49,
    fontWeight: '900',
    letterSpacing: -2,
  },
  kcalUnit: {
    color: '#D9E9DA',
    fontSize: 15,
    fontWeight: '700',
  },
  targetCalText: {
    color: '#A8BBAA',
    fontSize: 11,
  },
  targetBold: {
    color: '#EAF8E2',
    fontSize: 11,
    fontWeight: '800',
  },
  heroRange: { color: '#A8BBAA', fontSize: 12, marginTop: 1 },
  goalTrack: { height: 8, borderRadius: 5, backgroundColor: '#33483A', overflow: 'hidden', marginTop: 20 },
  goalFill: { height: '100%', borderRadius: 5, backgroundColor: '#BEF264' },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 8 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#33483A' },
  heroStat: { flex: 1 },
  heroStatValue: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  heroStatLabel: { color: '#A8BBAA', fontSize: 10, marginTop: 3 },
  heroDivider: { height: 31, width: 1, backgroundColor: '#33483A', marginHorizontal: 18 },
  chartCard: {
    borderRadius: 23,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitleRow: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  chartSub: {
    fontSize: 12,
    marginTop: 2,
  },
  barsFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 172,
  },
  chartColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    flex: 1,
  },
  percentLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  percentLabelHighlight: {
    fontWeight: '900',
  },
  barTrack: {
    width: 22,
    maxWidth: '75%',
    height: 118,
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    width: '100%',
    borderRadius: 9,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: 20, paddingBottom: 6 },
  emptyIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 270 },
  addMealButton: { flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, marginTop: 17 },
  addMealText: { color: '#0F172A', fontSize: 12, fontWeight: '900' },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    gap: 8,
  },
  gridCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  gridValNum: {
    fontSize: 20,
    fontWeight: '900',
  },
  gridValUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  macroMeter: { width: '100%', height: 6, borderRadius: 4, overflow: 'hidden' },
  macroMeterFill: { height: '100%', borderRadius: 4 },
});
