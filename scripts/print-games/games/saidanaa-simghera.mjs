// „საიდანაა სიმღერა?“ on paper — the სამაგიდო variant of the app's GeoGuessr of songs (2026-11-01): a big map of the songs
// map's 13 regions, numbered west to east (two A4 pieces → 39×28 cm), 40 song cards — in front, for the teams, the song's
// name, its kind and first words; behind it, for the host, the region on a small map (green, its neighbours light green, as
// the app shows them) — the teams' answer sheets and the score sheet. The host reads the front (or sings the song), the teams
// write the region's number: the region 2 points, a neighbour 1. The songs are the songs map's (data/songsData.ts) most
// recorded ones of each region by a quota, without a title that names a region or is sung in more than one.
import { C, SERIES, SCHOOL, aso, esc, icon, iconIn, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss, grapeEmblem } from '../lib.mjs';
import { appData } from '../appData.mjs';
import { TEAM_NAMES, partsCss, scoreSheet, step } from '../kitParts.mjs';
import { MINI, NEAR, REGION, REGIONS, RIGHT, mapBoard, mapCss, miniMap, regionKey } from '../regionMap.mjs';

const { FOLK_SONGS, mulberry32, shuffle } = await appData({
  'data/songsData.ts': ['FOLK_SONGS'],
  'utils/otkheuli.ts': ['mulberry32'],
  'utils/amikhseni.ts': ['shuffle'],
});

export const id = 'saidanaa-simghera';
export const title = 'საიდანაა სიმღერა?';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '2–6 გუნდი · 8 წლიდან · 15–25 წუთი';
const ROUNDS = 12;
const SECONDS = 40;

// ---------- the songs ----------
const QUOTA = { abkhazeti: 2, svaneti: 4, samegrelo: 4, racha: 3, imereti: 3, guria: 4, achara: 3, samtskhe: 1, shidakartli: 3, kvemokartli: 2, mtianeti: 4, kakheti: 4, kalakuri: 3 };
// a title (or kind) that says where the song is from would answer the round
const NAMES_A_REGION = /კახ|იმერ|გურულ|გურია|მეგრ|სვან|რაჭ|ლეჩხ|აჭარ|ქართლ|მთიულ|ფშა|ხევსურ|თუშ|აფხაზ|ქალაქ|მესხ|ჯავახ|სამცხ|ქიზიყ|დადიან/;
// a tune for an instrument, or a name that only says what kind of song it is
const NOT_A_SONG = /მელოდია|პოპური|გარმონზე|ჭიბონზე|ფანდურზე|^საქორწილო( სიმღერა)?$|^თხრობა$|ხმით ტირილი/;
const norm = t => t.trim().replace(/\s*\(.*?\)\s*/g, ' ').replace(/[„“"]/g, '').replace(/\s+/g, ' ').trim();
const takesOf = s => s.versions.length + (s.recs?.length ?? 0) + (s.centre?.length ?? 0);
/** the song's first line of words, cut at a word near 44 letters */
const firstWords = s => {
  const line = (s.lyrics ?? '').split('\n').map(l => l.trim()).find(l => l && !/^[[(]/.test(l));
  if (!line) return '';
  const t = line.replace(/[.,;:!?…–-]+$/, '');
  return [...t].length > 44 ? `${[...t].slice(0, 42).join('').replace(/\s+\S*$/, '')}…` : t;
};

const regionsOfTitle = new Map();
for (const s of FOLK_SONGS) if (!s.ownerOnly) regionsOfTitle.set(norm(s.title), new Set([...(regionsOfTitle.get(norm(s.title)) ?? []), s.region]));
/** the songs picked for each region, the most recorded first (also „ხმის წყვილები“'s third deck takes each region's first) */
export const SONGS = REGIONS.flatMap(r => {
  const pool = FOLK_SONGS
    .filter(s => s.region === r.id && !s.ownerOnly && regionsOfTitle.get(norm(s.title)).size === 1 && !NAMES_A_REGION.test(s.title)
      && !NOT_A_SONG.test(norm(s.title)) && s.genre !== 'საკრავიერი')
    .sort((a, b) => takesOf(b) - takesOf(a) || Number(!!b.lyrics) - Number(!!a.lyrics) || a.title.localeCompare(b.title, 'ka'));
  const picked = [];
  for (const s of pool) {
    if (picked.length >= QUOTA[r.id]) break;
    // one of two close names (ფერხისა, ფერხისული)
    if (picked.some(p => norm(p.title).slice(0, 5) === norm(s.title).slice(0, 5))) continue;
    picked.push(s);
  }
  if (picked.length < QUOTA[r.id]) throw new Error(`${r.id}: only ${picked.length} songs`);
  return picked.map(s => ({
    title: s.title.trim(), region: r, takes: takesOf(s),
    genre: s.genre && !NAMES_A_REGION.test(s.genre) ? s.genre : '',
    words: firstWords(s),
    place: [s.area, s.municipality].filter(Boolean).join(', '),
  }));
});
const CARDS = shuffle(SONGS, mulberry32(20261101)).map((c, i) => ({ ...c, no: i + 1 }));


// ---------- the cards: the song in front, its region behind it ----------
const band = `<div class="sk-band">${icon('map-pin', { size: 4.4, color: '#fff', width: 2 })}<span>საიდანაა?</span></div>`;
const shade = `<div class="sk-shade">${(() => `<svg viewBox="-8 -8 1016 545" style="display:block;width:100%;height:auto">${REGIONS.map(r =>
  `<path d="${MINI[r.id]}" fill="${C.gold}" stroke="${C.paper}" stroke-width="7"/>`).join('')}</svg>`)()}</div>`;
const front = c => `<div class="card sk"><div class="frame"></div><div class="frame2"></div>${band}${shade}
<div class="sk-mid">
  <div class="sk-name${[...c.title].length > 18 ? ' long' : ''}">${esc(c.title)}</div>
  ${c.genre ? `<div class="sk-genre">${esc(c.genre)}</div>` : ''}
  ${c.words ? `<div class="sk-words">„${esc(c.words)}“</div>` : ''}
</div>
<div class="sk-foot"><span>№ ${c.no}</span><span>კუთხე ზურგზეა</span></div></div>`;
const back = c => `<div class="card sk"><div class="frame" style="border-color:${RIGHT}"></div>
<div class="sk-band out">${icon('eye-off', { size: 4.2, color: RIGHT, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sk-reg"><i>${c.region.no}</i><b>${esc(c.region.name)}</b></div>
<div class="sk-map">${miniMap(c.region.id)}</div>
<div class="sk-near"><b>მეზობელი — 1 ქულა:</b> ${c.region.near.map(n => `${REGION[n].no} ${esc(REGION[n].name)}`).join(', ')}</div>
${c.place ? `<div class="sk-place">${icon('map-pin', { size: 3.2, color: C.muted, width: 2 })}<span>${esc(c.place)}</span></div>` : ''}
<div class="sk-foot"><span>№ ${c.no}</span><span class="t">${esc(c.title)}</span></div></div>`;
const blankFront = `<div class="card sk"><div class="frame" style="border-color:${C.goldDark}"></div>${band.replace('sk-band"', `sk-band" style="background:${C.goldDark}"`)}${shade}
<div class="sk-mid"><div class="sk-mine">შენი სიმღერა</div><div class="sk-lines"><i></i><i></i><i></i></div></div>
<div class="sk-foot"><span>№</span><span>კუთხე ზურგზეა</span></div></div>`;
const blankBack = `<div class="card sk"><div class="frame" style="border-color:${C.goldDark}"></div>
<div class="sk-band out" style="color:${C.goldDark};border-color:${C.goldDark}">${icon('eye-off', { size: 4.2, color: C.goldDark, width: 2 })}<span>წამყვანისთვის</span></div>
<div class="sk-reg"><span class="sk-hint">შემოხაზე კუთხე:</span></div>
<div class="sk-map">${miniMap()}</div>
<div class="sk-lines b"><i></i><i></i></div>
<div class="sk-foot"><span>№</span><span>შენი სიმღერა</span></div></div>`;

const SLOTS = CARDS.map(c => ({ c, front: front(c), back: back(c) }));
while (SLOTS.length % 9) SLOTS.push({ front: blankFront, back: blankBack });
const CARD_SHEETS = SLOTS.length / 9;
const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const nine = SLOTS.slice(s * 9, s * 9 + 9);
  const nos = nine.filter(x => x.c).map(x => x.c.no);
  const what = `№ ${nos[0]}–${nos[nos.length - 1]}${nine.some(x => !x.c) ? ', ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: cardSheet(nine.map(x => x.front), { label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${what}` }),
    back: cardSheet(nine.map(x => x.back), { back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — კუთხეები (ზურგი)` }),
  };
});


// ---------- the big map (regionMap.mjs) with this game's steps ----------
const { tilePage } = mapBoard({
  title,
  sub: '13 კუთხის სიმღერების რუკა — პასუხად კუთხის ნომერი ჩაწერეთ',
  steps: [
    [14, 'megaphone', ['წამყვანი ბარათს კითხულობს', 'ან სიმღერას მღერის']],
    [104, 'pencil', ['გუნდები კუთხის ნომერს წერენ', `${SECONDS} წამი აქვთ`]],
    [209, 'rotate-ccw', ['ბარათი ტრიალდება', 'სწორი კუთხე — 2 ქულა, მეზობელი — 1']],
    [299, 'mic-vocal', ['ბონუსი: +1', 'ვინც სიმღერის სტრიქონს იმღერებს']],
  ],
});

// ---------- a team's answer sheet: half an A4 page each ----------
const teamHalf = `<div class="sk-team">
  <div class="sk-tHead"><span class="aso">${aso(title)}</span><span class="sk-tName">გუნდი <i></i></span></div>
  ${regionKey()}
  <table class="sk-tab">
    <tr><th class="r">რაუნდი</th><th class="n">კუთხის №</th><th>სიმღერა (თუ იცით, სტრიქონიც)</th><th class="p">ქულა</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="n"></td><td></td><td class="p"><span>2</span><span>1</span><span>0</span></td></tr>`).join('')}
  </table>
</div>`;
const teamPage = page(`${teamHalf}<div class="sk-cut"></div>${teamHalf}
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · გუნდების ფურცლები (ორი ერთ გვერდზე, გაჭერი შუაზე)</div>`, 'sk-tP');

const scorePage = scoreSheet({
  title, rows: ROUNDS, what: 'ბარათი №',
  hint: 'გუნდის სახელი სვეტის თავში. სწორი კუთხე — 2 ქულა, მისი მეზობელი (ბარათის ზურგზე ღია მწვანე) — 1, სხვა — 0. ვინც სიმღერის სტრიქონს იმღერებს — კიდევ +1.',
  remind: [
    ['megaphone', 'ბარათი', 'წამყვანი წინა მხარეს კითხულობს, ან სიმღერას მღერის.'],
    ['pencil', 'პასუხი', `გუნდები ${SECONDS} წამში კუთხის ნომერს წერენ.`],
    ['check', 'ქულა', 'კუთხე — 2, მეზობელი — 1, სტრიქონის მღერა — +1.', '#2f7d4f'],
    ['trophy', 'მოგება', 'ბოლოს მეტი ქულა; ფრე — კიდევ ერთი ბარათი.', C.goldDark],
  ],
});

// ---------- the cover and the rules ----------
const EX = CARDS.find(c => c.words && c.genre && [...c.title].length < 14) ?? CARDS[0];
const count = id => CARDS.filter(c => c.region.id === id).length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ყველა ქართულ სიმღერას თავისი კუთხე აქვს — და თავისი ხმა, ენა და ჰანგი. წამყვანი სიმღერის სახელს და პირველ სიტყვებს კითხულობს (თუ იცის — მღერის), გუნდები კი რუკაზე ეძებენ, საქართველოს რომელი კუთხისაა. სწორი კუთხე — 2 ქულა, მეზობელი — 1. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="sk-ex box">
    <div class="sk-exCards"><div class="sk-exCard">${front(EX)}</div><div class="sk-exCard">${back(EX)}</div></div>
    <div class="sk-exR">
      <h3>ასე მიდის რაუნდი</h3>
      ${step('megaphone', 'წამყვანი ზედა ბარათს იღებს და წინა მხარეს ხმამაღლა კითხულობს. ზურგს — კუთხეს — მხოლოდ თვითონ ხედავს.')}
      ${step('pencil', `გუნდები რუკას უყურებენ, თათბირობენ და ${SECONDS} წამში ფურცელზე კუთხის ნომერს წერენ.`)}
      ${step('rotate-ccw', 'წამყვანი ბარათს აბრუნებს: მწვანე კუთხე — 2 ქულა, ღია მწვანე მეზობელი — 1.', '#2f7d4f')}
      ${step('mic-vocal', 'ბონუსი: გუნდი, რომელიც სიმღერის ერთ სტრიქონს იმღერებს, +1 ქულას იღებს.', C.goldDark)}
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>რუკა, 39×28 სმ (ორი ნაწილი)</td><td>1</td><td>${no('map1')}–${no('map2')}</td></tr>
        <tr><td>სიმღერის ბარათები: სახელი წინ, კუთხე ზურგზე</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები შენი სიმღერებისთვის</td><td>${SLOTS.length - CARDS.length}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>გუნდის ფურცელი (ორი ერთ გვერდზე)</td><td>4</td><td>${no('teams')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="sk-mix">${CARDS.length} სიმღერა ყველა 13 კუთხიდან (${REGIONS.map(r => `${r.name} ${count(r.id)}`).join(', ')}) — საგანძურის სკოლის აპის სიმღერების რუკიდან, ყველაზე ხშირად ჩაწერილები.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>რუკა (${no('map1')}–${no('map2')}): ორივე ნაწილი კიდეებზე მონიშნული ხაზებით გაჭერი, გვერდიგვერდ დადე და ზურგიდან სკოჩით შეაერთე.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — სქელ ქაღალდზე; ჭრა კიდეებზე მონიშნული ხაზებით.</li>
        <li>გუნდების ფურცელი (${no('teams')}) — 4 გუნდისთვის; მეტი გუნდისთვის ორჯერ დაბეჭდე. ქულების ფურცელი (${no('score')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია თამაშ „GeoGuessr“-ის იდეით. სიმღერები, კუთხეები და ადგილები საგანძურის სკოლის აპის სიმღერების რუკიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში 2–6 მოთამაშე. სახელები — საკრავების: ${TEAM_NAMES.join(', ')}, ან მოიგონეთ თქვენი. თითო გუნდს — ფურცელი და ფანქარი.`],
  ['რუკა', 'მაგიდის შუაში დადეთ, ყველას რომ ხედავდეს. 13 კუთხე დანომრილია დასავლეთიდან აღმოსავლეთისკენ; წვრილად აწერია, რომელ კუთხეს ეკუთვნის ხევი, ხევსურეთი, ფშავი, მთიულეთი და თუშეთი.'],
  ['წამყვანი', 'მასწავლებელი ან ის, ვინც ბევრ სიმღერას იცნობს, — ის არ თამაშობს. ბარათებს აურევს და დასტად დებს, სახელით ზემოთ.'],
  ['ბარათი', 'წამყვანი იღებს ზედა ბარათს, ზურგს თავისკენ იჭერს და ხმამაღლა კითხულობს სიმღერის სახელს, ჟანრს და პირველ სიტყვებს. თუ სიმღერა იცის — სჯობს, იმღეროს.'],
  ['პასუხი', `გუნდები თათბირობენ და ${SECONDS} წამში ფურცელზე კუთხის ნომერს წერენ. ენაც გეტყვით: სვანური, მეგრული, აფხაზური სიტყვები თავის კუთხეს ამხელს.`],
  ['ქულა', 'წამყვანი ბარათს აბრუნებს: მწვანე — სწორი კუთხე, 2 ქულა; ღია მწვანე — მისი მეზობელი, 1 ქულა; სხვა — 0. ქულებს ფურცელზე წერს.'],
  ['ბონუსი', 'ვინც სიმღერის ერთ სტრიქონს იმღერებს (სიტყვებით ან ხმით), +1 ქულას იღებს — თუნდაც კუთხე ვერ გამოიცნო. ერთ რაუნდში — ერთი ბონუსი გუნდზე.'],
  ['მოგება', `${ROUNDS} ბარათის (ან შეთანხმებული დროის) მერე იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — კიდევ ერთი ბარათი.`],
  ['უფრო რთულად', 'წამყვანი მხოლოდ სახელს ამბობს — ჟანრის და სიტყვების გარეშე; ან მხოლოდ მღერის.'],
  ['უფრო მარტივად', 'პატარებთან: გუნდი თავის ჯერზე თითს ადებს რუკაზე, დანარჩენები ეხმარებიან; სწორ კუთხეზე — 1 ქულა.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„საიდანაა სიმღერა?“ ქართული სიმღერის გეოგრაფიაა: ყველა კუთხეს თავისი ხმა, ენა და ჰანგი აქვს. რაც მეტ სიმღერას იცნობ, მით უფრო ადვილად იპოვი მის სამშობლოს რუკაზე.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: სიმღერის ჩანაწერის ნაწყვეტი ჟღერს და კუთხეს რუკაზე ტელეფონით ნიშნავ — რაც უფრო მალე, მით მეტი ქულა; ონლაინ, ან ერთი ტელეფონით, გუნდებად — sagandzureli.ge → თამაშები → საიდანაა სიმღერა?</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}${partsCss}${mapCss}
.sk-band{position:absolute;left:3.6mm;right:3.6mm;top:3.6mm;height:10mm;border-radius:1.6mm;display:flex;align-items:center;justify-content:center;gap:1.6mm;background:var(--wine);color:#fff;font-weight:700;font-size:10.5pt;padding:0 2mm;white-space:nowrap;z-index:1}
.sk-band.out{background:#fff;border:.35mm solid ${RIGHT};color:${RIGHT}}
.sk-shade{position:absolute;left:6mm;right:6mm;bottom:11mm;opacity:.16}
.sk-mid{position:absolute;left:5.6mm;right:5.6mm;top:16mm;bottom:20mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4mm;text-align:center;z-index:1}
.sk-name{font-family:'SansKa',sans-serif;font-weight:900;font-size:15pt;line-height:1.15;color:var(--brown)}
.sk-name.long{font-size:12.5pt}
.sk-genre{font-size:9pt;font-weight:700;color:var(--wine);background:var(--cream);border:.25mm solid var(--line);border-radius:3mm;padding:.4mm 2.6mm}
.sk-words{font-size:9.6pt;line-height:1.3;font-style:italic;color:#5d4a3a}
.sk-mine{font-weight:800;font-size:12pt;color:var(--gold2)}
.sk-lines{display:flex;flex-direction:column;gap:6mm;width:100%}
.sk-lines i{display:block;border-bottom:.25mm solid #9d8c77;height:0}
.sk-lines.b{position:absolute;left:6mm;right:6mm;top:62mm;gap:5mm;width:auto}
.sk-foot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:baseline;gap:3mm;font-size:10pt;color:var(--muted);z-index:1}
.sk-foot span:first-child{font-weight:700;white-space:nowrap}
.sk-foot .t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9pt}
.sk-reg{position:absolute;left:5mm;right:5mm;top:16.4mm;display:flex;align-items:center;justify-content:center;gap:2mm}
.sk-reg i{flex:none;font-style:normal;width:7.4mm;height:7.4mm;border-radius:50%;background:${RIGHT};color:#fff;font-family:'SansKa',sans-serif;font-weight:900;font-size:12pt;display:flex;align-items:center;justify-content:center}
.sk-reg b{font-family:'SansKa',sans-serif;font-weight:900;font-size:13pt;line-height:1.1;color:${RIGHT}}
.sk-hint{font-size:10pt;font-weight:700;color:var(--gold2)}
.sk-map{position:absolute;left:4.2mm;right:4.2mm;top:26.5mm}
.sk-near{position:absolute;left:5.4mm;right:5.4mm;top:57mm;font-size:8.6pt;line-height:1.28;color:var(--brown)}
.sk-near b{color:#2a5a3b}
.sk-place{position:absolute;left:5.4mm;right:5.4mm;bottom:10.6mm;display:flex;gap:1.2mm;align-items:flex-start;font-size:8.4pt;line-height:1.25;color:var(--muted)}
.sk-place svg{flex:none;margin-top:.3mm}
.sk-ex{display:grid;grid-template-columns:auto 1fr;gap:6mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.sk-exCards{display:flex;gap:3mm}
.sk-exCard{position:relative;width:47.25mm;height:66mm;border-radius:2mm;overflow:hidden;box-shadow:0 .6mm 2mm rgba(74,52,38,.25)}
.sk-exCard>.card{position:absolute;left:0;top:0;transform:scale(.75);transform-origin:0 0}
.sk-exR h3{margin:0 0 3mm}
.sk-mix{margin:2.4mm 0 0;font-size:9pt;line-height:1.35;color:var(--brown)}
.sk-team{height:148.5mm;padding:8mm 12mm 4mm;position:relative}
.sk-cut{position:absolute;left:6mm;right:6mm;top:148.5mm;border-top:.3mm dashed #b3a593}
.sk-tHead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm}
.sk-tHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.sk-tName{flex:1;display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine)}
.sk-tName i{flex:1;border-bottom:.3mm solid #bba98f}
table.sk-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.sk-tab th,.sk-tab td{border:.25mm solid #bba98f;padding:0 1.6mm}
.sk-tab th{background:var(--parch);color:var(--wine);font-size:9.5pt;height:6.4mm;text-align:left}
.sk-tab td{height:8.5mm}
.sk-tab .r{width:17mm;text-align:center}
.sk-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.sk-tab .n{width:24mm;text-align:center}
.sk-tab .p{width:27mm;text-align:center}
.sk-tab td.p{white-space:nowrap}
.sk-tab td.p span{display:inline-flex;width:6mm;height:6mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:9pt;color:#7d6e5d;margin:0 .45mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'map1', front: tilePage(1) },
  { key: 'map2', front: tilePage(2) },
  ...cardSheets,
  { key: 'teams', front: teamPage, back: teamPage },
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
