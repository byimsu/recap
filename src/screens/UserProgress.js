import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../api/firebase';
import { getLocalStudyData, syncFromFirebase, formatLocalDate } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function UserProgress() {
  const navigation = useNavigation();
  const { colors } = useTheme();
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
    if (minutes <= 30) return '#C7DEFF';
    if (minutes <= 60) return '#93BCFF';
    if (minutes <= 120) return '#6699FF';
    return colors.accent;
  }, [colors.border, colors.accent]);

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: "6%", paddingTop: 16, paddingBottom: "10%" }}>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 42 }} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Your Progress</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Track your study habits and activity.</Text>

        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Day Streak</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{totalHours}</Text>
            <Text style={[styles.statLabel, { color: colors.subtext }]}>Hours Studied</Text>
          </View>
        </View>

        <View style={[styles.heatmapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.heatmapTitle, { color: colors.text }]}>Study Activity</Text>
          <Text style={[styles.heatmapSubtitle, { color: colors.subtext }]}>Past 105 days</Text>

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

          {selectedDay && (
            <View style={[styles.selectedDayInfo, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
              <Text style={[styles.selectedDayText, { color: colors.text }]}>
                {selectedDay.minutes} min{selectedDay.minutes !== 1 ? 's' : ''}{' '}
                <Text style={{ color: colors.subtext }}>on {selectedDay.date}</Text>
              </Text>
            </View>
          )}

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
  iconBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 28 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { width: '48%', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1 },
  statNumber: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  statLabel: { fontSize: 13, marginTop: 6, fontWeight: '600' },

  heatmapCard: { borderRadius: 12, padding: 22, borderWidth: 1 },
  heatmapTitle: { fontSize: 17, fontWeight: '700' },
  heatmapSubtitle: { fontSize: 12.5, marginBottom: 18, marginTop: 3 },
  heatmapScroll: { paddingBottom: 10 },
  heatmapGrid: { flexDirection: 'row' },
  heatmapColumn: { flexDirection: 'column', marginRight: 4 },
  heatmapSquare: { width: 14, height: 14, borderRadius: 3, marginBottom: 4 },

  selectedSquare: { borderWidth: 2 },
  selectedDayInfo: { marginTop: 14, padding: 13, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  selectedDayText: { fontSize: 13.5, fontWeight: '600' },

  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 18 },
  legendText: { fontSize: 11.5, marginHorizontal: 6 },
  legendSquare: { width: 12, height: 12, borderRadius: 2, marginHorizontal: 2 }
});
