/**
 * SuperMemo-2 (SM-2) Algorithm Implementation
 *
 * @param {number} quality - How well the user remembered the card (0-5).
 *                           0: Complete blackout.
 *                           3: Correct, but with serious difficulty.
 *                           5: Perfect response.
 * @param {number} repetition - How many times in a row the user got it right.
 * @param {number} efactor - "Easiness Factor" (starts at 2.5).
 * @param {number} interval - Days until the next review.
 * @returns {object} { interval, repetition, efactor }
 */
export function calculateSM2(quality, repetition = 0, efactor = 2.5, interval = 0) {
  // 1. Calculate the new Easiness Factor based on the user's quality rating
  let newEfactor = efactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // The E-Factor should never drop below 1.3
  if (newEfactor < 1.3) {
    newEfactor = 1.3;
  }

  let newInterval = 0;
  let newRepetition = 0;

  // 2. If the user remembered the card (Quality 3, 4, or 5)
  if (quality >= 3) {
    if (repetition === 0) {
      newInterval = 1; // 1 day
    } else if (repetition === 1) {
      newInterval = 6; // 6 days
    } else {
      newInterval = Math.round(interval * newEfactor);
    }
    newRepetition = repetition + 1;
  }
  // 3. If the user completely forgot the card (Quality 0, 1, or 2)
  else {
    newRepetition = 0; // Streak is broken, back to 0
    newInterval = 1;   // Must review again tomorrow (or today)
  }

  return {
    interval: newInterval,
    repetition: newRepetition,
    efactor: newEfactor,
  };
}
