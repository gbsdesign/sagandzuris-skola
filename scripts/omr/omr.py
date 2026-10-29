# Anthology (Finale / Petrucci font) chant pages -> the app's BookScore JSON + page pictures.
# usage: python omr.py <vol> <chantNo> <outDir> <startPdfPage> [--file N] [--to <lastNo>] [--json-only]
import os, re, sys, json, difflib
import pymupdf
from PIL import Image

B = os.path.normpath(os.path.expanduser('~/Downloads/ქართული გალობა - galobani.ge'))
L = chr(92) * 2 + '?' + chr(92) if os.name == 'nt' else ''  # Windows long-path prefix (Georgian names are long)
# the volumes' folder: the user's Downloads on Windows; elsewhere (a cloud session) set ANTH_DIR to a folder whose
# sorted file names put vol. 1 first (e.g. "01 - ტომი I.pdf")
VOLS = os.environ.get('ANTH_DIR') or os.path.join(B, '01 ანთოლოგიის ტომეულები')

LETTER = {'C': 0, 'D': 1, 'E': 2, 'F': 3, 'G': 4, 'A': 5, 'B': 6}
SEMI = [0, 2, 4, 5, 7, 9, 11]
# bottom staff line of each clef: (letter index, octave)
CLEF = {'&': (2, 4), 'V': (2, 3), '?': (4, 2)}
HEADS = {'œ': 1, '˙': 2, 'Ç': 2, 'w': 4, 'W': 0}  # W = breve, recitation: length from its syllables
RESTS = {'Œ': 1, 'Ó': 2, '‰': 0.5, '≈': 0.25, '∑': 4, 'î': 4}
FLAGS = {'J': 1, 'j': 1, 'K': 2, 'k': 2, 'L': 3, 'l': 3}
ACC = {'#': 1, 'b': -1, 'n': 0, 'N': 0, '(#)': 1, '(b)': -1, '(n)': 0}  # (x) = one bracketed glyph (vol. I)

# Vol. I's Petrucci subset gives its glyphs other codes (control characters for the heads); each was identified on
# the page pictures (2026-10-29) and is read as the standard Petrucci character it draws. Dynamics and fermatas
# stay unread, as in the other volumes.
REMAP_V1 = {'\x06': 'œ', '\x07': '˙', '¶': 'w', 't': 'W', '#': '#', 'Ü': 'b', 'ó': 'n', 'e': '(n)', 'S': '(b)', 'Ö': '(#)',
            'ì': 'j', 'a': 'J', '°': 'k', 'o': 'K', '4': '.', '\x10': 'Œ', '\x0f': 'Ó', '\x12': '∑', '\x13': '‰',
            's': 'V', 'Q': '?'}
REMAP = None  # set by open_vol when the volume uses that encoding; glyphs missing from it are dropped


def head_num(txt):
    """A chant's number from its title line: "203. title", "76a title", vol. I's bare "1." / "7.-8." (the title is
    its own line there) and "22.a." (= 22a)."""
    m = re.match(r'^(\d+)\.([a-z])\.', txt)
    if m:
        return m.group(1) + m.group(2)
    m = re.match(r'^(\d+)\.(?:-\d+\.)?$', txt)
    if m:
        return m.group(1)
    m = re.match(r'^(\d+[a-z]?)(?:\.\s*\S|\s+\S|$)', txt)
    return m.group(1) if m else None


def open_vol(vol):
    global REMAP
    names = sorted(os.listdir(L + VOLS))
    doc = pymupdf.open(L + os.path.join(VOLS, names[vol - 1]))
    REMAP = None
    for pi in range(min(40, doc.page_count), min(80, doc.page_count)):
        # a music font whose heads are control characters = vol. I's encoding
        chars = (ch['c'] for b in doc[pi].get_text('rawdict')['blocks'] for ln in b.get('lines', [])
                 for sp in ln['spans'] if 'Petrucci' in sp['font'] for ch in sp['chars'])
        if any(ord(c) < 32 for c in chars):
            REMAP = REMAP_V1
            break
    return doc


class Page:
    def __init__(self, pg):
        self.pg = pg
        self.glyphs, self.words, self.heads_txt = [], [], []
        for blk in pg.get_text('rawdict')['blocks']:
            for ln in blk.get('lines', []):
                for sp in ln['spans']:
                    if 'Petrucci' in sp['font'] or 'Maestro' in sp['font']:
                        for ch in sp['chars']:
                            x, y = ch['origin']
                            c = ch['c'] if REMAP is None else REMAP.get(ch['c'])
                            if c:
                                self.glyphs.append(dict(c=c, x=x, y=y, size=sp['size'], bb=ch['bbox']))
        for blk in pg.get_text('dict')['blocks']:
            for ln in blk.get('lines', []):
                if all('Petrucci' in s['font'] or 'Maestro' in s['font'] for s in ln['spans']):
                    continue  # a time signature ("44") is music, not a chant number
                txt = ''.join(s['text'] for s in ln['spans']).strip()
                size = max((s['size'] for s in ln['spans']), default=0)
                num = head_num(txt)
                if num and size >= 12 and ln['bbox'][1] < 780:
                    self.heads_txt.append((num, ln['bbox'][1], ln['bbox'][3], ln['bbox'][0]))
        self.words = [w for w in pg.get_text('words')]
        self.hlines, self.vlines, self.beams, self.curves = [], [], [], []
        for d in pg.get_drawings():
            r = d['rect']
            items = d['items']
            if d.get('fill') is not None and d.get('type') in ('f', 'fs'):
                if (all(it[0] == 'l' for it in items) and len(items) >= 3 and r.height < 12 or all(it[0] == 're' for it in items) and r.height < 4) and r.width > 4:
                    self.beams.append(r)
                elif any(it[0] == 'c' for it in items):
                    self.curves.append(r)
                continue
            for it in items:
                if it[0] != 'l':
                    continue
                a, b = it[1], it[2]
                # staff lines; vol. I prints some short pieces two to a row, on staves under 150 pt
                if abs(a.y - b.y) < 0.2 and abs(a.x - b.x) > 60:
                    self.hlines.append((min(a.x, b.x), max(a.x, b.x), a.y))
                elif abs(a.x - b.x) < 0.2 and abs(a.y - b.y) > 3:
                    self.vlines.append((a.x, min(a.y, b.y), max(a.y, b.y)))
        self.staves = self._staves()

    def _staves(self):
        # a staff's five lines share their left and right ends; grouping by them keeps apart two staves printed
        # side by side at the same height
        groups = []
        for h in self.hlines:
            g = next((g for g in groups if abs(g[0][0] - h[0]) < 2 and abs(g[0][1] - h[1]) < 2), None)
            if g:
                g.append(h)
            else:
                groups.append([h])
        out = []
        for grp in groups:
            ys = sorted(grp, key=lambda h: h[2])
            i = 0
            while i + 4 < len(ys):
                g = ys[i:i + 5]
                gaps = [g[k + 1][2] - g[k][2] for k in range(4)]
                if max(gaps) - min(gaps) < 0.3 and 3 < gaps[0] < 7:
                    out.append(dict(top=g[0][2], bot=g[4][2], sp=gaps[0], x0=g[0][0], x1=g[0][1]))
                    i += 5
                else:
                    i += 1
        return sorted(out, key=lambda s: (s['top'], s['x0']))

    def systems(self):
        # staves joined by the system's left line (a vertical line through all of them); staves are taken column by
        # column, so side-by-side systems stay apart, and the systems come back in reading order
        cols = []
        for s in self.staves:
            if not any(abs(c - s['x0']) < 1.5 for c in cols):
                cols.append(s['x0'])
        col = lambda s: next(c for c in cols if abs(c - s['x0']) < 1.5)
        sts, out = sorted(self.staves, key=lambda s: (col(s), s['top'])), []
        for s in sts:
            if out:
                prev = out[-1][-1]
                joined = abs(prev['x0'] - s['x0']) < 1.5 and any(
                    abs(x - s['x0']) < 1.5 and y0 <= prev['top'] + 1 and y1 >= s['bot'] - 1 for x, y0, y1 in self.vlines)
                if joined:
                    out[-1].append(s)
                    continue
            out.append([s])
        return sorted(out, key=lambda sy: (sy[0]['top'], sy[0]['x0']))


def staff_of(st_list, y):
    best, bd = None, 1e9
    for k, s in enumerate(st_list):
        c = (s['top'] + s['bot']) / 2
        d = abs(y - c)
        if d < bd:
            best, bd = k, d
    return best


def read_system(P, sysst, dbg=False):
    """events per staff: list of [x, beats, midi|None(rest)]"""
    top, bot = sysst[0]['top'] - 30, sysst[-1]['bot'] + 30
    gl = [g for g in P.glyphs if top <= g['y'] <= bot]
    # small (cue-size) heads are the editors' alternatives or guesses: not played
    sizes = sorted(g['size'] for g in P.glyphs if g['c'] in HEADS)
    normal = sizes[len(sizes) // 2] if sizes else 17.5
    res = []
    for k, st in enumerate(sysst):
        sp = st['sp']
        mine = [g for g in gl if staff_of(sysst, g['y']) == k and st['top'] - 6 * sp <= g['y'] <= st['bot'] + 6 * sp]
        clefg = [g for g in mine if g['c'] in CLEF and g['x'] < st['x0'] + 30]
        clef = clefg[0]['c'] if clefg else ('?' if k == len(sysst) - 1 else 'V')
        cl_letter, cl_oct = CLEF[clef]
        heads = []
        # a head in round brackets is the editors' alternative (vol. I prints it full size): not played
        parens = [w for w in P.words if w[4] in ('(', ')') and abs((w[1] + w[3]) / 2 - (st['top'] + st['bot']) / 2) < 4 * sp]
        bracketed = lambda g: any(w[4] == '(' and -1 < g['x'] - w[2] < 8 for w in parens) and any(
            w[4] == ')' and 0 < w[0] - g['x'] < 18 for w in parens)
        for g in sorted([g for g in mine if g['c'] in HEADS and g['size'] > normal * 0.88 and not bracketed(g)], key=lambda g: g['x']):
            if not any(q['c'] == g['c'] and abs(q['x'] - g['x']) < 0.6 and abs(q['y'] - g['y']) < 0.6 for q in heads):
                heads.append(g)  # a head printed twice (two voices on one note) is one head with two stems
        rests = [g for g in mine if g['c'] in RESTS]
        first_x = heads[0]['x'] if heads else 1e9

        def step(y):
            return round((st['bot'] - y) / (sp / 2))

        def pitch_of(stp):
            idx = cl_letter + stp
            return idx % 7, cl_oct + idx // 7

        # key signature: accidentals before the first note, not touching a head
        key = {}
        for g in mine:
            if g['c'] in ('#', 'b') and g['x'] < first_x - 8 and g['x'] < st['x0'] + 70:
                key[pitch_of(step(g['y']))[0]] = ACC[g['c']]
        bars = sorted(x for x, y0, y1 in P.vlines if y0 <= st['top'] + 0.5 and y1 >= st['bot'] - 0.5 and x > st['x0'] + 5)
        events = []
        for g in rests:
            events.append(dict(x=g['x'], beats=RESTS[g['c']], midi=None, rest=True))
        local, bar_i = {}, 0
        used = set()
        for h in heads:
            while bar_i < len(bars) and bars[bar_i] < h['x']:
                local, bar_i = {}, bar_i + 1
            stp = step(h['y'])
            li, octv = pitch_of(stp)
            acc = None
            for g in mine:
                reach = 20 if len(g['c']) > 1 else 14  # a bracketed accidental is wider
                if g['c'] in ACC and id(g) not in used and h['x'] - reach < g['x'] < h['x'] - 1 and abs(g['y'] - h['y']) < sp * 0.6 and g['x'] >= first_x - reach:
                    acc = ACC[g['c']]
                    used.add(id(g))
            if acc is not None:
                local[(li, octv)] = acc
            alt = local.get((li, octv), key.get(li, 0))
            midi = 12 * (octv + 1) + SEMI[li] + alt
            base = HEADS[h['c']]
            # stems: up at the head's right edge, down at its left edge; a head with both is sung by two voices
            hx0, hx1 = h['bb'][0], h['bb'][2]
            cand = [v for v in P.vlines if v[1] - 2 <= h['y'] <= v[2] + 2 and (v[2] - v[1]) < 4.5 * sp]
            ups = [v for v in cand if abs(v[0] - hx1) < 1.2 and v[1] < h['y'] - 2]
            downs = [v for v in cand if abs(v[0] - hx0) < 1.2 and v[2] > h['y'] + 2]
            if ups and downs and any(abs(g['x'] - h['x']) < 1 and abs(g['y'] - h['y']) < 1 and g['size'] <= normal * 0.88
                                     for g in mine if g['c'] in HEADS):
                # a small (editorial) head on the same spot: the shorter stem is its own
                if ups[0][2] - ups[0][1] < downs[0][2] - downs[0][1]:
                    ups = []
                else:
                    downs = []
            stems = [('u', ups[0])] if ups else []
            stems += [('d', downs[0])] if downs else []
            dotted = any(g['c'] == '.' and h['x'] + 4 < g['x'] < h['x'] + 12 and abs(g['y'] - h['y']) < sp * 0.7 for g in mine)
            for sdir, stem in (stems or [(None, None)]):
                beats = base
                if h['c'] == 'œ':
                    nflag = 0
                    if stem:
                        sx, sy0, sy1 = stem
                        tip = sy0 if sdir == 'u' else sy1
                        nb = sum(1 for r in P.beams if r.x0 - 1 <= sx <= r.x1 + 1 and r.y0 - 9 <= tip <= r.y1 + 9)
                        for g in mine:
                            if g['c'] in FLAGS and abs(g['x'] - sx) < 4 and abs(g['y'] - h['y']) < 4.5 * sp:
                                nflag = max(nflag, FLAGS[g['c']])
                        nflag = max(nflag, nb)
                    beats = 1 / (2 ** nflag)
                if dotted:
                    beats *= 1.5
                events.append(dict(x=h['x'], beats=beats, midi=midi, recit=base == 0, step=stp, y=h['y'], rest=False,
                                   dir=sdir, sx=stem[0] if stem else None, li=li, octv=octv, acc=acc is not None))
        # editorial accidentals, printed in brackets above or below their note
        for g in mine:
            if g['c'] in ACC and id(g) not in used and g['x'] >= first_x - 14:
                near = [e for e in events if not e['rest'] and abs(e['x'] - g['x']) < 7 and abs(e['y'] - g['y']) >= sp * 0.6]
                if near:
                    e = min(near, key=lambda e: abs(e['y'] - g['y']))
                    if not e['acc']:
                        e['midi'] = 12 * (e['octv'] + 1) + SEMI[e['li']] + ACC[g['c']]
                    used.add(id(g))
        # triplets: a "3" over (or under) three notes
        for w in P.words:
            if w[4] == '3':
                wx, wy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
                if staff_of(sysst, wy) != k or not (st['top'] - 6 * sp <= wy <= st['bot'] + 6 * sp):
                    continue
                cand = sorted([e for e in events if not e['rest'] and abs(e['x'] - wx) < 30 and not e.get('trip')], key=lambda e: abs(e['x'] - wx))
                if cand:
                    mid = cand[0]
                    row = sorted([e for e in events if not e['rest'] and not e.get('trip')], key=lambda e: e['x'])
                    i = row.index(mid)
                    wins = [row[j:j + n] for n in (3, 2) for j in range(max(0, i - n + 1), i + 1) if j + n <= len(row)]
                    wins = [g for g in wins if round(sum(e['beats'] for e in g), 3) in (0.75, 1.5) or all(e['beats'] == 1 for e in g) and len(g) == 3]
                    if wins:
                        best = min(wins, key=lambda g: abs((g[0]['x'] + g[-1]['x']) / 2 - wx))
                        for e in best:
                            e['beats'] *= 2 / 3
                            e['trip'] = True
        # a stemless (whole) note struck beside a stemmed one of another pitch is a second voice on the staff:
        # it takes the other stem direction (vol. I's divided bass)
        for e in events:
            if e['rest'] or e.get('dir'):
                continue
            q = next((q for q in events if not q['rest'] and q.get('dir') and q['midi'] != e['midi']
                      and abs(q['x'] - e['x']) < 9.5), None)
            if q and (e['midi'] < q['midi']) == (q['dir'] == 'u'):
                e['dir'], e['sx'] = ('d' if q['dir'] == 'u' else 'u'), q['sx']
        events.sort(key=lambda e: (e['x'], -(e['midi'] or 0)))
        # columns of heads struck together: chords (one stem) or two voices (stems up and down)
        cols = []
        for e in events:
            q = cols[-1][-1] if cols else None
            together = q is not None and not e['rest'] and not q['rest'] and (
                abs(q['x'] - e['x']) < 1.5 or abs(q['x'] - e['x']) < 9.5 and (
                    q.get('dir') and e.get('dir') and q['dir'] != e['dir'] and abs(q['sx'] - e['sx']) < 7  # two voices: stems close
                    or q.get('sx') is not None and e.get('sx') is not None and abs(q['sx'] - e['sx']) < 1))  # one stem
            if together:
                cols[-1].append(e)
            else:
                cols.append([e])
        bass = k == len(sysst) - 1
        layers = {'u': [], 'd': []}
        clock = {'u': 0.0, 'd': 0.0}

        def put(l, e):
            layers[l].append(dict(e))
            clock[l] += e['beats']
        for col in cols:
            ups = [e for e in col if e.get('dir') == 'u']
            downs = [e for e in col if e.get('dir') == 'd']
            if ups and downs:
                put('u', max(ups, key=lambda e: e['midi']))
                put('d', min(downs, key=lambda e: e['midi']))
                continue
            e = min(col, key=lambda e: e['midi']) if (bass and not col[0]['rest']) else max(col, key=lambda e: e['midi'] or 0)
            if os.environ.get('OMR_DBG') == str(k):
                print('   col', round(col[0]['x']), [(c.get('dir'), c['beats'], c['midi']) for c in col], dict(clock))
            if abs(clock['u'] - clock['d']) < 1e-6:
                put('u', e)
                put('d', e)
            else:
                put('u' if clock['u'] < clock['d'] else 'd', e)
        events = layers['d' if bass else 'u']
        # recitation notes: half a beat per syllable sung on them
        # (counted under every staff of the system, the fullest line wins: all voices recite the same words)
        bands = [[w for w in P.words if s2['bot'] + 4 <= (w[1] + w[3]) / 2 <= s2['bot'] + 4.2 * s2['sp'] + 8 and re.search(r'\w', w[4])]
                 for s2 in sysst]
        for i, e in enumerate(events):
            if e.get('recit'):
                nx = events[i + 1]['x'] if i + 1 < len(events) else st['x1']
                n = max(sum(1 for w in toks if e['x'] - 3 <= w[0] < nx - 3) for toks in bands)
                e['beats'] = max(1, n) * 0.5
        # ties: a curve from one head to the next of the same pitch
        out = []
        for i, e in enumerate(events):
            if out and not e['rest'] and not out[-1]['rest'] and out[-1]['midi'] == e['midi']:
                p = out[-1]
                if any(p['x'] - 2 <= r.x0 <= p['x'] + 9 and e['x'] - 4 <= r.x1 <= e['x'] + 9 and abs((r.y0 + r.y1) / 2 - (p['y'] + e['y']) / 2) < 12 for r in P.curves):
                    p['beats'] += e['beats']
                    continue
            out.append(dict(e))
        res.append(out)
    return sync_recit(res)


def sync_recit(res):
    """Notes struck at one x in several voices start together: a recitation note lasts until its voice's next note,
    whose start another voice with measured notes tells; with no such voice its syllable count stands."""
    xs = sorted({e['x'] for v in res for e in v})
    cols = []
    for x in xs:
        if cols and x - cols[-1][-1] < 3:
            cols[-1].append(x)
        else:
            cols.append([x])
    col_of = {x: i for i, c in enumerate(cols) for x in c}
    idx = [0] * len(res)
    times = []
    for ci in range(len(cols)):
        known, est = [], []
        for k, v in enumerate(res):
            if idx[k] < len(v) and col_of[v[idx[k]]['x']] == ci and idx[k] > 0:
                prev = v[idx[k] - 1]
                (est if prev.get('recit') else known).append(prev['t'] + prev['beats'])
        t = max(known) if known else max(est) if est else (times[-1] if times else 0.0)
        times.append(t)
        for k, v in enumerate(res):
            if idx[k] < len(v) and col_of[v[idx[k]]['x']] == ci:
                if idx[k] > 0 and v[idx[k] - 1].get('recit'):
                    v[idx[k] - 1]['beats'] = max(0.5, t - v[idx[k] - 1]['t'])
                v[idx[k]]['t'] = t
                idx[k] += 1
    # a recitation note at the end of a voice lasts until the others end
    ends = [v[-1]['t'] + v[-1]['beats'] for v in res if v and not v[-1].get('recit')]
    if ends:
        for v in res:
            if v and v[-1].get('recit'):
                v[-1]['beats'] = max(0.5, max(ends) - v[-1]['t'])
    return res


def chant_pages(doc, start_page, num, last=None):
    """[(page index, [systems])] of chant `num` that starts on start_page (1-based); with `last`, the numbers from
    `num` to `last` read as one unit (a litany printed as several short numbers)."""
    lo = int(re.sub(r'\D', '', num))
    hi = int(re.sub(r'\D', '', last)) if last else None
    in_unit = lambda h: h[0] == num or (hi is not None and lo <= int(re.sub(r'\D', '', h[0])) <= hi)
    out, pi = [], start_page - 1
    started = False
    while pi < doc.page_count:
        P = Page(doc[pi])
        heads = sorted(P.heads_txt, key=lambda h: h[1])
        mine = [h for h in heads if h[0] == num]
        y_from = mine[0][2] if (mine and not started) else -1
        if not started and not mine:
            pi += 1
            continue
        others = [h for h in heads if h[1] > y_from and not in_unit(h)]
        y_to = others[0][1] if others else 1e9
        syss = [s for s in P.systems() if y_from < s[0]['top'] < y_to and len(s) >= 2]
        twins = [h for h in heads if mine and not started and not in_unit(h) and abs(h[1] - mine[0][1]) < 4]
        if twins:
            # two short pieces printed side by side under one row of numbers: each takes the systems nearer its number
            mx, tx = mine[0][3], twins[0][3]
            syss = [s for s in syss if abs(s[0]['x0'] - mx) < abs(s[0]['x0'] - tx)]
        if syss:
            out.append((pi, P, syss, y_from if not started else None))
        started = True
        if others:
            break
        pi += 1
    return out


def is_ossia(P, sysst):
    top = sysst[0]['top']
    return any(top - 40 < w[1] < top and w[4] in ('Ossia:', 'ase:') for w in P.words)


def pitch_seq(voice):
    s = [m for _, _, m in voice]
    return [b - a for a, b in zip(s, s[1:]) if b != a]


def similar(a, b):
    return difflib.SequenceMatcher(None, a, b, autojunk=False).ratio()


def main():
    vol, num, outdir = int(sys.argv[1]), sys.argv[2], sys.argv[3]
    start = int(sys.argv[4])
    json_only = '--json-only' in sys.argv
    fileno = int(sys.argv[sys.argv.index('--file') + 1]) if '--file' in sys.argv else int(re.sub(r'\D', '', num))
    last = sys.argv[sys.argv.index('--to') + 1] if '--to' in sys.argv else None
    doc = open_vol(vol)
    parts = chant_pages(doc, start, num, last)
    if not parts:
        print('not found'); return
    nst = max(len(s) for _, _, syss, _ in parts for s in syss)
    voices = [[] for _ in range(nst)]
    t = 0.0
    sysinfo = []
    for pi, P, syss, y_from in parts:
        for s in syss:
            if is_ossia(P, s):
                continue  # an alternative of the line above („ან ასე:“ / Ossia): not played after it
            ev = read_system(P, s)
            # each note starts where the voices' common timeline puts it (sync_recit), never running into the next one
            lens = [round(v[-1]['t'] + v[-1]['beats'], 3) if v else 0 for v in ev]
            if max(lens) - min(lens) > 0.01:
                print(f'  ! p{pi + 1} system y={s[0]["top"]:.0f}: voice lengths differ {lens}')
            for k, v in enumerate(ev):
                for i, e in enumerate(v):
                    if not e['rest']:
                        d = e['beats'] if i + 1 == len(v) else min(e['beats'], v[i + 1]['t'] - e['t'])
                        voices[k].append([round(t + e['t'], 3), round(d, 3), e['midi']])
            t0, t = t, t + max(lens)
            sysinfo.append((pi, s, t0, t))
    os.makedirs(outdir, exist_ok=True)
    pad = str(fileno).zfill(3)
    printed = {}
    for pi, P, syss, _ in parts:
        nums = [w[4] for w in P.words if w[1] > 790 and re.fullmatch(r'\d+', w[4])]
        printed[pi] = int(nums[-1]) if nums else pi + 1
    nums = list(range(int(re.sub(r'\D', '', num)), int(re.sub(r'\D', '', last)) + 1)) if last else [fileno]
    score = dict(nums=nums, page=printed[parts[0][0]], tempos=[[0, 72]], dur=round(t, 3),
                 voices=voices, img=[], sys=[])
    SC = 2.0
    for ii, (pi, P, syss, y_from) in enumerate(parts):
        X0, X1 = 36, P.pg.rect.width - 36
        sx0, sx1 = min(s[0]['x0'] for s in syss), max(s[0]['x1'] for s in syss)
        if sx1 - sx0 < 0.6 * (X1 - X0):  # a piece printed beside another: only its own column
            X0, X1 = max(0, sx0 - 14), min(P.pg.rect.width, sx1 + 14)
        Y0 = (y_from - 30) if y_from is not None else syss[0][0]['top'] - 22
        if y_from is not None:
            # a chant starting mid-page: begin below the previous chant's last system and its words
            above = [s for s in P.systems() if s[0]['top'] < y_from]
            if above:
                Y0 = max(Y0, max(s[-1]['bot'] for s in above) + 30)
        Y0 = max(0, Y0)
        Y1 = syss[-1][-1]['bot'] + 34
        clip = pymupdf.Rect(X0, Y0, X1, Y1)
        W, H = round((X1 - X0) * SC), round((Y1 - Y0) * SC)
        src = f'{pad}-{ii + 1}.webp'
        score['img'].append(dict(src=src, w=W, h=H, page=printed[pi]))
        if not json_only:
            pix = P.pg.get_pixmap(matrix=pymupdf.Matrix(SC, SC), clip=clip)
            Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(os.path.join(outdir, src), 'WEBP', quality=80)
        for (spi, s, t0, t1) in sysinfo:
            if spi != pi:
                continue
            sx0, sx1 = s[0]['x0'], s[0]['x1']
            sy0, sy1 = s[0]['top'] - 16, s[-1]['bot'] + 26
            score['sys'].append([ii, round((sx0 - X0) / (X1 - X0), 3), round((sy0 - Y0) / (Y1 - Y0), 3),
                                 round((sx1 - sx0) / (X1 - X0), 3), round((sy1 - sy0) / (Y1 - Y0), 3), round(t0, 3), round(t1, 3)])
    if not json_only:
        # incipit: the first system with the Georgian words, without the Latin line under the bass
        pi, P, syss, _ = parts[0]
        s = syss[0]
        top, bot = s[0]['top'] - 14, s[-1]['bot'] + 6
        h = bot - top
        sc = 200 / h
        w = min(s[0]['x1'] - s[0]['x0'] + 4, 520 / sc)
        clip = pymupdf.Rect(s[0]['x0'] - 4, top, s[0]['x0'] - 4 + w, bot)
        pix = P.pg.get_pixmap(matrix=pymupdf.Matrix(sc, sc), clip=clip)
        os.makedirs(os.path.join(outdir, 'i'), exist_ok=True)
        Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(os.path.join(outdir, 'i', f'{pad}.webp'), 'WEBP', quality=82)
    with open(os.path.join(outdir, f'{pad}.json'), 'w', encoding='utf-8') as f:
        json.dump(score, f, separators=(',', ':'))
    names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
    print(f'vol {vol} #{num} p{score["page"]} dur {score["dur"]} imgs {len(score["img"])} sys {len(score["sys"])}')
    for k, v in enumerate(voices):
        print(f'  v{k}:', ' '.join(f'{names[m % 12]}{m // 12 - 1}/{d:g}' for _, d, m in v[:16]))


if __name__ == '__main__':
    main()
