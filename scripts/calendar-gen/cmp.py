import sys, json, re
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from azg import groups
G = json.load(open(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', '..', 'src', 'data', 'calendar', '2027.json')))['days']
def show(iso):
    d = G[iso]
    body = [''.join(r[0] for r in p) for p in d['p']]
    i = body.index('') if '' in body else 1
    rd = [l for p in body[i:] for l in p.split('\n') if 'დას' in l or 'ჟამ' in l or 'მწუხრ' in l]
    print('==', iso, d['t'][:60])
    for l in rd: print('   G:', l[:150])
    print('   AZ:', ' | '.join(f"{g['g'][:14]}/{g['s']}:{','.join(b+z.strip(' .') for b,cv,z in g['refs'])}" for g in groups(iso)))
for a in sys.argv[1:]: show(a)
