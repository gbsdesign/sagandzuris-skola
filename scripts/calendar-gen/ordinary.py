"""Which ordinary readings a day gets (Georgian practice): own, omitted, joined."""
import sys, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from rank import rank_great, keys_of, LORD_THEOTOKOS
from lect import own_ordinary
from cycle import pascha, D, TD
RANK_OVERRIDE = {(12, 22): False, (12, 23): False, (12, 21): False}
def great_of(x):
    o = x - TD(days=13)
    if (o.month, o.day) in RANK_OVERRIDE: return RANK_OVERRIDE[(o.month, o.day)]
    return rank_great(o.month, o.day)[0]
def special_kind(x):
    """the special Saturdays/Sundays of the fixed cycle (by the new-style date x)"""
    o = x - TD(days=13); md = (o.month, o.day); wd = x.weekday()
    def between(a, b): return a <= md <= b
    if wd == 5:
        if between((1, 1), (1, 4)): return 'sat_before_theophany'
        if between((1, 7), (1, 13)): return 'sat_after_theophany'
        if between((9, 7), (9, 13)): return 'sat_before_elevation'
        if between((9, 15), (9, 21)): return 'sat_after_elevation'
        if between((12, 18), (12, 24)): return 'sat_before_nativity'
        if between((12, 26), (12, 31)): return 'sat_after_nativity'
        if between((10, 19), (10, 25)): return 'dimitri_sat'
    if wd == 6:
        if between((1, 1), (1, 5)): return 'sun_before_theophany'
        if between((1, 7), (1, 13)): return 'sun_after_theophany'
        if between((9, 7), (9, 13)): return 'sun_before_elevation'
        if between((9, 15), (9, 21)): return 'sun_after_elevation'
        if between((12, 11), (12, 17)): return 'forefathers'
        if between((12, 18), (12, 24)): return 'sun_before_nativity'
        if between((12, 26), (12, 31)): return 'sun_after_nativity'
        if between((7, 13), (7, 19)): return 'fathers_4'
        if between((10, 11), (10, 17)): return 'fathers_7'
    return None
JOIN_PREV_SAT = {'sat_before_elevation', 'sat_after_elevation', 'sat_before_nativity'}
def plan_week(days, P, Pnext=None, own_of=None, busy=None):
    """days: list of date (Mon..Sat of one week). -> {date: [(refs, weekday-from)]}"""
    own_of = own_of or own_ordinary
    busy = busy or (lambda y: False)
    out = {x: [] for x in days}
    omitted = {}
    def lent(x):
        k = (x - P).days
        k2 = (x - Pnext).days if Pnext else -999
        return -48 <= k <= 56 or -48 <= k2 <= 56
    for x in days:
        own = own_of(x)
        if not own: continue
        k = (x - P).days
        if lent(x):
            out[x].append((own, x)); continue
        o = x - TD(days=13)
        sk = special_kind(x)
        if (o.month, o.day) in LORD_THEOTOKOS or great_of(x) or sk in JOIN_PREV_SAT:
            omitted[x] = own
        else:
            out[x].append((own, x))
    for x, own in omitted.items():
        cands = []
        for dd in (-1, 1):
            y = x + TD(days=dd)
            if y in out and y not in omitted and y.weekday() != 6 and not lent(y):
                o = y - TD(days=13)
                if (o.month, o.day) in LORD_THEOTOKOS or (o.month, o.day) in ((12, 24), (1, 5)): continue
                if not own_of(y): continue
                cands.append((bool(busy(y)), dd != -1, y))
        if cands:
            target = min(cands)[2]
            out[target].append((own, x))
    return out
