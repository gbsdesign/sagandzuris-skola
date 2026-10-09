import React from 'react';
import { GrapeNav } from '../components/home/GrapeNav';
import { PlateScatter, PlateBand, Qvevri, SpiralJug } from '../components/home/PlateOrnaments';
import { ShortcutShelf } from '../components/home/ShortcutShelf';

interface HomePageProps {
  logoUrl: string;
}

interface Saying {
  text: string;
  author: string;
  icon: string;
  /** zoom onto the face when the icon shows the whole figure */
  face?: { scale: number; origin: string };
}

// icons come from the saint lives (public/lives/<month>/icons/).
// Above the Patriarch's "cross": words toward God; below it: words toward people.
const SAYINGS_ABOVE: Saying[] = [
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

const SAYINGS_BELOW: Saying[] = [
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

const ROTATE_MS = 15 * 60 * 1000;

/** The same pair for everyone in the same quarter hour; moves on by itself while the page is open. */
function useSayingSlot(): number {
  const [slot, setSlot] = React.useState(() => Math.floor(Date.now() / ROTATE_MS));
  React.useEffect(() => {
    const id = window.setTimeout(() => setSlot(Math.floor(Date.now() / ROTATE_MS)), ROTATE_MS - (Date.now() % ROTATE_MS) + 500);
    return () => window.clearTimeout(id);
  }, [slot]);
  return slot;
}

const FatherSaying: React.FC<Saying & { className?: string }> = ({ text, author, icon, face, className = '' }) => (
  <figure className={`relative w-full max-w-md flex items-start gap-4 text-left ${className}`}>
    <span className="shrink-0 w-[72px] h-[72px] rounded-full overflow-hidden ring-2 ring-[#c9a24a]/70 ring-offset-2 ring-offset-[#fbf6ee] shadow-sm">
      <img
        src={icon}
        alt={author}
        loading="lazy"
        className="w-full h-full object-cover object-top"
        style={face && { transform: `scale(${face.scale})`, transformOrigin: face.origin }}
      />
    </span>
    <div className="min-w-0 pt-0.5">
      <blockquote className="font-serif-ge italic text-[14px] sm:text-[15px] leading-relaxed text-[#4a3b2e]">
        „{text}“
      </blockquote>
      <figcaption className="mt-1.5 text-right text-[13px] text-[#9a3324]">— {author}</figcaption>
    </div>
  </figure>
);

export const HomePage: React.FC<HomePageProps> = ({ logoUrl }) => {
  const slot = useSayingSlot();
  return (
    <div className="relative overflow-hidden px-5 py-8 sm:px-10 sm:py-12 text-center flex flex-col items-center text-[#2a2017]">
      {/* School logo straight on the parchment (multiply drops its white background), vine ornament under it */}
      <PlateScatter />
      {/* holy fathers' words, changing every 15 minutes: toward God above the logo, toward people under the Patriarch's "cross" */}
      <FatherSaying key={`a${slot}`} {...SAYINGS_ABOVE[slot % SAYINGS_ABOVE.length]} className="mb-6" />
      <div className="relative w-full flex justify-center">
        {/* small screens: qvevri and jug from the plate flank the logo */}
        <Qvevri className="orn-bob lg:hidden absolute left-0 sm:left-[6%] bottom-2 w-[18%] max-w-24" />
        <SpiralJug className="orn-bob lg:hidden absolute right-0 sm:right-[6%] bottom-2 w-[18%] max-w-24" />
      <img
        src={logoUrl}
        alt="საგანძურის სკოლა"
        className="w-44 h-44 sm:w-56 sm:h-56 object-contain mix-blend-multiply"
        referrerPolicy="no-referrer"
      />
      </div>
      {/* on a phone the vine takes the page's side padding too, so its labels have room */}
      <div className="relative mt-2 w-[calc(100%+2.5rem)] sm:w-full flex justify-center">
        <GrapeNav />
      </div>

      {/* "ჩემი ღილაკები": the member's own buttons, right under the vine, led by "ჩემი კანონი" for a psalter-group member */}
      <ShortcutShelf />

      <PlateBand className="lg:hidden mt-10" />

      {/* the Patriarch's words: typography only, with a cinnabar initial as in old manuscripts */}
      <figure className="relative mt-10 sm:mt-12 w-full max-w-md text-left">
        <blockquote className="font-serif-ge text-[15px] sm:text-base leading-relaxed text-[#3a2d22]">
          <span className="float-left font-serif-ge text-[54px] leading-[0.8] mr-2 mt-1.5 text-[#9a3324]" aria-hidden>ა</span>
          <span className="sr-only">ა</span>დამიანმა სულიერი მოღვაწეობით უნდა შექმნას ერთგვარი ჯვარი, ვერტიკალური და ჰორიზონტალური სწრაფვის. ვერტიკალური ეს არის უფლისადმი მიმართული ქართული გალობა და ჰორიზონტალური ეს არის ხალხური სიმღერა მიმართული ადამიანებისადმი.
        </blockquote>
        <figcaption className="mt-3 text-right text-[13px] text-[#75685a]">— უწმიდესი და უნეტარესი ილია II</figcaption>
      </figure>

      <FatherSaying key={`b${slot}`} {...SAYINGS_BELOW[slot % SAYINGS_BELOW.length]} className="mt-8" />

    </div>
  );
};
