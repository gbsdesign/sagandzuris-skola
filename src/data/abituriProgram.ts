import type { FolkRegionId } from './songsData';

// "აბიტურიენტს": the admission exams of the Tbilisi State University of Chant (galoba.edu.ge) — the 2026
// programs from the university's PDFs, merged with the school's older page „საგანძურელ აბიტურიენტებს“
// (sites.google.com/view/asabituri): its Drive folders (sheet music + voice-by-voice recordings) stay linked.
//
// A track is a Drive file id (played through the audio Worker) or "e:<yyyy/mm/file.mp3>", a learning recording
// on galoba.edu.ge (the Worker's /edu/ route; the site sends no CORS headers, so the player can't read it directly).

export interface ProgramTake {
  label: string;
  all?: string;
  v1?: string;
  v2?: string;
  v3?: string;
}

export interface ProgramItem {
  title: string;
  sub: string;                 // region / school, variant
  isNew?: boolean;             // came into the program in 2026
  vid?: string;                // the chant's version in the app's book notes
  book?: string;               // where it is printed
  takes?: ProgramTake[];
  notes?: number;              // the song's notes page (public/notes/song/NNN, see songBookChants.ts)
  folder?: string;             // the Drive folder linked from the old page
  links?: { label: string; url: string }[];
  song?: [title: string, region: FolkRegionId, area?: string]; // the song in the songs archive (more performers)
}

const EDU = (name: string) => `e:2024/04/${name}•გალობის-უნივერსიტეტი•სასწავლო.mp3`;

// ---------- songs ----------

const ALILO: ProgramItem = {
  title: 'ალილო', sub: 'იმერული · ვანის ვარიანტი',
  takes: [
    { label: 'სასწავლო', all: '114hnlKCVg0BbHe3z460R8l2KQji0mRJA', v1: '1s23SzxRUM3qeB5FFew7c44EXxweZQxxc', v2: '1dfMdHrBTG-zxHGyGH3FtTQqaC2KbcjyI', v3: '1usWtJnu1pdSMHkRxEp0vK53tPB7RxVPn' },
    { label: 'ვანის ვარიანტი', all: '17szV8tut-WeI8CZt0fCDk71DnOQ1TgqI' },
  ],
  notes: 1,
  folder: '1lXzTuNr8SgqsNG1IH37rOd_-ayvXu1fy',
  song: ['ალილო', 'imereti'],
};

const MOKLE: ProgramItem = {
  title: 'მოკლე მრავალჟამიერი', sub: 'ქართლი · ვანო მჭედლიშვილის ვარიანტი', isNew: true,
  links: [{ label: 'audiomack', url: 'https://audiomack.com/folkcentre/song/track-4-46' }],
};

const ASLANURI: ProgramItem = {
  title: 'ასლანური მრავალჟამიერი', sub: 'რაჭული',
  takes: [
    { label: 'სასწავლო', all: '1bF6KOhF9oCb-YsAAv58FSiFm4obbGsam', v1: '1d0rlagkUbsv9TCr-0vW4mwv_cOypdAwz', v2: '1o2GO-jFOwTGl_QAPT4v0VBDXr9soLj0h', v3: '16sJigeaq47vA7I9eK6Q7cWIR8CC6TEx3' },
    { label: 'ანჩისხატის გუნდი', all: '1fX2Khuk-Dthp3aGg5GLHoCJBUrmNtwx3' },
  ],
  notes: 2,
  folder: '1aNLrkC52PAOZS51tJza10FMAk2v_7vx9',
  song: ['ასლანური მრავალჟამიერი', 'racha'],
};

export const BOYS_SONGS: ProgramItem[] = [
  {
    title: 'ბერიკაცი ვარ', sub: 'კახური · ანსამბლ „წინანდლის“ ვარიანტი', isNew: true,
    links: [{ label: 'audiomack', url: 'https://audiomack.com/folkcentre/song/357' }],
    song: ['ბერიკაცი ვარ', 'kakheti'],
  },
  MOKLE,
  {
    title: 'ჯვარი წინასა', sub: 'მთიულური',
    takes: [{ label: 'ანჩისხატის გუნდი', all: '1p9_Sk-Ea4Mv4KVNeJcuAjbrdUT0zbrS5' }],
    notes: 3,
    folder: '1XBcsG3fnboKOi3PmFqacOzK4A6WGXKbU',
    song: ['ჯვარი წინასა', 'mtianeti'],
  },
  {
    title: 'მუხა წონწილებს', sub: 'მესხური', isNew: true,
    links: [{ label: 'YouTube', url: 'https://youtu.be/IFQsk6H6lEM' }],
  },
  ALILO,
  {
    title: 'კუჩხი ბედინერი', sub: 'მეგრული',
    takes: [
      { label: 'სასწავლო', all: EDU('კუჩხი-ბედინერი-მეგრული'), v1: EDU('კუჩხი-ბედინერი-მეგრული-პირველი-ხმა'), v2: 'e:2024/04/კუჩხი-ბედინერი-მეგრული-მეორე-ხმა•გალობის-უნივერსიტეტი•სასწავლო-2.mp3', v3: 'e:2024/04/კუჩხი-ბედინერი-მეგრული-მესამე-ხმა•გალობის-უნივერსიტეტი•სასწავლო.mp3.mp3' },
      { label: 'ბასიანი', all: '1L7Bbeb63x8uLHjReHCX5XlTKlNNoeATS' },
    ],
    notes: 9,
    folder: '1_NS_1G_IppDMrKRhOhomvbavjbXPHc3Q',
    song: ['ქუჩხი ბედინერი', 'samegrelo'],
  },
  {
    title: 'მასპინძელსა მხიარულსა', sub: 'გურული',
    takes: [{ label: 'სასწავლო', all: '13Rl9ODS1NPgqhHRH6Qs_f9MJMiA-WCMT', v1: '1KglSssVZEKDqi--HRSSoqKn6MFDcY2Bt', v2: '1yO2VzSqAS2lnQ4cS9zB5I3EsrB2ElOGX', v3: '1ta9A83z7dWItxQm_4R2BEg6Jp69YOH7t' }],
    notes: 4,
    folder: '1XqbxwL-5cvizjaR4C9tvB1Q5vJR7cIVk',
    song: ['მასპინძელსა მხიარულსა', 'guria'],
  },
  {
    title: 'ჩაღმა ჩაყრილო ვენახო', sub: 'აჭარული',
    takes: [
      { label: 'სასწავლო', all: '1tGet8rOj505yDr-XiApEIhD2FO09GsHe', v1: '1-pZHN_ffq3S3w2v-9Uj9RG6YE36nwg9m', v2: '1PzPC7IASP7SBhAQBITzMGSufg1fZACdi', v3: '1CFfNV5eFzfze8SjB2nd01JJS1ZxvshTY' },
      { label: 'სხვა ვარიანტი', all: '1060dH3HRZKYTlXCaBpTa_8z98apxLgg7' },
    ],
    notes: 5,
    folder: '16GOWrgRVnl5PaHMlLrW_d88DdKeWEqZz',
  },
  {
    title: 'ლაჟღვაში', sub: 'სვანური',
    takes: [
      { label: 'სასწავლო', all: '1kLEV_dwbM-UHpWfJUuJT0WXUXLmeTuyL', v1: '1tqqaqtBK3QkOcS5JG3Wsk1rGhbcKnuwd', v2: '1Y8S52IOhoIDl9jl4LYLSdx-yqJ4eD3yy', v3: '1YsIyql8gVnBzFyNy2xK71pVVzBan9jae' },
      { label: 'სამივე ხმა', all: '17JURUdgCaMxdFJhuW_mgezyxyhTjL6g3' },
    ],
    notes: 6,
    folder: '1XSfRySwRBXYwut0F-ZcSTT4k36zUVN-Z',
    song: ['ლაჟღვაში', 'svaneti'],
  },
  ASLANURI,
];

// in the 2025 program, replaced in 2026 (kept with their recordings and notes)
export const BOYS_SONGS_2025: ProgramItem[] = [
  {
    title: 'შაშვი კაკაბი', sub: 'კახური · ანსამბლ „წინანდლის“ ვარიანტი',
    notes: 10,
    folder: '1b_0GHougyqhn9fBq4LBZCDaG90uHRTu7',
    song: ['შაშვი კაკაბი', 'kakheti'],
  },
  {
    title: 'ძველებური მაყრული', sub: 'ქართლური · საფერხულო',
    takes: [{ label: 'სასწავლო', all: '1vyszsxqJsOnr_JtbO_wrIw9YSqUNgtLQ', v1: 'e:2024/04/ძველებური-მაყრული-ქართლური-პირველი-ხმა•გალობის-უნივერსიტეტი•სასწავლო-2.mp3', v2: EDU('ძველებური-მაყრული-ქართლური-მეორე-ხმა'), v3: EDU('ძველებური-მაყრული-ქართლური-მესამე-ხმა') }],
    notes: 7,
    folder: '1W7rz80okdJygduNqP_Y1oNyvpzClG_6E',
  },
  {
    title: 'ქიზიყ ბოლოზე', sub: 'მოხეური',
    notes: 8,
    takes: [{ label: 'სასწავლო', all: EDU('ქიზიყ-ბოლოზე-მოხეური'), v1: EDU('ქიზიყ-ბოლოზე-მოხეური-პირველი-ხმა'), v2: EDU('ქიზიყ-ბოლოზე-მოხეური-მეორე-ხმა'), v3: EDU('ქიზიყ-ბოლოზე-მოხეური-მესამე-ხმა') }],
    folder: '1-eI9MueGIm1C7Oq9CWOTTKjRUAZ9pHwg',
  },
];

const eduTake = (base: string): ProgramTake => ({
  label: 'სასწავლო',
  all: EDU(base),
  v1: EDU(`${base}-პირველი-ხმა`),
  v2: EDU(`${base}-მეორე-ხმა`),
  v3: EDU(`${base}-მესამე-ხმა`),
});

export const GIRLS_SONGS: ProgramItem[] = [
  { title: 'ნანა', sub: 'კახური', takes: [eduTake('ნანა-კახური')] },
  ALILO,
  { title: 'ბატონების ნანინა', sub: 'იმერული', takes: [eduTake('ბატონების-ნანინა-იმერული')] },
  MOKLE,
  { title: 'თუშური ნატირალი', sub: 'თუშური', takes: [eduTake('თუშური-ნატირალი')] },
  {
    title: 'მირანგულა', sub: 'სვანური',
    takes: [{ ...eduTake('მირანგულა-სვანური'), all: EDU('მირანგულა') }],
    song: ['მირანგულა', 'svaneti'],
  },
  ASLANURI,
  {
    title: 'ნანინა', sub: 'გურული',
    takes: [{ label: 'სასწავლო', all: EDU('ნანინა-გურული'), v1: EDU('ნანინა-გურული-პირველი-ხმა'), v2: EDU('ნანინა-გურული-მეორე-ხმა') }],
    song: ['ნანინა', 'guria'],
  },
  {
    title: 'ხერტლის ნადური', sub: 'აჭარული',
    takes: [eduTake('ხერტლის-ნადური-აჭარული'), { label: 'მთქმელი', all: EDU('ხერტლის-ნადური-აჭარული-მთქმელი') }],
  },
  {
    title: 'ია პატონეფი', sub: 'მეგრული',
    takes: [{
      label: 'სასწავლო',
      all: 'e:2024/04/ია-პატონეფი-მეგრული-•გალობის-უნივერსიტეტი•სასწავლო-3.mp3',
      v1: 'e:2024/04/ია-პატონეფი-მეგრული-პირველი-ხმა-•გალობის-უნივერსიტეტი•სასწავლო-3.mp3',
      v2: 'e:2024/04/ია-პატონეფი-მეგრული-მეორე-ხმა-•გალობის-უნივერსიტეტი•სასწავლო-3.mp3',
      v3: 'e:2024/04/ია-პატონეფი-მეგრული-მესამე-ხმა-•გალობის-უნივერსიტეტი•სასწავლო-3.mp3',
    }],
    song: ['ია პატონეფი', 'samegrelo'],
  },
];

// ---------- chant: the plain-mode Liturgy, vols. I and III ----------

const voices = (all: string, v1: string, v2: string, v3: string): ProgramTake[] => [{ label: 'სასწავლო', all, v1, v2, v3 }];

export const CHANTS: ProgramItem[] = [
  {
    title: 'მხოლოდშობილო', sub: 'გელათის სკოლა', vid: 'v-7-1', book: 'I ტომი, №158 · გვ. 215–217',
    takes: voices('1IhEkNdFEw7H5N8Yoyvjkz_KDOByWvtB-', '1OXS9wOjhOQh1SrSwJDNwjheHbcQtwuzw', '1cMQjAULIi_KiJ-nqquEu7YXuN9H2YQbD', '1ws44QwVY-C2lr0lwSSlaIUm-_3o_ro0k'),
    folder: '17-cE1M-B-0982TMEBl9fkLM4QngpugYS',
  },
  {
    title: 'მოვედით, თაყვანი ვსცეთ', sub: 'გელათის სკოლა', vid: 'v-10-1', book: 'I ტომი, №162 · გვ. 225–226',
    takes: voices('1EWcb1t5BwDxlC5QplM9_6gN772dYLHQR', '12ZHFKH2qNBgsszneL6z47AHm5XyARJSm', '1PyXD51Y2dnp6fgeEMCJZkuG2fg6R9Zu_', '1k3Za4Bz0LF6Uuvyhsy_diJE4yLhjj9lv'),
    folder: '1I0Ji6Q70FaOjH3tgGCfx_qaxdDf-aQZ8',
  },
  {
    title: 'წმიდაო ღმერთო', sub: 'გელათის სკოლა', vid: 'v-12-1', book: 'I ტომი, №167 · გვ. 234–235',
    takes: voices('12nRpvpVxepkO2coHe5YfjkloeYQMQ_hG', '1Y33XgmNBnwkxjljtX0N4lIQZgZc4UgxD', '14QKe4-65kFvtEnDQ8Xb8EAG3NND_Zlm2', '1ZZw5Ndbg9DPwcrxaM--dcZvykAZWdoB7'),
    folder: '1Pc0lHzZufLyCYgRpD5xDRy_wCuHFTyke',
  },
  {
    title: 'წმიდაო ღმერთო', sub: 'ქართლ-კახური სკოლა', vid: 'v-12-3', book: 'III ტომი, №213 · გვ. 299–300',
    folder: '1MfeuR8iutXqZHeMJ6xjcfwhZFkTHJ0Qw',
  },
  {
    title: 'რომელნი ქერუბიმთა', sub: 'გელათის სკოლა', vid: 'v-20-1', book: 'I ტომი, №201 · გვ. 247–248',
    takes: voices('1e1EKjPFX_HNxyviTrJVhgbc7TM7sEKkC', '1uq2AROQNr3eOhCSbaqa2UzgRu_BLMr13', '1i9NatUvzS639Q8QCiBMclumCtGKS3ZXe', '1umU_HTOpy-qkybtYxk7xLdrz4PtesQaG'),
    folder: '1gGygH5c0DSzjCk9jhlvVOTR852td2Wnj',
  },
  {
    title: 'და ვითარცა მეუფისა', sub: 'გელათის სკოლა', vid: 'v-21-1', book: 'I ტომი, №203 · გვ. 253',
    takes: voices('1s8S--GXcKU3mLmRTVsCx8LCBHtHPtZq5', '1gNXtIPJZkAle-VtfjToL2KNwwN5xxQz2', '1EM2vNgqiho9JIgtaKYgAY3Q52ALnm4Ai', '1fskwxorLPOmdr4vrr3phL_qzcs1XnNnL'),
    folder: '1t8uEXhuR3v5hE_NTqN_FbUuF0KxlRk0Q',
  },
  {
    title: 'ღირს არს და მართალ', sub: 'ქართლ-კახური სკოლა', vid: 'v-28-3', book: 'III ტომი, №231 · გვ. 313–314',
    folder: '1houJ8rT37MNFf7ip8k8xMqswZ60hXiMi',
  },
  {
    title: 'წმიდა არს, წმიდა არს', sub: 'გელათის სკოლა, ხუნდაძე', vid: 'v-29-1', book: 'I ტომი, №220 · გვ. 267',
    takes: voices('19_SsiiIRWq2wMd-OnPInKM1wL_y4ykU5', '1axIezkXtGWKmb6jFiCoqOmpR2RqW01XR', '15S4U4K67FtudqI_ZfXTLO3bxHDsrztJd', '1r6zJWvWRuSWj5VlW5GSGoYyAh49BlT84'),
    folder: '1DnPmBw9oN7YWklTFpX_5pQLsD1By30M-',
  },
  {
    title: 'შენ გიგალობთ', sub: 'გელათის სკოლა, ხუნდაძე', vid: 'v-30-1', book: 'I ტომი, №223 · გვ. 270–271',
    takes: voices('1HTsxQ0sMQGVMo49zpBeiEBejNG7zGCzf', '1y6TGiFaImv2qW9DLGnuQa4rjBFjQZYPL', '1ZJ8yEG4eGKWeiBIulmg2HEVMRMbYml1K', '1YbcngJIFWjxBRANXx4GXhXYHb53N3RJZ'),
    folder: '1yxXlVGYwkeg3nLiPls9_MUSwKbpn7pvR',
  },
  {
    title: 'ღირს არს ჭეშმარიტად', sub: 'გელათის სკოლა', vid: 'v-32-1', book: 'I ტომი, №226 · გვ. 278–279',
    takes: voices('16VXXuOIRmdSE21VuqkBcbwIgsgYOO-09', '1c8jy6A-43Hz74sKxEa6aLtosQ1t4ohve', '1G_kMA0bLaUe-e1eSJjryoQy6nB2rPsDt', '19G9EBVIIgeEFAP15AACCZbhbdttJOlht'),
    folder: '1YSOKQoQTJozqm4BHaML3KrhKDrPLFVpS',
  },
  {
    // the program's book is not among the app's volumes: recording and Drive folder only
    title: 'მამაო ჩვენო', sub: 'შემოქმედის სკოლა', book: '№94 · გვ. 210–211',
    takes: [{ label: 'სასწავლო', all: '1lMqx_vMTwXSl_NKcMAuw6asCzF0oSEIr' }],
    folder: '1APm-fD-plQkrvcl_dd9WPm8osJprlmf4',
  },
  {
    title: 'ხორცი ქრისტესი მოვიღოთ', sub: 'ქართლ-კახური სკოლა', vid: 'v-40-4', book: 'III ტომი, №192 · გვ. 285–286',
    folder: '1nYG1m2PWF6odw9djmUcJNMtc1ixKOUeG',
  },
];

// I round, „ფურცლიდან კითხვა“ practice: short three-voice chants of the Gelati book vol. I that are not in the
// program above (one version of each, 20–62 beats long; picked by length from public/notes/book on 2026-10-08)
export const SIGHT_READING: { vid: string; title: string; num: number; service: string }[] = [
  { vid: 'v-13-1', title: 'წარდგომანი აღდგომისანი', num: 168, service: 'წირვა' },
  { vid: 'v-46-1', title: 'მრავალჟამიერ', num: 251, service: 'წირვა' },
  { vid: 'mw-v-13-3', title: 'წარდგომაჲ მწუხრად', num: 51, service: 'მწუხრი' },
  { vid: 'ck-v-12-1', title: 'ჩასართავი აღსავლისაჲ', num: 109, service: 'ცისკარი' },
  { vid: 'v-42-1', title: 'ნათელი ჭეშმარიტი', num: 242, service: 'წირვა' },
  { vid: 'mw-v-21-1', title: 'იყავნ სახელი უფლისა', num: 75, service: 'მწუხრი' },
  { vid: 'ck-v-3-5', title: 'ღმერთი უფალი', num: 92, service: 'ცისკარი' },
  { vid: 'v-40-1', title: 'ხორცი ქრისტესი', num: 239, service: 'წირვა' },
  { vid: 'mw-v-18-1', title: 'შენ, უფალო', num: 64, service: 'მწუხრი' },
  { vid: 'mw-v-22-1', title: 'დაამტკიცე, ღმერთო', num: 76, service: 'მწუხრი' },
  { vid: 'ck-v-21-2', title: 'უპატიოსნესსა', num: 143, service: 'ცისკარი' },
  { vid: 'v-41-1', title: 'ალილუია', num: 241, service: 'წირვა' },
  { vid: 'ck-v-20-1', title: 'ადიდებს სული ჩემი', num: 127, service: 'ცისკარი' },
  { vid: 'v-43-1', title: 'აღავსე პირი ჩემი', num: 243, service: 'წირვა' },
  { vid: 'v-2-1', title: 'ტონ დესპოტინ', num: 146, service: 'წირვა' },
  { vid: 'ck-v-15-2', title: 'ყოველი სული', num: 130, service: 'ცისკარი' },
  { vid: 'v-36-1', title: 'შენ, უფალო (წირვა)', num: 235, service: 'წირვა' },
  { vid: 'mw-v-12-3', title: 'ნათელო მხიარულო', num: 47, service: 'მწუხრი' },
  { vid: 'v-28-1', title: 'ღირს არს და მართალ', num: 218, service: 'წირვა' },
];

// the university's bachelor's admission page (programs change every year)
export const UNIVERSITY_PAGE = 'https://galoba.edu.ge/%e1%83%91%e1%83%90%e1%83%99%e1%83%90%e1%83%9a%e1%83%90%e1%83%95%e1%83%a0%e1%83%98%e1%83%90%e1%83%a2%e1%83%98/';

// the university's own program files
export const OFFICIAL_PDFS = {
  chant: 'https://galoba.edu.ge/wp-content/uploads/2026/02/გალობა-ბიჭები-გოგონები-1.pdf',
  boys: 'https://galoba.edu.ge/wp-content/uploads/2026/04/სიმღერა-ვაჟების-პროგრამა-2026-1.pdf',
  girls: 'https://galoba.edu.ge/wp-content/uploads/2026/02/სიმღერა-გოგონების-პროგრამა_2026-1.pdf',
  // II round samples: the theory test (7 tasks) and the dictation
  theoryTest: 'https://galoba.edu.ge/wp-content/uploads/2023/11/მუსიკალური-ანბანი-ტესტის-ნიმუში.pdf',
  dictation: 'https://galoba.edu.ge/wp-content/uploads/2023/11/კარნახის-ნიმუში.pdf',
};

// ---------- II exam: music theory (written): the test and the dictation ----------

// the test's seven tasks, in its order (lessons in data/abituriLessons.ts carry the task number)
export const THEORY_TOPICS = [
  'კილოების აგება',
  'ბგერიდან ინტერვალის აგება',
  'ბგერიდან აკორდების აგება',
  'ტრანსპონირება',
  'დაჯგუფება სხვადასხვა ზომაში',
  'ასოებრივი აღნიშვნის შეცვლა მარცვლოვანით და პირიქით',
  'გრძლიობების შეცვლა პაუზით და პირიქით',
];

// ---------- III exam: the colloquium ----------

// each item plays its own part of the university's listening video (the videos' chapters: start–end in seconds)
export interface ColloquiumItem {
  title: string;
  sub?: string;
  genre?: string; // the song's kind (the colloquium asks it too)
  yt: [start: number, end?: number];
}
export interface ColloquiumGroup { name: string; items: ColloquiumItem[] }

export const COLLOQUIUM_VIDEOS = { chants: 'zFJ0t6hGq8w', songs: 'CuwRXDJ6Pe8' };

export const COLLOQUIUM_CHANTS: ColloquiumGroup[] = [
  {
    name: 'გელათი (სადა კილო)',
    items: [
      { title: 'ნეტარ არს კაცი', sub: 'მწუხრი · ხუნდაძე', yt: [1415, 1560] },
      { title: 'აწ განუტევე', sub: 'მწუხრი · მე-8 ხმა', yt: [1120, 1225] },
      { title: 'აქებდით სახელსა უფლისასა', sub: 'ცისკარი', yt: [0, 257] },
      { title: 'დიდება მაღალიანი', sub: 'ცისკარი', yt: [345, 892] },
      { title: 'სულო ჩემო', sub: 'მარხვა', yt: [892, 983] },
    ],
  },
  {
    name: 'გელათი (გამშვენებული)',
    items: [
      { title: 'ღირს არს ჭეშმარიტად', sub: 'სამღვდელმთავრო · წირვა, დახვედრის', yt: [1698, 1928] },
      { title: 'ქრისტე აღდგა', sub: 'ზატიკი · ქორიძე', yt: [1560, 1580] },
      { title: 'აღდგომისა დღე არს', sub: 'ზატიკი', yt: [983, 1120] },
    ],
  },
  {
    name: 'შემოქმედის კილო',
    items: [
      { title: 'შენ ხარ ვენახი', sub: 'ჯვრისწერა', yt: [2155, 2324] },
      { title: 'ანგელოსი ღაღადებს', sub: 'ზატიკი', yt: [257, 345] },
      { title: 'ტყვეთა განმათავისუფლებელო', sub: 'წმ. გიორგის ხსენება', yt: [2324, 2424] },
    ],
  },
  {
    name: 'აღმოსავლეთ საქართველო',
    items: [
      { title: 'ჯვარსა შენსა', sub: 'წირვა', yt: [2424] },
      { title: 'ღვთისმშობელო ქალწულო', sub: 'მწუხრი', yt: [1580, 1698] },
      { title: 'დიდება მაღალთა შინა', sub: 'ცისკარი', yt: [1225, 1415] },
      { title: 'შენ გიგალობთ', sub: 'წირვა', yt: [1928, 2155] },
    ],
  },
];

export const COLLOQUIUM_SONGS: ColloquiumGroup[] = [
  {
    name: 'აღმოსავლეთის მთა',
    items: [
      { title: 'ფერხისა', genre: 'რიტუალური', sub: 'ხევსურეთი', yt: [0, 109] },
      { title: 'ლომისური', genre: 'რიტუალური', sub: 'მთიულეთი', yt: [109, 248] },
      { title: 'მეითის სიმღერა', genre: 'ისტორიული', sub: 'თუშეთი', yt: [248, 333] },
    ],
  },
  { name: 'ქართლი', items: [{ title: 'ჭონა', genre: 'კალენდარული, სააღდგომო', yt: [333, 532] }, { title: 'მეტიური', genre: 'შრომის', yt: [532, 681] }] },
  {
    name: 'კახეთი',
    items: [
      { title: 'ჩაკრულო', genre: 'სუფრული', yt: [681, 991] },
      { title: 'ალილო', genre: 'კალენდარული, საშობაო მილოცვა', yt: [991, 1227] },
      { title: 'მუშური', genre: 'შრომის', sub: 'ყანის მკური', yt: [1227, 1366] },
    ],
  },
  {
    name: 'რაჭა-ლეჩხუმი',
    items: [
      { title: 'ზემორაჭული ალილო', genre: 'კალენდარული, საშობაო მილოცვა', yt: [1366, 1508] },
      { title: 'დალიე', genre: 'სუფრული', yt: [1508, 1614] },
      { title: 'ლეჩხუმური მაყრული', genre: 'საქორწილო', yt: [1614, 1736] },
    ],
  },
  {
    name: 'სვანეთი',
    items: [
      { title: 'ლილე', genre: 'სადიდებელი, სარიტუალო', yt: [1736, 1901] },
      { title: 'დალა კოჯას ხელღვაჟალე', genre: 'სარიტუალო, სამონადირეო', yt: [1901, 2014] },
      { title: 'თამარ დედფალ', genre: 'ისტორიული', sub: 'ქვემოსვანური', yt: [2014, 2392] },
    ],
  },
  {
    name: 'სამეგრელო',
    items: [
      { title: 'ოდოია', genre: 'შრომის, ნადური', yt: [2392, 2585] },
      { title: 'ბედინერა', genre: 'საქორწილო, მაყრული', yt: [2585, 2677] },
      { title: 'ვეენგარა', genre: 'აკვნის სიმღერა', yt: [2677, 2821] },
    ],
  },
  { name: 'იმერეთი', items: [{ title: 'ცხენოსნური', genre: 'მგზავრული', yt: [2821, 2955] }, { title: 'მასპინძელსა მხიარულსა', genre: 'სუფრული', yt: [2955, 3045] }] },
  {
    name: 'გურია',
    items: [
      { title: 'ჩვენ მშვიდობა', genre: 'სუფრული', yt: [3045, 3274] },
      { title: 'ხასანბეგურა', genre: 'ეპიკური, ისტორიული', yt: [3274, 3501] },
      { title: 'შემოქმედურა', genre: 'შრომის, ნადური', yt: [3501, 3776] },
    ],
  },
  { name: 'აჭარა', items: [{ title: 'მაყრული', genre: 'საქორწილო', yt: [3776, 3862] }, { title: 'ვოსა', genre: 'საფერხულო-საცეკვაო', yt: [3862, 4036] }] },
  { name: 'აფხაზეთი', items: [{ title: 'გუდისა', genre: 'საგმირო', yt: [4036] }] },
];

// ---------- admission ----------

export const DOCUMENTS = [
  'ატესტატის დედანი ან მისი ნოტარიულად დამოწმებული ასლი (მე-12 კლასელებმა — ცნობა სკოლიდან)',
  'პირადობის მოწმობის ასლი',
  'ერთიან ეროვნულ გამოცდებზე რეგისტრაციის დამადასტურებელი საგამოცდო ბარათი',
  '4 ფოტოსურათი (3×4)',
  'ვაჟებმა — წვევამდელის სამხედრო სააღრიცხვო მოწმობის ასლი',
];

export const REASONS = [
  'ისწავლი გალობას და ლოტბარობას პროფესიონალურ დონეზე.',
  'გასწავლიან ამ დარგის საუკეთესო პედაგოგები.',
  'იქნები ადამიანებს შორის, ვინც გაგზრდის — როგორც მგალობელს და როგორც პიროვნებას.',
  'ისედაც გალობ? სწავლა მაშინ იწყება, როცა იცი, რას და რატომ აკეთებ.',
  'ემსახურები სიყვარულს — ღმერთს, სამშობლოს, ადამიანს.',
  'ნამდვილი მეგობრები და სტუდენტური თავგადასავლები.',
  'პროფესია, რომელიც ხვალაც გამოგადგება — და მარადისობაშიც.',
];
