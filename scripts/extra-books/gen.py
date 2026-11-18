import os
WORK = os.environ.get('EXTRA_BOOKS_WORK', os.path.expanduser('~/extra-books-work'))
# Writes the extra books: public/wignebi-x/NN.json + src/data/extraBooks.ts
import sys, re, json, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pdfbook as P, ocrbook as O, pickle, glob
import lives as LIVES_BOOK
from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
OUT = f'{REPO}/public/wignebi-x'
UP = os.path.join(WORK, 'up')

# (pdf no, title, sub, group, extra fixes)
BOOKS = [
  # group 1: saints and icons
  (33, 'აბო ტფილელი', 'წმიდა დიდმოწამე', 'g'),
  (34, 'არსენ იყალთოელი', 'ღირსი მამა', 'g'),
  (32, 'ასი ათასი მოწამე', 'ხუარაზმელთაგან ტფილისს წამებულნი', 'g'),
  (35, 'ბეთანიელი მამები', 'წმიდა აღმსარებელნი', 'g'),
  (39, 'გაბრიელ, იმერეთის ეპისკოპოსი', 'წმიდა მამა', 'g'),
  (36, 'გიორგი-პროხორე ქართველი', 'ჯუარის მონასტრის მაშენებელი', 'g'),
  (44, 'გრიგოლ ხანძთელი', 'ღირსი მამა', 'g'),
  (51, 'დოსითეოზ ქუთათელი', 'წმიდა მღდელმოწამე', 'g'),
  (45, 'ექვთიმე აღმსარებელი', 'ღირსი მამა, ზედაზნელი', 'g'),
  (48, 'ექვთიმე ღმრთისკაცი', 'ღირსი მამა', 'g'),
  (41, 'ვახტანგ გორგასალი', 'წმიდა დიდი მეფე', 'g'),
  (37, 'ზენონ იყალთოელი', 'ღირსი მამა', 'g'),
  (38, 'თამარ მეფე', 'წმიდა კეთილმსახური მეფე', 'g'),
  (29, 'ივერიის ღმრთისმშობლის ხატი', 'პორტაიტისად წოდებული', 'g'),
  (40, 'მამა გაბრიელი', 'ღირსი მამა, არქიმანდრიტი', 'g'),
  (42, 'მიქაელ ულუმბოელი', 'ღირსი მამა', 'g'),
  ('ocr46', 'მიქაელ ყულოშვილი', 'მღვდელმოწამე, ჰერეთში წამებული', 'g'),
  (30, '„მოულოდნელი სიხარული“', 'ღმრთისმშობლის სასწაულთმოქმედი ხატი', 'g'),
  (47, 'სერაპიონ ზარზმელი', 'ღირსი მამა', 'g'),
  (49, 'სერაფიმე საროველი', 'ღირსი მამა', 'g'),
  (50, 'სერგი რადონეჟელი', 'ღირსი მამა', 'g'),
  # group 2: Lent and Holy Week
  (19, 'თეოდორე ტირონის პარაკლისი', 'კოლიოს კურთხევით', 'm'),
  (18, 'დიდი მარხვის შაბათები', 'II, III და IV შაბათი', 'm'),
  (16, 'დაუჯდომლის შაბათი', 'დიდი მარხვის V შვიდეული', 'm'),
  (17, 'დიდი პარასკევი', 'ვნების 12 სახარება და სამეუფო ჟამნები', 'm'),
  # group 3: blessings and molebens
  (27, 'სანთლის კურთხევა', 'მირქმა-მიგებება', 'k'),
  (56, 'ტაძრის კურთხევა', 'მღვდელმთავრის მიერ', 'k'),
  (58, 'ზეთისკურთხევა', 'შვიდგზის ზეთისცხება', 'k'),
  ('tess53', 'სამადლობელი პარაკლისი', 'მადლობა ღმრთისადმი', 'k'),
  ('pics52', 'ახალი წლის პარაკლისი', 'ძველი ნაბეჭდი, გვერდების სურათები', 'k'),
  # group 4: a bishop's service
  (60, 'ეპისკოპოსის მსახურება', 'მწუხრი, ცისკარი, წირვა', 'e'),
  (61, 'სამღვდელმთავრო წირვა', 'დიდი მწუხრი, დიდი ცისკარი, წირვა', 'e'),
  # group 5: „ქართველ წმიდათა ცხოვრებანი“ (2018), a book a month
] + [(f'lives:{m}', t, None, 'c') for m, t in enumerate(LIVES_BOOK.MONTHS + ['გარდამავალი ხსენებანი'])]
FIXES = {
  19: [(r'^მპარაკლისი', 'პარაკლისი')],
  40: [(r'^[ა-ჿ]?ეს-\s*განგება', 'წეს-განგება')],
}
PART_RX = re.compile(r'^(?:[–\-]\s*)?(?:დიდ(?:ი|სა)?\s+|მცირე(?:სა)?\s+)?(?:მწუხრ|ცისკ|წირვ|ლიტურ[ღგ]|სერობ|ჟამნ|შუაღამ|სადილის\s+ჟამ)')

def parts_of(secs, title, body):
    breaks = [i for i, (h, ps, sz) in enumerate(secs) if h and i > 0 and PART_RX.match(h) and len(h) < 70 and sz >= body + 0.5]
    if len(breaks) < 2:
        return [{'l': title, 's': [[h, ps] for h, ps, sz in secs]}]
    out = []
    cuts = [0] + breaks + [len(secs)]
    for a, b in zip(cuts, cuts[1:]):
        chunk = secs[a:b]
        if not chunk: continue
        first = chunk[0][0] or ''
        label = re.sub(r'[:.\s]+$', '', first) if (a > 0 or (PART_RX.match(first) and len(first) < 70)) else title
        out.append({'l': label[:60], 's': [[h, ps] for h, ps, sz in chunk]})
    return out

def main():
    os.makedirs(OUT, exist_ok=True)
    menu = []
    lives = None
    for i, (n, title, sub, group) in enumerate(BOOKS, 1):
        scan = isinstance(n, str)
        if n.startswith('lives:') if scan else False:
            if lives is None: lives = dict(LIVES_BOOK.book(f'{UP}/b62.pdf'))
            parts = lives[int(n[6:])]
            many = sum(1 for p in parts[1:] if p['s'][0][0])
            sub = (f'აღდგომით დათვლილი ხსენებანი · {many} ცხოვრება' if n == 'lives:12' else f'{many} ცხოვრება და თვის ხსენებანი')
            book = {'t': title, 'scan': True, 'c': parts}
        elif n == 'ocr46':
            d = pickle.load(open(os.path.join(WORK, 'd46.pkl'), 'rb'))
            secs = [[h, ps, 0] for h, ps in O.from_lines(d['lines'])]
            book = {'t': title, 'scan': True, 'c': parts_of(secs, title, -99)}
        elif n == 'tess53':
            secs = [[h, ps, 0] for h, ps in O.from_tesseract(sorted(glob.glob(os.path.join(WORK, 'tess', 'b53-*.txt'))))]
            book = {'t': title, 'scan': True, 'c': [{'l': title, 's': [[h, ps] for h, ps, _ in secs]}]}
        elif n == 'pics52':
            os.makedirs(f'{OUT}/p{i:02d}', exist_ok=True)
            pics = []
            for j, src in enumerate(sorted(glob.glob(os.path.join(WORK, 'n52', 'p-*.png'))), 1):
                im = Image.open(src).convert('RGB'); w, h = im.size
                im = im.resize((1000, round(h * 1000 / w)), Image.LANCZOS)
                im.save(f'{OUT}/p{i:02d}/{j:02d}.jpg', quality=70, optimize=True, progressive=True)
                pics.append(f'/wignebi-x/p{i:02d}/{j:02d}.jpg')
            book = {'t': title, 'scan': True, 'pages': pics, 'c': [{'l': title, 's': []}]}
        else:
            secs, (body, *_) = P.build(f'{UP}/b{n:02d}.pdf', FIXES.get(n, ()))[0], P.body_size(P.read(f'{UP}/b{n:02d}.pdf'))
            book = {'t': title, 'c': parts_of(secs, title, body)}
        json.dump(book, open(f'{OUT}/{i:02d}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        m = {'n': i, 't': title, 'sub': sub, 'g': group, 'c': len(book['c'])}
        if scan: m['scan'] = True
        menu.append(m)
        print(i, n, title, len(book['c']), [p['l'][:20] for p in book['c']][:6])
    write_ts(menu)

GROUPS = [('g', 'წმინდანთა და ხატთა განგებები', ''), ('m', 'დიდი მარხვა და ვნების შვიდეული', ''),
          ('k', 'კურთხევები და პარაკლისები', ''), ('e', 'მღვდელმთავრის მსახურება', ''),
          ('c', 'ქართველ წმიდათა ცხოვრებანი', 'დეკანოზი ზაქარია მაჩიტაძე, 2018. თარიღი ძველი სტილითაა, ფრჩხილებში — ახალი.')]

def write_ts(menu):
    lines = [
        '// „დამატებითი წიგნები“ on the მედავითნე books page: liturgical books the monastery app does not have, turned into text from',
        '// the school\'s PDFs (texts: public/wignebi-x/<NN>.json, same shape as public/wignebi). `scan` = read by a scanner (may hold',
        '// mistakes — the page says so). Generated by scripts/extra-books/gen.py — never edit by hand.',
        '',
        "export type ExtraGroup = 'g' | 'm' | 'k' | 'e' | 'c';",
        'export type ExtraBook = { n: number; t: string; sub: string; g: ExtraGroup; c: number; scan?: true };',
        '',
        'export const EXTRA_GROUPS: { id: ExtraGroup; title: string; note?: string }[] = [',
    ]
    lines += [f"  {{ id: '{g}', title: '{t}'" + (f", note: '{n}'" if n else '') + ' },' for g, t, n in GROUPS]
    lines += ['];', '', 'export const EXTRA_BOOKS: ExtraBook[] = [']
    for m in menu:
        scan = ', scan: true' if m.get('scan') else ''
        lines.append(f"  {{ n: {m['n']}, t: {json.dumps(m['t'], ensure_ascii=False)}, sub: {json.dumps(m['sub'], ensure_ascii=False)}, g: '{m['g']}', c: {m['c']}{scan} }},")
    lines += ['];', '']
    open(f'{REPO}/src/data/extraBooks.ts', 'w', encoding='utf-8').write('\n'.join(lines))

if __name__ == '__main__':
    main()
