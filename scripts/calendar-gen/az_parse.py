import json, re, html
def tokens(rd):
    s = rd
    s = re.sub(r'<i class="inline-player[^>]*></i>', '', s)
    s = re.sub(r'<a class="bibref" href="https://azbyka.ru/biblia/\?([^"]+)"[^>]*>.*?</a>', lambda m: ' \x01'+html.unescape(m.group(1))+'\x02 ', s, flags=re.S)
    s = re.sub(r'<br\s*/?>|</p>', ' \x03 ', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s)
    s = re.sub(r'[ \t\r\n]+', ' ', s)
    return s.strip()
REF = re.compile(r'\x01([^\x02]+)\x02\s*(?:\(\s*(?:зач\.?\s*([^)]*)|(\d+)\s*зач[^)]*)\))?')
def segments(rd):
    s = tokens(rd)
    out = []; pos = 0; label = ''
    cur = None
    for m in REF.finditer(s):
        txt = s[pos:m.start()]
        pos = m.end()
        t = txt.replace('\x03',' ').strip(' .;,')
        if t:
            cur = {'label': t, 'refs': []}; out.append(cur)
        elif cur is None:
            cur = {'label': '', 'refs': []}; out.append(cur)
        ref = m.group(1)
        mm = re.match(r'([0-9]?[A-Za-z]+)\.(.+)', ref)
        book, cv = (mm.group(1), mm.group(2)) if mm else (ref, '')
        cur['refs'].append([book, cv, (m.group(2) or m.group(3) or '').strip()])
    tail = s[pos:].replace('\x03',' ').strip(' .;,')
    return out, tail
if __name__ == '__main__':
    rows = [json.loads(l) for l in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'az.jsonl'))]
    res = {}
    for r in rows:
        segs, tail = segments(r['r'])
        res[r['date']] = {'desc': r['desc'], 'glas': r['glas'], 'segs': segs, 'tail': tail}
    json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'az.json'), 'w'), ensure_ascii=False)
    import collections
    c = collections.Counter(sg['label'] for v in res.values() for sg in v['segs'])
    for k,n in c.most_common(60): print(n, repr(k))
