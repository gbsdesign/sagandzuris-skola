import { ChantItem, TSIRVA_CHANTS, bookFullTitle, kkVariant, v9Variant, variantName } from './tsirvaChants';
import { BookNums, bookPage, bookSource, numsOf } from './gelatiBookIndex';
import { SADGHESASWAULO_CHANTS } from './feastBookChants';
import { MARXVANI_CHANTS, ZATIKI_CHANTS } from './triodionBookChants';
import { MOMIXSENENI_CHANTS } from './beatitudesBookChants';
import { DZLISPIREBI_CHANTS, KATABASIEBI_CHANTS } from './irmosBookChants';
import { DASADEBLEBI_CHANTS } from './sticheraBookChants';

// მწუხრი and ცისკარი chants of the Gelati school book (vol. I), in the book's table-of-contents order.
// A chant that appears several times in the book is one item; each appearance is a version,
// given by its chant number(s) in the book (a range = parts sung together, e.g. a litany).
// The third list holds the same chant's versions in the Kartli-Kakheti book (vol. III, numbers 1-139);
// a chant found only there has no Gelati versions and is placed where vol. III prints it.
// The fourth list holds versions from the Gelati book vol. IX (2023: Sunday troparia of the eight modes and their theotokia).
type Versions = [label: string, nums: BookNums][];
type BookEntry = [title: string, versions: Versions, kk?: Versions, v9?: Versions];
const MODES = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ', 'ზ', 'ჱ'];
// vol. III prints the eight modes of a chant every `step` numbers
const kkModes = (first: number, step = 1): Versions => MODES.map((m, i) => [`ხმა ${m}`, first + i * step]);

const MWUKHRI: BookEntry[] = [
  ['ამინ', [['', 1]], [['', 1], ['', 76]]],
  ['მოვედით, თაყუანის-ვსცეთ', [['', 2]], [['', 2]]],
  ['აკურთხევს სული ჩემი', [['ჴმაჲ ბ, გამშვენებული', 3], ['', 4], ['ჴმაჲ ჱ', 5], ['', 6]], [['', 3]]],
  ['დიდი კუერექსი', [['', [7, 10]]], [['', [4, 13]]]],
  ['ნეტარ არს კაცი', [['', 11], ['ჴმაჲ ჱ', 12]], [['', 14]]],
  ['მცირე კუერექსი', [['', [13, 14]]], [['', [15, 22]]]],
  ['უფალო, ღაღად-ვყავ', [['ჴმაჲ ა', 15], ['ჴმაჲ ბ', 19], ['ჴმაჲ გ', 23], ['ჴმაჲ დ', 27], ['ჴმაჲ ე', 31], ['ჴმაჲ ვ', 35], ['ჴმაჲ ზ', 39], ['ჴმაჲ ჱ', 42]], kkModes(23, 3)],
  ['დასდებელი აღდგომისაჲ', [['ჴმაჲ ა', 16], ['ჴმაჲ ბ', 20], ['ჴმაჲ გ', 24], ['ჴმაჲ დ', 28], ['ჴმაჲ ე', 32], ['ჴმაჲ ვ', 36], ['ჴმაჲ ზ', 40], ['ჴმაჲ ჱ', 43]]],
  ['დიდება, აწ და', [['ჴმაჲ ა', 17], ['ჴმაჲ გ', 25]], [['', [84, 85]]]],
  ['დოგმატიკი', [['ჴმაჲ ა', 18], ['ჴმაჲ ბ', 22], ['ჴმაჲ გ', 26], ['ჴმაჲ დ', 30], ['ჴმაჲ ე', 34], ['ჴმაჲ ვ', 38], ['ჴმაჲ ზ', 41], ['ჴმაჲ ჱ', 44]], kkModes(25, 3)],
  ['აწ და', [['ჴმაჲ ბ', 21], ['ჴმაჲ დ', 29], ['ჴმაჲ ე', 33], ['ჴმაჲ ვ', 37]], kkModes(24, 3)],
  ['ნათელო მხიარულო', [['', 45], ['ჭრელი', 46], ['', 47], ['წართქმა-დამუხლებით', 48]], [['გრძელი', 47], ['ავაჯით', 48]]],
  ['წარდგომაჲ მწუხრად', [['კურიაკესა, ჴმაჲ ჱ', 49], ['ორშაბათსა, ჴმაჲ დ', 50], ['სამშაბათსა, ჴმაჲ ა', 51], ['ოთხშაბათსა, ჴმაჲ ე', 52], ['ხუთშაბათსა, ჴმაჲ ვ', 53], ['პარასკევსა, ჴმაჲ ზ', 54], ['შაბათსა, ჴმაჲ ვ', 55]],
    [['კვირას, ხმა ჱ', 49], ['ორშაბათს, ხმა დ', 50], ['სამშაბათს, ხმა ა', 51], ['ოთხშაბათს, ხმა ე', 52], ['ოთხშაბათს, სხვა', 53], ['ხუთშაბათს, ხმა ვ', 54], ['პარასკევს, ხმა გ', 55], ['შაბათს, ხმა ბ', 56]]],
  ['უფალო შეგუწყალენ', [['', 56]], [['', [57, 58]]]],
  ['მრჩობლი კუერექსი', [['', [57, 58]]], [['', [59, 64]]]],
  ['თხოვნითი კუერექსი', [['', [59, 62]]], [['', [65, 73]]]],
  ['და სულისაცა', [['', 63]], [['და სულისაცა… შენ, უფალო', 74], ['გრძელი', 75]]],
  ['შენ, უფალო', [['', 64]], [['და სულისაცა… შენ, უფალო', 74], ['გრძელი', 75]]],
  ['აწ განუტევე მონაჲ შენი', [['ჴმაჲ ა', 65], ['ჴმაჲ ბ', 66], ['ჴმაჲ გ', 67], ['ჴმაჲ დ', 68], ['ჴმაჲ ე', 69], ['ჴმაჲ ვ', 70], ['ჴმაჲ ზ', 71], ['ჴმაჲ ჱ', 72]], [['', 77]]],
  ['ღმრთისმშობელო ქალწულო', [['ჴმაჲ ვ', 73], ['გამშვენებული, ჴმაჲ ვ', 74]], [['ხმა ვ', 78], ['ხმა დ', 79]]],
  ['იყავნ სახელი უფლისა', [['', 75]], [['', [80, 81]]]],
  ['დაამტკიცე, ღმერთო', [['', 76]], [['', 82]]],
  ['უპატიოსნესსა', [], [['', 83]]],
];

const CISKARI: BookEntry[] = [
  ['დიდებაჲ მაღალთა შინა ღმერთსა', [['', 77]], [['', 86]]],
  ['დიდი კუერექსი', [['', [78, 83]]], [['ოთხ ხმაში', [87, 98]]]],
  ['ღმერთი უფალი', [['ჴმაჲ ა', 84], ['ჴმაჲ ბ', 86], ['ჴმაჲ გ', 88], ['ჴმაჲ დ', 90], ['ჴმაჲ ე', 92], ['ჴმაჲ ვ', 94], ['ჴმაჲ ზ', 96], ['ჴმაჲ ჱ', 98]], kkModes(99, 2)],
  ['ტროპარი აღდგომისაჲ', [['ჴმაჲ ა', 85], ['ჴმაჲ ბ', 87], ['ჴმაჲ გ', 89], ['ჴმაჲ დ', 91], ['ჴმაჲ ე', 93], ['ჴმაჲ ვ', 95], ['ჴმაჲ ზ', 97], ['ჴმაჲ ჱ', 99]], kkModes(100, 2),
    [['რაჟამს ლოდი, ხმა ა', 78], ['რაჟამს შთახედ საფლავად, ხმა ბ', 81], ['იხარებდინ ცანი, ხმა გ', 84], ['ბრწყინვალე იგი, ხმა დ', 87],
      ['თანა დაუსაბამოსა, ხმა ე', 90], ['ანგელოზთა ძალნი, ხმა ვ', 93], ['დახსენ ჯვარითა შენითა, ხმა ზ', 96], ['მაღლით გარდამოხედ, ხმა ჱ', 99]]],
  // vol. IX only: "დიდება, აწ და" sung together with the theotokion that follows the troparion
  ['დიდება, აწ და; ღმრთისმშობლისა', [], [], [['გაბრიელ გიღაღადა, ხმა ა', [79, 80]], ['ყოველივე საიდუმლო შენი, ხმა ბ', [82, 83]],
    ['შენ, შუამდგომელსა, ხმა გ', [85, 86]], ['რომელი საუკუნიდგან, ხმა დ', [88, 89]], ['გიხაროდენ, ბჭეო განუღებელო, ხმა ე', [91, 92]],
    ['რომელმან კურთხეულ უწოდე, ხმა ვ', [94, 95]], ['ვითარცა ჩვენისა აღდგომისა, ხმა ზ', [97, 98]], ['რომელი ჩვენთვის იშევ, ხმა ჱ', [100, 101]]]],
  ['ნეტარ არიან უბიწონი', [['', 100]], [['', 115]]],
  ['აქებდით სახელსა უფლისასა', [['ქართლ-კახური', 101], ['', 102]], [['', 116]]],
  ['მდინარეთა ზედა ბაბილოვნისათა', [['', 103]]],
  ['ჩასართავი', [['ჴმაჲ ე', 104]], [['', 117]]],
  ['გუნდნი ანგელოზთანი', [['ჴმაჲ ე', 105]], [['', 118]]],
  ['მცირე კუერექსი', [['', [106, 107]]]],
  ['აღსავალი', [['ჴმაჲ დ, I', 108], ['ჴმაჲ დ, II', 110], ['ჴმაჲ დ, III', 112]]],
  ['ჩასართავი აღსავლისაჲ', [['ჴმაჲ დ', 109]]],
  ['დიდებაჲ, აწ და', [['ჴმაჲ დ', 111], ['', 144]]],
  ['წარდგომანი საცისკროჲსა სახარებისანი', [['ჴმაჲ ა', 113], ['ჴმაჲ ბ', 114], ['ჴმაჲ გ', 115], ['ჴმაჲ დ', 116], ['ჴმაჲ ე', 117], ['ჴმაჲ ვ', 118], ['ჴმაჲ ზ', 119], ['ჴმაჲ ჱ', 120]], kkModes(119)],
  ['უფალო, შეგვიწყალენ', [], [['', [127, 128]]]],
  ['ყოველი სული', [['', 121], ['', 130]], [['', 129], ['', 136]]],
  ['მრჩობლი კუერექსი', [['', 122], ['', [135, 136]]], [['', 130]]],
  ['და სულისაცა', [['', 123]], [['', 131]]],
  ['დიდებაჲ შენდა, უფალო', [['', 124]], [['', 132]]],
  ['აღდგომაჲ ქრისტესი', [['ჴმაჲ ვ', 125], ['ჴმაჲ ზ', 126]], [['ხმა ზ', 133]]],
  ['ადიდებს სული ჩემი', [['', 127]], [['', 134]]],
  ['უპატიოსნესსა', [['ჴმაჲ ვ', 128], ['', 143]]],
  ['წმიდა არს უფალი', [['', 129]], [['', 135]]],
  ['უმეტესად კურთხეულ ხარ', [['ჴმაჲ ბ', 131]], [['ხმა ვ', 137]]],
  ['დიდება მაღალიანი', [['', 132]], [['', 138]]],
  ['დღეს ცხორებაჲ არს', [['ჴმაჲ ე', 133]]],
  ['აღდეგ საფლავისაგან', [['ჴმაჲ ვ', 134]]],
  ['თხოვნითი კუერექსი', [['', [137, 140]]]],
  ['შენ, უფალო', [['', 141]]],
  ['ზეშთა მბრძოლისა', [['ჴმაჲ ჱ', 142]], [['ავაჯით', 139]]],
];

const buildChants = (prefix: string, entries: BookEntry[]): ChantItem[] => {
  let gelati = 0;
  return entries.map(([title, versions, kk = [], v9 = []], i) => {
    // ids stay stable: Gelati entries are counted among themselves, vol. III-only and vol. IX-only ones are named after their first number
    const key = versions.length ? String(++gelati) : kk.length ? `kk${numsOf(kk[0][1])[0]}` : `v9-${numsOf(v9[0][1])[0]}`;
    return {
      id: `${prefix}-${key}`,
      index: i + 1,
      title,
      variants: [
        ...versions.map(([label, n0], vi) => {
          const nums = numsOf(n0);
          const source = bookSource(nums);
          // unlabelled versions are named after their manuscript; the book number tells them apart
          const version = label || source || '';
          const page = bookPage(nums[0]);
          return {
            id: `${prefix}-v-${key}-${vi + 1}`,
            code: versions.length > 1 ? `გ.ს. №${nums[0]}` : 'გ.ს.',
            label: 'გელათის სკოლა',
            chantName: title,
            fullTitle: bookFullTitle(title, variantName({ bookNums: nums, version }), page),
            version,
            page,
            bookNums: nums,
            source,
          };
        }),
        ...kk.map(([label, n0], vi) => {
          const nums = numsOf(n0);
          return kkVariant(`${prefix}-v-${key}-k${vi + 1}`, kk.length > 1 ? `ქ.კ. №${nums[0]}` : 'ქ.კ.', title, label, nums);
        }),
        ...v9.map(([label, n0]) => {
          const first = numsOf(n0)[0];
          return v9Variant(`${prefix}-v-${key}-x${first}`, `გ.ს. IX №${first}`, title, label, n0);
        }),
      ],
    };
  });
};

export const MWUKHRI_CHANTS = buildChants('mw', MWUKHRI);
export const CISKARI_CHANTS = buildChants('ck', CISKARI);

export const ALL_CHANTS: ChantItem[] = [...TSIRVA_CHANTS, ...MWUKHRI_CHANTS, ...CISKARI_CHANTS, ...SADGHESASWAULO_CHANTS,
  ...MARXVANI_CHANTS, ...ZATIKI_CHANTS, ...MOMIXSENENI_CHANTS, ...DZLISPIREBI_CHANTS, ...KATABASIEBI_CHANTS,
  ...DASADEBLEBI_CHANTS];
