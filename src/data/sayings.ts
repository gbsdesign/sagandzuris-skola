// The holy fathers' words on the home page (changing every 15 minutes) and the Android app's saying widget
// (public/widget/days-<year>.json, scripts/build-widget-days.mjs).

export interface Saying {
  text: string;
  author: string;
  icon: string;
  /** zoom onto the face when the icon shows the whole figure */
  face?: { scale: number; origin: string };
}

// icons come from the saint lives (public/lives/<month>/icons/).
// Above the Patriarch's "cross": words toward God; below it: words toward people.
export const SAYINGS_ABOVE: Saying[] = [
  {
    text: 'არაფერი ისე არ აღამაღლებს სულს, არ შეასხამს მას ფრთებს და არ მოსწყვეტს მიწას, როგორც საღმრთო გალობა.',
    author: 'წმ. იოანე ოქროპირი',
    icon: '/lives/noemberi/icons/ioane-oqropiri.jpg',
  },
  {
    text: 'ღმერთი უფრო ხშირად უნდა გვახსოვდეს, ვიდრე ვსუნთქავთ.',
    author: 'წმ. გრიგოლ ღვთისმეტყველი',
    icon: '/lives/ianvari/icons/grigol_gvtismetkveli.jpg',
    face: { scale: 2.2, origin: '50% 26%' },
  },
  {
    text: 'ლოცვა არის გონების აღსვლა ღმრთისადმი.',
    author: 'წმ. იოანე დამასკელი',
    icon: '/lives/dekemberi/icons/ioane-damask.jpg',
    face: { scale: 2.2, origin: '58% 24%' },
  },
  {
    text: 'ლოცვა თავისი არსით ადამიანის ღმერთთან საუბარი და შეერთებაა.',
    author: 'წმ. იოანე კლემაქსი',
    icon: '/lives/marti/icons/ioane-klemaqsi.jpg',
    face: { scale: 2.2, origin: '50% 22%' },
  },
  {
    text: 'ღმერთი განკაცდა, რათა კაცი განღმრთობილიყო.',
    author: 'წმ. ათანასე დიდი',
    icon: '/lives/maisi/icons/atanase.jpg',
    face: { scale: 2.4, origin: '25% 35%' },
  },
  {
    text: 'ღმრთის დიდება ცოცხალი ადამიანია, ადამიანის სიცოცხლე კი — ღმრთის ხილვა.',
    author: 'წმ. ირინეოს ლიონელი',
    icon: '/lives/agvisto/icons/irineos.jpg',
    face: { scale: 2.4, origin: '55% 27%' },
  },
  {
    text: 'შენთვის შეგვქმენ, უფალო, და მოუსვენარია გული ჩვენი, ვიდრე შენში არ განისვენებს.',
    author: 'ნეტ. ავგუსტინე',
    icon: '/lives/ivnisi/icons/avgustine.jpg',
    face: { scale: 2.6, origin: '50% 19%' },
  },
  {
    text: 'ფსალმუნი ერის კურთხევაა, ღმრთის ქება, ეკლესიის ხმა და სარწმუნოების საგალობელი აღსარება.',
    author: 'წმ. ამბროსი მედიოლანელი',
    icon: '/lives/dekemberi/icons/ambrosi.jpg',
    face: { scale: 2.4, origin: '50% 26%' },
  },
  {
    text: 'ეცადე, შეხვიდე შენს შინაგან საგანძურში და იხილავ ზეციურ საგანძურს, რადგან ორივე ერთია. სასუფევლის კიბე შენშივეა, შენს სულშია დაფარული.',
    author: 'წმ. ისააკ ასური',
    icon: '/lives/ianvari/icons/isaak-asuri.jpg',
    face: { scale: 2.6, origin: '55% 29%' },
  },
  {
    text: 'ლოცვაში ბევრი სიტყვა არ არის საჭირო: საკმარისია, ხელები აღაპყრო და თქვა: უფალო, როგორც გნებავს და როგორც უწყი, შემიწყალე.',
    author: 'წმ. მაკარი დიდი',
    icon: '/lives/ianvari/icons/makari-didi.jpg',
    face: { scale: 2.4, origin: '50% 50%' },
  },
  {
    text: 'ლოცვა ყოველივეს საზომია და ყოველივეს წყარო; ლოცვა ყოველივეს მამოძრავებელია და ყოველივეს წარმმართველი.',
    author: 'წმ. თეოფანე დაყუდებული',
    icon: '/lives/ianvari/icons/teofane.jpg',
    face: { scale: 2.1, origin: '50% 50%' },
  },
  {
    text: 'წყალი რბილია, ქვა კი მაგარი, მაგრამ წვეთი ქვას ხვრეტს. ასევე ღმრთის სიტყვა რბილია, გული კი მაგარი; ვინც მას ხშირად ისმენს, მისი გული ღმრთის შიშისთვის გაიხსნება.',
    author: 'წმ. პიმენ დიდი',
    icon: '/lives/agvisto/icons/pimeni-didi.jpg',
    face: { scale: 1.9, origin: '50% 35%' },
  },
  {
    text: 'ლოცვა სულის სუნთქვაა; ლოცვა ჩვენი სულიერი საზრდო და სასმელია.',
    author: 'წმ. იოანე კრონშტადტელი',
    icon: '/lives/dekemberi/icons/ioane-kronsht.jpg',
    face: { scale: 2, origin: '50% 28%' },
  },
  {
    text: 'ჩვენი ქრისტიანული ცხოვრების ჭეშმარიტი მიზანი სული წმიდის მოპოვებაა.',
    author: 'წმ. სერაფიმე საროველი',
    icon: '/lives/ianvari/icons/serafime.jpg',
    face: { scale: 2.6, origin: '46% 12%' },
  },
  {
    text: 'ცხოვრება ისე უნდა, როგორც ბორბალი ბრუნავს: მიწას მხოლოდ ერთი წერტილით ეხება, დანარჩენით კი ზემოთ მიისწრაფვის.',
    author: 'წმ. ამბროსი ოპტელი',
    icon: '/lives/oqtomberi/icons/ambrosi_opteli.jpg',
    face: { scale: 2, origin: '54% 46%' },
  },
];

export const SAYINGS_BELOW: Saying[] = [
  {
    text: 'ფსალმუნი მეგობრობას ქმნის, განშორებულთ აერთებს, მტრობილთ არიგებს. ვინ შეიძლება მტრად შერაცხოს ის, ვისთან ერთადაც ერთი ხმით უგალობა ღმერთს?',
    author: 'წმ. ბასილი დიდი',
    icon: '/lives/ianvari/icons/basili.jpg',
    face: { scale: 2, origin: '50% 24%' },
  },
  {
    text: 'ჩვენი სიცოცხლეც და სიკვდილიც მოყვასთანაა: თუ ძმა შევიძინეთ, ღმერთი შეგვიძენია, ხოლო თუ ძმა დავაბრკოლეთ, ქრისტეს წინაშე შეგვიცოდავს.',
    author: 'წმ. ანტონი დიდი',
    icon: '/lives/ianvari/icons/antoni.jpg',
    face: { scale: 2.4, origin: '52% 14%' },
  },
  {
    text: 'ვისაც ღმერთი უყვარს, არ შეუძლია არ შეიყვაროს ყოველი ადამიანი, როგორც თავი თვისი.',
    author: 'წმ. მაქსიმე აღმსარებელი',
    icon: '/lives/ianvari/icons/maqsime-amgs.jpg',
    face: { scale: 2.4, origin: '50% 20%' },
  },
  {
    text: 'მოიპოვე მშვიდობის სული და შენ გარშემო ათასობით ადამიანი გადარჩება.',
    author: 'წმ. სერაფიმე საროველი',
    icon: '/lives/ianvari/icons/serafime.jpg',
    face: { scale: 2.6, origin: '46% 12%' },
  },
  {
    text: 'სამი ღვთაებრივი საუნჯე დაგვრჩა ჩვენ მამა-პაპათაგან: მამული, ენა, სარწმუნოება. თუ ამათაც არ ვუპატრონეთ, რა კაცები ვიქნებით, რა პასუხს გავცემთ შთამომავლობას?',
    author: 'წმ. ილია მართალი',
    icon: '/lives/ivlisi/icons/ilia_martali.jpg',
    face: { scale: 2, origin: '48% 32%' },
  },
  {
    text: 'ჰე, უფალო მეუფეო, მომმადლე მე ხილვად ბრალთა ჩემთა და არა განკითხვად ძმისა ჩემისა.',
    author: 'წმ. ეფრემ ასური',
    icon: '/lives/ianvari/icons/efrem-asuri.jpg',
    face: { scale: 2.1, origin: '50% 35%' },
  },
  {
    text: 'ჩემი ცოდვები ზურგს უკან ჩამომდის და ვერ ვხედავ, დღეს კი სხვისი ცოდვის განსასჯელად მოვედი.',
    author: 'წმ. მოსე შავი',
    icon: '/lives/agvisto/icons/mose-shavi.jpg',
    face: { scale: 2, origin: '50% 34%' },
  },
  {
    text: 'გსურს, პატივი სცე ქრისტეს სხეულს? ნუ უგულებელყოფ მას, როცა შიშველია: ტაძარში ნუ შეამკობ აბრეშუმით, გარეთ კი, სადაც სიცივით იტანჯება, ნუ მიატოვებ.',
    author: 'წმ. იოანე ოქროპირი',
    icon: '/lives/noemberi/icons/ioane-oqropiri.jpg',
  },
  {
    text: 'ნუ აურევ ადამიანს — ღმრთის ხატებას — მასში მყოფ ბოროტებასთან: ბოროტება შემთხვევითი სენია, ადამიანი კი ღმრთის ხატად რჩება.',
    author: 'წმ. იოანე კრონშტადტელი',
    icon: '/lives/dekemberi/icons/ioane-kronsht.jpg',
    face: { scale: 2, origin: '50% 28%' },
  },
  {
    text: 'პური, რომელსაც ინახავ, მშიერისაა; სამოსი, რომელიც ზანდუკში გიდევს, — შიშველისა.',
    author: 'წმ. ბასილი დიდი',
    icon: '/lives/ianvari/icons/basili.jpg',
    face: { scale: 2, origin: '50% 24%' },
  },
  {
    text: 'გიყვარდეს და აკეთე, რაც გსურს: თუ დუმხარ — სიყვარულით დუმდე, თუ ლაპარაკობ — სიყვარულით ლაპარაკობდე, თუ ასწორებ — სიყვარულით ასწორებდე.',
    author: 'ნეტ. ავგუსტინე',
    icon: '/lives/ivnisi/icons/avgustine.jpg',
    face: { scale: 2.6, origin: '50% 19%' },
  },
  {
    text: 'თუ სხვის გამოსწორებას ცდილობ და რისხვა აღგეძრა, საკუთარ ვნებას იკმაყოფილებ.',
    author: 'წმ. მაკარი დიდი',
    icon: '/lives/ianvari/icons/makari-didi.jpg',
    face: { scale: 2.4, origin: '50% 50%' },
  },
  {
    text: 'სადაც უბრალოებაა, იქ ასი ანგელოზია, სადაც ცბიერება — იქ არც ერთი.',
    author: 'წმ. ამბროსი ოპტელი',
    icon: '/lives/oqtomberi/icons/ambrosi_opteli.jpg',
    face: { scale: 2, origin: '54% 46%' },
  },
  {
    text: 'რა არის მოწყალე გული? გული, რომელიც იწვის მთელი ქმნილებისთვის: ადამიანებისთვის, ფრინველებისთვის, ცხოველებისთვის, ყოველი არსებისთვის.',
    author: 'წმ. ისააკ ასური',
    icon: '/lives/ianvari/icons/isaak-asuri.jpg',
    face: { scale: 2.6, origin: '55% 29%' },
  },
  {
    text: 'ბოროტება ბოროტებას ვერასოდეს აღმოფხვრის. თუ ვინმემ ბოროტი გიყო, სიკეთე უყავი, რათა სიკეთით დაამარცხო ბოროტება.',
    author: 'წმ. პიმენ დიდი',
    icon: '/lives/agvisto/icons/pimeni-didi.jpg',
    face: { scale: 1.9, origin: '50% 35%' },
  },
];
