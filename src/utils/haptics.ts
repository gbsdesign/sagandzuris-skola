/**
 * Trigger a short vibration for haptic feedback.
 * Works on most modern Android devices. iOS Safari does not support this API yet.
 * @param duration Duration in milliseconds (default 10ms for a light tap)
 */
export const triggerHaptic = (duration: number = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Ignore vibration errors
    }
  }
};
