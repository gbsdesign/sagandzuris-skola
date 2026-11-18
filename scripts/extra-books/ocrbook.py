import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
# Books read by a scanner: lines -> sections, with word fixes from the church books' word list.
import re, pickle, glob, collections
W = pickle.load(open(os.path.join(WORK, 'words.pkl'), 'rb'))
LET = 'აბგდევზჱთიკლმნჲოპჟრსტჳუფქღყშჩცძწჭხჴჯჰჵ'
CONF = {'ი': 'ჲ', 'ჲ': 'ი', 'ჟ': 'ვ', 'ვ': 'ჟ', 'გ': 'ბ', 'ბ': 'გ', 'ჭ': 'ჯ', 'ჯ': 'ჭ', 'ე': 'ჱ', 'ჱ': 'ე', 'უ': 'ჳ',
        'ჳ': 'უ', 'ლ': 'ღ', 'ღ': 'ლ', 'ო': 'თ', 'თ': 'ო', 'ც': 'ხ', 'ხ': 'ც', 'ტ': 'ც', 'პ': 'ღ', 'მ': 'ძ', 'ძ': 'მ', 'ა': 'ჰ',
        'ჰ': 'ა', 'რ': 'ძ', 'ნ': 'ს', 'ს': 'ნ', 'ყ': 'უ', 'ქ': 'ჟ', 'წ': 'ხ'}

def fix_word(w):
    if len(w) < 3 or W.get(w, 0) >= 2: return w
    best = (W.get(w, 0), w)
    for i, c in enumerate(w):
        subs = set(CONF.get(c, '')) | (set(LET) if i == 0 else set())
        if c == 'წ': subs |= {'ხ'}
        for s in subs:
            v = w[:i] + s + w[i + 1:]
            k = W.get(v, 0)
            if k >= 3 and k > best[0]: best = (k, v)
    return best[1]

def fix_mixed(m):
    w = m.group(0)
    parts = re.split(r'([^ა-ჿ]+)', w)  # letters, junk, letters, ...
    junk = parts[1::2]
    if len(junk) > 2: return w
    best = None
    import itertools
    for combo in itertools.product(*[[''] + list(LET) for _ in junk]):
        v = ''.join(x if i % 2 == 0 else combo[i // 2] for i, x in enumerate(parts))
        k = W.get(v, 0)
        if k and (best is None or k > best[0]): best = (k, v)
    return best[1] if best else w

def fix_text(t):
    t = re.sub(r'[ა-ჿ]+(?:[0-9(<>|!]+[ა-ჿ]+)+', fix_mixed, t)
    t = re.sub(r'(?<=[ა-ჿ])[(<]', 'ა', t)
    t = re.sub(r'(?<![ა-ჿ])[0-9(](?=[ა-ჿ]{2,})', lambda m: '\x00', t)
    def first(m):
        rest = m.group(1); c = max(((W.get(L + rest, 0), L) for L in LET))
        return (c[1] if c[0] else '') + rest
    t = re.sub('\x00([ა-ჿ]+)', first, t)
    t = re.sub(r'::\s*([^:]+?)\s*::', r'„\1“', t)
    return re.sub('[ა-ჿ]+', lambda m: fix_word(m.group(0)), t)

GOOD_TOK = re.compile(r'^[„"(]*([ა-ჿ]+([-–][ა-ჿ]+)*|[0-9]+([-–,.:;][0-9]+)*([-–][ა-ჿ]+)?|[IVXL]+)[)“"»,.:;!?…]*$')
def clean(t):
    out = []
    for tok in t.split(' '):
        if not tok or re.fullmatch(r'[-–—_.,;:!?…„“"()]+', tok): out.append(tok); continue
        if GOOD_TOK.match(tok): out.append(tok); continue
        letters = len(re.findall('[ა-ჿ]', tok))
        if re.search(r'[A-Za-z<>/»«=|]', tok) or (letters and re.search(r'[0-9]', tok)) or letters < len(tok) * 0.5:
            continue  # scanner noise
        out.append(tok)
    s = ' '.join(x for x in out if x)
    s = re.sub(r'^\d{4,}\s+(?=[ა-ჿ])', '', s)
    return re.sub(r'^[\s\-–_.,:;]+', '', s)

def ok_para(t):
    ws = re.findall('[ა-ჿ]{3,}', t)
    if not ws: return len(t) > 0 and not re.fullmatch(r'[\s\-–_.,:;0-9]*', t)
    return sum(1 for w in ws if W.get(w)) / len(ws) >= 0.4 or len(ws) == 1 and len(t) < 30

def join(a, b):
    a = a.rstrip(); b = b.lstrip()
    if re.search(r'[ა-ჿ]-$', a) and re.match(r'[ა-ჿ]', b): return a[:-1] + b
    return a + ' ' + b

def from_lines(lines):
    """lines: dicts with t, red, short (shape reader). -> [[heading, [paras]]]"""
    secs = []; cur = None; para = ''
    def flush():
        nonlocal para
        if para.strip():
            if cur is None: secs.append(['', []])
            (secs[-1] if secs else None)[1].append(fix_text(para.strip()))
        para = ''
    for L in lines:
        t = re.sub(r'\s+', ' ', L['t']).strip()
        if not t: continue
        if L['red']:
            flush()
            if secs and not secs[-1][1] and secs[-1][0] and len(secs[-1][0]) < 120:
                secs[-1][0] = join(secs[-1][0], t) if secs[-1][0].endswith('-') else secs[-1][0] + ' ' + t
            else:
                secs.append([t, []]); cur = secs[-1]
            continue
        para = join(para, t) if para else t
        if L['short']: flush()
    flush()
    out = []
    for h, ps in secs:
        h = clean(fix_text(h)).strip(); ps = [clean(x) for x in ps]; ps = [x for x in ps if x and ok_para(x)]
        if h and not ok_para(h): h = ''
        if h or ps: out.append([h, ps])
    return out

RUBRIC = re.compile(r'^(ფსალმუნი|ტროპარი|კონდაკი|წარდგომა|სახარება|სამოციქულო|ალილუია|ირმოსი|გალობა|დიაკონი|მღვდელი|მედავითნე|გუნდი|ლოცვა|კვერექსი|სტიქარონ|დიდება|აწდა|აწ და)')

def from_tesseract(files):
    secs = [['', []]]; prev_open = False
    W3 = lambda s: [w for w in re.findall('[ა-ჿ]{3,}', s)]
    for f in files:
        blocks = re.split(r'\n\s*\n', open(f, encoding='utf-8').read())
        for b in blocks:
            ls = [l.strip() for l in b.split('\n') if l.strip()]
            ls = [l for l in ls if not re.fullmatch(r'[\d\s~\-–.,]+', l)]
            if not ls: continue
            txt = ''
            for l in ls: txt = join(txt, l) if txt else l
            ws = W3(txt)
            if ws and sum(1 for w in ws if W.get(w)) / len(ws) < 0.3: continue  # scanner noise
            if len(ls) == 1 and len(txt) <= 60 and RUBRIC.match(txt):
                secs.append([fix_text(txt), []]); prev_open = False; continue
            txt = fix_text(txt)
            if prev_open and secs[-1][1]:
                secs[-1][1][-1] = join(secs[-1][1][-1], txt)
            else:
                secs[-1][1].append(txt)
            prev_open = not re.search(r'[.!?:;»“"…)]$', txt)
    out = []
    for h, ps in secs:
        h = clean(h).strip(); ps = [clean(x) for x in ps]; ps = [x for x in ps if x and ok_para(x)]
        if h and not ok_para(h): h = ''
        if h or ps: out.append([h, ps])
    return out
