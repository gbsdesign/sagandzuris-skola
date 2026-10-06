// "ჩემი სამოსი": the parts of the chokha a student collects.
// Photo parts are cut out of the chokha photo along their outlines (background and face removed)
// by scripts/build-samosi.mjs into public/home/samosi: one figure-sized layer per part, so the
// layers stack into the whole chokha, plus a square thumbnail for each part's button.
// Parts that are not in the photo are drawn (SamosiArt) and sit in slots beside the figure.

export const SAMOSI_DIR = '/home/samosi';
export const SAMOSI_FIGURE = `${SAMOSI_DIR}/figure.webp`;
export const SAMOSI_ASPECT = 379 / 647;

export type SamosiArtKind = 'boots' | 'hat';

export interface SamosiPart {
  id: string;
  label: string;
  /** drawn instead of cut from the photo */
  art?: SamosiArtKind;
  /** one sentence of the part's story, shown when the student adds it */
  story: string;
}

export const SAMOSI_PARTS: SamosiPart[] = [
  { id: 'chokha', label: 'ჩოხა', story: 'ჩოხა ქართველი მამაკაცის ტრადიციული სამოსია — საუკუნეების მანძილზე იგი ვაჟკაცობისა და ღირსების ნიშნად ითვლებოდა.' },
  { id: 'akhalukhi', label: 'ახალუხი', story: 'ახალუხი ჩოხის ქვეშ იცმევა: ტანზე მომდგარი, მაღალსაყელოიანი სამოსია, რომელიც ჩოხის გულისპირში მოჩანს.' },
  { id: 'masrebi', label: 'მასრები', story: 'მასრებში ძველად თოფის ერთ გასროლაზე გათვლილი დენთი ინახებოდა, დღეს კი ისინი ჩოხის მორთულობაა.' },
  { id: 'kamari', label: 'ქამარი', story: 'ვიწრო ტყავის ქამარი, ხშირად ვერცხლით მოჭედილი, ჩოხას წელზე უჭერს — მასზე ხანჯალი ეკიდება.' },
  { id: 'khanjali', label: 'ხანჯალი', story: 'ორლესული ხანჯალი ძველად ქართველი მამაკაცის იარაღი იყო, დღეს კი ჩოხის ღირსების ნიშანია.' },
  { id: 'aziurebi', label: 'აზიურები', art: 'boots', story: 'ჩოხასთან რბილი ტყავის ჩექმებს იცვამდნენ — მსუბუქსა და მოხერხებულს ცხენზე ჯდომისა და ცეკვისთვის.' },
  { id: 'papanaki', label: 'ფაფანაკი', art: 'hat', story: 'ქუდი კაცის ღირსების ნიშანი იყო — „ქუდზე კაცი“ ნიშნავდა, რომ ყველა ქუდოსანი ერთად უნდა დამდგარიყო.' },
];

export const samosiLayer = (id: string) => `${SAMOSI_DIR}/${id}.webp`;
export const samosiThumb = (id: string) => `${SAMOSI_DIR}/thumb-${id}.webp`;
