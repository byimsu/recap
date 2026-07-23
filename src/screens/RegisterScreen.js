import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const { register, getAuthErrorMessage } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in your name, email, and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      navigation.navigate("Login");
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: "7%",
          paddingTop: "18%",
          paddingBottom: "10%",
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text
          style={{
            color: colors.text,
            fontSize: 32,
            fontWeight: "700",
            marginTop: 32,
            letterSpacing: -0.5,
          }}
        >
          Create Account
        </Text>
        <Text
          style={{
            color: colors.subtext,
            fontSize: 15,
            marginTop: 6,
          }}
        >
          Sign up to get started.
        </Text>

        <View style={{ marginTop: 32 }}>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 100,
              paddingHorizontal: 18,
              height: 54,
            }}
          >
            <Feather name="user" size={18} color={colors.text} />
            <TextInput
              value={name}
              placeholder="Name"
              placeholderTextColor={colors.subtext}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
              style={{
                flex: 1,
                fontSize: 15.5,
                color: colors.text,
                marginLeft: 12,
              }}
            />
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 100,
              paddingHorizontal: 18,
              height: 54,
              marginTop: 14,
            }}
          >
            <Feather name="mail" size={18} color={colors.text} />
            <TextInput
              value={email}
              placeholder="Email Address"
              placeholderTextColor={colors.subtext}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={{
                flex: 1,
                fontSize: 15.5,
                color: colors.text,
                marginLeft: 12,
              }}
            />
          </View>

          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 100,
              paddingHorizontal: 18,
              height: 54,
              marginTop: 14,
            }}
          >
            <Feather name="lock" size={18} color={colors.text} />
            <TextInput
              value={password}
              placeholder="Password"
              placeholderTextColor={colors.subtext}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="password"
              style={{
                flex: 1,
                fontSize: 15.5,
                color: colors.text,
                marginLeft: 12,
              }}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text
              style={{
                color: colors.danger,
                fontSize: 13.5,
                marginTop: 14,
              }}
            >
              {error}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            style={{
              marginTop: 22,
              backgroundColor: colors.button,
              height: 54,
              borderRadius: 100,
              justifyContent: "center",
              alignItems: "center",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.buttonText} />
            ) : (
              <Text
                style={{
                  color: colors.buttonText,
                  fontWeight: "700",
                  fontSize: 15.5,
                }}
              >
                Create Account
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={{ marginTop: 28 }}
        >
          <Text
            style={{
              color: colors.subtext,
              textAlign: "center",
              fontSize: 14,
            }}
          >
            Already have an account?{" "}
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Sign In
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
