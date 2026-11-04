// „ცხელი ჩურჩხელა“ on paper — the სამაგიდო variant (2026-11-04): no phone. The host sings, claps or plays any recording with
// their back to the circle and stops it after a die's throw × 5 s, thrown in secret, so nobody knows the moment — the host
// neither; whoever holds the churchkhela then (a real one, a ball or the paper one of the kit) is burnt and draws a task card.
// The cards are the app's own 25 tasks (utils/churchkhela.ts `TASKS`, their kinds' names `KIND_LABEL`) + 2 blank, the backs
// coloured by kind so a host may draw from one pile; four two-sided paper churchkhelas (the app's `Churchkhela` drawing,
// pages/games/churchkhela/parts.tsx, at 0.95 mm a unit, cut round by the dolls' `halo`) and the tally „ვინ დაიწვა?“.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss, cardSheet, placedSheet, corners } from '../lib.mjs';
import { appData } from '../appData.mjs';
import { partsCss, step } from '../kitParts.mjs';
import { halo, ellD, rectD } from '../dolls.mjs';

const { TASKS, KIND_LABEL } = await appData({ 'utils/churchkhela.ts': ['TASKS', 'KIND_LABEL'] });

export const id = 'tskheli-churchkhela';
export const title = 'ცხელი ჩურჩხელა';
const TAG = 'ქართული · უტელეფონო';
const META = '3–30 მოთამაშე · 4 წლიდან · 10–30 წუთი';
const GREEN = '#2f7d4f';
const ORANGE = '#c2410c';

/** each kind's colour (the band, the back's frame), a light tint for the back and an icon */
const LOOK = {
  sing: { color: C.wine, tint: '#f5e1e1', icon: 'mic-vocal' },
  name: { color: C.goldDark, tint: '#f6ecd4', icon: 'tag' },
  where: { color: GREEN, tint: '#e0efe5', icon: 'map-pin' },
  fun: { color: ORANGE, tint: '#fbe5d8', icon: 'party-popper' },
};
const COLOR_WORD = { sing: 'წითელი', name: 'ოქროსფერი', where: 'მწვანე', fun: 'ნარინჯისფერი' };
const BLANK = { color: C.brown, tint: '#efe8e0', icon: 'pencil', label: 'შენი დავალება' };
const BLANKS = 2;
const CARDS = [
  ...TASKS.map((t, i) => ({ ...LOOK[t.kind], kind: t.kind, label: KIND_LABEL[t.kind], text: t.text, n: i + 1 })),
  ...Array.from({ length: BLANKS }, () => ({ ...BLANK, kind: 'blank' })),
];
const count = kind => TASKS.filter(t => t.kind === kind).length;
const ROWS = 20;

// ---------- the churchkhela: the app's drawing (8 lumps of walnuts under their coat, on a string) ----------
const f = v => Math.round(v * 100) / 100;
const LUMPS = Array.from({ length: 8 }, (_, i) => ({ cy: 46 + i * 19.5, cx: 50 + (i % 2 ? 1.6 : -1.4), rx: i % 3 === 1 ? 15.5 : 17 }));
const COAT = ['#d0694a', '#93301f', '#5c1a12'];
const TIP = 'M41 193 Q50 216 59 193 Z';
let gid = 0;
const coatDef = g => `<radialGradient id="${g}" cx="34%" cy="32%" r="78%"><stop offset="0" stop-color="${COAT[0]}"/><stop offset=".55" stop-color="${COAT[1]}"/><stop offset="1" stop-color="${COAT[2]}"/></radialGradient>`;
const coatBody = g => `<ellipse cx="50" cy="33" rx="6" ry="3.4" fill="url(#${g})"/>
${LUMPS.map(l => `<ellipse cx="${l.cx}" cy="${l.cy}" rx="${l.rx}" ry="12.6" fill="url(#${g})"/>`).join('')}
<path d="${TIP}" fill="url(#${g})"/>
${LUMPS.map(l => `<ellipse cx="${f(l.cx - 6)}" cy="${f(l.cy - 5)}" rx="4.6" ry="2.4" fill="#fff" opacity=".2"/>`).join('')}`;
const STRING = '<circle cx="50" cy="7" r="4.2" fill="none" stroke="#a88e6a" stroke-width="1.8"/><path d="M50 11 V34" stroke="#a88e6a" stroke-width="1.8"/>';
const STEAM = [27, 73].map((x, i) => `<path d="M${x} ${32 - i * 4} q-5 -7 0 -13 q5 -6 0 -12" fill="none" stroke="#c9b8a6" stroke-width="2.4" stroke-linecap="round"/>`).join('');
/** the churchkhela `h` mm tall, steaming */
const churchkhela = h => {
  const g = `ck${gid++}`;
  return `<svg viewBox="0 0 100 230" width="${f(h * 100 / 230)}mm" height="${h}mm"><defs>${coatDef(g)}</defs>${STEAM}${STRING}${coatBody(g)}</svg>`;
};

// the paper one: a tab for the thread instead of the thin string (a hole to thread through), the cut line ~1.5 mm outside
const S = 0.95;
const VB = { x: 29, y: -2, w: 42, h: 210 };
const PIECE = { w: f(VB.w * S), h: f(VB.h * S) };
const CUT = [{ d: rectD(44, 0, 12, 40) }, ...LUMPS.map(l => ({ d: ellD(l.cx, l.cy, l.rx, 12.6) })), { d: TIP }];
/** `mirror` = its back, so the two sides meet when the sheet is printed on both */
const paperChurchkhela = mirror => {
  const g = `ck${gid++}`;
  return `<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${PIECE.w}mm" height="${PIECE.h}mm"><defs>${coatDef(g)}</defs>
<g${mirror ? ' transform="translate(100 0) scale(-1 1)"' : ''}>${halo(CUT, 1.6)}
<rect x="44.6" y=".6" width="10.8" height="38.4" rx="1.8" fill="#efe3c9" stroke="#cdbfa4" stroke-width=".35"/>
<circle cx="50" cy="6.4" r="2.5" fill="#fff" stroke="#8f877b" stroke-width=".35" stroke-dasharray="1 .7"/>
<path d="M50 9.6 V34" stroke="#a88e6a" stroke-width="1.6" stroke-linecap="round"/>
${coatBody(g)}</g></svg>`;
};

// ---------- the task cards ----------
const sizeOf = text => ([...text].length <= 42 ? 'big' : [...text].length <= 66 ? 'mid' : 'small');
const band = c => `<div class="ck-band" style="background:${c.color}">${icon(c.icon, { size: 4.6, color: '#fff', width: 2 })}<span>${esc(c.label)}</span></div>`;
const cardFoot = c => `<div class="ck-foot">${icon('flame', { size: 3.6, color: c.color, width: 2 })}<span>${esc(title)}</span>${c.n ? `<b style="color:${c.color}">№ ${c.n}</b>` : ''}</div>`;
const cardFront = c => (c.kind === 'blank'
  ? `<div class="card ck"><div class="frame" style="border-color:${c.color}"></div>${band(c)}<div class="ck-lines">${'<i></i>'.repeat(5)}</div>${cardFoot(c)}</div>`
  : `<div class="card ck"><div class="frame" style="border-color:${c.color}"></div>${band(c)}<div class="ck-text ${sizeOf(c.text)}"><p>${esc(c.text)}</p></div>${cardFoot(c)}</div>`);
const cardBack = c => `<div class="card ck-back" style="background:${c.tint}"><div class="frame" style="border-color:${c.color}"></div>${corners(c.color, 8, 4.6)}
<div class="ck-art">${churchkhela(50)}</div>
<div class="ck-mark aso" style="color:${c.color}">${aso(title)}</div>
<div class="ck-cat" style="background:${c.color}">${icon(c.icon, { size: 3.8, color: '#fff', width: 2 })}<span>${esc(c.label)}</span></div></div>`;
const CARD_SHEETS = Array.from({ length: Math.ceil(CARDS.length / 9) }, (_, s) => {
  const nine = CARDS.slice(s * 9, s * 9 + 9);
  const kinds = [...new Set(nine.map(c => c.label))].join(', ');
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(cardFront), { label: `${title} · დავალებები ${s + 1}/3 — ${kinds}` }),
    back: cardSheet(nine.map(cardBack), { back: true, label: `${title} · დავალებები ${s + 1}/3 — ზურგი` }),
  };
});

// ---------- the paper churchkhelas: four, two-sided; under them how to make them, and what a churchkhela is ----------
const GAP = 8;
const LEFT = f((210 - 4 * PIECE.w - 3 * GAP) / 2);
const TOP = 21;
const pieces = mirror => Array.from({ length: 4 }, (_, k) => ({ x: f(LEFT + k * (PIECE.w + GAP)), y: TOP, w: PIECE.w, h: PIECE.h, html: paperChurchkhela(mirror) }));
const BOTTOM = TOP + PIECE.h + 6;
const paperHead = { x: 10, y: 8, w: 190, h: 10, html: `<div class="ck-pHead"><span class="aso">${aso(title)}</span><b>ქაღალდის ჩურჩხელა</b><span class="ck-hint">${icon('scissors', { size: 4.4, color: C.wine, width: 2 })} ნაცრისფერ ხაზზე</span></div>` };
const howBox = { x: 14, y: BOTTOM, w: 182, h: 282 - BOTTOM, html: `<div class="ck-how box">
  ${step('layers', 'ეს ფურცელი <b>300 გ მუყაოზე</b> დაბეჭდე, ორმხრივად — ჩურჩხელას ორივე მხარე ექნება.')}
  ${step('scissors', 'გამოჭერი ნაცრისფერ ხაზზე: ჯერ გრძელი გვერდები, მერე ბოლო და ზემოთ ზოლი.')}
  ${step('circle-dot', 'ზოლზე წრე გახვრიტე და ძაფი გაუყარე — ნამდვილი ჩურჩხელასავით ჩამოიკიდება.')}
  ${step('users', 'ერთ წრეს ერთი ჩურჩხელა ჰყოფნის, დიდს (12-ზე მეტნი) — ორი. დანარჩენი მეორე წრისთვისაა ან სათადარიგოდ.')}
</div>` };
const factBox = { x: 14, y: BOTTOM, w: 182, h: 282 - BOTTOM, html: `<div class="ck-fact box">
  <h3>რა არის ჩურჩხელა?</h3>
  <p>ქართული ტკბილეული, შემოდგომის, რთველის დროს მზადდება. ყურძნის ტკბილს ფქვილით ადუღებენ — ეს არის <b>თათარა</b>. კაკალს ან თხილს ძაფზე აასხამენ, ცხელ თათარაში რამდენჯერმე ამოავლებენ და მზეზე შესაშრობად ჩამოკიდებენ. ახლად ამოვლებული ჩურჩხელა მართლაც ცხელია — ხელში არ გააჩერებ!</p>
</div>` };
const paperSheet = {
  key: 'paper',
  front: placedSheet([paperHead, ...pieces(false), howBox], { label: `${title} · ქაღალდის ჩურჩხელა — წინა მხარე` }),
  back: placedSheet([...pieces(true), factBox], { back: true, label: `${title} · ქაღალდის ჩურჩხელა — ზურგი` }),
};

// ---------- the tally: a round a row; the same on the back for the next game ----------
const PIPS = { 1: [[12, 12]], 2: [[7, 7], [17, 17]], 3: [[7, 7], [12, 12], [17, 17]], 4: [[7, 7], [17, 7], [7, 17], [17, 17]], 5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]], 6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]] };
const die = (n, color, size = 7) => `<svg width="${size}mm" height="${size}mm" viewBox="0 0 24 24" style="flex:none"><rect x="1" y="1" width="22" height="22" rx="5" fill="${color}"/>${PIPS[n].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3" fill="#fff"/>`).join('')}</svg>`;
const tallyPage = page(`<div class="ck-ta">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ვინ დაიწვა?</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">ყოველ რაუნდში ჩაწერე, ვინ დაიწვა, რომელი ბარათი ამოიღო და შეასრულა თუ ვერა. ბოლოს ✓ დაითვალეთ — ეს კლასის ქულაა; შემდეგ ჯერზე მეტი შეეცადეთ.</p>
  <table class="ck-tab">
    <tr><th class="r">რაუნდი</th><th class="who">ვინ დაიწვა</th><th class="c">ბარათი №</th><th class="ok">შეასრულა ✓</th><th class="no">ვერ ✗</th></tr>
    ${Array.from({ length: ROWS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="who"></td><td class="c"></td><td class="ok"></td><td class="no"></td></tr>`).join('')}
    <tr class="sum"><td class="r">სულ</td><td class="who"></td><td class="c"></td><td class="ok"></td><td class="no"></td></tr>
  </table>
  <div class="ck-die box">
    <div class="ck-dieH">${icon('dice-5', { size: 5.4, color: C.wine, width: 1.8 })}<b>როდის გაჩერდეს?</b><span>კამათელი ჩუმად — ხუთჯერ იმდენი წამი</span></div>
    <div class="ck-faces">${[1, 2, 3, 4, 5, 6].map(n => `<div class="ck-face">${die(n, C.wine)}<span>${n * 5} წმ</span></div>`).join('')}</div>
    <div class="ck-small">პატარებთან — სამჯერ იმდენი: ${[1, 2, 3, 4, 5, 6].map(n => n * 3).join(' · ')} წმ</div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ვინ დაიწვა?</div>`, 'rs-scP');

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ჩურჩხელა ხელიდან ხელში დადის, სანამ მუსიკა ჟღერს. მუსიკა მოულოდნელად ჩერდება — ვისაც ხელში შერჩა, ის „დაიწვა“ და დავალების ბარათს იღებს: იმღერე, დაასახელე, საიდანაა თუ სახალისო. ნაკრებში აპის ${TASKS.length} დავალებაა, ${BLANKS} ცარიელი ბარათი, ოთხი ქაღალდის ჩურჩხელა და „ვინ დაიწვა?“ ფურცელი. ტელეფონი არ სჭირდება: მუსიკას წამყვანი მღერის, ტაშს უკრავს ან ჩანაწერს რთავს.<br><b>${META}</b></div>
  <div class="ck-ex box">
    <div class="ck-exArt">${churchkhela(84)}</div>
    <div class="ck-exR">
      <h3>ასე თამაშობენ</h3>
      ${step('users', 'დასხედით წრეში. წამყვანი ზურგით ზის და მუსიკას იწყებს.')}
      ${step('dice-5', 'ჩუმად აგორებს კამათელს: რამდენიც მოვა, ხუთჯერ იმდენ წამს ჟღერს მუსიკა.')}
      ${step('hand', 'ჩურჩხელა ხელიდან ხელში დადის, მარჯვნივ. ცხელია — ხელში არ გააჩერო!')}
      ${step('flame', 'მუსიკა გაჩერდა — ვისაც უჭირავს, ის დაიწვა და დავალების ბარათს იღებს.', ORANGE)}
      ${step('circle-check-big', 'შეასრულა? ✓, ვერა? ✗ — ფურცელზე ჩაიწერება, და მუსიკა ისევ ირთვება.', GREEN)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>${no('cover')}-ის ზურგი</td></tr>
        <tr><td>დავალების ბარათი 63×88 მმ: იმღერე ${count('sing')}, დაასახელე ${count('name')}, საიდანაა ${count('where')}, სახალისო ${count('fun')}</td><td>${TASKS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS.length}`)}</td></tr>
        <tr><td>ცარიელი ბარათი „შენი დავალება“</td><td>${BLANKS}</td><td>${no(`cards${CARD_SHEETS.length}`)}</td></tr>
        <tr><td>ქაღალდის ჩურჩხელა, ორმხრივი, 20 სმ</td><td>4</td><td>${no('paper')}</td></tr>
        <tr><td>„ვინ დაიწვა?“ — ${ROWS} რაუნდი, ორივე მხარეს</td><td>2</td><td>${no('tally')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS.length}`)}) და ჩურჩხელები (${no('paper')}) — 300 გ მუყაოზე. ბარათები კიდეებზე მონიშნული ხაზებით გამოჭერი, ჩურჩხელები — ნაცრისფერ ხაზზე.</li>
        <li>საჭიროა კამათელი. მუსიკისთვის — ხმა, ტაში, ან ნებისმიერი ჩანაწერი.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> ბავშვების ცნობილი თამაშის — „ცხელი კარტოფილის“ — იდეით. დავალებები საგანძურის სკოლის აპიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">ბავშვების ძველი თამაშია, ჩვენთან — ქართულად: ხელიდან ხელში ცხელი ჩურჩხელა დადის, დავალებები კი სიმღერა, ჰანგის ცნობა და ხალისია.</p>
  <div class="rules"><ol>${[
    ['წრე', 'დასხედით ან დადექით წრეში. წამყვანი — მასწავლებელი ან ერთ-ერთი მოთამაშე — წრის გარეთ, ზურგით ზის, რომ ვერ დაინახოს, ვის უჭირავს ჩურჩხელა.'],
    ['ჩურჩხელა', `ნამდვილი ჩურჩხელა (გახვეული), პატარა ბურთი ან ამ ნაკრების ქაღალდის ჩურჩხელა (ფურცელი ${no('paper')}). ხელიდან ხელში გადაეცით, მარჯვნივ — არ ესროლოთ.`],
    ['მუსიკა', 'წამყვანი მღერის, ტაშს უკრავს ან ჩანაწერს რთავს: საგალობელი, ხალხური სიმღერა, ნებისმიერი ჰანგი. სანამ ჟღერს, ჩურჩხელა წრეზე დადის — ცხელია, ხელში არ გააჩეროთ!'],
    ['როდის გაჩერდეს?', 'წამყვანი ჩუმად აგორებს კამათელს და ხუთზე ამრავლებს: 1 — 5 წამი, 6 — 30 წამი. გულში ითვლის და ამ წამზე აჩერებს მუსიკას. ასე არავინ იცის, როდის გაჩერდება — თვითონ წამყვანმაც არ აირჩია.'],
    ['დაიწვა!', 'მუსიკა გაჩერდა — ვისაც ჩურჩხელა ხელში უჭირავს, ის დაიწვა. გადაცემის შუაში გაჩერდა? დაიწვა ის, ვინც აწვდიდა: ჯერ ხელიდან არ გაეშვა.'],
    ['დავალება', `დამწვარი ბარათს იღებს. ზურგის ფერი დავალების სახეს ამბობს: ${Object.keys(LOOK).map(k => `<b style="color:${LOOK[k].color}">${COLOR_WORD[k]}</b> — ${KIND_LABEL[k]}`).join(', ')}. ოთხი დასტა ცალ-ცალკე დაალაგეთ და წამყვანმა აირჩიოს, რომლიდან, — ან ყველა ერთად აურიეთ. „ეს ჰანგი“ ბარათზე ისაა, რაც ახლა ჟღერდა.`],
    ['შეასრულა?', `კლასი ერთად წყვეტს: შეასრულა — ✓, ვერა — ✗ „ვინ დაიწვა?“ ფურცელზე (ფურცელი ${no('tally')}). ბარათი დასტის ბოლოში ბრუნდება, მუსიკა ისევ ირთვება.`],
    ['ორი ჩურჩხელა', '12-ზე მეტნი ხართ? ორი ჩურჩხელა გაუშვით წრის ორი მხრიდან: მუსიკის გაჩერებისას ორივე დამწვარი ასრულებს დავალებას — ჯერ ერთი, მერე მეორე.'],
    ['გამოსვლით', 'უფროსებთან: ვინც ორჯერ დაიწვა, წრიდან გადის და წამყვანს ეხმარება — უყურებს, ვინ დაიწვა. ბოლოს დარჩენილი იგებს.'],
    ['პატარებთან', 'მხოლოდ „სახალისო“ დასტა და მოკლე მუსიკა: კამათელი სამზე გამრავლებული — 3-დან 18 წამამდე.'],
    ['შენი დავალება', `ცარიელ ბარათებზე (ფურცელი ${no(`cards${CARD_SHEETS.length}`)}) თქვენი დავალებები ჩაწერეთ: კლასის სიმღერა, გაკვეთილის კითხვა, ცეკვის მოძრაობა.`],
  ].map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ერთ ტელეფონზე („ჰიბრიდული“) ტელეფონი თავად უკრავს სკოლის ჩანაწერს და თავად ჩერდება, 5-დან 45 წამამდე; ზარი რეკავს და დავალება ეკრანზე ჩნდება. ონლაინ — ყველას თავის ტელეფონზე უჭირავს ჩურჩხელა: რაც უფრო გვიან გაუშვებ, მით მეტი ქულა, ოღონდ მუსიკა თუ მანამდე გაჩერდა, დაიწვი და დავალება ზარში შენზეა — sagandzureli.ge → თამაშები → ცხელი ჩურჩხელა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}
.card.ck .frame{border-width:.6mm}
.ck-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap}
.ck-text{position:absolute;left:6mm;right:6mm;top:16mm;bottom:12mm;display:flex;align-items:center;justify-content:center;text-align:center}
.ck-text p{margin:0;font-weight:700;color:var(--brown);line-height:1.3}
.ck-text.big p{font-size:15pt}
.ck-text.mid p{font-size:13.5pt}
.ck-text.small p{font-size:12.4pt;line-height:1.26}
.ck-lines{position:absolute;left:7mm;right:7mm;top:20mm;bottom:15mm;display:flex;flex-direction:column;justify-content:space-evenly}
.ck-lines i{display:block;border-bottom:.25mm solid #9d8c77}
.ck-foot{position:absolute;left:5.4mm;right:5.4mm;bottom:5mm;display:flex;align-items:center;gap:1.2mm;font-size:7.4pt;color:var(--muted);border-top:.2mm solid var(--line);padding-top:1.4mm}
.ck-foot b{margin-left:auto;font-size:9.5pt}
.ck-back .frame{border-width:.9mm}
.ck-art{position:absolute;left:0;right:0;top:9.5mm;display:flex;justify-content:center}
.ck-art svg,.ck-exArt svg{display:block}
.ck-mark{position:absolute;left:5mm;right:5mm;top:62.5mm;text-align:center;font-size:10.5pt;letter-spacing:.03em;white-space:nowrap}
.ck-cat{position:absolute;left:9mm;right:9mm;bottom:8.4mm;height:7.4mm;border-radius:3.7mm;display:flex;align-items:center;justify-content:center;gap:1.2mm;color:#fff;font-size:8.8pt;font-weight:700;white-space:nowrap}
.ck-pHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.ck-pHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.ck-pHead b{font-size:13pt;color:var(--wine)}
.ck-hint{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700;align-self:center}
.ck-how,.ck-fact{height:100%;box-sizing:border-box}
.ck-how{display:grid;grid-template-columns:1fr 1fr;gap:1mm 7mm;align-content:center}
.ck-how .rs-step{font-size:10pt;margin:0}
.ck-fact{display:flex;flex-direction:column;justify-content:center}
.ck-fact h3{margin:0 0 2mm;color:var(--wine)}
.ck-fact p{margin:0;font-size:10.5pt;line-height:1.4}
.ck-ta{position:absolute;inset:12mm 12mm 12mm}
table.ck-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.ck-tab th,.ck-tab td{border:.25mm solid #bba98f;text-align:center}
.ck-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:8mm}
.ck-tab td{height:9.2mm}
.ck-tab .r{width:17mm}
.ck-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.ck-tab .who{text-align:left;padding-left:2.5mm}
.ck-tab th.who{text-align:center;padding-left:0}
.ck-tab .c{width:22mm}
.ck-tab .ok,.ck-tab .no{width:25mm}
.ck-tab td.ok{background:#f1f7f2}
.ck-tab td.no{background:#fbf0ef}
.ck-tab tr.sum td{background:#fbf6ec;border-top:.6mm solid var(--wine);height:10mm;font-size:10pt}
.ck-die{margin-top:4mm;display:grid;grid-template-columns:auto 1fr;gap:2mm 6mm;align-items:center;padding:3mm 5mm}
.ck-dieH{grid-column:1/-1;display:flex;align-items:center;gap:2mm}
.ck-dieH b{font-size:11.5pt;color:var(--wine)}
.ck-dieH span{font-size:9.5pt;color:var(--brown)}
.ck-faces{display:flex;gap:4mm}
.ck-face{display:flex;flex-direction:column;align-items:center;gap:.8mm;font-size:9pt;font-weight:700;color:var(--wine)}
.ck-small{font-size:9pt;color:var(--muted);text-align:right}
.ck-ex{display:grid;grid-template-columns:44mm 1fr;gap:6mm;align-items:center;margin:0 0 5mm;padding:3mm 5mm}
.ck-exArt{display:flex;justify-content:center}
.ck-exR h3{margin:0 0 3mm}
`;

const SHEETS = [
  { key: 'cover' },
  ...CARD_SHEETS,
  paperSheet,
  { key: 'tally', front: tallyPage, back: tallyPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));
SHEETS[0].back = rulesPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
