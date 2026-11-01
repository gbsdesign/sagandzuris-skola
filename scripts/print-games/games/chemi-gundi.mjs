// „ჩემი გუნდი“ on paper — the სამაგიდო variant of the app's ensemble game (2026-11-01, like Incredibox): the class is the stage.
// Six groups take a role card each — მთქმელი, მოძახილი, ბანი sing the book's three voices of a folk song's phrase, ტაში claps,
// დოლი drums on the desk, ფანდური strums (or says its strokes) — and the phrase goes round and round. A conductor brings groups
// in and out at the start of a pass: by hand, by the conductor's cards (one drawn a pass) or by an ensemble map the groups
// planned. The kit: the eight songs' phrases in three voices (the app's phrase 1 — `loopsOf` over the same book notes), six
// role cards with the app's own figures (Stage.tsx `FigureCard`, drawn here by react-dom/server) and every pattern's
// syllables (`patternWords`), twelve conductor's cards with a little stage of who is in, the ensemble maps, the rules.
import path from 'node:path';
import { createRequire } from 'node:module';
import { build as esbuild } from 'esbuild';
import { C, ROOT, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.mjs';
import { abcScore, loadScore, staff, musicHead, musicScript, musicCss } from '../music.mjs';
import { appData } from '../appData.mjs';
import { partsCss, step } from '../kitParts.mjs';

const require = createRequire(import.meta.url);
const { loopsOf, bpmAt, droneOf, patternWords, VARIANTS, ROLES, ROLE_NAMES, SONG_BOOK, GUNDI_SONGS, noteName } = await appData({
  'utils/gundi.ts': ['loopsOf', 'bpmAt', 'droneOf', 'patternWords', 'VARIANTS', 'ROLES', 'ROLE_NAMES'],
  'data/songBookChants.ts': ['SONG_BOOK'],
  'pages/games/gundi/songs.ts': ['GUNDI_SONGS'],
  'utils/pearls.ts': ['noteName'],
});

export const id = 'chemi-gundi';
export const title = 'ჩემი გუნდი';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '6–30 მოთამაშე, ექვს ჯგუფად · 7 წლიდან · 15–30 წუთი';
const PER_PAGE = 2;
const PASSES = 8;
const MAPS = 3;

// ---------- the app's figures, drawn once ----------
const { FIG, LOOK } = await (async () => {
  const out = await esbuild({
    entryPoints: [path.join(ROOT, 'src', 'pages', 'games', 'gundi', 'Stage.tsx')], bundle: true, write: false, format: 'cjs',
    platform: 'node', target: 'node20', jsx: 'automatic', logLevel: 'error', external: ['react', 'react/*', 'react-dom', 'react-dom/*'],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(mod, mod.exports, require);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const draw = (role, on) => renderToStaticMarkup(React.createElement(mod.exports.FigureCard, { role, on }));
  return { FIG: Object.fromEntries(ROLES.map(r => [r, { on: draw(r, true), off: draw(r, false) }])), LOOK: mod.exports.LOOK };
})();
const colorOf = r => LOOK[r].coat;
const SINGERS = ['mtqmeli', 'modzakhili', 'bani'];
const PLAYERS = ['tashi', 'doli', 'panduri'];

// ---------- the songs: the app's phrase 1 of each, in three voices, the repeat signs round it ----------
const repeat = abc => abc.replace(/(V:\d[^\n]*\n)/g, '$1|: ').replace(/ \|\]/g, ' :|');
const SONGS = GUNDI_SONGS.map((s, i) => {
  const score = loadScore(SONG_BOOK, s.num);
  const loop = loopsOf(score)[0];
  if (!loop) throw new Error(`chemi-gundi: song ${s.num} has no phrase`);
  const bpm = bpmAt(score, loop.a);
  const voices = loop.lines.map(line => line.map(n => ({ beat: n.at, beats: n.len, midi: n.midi })));
  return {
    ...s, no: i + 1, meter: loop.meter, beats: loop.beats, bpm: Math.round(bpm), seconds: Math.round((loop.beats * 60) / bpm),
    firsts: voices.map(v => v[0].midi), drone: droneOf(loop)[0]?.midi,
    abc: repeat(abcScore(voices, { names: ['I', 'II', 'III'], gap: 24 })),
  };
});
if (SONGS.length !== 8) throw new Error(`chemi-gundi: ${SONGS.length} songs`);
const PAGES = Math.ceil(SONGS.length / PER_PAGE);
const COUNT = { 2: 'ერთი-ორი', 3: 'ერთი-ორი-სამი' };

const songBox = s => `<div class="gd-song">
  <div class="gd-head"><span class="gd-no">${s.no}</span><div class="gd-t"><b>${esc(s.title)}</b><span>${esc(s.region)} · ფრაზა — ${s.beats} დარტყმა, ≈ ${s.seconds} წამი · ♩ ≈ ${s.bpm}</span></div>
    <span class="gd-count"><b>${s.meter}</b><span>ითვლება<br>${COUNT[s.meter]}</span></span></div>
  <div class="gd-first">${icon('music', { size: 4.2, color: C.wine, width: 2 })}<span>პირველი ნოტები:</span>${s.firsts.map((m, i) => `<span class="gd-v"><i style="background:${colorOf(SINGERS[i])}">${['I', 'II', 'III'][i]}</i>${esc(noteName(m))}</span>`).join('')}${s.drone != null ? `<span class="gd-v gd-drone">ბურდონი: ${esc(noteName(s.drone))}</span>` : ''}</div>
  ${staff(s.abc)}
  <div class="gd-beat">${PLAYERS.map(r => `<span><b style="color:${colorOf(r)}">${ROLE_NAMES[r]}</b> ${esc(patternWords(s.meter, VARIANTS[r][0].id))}</span>`).join('')}</div>
</div>`;

const songPage = p => page(`<div class="gd-mHead"><span class="aso">${aso(title)}</span><b>სიმღერები ${p * PER_PAGE + 1}–${Math.min(SONGS.length, (p + 1) * PER_PAGE)}</b><span class="gd-for">${icon('users', { size: 4.2, color: C.wine, width: 2 })} დირიჟორისა და ხმებისთვის</span></div>
<div class="gd-songs">${SONGS.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(songBox).join('')}</div>
<div class="gd-legend"><b>‖: :‖</b> — ფრაზა წრეზე ბრუნავს: ბოლოს ისევ თავიდან. ${SINGERS.map((r, i) => `<b style="color:${colorOf(r)}">${['I', 'II', 'III'][i]}</b> — ${ROLE_NAMES[r]}`).join(', ')}; 8 გასაღების ქვეშ — ოქტავით დაბლა. სიტყვებით, თუ იცით, თუ არა — „ლა“-თი. ქვედა ხაზი — რიტმი ჩვეულებრივ; სხვა ვარიანტები როლის ბარათზეა.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · სიმღერების ფრაზები სამ ხმაზე</div>`, 'gd-sP');

// ---------- the role cards ----------
const ROLE_TEXT = {
  mtqmeli: { what: 'I ხმა · ზედა', how: 'ფურცლიდან I ხმას მღერის: პირველი იწყებს და სიმღერას წინ მიუძღვის.', tip: 'მკაფიოდ დაიწყე — სხვები მოგყვებიან.' },
  modzakhili: { what: 'II ხმა · შუა', how: 'ფურცლიდან II ხმას მღერის: მთქმელს ეხმიანება და ჰარმონიას ავსებს.', tip: 'შენი ნოტი გეჭიროს, ნუ აჰყვები მთქმელს.' },
  bani: { what: 'III ხმა · დაბალი', how: 'ფურცლიდან III ხმას მღერის — ან ბურდონს: ერთ ნოტს, გაბმით.', tip: 'მყარად და თანაბრად — ყველა შენ გეყრდნობა.' },
  tashi: { what: 'რიტმი · ხელისგულები', how: '„ტა“ — ერთი ტაში, „ტი-ტი“ — ორი სწრაფი, „·“ — სიჩუმე.' },
  doli: { what: 'რიტმი · მერხი', how: 'მერხზე ან მუხლებზე: „დუმ“ — ხელისგულით, „ტეკ“ — თითებით, კიდეზე.' },
  panduri: { what: 'აკორდები · სიმები', how: 'ფანდური ან გიტარა — ან ხმით: „დრინ“ — სამი სიმი, „ბუმ“ — ბანი, „ჩიკ“ — აკორდი.' },
};

/** three lanes, this voice's in its colour (mesame-khma's voice cards) */
const lanes = k => {
  const tunes = [[3.2, 1.6, 2.4, 0.8, 1.6], [2.4, 3.2, 1.6, 2.4, 1.6], [1.6, 1.6, 0.8, 1.6, 2.4]];
  return `<svg viewBox="0 0 46 30" width="40mm" height="26mm" style="display:block">${[0, 1, 2].map(i => {
    const y = 5 + i * 10;
    const on = i === k;
    const col = colorOf(SINGERS[i]);
    const dots = tunes[i].map((d, j) => `<circle cx="${7 + j * 8}" cy="${(y + 2.4 - d).toFixed(1)}" r="${on ? 1.9 : 1.3}" fill="${on ? col : '#d9c9ad'}"/>`).join('');
    return `<line x1="1" x2="45" y1="${y + 2.4}" y2="${y + 2.4}" stroke="${on ? col : '#e8dcc8'}" stroke-width="${on ? 0.7 : 0.4}"/>${dots}
<text x="45" y="${y - 0.4}" text-anchor="end" font-size="3" font-weight="700" fill="${on ? col : '#b9a993'}">${['I', 'II', 'III'][i]}</text>`;
  }).join('')}</svg>`;
};

const roleBody = r => {
  const col = colorOf(r);
  if (r === 'bani') {
    return `<div class="gd-vars"><div class="gd-var"><b style="color:${col}">ჰანგი</b><span>III ხმა ფურცლიდან</span></div>
<div class="gd-var"><b style="color:${col}">ბურდონი</b><span>ერთ ნოტზე, გაბმით — ფურცელზე წერია, რომელზე; ორ ტაქტში ერთხელ ახალი სუნთქვა</span></div></div>`;
  }
  if (SINGERS.includes(r)) return `<div class="gd-lanes">${lanes(SINGERS.indexOf(r))}</div><p class="gd-tip">${icon('lightbulb', { size: 3.8, color: C.goldDark, width: 2 })}<span>${ROLE_TEXT[r].tip}</span></p>`;
  return `<div class="gd-vars">${VARIANTS[r].map(v => `<div class="gd-var"><b style="color:${col}">${esc(v.name)}</b>
<div class="gd-pws"><span class="gd-pw"><i>2</i>${esc(patternWords(2, v.id))}</span><span class="gd-pw"><i>3</i>${esc(patternWords(3, v.id))}</span></div></div>`).join('')}</div>`;
};

const roleCard = r => {
  const col = colorOf(r);
  const t = ROLE_TEXT[r];
  return `<div class="card gd-card"><div class="frame" style="border-color:${col}"></div>
<div class="gd-cTop"><div class="gd-fig">${FIG[r].on}</div><div class="gd-cName"><div class="fit gd-nm"><b style="color:${col}">${ROLE_NAMES[r]}</b></div><span class="gd-what">${t.what}</span><span class="gd-how">${t.how}</span></div></div>
<div class="gd-cBody">${roleBody(r)}</div>
<div class="gd-cFoot"><span>${esc(title)} · როლი</span><b style="color:${col}">${ROLES.indexOf(r) + 1}/6</b></div></div>`;
};

// ---------- the conductor's cards: who is in after it, as a little stage ----------
const CONDUCTOR = [
  { title: 'ყველა ერთად!', on: ROLES, icon: 'sparkles', text: 'ყველა ჯგუფი შემოდის — სრული ანსამბლი.', sign: 'ორივე ხელი ფართოდ გაშალე.' },
  { title: 'მხოლოდ ბანი', on: ['bani'], icon: 'audio-lines', text: 'ყველა ჩუმდება, ბანი მარტო რჩება. მოუსმინეთ, როგორ ჟღერს საძირკველი.', sign: 'ხელისგული დაბლა, იატაკისკენ.' },
  { title: 'მხოლოდ რიტმი', on: PLAYERS, icon: 'drum', text: 'ხმები ისვენებენ — ტაში, დოლი და ფანდური აგრძელებენ.', sign: 'ხელით რიტმი აჩვენე.' },
  { title: 'მხოლოდ ხმები', on: SINGERS, icon: 'mic-vocal', text: 'საკრავები ჩუმდება: სამი ხმა ერთად, უბრალოდ.', sign: 'სამი თითი მაღლა.' },
  { title: 'მთქმელი და ბანი', on: ['mtqmeli', 'bani'], icon: 'music-2', text: 'ზედა და ქვედა ხმა მარტო. მოძახილი ყურს უგდებს — მერე დაბრუნდება.', sign: 'ერთი ხელი მაღლა, მეორე დაბლა.' },
  { title: 'ერთი შემოდის', icon: 'log-in', text: 'აირჩიე ჯგუფი, რომელიც ჩუმადაა, და შემოიყვანე.', sign: 'მიუთითე და ხელი შენკენ მოიქნიე.' },
  { title: 'ერთი გადის', icon: 'log-out', text: 'აირჩიე ჯგუფი, რომელიც მღერის, და გააჩუმე. ერთი მაინც დარჩეს!', sign: 'მიუთითე და მუშტი შეკარი.' },
  { title: 'ჩურჩულით', icon: 'volume-1', text: 'ვინც მღერის და უკრავს, ერთ წრეს ძალიან ჩუმად — თითქმის ჩურჩულით.', sign: 'საჩვენებელი თითი ტუჩებთან.' },
  { title: 'შეჩერება!', icon: 'pause', text: 'ყველა ჩერდება ერთი ტაქტით. დირიჟორი ხელს გაშლის — ყველა ერთად ბრუნდება!', sign: 'მუშტი მაღლა, მერე ხელის გაშლა.' },
  { title: 'გაცვლა', icon: 'repeat-2', text: 'ორი ჯგუფი ბარათებს ცვლის: ტაში ბანი ხდება, ბანი — ტაში. ვინ უკეთ გაართმევს თავს?', sign: 'ორ ჯგუფზე მიუთითე და ხელები ერთმანეთის გარშემო დაატრიალე.' },
  { title: 'სწრაფად!', icon: 'rabbit', text: 'ერთი წრე ცოტა უფრო სწრაფად, მერე — ისევ ჩვეულებრივად. არავინ ჩამორჩეს!', sign: 'ხელი სწრაფად აქნიე.' },
  { title: 'ფინალი', on: ROLES, icon: 'trophy', final: true, text: 'ბოლო წრე — ყველა ერთად. ბოლო ნოტი გაბმით, სანამ დირიჟორი მუშტს არ შეკრავს.', sign: 'ეს ბარათი ცალკე დადე და გამოიყენე, როცა მოგინდება.' },
];

const miniStage = on => `<div class="gd-mini">${['back', 'front'].map(row => `<div class="gd-miniRow">${(row === 'back' ? SINGERS : PLAYERS).map(r =>
  `<span class="gd-miniFig ${on.includes(r) ? 'on' : ''}">${on.includes(r) ? FIG[r].on : FIG[r].off}</span>`).join('')}</div>`).join('')}</div>`;

const conductorCard = c => `<div class="card gd-cc ${c.final ? 'final' : ''}"><div class="frame"></div>
<div class="gd-ccTop">${icon(c.icon, { size: 6.5, color: c.final ? C.goldDark : C.wine, width: 1.9 })}<div class="fit gd-ccT"><b>${esc(c.title)}</b></div></div>
${c.on ? miniStage(c.on) : `<div class="gd-ccBig">${icon(c.icon, { size: 22, color: '#d9c4a0', width: 1.3 })}</div>`}
<div class="gd-ccBody"><p class="gd-ccText">${c.text}</p><p class="gd-sign">${icon('hand', { size: 3.8, color: C.goldDark, width: 2 })}<span>${c.sign}</span></p></div>
<div class="gd-cFoot"><span>${esc(title)} · დირიჟორი</span>${c.final ? '<b class="gd-fin">★</b>' : ''}</div></div>`;

const roleBack = `<div class="card gd-back"><div class="gd-backFrame"></div>
<div class="gd-backMid">${icon('drama', { size: 19, color: '#ecd393', width: 1.4 })}<span class="aso">${aso(title)}</span><span class="gd-backSub">როლის ბარათი</span></div></div>`;
const conductorBack = `<div class="card gd-back gd-backC"><div class="gd-backFrame"></div>
<div class="gd-backMid">${icon('wand-sparkles', { size: 19, color: '#ecd393', width: 1.4 })}<span class="aso">${aso(title)}</span><span class="gd-backSub">დირიჟორის ბარათი</span></div></div>`;

const deck = [...ROLES.map(r => ({ html: roleCard(r), back: roleBack })), ...CONDUCTOR.map(c => ({ html: conductorCard(c), back: conductorBack }))];
const deckSheets = [deck.slice(0, 9), deck.slice(9, 18)];
if (deck.length !== 18) throw new Error(`chemi-gundi: ${deck.length} cards`);

// ---------- the ensemble map: a row a role, a column a pass ----------
const mapGrid = (fill = null) => `<table class="gd-map">
  <tr><th class="r">როლი</th>${Array.from({ length: PASSES }, (_, k) => `<th>წრე ${k + 1}</th>`).join('')}</tr>
  ${ROLES.map(r => `<tr><td class="r"><span class="gd-dot" style="background:${colorOf(r)}"></span>${ROLE_NAMES[r]}</td>${Array.from({ length: PASSES }, (_, k) => {
    const v = fill?.[k]?.[r];
    return `<td${v ? ` class="in" style="background:${colorOf(r)}"` : ''}>${v && v !== true ? `<span>${v}</span>` : ''}</td>`;
  }).join('')}</tr>`).join('')}
</table>`;
const mapBox = `<div class="gd-mapBox">
  <div class="gd-mapHead"><span>სიმღერა <i></i></span><span>დირიჟორი <i></i></span></div>
  ${mapGrid()}
</div>`;
const mapPage = page(`<div class="gd-maps">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>გუნდის რუკა</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">დაგეგმეთ რვა წრე: შეღებეთ უჯრა, როცა ჯგუფი ამ წრეზე მღერის ან უკრავს. ჩაწერეთ „ჩ“ — ჩურჩულით, „!“ — ხმამაღლა, „ბ“ — ბურდონი. მერე შეასრულეთ: დირიჟორი რუკას მიყვება.</p>
  ${Array.from({ length: MAPS }, () => mapBox).join('')}
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდის რუკა</div>`, 'gd-mP');

// the rules' example: the ensemble grows from the bass, then rests on the voices, then everyone
const EXAMPLE = [
  { bani: true }, { bani: true, doli: true }, { bani: true, doli: true, mtqmeli: true }, { bani: true, doli: true, mtqmeli: true, modzakhili: true },
  { bani: true, doli: true, mtqmeli: true, modzakhili: true, tashi: true, panduri: true }, { mtqmeli: 'ჩ', modzakhili: 'ჩ', bani: 'ჩ' },
  { bani: 'ბ', doli: true, mtqmeli: true, modzakhili: true, tashi: true, panduri: true }, Object.fromEntries(ROLES.map(r => [r, '!'])),
];

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">მთელი კლასი — ერთი ანსამბლი! ექვსი ჯგუფი: სამი ხმა, ტაში, დოლი და ფანდური. ხალხური სიმღერის ფრაზა წრეზე ბრუნავს, დირიჟორი კი ჯგუფებს შემოიყვანს და გააჩუმებს: ბანს დოლი ემატება, მერე მთქმელი, მოძახილი… და უცებ მხოლოდ ბანი რჩება. ასე იბადება თქვენი საკუთარი გუნდის ჟღერადობა. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="gd-ex box">
    <h3>ასე მიდის თამაში</h3>
    <div class="gd-steps">
      <div>${step('drama', 'კლასი ექვს ჯგუფად იყოფა; თითო ჯგუფს როლის ბარათი: მთქმელი, მოძახილი, ბანი, ტაში, დოლი, ფანდური.')}${step('music', 'დირიჟორი ირჩევს სიმღერას და ხმებს პირველ ნოტებს აძლევს.')}${step('repeat', 'ფრაზა წრეზე ბრუნავს — ბოლოს ისევ თავიდან, ისევ და ისევ.')}</div>
      <div>${step('hand', 'ყოველი წრის დასაწყისში დირიჟორი ვიღაცას შემოიყვანს ან გააჩუმებს — ხელით ან დირიჟორის ბარათით.')}${step('map', 'ან წინასწარ ააწყეთ „გუნდის რუკა“ — რვა წრე, ვინ როდის მღერის — და შეასრულეთ.')}${step('trophy', 'ბოლოს „ფინალი“: ყველა ერთად. მერე როლები იცვლება — ახალი დირიჟორი, ახალი სიმღერა.', '#2f7d4f')}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სიმღერის ფრაზა სამ ხმაზე</td><td>${SONGS.length}</td><td>${no('s1')}–${no(`s${Math.ceil(PAGES / 2)}`)}</td></tr>
        <tr><td>როლის ბარათი</td><td>${ROLES.length}</td><td>${no('cards1')}</td></tr>
        <tr><td>დირიჟორის ბარათი</td><td>${CONDUCTOR.length}</td><td>${no('cards1')}–${no('cards2')}</td></tr>
        <tr><td>გუნდის რუკა (ორივე მხარეს)</td><td>${MAPS * 2}</td><td>${no('maps')}</td></tr>
      </table>
      <p class="gd-mix">რვა ხალხური სიმღერა — იმერული, რაჭული, მთიულური, გურული, აჭარული, სვანური, ქართლური, მოხეური — იგივე, რაც აპის „ჩემ გუნდში“.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>სიმღერები (${no('s1')}–${no(`s${Math.ceil(PAGES / 2)}`)}) — დირიჟორს და სამ ხმას, თითო ჯგუფს ერთი.</li>
        <li>ბარათები (${no('cards1')}–${no('cards2')}) — ჭრის ნიშნებზე დაჭერით. გუნდის რუკა (${no('maps')}) — რამდენიც საჭიროა.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Incredibox“-ის იდეით (ანსამბლი, რომელსაც ხმა-ხმა აწყობ). ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', '6–30 მოთამაშე, ექვს ჯგუფად. პატარა კლასში — ნაკლები ჯგუფი (ბანი, მთქმელი, ტაში და დოლი უკვე ანსამბლია). ერთი მოთამაშე დირიჟორია: ჯერ მასწავლებელი, მერე მოსწავლეები რიგრიგობით.'],
  ['როლები', 'მთქმელი, მოძახილი და ბანი ფურცლიდან მღერიან (I, II, III ხმა). ტაში, დოლი და ფანდური რიტმს აძლევენ: ბარათზე წერია, რა თქვან და დაუკრან — „ტა“, „დუმ“, „დრინ“…'],
  ['სიმღერა', `დირიჟორი ${SONGS.length} სიმღერიდან ერთს ირჩევს. მისი ფრაზა წრეზე ბრუნავს: ბოლოს მისვლისას ისევ თავიდან იწყება, უწყვეტად (‖: :‖).`],
  ['დაწყება', 'დირიჟორი ხმებს პირველ ნოტებს აძლევს (ფურცელზე წერია), ითვლის „ერთი-ორი“ ან „ერთი-ორი-სამი“ (ესეც წერია) და უთითებს, ვინ იწყებს — ჩვეულებრივ ბანი ან დოლი.'],
  ['შემოსვლა და გასვლა', 'ჯგუფი შემოდის ან ჩუმდება მხოლოდ წრის დასაწყისში. დირიჟორი წინასწარ აჩვენებს: უთითებს ჯგუფზე და თითებზე ითვლის 3-2-1.'],
  ['დირიჟორის ბარათები', `${CONDUCTOR.length - 1} ბარათი აურიეთ; „ფინალი“ ცალკე დადეთ. ყოველ წრეზე დირიჟორი ერთ ბარათს იღებს და ასრულებს — პატარა სცენაზე ჩანს, ვინ მღერის მის მერე. როცა მოუნდება, „ფინალს“ ჩამოდის.`],
  ['ააწყე შენი', 'ჯგუფები „გუნდის რუკაზე“ წინასწარ გეგმავენ რვა წრეს: ვინ რომელ წრეზე მღერის. მერე ასრულებენ — დირიჟორი რუკას მიყვება. ქვემოთ — მაგალითი.'],
  ['როლების ცვლა', 'სიმღერის მერე ბარათები მარცხნივ გადადის, რომ ყველამ ყველა როლი გაიაროს. ახალი დირიჟორი — ახალი სიმღერა.'],
  ['რა არის კარგი', 'ჯგუფი ზუსტად წრის დასაწყისში შემოდის; რიტმი არ ჩქარდება და არ ნელდება; ხმა თავის ნოტზე რჩება, როცა სხვები შემოდიან. კლასი ტაშით აჯილდოებს დირიჟორს, ვისაც ყველაზე ლამაზი გადასვლები ჰქონდა.'],
  ['უფრო რთულად', 'ბანი ბურდონზე, ტაში „ტა ტი-ტი“-ზე, დოლი „სვლაზე“. ან ზეპირად, ფურცლის გარეშე.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ჩემი გუნდი“ ანსამბლის თამაშია: ქართულ სიმღერაში ყოველ ხმას და საკრავს თავისი ადგილი აქვს, და ერთად ისინი სხვანაირად ჟღერს, ვიდრე ცალ-ცალკე. აქ კლასი თვითონ აწყობს, ვინ როდის შემოვა — და ისმენს, როგორ იცვლება სიმღერა.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="gd-example box"><b>მაგალითი — „იზრდება“:</b> ბანი მარტო იწყებს, ყოველ წრეზე ერთი ემატება, მეექვსეზე სამი ხმა ჩურჩულით, მერე ბანი ბურდონზე და ყველა, ბოლოს ყველა ხმამაღლა.${mapGrid(EXAMPLE)}</div>
  <div class="rs-more box"><b>აპშიც</b> არის: სცენაზე ექვსი მომღერალი და მუსიკოსი — ჩართე, გამორთე, აირჩიე ვარიანტი და ჩაწერე შენი ანსამბლი; კლასთან კი ტელეფონი რამდენიმე როლს უკრავს, დანარჩენს კლასი ცოცხლად ასრულებს — sagandzureli.ge → თამაშები → ჩემი გუნდი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(0.8);

export const css = `${coverCss}${musicCss}${partsCss}
.gd-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.gd-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.gd-mHead b{font-size:13pt;color:var(--wine)}
.gd-for{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.gd-songs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:23mm;display:grid;grid-template-rows:repeat(${PER_PAGE},1fr);gap:5mm}
.gd-song{border:.3mm solid var(--line);border-radius:2.2mm;padding:4mm 5mm 3mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.gd-head{display:flex;gap:3mm;align-items:flex-start}
.gd-no{flex:none;width:9mm;height:9mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:13pt;display:flex;align-items:center;justify-content:center}
.gd-t{min-width:0;flex:1;display:flex;flex-direction:column;line-height:1.2}
.gd-t b{font-size:13.5pt;color:var(--brown)}
.gd-t span{font-size:9.5pt;color:var(--muted);margin-top:.6mm}
.gd-count{flex:none;display:flex;align-items:center;gap:1.6mm;border:.3mm solid var(--gold);border-radius:2mm;padding:1mm 2.2mm;color:var(--wine)}
.gd-count b{font-size:17pt;line-height:1;font-family:'SansKa',sans-serif;font-weight:900}
.gd-count span{font-size:8.6pt;line-height:1.15;font-weight:700}
.gd-first{display:flex;align-items:center;flex-wrap:wrap;gap:1.6mm 3mm;margin:3mm 0 1mm;font-size:10pt;color:var(--brown)}
.gd-first>span:first-of-type{font-weight:700;color:var(--wine)}
.gd-v{display:inline-flex;align-items:center;gap:1.2mm;font-weight:700}
.gd-v i{font-style:normal;display:inline-flex;min-width:6mm;height:5.2mm;padding:0 1.2mm;border-radius:2.6mm;color:#fff;font-size:8.5pt;font-weight:800;align-items:center;justify-content:center}
.gd-drone{margin-left:auto;color:${colorOf('bani')}}
.gd-song .abc{margin-top:auto;margin-bottom:auto}
.gd-beat{display:flex;flex-wrap:wrap;gap:1mm 5mm;border-top:.2mm dashed var(--line);padding-top:1.6mm;font-size:10pt;color:var(--brown)}
.gd-beat b{font-weight:800;margin-right:1mm}
.gd-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.gd-card .gd-cTop{position:absolute;left:4.6mm;right:5mm;top:4.6mm;height:31mm;display:flex;gap:1.6mm;align-items:stretch}
.gd-fig{flex:none;width:20mm;height:31mm}
.gd-fig svg{width:100%;height:100%;display:block}
.gd-cName{min-width:0;flex:1;display:flex;flex-direction:column;justify-content:center;line-height:1.15}
.gd-nm{font-size:15.5pt;white-space:nowrap;overflow:hidden}
.gd-nm b{font-weight:800;display:inline-block}
.gd-what{font-size:9pt;color:var(--muted);margin-top:.8mm;font-weight:700}
.gd-how{font-size:8.7pt;line-height:1.25;color:var(--brown);margin-top:1.8mm}
.gd-cBody{position:absolute;left:5.4mm;right:5.4mm;top:37mm;bottom:10mm;display:flex;flex-direction:column;justify-content:center;gap:2mm;border-top:.2mm solid var(--line);padding-top:1.6mm}
.gd-lanes{display:flex;justify-content:center}
.gd-tip{margin:0;display:flex;gap:1.4mm;align-items:flex-start;font-size:8.7pt;line-height:1.28;color:#6b5a48;font-style:italic}
.gd-tip svg{flex:none;margin-top:.2mm}
.gd-vars{display:flex;flex-direction:column;gap:1.5mm}
.gd-pws{display:flex;flex-wrap:wrap;column-gap:3mm}
.gd-var{display:flex;flex-direction:column;line-height:1.2}
.gd-var b{font-size:9.6pt;font-weight:800}
.gd-var>span{font-size:8.8pt;color:var(--brown)}
.gd-pw{display:flex;align-items:baseline;gap:1.4mm;font-size:9.2pt;color:var(--brown);white-space:nowrap}
.gd-pw i{font-style:normal;flex:none;display:inline-flex;width:3.8mm;height:3.8mm;border-radius:50%;background:var(--parch);color:var(--wine);font-size:7.4pt;font-weight:800;align-items:center;justify-content:center}
.gd-cFoot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:center;font-size:8.6pt;color:var(--muted)}
.gd-cFoot b{font-family:'SansKa',sans-serif;font-weight:900;font-size:10pt}
.gd-cc .frame{border-color:var(--gold)}
.gd-cc.final .frame{border-color:var(--goldDark,#a67c2e);border-width:.8mm}
.gd-cc.final{background:#fdf6e3}
.gd-ccTop{position:absolute;left:5.4mm;right:5.4mm;top:5.6mm;display:flex;align-items:center;gap:2mm}
.gd-ccT{min-width:0;flex:1;font-size:14pt;white-space:nowrap;overflow:hidden}
.gd-ccT b{display:inline-block;font-weight:800;color:var(--wine);line-height:1.1}
.gd-cc.final .gd-ccT b{color:#7a5a18}
.gd-mini{position:absolute;left:7mm;right:7mm;top:15.5mm;height:33mm;border-radius:2mm;background:linear-gradient(#fbf3e2 0 55%,#d9b483 55% 100%);display:flex;flex-direction:column;justify-content:space-between;padding:.6mm 1.5mm 0;overflow:hidden}
.gd-miniRow{display:flex;justify-content:space-around;height:50%}
.gd-miniFig{width:14mm;height:100%}
.gd-miniFig svg{width:100%;height:100%;display:block}
.gd-ccBig{position:absolute;left:0;right:0;top:17mm;height:30mm;display:flex;align-items:center;justify-content:center}
.gd-ccBody{position:absolute;left:5.6mm;right:5.6mm;top:51mm;bottom:10.5mm;display:flex;flex-direction:column;justify-content:center;gap:2mm}
.gd-ccText{margin:0;font-size:9.4pt;line-height:1.3;color:var(--brown);text-align:center}
.gd-sign{margin:0;display:flex;gap:1.4mm;align-items:flex-start;font-size:8.6pt;line-height:1.28;color:#6b5a48;font-style:italic}
.gd-sign svg{flex:none;margin-top:.2mm}
.gd-fin{color:#a67c2e;font-size:12pt}
.gd-back{background:var(--wine);background-image:repeating-linear-gradient(45deg,rgba(236,211,147,.11) 0 2.2mm,transparent 2.2mm 4.8mm)}
.gd-backC{background-color:#3b2a20}
.gd-backFrame{position:absolute;inset:3mm;border:.4mm solid #ecd393;border-radius:2.6mm;opacity:.85}
.gd-backMid{position:absolute;left:0;right:0;top:25mm;display:flex;flex-direction:column;align-items:center;gap:3.4mm}
.gd-backMid .aso{font-size:12pt;color:#ecd393;letter-spacing:.06em}
.gd-backSub{font-size:9pt;color:#ecd393;opacity:.85}
.gd-maps{position:absolute;inset:12mm 12mm 12mm}
.gd-mapBox{border:.3mm solid var(--line);border-radius:2mm;padding:2.6mm 3mm 3mm;background:#fff;margin-bottom:4.5mm}
.gd-mapHead{display:flex;gap:6mm;font-size:10.5pt;font-weight:700;color:var(--wine);margin-bottom:2mm}
.gd-mapHead span{flex:1;display:flex;gap:2mm;align-items:baseline}
.gd-mapHead i{flex:1;border-bottom:.3mm solid #bba98f}
table.gd-map{width:100%;border-collapse:collapse;table-layout:fixed}
.gd-map th,.gd-map td{border:.25mm solid #bba98f;text-align:center;padding:0}
.gd-map th{background:var(--parch);color:var(--wine);font-size:8.6pt;height:6.5mm}
.gd-map td{height:9mm;font-size:11pt;font-weight:800;color:#fff}
.gd-map .r{width:27mm;text-align:left;padding-left:1.6mm}
.gd-map td.r{font-size:9.6pt;font-weight:700;color:var(--brown);background:var(--cream);white-space:nowrap}
.gd-dot{display:inline-block;width:2.8mm;height:2.8mm;border-radius:50%;margin-right:1.4mm;vertical-align:-.3mm}
.gd-example{margin-top:3mm;font-size:9.8pt;line-height:1.35}
.gd-example table.gd-map{margin-top:2mm}
.gd-example .gd-map td{height:6.4mm;font-size:9.5pt}
.gd-example .gd-map th{height:5.4mm;font-size:8.2pt}
.gd-ex{margin:0 0 5mm;padding:4mm 5mm}
.gd-ex h3{margin:0 0 3mm}
.gd-steps{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.gd-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
.rulesP .rules{font-size:10.6pt;line-height:1.36}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(PAGES / 2); s++) {
  SHEETS.push({ key: `s${s + 1}`, front: songPage(s * 2), ...(s * 2 + 1 < PAGES ? { back: songPage(s * 2 + 1) } : {}) });
}
deckSheets.forEach((cards, k) => SHEETS.push({
  key: `cards${k + 1}`,
  front: cardSheet(cards.map(c => c.html), { label: `${title} · ${k ? 'დირიჟორის ბარათები' : 'როლები და დირიჟორის ბარათები'}` }),
  back: cardSheet(cards.map(c => c.back), { back: true, label: `${title} · ბარათები — ზურგი` }),
}));
SHEETS.push({ key: 'maps', front: mapPage, back: mapPage });
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
