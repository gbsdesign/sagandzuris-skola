// „ორი ტახტი“'s pieces (the printed kit, scripts/print-games/games/ori-takhti.mjs, copies one piece of 7 Wonders Duel in each
// line — colour, cost, effect, shields, symbol, chain — so the balance is the original's; names and history are the school's).
// The app's variants (utils/oriTakhti.ts) read them from here; tests/oriTakhti.test.ts checks them against the kit's lines.
// cost: a number = coins, letters = resources (W ხე, S ქვა, K თიხა, G მინანქარი, P ეტრატი); eff: prod (every turn), one (one
// of them every turn), shields, vp, sci, coins (once), trade (buy at 1 coin), per (coins once for each card of a colour /
// wonder, plus vp), guild; a monument's token (the box's three), again, discard (build one free), ruin, steal.

export type Res = 'W' | 'S' | 'K' | 'G' | 'P';
export type CType = 'brown' | 'grey' | 'red' | 'green' | 'blue' | 'yellow' | 'guild';
export type Sci = 'anbani' | 'karabadini' | 'astronomia' | 'khuroba' | 'ruka' | 'galoba' | 'samartali';
export type Chain = 'nali' | 'khmali' | 'koshki' | 'tsigni' | 'borbali' | 'nighabi' | 'mtvare' | 'tsveti' | 'gasaghebi' | 'samizne'
  | 'drosha' | 'zari' | 'lampari' | 'sveti' | 'mze' | 'tvali' | 'tasi';
export type Per = 'grey' | 'brown' | 'red' | 'yellow' | 'wonder';
export type GuildKind = 'yellow' | 'brownGrey' | 'wonder' | 'blue' | 'green' | 'coins' | 'red';
export interface Eff {
  prod?: string; one?: string; shields?: number; vp?: number; sci?: Sci; coins?: number; trade?: string; per?: Per; guild?: GuildKind;
  token?: boolean; again?: boolean; discard?: boolean; ruin?: 'brown' | 'grey'; steal?: number;
}
export interface CardDef { n: string; t: CType; cost: string; eff: Eff; to?: Chain; from?: Chain; pic: string }
export interface WonderDef { n: string; cost: string; eff: Eff; text: string; hist: string }
export interface TokenDef { n: string; icon: string; short: string; text: string }

const AGE1: CardDef[] = [
  { n: 'ტყის ბანაკი', t: 'brown', cost: '', eff: { prod: 'W' }, pic: 'trees' }, // Lumber Yard
  { n: 'მეტყევის ქოხი', t: 'brown', cost: '1', eff: { prod: 'W' }, pic: 'axe' }, // Logging Camp
  { n: 'თიხის ორმო', t: 'brown', cost: '', eff: { prod: 'K' }, pic: 'shovel' }, // Clay Pool
  { n: 'თიხნარი', t: 'brown', cost: '1', eff: { prod: 'K' }, pic: 'amphora' }, // Clay Pit
  { n: 'სამტეხლო', t: 'brown', cost: '', eff: { prod: 'S' }, pic: 'pickaxe' }, // Quarry
  { n: 'ქვის ფერდი', t: 'brown', cost: '1', eff: { prod: 'S' }, pic: 'mountain' }, // Stone Pit
  { n: 'მინანქრის სახელოსნო', t: 'grey', cost: '1', eff: { prod: 'G' }, pic: 'flame' }, // Glassworks
  { n: 'ეტრატის სახელოსნო', t: 'grey', cost: '1', eff: { prod: 'P' }, pic: 'scroll-text' }, // Press
  { n: 'კოშკი', t: 'red', cost: '', eff: { shields: 1 }, pic: 'tower-control' }, // Guard Tower
  { n: 'ცხენოსნები', t: 'red', cost: 'W', eff: { shields: 1 }, to: 'nali', pic: 'knight' }, // Stable
  { n: 'მეციხოვნეები', t: 'red', cost: 'K', eff: { shields: 1 }, to: 'khmali', pic: 'shield-half' }, // Garrison
  { n: 'გალავანი', t: 'red', cost: '2', eff: { shields: 1 }, to: 'koshki', pic: 'fence' }, // Palisade
  { n: 'ხუროს სახელოსნო', t: 'green', cost: 'P', eff: { sci: 'khuroba', vp: 1 }, pic: 'ruler' }, // Workshop
  { n: 'მგალობელთა დასი', t: 'green', cost: 'G', eff: { sci: 'galoba', vp: 1 }, pic: 'music-4' }, // Apothecary
  { n: 'მწიგნობართა სენაკი', t: 'green', cost: '2', eff: { sci: 'anbani' }, to: 'tsigni', pic: 'pen-tool' }, // Scriptorium
  { n: 'მკურნალი', t: 'green', cost: '2', eff: { sci: 'karabadini' }, to: 'borbali', pic: 'leafy-green' }, // Pharmacist
  { n: 'ქვის საწყობი', t: 'yellow', cost: '3', eff: { trade: 'S' }, pic: 'warehouse' }, // Stone Reserve
  { n: 'თიხის საწყობი', t: 'yellow', cost: '3', eff: { trade: 'K' }, pic: 'warehouse' }, // Clay Reserve
  { n: 'ხის საწყობი', t: 'yellow', cost: '3', eff: { trade: 'W' }, pic: 'warehouse' }, // Wood Reserve
  { n: 'ფუნდუკი', t: 'yellow', cost: '', eff: { coins: 4 }, to: 'gasaghebi', pic: 'bed-double' }, // Tavern
  { n: 'უფლისციხის დარბაზი', t: 'blue', cost: '', eff: { vp: 3 }, to: 'nighabi', pic: 'theater' }, // Theater
  { n: 'ქალაქის კარიბჭე', t: 'blue', cost: '', eff: { vp: 3 }, to: 'mtvare', pic: 'door-open' }, // Altar
  { n: 'გოგირდის აბანო', t: 'blue', cost: 'S', eff: { vp: 3 }, to: 'tsveti', pic: 'bath' }, // Baths
];
const AGE2: CardDef[] = [
  { n: 'სახერხი', t: 'brown', cost: '2', eff: { prod: 'WW' }, pic: 'tree-pine' }, // Sawmill
  { n: 'აგურის ქურა', t: 'brown', cost: '2', eff: { prod: 'KK' }, pic: 'brick-wall-fire' }, // Brickyard
  { n: 'ბოლნისის ქვა', t: 'brown', cost: '2', eff: { prod: 'SS' }, pic: 'mountain-snow' }, // Shelf Quarry
  { n: 'მინანქრის ოსტატი', t: 'grey', cost: '', eff: { prod: 'G' }, pic: 'paintbrush' }, // Glass-Blower
  { n: 'ეტრატის საშრობი', t: 'grey', cost: '', eff: { prod: 'P' }, pic: 'notebook-pen' }, // Drying Room
  { n: 'ციხის კედლები', t: 'red', cost: 'SS', eff: { shields: 2 }, pic: 'shield' }, // Walls
  { n: 'ცხენსაშენი', t: 'red', cost: 'KW', eff: { shields: 1 }, from: 'nali', pic: 'knight' }, // Horse Breeders
  { n: 'მონასპა', t: 'red', cost: '3', eff: { shields: 1 }, from: 'khmali', pic: 'swords' }, // Barracks
  { n: 'მოისრები', t: 'red', cost: 'SWP', eff: { shields: 2 }, to: 'samizne', pic: 'bow-arrow' }, // Archery Range
  { n: 'დიდგორის ლაშქარი', t: 'red', cost: 'KKG', eff: { shields: 2 }, to: 'drosha', pic: 'medal' }, // Parade Ground
  { n: 'წიგნსაცავი', t: 'green', cost: 'SWG', eff: { sci: 'anbani', vp: 2 }, from: 'tsigni', pic: 'library' }, // Library
  { n: 'სამკურნალო', t: 'green', cost: 'KKS', eff: { sci: 'karabadini', vp: 2 }, from: 'borbali', pic: 'stethoscope' }, // Dispensary
  { n: 'გალობის სკოლა', t: 'green', cost: 'WPP', eff: { sci: 'galoba', vp: 1 }, to: 'zari', pic: 'school' }, // School
  { n: 'ტაძრის ხუროები', t: 'green', cost: 'WGG', eff: { sci: 'khuroba', vp: 1 }, to: 'lampari', pic: 'ruler' }, // Laboratory
  { n: 'სააჯო კარი', t: 'blue', cost: 'WWG', eff: { vp: 5 }, pic: 'gavel' }, // Courthouse
  { n: 'გეგუთის სასახლე', t: 'blue', cost: 'KK', eff: { vp: 4 }, from: 'nighabi', to: 'sveti', pic: 'crown' }, // Statue
  { n: 'ნოქალაქევი', t: 'blue', cost: 'WP', eff: { vp: 4 }, from: 'mtvare', to: 'mze', pic: 'brick-wall' }, // Temple
  { n: 'წყალსადენი', t: 'blue', cost: 'SSS', eff: { vp: 5 }, from: 'tsveti', pic: 'waves' }, // Aqueduct
  { n: 'ბესლეთის ხიდი', t: 'blue', cost: 'SW', eff: { vp: 4 }, to: 'tvali', pic: 'bridge' }, // Rostrum
  { n: 'ბაზარი', t: 'yellow', cost: '3K', eff: { one: 'GP' }, pic: 'store' }, // Forum
  { n: 'ქარვასლა', t: 'yellow', cost: '2GP', eff: { one: 'WKS' }, pic: 'tent' }, // Caravansery
  { n: 'საბაჟო', t: 'yellow', cost: '4', eff: { trade: 'GP' }, pic: 'stamp' }, // Customs House
  { n: 'ზარაფხანა', t: 'yellow', cost: '', eff: { coins: 6 }, to: 'tasi', pic: 'hand-coins' }, // Brewery
];
const AGE3: CardDef[] = [
  { n: 'საჭურველთსაცავი', t: 'red', cost: 'KKKWW', eff: { shields: 3 }, pic: 'shield' }, // Arsenal
  { n: 'მორიგე ჯარი', t: 'red', cost: '8', eff: { shields: 3 }, pic: 'swords' }, // Pretorium
  { n: 'ციხესიმაგრე', t: 'red', cost: 'SSKP', eff: { shields: 2 }, from: 'koshki', pic: 'tower-control' }, // Fortifications
  { n: 'ზარბაზნის ქარხანა', t: 'red', cost: 'WWWG', eff: { shields: 2 }, from: 'samizne', pic: 'bomb' }, // Siege Workshop
  { n: 'ყაბახი', t: 'red', cost: 'KKSS', eff: { shields: 2 }, from: 'drosha', pic: 'knight' }, // Circus
  { n: 'თელავის სემინარია', t: 'green', cost: 'SWGG', eff: { sci: 'astronomia', vp: 3 }, pic: 'graduation-cap' }, // Academy
  { n: 'ვარსკვლავთმრიცხველი', t: 'green', cost: 'WWGP', eff: { sci: 'astronomia', vp: 3 }, pic: 'telescope' }, // Study
  { n: 'თბილისის სემინარია', t: 'green', cost: 'KGP', eff: { sci: 'ruka', vp: 2 }, from: 'zari', pic: 'school' }, // University
  { n: 'ვახუშტის ატლასი', t: 'green', cost: 'SPP', eff: { sci: 'ruka', vp: 2 }, from: 'lampari', pic: 'globe' }, // Observatory
  { n: 'ერეკლეს სასახლე', t: 'blue', cost: 'KSWGG', eff: { vp: 7 }, pic: 'crown' }, // Palace
  { n: 'თბილისის ოპერა', t: 'blue', cost: 'SSSWW', eff: { vp: 7 }, pic: 'music-4' }, // Town Hall
  { n: 'ქართული თეატრი', t: 'blue', cost: 'SSG', eff: { vp: 5 }, pic: 'theater' }, // Obelisk
  { n: 'ალექსანდრეს ბაღი', t: 'blue', cost: 'KKWW', eff: { vp: 6 }, from: 'sveti', pic: 'flower-2' }, // Gardens
  { n: 'ეროვნული გალერეა', t: 'blue', cost: 'KWPP', eff: { vp: 6 }, from: 'mze', pic: 'image' }, // Pantheon
  { n: 'წერა-კითხვის საზოგადოება', t: 'blue', cost: 'KKSP', eff: { vp: 5 }, from: 'tvali', pic: 'book-text' }, // Senate
  { n: 'ვაჭართა რიგი', t: 'yellow', cost: 'PP', eff: { per: 'grey', coins: 3, vp: 3 }, pic: 'shopping-basket' }, // Chamber of Commerce
  { n: 'ფოთის ნავსადგური', t: 'yellow', cost: 'WGP', eff: { per: 'brown', coins: 2, vp: 3 }, pic: 'sailboat' }, // Port
  { n: 'მეიარაღეთა რიგი', t: 'yellow', cost: 'SSG', eff: { per: 'red', coins: 1, vp: 3 }, pic: 'anvil' }, // Armory
  { n: 'ბათუმის შუქურა', t: 'yellow', cost: 'KKG', eff: { per: 'yellow', coins: 1, vp: 3 }, from: 'gasaghebi', pic: 'lighthouse' }, // Lighthouse
  { n: 'ლელოს მოედანი', t: 'yellow', cost: 'KSW', eff: { per: 'wonder', coins: 2, vp: 3 }, from: 'tasi', pic: 'volleyball' }, // Arena
];
const GUILDS: CardDef[] = [
  { n: 'ვაჭართა ამქარი', t: 'guild', cost: 'KWGP', eff: { guild: 'yellow' }, pic: 'handshake' }, // Merchants Guild
  { n: 'მეურმეთა ამქარი', t: 'guild', cost: 'KSGP', eff: { guild: 'brownGrey' }, pic: 'uremi' }, // Shipowners Guild
  { n: 'ხუროთმოძღვართა ამქარი', t: 'guild', cost: 'SSKWG', eff: { guild: 'wonder' }, pic: 'hammer' }, // Builders Guild
  { n: 'მოურავთა ამქარი', t: 'guild', cost: 'WWKP', eff: { guild: 'blue' }, pic: 'gavel' }, // Magistrates Guild
  { n: 'მწიგნობართა ამქარი', t: 'guild', cost: 'KKWW', eff: { guild: 'green' }, pic: 'feather' }, // Scientists Guild
  { n: 'ზარაფთა ამქარი', t: 'guild', cost: 'SSWW', eff: { guild: 'coins' }, pic: 'coins' }, // Moneylenders Guild
  { n: 'მხედართა ამქარი', t: 'guild', cost: 'SSKP', eff: { guild: 'red' }, pic: 'swords' }, // Tacticians Guild
];
/** every age card by its id: age I 0–22, age II 23–45, age III 46–65, the guilds 66–72 */
export const CARDS: readonly (CardDef & { age: 1 | 2 | 3 })[] = [
  ...AGE1.map(c => ({ ...c, age: 1 as const })), ...AGE2.map(c => ({ ...c, age: 2 as const })),
  ...AGE3.map(c => ({ ...c, age: 3 as const })), ...GUILDS.map(c => ({ ...c, age: 3 as const })),
];
export const AGE_IDS = { 1: [0, 23], 2: [23, 46], 3: [46, 66] } as const;
export const GUILD_IDS = [66, 73] as const;

/** the twelve monuments (the original's wonders, in the same order of effects) */
export const WONDERS: readonly WonderDef[] = [
  { n: 'სიღნაღის გალავანი', cost: 'SSSP', eff: { vp: 9 }, text: '9 დიდების ქულა.', hist: 'კახეთი · XVIII ს. · ერეკლე II-ის აშენებული გალავანი, 20-ზე მეტი კოშკით.' }, // Pyramids
  { n: 'ფაზისის აკადემია', cost: 'WWWGP', eff: { token: true, vp: 4 }, text: 'ყუთში დაბრუნებული 5 ცოდნის ნიშნიდან ბრმად აიღე 3, ერთი დაიტოვე, 2 დააბრუნე. 4 ქულა.', hist: 'კოლხეთი · IV ს. · რიტორიკისა და ფილოსოფიის სკოლა ფაზისთან.' }, // Great Library
  { n: 'სურამის ციხე', cost: 'SKGG', eff: { again: true, vp: 6 }, text: 'კიდევ ერთი სვლა. 6 ქულა.', hist: 'შიდა ქართლი · XII ს. · ციხე სურამის უღელტეხილთან; მასზეა ცნობილი თქმულება.' }, // Sphinx
  { n: 'ნარიყალა', cost: 'KKKG', eff: { shields: 2, vp: 3 }, text: '2 ფარი — მხედარი 2 უჯრით მეტოქისკენ. 3 ქულა.', hist: 'თბილისი · IV ს. · ძველად შურისციხე; ქალაქის მცველი ციხე მტკვრის თავზე.' }, // Colossus
  { n: 'ვანი', cost: 'WSGP', eff: { coins: 12, again: true }, text: 'ბანკიდან 12 თეთრი. კიდევ ერთი სვლა.', hist: 'კოლხეთი · ძვ. წ. VIII–I სს. · „ოქროს ქვეყნის“ ქალაქი; აქ ოქროს განძი იპოვეს.' }, // Temple of Artemis
  { n: 'ბოტანიკური ბაღი', cost: 'WWGP', eff: { coins: 6, again: true, vp: 3 }, text: 'ბანკიდან 6 თეთრი. კიდევ ერთი სვლა. 3 ქულა.', hist: 'თბილისი · XVII ს. · ძველი სამეფო ბაღი ნარიყალას ძირას.' }, // Hanging Gardens
  { n: 'ბირთვისი', cost: 'KKGGP', eff: { discard: true, vp: 2 }, text: 'გადაგდებული ბარათებიდან ერთი აირჩიე და უფასოდ ააშენე. 2 ქულა.', hist: 'ქვემო ქართლი · X–XIV სს. · აუღებელი ციხე ალგეთის ხეობის კლდეებზე.' }, // Mausoleum
  { n: 'უშგულის კოშკები', cost: 'SWKPP', eff: { shields: 1, ruin: 'brown', vp: 3 }, text: '1 ფარი. მეტოქის ერთი ყავისფერი ბარათი (შენი არჩეული) გადაგდებულში მიდის. 3 ქულა.', hist: 'სვანეთი · IX–XII სს. · ევროპის ერთ-ერთი ყველაზე მაღლა მდებარე სოფლის კოშკები.' }, // Statue of Zeus
  { n: 'გონიო', cost: 'WWSK', eff: { one: 'GP', again: true, vp: 2 }, text: 'ყოველ სვლაზე: მინანქარი ან ეტრატი (ერთი). კიდევ ერთი სვლა. 2 ქულა.', hist: 'აჭარა · I–II სს. · რომაული ციხე აფსაროსი ჭოროხის შესართავთან.' }, // Piraeus
  { n: 'სამშვილდე', cost: 'WSPP', eff: { one: 'WSK', vp: 4 }, text: 'ყოველ სვლაზე: ხე, ქვა ან თიხა (ერთი). 4 ქულა.', hist: 'ქვემო ქართლი · VIII–XI სს. · ციხე-ქალაქი ხრამის ხეობის კლდეზე.' }, // Great Lighthouse
  { n: 'ხერთვისი', cost: 'PPKKSS', eff: { coins: 3, steal: 3, again: true, vp: 3 }, text: 'ბანკიდან 3 თეთრი, მეტოქე ბანკს 3 თეთრს უხდის. კიდევ ერთი სვლა. 3 ქულა.', hist: 'მესხეთი · ძვ. წ. II ს. – XIV ს. · ციხე მტკვრისა და ფარავნის შესართავთან.' }, // Appian Way
  { n: 'შატილი', cost: 'SSWG', eff: { shields: 1, ruin: 'grey', vp: 3 }, text: '1 ფარი. მეტოქის ერთი ნაცრისფერი ბარათი (შენი არჩეული) გადაგდებულში მიდის. 3 ქულა.', hist: 'ხევსურეთი · VII–XIII სს. · ციხე-სოფელი, სადაც სახლები ერთმანეთზეა მიშენებული.' }, // Circus Maximus
];

/** the ten tokens of knowledge (the original's progress tokens) */
export const TOKENS: readonly TokenDef[] = [
  { n: 'ვენახი', icon: 'grape', short: '+6 თეთრი · 4 ქულა', text: 'ახლავე 6 თეთრი ბანკიდან; ბოლოს 4 ქულა.' }, // Agriculture
  { n: 'არსუკისძის სკოლა', icon: 'drafting-compass', short: 'ძეგლი −2 რესურსი', text: 'ყოველი შემდეგი ძეგლი 2 რესურსით იაფია (შენ ირჩევ, რომელი 2).' }, // Architecture
  { n: 'აბრეშუმის გზა', icon: 'route', short: 'მეტოქის ყიდვა — შენ', text: 'რა თეთრსაც მეტოქე ბანკს რესურსის საყიდლად უხდის, შენ გერგება.' }, // Economy
  { n: 'სამართლის წიგნი', icon: 'scale', short: 'სიბრძნის მე-7 ნიშანი', text: 'სიბრძნის ნიშანია — „სამართალი“; წყვილს არ ქმნის, აკადემიისთვის ითვლება.' }, // Law
  { n: 'ქვისმთლელები', icon: 'hammer', short: 'ლურჯი −2 რესურსი', text: 'ყოველი შემდეგი ლურჯი ბარათი 2 რესურსით იაფია.' }, // Masonry
  { n: 'სიტყვის კონა', icon: 'book-a', short: 'ბოლოს 3 ქულა ყოველ ნიშანზე', text: 'ბოლოს 3 ქულა შენს ყოველ ცოდნის ნიშანზე (ამასაც).' }, // Mathematics
  { n: 'ვეფხისტყაოსანი', icon: 'feather', short: '7 ქულა', text: 'ბოლოს 7 ქულა.' }, // Philosophy
  { n: 'დიდგორის გეგმა', icon: 'swords', short: 'ახალ წითელს +1 ფარი', text: 'ყოველ ახლად აშენებულ წითელ ბარათს 1 ფარი ემატება.' }, // Strategy
  { n: 'ათონელთა სკოლა', icon: 'mountain', short: 'ძეგლი = კიდევ სვლა', text: 'ყოველი შემდეგი ძეგლი „კიდევ ერთ სვლას“ გაძლევს.' }, // Theology
  { n: 'ქალაქის გეგმა', icon: 'house', short: '+6 · +4 ნიშნით აშენებაზე', text: 'ახლავე 6 თეთრი; ყოველ ოსტატის ნიშნით უფასო აშენებაზე +4 თეთრი.' }, // Urbanism
];
