// „სამშვილდის ღამე“ — the school's Mafia (plan doc, tab „6 სამაგიდო თამაში“): 24 role cards, 4 reminder cards, the
// chronicler's sheet (night script, roles table, chronicle grid), the day/night disk, two mats and a box label. Series №2.
import { C, SERIES, SCHOOL, aso, esc, icon, corners, braid, bolnisiCross, borjgali, crescentStars, cardSheet, page, stripe, foot } from '../lib.mjs';

export const id = 'samshvildis-game';
export const title = 'სამშვილდის ღამე';
const NO = 2;
const META = '6–16 მოთამაშე + მემატიანე · 10 წლიდან · 20–45 წუთი';

const CITIZENS = [
  ['მჭედელი', ['hammer', 'anvil']], ['მეთუნე', ['amphora']], ['მევენახე', ['grape']], ['მეწისქვილე', ['wheat']],
  ['მქსოველი', ['spool']], ['მეპურე', ['croissant', 'flame']], ['მწყემსი', ['mountain', 'footprints']], ['ოქრომჭედელი', ['gem']],
  ['ქვისმთლელი', ['pickaxe']], ['მგალობელი', ['music']], ['მწიგნობარი', ['feather', 'scroll-text']], ['მხატვარი', ['paintbrush', 'palette']],
];
const CITIZEN_TEXT = 'დღისით ბჭობ და ხმას აძლევ, ღამით გძინავს. ხელობა მხოლოდ სურათია — ძალა ყველას ერთნაირი აქვს: მსჯელობა და ხმა.';
const ROLES = [
  { name: 'ჯაშუში', kind: 'spy', n: 4, icons: ['mail', 'moon'], text: 'მტრის ჯაშუში ხარ, მოქალაქედ გადაცმული. ღამით სხვა ჯაშუშებთან ერთად ერთ მოქალაქეს ტყვედ მიჰყავხართ.' },
  { name: 'ჯაშუშთა თავკაცი', kind: 'spy', n: 1, icons: ['stamp', 'moon'], text: 'ჯაშუშებთან ერთად იღვიძებ; თუ ვერ შეთანხმდნენ, შენ წყვეტ. ციხისთავის შემოწმებისას მოქალაქედ ჩანხარ.' },
  { name: 'ციხისთავი', kind: 'role', n: 1, icons: ['castle', 'key'], text: 'ღამით ერთ კაცზე მიუთითებ — მემატიანე თავის დაქნევით გეტყვის, ჯაშუშია თუ არა. 13 მოთამაშიდან მეციხოვნე გეხმარება.' },
  { name: 'მეციხოვნე', kind: 'role', n: 1, icons: ['shield', 'sword'], text: 'ციხისთავთან ერთად იღვიძებ, ერთად ამოწმებთ ერთ კაცს და ერთმანეთს ენდობით. თამაშობს 13 მოთამაშიდან.' },
  { name: 'მკურნალი', kind: 'role', n: 1, icons: ['lamp', 'book-open'], text: 'კარაბადინის მცოდნე ხარ. ღამით ერთ სახლს ლამპრით იცავ — იქ გატაცება არ ხდება. ზედიზედ ერთსა და იმავეს არა.' },
  { name: 'უხუცესი', kind: 'role', n: 1, icons: ['door-open', 'user'], text: 'ქალაქის პატივცემული უხუცესი ხარ. პირველ გატაცებას გადაურჩები — მეზობლები გიდარაჯებენ; მეორეს ვეღარ.' },
  { name: 'მესტვირე', kind: 'role', n: 1, icons: ['music', 'wind'], text: 'ღამით ერთ კაცს სტვირით აძინებ — მისი მოქმედება ამ ღამეს არ ითვლება. ზედიზედ ერთსა და იმავეს არა, შედეგს ვერ იგებ.' },
  { name: 'მემატიანე', kind: 'role', n: 1, icons: ['feather', 'scroll-text'], text: 'თამაშს მართავ და არ თამაშობ. ღამის სიტყვებს ფურცლიდან კითხულობ, ყველაფერს მატიანეში იწერ და ბოლოს ჰყვები.' },
];

const frame = '<div class="frame"></div><div class="frame2"></div>';
const roleCard = ({ name, kind, icons, text, label }) => `<div class="card ${kind}">${frame}${corners(kind === 'cit' ? C.gold : C.gold, 8)}
<div class="body">
  <div class="kind">${esc(label ?? (kind === 'cit' ? 'მოქალაქე' : kind === 'spy' ? 'ჯაშუში' : 'როლი'))}</div>
  <div class="ttl aso fit"><span>${aso(name)}</span></div>
  <div class="short fit"><span>${esc(name)}</span></div>
  <div class="portrait"><div class="wm aso">${aso(name[0])}</div>${icons.map(n => icon(n, { size: 12, color: kind === 'spy' ? '#f0d9a0' : C.goldDark, width: 1.3 })).join('')}</div>
  <div class="txt">${esc(text)}</div>
</div></div>`;
const spareCard = `<div class="card">${frame}<div class="body"><div class="kind">სათადარიგო</div><div class="short">&nbsp;</div><div class="portrait"></div><div class="txt small">დაკარგულის ნაცვლად — როლი და ტექსტი მარკერით.</div></div></div>`;

const cardBack = `<div class="card dark"><div class="frame"></div>${corners(C.gold, 10, 5)}
<div class="cross">${bolnisiCross(34, C.gold)}</div><div class="series">${esc(SERIES)}</div></div>`;

const reminderFront = `<div class="card">${frame}<div class="body rem">
  <div class="band"><div class="aso">ႶႠႫႤ</div><div class="bandSub">ღამე · რიგი</div></div>
  <ol class="steps">
    <li><b>მესტვირე</b> — ერთ კაცს აძინებს</li>
    <li><b>ჯაშუშები</b> — ერთ მოქალაქეზე მიუთითებენ (10-მდე თვლა; ვერ შეთანხმდნენ — თავკაცი წყვეტს)</li>
    <li><b>მკურნალი</b> — ერთ სახლს იცავს</li>
    <li><b>ციხისთავი</b> (13-დან მეციხოვნეც) — ერთ კაცს ამოწმებს: თავის დაქნევა „ჯაშუშია / არა“</li>
  </ol>
  <div class="remFoot">${icon('moon', { size: 3.2, color: C.wine, width: 2 })} ყველა თვალს ხუჭავს · დისკი მთვარისკენ · დამკვირვებელი ჩუმადაა</div>
</div></div>`;
const reminderBack = `<div class="card">${frame}<div class="body rem">
  <div class="band"><div class="aso">ႡႽႭႡႠ</div><div class="bandSub">დღე · ნაბიჯები</div></div>
  <ol class="steps">
    <li><b>დილის ამბავი</b> — „ტყვედ წაიყვანეს …“ ან „ღამე მშვიდად ჩაიარა“; წაყვანილი ერთ წინადადებას ამბობს და დამკვირვებელი ხდება</li>
    <li><b>სიტყვა</b> — თითოს 1 წუთი რიგით, ბოლოს ბრალდება. ერთი ლაპარაკობს, სხვები უსმენენ</li>
    <li><b>ხმა</b> — ხელის აწევით, სავალდებულო; ყველაზე მეტი ხმა — ციხეში. ფრე: 30-30 წმ და ხმა თავიდან; ისევ ფრე — არავინ</li>
    <li><b>გამარჯვება</b> — ქალაქი: ყველა ჯაშუში ციხეშია. ჯაშუშები: რიცხვით ქალაქელებს გაუტოლდნენ</li>
  </ol>
</div></div>`;

const fronts = [], backs = [];
for (const [name, icons] of CITIZENS) { fronts.push(roleCard({ name, kind: 'cit', icons, text: CITIZEN_TEXT })); backs.push(cardBack); }
for (const r of ROLES) for (let k = 0; k < r.n; k++) { fronts.push(roleCard(r)); backs.push(cardBack); }
fronts.push(spareCard); backs.push(cardBack);
for (let k = 0; k < 4; k++) { fronts.push(reminderFront); backs.push(reminderBack); }
fronts.push(spareCard); backs.push(cardBack);
fronts.push(spareCard); backs.push(cardBack);

const ROLE_TABLE = [
  // players, spies, boss, warden, guard, healer, elder, piper, citizens
  [6, 1, 0, 1, 0, 1, 0, 0, 3], [7, 2, 0, 1, 0, 1, 0, 0, 3], [8, 2, 0, 1, 0, 1, 0, 0, 4], [9, 1, 1, 1, 0, 1, 1, 0, 4], [10, 1, 1, 1, 0, 1, 1, 0, 5],
  [11, 2, 1, 1, 0, 1, 1, '•', '5 (4)'], [12, 2, 1, 1, 0, 1, 1, '•', '6 (5)'], [13, 2, 1, 1, 1, 1, 1, '•', '6 (5)'], [14, 2, 1, 1, 1, 1, 1, '•', '7 (6)'],
  [15, 3, 1, 1, 1, 1, 1, 1, 6], [16, 3, 1, 1, 1, 1, 1, 1, 7],
];
const roleTable = (cls = 't') => `<table class="${cls} roles"><tr><th>მოთამაშე</th><th>ჯაშუში</th><th>თავკაცი</th><th>ციხისთავი</th><th>მეციხოვნე</th><th>მკურნალი</th><th>უხუცესი</th><th>მესტვირე</th><th>მოქალაქე</th></tr>
${ROLE_TABLE.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="n"' : ''}>${c === 0 ? '—' : c}</td>`).join('')}</tr>`).join('')}</table>
<p class="small">• მესტვირე — სურვილით, გამოცდილ ჯგუფში (მაშინ მოქალაქე ფრჩხილებში). 16-ზე მეტი — ორი მაგიდა, ორი მემატიანე.</p>`;

const GLOSS = [['სამშვილდე', 'ციხე-ქალაქი ხრამის ხეობაში, ქვემო ქართლში; 1110 წელს დავით აღმაშენებელმა დაიბრუნა'], ['ბჭობა, ბჭე', 'საქმის განხილვა და განსჯა; მსაჯული'], ['უხუცესი', 'პატივცემული, ხანდაზმული წინამძღოლი'], ['ციხისთავი', 'ციხის უფროსი'], ['მეციხოვნე', 'ციხის მცველი მეომარი'], ['კარაბადინი', 'XI საუკუნის სამკურნალო წიგნი'], ['მემატიანე', 'მატიანის — ისტორიის წიგნის — დამწერი'], ['მესტვირე', 'სტვირზე, გუდასტვირზე დამკვრელი'], ['დიდგორი', '1121 წლის 12 აგვისტოს „ძლევაჲ საკვირველი“ — დიდგორის ბრძოლა']];

const coverPage = page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">სამშვილდის ღამე</h1>
  <div class="lead">ჯაშუშები ციხე-ქალაქში, 1121 წლის ზაფხული — ბჭობის, ეჭვისა და ერთობის თამაში დიდგორის წინ<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>გვერდი</th><th>ბეჭდვა · ჭრა</th></tr>
        <tr><td>როლის ბარათები (12 მოქალაქე, 5 ჯაშუში, 6 როლი, მემატიანე)</td><td>24 + 3*</td><td>2–5 · ზურგი 6–9</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>შეხსენების ბარათები (ორმხრივი)</td><td>4</td><td>5 · მეორე მხარე 9</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>წესების ფურცელი (ორმხრივი)</td><td>1</td><td>10–11</td><td><span class="chk"></span></td></tr>
        <tr><td>მემატიანის ფურცელი (ორმხრივი, ლამინირებული)</td><td>1</td><td>12–13</td><td><span class="chk"></span></td></tr>
        <tr><td>დღე/ღამის დისკი ⌀80 მმ (ორმხრივი)</td><td>1</td><td>14</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>ხალიჩები „ციხე“ და „ტყვეობა“ (A5)</td><td>2</td><td>15</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>ყუთის ეტიკეტი (A5)</td><td>1</td><td>16</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>ქვიშის საათი 60 წმ · თვალსაფარები · მშრალი მარკერი</td><td>1 · 16 · 1</td><td>საყიდელია, სურვილით</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">* 3 სათადარიგო ბარათი — დაკარგულის ნაცვლად, მარკერით ჩასაწერი.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li>ბეჭდვა <b>100%-ზე</b>, „fit to page“ გამორთული. ჯერ ერთი საცდელი გვერდი — ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები — <b>300 გ მუყაოზე</b>; ყდა (ჩასადები) ან მქრქალი ლამინაცია აუცილებელია, რომ ბარათი ზურგით არ გაირჩეს. ზურგის გვერდები სარკისებურადაა — ორმხრივი ბეჭდვა გრძელი კიდით.</li>
        <li>მემატიანის ფურცელი და ხალიჩები — 160–200 გ ქაღალდი + ლამინაცია; იწერება მშრალი მარკერით.</li>
        <li>დისკი — ორივე მხარე ამოჭერი და 2–3 მმ მუყაოზე ზურგით დააკარი.</li>
        <li>ყუთი — მზა მუყაოს ყუთი ≈120×100×45 მმ, ეტიკეტი ზემოდან.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „მაფიის“ (დიმიტრი დავიდოვი, 1986) სალაპარაკო თამაშის წესების მიხედვით. სახელები, ტექსტი და ნახატები საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება. თამაშში არავინ იღუპება — ტყვეობა და ციხეა.</div>
      <p class="small">პორტრეტების ადგილი ბარათებზე ჯერ ორნამენტითაა — სურათები მერე დაემატება. როლების სახელები და ბჭობის ტექსტი მოძღვარსა და მასწავლებელს ვაჩვენოთ.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES_A = [
  ['მომზადება', 'მოთამაშეები წრეში სხედან, ერთი მემატიანეა და არ თამაშობს. მემატიანე ბარათებს ცხრილით ირჩევს (მემატიანის ფურცელზეა), ურევს და თითოს ურიგებს პირქვე. ყველა ჩუმად უყურებს თავის ბარათს და მალავს. მემატიანე ხმამაღლა ამბობს, რამდენი ჯაშუშია ქალაქში (თავკაციც ითვლება). დისკი მზის მხარით დევს.'],
  ['პირველი ღამე — გაცნობა', '„ღამე დგება სამშვილდეში, ყველა თვალს ხუჭავს.“ დისკი ტრიალდება. „ჯაშუშებო, გაიღვიძეთ“ — ჯაშუშები და თავკაცი ერთმანეთს იცნობენ, არავის იტაცებენ და თვალს ხუჭავენ. მერე მემატიანე ციხისთავს (მეციხოვნესთან ერთად), მკურნალს, უხუცესსა და მესტვირეს ცალ-ცალკე აღვიძებს, რომ გაიცნოს, და ბოლოს ამბობს: „დილა თენდება, ყველა იღვიძებს“.'],
  ['პირველი დილა — გაცნობის ბჭობა', 'გატაცება არ ყოფილა. ყველა რიგით ამბობს თავის ხელობას და ერთ წინადადებას თავის თავზე. ბრალდება და ხმა ამ დღეს არ არის — მერე ისევ ღამე.'],
  ['ჩვეულებრივი ღამე', 'ყველა თვალს ხუჭავს, რიგი ასეთია: <b>(ა)</b> მესტვირე იღვიძებს და ერთ კაცზე მიუთითებს — მას ამ ღამეს მოქმედება არ ეთვლება; ზედიზედ ერთსა და იმავეზე არა, თავის თავზე არა. <b>(ბ)</b> ჯაშუშები იღვიძებენ და ჩუმად ერთ მოქალაქეზე მიუთითებენ; მემატიანე 10-მდე ითვლის — თუ ვერ შეთანხმდნენ, თავკაცი წყვეტს, უთავკაცოდ კი ამ ღამეს არავინ იტაცება. <b>(გ)</b> მკურნალი იღვიძებს და ერთ სახლზე მიუთითებს — თავისზეც შეიძლება, მაგრამ ზედიზედ ერთსა და იმავეზე არა. <b>(დ)</b> ციხისთავი (13-დან მეციხოვნესთან ერთად) იღვიძებს და ერთ კაცზე მიუთითებს; მემატიანე თავს უქნევს „ჯაშუშია“ ან „არა“ — თავკაცზე ყოველთვის „არა“. მემატიანე ყველაფერს ცხრილში იწერს. დამკვირვებლად ქცეული როლის რიგზეც იმავე სიტყვებს ამბობს და იმავე პაუზას აკეთებს, რომ არავინ მიხვდეს.'],
  ['დაძინებულის წესი (მესტვირე)', 'დაძინებული მკურნალი — მისი დაცვა არ ითვლება. დაძინებული ციხისთავი — მემატიანე ხელს თვალებზე იფარებს: „ამ ღამეს პასუხი არ არის“. დაძინებული ჯაშუში — თუ სხვა ჯაშუშებიც არიან, ისინი მაინც იტაცებენ; თუ მარტო ის დარჩა, ამ ღამეს გატაცება არ ხდება. მესტვირე შედეგს არ იგებს.'],
  ['დილა', 'დისკი მზისკენ ტრიალდება. მემატიანე ამბობს: „ამ ღამეს ტყვედ წაიყვანეს …“. თუ მკურნალმა ის სახლი დაიცვა, უხუცესი პირველად აირჩიეს ან ჯაშუშები ვერ შეთანხმდნენ, ამბობს: „ღამე მშვიდად ჩაიარა“ — რატომ, არ ამბობს. წაყვანილი ერთ დამშვიდობების წინადადებას ამბობს, ბარათს პირქვე დებს ტყვეობის ხალიჩაზე და დამკვირვებელი ხდება: უყურებს, არ ლაპარაკობს, არ ანიშნებს.'],
  ['ბჭობა — სიტყვა', 'მემატიანე ყოველ დღე სხვა კაციდან იწყებს წრეს. თითოეულს 1 წუთი აქვს ქვიშის საათით (ან მემატიანის თვლით): ამბობს, ვინ ეეჭვება და რატომ. სიტყვის ბოლოს შეუძლია ერთი კაცის დაბრალება: „ვაბრალებ …-ს“. სხვები არ აწყვეტინებენ — ეს ბჭობის წესია. შეურაცხყოფა არ შეიძლება, მხოლოდ საბუთი.'],
  ['ბჭობა — ხმის მიცემა', 'მემატიანე ბრალდებულებს რიგით ასახელებს, ყველა მოთამაშე (დამკვირვებლების გარდა) ერთხელ აწევს ხელს — ხმის მიცემა სავალდებულოა. ვისაც ყველაზე მეტი ხმა აქვს, ციხეში ჯდება: ბარათი პირქვე ციხის ხალიჩაზე, თვითონ დამკვირვებელი ხდება, როლი არ ცხადდება. თუ ბრალდებული ერთია, ხმა „ციხეში“ ან „არა“ — ჯდება მხოლოდ მაშინ, თუ ხმების ნახევარზე მეტი აქვს. ფრეზე ფრეს მონაწილეები 30-30 წამს ლაპარაკობენ და ხმა თავიდან იწყება მხოლოდ მათზე; ისევ ფრე — დღეს არავინ ჯდება. თუ დღეს არავის დააბრალეს, ციხეში არავინ ჯდება.'],
];
const RULES_B = [
  ['გამარჯვების შემოწმება', 'ყოველი დილისა და ყოველი ბჭობის მერე. ქალაქი იმარჯვებს, როცა ყველა ჯაშუში (თავკაცთან ერთად) ციხეშია. ჯაშუშები იმარჯვებენ, როცა მათი რიცხვი დარჩენილი ქალაქელების რიცხვს გაუტოლდება. მემატიანე მაშინვე აჩერებს თამაშს და ამბობს: „ძლევაჲ საკვირველი — ქალაქი დაცულია, ლაშქარი დიდგორისკენ მიდის“ ან „ჯაშუშებმა ციხის კარი გააღეს“.'],
  ['თუ არავინ გაიმარჯვა', 'ისევ ღამე (წესი 4), დილა და ბჭობა. ასე მეორდება ბოლომდე.'],
  ['მატიანის კითხვა', 'მემატიანე ყველა ბარათს ხსნის და მოკლედ ჰყვება, რა მოხდა: ვინ ვინ შეამოწმა, ვინ ვინ დაიცვა, ვინ იყო უხუცესი. ბჭობა ტაშით ირჩევს „ქალაქის დარბაისელს“ — ვინც ყველაზე მშვიდად და ჭკვიანურად ლაპარაკობდა, თუნდაც წაგებული მხრიდან. ტყვეები „თავისუფლდებიან“ — ყველა ერთ წრეში ბრუნდება.'],
  ['მარტივი ვარიანტი პატარებისთვის', '9 წლიდან, 6–9 მოთამაშე: მხოლოდ ჯაშუშები, ციხისთავი, მკურნალი და მოქალაქეები; სიტყვა 30 წამი; პირველი ღამე-გაცნობა და გაცნობის ბჭობა რჩება. სრული ვარიანტი 10 წლიდან.'],
  ['ბალანსის რჩევა', 'თუ ქალაქი ზედიზედ სამჯერ იგებს, ერთი ჯაშუში დაამატეთ; თუ ჯაშუშები — ერთი მოაკელით ან მესტვირე ამოიღეთ.'],
  ['ქცევის წესები', 'დამკვირვებლები ჩუმად არიან და მემატიანეს ეხმარებიან — დისკს ატრიალებენ და ქვიშის საათს აბრუნებენ; ღამით თვალის გახელა — ერთი შენიშვნა, მეორეზე მოთამაშე დამკვირვებელი ხდება; ბარათი არავის ეჩვენება, არც თამაშიდან გასვლის მერე; წაგებულს არავინ დასცინის — ჯაშუშებიც თანაკლასელები არიან.'],
  ['დრო', '6–8 მოთამაშე ≈ 20 წთ, 9–12 ≈ 30 წთ, 13–16 ≈ 45 წთ. გაკვეთილის ბოლოს მემატიანე 2–3 წინადადებით იწერს მატიანეს კლასის რვეულში — ასე გროვდება სკოლის საკუთარი „ქართლის ცხოვრება“.'],
];
const rulesList = (items, start) => `<ol start="${start}">${items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;

const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">სამშვილდის ღამე — წესები · ${META}</div></div>
  <p class="lead">1121 წლის ზაფხული, დიდგორის ბრძოლამდე რამდენიმე დღით ადრე. სამშვილდე — ციხე-ქალაქი ხრამის ხეობაში. მოთამაშეები ქალაქის მკვიდრნი არიან: მჭედელი, მეთუნე, მევენახე, მგალობელი… მათ შორის მტრის ჯაშუშები იმალებიან, ქალაქელებად გადაცმულნი. ღამით ჯაშუშები ერთ მოქალაქეს ტყვედ მიჰყავთ, დილით ქალაქი სიონის ეზოში ბჭობაზე იკრიბება და ხმით წყვეტს, ვინ ჩასვან ციხეში. ყველა ყველას ეჭვით უყურებს, ქალაქი კი მხოლოდ ერთობით იმარჯვებს — ეს დიდგორის სულია.</p>
  <div class="rules">${rulesList(RULES_A, 1)}</div>
</div>
${foot(`<span>${esc(title)} · წესები 1/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}
<div class="rulesWrap">
  <div class="rules">${rulesList(RULES_B, 9)}</div>
  <div class="two2">
    <div><h3>როლები მოკლედ</h3>
      <p class="pp"><b>მოქალაქე</b> — დღისით ბჭობს და ხმას აძლევს; 12 ხელობა მხოლოდ სურათია.</p>
      <p class="pp"><b>ჯაშუში</b> — ღამით სხვა ჯაშუშებთან ერთად ერთ მოქალაქეს ტყვედ მიჰყავს; ერთმანეთს პირველი ღამიდან იცნობენ.</p>
      <p class="pp"><b>ჯაშუშთა თავკაცი</b> — ჯაშუშებთან ერთად იღვიძებს, დავას წყვეტს; ციხისთავს „მოქალაქედ“ ჩანს. 9 მოთამაშიდან.</p>
      <p class="pp"><b>ციხისთავი</b> — ღამით ერთ კაცს ამოწმებს; 13-დან მეციხოვნესთან ერთად.</p>
      <p class="pp"><b>მკურნალი</b> — ღამით ერთ სახლს ლამპრით იცავს.</p>
      <p class="pp"><b>უხუცესი</b> — პირველ გატაცებას გადაურჩება. 9 მოთამაშიდან.</p>
      <p class="pp"><b>მესტვირე</b> — ღამით ერთ კაცს აძინებს. სურვილით, 11-დან, გამოცდილ ჯგუფში.</p>
      <p class="pp"><b>მემატიანე</b> — თამაშს მართავს, არ თამაშობს, ყველაფერს იწერს.</p>
      <p class="pp"><b>დამკვირვებელი</b> — ტყვედ წაყვანილი ან ციხეში ჩასმული: უყურებს, არ ლაპარაკობს, არ ანიშნებს; დისკსა და ქვიშის საათს ატრიალებს.</p>
    </div>
    <div><h3>რას ასწავლის</h3>
      <p class="pp"><b>ისტორია:</b> დავით აღმაშენებელი, სამშვილდის დაბრუნება (1110), დიდგორი (12 აგვისტო 1121), თბილისის გათავისუფლება (1122), გელათის აკადემია (1106); ძველი თანამდებობები და 12 ძველი ხელობა.</p>
      <p class="pp"><b>მენტალობა:</b> სიტყვის პატივისცემა — ერთი ლაპარაკობს, სხვები უსმენენ; კამათი საბუთით და არა ყვირილით; სიმართლის მშვიდად დაცვა, როცა გეჭვებენ.</p>
      <p class="pp"><b>ერთობა:</b> ქალაქს მარტო ვერავინ გადაარჩენს; ერთი უყურადღებო ხმა მთელ ქალაქს აზარალებს. წაგებაც თამაშის ნაწილია.</p>
      <h3>ახალი სიტყვები</h3>
      <p class="gl">${GLOSS.map(([w, d]) => `<b>${w}</b> — ${d}`).join('; ')}.</p>
      <p class="small">შექმნილია „მაფიის“ (დიმიტრი დავიდოვი, 1986) წესების მიხედვით; სახელები, ტექსტი და ნახატები საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · წესები 2/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const SCRIPT = [
  ['ღამე', '„ღამე დგება სამშვილდეში. ყველა თვალს ხუჭავს, თავს ხრის.“ — დისკი მთვარისკენ.'],
  ['მესტვირე', '„მესტვირევ, გაიღვიძე. ვის აძინებ ამ ღამეს?“ … „მესტვირევ, დაიძინე.“'],
  ['ჯაშუშები', '„ჯაშუშებო, გაიღვიძეთ. ვინ მიგყავთ ტყვედ? ერთზე შეთანხმდით — ვითვლი ათამდე.“ … „ჯაშუშებო, დაიძინეთ.“'],
  ['მკურნალი', '„მკურნალო, გაიღვიძე. რომელ სახლს იცავ ლამპრით?“ … „მკურნალო, დაიძინე.“'],
  ['ციხისთავი', '„ციხისთავო (და მეციხოვნევ), გაიღვიძე. ვის ამოწმებ?“ — თავის დაქნევა: ჯაშუშია / არა. … „ციხისთავო, დაიძინე.“'],
  ['დილა', '„დილა თენდება სამშვილდეში, ყველა იღვიძებს.“ — დისკი მზისკენ. „ამ ღამეს ტყვედ წაიყვანეს …“ ან „ღამე მშვიდად ჩაიარა.“'],
  ['პირველი ღამე', 'იგივე სიტყვები, მაგრამ: „ჯაშუშებო, გაიღვიძეთ და ერთმანეთი გაიცანით. ამ ღამეს არავინ მიგყავთ.“ ყოველ როლს ცალ-ცალკე აღვიძებ გასაცნობად.'],
  ['ბჭობა', '„ბჭობა იწყება. სიტყვა … -ს.“ — თითოს 1 წუთი. „ვინ ვის აბრალებს?“ — „ხმას ვაძლევთ: ვინ ამბობს, რომ … ციხეში ჩაჯდეს?“'],
  ['დასასრული', '„ძლევაჲ საკვირველი — ქალაქი დაცულია, ლაშქარი დიდგორისკენ მიდის!“ ან „ჯაშუშებმა ციხის კარი გააღეს.“ — მერე მატიანის კითხვა და „ქალაქის დარბაისლის“ არჩევა ტაშით.'],
];
const chronPage1 = page(`${stripe(NO, 'მემატიანის ფურცელი · 1')}
<div class="rulesWrap chron">
  <div class="rhead"><div class="aso rtitle">ႫႠႲႨႠႬႤ</div><div class="rsub">მემატიანის ფურცელი — ღამის სიტყვები, როლების ცხრილი, ახალი სიტყვები</div></div>
  <h3 class="h">ღამის სიტყვები — სიტყვასიტყვით</h3>
  <div class="rules script">${SCRIPT.map(([h, t]) => `<p class="pp"><b>${h}.</b> ${t}</p>`).join('')}
    <p class="small">დამკვირვებლად ქცეული როლის რიგზეც იმავე სიტყვებს ამბობ და იმავე პაუზას აკეთებ. დაძინებულ ციხისთავს ხელს თვალებზე იფარებ: „ამ ღამეს პასუხი არ არის“.</p></div>
  <h3 class="h">როლების ცხრილი</h3>${roleTable('t')}
  <h3 class="h">ახალი სიტყვები</h3>
  <div class="glossGrid">${GLOSS.map(([w, d]) => `<p class="pp gl1"><b>${w}</b> — ${d}</p>`).join('')}</div>
</div>
${foot(`<span>${esc(title)} · მემატიანის ფურცელი 1/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const ROUNDS = 10, NAMES = 16;
const chronPage2 = page(`${stripe(NO, 'მემატიანის ფურცელი · 2')}
<div class="rulesWrap chron">
  <div class="rhead"><div class="aso rtitle">ႫႠႲႨႠႬႤ</div><div class="rsub">მატიანის ცხრილი — მშრალი მარკერით · თარიღი ______ · მემატიანე ______ · ჯაშუში ___</div></div>
  <table class="t chronGrid">
    <tr><th class="nm" rowspan="2">სახელი · როლი</th>${Array.from({ length: ROUNDS }, (_, i) => `<th colspan="2">${i + 1}</th>`).join('')}</tr>
    <tr>${Array.from({ length: ROUNDS }, () => '<th class="sub">ღ</th><th class="sub">დ</th>').join('')}</tr>
    ${Array.from({ length: NAMES }, (_, i) => `<tr><td class="nm">${i + 1}.</td>${'<td></td>'.repeat(ROUNDS * 2)}</tr>`).join('')}
  </table>
  <div class="legend"><b>ნიშნები:</b> ✕ ტყვედ წაიყვანეს · ⌂ ციხეში ჩაჯდა · ? შეამოწმეს · ☼ დაიცვეს · ♪ დააძინეს · ✓ ჯაშუშია · ○ არა · ბ — ბრალდება · ხმები რიცხვით. „ღ“ — ღამე, „დ“ — დღე.</div>
</div>
${foot(`<span>${esc(title)} · მემატიანის ფურცელი 2/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const diskPage = page(`${stripe(NO, 'დღე/ღამის დისკი')}
<div class="diskWrap">
  <div class="disk day"><div class="ring"></div>${borjgali(42, C.gold)}<div class="aso dlabel">ႣႶႤ</div><div class="dsub">დღე · ბჭობა</div></div>
  <div class="disk night"><div class="ring"></div>${crescentStars(46, C.gold)}<div class="aso dlabel">ႶႠႫႤ</div><div class="dsub">ღამე · ყველა თვალს ხუჭავს</div></div>
  <p class="small center">⌀80 მმ · ორივე წრე ამოჭერი, 2–3 მმ მუყაოზე ზურგით დააკარი. დამკვირვებელი ატრიალებს.</p>
</div>
${foot(`<span>${esc(title)} · დისკი</span><span>${esc(SCHOOL)}</span>`)}`, 'diskP');

const tower = (size) => `<svg viewBox="0 0 100 140" width="${size}mm" height="${size * 1.4}mm" fill="none" stroke="${C.gold}" stroke-width="2" stroke-linejoin="round">
<path d="M30 135 L34 40 L28 40 L28 28 L38 28 L38 36 L46 36 L46 28 L54 28 L54 36 L62 36 L62 28 L72 28 L72 40 L66 40 L70 135 Z"/>
<path d="M44 135 L44 112 A6 6 0 0 1 56 112 L56 135"/><rect x="46" y="60" width="8" height="12" rx="4"/><rect x="46" y="84" width="8" height="12" rx="4"/>
<path d="M10 135 H90" stroke-width="2.5"/><path d="M5 140 Q25 128 45 140" stroke-width="1.2"/><path d="M55 140 Q75 128 95 140" stroke-width="1.2"/></svg>`;
const mat = (name, art, sub) => `<div class="mat"><div class="mTop">${braid(190, 5, { id: 'm' + name.length })}</div>
<div class="mBody"><div class="mArt">${art}</div><div class="mText"><div class="aso mTitle">${aso(name)}</div><div class="mName">${esc(name)}</div><div class="mSub">${esc(sub)}</div></div><div class="mSlot"><span>ბარათები პირქვე</span></div></div>
<div class="mBot">${braid(190, 5, { id: 'n' + name.length })}</div></div>`;
const matsPage = page(`<div class="mats">
${mat('ციხე', tower(40), 'ბჭობამ ციხეში ჩასვა — დამკვირვებელი ხარ')}
${mat('ტყვეობა', `<div class="tentArt">${icon('tent', { size: 30, color: C.gold, width: 1.1 })}${icon('flame', { size: 14, color: C.gold, width: 1.3 })}</div>`, 'ღამით ტყვედ წაგიყვანეს — თამაშის ბოლოს გათავისუფლდები')}
<p class="small center">A5 · შუაზე გაჭერი, ლამინაცია</p></div>`, 'matsP');

const labelPage = page(`<div class="label">
  <div class="lTop">${braid(190, 6, { id: 'l1' })}</div>
  <div class="lBody">
    <div class="lCross">${bolnisiCross(22, C.gold)}</div>
    <div class="aso lTitle">${aso(title)}</div>
    <div class="lName">სამშვილდის ღამე</div>
    <div class="lScene"><svg viewBox="0 0 200 70" width="120mm" height="42mm" fill="none" stroke="${C.gold}" stroke-width="1.4" stroke-linejoin="round">
      <path d="M20 68 L24 30 L20 30 L20 22 L28 22 L28 27 L34 27 L34 22 L42 22 L42 30 L38 30 L42 68 Z"/><path d="M60 68 L63 40 L59 40 L59 33 L66 33 L66 37 L72 37 L72 33 L79 33 L79 40 L75 40 L78 68 Z"/>
      <path d="M120 68 L124 24 L119 24 L119 15 L128 15 L128 20 L136 20 L136 15 L145 15 L145 24 L140 24 L144 68 Z"/><path d="M165 68 L168 42 L164 42 L164 35 L171 35 L171 39 L177 39 L177 35 L184 35 L184 42 L180 42 L183 68 Z"/>
      <path d="M0 68 H200" stroke-width="1.8"/><path d="M42 68 L60 50 L120 50 L120 68" stroke-width="1"/>
      <path d="M100 8 A14 14 0 1 0 100 36 A11 11 0 1 1 100 8 Z" fill="${C.gold}" stroke="none"/>
      ${[[60, 12], [75, 22], [140, 10], [155, 20], [170, 8], [30, 10], [185, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="${C.gold}" stroke="none"/>`).join('')}
    </svg></div>
    <div class="lMeta">${esc(META)}</div>
    <div class="lDesc">ჯაშუშები ციხე-ქალაქში დიდგორის წინ — ბჭობა, ეჭვი და ერთობა. 24 როლის ბარათი · 4 შეხსენება · მემატიანის ფურცელი · დისკი · ორი ხალიჩა</div>
    <div class="lSeries"><span class="aso">${aso(SERIES)} · №${NO}</span><span>${esc(SCHOOL)}</span></div>
  </div>
  <div class="lBot">${braid(190, 6, { id: 'l2' })}</div>
  <p class="small center">ყუთის ეტიკეტი A5 — ამოჭერი ხაზზე და მზა ყუთზე დააკარი</p>
</div>`, 'labelP');

export const css = `
.kind{font-size:7.5pt;color:var(--muted);text-align:center;letter-spacing:.08em;text-transform:uppercase}
.ttl{font-size:10.5pt;color:var(--gold2);text-align:center;line-height:1.2}
.short{font-weight:800;font-size:15pt;color:var(--wine);text-align:center;line-height:1.15;margin:.3mm 0 1.6mm}
.portrait{position:relative;height:33mm;margin:0 .5mm;border:.3mm solid var(--gold);border-radius:26mm 26mm 2mm 2mm;background:radial-gradient(ellipse at 50% 38%,#f8f0de 0%,var(--cream) 58%,#e2d2b2 100%);display:flex;align-items:center;justify-content:center;gap:2.5mm;overflow:hidden}
.portrait .wm{position:absolute;left:0;right:0;top:3mm;text-align:center;font-size:40pt;color:var(--wine);opacity:.07}
.txt{margin-top:2.4mm;font-size:10pt;line-height:1.3;text-align:center}
.txt.small{font-size:8.5pt;color:var(--muted)}
.card.cit .frame{border-color:var(--gold)}
.card.spy{background:linear-gradient(180deg,var(--paper) 0%,#ecdcc6 55%,#c9a98f 100%)}
.card.spy .portrait{background:radial-gradient(ellipse at 50% 38%,#8d3a42 0%,var(--wine) 60%,var(--wine2) 100%);border-color:var(--gold2)}
.card.spy .portrait .wm{color:#f0d9a0;opacity:.12}
.card.spy .kind{color:var(--wine)}
.card.dark .cross{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);line-height:0}
.card.dark .series{position:absolute;bottom:7.5mm;left:0;right:0;text-align:center;font-size:7pt;color:var(--gold);opacity:.85;letter-spacing:.1em}
.rem .band{background:var(--wine);color:var(--paper);text-align:center;padding:1mm 1.5mm 1.2mm;border-radius:1.5mm;margin-bottom:1.6mm}
.rem .band .aso{font-size:12pt;color:#f0d9a0}
.rem .bandSub{font-size:7.5pt;opacity:.9}
.steps{margin:0;padding-left:4.2mm;font-size:8.6pt;line-height:1.25}
.steps li{margin-bottom:1.4mm}
.steps b{color:var(--wine)}
.remFoot{margin-top:auto;font-size:7.5pt;color:var(--brown);text-align:center;line-height:1.2;display:flex;align-items:center;justify-content:center;gap:1mm}
.cover{padding:10mm 14mm 0}
.cover .title{font-size:26pt;color:var(--gold2);letter-spacing:.08em}
.cover .lead{font-size:12pt;margin:3mm 0 7mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{font-size:9.3pt}
.cover table.comp td,.cover table.comp th{padding:1.1mm 1.4mm}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.8pt;line-height:1.35}
.cover .how li{margin-bottom:1.6mm}
.cover .legal{margin-top:3mm;font-size:9pt}
.rulesWrap{padding:6mm 12mm 0}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:var(--wine)}
.rsub{font-size:10.5pt;color:var(--muted)}
.lead{font-size:10.6pt;line-height:1.4;margin:0 0 3mm}
.rules{font-size:10pt}
.two2{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:3mm;font-size:9.5pt;line-height:1.33}
.two2.tight{margin-top:1mm;font-size:9.6pt}
.two2 h3{margin:0 0 1.5mm;color:var(--wine);font-size:11pt}
.two2 table.t{font-size:9pt;margin-bottom:2mm}
.two2 .pp,.two2 .gl{margin:0 0 1.6mm}
.two2 .pp b,.two2 .gl b{color:var(--wine)}
table.roles th{font-size:8pt;padding:1mm .8mm;text-align:center}
table.roles td{text-align:center;padding:.9mm .8mm}
table.roles td.n{font-weight:800;color:var(--wine)}
.gl1{font-size:9.2pt}
table.chronGrid{font-size:9pt;margin-top:2mm;table-layout:fixed}
table.chronGrid th{text-align:center;padding:.8mm .3mm;font-size:8.5pt}
table.chronGrid th.sub{font-weight:400;color:var(--muted);font-size:7.5pt;padding:.3mm}
table.chronGrid td{height:11.6mm;padding:.5mm}
table.chronGrid .nm{width:46mm;text-align:left;font-weight:700;color:var(--wine)}
.chron h3.h{margin:3mm 0 1.5mm;color:var(--wine);font-size:11pt}
.script{font-size:9.6pt;line-height:1.35}
.script .pp{margin:0 0 1.5mm}
.script .pp b{color:var(--wine)}
.glossGrid{display:grid;grid-template-columns:1fr 1fr;gap:0 8mm;font-size:9.4pt}
.glossGrid .pp{margin:0 0 1.2mm}
.glossGrid .pp b{color:var(--wine)}
table.roles{font-size:9pt}
.legend{margin-top:3mm;font-size:9pt;color:var(--brown)}
.diskWrap{display:flex;flex-direction:column;align-items:center;gap:14mm;padding-top:22mm}
.disk{width:80mm;height:80mm;border-radius:50%;position:relative;display:flex;align-items:center;justify-content:center;outline:.2mm solid #888}
.disk .ring{position:absolute;inset:2.5mm;border:.5mm solid var(--gold);border-radius:50%}
.disk.day{background:var(--cream)}
.disk.night{background:var(--night)}
.disk .dlabel{position:absolute;left:0;right:0;top:8mm;text-align:center;font-size:12pt;color:var(--wine);letter-spacing:.15em}
.disk.night .dlabel{color:var(--gold)}
.disk .dsub{position:absolute;left:0;right:0;bottom:8mm;text-align:center;font-size:8.5pt;color:var(--brown)}
.disk.night .dsub{color:#e8dcc8}
.center{text-align:center}
.mats{padding:5mm 10mm 0}
.mat{height:138mm;margin-bottom:5mm;border:.2mm dashed #999;position:relative;background:var(--paper);display:flex;flex-direction:column}
.mTop,.mBot{line-height:0}
.mBody{flex:1;display:flex;align-items:center;gap:8mm;padding:4mm 8mm}
.mArt{width:48mm;display:flex;align-items:center;justify-content:center}
.tentArt{display:flex;flex-direction:column;align-items:center;gap:1mm}
.mText{flex:1}
.mTitle{font-size:24pt;color:var(--wine);letter-spacing:.1em}
.mName{font-size:15pt;font-weight:800;color:var(--brown)}
.mSub{font-size:10.5pt;color:var(--muted);margin-top:2mm}
.mSlot{width:70mm;height:96mm;border:.4mm dashed var(--gold2);border-radius:3mm;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:9.5pt}
.label{padding:8mm 10mm 0}
.lTop,.lBot{line-height:0}
.lBody{height:136mm;background:var(--paper);border:.2mm dashed #999;border-top:0;border-bottom:0;display:flex;flex-direction:column;align-items:center;padding:5mm 10mm 0;text-align:center}
.lCross{line-height:0}
.lTitle{font-size:26pt;color:var(--wine);letter-spacing:.1em;margin-top:2mm}
.lName{font-size:16pt;font-weight:800;color:var(--brown)}
.lScene{margin:2mm 0 1mm;background:var(--night);border-radius:3mm;padding:3mm 6mm 0;line-height:0}
.lMeta{font-size:10.5pt;font-weight:700;color:var(--wine);margin-top:2mm}
.lDesc{font-size:9.5pt;color:var(--brown);max-width:150mm;margin-top:1.5mm;line-height:1.35}
.lSeries{margin-top:auto;margin-bottom:3mm;display:flex;gap:6mm;align-items:center;font-size:9pt;color:var(--brown)}
.lSeries .aso{color:var(--wine);font-size:9.5pt}
`;

export const pages = [
  coverPage,
  cardSheet(fronts.slice(0, 9), { label: 'სამშვილდის ღამე · ბარათები 1/4 — წინა მხარე' }),
  cardSheet(fronts.slice(9, 18), { label: 'სამშვილდის ღამე · ბარათები 2/4 — წინა მხარე' }),
  cardSheet(fronts.slice(18, 27), { label: 'სამშვილდის ღამე · ბარათები 3/4 — წინა მხარე' }),
  cardSheet(fronts.slice(27, 36), { label: 'სამშვილდის ღამე · ბარათები 4/4 — წინა მხარე (შეხსენება და სათადარიგო)' }),
  cardSheet(backs.slice(0, 9), { back: true, label: 'სამშვილდის ღამე · ბარათები 1/4 — ზურგი (სარკისებურად)' }),
  cardSheet(backs.slice(9, 18), { back: true, label: 'სამშვილდის ღამე · ბარათები 2/4 — ზურგი (სარკისებურად)' }),
  cardSheet(backs.slice(18, 27), { back: true, label: 'სამშვილდის ღამე · ბარათები 3/4 — ზურგი (სარკისებურად)' }),
  cardSheet(backs.slice(27, 36), { back: true, label: 'სამშვილდის ღამე · ბარათები 4/4 — ზურგი (სარკისებურად)' }),
  rulesPage1, rulesPage2, chronPage1, chronPage2, diskPage, matsPage, labelPage,
];
