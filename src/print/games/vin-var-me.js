// „ვინ ვარ მე?“ on paper (2026-11-01, like Headbanz and Guess Who?): the app's 50 famous Georgians (`data/vinPeople.ts`) as
// cards — the name big, its line and birth, the facts and the app's own yes-answers as tags all on the front, because the
// card stands on the guesser's forehead and its back faces them — four blank cards, a board for „ვინ ჩაიფიქრა?“ (two players:
// every person a row, the yes-answers as dots in the app's question columns, so a „no“ crosses out a whole column) and the
// forehead game's question counter (twenty circles a turn, 3·2·1 points as in the app — `vinPoints`).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/vinPeople';
import * as __d1 from '../../utils/vin';
import * as __d2 from '../../utils/amikhseni';

const { VIN_PEOPLE, VIN_QUESTIONS, VIN_YEARS, MAX_QUESTIONS, VIN_ROUNDS, vinPoints, TEAM_NAMES } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'vin-var-me';
export const title = 'ვინ ვარ მე?';
const TAG = 'ქართველები · უტელეფონო';
const META = '2–30 მოთამაშე · 8 წლიდან · 15–40 წუთი';

// the app's „who“ questions as the cards' tags and the board's columns
const LABEL = { f: 'ქალი', saint: 'წმინდანი', ruler: 'მეფე', warrior: 'მეომარი', clergy: 'სასულიერო', writer: 'მწერალი', music: 'მუსიკა', art: 'მხატვარი', science: 'მეცნიერი', stage: 'სცენა', sport: 'სპორტი', lari: 'ლარზე' };
const WHO = VIN_QUESTIONS.filter(q => q.group === 'who');
for (const q of WHO) if (!LABEL[q.id]) throw new Error(`vin-var-me: no label for question ${q.id}`);
const PEOPLE = [...VIN_PEOPLE].sort((a, b) => a.born - b.born || a.name.localeCompare(b.name, 'ka'));
const tagsOf = p => WHO.filter(q => q.test(p)).map(q => LABEL[q.id]);

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const bornLabel = p => {
  if (p.born >= 1500) return `${p.born}`;
  const c = Math.floor((Math.abs(p.born) - 1) / 100) + 1;
  return `${p.born < 0 ? 'ძვ. წ. ' : ''}${ROMAN[c - 1] ?? c} ს.`;
};
const bornText = p => (p.born >= 1500 ? `დაიბადა ${p.born} წელს` : `დაიბადა ${bornLabel(p)}`);
/** a name on two lines at its last space (not before a king's number) */
const nameLines = n => {
  const i = n.lastIndexOf(' ');
  const parts = i > 0 && !/^[IVX]+$/.test(n.slice(i + 1)) ? [n.slice(0, i), n.slice(i + 1)] : [n];
  return parts.map(x => `<div class="fit vm-n"><span>${esc(x)}</span></div>`).join('');
};

// ---------- cards: 50 people + 4 blank, nine a sheet ----------
const W = 63, H = 88, PER = 9;
const SHEETS_OF_CARDS = Math.ceil(PEOPLE.length / PER);
const BLANKS = SHEETS_OF_CARDS * PER - PEOPLE.length;

const cardFront = p => `<div class="vm-card"><div class="vm-frame"></div>
<div class="vm-band"><div class="fit"><span>${esc(p.role)}</span></div></div>
<div class="vm-name">${nameLines(p.name)}</div>
<div class="vm-born">${icon('hourglass', { size: 2.6, color: C.goldDark, width: 2 })}<span>${esc(bornText(p))}</span></div>
<ol class="vm-facts">${p.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ol>
<div class="vm-tags">${tagsOf(p).map(t => `<span>${esc(t)}</span>`).join('')}</div></div>`;
const blankFront = () => `<div class="vm-card"><div class="vm-frame"></div>
<div class="vm-band vm-blankBand"><span>ვინ იყო</span><i></i></div>
<div class="vm-name vm-blankName"><i></i><i></i></div>
<div class="vm-born"><span>დაიბადა</span><i class="vm-line"></i></div>
<ol class="vm-facts vm-blankFacts">${'<li><i></i></li>'.repeat(5)}</ol>
<div class="vm-tags vm-blankTags">${WHO.map(q => `<span>${LABEL[q.id]}</span>`).join('')}</div></div>`;
const cardBack = () => `<div class="vm-card vm-back"><div class="vm-frame"></div>
<div class="vm-ring">${icon('user-round-search', { size: 13, color: C.gold, width: 1.3 })}</div>
<div class="vm-mark aso">${aso(title)}</div><div class="vm-sub">${esc(SERIES)}</div></div>`;

const cardSheets = Array.from({ length: SHEETS_OF_CARDS }, (_, s) => {
  const slots = Array.from({ length: PER }, (_, i) => PEOPLE[s * PER + i] ?? null);
  const people = slots.filter(Boolean);
  const span = people.length ? `${bornLabel(people[0])} – ${bornLabel(people[people.length - 1])}` : '';
  const label = `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ${span}${slots.some(x => !x) ? ' და ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(slots.map(p => (p ? cardFront(p) : blankFront())), { cols: 3, rows: 3, w: W, h: H, label, cls: 'gsheet vm-sheet' }),
    back: gridSheet(slots.map(() => cardBack()), { cols: 3, rows: 3, w: W, h: H, back: true, label: `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ზურგი`, cls: 'gsheet vm-sheet' }),
  };
});

// ---------- the board of „ვინ ჩაიფიქრა?“: a row a person, the app's „who“ answers as dots ----------
const HALF = Math.ceil(PEOPLE.length / 2);
const boardTable = list => `<table class="vm-bt">
  <tr><th class="bx"></th><th class="nm">სახელი</th><th class="yr">დაიბადა</th>${WHO.map((q, i) => `<th class="tg${i % 2 ? ' alt' : ''}"><span>${LABEL[q.id]}</span></th>`).join('')}</tr>
  ${list.map(p => `<tr><td class="bx"><i></i></td><td class="nm">${esc(p.name)}</td><td class="yr">${esc(bornLabel(p))}</td>${WHO.map((q, i) => `<td class="tg${i % 2 ? ' alt' : ''}">${q.test(p) ? '<b></b>' : ''}</td>`).join('')}</tr>`).join('')}
</table>`;
const boardPage = page(`<div class="vm-board">
  <div class="vm-bHead"><span class="aso">${aso(title)}</span><b>ვინ ჩაიფიქრა?</b><span class="vm-me">ჩემი ადამიანი <i></i> კითხვები <i class="s"></i></span></div>
  <p class="vm-bHow">${icon('message-circle-question-mark', { size: 4.2, color: C.wine, width: 2 })}<span>ჰკითხე სვეტის სახელით: „მეომარი იყო?“ <b>არა</b> — გადახაზე ყველა, ვისაც იმ სვეტში ● აქვს; <b>კი</b> — ვისაც არ აქვს. წლით: „${VIN_YEARS[2]} წლამდე დაიბადა?“ — დაბადების სვეტით.</span></p>
  <div class="vm-bGrid">${boardTable(PEOPLE.slice(0, HALF))}${boardTable(PEOPLE.slice(HALF))}</div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ორი მოთამაშის დაფა</div>`, 'vm-boardP');

// ---------- the forehead game's counter: twenty circles a turn, the points by how few ----------
const ZONES = Array.from({ length: MAX_QUESTIONS }, (_, i) => vinPoints(i + 1, true));
const TURNS = 18;
const zoneOf = n => (n === 3 ? 'z3' : n === 2 ? 'z2' : 'z1');
const counterPage = page(`<div class="vm-sc">
  <div class="vm-bHead"><span class="aso">${aso(title)}</span><b>კითხვების მთვლელი</b><span class="vm-me">თარიღი <i class="s"></i> კლასი <i class="s"></i></span></div>
  <div class="vm-legend">
    <span>ყოველ კითხვაზე — ერთი წრე (სახელის თქმაც კითხვაა). გამოიცნო — შემოხაზე ბოლო წრე, ქულა მის ფერზეა:</span>
    <span class="vm-zone z3">1–5 · 3 ქულა</span><span class="vm-zone z2">6–10 · 2 ქულა</span><span class="vm-zone z1">11–${MAX_QUESTIONS} · 1 ქულა</span>
  </div>
  <table class="vm-ct">
    <tr><th class="n">№</th><th class="tm">გუნდი</th><th class="who">ვინ იყო</th><th class="cs">კითხვები</th><th class="pt">ქულა</th></tr>
    ${Array.from({ length: TURNS }, (_, r) => `<tr><td class="n">${r + 1}</td><td class="tm"></td><td class="who"></td><td class="cs"><div>${ZONES.map((z, i) => `<i class="${zoneOf(z)}">${i + 1}</i>`).join('')}</div></td><td class="pt"></td></tr>`).join('')}
  </table>
  <div class="vm-tot">${TEAM_NAMES.map(n => `<div><span>${esc(n)}</span><i></i></div>`).join('')}</div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · კითხვების მთვლელი</div>`, 'vm-scP');

// ---------- the cover and the rules ----------
const EXAMPLE = PEOPLE.find(p => p.id === 'ilia') ?? PEOPLE[0];
const KIND_COUNT = WHO.length + VIN_YEARS.length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">შუბლზე ბარათი გიდევს — მთელი კლასი ხედავს, ვინ ხარ, შენ კი არა. სვამ კითხვებს, რომლებზეც მხოლოდ „კი“ ან „არა“ ითქმის: „მეფე ვიყავი?“, „1800 წლამდე დავიბადე?“ — და ოც კითხვაში უნდა მიხვდე. ${PEOPLE.length} ცნობილი ქართველი: მეფეები, წმინდანები, მწერლები, მგალობლები, მხატვრები, მეცნიერები, მსახიობები, სპორტსმენები.<br><b>${META}</b></div>
  <div class="vm-ex box">
    <div class="vm-exCard">${cardFront(EXAMPLE)}</div>
    <div class="vm-exR">
      <h3>სამი თამაში ერთი დასტით</h3>
      <div class="vm-step">${icon('scan-face', { size: 6, color: C.wine, width: 1.7 })}<span><b>ვინ ვარ მე?</b> — მთელი კლასი. გამომცნობს ბარათი შუბლზე, კლასი პასუხობს, მთვლელი წრეებს შლის: რაც ნაკლები კითხვა, მით მეტი ქულა.</span></div>
      <div class="vm-step">${icon('users-round', { size: 6, color: C.wine, width: 1.7 })}<span><b>ვინ ჩაიფიქრა?</b> — ორი მოთამაშე ან ორი გუნდი, თითოს თავისი დაფა. პასუხები დაფაზე შლის ყველას, ვინც არ ერგება.</span></div>
      <div class="vm-step">${icon('list-checks', { size: 6, color: C.wine, width: 1.7 })}<span><b>ფაქტებით</b> — მასწავლებელი ბარათის ფაქტებს ერთიმეორის მიყოლებით კითხულობს; ვინც ადრე მიხვდება, მეტ ქულას იღებს.</span></div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ბარათები: სახელი, ფაქტები, პასუხები</td><td>${PEOPLE.length}</td><td>${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები — თქვენი ადამიანებისთვის</td><td>${BLANKS}</td><td>${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>დაფა „ვინ ჩაიფიქრა?“ (ორივე მხარეს)</td><td>1</td><td>${no('board')}</td></tr>
        <tr><td>კითხვების მთვლელი (ორივე მხარეს)</td><td>1</td><td>${no('counter')}</td></tr>
        <tr><td>ფანქარი და საშლელი</td><td>—</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი ${W}×${H} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}) — 250–300 გ მუყაოზე, ჭრა მონიშნული ხაზებით. ზურგი ყველას ერთნაირი აქვს — შუბლზე დადებულს გამომცნობი ვერაფერს წაიკითხავს.</li>
        <li>დაფა (${no('board')}) — თითო მოთამაშეს ერთი; ფანქრით, რომ მერე წაიშალოს. მთვლელი (${no('counter')}) — ჩვეულებრივ ქაღალდზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Guess Who?“-სა და „Headbanz“-ის იდეით; ადამიანები და ფაქტები საგანძურის სკოლისთვის Claude-მა შეარჩია და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES_1 = [
  ['გუნდები', `2–6 გუნდი (${TEAM_NAMES.slice(0, 4).join(', ')}…). შეთანხმდით, რამდენი წრე ითამაშებთ (${VIN_ROUNDS.join(', ')}). ერთი მთვლელია — ფურცელი და ფანქარი მასთანაა.`],
  ['სვლა', 'გუნდი ირჩევს გამომცნობს. ის დასტიდან ბარათს ისე იღებს, რომ არ ჩაიხედოს, და შუბლზე იდებს სახელით კლასისკენ (ან ქუდის ქვეშ, ან თავსაკრავში).'],
  ['კითხვა', 'გამომცნობი სვამს კითხვებს, რომლებზეც „კი“ ან „არა“ ითქმის. კლასი ერთხმად პასუხობს; ბარათზე ფაქტებიც წერია და ქვედა ზოლი — ვინ იყო, ზუსტად, აპის კითხვებით.'],
  ['თვლა', `ყოველ კითხვაზე მთვლელი ერთ წრეს შლის. სახელის თქმაც კითხვაა. ${MAX_QUESTIONS} კითხვა — და სვლა მთავრდება.`],
  ['ქულები', '1–5 კითხვით გამოიცნო — 3 ქულა, 6–10 კითხვით — 2, 11–20 კითხვით — 1. ვერ გამოიცნო — 0, ბარათი დასტის ქვეშ.'],
  ['მოგება', 'წრეების ბოლოს იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — თითო სვლა კიდევ.'],
];
const RULES_2 = [
  ['დასაწყისი', 'ორ მოთამაშეს (ან გუნდს) თითო დაფა და ფანქარი აქვს. ორივე დასტიდან ფარულად იღებს თითო ბარათს — ეს „მისი ადამიანია“ — და დაფის თავზე იწერს.'],
  ['სვლა', 'რიგრიგობით სვამთ თითო კითხვას. პასუხი ბარათის ქვედა ზოლით და დაბადების წლით გაეცით — ზუსტად ისე, როგორც დაფაზე წერია.'],
  ['გადახაზვა', 'პასუხის მიხედვით დაფაზე გადახაზე ყველა, ვინც აღარ ერგება. კარგი კითხვა დაფას შუაზე ყოფს: „1885 წლამდე დაიბადა?“ ნახევარს შლის, „სპორტსმენი იყო?“ — რამდენიმეს.'],
  ['გამოცნობა', 'კითხვის ნაცვლად სახელის თქმაც შეიძლება. სწორია — მოიგე! არასწორი — გადახაზე და სვლა მეტოქეზე გადადის.'],
];
const RULES_3 = [
  ['როგორ', 'მასწავლებელი ბარათს იღებს და ფაქტებს ერთიმეორის მიყოლებით კითხულობს. გუნდი, რომელიც პირველი იტყვის სწორ სახელს, იღებს: პირველ ფაქტზე 5 ქულას, მეორეზე 4-ს… მეხუთეზე 1-ს. არასწორი სახელი — ამ ბარათზე გუნდი აღარ პასუხობს.'],
];
const rulesList = list => `<ol>${list.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">ბარათზე ცნობილი ქართველია: სახელი, ვინ იყო, როდის დაიბადა, ხუთი ფაქტი და ქვედა ზოლი — რომელ ${KIND_COUNT - VIN_YEARS.length} კითხვაზე აქვს „კი“. ერთი დასტით სამი თამაში ითამაშება.</p>
  <div class="vm-part"><h3>${icon('scan-face', { size: 5.4, color: C.wine, width: 1.8 })}ვინ ვარ მე? — მთელი კლასი</h3><div class="rules">${rulesList(RULES_1)}</div></div>
  <div class="vm-part"><h3>${icon('users-round', { size: 5.4, color: C.wine, width: 1.8 })}ვინ ჩაიფიქრა? — ორი მოთამაშე</h3><div class="rules">${rulesList(RULES_2)}</div></div>
  <div class="vm-part"><h3>${icon('list-checks', { size: 5.4, color: C.wine, width: 1.8 })}ფაქტებით — მასწავლებელი კითხულობს</h3><div class="rules one">${rulesList(RULES_3)}</div></div>
  <div class="vm-qs box"><h3>კითხვები, რომლებზეც ბარათი პასუხობს</h3><div class="vm-qGrid">${VIN_QUESTIONS.map(q => `<span>${esc(q.text)}</span>`).join('')}</div></div>
  <div class="vm-more box"><b>აპშიც</b> იგივე თამაშია: ყოველდღე ერთი ადამიანი მთელი სკოლისთვის — დაფიდან სახელებს აპი თვითონ შლის; კლასში ტელეფონი შუბლზე დევს და კითხვებს ითვლის — sagandzureli.ge → თამაშები → ვინ ვარ მე?</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.vm-card{position:absolute;inset:0;overflow:hidden;background:var(--paper);display:flex;flex-direction:column;padding:3.2mm 3.6mm 3mm}
.vm-frame{position:absolute;inset:1.6mm;border:.5mm solid var(--wine);border-radius:2.4mm;pointer-events:none}
.vm-band{flex:none;height:7mm;border-radius:1.4mm;background:var(--wine);color:#fff;font-weight:700;font-size:8.6pt;display:flex;align-items:center;padding:0 2mm}
.vm-band .fit{flex:1;text-align:center}
.vm-name{flex:none;margin:2.6mm 0 1mm;display:flex;flex-direction:column;gap:.2mm}
.vm-n{text-align:center;font-family:SerifKa,serif;font-weight:800;font-size:17pt;line-height:1.1;color:var(--brown)}
.vm-born{flex:none;display:flex;align-items:center;justify-content:center;gap:1mm;font-size:7.6pt;color:var(--gold2);font-weight:700;padding-bottom:1.6mm;border-bottom:.25mm solid var(--line);margin-bottom:1.6mm}
.vm-facts{flex:1;min-height:0;margin:0;padding:0 0 0 3.4mm;font-size:7pt;line-height:1.28;overflow:hidden}
.vm-facts li{margin-bottom:.9mm;padding-left:.4mm}
.vm-facts li::marker{color:var(--wine);font-weight:700}
.vm-tags{flex:none;display:flex;flex-wrap:wrap;justify-content:center;gap:.8mm;padding-top:1.2mm}
.vm-tags span{font-size:6.2pt;font-weight:700;color:var(--wine);background:#f6e9e2;border:.2mm solid #e2c9bf;border-radius:2mm;padding:.2mm 1.6mm}
.vm-blankBand{background:#fff;border:.3mm dashed #bba98f;color:var(--muted);font-weight:400;font-size:6.4pt;gap:1.5mm}
.vm-blankBand i{flex:1;border-bottom:.25mm solid #bba98f;height:3.6mm}
.vm-blankName{gap:4.6mm;padding:3mm 3mm 1.5mm}
.vm-blankName i{display:block;border-bottom:.3mm solid #bba98f}
.vm-born .vm-line{display:inline-block;width:20mm;border-bottom:.25mm solid #bba98f}
.vm-blankFacts li{height:4.6mm;margin:0}
.vm-blankFacts li i{display:block;border-bottom:.25mm solid #bba98f;height:4mm}
.vm-blankTags span{background:#fff;color:var(--muted);border-color:#d6c7b0;font-weight:400}
.vm-back{background:var(--wine)}
.vm-back .vm-frame{border-color:var(--gold);border-width:.3mm;inset:2.4mm;opacity:.9}
.vm-ring{position:absolute;left:50%;top:17mm;transform:translateX(-50%);width:24mm;height:24mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.vm-mark{position:absolute;left:0;right:0;top:49mm;text-align:center;font-size:14pt;color:#f0d9a0;letter-spacing:.05em}
.vm-sub{position:absolute;left:0;right:0;bottom:8mm;text-align:center;font-size:6pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.vm-ex{display:grid;grid-template-columns:${W}mm 1fr;gap:7mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.vm-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.4mm;overflow:hidden}
.vm-exR h3{margin:0 0 3mm}
.vm-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:3mm}
.vm-step svg{flex:none;margin-top:.4mm}
.vm-part{margin:0 0 2.4mm}
.vm-part h3{display:flex;align-items:center;gap:2mm;margin:0 0 1mm;color:var(--wine);font-size:11.5pt}
.vm-part .rules ol{margin:0;padding-left:5mm;font-size:9.8pt;line-height:1.36}
.vm-part .rules li{margin-bottom:1mm;break-inside:avoid}
.vm-part .rules.one{columns:1}
.vm-qs{margin-top:3mm;padding:3mm 5mm}
.vm-qs h3{margin:0 0 2mm;font-size:10.5pt}
.vm-qGrid{columns:2;column-gap:6mm;font-size:8.8pt;line-height:1.3}
.vm-qGrid span{display:block;margin-bottom:.8mm;break-inside:avoid}
.vm-qGrid span::before{content:'•';color:var(--wine);margin-right:1.4mm}
.vm-more{margin-top:3mm;font-size:9.6pt;line-height:1.35}
.vm-board,.vm-sc{position:absolute;inset:10mm 10mm 12mm}
.vm-bHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm;white-space:nowrap}
.vm-bHead .aso{font-size:15pt;color:var(--wine)}
.vm-bHead b{font-size:13pt;color:var(--wine)}
.vm-me{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.vm-me i{display:inline-block;width:40mm;border-bottom:.25mm solid #bba98f}
.vm-me i.s{width:16mm}
.vm-bHow{display:flex;gap:2mm;align-items:flex-start;font-size:9pt;line-height:1.3;margin:2.4mm 0 3mm}
.vm-bHow svg{flex:none;margin-top:.2mm}
.vm-bGrid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
table.vm-bt{width:100%;border-collapse:collapse;table-layout:fixed}
.vm-bt th,.vm-bt td{border:.2mm solid #cdbda3;padding:0;text-align:center}
.vm-bt th{background:var(--parch);color:var(--wine);font-size:7pt;height:17mm;vertical-align:bottom;padding-bottom:1mm}
.vm-bt th.tg span{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-size:7pt;font-weight:700}
.vm-bt th.bx{width:4.6mm}.vm-bt th.nm{width:32mm;text-align:left;padding-left:1.4mm}.vm-bt th.yr{width:12mm}
.vm-bt td{height:9.1mm}
.vm-bt td.bx i{display:inline-block;width:3mm;height:3mm;border:.25mm solid #8a7a66;border-radius:.6mm;vertical-align:middle}
.vm-bt td.nm{text-align:left;padding:0 1mm 0 1.4mm;font-size:7.8pt;line-height:1.12;font-weight:700}
.vm-bt td.yr{font-size:7pt;color:var(--muted)}
.vm-bt .alt{background:#f7f0e3}
.vm-bt th.alt{background:#efe2cb}
.vm-bt td.tg b{display:inline-block;width:2.4mm;height:2.4mm;border-radius:50%;background:var(--wine);vertical-align:middle}
.vm-legend{display:flex;flex-wrap:wrap;align-items:center;gap:1.6mm 2.4mm;font-size:9.2pt;line-height:1.3;margin:2.6mm 0 3mm}
.vm-zone{display:inline-flex;align-items:center;border-radius:2.4mm;padding:.4mm 2.4mm;font-weight:700;font-size:8.6pt}
.vm-zone.z3,.vm-ct i.z3{background:#dcefe1;color:#24603c}
.vm-zone.z2,.vm-ct i.z2{background:#f6e7c1;color:#8a6410}
.vm-zone.z1,.vm-ct i.z1{background:#efe7dc;color:#75685a}
table.vm-ct{width:100%;border-collapse:collapse;table-layout:fixed}
.vm-ct th,.vm-ct td{border:.25mm solid #bba98f;text-align:center}
.vm-ct th{background:var(--parch);color:var(--wine);font-size:9pt;padding:1.2mm .5mm}
.vm-ct th.n,.vm-ct td.n{width:8mm}.vm-ct th.tm{width:27mm}.vm-ct th.who{width:38mm}.vm-ct th.pt{width:13mm}
.vm-ct td{height:12.4mm}
.vm-ct td.n{font-weight:700;color:var(--wine);background:var(--cream)}
.vm-ct td.cs div{display:flex;justify-content:center;gap:.7mm}
.vm-ct td.cs i{display:inline-flex;align-items:center;justify-content:center;width:4mm;height:4mm;border-radius:50%;font-style:normal;font-size:5.2pt;font-weight:700;border:.2mm solid rgba(74,52,38,.25)}
.vm-ct td.pt{background:#fbf6ec}
.vm-tot{display:grid;grid-template-columns:repeat(6,1fr);gap:2.4mm;margin-top:4mm}
.vm-tot div{border:.25mm solid #bba98f;border-radius:1.6mm;padding:1.2mm 2mm;display:flex;flex-direction:column;gap:1mm}
.vm-tot span{font-size:8.6pt;font-weight:700;color:var(--wine)}
.vm-tot i{display:block;height:7mm;border-bottom:.25mm solid #bba98f}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'board', front: boardPage, back: boardPage },
  { key: 'counter', front: counterPage, back: counterPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
