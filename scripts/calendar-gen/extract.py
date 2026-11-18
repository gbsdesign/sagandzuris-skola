"""O26 day -> fixed part and movable part."""
import re, sys, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import O26, flat, o_keys, BOOKS_RE
from units import (chars_of, runs_of, text_of, split_day, split_units, join_units, is_movable_text, star_counts, strip, BOLD)
from cycle import pascha, D, TD
from azg import groups as az_groups
from common import zkey, M, GEO2AZ
MREF = re.compile(r'(' + BOOKS_RE + r')\.?\s*(\d+)\s*დას')
def m_keys(iso):
    x = M.get(iso)
    if not x: return set()
    out = set()
    for line in x.get('k', []):
        for m in MREF.finditer(line):
            k = zkey(GEO2AZ[m.group(1)], m.group(2))
            if k: out.add(k)
    return out
P25 = pascha(2025)
def m25_old(iso):
    o = D.fromisoformat(iso) - TD(days=13)
    return (D(2025, o.month, o.day) + TD(days=13)).isoformat()
def m25_k(iso):
    return (P25 + TD(days=k26(iso))).isoformat()
from cycle import pascha, D, TD
P26 = pascha(2026)
def k26(iso): return (D.fromisoformat(iso) - P26).days
# O26 days that hold special (non-Paschal) movable days
SPECIAL_26 = {
    '2026-01-17': 'sat_before_theophany', '2026-01-18': 'sun_before_theophany', '2026-01-24': 'sat_after_theophany',
    '2026-01-25': 'sun_after_theophany', '2026-07-26': 'fathers_4', '2026-09-20': 'sun_before_elevation',
    '2026-09-26': 'sat_before_elevation', '2026-10-03': 'sat_after_elevation', '2026-10-04': 'sun_after_elevation',
    '2026-10-25': 'fathers_7', '2026-11-07': 'dimitri_sat', '2026-12-27': 'forefathers', '2027-01-02': 'sat_before_nativity',
    '2027-01-03': 'sun_before_nativity', '2027-01-09': 'sat_after_nativity', '2027-01-10': 'sun_after_nativity',
}
KRANGE = (-70, 63)
FIXED_GREAT = {(1,1),(1,6),(2,2),(3,25),(8,6),(8,15),(9,8),(9,14),(11,21),(12,25)}
MOV_GROUP = re.compile(r'^(Ряд|За |и за|Недели|Субботы|Святых отец|Богоотец|За упокой|Час)')
def az_split(iso):
    x = D.fromisoformat(iso); o = x - TD(days=13)
    great = (o.month, o.day) in FIXED_GREAT
    mk, fk = set(), set()
    for g in az_groups(iso):
        for b, cv, z in g['refs']:
            k = zkey(b, z)
            if not k: continue
            if (g['g'] == '' and not great) or MOV_GROUP.match(g['g']) or 'зачало' in g['g']: mk.add(k)
            else: fk.add(k)
    return mk, fk
def in_k(iso): return KRANGE[0] <= k26(iso) <= KRANGE[1]
# units the vocabulary misses or gets wrong, by O26 day
FORCE_MOV = {
    '2026-04-05': [r'დიდებით შესვლა იერუსალიმ'],
    '2026-05-20': [r'წარგზავნა აღდგომის'],
    '2026-05-28': [r'დავით გარეჯელისა და მოწაფისა'],
    '2026-04-14': [r'დავითგარეჯის უდაბნოში მოწყვედილთა'],
    '2027-01-03': [r'.'],   # the righteous fathers' list: handled by FIRST_FIXED
}
FORCE_FIX = {
    '2026-04-02': [r'ფოტინე სამარიტელ'], '2026-06-04': [r'მეორე მსოფლიო კრების'], '2026-06-11': [r'I მსოფლიო კრების'],
    '2026-06-17': [r'მართასი და მარიამისი'], '2026-07-24': [r'ეფემია'], '2026-01-17': [r'კრება წმიდათა 70-თა'],
    '2027-01-03': [], '2026-12-27': [], '2026-06-07': [r'მესამედ პოვნა'],
}
# units to leave out of the fixed part altogether (copies of saints kept on their own fixed day)
DROP_FIXED = {'2026-05-28': [r'დამიანესი', r'იოანე I-ისა']}
# 2027-01-03: the paragraph's units up to Elisabeth are the movable list
FIRST_FIXED = {'2027-01-03': r'ანტონ II'}
def unit_is_movable(iso, t, starred, idx_info=None):
    for pat in FORCE_FIX.get(iso, []):
        if re.search(pat, t): return False
    for pat in FORCE_MOV.get(iso, []):
        if pat != '.' and re.search(pat, t): return True
    return is_movable_text(t, starred)
def body_paras(body):
    """[(para runs, is_note)] — a note starts with * or შენიშვნა; what follows a note is a note too"""
    out = []; in_notes = False
    for p in body:
        if not p: out.append((p, None)); continue
        t = flat(p).strip()
        if re.match(r'^(\*|შენიშვნა)', t): in_notes = True
        out.append((p, in_notes))
    return out
def split_lines(p):
    """a paragraph -> its lines as runs"""
    lines = [[]]
    for ch, f in chars_of(p):
        if ch == '\n': lines.append([]); continue
        lines[-1].append((ch, f))
    return [strip(l) for l in lines if text_of(l).strip()]
LENT_OT = re.compile(r'^(ორშ\. )?VI ჟამ|^მწუხრზე|ლიტ\. მწუხრზე')
JOINED = re.compile(r'ზედმობმით|-\s*(ორშ|სამშ|ოთხშ|ხუთშ|პარ|შაბ)\.')
def label_of(t):
    m = re.match(r'^\s*([^:\d]{1,45}?)\s*:', t)
    return m.group(1).strip() if m else ''
def reading_class(iso, t, mk, fk):
    lab = label_of(t)
    keys = set(o_keys(t))
    k = k26(iso)
    if lab.startswith('რიგ') or re.search(r'(^|[\s.:])რიგ', lab) or JOINED.search(t): return 'mov'
    if lab.startswith('ცისკ') and 'სახ.' in t: return 'mov'
    if re.search(r'შაბათისა|კვირიაკისა', lab) and ('ნათლისღ' in lab or 'ჯვრ' in lab or 'შობ' in lab): return 'mov'
    if LENT_OT.search(t.strip()) and in_k(iso): return 'mov'
    if re.match(r'^(მიცვ|დიდი სამშაბათის|დიდი ორშაბათის|დიდი ოთხშაბათის|შედგენილი)', lab or t.strip()): return 'mov'
    if in_k(iso) and re.match(r'^([IVX]+ ჟამზე|\d\))', lab or t.strip()): return 'mov'
    if iso in SPECIAL_26 and re.search(r'მამათა', lab): return 'mov'
    if in_k(iso) and k in (-14, 45) and lab.startswith('ღირ'): return 'mov'
    if in_k(iso) and -6 <= k <= 0: return 'fix' if ('ხარებ' in lab or 'ხარებ' in t[:30]) else 'mov'
    if in_k(iso) and re.search(r'განზოგ|ამაღლებ|სულთმოფ|სულიწმიდ|მამათა|სწორთა|დოდო|ღმრთისმშობ', lab) and k not in (52,):
        return 'mov' if k in (-15, 2, 5, 24, 39, 42, 45, 49, 56) or 'განზოგ' in lab or 'ამაღლებ' in lab else 'fix'
    generic = lab == '' or re.match(r'^(ლიტ|ცისკ|მწუხრ)\.?$', lab)
    if in_k(iso) and lab.startswith('მწუხრ') and k in (-1, 24, 39, 49, 56) and not re.search(r'დიდმოწ|მოციქულ', lab): return 'mov'
    if in_k(iso) and lab.startswith('ცისკ') and k in (2, 5, 45, 46, -15): return 'mov'
    if in_k(iso) and generic and keys and not (keys <= m_keys(m25_old(iso))): return 'mov'
    if keys and not generic and in_k(iso):
        fk25, mk25 = m_keys(m25_old(iso)), m_keys(m25_k(iso))
        if keys <= fk25 and not keys <= mk25: return 'fix'
        if keys <= mk25 and not keys <= fk25: return 'mov'
        return 'fix?'
    if keys:
        if not generic: return 'fix'
        if keys <= mk and not (keys & fk): return 'mov'
        if keys & mk and not (keys & fk): return 'mov'
        return 'fix'
    # Old Testament lines without zachalo
    if in_k(iso) and -48 <= k <= -1 and not re.search(r'მწუხრ\.\s*:\s*\S+\s*:', t): return 'mov'
    return 'fix'
def is_reading(t):
    return bool(re.search(r'(' + BOOKS_RE + r')\s*[.:·]?\s*\d+\s*[:;.,]\s*\d', t))
FIXED_LINE = re.compile(r'საზიაროთაგან|მიძინ|მარიამობ|ქრისტეშობ|ქრისტესშობ|შობის|ნათლისღ|აიაზმ|დიდნი ჟამნი|მიგებ|ხარებ|ფერისცვალ|ამაღლება ჯვრ|ჯვრის ამაღლ')
MOV_LINE = re.compile(r'დიდი მარხვ|დიდმარხვ|ყველიერ|ხორცის აკრებ|ხორცთა აკრებ|პეტრე-?პავლ|მოციქულთა მარხვ|მიცვალებულთა ხსენება|მსგეფსი|ვნების|აღდგომ|ზატიკ|ერგას|სულთმოფენ|სულიწმიდ|მუხლთმოდრეკ|ამაღლებ|განზოგ')
def other_class(iso, t, star_cls):
    if FIXED_LINE.search(t) and not MOV_LINE.search(t): return 'fix'
    if MOV_LINE.search(t) and not FIXED_LINE.search(t): return 'mov'
    if iso in SPECIAL_26 and re.search(r'მიცვალებულთა ხსენება', t): return 'mov'
    return 'mov' if in_k(iso) else 'fix'
def analyse(iso):
    """the whole O26 day, every piece tagged 'fix' or 'mov' (or 'drop')"""
    comm, body = split_day(iso)
    bp = body_paras(body)
    starred = {}
    for p, note in bp:
        if note:
            m = re.match(r'^\s*(\*+)', flat(p))
            if m: starred.setdefault(len(m.group(1)), []).append(p)
    mk, fk = az_split(iso)
    out = {'iso': iso, 'k': k26(iso), 'comm': [], 'lines': [], 'notes': [], 'title': O26[iso]['t']}
    # commemorations: paragraphs of units
    first_fixed = FIRST_FIXED.get(iso)
    for pi, p in enumerate(comm):
        units = split_units(p)
        tagged = []
        seen_first_fixed = False
        for u in units:
            t = text_of(u['c'])
            if any(re.search(pat, t) for pat in DROP_FIXED.get(iso, [])): cls = 'drop'
            elif first_fixed and pi == 1:
                if re.search(first_fixed, t): seen_first_fixed = True
                cls = 'fix' if seen_first_fixed else 'mov'
            elif first_fixed and pi == 0:
                cls = 'mov' if re.search(r'კვირიაკე', t) else 'fix'
            else:
                cls = 'mov' if unit_is_movable(iso, t, starred) else 'fix'
            tagged.append((cls, u))
        out['comm'].append(tagged)
    # body lines
    for pi, (p, note) in enumerate(bp):
        if not p: continue
        if note:
            out['notes'].append({'p': p, 'stars': (lambda m: len(m.group(1)) if m else 0)(re.match(r'^\s*(\*+)', flat(p))), 'text': flat(p)})
            continue
        for line in split_lines(p):
            t = text_of(line)
            if is_reading(t): cls = reading_class(iso, t, mk, fk); kind = 'reading'
            elif re.match(r'^\s*ლიტურგია', t) or 'ლიტურგია არ' in t:
                kind = 'liturgy'; cls = other_class(iso, t, None)
            else:
                kind = 'other'; cls = other_class(iso, t, None)
            out['lines'].append({'kind': kind, 'cls': cls, 'c': line, 'text': t})
    # notes follow the pieces that carry their stars
    bearers = {}
    for n in set(star_counts(O26[iso]['t'])):
        bearers.setdefault(n, []).append('mov' if in_k(iso) and iso != '2026-01-14' else 'fix')
    for para in out['comm']:
        for cls, u in para:
            for n in set(star_counts(text_of(u['c']))): bearers.setdefault(n, []).append(cls)
    for l in out['lines']:
        for n in set(star_counts(l['text'])): bearers.setdefault(n, []).append(l['cls'])
    for nt in out['notes']:
        b = bearers.get(nt['stars']) if nt['stars'] else None
        if b: nt['cls'] = 'mov' if all(x == 'mov' for x in b) else ('drop' if all(x == 'drop' for x in b) else 'fix')
        else: nt['cls'] = 'mov' if in_k(iso) else 'fix'
        if 'გარდამავალ' in nt['text']: nt['cls'] = 'mov'
        if re.search(r'ცხრილის შენიშვნა|^\W*\**\s*იხილეთ \d+ \S+ შენიშვნა', nt['text']): nt['cls'] = 'drop'
    return out
