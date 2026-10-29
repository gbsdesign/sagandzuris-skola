import os, re, sys
import pymupdf
b = os.path.normpath(os.path.expanduser('~/Downloads/ქართული გალობა - galobani.ge'))
L = chr(92) * 2 + '?' + chr(92)
pats = [re.compile(p, re.I) for p in (r'მხოლოდ[\s-]*შობ', r'mxolod[\s-]*Sob', r'v\[jkjl[\s-]*ij,b')]
for sub in ('01 ანთოლოგიის ტომეულები', '02 სასწავლო კრებულები'):
    p = os.path.join(b, sub)
    for name in sorted(os.listdir(L + p)):
        doc = pymupdf.open(L + os.path.join(p, name))
        hits = []
        for i, pg in enumerate(doc):
            t = re.sub(r'\s+', ' ', pg.get_text())
            for rx in pats:
                for m in rx.finditer(t):
                    hits.append((i + 1, t[max(0, m.start() - 25):m.end() + 25]))
        if hits:
            print('##', name[:40], f'({len(hits)})')
            for h in hits[:12]:
                print('  p', h[0], '|', h[1])
