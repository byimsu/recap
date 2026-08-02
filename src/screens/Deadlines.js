import { useState, useCallback, useMemo, memo } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  getAllDeadlines,
  addDeadline,
  deleteDeadline,
  deadlinesOnDate,
  upcomingDeadlines,
  daysUntilLabel,
  DEADLINE_TYPE_META,
  syncDeadlinesFromFirebase,
} from "../data/deadlinesData";
import { getAllSubjects } from "../data/subjectsData";
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function toDateString(year, month, day) {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const CalendarDay = memo(({ day, dateString, bg, isToday, colors, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(dateString);
  }, [dateString, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{ flex: 1, aspectRatio: 1, padding: 3 }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 10,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: bg ? bg : "transparent",
          borderWidth: isToday && !bg ? 1.5 : 0,
          borderColor: colors.text,
        }}
      >
        <Text
          style={{
            color: bg ? "#ffffff" : colors.text,
            fontSize: 14,
            fontWeight: isToday ? "800" : "500",
          }}
        >
          {day}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default function Deadlines() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const today = useMemo(() => new Date(), []);
  const todayString = useMemo(
    () => toDateString(today.getFullYear(), today.getMonth(), today.getDate()),
    [today]
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [deadlines, setDeadlines] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [isDayModalVisible, setIsDayModalVisible] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("");
  const [newSubjectId, setNewSubjectId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const all = await getAllDeadlines();
    setDeadlines(all);
    const loadedSubjects = await getAllSubjects();
    setSubjects(loadedSubjects);

    const merged = await syncDeadlinesFromFirebase();
    if (merged) {
      setDeadlines(merged);
    }
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const openDay = useCallback((dateString) => {
    if (dateString < todayString) {
      Alert.alert("Past Date", "You cannot add a deadline to a day that has already passed.");
      return;
    }
    setSelectedDate(dateString);
    setIsDayModalVisible(true);
  }, [todayString]);

  function openAddModal() {
    setNewTitle("");
    setNewType("");
    setNewSubjectId(null);
    setIsDayModalVisible(false);
    setIsAddModalVisible(true);
  }

  async function handleSaveDeadline() {
    if (!newTitle.trim()) {
      Alert.alert("Missing Title", "Give this deadline a name.");
      return;
    }
    if (!newType.trim()) {
      Alert.alert("Missing Type", "Please specify the type of deadline.");
      return;
    }
    const updated = await addDeadline({
      title: newTitle.trim(),
      date: selectedDate,
      type: newType.trim(),
      subjectId: newSubjectId,
    });
    setDeadlines(updated);
    setIsAddModalVisible(false);
  }

  function handleDeleteDeadline(id) {
    Alert.alert("Delete Deadline", "Remove this from your calendar?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = await deleteDeadline(id);
          setDeadlines(updated);
        },
      },
    ]);
  }

  const weeks = buildMonthGrid(viewYear, viewMonth);
  const upcoming = upcomingDeadlines(deadlines, 5);

  const dayColor = (dateString) => {
    const dayDeadlines = deadlinesOnDate(deadlines, dateString);
    if (dayDeadlines.length === 0) return null;

    // If multiple types land on the same day, show the highest-priority predefined one.
    const priority = ["exam", "test", "assignment"];
    const topType = priority.find((t) => dayDeadlines.some((d) => d.type === t));

    if (topType && DEADLINE_TYPE_META[topType]) {
      return DEADLINE_TYPE_META[topType].color;
    }

    return colors.customFallback;
  };

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg, flex: 1 }}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: "6%",
          paddingTop: 16,
          paddingBottom: "10%",
        }}
      >
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
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: 30,
            fontWeight: "700",
            marginTop: 24,
            letterSpacing: -0.5,
          }}
        >
          Deadlines
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 6, marginBottom: 20 }}>
          Track your upcoming deadlines.
        </Text>

        {/* Month navigation */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => changeMonth(-1)} style={{ padding: 8 }}>
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={{ padding: 8 }}>
            <ChevronRight size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Weekday header */}
        <View style={{ flexDirection: "row" }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: "600" }}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: "row" }}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <View key={dayIndex} style={{ flex: 1, aspectRatio: 1 }} />;
              }
              const dateString = toDateString(viewYear, viewMonth, day);
              const bg = dayColor(dateString);
              const isToday = dateString === todayString;

              return (
                <CalendarDay
                  key={dayIndex}
                  day={day}
                  dayIndex={dayIndex}
                  dateString={dateString}
                  bg={bg}
                  isToday={isToday}
                  colors={colors}
                  onPress={openDay}
                />
              );
            })}
          </View>
        ))}

        {/* Upcoming list */}
        <Text
          style={{
            color: colors.text,
            fontSize: 18,
            fontWeight: "700",
            marginTop: 32,
            marginBottom: 12,
          }}
        >
          Upcoming
        </Text>
        {upcoming.length === 0 ? (
          <Text style={{ color: colors.subtext, fontSize: 14 }}>
            Nothing coming up. Tap a date above to add your first deadline.
          </Text>
        ) : (
          upcoming.map((d) => {
            const meta = DEADLINE_TYPE_META[d.type] || { label: d.type, color: colors.customFallback };
            const subject = subjects.find((s) => s.id === d.subjectId);
            return (
              <TouchableOpacity
                key={d.id}
                onLongPress={() => handleDeleteDeadline(d.id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 18,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: meta.color,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
                    {d.title}
                  </Text>
                  <Text style={{ color: colors.subtext, fontSize: 12.5, marginTop: 2, textTransform: "capitalize" }}>
                    {meta.label}
                    {subject ? ` · ${subject.name}` : ""}
                  </Text>
                </View>
                <Text style={{ color: colors.subtext, fontSize: 12.5, fontWeight: "600", marginRight: 12 }}>
                  {daysUntilLabel(d.date)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteDeadline(d.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ padding: 4 }}
                >
                  <Trash2 size={16} color={colors.danger} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Day detail modal */}
      <Modal visible={isDayModalVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.bg,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              {selectedDate}
            </Text>

            {selectedDate &&
              deadlinesOnDate(deadlines, selectedDate).map((d) => {
                const meta = DEADLINE_TYPE_META[d.type] || { label: d.type, color: colors.customFallback };
                return (
                  <View
                    key={d.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: meta.color,
                        marginRight: 10,
                      }}
                    />
                    <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" }}>
                      {d.title}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteDeadline(d.id)}>
                      <Trash2 size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}

            <TouchableOpacity
              onPress={openAddModal}
              style={{
                marginTop: 20,
                backgroundColor: colors.button,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.buttonText, fontWeight: "700" }}>Add Deadline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsDayModalVisible(false)}
              style={{ marginTop: 12, alignItems: "center" }}
            >
              <Text style={{ color: colors.subtext, fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add deadline modal */}
      <Modal visible={isAddModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 }}
        >
          <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 24 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>
              New Deadline
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 16 }}>
              {selectedDate}
            </Text>

            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="e.g., Chemistry Midterm"
              placeholderTextColor={colors.subtext}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.card,
                marginBottom: 16,
              }}
            />

            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Type
            </Text>

            <TextInput
              value={newType}
              onChangeText={setNewType}
              placeholder="e.g., Project, Quiz, Form..."
              placeholderTextColor={colors.subtext}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                color: colors.text,
                backgroundColor: colors.card,
                marginBottom: 16,
              }}
            />

            {subjects.length > 0 && (
              <>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                  Subject (optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    onPress={() => setNewSubjectId(null)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      marginRight: 8,
                      backgroundColor: newSubjectId === null ? colors.button : colors.card,
                      borderWidth: 1,
                      borderColor: newSubjectId === null ? colors.button : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: newSubjectId === null ? colors.buttonText : colors.text,
                      }}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  {subjects.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setNewSubjectId(s.id)}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                        marginRight: 8,
                        backgroundColor: newSubjectId === s.id ? colors.button : colors.card,
                        borderWidth: 1,
                        borderColor: newSubjectId === s.id ? colors.button : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: newSubjectId === s.id ? colors.buttonText : colors.text,
                        }}
                      >
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                onPress={() => setIsAddModalVisible(false)}
                style={{ paddingVertical: 10, paddingHorizontal: 16 }}
              >
                <Text style={{ color: colors.subtext, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDeadline}
                style={{
                  backgroundColor: colors.button,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: colors.buttonText, fontWeight: "700" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
