// „პანტომიმა“ on paper (2026-11-01, like Charades): the app's 150 words (`data/pantomimaCards.ts`, eight themes) four by four
// on a sheet — the theme's verb in its band (დაუკარი, იცეკვე, გადაიქეცი…), the word big under it — ten blank cards for the
// class's own words, a score sheet (two games, one a side) and the rules: an actor shows the word to their team, or the card
// stands on the guesser's forehead and the team shows it. The settings are the app's own (`utils/pantomima.ts`: a turn of
// 60/90/120 s, 1–3 rounds, a guessed word a point, a skip nothing; teams named after instruments).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/pantomimaCards';
import * as __d1 from '../../utils/pantomima';
import * as __d2 from '../../utils/amikhseni';

const { PANTO_THEMES, PANTO_TURN_SECONDS, PANTO_ROUNDS, TEAM_NAMES } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'pantomima';
export const title = 'პანტომიმა';
const TAG = 'ცოცხალი · უტელეფონო';
const META = '4–30 მოთამაშე, 2–6 გუნდი · 6 წლიდან · 20–40 წუთი';
// the app's icons (pages/games/pantomima/parts.tsx) as lucide names
const ICONS = {
  sakravebi: 'guitar', tsekva: 'music', tskhovelebi: 'paw-print', sporti: 'trophy', kheloba: 'hammer', samosi: 'shirt',
  supra: 'utensils-crossed', zghapari: 'castle',
};
const CARDS = PANTO_THEMES.flatMap(t => t.words.map(w => ({ w, theme: t })));
const PER_SHEET = 16;
const SHEETS_OF_CARDS = Math.ceil(CARDS.length / PER_SHEET);
const BLANKS = SHEETS_OF_CARDS * PER_SHEET - CARDS.length;
const W = 47, H = 66;

// ---------- cards ----------
/** two words on two lines, so neither shrinks */
const wordLines = w => (w.includes(' ') ? w.split(' ') : [w]).map(x => `<div class="fit pm-w"><span>${esc(x)}</span></div>`).join('');
const cardFront = c => `<div class="pm-card"><div class="pm-frame" style="border-color:${c.theme.color}"></div>
<div class="pm-band" style="background:${c.theme.color}">${icon(ICONS[c.theme.id], { size: 3.4, color: '#fff', width: 2.2 })}<span>${esc(c.theme.verb)}</span></div>
<div class="pm-word">${wordLines(c.w)}</div>
<div class="pm-foot" style="color:${c.theme.color}">${icon('venetian-mask', { size: 2.8, color: c.theme.color, width: 2.2 })}<span>${esc(c.theme.label)}</span></div></div>`;
const blankFront = () => `<div class="pm-card"><div class="pm-frame" style="border-color:${C.brown}"></div>
<div class="pm-band pm-blankBand"><span>როგორ: დაუკარი, იცეკვე…</span><i></i></div>
<div class="pm-word pm-blankWord"><i></i></div>
<div class="pm-foot" style="color:${C.brown}">${icon('venetian-mask', { size: 2.8, color: C.brown, width: 2.2 })}<span>შენი სიტყვა</span></div></div>`;
const cardBack = t => `<div class="pm-card pm-back"><div class="pm-frame"></div>
<div class="pm-ring">${icon('venetian-mask', { size: 10, color: C.gold, width: 1.3 })}</div>
<div class="pm-mark aso">${aso(title)}</div><div class="pm-sub">${esc(SERIES)}</div>
<div class="pm-cat" style="background:${t ? t.color : C.brown}">${t ? icon(ICONS[t.id], { size: 2.8, color: '#fff', width: 2.2 }) : ''}<span>${esc(t ? t.label : 'შენი ბარათი')}</span></div></div>`;

const cardSheets = Array.from({ length: SHEETS_OF_CARDS }, (_, s) => {
  const slots = Array.from({ length: PER_SHEET }, (_, i) => CARDS[s * PER_SHEET + i] ?? null);
  const themes = [...new Set(slots.filter(Boolean).map(c => c.theme.label))].join(', ');
  const label = `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ${themes}${slots.some(c => !c) ? ' და ცარიელი ბარათები' : ''}`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(slots.map(c => (c ? cardFront(c) : blankFront())), { cols: 4, rows: 4, w: W, h: H, label, cls: 'gsheet pm-sheet' }),
    back: gridSheet(slots.map(c => cardBack(c?.theme)), { cols: 4, rows: 4, w: W, h: H, back: true, label: `${title} · ბარათები ${s + 1}/${SHEETS_OF_CARDS} — ზურგი`, cls: 'gsheet pm-sheet' }),
  };
});

// ---------- the score sheet: twelve rounds, six teams; the same on the back for the next game ----------
const ROUNDS = 12;
const secs = s => (s === 60 ? '1 წთ' : s === 120 ? '2 წთ' : `${s} წმ`);
const scorePage = page(`<div class="pm-sc">
  <div class="pm-scHead"><span class="aso">${aso(title)}</span><b>ქულების ფურცელი</b><span class="pm-date">თარიღი <i></i> კლასი <i></i></span></div>
  <div class="pm-set">
    <span><b>სვლა:</b> ${PANTO_TURN_SECONDS.map(s => `<span class="chk"></span>${secs(s)}`).join(' ')}</span>
    <span><b>წრე:</b> ${PANTO_ROUNDS.map(r => `<span class="chk"></span>${r}`).join(' ')} <span class="chk"></span><i class="pm-blank"></i></span>
    <span><b>ჩვენება:</b> <span class="chk"></span>უსიტყვოდ <span class="chk"></span>სიტყვებითაც</span>
    <span><b>ბარათი:</b> <span class="chk"></span>მსახიობს <span class="chk"></span>შუბლზე</span>
  </div>
  <table class="pm-tab">
    <tr><th rowspan="2" class="r">წრე</th>${TEAM_NAMES.map(n => `<th colspan="2">${esc(n)}<i></i></th>`).join('')}</tr>
    <tr>${TEAM_NAMES.map(() => '<th class="s">სვლა</th><th class="s">სულ</th>').join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="r">${r + 1}</td>${TEAM_NAMES.map(() => '<td></td><td class="tot"></td>').join('')}</tr>`).join('')}
  </table>
  <div class="pm-win">გამარჯვებული გუნდი: <i></i></div>
  <div class="pm-remind box">
    <div>${icon('check', { size: 5, color: '#2f7d4f', width: 2.4 })}<span><b>გამოიცნეს</b> — ბარათი მარჯვნივ, +1.</span></div>
    <div>${icon('skip-forward', { size: 5, color: C.wine, width: 2 })}<span><b>გამოტოვება</b> — ბარათი მარცხნივ, 0.</span></div>
    <div>${icon('volume-x', { size: 5, color: '#b23a48', width: 2 })}<span><b>„ხმა!“</b> — უსიტყვო თამაშში ხმა ამოიღო: ბარათი მარცხნივ, 0.</span></div>
    <div>${icon('hourglass', { size: 5, color: C.goldDark, width: 1.8 })}<span><b>„დრო!“</b> — ხელში დარჩენილი ბარათი დასტის ქვეშ.</span></div>
  </div>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულების ფურცელი</div>`, 'pm-scP');

// ---------- the cover and the rules ----------
const EXAMPLE = CARDS.find(c => c.w === 'ზღარბი') ?? CARDS[0];
const VERBS = PANTO_THEMES.map(t => t.verb.split(',')[0]).join(', ');
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">სიტყვა სხეულით უნდა აჩვენო — უსიტყვოდ, უხმოდ: დაუკარი ჩონგურზე, იცეკვე ხორუმი, გადაიქეცი ზღარბად, ჩაიცვი ჩოხა. გუნდი ცდილობს მიხვდეს, სანამ ქვიშა დაიცლება. ${CARDS.length} ბარათი, რვა თემა: საკრავებიდან ზღაპრებამდე.<br><b>${META}</b></div>
  <div class="pm-ex box">
    <div class="pm-exCard">${cardFront(EXAMPLE)}</div>
    <div class="pm-exR">
      <h3>ასე მიდის სვლა</h3>
      <div class="pm-step">${icon('eye-off', { size: 6, color: C.wine, width: 1.7 })}<span>მსახიობი იღებს ბარათს და ფარულად კითხულობს. მეზობელი გუნდიდან ერთი ქვიშის საათს აბრუნებს.</span></div>
      <div class="pm-step">${icon('hand', { size: 6, color: C.wine, width: 1.7 })}<span>ზოლი ამბობს, როგორ აჩვენოს: „${esc(EXAMPLE.theme.verb)}“ — ${esc(EXAMPLE.w)}! ოთხზე დგება, ცხვირით მიწას ყნოსავს და ბურთად იკეცება.</span></div>
      <div class="pm-step">${icon('check', { size: 6, color: '#2f7d4f', width: 2.4 })}<span>გუნდი პასუხებს იძახის. გამოიცნეს — +1 და შემდეგი ბარათი, სანამ დრო არ ამოიწურება.</span></div>
      <div class="pm-step">${icon('scan-face', { size: 6, color: C.wine, width: 1.7 })}<span>ან პირიქით: ბარათი გამომცნობს შუბლზე უჭირავს, მთელი გუნდი აჩვენებს.</span></div>
    </div>
  </div>
  <div class="pm-themes">${PANTO_THEMES.map(t => `<span class="pm-theme" style="border-color:${t.color}"><i style="background:${t.color}">${icon(ICONS[t.id], { size: 3.2, color: '#fff', width: 2.2 })}</i>${esc(t.label)} · ${t.words.length}</span>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ბარათები: როგორ აჩვენო და რა</td><td>${CARDS.length}</td><td>${no('cards1')}–${no(`cards${SHEETS_OF_CARDS}`)}</td></tr>
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
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Charades“-ის იდეით; სიტყვები საგანძურის სკოლისთვის Claude-მა შეარჩია და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['გუნდები', `2–6 გუნდი, თითოში ორი მოთამაშე მაინც. სახელები: ${TEAM_NAMES.join(', ')}. ფურცელზე შეთანხმდით: სვლის დრო (${PANTO_TURN_SECONDS.map(secs).join(', ')}), რამდენი წრე (${PANTO_ROUNDS.join(', ')} ან მეტი) და როგორ ვაჩვენებთ — უსიტყვოდ თუ სიტყვებითაც.`],
  ['ბარათები', `აურიეთ ${CARDS.length} ბარათი და დადეთ დასტად, პირქვე. მხოლოდ ზოგიერთი თემით გინდათ? ზურგის ფერადი ზოლით ამოარჩიეთ. ცარიელ ბარათებზე თქვენი სიტყვები ჩაწერეთ — ზოლში როგორ ვაჩვენოთ, შუაში სიტყვა.`],
  ['სვლა', 'გუნდი ირჩევს მსახიობს (ყოველ ჯერზე სხვას). მეზობელი გუნდიდან ერთი მეთვალყურეა: ქვიშის საათს აბრუნებს და მსახიობს უყურებს.'],
  ['ჩვენება', `მსახიობი იღებს ზედა ბარათს, ფარულად კითხულობს და თავის გუნდს სიტყვას სხეულით აჩვენებს. ზოლი ეუბნება, როგორ: ${VERBS}. გუნდს რამდენიც უნდა, იმდენი პასუხის თქმა შეუძლია; გამოიცნეს — ბარათი მარჯვნივ, შემდეგი ბარათი.`],
  ['რა არ შეიძლება', 'უსიტყვო თამაშში: სიტყვა, ხმა, ტუჩებით კარნახი, ასოები ჰაერში და ოთახის საგანზე მითითება. მეთვალყურე ასეთზე „ხმა!“-ს იძახის — ბარათი მარცხნივ, ქულის გარეშე.'],
  ['გამოტოვება', 'ძალიან ძნელია? „გამოვტოვებ“ — ბარათი მარცხნივ; გამოტოვება ქულას არ აკლებს.'],
  ['დრო გავიდა', 'როცა ქვიშა დაიცლება, მეთვალყურე ამბობს „დრო!“ — სვლა მთავრდება, ხელში დარჩენილი ბარათი დასტის ქვეშ ბრუნდება.'],
  ['ქულები', 'მარჯვენა გროვის ყოველი ბარათი +1. სვლის ქულა და ჯამი ფურცელზე იწერება, ბარათები დასტის ქვეშ ბრუნდება, სვლა შემდეგ გუნდზე გადადის.'],
  ['მოგება', 'შეთანხმებული წრეების ბოლოს იგებს ყველაზე მეტი ქულის მქონე გუნდი. ფრეა — თითო სვლა კიდევ.'],
  ['შუბლზე', 'მსახიობის ნაცვლად ბარათს გამომცნობი იღებს — არ უყურებს — და შუბლზე იდებს, სიტყვით გარეთ (ან ქუდის ქვეშ ამაგრებს). მთელი გუნდი ერთად აჩვენებს, გამომცნობი იცნობს: გამოიცნო — შემდეგი ბარათი, ვერა — გამოტოვება.'],
  ['პატარებისთვის', '„სიტყვებითაც“: ახსნა სიტყვებითაც შეიძლება, ოღონდ თვითონ სიტყვა და მისი ნაწილი არ ითქმის. ან გუნდების გარეშე: მთელი კლასი იცნობს, ვინც პირველი გამოიცნო, ის აჩვენებს შემდეგ ბარათს.'],
];
const SIGNS = [
  ['hand', 'რამდენი სიტყვაა', 'ამდენი თითი ზევით.'],
  ['list-ordered', 'მერამდენე სიტყვაა', 'ამდენი თითი მკლავზე.'],
  ['ear', 'ჟღერს როგორც…', 'ყურზე ხელი, მერე მსგავსი სიტყვა.'],
  ['thumbs-up', 'ახლოს ხართ!', 'ცერი ზევით: „კიდევ ცოტა!“'],
];

const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">„პანტომიმა“ მთელი კლასის თამაშია: მსახიობი თავის გუნდს სიტყვას სხეულით აჩვენებს — ჩონგურზე უკრავს, ხორუმს ცეკვავს, ზღარბად იქცევა. ლაპარაკი არ შეიძლება, ამიტომ მთავარია ხელები, სახე და ფანტაზია.</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="pm-signs box"><h3>ჩვეული ნიშნები</h3><div class="pm-signGrid">${SIGNS.map(([ic, h, t]) => `<div>${icon(ic, { size: 6, color: C.wine, width: 1.7 })}<span><b>${h}</b> — ${t}</span></div>`).join('')}</div></div>
  <div class="pm-more box"><b>აპშიც</b> იგივე თამაშია: ტელეფონი მსახიობის ხელშია ან შუბლზე — თავის დახრით „გამოიცანი“, ზევით აიხედავ — „გამოტოვება“; დროს და ქულებს თვითონ ითვლის. ონლაინაც: მსახიობი ზარში აჩვენებს, დანარჩენები ოთხიდან ერთს ირჩევენ — sagandzureli.ge → თამაშები → პანტომიმა.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.pm-card{position:absolute;inset:0;overflow:hidden;background:var(--paper)}
.pm-frame{position:absolute;inset:1.6mm;border:.5mm solid;border-radius:2.2mm}
.pm-band{position:absolute;left:2.8mm;right:2.8mm;top:2.8mm;height:8.4mm;border-radius:1.4mm;display:flex;align-items:center;justify-content:center;gap:1.2mm;padding:0 1.6mm;color:#fff;font-weight:700;font-size:8.4pt;white-space:nowrap;overflow:hidden}
.pm-word{position:absolute;left:3.6mm;right:3.6mm;top:12.6mm;bottom:9.6mm;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:.6mm}
.pm-w{text-align:center;font-family:SerifKa,serif;font-weight:800;font-size:17pt;line-height:1.1;color:var(--brown)}
.pm-foot{position:absolute;left:3mm;right:3mm;bottom:3.6mm;height:4.4mm;display:flex;align-items:center;justify-content:center;gap:.8mm;font-size:6.2pt;font-weight:700;white-space:nowrap;overflow:hidden;border-top:.2mm solid var(--line);padding-top:.6mm}
.pm-blankBand{background:#fff;border:.3mm dashed #bba98f;color:var(--muted);flex-direction:column;align-items:stretch;justify-content:flex-end;padding:0 2.6mm 1.4mm;gap:1mm;font-weight:400}
.pm-blankBand span{font-size:5.8pt;align-self:flex-start}
.pm-blankBand i{display:block;width:100%;border-bottom:.25mm solid #bba98f}
.pm-blankWord{justify-content:flex-end;padding:0 1.5mm 9mm}
.pm-blankWord i{display:block;border-bottom:.25mm solid #bba98f}
.pm-back{background:var(--wine)}
.pm-back .pm-frame{border-color:var(--gold);border-width:.3mm;inset:2.4mm;opacity:.9}
.pm-ring{position:absolute;left:50%;top:12mm;transform:translateX(-50%);width:17mm;height:17mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.pm-mark{position:absolute;left:0;right:0;top:34mm;text-align:center;font-size:10pt;color:#f0d9a0;letter-spacing:.05em}
.pm-sub{position:absolute;left:0;right:0;top:41mm;text-align:center;font-size:5.4pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.pm-cat{position:absolute;left:4.4mm;right:4.4mm;bottom:5.4mm;height:5.6mm;border-radius:2.8mm;display:flex;align-items:center;justify-content:center;gap:1mm;color:#fff;font-size:5.8pt;font-weight:700;white-space:nowrap;border:.25mm solid #f0d9a0;overflow:hidden;padding:0 1.5mm}
.pm-ex{display:grid;grid-template-columns:${W}mm 1fr;gap:7mm;align-items:center;margin:0 0 4mm;padding:4mm 5mm}
.pm-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.2mm;overflow:hidden}
.pm-exR h3{margin:0 0 3mm}
.pm-step{display:flex;gap:3mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2.6mm}
.pm-step svg{flex:none;margin-top:.4mm}
.pm-themes{display:flex;flex-wrap:wrap;gap:1.6mm 2mm;margin:0 0 5mm}
.pm-theme{display:inline-flex;align-items:center;gap:1.4mm;border:.3mm solid;border-radius:3.5mm;padding:.5mm 2.2mm .5mm .6mm;font-size:8.8pt;white-space:nowrap}
.pm-theme i{width:5mm;height:5mm;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.pm-sc{position:absolute;inset:12mm 12mm 12mm}
.pm-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm}
.pm-scHead .aso{font-size:15pt;color:var(--wine)}
.pm-scHead b{font-size:14pt;color:var(--wine)}
.pm-date{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.pm-date i{display:inline-block;width:24mm;border-bottom:.25mm solid #bba98f}
.pm-set{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:10pt;margin:4mm 0}
.pm-set .chk{margin:0 .8mm 0 2mm}
.pm-blank{display:inline-block;width:8mm;border-bottom:.25mm solid #bba98f}
table.pm-tab{width:100%;border-collapse:collapse;table-layout:fixed}
.pm-tab th,.pm-tab td{border:.25mm solid #bba98f;text-align:center}
.pm-tab th{background:var(--parch);color:var(--wine);font-size:10pt;padding:1.2mm .5mm}
.pm-tab th i{display:block;margin:1.5mm 2mm .3mm;border-bottom:.25mm solid #bba98f;height:3.5mm}
.pm-tab th.s{font-size:8pt;font-weight:400;color:var(--brown);background:var(--cream)}
.pm-tab th.r,.pm-tab td.r{width:11mm}
.pm-tab td{height:14.6mm;font-size:12pt}
.pm-tab td.r{font-weight:700;color:var(--wine);background:var(--cream)}
.pm-tab td.tot{background:#fbf6ec}
.pm-win{display:flex;gap:2mm;align-items:baseline;font-size:11pt;font-weight:700;color:var(--wine);margin:4mm 0 3mm}
.pm-win i{flex:1;border-bottom:.3mm solid #bba98f}
.pm-remind{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.4pt;line-height:1.3}
.pm-remind>div{display:flex;gap:2mm;align-items:flex-start}
.pm-remind svg{flex:none}
.pm-signs{margin-top:4mm;padding:3mm 5mm}
.pm-signs h3{margin:0 0 2mm}
.pm-signGrid{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;font-size:9.6pt;line-height:1.3}
.pm-signGrid>div{display:flex;gap:2.4mm;align-items:center}
.pm-signGrid svg{flex:none}
.pm-more{margin-top:4mm;font-size:10pt;line-height:1.35}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
