// "აბიტურიენტს" → three-voice dictations, as the university's sample: four bars, the top and middle voice in the
// treble clef, the bass in the bass clef. The first is the university's own sample; the others were written for the
// school in its manner (modal, the cadence on the octave, unison and fifth) — tests/theoryDrills.test.ts checks them.

export interface Dictation { abc: string; meter: string; tempo: number; title: string }

export const VOICES3 = ['ზედა ხმა', 'შუა ხმა', 'ბანი'];

const three = (meter: string, unit: string, key: string, top: string, mid: string, bass: string) =>
  `M:${meter}\nL:${unit}\n%%score [1 2 3]\nK:${key}\nV:1\n${top} |]\nV:2\n${mid} |]\nV:3 clef=bass\n${bass} |]`;

export const SAMPLE_DICTATION = three('C', '1/4', 'C',
  'G2 A2 | G2 F2 | E2 D2 | E4', 'E2 D/E/ F | E F/E/ D2 | C2 B, C/B,/ | A,4', 'G,2 F,2 | G,4 | A,2 G,2 | A,4');

export const DICTATIONS: Dictation[] = [
  { title: 'უნივერსიტეტის ნიმუში', meter: '4/4', tempo: 72, abc: SAMPLE_DICTATION },
  { title: 'რე-ზე', meter: '4/4', tempo: 72, abc: three('C', '1/4', 'C', 'A2 G2 | c2 B2 | A2 G2 | A4', 'F2 G/F/ E | A2 G2 | F2 E E/D/ | D4', 'D,2 E,2 | F,2 E,2 | D,2 C,2 | D,4') },
  { title: 'სოლ-ზე', meter: '3/4', tempo: 80, abc: three('3/4', '1/4', 'C', 'd2 e | d2 c | B2 c | d3', 'B2 c/B/ | A2 A | G2 A | G3', 'G,3 | F,3 | E,2 F, | G,3') },
  { title: 'მი-ზე', meter: '4/4', tempo: 72, abc: three('C', '1/4', 'C', 'B2 A2 | G2 A2 | B2 A2 | B4', 'G2 F/G/ A | E2 F2 | G G/F/ F2 | E4', 'E,2 D,2 | C,2 D,2 | E,2 D,2 | E,4') },
  { title: 'ლა-ზე, ერთი დიეზით', meter: '2/4', tempo: 66, abc: three('2/4', '1/8', 'G', 'e2 f2 | e2 d2 | c2 B2 | e4', 'c2 d2 | BA B2 | A2 G2 | A4', 'A,4 | G,4 | A,2 G,2 | A,4') },
  { title: 'დო-ზე', meter: '4/4', tempo: 72, abc: three('C', '1/4', 'C', 'G2 A2 | G2 F2 | E2 D2 | G4', 'E2 F/E/ D | C2 D2 | C2 B,2 | C4', 'C,2 D,2 | E,2 D,2 | C,2 B,,2 | C,4') },
  { title: 'რე-ზე, ერთი ბემოლით', meter: '3/4', tempo: 80, abc: three('3/4', '1/4', 'F', 'A2 B | c2 c | B2 G | A3', 'F2 G | E2 G | F2 E | D3', 'D,3 | C,3 | B,,2 C, | D,3') },
];
