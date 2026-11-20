// „შეცდომა ვნახე“ on the reader's day service (pages/v2/medavitne/Report.tsx): a reader says in a few words what does not
// match their temple's service. The words go to the administration as a letter in the member's own chat with it, with the
// place they were written at — the day, the service, the step and what the page was set to — so it can be found again.

export interface ReportPlace {
  iso: string;
  /** „შაბათი, 21 ნოემბერი“ */
  day: string;
  /** the service's name as the page shows it */
  service: string;
  /** the step's number as the reader saw it, and its name */
  n: number;
  step: string;
  /** what the page was set to: the tone, the rank, the temple, its order … — each a short phrase */
  setup: string[];
}

/** the most a reader may write */
export const REPORT_MAX = 1200;

/** „შაბათი, 21 ნოემბერი · მწუხრი · 5. …“ — the place in one line */
export const placeLine = (p: ReportPlace) => `${p.day} · ${p.service} · ${p.n}. ${p.step}`;

/** the letter: a heading, the place, what the page was set to, then the reader's own words */
export const reportText = (p: ReportPlace, words: string): string => {
  const setup = p.setup.map(s => s.trim()).filter(Boolean).join(' · ');
  return [
    '🚩 შეცდომა ვნახე — „დღის მსახურება“',
    `${placeLine(p)} (${p.iso})`,
    ...(setup ? [setup] : []),
    '',
    words.trim().slice(0, REPORT_MAX),
  ].join('\n');
};
