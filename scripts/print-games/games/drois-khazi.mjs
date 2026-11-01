// „დროის ხაზი“ on paper — the „უტელეფონო“ variant of the app's Timeline game (2026-11-01): 54 event cards, eighteen of each
// deck (history, Georgians' births, culture and sport), and the Liturgy's eighteen parts in their order. The event is on the
// front, its year (or its place in the Liturgy) and a note on the back; the cards are the app's own (`data/khaziCards.ts`), so
// the paper and the phone agree. Rules as the app's: a wrong card goes to its right place and its player draws again; the
// round goes to its end, so everyone has had as many turns.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { KHAZI_CARDS, DECK_LABEL } = await appData({
  'data/khaziCards.ts': ['KHAZI_CARDS'],
  'utils/khazi.ts': ['DECK_LABEL'],
});

export const id = 'drois-khazi';
export const title = 'დროის ხაზი';
const TAG = 'ქართული · უტელეფონო';
const META = '2–6 მოთამაშე ან მთელი კლასი გუნდებად · 8 წლიდან · 15–25 წუთი';
const HAND = 4;

// the printed eighteen of each deck: the best known, spread over the centuries (the app plays all of them)
const DECKS = [
  { id: 'istoria', color: '#7a2028', icon: 'landmark', ids: ['h1', 'h2', 'h3', 'h5', 'h7', 'h11', 'h12', 'h13', 'h14', 'h16', 'h17', 'h18', 'h19', 'h21', 'h23', 'h25', 'h28', 'h30'] },
  {
    id: 'adamianebi', color: '#2b5f8a', icon: 'user-round',
    ids: ['w-3', 'a-saba', 'a-baratashvili', 'a-ilia', 'a-akaki', 'a-kazbegi', 'a-vazha', 'a-kldiashvili', 'a-dutu', 'a-javakhishvili', 'w-13', 'a-galaktion', 'a-leonidze', 'a-asatiani', 'a-amirejibi', 'a-dumbadze', 'a-dochanashvili', 'a-chokheli'],
  },
  { id: 'kultura', color: '#4f8a3c', icon: 'palette', ids: ['k1', 'k2', 'k3', 'k4', 'k5', 'k7', 'k8', 'k9', 'k11', 'k12', 'k14', 'k15', 'k18', 'k19', 'k21', 'k22', 'k24', 'k26'] },
  { id: 'tsirva', color: '#8a6416', icon: 'music', ids: Array.from({ length: 18 }, (_, i) => `t${i + 1}`) },
].map(d => {
  const cards = d.ids.map(cid => {
    const c = KHAZI_CARDS.find(k => k.id === cid);
    if (!c) throw new Error(`drois-khazi: no card ${cid}`);
    if (c.deck !== d.id) throw new Error(`drois-khazi: ${cid} is not in ${d.id}`);
    return c;
  });
  if (cards.length !== 18) throw new Error(`drois-khazi: ${d.id} has ${cards.length} cards`);
  return { ...d, label: DECK_LABEL[d.id], cards };
});
const EVENTS = DECKS.filter(d => d.id !== 'tsirva');
const TSIRVA = DECKS.find(d => d.id === 'tsirva');
const deckOfCard = c => DECKS.find(d => d.id === c.deck);

// ---------- the cards: the event in front, the year behind ----------
const sizeOf = (t, l, xl) => ([...t].length > xl ? ' xl' : [...t].length > l ? ' l' : '');
const band = (d, out = false) => out
  ? `<div class="kz-band out" style="color:${d.color};border-color:${d.color}">${icon(d.icon, { size: 4.2, color: d.color, width: 2 })}<span>${esc(d.label)}</span></div>`
  : `<div class="kz-band" style="background:${d.color}">${icon(d.icon, { size: 4.2, color: '#fff', width: 2 })}<span>${esc(d.label)}</span></div>`;
const cardFront = c => {
  const d = deckOfCard(c);
  return `<div class="card kz"><div class="frame" style="border-color:${d.color}"></div>${band(d)}
<div class="kz-in">
  <div class="kz-pic" style="background:${d.color}14">${icon(c.icon, { size: 13, color: d.color, width: 1.5 })}</div>
  <div class="kz-t${sizeOf(c.text, 34, 58)}"><p>${esc(c.text)}</p></div>
  <div class="kz-hid" style="border-color:${d.color};color:${d.color}"><span>${d.id === 'tsirva' ? 'რიგი წირვაში' : 'წელი'}</span><b>?</b><span class="kz-turn">ზურგზეა</span></div>
</div></div>`;
};
const cardBack = c => {
  const d = deckOfCard(c);
  return `<div class="card kz"><div class="frame" style="border-color:${d.color}"></div>${band(d, true)}
<div class="kz-in b">
  <div class="kz-y${[...c.label].length > 5 ? ' l' : ''}" style="color:${d.color}">${esc(c.label)}</div>
  <div class="kz-bt">${esc(c.text)}</div>
  ${c.note ? `<div class="kz-note">${esc(c.note)}</div>` : `<div class="kz-mark">${icon(c.icon, { size: 12, color: d.color, width: 1.4 })}</div>`}
</div></div>`;
};

const cardSheets = DECKS.flatMap(d => [0, 1].map(s => {
  const nine = d.cards.slice(s * 9, s * 9 + 9);
  const what = `${d.label} ${s + 1}/2`;
  return {
    key: `${d.id}${s + 1}`,
    front: cardSheet(nine.map(cardFront), { label: `${title} · ${what} — ${d.id === 'tsirva' ? 'საგალობლები' : 'მოვლენები'} (წინა მხარე)` }),
    back: cardSheet(nine.map(cardBack), { back: true, label: `${title} · ${what} — ${d.id === 'tsirva' ? 'რიგი' : 'წლები'} (ზურგი)` }),
  };
}));

// ---------- the cover ----------
const EX = DECKS[0].cards.find(c => c.id === 'h5');
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ბარათზე მოვლენაა — დიდგორი, „ვეფხისტყაოსნის“ პირველი ბეჭდვა, „მიმინო“, ილიას დაბადება… წელი კი ზურგზე წერია. ჩასვი ბარათი ხაზში თავის ადგილას: უფრო ადრე იყო თუ გვიან? გადააბრუნე — და ნახე! ვინც ბარათებს პირველი მორჩება, ის იგებს. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="kz-ex box">
    <div class="kz-exCards"><div class="kz-exCard">${cardFront(EX)}</div><div class="kz-exCard">${cardBack(EX)}</div></div>
    <div class="kz-exR">
      <h3>ასე მიდის სვლა</h3>
      <div class="kz-step">${icon('hand', { size: 6, color: C.wine, width: 1.7 })}<span>ხელში ${HAND} ბარათი გიჭირავს — მოვლენით ზემოთ. წელს ვერავინ ხედავს.</span></div>
      <div class="kz-step">${icon('arrow-left-right', { size: 6, color: C.wine, width: 1.7 })}<span>ერთს ხაზში ჩასვამ: მარცხნივ ადრეა, მარჯვნივ გვიან.</span></div>
      <div class="kz-step">${icon('repeat', { size: 6, color: C.wine, width: 1.7 })}<span>გადააბრუნებ: წელი ჯდება — ბარათი რჩება.</span></div>
      <div class="kz-step">${icon('layers', { size: 6, color: '#2f7d4f', width: 1.9 })}<span>არ ჯდება — თავის ადგილას გადადებ და დასტიდან ახალს იღებ.</span></div>
    </div>
  </div>
  <div class="kz-decks">${DECKS.map(d => `<span class="kz-deck" style="border-color:${d.color}"><i style="background:${d.color}">${icon(d.icon, { size: 3.4, color: '#fff', width: 2.2 })}</i>${esc(d.label)} · ${d.cards.length}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        ${DECKS.map(d => `<tr><td>${esc(d.label)}: ${d.id === 'tsirva' ? 'წირვის ნაწილი წინ, მისი რიგი ზურგზე' : d.id === 'adamianebi' ? 'ვინ დაიბადა — წინ, წელი ზურგზე' : 'მოვლენა წინ, წელი ზურგზე'}</td><td>${d.cards.length}</td><td>${no(`${d.id}1`)}–${no(`${d.id}2`)}</td></tr>`).join('')}
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no(`${DECKS[0].id}1`)}–${no(`${TSIRVA.id}2`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით. ყოველი მოვლენის ზურგზე მისი წელია.</li>
        <li>ყველა დასტა არ გინდათ? დაბეჭდეთ მხოლოდ საჭირო ფურცლები — ყოველი ფერი ორ ფურცელზეა.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ცნობილი ბარათების თამაშის — „Timeline“-ის — იდეით. მწერლებისა და მგალობლების წლები საგანძურის სკოლის აპის მონაცემებიდანაა, წირვის რიგი — აპის წირვის საგალობლებიდან; ისტორიისა და კულტურის ბარათები Claude-მა დაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

// ---------- the rules, with a small line drawn: three cards on the table and one in hand ----------
const LINE_EX = ['h5', 'h18', 'h25'].map(cid => DECKS[0].cards.find(c => c.id === cid));
const HAND_EX = DECKS[0].cards.find(c => c.id === 'h14');
const lineDrawing = `<div class="kz-line box">
  <div class="kz-lineHand"><div class="kz-mini">${cardFront(HAND_EX)}</div><span>სად ჩაჯდება?</span></div>
  <div class="kz-lineRow">
    <i class="kz-gap">?</i>
    ${LINE_EX.map(c => `<div class="kz-mini">${cardBack(c)}</div><i class="kz-gap${c.id === 'h5' ? ' on' : ''}">${c.id === 'h5' ? '✓' : '?'}</i>`).join('')}
  </div>
  <p>ხაზში სამი ბარათია: 1121, 1795, 1918. ხელში — „${esc(HAND_EX.text)}“. სწორი ადგილი 1121-სა და 1795-ს შორისაა (${esc(HAND_EX.label)}).</p>
</div>`;

const rulesOf = no => [
  ['რა გჭირდებათ', 'ბარათები და მაგიდა. ტელეფონი არ გჭირდებათ.'],
  ['დასტა', `აირჩიეთ ერთი ფერი — ${EVENTS.map(d => `„${d.label}“`).join(', ')} — ან სამივე ერთად. „${TSIRVA.label}“ ცალკე თამაშდება. ბარათები აურიეთ ისე, რომ ზურგი არავინ ნახოს.`],
  ['დარიგება', `თითოეულს ${HAND} ბარათი — მოვლენით ზემოთ, საკუთარ წინ მაგიდაზე. ერთი ბარათი დასტიდან წლით ზემოთ შუაში დადეთ: ეს ხაზის დასაწყისია. დანარჩენი დასტაა.`],
  ['სვლა', 'რიგრიგობით, საათის ისრის მიმართულებით. შენი ბარათებიდან ერთი აირჩიე და ხაზში ჩასვი — პირველის წინ, ბოლოს ან ორ ბარათს შორის: მარცხნივ ადრეა, მარჯვნივ გვიან. მერე გადააბრუნე.'],
  ['სწორია', 'წელი თავის ადგილას ჯდება — ბარათი ხაზში რჩება, წლით ზემოთ. ერთნაირი წელი ორივე მხარეს ითვლება.'],
  ['შეცდომაა', 'ბარათი თავის სწორ ადგილას გადადე — ხაზი ყოველთვის სწორი რჩება და ყველა სწავლობს. შენ კი დასტიდან ახალი ბარათი აიღე.'],
  ['მოგება', 'ვინც ბარათებს პირველი მორჩება, იგებს — მაგრამ წრე ბოლომდე მიდის, რომ ყველას თანაბარი სვლა ჰქონდეს. ერთ წრეში რამდენიმემ მორჩა? თითოეული ერთ ბარათს იღებს და კიდევ ერთი წრე. დასტა ამოიწურა — იგებს, ვისაც ნაკლები ბარათი დარჩა.'],
  [TSIRVA.label, 'იგივე წესით, ოღონდ ზურგზე წლის ნაცვლად წირვის ნაწილის რიგითი ნომერია: № 1 — წირვის დასაწყისი, № 18 — დასასრული. მარცხნივ — რაც წირვაში უფრო ადრე ისმის.'],
  ['მთელი კლასი', '2–6 გუნდი. მასწავლებელი დასტას თვითონ იჭერს და ბარათს ხმამაღლა კითხულობს, გუნდი თათბირობს და ამბობს, სად ჩაჯდება. სწორია — გუნდს ქულა; შეცდომაა — ბარათი თავის ადგილას. ჯერი ყოველთვის გადადის. მიზანი — 5, 7 ან 10 ქულა; წრე ბოლომდე მიდის.'],
  ['ადვილი და რთული', `პატარებთან — ${HAND - 1} ბარათი ხელში და ხაზის დასაწყისად ორი ბარათი. უფროსებთან — ${HAND + 1} ბარათი და სამივე ფერი ერთად.`],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 8 წლიდან · 15–25 წუთი</div></div>
  <p class="lead">„დროის ხაზი“ ბარათების თამაშია: ყოველ ბარათზე მოვლენაა — ბრძოლა, წიგნი, ფილმი, ვიღაცის დაბადება, — ზურგზე კი მისი წელი. ხაზს ერთად აწყობთ, ყოველი ბარათი თავის ადგილას, და თან ისტორიას სწავლობთ.</p>
  ${lineDrawing}
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="kz-more box"><b>აპშიც</b> იგივე თამაშია: ყოველდღე ერთი ხაზი მთელი სკოლისთვის, უსასრულო თამაში სამი სიცოცხლით და გუნდები ერთ ეკრანზე, დასტაში კი უფრო მეტი ბარათია — sagandzureli.ge → თამაშები → დროის ხაზი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// a card's back holds a year, the event and a note: a long note gets smaller letters until it fits; one that still does not
// stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.kz-in').forEach((el, i) => {
    const note = el.querySelector('.kz-note');
    let size = 8.8;
    while (el.scrollHeight > el.clientHeight + 1 && note && size > 7.4) { size -= 0.2; note.style.fontSize = size.toFixed(1) + 'pt'; }
    if (el.scrollHeight > el.clientHeight + 1) bad.push((el.querySelector('.kz-y, .kz-t') || el).textContent.trim().slice(0, 40));
  });
  if (bad.length) throw new Error('drois-khazi: a card is too full — ' + bad.join(' · '));
})()`;

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10.6pt;line-height:1.38}
.rulesP .rules li{margin-bottom:.9mm}
.rulesP .lead{font-size:10.8pt}
.cover .lead{margin-bottom:5mm}
.kz-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:9.5mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10pt;padding:0 2mm;white-space:nowrap}
.kz-band.out{background:#fff;border:.35mm solid}
.kz-in{position:absolute;left:5.4mm;right:5.4mm;top:15.4mm;bottom:5.2mm;display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden}
.kz-in.b{padding-top:3.4mm}
.kz-mark{margin-top:auto;margin-bottom:3mm;opacity:.3}
.kz-pic{flex:none;width:20mm;height:20mm;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1.2mm}
.kz-t{flex:1;display:flex;align-items:center;justify-content:center;padding:1.6mm 0}
.kz-t p{margin:0;font-weight:700;font-size:12.6pt;line-height:1.28;color:var(--brown)}
.kz-t.l p{font-size:11.2pt}
.kz-t.xl p{font-size:10.2pt}
.kz-hid{flex:none;width:100%;height:10.5mm;border:.4mm dashed;border-radius:1.8mm;display:flex;align-items:center;justify-content:center;gap:2mm;font-size:9.6pt;font-weight:700;background:#fff}
.kz-hid b{font-size:17pt;line-height:1}
.kz-hid .kz-turn{font-weight:400;color:var(--muted);font-size:8.6pt}
.kz-y{flex:none;font-weight:800;font-size:31pt;line-height:1;margin:2.2mm 0 2.8mm;letter-spacing:.01em}
.kz-y.l{font-size:23pt;margin:3.6mm 0 3.6mm}
.kz-bt{flex:none;font-weight:700;font-size:10.6pt;line-height:1.28;color:var(--brown)}
.kz-note{flex:none;margin-top:auto;padding-top:2.2mm;border-top:.3mm solid var(--gold);font-size:8.8pt;line-height:1.3;color:#6f6152}
.kz-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.kz-exCards{display:flex;gap:3mm}
.kz-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.kz-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.kz-exR h3{margin:0 0 3mm}
.kz-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.kz-step svg{flex:none;margin-top:.2mm}
.kz-decks{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.kz-deck{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.4mm .5mm .6mm;font-size:9.4pt;white-space:nowrap}
.kz-deck i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.kz-line{margin:0 0 3.4mm;padding:3mm 4mm;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;gap:1.6mm 5mm;align-items:center}
.kz-lineHand{grid-row:1/3;display:flex;flex-direction:column;align-items:center;gap:1.4mm;font-size:9pt;font-weight:700;color:var(--wine)}
.kz-lineRow{display:flex;align-items:center;gap:1.6mm}
.kz-mini{position:relative;width:25.2mm;height:35.2mm;border-radius:1.2mm;overflow:hidden;box-shadow:0 .4mm 1.4mm rgba(74,52,38,.25);flex:none}
.kz-mini>.card{position:absolute;left:0;top:0;transform:scale(.4);transform-origin:0 0}
.kz-gap{width:7mm;height:30mm;border:.35mm dashed #c9a24a;border-radius:1.4mm;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;color:#c9a24a;font-size:11pt;flex:none}
.kz-gap.on{border-style:solid;border-color:#2f7d4f;color:#2f7d4f;background:#eef7f0}
.kz-line p{margin:0;font-size:9.4pt;line-height:1.35;color:var(--brown)}
.kz-more{margin-top:3mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [{ key: 'cover' }, ...cardSheets];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
