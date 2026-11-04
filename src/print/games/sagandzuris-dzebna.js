// „საგანძურის ძებნა“ on paper — the სამაგიდო variant of the app's treasure hunt (2026-11-04): four ready hunts of six stations,
// each in its own colour (ა ბ გ დ). A station is a card the teacher hides in the yard or the school: a task of the app's own kinds
// (`huntTask` of `utils/dzebna.ts` over `data/dzebnaPools.ts` — a question, a place's region, the earliest of three events, a
// word in the old letters with its key), every answer marked by a letter: the right one's is the station's letter of the hunt's
// word (`teamWords`, `letterAt` — scrambled, never the word in the stations' order), the others' are letters the word has not.
// The teacher writes on each card where the next one hides. A team writes each station's letter on its sheet; the six in the
// right order are the word, which it brings to the chest — the teacher. All four hunts have six stations, so teams race on one
// hunt (each from another station, `startOf`) or each on its own colour. The teacher's key, the chest's sign and arrivals sheet.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import { oldHead, oldCss } from '../oldScript.js';
import * as __d0 from '../../data/dzebnaPools';
import * as __d1 from '../../utils/dzebna';
import * as __d2 from '../../utils/oldScripts';
import * as __d3 from '../../utils/otkheuli';
import * as __d4 from '../../utils/hangi';

const {
  dzebnaPools, huntBank, huntTask, teamWords, letterAt, startOf, KIND_LABEL, toScript, ALPHABET, SCRIPT_LABEL, mulberry32, shuffle, hash32,
} = ({ ...__d0, ...__d1, ...__d2, ...__d3, ...__d4 });

export const id = 'sagandzuris-dzebna';
export const title = 'საგანძურის ძებნა';
const TAG = 'ქართული · უტელეფონო';
const META = '1–6 გუნდი · 8 წლიდან · 25–40 წუთი';
const STATIONS = 6;
const KINDS = ['quiz', 'region', 'year', 'old'];
const SETS = [
  { mark: 'ა', tint: '#7a2028' },
  { mark: 'ბ', tint: '#2b5f8a' },
  { mark: 'გ', tint: '#2f7d4f' },
  { mark: 'დ', tint: '#5b3f8c' },
];
const KIND_ICON = { quiz: 'brain', region: 'map-pinned', year: 'hourglass', old: 'scroll-text' };
const KIND_SAY = { quiz: 'ოთხიდან ერთი სწორია', region: 'ოთხი კუთხიდან ერთი', year: 'სამიდან ყველაზე ძველი', old: 'ამოიკითხეთ გასაღებით' };
const len = s => [...s].length;

// ---------- the four hunts: the first seeds whose six tasks are of every kind, short enough for a card, none twice ----------
const pools = dzebnaPools();
const bank = huntBank();
const fits = t => len(t.ask) <= 110 && t.options.every(o => len(o) <= (t.kind === 'year' ? 58 : 44));
const HUNTS = (() => {
  const out = [];
  const words = new Set(), hints = new Set(), items = new Set();
  for (let seed = 501; out.length < SETS.length && seed < 3000; seed++) {
    const conf = { seed, stations: STATIONS, teams: 1, kinds: KINDS };
    const w = teamWords(conf, bank)[0];
    if (!w || words.has(w.word) || hints.has(w.hint)) continue;
    const tasks = Array.from({ length: STATIONS }, (_, s) => huntTask(pools, conf, s));
    if (tasks.some(t => !t || !fits(t) || items.has(`${t.kind}:${t.id}`))) continue;
    if (new Set(tasks.map(t => t.kind)).size < KINDS.length) continue;
    const letters = tasks.map((_, s) => letterAt(conf, 0, w.word, s));
    // the wrong answers' letters: letters the word has not, none twice on a card
    const rnd = mulberry32(hash32(`dzebna-print|${seed}`));
    const others = ALPHABET.filter(ch => !w.word.includes(ch));
    const labels = tasks.map((t, s) => {
      const pool = shuffle([...others], rnd);
      let k = 0;
      return t.options.map((_, i) => (i === t.right ? letters[s] : pool[k++]));
    });
    out.push({ ...SETS[out.length], conf, word: w.word, hint: w.hint, tasks, letters, labels });
    words.add(w.word);
    hints.add(w.hint);
    tasks.forEach(t => items.add(`${t.kind}:${t.id}`));
  }
  if (out.length < SETS.length) throw new Error('sagandzuris-dzebna: fewer than four hunts');
  // every hunt is its word, scrambled: the letters in the stations' order are never the word itself
  out.forEach(h => { if (h.letters.join('') === h.word) throw new Error(`sagandzuris-dzebna: ${h.mark} spells its word`); });
  return out;
})();

// the stations' starts for 2–6 teams on one hunt — the app's own
const STARTS = [2, 3, 4, 5, 6].map(k => ({ k, at: Array.from({ length: k }, (_, t) => startOf({ stations: STATIONS, teams: k }, t) + 1) }));

// ---------- the chest, drawn as in the app ----------
const chestSvg = (w, { open = false } = {}) => `<svg viewBox="0 0 64 60" width="${w}mm" height="${(w * 60) / 64}mm">
${open ? '<ellipse cx="32" cy="30" rx="30" ry="16" fill="#f7d774" opacity=".55"/>' : ''}
<rect x="6" y="30" width="52" height="26" rx="4" fill="#7d4521"/><rect x="6" y="30" width="52" height="5" fill="#5e3216"/>
<rect x="15" y="30" width="6" height="26" fill="#e0b44a"/><rect x="43" y="30" width="6" height="26" fill="#e0b44a"/>
${open
    ? '<path d="M8 30 L12 10 Q32 2 52 10 L56 30 Z" fill="#9a5b2e" transform="rotate(-8 8 30)"/><rect x="18" y="22" width="28" height="10" rx="3" fill="#ffe9a3"/><circle cx="24" cy="25" r="3.2" fill="#f3d27a" stroke="#c9a227"/><circle cx="33" cy="24" r="3.6" fill="#f3d27a" stroke="#c9a227"/><circle cx="41" cy="26" r="3" fill="#f3d27a" stroke="#c9a227"/>'
    : '<path d="M6 30 Q6 12 32 12 Q58 12 58 30 Z" fill="#9a5b2e"/><path d="M15 30 Q15 15 21 13.2 L21 30 Z" fill="#e0b44a"/><path d="M43 13.2 Q49 15 49 30 L43 30 Z" fill="#e0b44a"/><rect x="26.5" y="25" width="11" height="13" rx="2.5" fill="#f3d27a" stroke="#a3821b"/><circle cx="32" cy="30" r="2" fill="#5e3216"/><rect x="31.1" y="30" width="1.8" height="4.5" fill="#5e3216"/>'}
</svg>`;
const setDot = (h, cls = '') => `<b class="dz-dot ${cls}" style="background:${h.tint}">${h.mark}</b>`;

// ---------- a station's card: 96×90 mm, six a sheet ----------
const CARD = { cols: 2, rows: 3, w: 96, h: 90 };
/** the old word's key: its own letters and, to make it no give-away, other options' letters — at most twelve, in the alphabet's order */
const keyOf = (t, seed) => {
  const own = [...new Set(t.old.word)];
  const more = shuffle(ALPHABET.filter(ch => !own.includes(ch) && t.options.some(o => o.includes(ch))), mulberry32(hash32(`dzebna-key|${seed}|${t.id}`)));
  const shown = new Set([...own, ...more.slice(0, Math.max(0, 12 - own.length))]);
  return ALPHABET.filter(ch => shown.has(ch));
};
const stationFront = (h, s) => {
  const t = h.tasks[s];
  const wide = t.options.every(o => len(o) <= 16);
  const old = t.old ? `<div class="dz-stone"><span class="old">${esc(toScript(t.old.word, t.old.script))}</span><small>${esc(SCRIPT_LABEL[t.old.script])}</small></div>
<div class="dz-mkey">${keyOf(t, h.conf.seed).map(ch => `<span><b class="old">${toScript(ch, t.old.script)}</b><i>${ch}</i></span>`).join('')}</div>` : '';
  const next = (s + 1) % STATIONS;
  return `<div class="dz-card" style="--t:${h.tint}">
  <div class="dz-band"><span>${setDot(h, 'on')}ნაკრები ${h.mark}</span><span>${esc(title)}</span></div>
  <div class="dz-in">
    <div class="dz-head"><b class="dz-num">${s + 1}</b><div><b>სადგური № ${s + 1}</b><span>${icon(KIND_ICON[t.kind], { size: 3.6, color: h.tint, width: 2 })}${esc(KIND_LABEL[t.kind])} · ${esc(KIND_SAY[t.kind])}</span></div></div>
    <p class="dz-ask">${esc(t.ask)}</p>
    ${old}
    <ul class="dz-opts${wide ? ' two' : ''}">${t.options.map((o, i) => `<li><b>${h.labels[s][i]}</b><span>${esc(o)}</span></li>`).join('')}</ul>
    <p class="dz-say">სწორი პასუხის ასო ჩაწერეთ ფურცელზე, № ${s + 1} უჯრაში.</p>
  </div>
  <div class="dz-foot">${icon('footprints', { size: 4, color: h.tint, width: 2 })}<span>შემდეგი — № ${next + 1}:</span><i></i></div>
</div>`;
};
const stationBack = (h, s) => `<div class="dz-back" style="background:${h.tint}">
  <div class="dz-backIn">
    <div class="dz-backDisc">${chestSvg(24)}</div>
    <div class="dz-backT">${esc(title)}</div>
    <div class="dz-backNo">№ ${s + 1}</div>
    <div class="dz-backS">ნაკრები ${h.mark} · ბარათი ადგილზე დატოვეთ</div>
  </div>
</div>`;
const huntSheets = HUNTS.map(h => ({
  key: `hunt${h.mark}`,
  front: gridSheet(h.tasks.map((_, s) => stationFront(h, s)), { ...CARD, label: `${title} · ნაკრები ${h.mark} — სადგურები №1–№${STATIONS}`, cls: 'gsheet dzCards' }),
  back: gridSheet(h.tasks.map((_, s) => stationBack(h, s)), { ...CARD, back: true, label: `${title} · ნაკრები ${h.mark} — ზურგი`, cls: 'gsheet dzCards' }),
}));

// ---------- a team's sheet: 96×135 mm, four a sheet, for any hunt ----------
const SLIP = { cols: 2, rows: 2, w: 96, h: 135 };
const slipFront = `<div class="dz-slip">
  <div class="dz-sband">${icon('gem', { size: 4.6, color: '#f0d9a0', width: 2 })}<span>${esc(title)} · გუნდის ფურცელი</span></div>
  <div class="dz-sin">
    <div class="dz-field"><span>გუნდი</span><i></i></div>
    <div class="dz-sets"><span>ნაკრები</span>${HUNTS.map(h => setDot(h, 'big')).join('')}<small>შემოხაზეთ</small></div>
    <div class="dz-field"><span>ვიწყებთ №</span><i class="short"></i><span>ადგილი</span><i></i></div>
    <div class="dz-lab">სადგურების ასოები</div>
    <div class="dz-row">${Array.from({ length: STATIONS }, (_, s) => `<div class="dz-cell"><small>№ ${s + 1}</small><i></i></div>`).join('')}</div>
    <div class="dz-lab">სიტყვა — იგივე ასოები, სწორი რიგით</div>
    <div class="dz-row">${Array.from({ length: STATIONS }, () => '<div class="dz-cell"><i class="gold"></i></div>').join('')}</div>
    <div class="dz-lab">მინიშნება</div>
    <ul class="dz-hints">${HUNTS.map(h => `<li>${setDot(h)}<span>${esc(h.hint)}</span></li>`).join('')}</ul>
    <div class="dz-chestL">${chestSvg(11)}<span>სიტყვა ჩუმად მიუტანეთ სკივრს — მასწავლებელს. ვინც პირველი!</span></div>
  </div>
</div>`;
const HOW = [
  ['map-pinned', 'იპოვეთ თქვენი პირველი სადგურის ბარათი — მასწავლებელმა გითხრათ, სადაა.'],
  ['brain', 'ამოხსენით დავალება. სწორი პასუხის ასო ჩაწერეთ ფურცელზე, სადგურის ნომრის უჯრაში.'],
  ['footprints', 'ბარათი ადგილზე დატოვეთ! მის ქვემოთ წერია, სად არის შემდეგი.'],
  ['key-round', 'ექვსივე ასოთი შეადგინეთ სიტყვა — ასოები არეულია. არ გამოდის? ერთ-ერთი პასუხი შეამოწმეთ.'],
  ['trophy', 'სიტყვა ჩუმად მიუტანეთ მასწავლებელს. ვინც სწორ სიტყვას პირველი მოიტანს, იგებს!'],
];
const slipBack = `<div class="dz-slip back">
  <div class="dz-sband">${icon('map', { size: 4.6, color: '#f0d9a0', width: 2 })}<span>როგორ ვეძებოთ</span></div>
  <div class="dz-sin">
    <ol class="dz-how">${HOW.map(([ic, t], k) => `<li><b>${k + 1}</b>${icon(ic, { size: 5.4, color: C.wine, width: 1.8 })}<span>${esc(t)}</span></li>`).join('')}</ol>
    <div class="dz-howArt">${chestSvg(30, { open: true })}</div>
  </div>
</div>`;
const slipSheet = {
  key: 'slips',
  front: gridSheet([slipFront, slipFront, slipFront, slipFront], { ...SLIP, label: `${title} · გუნდების ფურცლები — დაბეჭდეთ, რამდენიც საჭიროა`, cls: 'gsheet dzSlips' }),
  back: gridSheet([slipBack, slipBack, slipBack, slipBack], { ...SLIP, back: true, label: `${title} · გუნდების ფურცლები — ზურგი`, cls: 'gsheet dzSlips' }),
};

// ---------- the teacher's key: two hunts a side ----------
const taskLine = t => (t.old
  ? `${esc(t.ask)} <span class="old dz-kOld">${esc(toScript(t.old.word, t.old.script))}</span> <small>(${esc(SCRIPT_LABEL[t.old.script])})</small>`
  : esc(t.ask));
const keyBlock = h => `<div class="dz-kh" style="--t:${h.tint}">
  <div class="dz-khHead">${setDot(h, 'big')}<div><b>ნაკრები ${h.mark}</b><span>მინიშნება: ${esc(h.hint)}</span></div><div class="dz-khWord"><small>სიტყვა</small><b>${esc(h.word)}</b></div></div>
  <div class="dz-khLetters"><span>ასოები სადგურების რიგით:</span>${h.letters.map((ch, s) => `<b><small>№${s + 1}</small>${ch}</b>`).join('')}</div>
  <table class="t dz-kt"><tr><th>№</th><th>დავალება</th><th>სწორი პასუხი</th><th>ასო</th></tr>
  ${h.tasks.map((t, s) => `<tr><td class="n">${s + 1}</td><td><em>${esc(KIND_LABEL[t.kind])}.</em> ${taskLine(t)}</td><td class="a">${esc(t.options[t.right])}</td><td class="l">${h.letters[s]}</td></tr>`).join('')}
  </table>
</div>`;
const keyPage = (pair, side) => page(`<div class="dz-keyWrap">
  <div class="dz-keyHead"><div><div class="rtitle">მასწავლებლის გასაღები</div><div class="rsub">${esc(title)} · ნაკრები ${pair.map(h => h.mark).join(' და ')} · ${side}</div></div>${icon('eye-off', { size: 7, color: C.wine, width: 1.7 })}<span class="dz-secret">გუნდებს არ აჩვენოთ</span></div>
  ${pair.map(keyBlock).join('')}
  <div class="dz-starts box"><b>სად იწყებენ გუნდები, ერთ ნაკრებზე:</b> ${STARTS.map(({ k, at }) => `<span>${k} გუნდი — ${at.map(n => `№${n}`).join(', ')}</span>`).join('')}</div>
  <p class="dz-unchecked">დავალებები აპის თამაშებიდანაა, ნაწილი Claude-მა დაწერა — მასწავლებელს ჯერ არ შეუმოწმებია. შეცდომას თუ შეამჩნევთ, გვითხარით.</p>
</div>
${foot(`<span>${esc(title)} · მასწავლებლის გასაღები</span><span>${esc(SCHOOL)}</span>`)}`, 'keyP');
const keySheet = { key: 'key', front: keyPage(HUNTS.slice(0, 2), '1/2'), back: keyPage(HUNTS.slice(2), '2/2') };

// ---------- the chest: its sign and the arrivals ----------
const chestFront = page(`<div class="dz-sign">
  <div class="aso dz-signAso">${aso('სკივრი')}</div>
  <div class="dz-signT">სკივრი</div>
  <div class="dz-signArt">${chestSvg(120)}</div>
  <div class="dz-signL">აქ მოიტანეთ სიტყვა</div>
  <div class="dz-signS">ექვსივე ასო გაქვთ? შეადგინეთ სიტყვა და ჩუმად უთხარით მასწავლებელს. სწორია — სკივრი თქვენია!</div>
</div>`, 'signP');
const chestBack = page(`<div class="dz-arrWrap">
  <div class="rhead"><div class="rtitle">ვინ მოვიდა სკივრთან</div><div class="rsub">${esc(title)} · ჩაწერეთ დრო და შეამოწმეთ სიტყვა გასაღებით</div></div>
  <div class="dz-arrTop"><span>დაწყების დრო:</span><i></i><span>ნაკრები:</span>${HUNTS.map(h => setDot(h, 'big')).join('')}</div>
  <table class="t dz-arr"><tr><th>ადგილი</th><th>გუნდი</th><th>ნაკრები</th><th>იწყებს №</th><th>მოვიდა</th><th>სიტყვა</th></tr>
  ${Array.from({ length: 8 }, (_, i) => `<tr><td class="n">${i + 1}</td><td></td><td></td><td></td><td></td><td class="c"><span class="chk"></span>სწორია</td></tr>`).join('')}
  </table>
  <div class="box dz-arrNote"><b>სიტყვა არასწორია?</b> უთხარით, ასოები სწორია, მაგრამ რიგი სხვაა, თუ ერთ-ერთი ასო არასწორია — გუნდი თავის სადგურს ბრუნდება და პასუხს ამოწმებს. გასაღებში ყოველი სადგურის ასო წერია.</div>
</div>
${foot(`<span>${esc(title)} · სკივრი</span><span>${esc(SCHOOL)}</span>`)}`, 'arrP');
const chestSheet = { key: 'chest', front: chestFront, back: chestBack };

// ---------- the cover and the rules ----------
const EX = HUNTS[0];
const EX_S = EX.tasks.findIndex(t => t.kind === 'region');
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ეზოში ან სკოლაში ექვსი ბარათია დამალული. თითოზე დავალებაა — კითხვა, კუთხე, თარიღი, ძველი ასოებით ნაწერი სიტყვა — და ყოველ პასუხს თავისი ასო აქვს. სწორი პასუხების ასოებიდან სიტყვა დგება, სიტყვა კი სკივრს ხსნის. ვინ მიაღწევს სკივრამდე პირველი?<br><b>${META}</b></div>
  <div class="dz-sets4">${HUNTS.map(h => `<div class="dz-set4" style="--t:${h.tint}">${setDot(h, 'big')}<b class="nm">ნაკრები ${h.mark}</b><span>${STATIONS} სადგური · სიტყვა ${len(h.word)} ასოსი</span></div>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        ${HUNTS.map(h => `<tr><td>ნაკრები ${h.mark}: სადგურების ბარათები</td><td>${STATIONS}</td><td>${no(`hunt${h.mark}`)}</td></tr>`).join('')}
        <tr><td>გუნდების ფურცლები</td><td>4</td><td>${no('slips')}</td></tr>
        <tr><td>მასწავლებლის გასაღები</td><td>2 გვერდი</td><td>${no('key')}</td></tr>
        <tr><td>სკივრის ფურცელი და მოსვლის სია</td><td>1</td><td>${no('chest')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 96×90 მმ გამოვა.</li>
        <li>ერთ ძებნას ერთი ნაკრების ფურცელი სჭირდება. თითო გუნდს თავისი ფერის ნაკრები თუ გინდათ — დაბეჭდეთ რამდენიმე.</li>
        <li>გუნდების ფურცელი (${no('slips')}) დაბეჭდეთ იმდენჯერ, რამდენი გუნდიც გყავთ (ერთ ფურცელზე ოთხია).</li>
        <li>გასაღები (${no('key')}) გუნდებს არ აჩვენოთ — იქ პასუხები და სიტყვებია.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Geocaching“-ისა და სასკოლო საგანძურის ძებნის იდეით. დავალებები საგანძურის სკოლის აპის თამაშებიდანაა — ნაწილი Claude-მა დაწერა, მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['მზადება', `აირჩიეთ ნაკრები და ამოჭერით მისი ექვსი ბარათი (${HUNTS.map(h => no(`hunt${h.mark}`)).join(', ')}). ყოველი ბარათის ქვემოთ ჩაწერეთ, სად დამალავთ შემდეგს: №1-ზე — №2-ის ადგილი, …, №6-ზე — №1-ის. დამალეთ ბარათები ისე, რომ ცოტა ძებნა დასჭირდეს, მაგრამ ხელი არაფერს ახლონ.`],
  ['გუნდები', `თითო გუნდს (2–5 ბავშვი) — გუნდის ფურცელი (${no('slips')}) და ფანქარი. ფურცელზე შემოხაზეთ ნაკრების ფერი და ჩაწერეთ, რომელი სადგურიდან იწყებს და სადაა ის: ${STARTS.slice(0, 3).map(({ k, at }) => `${k} გუნდი — ${at.map(n => `№${n}`).join(', ')}`).join('; ')} (სხვები გასაღებშია).`],
  ['სადგური', 'გუნდი ბარათს პოულობს და დავალებას ხსნის. ყოველ პასუხს თავისი ასო აქვს — სწორი პასუხის ასო ფურცელზე, სადგურის ნომრის უჯრაში იწერება. ბარათი ადგილზე რჩება, მის ქვემოთ კი წერია, სად არის შემდეგი.'],
  ['ძველი ასოები', 'ხუცური დავალების ბარათზე ძველი ასოებით სიტყვაა, ქვემოთ — გასაღები: ძველი ასო ზემოთ, დღევანდელი ქვემოთ. სიტყვას ასო-ასო ამოიკითხავთ.'],
  ['სიტყვა', 'ექვსივე სადგურის მერე ფურცელზე ექვსი ასოა — ისინი არეულია. მინიშნება ფურცელზევე წერია (თქვენი ფერის გასწვრივ). სიტყვა არ გამოდის? ერთ-ერთი პასუხი არასწორია — დაბრუნდით და შეამოწმეთ.'],
  ['სკივრი', `სკივრის ფურცელი (${no('chest')}) მასწავლებლის მაგიდაზე დევს. გუნდი სიტყვას ჩუმად ეუბნება მასწავლებელს; ის გასაღებით ამოწმებს და ზურგზე დროს წერს. ვინც სწორ სიტყვას პირველი მოიტანს, იგებს.`],
  ['რამდენიმე ფერი', 'ოთხივე ნაკრებს ექვსი სადგური აქვს, ამიტომ შეიძლება თითო გუნდს თავისი ფერის ნაკრები ჰქონდეს — ერთ ეზოში ოთხი ძებნა ერთად. ბარათს თავისი ფერი ზურგზეც ატყვია.'],
  ['ტელეფონით', 'ჰიბრიდულ ვარიანტში (საგანძურის სკოლა → თამაშები → საგანძურის ძებნა → ჰიბრიდული) აპი თავად ქმნის ბარათებს QR კოდებით: გუნდი ბარათს ტელეფონით ასკანერებს, ყოველ გუნდს თავისი სიტყვა აქვს, მასწავლებლის ტელეფონი კი სკივრია და დროს ითვლის.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 8 წლიდან · 25–40 წუთი</div></div>
  <p class="lead">„საგანძურის ძებნა“ ეზოში თამაშდება: სადგურიდან სადგურამდე, დავალებიდან დავალებამდე — ყოველი სწორი პასუხი ასოა, ასოებიდან კი საგანძურის სიტყვა დგება. თამაშისას საქართველოს კუთხეებს, ისტორიას, ძველ დამწერლობასა და ქართულ კულტურას ეცნობით.</p>
  <div class="dz-flow box">${[['map-pinned', 'ბარათი'], ['brain', 'დავალება'], ['pencil-line', 'ასო'], ['footprints', 'შემდეგი'], ['key-round', 'სიტყვა → სკივრი']].map(([ic, t]) => `<div class="dz-flowS">${icon(ic, { size: 8, color: C.wine, width: 1.6 })}<span>${t}</span></div>`).join('<span class="dz-arr">→</span>')}</div>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="box dz-ex"><b>მაგალითი — ნაკრები ${EX.mark}, სადგური № ${EX_S + 1}:</b> ${esc(EX.tasks[EX_S].ask)} გუნდი პასუხობს „${esc(EX.tasks[EX_S].options[EX.tasks[EX_S].right])}“ — მის გვერდით ასოა „${EX.letters[EX_S]}“, ის ფურცლის № ${EX_S + 1} უჯრაში იწერება. ბარათის ქვემოთ წაიკითხავენ, სად ელით № ${((EX_S + 1) % STATIONS) + 1}.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// a card's task grows to fill its card, or shrinks until it fits (a long question); a card or a page too full stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.dz-in').forEach(el => {
    const over = () => el.scrollHeight > el.clientHeight + 1;
    let pt = 10, n = 0;
    while (!over() && pt < 11.6 && n++ < 20) { pt += 0.2; el.style.fontSize = pt + 'pt'; }
    while (over() && pt > 7.6 && n++ < 80) { pt -= 0.2; el.style.fontSize = pt + 'pt'; }
    if (over()) bad.push((el.querySelector('.dz-ask') || el).textContent.trim().slice(0, 40));
  });
  document.querySelectorAll('.dz-sin').forEach(el => { if (el.scrollHeight > el.clientHeight + 1) bad.push('a team sheet'); });
  document.querySelectorAll('.dz-keyWrap, .dz-arrWrap, .rulesWrap, .cover').forEach(el => {
    const foot = el.parentElement.querySelector('.foot');
    if (foot && el.getBoundingClientRect().bottom > foot.getBoundingClientRect().top + 0.5) bad.push('a page runs into its foot: ' + (el.querySelector('.rtitle, .gameTitle') || el).textContent.trim().slice(0, 30));
  });
  if (bad.length) throw new Error('sagandzuris-dzebna: too full — ' + bad.join(' · '));
})()`;

export const head = oldHead;
export const css = `${coverCss}${oldCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10.2pt;line-height:1.36}
.rulesP .rules li{margin-bottom:1mm}
.cover .lead{margin-bottom:4mm}
.dz-dot{display:inline-flex;align-items:center;justify-content:center;width:5mm;height:5mm;border-radius:50%;color:#fff;font-family:'SansKa',sans-serif;font-weight:800;font-size:8.4pt;line-height:1;flex:none}
.dz-dot.big{width:7mm;height:7mm;font-size:11pt}
.dz-dot.on{background:rgba(255,255,255,.22)!important;margin-right:1.4mm}
.dz-sets4{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:0 0 5mm}
.dz-set4{border:.35mm solid var(--t);border-radius:2.2mm;padding:2.4mm 2mm;display:flex;flex-direction:column;align-items:center;gap:1mm;text-align:center}
.dz-set4 .nm{color:var(--t);font-size:11pt}
.dz-set4 span{font-size:8.6pt;color:var(--muted)}
.dz-flow{display:flex;align-items:center;justify-content:space-between;gap:2mm;margin:0 0 3.4mm;padding:3mm 4mm}
.dz-flowS{display:flex;flex-direction:column;align-items:center;gap:1mm;text-align:center;font-size:9pt;font-weight:700;color:var(--brown);width:26mm}
.dz-arr{color:var(--gold2);font-size:15pt;font-weight:700}
.dz-ex{margin-top:2.6mm;font-size:9.8pt;line-height:1.36}

/* a station's card: 96×90 mm */
.dzCards .piece{overflow:hidden}
.dz-card{position:absolute;inset:1.2mm;background:var(--paper);border:.6mm solid var(--t);border-radius:3mm;overflow:hidden;font-family:'SansKa',sans-serif}
.dz-band{height:7.6mm;display:flex;align-items:center;justify-content:space-between;padding:0 3.4mm;background:var(--t);color:#fff;font-weight:700;font-size:8.6pt}
.dz-band span{display:flex;align-items:center}
.dz-in{position:absolute;left:3.8mm;right:3.8mm;top:9.6mm;bottom:9.4mm;display:flex;flex-direction:column;gap:1.6mm;overflow:hidden;font-size:10pt}
.dz-head{display:flex;align-items:center;gap:2.2mm}
.dz-num{flex:none;width:8.6mm;height:8.6mm;border-radius:50%;background:#c9a227;box-shadow:0 .6mm 0 #a3821b;color:#fff;font-size:1.45em;font-weight:800;display:flex;align-items:center;justify-content:center}
.dz-head div{display:flex;flex-direction:column;gap:.3mm;min-width:0}
.dz-head div b{font-family:'SerifKa',serif;font-size:1.12em;color:var(--brown);line-height:1.1}
.dz-head div span{display:flex;align-items:center;gap:1mm;font-size:.76em;font-weight:700;color:var(--t)}
.dz-ask{margin:0;font-size:1.02em;font-weight:700;line-height:1.3;color:var(--brown)}
.dz-stone{background:linear-gradient(160deg,#efe6d4,#e2d5bd);border:.3mm solid #d3c2a3;border-radius:2mm;padding:1mm 2mm .8mm;text-align:center;display:flex;flex-direction:column;align-items:center}
.dz-stone .old{font-size:2.3em;line-height:1.25;letter-spacing:.08em;color:#4a2a1e}
.dz-stone small{font-size:.66em;color:#8a7560}
.dz-mkey{display:flex;flex-wrap:wrap;gap:.6mm;justify-content:center}
.dz-mkey span{width:6.1mm;border:.2mm solid var(--line);border-radius:.8mm;background:#fff;display:flex;flex-direction:column;align-items:center;padding:.4mm 0 .5mm;gap:.2mm}
.dz-mkey b{font-size:1.25em;font-weight:400;line-height:1;color:#2f2018}
.dz-mkey i{font-style:normal;font-weight:700;font-size:.7em;line-height:1;color:var(--muted)}
.dz-opts{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;gap:1mm}
.dz-opts.two{grid-template-columns:1fr 1fr}
.dz-opts li{display:flex;align-items:center;gap:1.8mm;font-size:.95em;font-weight:700;line-height:1.22;border:.25mm solid var(--line);border-radius:1.6mm;padding:.9mm 1.6mm;background:#fff;color:var(--brown)}
.dz-opts b{flex:none;width:6.4mm;height:6.4mm;border-radius:1.4mm;background:var(--t);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.25em;font-family:'SerifKa',serif}
.dz-say{margin:auto 0 0;font-size:.74em;color:var(--muted);text-align:center}
.dz-foot{position:absolute;left:3.6mm;right:3.6mm;bottom:2.4mm;height:6mm;display:flex;align-items:center;gap:1.4mm;border-top:.3mm dashed var(--line);padding-top:1.2mm;font-size:8pt;font-weight:700;color:var(--t)}
.dz-foot span{white-space:nowrap}
.dz-foot i{flex:1;align-self:flex-end;border-bottom:.25mm solid #b9a37f;height:4mm}
.dz-back{position:absolute;inset:1.2mm;border-radius:3mm;overflow:hidden}
.dz-backIn{position:absolute;inset:3mm;border:.35mm solid rgba(255,255,255,.55);border-radius:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.6mm;color:#fff;text-align:center;padding:0 4mm;font-family:'SansKa',sans-serif}
.dz-backDisc{width:34mm;height:34mm;border-radius:50%;background:#fbf3e0;display:flex;align-items:center;justify-content:center}
.dz-backT{font-weight:800;font-size:12pt;letter-spacing:.03em}
.dz-backNo{font-weight:900;font-size:24pt;line-height:1}
.dz-backS{font-size:8.4pt;opacity:.92}

/* a team's sheet: 96×135 mm */
.dzSlips .piece{overflow:hidden}
.dz-slip{position:absolute;inset:1.2mm;background:#fff;border:.6mm solid var(--wine);border-radius:3mm;overflow:hidden;font-family:'SansKa',sans-serif}
.dz-sband{height:8.4mm;display:flex;align-items:center;gap:1.8mm;padding:0 3.6mm;background:var(--wine);color:#fff;font-weight:700;font-size:9.4pt}
.dz-sin{position:absolute;left:4mm;right:4mm;top:11mm;bottom:3.4mm;display:flex;flex-direction:column;gap:2.2mm;overflow:hidden}
.dz-field{display:flex;align-items:flex-end;gap:1.6mm;font-size:9pt;font-weight:700;color:var(--brown)}
.dz-field span{white-space:nowrap}
.dz-field i{flex:1;border-bottom:.25mm solid #b9a37f;height:5mm}
.dz-field i.short{flex:0 0 10mm}
.dz-sets{display:flex;align-items:center;gap:1.8mm;font-size:9pt;font-weight:700;color:var(--brown)}
.dz-sets small{margin-left:auto;font-size:7.6pt;color:var(--muted);font-weight:400}
.dz-lab{font-size:8pt;font-weight:700;color:var(--muted);margin-bottom:-1mm}
.dz-row{display:flex;gap:1.6mm}
.dz-cell{flex:1;display:flex;flex-direction:column;align-items:center;gap:.5mm}
.dz-cell small{font-size:7.4pt;font-weight:700;color:#8a6d12}
.dz-cell i{width:100%;height:11.5mm;border:.35mm solid #b9a37f;border-radius:1.4mm;background:#fff}
.dz-cell i.gold{background:#fbf0cf;border-color:#c9a227}
.dz-hints{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.8mm}
.dz-hints li{display:flex;align-items:center;gap:1.6mm;font-size:8.2pt;line-height:1.2;color:var(--brown)}
.dz-chestL{margin-top:auto;display:flex;align-items:center;gap:2mm;background:#faf1d9;border-radius:1.6mm;padding:1.2mm 2mm;font-size:8.4pt;font-weight:700;color:#6b4f12;line-height:1.25}
.dz-chestL svg{flex:none}
.dz-how{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2.4mm}
.dz-how li{display:flex;align-items:flex-start;gap:2mm;font-size:9.2pt;line-height:1.32;color:var(--brown)}
.dz-how li b{flex:none;width:5.4mm;height:5.4mm;border-radius:50%;background:#c9a227;color:#fff;font-size:8.6pt;display:flex;align-items:center;justify-content:center;margin-top:.2mm}
.dz-how li svg{flex:none}
.dz-howArt{margin-top:auto;display:flex;justify-content:center}

/* the teacher's key */
.dz-keyWrap{padding:9mm 11mm 0;font-family:'SansKa',sans-serif}
.dz-keyHead{display:flex;align-items:center;gap:2mm;border-bottom:.35mm solid var(--gold);padding-bottom:2mm;margin-bottom:3mm}
.dz-keyHead>div:first-child{margin-right:auto}
.dz-secret{font-size:9pt;font-weight:700;color:var(--wine)}
.dz-kh{margin-bottom:4mm}
.dz-khHead{display:flex;align-items:center;gap:2.4mm;border-left:1.4mm solid var(--t);padding:1mm 0 1mm 2.4mm;margin-bottom:1.6mm}
.dz-khHead>div:nth-child(2){display:flex;flex-direction:column;margin-right:auto}
.dz-khHead>div>b{font-size:12pt;color:var(--t)}
.dz-khHead span{font-size:8.6pt;color:var(--muted)}
.dz-khWord{text-align:right;display:flex;flex-direction:column}
.dz-khHead .dz-khWord small{font-size:7.6pt;color:var(--muted)}
.dz-khHead .dz-khWord b{font-family:'SerifKa',serif;font-size:17pt;letter-spacing:.08em;color:#8a6d12}
.dz-khLetters{display:flex;align-items:center;gap:1.2mm;font-size:8.4pt;color:var(--muted);margin-bottom:1.6mm}
.dz-khLetters b{display:flex;flex-direction:column;align-items:center;width:8mm;border:.25mm solid var(--line);border-radius:1mm;background:#fbf0cf;font-family:'SerifKa',serif;font-size:12pt;color:var(--brown);line-height:1.05;padding:.3mm 0}
.dz-khLetters b small{font-family:'SansKa',sans-serif;font-size:6.6pt;color:var(--muted);font-weight:700}
table.dz-kt{font-size:8.4pt;line-height:1.28}
table.dz-kt th{font-size:8pt}
table.dz-kt td.n{width:6mm;text-align:center;font-weight:700}
table.dz-kt td.a{width:44mm;font-weight:700;color:#2f7d4f}
table.dz-kt td.l{width:9mm;text-align:center;font-family:'SerifKa',serif;font-size:12pt;font-weight:700;color:var(--wine)}
table.dz-kt em{font-style:normal;font-weight:700;color:var(--t)}
.dz-kOld{font-size:11pt;letter-spacing:.04em}
.dz-starts{font-size:8.6pt;display:flex;flex-wrap:wrap;gap:1mm 4mm;align-items:baseline}
.dz-starts b{color:var(--wine)}
.dz-unchecked{margin:2.4mm 0 0;font-size:8.4pt;color:var(--muted)}

/* the chest's sign and arrivals */
.dz-sign{position:absolute;inset:14mm;border:1.2mm solid var(--wine);border-radius:6mm;background:var(--paper);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5mm;text-align:center;padding:0 16mm}
.dz-signAso{font-size:20pt;color:var(--gold2);letter-spacing:.12em}
.dz-signT{font-size:64pt;font-weight:800;color:var(--wine);line-height:1}
.dz-signL{font-family:'SansKa',sans-serif;font-size:24pt;font-weight:800;color:var(--brown)}
.dz-signS{font-family:'SansKa',sans-serif;font-size:13pt;line-height:1.45;color:var(--muted)}
.dz-arrWrap{padding:10mm 12mm 0;font-family:'SansKa',sans-serif}
.dz-arrTop{display:flex;align-items:center;gap:2mm;font-size:10pt;font-weight:700;margin:2mm 0 4mm}
.dz-arrTop i{flex:0 0 34mm;border-bottom:.25mm solid #b9a37f;height:5mm;margin-right:6mm}
table.dz-arr{font-size:10pt}
table.dz-arr td{height:19mm;vertical-align:middle}
table.dz-arr td.n{width:13mm;text-align:center;font-weight:800;font-size:14pt;color:var(--gold2)}
table.dz-arr td.c{width:26mm;font-size:9pt;color:var(--muted)}
.dz-arrNote{margin-top:5mm;font-size:10pt;line-height:1.4}
.dz-arrNote b{color:var(--wine)}
`;

const SHEETS = [{ key: 'cover' }, ...huntSheets, slipSheet, keySheet, chestSheet];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
