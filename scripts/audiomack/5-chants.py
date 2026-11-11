"""Audiomack, step 5: the chant albums of the library (data/chantAlbums.ts) — each file against every Audiomack track
(length within 1 s, same title, at least 3 of one performer in one Audiomack album). The user kept the notes page on the school's
own player (2026-11-11), so only the album recordings were added to public/centre/am (one hand drop: „წმიდანო მოწამენო“)."""
import json, re, sys, collections
sys.path.insert(0, '/tmp/amscripts')
import os
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '3-match.py') + '').read()
exec(src[:src.index('def pair(')].replace("arr = [json.loads", "arr = [] and [json.loads"))
items = []  # (id, title, voice, source)
for line in open(f'{REPO}/src/data/chantRecordings.ts', encoding='utf8'):
    ids = re.findall(r"id: '([\w-]{25,})'", line)
    if not ids: continue
    t = line.split('//', 1)[1] if '//' in line else ''
    t = t.split('·')[-1] if '·' in t else t
    for i in ids: items.append((i, t.strip(), None, 'rec'))
for m in re.finditer(r"\['([\w-]{25,})', '([^']*)'", open(f'{REPO}/src/data/chantAlbums.ts', encoding='utf8').read()):
    items.append((m[1], m[2], None, 'album'))
reg = open(f'{REPO}/src/data/chantMediaRegistry.ts', encoding='utf8').read()
for m in re.finditer(r'"title": "([^"]*)"(.*?)"tracks"', reg, re.S):
    t = re.sub(r'^[\d.]+\s*(გ\.ს\.|ქ\.კ\.|შ\.ს\.)?\s*', '', m[1])
    for v, key in ((1, 'voice1Url'), (2, 'voice2Url'), (3, 'voice3Url'), (None, 'allVoicesUrl')):
        mm = re.search(rf'"{key}": "[^"]*id=([\w-]+)', m[2])
        if mm: items.append((mm[1], t, v, 'reg'))
items = list({i[0]: i for i in items}.values())
print('items', len(items), collections.Counter(i[3] for i in items))
ALL = [(k, ai, at, ad, slug) for k, ts in AMT.items() for ai, at, ad, slug in ts]
out = {}; amb = 0
for i, t, v, s in items:
    d = dur.get(i, {}).get('dur')
    if d is None: continue
    g = gnorm(t)
    cands = []
    for k, ai, at, ad, slug in ALL:
        if ad is None or abs(d - ad) > 1.2: continue
        sim = tsim(g, at)
        av = avoice(am[k]['tracks'][ai]['name'])
        if v is not None and av is not None and av != v: continue
        if v is None and av is not None and av in (1, 2, 3) and s == 'reg': continue
        cands.append((sim or 0, -abs(d - ad), k, slug, am[k]['tracks'][ai]['name']))
    good = [c for c in cands if c[0] >= 0.85]
    if len({c[3] for c in good}) == 1:
        out[i] = (good[0][3], t, v, s, good[0][4], round(-good[0][1], 2), am[good[0][2]]['name'])
    elif len(good) > 1: amb += 1
print('matched', len(out), 'ambiguous', amb, collections.Counter(x[3] for x in out.values()))
json.dump(out, open('/tmp/amc/match.json', 'w'), ensure_ascii=False, indent=0)
for k, x in list(out.items())[:400]:
    print(x[3], x[2], '|', x[1][:30], '|', x[4][:45], '|', x[5], '|', x[6][:35])

# ---- v2: the school's own learning recordings by voices = AM „წირვის საგალობლები • სასწავლო“ groups; others need album consistency
whoOf = {}
for line in open(f'{REPO}/src/data/chantRecordings.ts', encoding='utf8'):
    for i, w in re.findall(r"id: '([\w-]{25,})', who: '([^']*)'", line): whoOf[i] = w
for m in re.finditer(r"\['([\w-]{25,})', '[^']*', '([^']*)'", open(f'{REPO}/src/data/chantAlbums.ts', encoding='utf8').read()):
    whoOf[m[1]] = m[2]
def amvoice(name):
    m = re.search(r'ხმა\s+(I{1,3})\s*$', name.strip())
    return len(m[1]) if m else None
def base(name):
    n = re.sub(r'^\s*\d+[\.\s]*', '', name)
    n = re.sub(r'\s+(გვ\s*\d+|ხმა\s+I{1,3})\s*$', '', n.strip())
    return gnorm(n)
final = {}
# registry: groups
REGK = [k for k in am if 'sastsavlo' in k or 'shemstsavlel' in k or 'galobobis' in k]
for i, t, v, s in items:
    if s != 'reg': continue
    d = dur.get(i, {}).get('dur')
    if d is None: continue
    g = gnorm(t)
    hits = []
    for k in REGK:
        for ai, tr in enumerate(am[k]['tracks']):
            ad = AMT[k][ai][2]
            if ad is None or abs(d - ad) > 1.5: continue
            if amvoice(tr['name']) != v: continue
            if tsim(g, base(tr['name'])) is None or tsim(g, base(tr['name'])) < 0.85: continue
            hits.append((k, tr['slug'], tr['name']))
    if len(hits) == 1: final[i] = (hits[0][1], t, v, s, hits[0][2], hits[0][0])
groups = collections.defaultdict(list)
for i, x in out.items():
    if x[3] == 'reg': continue
    groups[(x[3], whoOf.get(i, '?'))].append((i, x))
for g, lst in groups.items():
    cnt = collections.Counter(x[6] for _, x in lst)
    for i, x in lst:
        if cnt[x[6]] >= 3 and x[5] <= 1.0: final[i] = (x[0], x[1], x[2], x[3], x[4], x[6])
print('FINAL', len(final), collections.Counter(x[3] for x in final.values()))
json.dump(final, open('/tmp/amc/final.json', 'w'), ensure_ascii=False, indent=0)
for i, x in final.items(): print(x[3], x[2], '|', x[1][:28], '|', x[4][:40], '|', x[5][:35])

# ---- add the chant albums' twins to public/centre/am (run after 4-emit.py, which rewrites those files)
DROP = {'წმიდანო მოწამენო'}  # Audiomack's „მოწაფენო“ is another hymn
for i, x in final.items():
    if x[3] != 'album' or x[1] in DROP: continue
    p = f'{REPO}/public/centre/am/{ord(i[-1])}.json'
    d = json.load(open(p)) if __import__('os').path.exists(p) else {}
    d[i] = x[0]
    json.dump(dict(sorted(d.items())), open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
