// „ხმა-ხმად“ on paper — the სამაგიდო variant of the app's Bandle (2026-11-01): three singers, one a voice, sing a well-known
// chant's opening from its book notes — first the bass alone, then the bass and the middle voice, then all three; the teams
// pick its name from four (the host reads them out) and the earlier they knew it, the more it earns: 3 · 2 · 1. The kit: the
// singers' sheets (each chant's opening in three voices, under each other — music.mjs `abcScore`), the teams' answer sheets,
// a score sheet, the rules. The chants are the app's game's (melodies.mjs).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.mjs';
import { abcScore, lineOf, openingOf, until, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { CHANTS, app } from '../melodies.mjs';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.mjs';

const { shuffle, mulberry32, nameKey } = app;

export const id = 'khma-khmad';
export const title = 'ხმა-ხმად';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი და სამი მომღერალი · 9 წლიდან · 15–25 წუთი';
const COUNT = 24;
const PER_PAGE = 3;
const ROUNDS = 12;
const LETTERS = ['ა', 'ბ', 'გ', 'დ'];
const VOICE = ['მთქმელი (I)', 'მოძახილი (II)', 'ბანი (III)'];
const STEP = ['ბანი', 'ბანი და მოძახილი', 'სამივე ხმა'];

// the openings: the top voice's first phrase, the lower voices under it; a chant whose lower voices hardly sing there is left out
const OPENINGS = shuffle(CHANTS, mulberry32(7)).flatMap(c => {
  const top = openingOf(lineOf(c.score, 0), { min: 6, max: 12 });
  const voices = [top.notes, until(lineOf(c.score, 1), top.end), until(lineOf(c.score, 2), top.end)];
  return voices.every(v => v.length >= 3) ? [{ ...c, voices }] : [];
}).slice(0, COUNT);

// four names each: the right one and three of the same service (never the same name twice)
const rnd = mulberry32(17);
const ROUNDS_ = OPENINGS.map((c, i) => {
  const same = CHANTS.filter(x => x.where === c.where && nameKey(x.title) !== nameKey(c.title));
  const others = same.length >= 3 ? same : CHANTS.filter(x => nameKey(x.title) !== nameKey(c.title));
  const options = shuffle([c.title, ...shuffle(others, rnd).slice(0, 3).map(x => x.title)], rnd);
  return { ...c, no: i + 1, options, right: options.indexOf(c.title), abc: abcScore(c.voices, { names: ['I', 'II', 'III'] }) };
});
const PAGES = Math.ceil(ROUNDS_.length / PER_PAGE);

const chantBox = c => `<div class="kk-ch">
  <div class="kk-head"><span class="kk-no">${c.no}</span><div class="kk-t"><b>${esc(c.title)}</b><span>${esc(c.where)} · ${esc(c.ref)}</span></div>
    <div class="kk-ans">პასუხი: <b>${LETTERS[c.right]}</b></div></div>
  <ol class="kk-opts">${c.options.map((o, i) => `<li${i === c.right ? ' class="on"' : ''}><i>${LETTERS[i]}</i>${esc(o)}</li>`).join('')}</ol>
  ${staff(c.abc)}
</div>`;

const chantPage = p => page(`<div class="kk-mHead"><span class="aso">${aso(title)}</span><b>საგალობლები ${p * PER_PAGE + 1}–${Math.min(ROUNDS_.length, (p + 1) * PER_PAGE)}</b><span class="kk-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} მომღერლებისა და წამყვანისთვის</span></div>
<div class="kk-chs">${ROUNDS_.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(chantBox).join('')}</div>
<div class="kk-legend"><b>I</b> — მთქმელი, <b>II</b> — მოძახილი, <b>III</b> — ბანი; 8 გასაღების ქვეშ: ოქტავით დაბლა. ნაბიჯი 1 — მარტო ბანი, 2 — ბანი და მოძახილი, 3 — სამივე, ყოველთვის თავიდან.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · საგალობლები მომღერლებისთვის</div>`, 'kk-mP');

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="hg-team">
  <div class="hg-tHead"><span class="aso">${aso(title)}</span><span class="hg-tName">გუნდი <i></i></span></div>
  <p class="hg-tHint">როცა მიხვდებით, შემოხაზეთ ასო და ნაბიჯი, რომელზეც ხართ: 1 — ბანი, 2 — ბანი და მოძახილი, 3 — სამივე. მერე ვეღარ შეცვლით.</p>
  <table class="hg-tab">
    <tr><th class="r">რაუნდი</th><th class="s">ნაბიჯი</th><th class="s">ასო</th><th>შენიშვნა</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="s">${[1, 2, 3].map(n => `<span>${n}</span>`).join('')}</td><td class="s">${LETTERS.map(l => `<span>${l}</span>`).join('')}</td><td></td></tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="hg-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'hg-tP');

const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ნომერი',
  hint: 'გუნდის სახელი სვეტის თავში. სწორ ასოს — იმდენი ქულა, რომელ ნაბიჯზეც შემოხაზეს: 1 (ბანი) → 3, 2 (ორი ხმა) → 2, 3 (სამივე) → 1.',
  remind: [
    ['audio-lines', 'ნაბიჯი', 'ჯერ ბანი, მერე ბანი და მოძახილი, ბოლოს სამივე — ყოველთვის თავიდან.'],
    ['list-checks', 'პასუხი', 'წამყვანი ოთხ სახელს კითხულობს; გუნდი შემოხაზავს ასოს და ნაბიჯს.'],
    ['check', 'ქულა', 'ბანზე → 3, ორ ხმაზე → 2, სამივეზე → 1; შეცდომა — 0.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი საგალობელი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ცნობილი საგალობლის დასაწყისი ხმა-ხმად: ჯერ მარტო ბანი ჟღერს, მერე ბანი და მოძახილი, ბოლოს სამივე ხმა. გუნდები ოთხი სახელიდან სწორს ირჩევენ — რაც ადრე მიხვდებიან, მით მეტი ქულა. ტელეფონი არ სჭირდება; სამი მომღერალი წიგნის ნოტებით გალობს.<br><b>${META}</b></div>
  <div class="kk-ex box">
    <h3>ასე მიდის რაუნდი</h3>
    <div class="kk-steps">
      <div>${step('megaphone', 'წამყვანი ამბობს რაუნდს და ოთხ სახელს: ა, ბ, გ, დ.')}${step('audio-lines', '<b>1.</b> ბანი გალობს მარტო, თავიდან ბოლომდე. გუნდები თათბირობენ.')}${step('audio-lines', '<b>2.</b> თავიდან — ბანი და მოძახილი ერთად.')}</div>
      <div>${step('audio-lines', '<b>3.</b> თავიდან — სამივე ხმა.')}${step('pen-line', 'ვინც მიხვდა, შემოხაზავს ასოს და იმ ნაბიჯს, რომელზეც არის.')}${step('key-round', 'ბოლოს წამყვანი ასოს ამბობს: ბანზე — 3 ქულა, ორ ხმაზე — 2, სამივეზე — 1.', '#2f7d4f')}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>საგალობლები სამ ხმაზე, ოთხი სახელით</td><td>${ROUNDS_.length}</td><td>${no('ch1')}–${no(`ch${Math.ceil(PAGES / 2)}`)}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="kk-mix">წირვის, მწუხრისა და ცისკრის ცნობილი საგალობლები, გელათის სკოლის I და IX ტომებიდან — იგივე, რაც აპის თამაშში.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>საგალობლები (${no('ch1')}–${no(`ch${Math.ceil(PAGES / 2)}`)}) — სამ ეგზემპლარად: თითო მომღერალს და წამყვანს; გუნდებს არ აჩვენოთ.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — რამდენიც გუნდია, შუაზე გაჭრილი; ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია თამაშის „Bandle“ იდეით. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. ცალკე — სამი მომღერალი (${VOICE.join(', ')}): მასწავლებელი და ორი მოსწავლე, ან სამი, ვინც ნოტს კითხულობს.`],
  ['წამყვანი', 'ხშირად ერთ-ერთი მომღერალია. ის კითხულობს ოთხ სახელს, ხედავს სწორ ასოს და ქულებს წერს.'],
  ['რაუნდი', `წამყვანი ირჩევს საგალობელს (რიგით ან როგორც უნდა), ამბობს რაუნდის ნომერს და ოთხ სახელს — ა, ბ, გ, დ — ორჯერ, ნელა. ${ROUNDS} რაუნდი დაახლოებით 25 წუთია.`],
  ['ნაბიჯი 1', 'ბანი გალობს თავის ხმას მარტო, დასაწყისიდან ფრაზის ბოლომდე. სიტყვების გარეშე — „ლა-ლა“-თი ან ხმოვნით: სიტყვა პასუხს იტყოდა.'],
  ['ნაბიჯი 2', 'თავიდან, ბანი და მოძახილი ერთად.'],
  ['ნაბიჯი 3', 'თავიდან, სამივე ხმა. ყოველი ნაბიჯის მერე — მცირე პაუზა თათბირისთვის.'],
  ['პასუხი', 'გუნდი, რომელიც მიხვდა, ფურცელზე შემოხაზავს ასოს და იმ ნაბიჯს, რომელზეც არის. მერე ვეღარ შეცვლის.'],
  ['ქულა', 'მე-3 ნაბიჯის მერე წამყვანი სწორ ასოს ამბობს. სწორ პასუხს: ნაბიჯი 1 → 3 ქულა, 2 → 2, 3 → 1. შეცდომა — 0.'],
  ['მოგება', 'ბოლო რაუნდის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი საგალობელი.'],
  ['უფრო რთულად', 'ოთხი სახელის გარეშე: გუნდები სახელს თვითონ წერენ.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ხმა-ხმად“ სმენის თამაშია: ცნობ საგალობელს მარტო ბანით? ქართულ გალობაში ყოველ ხმას თავისი გზა აქვს — ეს თამაში გასწავლის, ბანსაც და მოძახილსაც ცალკე მოუსმინო.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: სამ ხმას სინთეზატორი უკრავს და ოთხი სახელიდან ირჩევ; ონლაინ, ან ერთი ტელეფონით, გუნდებად — sagandzureli.ge → თამაშები → ხმა-ხმად.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.15);

export const css = `${coverCss}${musicCss}${partsCss}
.kk-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.kk-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.kk-mHead b{font-size:13pt;color:var(--wine)}
.kk-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.kk-chs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:21mm;display:grid;grid-template-rows:repeat(${PER_PAGE},1fr);gap:4mm}
.kk-ch{border:.3mm solid var(--line);border-radius:2.2mm;padding:3mm 4mm 2mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.kk-head{display:flex;gap:2.6mm;align-items:flex-start}
.kk-no{flex:none;width:8mm;height:8mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:12pt;display:flex;align-items:center;justify-content:center}
.kk-t{min-width:0;flex:1;display:flex;flex-direction:column;line-height:1.2}
.kk-t b{font-size:12pt;color:var(--brown)}
.kk-t span{font-size:9pt;color:var(--muted);margin-top:.5mm}
.kk-ans{flex:none;font-size:10pt;color:var(--muted)}
.kk-ans b{display:inline-flex;width:7mm;height:7mm;border-radius:50%;background:#2f7d4f;color:#fff;align-items:center;justify-content:center;font-size:11pt;margin-left:1mm}
.kk-opts{list-style:none;margin:2.4mm 0 1mm;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:1mm 5mm;font-size:10pt;line-height:1.25}
.kk-opts li{display:flex;align-items:center;gap:1.6mm}
.kk-opts li i{flex:none;font-style:normal;width:5.2mm;height:5.2mm;border-radius:50%;border:.3mm solid var(--brown);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:9pt}
.kk-opts li.on{color:#2f7d4f;font-weight:700}
.kk-opts li.on i{border-color:#2f7d4f;background:#2f7d4f;color:#fff}
.kk-ch .abc{margin-top:auto;margin-bottom:auto}
.kk-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.kk-legend b{color:var(--wine)}
.kk-ex{margin:0 0 5mm;padding:4mm 5mm}
.kk-ex h3{margin:0 0 3mm}
.kk-steps{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.kk-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
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
.hg-tab .r{width:17mm;text-align:center}
.hg-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.hg-tab .s{width:36mm;text-align:center}
.hg-tab td.s{white-space:nowrap}
.hg-tab td.s span{display:inline-flex;width:6mm;height:6mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .45mm}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(PAGES / 2); s++) {
  SHEETS.push({ key: `ch${s + 1}`, front: chantPage(s * 2), ...(s * 2 + 1 < PAGES ? { back: chantPage(s * 2 + 1) } : {}) });
}
SHEETS.push({ key: 'teams', front: teamPage, back: teamPage }, { key: 'score', front: scorePage, back: scorePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
