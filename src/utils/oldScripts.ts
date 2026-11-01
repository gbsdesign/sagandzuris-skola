// The three Georgian scripts (games hub, 2026-11-01: „ასოების ბადე“, then „ხუცური წარწერა“): today's 33 letters in their
// order with their old names, and a text turned into nuskhuri or asomtavruli. The letters sit in the same order in all three
// Unicode blocks — mkhedruli ა U+10D0, nuskhuri ⴀ U+2D00, asomtavruli Ⴀ U+10A0 — so a letter moves by a fixed step (the
// prayer page's „ხუცური“ does the same, components/views/ReadingTools.tsx). The app draws the old letters in its own alphabet
// through the font „SG Old Script“, first in --font-serif-ge (index.css): show them with `font-serif-ge`.

export type Script = 'mkhedruli' | 'nuskhuri' | 'asomtavruli';
export const SCRIPTS: Script[] = ['mkhedruli', 'nuskhuri', 'asomtavruli'];
export const SCRIPT_LABEL: Record<Script, string> = { mkhedruli: 'მხედრული', nuskhuri: 'ნუსხური', asomtavruli: 'ასომთავრული' };
/** „ნუსხურით“: how a result names the script it was played in */
export const SCRIPT_BY: Record<Script, string> = { mkhedruli: 'მხედრულით', nuskhuri: 'ნუსხურით', asomtavruli: 'ასომთავრულით' };

/** today's alphabet, in its order */
export const ALPHABET = [...'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'];
/** each letter's old name, in the alphabet's order */
export const LETTER_NAMES = [
  'ანი', 'ბანი', 'განი', 'დონი', 'ენი', 'ვინი', 'ზენი', 'თანი', 'ინი', 'კანი', 'ლასი', 'მანი', 'ნარი', 'ონი', 'პარი', 'ჟანი', 'რაე',
  'სანი', 'ტარი', 'უნი', 'ფარი', 'ქანი', 'ღანი', 'ყარი', 'შინი', 'ჩინი', 'ცანი', 'ძილი', 'წილი', 'ჭარი', 'ხანი', 'ჯანი', 'ჰაე',
];

const START: Record<Script, number> = { mkhedruli: 0x10d0, nuskhuri: 0x2d00, asomtavruli: 0x10a0 };

export const isScript = (v: unknown): v is Script => SCRIPTS.includes(v as Script);

/** the text in another script: every Georgian letter moved, the rest kept (ჱ … ჵ too — the old blocks hold them) */
export const toScript = (s: string, script: Script) =>
  script === 'mkhedruli' ? s : s.replace(/[ა-ჵ]/g, c => String.fromCharCode(c.charCodeAt(0) - START.mkhedruli + START[script]));

/** a letter of any of the three scripts back in today's letters */
export const toMkhedruli = (s: string) =>
  s.replace(/[ⴀ-ⴥ]/g, c => String.fromCharCode(c.charCodeAt(0) - START.nuskhuri + START.mkhedruli))
    .replace(/[Ⴀ-Ⴥ]/g, c => String.fromCharCode(c.charCodeAt(0) - START.asomtavruli + START.mkhedruli));
