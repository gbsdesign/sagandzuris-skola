"""Georgian lectionary: reference strings by key, and ordinary readings by (week, weekday), from the Georgian calendars."""
import sys, re, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import O26, M, flat, GEO2AZ, BOOKS_RE, zkey, APOSTLE, GOSPEL
from cycle import pascha, D, TD
from lect import ap_week, gospel_week, FEASTISH
GREF = re.compile(r'(?<![ა-ჿ\d])(' + BOOKS_RE + r')\s*\.?\s*(\d+)\s*:')
def o_refs(text):
    """[(key, string)] for every reference with a დას. number in a Georgian line"""
    out = []
    ms = list(GREF.finditer(text))
    for i, m in enumerate(ms):
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        seg = text[m.start():end]
        z = re.search(r'\(\s*დას[ი.:]*\s*(\d+)[^)]*\)', seg)
        if not z: continue
        k = zkey(GEO2AZ[m.group(1)], z.group(1))
        if not k: continue
        s = seg[:z.end()]
        s = re.sub(r'\s+', ' ', s).strip()
        out.append((k, s))
    return out
def norm(s):
    s = re.sub(r'\s*-\s*', '-', s)
    s = re.sub(r'(\d)-(\d+):', r'\1 - \2:', s)       # 4: 7-5: 9 → 4: 7 - 5: 9
    s = re.sub(r':\s*', ': ', s)
    s = re.sub(r'\(\s*დას[ი.:]*\s*(\d+)\s*,?\s*(შუა)?\s*\)', lambda m: f'(დას. {m.group(1)}{", შუა" if m.group(2) else ""})', s)
    s = re.sub(r'\.\s*\(', ' (', s)
    s = re.sub(r'\s+', ' ', s).strip()
    s = re.sub(r'^(\d) ', r'\1 ', s)
    return s
_cnt = collections.defaultdict(collections.Counter)
for iso, d in O26.items():
    for p in d['p']:
        for k, s in o_refs(flat(p)): _cnt[k][norm(s)] += 1
KEY2STR = {k: c.most_common(1)[0][0] for k, c in _cnt.items()}
ROMAN = {'I':1,'V':5,'X':10,'L':50}
def rom(s):
    s = s.strip(); t = 0
    for i, ch in enumerate(s):
        v = ROMAN.get(ch, 0); n = ROMAN.get(s[i+1], 0) if i + 1 < len(s) else 0
        t += -v if v < n else v
    return t
MREF = re.compile(r'(' + BOOKS_RE + r')\.?\s*(\d+)\s*დას\.?\s*(\(შუათგან\),?)?\s*(.+)$')
def m_ref(line):
    """'ლიტ – იაკ. 52 დას. II, 1-13.' → (key, Georgian string)"""
    body = re.sub(r'^[^–-]*[–-]\s*', '', line, count=1)
    body = re.sub(r'^.*?[–-]\s*(?=(' + BOOKS_RE + r')\.)', '', body)
    m = MREF.search(body)
    if not m: return None
    book, z, mid, cv = m.groups()
    k = zkey(GEO2AZ[book], z)
    if not k: return None
    cv = cv.strip().rstrip('.')
    def ch(mm): return str(rom(mm.group(1)))
    cv = re.sub(r'\b([IVXL]+),\s*', lambda mm: str(rom(mm.group(1))) + ': ', cv)
    cv = re.sub(r'\s*[–-]\s*', '-', cv).replace('-', ' - ') if re.search(r'\d+: \d+.*-\s*\d+: ', cv) else re.sub(r'\s*[–-]\s*', '-', cv)
    s = f'{book}. {cv} (დას. {z}{", შუა" if mid else ""})'
    return k, norm(s)
for iso, x in M.items():
    for l in x.get('k', []):
        r = m_ref(l)
        if r and r[0] not in KEY2STR: KEY2STR[r[0]] = r[1]
# ---- ordinary readings by week ----
WD_SUFFIX = re.compile(r'-\s*(ორშ|სამშ|ოთხშ|ხუთშ|პარ|შაბ)\.')
def label_of(t):
    m = re.match(r'^\s*([^:\d]{1,45}?)\s*:', t)
    return m.group(1).strip() if m else None
ORD_LABEL = re.compile(r'^(რიგ\.?|ლიტ\.?|ლიტ\.?\s*რიგ\.?|ლიტურგიაზე)$')
def o26_ordinary(iso):
    """the Georgian calendar's own ordinary Apostle + Gospel of that day (key, str) or Nones"""
    ap = ev = None
    t = '\n'.join(flat(p) for p in O26[iso]['p'])
    for line in t.split('\n'):
        s = line.strip()
        if not s or s.startswith('*') or 'ზედმობ' in s or WD_SUFFIX.search(s): continue
        if re.match(r'^(ცისკ|მწუხ|[IVX]+\s*ჟამ)', s): continue
        lab = label_of(s)
        if lab is not None:
            lab2 = re.sub(r'^ლიტ\.?\s*[-–]?\s*', '', lab).strip()
            if not (ORD_LABEL.match(lab) or ORD_LABEL.match(lab2) or lab2 in ('', 'რიგ.', 'რიგ')): continue
        for k, st in o_refs(s):
            if k.startswith('Ap') and ap is None: ap = (k, norm(st))
            elif k[:2] in ('Mt', 'Mk', 'Lk', 'Jn') and ev is None: ev = (k, norm(st))
        if ap or ev: break
    return ap, ev
def m_ordinary(iso):
    ap = ev = None
    for l in (M.get(iso) or {}).get('k', []):
        if not re.match(r'^(ლიტ\.?\s*[–-]\s*(?=(' + BOOKS_RE + r')\.)|რიგ)', l): continue
        r = m_ref(l)
        if not r: continue
        if r[0].startswith('Ap') and ap is None: ap = r
        elif ev is None and not r[0].startswith('Ap'): ev = r
    return ap, ev
def in_moving(x):
    for P in (pascha(x.year), pascha(x.year + 1)):
        if -70 <= (x - P).days <= 56: return True
    return False
GT_AP = collections.defaultdict(collections.Counter)
GT_EV = collections.defaultdict(collections.Counter)
def _add(x, ap, ev):
    if ap: GT_AP[(ap_week(x), x.weekday())][ap] += 1
    if ev: GT_EV[(gospel_week(x), x.weekday())][ev] += 1
for iso in O26:
    x = D.fromisoformat(iso)
    if x.weekday() == 6 or in_moving(x): continue
    o = x - TD(days=13)
    if (o.month, o.day) in FEASTISH: continue
    if (o.month, o.day) >= (1, 7) and (o.month, o.day) < (5, 1): continue
    _add(x, *o26_ordinary(iso))
for iso in M:
    x = D.fromisoformat(iso)
    if x.weekday() == 6 or in_moving(x): continue
    o = x - TD(days=13)
    if (o.month, o.day) in FEASTISH: continue
    if (o.month, o.day) >= (1, 7) and (o.month, o.day) < (5, 1): continue
    _add(x, *m_ordinary(iso))
def gt(x):
    a = GT_AP.get((ap_week(x), x.weekday())); e = GT_EV.get((gospel_week(x), x.weekday()))
    pick = lambda c: max(c.items(), key=lambda kv: kv[1])[0] if c else None
    # key majority, then the O26-style string for it
    def best(c):
        if not c: return None
        keys = collections.Counter()
        for (k, s), n in c.items(): keys[k] += n
        k = keys.most_common(1)[0][0]
        strs = collections.Counter({s: n for (kk, s), n in c.items() if kk == k})
        return (k, strs.most_common(1)[0][0]), keys
    return best(a), best(e)
