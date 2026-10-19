// Who a name in the commemoration lists belongs to: a man or a woman, and whether a clergy title stands
// before it („მღვდ. გიორგი“). Profiles keep no gender, so the common Georgian names (and their short forms)
// answer it; a name not here stays unknown until the reader marks it (utils/commemoration.ts keeps that).

export type Gender = 'm' | 'f';

const MALE = `აბრამ აბესალომ ადამ ავთანდილ აკაკი ალეკო ალექსანდრე ალექსი ალუდა ამბროსი ამირან ანდრია ანდრო ანზორ ანტონ არჩილ
არსენ ბადრი ბაგრატ ბაჩანა ბაჩო ბართლომე ბასილ ბეჟან ბენედიქტე ბესარიონ ბესო ბექა ბიძინა ბონდო ბორის გაბრიელ გაგა გედეონ
გელა გენადი გია გიგა გიგი გიგლა გივი გიორგი გოგა გოგი გოგიტა გოგლა გოდერძი გოჩა გრიგოლ გურამ დავით დანიელ დათა დათო
დაჩი დემეტრე დიმა დიმიტრი ელგუჯა ელიზბარ ელისე ემზარ ენვერ ერეკლე ესტატე ეფრემ ექვთიმე ვალერი ვანო ვასილ ვაჟა ვახო
ვახტანგ ვიქტორ ვლადიმერ ზაალ ზაზა ზაქარია ზვიად ზურა ზურაბ ზურიკო თამაზ თეიმურაზ თემო თემურ თენგიზ თომა თორნიკე იაკობ
იასე ივანე იგორ ილარიონ ილია იოანე იოსებ იერემია ირაკლი ისაია კახა კახაბერ კობა კონსტანტინე კოტე ლადო ლაზარე ლაშა ლევან
ლეო ლუარსაბ ლუკა მათე მალხაზ მამუკა მარკოზ მაქსიმე მერაბ მიშა მიხა მიხეილ მოსე მურთაზ მურმან ნესტორ ნიკა ნიკანდრე ნიკო
ნიკოლა ნიკოლოზ ნოდარ ნოე ნუგზარ ოთარ ოთო პაატა პავლე პეტრე რამაზ რატი რევაზ რეზი რეზო რომან როსტომ საბა სანდრო სერაფიმე
სერგი სერგო სიმონ სოსო სტეფანე სულხან ტარიელ ტიტე ტრისტან უჩა ფილიპე ფრიდონ ქრისტეფორე ღვთისო შალვა შიო შოთა ცოტნე
ჯაბა ჯემალ ჯონი ჯუმბერ ხვიჩა`;

const FEMALE = `ანა ანანო ანასტასია ანი ანნა ანუკი ბაია ბარბარე ბელა გვანცა დალი დარეჯან დიანა დოდო ევა ეთერ ეთო ეკა ეკატერინა
ეკატერინე ელენა ელენე ელზა ელიკო ელისაბედ ელისო ეფემია ვერიკო ვიქტორია ზეინაბ ზინა ზინაიდა ზოია თაკო თამარ თამთა
თამილა თამრიკო თამუნა თეა თეკლე თეკო თეონა თიკო თინა თინათინ ია ინგა ირინა ირინე ირმა კეკე ლალი ლამარა ლანა ლაურა
ლეილა ლელა ლია ლიანა ლიზა ლიკა ლილი ლუიზა მაგდა მაგდალინა მაია მაკა მაკო მანანა მარგალიტა მარია მარიამ მარიკა მარიკო
მარინე მართა მაშო მედეა მეგი მერი მზექალა მზია ნათელა ნათია ნაზი ნანა ნანი ნანუკა ნატა ნატალია ნატო ნესტან ნინა ნინელი
ნინი ნინიკო ნინო ნონა ნუნუ ნუცა ოლია ოლღა რუსიკო რუსუდან სალომე სოფია სოფიკო სოფიო სოფო ტასო ფატი ფიქრია ქეთევან
ქეთი ქეთინო ქეთო ქრისტინა ქრისტინე შორენა ციალა ცირა ცისანა ციცინო ხათუნა ხატია ჟანა ჟუჟუნა ჯულიეტა`;

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));
const MEN = words(MALE);
const WOMEN = words(FEMALE);

const lookup = (name: string): Gender | undefined => (MEN.has(name) ? 'm' : WOMEN.has(name) ? 'f' : undefined);

/** A first name's gender, also in the nominative form („ლევანი“, „თამარი“, „მარიამი“). */
export const nameGender = (name: string): Gender | undefined => {
  const n = name.trim().split(/\s+/)[0] || '';
  return lookup(n) ?? (n.endsWith('ი') ? lookup(n.slice(0, -1)) : lookup(`${n}ი`));
};

/** The titles offered in a name's window, in church order; the gender a title implies (monastics: by the name). */
export const CLERGY_TITLES: { title: string; gender?: Gender }[] = [
  { title: 'მიტროპოლიტი', gender: 'm' },
  { title: 'ეპისკოპოსი', gender: 'm' },
  { title: 'არქიმანდრიტი', gender: 'm' },
  { title: 'იღუმენი', gender: 'm' },
  { title: 'იღუმენია', gender: 'f' },
  { title: 'დეკანოზი', gender: 'm' },
  { title: 'მღვდელი', gender: 'm' },
  { title: 'მღვდელმონაზონი', gender: 'm' },
  { title: 'დიაკონი', gender: 'm' },
  { title: 'ბერი', gender: 'm' },
  { title: 'მონაზონი' },
  { title: 'მორჩილი' },
];

// written titles and their short forms („მღვდ.“), without the dot
const TITLE_WORDS: Record<string, Gender | null> = {
  ...Object.fromEntries(CLERGY_TITLES.map(t => [t.title, t.gender ?? null])),
  პატრიარქი: 'm', მთავარეპისკოპოსი: 'm', მიტრ: 'm', ეპისკ: 'm', არქიმ: 'm', იღუმ: 'm', დეკ: 'm', მღვდ: 'm',
  მღვდელმონ: 'm', ჰიერომონაზონი: 'm', მთავარდიაკონი: 'm', პროტოდიაკონი: 'm', ბერდიაკონი: 'm', ჰიეროდიაკონი: 'm',
  დიაკ: 'm', სქემამონაზონი: null, სქემმონაზონი: null, მონ: null,
};

/** Is this word a clergy title („მღვდელი“, „მღვდ.“)? Gives its gender (null: by the name), undefined when not a title. */
export const titleGender = (word: string): Gender | null | undefined => TITLE_WORDS[word.replace(/\.$/, '')];
