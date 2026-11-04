// „ჩამოთვალე!“ on paper — the სამაგიდო variant of the app's Sporcle (2026-11-01): ten of the app's lists, each on its own page
// with an empty box for every member (the box's hint as in the app: a date, a value, a kind) — the map's 13 regions on the
// numbered map —, one blank page for the teacher's own list, the host's answer key and the score sheet. Every team gets the
// same page, the sand-glass runs, the teams write; then the sheets go to the next team and the host reads the key.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.js';
import { mapCss, miniMap } from '../regionMap.js';
import * as __d0 from '../../data/chamotvaleLists';
import * as __d1 from '../../utils/chamotvale';

const { CHAMO_LISTS, chamoSeconds } = ({ ...__d0, ...__d1 });

export const id = 'chamotvale';
export const title = 'ჩამოთვალე!';
const TAG = 'ქართული · უტელეფონო';
const META = '2–6 გუნდი · 7 წლიდან · 15–25 წუთი';
/** the lists printed, in their order: the map first, then a mix of the topics */
const PRINTED = ['kutkheebi', 'lari', 'motsiqulebi', 'dghesastsaulebi', 'asureli-mamebi', 'sakravebi', 'samosi', 'intervalebi', 'planetebi', 'shavi-zghva'];
const LISTS = PRINTED.map(id => {
  const l = CHAMO_LISTS.find(x => x.id === id);
  if (!l) throw new Error(`no list ${id}`);
  return l;
});
const OWN_ROWS = 14;

/** the sand-glass's time: the app's time, to the half minute */
const minutes = n => {
  const m = Math.max(1, Math.round(chamoSeconds(n) / 30) / 2);
  return `${String(m).replace('.5', '½')} წუთი`;
};
const TOPIC = { kartuli: 'საქართველო', rtsmena: 'სარწმუნოება', musika: 'მუსიკა', msoplio: 'მსოფლიო', bavshvebi: 'პატარებს' };

// ---------- a list's page ----------
const boxes = (items, { own = false } = {}) => `<ol class="ch-boxes${items.length > 10 ? ' many' : ''}">${items.map((it, i) =>
  `<li><span class="ch-no">${i + 1}</span><span class="ch-in">${it.hint ? `<i>${esc(it.hint)}</i>` : ''}<span class="ch-line"></span></span></li>`).join('')}</ol>${own ? '' : ''}`;

const listPage = (l, k) => page(`<div class="ch-head">
  <span class="ch-badge">${k}</span>
  <div class="ch-t"><b>${esc(l.title)}</b><span>${esc(l.note ?? `ჩამოთვალე ყველა ${l.items.length}.`)}</span></div>
</div>
<div class="ch-meta">
  <span>${icon('users-round', { size: 4.2, color: C.wine, width: 2 })}გუნდი <i class="w"></i></span>
  <span>${icon('hourglass', { size: 4.2, color: C.wine, width: 2 })}${minutes(l.items.length)}</span>
  <span>${icon('check', { size: 4.2, color: '#2f7d4f', width: 2.2 })}ნაპოვნი <i></i> / ${l.items.length}</span>
</div>
${l.map ? `<div class="ch-map">${miniMap(null)}</div><p class="ch-mapHint">${icon('map-pinned', { size: 4, color: C.wine, width: 2 })}<span>ყოველ ნომერს თავისი კუთხე აქვს — ჩაწერე მისი სახელი იმავე ნომრის ყუთში.</span></p>` : ''}
${boxes(l.items)}
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · სია ${k} · ${esc(TOPIC[l.topic])}</div>`, `ch-listP${l.map ? ' ch-mapP' : ''}`);

const ownPage = page(`<div class="ch-head">
  <span class="ch-badge">${icon('pencil', { size: 5, color: '#fff', width: 2 })}</span>
  <div class="ch-t"><b>შენი სია: <i class="ch-own"></i></b><span>მასწავლებელი თავის სიას წერს — ერთი კუთხის სოფლები, ერთი პოეტის ლექსები…</span></div>
</div>
<div class="ch-meta">
  <span>${icon('users-round', { size: 4.2, color: C.wine, width: 2 })}გუნდი <i class="w"></i></span>
  <span>${icon('hourglass', { size: 4.2, color: C.wine, width: 2 })}<i></i> წუთი</span>
  <span>${icon('check', { size: 4.2, color: '#2f7d4f', width: 2.2 })}ნაპოვნი <i></i> / <i></i></span>
</div>
${boxes(Array.from({ length: OWN_ROWS }, () => ({})), { own: true })}
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · შენი სია (გადაიღე ასლები)</div>`, 'ch-listP');

// ---------- the host's key ----------
const keyList = (l, k) => `<div class="ch-key">
  <div class="ch-keyHead"><span class="ch-badge sm">${k}</span><b>${esc(l.title)}</b></div>
  <ol>${l.items.map(it => `<li><b>${esc(it.name)}</b>${it.hint ? `<span class="h"> · ${esc(it.hint)}</span>` : ''}${it.alt?.length ? `<span class="a"> (${it.alt.map(esc).join(', ')})</span>` : ''}</li>`).join('')}</ol>
</div>`;
const keyPage = (from, to, part) => page(`<div class="ch-keyTop">
  <span class="aso">${aso(title)}</span><b>პასუხების გასაღები</b>
  <span class="ch-secret">${icon('eye-off', { size: 4.4, color: C.wine, width: 2 })}მხოლოდ წამყვანს · ${part}/2</span>
</div>
<div class="ch-keyCols">${LISTS.slice(from, to).map((l, i) => keyList(l, from + i + 1)).join('')}</div>
<p class="ch-keyFoot">ფრჩხილებში — სხვა სახელები, რომლებიც ასევე ჩაითვლება. ერთი-ორი ასოს შეცდომა ჩაითვალეთ, თუ ცხადია, ვინ ან რა იგულისხმეს.</p>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · პასუხები ${part}/2</div>`, 'ch-keyP');

const scorePage = scoreSheet({
  title, rows: LISTS.length + 1, what: 'სია №',
  hint: 'გუნდის სახელი სვეტის თავში. ყოველი სწორი სახელი — 1 ქულა; მთელი სია — კიდევ 3. „შენი სია“ ბოლო რიგშია.',
  remind: [
    ['hourglass', 'დრო', 'სიის ფურცელზე წერია, რამდენი წუთი აქვს.'],
    ['repeat', 'გაცვლა', 'დროის ბოლოს ფურცლები მეზობელ გუნდს გადაეცემა გასასწორებლად.', C.goldDark],
    ['check', 'ქულა', 'სწორი — 1, მთელი სია — +3; წამყვანი გასაღებიდან კითხულობს.', '#2f7d4f'],
  ],
});

// ---------- the cover and the rules ----------
const EX = LISTS.find(l => l.id === 'planetebi');
const exFound = new Set([2, 3, 5]);
const exBox = `<div class="ch-ex">
  <div class="ch-exHead"><b>${esc(EX.title)}</b><span>ნაპოვნი 3 / ${EX.items.length}</span></div>
  <ol class="ch-boxes small">${EX.items.map((it, i) => `<li><span class="ch-no">${i + 1}</span><span class="ch-in"><i>${esc(it.hint)}</i><span class="ch-line">${exFound.has(i) ? `<em>${esc(it.name)}</em>` : ''}</span></span></li>`).join('')}</ol>
</div>`;

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">დროზე ჩამოთვალე სიის ყველა წევრი: რუკის 13 კუთხე, 12 მოციქული, ლარის ბანკნოტების სახეები, მზის სისტემის პლანეტები… ყოველ წევრს თავისი ყუთი აქვს; ზოგ ყუთში მინიშნებაა — თარიღი, ფასი, რიგი. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="ch-coverEx box">
    ${exBox}
    <div class="ch-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('file-text', 'ყველა გუნდი ერთსა და იმავე სიის ფურცელს იღებს.')}
      ${step('hourglass', 'წამყვანი ქვიშის საათს აბრუნებს — დრო ფურცელზე წერია.', C.goldDark)}
      ${step('pencil', 'გუნდი ჩურჩულით თათბირობს და ყუთებში წერს.')}
      ${step('check', 'დროის ბოლოს ფურცლებს ცვლიან, წამყვანი პასუხებს კითხულობს: სწორი — 1, მთელი სია — +3.', '#2f7d4f')}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სიების ფურცლები</td><td>${LISTS.length}</td><td>${no('l1')}–${no(`l${Math.ceil((LISTS.length + 1) / 2)}`)}</td></tr>
        <tr><td>„შენი სია“ — ცარიელი</td><td>1</td><td>${no(`l${Math.ceil((LISTS.length + 1) / 2)}`)}</td></tr>
        <tr><td>პასუხების გასაღები, წამყვანს</td><td>2 გვ.</td><td>${no('key')}</td></tr>
        <tr><td>ქულების ფურცელი</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>ქვიშის საათი ან საათი; ფანქრები</td><td>—</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>სიების ფურცლები (${no('l1')}–${no(`l${Math.ceil((LISTS.length + 1) / 2)}`)}) — <b>თითო გუნდს თითო ასლი</b>: ფურცლის ორივე მხარეს თითო სიაა.</li>
        <li>გასაღები (${no('key')}) და ქულების ფურცელი (${no('score')}) — წამყვანს, ერთი ასლი.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ვიქტორინების საიტის „Sporcle“ იდეით. სიები საგანძურის სკოლის აპიდანაა; ისინი ხელოვნურმა ინტელექტმა შეადგინა საყოველთაოდ ცნობილი ფაქტებიდან და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–5 მოთამაშე და ერთი ფანქარი. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი.`],
  ['წამყვანი', 'მასწავლებელი — ის არ თამაშობს. გასაღები და ქულების ფურცელი მასთანაა, დროს ის ზომავს.'],
  ['რაუნდი', 'წამყვანი ირჩევს სიას (რიგით ან როგორც უნდა) და ყველა გუნდს ერთსა და იმავე სიის ფურცელს აძლევს — თავდაყირა, სანამ „დაიწყეთ!“ არ იტყვის.'],
  ['დრო', 'დრო სიის ფურცელზე წერია (დიდ სიას — მეტი). ქვიშის საათი, ტელეფონის საათი ან ხმამაღლა თვლა — სულ ერთია.'],
  ['ყუთები', 'ყოველ წევრს თავისი ყუთი აქვს. ზოგ ყუთში მინიშნებაა (თარიღი, ფასი, რიგი) — ის გეხმარება, მაგრამ სახელი სხვა ყუთშიც ჩაითვლება. რუკის სიაში კუთხე იმავე ნომრის ყუთში წერია.'],
  ['ჩურჩულით', 'გუნდი ჩუმად თათბირობს — სხვა გუნდმა არ უნდა გაიგოს! ხმამაღლა ნათქვამი სახელი იმ გუნდს არ ეთვლება.'],
  ['გასწორება', 'დრო რომ ამოიწურება, ყველა ფანქარს დებს. ფურცლები მეზობელ გუნდს გადაეცემა, წამყვანი გასაღებიდან სახელებს კითხულობს, გუნდები ერთმანეთს უსწორებენ.'],
  ['ქულა', 'ყოველი სწორი სახელი — 1 ქულა; ერთი-ორი ასოს შეცდომა ჩაითვლება. მთელი სია — კიდევ 3 ქულა. წამყვანი ქულებს ფურცელზე წერს.'],
  ['წრე (ფურცლის გარეშე)', 'გუნდები რიგრიგობით ასახელებენ თითო წევრს 10 წამში; წამყვანი გასაღებში ნიშნავს. ვინც ვერ თქვა ან უკვე ნათქვამი გაიმეორა — წრიდან გადის. ბოლოს დარჩენილი იგებს.'],
  ['შენი სია', 'ბოლო ფურცელი ცარიელია: მასწავლებელი წერს სიის სახელს და რამდენი წევრია — მაგალითად, კვირის ახალი სიტყვები ან ერთი კუთხის სიმღერები.'],
  ['მოგება', 'ბოლო სიის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — „წრე“ ერთ სიაზე.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ჩამოთვალე!“ მეხსიერების თამაშია: ხსოვნიდან ამოტანა არჩევით პასუხზე უფრო ღრმად ასწავლის. აპში ყველა თავის ტელეფონზე წერს და აპი შეცდომით დაწერილსაც ცნობს; აქ გუნდები ფურცელზე წერენ.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის — ${CHAMO_LISTS.length} სია, მარტო, კლასთან ერთად ონლაინ ან გუნდებად ერთი ტელეფონით: sagandzureli.ge → თამაშები → ჩამოთვალე!</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}${mapCss}
.ch-head{position:absolute;left:14mm;right:14mm;top:11mm;display:flex;gap:4mm;align-items:center;border-bottom:.35mm solid var(--gold);padding-bottom:2.6mm}
.ch-badge{flex:none;width:11mm;height:11mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:900;font-size:15pt;display:flex;align-items:center;justify-content:center;font-family:SansKa}
.ch-badge.sm{width:7mm;height:7mm;font-size:10pt}
.ch-t{min-width:0;display:flex;flex-direction:column;gap:.8mm}
.ch-t b{font-size:19pt;color:var(--wine);line-height:1.1}
.ch-t span{font-size:10pt;color:var(--muted);line-height:1.3}
.ch-own{display:inline-block;width:90mm;border-bottom:.3mm solid #bba98f;height:6mm;vertical-align:baseline}
.ch-meta{position:absolute;left:14mm;right:14mm;top:31mm;display:flex;gap:7mm;align-items:center;font-size:11pt;font-weight:700;color:var(--brown)}
.ch-meta span{display:flex;gap:1.6mm;align-items:center;white-space:nowrap}
.ch-meta i{display:inline-block;width:11mm;border-bottom:.3mm solid #bba98f;height:5mm}
.ch-meta i.w{width:46mm}
.ch-boxes{position:absolute;left:14mm;right:14mm;top:43mm;margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:5mm 7mm}
.ch-boxes.many{gap:4mm 7mm}
.ch-mapP .ch-boxes{top:141mm;gap:3mm 7mm}
.ch-boxes li{display:flex;gap:2.6mm;align-items:flex-end;min-height:20mm;border:.3mm solid var(--line);border-radius:2.6mm;padding:1.6mm 3mm 2.2mm;background:#fff}
.ch-boxes.many li{min-height:17.5mm}
.ch-mapP .ch-boxes li{min-height:14mm}
.ch-no{flex:none;width:7.4mm;height:7.4mm;border-radius:50%;border:.35mm solid var(--wine);color:var(--wine);font-weight:900;font-size:10.5pt;display:flex;align-items:center;justify-content:center;font-family:SansKa;align-self:center}
.ch-in{min-width:0;flex:1;display:flex;flex-direction:column;gap:1mm}
.ch-in i{font-style:normal;font-size:8.6pt;color:#9a8b7b;font-weight:700;line-height:1.1}
.ch-line{display:block;border-bottom:.3mm dotted #b9a888;height:7.5mm}
.ch-line em{font-style:normal;font-family:SerifKa;font-size:11pt;color:#2b5f8a;font-weight:700;line-height:6mm;padding-left:1mm}
.ch-map{position:absolute;left:24mm;right:24mm;top:42mm}
.ch-mapHint{position:absolute;left:14mm;right:14mm;top:132mm;margin:0;display:flex;gap:1.8mm;align-items:center;font-size:9.6pt;color:var(--brown)}
.ch-keyTop{position:absolute;left:12mm;right:12mm;top:10mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.ch-keyTop .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.ch-keyTop b{font-size:13pt;color:var(--wine);white-space:nowrap}
.ch-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700;white-space:nowrap}
.ch-keyCols{position:absolute;left:12mm;right:12mm;top:21mm;bottom:24mm;column-count:2;column-gap:8mm}
.ch-key{break-inside:avoid;margin:0 0 4.2mm}
.ch-keyHead{display:flex;gap:2.2mm;align-items:center;margin-bottom:1.2mm}
.ch-keyHead b{font-size:11.5pt;color:var(--brown)}
.ch-key ol{margin:0;padding:0 0 0 9.2mm;font-size:9.4pt;line-height:1.32}
.ch-key li{padding:.1mm 0}
.ch-key li b{color:#2e241b}
.ch-key .h{color:var(--muted)}
.ch-key .a{color:#8c7b66;font-size:8.4pt}
.ch-keyFoot{position:absolute;left:12mm;right:12mm;bottom:12mm;margin:0;font-size:9pt;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.ch-coverEx{display:grid;grid-template-columns:86mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.ch-ex{background:#fff;border:.3mm solid var(--line);border-radius:2.2mm;padding:3mm 3.4mm}
.ch-exHead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2mm}
.ch-exHead b{font-size:11pt;color:var(--wine)}
.ch-exHead span{font-size:8.6pt;color:#2f7d4f;font-weight:700}
.ch-boxes.small{position:static;gap:1.6mm 2.4mm}
.ch-boxes.small li{min-height:9.6mm;padding:.8mm 1.6mm 1.2mm;gap:1.4mm;border-radius:1.6mm}
.ch-boxes.small .ch-no{width:4.4mm;height:4.4mm;font-size:7pt;border-width:.25mm}
.ch-boxes.small .ch-in i{font-size:6.4pt}
.ch-boxes.small .ch-line{height:4.2mm}
.ch-boxes.small .ch-line em{font-size:8.6pt;line-height:4.2mm}
.ch-exR h3{margin:0 0 3mm}
`;

// two lists a sheet, back to back; the own list last
const SHEETS = [{ key: 'cover', back: rulesPage }];
const listPages = [...LISTS.map((l, i) => listPage(l, i + 1)), ownPage];
for (let s = 0; s < Math.ceil(listPages.length / 2); s++) {
  SHEETS.push({ key: `l${s + 1}`, front: listPages[s * 2], ...(listPages[s * 2 + 1] ? { back: listPages[s * 2 + 1] } : {}) });
}
SHEETS.push({ key: 'key', front: keyPage(0, 5, 1), back: keyPage(5, LISTS.length, 2) });
SHEETS.push({ key: 'score', front: scorePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
