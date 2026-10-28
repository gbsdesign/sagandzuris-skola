// „ორი ტახტი“ (series №4): the printable kit of a 7 Wonders Duel-like game (Antoine Bauza and Bruno Cathala, 2015). Two Georgian
// thrones — the west (Kutaisi) and the east (Tbilisi) — build their kingdoms over three ages; a throne wins at once when its
// rider reaches the other capital (unification) or it gathers six kinds of wisdom (გელათის აკადემია), else by glory points.
// Every age card, monument and token copies one piece of the original — colour, cost, effect, shields, symbol, chain — so the
// balance is the original's; names, history and pictures are the school's. 19 sheets, two-sided: cover, 4 pages of rules,
// 9 card sheets (age I / II / III with the guilds; spare places hold the throne, help and layout cards), 2 monument sheets,
// the token sheet, the board „ლიხის გზა“ in two pieces, two A5 help sheets, scoresheets and the box label.
import { C, SERIES, SCHOOL, aso, esc, iconIn, cardSheet, placedSheet, page, stripe, foot, duplex, sheetNo } from '../lib.mjs';

export const id = 'ori-takhti';
export const title = 'ორი ტახტი';
const NO = 4;
const META = '2 მოთამაშე · 10 წლიდან · 30–40 წუთი';

const PAPER = '#f6eedd', INK = '#3b2a1c', GOLD = '#c9a24b', GOLD_D = '#9a7428', GOLD_L = '#f1d793', NIGHT = '#2b1e14';
const f = n => +n.toFixed(2);

// ---------- what is what ----------
const TYPE = {
  brown: { color: '#7a5230', name: 'ნედლეული', adj: 'ყავისფერი' },
  grey: { color: '#6b7078', name: 'ხელოსნობა', adj: 'ნაცრისფერი' },
  red: { color: '#8e2430', name: 'ლაშქარი', adj: 'წითელი' },
  green: { color: '#2f6b45', name: 'სიბრძნე', adj: 'მწვანე' },
  blue: { color: '#2b5797', name: 'დიდება', adj: 'ლურჯი' },
  yellow: { color: '#bf8a1f', name: 'ვაჭრობა', adj: 'ყვითელი' },
  guild: { color: '#5e3a7e', name: 'ამქარი', adj: 'იისფერი' },
};
/** The five resources: W ხე, S ქვა, K თიხა (raw, brown cards); G მინანქარი, P ეტრატი (crafted, grey cards). */
const RES = {
  W: { name: 'ხე', acc: 'ხეს', color: '#4f7330', icon: 'tree-deciduous' },
  S: { name: 'ქვა', acc: 'ქვას', color: '#737881', icon: 'brick-wall' },
  K: { name: 'თიხა', acc: 'თიხას', color: '#b0552e', icon: 'amphora' },
  G: { name: 'მინანქარი', acc: 'მინანქარს', color: '#1d7a8c', icon: 'enamel' },
  P: { name: 'ეტრატი', acc: 'ეტრატს', color: '#9c7632', icon: 'scroll' },
};
/** The seven kinds of wisdom (the original's six science symbols and the law). */
const SCI = {
  anbani: { name: 'ანბანი', icon: 'letter' },
  karabadini: { name: 'კარაბადინი', icon: 'sprout' },
  astronomia: { name: 'ასტრონომია', icon: 'star' },
  khuroba: { name: 'ხუროთმოძღვრება', icon: 'drafting-compass' },
  ruka: { name: 'რუკა', icon: 'map' },
  galoba: { name: 'გალობა', icon: 'music' },
  samartali: { name: 'სამართალი', icon: 'scale' },
};
/** The masters' marks (the original's chain symbols): a card with the mark in its cost is free for a kingdom that has a card
 * showing the same mark in its corner. */
const CHAIN = {
  nali: { name: 'ნალი', icon: 'horseshoe' }, khmali: { name: 'ხმალი', icon: 'sword' }, koshki: { name: 'კოშკი', icon: 'castle' },
  tsigni: { name: 'წიგნი', icon: 'book-open' }, borbali: { name: 'ბორბალი', icon: 'cog' }, nighabi: { name: 'ნიღაბი', icon: 'drama' },
  mtvare: { name: 'მთვარე', icon: 'moon' }, tsveti: { name: 'წვეთი', icon: 'droplet' }, gasaghebi: { name: 'გასაღები', icon: 'key' },
  samizne: { name: 'სამიზნე', icon: 'target' }, drosha: { name: 'დროშა', icon: 'flag' }, zari: { name: 'ზარი', icon: 'bell' },
  lampari: { name: 'ლამპარი', icon: 'lamp' }, sveti: { name: 'სვეტი', icon: 'landmark' }, mze: { name: 'მზე', icon: 'sun' },
  tvali: { name: 'თვალი', icon: 'gem' }, tasi: { name: 'თასი', icon: 'trophy' },
};

// ---------- the cards: each line is one card of the original (its English name in the comment) ----------
// cost: a number = coins, letters = resources; eff: prod (every turn), one (one of them every turn), shields, vp, sci,
// coins (once), trade (buy at 1 coin), per (coins once for each card of a colour / wonder, plus vp), guild.
const AGE1 = [
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
  { n: 'ბოლნისის სიონი', t: 'blue', cost: '', eff: { vp: 3 }, to: 'mtvare', pic: 'church' }, // Altar
  { n: 'გოგირდის აბანო', t: 'blue', cost: 'S', eff: { vp: 3 }, to: 'tsveti', pic: 'bath' }, // Baths
];
const AGE2 = [
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
  { n: 'სამკურნალო', t: 'green', cost: 'KKS', eff: { sci: 'karabadini', vp: 2 }, from: 'borbali', pic: 'hospital' }, // Dispensary
  { n: 'გალობის სკოლა', t: 'green', cost: 'WPP', eff: { sci: 'galoba', vp: 1 }, to: 'zari', pic: 'school' }, // School
  { n: 'ტაძრის ხუროები', t: 'green', cost: 'WGG', eff: { sci: 'khuroba', vp: 1 }, to: 'lampari', pic: 'ruler' }, // Laboratory
  { n: 'სააჯო კარი', t: 'blue', cost: 'WWG', eff: { vp: 5 }, pic: 'gavel' }, // Courthouse
  { n: 'გეგუთის სასახლე', t: 'blue', cost: 'KK', eff: { vp: 4 }, from: 'nighabi', to: 'sveti', pic: 'crown' }, // Statue
  { n: 'ყინწვისის ტაძარი', t: 'blue', cost: 'WP', eff: { vp: 4 }, from: 'mtvare', to: 'mze', pic: 'church' }, // Temple
  { n: 'წყალსადენი', t: 'blue', cost: 'SSS', eff: { vp: 5 }, from: 'tsveti', pic: 'waves' }, // Aqueduct
  { n: 'ბესლეთის ხიდი', t: 'blue', cost: 'SW', eff: { vp: 4 }, to: 'tvali', pic: 'bridge' }, // Rostrum
  { n: 'ბაზარი', t: 'yellow', cost: '3K', eff: { one: 'GP' }, pic: 'store' }, // Forum
  { n: 'ქარვასლა', t: 'yellow', cost: '2GP', eff: { one: 'WKS' }, pic: 'tent' }, // Caravansery
  { n: 'საბაჟო', t: 'yellow', cost: '4', eff: { trade: 'GP' }, pic: 'stamp' }, // Customs House
  { n: 'ზარაფხანა', t: 'yellow', cost: '', eff: { coins: 6 }, to: 'tasi', pic: 'hand-coins' }, // Brewery
];
const AGE3 = [
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
  { n: 'მამადავითი', t: 'blue', cost: 'KWPP', eff: { vp: 6 }, from: 'mze', pic: 'church' }, // Pantheon
  { n: 'წერა-კითხვის საზოგადოება', t: 'blue', cost: 'KKSP', eff: { vp: 5 }, from: 'tvali', pic: 'book-text' }, // Senate
  { n: 'ვაჭართა რიგი', t: 'yellow', cost: 'PP', eff: { per: 'grey', coins: 3, vp: 3 }, pic: 'shopping-basket' }, // Chamber of Commerce
  { n: 'ფოთის ნავსადგური', t: 'yellow', cost: 'WGP', eff: { per: 'brown', coins: 2, vp: 3 }, pic: 'sailboat' }, // Port
  { n: 'მეიარაღეთა რიგი', t: 'yellow', cost: 'SSG', eff: { per: 'red', coins: 1, vp: 3 }, pic: 'anvil' }, // Armory
  { n: 'ბათუმის შუქურა', t: 'yellow', cost: 'KKG', eff: { per: 'yellow', coins: 1, vp: 3 }, from: 'gasaghebi', pic: 'lighthouse' }, // Lighthouse
  { n: 'ლელოს მოედანი', t: 'yellow', cost: 'KSW', eff: { per: 'wonder', coins: 2, vp: 3 }, from: 'tasi', pic: 'volleyball' }, // Arena
];
const GUILDS = [
  { n: 'ვაჭართა ამქარი', t: 'guild', cost: 'KWGP', eff: { guild: 'yellow' }, pic: 'handshake' }, // Merchants Guild
  { n: 'მეურმეთა ამქარი', t: 'guild', cost: 'KSGP', eff: { guild: 'brownGrey' }, pic: 'uremi' }, // Shipowners Guild
  { n: 'ხუროთმოძღვართა ამქარი', t: 'guild', cost: 'SSKWG', eff: { guild: 'wonder' }, pic: 'hammer' }, // Builders Guild
  { n: 'მოურავთა ამქარი', t: 'guild', cost: 'WWKP', eff: { guild: 'blue' }, pic: 'gavel' }, // Magistrates Guild
  { n: 'მწიგნობართა ამქარი', t: 'guild', cost: 'KKWW', eff: { guild: 'green' }, pic: 'feather' }, // Scientists Guild
  { n: 'ზარაფთა ამქარი', t: 'guild', cost: 'SSWW', eff: { guild: 'coins' }, pic: 'coins' }, // Moneylenders Guild
  { n: 'მხედართა ამქარი', t: 'guild', cost: 'SSKP', eff: { guild: 'red' }, pic: 'swords' }, // Tacticians Guild
];
AGE1.forEach(c => (c.age = 1)); AGE2.forEach(c => (c.age = 2)); [...AGE3, ...GUILDS].forEach(c => (c.age = 3));

/** The twelve monuments (the original's wonders, in the same order of effects). */
const WONDERS = [
  { n: 'სვეტიცხოველი', cost: 'SSSP', eff: { vp: 9 }, text: '9 დიდების ქულა.', hist: 'მცხეთა · 1010–1029 · ხუროთმოძღვარი არსუკისძე; საქართველოს დედა ტაძარი.' }, // Pyramids
  { n: 'იყალთოს აკადემია', cost: 'WWWGP', eff: { token: true, vp: 4 }, text: 'ყუთში დაბრუნებული 5 ცოდნის ნიშნიდან ბრმად აიღე 3, ერთი დაიტოვე, 2 დააბრუნე. 4 ქულა.', hist: 'კახეთი · XII ს. · დავით აღმაშენებლის დროს დაარსდა, აქ ასწავლიდა არსენ იყალთოელი.' }, // Great Library
  { n: 'ჯვარი', cost: 'SKGG', eff: { again: true, vp: 6 }, text: 'კიდევ ერთი სვლა. 6 ქულა.', hist: 'მცხეთა · 586–605 · ერისმთავარ სტეფანოზის დროს, წმინდა ნინოს ჯვრის ადგილას.' }, // Sphinx
  { n: 'ნარიყალა', cost: 'KKKG', eff: { shields: 2, vp: 3 }, text: '2 ფარი — მხედარი 2 უჯრით მეტოქისკენ. 3 ქულა.', hist: 'თბილისი · IV ს. · ძველად შურისციხე; ქალაქის მცველი ციხე მტკვრის თავზე.' }, // Colossus
  { n: 'ბაგრატი', cost: 'WSGP', eff: { coins: 12, again: true }, text: 'ბანკიდან 12 თეთრი. კიდევ ერთი სვლა.', hist: 'ქუთაისი · 1003 · ბაგრატ III-ის ტაძარი, გაერთიანებული საქართველოს პირველი მეფისა.' }, // Temple of Artemis
  { n: 'ალავერდი', cost: 'WWGP', eff: { coins: 6, again: true, vp: 3 }, text: 'ბანკიდან 6 თეთრი. კიდევ ერთი სვლა. 3 ქულა.', hist: 'კახეთი · XI ს. · კახთა მეფე კვირიკე III-ის აშენებული დიდი ტაძარი.' }, // Hanging Gardens
  { n: 'ვარძია', cost: 'KKGGP', eff: { discard: true, vp: 2 }, text: 'გადაგდებული ბარათებიდან ერთი აირჩიე და უფასოდ ააშენე. 2 ქულა.', hist: 'ჯავახეთი · 1185 · თამარ მეფის კლდეში ნაკვეთი ქალაქი-მონასტერი.' }, // Mausoleum
  { n: 'უშგულის კოშკები', cost: 'SWKPP', eff: { shields: 1, ruin: 'brown', vp: 3 }, text: '1 ფარი. მეტოქის ერთი ყავისფერი ბარათი (შენი არჩეული) გადაგდებულში მიდის. 3 ქულა.', hist: 'სვანეთი · IX–XII სს. · ევროპის ერთ-ერთი ყველაზე მაღლა მდებარე სოფლის კოშკები.' }, // Statue of Zeus
  { n: 'დავით გარეჯა', cost: 'WWSK', eff: { one: 'GP', again: true, vp: 2 }, text: 'ყოველ სვლაზე: მინანქარი ან ეტრატი (ერთი). კიდევ ერთი სვლა. 2 ქულა.', hist: 'გარეჯის უდაბნო · VI ს. · დავით გარეჯელის დაარსებული კლდის მონასტრები.' }, // Piraeus
  { n: 'ნიკორწმინდა', cost: 'WSPP', eff: { one: 'WSK', vp: 4 }, text: 'ყოველ სვლაზე: ხე, ქვა ან თიხა (ერთი). 4 ქულა.', hist: 'რაჭა · 1010–1014 · ბაგრატ III-ის დროს; ფასადები ჩუქურთმით არის მოჩუქურთმებული.' }, // Great Lighthouse
  { n: 'ხერთვისი', cost: 'PPKKSS', eff: { coins: 3, steal: 3, again: true, vp: 3 }, text: 'ბანკიდან 3 თეთრი, მეტოქე ბანკს 3 თეთრს უხდის. კიდევ ერთი სვლა. 3 ქულა.', hist: 'მესხეთი · ძვ. წ. II ს. – XIV ს. · ციხე მტკვრისა და ფარავნის შესართავთან.' }, // Appian Way
  { n: 'შატილი', cost: 'SSWG', eff: { shields: 1, ruin: 'grey', vp: 3 }, text: '1 ფარი. მეტოქის ერთი ნაცრისფერი ბარათი (შენი არჩეული) გადაგდებულში მიდის. 3 ქულა.', hist: 'ხევსურეთი · VII–XIII სს. · ციხე-სოფელი, სადაც სახლები ერთმანეთზეა მიშენებული.' }, // Circus Maximus
];

/** The ten tokens of knowledge (the original's progress tokens). */
const TOKENS = [
  { n: 'ვენახი', icon: 'grape', short: '+6 თეთრი · 4 ქულა', text: 'ახლავე 6 თეთრი ბანკიდან; ბოლოს 4 ქულა.' }, // Agriculture
  { n: 'არსუკისძის სკოლა', icon: 'church', short: 'ძეგლი −2 რესურსი', text: 'ყოველი შემდეგი ძეგლი 2 რესურსით იაფია (შენ ირჩევ, რომელი 2).' }, // Architecture
  { n: 'აბრეშუმის გზა', icon: 'route', short: 'მეტოქის ყიდვა — შენ', text: 'რა თეთრსაც მეტოქე ბანკს რესურსის საყიდლად უხდის, შენ გერგება.' }, // Economy
  { n: 'სამართლის წიგნი', icon: 'scale', short: 'სიბრძნის მე-7 ნიშანი', text: 'სიბრძნის ნიშანია — „სამართალი“; წყვილს არ ქმნის, აკადემიისთვის ითვლება.' }, // Law
  { n: 'ქვისმთლელები', icon: 'hammer', short: 'ლურჯი −2 რესურსი', text: 'ყოველი შემდეგი ლურჯი ბარათი 2 რესურსით იაფია.' }, // Masonry
  { n: 'სიტყვის კონა', icon: 'book-a', short: 'ბოლოს 3 ქულა ყოველ ნიშანზე', text: 'ბოლოს 3 ქულა შენს ყოველ ცოდნის ნიშანზე (ამასაც).' }, // Mathematics
  { n: 'ვეფხისტყაოსანი', icon: 'feather', short: '7 ქულა', text: 'ბოლოს 7 ქულა.' }, // Philosophy
  { n: 'დიდგორის გეგმა', icon: 'swords', short: 'ახალ წითელს +1 ფარი', text: 'ყოველ ახლად აშენებულ წითელ ბარათს 1 ფარი ემატება.' }, // Strategy
  { n: 'ათონელთა სკოლა', icon: 'mountain', short: 'ძეგლი = კიდევ სვლა', text: 'ყოველი შემდეგი ძეგლი „კიდევ ერთ სვლას“ გაძლევს.' }, // Theology
  { n: 'ქალაქის გეგმა', icon: 'house', short: '+6 · +4 ნიშნით აშენებაზე', text: 'ახლავე 6 თეთრი; ყოველ ოსტატის ნიშნით უფასო აშენებაზე +4 თეთრი.' }, // Urbanism
];

// ---------- icons: lucide's, plus a few drawn here in lucide's 24-unit style ----------
const CUSTOM = {
  enamel: c => `<circle cx="12" cy="12" r="9"/><path d="M12 6.2c1.7 2.3 1.7 4.1 0 5.8c-1.7-1.7-1.7-3.5 0-5.8ZM12 17.8c1.7-2.3 1.7-4.1 0-5.8c-1.7 1.7-1.7 3.5 0 5.8ZM6.2 12c2.3-1.7 4.1-1.7 5.8 0c-1.7 1.7-3.5 1.7-5.8 0ZM17.8 12c-2.3-1.7-4.1-1.7-5.8 0c1.7 1.7 3.5 1.7 5.8 0Z" fill="${c}" fill-opacity=".35"/>`,
  horseshoe: c => `<path d="M7.2 20.5C3.4 16.2 3.6 7.6 12 4.4C20.4 7.6 20.6 16.2 16.8 20.5"/><path d="M5.2 20.5h4M14.8 20.5h4"/><g fill="${c}" stroke="none"><circle cx="6.6" cy="12.4" r=".9"/><circle cx="8.3" cy="8.2" r=".9"/><circle cx="17.4" cy="12.4" r=".9"/><circle cx="15.7" cy="8.2" r=".9"/></g>`,
  bridge: () => '<path d="M2 18.5h20"/><path d="M3 18.5V15a9 6.5 0 0 1 18 0v3.5"/><path d="M2 9.5h20"/><path d="M7 9.5v2.6M12 9.5v1.4M17 9.5v2.6"/>',
  lighthouse: () => '<path d="M8.8 21.5l1.6-12.5h3.2l1.6 12.5Z"/><path d="M7 21.5h10"/><path d="M9.6 9h4.8"/><path d="M10.2 9V6.2a1.8 1.8 0 0 1 3.6 0V9"/><path d="M4.5 4.5l3 1.6M19.5 4.5l-3 1.6M3.5 9h3M20.5 9h-3"/><path d="M10 14.5h4"/>',
  uremi: c => `<path d="M2.5 6.5h15l-1.4 6.2H3.9Z"/><path d="M6.5 6.5v6.2M10 6.5v6.2M13.5 6.5v6.2"/><circle cx="9.5" cy="16.6" r="4.4"/><circle cx="9.5" cy="16.6" r=".9" fill="${c}"/><path d="M9.5 12.2v8.8M5.1 16.6h8.8"/><path d="M17.2 11.4l5.3 3.1"/>`,
  letter: c => `<text x="12" y="18.6" text-anchor="middle" font-family="SerifKa" font-weight="800" font-size="19" fill="${c}" stroke="none">ა</text>`,
  knight: c => `<path fill="${c}" stroke="none" d="${KNIGHT}"/>`,
};
/** A chess knight — in Georgian chess the knight is called მხედარი (rider), the game's pawn on „ლიხის გზა“. 24×24, facing left. */
const KNIGHT = 'M6.2 21.6h12.6v-1.4c0-.7-.5-1.2-1.2-1.2H7.4c-.7 0-1.2.5-1.2 1.2ZM8.3 18.2h8.4c.2-2.2.9-4.3 1.6-6.3c.8-2.3.6-4.6-.5-6.4c-1-1.5-2.6-2.5-4.3-2.8l-.4-1.5l-1.4 1.3l-1.2-1.1l-.2 1.8C8 4.1 6.3 6.4 5.2 9.2L3.8 12c-.3.7 0 1.4.6 1.7l.8.4c.5.2 1 .1 1.4-.2l1.7-1.4c.9-.7 2.1-.9 3.1-.5C9.7 13.9 8.6 15.9 8.3 18.2Z';
const glyph = (name, x, y, s, color, w = 2) => CUSTOM[name]
  ? `<svg x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${CUSTOM[name](color)}</svg>`
  : iconIn(name, { x: f(x), y: f(y), size: f(s), color, width: w });

// ---------- the pieces every card speaks with (SVG in mm) ----------
const resChip = (k, x, y, s) => `<rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" rx="${f(s * 0.2)}" fill="${RES[k].color}" stroke="#fffaf0" stroke-width="${f(s * 0.05)}"/>${glyph(RES[k].icon, x + s * 0.15, y + s * 0.15, s * 0.7, '#fff', 2.2)}`;
const coin = (n, cx, cy, s, { neg = false } = {}) => {
  const t = String(n), fs = s * (t.length > 2 ? 0.36 : t.length > 1 ? 0.46 : 0.56);
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s / 2)}" fill="#d8aa45" stroke="#a37a2c" stroke-width="${f(s * 0.06)}"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.37)}" fill="none" stroke="#f3d98c" stroke-width="${f(s * 0.035)}"/>
<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="${f(fs)}" fill="${neg ? '#8e2430' : '#4a3010'}">${esc(t)}</text>`;
};
const wreath = (n, cx, cy, s) => {
  const r = s * 0.39, leaves = [];
  for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
    const a = ((side < 0 ? 112 + k * 25 : 68 - k * 25) * Math.PI) / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), rot = (a * 180) / Math.PI + 90 + side * 22;
    leaves.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(s * 0.11)}" ry="${f(s * 0.05)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="#4f7a3a"/>`);
  }
  const t = String(n), fs = s * (t.length > 1 ? 0.42 : 0.5);
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.5)}" fill="#fbf6e4" stroke="#c9b77a" stroke-width="${f(s * 0.03)}"/>${leaves.join('')}
<text x="${f(cx)}" y="${f(cy + fs * 0.36)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="${f(fs)}" fill="#2f4f22">${esc(t)}</text>`;
};
const SHIELD_PATH = 'M12 1.8l8.6 3v6.4c0 5.6-3.6 9.6-8.6 11.2C7 20.8 3.4 16.8 3.4 11.2V4.8Z';
const shield = (cx, cy, s) => `<g transform="translate(${f(cx - s / 2)} ${f(cy - s / 2)}) scale(${f(s / 24)})"><path d="${SHIELD_PATH}" fill="#c0434a" stroke="${GOLD_L}" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 6.4v11M7.6 10.6h8.8" stroke="${GOLD_L}" stroke-width="2" stroke-linecap="round"/></g>`;
const sciMark = (k, cx, cy, s) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.48)}" fill="#fbf7ea" stroke="#d6c286" stroke-width="${f(s * 0.06)}"/>${glyph(SCI[k].icon, cx - s * 0.31, cy - s * 0.31, s * 0.62, '#1f4d33', 2.1)}`;
const chainBadge = (key, cx, cy, s) => `<rect x="${f(cx - s * 0.35)}" y="${f(cy - s * 0.35)}" width="${f(s * 0.7)}" height="${f(s * 0.7)}" rx="${f(s * 0.07)}" transform="rotate(45 ${f(cx)} ${f(cy)})" fill="#fffaf0" stroke="${GOLD}" stroke-width="${f(s * 0.07)}"/>${glyph(CHAIN[key].icon, cx - s * 0.26, cy - s * 0.26, s * 0.52, INK, 2.3)}`;
const cardGlyph = (type, cx, cy, h) => `<rect x="${f(cx - h * 0.36)}" y="${f(cy - h / 2)}" width="${f(h * 0.72)}" height="${f(h)}" rx="${f(h * 0.12)}" fill="#fffaf0" stroke="#fffaf0" stroke-width="${f(h * 0.16)}"/><rect x="${f(cx - h * 0.36)}" y="${f(cy - h / 2)}" width="${f(h * 0.72)}" height="${f(h)}" rx="${f(h * 0.12)}" fill="${TYPE[type].color}" stroke="${NIGHT}" stroke-opacity=".55" stroke-width="${f(h * 0.05)}"/>`;
const WONDER_PATH = 'M4.5 21.5V12.8l3.2-1.9V8.6h2.1V7.1c0-1.3 1-2.4 2.2-2.6V2.5h.8v2c1.2.2 2.2 1.3 2.2 2.6v1.5h2.1v2.3l3.2 1.9v8.7h-4.6v-3.6a2.7 2.7 0 0 0-5.4 0v3.6Z';
const wonderGlyph = (cx, cy, s) => `<g transform="translate(${f(cx - s / 2)} ${f(cy - s / 2)}) scale(${f(s / 24)})"><path d="${WONDER_PATH}" fill="${GOLD}" stroke="#fffaf0" stroke-width="1.1" stroke-linejoin="round"/></g>`;
const dark = (cx, cy, s, inner) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s / 2)}" fill="${NIGHT}" stroke="${GOLD_L}" stroke-width="${f(s * 0.05)}"/>${inner}`;
const againMark = (cx, cy, s) => dark(cx, cy, s, glyph('rotate-cw', cx - s * 0.3, cy - s * 0.3, s * 0.6, GOLD_L, 2.6));
const tokenMark = (cx, cy, s) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s / 2)}" fill="#2f6b45" stroke="${GOLD_L}" stroke-width="${f(s * 0.07)}"/>${glyph('sparkles', cx - s * 0.29, cy - s * 0.29, s * 0.58, '#fffaf0', 2.1)}`;
const discardMark = (cx, cy, s) => dark(cx, cy, s, glyph('layers', cx - s * 0.29, cy - s * 0.29, s * 0.58, GOLD_L, 2.2));
const ruinMark = (type, cx, cy, s) => `${cardGlyph(type, cx, cy, s * 0.92)}<path d="M${f(cx - s * 0.3)} ${f(cy - s * 0.3)}L${f(cx + s * 0.3)} ${f(cy + s * 0.3)}M${f(cx + s * 0.3)} ${f(cy - s * 0.3)}L${f(cx - s * 0.3)} ${f(cy + s * 0.3)}" stroke="#fffaf0" stroke-width="${f(s * 0.16)}" stroke-linecap="round"/><path d="M${f(cx - s * 0.3)} ${f(cy - s * 0.3)}L${f(cx + s * 0.3)} ${f(cy + s * 0.3)}M${f(cx + s * 0.3)} ${f(cy - s * 0.3)}L${f(cx - s * 0.3)} ${f(cy + s * 0.3)}" stroke="#c0262f" stroke-width="${f(s * 0.09)}" stroke-linecap="round"/>`;
const slash = (cx, cy, s, color = '#fffaf0') => `<path d="M${f(cx + s * 0.16)} ${f(cy - s * 0.3)}L${f(cx - s * 0.16)} ${f(cy + s * 0.3)}" stroke="${color}" stroke-width="${f(s * 0.09)}" stroke-linecap="round"/>`;
const eqMark = (cx, cy, s, color = '#fffaf0') => `<path d="M${f(cx - s * 0.2)} ${f(cy - s * 0.1)}h${f(s * 0.4)}M${f(cx - s * 0.2)} ${f(cy + s * 0.1)}h${f(s * 0.4)}" stroke="${color}" stroke-width="${f(s * 0.08)}" stroke-linecap="round"/>`;

/** An effect as a row of items { w, draw(x, cy) }, laid out centred in [x0, x1] at height cy (scaled down when too wide). */
const items = (eff, s, { onBand = true } = {}) => {
  const it = [], add = (w, draw) => it.push({ w, draw });
  const ink = onBand ? '#fffaf0' : INK;
  const res = k => add(s * 0.84, (x, cy) => resChip(k, x, cy - s * 0.42, s * 0.84));
  if (eff.prod) [...eff.prod].forEach(res);
  if (eff.one) [...eff.one].forEach((k, i) => { if (i) add(s * 0.38, (x, cy) => slash(x + s * 0.19, cy, s * 0.8, ink)); add(s * 0.7, (x, cy) => resChip(k, x, cy - s * 0.35, s * 0.7)); });
  if (eff.shields) for (let i = 0; i < eff.shields; i++) add(s * 0.9, (x, cy) => shield(x + s * 0.45, cy, s * 0.9));
  if (eff.sci) add(s * 1.06, (x, cy) => sciMark(eff.sci, x + s * 0.53, cy, s * 1.06));
  if (eff.trade) { [...eff.trade].forEach(res); add(s * 0.42, (x, cy) => eqMark(x + s * 0.21, cy, s, ink)); add(s * 0.72, (x, cy) => coin(1, x + s * 0.36, cy, s * 0.72)); }
  if (eff.token) add(s * 0.92, (x, cy) => tokenMark(x + s * 0.46, cy, s * 0.92));
  if (eff.discard) add(s * 0.92, (x, cy) => discardMark(x + s * 0.46, cy, s * 0.92));
  if (eff.ruin) add(s * 0.82, (x, cy) => ruinMark(eff.ruin, x + s * 0.41, cy, s * 0.82));
  if (eff.per) {
    add(s * 0.86, (x, cy) => coin(eff.coins, x + s * 0.43, cy, s * 0.86));
    add(s * 0.3, (x, cy) => slash(x + s * 0.15, cy, s * 0.7, ink));
    add(s * 0.66, (x, cy) => (eff.per === 'wonder' ? wonderGlyph(x + s * 0.33, cy, s * 0.72) : cardGlyph(eff.per, x + s * 0.33, cy, s * 0.66)));
  } else if (eff.coins) add(s * 0.9, (x, cy) => coin(eff.coins, x + s * 0.45, cy, s * 0.9));
  if (eff.steal) add(s * 0.9, (x, cy) => coin(`−${eff.steal}`, x + s * 0.45, cy, s * 0.9, { neg: true }));
  if (eff.guild) {
    const g = eff.guild;
    if (g !== 'wonder' && g !== 'coins') add(s * 0.8, (x, cy) => coin(1, x + s * 0.4, cy, s * 0.8));
    add(s * 0.9, (x, cy) => wreath(g === 'wonder' ? 2 : 1, x + s * 0.45, cy, s * 0.9));
    add(s * 0.3, (x, cy) => slash(x + s * 0.15, cy, s * 0.7, ink));
    if (g === 'wonder') add(s * 0.7, (x, cy) => wonderGlyph(x + s * 0.35, cy, s * 0.76));
    else if (g === 'coins') add(s * 0.76, (x, cy) => coin(3, x + s * 0.38, cy, s * 0.76));
    else if (g === 'brownGrey') { add(s * 0.5, (x, cy) => cardGlyph('brown', x + s * 0.25, cy, s * 0.62)); add(s * 0.5, (x, cy) => cardGlyph('grey', x + s * 0.25, cy, s * 0.62)); }
    else add(s * 0.5, (x, cy) => cardGlyph(g, x + s * 0.25, cy, s * 0.62));
  }
  if (eff.again) add(s * 0.86, (x, cy) => againMark(x + s * 0.43, cy, s * 0.86));
  if (eff.vp) add(s * 1.0, (x, cy) => wreath(eff.vp, x + s * 0.5, cy, s));
  return it;
};
const layout = (list, x0, x1, cy, gap) => {
  const total = list.reduce((a, b) => a + b.w, 0) + gap * (list.length - 1);
  const k = Math.min(1, (x1 - x0) / total);
  let x = (x0 + x1) / 2 - (total * k) / 2, out = '';
  for (const i of list) { out += k < 1 ? `<g transform="translate(${f(x)} ${f(cy)}) scale(${f(k)}) translate(${f(-x)} ${f(-cy)})">${i.draw(x, cy)}</g>` : i.draw(x, cy); x += (i.w + gap) * k; }
  return out;
};
/** A cost: coins first (one coin with the sum), then resources in the order written. */
const costList = cost => {
  const coins = (cost.match(/\d+/) ?? [])[0];
  return [...(coins ? [{ coin: coins }] : []), ...[...cost.replace(/\d+/g, '')].map(k => ({ res: k }))];
};
const costColumn = (cd, x, y, s, step) => {
  let out = '', yy = y;
  if (cd.from) { out += chainBadge(cd.from, x + s / 2, yy + s / 2, s * 1.08); yy += step + 0.6; }
  for (const c of costList(cd.cost)) {
    out += c.coin ? coin(c.coin, x + s / 2, yy + s / 2, s) : resChip(c.res, x, yy, s);
    yy += step;
  }
  return { svg: out, bottom: yy };
};

// ---------- the effect in words (for the line under the name) ----------
const nTimes = n => (n === 1 ? '1 ფარი' : `${n} ფარი`);
const effText = cd => {
  const e = cd.eff;
  if (e.prod) return `ყოველ სვლაზე: ${e.prod.length} ${RES[e.prod[0]].name}`;
  if (e.one) return `ყოველ სვლაზე ერთი: ${[...e.one].map(k => RES[k].name).join(' ან ')}`;
  if (e.shields) return `${nTimes(e.shields)}: მხედარი ${e.shields} უჯრით მეტოქისკენ`;
  if (e.sci) return `სიბრძნე: ${SCI[e.sci].name}${e.vp ? ` · ${e.vp} ქულა` : ''}`;
  if (e.trade) return `${[...e.trade].map(k => RES[k].acc).join(' და ')} ბანკიდან 1 თეთრად ყიდულობ`;
  if (e.per) {
    const what = e.per === 'wonder' ? 'შენს ყოველ ძეგლზე' : `შენს ყოველ ${TYPE[e.per].adj} ბარათზე${e.per === 'yellow' ? ' (ამასაც)' : ''}`;
    return `ახლავე ${e.coins} თეთრი ${what} · ${e.vp} ქულა`;
  }
  if (e.coins) return `ახლავე ${e.coins} თეთრი ბანკიდან`;
  if (e.vp) return `${e.vp} დიდების ქულა`;
  if (e.guild) return {
    yellow: 'სამეფოში, სადაც ყვითელი მეტია: ყოველ ყვითელზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    brownGrey: 'სადაც ყავისფერი და ნაცრისფერი ერთად მეტია: თითოზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    blue: 'სამეფოში, სადაც ლურჯი მეტია: ყოველ ლურჯზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    green: 'სამეფოში, სადაც მწვანე მეტია: ყოველ მწვანეზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    red: 'სამეფოში, სადაც წითელი მეტია: ყოველ წითელზე 1 თეთრი ახლა და 1 ქულა ბოლოს',
    wonder: 'სამეფოში, სადაც ძეგლი მეტია: ყოველ ძეგლზე 2 ქულა ბოლოს',
    coins: 'უფრო მდიდარ სამეფოში: ყოველ 3 თეთრზე 1 ქულა ბოლოს',
  }[e.guild];
  return '';
};

// ---------- one age card, 63×88 mm ----------
const FI = 2.2, BAND = 21, COLW = 11;
const AGE_MARK = ['', aso('ა'), aso('ბ'), aso('გ')];
const ART_Y = 40;
const divider = (y, color) => `<path d="M14 ${y}H28M35 ${y}H49" stroke="${color}" stroke-opacity=".55" stroke-width=".3"/><rect x="30.1" y="${f(y - 1.4)}" width="2.8" height="2.8" transform="rotate(45 31.5 ${y})" fill="${color}" fill-opacity=".7"/>`;
const card = cd => {
  const T = TYPE[cd.t], x0 = FI + COLW, x1 = 63 - FI;
  const cost = costColumn(cd, FI + 1.5, FI + 1.6, 8, 8.9);
  const colBottom = Math.max(FI + BAND, cost.bottom + 0.4);
  const effX1 = cd.to ? x1 - 10.6 : x1 - 1.2;
  const pic = cd.t === 'green' ? null : cd.pic;
  const art = pic
    ? `<circle cx="37" cy="${ART_Y}" r="13" fill="${T.color}" fill-opacity=".08" stroke="${T.color}" stroke-opacity=".45" stroke-width=".45"/>
<circle cx="37" cy="${ART_Y}" r="11.3" fill="none" stroke="${T.color}" stroke-opacity=".3" stroke-width=".3" stroke-dasharray=".6 .9"/>${glyph(pic, 37 - 7.5, ART_Y - 7.5, 15, T.color, 1.6)}`
    : `<circle cx="37" cy="${ART_Y}" r="13" fill="${T.color}" fill-opacity=".08" stroke="${T.color}" stroke-opacity=".45" stroke-width=".45"/>${sciMark(cd.eff.sci, 37, ART_Y, 20)}`;
  return `<div class="card tk"><svg class="bg" width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa">
<rect width="63" height="88" fill="${PAPER}"/>
<path d="M${x0} ${FI}H${f(x1 - 2.4)}A2.4 2.4 0 0 1 ${x1} ${FI + 2.4}V${FI + BAND}H${x0}Z" fill="${T.color}"/>
<path d="M${FI} ${FI + 2.4}A2.4 2.4 0 0 1 ${FI + 2.4} ${FI}H${x0}V${f(colBottom)}H${FI}Z" fill="#fffaf0" stroke="${T.color}" stroke-width=".35"/>
<rect x="${FI}" y="${FI}" width="${63 - 2 * FI}" height="${88 - 2 * FI}" rx="2.4" fill="none" stroke="${T.color}" stroke-width=".8"/>
${cost.svg}
${layout(items(cd.eff, 13), x0 + 1.2, effX1, FI + BAND / 2, 1.4)}
${cd.to ? chainBadge(cd.to, x1 - 5.6, FI + BAND / 2, 9.8) : ''}
${art}
${divider(64.2, T.color)}
<circle cx="31.5" cy="${88 - FI}" r="2.9" fill="${T.color}" stroke="${PAPER}" stroke-width=".5"/><text x="31.5" y="${f(88 - FI + 1.15)}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3.1" fill="#fffaf0">${AGE_MARK[cd.age]}</text>
</svg><div class="tkName fit"><span>${esc(cd.n)}</span></div><div class="tkText">${esc(cd.text ?? effText(cd))}</div></div>`;
};

// ---------- backs: every back has the same dark edge, so a cut a little off never tells one deck from another ----------
const AGES = {
  1: { bg: '#857a6a', fg: '#efe6d4', era: 'მოქცევაჲ ქართლისაჲ', when: 'IV ს.', roman: 'I' },
  2: { bg: '#7a2028', fg: '#ebcb7f', era: 'ოქროს ხანა', when: 'XI–XIII სს.', roman: 'II' },
  3: { bg: '#a67a24', fg: '#fdf2d6', era: 'აღორძინება', when: 'XVIII–XIX სს.', roman: 'III' },
};
const rosettes = (x0, y0, w, h, fg, op, cell = 8) => {
  let out = '';
  for (let y = y0; y <= y0 + h + 0.01; y += cell) for (let x = x0; x <= x0 + w + 0.01; x += cell) {
    const cx = x + cell / 2, cy = y + cell / 2;
    if (cx < x0 + w && cy < y0 + h) out += `<path d="M${f(cx - cell * 0.22)} ${f(cy)}Q${f(cx)} ${f(cy - cell * 0.12)} ${f(cx + cell * 0.22)} ${f(cy)}Q${f(cx)} ${f(cy + cell * 0.12)} ${f(cx - cell * 0.22)} ${f(cy)}ZM${f(cx)} ${f(cy - cell * 0.22)}Q${f(cx + cell * 0.12)} ${f(cy)} ${f(cx)} ${f(cy + cell * 0.22)}Q${f(cx - cell * 0.12)} ${f(cy)} ${f(cx)} ${f(cy - cell * 0.22)}Z"/>`;
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(cell * 0.07)}"/>`;
  }
  return `<g fill="${fg}" fill-opacity="${op}">${out}</g>`;
};
const ageBack = age => {
  const A = AGES[age];
  return `<div class="card"><svg width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa" style="display:block">
<rect width="63" height="88" fill="${NIGHT}"/><rect x="2.6" y="2.6" width="57.8" height="82.8" rx="2.2" fill="${A.bg}"/>
${rosettes(2.6, 2.6, 57.8, 82.8, A.fg, 0.2)}
<rect x="4.6" y="4.6" width="53.8" height="78.8" rx="1.6" fill="none" stroke="${A.fg}" stroke-width=".45" opacity=".85"/>
<text x="31.5" y="14.2" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3.6" letter-spacing=".5" fill="${A.fg}">${aso(title)}</text>
<circle cx="31.5" cy="42" r="15.6" fill="${NIGHT}" fill-opacity=".3" stroke="${A.fg}" stroke-width=".6"/><circle cx="31.5" cy="42" r="13.4" fill="none" stroke="${A.fg}" stroke-width=".28" stroke-dasharray=".7 .9"/>
<text x="31.5" y="49" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="19" fill="${A.fg}">${AGE_MARK[age]}</text>
<text x="31.5" y="67" text-anchor="middle" font-weight="800" font-size="4.3" fill="${A.fg}">${esc(A.era)}</text>
<text x="31.5" y="72.6" text-anchor="middle" font-size="3.4" fill="${A.fg}" opacity=".9">${A.roman} ეპოქა · ${esc(A.when)}</text>
</svg></div>`;
};
const helpBack = `<div class="card"><svg width="63mm" height="88mm" viewBox="0 0 63 88" font-family="SerifKa" style="display:block">
<rect width="63" height="88" fill="${NIGHT}"/>${rosettes(2.6, 2.6, 57.8, 82.8, GOLD, 0.14)}
<rect x="4.6" y="4.6" width="53.8" height="78.8" rx="1.6" fill="none" stroke="${GOLD}" stroke-width=".45"/>
<text x="31.5" y="14.2" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3.6" letter-spacing=".5" fill="${GOLD}">${aso(title)}</text>
<circle cx="31.5" cy="42" r="13" fill="none" stroke="${GOLD}" stroke-width=".5"/>${glyph('crown', 22.5, 33, 18, GOLD, 1.5)}
<text x="31.5" y="67" text-anchor="middle" font-weight="800" font-size="4.3" fill="${GOLD_L}">დამხმარე ბარათი</text>
<text x="31.5" y="72.6" text-anchor="middle" font-size="3.3" fill="${GOLD_L}" opacity=".8">ეპოქის დასტაში არ ერევა</text></svg></div>`;

// ---------- help cards for the spare places: the two thrones, the turn, the three victories, the three layouts ----------
const helpCard = (head, body, { color = NIGHT } = {}) => `<div class="card tk hc"><svg class="bg" width="63mm" height="88mm" viewBox="0 0 63 88">
<rect width="63" height="88" fill="${PAPER}"/><path d="M${FI} ${FI + 2.4}A2.4 2.4 0 0 1 ${FI + 2.4} ${FI}H${f(63 - FI - 2.4)}A2.4 2.4 0 0 1 ${63 - FI} ${FI + 2.4}V${FI + 11}H${FI}Z" fill="${color}"/>
<rect x="${FI}" y="${FI}" width="${63 - 2 * FI}" height="${88 - 2 * FI}" rx="2.4" fill="none" stroke="${color}" stroke-width=".8"/></svg>
<div class="hcHead">${head}</div><div class="hcBody">${body}</div></div>`;
const throne = (side) => {
  const W = side === 'west';
  const medal = `<svg width="26mm" height="26mm" viewBox="-13 -13 26 26" style="display:block;margin:0 auto"><circle r="12.4" fill="${C.wine}" stroke="${GOLD}" stroke-width=".7"/><circle r="10.6" fill="none" stroke="${GOLD_L}" stroke-width=".3" stroke-dasharray=".7 .9"/>
<text y="5.6" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="15.5" fill="${GOLD_L}">${aso(W ? 'ქ' : 'თ')}</text></svg>`;
  return helpCard(`<b>${W ? 'დასავლეთის ტახტი' : 'აღმოსავლეთის ტახტი'}</b>`, `${medal}
<p class="hcCap">${W ? 'ეგრისი · აფხაზთა სამეფო · იმერეთი' : 'ქართლი · კახეთი'}</p>
<p>დედაქალაქი — <b>${W ? 'ქუთაისი' : 'თბილისი'}</b>, „ლიხის გზის“ ${W ? 'მარცხენა' : 'მარჯვენა'} ბოლოში. დაფის ეს ბოლო შენკენ დადე.</p>
<p>შენი ფარები მხედარს <b>${W ? 'თბილისისკენ — მარჯვნივ' : 'ქუთაისისკენ — მარცხნივ'}</b> წევს.</p>`, { color: C.wine });
};
const turnCard = helpCard('<b>სვლა</b>', `<p>აიღე <b>თავისუფალი</b> ბარათი — ზემოდან რომ არაფერი ადევს — და:</p>
<p><b>ა) ააშენე:</b> ფასი გადაიხადე, ბარათი შენს სამეფოში დადე.</p>
<p><b>ბ) გადააგდე:</b> 2 თეთრი + 1 შენს ყოველ ყვითელზე.</p>
<p><b>გ) ძეგლი ააშენე:</b> ძეგლის ფასი გადაიხადე, ბარათი ძეგლს ქვეშ შეუდე.</p>
<p class="hcRule">რესურსის ყიდვა: <b>2 თეთრი + იმდენი</b>, რამდენ ასეთს მეტოქის ყავისფერი და ნაცრისფერი ბარათები აწარმოებს.</p>`);
const winsCard = (() => {
  const row = (svg, t) => `<div class="hcWin"><svg width="11mm" height="11mm" viewBox="0 0 11 11" style="flex:none">${svg}</svg><p>${t}</p></div>`;
  return helpCard('<b>სამი გამარჯვება</b>', `${row(`<circle cx="5.5" cy="5.5" r="5.3" fill="${C.wine}"/>${glyph('knight', 1.6, 1.4, 7.8, GOLD_L)}`, '<b>გაერთიანება.</b> მხედარი მეტოქის დედაქალაქში შევიდა — მაშინვე იგებ.')}
${row(sciMark('ruka', 5.5, 5.5, 10.6), '<b>გელათის აკადემია.</b> 6 სხვადასხვა სიბრძნე — მაშინვე იგებ.')}
${row(wreath('?', 5.5, 5.5, 10.6), '<b>დიდება.</b> III ეპოქის ბოლოს მეტი ქულა იგებს; თანაბრობისას — ვისაც ლურჯი ბარათებიდან მეტი აქვს.')}`);
})();
// The three layouts (rows from the top; down = face down). Age III's fourth row has only its two outer places.
const ROWS = {
  1: [[2, 1], [3, 0], [4, 1], [5, 0], [6, 1]],
  2: [[6, 1], [5, 0], [4, 1], [3, 0], [2, 1]],
  3: [[2, 1], [3, 0], [4, 1], [-2, 0], [4, 1], [3, 0], [2, 1]],
};
const pyramid = (age, width) => {
  const rows = ROWS[age], A = AGES[age];
  const cw = 6, ch = 8.4, dy = 4.2, wMax = 6 * cw + 5 * 0.6;
  const H = (rows.length - 1) * dy + ch;
  let out = '';
  rows.forEach(([n, up], r) => {
    const places = n === -2 ? [-1, 1] : Array.from({ length: n }, (_, i) => i - (n - 1) / 2);
    for (const p of places) {
      const x = wMax / 2 + p * (cw + 0.6) - cw / 2, y = r * dy;
      out += up ? `<rect x="${f(x)}" y="${f(y)}" width="${cw}" height="${ch}" rx=".7" fill="#fffaf0" stroke="${INK}" stroke-width=".3"/><rect x="${f(x + 0.6)}" y="${f(y + 0.6)}" width="${cw - 1.2}" height="2.2" rx=".3" fill="${A.bg}" opacity=".55"/>`
        : `<rect x="${f(x)}" y="${f(y)}" width="${cw}" height="${ch}" rx=".7" fill="${A.bg}" stroke="${NIGHT}" stroke-width=".3"/><circle cx="${f(x + cw / 2)}" cy="${f(y + ch / 2)}" r="1.3" fill="none" stroke="${A.fg}" stroke-width=".3"/>`;
    }
  });
  return `<svg width="${width}mm" height="${f((width * H) / wMax)}mm" viewBox="0 0 ${f(wMax)} ${f(H)}" style="display:block;margin:0 auto">${out}</svg>`;
};
const layoutCard = age => helpCard(`<b>${AGES[age].roman} ეპოქა — განლაგება</b>`, `${pyramid(age, age === 3 ? 33 : 44)}
<p class="hcCap">${esc(AGES[age].era)} · ${esc(AGES[age].when)}</p>
<p>${age === 3 ? '17 ბარათს 3 ამქარი შეურიე — 20 ბარათი.' : '23 ბარათიდან 3 უნახავად ყუთში — 20 ბარათი.'} თეთრი — პირაღმა, ფერადი — პირქვე. ქვედა რიგი ზედას ნახევრად ფარავს.</p>`, { color: AGES[age].bg });

// ---------- the twelve monuments, 100×65 mm ----------
const wonderCard = w => {
  const cost = costColumn({ cost: w.cost }, FI + 1.5, FI + 1.4, 8, 8.75);
  const x0 = FI + COLW, band = 13.6;
  return `<div class="won"><svg class="bg" width="100mm" height="65mm" viewBox="0 0 100 65">
<rect width="100" height="65" fill="${PAPER}"/>
<path d="M${x0} ${FI}H${f(100 - FI - 2.4)}A2.4 2.4 0 0 1 ${100 - FI} ${FI + 2.4}V${FI + band}H${x0}Z" fill="#6b4a1c"/>
<path d="M${FI} ${FI + 2.4}A2.4 2.4 0 0 1 ${FI + 2.4} ${FI}H${x0}V${f(65 - FI)}H${f(FI + 2.4)}A2.4 2.4 0 0 1 ${FI} ${f(65 - FI - 2.4)}Z" fill="#fffaf0" stroke="${GOLD}" stroke-width=".35"/>
<rect x="${x0}" y="49.2" width="${f(100 - FI - x0)}" height="${f(65 - FI - 49.2)}" fill="#efe2c2"/><path d="M${x0} 49.2H${100 - FI}" stroke="${GOLD}" stroke-width=".4"/>
<rect x="${FI}" y="${FI}" width="${100 - 2 * FI}" height="${65 - 2 * FI}" rx="2.4" fill="none" stroke="${GOLD}" stroke-width=".9"/>
${cost.svg}
${layout(items(w.eff, 10.4), 58.5, 100 - FI - 1.6, FI + band / 2, 1.1)}
<circle cx="29.5" cy="32.2" r="13.4" fill="${GOLD}" fill-opacity=".14" stroke="${GOLD}" stroke-width=".55"/><circle cx="29.5" cy="32.2" r="11.6" fill="none" stroke="${GOLD_D}" stroke-opacity=".6" stroke-width=".3" stroke-dasharray=".7 .9"/>
<text x="29.5" y="38.2" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="16" fill="${GOLD_D}">${aso(w.n[0])}</text>
</svg><div class="wnName fit"><span>${esc(w.n)}</span></div><div class="wnText">${esc(w.text)}</div><div class="wnHist">${esc(w.hist)}</div></div>`;
};
const wonderBack = `<div class="won"><svg width="100mm" height="65mm" viewBox="0 0 100 65" font-family="SerifKa" style="display:block">
<rect width="100" height="65" fill="${NIGHT}"/><rect x="2.6" y="2.6" width="94.8" height="59.8" rx="2.2" fill="#4a3518"/>${rosettes(2.6, 2.6, 94.8, 59.8, GOLD, 0.2, 9)}
<rect x="4.6" y="4.6" width="90.8" height="55.8" rx="1.6" fill="none" stroke="${GOLD}" stroke-width=".45"/>
<circle cx="50" cy="29" r="12.5" fill="${NIGHT}" fill-opacity=".4" stroke="${GOLD}" stroke-width=".55"/>${wonderGlyph(50, 28.6, 15)}
<text x="50" y="51" text-anchor="middle" font-weight="800" font-size="4.6" fill="${GOLD_L}">ძეგლი</text>
<text x="50" y="56.4" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3" letter-spacing=".5" fill="${GOLD}">${aso(title)}</text></svg></div>`;
/** Short cut marks just outside a grid of pieces (xs, ys = the cut lines). */
const marks = (xs, ys, len = 5) => `<svg viewBox="0 0 210 297" width="210mm" height="297mm" style="position:absolute;left:0;top:0" stroke="#777" stroke-width=".2">
${xs.map(x => `<line x1="${x}" y1="${f(ys[0] - 1 - len)}" x2="${x}" y2="${f(ys[0] - 1)}"/><line x1="${x}" y1="${f(ys[ys.length - 1] + 1)}" x2="${x}" y2="${f(ys[ys.length - 1] + 1 + len)}"/>`).join('')}
${ys.map(y => `<line x1="${f(xs[0] - 1 - len)}" y1="${y}" x2="${f(xs[0] - 1)}" y2="${y}"/><line x1="${f(xs[xs.length - 1] + 1)}" y1="${y}" x2="${f(xs[xs.length - 1] + 1 + len)}" y2="${y}"/>`).join('')}</svg>`;
const WK = 0.96, WW = 96, WH = 62.4, WX = 9, WY = 20;
const scaled = html => `<div style="width:100mm;height:65mm;transform:scale(${WK});transform-origin:0 0">${html}</div>`;
const wonderPieces = (list, back) => list.map((w, i) => ({ x: WX + (i % 2) * WW, y: WY + Math.floor(i / 2) * WH, w: WW, h: WH, html: scaled(back ? wonderBack : wonderCard(w)) }));
const wonderMarks = n => marks([WX, WX + WW, WX + 2 * WW], Array.from({ length: Math.ceil(n / 2) + 1 }, (_, r) => f(WY + r * WH)));

// ---------- tokens of knowledge ⌀35, coins ⌀25, tribute 35×22, the rider ----------
const TOKEN_LINES = {
  'ვენახი': ['ვენახი'], 'არსუკისძის სკოლა': ['არსუკისძის', 'სკოლა'], 'აბრეშუმის გზა': ['აბრეშუმის', 'გზა'],
  'სამართლის წიგნი': ['სამართლის', 'წიგნი'], 'ქვისმთლელები': ['ქვისმთლელები'], 'სიტყვის კონა': ['სიტყვის', 'კონა'],
  'ვეფხისტყაოსანი': ['ვეფხისტყაოსანი'], 'დიდგორის გეგმა': ['დიდგორის', 'გეგმა'], 'ათონელთა სკოლა': ['ათონელთა', 'სკოლა'], 'ქალაქის გეგმა': ['ქალაქის', 'გეგმა'],
};
const SHORT = ['+6 თეთრი|4 ქულა', 'ძეგლი 2|რესურსით იაფია', 'მეტოქის ყიდვის|თეთრი შენია', 'სიბრძნის|მე-7 ნიშანი', 'ლურჯი 2|რესურსით იაფია',
  '3 ქულა ყოველ|ნიშანზე', 'ბოლოს|7 ქულა', 'ახალ წითელს|+1 ფარი', 'ყოველი ძეგლი —|კიდევ სვლა', '+6 თეთრი; ნიშნით|აშენებაზე +4'];
const tokenFront = (t, i) => {
  const name = TOKEN_LINES[t.n], short = SHORT[i].split('|');
  const ny = name.length > 1 ? [-1.2, 2.5] : [0.9];
  const law = t.icon === 'scale';
  return `<svg width="36.6mm" height="36.6mm" viewBox="-18.3 -18.3 36.6 36.6" font-family="SerifKa" style="display:block;overflow:visible">
<circle r="18.3" fill="#2f6b45"/><circle r="15.9" fill="#fbf7ea" stroke="${GOLD}" stroke-width=".55"/>
${law ? sciMark('samartali', 0, -9.2, 9.4) : glyph(t.icon, -4.4, -13.6, 8.8, '#2f6b45', 1.9)}
${name.map((l, k) => `<text y="${ny[k]}" text-anchor="middle" font-weight="800" font-size="${l.length > 11 ? 2.9 : 3.3}" fill="${INK}">${esc(l)}</text>`).join('')}
${short.map((l, k) => `<text y="${f(7.4 + k * 3)}" text-anchor="middle" font-size="2.55" fill="#2f5a3c">${esc(l)}</text>`).join('')}</svg>`;
};
const tokenBack = `<svg width="36.6mm" height="36.6mm" viewBox="-18.3 -18.3 36.6 36.6" style="display:block;overflow:visible">
<circle r="18.3" fill="#1f4e6e"/><circle r="15.2" fill="#2f6b45" stroke="${GOLD}" stroke-width=".5"/><circle r="11.6" fill="#1d7a8c" stroke="${GOLD}" stroke-width=".5"/>
${Array.from({ length: 16 }, (_, k) => { const a = (k * Math.PI) / 8; return `<circle cx="${f(13.4 * Math.cos(a))}" cy="${f(13.4 * Math.sin(a))}" r=".75" fill="${GOLD_L}"/>`; }).join('')}
${[0, 90, 180, 270].map(a => `<path d="M0 -1.5L-2.6 -9.4A3.2 1.4 0 0 1 2.6 -9.4Z" fill="${GOLD_L}" transform="rotate(${a})"/>`).join('')}<circle r="2" fill="${GOLD_L}"/></svg>`;
const COIN_LOOK = { 1: ['#8d949c', '#d9dde2', '#2f3338'], 3: ['#5a151c', '#8e2430', '#f3d98c'], 6: ['#a37a2c', '#dcae49', '#4a3010'] };
const coinPiece = v => {
  const [rim, face, ink] = COIN_LOOK[v];
  return `<svg width="26.6mm" height="26.6mm" viewBox="-13.3 -13.3 26.6 26.6" font-family="SerifKa" style="display:block;overflow:visible">
<circle r="13.3" fill="${rim}"/><circle r="11.3" fill="${face}"/>
${Array.from({ length: 28 }, (_, k) => { const a = (k * Math.PI) / 14; return `<circle cx="${f(10.1 * Math.cos(a))}" cy="${f(10.1 * Math.sin(a))}" r=".42" fill="${ink}" fill-opacity=".45"/>`; }).join('')}
<text y="-4.4" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="3.4" fill="${ink}" fill-opacity=".8">${aso('თ')}</text>
<text y="5.6" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="12" fill="${ink}">${v}</text>
<text y="8.9" text-anchor="middle" font-size="2.5" fill="${ink}" fill-opacity=".85">თეთრი</text></svg>`;
};
const tribute = n => `<svg width="36.6mm" height="23.6mm" viewBox="-.8 -.8 36.6 23.6" font-family="SerifKa" style="display:block;overflow:visible">
<rect x="-.8" y="-.8" width="36.6" height="23.6" fill="${C.wine}"/><rect x="1.5" y="1.5" width="32" height="19" rx="1.6" fill="none" stroke="${GOLD}" stroke-width=".45"/>
${coin(`−${n}`, 10.4, 11, 13.2, { neg: true })}
<text x="25.2" y="10" text-anchor="middle" font-weight="800" font-size="4.4" fill="${GOLD_L}">ხარკი</text>
<text x="25.2" y="15.4" text-anchor="middle" font-size="3.2" fill="#fbf0d2">−${n} თეთრი</text></svg>`;
const riderTent = `<svg width="15mm" height="52mm" viewBox="0 0 15 52" style="display:block;overflow:visible">
<rect x="-.8" y="-.8" width="16.6" height="53.6" fill="${C.wine}"/>
<g transform="rotate(180 7.5 13)">${glyph('knight', 1.5, 6.5, 12, GOLD_L)}<path d="M2.5 21.6h10" stroke="${GOLD}" stroke-width=".4"/></g>
<path d="M0 26H15" stroke="${GOLD_L}" stroke-width=".3" stroke-dasharray="1 .8"/>
${glyph('knight', 1.5, 32.5, 12, GOLD_L)}<path d="M2.5 30.4h10" stroke="${GOLD}" stroke-width=".4"/></svg>`;
const riderFlat = `<svg width="18mm" height="18mm" viewBox="-9 -9 18 18" style="display:block;overflow:visible"><circle r="9.6" fill="${C.wine}"/><circle r="7.6" fill="none" stroke="${GOLD}" stroke-width=".35"/>${glyph('knight', -5.6, -6.2, 11.2, GOLD_L)}</svg>`;
const discardMat = `<div class="mat"><b>გადაგდებული ბარათები</b><span>პირქვე, ერთ დასტად. ვარძია აქედან ირჩევს.</span></div>`;

const TOKEN_X = k => 28 + k * 38.5, COIN_X = k => 25 + k * 27.5, COIN_Y = r => 112 + r * 27.5;
const COINS = [...Array(14).fill(1), ...Array(10).fill(3), ...Array(7).fill(6), 1, 1, 3, 6];
const tokenSheet = back => placedSheet([
  ...TOKENS.map((t, i) => ({ x: TOKEN_X(i % 5) - 18.3, y: 14 + Math.floor(i / 5) * 38.5 - 0.8, w: 36.6, h: 36.6, html: back ? tokenBack : tokenFront(t, i) })),
  ...COINS.map((v, i) => ({ x: COIN_X(i % 7) - 13.3, y: COIN_Y(Math.floor(i / 7)) - 13.3, w: 26.6, h: 26.6, html: coinPiece(v) })),
  ...[2, 2, 5, 5].map((n, i) => ({ x: 12 + i * 41 - 0.8, y: 248, w: 36.6, h: 23.6, html: tribute(n) })),
  { x: 180, y: 250.5, w: 18, h: 18, html: riderFlat },
  ...(back ? [] : [{ x: 10, y: 91.6, w: 190, h: 6, html: '<div class="tokCap">თეთრი: 14 × 1 (ვერცხლი), 10 × 3 (ღვინისფერი), 7 × 6 (ოქრო) და 4 სათადარიგო. ორივე მხარე ერთნაირია.</div>' },
    { x: 10, y: 240, w: 190, h: 6, html: '<div class="tokCap">ხარკის 4 ნიშანი და ბრტყელი მხედარი (თუ დგომა არ გინდა) — დააკარი მუყაოზე და ამოჭერი.</div>' }]),
], { back, label: back ? 'ნიშნები და თეთრი — ზურგი' : 'ცოდნის ნიშნები ⌀35, თეთრი ⌀25, ხარკი, მხედარი' });

// ---------- the board „ლიხის გზა“: 362×125 mm in two pieces that meet beside the ridge ----------
const BW = 362, BH = 125, BC = 18, BX = 10, BTY = 33, BTH = 24, SEAM = 190;
const cellX = i => BX + (i + 9) * BC;
const ZONES = [[-8, -6, 10, 'კარიბჭე'], [-5, -3, 5, 'ციხე'], [-2, -1, 2, 'საზღვარი'], [1, 2, 2, 'საზღვარი'], [3, 5, 5, 'ციხე'], [6, 8, 10, 'კარიბჭე']];
const ZONE_FILL = { 2: ['#ffffff', 0.4], 5: [GOLD, 0.2], 10: [C.wine, 0.13] };
const PROGRESS_X = [96, 134, 172, 210, 248];
const boardInner = () => {
  const z = ZONES.map(([a, b, vp, name]) => {
    const x = cellX(a), w = (b - a + 1) * BC, [fill, op] = ZONE_FILL[vp], left = a < 0;
    const wx = left ? x + 9 : x + w - 9 - 0;
    return `<rect x="${x}" y="20.5" width="${w}" height="38" rx="1.6" fill="${fill}" fill-opacity="${op}"/>
${wreath(vp, left ? x + 7 : x + 7, 25.6, 8.6)}<text x="${x + 13}" y="27" font-size="3.5" font-weight="800" fill="${INK}">${name}</text>`;
  }).join('');
  const cells = Array.from({ length: 19 }, (_, k) => k - 9).map(i => {
    const x = cellX(i);
    if (Math.abs(i) === 9) {
      const W = i < 0;
      return `<rect x="${x + 0.6}" y="${BTY - 3}" width="${BC - 1.2}" height="${BTH + 6}" rx="2" fill="${C.wine}" stroke="${GOLD}" stroke-width=".5"/>
<text x="${x + BC / 2}" y="${BTY + 13.4}" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="11" fill="${GOLD_L}">${aso(W ? 'ქ' : 'თ')}</text>
<text x="${x + BC / 2}" y="${BTY + 22.6}" text-anchor="middle" font-size="2.7" font-weight="800" fill="${GOLD_L}">${W ? 'ქუთაისი' : 'თბილისი'}</text>
${glyph('crown', x + BC / 2 - 3.2, 21.4, 6.4, C.wine, 2)}`;
    }
    const mid = i === 0;
    return `<rect x="${x + 0.7}" y="${BTY}" width="${BC - 1.4}" height="${BTH}" rx="2" fill="${mid ? '#efe2c4' : '#fffaf0'}" stroke="${mid ? GOLD_D : '#8a7454'}" stroke-width="${mid ? 0.55 : 0.35}"/>
${mid ? glyph('mountain-snow', x + 3.8, BTY + 2.2, 10.4, '#8a7454', 1.6) + `<text x="${x + BC / 2}" y="${BTY + 17.2}" text-anchor="middle" font-size="2.8" font-weight="800" fill="#6b5a40">ლიხის</text><text x="${x + BC / 2}" y="${BTY + 20.8}" text-anchor="middle" font-size="2.8" font-weight="800" fill="#6b5a40">ქედი</text>` : `<text x="${x + BC / 2}" y="${BTY + 14.2}" text-anchor="middle" font-size="4" fill="#b9a888">${Math.abs(i)}</text>`}`;
  }).join('');
  const slot = (cx, n) => `<rect x="${cx - 17.5}" y="61" width="35" height="22" rx="1.6" fill="#fffaf0" fill-opacity=".55" stroke="${C.wine}" stroke-width=".35" stroke-dasharray="1.2 .9"/>
<g opacity=".4">${coin(`−${n}`, cx - 7.6, 72, 11, { neg: true })}</g><text x="${cx + 6.6}" y="71" text-anchor="middle" font-size="3.2" font-weight="800" fill="${C.wine}" fill-opacity=".7">ხარკი</text><text x="${cx + 6.6}" y="75.6" text-anchor="middle" font-size="2.7" fill="${C.wine}" fill-opacity=".7">−${n} თეთრი</text>`;
  const zoneMid = (a, b) => (cellX(a) + cellX(b) + BC) / 2;
  return `<defs><linearGradient id="lgLR" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#e2e8c9"/><stop offset=".46" stop-color="#ece9d3"/><stop offset=".54" stop-color="#f3e7cb"/><stop offset="1" stop-color="#f1dcb0"/></linearGradient></defs>
<rect x="-1" y="-1" width="${BW + 2}" height="${BH + 2}" fill="${C.wine}"/><rect x="3" y="3" width="${BW - 6}" height="${BH - 6}" rx="1.4" fill="url(#lgLR)"/>
<rect x="4" y="4" width="${BW - 8}" height="${BH - 8}" rx="1" fill="none" stroke="${GOLD}" stroke-width=".4"/>
<path d="M120 31L133 24L141 26.5L152 18L161 22L171 14L177 17.5L184 11L191 16L199 13L208 20.5L217 18L229 24L244 31Z" fill="#9c8a62" fill-opacity=".32"/>
<path d="M171 14L174 16.2L176 15.4L177 17.5ZM184 11L187.5 13.6L189.4 13.2L191 16ZM199 13L201.6 15.4L203.6 14.6L205 17.4Z" fill="#fffaf0" fill-opacity=".8"/>
<circle cx="15.5" cy="12.2" r="6" fill="${C.wine}" stroke="${GOLD}" stroke-width=".45"/><text x="15.5" y="15.4" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="8" fill="${GOLD_L}">${aso('ქ')}</text>
<text x="24" y="12" font-size="5" font-weight="800" fill="${C.wine}">დასავლეთის ტახტი</text><text x="24" y="17" font-size="3.2" fill="${INK}">ქუთაისი · ლიხთიმერეთი</text>
<circle cx="${BW - 15.5}" cy="12.2" r="6" fill="${C.wine}" stroke="${GOLD}" stroke-width=".45"/><text x="${BW - 15.5}" y="15.4" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="8" fill="${GOLD_L}">${aso('თ')}</text>
<text x="${BW - 24}" y="12" text-anchor="end" font-size="5" font-weight="800" fill="${C.wine}">აღმოსავლეთის ტახტი</text><text x="${BW - 24}" y="17" text-anchor="end" font-size="3.2" fill="${INK}">თბილისი · ლიხთამერეთი</text>
<text x="140" y="15.4" text-anchor="middle" font-size="6.4" font-weight="800" fill="${C.wine}" letter-spacing=".2">ლიხის გზა</text>
${z}${cells}
${slot(zoneMid(-8, -6), 5)}${slot(zoneMid(-5, -3), 2)}${slot(zoneMid(3, 5), 2)}${slot(zoneMid(6, 8), 5)}
<text x="186" y="73.4" text-anchor="end" font-size="3" font-weight="800" fill="${INK}">← აღმოსავლეთის ფარი</text>
<text x="194" y="73.4" font-size="3" font-weight="800" fill="${INK}">დასავლეთის ფარი →</text>
${PROGRESS_X.map(x => `<circle cx="${x}" cy="104" r="17.5" fill="#fffaf0" fill-opacity=".55" stroke="#2f6b45" stroke-width=".4" stroke-dasharray="1.2 .9"/>${glyph('sparkles', x - 4, 100, 8, '#2f6b45', 1.4).replace('<svg ', '<svg opacity=".35" ')}`).join('')}
<text x="14" y="98" font-size="4.2" font-weight="800" fill="#2f6b45">ცოდნის ნიშნები</text>
<text x="14" y="103.4" font-size="3.1" fill="${INK}">5 ნიშანი პირაღმა აქ,</text><text x="14" y="107.6" font-size="3.1" fill="${INK}">5 — უნახავად ყუთში.</text>
<text x="14" y="111.8" font-size="3.1" fill="${INK}">2 ერთნაირი სიბრძნე = 1 ნიშანი.</text>
<text x="272" y="96" font-size="3.6" font-weight="800" fill="${C.wine}">ქულა ბოლოს</text>
<text x="272" y="101.2" font-size="3" fill="${INK}">მხედარი მეტოქის მხარესაა —</text><text x="272" y="105.4" font-size="3" fill="${INK}">ზონის ქულა: 2, 5 ან 10.</text>
<text x="272" y="111" font-size="3.6" font-weight="800" fill="${C.wine}">დედაქალაქი</text><text x="272" y="116" font-size="3" fill="${INK}">მაშინვე მოგება — გაერთიანება!</text>
<text x="${SEAM - 2}" y="123.6" text-anchor="end" font-size="2.4" fill="${GOLD_L}">შეაერთე ▸</text><text x="${SEAM + 2}" y="123.6" font-size="2.4" fill="${GOLD_L}">◂ შეაერთე</text>`;
};
const boardPiece = left => {
  const x0 = left ? -1 : SEAM, x1 = left ? SEAM : BW + 1, w = x1 - x0;
  return `<svg width="${w}mm" height="${BH + 2}mm" viewBox="${x0} -1 ${w} ${BH + 2}" font-family="SerifKa" style="display:block">${boardInner()}</svg>`;
};
// on the page: the west piece (191 wide with its bleed) at x 9, the east piece (173) at x 19
const boardSheet = page(`${marks([10, 200], [14, 139], 5)}${marks([19, 191], [152, 277], 5)}
<div class="piece" style="left:9mm;top:13mm">${boardPiece(true)}</div><div class="piece" style="left:19mm;top:151mm">${boardPiece(false)}</div>
<div class="sheetLabel">ფურცელი %SHEET% · დაფა „ლიხის გზა“ — ორი ნაწილი: დააკარი მუყაოზე, ამოჭერი და ერთმანეთს „შეაერთე“-სთან მიადე</div>`, 'placed');

// ---------- two A5 help sheets (one A4, cut in half) and the scoresheets („დიდების წიგნი“, four A6 on a page) ----------
const helpFront = () => `<div class="a5"><div class="a5head"><span class="aso">${aso(title)}</span><b>სვლის დამხმარე</b></div><div class="a5cols">
<div><h4>სვლა</h4><p>აიღე <b>თავისუფალი</b> ბარათი (ზემოდან არაფერი ადევს) და:</p>
<p><b>ა) ააშენე</b> — ფასი გადაიხადე, ბარათი შენს სამეფოში დადე.<br><b>ბ) გადააგდე</b> — 2 თეთრი + 1 შენს ყოველ ყვითელზე.<br><b>გ) ძეგლი ააშენე</b> — ძეგლის ფასი; ბარათი ძეგლს ქვეშ.</p>
<h4>ფასი და ყიდვა</h4><p>თეთრი ბანკს ეძლევა, რესურსი არ იხარჯება. რაც გაკლია — ბანკიდან: <b>2 + იმდენი</b>, რამდენ ასეთს მეტოქის ყავისფერი და ნაცრისფერი აწარმოებს. საწყობი და საბაჟო — 1 თეთრად.</p>
<h4>ოსტატის ნიშანი</h4><p>ფასის სვეტში ოქროს რომბი და ასეთი რომბი შენს ბარათზე — <b>უფასოდ</b>.</p></div>
<div><h4>ლაშქარი</h4><p>ფარი = მხედარი 1 უჯრით მეტოქისკენ. ზონაში ხარკის ნიშანია — იმ მხარის მეფე 2 ან 5 თეთრს იხდის. მეტოქის დედაქალაქი — <b>მაშინვე მოგება</b>.</p>
<h4>სიბრძნე</h4><p>2 ერთნაირი — ცოდნის ნიშანი დაფიდან. 6 სხვადასხვა — <b>მაშინვე მოგება</b> (გელათის აკადემია).</p>
<h4>ეპოქის ბოლო</h4><p>ვის მხარესაც მხედარია, ის ირჩევს, ვინ იწყებს; შუაშია — ვინც ბოლო ბარათი აიღო.</p>
<h4>ქულები ბოლოს</h4><p>ლურჯი · მწვანე · ყვითელი · ამქრები · ძეგლები · ცოდნის ნიშნები · ლაშქარი (2/5/10) · ყოველ 3 თეთრზე 1. თანაბრობა — ლურჯი წყვეტს.</p></div>
</div>${victories}<div class="a5foot">${esc(title)} · ${esc(SERIES)} №${NO}</div></div>`;
const helpBackA5 = `<div class="a5"><div class="a5head"><span class="aso">${aso(title)}</span><b>ძეგლები და ცოდნის ნიშნები</b></div><div class="a5cols lists">
<div>${WONDERS.map(w => `<p><b>${esc(w.n)}</b> — ${esc(w.text)}</p>`).join('')}</div>
<div>${TOKENS.map(t => `<p><b>${esc(t.n)}</b> — ${esc(t.text)}</p>`).join('')}<p class="a5note">ძეგლი: მხოლოდ 7 აშენდება. „კიდევ სვლა“ ეპოქის ბოლოს იკარგება.</p></div>
</div><div class="a5foot">${esc(title)} · ${esc(SERIES)} №${NO}</div></div>`;
const helpSheet = back => page(`<div class="a5slot" style="top:0">${back ? helpBackA5 : helpFront()}</div><div class="a5slot" style="top:148.5mm">${back ? helpBackA5 : helpFront()}</div>
<div class="a5cut"></div><div class="sheetLabel">ფურცელი %SHEET% · დამხმარე ფურცელი A5 × 2 — შუაზე გაჭერი</div>`, 'placed');
const SCORE_ROWS = [
  ['ლურჯი ბარათები', cardGlyph('blue', 3, 3, 5.2)], ['მწვანე ბარათები', cardGlyph('green', 3, 3, 5.2)], ['ყვითელი ბარათები', cardGlyph('yellow', 3, 3, 5.2)],
  ['ამქრები', cardGlyph('guild', 3, 3, 5.2)], ['ძეგლები', wonderGlyph(3, 3, 5.6)], ['ცოდნის ნიშნები', tokenMark(3, 3, 5.4)],
  ['თეთრი: 3-ზე 1', coin('', 3, 3, 5.4)], ['ლაშქარი: 2/5/10', shield(3, 3, 5.6)],
];
const scoreSheet = `<div class="sc"><div class="scHead"><b>დიდების წიგნი</b><span class="aso">${aso(title)}</span></div>
<div class="scLine">თარიღი: ____________</div>
<table class="scT"><col><col class="n"><col class="n"><tr><th></th><th>დასავლეთი<br><small>____________</small></th><th>აღმოსავლეთი<br><small>____________</small></th></tr>
${SCORE_ROWS.map(([t, g]) => `<tr><td><svg width="6mm" height="6mm" viewBox="0 0 6 6">${g}</svg>${t}</td><td></td><td></td></tr>`).join('')}
<tr class="sum"><td>ჯამი</td><td></td><td></td></tr></table>
<div class="scEarly">ადრე მოგება: <span class="chk"></span>გაერთიანება <span class="chk"></span>აკადემია<br>გამარჯვებული: ____________</div></div>`;
const scorePage = page(`${[[0, 0], [105, 0], [0, 148.5], [105, 148.5]].map(([x, y]) => `<div class="a6slot" style="left:${x}mm;top:${y}mm">${scoreSheet}</div>`).join('')}
<div class="a6cutV"></div><div class="a6cutH"></div><div class="sheetLabel">ფურცელი %SHEET% · დიდების წიგნი — 4 ფურცელი, ზურგზეც 4</div>`, 'placed');

// ---------- the rules: four pages ----------
const RULES = [
  ['მომზადება', 'ტახტები წილით აირჩიეთ და პირისპირ დასხედით. „ლიხის გზა“ გვერდზე დადეთ: ქუთაისის ბოლო — დასავლეთის ტახტთან, თბილისისა — აღმოსავლეთისასთან. მხედარი შუა უჯრაზე დადგით, ლიხის ქედზე. ხარკის ნიშნები თავის ადგილას: −2 „ციხეში“, −5 „კარიბჭეში“, ორივე მხარეს. 10 ცოდნის ნიშანი აურიეთ: 5 პირაღმა დაფის წრეებზე, 5 უნახავად ყუთში. თითოეულს 7 თეთრი; დანარჩენი ბანკია.'],
  ['ძეგლები', '12 ძეგლი აურიეთ და 4 პირაღმა გაშალეთ. ერთი იღებს 1-ს, მეორე — 2-ს, დარჩენილს — პირველი. კიდევ 4 გაშალეთ, ახლა მეორე იწყებს. თითოეულს 4 ძეგლი აქვს, 4 ყუთში ბრუნდება. <b>პირველ პარტიაში</b> არ აირჩიოთ: ერთს — სვეტიცხოველი, ნიკორწმინდა, ბაგრატი, უშგულის კოშკები; მეორეს — შატილი, დავით გარეჯა, ხერთვისი, ნარიყალა.'],
  ['ეპოქის დასტა', 'სამივე დასტა ცალ-ცალკე აურიეთ და თითოდან 3 ბარათი უნახავად ყუთში ჩადეთ. 7 ამქრიდან 3 უნახავად III ეპოქას შეურიეთ, 4 ყუთში. I ეპოქის 20 ბარათი განლაგების ბარათით გაშალეთ: ზემოდან 2 პირაღმა, 3 პირქვე, 4 პირაღმა, 5 პირქვე, 6 პირაღმა — ყოველი რიგი ზედას ნახევრად ფარავს. ვინ იწყებს — წილით.'],
  ['სვლა', 'რიგრიგობით, ყოველ სვლაზე <b>ერთი თავისუფალი ბარათი</b> აიღეთ — რომელსაც ზემოდან არაფერი ადევს — და ერთ-ერთი გააკეთეთ: <b>ა) ააშენეთ</b> — ფასი გადაიხადეთ და ბარათი თქვენს სამეფოში ფერების მიხედვით დადეთ; <b>ბ) გადააგდეთ</b> — ბანკიდან 2 თეთრი + 1 ყოველ თქვენს ყვითელ ბარათზე, ბარათი პირქვე „გადაგდებულში“ მიდის; <b>გ) ძეგლი ააშენეთ</b> — თქვენი ძეგლის ფასი გადაიხადეთ, ბარათი პირქვე მის ქვეშ შეუდეთ. პირქვე ბარათი რომ გათავისუფლდება, მაშინვე გადმოაბრუნეთ.'],
  ['ფასი', 'ფასი ბარათის მარცხენა სვეტშია: მონეტა — თეთრი, ფერადი კვადრატი — რესურსი. ცარიელი სვეტი — უფასოა. თეთრი ბანკს ეძლევა. რესურსები არ იხარჯება: რასაც თქვენი ყავისფერი და ნაცრისფერი ბარათები აწარმოებს, ყოველ სვლაზე ისევ თქვენია.'],
  ['ყიდვა ბანკიდან', 'რაც გაკლიათ, ბანკიდან იყიდეთ. ერთი ცალი ღირს <b>2 თეთრი + იმდენი</b>, რამდენ ასეთ რესურსს აწარმოებს მეტოქის ყავისფერი და ნაცრისფერი ბარათები (მისი ყვითელი ბარათები და ძეგლები არ ითვლება). საწყობები და საბაჟო ამ ფასს 1 თეთრად აქცევს.'],
  ['ოსტატის ნიშანი', 'ზოგ ბარათს ზედა მარჯვენა კუთხეში ოქროს რომბი აქვს — ოსტატის ნიშანი. თუ ახალი ბარათის ფასის სვეტის თავში <b>იგივე ნიშანია</b> და ასეთი ბარათი უკვე გაქვთ, ახალი უფასოდ შენდება.'],
  ['ლაშქარი', 'ყოველი ფარი მხედარს 1 უჯრით მეტოქის დედაქალაქისკენ წევს. როცა მხედარი ზონაში შედის, სადაც ხარკის ნიშანი დევს, იმ მხარის მეფე ბანკს 2 ან 5 თეთრს უხდის (რაც აქვს, იმას), ნიშანი ყუთში მიდის. მხედარი მეტოქის დედაქალაქში შევიდა — თამაში მაშინვე მთავრდება: <b>თქვენ გააერთიანეთ საქართველო</b>, როგორც ბაგრატ III-მ 1008 წელს.'],
  ['სიბრძნე', 'მწვანე ბარათებზე 6 სიბრძნეა: ანბანი, კარაბადინი, ასტრონომია, ხუროთმოძღვრება, რუკა, გალობა — თითო ორჯერ გვხვდება. ორი ერთნაირი შეაგროვეთ — დაფიდან ერთი ცოდნის ნიშანი მაშინვე აირჩიეთ. 6 სხვადასხვა (სამართლის წიგნიც ითვლება) — <b>მაშინვე იგებთ</b>: თქვენმა სამეფომ გელათის აკადემია დააარსა.'],
  ['ძეგლები', 'ძეგლის ეფექტი აშენებისთანავე სრულდება (თეთრი, ფარი, „კიდევ ერთი სვლა“…). „კიდევ სვლა“ ეპოქის ბოლო ბარათზე იკარგება. ორივე ერთად მხოლოდ 7 ძეგლს ააშენებს: მე-7-ის შემდეგ დარჩენილი ძეგლი ყუთში მიდის.'],
  ['ეპოქის დასასრული', '20-ვე ბარათი აღებულია — ეპოქა მთავრდება. ვის მხარესაც მხედარი დგას (სუსტი ლაშქარი), ის ირჩევს, ვინ დაიწყებს ახალ ეპოქას; თუ შუაშია — ის, ვინც ბოლო ბარათი აიღო. II და III ეპოქა თავისი განლაგების ბარათით იშლება.'],
  ['ამქრები', 'III ეპოქის იისფერი ბარათები ითვლის იმ სამეფოს ბარათებს, სადაც ასეთი მეტია — შეიძლება მეტოქისაც. აშენებისას 1 თეთრი ყოველზე, ბოლოს 1 ქულა ყოველზე. ხუროთმოძღვართა ამქარი — 2 ქულა ყოველ ძეგლზე; ზარაფთა — 1 ქულა ყოველ 3 თეთრზე უფრო მდიდარ სამეფოში.'],
  ['ქულები', 'თუ III ეპოქის ბოლომდე არავინ მოიგო, „დიდების წიგნში“ დაითვალეთ: ლურჯი, მწვანე, ყვითელი და იისფერი ბარათების ქულები, ძეგლები, ცოდნის ნიშნები, ლაშქარი (მხედარი მეტოქის მხარესაა — 2, 5 ან 10) და 1 ქულა ყოველ 3 თეთრზე. მეტი ქულა იგებს; თანაბრობისას — ვისაც ლურჯი ბარათებით მეტი აქვს; ისევ თანაბარია — ორივე ტახტი გამარჯვებულია.'],
];
const FAQ = [
  ['ფარი ძეგლიდანაც მოდის?', 'კი: ნარიყალა — 2, უშგულის კოშკები და შატილი — 1. დიდგორის გეგმა ყოველ ახალ წითელ ბარათს 1 ფარს უმატებს.'],
  ['მეტოქის რესურსი შემიძლია გამოვიყენო?', 'არა. მისი წარმოება მხოლოდ ბანკის ფასს აძვირებს.'],
  ['ძეგლის ქვეშ რომელი ბარათი დავდო?', 'ნებისმიერი თავისუფალი ბარათი — მისი ეფექტი აღარ მოქმედებს.'],
  ['ძეგლის აშენება აუცილებელია?', 'არა. აუშენებელ ძეგლს ქულა არ აქვს.'],
  ['თეთრი თუ არ მყოფნის?', 'ვალი არ არსებობს: რისი გადახდაც არ შეგიძლია, იმას ვერ ააშენებ — მაშინ ბარათი გადააგდე. ხარკს კი რამდენიც გაქვს, იმდენს იხდი.'],
];
const GLOSS = [['თეთრი', 'ძველი ქართული ვერცხლის ფული; დღესაც 1 ლარი = 100 თეთრი'], ['ეტრატი', 'ტყავისგან დამზადებული საწერი, ძველი ხელნაწერების მასალა'],
  ['მინანქარი', 'ფერადი მინის ნაკეთობა ოქროზე — ხახულის ხატზეც'], ['კარაბადინი', 'ძველი ქართული სამკურნალო წიგნი'], ['მონასპა', 'დავით აღმაშენებლის გვარდია'],
  ['მორიგე ჯარი', 'ერეკლე II-ის 1773 წლის ჯარი'], ['ქარვასლა', 'ვაჭრების სასტუმრო და საწყობი'], ['ყაბახი', 'ცხენოსანთა შეჯიბრის მოედანი'],
  ['ლიხთიმერეთი', 'ლიხის იქითა მხარე, დასავლეთი; ლიხთამერეთი — აქეთა, აღმოსავლეთი']];
const TIMELINE = [['IV ს.', 'მოქცევაჲ ქართლისაჲ: წმინდა ნინო და მეფე მირიანი, მცხეთა.'], ['1008', 'ბაგრატ III აერთიანებს დასავლეთსა და აღმოსავლეთს.'],
  ['1106', 'დავით აღმაშენებელი აარსებს გელათს; 1121 — დიდგორის ბრძოლა.'], ['1184–1213', 'თამარ მეფე: ვარძია, ოქროს ხანის მწვერვალი.'],
  ['1709', 'ვახტანგ VI-ის სტამბა თბილისში; 1745 — ვახუშტის გეოგრაფია და ატლასი.'], ['1773', 'ერეკლე II-ის მორიგე ჯარი.'],
  ['1879', 'ილია ჭავჭავაძე და წერა-კითხვის გამავრცელებელი საზოგადოება.']];
const rulesList = (list, start) => `<ol start="${start}">${list.map(([h, t]) => `<li><b>${h}.</b> ${t}</li>`).join('')}</ol>`;
const head = sub => `<div class="rhead"><div class="aso rtitle">${aso(title)}</div><div class="rsub">${esc(sub)}</div></div>`;
const rulesFoot = n => foot(`<span>${esc(title)} · წესები ${n}/4</span><span>${esc(SCHOOL)}</span>`);

/** The table at the start: the board between the thrones, the pyramid, each throne's monuments. */
const setupFigure = (width) => {
  const mini = (x, y, w, h, fill, stroke = NIGHT) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx=".6" fill="${fill}" stroke="${stroke}" stroke-width=".25"/>`;
  const rows = ROWS[1]; let pyr = '';
  rows.forEach(([n, up], r) => { for (let i = 0; i < n; i++) { const x = 60 + (i - (n - 1) / 2) * 6.6 - 3, y = 22 + r * 4.4; pyr += mini(x, y, 6, 8.4, up ? '#fffaf0' : AGES[1].bg); } });
  const wonders = (x, y) => [0, 1, 2, 3].map(k => mini(x + (k % 2) * 13.6, y + Math.floor(k / 2) * 9, 12.6, 8.2, '#f1e3c0', GOLD_D)).join('');
  const coins = (x, y) => [0, 1, 2].map(k => `<circle cx="${x + k * 3.2}" cy="${y}" r="1.6" fill="#d8aa45" stroke="#a37a2c" stroke-width=".25"/>`).join('');
  return `<svg width="${width}mm" height="${f(width * 0.72)}mm" viewBox="0 0 120 86.4" font-family="SerifKa" style="display:block">
<rect width="120" height="86.4" rx="3" fill="#efe6d4"/>
<rect x="5" y="9" width="9" height="68.4" rx="1" fill="#efe2c4" stroke="#8a7454" stroke-width=".3"/><rect x="5" y="9" width="9" height="7" rx="1" fill="${C.wine}"/><rect x="5" y="70.4" width="9" height="7" rx="1" fill="${C.wine}"/>
<text x="9.5" y="14.2" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="4" fill="${GOLD_L}">${aso('თ')}</text><text x="9.5" y="75.6" text-anchor="middle" font-family="SansKa" font-weight="900" font-size="4" fill="${GOLD_L}">${aso('ქ')}</text>
${glyph('knight', 6.3, 39.6, 6.4, C.wine)}
${pyr}
${wonders(86, 4)}${wonders(86, 64.4)}${coins(24, 6)}${coins(24, 80.4)}
<text x="60" y="6.4" text-anchor="middle" font-size="3.4" font-weight="800" fill="${C.wine}">აღმოსავლეთის ტახტი</text>
<text x="60" y="83.4" text-anchor="middle" font-size="3.4" font-weight="800" fill="${C.wine}">დასავლეთის ტახტი</text>
<text x="99.6" y="26.6" text-anchor="middle" font-size="2.8" fill="${INK}">ძეგლები</text><text x="99.6" y="62" text-anchor="middle" font-size="2.8" fill="${INK}">ძეგლები</text>
<text x="17" y="46" font-size="2.8" fill="${INK}">ლიხის გზა</text></svg>`;
};
const miniCard = (cd, scale) => `<div style="width:${f(63 * scale)}mm;height:${f(88 * scale)}mm;overflow:hidden;border-radius:${f(2.6 * scale)}mm;box-shadow:0 .3mm 1mm rgba(0,0,0,.25);flex:none"><div style="transform:scale(${scale});transform-origin:0 0">${card(cd)}</div></div>`;
const chainFigure = `<div class="fig2">${miniCard(AGE1.find(c => c.to === 'koshki'), 0.46)}<div class="figArrow">ოქროს რომბი<br>„კოშკი“ →<br><b>უფასოდ</b></div>${miniCard(AGE3.find(c => c.from === 'koshki'), 0.46)}</div>`;
const tradeFigure = `<svg width="80mm" height="23.81mm" viewBox="0 0 84 25" font-family="SerifKa" style="display:block;margin:1mm auto 0">
<rect width="84" height="25" rx="2" fill="#f4ead2"/>
${cardGlyph('brown', 7, 12.5, 15)}${resChip('S', 3.4, 4.2, 7.2)}${cardGlyph('brown', 17, 12.5, 15)}${resChip('S', 13.4, 4.2, 7.2)}
<text x="12" y="23.4" text-anchor="middle" font-size="2.5" fill="${INK}">მეტოქეს 2 ქვა აქვს</text>
<text x="31" y="15" font-size="6" font-weight="800" fill="${INK}">→</text>
${coin(2, 44, 11.5, 9)}<text x="51.2" y="13.6" font-size="5" font-weight="800" fill="${INK}">+</text>${coin(2, 59, 11.5, 9)}<text x="66" y="13.6" font-size="5" font-weight="800" fill="${INK}">=</text>${coin(4, 76, 11.5, 10)}
<text x="59" y="23.4" text-anchor="middle" font-size="2.5" fill="${INK}">შენთვის ერთი ქვა ბანკიდან — 4 თეთრი</text></svg>`;
const SCORE_EX = [['ლურჯი', 18, 21], ['მწვანე', 6, 4], ['ყვითელი', 3, 6], ['ამქრები', 4, 0], ['ძეგლები', 12, 15], ['ცოდნის ნიშნები', 4, 7], ['თეთრი (9 და 13)', 3, 4], ['ლაშქარი', 5, 0]];
const scoreExample = `<table class="t sx"><tr><th></th><th>დასავლეთი</th><th>აღმოსავლეთი</th></tr>${SCORE_EX.map(([n, a, b]) => `<tr><td>${n}</td><td>${a}</td><td>${b}</td></tr>`).join('')}
<tr class="sum"><td>ჯამი</td><td>${SCORE_EX.reduce((x, r) => x + r[1], 0)}</td><td>${SCORE_EX.reduce((x, r) => x + r[2], 0)}</td></tr></table>`;
const victories = `<div class="wins3">
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5.8" fill="${C.wine}"/>${glyph('knight', 1.8, 1.6, 8.6, GOLD_L)}</svg><b>გაერთიანება</b><span>მხედარი მეტოქის დედაქალაქში — მაშინვე</span></div>
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${sciMark('anbani', 6, 6, 11.6)}</svg><b>გელათის აკადემია</b><span>6 სხვადასხვა სიბრძნე — მაშინვე</span></div>
<div><svg width="12mm" height="12mm" viewBox="0 0 12 12">${wreath('★', 6, 6, 11.6)}</svg><b>დიდება</b><span>III ეპოქის ბოლოს მეტი ქულა</span></div></div>`;
const rulesPage1 = page(`${stripe(NO, 'წესები · 1')}<div class="rulesWrap">${head(`წესები · ${META}`)}
<p class="lead">ორი ქართული ტახტი — <b>დასავლეთისა</b> (ქუთაისი) და <b>აღმოსავლეთისა</b> (თბილისი) — სამ ეპოქას გაივლის: „მოქცევაჲ ქართლისაჲ“ (IV ს.), „ოქროს ხანა“ (XI–XIII სს.) და „აღორძინება“ (XVIII–XIX სს.). ყოველ სვლაზე საერთო პირამიდიდან ერთ ბარათს იღებთ და სამეფოს აშენებთ. მოგების სამი გზაა:</p>
${victories}
<div class="rules">${rulesList(RULES.slice(0, 4), 1)}<div class="figBox">${setupFigure(80)}<p class="figCap">მაგიდაზე: შუაში I ეპოქის პირამიდა, გვერდზე „ლიხის გზა“ (ქუთაისი — დასავლეთთან), ყველას წინ — 4 ძეგლი და 7 თეთრი.</p></div></div>
</div>${rulesFoot(1)}`, 'rulesP');
const rulesPage2 = page(`${stripe(NO, 'წესები · 2')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(4, 9), 5)}
<div class="figBox"><h3>ყიდვის მაგალითი</h3>${tradeFigure}<p class="figCap">შენ ქვა არ გაქვს, ბარათს 1 ქვა სჭირდება. მეტოქის ყავისფერი ბარათები 2 ქვას აწარმოებს: 2 + 2 = 4 თეთრი. ქვის საწყობი რომ გქონდეს — 1 თეთრი.</p></div>
<div class="figBox"><h3>ოსტატის ნიშნის მაგალითი</h3>${chainFigure}<p class="figCap">I ეპოქაში აშენებული „გალავანი“ III ეპოქის „ციხესიმაგრეს“ უფასოს ხდის — 2 ქვა, თიხა და ეტრატი აღარ გჭირდება.</p></div>
</div></div>${rulesFoot(2)}`, 'rulesP');
const rulesPage3 = page(`${stripe(NO, 'წესები · 3')}<div class="rulesWrap"><div class="rules">${rulesList(RULES.slice(9), 10)}
<div class="figBox"><h3>სამი ეპოქის განლაგება</h3><div class="pyr3">${[1, 2, 3].map(a => `<div>${pyramid(a, a === 3 ? 22 : 26)}<span>${AGES[a].roman} ეპოქა</span></div>`).join('')}</div><p class="figCap">თეთრი — პირაღმა, ფერადი — პირქვე. ქვედა რიგი ზედას ნახევრად ფარავს; თავისუფალია ბარათი, რომელსაც ზემოდან არაფერი ადევს.</p></div>
<div class="figBox"><h3>ქულების მაგალითი</h3>${scoreExample}<p class="figCap">მხედარი აღმოსავლეთის მხარეს, „ციხის“ ზონაშია — დასავლეთს 5 ქულა ერგება. აღმოსავლეთი იგებს 57 : 55.</p></div>
<h3>ხშირი კითხვები</h3>${FAQ.map(([q, a]) => `<p class="faq"><b>${q}</b> ${a}</p>`).join('')}
</div></div>${rulesFoot(3)}`, 'rulesP');
const rulesPage4 = page(`${stripe(NO, 'წესები · 4')}<div class="rulesWrap">${head('ორი ტახტის ამბავი')}
<div class="two4"><div>
<h3>სამი ეპოქა</h3><div class="tl">${TIMELINE.map(([d, t]) => `<p><b>${d}</b><span>${t}</span></p>`).join('')}</div>
<h3>თორმეტი ძეგლი</h3><div class="wl">${WONDERS.map(w => `<p><b>${esc(w.n)}</b> ${esc(w.hist.split(' · ').slice(0, 2).join(' · '))}</p>`).join('')}</div>
</div><div>
<h3>რას ასწავლის</h3><p class="p9">ისტორიას და გეოგრაფიას — 12 ძეგლი თავისი საუკუნით, სამი ეპოქა და ლიხის ქედი, რომელიც ქვეყანას ორად ყოფს. ქართული ცოდნის ფესვებს — ანბანი, კარაბადინი, ვახუშტის რუკები, გალობა, სიტყვის კონა. და ჩვევას — სამი ეპოქით წინ იფიქრო, თეთრი პატიოსნად დათვალო, მეტოქე პატივისცემით მოიგო: აქ გამარჯვება გაერთიანებაა, არა დანგრევა, და ცოდნა ისეთივე ძალაა, როგორც ლაშქარი.</p>
<h3>ძველი სიტყვები</h3><div class="gl">${GLOSS.map(([w, t]) => `<p><b>${w}</b> — ${t}</p>`).join('')}</div>
<h3>პირველი პარტიისთვის</h3><p class="p9">პირველად 10–11 წლისები მასწავლებელთან ერთად თამაშობენ. ძეგლები არ აირჩიოთ (წესი 2) და პირველ ეპოქაში ყიდვის ფასი ხმამაღლა დაითვალეთ. ერთი პარტია მომზადებით 40 წუთს სჭირდება.</p>
<div class="box credits"><b>წყარო და უფლებები.</b> შექმნილია „7 Wonders Duel“-ის წესებით (ანტუან ბოზა და ბრუნო კატალა, Repos Production, 2015): ბარათების ფასი და ეფექტი ორიგინალისაა, რომ ბალანსი არ დაირღვეს. სახელები, ისტორია, ნახატები და წესების ტექსტი საგანძურის სკოლისაა. მხოლოდ სკოლის შიდა, არაკომერციული გამოყენებისთვის — გასაყიდად არ ვრცელდება.</div>
</div></div></div>${rulesFoot(4)}`, 'rulesP');

// ---------- the cover and the box label ----------
const coverPage = no => page(`${stripe(NO)}
<div class="cover">
  <div class="aso title">${aso(title)}</div>
  <h1 class="gameTitle">ორი ტახტი</h1>
  <div class="lead">დასავლეთისა და აღმოსავლეთის ტახტები სამ ეპოქაში აშენებენ სამეფოს: ვინ გააერთიანებს საქართველოს, ვინ დააარსებს გელათის აკადემიას, ვის ექნება მეტი დიდება?<br><b>${META}</b></div>
  <div class="two">
    <div>
      <h3>რა არის ამ ფაილში</h3>
      <table class="t comp">
        <tr><th>კომპონენტი</th><th>ცალი</th><th>ფურცელი</th><th>✓</th></tr>
        <tr><td>წესები</td><td>4 გვ.</td><td>${no('rules1')}–${no('rules2')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${AGES[1].bg}"></i>I ეპოქის ბარათები</td><td>23</td><td>${no('age1-1')}–${no('age1-3')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${AGES[2].bg}"></i>II ეპოქის ბარათები</td><td>23</td><td>${no('age2-1')}–${no('age2-3')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${AGES[3].bg}"></i>III ეპოქა და ამქრები</td><td>20 + 7</td><td>${no('age3-1')}–${no('age3-3')}</td><td><span class="chk"></span></td></tr>
        <tr><td><i class="sw" style="background:${NIGHT}"></i>დამხმარე ბარათები</td><td>8</td><td>${no('age1-3')}, ${no('age2-3')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ძეგლები 96×62 მმ</td><td>12</td><td>${no('wonders1')}–${no('wonders2')}</td><td><span class="chk"></span></td></tr>
        <tr><td>მხედარი</td><td>1 + 2*</td><td>${no('wonders2')}, ${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ცოდნის ნიშნები ⌀35 მმ</td><td>10</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>თეთრი ⌀25 მმ</td><td>31 + 4*</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ხარკის ნიშნები</td><td>4</td><td>${no('tokens')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დაფა „ლიხის გზა“</td><td>1</td><td>${no('board')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დამხმარე ფურცელი A5</td><td>2</td><td>${no('help')}</td><td><span class="chk"></span></td></tr>
        <tr><td>დიდების წიგნი A6</td><td>8</td><td>${no('score')}</td><td><span class="chk"></span></td></tr>
        <tr><td>ყუთის იარლიყი</td><td>1</td><td>${no('label')}</td><td><span class="chk"></span></td></tr>
      </table>
      <p class="small">ფერადი კვადრატი — ბარათის ზურგის ფერი. * სათადარიგო. სულ ${SHEETS.length} ფურცელი.</p>
      <div class="box legal"><b>წყარო და უფლებები.</b> შექმნილია „7 Wonders Duel“-ის წესებით (ანტუან ბოზა და ბრუნო კატალა, 2015); ბარათების ფასი და ეფექტი ორიგინალისაა. სახელები, ისტორია, ნახატები და ტექსტი საგანძურის სკოლისაა. მხოლოდ სკოლის შიდა, არაკომერციული გამოყენებისთვის.</div>
      <h3 class="asmT">მაგიდაზე</h3>
      <div class="tbl">${setupFigure(52)}<p>შუაში ეპოქის პირამიდა, გვერდზე „ლიხის გზა“, ყველას წინ — თავისი 4 ძეგლი და 7 თეთრი.</p></div>
    </div>
    <div>
      <h3>როგორ დავბეჭდოთ</h3>
      <ol class="how">
        <li><b>ყველაფერი ორმხრივად</b>, გრძელი კიდით, <b>100%-ზე</b> („fit to page“ გამორთული). ჯერ ერთი საცდელი ფურცელი: ბარათი 63×88 მმ უნდა იყოს.</li>
        <li>ქაღალდი: წესები — ჩვეულებრივი; ბარათები და ძეგლები — 250–300 გ (ან 160 გ + მქრქალი ლამინაცია); ნიშნები, თეთრი და დაფა — 150 გ, მერე 1.5–2 მმ მუყაოზე.</li>
        <li>ჭრა: ბარათები — ნიშნულებს შორის, დანით სახაზავთან (უფროსები ჭრიან; სტამბაში ჭრაც შეუკვეთეთ — 87 ბარათია). ნიშნები და თეთრი — წრეზე, მაკრატლით. 63×88 მმ სლივები ბარათებს გაუძლებს.</li>
        <li>დაფა: ორივე ნაწილი მუყაოზე დააკარი, ამოჭერი და „შეაერთე“-სთან მიადე; უკნიდან ქსოვილის ლენტით შეაერთე — შუაზე დაიკეცება.</li>
        <li>თეთრი უფრო მყარი იქნება 25 მმ ხის დისკებზე დაკრული; მხედრად ჭადრაკის მხედარიც გამოდგება.</li>
      </ol>
      <div class="covCards">${miniCard(AGE2.find(c => c.n === 'წიგნსაცავი'), 0.5)}${miniCard(AGE1.find(c => c.n === 'ცხენოსნები'), 0.5)}</div>
      <div class="covWonder"><div style="width:55mm;height:35.75mm;overflow:hidden;border-radius:1.5mm;box-shadow:0 .3mm 1mm rgba(0,0,0,.25)"><div style="transform:scale(.55);transform-origin:0 0">${wonderCard(WONDERS[0])}</div></div></div>
      <p class="small">ნახატების ადგილას ჯერ ნიშნები და ორნამენტებია — ძეგლების სურათები მერე დაემატება.</p>
    </div>
  </div>
</div>
${foot(`<span>${esc(title)} · ${esc(SERIES)} №${NO}</span><span>${esc(SCHOOL)}</span>`)}`, 'coverP');
const labelPage = page(`<div class="lbl lid"><svg class="lidCloth" width="180mm" height="114mm" viewBox="0 0 180 114">${rosettes(0, 0, 180, 114, GOLD_L, 0.13, 10)}</svg><div class="lin">
  <div class="crest">${aso('ქ')}<small>ქუთაისი</small></div>
  <div class="lt"><div class="aso big">${aso(SERIES)}</div><div class="nm">ორი ტახტი</div><div class="sub">ქუთაისიდან თბილისამდე — სამი ეპოქა</div><div class="meta">${META}</div><div class="ser">№${NO}</div><div class="sch">${esc(SCHOOL)}</div></div>
  <div class="crest">${aso('თ')}<small>თბილისი</small></div></div></div>
<div class="lbl list"><h3>ყუთში უნდა იყოს</h3><div class="items">
${['73 ეპოქის ბარათი', '8 დამხმარე ბარათი', '12 ძეგლი', '10 ცოდნის ნიშანი', '35 თეთრი', '4 ხარკის ნიშანი', 'მხედარი', 'დაფა — 2 ნაწილი', 'წესები, 2 დამხმარე', 'დიდების წიგნი'].map(t => `<span><span class="chk"></span>${t}</span>`).join('')}</div></div>
${[0, 1].map(k => `<div class="lbl side s${k}"><span class="aso">${aso(title)}</span><b>ორი ტახტი</b><span>${META}</span></div>`).join('')}
<div class="lblNote">იარლიყი 20×20 სმ ყუთის სახურავზე და გვერდებზე; ჭრა — ხაზებზე.</div>`, 'labelP');

export const css = `
.tk svg.bg,.won svg.bg{position:absolute;left:0;top:0}
.tk .tkName{position:absolute;left:4.6mm;right:4.6mm;top:55.4mm;height:6.4mm;line-height:6.4mm;font-size:11pt;font-weight:800;text-align:center;color:${INK}}
.tk .tkText{position:absolute;left:5.4mm;right:5.4mm;top:66.4mm;height:15mm;font-size:9.2pt;line-height:1.24;text-align:center;color:#4a3426}
.hc .hcHead{position:absolute;left:4mm;right:4mm;top:3.2mm;height:9mm;display:flex;align-items:center;justify-content:center;color:#fbf3dc;font-size:11pt;letter-spacing:.02em}
.hc .hcBody{position:absolute;left:5mm;right:5mm;top:16mm;bottom:5mm;font-size:9pt;line-height:1.26;color:${INK}}
.hc .hcBody p{margin:0 0 1.6mm}
.hc .hcBody b{color:${C.wine}}
.hc .hcCap{text-align:center;font-size:9pt;color:${C.muted};margin:1.2mm 0 2.2mm!important}
.hc .hcRule{border-top:.25mm solid ${GOLD};padding-top:1.6mm}
.hc .hcWin{display:flex;gap:2.4mm;align-items:center;margin:0 0 3mm}
.hc .hcWin p{margin:0}
.won{width:100mm;height:65mm;position:relative;overflow:hidden;background:${PAPER}}
.won .wnName{position:absolute;left:15.2mm;width:42mm;top:${FI + 0.6}mm;height:12.4mm;line-height:12.4mm;font-size:13pt;font-weight:800;color:#fbf0d2}
.won .wnText{position:absolute;left:45.6mm;right:4.6mm;top:17.6mm;height:30mm;display:flex;align-items:center;font-size:9.6pt;line-height:1.26;color:${INK}}
.tokCap{font-size:9pt;color:#6b5a40;text-align:center}
.mat{width:100%;height:100%;border:.4mm dashed #8a7454;border-radius:2.6mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;text-align:center;padding:4mm;font-size:9.5pt;color:#6b5a40}
.mat b{font-size:11pt;color:${C.wine}}
.won .wnHist{position:absolute;left:15mm;right:4mm;top:50.2mm;height:12mm;display:flex;align-items:center;font-size:9pt;line-height:1.22;color:#5a4330;font-style:italic}
.a5slot{position:absolute;left:0;width:210mm;height:148.5mm;padding:9mm 11mm 7mm}
.a5{height:100%;border:.35mm solid ${GOLD};border-radius:3mm;background:${PAPER};padding:3.6mm 5.4mm 2.6mm;display:flex;flex-direction:column;color:${INK}}
.a5head{display:flex;align-items:baseline;gap:4mm;border-bottom:.3mm solid ${GOLD};padding-bottom:1.3mm;margin-bottom:2.4mm}
.a5head .aso{font-size:12pt;color:${C.wine};letter-spacing:.06em}
.a5head b{font-size:12pt}
.a5cols{display:grid;grid-template-columns:1fr 1fr;gap:6mm;font-size:9.5pt;line-height:1.3;flex:1}
.a5cols h4{margin:0 0 .5mm;color:${C.wine};font-size:10.3pt}
.a5cols:not(.lists){font-size:10.2pt;line-height:1.33}
.a5cols:not(.lists) h4{font-size:11pt}
.a5cols:not(.lists) p{margin-bottom:2mm}
.a5cols p{margin:0 0 1.9mm}
.a5cols b{color:${C.wine}}
.a5cols.lists p{margin:0 0 1.1mm;font-size:8.9pt;line-height:1.24}
.a5cols .a5note{color:${C.muted};font-style:italic;margin-top:2mm}
.a5foot{font-size:8pt;color:${C.muted};text-align:right}
.a5 .wins3{margin:0 0 1.2mm;gap:3mm}
.a5 .wins3>div{padding:1.4mm 2.2mm}
.a5 .wins3 b{font-size:9.8pt}
.a5 .wins3 span{font-size:8.4pt;line-height:1.2}
.a5 .wins3>div{background:#fffaf0}
.a5cut{position:absolute;left:0;right:0;top:148.5mm;border-top:.25mm dashed #999}
.a6slot{position:absolute;width:105mm;height:148.5mm;padding:9mm 6mm 7mm}
.sc{height:100%;border:.35mm solid ${GOLD};border-radius:2.6mm;background:${PAPER};padding:3mm 3.6mm;display:flex;flex-direction:column;color:${INK}}
.scHead{display:flex;justify-content:space-between;align-items:baseline;border-bottom:.3mm solid ${GOLD};padding-bottom:1mm;margin-bottom:1.6mm}
.scHead b{font-size:13pt;color:${C.wine}}
.scHead .aso{font-size:8pt;color:${GOLD_D};letter-spacing:.08em}
.scLine{font-size:9pt;margin-bottom:1.8mm}
.scT{border-collapse:collapse;width:100%;font-size:8.8pt;table-layout:fixed}
.scT col.n{width:23mm}
.scT th,.scT td{border:.2mm solid #cdbb98;padding:0 1.2mm;height:9.8mm}
.scT th{background:#efe2c4;color:${C.wine};font-size:7.9pt;line-height:1.1;height:10mm;text-align:center;width:22mm;padding:0 .6mm}
.scT th:first-child{width:auto}
.scT th small{font-weight:400;color:${C.muted}}
.scT td:first-child{white-space:nowrap;font-size:8.3pt;padding-left:.8mm}
.scT td svg{vertical-align:middle;margin-right:1.2mm}
.scT tr.sum td{font-weight:800;color:${C.wine};background:#c9a24b26;font-size:10pt}
.scEarly{margin-top:auto;font-size:8.8pt;line-height:1.75}
.a6cutV{position:absolute;left:105mm;top:0;bottom:0;border-left:.25mm dashed #999}
.a6cutH{position:absolute;top:148.5mm;left:0;right:0;border-top:.25mm dashed #999}
.rulesWrap{padding:6mm 12mm 0}
.rulesP .rules{font-size:11pt;line-height:1.42}
.rhead{display:flex;align-items:baseline;gap:5mm;border-bottom:.3mm solid ${GOLD};padding-bottom:1.5mm;margin-bottom:3mm}
.rtitle{font-size:20pt;color:${C.wine};white-space:nowrap}
.rsub{font-size:10.5pt;color:${C.muted}}
.lead{font-size:10.6pt;line-height:1.4;margin:0 0 3mm}
.wins3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:0 0 3.4mm}
.wins3>div{display:grid;grid-template-columns:12mm 1fr;column-gap:2.4mm;align-items:center;background:${PAPER};border:.3mm solid ${GOLD};border-radius:2mm;padding:2mm 2.6mm}
.wins3 svg{grid-row:1/3}
.wins3 b{color:${C.wine};font-size:10.4pt;line-height:1.2}
.wins3 span{font-size:9pt;line-height:1.25;color:${C.muted}}
.figBox{break-inside:avoid;background:${PAPER};border:.3mm solid ${GOLD};border-radius:2mm;padding:2.4mm 3mm;margin:0 0 3mm}
.rules .figBox h3{margin:0 0 1.4mm}
.rules .figCap{font-size:9.2pt;line-height:1.3;margin:1.6mm 0 0;color:#5a4330}
.fig2{display:flex;align-items:center;justify-content:center;gap:3mm}
.figArrow{font-size:9pt;line-height:1.25;text-align:center}
.figArrow b{color:${C.wine}}
.pyr3{display:flex;justify-content:space-around;align-items:flex-end}
.pyr3>div{display:flex;flex-direction:column;align-items:center;gap:1mm}
.pyr3 span{font-size:8.8pt;font-weight:700;color:${C.wine}}
table.sx{font-size:9.4pt}
table.sx td:first-child{white-space:nowrap}
table.sx td,table.sx th{padding:.45mm 1.6mm}
table.sx td:nth-child(n+2),table.sx th:nth-child(n+2){text-align:center}
table.sx tr.sum td{font-weight:800;color:${C.wine}}
.rules .faq{font-size:9.8pt;line-height:1.32;margin:0 0 1.8mm}
.faq b{color:${C.wine};display:block}
.two4{display:grid;grid-template-columns:1fr 1fr;gap:8mm;font-size:10.5pt;line-height:1.38}
.two4 h3{margin:0 0 1.5mm;color:${C.wine};font-size:11.5pt}
.two4 h3:not(:first-child){margin-top:3.4mm}
.tl p{display:flex;gap:3mm;margin:0 0 1.4mm;font-size:10pt;line-height:1.3}
.tl b{flex:none;width:21mm;color:${C.wine};text-align:right;white-space:nowrap}
.wl p,.gl p{margin:0 0 1.3mm;font-size:10pt;line-height:1.3}
.wl b,.gl b{color:${C.wine}}
.p9{margin:0;font-size:10.4pt;line-height:1.42}
.credits{margin-top:4mm;font-size:9.2pt;line-height:1.35}
.cover{padding:8mm 14mm 0}
.cover .title{font-size:24pt;color:${GOLD_D};letter-spacing:.08em}
.cover .lead{font-size:11.6pt;margin:2mm 0 5mm;line-height:1.4}
.cover .two{display:grid;grid-template-columns:1fr 1fr;gap:7mm;font-size:10pt}
.cover h3{margin:0 0 2mm;color:${C.wine};font-size:12pt}
.cover table.comp{font-size:8.9pt}
.cover table.comp td,.cover table.comp th{padding:.8mm 1.3mm}
table.comp td:nth-child(n+2),table.comp th:nth-child(n+2){white-space:nowrap}
table.comp td:first-child{white-space:nowrap}
table.comp .sw{display:inline-block;width:3.2mm;height:3.2mm;border-radius:.6mm;vertical-align:-.5mm;margin-right:1.4mm;border:.2mm solid #0003}
.cover .how{margin:0;padding-left:4.5mm;font-size:9.6pt;line-height:1.33}
.cover .how li{margin-bottom:1.5mm}
.cover .legal{font-size:9pt;margin:3mm 0 2mm}
.cover .asmT{margin-top:3mm}
.cover .tbl{display:flex;gap:4mm;align-items:center}
.cover .tbl svg{flex:none}
.cover .tbl p{margin:0;font-size:9.4pt;line-height:1.35}
.covCards{display:flex;justify-content:center;gap:4mm;margin:4mm 0 3mm}
.covWonder{display:flex;justify-content:center;margin-bottom:2mm}
.labelP .lbl{position:absolute;left:10mm;width:190mm;border:.25mm solid #777}
.labelP .lid{top:12mm;height:124mm;background:${NIGHT};padding:5mm}
.labelP .lidCloth{position:absolute;left:5mm;top:5mm}
.labelP .lid .lin{position:relative;height:100%;display:flex;align-items:center;justify-content:center;gap:6mm}
.labelP .crest{flex:none;width:28mm;height:28mm;border-radius:50%;background:${C.wine};border:.6mm solid ${GOLD};box-shadow:0 0 0 1.4mm ${NIGHT},0 0 0 1.8mm ${GOLD};display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'SansKa',sans-serif;font-weight:900;font-size:25pt;line-height:1;color:${GOLD_L}}
.labelP .crest small{font-family:'SerifKa',serif;font-weight:700;font-size:8.5pt;margin-top:1.4mm;letter-spacing:.03em}
.labelP .lid .lt{background:${PAPER};border:.6mm solid ${GOLD};border-radius:3mm;padding:6mm 8mm;text-align:center;color:${INK};box-shadow:0 0 0 2.4mm ${NIGHT}}
.labelP .lid .big{font-size:14pt;color:${GOLD_D};letter-spacing:.1em}
.labelP .lid .nm{font-weight:800;font-size:31pt;line-height:1.1;color:${C.wine};white-space:nowrap}
.labelP .lid .sub{font-size:12pt;margin:1.5mm 0 3mm}
.labelP .lid .meta{font-size:11pt;color:${C.wine};font-weight:700}
.labelP .lid .ser{font-size:9pt;color:${GOLD_D};letter-spacing:.1em;margin-top:4mm}
.labelP .lid .sch{font-size:9.5pt;color:${C.muted}}
.labelP .list{top:144mm;height:44mm;background:${PAPER};padding:4mm 7mm}
.labelP .list h3{margin:0 0 2.4mm;color:${C.wine};font-size:13pt}
.labelP .list .items{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2mm 4mm;font-size:10.5pt}
.labelP .side{height:22mm;background:${NIGHT};color:#fbf3dc;display:flex;align-items:center;justify-content:space-around;font-size:11pt}
.labelP .side .aso{color:${GOLD_L};letter-spacing:.1em}
.labelP .side b{font-size:16pt}
.labelP .s0{top:198mm}.labelP .s1{top:228mm}
.lblNote{position:absolute;left:10mm;right:10mm;top:258mm;font-size:9pt;color:${C.muted};text-align:center}
`;

// ---------- the sheets, in printing order ----------
const ageSheets = (list, key, label) => {
  const out = [];
  for (let i = 0; i * 9 < list.length; i++) {
    const nine = list.slice(i * 9, i * 9 + 9);
    out.push({
      key: `${key}${i + 1}`,
      front: cardSheet(nine.map(c => (c.html ?? card(c))), { label }),
      back: cardSheet(nine.map(c => (c.html ? helpBack : ageBack(c.age))), { back: true, label: `${label} — ზურგი` }),
    });
  }
  return out;
};
const wonders1 = back => placedSheet(wonderPieces(WONDERS.slice(0, 8), back), { back, label: back ? 'ძეგლები — ზურგი' : 'ძეგლები' }).replace('</section>', `${wonderMarks(8)}</section>`);
const wonders2 = back => placedSheet([
  ...wonderPieces(WONDERS.slice(8), back),
  ...(back ? [] : [
    { x: 14, y: 160, w: 70, h: 96, html: discardMat },
    { x: 100, y: 166, w: 15, h: 52, html: riderTent }, { x: 124, y: 166, w: 15, h: 52, html: riderTent },
    { x: 96, y: 224, w: 100, h: 30, html: '<div class="tokCap" style="text-align:left">მხედარი: ამოჭერი, წყვეტილ ხაზზე მოკეცე და კარავივით დადგი შუა უჯრაზე. მეორე — სათადარიგოა. ჭადრაკშიც ამ ფიგურას „მხედარი“ ჰქვია.</div>' },
  ]),
], { back, label: back ? 'ძეგლები — ზურგი' : 'ძეგლები, მხედარი, გადაგდებულის ადგილი' }).replace('</section>', `${wonderMarks(4)}</section>`);
const HELP1 = [{ html: throne('west') }, { html: throne('east') }, { html: turnCard }, { html: turnCard }];
const HELP2 = [{ html: layoutCard(1) }, { html: layoutCard(2) }, { html: layoutCard(3) }, { html: winsCard }];
const SHEETS = [
  { key: 'cover' },
  { key: 'rules1', front: rulesPage1, back: rulesPage2 },
  { key: 'rules2', front: rulesPage3, back: rulesPage4 },
  ...ageSheets([...AGE1, ...HELP1], 'age1-', 'I ეპოქა'),
  ...ageSheets([...AGE2, ...HELP2], 'age2-', 'II ეპოქა'),
  ...ageSheets([...AGE3, ...GUILDS], 'age3-', 'III ეპოქა და ამქრები'),
  { key: 'wonders1', front: wonders1(false), back: wonders1(true) },
  { key: 'wonders2', front: wonders2(false), back: wonders2(true) },
  { key: 'tokens', front: tokenSheet(false), back: tokenSheet(true) },
  { key: 'board', front: boardSheet },
  { key: 'help', front: helpSheet(false), back: helpSheet(true) },
  { key: 'score', front: scorePage, back: scorePage },
  { key: 'label', front: labelPage },
];

SHEETS[0].front = coverPage(k => sheetNo(SHEETS, k));

export const sheets = SHEETS.length;
export const pages = duplex(SHEETS);
