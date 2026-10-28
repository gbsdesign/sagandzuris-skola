// „მეფის კარი“ — the school's Coup (plan doc, tab „6 სამაგიდო თამაში“): 15 courtier cards (+5 for 7–8 players),
// 6 reminder cards, 50 „თეთრი“ coins, a court board, the rules sheet and a tuck box. Series №6.
import { C, SERIES, SCHOOL, aso, esc, icon, corners, braid, borjgali, cardSheet, tokenSheet, page, stripe, foot, duplex, sheetNo } from '../lib.mjs';

export const id = 'mepis-kari';
export const title = 'მეფის კარი';
const NO = 6;
const META = '2–6 მოთამაშე · 10 წლიდან · 15–20 წუთი';

const CHARS = [
  { full: 'მეჭურჭლეთუხუცესი', short: 'ხაზინადარი', action: 'ხარკი', effect: 'აიღე 3 თეთრი ხაზინიდან.', blocks: 'ბლოკავს უცხო ძღვენს.', person: 'ყუთლუ-არსლანი · მეჭურჭლეთუხუცესი, 1184', icons: ['scale', 'hand-coins'] },
  { full: 'მანდატურთუხუცესი', short: 'მანდატური', action: 'განდევნა', effect: 'გადაიხადე 3 თეთრი — სამიზნე ერთ გავლენას კარგავს.', blocks: '', person: 'ჭიაბერი · მანდატურთუხუცესი, 1184-დან', icons: ['door-closed'] },
  { full: 'ამირსპასალარი', short: 'სპასალარი', action: 'ლაშქრის სარჩო', effect: 'აიღე 2 თეთრი სხვა მოთამაშისგან.', blocks: 'ბლოკავს ლაშქრის სარჩოს.', person: 'ზაქარია მხარგრძელი · ამირსპასალარი, 1191–1212', icons: ['swords', 'flag'] },
  { full: 'მსახურთუხუცესი', short: 'მსახურთუხუცესი', action: 'გადანიშვნა', effect: 'აიღე 2 ბარათი კარის დასტიდან, 2 დააბრუნე.', blocks: 'ბლოკავს ლაშქრის სარჩოს — შეუვალობა.', person: 'ივანე მხარგრძელი · მსახურთუხუცესი, 1212-დან ათაბაგი', icons: ['key', 'scroll-text'] },
  { full: 'რუსუდან დედოფალი', short: 'დედოფალი', action: 'ქომაგობა', effect: 'ბლოკავს განდევნას.', blocks: '', note: 'სხვა მოქმედება არ აქვს.', person: 'რუსუდანი · თამარის მამიდა და აღმზრდელი', icons: ['hand', 'crown'] },
];
const FAMILIES = ['თორელები', 'ჯაყელები', 'სურამელები', 'ახალციხელები', 'ვარდანისძეები', 'დადიანები'];

const frame = '<div class="frame"></div><div class="frame2"></div>';

const charCard = (ch, extra = false) => `<div class="card">${frame}${corners(C.gold, 8)}
<div class="body">
  <div class="ttl aso fit"><span>${aso(ch.full)}</span></div>
  <div class="short fit"><span>${esc(ch.short)}</span></div>
  <div class="portrait"><div class="wm aso">${aso(ch.short[0])}</div>${ch.icons.map(n => icon(n, { size: 12, color: C.goldDark, width: 1.3 })).join('')}</div>
  <div class="act"><span class="pill">${esc(ch.action)}</span>${esc(ch.effect)}</div>
  ${ch.blocks ? `<div class="blk">${icon('hand', { size: 4, color: C.wine, width: 2 })}<span>${esc(ch.blocks)}</span></div>` : ''}
  ${ch.note ? `<div class="blk muted"><span>${esc(ch.note)}</span></div>` : ''}
  <div class="cap">${esc(ch.person)}</div>
</div>${extra ? '<div class="badge">7–8 მოთამაშე</div>' : ''}</div>`;

const charBack = `<div class="card dark"><div class="frame"></div>${corners(C.gold, 10, 5)}
<svg class="ring" viewBox="-50 -50 100 100" width="40mm" height="40mm" fill="none" stroke="${C.gold}" stroke-width="1"><circle r="46"/><circle r="40" stroke-dasharray="2 3"/>${Array.from({ length: 12 }, (_, k) => `<path d="M0 -46 C4 -42 4 -38 0 -34 C-4 -38 -4 -42 0 -46Z" fill="${C.gold}" fill-opacity=".7" stroke="none" transform="rotate(${k * 30})"/>`).join('')}</svg>
<div class="mono aso">ႫႩ</div><div class="series">${esc(SERIES)}</div></div>`;

const ACTIONS = [
  ['შემოსავალი', 'ყველა', '+1 თეთრი', '—'],
  ['უცხო ძღვენი', 'ყველა', '+2 თეთრი', 'ხაზინადარი'],
  ['დარბაზი', 'ყველა · −7', 'სამიზნე გავლენას კარგავს', 'არ იბლოკება'],
  ['ხარკი', 'ხაზინადარი', '+3 თეთრი', '—'],
  ['განდევნა', 'მანდატური · −3', 'სამიზნე გავლენას კარგავს', 'დედოფალი'],
  ['ლაშქრის სარჩო', 'სპასალარი', '+2 სხვისგან', 'სპასალარი ან მსახურთუხუცესი'],
  ['გადანიშვნა', 'მსახურთუხუცესი', '2 ბარათი ↔ დასტა', '—'],
];
const actionsTable = (cls = 'rt') => `<table class="${cls}"><tr><th>მოქმედება</th><th>ვინ</th><th>რა ხდება</th><th>ბლოკავს</th></tr>
${ACTIONS.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</table>`;

const REMIND = [
  ['შემოსავალი', 'ყველა · +1 თეთრი', ''],
  ['უცხო ძღვენი', 'ყველა · +2 თეთრი', 'ხაზინადარი'],
  ['დარბაზი', 'ყველა · −7 → სამიზნეს −1 გავლენა', 'არ იბლოკება, არ ეჭვდება'],
  ['ხარკი', 'ხაზინადარი · +3 თეთრი', ''],
  ['განდევნა', 'მანდატური · −3 → სამიზნეს −1 გავლენა', 'დედოფალი'],
  ['ლაშქრის სარჩო', 'სპასალარი · +2 სხვისგან', 'სპასალარი ან მსახურთუხუცესი'],
  ['გადანიშვნა', 'მსახურთუხუცესი · 2 ბარათი ↔ დასტა', ''],
];
const reminderRows = `<div class="rows">${REMIND.map(([a, what, blk]) => `<div class="ra"><b>${a}</b> — ${what}${blk ? `<span class="bl">${icon('hand', { size: 2.8, color: C.wine, width: 2.2 })} ${blk}</span>` : ''}</div>`).join('')}</div>`;
const reminderFront = fam => `<div class="card">${frame}
<div class="body rem">
  <div class="band"><div class="aso fit"><span>${aso(fam)}</span></div><div class="bandSub">შენი სახლი · შეხსენება</div></div>
  ${reminderRows}
</div></div>`;
const reminderBack = `<div class="card">${frame}
<div class="body rem">
  <div class="band"><div class="aso">ႼႤႱႤႡႨ ႫႭႩႪႤႣ</div><div class="bandSub">ბლოკი · ეჭვი · 10 თეთრი</div></div>
  <div class="rb"><b>ბლოკი.</b> დედოფალი ← განდევნა. სპასალარი ან მსახურთუხუცესი ← ლაშქრის სარჩო. ხაზინადარი ← უცხო ძღვენი (ნებისმიერს შეუძლია). ბლოკიც ბლეფი შეიძლება იყოს.</div>
  <div class="rb"><b>ეჭვი — „არ მჯერა!“</b> ვინც პირველმა ასწია ხელი. რიგი: განცხადება → ეჭვი → ბლოკი → ეჭვი ბლოკზე → შედეგი. ბარათი აქვს — აჩვენებს, ახალს იღებს, ეჭვის მთქმელი გავლენას კარგავს. არ აქვს — თვითონ კარგავს, თეთრი ბრუნდება.</div>
  <div class="rb"><b>10 თეთრი</b> სვლის დასაწყისში — დარბაზი სავალდებულოა.</div>
  <div class="rb"><b>ორმაგი საფრთხე.</b> წაგებული ეჭვი + განდევნა = ორი გავლენა ერთ სვლაში.</div>
</div></div>`;

const blankCard = `<div class="card">${frame}<div class="body"><div class="spare">სათადარიგო ბარათი<br><span>დაკარგულის ნაცვლად — სახელი მარკერით</span></div></div></div>`;
const blankBack = charBack;

// sheets: fronts and their backs, index for index (the sheet mirrors the backs)
const fronts = [], backs = [];
for (const ch of CHARS) for (let k = 0; k < 3; k++) { fronts.push(charCard(ch)); backs.push(charBack); }
for (const f of FAMILIES) { fronts.push(reminderFront(f)); backs.push(reminderBack); }
for (const ch of CHARS) { fronts.push(charCard(ch, true)); backs.push(charBack); }
fronts.push(blankCard); backs.push(blankBack);

const coinFront = `<div class="coin"><div class="ring"></div><div class="tetri aso">Ⴇ</div><div class="leaf">${icon('grape', { size: 5, color: C.goldDark, width: 1.6 })}</div></div>`;
const coinBack = `<div class="coin dark"><div class="ring"></div>${borjgali(15, C.gold)}</div>`;
const COINS = 70;

const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">მეფის კარი</h1>
  <div class="lead">ბლეფის თამაში თამარ მეფის კარზე — ოთხი ვაზირი, დედოფალი და „არ მჯერა!“<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ბეჭდვა · ჭრა</th></tr>
        <tr><td>კარისკაცის ბარათები</td><td>15 + 5*</td><td>${no('cards1')}–${no('cards3')}</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>შეხსენების ბარათები (ორმხრივი)</td><td>6</td><td>${no('cards2')}–${no('cards3')}</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>თეთრი (მონეტები, ⌀25 მმ)</td><td>50 (70 იბეჭდება)</td><td>${no('coins')}</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>წესების ფურცელი (ორმხრივი)</td><td>1</td><td>${no('rules')}</td><td><span class="chk"></span></td></tr>
        <tr><td>კარის დაფა</td><td>1</td><td>${no('board')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ბარათების კოლოფი</td><td>1</td><td>${no('box')}</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
        <tr><td>ჩასადებები 66×91 მმ</td><td>21</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
        <tr><td>ქისა თეთრისთვის</td><td>1</td><td>იკერება</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">* 5 დამატებითი ბარათი 7–8 მოთამაშისთვის — მხოლოდ მაშინ ამოჭერი.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული) — ყოველ ფურცელს თავისი ზურგი მოსდევს. ჯერ ერთი საცდელი ფურცელი: ბარათი 63×88 მმ უნდა გამოვიდეს და ზურგი წინას დაემთხვეს.</li>
        <li>ქაღალდი: ფურცლები ${no('cards1')}–${no('coins')} (ბარათები, თეთრი) — <b>300 გ მუყაო</b>; ${no('rules')} (წესები) — ჩვეულებრივი; ${no('board')}–${no('box')} — 200–300 გ.</li>
        <li>ჭრა — ხაზებზე, მაკრატლით ან დანით სახაზავზე; კუთხეები 3 მმ მომრგვალების მომჭრელით. ჩასადებებით (66×91 მმ) ზურგი არც ჩანს.</li>
        <li>თეთრი — 25 მმ წრიული პერფორატორით ან მაკრატლით; 2 მმ მუყაოზე დაკრული უფრო მტკიცეა (ან ხის დისკები 25 მმ).</li>
        <li>წესები და კარის დაფა — მქრქალი ლამინაცია 125 მკმ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Coup“-ის (რიკი ტაჰტა, 2012) წესების მიხედვით. სახელები, ტექსტი და ნახატები საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">პორტრეტების ადგილი ბარათებზე ჯერ ორნამენტითაა — სურათები მერე დაემატება.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES_A = [
  ['მომზადება', 'აურიე 15 კარისკაცის ბარათი. ყველას ჩამოურიგე 2 ბარათი პირქვე და 2 თეთრი. დანარჩენი ბარათები პირქვე დასტად შუაში — ეს „კარის დასტაა“. დანარჩენი თეთრი შუაში — „ხაზინა“. ყველას მიეცი შეხსენების ბარათი — მასზე შენი საგვარეულო წერია. შენი ორი ბარათის ნახვა ნებისმიერ დროს შეგიძლია, სხვას არ აჩვენო. თეთრი ყველას დასანახად იდოს. 2 მოთამაშე ხართ? ნახე წესი 13.'],
  ['მიზანი', 'შენი ორი პირქვე ბარათი ორი „გავლენაა“ კარზე. ვინც ორივეს დაკარგავს, კარს ტოვებს. ბოლო დარჩენილი იმარჯვებს.'],
  ['რიგი', 'იწყებს წინა თამაშის გამარჯვებული (პირველად — ყველაზე უმცროსი), შემდეგ საათის ისრის მიმართულებით. შენს სვლაზე ზუსტად ერთ მოქმედებას ასრულებ. გამოტოვება არ შეიძლება.'],
  ['საერთო მოქმედებები (ბარათი არ სჭირდება)', '<b>შემოსავალი</b> — აიღე 1 თეთრი ხაზინიდან; არავინ აჩერებს. <b>უცხო ძღვენი</b> — აიღე 2 თეთრი ხაზინიდან; ნებისმიერ მოთამაშეს შეუძლია ხაზინადარად დაბლოკოს. <b>დარბაზი</b> — გადაიხადე 7 თეთრი ხაზინაში და აირჩიე მოთამაშე: ის ერთ გავლენას კარგავს. დარბაზი არ იბლოკება და არ ეჭვდება.'],
  ['კარისკაცის მოქმედებები', 'ჯერ ხმამაღლა აცხადებ, ვინ ხარ — ბარათი შეიძლება არც გქონდეს, ეს ბლეფია. <b>ხაზინადარი</b> — „ხარკი“: აიღე 3 თეთრი ხაზინიდან. <b>მანდატური</b> — „განდევნა“: ჯერ გადაიხადე 3 თეთრი, მერე აირჩიე მოთამაშე: ის ერთ გავლენას კარგავს. <b>სპასალარი</b> — „ლაშქრის სარჩო“: აიღე 2 თეთრი სხვა მოთამაშისგან (თუ 1 აქვს — 1). <b>მსახურთუხუცესი</b> — „გადანიშვნა“: აიღე 2 ბარათი კარის დასტიდან, შეხედე ყველას, დაიტოვე იმდენი, რამდენი გავლენაც გაქვს, დანარჩენი 2 დააბრუნე დასტაში და აურიე. <b>დედოფალს</b> მოქმედება არ აქვს — მხოლოდ ბლოკავს.'],
  ['ბლოკი', 'მოქმედების სამიზნე აცხადებს კარისკაცს და ბლოკავს. დედოფალი ბლოკავს განდევნას. სპასალარი ან მსახურთუხუცესი ბლოკავს ლაშქრის სარჩოს. ხაზინადარი ბლოკავს უცხო ძღვენს — ამას ნებისმიერი მოთამაშე აკეთებს, არა მხოლოდ სამიზნე. ბლოკიც ბლეფი შეიძლება იყოს და ბლოკზეც შეიძლება ეჭვი. თუ ბლოკი შედგა, მოქმედება ჩაიშალა, მაგრამ გადახდილი თეთრი (განდევნის 3) ხაზინაში რჩება.'],
  ['ეჭვი', 'როცა ვინმე კარისკაცს აცხადებს (მოქმედებისთვის ან ბლოკისთვის), ნებისმიერ მოთამაშეს შეუძლია თქვას „არ მჯერა!“ — ვინც პირველმა ასწია ხელი, ის ეჭვობს. ეჭვი მხოლოდ მაშინვე შეიძლება, სანამ თამაში გაგრძელდება. რიგი: განცხადება → ეჭვი → ბლოკი → ეჭვი ბლოკზე → შედეგი. ეჭვი ყოველთვის ჯერ წყდება.'],
  ['ეჭვის გარჩევა', 'თუ განმცხადებელს ბარათი ნამდვილად აქვს — აჩვენებს, ბარათს კარის დასტაში აბრუნებს, ურევს და ახალს პირქვე იღებს; ეჭვის მთქმელი ერთ გავლენას კარგავს; მოქმედება (ან ბლოკი) სრულდება. თუ ბარათი არ აქვს ან არ აჩვენებს — თვითონ კარგავს ერთ გავლენას, მოქმედება ჩაიშალა და გადახდილი თეთრი უკან უბრუნდება.'],
];
const RULES_B = [
  ['გავლენის დაკარგვა', 'მოთამაშე თვითონ ირჩევს, თავისი ორი ბარათიდან რომელს გადააბრუნებს პირაღმა. პირაღმა ბარათი ყველას უჩანს და აღარ ითვლება. როცა ორივე პირაღმაა, მოთამაშე კარიდან გადის: ბარათებს პირაღმა ტოვებს, თეთრს ხაზინას უბრუნებს.'],
  ['10 თეთრის წესი', 'ვინც სვლის დასაწყისში 10 ან მეტ თეთრს ფლობს, ვალდებულია „დარბაზი“ მოიწვიოს — სხვა მოქმედება არ შეუძლია.'],
  ['ორმაგი საფრთხე', 'თუ შენ ხარ განდევნის სამიზნე, ეჭვი შეიტანე და წააგე — ერთ სვლაში ორ გავლენას კარგავ: ერთს ეჭვით, მეორეს განდევნით. იგივეა, თუ დედოფლის ბლოკი იბლეფე და გამხილეს. ამიტომ ეჭვი მხოლოდ მაშინ, როცა დარწმუნებული ხარ.'],
  ['დასასრული', 'თამაში მთავრდება, როცა მხოლოდ ერთ მოთამაშეს დარჩა პირქვე ბარათი. ის იმარჯვებს და „მეფის მარჯვენა ხელი“ ხდება. ქულები არ ითვლება; მომდევნო თამაშს ის იწყებს.'],
  ['2 მოთამაშე', 'დამწყები 1 თეთრით იწყებს, მეორე — 2-ით. უფრო საინტერესო ვარიანტი: ბარათები დაყავით 3 ხუთეულად (თითო კარისკაცი თითოეულში); ორივე იღებს ერთ ხუთეულს, ფარულად იტოვებს 1 ბარათს, 4-ს გადადებს; მესამე ხუთეულს ურევენ, თითოს 1-1 ბარათს ურიგებენ, დარჩენილი 3 პირქვე — კარის დასტა.'],
  ['7–8 მოთამაშე', 'სკოლის ვარიანტი: დაამატე 5 დამატებითი ბარათი (გვ. 4) — თითო კარისკაცი — და თითოეულის 4 ბარათი გამოიყენე. დანარჩენი წესები უცვლელია. 8-ზე მეტი — ორი მაგიდა ჯობია.'],
];
const rulesList = (items, start) => `<ol start="${start}">${items.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;

const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">მეფის კარი — წესები · ${META}</div></div>
  <p class="lead">თამარ მეფის დრო, 1184–1213. მოთამაშეები დიდგვაროვანი სახლების თავკაცები არიან და კარზე გავლენისთვის ეჯიბრებიან. შენი ორი ფარული ბარათი ორი კარისკაცია, რომელიც შენს მხარესაა. ბარათი სულაც არ უნდა გქონდეს, რომ ვაზირი „იყო“ — მთავარია, როგორ იტყვი და ვინ დაგიჯერებს. ყოველი სიტყვა შეიძლება „არ მჯერა“-თი შემოწმდეს. აქ ვაზირობა თამაშია — სიმართლე მაგიდის გარეთ რჩება.</p>
  <div class="rules">${rulesList(RULES_A, 1)}</div>
</div>
${foot(`<span>${esc(title)} · წესები 1/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const PEOPLE = [
  ['ყუთლუ-არსლანი', 'მეჭურჭლეთუხუცესი 1184 წელს. მან დარბაზთან ერთად მეფისგან დამოუკიდებელი „კარავი“ მოითხოვა — ქართული სახელმწიფოებრიობის ისტორიის ცნობილი ამბავი.'],
  ['ზაქარია მხარგრძელი', 'ამირსპასალარი 1191–1212, ლაშქრის მთავარსარდალი; შამქორისა და ბასიანის გამარჯვებები.'],
  ['ჭიაბერი', 'მანდატურთუხუცესი 1184 წლიდან, გიორგი III-ის აღზრდილი; კარის წესრიგი და ცერემონიები.'],
  ['ივანე მხარგრძელი', 'მსახურთუხუცესი, 1212 წლიდან პირველი ათაბაგი; სასახლისა და კარისკაცების უფროსი.'],
  ['რუსუდან დედოფალი', 'გიორგი III-ის და, თამარის მამიდა და აღმზრდელი — თამარი მის კარზე, სამშვილდეში გაიზარდა.'],
  ['მწიგნობართუხუცესი-ჭყონდიდელი', 'ვაზირთა ვაზირი, ეპისკოპოსი — ბარათზე არ არის: მასზე ბლეფს არ ვთამაშობთ.'],
];
const GLOSS = [['თეთრი', 'ძველი ქართული ფული (დღეს — ლარის მეასედი)'], ['საჭურჭლე', 'სამეფო ხაზინა'], ['ხარკი', 'გადასახადი'], ['ძღვენი', 'საჩუქარი'], ['სარჩო', 'საზრდო, გამოსაკვები'], ['შეუვალობა', 'გადასახადისგან გათავისუფლება'], ['ქომაგი', 'მფარველი, დამხმარე'], ['დარბაზი', 'დიდებულთა საბჭო']];

const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}
<div class="rulesWrap">
  <div class="rules">${rulesList(RULES_B, 9)}</div>
  <div class="two2">
    <div><h3>მოქმედებების ცხრილი</h3>${actionsTable('t')}
      <h3>ძველი სიტყვები</h3><p class="gl">${GLOSS.map(([w, d]) => `<b>${w}</b> — ${d}`).join('; ')}.</p></div>
    <div><h3>ვინ იყვნენ ბარათებზე</h3>${PEOPLE.map(([n, t]) => `<p class="pp"><b>${n}</b> — ${t}</p>`).join('')}
      <p class="small">შექმნილია „Coup“-ის (რიკი ტაჰტა, 2012) წესების მიხედვით; სახელები, ტექსტი და ნახატები საგანძურის სკოლისაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის.</p></div>
  </div>
</div>
${foot(`<span>${esc(title)} · წესები 2/2</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

const boardPage = page(`
<div class="bTop">${braid(190, 7, { id: 'b1' })}</div><div class="bBot">${braid(190, 7, { id: 'b2' })}</div>
<div class="bLeft">${braid(277, 7, { id: 'b3' })}</div><div class="bRight">${braid(277, 7, { id: 'b4' })}</div>
<div class="board">
  <div class="aso bTitle">${aso(title)}</div><div class="bSub">მეფის კარი · კარის დაფა</div>
  <div class="places">
    <div class="place">${icon('scroll-text', { size: 14, color: C.gold, width: 1.2 })}<div>კარის დასტა</div><span>პირქვე</span></div>
    <div class="place">${icon('coins', { size: 14, color: C.gold, width: 1.2 })}<div>ხაზინა</div><span>თეთრი ყველას დასანახად</span></div>
  </div>
  ${actionsTable('t big')}
  <div class="bHint"><span>${icon('eye', { size: 6, color: C.wine, width: 1.8 })} ეჭვი — ყველას შეუძლია, მაშინვე</span><span>${icon('hand', { size: 6, color: C.wine, width: 1.8 })} ბლოკი — სამიზნეს; ძღვენზე — ყველას</span><span>${icon('coins', { size: 6, color: C.wine, width: 1.8 })} 10 თეთრი — დარბაზი სავალდებულოა</span></div>
</div>`, 'boardP');

// the tuck box net: 68×92×24 mm, cut lines solid, folds dashed; the front face wine with the title
const boxPage = (() => {
  const W = 68, S = 24, H = 92, G = 10, F = 24, T = 12; // faces, side, height, glue, flaps, tuck
  const x0 = (210 - (W + S + W + S + G)) / 2, y0 = (297 - (T + F + H + F + T)) / 2;
  const xs = [x0, x0 + W, x0 + W + S, x0 + 2 * W + S, x0 + 2 * W + 2 * S, x0 + 2 * W + 2 * S + G];
  const yTop = y0 + T + F, yBot = yTop + H;
  const cut = `M${xs[0]} ${yTop} L${xs[0]} ${yBot} L${xs[1]} ${yBot} L${xs[1]} ${yBot + F} L${xs[2] - 2} ${yBot + F} L${xs[2]} ${yBot} L${xs[2]} ${yBot + F} Q${xs[2] + W / 2} ${yBot + F + T + 4} ${xs[3]} ${yBot + F} L${xs[3]} ${yBot} L${xs[3]} ${yBot + F} L${xs[4] - 2} ${yBot + F} L${xs[4]} ${yBot} L${xs[5] - 3} ${yBot - 3} L${xs[5]} ${yBot - 8} L${xs[5]} ${yTop + 8} L${xs[5] - 3} ${yTop + 3} L${xs[4]} ${yTop} L${xs[4] - 2} ${yTop - F} L${xs[3]} ${yTop - F} L${xs[3]} ${yTop} L${xs[3]} ${yTop - F} Q${xs[2] + W / 2} ${yTop - F - T - 4} ${xs[2]} ${yTop - F} L${xs[2]} ${yTop} L${xs[2]} ${yTop - F} L${xs[1] + 2} ${yTop - F} L${xs[1]} ${yTop} Z`;
  const folds = [[xs[1], yTop, xs[1], yBot], [xs[2], yTop, xs[2], yBot], [xs[3], yTop, xs[3], yBot], [xs[4], yTop, xs[4], yBot], [xs[1], yTop, xs[4], yTop], [xs[1], yBot, xs[4], yBot], [xs[2], yTop - F, xs[3], yTop - F], [xs[2], yBot + F, xs[3], yBot + F]];
  const label = (x, y, t, size = 8, color = C.muted, rot = 0) => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="middle" transform="rotate(${rot} ${x} ${y})" font-family="SerifKa">${esc(t)}</text>`;
  return page(`<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0">
<rect x="${xs[2]}" y="${yTop}" width="${W}" height="${H}" fill="${C.wine}"/>
<rect x="${xs[2]}" y="${yTop - F}" width="${W}" height="${F}" fill="${C.wine}"/>
<rect x="${xs[2]}" y="${yBot}" width="${W}" height="${F}" fill="${C.wine}"/>
<path d="M${xs[2]} ${yTop - F} Q${xs[2] + W / 2} ${yTop - F - T - 4} ${xs[3]} ${yTop - F} Z" fill="${C.wine}"/><path d="M${xs[2]} ${yBot + F} Q${xs[2] + W / 2} ${yBot + F + T + 4} ${xs[3]} ${yBot + F} Z" fill="${C.wine}"/>
<rect x="${xs[1] + 2}" y="${yTop - F}" width="${S - 4}" height="${F}" fill="${C.wineDark}"/><rect x="${xs[3]}" y="${yTop - F}" width="${S - 2}" height="${F}" fill="${C.wineDark}"/><rect x="${xs[1] + 2}" y="${yBot}" width="${S - 4}" height="${F}" fill="${C.wineDark}"/><rect x="${xs[3]}" y="${yBot}" width="${S - 2}" height="${F}" fill="${C.wineDark}"/>
<rect x="${xs[1]}" y="${yTop}" width="${S}" height="${H}" fill="${C.wineDark}"/><rect x="${xs[3]}" y="${yTop}" width="${S}" height="${H}" fill="${C.wineDark}"/>
<rect x="${xs[0]}" y="${yTop}" width="${W}" height="${H}" fill="${C.paper}"/>
<rect x="${xs[2] + 4}" y="${yTop + 4}" width="${W - 8}" height="${H - 8}" fill="none" stroke="${C.gold}" stroke-width=".4" rx="2"/>
<text x="${xs[2] + W / 2}" y="${yTop + 22}" font-size="8.4" fill="#f0d9a0" text-anchor="middle" font-family="SansKa" font-weight="900" letter-spacing=".4">${aso(title)}</text>
<text x="${xs[2] + W / 2}" y="${yTop + 32}" font-size="7.5" fill="${C.paper}" text-anchor="middle" font-family="SerifKa" font-weight="800">მეფის კარი</text>
<text x="${xs[2] + W / 2}" y="${yTop + 40}" font-size="4" fill="${C.paper}" text-anchor="middle" font-family="SerifKa" opacity=".9">ბლეფის თამაში თამარ მეფის კარზე</text>
${CHARS.map((ch, i) => `<circle cx="${xs[2] + 10 + i * 12}" cy="${yTop + 58}" r="5" fill="${C.cream}" stroke="${C.gold}" stroke-width=".4"/><text x="${xs[2] + 10 + i * 12}" y="${yTop + 60.3}" font-size="5.5" fill="${C.wine}" text-anchor="middle" font-family="SansKa" font-weight="900">${aso(ch.short[0])}</text>`).join('')}
<text x="${xs[2] + W / 2}" y="${yTop + 74}" font-size="3.6" fill="${C.paper}" text-anchor="middle" font-family="SerifKa">${esc(META)}</text>
<rect x="${xs[2] + 4}" y="${yTop + H - 13}" width="${W - 8}" height="7" fill="${C.wineDark}"/>
<text x="${xs[2] + W / 2}" y="${yTop + H - 8.3}" font-size="3.6" fill="#f0d9a0" text-anchor="middle" font-family="SansKa" font-weight="900" letter-spacing=".4">${aso(SERIES)} · №${NO}</text>
<text x="${xs[2] + W / 2}" y="${yTop + H - 2}" font-size="3" fill="${C.paper}" text-anchor="middle" font-family="SerifKa">${esc(SCHOOL)}</text>
${label(xs[1] + S / 2, yTop + H / 2, `${title} · ${META}`, 4, '#f0d9a0', -90)}
${label(xs[3] + S / 2, yTop + H / 2, `${SERIES} · ${SCHOOL}`, 4, '#f0d9a0', 90)}
<text x="${xs[0] + W / 2}" y="${yTop + 16}" font-size="6" fill="${C.wine}" text-anchor="middle" font-family="SerifKa" font-weight="800">მეფის კარი</text>
${['ოთხი ვაზირი და დედოფალი —', 'ვინ ვინ არის კარზე?', 'ბლეფი, ეჭვი და „არ მჯერა!“', '', '15 ბარათი · 6 შეხსენება', '50 თეთრი · წესები', '', 'თამარ მეფის დრო, 1184–1213', 'საგანძურის სკოლის ვერსია', 'მხოლოდ სასკოლო', 'გამოყენებისთვის'].map((t, i) => label(xs[0] + W / 2, yTop + 26 + i * 5.6, t, 3.5, C.brown)).join('')}
<path d="${cut}" fill="none" stroke="#555" stroke-width=".3"/>
${folds.map(([a, b, c, d]) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="#777" stroke-width=".25" stroke-dasharray="2 1.5"/>`).join('')}
${label(xs[4] + G / 2, yTop + H / 2, 'წებო', 4, C.muted, 90)}
${label(105, yTop - F - T - 10, 'ბარათების კოლოფი 68×92×24 მმ — მთლიანი ხაზი იჭრება, წყვეტილი იკეცება; 300 გ მუყაო', 3.6)}
</svg>`, 'boxP');
})();

export const css = `
.ttl{font-size:10.5pt;color:var(--gold2);text-align:center;line-height:1.2;margin-top:.3mm}
.short{font-weight:800;font-size:16pt;color:var(--wine);text-align:center;line-height:1.15;margin:.4mm 0 1.6mm}
.portrait{position:relative;height:33mm;margin:0 .5mm;border:.3mm solid var(--gold);border-radius:26mm 26mm 2mm 2mm;background:radial-gradient(ellipse at 50% 38%,#f8f0de 0%,var(--cream) 58%,#e2d2b2 100%);display:flex;align-items:center;justify-content:center;gap:2.5mm;overflow:hidden}
.portrait .wm{position:absolute;left:0;right:0;top:3mm;text-align:center;font-size:40pt;color:var(--wine);opacity:.07}
.act{margin-top:2.2mm;font-size:10.5pt;line-height:1.3}
.act .pill{display:inline-block;background:var(--wine);color:var(--paper);font-weight:700;font-size:9.5pt;padding:.2mm 2mm .4mm;border-radius:2mm;margin-right:1.5mm;vertical-align:.1mm}
.blk{display:flex;gap:1.3mm;align-items:flex-start;font-size:10pt;line-height:1.25;margin-top:1.3mm}
.blk svg{flex:none;margin-top:.6mm}
.blk.muted{color:var(--muted)}
.cap{margin:auto 3.5mm 0;text-align:center;font-size:8.5pt;color:var(--muted);line-height:1.2;border-top:.2mm solid var(--line);padding-top:1mm}
.badge{position:absolute;right:4.6mm;top:4.6mm;background:var(--gold);color:#fff;font-size:6.5pt;font-weight:700;padding:.2mm 1.4mm;border-radius:1mm}
.spare{margin:auto;text-align:center;color:var(--muted);font-size:11pt}
.spare span{font-size:8.5pt}
.card.dark .ring{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
.card.dark .mono{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:30pt;color:var(--gold);padding-top:1mm}
.card.dark .series{position:absolute;bottom:7.5mm;left:0;right:0;text-align:center;font-size:7pt;color:var(--gold);opacity:.85;letter-spacing:.1em}
.rem .band{background:var(--wine);color:var(--paper);text-align:center;padding:1mm 1.5mm 1.2mm;border-radius:1.5mm;margin-bottom:1.6mm}
.rem .band .aso{font-size:10.5pt;color:#f0d9a0}
.rem .bandSub{font-size:7.5pt;opacity:.9}
.rows{font-size:8.2pt;line-height:1.2}
.ra{padding:.8mm 0;border-bottom:.18mm solid var(--line)}
.ra b{color:var(--wine)}
.ra .bl{display:flex;align-items:center;gap:.8mm;color:var(--brown);font-size:7.6pt;margin-top:.2mm}
.remFoot{margin-top:auto;font-size:7.3pt;color:var(--muted);text-align:center;line-height:1.2;padding-top:1mm}
.rb{font-size:8.6pt;line-height:1.25;margin-bottom:1.5mm}
.rb b{color:var(--wine)}
.coin{width:100%;height:100%;border-radius:50%;background:#f4e8cf;border:.8mm solid var(--gold);position:relative}
.coin .ring{position:absolute;inset:1.4mm;border:.25mm solid var(--gold2);border-radius:50%}
.coin .tetri{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:19pt;color:var(--wine);padding-bottom:4mm}
.coin .leaf{position:absolute;left:0;right:0;bottom:3mm;text-align:center;line-height:0}
.coin.dark{background:var(--wine2);display:flex;align-items:center;justify-content:center}
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
.lead{font-size:10.8pt;line-height:1.4;margin:0 0 3mm}
.two2{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:4mm;font-size:10pt;line-height:1.35}
.two2 h3{margin:0 0 1.5mm;color:var(--wine);font-size:11pt}
.two2 table.t{font-size:9.3pt;margin-bottom:3mm}
.two2 .pp,.two2 .gl{margin:0 0 1.6mm}
.two2 .pp b,.two2 .gl b{color:var(--wine)}
.boardP .bTop,.boardP .bBot,.boardP .bLeft,.boardP .bRight{position:absolute}
.boardP .bTop{left:10mm;top:10mm}.boardP .bBot{left:10mm;bottom:10mm}
.boardP .bLeft{left:10mm;top:10mm;transform-origin:0 0;transform:rotate(90deg) translate(0,-7mm)}
.boardP .bRight{right:10mm;top:10mm;transform-origin:100% 0;transform:rotate(-90deg) translate(0,-7mm)}
.board{position:absolute;left:17mm;right:17mm;top:17mm;bottom:17mm;background:var(--paper);padding:6mm 9mm 5mm;display:flex;flex-direction:column}
.bTitle{font-size:28pt;color:var(--wine);text-align:center;letter-spacing:.08em}
.bSub{text-align:center;color:var(--muted);font-size:12pt;margin-bottom:6mm}
.places{display:flex;justify-content:center;gap:16mm;margin-bottom:6mm}
.place{width:74mm;height:84mm;border:.5mm dashed var(--gold2);border-radius:3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;font-size:16pt;font-weight:800;color:var(--wine);background:#fff8}
.place span{font-size:10pt;font-weight:400;color:var(--muted)}
table.big{font-size:13pt;line-height:1.2}
table.big td,table.big th{padding:1.5mm 2.5mm}
table.big td.n{font-weight:800;color:var(--wine)}
.bHint{margin-top:auto;display:flex;justify-content:space-between;font-size:10pt;color:var(--brown);padding-top:2mm}
.bHint span{display:flex;align-items:center;gap:2mm}
`;

const card = (i, label) => ({
  key: `cards${i + 1}`,
  front: cardSheet(fronts.slice(i * 9, i * 9 + 9), { label: `მეფის კარი · ბარათები ${i + 1}/3 — ${label}` }),
  back: cardSheet(backs.slice(i * 9, i * 9 + 9), { back: true, label: `მეფის კარი · ბარათები ${i + 1}/3 — ზურგი` }),
});
const SHEETS = [
  { key: 'cover' },
  card(0, 'წინა მხარე'),
  card(1, 'წინა მხარე'),
  card(2, 'წინა მხარე (7–8 მოთამაშის ბარათები და სათადარიგო)'),
  { key: 'coins', front: tokenSheet(Array(COINS).fill(coinFront), { label: 'მეფის კარი · თეთრი ⌀25 მმ — წინა მხარე (70, საჭიროა 50)' }), back: tokenSheet(Array(COINS).fill(coinBack), { back: true, label: 'მეფის კარი · თეთრი — ზურგი' }) },
  { key: 'rules', front: rulesPage1, back: rulesPage2 },
  { key: 'board', front: boardPage },
  { key: 'box', front: boxPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
