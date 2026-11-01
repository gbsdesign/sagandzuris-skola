// „ერთი მინიშნება“ on paper (2026-11-01, like Just One): 60 cards of five numbered words — 300 plain nouns hand-picked from
// the app's „ამიხსენი“ bank (`data/amikhseniWords.ts`, eleven themes, five different ones on every card) — three blank cards,
// eight clue boards (a player's number and colour; the back is the board turned down), a score sheet (ten games a side) with
// the app's own scale (`joVerdict`), the cover and the rules. A game is the app's thirteen cards (`JO_CARDS`).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { WORD_CATEGORIES, JO_CARDS, joVerdict, mulberry32, shuffle } = await appData({
  'data/amikhseniWords.ts': ['WORD_CATEGORIES'],
  'utils/minishneba.ts': ['JO_CARDS', 'joVerdict'],
  'utils/otkheuli.ts': ['mulberry32', 'shuffle'],
});

export const id = 'erti-minishneba';
export const title = 'ერთი მინიშნება';
const TAG = 'ცოცხალი · უტელეფონო';
const META = '3–8 მოთამაშე, ყველა ერთ გუნდად · 8 წლიდან · 20 წუთი';

// The words: plain nouns one clue can carry, from eleven of the bank's themes (its names of people, songs and saints are
// left out); the build stops if a word has left the bank or comes twice.
const PICK = {
  samzareulo: ['ხინკალი', 'ხაჭაპური', 'ლობიანი', 'კუბდარი', 'მჭადი', 'ღომი', 'ელარჯი', 'სულგუნი', 'მაწონი', 'საცივი', 'ტყემალი',
    'აჯიკა', 'ჩახოხბილი', 'ხარჩო', 'მწვადი', 'ფხალი', 'ლობიო', 'ჩურჩხელა', 'გოზინაყი', 'ქადა', 'შოთი', 'თონე', 'ქვევრი', 'მარანი',
    'რთველი', 'ყურძენი', 'ყანწი', 'თამადა', 'სადღეგრძელო', 'ნიგოზი', 'ტარხუნა', 'შამფური'],
  buneba: ['ხოხობი', 'ჯიხვი', 'ირემი', 'მგელი', 'დათვი', 'მელა', 'კურდღელი', 'ზღარბი', 'ციყვი', 'არწივი', 'შევარდენი', 'ბუ',
    'მერცხალი', 'ბულბული', 'კალმახი', 'დელფინი', 'ფუტკარი', 'ჭიანჭველა', 'პეპელა', 'ბაყაყი', 'კუ', 'ნაგაზი', 'ცხენი', 'მუხა',
    'ნაძვი', 'წაბლი', 'ბროწეული', 'ლეღვი', 'ია', 'ყაყაჩო', 'ჩანჩქერი', 'მყინვარი', 'ცისარტყელა', 'ნისლი'],
  sakravebi: ['ჩონგური', 'ფანდური', 'დოლი', 'გარმონი', 'ჭუნირი', 'ჩანგი', 'სალამური', 'ჭიანური', 'დუდუკი', 'გუდასტვირი', 'დაირა',
    'დიპლიპიტო', 'სტვირი', 'ზურნა', 'სიმი'],
  kutkhe: ['აფხაზეთი', 'სვანეთი', 'სამეგრელო', 'იმერეთი', 'გურია', 'აჭარა', 'კახეთი', 'ხევსურეთი', 'ფშავი', 'თუშეთი', 'რაჭა',
    'მესხეთი', 'მცხეთა', 'თბილისი', 'ქუთაისი', 'ბათუმი', 'ვარძია', 'უშგული', 'შატილი', 'ყაზბეგი', 'ანანური', 'უფლისციხე', 'ნარიყალა',
    'მტკვარი', 'რიონი', 'ალაზანი', 'კავკასიონი', 'ბორჯომი', 'სიღნაღი', 'თელავი', 'მესტია', 'ბაკურიანი'],
  samosi: ['ჩოხა', 'ახალუხი', 'ქამარი', 'ხანჯალი', 'ფაფახი', 'ყაბალახი', 'კაბა', 'გულისპირი', 'სარტყელი', 'ლეჩაქი', 'ნაბადი',
    'ქალამანი', 'მანდილი', 'თავსაფარი', 'ქუდი', 'მოსასხამი', 'ფარი', 'ხმალი', 'ისარი', 'პერანგი', 'ღილი', 'ჯიბე', 'საყელო', 'სახელო', 'ჩექმა'],
  sporti: ['ჭიდაობა', 'ლელობურთი', 'ჯირითი', 'რაგბი', 'ფეხბურთი', 'კალათბურთი', 'ძალოსნობა', 'ძიუდო', 'ჭადრაკი', 'ნარდი', 'დომინო',
    'კრივი', 'ცურვა', 'ალპინიზმი', 'თხილამური', 'ციგა', 'ველოსიპედი', 'ბურთი', 'გოლი', 'მეკარე', 'მსაჯი', 'სტადიონი', 'მედალი',
    'ოლიმპიადა', 'ჩემპიონი', 'თასი', 'დამალობანა', 'ფარიკაობა'],
  qopa: ['ქორწილი', 'მაყარი', 'ნეფე', 'დედოფალი', 'ბებია', 'ბაბუა', 'ოჯახი', 'კერა', 'ბუხარი', 'ბაღი', 'ბოსტანი', 'გუთანი', 'ხარი',
    'ცხვარი', 'მწყემსი', 'ძროხა', 'თხა', 'მეზობელი', 'სტუმარი', 'მასპინძელი', 'საჩუქარი', 'ბაზარი', 'მჭედელი', 'მეთევზე', 'მონადირე',
    'ხიდი', 'კოვზი', 'აკვანი', 'ურემი', 'მეგობარი'],
  musika: ['ნოტა', 'რიტმი', 'მელოდია', 'აკორდი', 'ოქტავა', 'დირიჟორი', 'სოლო', 'დუეტი', 'ტრიო', 'ანსამბლი', 'რეპეტიცია', 'კონცერტი',
    'ბანი', 'მთქმელი', 'კრიმანჭული', 'მიკროფონი', 'სცენა', 'ტაში', 'ნანა', 'ხორუმი', 'ცეკვა', 'მომღერალი', 'ყურსასმენი', 'კომპოზიტორი',
    'ლეკური', 'ბალეტი', 'ბალერინა', 'მოცეკვავე'],
  istoria: ['ანბანი', 'ასომთავრული', 'ამირანი', 'კოლხეთი', 'იბერია', 'დიდგორი', 'მეფე', 'ტახტი', 'გვირგვინი', 'ციხე', 'კოშკი',
    'ლაშქარი', 'დროშა', 'გერბი', 'ჰიმნი', 'ხელნაწერი', 'ბიბლიოთეკა', 'ზღაპარი', 'ლექსი', 'ანდაზა', 'გამოცანა', 'ნაცარქექია', 'დევი',
    'მზეთუნახავი', 'არგონავტები', 'მუზეუმი'],
  galoba: ['საგალობელი', 'ტროპარი', 'მგალობელი', 'გუნდი', 'რეგენტი', 'წირვა', 'მწუხრი', 'ცისკარი', 'ფსალმუნი', 'სახარება', 'სანთელი',
    'საკმეველი', 'კანდელი', 'ზარი', 'სამრეკლო', 'მღვდელი', 'დიაკონი', 'ბერი', 'მონასტერი', 'აღდგომა', 'შობა', 'ნათლისღება', 'მარხვა',
    'ალილო', 'ანგელოზი', 'ლოცვა', 'ნათლია', 'ნათლობა'],
  kino: ['მიმინო', 'კინ-ძა-ძა', 'ხანუმა', 'ფიროსმანი', 'სუხიშვილები', 'მსახიობი', 'რეჟისორი', 'კადრი', 'კინოთეატრი', 'პრემიერა', 'აფიშა',
    'ფარდა', 'მულტფილმი', 'კომედია', 'ტრაგედია', 'მხატვარი', 'ფუნჯი', 'ქანდაკება', 'მოზაიკა', 'მინანქარი', 'გამოფენა', 'ბორჯღალი'],
};
const CARD_COUNT = 60;
const PER_CARD = 5;

/** The sixty cards: every card takes the five themes with the most words left (ties by a fixed draw), so no card has two
 * words of one theme; the five then stand in a fixed shuffle, so a number is not a theme. */
const buildDeck = () => {
  const lists = {}, seen = new Set();
  Object.entries(PICK).forEach(([key, words], n) => {
    const cat = WORD_CATEGORIES.find(c => c.id === key);
    if (!cat) throw new Error(`no theme ${key}`);
    for (const w of words) {
      if (!cat.words.includes(w)) throw new Error(`${w}: not in the bank's ${key}`);
      if (seen.has(w)) throw new Error(`${w}: twice`);
      seen.add(w);
    }
    lists[key] = shuffle(words, mulberry32(4241 * (n + 1)));
  });
  if (seen.size !== CARD_COUNT * PER_CARD) throw new Error(`${seen.size} words for ${CARD_COUNT} cards`);
  const rnd = mulberry32(2026);
  return Array.from({ length: CARD_COUNT }, (_, i) => {
    const keys = Object.keys(lists).map(k => ({ k, left: lists[k].length, r: rnd() }))
      .sort((a, b) => b.left - a.left || a.r - b.r).slice(0, PER_CARD).map(x => x.k);
    const words = keys.map(k => {
      const w = lists[k].shift();
      if (!w) throw new Error(`card ${i + 1}: ${k} ran out`);
      return w;
    });
    return { no: i + 1, words: shuffle(words, mulberry32(97 * (i + 1))) };
  });
};
const DECK = buildDeck();
const PER_SHEET = 9;
const SHEETS_OF_CARDS = Math.ceil(DECK.length / PER_SHEET);
const BLANKS = SHEETS_OF_CARDS * PER_SHEET - DECK.length;
const W = 63, H = 88;
// the five numbers' colours, as on the original's cards
const NUM = ['#2f7d4f', '#c7701e', '#b23a48', '#6b4c9a', '#2f5d8a'];

// ---------- cards ----------
const cardFront = (c, mark = -1) => `<div class="jo-card"><div class="jo-frame"></div>
<div class="jo-head">${icon('lightbulb', { size: 3.8, color: '#f0d9a0', width: 1.9 })}<span class="aso">${aso(title)}</span><b>№${c.no}</b></div>
<ol class="jo-list">${c.words.map((w, i) => `<li class="${i === mark ? 'on' : ''}" style="--n:${NUM[i]}"><i>${i + 1}</i><div class="fit jo-w"><span>${esc(w)}</span></div></li>`).join('')}</ol></div>`;
const blankFront = () => `<div class="jo-card"><div class="jo-frame"></div>
<div class="jo-head">${icon('lightbulb', { size: 3.8, color: '#f0d9a0', width: 1.9 })}<span>შენი ბარათი</span><b>№</b></div>
<ol class="jo-list">${NUM.map((n, i) => `<li style="--n:${n}"><i>${i + 1}</i><div class="jo-line"></div></li>`).join('')}</ol></div>`;
const cardBack = () => `<div class="jo-card jo-back"><div class="jo-frame"></div>
<div class="jo-ring">${icon('lightbulb', { size: 11, color: C.gold, width: 1.3 })}</div>
<div class="fit jo-mark aso"><span>${aso(title)}</span></div><div class="jo-sub">${esc(SERIES)}</div>
<div class="jo-nums">${NUM.map((n, i) => `<i style="background:${n}">${i + 1}</i>`).join('')}</div></div>`;

const cardSheets = Array.from({ length: SHEETS_OF_CARDS }, (_, s) => {
  const slots = Array.from({ length: PER_SHEET }, (_, i) => DECK[s * PER_SHEET + i] ?? null);
  const nos = slots.filter(Boolean).map(c => c.no);
  const label = `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — №${nos[0]}–${nos[nos.length - 1]}${slots.some(c => !c) ? ' და ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(slots.map(c => (c ? cardFront(c) : blankFront())), { cols: 3, rows: 3, w: W, h: H, label, cls: 'gsheet jo-sheet' }),
    back: gridSheet(slots.map(() => cardBack()), { cols: 3, rows: 3, w: W, h: H, back: true, label: `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ზურგი`, cls: 'gsheet jo-sheet' }),
  };
});

// ---------- the clue boards: eight, a player's number and colour; the back = turned down ----------
const PLAYER = ['#7a2028', '#2f7d4f', '#2f5d8a', '#c7701e', '#6b4c9a', '#1c7f86', '#b0475f', '#5a4636'];
const BW = 100, BH = 140;
const boardFront = n => `<div class="jo-board" style="--c:${PLAYER[n]}"><div class="jo-bframe"></div>
<div class="jo-btop"><i>${n + 1}</i><div><b>ჩემი მინიშნება</b><span>დაწერე ფარულად</span></div>${icon('lightbulb', { size: 8, color: PLAYER[n], width: 1.6 })}</div>
<div class="jo-write"><em></em></div>
<div class="jo-brules">
  <div>${icon('check', { size: 4.2, color: '#2f7d4f', width: 2.6 })}<span>ერთი სიტყვა — რიცხვიც, „ბუმ!“-იც</span></div>
  <div>${icon('x', { size: 4.2, color: '#b23a48', width: 2.6 })}<span>არა: თვითონ სიტყვა, მისი ნაწილი ან ერთძირიანი</span></div>
  <div>${icon('copy-x', { size: 4.2, color: C.wine, width: 2 })}<span>ერთნაირი — ორივე ყირაზე</span></div>
</div></div>`;
const boardBack = n => `<div class="jo-board jo-bback" style="--c:${PLAYER[n]}"><div class="jo-bframe"></div>
<div class="jo-bnum">${n + 1}</div>
<div class="jo-bring">${icon('lightbulb', { size: 13, color: '#fff', width: 1.3 })}</div>
<div class="fit jo-bmark aso"><span>${aso(title)}</span></div>
<div class="jo-bsub">${esc(SERIES)}</div></div>`;
const boardSheets = [0, 1].map(s => {
  const ns = [0, 1, 2, 3].map(i => s * 4 + i);
  return {
    key: `boards${s + 1}`,
    front: gridSheet(ns.map(boardFront), { cols: 2, rows: 2, w: BW, h: BH, label: `${title} · მინიშნების დაფები ${ns[0] + 1}–${ns[3] + 1}`, cls: 'gsheet jo-sheet' }),
    back: gridSheet(ns.map(boardBack), { cols: 2, rows: 2, w: BW, h: BH, back: true, label: `${title} · მინიშნების დაფები ${ns[0] + 1}–${ns[3] + 1} — ზურგი`, cls: 'gsheet jo-sheet' }),
  };
});

// ---------- the score sheet: ten games, thirteen cards each; the app's scale ----------
const GAMES = 10;
const SCALE = [[13, '13'], [12, '12'], [11, '11'], [10, '9–10'], [8, '7–8'], [6, '4–6'], [3, '0–3']];
const scorePage = page(`<div class="jo-sc">
  <div class="jo-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="jo-class">კლასი <i></i></span></div>
  <div class="jo-legend">
    <span><b class="m ok">✓</b> გამოიცნო</span><span><b class="m bad">✗</b> შეცდა</span><span><b class="m">—</b> დაიკარგა</span><span><b class="m">○</b> „არ ვიცი“</span>
  </div>
  <table class="jo-tab">
    <tr><th class="g">№</th><th class="d">თარიღი</th><th class="p">ვინ ითამაშა</th>${Array.from({ length: JO_CARDS }, (_, i) => `<th class="c">${i + 1}</th>`).join('')}<th class="s">ჯამი</th></tr>
    ${Array.from({ length: GAMES }, (_, r) => `<tr><td class="g">${r + 1}</td><td></td><td></td>${Array.from({ length: JO_CARDS }, () => '<td class="c"></td>').join('')}<td class="s"></td></tr>`).join('')}
  </table>
  <div class="jo-scale box"><b>რამდენი გამოიცანით ${JO_CARDS}-დან?</b>
    <div class="jo-scaleRow">${SCALE.map(([s, l]) => `<span><em>${l}</em>${esc(joVerdict(s))}</span>`).join('')}</div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'jo-scP');

// ---------- the cover and the rules ----------
const EX_WORD = 'ხინკალი';
const EXAMPLE = DECK.find(c => c.words.includes(EX_WORD));
const EX_MARK = EXAMPLE.words.indexOf(EX_WORD);
const EX_CLUES = [['ცომი', true], ['ნაოჭი', false], ['ცომი', true], ['ფშავი', false], ['ხორცი', false]];
const miniBoard = ([w, gone], i) => `<div class="jo-mini${gone ? ' gone' : ''}" style="--c:${PLAYER[i + 1]}"><i>${i + 2}</i><span>${esc(w)}</span></div>`;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ერთი გამოიცნობს, დანარჩენები თითო სიტყვას წერენ — ოღონდ ერთნაირი მინიშნებები ქრება! ამიტომ ყველამ ისეთი უნდა მოიფიქროს, რაც სხვას აზრად არ მოუვა. ყველა ერთ გუნდშია: ცამეტი ბარათიდან რაც მეტს გამოიცნობთ, მით უკეთესი. ${DECK.length} ბარათი, ${DECK.length * PER_CARD} სიტყვა — სუფრიდან სპორტამდე, საკრავებიდან გალობამდე.<br><b>${META}</b></div>
  <div class="jo-ex box">
    <div class="jo-exCard">${cardFront(EXAMPLE, EX_MARK)}</div>
    <div class="jo-exR">
      <h3>ასე მიდის ერთი ბარათი</h3>
      <div class="jo-step">${icon('eye-off', { size: 6, color: C.wine, width: 1.7 })}<span>გამომცნობი ბარათს შუბლთან იჭერს — თვითონ არ უყურებს — და ამბობს: „${EX_MARK + 1}!“ სხვები კითხულობენ: „${esc(EX_WORD)}“.</span></div>
      <div class="jo-step">${icon('pencil', { size: 6, color: C.wine, width: 1.7 })}<span>ყველა ფარულად წერს თავის დაფაზე ერთ სიტყვას:</span></div>
      <div class="jo-minis">${EX_CLUES.map(miniBoard).join('')}</div>
      <div class="jo-step">${icon('copy-x', { size: 6, color: '#b23a48', width: 1.7 })}<span>ორი „ცომი“ ერთნაირია — ორივე დაფა ყირაზე. გამომცნობი ხედავს: ნაოჭი, ფშავი, ხორცი.</span></div>
      <div class="jo-step">${icon('check', { size: 6, color: '#2f7d4f', width: 2.4 })}<span>„${esc(EX_WORD)}!“ — სწორია, ბარათი მოგებულია.</span></div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ბარათები, 5 სიტყვით</td><td>${DECK.length}</td><td>${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები — თქვენი სიტყვებისთვის</td><td>${BLANKS}</td><td>${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>მინიშნების დაფები, 1–8</td><td>8</td><td>${no('boards1')}–${no('boards2')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>ფანქარი და საშლელი თითოს</td><td>8</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი ${W}×${H} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}) და დაფები (${no('boards1')}–${no('boards2')}) — 250–300 გ მუყაოზე, ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>დაფაზე ფანქრით წერენ და შლიან; გამჭვირვალე ფაილში ჩადებულზე — წაშლადი მარკერით.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Just One“-ის იდეით; სიტყვები აპის „ამიხსენი“-ს ბანკიდანაა, საგანძურის სკოლისთვის Claude-მა შეარჩია და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['მომზადება', `ყველა იღებს დაფას და ფანქარს. ბარათები აურიეთ, ${JO_CARDS} დადეთ დასტად, ზურგით ზემოთ — ეს ერთი თამაშია; დანარჩენი გადადეთ. ყველა ერთ გუნდშია: ერთად იგებთ ან ერთად აგებთ.`],
  ['გამომცნობი', 'ერთი გამომცნობია, ყოველ ბარათზე — შემდეგი, წრეზე. იღებს ზედა ბარათს ისე, რომ არ დახედოს, და შუბლთან იჭერს (ან წიგნზე აყუდებს) სხვებისკენ.'],
  ['რიცხვი', 'გამომცნობი ზურგზე ხუთ ფერად რიცხვს ხედავს და ერთს ამბობს, 1-დან 5-მდე. დანარჩენები იმ რიცხვის სიტყვას კითხულობენ. ვინმემ არ იცის ეს სიტყვა? თქვას — გამომცნობი სხვა რიცხვს ირჩევს.'],
  ['მინიშნება', 'ყველა დანარჩენი ფარულად, უხმოდ, თავის დაფაზე ერთ სიტყვას წერს — ისეთს, რაც გამომცნობს სიტყვამდე მიიყვანს. ერთი სიტყვაა რიცხვიც („7“), შორისდებულიც („ბუმ!“) და აბრევიატურაც.'],
  ['არ შეიძლება', 'თვითონ სიტყვა, მისი ნაწილი ან ერთძირიანი (ხაჭაპური → „ხაჭო“, მეფე → „მეფობა“), სხვა ენაზე თარგმანი, განზრახ დამახინჯებული სიტყვა. ასეთი მინიშნებაც ქრება.'],
  ['შემოწმება', 'გამომცნობი თვალებს ხუჭავს. დანარჩენები ერთმანეთს დაფებს აჩვენებენ: ერთნაირი მინიშნებები — მათ შორის ერთი სიტყვის ფორმები, მრავლობითი, ერთძირიანი („ცომი“ და „ცომები“) — ყველა ყირაზე, ერთიც არ რჩება. წესის დამრღვევიც ყირაზე.'],
  ['გამოცნობა', 'გამომცნობი თვალს ახელს, დარჩენილ მინიშნებებს კითხულობს და ერთხელ ცდის. სწორია — ბარათი მოგებულთა გროვაში. შეცდა — ეს ბარათი და დასტის ზედა ბარათიც გადადის (დაიკარგა). „არ ვიცი“ — მხოლოდ ეს ბარათი გადადის.'],
  ['ბოლო ბარათი', 'ბოლო ბარათზე შეცდომა მოგებულთა გროვიდან ერთს წაიღებს — დასტაში ხომ აღარაფერია.'],
  ['ქულა', `დასტა რომ დამთავრდება, მოგებულები დაითვალეთ და ფურცელზე ჩაწერეთ: ${JO_CARDS} — უნაკლო, 11–12 — საოცარი, 7–10 — კარგი; ნაკლები — კიდევ სცადეთ!`],
  ['სამნი თუ ხართ', 'ორი მომნიშნავი თითო ბარათზე ორ-ორ მინიშნებას წერს, ორ დაფაზე — ასე ოთხი მინიშნება იქნება. პატარებთან: გამომცნობს ორი ცდა აქვს.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ერთი მინიშნება“ ერთობლივი თამაშია: ყველა ერთად ცდილობს, გამომცნობმა სიტყვა გამოიცნოს. ძნელი ის არის, რომ ერთნაირი მინიშნებები ქრება — ყველაზე ადვილი სიტყვა, რომელიც ყველას ერთად მოუვა თავში, არავის რჩება. ამიტომ ყველამ თავისი გზა უნდა იპოვოს.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="jo-more box"><b>აპშიც</b> იგივე თამაშია: ერთი ტელეფონი წრეზე გადადის, ყველა თავის მინიშნებას ფარულად წერს, ერთნაირებს ტელეფონი თვითონ შლის; მარტოც შეგიძლია — ცამეტი სიტყვა, მინიშნებები უკვე დაწერილია — sagandzureli.ge → თამაშები → ერთი მინიშნება</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.jo-card{position:absolute;inset:0;overflow:hidden;background:var(--paper)}
.jo-frame{position:absolute;inset:1.6mm;border:.45mm solid var(--wine);border-radius:2.4mm}
.jo-head{position:absolute;left:3mm;right:3mm;top:3mm;height:9mm;border-radius:1.6mm;background:var(--wine);display:flex;align-items:center;gap:1.4mm;padding:0 2.2mm;color:#f0d9a0}
.jo-head .aso,.jo-head>span{flex:1;min-width:0;font-size:7pt;letter-spacing:.06em;white-space:nowrap}
.jo-head>span:not(.aso){font-family:'SerifKa',serif;font-weight:700;font-size:8pt;letter-spacing:0}
.jo-head b{font-size:8.5pt;color:#fff}
.jo-list{position:absolute;left:3mm;right:3mm;top:13.6mm;bottom:3.2mm;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:1.1mm}
.jo-list li{flex:1;display:flex;align-items:center;gap:2mm;padding:0 2mm 0 1.6mm;border-radius:1.6mm;background:color-mix(in srgb,var(--n) 9%,#fff);border:.25mm solid color-mix(in srgb,var(--n) 30%,#fff)}
.jo-list li>i{flex:none;width:7.4mm;height:7.4mm;border-radius:50%;background:var(--n);color:#fff;font-style:normal;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif}
.jo-w{flex:1;min-width:0;text-align:center;font-family:'SerifKa',serif;font-weight:800;font-size:14.5pt;line-height:1;color:var(--brown)}
.jo-list li.on{background:color-mix(in srgb,var(--n) 22%,#fff);border:.6mm solid var(--n)}
.jo-line{flex:1;border-bottom:.3mm solid #bba98f;height:6mm}
.jo-back{background:var(--wine)}
.jo-back .jo-frame{border-color:var(--gold);border-width:.3mm;inset:2.6mm;opacity:.9}
.jo-ring{position:absolute;left:50%;top:13mm;transform:translateX(-50%);width:21mm;height:21mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.jo-mark{position:absolute;left:6mm;right:6mm;top:39mm;text-align:center;font-size:11pt;color:#f0d9a0;letter-spacing:.05em}
.jo-sub{position:absolute;left:0;right:0;top:47mm;text-align:center;font-size:5.6pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.jo-nums{position:absolute;left:0;right:0;bottom:9mm;display:flex;justify-content:center;gap:1.6mm}
.jo-nums i{width:7mm;height:7mm;border-radius:50%;color:#fff;font-style:normal;font-weight:800;font-size:10pt;display:flex;align-items:center;justify-content:center;border:.3mm solid #f0d9a0;font-family:'SansKa',sans-serif}
.jo-board{position:absolute;inset:0;overflow:hidden;background:#fff}
.jo-bframe{position:absolute;inset:2.5mm;border:.8mm solid var(--c);border-radius:4mm}
.jo-btop{position:absolute;left:7mm;right:7mm;top:7mm;display:flex;align-items:center;gap:3mm}
.jo-btop>i{flex:none;width:12mm;height:12mm;border-radius:50%;background:var(--c);color:#fff;font-style:normal;font-weight:800;font-size:17pt;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif}
.jo-btop>div{flex:1;display:flex;flex-direction:column;line-height:1.2}
.jo-btop b{font-size:13pt;color:var(--c)}
.jo-btop span{font-size:9pt;color:var(--muted)}
.jo-write{position:absolute;left:7mm;right:7mm;top:24mm;bottom:31mm;border:.35mm dashed color-mix(in srgb,var(--c) 55%,#fff);border-radius:3mm;background:color-mix(in srgb,var(--c) 4%,#fff)}
.jo-write em{position:absolute;left:6mm;right:6mm;bottom:22mm;border-bottom:.35mm solid color-mix(in srgb,var(--c) 40%,#fff)}
.jo-brules{position:absolute;left:7mm;right:7mm;bottom:7mm;display:flex;flex-direction:column;gap:1.3mm;font-size:8.6pt;line-height:1.2;color:var(--brown)}
.jo-brules>div{display:flex;align-items:center;gap:1.8mm}
.jo-brules svg{flex:none}
.jo-bback{background:var(--c)}
.jo-bback .jo-bframe{border:.35mm solid rgba(255,255,255,.75);inset:4mm}
.jo-bnum{position:absolute;left:0;right:0;top:14mm;text-align:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:54pt;line-height:1;color:#fff}
.jo-bring{position:absolute;left:50%;top:50mm;transform:translateX(-50%);width:28mm;height:28mm;border-radius:50%;border:.35mm solid rgba(255,255,255,.8);display:flex;align-items:center;justify-content:center}
.jo-bmark{position:absolute;left:10mm;right:10mm;top:86mm;text-align:center;font-size:15pt;color:#fff;letter-spacing:.05em}
.jo-bsub{position:absolute;left:0;right:0;top:96mm;text-align:center;font-size:8pt;color:#fff;opacity:.85;letter-spacing:.08em}
.jo-ex{display:grid;grid-template-columns:${W}mm 1fr;gap:7mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.jo-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.4mm;overflow:hidden}
.jo-exR h3{margin:0 0 3mm}
.jo-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.4mm}
.jo-step svg{flex:none;margin-top:.4mm}
.jo-minis{display:flex;flex-wrap:wrap;gap:1.6mm;margin:0 0 2.8mm 9mm}
.jo-mini{display:inline-flex;align-items:center;gap:1.2mm;border:.4mm solid var(--c);border-radius:1.6mm;padding:.8mm 2.2mm .8mm .8mm;background:#fff;font-weight:700;font-size:10pt}
.jo-mini i{width:4.6mm;height:4.6mm;border-radius:50%;background:var(--c);color:#fff;font-style:normal;font-size:7.5pt;display:inline-flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif}
.jo-mini.gone{opacity:.55;background:#f1e8d9}
.jo-mini.gone span{text-decoration:line-through;text-decoration-thickness:.35mm}
.jo-sc{position:absolute;inset:12mm 10mm 12mm}
.jo-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.jo-scHead .aso{font-size:15pt;color:var(--wine)}
.jo-scHead b{font-size:14pt;color:var(--wine)}
.jo-class{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.jo-class i{display:inline-block;width:34mm;border-bottom:.25mm solid #bba98f}
.jo-legend{display:flex;gap:6mm;flex-wrap:wrap;font-size:10pt;margin:3.5mm 0}
.jo-legend .m{display:inline-block;width:5mm;text-align:center;color:var(--brown)}
.jo-legend .m.ok{color:#2f7d4f}
.jo-legend .m.bad{color:#b23a48}
table.jo-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.jo-tab th,.jo-tab td{border:.25mm solid #bba98f;text-align:center}
.jo-tab th{background:var(--parch);color:var(--wine);font-size:9pt;padding:1.2mm .3mm}
.jo-tab th.g,.jo-tab td.g{width:8mm}
.jo-tab th.d{width:20mm}
.jo-tab th.p{width:38mm}
.jo-tab th.s{width:14mm}
.jo-tab td{height:17.6mm}
.jo-tab td.g{font-weight:700;color:var(--wine);background:var(--cream)}
.jo-tab td.c:nth-child(odd){background:#fbf6ec}
.jo-tab td.s{background:var(--cream)}
.jo-scale{margin-top:4mm;font-size:9.6pt}
.jo-scale>b{color:var(--wine)}
.jo-scaleRow{display:grid;grid-template-columns:repeat(2,1fr);gap:1.4mm 8mm;margin-top:2mm}
.jo-scaleRow span{display:flex;gap:2mm;align-items:baseline;line-height:1.25}
.jo-scaleRow em{flex:none;font-style:normal;font-weight:800;color:var(--wine);min-width:9mm}
.jo-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  ...boardSheets,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
