// „ვიდეოები“ → „ფილმები“: Georgian films, plays and cartoons on YouTube, picked by hand (2026-11-07, the user: „ღირებული …
// არ ეწინააღმდეგება მართლმადიდებლურ სულს … ქართულია“, answers „ფილმები · სპექტაკლები · მულტფილმები“, „უფროსებისას ცალკე ნიშნით“,
// „კერძო არხებიც, ხარისხი რომც მინიმალური იყოს“). Most are uploads of ordinary people and may vanish — check now and then.
// `adult` = war, violence or a heavy tragedy: shown with „უფროსებისთვის“. A film in parts plays them one after another (`parts`).
// Add new films where their kind's list wants them (films by year).

export type FilmKind = 'film' | 'theatre' | 'cartoon';
export type FilmGenre = 'drama' | 'comedy' | 'history' | 'war' | 'music' | 'kids' | 'lit' | 'faith';

export const KIND_NAMES: Record<FilmKind, string> = { film: 'ფილმები', theatre: 'სპექტაკლები', cartoon: 'მულტფილმები' };
export const GENRE_NAMES: Record<FilmGenre, string> = {
  drama: 'დრამა', comedy: 'კომედია', history: 'ისტორიული', war: 'ომი', music: 'მუსიკალური',
  kids: 'საბავშვო', lit: 'ეკრანიზაცია', faith: 'სულიერი',
};
export const GENRE_ORDER: FilmGenre[] = ['drama', 'comedy', 'history', 'war', 'music', 'kids', 'lit', 'faith'];

export interface FilmPart { id: string; label: string; secs: number }
export interface KinoItem {
  /** the YouTube id (a film in parts: its first part's) */
  id: string;
  title: string;
  /** 0 = not known */
  year: number;
  kind: FilmKind;
  genres: FilmGenre[];
  adult?: true;
  /** the whole length */
  secs: number;
  note: string;
  parts?: FilmPart[];
}

export const KINO: KinoItem[] = [
  { id: 'AZxY-oiKVqo', title: 'არსენა', year: 1937, kind: 'film', genres: ['history'], secs: 4751, note: 'რეჟ. მიხეილ ჭიაურელი' },
  { id: 'cs1HvC6wDeg', title: 'ქაჯანა', year: 1941, kind: 'film', genres: ['kids'], secs: 4223, note: 'ქართული ზღაპარი' },
  { id: 'MWNPAYSxoiI', title: 'გიორგი სააკაძე', year: 1942, kind: 'film', genres: ['history', 'war'], adult: true, secs: 9665, note: 'რეჟ. მიხეილ ჭიაურელი' },
  { id: 'a4LCZ6LfiIQ', title: 'დავით გურამიშვილი', year: 1946, kind: 'film', genres: ['history'], secs: 5639, note: 'პოეტის ცხოვრება' },
  { id: 'fvZRhcNn0iw', title: 'ქეთო და კოტე', year: 1948, kind: 'film', genres: ['music', 'comedy'], secs: 5247, note: 'რეჟ. ვახტანგ ტაბლიაშვილი, შალვა გედევანიშვილი' },
  { id: 'fDmMFq3zMBw', title: 'ჭრიჭინა', year: 1954, kind: 'film', genres: ['comedy'], secs: 5410, note: 'რეჟ. სიკო დოლიძე' },
  { id: 'PvyRnV2ZW1Q', title: 'მაგდანას ლურჯა', year: 1955, kind: 'film', genres: ['drama', 'kids', 'lit'], secs: 4071, note: 'რეჟ. თენგიზ აბულაძე, რეზო ჩხეიძე · ეკატერინე გაბაშვილის მოთხრობა' },
  { id: '-oRz2IU274Q', title: 'ბაში-აჩუკი', year: 1956, kind: 'film', genres: ['history', 'lit'], secs: 5310, note: 'რეჟ. ლეო ესაკია · აკაკი წერეთლის მოთხრობა' },
  { id: 'UTDZ-DaJG0Y', title: 'ჩვენი ეზო', year: 1956, kind: 'film', genres: ['drama'], secs: 5117, note: 'რეჟ. რეზო ჩხეიძე' },
  { id: '6UFRR1-jmmI', title: 'სხვისი შვილები', year: 1958, kind: 'film', genres: ['drama'], secs: 4481, note: 'რეჟ. თენგიზ აბულაძე' },
  { id: 'L5h7WM87h4I', title: 'ოთარაანთ ქვრივი', year: 1958, kind: 'film', genres: ['drama', 'lit'], adult: true, secs: 4391, note: 'ილია ჭავჭავაძის მოთხრობა' },
  { id: 'UCf2TeYiCho', title: 'მანანა', year: 1958, kind: 'film', genres: ['kids'], secs: 4067, note: 'საბავშვო ფილმი' },
  { id: 'Rutx72I2awc', title: 'მაია წყნეთელი', year: 1959, kind: 'film', genres: ['history'], secs: 5628, note: 'რეჟ. სიკო დოლიძე' },
  { id: 'W-BMGrZPbKw', title: 'გლახის ნაამბობი', year: 1961, kind: 'film', genres: ['drama', 'lit'], adult: true, secs: 4912, note: 'ილია ჭავჭავაძის მოთხრობა' },
  { id: 'bMcLhL4vVy0', title: 'მე, ბებია, ილიკო და ილარიონი', year: 1962, kind: 'film', genres: ['drama', 'comedy', 'lit'], secs: 5090, note: 'რეჟ. თენგიზ აბულაძე · ნოდარ დუმბაძის რომანი' },
  { id: 'mq-UDJXxuJg', title: 'ჯარისკაცის მამა', year: 1964, kind: 'film', genres: ['war', 'drama'], adult: true, secs: 5275, note: 'რეჟ. რეზო ჩხეიძე' },
  { id: 'IjiXH43oyXo', title: 'ხევისბერი გოჩა', year: 1964, kind: 'film', genres: ['history', 'lit'], adult: true, secs: 4942, note: 'ალექსანდრე ყაზბეგის მოთხრობა' },
  { id: 'eksVckzRBw0', title: 'მე ვხედავ მზეს', year: 1965, kind: 'film', genres: ['war', 'drama', 'lit'], adult: true, secs: 4956, note: 'რეჟ. ლანა ღოღობერიძე · ნოდარ დუმბაძის რომანი' },
  { id: '7fguBkGbl98', title: 'ვედრება', year: 1967, kind: 'film', genres: ['drama', 'lit'], adult: true, secs: 4340, note: 'რეჟ. თენგიზ აბულაძე · ვაჟა-ფშაველას პოემები' },
  { id: 'xrGurjp6lmk', title: 'აბესალომ და ეთერი', year: 1967, kind: 'film', genres: ['music'], secs: 5130, note: 'ფილმი-ოპერა · ზაქარია ფალიაშვილი' },
  { id: 'KC1UAeOf4r4', title: 'არაჩვეულებრივი გამოფენა', year: 1968, kind: 'film', genres: ['comedy', 'drama'], secs: 5307, note: 'რეჟ. ელდარ შენგელაია', parts: [{ id: 'KC1UAeOf4r4', label: 'I ნაწილი', secs: 1318 }, { id: 'ohYDyP7kyJE', label: 'II ნაწილი', secs: 1307 }, { id: '8xPx8WOOYnU', label: 'III ნაწილი', secs: 1314 }, { id: '0HGgEOcWpE8', label: 'IV ნაწილი', secs: 1368 }] },
  { id: 'aR4lpdOwvzY', title: 'ფიროსმანი', year: 1969, kind: 'film', genres: ['drama'], secs: 4874, note: 'რეჟ. გიორგი შენგელაია · მხატვრის ცხოვრება' },
  { id: 'C0Ut5dvf3eI', title: 'დიდოსტატის მარჯვენა', year: 1970, kind: 'film', genres: ['history', 'lit'], adult: true, secs: 8983, note: 'კონსტანტინე გამსახურდიას რომანი · სვეტიცხოვლის აშენება', parts: [{ id: 'C0Ut5dvf3eI', label: 'I სერია', secs: 4477 }, { id: 'hsnzUah2OT8', label: 'II სერია', secs: 4506 }] },
  { id: 'tqsViYK9_Do', title: 'ქვევრი', year: 1970, kind: 'film', genres: ['comedy', 'lit'], secs: 1628, note: 'რეჟ. რეზო ესაძე · ლუიჯი პირანდელოს ნოველა' },
  { id: '-65jn4kgpb8', title: 'დაისი', year: 1971, kind: 'film', genres: ['music'], secs: 4187, note: 'ფილმი-ოპერა · ზაქარია ფალიაშვილი' },
  { id: 'T4ihvaMfk60', title: 'ვერის უბნის მელოდიები', year: 1973, kind: 'film', genres: ['music', 'comedy', 'kids'], secs: 5561, note: 'რეჟ. გიორგი შენგელაია' },
  { id: 'r3e1zbRIZMs', title: 'პირველი მერცხალი', year: 1975, kind: 'film', genres: ['drama'], secs: 4545, note: 'რეჟ. ნანა მჭედლიძე · ქართული ფეხბურთის დასაწყისი' },
  { id: 'D18XazKhH5g', title: 'ნატვრის ხე', year: 1976, kind: 'film', genres: ['drama', 'lit'], adult: true, secs: 5992, note: 'რეჟ. თენგიზ აბულაძე · გიორგი ლეონიძის მოთხრობები' },
  { id: 'A20XpzMXyHk', title: 'კაცია ადამიანი?!', year: 1979, kind: 'film', genres: ['comedy', 'lit'], secs: 5282, note: 'ილია ჭავჭავაძის მოთხრობა' },
  { id: 'R2xffgCGAOk', title: 'მარადისობის კანონი', year: 1982, kind: 'film', genres: ['drama', 'lit'], secs: 4546, note: 'ნოდარ დუმბაძის რომანი' },
  { id: 'kV2Qr9pNssQ', title: 'დიმიტრი II', year: 1982, kind: 'film', genres: ['history', 'faith'], secs: 7818, note: 'მეფე დიმიტრი თავდადებული' },
  { id: 'W1xYDZBI1ts', title: 'ცისფერი მთები ანუ დაუჯერებელი ამბავი', year: 1983, kind: 'film', genres: ['comedy'], secs: 5479, note: 'რეჟ. ელდარ შენგელაია' },
  { id: 'hm1ercvqdB0', title: 'ადამიანთა სევდა', year: 1984, kind: 'film', genres: ['drama', 'faith'], secs: 5326, note: 'რეჟ. გოდერძი ჩოხელი' },
  { id: 'TmXic2eFMYs', title: 'მონანიება', year: 1984, kind: 'film', genres: ['drama', 'faith'], adult: true, secs: 8665, note: 'რეჟ. თენგიზ აბულაძე' },
  { id: 'egl7-wbpHbk', title: 'ამბავი სურამის ციხისა', year: 1984, kind: 'film', genres: ['history', 'lit'], adult: true, secs: 5175, note: 'რეჟ. სერგო ფარაჯანოვი, დოდო აბაშიძე · დანიელ ჭონქაძის მოთხრობა' },
  { id: 'bJ9pazzhk9U', title: 'ნეილონის ნაძვის ხე', year: 1985, kind: 'film', genres: ['comedy', 'drama'], secs: 4447, note: 'რეჟ. რეზო ესაძე' },
  { id: 'NWoYynor-QI', title: 'სიბრძნე სიცრუისა', year: 1991, kind: 'film', genres: ['lit'], secs: 5552, note: 'სულხან-საბა ორბელიანის წიგნის მიხედვით' },
  { id: 'QKEMa1pAfvA', title: 'სამოთხის გვრიტები', year: 1997, kind: 'film', genres: ['drama', 'faith'], secs: 3202, note: 'რეჟ. გოდერძი ჩოხელი' },
  { id: 's-uKUtkfpCc', title: 'ლუკას სახარება', year: 0, kind: 'film', genres: ['drama', 'faith'], secs: 3214, note: 'რეჟ. გოდერძი ჩოხელი' },
  { id: 'bo_KRTaz-x4', title: 'ანთიმოზ ივერიელი', year: 2001, kind: 'film', genres: ['history', 'faith'], secs: 13112, note: 'რეჟ. გიული ჩოხონელიძე · წმინდა ანთიმოზის ცხოვრება' },
  { id: 'Ior1aezw76c', title: 'სიყვარულის ცეცხლი', year: 0, kind: 'film', genres: ['drama'], adult: true, secs: 2323, note: 'გოდერძი ჩოხელი' },
  { id: 'UB5BtPR-u38', title: 'ჭინჭრაქა', year: 0, kind: 'theatre', genres: ['kids'], secs: 3667, note: 'გიორგი ნახუცრიშვილის პიესა · პირველი არხი' },
  { id: 'ZiVK2sBf99g', title: 'უჩინმაჩინის ქუდი', year: 0, kind: 'theatre', genres: ['kids'], secs: 5101, note: 'საბავშვო სპექტაკლი · პირველი არხი' },
  { id: '3vu86O3BWDY', title: 'რწყილი და ჭიანჭველა', year: 0, kind: 'theatre', genres: ['kids'], secs: 2236, note: 'ქართული ხალხური ზღაპარი' },
  { id: 'Rel5vr7-L5Q', title: 'კონკია', year: 0, kind: 'theatre', genres: ['kids'], secs: 3434, note: 'მარტვილის თოჯინების თეატრი' },
  { id: 'Unr2VapsDps', title: 'მახინჯი იხვის ჭუკი', year: 0, kind: 'theatre', genres: ['kids'], secs: 2595, note: 'ჰანს კრისტიან ანდერსენის ზღაპარი' },
  { id: 'jbg-Qqbfdlg', title: 'ქაქუცა ჩოლოყაშვილი', year: 0, kind: 'theatre', genres: ['history'], secs: 4793, note: 'ეროვნული გმირის ცხოვრება · პირველი არხი' },
  { id: 'Yi3HfYQt5jo', title: 'სამანიშვილის დედინაცვალი', year: 0, kind: 'theatre', genres: ['comedy', 'lit'], secs: 7494, note: 'დავით კლდიაშვილის მოთხრობა' },
  { id: 'E8bGej4yCaI', title: 'ქამუშაძის გაჭირვება', year: 0, kind: 'theatre', genres: ['comedy', 'lit'], secs: 7897, note: 'დავით კლდიაშვილის პიესა' },
  { id: 'XtzUYmzT36g', title: 'ირინეს ბედნიერება', year: 0, kind: 'theatre', genres: ['comedy', 'lit'], secs: 5107, note: 'დავით კლდიაშვილის პიესა' },
  { id: 'H__4cipqykY', title: 'ყვარყვარე თუთაბერი', year: 0, kind: 'theatre', genres: ['comedy', 'lit'], secs: 7226, note: 'პოლიკარპე კაკაბაძის პიესა' },
  { id: 'TUOMfJL_pJw', title: 'კუკარაჩა', year: 0, kind: 'theatre', genres: ['drama', 'lit'], adult: true, secs: 4609, note: 'ნოდარ დუმბაძის მოთხრობა · პირველი არხი' },
  { id: 'pKshjY53i7M', title: 'კავკასიური ცარცის წრე', year: 0, kind: 'theatre', genres: ['drama', 'music'], secs: 9656, note: 'ბერტოლტ ბრეხტის პიესა' },
  { id: 'z6eIFvJd3DU', title: 'ჩვენი პატარა ქალაქი', year: 0, kind: 'theatre', genres: ['drama'], secs: 4604, note: 'თორნტონ უაილდერის პიესა · პირველი არხი' },
  { id: 'eZDFpQS5YCQ', title: '12 განრისხებული მამაკაცი', year: 0, kind: 'theatre', genres: ['drama'], secs: 4816, note: 'რეჯინალდ როუზის პიესა · პირველი არხი' },
  { id: '4fJq4DVcUkU', title: 'ალუბლის ბაღი', year: 0, kind: 'theatre', genres: ['drama'], secs: 5239, note: 'ანტონ ჩეხოვის პიესა · პირველი არხი' },
  { id: 'wXOGIYsUHG0', title: 'ძია ვანია', year: 0, kind: 'theatre', genres: ['drama'], secs: 5154, note: 'ანტონ ჩეხოვის პიესა · პირველი არხი' },
  { id: '5-Nrw-pIR04', title: 'საბავშვო ბიბლია', year: 0, kind: 'cartoon', genres: ['faith', 'kids'], secs: 1606, note: 'მაცხოვრის ცხოვრება ბავშვებისთვის', parts: [{ id: '5-Nrw-pIR04', label: 'შობა', secs: 319 }, { id: 'gcD7dnaSnl0', label: 'ნათლისღება', secs: 275 }, { id: 'VCZBKEYK0pw', label: 'ჯვარცმა', secs: 395 }, { id: 'ABrWZeS7EzU', label: 'აღდგომა', secs: 306 }, { id: 'Wadisu-jnZg', label: 'ამაღლება', secs: 311 }] },
  { id: '5XKm7I8ty1U', title: 'საბავშვო სახარება', year: 0, kind: 'cartoon', genres: ['faith', 'kids'], secs: 1638, note: 'შობა, ნათლისღება, აღდგომა' },
  { id: '0kf0AoCumD8', title: 'წმინდა ნინო', year: 0, kind: 'cartoon', genres: ['faith', 'kids'], secs: 568, note: 'ანიმაციური ფილმი' },
  { id: 'FiDPSvCNAHk', title: 'ვეფხისტყაოსანი', year: 0, kind: 'cartoon', genres: ['kids', 'lit'], secs: 1801, note: 'შოთა რუსთაველის პოემა', parts: [{ id: 'FiDPSvCNAHk', label: 'I ნაწილი', secs: 130 }, { id: 'aPomDWYL02Y', label: 'II ნაწილი', secs: 521 }, { id: 'WWIWLgfCtoU', label: 'III ნაწილი', secs: 296 }, { id: 'gy9hJITd2CY', label: 'IV ნაწილი', secs: 854 }] },
  { id: 'WX8NHJuXqyA', title: 'კომბლე', year: 0, kind: 'cartoon', genres: ['kids'], secs: 551, note: 'ქართული ხალხური ზღაპარი' },
  { id: '1BftiMwu9CY', title: 'ბომბორა', year: 0, kind: 'cartoon', genres: ['kids'], secs: 595, note: 'ქართული ანიმაცია' },
  { id: 'DaKIBO_8XhY', title: 'ბომბორა სწავლას იწყებს', year: 1973, kind: 'cartoon', genres: ['kids'], secs: 478, note: 'ქართული ანიმაცია' },
  { id: 'ExjR1oY-pIA', title: 'წუნა და წრუწუნა', year: 0, kind: 'cartoon', genres: ['kids'], secs: 1157, note: 'ქართული ანიმაცია' },
  { id: 'WmKDO1-zjnc', title: 'ჩხიკვთა ქორწილი', year: 0, kind: 'cartoon', genres: ['kids'], secs: 1156, note: 'ქართული ანიმაცია' },
  { id: 'JmUcM1lTLO8', title: 'რანინა', year: 0, kind: 'cartoon', genres: ['kids', 'music'], secs: 528, note: 'ქართული ანიმაცია' },
  { id: 'zCcW0NoF-00', title: 'სიზმარა', year: 0, kind: 'cartoon', genres: ['kids'], secs: 609, note: 'ქართული ანიმაცია' },
  { id: '_qfnoVCJVac', title: 'ტყის კვარტეტი · სოფლის მაშენებლები', year: 0, kind: 'cartoon', genres: ['kids', 'music'], secs: 602, note: 'ქართული ანიმაცია' },
  { id: 'J48R2at2RCc', title: 'ჩიკორიკო', year: 0, kind: 'cartoon', genres: ['kids'], secs: 604, note: 'ქართული ანიმაცია' },
  { id: 'Jmfqc0Jd44A', title: 'თერძი ბესო', year: 0, kind: 'cartoon', genres: ['kids'], secs: 583, note: 'ქართული ანიმაცია' },
  { id: 'rBlCJ0DahCo', title: 'მე წვიმად მოვალ', year: 0, kind: 'cartoon', genres: ['kids'], secs: 605, note: 'ქართული ანიმაცია' },
  { id: 'b4ZcA6nD-TU', title: 'გაზაფხული', year: 0, kind: 'cartoon', genres: ['kids'], secs: 559, note: 'ქართული ანიმაცია' },
  { id: 'TH3QevmFoYo', title: 'სანუკრავი ოცნება', year: 0, kind: 'cartoon', genres: ['kids'], secs: 389, note: 'ქართული ანიმაცია' },
  { id: '_9x6rlGc15U', title: 'ქვეყნის მაშენებლები', year: 0, kind: 'cartoon', genres: ['kids'], secs: 554, note: 'ქართული ანიმაცია' },
  { id: 'DVP8YtgfItQ', title: 'საზამთრო', year: 0, kind: 'cartoon', genres: ['kids'], secs: 533, note: 'ქართული ანიმაცია' },
  { id: '5OcM5bWCruE', title: 'ბაკური', year: 0, kind: 'cartoon', genres: ['kids'], secs: 614, note: 'ქართული ანიმაცია' },
  { id: 'FY9KAkNfZLw', title: 'უხეირო დათუნია', year: 0, kind: 'cartoon', genres: ['kids'], secs: 585, note: 'ქართული ანიმაცია' },
];
