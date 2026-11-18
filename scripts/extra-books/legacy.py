import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
import sys, re, collections, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'wignebi'))
import pymupdf
from convert import convert_legacy, uni_old_to_mkhedruli
GEO = re.compile('[Ⴀ-ჿⴀ-⴯Ა-Ჿ]')
LAT = re.compile('[A-Za-z]')
L1 = re.compile('[À-ÿ]')
SCANS = {1, 2, 3, 25, 31, 46, 52, 53, 54, 57}

def mtavruli_low(s):
    return ''.join(chr(ord(c) - 0x1C90 + 0x10D0) if 0x1C90 <= ord(c) <= 0x1CBA else c for c in s)

def dropped(s, shifted):
    out = []
    for c in s:
        o = ord(c)
        if 0xC0 <= o <= 0xFF:
            if shifted and o >= 0xF0: o -= 0x10
            out.append(chr(o + 0x1000) if o >= 0xD0 else c)
        else:
            out.append(c)
    return ''.join(out)

RUN = re.compile(r'([A-Za-z\u00c0-\u00ff][A-Za-z\u00c0-\u00ff0-9~`!@^&\[\]=_]*)')
ROMAN = re.compile(r'^[IVXLC]+$')
def legacy_runs(t, font):
    art = 'artanuji' in font.lower()
    def rep(m):
        r = m.group(1)
        if ROMAN.match(r): return r
        if art: r = r.replace('Y', 'ჲ').replace('Q', 'ჴ')
        r = r.replace('Ã', 'ჴ')
        return convert_legacy(r)
    return uni_old_to_mkhedruli(mtavruli_low(RUN.sub(rep, t)))

def run(n):
    doc = pymupdf.open(os.path.join(WORK, 'up', f'b{n:02d}.pdf'))
    # font-level: dropped-byte fonts and whether shifted (no chars in E0-EF)
    l1 = collections.Counter(); mid = collections.Counter(); xuc = set()
    pages = [pg.get_text('dict') for pg in doc]
    for d in pages:
        for b in d['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    f = s['font']; t = s['text']
                    if 'xuc' in f.lower(): xuc.add(f)
                    for c in t:
                        if 0xC0 <= ord(c) <= 0xFF: l1[f] += 1
                        if 0xE0 <= ord(c) <= 0xEF: mid[f] += 1
    shifted = {f for f in l1 if l1[f] > 5 and mid[f] < 0.03 * l1[f]}
    out = []
    for pi, d in enumerate(pages, 1):
        out.append(f'=== p {pi} ===')
        for b in d['blocks']:
            lines = []
            for l in b.get('lines', []):
                parts = []
                for s in l['spans']:
                    t = s['text']; f = s['font']
                    if not t.strip(): parts.append(t); continue
                    if f not in xuc and l1[f] > 5 and len(L1.findall(t)) >= 1 and not LAT.search(t.replace('I','').replace('V','').replace('X','')):
                        parts.append(uni_old_to_mkhedruli(dropped(t, f in shifted)))
                    elif LAT.search(t) or L1.search(t):
                        parts.append(legacy_runs(t, f))
                    else:
                        parts.append(uni_old_to_mkhedruli(mtavruli_low(t)))
                lines.append(''.join(parts))
            txt = ' '.join(x.strip() for x in lines if x.strip())
            if txt: out.append(txt)
    open(os.path.join(WORK, 'text', f'b{n:02d}.txt'), 'w', encoding='utf-8').write('\n'.join(out))

if __name__ == '__main__':
    for n in range(1, 63):
        if n in SCANS: continue
        try: run(n)
        except Exception as e: print(n, 'ERR', e)
