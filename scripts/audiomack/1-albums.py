import json, re, sys, os, glob
out = {}
bad = []
for f in sorted(glob.glob('/tmp/am/alb/*.html')):
    slug = os.path.basename(f)[:-5]
    s = open(f, encoding='utf8').read()
    m = None
    for blk in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', s, re.S):
        try: d = json.loads(blk)
        except Exception: continue
        ds = d if isinstance(d, list) else [d]
        for x in ds:
            if isinstance(x, dict) and x.get('@type') == 'MusicAlbum': m = x
    if not m: bad.append(slug); continue
    tr = [{'name': t['name'], 'slug': t['url'].split('/song/')[-1], 'dur': t.get('duration')} for t in m.get('track', [])]
    out[slug] = {'name': m.get('name'), 'num': m.get('numTracks'), 'tracks': tr}
json.dump(out, open('/tmp/am/albums.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'bad', bad)
print(sum(len(v['tracks']) for v in out.values()), sum(v['num'] or 0 for v in out.values()))
short = [(k, v['num'], len(v['tracks'])) for k, v in out.items() if v['num'] != len(v['tracks'])]
print('short', len(short), short[:5])
