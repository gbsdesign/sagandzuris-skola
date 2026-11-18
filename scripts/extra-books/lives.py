# „ქართველ წმიდათა ცხოვრებანი“ (2018, b62): its scanned-text layer → months of saints' lives
# (title + its date, then the life's paragraphs), the scanner's words checked against the app's own saints' lives.
import pymupdf, re, collections
def vlines(path):
    doc = pymupdf.open(path); out = []
    for pno, pg in enumerate(doc):
        d = pg.get_text('dict'); rows = []
        for b in d['blocks']:
            for l in b.get('lines', []):
                t = ''.join(s['text'] for s in l['spans'])
                if not t.strip(): continue
                x0, y0, x1, y1 = l['bbox']
                rows.append([x0, y0, x1, y1, t, max(s['size'] for s in l['spans'])])
        rows.sort(key=lambda r: (round(r[1]), r[0]))
        vis = []
        for r in rows:
            if vis and abs(vis[-1]['y0'] - r[1]) < 4:
                v = vis[-1]; v['parts'].append(r); v['x1'] = max(v['x1'], r[2]); v['x0'] = min(v['x0'], r[0])
            else:
                vis.append({'y0': r[1], 'x0': r[0], 'x1': r[2], 'parts': [r]})
        for v in vis:
            v['parts'].sort(key=lambda r: r[0])
            v['t'] = ' '.join(p[4].strip() for p in v['parts'])
            v['sz'] = max(p[5] for p in v['parts'])
            v['p'] = pno
        out.extend(vis)
    return out

import glob, os
REPO = os.environ.get('SG_REPO') or os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
def _lives_vocab():
    C = collections.Counter()
    for f in glob.glob(os.path.join(REPO, 'public', 'lives', '**', '*.json'), recursive=True):
        C.update(re.findall('[ა-ჰ]+', open(f, encoding='utf-8').read()))
    return dict(C)
LIVES = _lives_vocab()
LET = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ'
def page_words(V):
    C = collections.Counter()
    for v in V: C.update(re.findall('[ა-ჰ]+', v['t']))
    return C

def fixer(SELF, subs_ok=None):
    cache = {}
    def fix(w):
        if w in cache: return cache[w]
        out = w
        if len(w) >= 4 and LIVES.get(w, 0) == 0 and SELF.get(w, 0) <= 2:
            best = (0, w)
            for i, c in enumerate(w):
                for s in LET:
                    if s == c: continue
                    if subs_ok and (c, s) not in subs_ok: continue
                    v = w[:i] + s + w[i + 1:]
                    k = LIVES.get(v, 0) + SELF.get(v, 0)
                    if k >= 4 and k > best[0]: best = (k, v)
            out = best[1]
        cache[w] = out
        return out
    return fix

MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი']
MOVABLE = 'წმიდათა გარდამავალი ხსენებანი'
W = 348.0
DATE = re.compile(r'^\d{1,2}\s*\(\s*\d[\d.,\-\s]*\)\s*[ა-ჰ]{4,}\.?$')

def dist(a, b):
    p = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        q = [i]
        for j, cb in enumerate(b, 1): q.append(min(p[j] + 1, q[j - 1] + 1, p[j - 1] + (ca != cb)))
        p = q
    return p[-1]

def month_of(t):
    t = re.sub('[^ა-ჰ]', '', t)
    if not 4 <= len(t) <= 12: return None
    best = min(range(12), key=lambda i: dist(t, MONTHS[i]))
    return best if dist(t, MONTHS[best]) <= 2 else None

def is_pageno(v): return v['y0'] > 470 and re.fullmatch(r'[\d!lI|]{1,4}', v['t'].strip())
def centred(v): return v['x0'] >= 23 and v['x1'] <= 326 and abs(v['x0'] - (W - v['x1'])) < 18
def indented(v): return 27 <= v['x0'] <= 45 and v['x1'] > 300

def tidy(t):
    t = re.sub(r'\b(\d{1,2})\s*\(\s*(\d{1,2})[-.](\d{2})\)', r'\1 (\2.\3)', t)
    t = re.sub(r'\((\d{1,2})\.(\d) (\d)\)', r'(\1.\2\3)', t)
    t = re.sub(r'\(([IVXL]+);', r'(\1);', t)
    t = t.replace('(IM)', '(IV)').replace('(M)', '(IV)').replace('(+(', '(+').replace('( +', '(+')
    t = re.sub(r'\(\+(\d) (\d{3})\)', r'(+\1\2)', t)
    t = re.sub(r'\s*[–—-]{2,}\s*', ' – ', t)
    t = re.sub(r'\s+([,.;:!?)“])', r'\1', t)
    t = re.sub(r'([(„])\s+', r'\1', t)
    return re.sub(r'\s{2,}', ' ', t).strip()

def join(a, b):
    a = a.rstrip(); b = b.lstrip()
    if re.search(r'[ა-ჰ][-–]$', a) and re.match(r'[ა-ჰ]', b): return a[:-1] + b
    return a + ' ' + b

def parse(path):
    ALL = [v for v in vlines(path) if v['p'] >= 4 and not is_pageno(v)]
    V = [v for v in ALL if v['p'] < 367]
    HYMN = [v for v in ALL if v['p'] == 368][1:]
    SELF = page_words(V)
    fx = fixer(SELF, {('ლ', 'ღ'), ('ვ', 'ხ'), ('დ', 'წ')})
    BLOCK = {'ბალის', 'ნათელილო', 'გამოცვ'}
    def known(w): return LIVES.get(w, 0) >= 3 or SELF.get(w, 0) >= 5
    def one(m):
        w = m.group(0)
        if w in BLOCK or LIVES.get(w, 0): return w
        # old letters the scanner misread: თჳს (as თვს / თგს / თჯს), ჴ (as პ / კ / ჭ)
        if re.search(r'თ(?:ჯვ|[ვგჯ])ს', w):
            v = re.sub(r'თ(?:ჯვ|[ვგჯ])ს', 'თჳს', w)
            if known(v.replace('თჳს', 'თვის')): return v
        for i, c in enumerate(w):
            if c in 'პკჭ' and SELF.get(w, 0) <= 3 and known(w[:i] + 'ხ' + w[i + 1:]): return w[:i] + 'ჴ' + w[i + 1:]
        # ღ read as ლ, however often
        for i, c in enumerate(w):
            if c == 'ლ' and len(w) >= 4:
                v = w[:i] + 'ღ' + w[i + 1:]
                if known(v): return v
                for j in range(i + 1, len(w)):
                    if w[j] == 'ლ':
                        v2 = v[:j] + 'ღ' + v[j + 1:]
                        if known(v2): return v2
        v = fx(w)
        if v != w and w[0] in 'ვდ' and len(w) < 6: return w
        return v
    def fix(t):
        return tidy(re.sub('[ა-ჰ]+', one, t))
    # title blocks: a run of centred lines on one page, the last its date or occasion
    marks = []  # (index, kind, data)
    global EXT; EXT = []
    month_at = {}
    for i, v in enumerate(V):
        m = month_of(v['t']) if v['sz'] >= 13 and v['x0'] > 90 and v['x1'] < 260 else None
        if m is not None: month_at[i] = m
        elif v['x0'] > 40 and MOVABLE in fix(v['t']): month_at[i] = 12
    movable_from = max(i for i, m in month_at.items() if m == 12)
    def anchor(d):
        v = V[d]; t = re.sub(r'^[^\dა-ჰ]+', '', v['t'].strip())
        if d in month_at: return False
        if d < movable_from:
            return bool(DATE.match(t)) and v['x0'] > 90 and v['x1'] < 270 and v['sz'] <= 12.8
        nxt = V[d + 1] if d + 1 < len(V) else None
        return (v['x0'] > 60 and v['x1'] < 290 and v['sz'] <= 10.8 and len(t) < 45 and d > 0 and V[d - 1]['p'] == v['p']
                and v['y0'] - V[d - 1]['y0'] < 30 and nxt is not None and (nxt['p'] != v['p'] or nxt['y0'] - v['y0'] > 18))
    marks = [(i, 'month', m) for i, m in month_at.items()]
    taken = set(month_at)
    for d in range(len(V)):
        if not anchor(d): continue
        a = d
        while a - 1 >= 0 and a - 1 not in taken and V[a - 1]['p'] == V[d]['p'] and V[a]['y0'] - V[a - 1]['y0'] < (30 if a == d and V[a - 1]['x0'] >= 23 else 21 if V[a - 1]['x0'] >= 23 else 17) and V[a - 1]['x0'] >= 15:
            a -= 1
        if a == d: continue
        gap = round(V[a]['y0'] - V[a - 1]['y0']) if a and V[a - 1]['p'] == V[d]['p'] else None
        EXT.append((V[d]['p'], round(V[a]['y0']), gap, d - a))
        taken.update(range(a, d + 1))
        marks.append((a, 'life', (d, ' '.join(V[k]['t'] for k in range(a, d)), V[d]['t'])))
    marks.sort()
    groups = []
    for n, (i, kind, data) in enumerate(marks):
        end = marks[n + 1][0] if n + 1 < len(marks) else len(V)
        if kind == 'month':
            groups.append({'m': data, 'list': V[i + 1:end], 'lives': []})
        else:
            j, title, when = data
            groups[-1]['lives'].append((fix(title), fix(when), V[j + 1:end]))
    out = []
    for g in groups:
        parts = []
        # the month's list of commemorations: an entry starts with its date or a dash
        entries = []
        for v in g['list']:
            t = v['t'].strip()
            if not entries or re.match(r'^(\d|[-–—])', t) or (g['m'] == 12 and centred(v)): entries.append(t)
            else: entries[-1] = join(entries[-1], t)
        entries = [fix(e) for e in entries if re.search('[ა-ჰ]{3}', e)]
        entries = [re.sub(r'^[–—-]\s*', '– ', e) for e in entries]
        if entries: parts.append({'l': 'ხსენებათა ნუსხა', 's': [['', entries]]})
        for title, when, lines in g['lives']:
            paras = []
            for v in lines:
                t = v['t'].strip()
                if not t: continue
                new = not paras or indented(v) or (centred(v) and v['x0'] > 45)
                prev_end = paras and re.search(r'[.!?:;»“”"…)]$', paras[-1])
                if new and paras and not indented(v) and not prev_end and not centred(v): new = False
                if new: paras.append(t)
                else: paras[-1] = join(paras[-1], t)
            paras = [fix(p) for p in paras if re.search('[ა-ჰ]', p)]
            title = re.sub(r'^[;,.\s]+|[;,\s]+$', '', title)
            parts.append({'l': title, 's': [[re.sub(r'^[^\dა-ჰ]+|[;,.\s]+$', '', when), paras]]})
        if g['m'] == 12:
            verses = []
            for v in HYMN:
                if not verses or v['x0'] < 60: verses.append(v['t'].strip())
                else: verses[-1] += ' ' + v['t'].strip()
            parts.append({'l': 'ქებაი და დიდებაი ქართულისა ენისაი', 's': [['', [fix(x) for x in verses]]]})
        out.append((g['m'], parts))
    return out

# titles read from the page pictures where the scanner misread the title type (month, number in month)
TITLES = {
    (0, 1): 'მოწამე გიორგი გურჯი – იბერიელი (+1770)',
    (0, 7): 'წმიდა სალომე უჯარმელი და პეროჟავრა სივნიელი (IV)',
    (0, 11): 'ღირსი გაბრიელი (ქიქოძე), იმერეთის ეპისკოპოსი (+1891)',
    (0, 12): 'წმიდა დავით აღმაშენებელი, მეფე ყოვლისა საქართველოისა (+1125)',
    (1, 2): 'წმიდა მეფე სოლომონ მეორე, სამშობლოსათვის თავდადებული (+1815)',
    (1, 5): 'ღირსი პროხორე ქართველი (XI); ღირსმოწამე ლუკა (აბაშიძე), მუხაის-ძე (+1272); ღირსმოწამე ნიკოლოზი (დვალი) (+1314) და სხვანი მოწამენი და ღირსნი მამანი ქართველნი, იერუსალიმის ქართველთა მონასტრებში ცხოვრებულნი (IV–XVIII საუკუნეები)',
    (1, 8): 'ღირსი ნიკოლოზი, ყოვლისა საქართველოისა კათოლიკოს-პატრიარქი (+1591)',
    (1, 9): 'მოწამენი: ცხრანი ყრმანი კოლაელნი, მტკვრის სათავესთან ქვით ჩაქოლილნი (VI)',
    (2, 1): 'ღირსი იოვანე მეოთხე, ყოვლისა საქართველოისა კათოლიკოს-პატრიარქი (ოქროპირად წოდებული) (+1001)',
    (2, 3): 'ღირსი იოვანე ხახულელი, ოქროპირად წოდებული (X–XI)',
    (2, 5): 'საქართველოს სამოციქულო ეკლესიის ავტოკეფალიის აღდგენის დღე (1917)',
    (2, 6): 'ღირსი ამბროსი აღმსარებელი (ხელაია), სრულიად საქართველოს კათოლიკოს-პატრიარქი (+1927)',
    (2, 8): 'მღდელმოწამე გაბრიელ მცირე (+1802)',
    (2, 9): 'ღირსი იოვანე მანგლელი (+1751)',
    (3, 4): 'წმიდა დიმიტრი ყიფიანი (+1887)',
    (3, 5): 'წმიდანი მესუკაველნი მოწამენი სუქია და მოყვასნი მისნი (II)',
    (3, 6): 'ღირსი ეფრემ დიდი, მაწყვერელი (დაახ. +855)',
    (3, 9): 'დუდიკვათსა და პაპათას მოწყვეტილნი ლაზი მოწამენი (XVII–XVIII)',
    (4, 1): 'ღირსი ზოსიმე კუმურდოელი (XVI)',
    (4, 4): 'ღირსნი ასურელნი მამანი: იოვანე ზედაზნელი და მისი ათორმეტნი მოწაფენი (VI)',
    (4, 5): 'ნეტარი ქრისტესია, ქრისტეფორედ წოდებული (+1771)',
    (4, 8): 'მოწამენი: დავითი და ტირიჭანი და დედაი მათი თაგინე (+693)',
    (4, 9): 'ღირსნი: ზაბილონი და სოსანა, მოციქულთასწორი ნინოს მშობლები (IV)',
    (4, 10): 'ღირსი დამიანე (დანიილი), მეფეყოფილი დემეტრე (+1157)',
    (5, 1): 'გარეჯელნი ღირსმოწამენი: მღდელმონაზონი შიო ახალი, დავით მწირი, გაბრიელი, პავლე და გაბრიელი (+1700)',
    (5, 2): 'ღირსმოწამე თევდორე მღდელი (კველთელი) (+1609)',
    (5, 4): 'ღირსმოწამე ანთიმ ივერიელი (+1716)',
    (5, 5): 'ღირსმოწამე ქაიხოსრო ქართველი (ჩოლოყაშვილი) (+1612)',
    (5, 10): 'წმიდა დინარ დედოფალი (X)',
    (6, 3): 'ღირსნი ათონელნი მამანი: იოვანე – ეფთვიმეს მამა და გაბრიელი (X)',
    (6, 4): 'ღირსმოწამე კოზმან ხუცესმონაზონი (+1630)',
    (6, 7): 'ღირსი ილარიონ თვალოელი (XI)',
    (7, 3): 'ღირსი ეფთვიმი (მჭედელაშვილი) გარეჯელი (+1804)',
    (7, 4): 'გარეჯელნი ღირსმოწამენი: გერონტი და სერაპიონ მღდელმონაზონნი, ოთარი და სვიმეონ იეროდიაკონნი, გერმანე და ბესარიონ მონაზონნი, მიქაელ მორჩილი (+1851)',
    (7, 8): 'ღირსმოწამენი: მიტროპოლიტი ნაზარი (ლეჟავა), მღდლები: გერმანე (ჯაჯანიძე), იეროთეოზი (ნიკოლაძე), სიმონი (მჭედლიძე); პროტოდიაკონი ბესარიონი (კუხიანიძე) (+1924) და ყოველნი ახალმოწამენი (XX)',
    (7, 10): 'ღირსი სერაპიონ საკვირველთმოქმედი, ნათლისმცემლის მონასტრის წინამძღვარი (+1747)',
    (8, 1): 'ღირსი სვიმეონი, გარეჯის წინამძღვარი (+1747)',
    (8, 3): 'ღირსი გიორგი ჭყონდიდელი (+1118)',
    (8, 7): 'მთავარმოწამე ბიძინა ჩოლოყაშვილი და მოწამენი ელიზბარ და შალვა ქსნის ერისთავნი (+1661)',
    (9, 1): 'კრება კვართისა საუფლოისა და სუეტისა ღმრთივბრწყინვალისა და მირონმდინარისა; მოციქულთასწორნი: მეფე მირიანი და დედოფალი ნანა, აბიათარ მღდელი და წმიდა სიდონია (IV)',
    (9, 5): 'ღირსი გრიგოლ ხანძთელი (+861) და კლარჯეთის უდაბნოს ღირსნი მამანი და დედანი (VIII–IX)',
    (9, 6): 'ღირსი იოსებ ხუცესი, მოხევე, საკვირველთმოქმედი (+1763)',
    (9, 7): 'ღირსი ანტონ ჭყონდიდელი (+1815) და მოწაფე მისი იაკობ ხუცესმონაზონი (XIX ს.)',
    (9, 12): 'წმიდა ზევდგინიძე, მეფისათვის თავდადებული (+1465)',
    (10, 2): 'წმიდანი: იოვანე, სტეფანე და ესაია ქართველნი (XI–XII)',
    (10, 3): 'დიდმოწამე გიორგი კაბადოკიელი (+303)',
    (10, 6): 'ღირსი ილარიონ ქართველი, საკვირველთმოქმედი (+875)',
    (10, 9): 'ღირსნი: პეტრე და სამოელ, ქართლის კათოლიკოსნი (V)',
    (11, 3): 'მღდელმოწამე იოვანე, ზედაზნის წინამძღვარი (IX)',
    (11, 4): 'ღირსნი მამანი: გიორგი მწერალი და საბა ხახულელი (XI)',
    (12, 1): 'ექვსიათასნი მოწამენი მამანი, გარეჯის უდაბნოში მოწყვეტილნი (1616)',
    (12, 4): 'ღირსნი: დავით გარეჯელი და ლუკიანე (VI)',
    (12, 5): 'წმიდა მოწამენი, აჭარაში თურქთაგან წამებულნი (XVII–XVIII)',
}

def book(path):
    """[(month 0–12, parts)] with the titles fixed; part 0 = the month's list (the movable part ends with the hymn)"""
    out = parse(path)
    seen = set()
    for m, parts in out:
        for i, p in enumerate(parts):
            if (m, i) in TITLES:
                p['l'] = TITLES[(m, i)]; seen.add((m, i))
            p['l'] = re.sub(r'(\(\w+)-(\w+\))', r'\1–\2', p['l']) if re.search(r'\([IVXL]+-[IVXL]+', p['l']) else p['l']
    assert seen == set(TITLES), set(TITLES) - seen
    return out
