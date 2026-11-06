"""Etnofori videos for the app's „ვიდეოები“ page → src/data/etnoforiVideos.json (never edit that file by hand).

    yt-dlp --flat-playlist --print "%(id)s\\t%(title)s\\t%(duration)s" https://www.youtube.com/@etnofori/videos > /tmp/etno.tsv
    python3 scripts/etnofori/build.py /tmp/etno.tsv

A song goes to the region its title names (the village's municipality, usually in the last brackets); full episodes
(≥ 15 min) go to their own list by date; announcements, promos and titles that name no place are left out.
"""
import datetime, json, os, re, sys

sys.path.insert(0, os.path.dirname(__file__))
from episodes import parse  # noqa: E402
from places import song_place  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'src', 'data', 'etnoforiVideos.json')

EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿\U000E0000-\U000E007F️‍]')


def tidy(s):
    s = s.replace('#დარჩისახლში', 'დარჩი სახლში ·')
    s = EMOJI.sub(' ', s).replace('#', '').replace('©', '').replace('_', ' ')
    s = re.sub(r'(?<=[^\s(])\(', ' (', s).replace("''", '"')
    s = re.sub(r'\s*\|\s*', ' · ', s)
    return re.sub(r'\s+', ' ', s).strip(' |/•·-')


def song_name(s):
    s = tidy(s)
    if len(s) > 1 and s[0] in '„"«“' and s.count('"') + s.count('“') + s.count('„') <= 2:
        s = s[1:]
        s = re.sub(r'["“”»]', '', s, count=1)
    return s.strip()


def read(path):
    rows = []
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        parts = line.split('\t') if '\t' in line else line.split('\\t')
        if len(parts) < 3:
            continue
        try:
            dur = int(float(parts[-1]))
        except ValueError:
            dur = 0
        rows.append((parts[0], '\t'.join(parts[1:-1]).strip(), dur))
    return rows


def main(path):
    songs, episodes, left = [], [], 0
    for vid, title, dur in read(path):
        low = title.lower()
        if 'ანონსი' in title or 'promo' in low or 'პრომო' in title or 'cover' in low or dur < 50:
            continue
        is_show = bool(re.match(r'^[#„"«]?\s*ეთნოფორი', title)) or 'etnopori' in low or 'etnofori' in low
        if is_show and dur >= 900:
            num, date, part = parse(title)
            if num and date:
                episodes.append([vid, num, date, part or '', dur])
            continue
        hit = song_place(title)
        if not hit:
            left += 1
            continue
        region, place = hit
        head, sep, tail = title.partition('•')
        songs.append([vid, song_name(head), tidy(tail) if sep else '', region, place, dur])
    episodes.sort(key=lambda e: datetime.datetime.strptime(e[2], '%d.%m.%Y'), reverse=True)
    data = {'updated': datetime.date.today().isoformat(), 'songs': songs, 'episodes': episodes}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    print(f'songs {len(songs)} · episodes {len(episodes)} · left out {left} → {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main(sys.argv[1])
