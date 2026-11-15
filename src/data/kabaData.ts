// „ქართული კაბა“ beside the chokha in „ჩემი სამოსი“ (redesign stage 5): the parts of the Georgian women's dress a
// member collects. The pictures are made by Gemini in the owner's studio (components/views/KabaStudio.tsx) in the
// chokha photo's style, and members see the dress only once the owner has published them (samosiArt/kaba).
// Layer parts are cut out of the one dress picture, so they stack; a headdress has a picture of its own and sits
// above the collar, where the chokha's hats sit.
// Since 2026-11-15 the dress is the outfit of the user's own photos (utils/kabaArt.ts holds its look): a pale
// grey-blue dress, a black velvet katibi with long hanging sleeves lined with teal-and-gold brocade, and the
// baghdadi — the patterned silk kerchief worn over the lechaki (Georgian Encyclopedia: „ბაღდადი“, „ლეჩაქი“,
// „თავსაბურავი“).

export interface KabaPart {
  id: string;
  label: string;
  story: string;
  /** a picture of its own above the collar, instead of a layer of the dress picture */
  head?: boolean;
  /** a headdress that falls onto the shoulders: drawn over the dress's layers, not behind them */
  over?: boolean;
  /** for the picture maker: what to keep of the whole dress (English, as the image model reads it) */
  keep: string;
}

/** bottom to top: each layer is drawn over the ones before it */
export const KABA_PARTS: KabaPart[] = [
  {
    id: 'kaba',
    label: 'კაბა',
    story: 'ქართული კაბა გრძელი, ტანზე მომდგარი სამოსია ფართო კალთით — იგი ქალის სინარნარესა და ღირსებას გამოხატავდა.',
    keep: 'the long dress itself with its sleeves, their patterned cuffs and the hands (remove the overcoat with its hanging sleeves, the sash and the embroidered chest panel, and complete the plain dress cloth where they were)',
  },
  {
    id: 'gulispiri',
    label: 'გულისპირი',
    story: 'გულისპირი კაბის მკერდზე დამაგრებული ნაქარგია — ოქრომკედით, მარგალიტითა და ძვირფასი ქვებით მორთული.',
    keep: 'the embroidered chest panel (gulispiri) only',
  },
  {
    id: 'sartqeli',
    label: 'სარტყელი',
    story: 'სარტყელი კაბას წელზე ერტყმოდა: გრძელი, ნაქარგი ქამარი, რომლის ბოლოები წინ ეშვებოდა.',
    keep: 'the sash (sartqeli) only: the band round the waist and its two long ends hanging down the front',
  },
  {
    id: 'katibi',
    label: 'ქათიბი',
    story: 'ქათიბი კაბაზე ჩასაცმელი ხავერდის ზედა სამოსია, ბეწვით ან ოქრომკედით შემკული — მას დღესასწაულზე და სიცივეში იცვამდნენ.',
    keep: 'the black velvet overcoat (katibi) only: open at the front, with its two long hanging sleeves, their patterned lining and its gold edging',
  },
  {
    id: 'lechaki',
    label: 'ლეჩაქი',
    head: true,
    story: 'ქალი თავს თავსაკრავითა და ლეჩაქით იბურავდა: ლეჩაქი თხელი, თეთრი ქსოვილია, რომელიც თავსაკრავიდან მხრებზე ეშვება.',
    keep: '',
  },
  {
    id: 'baghdadi',
    label: 'ბაღდადი',
    head: true,
    over: true,
    story: 'ბაღდადი ოთხკუთხა აბრეშუმის თავსაფარია, სადა ან სახეებიანი — სადღესასწაულოდ, მოკეცილს, ლეჩაქის ზემოდან იხვევდნენ.',
    keep: '',
  },
];

export const KABA_TOTAL = KABA_PARTS.length;
export const KABA_LAYERS = KABA_PARTS.filter(p => !p.head);
/** the headdresses, in the order they go on: the veil, then the kerchief over it */
export const KABA_HEADS = KABA_PARTS.filter(p => p.head);
