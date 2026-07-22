import { useState } from "react";
import { Text, View, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { useNavigation } from "@react-navigation/native";
import { clearAllNotesToTrash } from '../data/notesData';
import { useTheme } from '../context/ThemeContext';

function Row({ icon, label, sublabel, right, onPress, disabled, colors }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      disabled={disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: colors.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        opacity: disabled ? 0.6 : 1,
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
        {icon}
      </View>
      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={{ color: colors.subtext, fontSize: 12.5, marginTop: 2 }}>
            {sublabel}
          </Text>
        )}
      </View>
      {right}
    </Wrapper>
  );
}

export default function Settings() {
  const navigation = useNavigation();
  const { theme, isAmoled, toggleTheme, toggleAmoled, colors } = useTheme();
  const [clearing, setClearing] = useState(false);

  /**
   * Moves every active note into Trash instead of deleting files outright.
   */
  async function performClearCache() {
    setClearing(true);
    try {
      const count = await clearAllNotesToTrash();
      Alert.alert(
        "Moved to Trash",
        `${count} file${count === 1 ? '' : 's'} moved to Trash. You can restore them within 30 days.`
      );
    } catch (error) {
      console.error("Error clearing cache:", error);
      Alert.alert("Error", "Could not clear the cache completely.");
    } finally {
      setClearing(false);
    }
  }

  function handleClearCache() {
    Alert.alert(
      "Clear Cache",
      "This moves every uploaded note to Trash, where it stays recoverable for 30 days. Subjects and flashcards are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: performClearCache },
      ]
    );
  }

  function handleExport() {
    Alert.alert("Export", "yet to be implemented");
  }

  function handleImport() {
    Alert.alert("Import", "yet to be implemented");
  }

  return (
    <View style={{ backgroundColor: colors.bg, flex: 1 }}>
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
          Settings
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 14, marginTop: 6, marginBottom: 24 }}>
          Manage app preferences and data.
        </Text>
      </View>

      <View style={{ paddingHorizontal: "6%" }}>
        <Text
          style={{
            color: colors.subtext,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 10,
          }}
        >
          Appearance
        </Text>
        <Row
          colors={colors}
          icon={<Feather name={theme === 'dark' ? "moon" : "sun"} size={16} color={colors.text} />}
          label="Dark Mode"
          sublabel="Switch between light and dark"
          right={
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: "#e2e2e2", true: "#111111" }}
              thumbColor="#ffffff"
            />
          }
        />

        {theme === 'dark' && (
          <Row
            colors={colors}
            icon={<Ionicons name="color-palette" size={16} color={colors.text} />}
            label="AMOLED Mode"
            sublabel="Pure black for OLED screens"
            right={
              <Switch
                value={isAmoled}
                onValueChange={toggleAmoled}
                trackColor={{ false: "#e2e2e2", true: "#111111" }}
                thumbColor="#ffffff"
              />
            }
          />
        )}

        <Text
          style={{
            color: colors.subtext,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          Storage
        </Text>
        <Row
          colors={colors}
          icon={
            clearing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Feather name="trash-2" size={16} color={colors.text} />
            )
          }
          label="Clear Cache"
          sublabel="Moves all uploaded notes to Trash"
          onPress={handleClearCache}
          disabled={clearing}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />

        <Text
          style={{
            color: colors.subtext,
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 12,
            marginBottom: 10,
          }}
        >
          Data
        </Text>
        <Row
          colors={colors}
          icon={<Feather name="download" size={16} color={colors.text} />}
          label="Export Data"
          sublabel="Back up notes and flashcards"
          onPress={handleExport}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />
        <Row
          colors={colors}
          icon={<Feather name="upload" size={16} color={colors.text} />}
          label="Import Data"
          sublabel="Restore from a backup file"
          onPress={handleImport}
          right={<Ionicons name="chevron-forward" size={18} color={colors.subtext} />}
        />
      </View>
    </View>
  );
}
