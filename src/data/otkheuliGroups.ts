import { INSTRUMENTS_LIST } from './instrumentsData';
import { ARCHIVE_SONGS } from './songArchive';
import { SAMOSI_PARTS } from './samosiData';
import { KABA_PARTS } from './kabaData';
import { NOTES_LISTS } from './chantLookup';
import type { OtkheuliGroup } from '../utils/otkheuli';

// The groups of „ოთხეული“ (games hub, 2026-10-28): the app's own world — the church, chant, the saints, the regions,
// songs and instruments, the costume, the land and the table. A group needs four words, most carry more so the grid
// differs from day to day; a word may belong to two groups (that is the trick). Every word fits a tile: at most eleven
// letters. The lists the app already has (instruments, regions, costume parts, songs and chants by their list) join the
// curated ones below, so a new song or instrument lands in the game by itself. (songsData.ts is not imported: its chain
// reaches firebase.ts, which the tests cannot load — the regions are written here, the songs come from the archive.)

const MAX_CHARS = 11;
const fits = (w: string) => w.length > 0 && w.length <= MAX_CHARS && !/[\d()]/.test(w);
const clean = (w: string) => w.replace(/[;,.:!?]+$/, '').replace(/\s+/g, ' ').trim();
const group = (id: string, label: string, words: string[], family?: string): OtkheuliGroup => ({ id, label, words: [...new Set(words.map(clean).filter(fits))], ...(family ? { family } : {}) });

const CURATED: OtkheuliGroup[] = [
  group('dghesastsaulebi', 'დღესასწაულები', ['შობა', 'აღდგომა', 'ხარება', 'მირქმა', 'ბზობა', 'ნათლისღება', 'მიძინება', 'ამაღლება']),
  group('shesamoseli', 'სამღვდელო შესამოსელი', ['ოლარი', 'ფელონი', 'ანაფორა', 'ენქერი', 'მიტრა', 'ეპიტრაქილი', 'ომოფორი', 'კამილავკა']),
  group('tadzris-nivtebi', 'ტაძრის ნივთები', ['ბარძიმი', 'საცეცხლური', 'კანდელი', 'სანთელი', 'ხატი', 'ხელჯვარი', 'ლამპარი', 'კანკელი']),
  group('tsignebi', 'საეკლესიო წიგნები', ['სახარება', 'დავითნი', 'ჟამნი', 'კურთხევანი', 'მარხვანი', 'ზატიკი', 'თვენი', 'სამოციქულო']),
  group('sagaloblis-sakheebi', 'საგალობლის სახეები', ['ტროპარი', 'კონდაკი', 'ძლისპირი', 'დასდებელი', 'იკოსი', 'კატავასია', 'სტიქარონი']),
  group('msakhureba', 'ღვთისმსახურება', ['წირვა', 'მწუხრი', 'ცისკარი', 'ჟამნი', 'პარაკლისი', 'ლიტია', 'სერობა', 'შუაღამიანი']),
  group('khmebi', 'ხმები გალობაში', ['მთქმელი', 'მოძახილი', 'ბანი', 'კრიმანჭული', 'გამყივანი', 'შემხმობარი']),
  group('tsirvis-natsilebi', 'წირვის ნაწილები', ['კვერექსი', 'ქერუბიკონი', 'მრწამსი', 'ტრისაგიონი', 'ზიარება', 'მამაო ჩვენო', 'ალილუია', 'ანაფორა']),
  group('motsiqulebi', 'მოციქულები', ['პეტრე', 'პავლე', 'ანდრია', 'იაკობი', 'თომა', 'ფილიპე', 'ბართლომე', 'სიმონი', 'მატათა', 'მათე', 'იოანე']),
  group('makhareblebi', 'მახარებლები', ['მათე', 'მარკოზი', 'ლუკა', 'იოანე']),
  group('tsinastsarmetqvelebi', 'წინასწარმეტყველები', ['მოსე', 'ელია', 'ისაია', 'დანიელი', 'იერემია', 'ეზეკიელი', 'იონა', 'ელისე', 'დავითი', 'სოლომონი']),
  group('mtavarangelozebi', 'მთავარანგელოზები', ['მიქაელი', 'გაბრიელი', 'რაფაელი', 'ურიელი', 'სელაფიელი']),
  group('kartveli-tsmidanebi', 'ქართველი წმიდანები', ['ნინო', 'შუშანიკი', 'აბო', 'ქეთევანი', 'ლუარსაბი', 'არჩილი', 'რაჟდენი', 'ევსტათი', 'ზაბულონი', 'სოსანა', 'ილია მართალი']),
  group('asureli-mamebi', 'ასურელი მამები', ['შიო', 'აბიბოსი', 'ანტონი', 'ზენონი', 'თადეოზი', 'პიროსი', 'ისიდორე', 'იოსები', 'ისე', 'სტეფანე']),
  group('mepeebi', 'მეფეები და დედოფლები', ['თამარი', 'დავითი', 'ვახტანგი', 'ფარნავაზი', 'გიორგი', 'ბაგრატი', 'ერეკლე', 'მირიანი', 'ლუარსაბი', 'ქეთევანი', 'ლაშა']),
  group('mtserlebi', 'მწერლები და პოეტები', ['რუსთაველი', 'ილია', 'აკაკი', 'ვაჟა', 'გალაკტიონი', 'გურამიშვილი', 'ჩავჩავაძე', 'ორბელიანი', 'ბარათაშვილი']),
  group('mdinareebi', 'მდინარეები', ['მტკვარი', 'რიონი', 'არაგვი', 'ალაზანი', 'ენგური', 'ლიახვი', 'ჭოროხი', 'იორი', 'ქსანი', 'ხრამი', 'სუფსა']),
  group('mtebi', 'მთები', ['ყაზბეგი', 'შხარა', 'უშბა', 'თეთნულდი', 'მთაწმინდა', 'ლომისი']),
  group('tadzrebi', 'ტაძრები და მონასტრები', ['ჯვარი', 'ალავერდი', 'გელათი', 'ბაგრატი', 'სიონი', 'ბოდბე', 'ვარძია', 'ნეკრესი', 'იყალთო', 'მეტეხი', 'ანჩისხატი', 'შიომღვიმე', 'ზედაზენი']),
  group('kalakebi', 'ქალაქები', ['თბილისი', 'ქუთაისი', 'ბათუმი', 'თელავი', 'გორი', 'ზუგდიდი', 'ფოთი', 'რუსთავი', 'მცხეთა', 'ახალციხე', 'ოზურგეთი']),
  // the map's regions (data/songsData.ts FOLK_REGIONS), those short enough for a tile
  group('kutkheebi', 'კუთხეები', ['აფხაზეთი', 'სვანეთი', 'სამეგრელო', 'იმერეთი', 'გურია', 'აჭარა', 'შიდა ქართლი', 'ქვემო ქართლი', 'კახეთი', 'ლაზეთი', 'ოსეთი']),
  group('istoriuli-kutkheebi', 'ისტორიული კუთხეები', ['თუშეთი', 'ფშავი', 'ხევსურეთი', 'ხევი', 'მთიულეთი', 'ლეჩხუმი', 'ჯავახეთი', 'მესხეთი', 'ქიზიყი', 'ჰერეთი', 'რაჭა']),
  group('tsekvebi', 'ცეკვები', ['ქართული', 'ხორუმი', 'აჭარული', 'მთიულური', 'ხანჯლური', 'სამაია', 'ფერხული', 'კინტოური', 'ჯეირანი', 'ფარცა', 'დავლური']),
  group('vazi', 'ვაზის ჯიშები', ['საფერავი', 'რქაწითელი', 'ქისი', 'ხიხვი', 'ოჯალეში', 'ცოლიკოური', 'ჩინური', 'თავკვერი', 'ჩხავერი', 'მწვანე']),
  group('kerdzebi', 'კერძები', ['ხინკალი', 'ხაჭაპური', 'ლობიო', 'მჭადი', 'ფხალი', 'ჩურჩხელა', 'ჩაქაფული', 'საცივი', 'ელარჯი', 'ხარჩო', 'ჯონჯოლი', 'ტოლმა']),
  group('khili', 'ხილი', ['ვაშლი', 'მსხალი', 'ატამი', 'ბროწეული', 'ყურძენი', 'ლეღვი', 'ხურმა', 'კომში', 'ტყემალი', 'ბალი', 'ალუბალი']),
  group('damtserloba', 'ქართული დამწერლობა', ['ასომთავრული', 'ნუსხური', 'მხედრული', 'ხუცური']),
  group('kviris-dgheebi', 'კვირის დღეები', ['ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი', 'კვირა']),
  group('satnoebebi', 'სათნოებები', ['სიყვარული', 'სიმდაბლე', 'მოთმინება', 'რწმენა', 'იმედი', 'სიკეთე', 'სიწმინდე', 'მორჩილება', 'სიმშვიდე']),
  group('sakhli', 'ქართული სახლი', ['ქვევრი', 'თონე', 'კერა', 'ფარდაგი', 'დარბაზი', 'მარანი', 'აივანი', 'ბუხარი', 'ტახტი']),
  group('supra', 'სუფრა', ['თამადა', 'ალავერდი', 'სადღეგრძელო', 'ყანწი', 'ჭიქა', 'მერიქიფე', 'ტოლუმბაში', 'სუფრული', 'ღვინო', 'პური']),
  group('natesaoba', 'ნათესაობა', ['დედა', 'მამა', 'ბებია', 'ბაბუა', 'ბიძა', 'მამიდა', 'დეიდა', 'სიძე', 'რძალი', 'მაზლი', 'მული']),
  group('musikis-terminebi', 'მუსიკის ტერმინები', ['ნოტა', 'გასაღები', 'ბემოლი', 'დიეზი', 'პაუზა', 'ტაქტი', 'აკორდი', 'ოქტავა', 'მაჟორი', 'მინორი', 'ინტერვალი', 'გამა']),
  group('tamashebi', 'ქართული თამაშები', ['ლელო', 'ჭიდაობა', 'ცხენბურთი', 'ლახტი', 'კრივი', 'ჯირითი', 'ყაბახი', 'ბურთაობა']),
];

// the lists the app already keeps
const SONG_REGION: Partial<Record<string, string>> = {
  abkhazeti: 'აფხაზური', achara: 'აჭარული', guria: 'გურული', imereti: 'იმერული', kakheti: 'კახური', kalakuri: 'ქალაქური',
  kvemokartli: 'ქვემო ქართლის', mtianeti: 'მთის', racha: 'რაჭული', samegrelo: 'მეგრული', samtskhe: 'მესხური', shidakartli: 'ქართლური', svaneti: 'სვანური',
};
const SERVICE_LABEL: Partial<Record<string, string>> = { 'წირვა': 'წირვის საგალობლები', 'მწუხრი': 'მწუხრის საგალობლები', 'ცისკარი': 'ცისკრის საგალობლები', 'სიმღერა': 'სიმღერები ნოტებით' };
const MIN_WORDS = 5;

// a song title that several regions sing („ალილო“, „მაყრული“, „ჭონა“) names no region, so it stays out of the song groups
const songRegions = new Map<string, Set<string>>();
for (const s of ARCHIVE_SONGS) {
  const t = clean(s.title);
  if (t.length >= 4 && fits(t)) (songRegions.get(t) ?? songRegions.set(t, new Set()).get(t)!).add(s.region);
}
const songsOf = (region: string) => [...songRegions].filter(([, r]) => r.size === 1 && r.has(region)).map(([t]) => t);

const FROM_APP: OtkheuliGroup[] = [
  group('sakravebi', 'საკრავები', INSTRUMENTS_LIST.filter(i => i.folk !== false).map(i => i.nameGe)),
  group('chokha', 'ჩოხის ნაწილები', SAMOSI_PARTS.map(p => p.label)),
  group('kaba', 'ქართული კაბა', KABA_PARTS.map(p => p.label)),
  // one region's songs and one service's chants per grid at most (family), so the grid stays mixed
  ...Object.entries(SONG_REGION).map(([id, adj]) => group(`songs-${id}`, `${adj} სიმღერები`, songsOf(id), 'songs')),
  ...NOTES_LISTS.filter(([name]) => SERVICE_LABEL[name]).map(([name, list]) => group(`chants-${name}`, SERVICE_LABEL[name]!, list.map(c => c.title), 'chants')),
].filter(g => g.words.length >= MIN_WORDS);

export const OTKHEULI_GROUPS: OtkheuliGroup[] = [...CURATED, ...FROM_APP].filter(g => g.words.length >= 4);
