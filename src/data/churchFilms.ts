import { MONASTERY_FILMS } from './monasteryVideos';

// A church's TV reports (data/monasteryVideos.ts) in its window on „ეკლესია-მონასტრები“: the reports' monastery → the
// church's id in data/churches.json. Picked by hand on 2026-11-07 (name and village checked against the list); left out
// where the list has no such monastery or two could be meant (ვეჯინი, ქვიშხეთი, ზუგდიდი-ცაიში, თეთრახევი, Tbilisi's
// ლურჯი, მამადავითი, უძო, აგარა, საფარა, ქვათახევი, თადეოზ სტეფანწმინდელი, სანაგირე, კინტრიში). tests/churches.test.ts
// checks that both sides still exist — after the list is built again, a missing id must be found anew.
export const FILM_CHURCH: Record<string, string> = {
  'ერკეთის მონასტერი': '42a71716',
  'ორაგვეს მონასტერი': '2298c4e4',
  'შემოქმედის მონასტერი': '95dbe88a',
  'გურიის უდაბნოს მონასტერი': '533d3e53',
  'გელათის მონასტერი': 'f3ff92a',
  'კაცხის სვეტი': 'ec249ec5',
  'მათხოჯის მონასტერი': '56ecba0d',
  'მოწამეთა': 'a2906206',
  'მღვიმევის მონასტერი': 'c85cfe77',
  'ტაბაკინის მონასტერი': 'a213f390',
  'უბისის მონასტერი': '147c725f',
  'ჯრუჭის მონასტერი': '421f6703',
  'ალავერდის მონასტერი': '81d4f7f8',
  'ბოდბის მონასტერი': 'cb4219ef',
  'იყალთოს მონასტერი': '402652ed',
  'ხირსის მონასტერი': '116fbd25',
  'ბეთანიის მონასტერი': '650672c',
  'თაბორის მონასტერი': '11897e83',
  'ბედიანის მონასტერი': '7bd1cede',
  'ბოლნისის პეტრე-პავლეს მონასტერი': '68ca02e8',
  'ბოლნისის სიონი': '59dc1790',
  'მარტყოფის მონასტერი': 'c9cd88d4',
  'ფიტარეთის მონასტერი': '1edafd64',
  'ბევრეთის მონასტერი': 'e24c73b0',
  'გერგეტის სამება': '49df1d4a',
  'დარიალის მონასტერი': '7c509fc9',
  'ზედაზნის მონასტერი': '2d6921e8',
  'მამკოდის მონასტერი': '4a76db0d',
  'სამთავროს მონასტერი': 'cd44b09a',
  'შიომღვიმე': '7f1d1726',
  'ჯვრის მონასტერი': 'dbc679b9',
  'მარტვილის მონასტერი': 'dda1c3cd',
  'წაჩხურუს მონასტერი': 'ed2e958e',
  'ხობის მონასტერი': '89458218',
  'აბასთუმნის დედათა მონასტერი': 'ebf5482e',
  'ზარზმის მონასტერი': 'be47ad0d',
  'ზედა ვარძია': 'cf4ba16b',
  'მწვანე მონასტერი': '5bf2e519',
  'უდეს მონასტერი': '2488f45f',
  'ფოკის დედათა მონასტერი': '456b829d',
  'ფოკის მონასტერი': '835577',
  'ყვიბისის მონასტერი': '9b5cef5b',
  'ატენის დედათა მონასტერი': '1b8d8a0d',
  'დირბის მონასტერი': 'e636e1c7',
  'მზოვრეთის მონასტერი': 'd9e85bde',
  'ორთუბნის მონასტერი': '663041',
  'სამთავისი': 'a18ca266',
  'სარკინეთის მონასტერი': 'be167788',
  'ქოზიფას მონასტერი': '6341aa0b',
  'ყინწვისის მონასტერი': 'c3fc516b',
};

export interface ChurchFilm { id: string; title: string; channel: string; region: string; secs: number }

let byChurch: Map<string, ChurchFilm[]> | null = null;
/** the church's reports, in the videos page's order */
export const filmsOfChurch = (churchId: string): ChurchFilm[] => {
  if (!byChurch) {
    byChurch = new Map();
    for (const [id, title, channel, region, monastery, secs] of MONASTERY_FILMS) {
      const cid = FILM_CHURCH[monastery];
      if (cid) byChurch.set(cid, [...(byChurch.get(cid) ?? []), { id, title, channel, region, secs }]);
    }
  }
  return byChurch.get(churchId) ?? [];
};
