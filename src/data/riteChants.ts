// The tabs of the rites: ხელდასხმა (a priest's ordination), ჯვრისწერა (the wedding) and პანაშვიდი (the funeral,
// „წესის აგება“ and the panikhida). Each item is one chant and lists its versions, as წირვა does; they come from
// „ქართული გალობის ანთოლოგია“ vol. I (Koridze, Gelati school) — later volumes add theirs to the same items by id
// (anthologyChants.ts / anthologyEastChants.ts, e.g. vol. II's funeral litany under pn-2).
// A chant the site already has with the same words (an irmos of vol. VIII) is shown from there, under its own id here.
import { ChantItem, ChantVariant } from './tsirvaChants';
import { AnthPiece, anthVariant, anthVariantsFor } from './anthologyChants';
import { DZLISPIREBI_CHANTS, KATABASIEBI_CHANTS } from './irmosBookChants';

// an item added later gets its own id (`id`), so the others keep theirs (prefix-1, prefix-2 … in their order)
type Item = { title: string; pieces?: AnthPiece[]; same?: string[]; id?: string };

const KORIDZE = 'ქორიძე';
const p = (num: string, file: number, page: number, source?: string): AnthPiece =>
  ({ vol: 1, num, file, page, version: KORIDZE, source });

// the vol. VIII irmoi with the same words: shown in the rite too
const v8 = new Map([...DZLISPIREBI_CHANTS, ...KATABASIEBI_CHANTS].flatMap(c => c.variants.map(v => [v.id, v] as const)));
const sameAs = (chantId: string, title: string, id: string): ChantVariant => {
  const v = v8.get(id);
  if (!v) throw new Error(`riteChants: no version ${id}`);
  return { ...v, id: `${chantId.replace(/^([a-z]+)-/, '$1-v-')}-${id}`, chantName: title };
};

const build = (prefix: string, items: Item[]): ChantItem[] => {
  let n = 0;
  return items.map(({ title, pieces = [], same = [], id: own }, i) => {
    const id = own ?? `${prefix}-${++n}`;
    return {
      id,
      index: i + 1,
      title,
      variants: [...pieces.map(a => anthVariant(id, title, a)), ...same.map(s => sameAs(id, title, s)), ...anthVariantsFor(id, title)],
    };
  });
};

// the circling of the wedding and the ordination: „ესაია, მხიარულ იყავ“, „წმიდანო მოწამენო“, „დიდება შენდა, ქრისტე ღმერთო“
const ISAIAH: Item = { title: 'ესაია, მხიარულ იყავ', same: ['dz-v-5-8'] };
const MARTYRS: Item = { title: 'წმიდანო მოწამენო', pieces: [p('163', 163, 357, 'ხმა ზ')] };
const GLORY: Item = { title: 'დიდება შენდა, ქრისტე ღმერთო', pieces: [p('164', 164, 358, 'ხმა ზ')] };

export const KHELDASKHMA_CHANTS: ChantItem[] = build('kh', [
  MARTYRS,
  GLORY,
  ISAIAH,
  { title: 'კირიე, ელეისონ', pieces: [p('166', 166, 362), p('167', 167, 362)] },
  { title: 'აქსიოს', pieces: [p('168', 168, 363)] },
  // vol. XXVIII: „საფრხე შეიმუსრა“ after „აქსიოს“
  { title: 'საფრხე შეიმუსრა', id: 'kh-a28-218' },
]);

// the book prints these after the ordination's chants, under one heading „მღვდლის კურთხევისა და ქორწინებისა“;
// that „მოსლვისა შენისა“ begins the wedding's part is a guess from the order
// vol. IV (the Karbelashvili brothers) adds „შენ, რომელმან განანათლენ“ at the entrance, „ღმრთისმშობელი და ყოვლად
// პატიოსანი“ beside „შენ ხარ ვენახი“ and the crowning's „დიდება შენდა, ღმერთო ჩვენო“ and „დაადგ თავსა მისსა გვირგვინი“
export const JVRISWERA_CHANTS: ChantItem[] = build('jv', [
  { title: 'მოსლვისა შენისა', same: ['kt-v-7-2'] },
  { title: 'შენ, რომელმან განანათლენ', id: 'jv-a4-192' },
  { title: 'ქორწილი წმიდა არს', pieces: [p('170', 170, 366)] },
  { title: 'შენ ხარ ვენახი', pieces: [p('171', 171, 368)] },
  { title: 'ღმრთისმშობელი და ყოვლად პატიოსანი', id: 'jv-a4-194' },
  { title: 'განეღო სასძლო', pieces: [p('172', 172, 370)] },
  { title: 'დიდება შენდა, ღმერთო ჩვენო', id: 'jv-a4-195' },
  { title: 'დაადგ თავსა მისსა გვირგვინი', id: 'jv-a4-196' },
  ISAIAH,
  MARTYRS,
  GLORY,
  // vol. XXI: the songs of the wedding's table
  { title: 'მოსალხენი (სუფრაზე)', id: 'jv-a21-134' },
]);

const IRMOS = (ode: string) => `ძლისპირი, გალობა ${ode}, ხმა ვ`;
export const PANASHVIDI_CHANTS: ChantItem[] = build('pn', [
  { title: 'სულთა თანა', pieces: [p('173', 173, 375, 'ტროპარი, ხმა დ')] },
  { title: 'მიცვალებულთა კვერექსი', pieces: [p('174–177', 174, 379)] },
  { title: 'უპატიოსნესსა ქერუბიმთასა; დიდება, აწ და', pieces: [p('178–179', 178, 380)] },
  { title: 'საუკუნოდ იყავნ ხსენება', pieces: [p('180', 180, 382)] },
  { title: 'კურთხეულ ხარ შენ, უფალო; შეიწყალე მონა ესე შენი', pieces: [p('181–186', 181, 382)] },
  { title: 'მოგვმადლენ, უფალო; ამინ; განუსვენე, უფალო', pieces: [p('187–189', 187, 386)] },
  { title: 'მოკვეთილი ჰკვეთს', pieces: [p('190', 190, 387, IRMOS('ა'))] },
  { title: 'ზღვა მეწამული', pieces: [p('191', 191, 389, IRMOS('ა'))] },
  { title: 'სამებაო წმიდაო', pieces: [p('192', 192, 391, IRMOS('გ'))] },
  { title: 'რაჟამს წინასწარმეტყველმან', pieces: [p('193', 193, 392, IRMOS('დ'))] },
  { title: 'ბნელისაგან ცოდვათასა', pieces: [p('194', 194, 394, IRMOS('ე'))] },
  { title: 'მუცლად იღო იონა ვეშაპმან', pieces: [p('195', 195, 396, IRMOS('ვ'))] },
  { title: 'წმიდათა თანა განუსვენე', pieces: [p('196', 196, 398, 'კონდაკი, ხმა ჱ')] },
  { title: 'ჰოი, სასწაული', pieces: [p('197', 197, 402, IRMOS('ზ'))] },
  { title: 'ცა ვრცელი განცვიფრებულ არს', pieces: [p('198', 198, 404, IRMOS('ჱ'))] },
  { title: 'შენ მხოლო სანატრელ ხარ', pieces: [p('199', 199, 406, IRMOS('თ'))] },
  { title: 'დიდება შენდა, უფალო; ის პოლლა; უფალო, შეგვიწყალენ', pieces: [p('200–202', 200, 408)] },
  { title: 'წმიდაო ღმერთო', pieces: [p('203', 203, 409)] },
  { title: 'ვგოდებ და ვიგლოვ', pieces: [p('204', 204, 410, 'დასდებელი, ხმა ვ')] },
]);

// „პარაკლისი“ (vol. XIII, Kereselidze's ms. Q672, 2026-10-31): the two paracleses he wrote down to be sung whole — to the
// Most Holy Theotokos (XIII №89–183) and to Sweet Jesus (№184–237); each is one item, its chants versions in the service's
// order (anthologyWestChants.ts).
export const PARAKLISI_CHANTS: ChantItem[] = build('pr', [
  { title: 'ღმრთისმშობლის პარაკლისი' },
  { title: 'იესო ტკბილის პარაკლისი' },
]);
