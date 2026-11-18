import sys, json
G = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'src', 'data', 'calendar', '2027.json')))['days']
def show(iso):
    d = G[iso]
    print('=====', iso, '|', d['t'])
    for p in d['p']:
        t = ''.join(r[0] for r in p)
        if t.strip(): print('   ' + t.replace('\n', '\n   '))
        else: print('   ·')
    print('   saints:', [(s['n'][:25], s.get('l')) for s in d['s']][:6])
if __name__ == '__main__':
    for a in sys.argv[1:]: show(a)
