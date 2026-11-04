// „გათვლა“ on paper — the სამაგიდო variant of the app's counting tool (2026-11-04): no phone. The app's three counting rhymes
// (utils/gatvla.ts `BUILT_IN_RHYMES`, words by `beatsOf`) with every word's beat numbered and where the last one lands in
// circles of 2–12 (`countOut`), three frames for the class's own; „ვისი ჯერია?“ = a wheel of 12 and of 24 places spun with
// a paper clip on a pencil point, and the fair-turns sheet (a box a turn; a pick with more boxes than the fewest spins again —
// the app's wheel picks the one asked least); teams by drawing tokens from a bag (four colours, each with its mark for a print
// without colour, numbered 1–16 = the order inside the team), ★ = who starts.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss, tokenSheet } from '../lib.js';
import { partsCss, step } from '../kitParts.js';
import * as __d0 from '../../utils/gatvla';

const { BUILT_IN_RHYMES, beatsOf, countOut } = ({ ...__d0 });

export const id = 'gatvla';
export const title = 'გათვლა';
const TAG = 'ქართული · უტელეფონო';
const META = '2–40 მოთამაშე · 4 წლიდან · 1–10 წუთი';
const GREEN = '#2f7d4f';
/** frames for the class's own rhymes */
const OWN = 3;
/** the circles the rhymes' table answers for */
const CIRCLES = Array.from({ length: 11 }, (_, k) => k + 2);
const TURN_ROWS = 30;
const TURN_BOXES = 14;
const TEAMS = [
  { name: 'ყვითელი', fill: '#f6d66e', ink: '#7a5a0c', icon: 'sun' },
  { name: 'მწვანე', fill: '#a8d48c', ink: '#2c5f27', icon: 'leaf' },
  { name: 'ცისფერი', fill: '#a6c8ea', ink: '#1d4f7c', icon: 'droplet' },
  { name: 'იისფერი', fill: '#cfa6d4', ink: '#5f2a68', icon: 'grape' },
];
const PER_TEAM = 16;
const STARS = 8;

const RHYMES = BUILT_IN_RHYMES.map(r => ({ ...r, words: beatsOf(r.text) }));
/** where a rhyme of `words` words lands in a circle of `m` when its first word falls on the first one (1 = the first) */
const lands = (words, m) => countOut(m, words, 0) + 1;

// ---------- the rhymes ----------
const rhymeBox = r => `<div class="gv-rh box">
  <div class="gv-rhHead"><b>${esc(r.title)}</b><span class="gv-n">${r.words.length} სიტყვა</span></div>
  <p class="gv-words">${r.words.map((w, i) => `<span class="gv-w${i === r.words.length - 1 ? ' last' : ''}">${esc(w)}<i>${i + 1}</i></span>`).join('')}</p>
  <table class="gv-land"><tr><th>წრეში</th>${CIRCLES.map(m => `<td>${m}</td>`).join('')}</tr><tr><th>დაეცემა</th>${CIRCLES.map(m => `<td><b>${lands(r.words.length, m)}</b></td>`).join('')}</tr></table>
</div>`;
const ownBox = k => `<div class="gv-own">
  <div class="gv-rhHead"><b>ჩვენი ლექსი ${k + 1}</b><span class="gv-n">სიტყვა: <i></i></span></div>
  <div class="gv-lines">${'<i></i>'.repeat(3)}</div>
</div>`;

const rhymesPage = page(`<div class="gv-mHead"><span class="aso">${aso(title)}</span><b>გათვლის ლექსები</b><span class="gv-hint">${icon('hand', { size: 4.4, color: C.wine, width: 2 })} ყოველ სიტყვაზე — შემდეგი</span></div>
<div class="gv-rhs">${RHYMES.map(rhymeBox).join('')}${Array.from({ length: OWN }, (_, k) => ownBox(k)).join('')}</div>
<div class="gv-legend">ციფრი სიტყვის ქვეშ — მერამდენე დათვლაა; <b class="g">მწვანე</b> — ბოლო, ის ირჩევს. ცხრილი: რამდენნი ხართ წრეში და მერამდენეზე დაეცემა ბოლო სიტყვა, თუ პირველი სიტყვა პირველს დაეცა. შენი ლექსისთვის: სიტყვები დაითვალე და წრის რიცხვზე გაყავი — ნაშთი 3 მესამეზე დაეცემა, ნაშთი 0 — ბოლოზე.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ლექსები</div>`, 'gv-rP');

// ---------- „ვისი ჯერია?“: the fair turns ----------
const turnsPage = page(`<div class="gv-tu">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ვისი ჯერია?</b><span class="rs-date">კლასი <i></i> თვე <i></i></span></div>
  <p class="rs-scHint">სახელები ჩაწერე. ვისაც ჯერი შეხვდა — კითხვა, სიმღერა, დავალება, — მის სტრიქონში ერთ უჯრას გადახაზავ. ბორბალმა ის აირჩია, ვისაც სხვებზე მეტი უჯრა აქვს? ხელახლა დაატრიალე: ასე ყველას თანაბრად შეხვდება.</p>
  <table class="gv-tab">
    <tr><th class="n">№</th><th class="who">სახელი</th>${Array.from({ length: TURN_BOXES }, (_, k) => `<th class="b">${k + 1}</th>`).join('')}<th class="s">სულ</th></tr>
    ${Array.from({ length: TURN_ROWS }, (_, r) => `<tr><td class="n">${r + 1}</td><td class="who"></td>${'<td class="b"></td>'.repeat(TURN_BOXES)}<td class="s"></td></tr>`).join('')}
  </table>
  <div class="rs-remind box">
    <div>${icon('rotate-cw', { size: 5, color: C.wine, width: 1.9 })}<span><b>ბორბალი</b> — ფანქრის წვერი შუაში, სამაგრი ზედ; თითი გაჰკარი.</span></div>
    <div>${icon('scale', { size: 5, color: C.wine, width: 1.9 })}<span><b>სამართლიანად</b> — სხვებზე მეტი უჯრა აქვს? ხელახლა.</span></div>
    <div>${icon('star', { size: 5, color: C.goldDark, width: 1.9 })}<span><b>★ ჟეტონი</b> — ვინც ჩანთიდან ამოიღებს, ის იწყებს.</span></div>
    <div>${icon('target', { size: 5, color: GREEN, width: 1.9 })}<span><b>ვის შეხვდება?</b> — სწორ გამოცნობასაც აქ აღნიშნავ.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ვისი ჯერია?</div>`, 'rs-scP');

// ---------- the wheel: places round a centre, spun with a paper clip on a pencil point ----------
const f = v => v.toFixed(2);
const wheelSvg = n => {
  const W = 190, c = W / 2, R = 90, h = Math.PI / n;
  const pt = (r, a) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const inner = n > 16 ? 24 : 16;
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + k * 2 * h;
    const [x0, y0] = pt(R, a - h), [x1, y1] = pt(R, a + h);
    s += `<path d="M${c} ${c} L${f(x0)} ${f(y0)} A${R} ${R} 0 0 1 ${f(x1)} ${f(y1)} Z" fill="${TEAMS[k % TEAMS.length].fill}" fill-opacity=".38" stroke="${C.brown}" stroke-width=".35"/>`;
    const [lx0, ly0] = pt(inner, a), [lx1, ly1] = pt(R - 14, a);
    s += `<line x1="${f(lx0)}" y1="${f(ly0)}" x2="${f(lx1)}" y2="${f(ly1)}" stroke="#8f7d68" stroke-width=".3"/>`;
    const [nx, ny] = pt(R - 7, a);
    s += `<circle cx="${f(nx)}" cy="${f(ny)}" r="4.3" fill="#fff" stroke="${C.wine}" stroke-width=".4"/><text x="${f(nx)}" y="${f(ny + 1.55)}" text-anchor="middle" font-size="4.4" font-weight="800" fill="${C.wine}">${k + 1}</text>`;
  }
  s += `<circle cx="${c}" cy="${c}" r="${R}" fill="none" stroke="${C.wine}" stroke-width="1"/>`;
  s += `<circle cx="${c}" cy="${c}" r="7" fill="#fff" stroke="${C.wine}" stroke-width=".5"/><circle cx="${c}" cy="${c}" r="1" fill="${C.wine}"/>`;
  s += `<path d="M${c - 4} ${c}h2.2M${c + 1.8} ${c}h2.2M${c} ${c - 4}v2.2M${c} ${c + 1.8}v2.2" stroke="${C.wine}" stroke-width=".4"/>`;
  return `<svg viewBox="0 0 ${W} ${W}" width="${W}mm" height="${W}mm">${s}</svg>`;
};
const wheelPage = n => page(`<div class="gv-mHead"><span class="aso">${aso(title)}</span><b>ბორბალი · ${n} ადგილი</b><span class="gv-hint">${icon('rotate-cw', { size: 4.4, color: C.wine, width: 2 })} ვისი ჯერია?</span></div>
<div class="gv-wheel">${wheelSvg(n)}</div>
<div class="gv-spin">
  ${step('pencil', 'სახელები ხაზებზე ჩაწერე, შუიდან კიდისკენ: ერთ ადგილზე — ერთი. ადგილი თუ მეტია, ზოგი ცარიელი დარჩეს.')}
  ${step('paperclip', 'ფანქრის წვერი შუა წერტილზე დაადე და ქაღალდის სამაგრი (სკრეპი) ფანქარს გადააცვი.')}
  ${step('rotate-cw', 'სამაგრს თითი გაჰკარი: რომელ ადგილზეც გაჩერდება მისი ბოლო, იმის ჯერია. ცარიელზე ან ხაზზე — ხელახლა.')}
  ${step('scale', 'ვინ რამდენჯერ — „ვისი ჯერია?“ ფურცელზე (ფურცელი 2-ის ზურგი).')}
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ბორბალი ${n}</div>`, 'gv-wP');

// ---------- the tokens: four teams' colours, each with its mark, and ★ ----------
const teamToken = (t, n) => `<div class="gv-tok" style="background:${t.fill}"><div class="gv-ring"></div>${icon(t.icon, { size: 4.6, color: t.ink, width: 2.1 })}<b style="color:${t.ink}">${n}</b><span style="color:${t.ink}">${t.name}</span></div>`;
const starToken = `<div class="gv-tok gv-star"><div class="gv-ring"></div>${icon('star', { size: 8.4, color: '#f0d9a0', width: 1.8 })}<span>იწყებს</span></div>`;
const TOKENS = [...TEAMS.flatMap(t => Array.from({ length: PER_TEAM }, (_, k) => teamToken(t, k + 1))), ...Array(STARS).fill(starToken)];
const TOKEN_GRID = { d: 23, gap: 1.4, cols: 8, rows: 9 };

// ---------- the cover and the rules ----------
const EX_NAMES = ['ნინო', 'გიორგი', 'ანა', 'ლუკა', 'მარიამი', 'დათო'];
const EX = RHYMES.find(r => r.words.length === 2 * EX_NAMES.length) ?? RHYMES[0];
const EX_LAND = countOut(EX_NAMES.length, EX.words.length, 0);
const exampleSvg = () => {
  const n = EX_NAMES.length, beats = EX.words.length, W = 80, c = W / 2, R = 27;
  const p = (r, a) => [c + r * Math.cos(a), c + r * Math.sin(a)];
  const [ax0, ay0] = p(13, -Math.PI / 2 + 0.45), [ax1, ay1] = p(13, Math.PI * 1.2);
  let s = `<defs><marker id="gvA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="${C.gold}"/></marker></defs>`;
  s += `<path d="M${f(ax0)} ${f(ay0)} A13 13 0 1 1 ${f(ax1)} ${f(ay1)}" fill="none" stroke="${C.gold}" stroke-width=".8" marker-end="url(#gvA)"/>`;
  s += `<text x="${c}" y="${c - .6}" text-anchor="middle" font-size="5.4" font-weight="800" fill="${C.wine}">${beats}</text><text x="${c}" y="${c + 3.8}" text-anchor="middle" font-size="3.2" fill="${C.wine}">სიტყვა</text>`;
  EX_NAMES.forEach((name, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / n, [x, y] = p(R, a), hit = i === EX_LAND;
    const nums = Array.from({ length: Math.ceil(beats / n) }, (_, k) => i + 1 + k * n).filter(b => b <= beats);
    s += `<rect x="${f(x - 11.5)}" y="${f(y - 5.6)}" width="23" height="11.2" rx="2.6" fill="${hit ? GREEN : '#fff'}" stroke="${hit ? GREEN : C.line}" stroke-width=".45"/>`;
    s += `<text x="${f(x)}" y="${f(y - .5)}" text-anchor="middle" font-size="4.1" font-weight="700" fill="${hit ? '#fff' : C.brown}">${esc(name)}</text>`;
    s += `<text x="${f(x)}" y="${f(y + 3.9)}" text-anchor="middle" font-size="3.2" fill="${hit ? '#fff' : C.muted}">${nums.join(' · ')}${hit ? ' ★' : ''}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${W}" width="${W}mm" height="${W}mm">${s}</svg>`;
};

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ვინ იწყებს? გათვლის ლექსი გადაწყვეტს: წრეში ყოველ სიტყვაზე შემდეგს მიუთითებ, ვისზეც ბოლო სიტყვა დაეცემა, ის იწყებს. ამ ნაკრებში აპის სამი ლექსია (სიტყვები დანომრილია), „ვისი ჯერია?“ ბორბალი — ქაღალდის სამაგრით დასატრიალებელი, — სამართლიანი რიგის ფურცელი და ჟეტონები გუნდებად დასაყოფად. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="gv-ex box">
    <div>${exampleSvg()}</div>
    <div class="gv-exR">
      <h3>ასე ითვლიან</h3>
      ${step('users', 'დადექით წრეში. წამყვანი ირჩევს ლექსს და იმას, ვისგან დაიწყოს.')}
      ${step('hand', 'ლექსს ნელა ამბობს: ყოველ სიტყვაზე შემდეგს მიუთითებს, საათის ისრის მიმართულებით.')}
      ${step('star', `ვისზეც ბოლო სიტყვა დაეცემა, ის იწყებს: „${esc(EX.title)}“ ${EX.words.length} სიტყვაა — აქ ${esc(EX_NAMES[EX_LAND])} იწყებს.`, GREEN)}
      ${step('list-ordered', 'მთელი რიგი გინდათ? არჩეული წრიდან გადის, ლექსი მომდევნოდან იწყება.')}
      ${step('target', '„ვის შეხვდება?“ — სანამ დაითვლით, ყველა გამოიცნობს, ვისზე დაეცემა.')}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>${no('cover')}-ის ზურგი</td></tr>
        <tr><td>გათვლის ლექსები, დანომრილი სიტყვებით</td><td>${RHYMES.length}</td><td>${no('rhymes')}</td></tr>
        <tr><td>ჩარჩო თქვენი ლექსისთვის</td><td>${OWN}</td><td>${no('rhymes')}</td></tr>
        <tr><td>„ვისი ჯერია?“ — ვინ რამდენჯერ</td><td>1</td><td>${no('rhymes')}-ის ზურგი</td></tr>
        <tr><td>ბორბალი: 12 და 24 ადგილი</td><td>2</td><td>${no('wheel')}</td></tr>
        <tr><td>გუნდის ჟეტონი ⌀23 მმ (4 ფერი × ${PER_TEAM})</td><td>${TEAMS.length * PER_TEAM}</td><td>${no('tokens')}</td></tr>
        <tr><td>★ ჟეტონი „იწყებს“</td><td>${STARS}</td><td>${no('tokens')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ბორბალს (${no('wheel')}) გამოჭრა არ სჭირდება: მაგიდაზე დადე, მყარი რომ იყოს — მუყაოზე დააწებე. საჭიროა ფანქარი და ქაღალდის სამაგრი.</li>
        <li>ჟეტონები (${no('tokens')}) გამოჭერი და კონვერტში შეინახე; წილისყრისთვის — ჩანთა ან ქუდი.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> ბავშვების ძველი გათვლის თამაშის იდეით. ლექსები საგანძურის სკოლის აპიდანაა („ანბანის სახელები“ — ქართული ასოების ძველი სახელები). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['წრე', 'მოთამაშეები წრეში დგანან ან სხედან. წამყვანი — მასწავლებელი ან ერთ-ერთი მოთამაშე — ირჩევს ლექსს და იმას, ვისგან დაიწყოს (ან ★ ჟეტონით გაარკვიეთ).'],
  ['დათვლა', 'წამყვანი ლექსს ნელა, სიტყვა-სიტყვა ამბობს: პირველ სიტყვაზე პირველს მიუთითებს, მეორეზე — შემდეგს, საათის ისრის მიმართულებით, და ასე წრეზე. ვისზეც ბოლო სიტყვა დაეცემა, ის იწყებს.'],
  ['მთელი რიგი', 'ვინც აირჩიეს, წრიდან გადის — ის რიგში პირველია. ლექსი თავიდან იწყება მომდევნოდან, ვინც მის შემდეგ იდგა; ასე, სანამ ერთი არ დარჩება — ის ბოლოა.'],
  ['ვის შეხვდება?', 'სანამ წამყვანი დაითვლის, ყველა ჩუმად ითვლის წრეზე და წერს (ან თითით აჩვენებს), ვისზე დაეცემა ბოლო სიტყვა. ვინც სწორად გამოიცნო, ქულას იღებს. ლექსების ფურცლის ცხრილში პასუხი წამყვანს უწერია.'],
  ['ვისი ჯერია?', 'ბორბლის ხაზებზე სახელები ჩაწერეთ, ფანქრის წვერი შუა წერტილზე დაადეთ და ქაღალდის სამაგრი (სკრეპი) ფანქარს გადააცვით. სამაგრს თითი გაჰკარით — სადაც გაჩერდება, იმის ჯერია; ცარიელზე — ხელახლა.'],
  ['სამართლიანად', 'ვისაც ჯერი შეხვდა, „ვისი ჯერია?“ ფურცელზე მის სტრიქონში ერთი უჯრა ივსება. ბორბალმა ის აირჩია, ვისაც სხვებზე მეტი უჯრა აქვს? ხელახლა დაატრიალეთ — აპის ბორბალიც ყველაზე ნაკლებჯერ ნაკითხს ირჩევს.'],
  ['გუნდები', 'ჩანთაში იმდენი ჟეტონი ჩადეთ, რამდენიც მოთამაშეა, ყოველი ფერიდან თანაბრად (2, 3 ან 4 ფერი). ყველა თითოს ამოიღებს: ფერი — მისი გუნდია, რიცხვი — მისი რიგი გუნდში.'],
  ['ვინ იწყებს — წილით', 'ჩანთაში ერთი ★ და იმდენი სხვა ჟეტონი, რომ ყველას თითო ეყოს. ვინც ★-ს ამოიღებს, ის იწყებს. რამდენიმე ★-ით რამდენიმე ჯგუფის წამყვანს ერთად აირჩევთ.'],
  ['ჩვენი ლექსი', 'ცარიელ ჩარჩოებში თქვენი ლექსი ჩაწერეთ და სიტყვები დაითვალეთ: ცნობილი გათვლა, სიმღერის დასაწყისი, ანდაზა — ყველაფერი გამოდგება.'],
  ['უფრო ადვილად', 'პატარებთან ყოველ სიტყვაზე ტაში დაუკარით ან მხარზე შეეხეთ, ვისაც ითვლით. ჯერ ექვსნი-შვიდნი ითამაშეთ.'],
  ['უფრო რთულად', 'ვის შეხვდება — თავით: სიტყვების რიცხვი წრის რიცხვზე გაყავი. ნაშთი 2 — მეორეზე დაეცემა, ნაშთი 0 — ბოლოზე, ვინც პირველის წინ დგას. მაგ.: 12 სიტყვა, 5 მოთამაშე — ნაშთი 2.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">გათვლა ძველი ბავშვური წესია, ვინ იწყებს, ვინ ეძებს, ვისი ჯერია. ლექსს ყველა ისმენს და ყველა ითვლის — ამიტომ არავინ ეწყინება.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ერთ ტელეფონზე სახელები ლექსის ყოველ სიტყვაზე ინთება, ბორბალი ყველაზე ნაკლებჯერ ნაკითხს ირჩევს და კლასს გუნდებად ყოფს; ონლაინ — „ვის შეხვდება?“: წამყვანი ზარში ლექსს კითხულობს, ყველა თავის ტელეფონზე ნიშნავს, ვისზე დაეცემა, და ასე ირკვევა მთელი რიგი — sagandzureli.ge → თამაშები → გათვლა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.gv-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.gv-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.gv-mHead b{font-size:13pt;color:var(--wine)}
.gv-hint{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700;align-self:center}
.gv-rhs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:23mm;display:flex;flex-direction:column;gap:3.2mm}
.gv-rh.box{padding:3mm 4mm 3.2mm}
.gv-rhHead{display:flex;align-items:baseline;gap:3mm}
.gv-rhHead b{font-size:13pt;color:var(--wine)}
.gv-n{margin-left:auto;font-size:9.5pt;font-weight:700;color:var(--gold2);white-space:nowrap;display:flex;align-items:baseline;gap:1.4mm}
.gv-n i{display:inline-block;width:12mm;border-bottom:.25mm solid #9d8c77}
.gv-words{margin:2mm 0 2mm;display:flex;flex-wrap:wrap;gap:1.4mm 2.4mm;font-size:12.5pt;line-height:1.1}
.gv-w{display:inline-flex;flex-direction:column;align-items:center}
.gv-w i{font-style:normal;font-size:7.5pt;color:var(--muted);font-weight:700;margin-top:.4mm}
.gv-w.last{color:${GREEN};font-weight:700}
.gv-w.last i{color:${GREEN}}
table.gv-land{border-collapse:collapse;font-size:9pt}
.gv-land th{font-weight:700;color:var(--muted);text-align:left;padding:.4mm 2mm .4mm 0;white-space:nowrap}
.gv-land td{border:.2mm solid var(--line);width:9mm;text-align:center;padding:.5mm 0;background:#fff;color:var(--muted)}
.gv-land b{color:var(--wine)}
.gv-own{border:.3mm dashed var(--gold);border-radius:2mm;padding:3mm 4mm;flex:1;display:flex;flex-direction:column}
.gv-lines{flex:1;display:flex;flex-direction:column;justify-content:space-evenly;padding-top:2mm}
.gv-lines i{display:block;border-bottom:.25mm solid #9d8c77}
.gv-legend{position:absolute;left:10mm;right:10mm;bottom:8.5mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.gv-legend b.g{color:${GREEN}}
.gv-tu{position:absolute;inset:12mm 12mm 12mm}
table.gv-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.gv-tab th,.gv-tab td{border:.25mm solid #bba98f;text-align:center}
.gv-tab th{background:var(--parch);color:var(--wine);font-size:9pt;height:7mm}
.gv-tab td{height:6.8mm}
.gv-tab .n{width:8mm}
.gv-tab td.n{font-weight:700;color:var(--wine);background:var(--cream);font-size:9pt}
.gv-tab .who{width:46mm;text-align:left;padding-left:2mm}
.gv-tab th.b{color:var(--muted);font-weight:400;font-size:8pt}
.gv-tab .s{width:14mm}
.gv-tab td.s{background:#fbf6ec;border-left:.5mm solid var(--wine)}
.gv-tab tr:nth-child(odd) td.b{background:#fdfaf3}
.gv-tu .rs-remind{margin-top:4mm}
.gv-wheel{position:absolute;left:10mm;top:19mm;width:190mm;height:190mm}
.gv-wheel svg{display:block}
.gv-spin{position:absolute;left:24mm;right:24mm;top:216mm}
.gv-spin .rs-step{font-size:11pt;margin-bottom:3.2mm}
.gv-tok{position:absolute;inset:0;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3mm}
.gv-ring{position:absolute;inset:1.1mm;border-radius:50%;border:.35mm solid rgba(255,255,255,.9)}
.gv-tok b{font-size:15pt;line-height:1;font-weight:800}
.gv-tok span{font-size:6.4pt;font-weight:700;letter-spacing:.02em}
.gv-star{background:var(--wine)}
.gv-star span{color:#f0d9a0;font-size:7pt}
.gv-ex{display:grid;grid-template-columns:80mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:3mm 5mm}
.gv-ex svg{display:block}
.gv-exR h3{margin:0 0 3mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'rhymes', front: rhymesPage, back: turnsPage },
  { key: 'wheel', front: wheelPage(12), back: wheelPage(24) },
  {
    key: 'tokens',
    front: tokenSheet(TOKENS, { ...TOKEN_GRID, label: `${title} · ჟეტონები ⌀23 მმ — წინა მხარე` }),
    back: tokenSheet(TOKENS, { ...TOKEN_GRID, back: true, label: `${title} · ჟეტონები — ზურგი` }),
  },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
