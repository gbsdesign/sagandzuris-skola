// „ხუცური წარწერა“ on paper — the სამაგიდო variant of the app's cryptogram (2026-11-01, the plan's Georgian game №4): twenty of
// the app's own lines in the old letters with an empty box under each letter, four a page from the easiest — twelve in
// asomtavruli, then eight in nuskhuri — each page with the alphabet's key under it, and who said it signed in the old letters
// too (a bonus to read). Then a page for a secret letter of one's own, the big key with an asomtavruli copybook behind it, and
// the teacher's sheet: the answers, and the class game in the way of „სასწაულების ველი“ (the app's hybrid: letters called,
// a point a box, the line read for the boxes left + 5).
import { SERIES, SCHOOL, aso, esc, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';
import { oldHead, keyStrip, keyColumns, scriptsNote, oldCss } from '../oldScript.mjs';

const { TS_LINES, isLetter, usable, READ_BONUS, toScript, ALPHABET, SCRIPT_LABEL } = await appData({
  'data/tsartseraLines.ts': ['TS_LINES'],
  'utils/tsartsera.ts': ['isLetter', 'usable'],
  'utils/tsartseraTeams.ts': ['READ_BONUS'],
  'utils/oldScripts.ts': ['toScript', 'ALPHABET', 'SCRIPT_LABEL'],
});

export const id = 'khutsuri-tsartsera';
export const title = 'ხუცური წარწერა';
const TAG = 'ქართული · უტელეფონო';
const META = '1 მოთამაშე, წყვილი ან მთელი კლასი · 8 წლიდან · 10–20 წუთი';
export const head = oldHead;

// the twenty, from the easiest — short proverbs and lines first; four a page: three pages of asomtavruli, two of nuskhuri.
// A page holds about nine rows of letters (`script` below sizes the letters to the page and stops the build on an overflow).
const PLAN = [
  ['asomtavruli', ['a17', 'a10', 'p6', 'v3']],
  ['asomtavruli', ['a14', 'a15', 'm2', 'p5']],
  ['asomtavruli', ['a12', 'a11', 'a1', 'p15']],
  ['nuskhuri', ['a7', 'm21', 'a9', 'p20']],
  ['nuskhuri', ['a2', 'p12', 'v8', 'm9']],
];
const LINES = PLAN.flatMap(([script, ids]) => ids.map(lid => {
  const line = TS_LINES.find(l => l.id === lid);
  if (!line || !usable(line)) throw new Error(`no usable line ${lid}`);
  return { script, line };
})).map((x, i) => ({ ...x, no: i + 1 }));
const ASO_LAST = LINES.filter(l => l.script === 'asomtavruli').length;

// ---------- a line: the old letters over empty boxes, a word never broken ----------
// a word = its letters one by one and its marks in runs („?!“ stays one), all sized by the page's --t
const tile = (run, script, fill) => (isLetter(run)
  ? `<span class="ts-t"><b class="old">${toScript(run, script)}</b><i${fill[run] ? ' class="on"' : ''}>${fill[run] ?? ''}</i></span>`
  : `<span class="ts-p">${esc(run)}</span>`);
const verseHtml = (verse, script, fill = {}) => `<div class="ts-verse">${verse.split(' ').filter(Boolean)
  .map(w => `<span class="ts-w">${(w.match(/[ა-ჰ]|[^ა-ჰ]+/g) ?? []).map(run => tile(run, script, fill)).join('')}</span>`).join('')}</div>`;

const lineBlock = ({ line, script, no }) => `<div class="ts-line">
  <span class="ts-no">${no}</span>
  ${line.text.split('\n').map(v => verseHtml(v, script)).join('')}
  <div class="ts-sig"><span class="old">— ${esc(toScript(line.by, script))}</span><span class="ts-who">ვინ თქვა?<i></i></span></div>
</div>`;

const head_ = (name, badge, right = '') => `<div class="ts-head"><b>${name}</b><span class="ts-badge">${badge}</span>${right}</div>`;
const nameLine = (label = 'სახელი', w = 52) => `<span class="ts-name">${label}<i style="width:${w}mm"></i></span>`;

const linePage = k => {
  const [script] = PLAN[k];
  const four = LINES.slice(k * 4, k * 4 + 4);
  return page(`${stripe(TAG, `${SCRIPT_LABEL[script]} · წარწერები ${four[0].no}–${four[3].no}`)}
${head_(title, esc(SCRIPT_LABEL[script]), `${nameLine()}<span class="ts-name">ქულა<i style="width:9mm"></i>/ 12</span>`)}
<p class="ts-how">ყოველ ძველ ასოს ქვეშ დღევანდელი ჩაწერე — გასაღები ფურცლის ბოლოშია. ერთნაირ ძველ ასოს ყველგან ერთი ასო ეკუთვნის: ერთი რომ ამოიცანი, მისნაირებიც შეავსე!</p>
<div class="ts-lines">${four.map(lineBlock).join('')}</div>
<div class="ts-keyAt">${keyStrip(script)}</div>
${foot(`<span>${esc(title)} · ${esc(SCRIPT_LABEL[script])} · ${four[0].no}–${four[3].no}</span><span>${esc(SCHOOL)}</span>`)}`, 'tsPage');
};

// ---------- a secret letter of one's own ----------
const OWN_ROWS = 7, OWN_COLS = 18;
const ownPage = page(`${stripe(TAG, 'საიდუმლო წერილი')}
${head_('შენი საიდუმლო წერილი', ['ასომთავრული', 'ნუსხური'].map(s => `<span class="chk"></span>${s}`).join(' '), nameLine('ვის', 44))}
<p class="ts-how">მოიფიქრე წერილი მეგობრისთვის და <b>ზედა</b> უჯრებში ძველი ასოებით დაწერე — ასო-ასო, გასაღების მიხედვით; სიტყვებს შორის ერთი უჯრა გამოტოვე. მერე ფურცელი გაუცვალე: მეგობარი <b>ქვედა</b> უჯრებში დღევანდელ ასოებს ჩაწერს და წერილს ამოიკითხავს.</p>
<div class="ts-own">${Array.from({ length: OWN_ROWS * OWN_COLS }, () => '<span class="ts-pair"><b></b><i></i></span>').join('')}</div>
<div class="ts-keys2">${keyStrip('asomtavruli')}${keyStrip('nuskhuri')}</div>
${foot(`<span>${esc(title)} · საიდუმლო წერილი</span><span>${esc(SCHOOL)}</span>`)}`, 'tsPage');

// ---------- the big key and the copybook behind it ----------
const keyPage = page(`${stripe(TAG, 'ანბანის გასაღები')}
<div class="ts-kp">
  <div class="rhead"><div class="aso rtitle">${aso('ანბანი')}</div><div class="rsub">33 ასო სამ დამწერლობაში — და თითოეულის ძველი სახელი</div></div>
  ${keyColumns()}
  ${scriptsNote}
</div>
${foot(`<span>${esc(title)} · ანბანის გასაღები</span><span>${esc(SCHOOL)}</span>`)}`, 'tsKey');

const tracePage = page(`${stripe(TAG, 'რვეული')}
<div class="ts-kp">
  <div class="rhead"><div class="aso rtitle">${aso('რვეული')}</div><div class="rsub">ასომთავრული: ჯერ ღია ასოებს შემოავლე, მერე ცარიელ ადგილას თავად დაწერე</div></div>
  <div class="ts-tr">${ALPHABET.map(ch => {
    const a = toScript(ch, 'asomtavruli');
    return `<div class="ts-trc"><i>${ch}</i><b class="old">${a}</b><b class="old f">${a}</b><b class="old f">${a}</b><b class="old f">${a}</b><span></span></div>`;
  }).join('')}</div>
</div>
${foot(`<span>${esc(title)} · ასომთავრულის რვეული</span><span>${esc(SCHOOL)}</span>`)}`, 'tsKey');

// ---------- the teacher's sheet: the answers, the class game ----------
const answersPage = page(`${stripe(TAG, 'პასუხები')}
<div class="ts-kp">
  <div class="rhead"><div class="aso rtitle">${aso('პასუხები')}</div><div class="rsub">მასწავლებელს · ოცი წარწერა და ვისი სიტყვებია</div></div>
  <ol class="ts-ans">${LINES.map(({ line, no, script }) => `<li><b>${no}</b><div><p>${esc(line.text).replace(/\n/g, ' / ')}</p><span>— ${esc(line.by)}${line.from ? `, „${esc(line.from)}“` : ''} · ${esc(SCRIPT_LABEL[script])}</span></div></li>`).join('')}</ol>
  <p class="small">ლექსები საგანძურის სკოლის აპის ტექსტებიდანაა, მამათა სიტყვები — აპის გამონათქვამებიდან. ანდაზები Claude-მა ჩაწერა და მასწავლებელს ჯერ არ შეუმოწმებია.</p>
</div>
${foot(`<span>${esc(title)} · პასუხები</span><span>${esc(SCHOOL)}</span>`)}`, 'tsKey');

const ROUNDS = 7, TEAMS = 6;
const classPage = page(`${stripe(TAG, 'კლასის თამაში')}
<div class="ts-kp">
  <div class="rhead"><div class="aso rtitle">${aso('კლასის თამაში')}</div><div class="rsub">მასწავლებლის ფურცელი · „სასწაულების ველის“ წესით</div></div>
  <div class="box ts-cg"><ol>
    <li><b>დაფაზე</b> სტრიქონის უჯრები დახაზე — თითო ასოზე ერთი, სიტყვებს შორის ცარიელი ადგილი — და ყოველ უჯრაზე ზემოთ ძველი ასო დაწერე (ან წარწერის ფურცელი პროექტორით აჩვენე). გასაღებები ამ დროს დახურულია!</li>
    <li>გუნდები რიგრიგობით <b>დღევანდელ ასოს</b> ასახელებენ. სტრიქონში ახლავს — ყველა მის უჯრაში ჩაწერე, გუნდს <b>თითო უჯრაზე 1 ქულა</b> და ისევ ასახელებს. არ ახლავს — ჯერი შემდეგ გუნდზეა.</li>
    <li>თავის ჯერზე გუნდს შეუძლია <b>მთელი სტრიქონის წაკითხვა</b>: სწორია — დარჩენილი ცარიელი უჯრები + ${READ_BONUS} ქულა; არასწორია — სტრიქონი იხსნება და ქულა არავის.</li>
    <li>ყოველ ახალ სტრიქონს შემდეგი გუნდი იწყებს. დასახელებულ ასოს ქვემოთ, თავის რიგში გადახაზავ — ასე არავინ გაიმეორებს.</li>
  </ol></div>
  <h3 class="ts-h3">დასახელებული ასოები</h3>
  <div class="ts-trk">${Array.from({ length: ROUNDS }, (_, r) => `<div class="ts-trkRow"><span class="ts-trkNo"><b>${r + 1}</b>№<i></i></span>${ALPHABET.map(ch => `<span>${ch}</span>`).join('')}</div>`).join('')}</div>
  <h3 class="ts-h3">ქულები</h3>
  <table class="t ts-sc"><tr><th>გუნდი</th>${Array.from({ length: ROUNDS }, (_, r) => `<th>${r + 1}</th>`).join('')}<th>ჯამი</th></tr>${Array.from({ length: TEAMS }, () => `<tr><td></td>${'<td></td>'.repeat(ROUNDS)}<td></td></tr>`).join('')}</table>
</div>
${foot(`<span>${esc(title)} · კლასის თამაში</span><span>${esc(SCHOOL)}</span>`)}`, 'tsKey');

// ---------- cover and rules ----------
// the worked example: „ნელა იარე“ with ა read — its old letter stands twice, one look fills both boxes
const EX_FILL = { ა: 'ა' };
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ძველ ქართულ წარწერებს ხუცური ასოებით ვხვდებით — ქვაზე, ხელნაწერებში, ძველ წიგნებში. აქ ოცი წარწერაა: რუსთაველის, ბარათაშვილის, ილიას, აკაკის, ვაჟას სტრიქონები, მამათა სიტყვები და ანდაზები. გასაღებით ასო-ასო ამოიკითხე — და თან ძველი ანბანი ისწავლე.<br><b>${META}</b></div>
  <div class="ts-ex box">
    <div class="ts-exT">${verseHtml('ნელა იარე,', 'asomtavruli', EX_FILL)}</div>
    <p><b>მაგალითი.</b> გასაღებში <span class="old">${toScript('ა', 'asomtavruli')}</span> „ა“-ა. ჩაწერე „ა“ ყველა <span class="old">${toScript('ა', 'asomtavruli')}</span>-ს ქვეშ — ერთბაშად ორი უჯრა შეივსო! ასე, ასო-ასო, მთელი სტრიქონი იხსნება: <i>„ნელა იარე, შორს წახვალ.“</i></p>
  </div>
  <h3 class="sq-h3">რა არის ამ ფაილში</h3>
  <table class="t comp">
    <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ქაღალდი</th><th>ბეჭდვა</th></tr>
    <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>წარწერები ასომთავრულით, ოთხი გვერდზე, ქვეშ გასაღებით</td><td>${ASO_LAST}</td><td>${no('lines1')}–${no('lines2')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>წარწერები ნუსხურით</td><td>${LINES.length - ASO_LAST}</td><td>${no('lines2')}–${no('lines3')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>საიდუმლო წერილი</td><td>1</td><td>${no('lines3')}-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ანბანის დიდი გასაღები · ზურგზე ასომთავრულის რვეული</td><td>1</td><td>${no('key')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>პასუხები · ზურგზე კლასის თამაში (მასწავლებელს)</td><td>1</td><td>${no('teacher')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ფანქარი, საშლელი</td><td>—</td><td>—</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
  </table>
  <div class="two">
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული).</li>
        <li>წარწერების ფურცლები (${no('lines1')}–${no('lines3')}) — რამდენი ბავშვიც გყავთ, იმდენი ასლი. ჭრა არ სჭირდება.</li>
        <li>ანბანის გასაღები (${no('key')}) დაფაზე გააკარით ან თითო ასლი დაურიგეთ; ზურგზე რვეულია.</li>
        <li>მასწავლებლის ფურცელი (${no('teacher')}) — ერთი ასლი, ბავშვებს არ ურიგდება.</li>
      </ol>
    </div>
    <div>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ცნობილი თავსატეხის — „კრიპტოგრამის“ (Cryptogram) — იდეით. ლექსები საგანძურის სკოლის აპის ტექსტებიდანაა, მამათა სიტყვები — აპის გამონათქვამებიდან; ანდაზები Claude-მა ჩაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">აპში ყოველდღე ახალი წარწერაა მთელი სკოლისთვის, კლასში კი გუნდები ერთ ეკრანზე თამაშობენ: sagandzureli.ge → თამაშები → ხუცური წარწერა.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['რა გჭირდებათ', 'წარწერის ფურცელი თითოეულს (ან წყვილს) და ფანქარი. ტელეფონი არ გჭირდებათ.'],
  ['წარწერა', `ყოველი სტრიქონი ძველი ასოებითაა — ასომთავრულით (1–${ASO_LAST}) ან ნუსხურით (${ASO_LAST + 1}–${LINES.length}); ყოველ ძველ ასოს ქვეშ ცარიელი უჯრაა. სიტყვები და სასვენი ნიშნები თავის ადგილზეა.`],
  ['ამოკითხვა', 'ფურცლის ბოლოს გასაღებია: ზემოთ ძველი ასო, ქვემოთ დღევანდელი. ძველი ასო გასაღებში იპოვე და უჯრაში დღევანდელი ჩაწერე. ერთნაირ ძველ ასოს ყველგან ერთი ასო ეკუთვნის — ერთი რომ ამოიცანი, მისნაირებიც მაშინვე შეავსე.'],
  ['ვინ თქვა?', 'სტრიქონის ქვეშ ძველი ასოებითვე წერია, ვისი სიტყვებია. ამოიკითხე და ხაზზე დაწერე.'],
  ['ქულები', 'ამოკითხული სტრიქონი — 2 ქულა, „ვინ თქვა?“ — კიდევ 1. გვერდზე ოთხი წარწერაა: სულ 12. შეჯიბრიც შეიძლება: ვინ უფრო მალე ამოიკითხავს გვერდს.'],
  ['საფეხურები', `ჯერ ასომთავრული, მერე ნუსხური — და ყოველ გვერდზე წარწერები სულ უფრო გრძელია. ადვილი გახდა? გასაღები ქაღალდით დაფარე და მეხსიერებით სცადე!`],
  ['მთელი კლასი', `„სასწაულების ველი“: მასწავლებელი სტრიქონს დაფაზე დახაზავს, გუნდები ასოებს ასახელებენ — წესები და ქულების ცხრილი მასწავლებლის ფურცლის (${no('teacher')}) ზურგზეა.`],
  ['საიდუმლო წერილი', `ფურცელ ${no('lines3')}-ის ზურგზე: ძველი ასოებით დაწერე წერილი და მეგობარს გაუცვალე — ის ამოიკითხავს.`],
  ['რვეული', `ანბანის გასაღების (${no('key')}) ზურგზე ასომთავრულის 33 ასოა გადასაწერად: ჯერ შემოავლე, მერე თავად დაწერე.`],
  ['აპშიც', 'საგანძურის სკოლის აპში ყოველდღე ახალი წარწერაა მთელი სკოლისთვის, შენი ნასწავლი ასოებიც ინახება; კლასში — გუნდებად ერთ ეკრანზე.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 8 წლიდან · 10–20 წუთი</div></div>
  <p class="lead">„ხუცური წარწერა“ ამოცნობის თამაშია: ცნობილი სტრიქონი ძველი ასოებითაა დაწერილი. ამოიკითხე — და თან ქართული ანბანის ძველი სახეები ისწავლე.</p>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="ts-rmore">
    <div class="box"><h3>ქულები</h3><table class="t ts-pts"><tr><th>ამოკითხული სტრიქონი</th><td>2</td></tr><tr><th>„ვინ თქვა?“</th><td>+1</td></tr><tr><th>კლასში: ასო სტრიქონში</th><td>1 უჯრაზე</td></tr><tr><th>კლასში: წაკითხული სტრიქონი</th><td>+${READ_BONUS}</td></tr></table></div>
    ${scriptsNote}
  </div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// every page of lines gets the biggest letters that still leave the key free: from 11 mm boxes down by 0.2 mm
export const script = `(() => {
  const mm = v => v * 96 / 25.4, bad = [];
  document.querySelectorAll('.ts-lines').forEach((el, i) => {
    const limit = el.closest('.page').querySelector('.ts-keyAt').getBoundingClientRect().top - mm(4);
    let t = 11;
    const set = () => el.style.setProperty('--t', t.toFixed(1) + 'mm');
    set();
    while (el.getBoundingClientRect().bottom > limit && t > 8.3) { t -= 0.2; set(); }
    if (el.getBoundingClientRect().bottom > limit) bad.push(i + 1);
  });
  if (bad.length) throw new Error('khutsuri-tsartsera: too long for the page — lines page ' + bad.join(', '));
})()`;

export const css = `${coverCss}${oldCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.sq-h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{margin-bottom:1.5mm}
.cover .two{margin-top:4mm}
.ts-head{display:flex;align-items:center;gap:3mm;margin:5mm 12mm 0;border-bottom:.3mm solid var(--gold);padding-bottom:1.2mm}
.ts-head b{font-size:14pt;color:var(--wine)}
.ts-badge{background:var(--wine);color:var(--paper);font-weight:700;font-size:9.5pt;padding:.3mm 2.6mm .6mm;border-radius:2mm;display:inline-flex;align-items:center;gap:1mm}
.ts-badge .chk{border-color:var(--paper);margin:0 .4mm 0 1.6mm;width:3mm;height:3mm}
.ts-name{display:flex;align-items:flex-end;gap:2mm;font-size:9.5pt}
.ts-head .ts-name:first-of-type{margin-left:auto}
.ts-name i{border-bottom:.25mm solid #bba98f;height:4mm}
.ts-how{margin:1.6mm 12mm 0;font-size:9.4pt;line-height:1.3;color:var(--muted)}
.ts-how b{color:var(--wine)}
.ts-lines,.ts-exT{--t:8.4mm}
.ts-lines{position:absolute;left:12mm;right:12mm;top:37mm;display:flex;flex-direction:column}
.ts-line{position:relative;padding-left:10mm}
.ts-line + .ts-line{border-top:.2mm dashed #d9c9ad;margin-top:3.2mm;padding-top:3.4mm}
.ts-no{position:absolute;left:0;top:calc(var(--t) * .415 - 3.5mm);width:7mm;height:7mm;border-radius:50%;background:var(--wine);color:var(--paper);font-family:'SansKa',sans-serif;font-weight:800;font-size:10.5pt;display:flex;align-items:center;justify-content:center}
.ts-line + .ts-line .ts-no{top:calc(var(--t) * .415 - .1mm)}
.ts-verse{display:flex;flex-wrap:wrap;align-items:flex-end;column-gap:calc(var(--t) * .55);row-gap:2.4mm}
.ts-verse + .ts-verse{margin-top:2.4mm}
.ts-w{display:flex;gap:.9mm;align-items:flex-end}
.ts-t{display:flex;flex-direction:column;align-items:center;width:var(--t)}
.ts-t b{font-weight:400;font-size:calc(var(--t) * .88);line-height:1;height:calc(var(--t) * .83);display:flex;align-items:flex-end;justify-content:center;color:#2f2018}
.ts-t i{display:flex;align-items:center;justify-content:center;width:var(--t);height:calc(var(--t) * 1.05);margin-top:.8mm;border:.3mm solid #b9a88f;border-radius:1.2mm;background:#fff;font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:calc(var(--t) * .55);color:var(--gold2)}
.ts-t i.on{background:#fbf2dc;border-color:#e2c27a}
.ts-p{font-family:'SansKa',sans-serif;font-size:calc(var(--t) * .67);font-weight:700;color:var(--muted);line-height:1;padding-bottom:calc(var(--t) * .17);white-space:nowrap}
.ts-sig{display:flex;justify-content:flex-end;align-items:flex-end;gap:5mm;margin-top:1.6mm;font-size:9.4pt;color:var(--muted)}
.ts-sig .old{font-size:14pt;color:var(--brown);line-height:1}
.ts-who{display:flex;align-items:flex-end;gap:1.5mm}
.ts-who i{width:46mm;border-bottom:.25mm solid #bba98f;height:4mm}
.ts-keyAt{position:absolute;left:12mm;right:12mm;top:255mm}
.ts-own{position:absolute;left:12mm;right:12mm;top:46mm;display:grid;grid-template-columns:repeat(${OWN_COLS},1fr);column-gap:.9mm;row-gap:3.4mm}
.ts-pair{display:flex;flex-direction:column;gap:.8mm}
.ts-pair b{height:9mm;border:.25mm dashed #cdbb9e;border-radius:1.2mm}
.ts-pair i{height:9mm;border:.3mm solid #b9a88f;border-radius:1.2mm;background:#fff}
.ts-keys2{position:absolute;left:12mm;right:12mm;top:222mm;display:flex;flex-direction:column;gap:2.4mm}
.ts-kp{padding:6mm 12mm 0}
.ts-tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(11,20.6mm);grid-auto-flow:column;column-gap:6mm;margin-top:2mm}
.ts-trc{display:grid;grid-template-columns:6mm repeat(4,1fr) 1.4fr;align-items:end;border-bottom:.3mm solid #cdbb9e;padding-bottom:1.2mm;background:linear-gradient(#efe6d6,#efe6d6) 0 42% / 100% .2mm no-repeat}
.ts-trc i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:10pt;color:var(--wine);align-self:center}
.ts-trc b{font-weight:400;font-size:25pt;line-height:1;text-align:center;color:#2f2018}
.ts-trc b.f{color:#ddd0bb}
.ts-ans{list-style:none;margin:2mm 0 3mm;padding:0}
.ts-ans li{display:grid;grid-template-columns:8mm 1fr;gap:2mm;padding:1mm 0;border-bottom:.15mm solid var(--line);break-inside:avoid}
.ts-ans li>b{width:6.4mm;height:6.4mm;border-radius:50%;background:var(--wine);color:var(--paper);font-family:'SansKa',sans-serif;font-size:9pt;display:flex;align-items:center;justify-content:center;margin-top:.4mm}
.ts-ans p{margin:0;font-size:10.2pt;font-weight:700;line-height:1.25;color:var(--brown)}
.ts-ans span{font-size:8.4pt;line-height:1.2;color:var(--muted);display:block}
.ts-cg{font-size:9.8pt;line-height:1.38;margin-top:1mm}
.ts-cg ol{margin:0;padding-left:5mm}
.ts-cg li{margin-bottom:1.4mm}
.ts-cg b{color:var(--wine)}
.ts-h3{margin:5mm 0 2mm;color:var(--wine);font-size:11.5pt}
.ts-trk{display:flex;flex-direction:column;gap:2mm}
.ts-trkRow{display:flex;align-items:center;gap:.4mm}
.ts-trkRow>span{flex:none;width:4.55mm;height:6.4mm;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:700;font-size:9pt;border:.15mm solid var(--line);border-radius:.6mm;background:#fff}
.ts-trkRow>span.ts-trkNo{width:17mm;border:0;background:none;justify-content:flex-start;gap:1mm;font-weight:700;font-size:8.6pt;color:var(--muted);white-space:nowrap}
.ts-trkNo b{width:4.6mm;height:4.6mm;border-radius:50%;background:var(--wine);color:var(--paper);display:inline-flex;align-items:center;justify-content:center;font-size:8pt;margin-right:.6mm}
.ts-trkNo i{width:7mm;border-bottom:.25mm solid #bba98f;height:3.6mm}
table.ts-sc th{text-align:center}
table.ts-sc td{height:9.4mm}
table.ts-sc th:first-child{width:56mm}
.ts-ex{display:grid;grid-template-columns:auto 1fr;gap:7mm;align-items:center;margin:0 0 5mm;padding:4mm 6mm}
.ts-ex p{font-size:10pt;line-height:1.4;margin:0}
.ts-ex .old{font-size:13pt}
.ts-rmore{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:4mm;align-items:start}
.ts-rmore h3{margin:0 0 2mm;color:var(--wine);font-size:11pt}
.ts-rmore .os-hist{margin-top:0}
table.ts-pts{font-size:10pt}
table.ts-pts td{text-align:center;font-weight:800;color:var(--wine);width:22mm}
`;

const SHEETS = [
  { key: 'cover' },
  { key: 'lines1', front: linePage(0), back: linePage(1) },
  { key: 'lines2', front: linePage(2), back: linePage(3) },
  { key: 'lines3', front: linePage(4), back: ownPage },
  { key: 'key', front: keyPage, back: tracePage },
  { key: 'teacher', front: answersPage, back: classPage },
];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
