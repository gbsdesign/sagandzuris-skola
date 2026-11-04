// „ასოების ბადე“ on paper — the სამაგიდო variant of the app's word search (2026-11-01, the plan's Georgian game №3): twelve
// 10×10 grids of the app's own themes, four in each script — მხედრული, then ნუსხური, then ასომთავრული — two a page, so a
// sheet cut in half gives each child an A5 card with a grid on both sides; under an old-script grid the alphabet's key. Then
// the big key of the 33 letters in the three scripts with their names (two empty grids behind it for the teacher's own) and
// the answers. The grids are the app's own `buildBade` with fixed seeds; the old letters are the app's fonts (public/fonts).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { oldHead, letterCls, keyStrip, keyColumns, scriptsNote, oldCss } from '../oldScript.js';
import * as __d0 from '../../data/badeThemes';
import * as __d1 from '../../utils/bade';
import * as __d2 from '../../utils/otkheuli';
import * as __d3 from '../../utils/oldScripts';

const { BADE_THEMES, buildBade, indexCells, LEVELS, mulberry32, toScript, SCRIPT_LABEL } = ({ ...__d0, ...__d1, ...__d2, ...__d3 });

export const id = 'asoebis-bade';
export const title = 'ასოების ბადე';
const TAG = 'ქართული · უტელეფონო';
const META = '1 მოთამაშე, წყვილი ან მთელი კლასი · 7 წლიდან · 10–15 წუთი';
const LEVEL = 'mid';
const SIZE = LEVELS[LEVEL].size;
const WANT = LEVELS[LEVEL].words;

// the twelve grids: broad themes children know, four a script, the old scripts last
const PLAN = [
  ['mkhedruli', ['tskhovelebi', 'khili', 'kerdzebi', 'sakravebi']],
  ['nuskhuri', ['prinvelebi', 'kheebi', 'ch-tveebi', 'tsekvebi']],
  ['asomtavruli', ['yvavilebi', 'mdinareebi', 'kalakebi', 'dghesastsaulebi']],
];
const GRIDS = PLAN.flatMap(([script, ids]) => ids.map(tid => {
  const theme = BADE_THEMES.find(t => t.id === tid);
  if (!theme) throw new Error(`no theme ${tid}`);
  for (let seed = 101; seed < 400; seed++) {
    const g = buildBade(theme, LEVEL, mulberry32(seed));
    if (g && g.placed.length === WANT) return { script, g };
  }
  throw new Error(`${tid}: no grid of ${WANT} words`);
})).map((x, i) => ({ ...x, no: i + 1 }));

export const head = oldHead;

const DIR_ARROWS = ['arrow-right', 'arrow-down', 'arrow-down-right', 'arrow-up-right'];

// ---------- a grid ----------
const gridHtml = (g, script, cell, { capsules = false, blank = false } = {}) => {
  const n = g ? g.size : SIZE;
  const caps = capsules && g ? `<svg class="bd-caps" viewBox="0 0 ${n} ${n}" width="${n * cell}mm" height="${n * cell}mm">${g.placed.map((p, k) => {
    const cells = indexCells(p, n);
    const a = cells[0], b = cells[cells.length - 1];
    const hue = ['#f2b632', '#5fb36a', '#4f9fdc', '#b675c9', '#ef8a54', '#3fb3a6', '#e0708f', '#8fab3e'][k % 8];
    return `<line x1="${(a % n) + 0.5}" y1="${Math.floor(a / n) + 0.5}" x2="${(b % n) + 0.5}" y2="${Math.floor(b / n) + 0.5}" stroke="${hue}" stroke-width=".74" stroke-linecap="round" opacity=".55"/>`;
  }).join('')}</svg>` : '';
  const cells = Array.from({ length: n * n }, (_, i) => (blank ? '' : esc(toScript(g.cells[i], script))));
  return `<div class="bd-grid ${letterCls(script)}" style="width:${n * cell}mm;height:${n * cell}mm;grid-template-columns:repeat(${n},${cell}mm);grid-template-rows:repeat(${n},${cell}mm)">${caps}${cells.map(c => `<span>${c}</span>`).join('')}</div>`;
};

const half = ({ g, script, no }, top) => `<div class="bd-half" style="top:${top}mm">
  <div class="bd-head"><b>${title} · №${no}</b><span class="bd-badge">${esc(SCRIPT_LABEL[script])}</span><span class="bd-name">სახელი<i></i></span></div>
  <div class="bd-gridAt">${gridHtml(g, script, 9.2)}</div>
  <div class="bd-side">
    <div class="bd-theme">თემა: ${esc(g.theme.title)}</div>
    <div class="bd-find">იპოვე ${g.placed.length} სიტყვა და შემოხაზე:</div>
    <ul class="bd-words">${g.placed.map(p => `<li><span class="chk"></span>${esc(p.word)}</li>`).join('')}</ul>
    <div class="bd-dirs">სიტყვები ასე მიდის: ${DIR_ARROWS.map(a => icon(a, { size: 4.6, color: C.wine, width: 2.2 })).join('')}</div>
    <div class="bd-score">დრო <i></i> ნაპოვნი <i class="s"></i>/ ${g.placed.length}</div>
  </div>
  ${script === 'mkhedruli'
    ? `<div class="bd-tip">${icon('lightbulb', { size: 4.6, color: C.goldDark, width: 1.8 })}<span>ქართულ ანბანს 33 ასო აქვს და სამი დამწერლობა: ეს მხედრულია. შემდეგი ბადეები ნუსხურით და ასომთავრულითაა — ძველი ასოებით!</span></div>`
    : keyStrip(script)}
</div>`;

const cutLine = `<svg class="bd-cut" viewBox="0 0 210 6" width="210mm" height="6mm"><line x1="4" y1="3" x2="206" y2="3" stroke="#999" stroke-width=".25" stroke-dasharray="1.2 1.6"/></svg><div class="bd-scissors">${icon('scissors', { size: 4.2, color: '#888', width: 1.6 })}</div>`;

const gridPage = (a, b, label) => page(`${half(a, 0)}${half(b, 148.5)}${cutLine}<div class="sheetLabel">ფურცელი %SHEET% · ${esc(label)}</div>`, 'bdPage');

const gridSheets = PLAN.map(([script], k) => {
  const four = GRIDS.slice(k * 4, k * 4 + 4);
  const label = `${title} — ${SCRIPT_LABEL[script]} · ბადეები ${four[0].no}–${four[3].no}, ჭრა შუაზე`;
  return { key: script, front: gridPage(four[0], four[1], label), back: gridPage(four[2], four[3], label) };
});

// ---------- the big key and the teacher's own grids ----------
const keyPage = page(`${stripe(TAG, 'ანბანის გასაღები')}
<div class="bd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('ანბანი')}</div><div class="rsub">33 ასო სამ დამწერლობაში — და თითოეულის ძველი სახელი</div></div>
  ${keyColumns()}
  ${scriptsNote}
</div>
${foot(`<span>${esc(title)} · ანბანის გასაღები</span><span>${esc(SCHOOL)}</span>`)}`, 'bdKey');

const ownHalf = top => `<div class="bd-half" style="top:${top}mm">
  <div class="bd-head"><b>შენი ბადე</b><span class="bd-badge">${['მხედრული', 'ნუსხური', 'ასომთავრული'].map(s => `<span class="chk"></span>${s}`).join(' ')}</span><span class="bd-name">სახელი<i></i></span></div>
  <div class="bd-gridAt">${gridHtml(null, 'mkhedruli', 9.2, { blank: true })}</div>
  <div class="bd-side">
    <div class="bd-theme">თემა: <i class="bd-line"></i></div>
    <div class="bd-find">ჩაწერე სიტყვები — ასო უჯრაში, მარჯვნივ, ქვევით ან დიაგონალზე. დანარჩენი უჯრები ნებისმიერი ასოებით შეავსე და ბადე მეგობარს გაუცვალე.</div>
    <ul class="bd-words own">${Array.from({ length: 8 }, () => '<li><span class="chk"></span><i class="bd-line"></i></li>').join('')}</ul>
  </div>
  <div class="bd-tip">${icon('lightbulb', { size: 4.6, color: C.goldDark, width: 1.8 })}<span>ბადე ნუსხურით ან ასომთავრულით გინდა? ძველ ასოებს ამ ფურცლის მეორე მხარეს, გასაღებში ნახავ. სიტყვები სიაში მხედრულად დაწერე — მეგობარმა იცოდეს, რას ეძებს.</span></div>
</div>`;
const ownPage = page(`${ownHalf(0)}${ownHalf(148.5)}<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} — საკუთარი ბადეები (ეს ფურცელი არ იჭრება)</div>`, 'bdPage');

// ---------- the answers ----------
const mini = ({ g, script, no }) => `<div class="bd-mini">
  <div class="bd-mh"><b>№${no}</b> ${esc(g.theme.title)} <span>· ${esc(SCRIPT_LABEL[script])}</span></div>
  ${gridHtml(g, script, 5.6, { capsules: true })}
  <div class="bd-mw">${g.placed.map(p => esc(p.word)).join(' · ')}</div>
</div>`;
const answerPage = (from, label) => page(`${stripe(TAG, 'პასუხები')}
<div class="bd-ans">${GRIDS.slice(from, from + 6).map(mini).join('')}</div>
${foot(`<span>${esc(title)} · ${esc(label)}</span><span>${esc(SCHOOL)}</span>`)}`, 'bdAns');

// ---------- cover and rules ----------
// a little worked example, theme „ბუნება“: თოვლი across, მზე and ირემი down, ქარი on the diagonal — the corners' ი belong to two words
const EX = {
  rows: ['თოვლი', 'მქბსრ', 'ზნადე', 'ეღფრმ', 'ხცჯში'],
  caps: [[[0, 0], [0, 4]], [[1, 0], [3, 0]], [[1, 1], [4, 4]], [[0, 4], [4, 4]]],
};
const exampleSvg = () => {
  const n = 5, cell = 9;
  const caps = EX.caps.map(([[r1, c1], [r2, c2]], k) => `<line x1="${c1 + 0.5}" y1="${r1 + 0.5}" x2="${c2 + 0.5}" y2="${r2 + 0.5}" stroke="${['#f2b632', '#5fb36a', '#4f9fdc', '#b675c9'][k]}" stroke-width=".74" stroke-linecap="round" opacity=".55"/>`).join('');
  return `<div class="bd-grid mk ex" style="width:${n * cell}mm;height:${n * cell}mm;grid-template-columns:repeat(${n},${cell}mm);grid-template-rows:repeat(${n},${cell}mm)"><svg class="bd-caps" viewBox="0 0 ${n} ${n}" width="${n * cell}mm" height="${n * cell}mm">${caps}</svg>${EX.rows.join('').split('').map(c => `<span>${c}</span>`).join('')}</div>`;
};

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ბადეში სიტყვები იმალება — მარჯვნივ, ქვევით და დიაგონალზე. იპოვე და შემოხაზე! ბადეები სამი დამწერლობითაა: <b>მხედრული</b>, <b>ნუსხური</b> და <b>ასომთავრული</b>. ძველი ასოების ბადეს ქვეშ გასაღები ახლავს — ასე ძველ ანბანს თამაშით ისწავლი.<br><b>${META}</b></div>
  <div class="bd-ex box">
    ${exampleSvg()}
    <div><p class="bd-exT"><b>მაგალითი · თემა „ბუნება“.</b> <b>თოვლი</b> მარჯვნივ მიდის, <b>მზე</b> და <b>ირემი</b> — ქვევით, <b>ქარი</b> — დიაგონალზე. კუთხეების „ი“ ორ-ორ სიტყვაშია: ერთი ასო შეიძლება ორ სიტყვას ეკუთვნოდეს.</p></div>
  </div>
  <h3 class="sq-h3">რა არის ამ ფაილში</h3>
  <table class="t comp">
    <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ქაღალდი</th><th>ბეჭდვა · ჭრა</th></tr>
    <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ბადეები მხედრულით (A5, ორივე მხარეს)</td><td>4</td><td>${no('mkhedruli')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>ბადეები ნუსხურით, ქვეშ გასაღებით</td><td>4</td><td>${no('nuskhuri')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>ბადეები ასომთავრულით, ქვეშ გასაღებით</td><td>4</td><td>${no('asomtavruli')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>ანბანის დიდი გასაღები · ზურგზე ორი ცარიელი ბადე</td><td>1</td><td>${no('key')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>პასუხები მასწავლებელს</td><td>12</td><td>${no('answers')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ფანქარი, საათი (ქვიშის ან სხვა)</td><td>—</td><td>—</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
  </table>
  <div class="two">
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული).</li>
        <li>ბადის ფურცელი (${no('mkhedruli')}–${no('asomtavruli')}) შუაზე იჭრება: ორი A5 ბარათი, თითოეულზე ორი ბადე — წინ და ზურგზე. რამდენი ბავშვიც გყავთ, იმდენი ასლი.</li>
        <li>ანბანის გასაღები (${no('key')}) დაფაზე გააკარით ან თითო ასლი დაურიგეთ; ზურგზე ცარიელი ბადეებია.</li>
        <li>პასუხები (${no('answers')}) მასწავლებელთან რჩება.</li>
      </ol>
    </div>
    <div>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ცნობილი თავსატეხის — „სიტყვების ძებნის“ (Word search) — იდეით; თემები და სიტყვები საგანძურის სკოლის აპიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">აპში ყოველდღე ახალი ბადეა მთელი სკოლისთვის, კლასში კი გუნდები ერთ ეკრანზე ეძებენ: sagandzureli.ge → თამაშები → ასოების ბადე.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const MUKHA = { nusk: toScript('მუხა', 'nuskhuri'), aso: toScript('მუხა', 'asomtavruli') };
const rulesOf = no => [
  ['რა გჭირდებათ', 'ბადის ბარათი თითოეულს (ან წყვილს), ფანქარი და საათი. ტელეფონი არ გჭირდებათ.'],
  ['ძებნა', 'ბადის გვერდით სიტყვებია, მხედრულად. თითოეული ბადეში ერთხელ იმალება — სწორ ხაზზე: მარჯვნივ, ქვევით ან დიაგონალზე (ქვევით-მარჯვნივ ან ზევით-მარჯვნივ). ასო შეიძლება ორ სიტყვას ეკუთვნოდეს.'],
  ['შემოხაზვა', 'ნაპოვნ სიტყვას ბადეში შემოხაზავ, სიაში კი მონიშნავ. ყველა იპოვე? დროს ბარათის ქვეშ ჩაწერ.'],
  ['ძველი ასოები', `ნუსხურ და ასომთავრულ ბადეს ქვეშ გასაღები ახლავს: ზემოთ ძველი ასოა, ქვემოთ — დღევანდელი. სიტყვა ჯერ ასო-ასო „გადათარგმნე“: „მუხა“ ნუსხურად <span class="old">${MUKHA.nusk}</span>, ასომთავრულად <span class="old">${MUKHA.aso}</span>.`],
  ['სამი საფეხური', `ჯერ მხედრული (ფურცელი ${no('mkhedruli')}), მერე ნუსხური (${no('nuskhuri')}), ბოლოს ასომთავრული (${no('asomtavruli')}). ყოველ ფურცელზე ოთხი ბადეა; ბოლოსკენ ძველი ასოები თავისით გამახსოვრდება.`],
  ['დრო და ქულები', 'მასწავლებელი საათს რთავს (3–5 წუთი). ყოველი ნაპოვნი სიტყვა — 1 ქულა, ყველა დროზე — კიდევ 2. ან შეჯიბრი: ვინ უფრო მალე იპოვის ყველაფერს.'],
  ['მთელი კლასი', 'ერთი ბადე დაფაზე (დახაზეთ ან პროექტორით აჩვენეთ). კლასი გუნდებად იყოფა; ვინც სიტყვას დაინახავს, ხელს სწევს და ამბობს, სად იწყება. სწორია — მასწავლებელი შემოხაზავს გუნდის ფერით, გუნდს ქულა.'],
  ['საკუთარი ბადე', `ანბანის გასაღების ზურგზე (ფურცელი ${no('key')}) ორი ცარიელი ბადეა: ჩაწერე შენი სიტყვები, დანარჩენი უჯრები შეავსე და ბადე მეგობარს გაუცვალე. ძნელია? სიტყვა უკუღმაც ჩაწერე!`],
  ['აპშიც', 'იგივე თამაში საგანძურის სკოლის აპშია: ყოველდღე ერთი ბადე მთელი სკოლისთვის, თითით ხაზავ და დრო ითვლება; კლასში — გუნდებად ერთ ეკრანზე.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 7 წლიდან · 10–15 წუთი</div></div>
  <p class="lead">„ასოების ბადე“ ძებნის თამაშია: ასოების კვადრატში თემის სიტყვები იმალება. იპოვე ყველა — და თან ქართული ანბანის სამივე სახე ისწავლე.</p>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="bd-rmore">
    <div class="box"><h3>მიმართულებები</h3><div class="bd-arrows">${DIR_ARROWS.map((a, i) => `<span>${icon(a, { size: 9, color: C.wine, width: 2.2 })}<i>${['მარჯვნივ', 'ქვევით', 'ქვევით-მარჯვნივ', 'ზევით-მარჯვნივ'][i]}</i></span>`).join('')}</div></div>
    <div class="box"><h3>ქულები</h3><table class="t bd-pts"><tr><th>ნაპოვნი სიტყვა</th><td>1</td></tr><tr><th>ყველა დროზე</th><td>+2</td></tr><tr><th>კლასში: გუნდის სიტყვა</th><td>1</td></tr></table></div>
  </div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${oldCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.sq-h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{margin-bottom:1.5mm}
.cover .two{margin-top:4mm}
.bdPage .bd-half{position:absolute;left:0;width:210mm;height:148.5mm}
.bd-head{position:absolute;left:12mm;right:12mm;top:7.5mm;display:flex;align-items:center;gap:3mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.2mm}
.bd-head b{font-size:14pt;color:var(--wine)}
.bd-badge{background:var(--wine);color:var(--paper);font-weight:700;font-size:9.5pt;padding:.3mm 2.6mm .6mm;border-radius:2mm;display:inline-flex;align-items:center;gap:1mm}
.bd-badge .chk{border-color:var(--paper);margin:0 .4mm 0 1.6mm;width:3mm;height:3mm}
.bd-name{margin-left:auto;display:flex;align-items:flex-end;gap:2mm;font-size:9.5pt;width:62mm}
.bd-name i{flex:1;border-bottom:.25mm solid #bba98f;height:4mm}
.bd-gridAt{position:absolute;left:12mm;top:19mm}
.bd-grid{position:relative;display:grid;border:.35mm solid var(--brown);border-radius:1.6mm;background:#fff;overflow:hidden}
.bd-grid span{display:flex;align-items:center;justify-content:center;border-right:.15mm solid #eadfcd;border-bottom:.15mm solid #eadfcd;line-height:1;position:relative;z-index:1;color:#2f2018}
.bd-grid.mk span{font-family:'SansKa',sans-serif;font-weight:700;font-size:16pt}
.bd-grid.old span{font-family:'SGOld','SansKa',sans-serif;font-size:21pt}
.bd-caps{position:absolute;left:0;top:0;z-index:0}
.bd-side{position:absolute;left:112mm;right:12mm;top:19mm}
.bd-theme{font-size:13pt;font-weight:800;color:var(--wine);line-height:1.2}
.bd-find{font-size:9.6pt;color:var(--muted);margin:1.2mm 0 1.8mm;line-height:1.3}
.bd-words{list-style:none;margin:0;padding:0}
.bd-words li{display:flex;align-items:center;gap:2mm;height:7.3mm;font-size:13pt;font-weight:700;border-bottom:.15mm dotted #d9c9ad}
.bd-words li .chk{width:4mm;height:4mm}
.bd-words.own li{height:8.2mm}
.bd-line{flex:1;border-bottom:.25mm solid #bba98f;height:4.5mm;display:inline-block;min-width:40mm}
.bd-dirs{display:flex;align-items:center;gap:1.4mm;font-size:9.4pt;margin-top:2.6mm}
.bd-score{display:flex;align-items:flex-end;gap:1.6mm;font-size:10pt;margin-top:2.6mm}
.bd-score i{width:16mm;border-bottom:.25mm solid #bba98f;height:4mm}
.bd-score i.s{width:8mm}
.bd-half .os-key{position:absolute;left:12mm;right:12mm;top:114.5mm}
.bd-tip{position:absolute;left:12mm;right:12mm;top:117mm;display:flex;gap:2mm;align-items:flex-start;font-size:10pt;line-height:1.35;background:var(--paper);border:.25mm solid var(--gold);border-radius:2mm;padding:2.6mm 3.4mm}
.bd-tip svg{flex:none;margin-top:.4mm}
.bd-cut{position:absolute;left:0;top:145.5mm}
.bd-scissors{position:absolute;left:4mm;top:146.1mm;background:#fff;line-height:0}
.bd-kp{padding:6mm 12mm 0}
.bd-ans{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm 5mm;padding:7mm 12mm 0}
.bd-mini{display:flex;flex-direction:column;align-items:center}
.bd-mh{font-size:9.6pt;margin-bottom:1.6mm;align-self:stretch;text-align:center}
.bd-mh b{color:var(--wine)}
.bd-mh span{color:var(--muted)}
.bd-mini .bd-grid.mk span{font-size:9.5pt}
.bd-mini .bd-grid.old span{font-size:12.5pt}
.bd-mw{font-size:8.6pt;line-height:1.35;margin-top:1.6mm;text-align:center;color:var(--brown)}
.bd-ex{display:grid;grid-template-columns:auto 1fr;gap:7mm;align-items:center;margin:0 0 5mm;padding:4mm 6mm}
.bd-ex .bd-grid.mk span{font-size:15pt}
.bd-exT{font-size:10pt;line-height:1.4;margin:0}
.bd-rmore{display:grid;grid-template-columns:1.3fr 1fr;gap:6mm;margin-top:4mm}
.bd-rmore h3{margin:0 0 2mm;color:var(--wine);font-size:11pt}
.bd-arrows{display:flex;justify-content:space-between}
.bd-arrows span{display:flex;flex-direction:column;align-items:center;gap:1mm;font-size:8.6pt}
.bd-arrows i{font-style:normal}
table.bd-pts{font-size:10.5pt}
table.bd-pts td{text-align:center;font-weight:800;color:var(--wine);width:12mm}
`;

const SHEETS = [
  { key: 'cover' },
  ...gridSheets,
  { key: 'key', front: keyPage, back: ownPage },
  { key: 'answers', front: answerPage(0, 'პასუხები 1–6'), back: answerPage(6, 'პასუხები 7–12') },
];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
