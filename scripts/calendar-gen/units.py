"""Splitting O26 days into units (commemorations, body lines, notes) and telling movable from fixed."""
import re, sys, datetime
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from common import O26, flat
from cycle import pascha
D = datetime.date; TD = datetime.timedelta
P26 = pascha(2026)
BOLD, RED, SMALL = 1, 2, 4
def k26(iso): return (D.fromisoformat(iso) - P26).days
def chars_of(p):
    return [(ch, (r[1] if len(r) > 1 else 0)) for r in p for ch in r[0]]
def runs_of(chars):
    out = []
    for ch, f in chars:
        if out and out[-1][1] == f: out[-1][0] += ch
        else: out.append([ch, f])
    return [[t, f] if f else [t] for t, f in out]
def text_of(chars): return ''.join(c for c, _ in chars)
def split_day(iso):
    ps = O26[iso]['p']
    i = next((j for j, p in enumerate(ps) if not p), len(ps))
    return ps[:i], ps[i:]
STAR = re.compile(r'\*+')
def star_counts(text):
    return [len(m) for m in STAR.findall(text)]
def notes_of(body):
    """{stars: note text} for '*' notes; and unstarred notes list"""
    starred, plain = {}, []
    for p in body:
        if not p: continue
        t = flat(p).strip()
        m = re.match(r'^(\*+)', t)
        if m: starred.setdefault(len(m.group(1)), []).append(p)
        elif t.startswith('შენიშვნა'): plain.append(p)
    return starred, plain
def split_units(p):
    """a commemoration paragraph → units [{c: chars, sep}]"""
    chars = chars_of(p)
    units = []
    # strip leading spaces
    k = 0
    while k < len(chars) and chars[k][0].isspace(): k += 1
    chars = chars[k:]
    # a bold head ending with '.' : its sentences are units
    if chars and chars[0][1] & BOLD:
        e = 0
        while e < len(chars) and (chars[e][1] & BOLD or chars[e][0].isspace()): e += 1
        head = text_of(chars[:e]).rstrip()
        rest = text_of(chars[e:]).strip()
        if head.endswith('.') and not re.match(r'^[(*]', rest):
            buf = []
            for i, (ch, f) in enumerate(chars[:e]):
                buf.append((ch, f))
                nxt = chars[i + 1][0] if i + 1 < e else ' '
                if ch == '.' and (nxt.isspace()) and not re.search(r'(წმ|ღირ|მოწ|ეპ|დაახ|სს|წ|ს)\.$', text_of(buf)[-6:]):
                    units.append({'c': strip(buf[:-1]), 'sep': '.'}); buf = []
            if text_of(buf).strip(): units.append({'c': strip(buf), 'sep': ''})
            chars = chars[e:]
    depth = 0; buf = []
    for i, (ch, f) in enumerate(chars):
        if ch == '(': depth += 1
        if ch == ')': depth = max(0, depth - 1)
        if ch == ';' and depth == 0:
            units.append({'c': strip(buf), 'sep': ';'}); buf = []; continue
        buf.append((ch, f))
        if ch == '.' and depth == 0 and i > 0 and chars[i - 1][0] in ')*' and (i + 1 >= len(chars) or chars[i + 1][0].isspace()):
            units.append({'c': strip(buf[:-1]), 'sep': '.'}); buf = []
    if text_of(buf).strip():
        t = text_of(buf).rstrip()
        sep = ''
        if t.endswith('.'):
            # drop the final '.'
            n = len(buf)
            while n and buf[n - 1][0].isspace(): n -= 1
            buf = buf[:n - 1]; sep = '.'
        units.append({'c': strip(buf), 'sep': sep})
    return [u for u in units if text_of(u['c']).strip()]
def strip(chars):
    a, b = 0, len(chars)
    while a < b and chars[a][0].isspace(): a += 1
    while b > a and chars[b - 1][0].isspace(): b -= 1
    return chars[a:b]
def join_units(units):
    """units → one paragraph of runs; the last ends with '.'"""
    out = []
    for i, u in enumerate(units):
        if i: out.append((' ', 0))
        out.extend(u['c'])
        sep = u['sep'] if i < len(units) - 1 else '.'
        if sep == '' and i < len(units) - 1: sep = ';'
        if sep and not text_of(u['c']).rstrip().endswith(('.', ';')): out.append((sep, 0))
        elif i == len(units) - 1 and not text_of(u['c']).rstrip().endswith('.'): out.append(('.', 0))
    return runs_of(out)
# ------------- movable vocabulary -------------
MOV = [
    r'აღდგომა უფლისა', r'ბრწყინვალე აღდგომ', r'აღდგომის დღესასწაულის წარგზავნა', r'აღდგომის წარგზავნა', r'ბზობ', r'ლაზარეს მკვდრეთით',
    r'საიდუმლო სერობ', r'მაცხოვნებელთა ვნებ', r'ერგას', r'ამაღლებ(?!ა? ?პატიოსნ)', r'სულიწმიდის მოფენ', r'სულიწმიდის მოსვლ',
    r'სულთმოფენობ', r'მარტვილია', r'მენელსაცხებლე', r'განრღვეულ', r'სამარიტელ', r'ბრმის', r'თომას კვირ', r'კვირაცხოვლობ',
    r'ანტიპასქ', r'განზოგება დიდი მარხვ', r'ადამის განდევნ', r'ყოველთა ღირსთა მამათა და დედათა', r'კრება ყოველთა წმიდათა',
    r'ათონის წმიდა მთაზე განბრწყინვებულთა', r'წმიდათა რუსეთს განბრწყინვებულთა', r'მართლმადიდებლობ', r'წინა შაბათი',
    r'შემდგომი შაბათი', r'წინა კვირიაკე', r'შემდგომი კვირიაკე', r'მამამთავართა კვირიაკე', r'მიცვალებულთა ხსენება',
    r'ცხოვრების წყარო', r'ცხოველსმყოფელი წყარო', r'წყარო ცხოვრებ', r'ქებაჲ და დიდებაჲ ქართულისა ენისაჲ',
    r'სამოციქულო მართლმადიდებელი ეკლესიის უძველესი ავტოკეფალ', r'IV მსოფლიო კრება', r'VII მსოფლიო კრება', r'დიმიტრის შაბათ',
    r'სულის შაბათ', r'თევდორობა', r'შვიდთა მსოფლიო კრების', r'მსოფლიო კრების წმიდათა მამათა'
]
MOV_RE = re.compile('|'.join(MOV))
NOT_MOV_RE = re.compile(r'ტაძრის განახლება|ჯვრის ამაღლ|ჯვარის ამაღლ|ამაღლება პატიოსნ|VI მსოფლიო კრებაზე')
def is_movable_text(t, notes_by_star):
    s = re.sub(r'\s+', ' ', t)
    for n in set(star_counts(s)):
        for p in notes_by_star.get(n, []):
            if 'გარდამავალ' in flat(p): return True
    if NOT_MOV_RE.search(s) and not re.search(r'წინა შაბათი|შემდგომი შაბათი|წინა კვირიაკე|შემდგომი კვირიაკე', s):
        return False
    return bool(MOV_RE.search(s))
