import React, { useState, useRef, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addCardToDeck } from '../data/flashcardsData';
import { useTheme } from '../context/ThemeContext';
import { createId } from '../utils/createId';

export default function AddCardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();

  // Safely get deckId from params
  const deckId = route.params?.deckId;

  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");

  // Ref for the front input to auto-focus when adding multiple cards
  const frontInputRef = useRef(null);

  const handleSaveCard = useCallback(async () => {
    if (!deckId) {
      Alert.alert("Error", "No deck selected. Please try again.");
      navigation.goBack();
      return;
    }

    if (!frontText.trim() || !backText.trim()) {
      Alert.alert("Missing Fields", "Please fill out both the front and back of the card.");
      return;
    }

    const newCard = {
      id: createId(),
      front: frontText.trim(),
      back: backText.trim(),
      interval: 0,
      repetition: 0,
      efactor: 2.5,
      nextReviewDate: new Date().toISOString()
    };

    try {
      await addCardToDeck(deckId, newCard);
      Alert.alert("Success", "Card added successfully!", [
        {
          text: "Add Another",
          onPress: () => {
            setFrontText("");
            setBackText("");
            setTimeout(() => {
              frontInputRef.current?.focus();
            }, 100);
          }
        },
        { text: "Done", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("Error saving local card:", error);
      Alert.alert("Error", "Failed to save the card.");
    }
  }, [deckId, frontText, backText, navigation]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      <View style={{ flex: 1, paddingHorizontal: "6%", paddingTop: "16%", paddingBottom: "10%" }}>

        {/* Header Row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconButton, { borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ width: 46 }} />
        </View>

        <Text style={[styles.headerTitle, { color: colors.text }]}>Add Flashcard</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>Type the question and answer for your new card.</Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ flex: 1 }}
        >

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Front (Question)</Text>
            <TextInput
              ref={frontInputRef}
              style={[styles.textInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., What is the powerhouse of the cell?"
              placeholderTextColor={colors.subtext}
              value={frontText}
              onChangeText={setFrontText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Back (Answer)</Text>
            <TextInput
              style={[styles.textInput, styles.backInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., The Mitochondria"
              placeholderTextColor={colors.subtext}
              value={backText}
              onChangeText={setBackText}
              multiline
              textAlignVertical="top"
            />
          </View>

        </ScrollView>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.button }]} onPress={handleSaveCard}>
          <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>Save Card</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 28, fontWeight: "700", marginTop: 24, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, marginTop: 6, marginBottom: 24 },
  inputContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  textInput: { borderWidth: 1, borderRadius: 16, padding: 16, fontSize: 16, minHeight: 120 },
  backInput: { minHeight: 160 },
  saveButton: { paddingVertical: 16, borderRadius: 100, alignItems: 'center', marginTop: 'auto' },
  saveButtonText: { fontSize: 16, fontWeight: '700' }
});
