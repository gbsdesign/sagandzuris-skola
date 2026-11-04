// „გააგრძელე!“ on paper — the სამაგიდო variant of the app's lyrics game (2026-11-01): no phone, the class sings. The host's
// book holds thirty well-known folk songs' words (the songs recorded most in the app, a few a region), line by line from the
// app's own texts (data/lyricsPool.ts); a ✋ marks where the host may stop the singing — a line sung once after a line sung
// once (utils/gagrdzele.ts `cutsOf`), so the next one is sure. Everyone sings together, the host raises a hand, the team in
// turn goes on with the next line: exact 2, nearly 1; else the next team may try for 1. The kit: the book, the score sheet,
// the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.js';
import * as __d0 from '../../data/lyricsPool';
import * as __d1 from '../../data/songsData';
import * as __d2 from '../../utils/gagrdzele';

const { LYRICS_POOL, FOLK_SONGS, FOLK_REGIONS, cutsOf } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'gagrdzele';
export const title = 'გააგრძელე!';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი · 8 წლიდან · 20–30 წუთი';
const ROUNDS = 12;
const SONGS_N = 30;
const PER_REGION = 4;
/** a song for the book: not longer than this (the host follows it while singing) */
const MAX_LINES = 20;
/** the marks a song shows at most, spread over it */
const MARKS = 3;

// ---------- the songs: recorded most first (twenty lines at most), a few a region, then by title ----------
const byId = new Map(FOLK_SONGS.map(s => [s.id, s]));
const regionName = id => FOLK_REGIONS.find(r => r.id === id)?.nameGe ?? ({ lazeti: 'ლაზეთი', oseti: 'ოსეთი' })[id] ?? '';
const takesOf = s => s.versions.length + (s.recs?.length ?? 0) + (s.centre?.length ?? 0);
const ranked = LYRICS_POOL.map(p => ({ ...p, song: byId.get(p.id) })).filter(p => p.song && !p.song.ownerOnly && p.lines.length <= MAX_LINES)
  .sort((a, b) => takesOf(b.song) - takesOf(a.song) || a.song.title.localeCompare(b.song.title, 'ka'));
const perRegion = new Map();
const chosen = [];
for (const p of ranked) {
  if (chosen.length >= SONGS_N) break;
  const n = perRegion.get(p.song.region) ?? 0;
  if (n >= PER_REGION) continue;
  perRegion.set(p.song.region, n + 1);
  chosen.push(p);
}
const BASE = chosen.sort((a, b) => a.song.title.trim().localeCompare(b.song.title.trim(), 'ka')).map(p => {
  const { cuts } = cutsOf(p.lines);
  const marks = cuts.length <= MARKS ? cuts : Array.from({ length: MARKS }, (_, k) => cuts[Math.round((k * (cuts.length - 1)) / (MARKS - 1))]);
  return { id: p.id, title: p.song.title.trim(), where: regionName(p.song.region), lines: p.lines, marks: new Set(marks) };
});

// ---------- the host's book: two columns a page, a song never split ----------
/** a song's height in the column, in mm, as measured in the print: the head (a long title takes two rows), a row a line (a
 *  line over 43 letters takes two), the gap under it */
const heightOf = s => (s.title.length > 30 ? 14 : 9.6) + s.lines.reduce((h, l) => h + (l.length > 43 ? 8.4 : 4.4), 0) + 3.5;
const COLUMN = 256;
// each song into the first column with room for it (the titles' order kept where it fits), numbered as they stand
const columns = [];
for (const s of BASE) {
  const h = heightOf(s);
  let col = columns.find(c => c.used + h <= COLUMN);
  if (!col) { col = { used: 0, songs: [] }; columns.push(col); }
  col.songs.push(s);
  col.used += h;
}
const pagesOfSongs = [];
for (let i = 0; i < columns.length; i += 2) pagesOfSongs.push(columns.slice(i, i + 2).map(c => c.songs));
const SONGS = pagesOfSongs.flat(2).map((s, i) => Object.assign(s, { no: i + 1 }));

const songBox = s => `<div class="gg-song">
  <div class="gg-head"><span class="gg-no">${s.no}</span><div class="gg-t"><b>${esc(s.title)}</b><span>${esc(s.where)}</span></div></div>
  <ol class="gg-lines">${s.lines.map((l, i) => `<li${s.marks.has(i) ? ' class="m"' : ''}>${s.marks.has(i) ? icon('hand', { size: 3.6, color: C.goldDark, width: 2.2 }) : ''}<span>${esc(l)}</span></li>`).join('')}</ol>
</div>`;

const bookPage = p => {
  const cols = pagesOfSongs[p];
  const songs = cols.flat();
  return page(`<div class="gg-mHead"><span class="aso">${aso(title)}</span><b>სიმღერები ${songs[0].no}–${songs.at(-1).no}</b><span class="gg-secret">${icon('eye-off', { size: 4.2, color: C.wine, width: 2 })} წამყვანისთვის</span></div>
<div class="gg-cols">${cols.map(c => `<div class="gg-col">${c.map(songBox).join('')}</div>`).join('')}</div>
<div class="gg-legend">${icon('hand', { size: 4, color: C.goldDark, width: 2.2 })}<span>აქ შეაჩერე: ხელი ასწიე, როცა წინა სტრიქონი დამთავრდება. ამ სტრიქონს რიგითი გუნდი აგრძელებს.</span></div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · სიმღერების ტექსტები წამყვანისთვის</div>`, 'gg-bP');
};

// ---------- the score sheet ----------
const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'სიმღერა №',
  hint: 'გუნდის სახელი სვეტის თავში. რიგით გუნდს: ზუსტად — 2 ქულა, თითქმის (ერთი-ორი სიტყვა სხვაა) — 1. ვერ გააგრძელა — შემდეგ გუნდს შეუძლია სცადოს 1 ქულაზე.',
  remind: [
    ['music', 'ერთად', 'ყველა ერთად მღერის სიმღერის დასაწყისიდან.'],
    ['hand', 'ხელი', 'წამყვანი ✋ ნიშანთან ჩერდება და ხელს სწევს.', C.goldDark],
    ['check', 'ქულა', 'რიგით გუნდს: ზუსტად 2, თითქმის 1; „მოპარვა“ — 1.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი სიმღერა.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = SONGS.find(s => s.lines.length >= 6 && s.lines.length <= 9 && s.lines.every(l => l.length <= 38)) ?? SONGS[0];
const exBox = { ...EX, lines: EX.lines.slice(0, 7) };
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ხალხური სიმღერის ტექსტის თამაში: ყველა ერთად მღერის, წამყვანი უეცრად აჩერებს — და რიგითმა გუნდმა შემდეგი სტრიქონი უნდა გააგრძელოს. ტელეფონი არ სჭირდება; წამყვანს ამ ფაილის სიმღერების წიგნი უჭირავს.<br><b>${META}</b></div>
  <div class="gg-ex box">
    <div class="gg-exSong">${songBox(exBox)}</div>
    <div class="gg-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ასახელებს სიმღერას და ყველა ერთად იწყებს მღერას თავიდან.')}
      ${step('hand', '✋ ნიშანთან წამყვანი ხელს სწევს — ყველა ჩუმდება.', C.goldDark)}
      ${step('mic-vocal', 'რიგითი გუნდი შემდეგ სტრიქონს მღერის (ან ამბობს).')}
      ${step('check', 'ზუსტად — 2 ქულა, თითქმის — 1. ვერ თქვა — შემდეგი გუნდი ცდის 1 ქულაზე.', '#2f7d4f')}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სიმღერების ტექსტები, წამყვანისთვის</td><td>${SONGS.length}</td><td>${no('book1')}–${no(`book${Math.ceil(pagesOfSongs.length / 2)}`)}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>ფანქარი წამყვანს</td><td>1</td><td>საკუთარი</td></tr>
      </table>
      <p class="gg-mix">${SONGS.length} ხალხური სიმღერა ${new Set(SONGS.map(s => s.where)).size} კუთხიდან — ისინი, რომლებიც აპში ყველაზე მეტჯერაა ჩაწერილი.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>სიმღერების წიგნი (${no('book1')}–${no(`book${Math.ceil(pagesOfSongs.length / 2)}`)}) — წამყვანს.</li>
        <li>ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია სატელევიზიო შოუს „Don't Forget the Lyrics!“ იდეით. ტექსტები საგანძურის სკოლის აპის სიმღერების გვერდებიდანაა; ხალხურ სიმღერას სოფლიდან სოფლამდე სხვა სიტყვებიც აქვს. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. გუნდები წრეში სხდებიან — ასე მიდის რიგიც.`],
  ['წამყვანი', 'მასწავლებელი ან ვინც სიმღერებს კარგად იცნობს, — ის არ თამაშობს. სიმღერების წიგნი მასთანაა, ქულებს ის წერს.'],
  ['რაუნდი', `წამყვანი ირჩევს სიმღერას (რიგით ან როგორც უნდა), ასახელებს და ქულების ფურცელზე მის ნომერს ინიშნავს. ${ROUNDS} რაუნდი დაახლოებით 25 წუთია.`],
  ['ერთად', 'ყველა ერთად იწყებს სიმღერას თავიდან — ვინც ტექსტი იცის, მღერის, დანარჩენები ჰანგს მიჰყვებიან. წამყვანი წიგნში მიჰყვება.'],
  ['ხელი', '✋ ნიშანი სტრიქონთან ნიშნავს: ამ სტრიქონის წინ შეაჩერე. როცა წინა სტრიქონი დამთავრდება, წამყვანი ხელს სწევს და ყველა ჩუმდება. რომელ ნიშანთან გაჩერდება — წამყვანი წყვეტს (პირველი ადვილია, ბოლო — ძნელი).'],
  ['გააგრძელე', 'რიგითი გუნდი შემდეგ სტრიქონს მღერის ან ამბობს — ხუთამდე თვლის დროში. გუნდიდან ერთიც საკმარისია, ერთადაც შეიძლება.'],
  ['ქულა', 'ზუსტად — 2 ქულა; თითქმის (ერთი-ორი სიტყვა სხვაა, აზრი იგივეა) — 1. ვერ გააგრძელა — შემდეგ გუნდს შეუძლია სცადოს 1 ქულაზე („მოპარვა“), ერთხელ.'],
  ['სხვა ვარიანტი', 'ხალხურ სიმღერას ბევრი ვარიანტი აქვს. თუ გუნდმა სხვა ცნობილი სიტყვებით იმღერა, რომელიც ამ ადგილზე მღერიან, — წამყვანს შეუძლია ჩათვალოს.'],
  ['შემდეგ', 'პასუხის მერე წამყვანი სწორ სტრიქონს კითხულობს და ყველა ერთად აგრძელებს შემდეგ ნიშნამდე ან ბოლომდე. მომდევნო რაუნდში რიგი შემდეგ გუნდზე გადადის.'],
  ['მოგება', 'ბოლო რაუნდის მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი სიმღერა.'],
  ['უფრო მარტივად', 'პატარებთან წამყვანი შეიძლება შემდეგი სტრიქონის პირველ სიტყვას კარნახობდეს, ან ორ ვარიანტს სთავაზობდეს.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„გააგრძელე!“ სიმღერის ტექსტის ცოდნის თამაშია: სუფრაზე სიმღერის ტექსტის ცოდნა ქართველობის ნაწილია, ეს თამაში კი ბევრ ტექსტს თამაშ-თამაშით ასწავლის. აპში ჩანაწერი უკრავს და ჩერდება, შემდეგ სტრიქონს კი ოთხიდან ირჩევ; აქ მთელი კლასი მღერის.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: მარტო (ათი სიმღერა ზედიზედ), კლასთან ერთად ონლაინ ან ერთი ტელეფონით — sagandzureli.ge → თამაშები → გააგრძელე!</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.gg-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.gg-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.gg-mHead b{font-size:13pt;color:var(--wine)}
.gg-secret{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.gg-cols{position:absolute;left:10mm;right:10mm;top:19mm;bottom:21mm;display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.gg-col{display:flex;flex-direction:column;gap:3.5mm;min-width:0}
.gg-song{break-inside:avoid}
.gg-head{display:flex;gap:2.2mm;align-items:flex-start;margin-bottom:1.4mm}
.gg-no{flex:none;width:6.6mm;height:6.6mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:10pt;display:flex;align-items:center;justify-content:center}
.gg-t{min-width:0;display:flex;flex-direction:column;line-height:1.15}
.gg-t b{font-size:11pt;color:var(--brown)}
.gg-t span{font-size:8.4pt;color:var(--muted);margin-top:.3mm}
ol.gg-lines{margin:0;padding:0 0 0 8.8mm;list-style:none;counter-reset:ln}
.gg-lines li{position:relative;counter-increment:ln;font-size:9.2pt;line-height:1.25;padding:.15mm 0;color:#2e241b}
.gg-lines li::before{content:counter(ln);position:absolute;left:-8.8mm;width:4.2mm;text-align:right;font-size:7.4pt;color:#a3927c;top:.55mm}
.gg-lines li svg{position:absolute;left:-4.2mm;top:.4mm}
.gg-lines li.m span{background:#fbf1d6;box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 .6mm;border-radius:.6mm}
.gg-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;display:flex;gap:2mm;align-items:center;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.gg-legend svg{flex:none}
.gg-ex{display:grid;grid-template-columns:84mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:4mm 5mm}
.gg-exSong .gg-song{background:#fff;border:.3mm solid var(--line);border-radius:2.2mm;padding:3mm 3.4mm}
.gg-exR h3{margin:0 0 3mm}
.gg-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(pagesOfSongs.length / 2); s++) {
  SHEETS.push({ key: `book${s + 1}`, front: bookPage(s * 2), ...(s * 2 + 1 < pagesOfSongs.length ? { back: bookPage(s * 2 + 1) } : {}) });
}
SHEETS.push({ key: 'score', front: scorePage, back: scorePage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
