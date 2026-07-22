import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { loadDeckCards, saveDeckCards, shuffleCards, getDueCards } from '../data/reviewData';
import { useTheme } from '../context/ThemeContext';

export default function ReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();

  // Safe param access
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

  // --- TIME TRACKING REFS ---
  const startTimeRef = useRef(Date.now());
  const cardsReviewedRef = useRef(0);
  const timeLoggedRef = useRef(false);

  const logAccumulatedTime = async () => {
    // Only log if they haven't already logged this session AND they actually reviewed a card
    if (timeLoggedRef.current || cardsReviewedRef.current === 0) return;
    timeLoggedRef.current = true;

    const timeSpentMs = Date.now() - startTimeRef.current;
    // Calculate minutes (minimum 1 minute if they reviewed at least 1 card)
    const minutesSpent = Math.max(1, Math.round(timeSpentMs / 60000));

    try {
      await saveStudyMinutes(minutesSpent);
      console.log(`Successfully logged ${minutesSpent} minutes locally and synced if needed.`);
    } catch (e) {
      console.error("Error logging time:", e);
    }
  };

  // Ensure time is logged even if the user hits the back button early
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
    // Shuffle all cards and bypass the date filter
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    setDueCards(shuffled);
    setCurrentIndex(0);
    setIsSessionComplete(false);
    setIsCramMode(true);

    // Reset timers for the new cram session
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

      const { interval, repetition, efactor } = calculateSM2(
        quality,
        currentCard.repetition || 0,
        currentCard.efactor || 2.5,
        currentCard.interval || 0
      );

      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      const updatedCard = {
        ...currentCard,
        interval,
        repetition,
        efactor,
        nextReviewDate: nextReviewDate.toISOString()
      };

      const updatedAllCards = allCards.map(c => c.id === currentCard.id ? updatedCard : c);
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isSessionComplete) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: "6%" }]}>
        <Text style={{ fontSize: 50 }}>🎉</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>All caught up!</Text>
        <Text style={[styles.subtext, { color: colors.subtext, textAlign: 'center', marginTop: 12, marginBottom: 30 }]}>
          {isCramMode
            ? `You have finished your cram session for ${deckTitle}.`
            : `You have reviewed all due cards for ${deckTitle}. Check back tomorrow!`
          }
        </Text>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, width: '100%', alignItems: 'center', marginBottom: 12 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.actionBtnText, { color: colors.buttonText }]}>Back to Decks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, width: '100%', alignItems: 'center' }]}
          onPress={handleStudyAll}
        >
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Study All Anyway (Cram)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeCard = dueCards[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={colors.bg === '#FFFFFF' ? "dark" : "light"} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.progressText, { color: colors.subtext }]}>
          {currentIndex + 1} / {dueCards.length}
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
                <Text style={[styles.cardLabel, { color: colors.subtext }]}>Answer</Text>
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
            style={[styles.showAnswerBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAnswer(true)}
          >
            <Text style={[styles.showAnswerBtnText, { color: colors.buttonText }]}>Show Answer</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ratingsContainer}>
            <Text style={[styles.ratingPrompt, { color: colors.subtext }]}>How hard was that?</Text>
            <View style={styles.ratingButtonsRow}>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#ef4444', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(1)}>
                <Text style={styles.ratingBtnText}>Again</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#f59e0b', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(3)}>
                <Text style={styles.ratingBtnText}>Hard</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#3b82f6', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(4)}>
                <Text style={styles.ratingBtnText}>Good</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRating} style={[styles.ratingBtn, { backgroundColor: '#40c463', opacity: isRating ? 0.6 : 1 }]} onPress={() => handleRating(5)}>
                <Text style={styles.ratingBtnText}>Easy</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: "6%", paddingTop: "16%" },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  progressText: { fontSize: 16, fontWeight: '700' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  subtext: { fontSize: 15 },

  cardContainer: { flex: 1, padding: "6%", justifyContent: 'center' },
  flashcard: { padding: 24, borderRadius: 20, borderWidth: 1, minHeight: 300 },
  cardLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  cardText: { fontSize: 22, fontWeight: '500', lineHeight: 32 },
  answerSection: { marginTop: 30 },
  divider: { height: 1, marginBottom: 30 },

  controlsContainer: { paddingHorizontal: "6%", paddingBottom: "10%" },
  showAnswerBtn: { paddingVertical: 18, borderRadius: 100, alignItems: 'center' },
  showAnswerBtnText: { fontSize: 18, fontWeight: '700' },
  actionBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 100 },
  actionBtnText: { fontSize: 16, fontWeight: '700' },

  ratingsContainer: { alignItems: 'center' },
  ratingPrompt: { fontSize: 14, marginBottom: 16, fontWeight: '600' },
  ratingButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  ratingBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  ratingBtnText: { color: "#fff", fontSize: 14, fontWeight: '700' }
});
