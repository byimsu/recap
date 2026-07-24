import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Calendar, Bell, ChevronRight, BookOpen } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StudyPlannerScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      
      <ScrollView contentContainerStyle={{ paddingHorizontal: "6%", paddingTop: 16, paddingBottom: "10%" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Study Planner</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Manage your study schedules, reminders, and deadlines in one place.</Text>

        <View style={{ marginTop: 24 }}>
          {/* Deadlines Card */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => navigation.navigate('Deadlines')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
              <Calendar size={22} color={colors.accent} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Deadlines</Text>
              <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>Track assignments, exams, and projects.</Text>
            </View>
            <ChevronRight size={20} color={colors.subtext} />
          </TouchableOpacity>

          {/* Study Schedule Card */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
            onPress={() => navigation.navigate('StudySchedule')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft }]}>
              <Bell size={22} color={colors.accent} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Study Schedule</Text>
              <Text style={[styles.cardSubtitle, { color: colors.subtext }]}>Set daily study reminders and alerts.</Text>
            </View>
            <ChevronRight size={20} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  iconBtn: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 30, fontWeight: "700", marginTop: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13.5, marginTop: 6, marginBottom: 12, lineHeight: 20 },
  
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    borderRadius: 16, 
    borderWidth: 1, 
    marginBottom: 16 
  },
  iconBadge: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardContent: { 
    flex: 1, 
    marginLeft: 16,
    paddingRight: 10
  },
  cardTitle: { 
    fontSize: 17, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  cardSubtitle: { 
    fontSize: 13, 
    lineHeight: 18 
  }
});
