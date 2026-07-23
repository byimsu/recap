import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getLocalStudyData, formatLocalDate } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getProfile } from '../services/profileService';

// Screen Imports
import HomeScreen from '../screens/HomeScreen';
import UserProgress from '../screens/UserProgress';
import Settings from '../screens/Settings';
import Trash from '../screens/Trash';
import StudySchedule from '../screens/StudySchedule';
import Deadlines from '../screens/Deadlines';

const Drawer = createDrawerNavigator();

const NAV_ITEMS = [
  { name: "Home", label: "Home", icon: "home" },
  { name: "UserProgress", label: "Progress", icon: "bar-chart-2" },
  { name: "Deadlines", label: "Deadlines", icon: "calendar" },
  { name: "StudySchedule", label: "Study Schedule", icon: "bell" },
  { name: "Profile", label: "Profile", icon: "user" },
  { name: "Settings", label: "Settings", icon: "settings" },
  { name: "Trash", label: "Trash", icon: "trash-2" },
];

function CustomDrawerContent(props) {
  const { colors } = useTheme();
  const { logout, user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [profile, setProfile] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchProfile = async () => {
        if (!user) return;
        try {
          const data = await getProfile(user);
          if (isMounted) {
            setProfile(data);
          }
        } catch (e) {
          console.error("Error loading profile in drawer:", e);
        }
      };
      fetchProfile();
      return () => { isMounted = false; };
    }, [user])
  );

  useFocusEffect(
    useCallback(() => {
      const calculateStreak = async () => {
        const studyData = await getLocalStudyData();
        if (Object.keys(studyData).length === 0) {
          setStreak(0);
          return;
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
      };

      calculateStreak();
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error("Logout Error:", error);
              Alert.alert("Logout Failed", "There was an issue signing you out.");
            }
          },
        },
      ]
    );
  };

  const activeRouteName = props.state.routeNames[props.state.index];
  const userName = profile?.displayName || (user?.isGuest ? 'Guest' : 'User');
  const photoURL = profile?.photoURL;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: "16%", paddingHorizontal: "6%" }}>
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={() => props.navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary, overflow: 'hidden' }]}>
            {photoURL ? (
              <Image
                source={{ uri: photoURL }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{userName}</Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.subtext} />
        </TouchableOpacity>

        {user?.isAnonymous && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => props.navigation.navigate("Register")}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#ffffff" />
            <Text style={styles.guestBannerText}>Save progress to cloud</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.streakIconBadge, { backgroundColor: colors.primary }]}>
            <Feather name="zap" size={16} color={colors.buttonText} />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.streakNumber, { color: colors.text }]}>
              {streak} <Text style={[styles.streakUnit, { color: colors.subtext }]}>day{streak === 1 ? '' : 's'}</Text>
            </Text>
            <Text style={[styles.streakSubtext, { color: colors.subtext }]}>
              {streak > 0 ? "Keep it going!" : "Study today to start a streak"}
            </Text>
          </View>
        </View>

        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeRouteName === item.name;
            return (
              <TouchableOpacity
                key={item.name}
                onPress={() => props.navigation.navigate(item.name)}
                style={[
                  styles.navItem,
                  isActive && { ...styles.navItemActive, backgroundColor: colors.card, borderColor: colors.border }
                ]}
              >
                <Feather
                  name={item.icon}
                  size={18}
                  color={isActive ? colors.text : colors.subtext}
                />
                <Text style={[
                  styles.navLabel,
                  { color: colors.subtext },
                  isActive && { ...styles.navLabelActive, color: colors.text }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={16} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerNavigator() {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        swipeEdgeWidth: 100,
        drawerStyle: {
          backgroundColor: colors.bg,
          width: '80%',
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          overflow: 'hidden',
        }
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="UserProgress" component={UserProgress} />
      <Drawer.Screen name="Deadlines" component={Deadlines} />
      <Drawer.Screen name="StudySchedule" component={StudySchedule} />
      <Drawer.Screen name="Settings" component={Settings} />
      <Drawer.Screen name="Trash" component={Trash} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700' },
  userName: { fontSize: 18, fontWeight: '700' },
  userEmail: { fontSize: 13, marginTop: 2 },
  guestBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginBottom: 24 },
  guestBannerText: { color: '#ffffff', fontSize: 13, fontWeight: '600', marginLeft: 10 },
  streakCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 24 },
  streakIconBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  streakNumber: { fontSize: 18, fontWeight: '800' },
  streakUnit: { fontSize: 13, fontWeight: '600' },
  streakSubtext: { fontSize: 12, marginTop: 2 },
  navList: { marginTop: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  navItemActive: { borderWidth: 1 },
  navLabel: { fontSize: 15, fontWeight: '600', marginLeft: 14 },
  navLabelActive: {},
  footer: { paddingHorizontal: "6%", paddingBottom: "10%" },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 100, borderWidth: 1 },
  logoutText: { fontSize: 14, fontWeight: '700', marginLeft: 8 }
});
