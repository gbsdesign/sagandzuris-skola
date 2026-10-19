// "ჩემი სამოსი": the parts of the chokha a student collects.
// Photo parts are cut out of the chokha photo along their outlines (background and face removed)
// by scripts/build-samosi.mjs into public/home/samosi: one figure-sized layer per part, so the
// layers stack into the whole chokha, plus a square thumbnail for each part's button.
// The boots are drawn (SamosiArt) and sit in a slot beside the figure. The papanaki and the hats are cut-out
// photos of their own (SamosiPhoto): the papanaki on the right shoulder (cut from a photo the user sent), the hats
// above the collar where the head would be, one at a time (the papakha's two kinds and the Svan hat: cut from photos
// the user sent; Kakhetian hat: product photo from cekva.ge; kabalakhi: "Megrelian man in chokha", Wikimedia Commons,
// CC BY 4.0).

export const SAMOSI_DIR = '/home/samosi';
export const SAMOSI_FIGURE = `${SAMOSI_DIR}/figure.webp`;
export const SAMOSI_ASPECT = 379 / 647;

export type SamosiArtKind = 'boots';

/** a part shown as its own cut-out photo, dyed by lightness (utils/samosiDye.ts) */
export interface SamosiPhoto {
  src: string;
  /** the photo's own colour (a SAMOSI_COLORS id); none when it is not one of them */
  native?: string;
  /** the lightness range (OKLab L, 0…1) of the pixels that take a new colour; the rest (silver, cords) stay */
  range: [number, number];
  /** where it sits, in % of the figure's width. On the shoulder it is placed in the figure's box (`top` in % of
   *  its height); a hat in the room above the collar (`top` in % of the figure's width, from the room's top). */
  place: { left: number; top: number; width: number };
}

/** one of a hat's kinds the member chooses between (students/{uid}.samosiKinds), each its own photo */
export interface SamosiKind {
  id: string;
  label: string;
  photo: SamosiPhoto;
}

export interface SamosiPart {
  id: string;
  label: string;
  /** drawn instead of cut from the photo */
  art?: SamosiArtKind;
  /** its own cut-out photo, instead of a layer of the chokha photo */
  photo?: SamosiPhoto;
  /** one sentence of the part's story, shown when the student adds it */
  story: string;
  /** a hat: worn above the collar, one at a time */
  head?: boolean;
  /** worn on the right shoulder of the chokha */
  shoulder?: boolean;
  /** one of the extra hats: any one of them counts as the outfit's last part */
  extraHat?: boolean;
  /** kinds to choose between; `photo` is the first one's */
  kinds?: SamosiKind[];
}

// the papakha's kinds: long curly fleece and long shaggy fleece
const PAPAKHA_KINDS: SamosiKind[] = [
  {
    id: 'khuchucha',
    label: 'ხუჭუჭა',
    photo: { src: `${SAMOSI_DIR}/hat-papakha-khuchucha.webp`, native: 'white', range: [0, 1], place: { left: 27.6, top: 13.1, width: 53 } },
  },
  {
    id: 'banjgvliani',
    label: 'ბანჯგვლიანი',
    photo: { src: `${SAMOSI_DIR}/hat-papakha-banjgvliani.webp`, native: 'black', range: [0, 1], place: { left: 26.5, top: 13.1, width: 52 } },
  },
];

export const SAMOSI_PARTS: SamosiPart[] = [
  { id: 'chokha', label: 'ჩოხა', story: 'ჩოხა ქართველი მამაკაცის ტრადიციული სამოსია — საუკუნეების მანძილზე იგი ვაჟკაცობისა და ღირსების ნიშნად ითვლებოდა.' },
  { id: 'akhalukhi', label: 'ახალუხი', story: 'ახალუხი ჩოხის ქვეშ იცმევა: ტანზე მომდგარი, მაღალსაყელოიანი სამოსია, რომელიც ჩოხის გულისპირში მოჩანს.' },
  { id: 'masrebi', label: 'მასრები', story: 'მასრებში ძველად თოფის ერთ გასროლაზე გათვლილი დენთი ინახებოდა, დღეს კი ისინი ჩოხის მორთულობაა.' },
  { id: 'kamari', label: 'ქამარი', story: 'ვიწრო ტყავის ქამარი, ხშირად ვერცხლით მოჭედილი, ჩოხას წელზე უჭერს — მასზე ხანჯალი ეკიდება.' },
  { id: 'khanjali', label: 'ხანჯალი', story: 'ორლესული ხანჯალი ძველად ქართველი მამაკაცის იარაღი იყო, დღეს კი ჩოხის ღირსების ნიშანია.' },
  { id: 'aziurebi', label: 'აზიურები', art: 'boots', story: 'ჩოხასთან რბილი ტყავის ჩექმებს იცვამდნენ — მსუბუქსა და მოხერხებულს ცხენზე ჯდომისა და ცეკვისთვის.' },
  {
    id: 'papanaki',
    label: 'ფაფანაკი',
    shoulder: true,
    photo: { src: `${SAMOSI_DIR}/papanaki.webp`, native: 'black', range: [0, 0.5], place: { left: 63.5, top: 4.6, width: 21 } },
    story: 'ქუდი კაცის ღირსების ნიშანი იყო — „ქუდზე კაცი“ ნიშნავდა, რომ ყველა ქუდოსანი ერთად უნდა დამდგარიყო.',
  },
  {
    id: 'papakha',
    label: 'ფაფახი',
    head: true,
    extraHat: true,
    photo: PAPAKHA_KINDS[0].photo,
    kinds: PAPAKHA_KINDS,
    story: 'ფაფახი ცხვრის ბეწვის ქუდია — ჩოხასთან ერთად მას დღესასწაულზეც ატარებდნენ და ზამთრის სიცივეშიც.',
  },
  {
    id: 'kakhuri',
    label: 'კახური ქუდი',
    head: true,
    extraHat: true,
    photo: { src: `${SAMOSI_DIR}/hat-kakhuri.webp`, native: 'white', range: [0.42, 1], place: { left: 33.5, top: 13.2, width: 36 } },
    story: 'კახური ქუდი ცხვრის მატყლისგან ხელით აგორებული თექისაა: გადაკეცილი კიდით და თავზე ჯვრისებრი ზონრით.',
  },
  {
    id: 'svanuri',
    label: 'სვანური ქუდი',
    head: true,
    extraHat: true,
    // all of it is dyed: the dark cords and tassel only darken, so their soft edges leave no light outline
    photo: { src: `${SAMOSI_DIR}/hat-svanuri.webp`, native: 'white', range: [0, 1], place: { left: 34.5, top: 12.9, width: 34 } },
    story: 'სვანური ქუდი ცხვრის მატყლის თექისგან კეთდება: მრგვალია, ზონრით მოვლებული და პატარა ფოჩით.',
  },
  {
    id: 'kabalakhi',
    label: 'ყაბალახი',
    head: true,
    extraHat: true,
    photo: { src: `${SAMOSI_DIR}/hat-kabalakhi.webp`, range: [0, 1], place: { left: 34.85, top: 25.25, width: 45 } },
    story: 'ყაბალახი გრძელბოლოიანი კაპიუშონია; სამეგრელოში მას თავზე ჩალმასავით შემოიხვევდნენ, ბოლოს კი გვერდზე უშვებდნენ.',
  },
];

/** the outfit's parts to collect: every part except the extra hats, plus one for any of those */
export const SAMOSI_TOTAL = SAMOSI_PARTS.filter(p => !p.extraHat).length + 1;
const EXTRA_HATS = new Set(SAMOSI_PARTS.filter(p => p.extraHat).map(p => p.id));
/** how many of the outfit's SAMOSI_TOTAL parts the collected ids make */
export const samosiDone = (owned: string[]) =>
  owned.filter(id => !EXTRA_HATS.has(id)).length + (owned.some(id => EXTRA_HATS.has(id)) ? 1 : 0);

// The member's kind of each hat that has kinds, in students/{uid}.samosiKinds ({ papakha? }); none = the first
export type SamosiKinds = Record<string, string>;

export const samosiKindOf = (part: SamosiPart, kinds: SamosiKinds) => part.kinds?.find(k => k.id === kinds[part.id]) || part.kinds?.[0];
/** a part's own photo in the member's kind */
export const samosiPhotoOf = (part: SamosiPart, kinds: SamosiKinds) => samosiKindOf(part, kinds)?.photo || part.photo;

export const samosiLayer = (id: string) => `${SAMOSI_DIR}/${id}.webp`;
export const samosiThumb = (id: string) => `${SAMOSI_DIR}/thumb-${id}.webp`;

// The outfit's colours: the member picks one (students/{uid}.samosiColor) and the whole outfit takes it — the
// chokha, masrebi and akhalukhi, the papanaki and the hat. The first is the chokha photo's own blue; the rest are
// dyed in the browser (utils/samosiDye.ts).
export interface SamosiColor {
  id: string;
  label: string;
  hex: string;
}

export const SAMOSI_COLORS: SamosiColor[] = [
  { id: 'blue', label: 'ლურჯი', hex: '#26375f' },
  { id: 'green', label: 'მწვანე', hex: '#183a28' },
  { id: 'shindi', label: 'მუქი შინდისფერი', hex: '#531c2a' },
  { id: 'black', label: 'შავი', hex: '#1d1c1e' },
  { id: 'white', label: 'თეთრი', hex: '#ece6da' },
  { id: 'brown', label: 'ყავისფერი', hex: '#563823' },
  { id: 'red', label: 'მუქი წითელი', hex: '#5a1416' },
  { id: 'lilac', label: 'მუქი იასამნისფერი', hex: '#311f47' },
];

export const SAMOSI_DEFAULT_COLOR = SAMOSI_COLORS[0].id;
/** the layers of the chokha photo cut from its blue cloth: they are dyed into the colour */
export const SAMOSI_DYED = new Set(['chokha', 'masrebi', 'akhalukhi']);

export const samosiHex = (colorId: string) => (SAMOSI_COLORS.find(c => c.id === colorId) || SAMOSI_COLORS[0]).hex;
