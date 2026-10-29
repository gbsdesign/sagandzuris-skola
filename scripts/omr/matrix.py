import os, sys, json, difflib, tempfile
HERE = os.path.dirname(__file__)
SITE = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'notes'))  # the site's own versions
CMP = os.path.join(tempfile.gettempdir(), 'omr-cmp')  # extracted versions, outside the repo


def load(spec):
    path = os.path.join(SITE, spec + '.json') if '/' in spec else os.path.join(CMP, spec.split(':')[0], spec.split(':')[1].zfill(3) + '.json')
    with open(path, encoding='utf-8') as fh:
        return json.load(fh)['voices']


def seq(v):
    out, prev = [], None
    for _, d, m in v:
        if m != prev:
            out.append(m)
        prev = m
    return out


def ratio(a, b):
    # exact pitches (no transposition): a different accidental counts as a difference
    return difflib.SequenceMatcher(None, seq(a), seq(b), autojunk=False).ratio()


specs = sys.argv[1].split(',')
data = {s: load(s) for s in specs}
print('top / middle / bass similarity (exact pitches)')
for i, a in enumerate(specs):
    row = []
    for b in specs[i + 1:]:
        va, vb = data[a], data[b]
        r = [ratio(va[k], vb[k]) for k in (0, 1, len(va) - 1) if k < len(vb)]
        if min(r) >= 0.8:
            row.append(f'{b}={"/".join(f"{x:.2f}" for x in r)}')
    print(f'{a:9}', '  '.join(row) or '-')
