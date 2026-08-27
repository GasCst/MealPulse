import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

interface WeeklyCalendarStripProps {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
}

export const WeeklyCalendarStrip: React.FC<WeeklyCalendarStripProps> = ({
  selectedDate = new Date(),
  onSelectDate,
}) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState<Date>(selectedDate);

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);

  const getWeekDays = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - distanceToMonday);

    const days = [];
    const dayNames = [
      t('day_mon'),
      t('day_tue'),
      t('day_wed'),
      t('day_thu'),
      t('day_fri'),
      t('day_sat'),
      t('day_sun'),
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        label: dayNames[i],
        dateNum: d.getDate(),
        fullDate: d,
        isToday: d.toDateString() === today.toDateString(),
        isSelected: d.toDateString() === currentDate.toDateString(),
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const handleSelect = (d: Date) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {}
    setCurrentDate(d);
    if (onSelectDate) onSelectDate(d);
  };

  return (
    <View style={styles.container}>
      <View style={styles.daysRow}>
        {weekDays.map((item, index) => {
          const isSelected = item.isSelected;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCol,
                { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                isSelected && [
                  styles.dayColSelected,
                  {
                    backgroundColor: isDarkMode ? '#1E281C' : '#F4FBF1',
                    borderColor: colors.lime,
                  },
                ],
              ]}
              onPress={() => handleSelect(item.fullDate)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: isSelected ? colors.lime : colors.textSecondary },
                  isSelected && styles.dayLabelBold,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.dateNum,
                  { color: isSelected ? (isDarkMode ? '#FEFFF1' : '#0F172A') : colors.textPrimary },
                  isSelected && styles.dateNumBold,
                ]}
              >
                {item.dateNum}
              </Text>
              {isSelected ? (
                <View style={[styles.activeDot, { backgroundColor: colors.lime }]} />
              ) : item.isToday ? (
                <View style={[styles.todayDot, { backgroundColor: colors.coral }]} />
              ) : (
                <View style={styles.emptyDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayCol: {
    width: 44,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderWidth: 1,
  },
  dayColSelected: {
    borderWidth: 1.5,
    shadowColor: '#84CC16',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  dayLabelBold: {
    fontWeight: '900',
  },
  dateNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateNumBold: {
    fontWeight: '900',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  emptyDot: {
    width: 5,
    height: 5,
    marginTop: 4,
  },
});
