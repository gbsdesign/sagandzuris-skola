// „ხმის წყვილები“ on paper — the სამაგიდო variant of the app's Memory of sounds (2026-11-01): three decks of 13 pairs, each with
// a back of its own colour so they never mix. ა: a melody on a staff (the opening of a chant of the app's chant games or a
// program song, melodies.mjs — the host sings it when it is turned) and its name; ბ: a note on the treble staff and its key on a
// keyboard, named (the two დო told apart by the key); გ: a folk song and its region on the songs map (each region's most recorded
// song of „საიდანაა სიმღერა?“'s kit). Each deck's 27th card is the host's — the pairs' key, or the notes' guide — and is taken out
// before the game. The cards are laid face down; two are turned a move; a pair is said aloud and kept, a miss is turned back.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import { abcOf, lineOf, openingOf, staff, musicHead, musicScript, musicCss } from '../music.js';
import { CHANTS, SONGS as PROGRAM_SONGS, app } from '../melodies.js';
import { staffSvg } from '../staffSvg.js';
import { LANDS, miniMap, mapCss } from '../regionMap.js';
import { partsCss, step } from '../kitParts.js';
import { SONGS as REGION_SONGS } from './saidanaa-simghera.js';

const { shuffle, mulberry32 } = app;

export const id = 'khmis-tsqvilebi';
export const title = 'ხმის წყვილები';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 მოთამაშე ან გუნდი · 6 წლიდან · 15–20 წუთი';
const PAIRS = 13;

const DECK = {
  a: { letter: 'ა', name: 'მელოდია და სახელი', color: C.wine, icon: 'music', halves: ['მელოდია', 'სახელი'], icons: ['music', 'tag'] },
  b: { letter: 'ბ', name: 'ნოტი და კლავიში', color: '#2b5f8a', icon: 'keyboard-music', halves: ['ნოტი', 'კლავიში'], icons: ['music-2', 'piano'] },
  g: { letter: 'გ', name: 'სიმღერა და კუთხე', color: '#2f7d4f', icon: 'map', halves: ['სიმღერა', 'კუთხე'], icons: ['mic-vocal', 'map-pinned'] },
};

// ---------- deck ა: melodies and names ----------
const KIND = {
  წირვა: { color: C.wine, icon: 'sun' },
  მწუხრი: { color: '#3d4f8a', icon: 'moon' },
  ცისკარი: { color: '#a8741a', icon: 'sunrise' },
  song: { color: '#2f7d4f', icon: 'music' },
};
const openingNotes = m => openingOf(lineOf(m.score, 0), { min: 6, max: 9 }).notes;
const MELODIES = shuffle([
  ...shuffle(CHANTS, mulberry32(20261102)).filter(m => KIND[m.where] && openingNotes(m).length >= 6).slice(0, 9),
  ...shuffle(PROGRAM_SONGS, mulberry32(7)).filter(m => openingNotes(m).length >= 6).slice(0, PAIRS - 9),
], mulberry32(13)).map((m, i) => ({ ...m, no: i + 1, look: m.kind === 'song' ? KIND.song : KIND[m.where], abc: abcOf(openingNotes(m)) }));
if (MELODIES.length !== PAIRS) throw new Error(`khmis-tsqvilebi: ${MELODIES.length} melodies`);

// ---------- deck ბ: notes and keys, დო of the first octave to ლა of the second ----------
const NAMES = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'H'];
/** the app's name colours (pages/games/mprinavi/Names.tsx) */
const TINT = ['#b23a48', '#cf7428', '#b08a12', '#4f8a3c', '#24827e', '#2b5f8a', '#5b3f8c'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81].map(midi => ({ midi, step: NATURAL.indexOf(midi % 12), white: (Math.floor(midi / 12) - 5) * 7 + NATURAL.indexOf(midi % 12) }));
if (NOTES.length !== PAIRS) throw new Error('khmis-tsqvilebi: notes');

/** two octaves of keys from დო of the first octave, `on` (a white key's index) in its colour */
const keyboard = (on, { w = 52, h = 21 } = {}) => {
  const n = 14, kw = w / n;
  const whites = Array.from({ length: n }, (_, i) => {
    const lit = i === on;
    return `<rect x="${(i * kw).toFixed(2)}" y="0" width="${kw.toFixed(2)}" height="${h}" rx=".6" fill="${lit ? TINT[i % 7] : '#fff'}" stroke="#4a3426" stroke-width=".3"/>`;
  }).join('');
  // black keys after დო, რე, ფა, სოლ, ლა
  const blacks = Array.from({ length: n - 1 }, (_, i) => ([0, 1, 3, 4, 5].includes(i % 7)
    ? `<rect x="${((i + 1) * kw - kw * 0.31).toFixed(2)}" y="0" width="${(kw * 0.62).toFixed(2)}" height="${(h * 0.6).toFixed(2)}" rx=".4" fill="#2b1e14"/>` : '')).join('');
  const dot = on >= 0 ? `<circle cx="${((on + 0.5) * kw).toFixed(2)}" cy="${(h - 2.6).toFixed(2)}" r="1.15" fill="#fff"/>` : '';
  return `<svg viewBox="-.3 -.3 ${w + 0.6} ${h + 0.6}" width="${w + 0.6}mm" height="${h + 0.6}mm" style="display:block">${whites}${blacks}${dot}</svg>`;
};

// ---------- deck გ: a song of every region ----------
const REGION_PAIRS = (() => {
  const seen = new Set();
  return REGION_SONGS.filter(s => !seen.has(s.region.id) && seen.add(s.region.id));
})();
if (REGION_PAIRS.length !== PAIRS) throw new Error(`khmis-tsqvilebi: ${REGION_PAIRS.length} regions`);

// ---------- the cards ----------
const band = (deck, half, color = DECK[deck].color) => `<div class="tq-band" style="background:${color}">${icon(DECK[deck].icons[half], { size: 4.4, color: '#fff', width: 2 })}<span>${DECK[deck].halves[half]}</span></div>`;
const cardFoot = (deck, mark = '') => `<div class="tq-foot"><span class="m">${mark}</span><span>${esc(title)} · <b style="color:${DECK[deck].color}">${DECK[deck].letter}</b></span></div>`;
const face = (deck, inner, cls = '') => `<div class="card tq ${cls}"><div class="frame" style="border-color:${DECK[deck].color}"></div>${inner}</div>`;

const melodyCard = m => face('a', `${band('a', 0)}<div class="tq-staff">${staff(m.abc)}</div>
<div class="tq-sing">${icon('mic-vocal', { size: 3.6, color: C.muted, width: 2 })}<span>მღერის წამყვანი</span></div>${cardFoot('a', `♪ ${m.no}`)}`);
const nameCard = m => face('a', `${band('a', 1)}<div class="tq-mid">
  ${icon(m.look.icon, { size: 11, color: m.look.color, width: 1.5 })}
  <div class="tq-name${[...m.title].length > 20 ? ' long' : ''}">${esc(m.title)}</div>
  <div class="tq-sub">${esc(m.kind === 'song' ? `${m.where} სიმღერა` : m.where)}</div>
</div>${cardFoot('a')}`);

const noteCard = n => face('b', `${band('b', 0)}<div class="tq-note">${staffSvg({ clef: 'treble', notes: [{ midi: n.midi }], head: 'whole', width: 50, space: 4, room: 2.7 }).svg}</div>${cardFoot('b')}`);
const keyCard = n => face('b', `${band('b', 1)}
<div class="tq-key">${keyboard(n.white)}</div>
<div class="tq-keyName" style="color:${TINT[n.step]}">${NAMES[n.step]}<small>${LETTERS[n.step]}</small></div>
<div class="tq-sub tq-oct">${n.midi < 72 ? 'პირველი ოქტავა' : 'მეორე ოქტავა'}</div>${cardFoot('b')}`);

const songCard = s => face('g', `${band('g', 0)}<div class="tq-mid">
  <div class="tq-name${[...s.title].length > 20 ? ' long' : ''}">${esc(s.title)}</div>
  ${s.genre ? `<div class="tq-sub">${esc(s.genre)}</div>` : ''}
  ${s.words ? `<div class="tq-words">„${esc(s.words.replace(/^\d+[.)]\s*/, ''))}“</div>` : ''}
</div>${cardFoot('g')}`);
const regionCard = s => face('g', `${band('g', 1)}
<div class="tq-map">${miniMap(s.region.id, { near: false })}</div>
<div class="tq-regionBox"><div class="tq-region${[...s.region.name].length > 11 ? ' long' : ''}">${esc(s.region.name)}</div>
${LANDS[s.region.id] ? `<div class="tq-sub">${esc(LANDS[s.region.id])}</div>` : ''}</div>${cardFoot('g')}`);

/** the host's card: the pairs' key (ა, გ) or the notes' guide (ბ) */
const hostBand = (deck, label) => `<div class="tq-band" style="background:${C.goldDark}">${icon('eye-off', { size: 4.2, color: '#fff', width: 2 })}<span>${label} · ${DECK[deck].letter}</span></div>`;
const keyA = face('a', `${hostBand('a', 'წამყვანის ბარათი')}<ol class="tq-list">${MELODIES.map(m => `<li><b>♪ ${m.no}</b><span>${esc(m.title)}</span></li>`).join('')}</ol>`, 'host');
const guideStaff = notes => staffSvg({ clef: 'treble', width: 53, space: 2.2, room: 2.1, under: 4, font: 2.45, head: 'whole', padRight: 1.2,
  notes: notes.map(n => ({ midi: n.midi, under: NAMES[n.step], wordColor: TINT[n.step] })) }).svg;
const keyB = face('b', `${hostBand('b', 'მინიშნება')}<div class="tq-guide">
  <b>პირველი ოქტავა</b><div>${guideStaff(NOTES.slice(0, 7))}</div>
  <b>მეორე ოქტავა</b><div>${guideStaff(NOTES.slice(7))}</div>
  <p>ორი დოა — დაბალი და მაღალი: კლავიშზე ჩანს, რომელია.</p>
</div>`, 'host');
const keyG = face('g', `${hostBand('g', 'წამყვანის ბარათი')}<ol class="tq-list g">${REGION_PAIRS.map(s => `<li><b>${esc(s.region.name)}</b><span>${esc(s.title)}</span></li>`).join('')}</ol>`, 'host');

const back = deck => {
  const d = DECK[deck];
  return `<div class="card tq-back" style="background-color:${d.color}"><div class="tq-backFrame"></div>
<div class="tq-backMid">${icon(d.icon, { size: 19, color: '#ecd393', width: 1.4 })}<span class="aso">${aso(title)}</span></div>
<div class="tq-backLetter">${d.letter}</div></div>`;
};
const hostBack = deck => `<div class="card tq-hostBack"><div class="frame" style="border-color:${C.goldDark}"></div>
<div class="tq-hostMid">${icon('eye-off', { size: 12, color: C.goldDark, width: 1.5 })}<b>წამყვანის ბარათი</b><span>თამაშის წინ დასტიდან ამოიღეთ</span></div>
<div class="tq-backLetter dark" style="color:${DECK[deck].color};border-color:${DECK[deck].color}">${DECK[deck].letter}</div></div>`;

const DECK_SLOTS = {
  a: [...MELODIES.flatMap(m => [melodyCard(m), nameCard(m)]), keyA],
  b: [...NOTES.flatMap(n => [noteCard(n), keyCard(n)]), keyB],
  g: [...REGION_PAIRS.flatMap(s => [songCard(s), regionCard(s)]), keyG],
};
const cardSheets = Object.entries(DECK_SLOTS).flatMap(([deck, cards]) => {
  if (cards.length !== 27) throw new Error(`khmis-tsqvilebi: deck ${deck} has ${cards.length} cards`);
  const d = DECK[deck];
  return [0, 1, 2].map(s => {
    const nine = cards.slice(s * 9, s * 9 + 9);
    const backs = nine.map((_, i) => (s === 2 && i === 8 ? hostBack(deck) : back(deck)));
    return {
      key: `${deck}${s + 1}`,
      front: cardSheet(nine, { label: `${title} · დასტა ${d.letter} „${d.name}“ ${s + 1}/3${s === 2 ? ' — ბოლოს წამყვანის ბარათი' : ''}` }),
      back: cardSheet(backs, { back: true, label: `${title} · დასტა ${d.letter} ${s + 1}/3 — ზურგი` }),
    };
  });
});

// ---------- the cover and the rules ----------
const EX = MELODIES[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ბარათები პირქვე აწყვია. სვლაზე ორს ხსნი: თუ წყვილია — შენია და კიდევ ხსნი, თუ არა — ისევ აბრუნებ. დაიმახსოვრე, სად რა იყო! სამი დასტაა: მელოდია და მისი სახელი, ნოტი და მისი კლავიში, სიმღერა და მისი კუთხე. მელოდიის ბარათს წამყვანი მღერის. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="tq-ex box">
    <div class="tq-exCards"><div class="tq-exCard">${melodyCard(EX)}</div><div class="tq-exCard">${nameCard(EX)}</div></div>
    <div class="tq-exR">
      <h3>ასე მიდის სვლა</h3>
      ${step('layers', 'წამყვანის ბარათს ამოიღებთ, 26 ბარათს აურევთ და პირქვე დააწყობთ რიგებად.')}
      ${step('music', 'მოთამაშე ორ ბარათს ხსნის. მელოდიას წამყვანი მღერის — ყველას ესმის.')}
      ${step('hand', 'წყვილია? ხმამაღლა თქვი, რა არის — წამყვანი თავისი ბარათით ამოწმებს. აიღე და კიდევ ხსენი ორი.')}
      ${step('trophy', 'ბოლოს — ვისაც მეტი წყვილი აქვს, ის იგებს.', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        ${Object.entries(DECK).map(([k, d]) => `<tr><td><b style="color:${d.color}">დასტა ${d.letter}</b> — ${d.name}: ${PAIRS} წყვილი და წამყვანის ბარათი</td><td>27</td><td>${no(`${k}1`)}–${no(`${k}3`)}</td></tr>`).join('')}
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით. ყოველ დასტას თავისი ფერის ზურგი აქვს — არ აირევა.</li>
        <li>ყოველი დასტის ბოლო ბარათი წამყვანისაა (ზურგზე წერია) — თამაშში არ შედის.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ბარათების თამაშის „Memory“ იდეით. მელოდიები — აპის საგალობლებისა და სიმღერების ნოტებიდან, სიმღერები და კუთხეები — აპის სიმღერების რუკიდან; ნოტების ნიშნები — abcjs-ის (MIT). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['დასტები', `სამი დასტაა, თითოეულში ${PAIRS} წყვილი: <b>ა</b> — მელოდია ნოტებით და მისი სახელი; <b>ბ</b> — ნოტი ხაზზე და მისი კლავიში; <b>გ</b> — ხალხური სიმღერა და მისი კუთხე რუკაზე. ზურგის ფერით არ აირევა: ა — ღვინისფერი, ბ — ლურჯი, გ — მწვანე.`],
  ['მომზადება', 'დასტას ბოლო ბარათი — წამყვანისა — ამოუღეთ. 26 ბარათი აურიეთ და მაგიდაზე პირქვე დააწყვეთ რიგებად (მაგალითად, ხუთი რიგი ხუთ-ხუთი და ერთი ბოლოს).'],
  ['სვლა', 'მოთამაშე (ან გუნდი) ორ ბარათს ხსნის ისე, რომ ყველამ დაინახოს. მელოდიის ბარათს წამყვანი მღერის — ან ვინც ნოტებს კითხულობს; ყველამ უნდა გაიგონოს.'],
  ['წყვილი', 'თუ ორი ბარათი წყვილია, მოთამაშე ხმამაღლა ამბობს, რა არის: რომელი საგალობელი ან სიმღერაა, რა ნოტია, საიდანაა სიმღერა. წამყვანი თავისი ბარათით ამოწმებს. სწორია — წყვილი მისია და კიდევ ხსნის ორს.'],
  ['არა', 'თუ წყვილი არაა, ორივე ბარათი იმავე ადგილას ისევ პირქვე ბრუნდება. ჯერი შემდეგზეა — ყველა იმახსოვრებს, სად რა იყო!'],
  ['მოგება', 'როცა მაგიდაზე ბარათი აღარ დარჩა, წყვილები დაითვალეთ: ვისაც მეტი აქვს, ის იგებს.'],
  ['პატარებთან', 'დაიწყეთ 8 წყვილით (16 ბარათით). მელოდიები წამყვანმა თამაშის წინ ერთხელ იმღეროს — ყველამ იცოდეს, რა ჟღერს.'],
  ['უფრო რთულად', 'ორი დასტა ერთად აურიეთ: წყვილი მხოლოდ ერთი ფერის ზურგიდანაა — ესეც დაიმახსოვრეთ.'],
  ['მარტო', 'მარტოც ითამაშება: სვლები დაითვალე — ორი ბარათი ერთი სვლაა. მეორედ ნაკლები სვლით სცადე.'],
  ['დასტა ბ', 'ორი დოა — დაბალი და მაღალი: კლავიშზე ჩანს, რომელია. მინიშნების ბარათზე ყველა ნოტი სახელით არის — თამაშამდე ერთად გადახედეთ.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ხმის წყვილები“ მეხსიერების თამაშია: ბარათები პირქვე აწყვია და ორ-ორს ხსნით, სანამ ყველა წყვილს არ იპოვით. ვინც უკეთ დაიმახსოვრებს, სად რა იყო — ის იგებს; თან სწავლობთ მელოდიებს, ნოტებს და სიმღერების კუთხეებს.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: იქ ბარათები თვითონ ჟღერს — საგალობლის დასაწყისი სინთეზატორზე ან ხალხური სიმღერის ჩანაწერი. მარტო (რეკორდი სვლებით), ონლაინ, კლასთან ერთად, ან ერთი ტელეფონით გუნდებად — sagandzureli.ge → თამაშები → ხმის წყვილები.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.0);
export const css = `${coverCss}${musicCss}${partsCss}${mapCss}
.tq-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:9mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap}
.tq-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:center;font-size:8.6pt;color:var(--muted)}
.tq-foot .m{font-weight:800;font-size:10.5pt;color:var(--brown)}
.tq-foot b{font-size:10pt}
.tq-staff{position:absolute;left:4.4mm;right:4.4mm;top:18mm;bottom:13mm;display:flex;align-items:center}
.tq-mid{position:absolute;left:5mm;right:5mm;top:15mm;bottom:11mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.2mm;text-align:center}
.tq-name{font-weight:800;font-size:15pt;line-height:1.18;color:var(--brown)}
.tq-name.long{font-size:12.5pt}
.tq-sub{font-size:9.5pt;color:var(--muted);line-height:1.25}
.tq-words{font-size:9.2pt;font-style:italic;line-height:1.3;color:#6b5a48}
.tq-note{position:absolute;left:6mm;right:6mm;top:15mm;bottom:12mm;display:flex;align-items:center;justify-content:center}
.tq-note svg,.tq-guide svg{display:block;overflow:visible}
.tq-key{position:absolute;left:5.2mm;right:5.2mm;top:17mm;display:flex;justify-content:center}
.tq-keyName{position:absolute;left:5mm;right:5mm;top:44mm;text-align:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:27pt;line-height:1}
.tq-keyName small{font-size:14pt;margin-left:2.2mm;color:var(--muted);font-weight:700}
.tq-oct{position:absolute;left:5mm;right:5mm;top:58mm;text-align:center}
.tq-map{position:absolute;left:6mm;right:6mm;top:17mm}
.tq-sing{position:absolute;left:5mm;right:5mm;bottom:11.5mm;display:flex;align-items:center;justify-content:center;gap:1.2mm;font-size:8.6pt;color:var(--muted)}
.tq-regionBox{position:absolute;left:5mm;right:5mm;top:49mm;bottom:11mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6mm;text-align:center}
.tq-region{font-weight:800;font-size:17pt;line-height:1.1;color:var(--brown)}
.tq-region.long{font-size:14pt}
.tq-list{position:absolute;left:5.2mm;right:5.2mm;top:15.2mm;margin:0;padding:0;list-style:none;font-size:7.7pt;line-height:1.16}
.tq-list li{display:flex;gap:1.6mm;align-items:baseline;padding:.36mm 0;border-bottom:.15mm solid #e6dcc9}
.tq-list li b{flex:none;color:var(--wine);min-width:7mm}
.tq-list.g{font-size:7.1pt;line-height:1.14}
.tq-list.g li{padding:.28mm 0}
.tq-list.g li b{min-width:0;width:25.5mm;white-space:nowrap;color:#2f7d4f}
.tq-guide{position:absolute;left:5mm;right:5mm;top:15mm;bottom:5mm;display:flex;flex-direction:column;gap:1mm}
.tq-guide b{font-size:8.8pt;color:#2b5f8a}
.tq-guide>div{margin-bottom:1.2mm}
.tq-guide p{margin:auto 0 0;font-size:8.4pt;line-height:1.3;color:var(--brown)}
.tq-back{background-image:repeating-linear-gradient(45deg,rgba(236,211,147,.11) 0 2.2mm,transparent 2.2mm 4.8mm)}
.tq-backFrame{position:absolute;inset:3mm;border:.4mm solid #ecd393;border-radius:2.6mm;opacity:.85}
.tq-backMid{position:absolute;left:0;right:0;top:24mm;display:flex;flex-direction:column;align-items:center;gap:4mm}
.tq-backMid .aso{font-size:11pt;color:#ecd393;letter-spacing:.06em}
.tq-backLetter{position:absolute;left:50%;bottom:9mm;transform:translateX(-50%);width:11mm;height:11mm;border-radius:50%;border:.45mm solid #ecd393;color:#ecd393;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14pt;font-family:'SansKa',sans-serif}
.tq-backLetter.dark{background:#fff}
.tq-hostBack{background:#fff}
.tq-hostMid{position:absolute;left:6mm;right:6mm;top:22mm;display:flex;flex-direction:column;align-items:center;gap:2.4mm;text-align:center}
.tq-hostMid b{font-size:13pt;color:var(--brown)}
.tq-hostMid span{font-size:9.5pt;color:var(--muted);line-height:1.3}
.tq-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.tq-exCards{display:flex;gap:3mm}
.tq-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.tq-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.tq-exR h3{margin:0 0 3mm}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }, ...cardSheets];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
