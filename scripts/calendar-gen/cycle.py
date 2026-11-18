"""The movable cycle: Pascha, weeks after Pentecost, tones, special Sundays/Saturdays."""
import datetime
D = datetime.date
TD = datetime.timedelta
WD = ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი', 'კვირა']
ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII']
def julian_to_greg(y, m, d):
    # valid 1900-2099 (+13); 2100 handled by the general formula
    jd = D(y, m, d).toordinal() if not (m == 2 and d == 29) else D(y, 2, 28).toordinal() + 1
    off = 13 if D(y, m, 1) < D(2100, 3, 1) else 14
    return D.fromordinal(jd + off)
def pascha(y):
    a = y % 4; b = y % 7; c = y % 19
    d = (19*c + 15) % 30; e = (2*a + 4*b - d + 34) % 7
    m = (d + e + 114) // 31; day = (d + e + 114) % 31 + 1
    return julian_to_greg(y, m, day)
def old_style(x):
    """new-style date -> (old year, old month, old day)"""
    off = 13 if x < D(2100, 3, 14) else 14
    o = D.fromordinal(x.toordinal() - off)
    return o
def ordinal_ka(n):
    if n == 1: return '1-ლი'
    if n < 20: return f'მე-{n}'
    if n % 20 == 0 or n in (40, 60, 80, 100): return f'მე-{n}'
    return f'{n}-ე'
class Cycle:
    """for a church (old-style) year Y: days from new-style Jan 14 Y to Jan 13 Y+1"""
    def __init__(self, Y):
        self.Y = Y
        self.P = pascha(Y)
        self.Pprev = pascha(Y - 1)
        self.Pnext = pascha(Y + 1)
    def k(self, x):
        return (x - self.P).days
    def pentecost_base(self, x):
        """Pentecost Sunday whose 'after Pentecost' count covers x"""
        pc = self.P + TD(days=49)
        if x <= pc: return self.Pprev + TD(days=49)
        return pc
    def ap_week(self, x):
        """Apostle (and title) week after Pentecost: (n, is_sunday)"""
        pc = self.pentecost_base(x)
        days = (x - pc).days
        if x.weekday() == 6: return days // 7, True
        return days // 7 + 1, False
    def tone(self, x):
        """Sunday tone; Thomas Sunday = I"""
        # find Pascha of this cycle (the latest Pascha <= x)
        p = self.P if x >= self.P else self.Pprev
        sundays = (x - p).days // 7          # Thomas = 1
        if sundays == 0: return None
        return (sundays - 1) % 8 + 1
    def triodion(self, x):
        return -70 <= self.k(x) <= 56
def roman(n):
    vals = [(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]
    out = ''
    for v, s in vals:
        while n >= v: out += s; n -= v
    return out
def week_ord(n):
    return 'I' if n == 1 else ordinal_ka(n)
def ordinary_title(c, x):
    n, sun = c.ap_week(x)
    if sun:
        return f'{week_ord(n)} კვირიაკე შემდგომად მეერგასისა. ხმა {roman(c.tone(x))}.'
    return f'{week_ord(n)} შვიდეული შემდგომად მეერგასისა. {WD[x.weekday()]}'
