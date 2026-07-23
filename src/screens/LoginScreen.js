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

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { loginAsGuest, login, sendPasswordReset, getAuthErrorMessage } = useAuth();

  const [mode, setMode] = useState("signin"); // "signin" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      // Loading stays on -- onAuthStateChanged will navigate away
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
      setLoading(false);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setLoading(true);
    try {
      await loginAsGuest();
    } catch (err) {
      console.error("Guest login error:", err);
      setError("Failed to start guest mode.");
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError("Enter your email to reset your password.");
      return;
    }
    setError("");
    setLoading(true);
    setResetSent(false);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError("");
    setResetSent(false);
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
          onPress={() => {
            if (mode === "reset") {
              switchMode("signin");
            } else {
              navigation.goBack();
            }
          }}
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
          {mode === "signin" ? "Sign In" : "Reset Password"}
        </Text>
        <Text
          style={{
            color: colors.subtext,
            fontSize: 15,
            marginTop: 6,
          }}
        >
          {mode === "signin"
            ? "Welcome back. Enter your details to continue."
            : "Enter your email and we'll send you a reset link."}
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

          {mode === "signin" && (
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
          )}

          {mode === "signin" && (
            <TouchableOpacity
              onPress={() => switchMode("reset")}
              style={{ alignSelf: "flex-end", marginTop: 12 }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 13.5,
                  fontWeight: "600",
                  textDecorationLine: "underline",
                }}
              >
                Forgotten Password?
              </Text>
            </TouchableOpacity>
          )}

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

          {mode === "reset" && resetSent && !error && (
            <Text
              style={{
                color: colors.success,
                fontSize: 13.5,
                marginTop: 14,
              }}
            >
              Reset link sent. Check your inbox.
            </Text>
          )}

          <TouchableOpacity
            onPress={mode === "signin" ? handleLogin : handleReset}
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
                {mode === "signin" ? "Sign In" : "Submit"}
              </Text>
            )}
          </TouchableOpacity>

          {mode === "signin" && (
            <TouchableOpacity
              onPress={handleGuestLogin}
              disabled={loading}
              style={{
                marginTop: 14,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                height: 54,
                borderRadius: 100,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "700",
                  fontSize: 15.5,
                }}
              >
                Continue as Guest
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {mode === "signin" && (
          <>
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              style={{ marginTop: 28 }}
            >
              <Text
                style={{
                  color: colors.subtext,
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                Don't have an account?{" "}
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Register
                </Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}