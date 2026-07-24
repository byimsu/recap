import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Switch, Alert, Platform, Modal } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, Bell, Clock } from 'lucide-react-native';
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getStudyReminder,
  requestStudyReminderPermission,
  scheduleStudyReminder,
  cancelStudyReminder,
} from "../services/studyReminder";

export default function StudySchedule() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getStudyReminder();
        if (existing && existing.trigger) {
          setEnabled(true);
          if (typeof existing.trigger.hour === "number") {
            const d = new Date();
            d.setHours(existing.trigger.hour, existing.trigger.minute || 0, 0, 0);
            setReminderTime(d);
          }
        }
      } catch (error) {
        console.error("Failed to load study reminder:", error);
      }
    })();
  }, []);

  function formatTime(date) {
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? "0" + minutes : minutes;
    const hoursStr = hours < 10 ? "0" + hours : hours;
    return `${hoursStr}:${minutesStr} ${ampm}`;
  }

  async function scheduleReminder(timeToSchedule = reminderTime) {
    const h = timeToSchedule.getHours();
    const m = timeToSchedule.getMinutes();
    await scheduleStudyReminder(h, m);
  }

  async function handleToggle(value) {
    setLoading(true);
    try {
      if (value) {
        const granted = await requestStudyReminderPermission();
        if (!granted) {
          Alert.alert(
            "Notifications disabled",
            "Enable notifications in your device settings to get daily reminders."
          );
          return;
        }
        await scheduleReminder(reminderTime);
        setEnabled(true);
      } else {
        await cancelStudyReminder();
        setEnabled(false);
      }
    } catch (error) {
      console.error("Failed to update study reminder:", error);
      Alert.alert("Reminder error", "Your reminder could not be updated. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTime() {
    if (!enabled) return;
    setLoading(true);
    try {
      await scheduleReminder(reminderTime);
      Alert.alert("Saved", `Reminder set for ${formatTime(reminderTime)} daily.`);
    } catch (error) {
      console.error("Failed to save reminder time:", error);
      Alert.alert("Reminder error", "Your reminder time could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleTimeChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (selectedDate) {
      setReminderTime(selectedDate);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === "#FAFAFA" ? "dark" : "light"} />
      <View style={{ paddingHorizontal: "6%", paddingTop: 16 }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: 30,
            fontWeight: "700",
            marginTop: 28,
            letterSpacing: -0.5,
          }}
        >
          Study Schedule
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 13.5, marginTop: 6, marginBottom: 28 }}>
          Set a daily reminder to keep your streak alive.
        </Text>

        {/* Reminder Toggle Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 18,
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: colors.accentSoft,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Bell size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
              Daily Reminder
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 12.5, marginTop: 2 }}>
              {enabled ? `Reminds you at ${formatTime(reminderTime)}` : "Currently off"}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        {enabled && (
          <View
            style={{
              padding: 18,
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 12 }}>
              Reminder Time
            </Text>

            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 14,
                borderRadius: 10,
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Clock size={18} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
                  {formatTime(reminderTime)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.accentSoft,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>
                  Change
                </Text>
              </View>
            </TouchableOpacity>

            {Platform.OS === "android" && showPicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={handleTimeChange}
              />
            )}

            {Platform.OS === "ios" && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showPicker}
                onRequestClose={() => setShowPicker(false)}
              >
                <View
                  style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(0,0,0,0.4)",
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.card,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      padding: 24,
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        width: "100%",
                        marginBottom: 10,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
                        Select Time
                      </Text>
                      <TouchableOpacity onPress={() => setShowPicker(false)}>
                        <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={reminderTime}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={handleTimeChange}
                      textColor={colors.text}
                      style={{ width: "100%" }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            <TouchableOpacity
              onPress={handleSaveTime}
              disabled={loading}
              style={{
                marginTop: 20,
                backgroundColor: colors.accent,
                paddingVertical: 14,
                borderRadius: 12,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700", textAlign: "center", fontSize: 15 }}>
                Save Reminder
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
