// „უცხო სოფელში“ on paper (2026-11-01, like Spyfall): the app's thirty places (`data/utskhoPlaces.ts`), seven cards each — the
// place and one of its seven roles — two places and one stranger card a sheet (63×52 mm, fifteen a sheet, one back for all, so
// nobody tells the stranger's card from behind), eight lists of the places (A6, four a side) for the table to keep in sight, and
// the score sheet with the app's points (`roundPoints` in utils/utskho.ts). Needs a clock (any phone's or a sand timer).
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/utskhoPlaces';
import * as __d1 from '../../utils/utskho';

const { UTSKHO_PLACES, MINUTES, MIN_PLAYERS, roundPoints } = ({ ...__d0, ...__d1 });

export const id = 'utskho-sopelshi';
export const title = 'უცხო სოფელში';
const TAG = 'ქართული · უტელეფონო';
const ROLES = 7;
const MAX = ROLES + 1;
const META = `${MIN_PLAYERS}–${MAX} მოთამაშე · 9 წლიდან · ${MINUTES[0]}–${MINUTES[MINUTES.length - 1]} წუთი რაუნდი`;
const STRANGER_ICON = 'hat-glasses';

for (const p of UTSKHO_PLACES) if (p.roles.length !== ROLES) throw new Error(`utskho-sopelshi: ${p.id} has ${p.roles.length} roles`);
// the points as the app counts them (five players, the stranger the fourth): checked, so the rules never say other than the app
{
  const r = { stranger: 3, place: 'x' };
  const eq = (a, b) => a.join() === b.join();
  if (!eq(roundPoints(r, { kind: 'vote', accused: 3, accuser: 1, late: false }, 5), [1, 2, 1, 0, 1])
    || !eq(roundPoints(r, { kind: 'vote', accused: 0, accuser: 1, late: false }, 5), [0, 0, 0, 4, 0])
    || !eq(roundPoints(r, { kind: 'vote', accused: 0, accuser: null, late: true }, 5), [0, 0, 0, 2, 0])
    || !eq(roundPoints(r, { kind: 'guess', guess: 'x' }, 5), [0, 0, 0, 4, 0])
    || !eq(roundPoints(r, { kind: 'guess', guess: 'y' }, 5), [1, 1, 1, 0, 1])
    || !eq(roundPoints(r, { kind: 'timeout' }, 5), [0, 0, 0, 2, 0])) throw new Error('utskho-sopelshi: the points changed in the app — update the rules');
}
const BY_NAME = [...UTSKHO_PLACES].sort((a, b) => a.name.localeCompare(b.name, 'ka'));

// ---------- the cards: two places and the stranger a sheet ----------
const W = 63, H = 52, COLS = 3, ROWS = 5;
const CARD_SHEETS = Math.ceil(UTSKHO_PLACES.length / 2);

const placeCard = (p, role) => `<div class="us-card"><div class="us-frame"></div>
<div class="us-top"><div class="us-badge">${icon(p.icon, { size: 8.4, color: C.wine, width: 1.7 })}</div>
<div class="us-tx"><div class="us-k">ადგილი</div><div class="fit us-n"><span>${esc(p.name)}</span></div></div></div>
<div class="us-role"><div class="us-k">შენი როლი</div><div class="fit us-r"><span>${esc(role)}</span></div></div></div>`;
const strangerCard = () => `<div class="us-card"><div class="us-frame"></div>
<div class="us-top"><div class="us-badge">${icon(STRANGER_ICON, { size: 8.4, color: C.wine, width: 1.7 })}</div>
<div class="us-tx"><div class="us-k">შენ ხარ</div><div class="fit us-n"><span>უცხო!</span></div></div></div>
<div class="us-role"><div class="us-k">შენი საქმე</div><div class="us-s">არ იცი, სად ხართ. უსმინე, ნუ გამოჩნდები — და მიხვდი ადგილს.</div></div></div>`;
const cardBack = () => `<div class="us-card us-back"><div class="us-frame"></div>
<div class="us-ring">${icon(STRANGER_ICON, { size: 11, color: C.gold, width: 1.3 })}</div>
<div class="us-mark aso">${aso(title)}</div><div class="us-sub">${esc(SERIES)}</div></div>`;

const cardSheets = Array.from({ length: CARD_SHEETS }, (_, s) => {
  const two = UTSKHO_PLACES.slice(s * 2, s * 2 + 2);
  const items = [...two.flatMap(p => p.roles.map(r => placeCard(p, r))), strangerCard()];
  while (items.length < COLS * ROWS) items.push(strangerCard());
  const label = `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ${two.map(p => p.name).join(', ')} და უცხო`;
  return {
    key: `cards${s + 1}`,
    front: gridSheet(items, { cols: COLS, rows: ROWS, w: W, h: H, label, cls: 'gsheet us-sheet' }),
    back: gridSheet(items.map(() => cardBack()), { cols: COLS, rows: ROWS, w: W, h: H, back: true, label: `${title} · ბარათები ${s + 1}/${CARD_SHEETS} — ზურგი`, cls: 'gsheet us-sheet' }),
  };
});

// ---------- the list of places: A6, four a side ----------
const listCard = () => `<div class="us-list">
  <div class="us-lHead">${icon(STRANGER_ICON, { size: 6, color: C.wine, width: 1.8 })}<div><b>${esc(title)}</b><span>${UTSKHO_PLACES.length} ადგილი</span></div></div>
  <ol class="us-lGrid">${BY_NAME.map(p => `<li>${icon(p.icon, { size: 4, color: C.wine, width: 2 })}<span>${esc(p.name)}</span></li>`).join('')}</ol>
  <p class="us-lFoot">ერთ-ერთში ვართ. უცხო ამ სიაში ეძებს — სოფლელები ისე პასუხობენ, რომ არ გასცენ.</p>
</div>`;
const listSheet = () => gridSheet(Array.from({ length: 4 }, listCard), { cols: 2, rows: 2, w: 100, h: 140, label: `${title} · ადგილების სია (ოთხი — ორივე მხარეს)`, cls: 'gsheet us-sheet' });

// ---------- the score sheet ----------
const ROUNDS = 12;
const scorePage = page(`<div class="us-sc">
  <div class="us-scHead"><span class="aso">${aso(title)}</span><b>ქულები</b><span class="us-me">თარიღი <i></i> დრო: ${MINUTES.map(m => `<span class="us-tick">${m} წთ</span>`).join(' ')}</span></div>
  <div class="us-legend">
    <div class="us-lg v">${icon('house', { size: 5, color: '#24603c', width: 2 })}<div><b>სოფელი იგებს</b> — უცხო იცნეს, ან უცხომ ადგილი ვერ გამოიცნო: <b>თითოს 1 ქულა</b>, ვინც უცხო დაასახელა — <b>2</b>.</div></div>
    <div class="us-lg s">${icon(STRANGER_ICON, { size: 5, color: C.wine, width: 2 })}<div><b>უცხო იგებს</b> — <b>2 ქულა</b>; <b>4</b> — თუ ადგილს გამოიცნობს, ან სოფელი დროზე ადრე სოფლელს დაადანაშაულებს.</div></div>
  </div>
  <table class="us-ct">
    <tr><th class="n">№</th><th class="pl">ადგილი</th><th class="st">უცხო</th>${Array.from({ length: MAX }, (_, i) => `<th class="p"><span>მოთამაშე ${i + 1}</span><i></i></th>`).join('')}</tr>
    ${Array.from({ length: ROUNDS }, (_, r) => `<tr><td class="n">${r + 1}</td><td class="pl"></td><td class="st"></td>${'<td class="p"></td>'.repeat(MAX)}</tr>`).join('')}
    <tr class="sum"><td class="n"></td><td class="pl" colspan="2">ჯამი</td>${'<td class="p"></td>'.repeat(MAX)}</tr>
  </table>
</div>
<div class="sheetLabel">ფურცელი %SHEET% · ${title} · ქულები</div>`, 'us-scP');

// ---------- the cover and the rules ----------
const EXAMPLE = UTSKHO_PLACES.find(p => p.id === 'marani') ?? UTSKHO_PLACES[0];
const QUESTIONS = ['რა გესმის?', 'რა გიჭირავს?', 'რა გაცვია?', 'რა სუნია?', 'რას აკეთებ?', 'რას ელოდები?', 'რას ხედავ?', 'რა ამინდია?', 'ბევრი ხალხია?', 'ცივა?', 'როგორ მოხვედი?', 'საღამოს რა იქნება?', 'ვინ გხვდება?', 'რას ჭამ?'];
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ყველამ იცის, სად ვართ — მარანში, ალილოზე, ბათუმის ბულვარზე, ჭიდაობაზე — ერთის გარდა. ის <b>უცხოა</b>: კითხვებსა და პასუხებს უსმენს და ცდილობს ადგილს მიხვდეს, ისე რომ თავი არ გასცეს. სოფლელები ერთმანეთს ეკითხებიან და პასუხობენ ისე, რომ სოფლელმა იცნოს — უცხომ კი ვერაფერი გაიგოს. ${UTSKHO_PLACES.length} ქართული ადგილი, თითოს შვიდი როლი.<br><b>${META}</b></div>
  <div class="us-ex box">
    <div class="us-exCards"><div class="us-exCard">${placeCard(EXAMPLE, EXAMPLE.roles[0])}</div><div class="us-exCard">${strangerCard()}</div><div class="us-exCard">${cardBack()}</div></div>
    <p>ყველა ბარათს ერთი და იგივე ზურგი აქვს. რაუნდში ერთი ადგილის ბარათები რიგდება — თითო სოფლელს თავისი როლით — და ერთი „უცხო“.</p>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>ადგილის ბარათები (${UTSKHO_PLACES.length} ადგილი × ${ROLES} როლი)</td><td>${UTSKHO_PLACES.length * ROLES}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>„უცხოს“ ბარათები (რაუნდში — ერთი)</td><td>${CARD_SHEETS}</td><td>${no('cards1')}–${no(`cards${CARD_SHEETS}`)}</td></tr>
        <tr><td>ადგილების სია (A6)</td><td>8</td><td>${no('lists')}</td></tr>
        <tr><td>ქულების ფურცელი (ორივე მხარეს)</td><td>1</td><td>${no('score')}</td></tr>
        <tr><td>საათი ან ტელეფონის წამზომი, ფანქარი</td><td>—</td><td>საკუთარი</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი ${W}×${H} მმ უნდა გამოვიდეს.</li>
        <li>ბარათები (${no('cards1')}–${no(`cards${CARD_SHEETS}`)}) — 250–300 გ მუყაოზე, ჭრა მონიშნული ხაზებით. ყოველი ადგილის შვიდი ბარათი ცალკე კონვერტში ჩადეთ ან რეზინით შეკარით; „უცხოს“ ბარათები — ცალკე.</li>
        <li>სიები (${no('lists')}) — ოთხად გაჭერით; თითო სია ორ-სამ მოთამაშეს. ქულები (${no('score')}) — ჩვეულებრივ ქაღალდზე.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „Spyfall“-ის იდეით; ადგილები, როლები და კითხვების მაგალითები საგანძურის სკოლისთვის Claude-მა დაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const RULES = [
  ['მომზადება', `${MIN_PLAYERS}–${MAX} მოთამაშე. ერთი — დამრიგებელი — კონვერტებს ურევს და ერთს ისე იღებს, რომ შიგ არ ჩაიხედოს. პირქვე ამოთვლის იმდენ ბარათს, რამდენი მოთამაშეცაა, გამოკლებული ერთი, უმატებს ერთ „უცხოს“, ურევს და პირქვე ურიგებს ყველას — თავის თავსაც.`],
  ['ბარათი', 'ყველა ფარულად ნახულობს თავისას: ადგილს და თავის როლს, ან „უცხოს“. ბარათი პირქვე ძევს მაგიდაზე. ადგილების სია შუაშია — ყველას შეუძლია ჩახედოს.'],
  ['დრო', `დაიწყეთ საათი: ${MINUTES.join(', ')} წუთი — როგორც შეთანხმდებით (ჩვეულებრივ 8).`],
  ['კითხვები', 'დამრიგებელი ვინმეს სახელით ეკითხება: „ნინო, რა გესმის?“ ნინო პასუხობს და თვითონ სვამს შემდეგ კითხვას — ოღონდ არა იმას, ვინც ჰკითხა. პასუხი ისეთი უნდა იყოს, რომ სოფლელმა იცნოს, „უცხომ“ კი ვერ მიხვდეს.'],
  ['ბრალდება', 'ნებისმიერ დროს შეიძლება საათის გაჩერება და ბრალდება: „ვფიქრობ, გიორგი უცხოა“. ბრალდებული თავს იმართლებს, დანარჩენები ხმას აძლევენ. ერთხმად „კი“ — გიორგი ბარათს აბრუნებს და რაუნდი მთავრდება; ერთი „არა“ — თამაში გრძელდება. რაუნდში ყველას ერთი ბრალდება აქვს.'],
  ['უცხო ხვდება', 'უცხოს ნებისმიერ დროს (ბრალდების გარდა) შეუძლია გაჩერება: „მე უცხო ვარ — ვართ მარანში!“ სწორია — უცხომ მოიგო; არასწორი — სოფელმა.'],
  ['დროის ბოლოს', 'დრო ამოიწურა — სოფელი ერთად ირჩევს ერთს: დამრიგებლიდან დაწყებული, რიგრიგობით ყველას შეუძლია ბრალდება, ხმა — როგორც ზემოთ. ვერ შეთანხმდით — უცხომ მოიგო.'],
  ['ქულები', 'სოფელი იგებს — თითოს 1 ქულა, ვინც უცხო დაასახელა — 2. უცხო იგებს — 2 ქულა; 4 — თუ ადგილს გამოიცნობს, ან სოფელი დროზე ადრე სოფლელს დაადანაშაულებს.'],
  ['რაუნდები', 'შემდეგ რაუნდს წინა უცხო ურიგებს. ითამაშეთ იმდენი რაუნდი, რამდენი მოთამაშეცაა; ბოლოს იგებს, ვისაც მეტი ქულა აქვს.'],
];
const rulesPage = page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · ${META}</div></div>
  <p class="lead">ყველა ერთ ადგილას ხართ — ერთის გარდა. სოფლელები უცხოს ეძებენ, უცხო — ადგილს. ვინ უფრო ჭკვიანურად იკითხავს და უპასუხებს?</p>
  <div class="rules"><ol>${RULES.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="us-qs box"><h3>კითხვების მაგალითები</h3><div class="us-qGrid">${QUESTIONS.map(q => `<span>${esc(q)}</span>`).join('')}</div>
    <p>კარგი კითხვა სოფლელს ეხმარება — „რა სუნია?“ — და უცხოს ცოტას ეუბნება. ზედმეტად ზუსტი პასუხი ადგილს გასცემს; ზედმეტად ბუნდოვანი — თვითონ შენზე იფიქრებენ!</p>
  </div>
  <div class="us-tips box">
    <div>${icon('house', { size: 5, color: C.wine, width: 1.9 })}<span><b>სოფლელს:</b> შენი როლით უპასუხე — მეღვინე მარანში სხვას ხედავს, ვიდრე ტურისტი.</span></div>
    <div>${icon(STRANGER_ICON, { size: 5, color: C.wine, width: 1.9 })}<span><b>უცხოს:</b> ზოგადად უპასუხე, სხვების სიტყვებს ჩაეჭიდე და სიაში ადგილები ჩუმად გამორიცხე.</span></div>
    <div>${icon('users-round', { size: 5, color: C.wine, width: 1.9 })}<span><b>${MAX}-ზე მეტნი ხართ?</b> ითამაშეთ წყვილებად: წყვილს ერთი ბარათი, ერთად პასუხობს.</span></div>
  </div>
  <div class="us-more box"><b>აპშიც</b> იგივე თამაშია: ყოველდღე ერთი ადგილი მთელი სკოლისთვის — შენ ხარ უცხო და სოფლელების პასუხებით ეძებ; კლასში ერთი ტელეფონი წრეში გადადის, თითოეულს საიდუმლო ბარათს აჩვენებს და დროს ითვლის — sagandzureli.ge → თამაშები → უცხო სოფელში.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.cover .lead{margin-bottom:4mm}
.us-card{position:absolute;inset:0;overflow:hidden;background:var(--paper);display:flex;flex-direction:column;padding:3.4mm 4mm 3.2mm}
.us-frame{position:absolute;inset:1.6mm;border:.5mm solid var(--wine);border-radius:2.4mm;pointer-events:none}
.us-top{flex:none;display:flex;align-items:center;gap:2.6mm;padding:.6mm .4mm 2.2mm;border-bottom:.25mm solid var(--line)}
.us-badge{flex:none;width:13mm;height:13mm;border-radius:3.6mm;background:#f3e6e2;display:flex;align-items:center;justify-content:center}
.us-tx{min-width:0;flex:1}
.us-k{font-size:6.6pt;font-weight:700;color:var(--muted);letter-spacing:.02em}
.us-n{font-family:SerifKa,serif;font-weight:800;font-size:15pt;line-height:1.15;color:var(--wine)}
.us-role{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:.6mm;padding:0 .4mm}
.us-r{font-weight:700;font-size:12.5pt;line-height:1.2;color:var(--brown)}
.us-s{font-size:8pt;line-height:1.3;color:var(--brown)}
.us-back{background:var(--wine)}
.us-back .us-frame{border-color:var(--gold);border-width:.3mm;inset:2.4mm;opacity:.9}
.us-ring{position:absolute;left:50%;top:7mm;transform:translateX(-50%);width:19mm;height:19mm;border-radius:50%;border:.3mm solid var(--gold);display:flex;align-items:center;justify-content:center}
.us-mark{position:absolute;left:0;right:0;top:30mm;text-align:center;font-size:12pt;color:#f0d9a0;letter-spacing:.05em}
.us-sub{position:absolute;left:0;right:0;bottom:5mm;text-align:center;font-size:5.6pt;color:var(--gold);opacity:.85;letter-spacing:.08em}
.us-ex{margin:0 0 5mm;padding:4mm 5mm}
.us-exCards{display:flex;gap:5mm;justify-content:center}
.us-exCard{position:relative;width:${W}mm;height:${H}mm;box-shadow:0 .6mm 2mm rgba(74,52,38,.25);border-radius:2.4mm;overflow:hidden}
.us-ex p{margin:3mm 0 0;text-align:center;font-size:10pt;line-height:1.35}
.us-list{position:absolute;inset:0;padding:6mm 6mm 5mm;display:flex;flex-direction:column}
.us-lHead{display:flex;align-items:center;gap:2.4mm;border-bottom:.3mm solid var(--gold);padding-bottom:2mm;margin-bottom:2.4mm}
.us-lHead div{display:flex;flex-direction:column}
.us-lHead b{font-family:SerifKa,serif;font-size:13pt;color:var(--wine);line-height:1.1}
.us-lHead span{font-size:8pt;color:var(--muted)}
.us-lGrid{flex:1;margin:0;padding:0;list-style:none;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(${Math.ceil(UTSKHO_PLACES.length / 2)},1fr);grid-auto-flow:column;column-gap:4mm;font-size:9.6pt;line-height:1.12}
.us-lGrid li{display:flex;align-items:center;gap:1.6mm}
.us-lGrid li svg{flex:none}
.us-lFoot{margin:1mm 0 0;font-size:7.4pt;line-height:1.3;color:var(--muted);text-align:center}
.us-qs{margin-top:3mm;padding:3mm 5mm}
.us-qs h3{margin:0 0 2mm;font-size:10.5pt}
.us-qGrid{display:flex;flex-wrap:wrap;gap:1.4mm 1.6mm}
.us-qGrid span{font-size:9pt;font-weight:700;color:var(--wine);background:#f6e9e2;border:.2mm solid #e2c9bf;border-radius:2.6mm;padding:.4mm 2.2mm}
.us-qs p{margin:2.4mm 0 0;font-size:9.4pt;line-height:1.35}
.us-tips{margin-top:3mm;padding:3mm 5mm;display:flex;flex-direction:column;gap:1.8mm}
.us-tips div{display:flex;gap:2.4mm;align-items:flex-start;font-size:9.6pt;line-height:1.35}
.us-tips svg{flex:none;margin-top:.3mm}
.us-more{margin-top:3mm;font-size:9.6pt;line-height:1.35}
.us-sc{position:absolute;inset:10mm 10mm 12mm}
.us-scHead{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm;white-space:nowrap}
.us-scHead .aso{font-size:15pt;color:var(--wine)}
.us-scHead b{font-size:13pt;color:var(--wine)}
.us-me{margin-left:auto;font-size:9.5pt;color:var(--muted);display:flex;gap:1.5mm;align-items:baseline}
.us-me i{display:inline-block;width:28mm;border-bottom:.25mm solid #bba98f;margin-right:3mm}
.us-tick{display:inline-block;border:.25mm solid #bba98f;border-radius:1.4mm;padding:0 1.4mm;font-size:8.4pt}
.us-legend{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:3mm 0}
.us-lg{display:flex;gap:2.4mm;align-items:flex-start;border-radius:2mm;padding:2.4mm 3mm;font-size:9.2pt;line-height:1.32}
.us-lg svg{flex:none;margin-top:.3mm}
.us-lg.v{background:#e5f1e8}
.us-lg.s{background:#f6e9e2}
table.us-ct{width:100%;border-collapse:collapse;table-layout:fixed}
.us-ct th,.us-ct td{border:.25mm solid #bba98f;text-align:center}
.us-ct th{background:var(--parch);color:var(--wine);font-size:8.4pt;padding:1mm .5mm;vertical-align:top}
.us-ct th.n,.us-ct td.n{width:8mm}.us-ct th.pl{width:34mm}.us-ct th.st{width:24mm}
.us-ct th.p span{display:block;font-size:6.6pt;color:var(--muted);font-weight:400}
.us-ct th.p i{display:block;height:7mm}
.us-ct td{height:14.6mm}
.us-ct td.n{font-weight:700;color:var(--wine);background:var(--cream)}
.us-ct tr.sum td{height:12mm;background:#fbf6ec;font-weight:700;color:var(--wine)}
.us-ct tr.sum td.pl{text-align:right;padding-right:3mm}
`;

const SHEETS = [
  { key: 'cover', back: rulesPage },
  ...cardSheets,
  { key: 'lists', front: listSheet(), back: listSheet() },
  { key: 'score', front: scorePage, back: scorePage },
];
SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
