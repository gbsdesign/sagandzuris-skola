// „სამი დამწერლობა“ on paper — the სამაგიდო variant of the app's path through the old letters (2026-11-01, the plan's Georgian
// game №2, like Duolingo): the same nine steps a script — seven of letters, most frequent first (utils/anbani.ts
// `LETTER_UNITS`), then words, then lines — as a child's daily five minutes: the big key with an asomtavruli copybook behind it,
// a nuskhuri copybook with „ჩემი გზა“ (both paths to colour, the streak's calendar, a master's badge) behind it, a reading sheet
// a script (each step's new letters and six words made only of the letters learned so far, then longer words and lines), a
// deck of 99 letter cards — every letter in its three scripts, a family of three — for „სამეული“, „ჰოპ!“ and memory, and the
// teacher's sheet: the answers and the class game „სწრაფი კითხვა“ (the app's hybrid, the deck as its flash cards).
import { SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss, gridSheet, grapeEmblem, C } from '../lib.js';
import { oldHead, keyStrip, keyColumns, scriptsNote, oldCss } from '../oldScript.js';
import * as __d0 from '../../utils/anbani';
import * as __d1 from '../../utils/oldScripts';
import * as __d2 from '../../data/anbaniWords';

const { LETTER_UNITS, lettersThrough, readable, rng, shuffle, toScript, ALPHABET, LETTER_NAMES, SCRIPT_LABEL, anbaniWords, anbaniLines } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'sami-damtserloba';
export const title = 'სამი დამწერლობა';
const TAG = 'ქართული · უტელეფონო';
const META = '1 მოთამაშე, წყვილი ან მთელი კლასი · 6 წლიდან · ყოველდღე 5–10 წუთი';
export const head = oldHead;

const OLD = ['asomtavruli', 'nuskhuri'];
const THREE = ['asomtavruli', 'nuskhuri', 'mkhedruli'];
const TINT = { asomtavruli: C.wine, nuskhuri: '#2a5d6e', mkhedruli: C.goldDark };
const nameOf = ch => LETTER_NAMES[ALPHABET.indexOf(ch)];
const cls = s => (s === 'mkhedruli' ? 'mk' : 'old');

// ---------- what each script's sheet reads: six words a step, then twelve long words and six lines ----------
const pool = anbaniWords();
const taken = new Set();
const takenLines = new Set();
const readingOf = (script, seed) => {
  const r = rng(seed);
  const mine = new Set();
  const fresh = w => !mine.has(w);
  const units = LETTER_UNITS.map((news, u) => {
    const can = readable(pool, lettersThrough(u)).filter(w => w.length <= 8 && fresh(w));
    const hasNew = w => [...w].some(c => news.includes(c));
    // the step's own letters first, words the other script did not read first
    const order = [
      ...shuffle(can.filter(w => hasNew(w) && !taken.has(w)), r),
      ...shuffle(can.filter(w => hasNew(w) && taken.has(w)), r),
      ...shuffle(can.filter(w => !hasNew(w)), r),
    ];
    const six = order.slice(0, 6).sort((a, b) => a.length - b.length || a.localeCompare(b, 'ka'));
    if (six.length < 6) throw new Error(`${script}: step ${u + 1} has only ${six.length} words`);
    six.forEach(w => { mine.add(w); taken.add(w); });
    return six;
  });
  const long = shuffle(pool.filter(w => w.length >= 6 && w.length <= 9 && fresh(w) && !taken.has(w)), r).slice(0, 12)
    .sort((a, b) => a.length - b.length || a.localeCompare(b, 'ka'));
  long.forEach(w => { mine.add(w); taken.add(w); });
  const lines = shuffle(anbaniLines().filter(l => !l.includes('\n') && l.length <= 44 && !takenLines.has(l)), r).slice(0, 6)
    .sort((a, b) => a.length - b.length);
  lines.forEach(l => takenLines.add(l));
  return { units, long, lines };
};
const READ = { asomtavruli: readingOf('asomtavruli', 11), nuskhuri: readingOf('nuskhuri', 23) };

// ---------- common bits ----------
const head_ = (name, badge, tint, right = '') => `<div class="sd-head"><b>${name}</b><span class="sd-badge" style="background:${tint}">${badge}</span>${right}</div>`;
const nameLine = (label = 'სახელი', w = 52) => `<span class="sd-name">${label}<i style="width:${w}mm"></i></span>`;
const tiles = (letters, script) => `<span class="sd-tiles">${letters.map(ch => `<span><b class="old">${toScript(ch, script)}</b><i>${ch}</i></span>`).join('')}</span>`;
const stepNo = (n, tint) => `<span class="sd-no" style="background:${tint}">${n}</span>`;

// ---------- the reading sheets: front = steps 1–7, back = step 8 (long words) and step 9 (lines) ----------
const wordsPage = script => {
  const { units } = READ[script];
  const tint = TINT[script];
  return page(`${stripe(TAG, `საკითხავი · ${SCRIPT_LABEL[script]}`)}
${head_(`${title} · საკითხავი`, esc(SCRIPT_LABEL[script]), tint, nameLine())}
<p class="sd-how">ყოველი ნაბიჯი ახალი ასოებით იწყება (მარცხნივ). მერე სიტყვები წაიკითხე — მხოლოდ ნასწავლი ასოებია — და ქვემოთ დღევანდელი ასოებით ჩაწერე. ერთ დღეს ერთი ნაბიჯი!</p>
<div class="sd-units">${units.map((six, u) => `<div class="sd-unit">
  <div class="sd-uhead">${stepNo(u + 1, tint)}${tiles(LETTER_UNITS[u], script)}</div>
  <div class="sd-words">${six.map(w => `<span class="sd-w"><b class="old">${toScript(w, script)}</b><i></i></span>`).join('')}</div>
</div>`).join('')}</div>
${foot(`<span>${esc(title)} · საკითხავი · ${esc(SCRIPT_LABEL[script])} · ნაბიჯები 1–7</span><span>${esc(SCHOOL)}</span>`)}`, `sdPage sd-${script}`);
};
const linesPage = script => {
  const { long, lines } = READ[script];
  const tint = TINT[script];
  return page(`${stripe(TAG, `საკითხავი · ${SCRIPT_LABEL[script]}`)}
${head_(`${title} · საკითხავი`, esc(SCRIPT_LABEL[script]), tint, nameLine())}
<div class="sd-sec">${stepNo(8, tint)}<b>სიტყვები</b><span>გრძელი სიტყვები ყველა ასოთი — წაიკითხე და ჩაწერე</span></div>
<div class="sd-words sd-long">${long.map(w => `<span class="sd-w"><b class="old">${toScript(w, script)}</b><i></i></span>`).join('')}</div>
<div class="sd-sec">${stepNo(9, tint)}<b>სტრიქონები</b><span>ანდაზები და ცნობილი სტრიქონები — წაიკითხე ხმამაღლა და გადაწერე</span></div>
<div class="sd-lines">${lines.map((l, i) => `<div class="sd-line"><span class="sd-ln">${i + 1}</span><b class="old">${esc(toScript(l, script))}</b><i></i></div>`).join('')}</div>
<div class="sd-keyAt">${keyStrip(script, `გაგიჭირდა? გასაღებში ჩაიხედე: ზემოთ ${SCRIPT_LABEL[script]}, ქვემოთ დღევანდელი ასო`)}</div>
${foot(`<span>${esc(title)} · საკითხავი · ${esc(SCRIPT_LABEL[script])} · ნაბიჯები 8–9</span><span>${esc(SCHOOL)}</span>`)}`, `sdPage sd-${script}`);
};

// ---------- the big key, the copybooks (in the path's order, a step's badge on its first letter) ----------
const keyPage = page(`${stripe(TAG, 'ანბანის გასაღები')}
<div class="sd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('ანბანი')}</div><div class="rsub">33 ასო სამ დამწერლობაში — და თითოეულის ძველი სახელი</div></div>
  ${keyColumns()}
  ${scriptsNote}
</div>
${foot(`<span>${esc(title)} · ანბანის გასაღები</span><span>${esc(SCHOOL)}</span>`)}`, 'sdKey');

const copyPage = script => {
  const tint = TINT[script];
  const order = LETTER_UNITS.flatMap((letters, u) => letters.map((ch, k) => ({ ch, step: k === 0 ? u + 1 : 0 })));
  return page(`${stripe(TAG, `რვეული · ${SCRIPT_LABEL[script]}`)}
<div class="sd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('რვეული')}</div><div class="rsub">${esc(SCRIPT_LABEL[script])}: ჯერ ღია ასოებს შემოავლე, მერე ცარიელ ადგილას თავად დაწერე. რიგი გზისაა — ნაბიჯის ნომერი მის პირველ ასოსთანაა.</div></div>
  <div class="sd-tr">${order.map(({ ch, step }) => {
    const o = toScript(ch, script);
    return `<div class="sd-trc"><i>${step ? `<u style="background:${tint}">${step}</u>` : ''}${ch}</i><b class="old">${o}</b><b class="old f">${o}</b><b class="old f">${o}</b><b class="old f">${o}</b><span></span></div>`;
  }).join('')}</div>
</div>
${foot(`<span>${esc(title)} · ${esc(SCRIPT_LABEL[script])}ს რვეული</span><span>${esc(SCHOOL)}</span>`)}`, `sdKey sd-${script}`);
};

// ---------- „ჩემი გზა“: both paths to colour, the streak's calendar, the master's badge ----------
const BEND = [0, 7, 11, 7, 0, -7, -11, -7, 0];
const pathCol = script => {
  const tint = TINT[script];
  const nodes = Array.from({ length: 9 }, (_, u) => {
    const letters = LETTER_UNITS[u];
    const face = letters ? `<b class="old">${toScript(letters[0], script)}</b>` : icon(u === 7 ? 'book-open' : 'scroll-text', { size: 7, color: tint, width: 1.8 });
    const label = letters
      ? `<span class="old">${letters.map(ch => toScript(ch, script)).join(' ')}</span><i>${letters.join(' ')}</i>`
      : `<em>${u === 7 ? 'სიტყვები' : 'სტრიქონები'}</em>`;
    return `<div class="sd-node" style="transform:translateX(${BEND[u]}mm)"><span class="sd-circle" style="border-color:${tint};color:${tint}">${face}<u style="background:${tint}">${u + 1}</u></span><span class="sd-nlabel">${label}</span></div>`;
  }).join('');
  return `<div class="sd-path"><div class="sd-pathHead" style="background:${tint}">${esc(SCRIPT_LABEL[script])}</div>${nodes}</div>`;
};
const WEEK = ['ორ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვ'];
const WEEKS = 6;
const pathPage = page(`${stripe(TAG, 'ჩემი გზა')}
<div class="sd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('ჩემი გზა')}</div><div class="rsub">ნაბიჯი რომ გაივლი — მისი წრე გააფერადე. ყოველ დღეს, როცა ივარჯიშე, ცეცხლი გააფერადე.</div></div>
  <div class="sd-pp">
    ${OLD.map(pathCol).join('')}
    <div class="sd-side">
      <div class="sd-calHead">${icon('flame', { size: 5.4, color: '#e8731c', width: 2 })}<b>სერია</b><span>დღე ზედიზედ</span></div>
      <div class="sd-cal">${WEEK.map(d => `<span class="sd-wd">${d}</span>`).join('')}${Array.from({ length: WEEKS * 7 }, () => `<span class="sd-day">${icon('flame', { size: 5, color: '#e4cdb0', width: 1.5 })}</span>`).join('')}</div>
      <p class="sd-best">საუკეთესო სერია: <i></i> დღე</p>
      <div class="sd-rulesMini box">
        <b>დღის გაკვეთილი — 5 წუთი</b>
        <ol><li>ნაბიჯის ახალი ასოები გასაღებში ნახე, სახელები თქვი.</li><li>რვეულში თითო ასო ოთხჯერ დაწერე.</li><li>საკითხავ ფურცელზე ნაბიჯის სიტყვები წაიკითხე და ჩაწერე.</li><li>ცეცხლი გააფერადე!</li></ol>
      </div>
      <div class="sd-medal">
        <div class="sd-medalRing">${grapeEmblem(15, C.gold)}<b>${aso('ანბანის')}<br>${aso('ოსტატი')}</b></div>
        <p>ორივე გზა გავიარე</p>
        <p class="sd-sign">მასწავლებელი <i></i></p>
      </div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ჩემი გზა</span><span>${esc(SCHOOL)}</span>`)}`, 'sdKey');

// ---------- the deck: 33 families of three, and a card that says how to play ----------
const CARD = { cols: 4, rows: 5, w: 47, h: 54 };
const cardFront = (ch, script) => `<div class="lc" style="--c:${TINT[script]}">
  <span class="lc-no">${ALPHABET.indexOf(ch) + 1}</span><span class="lc-nm">${esc(nameOf(ch))}</span>
  <b class="lc-l ${cls(script)}">${toScript(ch, script)}</b>
  <span class="lc-sc">${esc(SCRIPT_LABEL[script])}</span>
</div>`;
const helpCard = `<div class="lc lc-help" style="--c:${C.wine}">
  <b class="lc-ht">ბარათებით სათამაშოდ</b>
  <ol><li><b>სამეული</b> — შეაგროვე ასოს სამივე სახე</li><li><b>ჰოპ!</b> — ერთი ასო ზედიზედ? დააფარე ხელი და თქვი სახელი</li><li><b>მეხსიერება</b> — იპოვე წყვილი</li></ol>
  <span class="lc-hf">წესები — ფურცელ 1-ის ზურგზე. ეს ბარათი თამაშის წინ გადადე.</span>
</div>`;
const cardBack = `<div class="lcb"><div class="lcb-in">
  ${grapeEmblem(8.5, '#e2c27a')}
  <span class="lcb-three"><b class="old">${toScript('ა', 'asomtavruli')}</b><b class="old">${toScript('ა', 'nuskhuri')}</b><b class="mk">ა</b></span>
  <span class="aso lcb-t">${aso(title)}</span>
  <span class="lcb-s">${esc(SERIES)}</span>
</div></div>`;
const DECK = [...ALPHABET.flatMap(ch => THREE.map(s => cardFront(ch, s))), helpCard];
const PER = CARD.cols * CARD.rows;
const CARD_SHEETS = Array.from({ length: Math.ceil(DECK.length / PER) }, (_, k) => {
  const part = DECK.slice(k * PER, k * PER + PER);
  const from = ALPHABET[Math.min(32, Math.floor((k * PER) / 3))], to = ALPHABET[Math.min(32, Math.floor((k * PER + part.length - 1) / 3))];
  return {
    key: `cards${k + 1}`,
    front: gridSheet(part, { ...CARD, label: `${title} · ასოების ბარათები ${from}–${to} — წინა მხარე`, cls: 'gsheet sdCards' }),
    back: gridSheet(part.map(() => cardBack), { ...CARD, back: true, label: `${title} · ასოების ბარათები — ზურგი`, cls: 'gsheet sdCards' }),
  };
});

// ---------- the teacher's sheet: the answers and the class game ----------
const answersCol = script => {
  const { units, long, lines } = READ[script];
  return `<div class="sd-acol"><h3 style="color:${TINT[script]}">${esc(SCRIPT_LABEL[script])}</h3>
  <ol class="sd-ans">${units.map((six, u) => `<li><b>${u + 1}</b><span>${six.join(' · ')}</span></li>`).join('')}
  <li><b>8</b><span>${long.join(' · ')}</span></li>
  <li><b>9</b><span>${lines.map((l, i) => `${i + 1}. ${esc(l)}`).join('<br>')}</span></li></ol></div>`;
};
const answersPage = page(`${stripe(TAG, 'პასუხები')}
<div class="sd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('პასუხები')}</div><div class="rsub">მასწავლებელს · საკითხავი ფურცლების სიტყვები და სტრიქონები</div></div>
  <div class="sd-acols">${OLD.map(answersCol).join('')}</div>
  <p class="small">სიტყვები საგანძურის სკოლის აპის თამაშების სიტყვებიდანაა („დღის სიტყვა“, „ოთხეული“), სტრიქონები — აპის ლექსებიდან, მამათა სიტყვებიდან და ანდაზებიდან. ანდაზები Claude-მა ჩაწერა და მასწავლებელს ჯერ არ შეუმოწმებია.</p>
</div>
${foot(`<span>${esc(title)} · პასუხები</span><span>${esc(SCHOOL)}</span>`)}`, 'sdKey');

const TEAMS = 6, TICKS = 30;
const classPage = page(`${stripe(TAG, 'კლასის თამაში')}
<div class="sd-kp">
  <div class="rhead"><div class="aso rtitle">${aso('სწრაფი კითხვა')}</div><div class="rsub">მასწავლებლის ფურცელი · მთელი კლასი, 2–6 გუნდი</div></div>
  <div class="box sd-cg"><ol>
    <li>კლასი გუნდებად დაყავით. მასწავლებელი ბარათების დასტიდან <b>ასომთავრულ ან ნუსხურ ბარათს</b> აჩვენებს (მხედრულები გვერდზე გადადეთ) — ან საკითხავი ფურცლიდან სიტყვას დაფაზე წერს.</li>
    <li>ვინც <b>პირველი</b> წაიკითხავს ხმამაღლა სწორად — ასოს დღევანდელ სახეს ან სახელს („დონი!“), სიტყვას — მის გუნდს <b>1 ქულა</b>; სტრიქონი — <b>2 ქულა</b>. ვერავინ? ბარათი დასტის ბოლოში ბრუნდება.</li>
    <li>დასაწყისში დაფაზე ანბანის გასაღები გააკარით; ორი-სამი რაუნდის მერე — ჩამოხსენით.</li>
    <li>ქულები ქვემოთ, გუნდის რიგში მონიშნეთ. 10, 15 ან 20 ბარათის მერე — ვინ მეტი!</li>
  </ol></div>
  ${[1, 2].map(g => `<h3 class="sd-h3">ქულები · თამაში №${g}<span class="sd-date">თარიღი<i></i></span></h3>
  <table class="t sd-sc"><tr><th>გუნდი</th><th>ქულები — თითო უჯრა ერთი</th><th>ჯამი</th></tr>${Array.from({ length: TEAMS }, () => `<tr><td></td><td><span class="sd-ticks">${'<i></i>'.repeat(TICKS)}</span></td><td></td></tr>`).join('')}</table>`).join('')}
  <h3 class="sd-h3">ასოების ჰოპ! — მთელი კლასისთვის</h3>
  <p class="sd-cgp">ორ ბავშვს თითო ბარათი მიეცით (ერთი ასოს ორი სახე ან ორი სხვადასხვა ასო). „სამი, ორი, ერთი!“ — ერთდროულად აჩვენებენ. ერთი ასოა? ვინც პირველი იტყვის „ჰოპ!“ და ასოს სახელს, ორივე ბარათს იღებს. მერე შემდეგი წყვილი.</p>
</div>
${foot(`<span>${esc(title)} · კლასის თამაში</span><span>${esc(SCHOOL)}</span>`)}`, 'sdKey');

// ---------- cover and rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ასომთავრული და ნუსხური — ქართული ანბანის ძველი სახეები — ასო-ასო, ყოველდღე ხუთი წუთით. ჯერ ყველაზე ხშირი ასოები, რომ სიტყვები მალე წაიკითხო; ცხრა ნაბიჯში კი ძველი წარწერები და სტრიქონები თავისუფლად იკითხება. ბარათებით თამაშიც შეიძლება: ყოველ ასოს სამი სახე აქვს — სამეული.<br><b>${META}</b></div>
  <div class="sd-ex box">
    <div class="sd-exCards">${THREE.map(s => `<div class="sd-exCard">${cardFront('დ', s)}</div>`).join('')}</div>
    <p><b>სამეული.</b> ერთი ასო — „დონი“ — სამ დამწერლობაში: ასომთავრული, ნუსხური და დღევანდელი მხედრული. ბარათზე კუთხეში ასოს რიგითი ნომერი და სახელია: სამივეს ერთი და იგივე. 33 ასო, 99 ბარათი.</p>
  </div>
  <h3 class="sq-h3">რა არის ამ ფაილში</h3>
  <table class="t comp">
    <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>ქაღალდი</th><th>ბეჭდვა</th></tr>
    <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ანბანის დიდი გასაღები · ზურგზე ასომთავრულის რვეული</td><td>1</td><td>${no('key')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>ნუსხურის რვეული · ზურგზე „ჩემი გზა“ და სერიის კალენდარი</td><td>1</td><td>${no('path')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>საკითხავი ფურცელი: ასომთავრული · ნუსხური</td><td>2</td><td>${no('read1')}–${no('read2')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span> <span class="chk"></span></td></tr>
    <tr><td>ასოების ბარათები (33 ასო × 3 დამწერლობა) + 1 დამხმარე</td><td>100</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS.length}`)}</td><td>სქელი, 160–250 გ/მ²</td><td>${CARD_SHEETS.map(() => '<span class="chk"></span>').join(' ')}</td></tr>
    <tr><td>პასუხები · ზურგზე კლასის თამაში (მასწავლებელს)</td><td>1</td><td>${no('teacher')}</td><td>ჩვეულებრივი</td><td><span class="chk"></span></td></tr>
    <tr><td>მაკრატელი, ფანქარი, ფერადი ფანქრები</td><td>—</td><td>—</td><td>საყიდელია</td><td><span class="chk"></span></td></tr>
  </table>
  <div class="two">
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული).</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS.length}`)}) სქელ ქაღალდზე; ჭრის ნიშნებზე გაჭერით — 100 ბარათი, ზურგი ყველას ერთნაირი.</li>
        <li>რვეული, „ჩემი გზა“ და საკითხავი ფურცლები — თითო ბავშვს თითო ასლი.</li>
        <li>მასწავლებლის ფურცელი (${no('teacher')}) — ერთი ასლი.</li>
      </ol>
    </div>
    <div>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ენის სწავლის ცნობილი აპის — Duolingo-ს — იდეით (ყოველდღიური პატარა გაკვეთილი, სერია) და ბარათების თამაშებით „ოჯახები“ და Snap. სიტყვები საგანძურის სკოლის აპის თამაშებიდანაა, სტრიქონები — აპის ტექსტებიდან; ანდაზები Claude-მა ჩაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
      <p class="small">აპში იგივე გზაა სამი გულით, სერიით და თითით მოსახაზი ასოებით, კლასში კი გუნდები ერთ ეკრანზე ეჯიბრებიან: sagandzureli.ge → თამაშები → სამი დამწერლობა.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['ყოველდღე ხუთი წუთი', `ორივე ძველ დამწერლობას თავისი გზა აქვს — ცხრა ნაბიჯი: 1–7 ნაბიჯში 33 ასოა (ჯერ ყველაზე ხშირი), მე-8 — გრძელი სიტყვები, მე-9 — სტრიქონები. ერთ დღეს — ერთი ნაბიჯი. ჯერ ასომთავრული, მერე ნუსხური (ან პირიქით).`],
  ['დღის გაკვეთილი', `ა) ნაბიჯის ახალი ასოები ანბანის გასაღებში (${no('key')}) იპოვე და სახელები ხმამაღლა თქვი. ბ) რვეულში (ასომთავრული — ${no('key')}-ის ზურგზე, ნუსხური — ${no('path')}-ის წინა მხარეს) თითო ასოს ჯერ შემოავლე, მერე თავად დაწერე. გ) საკითხავ ფურცელზე (${no('read1')}–${no('read2')}) ნაბიჯის ექვსი სიტყვა წაიკითხე და ქვემოთ მხედრულით ჩაწერე.`],
  ['ჩემი გზა', `ფურცელ ${no('path')}-ის ზურგზე: ნაბიჯის სიტყვები გასაღების გარეშე რომ წაიკითხე — მისი წრე გააფერადე. ყოველ დღეს, როცა ივარჯიშე, კალენდარში ცეცხლი გააფერადე: რამდენი დღე ზედიზედ? ორივე გზა რომ გაივლი, მასწავლებელი „ანბანის ოსტატს“ მოგიწერს.`],
  ['სამეული', 'ბარათების თამაში 3–5 მოთამაშეზე. თითოს 7 ბარათი, დანარჩენი — დასტად. შენს ჯერზე ნებისმიერ მოთამაშეს სთხოვე ბარათი, რომლის ასოც ხელში გიჭირავს: „ნინო, ნუსხური „ბანი“ გაქვს?“ აქვს — გაძლევს და კიდევ ითხოვ; არ აქვს — „წაიღე!“: დასტიდან ერთს იღებ და ჯერი გადადის. ასოს სამივე სახე რომ შეაგროვე — სამეული მაგიდაზე დადე. ბოლოს ვისაც მეტი სამეული აქვს, ის იგებს. პატარებთან ჯერ 1–3 ნაბიჯის ასოებით ითამაშეთ.'],
  ['ჰოპ!', '2–4 მოთამაშე. ბარათები თანაბრად დაურიგეთ, პირქვე. რიგრიგობით ზედა ბარათს ამოაბრუნებთ და შუაში, საერთო დასტაზე დებთ. ახალი ბარათი იმავე ასოა, რაც მის ქვეშ (ნებისმიერი დამწერლობით)? ვინც პირველი დააფარებს ხელს და იტყვის ასოს სახელს („ჰოპ — დონი!“), მთელ დასტას იღებს. ტყუილი „ჰოპ“ — ყველას თითო ბარათი მიეცი. ვინც ყველა ბარათს მოაგროვებს ან 10 წუთში მეტს — იგებს.'],
  ['მეხსიერება', 'ერთი ნაბიჯის ასოები აიღე: ასომთავრული და მხედრული ბარათები, პირქვე. ორ ბარათს ამოაბრუნებ: ერთი ასოა — შენია და კიდევ აბრუნებ; არა — უკან აბრუნებ. მერე ნუსხური და მხედრული, ბოლოს — ყველაზე რთული: ასომთავრული და ნუსხური!'],
  ['მთელი კლასი', `„სწრაფი კითხვა“: მასწავლებელი ბარათს აჩვენებს, გუნდები ეჯიბრებიან, ვინ წაიკითხავს პირველი. წესები და ქულების ცხრილი მასწავლებლის ფურცლის (${no('teacher')}) ზურგზეა.`],
  ['აპშიც', 'საგანძურის სკოლის აპში იგივე ცხრა ნაბიჯია: სამი გული (შეცდომა ერთს აკლებს), სერია, თითით მოსახაზი ასოები და გამეორება იმ ასოებისა, რომლებშიც ხშირად შეცდი.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 6 წლიდან · ყოველდღე 5–10 წუთი</div></div>
  <p class="lead">„სამი დამწერლობა“ ძველი ქართული ასოების სწავლის გზაა: ყოველდღე პატარა ნაბიჯი — ასოები, სიტყვები, სტრიქონები — და ბარათების თამაშები, რომ ასოები თვალში ჩაგრჩეს.</p>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="sd-rmore">
    <div class="box"><h3>ბარათი</h3><div class="sd-rcard">${cardFront('ბ', 'nuskhuri')}</div><p class="small">კუთხეში — ასოს რიგითი ნომერი (1–33) და ძველი სახელი; ქვემოთ — დამწერლობა. ერთი ასოს სამ ბარათს ერთი ნომერი აქვს.</p></div>
    ${scriptsNote}
  </div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${oldCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.sq-h3{margin:0 0 2mm;color:var(--wine);font-size:12pt}
.cover table.comp{margin-bottom:1.5mm}
.cover .two{margin-top:4mm}
.mk{font-family:'SansKa',sans-serif;font-weight:700}
.sd-head{display:flex;align-items:center;gap:3mm;margin:5mm 12mm 0;border-bottom:.3mm solid var(--gold);padding-bottom:1.2mm}
.sd-head b{font-size:14pt;color:var(--wine)}
.sd-badge{color:var(--paper);font-weight:700;font-size:9.5pt;padding:.3mm 2.6mm .6mm;border-radius:2mm}
.sd-name{display:flex;align-items:flex-end;gap:2mm;font-size:9.5pt;margin-left:auto}
.sd-name i{border-bottom:.25mm solid #bba98f;height:4mm}
.sd-how{margin:1.6mm 12mm 0;font-size:9.4pt;line-height:1.3;color:var(--muted)}
.sd-no{flex:none;width:7mm;height:7mm;border-radius:50%;color:#fff;font-family:'SansKa',sans-serif;font-weight:800;font-size:10.5pt;display:inline-flex;align-items:center;justify-content:center}
.sd-tiles{display:flex;gap:.8mm}
.sd-tiles>span{width:8.6mm;height:10.6mm;border:.2mm solid var(--line);border-radius:.9mm;background:var(--paper);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4mm}
.sd-tiles b{font-size:15pt;font-weight:400;line-height:1;color:#2f2018}
.sd-tiles i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:8pt;line-height:1;color:var(--muted)}
.sd-units{position:absolute;left:12mm;right:12mm;top:37mm;bottom:15mm;display:flex;flex-direction:column;justify-content:space-between}
.sd-unit{display:grid;grid-template-columns:58mm 1fr;gap:4mm;align-items:center;padding:1.6mm 0}
.sd-unit + .sd-unit{border-top:.2mm dashed #d9c9ad}
.sd-uhead{display:flex;align-items:center;gap:2mm}
.sd-words{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));column-gap:4mm;row-gap:2.2mm}
.sd-w{display:flex;flex-direction:column;gap:1mm;min-width:0}
.sd-w b{font-weight:400;font-size:15.5pt;line-height:1.1;color:#2f2018;white-space:nowrap}
.sd-w i{display:block;height:5.8mm;border-bottom:.3mm solid #b9a88f;background:linear-gradient(#efe6d6,#efe6d6) 0 55% / 100% .2mm no-repeat}
.sd-sec{display:flex;align-items:center;gap:2.4mm;margin:5mm 12mm 2.4mm}
.sd-sec>b{font-size:13pt;color:var(--wine)}
.sd-sec>span{font-size:9.4pt;color:var(--muted)}
.sd-long{margin:0 12mm;row-gap:3.4mm}
.sd-long .sd-w b{font-size:16.5pt}
.sd-lines{margin:0 12mm;display:flex;flex-direction:column;gap:3.6mm}
.sd-line{display:grid;grid-template-columns:7mm 1fr;column-gap:2mm;row-gap:1mm;align-items:end}
.sd-ln{grid-row:span 2;align-self:start;margin-top:1mm;width:6mm;height:6mm;border-radius:50%;background:var(--parch);color:var(--wine);font-family:'SansKa',sans-serif;font-weight:800;font-size:9pt;display:flex;align-items:center;justify-content:center}
.sd-line b{font-weight:400;font-size:16pt;line-height:1.15;color:#2f2018}
.sd-line i{display:block;height:7.4mm;border-bottom:.3mm solid #b9a88f;background:linear-gradient(#efe6d6,#efe6d6) 0 55% / 100% .2mm no-repeat}
.sd-keyAt{position:absolute;left:12mm;right:12mm;bottom:17mm}
.sd-kp{padding:6mm 12mm 0}
.sd-tr{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(11,20.6mm);grid-auto-flow:column;column-gap:6mm;margin-top:2mm}
.sd-trc{display:grid;grid-template-columns:9mm repeat(4,1fr) 1.4fr;align-items:end;border-bottom:.3mm solid #cdbb9e;padding-bottom:1.2mm;background:linear-gradient(#efe6d6,#efe6d6) 0 42% / 100% .2mm no-repeat}
.sd-trc i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:10pt;color:var(--wine);align-self:center;display:flex;align-items:center;gap:.8mm}
.sd-trc i u{text-decoration:none;width:4.2mm;height:4.2mm;border-radius:50%;color:#fff;font-size:7.2pt;display:inline-flex;align-items:center;justify-content:center;margin-left:-1mm}
.sd-trc b{font-weight:400;font-size:25pt;line-height:1;text-align:center;color:#2f2018}
.sd-asomtavruli .sd-trc b{font-size:22pt}
.sd-asomtavruli .sd-w b{font-size:17pt}
.sd-asomtavruli .sd-long .sd-w b{font-size:17.5pt}
.sd-nuskhuri .sd-w b{font-size:18.5pt}
.sd-nuskhuri .sd-long .sd-w b{font-size:20pt}
.sd-nuskhuri .sd-line b{font-size:19pt}
.sd-trc b.f{color:#ddd0bb}
.sd-pp{display:grid;grid-template-columns:58mm 58mm 1fr;gap:5mm;margin-top:3mm}
.sd-path{display:flex;flex-direction:column;align-items:center}
.sd-pathHead{color:#fff;font-weight:700;font-size:10pt;padding:.6mm 4mm .9mm;border-radius:2mm;margin-bottom:2.4mm}
.sd-node{display:flex;flex-direction:column;align-items:center;height:24.2mm}
.sd-circle{position:relative;width:14.6mm;height:14.6mm;border-radius:50%;border:.7mm solid;background:#fff;display:flex;align-items:center;justify-content:center}
.sd-circle b{font-weight:400;font-size:21pt;line-height:1;opacity:.55}
.sd-circle u{position:absolute;right:-1.6mm;top:-1.2mm;text-decoration:none;width:5mm;height:5mm;border-radius:50%;color:#fff;font-family:'SansKa',sans-serif;font-weight:800;font-size:8pt;display:flex;align-items:center;justify-content:center;border:.4mm solid #fff}
.sd-nlabel{margin-top:1mm;display:flex;flex-direction:column;align-items:center;line-height:1.1}
.sd-nlabel .old{font-size:11pt;letter-spacing:.06em;color:#2f2018}
.sd-nlabel i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:7.6pt;letter-spacing:.14em;color:var(--muted)}
.sd-nlabel em{font-style:normal;font-weight:700;font-size:9pt;color:var(--brown)}
.sd-side{display:flex;flex-direction:column;gap:3mm}
.sd-calHead{display:flex;align-items:center;gap:1.4mm}
.sd-calHead b{font-size:12pt;color:#c25b12}
.sd-calHead span{font-size:8.6pt;color:var(--muted);margin-left:auto}
.sd-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:.9mm}
.sd-wd{font-family:'SansKa',sans-serif;font-weight:700;font-size:6.8pt;color:var(--muted);text-align:center}
.sd-day{aspect-ratio:1;border:.25mm solid #e4cdb0;border-radius:1.2mm;display:flex;align-items:center;justify-content:center;background:#fffaf2}
.sd-best{margin:0;font-size:9.4pt;display:flex;align-items:flex-end;gap:1.5mm}
.sd-best i{width:12mm;border-bottom:.25mm solid #bba98f;height:4mm}
.sd-rulesMini{font-size:8.8pt;line-height:1.3;padding:2.6mm 3mm}
.sd-rulesMini b{color:var(--wine);font-size:9.4pt}
.sd-rulesMini ol{margin:1.2mm 0 0;padding-left:4mm}
.sd-rulesMini li{margin-bottom:.8mm}
.sd-medal{margin-top:auto;display:flex;flex-direction:column;align-items:center;text-align:center;padding-bottom:4mm}
.sd-medalRing{width:38mm;height:38mm;border-radius:50%;border:1mm solid var(--gold);box-shadow:0 0 0 1.4mm #fff,0 0 0 1.7mm var(--gold);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;background:var(--paper)}
.sd-medalRing b{font-family:'SansKa',sans-serif;font-weight:900;font-size:10pt;color:var(--wine);line-height:1.15;letter-spacing:.06em}
.sd-medal p{margin:2.4mm 0 0;font-size:9.4pt;font-weight:700;color:var(--brown)}
.sd-sign{display:flex;align-items:flex-end;gap:1.5mm;font-weight:400!important;color:var(--muted)!important}
.sd-sign i{width:24mm;border-bottom:.25mm solid #bba98f;height:4mm}
.lc{position:absolute;inset:1.6mm;border:.6mm solid var(--c);border-radius:2.4mm;background:#fff;overflow:hidden}
.lc-no{position:absolute;left:1.6mm;top:1.6mm;width:6.2mm;height:6.2mm;border-radius:50%;background:var(--c);color:#fff;font-family:'SansKa',sans-serif;font-weight:800;font-size:8.6pt;display:flex;align-items:center;justify-content:center}
.lc-nm{position:absolute;right:2.2mm;top:2.2mm;font-size:9.4pt;font-weight:700;color:var(--c)}
.lc-l{position:absolute;left:0;right:0;top:8mm;bottom:8mm;display:flex;align-items:center;justify-content:center;line-height:1;color:#2f2018;font-weight:400}
.lc-l.old{font-size:60pt}
.lc-l.mk{font-size:42pt;font-weight:700}
.lc-sc{position:absolute;left:0;right:0;bottom:0;height:6.6mm;background:var(--c);color:#fff;font-size:8.6pt;font-weight:700;display:flex;align-items:center;justify-content:center}
.lc-help{padding:3mm 3mm 0;display:flex;flex-direction:column;gap:1.6mm}
.lc-ht{font-size:9.6pt;color:var(--wine);line-height:1.15}
.lc-help ol{margin:0;padding-left:3.6mm;font-size:7.6pt;line-height:1.25}
.lc-help li{margin-bottom:1mm}
.lc-help li b{color:var(--wine)}
.lc-hf{margin-top:auto;margin-bottom:2.4mm;font-size:7pt;line-height:1.2;color:var(--muted)}
.lcb{position:absolute;inset:-.3mm;background:var(--wine)}
.lcb-in{position:absolute;inset:2.9mm;border:.35mm solid var(--gold);border-radius:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;background:radial-gradient(circle at 50% 42%,#8d2a33 0,#7a2028 60%)}
.lcb-three{display:flex;gap:2.2mm;align-items:baseline;color:#f0d9a0}
.lcb-three b{font-weight:400;font-size:22pt;line-height:1}
.lcb-three b.mk{font-size:15pt;font-weight:700}
.lcb-t{font-size:8.4pt;color:#f0d9a0;letter-spacing:.06em;text-align:center;line-height:1.2;padding:0 2mm}
.lcb-s{font-size:6.6pt;color:var(--paper);opacity:.8}
.sd-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:3mm 5mm}
.sd-exCards{display:flex;gap:2mm}
.sd-exCard{position:relative;width:30mm;height:34.5mm}
.sd-exCard .lc{inset:0;border-width:.45mm}
.sd-exCard .lc-l.old{font-size:38pt}
.sd-exCard .lc-l.mk{font-size:27pt}
.sd-exCard .lc-l{top:5.6mm;bottom:5.6mm}
.sd-exCard .lc-no{width:4.6mm;height:4.6mm;font-size:6.6pt;left:1.1mm;top:1.1mm}
.sd-exCard .lc-nm{font-size:7pt;right:1.4mm;top:1.4mm}
.sd-exCard .lc-sc{height:4.8mm;font-size:6.4pt}
.sd-ex p{font-size:10pt;line-height:1.4;margin:0}
.sd-rmore{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:4mm;align-items:start}
.sd-rmore h3{margin:0 0 2mm;color:var(--wine);font-size:11pt}
.sd-rmore .os-hist{margin-top:0}
.sd-rmore .box:first-child{display:grid;grid-template-columns:auto 1fr;column-gap:4mm;align-items:center}
.sd-rmore .box:first-child h3{grid-column:1 / -1}
.sd-rcard{position:relative;width:30mm;height:34.5mm}
.sd-rcard .lc{inset:0;border-width:.45mm}
.sd-rcard .lc-l.old{font-size:38pt}
.sd-rcard .lc-l{top:5.6mm;bottom:5.6mm}
.sd-rcard .lc-no{width:4.6mm;height:4.6mm;font-size:6.6pt;left:1.1mm;top:1.1mm}
.sd-rcard .lc-nm{font-size:7pt;right:1.4mm;top:1.4mm}
.sd-rcard .lc-sc{height:4.8mm;font-size:6.4pt}
.sd-rmore .small{margin:0}
.sd-acols{display:grid;grid-template-columns:1fr 1fr;gap:6mm;margin-top:2mm}
.sd-acol h3{margin:0 0 1.6mm;font-size:12pt}
.sd-ans{list-style:none;margin:0 0 3mm;padding:0}
.sd-ans li{display:grid;grid-template-columns:7mm 1fr;gap:1.6mm;padding:1.9mm 0;border-bottom:.15mm solid var(--line)}
.sd-ans li>b{width:5.6mm;height:5.6mm;border-radius:50%;background:var(--parch);color:var(--wine);font-family:'SansKa',sans-serif;font-size:8.4pt;display:flex;align-items:center;justify-content:center}
.sd-ans span{font-size:10.6pt;line-height:1.38;color:var(--brown)}
.sd-cg{font-size:9.8pt;line-height:1.38;margin-top:1mm}
.sd-cg ol{margin:0;padding-left:5mm}
.sd-cg li{margin-bottom:1.4mm}
.sd-cg b{color:var(--wine)}
.sd-h3{margin:4.4mm 0 1.8mm;color:var(--wine);font-size:11.5pt;display:flex;align-items:flex-end;gap:2mm}
.sd-date{margin-left:auto;display:flex;align-items:flex-end;gap:1.5mm;font-size:9pt;font-weight:400;color:var(--muted)}
.sd-date i{width:28mm;border-bottom:.25mm solid #bba98f;height:4mm}
table.sd-sc th{text-align:center}
table.sd-sc th:first-child{width:46mm}
table.sd-sc th:last-child{width:18mm}
table.sd-sc td{height:9.6mm;vertical-align:middle;padding-top:.8mm;padding-bottom:.8mm}
.sd-ticks{display:grid;grid-template-columns:repeat(15,1fr);gap:.8mm}
.sd-ticks i{height:3.4mm;border:.2mm solid var(--line);border-radius:.6mm;background:#fff}
.sd-cgp{margin:0;font-size:9.8pt;line-height:1.38}
`;

const SHEETS = [
  { key: 'cover' },
  { key: 'key', front: keyPage, back: copyPage('asomtavruli') },
  { key: 'path', front: copyPage('nuskhuri'), back: pathPage },
  { key: 'read1', front: wordsPage('asomtavruli'), back: linesPage('asomtavruli') },
  { key: 'read2', front: wordsPage('nuskhuri'), back: linesPage('nuskhuri') },
  ...CARD_SHEETS,
  { key: 'teacher', front: answersPage, back: classPage },
];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

// a word too long for its cell, or a page's lines running into the key, stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.sd-w b').forEach(b => { if (b.scrollWidth > b.parentElement.clientWidth + 1) bad.push(b.textContent); });
  document.querySelectorAll('.sd-keyAt').forEach(k => {
    const lines = k.closest('.page').querySelector('.sd-lines');
    if (lines && lines.getBoundingClientRect().bottom > k.getBoundingClientRect().top - 8) bad.push('lines over the key');
  });
  document.querySelectorAll('.sd-units').forEach(u => { if (u.scrollHeight > u.clientHeight + 1) bad.push('steps over the page'); });
  document.querySelectorAll('.sd-kp, .rulesWrap, .cover').forEach(k => {
    const f = k.closest('.page').querySelector('.foot');
    if (f && k.getBoundingClientRect().bottom > f.getBoundingClientRect().top) bad.push('a page runs into its footer: ' + k.closest('.page').querySelector('.stripe')?.textContent);
  });
  if (bad.length) throw new Error('sami-damtserloba: ' + bad.join(', '));
})()`;

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
