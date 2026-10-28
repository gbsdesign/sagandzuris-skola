// „დღის სიტყვა“ on paper — the „უტელეფონო“ variant of the app's word game (plan doc): one player hides a word, the other
// finds it in six tries, and the hider marks each letter green (in place) or yellow (elsewhere). A cover with a worked
// example, the rules, grid sheets for 4, 5 and 6 letters (four A6 grids a side, the same on both sides) and 78 word slips
// from the app's own answer bank (`data/sitqvaAnswers.ts`); the colouring is the app's `scoreGuess`.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { ANSWER_BANK, scoreGuess, LETTERS, KIND_HINT } = await appData({
  'data/sitqvaAnswers.ts': ['ANSWER_BANK'],
  'utils/sitqva.ts': ['scoreGuess', 'LETTERS', 'KIND_HINT'],
});

export const id = 'dghis-sitqva';
export const title = 'დღის სიტყვა';
const TAG = 'ქართული · უტელეფონო';
const META = '2 მოთამაშე ან მთელი კლასი · 8 წლიდან · 10 წუთი';

// the slips: every 4-letter word of the bank and 27 of the 5- and 6-letter ones, both kinds („კახეთი“ is the example's)
const PICK = {
  5: ['ჯვარი', 'ლოცვა', 'მადლი', 'ალილო', 'წირვა', 'გუნდი', 'მამაო', 'უფალი', 'კვირა', 'ბზობა', 'ღვინო', 'კვერი', 'იმედი', 'წიგნი', 'ისონი',
    'გურია', 'აჭარა', 'ფშავი', 'ბოდბე', 'რიონი', 'შხარა', 'აბაშა', 'წალკა', 'კასპი', 'გაგრა', 'სიონი', 'ომალო'],
  6: ['ტაძარი', 'მარხვა', 'გალობა', 'სამება', 'ქრისტე', 'ზატიკი', 'დიდება', 'მწუხრი', 'ფრესკა', 'ნათლია', 'ღმერთი', 'რწმენა', 'შაბათი', 'ხარება',
    'მესტია', 'თუშეთი', 'ქართლი', 'ჰერეთი', 'სამცხე', 'მცხეთა', 'ბათუმი', 'გელათი', 'ვარძია', 'შატილი', 'უშგული', 'თელავი', 'ენგური'],
};
const SLIPS = { 4: [...new Set(ANSWER_BANK.filter(c => [...c.word].length === 4).map(c => c.word))], ...PICK };
const kindOf = w => {
  const found = ANSWER_BANK.filter(c => c.word === w);
  if (!found.length) throw new Error(`${w}: not in the answer bank`);
  return found.some(c => c.kind === 'church') ? 'church' : found[0].kind;
};
for (const [n, words] of Object.entries(SLIPS)) {
  for (const w of words) if ([...w].length !== Number(n)) throw new Error(`${w}: not ${n} letters`);
  if (words.length > 27) throw new Error(`${n} letters: ${words.length} slips, a sheet holds 27`);
}

const EXAMPLE = { answer: 'კახეთი', tries: ['სამება', 'ხატები', 'კახეთი'] };
const tile = (ch, mark, size) => `<span class="sq-t ${mark}" style="width:${size}mm;height:${size}mm;font-size:${(size * 1.45).toFixed(1)}pt">${esc(ch)}</span>`;
const tryRow = (word, answer, size = 11) => `<div class="sq-row">${scoreGuess(word, answer).map((m, i) => tile([...word][i], m, size)).join('')}</div>`;

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ერთი სიტყვას მალავს, მეორე ექვს ცდაში ეძებს. ყოველ ცდაზე ფერები ეუბნება, რომელი ასოა ადგილზე და რომელი — სხვაგან. საჭიროა ბადის ფურცელი და ორი ფანქარი, ტელეფონი — არა.<br><b>${META}</b></div>
  <div class="sq-ex box">
    <div>
      <div class="sq-exHead">მინიშნება: ${esc(KIND_HINT.region)}</div>
      ${EXAMPLE.tries.map((w, i) => `<div class="sq-exRow"><span class="sq-n">${i + 1}</span>${tryRow(w, EXAMPLE.answer)}</div>`).join('')}
    </div>
    <div class="sq-exR">
      <div class="sq-leg">${tile('ა', 'hit', 7)}<span><b>მწვანე</b> — ასო სიტყვაშია და ამ ადგილზეა</span></div>
      <div class="sq-leg">${tile('ხ', 'near', 7)}<span><b>ყვითელი</b> — სიტყვაშია, ოღონდ სხვა ადგილზე</span></div>
      <div class="sq-leg">${tile('ს', 'miss', 7)}<span><b>უფერო</b> — ასეთი ასო სიტყვაში არ არის</span></div>
      <p>პირველ ცდაში „ა“ და „ე“ ადგილზეა, მეორე „ა“ კი უფეროა — სიტყვაში ერთი „ა“-ა. მეორე ცდამ აჩვენა, რომ „ხ“ სხვაგანაა. მესამე — „კახეთი“: ექვსივე მწვანე!</p>
    </div>
  </div>
  <h3 class="sq-h3">რა არის ამ ფაილში</h3>
  <table class="t comp">
    <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ქაღალდი</th><th>ბეჭდვა · ჭრა</th></tr>
    <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ბადეები — 4, 5 და 6 ასოზე (A6, ორივე მხარეს)</td><td>8 + 8 + 8</td><td>${no('grid4')}–${no('grid6')}</td><td>ჩვეულებრივი ან ლამინირებული</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>სიტყვების ბარათები — 4, 5 და 6 ასოზე</td><td>${[4, 5, 6].map(n => SLIPS[n].length).join(' + ')} (+ ${81 - [4, 5, 6].reduce((t, n) => t + SLIPS[n].length, 0)} ცარიელი)</td><td>${no('slips4')}–${no('slips6')}</td><td>300 გ მუყაო</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>მწვანე და ყვითელი ფანქარი</td><td>2</td><td>—</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
  </table>
  <p class="small">ბადე ერთხელ იწერება: რამდენი მოთამაშეც გყავთ, იმდენი ასლი გადაიღეთ — შავ-თეთრადაც კარგია.</p>
  <div class="two">
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული).</li>
        <li>ბადეები (ფურცლები ${no('grid4')}–${no('grid6')}) — ჩვეულებრივ ქაღალდზე; ლამინირებულზე წაშლადი მარკერით ბევრჯერ ითამაშებთ. ფურცელი შუაზე ორჯერ იჭრება — ოთხი A6 ბადე, ზურგზეც ბადეა.</li>
        <li>სიტყვების ბარათები (${no('slips4')}–${no('slips6')}) — <b>300 გ მუყაოზე</b>, რომ სიტყვა ზურგიდან არ გამოჩანდეს. ჭრა კიდეებზე მონიშნული ხაზებით: 63×29 მმ.</li>
        <li>ბარათები ზურგის ციფრით დაალაგე: 4, 5 და 6 ასო — სამი დასტა.</li>
      </ol>
    </div>
    <div>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Wordle“-ის (ჯოშ უორდლი, 2021) იდეით; სიტყვები საგანძურის სკოლის აპიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">აპში იგივე თამაში ყოველდღე ახალი სიტყვით: sagandzureli.ge → თამაშები → დღის სიტყვა.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['რა გჭირდებათ', 'ბადე თითოეულს, სიტყვების ბარათები (ან საკუთარი სიტყვა), მწვანე და ყვითელი ფანქარი. ორი როლია: <b>მცოდნე</b> სიტყვას მალავს, <b>მაძიებელი</b> ეძებს.'],
  ['სიტყვა', 'მცოდნე ირჩევს სიგრძეს — 4, 5 ან 6 ასო — და ამ ციფრიანი დასტიდან ზედა ბარათს იღებს. ფარულად კითხულობს და მაძიებელს მინიშნებას ეუბნება: „საეკლესიო სიტყვა“ ან „საქართველოს კუთხე ან ადგილი“. მაძიებელი მინიშნებას ბადის თავში მონიშნავს.'],
  ['ცდა', 'მაძიებელი პირველ სტრიქონში წერს ნამდვილ ქართულ სიტყვას იმავე სიგრძით — ერთი ასო ერთ უჯრაში. სიტყვა სახელობით ბრუნვაში უნდა იყოს (სახელიც შეიძლება: „ნინო“, „გორი“); ასოების უაზრო რიგი არ ითვლება.'],
  ['ფერები', 'მცოდნე ყოველ ასოს ამოწმებს: <b>მწვანე</b> — ასო სიტყვაშია და ზუსტად ამ ადგილზე; <b>ყვითელი</b> — სიტყვაშია, ოღონდ სხვა ადგილზე; <b>უფერო</b> — ასეთი ასო სიტყვაში არ არის. ფანქრები არ გაქვთ? წრე ასოს გარშემო ნიშნავს მწვანეს, ხაზი ასოს ქვეშ — ყვითელს.'],
  ['ორჯერ დაწერილი ასო', 'თუ ცდაში ასო ორჯერაა, სიტყვაში კი ერთხელ, ფერს მხოლოდ ერთი იღებს: ის, რომელიც ადგილზეა, თუ არადა — მარცხნიდან პირველი. მეორე უფეროა. თუ სიტყვაშიც ორჯერაა, ორივე ფერადდება.'],
  ['ანბანი', 'ბადის ქვეშ 33 ასოა. უფერო ასოს მაძიებელი ანბანში გადახაზავს, ფერადს შემოხაზავს — ასე უკეთ ჩანს, რაღა დარჩა.'],
  ['მოგება', 'ექვს ცდაში გამოიცანი — მოიგე: ბადის ბოლოს შემოხაზე, მერამდენე ცდაზე. ვერ გამოიცანი — მცოდნე ბარათს გაჩვენებს. მერე როლებს ცვლით; ორი რაუნდის შემდეგ იმარჯვებს, ვისაც ნაკლები ცდა დასჭირდა (ვერ გამოცნობა = 7).'],
  ['მთელი კლასი', 'მცოდნე მასწავლებელია: სიტყვას ირჩევს, დაფაზე ბადეს ხაზავს და მინიშნებას ამბობს. კლასი გუნდებად იყოფა; გუნდები რიგრიგობით ასახელებენ სიტყვას (თათბირს — 30 წამი). მასწავლებელი დაფაზე წერს და აფერადებს, ყველა თავის ბადეში იწერს. ვინც გამოიცნობს, მის გუნდს ქულა: პირველ ცდაზე 6, მეორეზე 5 … მეექვსეზე 1.'],
  ['საკუთარი სიტყვა', 'მცოდნეს შეუძლია თვითონ მოიფიქროს სიტყვა — ნამდვილი, 4–6 ასო, სახელობით ბრუნვაში — და მინიშნებაც თვითონ თქვას (მაგ., „ცხოველი“, „საკრავი“). ოთხასოიან ფურცელზე სამი ცარიელი ბარათი ამისთვისაა.'],
  ['აპშიც', 'იგივე თამაში საგანძურის სკოლის აპშია: ყოველდღე ერთი სიტყვა მთელი სკოლისთვის — დღის დღესასწაული, წმინდანი ან საეკლესიო სიტყვა.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„დღის სიტყვა“ ქართული ასოების თამაშია: ერთი მოთამაშე სიტყვას ჩაიფიქრებს, მეორე ექვს ცდაში ეძებს. ყოველი ცდა ნამდვილი სიტყვაა, ფერები კი ამბობენ, რომელი ასო გამოიცანი და რომელი არა — ასე ნელ-ნელა ჩნდება ფარული სიტყვა.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="sq-more">
    <div class="box"><h3>ფანქრის გარეშე</h3>
      <div class="sq-pen"><span class="sq-pt"><i class="ring"></i>ა</span><span>წრე — ადგილზეა<br><small>(მწვანის ნაცვლად)</small></span></div>
      <div class="sq-pen"><span class="sq-pt"><i class="ul"></i>ხ</span><span>ხაზი ქვეშ — სხვაგანაა<br><small>(ყვითლის ნაცვლად)</small></span></div>
      <div class="sq-pen"><span class="sq-pt">ს</span><span>არაფერი — არ არის</span></div>
    </div>
    <div class="box"><h3>კლასის ქულები</h3>
      <table class="t sq-pts"><tr><th>ცდა</th>${[1, 2, 3, 4, 5, 6].map(k => `<td>${k}</td>`).join('')}</tr><tr><th>ქულა</th>${[6, 5, 4, 3, 2, 1].map(k => `<td>${k}</td>`).join('')}</tr></table>
      <p class="small">ვერავინ გამოიცნო — ქულა არავის; მასწავლებელი სიტყვას ამხელს და შემდეგ სიტყვაზე გადადიხართ.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// ---------- grid sheets: four A6 grids a side, the same on the back ----------
const ABC = [LETTERS.slice(0, 11), LETTERS.slice(11, 22), LETTERS.slice(22)].map(r => [...r]);
const quarter = n => `<div class="sq-q">
  <div class="sq-qHead"><b>${title}</b><span class="sq-len">${n} ასო</span></div>
  <div class="sq-line">სახელი<span></span></div>
  <div class="sq-hint">მინიშნება: <span class="chk"></span>საეკლესიო <span class="chk"></span>კუთხე, ადგილი <span class="chk"></span><span class="sq-blank"></span></div>
  <div class="sq-rows">${Array.from({ length: 6 }, (_, r) => `<div class="sq-gr"><span class="sq-n">${r + 1}</span>${'<span class="sq-box"></span>'.repeat(n)}<span class="sq-n"></span></div>`).join('')}</div>
  <div class="sq-abcLabel">უფერო ასო გადახაზე, ფერადი შემოხაზე</div>
  <div class="sq-abc">${ABC.map(r => `<div>${r.map(ch => `<span>${ch}</span>`).join('')}</div>`).join('')}</div>
  <div class="sq-done">გამოვიცანი ცდაზე: ${[1, 2, 3, 4, 5, 6].map(k => `<span class="sq-c">${k}</span>`).join('')}<span class="sq-c wide">ვერა</span></div>
</div>`;
const quarterCuts = `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#999" stroke-width=".2">
<line x1="105" y1="0" x2="105" y2="297" stroke-dasharray="1 2"/><line x1="0" y1="148.5" x2="210" y2="148.5" stroke-dasharray="1 2"/></svg>`;
const gridPage = n => page(`${quarterCuts}${[0, 1, 2, 3].map(i => `<div class="sq-qWrap" style="left:${(i % 2) * 105}mm;top:${Math.floor(i / 2) * 148.5}mm">${quarter(n)}</div>`).join('')}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ${n} ასო — ბადეები, ჭრა წერტილოვან ხაზებზე</div>`, 'sqGrid');

// ---------- word slips: 3×9 of 63×29.3 mm, the back says how many letters ----------
const SLIP_H = 264 / 9;
const slip = w => {
  const k = kindOf(w);
  return `<div class="sq-slip"><div class="sq-ic">${icon(k === 'church' ? 'church' : 'map-pin', { size: 5.6, color: C.wine, width: 1.7 })}</div><div class="sq-sw"><div class="sq-word">${esc(w)}</div><div class="sq-kind">${esc(KIND_HINT[k])}</div></div></div>`;
};
const ownSlip = n => `<div class="sq-slip"><div class="sq-ic">${icon('pencil', { size: 5.2, color: C.wine, width: 1.7 })}</div><div class="sq-sw"><div class="sq-own">${'<i></i>'.repeat(n)}</div><div class="sq-kind">მინიშნება: ……………………………</div></div></div>`;
const slipBack = n => `<div class="sq-slip back"><span class="sq-big">${n}</span><span class="sq-bl">ასო<span class="sq-sq">${'<i></i>'.repeat(n)}</span></span><span class="sq-ba">${esc(title)}</span></div>`;
const slipSheets = n => {
  const fronts = [...SLIPS[n].map(slip), ...Array.from({ length: 27 - SLIPS[n].length }, () => ownSlip(n))];
  const opts = { cols: 3, rows: 9, w: 63, h: SLIP_H };
  return {
    key: `slips${n}`,
    front: gridSheet(fronts, { ...opts, label: `${title} · ${n}-ასოიანი სიტყვები — წინა მხარე` }),
    back: gridSheet(Array(27).fill(slipBack(n)), { ...opts, back: true, label: `${title} · ${n}-ასოიანი სიტყვები — ზურგი` }),
  };
};

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:5mm}
.sq-h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{margin-bottom:1.5mm}
.cover .two{margin-top:5mm}
.sq-more{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:5mm}
.sq-more h3{margin:0 0 2mm;color:var(--wine);font-size:11pt}
.sq-pen{display:flex;align-items:center;gap:3mm;font-size:10pt;margin-bottom:2mm;line-height:1.2}
.sq-pen small{font-size:8.5pt;color:var(--muted)}
.sq-pt{position:relative;width:10mm;height:10mm;border:.35mm solid var(--brown);border-radius:1.2mm;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:15pt;flex:none}
.sq-pt .ring{position:absolute;left:1.4mm;top:1.4mm;width:6.4mm;height:6.4mm;border:.45mm solid var(--brown);border-radius:50%}
.sq-pt .ul{position:absolute;left:2.6mm;right:2.6mm;bottom:1.5mm;border-bottom:.45mm solid var(--brown)}
table.sq-pts{font-size:11pt;margin-bottom:2mm}
table.sq-pts td,table.sq-pts th{text-align:center;padding:1.2mm}
.sq-ex{display:grid;grid-template-columns:auto 1fr;gap:8mm;align-items:center;margin:0 0 6mm;padding:4mm 6mm}
.sq-exHead{font-size:9.5pt;color:var(--muted);margin:0 0 2mm 6mm}
.sq-exRow{display:flex;align-items:center;gap:2mm;margin-bottom:1.6mm}
.sq-row{display:flex;gap:1.2mm}
.sq-t{display:inline-flex;align-items:center;justify-content:center;border-radius:1.2mm;font-family:'SansKa',sans-serif;font-weight:900;color:#fff;border:.35mm solid transparent;flex:none;line-height:1}
.sq-t.hit{background:#2f7d4f}
.sq-t.near{background:#d9a21b}
.sq-t.miss{background:#fff;color:var(--brown);border-color:var(--brown)}
.sq-leg{display:flex;align-items:center;gap:2.5mm;font-size:10pt;margin-bottom:1.8mm}
.sq-exR p{font-size:9.6pt;margin:2.5mm 0 0;line-height:1.35}
.sq-n{width:4mm;flex:none;font-size:8.5pt;color:var(--muted);text-align:right}
.sq-qWrap{position:absolute;width:105mm;height:148.5mm;padding:8mm 8mm 6mm}
.sq-qHead{display:flex;align-items:center;justify-content:space-between;border-bottom:.3mm solid var(--gold);padding-bottom:1.2mm;margin-bottom:1.6mm}
.sq-qHead b{font-size:14pt;color:var(--wine)}
.sq-len{background:var(--wine);color:var(--paper);font-weight:700;font-size:9.5pt;padding:.3mm 2.4mm .5mm;border-radius:2mm}
.sq-line{display:flex;gap:2mm;align-items:flex-end;font-size:9.5pt;height:6.5mm}
.sq-line span{flex:1;border-bottom:.25mm solid #bba98f;height:4mm}
.sq-hint{display:flex;align-items:center;gap:1mm;white-space:nowrap;font-size:9pt;margin:2mm 0 3.2mm}
.sq-hint .chk{margin:0 .6mm 0 1.4mm}
.sq-blank{flex:1;border-bottom:.25mm solid #bba98f;height:3.6mm}
.sq-rows{display:flex;flex-direction:column;align-items:center;gap:1.4mm}
.sq-gr{display:flex;align-items:center;gap:1.4mm}
.sq-box{width:10.5mm;height:10.5mm;border:.35mm solid var(--brown);border-radius:1.2mm;background:#fff}
.sq-abcLabel{font-size:8pt;color:var(--muted);text-align:center;margin:3.4mm 0 1.2mm}
.sq-abc>div{display:flex;justify-content:center;gap:.7mm;margin-bottom:.7mm}
.sq-abc span{width:7mm;height:7mm;border:.2mm solid var(--line);border-radius:.8mm;background:var(--paper);display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:700;font-size:10.5pt;color:var(--brown)}
.sq-done{display:flex;align-items:center;justify-content:center;gap:1.2mm;font-size:8.6pt;margin-top:2.6mm;white-space:nowrap}
.sq-c{width:5.4mm;height:5.4mm;border-radius:50%;border:.25mm solid var(--gold2);display:inline-flex;align-items:center;justify-content:center;font-size:8.5pt;flex:none}
.sq-c.wide{width:auto;padding:0 1.6mm;border-radius:3mm}
.sq-slip{position:absolute;inset:0;background:var(--paper);display:flex;align-items:center;gap:2.6mm;padding:0 4.4mm}
.sq-slip::before{content:'';position:absolute;inset:1.5mm;border:.35mm solid var(--wine);border-radius:1.6mm}
.sq-ic{width:9.5mm;height:9.5mm;border-radius:50%;background:var(--cream);border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center;flex:none}
.sq-sw{flex:1;min-width:0}
.sq-word{font-weight:800;font-size:19pt;color:var(--wine);line-height:1.05;letter-spacing:.02em}
.sq-kind{font-size:7.6pt;color:var(--muted);margin-top:.8mm;line-height:1.15}
.sq-own{display:flex;gap:1.2mm;height:7mm}
.sq-own i{width:6mm;border-bottom:.35mm solid var(--brown)}
.sq-slip.back{background:var(--wine);justify-content:center;gap:2mm}
.sq-slip.back::before{border-color:var(--gold);border-width:.25mm}
.sq-big{font-family:'SansKa',sans-serif;font-weight:900;font-size:24pt;color:#f0d9a0;line-height:1}
.sq-bl{font-size:10.5pt;color:var(--paper);display:flex;flex-direction:column;gap:1mm}
.sq-sq{display:flex;gap:.8mm}
.sq-sq i{width:2.6mm;height:2.6mm;border:.25mm solid #f0d9a0;border-radius:.4mm}
.sq-ba{position:absolute;right:4.4mm;bottom:2.6mm;font-size:6.5pt;color:#f0d9a0;opacity:.75}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...[4, 5, 6].map(n => ({ key: `grid${n}`, front: gridPage(n), back: gridPage(n) })),
  ...[4, 5, 6].map(slipSheets),
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
