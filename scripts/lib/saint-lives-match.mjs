// Which of orthodoxy.ge's lives (src/data/library/saintLives.json) belongs to a calendar commemoration.
// Used by fetch-saint-lives.mjs and fetch-church-calendar.mjs.
//
// The calendar writes names in the genitive ("მღვდელმოწამისა ფოკა სინოპელ ეპისკოპოსისა"), the lives in the
// nominative ("მღვდელმოწამე ფოკა, სინოპელი ეპისკოპოსი"): both are cut to word stems, the words that only
// say what kind of saint are dropped, and a commemoration takes the life of the same (old-style) day that
// shares the most names with it. A life of another day is taken only when every name matches and no other
// life could be meant (a second commemoration of the same saint).
//
// Each linked commemoration gets  l: "<life id>"  and  at: [paragraph, start, end] — where its name stands
// in the day's text, so the calendar can make it a link.

// words that tell the rank, not the person
const GENERIC = new Set(
  (
    'წმიდა წმინდა წმიდისა წმინდისა წმიდათა წმინდათა წმიდანი წმიდანთა წმიდანისა წმ ' +
    'ღირსი ღირსისა ღირსთა ღირსნი ღირსმოწამე ღირსმოწამისა ღირსმოწამეთა ღირსმოწამენი ' +
    'მოწამე მოწამისა მოწამეთა მოწამენი მოწამეთას დიდმოწამე დიდმოწამისა ქალწულმოწამე ქალწულმოწამისა ' +
    'მღვდელმოწამე მღვდელმოწამისა მღვდელმოწამეთა მღვდელმოწამენი ახალმოწამე ახალმოწამისა ახალმოწამეთა ახალმოწამენი ' +
    'მოციქული მოციქულისა მოციქულთა მოციქულნი მოციქულთასწორი მოციქულთასწორისა მოციქულთა სწორი სწორისა ' +
    'მართალი მართლისა მართალთა მართალნი წინასწარმეტყველი წინასწარმეტყველისა წინასწარმეტყველნი წინასწარმეტყველთა ' +
    'ეპისკოპოსი ეპისკოპოსისა ეპისკოპოსთა მთავარეპისკოპოსი მთავარეპისკოპოსისა მიტროპოლიტი მიტროპოლიტისა ' +
    'პატრიარქი პატრიარქისა კათოლიკოსი კათოლიკოსისა კათოლიკოს პატრიარქისა ხუცესი ხუცისა ხუცესთა ზუცესთა ' +
    'დიაკონი დიაკონისა დიაკონთა დედათდიაკონისა მღვდელი მღვდლისა მღვდელმონაზონი მღვდელმონაზონისა არქიმანდრიტი არქიმანდრიტისა ' +
    'იღუმენი იღუმენისა ბერი ბერისა მონაზონი მონაზონისა მამასახლისი მამასახლისისა ' +
    'მამა მამაჲ მამისა მამათა მამანი დედა დედისა დედაჲ ჩვენი ჩვენისა ჩვენნი ჩვენთა და ხსენება ხსენებაჲ ' +
    'მეფე მეფისა მეფეთა დედოფალი დედოფლისა კეთილმსახური კეთილმსახურისა კეთილმსახურნი დიდებული დიდებულისა ' +
    'აღმსარებელი აღმსარებელისა აღმსარებლისა აღმსარებელთა ქალწული ქალწულისა ნეტარი ნეტარისა ' +
    'სასწაულთმოქმედი სასწაულთმოქმედისა საკვირველთმოქმედი საკვირველთმოქმედისა დიდი დიდისა ' +
    'სამოცდაათთაგანი სამოცდაათთაგანისა თაგანისა თაგანი თორმეტთაგანი თორმეტთაგანისა ' +
    'მის მისი მისნი მისთა მისისა მათი მათთანა მათთა თანა რომელი რომელნი რომელიც რომელსა ერქვა იყო იწამნეს იწამა ' +
    'ქრისტეს ქრისტეშობამდე შობამდე ქრ ს საუკ დაახლ ახ წ შ მდე ძველი ახალი სხვათა სხვანი სხვა ' +
    'ნაწილთა ნაწილების აღმოყვანება გადასვენება ისა ისი სა სი ის'
  ).split(' '),
);

// the kind of saint, to tell a martyr Mina from the venerable Mina when looking beyond the day
// (several, when a page is about several saints); "მოციქულთა სწორი" is not an apostle
const KINDS = [
  ['ღირსმოწამ', 'ღირსმოწამე'], ['ღირსიმოწამ', 'ღირსმოწამე'], ['მღვდელმოწამ', 'მღვდელმოწამე'], ['ახალმოწამ', 'მოწამე'], ['დიდმოწამ', 'მოწამე'],
  ['ქალწულმოწამ', 'მოწამე'], ['მოწამ', 'მოწამე'], ['ღირს', 'ღირსი'], ['მოციქულთასწორ', ''], ['მოციქულ', 'მოციქული'],
  ['წინასწარმეტყველ', 'წინასწარმეტყველი'], ['მართალ', 'მართალი'], ['მართლ', 'მართალი'],
];
const kindsOf = (s) => {
  const out = new Set();
  for (const w of s.replace(/მოციქულთა\s+სწორ/g, 'მოციქულთასწორ').split(/[^ა-ჰ]+/))
    for (const [pre, k] of KINDS) if (w.startsWith(pre)) { if (k) out.add(k); break; }
  return [...out];
};
// every kind of martyr goes with the others; a venerable martyr is also venerable
const FAMILY = { მოწამე: 'm', მღვდელმოწამე: 'm', ღირსმოწამე: 'mv', ღირსი: 'v' };
const kin = (a, b) => a === b || [...(FAMILY[a] || '')].some((f) => (FAMILY[b] || '').includes(f));
const kindsAgree = (as, bs) => !as.length || !bs.length || as.some((a) => bs.some((b) => kin(a, b)));
// an apostle or a prophet is never a monk or a martyr of the same name
const CALLED = /მოციქული|წინასწარმეტყველი/;
const kindsClash = (as, bs) => as.length && bs.length && !kindsAgree(as, bs) && (as.some((a) => CALLED.test(a)) !== bs.some((b) => CALLED.test(b)));

// genitive → stem: ბასილისა/ბასილი → ბასილ, იონასი/იონა → იონა, პეტრესი/პეტრე → პეტრე,
// and the Greek ending: ისიხიოსისა/ისიხიოსი/ისიხი → ისიხ, ტერტიოსი/ტერტისა → ტერტ
const VOWEL = /[აეოუ]$/;
const stem = (w) => {
  if (/(ისა|ისი)$/.test(w) && w.length > 5) w = w.slice(0, -3);
  else if (/(ოსი|ოზი|უსი)$/.test(w)) w = w.slice(0, -1);
  else if (/(სა|სი)$/.test(w) && VOWEL.test(w.slice(0, -2)) && w.length > 4) return w.slice(0, -2);
  else if (/ჲ$/.test(w)) w = w.slice(0, -1);
  if (/(ოს|ოზ|უს)$/.test(w) && w.length > 5) w = w.slice(0, -2);
  if (/ი$/.test(w) && w.length > 3) w = w.slice(0, -1);
  return w;
};
// dates and centuries say nothing about who: "(+67-ის შემდეგ)", "(VIII ს. ქრისტეს შობამდე)" — but a
// bracketed surname or other name stays: "(ხმალაძე, XIX)", "(ივერიელი)"
const DATED = /\d|(?:^|[^A-Z])[IVX]+(?:[^A-Z]|$)|დაახლ|საუკ/;
const undated = (s) => s.replace(/\(([^()]*)\)/g, (m, inner) => ' ' + inner.split(/[,;]/).filter((p) => !DATED.test(p)).join(' ') + ' ');
export const nameWords = (s) => [
  ...new Set(
    undated(s)
      .split(/[^ა-ჰ]+/)
      .filter((w) => w.length > 2 && !GENERIC.has(w))
      .map(stem),
  ),
];
const datedOut = (d) => (d ? d.split(/[,;]/).filter((p) => !DATED.test(p)).join(' ') : '');

// a place or people the saint is named after ("ანტიოქიელ", "სერბ", "ქართლს") — not the name itself
const PLACE = new Set(['ქართლს', 'ქართლ', 'სერბ', 'სპარს', 'ასურ', 'ბერძენ', 'ბულგარ', 'სომეხ', 'ებრაელ', 'ეგვიპტ', 'რუს', 'ბერძნ']);
// names that only look like "-ელი" places
const EL_NAMES = new Set(['დანიელ', 'მიქაელ', 'გაბრიელ', 'სამოელ', 'სამუელ', 'რაფაელ', 'ეზეკიელ', 'იოველ', 'ნათანაელ', 'ისრაელ', 'ურიელ', 'სელაფიელ', 'ეგუდიელ', 'ემანუელ', 'მანუელ', 'იერემიელ']);
// "-ელი" that is a calling, not a place: მკითხველი, კანონმთქმელი, აღმაშენებელი
const EL_DOERS = /მკითხველ|მთქმელ|მშობელ|მხილველ|შენებელ|მეტყველ|მთარგმნელ|მზრდელ|დამწინდველ|მწყემს/;
const isPlace = (w) => (/ელ$/.test(w) && !EL_NAMES.has(w) && !EL_DOERS.test(w)) || (/ის$/.test(w) && w.length >= 6) || /შ$/.test(w) || PLACE.has(w);
// the place itself: ანტიოქიელ / ანტიოქიის → ანტიოქი, სერბეთის / სერბელ → სერბ, ასურელ / სირიელ → სირი
const placeRoot = (w) => w.replace(/(ეთის|ეთშ|იდან|ელ|ის|შ|ს)$/, '').replace(/^ასურ/, 'სირი');
// two spellings of one place: ტრაპეზუნტელ / ტრაპიზონელ, ლიმნელ / ლემნოსელ, დურაჰის / დირექიელ
const distance = (a, b) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return prev[b.length];
};
const samePlace = (a, b) => {
  const x = placeRoot(a), y = placeRoot(b);
  return Math.min(x.length, y.length) >= 3 && distance(x, y) <= 0.5 * Math.max(x.length, y.length);
};
const same = (a, b) => {
  if (a === b) return true;
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  return s.length >= 4 && l.length - s.length <= 1 && l.startsWith(s);
};
// spelling varies between the two (სვინკლიტიკია / სინკლიტიკია, მავსიმე / მაქსიმე): one letter apart,
// two in a long word — used only among the lives of the same day
const near = (a, b) => {
  if (same(a, b)) return true;
  const n = Math.min(a.length, b.length);
  const max = n >= 8 ? 2 : n >= 4 ? 1 : 0;
  if (!max || Math.abs(a.length - b.length) > max) return false;
  return distance(a, b) <= max;
};

// Is this pair of a commemoration and a life a mistake, though they share a word?
//  · only a place matches, and the commemoration's own name doesn't: "ვლადისლავ სერბი" ≠ "სტეფანე სერბი"
//  · one shared name, and the places contradict each other: "პალადი ალექსანდრიელი" ≠ "პალადი თესალონიკელი",
//    "ათანასე კონსტანტინეპოლელი" ≠ "ათანასე დიდი, ალექსანდრიის მთავარეპისკოპოსი"
//  · one shared name, and the ranks differ: "ღირსი თათე (თადეოზ)" ≠ "მოციქული თადეოზი"
//  · two long lists that share some name further down: the Tao-Klarjeti fathers ≠ the Moscow hierarchs
function mismatch(itemW, lifeW, hit, itemKinds, lifeKinds, common) {
  const missed = itemW.filter((w) => !hit.includes(w));
  if (kindsClash(itemKinds, lifeKinds)) return true;
  if (hit.every(isPlace) && missed.some((w) => !isPlace(w))) return true;
  const lifeHit = lifeW.filter((b) => hit.some((a) => near(a, b)));
  if (hit.length === 1) {
    if (common && !kindsAgree(itemKinds, lifeKinds)) return true;
    // the saint's "-ელი" or "of …" ("ლავრაში", "მონასტერში" say where it happened, not who)
    const epithet = (w) => isPlace(w) && !/შ$/.test(w);
    const itemPlaces = missed.filter(epithet);
    const lifePlaces = lifeW.filter((b) => !lifeHit.includes(b) && epithet(b));
    if (
      itemPlaces.length && lifePlaces.length &&
      !itemPlaces.some((a) => lifeW.some((b) => samePlace(a, b))) &&
      !lifePlaces.some((b) => itemW.some((a) => samePlace(a, b)))
    ) return true;
  }
  return hit[0] !== itemW[0] && hit.length / itemW.length < 0.25 && lifeHit.length / lifeW.length < 0.25;
}
const shared = (aw, bw, eq = same) => aw.filter((a) => bw.some((b) => eq(a, b))).length;

// "საბა II-ისა", "გრიგოლ V": the number that tells namesakes apart
const ordinal = (s) => (s.replace(/\([^)]*\)/g, ' ').match(/(?:^|\s)([IVX]+)(?=[\s,-]|$)/) || [])[1] || '';

const pad = (n) => String(n).padStart(2, '0');
// old-style date of a new-style day (the Julian calendar is 13 days behind in 1900–2099)
const oldStyle = (iso) => {
  const t = new Date(iso + 'T12:00:00Z');
  t.setUTCDate(t.getUTCDate() - 13);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};

// where a commemoration's words stand in the day's text (the paragraphs it was cut from)
function locate(paras, n, d, from) {
  const want = n.replace(/\s+/g, ' ').trim();
  for (let pi = from.pi; pi < paras.length; pi++) {
    const p = paras[pi];
    if (!p.length) break;
    const plain = p.map((r) => r[0]).join('');
    // a whitespace-insensitive search: the commemoration's spaces may be line breaks in the text
    const map = [];
    let norm = '';
    for (let i = 0; i < plain.length; i++) {
      if (/\s/.test(plain[i])) {
        if (norm.endsWith(' ') || !norm) continue;
        norm += ' ';
      } else norm += plain[i];
      map.push(i);
    }
    const startAt = pi === from.pi ? from.at : 0;
    let k = norm.indexOf(want, map.findIndex((i) => i >= startAt) >>> 0);
    if (k < 0) continue;
    const start = map[k];
    let end = map[k + want.length - 1] + 1;
    // the trailing "(…)" belongs to it
    if (d) {
      const tail = plain.slice(end).match(/^\s*\(/);
      if (tail) {
        let depth = 0, i = end + tail[0].length - 1;
        for (; i < plain.length; i++) {
          if (plain[i] === '(') depth++;
          else if (plain[i] === ')' && --depth === 0) break;
        }
        if (i < plain.length) end = i + 1;
      }
    }
    return [pi, start, end];
  }
  return null;
}

// "წინადაცვეთა უფლისა… ქრისტესი. ხსენება წმიდისა ბასილი დიდისა…": a feast and a saint in one line. Each
// sentence finds its own life; a "." after an abbreviation ("წმ.", "აღმოყ.") doesn't end one.
const ABBR = /(?:^|[\s(.])(წმ|ს|ქრ|შ|აღმოყ|ნაწ|ახ|სტ|ძვ|წ|დაახლ|ღირ|მღვდ)$/;
function sentences(n) {
  const out = [];
  let start = 0;
  for (const m of n.matchAll(/\.\s+(?=[ა-ჰ„(])/g)) {
    if (ABBR.test(n.slice(start, m.index))) continue;
    out.push([start, m.index]);
    start = m.index + m[0].length;
  }
  out.push([start, n.length]);
  return out;
}

/** marks the commemorations of one calendar year (src/data/calendar/<year>.json) with their lives */
export function linkCalendarYear(cal, allLives) {
  // the longer versions and chapters (x) open from their lives, not from the calendar
  const lives = allLives.filter((l) => !l.x);
  const byDay = new Map();
  const words = new Map();
  const kinds = new Map();
  const wordCount = new Map();
  for (const l of lives) {
    const w = nameWords(l.t);
    words.set(l.id, w);
    kinds.set(l.id, kindsOf(l.t));
    for (const x of w) wordCount.set(x, (wordCount.get(x) || 0) + 1);
    if (!l.m) continue;
    const k = `${l.m}-${l.d}`;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(l);
  }

  // a name more than one life carries ("იოანე", "თადეოზ"); a rare one ("სნანდულია") is the same saint
  // even when the two sources call him differently
  const commonMemo = new Map();
  const common = (w) => {
    if (!commonMemo.has(w)) {
      let n = 0;
      for (const [x, c] of wordCount) if (near(w, x)) n += c;
      commonMemo.set(w, n > 1);
    }
    return commonMemo.get(w);
  };

  let total = 0, linked = 0;
  for (const [iso, day] of Object.entries(cal.days)) {
    const { y, m, d } = oldStyle(iso);
    const pool = [...(byDay.get(`${m}-${d}`) || [])];
    // in a common year the lives of 29 February are read on the 28th
    if (m === 2 && d === 28 && y % 4 !== 0) pool.push(...(byDay.get('2-29') || []));

    // what is matched: each commemoration, or each sentence of one that holds a feast and a saint
    const units = [];
    for (const s of day.s) {
      delete s.l;
      delete s.at;
      delete s.ls;
      const parts = sentences(s.n);
      parts.forEach(([a, b], k) => {
        const text = s.n.slice(a, b);
        const last = k === parts.length - 1;
        units.push({ s, k, a, b, text, last, w: nameWords(`${text} ${last ? datedOut(s.d) : ''}`), kinds: kindsOf(text) });
      });
    }

    // the same day: the best pairs first, one life per commemoration
    const pairs = [];
    units.forEach((u, i) =>
      pool.forEach((l, j) => {
        const lw = words.get(l.id);
        const hit = u.w.filter((a) => lw.some((b) => near(a, b)));
        if (!hit.length || mismatch(u.w, lw, hit, u.kinds, kinds.get(l.id), common(hit[0]))) return;
        // where the shared names start in the commemoration: of two lives, the one it names first
        pairs.push({ i, j, n: hit.length, cover: hit.length / u.w.length, hit, pos: u.w.indexOf(hit[0]) });
      }),
    );
    pairs.sort((a, b) => b.n - a.n || b.cover - a.cover || a.pos - b.pos || a.j - b.j);
    const named = new Map(); // life → the names the commemorations already linked to it share with it
    for (const p of pairs) {
      const u = units[p.i];
      if (u.l) continue;
      const life = pool[p.j];
      // a life already taken (a page about several saints): only for other names on it, not a namesake
      // ("მოწამისა ირინესი" beside "ქალწულმოწამეთა: აღაპიასი, ირინესი და ქიონიასი")
      const before = named.get(life.id);
      if (before && (p.cover < 0.5 || p.hit.every((w) => before.some((b) => near(w, b))))) continue;
      u.l = life.id;
      named.set(life.id, [...(before || []), ...p.hit]);
    }

    // another day (a second commemoration of the same saint): the name and the epithet both match
    // ("თერაპონტ კვიპრელ"), the life is mostly about this one, numbers ("გრიგოლ V") agree, and no other
    // life fits. A lone name is never enough — Samson the judge is not Sampson the hospitable.
    for (const u of units) {
      if (u.l || u.w.length < 2 || u.s.b) continue;
      const num = ordinal(u.text);
      const fits = lives.filter((l) => {
        const lw = words.get(l.id);
        if (shared(u.w, lw) < u.w.length || shared(lw, u.w) < lw.length / 2) return false;
        if (ordinal(l.t) !== num) return false;
        return kindsAgree(u.kinds, kinds.get(l.id));
      });
      if (fits.length === 1) u.l = fits[0].id;
    }

    // onto the calendar: l + at for a commemoration, ls = [[from, to (in n), life, paragraph, start, end]]
    // when its sentences are linked one by one
    let from = { pi: 0, at: 0 };
    const advance = (at) => { if (at) from = { pi: at[0], at: at[2] }; return at; };
    for (const s of day.s) {
      total++;
      const us = units.filter((u) => u.s === s);
      // neighbouring sentences of one life make one link ("მიძინება … მარიამისა. მარიამობა")
      const hits = [];
      for (const u of us.filter((x) => x.l)) {
        const prev = hits[hits.length - 1];
        if (prev && prev.l === u.l && prev.k === u.k - 1) Object.assign(prev, { b: u.b, k: u.k, last: u.last, text: s.n.slice(prev.a, u.b) });
        else hits.push({ ...u });
      }
      if (!hits.length) continue;
      linked++;
      if (hits.length === 1 && hits[0].a === 0 && hits[0].last) {
        s.l = hits[0].l;
        const at = advance(locate(day.p, s.n, s.d, from));
        if (at) s.at = at;
      } else {
        s.ls = hits.map((u) => [u.a, u.b, u.l, ...(advance(locate(day.p, u.text, u.last && s.d, from)) || [])]);
      }
    }
  }
  return { total, linked };
}

export const _test = { nameWords, stem, same, near, mismatch, datedOut, oldStyle, pad, kindsOf };
