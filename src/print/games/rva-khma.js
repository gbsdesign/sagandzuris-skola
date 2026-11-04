// „რვა ხმა“ on paper — the სამაგიდო variant of the app's tone game (2026-11-01): no phone, the teacher chants a heirmos of
// vol. VIII („რვახმა საცისკრო ძლისპირები“) from its book notes — its first phrase, then more — and the teams mark its tone
// of the eight. The kit: the eight tones' models (two heirmoi a tone, their first phrase on a staff — a sheet a child or a
// team, to learn before and to compare after), the teacher's list of 24 more (three a tone, two games of twelve, the tones
// spread by the app's own rules), the teams' answer sheets, a score sheet, the rules. The heirmoi are the app's game's
// (data/rvakhmaPool.ts — without those whose opening another tone shares).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { abcOf, lineOf, loadScore, openingOf, staff, musicHead, musicScript, musicCss } from '../music.js';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.js';
import * as __d0 from '../../data/rvakhmaPool';
import * as __d1 from '../../utils/rvakhma';
import * as __d2 from '../../utils/otkheuli';

const app = ({ ...__d0, ...__d1, ...__d2 });
const { HEIRMOI, TONE_LETTERS, toneName, drawRvakhmaRounds, mulberry32 } = app;

export const id = 'rva-khma';
export const title = 'რვა ხმა';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი · 10 წლიდან · 15–25 წუთი';
const ROUNDS = 12;
const PER_PAGE = 6;
const GREEN = '#2f7d4f';
/** the top voice of a men's choir, as the book writes it: an octave below the treble clef, on every staff of the kit */
const CLEF = 'treble-8';
const ORDINAL = ['პირველი', 'მეორე', 'მესამე', 'მეოთხე', 'მეხუთე', 'მეექვსე', 'მეშვიდე', 'მერვე'];

/** a heirmos's top voice: its first phrase, and the phrase after it */
const phrasesOf = num => {
  const line = lineOf(loadScore('v8', num), 0);
  const one = openingOf(line, { min: 6, max: 14 }).notes;
  const two = openingOf(line.slice(one.length), { min: 6, max: 14 }).notes;
  return { one, two };
};

// ---------- the models: each tone's first two heirmoi, their first phrase ----------
const MODELS = TONE_LETTERS.map((_, t) => HEIRMOI.filter(h => h.tone === t).sort((a, b) => a.num - b.num).slice(0, 2)
  .map(h => ({ ...h, abc: abcOf(phrasesOf(h.num).one, { clef: CLEF }) })));
const modelNums = new Set(MODELS.flat().map(h => h.num));

// ---------- the teacher's list: 24 more, three a tone, in the app's spread (never one tone twice running) ----------
const LIST = drawRvakhmaRounds(HEIRMOI.filter(h => !modelNums.has(h.num)), ROUNDS * 2, [], mulberry32(20261108)).map((r, i) => {
  const { one, two } = phrasesOf(r.num);
  return { ...r, no: i + 1, abc: abcOf([...one, ...two], { clef: CLEF, marks: { [one.length]: '1', [one.length + two.length]: '2' } }) };
});
if (LIST.length !== ROUNDS * 2 || new Set(LIST.map(h => h.num)).size !== LIST.length) throw new Error('the list is short');
for (let t = 0; t < 8; t++) if (LIST.filter(h => h.right === t).length !== 3) throw new Error(`tone ${t + 1}: not three`);
const LIST_PAGES = Math.ceil(LIST.length / PER_PAGE);

const toneMark = t => `<span class="rk-tone"><b>${TONE_LETTERS[t]}</b><i>${t + 1}</i></span>`;

const modelBox = (h, cls = '') => `<div class="rk-m ${cls}">
  <div class="rk-mT"><b>„${esc(h.words)}“</b><span>${esc(h.name)} · გვ. ${h.page}</span></div>
  ${staff(h.abc)}
</div>`;
const toneBox = (t, count = 2) => `<div class="rk-tb">
  <div class="rk-tbHead">${toneMark(t)}<div><b>${toneName(t)}</b><span>${ORDINAL[t]} ხმა</span></div></div>
  <div class="rk-ms${count === 1 ? ' one' : ''}">${MODELS[t].slice(0, count).map(h => modelBox(h)).join('')}</div>
</div>`;
const modelsPage = (from, side) => page(`<div class="rk-mHead"><span class="aso">${aso(title)}</span><b>რვა ხმის ნიმუშები</b><span class="rk-lv">${side}</span><span class="rk-secret rk-open">${icon('users', { size: 4.2, color: C.wine, width: 2 })} თითო ბავშვს ან გუნდს</span></div>
<p class="rk-help">ყოველ ხმას ორი ნიმუში აქვს — ორი ძლისპირის პირველი ფრაზა, მთქმელის ხმა. ისწავლეთ თამაშამდე: მასწავლებელი გალობს, თქვენ ნოტებს ადევნებთ თვალს, მერე ერთად იმღერეთ. თამაშში ეს ნიმუშები არ შეგხვდებათ — სხვა ძლისპირები იგივე ხმებზე.</p>
<div class="rk-tbs">${[0, 1, 2, 3].map(i => toneBox(from + i)).join('')}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · რვა ხმის ნიმუშები</div>`, 'rk-mP');

// ---------- the teacher's list ----------
const listBox = h => `<div class="rk-h">
  <div class="rk-hHead"><span class="rk-no">${h.no}</span><div class="rk-hT"><b>„${esc(h.words)}“</b><span>${esc(h.name)} · VIII ტომი, გვ. ${h.page}</span></div>
    <div class="rk-ans">${toneName(h.right)} <b>${h.right + 1}</b></div></div>
  ${staff(h.abc)}
</div>`;
const listPage = p => {
  const game = p < LIST_PAGES / 2 ? 1 : 2;
  const from = p * PER_PAGE + 1, to = Math.min(LIST.length, (p + 1) * PER_PAGE);
  return page(`<div class="rk-mHead"><span class="aso">${aso(title)}</span><b>თამაში ${game}</b><span class="rk-lv">ძლისპირები ${from}–${to}</span><span class="rk-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} მასწავლებლისთვის — გუნდებს არ აჩვენო</span></div>
<div class="rk-hs">${LIST.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(listBox).join('')}</div>
<div class="rk-legend">მთქმელის ხმა. ნოტების თავზე <b>1</b> — პირველი ფრაზის ბოლო (ნაბიჯი 1), <b>2</b> — მეორისა (ნაბიჯი 2, ისევ თავიდან). იგალობეთ „ა“-ზე ან „ლა“-ზე, სიტყვების გარეშე. სამ ხმაზე — წიგნიდან, მითითებულ გვერდზე. 8 გასაღების ქვეშ — ოქტავით დაბლა.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · მასწავლებლის სია, თამაში ${game}</div>`, 'rk-lP');
};

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="hg-team">
  <div class="hg-tHead"><span class="aso">${aso(title)}</span><span class="ak-tGame">თამაში <i></i></span><span class="hg-tName">გუნდი <i></i></span></div>
  <p class="hg-tHint">როცა მიხვდებით, ხმის სვეტში დასვით ✕ და შემოხაზეთ ნაბიჯი: 1 — პირველ ფრაზაზე, 2 — მეტით. მერე ვეღარ შეცვლით.</p>
  <table class="hg-tab rk-tab">
    <tr><th class="r">რაუნდი</th><th class="s">ნაბიჯი</th>${TONE_LETTERS.map((l, t) => `<th class="k">${l}<i>${t + 1}</i></th>`).join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="s"><span>1</span><span>2</span></td>${TONE_LETTERS.map(() => '<td></td>').join('')}</tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="hg-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'hg-tP');

// ---------- the score sheet ----------
const scorePage = scoreSheet({
  title, rows: ROUNDS,
  hint: 'გუნდის სახელი სვეტის თავში. სწორ ხმას — იმდენი ქულა, რომელ ნაბიჯზეც შემოხაზეს: 1 (პირველ ფრაზაზე) → 2, 2 (მეტით) → 1.',
  remind: [
    ['music', 'ნაბიჯი 1', 'პირველი ფრაზა — 1 ნიშნამდე.'],
    ['audio-lines', 'ნაბიჯი 2', 'თავიდან, 2 ნიშნამდე.'],
    ['check', 'ქულა', 'პირველ ფრაზაზე → 2, მეტით → 1; შეცდომა — 0.', GREEN],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — ერთი ნიმუში, ხმა რომელია?', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ქართულ გალობაში ძლისპირები, დასდებლები და ბევრი სხვა საგალობელი რვა ხმიდან ერთზეა, და ყოველი ხმა თავისებურად ჟღერს. მასწავლებელი ძლისპირის დასაწყისს გალობს — ჯერ პირველ ფრაზას, მერე მეტს — და გუნდები ცდილობენ, იცნონ, რომელ ხმაზეა. ძლისპირები VIII ტომიდანაა, „რვახმა საცისკრო ძლისპირები“. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="rk-ex box">
    <div class="rk-exTone">${toneBox(0, 1)}</div>
    <div class="rk-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'მასწავლებელი ამბობს რაუნდს და გალობს პირველ ფრაზას — 1 ნიშნამდე.')}
      ${step('users', 'გუნდები ჩუმად თათბირობენ; ვინც მიხვდა, ხმის სვეტში ✕-ს სვამს და 1-ს შემოხაზავს.')}
      ${step('music', 'თავიდან, 2 ნიშნამდე; დანარჩენები 2-ს შემოხაზავენ.')}
      ${step('key-round', 'მასწავლებელი ამბობს ხმას და, თუ გინდათ, მის ნიმუშს გალობს შესადარებლად: პირველ ფრაზაზე — 2 ქულა, მეტით — 1.', GREEN)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>რვა ხმის ნიმუშები, ორ-ორი ძლისპირი</td><td>თითო ბავშვს ან გუნდს</td><td>${no('models')}</td></tr>
        <tr><td>მასწავლებლის სია: ორი თამაში, ${LIST.length} ძლისპირი</td><td>1</td><td>${no('list1')}–${no('list2')}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="rk-mix">რვავე ხმა: ${MODELS.flat().length} ნიმუში და ${LIST.length} ძლისპირი თამაშისთვის, თითო ხმაზე სამი — იგივე წიგნიდან, რასაც აპის თამაში უკრავს.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ნიმუშები (${no('models')}) — თითო ბავშვს ან გუნდს; მასწავლებლის სია (${no('list1')}–${no('list2')}) — მასწავლებელს, გუნდებს არ აჩვენოთ.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — რამდენიც გუნდია, შუაზე გაჭრილი; ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია სმენის ვარჯიშის თამაშების (მაგ. „Functional Ear Trainer“) იდეით. ნოტები საგანძურის სკოლის აპის წიგნიდანაა: „რვახმა საცისკრო ძლისპირები“, VIII ტომი (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', `2–6 გუნდი, თითოში 2–6 მოთამაშე (ან თითოეული ცალკე); თითოს ფანქარი, გუნდის ფურცელი და ნიმუშების ფურცელი. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი.`],
  ['მასწავლებელი', 'გალობს ნოტებით და არ თამაშობს. სია მასთანაა: ხედავს ხმას და ქულებს წერს. ორი მომღერალიც თუ ჰყავს, ძლისპირი სამ ხმაზე შეუძლიათ — წიგნიდან, სიაში მითითებულ გვერდზე.'],
  ['ჯერ ისწავლეთ', 'მასწავლებელი რვავე ხმის ნიმუშებს გალობს, ბავშვები ფურცელზე ნოტებს ადევნებენ თვალს და მერე თვითონაც მღერიან. ერთი დღე — ერთი-ორი ხმა, თუ ბავშვები პატარები არიან.'],
  ['თამაში', `სიაში ${LIST.length} ძლისპირია: №1–${ROUNDS} — თამაში 1, №${ROUNDS + 1}–${LIST.length} — თამაში 2. ხმები არეულია, ერთი ხმა ზედიზედ არასდროს მეორდება.`],
  ['ნაბიჯი 1', 'პირველი ფრაზა — ნოტების თავზე 1 ნიშნამდე. „ა“-ზე ან „ლა“-ზე, სიტყვების გარეშე: ვინც ძლისპირს იცნობს, სიტყვით მიხვდებოდა.'],
  ['პასუხი', 'გუნდი, რომელიც მიხვდა, ხმის სვეტში ✕-ს სვამს და 1-ს შემოხაზავს. მერე ვეღარ შეცვლის. ვინც ვერ მიხვდა, ელოდება.'],
  ['ნაბიჯი 2', 'თავიდან, 2 ნიშნამდე — ორი ფრაზა. ვინც ახლა მიხვდა, 2-ს შემოხაზავს.'],
  ['გახსნა', 'მასწავლებელი ამბობს ხმას. თუ გინდათ, ამ ხმის ნიმუშს გალობს — შეადარეთ, რა ჰქონდათ საერთო.'],
  ['ქულა', 'ნაბიჯი 1 → 2 ქულა, ნაბიჯი 2 → 1, შეცდომა — 0.'],
  ['მოგება', 'ბოლო რაუნდის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — მასწავლებელი ნიმუშს გალობს, ვინ იცნობს ხმას პირველი.'],
  ['უფრო მარტივად', 'ჯერ ოთხი ხმით (ა–დ): მასწავლებელი სიიდან მხოლოდ მათ ირჩევს, გუნდებს ნიმუშების ფურცლის წინა მხარე ეყოფათ. მერე — ე–ჱ, ბოლოს რვავე.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„რვა ხმა“ სმენის თამაშია: გაიგებ, რომელ ხმაზეა ძლისპირი, თუ მისი დასაწყისი გესმის? ვინც ხმებს ცნობს, საგალობელს უფრო ადვილად სწავლობს და ახალს უფრო მალე იმახსოვრებს.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ძლისპირს სინთეზატორი სამ ხმაზე უკრავს, რვა ღილაკიდან ირჩევ და შეცდომისას ამ ხმის ნიმუშს ადარებ; ონლაინ, ან ერთი ტელეფონით, გუნდებად — sagandzureli.ge → თამაშები → რვა ხმა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.15);

export const css = `${coverCss}${musicCss}${partsCss}
.rk-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.rk-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.rk-mHead b{font-size:13pt;color:var(--wine);white-space:nowrap}
.rk-lv{font-size:10pt;color:var(--brown);white-space:nowrap}
.rk-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700;white-space:nowrap}
.rk-help{position:absolute;left:10mm;right:10mm;top:18mm;margin:0;font-size:10pt;line-height:1.35;color:var(--brown)}
.rk-tbs{position:absolute;left:10mm;right:10mm;top:33mm;bottom:10mm;display:grid;grid-template-rows:repeat(4,1fr);gap:4mm}
.rk-tb{border:.4mm solid var(--gold);border-radius:2.6mm;background:var(--paper);padding:3mm 4mm;display:flex;flex-direction:column;overflow:hidden}
.rk-tbHead{display:flex;align-items:center;gap:3mm;margin-bottom:2mm}
.rk-tbHead>div{display:flex;align-items:baseline;gap:2.4mm}
.rk-tbHead>div b{font-size:14pt;color:var(--wine)}
.rk-tbHead>div span{font-size:10pt;color:var(--muted)}
.rk-tone{flex:none;display:inline-flex;align-items:baseline;justify-content:center;gap:.6mm;min-width:11mm;height:11mm;padding:0 1.6mm;border-radius:5.5mm;background:var(--wine);color:#fff}
.rk-tone b{font-size:15pt;line-height:11mm;font-weight:800}
.rk-tone i{font-style:normal;font-size:8.5pt;opacity:.85}
.rk-ms{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4mm;min-height:0}
.rk-m{background:#fff;border:.25mm solid var(--line);border-radius:2mm;padding:2mm 3mm 1.6mm;display:flex;flex-direction:column;min-height:0;overflow:hidden}
.rk-mT{display:flex;flex-direction:column;line-height:1.2}
.rk-mT b{font-size:10.5pt;color:var(--brown)}
.rk-mT span{font-size:8.8pt;color:var(--muted);margin-top:.4mm}
.rk-m .abc{margin-top:auto;margin-bottom:auto;padding-top:1mm}
.rk-hs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:24mm;display:grid;grid-template-rows:repeat(${PER_PAGE},1fr);gap:3mm}
.rk-h{border:.3mm solid var(--line);border-radius:2.2mm;padding:2.4mm 4mm 1.6mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.rk-hHead{display:flex;gap:2.6mm;align-items:flex-start}
.rk-no{flex:none;width:8mm;height:8mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:12pt;display:flex;align-items:center;justify-content:center}
.rk-hT{min-width:0;flex:1;display:flex;flex-direction:column;line-height:1.2}
.rk-hT b{font-size:11.5pt;color:var(--brown)}
.rk-hT span{font-size:9pt;color:var(--muted);margin-top:.5mm}
.rk-ans{flex:none;font-size:10.5pt;font-weight:700;color:${GREEN};display:flex;align-items:center;gap:1.4mm}
.rk-ans b{display:inline-flex;width:7mm;height:7mm;border-radius:50%;background:${GREEN};color:#fff;align-items:center;justify-content:center;font-size:11pt}
.rk-h .abc{margin-top:auto;margin-bottom:auto}
.rk-legend{position:absolute;left:10mm;right:10mm;bottom:8mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.rk-legend b{color:var(--wine)}
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
.hg-tab td{height:8.4mm}
.hg-tab .r{width:16.5mm;text-align:center}
.hg-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.hg-tab .s{width:17mm;text-align:center}
.hg-tab td.s{white-space:nowrap}
.hg-tab td.s span{display:inline-flex;width:6mm;height:6mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .35mm}
.rk-tab th.k{font-size:12pt}
.rk-tab th.k i{font-style:normal;font-size:8.5pt;color:var(--muted);margin-left:1mm}
.rk-tab tr td:nth-child(2n+3){background:#fdfaf3}
.rk-ex{display:grid;grid-template-columns:1fr 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.rk-exTone .rk-tb{height:52mm}
.rk-ms.one{grid-template-columns:1fr}
.rk-exR h3{margin:0 0 3mm}
.rk-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'models', front: modelsPage(0, 'ა–დ'), back: modelsPage(4, 'ე–ჱ') },
];
for (let s = 0; s < Math.ceil(LIST_PAGES / 2); s++) {
  SHEETS.push({ key: `list${s + 1}`, front: listPage(s * 2), ...(s * 2 + 1 < LIST_PAGES ? { back: listPage(s * 2 + 1) } : {}) });
}
SHEETS.push({ key: 'teams', front: teamPage, back: teamPage }, { key: 'score', front: scorePage, back: scorePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
