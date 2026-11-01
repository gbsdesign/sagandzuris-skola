// „ნახატობანა“ on paper (2026-11-01, like Pictionary): the app's 154 words (`data/nakhatiWords.ts`, seven themes of 22) on
// 22 cards of seven words — a word of every theme, in the theme's colour — and a board, „სახატავი გზა“: a winding road of
// coloured squares from „სტარტი“ to „ფინიში“. A team draws the word of its square's colour; guessed in a minute, it rolls the
// die and goes on; a ★ square is „ყველა ხატავს“ (every team's artist draws the same word, the first team to guess moves).
// With it: five blank cards, six standing pawns in the app's team colours, a die to fold, a sheet of drawing frames, the
// rules. The minute and the team names are the app's own (`utils/nakhati.ts`, `utils/amikhseni.ts` TEAM_NAMES).
import { C, SERIES, SCHOOL, aso, esc, icon, iconIn, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.mjs';
import { appData } from '../appData.mjs';

const { NAKHATI_THEMES, TEAM_NAMES } = await appData({
  'data/nakhatiWords.ts': ['NAKHATI_THEMES'],
  'utils/amikhseni.ts': ['TEAM_NAMES'],
});

export const id = 'nakhatobana';
export const title = 'ნახატობანა';
const TAG = 'ცოცხალი · უტელეფონო';
const META = '4–30 მოთამაშე, 2–6 გუნდი · 6 წლიდან · 30–45 წუთი';
// the app's theme marks (pages/games/nakhati/parts.tsx THEME_ICON) as lucide names
const ICONS = { sufra: 'utensils-crossed', samosi: 'shirt', musika: 'guitar', buneba: 'paw-print', adgilebi: 'mountain', sakme: 'hammer', zghapari: 'castle' };
// the app's team colours (pages/games/rounds/teams.tsx TEAM_TINT), so a team's pawn matches its chip on the phone
const TEAM_TINT = ['#2b5f8a', '#cf7428', '#4f8a3c', '#5b3f8c', '#b23a48', '#24827e'];
const GOLD_STAR = '#d9a520';

/** a small seeded random (the same deal every build) */
const mulberry32 = seed => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const shuffled = (arr, rnd) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ---------- the cards: a word of every theme on each ----------
const N = NAKHATI_THEMES[0].words.length;
for (const t of NAKHATI_THEMES) if (t.words.length !== N) throw new Error(`nakhatobana: theme ${t.id} has ${t.words.length} words, not ${N} — every card holds one word of every theme`);
const rnd = mulberry32(23);
const COLS = NAKHATI_THEMES.map(t => shuffled(t.words.map(x => x.w), rnd));
const CARDS = Array.from({ length: N }, (_, i) => NAKHATI_THEMES.map((t, j) => ({ t, w: COLS[j][i] })));
const WORDS = N * NAKHATI_THEMES.length;
const SLOTS = Math.ceil(CARDS.length / 9) * 9;
const BLANKS = SLOTS - CARDS.length;
const CARD_SHEETS = SLOTS / 9;

const themeDot = (t, size = 3.4) => `<i class="nk-dot" style="background:${t.color}">${icon(ICONS[t.id], { size, color: '#fff', width: 2.2 })}</i>`;
const cardFront = (rows, no) => `<div class="nk-card"><div class="nk-frame"></div>
<div class="nk-head"><span class="aso">${aso(title)}</span><b>№${no}</b></div>
<div class="nk-rows">${rows.map(({ t, w }) => `<div class="nk-row" style="--c:${t.color}">${themeDot(t)}<div class="fit nk-w"><span>${esc(w)}</span></div></div>`).join('')}</div></div>`;
const blankFront = () => `<div class="nk-card"><div class="nk-frame"></div>
<div class="nk-head"><span class="aso">${aso(title)}</span><b>შენი</b></div>
<div class="nk-rows">${NAKHATI_THEMES.map(t => `<div class="nk-row" style="--c:${t.color}">${themeDot(t)}<div class="nk-line"></div></div>`).join('')}</div></div>`;
const cardBack = () => `<div class="nk-card nk-back"><div class="nk-frame"></div>
<div class="nk-ring">${icon('brush', { size: 10, color: C.gold, width: 1.3 })}</div>
<div class="nk-mark aso">${aso(title)}</div><div class="nk-sub">${esc(SERIES)}</div>
<div class="nk-dots">${NAKHATI_THEMES.map(t => `<i style="background:${t.color}"></i>`).join('')}</div></div>`;

const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const slots = Array.from({ length: 9 }, (_, i) => s * 9 + i);
  const front = slots.map(i => (i < CARDS.length ? cardFront(CARDS[i], i + 1) : blankFront()));
  const first = s * 9 + 1, last = Math.min(CARDS.length, s * 9 + 9);
  const label = `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — №${first}–${last}${slots.some(i => i >= CARDS.length) ? ' და ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(front, { cols: 3, rows: 3, w: 63, h: 88, label }),
    back: gridSheet(slots.map(() => cardBack()), { cols: 3, rows: 3, w: 63, h: 88, back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ზურგი` }),
  };
});

// ---------- the board: a winding road of 56 squares, 7 a row ----------
const PER_ROW = 7, ROWS = 8, SQ = 21, GAP = 3.6, ROW_STEP = 30, Y0 = 46;
const X0 = (210 - (PER_ROW * SQ + (PER_ROW - 1) * GAP)) / 2;
const LAST = PER_ROW * ROWS - 1;
const at = k => {
  const r = Math.floor(k / PER_ROW), i = k % PER_ROW, c = r % 2 ? PER_ROW - 1 - i : i;
  return { r, c, x: X0 + c * (SQ + GAP), y: Y0 + r * ROW_STEP };
};
const isStar = k => k % PER_ROW === 3;
/** each row every theme once (the first and the last row lose one to the start and the finish); the two squares a bend joins
 * never share a colour */
const boardThemes = (() => {
  const r2 = mulberry32(5);
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let tries = 0; ; tries++) {
      const perm = shuffled(NAKHATI_THEMES.map((_, j) => j), r2);
      if (r === 0 || perm[0] !== out[out.length - 1] || tries > 50) { out.push(...perm); break; }
    }
  }
  return out;
})();
const themeAt = k => (k === 0 || k === LAST ? null : NAKHATI_THEMES[boardThemes[k]]);
const counts = NAKHATI_THEMES.map((_, j) => boardThemes.filter((x, k) => x === j && k !== 0 && k !== LAST).length);

const starBadge = (cx, cy, r = 4) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r * 0.8;
    return `${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
  return `<circle cx="${cx}" cy="${cy}" r="${r + 0.6}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${GOLD_STAR}"/><polygon points="${pts}" fill="#fff"/>`;
};
const boardSvg = () => {
  let road = '', squares = '';
  for (let r = 0; r < ROWS; r++) {
    const y = Y0 + r * ROW_STEP;
    road += `<rect x="${X0 - 2}" y="${y - 2}" width="${PER_ROW * SQ + (PER_ROW - 1) * GAP + 4}" height="${SQ + 4}" rx="5" fill="${C.cream}" stroke="${C.line}" stroke-width=".3"/>`;
    if (r < ROWS - 1) {
      const { x } = at(r * PER_ROW + PER_ROW - 1);
      road += `<rect x="${x + SQ / 2 - 5}" y="${y + SQ}" width="10" height="${ROW_STEP - SQ + 1}" fill="${C.cream}"/>`
        + `<line x1="${x + SQ / 2 - 5}" y1="${y + SQ + 2}" x2="${x + SQ / 2 - 5}" y2="${y + ROW_STEP - 2}" stroke="${C.line}" stroke-width=".3"/>`
        + `<line x1="${x + SQ / 2 + 5}" y1="${y + SQ + 2}" x2="${x + SQ / 2 + 5}" y2="${y + ROW_STEP - 2}" stroke="${C.line}" stroke-width=".3"/>`
        + iconIn('chevrons-down', { x: x + SQ / 2 - 3, y: y + SQ + 1.5, size: 6, color: C.goldDark, width: 2.2 });
    }
  }
  for (let k = 0; k <= LAST; k++) {
    const { x, y } = at(k);
    const t = themeAt(k);
    if (!t) {
      const start = k === 0;
      squares += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" rx="3.2" fill="${start ? C.gold : C.wine}"/>`
        + iconIn(start ? 'flag' : 'trophy', { x: x + SQ / 2 - 4, y: y + 3, size: 8, color: '#fff', width: 2 })
        + `<text x="${x + SQ / 2}" y="${y + SQ - 4}" text-anchor="middle" font-size="3.3" font-weight="700" fill="#fff" font-family="SerifKa">${start ? 'სტარტი' : 'ფინიში'}</text>`;
      continue;
    }
    squares += `<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" rx="3.2" fill="${t.color}"/>`
      + iconIn(ICONS[t.id], { x: x + SQ / 2 - 4.5, y: y + SQ / 2 - 4.5, size: 9, color: '#fff', width: 1.9, opacity: 0.95 });
    if (isStar(k)) squares += starBadge(x + SQ - 2.6, y + 2.6);
  }
  return `<svg class="nk-board" viewBox="0 0 210 297" width="210mm" height="297mm">${road}${squares}</svg>`;
};
const legend = `<div class="nk-legend">${NAKHATI_THEMES.map(t => `<span class="nk-chip">${themeDot(t, 3)}${esc(t.label)}</span>`).join('')}
<span class="nk-chip nk-starChip"><svg viewBox="0 0 10 10" width="5mm" height="5mm">${starBadge(5, 5, 4)}</svg>ყველა ხატავს</span></div>`;
const boardPage = page(`<div class="nk-bHead"><span class="aso">${aso(title)}</span><b>სახატავი გზა</b><span class="nk-bSub">${esc(SERIES)}</span></div>
${legend}
${boardSvg()}
<div class="nk-bFoot">გამოიცანით — კამათელი და წინ · <b>★</b> — ყველა ხატავს, ქულა პირველს · ფინიშზე — კიდევ ერთი სიტყვა</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · სათამაშო დაფა</div>`, 'nk-boardP');

// ---------- pawns and a die ----------
const PW = 18, FACE = 17, FLAP = 9;
const pawn = (n, i) => {
  const c = TEAM_TINT[i];
  const face = (flip) => `<div class="nk-pFace" style="background:${c};${flip ? 'transform:rotate(180deg)' : ''}"><b style="color:${c}">${i + 1}</b><span class="fit"><span>${esc(n)}</span></span></div>`;
  return `<div class="nk-pawn" style="width:${PW}mm"><div class="nk-pFlap" style="height:${FLAP}mm">წებო</div>${face(true)}${face(false)}<div class="nk-pFlap" style="height:${FLAP}mm">ძირი</div></div>`;
};
const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
const D = 18;
const dieNet = () => {
  // the cross: 1 on top, 2-3-5-4 down the middle… opposite faces add up to seven
  const faces = [[1, 0, 1], [0, 1, 3], [1, 1, 2], [2, 1, 4], [1, 2, 6], [1, 3, 5]];
  let out = '';
  for (const [cx, cy, n] of faces) {
    const x = cx * D, y = cy * D;
    out += `<rect x="${x}" y="${y}" width="${D}" height="${D}" fill="#fff" stroke="${C.brown}" stroke-width=".35"/>`;
    for (const [px, py] of PIPS[n]) out += `<circle cx="${x + D * (0.25 + px * 0.25)}" cy="${y + D * (0.25 + py * 0.25)}" r="1.7" fill="${n === 1 ? C.wine : C.brown}"/>`;
  }
  const tab = (x1, y1, x2, y2, nx, ny) => {
    const d = 4, k = 0.25;
    const ax = x1 + (x2 - x1) * k + nx * d, ay = y1 + (y2 - y1) * k + ny * d, bx = x2 - (x2 - x1) * k + nx * d, by = y2 - (y2 - y1) * k + ny * d;
    return `<polygon points="${x1},${y1} ${ax},${ay} ${bx},${by} ${x2},${y2}" fill="${C.cream}" stroke="${C.line}" stroke-width=".3"/>`;
  };
  const tabs = [
    tab(D, 0, 2 * D, 0, 0, -1), tab(0, D, D, D, 0, -1), tab(2 * D, D, 3 * D, D, 0, -1), tab(0, 2 * D, 0, D, -1, 0),
    tab(3 * D, D, 3 * D, 2 * D, 1, 0), tab(0, 2 * D, D, 2 * D, 0, 1), tab(2 * D, 2 * D, 3 * D, 2 * D, 0, 1),
  ].join('');
  return `<svg viewBox="-5 -5 ${3 * D + 10} ${4 * D + 10}" width="${3 * D + 10}mm" height="${4 * D + 10}mm">${tabs}${out}</svg>`;
};
const piecesPage = page(`<div class="nk-pc">
  <div class="nk-pcHead"><span class="aso">${aso(title)}</span><b>ფიგურები და კამათელი</b></div>
  <div class="nk-pcCol">
    <div class="nk-pawns">${TEAM_NAMES.map(pawn).join('')}</div>
    <div class="nk-pcHow box"><h3>ფიგურები</h3><p>გამოჭერით წყვეტილ ხაზზე, ორივე ფერადი სახე ერთმანეთისკენ მოხარეთ და „წებოს“ ზოლი „ძირის“ ზოლზე დააწებეთ — ფიგურა სამკუთხა კარავივით დადგება. ფერი და ნომერი აპის გუნდებისაა: ${TEAM_NAMES.map((n, i) => `${i + 1} ${esc(n)}`).join(', ')}.</p></div>
  </div>
  <div class="nk-pcRow">
    <div class="nk-die">${dieNet()}</div>
    <div class="nk-pcHow box"><h3>კამათელი</h3><p>გამოჭერით კიდეზე, მოხარეთ ყველა ხაზზე და ყურები შიგნიდან დააწებეთ: ერთიანი ექვსის პირისპირაა, ორიანი — ხუთიანის. ჩვეულებრივი კამათელიც გამოდგება.</p>
    <h3>ტაიმერი</h3><p>ერთი წუთი: ქვიშის საათი, ტელეფონის წამზომი ან აპის „ნახატობანა“ → „ჰიბრიდული“ — სიტყვასაც აჩვენებს და დროსაც ითვლის.</p></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ფიგურები და კამათელი</div>`, 'nk-pcP');

// ---------- drawing frames: six a side ----------
const framesPage = page(`<div class="nk-frames">${Array.from({ length: 6 }, () => `<div class="nk-fr">
  <div class="nk-frHead"><span>გუნდი</span><i></i><span class="nk-frDots">${NAKHATI_THEMES.map(t => `<b style="border-color:${t.color}"></b>`).join('')}</span></div>
  <div class="nk-frBody">${icon('brush', { size: 5, color: '#e3d6bf', width: 1.6 })}</div>
</div>`).join('')}</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · სახატავი ჩარჩოები</div>`, 'nk-frP');

// ---------- the cover and the rules ----------
const EXAMPLE = CARDS[0];
const exTheme = EXAMPLE[3];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ერთი ხატავს, მისი გუნდი იცნობს — სიტყვებისა და ასოების გარეშე, წუთში. ხინკალი, ჩონგური, ჯიხვი, სვანური კოშკი, ნაცარქექია… ${WORDS} სიტყვა შვიდ თემაში, სახატავი გზა სტარტიდან ფინიშამდე.<br><b>${META}</b></div>
  <div class="nk-ex box">
    <div class="nk-exCard">${cardFront(EXAMPLE, 1)}</div>
    <div class="nk-exR">
      <h3>ასე მიდის სვლა</h3>
      <div class="nk-step">${themeDot(exTheme.t, 4)}<span>გუნდის ფიგურა ამ ფერის უჯრაზე დგას (${esc(exTheme.t.label)}) — მხატვარი ბარათზე იმავე ფერის სიტყვას ფარულად კითხულობს: „${esc(exTheme.w)}“.</span></div>
      <div class="nk-step">${icon('brush', { size: 6, color: C.wine, width: 1.7 })}<span>წუთი აქვს: ხატავს დაფაზე ან ფურცელზე, უხმოდ. ასოები, ციფრები და ნიშნები არ შეიძლება.</span></div>
      <div class="nk-step">${icon('dice-5', { size: 6, color: '#2f7d4f', width: 1.8 })}<span>გუნდმა გამოიცნო — აგორებს კამათელს და წინ მიდის. სვლა შემდეგ გუნდზე გადადის.</span></div>
      <div class="nk-step"><svg viewBox="0 0 10 10" width="6mm" height="6mm">${starBadge(5, 5, 4)}</svg><span>★ უჯრაზე ყველა ხატავს: ყველა გუნდის მხატვარი ერთსა და იმავე სიტყვას — ვინც პირველი გამოიცნობს, ის მიდის წინ.</span></div>
    </div>
  </div>
  <div class="nk-themes">${NAKHATI_THEMES.map(t => `<span class="nk-theme" style="border-color:${t.color}">${themeDot(t, 3.2)}${esc(t.label)} · ${t.words.length}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>სახატავი გზა (დაფა)</td><td>1</td><td>${no('board')}</td></tr>
        <tr><td>ბარათები, თითოზე 7 სიტყვა</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები — თქვენი სიტყვებისთვის</td><td>${BLANKS}</td><td>${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ფიგურები და კამათელი</td><td>6 + 1</td><td>${no('pieces')}</td></tr>
        <tr><td>სახატავი ჩარჩოები (ორივე მხარეს)</td><td>12</td><td>${no('frames')}</td></tr>
        <tr><td>ფანქრები; წუთის ქვიშის საათი ან წამზომი</td><td>—</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 63×88 მმ უნდა გამოვიდეს.</li>
        <li>დაფა (${no('board')}) და ფიგურები (${no('pieces')}) — სქელ ქაღალდზე ან მუყაოზე; ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — 250–300 გ მუყაოზე, ჭრა მონიშნული ხაზებით.</li>
        <li>სახატავი ჩარჩოები (${no('frames')}) — ჩვეულებრივ ქაღალდზე, რამდენიც გინდათ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Pictionary“-ს იდეით; სიტყვები და ახსნები საგანძურის სკოლისთვის Claude-მა შეარჩია და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში ორი მოთამაშე მაინც. ფიგურები სტარტზე დგას; პირველს ყველაზე პატარა მოთამაშის გუნდი იწყებს, მერე — საათის ისრის მიმართულებით. სახელები აპისაა: ${TEAM_NAMES.map(esc).join(', ')}.`],
  ['ბარათები', `აურიეთ ${CARDS.length} ბარათი და დადეთ დასტად, პირქვე. ყოველ ბარათზე შვიდი სიტყვაა — თითო ყოველი თემიდან, თემის ფერითა და ნიშნით.`],
  ['მხატვარი', 'გუნდი ირჩევს მხატვარს — ყოველ სვლაში სხვას. ის იღებს ზედა ბარათს და ფარულად კითხულობს იმ ფერის სიტყვას, რა ფერის უჯრაზეც გუნდის ფიგურა დგას. სტარტზე თემას გუნდი თვითონ ირჩევს.'],
  ['ხატვა', 'ქვიშის საათი ბრუნდება — წუთი. მხატვარი ხატავს დაფაზე, ფურცელზე ან სახატავ ჩარჩოში. ასოები, ციფრები, ნიშნები, ლაპარაკი და ჟესტები არ შეიძლება; ისრები და მოძრაობის ხაზები — შეიძლება. გუნდი ხმამაღლა იცნობს.'],
  ['გამოიცნეს', 'დრომდე გამოიცნეს — გუნდი აგორებს კამათელს და ფიგურა ამდენი უჯრით მიდის წინ. ვერ გამოიცნეს — ფიგურა რჩება. ბარათი დასტის ქვეშ, სვლა შემდეგ გუნდზე გადადის.'],
  ['სიტყვა უცნობია', 'მხატვარმა სიტყვა არ იცის? ქვიშის საათის გადაბრუნებამდე ერთხელ შეუძლია შემდეგი ბარათის იმავე ფერის სიტყვა აიღოს.'],
  ['★ ყველა ხატავს', 'ფიგურა ★ უჯრაზეა? ყველა გუნდის მხატვარი ერთად ნახულობს ამ ფერის ერთსა და იმავე სიტყვას და თავის გუნდს ერთდროულად უხატავს. ვინც პირველი გამოიცნობს, ის აგორებს კამათელს და მიდის წინ — თუნდაც მისი სვლა არ იყოს. ვერავინ — არავინ მიდის.'],
  ['ფინიში', 'ფინიშამდე ზუსტი რიცხვი საჭირო არ არის. ფინიშზე მისულ გუნდს კიდევ ერთი სიტყვა აქვს — ყველა ხატავს, თემას თვითონ ირჩევს. თუ პირველი თვითონ გამოიცნობს — მოიგო; თუ არა — შემდეგ სვლაზე ისევ ცდის.'],
  ['პატარებისთვის', 'დაფის გარეშეც შეიძლება: მასწავლებელი მხატვარს ბარათიდან სიტყვას აჩვენებს, ყოველი გამოცნობილი სიტყვა ერთი ქულაა. დრო — წუთნახევარი ან ორი.'],
  ['თქვენი სიტყვები', 'ცარიელ ბარათებზე თქვენი სიტყვები ჩაწერეთ, ფერის მიხედვით: სუფრა, სამოსი და სახლი, საკრავები და ცეკვა, ბუნება, ადგილები, საქმე და თამაში, ზღაპრები და სიმღერები.'],
];
const TIPS = [
  ['shapes', 'ჯერ დიდი ფორმა', 'მერე წვრილმანი.'],
  ['move-right', 'ისარი', 'აჩვენებს, რაზე ფიქრობ.'],
  ['split', 'ნაწილებად', 'რთული სიტყვა ორ ნახატად.'],
  ['repeat', 'ვერ მიხვდნენ?', 'თავიდან, სხვანაირად.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ნახატობანა“ მთელი კლასის თამაშია: მხატვარი თავის გუნდს სიტყვას უხატავს — უსიტყვოდ, წუთში. მთავარია არა ლამაზი ნახატი, არამედ სწრაფი და გასაგები: ორი წრე და ჯოხი ხშირად საკმარისია.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="nk-tips box"><h3>მხატვრის ხერხები</h3><div class="nk-tipGrid">${TIPS.map(([ic, h, t]) => `<div>${icon(ic, { size: 6, color: C.wine, width: 1.7 })}<span><b>${h}</b> — ${t}</span></div>`).join('')}</div></div>
  <div class="nk-more box"><b>აპშიც</b> იგივე თამაშია: „ჰიბრიდული“ — ტელეფონი სიტყვას მხატვარს აჩვენებს, დროსა და ქულებს ითვლის, ხატვა ეკრანზეც შეიძლება; „ონლაინ“ — მხატვარი თავის ტელეფონზე ხატავს, ნახატი ყველას ეხატება და ოთხი სიტყვიდან ირჩევენ; „მარტო“ — ნახატი კლასის ჩატში იგზავნება გამოსაცნობად. sagandzureli.ge → თამაშები → ნახატობანა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.nk-dot{flex:none;display:inline-flex;align-items:center;justify-content:center;width:5.4mm;height:5.4mm;border-radius:1.4mm}
.nk-card{position:absolute;inset:0;overflow:hidden;background:var(--paper)}
.nk-frame{position:absolute;inset:2mm;border:.5mm solid var(--wine);border-radius:2.6mm}
.nk-head{position:absolute;left:4.4mm;right:4.4mm;top:4mm;height:6mm;display:flex;align-items:center;justify-content:space-between;border-bottom:.25mm solid var(--gold)}
.nk-head .aso{font-size:7.6pt;color:var(--wine);letter-spacing:.06em}
.nk-head b{font-size:7.4pt;color:var(--muted)}
.nk-rows{position:absolute;left:4mm;right:4mm;top:11.4mm;bottom:4.2mm;display:flex;flex-direction:column;justify-content:space-between}
.nk-row{display:flex;align-items:center;gap:2mm;height:9.4mm;border-bottom:.2mm solid var(--line)}
.nk-row:last-child{border-bottom:0}
.nk-row .nk-dot{width:6.4mm;height:6.4mm}
.nk-w{flex:1;min-width:0;font-weight:800;font-size:12.6pt;line-height:1.1;color:var(--brown)}
.nk-line{flex:1;border-bottom:.25mm solid #bba98f;height:5mm}
.nk-back{background:var(--wine)}
.nk-back .nk-frame{border-color:var(--gold);border-width:.3mm;inset:3mm;opacity:.9}
.nk-ring{position:absolute;left:50%;top:20mm;transform:translateX(-50%);width:20mm;height:20mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.nk-mark{position:absolute;left:0;right:0;top:46mm;text-align:center;font-size:12pt;color:#f0d9a0;letter-spacing:.05em}
.nk-sub{position:absolute;left:0;right:0;top:54mm;text-align:center;font-size:6pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.nk-dots{position:absolute;left:0;right:0;bottom:10mm;display:flex;justify-content:center;gap:1.6mm}
.nk-dots i{width:3.6mm;height:3.6mm;border-radius:50%;border:.25mm solid #f0d9a0}
.nk-boardP .nk-board{position:absolute;left:0;top:0}
.nk-bHead{position:absolute;left:12mm;right:12mm;top:9mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.4mm}
.nk-bHead .aso{font-size:17pt;color:var(--wine)}
.nk-bHead b{font-size:14pt;color:var(--wine)}
.nk-bSub{margin-left:auto;font-size:8.6pt;color:var(--muted)}
.nk-legend{position:absolute;left:12mm;right:12mm;top:22mm;display:flex;flex-wrap:wrap;gap:1.4mm 2.4mm;font-size:8.6pt}
.nk-chip{display:inline-flex;align-items:center;gap:1.2mm;white-space:nowrap}
.nk-chip .nk-dot{width:4.6mm;height:4.6mm;border-radius:1.1mm}
.nk-starChip{font-weight:700;color:#8a6510}
.nk-bFoot{position:absolute;left:12mm;right:12mm;bottom:9mm;text-align:center;font-size:9pt;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.nk-bFoot b{color:${GOLD_STAR}}
.nk-ex{display:grid;grid-template-columns:63mm 1fr;gap:7mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.nk-exCard{position:relative;width:63mm;height:88mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.6mm;overflow:hidden}
.nk-exR h3{margin:0 0 3mm}
.nk-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.nk-step>svg,.nk-step>.nk-dot{flex:none;margin-top:.3mm}
.nk-step>.nk-dot{width:6mm;height:6mm}
.nk-themes{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.nk-theme{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.2mm .5mm .6mm;font-size:8.8pt;white-space:nowrap}
.nk-theme .nk-dot{width:5mm;height:5mm;border-radius:50%}
.nk-tips{margin-top:4mm;padding:3mm 5mm}
.nk-tips h3{margin:0 0 2mm}
.nk-tipGrid{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.6pt;line-height:1.3}
.nk-tipGrid>div{display:flex;gap:2.4mm;align-items:center}
.nk-tipGrid svg{flex:none}
.nk-more{margin-top:4mm;font-size:10pt;line-height:1.35}
.nk-pc{position:absolute;inset:12mm 14mm}
.nk-pcHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm;margin-bottom:8mm}
.nk-pcHead .aso{font-size:15pt;color:var(--wine)}
.nk-pcHead b{font-size:14pt;color:var(--wine)}
.nk-pcRow{display:flex;gap:9mm;align-items:center;margin-bottom:12mm}
.nk-pcCol{display:flex;flex-direction:column;align-items:center;gap:6mm;margin-bottom:14mm}
.nk-pawns{display:flex;gap:7mm;flex:none}
.nk-pawn{display:flex;flex-direction:column;border:.3mm dashed #9a8b7b}
.nk-pFlap{display:flex;align-items:center;justify-content:center;font-size:5.6pt;color:var(--muted);background:var(--cream)}
.nk-pFace{height:${FACE}mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6mm;color:#fff;border-top:.25mm dashed rgba(255,255,255,.7)}
.nk-pFace b{width:7.4mm;height:7.4mm;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:10pt}
.nk-pFace>.fit{display:block;max-width:${PW - 2}mm;font-size:6pt;font-weight:700;text-align:center}
.nk-pcHow{flex:1;font-size:10pt;line-height:1.35}
.nk-pcHow h3{margin:0 0 1.4mm;color:var(--wine);font-size:11pt}
.nk-pcHow p{margin:0 0 3mm}
.nk-die{flex:none}
.nk-frames{position:absolute;left:12mm;top:14mm;width:186mm;height:271mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:5mm}
.nk-fr{border:.4mm solid var(--line);border-radius:3mm;display:flex;flex-direction:column;overflow:hidden}
.nk-frHead{display:flex;align-items:center;gap:2mm;padding:1.6mm 3mm;background:var(--paper);border-bottom:.25mm solid var(--line);font-size:8.6pt;color:var(--muted)}
.nk-frHead i{flex:1;border-bottom:.25mm solid #bba98f;height:3.4mm}
.nk-frDots{display:flex;gap:1mm}
.nk-frDots b{width:3.2mm;height:3.2mm;border-radius:50%;border:.5mm solid}
.nk-frBody{flex:1;display:flex;align-items:flex-end;justify-content:flex-end;padding:2mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  { key: 'board', front: boardPage },
  ...cardSheets,
  { key: 'pieces', front: piecesPage },
  { key: 'frames', front: framesPage, back: framesPage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

// the board must give every theme its squares (a team can land on any colour)
if (counts.some(n => n < 6)) throw new Error(`nakhatobana: a theme has too few squares (${counts.join(', ')})`);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
