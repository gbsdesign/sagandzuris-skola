// „ოთხეული“ on paper — the „უტელეფონო“ variant of the app's Connections-like game (plan doc): 16 grids of 16 cards (one
// A4 sheet each, 47×66 mm cards, the grid's number on every back), the host's answer sheet and the rules. The grids are the
// app's own `buildGrid` over `data/otkheuliGroups.ts` with fixed seeds, kept only when the 16 words split into four groups
// in exactly one way (counted over every group of the list) and when they keep the set varied (rules in `pickGrids`).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { OTKHEULI_GROUPS: GROUPS, buildGrid, mulberry32 } = await appData({
  'data/otkheuliGroups.ts': ['OTKHEULI_GROUPS'],
  'utils/otkheuli.ts': ['buildGrid', 'mulberry32'],
});

export const id = 'otkheuli';
export const title = 'ოთხეული';
const TAG = 'ქართული · უტელეფონო';
const META = '2–8 მოთამაშე ან მთელი კლასი · 10 წლიდან · 10–15 წუთი';
const N = 16;
// the app's group colours and their text colours, by the group's place in the grid (OtkheuliGame's TONE)
const TONE = [['#f6d66e', '#4a3a10'], ['#a8d48c', '#1f3d1a'], ['#a6c8ea', '#102a43'], ['#cfa6d4', '#3a1536']];

// ---------- the grids ----------
const combos4 = a => {
  const out = [];
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) for (let k = j + 1; k < a.length; k++) for (let l = k + 1; l < a.length; l++) out.push([a[i], a[j], a[k], a[l]]);
  return out;
};
/** In how many ways the 16 words split into four groups of four, any group of the list counting (not only the grid's). */
const splits = tiles => {
  const have = new Set(tiles);
  const sets = new Map();
  for (const g of GROUPS) for (const c of combos4(g.words.filter(w => have.has(w)))) sets.set([...c].sort().join('|'), c);
  const list = [...sets.values()], used = new Set();
  let n = 0;
  const walk = () => {
    if (used.size === tiles.length) { n++; return; }
    const first = tiles.find(t => !used.has(t));
    for (const c of list) if (c.includes(first) && c.every(w => !used.has(w))) { c.forEach(w => used.add(w)); walk(); c.forEach(w => used.delete(w)); }
  };
  walk();
  return n;
};

/** The first seeds whose grid has one answer and keeps the set varied: a group of < 8 words once, a bigger one twice at most
 * (sharing ≤ 1 word with its first use), two grids share one group at most, ≤ 4 grids with a region's songs and ≤ 2 with a
 * service's chants. The plain grids come first, those with songs or chants last. */
const pickGrids = () => {
  const size = Object.fromEntries(GROUPS.map(g => [g.id, g.words.length]));
  const FAMILY_MAX = { songs: 4, chants: 2 };
  const uses = new Map(), family = {}, out = [];
  for (let seed = 1; out.length < N && seed < 100000; seed++) {
    const g = buildGrid(GROUPS, mulberry32(seed));
    if (!g) continue;
    if (g.groups.some(x => {
      const prev = uses.get(x.id);
      return prev && (size[x.id] < 8 || prev.length >= 2 || prev.some(p => p.filter(w => x.words.includes(w)).length > 1));
    })) continue;
    if (out.some(o => o.groups.filter(x => g.groups.some(y => y.id === x.id)).length > 1)) continue;
    const fams = g.groups.map(x => x.family).filter(Boolean);
    if (fams.some(f => (family[f] ?? 0) >= (FAMILY_MAX[f] ?? Infinity))) continue;
    if (splits(g.tiles) !== 1) continue;
    fams.forEach(f => { family[f] = (family[f] ?? 0) + 1; });
    g.groups.forEach(x => uses.set(x.id, [...(uses.get(x.id) ?? []), x.words]));
    out.push({ seed, ...g });
  }
  if (out.length < N) throw new Error(`only ${out.length} grids with one answer`);
  const tuned = o => o.groups.some(x => x.family);
  return [...out.filter(o => !tuned(o)), ...out.filter(tuned)];
};
const GRIDS = pickGrids();

// ---------- cards: 4×4 a sheet, 47.25×66 mm; the back carries the grid's number ----------
/** A long name of two or more words goes on two lines, split at the space nearest its middle. */
const lines = w => {
  if (!w.includes(' ') || [...w].length <= 9) return [w];
  const spaces = [...w.matchAll(/ /g)].map(m => m.index);
  const at = spaces.reduce((a, b) => (Math.abs(b - w.length / 2) < Math.abs(a - w.length / 2) ? b : a));
  return [w.slice(0, at), w.slice(at + 1)];
};
const cardFront = (w, no) => {
  const ls = lines(w);
  return `<div class="ot-card"><div class="ot-top">${quad(1.8, .5)}</div><div class="ot-word${ls.length > 1 ? ' two' : ''}">${ls.map(l => `<div class="fit"><span>${esc(l)}</span></div>`).join('')}</div>
<div class="ot-no">${icon('grid-2x2', { size: 2.8, color: C.goldDark, width: 2.2 })}<span>${no}</span></div></div>`;
};
const quad = (size, gap) => `<div class="ot-quad" style="grid-template-columns:${size}mm ${size}mm;gap:${gap}mm">${TONE.map(([bg]) => `<i style="width:${size}mm;height:${size}mm;background:${bg}"></i>`).join('')}</div>`;
const cardBack = no => `<div class="ot-card back">${quad(7.5, 1.2)}<div class="ot-big">${no}</div><div class="ot-name">${title}</div></div>`;
const CARD = { cols: 4, rows: 4, w: 189 / 4, h: 66 };
const gridSheets = GRIDS.map((g, i) => ({
  key: `grid${i + 1}`,
  front: gridSheet(g.tiles.map(w => cardFront(w, i + 1)), { ...CARD, label: `${title} · ბადე №${i + 1} — წინა მხარე` }),
  back: gridSheet(Array(16).fill(cardBack(i + 1)), { ...CARD, back: true, label: `${title} · ბადე №${i + 1} — ზურგი` }),
}));

// ---------- the host's answers: eight grids a side ----------
const keyBlock = (g, i) => `<div class="ot-key"><div class="ot-kh"><b>ბადე №${i + 1}</b></div>
${g.groups.map((x, k) => `<div class="ot-kr" style="background:${TONE[k][0]};color:${TONE[k][1]}"><b>${esc(x.label)}</b><span>${x.words.map(esc).join(' · ')}</span></div>`).join('')}</div>`;
const keyPage = (from, side) => page(`<div class="ot-keyHead"><span class="aso">${aso(title)}</span><b>პასუხები</b><span>მხოლოდ წამყვანისთვის · ბადეები ${from + 1}–${from + 8} · ${side}</span></div>
<div class="ot-keys">${GRIDS.slice(from, from + 8).map((g, k) => keyBlock(g, from + k)).join('')}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · პასუხები</div>`, 'ot-keyP');

// ---------- the cover with a made-up example (none of the set's groups) and the rules ----------
const EXAMPLE = {
  solved: [['ფერები', ['წითელი', 'ლურჯი', 'ყვითელი', 'იისფერი']], ['ტყის ცხოველები', ['ირემი', 'მგელი', 'დათვი', 'მელა']]],
  left: ['მუხა', 'არწივი', 'ნაძვი', 'მტრედი', 'მერცხალი', 'წიფელი', 'შევარდენი', 'ცაცხვი'],
};
const miniCard = w => `<span class="ot-mini">${esc(w)}</span>`;

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">თექვსმეტი ბარათი, ოთხი ფარული ჯგუფი. რა აერთიანებს ამ სიტყვებს — მთები, ხმები გალობაში, ჩოხის ნაწილები? იპოვეთ ოთხივე ოთხეული, სანამ ოთხჯერ შეცდებით.<br><b>${META}</b></div>
  <div class="ot-ex box">
    <div class="ot-exBoard">
      ${EXAMPLE.solved.map(([label, words], k) => `<div class="ot-exRow"><span class="ot-tag" style="background:${TONE[k][0]};color:${TONE[k][1]}">${esc(label)}</span>${words.map(miniCard).join('')}</div>`).join('')}
      <div class="ot-exLeft">${EXAMPLE.left.map(miniCard).join('')}</div>
    </div>
    <div class="ot-exR">
      <p><b>ნიმუში.</b> ორი ოთხეული უკვე ნაპოვნია და გვერდზე დევს. დარჩენილ რვა ბარათში კიდევ ორი იმალება — ხედავ?</p>
      <p class="small">(ფრინველები და ხეები. ეს ნიმუში ბადეებში არ არის.)</p>
      <p>ყოველ ჯერზე ოთხი ბარათი გამოსწიეთ და თქვით: „ეს ოთხია!“ წამყვანი პასუხს ფურცელზე ამოწმებს.</p>
    </div>
  </div>
  <h3 class="ot-h3">რა არის ამ ფაილში</h3>
  <table class="t comp">
    <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ქაღალდი</th><th>ბეჭდვა · ჭრა</th></tr>
    <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>პასუხების ფურცელი (მხოლოდ წამყვანს)</td><td>1</td><td>${no('key')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ბადეები — 16 ბარათი თითოში, 47×66 მმ</td><td>${N} × 16</td><td>${no('grid1')}–${no(`grid${N}`)}</td><td>300 გ მუყაო</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>შეცდომის ნიშნები: კენჭი, ღილი ან მონეტა</td><td>4</td><td>—</td><td>საკუთარი</td><td><span class="chk"></span></td></tr>
  </table>
  <div class="two">
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული).</li>
        <li>ყველა ბადე ერთად არ გჭირდებათ: ფურცლები 1–${no('key')} და რამდენი ბადეც გინდათ — ბადე ერთი ფურცელია. პირველი ბადეები უფრო მარტივია, ბოლოში — სიმღერებითა და საგალობლებით.</li>
        <li>ბადეები 300 გ მუყაოზე; ჭრა კიდეებზე მონიშნული ხაზებით — 16 ბარათი.</li>
        <li>ყოველი ბადე ცალკე კონვერტში ან რეზინით. აირია? ბარათის ზურგზე და ქვემოთ ბადის ნომერი წერია.</li>
      </ol>
    </div>
    <div>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Connections“-ის (The New York Times, 2023) იდეით; ჯგუფები და სიტყვები საგანძურის სკოლის აპიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">აპში ყოველდღე ახალი ბადეა: sagandzureli.ge → თამაშები → ოთხეული.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['მიზანი', '16 ბარათი ოთხ ფარულ ჯგუფად იყოფა — ოთხ-ოთხი სიტყვა, რომლებსაც რაღაც აერთიანებს. იპოვეთ ოთხივე ჯგუფი, სანამ ოთხ შეცდომას დაუშვებთ.'],
  ['მომზადება', 'აირჩიეთ ბადე — მისი ნომერი ყოველი ბარათის ზურგზე წერია. წამყვანი (მასწავლებელი ან ერთი მოთამაშე) იღებს პასუხების ფურცელს და არავის აჩვენებს. ბარათებს ურევს და მაგიდაზე დებს 4×4, სიტყვით ზემოთ. გვერდით ოთხი კენჭი — ეს თქვენი ოთხი შეცდომაა.'],
  ['სვლა', 'მოთამაშეები თათბირობენ, ირჩევენ ოთხ ბარათს, რომლებიც, მათი აზრით, ერთ ჯგუფს ეკუთვნის, წინ გამოსწევენ და ამბობენ: „ეს ოთხია!“'],
  ['პასუხი', 'წამყვანი პასუხების ფურცელზე ამოწმებს. <b>სწორია</b> — ჯგუფის სახელს ამბობს (მაგ., „მთები“), ბარათები გვერდზე ერთ რიგად იდება. <b>სამი სწორია</b> — ამბობს „ერთი აკლია!“, ოღონდ არ ამბობს, რომელი; ეს შეცდომაა. <b>სხვა შემთხვევაში</b> — „არა“, და ესეც შეცდომაა.'],
  ['შეცდომები', 'ყოველ შეცდომაზე ერთი კენჭი გადადით. ოთხივე გადავიდა — თამაში დამთავრდა, წამყვანი დარჩენილ ჯგუფებს აჩვენებს. უკვე ნათქვამი ოთხეულის გამეორება შეცდომად არ ითვლება — წამყვანი იტყვის: „ეს უკვე სცადეთ“.'],
  ['ხაფანგი', 'ზოგი სიტყვა თითქოს ორ ჯგუფს ერგება — „ალავერდი“ ტაძარიცაა და სუფრის სიტყვაც. მაგრამ ყოველი ბარათი ზუსტად ერთ ჯგუფს ეკუთვნის და ყოველ ბადეს ერთადერთი სწორი პასუხი აქვს. დაიწყეთ იმით, რაშიც ყველაზე დარწმუნებული ხართ.'],
  ['მოგება', 'ოთხივე ჯგუფი იპოვეთ — მოიგეთ. რაც ნაკლები კენჭი გადავიდა, მით უკეთ ითამაშეთ: 0 შეცდომა — ოსტატობაა!'],
  ['გუნდებად', 'ორი გუნდი, ერთი ბადე. გუნდები რიგრიგობით ასახელებენ თითო ოთხეულს (თათბირს — 1 წუთი). სწორია — გუნდი ოთხ ბარათს თავისთან იღებს. შეცდომები ცალ-ცალკე ითვლება: თითო გუნდს ოთხი კენჭი აქვს, ოთხივე დაკარგა — ამ ბადეში აღარ სვამს. ბოლო ოთხეული არავის ეკუთვნის. იგებს, ვისაც მეტი ჯგუფი აქვს; თანაბრად — ვისაც ნაკლები შეცდომა.'],
  ['მარტო', 'პასუხების ფურცელი დაკეცე. ოთხივე ჯგუფი დააწყვე და მხოლოდ მერე შეამოწმე — რამდენი გამოიცანი?'],
  ['აპშიც', 'იგივე თამაში საგანძურის სკოლის აპშია: ყოველდღე ერთი ბადე მთელი სკოლისთვის და რამდენიც გინდა — დამატებით.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ოთხეული“ დაკვირვების თამაშია: მაგიდაზე თექვსმეტი სიტყვაა, მათში კი ოთხი ჯგუფი იმალება. ზოგი ჯგუფი ერთი შეხედვით ჩანს, ზოგი — მხოლოდ მაშინ, როცა დანარჩენებს გადადებთ.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="ot-more box"><b>წამყვანს:</b> პასუხების ფურცელზე ყოველი ბადის ოთხივე ჯგუფი ფერითაა — ყვითელი, მწვანე, ცისფერი, იისფერი. ფერი მხოლოდ შენთვისაა, სირთულეს არ ნიშნავს. ბადის ნომერი ბარათების ზურგზეა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:5mm}
.ot-h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{margin-bottom:1mm}
.cover .two{margin-top:5mm}
.ot-ex{display:grid;grid-template-columns:auto 1fr;gap:7mm;align-items:center;margin:0 0 6mm;padding:4mm 5mm}
.ot-exRow{display:flex;align-items:center;gap:1.2mm;margin-bottom:1.6mm}
.ot-tag{width:23mm;font-size:8.2pt;font-weight:700;text-align:center;padding:1mm .6mm;border-radius:1.2mm;line-height:1.15}
.ot-exLeft{display:grid;grid-template-columns:repeat(4,18.5mm);gap:1.2mm;margin:3mm 0 0 24.2mm}
.ot-mini{width:18.5mm;height:11mm;display:flex;align-items:center;justify-content:center;background:var(--paper);border:.3mm solid var(--wine);border-radius:1.2mm;font-size:8.2pt;font-weight:700;color:var(--wine);white-space:nowrap}
.ot-exR p{margin:0 0 2mm;font-size:9.8pt;line-height:1.35}
.ot-card{position:absolute;inset:0;background:var(--paper);display:flex;flex-direction:column;align-items:center;justify-content:center}
.ot-card::before{content:'';position:absolute;inset:1.8mm;border:.45mm solid var(--wine);border-radius:2.2mm}
.ot-card::after{content:'';position:absolute;inset:2.9mm;border:.2mm solid var(--gold);border-radius:1.5mm}
.ot-word{width:38mm;color:var(--wine);font-weight:800;font-size:16pt;line-height:1.2;margin-top:-3mm}
.ot-word.two{font-size:14pt}
.ot-word .fit{text-align:center}
.ot-no{position:absolute;left:0;right:0;bottom:5.2mm;display:flex;align-items:center;justify-content:center;gap:1mm;font-size:8pt;font-weight:700;color:var(--gold2)}
.ot-card.back{background:var(--wine)}
.ot-card.back::before{border-color:var(--gold);border-width:.3mm}
.ot-card.back::after{display:none}
.ot-quad{display:grid}
.ot-top{position:absolute;top:5.4mm;left:0;right:0;display:flex;justify-content:center}
.ot-quad i{display:block;border-radius:1.2mm}
.ot-big{font-family:'SansKa',sans-serif;font-weight:900;font-size:22pt;color:#f0d9a0;line-height:1;margin-top:3.5mm}
.ot-name{margin-top:1.5mm;font-size:9pt;color:var(--paper);letter-spacing:.06em}
.ot-keyP{padding:12mm 12mm 0}
.ot-keyHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm;margin-bottom:4mm}
.ot-keyHead .aso{font-size:15pt;color:var(--wine)}
.ot-keyHead b{font-size:14pt;color:var(--wine)}
.ot-keyHead span:last-child{margin-left:auto;font-size:9pt;color:var(--muted)}
.ot-keys{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:4mm 6mm;height:252mm}
.ot-key{border:.3mm solid var(--line);border-radius:2mm;padding:2.4mm 3mm;display:flex;flex-direction:column;gap:1.2mm;background:#fff}
.ot-kh{display:flex;align-items:baseline;justify-content:space-between;gap:2mm}
.ot-kh b{font-size:12pt;color:var(--wine)}
.ot-kh span{font-size:7.8pt;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ot-kr{flex:1;border-radius:1.4mm;padding:1mm 2.2mm;display:flex;flex-direction:column;justify-content:center;line-height:1.2}
.ot-kr b{font-size:9.6pt}
.ot-kr span{font-size:9pt}
.ot-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'key', front: keyPage(0, 'წინა მხარე'), back: keyPage(8, 'ზურგი') },
  ...gridSheets,
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
