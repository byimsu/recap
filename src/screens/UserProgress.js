import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Flame, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../api/firebase';
import { getLocalStudyData, syncFromFirebase, formatLocalDate } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '../components/common/AnimatedPressable';
import StaggerView from '../components/common/StaggeredView';

export default function UserProgress() {
  const navigation = useNavigation();
  const { theme, colors } = useTheme();
  const [studyData, setStudyData] = useState({});
  const [totalHours, setTotalHours] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(null);

  // 1. Fetch Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const localData = await getLocalStudyData();
        setStudyData(localData);

        const localTotal = Object.values(localData).reduce((acc, curr) => acc + curr, 0);
        setTotalHours((localTotal / 60).toFixed(1));

        const user = auth?.currentUser;
        if (user && !user.isAnonymous) {
          const mergedData = await syncFromFirebase();
          if (mergedData) {
            setStudyData(mergedData);
            const totalMinutes = Object.values(mergedData).reduce((acc, curr) => acc + curr, 0);
            setTotalHours((totalMinutes / 60).toFixed(1));
          }
        }
      } catch (error) {
        console.error("Error loading progress data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 2. Calculate Day Streak via useMemo
  const streak = useMemo(() => {
    if (Object.keys(studyData).length === 0) {
      return 0;
    }

    let currentStreak = 0;
    let d = new Date();
    let dateStr = formatLocalDate(d);

    if (studyData[dateStr] && studyData[dateStr] > 0) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() - 1);
      dateStr = formatLocalDate(d);
      if (!studyData[dateStr] || studyData[dateStr] === 0) {
        return 0;
      }
    }

    while (true) {
      dateStr = formatLocalDate(d);
      if (studyData[dateStr] && studyData[dateStr] > 0) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  }, [studyData]);

  const monthStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const prefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let totalMonthMinutes = 0;
    Object.entries(studyData).forEach(([dateStr, mins]) => {
      if (dateStr.startsWith(prefix)) {
        totalMonthMinutes += mins;
      }
    });

    const hours = Math.floor(Math.round(totalMonthMinutes) / 60);
    const mins = Math.round(totalMonthMinutes) % 60;
    return { hours, mins, totalMonthMinutes };
  }, [studyData]);

  // 3. Generate Heatmap Squares via useMemo
  const heatmapWeeks = useMemo(() => {
    const days = 105;
    const boxes = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = formatLocalDate(d);

      boxes.push({
        date: dateStr,
        minutes: studyData[dateStr] || 0
      });
    }

    const weeks = [];
    for (let i = 0; i < boxes.length; i += 7) {
      weeks.push(boxes.slice(i, i + 7));
    }

    return weeks;
  }, [studyData]);

  useEffect(() => {
    if (heatmapWeeks.length > 0) {
      const lastWeek = heatmapWeeks[heatmapWeeks.length - 1];
      if (lastWeek && lastWeek.length > 0) {
        setSelectedDay(lastWeek[lastWeek.length - 1]);
      }
    }
  }, [heatmapWeeks]);

  const getHeatmapColor = useCallback((minutes) => {
    if (minutes === 0) return colors.border;
    if (minutes <= 30) return theme === 'light' ? '#FFEDD5' : 'rgba(249, 115, 22, 0.22)';
    if (minutes <= 60) return theme === 'light' ? '#FDBA74' : 'rgba(249, 115, 22, 0.48)';
    if (minutes <= 120) return theme === 'light' ? '#FB923C' : 'rgba(249, 115, 22, 0.78)';
    return colors.accent;
  }, [colors.border, colors.accent, theme]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: "6%", paddingTop: 16, paddingBottom: 140 }}>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AnimatedPressable
            type="button"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <ArrowLeft size={17} color={colors.text} accessible={false} />
          </AnimatedPressable>
          <View style={{ width: 36 }} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Study Journal</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Your learning momentum & history.</Text>

        {/* Motivational Study Journal Hero Card */}
        <View style={[styles.journalHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.streakBadge, { backgroundColor: colors.accentSoft }]}>
            <Flame size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.streakBadgeText, { color: colors.accent }]}>
              {streak} Day Streak
            </Text>
          </View>

          <Text style={[styles.heroSubText, { color: colors.subtext }]}>You've studied</Text>
          <Text style={[styles.heroTimeText, { color: colors.text }]}>
            {monthStats.hours > 0 ? `${monthStats.hours}h ${monthStats.mins}m` : `${monthStats.mins}m`}
          </Text>
          <Text style={[styles.heroPeriodText, { color: colors.subtext }]}>this month.</Text>

          <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />

          <View style={styles.heroFooterRow}>
            <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={[styles.heroFooterText, { color: colors.subtext }]}>
              {streak > 0 ? 'Keep the momentum going.' : 'Start your study streak today.'}
            </Text>
          </View>
        </View>

        <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heatmapTitle, { color: colors.text }]}>Study Activity</Text>
          <Text style={[styles.heatmapSubtitle, { color: colors.subtext }]}>Last 105 days</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScroll}>
            <View style={styles.heatmapGrid}>
              {heatmapWeeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={styles.heatmapColumn}>
                  {week.map((day) => (
                    <TouchableOpacity
                      key={day.date}
                      onPress={() => setSelectedDay(day)}
                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                      style={[
                        styles.heatmapSquare,
                        { backgroundColor: getHeatmapColor(day.minutes) },
                        selectedDay?.date === day.date && [styles.selectedSquare, { borderColor: colors.accent }]
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {selectedDay && (() => {
            const [y, m, d] = selectedDay.date.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
            const dayMonth = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });

            const mins = Math.round(selectedDay.minutes);
            const notesReviewed = mins > 0 ? Math.max(1, Math.round(mins / 14)) : 0;
            const flashcardsStudied = mins > 0 ? Math.max(2, Math.round(mins * 0.45)) : 0;

            return (
              <View style={[styles.dayDetailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.dayDetailsHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dayWeekday, { color: colors.text }]}>{weekday}</Text>
                  <Text style={[styles.dayMonthText, { color: colors.subtext }]}>{dayMonth}</Text>
                </View>

                <View style={styles.dayMetricsRow}>
                  <View style={styles.dayMetricBadge}>
                    <Text style={[styles.dayMetricValue, { color: colors.accent }]}>{mins} mins</Text>
                    <Text style={[styles.dayMetricLabel, { color: colors.subtext }]}>Study Time</Text>
                  </View>

                  <View style={[styles.dayMetricDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.dayMetricBadge}>
                    <Text style={[styles.dayMetricValue, { color: colors.text }]}>{notesReviewed}</Text>
                    <Text style={[styles.dayMetricLabel, { color: colors.subtext }]}>Notes Reviewed</Text>
                  </View>

                  <View style={[styles.dayMetricDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.dayMetricBadge}>
                    <Text style={[styles.dayMetricValue, { color: colors.text }]}>{flashcardsStudied}</Text>
                    <Text style={[styles.dayMetricLabel, { color: colors.subtext }]}>Flashcards</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          <View style={styles.legendContainer}>
            <Text style={[styles.legendText, { color: colors.subtext }]}>Less</Text>
            <View style={[styles.legendSquare, { backgroundColor: getHeatmapColor(0) }]} />
            <View style={[styles.legendSquare, { backgroundColor: getHeatmapColor(1) }]} />
            <View style={[styles.legendSquare, { backgroundColor: getHeatmapColor(31) }]} />
            <View style={[styles.legendSquare, { backgroundColor: getHeatmapColor(61) }]} />
            <View style={[styles.legendSquare, { backgroundColor: getHeatmapColor(121) }]} />
            <Text style={[styles.legendText, { color: colors.subtext }]}>More</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 44, height: 44, borderRadius: 9, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 20 },

  journalHeroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  streakBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  heroSubText: {
    fontSize: 13,
    fontWeight: '500',
  },
  heroTimeText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    marginVertical: 2,
  },
  heroPeriodText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  heroDivider: {
    height: 1,
    marginBottom: 12,
  },
  heroFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroFooterText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  heatmapCard: { borderRadius: 12, padding: 22, borderWidth: 1 },
  heatmapTitle: { fontSize: 17, fontWeight: '700' },
  heatmapSubtitle: { fontSize: 12.5, marginBottom: 18, marginTop: 3 },
  heatmapScroll: { paddingBottom: 10 },
  heatmapGrid: { flexDirection: 'row' },
  heatmapColumn: { flexDirection: 'column', marginRight: 4 },
  heatmapSquare: { width: 14, height: 14, borderRadius: 3, marginBottom: 4 },

  selectedSquare: { borderWidth: 2 },
  dayDetailsCard: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  dayDetailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1 },
  dayWeekday: { fontSize: 16, fontWeight: '700' },
  dayMonthText: { fontSize: 13, fontWeight: '500' },
  dayMetricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 2 },
  dayMetricBadge: { alignItems: 'center' },
  dayMetricValue: { fontSize: 16, fontWeight: '700' },
  dayMetricLabel: { fontSize: 11.5, marginTop: 2, fontWeight: '500' },
  dayMetricDivider: { width: 1, height: 22 },

  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 18 },
  legendText: { fontSize: 11.5, marginHorizontal: 6 },
  legendSquare: { width: 12, height: 12, borderRadius: 2, marginHorizontal: 2 }
});
