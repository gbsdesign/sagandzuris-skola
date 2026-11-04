// „რუკის ვიქტორინა“ on paper — the სამაგიდო variant of the app's Seterra of Georgia (2026-11-01): the big map of the songs
// map's 13 regions (regionMap.mjs, the same as „საიდანაა სიმღერა?“'s, so their cards can be mixed), 52 cards of the app's
// places (data/rukaPlaces.ts) — four a region, the topics mixed — with the name in front and, behind it for the host, the
// region on a small map and a line on the place; the teams' answer sheets and the score sheet. The host reads a card, the
// teams write the region's number: the region 2 points, a fact about the place +1.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.js';
import { MINI, REGION, REGIONS, RIGHT, mapBoard, mapCss, miniMap, regionKey } from '../regionMap.js';
import * as __d0 from '../../data/rukaPlaces';
import * as __d1 from '../../utils/otkheuli';
import * as __d2 from '../../utils/amikhseni';

const { RUKA_PLACES, mulberry32, shuffle } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'rukis-viktorina';
export const title = 'რუკის ვიქტორინა';
const TAG = 'ქართული · უტელეფონო';
const META = '2–6 გუნდი · 7 წლიდან · 15–25 წუთი';
const ROUNDS = 12;
const SECONDS = 20;
const PER_REGION = 4;

// the app's topics (utils/ruka.ts), each with its mark and colour on the card's band
const TOPIC = {
  town: { label: 'ქალაქი და სოფელი', icon: 'building-2', color: C.wine },
  nature: { label: 'ბუნება', icon: 'mountain-snow', color: '#3d6e8f' },
  food: { label: 'სუფრა და ღვინო', icon: 'utensils', color: '#9a5a2a' },
  history: { label: 'ისტორია', icon: 'landmark', color: '#5f4b86' },
  people: { label: 'ადამიანები', icon: 'user-round', color: '#7a6212' },
};
const ORDER = ['town', 'nature', 'food', 'history', 'people'];

// ---------- the cards: four of each region, a topic each as far as it goes ----------
const picked = REGIONS.flatMap(r => {
  const mine = RUKA_PLACES.filter(p => p.region === r.id);
  const out = [];
  for (let round = 0; out.length < PER_REGION && round < 4; round++) {
    for (const t of ORDER) {
      const next = mine.filter(p => p.topic === t && !out.includes(p))[0];
      if (next && out.length < PER_REGION && out.filter(p => p.topic === t).length === round) out.push(next);
    }
  }
  if (out.length < PER_REGION) throw new Error(`${r.id}: only ${out.length} places`);
  return out.map(p => ({ ...p, region: r }));
});
const CARDS = shuffle(picked, mulberry32(20261102)).map((c, i) => ({ ...c, no: i + 1 }));

const shade = `<div class="sk-shade">${`<svg viewBox="-8 -8 1016 545" style="display:block;width:100%;height:auto">${REGIONS.map(r =>
  `<path d="${MINI[r.id]}" fill="${C.gold}" stroke="${C.paper}" stroke-width="7"/>`).join('')}</svg>`}</div>`;
const band = t => `<div class="sk-band" style="background:${TOPIC[t].color}">${icon(TOPIC[t].icon, { size: 4.4, color: '#fff', width: 2 })}<span>${TOPIC[t].label}</span></div>`;
const front = c => `<div class="card sk"><div class="frame" style="border-color:${TOPIC[c.topic].color}"></div><div class="frame2"></div>${band(c.topic)}${shade}
<div class="sk-mid"><div class="sk-name${[...c.name].length > 16 ? ' long' : ''}">${esc(c.name)}</div></div>
<div class="sk-foot"><span>№ ${c.no}</span><span>კუთხე ზურგზეა</span></div></div>`;
const back = c => `<div class="card sk"><div class="frame" style="border-color:${RIGHT}"></div>
<div class="sk-band out">${icon('eye-off', { size: 4.2, color: RIGHT, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sk-reg"><i>${c.region.no}</i><b>${esc(c.region.id === 'kalakuri' ? 'თბილისი' : c.region.name)}</b></div>
<div class="sk-map">${miniMap(c.region.id, { near: false })}</div>
<div class="rv-note">${icon('info', { size: 3.4, color: C.muted, width: 2 })}<span>${esc(c.note)}</span></div>
<div class="sk-foot"><span>№ ${c.no}</span><span class="t">${esc(c.name)}</span></div></div>`;
const blankFront = `<div class="card sk"><div class="frame" style="border-color:${C.goldDark}"></div><div class="sk-band" style="background:${C.goldDark}">${icon('map-pin', { size: 4.4, color: '#fff', width: 2 })}<span>შენი ადგილი</span></div>${shade}
<div class="sk-mid"><div class="sk-lines"><i></i><i></i></div></div>
<div class="sk-foot"><span>№</span><span>კუთხე ზურგზეა</span></div></div>`;
const blankBack = `<div class="card sk"><div class="frame" style="border-color:${C.goldDark}"></div>
<div class="sk-band out" style="color:${C.goldDark};border-color:${C.goldDark}">${icon('eye-off', { size: 4.2, color: C.goldDark, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sk-reg"><span class="sk-hint">შემოხაზე კუთხე:</span></div>
<div class="sk-map">${miniMap()}</div>
<div class="sk-lines b"><i></i><i></i></div>
<div class="sk-foot"><span>№</span><span>შენი ადგილი</span></div></div>`;

const SLOTS = CARDS.map(c => ({ c, front: front(c), back: back(c) }));
while (SLOTS.length % 9) SLOTS.push({ front: blankFront, back: blankBack });
const CARD_SHEETS = SLOTS.length / 9;
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = SLOTS.slice(s * 9, s * 9 + 9);
  const nos = nine.filter(x => x.c).map(x => x.c.no);
  const what = `№ ${nos[0]}–${nos[nos.length - 1]}${nine.some(x => !x.c) ? ', ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(x => x.front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(x => x.back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — კუთხეები (ზურგი)` }),
  };
});

// ---------- the big map with this game's steps ----------
const { tilePage } = mapBoard({
  title,
  sub: 'საქართველოს 13 კუთხე — პასუხად კუთხის ნომერი ჩაწერეთ (ქალაქური = თბილისი)',
  steps: [
    [14, 'megaphone', ['წამყვანი ბარათს კითხულობს', 'თემას და სახელს']],
    [104, 'pencil', ['გუნდები კუთხის ნომერს წერენ', `${SECONDS} წამი აქვთ`]],
    [209, 'rotate-ccw', ['ბარათი ტრიალდება', 'სწორი კუთხე — 2 ქულა']],
    [299, 'lightbulb', ['ბონუსი: +1', 'ვინც ამ ადგილზე რამეს იცის']],
  ],
});

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="sk-team">
  <div class="sk-tHead"><span class="aso">${aso(title)}</span><span class="sk-tName">გუნდი <i></i></span></div>
  ${regionKey()}
  <table class="sk-tab">
    <tr><th class="r">რაუნდი</th><th class="n">კუთხის №</th><th>რა იცით ამ ადგილზე? (ბონუსი)</th><th class="p">ქულა</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="n"></td><td></td><td class="p"><span>2</span><span>+1</span></td></tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="sk-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'sk-tP');

const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ბარათი №',
  hint: 'გუნდის სახელი სვეტის თავში. სწორი კუთხე — 2 ქულა, სხვა — 0. ვინც ამ ადგილზე რამეს სწორად იტყვის (ბარათის ზურგზე წერია) — კიდევ +1.',
  remind: [
    ['megaphone', 'ბარათი', 'წამყვანი წინა მხარეს კითხულობს: თემას და სახელს.'],
    ['pencil', 'პასუხი', `გუნდები ${SECONDS} წამში კუთხის ნომერს წერენ.`],
    ['check', 'ქულა', 'სწორი კუთხე — 2, ფაქტი ამ ადგილზე — +1.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი ბარათი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = CARDS.find(c => c.topic === 'nature' && [...c.name].length < 14) ?? CARDS[0];
const topicCount = t => CARDS.filter(c => c.topic === t).length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">რამდენად კარგად იცნობ საქართველოს? წამყვანი ბარათს კითხულობს — ქალაქს, ტბას, კერძს, ციხეს ან ცნობილ ადამიანს — და გუნდები დიდ რუკაზე ეძებენ, რომელ კუთხეს ეკუთვნის. ბარათის ზურგზე სწორი კუთხეა და ერთი სტრიქონი იმაზე, რითაა ეს ადგილი ცნობილი.</div>
  <div class="sk-ex box">
    <div class="sk-exCards"><div class="sk-exCard">${front(EX)}</div><div class="sk-exCard">${back(EX)}</div></div>
    <div class="sk-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ზედა ბარათს იღებს და წინა მხარეს ხმამაღლა კითხულობს: თემას და სახელს. ზურგს მხოლოდ თვითონ ხედავს.')}
      ${step('pencil', `გუნდები რუკას უყურებენ, თათბირობენ და ${SECONDS} წამში ფურცელზე კუთხის ნომერს წერენ.`)}
      ${step('rotate-ccw', 'წამყვანი ბარათს აბრუნებს: სწორი კუთხე — 2 ქულა.', '#2f7d4f')}
      ${step('lightbulb', 'ბონუსი: გუნდი, რომელიც ამ ადგილზე რამეს სწორად იტყვის, +1 ქულას იღებს. წამყვანი პასუხს ზურგზე დაწერილს შეადარებს.', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>რუკა, 39×28 სმ (ორი ნაწილი)</td><td>1</td><td>${no('map1')}–${no('map2')}</td></tr>
        <tr><td>ბარათები: სახელი წინ, კუთხე ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები შენი ადგილებისთვის</td><td>${SLOTS.length - CARDS.length}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="sk-mix">${CARDS.length} ბარათი, ყოველი კუთხიდან ${PER_REGION}: ${ORDER.map(t => `${TOPIC[t].label.toLowerCase()} ${topicCount(t)}`).join(', ')}. ბარათები საგანძურის სკოლის აპის „რუკის ვიქტორინიდანაა“; აპში კიდევ მეტია და სიმღერებიც.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>რუკა (${no('map1')}–${no('map2')}): ორივე ნაწილი კიდეებზე მონიშნული ხაზებით გაჭერი, გვერდიგვერდ დადე და ზურგიდან სკოჩით შეაერთე. კედელზეც გააკარი.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — 4 გუნდისთვის; მეტი გუნდისთვის ორჯერ დაბეჭდე. ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია თამაშ „Seterra“-ს იდეით. ადგილები და ცნობები საგანძურის სკოლის აპისაა — ჯერ მასწავლებელს არ შეუმოწმებია. მხოლოდ სასწავლო, არაკომერციული გამოყენებისთვის.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. თითო გუნდს — ფურცელი და ფანქარი.`],
  ['რუკა', 'მაგიდის შუაში დადეთ ან კედელზე გააკარით, ყველას რომ ხედავდეს. 13 კუთხე დანომრილია დასავლეთიდან აღმოსავლეთისკენ; „ქალაქური“ თბილისია.'],
  ['წამყვანი', 'მასწავლებელი ან ერთ-ერთი მოსწავლე — ის არ თამაშობს. ბარათებს აურევს და დასტად დებს, სახელით ზემოთ.'],
  ['ბარათი', 'წამყვანი იღებს ზედა ბარათს, ზურგს თავისკენ იჭერს და ხმამაღლა კითხულობს თემას (ქალაქი, ბუნება, სუფრა, ისტორია, ადამიანები) და სახელს.'],
  ['პასუხი', `გუნდები თათბირობენ და ${SECONDS} წამში ფურცელზე კუთხის ნომერს წერენ.`],
  ['ქულა', 'წამყვანი ბარათს აბრუნებს: სწორი კუთხე — 2 ქულა, სხვა — 0. ქულებს ფურცელზე წერს.'],
  ['ბონუსი', 'ვინც ამ ადგილზე რამეს სწორად იტყვის — რითაა ცნობილი, ვინ დაიბადა, რა კერძია — +1 ქულას იღებს. წამყვანი პასუხს ზურგზე დაწერილს შეადარებს; ერთ რაუნდში — ერთი ბონუსი გუნდზე.'],
  ['მოგება', `${ROUNDS} ბარათის (ან შეთანხმებული დროის) მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი ბარათი.`],
  ['უფრო სწრაფად', 'ვინც პირველი მივა რუკასთან და სწორ კუთხეზე თითს დაადებს, ის იღებს ქულას; შეცდომა — ამ რაუნდში აღარ პასუხობს.'],
  ['უფრო მარტივად', 'პატარებთან: წამყვანი ორ კუთხეს ასახელებს და გუნდები ორიდან ირჩევენ.'],
  ['სიმღერებიც', '„საიდანაა სიმღერა?“-ს ბარათები იმავე რუკაზე თამაშდება — შეურიეთ და ითამაშეთ ერთად.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„რუკის ვიქტორინა“ საქართველოს გეოგრაფიაა თამაშით: ქალაქები და სოფლები, ტბები და მწვერვალები, კერძები და ღვინოები, ციხეები და ცნობილი ადამიანები — ყველაფერი თავის კუთხეში.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: სახელი ან სიმღერის ნაწყვეტი, კუთხეს რუკაზე ტელეფონით ნიშნავ — რაც უფრო მალე, მით მეტი ქულა; მარტო (ათი კითხვა და შენი რეკორდი), ონლაინ კლასთან ერთად, ან ერთი ტელეფონით, გუნდებად.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}${mapCss}
.sk-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;background:var(--wine);color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap;z-index:1}
.sk-band.out{background:#fff;border:.35mm solid ${RIGHT};color:${RIGHT}}
.sk-shade{position:absolute;left:6mm;right:6mm;bottom:11mm;opacity:.16}
.sk-mid{position:absolute;left:5.6mm;right:5.6mm;top:16mm;bottom:20mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4mm;text-align:center;z-index:1}
.sk-name{font-family:'SansKa',sans-serif;font-weight:900;font-size:17pt;line-height:1.15;color:var(--brown)}
.sk-name.long{font-size:13.5pt}
.sk-lines{display:flex;flex-direction:column;gap:6mm;width:100%}
.sk-lines i{display:block;border-bottom:.25mm solid #9d8c77;height:0}
.sk-lines.b{position:absolute;left:6mm;right:6mm;top:62mm;gap:5mm;width:auto}
.sk-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:flex-end;gap:3mm;font-size:10pt;color:var(--muted);z-index:1}
.sk-foot span:first-child{font-weight:700;white-space:nowrap}
.sk-foot .t{text-align:right;line-height:1.2;font-size:9pt;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sk-reg{position:absolute;left:5mm;right:5mm;top:16.4mm;display:flex;align-items:center;justify-content:center;gap:2mm}
.sk-reg i{flex:none;font-style:normal;width:7.4mm;height:7.4mm;border-radius:50%;background:${RIGHT};color:#fff;font-family:'SansKa',sans-serif;font-weight:900;font-size:12pt;display:flex;align-items:center;justify-content:center}
.sk-reg b{font-family:'SansKa',sans-serif;font-weight:900;font-size:13pt;line-height:1.1;color:${RIGHT}}
.sk-hint{font-size:10pt;font-weight:700;color:var(--gold2)}
.sk-map{position:absolute;left:4.2mm;right:4.2mm;top:26.5mm}
.rv-note{position:absolute;left:5.4mm;right:5.4mm;top:57.5mm;bottom:10.5mm;display:flex;gap:1.3mm;align-items:flex-start;font-size:8.8pt;line-height:1.3;color:var(--brown)}
.rv-note svg{flex:none;margin-top:.4mm}
.sk-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.sk-exCards{display:flex;gap:3mm}
.sk-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.sk-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.sk-exR h3{margin:0 0 3mm}
.sk-mix{margin:2.4mm 0 0;font-size:9pt;line-height:1.35;color:var(--brown)}
.sk-team{height:148.5mm;padding:8mm 12mm 4mm;position:relative}
.sk-cut{position:absolute;left:6mm;right:6mm;top:148.5mm;border-top:.3mm dashed #b3a593}
.sk-tHead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm}
.sk-tHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.sk-tName{flex:1;display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine)}
.sk-tName i{flex:1;border-bottom:.3mm solid #bba98f}
table.sk-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.sk-tab th,.sk-tab td{border:.25mm solid #bba98f;padding:0 1.6mm}
.sk-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:6.4mm;text-align:left}
.sk-tab td{height:8.5mm}
.sk-tab .r{width:17mm;text-align:center}
.sk-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.sk-tab .n{width:24mm;text-align:center}
.sk-tab .p{width:24mm;text-align:center}
.sk-tab td.p{white-space:nowrap}
.sk-tab td.p span{display:inline-flex;min-width:6mm;height:6mm;padding:0 .6mm;border-radius:3mm;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .45mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'map1', front: tilePage(1) },
  { key: 'map2', front: tilePage(2) },
  ...cardSheets,
  { key: 'teams', front: teamPage, back: teamPage },
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
