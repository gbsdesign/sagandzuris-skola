import os, sys, json, difflib, tempfile
HERE = os.path.dirname(__file__)
SITE = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'notes'))  # the site's own versions
CMP = os.path.join(tempfile.gettempdir(), 'omr-cmp')  # extracted versions, outside the repo
N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']


def load(spec):
    path = os.path.join(SITE, spec + '.json') if '/' in spec else os.path.join(CMP, spec.split(':')[0], spec.split(':')[1].zfill(3) + '.json')
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)


def seq(v):
    out, prev = [], None
    for _, d, m in v:
        if m != prev:
            out.append(m)
        prev = m
    return out


a, b = load(sys.argv[1]), load(sys.argv[2])
for k in range(min(len(a['voices']), len(b['voices']))):
    sa, sb = seq(a['voices'][k]), seq(b['voices'][k])
    # transposition: shift b so its most common pitch matches a's
    shift = max(range(-12, 13), key=lambda s: difflib.SequenceMatcher(None, sa, [m + s for m in sb], autojunk=False).ratio())
    sb = [m + shift for m in sb]
    sm = difflib.SequenceMatcher(None, sa, sb, autojunk=False)
    print(f'voice {k}: {len(sa)} vs {len(sb)} notes, shift {shift}, ratio {sm.ratio():.2f}, dur {a["dur"]} vs {b["dur"]}')
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != 'equal':
            print(f'   {op:7} a[{i1}:{i2}] {" ".join(N[m % 12] for m in sa[i1:i2])} | b[{j1}:{j2}] {" ".join(N[m % 12] for m in sb[j1:j2])}')
