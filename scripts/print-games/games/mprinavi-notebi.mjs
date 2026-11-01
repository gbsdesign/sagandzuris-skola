// „მფრინავი ნოტები“ on paper — the სამაგიდო variant of the app's note-naming game (2026-11-01): note cards and name cards.
// A note card's front is one note on the treble or the bass clef (the app's range: up to two ledger lines under the staff or
// over it, utils/mprinavi.ts POS_MIN…POS_MAX); its back is the answer, for the host who holds the card up: the name, the
// letter, the place on the staff, the octave. Stars mark how hard a note is. The host „flies“ a card past the class, every
// team raises the name card it thinks (a set of seven a team, the letters on their backs), the first right team takes the
// note. The kit: a poster of both clefs, the note cards, the name cards, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, gridSheet, coverCss } from '../lib.mjs';
import { posOf, staffSvg } from '../staffSvg.mjs';
import { TEAM_NAMES, partsCss, step } from '../kitParts.mjs';

export const id = 'mprinavi-notebi';
export const title = 'მფრინავი ნოტები';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი ან 2–6 მოთამაშე · 7 წლიდან · 10–20 წუთი';

const NAMES = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
/** the app's name buttons' colours (pages/games/mprinavi/Names.tsx) */
const TINT = ['#b23a48', '#cf7428', '#b08a12', '#4f8a3c', '#24827e', '#2b5f8a', '#5b3f8c'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const CLEF = {
  treble: { name: 'სოლის გასაღები', color: C.wine, from: 57, to: 84, lines: [64, 67, 71, 74, 77], spaces: [65, 69, 72, 76] },
  bass: { name: 'ფას გასაღები', color: '#2b5f8a', from: 36, to: 64, lines: [43, 47, 50, 53, 57], spaces: [45, 48, 52, 55] },
};
const OCTAVE = { 2: 'დიდი ოქტავა', 3: 'მცირე ოქტავა', 4: 'პირველი ოქტავა', 5: 'მეორე ოქტავა', 6: 'მესამე ოქტავა' };
const stepOf = midi => NATURAL.indexOf(((midi % 12) + 12) % 12);

/** a note's place in words: lines and spaces counted from the bottom */
const ORD = ['პირველ', 'მეორე', 'მესამე', 'მეოთხე', 'მეხუთე'];
const placeOf = p => {
  if (p >= 0 && p <= 8) return p % 2 === 0 ? `${ORD[p / 2]} ხაზზე` : `${ORD[(p - 1) / 2]} შუალედში`;
  if (p === -1) return 'პირველი ხაზის ქვეშ';
  if (p === 9) return 'მეხუთე ხაზის ზემოთ';
  const below = p < 0;
  const extra = below ? -p : p - 8;
  if (extra === 2) return `დამატებით ხაზზე, ${below ? 'ქვემოთ' : 'ზემოთ'}`;
  if (extra === 3) return below ? 'დამატებითი ხაზის ქვეშ' : 'დამატებითი ხაზის ზემოთ';
  return `მეორე დამატებით ხაზზე, ${below ? 'ქვემოთ' : 'ზემოთ'}`;
};
/** ★ on the staff or right by it, ★★ by one ledger line, ★★★ by two */
const levelOf = p => (p >= -1 && p <= 9 ? 1 : p >= -3 && p <= 11 ? 2 : 3);

const NOTES = ['treble', 'bass']
  .flatMap(clef => {
    const out = [];
    for (let m = CLEF[clef].from; m <= CLEF[clef].to; m++) if (stepOf(m) >= 0) out.push({ clef, midi: m, pos: posOf(m, clef) });
    return out;
  })
  .map((n, i) => ({ ...n, no: i + 1, step: stepOf(n.midi), level: levelOf(n.pos) }));

// ---------- the note cards ----------
const STAR = 'M12 2.6l2.85 6.05 6.6.82-4.86 4.58 1.26 6.55L12 17.35 6.15 20.6l1.26-6.55L2.55 9.47l6.6-.82z';
const stars = (n, color, size = 3.6) => `<span class="mp-stars">${Array.from({ length: 3 }, (_, i) =>
  `<svg viewBox="0 0 24 24" width="${size}mm" height="${size}mm"><path d="${STAR}" fill="${i < n ? color : '#e6dcc9'}"/></svg>`).join('')}</span>`;
const levelStars = (n, color, size) => `<span class="mp-stars">${Array.from({ length: n }, () =>
  `<svg viewBox="0 0 24 24" width="${size}mm" height="${size}mm"><path d="${STAR}" fill="${color}"/></svg>`).join('')}</span>`;

const band = (c, label) => `<div class="mp-band" style="background:${c.color}"><span>${esc(label)}</span></div>`;
const outBand = (c, label) => `<div class="mp-band out" style="color:${c.color};border-color:${c.color}">${icon('eye-off', { size: 4.2, color: c.color, width: 2 })}<span>${esc(label)}</span></div>`;
const cardFoot = n => `<div class="mp-foot">${stars(n.level, CLEF[n.clef].color)}<span>№ ${n.no}</span></div>`;

const front = n => {
  const c = CLEF[n.clef];
  const st = staffSvg({ clef: n.clef, notes: [{ midi: n.midi }], head: 'whole', width: 52, space: 4, room: 2.7, trail: '#d9c08a' }).svg;
  return `<div class="card mp"><div class="frame" style="border-color:${c.color}"></div>${band(c, c.name)}
<div class="mp-staff">${st}</div>${cardFoot(n)}</div>`;
};
const back = n => {
  const c = CLEF[n.clef];
  const st = staffSvg({ clef: n.clef, notes: [{ midi: n.midi, color: '#2f7d4f' }], head: 'whole', width: 40, space: 2.3, room: 2.6 }).svg;
  return `<div class="card mp"><div class="frame" style="border-color:${c.color}"></div>${outBand(c, 'პასუხი')}
<div class="mp-name" style="color:${TINT[n.step]}">${NAMES[n.step]}<small>${LETTERS[n.step]}</small></div>
<div class="mp-place">${placeOf(n.pos)}</div>
<div class="mp-oct">${OCTAVE[Math.floor(n.midi / 12) - 1]}</div>
<div class="mp-mini">${st}</div>${cardFoot(n)}</div>`;
};

/** a clef's help card: the notes on its lines and in its spaces */
const guideStaff = (clef, midis) => staffSvg({
  clef, width: 52, space: 2.5, room: 2.1, under: 4.6, font: 2.9, head: 'whole', padRight: 2,
  notes: midis.map(m => ({ midi: m, under: NAMES[stepOf(m)], wordColor: TINT[stepOf(m)] })),
}).svg;
const guide = clef => {
  const c = CLEF[clef];
  return `<div class="card mp"><div class="frame" style="border-color:${c.color}"></div>${band(c, c.name)}
<div class="mp-guide">
  <b>ხაზებზე</b><div>${guideStaff(clef, c.lines)}</div>
  <b>შუალედებში</b><div>${guideStaff(clef, c.spaces)}</div>
</div>
<div class="mp-foot"><span>მინიშნება</span><span>${clef === 'treble' ? 'ზურგზე — ფას გასაღები' : 'ზურგზე — სოლის გასაღები'}</span></div></div>`;
};

const SLOTS = [
  ...NOTES.filter(n => n.clef === 'treble').map(n => ({ n, front: front(n), back: back(n) })),
  { front: guide('treble'), back: guide('bass') },
  ...NOTES.filter(n => n.clef === 'bass').map(n => ({ n, front: front(n), back: back(n) })),
  { front: guide('bass'), back: guide('treble') },
];
if (SLOTS.length % 9) throw new Error(`mprinavi: ${SLOTS.length} cards do not fill whole sheets`);
const CARD_SHEETS = SLOTS.length / 9;
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = SLOTS.slice(s * 9, s * 9 + 9);
  const nos = nine.filter(x => x.n).map(x => x.n.no);
  const what = `№ ${nos[0]}–${nos[nos.length - 1]}${nine.some(x => !x.n) ? ', მინიშნება' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(x => x.front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(x => x.back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — პასუხები (ზურგი)` }),
  };
});

// ---------- the name cards: a row a team, the syllable in front, the letter behind ----------
const NC = { cols: 7, rows: 6, w: 27, h: 42 };
const nameFront = (t, s) => `<div class="mp-nc" style="background:${TINT[s]}"><b>${NAMES[s]}</b><span>${esc(TEAM_NAMES[t])}</span></div>`;
const nameBack = (t, s) => `<div class="mp-nc back" style="border-color:${TINT[s]};color:${TINT[s]}"><b>${LETTERS[s]}</b><span>${esc(TEAM_NAMES[t])}</span></div>`;
const teamCells = fn => Array.from({ length: NC.rows }, (_, t) => NAMES.map((_, s) => fn(t, s))).flat();
const namesSheet = {
  key: 'names',
  front: gridSheet(teamCells(nameFront), { ...NC, label: `${title} · სახელების ბარათები — ექვსი გუნდის ნაკრები (თითო რიგი)` }),
  back: gridSheet(teamCells(nameBack), { ...NC, back: true, label: `${title} · სახელების ბარათები — ასოები (ზურგი)` }),
};

// ---------- the poster: every note of a clef's cards, named ----------
const posterPage = clef => {
  const c = CLEF[clef];
  const mine = NOTES.filter(n => n.clef === clef);
  const named = n => ({ midi: n.midi, under: NAMES[n.step], under2: LETTERS[n.step], wordColor: TINT[n.step] });
  const big = notes => staffSvg({ clef, notes, head: 'whole', width: 186, space: 5.8, room: 2.7, under: 13.5, font: 5.6, padRight: 2 }).svg;
  const on = mine.filter(n => n.level === 1);
  const low = mine.filter(n => n.pos < -1), high = mine.filter(n => n.pos > 9);
  return page(`<div class="mp-po">
  <div class="mp-poHead"><span class="aso">${aso(title)}</span><b style="color:${c.color}">${c.name}</b><span class="mp-poSub">ყველა ნოტი, რაც ბარათებზეა</span></div>
  <h3>${levelStars(1, c.color, 5)}<span>ხაზებზე და შუალედებში</span></h3>
  <div class="mp-poStaff">${big(on.map(named))}</div>
  <h3>${levelStars(2, c.color, 5)}${levelStars(3, c.color, 5)}<span>დამატებით ხაზებზე — ქვემოთ და ზემოთ</span></h3>
  <div class="mp-poStaff">${big([...low.map(named), null, ...high.map(named)])}</div>
  <div class="mp-poRows">
    <div class="box"><b>ხაზები, ქვემოდან ზემოთ</b><span>${c.lines.map(m => `<i style="color:${TINT[stepOf(m)]}">${NAMES[stepOf(m)]}</i>`).join(' · ')}</span></div>
    <div class="box"><b>შუალედები, ქვემოდან ზემოთ</b><span>${c.spaces.map(m => `<i style="color:${TINT[stepOf(m)]}">${NAMES[stepOf(m)]}</i>`).join(' · ')}</span></div>
  </div>
  <p class="mp-poTip">ნოტი ერთი ნაბიჯით მაღლა — სახელიც შემდეგია: დო, რე, მი, ფა, სოლ, ლა, სი, და ისევ დო. ხაზიდან ნაბიჯი შუალედშია, შუალედიდან — ხაზზე. ასოები: C D E F G A H (H = სი, B = სი ბემოლი).</p>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · პლაკატი — ${c.name}</div>`, 'mp-poP');
};

// ---------- the cover and the rules ----------
const EX = NOTES.find(n => n.clef === 'treble' && n.midi === 67);
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">წამყვანი ნოტის ბარათს კლასს აჩვენებს და ნელა „აფრენს“ — გუნდები ცდილობენ, სანამ ბარათი გაფრინდება, სწორი სახელი აწიონ: დო, რე, მი… ბარათზე ერთი ნოტია, სოლის ან ფას გასაღებზე; ზურგზე — პასუხი, ისე რომ ბარათის მჭერი წამყვანი მას ხედავს. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="mp-ex box">
    <div class="mp-exCards"><div class="mp-exCard">${front(EX)}</div><div class="mp-exCard">${back(EX)}</div></div>
    <div class="mp-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('layers', 'წამყვანი ირჩევს გასაღებს და დონეს (★ — დამწყებთათვის) და ბარათებს აურევს.')}
      ${step('bird', 'ზედა ბარათს ნოტით კლასისკენ აჩვენებს და ნელა „აფრენს“, მარჯვნიდან მარცხნივ: „სამი, ორი, ერთი!“')}
      ${step('hand', 'ყოველი გუნდი სწევს თავისი სახელის ბარათს — რომელი ნოტია.')}
      ${step('trophy', 'პირველი სწორი გუნდი ბარათს იღებს. ბოლოს — ვისაც მეტი ბარათი აქვს, ის იგებს.', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>პლაკატი: სოლის გასაღები, ზურგზე — ფას გასაღები</td><td>1</td><td>${no('poster')}</td></tr>
        <tr><td>ნოტის ბარათები: ${NOTES.filter(n => n.clef === 'treble').length} სოლის და ${NOTES.filter(n => n.clef === 'bass').length} ფას გასაღებზე</td><td>${NOTES.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>მინიშნების ბარათები (ორივე გასაღები)</td><td>2</td><td>${no(`cards${CARD_SHEETS / 2}`)}, ${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>სახელების ბარათები: 6 გუნდის ნაკრები, 7-7</td><td>42</td><td>${no('names')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) და სახელები (${no('names')}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით. სახელების ფურცლის ყოველი რიგი ერთი გუნდის ნაკრებია.</li>
        <li>პლაკატი (${no('poster')}) — კედელზე ან დაფაზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ნოტების ბარათებისა და თამაშის „Staff Wars“ იდეით. ნოტების ნიშნები — abcjs-ის (MIT). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ბარათები', `${NOTES.length} ნოტის ბარათი: ზედა ხმის ნოტები სოლის გასაღებზე, ბანის — ფას გასაღებზე. ვარსკვლავები სირთულეა: ★ — ხაზზე ან შუალედში, ★★ — ერთი დამატებითი ხაზით, ★★★ — ორით. ზურგზე პასუხია: სახელი, ასო, ადგილი და ოქტავა.`],
  ['დასაწყისი', 'დამწყებებთან — მხოლოდ სოლის გასაღები და ★ (11 ბარათი). მერე ★★, მერე ფას გასაღები, ბოლოს — ყველაფერი ერთად აურიეთ.'],
  ['გუნდები', `2–6 გუნდი, ყოველს — ერთი რიგი სახელების ბარათებისა (დო, რე, მი, ფა, სოლ, ლა, სი; ბარათზე გუნდის სახელიც წერია: ${TEAM_NAMES.join(', ')}). ბარათებს გუნდი მაგიდაზე გაშლის.`],
  ['ფრენა', 'წამყვანი დასტიდან იღებს ზედა ბარათს და ნოტით კლასისკენ იჭერს (პასუხი მისკენაა). ნელა „აფრენს“ — მარჯვნიდან მარცხნივ, თან ითვლის: „სამი, ორი, ერთი!“ ერთზე ბარათი „დაჯდა“.'],
  ['პასუხი', 'გუნდი სწევს იმ სახელის ბარათს, რაც ნოტია. პირველი სწორი გუნდი ნოტის ბარათს იღებს. თუ „ერთამდე“ ვერავინ თქვა სწორად — ბარათი დასტის ბოლოში მიდის.'],
  ['შეცდომა', 'ვინც არასწორი აწია, ამ ბარათზე მეტს ვეღარ ცდის. ორი გუნდი ერთად — წამყვანი წყვეტს, ან ორივე იღებს თითო ქულას.'],
  ['მოგება', 'როცა დასტა დამთავრდა, ბარათები დაითვალეთ: ვისაც მეტი აქვს, ის იგებს.'],
  ['დაარტყი!', '2–6 მოთამაშე მაგიდასთან: ერთი ნაკრები სახელებისა შუაში გაშლილია. ბარათებს რიგრიგობით აბრუნებთ; ვინც პირველი დაადებს ხელს სწორ სახელს, ბარათი მისია. არასწორზე ხელი — ერთი მოგებული ბარათი დასტის ბოლოში.'],
  ['წყვილებში', 'ერთი აჩვენებს, მეორე ასახელებს. სწორი — „ნასწავლის“ დასტაში, არა — დასტის ბოლოში, სანამ ყველა ნასწავლი არ იქნება. მერე როლები გაცვალეთ.'],
  ['ასოებით', 'სახელების ბარათების ზურგზე ასოებია: C D E F G A H. ამოაბრუნეთ და ითამაშეთ ასოებით (H = სი).'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„მფრინავი ნოტები“ ნოტების კითხვის თამაშია: ვინ იცნობს ნოტს უფრო სწრაფად — სანამ „გაფრინდება“? პლაკატზე ყველა ნოტი სახელით არის: ჯერ ის ისწავლეთ, მერე ითამაშეთ.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ნოტები ხაზზე მარჯვნიდან მიფრინავენ, ყოველ ოთხ სწორზე უფრო ჩქარა, სამი შეცდომა და თამაში მთავრდება — მარტო, წრეში (ტელეფონი ხელიდან ხელში) ან ონლაინ, კლასთან ერთად; იქ ნოტები ნამდვილი საგალობლებისა და სიმღერებისაა — sagandzureli.ge → თამაშები → მფრინავი ნოტები.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.mp-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:9mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap}
.mp-band.out{background:#fff;border:.35mm solid}
.mp-staff{position:absolute;left:5.5mm;right:5.5mm;top:14mm;bottom:12mm;display:flex;align-items:center;justify-content:center}
.mp-staff svg,.mp-mini svg,.mp-guide svg{display:block;overflow:visible}
.mp-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.6mm;display:flex;justify-content:space-between;align-items:center;font-size:10pt;color:var(--muted)}
.mp-foot span:last-child{font-weight:700}
.mp-stars{display:inline-flex;gap:.5mm;align-items:center;vertical-align:middle}
.mp-name{position:absolute;left:5mm;right:5mm;top:15mm;text-align:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:30pt;line-height:1}
.mp-name small{font-size:15pt;margin-left:2.4mm;color:var(--muted);font-weight:700}
.mp-place{position:absolute;left:5mm;right:5mm;top:30.5mm;text-align:center;font-weight:700;font-size:10.5pt;line-height:1.25;color:var(--brown)}
.mp-oct{position:absolute;left:5mm;right:5mm;top:41mm;text-align:center;font-size:8.8pt;color:var(--muted)}
.mp-mini{position:absolute;left:11.5mm;right:11.5mm;top:47mm;bottom:11mm;display:flex;align-items:center;justify-content:center}
.mp-guide{position:absolute;left:5.5mm;right:5.5mm;top:14.5mm;bottom:11mm;display:flex;flex-direction:column;justify-content:space-between}
.mp-guide b{font-size:9.5pt;color:var(--wine)}
.mp-nc{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3mm;color:#fff;border-radius:2mm;outline:.25mm solid rgba(0,0,0,.08);outline-offset:-1.6mm}
.mp-nc b{font-family:'SansKa',sans-serif;font-weight:900;font-size:21pt;line-height:1}
.mp-nc span{font-size:8.5pt;font-weight:700;opacity:.92}
.mp-nc.back{background:#fff;border:.8mm solid;border-radius:2.4mm;width:calc(100% - 3mm);height:calc(100% - 3mm);margin:1.5mm}
.mp-nc.back b{font-size:26pt}
.mp-nc.back span{color:var(--muted)}
.mp-po{position:absolute;left:12mm;right:12mm;top:10mm;bottom:12mm;display:flex;flex-direction:column}
.mp-poHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.8mm;margin-bottom:5mm}
.mp-poHead .aso{font-size:15pt;color:var(--wine);white-space:nowrap}
.mp-poHead b{font-size:20pt}
.mp-poSub{margin-left:auto;font-size:10pt;color:var(--muted)}
.mp-po h3{display:flex;align-items:center;gap:2mm;margin:2mm 0 1mm;font-size:13pt;color:var(--brown)}
.mp-po h3 .mp-stars+.mp-stars{margin-left:2mm}
.mp-poStaff{margin-bottom:5mm}
.mp-poStaff svg{display:block;overflow:visible}
.mp-poRows{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:2mm}
.mp-poRows .box{display:flex;flex-direction:column;gap:1.4mm;font-size:11pt}
.mp-poRows b{color:var(--wine)}
.mp-poRows span{font-family:'SansKa',sans-serif;font-weight:900;font-size:17pt}
.mp-poRows i{font-style:normal}
.mp-poTip{margin:5mm 0 0;font-size:11pt;line-height:1.45}
.mp-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.mp-exCards{display:flex;gap:3mm}
.mp-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.mp-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.mp-exR h3{margin:0 0 3mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'poster', front: posterPage('treble'), back: posterPage('bass') },
  ...cardSheets,
  namesSheet,
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
