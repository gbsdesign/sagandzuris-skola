// „ქართული აკორდი“ on paper — the სამაგიდო variant of the app's chord game (2026-11-01): no phone, three singers (or a piano)
// sound a real chord of the app's chants and songs — first together, then voice by voice from the bass up — and the teams mark
// its kind on their sheet: 1-5-8, 1-3-5, 1-5-7… The chords are the app's own (data/chordPool.ts, made from the book notes),
// drawn by the app's own rules (utils/akordi.ts) with fixed seeds, never one twice in the kit. The kit: the chord guide for
// every team (all nine kinds; the plainest four, big, on its back), the host's four games of ten chords (two of the plainest
// four, two of all nine), the teams' answer sheets, a score sheet, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.mjs';
import { abcChords, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { appData } from '../appData.mjs';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.mjs';

const app = await appData({
  'data/chordPool.ts': ['CHORD_POOL'],
  'utils/akordi.ts': ['CHORD_KINDS', 'BASIC_KINDS', 'drawAkordiRounds', 'kindOfChord', 'chordKey'],
  'utils/pearls.ts': ['noteName'],
  'utils/otkheuli.ts': ['mulberry32'],
});
const { CHORD_POOL, CHORD_KINDS, BASIC_KINDS, drawAkordiRounds, kindOfChord, chordKey, noteName, mulberry32 } = app;

export const id = 'kartuli-akordi';
export const title = 'ქართული აკორდი';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი და სამი მომღერალი · 9 წლიდან · 10–20 წუთი';
const ROUNDS = 10;
/** the guide's chords, all on one bass: რე */
const BASS = 50;
const KIND = Object.fromEntries(CHORD_KINDS.map(k => [k.id, k]));
const isBasic = id => BASIC_KINDS.includes(id);
const GREEN = '#2f7d4f';
/** what the plainest four sound like, in two words, and how to tell them (the back of the guide) */
const WORD = { unison: 'ერთი ბგერა', fifth: 'ღია და მყარი', triad: 'სავსე და რბილი', seventh: 'დაძაბული' };
const LISTEN = {
  unison: 'ისმის ერთი ბგერა, თითქოს ერთი ადამიანი მღერის, ოღონდ უფრო ძლიერად. ხმა-ხმად რომ შემოდიან, ბგერა არ იცვლება.',
  fifth: 'ზედა და ქვედა ხმა ერთმანეთს ერწყმის — ოქტავაა, შუაში კვინტა. ტერცია არ ისმის.',
  triad: 'სამი სხვადასხვა ბგერა, ერთმანეთზე დაწყობილი. მაჟორული ნათლად ჟღერს, მინორული — სევდიანად.',
  seventh: 'ზედა ხმა ოქტავამდე ერთ ტონს აკლდება — ყური ელის, რომ ის ბოლომდე ავა.',
};

/** a chord's form where a kind has two: a major or minor triad, a big or small sixth */
const formOf = (kind, [, mid, bass]) => {
  const m = mid - bass;
  if (kind === 'triad') return m === 4 ? 'მაჟორული' : 'მინორული';
  if (kind === 'sixth') return m === 9 ? 'დიდი სექსტა' : 'პატარა სექსტა';
  return '';
};
/** the chord and then its voices from the bass up, as the singers sound it */
const chordAbc = ([top, mid, bass], marks = {}) => abcChords([[top, mid, bass], [bass], [mid], [top]], { marks });
const names = notes => [...notes].reverse().map(noteName).join(' · ');

// ---------- the four games: two of the plainest four kinds, two of all nine; the chords not used yet first, never one twice
// in a level's two games (the pool has only six different fifths, so a full game may bring back one of the first games') ----------
const seen = [];
const GAMES = [];
for (const [level, seed] of [['basic', 11], ['basic', 12], ['all', 13], ['all', 14]]) {
  const mine = new Set(GAMES.filter(g => g.level === level).flatMap(g => g.rounds.map(r => chordKey(r.k.id, r.notes))));
  let rounds = null;
  // the seed's first draw that brings back none of the level's other game (fixed: the kit is the same every build)
  for (let t = 0; t < 60 && !rounds; t++) {
    const got = drawAkordiRounds(CHORD_POOL, ROUNDS, level, seen, mulberry32(20261101 + seed + t * 1000));
    if (got.length === ROUNDS && got.every(r => !mine.has(chordKey(kindOfChord(r.notes), r.notes)))) rounds = got;
  }
  if (!rounds) throw new Error(`game ${GAMES.length + 1}: no draw without a repeat`);
  rounds.forEach(r => seen.push(chordKey(kindOfChord(r.notes), r.notes)));
  GAMES.push({ no: GAMES.length + 1, level, rounds: rounds.map((r, i) => ({ ...r, no: i + 1, k: KIND[kindOfChord(r.notes)] })) });
}

const chordRow = r => {
  const [top, mid, bass] = r.notes;
  const f = formOf(r.k.id, r.notes);
  return `<div class="ak-row">
  <span class="ak-no">${r.no}</span>
  ${staff(chordAbc(r.notes, { 1: '1', 2: '2' }), { cls: 'ak-st', zoom: 1.5 })}
  <div class="ak-info">
    <div class="ak-ans"><b>${r.k.steps}</b>${esc(r.k.name)}${f ? `<i>${f}</i>` : ''}</div>
    <div class="ak-notes">ბანი <b>${noteName(bass)}</b> · მოძახილი <b>${noteName(mid)}</b> · მთქმელი <b>${noteName(top)}</b></div>
    <div class="ak-src">„${esc(r.title)}“ · ${esc(r.ref)}</div>
  </div>
</div>`;
};

const gamePage = g => page(`<div class="ak-mHead"><span class="aso">${aso(title)}</span><b>თამაში ${g.no}</b><span class="ak-lv">${g.level === 'basic' ? 'საწყისი · ოთხი აკორდი' : 'ცხრავე აკორდი'}</span><span class="ak-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} წამყვანისა და მომღერლებისთვის</span></div>
<div class="ak-rows">${g.rounds.map(chordRow).join('')}</div>
<div class="ak-legend"><b>1</b> — სამივე ხმა ერთად, სამ წამს. <b>2</b> — ხმა-ხმად: ბანი, წამის მერე მოძახილი, კიდევ წამის მერე მთქმელი, და სამივე ერთად წყვეტს. ნოტები წიგნის სიმაღლეზეა — შეგიძლიათ სამივემ დაბლა ან მაღლა იმღეროთ: აკორდის სახეს ხმებს შორის მანძილი ქმნის. 8 გასაღების ქვეშ — ოქტავით დაბლა.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · თამაში ${g.no}, წამყვანისთვის</div>`, 'ak-mP');

// ---------- the guide: every team's, all nine on the front, the plainest four on the back ----------
const guideChord = at => [BASS + at[1], BASS + at[0], BASS];
/** a kind's pieces to name, songs first (the pool lists them first), no piece twice on a page */
const examples = (ids, count) => {
  const taken = new Set();
  return Object.fromEntries(ids.map(id => {
    const out = CHORD_POOL.filter(s => s[0] === id && !taken.has(s[4])).filter((s, i, all) => all.findIndex(x => x[4] === s[4]) === i).slice(0, count);
    out.forEach(s => taken.add(s[4]));
    return [id, out];
  }));
};
const EX_ALL = examples(CHORD_KINDS.map(k => k.id), 1);
const EX_BASIC = examples(BASIC_KINDS, 3);
const formsLine = k => k.at.map(at => {
  const n = guideChord(at);
  const f = formOf(k.id, n);
  return `<b>${names(n)}</b>${f ? ` (${f})` : ''}`;
}).join('<br>ან: ');

const guideCard = k => {
  const [ex] = EX_ALL[k.id];
  return `<div class="ak-g${isBasic(k.id) ? ' basic' : ''}">
  <div class="ak-gHead"><b>${k.steps}</b>${isBasic(k.id) ? '<span class="ak-tag">საწყისი</span>' : ''}</div>
  <div class="ak-gName">${esc(k.name)}</div>
  ${staff(chordAbc(guideChord(k.at[0])), { cls: 'ak-gSt', zoom: 1.3 })}
  <div class="ak-gNotes">რეზე: ${formsLine(k)}</div>
  <p class="ak-gHint">${esc(k.hint)}</p>
  ${ex ? `<div class="ak-gEx">გვხვდება: „${esc(ex[4])}“</div>` : ''}
</div>`;
};
const bigCard = k => `<div class="ak-big">
  <div class="ak-bWord">${WORD[k.id]}</div>
  <div class="ak-bHead"><b>${k.steps}</b><span>${esc(k.name)}</span></div>
  ${staff(chordAbc(guideChord(k.at[0])), { cls: 'ak-bSt', zoom: 1.1 })}
  <div class="ak-gNotes">რეზე: ${formsLine(k)}</div>
  <p class="ak-bHint">${esc(k.hint)}</p>
  <div class="ak-listen">${icon('ear', { size: 5, color: C.wine, width: 1.9 })}<span><b>როგორ იცნო:</b> ${LISTEN[k.id]}</span></div>
  <div class="ak-bEx"><b>გვხვდება:</b>${EX_BASIC[k.id].map(s => `<span>„${esc(s[4])}“ · ${esc(s[5])}</span>`).join('')}</div>
</div>`;
const GUIDE_HELP = 'ციფრები ბანიდან ითვლის: <b>1</b> — ბანი, მეორე ციფრი — მოძახილი, მესამე — მთქმელი. „1-5-8“: მოძახილი ბანზე ხუთი საფეხურით მაღლაა (კვინტა), მთქმელი — რვით (ოქტავა). აქ ყველა აკორდი რეზეა, ჯერ ერთად, მერე ხმა-ხმად.';
const guideFront = page(`<div class="ak-mHead"><span class="aso">${aso(title)}</span><b>აკორდების ცნობარი</b><span class="ak-lv">ცხრავე · თამაში 3 და 4</span><span class="ak-secret ak-open">${icon('users', { size: 4.2, color: C.wine, width: 2 })} თითო გუნდს</span></div>
<p class="ak-help">${GUIDE_HELP}</p>
<div class="ak-gs">${CHORD_KINDS.map(guideCard).join('')}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · აკორდების ცნობარი</div>`, 'ak-gP');
const guideBack = page(`<div class="ak-mHead"><span class="aso">${aso(title)}</span><b>საწყისი ოთხი</b><span class="ak-lv">თამაში 1 და 2</span><span class="ak-secret ak-open">${icon('users', { size: 4.2, color: C.wine, width: 2 })} თითო გუნდს</span></div>
<p class="ak-help">პირველ ორ თამაშში მხოლოდ ეს ოთხი აკორდი ჟღერს. მოუსმინე, რას ჰგავს: ერთ ბგერას, ღია „ცარიელ“ ხმას, სავსე და რბილს თუ დაძაბულს, რომელიც სადღაც მიდის.</p>
<div class="ak-bigs">${BASIC_KINDS.map(id => bigCard(KIND[id])).join('')}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · საწყისი ოთხი აკორდი</div>`, 'ak-gP');

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="hg-team">
  <div class="hg-tHead"><span class="aso">${aso(title)}</span><span class="ak-tGame">თამაში <i></i></span><span class="hg-tName">გუნდი <i></i></span></div>
  <p class="hg-tHint">როცა მიხვდებით, აკორდის სვეტში დასვით ✕ და შემოხაზეთ ნაბიჯი: 1 — ერთად, 2 — ხმა-ხმად. მერე ვეღარ შეცვლით. 1-ელ და მე-2 თამაშში მხოლოდ ოთხი ფერადი სვეტია.</p>
  <table class="hg-tab ak-tab">
    <tr><th class="r">რაუნდი</th><th class="s">ნაბიჯი</th>${CHORD_KINDS.map(k => `<th class="k${isBasic(k.id) ? ' b' : ''}">${k.steps}</th>`).join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="s"><span>1</span><span>2</span></td>${CHORD_KINDS.map(k => `<td class="k${isBasic(k.id) ? ' b' : ''}"></td>`).join('')}</tr>`).join('')}
  </table>
  <div class="ak-key">${CHORD_KINDS.map(k => `<span><b>${k.steps}</b> ${esc(k.name)}</span>`).join('')}</div>
</div>`;
const teamPage = page(`${teamHalf}<div class="hg-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'hg-tP');

// ---------- the score sheet ----------
const scorePage = scoreSheet({
  title, rows: ROUNDS,
  hint: 'გუნდის სახელი სვეტის თავში. სწორ აკორდს — იმდენი ქულა, რომელ ნაბიჯზეც შემოხაზეს: 1 (ერთად) → 2, 2 (ხმა-ხმად) → 1.',
  remind: [
    ['audio-lines', 'ნაბიჯი 1', 'სამივე ხმა ერთად, სამ წამს.'],
    ['arrow-up-narrow-wide', 'ნაბიჯი 2', 'ბანი, მერე მოძახილი, მერე მთქმელი — ერთად წყვეტენ.'],
    ['check', 'ქულა', 'ერთად → 2, ხმა-ხმად → 1; შეცდომა — 0.', GREEN],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — ცნობარის ერთი აკორდი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const SONG_CHORDS = GAMES.flatMap(g => g.rounds).filter(r => r.ref.startsWith('ხალხური')).length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">სამი მომღერალი ერთ აკორდს იღებს — ჯერ ერთად, მერე ხმა-ხმად, ბანიდან ზემოთ — და გუნდები ცდილობენ, იცნონ, როგორია: 1-5-8, 1-3-5, 1-5-7… ყოველი აკორდი ნამდვილია: ცნობილ საგალობელში ან ხალხურ სიმღერაში სამივე ხმა სადღაც ზუსტად ასე ჟღერს. ტელეფონი არ სჭირდება; ფორტეპიანოც გამოდგება.<br><b>${META}</b></div>
  <div class="ak-ex box">
    <div class="ak-exCard">${guideCard(KIND.fifth)}</div>
    <div class="ak-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ამბობს რაუნდს; მომღერლები თავიანთ ნოტს ჩუმად პოულობენ.')}
      ${step('audio-lines', '<b>1.</b> სამივე ხმა ერთად, სამ წამს. ვინც მიხვდა, აკორდის სვეტში ✕-ს სვამს და 1-ს შემოხაზავს.')}
      ${step('arrow-up-narrow-wide', '<b>2.</b> ხმა-ხმად: ბანი, მოძახილი, მთქმელი — ერთად წყვეტენ. დანარჩენები 2-ს შემოხაზავენ.')}
      ${step('key-round', 'წამყვანი ამბობს აკორდს და საიდანაა: ერთად — 2 ქულა, ხმა-ხმად — 1.', GREEN)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>აკორდების ცნობარი (ზურგზე — საწყისი ოთხი)</td><td>თითო გუნდს</td><td>${no('guide')}</td></tr>
        <tr><td>წამყვანის თამაშები, თითოში ${ROUNDS} აკორდი</td><td>4</td><td>${no('g1')}–${no('g2')}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="ak-mix">${seen.length} აკორდი — ${seen.length - SONG_CHORDS} საგალობლიდან და ${SONG_CHORDS} ხალხური სიმღერიდან, იგივე, რაც აპის თამაშში ჟღერს.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ცნობარი (${no('guide')}) — თითო გუნდს; თამაშები (${no('g1')}–${no('g2')}) — წამყვანს და მომღერლებს, გუნდებს არ აჩვენოთ.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — რამდენიც გუნდია, შუაზე გაჭრილი; ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია სმენის ვარჯიშის თამაშების (მაგ. „Perfect Ear“) იდეით. აკორდები საგანძურის სკოლის აპის წიგნების ნოტებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', `2–6 გუნდი, თითოში 2–6 მოთამაშე; თითოს ფანქარი, გუნდის ფურცელი და ცნობარი. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. ცალკე — სამი მომღერალი: მთქმელი (ზედა ხმა), მოძახილი (შუა) და ბანი, ან ფორტეპიანო.`],
  ['წამყვანი', 'მასწავლებელი ან ის, ვინც ნოტს კითხულობს; ხშირად ერთ-ერთი მომღერალია. თამაშების ფურცლები მასთანაა: ხედავს პასუხს და ქულებს წერს.'],
  ['ჯერ ისწავლეთ', 'სანამ დაიწყებთ, მომღერლები ცნობარის ყოველ აკორდს ერთხელ იღებენ — ერთად, მერე ხმა-ხმად; გუნდები ცნობარს ადევნებენ თვალს.'],
  ['თამაში', `1-ელ და მე-2 თამაშში მხოლოდ საწყისი ოთხი აკორდია (1-1-1, 1-5-8, 1-3-5, 1-5-7), მე-3 და მე-4-ში — ცხრავე. თითოში ${ROUNDS} რაუნდია, დაახლოებით 15 წუთი.`],
  ['ნაბიჯი 1', 'სამივე ხმა ერთად, ერთ ხმოვანზე („ა“), სამ წამს. გუნდები ჩუმად თათბირობენ; ვინც მიხვდა, აკორდის სვეტში ✕-ს სვამს და 1-ს შემოხაზავს. მერე ვეღარ შეცვლის.'],
  ['ნაბიჯი 2', 'ხმა-ხმად: ჯერ ბანი, წამის მერე მოძახილი, კიდევ წამის მერე მთქმელი; სამივე ერთად წყვეტს. ვინც ახლა მიხვდა, 2-ს შემოხაზავს.'],
  ['ნოტის პოვნა', 'ნოტები წიგნის სიმაღლეზეა. შეგიძლიათ სამივემ დაბლა ან მაღლა იმღეროთ: აკორდის სახეს ხმებს შორის მანძილი ქმნის, არა სიმაღლე. ფორტეპიანოზე — იგივე: ჯერ ერთად, მერე ბანიდან ზემოთ.'],
  ['გახსნა', 'წამყვანი ამბობს აკორდს და საიდანაა — საგალობლის ან სიმღერის სახელს. სურვილისამებრ მომღერლები აკორდს კიდევ ერთხელ იღებენ.'],
  ['ქულა', 'ნაბიჯი 1 → 2 ქულა, ნაბიჯი 2 → 1, შეცდომა — 0.'],
  ['მოგება', 'ბოლო რაუნდის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — ცნობარის ერთი აკორდი, წამყვანის არჩევით.'],
  ['უფრო რთულად', 'უფროსებთან — მხოლოდ ნაბიჯი 1, ან ცხრავე აკორდი პირველივე თამაშიდან.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ქართული აკორდი“ სმენის თამაშია: ქართულ მრავალხმიანობაში სამი ხმა ერთმანეთს თავისებურად ეწყობა — ღიად, სავსედ, დაძაბულად. ვინც ამას ყურით ცნობს, უკეთ გალობს და უკეთ უსმენს მეზობელ ხმას.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: აკორდს სინთეზატორი უკრავს და ოთხი პასუხიდან ირჩევ; ონლაინ, ან ერთი ტელეფონით, გუნდებად — sagandzureli.ge → თამაშები → ქართული აკორდი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.2);

export const css = `${coverCss}${musicCss}${partsCss}
.ak-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.ak-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.ak-mHead b{font-size:13pt;color:var(--wine);white-space:nowrap}
.ak-lv{font-size:10pt;color:var(--brown);white-space:nowrap}
.ak-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700;white-space:nowrap}
.ak-rows{position:absolute;left:10mm;right:10mm;top:19mm;bottom:25mm;display:grid;grid-template-rows:repeat(${ROUNDS},1fr);gap:2mm}
.ak-row{display:grid;grid-template-columns:8mm 62mm 1fr;gap:4mm;align-items:center;border:.3mm solid var(--line);border-radius:2mm;padding:0 3mm;background:#fff;overflow:hidden}
.ak-no{width:8mm;height:8mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.ak-info{min-width:0;line-height:1.25}
.ak-ans{font-size:11pt;color:${GREEN};font-weight:700;display:flex;align-items:baseline;gap:2mm;flex-wrap:wrap}
.ak-ans b{font-size:12pt;font-family:'SansKa',sans-serif;font-weight:900}
.ak-ans i{font-style:normal;font-weight:400;font-size:9.5pt;color:var(--brown)}
.ak-notes{font-size:9.5pt;color:var(--brown);margin-top:.6mm}
.ak-notes b{color:var(--wine)}
.ak-src{font-size:9pt;color:var(--muted);margin-top:.5mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ak-legend{position:absolute;left:10mm;right:10mm;bottom:8mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.ak-legend b{color:var(--wine)}
.ak-help{position:absolute;left:10mm;right:10mm;top:18mm;margin:0;font-size:10pt;line-height:1.35;color:var(--brown)}
.ak-help b{color:var(--wine)}
.ak-gs{position:absolute;left:10mm;right:10mm;top:33mm;bottom:10mm;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:3.5mm}
.ak-g{border:.3mm solid var(--line);border-radius:2.4mm;padding:3mm 3.4mm 2.6mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.ak-g.basic{border-color:var(--gold);background:var(--paper)}
.ak-gHead{display:flex;align-items:center;gap:2mm}
.ak-gHead b{font-family:'SansKa',sans-serif;font-weight:900;font-size:19pt;color:var(--wine);line-height:1}
.ak-tag{margin-left:auto;font-size:8.5pt;font-weight:700;color:var(--gold2);border:.3mm solid var(--gold);border-radius:3mm;padding:.4mm 2mm}
.ak-gName{font-size:11pt;font-weight:700;color:var(--brown);margin:1mm 0 .6mm}
.ak-gSt{margin:.6mm 0}
.ak-gNotes{font-size:9pt;line-height:1.3;color:var(--brown)}
.ak-gNotes b{color:var(--wine)}
.ak-gHint{margin:1.4mm 0 0;font-size:9pt;line-height:1.3;color:var(--brown)}
.ak-gEx{margin-top:auto;padding-top:1.2mm;font-size:8.6pt;line-height:1.25;color:var(--muted);border-top:.2mm dotted var(--line)}
.ak-bigs{position:absolute;left:10mm;right:10mm;top:33mm;bottom:10mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:5mm}
.ak-big{border:.5mm solid var(--gold);border-radius:3mm;padding:4mm 5.5mm 3.4mm;background:var(--paper);display:flex;flex-direction:column;overflow:hidden}
.ak-bWord{font-size:19pt;font-weight:800;color:var(--wine);line-height:1.1}
.ak-bHead{display:flex;align-items:baseline;gap:2.4mm;margin:1.4mm 0 2mm}
.ak-bHead b{font-family:'SansKa',sans-serif;font-weight:900;font-size:15pt;color:var(--gold2)}
.ak-bHead span{font-size:11pt;font-weight:700;color:var(--brown)}
.ak-bSt{margin:.6mm 0 1.4mm}
.ak-big .ak-gNotes{font-size:10pt}
.ak-bHint{margin:1.6mm 0 0;font-size:9.6pt;line-height:1.35;color:var(--brown)}
.ak-listen{display:flex;gap:2mm;align-items:flex-start;margin-top:2mm;padding:1.8mm 2.4mm;border-radius:2mm;background:#fff;border:.25mm solid var(--line);font-size:9.6pt;line-height:1.33}
.ak-listen svg{flex:none;margin-top:.3mm}
.ak-listen b{color:var(--wine)}
.ak-bEx{margin-top:auto;padding-top:2mm;border-top:.2mm dotted var(--line);display:flex;flex-direction:column;gap:.5mm;font-size:9pt;line-height:1.25;color:var(--muted)}
.ak-bEx b{color:var(--brown);font-weight:700}
.ak-tGame{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);white-space:nowrap}
.ak-tGame i{display:inline-block;width:10mm;border-bottom:.3mm solid #bba98f}
.hg-team{height:148.5mm;padding:8mm 12mm 4mm;position:relative}
.hg-cut{position:absolute;left:6mm;right:6mm;top:148.5mm;border-top:.3mm dashed #b3a593}
.hg-tHead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm}
.hg-tHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.hg-tName{flex:1;display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine)}
.hg-tName i{flex:1;border-bottom:.3mm solid #bba98f}
.hg-tHint{margin:1.8mm 0 2.2mm;font-size:9.5pt;line-height:1.3}
table.hg-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.hg-tab th,.hg-tab td{border:.25mm solid #bba98f;padding:0 1mm}
.hg-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:7mm;text-align:center}
.hg-tab td{height:8.6mm}
.hg-tab .r{width:16.5mm;text-align:center}
.hg-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.hg-tab .s{width:17mm;text-align:center}
.hg-tab td.s{white-space:nowrap}
.hg-tab td.s span{display:inline-flex;width:6mm;height:6mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .35mm}
.ak-tab th.k{font-family:'SansKa',sans-serif;font-weight:900;font-size:9.5pt;letter-spacing:-.02em}
.ak-tab th.b{background:#f0d9a0}
.ak-tab td.b{background:#fbf3df}
.ak-key{display:flex;flex-wrap:wrap;gap:.6mm 3.6mm;margin-top:2mm;font-size:8.6pt;line-height:1.3;color:var(--brown)}
.ak-key b{color:var(--wine);font-family:'SansKa',sans-serif;font-weight:900}
.ak-ex{display:grid;grid-template-columns:66mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.ak-exCard .ak-gEx{margin-top:2mm}
.ak-exR h3{margin:0 0 3mm}
.ak-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'guide', front: guideFront, back: guideBack },
  { key: 'g1', front: gamePage(GAMES[0]), back: gamePage(GAMES[1]) },
  { key: 'g2', front: gamePage(GAMES[2]), back: gamePage(GAMES[3]) },
  { key: 'teams', front: teamPage, back: teamPage },
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
