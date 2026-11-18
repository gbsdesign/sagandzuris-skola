"""Fixes to the 2026 Georgian calendar as read by the generator (the 2026 file itself is not changed)."""
import re
# (day or None for every day, old text, new text)
PATCHES = [
    ('2026-06-07', '3). სიბრძ. 515-24. 6: 1-3.', '3) სიბრძ. 5: 15-24; 6: 1-3.'),
    ('2026-06-07', 'მთ. 10: 32-33, 37-38; 10: 27-30 (დას. 38)', 'მთ. 10: 32-33, 37-38; 19: 27-30 (დას. 38)'),
    ('2026-06-07', 'კრება ყოველთა წმიდათა.  წმიდა იოანე', 'კრება ყოველთა წმიდათა; წმიდა იოანე'),
    ('2026-07-12', '1) 1 პეტ. 3-9: 2)', '1) 1 პეტ. 1: 3-9. 2)'),
    ('2026-04-10', 'მანგლელი ეპისკოპოსისა (1751);', 'მანგლელი ეპისკოპოსისა (1751)*;'),
    ('2026-07-10', 'ღირ.: რომ. 3: 28 - 4: 3 (დას. 85). მთ. 7: 24 - 8: 4 (დას. 24).', 'ღირ.: გალ. 5: 22 - 6: 2 (დას. 213). მთ. 11: 27-30 (დას. 43).'),
    (None, 'ებრ. 13: 7-I6 (დას', 'ებრ. 13: 7-16 (დას'),
    (None, 'ინ. 1: 8-10; 2: I1-6 (დას', 'ინ. 1: 8-10; 2: 1-6 (დას'),
    ('2027-01-06', 'II ჟამზე: იერ', 'III ჟამზე: იერ'),
    ('2027-01-06', '(ბარუქ.) 4: 36-38; 4: 1-4. გალ', '(ბარუქ.) 3: 36-38; 4: 1-4. გალ'),
    ('2027-01-06', 'მთ. 2: 1-I12.', 'მთ. 2: 1-12'),
    ('2027-01-06', 'ებრ. 2: 11-I8', 'ებრ. 2: 11-18'),
    ('2027-01-06', 'მთ. 2: 1323 (დას. 4)', 'მთ. 2: 13-23 (დას. 4)'),
    ('2026-02-01', '2. ტიმ: 30-15. (დას. 296)', '2 ტიმ. 3: 10-15 (დას. 296)'),
    (None, 'ინ. 24: 1-12. (დას. 112)', 'ლკ. 24: 1-12 (დას. 112)'),
    (None, 'ინ. 24: 36-53 (დას. 114)', 'ლკ. 24: 36-53 (დას. 114)'),
    ('2026-07-28', '(დას: 76)', '(დას. 76)'),
    ('2026-08-11', '2 კორ. 2: 14-3: 3 (დას. 12)', '2 კორ. 2: 14-3: 3 (დას. 172)'),
    ('2026-10-02', 'მთ. 24: 27-33, 42-51 (დას. 24)', 'მთ. 24: 27-33, 42-51 (დას. 100)'),
    ('2027-01-04', 'ლკ. 9: 42 - 10: 1 (დას. 42)', 'მკ. 9: 42 - 10: 1 (დას. 42)'),
    (None, '(დსა. 24)', '(დას. 24)'),
    ('2026-09-12', 'გალ, 4: 8-21 (დას 210)', 'გალ. 4: 8-21 (დას. 210)'),
    ('2026-01-19', 'იქროპირისა', 'ოქროპირისა'),
    ('2026-01-14', '(ხმალაძე, XIX)*', '(ხმალაძე, XIX)**'),
    ('2026-08-02', 'ანგელოზის დლე სრულიად საქართველოს კათოლიკოს-პატრიარქ ილია IL-ისა.', ''),
    ('2026-12-25', 'უწმიდესისა და უნეტარესის, სრულიად საქართველოს კათოლიკოს-პატრიარქ ილია II-ის აღსაყდრების (ინტრონიზაციის) დღე (1977 წ.).', ''),
]
PATCHES_RE = [
    (r'(?<![\d])([123])\.\s*(პეტ|ტიმ|კორ|თეს|ინ)\.', r'\1 \2.'),
    (r'ინ\. 19, 6-11', 'ინ. 19: 6-11'),
    (r'\(დას\. 49\. ინ\.', '(დას. 49). ინ.'),
    (r'მვა 3: 3-19 \(დას\. 12\)', 'მკ. 3: 13-19 (დას. 12)'),
    (r'ლკ\. · 8: 16-21\) \(დას\. 36\)', 'ლკ. 8: 16-21 (დას. 36)'),
    (r'\(დას,\s*(\d+)\)[:,]', r'(დას. \1).'),
    (r'მთ\. 11-25 \(დას: 1\)', 'მთ. 1: 1-25 (დას. 1)'),
    (r'(?<![ა-ჿ])(მთ|მკ|ლკ|ინ|ებრ|რომ|გალ|ეფ|კოლ)\s*:\s*(\d+)\s*:', r'\1. \2:'),
    (r'\(ლას\. ', '(დას. '),
    (r'რომ\. 8; 28-39', 'რომ. 8: 28-39'),
    (r'2 ტიმ\. 2: I-10', '2 ტიმ. 2: 1-10'),
]
def apply_re(O26, hits):
    for pat, rep in PATCHES_RE:
        rx = re.compile(pat)
        for iso, d in O26.items():
            for p in d['p']:
                text = ''.join(r[0] for r in p)
                if not rx.search(text): continue
                flags = [(r[1] if len(r) > 1 else 0) for r in p for _ in r[0]]
                out_t, out_f, last = [], [], 0
                for m in rx.finditer(text):
                    out_t.append(text[last:m.start()]); out_f.extend(flags[last:m.start()])
                    new = m.expand(rep); f = flags[m.start()]
                    out_t.append(new); out_f.extend([f] * len(new)); last = m.end()
                    hits[('re', pat)] = hits.get(('re', pat), 0) + 1
                out_t.append(text[last:]); out_f.extend(flags[last:])
                text = ''.join(out_t)
                runs = []
                for ch, f in zip(text, out_f):
                    if runs and runs[-1][1] == f: runs[-1][0] += ch
                    else: runs.append([ch, f])
                p[:] = [[t, f] if f else [t] for t, f in runs]
def apply(O26):
    hits = {}
    for day, old, new in PATCHES:
        for iso in ([day] if day else list(O26)):
            d = O26.get(iso)
            if not d: continue
            for p in d['p']:
                # patch across runs: work on the joined text, keep each run's flag by position
                text = ''.join(r[0] for r in p)
                if old not in text: continue
                flags = [(r[1] if len(r) > 1 else 0) for r in p for _ in r[0]]
                start = 0
                while True:
                    i = text.find(old, start)
                    if i < 0: break
                    f = flags[i] if i < len(flags) else 0
                    text = text[:i] + new + text[i + len(old):]
                    flags = flags[:i] + [f] * len(new) + flags[i + len(old):]
                    hits[(day, old)] = hits.get((day, old), 0) + 1
                    start = i + len(new)
                runs = []
                for ch, f in zip(text, flags):
                    if runs and runs[-1][1] == f: runs[-1][0] += ch
                    else: runs.append([ch, f])
                p[:] = [[t, f] if f else [t] for t, f in runs]
            # a commemoration paragraph emptied by a patch goes away
            d['p'] = [p for i, p in enumerate(d['p']) if not (p and not ''.join(r[0] for r in p).strip())]
    apply_re(O26, hits)
    for iso, d in O26.items():
        texts = [''.join(r[0] for r in p) for p in d['p']]
        for e in d.get('s', []):
            if 'at' not in e: continue
            pi, a, b = e['at']
            if pi >= len(texts): continue
            t = texts[pi]
            if t[a:a + len(e['n'])] == e['n']: continue
            i = t.find(e['n'])
            if i >= 0: e['at'] = [pi, i, i + (b - a)]
    return hits
