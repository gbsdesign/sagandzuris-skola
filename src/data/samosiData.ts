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
}

export const SAMOSI_PARTS: SamosiPart[] = [
  { id: 'chokha', label: 'ჩოხა' },
  { id: 'akhalukhi', label: 'ახალუხი' },
  { id: 'masrebi', label: 'მასრები' },
  { id: 'kamari', label: 'ქამარი' },
  { id: 'khanjali', label: 'ხანჯალი' },
  { id: 'aziurebi', label: 'აზიურები', art: 'boots' },
  { id: 'papanaki', label: 'ფაფანაკი', art: 'hat' },
];

export const samosiLayer = (id: string) => `${SAMOSI_DIR}/${id}.webp`;
export const samosiThumb = (id: string) => `${SAMOSI_DIR}/thumb-${id}.webp`;
