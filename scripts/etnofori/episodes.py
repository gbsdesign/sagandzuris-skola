"""Read an episode's number and date from its title (Georgian ordinal words → digits)."""
import difflib, re

UNITS = {'პირველი': 1, 'მეერთე': 1, 'მეორე': 2, 'მესამე': 3, 'მეოთხე': 4, 'მეხუთე': 5, 'მეექვსე': 6, 'მეშვიდე': 7,
         'მერვე': 8, 'მეცხრე': 9, 'მეათე': 10, 'მეთერთმეტე': 11, 'მეთორმეტე': 12, 'მეცამეტე': 13, 'მეთოთხმეტე': 14,
         'მეთხუთმეტე': 15, 'მეთექვსმეტე': 16, 'მეჩვიდმეტე': 17, 'მეთვრამეტე': 18, 'მეცხრამეტე': 19, 'მეოცე': 20,
         'მეორმოცე': 40, 'მესამოცე': 60, 'მეოთხმოცე': 80, 'მეასე': 100, 'მეორასე': 200, 'მესამასე': 300}
HUNDREDS = [('სამას', 300), ('ორას', 200), ('ას', 100)]
TENS = [('ოთხმოცდა', 80), ('სამოცდა', 60), ('ორმოცდა', 40), ('ოცდა', 20)]


def ordinal(word):
    s, n = word, 0
    if s in UNITS:
        return UNITS[s]
    for p, v in HUNDREDS:
        if s.startswith(p) and not s.startswith(p + 'ე'):
            n, s = v, s[len(p):]
            if s.startswith('ამოცდა'):        # „ასამოცდა…“ = ას + სამოცდა
                s = 'ს' + s
            break
    for p, v in TENS:
        if s.startswith(p):
            n, s = n + v, s[len(p):]
            break
    if s in UNITS:
        return n + UNITS[s]
    near = difflib.get_close_matches(s, UNITS.keys(), n=1, cutoff=0.8)
    return n + UNITS[near[0]] if near else None


def parse(title):
    date = None
    m = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', title)
    if m:
        date = f'{int(m[1]):02d}.{int(m[2]):02d}.{m[3]}'
    num = None
    m = re.search(r'№\s*(\d+)\s*[–-]\s*(\d+)', title)
    if m:
        num = f'{m[1]}–{m[2]}'
    else:
        m = re.search(r'გადაცემა\s+([ა-ჰ]+)', title)
        if m:
            v = ordinal(m[1])
            num = str(v) if v else None
    part = None
    if 'ნაწილი_პირველი' in title or 'ნაწილი პირველი' in title:
        part = 'I ნაწილი'
    elif 'ნაწილი_მეორე' in title or 'ნაწილი მეორე' in title:
        part = 'II ნაწილი'
    return num, date, part
