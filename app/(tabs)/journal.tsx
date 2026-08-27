import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { PaywallModal } from '@/components/PaywallModal';
import { SupabaseService } from '@/services/supabaseService';

interface JournalEntry {
  id: string;
  date: string;
  note: string;
  sentiment: 'High Focus' | 'Balanced' | 'Challenged';
  aiAdvice: string;
}

export default function JournalScreen() {
  const { isPro, openPaywall, user } = useSubscription();
  const { colors, isDarkMode } = useTheme();

  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentiment, setSentiment] = useState<'High Focus' | 'Balanced' | 'Challenged'>('High Focus');
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      date: 'Today',
      note: 'Maintained optimal macro targets and completed 16h intermittent fast. High energy during morning workouts.',
      sentiment: 'High Focus',
      aiAdvice: 'Great momentum! Consistent protein intake paired with adequate hydration accelerates metabolic recovery.',
    },
  ]);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    SupabaseService.fetchJournalEntries(user.id).then((cloudEntries) => {
      if (cloudEntries && cloudEntries.length > 0) {
        const mapped: JournalEntry[] = cloudEntries.map((e: any) => ({
          id: e.id,
          date: e.created_at ? new Date(e.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Today',
          note: e.note,
          sentiment: e.sentiment || 'High Focus',
          aiAdvice: e.ai_advice || 'AI Insight: Consistent execution identified.',
        }));
        setEntries(mapped);
      }
    });
  }, [user]);

  const handleSaveEntry = async () => {
    if (!noteText.trim()) return;

    triggerHaptic('success');
    setLoading(true);

    const note = noteText.trim();
    const aiAdvice = 'AI Insight: Consistent execution identified. Daily reflection improves adherence by 40%.';

    if (user?.id) {
      const created = await SupabaseService.saveJournalEntry(user.id, {
        note,
        sentiment,
        aiAdvice,
      });

      if (created) {
        const newEntry: JournalEntry = {
          id: created.id,
          date: 'Just now',
          note: created.note,
          sentiment: created.sentiment || sentiment,
          aiAdvice: created.ai_advice || aiAdvice,
        };
        setEntries((prev) => [newEntry, ...prev]);
        setNoteText('');
        setLoading(false);
        return;
      }
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: 'Just now',
      note,
      sentiment,
      aiAdvice,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setNoteText('');
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>AI Mindset Journal</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Reflection & AI Performance Insights</Text>
          </View>
        </View>

        {/* Input Card */}
        <Animated.View
          entering={FadeInUp.duration(500)}
          style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 }]}
        >
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Daily Reflection</Text>

          {/* Sentiment Pill Selector */}
          <View style={styles.sentimentRow}>
            {(['High Focus', 'Balanced', 'Challenged'] as const).map((s) => {
              const isSelected = sentiment === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.sentimentChip,
                    { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                    isSelected && {
                      backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1',
                      borderColor: colors.lime,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => {
                    triggerHaptic('light');
                    setSentiment(s);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.sentimentChipText,
                      { color: isSelected ? colors.lime : colors.textSecondary },
                      isSelected && { fontWeight: '900' },
                    ]}
                  >
                    {s === 'High Focus' ? '⚡ ' : s === 'Balanced' ? '🌿 ' : '🔥 '}
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.inputBorder },
            ]}
            placeholder="How was your energy and nutrition balance today? What wins occurred?"
            placeholderTextColor={colors.textMuted}
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.lime }]}
            onPress={handleSaveEntry}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0F172A" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#0F172A" />
                <Text style={styles.saveBtnText}>Analyze & Save Entry</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* PRO Trend Analytics Teaser */}
        {!isPro && (
          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <TouchableOpacity
              style={[
                styles.proAnalyticsCard,
                {
                  backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : '#FFFBEB',
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                },
              ]}
              onPress={() => {
                triggerHaptic('medium');
                openPaywall('journal_analytics');
              }}
              activeOpacity={0.85}
            >
              <View style={styles.proAnalyticsLeft}>
                <View style={[styles.lockCircle, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <Ionicons name="analytics" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.proAnalyticsTitle, { color: colors.textPrimary }]}>Unlock 30-Day Mindset Analytics</Text>
                  <Text style={[styles.proAnalyticsSub, { color: colors.textSecondary }]}>
                    Track emotional focus trends, burn-out indicators & weekly AI coaching summaries.
                  </Text>
                </View>
              </View>
              <View style={[styles.proPill, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.proPillText}>PRO</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Previous Entries */}
        <View style={styles.entriesSection}>
          <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>Journal History</Text>
          {entries.map((entry, idx) => (
            <Animated.View
              key={entry.id}
              entering={FadeInUp.delay(120 + idx * 50).duration(400)}
              style={[styles.entryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            >
              <View style={styles.entryHeader}>
                <View style={[styles.sentimentBadge, { backgroundColor: colors.limeGlow }]}>
                  <Ionicons name="sunny" size={12} color={colors.lime} />
                  <Text style={[styles.sentimentText, { color: colors.lime }]}>{entry.sentiment}</Text>
                </View>
                <Text style={[styles.entryDate, { color: colors.textSecondary }]}>{entry.date}</Text>
              </View>
              <Text style={[styles.entryNote, { color: colors.textPrimary }]}>{entry.note}</Text>
              <View style={[styles.aiAdviceBox, { backgroundColor: colors.inputBg }]}>
                <Ionicons name="sparkles" size={14} color={colors.lime} />
                <Text style={[styles.aiAdviceText, { color: colors.textSecondary }]}>{entry.aiAdvice}</Text>
              </View>
            </Animated.View>
          ))}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },
  sentimentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sentimentChip: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  sentimentChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  proAnalyticsCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  proAnalyticsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  lockCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proAnalyticsTitle: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  proAnalyticsSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  proPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proPillText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  entriesSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  entryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sentimentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentimentText: {
    fontSize: 11,
    fontWeight: '900',
  },
  entryDate: {
    fontSize: 11,
  },
  entryNote: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 12,
  },
  aiAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 10,
  },
  aiAdviceText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
