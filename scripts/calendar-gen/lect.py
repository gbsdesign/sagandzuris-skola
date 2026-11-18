"""Lectionary positions (Apostle week, Gospel week) and a table built from azbyka's plain days."""
import sys, re, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from azg import groups as az_groups, AZ, AZFIX
from cycle import pascha, D, TD
GOSPELS = {'Mt', 'Mk', 'Lk', 'Jn'}
FEASTISH = {(1,1),(1,6),(1,7),(2,2),(3,25),(6,24),(6,29),(6,30),(8,1),(8,6),(8,15),(8,29),(9,8),(9,14),(9,26),(10,1),(11,21),(12,25),(12,26),(7,20),(11,8),(11,13),(12,6)}
def pent(x):
    p = pascha(x.year) + TD(days=49)
    if x <= p: p = pascha(x.year - 1) + TD(days=49)
    return p
def ap_week(x):
    days = (x - pent(x)).days
    return days // 7 + (0 if x.weekday() == 6 else 1)
def jump_monday(x):
    """Monday after the Sunday after the Elevation (Sept 14 old) of x's Pentecost year"""
    pc = pent(x)
    elev = D(pc.year, 9, 27)
    sun_after = elev + TD(days=(6 - elev.weekday()) % 7 or 7)
    return sun_after + TD(days=1)
def gospel_week(x):
    jm = jump_monday(x)
    if x < jm: return ap_week(x), 'mt'
    days = (x - jm).days
    if x.weekday() == 6: return 18 + days // 7, 'lk'   # the Sunday closing that week
    return 18 + days // 7, 'lk'
def plain_ord(iso):
    gs = az_groups(iso)
    rg = [g for g in gs if re.match(r'^(Рядовое|Ряд)', g['g']) and g['s'] in ('lit', '')]
    if rg: return [r for g in rg for r in g['refs']]
    labelled = [g for g in gs if g['g'] and not g['g'].startswith(('За ', 'и за'))]
    if labelled: return None
    return [r for g in gs if g['g'] == '' and g['s'] in ('lit', '') for r in g['refs']]
def build():
    ap, ev = {}, {}
    for iso in AZ:
        x = D.fromisoformat(iso)
        if x.weekday() == 6: continue
        o = x - TD(days=13)
        if (o.month, o.day) < (5, 1) and (o.month, o.day) > (1, 6): continue   # Jan–Apr: otstupka and Triodion
        if -70 <= (x - pascha(x.year)).days <= 56: continue
        if (o.month, o.day) in FEASTISH: continue
        refs = plain_ord(iso)
        if not refs: continue
        a = [r for r in refs if AZFIX.get(r[0], r[0]) not in GOSPELS]
        e = [r for r in refs if r[0] in GOSPELS]
        norm = lambda r: (AZFIX.get(r[0], r[0]), r[1], re.sub(r'[^\d]', ' ', r[2]).split()[0] if re.sub(r'[^\d]', ' ', r[2]).split() else '', 'полу' in r[2])
        if len(a) == 1: ap.setdefault((ap_week(x), x.weekday()), set()).add(norm(a[0]))
        if len(e) == 1: ev.setdefault((gospel_week(x), x.weekday()), set()).add(norm(e[0]))
    return ap, ev
AP_T, EV_T = build()
def table_ord(x):
    a = AP_T.get((ap_week(x), x.weekday()))
    e = EV_T.get((gospel_week(x), x.weekday()))
    out = []
    def back(r):
        b, cv, z, mid = r
        return [b, cv, (z + (' от полу' if mid else ''))]
    if a and len(a) == 1: out.append(back(next(iter(a))))
    if e and len(e) == 1: out.append(back(next(iter(e))))
    return out
RU_WD = ['понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу', 'воскресенье']
def in_table_period(x):
    o = x - TD(days=13)
    if (o.month, o.day) >= (1, 7) and (o.month, o.day) < (5, 1): return False
    for P in (pascha(x.year), pascha(x.year + 1)):
        if -70 <= (x - P).days <= 56: return False
    return True
def own_ordinary(x):
    """the day's own ordinary readings (refs), whatever azbyka did with them"""
    if x.weekday() != 6 and in_table_period(x):
        t = table_ord(x)
        if len(t) == 2: return t
        try:
            from geolect import gt
            a, e = gt(x)
        except Exception:
            a = e = None
        have = {('ap' if AZFIX.get(r[0], r[0]) not in GOSPELS else 'ev') for r in t}
        extra = []
        for kind, g in (('ap', a), ('ev', e)):
            if kind in have or not g: continue
            (k, st), votes = g
            if votes[k] >= 2 or not t or len(votes) == 1: extra.append(('GEO', st, k))
        if extra or t: return t + extra
    return own_ordinary_az(x)
def own_ordinary_az(x):
    iso = x.isoformat()
    o = x - TD(days=13)
    feast = (o.month, o.day) in FEASTISH
    if not feast:
        p = plain_ord(iso)
        if p: return p
    # moved by azbyka onto a neighbour?
    w = RU_WD[x.weekday()][:4]
    for dd in (-1, 1, -2, 2):
        y = (x + TD(days=dd)).isoformat()
        if y not in AZ: continue
        for g in az_groups(y):
            m = re.match(r'^(?:и )?[Зз]а (\S+)', g['g'])
            if m and m.group(1).startswith(w) and g['s'] in ('lit', ''): return g['refs']
    if (o.month, o.day) >= (5, 1) or (o.month, o.day) <= (1, 6):
        if not (-70 <= (x - pascha(x.year)).days <= 56):
            return table_ord(x)
    return []
