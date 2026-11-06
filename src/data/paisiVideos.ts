// „ვიდეოები“ → „წმინდა პაისი“ (2026-11-07, the user: „ეს სერიალი დაამატე მთლიანად ყველა სეზონი … ცალკე სექციად“ — TV Imedi's two
// seasons, the whole of what its channel has —, then „ესეც მიაბი“: „პაისი ათონელი“ in Georgian, Irakli Aslanikashvili's playlist).
// Episodes are [YouTube id, number, seconds].

export type PaisiEpisode = [id: string, n: number, secs: number];
export interface PaisiPart { id: string; label: string; sub: string; eps: PaisiEpisode[] }

export const PAISI_PARTS: PaisiPart[] = [
  { id: 's1', label: 'სეზონი 1', sub: '„იმედის“ სერიალი', eps: [
    ['YmFse09tPUo', 1, 3004],
    ['DYr5M3LgqGk', 2, 2832],
    ['5FfMx215hbA', 3, 3039],
    ['RZfM71YEQO4', 4, 2568],
    ['c4Aa7F-aorg', 5, 2617],
    ['znkK6ogOnFM', 6, 2566],
    ['5KhhZ4QnB2Y', 7, 2671],
    ['21CekmUXb8I', 8, 3039],
    ['eJlQIqPDvZA', 9, 3494],
  ] },
  { id: 's2', label: 'სეზონი 2', sub: '„იმედის“ სერიალი', eps: [
    ['4evJ-7HDk0Q', 1, 3811],
    ['A-wogjJT6Yc', 2, 3738],
    ['RnI67dbP3m8', 3, 3849],
    ['JLkY07CGp64', 4, 3673],
    ['u5cFgT8e5mc', 5, 3710],
    ['GDea9jcrYzY', 6, 3904],
    ['JJfwN1hgm7c', 7, 3844],
    ['mPAb0u0Lpuw', 8, 3896],
    ['iZtRO2Pf588', 9, 3987],
    ['K9shPAmMjik', 10, 3970],
    ['qTtEFU_gH1c', 11, 3906],
    ['5KBsnc-ZBak', 12, 4728],
  ] },
  { id: 'dub', label: 'ქართული გახმოვანებით', sub: '„პაისი ათონელი“', eps: [
    ['JxhH9w_FNtk', 1, 3092],
    ['gv2BUm7A7hU', 2, 3087],
    ['Px2LtZcVS3c', 3, 3100],
    ['7CXrHS7s8fk', 4, 3102],
    ['8jG2wumhRsA', 5, 3153],
    ['uWna3AabmbI', 6, 3086],
    ['--DwrN28A84', 7, 3131],
  ] },
];
