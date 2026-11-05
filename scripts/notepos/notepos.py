"""Where every note sits on a line of a book's notes picture (ნოტების ზუსტი ადგილები).

    python3 scripts/notepos/notepos.py public/notes/book [more folders or NNN.json files] [--force] [--draw OUT_DIR]

For each score JSON it adds, per system (line of music):
  nx — the x of each note start of the line (all voices, the sorted unique starts in [t0, t1)), 0–1 of the line's box width;
  ny — each voice's staff [top line, bottom line], 0–1 of the line's box height;
null for a line it could not read (its staves don't match its voices) — the app then guesses (`markerAt` in utils/learn.ts).

How: find the staves (rows dark across the width, in fives), fill hollow heads, wipe the staff lines and barlines, keep only
head-sized blobs; each note's head is looked for on its own staff row (clef from the voice's range, spelling from the key
the notes fit best); one dynamic program places all the starts left to right where those heads are darkest, so the order and
the voices' alignment hold. Needs numpy, scipy, pillow. Files already holding nx are skipped unless --force.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

LETTER_SHARP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]
LETTER_FLAT = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6]
# diatonic step (C0 = 0) of each clef's bottom line: treble E4, treble-8vb E3, bass G2
CLEFS = {'t': 4 * 7 + 2, 't8': 3 * 7 + 2, 'b': 2 * 7 + 4}
MAJOR = [0, 2, 4, 5, 7, 9, 11]
BLACK = (1, 3, 6, 8, 10)


def dstep(midi, flat=False):
    o, pc = divmod(int(midi), 12)
    return (o - 1) * 7 + (LETTER_FLAT if flat else LETTER_SHARP)[pc]


def key_of(score):
    """The key signature (-flats / +sharps) that leaves the fewest notes outside it."""
    pcs = [int(n[2]) % 12 for v in score['voices'] for n in v]
    best = None
    for k in range(-7, 8):
        tonic = (7 * k) % 12
        scale = {(tonic + i) % 12 for i in MAJOR}
        cand = (sum(1 for p in pcs if p not in scale), abs(k))
        if best is None or cand < best[0]:
            best = (cand, k)
    return best[1]


def steps_of(midi, key):
    """The staff steps a pitch may be written on: a black key outside the key may be either spelling."""
    pc = int(midi) % 12
    if pc not in BLACK:
        return [dstep(midi)]
    tonic = (7 * key) % 12
    if pc in {(tonic + i) % 12 for i in MAJOR}:
        return [dstep(midi, flat=key < 0)]
    return sorted({dstep(midi, False), dstep(midi, True)})


def staves_of(dark):
    """Staff lines = rows dark across most of the width, grouped in fives with even gaps."""
    rows = np.where(dark.mean(1) > 0.45)[0]
    lines = []
    for r in rows:
        if lines and r - lines[-1][-1] <= 1:
            lines[-1].append(r)
        else:
            lines.append([r])
    lines = [(float(np.mean(l)), l[0], l[-1]) for l in lines]
    staves, i = [], 0
    while i + 4 < len(lines):
        ys = [lines[i + j][0] for j in range(5)]
        gaps = np.diff(ys)
        if gaps.max() - gaps.min() <= max(2, 0.25 * gaps.mean()) and gaps.mean() > 4:
            staves.append({'top': ys[0], 'bot': ys[4], 'sp': float(gaps.mean()), 'rows': [(l[1], l[2]) for l in lines[i:i + 5]]})
            i += 5
        else:
            i += 1
    return staves


def heads_of(dark, staves):
    """Only what is shaped like a note head: hollow heads filled, staff lines, barlines, stems, slurs and beams gone."""
    sp = float(np.mean([s['sp'] for s in staves]))
    holes = ndi.binary_fill_holes(dark) & ~dark
    lab, n = ndi.label(holes)
    d = dark.copy()
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl and sl[0].stop - sl[0].start <= 0.9 * sp and sl[1].stop - sl[1].start <= 1.3 * sp:
            d[sl] |= lab[sl] == i
    H = d.shape[0]
    cover = np.min(np.stack([dark[int(s['top']):int(s['bot']) + 1].mean(0) for s in staves]), 0)
    bars = ndi.binary_dilation(cover >= 0.95, iterations=1)
    base = d.copy()
    for s in staves:
        for r0, r1 in s['rows']:
            keep = base[max(0, r0 - 1), :] & base[min(H - 1, r1 + 1), :]
            d[r0:r1 + 1, :] &= keep
    d[:, bars] = False
    d = ndi.binary_opening(d, structure=np.ones((max(2, round(sp * 0.55)), max(2, round(sp * 0.75))), bool))
    return d, sp


def run_dp(ev, left, gap):
    """Starts left to right, at least `gap` apart, where the sum of their evidence is greatest."""
    K, CW = ev.shape
    NEG = -1e9
    dp = np.full((K, CW), NEG, np.float32)
    arg = np.zeros((K, CW), np.int32)
    dp[0, left:] = ev[0, left:]
    for i in range(1, K):
        prev = dp[i - 1]
        pm = np.maximum.accumulate(prev)
        pa = np.maximum.accumulate(np.where(prev == pm, np.arange(CW), 0))
        dp[i, gap:] = np.where(pm[:-gap] > NEG / 2, ev[i, gap:] + pm[:-gap], NEG)
        arg[i, gap:] = pa[:-gap]
    xs = [0] * K
    xs[-1] = int(np.argmax(dp[-1]))
    for i in range(K - 1, 0, -1):
        xs[i - 1] = int(arg[i, xs[i]])
    return xs


def place(score, k, pages, root, draw=None):
    """The line's starts' x and its staves, or None when the line can't be read."""
    ii, x, y, w, h, t0, t1 = score['sys'][k][:7]
    if ii not in pages:
        pages[ii] = np.asarray(Image.open(os.path.join(root, score['img'][ii]['src'])).convert('L'))
    im = pages[ii]
    H, W = im.shape
    crop = im[int(round(y * H)):int(round((y + h) * H)), int(round(x * W)):int(round((x + w) * W))]
    dark = crop < 190
    st = staves_of(dark)
    nv = len(score['voices'])
    if len(st) != nv or nv == 0:
        return None
    heads, sp = heads_of(dark, st)
    E = ndi.uniform_filter(heads.astype(np.float32), size=(max(3, round(sp * 0.8)), max(3, round(sp * 1.1))), mode='constant')
    CH, CW = E.shape
    notes = [(n[0], v, n[2]) for v, voice in enumerate(score['voices']) for n in voice if t0 - 1e-6 <= n[0] < t1 - 1e-6]
    starts = sorted(set(n[0] for n in notes))
    ny = [[round(s['top'] / CH, 4), round(s['bot'] / CH, 4)] for s in st]
    if not starts:
        return [], ny
    key = key_of(score)

    def ev_row(s, steps, bottom):
        out = np.zeros(CW, np.float32)
        for step in steps:
            yy = s['bot'] - (step - bottom) * s['sp'] / 2
            rows = [r for r in (round(yy + d) for d in (-s['sp'] / 4, 0, s['sp'] / 4)) if 0 <= r < CH]
            if rows:
                out = np.maximum(out, np.max(np.stack([E[r] for r in rows]), 0))
        return out

    # a voice's clef: the one that puts its middle pitch nearest its staff's middle line
    clef = []
    for v in range(nv):
        ms = sorted(n[2] for n in score['voices'][v]) or [60]
        mid = dstep(ms[len(ms) // 2])
        clef.append(min(CLEFS, key=lambda c: abs(mid - (CLEFS[c] + 4))))
    idx = {b: i for i, b in enumerate(starts)}
    ev = np.zeros((len(starts), CW), np.float32)
    for b, v, m in notes:
        ev[idx[b]] += ev_row(st[v], steps_of(m, key), CLEFS[clef[v]])
    left, gap = int(sp * 5), max(2, int(sp * 0.9))
    xs = run_dp(ev, left, gap)
    # the middle of the darkest stretch (a head is wider than the box)
    orig = list(xs)
    for i in range(len(xs)):
        top = ev[i, orig[i]]
        lo = orig[i - 1] + gap if i else left
        hi = orig[i + 1] - gap if i + 1 < len(xs) else CW - 1
        a = b = orig[i]
        while a - 1 >= lo and ev[i, a - 1] >= 0.92 * top:
            a -= 1
        while b + 1 <= hi and ev[i, b + 1] >= 0.92 * top:
            b += 1
        xs[i] = (a + b) // 2
    if draw:
        rgb = Image.fromarray(crop).convert('RGB')
        dr = ImageDraw.Draw(rgb)
        for i, (b, xx) in enumerate(zip(starts, xs)):
            dr.line([(xx, 0), (xx, CH)], fill=(200, 30, 40), width=1)
            dr.text((xx + 2, 2 + (i % 2) * 10), f'{b:g}', fill=(200, 30, 40))
        rgb.save(draw)
    return [round(xx / CW, 4) for xx in xs], ny


def do_file(path, force=False, draw=None):
    raw = open(path, encoding='utf-8').read()
    score = json.loads(raw)
    if 'nx' in score and not force:
        return None
    root = os.path.dirname(path)
    pages, nx, ny = {}, [], []
    for k in range(len(score['sys'])):
        out = draw and os.path.join(draw, f'{os.path.basename(root)}_{os.path.basename(path)[:-5]}_{k}.png')
        got = place(score, k, pages, root, out)
        nx.append(got[0] if got else None)
        ny.append(got[1] if got else None)
    score['nx'], score['ny'] = nx, ny
    open(path, 'w', encoding='utf-8').write(json.dumps(score, separators=(',', ':'), ensure_ascii=False) + ('\n' if raw.endswith('\n') else ''))
    return sum(1 for v in nx if v is None), len(nx)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:]]
    force = '--force' in args
    draw = None
    if '--draw' in args:
        draw = args[args.index('--draw') + 1]
        os.makedirs(draw, exist_ok=True)
        args.remove('--draw')
        args.remove(draw)
    files = []
    for a in args:
        if a.startswith('--'):
            continue
        files += sorted(glob.glob(os.path.join(a, '*.json'))) if os.path.isdir(a) else [a]
    done = skipped_lines = lines = 0
    for f in files:
        r = do_file(f, force, draw)
        if r:
            done += 1
            skipped_lines += r[0]
            lines += r[1]
    print(f'files {done}/{len(files)} written; lines {lines}, unread {skipped_lines}')
