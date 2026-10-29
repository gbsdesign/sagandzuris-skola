import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from omr import open_vol, Page, read_system
N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B']
vol, p, y = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3])
P = Page(open_vol(vol)[p - 1])
s = [s for s in P.systems() if abs(s[0]['top'] - y) < 3][0]
for k, v in enumerate(read_system(P, s)):
    print(k, ' '.join(('R' if e['rest'] else N[e['midi'] % 12] + str(e['midi'] // 12 - 1)) + '/%g@%d' % (round(e['beats'], 2), e['x']) for e in v))
