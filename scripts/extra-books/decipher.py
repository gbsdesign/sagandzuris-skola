import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
# OCR a page-picture book by shape groups: group the glyphs, guess each group's letter from font shapes,
# then improve the guesses so that more words are real words of the church books.
import sys, glob, pickle, re, math, collections
import numpy as np, cv2
from sklearn.cluster import KMeans
import seg, ocr

W = pickle.load(open(os.path.join(WORK, 'words.pkl'), 'rb'))
LET = set('აბგდევზჱთიკლმნჲოპჟრსტჳუფქღყშჩცძწჭხჴჯჰჵ')

def collect(pattern, scale, skip=()):
    G = []; LINES = []
    for pi, path in enumerate(sorted(glob.glob(pattern))):
        if pi in skip: continue
        (lab, th), lines = seg.page_glyphs(path, scale)
        col = seg.LAST_COLOR
        for cy, h0, boxes, cx0, cx1 in lines:
            ids = []; prev = None; reds = []
            for x, y, w, h, cid in boxes:
                crop = (np.isin(lab[y:y + h, x:x + w], cid) * 255).astype(np.uint8)
                f = ocr.feat_of(crop, x, y, w, h, cy, h0)
                if prev is not None and x - prev > 0.33 * h0: ids.append(-1)
                G.append(dict(f=f, big=h > 1.7 * h0, wide=w > 1.0 * h0, crop=crop, cy=cy, y=y, h0=h0))
                ids.append(len(G) - 1); prev = x + w
                m = np.isin(lab[y:y + h, x:x + w], cid); px = col[y:y + h, x:x + w][m].astype(np.int32)
                if len(px): reds.append(float(np.mean(px[:, 2] - (px[:, 0] + px[:, 1]) / 2)))
            x0 = boxes[0][0]; x1 = boxes[-1][0] + boxes[-1][2]
            LINES.append(dict(p=pi, g=ids, red=(np.median(reds) if reds else 0) > 40, short=x1 < cx1 - 1.5 * h0))
        print('page', pi, len(lines), file=sys.stderr)
    return G, LINES

def solve(G, LINES, k):
    small = [i for i, g in enumerate(G) if not g['big']]
    X = np.stack([G[i]['f'] for i in small]); Xw = X.copy(); Xw[:, -3:] *= 4
    km = KMeans(n_clusters=k, n_init=2, random_state=0).fit(Xw)
    lab = np.full(len(G), -2)
    lab[small] = km.labels_
    X = np.zeros((len(G), Xw.shape[1]), np.float32); X[small] = np.stack([G[i]['f'] for i in small])
    # candidates per cluster from the font shapes
    cand = {}
    for c in range(k):
        idx = np.nonzero(lab == c)[0]
        f = X[idx].mean(0)
        big = np.mean([G[i]['big'] for i in idx]) > 0.5
        top = ocr.best(f, shape_only=big, n=8)
        cand[c] = [ch for _, ch in top]
    assign = {c: cand[c][0] for c in range(k)}
    # words as cluster sequences
    words = []; cur = []
    for L in LINES:
        for gi in L['g'] + [-1]:
            if gi == -1:
                if cur: words.append(tuple(cur)); cur = []
            elif lab[gi] >= 0: cur.append(int(lab[gi]))
    wc = collections.Counter(words)
    by_c = collections.defaultdict(list)
    for w in wc:
        for c in set(w): by_c[c].append(w)
    def dec(w, a): return ''.join(a[c] for c in w)
    def score_w(w, a):
        raw = dec(w, a)
        if re.search('[0-9IVX][ა-ჿ]|[ა-ჿ][0-9IVX]', raw): return -1.0
        s = re.sub('^[^ა-ჿ]+|[^ა-ჿ]+$', '', raw)
        if not s: return 0.0
        if re.search('[^ა-ჿ]', s): return -1.0
        return math.log1p(W.get(s, 0)) if len(s) >= 2 else 0.0
    letters = sorted(LET)
    for it in range(4):
        changed = 0
        for c in sorted(range(k), key=lambda c: -np.sum(lab == c)):
            ws = by_c[c]
            base = sum(score_w(w, assign) * wc[w] for w in ws)
            opts = list(dict.fromkeys(cand[c] + (letters if np.sum(lab == c) > 30 else [])))
            bestv, bestc = base, assign[c]
            for o in opts:
                if o == assign[c]: continue
                a2 = dict(assign); a2[c] = o
                v = sum(score_w(w, a2) * wc[w] for w in ws)
                if v > bestv + 1e-9: bestv, bestc = v, o
            if bestc != assign[c]: assign[c] = bestc; changed += 1
        print('iter', it, 'changed', changed, file=sys.stderr)
        if not changed: break
    return lab, assign

def text_lines(G, LINES, lab, assign):
    out = []
    for L in LINES:
        parts = []
        for gi in L['g']:
            if gi == -1: parts.append(' ')
            elif lab[gi] >= 0: parts.append(assign[int(lab[gi])])
            else:
                top = ocr.best(G[gi]['f'], shape_only=True, letters=True, n=8)
                parts.append('\x01' + ''.join(c for _, c in top) + '\x02')
        out.append(dict(L, t=ocr.resolve(''.join(parts))))
    return out

def hit_rate(lines):
    ws = [w for L in lines for w in re.findall('[ა-ჿ]{3,}', L['t'])]
    return sum(1 for w in ws if W.get(w)) / max(1, len(ws))

if __name__ == '__main__':
    pattern, scale, k, outp = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
    skip = tuple(int(x) for x in sys.argv[5].split(',')) if len(sys.argv) > 5 and sys.argv[5] else ()
    G, LINES = collect(pattern, scale, skip)
    lab, assign = solve(G, LINES, k)
    lines = text_lines(G, LINES, lab, assign)
    pickle.dump(dict(lines=lines, assign=assign), open(outp, 'wb'))
    print('glyphs', len(G), 'hit', round(hit_rate(lines), 3))
    for L in lines[40:60]: print(('R ' if L['red'] else '  ') + L['t'])
