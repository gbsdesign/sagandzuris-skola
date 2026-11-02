// „საგალობო ლოტო“ on paper (2026-11-01, like Bingo): thirty numbered cards of nine chants, three by three, over the twenty
// well-known chants of `data/lotoKit.ts` — the very cards the app's hybrid checks by their number (`utils/loto.ts` kitCards,
// seed KIT_SEED), so paper and phone agree. The host sings each chant's opening from its book notes (the list, on staves),
// draws the order from twenty slips and writes it on „რა ჟღერდა“; three marked in a row is „საგანძური!“. With it: six blank
// cards (each writes nine names of the list), the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, grapeEmblem, coverCss } from '../lib.mjs';
import { abcOf, lineOf, loadScore, openingOf, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { app } from '../melodies.mjs';
import { appData } from '../appData.mjs';

const { LOTO_KIT, kitCards, KIT_CARDS, CARD_SIZE, LINES, LOTO_CLIP, softBreaks } = await appData({
  'data/lotoKit.ts': ['LOTO_KIT'],
  'utils/loto.ts': ['kitCards', 'KIT_CARDS', 'CARD_SIZE', 'LINES', 'LOTO_CLIP'],
  'utils/tsqvilebi.ts': ['softBreaks'],
});
const { BOOK_NAMES } = app;

export const id = 'sagalobo-loto';
export const title = 'საგალობო ლოტო';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–30 მოთამაშე · 6 წლიდან · 15–20 წუთი';
const GAMES = 4;
/** the services' colours (a dot and a word under every name) */
const SERVICE = { 'წირვა': C.wine, 'მწუხრი': '#2b5f8a', 'ცისკარი': '#b07d12' };

// ---------- the chants and the cards ----------
/** „გელათის სკოლის საგალობლები, IX ტომი“ → „IX ტომი“ */
const volume = book => (BOOK_NAMES[book] ?? book).split(', ').pop();
const CHANTS = LOTO_KIT.map((c, i) => {
  const notes = openingOf(lineOf(loadScore(c.book, c.num), 0), { min: 8, max: 12 }).notes;
  if (notes.length < 6) throw new Error(`sagalobo-loto: ${c.title} has too short an opening (${notes.length} notes)`);
  if (!SERVICE[c.service]) throw new Error(`sagalobo-loto: unknown service ${c.service}`);
  return { ...c, no: i + 1, ref: `${volume(c.book)} · №${c.num}`, abc: abcOf(notes) };
});
const CARDS = kitCards(CHANTS.length);
if (CARDS.length !== KIT_CARDS) throw new Error(`sagalobo-loto: ${CARDS.length} cards, not ${KIT_CARDS}`);
for (const card of CARDS) {
  if (card.length !== CARD_SIZE || new Set(card).size !== CARD_SIZE || card.some(i => i < 0 || i >= CHANTS.length)) throw new Error(`sagalobo-loto: a bad card ${card}`);
}
const ON_CARDS = CHANTS.map((_, i) => CARDS.filter(card => card.includes(i)).length);
const PER_SHEET = 6;
const CARD_SHEETS = Math.ceil(CARDS.length / PER_SHEET);
const W = 98, H = 90;

const tag = (service, cls = 'lt-tag') => `<span class="${cls}"><i style="background:${SERVICE[service]}"></i>${esc(service)}</span>`;
const cellOf = i => `<div class="lt-cell"><b class="lt-nm">${softBreaks(esc(CHANTS[i].title), 8)}</b>${tag(CHANTS[i].service)}</div>`;
const cardFront = (card, no) => `<div class="lt-card"><div class="lt-frame"></div>
<div class="lt-head"><span class="aso">${aso(title)}</span><span class="lt-hSub">სამი ერთ ხაზზე — „საგანძური!“</span><b>№${no}</b></div>
<div class="lt-grid">${card.map(cellOf).join('')}</div></div>`;
const blankFront = () => `<div class="lt-card"><div class="lt-frame"></div>
<div class="lt-head"><span class="aso">${aso(title)}</span><span class="lt-hSub">ცხრა სახელი სიიდან</span><b class="lt-hOwn">შენი</b></div>
<div class="lt-grid">${Array.from({ length: CARD_SIZE }, () => '<div class="lt-cell lt-empty"><i></i><i></i></div>').join('')}</div></div>`;
const cardBack = no => `<div class="lt-card lt-back"><div class="lt-frame"></div>
<div class="lt-emb">${grapeEmblem(22, C.gold)}</div>
<div class="lt-bMark aso">${aso(title)}</div>
<div class="lt-bNo">${no ? `ბარათი №${no}` : 'შენი ბარათი'}</div>
<div class="lt-bSub">${esc(SERIES)}</div></div>`;

const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const slots = Array.from({ length: PER_SHEET }, (_, i) => s * PER_SHEET + i).filter(i => i < CARDS.length);
  const label = `${title} · ბარათები №${slots[0] + 1}–${slots[slots.length - 1] + 1}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(slots.map(i => cardFront(CARDS[i], i + 1)), { cols: 2, rows: 3, w: W, h: H, label }),
    back: gridSheet(slots.map(i => cardBack(i + 1)), { cols: 2, rows: 3, w: W, h: H, back: true, label: `${label} — ზურგი` }),
  };
});
const blankSheet = {
  key: 'blank',
  front: gridSheet(Array.from({ length: PER_SHEET }, blankFront), { cols: 2, rows: 3, w: W, h: H, label: `${title} · ცარიელი ბარათები` }),
  back: gridSheet(Array.from({ length: PER_SHEET }, () => cardBack(0)), { cols: 2, rows: 3, w: W, h: H, back: true, label: `${title} · ცარიელი ბარათები — ზურგი` }),
};

// ---------- the host's list: every chant's opening on a staff, ten a page ----------
const chantBox = c => `<div class="lt-mel">
  <div class="lt-melHead"><span class="lt-no">${c.no}</span><div class="lt-melT"><b>${esc(c.title)}</b><span>${tag(c.service, 'lt-tag lt-tagIn')} · ${esc(c.ref)}</span></div></div>
  ${staff(c.abc)}
</div>`;
const listPage = p => page(`<div class="lt-mHead"><span class="aso">${aso(title)}</span><b>საგალობლები ${p * 10 + 1}–${p * 10 + 10}</b><span class="lt-mSide">${icon('music', { size: 4.2, color: C.wine, width: 2 })} წამყვანისთვის</span></div>
<div class="lt-mels">${CHANTS.slice(p * 10, p * 10 + 10).map(chantBox).join('')}</div>
<div class="lt-legend">იმღერე დასაწყისი ფრაზის ბოლომდე — დაახლოებით ${LOTO_CLIP} წამი, როგორც აპში. ჯერ უსიტყვოდ („ლა-ლა“); ვერავინ იცნო — მეორედ, სიტყვებით. სახელს არ ამბობ.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · საგალობლები ნოტებით</div>`, 'lt-mP');

// ---------- the slips to draw ----------
const slipFront = c => `<div class="lt-slip"><span class="lt-sNo">${c.no}</span><div class="lt-sNm">${softBreaks(esc(c.title), 8)}</div>${tag(c.service)}</div>`;
const slipBack = () => `<div class="lt-slip lt-sBack">${grapeEmblem(13, C.gold)}<span class="aso">${aso(title)}</span></div>`;
const SLIP = { cols: 4, rows: 5, w: 46, h: 54 };
const slipsSheet = {
  key: 'slips',
  front: gridSheet(CHANTS.map(slipFront), { ...SLIP, label: `${title} · ამოსაღები ფურცლები — დაჭერი და ჩაყარე ჩანთაში` }),
  back: gridSheet(CHANTS.map(slipBack), { ...SLIP, back: true, label: `${title} · ამოსაღები ფურცლები — ზურგი` }),
};

// ---------- „რა ჟღერდა“: the host's record of four games ----------
const callsPage = page(`<div class="lt-cl">
  <div class="lt-clHead"><span class="aso">${aso(title)}</span><b>რა ჟღერდა</b><span class="lt-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="lt-clHint">როცა საგალობელს იმღერებ, მის სტრიქონში, ამ თამაშის სვეტში ჩაწერე, მერამდენე იყო: 1, 2, 3… „საგანძური!“ ითვლება, თუ ხაზის სამივე სახელს აქ ნომერი უწერია.</p>
  <table class="lt-tab">
    <tr><th class="n">№</th><th class="nm">საგალობელი</th>${Array.from({ length: GAMES }, (_, g) => `<th class="g">თამაში ${g + 1}</th>`).join('')}</tr>
    ${CHANTS.map(c => `<tr><td class="n">${c.no}</td><td class="nm"><div><b>${esc(c.title)}</b>${tag(c.service)}</div></td>${'<td class="g"></td>'.repeat(GAMES)}</tr>`).join('')}
  </table>
  <table class="lt-wins">
    <tr><th class="n">თამაში</th><th>პირველი ხაზი — ბარათი №, ვისი</th><th>სრული ბარათი — №, ვისი</th></tr>
    ${Array.from({ length: GAMES }, (_, g) => `<tr><td class="n">${g + 1}</td><td></td><td></td></tr>`).join('')}
  </table>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · რა ჟღერდა — ოთხი თამაში ერთ მხარეს</div>`, 'lt-clP');

// ---------- the cover and the rules ----------
const STEPS = [
  ['megaphone', 'წამყვანი ფურცელს ამოიღებს და საგალობლის დასაწყისს მღერის — სიაში ნოტებითაა.', C.wine],
  ['scan-search', 'ვინც იცნობს და თავის ბარათზე პოულობს, ნიშნავს: მარცვლით, ღილით ან ფანქრით.', C.wine],
  ['gem', 'სამი მონიშნული ერთ ხაზზე — გასწვრივ, დაღმა ან ირიბად — „საგანძური!“', C.goldDark],
  ['clipboard-check', 'წამყვანი „რა ჟღერდა“ ფურცლით ამოწმებს. თამაში გრძელდება — მეორე ხაზამდე და სრულ ბარათამდე.', '#2f7d4f'],
];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ლოტო საგალობლებით. ყველას თავისი ბარათი აქვს — ცხრა ცნობილი საგალობლის სახელით. წამყვანი რიგრიგობით მღერის მათ დასაწყისს; ვინც იცნობს და ბარათზე იპოვის, ნიშნავს. ტელეფონი არ სჭირდება: წამყვანმა ნოტები უნდა წაიკითხოს ან საკრავზე დაუკრას.<br><b>${META}</b></div>
  <div class="lt-ex box">
    <div class="lt-exCard">${cardFront(CARDS[0], 1)}</div>
    <div class="lt-exR">
      <h3>ასე მიდის თამაში</h3>
      ${STEPS.map(([ic, text, color]) => `<div class="lt-step">${icon(ic, { size: 6, color, width: 1.7 })}<span>${text}</span></div>`).join('')}
      <div class="lt-svc">${Object.keys(SERVICE).map(s => tag(s, 'lt-tag lt-tagBig')).join('')}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>საგალობლების სია ნოტებით, წამყვანისთვის</td><td>${CHANTS.length}</td><td>${no('list')}</td></tr>
        <tr><td>ამოსაღები ფურცლები</td><td>${CHANTS.length}</td><td>${no('slips')}</td></tr>
        <tr><td>„რა ჟღერდა“ — წამყვანის ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('calls')}</td></tr>
        <tr><td>ბარათები №1–${CARDS.length}, ყველა სხვადასხვა</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები — თქვენი არჩევანით</td><td>${PER_SHEET}</td><td>${no('blank')}</td></tr>
        <tr><td>მარცვლები, ღილები ან ფანქარი</td><td>—</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი ${W}×${H} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) და ამოსაღები ფურცლები (${no('slips')}) — სქელ ქაღალდზე, ჭრა მონიშნული ხაზებით. მარცვლით ან ღილით მონიშვნისას ბარათი ბევრჯერ გამოდგება.</li>
        <li>„რა ჟღერდა“ (${no('calls')}) — ერთი მხარე ოთხ თამაშზე; ცარიელი ბარათები (${no('blank')}) — რამდენიც გინდათ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ლოტოს (ბინგოს) იდეით. ნოტები საგანძურის სკოლის აპის წიგნებიდანაა — გელათის სკოლის საგალობლები, I და IX ტომი (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['მოთამაშეები', `2–30 მოთამაშე, ყველას თავისი ბარათი (თუ მეტნი ხართ — ორს ერთი). ${CARDS.length} ბარათი ყველა სხვადასხვაა; ყოველი საგალობელი ${Math.min(...ON_CARDS)}–${Math.max(...ON_CARDS)} ბარათზეა.`],
  ['წამყვანი', 'მასწავლებელი ან ის, ვინც ნოტებს კითხულობს, — ის არ თამაშობს. ამოსაღებ ფურცლებს ჩანთაში ან ქუდში ჩაყრის და აურევს; „რა ჟღერდა“ ფურცელი და სია მასთანაა.'],
  ['ნაწყვეტი', `წამყვანი ფურცელს ამოიღებს, სიაში ნომრით პოულობს საგალობელს და მღერის დასაწყისს — ფრაზის ბოლომდე, დაახლოებით ${LOTO_CLIP} წამს; საჭიროა — მეორედაც. სახელს არ ამბობს.`],
  ['მონიშვნა', 'ვინც იცნო და ბარათზე აქვს, ნიშნავს. წამყვანი „რა ჟღერდა“ ფურცელზე ამ საგალობლის სტრიქონში წერს, მერამდენე იყო, ფურცელს კი გვერდზე დებს.'],
  ['საგანძური!', `სამი მონიშნული ერთ ხაზზე — გასწვრივ, დაღმა ან ირიბად (ბარათზე სულ ${LINES.length} ხაზია) — მოთამაშე იძახის „საგანძური!“.`],
  ['შემოწმება', 'წამყვანი ხაზის სამ სახელს „რა ჟღერდა“ ფურცელზე პოულობს. სამივეს ნომერი აქვს — საგანძური ნაპოვნია, ბარათის ნომერი და სახელი იწერება. შეცდა? არაფერია: ის მონიშვნა, რომელიც არ ჟღერდა, აიღოს — თამაში გრძელდება.'],
  ['გაგრძელება', 'ნაწყვეტები გრძელდება: მეორე ხაზი, მესამე… ცხრავე მონიშნული — „სრული ბარათი“ — დიდი საგანძურია და თამაშიც მთავრდება.'],
  ['ახალი თამაში', `${CHANTS.length} ნაწყვეტში ყველა ბარათი ივსება, თამაში 15–20 წუთია. ფურცლები უკან ჩაყარეთ, ბარათები გაცვალეთ.`],
  ['უფრო ადვილად', 'პატარებთან წამყვანს შეუძლია წინასწარ თქვას, რომელი ღვთისმსახურებისაა — წირვის, მწუხრის თუ ცისკრის (ბარათზე ფერით აწერია), ან ნაწყვეტი სიტყვებით იმღეროს.'],
  ['თქვენი ბარათები', 'ცარიელ ბარათზე ყველა თვითონ წერს ცხრა სახელს სიიდან — ვისაც როგორ უნდა (წამყვანი სიას ხმამაღლა კითხულობს). შეგიძლიათ თქვენი საგალობლებიც ჩაწეროთ — ოღონდ წამყვანმა ყველა უნდა იმღეროს.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„საგალობო ლოტო“ სმენის თამაშია: იცნობ საგალობელს დასაწყისით? ის ყველას ერთად ათამაშებს — ვინც ჯერ ცოტას იცნობს, ისიც, რადგან ბარათზე ყოველთვის იმედი რჩება.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}${/[!?]$/.test(h) ? '' : '.'}</b> ${t}</li>`).join('')}</ol></div>
  <div class="lt-more box"><b>აპშიც</b> არის: „ონლაინ“ — ყველას ბარათი თავის ტელეფონზეა და ნაწყვეტი ყველასთან ჟღერს; „ჰიბრიდული“ — ერთი ტელეფონი ნაწყვეტებს უკრავს და ამ ფაილის ბარათებს ნომრით ამოწმებს; „მარტო“ — შენი ბარათი და აპის ნაწყვეტები. sagandzureli.ge → თამაშები → საგალობო ლოტო.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
// the staves, then every card's names shrunk until they fit their cell
export const script = `(() => {
${musicScript(1.08)}
document.querySelectorAll('.lt-cell,.lt-slip').forEach(cell => {
  const nm = cell.querySelector('.lt-nm,.lt-sNm');
  if (!nm) return;
  let size = parseFloat(getComputedStyle(nm).fontSize), n = 0;
  while ((cell.scrollHeight > cell.clientHeight + 0.5 || nm.scrollWidth > nm.clientWidth + 0.5) && size > 7 && n++ < 40) {
    size -= 0.25;
    nm.style.fontSize = size + 'px';
  }
});
})()`;

export const css = `${coverCss}${musicCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.rulesP .rules{font-size:10.6pt;line-height:1.38}
.lt-card{position:absolute;inset:0;overflow:hidden;background:var(--paper)}
.lt-frame{position:absolute;inset:2mm;border:.5mm solid var(--wine);border-radius:3mm}
.lt-head{position:absolute;left:5mm;right:5mm;top:4.2mm;height:7.4mm;display:flex;align-items:center;gap:2.4mm;border-bottom:.25mm solid var(--gold)}
.lt-head .aso{font-size:9pt;color:var(--wine);letter-spacing:.05em;white-space:nowrap}
.lt-hSub{font-size:6.8pt;color:var(--muted);white-space:nowrap}
.lt-head b{margin-left:auto;font-size:13pt;color:var(--wine);white-space:nowrap}
.lt-head .lt-hOwn{font-size:9pt;color:var(--muted);font-weight:700}
.lt-head .lt-hOwn::after{content:'';display:inline-block;width:9mm;border-bottom:.25mm solid #bba98f;margin-left:1.2mm}
.lt-grid{position:absolute;left:4.4mm;right:4.4mm;top:13.4mm;bottom:4.4mm;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:1.4mm}
.lt-cell{min-width:0;min-height:0;overflow:hidden;background:#fff;border:.35mm solid var(--brown);border-radius:2.4mm;padding:1.2mm 1.3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;text-align:center}
.lt-nm{display:block;max-width:100%;font-size:10.4pt;line-height:1.12;color:var(--brown);hyphens:manual;overflow-wrap:break-word}
.lt-tag{display:inline-flex;align-items:center;gap:.9mm;font-size:6.4pt;color:var(--muted);white-space:nowrap}
.lt-tag i{width:1.9mm;height:1.9mm;border-radius:50%;display:inline-block}
.lt-empty{justify-content:center;gap:5.6mm;padding:3mm 2.6mm 1.6mm;align-items:stretch}
.lt-empty i{display:block;border-bottom:.25mm solid #bba98f;height:0}
.lt-back{background:var(--cream)}
.lt-back .lt-frame{border-color:var(--gold);border-width:.35mm;inset:3mm}
.lt-emb{position:absolute;left:0;right:0;top:17mm;display:flex;justify-content:center}
.lt-bMark{position:absolute;left:0;right:0;top:44mm;text-align:center;font-size:13pt;color:var(--wine);letter-spacing:.05em}
.lt-bNo{position:absolute;left:0;right:0;top:53mm;text-align:center;font-size:10pt;font-weight:700;color:var(--brown)}
.lt-bSub{position:absolute;left:0;right:0;bottom:9mm;text-align:center;font-size:6.6pt;color:var(--gold2);letter-spacing:.08em}
.lt-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.lt-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.lt-mHead b{font-size:13pt;color:var(--wine)}
.lt-mSide{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.lt-mels{position:absolute;left:10mm;right:10mm;top:19mm;bottom:21mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(5,1fr);gap:3mm 4mm}
.lt-mel{border:.3mm solid var(--line);border-radius:2.2mm;padding:2.4mm 3mm 1.8mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.lt-melHead{display:flex;gap:2.4mm;align-items:flex-start}
.lt-no{flex:none;width:7.2mm;height:7.2mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:11pt;display:flex;align-items:center;justify-content:center}
.lt-melT{min-width:0;display:flex;flex-direction:column;line-height:1.2}
.lt-melT b{font-size:11pt;color:var(--brown)}
.lt-melT>span{font-size:8.4pt;color:var(--muted);margin-top:.5mm;display:flex;align-items:center;gap:1mm}
.lt-tagIn{font-size:8.4pt}
.lt-mel .abc{margin-top:auto;margin-bottom:auto;padding-top:1mm}
.lt-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.lt-slip{position:absolute;inset:0;padding:3mm 2.6mm 2.6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;text-align:center;overflow:hidden;background:#fff}
.lt-sNo{flex:none;width:10mm;height:10mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:14pt;display:flex;align-items:center;justify-content:center}
.lt-sNm{max-width:100%;font-weight:800;font-size:11.4pt;line-height:1.14;color:var(--brown);hyphens:manual;overflow-wrap:break-word}
.lt-sBack{background:var(--cream);gap:2.4mm}
.lt-sBack .aso{font-size:8pt;color:var(--wine);letter-spacing:.05em}
.lt-cl{position:absolute;inset:11mm 12mm 12mm}
.lt-clHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.lt-clHead .aso{font-size:14pt;color:var(--wine);white-space:nowrap}
.lt-clHead b{font-size:14pt;color:var(--wine);white-space:nowrap}
.lt-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline;white-space:nowrap}
.lt-date i{display:inline-block;width:20mm;border-bottom:.25mm solid #bba98f}
.lt-clHint{margin:2.2mm 0 2.6mm;font-size:9.6pt;line-height:1.33}
table.lt-tab,table.lt-wins{width:100%;border-collapse:collapse;table-layout:fixed}
.lt-tab th,.lt-tab td,.lt-wins th,.lt-wins td{border:.25mm solid #bba98f}
.lt-tab th,.lt-wins th{background:var(--parch);color:var(--wine);font-size:9pt;padding:1.2mm 1mm;text-align:center}
.lt-tab th.nm{text-align:left;padding-left:2mm}
.lt-tab td{height:9.6mm}
.lt-tab .n,.lt-wins .n{width:10mm;text-align:center;font-weight:800;color:var(--wine);background:var(--cream)}
.lt-tab .g{width:21mm}
.lt-tab td.nm{padding:0 2mm}
.lt-tab td.nm>div{display:flex;align-items:center;justify-content:space-between;gap:2mm;min-width:0}
.lt-tab td.nm b{font-size:10pt;color:var(--brown);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-tab tr:nth-child(even) td.g{background:#fdfaf3}
.lt-wins{margin-top:4mm}
.lt-wins .n{width:22mm}
.lt-wins td{height:9.6mm}
.lt-ex{display:grid;grid-template-columns:${W}mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.lt-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:3mm;overflow:hidden}
.lt-exR h3{margin:0 0 3mm}
.lt-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.4mm}
.lt-step svg{flex:none;margin-top:.2mm}
.lt-svc{display:flex;flex-wrap:wrap;gap:1.6mm 3.4mm;margin-top:3mm}
.lt-tagBig{font-size:9pt;color:var(--brown);gap:1.4mm}
.lt-tagBig i{width:3mm;height:3mm}
.lt-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'list', front: listPage(0), back: listPage(1) },
  slipsSheet,
  { key: 'calls', front: callsPage, back: callsPage },
  ...cardSheets,
  blankSheet,
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));
if (CHANTS.length !== 20) throw new Error(`sagalobo-loto: the list holds ${CHANTS.length} chants — the host's pages and the slips are laid out for 20`);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
