// „ხმების ტურნირი“ on paper — the სამაგიდო variant of the app's singing game (2026-11-01, like SingStar): no phone, the class is
// the jury. Two singers sing the same chant's first phrase in the same voice, one after the other, and the class holds up its
// voting cards — ა for the first, ბ for the second; the winner goes on through the bracket (8 singers, or 16 on its back) to the
// final. A small class plays by points instead, as the app does: three rounds, every singer sings, the jury gives 0–3. The kit:
// 18 well-known chants' first phrases, each voice on its own staff with its first note named (the app's chant games' chants,
// melodies.mjs; a voice's opening = music.mjs `openingOf`), the brackets, nine voting cards, the score sheet, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, iconIn, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import { abcOf, lineOf, openingOf, staff, musicHead, musicScript, musicCss } from '../music.js';
import { CHANTS, app } from '../melodies.js';
import { partsCss, step } from '../kitParts.js';
import * as __d0 from '../../utils/pearls';

const { shuffle, mulberry32 } = app;
const { noteName } = ({ ...__d0 });

export const id = 'khmebis-turniri';
export const title = 'ხმების ტურნირი';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '4–16 მომღერალი, დანარჩენი — ჟიური · 9 წლიდან · 20–40 წუთი';
const COUNT = 18;
const PER_PAGE = 3;
const SCORE_ROWS = 12;

const VOICES = [
  { roman: 'I', name: 'მთქმელი', color: C.wine },
  { roman: 'II', name: 'მოძახილი', color: C.goldDark },
  { roman: 'III', name: 'ბანი', color: '#2b5f8a' },
];
const A = { letter: 'ა', color: C.wine, word: 'პირველი' };
const B = { letter: 'ბ', color: '#2b5f8a', word: 'მეორე' };

// the phrases: each voice's own opening (a singer sings one voice alone), 6–14 notes; a chant whose voice hardly moves is left out
const PHRASES = shuffle(CHANTS, mulberry32(31)).flatMap(c => {
  const voices = [0, 1, 2].map(v => openingOf(lineOf(c.score, v), { min: 6, max: 14 }).notes);
  return voices.every(v => v.length >= 6 && new Set(v.map(n => n.midi)).size >= 3) ? [{ ...c, voices }] : [];
}).slice(0, COUNT).map((c, i) => ({ ...c, no: i + 1, abc: c.voices.map(v => abcOf(v)) }));
if (PHRASES.length !== COUNT) throw new Error(`khmebis-turniri: ${PHRASES.length} phrases`);
const PAGES = Math.ceil(PHRASES.length / PER_PAGE);

// ---------- the phrases, three chants a page ----------
const chantBox = c => `<div class="tu-ch">
  <div class="tu-head"><span class="tu-no">${c.no}</span><div class="tu-t"><b>${esc(c.title)}</b><span>${esc(c.where)} · ${esc(c.ref)}</span></div></div>
  ${c.voices.map((v, k) => `<div class="tu-v"><span class="tu-tag" style="background:${VOICES[k].color}"><b>${VOICES[k].roman}</b><small>${esc(noteName(v[0].midi))}</small></span>${staff(c.abc[k])}</div>`).join('')}
</div>`;

const phrasePage = p => page(`<div class="tu-mHead"><span class="aso">${aso(title)}</span><b>ფრაზები ${p * PER_PAGE + 1}–${Math.min(PHRASES.length, (p + 1) * PER_PAGE)}</b><span class="tu-for">${icon('mic-vocal', { size: 4.2, color: C.wine, width: 2 })} მომღერლებისთვის</span></div>
<div class="tu-chs">${PHRASES.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(chantBox).join('')}</div>
<div class="tu-legend">ყოველ საგალობელს სამი ხმა აქვს, თითო ცალკე: ${VOICES.map(v => `<b style="color:${v.color}">${v.roman}</b> — ${v.name}`).join(', ')}. ფერად ნიშანზე — ხმის პირველი ნოტი. მღერე შენი ხმა მარტო, ნებისმიერ ტონში — როგორც მოგიხდება; 8 გასაღების ქვეშ — ოქტავით დაბლა.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · საგალობლების ფრაზები</div>`, 'tu-pP');

// ---------- the bracket: a column a round, a line a singer, the duels numbered ----------
const ROUND_NAMES = { 16: ['1/8 ფინალი', 'მეოთხედფინალი', 'ნახევარფინალი', 'ფინალი'], 8: ['მეოთხედფინალი', 'ნახევარფინალი', 'ფინალი'] };
const bracket = n => {
  const rounds = Math.log2(n);
  const W = 186, H = 224, top = 9;
  const champ = 34;
  const colW = (W - champ) / rounds;
  let duel = 0;
  const out = [];
  ROUND_NAMES[n].forEach((name, r) => out.push(`<text x="${r * colW + 1}" y="5" class="tu-bH">${name}</text>`));
  out.push(`<text x="${W - champ + 3}" y="5" class="tu-bH">ჩემპიონი</text>`);
  for (let r = 0; r < rounds; r++) {
    const count = n >> r;
    const x = r * colW;
    for (let k = 0; k < count; k += 2) {
      const y1 = top + ((k + 0.5) * H) / count, y2 = top + ((k + 1.5) * H) / count, ym = (y1 + y2) / 2;
      const xe = x + colW - 7;
      duel++;
      out.push(`<line x1="${x + 1}" x2="${xe}" y1="${y1}" y2="${y1}" class="tu-name"/><line x1="${x + 1}" x2="${xe}" y1="${y2}" y2="${y2}" class="tu-name"/>`);
      if (r === 0) out.push(`<text x="${x + 1}" y="${y1 - 1.4}" class="tu-ab">ა</text><text x="${x + 1}" y="${y2 - 1.4}" class="tu-ab b">ბ</text>`);
      out.push(`<path d="M${xe} ${y1} H ${xe + 3} V ${y2} H ${xe}" class="tu-join"/><line x1="${xe + 3}" x2="${x + colW + 1}" y1="${ym}" y2="${ym}" class="tu-join"/>`);
      out.push(`<circle cx="${xe + 3}" cy="${ym}" r="2.6" class="tu-duel"/><text x="${xe + 3}" y="${ym + 1.05}" class="tu-dN">${duel}</text>`);
      out.push(`<text x="${xe - 1}" y="${ym + 1.2}" class="tu-chant">№ ___</text>`);
    }
  }
  const yC = top + H / 2;
  out.push(`<line x1="${W - champ + 1}" x2="${W - 1}" y1="${yC}" y2="${yC}" class="tu-name champ"/>`);
  out.push(iconIn('trophy', { x: W - champ / 2 - 9, y: yC - 24, size: 18, color: C.gold, width: 1.5 }));
  return `<svg viewBox="0 0 ${W} ${top + H + 2}" width="${W}mm" height="${top + H + 2}mm" class="tu-bracket">${out.join('')}</svg>`;
};
const bracketPage = n => page(`<div class="tu-bWrap">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ბადე · ${n} მომღერალი</b><span class="rs-date">თარიღი <i></i></span></div>
  <p class="rs-scHint">მარცხნივ — მომღერლების სახელები (წილისყრით). ყოველ ორთაბრძოლაში ორივე ერთსა და იმავე ფრაზას მღერის ერთსა და იმავე ხმაზე; „№“ — საგალობლის ნომერი. გამარჯვებულის სახელი მარჯვნივ, შემდეგ ხაზზე გადადის.${n === 8 ? ' 16 მომღერლის ბადე — ზურგზე.' : ''}</p>
  ${bracket(n)}
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ტურნირის ბადე (${n})</div>`, 'tu-bP');

// ---------- the voting cards: ა on one side, ბ on the other ----------
const voteCard = v => `<div class="card tu-vote" style="--c:${v.color}"><div class="tu-vFrame"></div>
<div class="tu-vMid"><span class="tu-vL">${v.letter}</span><span class="tu-vW">${v.word} მომღერალი</span></div>
<div class="tu-vFoot">${icon('mic-vocal', { size: 4.2, color: v.color, width: 2 })}<span>${esc(title)}</span></div></div>`;
const votes = Array.from({ length: 9 }, () => voteCard(A));
const votesBack = Array.from({ length: 9 }, () => voteCard(B));

// ---------- the score sheet (by points): a row a singer, three rounds ----------
const scorePage = page(`<div class="tu-sc">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">პატარა კლასისთვის, როგორც აპში: სამი რაუნდი, ყველა მღერის. „№“ — საგალობლის ნომერი, „ხმა“ — I, II ან III, „ქულა“ — ჟიურის 0–3 (ზეპირად ნამღერს +1).</p>
  <table class="tu-tab">
    <tr><th rowspan="2" class="nm">მომღერალი</th>${[1, 2, 3].map(r => `<th colspan="3">რაუნდი ${r}</th>`).join('')}<th rowspan="2" class="s">ჯამი</th></tr>
    <tr>${[1, 2, 3].map(() => '<th class="n">№</th><th class="n">ხმა</th><th class="p">ქულა</th>').join('')}</tr>
    ${Array.from({ length: SCORE_ROWS }, () => `<tr><td class="nm"></td>${[1, 2, 3].map(() => '<td class="n"></td><td class="n"></td><td class="p"></td>').join('')}<td class="s"></td></tr>`).join('')}
  </table>
  <div class="rs-win">გამარჯვებული: <i></i></div>
  <div class="rs-remind box">
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 1.9 })}<span><b>3</b> — ყველა ნოტი თავის ადგილზე, თანაბრად, ბოლომდე.</span></div>
    <div>${icon('music', { size: 5, color: C.wine, width: 1.9 })}<span><b>2</b> — ერთი-ორი ნოტი აცდა, მაგრამ ფრაზა იცნობა.</span></div>
    <div>${icon('audio-lines', { size: 5, color: C.goldDark, width: 1.9 })}<span><b>1</b> — ბევრი შეცდომა, მაგრამ ბოლომდე იმღერა.</span></div>
    <div>${icon('pause', { size: 5, color: C.muted, width: 1.9 })}<span><b>0</b> — შეჩერდა ან სხვა ფრაზა იმღერა. მეორე ცდა — ერთხელ.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'tu-sP');

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">სიმღერის ტურნირი! ორი მომღერალი ერთსა და იმავე საგალობლის ფრაზას მღერის ერთსა და იმავე ხმაზე — ჯერ ერთი, მერე მეორე. კლასი ხმის ბარათებს სწევს: „ა“ თუ „ბ“? ვინც უკეთ იმღერა, ბადეზე წინ მიდის — სანამ ერთი ჩემპიონი არ დარჩება. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="tu-ex box">
    <h3>ასე მიდის ორთაბრძოლა</h3>
    <div class="tu-steps">
      <div>${step('users', 'სახელები ბადეზე წილისყრით იწერება; დანარჩენ კლასს ხმის ბარათები ურიგდება.')}${step('music', 'წამყვანი ირჩევს საგალობელს და ხმას — I, II ან III; ორივე მომღერალს ერთი და იგივე ფრაზა ხვდება.')}${step('mic-vocal', 'ჯერ „ა“ მღერის, მერე „ბ“ — მარტო, ფურცლიდან, ნებისმიერ ტონში.')}</div>
      <div>${step('hand', '„ერთი, ორი, სამი!“ — კლასი ერთად სწევს ბარათს: „ა“ ან „ბ“.')}${step('trending-up', 'მეტი ბარათი — წინ მიდის, ბადის შემდეგ ხაზზე.')}${step('trophy', 'ფინალში ორ-ორ ფრაზას მღერიან. გამარჯვებული — ტურნირის ჩემპიონი!', '#2f7d4f')}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>საგალობლის ფრაზა, სამი ხმა ცალ-ცალკე</td><td>${PHRASES.length}</td><td>${no('p1')}–${no(`p${Math.ceil(PAGES / 2)}`)}</td></tr>
        <tr><td>ტურნირის ბადე: 8 / 16 მომღერალი</td><td>2</td><td>${no('bracket')}</td></tr>
        <tr><td>ხმის ბარათი (ა / ბ)</td><td>9</td><td>${no('votes')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
      </table>
      <p class="tu-mix">წირვის, მწუხრისა და ცისკრის ცნობილი საგალობლები, გელათის სკოლის I და IX ტომებიდან — იგივე, რაც აპის თამაშებში.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ფრაზები (${no('p1')}–${no(`p${Math.ceil(PAGES / 2)}`)}) — მომღერლებს და წამყვანს; ბადე (${no('bracket')}) — ერთი ტურნირზე.</li>
        <li>ხმის ბარათები (${no('votes')}) — ჭრის ნიშნებზე დაჭერით; კლასს რამდენიც სჭირდება (ცხრა ფურცელზე).</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „SingStar“-ის იდეით (სიმღერის შეჯიბრი). ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', '4–16 მომღერალი და წამყვანი (მასწავლებელი). დანარჩენი კლასი ჟიურია: თითოს ხმის ბარათი — ერთ მხარეს „ა“, მეორეზე „ბ“.'],
  ['ფრაზები', `ფურცლებზე ${PHRASES.length} ცნობილი საგალობლის პირველი ფრაზაა, სამივე ხმა ცალ-ცალკე. მომღერალი თავის ხმას მარტო მღერის, ნებისმიერ ტონში; ფერად ნიშანზე პირველი ნოტია — თუ წამყვანს ფორტეპიანო ან სალამური აქვს.`],
  ['ბადე', 'სახელები წილისყრით ჩაწერეთ ბადის მარცხენა სვეტში. 8 მომღერალი — წინა მხარე, 16 — ზურგი. თუ ნაკლები ხართ, ზოგი პირველ რაუნდს გამოტოვებს (წილისყრით).'],
  ['ორთაბრძოლა', 'ორივე ერთსა და იმავე ფრაზას მღერის ერთსა და იმავე ხმაზე, რიგრიგობით: ჯერ „ა“ (ზედა ხაზი), მერე „ბ“. საგალობელს და ხმას წამყვანი ირჩევს — ან კამათელი: 1–2 → I, 3–4 → II, 5–6 → III.'],
  ['ხმის მიცემა', 'წამყვანი ითვლის „ერთი, ორი, სამი!“ და მთელი ჟიური ერთად სწევს ბარათს. მეტი „ა“ — იგებს ზედა, მეტი „ბ“ — ქვედა. ფრე — ორივე კიდევ ერთხელ, ახალი ფრაზით.'],
  ['რას აფასებს ჟიური', 'ნოტები თავის ადგილზეა? რიტმი თანაბარია? ბოლომდე, სუფთად იმღერა? ბარათი იმას, ვინც უკეთ იმღერა — არა მეგობარს!'],
  ['ფინალი', 'ფინალში თითო ორ ფრაზას მღერის: ერთს თვითონ ირჩევს, მეორეს — მოწინააღმდეგე. გამარჯვებული ტურნირის ჩემპიონია.'],
  ['ქულებით', 'პატარა კლასში, როგორც აპში: სამი რაუნდი, ყველა მღერის, ჟიური 0–3 ქულას აძლევს (ზეპირად ნამღერს +1). იგებს მეტი ქულის მომღერალი — ფურცელი ბოლოშია.'],
  ['უფრო რთულად', 'ფურცლის გარეშე, ზეპირად; ან მომღერალი ხმას ვერ ირჩევს — კამათელი წყვეტს.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ხმების ტურნირი“ სიმღერის შეჯიბრია: ყველა ერთსა და იმავე ფრაზას მღერის, და კლასი ისმენს, ვინ რამდენად ზუსტად. ეს გამბედაობის თამაშიცაა — მარტო სიმღერა კლასის წინ არაა ადვილი, ამიტომ ყველა მომღერალს ტაში ეკუთვნის, ვინც არ უნდა მოიგოს.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ტელეფონი ფრაზას შენს ხმაზე გიკრავს, შენ მღერი და ის ითვლის, რამდენი ნოტი იმღერე სწორად — ონლაინ ყველა თავის ტელეფონზე, ან ერთი ტელეფონით, რომელიც ხელიდან ხელში გადადის. sagandzureli.ge → თამაშები → ხმების ტურნირი.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(1.1);

export const css = `${coverCss}${musicCss}${partsCss}
.tu-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.tu-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.tu-mHead b{font-size:13pt;color:var(--wine)}
.tu-for{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.tu-chs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:22mm;display:grid;grid-template-rows:repeat(${PER_PAGE},1fr);gap:4mm}
.tu-ch{border:.3mm solid var(--line);border-radius:2.2mm;padding:3mm 4.5mm 2mm;background:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.tu-head{display:flex;gap:3mm;align-items:center}
.tu-no{flex:none;width:8mm;height:8mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:12pt;display:flex;align-items:center;justify-content:center}
.tu-t{min-width:0;flex:1;display:flex;align-items:baseline;gap:3mm;line-height:1.2}
.tu-t b{font-size:13pt;color:var(--brown)}
.tu-t span{font-size:9.5pt;color:var(--muted)}
.tu-v{display:flex;align-items:center;gap:3mm;min-height:0}
.tu-tag{flex:none;width:11mm;border-radius:2mm;color:#fff;display:flex;flex-direction:column;align-items:center;padding:1mm 0 .8mm;line-height:1.1}
.tu-tag b{font-family:'SansKa',sans-serif;font-weight:900;font-size:11pt}
.tu-tag small{font-size:8.6pt;font-weight:700}
.tu-v .abc{flex:1;min-width:0}
.tu-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.tu-bWrap{position:absolute;inset:12mm 12mm 12mm}
.tu-bracket{display:block;margin-top:2mm;overflow:visible}
.tu-bH{font-family:'SerifKa',serif;font-size:3.6px;font-weight:700;fill:${C.wine}}
.tu-name{stroke:#9d8a70;stroke-width:.3}
.tu-name.champ{stroke:${C.gold};stroke-width:.7}
.tu-join{fill:none;stroke:#c8b493;stroke-width:.3}
.tu-ab{font-family:'SansKa',sans-serif;font-size:3px;font-weight:900;fill:${C.wine}}
.tu-ab.b{fill:#2b5f8a}
.tu-duel{fill:${C.cream};stroke:${C.gold};stroke-width:.3}
.tu-dN{font-family:'SansKa',sans-serif;font-size:2.8px;font-weight:900;fill:${C.wine};text-anchor:middle}
.tu-chant{font-family:'SerifKa',serif;font-size:2.7px;fill:#8a7a66;text-anchor:end}
.tu-vote{background:#fff}
.tu-vFrame{position:absolute;inset:3mm;border:.8mm solid var(--c);border-radius:2.6mm}
.tu-vMid{position:absolute;left:0;right:0;top:12mm;display:flex;flex-direction:column;align-items:center;gap:3mm}
.tu-vL{width:40mm;height:40mm;border-radius:50%;background:var(--c);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:66pt;line-height:1;padding-bottom:3mm;box-sizing:border-box}
.tu-vW{font-size:12pt;font-weight:800;color:var(--c)}
.tu-vFoot{position:absolute;left:6mm;right:6mm;bottom:6mm;display:flex;align-items:center;justify-content:center;gap:1.4mm;font-size:8.6pt;color:var(--muted)}
.tu-sc{position:absolute;inset:12mm 12mm 12mm}
table.tu-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.tu-tab th,.tu-tab td{border:.25mm solid #bba98f;text-align:center;padding:0}
.tu-tab th{background:var(--parch);color:var(--wine);font-size:9pt;height:6.5mm}
.tu-tab td{height:12.4mm}
.tu-tab .nm{width:40mm}
.tu-tab td.nm{background:#fff}
.tu-tab .n{width:10mm}
.tu-tab .p{width:13mm;background:#fdfaf3}
.tu-tab .s{width:15mm}
.tu-tab td.s{background:#fbf6ec;border-left:.6mm solid var(--wine)}
.tu-ex{margin:0 0 5mm;padding:4mm 5mm}
.tu-ex h3{margin:0 0 3mm}
.tu-steps{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.tu-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(PAGES / 2); s++) {
  SHEETS.push({ key: `p${s + 1}`, front: phrasePage(s * 2), ...(s * 2 + 1 < PAGES ? { back: phrasePage(s * 2 + 1) } : {}) });
}
SHEETS.push(
  { key: 'bracket', front: bracketPage(8), back: bracketPage(16) },
  { key: 'votes', front: cardSheet(votes, { label: `${title} · ხმის ბარათები — „ა“` }), back: cardSheet(votesBack, { back: true, label: `${title} · ხმის ბარათები — „ბ“` }) },
  { key: 'score', front: scorePage, back: scorePage },
);
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
