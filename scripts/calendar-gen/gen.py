"""Build the church calendar of old-style year 2027 (python3 -I scripts/calendar-gen/gen.py) (14 Jan 2027 – 13 Jan 2028) from:
   - the Georgian 2026 calendar: fixed parts by old date (365 days back), movable parts by the day's place to Pascha,
   - the lectionary (week tables made from azbyka + the Georgian calendars) for the ordinary readings,
   - Georgian ranks for which saints push the weekday readings to a neighbour."""
import re, sys, json, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import O26, flat, o_keys, zkey, AZFIX
from cycle import pascha, D, TD, Cycle, ordinary_title, roman, WD
from units import chars_of, runs_of, text_of, split_units, join_units, star_counts, strip, BOLD
from extract import analyse, SPECIAL_26, FIXED_GREAT
from ordinary import plan_week, great_of, special_kind
from lect import own_ordinary, GOSPELS
from azg import groups as az_groups, ref_ka
from geolect import o_refs, norm, M, m_ref
from rank import keys_of, LORD_THEOTOKOS

Y = 2027
C = Cycle(Y)
P, P26, PN = pascha(Y), pascha(2026), pascha(Y + 1)
START, END = D(Y, 1, 14), D(Y + 1, 1, 13)
SPECIAL_SRC = {kind: iso for iso, kind in SPECIAL_26.items()}
LOG = []
def log(x, msg): LOG.append(f'{x} {msg}')

# ---------- Georgian strings for a reference ----------
KEYCV = collections.defaultdict(collections.Counter)
def _first_cv(s):
    m = re.search(r'(\d+)\s*:\s*(\d+)', s)
    return (int(m.group(1)), int(m.group(2))) if m else None
for _iso, _d in O26.items():
    for _p in _d['p']:
        for _k, _s in o_refs(flat(_p)):
            KEYCV[(_k, _first_cv(_s))][norm(_s)] += 1
for _iso, _x in M.items():
    for _l in _x.get('k', []):
        _r = m_ref(_l)
        if _r: KEYCV[(_r[0], _first_cv(_r[1]))][_r[1]] += 1
def geo_ref(r):
    if r[0] == 'GEO': return r[1]
    b, cv, z = r
    k = zkey(b, z)
    m = re.match(r'^(\d+):(\d+)', cv.strip())
    first = (int(m.group(1)), int(m.group(2))) if m else None
    c = KEYCV.get((k, first)) if k else None
    if c: return c.most_common(1)[0][0]
    return norm(ref_ka(b, cv, z))
def _is_ap(r):
    k = r[2] if r[0] == 'GEO' else zkey(r[0], r[2])
    return bool(k) and k.startswith('Ap')
def refs_text(refs):
    refs = sorted(refs, key=lambda r: 0 if _is_ap(r) else 1)
    return '. '.join(geo_ref(r).rstrip('.') for r in refs)
WD_ABBR = ['ორშ.', 'სამშ.', 'ოთხშ.', 'ხუთშ.', 'პარ.', 'შაბ.', 'კვ.']

# ---------- char-line helpers ----------
TXT, LAB = 4, 5
def mk_line(parts):
    """[(text, flag)] → chars"""
    out = []
    for t, f in parts:
        out.extend((ch, f) for ch in t)
    return out
def line_text(c): return text_of(c)
def cat_of(t):
    s = t.strip()
    if re.match(r'^მწუხრ', s): return 'vesp'
    if re.match(r'^ცისკ', s): return 'mat'
    if re.match(r'^((ორშ\. )?[IVX]+\s*ჟამ|ჟამნ)', s): return 'hours'
    return 'lit'

# ---------- which days get fresh ordinary readings ----------
NO_JOIN_K = {24, 31, 38, 39, 47, 48, -57}
def kk(x):
    k = (x - P).days
    if k < -70 and x < P: return None
    return k
def regen(x):
    """True when the weekday ordinary readings are made afresh (not copied by the day's place to Pascha)"""
    if x.weekday() == 6: return False
    k = (x - P).days
    if -55 <= k <= 6: return False          # cheesefare week, Lent, Holy Week, Bright Week
    if k in (-57, 48): return False          # the two Saturdays of the departed
    return True
def lent(x):
    for p in (P, PN):
        k = (x - p).days
        if -48 <= k <= 56 and not (7 <= k <= 56): return True
    return False
OWN_CACHE = {}
def own_of(x):
    if x not in OWN_CACHE:
        k = (x - P).days
        if x.weekday() == 6 or not regen(x): OWN_CACHE[x] = []
        elif D(2027, 1, 14) <= x <= D(2027, 1, 18): OWN_CACHE[x] = []      # Theophany's forefeast week: left out
        elif (x - TD(days=13)).timetuple()[1:3] in ((12, 24), (1, 5)): OWN_CACHE[x] = []   # the eves of Nativity and Theophany
        else:
            own = own_ordinary(x)
            if not own and -70 <= k <= 56:
                from geolect import o26_ordinary
                ap, ev = o26_ordinary((P26 + TD(days=k)).isoformat())
                own = [('GEO', s_, k_) for k_, s_ in (ap, ev) if k_]
            OWN_CACHE[x] = own
    return OWN_CACHE[x]

# ---------- sources ----------
def fixed_src(x): return (x - TD(days=365)).isoformat()
def mov_src(x):
    k = (x - P).days
    if -70 <= k <= 63: return (P26 + TD(days=k)).isoformat(), 'k'
    sk = special_kind(x)
    if sk and sk in SPECIAL_SRC: return SPECIAL_SRC[sk], sk
    return None, None
ANALYSE = {}
def A(iso):
    if iso not in ANALYSE: ANALYSE[iso] = analyse(iso)
    return ANALYSE[iso]

def busy(y):
    """y already has its own saint's readings (from the fixed source)"""
    a = A(fixed_src(y))
    return any(l['kind'] == 'reading' and l['cls'].startswith('fix') and cat_of(l['text']) == 'lit' for l in a['lines'])
def is_great(x):
    o = x - TD(days=13)
    k = (x - P).days
    if k in NO_JOIN_K: return False
    return great_of(x)

# ---------- the week plan of ordinary readings ----------
PLAN = {}
def plan_of(x):
    if x in PLAN: return PLAN[x]
    mon = x - TD(days=x.weekday())
    week = [mon + TD(days=i) for i in range(6)]
    import ordinary as _o
    keep = _o.great_of
    _o.great_of = lambda y: is_great(y)
    try:
        pl = plan_week(week, P, PN, own_of=own_of, busy=busy)
    finally:
        _o.great_of = keep
    for y in week: PLAN[y] = pl[y]
    return PLAN.get(x, [])

def ordinary_lines(x, has_other_lit):
    pl = plan_of(x)
    if not pl: return []
    own = [r for r, src in pl if src == x]
    joined = [(r, src) for r, src in pl if src != x]
    lines = []
    if joined:
        if own:
            lines.append(mk_line([('ლიტ.: ', LAB), (refs_text(own[0]) + ' - ' + WD_ABBR[x.weekday()], TXT)]))
            for r, src in joined:
                lines.append(mk_line([(refs_text(r) + ' - ' + WD_ABBR[src.weekday()] + ' ზედმობმით.', TXT)]))
        else:
            for r, src in joined:
                lines.append(mk_line([('რიგ. ზედმობმით: ', LAB), (refs_text(r) + ' - ' + WD_ABBR[src.weekday()] + '.', TXT)]))
    elif own:
        if has_other_lit: lines.append(mk_line([('რიგ.: ', LAB), (refs_text(own[0]) + '.', TXT)]))
        else: lines.append(mk_line([('ლიტ.: ', LAB), (refs_text(own[0]) + '.', TXT)]))
    return lines

# ---------- Sundays ----------
EOTHINA = {1: 'მთ. 28: 16-20 (დას. 116)', 2: 'მკ. 16: 1-8 (დას. 70)', 3: 'მკ. 16: 9-20 (დას. 71)', 4: 'ლკ. 24: 1-12 (დას. 112)',
           5: 'ლკ. 24: 12-35 (დას. 113)', 6: 'ლკ. 24: 36-53 (დას. 114)', 7: 'ინ. 20: 1-10 (დას. 63)', 8: 'ინ. 20: 11-18 (დას. 64)',
           9: 'ინ. 20: 19-31 (დას. 65)', 10: 'ინ. 21: 1-14 (დას. 66)', 11: 'ინ. 21: 15-25 (დას. 67)'}
def sunday_n(x):
    pc = C.pentecost_base(x)
    return (x - pc).days // 7
def eothinon_line(x):
    n = (sunday_n(x) - 1) % 11 + 1
    num = '1-ლი' if n == 1 else f'მე-{n}'
    return mk_line([('ცისკ.: ', LAB), (f'სახ. {num}, {EOTHINA[n]}.', TXT)])
ORD_G = re.compile(r'^(Рядовое|Ряд\.?|)$')
def sunday_ordinary(x):
    refs = []
    for g in az_groups(x.isoformat()):
        if ORD_G.match(g['g']) and g['s'] in ('lit', ''): refs += g['refs']
    return refs

# ---------- one day ----------
def unit_saints(src_iso, pi, unit):
    """the source's saint entries inside this unit: [(entry, offset in unit)]"""
    para = flat(O26[src_iso]['p'][pi])
    t = text_of(unit.get('c0', unit['c']))
    pos = para.find(t)
    if pos < 0: return []
    out = []
    for s in O26[src_iso].get('s', []):
        a = s.get('at')
        if a and a[0] == pi and pos <= a[1] and a[2] <= pos + len(t):
            out.append((s, a[1] - pos, a[2] - a[1]))
    return out

NAME_STOP = set('და თუ უპირატესი ინებებს მაშინ მისთვის მათთვის ცისკრად ლიტურგიაზე საკითხავები საზიაროთაგან გვ განგების საზეიმოდ შესრულებას იხ შენიშვნა წმიდა წმიდისა წმ ღირსი ღირსისა მოწამისა მოწამეთა'.split())
def _words(t): return {w for w in re.findall(r'[ა-ჰ]{4,}', t) if w not in NAME_STOP}
def note_side(an, text):
    """'fix' / 'mov' for an unstarred note, by the commemorations whose names it shares"""
    nw = _words(text)
    fw, mw = set(), set()
    for para in an['comm']:
        for cls, u in para:
            (mw if cls == 'mov' else fw).update(_words(text_of(u['c'])))
    a, b = len(nw & fw), len(nw & mw)
    if re.search(r'ზატიკ|ტრიოდ|პასექ|აღდგომ|ერგას|მარხვან|სულთმოფ|ვნების|კვირიაკეს დამთხვეულ', text): b += 2
    if a > b: return 'fix'
    if b > a: return 'mov'
    return None
ORD26 = {}
def ord26_week(src_iso):
    y = D.fromisoformat(src_iso)
    mon = y - TD(days=y.weekday())
    if mon not in ORD26:
        ks = set()
        for i in range(6):
            try: ks |= keys_of(own_ordinary(mon + TD(days=i)))
            except Exception: pass
        ORD26[mon] = ks
    return ORD26[mon]
GENERIC_LAB = re.compile(r'^\s*((ლიტ|ლიტურგიაზე)\.?\s*:?\s*)?((რიგ)\.?\s*:?)?\s*(?=(\d\s)?[ა-ჰ]+\.\s*\d)')
def ord26_line(src_iso, l):
    """a fixed-source line that is really the 2026 weekday's ordinary reading"""
    if l['kind'] != 'reading' or l['cat'] != 'lit': return False
    y = D.fromisoformat(src_iso)
    k = (y - P26).days
    if -70 <= k <= 56 or y.weekday() == 6: return False
    o = y - TD(days=13)
    if (o.month, o.day) in FIXED_GREAT: return False
    t = l['text']
    if re.search(r'ზედმობ|-\s*(ორშ|სამშ|ოთხშ|ხუთშ|პარ|შაბ)\.', t) or re.match(r'^\s*(ლიტ\.?\s*:?\s*)?რიგ', t): return True
    ks = set(o_keys(t))
    if not ks: return False
    if ks <= ord26_week(src_iso) and GENERIC_LAB.match(t): return True
    if GENERIC_LAB.match(t) and len({('ap' if k_.startswith('Ap') else 'ev') for k_ in ks}) == 2:
        from rank import rank_great
        if not rank_great(o.month, o.day)[0]: return True
    if D(2026, 1, 14) <= y <= D(2026, 2, 1) and GENERIC_LAB.match(t):
        kinds = {('ap' if k.startswith('Ap') else 'ev') for k in ks}
        return len(kinds) == 2
    return False
def sunday_mov26(src_iso, l):
    y = D.fromisoformat(src_iso)
    if y.weekday() != 6 or l['kind'] != 'reading': return False
    if (y - TD(days=13)).timetuple()[1:3] in FIXED_GREAT: return False
    t = l['text']
    if l['cat'] == 'mat' and re.search(r'სახ\.', t): return True
    if re.match(r'^\s*(ლიტ\.?\s*:?\s*)?რიგ', t): return True
    ks = set(o_keys(t))
    sk = keys_of(sunday_ordinary(y))
    return bool(ks) and bool(sk) and ks <= sk and l['cat'] == 'lit'
def build_day(x):
    iso = x.isoformat()
    k = (x - P).days
    fsrc = fixed_src(x)
    msrc, mkind = mov_src(x)
    F = A(fsrc)
    Mv = A(msrc) if msrc else None
    great_fixed = (x - TD(days=13)).timetuple()[1:3] in FIXED_GREAT
    # ---- title ----
    if mkind == 'k' and k <= 56:
        title = O26[msrc]['t']
        if -70 <= k <= -14 and x.weekday() == 6:
            title = re.sub(r'ხმა\s*[IVX]+\s*\.?', f'ხმა {roman(C.tone(x))}.', title)
    elif mkind and mkind != 'k':
        t26 = O26[msrc]['t']
        base = ordinary_title(C, x)
        m = re.match(r'^.*?შემდგომად მეერგასისა\.\s*(.+)$', t26)
        if x.weekday() == 6: title = base
        elif m: title = re.sub(r'შემდგომად მეერგასისა\.\s*.+$', 'შემდგომად მეერგასისა. ' + m.group(1), base)
        else: title = t26
    else:
        title = ordinary_title(C, x)
    items = []   # (src, kind, payload)
    # ---- commemorations ----
    comm_paras = []
    def take(an, src_iso, want, tag):
        for pi, para in enumerate(an['comm']):
            us = [u for cls, u in para if (cls == want or (want == 'fix' and cls == 'fix?'))]
            if us: comm_paras.append((tag, src_iso, pi, us))
    if Mv and not great_fixed: take(Mv, msrc, 'mov', 'm')
    take(F, fsrc, 'fix', 'f')
    if Mv and great_fixed: take(Mv, msrc, 'mov', 'm')
    # ---- body lines ----
    def keep_lines(an, tag, want):
        out = []
        for l in an['lines']:
            if l['cls'] == want or (want == 'fix' and l['cls'] == 'fix?'):
                out.append({'src': tag, 'c': l['c'], 'text': l['text'], 'kind': l['kind'], 'cat': cat_of(l['text']) if l['kind'] == 'reading' else 'other'})
        return out
    mlines = keep_lines(Mv, 'm', 'mov') if Mv else []
    fy = D.fromisoformat(fsrc)
    if not (-70 <= (fy - P26).days <= 63) and fsrc not in SPECIAL_26:
        allf = keep_lines(F, 'f', 'fix') + [dict(l2, cls='fix') for l2 in keep_lines(F, 'f', 'mov') if l2['kind'] == 'reading']
        order = {id(l0['c']): i for i, l0 in enumerate(F['lines'])}
        allf.sort(key=lambda l2: order.get(id(l2['c']), 0))
        flines = [l for l in allf if not ord26_line(fsrc, l) and not sunday_mov26(fsrc, l)]
    else:
        flines = [l for l in keep_lines(F, 'f', 'fix') if not ord26_line(fsrc, l)]
    sunday = x.weekday() == 6
    if sunday and not great_fixed:
        flines = [l for l in flines if l['cat'] != 'mat']
    if not sunday:
        flines = [l for l in flines if not (l['cat'] == 'mat' and re.search(r'სახ\.\s*(მე-|1-ლი|\d)', l['text']))]
    # drop what is made afresh
    if regen(x) and Mv:
        src_x = D.fromisoformat(msrc)
        mon = src_x - TD(days=src_x.weekday())
        ord26 = set()
        for i in range(6):
            y = mon + TD(days=i)
            try: ord26 |= keys_of(own_ordinary(y))
            except Exception: pass
        mon27 = x - TD(days=x.weekday())
        for i in range(6):
            try: ord26 |= keys_of(own_of(mon27 + TD(days=i)))
            except Exception: pass
        def is_ord(l):
            ks = set(o_keys(l['text']))
            if re.search(r'ზედმობ|^\s*(ლიტ\.?:?\s*)?რიგ', l['text']): return True
            return bool(ks) and ks <= ord26 and l['cat'] == 'lit'
        mlines = [l for l in mlines if not (l['kind'] == 'reading' and is_ord(l))]
    if sunday and (k < -70 or k > 63 or -70 <= k <= -14):
        mlines = [l for l in mlines if not (l['cat'] == 'mat' and re.search(r'სახ\.', l['text']))]
    if sunday and (k < -70 or k > 63) and Mv:
        mlines = [l for l in mlines if not (l['kind'] == 'reading' and (re.match(r'^\s*(ლიტ\.?:?\s*)?რიგ', l['text']) or sunday_mov26(msrc, l)))]
    gen_lines = []
    if sunday and (k < -70 or k > 63 or -70 <= k <= -14) and not great_fixed:
        if not (msrc and mkind == 'k' and k == -56 and False):
            gen_lines.append({'src': 'g', 'c': eothinon_line(x), 'text': line_text(eothinon_line(x)), 'kind': 'reading', 'cat': 'mat'})
    if sunday and (k < -70 or k > 63):
        so = sunday_ordinary(x)
        if so and not great_fixed:
            has_special = any(l['kind'] == 'reading' and l['cat'] == 'lit' for l in mlines)
            lab = 'რიგ.: ' if has_special or any(l['kind'] == 'reading' and l['cat'] == 'lit' for l in flines) else 'ლიტ.: '
            c = mk_line([(lab, LAB), (refs_text(so) + '.', TXT)])
            gen_lines.append({'src': 'g', 'c': c, 'text': line_text(c), 'kind': 'reading', 'cat': 'lit', 'ord': True})
    if regen(x):
        other_lit = any(l['kind'] == 'reading' and l['cat'] == 'lit' for l in mlines + flines)
        for c in ordinary_lines(x, other_lit):
            gen_lines.append({'src': 'g', 'c': c, 'text': line_text(c), 'kind': 'reading', 'cat': 'lit', 'ord': True})
    # a great saint whose 2026 day was a Sunday lost its matins Gospel there: take it from the monastery calendar
    if not sunday and not (-55 <= k <= 6) and D.fromisoformat(fsrc).weekday() == 6 \
            and not any(l['cat'] == 'mat' for l in mlines + flines + gen_lines):
        o = x - TD(days=13)
        for yy in (2025, 2024):
            e = D(yy, o.month, o.day) + TD(days=13)
            mm = M.get(e.isoformat())
            if not mm or e.weekday() == 6: continue
            got = [m_ref(l2) for l2 in mm.get('k', []) if l2.startswith('ცისკ')]
            got = [g2 for g2 in got if g2]
            if got:
                c = mk_line([('ცისკ.: ', LAB), ('. '.join(g2[1] for g2 in got) + '.', TXT)])
                flines.insert(0, {'src': 'g', 'c': c, 'text': line_text(c), 'kind': 'reading', 'cat': 'mat'})
                log(x, 'matins from monastery ' + e.isoformat())
            break
    # ---- order ----
    def by(cat, srcs): return [l for s in srcs for l in (mlines if s == 'm' else flines if s == 'f' else gen_lines) if l['cat'] == cat]
    first = ['f', 'g', 'm'] if great_fixed else ['g', 'm', 'f']
    mat_first = ['f', 'm', 'g'] if great_fixed else ['m', 'g', 'f']
    lines = by('vesp', ['m', 'f']) + by('mat', mat_first) + by('hours', ['m', 'f'])
    lit = by('lit', first)
    # the ordinary line first among the liturgy readings, unless a great feast's
    lines += lit + by('other', ['m', 'f', 'g'])
    # ---- notes ----
    notes = []
    for an, tag, want, src_iso in ((Mv, 'm', 'mov', msrc), (F, 'f', 'fix', fsrc)):
        if not an: continue
        for nt in an['notes']:
            cls = nt['cls']
            if not nt['stars'] and -70 <= (D.fromisoformat(src_iso) - P26).days <= 63:
                cls = note_side(an, nt['text']) or cls
            if cls == want or (want == 'fix' and cls == 'fix?'): notes.append(dict(nt, src=tag))
    day = {'iso': iso, 'title': title, 'comm': comm_paras, 'lines': lines, 'notes': notes, 'msrc': msrc, 'mkind': mkind, 'fsrc': fsrc, 'tsrc': 'm' if (mkind == 'k' and k <= 56) else 'g'}
    if -3 <= k <= 0:
        # Holy Thursday – Pascha: the movable body exactly as in 2026 (its own order of lines and notes)
        body = O26[msrc]['p']
        i0 = next(j for j, pp in enumerate(body) if not pp)
        vb = [[list(r) for r in pp] for pp in body[i0 + 1:]]
        day['verbatim'] = vb
        day['star_offset'] = max([len(m_) for pp in vb for m_ in STAR.findall(''.join(r[0] for r in pp))] + [0])
        day['lines'] = [l for l in lines if l['src'] == 'f']
        day['notes'] = [n for n in notes if n['src'] == 'f']
        day['tsrc'] = 'm'
    return day

# ---------- stars ----------
STAR = re.compile(r'\*+')
STAR_INFO = {}
def star_info(src_iso):
    """(alias of star lengths with no note, orphan note lengths) of a 2026 day"""
    if src_iso in STAR_INFO: return STAR_INFO[src_iso]
    a = A(src_iso)
    used = set(len(m) for m in STAR.findall(a['title']))
    for para in a['comm']:
        for cls, u in para: used |= set(len(m) for m in STAR.findall(text_of(u['c'])))
    for l in a['lines']: used |= set(len(m) for m in STAR.findall(l['text']))
    notes = set(n['stars'] for n in a['notes'] if n['stars'])
    alias = {}
    free = notes - used
    for u in sorted(used - notes):
        if len(free) == 1: alias[u] = next(iter(free))
    orphan = free - set(alias.values())
    STAR_INFO[src_iso] = (alias, orphan)
    return STAR_INFO[src_iso]
def renumber(day):
    """stars of kept pieces → 1, 2, 3 … in order; notes follow; stars without a kept note go"""
    srcs = {'f': day['fsrc'], 'm': day['msrc'], **day.get('xsrc', {})}
    kept = {(nt['src'], nt['stars']) for nt in day['notes'] if nt['stars']}
    mapping = {}
    def key_of(src, n):
        if src == 'g': return (src, n) if (src, n) in kept else None
        if src not in srcs or not srcs[src]: return None
        alias, _ = star_info(srcs[src])
        k = (src, alias.get(n, n))
        return k if k in kept else None
    off = day.get('star_offset', 0)
    def visit(src, text):
        for m in STAR.finditer(text):
            if src == 'm' and day.get('verbatim'):
                continue
            k = key_of(src, len(m.group(0)))
            if k and k not in mapping: mapping[k] = len(mapping) + 1 + off
    visit(day['tsrc'], day['title'])
    for tag, src_iso, pi, us in day['comm']:
        for u in us: visit(tag, text_of(u['c']))
    for l in day['lines']: visit(l['src'], l['text'])
    def re_chars(src, chars):
        out = []; i = 0
        while i < len(chars):
            if chars[i][0] == '*' and not (src == 'm' and day.get('verbatim')):
                j = i
                while j < len(chars) and chars[j][0] == '*': j += 1
                k = key_of(src, j - i)
                n = mapping.get(k) if k else None
                if n: out.extend(('*', chars[i][1]) for _ in range(n))
                elif out and out[-1][0] == ' ' and j < len(chars) and chars[j][0] in '.;,)': out.pop()
                i = j
            else:
                out.append(chars[i]); i += 1
        return out
    def re_text(src, t):
        def sub(m):
            if src == 'm' and day.get('verbatim'): return m.group(0)
            k = key_of(src, len(m.group(0)))
            return '*' * mapping.get(k, 0) if k else ''
        return STAR.sub(sub, t)
    title = re_text(day['tsrc'], day['title'])
    title = re.sub(r'\s+\.', '.', re.sub(r'\s{2,}', ' ', title)).strip()
    comm = [(tag, src_iso, pi, [dict(u, c=re_chars(tag, u['c']), c0=u['c']) for u in us]) for tag, src_iso, pi, us in day['comm']]
    lines = [dict(l, c=re_chars(l['src'], l['c'])) for l in day['lines']]
    notes = []
    for nt in day['notes']:
        n0 = nt['stars']
        ch = chars_of(nt['p'])
        i = 0
        while i < len(ch) and (ch[i][0] == '*' or ch[i][0].isspace()): i += 1
        f0 = ch[0][1] if ch else TXT
        if n0:
            n = mapping.get((nt['src'], n0))
            if n:
                notes.append((n, runs_of([('*', f0)] * n + [(' ', f0)] + ch[i:]))); continue
            _, orphan = star_info(srcs[nt['src']]) if srcs.get(nt['src']) else ({}, set())
            if n0 in orphan: notes.append((90, runs_of(ch[i:])))
        else:
            notes.append((99, nt['p']))
    notes.sort(key=lambda t: t[0])
    return title, comm, lines, [p for n, p in notes]

def to_json(day):
    title, comm, lines, notes = renumber(day)
    p = []; saints = []
    for text in day.get('lead', []):
        # a feast's tide set by hand (fix_2027): its own bold paragraph, and a name the day service reads
        p.append([[text, BOLD], ['.']])
        saints.append({'n': text, 'b': 1, 'at': [len(p) - 1, 0, len(text)]})
    for tag, src_iso, pi, us in comm:
        runs = join_units(us)
        para_text = ''.join(r[0] for r in runs)
        pos = 0
        for u in us:
            t = text_of(u['c'])
            at = para_text.find(t, pos)
            if at < 0: continue
            t0 = text_of(u.get('c0', u['c']))
            def moved(o):
                n = len(t0[:o].replace('*', ''))
                seen = 0
                for i, ch in enumerate(t):
                    if seen == n and ch != '*': return i
                    if ch != '*': seen += 1
                return len(t)
            for s, off, ln in unit_saints(src_iso, pi, u) if tag in ('f', 'm') else []:
                a0, a1 = moved(off), moved(off + ln - 1) + 1
                e = dict(s); e['at'] = [len(p), at + a0, at + a1]
                saints.append(e)
            pos = at + len(t)
        p.append([list(r) for r in runs])
    # saints the source could not place: find them by name in the kept text
    placed = {id(e) for e in saints}
    have = {(e['n'], e.get('l')) for e in saints}
    for tag, src_iso, pi, us in comm:
        for e in O26[src_iso].get('s', []):
            if 'at' in e or (e['n'], e.get('l')) in have: continue
            for pj, para in enumerate(p):
                t = ''.join(r[0] for r in para)
                i = t.find(e['n'])
                if i >= 0 and any(e['n'] in text_of(u['c']) for u in us):
                    saints.append(dict(e)); have.add((e['n'], e.get('l'))); break
    texts = [''.join(r[0] for r in para) for para in p]
    for e in saints:
        if 'ls' not in e: continue
        new = []
        for item in e['ls']:
            f, t_, life = item[0], item[1], item[2]
            sub = e['n'][f:t_]
            for pj, tx in enumerate(texts):
                i = tx.find(sub)
                if i >= 0: new.append([f, t_, life, pj, i, i + len(sub)]); break
        e['ls'] = new
        if not new: del e['ls']
    for ec in day.get('extra_comm', []): p.append(ec)
    p.append([])
    lit_kind = [l for l in lines if l['kind'] == 'liturgy']
    reads = [l for l in lines if l['kind'] == 'reading']
    others = [l for l in lines if l['kind'] not in ('liturgy', 'reading')]
    def para(ls):
        chars = []
        for i, l in enumerate(ls):
            if i: chars.append(('\n', l['c'][0][1] if l['c'] else TXT))
            chars.extend(l['c'])
        return [list(r) for r in runs_of(chars)]
    if day.get('verbatim'):
        p.extend(day['verbatim'])
        if p and p[-1] == [] and not (lit_kind or reads or others or notes): p.pop()
    for l in lit_kind: p.append(para([l]))
    if reads: p.append(para(reads))
    if others: p.append(para(others))
    if notes:
        if not day.get('verbatim') or (p and p[-1] != []): p.append([]) if not day.get('verbatim') else None
        for n in notes: p.append([list(r) for r in n])
    for d0, old, new in TEXT_FIX:
        if d0 and d0 != day['iso']: continue
        for para_ in p:
            for r in para_:
                if old in r[0]: r[0] = r[0].replace(old, new)
    return {'t': title, 'p': p, 's': saints}

# ---------- days set by hand ----------
def L(parts, cat=None, kind='reading', src='g'):
    """a line from [(text, flag)] or 'label|text'"""
    if isinstance(parts, str):
        lab, _, txt = parts.partition('|')
        parts = [(lab, LAB), (txt, TXT)] if txt else [(lab, TXT)]
    c = mk_line(parts)
    t = line_text(c)
    return {'src': src, 'c': c, 'text': t, 'kind': kind, 'cat': cat or (cat_of(t) if kind == 'reading' else 'other')}
def drop(day, pat):
    day['lines'] = [l for l in day['lines'] if not re.search(pat, l['text'])]
def retext(day, pat, new, count=1):
    for l in day['lines']:
        if re.search(pat, l['text']):
            t = re.sub(pat, new, l['text'], count=count)
            f = l['c'][0][1] if l['c'] else TXT
            # keep the label's flag: the first run up to ':' stays bold
            m = re.match(r'^([^:]{1,30}:)\s*', t)
            if m and l['c'] and l['c'][0][1] in (LAB, 5, 7):
                l['c'] = mk_line([(m.group(0), l['c'][0][1]), (t[m.end():], TXT if l['c'][0][1] == LAB else 6)])
            else:
                l['c'] = mk_line([(t, f)])
            l['text'] = t
def az_line(iso, label, want):
    refs = [r for g in az_groups(iso) for r in g['refs'] if want(g)]
    return L(f'{label}|{refs_text(refs)}.', cat='lit')
def override(day):
    iso = day['iso']
    if iso == '2027-01-14':
        day['title'] = day['title'].replace('33-ე შვიდეული', '33-ე შვიდეული*'); day['tsrc'] = 'f'
        i = next(j for j, l in enumerate(day['lines']) if l['kind'] == 'reading' and l['cat'] == 'lit')
        day['lines'].insert(i, L('ცისკ.: |ინ. 10: 9-16 (დას. 36).', cat='mat'))
    if iso == '2027-01-16':
        day['lines'] = [l for l in day['lines'] if l['cat'] != 'hours']
        drop(day, r'ლიტურგია არ აღესრულება|დიდნი ჟამნი')
    if iso == '2027-01-18':
        hours = [dict(l, src='h', cat='hours') for l in A('2026-01-16')['lines'] if l['kind'] == 'reading' and cat_of(l['text']) == 'hours']
        rest = [l for l in day['lines'] if l['kind'] == 'reading']
        for l in rest:
            if l['text'].startswith('1 კორ. 9: 19-27'):
                l.update(L('ლიტ.: |' + l['text'] , cat='lit'))
        others = [l for l in day['lines'] if l['kind'] != 'reading']
        for l in others:
            if l['text'].startswith('ლიტურგია იოანე ოქროპირისა'):
                l.update(L([('დიდი აიაზმა*. მარხვა.', 5)], kind='liturgy', src='f'))
        lit = L([('ლიტურგია წმ. ბასილი დიდისა. დიდნი ჟამნი*.', 5)], kind='liturgy', src='h')
        day['lines'] = [lit] + others + hours + rest
        day.setdefault('xsrc', {})['h'] = '2026-01-16'
        day['notes'] += [dict(nt, src='h') for nt in A('2026-01-16')['notes'] if nt['stars'] == 1]
        day['notes'].append({'stars': 0, 'src': 'g', 'p': [['შენიშვნა:', 5], [' მწუხრი შესრულდება ბასილი დიდის ლიტურგიასთან შეერთებული, ლიტურგიის შემდგომ – დიდი აიაზმა.', 4]], 'text': ''})
    if iso == '2027-01-19':
        day['comm'] = [(t, si, pi, [u for u in us if 'სახარების საკითხავები 32-ე' not in text_of(u['c'])]) for t, si, pi, us in day['comm']]
        day['comm'] = [c for c in day['comm'] if c[3]]
    if iso == '2027-01-25':
        day['title'] = day['title'].replace('შვიდეული', 'შვიდეული*', 1); day['tsrc'] = 'g'
        day['notes'].insert(0, {'stars': 1, 'src': 'g', 'text': 'უკუქცევა', 'p': [['* ნათლისღების უკუქცევა: ამ შვიდეულიდან მეზვერისა და ფარისევლის კვირიაკემდე იკითხება 30-ე – 33-ე შვიდეულების რიგითი საკითხავები (იხ. 6 იანვრის შენიშვნა „გარდაჴდომისა“ და „უკუქცევის“ შესახებ).', 4]]})
    if iso == '2027-03-07':
        day['lines'].append(az_line(iso, 'ლიტ.: ', lambda g: g['s'] == 'lit'))
    if iso == '2027-04-06':
        retext(day, r'^(მწუხრზე: .*?)\.?\s*$', r'\1. ხარებისა: 1) დაბ. 28: 10-17. 2) ეზეკ. 43: 27 - 44: 4. 3) იგავ. 9: 1-11.')
    if iso == '2027-04-07':
        hours = [l for l in day['lines'] if l['cat'] == 'hours']
        notes_keep = day['notes']
        day['lines'] = [L([('ლიტურგია წმ. იოანე ოქროპირისა.', 5)], kind='liturgy'),
                        L('მწუხრზე: |დღის: დაბ. 9: 18 - 10: 1. იგავ. 12: 23 - 13: 9. ხარებისა: 1) გამ. 3: 1-8. 2) იგავ. 8: 22-30.', cat='vesp'),
                        L('ცისკ.: |ლკ. 1: 39-49, 56 (დას. 4).', cat='mat')] + hours + [
                        L('ლიტ.: |ხარებისა: ებრ. 2: 11-18 (დას. 306). ლკ. 1: 24-38 (დას. 3).', cat='lit'),
                        L([('ხსნილია თევზით.', 5)], kind='other')]
    if iso == '2027-04-26':
        retext(day, r'\s*ხარებისა:\s*3\).*$', '')
        retext(day, r'^მწუხრ\. რიგ\.:', 'მწუხრ.:')
        retext(day, r'^ლიტ\.\s*მთ\.', 'ლიტ.: მთ.')
    if iso == '2027-04-27':
        day['lines'] = [L([('ლიტურგია პირველშეწირულისა.', 5)], kind='liturgy'),
                        L('მწუხრ.: |1) გამ. 2: 5-10. 2) იობ. 1: 13-22.', cat='vesp'),
                        L('ცისკ.: |მთ. 22: 15 - 23: 39 (დას. 90).', cat='mat'),
                        L('VI ჟამზე: |ეზეკ. 1: 21 - 2: 1.', cat='hours'),
                        L('ლიტ.: |მთ. 24: 36 - 26: 2 (დას. 102).', cat='lit')]
    if iso == '2027-05-03':
        day['notes'] = [n for n in day['notes'] if 'იხ. 28 მარტის' not in n.get('text', '')]
    if iso == '2027-06-05':
        drop(day, r'^ნათლისმც\.:')
        day['notes'] = [n for n in day['notes'] if 'მესამედ პოვნის' not in n.get('text', '')]
    if iso == '2027-06-07':
        day['lines'] = [L('ცისკ.: |ლკ. 7: 17-30 (დას. 31).', cat='mat')] + day['lines'] + [L('ნათლისმც.: |2 კორ. 4: 6-15 (დას. 176). მთ. 11: 2-15 (დას. 40).', cat='lit')]
        day['notes'] = [n for n in day['notes'] if 'მესამედ პოვნის' not in n.get('text', '')]
    if iso == '2027-06-27':
        drop(day, r'წინასწარმეტ\.?:')
    if iso == '2027-05-12':
        day['extra_comm'] = [[['უწმიდესისა და უნეტარესის, სრულიად საქართველოს კათოლიკოს-პატრიარქ შიო III-ის აღსაყდრების (ინტრონიზაციის) დღე (2026 წ.).', 3]]]
    return day
TEXT_FIX = [  # (day or None, old, new) on the finished text
    (None, '(იხ. 26 მაისი, პეტრე-პავლობის', '(იხ. 15 ივნისი, პეტრე-პავლობის'),
    ('2028-01-07', '2027 წლის 5 (18) იანვრამდე', '2028 წლის 5 (18) იანვრამდე'),
]
# ---------- 2027: what 2026's coincidences left on the wrong day ----------
# In 2026 (Pascha 12 April) several fixed feasts met the Triodion or the Pentecostarion, and the lines and notes
# written for that meeting were carried to the same distance from Pascha — a wrong day in 2027 (Pascha 2 May).
# Each move below was checked against the 2026 calendar's same old-style date and the 2021 calendar with the
# small typikon (the same Pascha as 2027), 2026-11-19. A pattern that finds nothing stops the build.
CAT_ORDER = {'vesp': 0, 'mat': 1, 'hours': 2, 'lit': 3}
def _take(day, pat, n=1):
    got = [l for l in day['lines'] if re.search(pat, l['text'])]
    assert len(got) == n, f"{day['iso']}: {pat!r} found {len(got)} lines, not {n}"
    day['lines'] = [l for l in day['lines'] if not re.search(pat, l['text'])]
    return [dict(l, src='g') for l in got]
def _put(day, line):
    """a reading line into its place: vespers, matins, hours, liturgy"""
    rank = CAT_ORDER.get(line['cat'], 4)
    at = 0
    for j, l in enumerate(day['lines']):
        if l['kind'] == 'reading' and CAT_ORDER.get(l['cat'], 4) <= rank: at = j + 1
    day['lines'].insert(at, line)
def _note_take(day, pat, n=1):
    got = [nt for nt in day['notes'] if re.search(pat, nt.get('text') or flat(nt['p']))]
    assert len(got) == n, f"{day['iso']}: note {pat!r} found {len(got)}, not {n}"
    day['notes'] = [nt for nt in day['notes'] if nt not in got]
    return [dict(nt, src='g') for nt in got]
def _tide_take(day, pat):
    """a feast's tide — the paragraph that is this one unit — out of the day"""
    for i, (tag, src_iso, pi, us) in enumerate(day['comm']):
        if len(us) == 1 and re.search(pat, text_of(us[0]['c'])): return day['comm'].pop(i)
    raise AssertionError(f"{day['iso']}: no tide {pat!r}")
def fix_2027(days):
    d = lambda md: days['2027-' + md]
    def move(a, b, pat, n=1):
        for l in _take(d(a), pat, n):
            if b: _put(d(b), l)
    def move_note(a, b, pat, n=1):
        for nt in _note_take(d(a), pat, n):
            if b: d(b)['notes'].append(nt)
    # --- matins Gospels and readings of saints whose day does not move ---
    move('02-22', '02-02', r'^ცისკ\.: მთ\. 11')                       # Euthymius the Great
    move('02-27', None, r'^ცისკ\.: ინ\. 10: 1-9')                     # Gregory the Theologian: a Sunday in 2027
    move('03-01', '02-09', r'^ცისკ\.: ინ\. 10: 1-9')                  # the relics of John Chrysostom
    move('03-04', '02-12', r'^ცისკ\.: ინ\. 10: 9-16')                 # the Three Hierarchs
    move('02-19', '03-11', r'^მწუხრ\.: შიოსი')                         # Shio of Mgvime: Thursday of Cheesefare
    move('02-19', '03-11', r'^ცისკ\.: მთ\. 11')
    # the Finding of the Forerunner's Head: a Lent Monday in 2026, Tuesday of Cheesefare in 2027
    _take(d('03-29'), r'^ლიტურგია პირველშეწირულისა'); _take(d('03-29'), r'^ცისკ\.: ლკ\. 7')
    for l in _take(d('03-29'), r'^მწუხრზე: წინამორბ'):
        _put(d('03-09'), L('მწუხრ.: |' + re.sub(r'^მწუხრზე: წინამორბ\.:\s*', '', l['text']), cat='vesp'))
    _put(d('03-09'), L('ცისკ.: |ლკ. 7: 17-30 (დას. 31).', cat='mat'))
    retext(d('03-29'), r'^ლიტ\. მწუხრზე რიგ\.:\s*', 'მწუხრზე: ')
    # the Forty Martyrs: a Sunday in 2026, Monday of Lent's second week in 2027 (the Presanctified, as for the
    # Head on a Lent Monday in 2026)
    _take(d('04-11'), r'^მწუხრ\.:\s*40 მოწ')
    own = _take(d('03-22'), r'^მწუხრზე:')[0]
    hours = [l for l in d('03-22')['lines'] if l['cat'] == 'hours']
    d('03-22')['lines'] = [L([('ლიტურგია პირველშეწირულისა.', 5)], kind='liturgy'),
                           L('მწუხრზე: |40 მოწ.: 1) ეს. 43: 9-14. 2) სიბრძ. 3: 1-9. 3) სიბრძ. 5: 15 - 6: 3.', cat='vesp'),
                           L('ცისკ.: |ლკ. 21: 12-19 (დას. 106).', cat='mat')] + hours + [
                           L('ლიტ. მწუხრზე რიგ.: |' + re.sub(r'^მწუხრზე:\s*', '', own['text']), cat='lit')] + [
                           l for l in d('03-22')['lines'] if l['cat'] != 'hours']
    # St George: Mid-Pentecost in 2026, Bright Thursday in 2027
    _take(d('05-06'), r'^დიდმოწამისა:')
    _put(d('05-06'), L('მწუხრ.: |დიდმოწამისა: 1) ეს. 43: 9-14. 2) სიბრძ. 3: 1-9. 3) სიბრძ. 5: 15 - 6: 3.', cat='vesp'))
    move('05-26', '05-06', r'^ცისკ\.: ლკ\. 12')
    move_note('05-26', None, r'დაემთხვა ერგასის განზოგების')
    move('06-02', '05-13', r'^ცისკ\.:\s*ინ\. 21')                     # James, the son of Zebedee
    # John the Theologian: the Ascension in 2026, a plain Friday in 2027
    _take(d('05-21'), r'^მოციქულისა:')
    _put(d('05-21'), L('მწუხრ.: |მოციქულისა: 1) 1 ინ. 3: 21 - 4: 6. 2) 1 ინ. 4: 11-16. 3) 1 ინ. 4: 20 - 5: 5.', cat='vesp'))
    _put(d('05-21'), L('ცისკ.: |ინ. 21: 15-25 (დას. 67).', cat='mat'))
    move_note('05-21', None, r'ამაღლების განგებასთან ერთად')
    move('06-11', '05-22', r'^ცისკ\.: მთ\. 4')                         # Shio's repose
    move_note('06-11', '05-22', r'სადაც შესრულდება წმიდა ნიკოლოზის')
    move('06-12', None, r'^ცისკ\.: ინ\. 21')                          # Simon the Zealot: a Sunday in 2027
    move('05-24', '06-13', r'^მწუხრ\.: წმიდათა მამათა')               # the Fathers of the First Council: the 7th Sunday
    for l in _take(d('06-13'), r'^მოც\. სწორთა: 4\)'): _put(d('06-13'), dict(l, cat='vesp'))   # … and Mirian and Nana's after them
    move('06-15', '05-26', r'^ცისკ\.:\s*ლკ\. 6')                       # Euthymius of Athos
    move('06-15', '05-26', r'^ღირ\. 1 კორ\. 12')
    move('06-21', '06-01', r'^ცისკ\.: მთ\. 10')                        # St Nino's coming to Georgia
    move('06-23', '06-03', r'^ცისკ\.:\s*ინ\. 10')                      # Constantine and Helen
    move('06-23', '06-03', r'^მოციქულთა სწორთა - საქმ')
    move('06-25', None, r'^ცისკ\.: ლკ\. 7')                           # the Third Finding is set by hand on 7 June
    move_note('06-25', None, r'^შენიშვნა 1: ტიპიკონის მითითებით წმ\. იოანე ნათლის')
    # --- the Meeting of the Lord (a Monday, before the Triodion): forefeast on the 14th, leave-taking on the 22nd ---
    d('02-14')['comm'].insert(0, _tide_take(d('02-13'), r'მიგებების წინადღესასწაული'))
    leave = _tide_take(d('02-19'), r'მიგებების დღესასწაულის წარგზავნა')
    after = next(c for c in d('02-18')['comm'] if len(c[3]) == 1 and 'მიგებების შემდგომი დღესასწაული' in text_of(c[3][0]['c']))
    for md in ('02-19', '02-20', '02-21'):
        d(md)['comm'].insert(0, (after[0], after[1], after[2], [dict(after[3][0])]))
    d('02-22')['comm'].insert(0, leave)
    move_note('03-05', None, r'მიგებების წინადღესასწაულის განგება')
    move_note('03-06', None, r'მიგებების წინადღესასწაულის განგება')
    # --- the Annunciation (Wednesday of Lent's fourth week): forefeast on the 6th, leave-taking on the 8th ---
    d('04-06')['lead'] = ['წინადღესასწაული ყოვლადწმიდა ღმრთისმშობლის ხარებისა']
    d('04-08')['lead'] = ['ხარების დღესასწაულის წარგზავნა', 'კრება მთავარანგელოზისა გაბრიელისა']
    move_note('04-22', None, r'წინადღესასწაული ყოვლადწმიდა ღმრთისმშობლის ხარებისა')
    move_note('04-22', None, r'ხარების წინადღესასწაულის განგება გადმოიტანება')
    # --- notes about a saint of a fixed day ---
    move_note('02-23', '02-03', r'წმიდა კალისტრატეს')
    move_note('02-26', '02-06', r'წმიდა მელქისედეკის')
    move_note('03-03', '02-11', r'წმიდა აშოტის')
    move_note('03-19', '02-27', r'ღირსი ილარიონის განგებაზე')
    move_note('06-26', '06-06', r'წმიდა გიორგი მთაწმინდელის')
    move_note('06-09', None, r'^შენიშვნა 1: ღირსთა დღესასწაული ჩატარდება')

def build_all():
    out = {}
    x = START
    while x <= END:
        out[x.isoformat()] = override(build_day(x))
        x += TD(days=1)
    if Y == 2027: fix_2027(out)
    return out

if __name__ == '__main__':
    import os
    days = build_all()
    js = {}
    for iso, d in days.items():
        j = to_json(d)
        j['c'] = 1          # made by the rules here, not yet orthodoxy.ge's own page
        js[iso] = j
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'data', 'calendar', f'{Y}.json')
    year = {'year': Y, 'source': 'computed', 'computed': True, 'days': js}
    with open(out, 'w') as fh:
        json.dump(year, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(js)} days → {os.path.normpath(out)}')
