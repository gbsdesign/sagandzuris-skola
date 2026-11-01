// „სამ ნოტში!“ on paper — the სამაგიდო variant of the app's Name That Tune (2026-11-01): melody cards and a bidding game. A
// card's front is the clue the teams see (the service, or the song's land); its back, for the host only, the melody's name
// and its first notes on a staff (melodies.mjs: the chants of the app's game and the program's songs), each of the first six
// numbered. The teams bid how few notes they need („ხუთ ნოტში ვიცნობ!“); the lowest bidder hears that many and names it.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.mjs';
import { abcOf, lineOf, openingOf, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { CHANTS, SONGS, app } from '../melodies.mjs';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.mjs';

const { shuffle, mulberry32 } = app;

export const id = 'sam-notshi';
export const title = 'სამ ნოტში!';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი · 9 წლიდან · 15–25 წუთი';
const BID = 6;
const ROUNDS = 12;

// each kind's colour and mark: the time of day a service is sung at, a note for a song
const KIND = {
  წირვა: { color: '#7a2028', icon: 'sun', clue: 'წირვის საგალობელი' },
  მწუხრი: { color: '#3d4f8a', icon: 'moon', clue: 'მწუხრის საგალობელი' },
  ცისკარი: { color: '#a8741a', icon: 'sunrise', clue: 'ცისკრის საგალობელი' },
  song: { color: '#2f7d4f', icon: 'music', clue: 'ხალხური სიმღერა' },
};
const MINE = { color: C.goldDark, icon: 'pen-line', clue: 'შენი ჰანგი' };
const lookOf = m => (m.kind === 'song' ? KIND.song : KIND[m.where]);

const MARKS = Object.fromEntries(Array.from({ length: BID }, (_, i) => [i + 1, String(i + 1)]));
const CARDS = shuffle([...CHANTS, ...SONGS], mulberry32(31))
  .map(m => ({ ...m, notes: openingOf(lineOf(m.score, 0), { min: 7, max: 9 }).notes }))
  .filter(m => m.notes.length >= BID)
  .map((m, i) => {
    const look = lookOf(m);
    if (!look) throw new Error(`no look for ${m.where}`);
    return { ...m, no: i + 1, look, abc: abcOf(m.notes, { marks: MARKS }) };
  });

// ---------- cards: the clue in front, the melody behind it ----------
const band = (look, label) => `<div class="sn-band" style="background:${look.color}">${icon(look.icon, { size: 4.4, color: '#fff', width: 2 })}<span>${esc(label)}</span></div>`;
const dots = `<div class="sn-dots">${Array.from({ length: BID }, (_, i) => `<span>${i + 1}</span>`).join('')}</div>`;
const front = c => `<div class="card sn"><div class="frame" style="border-color:${c.look.color}"></div>${band(c.look, c.kind === 'song' ? 'სიმღერა' : c.where)}
<div class="sn-mid">${icon(c.look.icon, { size: 15, color: c.look.color, width: 1.4 })}
  <div class="sn-clue">${esc(c.look.clue)}${c.kind === 'song' ? `<br><b>${esc(c.where)}</b>` : ''}</div>
  <div class="sn-ask">რამდენ ნოტში იცნობ?</div>${dots}</div>
<div class="sn-foot"><span>№ ${c.no}</span><span>ჰანგი ზურგზეა</span></div></div>`;
const back = c => `<div class="card sn"><div class="frame" style="border-color:${c.look.color}"></div>
<div class="sn-band out" style="color:${c.look.color};border-color:${c.look.color}">${icon('eye-off', { size: 4.2, color: c.look.color, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sn-name${[...c.title].length > 24 ? ' long' : ''}">${esc(c.title)}</div>
<div class="sn-ref">${esc(c.ref)}</div>
<div class="sn-staff">${staff(c.abc)}</div>
<div class="sn-foot"><span>№ ${c.no}</span><span>${esc(c.kind === 'song' ? 'სიმღერა' : c.where)}</span></div></div>`;
const blankFront = `<div class="card sn"><div class="frame" style="border-color:${MINE.color}"></div>${band(MINE, 'შენი ჰანგი')}
<div class="sn-mid">${icon(MINE.icon, { size: 13, color: MINE.color, width: 1.4 })}<div class="sn-clue sn-line">მინიშნება: <i></i></div>
<div class="sn-ask">რამდენ ნოტში იცნობ?</div>${dots}</div>
<div class="sn-foot"><span>№</span><span>ჰანგი ზურგზეა</span></div></div>`;
const blankBack = `<div class="card sn"><div class="frame" style="border-color:${MINE.color}"></div>
<div class="sn-band out" style="color:${MINE.color};border-color:${MINE.color}">${icon('eye-off', { size: 4.2, color: MINE.color, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sn-lines"><i></i><i></i></div>
<div class="sn-five">${'<i></i>'.repeat(5)}</div>
<div class="sn-foot"><span>№</span><span>შენი ჰანგი</span></div></div>`;

const SLOTS = [...CARDS.map(c => ({ c, front: front(c), back: back(c) }))];
while (SLOTS.length % 9) SLOTS.push({ front: blankFront, back: blankBack });
const CARD_SHEETS = SLOTS.length / 9;
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = SLOTS.slice(s * 9, s * 9 + 9);
  const nos = nine.filter(x => x.c).map(x => x.c.no);
  const what = `№ ${nos[0]}–${nos[nos.length - 1]}${nine.some(x => !x.c) ? ', ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(x => x.front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(x => x.back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ჰანგები (ზურგი)` }),
  };
});

const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ბარათი №',
  hint: 'გუნდის სახელი სვეტის თავში. ვინც ფსონი მოიგო და სწორად თქვა — 7-ს მინუს ნოტების რიცხვი (6 ნოტი → 1, 1 ნოტი → 6); დანარჩენებს, ვინც მერე გამოიცნო — 1.',
  remind: [
    ['gavel', 'ფსონი', 'გუნდები რიგრიგობით ამბობენ ნაკლებს: „5 ნოტში!“ — ან „იმღერე!“.'],
    ['music', 'სიმღერა', 'წამყვანი მღერის იმდენ ნოტს, რამდენიც ბოლო ფსონია.'],
    ['check', 'ქულა', 'სწორია — 7 მინუს ნოტები; შეცდომა — სხვები ცდიან მთელ ჰანგზე, 1 ქულა.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი ბარათი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = CARDS.find(c => c.kind === 'chant' && [...c.title].length < 20) ?? CARDS[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">„ხუთ ნოტში ვიცნობ!“ — „ოთხში!“ — „იმღერე!“ ბარათზე მინიშნებაა: რომელი მსახურების საგალობელია, ან რომელი კუთხის სიმღერა. გუნდები ფსონს დებენ, რამდენ ნოტში იცნობენ; ვინც ნაკლებს იტყვის, ის უსმენს და ასახელებს. ტელეფონი არ სჭირდება; წამყვანმა ნოტები უნდა წაიკითხოს (ან საკრავზე დაუკრას).<br><b>${META}</b></div>
  <div class="sn-ex box">
    <div class="sn-exCards"><div class="sn-exCard">${front(EX)}</div><div class="sn-exCard">${back(EX)}</div></div>
    <div class="sn-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('eye', 'წამყვანი ზედა ბარათს იღებს და მინიშნებას კითხულობს — ზურგს მხოლოდ თვითონ ხედავს.')}
      ${step('gavel', `გუნდები რიგრიგობით დებენ ფსონს, ${BID}-დან ქვემოთ: „5 ნოტში!“ — „3-ში!“ — ან ამბობენ „იმღერე!“`)}
      ${step('music', 'წამყვანი ფსონის გუნდს იმდენ ნოტს უმღერის, რამდენიც თქვა (ნოტებზე ციფრებია).')}
      ${step('key-round', 'გუნდი ასახელებს: სწორია — 7 მინუს ნოტები ქულა. არა — სხვები ცდიან მთელ ჰანგზე.', '#2f7d4f')}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ჰანგის ბარათები: მინიშნება წინ, ნოტები ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები შენი ჰანგებისთვის</td><td>${SLOTS.length - CARDS.length}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="sn-mix">${CARDS.filter(c => c.kind === 'chant').length} საგალობელი (წირვა, მწუხრი, ცისკარი) და ${CARDS.filter(c => c.kind === 'song').length} ხალხური სიმღერა — მისაღები გამოცდის პროგრამიდან.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია სატელევიზიო თამაშის „Name That Tune“ იდეით. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი.`],
  ['წამყვანი', 'მასწავლებელი ან ის, ვინც ნოტებს კითხულობს, — ის არ თამაშობს. ბარათებს აურევს და დასტად დებს, მინიშნებით ზემოთ.'],
  ['მინიშნება', 'წამყვანი იღებს ზედა ბარათს და კითხულობს მის წინა მხარეს: „მწუხრის საგალობელი“, „ხალხური სიმღერა, გურული“. ზურგს — სახელს და ნოტებს — მხოლოდ თვითონ ხედავს.'],
  ['ფსონი', `იწყებს გუნდი, რომელიც წინა რაუნდში წამყვანის მარცხნივ იჯდა (პირველ რაუნდში — ნებისმიერი). ის ამბობს: „${BID} ნოტში ვიცნობთ!“ ან ნაკლებს. შემდეგი გუნდი ან უფრო ნაკლებს ამბობს, ან — „იმღერე!“. პირველივე „იმღერე!“ ფსონს ამთავრებს.`],
  ['სიმღერა', 'წამყვანი ბოლო ფსონის გუნდს იმდენ ნოტს უმღერის, რამდენიც თქვა — ზურგზე ნოტებს ციფრები აწერია. მღერის „ლა-ლა“-თი, სიტყვების გარეშე.'],
  ['პასუხი', 'გუნდს 10 წამი აქვს და ერთი პასუხი. სწორია — ქულა: 7 მინუს ნოტების რიცხვი (6 ნოტი → 1, 3 ნოტი → 4, 1 ნოტი → 6).'],
  ['თუ ვერ თქვა', 'წამყვანი მთელ ზურგს მღერის; დანარჩენი გუნდები პასუხს ფურცელზე წერენ და ყველა სწორი 1 ქულას იღებს.'],
  ['მოგება', `${ROUNDS} ბარათის (ან შეთანხმებული დროის) მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი ბარათი.`],
  ['უფრო მარტივად', 'ფსონის გარეშე, აპის მსგავსად: წამყვანი ჯერ 3 ნოტს მღერის, მერე 6-ს, მერე მთელ ზურგს; გუნდები პასუხს წერენ — 3 ნოტზე 3 ქულა, 6-ზე 2, მთელზე 1.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„სამ ნოტში!“ სმენისა და გამბედაობის თამაშია: რამდენ ნოტში იცნობ ცნობილ ჰანგს — და რამდენად ენდობი შენს თავს? ჰანგები სკოლის წიგნების საგალობლები და ხალხური სიმღერებია.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ნოტებს ტელეფონი უკრავს — ჯერ 3, მერე 6, მერე მთელ ფრაზას, და ოთხი სახელიდან ირჩევ; ონლაინ, ან ერთი ტელეფონით, გუნდებად — sagandzureli.ge → თამაშები → სამ ნოტში!</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.25);

export const css = `${coverCss}${musicCss}${partsCss}
.sn-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap}
.sn-band.out{background:#fff;border:.35mm solid}
.sn-mid{position:absolute;left:5.6mm;right:5.6mm;top:17mm;bottom:11mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.6mm;text-align:center}
.sn-clue{font-size:10.5pt;line-height:1.3;color:var(--brown)}
.sn-clue b{font-size:12pt;color:var(--wine)}
.sn-line{display:flex;align-items:baseline;gap:1.4mm;width:100%}
.sn-line i{flex:1;border-bottom:.25mm solid #bba98f}
.sn-ask{font-weight:800;font-size:12pt;line-height:1.2;color:var(--wine)}
.sn-dots{display:flex;gap:1.3mm}
.sn-dots span{width:5.6mm;height:5.6mm;border-radius:50%;border:.3mm solid var(--gold2);display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;color:var(--gold2)}
.sn-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:baseline;font-size:10pt;color:var(--muted)}
.sn-foot span:first-child{font-weight:700}
.sn-name{position:absolute;left:5.6mm;right:5.6mm;top:17mm;text-align:center;font-weight:800;font-size:13pt;line-height:1.2;color:var(--brown)}
.sn-name.long{font-size:11.5pt}
.sn-ref{position:absolute;left:5.6mm;right:5.6mm;top:33mm;text-align:center;font-size:9pt;color:var(--muted)}
.sn-staff{position:absolute;left:4.6mm;right:4.6mm;top:41mm;bottom:12mm;display:flex;align-items:center}
.sn-lines{position:absolute;left:6mm;right:6mm;top:19mm;display:flex;flex-direction:column;gap:7mm}
.sn-lines i,.sn-five i{display:block;border-bottom:.25mm solid #9d8c77;height:0}
.sn-five{position:absolute;left:6mm;right:6mm;top:50mm;display:flex;flex-direction:column;gap:2mm}
.sn-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.sn-exCards{display:flex;gap:3mm}
.sn-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.sn-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.sn-exR h3{margin:0 0 3mm}
.sn-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
