// „ამიხსენი“ on paper — the „უტელეფონო“ variant of the app's Alias-like table game (plan doc): 36 cards of six numbered
// words (216 words from the app's own `data/amikhseniWords.ts`, its ten themes), a die picks the number for the whole turn,
// a sand timer keeps the time and a score sheet (two games, one a side) the points. The settings are the app's own
// (`utils/amikhseni.ts`: 60/90/120 s, 20/30/50 points, a skip −1 or 0, teams named after instruments).
import { C, SERIES, SCHOOL, aso, esc, icon, corners, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { WORD_CATEGORIES, TEAM_NAMES, SECONDS_CHOICES, TARGET_CHOICES, mulberry32, shuffle } = await appData({
  'data/amikhseniWords.ts': ['WORD_CATEGORIES'],
  'utils/amikhseni.ts': ['TEAM_NAMES', 'SECONDS_CHOICES', 'TARGET_CHOICES'],
  'utils/otkheuli.ts': ['mulberry32', 'shuffle'],
});

export const id = 'amikhseni';
export const title = 'ამიხსენი';
const TAG = 'ცოცხალი · უტელეფონო';
const META = '4–24 მოთამაშე, 2–6 გუნდი · 8 წლიდან · 20–40 წუთი';
const PER_CARD = 6;

// the ten themes: colour, icon and how many cards each gets (36 in all, four sheets of nine)
const THEMES = {
  galoba: { color: '#7a2028', icon: 'church', cards: 5 },
  musika: { color: '#2f5d8a', icon: 'music', cards: 4 },
  sakravebi: { color: '#a0522d', icon: 'guitar', cards: 3 },
  simgera: { color: '#6b4c9a', icon: 'mic-vocal', cards: 3 },
  kutkhe: { color: '#2f7d4f', icon: 'mountain', cards: 4 },
  samosi: { color: '#b0475f', icon: 'shirt', cards: 3 },
  tsmindanebi: { color: '#b0841f', icon: 'sparkles', cards: 4 },
  tsinaprebi: { color: '#5a4636', icon: 'scroll-text', cards: 3 },
  qopa: { color: '#c7701e', icon: 'grape', cards: 4 },
  istoria: { color: '#3d6b6b', icon: 'landmark', cards: 3 },
};
// the songs' list is the archive's 616 titles: on paper only the ones every class knows
const KNOWN_SONGS = ['ჩაკრულო', 'სულიკო', 'მრავალჟამიერი', 'ლილე', 'ხასანბეგურა', 'ურმული', 'მაყრული', 'ცანგალა და გოგონა', 'ვოისა',
  'ლაშქრული', 'ნანინა', 'იავნანა', 'შავლეგო', 'ადილეი', 'ციცინათელა', 'ჰერიო ბიჭებო', 'ლაჟღვაში', 'წინწყარო'];

/** Each theme's words for its cards: the songs first (so a title stays a song), then the rest in a fixed shuffle; no word
 * twice in the deck, none with a bracket or longer than 20 letters. */
const pickWords = () => {
  const taken = new Set(), out = {};
  const order = ['simgera', ...Object.keys(THEMES).filter(k => k !== 'simgera')];
  for (const [n, key] of order.entries()) {
    const cat = WORD_CATEGORIES.find(c => c.id === key);
    if (!cat) throw new Error(`no theme ${key}`);
    const need = THEMES[key].cards * PER_CARD;
    const pool = key === 'simgera'
      ? KNOWN_SONGS.filter(w => { if (!cat.words.includes(w)) throw new Error(`${w}: not in the songs' list`); return true; })
      : shuffle(cat.words, mulberry32(7919 * (n + 1)));
    const words = pool.filter(w => !taken.has(w) && !w.includes('(') && [...w].length <= 20).slice(0, need);
    if (words.length < need) throw new Error(`${key}: ${words.length} of ${need} words`);
    words.forEach(w => taken.add(w));
    out[key] = words;
  }
  return out;
};
const WORDS = pickWords();
const CARDS = Object.entries(THEMES).flatMap(([key, t]) => Array.from({ length: t.cards }, (_, i) => ({
  key, ...t, label: WORD_CATEGORIES.find(c => c.id === key).label, words: WORDS[key].slice(i * PER_CARD, (i + 1) * PER_CARD),
})));

// ---------- cards ----------
const PIPS = { 1: [[12, 12]], 2: [[7, 7], [17, 17]], 3: [[7, 7], [12, 12], [17, 17]], 4: [[7, 7], [17, 7], [7, 17], [17, 17]], 5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]], 6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]] };
const die = (n, color, size = 6.2) => `<svg width="${size}mm" height="${size}mm" viewBox="0 0 24 24" style="flex:none"><rect x="1" y="1" width="22" height="22" rx="5" fill="${color}"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="#fff"/>`).join('')}</svg>`;
/** A name longer than 15 letters goes on two lines (split at the space nearest its middle), so no word drops below 10 pt. */
const wordLines = w => {
  if (!w.includes(' ') || [...w].length <= 15) return [w];
  const spaces = [...w.matchAll(/ /g)].map(m => m.index);
  const at = spaces.reduce((a, b) => (Math.abs(b - w.length / 2) < Math.abs(a - w.length / 2) ? b : a));
  return [w.slice(0, at), w.slice(at + 1)];
};
const word = w => { const ls = wordLines(w); return `<div class="am-w${ls.length > 1 ? ' two' : ''}">${ls.map(l => `<div class="fit"><span>${esc(l)}</span></div>`).join('')}</div>`; };
const cardFront = c => `<div class="card am"><div class="frame" style="border-color:${c.color}"></div>
<div class="am-band" style="background:${c.color}">${icon(c.icon, { size: 4.6, color: '#fff', width: 2 })}<span>${esc(c.label)}</span></div>
<div class="am-rows">${c.words.map((w, i) => `<div class="am-row">${die(i + 1, c.color)}${word(w)}</div>`).join('')}</div></div>`;
const cardBack = c => `<div class="card dark am-back"><div class="frame"></div>${corners(C.gold, 9, 5)}
<div class="am-ring">${icon('messages-square', { size: 13, color: C.gold, width: 1.3 })}</div>
<div class="am-mark aso">${aso(title)}</div><div class="am-sub">${esc(SERIES)}</div>
<div class="am-cat" style="background:${c.color}">${icon(c.icon, { size: 3.6, color: '#fff', width: 2 })}<span>${esc(c.label)}</span></div></div>`;
const cardSheets = Array.from({ length: CARDS.length / 9 }, (_, s) => {
  const nine = CARDS.slice(s * 9, s * 9 + 9);
  const themes = [...new Set(nine.map(c => c.label))].join(', ');
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(cardFront), { label: `${title} · ბარათები ${s + 1}/${CARDS.length / 9} — ${themes}` }),
    back: cardSheet(nine.map(cardBack), { back: true, label: `${title} · ბარათები ${s + 1}/${CARDS.length / 9} — ზურგი` }),
  };
});

// ---------- the score sheet: twelve rounds, six teams; the same on the back for the next game ----------
const ROUNDS = 12;
const scorePage = page(`<div class="am-sc">
  <div class="am-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="am-date">თარიღი <i></i> კლასი <i></i></span></div>
  <div class="am-set">
    <span><b>დრო:</b> ${SECONDS_CHOICES.map(s => `<span class="chk"></span>${s} წმ`).join(' ')}</span>
    <span><b>მიზანი:</b> ${TARGET_CHOICES.map(t => `<span class="chk"></span>${t}`).join(' ')} ქულა</span>
    <span><b>გამოტოვება:</b> <span class="chk"></span>−1 <span class="chk"></span>0</span>
  </div>
  <table class="am-tab">
    <tr><th rowspan="2" class="r">წრე</th>${TEAM_NAMES.map(n => `<th colspan="2">${esc(n)}<i></i></th>`).join('')}</tr>
    <tr>${TEAM_NAMES.map(() => '<th class="s">სვლა</th><th class="s">სულ</th>').join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td>${TEAM_NAMES.map(() => '<td></td><td class="tot"></td>').join('')}</tr>`).join('')}
  </table>
  <div class="am-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="am-remind box">
    <div>${die(3, C.wine, 5)}<span><b>სვლის დასაწყისში</b> კამათელი: ეს ნომერი ყველა ბარათზე.</span></div>
    <div>${icon('hourglass', { size: 5, color: C.wine, width: 1.8 })}<span><b>დრო</b> — მეზობელი გუნდი ითვლის; „დრო!“ — სვლის ბოლო.</span></div>
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 2.4 })}<span><b>გამოიცნეს</b> +1 · ${icon('skip-forward', { size: 4, color: C.wine, width: 2 })} <b>გამოტოვება</b> −1 ან 0.</span></div>
    <div>${icon('trophy', { size: 5, color: C.goldDark, width: 1.8 })}<span><b>მოგება</b> — წრის ბოლოს, როცა ვინმემ მიზანს მიაღწია.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'am-scP');

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ახსენი სიტყვა ისე, რომ თვითონ არ თქვა — შენმა გუნდმა უნდა გამოიცნოს. წუთში რაც შეიძლება მეტი! ბარათები, კამათელი და ქვიშის საათი — ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="am-ex box">
    <div class="am-exCard">${cardFront(CARDS[0])}</div>
    <div class="am-exR">
      <h3>ასე მიდის სვლა</h3>
      <div class="am-step">${die(3, C.wine, 6)}<span>ამხსნელი აგორებს კამათელს — მაგ., <b>3</b>. ამ სვლაში ყველა ბარათზე მესამე სიტყვას ხსნის.</span></div>
      <div class="am-step">${icon('hourglass', { size: 6, color: C.wine, width: 1.7 })}<span>ქვიშის საათი ბრუნდება: ${SECONDS_CHOICES.join(', ')} წამი — როგორც შეთანხმდებით.</span></div>
      <div class="am-step">${icon('messages-square', { size: 6, color: C.wine, width: 1.7 })}<span>მესამე სიტყვას — „${esc(CARDS[0].words[2])}“ — გუნდს სხვა სიტყვებით უხსნის; თვითონ სიტყვას (და მის ნაწილს) არ ამბობს.</span></div>
      <div class="am-step">${icon('check', { size: 6, color: '#2f7d4f', width: 2.4 })}<span>გამოიცნეს — ბარათი მარჯვნივ, +1. გამოტოვება — მარცხნივ, −1.</span></div>
    </div>
  </div>
  <div class="am-themes">${Object.entries(THEMES).map(([key, t]) => `<span class="am-theme" style="border-color:${t.color}"><i style="background:${t.color}">${icon(t.icon, { size: 3.4, color: '#fff', width: 2.2 })}</i>${esc(WORD_CATEGORIES.find(c => c.id === key).label)} · ${t.cards}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სიტყვების ბარათები, 6 სიტყვა თითოზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${cardSheets.length}`)}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>კამათელი</td><td>1</td><td>საკუთარი</td></tr>
        <tr><td>ქვიშის საათი 1 წთ (ან საათი წამებით)</td><td>1</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${cardSheets.length}`)}) — 300 გ მუყაოზე, ჭრა კიდეებზე მონიშნული ხაზებით; ზურგის ზოლი თემას აჩვენებს.</li>
        <li>ქულების ფურცელი (${no('score')}) — ჩვეულებრივზე, რამდენიც გინდათ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Alias“-ის იდეით; სიტყვები საგანძურის სკოლის აპიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში ორი მოთამაშე მაინც. გუნდებს საკრავების სახელები ჰქვიათ: ${TEAM_NAMES.join(', ')}. ქულების ფურცელზე შეთანხმდით: დრო (${SECONDS_CHOICES.join(', ')} წამი), მიზანი (${TARGET_CHOICES.join(', ')} ქულა) და ღირს თუ არა გამოტოვება ქულა.`],
  ['ბარათები', `აურიეთ ${CARDS.length} ბარათი და დადეთ დასტად, პირქვე. მხოლოდ ზოგიერთი თემით გინდათ თამაში? ზურგის ფერადი ზოლით ამოარჩიეთ.`],
  ['სვლა', 'გუნდი ირჩევს ამხსნელს (ყოველ ჯერზე სხვას). ამხსნელი აგორებს კამათელს — ეს ნომერი ამ სვლაში ყველა ბარათზე მოქმედებს. მეზობელი გუნდიდან ერთი ქვიშის საათს აბრუნებს და დროს ადევნებს თვალს.'],
  ['ახსნა', 'ამხსნელი იღებს ზედა ბარათს და გუნდს თავისი ნომრის სიტყვას უხსნის. გამოიცნეს — ბარათი მარჯვნივ დებს და შემდეგს იღებს. ვერ ხსნის — „გამოტოვება“: ბარათი მარცხნივ. გუნდს პასუხების თქმა რამდენჯერაც უნდა, შეუძლია.'],
  ['რა არ შეიძლება', 'სიტყვის ან მისი ნაწილის თქმა (მათ შორის ერთძირიანი სიტყვის: „გალობა“ — „მგალობელი“), სხვა ენაზე თარგმნა, ასოების ან რითმის კარნახი („ჩ-ზე იწყება“, „ერითმება …-ს“). დაირღვა — ბარათი მარცხნივ, როგორც გამოტოვებული. შეიძლება ყველაფერი დანარჩენი: აღწერა, მსგავსი და საპირისპირო სიტყვა, მაგალითი.'],
  ['სიმღერა და საგალობელი', 'შეთანხმებით, სიმღერისა და საგალობლის სახელზე ამხსნელს შეუძლია მელოდია უსიტყვოდ ჩაიღიღინოს — სასწავლო ვერსია მუსიკალური კლასისთვის.'],
  ['დრო გავიდა', 'როცა ქვიშა დაიცლება, მთვლელი ამბობს „დრო!“ — სვლა მთავრდება. ხელში დარჩენილი ბარათი დასტის ქვეშ ბრუნდება.'],
  ['ქულები', 'მარჯვენა გროვის ყოველი ბარათი +1, მარცხენისა — −1 (ან 0, თუ ასე შეთანხმდით). სვლის ქულა და ჯამი ფურცელზე იწერება, ბარათები დასტის ქვეშ ბრუნდება. მერე სვლა შემდეგ გუნდზე გადადის.'],
  ['მოგება', 'წრის ბოლოს — როცა ყველა გუნდს თანაბრად უთამაშია — თუ ერთმა მაინც მიაღწია მიზანს, იგებს ყველაზე მეტი ქულის მქონე. ფრეა — კიდევ ერთი წრე. წაგებულმა გამარჯვებულს მიულოცოს — ასეა წესი.'],
  ['კამათლის გარეშე', 'ნომერი წრის ნომერია: პირველ წრეში ყველა პირველ სიტყვას ხსნის, მეორეში — მეორეს და ასე შემდეგ; მეშვიდე წრეში ისევ პირველიდან.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ამიხსენი“ სიტყვების თამაშია მთელი კლასისთვის: ამხსნელი თავის გუნდს სიტყვას სხვა სიტყვებით უხსნის, გუნდი გამოიცნობს. ბარათებზე სკოლის სიტყვებია — გალობა, საკრავები, კუთხეები, წმიდანები, წინაპრები, სუფრა, ისტორია.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="am-more box"><b>აპშიც</b> იგივე თამაშია: ტელეფონი ამხსნელის ხელშია, სიტყვას აჩვენებს, დროს და ქულებს თვითონ ითვლის — sagandzureli.ge → თამაშები → ამიხსენი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:5mm}
.card.am .frame{border-width:.6mm}
.am-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10pt;padding:0 2mm;white-space:nowrap}
.am-rows{position:absolute;left:4.4mm;right:4.4mm;top:15.4mm;bottom:4.2mm;display:flex;flex-direction:column}
.am-row{flex:1;display:flex;align-items:center;gap:2.2mm;border-bottom:.2mm solid var(--line)}
.am-row:last-child{border-bottom:0}
.am-w{flex:1;min-width:0;font-weight:800;font-size:12.5pt;color:var(--brown)}
.am-w.two{font-size:11pt;line-height:1.08}
.am-back .am-ring{position:absolute;left:50%;top:21mm;transform:translateX(-50%);width:24mm;height:24mm;border-radius:50%;border:.35mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.am-mark{position:absolute;left:0;right:0;top:50mm;text-align:center;font-size:14pt;color:#f0d9a0;letter-spacing:.06em}
.am-sub{position:absolute;left:0;right:0;top:58mm;text-align:center;font-size:7pt;color:var(--gold);opacity:.85;letter-spacing:.1em}
.am-cat{position:absolute;left:8mm;right:8mm;bottom:8mm;height:7mm;border-radius:3.5mm;display:flex;align-items:center;justify-content:center;gap:1.2mm;color:#fff;font-size:8pt;font-weight:700;white-space:nowrap;border:.3mm solid #f0d9a0}
.am-ex{display:grid;grid-template-columns:63mm 1fr;gap:7mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.am-exCard{position:relative;width:63mm;height:88mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.6mm;overflow:hidden}
.am-exR h3{margin:0 0 3mm}
.am-exCard .am-row:nth-child(3){background:#f3e1b5;margin:0 -1.4mm;padding:0 1.4mm;border-radius:1mm}
.am-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:3mm}
.am-step svg{flex:none;margin-top:.4mm}
.am-themes{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.am-theme{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.2mm .5mm .6mm;font-size:8.8pt;white-space:nowrap}
.am-theme i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.am-sc{position:absolute;inset:12mm 12mm 12mm}
.am-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.am-scHead .aso{font-size:15pt;color:var(--wine)}
.am-scHead b{font-size:14pt;color:var(--wine)}
.am-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.am-date i{display:inline-block;width:24mm;border-bottom:.25mm solid #bba98f}
.am-set{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2mm 5mm;font-size:10pt;margin:4mm 0}
.am-set .chk{margin:0 .8mm 0 2mm}
table.am-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.am-tab th,.am-tab td{border:.25mm solid #bba98f;text-align:center}
.am-tab th{background:var(--parch);color:var(--wine);font-size:10pt;padding:1.2mm .5mm}
.am-tab th i{display:block;margin:1.5mm 2mm .3mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.am-tab th.s{font-size:8pt;font-weight:400;color:var(--brown);background:var(--cream)}
.am-tab th.r,.am-tab td.r{width:11mm}
.am-tab td{height:15.6mm;font-size:12pt}
.am-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.am-tab td.tot{background:#fbf6ec}
.am-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.am-win i{flex:1;border-bottom:.3mm solid #bba98f}
.am-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.am-remind>div{display:flex;gap:2mm;align-items:flex-start}
.am-remind svg{flex:none}
.am-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
