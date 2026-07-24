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
import { ArrowLeft, Mail, Lock, EyeOff, Eye } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      setTimeout(() => {
        const state = navigation.getState();
        if (state?.routeNames?.includes('MainApp')) {
          navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
        }
      }, 50);
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
      setTimeout(() => {
        const state = navigation.getState();
        if (state?.routeNames?.includes('MainApp')) {
          navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
        }
      }, 50);
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

  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 56,
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: "7%",
            paddingTop: 16,
            paddingBottom: "10%",
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
        {mode === "reset" && (
          <TouchableOpacity
            onPress={() => switchMode("signin")}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        )}

        <Text
          style={{
            color: colors.text,
            fontSize: 34,
            fontWeight: "700",
            marginTop: 36,
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

        <View style={{ marginTop: 40 }}>
          <View style={inputStyle}>
            <Mail size={17} color={colors.subtext} />
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
            <View style={[inputStyle, { marginTop: 12 }]}>
              <Lock size={17} color={colors.subtext} />
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
                {showPassword ? (
                  <EyeOff size={17} color={colors.subtext} />
                ) : (
                  <Eye size={17} color={colors.subtext} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {mode === "signin" && (
            <TouchableOpacity
              onPress={() => switchMode("reset")}
              style={{ alignSelf: "flex-end", marginTop: 14 }}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 13.5,
                  fontWeight: "600",
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
              height: 56,
              borderRadius: 12,
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
                marginTop: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                height: 56,
                borderRadius: 12,
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
  </SafeAreaView>
);
}