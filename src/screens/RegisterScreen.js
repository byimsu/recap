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
import { ArrowLeft, User, Mail, Lock, EyeOff, Eye } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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

        <Text
          style={{
            color: colors.text,
            fontSize: 34,
            fontWeight: "700",
            marginTop: 36,
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

        <View style={{ marginTop: 40 }}>
          <View style={inputStyle}>
            <User size={17} color={colors.subtext} />
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

          <View style={[inputStyle, { marginTop: 12 }]}>
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
  </SafeAreaView>
);
}
