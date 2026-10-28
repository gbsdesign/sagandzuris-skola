"""The app's old texts are typed for its legacy nuskhuri font (AcadNusx-style Latin keys + its own abbreviation
codes); this turns them into ordinary Unicode Georgian. convert_table.json is the app's own replacement table
(taken from its converter function); archaic letters are kept as they are in the source."""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
BLK = json.load(open(os.path.join(HERE, 'convert_table.json')))
GEO = re.compile('[ა-ჿ]'); LAT = re.compile('[A-Za-z]')

# 1) abbreviation expansions (app order), minus single digits / letter mappings handled separately
ABBR=[]; SPECIAL={}; LATIN={}
phase='abbr'
for kind,a,b in BLK:
    if a in ('8','6'): continue
    if len(a)==1 and ('Ⴀ'<=a<='ჿ' or 'ⴀ'<=a<='⴯'):
        continue                        # Unicode Nuskhuri/Asomtavruli and modernisation rules: handled below
    if a=='Ⴠoi': continue
    if len(a)==1 and a.isascii() and a.isalpha():
        if a in ('A',): SPECIAL[a]=b
        else: LATIN[a]=b
        continue
    if len(a)==1 and not a.isascii():
        SPECIAL[a]=b; continue
    if a=='H': continue
    ABBR.append((a,b))
# keep archaic letters (faithful to source) instead of the app's modernised display forms
LATIN.update({'I':'ჲ','V':'ჳ','X':'ჴ','H':'ჵ'})
SPECIAL.update({'×':'ჴ','Ì':'ჳ','Ð':'ჵ'})
ABBR = [(a, b[:-1]+'ჲ' if a.endswith('I') and b.endswith('ი') else b) for a,b in ABBR]

def uni_old_to_mkhedruli(s):
    out=[]
    for ch in s:
        o=ord(ch)
        if 0x10A0<=o<=0x10C5: out.append(chr(o-0x10A0+0x10D0))
        elif 0x2D00<=o<=0x2D25: out.append(chr(o-0x2D00+0x10D0))
        else: out.append(ch)
    return ''.join(out)

ENCLITIC = ('ესე', 'ეგე', 'იგი', 'რა', 'მე', 'ღა', 'ცა', 'მცა', 'თუმცა', 'ვე', 'ძი', 'მცა')
def _join(m):
    nxt = m.group(2)
    word = re.match(r'[ა-ჿA-Za-z~!@0-9\[\]^&]+', nxt)
    w = word.group(0) if word else ''
    for e in ENCLITIC:
        if w == e or (w.startswith(e) and len(w) <= len(e)+1):
            return m.group(1) + '-' + nxt
    return m.group(1) + nxt

def fix_hyphens(s):
    s = re.sub(r'(\S)_ (\S+)', _join, s)       # line-break hyphen: join (keep hyphen before enclitics)
    s = re.sub(r'(?<=\S)_(?=\S)', '-', s)      # compound word
    s = s.replace('_', '')
    return s

def fix_hyphens_unicode(s):
    # line-break artefacts inside words: "და- ვიმარხნე" -> "დავიმარხნე" (the app joins these too)
    return re.sub(r'([ა-ჿ])- ([ა-ჿ]\S*)', _join, s)

SPACED = re.compile(r'(?<![ა-ჿA-Za-z])((?:[ა-ჿ] +){3,}[ა-ჿ])(?![ა-ჿA-Za-z])')
def collapse_spaced(s):
    # decorative letter-spaced headings ("ო რ შ ა ბ ა თ ს ა") -> one word; long runs span several
    # words whose boundaries are lost, so those are left as they are
    def rep(m):
        run = m.group(1); n = len(run.replace(' ', ''))
        return run.replace(' ', '') if n <= 12 else run
    return SPACED.sub(rep, s)

NONROMAN = re.compile('[A-Za-z]')
def is_legacy(s):
    l=len([c for c in NONROMAN.findall(s) if c not in 'IVXLCDM']); g=len(GEO.findall(s))
    return (l>=2 and l>g) or (g==0 and any(c in s for c in SPECIAL))

def convert_legacy(s, extra=()):
    s = fix_hyphens(s)
    for a,b in extra: s = s.replace(a,b)     # a book's own abbreviation codes first (ზატიკი: zatiki_table.json)
    for a,b in ABBR: s = s.replace(a,b)
    s = re.sub(r'(?<=[A-Za-zა-ჿ])8|8(?=[A-Za-z])', 'ი', s)
    s = re.sub(r'(?<=[A-Za-zა-ჿ])6|6(?=[A-Za-z])', 'დ', s)
    s = uni_old_to_mkhedruli(s)
    s = ''.join(SPECIAL.get(c, c) for c in s)
    # stand-alone Roman numerals ("II დიაკონი", "გალობა VII") stay Latin
    parts = re.split(r'(?<![A-Za-z\u10d0-\u10ff])([IVXLC]{2,}|I)(?![A-Za-z\u10d0-\u10ff])', s)
    s = ''.join(p if i % 2 else ''.join(LATIN.get(c, c) for c in p) for i, p in enumerate(parts))
    s = collapse_spaced(s)
    s = s.replace('ხოთშაბათ', 'ხუთშაბათ')   # drop-cap font has no separate capital უ
    s = re.sub(r' +([,.;:!?])', r'\1', s)
    s = re.sub(r'  +', ' ', s)
    return s.strip()

def convert(s, extra=()):
    if not isinstance(s,str): return s
    if is_legacy(s): return convert_legacy(s, extra)
    return fix_hyphens_unicode(uni_old_to_mkhedruli(s)) if (GEO.search(s) or re.search('[Ⴀ-Ⴥⴀ-ⴥ]', s)) else s
