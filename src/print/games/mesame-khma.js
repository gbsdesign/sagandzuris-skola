// „მესამე ხმა“ on paper — the სამაგიდო variant of the app's trio game (2026-11-01): no phone, the class sings in threes. A trio
// draws the voice cards (I მთქმელი, II მოძახილი, III ბანი), the host gives each voice its first note and the three sing a
// well-known chant's opening together from its book notes (three voices under each other — music.mjs `abcScore`); the jury
// gives 0–2 for starting together, keeping one's own voice and ending together. Then the cards move on, so after three rounds
// everyone has sung every voice. The kit: the openings (the app's chant games' chants, melodies.mjs), nine voice cards (three
// trios), the jury sheet, the rules.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import { abcScore, lineOf, openingOf, until, staff, musicHead, musicScript, musicCss } from '../music.js';
import { CHANTS, app } from '../melodies.js';
import { partsCss, step } from '../kitParts.js';
import * as __d0 from '../../utils/pearls';

const { shuffle, mulberry32 } = app;
const { noteName } = ({ ...__d0 });

export const id = 'mesame-khma';
export const title = 'მესამე ხმა';
const TAG = 'მუსიკალური · უტელეფონო';
const META = '6–18 მოთამაშე, სამეულებად · 9 წლიდან · 20–40 წუთი';
const COUNT = 12;
const PER_PAGE = 2;
const TRIOS = 6;
const ROUNDS = 3;

const VOICES = [
  { roman: 'I', name: 'მთქმელი', what: 'ზედა ხმა', color: C.wine, text: 'საგალობელს იწყებს და წინ უძღვება.', tip: 'მკაფიოდ დაიწყე — სხვები მოგყვებიან.' },
  { roman: 'II', name: 'მოძახილი', what: 'შუა ხმა', color: C.goldDark, text: 'მთქმელს ეხმიანება და ჰარმონიას ავსებს.', tip: 'შენი ნოტი გეჭიროს, ნუ აჰყვები მთქმელს.' },
  { roman: 'III', name: 'ბანი', what: 'ქვედა ხმა', color: '#2b5f8a', text: 'საძირკველია: მასზე დგას ორი ზედა ხმა.', tip: 'მყარად და თანაბრად — სხვები გეყრდნობიან.' },
];
/** the jury's three marks: a short word on the sheet, the whole of it in the reminders under the boxes */
const CRITERIA = ['დაწყება', 'ხმა', 'ბოლო'];

// the openings: the top voice's first phrase (a real piece to sing, 8–16 notes), the lower voices under it; a chant whose
// lower voices hardly sing there is left out
const OPENINGS = shuffle(CHANTS, mulberry32(29)).flatMap(c => {
  const top = openingOf(lineOf(c.score, 0), { min: 8, max: 16 });
  const voices = [top.notes, until(lineOf(c.score, 1), top.end), until(lineOf(c.score, 2), top.end)];
  return voices.every(v => v.length >= 4) ? [{ ...c, voices }] : [];
}).slice(0, COUNT).map((c, i) => ({ ...c, no: i + 1, abc: abcScore(c.voices, { names: ['I', 'II', 'III'], gap: 24 }) }));
if (OPENINGS.length !== COUNT) throw new Error(`mesame-khma: ${OPENINGS.length} openings`);
const PAGES = Math.ceil(OPENINGS.length / PER_PAGE);

// ---------- the openings, two a page ----------
const chantBox = c => `<div class="mx-ch">
  <div class="mx-head"><span class="mx-no">${c.no}</span><div class="mx-t"><b>${esc(c.title)}</b><span>${esc(c.where)} · ${esc(c.ref)}</span></div></div>
  <div class="mx-first">${icon('music', { size: 4.2, color: C.wine, width: 2 })}<span>პირველი ნოტები:</span>${c.voices.map((v, i) => `<span class="mx-v"><i style="background:${VOICES[i].color}">${VOICES[i].roman}</i>${esc(noteName(v[0].midi))}</span>`).join('')}</div>
  ${staff(c.abc)}
</div>`;

const chantPage = p => page(`<div class="mx-mHead"><span class="aso">${aso(title)}</span><b>საგალობლები ${p * PER_PAGE + 1}–${Math.min(OPENINGS.length, (p + 1) * PER_PAGE)}</b><span class="mx-for">${icon('users', { size: 4.2, color: C.wine, width: 2 })} სამეულებისა და წამყვანისთვის</span></div>
<div class="mx-chs">${OPENINGS.slice(p * PER_PAGE, (p + 1) * PER_PAGE).map(chantBox).join('')}</div>
<div class="mx-legend">${VOICES.map(v => `<b style="color:${v.color}">${v.roman}</b> — ${v.name}`).join(', ')}; 8 გასაღების ქვეშ — ოქტავით დაბლა. ხმოვნით ან „ლა“-თი, დასაწყისიდან ბოლომდე, სამივე ერთად.</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · საგალობლების დასაწყისი სამ ხმაზე</div>`, 'mx-cP');

// ---------- the voice cards: three trios' worth ----------
/** three lanes, this voice's in its colour with a little tune on it */
const lanes = k => {
  const tunes = [[3.2, 1.6, 2.4, 0.8, 1.6], [2.4, 3.2, 1.6, 2.4, 1.6], [1.6, 1.6, 0.8, 1.6, 2.4]];
  return `<svg viewBox="0 0 46 30" width="46mm" height="30mm" style="display:block">${[0, 1, 2].map(i => {
    const y = 5 + i * 10;
    const on = i === k;
    const dots = tunes[i].map((d, j) => `<circle cx="${7 + j * 8}" cy="${(y + 2.4 - d).toFixed(1)}" r="${on ? 1.9 : 1.3}" fill="${on ? VOICES[i].color : '#d9c9ad'}"/>`).join('');
    return `<line x1="1" x2="45" y1="${y + 2.4}" y2="${y + 2.4}" stroke="${on ? VOICES[i].color : '#e8dcc8'}" stroke-width="${on ? 0.7 : 0.4}"/>${dots}
<text x="45" y="${y - 0.4}" text-anchor="end" font-size="3" font-weight="700" fill="${on ? VOICES[i].color : '#b9a993'}">${VOICES[i].roman}</text>`;
  }).join('')}</svg>`;
};
const voiceCard = k => {
  const v = VOICES[k];
  return `<div class="card mx-card"><div class="frame" style="border-color:${v.color}"></div>
<div class="mx-cTop"><span class="mx-roman" style="background:${v.color}">${v.roman}</span><div><b style="color:${v.color}">${v.name}</b><span>${v.what}</span></div></div>
<div class="mx-lanes">${lanes(k)}</div>
<div class="mx-cBody"><p class="mx-cText">${v.text}</p>
<p class="mx-tip">${icon('lightbulb', { size: 3.8, color: C.goldDark, width: 2 })}<span>${v.tip}</span></p></div>
<div class="mx-cFoot"><span>${esc(title)}</span><b style="color:${v.color}">${v.roman}</b></div></div>`;
};
const cardBack = `<div class="card mx-back"><div class="mx-backFrame"></div>
<div class="mx-backMid">${icon('layers', { size: 19, color: '#ecd393', width: 1.4 })}<span class="aso">${aso(title)}</span><span class="mx-backSub">ხმის ბარათი</span></div></div>`;
const cards = [0, 1, 2].flatMap(() => [0, 1, 2].map(voiceCard));

// ---------- the jury's sheet: a box a trio, three rounds × three marks ----------
const marks = '<span>0</span><span>1</span><span>2</span>';
const trioBox = `<div class="mx-trio">
  <div class="mx-tName">სამეული <i></i></div>
  <table class="mx-tab">
    <tr><th class="r">რაუნდი</th><th class="n">№</th>${CRITERIA.map(c => `<th>${c}</th>`).join('')}<th class="s">ჯამი</th></tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td><td class="n"></td>${CRITERIA.map(() => `<td class="m">${marks}</td>`).join('')}<td class="s"></td></tr>`).join('')}
  </table>
  <div class="mx-tSum">სულ <i></i></div>
</div>`;
const juryPage = page(`<div class="mx-jury">
  <div class="rs-scHead"><span class="aso">${aso(title)}</span><b>ჟიურის ფურცელი</b><span class="rs-date">თარიღი <i></i> კლასი <i></i></span></div>
  <p class="rs-scHint">ყოველ სამეულს ერთი ბლოკი. ყოველ გალობაზე სამ რამეს შემოხაზეთ 0, 1 ან 2; „№“ — საგალობლის ნომერი, „ჯამი“ — სამის ჯამი (ზეპირად ნამღერს +1).</p>
  <div class="mx-trios">${Array.from({ length: TRIOS }, () => trioBox).join('')}</div>
  <div class="rs-remind box">
    <div>${icon('users', { size: 5, color: C.wine, width: 1.9 })}<span><b>დაწყება</b> — სამივე ხმა ერთად შემოვიდა: 2; ერთი დაგვიანდა: 1; დაიბნენ: 0.</span></div>
    <div>${icon('audio-lines', { size: 5, color: C.wine, width: 1.9 })}<span><b>ხმა</b> — ყველამ თავისი ხმა იმღერა ბოლომდე და სხვისას არ აჰყვა.</span></div>
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 1.9 })}<span><b>ბოლო</b> — ბოლო ნოტი ერთად დაიჭირეს და ერთად მოხსნეს.</span></div>
    <div>${icon('trophy', { size: 5, color: C.goldDark, width: 1.9 })}<span><b>მოგება</b> — სამი რაუნდის მერე მეტი ქულა; ფრე — მეოთხე საგალობელი.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ჟიურის ფურცელი</div>`, 'mx-jP');

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ქართული გალობა სამხმიანია. სამეული გამოდის, თითოს ხელში ხმის ბარათი — I, II ან III — და ცნობილი საგალობლის დასაწყისს ერთად გალობენ წიგნის ნოტებით. ჟიური აფასებს, რამდენად ერთად და სუფთად იგალობეს; მერე ხმები იცვლება, სანამ ყველა სამივე ხმას არ იმღერებს. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="mx-ex box">
    <h3>ასე მიდის რაუნდი</h3>
    <div class="mx-steps">
      <div>${step('users', 'სამეული გამოდის; თითოს ხმის ბარათი აქვს: I მთქმელი, II მოძახილი, III ბანი.')}${step('music', 'წამყვანი ამბობს საგალობლის ნომერს და სამივე ხმას პირველ ნოტს აძლევს.')}${step('mic-vocal', '„3-2-1“ — სამივე ერთად იწყებს და დასაწყისს ბოლომდე გალობს.')}</div>
      <div>${step('scale', 'ჟიური სამ რამეს აფასებს, თითოს 0–2: დაწყება, ხმა და ბოლო — ერთად და სუფთად იყო?')}${step('refresh-cw', 'როცა ყველა სამეულმა იგალობა, ბარათები მარცხნივ გადადის — ყველას ახალი ხმა.')}${step('trophy', 'სამი რაუნდის მერე ყველამ სამივე ხმა იმღერა; იგებს მეტი ქულის სამეული.', '#2f7d4f')}</div>
    </div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>საგალობლის დასაწყისი სამ ხმაზე</td><td>${OPENINGS.length}</td><td>${no('ch1')}–${no(`ch${Math.ceil(PAGES / 2)}`)}</td></tr>
        <tr><td>ხმის ბარათი (სამი სამეულისთვის)</td><td>${cards.length}</td><td>${no('cards')}</td></tr>
        <tr><td>ჟიურის ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('jury')}</td></tr>
      </table>
      <p class="mx-mix">წირვის, მწუხრისა და ცისკრის ცნობილი საგალობლები, გელათის სკოლის I და IX ტომებიდან — იგივე, რაც აპის თამაშებში.</p>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>საგალობლები (${no('ch1')}–${no(`ch${Math.ceil(PAGES / 2)}`)}) — თითო სამეულს და წამყვანს.</li>
        <li>ხმის ბარათები (${no('cards')}) — ჭრის ნიშნებზე დაჭერით; ოთხ-ექვს სამეულს — ორჯერ. ჟიურის ფურცელი (${no('jury')}) — ერთი თამაშზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია აპის „Smule“ იდეით (სხვასთან ერთად მღერა). ნოტები საგანძურის სკოლის აპის წიგნებიდანაა (ციფრული ამოცნობით, შეიძლება შეცდომა შეგხვდეს). მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['ვინ თამაშობს', '6–18 მოთამაშე, სამ-სამად — სამეულებად. თუ არ იყოფა, მასწავლებელი ან ძლიერი მგალობელი ავსებს. ჟიური — მასწავლებელი, ან ის სამეული, ვინც ახლა არ გალობს (თათბირობენ და ერთ ქულას წერენ).'],
  ['ხმები', `თითო სამეულს სამი ხმის ბარათი: ${VOICES.map(v => `${v.roman} ${v.name}`).join(', ')}. პირქვე დაურიგეთ — ვის რა შეხვდება.`],
  ['საგალობელი', `რაუნდში ყველა სამეული ერთსა და იმავე დასაწყისს გალობს: წამყვანი ამბობს ნომერს (1–${OPENINGS.length}). ფურცელზე სამივე ხმაა, ერთმანეთის ქვეშ.`],
  ['პირველი ნოტები', 'წამყვანი თითო ხმას პირველ ნოტს აძლევს — ფორტეპიანოთი, სალამურით ან ხმით (ფურცელზე წერია, რომელი). შეიძლება უფრო დაბლა ან მაღლა, როგორც ხმებს მოუხდება — ოღონდ სამივეს ერთნაირად.'],
  ['გალობა', '„3-2-1“ და სამივე ერთად იწყებს. დასაწყისს ბოლომდე გალობენ, არ ჩერდებიან — ხმოვნით ან „ლა“-თი (ფურცელზე სიტყვები არაა).'],
  ['ჟიური', 'სამ რამეს აფასებს, თითოს 0, 1 ან 2: <b>დაწყება</b> — ერთად დაიწყეს? <b>ხმა</b> — ყველამ თავისი ხმა იმღერა ბოლომდე, სხვისას არ აჰყვა? <b>ბოლო</b> — ერთად დაასრულეს? ერთ გალობაზე — 6-მდე.'],
  ['ხმების ცვლა', 'როცა რაუნდში ყველა სამეულმა იგალობა, ბარათები მარცხნივ გადადის: I → II → III → I. შემდეგ რაუნდში — ახალი საგალობელი.'],
  ['მოგება', 'სამი რაუნდის მერე ყველამ სამივე ხმა იმღერა. იგებს ყველაზე მეტი ქულის სამეული; ფრეა — მეოთხე საგალობელი.'],
  ['უფრო რთულად', 'ფურცლის გარეშე, ზეპირად — +1 ქულა. ან ჟიური შუა გალობაში ამბობს „ბანი მარტო!“ — ორნი ჩუმდებიან და ბანი აგრძელებს, სანამ არ ეტყვიან „ყველა!“.'],
  ['დიდ კლასში', 'სამეულების ნაცვლად სამი ჯგუფი: თითო ჯგუფი — ერთი ხმა. რაუნდის მერე ჯგუფები ხმებს ცვლიან; ჟიური — მასწავლებელი.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„მესამე ხმა“ სამხმიანობის თამაშია: ქართულ გალობაში სამი ხმა ერთად ჟღერს და თითოეულს თავისი გზა აქვს. აქ ყველა სამივე ხმას სინჯავს — ჯერ ერთს, მერე მეორეს, ბოლოს მესამეს — და ისმენს, როგორ ერწყმის მისი ხმა დანარჩენ ორს.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="rs-more box"><b>აპშიც</b> არის: ტელეფონი ორ ხმას გალობს, მესამეს შენ — ყურსასმენით, ეკრანზე შენი ხმის ხაზით და ქულით; ბოლოს სამივე ხმას ერთად მოისმენ და კლასის ჩატში გაგზავნი. ონლაინ კლასთან, ან ერთი ტელეფონით, დინამიკით — sagandzureli.ge → თამაშები → მესამე ხმა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const head = musicHead();
export const script = musicScript(0.8);

export const css = `${coverCss}${musicCss}${partsCss}
.mx-mHead{position:absolute;left:10mm;right:10mm;top:8mm;display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.mx-mHead .aso{font-size:13pt;color:var(--wine);white-space:nowrap}
.mx-mHead b{font-size:13pt;color:var(--wine)}
.mx-for{margin-left:auto;display:flex;align-items:center;gap:1.4mm;font-size:9.5pt;color:var(--wine);font-weight:700}
.mx-chs{position:absolute;left:10mm;right:10mm;top:19mm;bottom:21mm;display:grid;grid-template-rows:repeat(${PER_PAGE},1fr);gap:5mm}
.mx-ch{border:.3mm solid var(--line);border-radius:2.2mm;padding:4mm 5mm 3mm;background:#fff;display:flex;flex-direction:column;overflow:hidden}
.mx-head{display:flex;gap:3mm;align-items:flex-start}
.mx-no{flex:none;width:9mm;height:9mm;border-radius:50%;background:var(--wine);color:#fff;font-weight:800;font-size:13pt;display:flex;align-items:center;justify-content:center}
.mx-t{min-width:0;flex:1;display:flex;flex-direction:column;line-height:1.2}
.mx-t b{font-size:13.5pt;color:var(--brown)}
.mx-t span{font-size:9.5pt;color:var(--muted);margin-top:.6mm}
.mx-first{display:flex;align-items:center;flex-wrap:wrap;gap:1.6mm 3mm;margin:3mm 0 1mm;font-size:10pt;color:var(--brown)}
.mx-first>span:first-of-type{font-weight:700;color:var(--wine)}
.mx-v{display:inline-flex;align-items:center;gap:1.2mm;font-weight:700}
.mx-v i{font-style:normal;display:inline-flex;min-width:6mm;height:5.2mm;padding:0 1.2mm;border-radius:2.6mm;color:#fff;font-size:8.5pt;font-weight:800;align-items:center;justify-content:center}
.mx-ch .abc{margin-top:auto;margin-bottom:auto}
.mx-legend{position:absolute;left:10mm;right:10mm;bottom:9mm;font-size:9pt;line-height:1.3;color:var(--brown);border-top:.2mm solid var(--line);padding-top:1.6mm}
.mx-card .mx-cTop{position:absolute;left:6mm;right:6mm;top:6.4mm;display:flex;align-items:center;gap:3mm}
.mx-roman{flex:none;width:15mm;height:15mm;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:17pt;letter-spacing:.02em}
.mx-cTop div{display:flex;flex-direction:column;line-height:1.15;min-width:0}
.mx-cTop b{font-size:16pt;font-weight:800}
.mx-cTop div span{font-size:9.5pt;color:var(--muted);margin-top:.8mm}
.mx-lanes{position:absolute;left:8.5mm;right:8.5mm;top:25mm;display:flex;justify-content:center}
.mx-cBody{position:absolute;left:6.4mm;right:6.4mm;top:55mm;bottom:11mm;display:flex;flex-direction:column;justify-content:center;gap:2.2mm}
.mx-cText{margin:0;font-size:9.4pt;line-height:1.3;color:var(--brown);text-align:center}
.mx-tip{margin:0;display:flex;gap:1.4mm;align-items:flex-start;font-size:8.6pt;line-height:1.28;color:#6b5a48;font-style:italic}
.mx-tip svg{flex:none;margin-top:.2mm}
.mx-cFoot{position:absolute;left:5.6mm;right:5.6mm;bottom:4.4mm;display:flex;justify-content:space-between;align-items:center;font-size:8.6pt;color:var(--muted)}
.mx-cFoot b{font-family:'SansKa',sans-serif;font-weight:900;font-size:10.5pt}
.mx-back{background:var(--wine);background-image:repeating-linear-gradient(45deg,rgba(236,211,147,.11) 0 2.2mm,transparent 2.2mm 4.8mm)}
.mx-backFrame{position:absolute;inset:3mm;border:.4mm solid #ecd393;border-radius:2.6mm;opacity:.85}
.mx-backMid{position:absolute;left:0;right:0;top:25mm;display:flex;flex-direction:column;align-items:center;gap:3.4mm}
.mx-backMid .aso{font-size:12pt;color:#ecd393;letter-spacing:.06em}
.mx-backSub{font-size:9pt;color:#ecd393;opacity:.85}
.mx-jury{position:absolute;inset:12mm 12mm 12mm}
.mx-trios{display:grid;grid-template-columns:1fr 1fr;gap:5mm 6mm;margin-bottom:5mm}
.mx-trio{border:.3mm solid var(--line);border-radius:2mm;padding:2.6mm 3mm 2.4mm;background:#fff}
.mx-tName,.mx-tSum{display:flex;gap:2mm;align-items:baseline;font-size:10.5pt;font-weight:700;color:var(--wine)}
.mx-tName i,.mx-tSum i{flex:1;border-bottom:.3mm solid #bba98f}
.mx-tSum{justify-content:flex-end;margin-top:2mm}
.mx-tSum i{flex:none;width:18mm}
table.mx-tab{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:2mm}
.mx-tab th,.mx-tab td{border:.25mm solid #bba98f;text-align:center;padding:0}
.mx-tab th{background:var(--parch);color:var(--wine);font-size:8.6pt;line-height:1.12;height:8mm}
.mx-tab td{height:12.5mm}
.mx-tab .r{width:12.5mm}
.mx-tab th.r{font-size:7.6pt}
.mx-tab td.r{font-weight:700;color:var(--wine);background:var(--cream);font-size:11pt}
.mx-tab .n{width:8.5mm}
.mx-tab .s{width:10.5mm}
.mx-tab td.m{white-space:nowrap}
.mx-tab td.m span{display:inline-flex;width:4.8mm;height:4.8mm;border-radius:50%;border:.25mm solid #bba98f;align-items:center;justify-content:center;font-size:7.8pt;color:#7d6e5d;margin:0 .2mm}
.mx-jP .rs-remind{font-size:9.2pt}
.mx-ex{margin:0 0 5mm;padding:4mm 5mm}
.mx-ex h3{margin:0 0 3mm}
.mx-steps{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.mx-mix{margin:2.4mm 0 0;font-size:9.3pt;line-height:1.35;color:var(--brown)}
`;

const SHEETS = [{ key: 'cover', back: rulesPage }];
for (let s = 0; s < Math.ceil(PAGES / 2); s++) {
  SHEETS.push({ key: `ch${s + 1}`, front: chantPage(s * 2), ...(s * 2 + 1 < PAGES ? { back: chantPage(s * 2 + 1) } : {}) });
}
SHEETS.push(
  { key: 'cards', front: cardSheet(cards, { label: `${title} · ხმის ბარათები — სამი სამეულისთვის` }), back: cardSheet(cards.map(() => cardBack), { back: true, label: `${title} · ხმის ბარათები — ზურგი` }) },
  { key: 'jury', front: juryPage, back: juryPage },
);
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
