// „ნუ იტყვი!“ on paper (2026-11-01, like Taboo): the app's 180 cards (`data/tabuCards.ts`, twelve themes) four by four on a
// sheet — the word in its theme's band, the five words the explainer may not say under it — twelve blank cards for the class's
// own words, a score sheet (two games, one a side) and the rules. The settings are the app's own (`utils/tabu.ts`: a turn of
// 60/90/120 s, 10/20/30 points, a skip −1 or 0, teams named after instruments).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/tabuCards';
import * as __d1 from '../../utils/tabu';
import * as __d2 from '../../utils/amikhseni';

const { TABU_THEMES, TABU_SECONDS, TABU_TARGETS, TEAM_NAMES } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'nu-itqvi';
export const title = 'ნუ იტყვი!';
const TAG = 'ცოცხალი · უტელეფონო';
const META = '4–30 მოთამაშე, 2–6 გუნდი · 9 წლიდან · 20–40 წუთი';
// the app's icons (pages/games/tabu/parts.tsx) as lucide names
const ICONS = {
  supra: 'utensils-crossed', buneba: 'paw-print', istoria: 'shield', literatura: 'book-open', musika: 'music', galoba: 'audio-lines',
  kutkhe: 'map-pin', qopa: 'house', sporti: 'trophy', khelovneba: 'palette', skola: 'graduation-cap', samosi: 'scissors',
};
const CARDS = TABU_THEMES.flatMap(t => t.cards.map(c => ({ ...c, theme: t })));
const PER_SHEET = 16;
const SHEETS_OF_CARDS = Math.ceil(CARDS.length / PER_SHEET);
const BLANKS = SHEETS_OF_CARDS * PER_SHEET - CARDS.length;
const W = 47, H = 66;

// ---------- cards ----------
const cardFront = c => `<div class="ni-card"><div class="ni-frame" style="border-color:${c.theme.color}"></div>
<div class="ni-band" style="background:${c.theme.color}">${icon(ICONS[c.theme.id], { size: 3.4, color: '#fff', width: 2.2, cls: 'ni-ic' })}<div class="fit ni-w"><span>${esc(c.w)}</span></div></div>
<div class="ni-no" style="color:${c.theme.color}">${icon('ban', { size: 2.6, color: c.theme.color, width: 2.4 })}ნუ იტყვი</div>
<div class="ni-list">${c.no.map(w => `<div class="fit ni-x"><span>${esc(w)}</span></div>`).join('')}</div></div>`;
const blankFront = () => `<div class="ni-card"><div class="ni-frame" style="border-color:${C.brown}"></div>
<div class="ni-band ni-blankBand"><span>შენი სიტყვა</span><i></i></div>
<div class="ni-no" style="color:${C.brown}">${icon('ban', { size: 2.6, color: C.brown, width: 2.4 })}ნუ იტყვი</div>
<div class="ni-list">${Array.from({ length: 5 }, () => '<div class="ni-line"></div>').join('')}</div></div>`;
const cardBack = t => `<div class="ni-card ni-back"><div class="ni-frame"></div>
<div class="ni-ring">${icon('message-square-off', { size: 9, color: C.gold, width: 1.4 })}</div>
<div class="ni-mark aso">${aso(title)}</div><div class="ni-sub">${esc(SERIES)}</div>
<div class="ni-cat" style="background:${t ? t.color : C.brown}">${t ? icon(ICONS[t.id], { size: 2.8, color: '#fff', width: 2.2 }) : ''}<span>${esc(t ? t.label : 'შენი ბარათი')}</span></div></div>`;

const cardSheets = Array.from({ length: SHEETS_OF_CARDS }, (_, s) => {
  const slots = Array.from({ length: PER_SHEET }, (_, i) => CARDS[s * PER_SHEET + i] ?? null);
  const themes = [...new Set(slots.filter(Boolean).map(c => c.theme.label))].join(', ');
  const label = `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ${themes}${slots.some(c => !c) ? ' და ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(slots.map(c => (c ? cardFront(c) : blankFront())), { cols: 4, rows: 4, w: W, h: H, label, cls: 'gsheet ni-sheet' }),
    back: gridSheet(slots.map(c => cardBack(c?.theme)), { cols: 4, rows: 4, w: W, h: H, back: true, label: `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ზურგი`, cls: 'gsheet ni-sheet' }),
  };
});

// ---------- the score sheet: twelve rounds, six teams; the same on the back for the next game ----------
const ROUNDS = 12;
const secs = s => (s === 60 ? '1 წთ' : s === 120 ? '2 წთ' : `${s} წმ`);
const scorePage = page(`<div class="ni-sc">
  <div class="ni-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="ni-date">თარიღი <i></i> კლასი <i></i></span></div>
  <div class="ni-set">
    <span><b>სვლა:</b> ${TABU_SECONDS.map(s => `<span class="chk"></span>${secs(s)}`).join(' ')}</span>
    <span><b>მიზანი:</b> ${TABU_TARGETS.map(t => `<span class="chk"></span>${t}`).join(' ')} ქულა</span>
    <span><b>გამოტოვება:</b> <span class="chk"></span>−1 <span class="chk"></span>0</span>
  </div>
  <table class="ni-tab">
    <tr><th rowspan="2" class="r">წრე</th>${TEAM_NAMES.map(n => `<th colspan="2">${esc(n)}<i></i></th>`).join('')}</tr>
    <tr>${TEAM_NAMES.map(() => '<th class="s">სვლა</th><th class="s">სულ</th>').join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td>${TEAM_NAMES.map(() => '<td></td><td class="tot"></td>').join('')}</tr>`).join('')}
  </table>
  <div class="ni-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="ni-remind box">
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 2.4 })}<span><b>გამოიცნეს</b> — ბარათი მარჯვნივ, +1.</span></div>
    <div>${icon('bell-ring', { size: 5, color: '#b23a48', width: 2 })}<span><b>აკრძალული სიტყვა თქვა</b> — „ზარი!“, ბარათი მეორე გუნდს, −1.</span></div>
    <div>${icon('skip-forward', { size: 5, color: C.wine, width: 2 })}<span><b>გამოტოვება</b> — ბარათი მარცხნივ, −1 ან 0.</span></div>
    <div>${icon('trophy', { size: 5, color: C.goldDark, width: 1.8 })}<span><b>მოგება</b> — წრის ბოლოს, როცა ვინმემ მიზანს მიაღწია.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'ni-scP');

// ---------- the cover and the rules ----------
const EXAMPLE = CARDS.find(c => c.w === 'ხინკალი') ?? CARDS[0];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ახსენი სიტყვა ისე, რომ ხუთი აკრძალული სიტყვა არ თქვა — სწორედ ის ხუთი, რომელიც პირველად მოგივა თავში! მეორე გუნდი უყურებს და აკრძალულ სიტყვაზე „ზარი!“ იძახის. ${CARDS.length} ბარათი, თორმეტი თემა: სუფრიდან სპორტამდე, ზღაპრიდან გალობამდე.<br><b>${META}</b></div>
  <div class="ni-ex box">
    <div class="ni-exCard">${cardFront(EXAMPLE)}</div>
    <div class="ni-exR">
      <h3>ასე მიდის სვლა</h3>
      <div class="ni-step">${icon('hourglass', { size: 6, color: C.wine, width: 1.7 })}<span>ამხსნელი იღებს ბარათს, მეორე გუნდიდან ერთი — „მეთვალყურე“ — უკან უდგას და ქვიშის საათს აბრუნებს.</span></div>
      <div class="ni-step">${icon('messages-square', { size: 6, color: C.wine, width: 1.7 })}<span>„${esc(EXAMPLE.w)}“ უნდა ახსნას ისე, რომ არ თქვას: ${EXAMPLE.no.map(w => `„${esc(w)}“`).join(', ')} — არც თვითონ სიტყვა და მისი ნაწილი.</span></div>
      <div class="ni-step">${icon('bell-ring', { size: 6, color: '#b23a48', width: 1.8 })}<span>თქვა აკრძალული? მეთვალყურე: „ზარი!“ — ბარათი მეორე გუნდს, −1.</span></div>
      <div class="ni-step">${icon('check', { size: 6, color: '#2f7d4f', width: 2.4 })}<span>გამოიცნეს — +1 და შემდეგი ბარათი, სანამ დრო არ ამოიწურება.</span></div>
    </div>
  </div>
  <div class="ni-themes">${TABU_THEMES.map(t => `<span class="ni-theme" style="border-color:${t.color}"><i style="background:${t.color}">${icon(ICONS[t.id], { size: 3.2, color: '#fff', width: 2.2 })}</i>${esc(t.label)} · ${t.cards.length}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ბარათები, 5 აკრძალული სიტყვით</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>ცარიელი ბარათები — თქვენი სიტყვებისთვის</td><td>${BLANKS}</td><td>${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>ქვიშის საათი 1 წთ (ან საათი წამებით)</td><td>1</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი ${W}×${H} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}) — 250–300 გ მუყაოზე, ჭრა კიდეებზე მონიშნული ხაზებით; ზურგის ზოლი თემას აჩვენებს.</li>
        <li>ქულების ფურცელი (${no('score')}) — ჩვეულებრივზე, რამდენიც გინდათ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Taboo“-ს იდეით; ბარათები საგანძურის სკოლისთვის Claude-მა დაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში ორი მოთამაშე მაინც; გუნდები წრეზე სხდებიან ისე, რომ მეზობლები სხვადასხვა გუნდიდან იყვნენ. სახელები: ${TEAM_NAMES.join(', ')}. ფურცელზე შეთანხმდით: სვლის დრო (${TABU_SECONDS.map(secs).join(', ')}), მიზანი (${TABU_TARGETS.join(', ')} ქულა) და ღირს თუ არა გამოტოვება ქულა.`],
  ['ბარათები', `აურიეთ ${CARDS.length} ბარათი და დადეთ დასტად, პირქვე. მხოლოდ ზოგიერთი თემით გინდათ? ზურგის ფერადი ზოლით ამოარჩიეთ. ცარიელ ბარათებზე თქვენი სიტყვები ჩაწერეთ — ზედა ზოლში სიტყვა, ქვემოთ ხუთი, რომელიც ყველაზე მეტად „ეხმარება“.`],
  ['სვლა', 'გუნდი ირჩევს ამხსნელს (ყოველ ჯერზე სხვას). მეზობელი გუნდიდან ერთი მეთვალყურეა: ამხსნელს უკან დგას, ბარათებს უყურებს და ქვიშის საათს აბრუნებს.'],
  ['ახსნა', 'ამხსნელი იღებს ზედა ბარათს და თავის გუნდს ზოლში დაწერილ სიტყვას უხსნის. გამოიცნეს — ბარათი მარჯვნივ დებს და შემდეგს იღებს. გუნდს რამდენიც უნდა, იმდენი პასუხის თქმა შეუძლია.'],
  ['ნუ იტყვი!', 'არ შეიძლება: ზოლში დაწერილი სიტყვა, მისი ნაწილი ან ერთძირიანი სიტყვა; ხუთივე აკრძალული სიტყვა (და მათი ნაწილიც); ჟესტი, ხმა, ასოების კარნახი, სხვა ენაზე თარგმნა. მეთვალყურე ასეთზე „ზარი!“-ს იძახის — ბარათი მეორე გუნდს გადაეცემა, −1.'],
  ['გამოტოვება', 'ვერ ხსნის? „გამოვტოვებ“ — ბარათი მარცხნივ, −1 (ან 0, თუ ასე შეთანხმდით).'],
  ['დრო გავიდა', 'როცა ქვიშა დაიცლება, მეთვალყურე ამბობს „დრო!“ — სვლა მთავრდება. ხელში დარჩენილი ბარათი არავის ეთვლება.'],
  ['ქულები', 'მარჯვენა გროვის ყოველი ბარათი +1, „ზარის“ ბარათი −1, მარცხენისა −1 ან 0. სვლის ქულა და ჯამი ფურცელზე იწერება, ბარათები დასტის ქვეშ ბრუნდება, სვლა შემდეგ გუნდზე გადადის.'],
  ['მოგება', 'წრის ბოლოს — როცა ყველა გუნდს თანაბრად უთამაშია — თუ ერთმა მაინც მიაღწია მიზანს, იგებს ყველაზე მეტი ქულის მქონე. ფრეა — კიდევ ერთი წრე.'],
  ['პატარებისთვის', 'აკრძალულია მხოლოდ პირველი სამი სიტყვა, ან „ზარი“ ქულას კი არ აკლებს, მხოლოდ ბარათს აბრუნებს. მარტოც შეიძლება: ერთი კითხულობს აკრძალულ სიტყვებს სათითაოდ, როგორც მინიშნებებს, დანარჩენები სიტყვას გამოიცნობენ.'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„ნუ იტყვი!“ სიტყვების თამაშია მთელი კლასისთვის: ამხსნელი თავის გუნდს სიტყვას უხსნის, ოღონდ ბარათზე ხუთი სიტყვაა, რომლის თქმაც არ შეიძლება — სწორედ ყველაზე ადვილი ხუთი. ამიტომ ყოველ ჯერზე ახალი გზა უნდა იპოვო.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="ni-more box"><b>აპშიც</b> იგივე თამაშია: ტელეფონი ამხსნელის ხელშია, ბარათს აჩვენებს, დროს და ქულებს თვითონ ითვლის; მარტოც შეგიძლია — დღეში ოცი ბარათი, აკრძალული სიტყვები მინიშნებებად — sagandzureli.ge → თამაშები → ნუ იტყვი!</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.ni-card{position:absolute;inset:0;overflow:hidden;background:var(--paper)}
.ni-frame{position:absolute;inset:1.6mm;border:.5mm solid;border-radius:2.2mm}
.ni-band{position:absolute;left:2.8mm;right:2.8mm;top:2.8mm;height:13mm;border-radius:1.4mm;display:flex;align-items:center;justify-content:center;padding:0 2mm 0 5.4mm;color:#fff}
.ni-band .ni-ic{position:absolute;left:1.6mm;top:1.4mm}
.ni-w{flex:1;min-width:0;text-align:center;font-family:SerifKa,serif;font-weight:800;font-size:13pt;line-height:1}
.ni-no{position:absolute;left:0;right:0;top:17.2mm;display:flex;align-items:center;justify-content:center;gap:.8mm;font-size:6.6pt;font-weight:700;letter-spacing:.04em}
.ni-list{position:absolute;left:3.6mm;right:3.6mm;top:21.4mm;bottom:3.4mm;display:flex;flex-direction:column}
.ni-x{flex:1;display:flex;align-items:center;justify-content:center;border-bottom:.2mm solid var(--line);font-weight:700;font-size:10pt;color:var(--brown)}
.ni-x:last-child{border-bottom:0}
.ni-x>span{display:inline-block}
.ni-blankBand{background:#fff;border:.3mm dashed #bba98f;color:var(--muted);flex-direction:column;justify-content:flex-end;padding:0 3mm 2mm;gap:1mm}
.ni-blankBand span{font-size:6.6pt;align-self:flex-start}
.ni-blankBand i{display:block;width:100%;border-bottom:.25mm solid #bba98f}
.ni-line{flex:1;border-bottom:.25mm solid #bba98f}
.ni-back{background:var(--wine)}
.ni-back .ni-frame{border-color:var(--gold);border-width:.3mm;inset:2.4mm;opacity:.9}
.ni-ring{position:absolute;left:50%;top:12mm;transform:translateX(-50%);width:17mm;height:17mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.ni-mark{position:absolute;left:0;right:0;top:34mm;text-align:center;font-size:11pt;color:#f0d9a0;letter-spacing:.05em}
.ni-sub{position:absolute;left:0;right:0;top:41mm;text-align:center;font-size:5.4pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.ni-cat{position:absolute;left:5mm;right:5mm;bottom:5.4mm;height:5.6mm;border-radius:2.8mm;display:flex;align-items:center;justify-content:center;gap:1mm;color:#fff;font-size:6pt;font-weight:700;white-space:nowrap;border:.25mm solid #f0d9a0;overflow:hidden;padding:0 1.5mm}
.ni-ex{display:grid;grid-template-columns:${W}mm 1fr;gap:7mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.ni-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.2mm;overflow:hidden}
.ni-exR h3{margin:0 0 3mm}
.ni-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.ni-step svg{flex:none;margin-top:.4mm}
.ni-themes{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.ni-theme{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.2mm .5mm .6mm;font-size:8.8pt;white-space:nowrap}
.ni-theme i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.ni-sc{position:absolute;inset:12mm 12mm 12mm}
.ni-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.ni-scHead .aso{font-size:15pt;color:var(--wine)}
.ni-scHead b{font-size:14pt;color:var(--wine)}
.ni-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.ni-date i{display:inline-block;width:24mm;border-bottom:.25mm solid #bba98f}
.ni-set{display:flex;justify-content:space-between;flex-wrap:wrap;gap:2mm 5mm;font-size:10pt;margin:4mm 0}
.ni-set .chk{margin:0 .8mm 0 2mm}
table.ni-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.ni-tab th,.ni-tab td{border:.25mm solid #bba98f;text-align:center}
.ni-tab th{background:var(--parch);color:var(--wine);font-size:10pt;padding:1.2mm .5mm}
.ni-tab th i{display:block;margin:1.5mm 2mm .3mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.ni-tab th.s{font-size:8pt;font-weight:400;color:var(--brown);background:var(--cream)}
.ni-tab th.r,.ni-tab td.r{width:11mm}
.ni-tab td{height:15.4mm;font-size:12pt}
.ni-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.ni-tab td.tot{background:#fbf6ec}
.ni-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.ni-win i{flex:1;border-bottom:.3mm solid #bba98f}
.ni-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.ni-remind>div{display:flex;gap:2mm;align-items:flex-start}
.ni-remind svg{flex:none}
.ni-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
