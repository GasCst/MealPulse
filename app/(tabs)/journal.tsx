import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '@/context/SubscriptionContext';
import { Colors } from '@/constants/theme';
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

  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      date: 'Today',
      note: 'Built out the primary paywall screen with weekly & monthly subscription options. Staying focused on the $1k/mo MRR target.',
      sentiment: 'High Focus',
      aiAdvice: 'Great momentum! High conversion paywalls convert 3.5x better when paired with a 3-day free trial on weekly plans.',
    },
  ]);

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

    setLoading(true);

    const note = noteText.trim();
    const sentiment = 'High Focus';
    const aiAdvice = 'AI Insight: Consistent execution identified. Recommend doubling down on daily nutrition tracking.';

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Mindset Journal</Text>
            <Text style={styles.subtitle}>Reflection & AI Performance Insights</Text>
          </View>
        </View>

        {/* Input Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Mindset Reflection</Text>
          <TextInput
            style={styles.textInput}
            placeholder="How was your focus and momentum today? What wins or blockers occurred?"
            placeholderTextColor="#64748B"
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSaveEntry}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={16} color="#FFF" />
                <Text style={styles.saveBtnText}>Analyze & Save Entry</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* PRO Trend Analytics Teaser */}
        {!isPro && (
          <TouchableOpacity
            style={styles.proAnalyticsCard}
            onPress={() => openPaywall('journal_analytics')}
            activeOpacity={0.85}
          >
            <View style={styles.proAnalyticsLeft}>
              <View style={styles.lockCircle}>
                <Ionicons name="analytics" size={18} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.proAnalyticsTitle}>Unlock 30-Day Mindset Analytics</Text>
                <Text style={styles.proAnalyticsSub}>
                  Track emotional focus trends, burn-out indicators & weekly AI coaching summaries.
                </Text>
              </View>
            </View>
            <View style={styles.proPill}>
              <Text style={styles.proPillText}>PRO</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Previous Entries */}
        <View style={styles.entriesSection}>
          <Text style={styles.sectionHeader}>Journal History</Text>
          {entries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.sentimentBadge}>
                  <Ionicons name="sunny" size={12} color="#10B981" />
                  <Text style={styles.sentimentText}>{entry.sentiment}</Text>
                </View>
                <Text style={styles.entryDate}>{entry.date}</Text>
              </View>
              <Text style={styles.entryNote}>{entry.note}</Text>
              <View style={styles.aiAdviceBox}>
                <Ionicons name="sparkles" size={14} color="#818CF8" />
                <Text style={styles.aiAdviceText}>{entry.aiAdvice}</Text>
              </View>
            </View>
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
    backgroundColor: '#090D16',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  saveBtn: {
    backgroundColor: '#6366F1',
    paddingVertical: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  proAnalyticsCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proAnalyticsTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  proAnalyticsSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  proPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proPillText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  entriesSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  entryCard: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentimentText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  entryDate: {
    fontSize: 11,
    color: '#64748B',
  },
  entryNote: {
    fontSize: 13.5,
    color: '#F8FAFC',
    lineHeight: 20,
    marginBottom: 12,
  },
  aiAdviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 10,
    padding: 10,
  },
  aiAdviceText: {
    fontSize: 12,
    color: '#818CF8',
    flex: 1,
    lineHeight: 17,
  },
});
