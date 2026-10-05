// "ღირს არს"-ის ნაცვლად საკითხავი (orthodoxy.ge/lotsvani/girsars.htm): which hymn replaces
// "ღირს არს ჭეშმარიტად" today. Texts: public/prayers/girs-ars.json { sections: [{ title, note, html }] }.
// Fixed feasts are given in the old (Julian) style; in 1900–2099 that is 13 days behind the civil date.

export interface GirsArsSection {
  title: string;
  note: string;
  html: string;
}

const DAY = 86_400_000;
const atNoon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();

// Orthodox Pascha as a civil (Gregorian) date: Julian computus + 13 days.
export const orthodoxEaster = (year: number): number => {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return atNoon(year, month, day + 13);
};

// [from, to] inclusive, as days relative to Pascha
const PASCHAL: Record<string, [number, number]> = {
  'ბზობის კვირას': [-7, -7],
  'დიდ ორშაბათს': [-6, -6],
  'დიდ სამშაბათს': [-5, -5],
  'დიდ ოთხშაბათს': [-4, -4],
  'დიდ ხუთშაბათს': [-3, -3],
  'დიდ პარასკევს': [-2, -2],
  'დიდ შაბათს': [-1, -1],
  'აღდგომიდან ამაღლებამდე': [0, 38],
  'ამაღლებიდან სულთმოფენობამდე': [39, 48],
  'სულთმოფენობიდან ყოველთა წმიდათა კვირიაკემდე': [49, 55],
};

// old-style [month, day] to [month, day], inclusive
const FIXED: Record<string, [[number, number], [number, number]]> = {
  'ფერისცვალებიდან მის წარგზავნამდე': [[8, 6], [8, 14]],
  'ღმრთისმშობლის მიძინებიდან მის წარგზავნამდე': [[8, 15], [8, 25]],
  'ღმრთისმშობლის შობიდან მის წარგზავნამდე': [[9, 8], [9, 13]],
  'ჯუართამაღლებიდან მის წარგზავნამდე': [[9, 14], [9, 22]],
  'ღმრთისმშობლის ტაძრად მიყვანებიდან მის წარგზავნამდე': [[11, 21], [11, 26]],
  'ქრისტეს შობიდან მის წარგზავნამდე': [[12, 25], [12, 31]],
  'წინადაცუეთას': [[1, 1], [1, 1]],
  'წინადაცვეთას': [[1, 1], [1, 1]],
  'ნათლისღებას': [[1, 6], [1, 6]],
  'მირქმას': [[2, 2], [2, 2]],
  'ხარებას': [[3, 25], [3, 25]],
};

// The sections that apply on the given day (usually none or one).
export const girsArsFor = (sections: GirsArsSection[], date = new Date()): GirsArsSection[] => {
  const y = date.getFullYear();
  const today = atNoon(y, date.getMonth() + 1, date.getDate());
  const easter = orthodoxEaster(y);
  return sections.filter(s => {
    const paschal = PASCHAL[s.title];
    if (paschal) {
      const offset = Math.round((today - easter) / DAY);
      return offset >= paschal[0] && offset <= paschal[1];
    }
    const fixed = FIXED[s.title];
    if (!fixed) return false;
    // the old-style date that falls on today
    const old = new Date(today - 13 * DAY);
    const md = (old.getMonth() + 1) * 100 + old.getDate();
    return md >= fixed[0][0] * 100 + fixed[0][1] && md <= fixed[1][0] * 100 + fixed[1][1];
  });
};

let cache: Promise<GirsArsSection[]> | null = null;
export const loadGirsArs = (): Promise<GirsArsSection[]> =>
  (cache ??= fetch('/prayers/girs-ars.json')
    .then(r => r.json())
    .then((d: { sections: GirsArsSection[] }) => d.sections)
    .catch(err => {
      cache = null;
      throw err;
    }));
