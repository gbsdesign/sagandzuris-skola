import type { PageType } from '../context/NavigationContext';
import type { SectionId } from './sections';

// The games hub („თამაშები“, 2026-10-27; one list since 2026-10-30, the user's „ყველა თამაში 1 სიად“): every game in one
// list with the variants it has — ონლაინ (in the app, alone or with the class), ჰიბრიდული (played live, a phone helps) and
// სამაგიდო (a printed kit, no phone; its button downloads the PDF). Only what is ready shows (the user's rule, 2026-10-28): a
// variant joins its game's buttons once it is built. A game that answers to a known one names it in brackets (`like`), and its
// ⓘ says what that game is and how ours differs (`about`). The whole plan (42 games with their three variants, the six board
// games) lives in the Claude doc „ქართული თამაშები სკოლისთვის“ — https://claude.ai/artifact/Dw24amtHhQvSGUd1pPE4fg
export type GameMode = 'online' | 'hybrid' | 'noPhone';

export interface GameDef {
  id: string;
  title: string;
  text: string;            // one line: what the player does
  modes: GameMode[];       // the variants built, in the buttons' order
  like?: string;           // the known game it answers to, in brackets after the name
  about?: string;          // ⓘ: what that game is and how ours differs, two or three short lines
  page?: PageType;         // where it opens
  panel?: string;          // a panel of that page to open first (the path page's round buttons)
  item?: string;           // opens inside the games page: its `mapItem` (pages/games/)
  section?: SectionId;     // the admin's switch and the member's feature that show or hide its app variants
  print?: { href: string; sheets: number }; // the სამაგიდო kit: public/games/print/<id>.pdf, printed two-sided (scripts/print-games)
}

export const MODE_LABEL: Record<GameMode, string> = { online: 'ონლაინ', hybrid: 'ჰიბრიდული', noPhone: 'სამაგიდო' };
export const MODE_HINT: Record<GameMode, string> = {
  online: 'აპში, თავისთვის ან კლასელებთან',
  hybrid: 'ცოცხლად, ტელეფონი ეხმარება',
  noPhone: 'დასაბეჭდი PDF, ტელეფონის გარეშე',
};

export const GAMES: GameDef[] = [
  {
    id: 'samshvildis-ghame', title: 'სამშვილდის ღამე', like: 'მაფია', text: 'ციხე-ქალაქის მცველები და ჯაშუშები; მემატიანე, დღე და ღამე, ხმის მიცემა',
    about: '„მაფია“ ცნობილი წრის თამაშია: ღამით მაფია ფარულად ირჩევს მსხვერპლს, დღით ქალაქი ბჭობს და ეჭვმიტანილს ხმით ირჩევს. ჩვენთან ეს სამშვილდის ციხე-ქალაქია: ჯაშუშები, ციხისთავი, მკურნალი და მემატიანე. არავინ „კვდება“: ჯაშუშებს ღამით ტყვედ მიჰყავთ, დღით ქალაქი ეჭვმიტანილს ციხეში სვამს.',
    modes: ['online', 'hybrid', 'noPhone'], page: 'games', item: 'samshvilde', section: 'tamashebi', print: { href: '/games/print/samshvildis-game.pdf', sheets: 10 },
  },
  {
    id: 'saidanaa-simghera', title: 'საიდანაა სიმღერა?', like: 'GeoGuessr', text: 'ხალხური სიმღერის ნაწყვეტი ჟღერს — გამოიცანი, საქართველოს რომელი კუთხისაა, და მონიშნე რუკაზე',
    about: '„GeoGuessr“ ცნობილი თამაშია: ქუჩის ფოტოს ხედავ და რუკაზე ნიშნავ, სად ხარ. ჩვენთან ფოტოს ნაცვლად სკოლის არქივის ხალხური სიმღერა ჟღერს და კუთხეს მისი ხმით გამოიცნობ: სწორი კუთხე ყველაზე მეტ ქულას იძლევა, მეზობელი — ნაწილს.',
    modes: ['online', 'hybrid'], page: 'games', item: 'kutkhe', section: 'tamashebi',
  },
  {
    id: 'otkhidan-erti', title: 'ოთხიდან ერთი', like: 'Kahoot', text: 'კითხვა და ოთხი პასუხი ყველას ტელეფონზე — ვინც სწორს უფრო მალე მონიშნავს, მეტ ქულას იღებს',
    about: '„Kahoot“ კლასის ვიქტორინაა: კითხვა და ოთხი პასუხი, ყველა თავის ტელეფონზე ნიშნავს და სისწრაფეც ითვლება. ჩვენთან კითხვები სკოლის თემებზეა — წმინდანები, დღესასწაულები, გალობა, სიმღერა, მწერლობა — ზოგი ჩანაწერის მოსმენით; მასწავლებელს თავისი კითხვების დამატებაც შეუძლია.',
    modes: ['online', 'hybrid'], page: 'games', item: 'otkhi', section: 'tamashebi',
  },
  {
    id: 'khma-khmad', title: 'ხმა-ხმად', like: 'Bandle', text: 'ცნობილი საგალობელი ხმა-ხმად ჟღერს: ჯერ ბანი, მერე ორი ხმა, ბოლოს სამივე — რაც ადრე მიხვდები, მით მეტი ქულა',
    about: '„Bandle“ სიმღერის გამოცნობის თამაშია: ჯერ მხოლოდ დასარტყამები ისმის, მერე ბასი, გიტარა, ბოლოს მთელი ჯგუფი. ჩვენთან ცნობილი საგალობელი წიგნის ნოტებით ჟღერს სინთეზატორზე: ჯერ მარტო ბანი, მერე მოძახილიც, ბოლოს სამივე ხმა; ოთხი სახელიდან სწორს ირჩევ.',
    modes: ['online', 'hybrid'], page: 'games', item: 'khmebi', section: 'tamashebi',
  },
  {
    id: 'sam-notshi', title: 'სამ ნოტში!', like: 'Name That Tune', text: 'საგალობლის პირველი სამი ნოტი, მერე ექვსი, მერე მთელი ფრაზა — გამოიცანი რაც შეიძლება მალე',
    about: '„Name That Tune“ ცნობილი სატელევიზიო თამაშია: ვინ რამდენ ნოტში იცნობს მელოდიას. ჩვენთან ცნობილი საგალობლის ზედა ხმა ჟღერს წიგნის ნოტებით: ჯერ სამი ნოტი, მერე ექვსი, ბოლოს მთელი პირველი ფრაზა; ოთხი სახელიდან სწორს ირჩევ.',
    modes: ['online', 'hybrid'], page: 'games', item: 'notebi', section: 'tamashebi',
  },
  {
    id: 'ra-sad-rodis', title: 'რა? სად? როდის?', text: 'გუნდური ვიქტორინა: ერთი წუთი, პასუხი ფურცელზე — წმინდანები, გალობა, კუთხეები, ისტორია და ჩანაწერის ნაწყვეტები',
    about: '„რა? სად? როდის?“ ცნობილი სატელევიზიო ვიქტორინაა: გუნდი ერთ წუთში ბჭობს და ერთ პასუხს ირჩევს. ჩვენთან ყველა გუნდი ერთსა და იმავე კითხვას ერთდროულად პასუხობს ფურცელზე; კითხვები სკოლის თემებზეა, ზოგი ჩანაწერის მოსმენით.',
    modes: ['hybrid', 'noPhone'], page: 'games', item: 'rsr', section: 'tamashebi', print: { href: '/games/print/ra-sad-rodis.pdf', sheets: 8 },
  },
  {
    id: 'amikhseni', title: 'ამიხსენი', like: 'Alias', text: 'ახსენი სიტყვა მისი თქმის გარეშე, გუნდმა გამოიცნოს — ტელეფონი დროსა და ქულებს ითვლის',
    about: '„Alias“ გუნდური თამაშია: სიტყვას ხსნი ისე, რომ თვითონ არ თქვა, გუნდი კი დროზე გამოიცნობს. ჩვენთან ათასამდე ქართული ბარათია სკოლის თემებზე: საგალობლები, სიმღერები, წმინდანები, კუთხეები.',
    modes: ['hybrid', 'noPhone'], page: 'games', item: 'amikhseni', section: 'tamashebi', print: { href: '/games/print/amikhseni.pdf', sheets: 6 },
  },
  {
    id: 'dghis-sitqva', title: 'დღის სიტყვა', like: 'Wordle', text: 'ქართული სიტყვა ექვს ცდაში — დღის წმინდანი, დღესასწაული ან საეკლესიო სიტყვა, ყოველდღე ერთი მთელი სკოლისთვის',
    about: '„Wordle“ დღის სიტყვის თამაშია: ექვს ცდაში ფარულ სიტყვას გამოიცნობ, ფერები კი გეუბნება, რომელი ასოა სწორ ადგილას. ჩვენთან ქართული სიტყვაა, 4–6 ასო, ხშირად დღის დღესასწაული ან წმინდანი.',
    modes: ['online', 'noPhone'], page: 'games', item: 'sitqva', section: 'tamashebi', print: { href: '/games/print/dghis-sitqva.pdf', sheets: 7 },
  },
  {
    id: 'otkheuli', title: 'ოთხეული', like: 'Connections', text: '16 სიტყვა, ოთხი ფარული ჯგუფი: წმიდანები, კუთხეები, საკრავები, ხმები… — დღის ბადე და კიდევ რამდენიც გინდა',
    about: '„Connections“ დღის თავსატეხია: 16 სიტყვა ოთხ ფარულ ჯგუფად უნდა დაყო, ოთხი შეცდომის უფლებით. ჩვენთან ჯგუფები ქართულია: წმინდანები, კუთხეები, საკრავები, სიმღერები და საგალობლები.',
    modes: ['online', 'noPhone'], page: 'games', item: 'otkheuli', section: 'tamashebi', print: { href: '/games/print/otkheuli.pdf', sheets: 18 },
  },
  {
    id: 'dghis-hangi', title: 'დღის ჰანგი', like: 'Heardle', text: 'ყოველდღე ერთი საგალობელი ან სიმღერა: 1 წამი, 2, 4… — გამოიცანი რაც შეიძლება მალე',
    about: '„Heardle“ სიმღერის ცნობის თამაშია: ჯერ 1 წამს გესმის, მერე 2-ს, 4-ს… და რაც შეიძლება ადრე უნდა იცნო. ჩვენთან სკოლის საგალობლები და ხალხური სიმღერებია, დღის ჰანგი კი ერთია მთელი სკოლისთვის.',
    modes: ['online'], page: 'games', item: 'hangi', section: 'tamashebi',
  },
  { id: 'margalitebi', title: 'მარგალიტები', text: 'მოისმინე საგალობლის ფრაზა, ჩამღერე მიკროფონში და გააპრიალე მარგალიტი', modes: ['online'], page: 'gz', panel: 'pearls', section: 'margalitebi' },
  { id: 'gatvla', title: 'გათვლა', text: 'ვინ იწყებს, ვისი ჯერია, ვინ რომელ გუნდშია — გათვლის ლექსით, ბორბლით და წილისყრით, ერთ ტელეფონზე', modes: ['hybrid'], page: 'games', item: 'gatvla', section: 'tamashebi' },
  {
    id: 'tskheli-churchkhela', title: 'ცხელი ჩურჩხელა', like: 'ცხელი კარტოფილი', text: 'სკოლის ჩანაწერი მოულოდნელად ჩერდება — ვისაც ჩურჩხელა ხელში რჩება, ის დავალებას ასრულებს',
    about: '„ცხელი კარტოფილი“ ბავშვების ცნობილი თამაშია: საგანს ხელიდან ხელში გადასცემთ, სანამ მუსიკა უკრავს, ვისთანაც გაჩერდება, ის ასრულებს დავალებას. ჩვენთან ჩურჩხელა გადადის, ჟღერს სკოლის ჩანაწერი, დავალება კი სიმღერა ან ჰანგის ცნობაა.',
    modes: ['hybrid'], page: 'games', item: 'churchkhela', section: 'tamashebi',
  },
  // the board games the school prints and makes itself, each a Georgian retheme on paper
  {
    id: 'okros-khana', title: 'ოქროს ხანა', like: 'კატანი', text: 'ერისთავები ოქროს ხანის საქართველოს აშენებენ: ხე, ქვა, მატყლი, პური, მადანი',
    about: '„კატანი“ ცნობილი სამაგიდო თამაშია: ფილებზე ნედლეულს აგროვებ, ვაჭრობ, გზებს, სოფლებს და ქალაქებს აშენებ. ჩვენთან ოქროს ხანის საქართველოა: ერისთავები და ქართული ადგილები; წესები თითქმის იგივეა.',
    modes: ['noPhone'], print: { href: '/games/print/okros-khana.pdf', sheets: 27 },
  },
  {
    id: 'qaravani', title: 'ქარავანი', like: 'Ticket to Ride', text: 'საქართველოს რუკა: ქარავნის გზები და მომლოცველობა მცხეთიდან ბათუმამდე',
    about: '„Ticket to Ride“ ცნობილი სამაგიდო თამაშია: ფერადი ბარათებით გზებს იკავებ და ქალაქებს აკავშირებ. ჩვენთან XIX საუკუნის საქართველოს რუკაა: 47 ქალაქი, ქარავნის გზები, ქარვასლები და მგზავრის წერილები.',
    modes: ['noPhone'], print: { href: '/games/print/qaravani.pdf', sheets: 31 },
  },
  {
    id: 'ori-takhti', title: 'ორი ტახტი', like: '7 Wonders Duel', text: 'ორი ქართული სამეფო სამ ეპოქაში: ვინ ააშენებს მეტ ძეგლს',
    about: '„7 Wonders Duel“ ორი მოთამაშის სამაგიდო თამაშია: სამ ეპოქაში ბარათებით ქალაქს აშენებ და მეცნიერებით, ჯარით ან ქულებით იმარჯვებ. ჩვენთან დასავლეთის (ქუთაისი) და აღმოსავლეთის (თბილისი) ტახტები ეცილება ერთმანეთს, საოცრებების ნაცვლად კი 12 ქართული ძეგლია.',
    modes: ['noPhone'], print: { href: '/games/print/ori-takhti.pdf', sheets: 19 },
  },
  {
    id: 'lurji-supra', title: 'ლურჯი სუფრა', like: 'Azul', text: 'ქართული ორნამენტებით მოხატული ფილები სუფრაზე დააწყვე',
    about: '„Azul“ ცნობილი სამაგიდო თამაშია: ფერად ფილებს არჩევ და შენს დაფაზე ნიმუშად აწყობ. ჩვენთან ერეკლე II-ის თბილისია, ფილებზე კი ქართული ორნამენტებია.',
    modes: ['noPhone'], print: { href: '/games/print/lurji-supra.pdf', sheets: 13 },
  },
  {
    id: 'mepis-kari', title: 'მეფის კარი', like: 'Coup', text: 'მეფის კარის როლები: ვინ ვინ არის — ბლეფი და გამჭრიახობა',
    about: '„Coup“ მოკლე ბლეფის თამაშია: ორი ფარული როლი გაქვს, მათ ძალას იყენებ ან იტყუები, ბოლოს კი ერთი რჩება. ჩვენთან თამარ მეფის კარია: მეჭურჭლეთუხუცესი, მანდატურთუხუცესი და სხვა კარისკაცები, ფული კი თეთრია.',
    modes: ['noPhone'], print: { href: '/games/print/mepis-kari.pdf', sheets: 8 },
  },
];

/** The title of a game open inside the games page (its `mapItem`), for the top bar. */
export const gameTitleOfItem = (item: string | null | undefined) => (item ? GAMES.find(g => g.item === item)?.title : undefined);
