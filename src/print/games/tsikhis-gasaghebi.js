// „ციხის გასაღები“ on paper — the სამაგიდო variant of the app's escape room (2026-11-01): four castles, each on two sheets of
// eight A6 cards — the five doors and the gate (numbered №1–№6, face down until the lock before opens), the castle's story and
// its scroll (the alphabet's key, the old letters as numbers). Every card from №2 tells the piece of the gate's key its door
// gave. The doors are the app's own (`data/tsikheRooms.ts`), options and items in the order the class's phone shows them
// (`printSeed`), so the paper and the phone agree. The teacher's pages: answers, hints, the tunes on a staff to sing; a team
// tracker and the hint tokens.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import { oldHead, oldCss } from '../oldScript.js';
import { abcOf, lineOf, loadScore, openingOf, staff, musicHead, musicScript, musicCss } from '../music.js';
import { clefFor, staffSvg } from '../staffSvg.js';
import * as __d0 from '../../data/tsikheRooms';
import * as __d1 from '../../utils/tsikhe';
import * as __d2 from '../../utils/oldScripts';
import * as __d3 from '../../data/melodyPool';
import * as __d4 from '../../utils/eqo';

const {
  TSIKHE_ROOMS, piecesOf, printSeed, optionOrder, itemsShown, shapeOf, NUMERALS, echoNotes, ROOM_MINUTES, HINT_COST, WRONG_COST, LEVEL_LABEL,
  toScript, ALPHABET, SCRIPT_LABEL, MELODY_POOL, pitchName,
} = ({ ...__d0, ...__d1, ...__d2, ...__d3, ...__d4 });

export const id = 'tsikhis-gasaghebi';
export const title = 'ციხის გასაღები';
const TAG = 'ქართული · უტელეფონო';
const META = 'მთელი კლასი ან 2–6 გუნდი · 8 წლიდან · 30–40 წუთი';
const LABELS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ'];
const LOOK = { narikala: '#7a2028', ananuri: '#24827e', kajeti: '#5b3f8c', gonio: '#2b5f8a' };
const tintOf = r => LOOK[r.id] ?? C.wine;
const minutes = ms => (ms >= 60_000 ? `${ms / 60_000} წუთი` : `${ms / 1000} წამი`);
const KIND = { word: 'სიტყვა', code: 'კოდი', pick: 'არჩევანი', listen: 'სმენა', order: 'რიგი', echo: 'ზარები' };
const KIND_ICON = { word: 'pencil-line', code: 'lock-keyhole', pick: 'list-checks', listen: 'music', order: 'list-ordered', echo: 'bell-ring' };

// ---------- the castle, drawn as on the app's cards ----------
const merlons = (x0, x1, y, w = 4) => {
  const n = Math.max(2, Math.round((x1 - x0) / (w * 2)));
  const step = (x1 - x0) / n;
  return Array.from({ length: n }, (_, i) => `M${(x0 + i * step).toFixed(1)} ${y} h${(step / 2).toFixed(1)} v-3 h-${(step / 2).toFixed(1)} z`).join(' ');
};
/** the castle on a card's back: white lines on the castle's colour, or in colour on paper */
const castleSvg = (room, { w, ink = '#fff', fill = 'none', open = false }) => {
  const s = `stroke="${ink}" stroke-width="1.1" fill="${fill}"`;
  const towers = [[10, 28], [92, 28]].map(([x, y]) => `<rect x="${x}" y="${y}" width="18" height="${72 - y}" ${s}/><path d="${merlons(x, x + 18, y, 3)}" ${s}/><rect x="${x + 7.5}" y="${y + 10}" width="3" height="7" rx="1.5" fill="${ink}"/>`).join('');
  const extra = room === 'gonio' ? `<path d="M0 78 q7.5 -4 15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0 t15 0" fill="none" stroke="${ink}" stroke-width="1.1"/>`
    : room === 'ananuri' ? `<path d="M0 46 L20 26 L34 38 L48 22" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7"/><path d="M76 34 L96 20 L120 42" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7"/>`
      : room === 'kajeti' ? `<path d="M100 8a7 7 0 1 0 6 10a5.6 5.6 0 1 1-6-10z" fill="${ink}"/>${[[14, 12], [30, 6], [44, 15], [80, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${ink}"/>`).join('')}`
        : `<path d="M0 74 Q30 64 60 70 T120 66" fill="none" stroke="${ink}" stroke-width=".9" opacity=".7"/>`;
  return `<svg viewBox="0 0 120 84" width="${w}mm" height="${(w * 84) / 120}mm">${extra}
<rect x="22" y="44" width="76" height="28" ${s}/><path d="${merlons(22, 98, 44)}" ${s}/>${towers}
<rect x="49" y="18" width="22" height="54" ${s}/><path d="${merlons(49, 71, 18, 3)}" ${s}/>
<line x1="60" y1="15" x2="60" y2="3" stroke="${ink}" stroke-width="1"/><path d="M60 3.5 L71 6.5 L60 9.5 Z" fill="${ink}"/>
<path d="M53 72 V60 a7 7 0 0 1 14 0 V72 Z" ${open ? `fill="${ink}" stroke="${ink}"` : s}/></svg>`;
};

// ---------- a door's card ----------
const boxes = (shape, cls = 'ts-bx') => `<div class="ts-boxes">${shape.split(' ').map(w => `<span class="ts-word">${[...w].map(() => `<i class="${cls}"></i>`).join('')}</span>`).join('')}</div>`;
const carvedBox = c => {
  const n = [...c.text].length;
  return `<div class="ts-stone"><div class="old ts-carved${n > 30 ? ' xl' : n > 14 ? ' l' : ''}">${esc(toScript(c.text, c.script))}</div><div class="ts-stoneCap">${esc(SCRIPT_LABEL[c.script])} — ამოიკითხეთ გრაგნილის გასაღებით</div></div>`;
};
const optionsList = (room, d, i) => {
  const order = optionOrder(d.options.length, printSeed(room.id), i);
  return `<ol class="ts-opts">${order.map((o, pos) => `<li><b>${LABELS[pos]}</b><span>${esc(d.options[o])}</span></li>`).join('')}</ol>`;
};
const itemsList = (room, d, i) => {
  const shown = itemsShown(d.items.length, printSeed(room.id), i);
  return `<ol class="ts-opts ts-items">${shown.map((it, pos) => `<li><b>${LABELS[pos]}</b><span>${esc(d.items[it])}</span></li>`).join('')}</ol>`;
};
const answerArea = d => {
  switch (d.kind) {
    case 'word': return `<div class="ts-ans"><span class="ts-ansL">პასუხი</span>${boxes(shapeOf(d.answer))}</div>`;
    case 'code': return `<div class="ts-ans"><span class="ts-ansL">კოდი</span>${boxes('_'.repeat(d.answer.length), 'ts-bx dg')}</div>`;
    case 'pick': case 'listen': return `<div class="ts-ans"><span class="ts-ansL">ჩვენი პასუხი — ასო</span>${boxes('_', 'ts-bx dg')}</div>`;
    case 'order': return `<div class="ts-ans"><span class="ts-ansL">რიგი — ასოები</span><div class="ts-boxes">${d.items.map((_, k) => `<span class="ts-ord"><small>${k + 1}</small><i class="ts-bx dg"></i></span>`).join('')}</div></div>`;
    case 'echo': return `<div class="ts-ans ts-echoA">${icon('bell-ring', { size: 4.6, color: C.wine, width: 2 })}<span>ზარების ჰანგს მასწავლებელი ამოწმებს</span></div>`;
  }
};
const material = (room, d, i) => {
  const parts = [];
  if (d.carved) parts.push(carvedBox(d.carved));
  if (d.kind === 'code' && d.scroll) parts.push(`<div class="ts-say">${icon('scroll-text', { size: 4.2, color: '#8a6416', width: 2 })}<span>ასოების რიცხვები გრაგნილზეა.</span></div>`);
  if (d.kind === 'listen') parts.push(`<div class="ts-say">${icon('music', { size: 4.2, color: '#8a6416', width: 2 })}<span>ჰანგს მასწავლებელი დაგიკრავთ — აპით ან ხმით.</span></div>`);
  if (d.kind === 'echo') parts.push(`<div class="ts-say">${icon('bell-ring', { size: 4.2, color: '#8a6416', width: 2 })}<span>მიდით მასწავლებელთან: ის ჰანგს დაუკრავს (აპის ზარებზე ან ხმით), თქვენ კი იგივე გაიმეორეთ — აპზე დაუკარით ან იმღერეთ.</span></div>`);
  if (d.kind === 'pick' || d.kind === 'listen') parts.push(optionsList(room, d, i));
  if (d.kind === 'order') parts.push(itemsList(room, d, i));
  return parts.join('');
};
const band = (room, right) => `<div class="ts-band" style="background:${tintOf(room)}"><span>${esc(room.title)}</span><span>${right}</span></div>`;
const ribbon = (room, i) => (i > 0 ? `<div class="ts-rib">${icon('key-round', { size: 4.4, color: '#7a5a10', width: 2 })}<span>წინა კარი გაიღო! გასაღების ნაწილი:</span><b>${piecesOf(room)[i - 1]}</b></div>` : '');
const doorFront = (room, d, i) => `<div class="ts-card" style="--t:${tintOf(room)}">${band(room, `№${i + 1} · კარი ${i + 1} / ${room.doors.length}`)}
<div class="ts-in">${ribbon(room, i)}
  <div class="ts-title">${icon(KIND_ICON[d.kind], { size: 5, color: tintOf(room), width: 2 })}<span>${esc(d.title)}</span><em>${KIND[d.kind]}</em></div>
  <p class="ts-ask">${esc(d.ask)}</p>
  ${material(room, d, i)}
  <div class="ts-fill">${castleSvg(room.id, { w: 44, ink: tintOf(room) })}</div>
  ${answerArea(d)}
</div>
<div class="ts-cardFoot">${d.kind === 'echo' ? 'ბარათით მიდით მასწავლებელთან' : 'ჩაწერეთ პასუხი და მიიტანეთ მასწავლებელთან'}</div></div>`;
const gateFront = room => `<div class="ts-card" style="--t:${tintOf(room)}">${band(room, `№${room.doors.length + 1} · ჭიშკარი`)}
<div class="ts-in">${ribbon(room, room.doors.length)}
  <div class="ts-title">${icon('key-round', { size: 5, color: tintOf(room), width: 2 })}<span>ჭიშკარი</span><em>გასაღები</em></div>
  <p class="ts-ask">${esc(room.gate.ask)}</p>
  <div class="ts-gate">
    <span class="ts-ansL">თქვენი ნაწილები — ბარათების რიგით</span>${boxes('_'.repeat(room.key.length), 'ts-bx gold')}
    <span class="ts-ansL">სიტყვა</span>${boxes('_'.repeat(room.key.length), 'ts-bx big')}
  </div>
  <div class="ts-say">${icon('timer', { size: 4.2, color: '#8a6416', width: 2 })}<span>სიტყვა მასწავლებელს მიუტანეთ — ვინც პირველი გააღებს ჭიშკარს, ის იგებს!</span></div>
  <div class="ts-fill">${castleSvg(room.id, { w: 44, ink: tintOf(room), open: true })}</div>
</div>
<div class="ts-cardFoot">ნაწილები №2–№6 ბარათების თავზე წერია</div></div>`;
const storyFront = room => `<div class="ts-card" style="--t:${tintOf(room)}">${band(room, `${esc(room.where)} · ${LEVEL_LABEL[room.level]}`)}
<div class="ts-in">
  <div class="ts-art">${castleSvg(room.id, { w: 58, ink: tintOf(room) })}</div>
  <div class="ts-storyT">${esc(room.title)}</div>
  <p class="ts-story">${esc(room.intro)}</p>
  <ul class="ts-how">
    <li>${icon('door-open', { size: 4.2, color: tintOf(room), width: 2 })}<span>ბარათი №1 გადმოაბრუნეთ. დანარჩენები ზურგით ზემოთ დევს — №2-ს მაშინ მიიღებთ, როცა №1-ის კარს გააღებთ.</span></li>
    <li>${icon('key-round', { size: 4.2, color: '#a67c2e', width: 2 })}<span>ყოველი კარი გასაღების ნაწილს გაძლევთ — ჭიშკართან სიტყვას ააწყობთ.</span></li>
    <li>${icon('lightbulb', { size: 4.2, color: '#c27c0e', width: 2 })}<span>მინიშნება — ${minutes(HINT_COST[0])}, პასუხი — ${minutes(HINT_COST[2])}, არასწორი არჩევანი — ${minutes(WRONG_COST)}.</span></li>
  </ul>
</div>
<div class="ts-cardFoot">${ROOM_MINUTES} წუთი გაქვთ!</div></div>`;
const scriptOf = room => room.doors.find(d => d.carved)?.carved.script ?? 'asomtavruli';
const keyGrid = script => `<div class="ts-key">${ALPHABET.map(ch => `<span><b class="old">${toScript(ch, script)}</b><i>${ch}</i></span>`).join('')}</div>`;
const numerals = () => `<div class="ts-nums">${NUMERALS.map(([l, n]) => `<span><b class="old">${toScript(l, 'asomtavruli')}</b><i>${n}</i></span>`).join('')}</div>`;
const scrollFront = room => {
  const script = scriptOf(room);
  const nums = room.doors.some(d => d.kind === 'code' && d.scroll);
  return `<div class="ts-card ts-scroll" style="--t:${tintOf(room)}">${band(room, 'გრაგნილი')}
<div class="ts-in">
  <div class="ts-title">${icon('scroll-text', { size: 5, color: tintOf(room), width: 2 })}<span>ანბანის გასაღები</span><em>${esc(SCRIPT_LABEL[script])}</em></div>
  <p class="ts-ask">ზემოთ — ძველი ასო, ქვემოთ — დღევანდელი.</p>
  ${keyGrid(script)}
  ${nums ? `<div class="ts-title sm">${icon('hash', { size: 4.4, color: tintOf(room), width: 2 })}<span>გრაგნილის ნაგლეჯი: ასო = რიცხვი</span></div>
  <p class="ts-ask">ძველად ასოებით რიცხვებსაც წერდნენ. ზემოთ — ასო, ქვემოთ — მისი რიცხვი.</p>${numerals()}` : `<div class="ts-art sm">${castleSvg(room.id, { w: 40, ink: tintOf(room) })}</div>`}
</div>
<div class="ts-cardFoot">გრაგნილი მთელი თამაშის განმავლობაში გუნდთან რჩება</div></div>`;
};
const cardBack = (room, what, sub) => `<div class="ts-back" style="background:${tintOf(room)}">
  <div class="ts-backIn">
    <div class="ts-backName">${esc(room.title)}</div>
    ${castleSvg(room.id, { w: 62 })}
    <div class="ts-backNo">${what}</div>
    <div class="ts-backSub">${sub}</div>
  </div>
</div>`;

const CARD = { cols: 2, rows: 2, w: 99, h: 140 };
const roomSheets = TSIKHE_ROOMS.flatMap(room => {
  const n = room.doors.length;
  const fronts = [...room.doors.map((d, i) => doorFront(room, d, i)), gateFront(room), storyFront(room), scrollFront(room)];
  const backs = [
    ...room.doors.map((_, i) => cardBack(room, `№${i + 1}`, i ? 'ჯერ არ გადმოაბრუნოთ — წინა კარი უნდა გაიღოს' : 'დაიწყეთ აქედან')),
    cardBack(room, `№${n + 1}`, 'ჭიშკარი · ჯერ არ გადმოაბრუნოთ'),
    cardBack(room, 'ამბავი', 'წაიკითხეთ პირველად'),
    cardBack(room, 'გრაგნილი', 'გასაღები და რიცხვები'),
  ];
  if (fronts.length !== 8) throw new Error(`tsikhis-gasaghebi: ${room.id} has ${fronts.length} cards`);
  return [0, 1].map(s => ({
    key: `${room.id}${s + 1}`,
    front: gridSheet(fronts.slice(s * 4, s * 4 + 4), { ...CARD, label: `${title} · ${room.title} ${s + 1}/2 — ${s ? '№5, ჭიშკარი, ამბავი, გრაგნილი' : 'კარები №1–№4'}`, cls: 'gsheet tsCards' }),
    back: gridSheet(backs.slice(s * 4, s * 4 + 4), { ...CARD, back: true, label: `${title} · ${room.title} ${s + 1}/2 — ზურგი`, cls: 'gsheet tsCards' }),
  }));
});

// ---------- the teacher's page of a castle ----------
const tuneStaff = tune => {
  const score = loadScore(tune.book, tune.num);
  const { notes } = openingOf(lineOf(score, 0), { min: 8, max: 14 });
  return staff(abcOf(notes), { cls: 'ts-abc' });
};
const echoStaff = d => {
  const m = MELODY_POOL.find(x => x.id === d.melody);
  const notes = echoNotes(m.top, d.count);
  return staffSvg({
    clef: clefFor(notes), width: 80, space: 2.1, room: 2.4, over: 3.6, under: 4, font: 2.6,
    notes: notes.map((midi, k) => ({ midi, over: String(k + 1), under: pitchName(midi) })),
  }).svg;
};
const answerOf = (room, d, i) => {
  switch (d.kind) {
    case 'word': return `<b>${esc(d.answer)}</b>${d.alt?.length ? ` <span class="small">(ან: ${d.alt.map(esc).join(', ')})</span>` : ''}`;
    case 'code': return `<b>${esc(d.answer)}</b>`;
    case 'pick': case 'listen': {
      const pos = optionOrder(d.options.length, printSeed(room.id), i).indexOf(0);
      return `<b>${LABELS[pos]}</b> — ${esc(d.options[0])}`;
    }
    case 'order': {
      const shown = itemsShown(d.items.length, printSeed(room.id), i);
      return `<b>${d.items.map((_, k) => LABELS[shown.indexOf(k)]).join(' → ')}</b>`;
    }
    case 'echo': {
      const m = MELODY_POOL.find(x => x.id === d.melody);
      return `<b>${echoNotes(m.top, d.count).map(pitchName).join(' · ')}</b>`;
    }
  }
};
const teacherPage = room => {
  const pieces = piecesOf(room);
  const music = room.doors.map((d, i) => ({ d, i })).filter(({ d }) => d.kind === 'listen' || d.kind === 'echo');
  return page(`<div class="tt-wrap" style="--t:${tintOf(room)}">
  <div class="tt-head"><div class="tt-art">${castleSvg(room.id, { w: 30, ink: tintOf(room) })}</div><div><div class="aso tt-t">${aso(room.title)}</div><div class="tt-sub"><b>${esc(room.title)}</b> · მასწავლებელს · პასუხები და მინიშნებები · ${esc(room.where)} · ${LEVEL_LABEL[room.level]}</div></div>
    <div class="tt-key"><span>ჭიშკრის სიტყვა</span><b>${esc(room.key)}</b><span>ნაწილები: ${pieces.join(' · ')}</span></div></div>
  <table class="tt">
    <tr><th>№</th><th>კარი</th><th>პასუხი</th><th>მინიშნება 1</th><th>მინიშნება 2</th></tr>
    ${room.doors.map((d, i) => `<tr><td class="tt-no">${i + 1}</td><td class="tt-door"><b>${esc(d.title)}</b><span>${KIND[d.kind]} · ნაწილი <b class="tt-pc">${pieces[i]}</b></span></td><td class="tt-a">${answerOf(room, d, i)}</td><td>${esc(d.hints[0])}</td><td>${esc(d.hints[1])}</td></tr>`).join('')}
    <tr><td class="tt-no">${room.doors.length + 1}</td><td class="tt-door"><b>ჭიშკარი</b><span>გასაღები</span></td><td class="tt-a"><b>${esc(room.key)}</b></td><td>პირველი ასოა „${[...room.key][0]}“.</td><td>ბოლო ასოა „${[...room.key].slice(-1)[0]}“.</td></tr>
  </table>
  ${music.length ? `<div class="tt-music">${music.map(({ d, i }) => d.kind === 'listen'
    ? `<div class="tt-mus"><div class="tt-musT">${icon('music', { size: 4.4, color: tintOf(room), width: 2 })}<b>კარი ${i + 1}: „${esc(d.options[0])}“</b><span>პირველი ხმის დასაწყისი — იმღერეთ, თუ აპი არ გაქვთ</span></div>${tuneStaff(d.tune)}</div>`
    : `<div class="tt-mus"><div class="tt-musT">${icon('bell-ring', { size: 4.4, color: tintOf(room), width: 2 })}<b>კარი ${i + 1}: ზარების ჰანგი</b><span>დაუკარით ან იმღერეთ თანაბრად; გუნდმა ზუსტად უნდა გაიმეოროს</span></div><div class="tt-echo">${echoStaff(d)}</div></div>`).join('')}</div>` : ''}
  <div class="tt-notes"><div class="tt-notesT">იცოდით? — წაუკითხეთ გუნდს, როცა კარს გააღებს</div>
    <ol>${room.doors.map(d => `<li>${esc(d.note)}</li>`).join('')}<li class="gate">${esc(room.gate.note)}</li></ol></div>
</div>
${foot(`<span>${esc(title)} · ${esc(room.title)} · მასწავლებელს</span><span>${esc(SCHOOL)}</span>`)}`, 'ttP');
};
const teacherSheets = [0, 1].map(s => ({ key: `teacher${s + 1}`, front: teacherPage(TSIKHE_ROOMS[s * 2]), back: teacherPage(TSIKHE_ROOMS[s * 2 + 1]) }));

// ---------- the tracker and the hint tokens ----------
const trackerPage = page(`<div class="tr-wrap">
  <div class="rhead"><div class="aso rtitle">${aso('გუნდების ფურცელი')}</div><div class="rsub">მასწავლებელს · ვინ რომელ კარზეა, მინიშნებები და დრო</div></div>
  <div class="tr-top"><span>ციხე: <i style="width:52mm"></i></span><span>დაწყება: <i style="width:22mm"></i></span><span>${ROOM_MINUTES} წუთი — დასრულება: <i style="width:22mm"></i></span></div>
  <table class="tr">
    <tr><th>გუნდი</th>${[1, 2, 3, 4, 5].map(n => `<th>კარი ${n}</th>`).join('')}<th>ჭიშკარი</th><th>მინიშნება</th><th>ჯარიმა</th><th>დრო</th><th>ადგილი</th></tr>
    ${Array.from({ length: 6 }, () => `<tr><td></td>${'<td></td>'.repeat(6)}<td class="tr-h"><span class="chk"></span><span class="chk"></span><span class="chk"></span></td><td></td><td></td><td></td></tr>`).join('')}
  </table>
  <div class="tr-how box">
    <b>როგორ ვავსებთ.</b> კარი გაიღო — მის უჯრაში ჩაწერეთ საათი (მაგ. 10:12) და გუნდს შემდეგი ბარათი მიეცით. მინიშნება — მონიშნეთ ერთი
    უჯრა და ჯარიმაში დაუმატეთ ${minutes(HINT_COST[0])} (პასუხი — ${minutes(HINT_COST[2])}); არასწორი არჩევანი (ასო, რიგი, ჰანგი) — ${minutes(WRONG_COST)}.
    ბოლოს: დრო = ჭიშკრის საათი − დაწყება + ჯარიმა. ნაკლები დრო იგებს; ვინც ჭიშკარს ვერ მიაღწია — გაღებული კარების რიცხვით.
  </div>
</div>
${foot(`<span>${esc(title)} · გუნდების ფურცელი</span><span>${esc(SCHOOL)}</span>`)}`, 'trP');

const TOKEN = { cols: 3, rows: 6, w: 63, h: 42 };
const tokenFront = (k) => {
  const answer = k % 3 === 2;
  return `<div class="tk${answer ? ' ans' : ''}">${icon(answer ? 'key-round' : 'lightbulb', { size: 9, color: answer ? '#2f7d4f' : '#c27c0e', width: 1.8 })}
  <div><b>${answer ? 'პასუხი' : 'მინიშნება'}</b><span>+${minutes(HINT_COST[answer ? 2 : 0])}</span></div></div>`;
};
const tokenBack = `<div class="tk back">${icon('circle-question-mark', { size: 10, color: '#fff', width: 1.6 })}<span>${esc(title)}</span></div>`;
const tokenSheet = {
  key: 'tokens',
  front: gridSheet(Array.from({ length: 18 }, (_, k) => tokenFront(k)), { ...TOKEN, label: `${title} · მინიშნების ბარათები: თითო გუნდს ორი მინიშნება და ერთი პასუხი (ერთი რიგი)`, cls: 'gsheet tsTokens' }),
  back: gridSheet(Array.from({ length: 18 }, () => tokenBack), { ...TOKEN, back: true, label: `${title} · მინიშნების ბარათები — ზურგი`, cls: 'gsheet tsTokens' }),
};

// ---------- the cover and the rules ----------
const EXAMPLE = TSIKHE_ROOMS[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ციხეში ჩაგკეტეს! ხუთი კარი, ხუთი ამოცანა — ძველი ასოებით ნაწერი წარწერა, კოდის საკეტი, გამოცანა, ჰანგი სმენით, ამბავი რიგზე. ყოველი გაღებული კარი გასაღების ნაწილს გაძლევთ, ჭიშკართან კი ნაწილებიდან სიტყვა უნდა ააწყოთ — ${ROOM_MINUTES} წუთში, სანამ მცველი დაბრუნდება.<br><b>${META}</b></div>
  <div class="ts-rooms">${TSIKHE_ROOMS.map(r => `<div class="ts-room" style="--t:${tintOf(r)}">${castleSvg(r.id, { w: 34, ink: tintOf(r) })}<b>${esc(r.title)}</b><span>${esc(r.where)} · ${LEVEL_LABEL[r.level]}</span></div>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        ${TSIKHE_ROOMS.map(r => `<tr><td>${esc(r.title)}: 5 კარი, ჭიშკარი, ამბავი, გრაგნილი</td><td>8</td><td>${no(`${r.id}1`)}–${no(`${r.id}2`)}</td></tr>`).join('')}
        <tr><td>მასწავლებლის ფურცლები: პასუხები, მინიშნებები, ჰანგები ნოტებით</td><td>4 გვერდი</td><td>${no('teacher1')}–${no('teacher2')}</td></tr>
        <tr><td>გუნდების ფურცელი</td><td>1</td><td>${no('tracker')}</td></tr>
        <tr><td>მინიშნების ბარათები</td><td>18</td><td>${no('tokens')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 99×140 მმ გამოვა.</li>
        <li>ერთი ციხე = ორი ფურცელი. თითო გუნდს თავისი ნაკრები სჭირდება: 3 გუნდი — სამჯერ დაბეჭდეთ ამ ციხის ორი ფურცელი.</li>
        <li>მასწავლებლის ფურცლები (${no('teacher1')}–${no('teacher2')}) გუნდებს არ აჩვენოთ — იქ პასუხებია.</li>
        <li>კონვერტები არ არის აუცილებელი: ბარათები ზურგით ზემოთ, ნომრების რიგით დაალაგეთ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „ოთახიდან გაქცევის“ (Escape room) თამაშების იდეით. ამოცანები Claude-მა დაწერა ცნობილი ფაქტებითა და საგანძურის სკოლის აპის მონაცემებით — მასწავლებელს ჯერ არ შეუმოწმებია. ჰანგები აპის წიგნების ნოტებიდანაა. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['მზადება', `აირჩიეთ ციხე. თითო გუნდს (3–5 ბავშვი) — ამ ციხის რვა ბარათი: „ამბავი“, „გრაგნილი“ და №1 პირით ზემოთ, №2–№6 — ზურგით ზემოთ, ნომრების რიგით, ან ცალ-ცალკე კონვერტებში მასწავლებლის მაგიდაზე. მასწავლებელს — ამ ციხის ფურცელი (${no('teacher1')}–${no('teacher2')}) და გუნდების ფურცელი (${no('tracker')}).`],
  ['დაწყება', `ვინმე „ამბავს“ ხმამაღლა კითხულობს, მასწავლებელი საათს რთავს: ${ROOM_MINUTES} წუთი. გუნდი №1-ს ხსნის.`],
  ['კარი', 'ბარათზე ამოცანაა: წარწერა ძველი ასოებით (გრაგნილის გასაღებით იკითხება), ასო-რიცხვების კოდი, გამოცანა, ოთხიდან ერთი, ამბავი რიგზე, ჰანგი სმენით, ზარების ჰანგის გამეორება. პასუხს გუნდი ბარათზე წერს და მასწავლებელთან მიაქვს.'],
  ['სწორია', 'მასწავლებელი შემდეგ ბარათს აძლევს. მის თავზე წერია ასო — გასაღების ნაწილი. ნაწილები შეინახეთ: მე-6 ბარათზე, ჭიშკართან, მათგან სიტყვა უნდა ააწყოთ.'],
  ['არასწორია', `სიტყვა ან კოდი — სცადეთ ხელახლა, ჯარიმა არ არის. ოთხიდან ერთი, რიგი ან ჰანგი — ყოველი არასწორი ცდა ${minutes(WRONG_COST)} ჯარიმაა (გამოცნობა რომ არ ღირდეს).`],
  ['მინიშნება', `გუნდს სამი ბარათი აქვს: ორი „მინიშნება“ (+${minutes(HINT_COST[0])}) და ერთი „პასუხი“ (+${minutes(HINT_COST[2])}). ბარათს მასწავლებელს აძლევენ, ის კი მინიშნებას თავისი ფურცლიდან კითხულობს.`],
  ['ჰანგი და ზარები', 'ჰანგს მასწავლებელი აპით უკრავს (ჰიბრიდული: საგანძურის სკოლა → თამაშები → ციხის გასაღები) ან ფურცლის ნოტებით მღერის. ზარების ჰანგი თანაბრად მღერის ან უკრავს — გუნდი ზუსტად იმეორებს.'],
  ['მოგება', `ვინც ჭიშკარს პირველი გააღებს, იგებს: დრო = ჭიშკრის საათი − დაწყება + ჯარიმა. ${ROOM_MINUTES} წუთი გავიდა? მცველი მოვიდა — მაგრამ დაასრულეთ: ბოლოს ითვლება დრო და გაღებული კარები.`],
  ['ტელეფონით', 'ჰიბრიდულ თამაშში ტელეფონი თავადაა საკეტი: ამოწმებს პასუხებს, ითვლის დროს და ჯარიმას, აძლევს მინიშნებებს, უკრავს ჰანგს და ეუბნება გუნდს, რომელი ბარათი აიღოს. ბარათების რიგი იგივეა.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 8 წლიდან · 30–40 წუთი</div></div>
  <p class="lead">„ციხის გასაღები“ ოთახიდან გაქცევის თამაშია: ციხეში ჩაგკეტეს და ჭიშკრის გასაღები ხუთ კარს მიღმაა. გუნდები ერთმანეთს ეჯიბრებიან — ან მთელი კლასი ერთად თამაშობს. თამაშისას ქართულ ისტორიას, ძველ დამწერლობას, „ვეფხისტყაოსანს“, სიმღერასა და გალობას ეცნობით.</p>
  <div class="ts-flow box">${['scroll-text', 'door-open', 'key-round', 'lock-keyhole-open'].map((ic, k) => `<div class="ts-flowS">${icon(ic, { size: 8, color: C.wine, width: 1.6 })}<span>${['ამბავი და გრაგნილი', '5 კარი — 5 ამოცანა', 'ყოველ კარს — ნაწილი', 'ჭიშკარი: სიტყვა'][k]}</span></div>`).join(`<span class="ts-arr">→</span>`)}</div>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="box ts-ex"><b>მაგალითი — ${esc(EXAMPLE.title)}:</b> პირველ კარზე გადმოცემაა გორგასლის ნადირობაზე: რა ფრინველი ჩავარდა ცხელ წყაროში? გუნდი წერს „ხოხობი“, მასწავლებელი №2 ბარათს აძლევს — მის თავზე ასოა, გასაღების პირველი ნაწილი. ხუთივე ნაწილით ჭიშკართან სიტყვა იწყობა: ის, რის გამოც ქალაქს სახელი დაარქვეს.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// the staves, then a card or a page too full stops the build
export const script = `(() => {
  ${musicScript(1.2)}
  const bad = [];
  // the faint castle fills a card's empty part — only where there is room for it
  document.querySelectorAll('.ts-fill').forEach(el => { if (el.clientHeight < 60) el.remove(); });
  document.querySelectorAll('.ts-in').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1) bad.push((el.querySelector('.ts-title, .ts-storyT') || el).textContent.trim().slice(0, 40));
  });
  document.querySelectorAll('.tt-wrap, .tr-wrap, .rulesWrap, .cover').forEach(el => {
    const foot = el.parentElement.querySelector('.foot');
    if (foot && el.getBoundingClientRect().bottom > foot.getBoundingClientRect().top + 0.5) bad.push('a page runs into its foot: ' + (el.querySelector('.tt-t, .rtitle, .gameTitle') || el).textContent.trim().slice(0, 30));
  });
  if (bad.length) throw new Error('tsikhis-gasaghebi: too full — ' + bad.join(' · '));
})()`;

export const head = `${oldHead}${musicHead()}`;
export const css = `${coverCss}${oldCss}${musicCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10.3pt;line-height:1.36}
.rulesP .rules li{margin-bottom:.9mm}
.cover .lead{margin-bottom:4mm}
.ts-rooms{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:0 0 5mm}
.ts-room{border:.35mm solid var(--t);border-radius:2.2mm;padding:2mm 2mm 2.4mm;display:flex;flex-direction:column;align-items:center;text-align:center;gap:.6mm}
.ts-room b{color:var(--t);font-size:11pt}
.ts-room span{font-size:8.6pt;color:var(--muted)}
.ts-flow{display:flex;align-items:center;justify-content:space-between;gap:2mm;margin:0 0 3.4mm;padding:3mm 4mm}
.ts-flowS{display:flex;flex-direction:column;align-items:center;gap:1mm;text-align:center;font-size:9pt;font-weight:700;color:var(--brown);width:30mm}
.ts-arr{color:var(--gold2);font-size:16pt;font-weight:700}
.ts-ex{margin-top:2.6mm;font-size:9.8pt;line-height:1.36}

/* the cards: 99×140 mm */
.tsCards .piece{overflow:hidden}
.ts-card{position:absolute;inset:0;background:var(--paper);border:.6mm solid var(--t);border-radius:3mm;overflow:hidden}
.ts-band{height:8.4mm;display:flex;align-items:center;justify-content:space-between;padding:0 3.6mm;color:#fff;font-weight:700;font-size:9.4pt}
.ts-in{position:absolute;left:4.4mm;right:4.4mm;top:11mm;bottom:8.6mm;display:flex;flex-direction:column;gap:2.2mm;overflow:hidden}
.ts-cardFoot{position:absolute;left:4mm;right:4mm;bottom:2.6mm;text-align:center;font-size:7.6pt;color:var(--muted)}
.ts-rib{display:flex;align-items:center;gap:1.6mm;background:#f6e7b8;border-radius:1.6mm;padding:1.2mm 2mm;font-size:8.6pt;font-weight:700;color:#7a5a10}
.ts-rib b{margin-left:auto;width:8mm;height:8mm;border-radius:1.4mm;background:#c9a227;color:#fff;font-size:14pt;display:flex;align-items:center;justify-content:center}
.ts-title{display:flex;align-items:center;gap:1.6mm;font-weight:700;font-size:12.6pt;color:var(--t);line-height:1.15}
.ts-title.sm{font-size:10.4pt;margin-top:1mm}
.ts-title em{margin-left:auto;font-style:normal;font-size:8pt;color:var(--muted);border:.25mm solid var(--line);border-radius:3mm;padding:.2mm 2mm;white-space:nowrap}
.ts-ask{margin:0;font-size:9.4pt;line-height:1.36;color:var(--brown)}
.ts-stone{background:linear-gradient(160deg,#efe6d4,#e2d5bd);border:.3mm solid #d3c2a3;border-radius:2mm;padding:2mm 2.4mm 1.4mm;text-align:center}
.ts-carved{font-size:24pt;line-height:1.3;letter-spacing:.06em;color:#4a2a1e}
.ts-carved.l{font-size:19pt}
.ts-carved.xl{font-size:15.5pt;line-height:1.35}
.ts-stoneCap{font-size:7.4pt;color:#8a7560;margin-top:.6mm}
.ts-say{display:flex;gap:1.6mm;align-items:flex-start;font-size:8.6pt;line-height:1.32;color:#6b4f12;background:#faf1d9;border-radius:1.6mm;padding:1.2mm 2mm}
.ts-say svg{flex:none;margin-top:.2mm}
.ts-opts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.1mm}
.ts-opts li{display:flex;align-items:center;gap:2mm;font-size:9.6pt;font-weight:700;line-height:1.25;border:.25mm solid var(--line);border-radius:1.6mm;padding:1mm 1.8mm;background:#fff}
.ts-opts b{flex:none;width:5.6mm;height:5.6mm;border-radius:50%;background:var(--t);color:#fff;display:flex;align-items:center;justify-content:center;font-size:9pt}
.ts-items li{font-size:9pt}
.ts-fill{flex:1 1 0;min-height:0;display:flex;align-items:center;justify-content:center;opacity:.13;overflow:hidden}
.ts-fill svg{max-height:100%}
.ts-ans{margin-top:auto;display:flex;flex-direction:column;gap:1mm;border-top:.3mm dashed var(--line);padding-top:1.6mm}
.ts-ansL{font-size:7.8pt;color:var(--muted);font-weight:700}
.ts-boxes{display:flex;flex-wrap:wrap;gap:1mm 3mm}
.ts-word{display:flex;gap:.8mm}
.ts-bx{display:inline-block;width:6.4mm;height:7.4mm;border:.3mm solid #b9a37f;border-radius:1mm;background:#fff}
.ts-bx.dg{width:8mm;height:9mm}
.ts-bx.gold{background:#fbf0cf;border-color:#c9a227}
.ts-bx.big{width:11mm;height:12mm}
.ts-ord{display:flex;flex-direction:column;align-items:center;gap:.3mm}
.ts-ord small{font-size:7pt;color:var(--muted)}
.ts-echoA{flex-direction:row;align-items:center;gap:1.6mm;font-size:8.6pt;font-weight:700;color:var(--wine)}
.ts-gate{display:flex;flex-direction:column;gap:1.4mm;margin-top:1mm}
.ts-art{display:flex;justify-content:center;margin-top:.6mm}
.ts-art.sm{margin-top:auto;opacity:.5}
.ts-storyT{text-align:center;font-weight:800;font-size:15pt;color:var(--t);line-height:1.1}
.ts-story{margin:0;font-size:9.4pt;line-height:1.38}
.ts-how{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1.2mm}
.ts-how li{display:flex;gap:1.6mm;font-size:8.5pt;line-height:1.3}
.ts-how svg{flex:none}
.ts-key{display:grid;grid-template-columns:repeat(11,1fr);gap:.6mm}
.ts-key span,.ts-nums span{border:.2mm solid var(--line);border-radius:.8mm;background:#fff;display:flex;flex-direction:column;align-items:center;padding:.5mm 0 .6mm;gap:.3mm}
.ts-key b,.ts-nums b{font-size:13pt;font-weight:400;line-height:1;color:#2f2018}
.ts-key i,.ts-nums i{font-style:normal;font-family:'SansKa',sans-serif;font-weight:700;font-size:7.2pt;line-height:1;color:var(--muted)}
.ts-nums{display:grid;grid-template-columns:repeat(7,1fr);gap:.6mm}
.ts-nums i{color:var(--wine)}
.ts-back{position:absolute;inset:0;border-radius:3mm;overflow:hidden}
.ts-backIn{position:absolute;inset:4mm;border:.35mm solid rgba(255,255,255,.55);border-radius:2mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;color:#fff;text-align:center;padding:0 5mm}
.ts-backName{font-weight:800;font-size:15pt;letter-spacing:.04em}
.ts-backNo{font-weight:900;font-size:40pt;line-height:1}
.ts-backSub{font-size:9.6pt;opacity:.9}

/* the teacher's pages */
.tt-wrap{padding:9mm 11mm 0}
.tt-head{display:flex;align-items:center;gap:4mm;border-bottom:.35mm solid var(--t);padding-bottom:2.4mm;margin-bottom:3mm}
.tt-t{font-size:20pt;color:var(--t)}
.tt-sub{font-size:9.4pt;color:var(--muted)}
.tt-sub b{color:var(--t);font-weight:700}
.tt-key{margin-left:auto;flex:none;text-align:right;display:flex;flex-direction:column;gap:.4mm;white-space:nowrap}
.tt-key span{font-size:8pt;color:var(--muted)}
.tt-key b{font-size:18pt;color:#8a6d12;letter-spacing:.06em}
table.tt{border-collapse:collapse;width:100%;font-size:8.8pt;line-height:1.3}
table.tt th{background:var(--parch);color:var(--wine);text-align:left;padding:1.2mm 1.4mm;border:.2mm solid var(--line)}
table.tt td{border:.2mm solid var(--line);padding:1.3mm 1.4mm;vertical-align:top}
.tt-no{font-weight:800;color:var(--t);text-align:center;width:6mm}
.tt-door{width:30mm}
.tt-door b{display:block}
.tt-door span{font-size:7.8pt;color:var(--muted)}
.tt-pc{display:inline !important;color:#8a6d12;font-size:9.4pt}
.tt-a{width:36mm}
.tt-a b{color:#1e4d31}
.tt-music{display:flex;flex-direction:column;gap:2.4mm;margin-top:3mm}
.tt-mus{border:.3mm solid var(--line);border-radius:2mm;padding:2mm 3mm;background:#fff}
.tt-musT{display:flex;align-items:center;gap:1.6mm;font-size:9.4pt;margin-bottom:1mm}
.tt-musT span{margin-left:auto;font-size:8pt;color:var(--muted)}
.tt-echo{display:flex;justify-content:center}
.tt-notes{margin-top:3mm;font-size:8.6pt;line-height:1.32}
.tt-notesT{font-weight:700;color:var(--wine);margin-bottom:1mm;font-size:9.2pt}
.tt-notes ol{margin:0;padding-left:5mm}
.tt-notes li{margin-bottom:.8mm}
.tt-notes li.gate{list-style:none;margin-left:-5mm;color:#8a6d12;font-weight:700}

/* the tracker and the tokens */
.tr-wrap{padding:8mm 11mm 0}
.tr-top{display:flex;gap:6mm;font-size:10pt;margin:2mm 0 4mm}
.tr-top i{display:inline-block;border-bottom:.3mm solid var(--brown);height:5mm;vertical-align:bottom}
table.tr{border-collapse:collapse;width:100%;font-size:9pt}
table.tr th{background:var(--parch);color:var(--wine);padding:1.4mm 1mm;border:.25mm solid var(--line);font-size:8.6pt}
table.tr td{border:.25mm solid var(--line);height:20mm}
table.tr td:first-child{width:34mm}
.tr-h{text-align:center;white-space:nowrap}
.tr-how{margin-top:5mm;font-size:9.8pt;line-height:1.4}
.tsTokens .piece{padding:1.6mm}
.tk{width:100%;height:100%;border:.4mm solid #e3cf9f;border-radius:2.4mm;background:#fdf6e3;display:flex;align-items:center;justify-content:center;gap:3mm}
.tk.ans{background:#eef7f0;border-color:#9fcfae}
.tk b{display:block;font-size:13pt;color:var(--brown)}
.tk span{font-size:10pt;color:var(--muted);font-weight:700}
.tk.back{background:var(--wine);border-color:var(--wine);flex-direction:column;gap:1.4mm}
.tk.back span{color:#f0d9a0;font-size:8.6pt}
`;

const SHEETS = [{ key: 'cover' }, ...roomSheets, ...teacherSheets, { key: 'tracker', front: trackerPage }, tokenSheet];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
