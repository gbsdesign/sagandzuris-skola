import json, re, os, difflib, collections, sys
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
am = json.load(open('/tmp/am/albums.json'))
dur = json.load(open('/tmp/am/drivedur.json'))
src = open(f'{REPO}/src/data/centreSongs.ts', encoding='utf8').read()
arr = [json.loads(m) for m in re.findall(r'^  (\["[^"]+","[^"]*",\d+\]),?$', src, re.M)]
GEO = re.compile(r'[ა-ჰ]+')
GENERIC = {'ტრეკი', 'ტრეკ', 'track'}
def gnorm(s):
    w = [x for x in GEO.findall(s) if x not in {'ნაწ', 'ნაწილი', 'და', 'წ', 'ტრეკი', 'ხმა'}]
    return ' '.join(w)
LAT = {'a':'ა','b':'ბ','g':'გ','d':'დ','e':'ე','v':'ვ','z':'ზ','i':'ი','k':'კ','l':'ლ','m':'მ','n':'ნ','o':'ო','p':'პ','r':'რ','s':'ს','t':'ტ','u':'უ','f':'ფ','q':'ქ','y':'ყ','c':'ც','h':'ჰ','j':'ჯ','x':'ხ','w':'წ'}
DIG = [('sh','შ'),('ch','ჩ'),('ts','ც'),('dz','ძ'),('gh','ღ'),('kh','ხ'),('zh','ჟ'),('tch','ჭ')]
def latin2geo(s):
    s = s.lower()
    for a, b in DIG: s = s.replace(a, b)
    return ''.join(LAT.get(c, c) for c in s)
def simp(s):  # collapse letters that transliteration confuses
    tr = str.maketrans('ტკპქთყჭწცჩძ', 'თქფქთქჩცცჩზ')
    return re.sub(r'[^ა-ჰ]', '', s).translate(tr)
def amtitle(name):
    g = gnorm(name)
    if g: return g
    lat = re.sub(r'^\s*\d+[\.\s]*', '', name)
    lat = re.sub(r'\(.*?\)|_.*$|\s{2,}.*$', '', lat)
    if re.fullmatch(r'\s*track\s*\d*\s*', lat.lower()): return ''
    return latin2geo(lat)
def secs(iso):
    m = re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso or '')
    return None if not m else int(m[1] or 0) * 3600 + int(m[2] or 0) * 60 + int(m[3] or 0)
def tsim(a, b):
    if not a or not b: return None
    wa = {simp(w) for w in a.split()} - {''}; wb = {simp(w) for w in b.split()} - {''}
    for x, y in ((wa, wb), (wb, wa)):
        if x and x <= y and len(''.join(x)) >= 4: return 1.0
    a, b = simp(a), simp(b)
    if not a or not b: return None
    sh, lo = sorted((a, b), key=len)
    if a == b or (len(sh) >= 6 and sh in lo): return 1.0
    return difflib.SequenceMatcher(None, a, b).ratio()
AMT = {k: [(i, amtitle(t['name']), secs(t['dur']), t['slug']) for i, t in enumerate(v['tracks'])] for k, v in am.items()}
DIDX = collections.defaultdict(set)
for k, ts in AMT.items():
    for x in ts:
        if x[2] is not None: DIDX[x[2]].add(k)
def dvoice(t):
    m = re.search(r'·\s*(I{1,3})\s*ხმა', t)
    return len(m[1]) if m else None
def avoice(t):
    t = t.lower()
    m = re.search(r'\b(1st|2nd|3rd|first|second|third)\s*voice|\b(basses|bass)\b|\b(i{1,3})\s*(?:khma|ხმა)|(I{1,3})\s*ხმა', t)
    if not m: return None
    if m[1]: return {'1st':1,'first':1,'2nd':2,'second':2,'3rd':3,'third':3}[m[1]]
    if m[2]: return 3
    return len(m[3] or m[4])
def pair(dtracks, k, strict=False):
    a = AMT[k]
    AV = {i: avoice(am[k]['tracks'][i]['name']) for i in range(len(a))}
    cands = []
    for di, t in enumerate(dtracks):
        d = dur.get(t[0], {}).get('dur')
        dt = gnorm(t[1])
        for ai, at, ad, slug in a:
            if d is None or ad is None: continue
            dd = abs(d - ad)
            if dd > 2.0: continue
            s = tsim(dt, at)
            dv, av = dvoice(t[1]), AV[ai]
            if dv != av and (dv or av): continue
            if s is None:
                # untitled: one AM track of that length and one Drive track of that length, nothing else near
                if dd > 1.0: continue
                if sum(1 for x in a if x[2] is not None and abs(x[2] - d) <= 2.5) != 1: continue
                if sum(1 for y in dtracks if dur.get(y[0], {}).get('dur') is not None and abs(dur[y[0]]['dur'] - ad) <= 2.5) != 1: continue
            elif s < 0.85: continue
            elif s < 1.0 and dd > 1.5: continue
            if strict and dd > 1.0: continue
            cands.append((-(s or 0), dd, abs(di / max(1, len(dtracks)) - ai / max(1, len(a))), di, ai, s))
    cands.sort()
    used_d, used_a, out = set(), set(), {}
    # learning albums: a song's takes (all voices, then I, II, III) stand together in the same order on both sides
    def groups(items):
        g = collections.OrderedDict()
        for i, base in items: g.setdefault(base, []).append(i)
        return g
    dg = groups((di, gnorm(re.sub(r'·\s*I{1,3}\s*ხმა', '', t[1]))) for di, t in enumerate(dtracks))
    ag = groups((ai, at) for ai, at, _, _ in a)
    for base, dis in dg.items():
        if len(dis) < 2 or not base: continue
        for abase, ais in ag.items():
            if len(ais) != len(dis) or any(x in used_a for x in ais) or tsim(base, abase) != 1.0: continue
            ds = [dur.get(dtracks[i][0], {}).get('dur') for i in dis]
            if any(x is None for x in ds) or any(a[j][2] is None or abs(x - a[j][2]) > 2.5 for x, j in zip(ds, ais)): continue
            if strict and any(abs(x - a[j][2]) > 1.0 for x, j in zip(ds, ais)): continue
            for i, j, x in zip(dis, ais, ds):
                used_d.add(i); used_a.add(j); out[i] = (j, 1.0, round(abs(x - a[j][2]), 2))
            break
    for c in cands:
        _, dd, pd, di, ai, s = c
        if di in used_d or ai in used_a: continue
        used_d.add(di); used_a.add(ai); out[di] = (ai, s, round(dd, 2))
    return out
def nratio(a, b):
    return difflib.SequenceMatcher(None, simp(gnorm(a)), simp(gnorm(b))).ratio()
result = {}; stats = collections.Counter()
for fid, name, cnt in arr:
    p = f'{REPO}/public/centre/{fid}.json'
    if not os.path.exists(p): continue
    tracks = json.load(open(p))['tracks']
    base = name.replace('• ალაზანი', '').strip()
    best = None
    hits = collections.Counter()
    for t in tracks:
        d = dur.get(t[0], {}).get('dur')
        if d is None: continue
        for sec in range(int(d) - 2, int(d) + 3):
            for k in DIDX.get(sec, ()): hits[k] += 1
    cand = [k for k, _ in hits.most_common(6)] + [k for k in am if nratio(base, am[k]['name']) >= 0.8]
    for k in dict.fromkeys(cand):
        nr = nratio(base, am[k]['name'])
        m = pair(tracks, k, strict=nr < 0.6)
        if not m: continue
        sc = len(m) / len(tracks)
        key = (sc + 0.25 * nr, sc, nr, k, m)
        if best is None or key[:3] > best[:3]: best = key
    if not best: stats['none'] += 1; result[fid] = {'name': name, 'n': len(tracks)}; continue
    _, sc, nr, k, m = best
    ok = sc >= 0.5 or (nr >= 0.85 and sc >= 0.25)
    stats['ok' if ok else 'weak'] += 1
    result[fid] = {'name': name, 'n': len(tracks), 'am': k, 'amname': am[k]['name'], 'sc': round(sc, 2), 'nr': round(nr, 2), 'ok': ok,
                   'pairs': {tracks[di][0]: [AMT[k][ai][3], s, dd, tracks[di][1], am[k]['tracks'][ai]['name']] for di, (ai, s, dd) in m.items()}}
json.dump(result, open('/tmp/am/match2.json', 'w'), ensure_ascii=False, indent=0)
print(stats)
print('tracks mapped', sum(len(r.get('pairs', {})) for r in result.values() if r.get('ok')), 'of', sum(r['n'] for r in result.values()))
