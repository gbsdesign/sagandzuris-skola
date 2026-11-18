import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
# Turn a text PDF into the app's book shape: sections of [heading, paragraphs].
import sys, re, json, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'wignebi'))
import pymupdf
import legacy as X

GEOL = re.compile('[ა-ჿ]')
END = re.compile(r'[.!?:;»“”"…)\]]\s*$')
JUNK = re.compile(r'^[\s\d~\-–—.,*•=|_/\\()\[\]IVXL]*$')

def is_red(c):
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    return r > 120 and g < 90 and b < 90

def span_raw(s):
    out = []; prev = None
    for ch in s['chars']:
        c = ch['c']; x0, _, x1, _ = ch['bbox']
        if prev is not None and c != ' ' and out and out[-1] != ' ' and x0 - prev > 0.17 * s['size']:
            out.append(' ')
        out.append(c); prev = x1
    return ''.join(out)

def read(path):
    doc = pymupdf.open(path)
    pages = [pg.get_text('rawdict') for pg in doc]
    imgs = [[im['bbox'] for im in pg.get_image_info() if im['bbox'][2] - im['bbox'][0] < 70 and im['bbox'][3] - im['bbox'][1] < 70] for pg in doc]
    l1 = collections.Counter(); mid = collections.Counter(); xuc = set()
    for d in pages:
        for b in d['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    f = s['font']; t = ''.join(ch['c'] for ch in s['chars'])
                    if 'xuc' in f.lower(): xuc.add(f)
                    for c in t:
                        if 0xC0 <= ord(c) <= 0xFF: l1[f] += 1
                        if 0xE0 <= ord(c) <= 0xEF: mid[f] += 1
    shifted = {f for f in l1 if l1[f] > 5 and mid[f] < 0.03 * l1[f]}
    def conv(t, f):
        if not t.strip(): return t
        if f not in xuc and l1[f] > 5 and len(X.L1.findall(t)) >= 1 and not X.LAT.search(t.replace('I', '').replace('V', '').replace('X', '')):
            return X.uni_old_to_mkhedruli(X.dropped(t, f in shifted))
        if X.LAT.search(t) or X.L1.search(t):
            return X.legacy_runs(t, f)
        return X.uni_old_to_mkhedruli(X.mtavruli_low(t))
    # blocks -> lines -> runs (text, size, style)
    out = []
    for pi, d in enumerate(pages):
        H = d['height']
        marked = set()
        spans = [s for b in d['blocks'] for l in b.get('lines', []) for s in l['spans']]
        for ix0, iy0, ix1, iy1 in imgs[pi]:
            icy = (iy0 + iy1) / 2; best = None; skip = False
            for s in spans:
                cs = [ch for ch in s['chars'] if ch['c'].strip()]
                if not cs: continue
                cx0, cy0, cx1, cy1 = cs[0]['bbox']; ch = cy1 - cy0; ccy = (cy0 + cy1) / 2
                if len(cs) <= 2 and ix0 - 1 <= (cx0 + cx1) / 2 <= ix1 + 1 and iy0 - 2 <= ccy <= iy1 + 2:
                    skip = True; break
                if ix0 <= cx0 + 2 and cx0 - 14 <= ix1 <= cx0 + 26 and abs(icy - ccy) < 1.3 * max(ch, 8):
                    dist = abs(icy - ccy) + 0.3 * abs(ix1 - cx0)
                    if best is None or dist < best[0]: best = (dist, id(s))
            if skip: continue
            if best: marked.add(best[1])
        for b in d['blocks']:
            lines = []
            for l in b.get('lines', []):
                runs = []; px = None
                for s in l['spans']:
                    raw = span_raw(s)
                    if not raw: continue
                    t = conv(raw, s['font'])
                    if id(s) in marked:
                        t = re.sub(r'^(\s*)', lambda m: m.group(1) + '\x00', t, count=1)
                    if px is not None and s['bbox'][0] - px > 0.17 * s['size'] and runs and not runs[-1][0].endswith(' ') and not t.startswith(' '):
                        t = ' ' + t
                    px = s['bbox'][2]
                    bold = bool(s['flags'] & 16) or 'bold' in s['font'].lower()
                    runs.append([t, round(s['size'], 1), bold, is_red(s['color'])])
                if runs: lines.append(runs)
            if lines:
                out.append({'p': pi, 'y0': b['bbox'][1], 'y1': b['bbox'][3], 'H': H, 'lines': lines})
    return out

def body_size(blocks):
    C = collections.Counter()
    for b in blocks:
        for l in b['lines']:
            for t, sz, bold, red in l:
                C[(round(sz), bold, red)] += len(GEOL.findall(t))
    return C.most_common(1)[0][0]

COMMON_FIXES = [
    (r'(^|\s)_(?=\s)', r'\1–'), (r'^_\s*', '– '), (r'`(?=[ა-ჿ])', '„'), (r'(?<=[ა-ჿ.,!?…])~', '“'),
    (r'(^|[\s„"])იდ მწუხრ', r'\1დიდ მწუხრ'), (r'(^|[\s„"])იდი ცისკ', r'\1დიდი ცისკ'),
    (r'(^|\s)(?:წ?ეს)-\s*განგება', r'\1წეს-განგება'), (r'(^|\s)ანგება(?=\s)', r'\1განგება'),
    (r'სადღესასწაულო\s+ეს-', 'სადღესასწაულო წეს-'), (r'(^|\s)სი ათასთა', r'\1ასი ათასთა'),
]

def build(path, fixes=(), part_rx=None, title=None):
    blocks = read(path)
    body, bbold, bred = body_size(blocks)
    def heady(r):
        t, sz, bold, red = r
        return (red and not bred) or (bold and not bbold) or sz >= body + 1.4
    # running heads/feet: same text at a page edge on 3+ pages
    edge = collections.Counter()
    for b in blocks:
        txt = ''.join(t for l in b['lines'] for t, *_ in l).strip()
        if b['y0'] < 0.09 * b['H'] or b['y1'] > 0.93 * b['H']: edge[txt] += 1
    sections = []  # [heading, [paras], hsize]
    cur = None
    def new_sec(h, size):
        nonlocal cur
        if cur and not cur[1] and cur[0] and abs(cur[2] - size) < 1.5 and len(cur[0]) + len(h) < 160:
            cur[0] = (cur[0] + ' ' + h).strip(); return
        cur = [h, [], size]; sections.append(cur)
    def add_para(t, cont):
        nonlocal cur
        if cur is None: cur = ['', [], 0]; sections.append(cur)
        if cont and cur[1] and not END.search(cur[1][-1]):
            cur[1][-1] = join(cur[1][-1], t)
        else:
            cur[1].append(t)
    def join(a, b):
        a = a.rstrip(); b = b.lstrip()
        if re.search(r'[ა-ჿ]-$', a) and re.match(r'[ა-ჿ]', b): return a[:-1] + b
        return a + ' ' + b
    last_page = -1
    for b in blocks:
        txt = ''.join(t for l in b['lines'] for t, *_ in l).strip()
        if not txt or JUNK.match(txt): continue
        if edge[txt] >= 3 and (b['y0'] < 0.09 * b['H'] or b['y1'] > 0.93 * b['H']): continue
        newpage = b['p'] != last_page; last_page = b['p']
        # drop caps: a lone big letter run glued to what follows
        flat = []
        for li, l in enumerate(b['lines']):
            for ri, r in enumerate(l):
                flat.append([r, li])
        for i in range(len(flat) - 1):
            t = flat[i][0][0].strip()
            if len(t) == 1 and GEOL.match(t) and flat[i][0][1] >= body * 1.5:
                nxt = flat[i + 1][0]
                ws = flat[i][0][0][:len(flat[i][0][0]) - len(flat[i][0][0].lstrip())]
                nxt[0] = ws + t + nxt[0].lstrip(); flat[i][0][0] = ''
        # split the block into heading lines / leading heading run / body
        para = ''; first_body = True
        for li, l in enumerate(b['lines']):
            l = [r for r in l if r[0]]
            if not l: continue
            letters = [r for r in l if GEOL.search(r[0])]
            ltxt = ''.join(r[0] for r in l).strip()
            avg = sum(r[1] * len(r[0]) for r in letters) / max(1, sum(len(r[0]) for r in letters)) if letters else 0
            allh = letters and (all(heady(r) for r in letters) or (avg >= body + 0.8 and len(ltxt) <= 70))
            if allh and not para:
                h = ''.join(r[0] for r in l).strip()
                new_sec(h, max(r[1] for r in letters)); continue
            if li == 0 or not para:
                k = 0
                while k < len(l) and (heady(l[k]) or not GEOL.search(l[k][0])): k += 1
                lead = ''.join(r[0] for r in l[:k]).strip()
                if k and k < len(l) and len(GEOL.findall(lead)) >= 3:
                    new_sec(lead, max(r[1] for r in l[:k]))
                    l = l[k:]
            line = ''.join(r[0] for r in l).strip()
            para = join(para, line) if para else line
        if para:
            add_para(para, newpage)
    # tidy
    res = []
    for h, ps, sz in sections:
        h = fill_initials(re.sub(r'\s+', ' ', h).strip()); ps = [fill_initials(re.sub(r'\s+', ' ', p).strip()) for p in ps if p.strip()]
        for a, z in COMMON_FIXES + list(fixes):
            h = re.sub(a, z, h); ps = [re.sub(a, z, p) for p in ps]
        if h or ps: res.append([h, ps, sz])
    return res, body

import pickle
_W = None
def fill_initials(text):
    global _W
    if '\x00' not in text: return text
    if _W is None: _W = pickle.load(open(os.path.join(WORK, 'words.pkl'), 'rb'))
    def best(m):
        rest = m.group(1)
        nxt = m.string[m.end():].split(' ', 1)
        nw = re.match('[ა-ჿ]*', nxt[1] if len(nxt) > 1 and not nxt[0] else '').group(0) if False else ''
        cands = [(_W.get(L + rest, 0), L) for L in 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჲჱჳჴჵ']
        c, L = max(cands)
        if c == 0:
            pre = rest[:4]
            cnt = collections.Counter()
            for w, k in _W.items():
                if len(w) > 4 and w[1:5] == pre: cnt[w[0]] += k
            if cnt: L = cnt.most_common(1)[0][0]
            else: return rest
        return L + rest
    return re.sub('\x00([ა-ჿ]*)', best, text)
