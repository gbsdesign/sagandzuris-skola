import json, re, datetime
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
O26 = json.load(open(f'{REPO}/src/data/calendar/2026.json'))['days']
import o26fix as _fix
O26_PATCH_HITS = _fix.apply(O26)
AZ = json.load(open(os.path.join(HERE, 'az.json')))
def flat(p): return ''.join(r[0] for r in p)
GOSPEL = {'Mt':'მთ','Mk':'მკ','Lk':'ლკ','Jn':'ინ'}
# Georgian book abbreviations -> azbyka codes
GEO2AZ = {
 'მთ':'Mt','მკ':'Mk','მარკ':'Mk','ლკ':'Lk','ლუკ':'Lk','ინ':'Jn','იოან':'Jn',
 'საქმ':'Acts','რომ':'Rom','1 კორ':'1Cor','2 კორ':'2Cor','გალ':'Gal','ეფ':'Eph','ეფეს':'Eph','ფილ':'Phil','ფილიპ':'Phil','ფლპ':'Phil','2 შჯ':'Deut','შჯ':'Deut','გამოს':'Ex','კოლ':'Col',
 '1 თეს':'1Thes','2 თეს':'2Thes','1 თესალ':'1Thes','2 თესალ':'2Thes','1 ტიმ':'1Tim','2 ტიმ':'2Tim','ტიტ':'Tit','ფილიმ':'Phlm','ფლმ':'Phlm','ებრ':'Heb',
 'იაკ':'Jas','1 პეტ':'1Pet','2 პეტ':'2Pet','1 ინ':'1Jn','2 ინ':'2Jn','3 ინ':'3Jn','იუდ':'Jude',
 'დაბ':'Gen','გამ':'Ex','ლევ':'Lev','რიცხ':'Num','რჯ':'Deut','რჯლ':'Deut','2 რჯ':'Deut','ისუ ნავ':'Josh','მსაჯ':'Judg','3 მეფ':'1Kgs','4 მეფ':'2Kgs',
 'იგავ':'Prov','სიბრძ':'Wis','ეს':'Is','ესაია':'Is','იერ':'Jer','ეზეკ':'Ezek','დან':'Dan','იოელ':'Joel','იონ':'Jon','ზაქ':'Zech','მალაქ':'Mal','სოფ':'Zeph','ბარ':'Bar','ეკლ':'Eccl','იობ':'Job','მიქ':'Mic','ამ':'Am','ოს':'Hos','ქებ':'Song',
}
AZFIX = {'Act':'Acts','Hebr':'Heb','Jac':'Jas','Juda':'Jude','Zah':'Zech','Solom':'Wis'}
APOSTLE = {'Acts','Rom','1Cor','2Cor','Gal','Eph','Phil','Col','1Thes','2Thes','1Tim','2Tim','Tit','Phlm','Heb','Jas','1Pet','2Pet','1Jn','2Jn','3Jn','Jude'}
def zkey(book, z):
    if book == 'GEO': return z
    book = AZFIX.get(book, book)
    z = re.sub(r'[^0-9]', ' ', z or '').split()
    if not z: return None
    z = z[0]
    if book in GOSPEL: return f'{book}{z}'
    if book in APOSTLE: return f'Ap{z}'
    return None
def az_keys(iso):
    out = []
    for sg in AZ[iso]['segs']:
        for b, cv, z in sg['refs']:
            k = zkey(b, z)
            if k: out.append(k)
    return out
BOOKS_RE = '|'.join(sorted((re.escape(k) for k in GEO2AZ), key=len, reverse=True))
GREF = re.compile(r'(?<![ა-ჿ])(' + BOOKS_RE + r')\s*[.:·]?\s*(\d+)\s*[:.]')
def o_keys(text):
    keys = []
    # find each book mention, then the first დას number after it before the next book mention
    ms = list(GREF.finditer(text))
    for i, m in enumerate(ms):
        seg = text[m.end(): ms[i+1].start() if i+1 < len(ms) else len(text)]
        z = re.search(r'დას[ი.]*\s*(\d+)', seg)
        b = GEO2AZ[m.group(1)]
        if z:
            k = zkey(b, z.group(1))
            if k: keys.append(k)
    return keys
def old_style(iso):
    d = datetime.date.fromisoformat(iso) - datetime.timedelta(days=13)
    return d
def julian_easter(y):
    a = y % 4; b = y % 7; c = y % 19
    d = (19*c + 15) % 30; e = (2*a + 4*b - d + 34) % 7
    m = (d + e + 114) // 31; day = (d + e + 114) % 31 + 1
    return datetime.date(y, m, day) + datetime.timedelta(days=13)
SERVICE_WORDS = [('Утр','matins'),('Лит','lit'),('На веч','vesp'),('Веч','vesp'),('6-м час','h6'),('6-й час','h6'),('3-й час','h3'),('9-й час','h9'),('1-й час','h1'),('На освящении воды','water'),('Освящение воды','water')]
def az_items(iso):
    """each ref with (group, service, part)"""
    items = []
    group = ''; service = ''
    for sg in AZ[iso]['segs']:
        lab = sg['label'].replace('class="readings-text">','').strip()
        lab_c = re.sub(r'\s+', ' ', lab)
        part = 'Ev' if re.search(r'Ев\s*\.?:\s*$', lab_c) else ('Ap' if re.search(r'Ап\s*\.?:\s*$', lab_c) else '')
        # group = text before a service word or the whole label
        g = lab_c
        sv = None
        for w, code in SERVICE_WORDS:
            i = g.find(w)
            if i >= 0:
                sv = code; g = g[:i]; break
        g = re.sub(r'(Ев|Ап)\s*\.?:\s*$', '', g).strip(' :–-.')
        if sv: service = sv
        if g and not re.fullmatch(r'(Ев|Ап)\.?', g): group = g
        elif sv and not g and lab_c and not part: pass
        for b, cv, z in sg['refs']:
            items.append({'g': group, 's': service, 'book': b, 'cv': cv, 'z': z, 'k': zkey(b, z)})
    return items
def is_ordinary(g):
    return g == '' or g.startswith('Рядов') or g.startswith('Ряд') or g.startswith('За ')
def load_m(year):
    d = json.load(open(f'{REPO}/public/wignebi/kalendari/{ {2024:"01",2025:"02",2026:"03",2027:"04"}[year] }.json'))
    out = {}
    for mi, month in enumerate(d['m']):
        for x in month:
            if not x.get('s') and not any(len(k) > 8 for k in x.get('k', [])): continue
            out[f'{year}-{mi+1:02d}-{x["d"]:02d}'] = x
    return out
M = {}
for _y in (2024, 2025, 2026):
    M.update(load_m(_y))
STOP = set('და ღირსისა ღირსთა მოწამისა მოწამეთა მღვდელმოწამისა მღვდელმოწამეთა წმიდისა წმიდათა წმ ღირ მოწ მღვდელმოწ დიდმოწამისა დიდმოწ ეპისკოპოსისა ეპ მისა მათთა მათ თანა მისთანა ქალწულისა იღუმენისა მთავარეპისკოპოსისა მთავარეპ ხუცესისა დიაკონისა მონაზონისა მისი მათი ნაწილთა წ ს მ ქრ შ-მდე სა'.split())
def toks(s):
    s = s.lower()
    s = re.sub(r'\([^)]*\)', ' ', s)
    w = re.findall(r'[ა-ჿ]+', s)
    out = set()
    for x in w:
        if x in STOP or len(x) < 3: continue
        out.add(x[:5])  # crude stem
    return out
def sim(a, b):
    A, B = toks(a), toks(b)
    if not A or not B: return 0.0
    return len(A & B) / min(len(A), len(B))
