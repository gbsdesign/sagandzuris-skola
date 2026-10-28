"""Makes the site's ხუცური fonts from the nuskhuri fonts of the „საღვთისმსახურო წიგნები“ app.

Those fonts are typed the old AcadNusx way: Latin keys draw Georgian letters (a = ⴀ, T = ⴇ, R = ⴖ …). Here every
glyph is moved to the Unicode Georgian code points instead, so ordinary Georgian text shows in nuskhuri without
being changed (copying and search keep working):

  public/fonts/sg-nuskhuri.woff     nuskhuri small letters for mkhedruli ა…ჵ and nuskhuri ⴀ…ⴥ   (from nusxuri.ttf)
  public/fonts/sg-asomtavruli.woff  asomtavruli capitals for mkhedruli ა…ჵ and asomtavruli Ⴀ…Ⴥ  (from nusxurididi.ttf)

Usage: python3 scripts/fonts/build-sg-nuskhuri.py <folder with nusxuri.ttf and nusxurididi.ttf> public/fonts
(the two fonts are res/raw/assets_fonts_nusxuri.ttf and …nusxurididi.ttf inside the app's APK)."""
import os, sys
from fontTools.ttLib import TTFont
from fontTools import subset

# Georgian in Unicode order (ა … ჰ, then the old letters ჱ ჲ ჳ ჴ ჵ) and the key that draws each one in the app's fonts
ORDER = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵ'
KEYS = 'abgdevzTiklmnopJrstufqRySCcZwWxjhEIVXH'
PUNCT = ' ,.:;?!-'

def build(src, dst, family, blocks):
    font = TTFont(src)
    latin = font.getBestCmap()
    new = {}
    for k, (letter, key) in enumerate(zip(ORDER, KEYS)):
        glyph = latin.get(ord(key))
        if not glyph:
            raise SystemExit(f'{src}: no glyph for {key!r} ({letter})')
        for base in blocks:                 # mkhedruli and the old script's own block
            new[base + k] = glyph
    for ch in PUNCT:
        if ord(ch) in latin:
            new[ord(ch)] = latin[ord(ch)]
    # only these code points stay: digits and Latin letters (titlo marks in these fonts) fall back to the next font
    for table in font['cmap'].tables:
        if table.isUnicode():
            table.cmap = {cp: g for cp, g in new.items() if table.format != 0 or cp < 256}
    font['cmap'].tables = [t for t in font['cmap'].tables if t.isUnicode() and t.format in (4, 12)]
    if not font['cmap'].tables:
        raise SystemExit('no unicode cmap')
    for rec in font['name'].names:
        if rec.nameID in (1, 4, 16):
            rec.string = family
        elif rec.nameID == 6:
            rec.string = family.replace(' ', '')
    opts = subset.Options()
    opts.flavor = 'woff'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=list(new))
    sub.subset(font)
    font.flavor = 'woff'
    font.save(dst)
    print(f'{dst}: {len(new)} code points, {os.path.getsize(dst)} bytes')

if __name__ == '__main__':
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    build(os.path.join(src, 'nusxuri.ttf'), os.path.join(out, 'sg-nuskhuri.woff'), 'SG Nuskhuri', (0x10D0, 0x2D00))
    build(os.path.join(src, 'nusxurididi.ttf'), os.path.join(out, 'sg-asomtavruli.woff'), 'SG Asomtavruli', (0x10D0, 0x10A0))
