// Recordings of chant versions from the user's Drive folders „ანჩისხატი“ (four albums, one per school) and
// „ალაზანი“ (Artem Erkomaishvili, Shavnabada). Each is bound to the book version (variant id) whose notes it
// follows: only where the school and the hymn leave one version — a chant with several versions of the same
// school (ხუნდაძე / კერესელიძე…, სადა / გამშვენებული) was left unbound. Erkomaishvili's recordings go to the vol. V
// versions the book itself credits to "ერქომაიშვილი". The notes page lists them next to the school's own recording.
import { AUDIO_PROXY, type ChantMediaItem } from './chantMediaRegistry';
import { recordingsAreHidden } from './runtimeRecordings';

export interface ChantRecording {
  id: string;  // Drive file id
  who: string; // performer
}

export const CHANT_RECORDINGS: Record<string, ChantRecording[]> = {
  'sd-v-4-8': [{ id: '1XcS-tKRLuqDNwuh0NCe8lFUmBGqHmLYW', who: 'ანჩისხატის გუნდი' }], // ჯვართამაღლება — 14 სექტემბერი · შესვლადი
  'sd-v-22-4': [{ id: '1Qchz6amQxVF3vkF4XhyMHRe_ZdWSlAfn', who: 'ანჩისხატის გუნდი' }, { id: '1dUjV01eXbu6AyePTq25P9tFi1d4apjzW', who: 'ანსამბლი „შავნაბადა“' }], // ბზობა — დიდმარხვის მეექვსე კვირიაკე · დასდებელი, ხმაჲ ვ
  'sd-v-33-4': [{ id: '1C5vM5kyRekbhYLObtEo7XB8l91ZUFQHE', who: 'ანჩისხატის გუნდი' }], // ღმრთისმშობლის მიძინება — 15 აგვისტო · მეცხრე ძლისპირი
  'zt-v-6-4': [{ id: '1ddhXhEbQm8U1xd5zZi-lt3_1KBvAi1h3', who: 'ანჩისხატის გუნდი' }], // პასექის წირვა · ეკლესიასა შინა
  'sd-v-13-8': [{ id: '1AGjRfr6m4VXdIB8nLs-0L2B6JKhgFrn2', who: 'ანჩისხატის გუნდი' }], // ქრისტეშობა — 25 დეკემბერი · კონდაკი, ხმაჲ გ
  'sd-v-6-1': [{ id: '1o6qqAafy135hDwGbm4viuBm9gsVnDMIT', who: 'ანჩისხატის გუნდი' }], // სვეტიცხოვლობა — 1 ოქტომბერი · ოხითა, ხმაჲ ჱ, გამშვენებული
  'zt-v-10-1': [{ id: '10PfWpQmeiOuxScfDwe82Mw4xqza5LzcC', who: 'ანჩისხატის გუნდი' }], // ყოველთა წმიდათა კვირიაკე · ყოვლისა სოფლისა წამებულთა, ხმა დ
  'sd-v-28-1': [{ id: '1DWwgA8yqlnt1LQ_-CTHJen4Qtr46QjBN', who: 'ანჩისხატის გუნდი' }], // სულთმოფენობა — პასექის შემდგომ მეერგასე დღე · ოხითა, ხმაჲ ჱ
  'sd-v-28-3': [{ id: '1w5Ip0Fn3A1nV8HseswB_YbLe1Hxgy2O3', who: 'ანჩისხატის გუნდი' }], // სულთმოფენობა — პასექის შემდგომ მეერგასე დღე · დასდებელი, ხმაჲ ვ
  'sd-v-31-1': [{ id: '1mPXxMZCHuoMUh5MtNUNEUTxEDagQDl1K', who: 'ანჩისხატის გუნდი' }], // პეტრე-პავლობა — 29 ივნისი · ოხითა, ხმაჲ დ
  'mx-v-1-2': [{ id: '1x9jtraKKo1mBuzMpsXOOi7eZT8nP8jjU', who: 'ანჩისხატის გუნდი' }], // დიდმარხვის ცისკარი — შემდგომად მიწყალესა · მსწრაფლ განუხვენ, ხმა ჱ
  'sd-v-32-1': [{ id: '15gajObrF31iVp1bEk9R8hrtqiYFojUE5', who: 'ანჩისხატის გუნდი' }], // ფერისცვალება — 6 აგვისტო · ოხითა, ხმაჲ გ
  'sd-v-28-5': [{ id: '1VPnxYaHzeLYOqmGRvGQev-OUcOMne9wK', who: 'ანჩისხატის გუნდი' }], // სულთმოფენობა — პასექის შემდგომ მეერგასე დღე · მეცხრე გალობის I ძლისპირი
  'mx-v-20-3': [{ id: '1bmoGCpUwagu4pOlaIeJ2hBja45cLb87k', who: 'ანჩისხატის გუნდი' }], // დიდი შაბათი · ნუ მტირ მე, დედაო, ხმა ვ
  'sd-v-30-1': [{ id: '1rfSbHP0FNLDjaNtqiPjyinhpKmkau5mg', who: 'ანჩისხატის გუნდი' }], // წმიდა გიორგი მთაწმინდელი — 27 ივნისი · ოხითა, ხმაჲ ე, გამშვენებული
  'sd-v-15-1': [{ id: '1o_iIvTFCjVvmOwabBl6iw2uCfiKjwvhW', who: 'ანჩისხატის გუნდი' }], // ნათლისღება — 6 იანვარი · ოხითა, ხმაჲ ა
  'ck-v-4-x81': [{ id: '1uNT0K6rqZrWdE0CaeZvQOge7ntsdRjS4', who: 'ანჩისხატის გუნდი' }], // ტროპარი აღდგომისაჲ · რაჟამს შთახედ საფლავად, ხმა ბ
  'sd-v-13-9': [{ id: '1ZGT4PVwAm9Wfov3oKOJJgbH6X9JjT20K', who: 'ანჩისხატის გუნდი' }], // ქრისტეშობა — 25 დეკემბერი · რაოდენთა ქრისტეს მიერ
  'sd-v-4-4': [{ id: '13vp3diEuKkLHxKiwt5vViFfo7eyWiVDf', who: 'ანჩისხატის გუნდი' }], // ჯვართამაღლება — 14 სექტემბერი · მეცხრე ძლისპირი
  'sd-v-17-1': [{ id: '1h_3bg65fHNCmQbX6xIuVF_TxbiFNf-iE', who: 'ანჩისხატის გუნდი' }], // წმიდა დავით აღმაშენებელი — 26 იანვარი · ოხითა, ხმაჲ დ
  'sd-v-13-7': [{ id: '1yx36YHO5NAgR524M3Ur1RZvJDiKivwu0', who: 'ანჩისხატის გუნდი' }], // ქრისტეშობა — 25 დეკემბერი · შესვლადი
  'sd-v-26-4': [{ id: '1PnHfC9Lwd-u_BDPE9rMPZH8awloUvQAE', who: 'ანჩისხატის გუნდი' }], // ამაღლება — პასექის შემდგომ მეექვსე ხუთშაბათი · მეცხრე ძლისპირი
  'sd-v-32-4': [{ id: '1oUtS8ejC08TQ5dex9K7HouZ4rXtHZiEe', who: 'ანჩისხატის გუნდი' }], // ფერისცვალება — 6 აგვისტო · მეცხრე ძლისპირი
  'mx-v-6-14': [{ id: '1FGo-J26lf8XWk8L74W8yvQUNyY8M-5CR', who: 'ანჩისხატის გუნდი' }], // ანდრია კრეტელის კანონი · სულო ჩემო, ხმა ვ
  'sd-v-34-1': [{ id: '1bcN3_k2TiRDhz5-phwJ2Xy4MdAj6YBUo', who: 'ანჩისხატის გუნდი' }], // ანჩისხატობა — 16 აგვისტო · ოხითა, ხმაჲ ბ, გამშვენებული
  'sd-v-15-4': [{ id: '1zGpefYVMTSxNvptGraTzQt4VIvdN84Eq', who: 'ანჩისხატის გუნდი' }], // ნათლისღება — 6 იანვარი · მეცხრე ძლისპირი
  'sd-v-1-1': [{ id: '1vPmIoS3Jjsi4dqkJNDIKc5-BIa5HUYMS', who: 'ანჩისხატის გუნდი' }], // საეკლესიო ახალი წელი — 1 სექტემბერი · ოხითა, ხმაჲ ბ
  'ck-v-6-k1': [{ id: '1xSGjPLi81ecDbZOLAGP_J_FZtZDQkoUc', who: 'ანჩისხატის გუნდი' }], // აქებდით სახელსა უფლისასა
  'mw-v-19-k1': [{ id: '19Qp7GiRcJ1ENtHmYcm_8SqkRHsDsnN65', who: 'ანჩისხატის გუნდი' }], // აწ განუტევე მონაჲ შენი
  'ck-v-24-k1': [{ id: '1w4aDfTlFTh5yvy8zNcMSUlq9a82gLpKV', who: 'ანჩისხატის გუნდი' }], // დიდება მაღალიანი
  'ck-v-1-k1': [{ id: '1yuOHqIqQ6n9fEvZaLEh0p9x7XgTzAUEC', who: 'ანჩისხატის გუნდი' }], // დიდებაჲ მაღალთა შინა ღმერთსა
  'sd-v-13-kb44': [{ id: '1sF9bwGrNy-Z-_PP3FkDASKRaGZLp9UgP', who: 'ანჩისხატის გუნდი' }], // ქრისტეშობა — 25 დეკემბერი · III ძლისპირი, ხმა ა
  'zt-v-3-pt4': [{ id: '17onNBn7spBcrfAssk5QvxpWZmoPDJx3h', who: 'ანჩისხატის გუნდი' }], // პასექის ცისკარი — კანონი, VII–IX გალობა · ადიდებს სული ჩემი
  'zt-v-1-pt1': [{ id: '1GYgUvPTgNbl_QBhXoS-oOyfX7jXZGZzS', who: 'ანჩისხატის გუნდი' }, { id: '1yZL0AdnvBqK_A65hI5MAuvCPp9xWPl5m', who: 'ანსამბლი „სახიობა“' }, { id: '1xMDOYo0fYeMocvriohYSPCN_4gf0f7iO', who: 'აფშილავები' }, { id: '14r8UhbA34LvaKwd1Pkzgcz8kPRbGYRq8', who: 'ივეტ გრიმოს ექსპედიცია' }], // პასექი — ქრისტე აღდგა · აღდგომასა შენსა, ხმა ვ
  'zt-v-3-pt5': [{ id: '1zXtwG_oH2N9bqBvtMDb4Vtkoh_TxWK0J', who: 'ანჩისხატის გუნდი' }], // პასექის ცისკარი — კანონი, VII–IX გალობა · ანგელოზი ღაღადებს
  'sd-v-22-pt14': [{ id: '1OVXp0_D8nYe9YrV6-fRI6g8G-jd6kIxf', who: 'ანჩისხატის გუნდი' }, { id: '1UGpnUXrzMcUg8kJGDNJ4jiR6tAuvzQZX', who: 'ანსამბლი „ქართული ხმები“' }, { id: '19r_NdeUsgmS-1iNr1MJ7JlTcYsZLex6m', who: 'აფშილავები' }], // ბზობა — დიდმარხვის მეექვსე კვირიაკე · დღეს საღმრთომან მადლმან, ხმა ვ
  'chant-v-47-pt11': [{ id: '1M78_Xwy0JdhYJ1_IJH_LqpCmgWDlzJYm', who: 'ანჩისხატის გუნდი' }], // ისპოლა · ისპოლა
  'zt-v-1-pt3': [{ id: '1vfNMn6RrslDxjfthIOjbwW2QbrFHHBsl', who: 'ანჩისხატის გუნდი' }, { id: '1npZO76p3QBR2-B5ejoTT4vRzn-jA_tlm', who: 'ანსამბლი „სახიობა“' }], // პასექი — ქრისტე აღდგა · ქრისტე აღდგა
  'zt-v-2-pt6': [{ id: '1gI4R3O8CwJzyoAQ7es3TFprM27ymJAGR', who: 'ანჩისხატის გუნდი' }], // პასექის ცისკარი — კანონი, I–VI გალობა · მოვედით და ვსვათ
  'mx-v-3-pt8': [{ id: '1ERS1-1Myg6hsp9R6o0o3x42spa6DXetI', who: 'ანჩისხატის გუნდი' }], // ხორციელის შაბათი · რაჟამს მოხვიდე, ღმერთი, ხმა ა
  'mx-v-15-pt17': [{ id: '1X65f2Un60zhQZu84htdf021wFEN9ZVsp', who: 'ანჩისხატის გუნდი' }], // დიდმარხვის მე-6 შაბათი · სიყვარულმან მოგიყვანა
  'sd-v-15-pt9': [{ id: '1J7cNpTpiSz5xhoZFiI-8CmUqAaYkZg06', who: 'ანჩისხატის გუნდი' }], // ნათლისღება — 6 იანვარი · ვერ-შემძლებელ ვართ
  'chant-v-6-pt2': [{ id: '1hDOn0sEuhJYyhMZKyJ8tIjD_MR7zYbvR', who: 'ანჩისხატის გუნდი' }], // მც. კვერექსი · კვერექსი
  'v-24-6': [{ id: '1IygHkatspnlHsuhk8DAtCROKi4t3sZtG', who: 'ანჩისხატის გუნდი' }, { id: '1j0hggfMPgjGeHXTQocyRzRXaD1M0Bfzu', who: 'არტემ ერქომაიშვილი' }], // მრწამსი · ერქომაიშვილი
  'v-30-6': [{ id: '1nlK-tyQ5K1CSpHLx5DN7lcgaZ1ZBQMfW', who: 'ანჩისხატის გუნდი' }, { id: '1abRG71YLMEPgHZpZ-DYlP9pZNqFdRtZe', who: 'არტემ ერქომაიშვილი' }], // ამინ; შენ გიგალობთ · ერქომაიშვილი
  'v-26-6': [{ id: '10iNFBTz_f8HAXhvGW9oiYGj-a_IDH1Up', who: 'არტემ ერქომაიშვილი' }], // და სულისაცა · ერქომაიშვილი
  'v-45-6': [{ id: '1OzrjErNnf7vwEUf86RW8Dq6u-TVEoLVr', who: 'არტემ ერქომაიშვილი' }], // სახელითა უფლისათა; დიდება აწცა · დიდება, აწ და
  'v-37-6': [{ id: '1fS8esD4ualnbxMTJI36fdmV8hWld9faD', who: 'არტემ ერქომაიშვილი' }], // ერთ არს · ერქომაიშვილი
  'v-28-6': [{ id: '1BnfROfTKe03GbLUsq6ddG4D7UtFo18CO', who: 'არტემ ერქომაიშვილი' }], // ღირს არს და მართალ · ერქომაიშვილი
  'v-27-6': [{ id: '1K4ynuevibE4orOgONY7-MaKXcvf38tpe', who: 'არტემ ერქომაიშვილი' }], // გუაქვს უფლისა მიმართ · ერქომაიშვილი
  'v-33-6': [{ id: '168xNtmna1F98-4ar5h4j3UtzsO2V_G4I', who: 'არტემ ერქომაიშვილი' }], // ყოველთა და ყოვლისათვის · ერქომაიშვილი
  'v-25-6': [{ id: '1TY1FIYAtD4WdBbFmDtB0GKQKyb90Mh2W', who: 'არტემ ერქომაიშვილი' }], // წყალობა, მშვიდობა · ერქომაიშვილი
  'v-40-6': [{ id: '1c3XdKuJQPxX7o44gsQyUXNMIYwVzgpkJ', who: 'არტემ ერქომაიშვილი' }], // ხორცი ქრისტესი · ერქომაიშვილი
  'zt-v-1-kb165': [{ id: '1L-c-oHwrW5vqpacUWDHlIXfFgrS5RmfV', who: 'ანსამბლი „სათანაო“' }], // პასექი — ქრისტე აღდგა · აღდგომასა შენსა, ხმა ვ (ქართლ-კახური)
};

/** Other choirs' recordings of one book version (guests see no recordings at all) */
export const chantRecordings = (variantId?: string): ChantRecording[] =>
  (variantId && !recordingsAreHidden() && CHANT_RECORDINGS[variantId]) || [];

/** Player media for one of them: a single full track */
export const chantRecordingMedia = (r: ChantRecording, title: string): ChantMediaItem => ({
  key: `rec:${r.id}`,
  title,
  folderId: '',
  folderUrl: '',
  tracks: ['', '', '', `${AUDIO_PROXY}/${r.id}`],
  availableVoices: { voice1: false, voice2: false, voice3: false, all: true },
  notes: [],
});
