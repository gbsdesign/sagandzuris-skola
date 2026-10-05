// Downloads orthodoxy.ge's "წმინდანთა ცხოვრება" (tsmindanebi.htm and its month / alphabet / Georgian-saints
// lists) for the library and the calendar:
//
//   public/lives/<month>/<slug>.json   one life: title, date line, paragraphs, icons (fetched when opened)
//   public/lives/<month>/icons/*        the icons, as published
//   src/data/library/saintLives.json   the list: id, old-style month/day, title, icon, Georgian saint
//
// then marks every calendar commemoration (src/data/calendar/*.json) with the life it belongs to.
//
//   node scripts/fetch-saint-lives.mjs            → download (pages are cached in the temp folder) + link
//   node scripts/fetch-saint-lives.mjs --link     → only link the calendar to the lives already downloaded
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkCalendarYear } from './lib/saint-lives-match.mjs';

const ROOT = 'https://www.orthodoxy.ge/';
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PUBLIC = path.join(PROJECT, 'public', 'lives');
const OUT_INDEX = path.join(PROJECT, 'src', 'data', 'library', 'saintLives.json');
const CAL_DIR = path.join(PROJECT, 'src', 'data', 'calendar');
const CACHE = path.join(os.tmpdir(), 'sagandzuri-lives-cache');

const MONTH_DIRS = ['ianvari', 'tebervali', 'marti', 'aprili', 'maisi', 'ivnisi', 'ivlisi', 'agvisto', 'seqtemberi', 'oqtomberi', 'noemberi', 'dekemberi'];

// ── fetching (cached, so the parser can be re-run without asking orthodoxy.ge again) ──

const decodeBytes = (buf) => {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf);
  const head = new TextDecoder('latin1').decode(buf.subarray(0, 2000));
  const cs = (head.match(/charset\s*=\s*["']?([\w-]+)/i) || [])[1]?.toLowerCase();
  return new TextDecoder(cs && cs !== 'utf-8' && cs !== 'utf8' ? cs : 'utf-8').decode(buf);
};

async function getBytes(url, tries = 4) {
  const file = path.join(CACHE, encodeURIComponent(url.replace(ROOT, '')));
  try { return await fs.readFile(file); } catch { /* not cached yet */ }
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (sagandzuri-skola library)' } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      await fs.mkdir(CACHE, { recursive: true });
      await fs.writeFile(file, buf);
      return buf;
    } catch (e) {
      if (i + 1 >= tries) throw new Error(`${url}: ${e.message}`);
      await new Promise((res) => setTimeout(res, 800 * (i + 1)));
    }
  }
}
const getText = async (url) => {
  const b = await getBytes(url);
  return b && decodeBytes(b);
};

const pool = async (items, n, fn) => {
  const queue = [...items];
  let done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    for (let it; (it = queue.shift()) !== undefined; ) {
      await fn(it);
      if (++done % 100 === 0) process.stdout.write(`  ${done}/${items.length}\n`);
    }
  }));
};

// ── HTML → text ──

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', laquo: '«', raquo: '»', bdquo: '„', ldquo: '“', rdquo: '”', hellip: '…', shy: '' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENT[e.toLowerCase()] ?? m,
  );
const textOf = (html) => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

// run flags
const BOLD = 1, ITALIC = 2;
const BR = '\u0000';
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input']);
const BLOCK = new Set(['p', 'div', 'tr', 'td', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'table', 'ul', 'ol', 'blockquote', 'center']);
const attr = (attrs, name) => (attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')) || []).slice(1).find((v) => v !== undefined);

// A life's body → blocks: { r: runs } a paragraph (a: 'c' centred, 'r' right), { h: text } a heading,
// { img, w, h } a picture. Runs are [text, flags?, life?] — life: the id of another page the words link to
// (a longer version of the life, a chapter); a heading that is one such link keeps it as l.
function blocksOf(html, pageUrl, images, links) {
  const out = [];
  let cur = null;
  let align = '';
  let heading = false;
  const stack = [];
  const flags = () => {
    let f = 0;
    for (const s of stack) {
      if (s.tag === 'b' || s.tag === 'strong' || /font-weight\s*:\s*(bold|700)/i.test(s.style)) f |= BOLD;
      if (s.tag === 'i' || s.tag === 'em' || /font-style\s*:\s*italic/i.test(s.style)) f |= ITALIC;
    }
    return f;
  };
  const linkNow = () => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].link) return stack[i].link;
    return null;
  };
  const flush = () => {
    if (!cur) return;
    const runs = [];
    for (const [t, f, l] of cur) {
      const text = t === BR ? '\n' : t.replace(/\s+/g, ' ');
      const last = runs[runs.length - 1];
      if (last && last[1] === f && last[2] === l) last[0] += text;
      else runs.push([text, f, l]);
    }
    for (const r of runs) r[0] = r[0].replace(/ *\n */g, '\n');
    // trim the ends; spaces between runs stay where they are
    while (runs.length && !runs[0][0].trim()) runs.shift();
    while (runs.length && !runs[runs.length - 1][0].trim()) runs.pop();
    if (runs.length) {
      runs[0][0] = runs[0][0].replace(/^\s+/, '');
      runs[runs.length - 1][0] = runs[runs.length - 1][0].replace(/\s+$/, '');
      const plain = runs.map((r) => r[0]).join('');
      if (heading) {
        const h = { h: plain.replace(/\s+/g, ' ') };
        const ls = new Set(runs.filter((r) => r[0].trim()).map((r) => r[2]));
        if (ls.size === 1 && runs[0][2]) h.l = runs[0][2];
        out.push(h);
      } else {
        const b = { r: runs.map((r) => (r[2] ? [r[0], r[1], r[2]] : r[1] ? [r[0], r[1]] : [r[0]])) };
        if (align) b.a = align;
        out.push(b);
      }
    }
    cur = null;
  };
  const re = /<!--[\s\S]*?-->|<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      const t = decode(m[4]);
      if (!t.trim() && !cur) continue;
      (cur ||= []).push([t, flags(), linkNow()]);
      continue;
    }
    if (!m[2]) continue;
    const close = m[1] === '/';
    const tag = m[2].toLowerCase();
    const attrs = m[3] || '';
    if (tag === 'br') {
      (cur ||= []).push([BR, flags(), linkNow()]);
      continue;
    }
    if (tag === 'img' && !close) {
      const src = attr(attrs, 'src');
      if (src && !/\.gif$/i.test(src)) {
        const abs = new URL(src, pageUrl).href;
        const local = images(abs);
        if (local) {
          // a picture at the start of a paragraph floats beside it: keep it before the text
          flush();
          const w = Number(attr(attrs, 'width')) || undefined;
          const h = Number(attr(attrs, 'height')) || undefined;
          out.push({ img: local, ...(w && h ? { w, h } : {}) });
        }
      }
      continue;
    }
    if (BLOCK.has(tag)) {
      flush();
      if (!close) {
        const al = (attr(attrs, 'align') || (attrs.match(/text-align\s*:\s*(\w+)/i) || [])[1] || '').toLowerCase();
        align = tag === 'center' || al === 'center' ? 'c' : al === 'right' ? 'r' : '';
        heading = /^h[2-5]$/.test(tag);
      } else {
        align = '';
        heading = false;
      }
    }
    if (VOID.has(tag)) continue;
    if (close) {
      const i = stack.map((s) => s.tag).lastIndexOf(tag);
      if (i >= 0) stack.length = i;
    } else {
      const href = tag === 'a' ? attr(attrs, 'href') : null;
      stack.push({ tag, style: attr(attrs, 'style') || '', link: href ? links(new URL(href, pageUrl).href) : null });
    }
  }
  flush();
  return out;
}

function parseLife(html, pageUrl, images, links) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1 ? textOf(h1[1]) : textOf((html.match(/<title>([\s\S]*?)<\/title>/i) || [, ''])[1]).replace(/^.*წმინდანთა ცხოვრება\s*-\s*/, '');
  let start = h1 ? h1.index + h1[0].length : (html.search(/<body/i) + 1 || 0);
  const after = html.slice(start);
  const h2 = after.match(/^\s*<h2[^>]*>([\s\S]*?)<\/h2>/i);
  const dateLine = h2 ? textOf(h2[1]) : '';
  if (h2) start += h2[0].length;
  let end = html.search(/js\/pageheight\.js|js\/footer\.js/i);
  if (end < start) end = html.length;
  const body = html.slice(start, end).replace(/<BR>\s*<\/TD>\s*<\/TR>[\s\S]*$/i, '');
  return { t: title, h: dateLine, b: blocksOf(body, pageUrl, images, links) };
}

// ── the lists ──

async function collect() {
  const top = await getText(ROOT + 'tsmindanebi.htm');
  const indexPages = [];
  const lives = new Map(); // path under orthodoxy.ge → { title, georgian }
  const add = (base, href, title, georgian) => {
    const u = new URL(href, base);
    if (!/^(www\.)?orthodoxy\.ge$/.test(u.hostname)) return;
    const p = u.pathname.replace(/^\//, '');
    if (!/^tveni\/[^/]+\/[^/]+\.htm$/.test(p)) return;
    const prev = lives.get(p);
    lives.set(p, { title: prev?.title || title, georgian: prev?.georgian || georgian, order: prev?.order ?? lives.size });
  };
  for (const m of top.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = new URL(m[1], ROOT);
    if (/^\/tveni\/[^/]+\.htm$/.test(u.pathname)) indexPages.push(u.href);
    else add(ROOT, m[1], textOf(m[2]), false);
  }
  // month lists first, so a life keeps its place within its day
  indexPages.sort((a, b) => (/\/\d+-[a-z]+\.htm$/.test(b) ? 1 : 0) - (/\/\d+-[a-z]+\.htm$/.test(a) ? 1 : 0));
  for (const ip of indexPages) {
    const html = await getText(ip);
    if (!html) continue;
    const georgian = /qartvelebi_/.test(ip);
    for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) add(ip, m[1], textOf(m[2]), georgian);
  }
  return lives;
}

// ── run ──

const onlyLink = process.argv.includes('--link');

if (!onlyLink) {
  console.log('სიები…');
  const found = await collect();
  console.log(`  ${found.size} ცხოვრება`);

  const entries = [];
  const imageJobs = new Map(); // absolute url → local path under public/lives
  const imagesFor = (abs) => {
    const u = new URL(abs);
    const p = u.pathname.replace(/^\//, '');
    if (!/^tveni\//.test(p) || !/\.(jpe?g|png|webp)$/i.test(p)) return null;
    const local = p.replace(/^tveni\//, '');
    imageJobs.set(abs, local);
    return local;
  };

  // pages the lives link to — a longer version, the chapters of a long life — come along too; they open
  // from those links and are not listed in the library (x: 1)
  const idOf = (p) => p.replace(/^tveni\//, '').replace(/\.htm$/, '');
  const extra = new Map(); // path → { title: '', georgian: false, order, x: true }
  const linksFor = (abs) => {
    const u = new URL(abs);
    if (!/^(www\.)?orthodoxy\.ge$/.test(u.hostname)) return null;
    const p = u.pathname.replace(/^\//, '');
    if (!/^tveni\/[^/]+\/[^/]+\.htm$/.test(p)) return null;
    if (!found.has(p) && !extra.has(p)) extra.set(p, { title: '', georgian: false, order: Infinity, x: true });
    return idOf(p);
  };

  console.log('ცხოვრებები…');
  const failed = [];
  const read = new Map(); // id → life
  const readPage = async ([p, info]) => {
    const url = ROOT + p;
    const html = await getText(url);
    if (!html) return failed.push(p);
    const life = parseLife(html, url, imagesFor, linksFor);
    // a heading left alone at the end (the link of a longer version that is not there) is dropped below
    if (!life.b.length) return failed.push(p);
    const id = idOf(p);
    const [dir, slug] = id.split('/');
    const mi = MONTH_DIRS.indexOf(dir);
    const dm = slug.match(/^(\d\d)[-_]/);
    const icon = life.b.find((b) => b.img)?.img;
    const entry = { id, t: life.t || info.title };
    if (mi >= 0 && dm && !info.x) Object.assign(entry, { m: mi + 1, d: Number(dm[1]) });
    else if (life.h) entry.h = life.h;
    if (icon) entry.i = icon;
    if (info.georgian) entry.g = 1;
    if (info.x) entry.x = 1;
    entry.o = info.order;
    entries.push(entry);
    read.set(id, life);
  };
  await pool([...found], 6, readPage);
  for (let round = 0; round < 3; round++) {
    const next = [...extra].filter(([p]) => !read.has(idOf(p)) && !failed.includes(p));
    if (!next.length) break;
    console.log(`  ბმულით: ${next.length}`);
    await pool(next, 6, readPage);
  }

  // links to pages that could not be read become plain words; a heading that only was such a link goes
  const linkOk = (l) => l && read.has(l);
  for (const life of read.values()) {
    life.b = life.b
      .map((b) => {
        if (b.r) b.r = b.r.map((r) => (r[2] && !linkOk(r[2]) ? (r[1] ? [r[0], r[1]] : [r[0]]) : r));
        if (b.h && b.l && !linkOk(b.l)) return null;
        return b;
      })
      .filter(Boolean);
    while (life.b.length && life.b[life.b.length - 1].h && !life.b[life.b.length - 1].l) life.b.pop();
  }

  await fs.rm(OUT_PUBLIC, { recursive: true, force: true });
  for (const [id, life] of read) {
    const file = path.join(OUT_PUBLIC, `${id}.json`);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(life));
  }

  console.log(`ხატები… (${imageJobs.size})`);
  const missingImages = [];
  await pool([...imageJobs], 6, async ([abs, local]) => {
    const buf = await getBytes(abs).catch(() => null);
    if (!buf) return missingImages.push(abs);
    const file = path.join(OUT_PUBLIC, local);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, buf);
  });
  // a picture that could not be downloaded is dropped from its life
  if (missingImages.length) {
    const gone = new Set(missingImages.map((a) => imageJobs.get(a)));
    for (const e of entries) {
      const file = path.join(OUT_PUBLIC, `${e.id}.json`);
      const life = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!life.b.some((b) => gone.has(b.img))) continue;
      life.b = life.b.filter((b) => !gone.has(b.img));
      await fs.writeFile(file, JSON.stringify(life));
      if (gone.has(e.i)) delete e.i;
    }
  }

  // month lists' order: by month, day, then as orthodoxy.ge lists them
  entries.sort((a, b) => (a.m ?? 99) - (b.m ?? 99) || (a.d ?? 0) - (b.d ?? 0) || a.o - b.o || a.id.localeCompare(b.id));
  for (const e of entries) delete e.o;
  await fs.writeFile(OUT_INDEX, JSON.stringify({ source: ROOT + 'tsmindanebi.htm', lives: entries }));
  console.log(`✓ ${entries.filter((e) => !e.x).length} ცხოვრება (+ ${entries.filter((e) => e.x).length} ვრცელი ვერსია / თავი) → public/lives, src/data/library/saintLives.json`);
  const failedListed = failed.filter((p) => found.has(p));
  if (failedListed.length) console.log(`  ვერ წავიკითხე: ${failedListed.join(', ')}`);
  if (failed.length > failedListed.length) console.log(`  ბმულით მითითებული, მაგრამ არარსებული გვერდი: ${failed.length - failedListed.length}`);
  if (missingImages.length) console.log(`  ხატი ვერ ჩამოვიდა: ${missingImages.length}`);
}

// ── the calendar's commemorations → lives ──

const index = JSON.parse(await fs.readFile(OUT_INDEX, 'utf8'));
for (const f of (await fs.readdir(CAL_DIR)).filter((f) => /^\d{4}\.json$/.test(f))) {
  const file = path.join(CAL_DIR, f);
  const cal = JSON.parse(await fs.readFile(file, 'utf8'));
  const stats = linkCalendarYear(cal, index.lives);
  await fs.writeFile(file, JSON.stringify(cal));
  console.log(`✓ კალენდარი ${f}: ${stats.linked}/${stats.total} ხსენებას აქვს ცხოვრება`);
}
