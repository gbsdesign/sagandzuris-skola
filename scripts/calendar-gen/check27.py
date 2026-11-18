"""Compare the generated 2027 days with azbyka 2027: movable readings missing or extra."""
import sys, re, json
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import o_keys, zkey
from azg import groups
from cycle import pascha, D, TD
G = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'src', 'data', 'calendar', '2027.json')))['days']
MOVG = re.compile(r'^(Ряд|За |и за|за |Недел|Суббот|Святых отец|Богоотец|Час|Ап$)')
P = pascha(2027)
def gkeys(d):
    t = '\n'.join(''.join(r[0] for r in p) for p in d['p'])
    return set(o_keys(t))
out = []
for iso, d in sorted(G.items()):
    x = D.fromisoformat(iso)
    k = (x - P).days
    gk = gkeys(d)
    azm = set(); azall = set()
    for g in groups(iso):
        ks = {zkey(b, z) for b, cv, z in g['refs']} - {None}
        azall |= ks
        if MOVG.match(g['g']) or (g['g'] == '' ): azm |= ks
    miss = azm - gk
    if miss: out.append((iso, k, x.strftime('%a'), 'MISS', sorted(miss), d['t'][:50]))
for r in out: print(*r)
print(len(out))
