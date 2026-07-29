import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
import { PaywallModal } from '@/components/PaywallModal';

export default function StatisticsScreen() {
  const { isPro, openPaywall } = useSubscription();

  const chartData = [
    { day: 'Mon', percent: 44, fillHeight: '44%' },
    { day: 'Tue', percent: 34, fillHeight: '34%' },
    { day: 'Wed', percent: 110, fillHeight: '100%', isHighlight: true },
    { day: 'Thu', percent: 47, fillHeight: '47%' },
    { day: 'Fri', percent: 32, fillHeight: '32%' },
    { day: 'Sat', percent: 79, fillHeight: '79%' },
    { day: 'Sun', percent: 24, fillHeight: '24%' },
  ];

  const colors = Colors.light;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <TouchableOpacity style={styles.circleBackBtn}>
            <Ionicons name="chevron-back" size={20} color="#1E293B" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Statistic</Text>

          <TouchableOpacity style={styles.circleBackBtn} onPress={() => openPaywall('analytics_options')}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#1E293B" />
          </TouchableOpacity>
        </View>

        {/* Hero Calories Counter */}
        <View style={styles.caloriesHeroSection}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <View style={styles.caloriesNumberRow}>
            <Text style={styles.caloriesBigVal}>1250</Text>
            <Text style={styles.kcalUnit}>Kcal</Text>
            <Text style={styles.targetCalText}>Target: <Text style={styles.targetBold}>1920 Kcal</Text></Text>
          </View>
        </View>

        {/* Bar Chart Container */}
        <View style={styles.chartCard}>
          <View style={styles.barsFlexRow}>
            {chartData.map((item, idx) => (
              <View key={idx} style={styles.chartColumn}>
                <Text style={[styles.percentLabel, item.isHighlight && styles.percentLabelHighlight]}>
                  {item.percent}%
                </Text>

                <View style={styles.barTrack}>
                  {/* Striped Background Pattern */}
                  <View style={styles.stripedPattern} />
                  {/* Filled Bar */}
                  <View
                    style={[
                      styles.barFill,
                      { height: item.fillHeight as any },
                      item.isHighlight && styles.barFillHighlight,
                    ]}
                  />
                </View>

                <Text style={styles.dayText}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 4-Grid Activity & Health Cards */}
        <View style={styles.gridSection}>
          {/* Exercise Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="barbell-outline" size={16} color="#16A34A" />
              </View>
              <Text style={styles.gridCardTitle}>Exercise</Text>
            </View>

            {/* Mini Bar Sparkline */}
            <View style={styles.miniBarRow}>
              {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                <View key={i} style={[styles.miniBar, { height: `${h}%` }]} />
              ))}
            </View>

            <Text style={styles.gridValNum}>2.0 <Text style={styles.gridValUnit}>hours</Text></Text>
          </View>

          {/* BPM Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="heart" size={16} color="#EF4444" />
              </View>
              <Text style={styles.gridCardTitle}>BPM</Text>
            </View>

            {/* Mini Wave Sparkline */}
            <View style={styles.waveRow}>
              <Ionicons name="pulse" size={28} color="#EF4444" />
            </View>

            <Text style={styles.gridValNum}>86 <Text style={styles.gridValUnit}>bpm</Text></Text>
          </View>

          {/* Weight Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Ionicons name="scale-outline" size={16} color="#F97316" />
              </View>
              <Text style={styles.gridCardTitle}>Weight</Text>
            </View>

            <View style={styles.weightRow}>
              <Text style={styles.gridValNum}>68.5 <Text style={styles.gridValUnit}>kg</Text></Text>
            </View>
          </View>

          {/* Water Card */}
          <View style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={16} color="#0EA5E9" />
              </View>
              <Text style={styles.gridCardTitle}>Water</Text>
            </View>

            <View style={styles.waterDotsRow}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[styles.waterDot, i < 4 && styles.waterDotFilled]} />
              ))}
            </View>
            <Text style={styles.gridValNum}>12 <Text style={styles.gridValUnit}>glass</Text></Text>
          </View>
        </View>
      </ScrollView>

      <PaywallModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  circleBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  caloriesHeroSection: {
    marginBottom: 20,
  },
  caloriesLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  caloriesNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesBigVal: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
  },
  kcalUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 10,
  },
  targetCalText: {
    fontSize: 13,
    color: '#64748B',
  },
  targetBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  barsFlexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 200,
  },
  chartColumn: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    flex: 1,
  },
  percentLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 6,
  },
  percentLabelHighlight: {
    color: '#0F172A',
    fontWeight: '900',
  },
  barTrack: {
    width: 20,
    height: 140,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 8,
  },
  stripedPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
  barFill: {
    width: '100%',
    backgroundColor: '#BEF264',
    borderRadius: 10,
  },
  barFillHighlight: {
    backgroundColor: '#84CC16',
  },
  dayText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  gridSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
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
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  miniBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 24,
  },
  miniBar: {
    flex: 1,
    backgroundColor: '#84CC16',
    borderRadius: 2,
  },
  waveRow: {
    height: 24,
    justifyContent: 'center',
  },
  weightRow: {
    height: 24,
    justifyContent: 'center',
  },
  waterDotsRow: {
    flexDirection: 'row',
    gap: 6,
    height: 24,
    alignItems: 'center',
  },
  waterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  waterDotFilled: {
    backgroundColor: '#0EA5E9',
  },
  gridValNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  gridValUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
});
