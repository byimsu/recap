import { useState } from "react";
import { Text, View, TouchableOpacity, Switch, Alert, ActivityIndicator } from "react-native";
import { ArrowLeft, ChevronRight, Palette, Smartphone, Moon, Sun, Trash2, Download, Upload } from 'lucide-react-native';
import { useNavigation } from "@react-navigation/native";
import { clearAllNotesToTrash } from '../data/notesData';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        paddingHorizontal: 18,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 10,
        opacity: disabled ? 0.6 : 1,
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
  const { theme, isAmoled, toggleTheme, setSystemTheme, userTheme, toggleAmoled, colors } = useTheme();
  const [clearing, setClearing] = useState(false);

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
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg, flex: 1 }}>
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
          Settings
        </Text>
        <Text style={{ color: colors.subtext, fontSize: 13.5, marginTop: 6, marginBottom: 28 }}>
          Manage app preferences and data.
        </Text>
      </View>

      <View style={{ paddingHorizontal: "6%" }}>
        <Text
          style={{
            color: colors.subtext,
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
          }}
        >
          Appearance
        </Text>
        <Row
          colors={colors}
          icon={<Smartphone size={16} color={colors.accent} />}
          label="Use System Theme"
          sublabel="Automatically match device theme"
          right={
            <Switch
              value={userTheme === null}
              onValueChange={setSystemTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#ffffff"
            />
          }
        />

        {userTheme !== null && (
          <Row
            colors={colors}
            icon={theme === 'dark' ? <Moon size={16} color={colors.accent} /> : <Sun size={16} color={colors.accent} />}
            label="Dark Mode"
            sublabel="Switch between light and dark"
            right={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            }
          />
        )}

        {theme === 'dark' && (
          <Row
            colors={colors}
            icon={<Palette size={16} color={colors.accent} />}
            label="AMOLED Mode"
            sublabel="Pure black for OLED screens"
            right={
              <Switch
                value={isAmoled}
                onValueChange={toggleAmoled}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#ffffff"
              />
            }
          />
        )}

        <Text
          style={{
            color: colors.subtext,
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          Storage
        </Text>
        <Row
          colors={colors}
          icon={
            clearing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Trash2 size={16} color={colors.accent} />
            )
          }
          label="Clear Cache"
          sublabel="Moves all uploaded notes to Trash"
          onPress={handleClearCache}
          disabled={clearing}
          right={<ChevronRight size={17} color={colors.subtext} />}
        />

        <Text
          style={{
            color: colors.subtext,
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          Data
        </Text>
        <Row
          colors={colors}
          icon={<Download size={16} color={colors.accent} />}
          label="Export Data"
          sublabel="Back up notes and flashcards"
          onPress={handleExport}
          right={<ChevronRight size={17} color={colors.subtext} />}
        />
        <Row
          colors={colors}
          icon={<Upload size={16} color={colors.accent} />}
          label="Import Data"
          sublabel="Restore from a backup file"
          onPress={handleImport}
          right={<ChevronRight size={17} color={colors.subtext} />}
        />
      </View>
    </SafeAreaView>
  );
}
