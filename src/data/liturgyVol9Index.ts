// Generated from the Gelati school book, vol. IX (ქართული საეკლესიო გალობა, IX ტომი, 2023: საღმრთო ლიტურგია,
// ნამდვილი კილო და სადა საბავშვო საგალობლები; აღდგომის ოხითანი და ღმრთისმშობლისანი) by reading every chant heading.
// Index = chant number (1-101): the book page it starts on. Numbers 1-57 are the liturgy in the authentic mode,
// 58-77 the plain liturgy chants for children, 78-101 the Sunday troparia of the eight modes with their theotokia.
// The book is a scan: its sheet music was read from the page images and lives in public/notes/v9
// (NNN.json + images, named after the first number of a version). Book page = PDF page - 11.
const PAGES = [0,
  3, 3, 3, 3, 4, 4, 4, 4, 6, 6, 7, 7, 19, 20, 21, 22, 22, 25, 25, 25,
  25, 26, 26, 26, 27, 27, 27, 27, 28, 28, 33, 34, 34, 35, 41, 41, 41, 42, 44, 44,
  46, 48, 48, 50, 50, 51, 51, 52, 54, 55, 55, 55, 55, 55, 56, 56, 57, 60, 60, 62,
  69, 70, 71, 72, 75, 76, 78, 79, 80, 82, 83, 83, 83, 85, 85, 86, 86, 89, 92, 92,
  96, 98, 99, 101, 103, 104, 106, 108, 109, 112, 114, 115, 117, 120, 120, 122, 124, 125, 127, 130,
  130,
];

export const V9_BOOK = 'v9';

export const v9Page = (num: number) => PAGES[num];

// Section of the book a number belongs to, shown next to the version (the liturgy is printed twice)
export const v9Source = (num: number) => (num >= 58 && num <= 77 ? 'IX ტომი · საბავშვო' : 'IX ტომი');
