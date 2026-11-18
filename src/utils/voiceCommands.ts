// „ხმით მართვა“ in the AI lesson (board x-ai-brdzaneba): five spoken commands and a loose match of what the phone's
// speech recognition heard — the usual forms of each, and a small slip in a long word. Only short phrases count (a whole
// sentence is talk, not a command). Tested in tests/voiceCommands.test.ts.

export type VoiceCommandId = 'again' | 'slow' | 'next' | 'listen' | 'stop';

export const VOICE_COMMANDS: { id: VoiceCommandId; say: string; forms: string[] }[] = [
  { id: 'again', say: 'კიდევ ერთხელ', forms: ['კიდევ ერთხელ', 'კიდე ერთხელ', 'ერთხელ კიდევ', 'კიდევ ერთი', 'კიდევ', 'თავიდან', 'ხელახლა', 'კიდევ ვცდი'] },
  { id: 'slow', say: 'ნელა', forms: ['ნელა', 'უფრო ნელა', 'ნელად', 'ნელნელა', 'ნელი'] },
  { id: 'next', say: 'შემდეგი', forms: ['შემდეგი', 'შემდეგ', 'შემდეგზე', 'გავაგრძელოთ', 'გააგრძელე', 'წინ'] },
  { id: 'listen', say: 'მომასმენინე', forms: ['მომასმენინე', 'მასმენინე', 'მოსმენა', 'მოვუსმენ', 'მოვისმენ', 'დამიკარი', 'დაუკარი'] },
  { id: 'stop', say: 'შეჩერდი', forms: ['შეჩერდი', 'გაჩერდი', 'შეჩერება', 'გაჩერება', 'გაჩერდით', 'შეჩერდით', 'სტოპ', 'კმარა', 'დაიცადე'] },
];

/** more words than this is talk, not a command */
const MAX_WORDS = 6;

/** lower case, letters and single spaces only (a hyphen joins: „ნელ-ნელა“ → „ნელნელა“) */
export const normalSpeech = (text: string) =>
  text.toLowerCase().replace(/-/g, '').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** letters to change, add or drop to turn a into b */
export const editDistance = (a: string, b: string): number => {
  const A = Array.from(a), B = Array.from(b);
  let prev = Array.from({ length: B.length + 1 }, (_, j) => j);
  for (let i = 1; i <= A.length; i++) {
    const cur = [i];
    for (let j = 1; j <= B.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[B.length];
};

/** slips a form may have: none in a short word (4 letters or fewer), one from five, two from nine */
const slipsFor = (form: string) => {
  const n = Array.from(form.replace(/ /g, '')).length;
  return n >= 9 ? 2 : n >= 5 ? 1 : 0;
};

/**
 * The command in what was heard, or null. Each form is tried on every run of as many words; the longest form that fits
 * wins (so „კიდევ ერთხელ, ნელა“ is „კიდევ ერთხელ“), an earlier one on a tie.
 */
export const matchCommand = (heard: string): VoiceCommandId | null => {
  const words = normalSpeech(heard).split(' ').filter(Boolean);
  if (!words.length || words.length > MAX_WORDS) return null;
  let best: { id: VoiceCommandId; score: number; at: number } | null = null;
  for (const c of VOICE_COMMANDS) {
    for (const form of c.forms) {
      const n = form.split(' ').length;
      for (let at = 0; at + n <= words.length; at++) {
        const d = editDistance(words.slice(at, at + n).join(' '), form);
        if (d > slipsFor(form)) continue;
        const score = Array.from(form).length - d * 2;
        if (!best || score > best.score || (score === best.score && at < best.at)) best = { id: c.id, score, at };
      }
    }
  }
  return best?.id ?? null;
};

export const commandSay = (id: VoiceCommandId) => VOICE_COMMANDS.find(c => c.id === id)?.say ?? '';
