import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { AuthService } from '@/services/authService';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { user, isPro, openPaywall } = useSubscription();

  const handleLogout = async () => {
    onClose();
    await AuthService.signOut();
    router.replace('/auth' as any);
  };

  const handleLoginPress = () => {
    onClose();
    router.push('/auth' as any);
  };

  const displayName = user ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Member User') : 'Guest User';
  const displayEmail = user?.email || null;
  const avatarUrl = user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account & Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* User Profile Card */}
          <View style={styles.userCard}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
            <Text style={styles.userName}>{displayName}</Text>
            {displayEmail ? <Text style={styles.userEmail}>{displayEmail}</Text> : null}

            <View style={[styles.statusBadge, isPro ? styles.proBadge : styles.freeBadge]}>
              <Ionicons name={isPro ? 'sparkles' : 'person'} size={12} color="#0F172A" />
              <Text style={styles.statusBadgeText}>
                {isPro ? 'PRO MEMBER' : (user ? 'FREE TIER (3 Scans/Day)' : 'GUEST MODE')}
              </Text>
            </View>
          </View>

          {/* Daily Goals Summary */}
          <View style={styles.goalsCard}>
            <Text style={styles.cardSectionTitle}>Daily Health Goals</Text>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Calorie Target</Text>
              <Text style={styles.goalVal}>1,920 kcal</Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Protein Target</Text>
              <Text style={styles.goalVal}>145g</Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>Water Target</Text>
              <Text style={styles.goalVal}>2,500 ml (10 glasses)</Text>
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.cardSectionTitle}>Account & Membership</Text>

            {!isPro ? (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => {
                  onClose();
                  openPaywall('profile_modal');
                }}
              >
                <Ionicons name="sparkles" size={18} color="#0F172A" />
                <Text style={styles.upgradeBtnText}>Upgrade to MealPulse PRO</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.activeProRow}>
                <Ionicons name="checkmark-circle" size={18} color="#84CC16" />
                <Text style={styles.activeProText}>PRO Subscription Active</Text>
              </View>
            )}

            {!user ? (
              <TouchableOpacity style={styles.loginCardBtn} onPress={handleLoginPress}>
                <Ionicons name="log-in-outline" size={18} color="#0F172A" />
                <Text style={styles.loginCardBtnText}>Sign In / Register Account</Text>
                <Ionicons name="chevron-forward" size={16} color="#0F172A" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={[styles.menuRowText, { color: '#EF4444' }]}>Log Out / Switch Account</Text>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#BEF264',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  proBadge: {
    backgroundColor: '#BEF264',
  },
  freeBadge: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  goalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  goalVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  upgradeBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  activeProRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7FEE7',
    padding: 12,
    borderRadius: 12,
  },
  activeProText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4D7C0F',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuRowText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginLeft: 10,
  },
  loginCardBtn: {
    backgroundColor: '#BEF264',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loginCardBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginLeft: 10,
  },
});
