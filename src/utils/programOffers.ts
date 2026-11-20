import type { AssistantScope, ReadyAsk } from './aiAssistant';

// „ავტომატური პროგრამა“'s ready offers (plan 2.0, prototypes 13 · 15): the page's name the program is told („ამ გვერდზე: …“),
// the ready requests that suit the page and the role, what the program noticed by itself (from the scope it already has —
// no AI call), and the next steps under an answer. Pure: no Firebase, no React. Tested in tests/programOffers.test.ts.
// Only what today's assistant can really do is offered: summaries of what it sees, private letters, a line in a class
// chat, a new class (admins).

/** every page's name as its bar says it (PageType → words); a page not listed is „აპი“ */
const PAGE_NAMES: Record<string, string> = {
  home: 'მთავარი',
  profile: 'პროფილი',
  galoba: 'ღვთისმსახურება',
  medavitneoba: 'ღვთისმსახურება · მედავითნე',
  simghera: 'ხალხური',
  sakravebi: 'ხალხური',
  mtkmeli: 'მთქმელი',
  gz: 'საგანძურის გზა',
  tsinaprebi: 'გაიცანი წინაპრები',
  bookmark: 'სანიშნეები',
  admin: 'ადმინის პანელი',
  teacher: 'მასწავლებლის გვერდი',
  class: 'კლასი',
  student: 'მოსწავლის გვერდი',
  prayer: 'ლოცვა',
  commemoration: 'მოსახსენებელი',
  biblioteka: 'ბიბლიოთეკა',
  psalter: 'ფსალმუნი',
  messages: 'წერილები',
  dm: 'პირადი წერილი',
  abituri: 'აბიტურიენტს',
  birthdays: 'დაბადების დღეები',
  games: 'სახალისო',
  videos: 'ვიდეოები',
  churches: 'ეკლესია-მონასტრები',
  notices: 'შეტყობინებები',
  search: 'მკითხე',
  settings: 'პარამეტრები',
  calendar: 'კალენდარი',
};

/** The open page in words; a class page says the class's name. */
export const pageName = (page: string, className?: string | null): string =>
  page === 'class' && className ? `კლასი „${className}“` : PAGE_NAMES[page] ?? 'აპი';

export type OfferGroup = 'here' | 'more';
export interface Offer extends ReadyAsk { group: OfferGroup }

const ask = (group: OfferGroup, label: string, text: string, send = true): Offer => ({ group, label, text, send });

/** pages where the class and its people are the subject */
const CLASS_PAGES = ['class', 'student', 'teacher'];
const PEOPLE_PAGES = ['admin', 'messages', 'dm', 'birthdays'];

/**
 * The ready requests: „ამ გვერდზე“ first (what suits the open page), then the rest. Every one is something the assistant
 * can do today; a class is made only by admins.
 */
export const offersFor = (o: { admin: boolean; page?: string; className?: string | null; classes: number }): Offer[] => {
  const page = o.page ?? '';
  const cls = o.className ? `„${o.className}“` : 'ეს კლასი';
  const here: Offer[] = [];
  if (CLASS_PAGES.includes(page) && o.classes > 0) {
    here.push(
      ask('here', 'შემიჯამე კლასი', `შემიჯამე ${cls}: ვინ როგორ მუშაობს ამ კვირაში`),
      ask('here', 'ვინ ჩამორჩება?', `${cls}: ვინ ჩამორჩება და ვის სჭირდება ყურადღება?`),
      ask('here', 'ვინ არ შემოსულა?', `${cls}: ვინ არ შემოსულა ბოლო 7 დღეში?`),
      ask('here', 'მიწერე კლასს', 'კლასის ჩატში მიწერე: ', false),
      ask('here', 'შეახსენე გაკვეთილი', `კლასის ჩატში შეახსენე ${cls} შემდეგი გაკვეთილი განრიგის მიხედვით`),
      ask('here', 'შეაქე აქტიურები', `${cls}: ამ კვირის ყველაზე აქტიურ მოსწავლეებს პირადად მიწერე მოკლე შექება`),
    );
  } else if (PEOPLE_PAGES.includes(page)) {
    here.push(
      ask('here', 'ვინ არ შემოსულა?', 'ვინ არ შემოსულა ბოლო 7 დღეში?'),
      ask('here', 'მიწერე გაუჩინარებულებს', 'ვინც 7 დღეა არ შემოსულა, პირადად მიწერე თბილი შეხსენება'),
      ask('here', 'კვირის შეჯამება', 'შემიჯამე ეს კვირა: რამდენი აქტიურია, ვინ ჩამორჩება, ვინ გამოირჩა'),
    );
    if (o.admin) here.push(ask('here', 'შექმენი კლასი', 'შექმენი კლასი ', false));
  }
  const more: Offer[] = [
    ask('more', 'შემიჯამე მოსწავლეები', 'შემიჯამე ამ კვირის მოსწავლეები'),
    ask('more', 'მიწერე დამწყებებს', 'დამწყებებს მიწერე: ', false),
    ask('more', 'ვინ გამოირჩა?', 'ვინ გამოირჩა ამ კვირაში? სამი სახელი და რატომ'),
    ask('more', 'ვის მივაქციო ყურადღება?', 'ვის სჭირდება ჩემი ყურადღება ამ კვირაში და რატომ?'),
    ask('more', 'დამწყებების მდგომარეობა', 'როგორ მიდის დამწყებების საქმე? მოკლედ, სახელებით'),
    ask('more', 'წაახალისე ჩამორჩენილები', 'ვინც ჩამორჩება, პირადად მიწერე მოკლე წამახალისებელი წერილი'),
    o.admin
      ? ask('more', 'შექმენი კლასი', 'შექმენი კლასი ', false)
      : ask('more', 'მიწერე კლასს', 'კლასის ჩატში მიწერე: ', false),
    ...(o.admin ? [ask('more', 'კლასების სურათი', 'შემიჯამე კლასები: რომელში რამდენი წევრია და რომელი ჩამორჩება')] : []),
  ];
  // one request once: the page's own first
  const seen = new Set(here.map(x => x.label));
  return [...here, ...more.filter(x => !seen.has(x.label))];
};

/** days without opening the app after which a member counts as „gone“ */
export const GONE_DAYS = 7;

export interface Noticed { text: string; ask: string }

/** What the program noticed by itself in what it already sees (no AI call): the most useful one line, or null. */
export const noticedIn = (scope: AssistantScope): Noticed | null => {
  const inFocus = scope.focus ? scope.people.filter(p => p.classIds.includes(scope.focus!)) : [];
  const people = inFocus.length ? inFocus : scope.people.filter(p => p.classIds.length > 0);
  const known = people.filter(p => p.known);
  const gone = known.filter(p => p.lastActive !== null && p.lastActive >= GONE_DAYS);
  if (gone.length) {
    return {
      text: `${gone.length} მოსწავლე ${GONE_DAYS} დღეა არ შემოსულა. მივწერო შეხსენება?`,
      ask: `ვინც ${GONE_DAYS} დღეა არ შემოსულა, პირადად მიწერე თბილი შეხსენება`,
    };
  }
  const idle = known.filter(p => p.beginner && p.week !== null && !p.week.lessons);
  if (idle.length) {
    return {
      text: `${idle.length} დამწყებს ამ კვირაში გაკვეთილი არ გაუვლია. წავახალისო?`,
      ask: 'დამწყებებს, რომლებსაც ამ კვირაში გაკვეთილი არ გაუვლიათ, პირადად მიწერე მოკლე წამახალისებელი წერილი',
    };
  }
  return null;
};

/** The next steps offered under an answer (not under a plan — that has its own „კი“). */
export const nextSteps = (): ReadyAsk[] => [
  { label: 'მიწერე მათ', text: 'მათ პირადად მიწერე: ', send: false },
  { label: 'უფრო მოკლედ', text: 'იგივე მითხარი უფრო მოკლედ, სამ ხაზად', send: true },
  { label: 'სახელებით', text: 'იგივე მითხარი სახელებით, სიად', send: true },
];
