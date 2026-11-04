// „ორი ტახტი“'s 42 cards (rebuilt 2026-11-04 on the school's own rules — utils/oriTakhti.ts): what the lands bring the two
// kings at the Likhi range, in five kinds. The names are real castles, warriors, grapes, wine vessels, books and lands; the
// notes were written by Claude and are not yet checked by a teacher (the page says so). The print kit
// (pages/games/takhti/printKit.ts, drawn in the browser) reads this file, so a card changed here is changed on paper too. Ids stay.

export type TKind = 'tsikhe' | 'lashkari' | 'ghvino' | 'tsigni' | 'elchi';
/** wine: a vine or a vessel — one of each makes a wine */
export type WineHalf = 'vazi' | 'chuch';

export interface TCard {
  id: number;
  k: TKind;
  /** the name */
  n: string;
  /** a castle's points, a warrior's strength; 0 for the rest */
  v: number;
  w?: WineHalf;
  note: string;
}

export const KINDS: readonly TKind[] = ['tsikhe', 'lashkari', 'ghvino', 'tsigni', 'elchi'];

const castle = (n: string, v: number, note: string) => ({ k: 'tsikhe' as const, n, v, note });
const army = (n: string, v: number, note: string) => ({ k: 'lashkari' as const, n, v, note });
const vine = (n: string, note: string) => ({ k: 'ghvino' as const, n, v: 0, w: 'vazi' as const, note });
const vessel = (n: string, note: string) => ({ k: 'ghvino' as const, n, v: 0, w: 'chuch' as const, note });
const book = (n: string, note: string) => ({ k: 'tsigni' as const, n, v: 0, note });
const envoy = (n: string, note: string) => ({ k: 'elchi' as const, n, v: 0, note });

export const CARDS: readonly TCard[] = [
  castle('ნარიყალა', 3, 'თბილისის ძველი ციხე, ქალაქის თავზე'),
  castle('უქიმერიონი', 3, 'ქუთაისის ძველი ციხე, რიონის პირას'),
  castle('გონიო', 3, 'რომაული ციხე შავ ზღვასთან, აჭარაში'),
  castle('ხერთვისი', 3, 'მტკვრისა და ფარავნის შესართავთან'),
  castle('ანანური', 2, 'არაგვის ერისთავების ციხე'),
  castle('სურამი', 2, 'ციხე ლიხის ქედის ძირას'),
  castle('შორაპანი', 2, 'ძველი ციხე ყვირილის პირას'),
  castle('ბირთვისი', 2, 'კლდის ციხე ალგეთის ხეობაში'),
  castle('შატილი', 1, 'ხევსურეთის ციხე-სოფელი'),
  castle('მუცო', 1, 'კოშკები ხევსურეთის კლდეზე'),
  castle('თმოგვი', 1, 'ციხე მტკვრის ხეობაში, ვარძიის ახლოს'),
  castle('ბახტრიონი', 1, 'კახეთის ციხე, 1659 წლის აჯანყებით ცნობილი'),
  army('მშვილდოსანი', 1, 'შორიდან ისრით იბრძვის'),
  army('შუბოსანი', 1, 'გრძელი შუბით იბრძვის'),
  army('მეფარე', 1, 'ფარით იცავს რაზმს'),
  army('მხედარი', 2, 'ცხენოსანი მეომარი'),
  army('მეციხოვნე', 2, 'ციხის მცველი'),
  army('მთიელი მოლაშქრე', 2, 'მთის რაზმი — ხევსური, ფშაველი, თუში'),
  army('მონასპა', 3, 'დავით აღმაშენებლის რჩეული რაზმი'),
  army('ჯავშნოსანი', 3, 'მძიმე აბჯრით შემოსილი მხედარი'),
  army('ამირსპასალარი', 3, 'ლაშქრის მთავარსარდალი'),
  vine('რქაწითელი', 'კახეთის თეთრი ყურძენი'),
  vine('საფერავი', 'მუქი წითელი ყურძენი'),
  vine('ცოლიკოური', 'იმერეთის თეთრი ყურძენი'),
  vine('ოჯალეში', 'სამეგრელოს წითელი ყურძენი'),
  vine('ალექსანდროული', 'რაჭის წითელი ყურძენი'),
  vessel('ქვევრი', 'მიწაში ჩაფლული თიხის ჭურჭელი'),
  vessel('ჭური', 'ასე ეძახიან ქვევრს დასავლეთში'),
  vessel('ხელადა', 'თიხის დოქი სუფრისთვის'),
  vessel('ყანწი', 'რქისგან — სადღეგრძელოსთვის'),
  vessel('აზარფეშა', 'ვერცხლის თასი სახელურით'),
  book('ვეფხისტყაოსანი', 'შოთა რუსთაველი'),
  book('ამირანდარეჯანიანი', 'მოსე ხონელი'),
  book('ვისრამიანი', 'სარგის თმოგველი'),
  book('თამარიანი', 'ჩახრუხაძე'),
  book('აბდულმესიანი', 'იოანე შავთელი'),
  book('ქართლის ცხოვრება', 'ქართველთა ძველი მატიანე'),
  envoy('ტაოს ელჩი', 'სამხრეთის ქართული მიწიდან'),
  envoy('კლარჯეთის ელჩი', 'ჭოროხის ხეობიდან'),
  envoy('ჰერეთის ელჩი', 'აღმოსავლეთის ბარიდან'),
  envoy('კახეთის ელჩი', 'ალაზნის ველიდან'),
  envoy('სვანეთის ელჩი', 'კავკასიონის მაღალი მთებიდან'),
].map((c, id) => ({ id, ...c }));
