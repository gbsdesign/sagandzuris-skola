// „ოთხიდან ერთი“ on paper — the სამაგიდო variant of the app's quiz of four answers (`utils/otkhi.ts`, the questions
// `data/otkhiQuestions.ts`): 76 question cards — four of each of the nineteen topics, the first ones that fit a card and
// are not among „რა? სად? როდის?“'s printed cards (so a class with both kits never meets a question twice); in front the
// question and its four answers ა ბ გ დ in the app's colours (`rounds/four.tsx`), behind the right letter, the answer and
// its note —, five blank cards, six answer cards for the teams and a score sheet. An answer card is a square of four
// coloured corners: the team holds up the letter it chose at the top, and its back shows from behind which letter is up.
// The answers' places are fixed by a seed so that every topic's four cards have the right one under ა, ბ, გ and დ once.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, gridSheet, coverCss, grapeEmblem } from '../lib.js';
import { lookedTopics } from '../quizLook.js';
import * as __d0 from '../../data/otkhiQuestions';
import * as __d1 from '../../utils/otkhi';
import * as __d2 from '../../data/raSadRodisQuestions';
import * as __d3 from '../../utils/amikhseni';
import * as __d4 from '../../utils/otkheuli';

const { OTKHI_QUESTIONS, OTKHI_TOPICS, OTKHI_LETTERS, OTKHI_SECONDS, RSR_QUESTIONS, RSR_TOPICS, TEAM_NAMES, mulberry32 } = ({ ...__d0, ...__d1, ...__d2, ...__d3, ...__d4 });

export const id = 'otkhidan-erti';
export const title = 'ოთხიდან ერთი';
const TAG = 'ქართული · სამაგიდო';
const TEAMS = TEAM_NAMES.length;
const META = `2–${TEAMS} გუნდი, თითოში 2–5 მოთამაშე · 8 წლიდან · 15–25 წუთი`;
const PER_TOPIC = 4;
const BLANKS = 5;
const SEED = 4041;
// the app's four answers' colours (`pages/games/rounds/four.tsx` LOOK)
const INK = ['#7a2028', '#2b5f8a', '#8a5a22', '#5b3f8c'];
// „რა? სად? როდის?“'s kit prints the first four of each of its topics
const RSR_PRINTED = new Set(RSR_TOPICS.flatMap(t => RSR_QUESTIONS.filter(q => q.topic === t.id).slice(0, 4).map(q => q.id)));

const len = s => [...s].length;
const fits = q => q.a.length === 4 && len(q.q) <= 110 && q.a.every(a => len(a) <= 26) && len(q.note ?? '') <= 150;
const shuffle = (xs, rnd) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const TOPICS = lookedTopics(OTKHI_TOPICS);
const rnd = mulberry32(SEED);
const CARDS = TOPICS.flatMap(t => {
  const qs = OTKHI_QUESTIONS.filter(q => q.topic === t.id && !RSR_PRINTED.has(q.id) && fits(q)).slice(0, PER_TOPIC);
  if (qs.length < PER_TOPIC) throw new Error(`${t.id}: ${qs.length} of ${PER_TOPIC} questions fit a card`);
  // the right answer's place: each letter once in the topic's four cards; the wrong answers shuffled around it
  const places = shuffle([0, 1, 2, 3], rnd);
  return qs.map((q, i) => {
    const wrong = shuffle(q.a.slice(1), rnd);
    const options = [0, 1, 2, 3].map(k => (k === places[i] ? q.a[0] : wrong.shift()));
    return { ...q, t, options, right: places[i] };
  });
}).map((c, i) => ({ ...c, no: i + 1 }));
const MINE = { label: 'შენი კითხვა', color: C.goldDark, icon: 'pen-line' };

// ---------- cards: the question and its four answers in front, the right one behind ----------
const dot = (k, cls = '') => `<i class="ot-dot${cls}" style="background:${INK[k]}">${OTKHI_LETTERS[k]}</i>`;
const band = t => `<div class="ot-band" style="background:${t.color}">${icon(t.icon, { size: 4.4, color: '#fff', width: 2 })}<span>${esc(t.label)}</span></div>`;
const answerBand = color => `<div class="ot-band out" style="color:${color};border-color:${color}">${icon('key-round', { size: 4.4, color, width: 2 })}<span>სწორი პასუხი</span></div>`;
const cardFront = c => `<div class="card ot"><div class="frame" style="border-color:${c.t.color}"></div>${band(c.t)}
<div class="ot-body"><div class="ot-q${len(c.q) > 85 ? ' long' : ''}"><p>${esc(c.q)}</p></div>
<ol class="ot-opts">${c.options.map((o, k) => `<li>${dot(k)}<span>${esc(o)}</span></li>`).join('')}</ol></div>
<div class="ot-foot"><span>№ ${c.no}</span><span>სწორი ზურგზეა</span></div></div>`;
const cardBack = c => `<div class="card ot"><div class="frame" style="border-color:${c.t.color}"></div>${answerBand(c.t.color)}
<div class="ot-a">${dot(c.right, ' big')}<div class="ot-ans">${esc(c.options[c.right])}</div>${c.note ? `<div class="ot-note">${esc(c.note)}</div>` : ''}</div>
<div class="ot-foot"><span>№ ${c.no}</span><span>${esc(c.t.label)}</span></div></div>`;
const blankFront = `<div class="card ot"><div class="frame" style="border-color:${MINE.color}"></div>${band(MINE)}
<div class="ot-body"><div class="ot-lines">${'<i></i>'.repeat(4)}</div>
<ol class="ot-opts">${[0, 1, 2, 3].map(k => `<li>${dot(k)}<span class="ln"></span></li>`).join('')}</ol></div>
<div class="ot-foot"><span>თემა</span><span>სწორი ზურგზეა</span></div></div>`;
const blankBack = `<div class="card ot"><div class="frame" style="border-color:${MINE.color}"></div>${answerBand(MINE.color)}
<div class="ot-a"><div class="ot-circle">შემოხაზე სწორი:</div><div class="ot-four">${[0, 1, 2, 3].map(k => dot(k)).join('')}</div>
<div class="ot-lines short"><b>განმარტება</b>${'<i></i>'.repeat(3)}</div></div>
<div class="ot-foot"><span></span><span>${esc(MINE.label)}</span></div></div>`;

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

// ---------- the teams' answer cards: a square of four corners, the letter held at the top is the team's answer ----------
const SQ = 90;
const EDGE = 3;
const corners = [
  { k: 0, pts: `${EDGE},${EDGE} ${SQ - EDGE},${EDGE} 45,45`, x: 45, y: 17, rot: 0 },
  { k: 1, pts: `${SQ - EDGE},${EDGE} ${SQ - EDGE},${SQ - EDGE} 45,45`, x: 73, y: 45, rot: 90 },
  { k: 2, pts: `${SQ - EDGE},${SQ - EDGE} ${EDGE},${SQ - EDGE} 45,45`, x: 45, y: 73, rot: 180 },
  { k: 3, pts: `${EDGE},${SQ - EDGE} ${EDGE},${EDGE} 45,45`, x: 17, y: 45, rot: 270 },
];
// seen from behind the card's right is the front's left: ბ shows on the left, დ on the right (long-edge duplex)
const behind = [
  { k: 0, x: 45, y: 10, rot: 0 },
  { k: 1, x: 10, y: 45, rot: 270 },
  { k: 2, x: 45, y: 80, rot: 180 },
  { k: 3, x: 80, y: 45, rot: 90 },
];
const square = (inner, cls) => `<svg class="${cls}" viewBox="0 0 ${SQ} ${SQ}" width="${SQ}mm" height="${SQ}mm">
<defs><clipPath id="ot-clip-${cls}"><rect x="${EDGE}" y="${EDGE}" width="${SQ - 2 * EDGE}" height="${SQ - 2 * EDGE}" rx="4.5"/></clipPath></defs>
<g clip-path="url(#ot-clip-${cls})">${inner}</g>
<rect x="${EDGE}" y="${EDGE}" width="${SQ - 2 * EDGE}" height="${SQ - 2 * EDGE}" rx="4.5" fill="none" stroke="${C.line}" stroke-width=".3"/></svg>`;
const letterAt = (k, x, y, rot, size, fill) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="700" fill="${fill}" text-anchor="middle" dominant-baseline="central" transform="rotate(${rot} ${x} ${y})">${OTKHI_LETTERS[k]}</text>`;
const answerFront = () => `<div class="ot-sq">${square(`${corners.map(c => `<polygon points="${c.pts}" fill="${INK[c.k]}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}
${corners.map(c => letterAt(c.k, c.x, c.y, c.rot, 22, '#fff')).join('')}`, 'f')}
<div class="ot-mid">${grapeEmblem(15, C.goldDark)}</div></div>`;
const answerBack = team => `<div class="ot-sq">${square(`${corners.map(c => `<polygon points="${c.pts.replace(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g, (_, x, y) => `${SQ - x},${y}`)}" fill="${INK[c.k]}" fill-opacity=".12"/>`).join('')}
${behind.map(b => `<circle cx="${b.x}" cy="${b.y}" r="5.6" fill="${INK[b.k]}"/>${letterAt(b.k, b.x, b.y, b.rot, 7.4, '#fff')}`).join('')}`, 'b')}
<div class="ot-who"><span class="ot-teamNo">გუნდი ${team + 1}</span><b>${esc(TEAM_NAMES[team])}</b><i></i>
<p>ასწიე ისე, რომ შენი პასუხის ასო <b>ზემოთ</b> იყოს.</p></div></div>`;
const teamSheet = {
  key: 'teams',
  front: gridSheet(Array.from({ length: TEAMS }, () => answerFront()), { cols: 2, rows: 3, w: SQ, h: SQ, label: `${title} · პასუხის ბარათები გუნდებისთვის`, cls: 'gsheet ot-teams' }),
  back: gridSheet(Array.from({ length: TEAMS }, (_, t) => answerBack(t)), { cols: 2, rows: 3, w: SQ, h: SQ, back: true, label: `${title} · პასუხის ბარათები — ზურგი (გუნდის მხარე)`, cls: 'gsheet ot-teams' }),
};

// ---------- the score sheet: twenty questions, six teams; the same on the back ----------
const ROWS = 20;
const scorePage = page(`<div class="ot-sc">
  <div class="ot-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="ot-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="ot-scHint">სვეტის თავში — გუნდის სახელი. სწორ ასოს — ✓ (ერთი ქულა); სწრაფ თამაშში პირველ სწორს — ✓✓. ბოლოს — ჯამი.</p>
  <table class="ot-tab">
    <tr><th class="r">კითხვა</th>${TEAM_NAMES.map(n => `<th><span>${esc(n)}</span><i></i></th>`).join('')}</tr>
    ${Array.from({ length: ROWS }, (_, r) => `<tr><td class="r">${r + 1}</td>${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>`).join('')}
    <tr class="sum"><td class="r">ჯამი</td>${TEAM_NAMES.map(() => '<td></td>').join('')}</tr>
  </table>
  <div class="ot-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="ot-remind box">
    <div>${icon('megaphone', { size: 5, color: C.wine, width: 1.8 })}<span><b>კითხვა</b> — წამყვანი კითხულობს კითხვას და ოთხივე პასუხს: ა, ბ, გ, დ.</span></div>
    <div>${icon('hourglass', { size: 5, color: C.wine, width: 1.8 })}<span><b>${OTKHI_SECONDS} წამი</b> — გუნდი ჩუმად ირჩევს და ბარათს ასოთი ზემოთ ატრიალებს.</span></div>
    <div>${icon('hand', { size: 5, color: C.wine, width: 1.8 })}<span><b>„სამი, ორი, ერთი — ასწიეთ!“</b> — ყველა ერთად; მერე ბარათს აღარ ატრიალებენ.</span></div>
    <div>${icon('key-round', { size: 5, color: '#2f7d4f', width: 2 })}<span><b>პასუხი</b> — წამყვანი კითხვის ბარათს აბრუნებს: ვისაც ზემოთ ის ასოა, +1.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'ot-scP');

// ---------- the cover and the rules ----------
const EX = CARDS[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">კლასის ვიქტორინა ქართულ ყველაფერზე: კითხვა და ოთხი პასუხი. გუნდები ჩუმად ირჩევენ და „სამი, ორი, ერთი!“ — ყველა ერთად სწევს ფერად ბარათს არჩეული ასოთი ზემოთ. სწორი ასო — ერთი ქულა.<br><b>${META}</b></div>
  <div class="ot-ex box">
    <div class="ot-exCards"><div class="ot-exCard">${cardFront(EX)}</div><div class="ot-exCard">${cardBack(EX)}</div></div>
    <div class="ot-exR">
      <h3>ასე მიდის კითხვა</h3>
      <div class="ot-step">${icon('megaphone', { size: 5.6, color: C.wine, width: 1.7 })}<span>წამყვანი კითხვას და ოთხივე პასუხს ხმამაღლა კითხულობს.</span></div>
      <div class="ot-step">${icon('hourglass', { size: 5.6, color: C.wine, width: 1.7 })}<span>${OTKHI_SECONDS} წამი — გუნდი ჩუმად ირჩევს და თავის ფერად ბარათს არჩეული ასოთი ზემოთ ატრიალებს.</span></div>
      <div class="ot-step">${icon('hand', { size: 5.6, color: C.wine, width: 1.7 })}<span>„სამი, ორი, ერთი — ასწიეთ!“ — ყველა გუნდი ერთად.</span></div>
      <div class="ot-step">${icon('key-round', { size: 5.6, color: '#2f7d4f', width: 1.9 })}<span>წამყვანი კითხვის ბარათს აბრუნებს: ზურგზე სწორი ასოა. ვისაც ზემოთ ისაა, +1.</span></div>
    </div>
  </div>
  <div class="ot-topics">${TOPICS.map(t => `<span class="ot-topic" style="border-color:${t.color}"><i style="background:${t.color}">${icon(t.icon, { size: 3.4, color: '#fff', width: 2.2 })}</i>${esc(t.label)} · ${PER_TOPIC}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>კითხვის ბარათები, სწორი პასუხი ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები შენი კითხვებისთვის</td><td>${BLANKS}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>გუნდების ბარათები, 9×9 სმ</td><td>${TEAMS}</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>საათი წამებით</td><td>1</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>კითხვის ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) და პასუხის ბარათები (${no('teams')}) — სქელ ქაღალდზე, ფერად; ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>ქულების ფურცელი (${no('score')}) — ჩვეულებრივზე, რამდენიც გინდათ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Kahoot!“-ის იდეით. კითხვები აპის ტექსტებიდანაა — შეადგინა ხელოვნურმა ინტელექტმა, მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–${TEAMS} გუნდი, თითოში 2–5 მოთამაშე. ყველა გუნდს თავისი პასუხის ბარათი აქვს — ზურგზე მისი სახელია: ${TEAM_NAMES.join(', ')}. გინდათ, ყველამ ცალ-ცალკე ითამაშოს? ბარათების ფურცელი რამდენჯერმე დაბეჭდეთ.`],
  ['წამყვანი', 'მასწავლებელი ან მოსწავლე, რომელიც არც ერთ გუნდში არ არის. კითხვის ბარათებს აურევს და დასტად იჭერს, კითხვით თავისკენ — ზურგზე სწორი პასუხია. ქულების ფურცელზე გუნდების სახელებს წერს.'],
  ['რამდენი კითხვა', 'შეთანხმდით: 8, 12 ან 20 (12 კითხვა დაახლოებით 15 წუთია). ერთი თემით გინდათ თამაში? ზოლის ფერით ამოარჩიეთ ბარათები.'],
  ['კითხვა', 'წამყვანი კითხულობს კითხვას და ოთხივე პასუხს — „ა … ბ … გ … დ …“ — ნელა და გარკვევით; საჭიროა — ორჯერ.'],
  ['ფიქრი', `${OTKHI_SECONDS} წამი. გუნდი ჩუმად თათბირობს, ირჩევს ერთ ასოს და პასუხის ბარათს ისე ატრიალებს, რომ ის ასო ზემოთ იყოს — მკერდთან, რომ სხვებმა ვერ დაინახონ. ზურგის მხარეს პატარა ასოები აჩვენებს, რომელია ზემოთ.`],
  ['ასწიეთ!', 'წამყვანი ითვლის: „სამი, ორი, ერთი — ასწიეთ!“ ყველა გუნდი ერთად სწევს ბარათს ფერადი მხარით წამყვანისკენ. აწევის მერე ბარათს აღარ ატრიალებენ.'],
  ['პასუხი', 'წამყვანი კითხვის ბარათს აბრუნებს, აჩვენებს სწორ ასოს და კითხულობს განმარტებას. ვისაც ზემოთ სწორი ასოა, ქულების ფურცელზე ✓ (ერთი ქულა).'],
  ['სწრაფი თამაში', 'როგორც აპში, სისწრაფეც ითვლება: დათვლის გარეშე, ვინც მზადაა, მაშინვე სწევს. პირველ სწორ ბარათს — ორი ქულა, დანარჩენ სწორებს — თითო. აწეულ ბარათს ვეღარ შეცვლი.'],
  ['მოგება', 'ბოლო კითხვის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი კითხვა.'],
  ['შენი კითხვები', `${BLANKS} ცარიელ ბარათზე წერეთ თქვენი: წინ — კითხვა და ოთხი პასუხი, ზურგზე — სწორის ასო შემოხაზეთ. სამი არასწორი პასუხი დამაჯერებელი უნდა იყოს!`],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ოთხიდან ერთი“ სწრაფი კლასის ვიქტორინაა: კითხვას ოთხი პასუხი აქვს და ერთია სწორი. კითხვები ქართულ ყველაფერზეა — ისტორია და გმირები, დიდი ქართველები, მწერლობა, კინო, სიმღერა და ცეკვა, სამზარეულო, სამოსი, კუთხეები, ძეგლები, ბუნება, ზღაპრები, სპორტი, მუსიკის ანბანი, წმინდანები, საღმრთო ისტორია, დღესასწაულები და გალობა.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}${/[!?]$/.test(h) ? '' : '.'}</b> ${t}</li>`).join('')}</ol></div>
  <div class="ot-fig box">
    <div class="ot-figSq">${answerFront()}</div><div class="ot-figSq">${answerBack(0)}</div>
    <div class="ot-figR">
      <h3>გუნდის ბარათი</h3>
      <p>მარცხნივ — წინა მხარე: ის <b>წამყვანისკენ</b> იწევა. ზემოთ რომელი ასოცაა, ის არის გუნდის პასუხი — აქ <b>ა</b>.</p>
      <p>მარჯვნივ — ზურგი, რომელსაც გუნდი ხედავს: პატარა ასოები ზუსტად იმ ადგილასაა, სადაც წინა მხარეზე, ასე რომ, აწევამდე ჩანს, რომელია ზემოთ.</p>
    </div>
  </div>
  <div class="ot-more box"><b>აპშიც</b> იგივე თამაშია: ონლაინ ყველა თავის ტელეფონზე ნიშნავს და სისწრაფეც ითვლება, ერთ ტელეფონზე კი წამყვანი გუნდებს ნიშნავს; „მოისმინე“ კითხვებზე სკოლის ჩანაწერის ნაწყვეტი ჟღერს — sagandzureli.ge → თამაშები → ოთხიდან ერთი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10.8pt;line-height:1.4}
.rulesP .lead{font-size:10.8pt}
.cover .lead{margin-bottom:4.5mm}
.ot-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:9mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:9.6pt;padding:0 2mm;white-space:nowrap}
.ot-band.out{background:#fff;border:.35mm solid}
.ot-body{position:absolute;left:4.6mm;right:4.6mm;top:14.6mm;bottom:10mm;display:flex;flex-direction:column;gap:2mm}
.ot-q{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;min-height:0}
.ot-q p{margin:0;font-weight:700;font-size:10.4pt;line-height:1.28;color:var(--brown)}
.ot-q.long p{font-size:9.6pt}
.ot-opts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.1mm}
.ot-opts li{display:flex;align-items:center;gap:1.8mm;min-height:6.4mm;background:#fff;border-radius:3.4mm;padding:.5mm 2mm .5mm .6mm;box-shadow:inset 0 0 0 .25mm #e3d6bf}
.ot-opts li span{font-size:9.2pt;font-weight:700;line-height:1.18;color:var(--brown)}
.ot-opts li span.ln{flex:1;align-self:flex-end;border-bottom:.25mm solid #bba98f;margin:0 1mm 1.4mm 0;height:0}
.ot-dot{flex:none;width:5.4mm;height:5.4mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-weight:800;font-size:9pt;line-height:1}
.ot-dot.big{width:15mm;height:15mm;font-size:22pt}
.ot-a{position:absolute;left:5.6mm;right:5.6mm;top:15mm;bottom:10.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:2.6mm}
.ot-ans{font-weight:800;font-size:13pt;line-height:1.22;color:var(--wine)}
.ot-note{font-size:9.4pt;line-height:1.3;color:#6f6152;border-top:.3mm solid var(--gold);padding-top:2.2mm}
.ot-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.2mm;display:flex;justify-content:space-between;align-items:baseline;font-size:9.4pt;color:var(--muted)}
.ot-foot span:first-child{font-weight:700}
.ot-lines{flex:1;display:flex;flex-direction:column;justify-content:space-around;padding:0 1mm}
.ot-lines i{display:block;border-bottom:.25mm solid #bba98f;height:0}
.ot-lines.short{flex:none;width:100%;height:24mm;text-align:left}
.ot-lines b{font-size:9.4pt;color:var(--muted);font-weight:700}
.ot-circle{font-size:10pt;font-weight:700;color:var(--brown)}
.ot-four{display:flex;gap:3mm}
.ot-four .ot-dot{width:9mm;height:9mm;font-size:14pt}
.ot-sq{position:relative;width:${SQ}mm;height:${SQ}mm}
.ot-sq svg{display:block}
.ot-sq text{font-family:'SansKa','SerifKa',sans-serif}
.ot-mid{position:absolute;left:50%;top:50%;width:19mm;height:19mm;margin:-9.5mm 0 0 -9.5mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 .3mm ${C.line}}
.ot-who{position:absolute;left:19mm;right:19mm;top:19mm;bottom:19mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1.4mm}
.ot-teamNo{font-size:9pt;color:var(--muted);font-weight:700;letter-spacing:.04em}
.ot-who>b{font-size:17pt;color:var(--wine);line-height:1.1}
.ot-who>i{display:block;width:34mm;border-bottom:.25mm solid #bba98f;height:5mm}
.ot-who p{margin:1.4mm 0 0;font-size:9pt;line-height:1.3;color:var(--brown)}
.ot-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.ot-exCards{display:flex;gap:3mm}
.ot-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.ot-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.ot-exR h3{margin:0 0 3mm}
.ot-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.ot-step svg{flex:none;margin-top:.2mm}
.ot-fig{display:grid;grid-template-columns:auto auto 1fr;gap:4mm;align-items:center;margin-top:4mm;padding:3.5mm 4.5mm}
.ot-figSq{position:relative;width:40.5mm;height:40.5mm}
.ot-figSq>.ot-sq{position:absolute;left:0;top:0;transform:scale(.45);transform-origin:0 0}
.ot-figR h3{margin:0 0 1.6mm;color:var(--wine);font-size:11pt}
.ot-figR p{margin:0 0 1.6mm;font-size:9.6pt;line-height:1.35}
.ot-topics{display:flex;flex-wrap:wrap;gap:1.6mm 1.6mm;margin:0 0 4.5mm}
.ot-topic{display:inline-flex;align-items:center;gap:1.2mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 1.9mm .5mm .6mm;font-size:8.4pt;white-space:nowrap}
.ot-topic i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.ot-sc{position:absolute;inset:12mm 12mm 12mm}
.ot-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.ot-scHead .aso{font-size:15pt;color:var(--wine);white-space:nowrap}
.ot-scHead b{font-size:14pt;color:var(--wine);white-space:nowrap}
.ot-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline;white-space:nowrap}
.ot-date i{display:inline-block;width:22mm;border-bottom:.25mm solid #bba98f}
.ot-scHint{margin:2.6mm 0 3mm;font-size:10pt;color:var(--brown)}
table.ot-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.ot-tab th,.ot-tab td{border:.25mm solid #bba98f;text-align:center}
.ot-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;padding:1.2mm .5mm 1mm}
.ot-tab th span{display:block}
.ot-tab th i{display:block;margin:2.4mm 2mm .4mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.ot-tab th.r,.ot-tab td.r{width:15mm}
.ot-tab td{height:9.2mm;font-size:12pt}
.ot-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.ot-tab tr:nth-child(odd) td:not(.r){background:#fdfaf3}
.ot-tab tr.sum td{height:12mm;background:#fbf6ec;border-top:.6mm solid var(--wine)}
.ot-tab tr.sum td.r{font-size:10pt}
.ot-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.ot-win i{flex:1;border-bottom:.3mm solid #bba98f}
.ot-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.ot-remind>div{display:flex;gap:2mm;align-items:flex-start}
.ot-remind svg{flex:none}
.ot-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  teamSheet,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
