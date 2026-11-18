import sys, re, json, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import o_keys
from geolect import o_refs
from cycle import pascha, D, TD
G = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'src', 'data', 'calendar', '2027.json')))['days']
P = pascha(2027)
MAXZ = {'Mt': 116, 'Mk': 71, 'Lk': 114, 'Jn': 67, 'Ap': 335}
for iso, d in sorted(G.items()):
    x = D.fromisoformat(iso); k = (x - P).days
    paras = [''.join(r[0] for r in p) for p in d['p']]
    i0 = paras.index('') if '' in paras else len(paras)
    comm, body = paras[:i0], paras[i0 + 1:]
    text = '\n'.join(body)
    keys = o_keys(text)
    issues = []
    for kk in keys:
        fam = 'Ap' if kk.startswith('Ap') else kk[:2]
        n = int(re.sub(r'\D', '', kk))
        if n < 1 or n > MAXZ.get(fam, 999): issues.append(f'bad zach {kk}')
    dup = [kk for kk, c in collections.Counter(keys).items() if c > 1]
    if dup and not (-3 <= k <= 0): issues.append(f'dup {dup}')
    if not ''.join(comm).strip(): issues.append('no commemorations')
    lent = -48 <= k <= -1
    if not keys and not lent and x.weekday() != 6: issues.append('no NT readings')
    if re.search(r'\*', d['t']) and not any(re.match(r'^\*', b) for b in body): issues.append('title star without note')
    stars = collections.Counter(len(m) for m in re.findall(r'\*+', '\n'.join(comm) + '\n' + '\n'.join(b for b in body if not re.match(r'^\s*\*', b)) + d['t']))
    notes = collections.Counter(len(re.match(r'^\s*(\*+)', b).group(1)) for b in body if re.match(r'^\s*\*', b))
    if set(stars) != set(notes): issues.append(f'stars {dict(stars)} notes {dict(notes)}')
    if issues: print(iso, k, x.strftime('%a'), '; '.join(issues))
