// Downloads one church year of orthodoxy.ge's day calendar ("მხოლოდ თანამედროვე ქართული კალენდარი")
// into src/data/calendar/<year>.json for the footer calendar and the "today's saints" card.
//
//   node scripts/fetch-church-calendar.mjs 2026            → the whole year
//   node scripts/fetch-church-calendar.mjs 2026 2209 3003  → just print those days (DDMM, old style)
//
// orthodoxy.ge keeps one folder per OLD-style year: calendar/<year>/v2/<MM>/<DDMM>.htm, so folder 2026
// covers 14 January 2026 – 13 January 2027 (new style). Run it again when the next year is published.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.orthodoxy.ge/calendar';
const OFFSET_DAYS = 13; // Julian → Gregorian, 1900–2099

const [yearArg, ...only] = process.argv.slice(2);
const YEAR = Number(yearArg);
if (!YEAR) {
  console.error('usage: node scripts/fetch-church-calendar.mjs <old-style year> [DDMM …]');
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, '0');
const julianDays = (y, m) => [31, y % 4 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
const newStyleIso = (y, m, d) => {
  const t = new Date(Date.UTC(y, m - 1, d + OFFSET_DAYS));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', hellip: '…' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m,
  );
const textOf = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// run flags
const BOLD = 1, RED = 2, SMALL = 4;
const RED_COLORS = /#?(800000|ff0000|c00000|990000|a00000|maroon|red)\b/i;

function styleOf(tag, attrs) {
  const st = {};
  if (tag === 'b' || tag === 'strong') st.bold = true;
  if (tag === 'i' || tag === 'em') st.italic = true;
  const style = (attrs.match(/style\s*=\s*"([^"]*)"/i) || attrs.match(/style\s*=\s*'([^']*)'/i) || [])[1] || '';
  if (/font-weight\s*:\s*(700|bold)/i.test(style)) st.bold = true;
  if (/font-size\s*:\s*(1[0-2]px|[0-9](\.\d+)?pt|small|x-small)/i.test(style)) st.small = true;
  const size = (attrs.match(/\bsize\s*=\s*"?(\d)/i) || [])[1];
  if (tag === 'font' && size && Number(size) <= 2) st.small = true;
  const color = (attrs.match(/\bcolor\s*=\s*"?([#\w]+)/i) || [])[1] || (style.match(/(?:^|;)\s*color\s*:\s*([#\w]+)/i) || [])[1];
  if (color) st.red = RED_COLORS.test(color);
  return st;
}

const BR = '\u0000';
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input']);
const BLOCK = new Set(['p', 'div', 'tr', 'td', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'ul', 'ol']);

// HTML after the header table → paragraphs of [text, flags] runs; [] marks a blank line in the source
function paragraphs(html) {
  const out = [];
  let cur = null;
  const stack = [];
  const flags = () => {
    let f = 0, red;
    for (const s of stack) {
      if (s.st.bold) f |= BOLD;
      if (s.st.small) f |= SMALL;
      if (s.st.red !== undefined) red = s.st.red;
    }
    return red ? f | RED : f;
  };
  const flush = () => {
    if (!cur) return;
    // merge runs, collapse whitespace
    const runs = [];
    for (const [t, f] of cur) {
      const text = t === BR ? '\n' : t.replace(/\s+/g, ' ');
      const last = runs[runs.length - 1];
      if (last && last[1] === f) last[0] += text;
      else runs.push([text, f]);
    }
    // trim the paragraph's ends and spaces around line breaks
    for (const r of runs) r[0] = r[0].replace(/ *\n */g, '\n');
    while (runs.length && !runs[0][0].replace(/^[\s\n]+/, '')) runs.shift();
    while (runs.length && !runs[runs.length - 1][0].replace(/[\s\n]+$/, '')) runs.pop();
    if (runs.length) {
      runs[0][0] = runs[0][0].replace(/^[\s\n]+/, '');
      runs[runs.length - 1][0] = runs[runs.length - 1][0].replace(/[\s\n]+$/, '');
    }
    const plain = runs.map((r) => r[0]).join('').trim();
    if (!plain) {
      if (out.length && out[out.length - 1].length) out.push([]);
    } else {
      // a run that is only spaces takes its neighbour's flags (keeps the JSON small)
      out.push(runs.filter((r) => r[0]).map((r) => (r[1] ? [r[0], r[1]] : [r[0]])));
    }
    cur = null;
  };
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      const t = decode(m[4]);
      if (!t.trim() && !cur) continue;
      (cur ||= []).push([t, flags()]);
      continue;
    }
    if (!m[2]) continue;
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (tag === 'br') {
      (cur ||= []).push([BR, flags()]);
      continue;
    }
    if (BLOCK.has(tag)) flush();
    // an opened <p> counts even when it holds only &nbsp; (a blank line between parts)
    if (tag === 'p' && !close) cur = [];
    if (VOID.has(tag)) continue;
    if (close) {
      const i = stack.map((s) => s.tag).lastIndexOf(tag);
      if (i >= 0) stack.length = i;
    } else {
      stack.push({ tag, st: styleOf(tag, m[3]) });
    }
  }
  flush();
  while (out.length && !out[out.length - 1].length) out.pop();
  while (out.length && !out[0].length) out.shift();
  return out;
}

const plainOf = (p) => p.map((r) => r[0]).join('');
const isSmall = (p) => {
  let small = 0, all = 0;
  for (const [t, f = 0] of p) {
    const n = t.replace(/\s/g, '').length;
    all += n;
    if (f & SMALL) small += n;
  }
  return all > 0 && small / all > 0.5;
};

// readings and service notes ("ლიტ.: საქმ. 5: 21-33 (დას. 15)") — never commemorations
const READINGS = /\(დას\.|^(ლიტ|ცისკ|მწუხრ|VI ჟამ|შენიშვნა)/;

// The day's commemorations, one item per saint/feast, as written: the paragraphs at the top
// (until the first blank line), split on ";" outside brackets and after a closing "(date)."
function commemorations(paras) {
  const items = [];
  for (const p of paras) {
    if (!p.length) break;
    const text = plainOf(p).trim();
    // some days set the saints in small print too; readings are what ends the list
    if (isSmall(p) && (items.length || READINGS.test(text))) break;
    if (/^[(*]/.test(text) || READINGS.test(text)) continue;
    // characters marked bold, to tell feasts (bold) from the rest
    const chars = [];
    for (const [t, f = 0] of p) for (const ch of t) chars.push([ch, (f & BOLD) !== 0]);
    const pieces = [];
    let buf = [], depth = 0;
    const push = () => { if (buf.length) pieces.push(buf); buf = []; };
    // a bold opening that ends with "." (the feast's name) is its own item
    let k = 0;
    while (k < chars.length && /\s/.test(chars[k][0])) k++;
    if (k < chars.length && chars[k][1]) {
      let e = k;
      while (e < chars.length && (chars[e][1] || /\s/.test(chars[e][0]))) e++;
      const head = chars.slice(k, e).map((c) => c[0]).join('').trim();
      const rest = chars.slice(e).map((c) => c[0]).join('').trim();
      if (/\.$/.test(head) && rest && !/^[(*]/.test(rest)) {
        pieces.push(chars.slice(k, e));
        chars.splice(0, e);
      }
    }
    chars.forEach((c, i) => {
      if (c[0] === '(') depth++;
      if (c[0] === ')') depth = Math.max(0, depth - 1);
      if (c[0] === ';' && depth === 0) return push();
      buf.push(c);
      // "… მოწამეთა (303). ნაწილთა აღმოყვანება …": a dated commemoration ends at "). "
      if (c[0] === '.' && depth === 0 && chars[i - 1]?.[0] === ')' && /\s/.test(chars[i + 1]?.[0] ?? '')) push();
    });
    push();
    for (const pc of pieces) {
      let s = pc.map((c) => c[0]).join('').replace(/\s+/g, ' ').trim().replace(/[\s.*;,]+$/, '').replace(/^[\s.;,]+/, '');
      // fasting notes ("მსგეფსი (შვიდეული) ხსნილია") stay in the full day, not among the saints
      if (!s || /ხსნილია$/.test(s)) continue;
      const bold = pc.filter((c) => c[1] && !/\s/.test(c[0])).length > pc.filter((c) => !/\s/.test(c[0])).length / 2;
      // a trailing "(…)" is the date or a note: shown smaller
      const mm = s.match(/^(.*?)\s*\(((?:[^()]|\([^()]*\))*)\)\s*\**$/);
      const item = mm && mm[1] ? { n: mm[1].replace(/[\s,]+$/, ''), d: mm[2] } : { n: s };
      if (bold) item.b = 1;
      items.push(item);
    }
  }
  return items;
}

function parseDay(html) {
  const body = (html.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || [, html])[1];
  const tableEnd = body.search(/<\/table>/i);
  const head = tableEnd >= 0 ? body.slice(0, tableEnd) : '';
  const rest = tableEnd >= 0 ? body.slice(tableEnd + 8) : body;
  const cells = [...head.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/gi)];
  const center = cells.find((c) => /rowspan/i.test(c[1]));
  const title = center ? textOf(center[2]) : '';
  const paras = paragraphs(rest);
  return { t: title, p: paras, s: commemorations(paras) };
}

async function get(url, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sagandzuri-skola calendar)' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) {
      if (i + 1 >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
}

const jobs = [];
for (let m = 1; m <= 12; m++)
  for (let d = 1; d <= julianDays(YEAR, m); d++) {
    const ddmm = pad(d) + pad(m);
    if (only.length && !only.includes(ddmm)) continue;
    jobs.push({ m, d, ddmm, iso: newStyleIso(YEAR, m, d), url: `${BASE}/${YEAR}/v2/${pad(m)}/${ddmm}.htm` });
  }

const days = {};
const missing = [];
let done = 0;
const worker = async () => {
  for (let job; (job = jobs.shift()); ) {
    const html = await get(job.url);
    if (html == null) missing.push(job.ddmm);
    else days[job.iso] = parseDay(html);
    if (++done % 30 === 0) process.stdout.write(`  ${done} დღე…\n`);
  }
};
const total = jobs.length;
await Promise.all(Array.from({ length: 6 }, worker));

if (only.length) {
  console.log(JSON.stringify(days, null, 1));
} else {
  const sorted = Object.fromEntries(Object.keys(days).sort().map((k) => [k, days[k]]));
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'calendar', `${YEAR}.json`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify({ year: YEAR, source: `${BASE}/${YEAR}/v2/`, days: sorted }));
  console.log(`✓ ${Object.keys(days).length}/${total} დღე → ${out}`);
  if (missing.length) console.log(`  ვერ მოიძებნა: ${missing.join(', ')}`);
}
