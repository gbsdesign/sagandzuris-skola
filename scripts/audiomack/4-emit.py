"""Audiomack, step 4 of 4: write public/centre/am/<n>.json — Drive file id → the Audiomack song's slug
(audiomack.com/folkcentre/song/<slug>), split by the id's last character (n = its char code) so a page fetches one
small piece. Only the pairs step 3 was sure of (match.json `ok` albums); the rest keep playing from the Drive."""
import json, glob, os, collections
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
r = json.load(open('/tmp/am/match2.json'))
m = {}
for v in r.values():
    if not v.get('ok'): continue
    for d, p in v['pairs'].items(): m[d] = p[0]
# a file the site had before (an album track's 4th field) is the same recording
for f in glob.glob(f'{REPO}/public/centre/*.json'):
    for t in json.load(open(f))['tracks']:
        if len(t) > 3 and t[3] and t[0] in m: m.setdefault(t[3], m[t[0]])
out = f'{REPO}/public/centre/am'
os.makedirs(out, exist_ok=True)
for f in glob.glob(f'{out}/*.json'): os.remove(f)
shards = collections.defaultdict(dict)
for k, v in sorted(m.items()): shards[ord(k[-1])][k] = v
for n, d in shards.items():
    json.dump(d, open(f'{out}/{n}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(m), 'ids in', len(shards), 'files')
