// „საიდუმლო სახელები“ on paper (2026-11-01, like Codenames): 120 word cards with a word on each side (240 words of the app's
// own bank, `data/saidumloWords.ts` — the „ამიხსენი“ words of one word, every theme in turn), 24 key cards with a key on each
// side (48 keys drawn by the app's own rule, `sidesFor`: the first team 9, the other 8, nobody's 7, the trap 1 — half of them
// blue first), and 28 covers: nine of each team (their mark on them too, so a black-and-white print still tells them apart; the
// team that starts takes nine, the other eight), the passers-by, the trap and the turn card (blue one side, red the other).
// Needs a sand timer (or a phone's).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/saidumloWords';
import * as __d1 from '../../utils/saidumlo';
import * as __d2 from '../../utils/otkheuli';
import * as __d3 from '../../utils/hangi';

const { SAIDUMLO_POOL, sidesFor, GRID, mulberry32, shuffle, hash32 } = ({ ...__d0, ...__d1, ...__d2, ...__d3 });

export const id = 'saidumlo-sakhelebi';
export const title = 'საიდუმლო სახელები';
const TAG = 'ქართული · უტელეფონო';
const META = '2–20 მოთამაშე · 10 წლიდან · 15–20 წუთი';

// the teams as in the app (pages/games/saidumlo/parts.tsx), each with a mark for a print without colour
const LOOK = {
  blue: { bg: '#2b5f8a', fg: '#fff', name: 'ლურჯები', one: 'ლურჯი', mark: 'waves' },
  red: { bg: '#b23a48', fg: '#fff', name: 'წითლები', one: 'წითელი', mark: 'flame' },
  none: { bg: '#e6dccb', fg: '#6f6253', name: 'მგზავრი', one: 'არავისი', mark: 'footprints' },
  trap: { bg: '#2a211b', fg: '#f0d9a0', name: 'ხაფანგი', one: 'ხაფანგი', mark: 'zap' },
};

// ---------- the words: every theme in turn, short words first within a theme's own shuffled order ----------
const CARD_SHEETS = 5, CW = 48, CH = 42, CCOLS = 4, CROWS = 6, PER_SHEET = CCOLS * CROWS;
const CARDS = CARD_SHEETS * PER_SHEET;
const WORDS = (() => {
  const themes = new Map();
  for (const x of SAIDUMLO_POOL) {
    if (x.w.length > 10) continue;
    if (!themes.has(x.theme)) themes.set(x.theme, []);
    themes.get(x.theme).push(x.w);
  }
  const rnd = mulberry32(hash32('saidumlo-print'));
  const queues = [...themes.values()].map(ws => shuffle([...new Set(ws)], rnd));
  const out = [];
  const seen = new Set();
  while (out.length < CARDS * 2 && queues.some(q => q.length)) {
    for (const q of queues) {
      const w = q.shift();
      if (w && !seen.has(w) && out.length < CARDS * 2) { seen.add(w); out.push(w); }
    }
  }
  if (out.length < CARDS * 2) throw new Error(`saidumlo-sakhelebi: only ${out.length} words`);
  return shuffle(out, mulberry32(hash32('saidumlo-print-order')));
})();

const wordCard = w => `<div class="sd-card"><div class="sd-frame"></div>
<div class="sd-top"><div class="fit sd-up"><span>${esc(w)}</span></div></div>
<div class="sd-box"><div class="fit sd-w"><span>${esc(w)}</span></div></div></div>`;

const wordSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const front = WORDS.slice(s * PER_SHEET * 2, s * PER_SHEET * 2 + PER_SHEET);
  const back = WORDS.slice(s * PER_SHEET * 2 + PER_SHEET, (s + 1) * PER_SHEET * 2);
  const label = `${title} · სიტყვები ${s + 1}/${CARD_SHEETS}`;
  return {
    key: `words${s + 1}`,
    front: gridSheet(front.map(wordCard), { cols: CCOLS, rows: CROWS, w: CW, h: CH, label, cls: 'gsheet sd-sheet' }),
    back: gridSheet(back.map(wordCard), { cols: CCOLS, rows: CROWS, w: CW, h: CH, back: true, label: `${label} — მეორე მხარე`, cls: 'gsheet sd-sheet' }),
  };
});

// ---------- the keys: 48, the app's rule, half blue first ----------
const KEY_SHEETS = 2, KW = 62, KH = 64, KCOLS = 3, KROWS = 4, KEYS_A_SHEET = KCOLS * KROWS;
const KEYS = (() => {
  const want = KEY_SHEETS * KEYS_A_SHEET * 2;
  const blue = [], red = [];
  for (let seed = 1; blue.length + red.length < want && seed < 10000; seed++) {
    const k = sidesFor(mulberry32(hash32(`saidumlo-key|${seed}`)));
    if (k.sides.length !== GRID) throw new Error('saidumlo-sakhelebi: a key of the wrong size');
    (k.first === 'blue' ? blue : red).length < want / 2 && (k.first === 'blue' ? blue : red).push(k);
  }
  return Array.from({ length: want }, (_, i) => (i % 2 ? red : blue)[Math.floor(i / 2)]).map((k, i) => ({ ...k, no: i + 1 }));
})();
const keyCells = k => k.sides.map(s => `<i class="sd-c" style="background:${LOOK[s].bg}">${s === 'none' ? '' : icon(LOOK[s].mark, { size: s === 'trap' ? 5.4 : 4.6, color: LOOK[s].fg, width: 2.2 })}</i>`).join('');
const keyCard = k => `<div class="sd-key" style="--team:${LOOK[k.first].bg}">
<div class="sd-kHead"><span class="sd-up2">▲</span><b>№${k.no}</b><span class="sd-kFirst">${icon(LOOK[k.first].mark, { size: 3.6, color: LOOK[k.first].bg, width: 2.4 })}იწყებენ ${LOOK[k.first].name}</span></div>
<div class="sd-kGrid">${keyCells(k)}</div></div>`;
const keySheets = Array.from({ length: KEY_SHEETS }, (_, s) => {
  const front = KEYS.slice(s * KEYS_A_SHEET * 2, s * KEYS_A_SHEET * 2 + KEYS_A_SHEET);
  const back = KEYS.slice(s * KEYS_A_SHEET * 2 + KEYS_A_SHEET, (s + 1) * KEYS_A_SHEET * 2);
  const span = list => `№${list[0].no}–${list[list.length - 1].no}`;
  return {
    key: `keys${s + 1}`,
    front: gridSheet(front.map(keyCard), { cols: KCOLS, rows: KROWS, w: KW, h: KH, label: `${title} · გასაღებები ${span(front)}`, cls: 'gsheet sd-sheet' }),
    back: gridSheet(back.map(keyCard), { cols: KCOLS, rows: KROWS, w: KW, h: KH, back: true, label: `${title} · გასაღებები ${span(back)} — მეორე მხარე`, cls: 'gsheet sd-sheet' }),
  };
});

// ---------- the covers: 9 + 9 of the teams, 8 passers-by (one spare), the trap and the turn card ----------
const VW = 45, VH = 36, VCOLS = 4, VROWS = 7;
const cover = (side, note = '') => `<div class="sd-cover" style="background:${LOOK[side].bg};color:${LOOK[side].fg}">
<div class="sd-vFrame" style="border-color:${side === 'none' ? '#cdbfa8' : 'rgba(255,255,255,.45)'}"></div>
${icon(LOOK[side].mark, { size: side === 'trap' ? 13 : 12, color: LOOK[side].fg, width: 1.8 })}<b>${LOOK[side].name}</b>${note ? `<small>${esc(note)}</small>` : ''}</div>`;
/** the turn card: whose turn it is, turned over when the turn passes */
const turnCard = side => `<div class="sd-cover sd-turn" style="background:${LOOK[side].bg};color:${LOOK[side].fg}">
<div class="sd-vFrame" style="border-color:rgba(255,255,255,.6);border-style:dashed"></div>
${icon(LOOK[side].mark, { size: 8, color: LOOK[side].fg, width: 2 })}<b>${side === 'blue' ? 'ლურჯების' : 'წითლების'} ჯერია</b><small>სვლის ბოლოს გადააბრუნე</small></div>`;
const COVERS = [...Array(9).fill('blue'), ...Array(9).fill('red'), 'turn', ...Array(8).fill('none'), 'trap'];
if (COVERS.length !== VCOLS * VROWS) throw new Error('saidumlo-sakhelebi: covers do not fill the sheet');
const coverSheet = {
  key: 'covers',
  front: gridSheet(COVERS.map(c => (c === 'turn' ? turnCard('blue') : cover(c))), { cols: VCOLS, rows: VROWS, w: VW, h: VH, label: `${title} · საფარები და ჯერის ბარათი`, cls: 'gsheet sd-sheet' }),
  back: gridSheet(COVERS.map(c => (c === 'turn' ? turnCard('red') : cover(c))), { cols: VCOLS, rows: VROWS, w: VW, h: VH, back: true, label: `${title} · საფარები — მეორე მხარე`, cls: 'gsheet sd-sheet' }),
};

// ---------- the cover and the rules ----------
// the example: the first key, its words a game under way (blue found three, red two, a passer-by met)
const EX = KEYS[0];
const exWords = WORDS.slice(0, GRID);
const pick = (side, n) => EX.sides.map((s, i) => [s, i]).filter(([s]) => s === side).slice(0, n).map(([, i]) => i);
const OPEN = new Set([...pick('blue', 3), ...pick('red', 2), ...pick('none', 1)]);
const exBoard = `<div class="sd-exBoard">${exWords.map((w, i) => (OPEN.has(i)
  ? `<div class="sd-chip on" style="background:${LOOK[EX.sides[i]].bg};color:${LOOK[EX.sides[i]].fg}">${icon(LOOK[EX.sides[i]].mark, { size: 4.2, color: LOOK[EX.sides[i]].fg, width: 2 })}</div>`
  : `<div class="sd-chip"><div class="fit"><span>${esc(w)}</span></div></div>`)).join('')}</div>`;

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">მაგიდაზე 25 სიტყვაა. კაპიტნებმა იციან, რომელი ვისია — გუნდებმა არა. კაპიტანი ამბობს ერთ სიტყვას და რიცხვს: „მდინარე 2“ — და გუნდი ცდილობს, ბადეში თავისი ორი სიტყვა იპოვოს. ოღონდ ერთი სიტყვა ხაფანგია! ${WORDS.length} ქართული სიტყვა: კერძები, ცეკვები, ციხეები, ბუნება, გმირები, საკრავები, გალობა და ეკლესია, კინო, სპორტი.<br><b>${META}</b></div>
  <div class="sd-ex box">
    <div>${exBoard}<div class="sd-cap">ბადე თამაშის შუაში: ლურჯებმა სამი იპოვეს, წითლებმა ორი, ერთხელ მგზავრს შეეხნენ</div></div>
    <div><div class="sd-exKey">${keyCard(EX)}</div><div class="sd-cap">კაპიტნების გასაღები: ჩარჩოს ფერი — ვინ იწყებს</div></div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სიტყვის ბარათი — ორივე მხარეს სიტყვა</td><td>${CARDS}</td><td>${no('words1')}–${no(`words${CARD_SHEETS}`)}</td></tr>
        <tr><td>გასაღები — ორივე მხარეს სხვადასხვა</td><td>${KEYS.length / 2}</td><td>${no('keys1')}–${no(`keys${KEY_SHEETS}`)}</td></tr>
        <tr><td>საფარი: 9 ლურჯი, 9 წითელი, 8 მგზავრი (ერთი სათადარიგო), 1 ხაფანგი</td><td>${COVERS.length - 1}</td><td>${no('covers')}</td></tr>
        <tr><td>ჯერის ბარათი — ერთ მხარეს ლურჯი, მეორეზე წითელი</td><td>1</td><td>${no('covers')}</td></tr>
        <tr><td>ქვიშის საათი (ან ტელეფონის წამზომი)</td><td>1</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; სიტყვის ბარათი ${CW}×${CH} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები, გასაღებები და საფარები — 250–300 გ მუყაოზე, ჭრა მონიშნული ხაზებით. ფერადი პრინტერი არ არის? ყველა ფერს თავისი ნიშანიც აქვს: ${icon('waves', { size: 3.4, color: C.brown, width: 2.2 })} ლურჯი, ${icon('flame', { size: 3.4, color: C.brown, width: 2.2 })} წითელი, ${icon('footprints', { size: 3.4, color: C.brown, width: 2.2 })} მგზავრი, ${icon('zap', { size: 3.4, color: C.brown, width: 2.2 })} ხაფანგი.</li>
        <li>გასაღებს ორივე მხარეს სხვადასხვა ბადე აქვს (${KEYS.length} გასაღები), სიტყვის ბარათს — სხვადასხვა სიტყვა: გადააბრუნეთ და ახალი თამაშია.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Codenames“-ის იდეით; სიტყვები აპის „ამიხსენის“ ბანკიდანაა — Claude-მა შეარჩია, მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', 'ორი გუნდი — ლურჯები და წითლები, თითოში ერთი კაპიტანი. კაპიტნები მაგიდის ერთ მხარეს სხედან, გუნდები — მათ პირისპირ.'],
  ['ბადე', '25 სიტყვის ბარათი დაალაგეთ 5×5. კაპიტნები შემთხვევით იღებენ ერთ გასაღებს და ისე დგამენ, რომ მხოლოდ მათ ხედავდნენ: ▲ — ბადის ის მწკრივი, რომელიც მათგან ყველაზე შორსაა.'],
  ['ვინ იწყებს', 'გასაღების ჩარჩოს ფერი. ამ გუნდს 9 სიტყვა აქვს და 9 საფარს იღებს, მეორეს — 8 (მეცხრე საფარი გვერდზე დადეთ). 7 მგზავრია, 1 — ხაფანგი. ჯერის ბარათი დადეთ იმ ფერით, ვინც იწყებს.'],
  ['მინიშნება', 'კაპიტანი ამბობს ერთ სიტყვას და ერთ რიცხვს: „მდინარე 2“ — რამდენი თავისი სიტყვა ერგება. ბადის სიტყვა ან მისი ნაწილი, ჟესტი, ხმის ტონი — არ შეიძლება.'],
  ['ცდა', 'გუნდი ბჭობს და ერთ ბარათს ეხება. კაპიტანი ფარავს გასაღების ფერის საფარით. თავისია — გუნდს შეუძლია განაგრძოს (რიცხვზე ერთით მეტჯერ) ან შეჩერდეს.'],
  ['შეცდომა', 'მგზავრი ან მეტოქის სიტყვა — სვლა მეტოქეზე გადადის (მეტოქის სიტყვა მას ეთვლება) და ჯერის ბარათი ბრუნდება. ხაფანგი — ეს გუნდი მაშინვე აგებს.'],
  ['მოგება', 'იგებს, ვინც პირველი დაფარავს ყველა თავის სიტყვას — მეტოქის შეცდომითაც. შემდეგ თამაშში ბარათები გადააბრუნეთ: მეორე მხარეს სხვა სიტყვაა.'],
  ['დრო', 'ფიქრი უდროოა, მაგრამ თუ კაპიტანი ან გუნდი დიდხანს ჩერდება, მეტოქეს შეუძლია ქვიშის საათი გადმოაბრუნოს: დრო რომ გავა, სვლა გადადის.'],
];
const RULES_TWO = [
  ['ორი-სამი მოთამაშე', 'ერთი კაპიტანი და ერთი ან ორი გამომცნობი — ერთი გუნდი მეორე „უხილავი“ გუნდის წინააღმდეგ. ყოველი სვლის ბოლოს კაპიტანი უხილავი გუნდის ერთ სიტყვას თვითონ ფარავს. მოიგებთ, თუ თქვენს ყველა სიტყვას მის სიტყვებზე ადრე დაფარავთ.'],
];
const rulesList = list => `<ol>${list.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const CLUES = [
  ['სუფრა 2', 'ბადეში „თამადა“ და „ყველი“ — ერთი სიტყვით ორივე'],
  ['ზღაპარი 2', '„დევი“ და „ქაჯი“: ორივე ზღაპრიდანაა'],
  ['ვაზი 2', '„მარანი“ და „რთველი“ — მაგრამ „ქვევრიც“ ერგება: თუ ის მეტოქისაა, გუნდი შეიძლება შეცდეს'],
];
const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">მაგიდაზე 25 სიტყვაა. რომელი სიტყვა ვისია, მხოლოდ კაპიტნებმა იციან — გასაღებიდან. კაპიტნის საქმეა, ერთი სიტყვით თავისი გუნდის რამდენიმე სიტყვაზე ანიშნოს, თან ისე, რომ გუნდი მეტოქის სიტყვას ან ხაფანგს არ შეეხოს.</p>
  <div class="sd-part"><h3>${icon('users-round', { size: 5.4, color: C.wine, width: 1.8 })}ორი გუნდი</h3><div class="rules">${rulesList(RULES)}</div></div>
  <div class="sd-part"><h3>${icon('user-round', { size: 5.4, color: C.wine, width: 1.8 })}ცოტანი ხართ?</h3><div class="rules one">${rulesList(RULES_TWO)}</div></div>
  <div class="sd-clues box"><h3>${icon('lightbulb', { size: 4.6, color: C.wine, width: 1.9 })}როგორ ანიშნოს კაპიტანმა</h3>
    <div class="sd-cGrid">${CLUES.map(([c, t]) => `<div><b>„${esc(c)}“</b><span>${esc(t)}</span></div>`).join('')}</div>
    <p>კარგი მინიშნება რამდენიმე სიტყვას ერთად აერთებს — მაგრამ ფრთხილად: რაც მეტი, მით მეტი რისკი, რომ გუნდი ხაფანგს შეეხოს.</p>
  </div>
  <div class="sd-more box"><b>აპშიც</b> იგივე თამაშია: ყოველდღე ერთი ბადე მთელი სკოლისთვის, მინიშნებებს აპი იძლევა; კლასში ბადე ერთ ტელეფონზეა, კაპიტნები გასაღებს თავიანთ ტელეფონზე ოთხციფრიანი კოდით ხედავენ — sagandzureli.ge → თამაშები → საიდუმლო სახელები</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.sd-card{position:absolute;inset:0;overflow:hidden;background:var(--paper);display:flex;flex-direction:column;justify-content:space-between;padding:2.6mm 3mm 3mm}
.sd-frame{position:absolute;inset:1.4mm;border:.35mm solid var(--gold);border-radius:2mm;pointer-events:none}
.sd-top{flex:none;height:13.5mm;border-radius:1.4mm;background:var(--parch);display:flex;align-items:center;justify-content:center;padding:0 3mm}
.sd-up{transform:rotate(180deg);font-size:10.5pt;font-weight:700;color:#8a6f55;text-align:center;width:100%}
.sd-box{flex:none;height:17mm;border-radius:1.6mm;background:#fff;border:.3mm solid var(--line);display:flex;align-items:center;justify-content:center;padding:0 2.2mm}
.sd-w{font-size:15.5pt;font-weight:800;color:var(--brown);text-align:center;width:100%}
.sd-key{position:absolute;inset:0;background:#fff;border:2.4mm solid var(--team);border-radius:2.2mm;display:flex;flex-direction:column;padding:1.4mm 2.4mm 2.2mm}
.sd-kHead{flex:none;display:flex;align-items:center;gap:1.6mm;height:6.4mm;font-size:8.2pt;color:var(--brown)}
.sd-up2{color:var(--team);font-size:9pt}
.sd-kHead b{font-size:8.4pt}
.sd-kFirst{margin-left:auto;display:inline-flex;align-items:center;gap:1mm;font-weight:700;color:var(--team)}
.sd-kGrid{flex:1;display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(5,1fr);gap:.9mm}
.sd-c{display:flex;align-items:center;justify-content:center;border-radius:1mm}
.sd-cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;overflow:hidden}
.sd-cover b{font-size:10pt;letter-spacing:.02em}
.sd-cover small{font-size:6.6pt;opacity:.9}
.sd-turn b{font-size:10.5pt}
.sd-vFrame{position:absolute;inset:1.6mm;border:.3mm solid;border-radius:1.8mm}
.sd-ex{display:grid;grid-template-columns:1fr ${KW}mm;gap:6mm;align-items:start;margin:0 0 5mm;padding:4mm 5mm}
.sd-exBoard{display:grid;grid-template-columns:repeat(5,1fr);gap:1.1mm}
.sd-chip{height:11.5mm;border-radius:1.2mm;background:#fff;border:.3mm solid var(--line);display:flex;align-items:center;justify-content:center;padding:0 1.2mm;font-size:8.6pt;font-weight:700;color:var(--brown)}
.sd-chip .fit{width:100%;text-align:center}
.sd-chip.on{border:0}
.sd-exKey{position:relative;width:${KW}mm;height:${KH}mm}
.sd-cap{margin-top:1.8mm;font-size:8.6pt;line-height:1.3;color:var(--muted)}
.sd-part{margin:0 0 2.4mm}
.sd-part h3{display:flex;align-items:center;gap:2mm;margin:0 0 1mm;color:var(--wine);font-size:11.5pt}
.sd-part .rules ol{margin:0;padding-left:5mm;font-size:9.9pt;line-height:1.36}
.sd-part .rules li{margin-bottom:1.2mm;break-inside:avoid}
.sd-part .rules.one{columns:1}
.sd-clues{margin-top:2mm;padding:3mm 5mm}
.sd-clues h3{display:flex;align-items:center;gap:1.6mm;margin:0 0 2mm;font-size:10.5pt;color:var(--wine)}
.sd-cGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;font-size:9.2pt;line-height:1.3}
.sd-cGrid b{display:block;color:var(--wine);font-size:10.5pt;margin-bottom:.6mm}
.sd-clues p{margin:2mm 0 0;font-size:9.2pt;line-height:1.3}
.sd-more{margin-top:3mm;font-size:9.6pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...wordSheets,
  ...keySheets,
  coverSheet,
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
