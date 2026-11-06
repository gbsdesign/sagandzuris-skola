"""Which region an Etnofori song's title names (used by build.py)."""
import re

# place word -> (region id, place label shown on the chips)
PLACES = {
    'kalakuri': ['თბილისი'],
    'guria': ['ოზურგეთი', 'ლანჩხუთი', 'ლანხუთი=ლანჩხუთი', 'ჩოხატაური', 'ჩოხატარური=ჩოხატაური',
              'შემოქმედის ეპარქია', 'შემოქმედ=შემოქმედის ეპარქია', 'ბახმარო', 'გურია', 'გურნა=ჩოხატაური', 'ნასაკირალი=ოზურგეთი'],
    'kakheti': ['თელავი', 'ახმეტა', 'ყვარელი', 'საგარეჯო', 'სიღნაღი', 'დედოფლისწყარო', 'გურჯაანი', 'ლაგოდეხი',
                'ალავერდის ეპარქია', 'ალავერიდ ეპარქია=ალავერდის ეპარქია', 'შატო მერე=თელავი', 'კახეთი', 'თუშეთ=ახმეტა',
                'პანკისი=ახმეტა', 'წინანდალი=თელავი'],
    'achara': ['შუახევი', 'ქედა', 'ბათუმი', 'ხულო', 'ქობულეთი', 'ხელვაჩაური', 'სხალთის ხეობა=ხულო',
               'ბათმ–ლაზეთის ეპარქია=ბათუმ-ლაზეთის ეპარქია', 'ბათუმ-ლაზეთის ეპარქია', 'აჭარა'],
    'samegrelo': ['ზუგდიდი', 'სენაკი', 'აბაშა', 'წალენჯიხა', 'ფოთი', 'მარტვილი', 'ჩხოროწყუ', 'ხობი',
                  'ზუგდიდისა და ცაიშის ეპარქია', 'სამეგრელო'],
    'svaneti': ['ლენტეხი', 'მესტია', 'ქვემო სვანეთი=ლენტეხი', 'სვანეთი'],
    'imereti': ['ქუთაისი', 'ვანი', 'წყალტუბო', 'ზესტაფონი', 'საჩხერე', 'ხარაგაული', 'თერჯოლა', 'თრჯოლა=თერჯოლა',
                'ტყიბული', 'ბაღდათი', 'ჭიათურა', 'სამტრედია', 'ოკრიბა=ტყიბული', 'იმერეთი'],
    'mtianeti': ['ყაზბეგი', 'სტეფანწმინდა=ყაზბეგი', 'დუშეთი', 'ფშავი=დუშეთი', 'მცხეთა', 'თიანეთი', 'ხევსურეთ=დუშეთი'],
    'samtskhe': ['ბორჯომი', 'წაღვერი=ბორჯომი', 'ახალციხე', 'ადიგენი', 'ასპინძა', 'ახალქალაქი', 'ნინოწმინდა'],
    'kvemokartli': ['გარდაბანი', 'ბოლნისი', 'წალკა', 'თეთრიწყარო', 'რუსთავი', 'მარნეული', 'დმანისი'],
    'shidakartli': ['კასპი', 'გორი', 'ქარელი', 'ხაშური', 'სურამისა და ხაშურის ეპარქია=ხაშური'],
    'racha': ['ონი', 'ამბროლაური', 'ქვემო რაჭა=ამბროლაური', 'ცაგერი', 'ლენტეხი_', 'ლეჩხუმი', 'რაჭა'],
    'lazeti': ['ლაზეთი'],
    'abkhazeti': ['ოჩამჩირე', 'სოხუმი', 'გაგრა', 'გალი', 'აფხაზეთი'],
}
ABROAD = [('🇳🇱', 'ნიდერლანდები'), ('ნიდერლანდ', 'ნიდერლანდები'), ('🇹🇷', 'თურქეთი'), ('თურქეთ', 'თურქეთი'),
          ('🇨🇦', 'კანადა'), ('კანად', 'კანადა'), ('🇫🇷', 'საფრანგეთი'), ('საფრანგეთ', 'საფრანგეთი'),
          ('კატალონი', 'კატალონია'), ('🇪🇸', 'კატალონია'), ('🇺🇸', 'აშშ'), ('🇩🇪', 'გერმანია'), ('🇮🇹', 'იტალია'),
          ('🇬🇷', 'საბერძნეთი'), ('🇧🇪', 'ბელგია'), ('🇬🇧', 'ბრიტანეთი'), ('🇵🇱', 'პოლონეთი'), ('🇮🇷', 'ირანი'),
          ('ფერეიდან', 'ირანი'), ('🇦🇿', 'აზერბაიჯანი'), ('საინგილო', 'საინგილო')]

table = []  # (word, region, label), longest first
for reg, words in PLACES.items():
    for w in words:
        word, _, label = w.partition('=')
        if word.endswith('_'):
            continue
        table.append((word, reg, label or word))
table.sort(key=lambda x: -len(x[0]))


REGION_LEVEL = {'გურია', 'აჭარა', 'იმერეთი', 'რაჭა', 'სამეგრელო', 'კახეთი', 'სვანეთი', 'აფხაზეთი', 'ლეჩხუმი'}
G = 'ა-ჰ'


def matches(text):
    """every place word in the text, as (position, word, region, label); a word must start a word,
    and short ones (≤ 4 letters, e.g. ონი, ვანი) must end one too"""
    out = []
    for word, reg, label in table:
        tail = '(?![' + G + '])' if len(word) <= 4 else ''
        for m in re.finditer('(?<![' + G + '])' + re.escape(word) + tail, text):
            out.append((m.start(), word, reg, label))
    # a word inside a longer one found at the same place (ლაზეთი in ბათუმ-ლაზეთის ეპარქია) does not count
    spans = [(p, p + len(w)) for p, w, _, _ in out]
    return [f for f in out
            if not any(s <= f[0] and f[0] + len(f[1]) <= e and (s, e) != (f[0], f[0] + len(f[1])) for s, e in spans)]


def place_of(text):
    found = matches(text)
    if not found:
        return None
    specific = [f for f in found if f[3] not in REGION_LEVEL]
    pool = specific or found
    best = max(pool, key=lambda f: (f[0], len(f[1])))   # the last one named — places come at the end
    return best[2], best[3]


def song_place(title):
    """(region id, place) a song's title names, or None. Region ids are the songs map's, plus „lazeti“ and „abroad“."""
    head, sep, tail = title.partition('•')
    where = tail if sep else title
    hit = None
    lz = place_of(where)
    if lz and lz[0] == 'lazeti':
        hit = lz
    for mark, country in ([] if hit else ABROAD):
        if mark in where:
            hit = ('abroad', country); break
    if not hit:
        paren = re.findall(r'\(([^()]*)\)', where)
        if paren:
            inside = place_of(paren[-1])
            if inside and inside[1] not in REGION_LEVEL:
                hit = inside
    if not hit:
        hit = place_of(where)
    return hit
