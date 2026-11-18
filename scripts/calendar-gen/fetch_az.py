import sys, json, re, html, datetime, concurrent.futures, urllib.request, os, time
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'az.jsonl')
start = datetime.date(2026,1,14); end = datetime.date(2028,1,13)
have = set()
if os.path.exists(OUT):
    for l in open(OUT): have.add(json.loads(l)['date'])
dates = []
d = start
while d <= end:
    if d.isoformat() not in have: dates.append(d.isoformat())
    d += datetime.timedelta(days=1)
def get(iso):
    url = f'https://azbyka.ru/days/{iso}'
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 (calendar check)'})
            s = urllib.request.urlopen(req, timeout=40).read().decode('utf-8')
            m = re.search(r'<meta name="description" content="([^"]*)"', s)
            desc = html.unescape(m.group(1)) if m else ''
            g = re.search(r'Глас\s*(\d)', s)
            a = s.find('class="readings-text"'); b = s.find('Богослужебные чтения дня', a)
            rd = s[a:b] if a > 0 else ''
            return {'date': iso, 'desc': desc, 'glas': int(g.group(1)) if g else None, 'r': rd}
        except Exception as e:
            time.sleep(2*(i+1))
    return {'date': iso, 'error': True}
with open(OUT,'a') as f, concurrent.futures.ThreadPoolExecutor(4) as ex:
    for n, res in enumerate(ex.map(get, dates)):
        f.write(json.dumps(res, ensure_ascii=False)+'\n')
        if n % 100 == 0: print(n, res['date'], flush=True)
print('done', len(dates))
