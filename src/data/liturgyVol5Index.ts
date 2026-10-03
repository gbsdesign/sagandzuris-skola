// Generated from the liturgy book, vol. V (ქართული საეკლესიო გალობა V ტომი, 2008: იოანე ოქროპირის წირვა,
// გამშვენებული კილო) by reading every chant heading. Index = chant number (1-142): the book page it starts on.
// Numbers 1-119 are the Gelati school (ქორიძის პარტიტურა №1), 120-142 the Shemokmedi school (არტემ ერქომაიშვილი).
// Its sheet music lives in public/notes/v5 (NNN.json + images, named after the first number of a version).
const PAGES = [0,
  3, 3, 6, 7, 10, 13, 15, 15, 15, 15, 16, 16, 16, 16, 17, 17, 17, 17, 19, 19,
  19, 20, 29, 29, 31, 33, 34, 35, 36, 37, 37, 37, 37, 38, 40, 42, 45, 45, 46, 46,
  46, 47, 47, 47, 47, 48, 48, 48, 48, 49, 49, 49, 49, 50, 50, 50, 50, 50, 50, 50,
  50, 51, 53, 56, 57, 61, 63, 65, 67, 70, 71, 72, 72, 72, 72, 73, 73, 73, 74, 74,
  75, 78, 78, 78, 79, 80, 81, 82, 83, 84, 86, 89, 89, 90, 91, 92, 93, 93, 99, 105,
  108, 108, 108, 109, 109, 110, 111, 111, 113, 113, 113, 113, 114, 114, 114, 115, 116, 117, 118, 123,
  125, 126, 128, 131, 134, 135, 136, 139, 139, 139, 139, 141, 143, 145, 147, 148, 150, 151, 152, 153,
  153, 154,
];

export const V5_BOOK = 'v5';

export const v5Page = (num: number) => PAGES[num];

// Shemokmedi chants 120-126: no recording of Artem Erkomaishvili exists; the editor carried the Gelati versions
// over into the Shemokmedi mode (foreword). The rest of 120-142 is sung by Artem Erkomaishvili.
export const v5Source = (num: number) =>
  num <= 119 ? 'ქორიძე' : num <= 126 ? 'ერქვანიძის გადატანა' : 'ერქომაიშვილი';
