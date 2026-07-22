import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth } from '../api/firebase';
import { getLocalStudyData, syncFromFirebase, formatLocalDate } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';

export default function UserProgress() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [studyData, setStudyData] = useState({});
  const [heatmapWeeks, setHeatmapWeeks] = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  // QoL: State to hold the data of the currently tapped heatmap square
  const [selectedDay, setSelectedDay] = useState(null);

  // 1. Fetch Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Step 1: Load Local Data immediately (Fast, 0 cost)
        const localData = await getLocalStudyData();
        setStudyData(localData);

        // Calculate initial total hours from local data
        const localTotal = Object.values(localData).reduce((acc, curr) => acc + curr, 0);
        setTotalHours((localTotal / 60).toFixed(1));

        // Step 2: If logged in, sync from Firebase (One-time fetch, saves reads)
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

  // 2. Calculate the True Day Streak
  useEffect(() => {
    if (Object.keys(studyData).length === 0) {
      setStreak(0);
      return;
    }

    let currentStreak = 0;
    let d = new Date();
    let dateStr = formatLocalDate(d);

    // Check if they studied today
    if (studyData[dateStr] && studyData[dateStr] > 0) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      // Didn't study today, let's check yesterday to see if streak is still alive
      d.setDate(d.getDate() - 1);
      dateStr = formatLocalDate(d);
      if (!studyData[dateStr] || studyData[dateStr] === 0) {
        setStreak(0);
        return;
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

    setStreak(currentStreak);
  }, [studyData]);

  // 3. Generate Heatmap Squares
  useEffect(() => {
    const days = 105;
    const boxes = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
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

    setHeatmapWeeks(weeks);

    // Set the default selected day to today
    if (boxes.length > 0) {
      setSelectedDay(boxes[boxes.length - 1]);
    }
  }, [studyData]);

  const getHeatmapColor = (minutes) => {
    if (minutes === 0) return colors.bg === '#FFFFFF' ? '#ebedf0' : '#262626';
    if (minutes <= 30) return "#9be9a8";
    if (minutes <= 60) return "#40c463";
    if (minutes <= 120) return "#30a14e";
    return "#216e39";
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: "6%", paddingTop: "16%", paddingBottom: "10%" }}>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 46 }} />
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
                      style={[
                        styles.heatmapSquare,
                        { backgroundColor: getHeatmapColor(day.minutes) },
                        selectedDay?.date === day.date && [styles.selectedSquare, { borderColor: colors.text }]
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* QoL: Show info for the tapped square */}
          {selectedDay && (
            <View style={[styles.selectedDayInfo, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.selectedDayText, { color: colors.text }]}>
                {selectedDay.minutes} mins <Text style={{ color: colors.subtext }}>on {selectedDay.date}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { width: '48%', borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1 },
  statNumber: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 14, marginTop: 4, fontWeight: '500' },

  heatmapCard: { borderRadius: 18, padding: 20, borderWidth: 1 },
  heatmapTitle: { fontSize: 18, fontWeight: '700' },
  heatmapSubtitle: { fontSize: 13, marginBottom: 16, marginTop: 2 },
  heatmapScroll: { paddingBottom: 10 },
  heatmapGrid: { flexDirection: 'row' },
  heatmapColumn: { flexDirection: 'column', marginRight: 4 },
  heatmapSquare: { width: 14, height: 14, borderRadius: 3, marginBottom: 4 },

  selectedSquare: { borderWidth: 2 },
  selectedDayInfo: { marginTop: 10, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  selectedDayText: { fontSize: 14, fontWeight: '600' },

  legendContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 16 },
  legendText: { fontSize: 12, marginHorizontal: 6 },
  legendSquare: { width: 12, height: 12, borderRadius: 2, marginHorizontal: 2 }
});
