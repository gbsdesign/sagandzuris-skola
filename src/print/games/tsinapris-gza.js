// „წინაპრის გზა“ on paper — the სამაგიდო variant of the app's choose-your-path game (2026-11-01): each ancestor's story as a
// gamebook of numbered sections on one sheet (§ 1 starts it; every fork sends the reader to a section; the ancestor's own way
// gives a ★, a what-if tells where it would have led and sends on to the real way without one). The stories are the app's own
// (`data/tsinapariStories.ts`); the sections' numbers and the ways' letters are shuffled once with a fixed seed a story, so the
// teacher's key holds. Then the letter cards ა ბ გ for six teams in the app's team colours (the class votes with them in the
// app's hybrid too), „ჩემი გზა“ (a reader's ★ for every fork) with the class's score sheet behind it, and the teacher's key.
import { C, SERIES, SCHOOL, aso, esc, icon, page, stripe, foot, duplex, sheetNo, cardSheet, coverCss } from '../lib.js';
import * as __d0 from '../../data/tsinapariStories';
import * as __d1 from '../../utils/tsinapari';
import * as __d2 from '../../utils/otkheuli';
import * as __d3 from '../../utils/amikhseni';

const { TSINAPARI_STORIES, choiceOrder, LETTERS, mulberry32, shuffle, TEAM_NAMES } = ({ ...__d0, ...__d1, ...__d2, ...__d3 });

export const id = 'tsinapris-gza';
export const title = 'წინაპრის გზა';
const TAG = 'ქართული · უტელეფონო';
const META = 'მარტო, წყვილებში ან მთელი კლასი გუნდებად · 9 წლიდან · ერთი ამბავი 15–20 წუთი';
// the app's team colours (pages/games/rounds/teams.tsx TEAM_TINT), so a team's cards match its chip on the phone
const TEAM_TINT = ['#2b5f8a', '#cf7428', '#4f8a3c', '#5b3f8c', '#b23a48', '#24827e'];
const GREEN = '#2f7d4f';
const AMBER = '#b26a12';

// ---------- a story's sections: § 1 the start, then R (the real way, on to the next fork) and two W (what-ifs) a fork ----------
const seedOf = s => [...s.id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7) || 1;
const BOOKS = TSINAPARI_STORIES.map(story => {
  const seed = seedOf(story);
  const n = story.steps.length;
  const keys = [];
  for (let k = 0; k < n; k++) keys.push(`R${k}`, `W${k}-1`, `W${k}-2`);
  const order = shuffle(keys, mulberry32(seed));
  const num = { S: 1 };
  order.forEach((key, i) => { num[key] = i + 2; });
  const target = (k, c) => num[c === 0 ? `R${k}` : `W${k}-${c}`];
  const ways = k => choiceOrder(seed, k).map((c, i) => ({ c, letter: LETTERS[i], text: c === 0 ? story.steps[k].right : story.steps[k].wrong[c - 1].text, to: target(k, c) }));
  return { story, seed, n, num, order, ways, tint: story.tint };
});

const fork = (b, k) => {
  const st = b.story.steps[k];
  return `<div class="tz-fork">
  <p class="tz-when"><b style="background:${b.tint}">${esc(st.year)}</b><span>${esc(st.place)} · გასაყარი ${k + 1}</span></p>
  <p class="tz-scene">${esc(st.scene)}</p>
  <p class="tz-ask" style="color:${b.tint}">${esc(st.ask)}</p>
  <ol class="tz-ways">${b.ways(k).map(w => `<li><span class="tz-l" style="color:${b.tint};border-color:${b.tint}">${w.letter}</span><span class="tz-w">${esc(w.text)}</span><span class="tz-go">→ §&nbsp;${w.to}</span></li>`).join('')}</ol>
</div>`;
};
const starLine = (b, k) => `<p class="tz-star">${icon('star', { size: 4.2, color: '#c9a227', width: 2.2 })}<span>აქ პირდაპირ შენი არჩევანით მოხვედი? <b>★ შენია</b> — ჩაიწერე გასაყარ ${k + 1}-ზე.</span></p>`;
const ending = b => {
  const n = b.n;
  return `<div class="tz-end">
  <p class="tz-endH" style="color:${b.tint}">დასასრული</p>
  <p>${esc(b.story.outro)}</p>
  <p class="tz-fact"><b>იცოდი?</b> ${esc(b.story.fact)}</p>
  <p class="tz-count">დათვალე შენი ★: <b>${n - 1}–${n}</b> — ★★★ · <b>${Math.ceil(n / 2)}–${n - 2}</b> — ★★ · ნაკლები — ★. სცადე სხვა წინაპრის გზაც!</p>
</div>`;
};
const section = (b, key) => {
  const no = b.num[key];
  const head = `<p class="tz-no" style="color:${b.tint}"><span style="border-color:${b.tint}">§ ${no}</span></p>`;
  if (key === 'S') {
    return `<section class="tz-sec tz-start" data-no="${no}">${head}<p class="tz-intro">${esc(b.story.intro)}</p>${fork(b, 0)}</section>`;
  }
  const k = Number(key.slice(1).split('-')[0]);
  const st = b.story.steps[k];
  if (key.startsWith('R')) {
    return `<section class="tz-sec" data-no="${no}">${head}${starLine(b, k)}
<p class="tz-real" style="border-color:${GREEN}">${esc(st.real)}</p>${k + 1 < b.n ? fork(b, k + 1) : ending(b)}</section>`;
  }
  const c = Number(key.split('-')[1]);
  return `<section class="tz-sec tz-what" data-no="${no}">${head}<p class="tz-whatH">ასე რომ ყოფილიყო…</p>
<p class="tz-then" style="border-color:${AMBER}">${esc(st.wrong[c - 1].then)}</p>
<p class="tz-back">ისტორიამ სხვა გზა აირჩია. ამ გასაყარზე ★ არ გეკუთვნის — <b>გადადი §&nbsp;${b.num[`R${k}`]}-ზე</b> და წაიკითხე, რა მოხდა სინამდვილეში.</p></section>`;
};
const medal = (b, size) => `<span class="tz-medal" style="width:${size}mm;height:${size}mm;border-color:${b.tint};color:${b.tint};font-size:${(size * (b.story.short.length > 1 ? 0.95 : 1.25)).toFixed(1)}pt"><span class="aso">${aso(b.story.short)}</span></span>`;

// a story's four pages (two sheets): every section starts on the first; the print's own script moves what does not fit on to the
// next page. The last page ends with the story's own „ჩემი გზა“ strip and a few lines for notes.
const PAGES = 4;
const bookFoot = b => foot(`<span>${esc(title)} · ${esc(b.story.hero)} · <b class="tz-range"></b></span><span>${esc(SCHOOL)}</span>`);
const tracker = b => `<div class="tz-track"><p class="tz-notes">ჩემი გზა</p><div class="tz-pRow" style="border-color:${b.tint}">
    <div class="tz-pWho">${medal(b, 13)}<div><b style="color:${b.tint}">${esc(b.story.hero)}</b><span>ჩემი გზა</span></div></div>
    <div class="tz-pForks">${b.story.steps.map((st, k) => `<div class="tz-pF"><span class="tz-pN">${k + 1}</span><span class="tz-pBox"></span><span class="tz-pStar">${icon('star', { size: 6.2, color: '#c9a227', width: 1.5 })}</span></div>`).join('')}</div>
    <div class="tz-pSum"><span>★ სულ</span><b>___ / ${b.n}</b></div>
  </div><p class="tz-notes n2">შენიშვნები</p>${'<p class="tz-ruled"></p>'.repeat(2)}${'<p class="tz-ruled more"></p>'.repeat(20)}</div>`;
const bookSheets = b => {
  const all = ['S', ...b.order].sort((x, y) => b.num[x] - b.num[y]);
  const pages = Array.from({ length: PAGES }, (_, i) => page(`${stripe(TAG, i ? `${b.story.hero} · გაგრძელება` : b.story.hero)}
${i ? '' : `<div class="tz-head">
  ${medal(b, 19)}
  <div class="tz-headT">
    <h2 style="color:${b.tint}">${esc(b.story.hero)}</h2>
    <p class="tz-sub">${esc(b.story.years)} · ${esc(b.story.where)} · ${b.n} გასაყარი</p>
    <p class="tz-how">დაიწყე <b>§ 1</b>-დან. ყოველ გასაყარზე აირჩიე გზა და გადადი მის §-ზე — ნომრები შერეულია, ეძებე როგორც ლექსიკონში. ★ ჩაიწერე „ჩემი გზის“ ფურცელზე.</p>
  </div>
</div>`}
<div class="tz-cols${i ? '' : ' first'}${i === PAGES - 1 ? ' last' : ''}" data-book="${b.story.id}" data-part="${i + 1}">${i ? '' : all.map(key => section(b, key)).join('\n')}</div>
${i === PAGES - 1 ? tracker(b) : ''}
${bookFoot(b)}`, 'tzBook'));
  return [0, 1].map(s => ({ key: `book-${b.story.id}${s ? '-2' : ''}`, front: pages[2 * s], back: pages[2 * s + 1] }));
};

// ---------- the letter cards: three a team, its colour; the letter on both sides, so the team sees what it holds up ----------
const voteCard = (t, i, back = false) => {
  const tint = TEAM_TINT[t];
  return back
    ? `<div class="card tz-vote b" style="background:${tint}"><div class="frame" style="border-color:#ffffffaa"></div><div class="tz-vl">${LETTERS[i]}</div><div class="tz-vt">${esc(title)}</div></div>`
    : `<div class="card tz-vote"><div class="frame" style="border-color:${tint}"></div><div class="tz-vl" style="color:${tint}">${LETTERS[i]}</div><div class="tz-vt" style="background:${tint}">გუნდი ${t + 1} · ${esc(TEAM_NAMES[t])}</div></div>`;
};
const voteSheets = [0, 1].map(s => {
  const teams = [3 * s, 3 * s + 1, 3 * s + 2];
  return {
    key: `vote${s + 1}`,
    front: cardSheet(teams.flatMap(t => [0, 1, 2].map(i => voteCard(t, i))), { label: `${title} · ა ბ გ ბარათები, გუნდები ${teams[0] + 1}–${teams[2] + 1}` }),
    back: cardSheet(teams.flatMap(t => [0, 1, 2].map(i => voteCard(t, i, true))), { back: true, label: `${title} · ა ბ გ ბარათები (ზურგი)` }),
  };
});

// ---------- „ჩემი გზა“: a ★ for every fork of every story; the class's points behind it ----------
const pathPage = page(`${stripe(TAG, 'ჩემი გზა')}
<div class="tz-path">
  <div class="tz-pathHead"><h2>ჩემი გზა</h2><p>სახელი: <span class="tz-lineIn"></span></p></div>
  <p class="tz-pathHow">ყოველ გასაყარზე ჩაწერე, რომელი ასო აირჩიე. „★ შენია“ — გააფერადე ვარსკვლავი. ბოლოს დათვალე ★ და გააფერადე შედეგი.</p>
  ${BOOKS.map(b => `<div class="tz-pRow" style="border-color:${b.tint}">
    <div class="tz-pWho">${medal(b, 13)}<div><b style="color:${b.tint}">${esc(b.story.hero)}</b><span>${esc(b.story.years)}</span></div></div>
    <div class="tz-pForks">${b.story.steps.map((st, k) => `<div class="tz-pF"><span class="tz-pN">${k + 1}</span><span class="tz-pBox"></span><span class="tz-pStar">${icon('star', { size: 6.2, color: '#c9a227', width: 1.5 })}</span><span class="tz-pY">${esc(st.year.replace('-იანი წლები', '-იანი'))}</span></div>`).join('')}</div>
    <div class="tz-pSum"><span>★ სულ</span><b>___ / ${b.n}</b><span class="tz-pStars">${[1, 2, 3].map(() => icon('star', { size: 5, color: '#c9a227', width: 1.5 })).join('')}</span></div>
  </div>`).join('')}
  <p class="tz-pathNote">★★★ — ყველა ან ერთის გარდა ყველა · ★★ — ნახევარი ან მეტი · ★ — გზა ბოლომდე გაიარე</p>
  <div class="tz-mine box">
    <p class="tz-mineH">${icon('footprints', { size: 5.4, color: C.wine, width: 2 })}ჩემი წინაპრის გზა</p>
    <p class="tz-mineQ">ჰკითხე ოჯახში ერთ-ერთ შენს წინაპარზე — ბებიის ბებიაზე ან ბაბუის ბაბუაზე: ვინ იყო, სად ცხოვრობდა, რა გზა აირჩია ერთხელ და რა მოჰყვა ამას? ჩაწერე აქ და წაუკითხე კლასს.</p>
    <p class="tz-mineL"><span>ვინ · წლები · სად:</span></p>${'<p class="tz-mineL"></p>'.repeat(4)}
  </div>
</div>
${foot(`<span>${esc(title)} · ჩემი გზა</span><span>${esc(SCHOOL)}</span>`)}`, 'tzPathP');

const scoreTable = () => `<div class="tz-score">
  <p class="tz-scoreT">ამბავი: <span class="tz-lineIn"></span></p>
  <table class="t">
    <tr><th>გუნდი</th>${Array.from({ length: 8 }, (_, k) => `<th>${k + 1}</th>`).join('')}<th>სულ</th></tr>
    ${TEAM_TINT.map((tint, t) => `<tr><td><i style="background:${tint}"></i>${esc(TEAM_NAMES[t])}</td>${Array.from({ length: 8 }, () => '<td></td>').join('')}<td></td></tr>`).join('')}
  </table>
</div>`;
const scorePage = page(`${stripe(TAG, 'ქულების ფურცელი')}
<div class="tz-scoreP">
  <h2>ქულების ფურცელი — მთელი კლასი</h2>
  <p class="tz-pathHow">ყოველ გასაყარზე: ნამდვილი გზის ასო ასწია გუნდმა — 1 ქულა. ჩაწერეთ ✓ ან ქულა, ბოლოს დაითვალეთ. ფერები — ა ბ გ ბარათების ფერებია.</p>
  ${scoreTable()}${scoreTable()}
</div>
${foot(`<span>${esc(title)} · ქულების ფურცელი</span><span>${esc(SCHOOL)}</span>`)}`, 'tzScoreP');

// ---------- the teacher's key: for every fork the real way's letter and section, and where the others go ----------
const keyPage = page(`${stripe(TAG, 'მასწავლებლის გასაღები')}
<div class="tz-key">
  <h2>მასწავლებლის გასაღები</h2>
  <p class="tz-pathHow">წაიკითხეთ § 1 და თითოეული გასაყარი ხმამაღლა; გუნდები ბარათს ერთდროულად სწევენ. ნამდვილი გზის ასო — მწვანეა; ვინც ის ასწია, ქულას იღებს. მერე წაიკითხეთ მისი § — იქ მომდევნო გასაყარიცაა. სხვა გზების §-ები გეტყვით, სად მიგვიყვანდა.</p>
  <div class="tz-keys">
  ${BOOKS.map(b => `<div class="tz-kBook">
    <p class="tz-kHead" style="color:${b.tint}">${medal(b, 7.5)}<b>${esc(b.story.hero)}</b><span>დასაწყისი § 1</span></p>
    <table class="t tz-kT">
      ${b.story.steps.map((st, k) => {
        const ws = b.ways(k);
        const real = ws.find(w => w.c === 0);
        return `<tr><td class="tz-kN">${k + 1}</td><td class="tz-kR"><b>${real.letter}</b> → § ${real.to}</td><td class="tz-kW">${ws.filter(w => w.c !== 0).map(w => `${w.letter} → § ${w.to}`).join(' · ')}</td><td class="tz-kTxt">${esc(st.right)}</td></tr>`;
      }).join('')}
    </table>
  </div>`).join('')}
  </div>
  <p class="tz-pathNote">ტელეფონით თამაშობთ? აპის „ჰიბრიდულში“ გზების რიგი ყოველ თამაშზე სხვაა — ასოები ტელეფონის ეკრანს მიჰყვება, არა ამ გასაღებს.</p>
</div>
${foot(`<span>${esc(title)} · მასწავლებლის გასაღები</span><span>${esc(SCHOOL)}</span>`)}`, 'tzKeyP');

// ---------- the cover and the rules ----------
const coverPage = no => page(`${stripe(TAG)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">${title}</h1>
  <div class="lead">ოთხი ნამდვილი ამბავი იმ ადამიანებზე, ვინც ქართული გალობა გადაარჩინა. ყოველ გასაყარზე სამი გზაა: ერთი ის, რაც წინაპარმა მართლა აირჩია, ორი — „რა მოხდებოდა, რომ…“. აირჩიე, გადადი მითითებულ §-ზე და ნახე, სად მიგიყვანა გზამ. ტელეფონი არ სჭირდება.<br><b>${META}</b></div>
  <div class="tz-heroes">${BOOKS.map(b => `<div class="tz-hero">${medal(b, 17)}<b style="color:${b.tint}">${esc(b.story.hero)}</b><span>${esc(b.story.years)} · ${b.n} გასაყარი</span></div>`).join('')}</div>
  <div class="tz-steps box">
    <div class="kz-step">${icon('book-open', { size: 6, color: C.wine, width: 1.7 })}<span>წაიკითხე <b>§ 1</b>: ამბავი და პირველი გასაყარი.</span></div>
    <div class="kz-step">${icon('split', { size: 6, color: C.wine, width: 1.7 })}<span>აირჩიე გზა — ა, ბ ან გ — და გადადი მის §-ზე.</span></div>
    <div class="kz-step">${icon('star', { size: 6, color: '#c9a227', width: 1.9 })}<span>ნამდვილი გზაა? <b>★ შენია.</b> სხვა გზაა? წაიკითხავ, სად მიგიყვანდა, და ნამდვილზე გადახვალ.</span></div>
    <div class="kz-step">${icon('flag', { size: 6, color: GREEN, width: 1.9 })}<span>ბოლოს — როგორ დასრულდა ამბავი და რამდენი ★ შეაგროვე.</span></div>
  </div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th></tr>
        <tr><td>წესები</td><td>1</td><td>1-ის ზურგი</td></tr>
        ${BOOKS.map(b => `<tr><td>${esc(b.story.hero)} — წიგნი-თამაში</td><td>${1 + 3 * b.n} §</td><td>${no(`book-${b.story.id}`)}–${no(`book-${b.story.id}-2`)}</td></tr>`).join('')}
        <tr><td>ა ბ გ ბარათები, 6 გუნდი</td><td>18</td><td>${no('vote1')}–${no('vote2')}</td></tr>
        <tr><td>„ჩემი გზა“ და ქულების ფურცელი</td><td>1</td><td>${no('path')}</td></tr>
        <tr><td>მასწავლებლის გასაღები</td><td>1</td><td>${no('key')}</td></tr>
      </table>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b>.</li>
        <li>ყოველი ამბავი ორ ფურცელზეა (ოთხი გვერდი) — დაბეჭდეთ იმდენი, რამდენი მკითხველიც (ან წყვილიც) გყავთ. კლასს ტელეფონის გარეშე ერთი ეგზემპლარი ჰყოფნის — მასწავლებელი კითხულობს.</li>
        <li>ა ბ გ ბარათები (${no('vote1')}–${no('vote2')}) — სქელ ქაღალდზე, ჭრა მონიშნული ხაზებით; თითო გუნდს თავისი ფერის სამი ბარათი. „ჩემი გზა“ — თითო მკითხველს.</li>
      </ol>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „აირჩიე შენი თავგადასავალი“ წიგნების იდეით. ფაქტები საგანძურის სკოლის აპის „წინაპრების“ ბიოგრაფიებიდანაა; სცენების სიტყვები, სხვა გზები და „რა მოხდებოდა“ Claude-მა დაწერა და მასწავლებელს ჯერ არ შეუმოწმებია. მხოლოდ სასკოლო, არაკომერციული გამოყენებისთვის — არ იყიდება.</div>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} · ${esc(TAG)}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');

const rulesOf = no => [
  ['რა გჭირდებათ', `ამბის ფურცელი, „ჩემი გზის“ ფურცელი (${no('path')}) და ფანქარი. კლასში — თითო გუნდს ა ბ გ ბარათები.`],
  ['მარტო ან წყვილებში', 'აირჩიე წინაპარი და დაიწყე § 1-დან. წაიკითხე ამბავი, მერე — სამი გზა. რომელს აირჩევდი? გადადი იმ §-ზე, რომელიც მის გვერდით წერია.'],
  ['§-ები შერეულია', 'ამბავი რიგზე არ წერია, რომ შემდეგი გასაყარი წინასწარ არ ჩანდეს. §-ს ნომრით ეძებ — როგორც სიტყვას ლექსიკონში; გვერდის ძირში წერია, რომელი §-ებია ზედ.'],
  ['★', 'ნამდვილი გზა აირჩიე? იქ წერია „★ შენია“ — გააფერადე ვარსკვლავი „ჩემი გზის“ ფურცელზე. სხვა გზაზე წაიკითხავ, სად მიგიყვანდა, და ნამდვილზე გადახვალ — ★-ის გარეშე. ამბავი ყოველთვის ნამდვილ გზას აგრძელებს.'],
  ['დასასრული', 'ბოლო § გეტყვის, როგორ დასრულდა ამბავი. დათვალე ★: ყველა ან ერთის გარდა ყველა — ★★★, ნახევარი ან მეტი — ★★, ნაკლები — ★. მერე სხვა წინაპრის გზა სცადე — ან იგივე, ახლა უკვე ნამდვილი გზით!'],
  ['მთელი კლასი, ტელეფონის გარეშე', `2–6 გუნდი, თითოს თავისი ფერის ა ბ გ ბარათები. მასწავლებელი § 1-ს ხმამაღლა კითხულობს; გუნდები თათბირობენ და ბარათს ერთდროულად სწევენ. მასწავლებლის გასაღებით (${no('key')}) ნამდვილი გზის ასო ჩანს: ვინც ის ასწია, ქულას იღებს. მერე იკითხება ნამდვილი გზის § — იქ შემდეგი გასაყარია. სურვილისამებრ — სხვა გზების §-ებიც: სად მიგვიყვანდა?`],
  ['მთელი კლასი, ტელეფონით', 'აპში: თამაშები → წინაპრის გზა → ჰიბრიდული. ტელეფონი ამბავს ჰყვება, გუნდები იმავე ბარათებს სწევენ, მასწავლებელი თითოეული გუნდის ასოს შეეხება — ქულებს აპი ითვლის და ბოლოს გამარჯვებულს აცხადებს. მთელი კლასი ერთად? ხელის აწევით აირჩიეთ.'],
  ['გაიცანი წინაპრები', 'ყოველი ამბის ბოლოს — „იცოდი?“. მთელი ბიოგრაფიები აპშია: „გაიცანი წინაპრები“. იქვე ისმის მათ მიერ გადარჩენილი საგალობლებიც.'],
];
const rulesPage = no => page(`${stripe(TAG, 'წესები')}
<div class="rulesWrap">
  <div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">წესები · 9 წლიდან · ერთი ამბავი 15–20 წუთი</div></div>
  <p class="lead">„წინაპრის გზა“ წიგნი-თამაშია: შენ თვითონ წყვეტ, რა გააკეთოს გმირმა, და ამბავი შენს არჩევანს მიჰყვება. ოღონდ აქ ამბები ნამდვილია — და გზაც, რომელიც წინაპრებმა აირჩიეს, ერთი იყო. გამოიცანი!</p>
  <div class="tz-ex box">
    <div class="tz-exSec">${section(BOOKS[3], 'S').replace('class="tz-sec tz-start"', 'class="tz-sec tz-start tz-mini"')}</div>
    <div class="tz-exR">
      <h3>ასე იკითხება</h3>
      <p>ეს არტემ ერქომაიშვილის ამბის § 1-ია. სამი გზიდან ერთი ნამდვილია — მის გვერდით მითითებულ §-ზე ★ გელოდება. დანარჩენ ორზე წაიკითხავ, სად წაგიყვანდა ის გზა.</p>
      <p class="small">რომელს აირჩევდი შენ? სცადე — ამბავი ფურცელზეა.</p>
    </div>
  </div>
  <div class="rules"><ol>${rulesOf(no).map(([h, t]) => `<li><b>${esc(h)}.</b> ${t}</li>`).join('')}</ol></div>
  <div class="kz-more box"><b>აპშიც</b> იგივე ამბებია: sagandzureli.ge → თამაშები → წინაპრის გზა — მარტო ტელეფონზე (გზების რიგი ყოველ ჯერზე სხვაა) და კლასში, ბარათებით.</div>
</div>
${foot(`<span>${esc(title)} · წესები</span><span>${esc(SCHOOL)}</span>`)}`, 'rulesP');

// a story's sections flow over its four pages: a page's columns give their last sections to the next page until they fit. When
// the last page still overflows, its notes' lines go first, then the book's type steps down a little; a book that does not fit
// even so stops the build. Room left on the last page becomes more lines for notes, an empty last page lifts its tracker to the
// top. Then each page's foot names its sections.
export const script = `(() => {
  const bad = [];
  const over = el => el.scrollWidth > el.clientWidth + 1;
  const mm = v => v * 96 / 25.4;
  const flow = parts => {
    for (let i = 1; i < parts.length; i++) while (parts[i].firstElementChild) parts[0].appendChild(parts[i].firstElementChild);
    // the last page's columns end above its tracker, however tall it is
    const last = parts[parts.length - 1];
    const tr = last.closest('.page').querySelector('.tz-track');
    if (tr) last.style.bottom = (tr.offsetHeight + mm(15) + mm(4)) + 'px';
    for (let i = 0; i + 1 < parts.length; i++) {
      while (over(parts[i]) && parts[i].lastElementChild) parts[i + 1].insertBefore(parts[i].lastElementChild, parts[i + 1].firstElementChild);
    }
    return !over(last);
  };
  document.querySelectorAll('.tz-cols.first').forEach(first => {
    const parts = [...document.querySelectorAll('.tz-cols[data-book="' + first.dataset.book + '"]')];
    const last = parts[parts.length - 1];
    const lastPg = last.closest('.page');
    let fits = flow(parts);
    if (!fits) { lastPg.classList.add('tz-tight'); fits = flow(parts); }
    for (const pt of [9.6, 9.3]) {
      if (fits) break;
      parts.forEach(el => { el.style.fontSize = pt + 'pt'; });
      fits = flow(parts);
    }
    if (!fits) bad.push(first.dataset.book);
    // room left on the last page: more lines for notes, as long as the story's end still fits in its two columns
    const tr = lastPg.querySelector('.tz-track');
    const lift = () => { last.style.bottom = (tr.offsetHeight + mm(15) + mm(4)) + 'px'; };
    if (fits && tr && last.querySelector('.tz-sec') && !lastPg.classList.contains('tz-tight')) {
      for (const line of tr.querySelectorAll('.tz-ruled.more')) {
        line.style.display = 'block';
        lift();
        if (over(last)) { line.style.display = ''; lift(); break; }
      }
    }
    parts.forEach(el => {
      const ns = [...el.querySelectorAll('.tz-sec')].map(s => s.dataset.no);
      const pg = el.closest('.page');
      const range = pg.querySelector('.tz-range');
      if (range) range.textContent = ns.length ? '§ ' + ns[0] + '–' + ns[ns.length - 1] : 'ჩემი გზა';
      if (!ns.length) { if (el === last) pg.classList.add('tz-free'); else bad.push(first.dataset.book + ' (an empty page)'); }
    });
  });
  document.querySelectorAll('.tz-key, .tz-path, .tz-scoreP').forEach(k => {
    const f = k.closest('.page').querySelector('.foot');
    if (f && k.lastElementChild.getBoundingClientRect().bottom > f.getBoundingClientRect().top - 2) bad.push(k.className + ' runs into its foot');
  });
  if (bad.length) throw new Error('tsinapris-gza: a page does not fit — ' + bad.join(' · '));
})()`;

export const css = `${coverCss}
.rtitle{white-space:nowrap}
.rulesP .rules{font-size:10pt;line-height:1.36}
.rulesP .rules li{margin-bottom:.9mm}
.rulesP .lead{font-size:10.6pt}
.kz-step{display:flex;gap:2.6mm;align-items:flex-start;font-size:10pt;line-height:1.35;margin-bottom:2mm}
.kz-step svg{flex:none;margin-top:.2mm}
.kz-more{margin-top:3mm;font-size:9.8pt;line-height:1.35}
.tz-heroes{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:0 0 4mm}
.tz-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.2mm;font-size:9pt;color:var(--muted)}
.tz-hero b{font-size:10.6pt;line-height:1.2}
.tz-steps{display:grid;grid-template-columns:1fr 1fr;gap:1mm 6mm;margin:0 0 5mm;padding:3.4mm 5mm}
.tz-medal{flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;border:.6mm solid;background:radial-gradient(circle at 50% 38%,#fffdf8 0%,#f6efe2 75%);box-shadow:inset 0 0 0 .8mm #fff,inset 0 0 0 1.05mm #c9a22788;line-height:1}
.tz-medal .aso{letter-spacing:0}
.tzBook .tz-head{display:flex;gap:5mm;align-items:center;padding:4.5mm 12mm 3mm;border-bottom:.3mm solid var(--gold);margin:0 0 3mm}
.tz-headT h2{margin:0;font-size:19pt;line-height:1.1}
.tz-sub{margin:.6mm 0 0;font-size:9.6pt;color:var(--muted);font-weight:700}
.tz-how{margin:1.2mm 0 0;font-size:9.4pt;line-height:1.3}
.tz-cols{position:absolute;left:12mm;right:12mm;bottom:15mm;column-count:2;column-gap:7mm;column-fill:auto;overflow:hidden;font-size:9.9pt;line-height:1.34}
.tz-cols.first{top:52mm}
.tz-cols:not(.first){top:16mm}
.tz-cols.last{bottom:84mm}
.tz-track{position:absolute;left:12mm;right:12mm;bottom:15mm;border-top:.3mm solid var(--gold);padding-top:1mm}
.tz-track .tz-pRow{margin:0 0 1mm}
.tz-free .tz-cols{display:none}
.tz-free .tz-track{top:16mm;bottom:auto;border-top:0}
.tz-notes{margin:2mm 0 1.6mm;font-weight:800;color:var(--wine);font-size:11pt}
.tz-ruled{margin:0;height:9mm;border-bottom:.25mm solid #d9cbb3}
.tz-ruled.more{display:none}
.tz-free .tz-ruled.more{display:block}
.tz-tight .tz-notes.n2,.tz-tight .tz-ruled{display:none}
.tz-sec{margin:0 0 3.4mm;padding:0 0 3mm;border-bottom:.25mm dashed #d9cbb3}
.tz-sec p,.tz-ways{break-inside:avoid}
.tz-no,.tz-whatH,.tz-when,.tz-ask,.tz-endH,.tz-star{break-after:avoid}
.tz-no{margin:0 0 1.2mm;font-weight:800;font-size:12pt}
.tz-no span{display:inline-block;border:.4mm solid;border-radius:1.6mm;padding:.1mm 2.2mm}
.tz-intro{margin:0 0 2mm;font-style:italic}
.tz-when{margin:1.6mm 0 1mm;display:flex;align-items:center;gap:2mm;font-size:8.8pt;color:var(--muted);font-weight:700}
.tz-when b{color:#fff;border-radius:2.4mm;padding:.2mm 2.2mm;font-size:9pt}
.tz-scene{margin:0 0 1.2mm}
.tz-ask{margin:0 0 1.2mm;font-weight:800;font-size:10.6pt}
.tz-ways{list-style:none;margin:0;padding:0}
.tz-ways li{display:flex;align-items:flex-start;gap:1.8mm;margin:0 0 1.1mm}
.tz-l{flex:none;width:5.2mm;height:5.2mm;border:.35mm solid;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:9.4pt;line-height:1;margin-top:.1mm}
.tz-w{flex:1}
.tz-go{flex:none;font-weight:800;white-space:nowrap;color:var(--wine)}
.tz-star{display:flex;gap:1.6mm;align-items:flex-start;margin:0 0 1.2mm;font-size:9.2pt;color:#7a5c0a}
.tz-star svg{flex:none;margin-top:.1mm}
.tz-real,.tz-then{margin:0 0 1.4mm;padding:.4mm 0 .4mm 2.6mm;border-left:.9mm solid}
.tz-whatH{margin:0 0 .8mm;font-weight:800;color:${AMBER};font-size:9.6pt}
.tz-back{margin:0;font-size:9.4pt}
.tz-end{margin-top:1.6mm}
.tz-endH{margin:0 0 .8mm;font-weight:800;font-size:11pt}
.tz-end p{margin:0 0 1.2mm}
.tz-fact{background:var(--paper);border-radius:1.6mm;padding:1.4mm 2mm}
.tz-fact b{color:#8a6416}
.tz-count{font-size:9.2pt}
.tz-vote .tz-vl{position:absolute;left:0;right:0;top:15mm;text-align:center;font-weight:900;font-size:92pt;line-height:1}
.tz-vote.b .tz-vl{color:#fff}
.tz-vote .tz-vt{position:absolute;left:5mm;right:5mm;bottom:6mm;height:9mm;border-radius:4.5mm;color:#fff;font-weight:700;font-size:9.6pt;display:flex;align-items:center;justify-content:center;white-space:nowrap}
.tz-vote.b .tz-vt{background:#ffffff26}
.tz-path,.tz-scoreP,.tz-key{padding:6mm 12mm 0}
.tz-pathHead{display:flex;align-items:baseline;justify-content:space-between;gap:6mm;border-bottom:.3mm solid var(--gold);padding-bottom:1.6mm;margin-bottom:3mm}
.tz-path h2,.tz-scoreP h2,.tz-key h2{margin:0;color:var(--wine);font-size:18pt}
.tz-pathHead p{margin:0;font-size:11pt;display:flex;align-items:baseline;gap:2mm}
.tz-lineIn{display:inline-block;width:62mm;border-bottom:.3mm solid var(--brown)}
.tz-pathHow{margin:0 0 4mm;font-size:10pt;line-height:1.38}
.tz-pRow{border:.45mm solid;border-radius:3mm;padding:3.4mm 4mm;margin:0 0 4.4mm;display:grid;grid-template-columns:48mm 1fr 20mm;gap:2.6mm;align-items:center}
.tz-pWho{display:flex;gap:2.4mm;align-items:center}
.tz-pWho>div{min-width:0}
.tz-pWho>div>b{display:block;font-size:9.8pt;line-height:1.15}
.tz-pWho>div>span{display:block;font-size:8.6pt;color:var(--muted)}
.tz-pForks{display:flex;gap:1.4mm}
.tz-pF{width:11.4mm;display:flex;flex-direction:column;align-items:center;gap:.8mm}
.tz-pN{font-size:8.6pt;font-weight:800;color:var(--muted)}
.tz-pBox{width:10mm;height:10mm;border:.35mm solid var(--brown);border-radius:1.6mm;background:#fff}
.tz-pY{font-size:6.6pt;color:var(--muted);white-space:nowrap}
.tz-pSum{display:flex;flex-direction:column;align-items:center;gap:1mm;font-size:9pt;color:var(--muted)}
.tz-pSum b{font-size:12pt;color:var(--brown)}
.tz-pStars{display:flex;gap:.6mm}
.tz-pathNote{margin:2mm 0 0;font-size:9.4pt;color:var(--muted);text-align:center}
.tz-mine{margin-top:6mm;padding:3.4mm 5mm 4mm}
.tz-mineH{margin:0 0 1.2mm;display:flex;align-items:center;gap:2mm;font-weight:800;color:var(--wine);font-size:12pt}
.tz-mineQ{margin:0 0 1mm;font-size:9.8pt;line-height:1.38}
.tz-mineL{margin:0;height:8.4mm;border-bottom:.25mm solid #d9cbb3;display:flex;align-items:flex-end;padding-bottom:.6mm;font-size:8.8pt;color:var(--muted)}
.tz-score{margin:0 0 7mm}
.tz-scoreT{margin:0 0 2mm;font-size:11pt;display:flex;align-items:baseline;gap:2mm}
.tz-score table{font-size:10pt}
.tz-score th{text-align:center !important}
.tz-score td{height:11mm;vertical-align:middle !important}
.tz-score td:first-child{width:42mm;font-weight:700}
.tz-score td i{display:inline-block;width:3.4mm;height:3.4mm;border-radius:50%;margin-right:2mm;vertical-align:-.4mm}
.tz-keys{display:grid;grid-template-columns:1fr;gap:2.6mm}
.tz-kHead{margin:0 0 1mm;display:flex;align-items:center;gap:2.2mm;font-size:10.6pt}
.tz-kHead span:last-child{margin-left:auto;font-size:9pt;color:var(--muted);font-weight:700}
.tz-kT{font-size:8.5pt;line-height:1.3}
.tz-kT td{padding:.55mm 1.4mm !important;vertical-align:middle !important}
.tz-kN{width:6mm;text-align:center !important;font-weight:800;color:var(--muted)}
.tz-kR{width:20mm;white-space:nowrap;color:${GREEN}}
.tz-kR b{font-size:9.8pt}
.tz-kW{width:36mm;white-space:nowrap;color:var(--muted)}
.tz-kTxt{color:var(--brown)}
.tz-ex{display:grid;grid-template-columns:96mm 1fr;gap:5mm;align-items:start;margin:0 0 3.4mm;padding:3mm 4mm}
.tz-mini{font-size:8.6pt;line-height:1.3;margin:0;padding:0;border:0}
.tz-mini .tz-ask{font-size:9.2pt}
.tz-exR h3{margin:0 0 1.6mm;color:var(--wine);font-size:11pt}
.tz-exR p{margin:0 0 1.6mm;font-size:9.6pt;line-height:1.35}
.cover .lead{margin-bottom:4mm}
`;

const SHEETS = [
  { key: 'cover' },
  ...BOOKS.flatMap(bookSheets),
  ...voteSheets,
  { key: 'path', front: pathPage, back: scorePage },
  { key: 'key', front: keyPage },
];
const no = k => sheetNo(SHEETS, k);
SHEETS[0].front = coverPage(no);
SHEETS[0].back = rulesPage(no);

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
