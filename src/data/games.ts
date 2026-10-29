import type { PageType } from '../context/NavigationContext';
import type { SectionId } from './sections';

// The games hub („თამაშები“, 2026-10-27): three categories, and every game marked with the variants it gets —
// ონლაინ (in the app), ჰიბრიდული (played live, the phone helps) and უტელეფონო (printed, no phone at all).
// A game with a `page` is built and opens; a row without one is the next game to build, shown as a „მალე“ card. The other
// unbuilt games of the plan were taken off the page at the user's request (2026-10-28: show only what is ready).
// The whole plan (42 games with their three variants, the six board games) lives in the Claude doc
// „ქართული თამაშები სკოლისთვის“ — https://claude.ai/artifact/Dw24amtHhQvSGUd1pPE4fg
export type GameCategory = 'musical' | 'georgian' | 'live';
export type GameMode = 'online' | 'hybrid' | 'noPhone';

export interface GameDef {
  id: string;
  title: string;
  text: string;            // one line: what the player does
  category: GameCategory;
  modes: GameMode[];       // the variants, the first is the one built (or planned) first
  page?: PageType;         // built: where it opens
  panel?: string;          // built: a panel of that page to open first (the path page's round buttons)
  item?: string;           // built inside the games page: its `mapItem` (pages/games/)
  section?: SectionId;     // built: the admin's switch and the member's feature that show or hide it
  print?: { href: string; sheets: number }; // made on paper: public/games/print/<id>.pdf, printed two-sided (scripts/print-games)
  original?: string;       // a board game: the game it is a Georgian retheme of
}

export const GAME_CATEGORIES: { id: GameCategory; label: string; text: string }[] = [
  { id: 'musical', label: 'მუსიკალური', text: 'სმენა, ხმა და ნოტები: საგალობლებისა და სიმღერების ცნობა' },
  { id: 'georgian', label: 'ქართული', text: 'ქართული თამაშები და გადმოქართულებული პოპულარული თამაშები: ენა, ისტორია, კულტურა' },
  { id: 'live', label: 'ცოცხალი', text: 'მაგიდასთან და კლასში: აპი წესებს ხსნის, ითვლის და ქულებს ინახავს' },
];

export const MODE_LABEL: Record<GameMode, string> = { online: 'ონლაინ', hybrid: 'ჰიბრიდული', noPhone: 'უტელეფონო' };
export const MODE_HINT: Record<GameMode, string> = {
  online: 'აპში, თავისთვის ან კლასელებთან',
  hybrid: 'ცოცხლად, ტელეფონი ეხმარება',
  noPhone: 'დასაბეჭდი — ტელეფონის გარეშე',
};

export const GAMES: GameDef[] = [
  // მუსიკალური
  { id: 'margalitebi', title: 'მარგალიტები', text: 'მოისმინე საგალობლის ფრაზა, ჩამღერე მიკროფონში და გააპრიალე მარგალიტი', category: 'musical', modes: ['online'], page: 'gz', panel: 'pearls', section: 'margalitebi' },
  { id: 'dghis-hangi', title: 'დღის ჰანგი', text: 'ყოველდღე ერთი საგალობელი ან სიმღერა: 1 წამი, 2, 4… — გამოიცანი რაც შეიძლება მალე', category: 'musical', modes: ['online', 'hybrid'], page: 'games', item: 'hangi', section: 'tamashebi' },
  // ქართული
  { id: 'dghis-sitqva', title: 'დღის სიტყვა', text: 'ქართული სიტყვა ექვს ცდაში — დღის წმინდანი, დღესასწაული ან საეკლესიო სიტყვა, ყოველდღე ერთი მთელი სკოლისთვის', category: 'georgian', modes: ['online', 'noPhone'], page: 'games', item: 'sitqva', section: 'tamashebi', print: { href: '/games/print/dghis-sitqva.pdf', sheets: 7 } },
  { id: 'otkheuli', title: 'ოთხეული', text: '16 სიტყვა, ოთხი ფარული ჯგუფი: წმიდანები, კუთხეები, საკრავები, ხმები… — დღის ბადე და კიდევ რამდენიც გინდა', category: 'georgian', modes: ['online', 'noPhone'], page: 'games', item: 'otkheuli', section: 'tamashebi', print: { href: '/games/print/otkheuli.pdf', sheets: 18 } },
  // ცოცხალი
  { id: 'amikhseni', title: 'ამიხსენი', text: 'ახსენი სიტყვა მისი თქმის გარეშე, გუნდმა გამოიცნოს — ტელეფონი დროსა და ქულებს ითვლის', category: 'live', modes: ['hybrid', 'noPhone'], page: 'games', item: 'amikhseni', section: 'tamashebi', print: { href: '/games/print/amikhseni.pdf', sheets: 6 } },
  { id: 'gatvla', title: 'გათვლა', text: 'ვინ იწყებს, ვისი ჯერია, ვინ რომელ გუნდშია — გათვლის ლექსით, ბორბლით და წილისყრით, ერთ ტელეფონზე', category: 'live', modes: ['hybrid'], page: 'games', item: 'gatvla', section: 'tamashebi' },
  { id: 'tskheli-churchkhela', title: 'ცხელი ჩურჩხელა', text: 'სკოლის ჩანაწერი მოულოდნელად ჩერდება — ვისაც ჩურჩხელა ხელში რჩება, ის დავალებას ასრულებს', category: 'live', modes: ['hybrid'], page: 'games', item: 'churchkhela', section: 'tamashebi' },
  { id: 'ra-sad-rodis', title: 'რა? სად? როდის?', text: 'გუნდური ვიქტორინა: ერთი წუთი, პასუხი ფურცელზე — წმინდანები, გალობა, კუთხეები, ისტორია და ჩანაწერის ნაწყვეტები', category: 'live', modes: ['hybrid', 'noPhone'], page: 'games', item: 'rsr', section: 'tamashebi', print: { href: '/games/print/ra-sad-rodis.pdf', sheets: 8 } },
];

/** The six board games the school prints and makes itself — each a Georgian retheme, on paper only (no app variant). */
export const BOARD_GAMES: GameDef[] = [
  { id: 'okros-khana', title: 'ოქროს ხანა', original: 'კატანი', text: 'ერისთავები ოქროს ხანის საქართველოს აშენებენ: ხე, ქვა, მატყლი, პური, მადანი', category: 'live', modes: ['noPhone'], print: { href: '/games/print/okros-khana.pdf', sheets: 27 } },
  { id: 'samshvildis-ghame', title: 'სამშვილდის ღამე', original: 'მაფია', text: 'ციხე-ქალაქის მცველები და ჯაშუშები; წამყვანი, დღე და ღამე, ხმის მიცემა', category: 'live', modes: ['noPhone'], print: { href: '/games/print/samshvildis-game.pdf', sheets: 10 } },
  { id: 'qaravani', title: 'ქარავანი', original: 'Ticket to Ride', text: 'საქართველოს რუკა: ქარავნის გზები და მომლოცველობა მცხეთიდან ბათუმამდე', category: 'live', modes: ['noPhone'], print: { href: '/games/print/qaravani.pdf', sheets: 31 } },
  { id: 'ori-takhti', title: 'ორი ტახტი', original: '7 Wonders Duel', text: 'ორი ქართული სამეფო სამ ეპოქაში: ვინ ააშენებს მეტ ძეგლს', category: 'live', modes: ['noPhone'], print: { href: '/games/print/ori-takhti.pdf', sheets: 19 } },
  { id: 'lurji-supra', title: 'ლურჯი სუფრა', original: 'Azul', text: 'ქართული ორნამენტებით მოხატული ფილები სუფრაზე დააწყვე', category: 'live', modes: ['noPhone'], print: { href: '/games/print/lurji-supra.pdf', sheets: 13 } },
  { id: 'mepis-kari', title: 'მეფის კარი', original: 'Coup', text: 'მეფის კარის როლები: ვინ ვინ არის — ბლეფი და გამჭრიახობა', category: 'live', modes: ['noPhone'], print: { href: '/games/print/mepis-kari.pdf', sheets: 8 } },
];

/** The title of a game open inside the games page (its `mapItem`), for the top bar. */
export const gameTitleOfItem = (item: string | null | undefined) => (item ? GAMES.find(g => g.item === item)?.title : undefined);
