// „დღის ჰანგი“ on paper — the სამაგიდო variant of the app's listening game (2026-11-01): no recording, the host sings. Every
// melody is the opening of a well-known chant or song from its book notes (melodies.mjs), on a staff with the ladder marked:
// step 1 is its first two notes, then three, four, six, eight and eleven — the app's 1 · 2 · 4 · 7 · 11 · 16 seconds turned
// into notes. The teams write the name and the step they knew it at; the earlier, the more points (6 … 1). The kit: the
// host's melody sheets, the teams' answer sheets, a score sheet, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.mjs';
import { abcOf, lineOf, openingOf, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { CHANTS, SONGS, app } from '../melodies.mjs';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.mjs';

const { shuffle, mulberry32 } = app;

export const id = 'dghis-hangi';
export const title = 'დღის ჰანგი';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი · 8 წლიდან · 15–25 წუთი';
/** the ladder: so many notes at each step */
const STEPS = [2, 3, 4, 6, 8, 11];
const MARKS = Object.fromEntries(STEPS.map((n, i) => [n, String(i + 1)]));
const POINTS = STEPS.map((_, i) => STEPS.length - i);
const ROUNDS = 12;

// the melodies in a fixed mixed order (songs spread among the chants), each long enough for the whole ladder
const MELODIES = shuffle([...CHANTS, ...SONGS], mulberry32(20261101))
  .map(m => ({ ...m, notes: openingOf(lineOf(m.score, 0), { min: 11, max: 13 }).notes }))
  .filter(m => m.notes.length >= 11)
  .map((m, i) => ({ ...m, no: i + 1, abc: abcOf(m.notes, { marks: MARKS }) }));
const PER_PAGE = 10;
const MEL_PAGES = Math.ceil((MELODIES.length + 1) / PER_PAGE);

const melodyBox = m => `<div class="hg-mel">
  <div class="hg-melHead"><span class="hg-no">${m.no}</span><div class="hg-melT"><b>${esc(m.title)}</b><span>${m.kind === 'song' ? `სიმღერა · ${esc(m.ref)}` : `საგალობელი · ${esc(m.where)} · ${esc(m.ref)}`}</span></div></div>
  ${staff(m.abc)}
</div>`;
// the last box: room for the host's own melody
const ownBox = `<div class="hg-mel hg-own">
  <div class="hg-melHead"><span class="hg-no">${MELODIES.length + 1}</span><div class="hg-melT"><b>შენი ჰანგი</b><span>ჩაწერე სახელი და პირველი 11 ნოტი</span></div></div>
  <div class="hg-lines">${'<i></i>'.repeat(5)}</div>
</div>`;

const melodyPage = p => {
  const boxes = MELODIES.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(melodyBox);
  if (boxes.length < PER_PAGE && p === MEL_PAGES - 1) boxes.push(ownBox);
  const from = p * PER_PAGE + 1, to = Math.min(MELODIES.length + 1, (p + 1) * PER_PAGE);
  return page(`<div class="hg-mHead"><span class="aso">${aso(title)}</span><b>ჰანგები ${from}–${to}</b><span class="hg-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} წამყვანისთვის — გუნდებს არ აჩვენო</span></div>
<div class="hg-mels">${boxes.join('')}</div>
<div class="hg-legend">ნოტების თავზე ციფრი ნაბიჯს აჩვენებს: <b>1</b> — იმღერე აქამდე (2 ნოტი), <b>2</b> — 3 ნოტი, <b>3</b> — 4, <b>4</b> — 6, <b>5</b> — 8, <b>6</b> — 11 ნოტი.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ჰანგები წამყვანისთვის</div>`, 'hg-mP');
};

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="hg-team">
  <div class="hg-tHead"><span class="aso">${aso(title)}</span><span class="hg-tName">გუნდი <i></i></span></div>
  <p class="hg-tHint">როცა მიხვდებით, ჩაწერეთ სახელი და შემოხაზეთ ნაბიჯი, რომელზეც ხართ. ჩაწერილს ვეღარ შეცვლით.</p>
  <table class="hg-tab">
    <tr><th class="r">რაუნდი</th><th class="s">ნაბიჯი</th><th>რომელია?</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="s">${STEPS.map((_, i) => `<span>${i + 1}</span>`).join('')}</td><td></td></tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="hg-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'hg-tP');

// ---------- the score sheet ----------
const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ჰანგი №',
  hint: `გუნდის სახელი სვეტის თავში. სწორ პასუხს — იმდენი ქულა, რომელ ნაბიჯზეც ჩაწერეს: ${POINTS.map((p, i) => `${i + 1} → ${p}`).join(', ')}.`,
  remind: [
    ['music', 'ნაბიჯი', 'წამყვანი მღერის ნიშნამდე, მერე ითვლის ხუთამდე.'],
    ['pen-line', 'პასუხი', 'გუნდი წერს სახელს და შემოხაზავს ნაბიჯს.'],
    ['check', 'ქულა', `ნაბიჯი 1 → ${POINTS[0]}, … ნაბიჯი 6 → ${POINTS[5]}; შეცდომა — 0.`, '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი ჰანგი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = MELODIES.find(m => m.kind === 'chant' && m.title.length < 22) ?? MELODIES[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ცნობილი საგალობლის ან სიმღერის დასაწყისი, წიგნის ნოტებით. წამყვანი ჯერ ორ ნოტს მღერის, მერე სამს, ოთხს, ექვსს, რვას და თერთმეტს — გუნდები ცდილობენ, რაც შეიძლება ადრე იცნონ. ტელეფონი არ სჭირდება; წამყვანმა ნოტები უნდა წაიკითხოს (ან საკრავზე დაუკრას).<br><b>${META}</b></div>
  <div class="hg-ex box">
    <div class="hg-exMel">${melodyBox(EX)}</div>
    <div class="hg-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ამბობს რაუნდს და მღერის პირველ ნიშნამდე — ორ ნოტს.')}
      ${step('users', 'გუნდები ჩუმად თათბირობენ; ვინც მიხვდა, წერს სახელს და შემოხაზავს ნაბიჯს.')}
      ${step('music', 'შემდეგი ნიშნამდე — თავიდან, მეტი ნოტით. სულ ექვსი ნაბიჯია.')}
      ${step('key-round', `ბოლოს წამყვანი სახელს ამბობს: სწორ პასუხს — ${POINTS[0]} ქულიდან (1-ელ ნაბიჯზე) 1-მდე (მე-6-ზე).`, '#2f7d4f')}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ჰანგები ნოტებით, წამყვანისთვის</td><td>${MELODIES.length}</td><td>${no('mel1')}–${no(`mel${Math.ceil(MEL_PAGES / 2)}`)}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>ფანქარი, თითო გუნდს</td><td>2–6</td><td>საკუთარი</td></tr>
      </table>
      <p class="hg-mix">${MELODIES.filter(m => m.kind === 'chant').length} საგალობელი (წირვა, მწუხრი, ცისკარი) და ${MELODIES.filter(m => m.kind === 'song').length} ხალხური სიმღერა — მისაღები გამოცდის პროგრამიდან.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ჰანგები (${no('mel1')}–${no(`mel${Math.ceil(MEL_PAGES / 2)}`)}) — წამყვანს; გუნდებს არ უნდა დაინახონ.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — რამდენიც გუნდია, შუაზე გაჭრილი; ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია თამაშის „Heardle“ იდეით. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე, თითოს ფანქარი და გუნდის ფურცელი. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი.`],
  ['წამყვანი', 'მასწავლებელი ან ის, ვინც ნოტებს კითხულობს, — ის არ თამაშობს. ჰანგების ფურცლები მასთანაა, ქულების ფურცელზე გუნდების სახელებს წერს. შეუძლია ჰანგები საკრავზეც დაუკრას.'],
  ['რაუნდი', `წამყვანი ირჩევს ჰანგს (რიგით ან როგორც უნდა), ამბობს რაუნდის ნომერს და ქულების ფურცელზე ჰანგის ნომერს ინიშნავს. ${ROUNDS} რაუნდი დაახლოებით 20 წუთია.`],
  ['ნაბიჯები', 'ნოტების თავზე ციფრები 1-დან 6-მდე ნიშნებია. 1-ელ ნაბიჯზე წამყვანი მღერის თავიდან 1-ელ ნიშნამდე (ორი ნოტი), მე-2-ზე — თავიდან მე-2 ნიშნამდე (სამი ნოტი), და ასე: ოთხი, ექვსი, რვა, თერთმეტი ნოტი. ყოველი ნაბიჯის მერე — ხუთამდე ითვლის.'],
  ['როგორ მღერის', 'სუფთად და მშვიდად, სიტყვების გარეშე („ლა-ლა“ ან „ნა-ნა“) — სიტყვა პასუხს იტყოდა. ნოტის სიგრძე დაიცავი, როგორც წერია.'],
  ['პასუხი', 'გუნდი, რომელიც მიხვდა, ფურცელზე წერს სახელს და შემოხაზავს იმ ნაბიჯს, რომელზეც არის. ჩაწერილს ვეღარ შეცვლის. ვინც ვერ მიხვდა, ელოდება შემდეგ ნაბიჯს.'],
  ['გახსნა', 'მე-6 ნაბიჯის მერე (ან როცა ყველა გუნდმა ჩაწერა) წამყვანი სახელს ამბობს და ფურცლებს ამოწმებს. სწორ პასუხს ქულა ნაბიჯით: 1 → 6, 2 → 5, 3 → 4, 4 → 3, 5 → 2, 6 → 1. შეცდომა — 0.'],
  ['რა ითვლება', 'საკმარისია, საგალობლის ან სიმღერის სახელი გასაგები იყოს: პირველი სიტყვები, ცნობილი სახელი, პატარა შეცდომა. ეჭვის დროს წამყვანი წყვეტს.'],
  ['მოგება', 'ბოლო რაუნდის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი ჰანგი.'],
  ['უფრო მარტივად', 'პატარებთან წამყვანმა ჰანგი შეიძლება სიტყვებითაც იმღეროს, ან მე-6 ნაბიჯზე ორი სახელი შესთავაზოს არჩევნად.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„დღის ჰანგი“ სმენისა და მეხსიერების თამაშია: რამდენ ნოტში იცნობ ცნობილ ჰანგს? აპში ის სკოლის ჩანაწერით თამაშდება — ჯერ 1 წამი ისმის, მერე 2, 4, 7, 11 და 16. აქ ჩანაწერის ნაცვლად წამყვანი მღერის, წამების ნაცვლად კი ნოტებია.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ყოველდღე ერთი ჩანაწერი მთელი სკოლისთვის, კლასთან ერთად კი ონლაინ ან ერთი ტელეფონით — sagandzureli.ge → თამაშები → დღის ჰანგი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.08);

export const css = `${coverCss}${musicCss}${partsCss}
.hg-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.hg-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.hg-mHead b{font-size:13pt;color:var(--wine)}
.hg-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.hg-mels{position:absolute;left:10mm;right:10mm;top:19mm;bottom:20mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(5,1fr);gap:3mm 4mm}
.hg-mel{border:.3mm solid var(--line);border-radius:2.2mm;padding:2.4mm 3mm 1.8mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.hg-melHead{display:flex;gap:2.4mm;align-items:flex-start}
.hg-no{flex:none;width:7.2mm;height:7.2mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.hg-melT{min-width:0;display:flex;flex-direction:column;line-height:1.2}
.hg-melT b{font-size:11pt;color:var(--brown)}
.hg-melT span{font-size:8.6pt;color:var(--muted);margin-top:.4mm}
.hg-mel .abc{margin-top:auto;margin-bottom:auto;padding-top:1mm}
.hg-own .hg-lines{display:flex;flex-direction:column;gap:2.2mm;margin:2mm 0 1mm}
.hg-own .hg-lines i{display:block;border-bottom:.25mm solid #9d8c77;height:0}
.hg-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.hg-legend b{color:var(--wine)}
.hg-team{height:148.5mm;padding:8mm 12mm 4mm;position:relative}
.hg-cut{position:absolute;left:6mm;right:6mm;top:148.5mm;border-top:.3mm dashed #b3a593}
.hg-tHead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm}
.hg-tHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.hg-tName{flex:1;display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine)}
.hg-tName i{flex:1;border-bottom:.3mm solid #bba98f}
.hg-tHint{margin:1.8mm 0 2.2mm;font-size:9.5pt;line-height:1.3}
table.hg-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.hg-tab th,.hg-tab td{border:.25mm solid #bba98f;padding:0 1.6mm}
.hg-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:6.4mm;text-align:left}
.hg-tab td{height:8.3mm}
.hg-tab .r{width:15mm;text-align:center}
.hg-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.hg-tab .s{width:50mm;text-align:center}
.hg-tab td.s{white-space:nowrap}
.hg-tab td.s span{display:inline-flex;width:6mm;height:6mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .35mm}
.hg-ex{display:grid;grid-template-columns:92mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.hg-exMel .hg-mel{height:52mm}
.hg-exR h3{margin:0 0 3mm}
.hg-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(MEL_PAGES / 2); s++) {
  SHEETS.push({ key: `mel${s + 1}`, front: melodyPage(s * 2), ...(s * 2 + 1 < MEL_PAGES ? { back: melodyPage(s * 2 + 1) } : {}) });
}
SHEETS.push({ key: 'teams', front: teamPage, back: teamPage }, { key: 'score', front: scorePage, back: scorePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
