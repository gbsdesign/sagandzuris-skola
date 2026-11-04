// „ექო“ on paper — the სამაგიდო variant of the app's echo game (2026-11-01): no phone, the host sings. Every melody is the
// app's own phrase (data/melodyPool.ts through utils/eqo.ts `eqoLine`: a well-known chant's or a program song's top voice, a
// repeated pitch once), its first twelve notes even, numbered over the staff and named under it. The circle: the host sings
// three notes, everyone in turn echoes them; once all who are still in have, the phrase grows by a note; a miss is out, the
// last one in wins. The kit: the host's melody sheets, the circle sheet, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { clefFor, staffSvg } from '../staffSvg.js';
import { app } from '../melodies.js';
import { partsCss, step } from '../kitParts.js';
import * as __d0 from '../../data/melodyPool';
import * as __d1 from '../../utils/eqo';

const { shuffle, mulberry32 } = app;
const { MELODY_POOL, eqoLine, pitchName, EQO_START } = ({ ...__d0, ...__d1 });

export const id = 'eqo';
export const title = 'ექო';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '3–16 მოთამაშე ან 2–6 გუნდი · 6 წლიდან · 10–20 წუთი';
/** a phrase's notes on the sheet: from three up to twelve */
const LEN = 12;
const PER_PAGE = 10;
const PAGES = 4;
const ROWS = 16;

// the melodies in a fixed mixed order (songs among the chants), the app's own phrases, each long enough for twelve
const MELODIES = shuffle(MELODY_POOL.filter(m => eqoLine(m).length >= LEN), mulberry32(20261102))
  .slice(0, PAGES * PER_PAGE - 1)
  .map((m, i) => {
    const notes = eqoLine(m).slice(0, LEN);
    return { ...m, no: i + 1, notes };
  });

/** a phrase on its staff: the notes numbered over it (the first three, where it starts, in wine), named under it */
const phraseStaff = notes => staffSvg({
  clef: clefFor(notes), width: 85, space: 2.1, room: 2.4, over: 3.6, under: 4, font: 2.6,
  notes: notes.map((midi, k) => ({ midi, over: String(k + 1), overColor: k < EQO_START ? C.wine : undefined, under: pitchName(midi) })),
}).svg;

const kindOf = m => (m.song ? `სიმღერა · ${m.where}` : `საგალობელი · ${m.where} · ${m.ref}`);
const melodyBox = m => `<div class="eq-mel">
  <div class="eq-melHead"><span class="eq-no">${m.no}</span><div class="eq-melT"><b>${esc(m.title)}</b><span>${esc(kindOf(m))}</span></div></div>
  <div class="eq-staff">${phraseStaff(m.notes)}</div>
</div>`;
// the last box: room for the host's own melody
const ownBox = `<div class="eq-mel eq-own">
  <div class="eq-melHead"><span class="eq-no">${MELODIES.length + 1}</span><div class="eq-melT"><b>შენი ჰანგი</b><span>ჩაწერე სახელი და პირველი 12 ნოტი</span></div></div>
  <div class="eq-lines">${'<i></i>'.repeat(5)}</div>
  <div class="eq-twelve">${Array.from({ length: LEN }, (_, k) => `<span>${k + 1}</span>`).join('')}</div>
</div>`;

const melodyPage = p => {
  const boxes = MELODIES.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(melodyBox);
  if (p === PAGES - 1) boxes.push(ownBox);
  const from = p * PER_PAGE + 1, to = Math.min(MELODIES.length + 1, (p + 1) * PER_PAGE);
  return page(`<div class="eq-mHead"><span class="aso">${aso(title)}</span><b>ჰანგები ${from}–${to}</b><span class="eq-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} წამყვანისთვის</span></div>
<div class="eq-mels">${boxes.join('')}</div>
<div class="eq-legend">ციფრი ნოტის თავზე — მერამდენე ნოტია: ფრაზა <b>3</b>-ით იწყება, მერე <b>4</b>, <b>5</b>… <b>12</b>-მდე. ნოტის ქვეშ — მისი სახელი. იმღერე თანაბრად, „ლა“-თი; დიეზი (♯) ნახევარი ტონით მაღლაა, ბემოლი (♭) — დაბლა.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ჰანგები წამყვანისთვის</div>`, 'eq-mP');
};

// ---------- the circle sheet: a row a player (or a team), a column a phrase's length ----------
const LENGTHS = Array.from({ length: LEN - EQO_START + 1 }, (_, k) => EQO_START + k);
const circlePage = page(`<div class="eq-ci">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>წრის ფურცელი</b><span class="rs-date">თარიღი <i></i> ჰანგი № <i class="s"></i></span></div>
  <p class="rs-scHint">სახელები წრის რიგით. ყოველ გამეორებაზე — <b>✓</b> ან <b>✗</b> იმ ნოტების სვეტში, რამდენიც ფრაზაშია. ✗ — მოთამაშე გადის (ადგილს ბოლოდან წერ). როცა ყველამ, ვინც დარჩა, გაიმეორა, ფრაზა ერთი ნოტით იზრდება — შემდეგ სვეტზე გადადიხარ.</p>
  <table class="eq-tab">
    <tr><th class="n">№</th><th class="who">მოთამაშე ან გუნდი</th>${LENGTHS.map(n => `<th class="l">${n}</th>`).join('')}<th class="pl">ადგილი</th></tr>
    ${Array.from({ length: ROWS }, (_, r) => `<tr><td class="n">${r + 1}</td><td class="who"></td>${LENGTHS.map(() => '<td class="l"></td>').join('')}<td class="pl"></td></tr>`).join('')}
  </table>
  <div class="eq-end"><span>გამარჯვებული: <i></i></span><span>ყველაზე გრძელი ფრაზა: <i class="s"></i> ნოტი</span></div>
  <div class="rs-remind box">
    <div>${icon('megaphone', { size: 5, color: C.wine, width: 1.9 })}<span><b>ფრაზა</b> — წამყვანი ყოველს ხელახლა უმღერის, თანაბრად, „ლა“-თი.</span></div>
    <div>${icon('repeat', { size: 5, color: C.wine, width: 1.9 })}<span><b>ექო</b> — მოთამაშე მაშინვე იმეორებს; ერთხელ.</span></div>
    <div>${icon('x', { size: 5, color: '#c2410c', width: 2.2 })}<span><b>შეცდომა</b> — სხვა ნოტი, გამოტოვებული ან ზედმეტი: გადის.</span></div>
    <div>${icon('trophy', { size: 5, color: C.goldDark, width: 1.9 })}<span><b>მოგება</b> — ბოლოს დარჩენილი; 12 ნოტი ყველამ — ახალი ჰანგი.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · წრის ფურცელი</div>`, 'rs-scP');

// ---------- the cover and the rules ----------
const EX = MELODIES.find(m => !m.song && m.title.length < 22) ?? MELODIES[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">წამყვანი მღერის ცნობილი საგალობლის ან სიმღერის დასაწყისს — ჯერ სამ ნოტს, — წრეში კი ყველა თავის ჯერზე იმეორებს. როცა ყველამ გაიმეორა, ფრაზას ერთი ნოტი ემატება: ოთხი, ხუთი… ვინც შეცდება, გადის; ვინც ბოლოს დარჩება, ის იგებს. ტელეფონი არ სჭირდება; წამყვანმა ნოტები უნდა წაიკითხოს — ან ნოტების ქვეშ დაწერილი სახელებით იმღეროს, ან საკრავზე დაუკრას.<br><b>${META}</b></div>
  <div class="eq-ex box">
    <div class="eq-exMel">${melodyBox(EX)}</div>
    <div class="eq-exR">
      <h3>ასე მიდის თამაში</h3>
      ${step('megaphone', 'წამყვანი ირჩევს ჰანგს და მღერის მის პირველ სამ ნოტს — თანაბრად, „ლა“-თი.')}
      ${step('repeat', 'წრეში პირველი იმეორებს. სწორია — ✓; შეცდა — ✗ და გადის.')}
      ${step('users', 'შემდეგს წამყვანი ხელახლა უმღერის, და ასე წრე მთავრდება.')}
      ${step('trending-up', 'მერე ფრაზა ერთი ნოტით იზრდება: ოთხი, ხუთი… თორმეტამდე.')}
      ${step('trophy', 'ვინც ბოლოს დარჩება, ის იგებს — და ამბობს, რომელი ჰანგი იყო.', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ჰანგები ნოტებით და სახელებით, წამყვანისთვის</td><td>${MELODIES.length}</td><td>${no('mel1')}–${no(`mel${PAGES / 2}`)}</td></tr>
        <tr><td>ადგილი შენი ჰანგისთვის</td><td>1</td><td>${no(`mel${PAGES / 2}`)}</td></tr>
        <tr><td>წრის ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('circle')}</td></tr>
      </table>
      <p class="eq-mix">${MELODIES.filter(m => !m.song).length} საგალობელი (წირვა, მწუხრი, ცისკარი) და ${MELODIES.filter(m => m.song).length} ხალხური სიმღერა — იგივე ჰანგები, რაც აპის „ექოში“.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ჰანგები (${no('mel1')}–${no(`mel${PAGES / 2}`)}) — წამყვანს.</li>
        <li>წრის ფურცელი (${no('circle')}) — ერთი ან ორი თამაშზე (ორივე მხარე ერთნაირია).</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ძველი „ექო-სიმღერისა“ და თამაშის „Simon“ იდეით. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['მოთამაშეები', '3–16 მოთამაშე წრეში ზის ან დგას. წამყვანი — მასწავლებელი ან ის, ვინც ნოტებს კითხულობს, — არ თამაშობს: ჰანგებიც და წრის ფურცელიც მასთანაა. ფურცელზე სახელებს წრის რიგით წერს.'],
  ['ჰანგი', 'წამყვანი ირჩევს ჰანგს (რიგით ან როგორც უნდა) და მის ნომერს წერს. სახელს არ ამბობს — ის ბოლოსთვისაა.'],
  ['ფრაზა', `ფრაზა ${EQO_START} ნოტით იწყება. წამყვანი მღერის თანაბრად, ყოველ ნოტს ერთნაირი სიგრძით, „ლა“-თი (ან „ნა“-თი, ან ნოტების სახელებით, თუ ასე შეთანხმდით). საკრავზეც შეიძლება.`],
  ['ექო', 'წრის პირველი მოთამაშე მაშინვე იმეორებს — ერთხელ. სწორია: წამყვანი სვეტში ✓-ს სვამს. შეცდა (სხვა ნოტი, გამოტოვებული ან ზედმეტი): ✗ — მოთამაშე წრიდან გადის და გულშემატკივარი ხდება.'],
  ['წრე', 'შემდეგ მოთამაშეს წამყვანი იმავე ფრაზას ხელახლა უმღერის, და ასე ყველას. როცა ყველამ, ვინც დარჩა, გაიმეორა, ფრაზა ერთი ნოტით იზრდება: 4, 5, 6… 12-მდე.'],
  ['მოგება', 'ვინც ბოლოს დარჩება, ის იგებს და პირველი ცდის, თქვას, რომელი ჰანგი იყო. თუ ყველამ ერთად შეცდა — ბოლო სწორი წრის მოთამაშეები იყოფენ მოგებას. თუ 12 ნოტი რამდენიმემ გაიმეორა — ახალი ჰანგი მხოლოდ მათთვის.'],
  ['გუნდებად', '2–6 გუნდი: გუნდი ერთად, ერთხმად იმეორებს. სწორ ფრაზაზე — იმდენი ქულა, რამდენი ნოტიცაა; შეცდა — ამ ჰანგში გადის. ჰანგი მანამდე გრძელდება, სანამ ერთი გუნდი არ დარჩება.'],
  ['გაფუჭებული ტელეფონი', 'წამყვანი 5–6 ნოტს ჩუმად უმღერის ყურში პირველს, ის — შემდეგს, და ასე წრის ბოლომდე. ბოლო ხმამაღლა მღერის, მერე წამყვანი — ნამდვილს. სიცილი გარანტირებულია!'],
  ['უფრო ადვილად', 'პატარებთან ორი სიცოცხლე (✗✗ და გადის), ან წამყვანი ფრაზას ორჯერ მღერის. შეიძლება 3 ნოტის ნაცვლად 2-ით დაიწყოთ.'],
  ['უფრო რთულად', 'ვინც ნოტებს სწავლობს, იმეორებს სახელებით: „სოლ, ლა, სოლ, ფა“ — სახელები ნოტების ქვეშ აწერია.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ექო“ სმენისა და მეხსიერების თამაშია: რამდენ ნოტს გაიმეორებ ზუსტად? ჰანგები სკოლის წიგნების საგალობლები და ხალხური სიმღერებია — ბოლოს ყველა გაიგებს, რომლის დასაწყისი იყო.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ტელეფონი ჰანგს ფერადი კლავიშებით უკრავს — მარტო, წრეში (ტელეფონი ხელიდან ხელში) ან ონლაინ, კლასთან ერთად — sagandzureli.ge → თამაშები → ექო.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.eq-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.eq-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.eq-mHead b{font-size:13pt;color:var(--wine)}
.eq-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.eq-mels{position:absolute;left:10mm;right:10mm;top:19mm;bottom:21mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(5,1fr);gap:3mm 4mm}
.eq-mel{border:.3mm solid var(--line);border-radius:2.2mm;padding:2.4mm 3mm 1.6mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.eq-melHead{display:flex;gap:2.4mm;align-items:flex-start}
.eq-no{flex:none;width:7.2mm;height:7.2mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.eq-melT{min-width:0;display:flex;flex-direction:column;line-height:1.2}
.eq-melT b{font-size:11pt;color:var(--brown)}
.eq-melT span{font-size:8.6pt;color:var(--muted);margin-top:.4mm}
.eq-staff{margin-top:auto;margin-bottom:auto;padding-top:.6mm}
.eq-staff svg{display:block;width:100%;height:auto;overflow:visible}
.eq-own .eq-lines{display:flex;flex-direction:column;gap:2mm;margin:2.4mm 0 1.4mm}
.eq-own .eq-lines i{display:block;border-bottom:.25mm solid #9d8c77;height:0}
.eq-twelve{display:flex;justify-content:space-between;padding:0 2mm;font-size:8.5pt;color:var(--muted)}
.eq-legend{position:absolute;left:10mm;right:10mm;bottom:8.5mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.eq-legend b{color:var(--wine)}
.eq-ci{position:absolute;inset:12mm 12mm 12mm}
.rs-date i.s,.eq-end i.s{width:12mm}
table.eq-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.eq-tab th,.eq-tab td{border:.25mm solid #bba98f;text-align:center}
.eq-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:8mm}
.eq-tab td{height:11.6mm}
.eq-tab .n{width:8mm}
.eq-tab td.n{font-weight:700;color:var(--wine);background:var(--cream)}
.eq-tab .who{width:44mm;text-align:left;padding-left:2mm}
.eq-tab th.l{font-size:11pt}
.eq-tab .pl{width:17mm}
.eq-tab tr:nth-child(odd) td.l{background:#fdfaf3}
.eq-end{display:flex;gap:8mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.eq-end span{display:flex;gap:2mm;align-items:baseline}
.eq-end span:first-child{flex:1}
.eq-end i{display:inline-block;flex:1;border-bottom:.3mm solid #bba98f}
.eq-ex{display:grid;grid-template-columns:92mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.eq-exMel .eq-mel{height:50mm}
.eq-exR h3{margin:0 0 3mm}
.eq-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < PAGES / 2; s++) SHEETS.push({ key: `mel${s + 1}`, front: melodyPage(s * 2), back: melodyPage(s * 2 + 1) });
SHEETS.push({ key: 'circle', front: circlePage, back: circlePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
