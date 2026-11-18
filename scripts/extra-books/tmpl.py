import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
BAND = {}
MKH = 'აბგდევზჱთიკლმნჲოპჟრსტჳუფქღყშჩცძწჭხჴჯჰჵ'
def templates(fontpath, chars, px=80, band=None):
    f = ImageFont.truetype(fontpath, px)
    recs = []
    for ch in chars:
        im = Image.new('L', (px * 3, px * 3), 0); dr = ImageDraw.Draw(im)
        dr.text((px, px), ch, fill=255, font=f, anchor='ls')  # baseline at y=px
        a = np.array(im); ys, xs = np.nonzero(a > 100)
        if len(ys) == 0: continue
        recs.append((ch, a[ys.min():ys.max() + 1, xs.min():xs.max() + 1], ys.min() - px, ys.max() + 1 - px))
    hs = np.array([r[3] - r[2] for r in recs]); tops = np.array([r[2] for r in recs]); bots = np.array([r[3] for r in recs])
    h0 = float(np.median(hs)); cy = float(np.median((tops + bots) / 2))
    BAND[fontpath] = (cy, h0)
    if band: cy, h0 = band
    out = []
    for ch, crop, top, bot in recs:
        h, w = crop.shape; s = max(w, h); pad = np.zeros((s, s), np.uint8)
        pad[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = crop
        small = cv2.resize(pad, (20, 20), interpolation=cv2.INTER_AREA)
        f = np.concatenate([small.flatten() / 255.0, [(top - cy) / h0 * 2, (bot - cy) / h0 * 2, w / h0 * 2]])
        out.append((ch, f.astype(np.float32)))
    return out
