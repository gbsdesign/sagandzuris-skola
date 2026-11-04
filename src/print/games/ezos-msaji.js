// „ეზოს მსაჯი“ on paper — the სამაგიდო variant of the app's yard referee (2026-11-04): the five yard games of
// `data/ezoGames.ts` (ორდროშობანა, ლელობურთი, დამალობანა, ზღვა ღელავს, კლასობანა) a page each, with the app's own field drawings
// (`utils/ezoFields.ts`) and the same texts; the referee's page (the whistle's signs, the fair split — the app's snake —, five
// rules); the rules quiz on paper (`quizDeal` with a fixed seed); 32 team cards to draw from a bag (16 blue, 16 red, one back
// for all); the season's wall table and the referee's match sheet. Needs: two flags, a whistle, a clock, chalk, a soft ball.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, gridSheet, coverCss, grapeEmblem } from '../lib.js';
import * as __d0 from '../../data/ezoGames';
import * as __d1 from '../../utils/ezoFields';
import * as __d2 from '../../utils/ezo';

const { EZO_GAMES, EZO_SIGNALS, EZO_FIGURES, EZO_TEAMS, EZO_TINT, fieldSvg, quizDeal, WIN_POINTS, DRAW_POINTS, KLASI } = ({ ...__d0, ...__d1, ...__d2 });

export const id = 'ezos-msaji';
export const title = 'ეზოს მსაჯი';
const TAG = 'ქართული · უტელეფონო';
const META = 'ეზოს 5 თამაში · 6 წლიდან · 3–30 მოთამაშე';
const QUIZ_SEED = 11;
const QUIZ_N = 12;
const SEASON_ROWS = 30;
const SEASON_COLS = 12;
const CARDS_A_SHEET = 16;
const LETTERS = ['ა', 'ბ', 'გ', 'დ'];
const PATTERN = { go: 'l', stop: 's', point: 'ss', end: 'sss', home: 'll' };
const KIND = { teams: 'ორი გუნდი', players: 'ყველა თავისთვის', turns: 'რიგრიგობით' };
const game = k => EZO_GAMES.find(g => g.id === k);
const blasts = k => `<span class="ez-bl">${[...PATTERN[k]].map(p => `<i class="${p}"></i>`).join('')}</span>`;
const li = list => list.map(x => `<li>${esc(x)}</li>`).join('');

// ---------- a game's page ----------
const EXTRA = {
  ordrosha: no => `<div class="box ez-ref"><b>მსაჯს.</b> დრო — 10, 15 ან 20 წუთი. დროშის გადმოტანა — ორი მოკლე სასტვენი; ყველა თავის ნახევარში დგება და გრძელ სასტვენზე თამაში გრძელდება. ქულები მსაჯის ფურცელზე (ფურცელი ${no('season')}, ზურგი) აღნიშნეთ.</div>`,
  lelo: no => `<div class="box ez-ref"><b>მსაჯს.</b> დრო — 10, 15 ან 20 წუთი. ლელო — ორი მოკლე სასტვენი, ბურთი შუა წრეში ბრუნდება. ვინც წააქცია ან ჩაეჭიდა, ბურთს მოწინააღმდეგე იღებს. ქულები მსაჯის ფურცელზე (ფურცელი ${no('season')}, ზურგი).</div>`,
  damalobana: () => `<div class="box ez-ref"><b>მსაჯს.</b> მეძებარი ითვლის 20, 30 ან 50-მდე. ძებნის დრო — 3–8 წუთი; ბოლოს ორი გრძელი სასტვენი — ყველა „შინ“. ვინც არ იპოვეს, მოიგო — სეზონის ცხრილში თითოს ${WIN_POINTS} ქულა.</div>`,
  zghva: () => `<div class="box ez-ref"><b>ქანდაკების თემები</b> — წამყვანი „გაშეშდი!“-სთან ერთად ერთს ამბობს:<ol class="ez-fig">${EZO_FIGURES.map((x, i) => `<li><i>${i + 1}.</i><span>${esc(x)}</span></li>`).join('')}</ol></div>`,
  klasobana: () => `<div class="ez-track"><b>ვინ რომელ კლასშია</b> — გავლილი კლასი გადახაზეთ:
    <table class="t ez-trackT"><tr><th>სახელი</th>${Array.from({ length: KLASI }, (_, i) => `<th>${i + 1}</th>`).join('')}</tr>
    ${Array.from({ length: 6 }, () => `<tr><td></td>${'<td></td>'.repeat(KLASI)}</tr>`).join('')}</table></div>`,
};

const gamePage = (g, no) => {
  const n = EZO_GAMES.indexOf(g) + 1;
  return page(`${stripe(TAG, `თამაში ${n} / ${EZO_GAMES.length}`)}
<div class="ez-wrap">
  <div class="ez-head">
    <span class="ez-num">${n}</span>
    <div class="ez-headT"><h2 class="ez-name">${esc(g.name)}</h2><div class="ez-like">${esc(g.like)} · ${KIND[g.kind]} · ${g.players[0]}–${g.players[1]} მოთამაშე${g.minutes.length ? ` · ${g.minutes[0]}–${g.minutes[g.minutes.length - 1]} წუთი` : ''}</div></div>
  </div>
  <p class="ez-lead">${esc(g.lead)}</p>
  <div class="ez-field">${fieldSvg(g.id)}</div>
  <div class="ez-cols">
    <div>
      <h3>${icon('package', { size: 4.4, color: C.wine, width: 2 })}რა გვჭირდება</h3><ul>${li(g.needs)}</ul>
      <h3>${icon('map-pin', { size: 4.4, color: C.wine, width: 2 })}მოედანი</h3><ul>${li(g.setup)}</ul>
      <h3>${icon('trophy', { size: 4.4, color: C.wine, width: 2 })}ვინ იგებს</h3><p>${esc(g.win)}</p>
      <h3>${icon('shield-check', { size: 4.4, color: C.wine, width: 2 })}უსაფრთხოდ</h3><ul>${li(g.safe)}</ul>
    </div>
    <div>
      <h3>${icon('list-ordered', { size: 4.4, color: C.wine, width: 2 })}როგორ ვთამაშობთ</h3>
      <ol class="ez-steps">${g.steps.map((s, i) => `<li><span>${i + 1}</span><p>${esc(s)}</p></li>`).join('')}</ol>
      ${EXTRA[g.id](no)}
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(g.name)}</span><span>${esc(SCHOOL)}</span>`)}`, 'ez-gameP');
};

// ---------- the cover and the referee's page ----------
const NEEDS = [
  ['flag', 'ორი დროშა ან ორი ფერადი ცხვირსახოცი'],
  ['megaphone', 'სასტვენი'],
  ['timer', 'საათი ან წამზომი'],
  ['pencil-line', 'ცარცი'],
  ['volleyball', 'რბილი ბურთი'],
  ['circle-dot', 'ბრტყელი კენჭები'],
];

const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ეზოს ხუთი თამაში ერთ ნაკრებში: წესები სურათებით, მსაჯის სასტვენის ნიშნები, გუნდების კენჭისყრის ბარათები და კლასის სეზონის ცხრილი კედელზე. ტელეფონი არ სჭირდება — მსაჯი მასწავლებელია.<br><b>${META}</b></div>
  <div class="ez-five">${EZO_GAMES.map((g, i) => `<div class="ez-fiveG"><div class="ez-fiveF">${fieldSvg(g.id)}</div><b>${i + 1}. ${esc(g.name)}</b><span>${KIND[g.kind]}</span></div>`).join('')}</div>
  <div class="ez-needs">${NEEDS.map(([ic, t]) => `<div>${icon(ic, { size: 7, color: C.wine, width: 1.7 })}<span>${esc(t)}</span></div>`).join('')}</div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>მსაჯის გვერდი</td><td>1</td><td>1-ის ზურგი</td></tr>
        <tr><td>თამაშების წესები სურათებით</td><td>5</td><td>${no('g12')}–${no('g5q')}</td></tr>
        <tr><td>წესების ვიქტორინა</td><td>${QUIZ_N} კითხვა</td><td>${no('g5q')}-ის ზურგი</td></tr>
        <tr><td>გუნდის ბარათები</td><td>${CARDS_A_SHEET * 2}</td><td>${no('cards1')}, ${no('cards2')}</td></tr>
        <tr><td>სეზონის ცხრილი და მსაჯის ფურცელი</td><td>1</td><td>${no('season')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>; ბარათი 48×63 მმ გამოვა.</li>
        <li>ერთი ბარათების ფურცელი 16 ბავშვს ჰყოფს (8 ლურჯი, 8 წითელი); დიდ კლასს — ორივე ფურცელი.</li>
        <li>სეზონის ცხრილი (${no('season')}) კედელზე გააკარით; მსაჯის ფურცელი (მისი ზურგი) ყოველ თამაშზე ახალი დაბეჭდეთ.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> ხალხური ეზოს თამაშები და „Capture the Flag“-ის იდეა; ლელობურთი — გურული სახალხო თამაშის ბავშვური ვარიანტი. წესები Claude-მა ჩაწერა ისე, როგორც ბავშვები ჩვეულებრივ თამაშობენ — მასწავლებელს ჯერ არ შეუმოწმებია; თქვენი ეზოს წესი უფრო მთავარია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const REF_RULES = [
  ['საზღვრები', 'თამაშამდე ყველას აჩვენეთ მოედნის საზღვრები და ცარცის ყოველი ხაზი.'],
  ['წესი ერთხელ', 'წესი ხმამაღლა, ერთხელ თქვით და ჰკითხეთ, ყველამ თუ გაიგო. ახალ წესს თამაშის შუაში ნუ დაამატებთ.'],
  ['დავა', 'ერთი მოკლე სასტვენი, ორივე მხარეს მოუსმინეთ, გადაწყვეტილება ერთხელ თქვით — და თამაში გრძელდება.'],
  ['ვინმე წაიქცა', 'თამაში მაშინვე ჩერდება. ჯერ ბავშვი, მერე ქულა.'],
  ['ბოლოს', 'ხელის ჩამორთმევა მოწინააღმდეგესთან; შედეგი სეზონის ცხრილში ჩაწერეთ.'],
];

const refereePage = no => page(`${stripe(TAG, 'მსაჯს')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso('მსაჯის გვერდი')}</div><div class="rsub">დრო · ქულა · სამართლიანობა</div></div>
  <p class="lead">მსაჯი დროს ითვლის, ქულებს წერს და ყველას თანაბრად ექცევა. აპით ამას ტელეფონი აკეთებს (საგანძურის სკოლა → თამაშები → ეზოს მსაჯი → ჰიბრიდული); ქაღალდზე — ეს ფურცლები, სასტვენი და საათი.</p>
  <div class="ez-two">
    <div>
      <h3>სასტვენის ნიშნები</h3>
      <table class="t ez-sig">${EZO_SIGNALS.map(s => `<tr><td class="b">${blasts(s.id)}</td><td><b>${esc(s.sign)}</b><br>${esc(s.says)}</td></tr>`).join('')}</table>
      <h3>გუნდების სამართლიანი გაყოფა</h3>
      <ol class="ez-ol">
        <li><b>ბარათებით.</b> ჩანთაში ჩაყარეთ იმდენი გუნდის ბარათი (ფურცლები ${no('cards1')}–${no('cards2')}), რამდენი ბავშვიცაა — ლურჯი და წითელი თანაბრად. ყველა თითოს ამოიღებს; ზურგი ყველას ერთნაირი აქვს, ამიტომ არავინ ირჩევს.</li>
        <li><b>„გველით“.</b> ბავშვები სეზონის ცხრილის მიხედვით დაალაგეთ: პირველი — ლურჯებში, მეორე და მესამე — წითლებში, მეოთხე და მეხუთე — ლურჯებში, და ასე შემდეგ (1 · 2 2 · 1 1 · 2 2 …). ძლიერები ორივე გუნდში თანაბრად ნაწილდებიან — აპიც ასე ყოფს.</li>
      </ol>
    </div>
    <div>
      <h3>მსაჯის ხუთი წესი</h3>
      <ol class="ez-ol">${REF_RULES.map(([h, t]) => `<li><b>${esc(h)}.</b> ${esc(t)}</li>`).join('')}</ol>
      <h3>სეზონი</h3>
      <p>მოგება — <b>${WIN_POINTS}</b> ქულა, ფრე — <b>${DRAW_POINTS}</b>, წაგება — 0. გუნდურ თამაშში ქულას გამარჯვებული გუნდის ყველა წევრი იღებს; დამალობანაში — ვინც ვერ იპოვეს; „ზღვა ღელავს“-ში — საუკეთესო ქანდაკება; კლასობანაში — ვინც პირველი გაიარა მეათე კლასი. ცხრილი (ფურცელი ${no('season')}) კედელზე ეკიდოს; სეზონის ბოლოს ჯამით პირველი — ეზოს ჩემპიონია.</p>
      <h3>უსაფრთხოდ</h3>
      <ul class="ez-ul"><li>თამაშამდე მოედანი შეამოწმეთ: მინა, ქვა, სველი ფილა.</li><li>წყალი და პირველადი დახმარების ჩანთა ახლოს იყოს.</li><li>მანქანების გზასთან და კიბეებთან არავინ თამაშობს.</li></ul>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · მსაჯის გვერდი</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// ---------- the quiz on paper ----------
const QUIZ = quizDeal(QUIZ_SEED, QUIZ_N);
const quizPage = () => page(`${stripe(TAG, 'ვიქტორინა')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso('წესების ვიქტორინა')}</div><div class="rsub">${QUIZ_N} კითხვა · ხუთივე თამაში</div></div>
  <p class="lead">მასწავლებელი კითხულობს, გუნდები ან თითოეული ფურცელზე სწორ ასოს წერს. სწორი — 1 ქულა. პასუხები ფურცლის ბოლოშია, თავდაყირა.</p>
  <ol class="ez-quiz">${QUIZ.map((q, i) => `<li><p><b>${i + 1}.</b> ${esc(q.q)}</p><div class="ez-opts">${q.options.map((o, k) => `<span><i>${LETTERS[k]}</i>${esc(o)}</span>`).join('')}</div></li>`).join('')}</ol>
  <div class="ez-answers"><b>პასუხები:</b> ${QUIZ.map((q, i) => `${i + 1} — ${LETTERS[q.right]}`).join(' · ')}</div>
</div>
${foot(`<span>${esc(title)} · წესების ვიქტორინა</span><span>${esc(SCHOOL)}</span>`)}`, 'ez-quizP');

// ---------- the team cards: 16 a sheet, 8 blue and 8 red in turn, one back for all (a blind draw) ----------
const teamCard = (t, n) => `<div class="ez-tc" style="--t:${EZO_TINT[t]}"><div class="ez-tcIn">
  <span class="ez-tcNo">${n}</span>
  ${icon(t === 0 ? 'waves' : 'flame', { size: 17, color: '#fff', width: 1.7 })}
  <b>${EZO_TEAMS[t]}</b>
  <span class="ez-tcSub">${aso(title)}</span>
</div></div>`;
const cardBack = `<div class="ez-tb"><div class="ez-tbIn">${grapeEmblem(19, C.gold)}<b class="aso">${aso(title)}</b><span>გუნდის ბარათი</span></div></div>`;
const cardSheet = (k, from) => {
  const cards = Array.from({ length: CARDS_A_SHEET }, (_, i) => teamCard(i % 2, from + Math.floor(i / 2)));
  const opts = { cols: 4, rows: 4, w: 48, h: 63, cls: 'gsheet ez-cardsP' };
  return {
    key: k,
    front: gridSheet(cards, { ...opts, label: `გუნდის ბარათები ${from}–${from + CARDS_A_SHEET / 2 - 1} (ლურჯი და წითელი)` }),
    back: gridSheet(cards.map(() => cardBack), { ...opts, back: true, label: 'გუნდის ბარათების ზურგი' }),
  };
};

// ---------- the season's wall table and the referee's match sheet ----------
const seasonPage = () => page(`${stripe(TAG, 'სეზონის ცხრილი')}
<div class="ez-tblWrap">
  <div class="rhead"><div class="aso rtitle">${aso('სეზონის ცხრილი')}</div><div class="rsub">მოგება ${WIN_POINTS} · ფრე ${DRAW_POINTS}</div></div>
  <div class="ez-fields">კლასი <i class="ez-line w"></i> სეზონი <i class="ez-line"></i> – <i class="ez-line"></i></div>
  <table class="t ez-season">
    <tr><th rowspan="2" class="n">№</th><th rowspan="2" class="nm">სახელი</th>${Array.from({ length: SEASON_COLS }, (_, i) => `<th class="g">${i + 1}</th>`).join('')}<th rowspan="2" class="sum">ჯამი</th></tr>
    <tr>${'<th class="d"></th>'.repeat(SEASON_COLS)}</tr>
    ${Array.from({ length: SEASON_ROWS }, (_, r) => `<tr><td class="n">${r + 1}</td><td></td>${'<td></td>'.repeat(SEASON_COLS)}<td class="sum"></td></tr>`).join('')}
  </table>
  <p class="ez-legend">თითო სვეტი — ერთი თამაში: ზემოთ თარიღი და თამაშის პირველი ასო (ო — ორდროშობანა, ლ — ლელობურთი, დ — დამალობანა, ზ — ზღვა ღელავს, კ — კლასობანა). უჯრაში: მოგება <b>${WIN_POINTS}</b> · ფრე <b>${DRAW_POINTS}</b> · წაგება <b>0</b> · არ თამაშობდა — ცარიელი.</p>
</div>
${foot(`<span>${esc(title)} · სეზონის ცხრილი</span><span>${esc(SCHOOL)}</span>`)}`, 'ez-seasonP');

const matchBlock = () => `<div class="ez-match">
  <div class="ez-mTop"><span><i class="chk"></i>ორდროშობანა</span><span><i class="chk"></i>ლელობურთი</span><span>თარიღი <i class="ez-line"></i></span><span>დრო <i class="ez-line s"></i> წთ</span></div>
  <div class="ez-mTeams">${[0, 1].map(t => `<div class="ez-mTeam" style="--t:${EZO_TINT[t]}">
    <div class="ez-mHead">${icon(t === 0 ? 'waves' : 'flame', { size: 4.6, color: '#fff', width: 2 })}${EZO_TEAMS[t]}</div>
    <ol>${'<li></li>'.repeat(14)}</ol>
    <div class="ez-mPts"><span>ქულები</span>${'<i></i>'.repeat(10)}<span class="tot">ჯამი</span><i class="tot"></i></div>
  </div>`).join('')}</div>
  <div class="ez-mWin">გაიმარჯვა: <span><i class="chk"></i>ლურჯებმა</span><span><i class="chk"></i>წითლებმა</span><span><i class="chk"></i>ფრე</span> · ცხრილში ჩაიწერა <i class="chk"></i></div>
</div>`;
const matchPage = () => page(`${stripe(TAG, 'მსაჯის ფურცელი')}
<div class="ez-tblWrap">
  <div class="rhead"><div class="aso rtitle">${aso('მსაჯის ფურცელი')}</div><div class="rsub">ორი თამაში ერთ გვერდზე</div></div>
  ${matchBlock()}${matchBlock()}
</div>
${foot(`<span>${esc(title)} · მსაჯის ფურცელი</span><span>${esc(SCHOOL)}</span>`)}`, 'ez-matchP');

// a game page's text shrinks until it clears the foot; anything still over it stops the build
export const script = `(() => {
  const bad = [];
  document.querySelectorAll('.page').forEach((pg, i) => {
    const f = pg.querySelector('.foot');
    if (!f) return;
    const top = () => f.getBoundingClientRect().top;
    const cols = pg.querySelector('.ez-cols');
    if (cols) {
      let pt = 10.4, n = 0;
      cols.style.fontSize = pt + 'pt';
      while (cols.getBoundingClientRect().bottom > top() - 3 && pt > 8.6 && n++ < 40) { pt -= 0.2; cols.style.fontSize = pt + 'pt'; }
    }
    pg.querySelectorAll('.ez-wrap,.rulesWrap,.ez-tblWrap').forEach(el => {
      const last = el.lastElementChild;
      if (last && last.getBoundingClientRect().bottom > top() - 1) bad.push('page ' + (i + 1));
    });
  });
  if (bad.length) throw new Error('too full: ' + bad.join(', '));
})();`;

export const css = `${coverCss}
/* the cover */
.ez-five{display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin:0 0 5mm}
.ez-fiveG{display:flex;flex-direction:column;gap:1mm;font-family:'SansKa',sans-serif}
.ez-fiveF svg{display:block;width:100%;height:auto}
.ez-fiveG b{font-size:9.6pt;color:var(--wine);line-height:1.15;margin-top:.6mm}
.ez-fiveG span{font-size:8pt;color:var(--muted)}
.ez-needs{display:grid;grid-template-columns:repeat(3,1fr);gap:2.4mm 4mm;margin:0 0 6mm;padding:3mm 4mm;border:.3mm solid var(--gold);border-radius:2mm;background:var(--paper)}
.ez-needs>div{display:flex;align-items:center;gap:2mm;font-size:9.6pt;line-height:1.2}
.ez-needs svg{flex:0 0 auto}

/* a game's page */
.ez-wrap{padding:6mm 13mm 0}
.ez-head{display:flex;align-items:center;gap:4mm;border-bottom:.3mm solid var(--gold);padding-bottom:2mm}
.ez-num{width:12mm;height:12mm;border-radius:50%;background:var(--wine);color:#fff;font-family:'SansKa',sans-serif;font-weight:800;font-size:17pt;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.ez-name{margin:0;font-size:24pt;line-height:1.05;color:var(--wine)}
.ez-like{font-family:'SansKa',sans-serif;font-size:9.4pt;color:var(--muted);margin-top:.8mm}
.ez-lead{font-size:11.4pt;line-height:1.38;margin:3mm 0 3mm}
.ez-field{width:136mm;margin:0 auto 4mm}
.ez-field svg{display:block;width:100%;height:auto;font-family:'SansKa',sans-serif}
.ez-cols{display:grid;grid-template-columns:1fr 1fr;gap:7mm;font-size:10.4pt;line-height:1.36}
.ez-cols h3{display:flex;align-items:center;gap:1.6mm;margin:0 0 1.4mm;font-size:1.06em;color:var(--wine)}
.ez-cols h3:not(:first-child){margin-top:3mm}
.ez-cols ul{margin:0;padding-left:4.6mm}
.ez-cols ul li{margin-bottom:1mm}
.ez-cols p{margin:0}
.ez-steps{list-style:none;margin:0;padding:0}
.ez-steps li{display:flex;gap:2.2mm;margin-bottom:1.8mm}
.ez-steps li span{flex:0 0 5.4mm;height:5.4mm;border-radius:50%;background:var(--wine);color:#fff;font-family:'SansKa',sans-serif;font-size:.84em;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:.2mm}
.ez-ref{margin-top:3mm;font-size:.94em}
.ez-ref b{color:var(--wine)}
.ez-fig{list-style:none;margin:1.4mm 0 0;padding:0;columns:2;column-gap:6mm;font-size:.9em;line-height:1.3}
.ez-fig li{display:flex;gap:1.2mm;margin-bottom:.6mm;break-inside:avoid}
.ez-fig li i{flex:0 0 5mm;font-style:normal;text-align:right;color:var(--wine);font-weight:700}
.ez-track{margin-top:3mm;font-size:.94em}
.ez-track b{color:var(--wine)}
table.ez-trackT{margin-top:1.6mm;font-size:8.4pt}
table.ez-trackT th{text-align:center;padding:.8mm}
table.ez-trackT td{height:7mm;padding:0}
table.ez-trackT tr>*:first-child{width:24mm}

/* the referee's page */
.ez-two{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:10.2pt;line-height:1.38}
.ez-two h3{margin:0 0 1.6mm;color:var(--wine);font-size:11.2pt}
.ez-two h3:not(:first-child){margin-top:4mm}
.ez-two p{margin:0}
table.ez-sig td{vertical-align:middle;padding:1.6mm 2mm}
table.ez-sig td.b{width:22mm}
.ez-bl{display:flex;gap:1.2mm;align-items:center}
.ez-bl i{display:block;height:2.6mm;border-radius:1.3mm;background:var(--wine)}
.ez-bl i.s{width:3mm}
.ez-bl i.l{width:9mm}
.ez-ol{margin:0;padding-left:5mm}
.ez-ol li{margin-bottom:2mm}
.ez-ol li b{color:var(--wine)}
.ez-ul{margin:0;padding-left:4.6mm}
.ez-ul li{margin-bottom:1mm}

/* the quiz */
.ez-quiz{list-style:none;margin:2mm 0 0;padding:0;columns:2;column-gap:8mm;font-size:10pt;line-height:1.34}
.ez-quiz li{break-inside:avoid;margin-bottom:4mm}
.ez-quiz p{margin:0 0 1.4mm}
.ez-quiz p b{color:var(--wine)}
.ez-opts{display:flex;flex-direction:column;gap:.9mm}
.ez-opts span{display:flex;gap:1.8mm;align-items:baseline;font-size:9.6pt}
.ez-opts i{font-style:normal;flex:0 0 4.6mm;height:4.6mm;border-radius:50%;border:.3mm solid var(--wine);color:var(--wine);font-family:'SansKa',sans-serif;font-weight:800;font-size:8pt;display:flex;align-items:center;justify-content:center;align-self:flex-start}
.ez-answers{margin-top:2mm;padding-top:2mm;border-top:.25mm dashed var(--line);transform:rotate(180deg);text-align:center;font-size:9pt;color:var(--muted)}
.ez-answers b{color:var(--wine)}

/* the team cards */
.ez-tc{position:absolute;inset:0;background:var(--t);color:#fff}
.ez-tcIn{position:absolute;inset:2.2mm;border:.4mm solid rgba(255,255,255,.75);border-radius:2.4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4mm;font-family:'SansKa',sans-serif}
.ez-tcIn b{font-size:15pt;font-weight:800;letter-spacing:.02em}
.ez-tcNo{position:absolute;top:1.6mm;left:2.2mm;font-size:8pt;font-weight:700;opacity:.85}
.ez-tcSub{font-size:7pt;letter-spacing:.12em;opacity:.85}
.ez-tb{position:absolute;inset:0;background:var(--wine)}
.ez-tbIn{position:absolute;inset:2.2mm;border:.35mm solid var(--gold);border-radius:2.4mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;color:#f0d9a0}
.ez-tbIn b{font-size:9pt;letter-spacing:.12em}
.ez-tbIn span{font-family:'SansKa',sans-serif;font-size:7pt;opacity:.85}

/* the season and the match sheet */
.ez-tblWrap{padding:6mm 12mm 0}
.ez-line{display:inline-block;width:28mm;border-bottom:.25mm solid #b9a37f;height:4mm;vertical-align:-1mm;margin:0 1.5mm}
.ez-line.s{width:12mm}
.ez-line.w{width:52mm}
.ez-fields{margin:-1mm 0 3mm;font-family:'SansKa',sans-serif;font-size:10pt;color:var(--muted)}
table.ez-season{table-layout:fixed;font-family:'SansKa',sans-serif;font-size:8.4pt}
table.ez-season th,table.ez-season td{padding:0 .8mm;height:6.9mm;vertical-align:middle}
table.ez-season th.n,table.ez-season td.n{width:7mm;text-align:center;color:var(--muted)}
table.ez-season th.nm{width:40mm}
table.ez-season th.g{text-align:center;height:5mm}
table.ez-season th.d{height:9mm;background:#fff}
table.ez-season th.sum,table.ez-season td.sum{width:13mm;background:var(--parch)}
.ez-legend{margin:2.4mm 0 0;font-size:8.8pt;line-height:1.35;color:var(--muted)}
.ez-legend b{color:var(--wine)}
.ez-match{border:.3mm solid var(--gold);border-radius:2.4mm;padding:3mm 4mm;margin-top:4mm;font-family:'SansKa',sans-serif;font-size:9.4pt}
.ez-mTop{display:flex;flex-wrap:wrap;gap:2mm 6mm;align-items:center;margin-bottom:2.6mm}
.ez-mTeams{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5mm}
.ez-mHead{display:flex;align-items:center;gap:1.6mm;background:var(--t);color:#fff;font-weight:800;padding:1.2mm 2.4mm;border-radius:1.6mm}
.ez-mTeam ol{margin:1.4mm 0 0;padding-left:6mm;font-size:8pt;color:var(--muted)}
.ez-mTeam ol li{height:5.6mm;border-bottom:.2mm solid var(--line)}
.ez-mPts{display:flex;align-items:center;gap:.8mm;margin-top:2.4mm;font-size:8.6pt}
.ez-mPts i{display:block;flex:0 0 auto;width:4.4mm;height:4.4mm;border:.3mm solid var(--t);border-radius:.8mm}
.ez-mPts span{margin-right:1mm;font-weight:700}
.ez-mPts span.tot{margin-left:auto}
.ez-mPts i.tot{width:8mm}
.ez-mWin{margin-top:3mm;display:flex;flex-wrap:wrap;gap:2mm 5mm;align-items:center;font-weight:700}
.ez-mWin span{font-weight:400}
`;

const SHEETS = [{ key: 'cover' }, { key: 'g12' }, { key: 'g34' }, { key: 'g5q' }, cardSheet('cards1', 1), cardSheet('cards2', CARDS_A_SHEET / 2 + 1), { key: 'season' }];
const no = k => sheetNo(SHEETS, k);
const fill = (k, front, back) => Object.assign(SHEETS[no(k) - 1], { front, back });
fill('cover', coverPage(no), refereePage(no));
fill('g12', gamePage(game('ordrosha'), no), gamePage(game('lelo'), no));
fill('g34', gamePage(game('damalobana'), no), gamePage(game('zghva'), no));
fill('g5q', gamePage(game('klasobana'), no), quizPage());
fill('season', seasonPage(), matchPage());

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
