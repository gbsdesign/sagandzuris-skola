"""Builds src/data/churches.json for „ეკლესია-მონასტრები“ (pages/ChurchesPage.tsx). Plain Python, no packages.

    python3 scripts/churches/build.py <toc buildings .xlsx> <wikidata .json> [<wikidata .json> ...]

Sources (see the README beside this file for how to download them):
• the list — „ეკლესიის ტერიტორიულობა“ (Indigo, https://toc.ge/map/ka, data of 2021): every church and monastery in
  Georgia outside the occupied lands, its municipality, village, place on the map, kind (ეკლესია · მონასტერი · უფუნქციო)
  and when it was built. The sheet's „განედი“ column holds the longitude and „გრძედი“ the latitude — swapped here.
• photos, Wikipedia links and one-line descriptions — Wikidata items in Georgia with a Georgian label (two queries in
  the README), joined to a church when they stand close and their names share a word.
The region is the songs map's (data/songsData.ts FOLK_REGIONS): municipalities as in scripts/etnofori/places.py.
"""
import json
import math
import re
import sys
import zipfile
import zlib
from urllib.parse import unquote
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / 'src' / 'data' / 'churches.json'

# municipality stem -> the songs map's region (Lentekhi with Svaneti, as in scripts/etnofori/places.py)
REGION_OF = {
    'kalakuri': ['თბილის', 'გლდან', 'დიდუბ', 'ვაკ', 'ისნ', 'კრწანის', 'მთაწმინდ', 'ნაძალადევ', 'საბურთალ', 'სამგორ', 'ჩუღურეთ'],
    'guria': ['ოზურგეთ', 'ლანჩხუთ', 'ჩოხატაურ'],
    'kakheti': ['თელავ', 'ახმეტ', 'ყვარლ', 'საგარეჯ', 'სიღნაღ', 'დედოფლისწყარ', 'გურჯაან', 'ლაგოდეხ'],
    'achara': ['შუახევ', 'ქედ', 'ბათუმ', 'ხულ', 'ქობულეთ', 'ხელვაჩაურ'],
    'samegrelo': ['ზუგდიდ', 'სენაკ', 'აბაშ', 'წალენჯიხ', 'ფოთ', 'მარტვილ', 'ჩხოროწყ', 'ხობ'],
    'svaneti': ['ლენტეხ', 'მესტი'],
    'imereti': ['ქუთაის', 'ვან', 'წყალტუბ', 'ზესტაფონ', 'საჩხერ', 'ხარაგაულ', 'თერჯოლ', 'ტყიბულ', 'ბაღდათ', 'ჭიათურ',
                'სამტრედი', 'ხონ'],
    'mtianeti': ['ყაზბეგ', 'დუშეთ', 'მცხეთ', 'თიანეთ'],
    'samtskhe': ['ბორჯომ', 'ახალციხ', 'ადიგენ', 'ასპინძ', 'ახალქალაქ', 'ნინოწმინდ'],
    'kvemokartli': ['გარდაბ', 'ბოლნის', 'წალკ', 'თეთრიწყარ', 'რუსთავ', 'მარნეულ', 'დმანის'],
    'shidakartli': ['კასპ', 'გორ', 'ქარელ', 'ხაშურ'],
    'racha': ['ონ', 'ამბროლაურ', 'ცაგერ'],
}
KINDS = {'ეკლესია': 'c', 'მონასტერი': 'm', 'უფუნქციო': 'x'}
# words every church name has — they say nothing about which church it is
# a saint's or a feast's name: shared by many churches, so it joins a photo only when the two stand very close
SAINTS = {w[:5] for w in '''გიორგის გიორგი ნინოს ნინო ღვთისმშობლის ღვთისმშობელი მარიამის მთავარანგელოზის მთავარანგელოზთა ნიკოლოზის
იოანე იოანეს ნათლისმცემლის ელიას ილია ილიას თამარის თამარ დავითის დავით ბარბარეს ქეთევანის მიქაელ გაბრიელ სამების სამება
მიძინების შობის ამაღლების ფერისცვალების კვირაცხოვლის ყოვლადწმიდა მარინეს პეტრე პავლე ანდრია დიმიტრის'''.split()}
COMMON = set('''ეკლესია ეკლესიის ეკლესიები მონასტერი მონასტრის მონასტრები სამონასტრო კომპლექსი კომპლექსის ტაძარი ტაძრის
საკათედრო სახელობის სახ წმინდა წმიდა წმ დედათა მამათა ნანგრევები ნაეკლესიარი სოფელი სოფლის სოფ და the of church monastery'''.split())


def read_xlsx(path):
    """the first sheet's rows as lists of cell values (strings and numbers), without any package"""
    ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    with zipfile.ZipFile(path) as z:
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', ns):
                shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % ns['m'])))
        sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = []
    for row in sheet.iter('{%s}row' % ns['m']):
        cells = {}
        for c in row.findall('m:c', ns):
            col = re.match(r'[A-Z]+', c.get('r')).group(0)
            idx = 0
            for ch in col:
                idx = idx * 26 + ord(ch) - 64
            v = c.find('m:v', ns)
            if c.get('t') == 'inlineStr':
                val = ''.join(t.text or '' for t in c.iter('{%s}t' % ns['m']))
            elif v is None:
                val = None
            elif c.get('t') == 's':
                val = shared[int(v.text)]
            else:
                f = float(v.text)
                val = int(f) if f.is_integer() else f
            cells[idx - 1] = val
        if cells:
            rows.append([cells.get(i) for i in range(max(cells) + 1)])
    return rows


def region_of(mun):
    name = mun.replace('ქ. ', '').strip()
    best = None
    for rid, stems in REGION_OF.items():
        for s in stems:
            if name.startswith(s) and (best is None or len(s) > len(best[1])):
                best = (rid, s)
    if not best:
        raise SystemExit(f'no region for municipality „{mun}“ — add it to REGION_OF')
    return best[0]


def roman(n):
    out = ''
    for v, s in ((10, 'X'), (9, 'IX'), (5, 'V'), (4, 'IV'), (1, 'I')):
        while n >= v:
            out += s
            n -= v
    return out


def built_text(value, unit):
    if not isinstance(value, (int, float)):
        return ''
    value = int(value)
    if unit == 'c' and 1 <= value <= 21:
        return f'{roman(value)} ს.'
    if unit == 'y' and 300 <= value <= 2030:
        return str(value)
    return ''


def dist_m(a, b):
    """metres between two (lat, lng) points"""
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def stems(text):
    words = re.findall(r'[ა-ჰ]+', (text or '').lower())
    return {w[:5] for w in words if w not in COMMON and len(w) >= 4}


def load_wikidata(paths):
    items = {}
    for p in paths:
        for b in json.loads(Path(p).read_text(encoding='utf-8'))['results']['bindings']:
            uri = b['item']['value']
            m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', b.get('coord', {}).get('value', ''))
            if not m:
                continue
            it = items.setdefault(uri, {'pt': (float(m.group(2)), float(m.group(1))), 'label': '', 'img': '', 'wiki': '', 'desc': ''})
            if b.get('lab') and not it['label']:
                it['label'] = b['lab']['value']
            if b.get('img') and not it['img']:
                it['img'] = unquote(b['img']['value'].rsplit('/', 1)[-1])
            if b.get('kawiki') and not it['wiki']:
                it['wiki'] = unquote(b['kawiki']['value'].rsplit('/', 1)[-1])
            if b.get('desc') and not it['desc']:
                it['desc'] = b['desc']['value']
    return [it for it in items.values() if it['img'] or it['wiki']]


def main(xlsx, wd_paths):
    rows = read_xlsx(xlsx)
    head = rows[0]
    assert head[:9] == ['რაიონი', 'მისამართი', 'დასახელება', 'შენიშვნა', 'განედი', 'გრძედი', 'ნაგებობის ფუნქცია', 'აშენებულია',
                        'წელი/საუკუნე'], f'the sheet changed: {head}'
    churches = []
    for r in rows[1:]:
        r = r + [None] * (9 - len(r))
        if not r[2]:
            continue
        lng, lat = r[4], r[5]
        ok = isinstance(lat, (int, float)) and isinstance(lng, (int, float)) and 41.0 <= lat <= 43.7 and 39.9 <= lng <= 46.8
        note = (r[3] or '').strip()
        churches.append({
            'name': ' '.join(str(r[2]).split()), 'mun': ' '.join(str(r[0]).split()), 'place': ' '.join(str(r[1] or '').split()),
            'pt': (round(lat, 5), round(lng, 5)) if ok else None, 'kind': KINDS[r[6]],
            'built': built_text(r[7], r[8]),
            'building': bool(re.match(r'მშ[ე]?ნებარე|მშენებლობა', note)), 'note': '' if re.match(r'მშ[ე]?ნებარე$', note) else note,
        })

    # a point far from its municipality's other churches is a typing slip in the source: no place rather than a wrong one
    by_mun = defaultdict(list)
    for c in churches:
        if c['pt']:
            by_mun[c['mun']].append(c['pt'])
    dropped = 0
    for c in churches:
        pts = by_mun[c['mun']]
        if c['pt'] and len(pts) >= 4:
            mid = (sorted(p[0] for p in pts)[len(pts) // 2], sorted(p[1] for p in pts)[len(pts) // 2])
            if dist_m(c['pt'], mid) > 60000:
                c['pt'] = None
                dropped += 1

    # photos and Wikipedia: the nearest Wikidata item that shares a name word (or stands within 60 m), each item once
    wd = load_wikidata(wd_paths)
    pairs = []
    for i, c in enumerate(churches):
        if not c['pt']:
            continue
        mine = stems(c['name'])
        for j, it in enumerate(wd):
            if abs(it['pt'][0] - c['pt'][0]) > 0.006 or abs(it['pt'][1] - c['pt'][1]) > 0.008:
                continue
            d = dist_m(c['pt'], it['pt'])
            shared = mine & stems(it['label'])
            near = 500 if shared - SAINTS else 150 if shared else 60
            if d <= near:
                pairs.append((0 if shared else 1, d, i, j))
    pairs.sort()
    used_c, used_w = set(), set()
    for _, d, i, j in pairs:
        if i in used_c or j in used_w:
            continue
        used_c.add(i)
        used_w.add(j)
        churches[i].update(img=wd[j]['img'], wiki=wd[j]['wiki'], desc=wd[j]['desc'])

    # stable ids (the admins' hours and contacts are kept by id): the name and the place
    items, seen = [], set()
    for c in churches:
        key = f"{c['name']}|{c['mun']}|{c['place']}|{c['pt']}"
        cid = format(zlib.crc32(key.encode('utf-8')), 'x')
        while cid in seen:
            cid = format(zlib.crc32((cid + key).encode('utf-8')), 'x')
        seen.add(cid)
        lat, lng = c['pt'] or (0, 0)
        items.append([cid, c['name'], c['mun'], c['place'], lat, lng, c['kind'], c['built'],
                      1 if c['building'] else 0, c['note'], c.get('img', ''), c.get('wiki', ''), c.get('desc', '')])
    # the municipalities once, each with its region; an item names its municipality by number
    munis = sorted({x[2] for x in items}, key=lambda m: (region_of(m), m))
    num = {m: i for i, m in enumerate(munis)}
    items.sort(key=lambda x: (num[x[2]], x[3], x[1]))
    for x in items:
        x[2] = num[x[2]]
    # items: [id, name, municipality №, village or address, lat (0 = unknown), lng, kind c/m/x, built, under construction 0/1,
    #         note, Commons photo file, ka.wikipedia title, Wikidata description]
    data = {'updated': date.today().isoformat(), 'munis': [[m, region_of(m)] for m in munis], 'items': items}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'{len(items)} churches, {sum(1 for x in items if x[4])} with a place ({dropped} far points dropped), '
          f'{sum(1 for x in items if x[10])} photos, {sum(1 for x in items if x[11])} Wikipedia links -> {OUT}')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2:])
