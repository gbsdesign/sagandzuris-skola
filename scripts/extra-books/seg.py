# Segment old-script (nuskhuri) page pictures into glyphs: lines, glyph boxes, features.
import cv2, numpy as np, glob, pickle, sys
from scipy.signal import find_peaks

def page_glyphs(path, scale=1.0, min_area=12):
    g = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    global LAST_COLOR
    LAST_COLOR = cv2.imread(path, cv2.IMREAD_COLOR)
    if scale != 1.0: LAST_COLOR = cv2.resize(LAST_COLOR, None, fx=scale, fy=scale)
    if scale != 1.0: g = cv2.resize(g, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    g = cv2.GaussianBlur(g, (3, 3), 0)
    th = cv2.threshold(g, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    n, lab, st, cen = cv2.connectedComponentsWithStats(th, 8)
    comps = [(i, *st[i]) for i in range(1, n) if st[i][4] >= min_area]
    if not comps: return (lab, th), []
    hs = np.array([c[4] for c in comps]); h0 = float(np.median(hs[hs > np.percentile(hs, 20)]))
    # drop pictures/ornaments
    comps = [c for c in comps if c[4] < 4.5 * h0 and c[3] < 8 * h0]
    W = th.shape[1]
    # columns: a white gutter in the middle of the page splits the components
    ink = np.zeros(W)
    for c in comps: ink[c[1]:c[1] + c[3]] += 1
    cols = [comps]
    lo, hi = int(W * 0.3), int(W * 0.7)
    zero = ink[lo:hi] == 0
    best = (0, 0); run = 0
    for i, z in enumerate(zero):
        run = run + 1 if z else 0
        if run > best[0]: best = (run, lo + i - run + 1)
    if best[0] > 0.6 * h0:
        gx = best[1] + best[0] / 2
        cols = [[c for c in comps if c[1] + c[3] / 2 < gx], [c for c in comps if c[1] + c[3] / 2 >= gx]]
    lines = []
    H = th.shape[0]
    for cc in cols:
        if not cc: continue
        cy = np.array([c[2] + c[4] / 2 for c in cc])
        hist = np.zeros(H)
        for y in cy: hist[min(H - 1, int(y))] += 1
        k = np.ones(int(h0 * 0.6) | 1); sm = np.convolve(hist, k, 'same')
        peaks, _ = find_peaks(sm, distance=max(3, int(h0 * 1.2)), height=3)
        if len(peaks) == 0: continue
        L = [[] for _ in peaks]
        for c, y in zip(cc, cy):
            j = int(np.argmin(np.abs(peaks - y)))
            if abs(peaks[j] - y) < 1.4 * h0: L[j].append(c)
        cx0 = min(c[1] for c in cc); cx1 = max(c[1] + c[3] for c in cc)
        lines += [(peaks[j], L[j], cx0, cx1) for j in range(len(peaks))]
    out = []
    for cyj, L, cx0, cx1 in lines:
        if len(L) < 2: continue
        L.sort(key=lambda c: c[1])
        # merge parts that overlap horizontally (stacked dots, broken strokes)
        boxes = []
        for c in L:
            x, y, w, h = c[1], c[2], c[3], c[4]
            if boxes:
                bx, by, bw, bh, ids = boxes[-1]
                ov = min(bx + bw, x + w) - max(bx, x)
                if ov > 0.6 * min(bw, w):
                    nx, ny = min(bx, x), min(by, y)
                    boxes[-1] = [nx, ny, max(bx + bw, x + w) - nx, max(by + bh, y + h) - ny, ids + [c[0]]]
                    continue
            boxes.append([x, y, w, h, [c[0]]])
        out.append((cyj, h0, boxes, cx0, cx1))
    return (lab, th), out

def glyph_img(labth, box, size=20):
    lab, th = labth
    x, y, w, h, ids = box
    crop = np.isin(lab[y:y + h, x:x + w], ids).astype(np.uint8) * 255
    s = max(w, h); pad = np.zeros((s, s), np.uint8)
    pad[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = crop
    return cv2.resize(pad, (size, size), interpolation=cv2.INTER_AREA), crop

def run(pattern, outp, scale=1.0, min_area=12):
    data = []
    for pi, path in enumerate(sorted(glob.glob(pattern))):
        labth, lines = page_glyphs(path, scale, min_area)
        for li, (cy, h0, boxes, _, _) in enumerate(lines):
            for bi, b in enumerate(boxes):
                small, crop = glyph_img(labth, b)
                x, y, w, h, ids = b
                f = np.concatenate([small.flatten() / 255.0, [ (y - cy) / h0 * 2, (y + h - cy) / h0 * 2, w / h0 * 2 ]])
                data.append(dict(p=pi, l=li, x=x, y=y, w=w, h=h, h0=h0, cy=cy, f=f.astype(np.float32), crop=crop))
        print(path, len(lines), file=sys.stderr)
    pickle.dump(data, open(outp, 'wb'))
    return data

if __name__ == '__main__':
    d = run(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 1.0)
    print(len(d))
