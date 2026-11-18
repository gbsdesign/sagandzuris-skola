import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
# Template OCR for computer-typeset nuskhuri set in the „SG Nuskhuri“-like font.
import numpy as np, cv2, pickle, re, sys, glob
import seg, tmpl
SG = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'fonts', 'sg-nuskhuri.woff')
DJ = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
PUNCT = '.,:;-()!?„“'
_T = None
def T():
    global _T
    if _T is None:
        a = tmpl.templates(SG, tmpl.MKH + PUNCT)
        b = [x for x in tmpl.templates(DJ, '0123456789' + PUNCT + 'IVX')]
        # the SG font's punctuation positions are relative to its own letters: keep both sets, letters from SG only
        asom = tmpl.templates(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'fonts', 'sg-asomtavruli.woff'), tmpl.MKH, band=tmpl.BAND[SG])
        _T = a + [(c, f) for c, f in b if not ('ა' <= c <= 'ჿ')] + asom
        _T = [(c, f) for c, f in _T]
    return _T

def feat_of(crop, x, y, w, h, cy, h0):
    s = max(w, h); pad = np.zeros((s, s), np.uint8)
    pad[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = crop
    small = cv2.resize(pad, (20, 20), interpolation=cv2.INTER_AREA)
    return np.concatenate([small.flatten() / 255.0, [(y - cy) / h0 * 2, (y + h - cy) / h0 * 2, w / h0 * 2]]).astype(np.float32)

def best(f, geo=16.0, shape_only=False, letters=False, n=1):
    out = []
    for ch, t in T():
        if letters and not ('ა' <= ch <= 'ჿ'): continue
        a = float(np.sum((f[:-3] - t[:-3]) ** 2))
        b = float(np.sum((f[-1:] - t[-1:]) ** 2)) * geo if shape_only else float(np.sum((f[-3:] - t[-3:]) ** 2)) * geo
        out.append((a + b, ch))
    out.sort()
    return out[0] if n == 1 else out[:n]

COLOR = None
def read_line(lab, th, cy, h0, boxes, space=0.33):
    chars = []; prev_x1 = None; reds = []
    for x, y, w, h, ids in boxes:
        crop = (np.isin(lab[y:y + h, x:x + w], ids) * 255).astype(np.uint8)
        big = h > 1.7 * h0
        f = feat_of(crop, x, y, w, h, cy, h0)
        if not big and h > 1.3 * h0:
            top = best(f, letters=True, n=6)
            if top[0][0] > 10: big = True
        if big:
            top = best(f, shape_only=True, letters=True, n=6)
            d, ch = top[0][0], '\x01' + ''.join(c for _, c in top) + '\x02'
        else:
            d, ch = best(f)
        # touching letters: try a split when the match is poor and the box is wide
        if d > 18 and w > 0.9 * h0 and not big:
            cands = []
            for cut in range(int(0.3 * h0), w - int(0.3 * h0), 2):
                l, r = crop[:, :cut], crop[:, cut:]
                def tight(c, ox):
                    ys, xs = np.nonzero(c)
                    if len(ys) == 0: return None
                    c2 = c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                    return feat_of(c2, ox + xs.min(), y + ys.min(), c2.shape[1], c2.shape[0], cy, h0)
                fl, fr = tight(l, x), tight(r, x + cut)
                if fl is None or fr is None: continue
                dl, cl = best(fl); dr, cr = best(fr)
                cands.append((dl + dr, cl + cr))
            if cands:
                cands.sort()
                if cands[0][0] < d * 0.8: d, ch = cands[0]
        if prev_x1 is not None and x - prev_x1 > space * h0: chars.append(' ')
        chars.append(ch); prev_x1 = x + w
        if COLOR is not None:
            m = np.isin(lab[y:y + h, x:x + w], ids)
            px = COLOR[y:y + h, x:x + w][m].astype(np.int32)
            if len(px): reds.append(float(np.mean(px[:, 2] - (px[:, 0] + px[:, 1]) / 2)))
    return resolve(''.join(chars)), (np.median(reds) if reds else 0)

import pickle as _pk, collections as _co
_W = None
def resolve(s):
    global _W
    if '\x01' not in s: return s
    if _W is None: _W = _pk.load(open(os.path.join(WORK, 'words.pkl'), 'rb'))
    def rep(m):
        cands, rest = m.group(1), m.group(2)
        sc = [(_W.get(c + rest, 0), -i, c) for i, c in enumerate(cands)]
        return max(sc)[2] + rest
    return re.sub('\x01([^\x02]*)\x02([ა-ჿ]*)', rep, s)

def read_page(path, scale=1.0):
    global COLOR
    (lab, th), lines = seg.page_glyphs(path, scale)
    COLOR = seg.LAST_COLOR
    out = []
    for cy, h0, boxes, cx0, cx1 in lines:
        text, red = read_line(lab, th, cy, h0, boxes)
        x0 = boxes[0][0]; x1 = boxes[-1][0] + boxes[-1][2]
        out.append(dict(t=text, red=red > 40, short=x1 < cx1 - 1.5 * h0, indent=x0 > cx0 + 1.0 * h0, centered=abs((x0 + x1) / 2 - (cx0 + cx1) / 2) < h0 and x0 > cx0 + 1.5 * h0))
    return out

if __name__ == '__main__':
    for p in sorted(glob.glob(sys.argv[1]))[:int(sys.argv[2]) if len(sys.argv) > 2 else 999]:
        print('=== ', p)
        for L in read_page(p): print(('R ' if L['red'] else '  ') + ('S ' if L['short'] else '  ') + L['t'])
