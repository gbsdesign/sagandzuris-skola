import os, sys
import pymupdf
b = os.path.normpath(os.path.expanduser('~/Downloads/ქართული გალობა - galobani.ge'))
L = chr(92) * 2 + '?' + chr(92)
p = os.path.join(b, '01 ანთოლოგიის ტომეულები')
names = sorted(os.listdir(L + p))
vol, page, dpi = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
doc = pymupdf.open(L + os.path.join(p, names[vol - 1]))
pg = doc[page - 1]
print('size', pg.rect)
pg.get_pixmap(dpi=dpi).save(sys.argv[4])
