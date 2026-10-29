"""Folklore Centre songs, step 2 of 3: parse each file's title, find its region, decide where it goes.

Inputs (in the folder given as the first argument; made from a Drive listing through the Google Drive connector — the
listing is not in the repo, it is thousands of lines):
  song_albums.tsv   Drive folder id, folder name — the album folders under „ფოლკლორის ცენტრი / სიმღერები“
  files.tsv         file id, folder id, file name, size, mime — every file in them
  site_ids.txt      every Drive id the app's data already names (grep of src/data/*.ts)
  all_old_audio.tsv id, folder, name, size, created — the Drive's older audio (sizes find the files the site already has)
  songs.json        the app's songs (step 1: node scripts/centre/dump-songs.mjs <folder>/songs.json)
  other_albums.tsv, other_files.tsv  (optional) the same for „ფოლკლორის ცენტრი / სხვა“ — see MTKMELI below
Output: <folder>/plan.json — albums (every file) + takes bound to songs. Step 3: python3 scripts/centre/emit.py <folder>."""
import csv, collections, json, os, re, sys

INV = sys.argv[1]
DUMP = f'{INV}/songs.json'
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

albums = [l.rstrip('\n').split('\t') for l in open(f'{INV}/song_albums.tsv')]
files = [r for r in csv.reader(open(f'{INV}/files.tsv'), delimiter='\t')]
site = set(open(f'{INV}/site_ids.txt').read().split())
old = {r[0]: r for r in csv.reader(open(f'{INV}/all_old_audio.tsv'), delimiter='\t')}
site_sizes = {old[i][3] for i in site if i in old and old[i][3]}
site_by_size = {old[i][3]: i for i in sorted(site) if i in old and old[i][3]}
existing = json.load(open(DUMP))['songs']
_gn = open(f'{REPO}/src/data/georgianNames.ts').read()
FIRST = set(' '.join(re.findall(r'`([^`]*)`', _gn)).split()) | {'ჰამლეტ', 'ჯემალ', 'ანზორ', 'პოლიკარპე', 'ტრისტან', 'ვარლამ'}
SURNAME = re.compile(r'(შვილი|შვილები|ძე|ძეები|ია|ავა|ანი|იანი|ური|ელი|ული|უა|ბა|ია)$')
def is_person(t):
    w = t.replace(',', ' ').split()
    return len(w) >= 2 and w[0] in FIRST and bool(SURNAME.search(w[1]))

def album_name(t):
    return t.replace(' • სიმღერები', '').replace(' • სხვა', '').strip()

# ── „ფოლკლორის ცენტრი / სხვა“ (optional inputs other_albums.tsv: folder id, name; other_files.tsv: file id, folder id,
#    name, size). A folder whose name without „ • სხვა“ is a song album's joins that album; the rest are albums of their
#    own — the მთქმელი ones (MTKMELI) stay out of the songs and go to the მთქმელი section (emit.py → centreOther.ts).
#    Their files get looser rules: a „ლექსი“ there is a sung mountain verse, a region after „ - “ counts, chants stay
#    in the album; INSTRUMENT ones go to the instrument's window, FORCE ones (songs on a poet's words) to the town songs.
MTKMELI = {'ლექსის თქმა მწადის ერთისა', 'ფოლკლორული ანსამბლი მოყვარე - ქედა, მერისი'}
INSTRUMENT = {  # file id: (instrument id of data/instrumentsData.ts, title, note)
    '1yANBT5Dtb_8zDfIPj5lhiaiLn9xDjQdl': ('fanduri', 'მოხეური მგზავრული საცეკვაო', 'ხევი, სოფ. ყაზბეგი, ალექსი შადური'),
    '1ZS4ubnHjnUINffiwGIoidgKcEH1rva44': ('salamuri', 'ჩობნური', 'ალექსი ექვთიმიშვილი'),
}
ALBUM_ONLY = {'1A6FGDIJAH5FMgFrWb2eUKI_De4wVbTi0'}  # „სმური“ (გუდამაყარი): sung or played — not clear from the file
FORCE = {  # file id: (region, area, title, the app's song id or None, note)
    '1bEzHqDe5_5fY1JbmqlQccVWvqC7fst37': ('kalakuri', None, 'ჩემო კარგო ქვეყანა', 'fa-cemo-kargo-kvekana-ql', 'ლექსი ილია ჭავჭავაძისა, მუსიკა რევაზ ლაღიძისა'),
    '1a4LxCBC5SvYbx4uVWbYXnpurC0Cdiukj': ('kalakuri', None, 'ოდესაც გიცქერ', None, 'მელიტონ ბალანჩივაძე, ლექსი გრიგოლ აბაშიძისა'),
    '1T1TtmGg_bHnVvmUohf0FDOFkIQfoePwL': ('kalakuri', None, 'დავრდომილი სნეული', None, 'ანდრია ყარაშვილი, ლექსი კოტე მაყაშვილისა'),
}
SKHVA_CHANT = re.compile(r'მეუფეო ზეცათაო|დღეს საღმრთომან')
SKHVA = set()        # files from „სხვა“ that joined the songs' albums
mt_albums = []       # [folder id, name, files]
if os.path.exists(f'{INV}/other_albums.tsv'):
    by_name = {album_name(t): i for i, t in albums}
    remap = {}
    for oid, oname in (l.rstrip('\n').split('\t') for l in open(f'{INV}/other_albums.tsv') if l.strip()):
        base = album_name(oname)
        if base in MTKMELI: mt_albums.append([oid, base, []])
        elif base in by_name: remap[oid] = by_name[base]
        else: albums.append([oid, base]); remap[oid] = oid
    mt = {a[0]: a for a in mt_albums}
    for r in csv.reader(open(f'{INV}/other_files.tsv'), delimiter='\t'):
        if r[1] in mt: mt[r[1]][2].append(r)
        elif r[1] in remap: files.append([r[0], remap[r[1]], r[2], r[3], 'audio/mpeg']); SKHVA.add(r[0])

def mt_track(fname):
    """A მთქმელი album's file → (title, who says it)"""
    n = re.sub(r'\.mp3$', '', fname, flags=re.I)
    for _ in range(3): n = re.sub(r'^\s*\d{1,3}\s*\.?\s*', '', n)
    n = n.lstrip('. ')
    if ' - ' in n: who, t = n.split(' - ', 1)
    elif ' საუბარი ' in n: who, t = n.split(' საუბარი ', 1); t = 'საუბარი ' + t
    else: who, t = '', n
    return t.strip(), who.strip()

# ── region words: (region, area) ──
R = {}
def add(region, area, *words):
    for w in words: R[w] = (region, area)
add('guria', None, 'გურია', 'გურული', 'გურულ', 'ოზურგეთი', 'ჩოხატაური', 'ლანჩხუთი', 'მაკვანეთი', 'ნატანები', 'ვაკიჯვარი', 'ბახვი', 'ასკანა')
add('kakheti', None, 'კახეთი', 'კახური', 'თელავი', 'სიღნაღი', 'გურჯაანი', 'ყვარელი', 'ახმეტა', 'შილდა', 'იყალთო', 'ართანა', 'საგარეჯო', 'ლაგოდეხი', 'ვაჩნაძიანი', 'ბაკურციხე', 'საკობიანო', 'კარდენახი', 'ვაქირი', 'წინანდალი', 'მანავი', 'ნაფარეული', 'ენისელი', 'ჩუმლაყი', 'ველისციხე', 'ანაგა')
add('kakheti', 'ქართლ-კახეთი', 'ქართლ-კახური', 'ქართლ-კახეთი', 'ქართლკახური')
add('kakheti', 'თუშეთი', 'თუშეთი', 'თუშური', 'მთათუშეთი', 'ომალო', 'ალვანი', 'დართლო', 'წოვათა')
add('shidakartli', None, 'ქართლი', 'ქართლური', 'შიდა ქართლი', 'გორი', 'კასპი', 'ქარელი', 'ხაშური', 'კავთისხევი', 'ატენი')
add('kvemokartli', None, 'ქვემო ქართლი', 'თეთრიწყარო', 'წალკა', 'მარნეული')
add('imereti', None, 'იმერეთი', 'იმერული', 'ქუთაისი', 'ვანი', 'ჭიათურა', 'ზესტაფონი', 'ბაღდათი', 'სამტრედია', 'ხონი', 'თერჯოლა', 'საჩხერე', 'ტყიბული', 'ყუმური', 'ნავარძეთი', 'ზემოიმერული', 'ქვემოიმერული')
add('racha', 'რაჭა', 'რაჭა', 'რაჭული', 'ზემორაჭული', 'ქვემორაჭული', 'ონი', 'ამბროლაური', 'ღები', 'ჭიორა', 'უწერა', 'გლოლა')
add('racha', 'ლეჩხუმი', 'ლეჩხუმი', 'ლეჩხუმური', 'ცაგერი', 'ლაილაში')
add('svaneti', None, 'სვანეთი', 'სვენეთი', 'სვანური', 'ზემოსვანური', 'ქვემოსვანური', 'ზემო სვანური', 'ქვემო სვანური', 'ზემო სვანეთი', 'ქვემო სვანეთი', 'მესტია', 'ლენტეხი', 'ბეჩო', 'ლატალი', 'ეცერი', 'ცხუმარი', 'იელი', 'ხელედი', 'ჩოლური', 'ლახამულა', 'მულახი', 'უშგული', 'კალა', 'ლანჩვალი', 'ფარი', 'თეკალი')
add('samegrelo', None, 'სამეგრელო', 'მეგრული', 'ოდიში', 'ზუგდიდი', 'წალენჯიხა', 'ჩხოროწყუ', 'მარტვილი', 'სენაკი', 'აბაშა', 'ხობი')
add('abkhazeti', None, 'აფხაზეთი', 'აფხაზური', 'სამურზაყანო', 'სამურზაყანოული')
add('achara', None, 'აჭარა', 'აჭარული', 'ზემოაჭარული', 'ქვემოაჭარული', 'ზემო აჭარული', 'ქედა', 'ხულო', 'შუახევი', 'ქობულეთი', 'ბათუმი', 'მერისი', 'მაჭახელა', 'ხელვაჩაური')
add('samtskhe', 'მესხეთი', 'მესხეთი', 'მესხური', 'ჯავახეთი', 'ჯავახური', 'ახალციხე', 'ადიგენი', 'ასპინძა', 'ახალქალაქი', 'მესხეთ-ჯავახეთი')
add('mtianeti', 'ხევი', 'ხევი', 'მოხეური', 'ყაზბეგი', 'სნო', 'გერგეტი')
add('mtianeti', 'ხევსურეთი', 'ხევსურეთი', 'ხევსურული', 'ბარისახო', 'შატილი', 'არხოტი', 'ლიქოკი')
add('mtianeti', 'ფშავი', 'ფშავი', 'ფშაური', 'ფშავური', 'გოგოლაურთა', 'მაღაროსკარი', 'შუაფხო')
add('mtianeti', 'მთიულეთი', 'მთიულეთი', 'მთიულური', 'ფასანაური', 'მლეთა')
add('mtianeti', 'გუდამაყარი', 'გუდამაყარი', 'გუდამაყრული')
add('mtianeti', 'თიანეთი', 'თიანეთი', 'თიანური')
add('mtianeti', None, 'დუშეთი')
add('kalakuri', None, 'ქალაქური', 'თბილისური', 'ძველი თბილისი', 'ძველი თბილისის')
add('lazeti', None, 'ლაზური', 'ლაზეთი', 'ჭანური')
add('oseti', None, 'ოსური', 'ოსეთი')
WORDS = sorted(R, key=len, reverse=True)

# ── albums: (tier, region, area) — field = every song of the album comes from that region; ens = a local ensemble;
#    one = one song only (title) ──
A = {}
def al(names, tier, region, area=None):
    for n in names: A[n] = (tier, region, area)
al(['ალექსანდრე ფარცხალაძის კოლექცია • აჭარა • 1934 წ', 'აჭარა', 'აჭარული ტრადიციული მუსიკა - დისკი I', 'აჭარული ტრადიციული მუსიკა - დისკი II',
    'აჭარული ტრადიციული მუსიკა - დისკი III', 'აჭარული ტრადიციული მუსიკა - დისკი IV', 'აჭარული ხალხური სიმღერები',
    'აჭარული ხალხური სიმღერები • სასწავლო ჩანაწერები', 'აჭარული ხალხური სიმღერები • სასწავლო ჩანაწერები (2)',
    'ექსპედიცია ქედაში, 14 სექტემბერი 2012 წ', 'ექსპედიციები აჭარაში • შუახევი 1', 'ექსპედიციები აჭარაში • შუახევი 2',
    'შალვა მშველიძის კოლექცია • აჭარა • 1932 წ'], 'field', 'achara')
al(['აფხაზეთის სახელმწიფო ანსამბლი • ალაზანი', 'აფხაზურები • ალაზანი'], 'field', 'abkhazeti')
al(['გრიგოლ ჩხიკვაძის კოლექცია • მესხეთ-ჯავახეთი • 1949 წ', 'მესხეთის ექსპედიცია, ახალციხე, 2009 წელი',
    'შალვა მშველიძის კოლექცია • მესხეთ-ჯავახეთი • 1933 წ'], 'field', 'samtskhe', 'მესხეთი')
al(['გრიგოლ ჩხიკვაძის კოლექცია • ხევსურეთი • 1953 წ', 'ხევსურეთი'], 'field', 'mtianeti', 'ხევსურეთი')
al(['ფშავი', 'შალვა მშველიძის კოლექცია • ფშავი • 1929 წ'], 'field', 'mtianeti', 'ფშავი')
al(['ჯვარული • მოხეური სიმღერები'], 'field', 'mtianeti', 'ხევი')
al(['შალვა ასლანიშვილის კოლექცია • ფშავი, ხევსურეთი • 1948 წ', 'შალვა ასლანიშვილის კოლექცია • ხევი, მთიულეთი, გუდამაყარი • 1949 წ',
    'შალვა მშველიძის კოლექცია • თიანეთი, ხევსურეთი • 1929 წ',
    'ოთარ კაპანაძის ექსპედიცია დუშეთის რაიონში, სოფ. ჩიტაურები, 2012 წელი',
    'ოთარ კაპანაძის ექსპედიცია დუშეთის რაიონში, ქვეშეთი,ლაკათხევი,ცხვედიეთი 2012',
    'ოთარ კაპანაძის ექსპედიცია დუშეთის რაიონში,ახალანი,ანანური,დაბა ჟინვალი 2012',
    'ოთარ კაპანაძის ექსპედიცია დუშეთის რაიონში,ბუჩაანთ კართან,ჩოხი,არდოტი,დავათი',
    'ოთარ კაპანაძის ექსპედიცია დუშეთის რაიონში,საშაბურო,ზემო ბულაჩაური 2012 წ'], 'field', 'mtianeti')
al(['გურია', 'გურული სიმღერები', 'გურული სიმღერები • შევისწავლოთ ქართული ხალხური სიმღერა • ნაწ. 1',
    'გურული სიმღერები • შევისწავლოთ ქართული ხალხური სიმღერა • ნაწ. 2', 'ლანჩხუთის კრება 1931 წელი',
    'სახელმწიფო ტელევიზიის არქივი - გურული სიმღერები', 'ქართული ხალხური მუსიკა (გურია) • ალაზანი',
    'ხმის ჩამწერი სტუდია, გურია, ოზურგეთი სოფ. ნატანები. 2009 წ', 'ხმის ჩამწერი სტუდია, გურია, ოზურგეთი, 2009 წ',
    'ხმის ჩამწერი სტუდია. ოზურგეთი, სოფელი ვაკიჯვარი. 2012 წ', 'შალვა მშველიძის კოლექცია • გურია • 1929 წ'], 'field', 'guria')
al(['ექსპედიცია კახეთში, ახმეტა, სოფ. საკობიანო. 2007წ', 'ექსპედიცია კახეთში, გურჯაანი, სოფ. ვაჩნაძიანი',
    'ექსპედიცია კახეთში, თელავი, 2007წ', 'ექსპედიცია კახეთში. გურჯაანი, 2008 წელი', 'ექსპედიცია კახეთში. გურჯაანი, სოფ. ბაკურციხე, 2008 წელი',
    'თამარ მამალაძის კოლექცია • კახეთი • 1950 წ', 'თამარ მამალაძის კოლექცია • კახეთი • 1951 წ',
    'კახეთი - თელავი - საარქივო ჩანაწერები', 'კახეთი - იყალთო, ართანა, ყვარელი - საარქივო ჩანაწერები',
    'კახეთი - ნაწილი 1 • - ნაწილი 1', 'კახეთი - ნაწილი 2 • - ნაწილი 2', 'კახეთი - შილდა, გურჯაანი - საარქივო ჩანაწერები',
    'კახეთის ექსპედიცია • ანდრო სიმაშვილის გუნდი • 2007 წელი', 'კახური სიმღერები - 2016',
    'უცნობი ჩამწერის კოლექცია • კახეთი • 1946 წ', 'შალვა მშველიძის კოლექცია • კახეთი • 1929 წ'], 'field', 'kakheti')
al(['ქართლ-კახური სიმღერები', 'ქართლ-კახური სიმღერები (2)'], 'field', 'kakheti', 'ქართლ-კახეთი')
al(['ხმის ჩამწერი სტუდია კახეთში, ახმეტა, ქვემო ალვანი, 2007 წელი', 'შალვა ასლანიშვილის კოლექცია • მთათუშეთი • 1947 წ'], 'field', 'kakheti', 'თუშეთი')
al(['ქართლი', 'ქართლური მუსიკის საღამო', 'ხმის ჩამწერი სტუდია, ქართლის ექსპედიცია, კასპი, სოფ. კავთისხევი, 2009 წელი'], 'field', 'shidakartli')
al(['იმერეთი 2007 • ხელმძღვანელი - ნატო ზუმბაძე', 'იმერეთი', 'იმერეთის ექსპედიცია, ვანის რაიონი, სოფ. ყუმური. 2007 წელი',
    'იმერეთის ექსპედიცია, ჭიათურა, სოფ. ნავარძეთი, 2007 წელი', 'ქართული ხალხური მუსიკა (იმერეთი) • ალაზანი'], 'field', 'imereti')
al(['ექსპედიცია ზემო რაჭაში. 2008 წელი', 'ექსპედიცია რაჭაში, ონი, სოფელი ღები 2007 წელი', 'ექსპედიცია ქვემო რაჭაში, 2011 წელი',
    'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, მაჟიეთი, მოედანი, 2009 წელი', 'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, საკაო, უწერა, 2009 წელი',
    'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, სოფელი ბარი, 2009 წელი', 'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, ღარი, ღები, 2009 წელი',
    'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, წმენდაური, ხიდეშლები, 2009 წელი', 'თორნიკე სხიერელის ექსპედიცია ზემო რაჭაში, ჭიორა, 2009 წელი',
    'რაჭა', 'შალვა ასლანიშვილის კოლექცია • მთის რაჭა • 1949 წ'], 'field', 'racha', 'რაჭა')
al(['ლეჩხუმი'], 'field', 'racha', 'ლეჩხუმი')
al(['ექსპედიცია ქვემო სვანეთში, ლენტეხი, ჩიხარეში, ჟახუნდერი, გულიდა 2010 წ', 'ზემო სვანეთის ექსპედიცია, სოფელი ბეჩო, 2007 წელი',
    'სვანეთი', 'სვანეთი - საარქივო ჩანაწერები', 'სვანეთის ექსპედიცია, მესტია, სოფელი იელი, 2007 წელი',
    'სვანეთის ექსპედიცია, მესტია, სოფელი ცხუმარი, 2007 წ', 'სვანეთის საექსპედიციო ჩანაწერები', 'სვანური ხალხური სიმღერები • სასწავლო ჩანაწერები',
    'ქართული ხალხური მუსიკა (სვანეთი) • ალაზანი', 'ქვემო სვანეთის ექსპედიცია, ლენტეხი, 2010 წ',
    'ქვემო სვანეთის ექსპედიცია. ლენტეხი, სოფ. თეკალი, 2009-2010 წ', 'ხმის ჩამწერი სტუდია. ექსპედიცია ქვემო სვანეთში. სოფ. ხელედი, 2009-2010 წ'], 'field', 'svaneti')
al(['მეგრული სიმღერები (ჰარირა) • ალაზანი', 'მეგრული სიმღერები • შევისწავლოთ ქართული ხალხური სიმღერა • ნაწ .1',
    'მეგრული სიმღერები • შევისწავლოთ ქართული ხალხური სიმღერა • ნაწ .2', 'პოლიკარპე ხუბულავა • მეგრული სიმღერები', 'სამეგრელო',
    'უცნობი ჩამწერის კოლექცია • სამეგრელო • 1929 წ', 'ქართული ხალხური მუსიკა (სამეგრელო) • ალაზანი'], 'field', 'samegrelo')
al(['დიმიტრი არაყიშვილის კოლექცია • ოსური სიმღერები • 1923 წ', 'ოსური ხალხური სიმღერები'], 'field', 'oseti')
al(['ძველი თბილისის მუსიკა', 'ქართული ქალაქური სიმღერები'], 'field', 'kalakuri')
# local ensembles: their region only confirms a title the region already has
al(['ვაკიჯვარის ეთნოგრაფიული გუნდი', 'ოზურგეთის სახალხო ანსამბლი შვიდკაცა', 'ოზურგეთის ფოლკლორული ანსამბლი ელესა',
    'ფოლკლორული ანსამბლი გურია - ჩოხატაური', 'ვარლამ სიმონიშვილის გუნდი', 'ვარლამ სიმონიშვილი • ალაზანი',
    'ვარლამ სიმონიშვილი • ქართული ხალხური სიმღერის საერთაშორისო ცენტრი', 'გიგო ერქომაიშვილი • ალაზანი', 'ანანია ერქომაიშვილი • ალაზანი',
    'არტემ ერქომაიშვილი • ალაზანი', 'არტემ ერქომაიშვილის გუნდი', 'ბერძენიშვილები', 'ვლადიმერ ბერძენიშვილი • ალაზანი',
    'ვლადიმერ და ოთარ ბერძენიშვილები', 'სიხარულიძეების ტრიო • ალაზანი', 'ტრიო ტრისტან სიხარულიძე, გური სიხარულიძე და კარლო ურუშაძე',
    'ტრიო ტრისტან სიხარულიძე, გური სიხარულიძე და მერაბ კალანდაძე', 'ილია ზაქაიძე', 'ილია ზაქაიძე • ალაზანი',
    'შემოქმედი • ალაზანი', 'შვიდკაცა • ალაზანი'], 'ens', 'guria')
al(['ვანის ეთნოგრაფიული გუნდი', 'სამტრედიის უხუცესთა ანსამბლი • სანავარდო', 'სანავარდო • ალაზანი', 'სახალხო ანსამბლი საირმე'], 'ens', 'imereti')
al(['ლენტეხის ფოლკლორული ანსამბლი ლილე', 'ანსამბლი რიჰო • ლატალის გუნდი', 'რიჰო • ალაზანი', 'ჯოკია მეშველიანის გუნდი • ალაზანი'], 'ens', 'svaneti')
al(['ონის რაიონის მომღერალთა სახალხო გუნდი'], 'ens', 'racha', 'რაჭა')
al(['პოლიკარპე ხუბულავას გუნდი ოდოია • ალაზანი', 'ტრიფონ ხუხუას ანსამბლი', 'ფოლკლორული ანსამბლი ბედინერა - წალენჯიხა',
    'ფოლკლორული ანსამბლი მაფშალია - წალენჯიხა', 'ჩხოროწყუს ანსამბლი', 'კირილე პაჭკორიას გუნდი', 'ნოკო ხურციას გუნდი',
    'ანსამბლი ჰარირა', 'აფშილავების ოჯახი', 'აფშილავები • ალაზანი'], 'ens', 'samegrelo')
al(['ფოლკლორული ანსამბლი მოყვარე - ქედა, მერისი', 'ფოლკლორული ანსამბლი ქობულეთი', 'ანსამბლი მაჭახელა', 'მაჭახელა • ალაზანი',
    'აიდიო', 'აიდიო • ალაზანი'], 'ens', 'achara')
al(['წინანდლის გუნდი', 'წინანდალი • ალაზანი', 'ლევან ასაბაშვილის (დედას ლევანას) გუნდი', 'დედას ლევანა • ალაზანი',
    'მიხა ჯიღაურის გუნდი', 'მიხა ჯიღაურის გუნდი (2)', 'ჯიღაურის გუნდი • ალაზანი', 'ანდრო სიმაშვილი • ქართული სიმღერის მოამაგენი'], 'ens', 'kakheti')
al(['ანსამბლი ნართები'], 'ens', 'oseti')
A['ერთი შედევრი • კვირია'] = ('one', 'svaneti', None, 'კვირია')
A['ერთი შედევრი • ხასანბეგურა'] = ('one', 'guria', None, 'ხასანბეგურა')
# places whose recordings are of migrants or of other peoples: nothing from the album's place
NO_PLACE = {'ბოლნისის ექსპედიცია, 2007 წელი', 'დმანისი', 'ექსპედიცია პანკისის ხეობაში. სოფ. ჯოყოლო, 2007წ',
            'ქართული მრავალხმიანობა დასავლეთ თურქეთში 1', 'ქართული მრავალხმიანობა დასავლეთ თურქეთში 2',
            'სოფ. დუცხუნის ანსამბლი', 'სოფ. ტობაინერის ანსამბლი', 'ქალთა ფოლკლორული ანსამბლი ბოლნელა',
            'ხმის ჩამწერი სტუდია. მცხეთა 2007 წელი'}

# ── title cleaning ──
MKH = {chr(0x1C90 + i): chr(0x10D0 + i) for i in range(48)}  # Mtavruli → Mkhedruli
def mkh(s): return ''.join(MKH.get(c, c) for c in s)

NOT_SONG = re.compile(r'საუბ|ინტერვიუ|მოთხრობ|ლექსი|ზღაპარ|დასაკრავ|მელოდი|ფანდურზე|ჩონგურზე|სალამურზე|გარმონზე|ჭუნირზე|ჩანგზე|'
                      r'ჭიანურზე|ლარჭემზე|დუდუკზე|ზურნაზე|სტვირზე|ჩიბონზე|ბუზიკზე|დოლზე|საკრავ|ინსტრუმენტ|შესავალი|ანონს|'
                      r'^track|^ტრეკი|^უსათაურო|^სათაურის გარეშე|სახელწოდება|გუნდი$|^ანსამბლ|^\??$')
NOT_SKHVA = re.compile(NOT_SONG.pattern.replace('ლექსი|', ''))  # in „სხვა“ a „ლექსი“ is sung

def clean_title(t):
    t = re.sub(r'[„“”"«»()]', '', t)
    t = re.sub(r'\s+', ' ', t).strip(' .,-–—•')
    return t

def norm(t):
    t = mkh(t).lower()
    t = re.sub(r'\(.*?\)', ' ', t)
    t = re.sub(r'[^ა-ჿ ]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def region_in(text):
    """The first region word in a text (whole word), as (region, area, word)."""
    t = ' ' + re.sub(r'[^ა-ჿ\- ]', ' ', mkh(text).lower()) + ' '
    for w in WORDS:
        if f' {w} ' in t: return R[w] + (w,)
    return None

VOICE = re.compile(r'\s*(?:ხმა\s*(I{1,3}|[123])|(I{1,3}|[123])\s*ხმა)\s*$')
DESC = re.compile(r'\s*[\.,]?\s*(ბოლონაკლული|დასაწყისი|ფრაგმენტი|ნაწყვეტი|დასასრული)\s*\.?', re.I)

def parse(fname, album_prefix, learning=False):
    n = re.sub(r'\.mp3$', '', fname, flags=re.I).replace('_', ' ')
    n = mkh(n)
    for _ in range(3): n = re.sub(r'^\s*\d{1,3}\s*[\.\)]?(?=\s|[^\d])\s*', '', n)  # track numbers
    n = n.lstrip('.-–• ')
    hints, extra, voice = [], [], None
    if album_prefix and n.startswith(album_prefix + ' - '):
        n = n[len(album_prefix) + 3:]
        hints.append(album_prefix)
    m = VOICE.search(n)
    if m:
        v = m.group(1) or m.group(2); voice = {'I': 1, 'II': 2, 'III': 3}.get(v) or int(v); n = n[:m.start()]
    elif learning:
        m = re.search(r'\s+([123])$', n)
        if m: voice = int(m.group(1)); n = n[:m.start()]
    d = DESC.findall(n)
    if d: extra += d; n = DESC.sub(' ', n)
    # "Region. District. Title"
    m = re.match(r'^([^\.(]{2,25})\.\s*(.+)$', n)
    if m and region_in(m.group(1)) and len(m.group(1).split()) <= 2:
        hints.append(m.group(1)); n = m.group(2)
        m2 = re.match(r'^([^\.]{2,25})\.\s+(.+)$', n)
        if m2 and len(m2.group(1).split()) <= 2: hints.append(m2.group(1)); n = m2.group(2)
    if ' • ' in n or n.startswith('• '):
        parts = [p.strip() for p in n.split('•')]
        n, extra = parts[0], [p for p in parts[1:] if p]
    paren = re.findall(r'\(([^)]*)\)?', n)
    if '(' in n: n = n[:n.index('(')]
    # performers and places written after the title
    m = re.search(r'\s*,?\s+(?:სოფ\.?\s|(?:უცნობი\s+)?შემსრულებ|-?სოლისტ|აკომპ|ლოტბარი|ხელმძღვ|,,)', n)
    if m and m.start() > 1: extra.append(n[m.start():].strip(' ,')); n = n[:m.start()]
    m = re.search(r'\s+[ა-ჰV]\.\s?\S+(?:შვილი|ძე|ია|ავა|ანი|ური|ელი|ული|უა)\b', n)
    if m and m.start() > 1: extra.append(n[m.start():].strip()); n = n[:m.start()]
    m = re.match(r'^(.+?)\.\s+(.+)$', n)
    if m and region_in(m.group(2).split(',')[0].split('.')[0]) and m.group(2).split()[0].rstrip('.,') in R:
        hints.append(m.group(2)); extra.append(m.group(2)); n = m.group(1)
    if ', ' in n and is_person(n.split(', ', 1)[1]):
        extra.append(n.split(', ', 1)[1]); n = n.split(', ', 1)[0]
    w = n.split()
    for i in range(1, len(w) - 1):
        if w[i] in R and (len(w) - i - 1 >= 2 or '-' in w[i + 1]):
            hints.append(w[i]); extra.append(' '.join(w[i:])); n = ' '.join(w[:i]); break
    m = re.search(r'\s*[-–]\s+', n)
    if m and m.start() > 1:
        extra.append(n[m.end():]); n = n[:m.start()]
    if ', ' in n:
        a, b = n.split(', ', 1)
        if region_in(b.split(',')[0]) and re.match(r'^\S*(ური|ული|ელი|ეთი|ა)\b', mkh(b)):
            hints.append(b); extra.append(b); n = a
    hints += paren
    # a region named at the end without brackets („ალილო რაჭა“)
    tail = re.match(r'^(.+?)\s+(\S+)$', n.strip())
    if tail and tail.group(2) in R and not region_in(tail.group(1)):
        hints.append(tail.group(2)); n = tail.group(1)
    title = clean_title(re.sub(r'\d+$', '', n.strip()))
    return title, hints, extra, voice

# album prefix: „X - title“ on most files
def prefix_of(names):
    c = collections.Counter(re.sub(r'\.mp3$', '', x).split(' - ')[0].strip() for x in names if ' - ' in x)
    if not c: return None
    p, k = c.most_common(1)[0]
    return p if k >= max(2, 0.6 * len(names)) and not re.match(r'^\d', p) else None

# existing songs
ex_by_region = collections.defaultdict(dict)
ex_titles = collections.defaultdict(set)
for s in existing:
    k = norm(s['title'])
    ex_by_region[s['region']].setdefault(k, s)
    ex_titles[k].add(s['region'])
GENERIC = {k for k, r in ex_titles.items() if len(r) > 1} | {norm(x) for x in [
    'მაყრული', 'მგზავრული', 'მრავალჟამიერი', 'მრავალჟამიერ', 'საცეკვაო', 'სახუმარო', 'ალილო', 'ზარი', 'ნანა', 'ნანინა', 'ნანინაი', 'ფერხული',
    'სატრფიალო', 'შაირები', 'შაირი', 'იავნანა', 'გიგინი', 'ნამგლური', 'ჭონა', 'დიდება', 'ქალის სიმღერა', 'სადღეგრძელო', 'ნადური', 'ურმული',
    'ლაშქრული', 'ტირილი', 'ნატირალი', 'სუფრული', 'ოროველა', 'მთიბლური', 'კალოური', 'მუშური', 'ხელხვავი', 'შემოძახილი', 'ჰერიო',
    'საქორწილო', 'კაფიაობა', 'სიმღერა', 'ლექსი', 'საფერხულო', 'სათამაშო', 'საგმირო', 'სამგლოვიარო', 'წინწყარო', 'ლილე', 'ოდოია',
    'ჰარირა', 'მოძახილი', 'ბატონებო', 'ბატონები', 'ნანა ბატონებო', 'მრავალჟამიერი სუფრული', 'გრძელი კახური', 'კახური მრავალჟამიერი']}

def place_of(hints, title):
    for h in hints:
        r = region_in(h)
        if r: return r
    r = region_in(title)
    return r

by_album = collections.defaultdict(list)
for f in files: by_album[f[1]].append(f)
ex_list = collections.defaultdict(list)
for s in existing: ex_list[(s['region'], norm(s['title']))].append(s)
def ex_song(reg, area, k):
    c = ex_list.get((reg, k), [])
    return next((s for s in c if s.get('area') == area), None) or next((s for s in c if not s.get('area')), None) or (c[0] if c else None)
ROMAN = {1: 'I', 2: 'II', 3: 'III'}

plan_albums, units, why = [], [], collections.Counter()
for ai, (aid, atitle) in enumerate(albums):
    name = album_name(atitle)
    fs = sorted(by_album[aid], key=lambda f: f[2])
    pre = prefix_of([f[2] for f in fs])
    info = A.get(name)
    learning = 'შევისწავლოთ' in name or 'სასწავლო ჩანაწერები' in name
    parsed = []
    for fid, _, fname, size, _ in fs:
        title, hints, extra, voice = parse(fname, pre, learning)
        if fid in SKHVA: hints += [e for e in extra if region_in(e)]  # „თაგუნა - აჭარული სიმღერა“
        if fid in FORCE: title, extra = FORCE[fid][2], [FORCE[fid][4]]
        if fid in INSTRUMENT: title, extra = INSTRUMENT[fid][1], [INSTRUMENT[fid][2]]
        if info and info[0] == 'one':
            extra = ([title] if title and title != info[3] else []) + extra
            title = info[3]
        parsed.append(dict(id=fid, fname=fname, size=size, title=title, hints=hints, extra=extra, voice=voice))
    # the album as the Drive has it: every file, in order
    plan_albums.append({'id': aid, 'name': name, 'tracks': [
        [p['id'], (p['title'] or re.sub(r'\.mp3$', '', p['fname'])) + (f' · {ROMAN[p["voice"]]} ხმა' if p['voice'] else ''),
         '; '.join(x for x in p['extra'] if x)[:90], site_by_size.get(p['size'])] for p in parsed]})
    # learning albums: the full take and its voices make one recording
    groups = []
    if learning:
        for p in parsed:
            k = norm(p['title'])
            g = groups[-1] if groups and groups[-1]['key'] == k else None
            if g and len(g['files']) < 4: g['files'].append(p)
            else: groups.append({'key': k, 'files': [p]})
        for g in groups:
            slots = {}
            if len(g['files']) == 4: slots = dict(zip(['all', 1, 2, 3], g['files']))
            else:
                for p in g['files']:
                    s = p['voice'] or 'all'
                    if s in slots: s = next((x for x in ['all', 1, 2, 3] if x not in slots), None)
                    if s: slots[s] = p
            g['slots'] = slots
    else:
        groups = [{'key': norm(p['title']), 'files': [p], 'slots': {'all': p}} for p in parsed]
    for g in groups:
        first = g['files'][0]
        units.append(dict(album=name, ai=ai, info=info, slots=g['slots'], files=g['files'], title=first['title'], key=g['key'],
                          hints=sum((p['hints'] for p in g['files']), []), extra=first['extra'] if len(g['files']) == 1 else []))

# the same recording twice (one file in two albums): only the first, albums of the „ალაზანი“ series last
seen = set()
binds = []
instruments = []
for u in sorted(units, key=lambda u: (u['album'].endswith('ალაზანი'), u['ai'])):
    fid = u['files'][0]['id']
    if fid in INSTRUMENT:
        instruments.append({'file': fid, 'instrument': INSTRUMENT[fid][0], 'title': INSTRUMENT[fid][1], 'note': INSTRUMENT[fid][2],
                            'album': albums[u['ai']][0], 'name': u['album']})
        why['other: an instrument'] += 1; continue
    if fid in ALBUM_ONLY: why['album only'] += 1; continue
    if fid in FORCE:
        reg, area, title, song, note = FORCE[fid]
        binds.append({'region': reg, 'area': area, 'title': title, 'key': norm(title), 'song': song, 'how': 'hand', 'album': u['album'],
                      'ai': u['ai'], 'note': note, 'all': fid, 'voices': None})
        why['bound by hand' + (' → existing' if song else ' → new')] += 1; continue
    if fid in SKHVA and SKHVA_CHANT.search(u['title']): why['other: a chant (album only)'] += 1; continue
    sizes = {p['size'] for p in u['files']}
    if sizes & site_sizes: why['dup (already on the site)'] += len(u['files']); continue
    if sizes & seen: why['dup (twice in the centre)'] += len(u['files']); continue
    seen |= sizes
    k, title, info, name = u['key'], u['title'], u['info'], u['album']
    only_regions = not re.sub('|'.join(map(re.escape, WORDS)), '', k).replace('-', '').strip()
    georgian = len(re.findall(r'[\u10d0-\u10ff]', title)) >= 0.6 * len(re.sub(r'\W', '', title) or 'x')
    ns = NOT_SKHVA if fid in SKHVA else NOT_SONG
    if (not k or len(k) < 2 or ns.search(k) or any(ns.search(norm(p['fname'])) for p in u['files']) or only_regions
            or not georgian or is_person(title) or (norm(name).startswith(k) and not (info and info[0] == 'one'))
            or 'ტრადიციული მუსიკა' in k):
        why['not a song / no title'] += len(u['files']); continue
    pl = place_of(u['hints'], title)
    target = None
    if info and info[0] in ('field', 'one') and name not in NO_PLACE:
        target = ((pl[0], pl[1]) if pl and (pl[0] != info[1] or pl[1]) else (info[1], info[2])) + ('field',)
    elif pl and name not in NO_PLACE:
        target = (pl[0], pl[1], 'hint')
    elif info and info[0] == 'ens' and ex_song(info[1], info[2], k) and k not in GENERIC:
        target = (info[1], info[2], 'ens')
    if not target and k not in GENERIC and len(ex_titles.get(k, ())) == 1:
        target = (next(iter(ex_titles[k])), None, 'title')
    if not target: why['album only'] += len(u['files']); continue
    reg, area, how = target
    song = ex_song(reg, area, k)
    why[f'bound {how}' + (' → existing' if song else ' → new')] += len(u['files'])
    sl = u['slots']
    binds.append({'region': reg, 'area': area, 'title': title, 'key': k, 'song': song['id'] if song else None, 'how': how,
                  'album': name, 'ai': u['ai'], 'note': '; '.join(x for x in u['extra'] if x)[:80],
                  'all': sl['all']['id'] if 'all' in sl else None,
                  'voices': [sl[i]['id'] if i in sl else None for i in (1, 2, 3)] if len(u['files']) > 1 else None})
    if not binds[-1]['voices']: binds[-1]['all'] = u['files'][0]['id']

mtkmeli = [{'id': aid, 'name': name, 'tracks': [[r[0], *mt_track(r[2])] for r in sorted(fs, key=lambda r: r[2])]}
           for aid, name, fs in mt_albums]
json.dump({'albums': plan_albums, 'binds': binds, 'mtkmeli': mtkmeli, 'instruments': instruments},
          open(f'{INV}/plan.json', 'w'), ensure_ascii=False)
for k, v in sorted(why.items()): print(f'{v:5}  {k}')
print('recordings bound:', len(binds), '| new songs:', len({(b['region'], b['area'], b['key']) for b in binds if not b['song']}),
      '| existing songs that get recordings:', len({b['song'] for b in binds if b['song']}))
print(collections.Counter(b['region'] for b in binds))
