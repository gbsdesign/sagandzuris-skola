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
FLAGS = {'J': 1, 'j': 1, 'K': 2, 'k': 2, 'R': 2, 'r': 2, 'L': 3, 'l': 3}  # R/r: the 16th's flags of vols II–XXIX
ACC = {'#': 1, 'b': -1, 'n': 0, 'N': 0, '(#)': 1, '(b)': -1, '(n)': 0,  # (x) = one bracketed glyph (vol. I)
       'a': 1, 'A': -1, '[': 1, '{': -1}  # the other volumes' bracketed ♯ ♭ (N = ♮): before the note, or over / under it
BRACKETED = {'N', 'a', 'A', '[', '{'}

# Vol. I's Petrucci subset gives its glyphs other codes (control characters for the heads); each was identified on
# the page pictures (2026-10-29) and is read as the standard Petrucci character it draws. Dynamics and fermatas
# stay unread, as in the other volumes.
REMAP_V1 = {'\x06': 'œ', '\x07': '˙', '¶': 'w', 't': 'W', '#': '#', 'Ü': 'b', 'ó': 'n', 'e': '(n)', 'S': '(b)', 'Ö': '(#)',
            'ì': 'j', 'a': 'J', '°': 'k', 'o': 'K', '4': '.', '\x10': 'Œ', '\x0f': 'Ó', '\x12': '∑', '\x13': '‰',
            's': 'V', 'Q': '?'}
# Vol. VIII's subset numbers the heads and rests differently again (seen on its pages, 2026-10-30): \x05 filled head,
# \x06 half head, \x11 quarter rest, \x12 eighth rest, \x15 half rest; the other codes are vol. I's.
REMAP_V8 = {**{k: v for k, v in REMAP_V1.items() if k not in '\x06\x07\x0f\x10\x12\x13'},
            '\x05': 'œ', '\x06': '˙', '\x11': 'Œ', '\x12': '‰', '\x15': 'Ó'}
REMAP = None  # set by open_vol when the volume uses that encoding; glyphs missing from it are dropped


def head_num(txt):
    """A chant's number from its title line: "203. title", "76a title", vol. I's bare "1." / "7.-8." (the title is
    its own line there), "22.a." (= 22a) and vols II–III's "81-a" (= 81a), vol. X's "55-b. title". Vol. V puts a stray „@“ before a few."""
    txt = txt.lstrip('@ ')
    m = re.match(r'^(\d+)\.([a-z])\.', txt)
    if m:
        return m.group(1) + m.group(2)
    m = re.match(r'^(\d+)-([a-z])(?:$|\.(?:\s|$))', txt)  # vols II–III: "81-a"; vols X–XI: "55-b. title", "141-b."
    if m:
        return m.group(1) + m.group(2)
    m = re.match(r'^(\d+[a-z]?)\.(?:-\d+[a-z]?\.)?$', txt)  # also vols XIV, XVII's bare "78a." (the title is below)
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
        chars = {ch['c'] for b in doc[pi].get_text('rawdict')['blocks'] for ln in b.get('lines', [])
                 for sp in ln['spans'] if 'Petrucci' in sp['font'] for ch in sp['chars']}
        if any(ord(c) < 32 for c in chars):
            REMAP = REMAP_V8 if '\x05' in chars else REMAP_V1
            break
    return doc


def beam_parts(items):
    """the closed outlines of a filled drawing: rectangles one by one, lines grouped while each starts where the last ended"""
    parts, cur, last = [], [], None
    for it in items:
        if it[0] == 're':
            parts.append(pymupdf.Rect(it[1]))
            continue
        a, b = it[1], it[2]
        if cur and last is not None and (abs(a.x - last.x) > 0.05 or abs(a.y - last.y) > 0.05):
            parts.append(_bbox(cur)); cur = []
        cur += [a, b]
        last = b
    if cur:
        parts.append(_bbox(cur))
    return parts


def _bbox(pts):
    return pymupdf.Rect(min(p.x for p in pts), min(p.y for p in pts), max(p.x for p in pts), max(p.y for p in pts))


class Page:
    def __init__(self, pg):
        self.pg = pg
        self.glyphs, self.words, self.heads_txt = [], [], []
        self.foot_y = 1e9
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
                # the footnotes begin with a line „1) …“ of small plain text (a bold „1) 2)“ is a marker over the music):
                # music printed below it is an example quoted in a footnote (a manuscript's fragment), not the chant
                if (re.match(r'\d\)\s*\S', txt) and len(txt) > 15 and size < 11 and 'Bold' not in ln['spans'][0]['font']
                        and len(txt.split()) >= 4
                        and not (len(txt) < 40 and re.search(r'Andante|Moderato|Allegro|Adagio|moZraobiT', txt))):  # „2) saSualo moZraobiT - Andante“ (vol. XVIII) is a marked tempo
                    self.foot_y = min(self.foot_y, ln['bbox'][1])
        self.words = [w for w in pg.get_text('words')]
        self.hlines, self.vlines, self.beams, self.curves = [], [], [], []
        for d in pg.get_drawings():
            r = d['rect']
            items = d['items']
            if d.get('fill') is not None and d.get('type') in ('f', 'fs'):
                if (all(it[0] == 'l' for it in items) and len(items) >= 3 and r.height < 12 or all(it[0] == 're' for it in items) and r.height < 4) and r.width > 2.5:  # (a 16th's short beam is 4 pt)
                    # one drawing may hold several beams (a 16th's short second beam beside its 8th beam): each
                    # closed outline is a beam of its own
                    for part in beam_parts(items):
                        if part.width > 2.5:
                            self.beams.append(part)
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
        if not hasattr(self, '_systems'):
            self._systems = self._find_systems()
        return self._systems

    def _find_systems(self):
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
    # only this system's own width: two systems printed side by side in one row must not read each other's notes
    left, right = sysst[0]['x0'] - 25, sysst[0]['x1'] + 10
    gl = [g for g in P.glyphs if top <= g['y'] <= bot and left <= g['x'] <= right]
    # small (cue-size) heads are the editors' alternatives or guesses: not played
    # a head's size goes with its staff's line spacing (a page may print smaller staves — a footnote's example, a
    # whole piece set smaller): the page's usual head size per line space, times this system's spacing
    if not hasattr(P, 'head_ratio'):
        staves = [s for sy in P.systems() for s in sy]
        rs = sorted(g['size'] / min(staves, key=lambda s: abs((s['top'] + s['bot']) / 2 - g['y']))['sp']
                    for g in P.glyphs if g['c'] in HEADS) if staves else []
        P.head_ratio = rs[len(rs) // 2] if rs else None
    sizes = sorted(g['size'] for g in P.glyphs if g['c'] in HEADS)
    normal = P.head_ratio * sysst[0]['sp'] if P.head_ratio else (sizes[len(sizes) // 2] if sizes else 17.5)
    # (but a short small system beside the music — a cue „თა! მომიხს…“ of what is sung next — keeps the page's size)
    page_sy = P.systems()
    big_sp = max((sy[0]['sp'] for sy in page_sy), default=sysst[0]['sp'])
    big_w = max((sy[0]['x1'] - sy[0]['x0'] for sy in page_sy), default=1)
    if P.head_ratio and sysst[0]['sp'] < 0.9 * big_sp and sysst[0]['x1'] - sysst[0]['x0'] < 0.5 * big_w:
        normal = P.head_ratio * big_sp
    res, alts = [], {}
    # a staff printed with smaller heads all through (vol. II's bass) is still sung when the other staves have
    # notes: its own size is its normal one (a line of only small notes — a cue of what follows — stays silent)
    full = [any(g['c'] in HEADS and g['size'] > normal * 0.88 and staff_of(sysst, g['y']) == j for g in gl)
            for j in range(len(sysst))]
    for k, st in enumerate(sysst):
        sp = st['sp']
        mine = [g for g in gl if staff_of(sysst, g['y']) == k and st['top'] - 6 * sp <= g['y'] <= st['bot'] + 6 * sp]
        clefg = [g for g in mine if g['c'] in CLEF and g['x'] < st['x0'] + 30]
        clef = clefg[0]['c'] if clefg else ('?' if k == len(sysst) - 1 else 'V')
        cl_letter, cl_oct = CLEF[clef]
        heads = []
        # a head in round brackets is the editors' alternative (vol. I prints it full size): not played
        parens = [w for w in P.words if w[4] in ('(', ')') and abs((w[1] + w[3]) / 2 - (st['top'] + st['bot']) / 2) < 4 * sp]
        # (the brackets stand at the head's height: a bracketed fermata over the note does not count)
        near_y = lambda w, g: abs((w[1] + w[3]) / 2 - g['y']) < 1.2 * sp
        bracketed = lambda g: any(w[4] == '(' and -1 < g['x'] - w[2] < 8 and near_y(w, g) for w in parens) and any(
            w[4] == ')' and 0 < w[0] - g['x'] < 18 and near_y(w, g) for w in parens)
        own = normal
        if not full[k] and any(full):
            own = max((g['size'] for g in mine if g['c'] in HEADS), default=normal)
        for g in sorted([g for g in mine if g['c'] in HEADS and g['size'] > own * 0.88 and not bracketed(g)], key=lambda g: g['x']):
            if not any(q['c'] == g['c'] and abs(q['x'] - g['x']) < 0.6 and abs(q['y'] - g['y']) < 0.6 for q in heads):
                heads.append(g)  # a head printed twice (two voices on one note) is one head with two stems
        rests = [g for g in mine if g['c'] in RESTS]
        first_x = heads[0]['x'] if heads else 1e9

        def step(y):
            return round((st['bot'] - y) / (sp / 2))

        def pitch_of(stp):
            idx = cl_letter + stp
            return idx % 7, cl_oct + idx // 7

        # an accidental belongs to the head right after it on the same staff step (printed 4–6 pt before it; a chord's
        # second column further left; a bracketed one is wider)
        reach_of = lambda g: 20 if len(g['c']) > 1 or g['c'] in BRACKETED else 11
        attached = lambda g, lim=None: any(1 < h['x'] - g['x'] < (lim or reach_of(g)) and step(h['y']) == step(g['y']) for h in heads)
        # key signature: accidentals before the first note that are not its own (its own stands closer than 7 pt)
        key = {}
        used = set()
        for g in mine:
            if g['c'] in ('#', 'b') and g['x'] < first_x - 3 and g['x'] < st['x0'] + 70 and not attached(g, 7):
                key[pitch_of(step(g['y']))[0]] = ACC[g['c']]
                used.add(id(g))
        bars = sorted(x for x, y0, y1 in P.vlines if y0 <= st['top'] + 0.5 and y1 >= st['bot'] - 0.5 and x > st['x0'] + 5)
        # a key change inside the line: a row of accidentals (each a few points after the other) that is not one
        # chord's, or a lone one no note takes that stands right after a barline or at the same place on another staff
        # (also before the first note when it stands past the line's opening: a line that starts with rests)
        accs = sorted([g for g in mine if g['c'] in ('#', 'b', 'n') and g['x'] >= min(first_x - 3, st['x0'] + 70) and id(g) not in used],
                      key=lambda g: g['x'])
        rows = []
        for g in accs:
            if rows and 2 < g['x'] - rows[-1][-1]['x'] <= 8:
                rows[-1].append(g)
            else:
                rows.append([g])
        others = [g2 for g2 in gl if g2['c'] in ('#', 'b', 'n') and staff_of(sysst, g2['y']) != k]
        changes = []  # (x, glyphs)
        for row in rows:
            if len(row) >= 2:
                after = [h for h in heads if 0 < h['x'] - row[-1]['x'] < 25]
                col = [h for h in after if abs(h['x'] - min(a['x'] for a in after)) < 3] if after else []
                chord = col and all(any(step(h['y']) == step(g['y']) for h in col) for g in row)
                if not chord:
                    changes.append(row)
            elif not attached(row[0]) and -2 <= step(row[0]['y']) <= 10 and not any(abs(h['x'] - row[0]['x']) < 7 for h in heads):
                # (an editors' accidental printed over or under its note is not one)
                g = row[0]
                after_bar = any(0 < g['x'] - b <= 10 for b in bars)
                wide = any(abs(g2['x'] - g['x']) <= 3 for g2 in others)
                if after_bar or wide:
                    changes.append(row)
        keys = [(-1e9, key)]
        for row in changes:
            nk = dict(keys[-1][1])
            for g in row:
                used.add(id(g))
                if g['c'] == 'n':
                    nk.pop(pitch_of(step(g['y']))[0], None)
            if any(g['c'] != 'n' for g in row):
                nk = {pitch_of(step(g['y']))[0]: ACC[g['c']] for g in row if g['c'] != 'n'}
            keys.append((row[0]['x'], nk))
            if os.environ.get('OMR_AUDIT'):
                print(f"  K p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} key change at x={row[0]['x']:.0f}: {''.join(g['c'] for g in row)} -> {nk}")
        events = []
        for g in rests:
            events.append(dict(x=g['x'], beats=RESTS[g['c']], midi=None, rest=True))
        local, bar_i, key_i = {}, 0, 0
        for h in heads:
            while bar_i < len(bars) and bars[bar_i] < h['x']:
                local, bar_i = {}, bar_i + 1
            while key_i + 1 < len(keys) and keys[key_i + 1][0] < h['x']:
                local, key_i = {}, key_i + 1
            key = keys[key_i][1]
            stp = step(h['y'])
            li, octv = pitch_of(stp)
            acc = None
            for g in mine:
                if g['c'] in ACC and id(g) not in used and h['x'] - reach_of(g) < g['x'] < h['x'] - 1 and step(g['y']) == stp and g['x'] >= first_x - reach_of(g):
                    acc = ACC[g['c']]
                    used.add(id(g))
            if acc is not None:
                local[(li, octv)] = acc
            alt = local.get((li, octv), key.get(li, 0))
            if os.environ.get('OMR_ACCDBG') == f"{sysst[0]['top']:.0f}/{k}":
                print(f"   head x={h['x']:.0f} step={stp} acc={acc} alt={alt} key={key} local={local}")
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
                events.append(dict(x=h['x'], beats=beats, midi=midi, recit=base == 0, step=stp, y=h['y'], rest=False, c=h['c'],
                                   dir=sdir, sx=stem[0] if stem else None, li=li, octv=octv, acc=acc is not None))
        # editorial accidentals, printed in brackets above or below their note
        smalls = [g for g in mine if g['c'] in HEADS and g['size'] <= own * 0.88]
        for g in mine:
            if g['c'] in ACC and id(g) not in used and g['x'] >= first_x - 14:
                # (a small sign, or one in front of a small head, is the small note's own: it is not played)
                if g['size'] <= own * 0.88 or any(1 < h['x'] - g['x'] < reach_of(g) and step(h['y']) == step(g['y']) for h in smalls):
                    continue
                gc = (g['bb'][0] + g['bb'][2]) / 2  # (a bracketed one is wide: its middle stands over the note's)
                near = [e for e in events if not e['rest'] and abs(e['x'] + 2.5 - gc) < 7 and abs(e['y'] - g['y']) >= sp * 0.6]
                if near:
                    e = min(near, key=lambda e: abs(e['y'] - g['y']))
                    # (over a printed one too: „(♯)“ over a ♮F is the editors' reading, F♯)
                    e['midi'] = 12 * (e['octv'] + 1) + SEMI[e['li']] + ACC[g['c']]
                    # (and the same note sung again right after it: „(♯)“ over the first of a recitation's notes)
                    row = sorted([q for q in events if not q['rest'] and q.get('dir') == e.get('dir')], key=lambda q: q['x'])
                    for q in row[row.index(e) + 1:]:
                        if (q['li'], q['octv']) != (e['li'], e['octv']) or q['acc'] or any(e['x'] < b < q['x'] for b in bars):
                            break
                        q['midi'] = e['midi']
                    used.add(id(g))
        if os.environ.get('OMR_AUDIT'):
            for g in mine:
                if g['c'] in ACC and id(g) not in used and g['size'] > own * 0.88 and not (g['c'] in ('#', 'b') and g['x'] < first_x - 8 and g['x'] < st['x0'] + 70):
                    print(f"  ? p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} unused {g['c']} x={g['x']:.0f} y={g['y']:.0f} step={step(g['y'])} first_x={first_x:.0f} x0={st['x0']:.0f} x1={st['x1']:.0f}")
        # triplets: a "3" over (or under) three notes
        for w in P.words:
            if w[4] == '3':
                wx, wy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
                if not left <= wx <= right:
                    continue
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
                    elif os.environ.get('OMR_AUDIT'):
                        print(f"  ? p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} unused 3 x={wx:.0f} y={wy:.0f}")
        # five, six or seven notes of one value under „5“ „6“ „7“ fill the time of four
        for w in P.words:
            if w[4] in ('5', '6', '7'):
                wx, wy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
                if not left <= wx <= right or staff_of(sysst, wy) != k or not (st['top'] - 4 * sp <= wy <= st['bot'] + 4 * sp):
                    continue
                n = int(w[4])
                row = sorted([e for e in events if not e['rest'] and not e.get('trip')], key=lambda e: e['x'])
                wins = [row[j:j + n] for j in range(len(row) - n + 1)]
                wins = [g for g in wins if len({e['beats'] for e in g}) == 1 and g[0]['x'] < wx < g[-1]['x']
                        and abs((g[0]['x'] + g[-1]['x']) / 2 - wx) < (g[-1]['x'] - g[0]['x']) / 6 + 4]
                if wins:
                    best = min(wins, key=lambda g: abs((g[0]['x'] + g[-1]['x']) / 2 - wx))
                    for e in best:
                        e['beats'] *= 4 / n
                        e['trip'] = True
        if os.environ.get('OMR_AUDIT'):
            for w in P.words:  # other tuplets' numbers are not read at all
                wx, wy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
                if w[4] in ('5', '6', '7') and left <= wx <= right and staff_of(sysst, wy) == k and st['top'] - 4 * sp <= wy <= st['bot'] + 4 * sp \
                        and any(abs(e['x'] - wx) < 25 for e in events if not e['rest']) and not any(e.get('trip') and abs(e['x'] - wx) < 25 for e in events):
                    print(f"  ? p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} unused tuplet {w[4]} x={wx:.0f} y={wy:.0f}")
            for g in mine:
                if g['size'] <= own * 0.88:
                    continue  # (a small head's own signs)
                if g['c'] == '.':
                    beside = [h for h in heads if abs(g['y'] - h['y']) < sp * 0.7 and 0 < g['x'] - h['x'] < 24]
                    if beside and not any(4 < g['x'] - h['x'] < 12 for h in beside):
                        print(f"  ? p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} unused dot x={g['x']:.0f} y={g['y']:.0f} dx={min(g['x'] - h['x'] for h in beside):.1f}")
                if g['c'] in FLAGS and not any(e.get('sx') is not None and abs(g['x'] - e['sx']) < 4 and abs(g['y'] - e['y']) < 4.5 * sp for e in events if not e['rest']):
                    print(f"  ? p{P.pg.number + 1} sys y={sysst[0]['top']:.0f} staff {k} unused flag {g['c']} x={g['x']:.0f} y={g['y']:.0f}",
                          [(round(e['x']), e.get('sx') and round(e['sx'], 1), round(e['y'])) for e in events if not e['rest'] and abs(e['x'] - g['x']) < 8] if os.environ.get('OMR_FLAGDBG') else '')
        # a stemless (whole) note struck beside a stemmed one of another pitch is a second voice on the staff:
        # it takes the other stem direction (vol. I's divided bass)
        # — unless it stands right of the stemmed one, the other staves striking a note with it and none with the stemmed
        # one: then it simply follows it (vol. II's whole note after a 16th a second higher)
        other_x = [g['x'] for g in gl if g['c'] in HEADS and staff_of(sysst, g['y']) != k]
        e_c = lambda e: e.get('c', 'œ')
        on_col = lambda x: any(abs(o - x) < 1.5 for o in other_x)
        for e in events:
            if e['rest'] or e.get('dir'):
                continue
            # (a unison too: a whole note printed beside a quarter of the same pitch is the other voice's)
            q = next((q for q in events if not q['rest'] and q.get('dir') and (q['midi'] != e['midi'] or HEADS[e_c(e)] >= 2)
                      and abs(q['x'] - e['x']) < 9.5), None)
            if q and e['x'] > q['x'] + 1 and on_col(e['x']) and not on_col(q['x']):
                q = None
            if q and (e['midi'] == q['midi'] or (e['midi'] < q['midi']) == (q['dir'] == 'u')):
                e['dir'], e['sx'] = ('d' if q['dir'] == 'u' else 'u'), q['sx']
        events.sort(key=lambda e: (e['x'], -(e['midi'] or 0)))
        bass = k == len(sysst) - 1
        # recitation notes: half a beat per syllable sung on them
        # (counted under every staff of the system, the fullest line wins: all voices recite the same words)
        bands = [[w for w in P.words if s2['bot'] + 4 <= (w[1] + w[3]) / 2 <= s2['bot'] + 4.2 * s2['sp'] + 8 and re.search(r'\w', w[4])]
                 for s2 in sysst]

        def voice(crossed_two):
            """the staff's voice: columns of heads struck together — chords (one stem) or two voices (stems up and
            down; `crossed_two`: also when the stem-up one is the lower, else such a pair follows each other)"""
            cols, crossed = [], False
            for e in events:
                q = cols[-1][-1] if cols else None
                two = q is not None and not e['rest'] and not q['rest'] and abs(q['x'] - e['x']) < 9.5 and (
                    q.get('dir') and e.get('dir') and q['dir'] != e['dir'] and abs(q['sx'] - e['sx']) < 7)
                cross = two and (q['midi'] >= e['midi']) != (q['dir'] == 'u')
                crossed = crossed or cross
                together = q is not None and e['rest'] and q['rest'] and abs(q['x'] - e['x']) < 3 or q is not None and not e['rest'] and not q['rest'] and (
                    abs(q['x'] - e['x']) < 1.5 or two and (crossed_two or not cross)
                    or abs(q['x'] - e['x']) < 9.5 and q.get('sx') is not None and e.get('sx') is not None and abs(q['sx'] - e['sx']) < 1)  # one stem
                if together:
                    cols[-1].append(e)
                else:
                    cols.append([e])
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
            evs = layers['d' if bass else 'u']
            for i, e in enumerate(evs):
                if e.get('recit'):
                    nx = evs[i + 1]['x'] if i + 1 < len(evs) else st['x1']
                    n = max(sum(1 for w in toks if e['x'] - 3 <= w[0] < nx - 3) for toks in bands)
                    e['beats'] = max(1, n) * 0.5
            # ties: a curve from one head to the next of the same pitch
            out = []
            for i, e in enumerate(evs):
                if out and not e['rest'] and not out[-1]['rest'] and out[-1]['midi'] == e['midi']:
                    p = out[-1]
                    if any(p['x'] - 2 <= r.x0 <= p['x'] + 9 and e['x'] - 4 <= r.x1 <= e['x'] + 9 and abs((r.y0 + r.y1) / 2 - (p['y'] + e['y']) / 2) < 12 for r in P.curves):
                        p['beats'] += e['beats']
                        continue
                out.append(dict(e))
            return out, crossed
        out, crossed = voice(True)
        # a crossed pair of stems is read both ways: the reading whose length the other staves have wins (below)
        alts[k] = voice(False)[0] if crossed else None
        res.append(out)
    total = lambda v: round(sum(e['beats'] for e in v), 3)
    for k, alt in alts.items():
        if alt is None:
            continue
        others = sorted(total(v) for j, v in enumerate(res) if j != k and v)
        if others and total(res[k]) != others[len(others) // 2] and total(alt) == others[len(others) // 2]:
            res[k] = alt
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
            first = True
            while idx[k] < len(v) and col_of[v[idx[k]]['x']] == ci:
                if first:
                    if idx[k] > 0 and v[idx[k] - 1].get('recit'):
                        v[idx[k] - 1]['beats'] = max(0.5, t - v[idx[k] - 1]['t'])
                    v[idx[k]]['t'] = t
                    first = False
                else:  # a second note of one voice in the column (printed very close): right after the first
                    p = v[idx[k] - 1]
                    v[idx[k]]['t'] = p['t'] + p['beats']
                idx[k] += 1
    # a note left out of the columns' order follows its voice's previous note
    for v in res:
        for i, e in enumerate(v):
            if 't' not in e:
                e['t'] = v[i - 1]['t'] + v[i - 1]['beats'] if i else 0.0
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
    # a unit „78a–82a“ takes only the a's (vol. XIV prints the litany's versions a and b one after the other); „85a–85b“ both
    let, last_let = re.sub(r'\d', '', num), re.sub(r'\d', '', last or '')
    same = lambda h: let != last_let or re.sub(r'\d', '', h[0]) in ('', let)
    in_unit = lambda h: h[0] == num or (hi is not None and lo <= int(re.sub(r'\D', '', h[0])) <= hi and same(h))
    out, pi = [], start_page - 1
    started = False
    while pi < doc.page_count:
        P = Page(doc[pi])
        heads = sorted(P.heads_txt, key=lambda h: h[1])
        mine = [h for h in heads if h[0] == num]
        if not started and not mine:
            pi += 1
            continue
        sy = P.systems()

        def music_top(h):
            # vols II–III print the number beside its system's first staff: the music starts at that system's top;
            # elsewhere the number heads the title above the music
            hy = (h[1] + h[2]) / 2
            beside = [s for s in sy if s[0]['top'] - 2 <= hy <= s[-1]['bot'] + 2 and h[3] < s[0]['x0']]
            return beside[0][0]['top'] - 1 if beside else None
        mt = music_top(mine[0]) if mine and not started else None
        y_from = (mt if mt is not None else mine[0][2]) if (mine and not started) else -1
        # a number far from this one is something else (a verse number, a tone): not where this chant ends
        near = lambda h: lo - 5 <= int(re.sub(r'\D', '', h[0])) <= (hi or lo) + 40 or bool(os.environ.get('NEAR_ALL'))
        others = sorted(((music_top(h) if music_top(h) is not None else h[1]), h) for h in heads if not in_unit(h) and near(h))
        others = [h for y, h in others if y > y_from]
        if started and os.environ.get('SAME_NUM_ENDS'):  # the book repeats this number for the next chant (vol. XVI's „62.“)
            others += [h for h in heads if h[0] == num]
        y_to = min((music_top(h) if music_top(h) is not None else h[1]) for h in others) if others else 1e9
        # (a chant whose own number stands below the footnotes' start is itself printed there: nothing is cut)
        foot = P.foot_y if not (mine and not started and mine[0][1] > P.foot_y) else 1e9
        syss = [s for s in sy if y_from < s[0]['top'] < min(y_to, foot) and len(s) >= 2]
        twins = [h for h in heads if mine and not started and not in_unit(h) and abs(h[1] - mine[0][1]) < 4]
        if twins:
            # two short pieces printed side by side under one row of numbers: each takes the systems nearer its number
            # (the row of the numbers is split by side; full-width lines below it continue the right-hand piece)
            mx, tx = mine[0][3], twins[0][3]
            row = min((s[0]['top'] for s in syss), default=0)
            syss = [s for s in syss if (abs(s[0]['x0'] - mx) < abs(s[0]['x0'] - tx) if s[0]['top'] - row < 10 else mx > tx)]
        if syss:
            out.append((pi, P, syss, y_from if not started else None))
        started = True
        if others or (twins and mx < tx):  # the left-hand twin ends in its row
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
    spell = [[] for _ in range(nst)]  # OMR_SPELL=1: each note's letter (0 = C … 6 = B) and alteration, for checks
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
                print(f'  ! p{pi + 1} system y={s[0]["top"]:.0f} line {len(sysinfo) + 1}: voice lengths differ {lens}')
            if os.environ.get('OMR_AUDIT'):
                # inside a line: a voice that falls silent with no rest printed, or a note cut by its voice's next one —
                # the other voices' notes struck at the same place set the time, so a misread length shows here
                for k, v in enumerate(ev):
                    for i in range(len(v) - 1):
                        e, n = v[i], v[i + 1]
                        if e.get('recit'):
                            continue
                        gap = round(n['t'] - (e['t'] + e['beats']), 3)
                        if abs(gap) > 0.01:
                            print(f"  ? p{pi + 1} sys y={s[0]['top']:.0f} line {len(sysinfo) + 1} staff {k} {'gap' if gap > 0 else 'cut'} {abs(gap):g} at t={e['t'] + e['beats']:g} x={e['x']:.0f}")
            for k, v in enumerate(ev):
                for i, e in enumerate(v):
                    if not e['rest']:
                        d = e['beats'] if i + 1 == len(v) else min(e['beats'], v[i + 1]['t'] - e['t'])
                        voices[k].append([round(t + e['t'], 3), round(d, 3), e['midi']])
                        spell[k].append([e['li'], e['midi'] - 12 * (e['octv'] + 1) - SEMI[e['li']]])
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
    if os.environ.get('OMR_SPELL'):
        score['spell'] = spell
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
