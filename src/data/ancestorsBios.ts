// The great chanters, carried over from galobani.ge/library/biografia.
// The texts themselves live in ancestorsBioTexts.ts and load only when a biography is opened.

/** A paragraph (string), a subheading {h} ('***' is a section break), verse lines {verse},
 * a small source/credit line {note} or a numbered source list {sources}. */
export type BioBlock = string | { h: string } | { verse: string[] } | { note: string } | { sources: string[] };

export interface Ancestor {
  id: number;
  name: string;
  years?: string;
  image?: string;
  group: 'hymnographers' | 'keepers';
}

export const ANCESTORS: Ancestor[] = [
  {"id":0,"name":"იოანე მინჩხი","group":"hymnographers"},
  {"id":1,"name":"წმიდა გრიგოლ ხანძთელი","years":"VIII–IX ს.","image":"/ancestors/1.jpg","group":"hymnographers"},
  {"id":2,"name":"მიქაელ მოდრეკილი","group":"hymnographers"},
  {"id":3,"name":"წმიდა გიორგი მთაწმინდელი","years":"1009–1065","image":"/ancestors/3.jpg","group":"hymnographers"},
  {"id":4,"name":"იოანე პეტრიწი","years":"XI–XII ს.","image":"/ancestors/4.jpg","group":"hymnographers"},
  {"id":5,"name":"არსენ IV (ბულმაისიმისძე)","years":"XIII ს.","group":"hymnographers"},
  {"id":6,"name":"ამბროსი ნეკრესელი (მიქაძე)","years":"1774–1815","group":"keepers"},
  {"id":7,"name":"კარბელაშვილები","image":"/ancestors/7.jpg","group":"keepers"},
  {"id":8,"name":"წმიდა ფილიმონ მგალობელი (ქორიძე)","image":"/ancestors/8.jpg","group":"keepers"},
  {"id":9,"name":"წმიდა ექვთიმე აღმსარებელი (კერესელიძე)","image":"/ancestors/9.jpg","group":"keepers"},
  {"id":10,"name":"დუმბაძეები","image":"/ancestors/10.jpg","group":"keepers"},
  {"id":11,"name":"მაქსიმე შარაძე","image":"/ancestors/11.jpg","group":"keepers"},
  {"id":12,"name":"გიგო ერქომაიშვილი","image":"/ancestors/12.jpg","group":"keepers"},
  {"id":13,"name":"არტემ ერქომაიშვილი","years":"1887–1967","image":"/ancestors/13.jpg","group":"keepers"},
  {"id":14,"name":"დიმიტრი პატარავა","group":"keepers"},
  {"id":15,"name":"რაჟდენ ხუნდაძე","image":"/ancestors/15.jpg","group":"keepers"},
  {"id":16,"name":"ვარლამ სიმონიშვილი","image":"/ancestors/16.jpg","group":"keepers"},
  {"id":17,"name":"ნესტორ კონტრიძე","image":"/ancestors/17.jpg","group":"keepers"},
  {"id":18,"name":"მელქისედეკ ნაკაშიძე","image":"/ancestors/18.jpg","group":"keepers"},
  {"id":19,"name":"დიმიტრი ჭალაგანიძე","image":"/ancestors/19.jpg","group":"keepers"},
  {"id":20,"name":"ანდრია ბენაშვილი","image":"/ancestors/20.jpg","group":"keepers"},
  {"id":21,"name":"არქიმანდრიტი გერონტი (სოლოღაშვილი)","years":"1757–1813","group":"keepers"},
  {"id":22,"name":"არქიმანდრიტი სოფრონი, არაგვის ერისთავი","years":"1780–1851","group":"keepers"},
  {"id":23,"name":"ივანე, მერაბი და ნესტორ ცქიტიშვილები","years":"XIX ს.","group":"keepers"},
  {"id":24,"name":"ვალერიან გეგეჭკორი","group":"keepers"},
  {"id":25,"name":"ნიკო ხურცია","image":"/ancestors/25.jpg","group":"keepers"},
  {"id":26,"name":"სიმონ გოგლიჩიძე","group":"keepers"},
  {"id":27,"name":"ზაქარია ჩხიკვაძე","image":"/ancestors/27.jpg","group":"keepers"},
  {"id":28,"name":"ლევან მუღალაშვილი","image":"/ancestors/28.jpg","group":"keepers"},
  {"id":29,"name":"ძუკუ ლოლუა","image":"/ancestors/29.jpg","group":"keepers"},
  {"id":30,"name":"კირილე პაჭკორია","image":"/ancestors/30.jpg","group":"keepers"},
  {"id":31,"name":"მიხეილ კავსაძე","image":"/ancestors/31.jpg","group":"keepers"},
];
