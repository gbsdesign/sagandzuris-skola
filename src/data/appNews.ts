// „აპის სიახლეები“ in the header's 🔔 (components/layout/Bell.tsx): a short line for what a new version brings, newest
// first. Add one whenever something the members will notice reaches the site — plain words, what changes for them, no
// technical terms; `id` never changes (the bell keys on it).

export interface AppNews {
  id: string;
  /** the day it reached the site, YYYY-MM-DD (Tbilisi) */
  date: string;
  title: string;
  text: string;
}

export const APP_NEWS: AppNews[] = [
  {
    id: 'fav-prayers-2026-11-06',
    date: '2026-11-06',
    title: 'რჩეული ლოცვები',
    text: 'ლოცვის გვერდზე ზემოთ ☆-ს დააჭირე — ლოცვა ლოცვანის თავში, „რჩეულში“ გამოჩნდება.',
  },
  {
    id: 'bell-2026-11-06',
    date: '2026-11-06',
    title: 'ახალი ღილაკები ზემოთ',
    text: 'ლოგოს გვერდით — დავალებები და შეტყობინებები, ყველა კლასის ერთად. ბიბლიოთეკა მრგვალ ღილაკზეა, ქვემოთ კი ლოცვანი გაიხსნება.',
  },
  {
    id: 'calls-2026-11-05',
    date: '2026-11-05',
    title: 'ზარი და წერილი ტელეფონზე',
    text: 'მასწავლებლის ზარი და წერილი ტელეფონზე მოვა, საიტი დახურულიც რომ იყოს. ჩართვას ერთხელ გკითხავთ.',
  },
  {
    id: 'learn-2026-11-05',
    date: '2026-11-05',
    title: 'სწავლა — ერთი ღილაკით',
    text: 'საგალობლის სწავლისას ერთი დიდი ღილაკი გეტყვის, რა გააკეთო შემდეგ — ფრაზა-ფრაზა, ბოლოს მთლიანად.',
  },
  {
    id: 'pearls-2026-11-05',
    date: '2026-11-05',
    title: 'მარგალიტები და სკივრები',
    text: '„ნასწავლში“ ყოველ საგალობელს თავისი მარგალიტი აქვს. ათი გაპრიალებული მარგალიტი სკივრს გახსნის, სკივრი კი ჩოხის ნაწილს გაჩუქებს.',
  },
];
