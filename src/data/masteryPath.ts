// „ოსტატობის გზა“ (2026-11-07, plan https://claude.ai/artifact/BNanxAMNuUZMjHNuhx7oo5, section 4–5): six levels from the
// first breath to the master, each with the same four lines — voice, ear, rhythm, chant. An item points at a drill
// (data/vocalDrills.ts `findDrill`: a tip `tip-<num>`, an old group's drill, or a path drill `m-…` of data/masteryDrills.ts)
// and says how it is checked: `app` / `quiz` pass at a score of 80% or more, the others once done (`timer`, `rec`,
// `self`) or marked by a teacher (`teacher`). The plan's numbers („1.5“) stay with the items. Ids only — no imports of the
// drills, so data/vocalDrills.ts may read the levels' titles from here.

export type Line = 'voice' | 'ear' | 'rhythm' | 'chant';
export const LINES: { id: Line; name: string }[] = [
  { id: 'voice', name: 'ხმა' },
  { id: 'ear', name: 'სმენა' },
  { id: 'rhythm', name: 'რიტმი' },
  { id: 'chant', name: 'გალობა' },
];

/** app: the microphone scores it · quiz: answers by ear · timer: a timed exercise · rec: recorded for the teacher ·
 *  self: done elsewhere, ticked by the student · teacher: the teacher marks it */
export type Check = 'app' | 'quiz' | 'timer' | 'rec' | 'self' | 'teacher';

export interface PathItem { no: string; id: string; line: Line; check: Check }

export interface MasteryLevel {
  n: number;
  name: string;
  /** about how long, for the plan's line */
  span: string;
  /** what the student can do at its end, one line */
  goal: string;
  items: PathItem[];
}

const it = (no: string, id: string, line: Line, check: Check): PathItem => ({ no, id, line, check });

export const MASTERY_LEVELS: MasteryLevel[] = [
  {
    n: 0, name: 'საფუძველი', span: '2–4 კვირა',
    goal: 'სწორი დგომა და სუნთქვა, ერთი ნოტის სუფთად დაჭერა, გაგონილის გამეორება.',
    items: [
      it('0.1', 'tip-10', 'voice', 'timer'),
      it('0.2', 'tip-1', 'voice', 'timer'),
      it('0.3', 'm-breath', 'voice', 'app'),
      it('0.4', 'm-trill', 'voice', 'timer'),
      it('0.5', 'm-hum', 'voice', 'timer'),
      it('0.6', 'm-siren', 'voice', 'app'),
      it('0.7', 'm-hold', 'ear', 'app'),
      it('0.8', 'm-echo1', 'ear', 'app'),
      it('0.9', 'm-higher', 'ear', 'quiz'),
      it('0.10', 'rhythm-steady', 'rhythm', 'app'),
      it('0.11', 'm-listen', 'chant', 'timer'),
      it('0.12', 'm-care', 'voice', 'self'),
    ],
  },
  {
    n: 1, name: 'ხმა და სმენა', span: '1–2 თვე',
    goal: 'სწორი, უვიბრატო ხმა; კვარტა, კვინტა და ოქტავა ყურით და ხმით; ზომა 2 და 3.',
    items: [
      it('1.1', 'm-warmup', 'voice', 'timer'),
      it('1.2', 'm-straight', 'voice', 'app'),
      it('1.3', 'm-vowels', 'voice', 'app'),
      it('1.4', 'm-swell', 'voice', 'app'),
      it('1.5', 'm-echo5', 'ear', 'app'),
      it('1.6', 'm-iv-basic-id', 'ear', 'quiz'),
      it('1.7', 'm-iv-basic-sing', 'ear', 'app'),
      it('1.8', 'm-echo3', 'ear', 'app'),
      it('1.9', 'rhythm-meter', 'rhythm', 'app'),
      it('1.10', 'm-rhythm-copy', 'rhythm', 'app'),
      it('1.11', 'tip-11', 'chant', 'timer'),
      it('1.12', 'm-letters', 'chant', 'quiz'),
    ],
  },
  {
    n: 2, name: 'მთქმელი', span: '2–3 თვე',
    goal: 'ყველა ინტერვალი, კარნახი, ტექსტის რიტმი; სამი სადა საგალობლის მთქმელი ზეპირად.',
    items: [
      it('2.1', 'm-iv-all-id', 'ear', 'quiz'),
      it('2.2', 'm-iv-all-sing', 'ear', 'app'),
      it('2.3', 'm-home', 'ear', 'app'),
      it('2.4', 'm-dict1', 'ear', 'app'),
      it('2.5', 'm-rhythm-dict', 'rhythm', 'app'),
      it('2.6', 'm-text-rhythm', 'rhythm', 'rec'),
      it('2.7', 'm-learn-phrase', 'chant', 'self'),
      it('2.8', 'm-learn-top', 'chant', 'self'),
      it('2.9', 'm-meaning', 'chant', 'self'),
      it('2.10', 'tip-5', 'voice', 'rec'),
      it('2.11', 'm-turns', 'voice', 'app'),
      it('2.12', 'm-before-liturgy', 'voice', 'timer'),
    ],
  },
  {
    n: 3, name: 'სამხმიანობა', span: '3–6 თვე',
    goal: 'სასწავლო ხმები, მოძახილი და ბანი, ქართული აკორდები, ნოტების კითხვა, ჯაჭვური სუნთქვა.',
    items: [
      it('3.1', 'm-drone-hold', 'chant', 'app'),
      it('3.2', 'm-study-4', 'chant', 'app'),
      it('3.3', 'm-study-5', 'chant', 'app'),
      it('3.4', 'm-chord-id', 'ear', 'quiz'),
      it('3.5', 'm-chord-sing', 'ear', 'app'),
      it('3.6', 'ear-fifth', 'ear', 'app'),
      it('3.7', 'm-dict2', 'ear', 'app'),
      it('3.8', 'm-read1', 'ear', 'app'),
      it('3.9', 'm-learn-middle', 'chant', 'self'),
      it('3.10', 'm-learn-bass', 'chant', 'self'),
      it('3.11', 'poly-cadence', 'chant', 'app'),
      it('3.12', 'm-chain-breath', 'voice', 'rec'),
      it('3.13', 'm-tempo', 'rhythm', 'app'),
      it('3.14', 'm-timbre', 'voice', 'rec'),
    ],
  },
  {
    n: 4, name: 'რვა ხმა და სკოლები', span: '6–12 თვე',
    goal: 'რვავე ხმის ძლისპირი, სადა და გამშვენებული, გადაჯვარედინება, სამი სკოლა, ფურცლიდან კითხვა.',
    items: [
      it('4.1', 'm-tones', 'chant', 'quiz'),
      it('4.2', 'm-tone-text', 'chant', 'rec'),
      it('4.3', 'm-ornate', 'chant', 'self'),
      it('4.4', 'm-crossing', 'chant', 'rec'),
      it('4.5', 'm-schools', 'ear', 'quiz'),
      it('4.6', 'm-read3', 'ear', 'app'),
      it('4.7', 'm-dynamics', 'voice', 'rec'),
      it('4.8', 'folk-ornament', 'voice', 'app'),
      it('4.9', 'm-free-rhythm', 'rhythm', 'app'),
      it('4.10', 'folk-krimanchuli', 'voice', 'rec'),
    ],
  },
  {
    n: 5, name: 'ოსტატი', span: 'უვადო',
    goal: 'სამივე ხმა ზეპირად, ფურცლიდან სამხმიანად, სუფთა წყობა სმენით, ტრიოს წაყვანა და სწავლება.',
    items: [
      it('5.1', 'm-three-voices', 'chant', 'self'),
      it('5.2', 'm-sight', 'ear', 'self'),
      it('5.3', 'm-pure', 'ear', 'app'),
      it('5.4', 'm-lead-trio', 'chant', 'teacher'),
      it('5.5', 'm-teach', 'chant', 'teacher'),
      it('5.6', 'm-review', 'chant', 'self'),
    ],
  },
];

export const PATH_ITEMS: PathItem[] = MASTERY_LEVELS.flatMap(l => l.items);

/** the level a drill stands in on the path, or null */
export const levelOfDrill = (id: string): number | null => {
  for (const l of MASTERY_LEVELS) if (l.items.some(x => x.id === id)) return l.n;
  return null;
};

/** „გაკვეთილები“: the eleven tips and the seven new lessons, by the level they belong to (the plan's section 4) */
export const LESSON_LIBRARY: { level: number; ids: string[] }[] = [
  { level: 0, ids: ['tip-10', 'tip-1', 'm-care'] },
  { level: 1, ids: ['tip-2', 'tip-3', 'tip-4', 'tip-6', 'tip-7', 'tip-11', 'm-straight', 'm-letters'] },
  { level: 2, ids: ['tip-5', 'tip-9'] },
  { level: 3, ids: ['m-voices', 'm-chord-id'] },
  { level: 4, ids: ['m-tones', 'm-schools', 'tip-8'] },
];

/** the old groups' drills the path does not use — kept under „დამატებითი სავარჯიშოები“ (a teacher may have assigned them) */
export const EXTRA_DRILL_IDS = [
  'ear-unison', 'ear-second', 'ear-recto', 'poly-drone', 'poly-parallel', 'poly-hold', 'folk-bass', 'folk-gamkivani',
  'rhythm-syncope', 'rhythm-five',
];
