// „ოთხი ჰანგი, ერთი სიტყვა“ on paper — the სამაგიდო variant of the app's 4 Pics 1 Word (2026-11-01): 54 cards, one for each
// of the app's puzzles by word (data/hangebiWords.ts — the groups of „ოთხეული“ under the word that names them; the songs'
// titles stay in the app, where they can be heard). In front four words of the group (picked as the app picks them,
// `sureClues`, so no other answer fits three of them) and the answer's boxes, a box a letter; behind it, for the host, the
// word and the group's other words for the bonus. The teams' answer sheets and the score sheet. The host reads the four
// words and the number of letters, the teams write the word: 2 points, a fifth word of the group +1.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.js';
import * as __d0 from '../../data/hangebiWords';
import * as __d1 from '../../utils/hangebi';
import * as __d2 from '../../utils/otkheuli';
import * as __d3 from '../../utils/amikhseni';

const { hangebiWordPuzzles, sureClues, shapeOf, lettersOf, mulberry32, shuffle } = ({ ...__d0, ...__d1, ...__d2, ...__d3 });

export const id = 'hangebi';
export const title = 'ოთხი ჰანგი, ერთი სიტყვა';
const TAG = 'ქართული · უტელეფონო';
const META = '2–6 გუნდი · 8 წლიდან · 15–25 წუთი';
const ROUNDS = 12;
const SECONDS = 30;
const RIGHT = '#2f7d4f';
const MORE = 9;

// each card's topic: its mark and colour on the card's band (no religious picture: the faith's words carry a book)
const TOPIC = {
  faith: { label: 'სარწმუნოება და გალობა', icon: 'book-open', color: C.wine },
  history: { label: 'ისტორია და კულტურა', icon: 'landmark', color: '#5f4b86' },
  land: { label: 'მიწა და ბუნება', icon: 'mountain-snow', color: '#3d6e8f' },
  home: { label: 'სახლი და სუფრა', icon: 'utensils', color: '#9a5a2a' },
  fun: { label: 'მუსიკა, ცეკვა, თამაში', icon: 'music', color: '#7a6212' },
};
const TOPIC_OF = {
  faith: ['dghesastsaulebi', 'shesamoseli', 'tsignebi', 'sagaloblis-sakheebi', 'msakhureba', 'khmebi', 'tsirvis-natsilebi', 'motsiqulebi',
    'makhareblebi', 'tsinastsarmetqvelebi', 'mtavarangelozebi', 'kartveli-tsmidanebi', 'tadzrebi', 'satnoebebi'],
  history: ['mepeebi', 'mtserlebi', 'gmirebi', 'brdzolebi', 'tsikheebi', 'damtserloba', 'mkhatvrebi', 'kompozitorebi', 'vepkhistkaosani',
    'zgaprebi', 'filmebi'],
  land: ['mdinareebi', 'mtebi', 'kalakebi', 'kutkheebi', 'istoriuli-kutkheebi', 'tskhovelebi', 'prinvelebi', 'kheebi', 'yvavilebi', 'tbebi',
    'kurortebi'],
  home: ['vazi', 'kerdzebi', 'khili', 'qveli', 'tkbileuli', 'supra', 'sadghegrdzeloebi', 'sakhli', 'natesaoba', 'khelobebi', 'kviris-dgheebi'],
  fun: ['tsekvebi', 'sakravebi', 'musikis-terminebi', 'tamashebi', 'sporti', 'chokha', 'kaba'],
};
const topicOf = gid => Object.keys(TOPIC_OF).find(t => TOPIC_OF[t].includes(gid));

// ---------- the cards: every puzzle by word but the songs' titles, mixed ----------
const ALL = hangebiWordPuzzles();
const WORDS = ALL.filter(p => !p.id.startsWith('w:songs-'));
const missing = WORDS.filter(p => !topicOf(p.id.slice(2)));
if (missing.length) throw new Error(`no topic: ${missing.map(p => p.id).join(', ')}`);
const rnd = mulberry32(20261103);
const CARDS = shuffle(WORDS, rnd).map((p, i) => {
  const clues = sureClues(p, ALL, rnd);
  return { no: i + 1, answer: p.answer, topic: topicOf(p.id.slice(2)), clues, more: p.words.filter(w => !clues.includes(w)).slice(0, MORE) };
});
if (CARDS.length % 9) throw new Error(`${CARDS.length} cards: not whole sheets`);

const TINT = [['#f3e3e4', C.wine], ['#e1ebf3', '#2b5f8a'], ['#f3e9da', '#7a4c18'], ['#e9e3f1', '#5b3f8c']];
/** a clue of two words or more goes on two lines, split at the space nearest its middle; each line shrinks to fit (`.fit`) */
const lines = w => {
  if (!w.includes(' ') || [...w].length <= 8) return [w];
  const spaces = [...w.matchAll(/ /g)].map(m => m.index);
  const at = spaces.reduce((a, b) => (Math.abs(b - w.length / 2) < Math.abs(a - w.length / 2) ? b : a));
  return [w.slice(0, at), w.slice(at + 1)];
};
const clue = w => { const ls = lines(w); return `<div class="hb-w" style="font-size:${ls.length > 1 ? 10.5 : 12}pt">${ls.map(l => `<div class="fit"><span>${esc(l)}</span></div>`).join('')}</div>`; };
const boxes = (answer, width = 52) => {
  const n = lettersOf(answer).length;
  const box = Math.min(4.8, (width - (n - 1) * 0.7) / n);
  return `<div class="hb-boxes">${[...shapeOf(answer)].map(ch => (ch === '_' ? `<i style="width:${box.toFixed(2)}mm;height:${(box * 1.2).toFixed(2)}mm"></i>` : ch === '-' ? '<b>-</b>' : '<s></s>')).join('')}</div>`;
};
const band = t => `<div class="hb-band" style="background:${TOPIC[t].color}">${icon(TOPIC[t].icon, { size: 4.2, color: '#fff', width: 2 })}<span>${TOPIC[t].label}</span></div>`;
const front = c => `<div class="card hb"><div class="frame" style="border-color:${TOPIC[c.topic].color}"></div><div class="frame2"></div>${band(c.topic)}
<div class="hb-q">რა აერთიანებს ოთხივეს?</div>
<div class="hb-grid">${c.clues.map((w, i) => `<div style="background:${TINT[i][0]};color:${TINT[i][1]}">${clue(w)}</div>`).join('')}</div>
${boxes(c.answer)}
<div class="hb-foot"><span>№ ${c.no}</span><span>${lettersOf(c.answer).length} ასო · პასუხი ზურგზეა</span></div></div>`;
const answerSize = a => ([...a].length > 12 ? 12.5 : [...a].length > 9 ? 15 : 18);
const back = c => `<div class="card hb"><div class="frame" style="border-color:${RIGHT}"></div>
<div class="hb-band out">${icon('eye-off', { size: 4.2, color: RIGHT, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="hb-label">ოთხივეს საერთო</div>
<div class="hb-ans fit" style="font-size:${answerSize(c.answer)}pt"><span>${esc(c.answer)}</span></div>
<div class="hb-four">${c.clues.map(esc).join(' · ')}</div>
${c.more.length ? `<div class="hb-more"><b>${icon('plus', { size: 3.4, color: C.goldDark, width: 2.4 })}ბონუსისთვის — კიდევ:</b><span>${c.more.map(esc).join(' · ')}</span></div>` : ''}
<div class="hb-foot"><span>№ ${c.no}</span><span>${TOPIC[c.topic].label}</span></div></div>`;

const CARD_SHEETS = CARDS.length / 9;
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = CARDS.slice(s * 9, s * 9 + 9);
  const what = `№ ${nine[0].no}–${nine[nine.length - 1].no}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — პასუხები (ზურგი)` }),
  };
});

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="hb-team">
  <div class="hb-tHead"><span class="aso">${aso('ოთხი ჰანგი')}</span><span class="hb-tName">გუნდი <i></i></span></div>
  <table class="hb-tab">
    <tr><th class="r">რაუნდი</th><th>საერთო სიტყვა</th><th>ბონუსი: კიდევ ერთი იმავე ჯგუფიდან</th><th class="p">ქულა</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td></td><td></td><td class="p"><span>2</span><span>+1</span></td></tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="hb-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'hb-tP');

const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ბარათი №',
  hint: 'გუნდის სახელი სვეტის თავში. სწორი სიტყვა — 2 ქულა (სხვა ფორმაც ითვლება: „მდინარეები“ = „მდინარე“), სხვა — 0. ვინც იმავე ჯგუფის მეხუთე სიტყვას დაწერს (ბარათის ზურგზე სიაა) — კიდევ +1.',
  remind: [
    ['megaphone', 'ბარათი', 'წამყვანი ოთხ სიტყვას კითხულობს და ასოების რაოდენობას ამბობს.'],
    ['pencil', 'პასუხი', `გუნდები ${SECONDS} წამში საერთო სიტყვას წერენ.`],
    ['check', 'ქულა', 'სწორი სიტყვა — 2, მეხუთე სიტყვა იმავე ჯგუფიდან — +1.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი ბარათი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = CARDS.find(c => c.answer === 'მდინარე') ?? CARDS[0];
const topicCount = t => CARDS.filter(c => c.topic === t).length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso('ოთხი ჰანგი')}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">მტკვარი, რიონი, არაგვი, ალაზანი — რა აერთიანებს ოთხივეს? მდინარე! წამყვანი ბარათის ოთხ სიტყვას კითხულობს, გუნდები საერთო სიტყვას ეძებენ და წერენ. ზურგზე პასუხია და იმავე ჯგუფის სხვა სიტყვები — ბონუსისთვის.</div>
  <div class="hb-ex box">
    <div class="hb-exCards"><div class="hb-exCard">${front(EX)}</div><div class="hb-exCard">${back(EX)}</div></div>
    <div class="hb-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ზედა ბარათს იღებს და ოთხ სიტყვას ხმამაღლა კითხულობს. ეუბნება, რამდენი ასოა პასუხში (უჯრები ბარათზეა).')}
      ${step('pencil', `გუნდები თათბირობენ და ${SECONDS} წამში ფურცელზე საერთო სიტყვას წერენ.`)}
      ${step('rotate-ccw', 'წამყვანი ბარათს აბრუნებს: სწორი სიტყვა — 2 ქულა.', '#2f7d4f')}
      ${step('plus', 'ბონუსი: ვინც იმავე ჯგუფის მეხუთე სიტყვასაც დაწერს — +1 (ზურგზე სიაა).', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ბარათები: ოთხი სიტყვა წინ, პასუხი ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="hb-mix">${CARDS.length} ბარათი ხუთ თემაზე: ${Object.keys(TOPIC).map(t => `${TOPIC[t].label.toLowerCase()} ${topicCount(t)}`).join(', ')}. სიტყვები საგანძურის სკოლის აპის „ოთხეულის“ ჯგუფებიდანაა; აპში ყურითაც თამაშობ — ერთი კუთხის ოთხი სიმღერის ნაწყვეტი და კუთხე უნდა იცნო.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — 4 გუნდისთვის; მეტი გუნდისთვის ორჯერ დაბეჭდე. ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია თამაშ „4 Pics 1 Word“-ის იდეით — სურათების ნაცვლად სიტყვებით. სიტყვები საგანძურის სკოლის აპისაა. მხოლოდ სასწავლო, არაკომერციული გამოყენებისთვის.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. თითო გუნდს — ფურცელი და ფანქარი.`],
  ['წამყვანი', 'მასწავლებელი ან ერთ-ერთი მოსწავლე — ის არ თამაშობს. ბარათებს აურევს და დასტად დებს, სიტყვებით ზემოთ.'],
  ['ბარათი', 'წამყვანი იღებს ზედა ბარათს, ზურგს თავისკენ იჭერს და ოთხ სიტყვას ხმამაღლა კითხულობს. ეუბნება, რამდენი ასოა პასუხში — უჯრები ბარათზეა.'],
  ['პასუხი', `გუნდები თათბირობენ და ${SECONDS} წამში ფურცელზე ერთ სიტყვას წერენ — ოთხივეს საერთოს.`],
  ['ქულა', 'წამყვანი ბარათს აბრუნებს: სწორი სიტყვა — 2 ქულა. სხვა ფორმაც ითვლება: „მდინარეები“ = „მდინარე“, „ციხეები“ = „ციხე“.'],
  ['ბონუსი', 'ვინც იმავე ჯგუფის მეხუთე სიტყვასაც დაწერს — კიდევ ერთ მდინარეს, ციხეს, ყველს — +1 ქულას იღებს. ზურგზე სიაა; წამყვანს სხვა სწორი სიტყვის ჩათვლაც შეუძლია.'],
  ['მოგება', `${ROUNDS} ბარათის (ან შეთანხმებული დროის) მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი ბარათი.`],
  ['სათითაოდ', 'უფრო რთულად: წამყვანი სიტყვებს სათითაოდ კითხულობს. გუნდი, რომელიც პასუხს ადრე დაწერს და ხელს ასწევს, მეტს იღებს: პირველ სიტყვაზე — 4, მეორეზე — 3, მესამეზე — 2, ოთხივეზე — 1. მცდარი პასუხი — ამ ბარათზე გუნდი აღარ პასუხობს.'],
  ['უფრო მარტივად', 'პატარებთან: წამყვანი პასუხის პირველ ასოსაც ამბობს.'],
  ['თქვენი ოთხეული', 'ბოლოს თითო გუნდი თავად მოიფიქრებს ოთხ სიტყვას ერთ თემაზე და სხვებს გამოაცნობს.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso('ოთხი ჰანგი')}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ოთხი ჰანგი, ერთი სიტყვა“ სიტყვების თამაშია: ოთხი სიტყვა ერთ საერთოს მალავს — მდინარეებს, ციხეებს, ყველს, ფილმებს, კომპოზიტორებს, დღესასწაულებს… რაც მეტი იცი საქართველოზე, მით ადვილად გამოიცნობ.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ოთხი სიტყვა ან ერთი კუთხის ოთხი სიმღერის ნაწყვეტი, პასუხს ტელეფონზე ასოებით აწყობ — რაც უფრო მალე, მით მეტი ქულა; მარტო (ათი თავსატეხი და შენი რეკორდი), ონლაინ კლასთან ერთად, ან ერთი ტელეფონით, გუნდებად.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.hb-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:9.6mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.4mm;background:var(--wine);color:#fff;font-weight:700;font-size:9.6pt;padding:0 2mm;white-space:nowrap;z-index:1}
.hb-band.out{background:#fff;border:.35mm solid ${RIGHT};color:${RIGHT}}
.hb-q{position:absolute;left:5mm;right:5mm;top:15.6mm;text-align:center;font-size:9pt;font-weight:700;color:var(--muted)}
.hb-grid{position:absolute;left:5.2mm;right:5.2mm;top:21mm;height:41mm;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-rows:minmax(0,1fr) minmax(0,1fr);gap:1.6mm}
.hb-grid>div{min-width:0;overflow:hidden;border-radius:2mm;display:flex;align-items:center;justify-content:center;text-align:center;padding:1mm 1.2mm}
.hb-w{width:100%;font-family:'SansKa',sans-serif;font-weight:900;line-height:1.15}
.hb-w .fit{width:100%;text-align:center}
.hb-boxes{position:absolute;left:5mm;right:5mm;top:65.4mm;display:flex;justify-content:center;align-items:center;gap:.7mm}
.hb-boxes i{display:block;border:.3mm solid #b9a68a;border-radius:.8mm;background:#fff}
.hb-boxes s{display:block;width:2.2mm}
.hb-boxes b{font-size:10pt;color:var(--muted);margin:0 .2mm}
.hb-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:flex-end;gap:3mm;font-size:9pt;color:var(--muted);z-index:1}
.hb-foot span:first-child{font-weight:700;white-space:nowrap}
.hb-foot span:last-child{text-align:right}
.hb-label{position:absolute;left:5mm;right:5mm;top:17mm;text-align:center;font-size:9pt;font-weight:700;color:var(--muted)}
.hb-ans{position:absolute;left:4.6mm;right:4.6mm;top:21.6mm;text-align:center;font-family:'SansKa',sans-serif;font-weight:900;line-height:1.1;color:${RIGHT}}
.hb-four{position:absolute;left:5.6mm;right:5.6mm;top:33mm;text-align:center;font-size:9pt;line-height:1.3;color:var(--brown)}
.hb-more{position:absolute;left:5.4mm;right:5.4mm;top:47mm;bottom:11mm;border-top:.25mm solid var(--line);padding-top:2mm;font-size:8.8pt;line-height:1.32;color:var(--brown)}
.hb-more b{display:flex;align-items:center;gap:1mm;color:var(--gold2);font-size:8.6pt;margin-bottom:.8mm}
.hb-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.hb-exCards{display:flex;gap:3mm}
.hb-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.hb-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.hb-exR h3{margin:0 0 3mm}
.hb-mix{margin:2.4mm 0 0;font-size:9pt;line-height:1.35;color:var(--brown)}
.hb-team{height:148.5mm;padding:9mm 12mm 4mm;position:relative}
.hb-cut{position:absolute;left:6mm;right:6mm;top:148.5mm;border-top:.3mm dashed #b3a593}
.hb-tHead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm;margin-bottom:3mm}
.hb-tHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.hb-tName{flex:1;display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine)}
.hb-tName i{flex:1;border-bottom:.3mm solid #bba98f}
table.hb-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.hb-tab th,.hb-tab td{border:.25mm solid #bba98f;padding:0 1.6mm}
.hb-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:7mm;text-align:left}
.hb-tab td{height:9mm}
.hb-tab .r{width:17mm;text-align:center}
.hb-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.hb-tab .p{width:24mm;text-align:center}
.hb-tab td.p{white-space:nowrap}
.hb-tab td.p span{display:inline-flex;min-width:6mm;height:6mm;padding:0 .6mm;border-radius:3mm;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .45mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'teams', front: teamPage, back: teamPage },
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
