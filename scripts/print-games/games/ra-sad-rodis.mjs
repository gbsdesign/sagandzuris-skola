// „რა? სად? როდის?“ on paper — the „უტელეფონო“ variant of the app's team quiz: 40 question cards (the first five of each of
// the eight topics of `data/raSadRodisQuestions.ts`; the question on the front, the answer and its note on the back), five
// blank cards for the teacher's own questions, a score sheet (two games, one a side) and answer slips for the teams. The
// settings are the app's own (`utils/raSadRodis.ts`: a minute a question, 6/12/18 questions, 2–6 teams named after instruments).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, gridSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { RSR_QUESTIONS, RSR_TOPICS, COUNT_CHOICES, SECONDS, MIN_TEAMS, MAX_TEAMS, TEAM_NAMES } = await appData({
  'data/raSadRodisQuestions.ts': ['RSR_QUESTIONS', 'RSR_TOPICS'],
  'utils/raSadRodis.ts': ['COUNT_CHOICES', 'SECONDS', 'MIN_TEAMS', 'MAX_TEAMS'],
  'utils/amikhseni.ts': ['TEAM_NAMES'],
});

export const id = 'ra-sad-rodis';
export const title = 'რა? სად? როდის?';
const TAG = 'ცოცხალი · უტელეფონო';
const META = `${MIN_TEAMS}–${MAX_TEAMS} გუნდი, თითოში 2–6 მოთამაშე · 10 წლიდან · 15–30 წუთი`;
const PER_TOPIC = 5;
const BLANKS = 5;

// each topic's colour and icon (the band on both sides of its cards)
const LOOK = {
  tsmindanebi: { color: '#b0841f', icon: 'sparkles' },
  sagmrto: { color: '#5a4636', icon: 'book-open' },
  galoba: { color: '#7a2028', icon: 'church' },
  simgera: { color: '#6b4c9a', icon: 'music' },
  istoria: { color: '#3d6b6b', icon: 'landmark' },
  kutkhe: { color: '#2f7d4f', icon: 'mountain' },
  samosi: { color: '#b0475f', icon: 'shirt' },
  musika: { color: '#2f5d8a', icon: 'music-4' },
};
const TOPICS = RSR_TOPICS.map(t => {
  if (!LOOK[t.id]) throw new Error(`no look for the topic ${t.id}`);
  return { ...t, ...LOOK[t.id] };
});
const CARDS = TOPICS.flatMap(t => {
  const qs = RSR_QUESTIONS.filter(q => q.topic === t.id).slice(0, PER_TOPIC);
  if (qs.length < PER_TOPIC) throw new Error(`${t.id}: ${qs.length} of ${PER_TOPIC} questions`);
  return qs.map(q => ({ ...q, t }));
}).map((c, i) => ({ ...c, no: i + 1 }));
const MINE = { label: 'შენი კითხვა', color: C.goldDark, icon: 'pen-line' };

// ---------- cards: the question in front, the answer behind it ----------
const band = t => `<div class="rs-band" style="background:${t.color}">${icon(t.icon, { size: 4.4, color: '#fff', width: 2 })}<span>${esc(t.label)}</span></div>`;
const answerBand = color => `<div class="rs-band out" style="color:${color};border-color:${color}">${icon('key-round', { size: 4.4, color, width: 2 })}<span>პასუხი</span></div>`;
const cardFront = c => `<div class="card rs"><div class="frame" style="border-color:${c.t.color}"></div>${band(c.t)}
<div class="rs-q${c.q.length > 115 ? ' long' : ''}"><p>${esc(c.q)}</p></div>
<div class="rs-foot"><span>№ ${c.no}</span><span>პასუხი ზურგზეა</span></div></div>`;
const cardBack = c => `<div class="card rs"><div class="frame" style="border-color:${c.t.color}"></div>${answerBand(c.t.color)}
<div class="rs-a"><div class="rs-ans${[...c.a].length > 28 ? ' long' : ''}">${esc(c.a)}</div>${c.note ? `<div class="rs-note">${esc(c.note)}</div>` : ''}</div>
<div class="rs-foot"><span>№ ${c.no}</span><span>${esc(c.t.label)}</span></div></div>`;
const blankFront = `<div class="card rs"><div class="frame" style="border-color:${MINE.color}"></div>${band(MINE)}
<div class="rs-lines">${'<i></i>'.repeat(7)}</div>
<div class="rs-foot"><span>თემა</span><span>პასუხი ზურგზეა</span></div></div>`;
const blankBack = `<div class="card rs"><div class="frame" style="border-color:${MINE.color}"></div>${answerBand(MINE.color)}
<div class="rs-lines">${'<i></i>'.repeat(3)}<b>განმარტება</b>${'<i></i>'.repeat(2)}</div>
<div class="rs-foot"><span></span><span>${esc(MINE.label)}</span></div></div>`;

const SLOTS = [...CARDS.map(c => ({ c, front: cardFront(c), back: cardBack(c) })), ...Array.from({ length: BLANKS }, () => ({ front: blankFront, back: blankBack }))];
const CARD_SHEETS = Math.ceil(SLOTS.length / 9);
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = SLOTS.slice(s * 9, s * 9 + 9);
  const nos = nine.filter(x => x.c).map(x => x.c.no);
  const what = `№ ${nos[0]}–${nos[nos.length - 1]}${nine.some(x => !x.c) ? ', ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(x => x.front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(x => x.back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — პასუხები (ზურგი)` }),
  };
});

// ---------- the score sheet: a ✓ for every right answer, eighteen questions, six teams; the same on the back ----------
const ROWS = Math.max(...COUNT_CHOICES);
const scorePage = page(`<div class="rs-sc">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">გუნდის სახელი სვეტის თავში. სწორ პასუხს — ✓ (ერთი ქულა), ბოლოს — ჯამი.</p>
  <table class="rs-tab">
    <tr><th class="r">კითხვა</th>${TEAM_NAMES.map(n => `<th><span>${esc(n)}</span><i></i></th>`).join('')}</tr>
    ${Array.from({ length: ROWS }, (_, r) => `<tr><td class="r">${r + 1}</td>${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>`).join('')}
    <tr class="sum"><td class="r">ჯამი</td>${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>
  </table>
  <div class="rs-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="rs-remind box">
    <div>${icon('hourglass', { size: 5, color: C.wine, width: 1.8 })}<span><b>წუთი</b> — ქვიშის საათი; „დრო!“ — პასუხის ბარათები წამყვანთან.</span></div>
    <div>${icon('key-round', { size: 5, color: C.wine, width: 1.8 })}<span><b>პასუხი</b> — წამყვანი ბარათს აბრუნებს და ზურგიდან კითხულობს.</span></div>
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 2.4 })}<span><b>ქულა</b> — სწორ პასუხს +1; საკმარისია, აზრი სწორი იყოს.</span></div>
    <div>${icon('trophy', { size: 5, color: C.goldDark, width: 1.8 })}<span><b>მოგება</b> — ბოლოს მეტი ქულა; ფრე — კიდევ ერთი კითხვა.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'rs-scP');

// ---------- answer slips: a team writes one per question and hands it to the host ----------
const SLIP = { cols: 3, rows: 8, w: 63, h: 34 };
const SLIPS = SLIP.cols * SLIP.rows;
const slip = `<div class="rs-slip">
  <div class="rs-slipHead"><span class="aso">${aso(title)}</span><span class="rs-slipNo">კითხვა № <i></i></span></div>
  <div class="rs-ln"><b>გუნდი</b><i></i></div>
  <div class="rs-ln"><b>პასუხი</b><i></i></div>
  <div class="rs-ln"><i></i></div>
</div>`;
const slipSheet = gridSheet(Array(SLIPS).fill(slip), { ...SLIP, label: `${title} · პასუხის ბარათები გუნდებისთვის`, cls: 'gsheet rs-slips' });

// ---------- the cover and the rules ----------
const EX = CARDS[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">გუნდური ვიქტორინა ჩვენი თემებით. წამყვანი კითხვას ხმამაღლა კითხულობს, ყველა გუნდი ერთ წუთში თათბირობს და პასუხს ბარათზე წერს. სწორი პასუხი — ერთი ქულა. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="rs-ex box">
    <div class="rs-exCards"><div class="rs-exCard">${cardFront(EX)}</div><div class="rs-exCard">${cardBack(EX)}</div></div>
    <div class="rs-exR">
      <h3>ასე მიდის კითხვა</h3>
      <div class="rs-step">${icon('megaphone', { size: 6, color: C.wine, width: 1.7 })}<span>წამყვანი იღებს ზედა ბარათს და კითხვას ორჯერ ხმამაღლა კითხულობს.</span></div>
      <div class="rs-step">${icon('hourglass', { size: 6, color: C.wine, width: 1.7 })}<span>ქვიშის საათი — ${SECONDS} წამი. გუნდები ჩუმად თათბირობენ.</span></div>
      <div class="rs-step">${icon('pen-line', { size: 6, color: C.wine, width: 1.7 })}<span>გუნდი პასუხს ბარათზე წერს და წუთის ბოლომდე წამყვანს აწვდის.</span></div>
      <div class="rs-step">${icon('key-round', { size: 6, color: '#2f7d4f', width: 1.9 })}<span>„დრო!“ — წამყვანი ბარათს აბრუნებს და პასუხს კითხულობს. სწორ პასუხს +1.</span></div>
    </div>
  </div>
  <div class="rs-topics">${TOPICS.map(t => `<span class="rs-topic" style="border-color:${t.color}"><i style="background:${t.color}">${icon(t.icon, { size: 3.4, color: '#fff', width: 2.2 })}</i>${esc(t.label)} · ${PER_TOPIC}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>კითხვის ბარათები: კითხვა წინ, პასუხი ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები შენი კითხვებისთვის</td><td>${BLANKS}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>პასუხის ბარათები გუნდებისთვის</td><td>${SLIPS}</td><td>${no('slips')}</td></tr>
        <tr><td>ქვიშის საათი 1 წთ (ან საათი წამებით)</td><td>1</td><td>საკუთარი</td></tr>
        <tr><td>ფანქარი, თითო გუნდს</td><td>${MIN_TEAMS}–${MAX_TEAMS}</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით. ყოველი კითხვის ზურგზე მისი პასუხია.</li>
        <li>ქულების ფურცელი (${no('score')}) და პასუხის ბარათები (${no('slips')}) — ჩვეულებრივზე, რამდენიც გინდათ: 12 კითხვას სამი გუნდით ${12 * 3} პასუხის ბარათი სჭირდება.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია სატელევიზიო თამაშის „Что? Где? Когда?“ იდეით. კითხვები საგანძურის სკოლის აპის ტექსტებიდანაა — შეადგინა ხელოვნურმა ინტელექტმა, მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `${MIN_TEAMS}–${MAX_TEAMS} გუნდი, თითოში 2–6 მოთამაშე, თითოს ფანქარი და პასუხის ბარათები. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი.`],
  ['წამყვანი', 'მასწავლებელი ან მოსწავლე, რომელიც არც ერთ გუნდში არ არის. ბარათებს აურევს და დასტად დებს, კითხვით ზემოთ — პასუხი არავინ უნდა დაინახოს. ქულების ფურცელზე გუნდების სახელებს წერს.'],
  ['რამდენი კითხვა', `შეთანხმდით: ${COUNT_CHOICES.join(', ')} ან რამდენიც გინდათ (12 კითხვა დაახლოებით 20 წუთია). ერთი თემით გინდათ თამაში? ზოლის ფერით ამოარჩიეთ ბარათები.`],
  ['კითხვა', 'წამყვანი იღებს ზედა ბარათს, ამბობს კითხვის რიგით ნომერს და კითხვას ორჯერ, ნელა და ხმამაღლა კითხულობს.'],
  ['წუთი', 'წამყვანი ქვიშის საათს აბრუნებს. გუნდები ჩუმად თათბირობენ — ისე, რომ მეზობელმა გუნდმა არ გაიგოს.'],
  ['პასუხი', 'გუნდი ბარათზე წერს თავის სახელს, კითხვის ნომერს და ერთ პასუხს, და წუთის ბოლომდე წამყვანს აწვდის. დაგვიანებული პასუხი არ ითვლება.'],
  ['გახსნა', '„დრო!“ — წამყვანი ბარათს აბრუნებს და პასუხს კითხულობს, განმარტებასაც. მერე გუნდების ბარათებს ამოწმებს და სწორ პასუხს ✓-ს უწერს ქულების ფურცელზე.'],
  ['რა ითვლება', 'საკმარისია, აზრი სწორი იყოს: სახელის მთავარი ნაწილი, ფრჩხილებში მოცემული ფორმა, მართლწერის პატარა შეცდომა. ეჭვის დროს წამყვანი წყვეტს.'],
  ['მოგება', 'ბოლო კითხვის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი კითხვა, ვისი სწორი ბარათიც პირველი მივა.'],
  ['შენი კითხვები', `${BLANKS} ცარიელ ბარათზე წერეთ თქვენი: წინ — კითხვა, ზურგზე — პასუხი. კარგი კითხვის პასუხი მოკლეა და ერთი.`],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„რა? სად? როდის?“ ცოდნისა და გუნდური ფიქრის თამაშია: ყველა გუნდი ერთსა და იმავე კითხვას ერთდროულად პასუხობს. კითხვები სკოლის თემებზეა — წმინდანები, საღმრთო ისტორია, გალობა, სიმღერა და საკრავი, ისტორია, კუთხეები, სამოსი და სუფრა, მუსიკის ანბანი.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> იგივე თამაშია: ტელეფონი კითხვას აჩვენებს, წუთს ზარით ითვლის, „მოისმინე“ კითხვებზე სკოლის ჩანაწერის ნაწყვეტს უკრავს და ქულებს თვითონ ინახავს — sagandzureli.ge → თამაშები → რა? სად? როდის?</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:11.2pt;line-height:1.42}
.rulesP .lead{font-size:11.2pt}
.cover .lead{margin-bottom:5mm}
.rs-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10pt;padding:0 2mm;white-space:nowrap}
.rs-band.out{background:#fff;border:.35mm solid}
.rs-q{position:absolute;left:5.6mm;right:5.6mm;top:16mm;bottom:12mm;display:flex;align-items:center;justify-content:center;text-align:center}
.rs-q p{margin:0;font-weight:700;font-size:11.5pt;line-height:1.32;color:var(--brown)}
.rs-q.long p{font-size:10.5pt}
.rs-a{position:absolute;left:5.6mm;right:5.6mm;top:16mm;bottom:12mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:3mm}
.rs-ans{font-weight:800;font-size:14pt;line-height:1.22;color:var(--wine)}
.rs-ans.long{font-size:12pt}
.rs-note{font-size:10pt;line-height:1.3;color:#6f6152;border-top:.3mm solid var(--gold);padding-top:2.4mm}
.rs-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:baseline;font-size:10pt;color:var(--muted)}
.rs-foot span:first-child{font-weight:700}
.rs-lines{position:absolute;left:6mm;right:6mm;top:18mm;bottom:12mm;display:flex;flex-direction:column;justify-content:space-around}
.rs-lines i{display:block;border-bottom:.25mm solid #bba98f;height:0}
.rs-lines b{font-size:10pt;color:var(--muted);font-weight:700;margin-bottom:-2mm}
.rs-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.rs-exCards{display:flex;gap:3mm}
.rs-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.rs-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.rs-exR h3{margin:0 0 3mm}
.rs-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.rs-step svg{flex:none;margin-top:.2mm}
.rs-topics{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.rs-topic{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.2mm .5mm .6mm;font-size:8.8pt;white-space:nowrap}
.rs-topic i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.rs-sc{position:absolute;inset:12mm 12mm 12mm}
.rs-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.rs-scHead .aso{font-size:15pt;color:var(--wine);white-space:nowrap}
.rs-scHead b{font-size:14pt;color:var(--wine);white-space:nowrap}
.rs-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline;white-space:nowrap}
.rs-date i{display:inline-block;width:22mm;border-bottom:.25mm solid #bba98f}
.rs-scHint{margin:2.6mm 0 3mm;font-size:10pt;color:var(--brown)}
table.rs-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.rs-tab th,.rs-tab td{border:.25mm solid #bba98f;text-align:center}
.rs-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;padding:1.2mm .5mm 1mm}
.rs-tab th span{display:block}
.rs-tab th i{display:block;margin:2.4mm 2mm .4mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.rs-tab th.r,.rs-tab td.r{width:15mm}
.rs-tab td{height:10.4mm;font-size:12pt}
.rs-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.rs-tab tr:nth-child(odd) td:not(.r){background:#fdfaf3}
.rs-tab tr.sum td{height:12mm;background:#fbf6ec;border-top:.6mm solid var(--wine)}
.rs-tab tr.sum td.r{font-size:10pt}
.rs-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.rs-win i{flex:1;border-bottom:.3mm solid #bba98f}
.rs-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.rs-remind>div{display:flex;gap:2mm;align-items:flex-start}
.rs-remind svg{flex:none}
.rs-slip{position:absolute;inset:1.4mm;border:.3mm solid var(--gold);border-radius:1.6mm;padding:1.8mm 2.6mm 1.6mm;display:flex;flex-direction:column;justify-content:space-between;background:#fff}
.rs-slipHead{display:flex;align-items:center;justify-content:space-between;gap:2mm}
.rs-slipHead .aso{font-size:6.5pt;color:var(--gold2);white-space:nowrap}
.rs-slipNo{font-size:10pt;font-weight:700;color:var(--wine);display:flex;align-items:center;gap:1mm;white-space:nowrap}
.rs-slipNo i{display:inline-block;width:8.5mm;height:5.2mm;border:.3mm solid var(--wine);border-radius:1mm}
.rs-ln{display:flex;align-items:flex-end;gap:1.6mm;height:6.2mm}
.rs-ln b{font-size:10pt;color:var(--brown);white-space:nowrap}
.rs-ln i{flex:1;border-bottom:.25mm solid #bba98f}
.rs-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'score', front: scorePage, back: scorePage },
  { key: 'slips', front: slipSheet },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
