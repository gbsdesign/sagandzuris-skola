"""azbyka readings -> structured per day; Georgian rendering."""
import re, sys, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import AZ, zkey
D = datetime.date; TD = datetime.timedelta
AZFIX = {'Act': 'Acts', 'Hebr': 'Heb', 'Jac': 'Jas', 'Juda': 'Jude', 'Zah': 'Zech', 'Solom': 'Wis'}
KA = {'Mt': 'მთ.', 'Mk': 'მკ.', 'Lk': 'ლკ.', 'Jn': 'ინ.', 'Acts': 'საქმ.', 'Rom': 'რომ.', '1Cor': '1 კორ.', '2Cor': '2 კორ.',
      'Gal': 'გალ.', 'Eph': 'ეფ.', 'Phil': 'ფლპ.', 'Col': 'კოლ.', '1Thes': '1 თეს.', '2Thes': '2 თეს.', '1Tim': '1 ტიმ.',
      '2Tim': '2 ტიმ.', 'Tit': 'ტიტ.', 'Phlm': 'ფლმ.', 'Heb': 'ებრ.', 'Jas': 'იაკ.', '1Pet': '1 პეტ.', '2Pet': '2 პეტ.',
      '1Jn': '1 ინ.', '2Jn': '2 ინ.', '3Jn': '3 ინ.', 'Jude': 'იუდ.', 'Gen': 'დაბ.', 'Ex': 'გამ.', 'Prov': 'იგავ.', 'Is': 'ეს.',
      'Joel': 'იოელ.', 'Zech': 'ზაქ.', 'Ezek': 'ეზეკ.', 'Wis': 'სიბრძ.', 'Jer': 'იერ.'}
def cv_ka(cv):
    """'1:1-2,10-12,2:6-10' -> '1: 1-2, 10-12; 2: 6-10'"""
    out = []; ch = None
    for piece in cv.split(','):
        piece = piece.strip()
        m = re.match(r'^(\d+):(\d+)(?:-(\d+)(?::(\d+))?)?$', piece)
        if m:
            c, a, b, c2 = m.groups()
            if c2:   # across chapters 4:7-5:9
                s = f'{c}: {a} - {b}: {c2}'; ch = b
            else:
                s = f'{c}: {a}' + (f'-{b}' if b else ''); ch = c
            out.append(('new', s))
            continue
        m = re.match(r'^(\d+)(?:-(\d+)(?::(\d+))?)?$', piece)
        if m:
            a, b, c2 = m.groups()
            if c2:
                s = f'{a} - {b}: {c2}'; ch = b
            else:
                s = a + (f'-{b}' if b else '')
            out.append(('same', s))
            continue
        out.append(('same', piece))
    txt = ''
    for i, (kind, s) in enumerate(out):
        if i == 0: txt = s
        elif kind == 'new': txt += '; ' + s
        else: txt += ', ' + s
    return txt
def zach_ka(z):
    if not z: return ''
    n = re.sub(r'[^\d]', ' ', z).split()
    if not n: return ''
    mid = 'от полу' in z or 'полу' in z
    return f' (დას. {n[0]}{", შუა" if mid else ""})'
def ref_ka(book, cv, z):
    b = AZFIX.get(book, book)
    return f'{KA.get(b, b + ".")} {cv_ka(cv)}{zach_ka(z)}'
# --------- day's readings, grouped ---------
SERV = [('Утр', 'matins'), ('Лит', 'lit'), ('Веч', 'vesp'), ('6-й час', 'h6'), ('6-м час', 'h6'), ('3-й час', 'h3'), ('9-й час', 'h9'), ('1-й час', 'h1')]
SERV_RE = re.compile(r'(Утр\s*\.?\s*[–-]?|Лит\s*\.?\s*[–-]?|На\s+веч\.?\s*[–-]?|Веч\.?\s*[–-]?|[1369]-[йм]\s*час[еу]?\s*[–-]?|На\s+[1369]-м\s+часе\s*[–-]?)')
SERV_CODE = [('Утр', 'matins'), ('Лит', 'lit'), ('веч', 'vesp'), ('Веч', 'vesp'), ('6-', 'h6'), ('3-', 'h3'), ('9-', 'h9'), ('1-', 'h1')]
def groups(iso):
    """[{g: group label ('' / Рядовое / Прп. ...), s: service, refs:[(book,cv,z)]}] in order"""
    out = []; group = ''; service = ''
    for sg in AZ[iso]['segs']:
        lab = re.sub(r'\s+', ' ', sg['label'].replace('class="readings-text">', '')).strip()
        lab = re.sub(r'\(\s*\d+\s*зач[^)]*\)', '', lab).strip()
        sv = None
        for m in SERV_RE.finditer(lab):
            t = m.group(0)
            for w, code in SERV_CODE:
                if w in t: sv = code; break
        lead_ap = re.match(r'^(Ап|Апп)\s*\.?\s*:\s*(Утр|Лит)', lab)
        g = SERV_RE.sub(' ', lab)
        g = re.sub(r'(?:^|\s)(Ап|Ев)\s*\.?\s*:', ' ', g)
        if lead_ap: g = 'Ап'
        g = re.sub(r'\s+', ' ', g).strip(' :–-.,')
        if re.search(r'^Если|а на литургии|читается|чтения', g): g = 'saint:' + g[:40]
        if g: group = g
        if sv: service = sv
        for b, cv, z in sg['refs']:
            if out and out[-1]['g'] == group and out[-1]['s'] == service:
                out[-1]['refs'].append((b, cv, z))
            else:
                out.append({'g': group, 's': service, 'refs': [(b, cv, z)]})
    return out
