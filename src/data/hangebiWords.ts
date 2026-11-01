import { OTKHEULI_GROUPS } from './otkheuliGroups';
import { KUTKHE_REGIONS } from '../utils/kutkhe';
import { HANGEBI_WORDS, cluesOf, type HangebiPuzzle } from '../utils/hangebi';

// „ოთხი ჰანგი, ერთი სიტყვა“'s puzzles by word (utils/hangebi.ts): the groups of „ოთხეული“ (data/otkheuliGroups.ts) under the
// word that names them — four rivers → მდინარე, four of a region's song titles → that region. A clue that holds the answer
// („კუს ტბა“ for ტბა, „გურული …“ for გურია) is left out; a group with fewer than four clues left gives no puzzle. The groups
// that name no one word (a temple's things, the Syrian fathers, the historic regions beside the map's, a Georgian's virtues
// beside the church's, the services' chants — the same chants sung at all three) stay out. The songs' recordings make the
// puzzles by ear: data/hangebiPool.ts.

const KEY: Record<string, string> = {
  dghesastsaulebi: 'დღესასწაული', shesamoseli: 'შესამოსელი', tsignebi: 'წიგნი', 'sagaloblis-sakheebi': 'საგალობელი',
  msakhureba: 'ღვთისმსახურება', khmebi: 'ხმა', 'tsirvis-natsilebi': 'წირვა', motsiqulebi: 'მოციქული',
  makhareblebi: 'მახარებელი', tsinastsarmetqvelebi: 'წინასწარმეტყველი', mtavarangelozebi: 'მთავარანგელოზი',
  'kartveli-tsmidanebi': 'წმიდანი', mepeebi: 'მეფე', mtserlebi: 'მწერალი', mdinareebi: 'მდინარე', mtebi: 'მთა',
  tadzrebi: 'ტაძარი', kalakebi: 'ქალაქი', kutkheebi: 'კუთხე', 'istoriuli-kutkheebi': 'კუთხე', tsekvebi: 'ცეკვა',
  vazi: 'ვაზი', kerdzebi: 'კერძი', khili: 'ხილი', damtserloba: 'დამწერლობა', 'kviris-dgheebi': 'კვირა',
  satnoebebi: 'სათნოება', sakhli: 'სახლი', supra: 'სუფრა', natesaoba: 'ნათესავი', 'musikis-terminebi': 'მუსიკა',
  tamashebi: 'თამაში', tsikheebi: 'ციხე', sadghegrdzeloebi: 'სადღეგრძელო', tskhovelebi: 'ცხოველი', prinvelebi: 'ფრინველი',
  kheebi: 'ხე', yvavilebi: 'ყვავილი', tbebi: 'ტბა', gmirebi: 'გმირი', brdzolebi: 'ბრძოლა', filmebi: 'ფილმი',
  mkhatvrebi: 'მხატვარი', kompozitorebi: 'კომპოზიტორი', vepkhistkaosani: 'ვეფხისტყაოსანი', zgaprebi: 'ზღაპარი',
  qveli: 'ყველი', tkbileuli: 'ტკბილეული', sporti: 'სპორტი', kurortebi: 'კურორტი', khelobebi: 'ხელობა',
  sakravebi: 'საკრავი', chokha: 'ჩოხა', kaba: 'კაბა',
};

/** what a region's song title may not hold: its own name's stems („გურული“, „მეგრული“, „მთიულური“) */
export const REGION_STEMS: Record<string, readonly string[]> = {
  abkhazeti: ['აფხაზ'], svaneti: ['სვან'], samegrelo: ['მეგრ', 'სამეგრ', 'ოდიშ'], racha: ['რაჭ', 'ლეჩხუმ'], imereti: ['იმერ'],
  guria: ['გურ'], achara: ['აჭარ'], samtskhe: ['მესხ', 'ჯავახ', 'სამცხ'], shidakartli: ['ქართლ'], kvemokartli: ['ქართლ'],
  mtianeti: ['მთიულ', 'მთის', 'მცხეთ', 'ფშა', 'ხევსურ', 'თუშ'], kakheti: ['კახ'], kalakuri: ['ქალაქ'],
};

const SONGS = /^songs-(.+)$/;

let cache: HangebiPuzzle[] | null = null;

/** every puzzle by word: its group's id, the answer and the clues it may give */
export const hangebiWordPuzzles = (): HangebiPuzzle[] => (cache ??= OTKHEULI_GROUPS.flatMap(g => {
  const region = SONGS.exec(g.id)?.[1];
  const answer = region ? HANGEBI_WORDS[KUTKHE_REGIONS.indexOf(region as typeof KUTKHE_REGIONS[number])] : KEY[g.id];
  if (!answer) return [];
  const words = cluesOf(answer, g.words, region ? REGION_STEMS[region] ?? [] : []);
  return words.length >= 4 ? [{ id: `w:${g.id}`, level: 'word' as const, answer, words }] : [];
}));
