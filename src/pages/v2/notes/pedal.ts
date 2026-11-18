// Bluetooth page-turn pedal = a keyboard to the phone. Pure rules, no React.
export type PedalPrefs = { step: 'screen' | 'half'; back: boolean; nextAtEnd: boolean; known: boolean };

export const DEFAULT_PEDAL: PedalPrefs = { step: 'screen', back: false, nextAtEnd: false, known: false };

const KEY = 'sg-pedal';

export const readPedal = (): PedalPrefs => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_PEDAL };
    return {
      step: raw.step === 'half' ? 'half' : 'screen',
      back: raw.back === true,
      nextAtEnd: raw.nextAtEnd === true,
      known: raw.known === true,
    };
  } catch { return { ...DEFAULT_PEDAL }; }
};

export const savePedal = (p: PedalPrefs) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode */ }
};

const DOWN = ['PageDown', 'ArrowDown', 'ArrowRight', ' ', 'Spacebar', 'Enter', 'MediaTrackNext'];
const UP = ['PageUp', 'ArrowUp', 'ArrowLeft', 'MediaTrackPrevious'];

/** What a key press means: 'down', 'up' (only with a second pedal) or null. */
export const pedalKey = (key: string, prefs: PedalPrefs): 'down' | 'up' | null => {
  if (DOWN.includes(key)) return 'down';
  if (prefs.back && UP.includes(key)) return 'up';
  return null;
};

/** How far one press scrolls; a screen keeps two lines of overlap. */
export const pedalStep = (clientHeight: number, prefs: PedalPrefs): number =>
  prefs.step === 'half' ? Math.round(clientHeight / 2) : Math.max(0, clientHeight - 48);

/** Within 4 px of the bottom. */
export const atEnd = (scrollTop: number, clientHeight: number, scrollHeight: number): boolean =>
  scrollTop + clientHeight >= scrollHeight - 4;
