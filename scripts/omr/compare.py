import os, re, sys, json, subprocess, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from omr import pitch_seq, similar

HERE = os.path.dirname(__file__)
SITE = os.path.normpath(os.path.join(HERE, '..', '..', 'public', 'notes'))  # the site's own versions
CMP = os.path.join(tempfile.gettempdir(), 'omr-cmp')  # extracted versions, outside the repo
site = {}
for f in sys.argv[2].split(','):
    with open(os.path.join(SITE, f + '.json'), encoding='utf-8') as fh:
        site[f] = json.load(fh)['voices']
for spec in sys.argv[1].split(','):
    vol, num, page = spec.split(':')
    out = os.path.join(CMP, f'a{vol}')
    r = subprocess.run([sys.executable, '-E', '-P', os.path.join(HERE, 'omr.py'), vol, num, out, page, '--json-only'],
                       capture_output=True, text=True, encoding='utf-8')
    head = [l for l in r.stdout.splitlines() if l.startswith('vol') or l.startswith('  !')]
    path = os.path.join(out, re.sub(r'\D', '', num).zfill(3) + '.json')
    if not os.path.exists(path):
        print(spec, 'FAILED', r.stdout[-200:], r.stderr[-300:]); continue
    with open(path, encoding='utf-8') as fh:
        v = json.load(fh)['voices']
    scores = []
    for name, sv in site.items():
        s = [similar(pitch_seq(v[k])[:60], pitch_seq(sv[k])[:60]) for k in (0, len(v) - 1) if k < len(sv)]
        scores.append((round(sum(s) / len(s), 2), name))
    scores.sort(reverse=True)
    print(head[0] if head else spec, '| warn', len(head) - 1, '| best:', scores[:3])
