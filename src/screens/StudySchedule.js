import { useState, useEffect } from "react";
import { Text, View, TouchableOpacity, Switch, Alert, TextInput } from "react-native";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from '../context/ThemeContext';

const REMINDER_IDENTIFIER = "daily-study-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function StudySchedule() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [hour, setHour] = useState("07");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("PM");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing = scheduled.find((n) => n.identifier === REMINDER_IDENTIFIER);
      if (existing && existing.trigger) {
        setEnabled(true);
        if (typeof existing.trigger.hour === "number") {
          const h24 = existing.trigger.hour;
          const isPM = h24 >= 12;
          const h12 = h24 % 12 || 12;

          setHour(String(h12).padStart(2, "0"));
          setMinute(String(existing.trigger.minute).padStart(2, "0"));
          setPeriod(isPM ? "PM" : "AM");
        }
      }
    })();
  }, []);

  async function requestPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  }

  function parsedTime() {
    let hInput = parseInt(hour, 10) || 12;
    hInput = Math.min(12, Math.max(1, hInput));

    let h24 = hInput;
    if (period === "AM" && hInput === 12) h24 = 0;
    else if (period === "PM" && hInput < 12) h24 += 12;

    const m = Math.min(59, Math.max(0, parseInt(minute, 10) || 0));
    return { h: h24, m, displayH: hInput };
  }

  async function scheduleReminder() {
    const { h, m } = parsedTime();
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: {
        title: "Keep your streak alive",
        body: "Take a few minutes to review your notes today.",
      },
      trigger: {
        type: 'daily',
        hour: h,
        minute: m,
      },
    });
  }

  async function handleToggle(value) {
    setLoading(true);
    try {
      if (value) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            "Notifications disabled",
            "Enable notifications in your device settings to get daily reminders."
          );
          return;
        }
        await scheduleReminder();
        setEnabled(true);
      } else {
        await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
        setEnabled(false);
      }
    } catch (error) {
      console.error('Failed to update study reminder:', error);
      Alert.alert('Reminder error', 'Your reminder could not be updated. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTime() {
    if (!enabled) return;

    // Strict validation for 12-hour format inputs
    const hNum = parseInt(hour, 10);
    const mNum = parseInt(minute, 10);

    if (isNaN(hNum) || hNum < 1 || hNum > 12) {
      Alert.alert("Invalid Time", "Please enter a valid hour between 1 and 12.");
      return;
    }

    if (isNaN(mNum) || mNum < 0 || mNum > 59) {
      Alert.alert("Invalid Time", "Please enter a valid minute between 00 and 59.");
      return;
    }

    setLoading(true);
    try {
      // Auto-format the inputs nicely (e.g. "7" becomes "07") in the UI
      setHour(String(hNum).padStart(2, "0"));
      setMinute(String(mNum).padStart(2, "0"));

      await scheduleReminder();
      Alert.alert("Saved", "Reminder time updated.");
    } catch (error) {
      console.error('Failed to save reminder time:', error);
      Alert.alert('Reminder error', 'Your reminder time could not be saved. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const { m, displayH } = parsedTime();
  const displayTime = `${String(displayH).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;

  return (
    <View style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <View style={{ paddingHorizontal: "6%", paddingTop: "16%" }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: 28,
            fontWeight: "700",
            marginTop: 24,
            letterSpacing: -0.5,
          }}
        >
          Study Schedule
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 6, marginBottom: 24 }}>
          Set a daily reminder to keep your streak alive.
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 16,
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Feather name="bell" size={16} color={colors.text} />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
              Daily Reminder
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 12.5, marginTop: 2 }}>
              {enabled ? `Reminds you at ${displayTime}` : "Currently off"}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#ffffff"
          />
        </View>

        {enabled && (
          <View
            style={{
              padding: 16,
              backgroundColor: colors.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 12 }}>
              Reminder Time
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={hour}
                onChangeText={setHour}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  width: 56,
                  height: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  backgroundColor: colors.bg,
                }}
              />
              <Text style={{ fontSize: 18, fontWeight: "700", marginHorizontal: 10, color: colors.text }}>
                :
              </Text>
              <TextInput
                value={minute}
                onChangeText={setMinute}
                keyboardType="number-pad"
                maxLength={2}
                style={{
                  width: 56,
                  height: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                  backgroundColor: colors.bg,
                }}
              />

              {/* AM/PM Toggle Button */}
              <TouchableOpacity
                onPress={() => setPeriod(period === "AM" ? "PM" : "AM")}
                style={{
                  marginLeft: 16,
                  paddingHorizontal: 16,
                  height: 48,
                  justifyContent: "center",
                  backgroundColor: colors.button,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.buttonText, fontSize: 15, fontWeight: "700" }}>
                  {period}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleSaveTime}
              disabled={loading}
              style={{
                marginTop: 20,
                backgroundColor: colors.button,
                paddingVertical: 12,
                borderRadius: 100,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Text style={{ color: colors.buttonText, fontWeight: "700", textAlign: "center" }}>
                Save Time
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
