import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Check, X } from 'lucide-react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { loadDeckCards, saveDeckCards, shuffleCards, getDueCards, rateCard } from '../data/reviewData';
import { saveStudyMinutes } from '../storage/studyStorage';
import { useTheme } from '../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();

  const deckId = route.params?.deckId;
  const deckTitle = route.params?.deckTitle || "Review";

  const [allCards, setAllCards] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [isCramMode, setIsCramMode] = useState(false);

  const startTimeRef = useRef(Date.now());
  const cardsReviewedRef = useRef(0);
  const timeLoggedRef = useRef(false);

  const logAccumulatedTime = async () => {
    if (timeLoggedRef.current || cardsReviewedRef.current === 0) return;
    timeLoggedRef.current = true;

    const timeSpentMs = Date.now() - startTimeRef.current;
    const minutesSpent = Math.max(1, Math.round(timeSpentMs / 60000));

    try {
      await saveStudyMinutes(minutesSpent);
    } catch (e) {
      console.error("Error logging time:", e);
    }
  };

  useEffect(() => {
    return () => {
      logAccumulatedTime();
    };
  }, []);

  const handleStudyAll = () => {
    if (allCards.length === 0) {
      Alert.alert("Empty Deck", "There are no cards in this deck yet!");
      return;
    }
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setDueCards(shuffled);
    setCurrentIndex(0);
    setIsSessionComplete(false);
    setIsCramMode(true);

    startTimeRef.current = Date.now();
    cardsReviewedRef.current = 0;
    timeLoggedRef.current = false;
  };

  useFocusEffect(
    useCallback(() => {
      if (deckId) loadCards();
      else setIsLoading(false);
    }, [deckId])
  );

  const loadCards = async () => {
    try {
      setIsLoading(true);
      setIsCramMode(false);
      const parsedCards = await loadDeckCards(deckId);

      setAllCards(parsedCards);
      const cardsToReview = getDueCards(parsedCards);
      const shuffledDueCards = shuffleCards(cardsToReview);
      setDueCards(shuffledDueCards);

      if (shuffledDueCards.length === 0) {
        setIsSessionComplete(true);
      }
    } catch (error) {
      console.error("Failed to load cards for review", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRating = async (quality) => {
    if (isRating) return;
    const currentCard = dueCards[currentIndex];
    if (!currentCard) return;

    setIsRating(true);

    try {
      if (isCramMode) {
        cardsReviewedRef.current += 1;
        setShowAnswer(false);
        if (currentIndex + 1 < dueCards.length) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setIsSessionComplete(true);
          logAccumulatedTime();
        }
        return;
      }

      const updatedAllCards = rateCard(allCards, currentCard, quality);
      await saveDeckCards(deckId, updatedAllCards);

      cardsReviewedRef.current += 1;
      setAllCards(updatedAllCards);
      setShowAnswer(false);
      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setIsSessionComplete(true);
        logAccumulatedTime();
      }
    } catch (error) {
      console.error('Failed to save card review:', error);
      Alert.alert('Could not save review', 'Please try rating this card again.');
    } finally {
      setIsRating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isSessionComplete) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: "6%" }]}>
        <View style={[styles.completionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.completionIconBadge, { backgroundColor: colors.accentSoft }]}>
            <Check size={28} color={colors.accent} />
          </View>
          <Text style={[styles.completionTitle, { color: colors.text }]}>All caught up!</Text>
          <Text style={[styles.completionSubtext, { color: colors.subtext }]}>
            {isCramMode
              ? `You finished your cram session for ${deckTitle}.`
              : `All due cards reviewed for ${deckTitle}. Check back tomorrow!`
            }
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.completionBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back to decks"
          accessibilityRole="button"
        >
          <Text style={styles.completionBtnText}>Back to Decks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginTop: 10 }]}
          onPress={handleStudyAll}
          accessibilityLabel="Study all cards in cram mode"
          accessibilityRole="button"
        >
          <Text style={[styles.completionBtnText, { color: colors.text }]}>Study All (Cram)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeCard = dueCards[currentIndex];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FAFAFA' ? "dark" : "light"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close"
          accessibilityRole="button"
          style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <X size={20} color={colors.text} accessible={false} />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.accent, width: `${((currentIndex + 1) / dueCards.length) * 100}%` }
            ]}
          />
        </View>

        <Text style={[styles.progressText, { color: colors.subtext }]}>
          {currentIndex + 1}/{dueCards.length}
        </Text>
      </View>

      {/* Flashcard Area */}
      <View style={styles.cardContainer}>
        <View style={[styles.flashcard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Text style={[styles.cardLabel, { color: colors.subtext }]}>Question</Text>
            <Text style={[styles.cardText, { color: colors.text }]}>{activeCard.front}</Text>

            {showAnswer && (
              <View style={styles.answerSection}>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <Text style={[styles.cardLabel, { color: colors.accent }]}>Answer</Text>
                <Text style={[styles.cardText, { color: colors.text }]}>{activeCard.back}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Controls Area */}
      <View style={styles.controlsContainer}>
        {!showAnswer ? (
          <TouchableOpacity
            style={[styles.showAnswerBtn, { backgroundColor: colors.accent }]}
            onPress={() => setShowAnswer(true)}
          >
            <Text style={styles.showAnswerBtnText}>Show Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ratingsContainer}>
            <Text style={[styles.ratingPrompt, { color: colors.subtext }]}>How well did you know this?</Text>
            <View style={styles.ratingButtonsRow}>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#FEE2E2', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(1)}>
                <Text style={[styles.ratingBtnText, { color: '#D92D20' }]}>Again</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#FEF3C7', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(3)}>
                <Text style={[styles.ratingBtnText, { color: '#B45309' }]}>Hard</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#DBEAFE', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(4)}>
                <Text style={[styles.ratingBtnText, { color: '#1D4ED8' }]}>Good</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#DCFCE7', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(5)}>
                <Text style={[styles.ratingBtnText, { color: '#15803D' }]}>Easy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: "6%", paddingTop: 16, paddingBottom: 8 },
  closeBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 13, fontWeight: '600', minWidth: 36, textAlign: 'right' },

  cardContainer: { flex: 1, padding: "6%", justifyContent: 'center' },
  flashcard: { padding: 32, borderRadius: 12, borderWidth: 1, minHeight: 300 },
  cardLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1.2 },
  cardText: { fontSize: 22, fontWeight: '500', lineHeight: 32 },
  answerSection: { marginTop: 30 },
  divider: { height: 1, marginBottom: 28 },

  completionCard: { borderWidth: 1, borderRadius: 12, padding: 36, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 28 },
  completionIconBadge: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  completionTitle: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  completionSubtext: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21 },
  completionBtn: { paddingVertical: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  completionBtnText: { fontSize: 15.5, fontWeight: '700', color: '#FFFFFF' },

  controlsContainer: { paddingHorizontal: "6%", paddingBottom: "10%" },
  showAnswerBtn: { paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  showAnswerBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  ratingsContainer: { alignItems: 'center' },
  ratingPrompt: { fontSize: 13, marginBottom: 16, fontWeight: '600' },
  ratingButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  ratingBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  ratingBtnText: { fontSize: 13.5, fontWeight: '700' }
});
