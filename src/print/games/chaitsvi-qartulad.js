// „ჩაიცვი ქართულად“ on paper — the „უტელეფონო“ variant of the app's dress-up game (2026-11-01). Two paper dolls — a boy for
// the chokha, a girl for the Georgian dress — and their clothes to cut out, all drawn at the dolls' own size (dolls.mjs). The
// doll lies on the table and the parts are laid on it, so a part put on too early would lie over what belongs on top of it:
// the referee says „უკან!“ and the team's time grows by the app's penalty. The order, the reasons and the stories are the
// app's own (utils/chaitsvi.ts, „ჩემი სამოსი“'s data): every part's back says what it goes on after, the host's sheet has
// the reasons and the stories, its back the scores.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, coverCss } from '../lib.js';
import { halo, boyDoll, girlDoll, CHOKHA_SET, KABA_SET, DOLL_BOX, dressed } from '../dolls.js';
import * as __d0 from '../../utils/chaitsvi';
import * as __d1 from '../../data/samosiData';
import * as __d2 from '../../data/kabaData';

const A = ({ ...__d0, ...__d1, ...__d2 });
const { HAT, HATS } = A;
const PEN = A.PENALTY_MS / 1000;

export const id = 'chaitsvi-qartulad';
export const title = 'ჩაიცვი ქართულად';
const TAG = 'ქართული · უტელეფონო';
const META = '2–6 გუნდი · 6 წლიდან · 15 წუთი';
const r1 = n => Math.round(n * 10) / 10;

// ---------- the app's rules, read for the paper ----------
const OUT = {
  chokha: { set: CHOKHA_SET, steps: A.CHOKHA_STEPS, parts: A.SAMOSI_PARTS, doll: boyDoll, label: 'ჩოხა', who: 'ბიჭის თოჯინა' },
  kaba: { set: KABA_SET, steps: A.KABA_STEPS, parts: A.KABA_PARTS, doll: girlDoll, label: 'ქართული კაბა', who: 'გოგოს თოჯინა' },
};
const partOf = p => p.part ?? p.id; // the two cartridge holders are one part
const stepIdOf = (o, pid) => (o === 'chokha' && HATS.includes(pid) ? HAT : pid);
const stepOf = (o, sid) => {
  const s = OUT[o].steps.find(x => x.id === sid);
  if (!s) throw new Error(`chaitsvi: no step ${sid}`);
  return s;
};
const infoOf = (o, pid) => {
  const p = OUT[o].parts.find(x => x.id === pid);
  if (!p) throw new Error(`chaitsvi: no part ${pid}`);
  return p;
};
const labelOf = (o, pid) => infoOf(o, pid).label;
// every step's part is drawn, and every drawn part is a step's
for (const o of Object.keys(OUT)) {
  const drawn = new Set(OUT[o].set.map(p => stepIdOf(o, partOf(p))));
  for (const s of OUT[o].steps) if (!drawn.has(s.id)) throw new Error(`chaitsvi: ${o} has no drawing of ${s.id}`);
  for (const p of OUT[o].set) stepOf(o, stepIdOf(o, partOf(p)));
}

const GEN = { akhalukhi: 'ახალუხის', chokha: 'ჩოხის', masrebi: 'მასრების', kamari: 'ქამრის', khanjali: 'ხანჯლის', kaba: 'კაბის', gulispiri: 'გულისპირის', sartqeli: 'სარტყლის', katibi: 'ქათიბის' };
/** what a part goes on after, from the app's rules: first, last, or the parts right under it */
const afterOf = (o, sid) => {
  const steps = OUT[o].steps, s = stepOf(o, sid);
  if (!s.needs.length) return 'პირველი';
  if (s.needs.length === steps.length - 1) return 'ბოლოს';
  const under = s.needs.filter(n => !s.needs.some(m => m !== n && stepOf(o, m).needs.includes(n)));
  const g = under.map(n => { if (!GEN[n]) throw new Error(`chaitsvi: no genitive for ${n}`); return GEN[n]; });
  return `${g.length > 1 ? `${g.slice(0, -1).join(', ')}ა და ${g[g.length - 1]}` : g[0]} შემდეგ`;
};

// ---------- the drawings ----------
const at = (p, X, Y, inner) => `<g transform="translate(${r1(X - p.box[0])} ${r1(Y - p.box[1])})">${inner}</g>`;
const shapes = cut => cut.map(c => `<path d="${c.d}"${c.t ? ` transform="${c.t}"` : ''}/>`).join('');
/** some parts drawn together, fitted into a w×h mm box (the host's sheet) */
const pic = (o, ids, w, h) => {
  const ps = ids.map(i => OUT[o].set.find(p => p.id === i));
  const x0 = Math.min(...ps.map(p => p.box[0])), y0 = Math.min(...ps.map(p => p.box[1]));
  const x1 = Math.max(...ps.map(p => p.box[2])), y1 = Math.max(...ps.map(p => p.box[3]));
  return `<svg viewBox="${x0} ${y0} ${r1(x1 - x0)} ${r1(y1 - y0)}" width="${w}mm" height="${h}mm">${ps.map(p => p.make().art).join('')}</svg>`;
};
/** a doll dressed so far: the doll and the parts' drawings in the order given */
const dollWith = (o, ids, extra = '') => {
  const set = OUT[o].set;
  return `${OUT[o].doll().art}${ids.map(i => set.find(p => p.id === i).make().art).join('')}${extra}`;
};
const VIEW = { chokha: [8, 4, 84, 251], kaba: [12, 12, 76, 243] };
const model = (o, w, inner = dressed(o, 'papakha')) => {
  const [x, y, vw, vh] = VIEW[o];
  return `<svg viewBox="${x} ${y} ${vw} ${vh}" width="${w}mm" height="${r1((w * vh) / vw)}mm">${inner}</svg>`;
};

// where each part lies on its sheet: the page point (mm) of its box's top-left
const PLACE = {
  chokha: {
    chokha: [8, 14], akhalukhi: [92, 14], 'masrebi-l': [175, 16], 'masrebi-r': [175, 46],
    kamari: [8, 188], khanjali: [60, 188], papakha: [92, 138], kakhuri: [92, 184], svanuri: [92, 222], kabalakhi: [150.6, 138],
  },
  kaba: { kaba: [8, 14], katibi: [84, 14], lechaki: [84, 162], gulispiri: [170.4, 16], sartqeli: [161, 78] },
};
// the boxes must stay on the paper and apart, so every part can be cut on its own line
for (const [o, place] of Object.entries(PLACE)) {
  const rects = OUT[o].set.map(p => {
    if (!place[p.id]) throw new Error(`chaitsvi: ${p.id} has no place`);
    const [X, Y] = place[p.id];
    return { id: p.id, x0: X, y0: Y, x1: X + p.box[2] - p.box[0], y1: Y + p.box[3] - p.box[1] };
  });
  for (const r of rects) if (r.x0 < 6 || r.y0 < 10 || r.x1 > 204 || r.y1 > 287) throw new Error(`chaitsvi: ${r.id} runs off the paper`);
  rects.forEach((a, i) => rects.slice(i + 1).forEach(b => {
    if (a.x0 < b.x1 + 2 && b.x0 < a.x1 + 2 && a.y0 < b.y1 + 2 && b.y0 < a.y1 + 2) throw new Error(`chaitsvi: ${a.id} and ${b.id} are too close`);
  }));
}

// each part's back: where its label sits on the part (doll mm), its turn (°, as on the front) and size (pt); `row` = one line
const LAB = {
  chokha: { at: [50, 192], size: 13 },
  akhalukhi: { at: [50, 148], size: 11.5 },
  'masrebi-l': { at: [37.6, 96.6], turn: -7, size: 6.2 },
  'masrebi-r': { at: [62.4, 96.6], turn: 7, size: 6.2 },
  kamari: { at: [50, 134.2], size: 6.4, row: true },
  khanjali: { at: [53.2, 151.05], turn: 68, size: 5.6, row: true },
  papakha: { at: [50, 25.5], size: 10 },
  kakhuri: { at: [50, 30.5], size: 9.5 },
  svanuri: { at: [50, 32], size: 8.5 },
  kabalakhi: { at: [50, 30.5], size: 9 },
  kaba: { at: [50, 200], size: 13 },
  katibi: { at: [33.4, 152], turn: 90, size: 10 },
  lechaki: { at: [29.6, 100], turn: 90, size: 9.5 },
  gulispiri: { at: [50, 100], turn: 90, size: 8 },
  sartqeli: { at: [50, 131.1], size: 6.4, row: true },
};
const BACK = '#f3ead8';

// ---------- sheets 2 and 4: the dolls ----------
const dollPage = (o, no) => {
  const d = OUT[o].doll();
  const X = 105 - (DOLL_BOX[2] - DOLL_BOX[0]) / 2, Y = 30;
  const boy = o === 'chokha';
  return page(`<svg class="ch-svg" viewBox="0 0 210 297" width="210mm" height="297mm"><g transform="translate(${r1(X - DOLL_BOX[0])} ${r1(Y - DOLL_BOX[1])})">${halo(d.cut)}${d.art}</g></svg>
<div class="ch-side ch-l">
  <div class="aso ch-k">${aso(title)}</div>
  <h2>${esc(OUT[o].who)}</h2>
  <p class="ch-sub">${boy ? 'ჩოხისთვის' : 'ქართული კაბისთვის'} · ტანსაცმელი — ფურცელი ${no(o)}</p>
  <ol class="ch-steps">
    <li>${icon('scissors', { size: 5, color: C.wine, width: 2 })}<span>ამოჭერი ნაცრისფერ ხაზზე. სქელ ქაღალდზე თოჯინა უფრო დიდხანს გაძლებს.</span></li>
    <li>${icon('layers', { size: 5, color: C.wine, width: 2 })}<span>თამაშისას თოჯინა მაგიდაზე წევს, ტანსაცმელს ზემოდან ადებ: ზედა ნაწილი ქვედას ფარავს — როგორც ნამდვილ ჩაცმაში.</span></li>
    <li>${icon('rotate-ccw', { size: 5, color: C.wine, width: 2 })}<span>ყოველი ნაწილის ზურგზე წერია, რის შემდეგ იცმევა.</span></li>
  </ol>
</div>
<div class="ch-side ch-r">
  <div class="ch-model">${model(o, 36)}</div>
  <p class="ch-cap">ასე გამოვა</p>
  <p class="ch-cap2">${boy ? 'ქუდი — ოთხიდან ერთი: ფაფახი, კახური, სვანური ან ყაბალახი.' : 'ლეჩაქს თავსაკრავი თან აქვს.'}</p>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · ${esc(OUT[o].who)} — ამოჭერი ნაცრისფერ ხაზზე</div>`, 'chP');
};

// ---------- sheets 3 and 5: the clothes, their backs mirrored ----------
const NOTE = {
  chokha: { box: [165, 76, 202, 134], text: 'ამოჭერი ყველა ნაწილი ნაცრისფერ ხაზზე. ქუდი ოთხია — თამაშში ერთი იხურება.' },
  kaba: { box: [8, 202, 78, 236], text: 'ამოჭერი ყველა ნაწილი ნაცრისფერ ხაზზე. ლეჩაქს თავსაკრავი თან აქვს.' },
};
const piecesPage = o => {
  const { set } = OUT[o], place = PLACE[o], n = NOTE[o];
  const art = set.map(p => { const m = p.make(); return at(p, ...place[p.id], `${halo(m.cut)}${m.art}`); }).join('');
  return page(`<svg class="ch-svg" viewBox="0 0 210 297" width="210mm" height="297mm">${art}</svg>
<div class="ch-note" style="left:${n.box[0]}mm;top:${n.box[1]}mm;width:${n.box[2] - n.box[0]}mm">${icon('scissors', { size: 5, color: C.wine, width: 2 })}<span>${esc(n.text)}</span></div>
<div class="sheetLabel">ფურცელი %SHEET% · ${esc(title)} · ${esc(OUT[o].label)}: ${set.length} ნაწილი — ამოჭერი ნაცრისფერ ხაზზე</div>`, 'chP');
};
const backLabel = (o, p) => {
  const L = LAB[p.id];
  const [X, Y] = PLACE[o][p.id];
  const x = 210 - (X + L.at[0] - p.box[0]), y = Y + L.at[1] - p.box[1];
  const pid = partOf(p), sid = stepIdOf(o, pid);
  const after = `${afterOf(o, sid)}${sid === HAT && o === 'chokha' ? ' · ოთხიდან ერთი' : ''}`;
  return `<div class="ch-lab${L.row ? ' row' : ''}" style="left:${r1(x)}mm;top:${r1(y)}mm;font-size:${L.size}pt;transform:translate(-50%,-50%) rotate(${-(L.turn ?? 0)}deg)"><b>${esc(labelOf(o, pid))}</b><i>${esc(after)}</i></div>`;
};
const backPage = o => {
  const { set } = OUT[o], place = PLACE[o];
  return page(`<svg class="ch-svg" viewBox="0 0 210 297" width="210mm" height="297mm"><g transform="translate(210 0) scale(-1 1)" fill="${BACK}" stroke="${BACK}" stroke-width="7" stroke-linejoin="round">${set.map(p => at(p, ...place[p.id], shapes(p.make().cut))).join('')}</g></svg>
${set.map(p => backLabel(o, p)).join('')}
<div class="sheetLabel">ფურცელი %SHEET% · ზურგი: ნაწილის სახელი და რის შემდეგ იცმევა</div>`, 'chP');
};

// ---------- sheet 6: the host's sheet and the scores ----------
const STORY_HAT = infoOf('chokha', 'papanaki').story; // „ჩემი სამოსი“'s word on the hat itself
const hostRow = (o, s) => {
  const hat = o === 'chokha' && s.id === HAT;
  const ids = hat ? HATS : OUT[o].set.filter(p => partOf(p) === s.id).map(p => p.id);
  const pics = hat ? `<div class="hs-hats4">${HATS.map(h => pic(o, [h], 7.6, 7.6)).join('')}</div>` : pic(o, ids, 13, 13);
  const name = hat ? 'ქუდი' : labelOf(o, s.id);
  const story = hat ? `${STORY_HAT} ოთხი ქუდის ამბავი — ქვემოთ.` : infoOf(o, s.id).story;
  return `<div class="hs-row"><div class="hs-pic">${pics}</div><div class="hs-t">
    <p class="hs-name"><b>${esc(name)}</b> · <span>${esc(afterOf(o, s.id))}</span></p>
    ${s.why ? `<p class="hs-why">${icon('megaphone', { size: 3.4, color: C.wine, width: 2.2 })}„უკან!“ — ${esc(s.why)}</p>` : ''}
    <p class="hs-story">${esc(story)}</p></div></div>`;
};
const hatCard = h => {
  const p = infoOf('chokha', h);
  if (!p.story.includes(p.label)) throw new Error(`chaitsvi: the story of ${h} does not name it`);
  return `<div class="hs-hat"><div class="hs-hatPic">${pic('chokha', [h], 15, 15)}</div><div><b>${esc(p.label)}</b><p>„${esc(p.story.replace(p.label, '…'))}“</p></div></div>`;
};
const hostPage = no => page(`${stripe(TAG, 'წამყვანის ფურცელი')}
<div class="hs">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წამყვანის ფურცელი · რიგი, მიზეზი, ამბავი</div></div>
  <p class="lead">მსაჯი ამ ფურცელს მისდევს: ადრე დადებულ ნაწილზე ამბობს „უკან!“ და მიზეზს. ერთი ნაწილი სხვას რომ არ ელოდება (მაგალითად, მასრები და ქამარი) — მათი რიგი თავისუფალია. ამბებს თამაშის ბოლოს წაიკითხავთ.</p>
  <div class="hs-two">${['chokha', 'kaba'].map(o => `<div><h3 class="hs-h">${esc(OUT[o].label)}</h3>${OUT[o].steps.map(s => hostRow(o, s)).join('')}</div>`).join('')}</div>
  <div class="hs-quiz">
    <h3 class="hs-h">„რომელი ქუდი?“</h3>
    <p class="hs-qlead">წაიკითხე ამბავი სახელის გარეშე — ვინც პირველი აწევს სწორ ქუდს, ქულას იღებს.</p>
    <div class="hs-hg">${HATS.map(hatCard).join('')}</div>
  </div>
</div>
${foot(`<span>${esc(title)} · წამყვანის ფურცელი · შედეგები — ზურგზე</span><span>${esc(SCHOOL)}</span>`)}`, 'hsP');

const scoreTable = k => `<h3 class="hs-h">${k === 1 ? 'პირველი თამაში' : 'მეორე თამაში'}</h3>
<table class="t sc-t">
  <tr><th rowspan="2" class="nm">გუნდი</th><th colspan="3">ჩოხა</th><th colspan="3">ქართული კაბა</th><th rowspan="2">ორივე</th><th rowspan="2">ადგილი</th></tr>
  <tr><th>დრო</th><th>„უკან!“</th><th>სულ</th><th>დრო</th><th>„უკან!“</th><th>სულ</th></tr>
  ${Array.from({ length: 6 }, (_, i) => `<tr><td class="nm"><span>${i + 1}</span></td>${'<td></td>'.repeat(8)}</tr>`).join('')}
</table>`;
const refereeList = o => `<p class="sc-o"><b>${esc(OUT[o].label)}:</b> ${OUT[o].steps.map(s => `${esc(o === 'chokha' && s.id === HAT ? 'ქუდი' : labelOf(o, s.id))} — ${esc(afterOf(o, s.id))}`).join('; ')}.</p>`;
const scorePage = no => page(`${stripe(TAG, 'შედეგები')}
<div class="sc">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">შედეგების ფურცელი · დრო + ${PEN} წამი ყოველ „უკან!“-ზე</div></div>
  ${scoreTable(1)}
  ${scoreTable(2)}
  <div class="sc-two">
    <div class="box"><h3>როგორ ვითვლით</h3><p>„უკან!“-ზე გუნდის ველში ხაზი გაავლეთ: <b>|||</b>. <b>სულ</b> = დრო + ${PEN} წამი ყოველ ხაზზე. მაგალითად, 52 წამი და 2 „უკან!“ → <b>${52 + 2 * PEN} წამი</b>. ყველაზე ნაკლები იგებს; თანაბარ დროზე ადგილი გაიყავით.</p></div>
    <div class="box"><h3>მსაჯს: რა რის შემდეგ</h3>${refereeList('chokha')}${refereeList('kaba')}</div>
  </div>
</div>
${foot(`<span>${esc(title)} · შედეგები</span><span>${esc(SCHOOL)}</span>`)}`, 'scP');

// ---------- sheet 1: the cover and the rules ----------
const count = o => OUT[o].set.length;
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ჩოხაც და ქართული კაბაც ნაწილ-ნაწილ იცმევა: ჯერ — ის, რაც ქვემოთაა, მერე — რაც ზემოდან. გუნდები ქაღალდის თოჯინას დროზე აცმევენ; ადრე დადებული ნაწილი „უკან!“ ბრუნდება და დროს ${PEN} წამს უმატებს. ბოლოს კი — ყოველი ნაწილის ამბავი. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="ch-ex box">
    <div class="ch-exDolls">${model('chokha', 27)}${model('kaba', 24.5)}</div>
    <div class="ch-exR">
      <h3>ორი თოჯინა, ${count('chokha') + count('kaba')} ნაწილი</h3>
      <p><b>ჩოხა:</b> ახალუხი, ჩოხა, მასრები (ორი ნაწილი), ქამარი, ხანჯალი და ოთხი ქუდი — ფაფახი, კახური, სვანური და ყაბალახი.</p>
      <p><b>ქართული კაბა:</b> კაბა, გულისპირი, სარტყელი, ქათიბი და ლეჩაქი.</p>
      <p>ტანსაცმელი თოჯინის ზომისაა — ზუსტად ჯდება. სწორი რიგი, მიზეზები და ამბები — წამყვანის ფურცელზე (${no('host')}).</p>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>${no('cover')}-ის ზურგი</td></tr>
        <tr><td>ბიჭის თოჯინა</td><td>${no('boy')}</td></tr>
        <tr><td>ჩოხა და ოთხი ქუდი — ${count('chokha')} ნაწილი (ზურგზე: სახელი და რის შემდეგ იცმევა)</td><td>${no('chokha')}</td></tr>
        <tr><td>გოგოს თოჯინა</td><td>${no('girl')}</td></tr>
        <tr><td>ქართული კაბა — ${count('kaba')} ნაწილი</td><td>${no('kaba')}</td></tr>
        <tr><td>წამყვანის ფურცელი: რიგი, მიზეზი, ამბავი, „რომელი ქუდი?“</td><td>${no('host')}</td></tr>
        <tr><td>შედეგები (ორი თამაში)</td><td>${no('host')}-ის ზურგი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>, ფერადად — თოჯინა და ტანსაცმელი ერთ ზომაზე გამოვა.</li>
        <li>ფურცლები ${no('boy')}–${no('kaba')} — სქელ ქაღალდზე (160–200 გ/მ²); ამოჭერი ნაცრისფერ ხაზზე. ერთი ნაკრები ყველა გუნდს ჰყოფნის.</li>
        <li>ფურცელი ${no('host')} — წამყვანს და მსაჯს.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია ჩაცმის თამაშების (Dress-up) — ქაღალდის თოჯინების — იდეით. თოჯინები და ტანსაცმელი საგანძურის სკოლისთვის დაიხატა; რიგი და ამბები აპის „ჩემი სამოსისაა“, ამიტომ ქაღალდიც და ტელეფონიც ერთნაირად ამოწმებს. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['რა გჭირდებათ', `ამოჭრილი თოჯინები და მათი ტანსაცმელი (ფურცლები ${no('boy')}–${no('kaba')}), წამზომი — ან მთელი კლასი, რომელიც ხმამაღლა ითვლის, — და წამყვანის ფურცელი (${no('host')}).`],
  ['მომზადება', 'თოჯინა მაგიდაზე დააწვინეთ, ნაწილები გვერდით — არეულად და სახით ზემოთ, ოთხივე ქუდი ერთად. გუნდი მაგიდასთან დგას.'],
  ['„3, 2, 1 — ჩაიცვი!“', 'წამყვანი იწყებს და დრო მიდის. გუნდის წევრები რიგრიგობით იღებენ თითო ნაწილს და თოჯინაზე, თავის ადგილზე, დებენ — ზედა ნაწილი ქვედას ფარავს, როგორც ნამდვილ ჩაცმაში.'],
  ['„უკან!“', `მსაჯი — მასწავლებელი ან სხვა გუნდის მოთამაშე — წამყვანის ფურცელს მისდევს. ნაწილი ადრე დადეს (მაგალითად, ხანჯალი ქამრამდე)? „უკან!“: ნაწილი მაგიდას უბრუნდება, მსაჯი მიზეზს ამბობს, გუნდს კი ${PEN} წამი ემატება.`],
  ['ქუდი', 'ოთხი ქუდიდან ერთი იხურება — რომელიც გუნდს მოეწონება. ლეჩაქს თავსაკრავი თან აქვს.'],
  ['„მზადაა!“', `ბოლო ნაწილზე გუნდი ერთხმად ამბობს „მზადაა!“ და დრო ჩერდება. შედეგი = დრო + ${PEN} წამი ყოველ „უკან!“-ზე; ჩაწერეთ ${no('host')}-ის ზურგზე.`],
  ['გამარჯვებული', 'ყველაზე სწრაფი გუნდი. ითამაშეთ ჩოხაც და კაბაც — ორივე დრო იკრიბება. თანაბარ დროზე ადგილი გაიყავით.'],
  ['ამბები', `თამაშის ბოლოს წამყვანი ყოველი ნაწილის ამბავს კითხულობს (${no('host')}), ბავშვები კი იმ ნაწილს მაღლა სწევენ.`],
  ['„რომელი ქუდი?“', 'წამყვანი ქუდის ამბავს სახელის გარეშე კითხულობს; ვინც პირველი აწევს სწორ ქუდს, ქულას იღებს.'],
  ['პატარებთან', 'დროის გარეშე: მთავარი სწორი რიგია. ყოველი ნაწილის ზურგზე წერია, რის შემდეგ იცმევა — გაუჭირდათ? ზურგი ნახონ.'],
];
// the rules' example: dressed so far, then a part put on too early, then dressed
const NO_MARK = (() => {
  const cx = 70, cy = 150, r = 7;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#b3261e" stroke-width="2"/><path d="M${cx - 3.4} ${cy - 3.4}L${cx + 3.4} ${cy + 3.4}M${cx + 3.4} ${cy - 3.4}L${cx - 3.4} ${cy + 3.4}" stroke="#b3261e" stroke-width="2.2" stroke-linecap="round"/>`;
})();
const EXAMPLE = [
  { inner: dollWith('chokha', ['akhalukhi']), cap: 'ახალუხი — პირველი' },
  { inner: dollWith('chokha', ['akhalukhi', 'chokha']), cap: 'ჩოხა — ახალუხის შემდეგ' },
  { inner: dollWith('chokha', ['akhalukhi', 'chokha'], `<g opacity=".6">${CHOKHA_SET.find(p => p.id === 'khanjali').make().art}</g>${NO_MARK}`), cap: `ხანჯალი ქამრამდე? „უკან!“ +${PEN} წამი`, no: true },
  { inner: dressed('chokha', 'svanuri'), cap: '„მზადაა!“' },
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">ჩოხა თავისი რიგით იცმევა: ახალუხი, ზედ ჩოხა, ჩოხაზე მასრები და ქამარი, ქამარზე ხანჯალი, ბოლოს ქუდი. ქართული კაბაც ასეა. ვინ ჩააცმევს თოჯინას ყველაზე სწრაფად და სწორად?</p>
  <div class="ch-rex">${EXAMPLE.map((e, i) => `${i ? `<span class="ch-arrow">${icon('chevron-right', { size: 5, color: C.gold, width: 2.4 })}</span>` : ''}<div class="ch-rexA${e.no ? ' no' : ''}">${model('chokha', 24, e.inner)}<span>${esc(e.cap)}</span></div>`).join('')}</div>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="kz-more box"><b>აპში</b> იგივე თამაშია: sagandzureli.ge → თამაშები → ჩაიცვი ქართულად. „ონლაინ“ — მარტო, დროზე და რეკორდით; „ჰიბრიდული“ — გუნდები ერთ ტელეფონს რიგრიგობით გადასცემენ. გაქვთ ნამდვილი ჩოხა? გუნდი თავის „მოდელს“ აცმევს, წამყვანი კი ყოველ ჩაცმულ ნაწილზე ტელეფონს ეხება — რიგს ტელეფონი ამოწმებს.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// every page's text must end above its footer (or the paper's edge); a page that runs over stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.page').forEach((pg, i) => {
    const f = pg.querySelector('.foot');
    const limit = f ? f.getBoundingClientRect().top - 1 : pg.getBoundingClientRect().bottom - 8 * 96 / 25.4;
    pg.querySelectorAll('.cover > *, .rulesWrap > *, .hs > *, .sc > *, .ch-side, .ch-note').forEach(el => {
      if (el.getBoundingClientRect().bottom > limit) bad.push('page ' + (i + 1) + ': ' + (el.className || el.tagName));
    });
  });
  if (bad.length) throw new Error('chaitsvi-qartulad: runs into the footer — ' + bad.join(' · '));
})()`;

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10pt;line-height:1.36}
.rulesP .rules li{margin-bottom:.9mm}
.rulesP .lead{font-size:10.6pt}
.cover .lead{margin-bottom:4mm}
.kz-more{margin-top:3mm;font-size:9.6pt;line-height:1.35}
.ch-ex{display:grid;grid-template-columns:auto 1fr;gap:7mm;align-items:center;margin:0 0 5mm;padding:3mm 6mm}
.ch-exDolls{display:flex;gap:5mm;align-items:flex-end}
.ch-exR h3{margin:0 0 2mm}
.ch-exR p{margin:0 0 1.8mm;font-size:10pt;line-height:1.36}
.ch-rex{display:flex;align-items:center;justify-content:center;gap:2mm;margin:0 0 3mm}
.ch-rexA{display:flex;flex-direction:column;align-items:center;gap:1mm;width:34mm;font-size:8.6pt;font-weight:700;color:var(--wine);text-align:center;line-height:1.25}
.ch-rexA svg{background:#fffdf8;border:.25mm solid var(--line);border-radius:1.6mm}
.ch-rexA.no span{color:#b3261e}
.ch-arrow{display:flex}
.chP{padding:0}
.ch-svg{position:absolute;left:0;top:0}
.ch-side{position:absolute;top:30mm;width:52mm}
.ch-l{left:10mm}
.ch-r{left:148mm;display:flex;flex-direction:column;align-items:center;text-align:center}
.ch-k{font-size:11pt;color:var(--gold2);letter-spacing:.06em}
.ch-side h2{margin:1mm 0 0;color:var(--wine);font-size:17pt;line-height:1.15}
.ch-sub{margin:1mm 0 5mm;font-size:9.4pt;color:var(--muted)}
.ch-steps{list-style:none;margin:0;padding:0}
.ch-steps li{display:flex;gap:2.4mm;align-items:flex-start;font-size:9.6pt;line-height:1.36;margin-bottom:3.4mm}
.ch-steps svg{flex:none;margin-top:.3mm}
.ch-model svg{display:block}
.ch-model{padding:3mm 5mm;background:var(--paper);border:.3mm solid var(--gold);border-radius:2.4mm}
.ch-cap{margin:2mm 0 0;font-weight:700;color:var(--wine);font-size:10pt}
.ch-cap2{margin:1mm 0 0;font-size:9pt;color:var(--muted);line-height:1.35}
.ch-note{position:absolute;display:flex;gap:2mm;align-items:flex-start;font-size:9pt;line-height:1.36;color:var(--brown)}
.ch-note svg{flex:none;margin-top:.2mm}
.ch-lab{position:absolute;display:flex;flex-direction:column;align-items:center;white-space:nowrap;text-align:center;color:var(--brown);line-height:1.12}
.ch-lab b{font-family:'SansKa',sans-serif;font-weight:900;color:var(--wine)}
.ch-lab i{font-style:normal;font-size:.72em}
.ch-lab.row{flex-direction:row;align-items:baseline;gap:.45em}
.hs,.sc{padding:6mm 12mm 0}
.hs .lead{font-size:9.8pt;margin-bottom:2.6mm}
.hs-two{display:grid;grid-template-columns:1fr 1fr;gap:7mm}
.hs-h{margin:0 0 1.6mm;color:var(--wine);font-size:12pt;border-bottom:.25mm solid var(--line);padding-bottom:.8mm}
.hs-row{display:grid;grid-template-columns:16mm 1fr;gap:2.4mm;margin-bottom:2.2mm;break-inside:avoid}
.hs-pic{display:flex;align-items:flex-start;justify-content:center}
.hs-hats4{display:grid;grid-template-columns:7.6mm 7.6mm;gap:.6mm}
.hs-t p{margin:0}
.hs-name{font-size:10pt;line-height:1.3}
.hs-name b{color:var(--wine)}
.hs-name span{font-weight:700;color:var(--gold2)}
.hs-why{font-size:8.6pt;line-height:1.3;color:var(--wine);margin:.3mm 0 .4mm!important}
.hs-why svg{vertical-align:-.7mm;margin-right:1mm}
.hs-story{font-size:8.6pt;line-height:1.32;color:#5e4a3c}
.hs-quiz{margin-top:2mm}
.hs-qlead{margin:0 0 2mm;font-size:9.4pt}
.hs-hg{display:grid;grid-template-columns:1fr 1fr;gap:2.4mm 6mm}
.hs-hat{display:grid;grid-template-columns:17mm 1fr;gap:2mm;align-items:start;background:var(--paper);border:.25mm solid var(--line);border-radius:2mm;padding:2mm 2.6mm}
.hs-hat b{color:var(--wine);font-size:10pt}
.hs-hat p{margin:.4mm 0 0;font-size:8.6pt;line-height:1.32}
.hs-hatPic{display:flex;justify-content:center}
.sc-t{font-size:9.4pt;margin-bottom:5mm}
.sc-t th{text-align:center!important;font-size:9pt}
.sc-t td{height:10.4mm;vertical-align:middle}
.sc-t td.nm{width:44mm}
.sc-t td.nm span{display:inline-block;width:5mm;height:5mm;border-radius:50%;background:var(--parch);color:var(--wine);font-weight:700;font-size:8.4pt;text-align:center;line-height:5mm}
.sc-two{display:grid;grid-template-columns:1fr 1.25fr;gap:6mm;margin-top:1mm}
.sc-two h3{margin:0 0 1.6mm;color:var(--wine);font-size:11pt}
.sc-two p{margin:0 0 1.4mm;font-size:9.2pt;line-height:1.38}
.sc-o b{color:var(--wine)}
`;

const SHEETS = [{ key: 'cover' }, { key: 'boy' }, { key: 'chokha' }, { key: 'girl' }, { key: 'kaba' }, { key: 'host' }];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);
SHEETS[1].front = dollPage('chokha', no);
SHEETS[2].front = piecesPage('chokha');
SHEETS[2].back = backPage('chokha');
SHEETS[3].front = dollPage('kaba', no);
SHEETS[4].front = piecesPage('kaba');
SHEETS[4].back = backPage('kaba');
SHEETS[5].front = hostPage(no);
SHEETS[5].back = scorePage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
