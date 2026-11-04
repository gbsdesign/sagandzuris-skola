// „მარგალიტები“ on paper — the სამაგიდო variant of the pearls game (2026-11-04): no phone. The app's three chests of twenty
// chants (data/pearls.ts); a pearl is a chant's first phrase in one voice — the very phrase the app plays and listens for
// (utils/pearls.ts `phraseOf` over the book notes, drawn on staves by music.mjs). A team draws a pearl's token, its singer
// picks a voice and sings the phrase after the host, and the jury says whether it is polished (as the app: 80 %, four notes
// of five). The kit: the phrase book (a chest = five pages of its twenty pearls in three voices, flowed by the print's script,
// and the chest's class table), the tokens, „ჩემი სკივრები“ for every singer, the cover and the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss, tokenSheet } from '../lib.mjs';
import { abcOf, lineOf, loadScore, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { appData } from '../appData.mjs';
import { partsCss, step } from '../kitParts.mjs';

const { CHESTS, findVersion, BOOK_NAMES, phraseOf, chantName } = await appData({
  'data/pearls.ts': ['CHESTS'],
  'data/chantLookup.ts': ['findVersion', 'BOOK_NAMES'],
  'utils/pearls.ts': ['phraseOf', 'chantName'],
});

export const id = 'margalitebi';
export const title = 'მარგალიტები';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი ან ცალ-ცალკე · 8 წლიდან · 15–40 წუთი';
/** notes a line of a staff: a longer phrase goes on two lines (or more), the notes shared out evenly */
const A_LINE = 26;
/** the lines of a phrase of `n` notes, as the notes that begin a new one */
const breaksOf = n => {
  const lines = Math.ceil(n / A_LINE);
  if (lines < 2) return null;
  const each = Math.ceil(n / lines);
  return new Set(Array.from({ length: lines - 1 }, (_, i) => (i + 1) * each));
};
const PAGES_A_CHEST = 5;
/** a chest's sheets: its phrase pages and its class table */
const CHEST_SHEETS = Math.ceil((PAGES_A_CHEST + 1) / 2);
const CHEST_COLOR = [C.wine, '#2b5f8a', C.goldDark];
const ROMAN = ['I', 'II', 'III'];
const VOICE_NAME = ['მთქმელი', 'მოძახილი', 'ბანი'];
const GREEN = '#2f7d4f';

/** „გელათის სკოლის საგალობლები, IX ტომი“ → „IX ტომი“ */
const volume = book => (BOOK_NAMES[book] ?? book).split(', ').pop();

const CHEST_DATA = CHESTS.map((c, ci) => ({
  ...c,
  ci,
  color: CHEST_COLOR[ci],
  items: c.pearls.map(pid => {
    const info = findVersion(pid);
    if (!info?.variant.bookNums?.length) throw new Error(`margalitebi: ${pid} has no book notes`);
    const book = info.variant.book || 'book', num = info.variant.bookNums[0];
    const score = loadScore(book, num);
    // each voice's own first phrase, note for note the app's
    const voices = [0, 1, 2].map(v => {
      const notes = lineOf(score, v).slice(0, phraseOf(score, v).notes.length);
      if (!notes.length) throw new Error(`margalitebi: ${pid} voice ${v + 1} is empty`);
      return abcOf(notes, { breaks: breaksOf(notes.length) });
    });
    return { id: pid, num, name: chantName(info.chant.title), ref: `${volume(book)} · №${num}`, voices };
  }),
}));

// ---------- drawings: a pearl, an empty one to colour, a chest ----------
const pearl = (size, gold = false) => `<svg viewBox="0 0 64 64" width="${size}mm" height="${size}mm" style="display:block"><defs><radialGradient id="mg-${gold ? 'g' : 'w'}" cx="38%" cy="32%" r="72%"><stop offset="0" stop-color="${gold ? '#fff7e0' : '#ffffff'}"/><stop offset=".55" stop-color="${gold ? '#ecc96f' : '#f1ebe2'}"/><stop offset="1" stop-color="${gold ? '#b07f2a' : '#c2b19b'}"/></radialGradient><radialGradient id="mg-i" cx="66%" cy="72%" r="48%"><stop offset="0" stop-color="#f6c9d6" stop-opacity=".8"/><stop offset=".5" stop-color="#c9dcf2" stop-opacity=".4"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="32" cy="56" rx="15" ry="3" fill="#4a3426" opacity=".12"/><circle cx="32" cy="31" r="22" fill="url(#mg-${gold ? 'g' : 'w'})"/><circle cx="32" cy="31" r="22" fill="url(#mg-i)"/><ellipse cx="24.5" cy="22.5" rx="7" ry="4.2" transform="rotate(-32 24.5 22.5)" fill="#fff" opacity=".9"/></svg>`;
const pearlLine = (size, color = '#a99a85') => `<svg viewBox="0 0 64 64" width="${size}mm" height="${size}mm" style="display:block"><circle cx="32" cy="32" r="24" fill="#fff" stroke="${color}" stroke-width="2.4"/><path d="M18.5 25 Q22 17 31 15.5" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" opacity=".6"/></svg>`;
const chest = (size, full = false) => `<svg viewBox="0 0 64 56" width="${size}mm" height="${(size * 56) / 64}mm" style="display:block">
<defs><linearGradient id="mg-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8683a"/><stop offset="1" stop-color="#7a4321"/></linearGradient><linearGradient id="mg-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8c4f27"/><stop offset="1" stop-color="#5e3117"/></linearGradient></defs>
${full ? '<ellipse cx="32" cy="28" rx="31" ry="26" fill="#f3d27a" opacity=".45"/>' : ''}<ellipse cx="32" cy="51" rx="24" ry="3" fill="#4a3426" opacity=".15"/>
<path d="M9 25 V19 Q9 9 19 9 H45 Q55 9 55 19 V25 Z" fill="url(#mg-l)"/><rect x="9" y="25" width="46" height="23" rx="3" fill="url(#mg-b)"/>
<rect x="9" y="23.5" width="46" height="3" fill="#d9a93f"/><rect x="17" y="9.6" width="4" height="38.4" fill="#d9a93f"/><rect x="43" y="9.6" width="4" height="38.4" fill="#d9a93f"/>
<rect x="27.5" y="24" width="9" height="11" rx="2" fill="#e6b84a" stroke="#9a6a1c" stroke-width=".8"/><circle cx="32" cy="28.6" r="1.6" fill="#4a3426"/><rect x="31.3" y="29" width="1.4" height="3.6" fill="#4a3426"/></svg>`;

// ---------- the phrase book: a pearl's three voices ----------
const pearlBox = (c, p) => `<div class="mg-p">
  <div class="mg-h">${pearl(6.4)}<b class="mg-no" style="color:${c.color}">№${p.num}</b><span class="mg-name">${esc(p.name)}</span></div>
  ${p.voices.map((abc, v) => `<div class="mg-v"><span class="mg-vb">${ROMAN[v]}</span>${staff(abc, { cls: 'mg-st' })}</div>`).join('')}
</div>`;

const LEGEND = 'I — მთქმელი, II — მოძახილი, III — ბანი; 8 გასაღების ქვეშ — ოქტავით დაბლა. ფრაზა ნებისმიერ ტონში იმღერება — ხმოვნით ან „ლა“-თი.';
// the print's script flows a chest's pearls over its pages (all of them start on the first)
const phrasePage = (c, k) => page(`<div class="mg-mHead" style="border-color:${c.color}"><span class="aso">${aso(title)}</span><b style="color:${c.color}">${esc(c.title)} · ${esc(c.label)}</b><span class="mg-sub">${esc(c.sub)}</span><span class="mg-pg" data-chest="${c.ci}">${k + 1}</span></div>
<div class="mg-flow" data-chest="${c.ci}">${k === 0 ? c.items.map(p => pearlBox(c, p)).join('') : ''}</div>
<div class="mg-legend">${LEGEND}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ${esc(c.label)} — მარგალიტების ფრაზები</div>`, 'mg-fP');

// ---------- the class's chest: a row a pearl, a circle a voice ----------
const classPage = c => page(`<div class="mg-cl">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b style="color:${c.color}">კლასის სკივრი · ${esc(c.label)}</b><span class="rs-date">კლასი <i></i></span></div>
  <p class="rs-scHint">გაპრიალდა? იმ ხმის წრე გააფერადეთ და გვერდით მომღერლის სახელი ან თარიღი ჩაწერეთ. სამივე ხმით გაპრიალებული მარგალიტი ოქროსფერია — ვარსკვლავიც გააფერადეთ. შემდეგ გაკვეთილზე ჯერ ის მარგალიტები ითამაშეთ, სადაც წრეები ყველაზე ცოტაა გაფერადებული.</p>
  <table class="mg-tab">
    <tr><th class="n">№</th><th class="nm">მარგალიტი</th>${ROMAN.map((r, v) => `<th class="vc">${r} · ${VOICE_NAME[v]}</th>`).join('')}<th class="g">${icon('star', { size: 4.6, color: C.goldDark, width: 1.8 })}</th></tr>
    ${c.items.map(p => `<tr><td class="n" style="color:${c.color}">${p.num}</td><td class="nm">${esc(p.name)}</td>${ROMAN.map(() => '<td class="vc"><span class="o"></span><i></i></td>').join('')}<td class="g">${icon('star', { size: 5.4, color: '#c9b48e', width: 1.5 })}</td></tr>`).join('')}
  </table>
  <div class="mg-clFoot">${chest(11)}<span>გაპრიალებული <i></i> / 20</span><span>ოქროსფერი <i></i></span></div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · კლასის სკივრი — ${esc(c.label)}</div>`, 'mg-clP');

// ---------- tokens: three rows a chest (its twenty and a spare), a row of spares ----------
const tokenFront = (c, p) => `<div class="mg-tok" style="--c:${c.color}">${pearl(10.5)}<b>${p ? `№${p.num}` : '№ ___'}</b><span>${c ? esc(c.label) : ''}</span></div>`;
const tokenBack = c => `<div class="mg-tokB" style="--c:${c ? c.color : C.brown}"><span class="aso">${aso('მარგ')}</span>${pearlLine(9, '#fff')}</div>`;
const SPARE = { color: C.brown, label: '' };
const tokenRows = [...CHEST_DATA.flatMap(c => [...c.items.map(p => ({ c, p })), { c, p: null }]), ...Array.from({ length: 7 }, () => ({ c: SPARE, p: null }))];
const tokensFront = tokenSheet(tokenRows.map(t => tokenFront(t.c, t.p)), { label: `${title} · მარგალიტების ჟეტონები: სამი რიგი თითო სკივრს + სათადარიგო` });
const tokensBack = tokenSheet(tokenRows.map(t => tokenBack(t.c)), { back: true, label: `${title} · ჟეტონები — ზურგი` });

// ---------- my chests: every singer's own, to colour ----------
const mineBlock = c => `<div class="mg-mb">
  <div class="mg-mbH">${chest(9.5)}<b style="color:${c.color}">${esc(c.title)} · ${esc(c.label)}</b><span>გაპრიალებული <i></i> / 20</span></div>
  <div class="mg-mbG">${c.items.map(p => `<div class="mg-mc">${pearlLine(11.5)}<b style="color:${c.color}">№${p.num}</b><span class="mg-d">${ROMAN.map(r => `<i><em>${r}</em></i>`).join('')}</span></div>`).join('')}</div>
</div>`;
const minePage = page(`<div class="mg-mine">
  <div class="rs-scHead"><span class="aso">${aso('ჩემი სკივრები')}</span><b>ჩემი სკივრები</b><span class="rs-date">სახელი <i></i></span></div>
  <p class="rs-scHint">მარგალიტი გააპრიალე? მის ქვეშ იმ ხმის წრე გააფერადე — I, II ან III. სამივე ხმით გაპრიალებული მარგალიტი ოქროსფრად შეღებე: ის ოქროს მარგალიტია.</p>
  ${CHEST_DATA.map(mineBlock).join('')}
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ჩემი სკივრები</div>`, 'mg-mP');

// ---------- the cover and the rules ----------
const EXAMPLE = CHEST_DATA[0].items.find(p => p.num === 75) ?? CHEST_DATA[0].items[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">სამ სკივრში — წირვის, მწუხრისა და ცისკრის — სამოცი საგალობელია, თითოეული ერთი მარგალიტი. მარგალიტი მაშინ პრიალდება, როცა საგალობლის პირველ ფრაზას ზუსტად იმღერებ — I, II ან III ხმით. გუნდები რიგრიგობით იღებენ ჟეტონს, მღერიან და ქულებს აგროვებენ, კლასი კი გაკვეთილიდან გაკვეთილამდე თავის სკივრს ავსებს. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="mg-ex box">
    ${pearlBox(CHEST_DATA[0], EXAMPLE)}
    <div class="mg-exSteps">
      <div>${step('hand', 'გუნდი ტომრიდან ჟეტონს იღებს — ამ მარგალიტს მღერის.')}${step('music', 'მომღერალი ხმას ირჩევს; წამყვანი მის ფრაზას ერთხელ უმღერის.')}</div>
      <div>${step('mic-vocal', 'მომღერალი ფრაზას იმეორებს — თავის ტონში.')}${step('sparkles', 'ხუთიდან ოთხი ნოტი სწორად? მარგალიტი გაპრიალდა!', GREEN)}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>${no('cover')}-ის ზურგი</td></tr>
        ${CHEST_DATA.map(c => `<tr><td>${esc(c.label)}: 20 მარგალიტის ფრაზა სამ ხმაზე და კლასის სკივრი</td><td>20</td><td>${no(`c${c.ci + 1}-1`)}–${no(`c${c.ci + 1}-${CHEST_SHEETS}`)}</td></tr>`).join('')}
        <tr><td>მარგალიტის ჟეტონი ⌀25 მმ (60 + 10 სათადარიგო)</td><td>70</td><td>${no('tokens')}</td></tr>
        <tr><td>„ჩემი სკივრები“ (ორივე მხარეს)</td><td>2</td><td>${no('mine')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ფრაზების წიგნი — წამყვანს; კლასის სკივრის ფურცელი (ყოველი სკივრის ბოლო გვერდი) კედელზე დაკიდეთ.</li>
        <li>ჟეტონები (${no('tokens')}) — მუყაოზე, წრეებად დაჭერით. „ჩემი სკივრები“ (${no('mine')}) — თითო მომღერალს (ერთი ფურცელი ორისთვისაა).</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> აპის „მარგალიტების“ თამაშის ქაღალდის ვარიანტი. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (გელათის სკოლის I და IX ტომები, ციფრული ამოცნობით — შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">ქართული საგალობელი სამხმიანია, და ყოველ ხმას თავისი ჰანგი აქვს. მარგალიტი ერთი საგალობლის პირველი ფრაზაა ერთ ხმაში — სამივე ხმით გაპრიალებული კი ოქროსფერი ხდება.</p>
  <div class="rules"><ol>${[
    ['სკივრი', 'კლასი ირჩევს სკივრს — წირვას, მწუხრს ან ცისკარს. მისი 20 ჟეტონი ტომარაში ან ქუდში ჩაყარეთ, წამყვანს კი ფრაზების წიგნი უჭირავს.'],
    ['გუნდები', 'კლასი 2–6 გუნდად იყოფა (ან ყველა ცალ-ცალკე მღერის). გუნდები რიგრიგობით თამაშობენ — თითოს 2, 3 ან 4 სვლა, როგორც შეთანხმდებით.'],
    ['სვლა', 'გუნდი ჟეტონს იღებს და ნომერს ამბობს; წამყვანი წიგნში ამ მარგალიტს პოულობს. გუნდის მომღერალი ირჩევს ხმას: I მთქმელი, II მოძახილი თუ III ბანი.'],
    ['მოისმინე', 'წამყვანი ამ ხმის ფრაზას ერთხელ მღერის ან ფორტეპიანოზე უკრავს. მეორედ მოსმენა ერთხელ შეიძლება.'],
    ['იმღერე', 'მომღერალი ფრაზას იმეორებს — ხმოვნით ან „ლა“-თი, თავისთვის მოსახერხებელ ტონში: მთავარია, ნოტები ერთმანეთს სწორად მიჰყვებოდეს.'],
    ['ჟიური', `წამყვანი და სხვა გუნდები აფასებენ: <b style="color:${GREEN}">ხუთიდან ოთხი ნოტი მაინც სწორად</b> (80 %, როგორც აპში) — მარგალიტი გაპრიალდა, 2 ქულა; ნახევარი მაინც — 1 ქულა; ნაკლები — 0.`],
    ['ჟეტონი', 'გაპრიალებული მარგალიტის ჟეტონს გუნდი იტოვებს. გაუპრიალებელი ტომარაში ბრუნდება — მერე ის სხვა ხმით ან სხვა გუნდმა სცადოს.'],
    ['კლასის სკივრი', 'გაპრიალებული ხმის წრე კლასის სკივრის ფურცელზე ფერდება, მომღერალი კი თავის „ჩემ სკივრებშიც“ აფერადებს. სამივე ხმა გაპრიალდა? ოქროსფერი მარგალიტია — ★.'],
    ['გამარჯვება', 'ყველა გუნდის ბოლო სვლის მერე იგებს მეტი ქულის გუნდი; ფრეს — ვისაც მეტი ჟეტონი აქვს.'],
    ['შემდეგ ჯერზე', 'ჯერ ის მარგალიტები ჩაყარეთ, რომლებიც კლასს ყველაზე ნაკლებ ხმაში აქვს გაპრიალებული — ასე კლასი სამივე სკივრს ავსებს.'],
  ].map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: „საგანძურის გზაზე“ ტელეფონი თავად გიმღერის ფრაზას, გისმენს და ითვლის, რამდენი პროცენტი იმღერე — 80 %-ზე მარგალიტი პრიალდება, მასწავლებელი კი ჩანაწერს ისმენს და ამოწმებს. თამაშებში — „კლასის სკივრი“: გუნდები რიგრიგობით მღერიან ერთ ტელეფონში — sagandzureli.ge → თამაშები → მარგალიტები.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
// the staves, then each chest's pearls flowed over its pages: a page gives its last pearl to the next one while it overflows
export const script = `${musicScript(1.65)}
// a staff's box keeps only what is drawn (abcjs leaves room above and below for words and chords these phrases do not have)
document.querySelectorAll('.mg-st svg').forEach(svg => {
  const vb = svg.viewBox.baseVal;
  if (!vb || !vb.width) return;
  const b = svg.getBBox();
  const h = b.height + 5;
  svg.setAttribute('viewBox', '0 ' + (b.y - 2.5) + ' ' + vb.width + ' ' + h);
  // abcjs keeps the staff's shape in its box's bottom padding
  if (svg.parentElement && svg.parentElement.style.paddingBottom) svg.parentElement.style.paddingBottom = (h / vb.width) * 100 + '%';
});
const chests = {};
document.querySelectorAll('.mg-flow').forEach(el => { (chests[el.dataset.chest] = chests[el.dataset.chest] || []).push(el); });
for (const [k, boxes] of Object.entries(chests)) {
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    const over = () => box.scrollHeight > box.clientHeight + 1;
    while (over() && box.children.length > 1) {
      if (i + 1 >= boxes.length) throw new Error('margalitebi: the pearls of chest ' + k + ' need more than ' + boxes.length + ' pages');
      boxes[i + 1].prepend(box.lastElementChild);
    }
    if (over()) throw new Error('margalitebi: a pearl of chest ' + k + ' is taller than a page');
  }
  const used = boxes.filter(b => b.children.length).length;
  boxes.forEach((b, i) => { if (b.children.length && i < used - 1) b.classList.add('full'); else if (!b.children.length) b.classList.add('empty'); });
  document.querySelectorAll('.mg-pg[data-chest="' + k + '"]').forEach((el, i) => { el.textContent = i < used ? (i + 1) + ' / ' + used : ''; });
}`;

export const css = `${coverCss}${partsCss}${musicCss}
.mg-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:3.6mm;border-bottom:.4mm solid;padding-bottom:1.6mm}
.mg-mHead .aso{font-size:12pt;color:var(--wine);white-space:nowrap}
.mg-mHead b{font-size:13pt;white-space:nowrap}
.mg-sub{font-size:9.2pt;color:var(--muted);min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.mg-pg{margin-left:auto;font-size:9.5pt;font-weight:700;color:var(--muted);white-space:nowrap}
.mg-flow{position:absolute;left:10mm;right:10mm;top:18.5mm;bottom:19mm;display:flex;flex-direction:column;gap:2.6mm;overflow:hidden}
.mg-flow.full{justify-content:space-between;gap:1.6mm}
.mg-flow.empty{border:.3mm dashed var(--line);border-radius:2.2mm;background:repeating-linear-gradient(transparent 0 9.6mm,#e8dcc8 9.6mm 9.9mm)}
.mg-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:8.8pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.4mm}
.mg-p{flex:none;border:.3mm solid var(--line);border-radius:2.2mm;padding:1.6mm 4mm 1.2mm;background:#fff}
.mg-h{display:flex;align-items:center;gap:2mm;margin-bottom:.6mm}
.mg-no{font-size:11.5pt;font-weight:800;white-space:nowrap}
.mg-name{min-width:0;flex:1;font-size:11.5pt;font-weight:700;color:var(--brown);line-height:1.15}
.mg-v{display:flex;align-items:center;gap:2.6mm;border-top:.2mm dotted #e3d6c1;padding-top:.4mm}
.mg-v:first-of-type{border-top:0}
.mg-vb{flex:none;width:7mm;text-align:center;font-size:11pt;font-weight:800;color:var(--wine)}
.mg-st{flex:1;min-width:0}
.mg-cl,.mg-mine{position:absolute;inset:12mm 12mm 12mm}
table.mg-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.mg-tab th,.mg-tab td{border:.25mm solid #bba98f;text-align:center;padding:0}
.mg-tab th{background:var(--parch);color:var(--wine);font-size:9pt;height:8mm}
.mg-tab td{height:10.2mm}
.mg-tab .n{width:12mm}
.mg-tab td.n{font-weight:800;font-size:11pt;background:var(--cream)}
.mg-tab .nm{width:56mm;text-align:left;padding:0 2mm;font-size:9.6pt;line-height:1.15;color:var(--brown)}
.mg-tab th.nm{text-align:center}
.mg-tab td.vc{text-align:left;padding:0 1.6mm}
.mg-tab td.vc{display:table-cell}
.mg-tab .o{display:inline-block;vertical-align:middle;width:6mm;height:6mm;border-radius:50%;border:.35mm solid #a99a85;background:#fff}
.mg-tab td.vc i{display:inline-block;vertical-align:middle;width:calc(100% - 9mm);margin-left:1.4mm;border-bottom:.25mm solid #d6c7ae;height:5mm}
.mg-tab .g{width:11mm}
.mg-tab td.g svg{display:inline-block;vertical-align:middle}
.mg-tab tr:nth-child(even) td:not(.n){background:#fdfaf3}
.mg-clFoot{display:flex;align-items:center;gap:6mm;margin-top:4mm;font-size:11pt;font-weight:700;color:var(--wine)}
.mg-clFoot span{display:flex;gap:2mm;align-items:baseline}
.mg-clFoot i{display:inline-block;width:16mm;border-bottom:.3mm solid #bba98f}
.mg-tok{width:100%;height:100%;border-radius:50%;box-sizing:border-box;border:1.1mm solid var(--c);background:#fffdf8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0}
.mg-tok svg{margin-top:-1mm}
.mg-tok b{font-size:10.5pt;font-weight:800;color:var(--c);line-height:1;margin-top:-.6mm}
.mg-tok span{font-size:6.6pt;color:var(--muted);line-height:1.2}
.mg-tokB{width:100%;height:100%;border-radius:50%;background:var(--c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4mm}
.mg-tokB .aso{font-size:7pt;color:#fff;opacity:.85;letter-spacing:.06em}
.mg-mb{margin-top:6mm;border:.3mm solid var(--line);border-radius:2.4mm;padding:2.6mm 3.4mm 3mm;background:#fff}
.mg-mbH{display:flex;align-items:center;gap:2.6mm;margin-bottom:1.6mm}
.mg-mbH b{font-size:12pt}
.mg-mbH span{margin-left:auto;display:flex;gap:1.6mm;align-items:baseline;font-size:9.5pt;color:var(--brown)}
.mg-mbH i{display:inline-block;width:12mm;border-bottom:.3mm solid #bba98f}
.mg-mbG{display:grid;grid-template-columns:repeat(10,1fr);gap:4mm 0}
.mg-mc{display:flex;flex-direction:column;align-items:center;gap:.5mm}
.mg-mc b{font-size:9.4pt;font-weight:800;line-height:1}
.mg-d{display:flex;gap:.8mm}
.mg-d i{width:4.6mm;height:4.6mm;border-radius:50%;border:.3mm solid #a99a85;display:flex;align-items:center;justify-content:center}
.mg-d em{font-style:normal;font-size:5.6pt;color:#a99a85;line-height:1}
.mg-ex{margin:0 0 5mm;padding:3mm 4mm}
.mg-ex .mg-p{border:0;padding:0 0 1mm;background:transparent}
.mg-exSteps{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm;margin-top:2.6mm;border-top:.2mm solid var(--line);padding-top:2.6mm}
.mg-exSteps .rs-step{font-size:9.6pt;margin-bottom:1.8mm}
`;

const SHEETS = [{ key: 'cover' }];
CHEST_DATA.forEach(c => {
  const pgs = [...Array.from({ length: PAGES_A_CHEST }, (_, k) => phrasePage(c, k)), classPage(c)];
  for (let s = 0; s < CHEST_SHEETS; s++) SHEETS.push({ key: `c${c.ci + 1}-${s + 1}`, front: pgs[s * 2], ...(pgs[s * 2 + 1] ? { back: pgs[s * 2 + 1] } : {}) });
});
SHEETS.push({ key: 'tokens', front: tokensFront, back: tokensBack }, { key: 'mine', front: minePage, back: minePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));
SHEETS[0].back = rulesPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
