// Recordings of chant versions from the user's Drive folders „ანჩისხატი“ (four albums, one per school) and
// „ალაზანი“ (Artem Erkomaishvili, Shavnabada). Each is bound to the book version (variant id) whose notes it
// follows: only where the school and the hymn leave one version — a chant with several versions of the same
// school (ხუნდაძე / კერესელიძე…, სადა / გამშვენებული) was left unbound. Erkomaishvili's recordings go to the vol. V
// versions the book itself credits to "ერქომაიშვილი". The notes page lists them next to the school's own recording.
import { AUDIO_PROXY, type ChantMediaItem } from './chantMediaRegistry';
import { recordingsAreHidden } from './runtimeRecordings';
import { ALL_CHANTS } from './gelatiBookChants';

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
  'zt-v-1-pt1': [{ id: '1GYgUvPTgNbl_QBhXoS-oOyfX7jXZGZzS', who: 'ანჩისხატის გუნდი' }], // პასექი — ქრისტე აღდგა · აღდგომასა შენსა, ხმა ვ
  'zt-v-3-pt5': [{ id: '1zXtwG_oH2N9bqBvtMDb4Vtkoh_TxWK0J', who: 'ანჩისხატის გუნდი' }], // პასექის ცისკარი — კანონი, VII–IX გალობა · ანგელოზი ღაღადებს
  'sd-v-22-pt14': [{ id: '1OVXp0_D8nYe9YrV6-fRI6g8G-jd6kIxf', who: 'ანჩისხატის გუნდი' }], // ბზობა — დიდმარხვის მეექვსე კვირიაკე · დღეს საღმრთომან მადლმან, ხმა ვ
  'chant-v-47-pt11': [{ id: '1M78_Xwy0JdhYJ1_IJH_LqpCmgWDlzJYm', who: 'ანჩისხატის გუნდი' }], // ისპოლა · ისპოლა
  'zt-v-1-pt3': [{ id: '1vfNMn6RrslDxjfthIOjbwW2QbrFHHBsl', who: 'ანჩისხატის გუნდი' }], // პასექი — ქრისტე აღდგა · ქრისტე აღდგა
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

// Recordings whose school is known but no book version of it fits — the user's rule (2026-10-07): Gurian,
// the Erkomaishvilis, „11 მარგალიტი“ and F. Koridze are the Shemokmedi school, "გელათური" the Gelati school.
// Each becomes a recording-only version (no notes) in that school's row of the chant: [chant, school, hymn, performer, Drive file]
const RECORDING_VERSIONS: [string, 'შ.ს.' | 'გ.ს.', string, string, string][] = [
  ['zt-1', 'შ.ს.', 'აღდგომასა შენსა', 'არტემ ერქომაიშვილი', '1XL54MtNm5nN9ByidnFGA1OLJSk7U_OnE'],
  ['zt-6', 'შ.ს.', 'აღდგომის ანტიფონები', 'არტემ ერქომაიშვილი', '1Ml-tl-HGb0vjLAbH57duShD2T240a_2h'],
  ['zt-3', 'შ.ს.', 'აღდგომის IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1kOJOMk5iZjM3AqpBPgZzp2s_1vX1ZY33'],
  ['zt-3', 'შ.ს.', 'აღდგომის IX ძლისპირი', 'არტემ ერქომაიშვილი', '1wUa6uIQZhL4nm8x50Ceb4-KKABDf9rT8'],
  ['zt-2', 'შ.ს.', 'აღდგომისა დღე არს', 'არტემ ერქომაიშვილი', '1mB4hN6jSOQLupq7pXqI53neBledUpbnE'],
  ['chant-1', 'შ.ს.', 'აქსიოს', 'არტემ ერქომაიშვილი', '1QrAShom7Kh5O6ColrknjYwTgfBmru1Sr'],
  ['sd-26', 'შ.ს.', 'ამაღლდი დიდებით', 'არტემ ერქომაიშვილი', '1GXGnRkHVq9YA6nzwq21770PbjS42tPNL'],
  ['sd-26', 'შ.ს.', 'ამაღლების IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1JY0Wki-NrZf0wNUL35gKacY4Hwcz-mt_'],
  ['zt-3', 'შ.ს.', 'ანგელოზი ღაღადებს (1)', 'არტემ ერქომაიშვილი', '1s2awd27x_2T-3bHDqcyFrDn_9npvC8at'],
  ['zt-3', 'შ.ს.', 'ანგელოზი ღაღადებს (2)', 'არტემ ერქომაიშვილი', '1Sx7lFiaaCs99l682mteUINGx6BGoV-_f'],
  ['mx-8', 'შ.ს.', 'აწ ძალნი ცათანი', 'არტემ ერქომაიშვილი', '1zMNGAvPD6WaKHfEJ87gZ4f0uVm3eUvi8'],
  ['mw-19', 'შ.ს.', 'აწ განუტევე', 'არტემ ერქომაიშვილი', '11m-BjJDDenFjO8ymyr_sUidbHHBue2to'],
  ['sd-14', 'შ.ს.', 'ბასილი დიდის ტროპარი', 'არტემ ერქომაიშვილი', '1pRGQkcK-QtlDFCu_RZukZo28NOO_3Zby'],
  ['sd-22', 'შ.ს.', 'ბზობის IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1pb18UapmRgTmob3Wq6ltngLXX1ykt7p2'],
  ['zt-2', 'შ.ს.', 'დაღაცათუ ნებსით თვისით', 'არტემ ერქომაიშვილი', '1llvxxIj4tET3IINbvlmT8_VYg1-VFZ9t'],
  ['sd-21', 'შ.ს.', 'დღეს ცხოვრებისა ჩვენისა', 'არტემ ერქომაიშვილი', '1eBGD_XADAkSDhiI73q4T53zLNzXrHDRn'],
  ['zt-6', 'შ.ს.', 'ეკლესიასა შინა', 'არტემ ერქომაიშვილი', '1F3DxJ5N7nNTb3FOvMwR63kD0Kr7n1-6F'],
  ['zt-3', 'შ.ს.', 'ესე არს წმიდა', 'არტემ ერქომაიშვილი', '1tTfzeAdWndGVDfUBIxlghR0OmKGqGoOj'],
  ['zt-3', 'შ.ს.', 'განათლდი, განათლდი (1)', 'არტემ ერქომაიშვილი', '1u4-nuYe0KFnjlrofUGil9XDwz_Q7dhNa'],
  ['zt-3', 'შ.ს.', 'განათლდი, განათლდი (2)', 'არტემ ერქომაიშვილი', '1YjHvzqAYJcr8sJEoQb7DlwCK5H4U-d7p'],
  ['zt-2', 'შ.ს.', 'განვიწმიდნეთ საცნობელნი', 'არტემ ერქომაიშვილი', '1_mQ5I2jTkBlsggWCQ5my46yOC6Ye37xs'],
  ['sd-19', 'შ.ს.', 'გიხაროდენ, მიმადლებულო', 'არტემ ერქომაიშვილი', '1Ry44Bl-Y0ZokdH3MkJy7Vtn0wK-JcQ3c'],
  ['ck-3', 'შ.ს.', 'ღმერთი უფალი', 'არტემ ერქომაიშვილი', '1d-KVpWSqT5yzPvWEEgRjO_Sgp5NleYOI'],
  ['zt-2', 'შ.ს.', 'გუშინ შენთანა', 'არტემ ერქომაიშვილი', '1_u0OpU87gC4jh8s2l6E0O78ziAatBIYo'],
  ['chant-47', 'შ.ს.', 'ისპოლა', 'არტემ ერქომაიშვილი', '1cM1xdm1K996ZkNKNVcYXEg1QtZDfP-h3'],
  ['sd-13', 'შ.ს.', 'ქალწული დღეს არსებად', 'არტემ ერქომაიშვილი', '1OoEVliWaifuSCnTwykCpx2-dl2UsugF2'],
  ['sd-9', 'შ.ს.', 'კიდობანსა მას სჯულისასა', 'არტემ ერქომაიშვილი', '1R5spqTNNb2GEqYEFZlmHlEGMUBW_L7V-'],
  ['zt-1', 'შ.ს.', 'ქრისტე აღდგა (1)', 'არტემ ერქომაიშვილი', '1eFHi_kWgw-piA_AxqiM6nStab5becdEC'],
  ['zt-1', 'შ.ს.', 'ქრისტე აღდგა (2)', 'არტემ ერქომაიშვილი', '186-4hDiGIhOpEQ9A50GICcZZq_HAhOZO'],
  ['zt-1', 'შ.ს.', 'ქრისტე აღდგა (3)', 'არტემ ერქომაიშვილი', '1kva_PpTbKhzMZ7q9o5MkNQlw4rH5Mn85'],
  ['zt-1', 'შ.ს.', 'ქრისტე აღდგა (4)', 'არტემ ერქომაიშვილი', '1V4ufK05Hirc_ujNr_XoiwXr4JTqWJNOa'],
  ['sd-13', 'შ.ს.', 'ქრისტეს შობასა ვადიდებდეთ', 'არტემ ერქომაიშვილი', '18eirtP2ZZkiHKLQOOZByKwqERP_D5j9f'],
  ['chant-39', 'შ.ს.', 'კურთხეულ არს მომავალი', 'არტემ ერქომაიშვილი', '1V6SF7bTEagchq46CSKXS080DQ6tuAMN3'],
  ['sd-13', 'შ.ს.', 'კვერთხი იესეს', 'არტემ ერქომაიშვილი', '1HM2YiDzjXQEwUFjX-JUyD6nasMoP5XEG'],
  ['chant-35', 'შ.ს.', 'მამაო ჩუენო (1)', 'არტემ ერქომაიშვილი', '1pq2dF9OTQvQ_kGAvLvCbGNrr6F6CGjX9'],
  ['chant-35', 'შ.ს.', 'მამაო ჩუენო (2)', 'არტემ ერქომაიშვილი', '1u5OMF8cUhI_cEYXNvorO93l2mQwFFPHP'],
  ['sd-19', 'შ.ს.', 'მირქმის IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1SZWdq6LSReJMDY-44IveQHx_awzg5zuG'],
  ['zt-2', 'შ.ს.', 'მოვედით და ვსვათ', 'არტემ ერქომაიშვილი', '1NrFHfgH3rcIoPbiUN5mV4UVEtW5lNKng'],
  ['mx-20', 'შ.ს.', 'შვენიერმან იოსებ', 'არტემ ერქომაიშვილი', '19TMD4X_2R7jIPcgKKdRk_dLuSH5KEU8r'],
  ['sd-32', 'შ.ს.', 'მთასა ზედა', 'არტემ ერქომაიშვილი', '1RWddjWPT19-m-HFx4gGyy__mwFd-Ejx9'],
  ['sd-15', 'შ.ს.', 'ნათლისღების ანტიფონები', 'არტემ ერქომაიშვილი', '1zLmUlnR4eWZ-JoweFGiPi0Vm_97pGs9M'],
  ['sd-15', 'შ.ს.', 'ნათლისღების IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1qjosY11KB68mERb3Vhsc4aCcGUrOYroZ'],
  ['zt-1', 'შ.ს.', 'პასექი ბრწყინვალედ მშვენიერი', 'არტემ ერქომაიშვილი', '1CDqy1-yeIGZXu1r-2rqK8QJHGIUQiuM2'],
  ['sd-32', 'შ.ს.', 'ფერისცვალების ანტიფონები', 'არტემ ერქომაიშვილი', '1Lk_nxK4NVZPrsYh6SJ0GIxiUWOmbrSMj'],
  ['sd-32', 'შ.ს.', 'ფერისცვალების IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1WIJlChhcsSPGMejUL2eCbvpgnZyKZrBy'],
  ['mx-18', 'შ.ს.', 'რაჟამს დიდებულნი მოწაფენი', 'არტემ ერქომაიშვილი', '1TW6JGLGRjPbXL93xBHZwNlIE7_YstBMN'],
  ['sd-15', 'შ.ს.', 'რაჟამს იორდანეს', 'არტემ ერქომაიშვილი', '1zlB3xnYD4a3TUjXGQU-cDudJDhY9g8va'],
  ['mx-3', 'შ.ს.', 'რაჟამს მოხვიდე, ღმერთო', 'არტემ ერქომაიშვილი', '17kYj9mHjdK2HyIko5p6mlH-tWSPTtqqf'],
  ['ck-4', 'შ.ს.', 'რაჟამს შთახედ', 'არტემ ერქომაიშვილი', '1avICMhaE_8sZVLwyGLCOTmqQu0BpWbS2'],
  ['chant-12', 'შ.ს.', 'რაოდენთა ქრისტეს მიერ', 'არტემ ერქომაიშვილი', '1w-cg-aM_gCYgwO_IUp_xEDDAUSst9UiW'],
  ['mx-5', 'შ.ს.', 'რომელმან მეცხრესა ჟამსა', 'არტემ ერქომაიშვილი', '1EP_DUb4wWYo31rqoSEwI0wMNjaV0LBDt'],
  ['zt-2', 'შ.ს.', 'საღმრთოსა სახმილავსა', 'არტემ ერქომაიშვილი', '1hpMg9TIQAP8_XAfQU9FobqndU_eUCAMh'],
  ['sd-13', 'შ.ს.', 'საიდუმლო უცხო და დიდებული', 'არტემ ერქომაიშვილი', '1ZY01yiYA8vIh9GWFKktFgChw_JIQHIl_'],
  ['sd-13', 'შ.ს.', 'საშოით მთიებისა', 'არტემ ერქომაიშვილი', '1A5phPUswgVNYvqr8AHs-Mi3XLd8D7jVv'],
  ['chant-31', 'შ.ს.', 'შენდამი იხარებს', 'არტემ ერქომაიშვილი', '1PW0glq51BHj307sb_AQW6AKqVYjoUGjq'],
  ['sd-26', 'შ.ს.', 'ჰშევ ქალწულო', 'არტემ ერქომაიშვილი', '1PoF9rWNeELDgFl__cUz1EyeKKPJqJ12c'],
  ['sd-32', 'შ.ს.', 'შობა შენი უხრწნელ არს', 'არტემ ერქომაიშვილი', '1SfBA2FxTXx3xKiArqQe-SM8zn4loa-Zm'],
  ['sd-13', 'შ.ს.', 'შობის IX ძლისპირის ჩასართავი', 'არტემ ერქომაიშვილი', '1Ud_x8nMl_mHoW08W26wmZzIRKGEwiPCI'],
  ['sd-16', 'შ.ს.', 'სიტყვისა ღვთისა', 'არტემ ერქომაიშვილი', '1yaAd7_dgjP9tWMIz-wFoBfz3wSX71P2f'],
  ['sd-8', 'შ.ს.', 'ტყვეთა განმათავისუფლებელო', 'არტემ ერქომაიშვილი', '1ayqJv0j0fd5ahbZDorPut-Yy-NaVJm4o'],
  ['chant-2', 'შ.ს.', 'ტონ დესპოტინ', 'არტემ ერქომაიშვილი', '1Wk42bGi0DKYcnxZS1bkxZ_crJzGVMYLH'],
  ['mx-8', 'შ.ს.', 'წარემართენ ლოცვა ჩემი', 'არტემ ერქომაიშვილი', '1Ru9dOa0dGAdT1IaKBvWh8GKAkQXdvNkC'],
  ['sd-19', 'შ.ს.', 'წერილთა მიერ სჯულისათა', 'არტემ ერქომაიშვილი', '1-hc-BWHMatGRcDAmg_CzipktZ6AW-C35'],
  ['zt-2', 'შ.ს.', 'ცისკარსა მსთვად', 'არტემ ერქომაიშვილი', '1gnrHXzwAqOQf37yey-aZNaBxrWaiYEKk'],
  ['mw-7', 'შ.ს.', 'უფალო, ღაღად-ვყავ', 'არტემ ერქომაიშვილი', '1mgEBw80SzH3A7D5k3rj8BdSL43xieRkt'],
  ['sd-32', 'შ.ს.', 'უფალო, მოგვივლინე', 'არტემ ერქომაიშვილი', '1jKTUNeLfjYG6fC2-sfsdQnSNmm6UInmR'],
  ['mx-5', 'შ.ს.', 'უფალო, რომელმან', 'არტემ ერქომაიშვილი', '1dvyNQQ1x0--NR61B5yzuODi6IH8n2qhE'],
  ['sd-15', 'შ.ს.', 'ვერ-შემძლებელ ვართ', 'არტემ ერქომაიშვილი', '1PF6LGoi9noU4PKLPRA1U7TfvUKPmpk8l'],
  ['sd-7', 'შ.ს.', 'ზეცისა მხედრობათა', 'არტემ ერქომაიშვილი', '1Y1Juwgq68JJldiln-69OjcdIxvLY4n9L'],
  ['zt-3', 'შ.ს.', 'ანგელოზი ღაღადებს', 'ანჩისხატის გუნდი', '1EK1PybadWG92ISHvdTJBTxQ4-zXmaDcE'],
  ['mw-19', 'შ.ს.', 'აწ განუტევე', 'ანჩისხატის გუნდი', '1OpbjMjfKMhIPDsfhq0OHtfMnQCYNbW14'],
  ['zt-2', 'შ.ს.', 'დაღაცათუ ნებსით თვისით', 'ანჩისხატის გუნდი', '1cpoitWQfLOIqYMvTKi3ikC6RX72BnuBT'],
  ['zt-3', 'შ.ს.', 'განათლდი, განათლდი', 'ანჩისხატის გუნდი', '1tR_unx32KDAdi_b18EKWF4QWm_Wm0-ZO'],
  ['ck-3', 'შ.ს.', 'ღმერთი უფალი', 'ანჩისხატის გუნდი', '1x2NoOwMw2oKPdi5NNwAsDerEAoSuGjJN'],
  ['sd-13', 'შ.ს.', 'ქალწული დღეს არსებად', 'ანჩისხატის გუნდი', '1MYotbneEVIXtVjm-ErNdY9qEH2ofVTHz'],
  ['zt-1', 'შ.ს.', 'ქრისტე აღდგა', 'ანჩისხატის გუნდი', '1ZzNOUwGabYYecgtqFBsnSDIxSuaIq1S2'],
  ['sd-13', 'შ.ს.', 'ქრისტეს შობასა ვადიდებდეთ', 'ანჩისხატის გუნდი', '19J2ItuyWFanLbbrUp9YD-TDGPT-7GsmA'],
  ['sd-13', 'შ.ს.', 'კვერთხი იესეს', 'ანჩისხატის გუნდი', '11ohBdEaH3gVTKYimA1fCCwC4c_5pF-CW'],
  ['chant-35', 'შ.ს.', 'მამაო ჩუენო', 'ანჩისხატის გუნდი', '1Ts8LiCe9IIAMdT3SIFXEgQfUYLqR7Hsv'],
  ['zt-2', 'შ.ს.', 'მოვედით და ვსვათ', 'ანჩისხატის გუნდი', '1qjR_EZhXLgYHsF6FmXa822csUx7yAdcD'],
  ['sd-32', 'შ.ს.', 'მთასა ზედა', 'ანჩისხატის გუნდი', '1kGjAB4sb-UeIl5bj2506nusskSWwIJ0H'],
  ['sd-15', 'შ.ს.', 'რაჟამს იორდანეს', 'ანჩისხატის გუნდი', '1fgVqWi1NOSIYmwDWh-qdkHj9xT1NmfDg'],
  ['ck-4', 'შ.ს.', 'რაჟამს შთახედ საფლავად', 'ანჩისხატის გუნდი', '1zdGl6kAF5SQoeVRK2Rnu8vIBOkE4QGUJ'],
  ['sd-32', 'შ.ს.', 'შობა შენი', 'ანჩისხატის გუნდი', '19omsldCe65_edzdUVY-KOPPvyWc3ZQzp'],
  ['mx-15', 'შ.ს.', 'სიყვარულმან მოგიყვანა (1)', 'ანჩისხატის გუნდი', '1T-wXUMfD-1M9KOHrDhKfevVgcykTPeSX'],
  ['mx-15', 'შ.ს.', 'სიყვარულმან მოგიყვანა (2)', 'ანჩისხატის გუნდი', '1rx9SIPWA2eyOZuzI5Kjp5R0N16HEwuAg'],
  ['sd-8', 'შ.ს.', 'ტყვეთა განმათავისუფლებელო', 'ანჩისხატის გუნდი', '1oD9niWik_E1a8m0BxMstB8X9kQ9DDJuF'],
  ['zt-2', 'შ.ს.', 'ცისკარსა მსთვად', 'ანჩისხატის გუნდი', '11yG9wJtvlSjHUqtX_Ryj6DKTMnfDoxTb'],
  ['mw-7', 'შ.ს.', 'უფალო, ღაღად-ვყავ', 'ანჩისხატის გუნდი', '1EBFxqxXc2uiHPTq620LG0AojeHzl7gBl'],
  ['sd-32', 'შ.ს.', 'უფალო, მოგვივლინე', 'ანჩისხატის გუნდი', '1HO73iEnQ3itWgE4kJXUUdOi998Xm_bSE'],
  ['mx-5', 'შ.ს.', 'უფალო, რომელმან (1)', 'ანჩისხატის გუნდი', '1HTElLONSgn7CNIMwge6aEonild7w3Lwl'],
  ['mx-5', 'შ.ს.', 'უფალო, რომელმან (2)', 'ანჩისხატის გუნდი', '1asIdhJw8e3miM21ReD4ntVOt7IJaUUKg'],
  ['sd-7', 'შ.ს.', 'ზეცისა მხედრობათა', 'ანჩისხატის გუნდი', '1svgsAPkl0RJGf4_Zp41r-an0r2CTCv-d'],
  ['zt-2', 'შ.ს.', 'აღდგომისა დღე არს', '„11 მარგალიტი“', '1j9nB14bMICyNIsMhMNgDqi6J4Af2tUWZ'],
  ['zt-3', 'შ.ს.', 'განათლდი, განათლდი', '„11 მარგალიტი“', '1Q3ECcSGeM-0Ivnfb5CFIXHCfTR2vbNwQ'],
  ['sd-13', 'შ.ს.', 'საიდუმლო უცხო', '„11 მარგალიტი“', '1VjUcVFV3uNHV3T52qUcRNjkA7jx0uMTI'],
  ['mx-15', 'შ.ს.', 'სიყვარულმან მოგიყვანა', '„11 მარგალიტი“', '1LGxRPwbaYhgFhIuT5tvhYxIFK9SFytir'],
  ['mx-15', 'შ.ს.', 'სიყვარულმან მოგიყვანა', 'არტემ ერქომაიშვილი', '1rzM_zDWTFEJcjZon4jLL0dgHfOOBcbrr'],
  ['sd-32', 'შ.ს.', 'შობა შენი', 'გიგო ერქომაიშვილი', '1_2rTYCJo03Fl0hn22UVEd6KK2GJneWzM'],
  ['sd-32', 'შ.ს.', 'შობა შენი უხრწნელ არს', 'ანსამბლი „რუსთავი“', '1nsp47CYRqz4N6xOsHVcJ76k5wGhy7Bfz'],
  ['sd-22', 'შ.ს.', 'დღეს საღმრთომან მადლმან', 'ბორჯომის კონფერენცია', '1jGc22ZvCtpg3uoxwxDVS_dtOVzTOFsKc'],
  ['sd-28', 'შ.ს.', 'მეუფეო ზეცათაო', 'ბორჯომის კონფერენცია', '18ZVyzozPrnuLhSgZF7XEbnF0lf7kUhC1'],
  ['zt-1', 'შ.ს.', 'აღდგომასა შენსა', '„ქართული ხალხური მუსიკა“ (გურია)', '1nRtFZipyAW5TE9x4hxhlbHJNt5sMRUm0'],
  ['sd-28', 'შ.ს.', 'მეუფეო ზეცათაო', '„ქართული ხალხური მუსიკა“ (გურია)', '1bzWGLdXAp3Qj8Zh1yqVL0JY_x6YWGXNP'],
  ['zt-2', 'შ.ს.', 'მოვედით და ვსვათ', '„ქართული ხალხური მუსიკა“ (გურია)', '14gqCv_XgEpwUPvTL9oUv53mktKMnv6cB'],
  ['mw-20', 'გ.ს.', 'ღმრთისმშობელო ქალწულო', 'ანსამბლი „შავნაბადა“', '1axduu1owiFXlnZUIeo6tRBalxoV7tT3Z'],
  ['sd-13', 'შ.ს.', 'შობის შესვლადი (ფ. ქორიძე)', 'ანსამბლი „შავნაბადა“', '1XxNMUm8O7wtfIqDsib8mNHWR74oRbBoZ'],
  ['sd-8', 'შ.ს.', 'წმ. გიორგის ტროპარი', 'ანსამბლი „შავნაბადა“', '14npA6JUnEMJunxckTZjPOCdG0IFkLFiD'],
  ['mx-5', 'შ.ს.', 'უფალო, რომელმან', 'ანსამბლი „შავნაბადა“', '113RzySfMdXcFoDzilKMMRJ4MQ1Hb7RIA'],
];

const SCHOOL_LABELS = { 'შ.ს.': 'შემოქმედის სკოლა', 'გ.ს.': 'გელათის სკოლა' };
const recordingVersionIds = new Set<string>();
// added to the chants once, when this module loads: a feast's (or Lent's, Pascha's) button is named after the hymn
// with the performer under it; a single chant's button after the performer
RECORDING_VERSIONS.forEach(([chantId, school, hymn, who, file], i) => {
  const id = `rv-${i + 1}`;
  const chant = ALL_CHANTS.find(c => c.id === chantId);
  if (!chant || chant.variants.some(v => v.id === id)) return;
  const occasion = /^(sd|mx|zt)-/.test(chantId);
  chant.variants.push({
    id,
    code: `${school} ჩ${i + 1}`,
    label: SCHOOL_LABELS[school],
    chantName: chant.title,
    fullTitle: `${chant.title.replace(/[;\s]+$/, '')} — ${hymn}`,
    version: occasion ? hymn : who,
    source: occasion ? who : 'ჩანაწერი',
  });
  CHANT_RECORDINGS[id] = [{ id: file, who }];
  recordingVersionIds.add(id);
});

/** A version that is only a recording (no notes): listed with its performer, plays in the list itself */
export const isRecordingVersion = (variantId: string) => recordingVersionIds.has(variantId);
