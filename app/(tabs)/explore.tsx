import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { PaywallModal } from '@/components/PaywallModal';

interface RecipeCardItem {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
  category: string;
  image: string;
  isPro?: boolean;
}

export default function ExploreScreen() {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const { isPro, openPaywall } = useSubscription();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  const tags = ['All', 'High Protein', 'Keto / Low Carb', 'Quick (<15m)', 'Plant-Based'];

  const recipes: RecipeCardItem[] = [
    {
      id: '1',
      title: 'Grilled Salmon & Quinoa Bowl',
      calories: 520,
      protein: 42,
      carbs: 38,
      fat: 18,
      time: '20 min',
      category: 'High Protein',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
    },
    {
      id: '2',
      title: 'Avocado Egg Toast with Feta',
      calories: 380,
      protein: 19,
      carbs: 26,
      fat: 22,
      time: '10 min',
      category: 'Quick (<15m)',
      image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500',
    },
    {
      id: '3',
      title: 'Lean Beef & Sweet Potato Mash',
      calories: 580,
      protein: 48,
      carbs: 52,
      fat: 14,
      time: '25 min',
      category: 'High Protein',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500',
      isPro: true,
    },
    {
      id: '4',
      title: 'Greek Yogurt Berry Power Parfait',
      calories: 290,
      protein: 24,
      carbs: 32,
      fat: 5,
      time: '5 min',
      category: 'Quick (<15m)',
      image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=500',
    },
    {
      id: '5',
      title: 'Crispy Tofu & Edamame Green Salad',
      calories: 340,
      protein: 26,
      carbs: 18,
      fat: 16,
      time: '15 min',
      category: 'Plant-Based',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500',
    },
    {
      id: '6',
      title: 'Keto Butter-Basted Ribeye',
      calories: 680,
      protein: 54,
      carbs: 2,
      fat: 52,
      time: '20 min',
      category: 'Keto / Low Carb',
      image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=500',
      isPro: true,
    },
  ];

  const triggerHaptic = (type: 'light' | 'medium' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
  };

  const filtered = recipes.filter((r) => {
    const matchesTag = selectedTag === 'All' || r.category === selectedTag;
    const matchesQuery = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesQuery;
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Explore Nutrition</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>High-Protein Recipes & Macro Inspirations</Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search healthy recipes, ingredients..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagsScroll}
          contentContainerStyle={styles.tagsContent}
        >
          {tags.map((tag) => {
            const isSelected = selectedTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                  isSelected && {
                    backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1',
                    borderColor: colors.lime,
                    borderWidth: 1.5,
                  },
                ]}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedTag(tag);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: isSelected ? colors.lime : colors.textSecondary },
                    isSelected && { fontWeight: '900' },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Recipe Cards Grid */}
        <View style={styles.recipeList}>
          {filtered.map((item, idx) => (
            <Animated.View
              key={item.id}
              entering={FadeInUp.delay(80 + idx * 50).duration(400)}
            >
              <TouchableOpacity
                style={[
                  styles.recipeCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, borderWidth: 1 },
                ]}
                onPress={() => {
                  triggerHaptic('medium');
                  if (item.isPro && !isPro) {
                    openPaywall('explore_recipe');
                  } else {
                    Alert.alert(
                      item.title,
                      `Calories: ${item.calories} kcal\nProtein: ${item.protein}g • Carbs: ${item.carbs}g • Fat: ${item.fat}g\nPrep Time: ${item.time}`
                    );
                  }
                }}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.recipeImg} />

                {item.isPro && !isPro && (
                  <View style={[styles.proBadge, { backgroundColor: colors.lime }]}>
                    <Ionicons name="lock-closed" size={10} color="#0F172A" />
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}

                <View style={styles.recipeDetails}>
                  <View style={styles.categoryRow}>
                    <Text style={[styles.categoryTag, { color: colors.lime }]}>{item.category.toUpperCase()}</Text>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>⏱ {item.time}</Text>
                  </View>

                  <Text style={[styles.recipeTitle, { color: colors.textPrimary }]}>{item.title}</Text>

                  <View style={styles.macroPillRow}>
                    <View style={[styles.macroBadge, { backgroundColor: 'rgba(255, 107, 74, 0.12)' }]}>
                      <Text style={[styles.macroBadgeText, { color: colors.coral }]}>🔥 {item.calories} kcal</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                      <Text style={[styles.macroBadgeText, { color: colors.emerald }]}>P: {item.protein}g</Text>
                    </View>
                    <View style={[styles.macroBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                      <Text style={[styles.macroBadgeText, { color: colors.sky }]}>C: {item.carbs}g</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
    paddingTop: 12,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  tagsScroll: {
    marginBottom: 18,
  },
  tagsContent: {
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recipeList: {
    gap: 14,
  },
  recipeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
  },
  recipeImg: {
    width: '100%',
    height: 160,
  },
  proBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  proBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  recipeDetails: {
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryTag: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
