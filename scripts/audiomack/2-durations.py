import json, os, sys, glob, urllib.request, concurrent.futures, ssl
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = '/tmp/am/drivedur.json'
done = json.load(open(OUT)) if os.path.exists(OUT) else {}
ids = []
for f in glob.glob(f'{REPO}/public/centre/*.json'):
    for t in json.load(open(f))['tracks']: ids.append(t[0])
ids = [i for i in dict.fromkeys(ids) if i not in done]
print('todo', len(ids), flush=True)
BR = {1: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320], 2: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160]}
SR = {3: [44100,48000,32000], 2: [22050,24000,16000], 0: [11025,12000,8000]}
ctx = ssl.create_default_context(cafile=os.path.expanduser('~/.ccr/ca-bundle.crt')) if os.path.exists(os.path.expanduser('~/.ccr/ca-bundle.crt')) else None
def get(i, start, end):
    r = urllib.request.Request(f'https://sagandzuri-audio.mr-gabunia.workers.dev/{i}', headers={'Origin': 'https://sagandzureli.ge', 'User-Agent': 'Mozilla/5.0 sagandzuri-matcher', 'Range': f'bytes={start}-{end}'})
    with urllib.request.urlopen(r, timeout=60, context=ctx) as h:
        total = int(h.headers.get('Content-Range', '/0').split('/')[-1] or 0)
        return h.read(), total, h.headers.get('Content-Type')
def probe(i):
    try:
        b, total, ct = get(i, 0, 65535)
        off = 0
        if b[:3] == b'ID3':
            sz = (b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]
            off = 10 + sz
            if off + 4096 > len(b):
                b, _, _ = get(i, off, off + 16383); base = off; off = 0
            else: base = 0
        else: base = 0
        # find frame sync
        p = off
        while p < len(b) - 4:
            if b[p] == 0xFF and (b[p+1] & 0xE0) == 0xE0:
                ver = (b[p+1] >> 3) & 3; lay = (b[p+1] >> 1) & 3; bi = b[p+2] >> 4; si = (b[p+2] >> 2) & 3
                if lay == 1 and bi not in (0, 15) and si != 3 and ver != 1: break
            p += 1
        else: return i, {'size': total, 'ct': ct, 'err': 'nosync'}
        ver = (b[p+1] >> 3) & 3; bi = b[p+2] >> 4; si = (b[p+2] >> 2) & 3; ch = b[p+3] >> 6
        br = BR[1 if ver == 3 else 2][bi] * 1000; sr = SR[ver][si]
        spf = 1152 if ver == 3 else 576
        # Xing / Info / VBRI
        xo = p + 4 + ((32 if ch != 3 else 17) if ver == 3 else (17 if ch != 3 else 9))
        frames = None
        if b[xo:xo+4] in (b'Xing', b'Info'):
            fl = int.from_bytes(b[xo+4:xo+8], 'big')
            if fl & 1: frames = int.from_bytes(b[xo+8:xo+12], 'big')
        elif b[p+36:p+40] == b'VBRI': frames = int.from_bytes(b[p+50:p+54], 'big')
        if frames: dur = frames * spf / sr
        else: dur = (total - (base + p)) * 8 / br
        return i, {'size': total, 'dur': round(dur, 2), 'br': br, 'vbr': bool(frames)}
    except Exception as e:
        return i, {'err': str(e)[:80]}
n = 0
with concurrent.futures.ThreadPoolExecutor(16) as ex:
    for i, r in ex.map(probe, ids):
        done[i] = r; n += 1
        if n % 300 == 0:
            json.dump(done, open(OUT, 'w')); print(n, flush=True)
json.dump(done, open(OUT, 'w'))
print('errors', sum(1 for v in done.values() if 'err' in v))
