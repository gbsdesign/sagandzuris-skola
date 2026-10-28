"""Builds the „წიგნები“ tab of the მედავითნეობა page from the „საღვთისმსახურო წიგნები“ app's bundle:

  public/wignebi/<collection>/<NN>.json   one file per book / item (fetched only when opened)
  src/data/wignebi.ts                     the small menu (collections → items), in the app's own order

Usage: python3 scripts/wignebi/build.py <bundle> [<output root, default: the repo>]
(the bundle is the app's Hermes bytecode: assets/index.android.bundle in its APK, or an update's launch asset —
scripts/wignebi/update.py fetches those by itself).

Menu labels come from labels.json (taken once from the app's own menus, keyed by the data's keys, because the
menus' code moves between app versions); an item with no label there is named by its first heading."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import convert as C        # noqa: E402
import hermes              # noqa: E402

REPO = os.path.dirname(os.path.dirname(HERE))
LABELS = json.load(open(os.path.join(HERE, 'labels.json'), encoding='utf-8'))


# ---------- reading the app's data ----------

def plain(x):
    """the evaluator's values → plain JSON values (lone surrogates replaced, unknowns marked)"""
    if isinstance(x, dict): return {str(k): plain(v) for k, v in x.items()}
    if isinstance(x, list): return [plain(e) for e in x]
    if isinstance(x, hermes.Unk): return {'__unk__': x.d}
    if isinstance(x, str): return x.encode('utf-16', 'surrogatepass').decode('utf-16', 'replace')
    return x


def nkey(k):
    try: return (0, int(k))
    except Exception: return (1, k)


def is_block(x): return isinstance(x, dict) and '__new__' in x


def blocks_in(x):
    """all class instances (titles[], texts[][]) under x, in source order"""
    if is_block(x): yield x; return
    if isinstance(x, dict):
        for k in sorted(x.keys(), key=nkey): yield from blocks_in(x[k])
    elif isinstance(x, list):
        for v in x: yield from blocks_in(v)


def block_sections(b):
    """class(titles[], bodies[][]) → [(title, [paragraphs])], in readable Georgian"""
    a = b.get('args') or []
    if len(a) != 2 or not isinstance(a[0], list) or not isinstance(a[1], list):
        return []
    out = []
    for i, t in enumerate(a[0]):
        body = a[1][i] if i < len(a[1]) and isinstance(a[1][i], list) else []
        title = C.convert(t).strip() if isinstance(t, str) else ''
        paras = [p for p in (C.convert(p).strip() for p in body if isinstance(p, str)) if p]
        if title or paras:
            out.append((title, paras))
    return out


def sections_of(x): return [s for b in blocks_in(x) for s in block_sections(b)]


def first_heading(x):
    for b in blocks_in(x):
        for t, p in block_sections(b):
            if t: return t
            if p: return p[0][:60]
    return ''


def short_label(h, n=60):
    h = h.strip()
    return (re.split(r'[.:;]', h)[0].strip() or h)[:n]


def clean(s):
    s = (s or '').replace(' ', ' ').replace('\t', ' ')
    return re.sub(r' {2,}', ' ', s).strip()


def secs(sections):
    out = []
    for h, p in sections:
        h = clean(h); p = [clean(x) for x in p if clean(x)]
        if h or p: out.append([h, p])
    return out


def is_paraklitoni(x):
    """the paraklitoni's module only exports a bare `data`: 8 tones (+2 extra parts) of days of services"""
    return (isinstance(x, dict) and all(str(k) in x for k in range(1, 9))
            and all(isinstance(x[str(k)], dict) and not is_block(x[str(k)]) for k in range(1, 9)))


# collection id → (title, menu kind, the module's export name)
SOURCES = {
    'akhali': ('ახალი აღთქმა', 'grid', 'AxaliAgtqmaData'),
    'dzveli': ('ძველი აღთქმა', 'grid', 'DzveliAgtqmaData'),
    'trapezi': ('ტრაპეზის სახარება', 'list', 'TrapeziData'),
    'samociqulo': ('სამოციქულო', 'list', 'SamociquloData'),
    'kalendari': ('საეკლესიო კალენდარი', 'calendar', 'KalendariData'),
    'kondaki': ('სამღვდელო კონდაკი', 'list', 'KondakiData'),
    'kurtxevani': ('კურთხევანი', 'list', 'KurtxevaniData'),
    'paraklitoni': ('პარაკლიტონი', 'list', 'data'),
    'tveni': ('საზიარო თვენი', 'list', 'Tvenidata'),
    'jamni': ('ჟამნი', 'list', 'JamniData'),
    'davitni': ('დავითნი', 'list', 'DavitniData'),
    'mgalobeltatvis': ('მგალობელთათვის', 'list', 'MedavitneData'),
    'wardgoma': ('წარდგომები', 'list', 'WardgomaData'),
    'locvani': ('ლოცვანი', 'list', 'LocvaniData'),
    'paraklisebi': ('პარაკლისები', 'list', 'ParaklisebiData'),
    'kriteli': ('ანდრია კრიტელის კანონი', 'list', 'KriteliData'),
}

DAYS = ['კვირიაკესა', 'ორშაბათსა', 'სამშაბათსა', 'ოთხშაბათსა', 'ხუთშაბათსა', 'პარასკევსა', 'შაბათსა',
        'სერობისა — ღვთისმშობლის გალობანი']


def read_bundle(path):
    E = hermes.Ev(hermes.HBC(path))
    data = {}
    for coll, (_, _, export) in SOURCES.items():
        found = E.find_module(export, is_paraklitoni if coll == 'paraklitoni' else None)
        if not found:
            raise SystemExit(f'{path}: no module exports {export} ({coll})')
        data[coll] = plain(found[1])
    return data


# ---------- the app's files ----------

def bible(coll, data, numbered):
    names = LABELS[coll]['items']; books = []
    for bi in sorted(data.keys(), key=nkey):
        chapters = data[bi]
        if not chapters: continue
        chs = []
        for ci in sorted(chapters.keys(), key=nkey):
            chs.append((int(ci) if ci.isdigit() else ci, [s for b in blocks_in(chapters[ci]) for s in block_sections(b)]))
        books.append((names.get(bi) or 'წიგნი %s' % bi, chs))
    files = {}; items = []
    for i, (name, chs) in enumerate(books, 1):
        out = []
        for ch, sections in chs:
            s = secs(sections)
            if not s: continue
            label = str(ch) if numbered else re.sub(r'\s+', ' ', next((h for h, _ in s if h), str(ch)))
            out.append({'l': label, 's': s})
        if not out: continue
        files[i] = {'t': name, 'num': numbered, 'c': out}
        items.append({'n': i, 't': name, 'c': len(out)})
    return files, items


def liturgical(coll, data):
    lab = LABELS.get(coll, {}); names = lab.get('items', {}); sub = lab.get('parts')
    found = []                                       # [(name, index, [(part name, sections)])]
    for k in sorted(data.keys(), key=nkey):
        item = data[k]
        label = names.get(k) or short_label(first_heading(item)) or 'ნაწილი %s' % k
        parts = []
        if coll == 'paraklitoni':
            for dk in sorted(item.keys(), key=nkey):
                parts.append((short_label(first_heading(item[dk]), 40), sections_of(item[dk])))
        elif sub is not None and isinstance(item, dict) and not is_block(item):
            subl = sub.get(k, {})
            for sk in sorted(item.keys(), key=nkey):
                parts.append((subl.get(sk) or short_label(first_heading(item[sk])), sections_of(item[sk])))
        else:
            s = sections_of(item)
            if not s: continue                       # an empty item is left out of the menu
            parts.append((label, s))
        if not parts: continue
        found.append((label, int(k) if k.isdigit() else k, parts))
    files = {}; items = []
    for i, (name, index, parts) in enumerate(found, 1):
        out = []
        for j, (pname, sections) in enumerate(parts):
            s = secs(sections)
            if not s: continue
            day = coll == 'paraklitoni' and j < len(DAYS) and isinstance(index, int) and index <= 8
            out.append({'l': DAYS[j] if day else clean(pname), 's': s})
        if not out: continue
        files[i] = {'t': name, 'c': out}
        items.append({'n': i, 't': name, 'c': len(out)})
    return files, items


def calendar(data):
    files = {}; items = []
    for i, y in enumerate(sorted(data.keys(), key=nkey), 1):
        months = [[] for _ in range(12)]
        for mo in sorted(data[y].keys(), key=nkey):
            for d in sorted(data[y][mo].keys(), key=nkey):
                e = data[y][mo][d]
                if not isinstance(e, dict) or 'header' not in e: continue
                h = e.get('header', {}); b = e.get('body', {}); l = e.get('last', {})
                fast = l.get('marxva')
                topic = l.get('topic')
                topic = ([t.strip() for t in topic if isinstance(t, str) and t.strip()] if isinstance(topic, list)
                         else [topic.strip()] if isinstance(topic, str) and topic.strip() else [])
                reads = l.get('lastText')
                reads = [t.strip() for t in reads if isinstance(t, str) and t.strip()] if isinstance(reads, list) else []
                months[int(mo) - 1].append({
                    'd': int(d), 'w': clean((h.get('headerText') or '').strip()), 'o': l.get('dzveli'),
                    'f': None if fast is None else bool(fast), 'r': h.get('headerColor') == 1,
                    's': clean((b.get('bodyText') or '').strip()),
                    'n': [clean(x) for x in topic if clean(x)], 'k': [clean(x) for x in reads if clean(x)],
                })
        files[i] = {'y': int(y), 'm': months}
        items.append({'n': i, 't': str(int(y)), 'c': sum(len(m) for m in months)})
    return files, items


def build(bundle, root=REPO):
    """writes the app's files under root; returns {collection: (items, characters)}"""
    data = read_bundle(bundle)
    pub = os.path.join(root, 'public', 'wignebi')
    menu = {}; stats = {}
    for coll, (title, kind, _) in SOURCES.items():
        if kind == 'calendar':
            files, items = calendar(data[coll])
        elif coll in ('akhali', 'dzveli', 'trapezi', 'samociqulo'):
            files, items = bible(coll, data[coll], kind == 'grid')
        else:
            files, items = liturgical(coll, data[coll])
        d = os.path.join(pub, coll); os.makedirs(d, exist_ok=True)
        chars = 0
        for i, f in files.items():
            text = json.dumps(f, ensure_ascii=False, separators=(',', ':'))
            chars += len(text)
            with open(os.path.join(d, '%02d.json' % i), 'w', encoding='utf-8') as fh:
                fh.write(text)
        menu[coll] = {'id': coll, 'title': title, 'kind': kind, 'items': items}
        stats[coll] = (len(items), chars)
    years = [int(it['t']) for it in menu['kalendari']['items']]
    write_menu(menu, os.path.join(root, 'src', 'data', 'wignebi.ts'), '%d–%d' % (min(years), max(years)))
    return stats


def write_menu(menu, path, years):
    ts = ['// „წიგნები“ on the მედავითნეობა page — the menu of the liturgical books, in the order of the',
          '// „საღვთისმსახურო წიგნები“ app (ღვთისმშობლის მიძინების სახელობის მამათა მონასტერი). Generated from that app\'s',
          '// texts; each item\'s text is public/wignebi/<collection>/<NN>.json, fetched only when opened.',
          '// Book file: { t, num?, c: [{ l: label, s: [[heading, paragraphs[]], …] }] }; calendar: { y, m: [days[]] × 12 }.',
          '// Made by scripts/wignebi (kept up to date with the app\'s updates by .github/workflows/wignebi-update.yml).',
          '',
          "export type WignebiKind = 'grid' | 'list' | 'calendar';",
          'export type WignebiItem = { n: number; t: string; c: number };',
          'export type WignebiCollection = { id: string; title: string; kind: WignebiKind; items: WignebiItem[] };',
          'export type WignebiShelf = { id: string; title: string; sub: string; collections: string[] };',
          '',
          'export const WIGNEBI_COLLECTIONS: Record<string, WignebiCollection> = '
          + json.dumps(menu, ensure_ascii=False, indent=1) + ';',
          '',
          '// the main menu: „ბიბლია“ holds four books, every other button is one collection',
          'export const WIGNEBI_SHELVES: WignebiShelf[] = [',
          "  { id: 'biblia', title: 'ბიბლია', sub: 'ახალი და ძველი აღთქმა, ტრაპეზის სახარება, სამოციქულო', collections: ['akhali', 'dzveli', 'trapezi', 'samociqulo'] },",
          "  { id: 'kalendari', title: 'საეკლესიო კალენდარი', sub: '%s · საკითხავები, მარხვა', collections: ['kalendari'] }," % years,
          "  { id: 'kondaki', title: 'სამღვდელო კონდაკი', sub: 'მღვდელმთავრის მსახურებები', collections: ['kondaki'] },",
          "  { id: 'kurtxevani', title: 'კურთხევანი', sub: 'ნათლობა, ქორწინება, კურთხევები', collections: ['kurtxevani'] },",
          "  { id: 'paraklitoni', title: 'პარაკლიტონი', sub: 'რვა ხმა, შვიდეულის დღეები', collections: ['paraklitoni'] },",
          "  { id: 'tveni', title: 'საზიარო თვენი', sub: 'წმინდანთა საზიარო განგებანი', collections: ['tveni'] },",
          "  { id: 'jamni', title: 'ჟამნი', sub: 'ჟამები, თვეები, აღდგომისანი', collections: ['jamni'] },",
          "  { id: 'davitni', title: 'დავითნი', sub: '20 კანონი, სადიდებლები', collections: ['davitni'] },",
          "  { id: 'mgalobeltatvis', title: 'მგალობელ\\u00adთათვის', sub: 'წირვა, მწუხრი, ცისკარი', collections: ['mgalobeltatvis'] },",
          "  { id: 'wardgoma', title: 'წარდგომები', sub: 'საზიარო, საცისკრო, დღესასწაულთა', collections: ['wardgoma'] },",
          "  { id: 'locvani', title: 'ლოცვანი', sub: 'ზიარების, დილის, ძილისა', collections: ['locvani'] },",
          "  { id: 'paraklisebi', title: 'პარაკლისები', sub: '23 პარაკლისი', collections: ['paraklisebi'] },",
          "  { id: 'kriteli', title: 'ანდრია კრიტელის კანონი', sub: 'ორშაბათი – ხუთშაბათი', collections: ['kriteli'] },",
          '];',
          '']
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(ts))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    stats = build(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else REPO)
    for coll, (n, chars) in stats.items():
        print('%-15s %4d items %10d chars' % (coll, n, chars))
