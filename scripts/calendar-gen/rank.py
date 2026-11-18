"""Georgian rank of a fixed old-style date: does a great saint/feast push the weekday's ordinary readings out?"""
import re, sys, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import O26, flat, o_keys, M, zkey, GEO2AZ, BOOKS_RE
from cycle import pascha, D, TD
from azg import groups as az_groups, AZFIX
P25, P26 = pascha(2025), pascha(2026)
LORD_THEOTOKOS = {(1,1),(1,6),(2,2),(3,25),(8,6),(8,15),(9,8),(9,14),(11,21),(12,25),(1,7)}
def own_ord(iso):
    """the day's own ordinary readings in azbyka: keys, and refs"""
    out = []
    for g in az_groups(iso):
        gg = g['g']
        if gg in ('', 'Рядовое', 'Ряд.', 'Ряд') or gg.startswith('Ряд. (под зачало)') or gg.startswith('Рядовое'):
            if g['s'] in ('lit', ''): out += g['refs']
    return out
def joined_from(iso):
    """{weekday name: refs} joined onto this day by azbyka"""
    out = {}
    for g in az_groups(iso):
        m = re.match(r'^(?:и )?[Зз]а (\S+)', g['g'])
        if m and g['s'] in ('lit', ''): out.setdefault(m.group(1), []).extend(g['refs'])
    return out
RU_WD = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье']
def own_ord_full(iso):
    """own ordinary, including what azbyka moved to a neighbour"""
    own = own_ord(iso)
    if own: return own
    x = D.fromisoformat(iso)
    for dd in (-1, 1, -2, 2):
        y = (x + TD(days=dd)).isoformat()
        try: j = joined_from(y)
        except KeyError: continue
        w = RU_WD[x.weekday()]
        for k, v in j.items():
            if k.startswith(w[:4]): return v
    return []
def keys_of(refs):
    return {k for k in (zkey(AZFIX.get(b, b), z) for b, cv, z in refs) if k}
MREF = re.compile(r'(' + BOOKS_RE + r')\.?\s*(\d+)\s*დას')
def m_lines(iso):
    x = M.get(iso)
    return x.get('k', []) if x else []
def m_has_ordinary(iso):
    """monastery calendar: a plain 'ლიტ –' reading (not a saint's)"""
    for l in m_lines(iso):
        if re.match(r'^ლიტ\.?\s*[–-]\s*(' + BOOKS_RE + r')', l) or re.match(r'^რიგ', l): return True
    return False
WD_ABBR = ['ორშ', 'სამშ', 'ოთხშ', 'ხუთშ', 'პარ', 'შაბ', 'კვ']
def o26_ordinary_state(iso):
    """(the day reads its own weekday readings, the day has any liturgy readings) in the 2026 calendar"""
    from geolect import label_of, ORD_LABEL, o_refs
    x = D.fromisoformat(iso)
    t = '\n'.join(flat(p) for p in O26[iso]['p'])
    has_ord = has_lit = False
    for line in t.split('\n'):
        s = line.strip()
        if not s or s.startswith('*') or re.match(r'^(ცისკ|მწუხ|[IVX]+\s*ჟამ|წყლის)', s): continue
        refs = o_refs(s)
        if not refs: continue
        has_lit = True
        m = re.search(r'-\s*(ორშ|სამშ|ოთხშ|ხუთშ|პარ|შაბ)\.', s)
        if m:
            if m.group(1) == WD_ABBR[x.weekday()]: has_ord = True
            continue
        if 'ზედმობ' in s:
            has_ord = True
            continue
        lab = label_of(s)
        lab2 = re.sub(r'^ლიტ\.?\s*[-–]?\s*', '', lab or '').strip()
        if lab is not None and lab2 == '':
            rest = s.split(':', 1)[1] if ':' in s else ''
            m2 = re.match(r'^\s*([^:\d]{1,40}?)\s*:', rest)
            if m2: lab2 = m2.group(1).strip()
        if lab is None or lab2 in ('', 'რიგ.', 'რიგ') or re.search(r'რიგ', lab or ''):
            kinds = {('ap' if k.startswith('Ap') else 'ev') for k, _ in refs}
            if len(kinds) == 2: has_ord = True
    return has_ord, has_lit
def rank_great(old_m, old_d):
    """True when the date's saint/feast takes the weekday ordinary readings' place (Georgian practice)"""
    if (old_m, old_d) in LORD_THEOTOKOS: return True, 'feast'
    o26 = D(2026, old_m, old_d) + TD(days=13)
    iso = o26.isoformat()
    k = (o26 - P26).days
    if o26.weekday() != 6 and not (-55 <= k <= 6) and iso in O26:
        has_ord, has_lit = o26_ordinary_state(iso)
        if has_ord: return False, 'o26'
        return has_lit, 'o26'
    e = D(2025, old_m, old_d) + TD(days=13)
    k25 = (e - P25).days
    if e.weekday() != 6 and not (-70 <= k25 <= 56) and e.isoformat() in M:
        return (not m_has_ordinary(e.isoformat())), 'm25'
    return False, 'default'
