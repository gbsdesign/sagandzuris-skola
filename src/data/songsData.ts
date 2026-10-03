// Folk songs ("სიმღერა" section): Georgia's regions on the map and the songs from the
// user's Drive folders "1. აღმოსავლეთ საქართველო", "2. დასავლეთ საქართველო", "3. ქალაქური".
// Audio is played from Drive through the Cloudflare Worker (see chantMediaRegistry.ts).
import { AUDIO_PROXY, type ChantMediaItem } from './chantMediaRegistry';

export type FolkRegionId =
  | 'abkhazeti' | 'svaneti' | 'samegrelo' | 'racha' | 'imereti' | 'guria' | 'achara'
  | 'samtskhe' | 'shidakartli' | 'kvemokartli' | 'mtianeti' | 'kakheti' | 'kalakuri';

export interface FolkRegion {
  id: FolkRegionId;
  nameGe: string;
  regionCode: string;
  color: string; // map fill, wooden-puzzle palette
}

export const FOLK_REGIONS: FolkRegion[] = [
  { id: 'abkhazeti', nameGe: 'აფხაზეთი', regionCode: 'აფხ.', color: '#a3c27f' },
  { id: 'svaneti', nameGe: 'სვანეთი', regionCode: 'სვან.', color: '#dcb25e' },
  { id: 'samegrelo', nameGe: 'სამეგრელო', regionCode: 'სამეგ.', color: '#d9a294' },
  { id: 'racha', nameGe: 'რაჭა-ლეჩხუმი', regionCode: 'რაჭ.', color: '#a9c274' },
  { id: 'imereti', nameGe: 'იმერეთი', regionCode: 'იმერ.', color: '#f0e2c6' },
  { id: 'guria', nameGe: 'გურია', regionCode: 'გურ.', color: '#8fb87a' },
  { id: 'achara', nameGe: 'აჭარა', regionCode: 'აჭარ.', color: '#e7b4a6' },
  { id: 'samtskhe', nameGe: 'სამცხე-ჯავახეთი', regionCode: 'მესხ.', color: '#e9c06c' },
  { id: 'shidakartli', nameGe: 'შიდა ქართლი', regionCode: 'ქართლ.', color: '#e6bcae' },
  { id: 'kvemokartli', nameGe: 'ქვემო ქართლი', regionCode: 'ქ. ქართლ.', color: '#a7c47e' },
  { id: 'mtianeti', nameGe: 'მცხეთა-მთიანეთი', regionCode: 'მთიან.', color: '#b9786b' },
  { id: 'kakheti', nameGe: 'კახეთი', regionCode: 'კახ.', color: '#efb460' },
  { id: 'kalakuri', nameGe: 'ქალაქური', regionCode: 'ქალაქ.', color: '#85502c' },
];

export const getFolkRegion = (id: FolkRegionId) => FOLK_REGIONS.find(r => r.id === id)!;

// Drive file ids of one recording's tracks
export interface SongTracks {
  all?: string; // full song / all voices together
  v1?: string;
  v2?: string;
  v3?: string;
}

export interface SongVersion {
  label: string;
  tracks: SongTracks;
}

// Sheet music (PDF/image) and info sheets, opened in Drive
export interface SongDoc {
  name: string;
  id: string;
}

export interface FolkSong {
  id: string;
  num?: string; // number in the Drive folder name
  title: string;
  region: FolkRegionId;
  // Where the song comes from, below the title next to the region. Only set when a source names the place.
  municipality?: string; // e.g. 'ახმეტის მუნ.'
  area?: string; // historical area or village, e.g. 'თუშეთი', 'სოფ. ანაგა'
  versions: SongVersion[];
  lyrics?: string;
  docs?: SongDoc[];
  // .wma recordings browsers can't play; bound as versions once converted to mp3
  pendingWma?: string[];
  ownerOnly?: boolean; // listed only for the owner's account and admins
  soundcloud?: string; // SoundCloud track URL, played in SoundCloud's own compact widget
}

const one = (label: string, all: string): SongVersion => ({ label, tracks: { all } });

export const FOLK_SONGS: FolkSong[] = [
  // ───────── აღმოსავლეთ საქართველო ─────────
  {
    id: 'fs-e8', num: '8', title: 'ცანგალა და გოგონა', region: 'kakheti',
    versions: [{ label: 'ხმები', tracks: { v1: '1_8iUuEvf7sxN0Dvp8cLlA0YhJGpMLgHB', v2: '1JkqPPC0yCDn-TYpIa3D2op0pBfSUr1sk', v3: '14b0KPx9mT9sjCuVHFmghTJ4xJCeXrN75' } }],
    lyrics: `ცანგალა და გოგონა-ა
ცანგალა გოგონა-ა (2)
გოგნი გოგნი გოგნი გოგნი
გოგნი გოგნი გოგონაა
გოგნი გოგნი გოგნი გოგო
გოგნი გოგნი გოგონა

ცანგალა ქალაქს წავიდა
ყურძენი მოიპარა
ყურძენი თვითონ შეჭამა
საფლავი გაითხარა

ეს ბიჭი კარგად თამაშობს
ფეხის წვერებზე დგებაა
ამან რომ რამე იტკინოს
გოგონას დაბრალდება`,
  },
  {
    id: 'fs-e17', num: '17', title: 'გოგოვ, გოგოვ, შავთვალა', region: 'shidakartli',
    versions: [
      { label: 'სრული', tracks: { all: '1-johyWDqloTxWwxxd3C9kaiZ1vOHrRbj', v1: '1KDrYn1SxaCZbP-VtQUXSZ0UYah64yH5K', v2: '1prX2tjtltiMRMvGAMgbVg1bVI_bfpi-d', v3: '11QpllI3Pq9XJCfxN8IKnefClnJ_mlx67' } },
      one('შესავალი', '1O3xF14K61d9aPK_tvGgSpUylmHXI6qcx'),
    ],
    lyrics: `გოგოვ, გოგოვ, შავთვალა,
ჰე ჰე (2-ჯერ)
ჰე ჰე ლივლივ ქალო საყვარელო, ლიახვო, ჰაი თუნდა ლიახვო, ჰე დელიავ გოგონავ და

ბიჭმა შემოგითვალა, ჰე ჰე (2-ჯერ)
ჰე ჰე ლივლივ ლიახვო, ჩემო და ლიახვო, ჰე დელიავ გოგონა და

ან გამომყევი თანა, ჰე ჰე (2-ჯერ)
ჰე ჰე ლივლივ ქალო საყვარელო, ლიახვო, ჩემო და ლიახვო, ჰე დელიავ გოგონა და

გოგოვ, გოგოვ, შავთვალა, ჰე ჰე (2-ჯერ)
ჰე ჰე ლივლივ ქალო საყვარელო, ლიახვო, ჩემო და ლიახვო, ჰე დელიავ გოგონა და`,
  },
  {
    id: 'fs-e18', num: '18', title: 'კახური ნანა', region: 'kakheti',
    versions: [{ label: 'ხმები', tracks: { v1: '1XPNzSqlYzDD1_UHJVwFZCvzQDSlcLv2e', v2: '1Gi-_axOapxZF1wdW8dVeuQ1TAUvcYvh6', v3: '1RfiDELMzATw42LNcZwLjbqjFD4-okQsZ' } }],
    lyrics: `ნანინა ნა ნა, ვარდოვ ნანა.
ნანი ნანან ვარდოვ ნანა, ნანას გეტყვი, დაიძინე პატარა.
აგრე ტკბილად, უდარდელად, რამ დაგაძინაო?
ნანას გეტყვი, დაიძინე პატარა.`,
  },
  {
    // Drive folders "22, საცეკვაო კახური" and "06 საცეკვაო" hold the same recordings
    id: 'fs-e22', num: '22', title: 'საცეკვაო კახური', region: 'kakheti',
    versions: [{ label: 'სრული', tracks: { all: '1tA_3666-xRBkb8FjOu-MIpYlOMCaUQDS', v1: '1vesJW_muFtPUhWG6V0wsUz0i8eaZ2NBl', v2: '1rLT0JROjGSRia_dUdpAAUY5zfTwQU_RE', v3: '1-WIu7dLUZhctrFLvDfKh-SLKzFGuFP-Z' } }],
    docs: [
      { name: 'ნოტები', id: '1hjzMgbqe_AMStI5xR0Qy47K13z1s0Zr2' },
      { name: 'ნოტები (ინგლ.)', id: '1JLjwdz3uv_IsIv129EldfWi7ehcYh5yh' },
      { name: 'ინფორმაცია', id: '1qsEYwfX8DV0yzaKwKLIDPhDfL2IQeUi9' },
      { name: 'Info (Eng.)', id: '1cEygyQPCPlj9wXYIfDKoz-L87HffGwwu' },
    ],
  },
  {
    // Drive folders "24, საწნახური" and "01 საწნახლური" hold the same recordings
    id: 'fs-e24', num: '24', title: 'საწნახური', region: 'shidakartli',
    versions: [{ label: 'სრული', tracks: { all: '1oQR_J-XeUAnuQo7DUaD-rdqdFw5sAMPX', v1: '1skeigsSDCg3pHirk4HBcUZGDEpcDqDQK', v2: '17-uCPrtcRr78QhfQvKE8MmZRGHCBiTbY', v3: '1tnIBcS2HhshZOr0srdVoCHCbk80YKOkr' } }],
    docs: [
      { name: 'ნოტები', id: '1Pad6ExLcvPs1reFe0DoJGBu-vNu3-yqn' },
      { name: 'ნოტები (ინგლ.)', id: '1W6mwGKpk5uR1i9NAXRU53umkz0xZ7L6g' },
      { name: 'ინფორმაცია', id: '1eh5qSjzP2TeCCrnpOLqe6uNFFZzP9Q17' },
      { name: 'Info (Eng.)', id: '1zU9x_aGtsZ6sXmy7DJXY7N2W1H8v3AqO' },
    ],
  },
  {
    id: 'fs-e34', num: '34', title: 'სადაც ვშობილვარ', region: 'mtianeti',
    versions: [one('სრული', '1pVvUy58dwGWjCa5M-f4Tk7lSNRhaM6uf')],
    lyrics: `სადაც ვშობილვარ, გავზრდილვარ და მისროლია ისარი,
სად მამა-პაპა მეგულვის, იმათი კუბოს ფიცარი,
სადაც სიყრმითვე ვჩვეულვარ, — ჩემი სამშობლო ის არი.

არ გავცვლი სალსა კლდეებსა უკვდავებისა ხეზედა,
არ გავცვლი მე ჩემს სამშობლოს სხვა ქვეყნის სამოთხეზედა!..

მე მირჩევნია შავი კლდე, თოვლიან-ყინულიანი,
ორბი რომ ბუდობს, ჩანჩქერი გადმოჰქუხს ბროლი წყლიანი,
ჯიხვი და არჩვი მეყოფა, ხორცი აქვს მარილიანი...

არ გავცვლი სალსა კლდეებსა უკვდავებისა ხეზედა,
არ გავცვლი მე ჩემს სამშობლოს სხვა ქვეყნის სამოთხეზედა!..

ბარად რომ ვიყო ლაღადა, სული მთისაკენ იხარის,
სალი კლდე ანდამატივით გულს სულ იქითკენ იხარის,
იქ მიჯობს შავი სიკვდილი, ბარში სიცოცხლეც იმწარის!..

არ გავცვლი სალსა კლდეებსა უკვდავებისა ხეზედა,
არ გავცვლი მე ჩემს სამშობლოს სხვა ქვეყნის სამოთხეზედა!..`,
  },
  {
    id: 'fs-e110', num: '110', title: 'მიყვარხარ ტკბილო კახეთო', region: 'kakheti',
    versions: [one('სრული', '1PVGXxTkMwEe0mvKi3lQi9FWXd0NhMDoG')],
    lyrics: `მიყვარხარ ტკბილოო კახეთოო
დიდო ალაზნის ჭალაო
ირემო იალაღზედა
ივრის პირებზე ჩალაო

ბარდებში მძრომო ხოხობო
ტურფაო ხარისთვალაო
შირაქო ცხვრების დედაო
ზედ ჯეირნების ფარაო`,
  },
  {
    id: 'fs-e112', num: '112', title: 'ჭაჭანაურო', region: 'kakheti',
    versions: [one('სრული', '1Oyh_p_4Wrq-UhLxSPmLzCvjWSWAiA_w4')],
    lyrics: `ღვინოვ შენ ჭაჭანაურო უცეცხლოდ ამოსდუღდები
ჭკვიან კაცთანა ბრძენი ხარ სულელთან ამოფუვდები
ჭირის და ლხინის მოწამევ გაშლილ სუფრას რომ უხდები
ჭირში რომ ჭირთა მთმენი ხარ ლხინში სიმღერად იქცევი

ღვინო კი მათრობელა სჯობს ძაღლი თეოზე მყეფარი
არ ვარგა კაცი ზარმაცი უვენახო და მკვეხარი
ვაჟკაცი დინჯი სჯობია რომ გაჭირდება მჭექარი

კარგია დიდი ვენახი შიგ ვაზის ხშირი მტევნები
ძუძუთა გოჭებივითა მიხუტებული მტევნები
ძუძუთა გოჭებივითა ჰარალეე მიხუტებული მტევნები`,
  },
  {
    id: 'fs-e121', num: '121', title: 'მუმლი მუხასაო', region: 'kakheti',
    versions: [],
    pendingWma: ['1ztXxSiS59GKL8o-VT-8COVA1ebzVtVbm'],
    lyrics: `1 სოლისტი: ჰე მუმლი მუხასა
2 სოლისტი: ჰე მუმლი მუხასა
1. ჰე გარს ეხვეოდა
2. ჰე მუხა და დამძიმდა
1. ჰე წყალში ჩავარდა
2. ჰე მუმლი და დაიხრჩო
1. ჰე მუხა გადარჩა
2. ჰე მუხა და გადარჩა
ორივე: ჰე მუმლი მუხასა`,
  },
  {
    id: 'fs-e123', num: '123', title: 'შენ ბიჭო ანაგურელო', region: 'kakheti', municipality: 'სიღნაღის მუნ.', area: 'სოფ. ანაგა',
    versions: [
      { label: 'სრული', tracks: { all: '1_ZIstxkjXpuiN-J2KVmy5xcmbqtr_5od', v1: '1CNA81q45vLuARGShmQM8-7f0IhVGbbSi', v2: '1FLEN1tpfHPH96mYW5pZw6wp7DlBWdmCR' } },
      { label: 'გუნდი', tracks: { all: '1PKX5-yjrNflUUz7akP5OGjcW7K5EbOdy', v1: '1JMgMVNwxDH49u8JCfL6MzPt3fG7iC1tN' } },
      one('შესავალი', '1sLKmHCbV89nJclut8A2MUehq9AgSLd2u'),
      one('დაბალი ტონი (თ. ქევხიშვილი)', '179aWGK73oF4T_dTUZNwvx6XCDN51FFpK'),
    ],
    lyrics: `ჰარალალო
შენ ბიჭო ანაგურელო
ანაგურელო
ჰარულალო
შენ ბიჭო ანაგურელო
ანაგურელო

ჰარალალო შენი ხმა გამოდიოდა ხმა ტკბილიო (2)
ჰარიარალო, ჰარიარალი და ჰარალალო

ჰარალალო შენი თოხისა წკრიალი წკრიალიო (2)
ჰარალალო წყალსგაღმა გამოდიოდა ხმა ტკბილიო (2)
ჰარიარალო, ჰარიარალი და ჰარალალო`,
  },
  {
    id: 'fs-e124', num: '124', title: 'ჩაუხტეთ', region: 'kvemokartli',
    versions: [],
    pendingWma: ['1d-l4tyGY16nb8AESqVzWp7__KYRif50g'],
    lyrics: `1. ჩავუხტეთ და ჩავუხტეთ
ბარათაშვილსა და
ჩავუხტეთ და ჩავუხტეთ
ბარათაშვილსა და ო

2. მოვსტაცოთ და მოვსტაცოთ
წამოვიყვანოთ და
მოვსტაცოთ და მოვსტაცოთ
წამოვიყვანოთ და ო

3. თვალჟუჟუნ და თვალჟუჟუნ
თეთრი ქალია და
თვალჟუჟუნ და თვალჟუჟუნ
თეთრი ქალია და ო

4. მოგვდევდა და მოგვდევდა
ჩვენი სიდედრი და
მოგვდევდა და მოგვდევდა
ჩვენი სიდედრი და ო

5. ნუ მოგვდევ და ნუ მოგვდევ
ჩვენო სიდედრო და
ნუ მოგვდევ და ნუ მოგვდევ
ჩვენო სიდედრო და ო

6. არ არის და არ არის
შენი ქალია და
არ არის და არ არის
შენი ქალია და ო

7. მაშ ჩავუხტეთ და ჩავუხტეთ
ბარათაშვილსა და
ჩავუხტეთ და ჩავუხტეთ
ბარათაშვილსაა და ო.`,
  },
  {
    id: 'fs-e125', num: '125', title: 'დიდება და ღმერთსა დიდება', region: 'kakheti',
    versions: [one('მზეთამზე', '1PDamjTFEnUkj2ZwLFnW5RdnnZAUzTctm')],
    lyrics: `დიდება და ღმერთსაი და დიდება,
პირველად და ღმერთი ვახსენო,
და მემრე და ყველა ყველა წმინდაო,
წმინდა გიორგი და ალთაო,
დაიარება მთა-მთაო,
ხელში უჭირავ და მათრახი,
მათრახი და ხმლისა პირული,
მასპინძელო ჩვენო ჩვენო ლხინო,
მარნი კარი გიჭრიალებსო,
აუხადი აგვიხადეო,
ყელი ჩაგვიმაჭრიანეო,
განა მართლა მთხოვრები ვართო,
ქრისტე მახარობლები ვართო,
დიდება და მადლი ღმერთსაო,
ვერაი გავაკვირებთ ღმერთსაო,
ღმერთს დიდება ჩვენ მშვიდობაო,
საქართველოი დამშვიდებაო,
დიდება და ღმერთსაი დიდება`,
  },
  {
    id: 'fs-e130', num: '130', title: 'შენ ალაზანო', region: 'kakheti',
    versions: [one('ანსამბლი „იალონი" (თუშური)', '1r10lXtdbIlwqp9mgCwMzCwMDOnHkTZsm')],
    lyrics: `შენ ალაზანო, ბევრს ნუ დუდუნებ...
ნუ შეაწუხე აგრე გულია...
სატრფო მეცა მყავს შორს დაკარგული,
მეც შენსავით ვარ დატანჯულია...

მწყემსი ვარ გარე მხარისა,
დღე და ღამ მარტოდ მავალი,
ღამით მთვარე მყავს მეგობრად,
ჩემსავით მარტოდ მავალი...

ხან ქარი მიწეწს ნაბადსა,
წყეული არც ეგ მასვენებს,
ხან მგელი მიფრთხობს ფარასა,
წყეული არც ეგ მანებებს...

უნდა მოგწერო წერილი,
დღე ამის მანათობელო...
ვაი, უცეცხლოდ დამწველო,
უღვინოდ დამათრობელო`,
  },
  {
    id: 'fs-e132', num: '132', title: 'სიმღერა ძმობაზე', region: 'mtianeti',
    versions: [],
    docs: [{ name: 'ნოტები — „ძმაო, რაი სჯობს ძმობასა"', id: '1AHFHE5y11mGwnVzGCrHxQ8k45oIkcCys' }],
    // Lyrics from the sheet music PDF
    lyrics: `ძმაო, რაი სჯობს ძმობასა, ჰაა,
ძმაო, რაი სჯობს ძმობასა,
მარადჟამს ერთად ყოფნასა,
ვაჟკაცთა ძმათა მრავალსა
მტერი ვერ უზავს მტრობასა (ბანი)

ძმა მაშინო მოგაგონდება,
ათნი რომ გცემდნენ მარტოსა,
არსაით გყავდეს მშველელი,
რომ მტერი დაგიმარცხოსა (ბანი) (2-ჯერ)

ჰაი, როცა რომ ხმალი ხმალსაი ცემს, ძმებო,
მტერი არ იშლის მტრობასა (2-ჯერ)
თოფ-იარაღი, ფარხმალი,
მაშინ რაი სჯობს ძმობასა

მხარი მხარს მივცეთ, ხელი ხელს,
გული სიმართლის გრძნობასა,
გადავერევით ხმალდახმალ,
მტერსა ვუტირებთ ყოფასა, ჰა

ჰარულალო, ჰარულალო, ჰე,
ჰარულალო, ჰა,
ჰაა, არი არალალი ვარალო,
ჰა, აქა მშვიდობა და გამარჯვება,
გამარჯვება.

ძმაო, რაი სჯობს ძმობასა`,
  },
  {
    id: 'fs-e147', num: '147', title: 'ხმის ჩახვევა (ბექა)', region: 'kakheti', ownerOnly: true,
    versions: [one('სრული', '1r9BxdEPu2x7nRzvfq4rEGDzCEJWWLJO7')],
  },
  {
    id: 'fs-e148', num: '148', title: 'სატივეზე', region: 'mtianeti',
    versions: [
      one('სრული', '195iTmxIBl0b6KZbRbzp84NS0R4Ff9DKN'),
      one('ანჩისხატის გუნდი (მთიულური)', '1zN9vLIvZ0bLJAvwbLBiQNFlJD2VOHWin'),
    ],
    lyrics: `I სოლისტი (2 ხმა)
სატივეზე ტივი შევკარ,
ტივი არის ნაძვის ხისა.
ორთავ პირები მოვასხი,
მოსასმელი არის წყლისა.

II სოლისტი (1 ხმა)
ჰეეე, ჰეეე ჰეეჰეე ჰეი დააა
ჩემო ტივო, მაშინ გაქებ,
რომ ქალაქში ჩასულიყო,
თავს მუშტარი გეხვეოდეს,
სხვაზე მეტად გასულიყო. ჰარულაო ელო

I სოლისტი (2 ხმა)
მეფე ერეკლეს დროშია
შორს მოვაძოვე ძროხანი
დავწექ და ბევრი ვიძინე
თავს დავიხურე ჩოხანი

II სოლისტი (1 ხმა)
ჰეეე, ჰეეე ჰეეე ჰეიდაა
მეფე გიორგის დროშია
ვეღარ ვდგებოდი ქოხშია
ვერ გავახარე ცოლშვილი
ვერ მოვილხინე ტოლშია ჰა ჰარულაილო

ნეტავი გამაგებინა, მამა-პაპანი რად ქმნილან,
ან მოყვარული ცოლ-ქმარი უდროოდ რაზედ გაყრილან.
დაცლილან ნასახლარები, ზოგნი სულ წმინდად აყრილან,
ამ სოფელს აღარ დამდგარან, იმ ქვეყნის მკვიდრნი შექმნილან.
ჰა რულა ილო`,
  },
  {
    id: 'fs-e02', num: '02', title: 'გამხიარულდი ბუხარო', region: 'kakheti',
    versions: [],
    pendingWma: ['1ekFq0hsTixaWCVokIM-imxxkSU_5Jnbb'],
  },
  {
    id: 'fs-e03', num: '03', title: 'ზამთარი', region: 'shidakartli',
    versions: [one('ბიძინაშვილი', '1ru8XecmT838X4UH7HBucnKlHHrTIyely')],
    lyrics: `ზამთარი (ქართლური)

ზამთარიო,
ზამთარი ვარდსა დააჭკნობს, ფოთოლი ჩამოცვივაო
ჰე ჰე ჰე ჰარულაელო ლო ოოო ჰა რალო ჰა ჰა ჰა ჰა ზამთარიიო ო ზამთარი იი ოო
ჰე ჰე ჰე ჰე ჰარულაელოოო ჰეე ლამაზასა ქალსა ცრემლები ჩამოსცვივაო
ჰეეეე
ღმერთო, ღმერთო, მოწყალეო, შენგნით ველით შეწევნასა`,
    docs: [{ name: 'ზამთარი (სანდრო კავსაძის გუნდი)', id: '1koSQBdTiBZy5HKtv6LsE2RvClpkY8f8X' }],
  },
  {
    id: 'fs-e04', num: '04', title: 'ვისაც რა უნდა უყვარდეს', region: 'kakheti',
    versions: [one('შავნაბადა', '1N3PsA1vD1YRY6iXwaMfo-H3sgvYj30bQ')],
  },
  {
    id: 'fs-e05', num: '05', title: 'სახუმარო ვარალალო', region: 'kakheti',
    versions: [],
    pendingWma: ['1ps8tLnllZriVRA9kQ0u4ERk_ui5NzYlV'],
  },
  {
    id: 'fs-e07', num: '07', title: 'მო, ლხინი ვნახოთ', region: 'kakheti',
    versions: [],
    pendingWma: ['1ev0kv50Z2DiC2Xgn7ruAfLffNSQV5wyG'],
  },
  {
    id: 'fs-e08', num: '08', title: 'ჯვარი წინასა', region: 'kakheti',
    versions: [],
    pendingWma: ['1m8LPI5GYo5u2pHNgRDOr4hptqHKRaUB_'],
  },
  {
    id: 'fs-e09', num: '09', title: '25-სა დეკემბერსა', region: 'kakheti',
    versions: [one('შავნაბადა', '1N1K9qthk3qI4SL_rhpBKyjHkA1KYT5kw')],
    pendingWma: ['1qc574NVCUt00ijPmOY5woIy47Zhs3Ofc'],
  },
  {
    id: 'fs-e10', num: '10', title: 'ჩონგურო, ჩემო ჩონგურო', region: 'kakheti',
    versions: [],
    pendingWma: ['1_T5YYsaDBGTE7QaDpS1ShDHrfCnYyfiV'],
  },
  {
    id: 'fs-e11', num: '11', title: 'უჭკნობელო', region: 'kakheti',
    versions: [one('სრული', '1PEdDV4dBhOdtxOnV3mg2X_h7aFFq2amB')],
  },
  {
    id: 'fs-e12', num: '12', title: 'ქრისტე დაბადებულაო', region: 'kakheti',
    versions: [one('ქ.კ. (ვიდეოდან)', '1JH0jsU4OErBIlrDVxc0GRrEFGIQUK5qo')],
  },
  {
    id: 'fs-e13', num: '13', title: 'ღმერთმა კაცნი გაგვაჩინა', region: 'shidakartli',
    versions: [one('სრული', '1DObjvI89RNh4-g2Xt-VmLAmCkwKh1y4n')],
    docs: [{ name: 'ნოტები', id: '1m5iNFTpyyNrfSRnb5hJ6zFY8-XO6URuz' }],
    // Lyrics from the sheet music image
    lyrics: `ღმერთმა კაცნი გაგვაჩინა,
დაგვამტკიცა ადამ ძენი,
ძმას ძმისა მოღალატესა
გაუხვრიტეს ენის წვერი,
მეგობრის მოღალატესა
ყელზე ჩამოჰკიდეს გველი.
შენ, მიქელო, გაბრიელო,
გაბარია სული ჩვენი,
სიამ-ტკბილობით მოჭამე
ეს ჩვენი წუთისოფელი`,
  },
  {
    id: 'fs-e149', num: '149', title: 'ლექსად თქმული სიმღერა — ჭონა', region: 'kakheti',
    versions: [],
    pendingWma: ['1Tu_MhhxJul-5ZzH49rwysYaUwB6DySre', '1q2dlk2cfknmcTGnpmr50Nr4_hYY_7Z_a'],
  },
  {
    id: 'fs-e150', num: '150', title: 'ღმერთო, შენგნითა', region: 'kakheti',
    versions: [],
    pendingWma: ['1XzfvEXa6X1IrW4QO0PxusFkZkkD5U9qx'],
  },

  // თუშეთი (ახმეტის მუნიციპალიტეტი) — „ფოლკლორის სახლი“, დიდგორი, SoundCloud
  {
    id: 'fs-sc-dzaghlebi', title: 'ძაღლები დაჰყმუოდიან', region: 'kakheti', municipality: 'ახმეტის მუნ.', area: 'თუშეთი',
    versions: [],
    soundcloud: 'https://soundcloud.com/didgori/polkloris-saxli-zaglebi-dahqmuodian-tusheti-house-of-folklore-dzaghlebi-dahkmuodian-tusheti-4',
  },
  {
    id: 'fs-sc-kadori', title: 'ყადორის გზაო', region: 'kakheti', municipality: 'ახმეტის მუნ.', area: 'თუშეთი',
    versions: [],
    soundcloud: 'https://soundcloud.com/didgori/polkloris-saxli-house-of-folklore-14',
  },

  // ───────── დასავლეთ საქართველო ─────────
  {
    id: 'fs-w11', num: '11', title: 'კლდის სიმღერა', region: 'abkhazeti', municipality: 'გუდაუთის რ-ნი',
    versions: [
      { label: 'სრული', tracks: { all: '1g9slC7WR3hwsYv9hfPvcC31htahFXGFI', v1: '1V8I-9z24z-K4oTynVWJdNPBaTsaUGtoc', v2: '1skLnlCJdFmcHgvlg9T9AkuMyq_tIREth', v3: '1JMGBsACmmxAR8jkwlJJHuIekWSjeldrm' } },
      one('სოლო', '1XoIkLxrjxUkCwW2hJPBYzrsNZTgFfAMd'),
    ],
    lyrics: `სოლისტი:
ვა-რა-დო ვო-რი-რა-ვო, ვა-რა-და-რი — ო

გუნდი:
ვა-რა-იდა-ო ო,
ვა-რა-იდა სი-ვა-რა-იდა-ო,
ვა-რა-დო რა-იდა-ო.

სოლისტი:
ვა-რა-დო ო-რი-რა-ვო, ვა-რა-და-რი — ო

გუნდი:
ო-ვრა-იდა-ო,
ვა-რა-იდა სი-ვა-რა-იდა-ო,
ვა-რა-დო რა-იდა-ო.`,
  },
  {
    id: 'fs-w12', num: '12', title: 'კესარია', region: 'guria',
    versions: [
      one('სრული', '17quJxN4KLR_KHww5q2Xp2yrHdxJ9buVe'),
      { label: 'ხმები — 1-ლი ნაწილი', tracks: { v1: '1q-2AcfCYamPhGWl7F0Wx9l31HmwYalJm', v2: '1XuxwVjwTB8-ifbWJCCb32NAccsVP7LrZ', v3: '1XLS4fv6dN6vX7H1j5qdtOrRtE757bxHb' } },
      { label: 'ხმები — მე-2 ნაწილი', tracks: { v1: '1pkhpugesiY5s-QWToeKGY-jTXjARnpNd', v2: '1QnUpKnWNLpPhvUDKyAxmR1SKaBhlmnAK', v3: '18k282AUSFuY0llBDo-ROufRe3xKyr-ul' } },
    ],
    lyrics: `ჩემისთანა დაჩაგრული, თურმე ქე ხართ, ბეჩა, ყველა,
საყვარელმა მიღალატა, დამაქცია, დამანელა. (2)

სანამდისი მქონდა რამე, მციცქნა, მციცქნა ნელა-ნელა,
მერე ქე ამიპანღურა, დამაქცია, დამანელა. (2)

ერთ საათსაც არ ვიცოცხლებ, რომ არ მყავდეს კესარია,
ჩემი აქანა დამბორკი და მალამოც ისარია. (2)

ჩემო ჩაფუნთრუშებულო, ჩემო გულის კვარახჭინა,
ნეტავ შენი უნახავი ამდენ ხანს რამ დამარჩინა. (2)`,
  },
  {
    id: 'fs-w13', num: '13', title: 'მერისულა', region: 'samegrelo',
    versions: [{ label: 'სრული', tracks: { all: '1YM1zfpUyovN66f40Cl57iWHVDa0meJmc', v1: '17WBwB6wY_JxhtQaRnRHDQDd7yFi_pR1p', v2: '1eb8oq3YlGSuIqI3X5KsTlt9FXwanOeok', v3: '1yh-b2rq6oTWhWfXZpyJcAkcYeSl_MAHy' } }],
    lyrics: `დე ლი ვოვ დელი ვო დელა
გუნდი: ოვ დელიე ნანინავდა ო
ოვო რერა, რირა ვორერა
გუნდი: ოვ დელიე ნანინავდა ო

1. დილას ამდგარო ფუტკარო,
წადი საყვარელს უთხარო და.
ოვო რერა, რირა ვორერა
გუნდი: ოვ დელიე ნანინავდა ო

2. ვაი თუ გშია (და) ვაი თუ გწყურია,
ვაი თუ რამე გენდომება ო
ოვო რერა, რირა ვორერა
გუნდი: ოვ დელიე ნანინავდა ო`,
  },
  {
    id: 'fs-w28', num: '28', title: 'შინა ვორგილ', region: 'svaneti',
    versions: [{ label: 'სრული', tracks: { all: '119TEUivdshYjOJZrgejFWyORMqJxfsid', v1: '1yerSsjF0BQVvIPf0STO9Q60J_auwckow', v2: '1bo2dC8RvieHV4q6YktH2dSgX7kPmb1Fo', v3: '1j_PL-33akSoGdXrSmXSqaTYB691bpCMC' } }],
    docs: [{ name: 'ნოტები', id: '13F17BURs8UMxW03j9eZ0AahuKSy86GaM' }],
  },
  {
    id: 'fs-w83', num: '83', title: 'კირია ლესა', region: 'samegrelo',
    versions: [
      one('სრული', '1wZh8QIROs2BKOw2_KLhRdkeZIezUpMEG'),
      one('შესავალი', '1PVd4nQMW4Q_Wm87nhy5iNvprk0ckE6au'),
      { label: 'ტრიო', tracks: { v1: '1050unIiKIbM79iWWYMCaXtaooBxx_Cb2', v2: '1sp3s6tUS1_Gryj0c9AghARRJ3BWnsG28' } },
      { label: 'გუნდი', tracks: { v1: '1fM-qQL48Qo8kGKQEC7HSmXlnlMpPuNgg', v2: '1BzU-oRsZINTT1MuXZU3F_ximPd3pFYTm', v3: '1aZ8CMjtDMksjHYYqUlQrKHOiqkVjjMHa' } },
      { label: 'გუნდი 2', tracks: { v3: '1RZFF3tBKw0aVIPhCHp-UFRp7ZEYo9kcR' } },
    ],
    lyrics: `სადავოი კირიალესაა! (2-ჯერ)

ახალ წანას მიგახვამან,
ღორონთქ გოითანუას,
ენა ჯვეში შხვა ახალი
დიჩელამო გეეხარი!
სადავოი კირიალესაა,
სადავოი კირიალესაა! (2-ჯერ)

სქან მაღაზა, სქანი ბაღი,
ლაითიში ეფშა,
სადავოი კირიალესაა,
სადავოი კრიალესაა! (2-ჯერ)

შიო ჩიტი ქოფურინი,
სუაქოფჩანაფუდას.
შორს მითინი ქორუნსუდა,
აშო ქორჭარაფუდას.
სადავოი კირიალესაა,
სადავოი კრიალესაა! (2-ჯერ)

ასე მეულ გვალაშა,
აშვამართე წანაშა,
სადავოი კირიალესაა,
სადავოი კრიალესაა! (2-ჯერ)`,
  },
  {
    id: 'fs-w111', num: '111', title: 'დიდი ხნიდან გაგიცანი', region: 'imereti',
    versions: [{ label: 'სრული', tracks: { all: '1d3QRgrmfUjcYKDvwt3xiDdiMP7gdrO1i', v3: '1ICnyGDubtJRDTMtfYdDtFgPyhsG-2JTH' } }],
    lyrics: `დიდი ხნიდან გაგიცანი, ღვთისგან ნუ მოგეცეს ავი,
შესამჩნევი ლამაზი ხარ, თავ-ყელი გაქ მეტად კარგი,
რამ გზარდა ასე ტურფა, ჩემდა გულის მოსაკლავი,
მე იმ მშობლებს ვენაცვალე, რომელმაც რომ გშობა კარგი.`,
  },
  {
    id: 'fs-w114', num: '114', title: 'ახლა გხედავ საყვარელო', region: 'imereti',
    versions: [{ label: 'სრული', tracks: { all: '1W0q5U7LLnVOfJGC5X2gc9sGTOtmQFxPC', v1: '1xgJqxPd5CowkI9SgYVo2gBNH2KsjnXKY', v2: '12ecwfJpa_v9FDe7RHYL1j1-fgv36KIt2', v3: '1REtLLjGhHDgH5kudUBMduBj1j4bFrtpe' } }],
    lyrics: `ახლა გხედავ საყვარელო და ნანინა,
ჩემზედ ხელი აგიღია და
ნანინეი აბა დელო და ნანინეო აბა დელო
დელიოვ დელივოვ დილა ვოვ დელიო დელო
ნანინავ და

მოღრუბლულხარ პირადმზე და ნანინა,
შუბლიც აღარ გაგიხსნია და
ნანინეი აბა დელო და ნანინეო აბა დელო
დელიოვ დელივოვ დილა ვოვ დელიო დელო
ნანინავ და`,
    docs: [{ name: 'ნოტები', id: '1eDB-Bxkl7G89zP98u5xqgM2ZKnjN6v_3' }],
  },
  {
    id: 'fs-w117', num: '117', title: 'შარათინი', region: 'abkhazeti',
    versions: [{ label: 'შავნაბადა', tracks: { all: '1OZ4PWQqZdyTfS2S-XcLwxV2ux6Z9rRrm', v1: '15sAXt8B1mo14k9mrzKJMppO1u53MXmi1', v2: '12W2kvjgKvBiB73ToQz29zQkHFq30pGYc', v3: '1iY3-OwXkD4TS1mhX_W4wKPcttuyz2qJ7' } }],
    lyrics: `ვარაიდა ვარაიდა ვარაიდა რაი და რა`,
  },
  {
    id: 'fs-w118', num: '118', title: 'იმერული მგზავრული', region: 'imereti',
    versions: [{ label: 'ხმები', tracks: { v1: '1baaqAomEAOeZGJhgFfv00KJGvLbainWn', v2: '1p7nCmwqNhjzJqOEnhdB0mxuob3F0j3qw', v3: '1VNY0m_GR-qavsHCCeM-W0ja0kFqBaQtP' } }],
    lyrics: `ადილოი ვადილოი დილავოდელავდა ალალო
ვოვდილოდელა ალალო ივრიალი (2-ჯერ)

მიყვარდი ჩემი მეგონე, ეხლა დამიწყე მდურება
ვოვდილოდელა ალალო ივრიალალი
ნეტავი გამაგებინა, რამ შეგიცვალა გუნება
ვოვდილოდელა ალალო ივრიალალი

ადილოი ვადილოი დილავოდელავდა ალალო
ვოვდილოდელა ალალო ივრიალალი (2-ჯერ)

ქალო, შენი თეთრი კაბა წყალს მიჰქონდა მდინარესო
ვოვდილოდელა ალალო ივრიალალი
ნეტავი გამაგებინა, ვინ გაკოცა მძინარესო
ვოვდილოდელა ალალო ივრიალალი

ადილოი ვადილოი დილავოდელავდა ალალო
ვოვდილოდელა ალალო ივრიალი (2-ჯერ)`,
  },
  {
    id: 'fs-w129', num: '129', title: 'მზე შინა', region: 'guria',
    versions: [one('სრული', '1551OZeWvX3FD0J0mKtCM_lr7simJT7zY')],
    docs: [{ name: 'ნოტები — „მზევ შინ შემოდიო"', id: '100_OvA6ij29bYG4xpDe5KZwpmBXr3FVe' }],
    // Lyrics from the sheet music PDF
    lyrics: `მზე შინა და მზე გარეთა,
მზევ, შინ შემოდიო,
ჩვენ ვაჟი დაგვბადებია,
მზევ, შინ შემოდიო,
ვაჟის მამა შინ არ არის,
მზევ, შინ შემოდიო,
ქალაქს არის აკვნისთვინა,
მზევ, შინ შემოდიო,
მზე დაწვა და მთვარე შობა,
მზევ, შინ შემოდიო

(მზე შინა და მზე გარეთა,
მზევ, შინ შემოდიო) 2-ჯერ`,
  },
  {
    id: 'fs-w120', num: '120', title: 'ნაი ნაი', region: 'samegrelo',
    versions: [],
  },
  {
    id: 'fs-w128', num: '128', title: 'ნანინა', region: 'imereti',
    versions: [],
    pendingWma: ['1VHt-sWDX0wM2pmHSnm1ZWzgR8u_PZtdG', '1j4g-NdIxFh-Dsf_bW_VZQfHDWCv4dzmf', '1GpfVl_OH-eFVgCpYnJ_IZvbbpVFvMuw3', '1exatdPQ5Ci5pQ4sblGl4VOK6TDZHwmfJ'],
  },
  {
    id: 'fs-w133', num: '133', title: 'მასპინძელსა მხიარულსა', region: 'guria',
    versions: [
      { label: 'სრული', tracks: { all: '1pYFVlUwlSXYvLUQXwMvB1RH46b2c_nin', v1: '1y7aXz30p8YE_AjXenLkgNomcbw9cyeXD', v2: '1POLCEYnFExYBz7RoAur98IugVoi0qfYH', v3: '1NN3VlnINRdcm06C5k7wefxtD1urt4bOG' } },
      { label: 'სრული (2015)', tracks: { all: '1YY-6O1ayB6sTeoc-dm4aQB0lQkdSlPO7', v1: '1EZ2QFad1FtlDcu8fpQA3EzAQVXgeUOD6', v2: '1W8HMKBpgR8Ny3KebPbsEpAoqQzO2Ad8-', v3: '1_5pE7Q-8nb2oqGCyDuXo3n4zIbimUCEc' } },
      { label: 'ორ-ორი ხმა: I = 1+2, II = 1+3, III = 2+3', tracks: { v1: '1bAPahpy1BE7eSpNFDuDhXbZjUL22G-44', v2: '1pDattzwVE-T-fOy9Is_ud80-Uq00WpiV', v3: '1SY8KAiPoi05f7ikbv8RRai0MghxYDJzd' } },
    ],
  },
  {
    id: 'fs-w136', num: '136', title: 'მარებელი', region: 'samegrelo',
    versions: [
      one('სრული', '1IPJE29P1Li_mpCqFYEXcUM_7NFLeCOwQ'),
      one('შესავალი', '1Fwt3ybNZ_WiYl-JT_GNofzBUiVRu_CYk'),
      { label: 'გუნდი', tracks: { v1: '1JQLoNnUFMJP1-yvzYePnYEEOSbkLZFmb', v2: '1yKY4TKbSX6moulRNHvXBLItAek9gp9EG', v3: '1GpJq4oPyf8AQHEVd9ZQU7BTjjRzEZQZ8' } },
      { label: 'სოლისტები: I = პირველი, II = მეორე სოლო', tracks: { v1: '14iFMzHXdJA8ErAbzZygaXvzU0jsqOf4w', v2: '1eFH_vzdKYcww4Y131hKdOcmIijL722Pj' } },
    ],
    lyrics: `ართ კოჩიქ ქუმორთუ დო
ოსურს გირიგენქია, (ნა)
ოსურ მარა, მუ ოსური, (ნანა)
გვალა გაკეთენქია. (ნა)
ჰე ეუნანა ნანა ოდელია უ ნანაო და (2-ჯერ)

ათას მანათ ფარას მერჩანს,
ცხენ დო უნანგერსია, (ნა)
ნორჩალი დო გექუნალს (ნანა)
ოქრო ვარჩხლის ბრელსია (ნა)
ჰე ეუნანა ნანა ოდელია უ ნანაო და (2-ჯერ)

ქონებაქუ მომაღორუ
ოიაქ მაუ რაგადელქი (ნა)
დუდიშ ტვინი გამნომრთინუ (ნანა)
შეჩვენებულ მარებელქი (ნა)
ჰე ეუნანა ნანა ოდელია უ ნანაო და (2-ჯერ)

ოფე მარა მუ სანწალე
ე ოსური ბედიჭვილი (ნა)
იქ ირდუნი თი ოჯახი (ნა, ნანა)
ქვერსემია უჩას წყვილი (ნა)
ჰე ეუნანა ნანა ოდელია უ ნანაო და (2-ჯერ)

მუშ მანწარა ახალგაზრდას
რჩინ ოსური უნდასუნი
ვარა გააბანძღუდასუ ბადიდ
ბადიდ ახალ ცირასური
ჰე ეუნანა ნანა ოდელია უ ნანაო და (3-ჯერ)`,
  },
  {
    id: 'fs-w135', num: '135', title: 'აჭარულის პოპური', region: 'achara',
    versions: [
      one('შავნაბადა', '1tgxzS_29FN5ucZmXJOUxghwK8PIHXjyr'),
      one('ანსამბლი „როკვა"', '1DANQOpjk7DNEcoGbRIKWD9hLLhc74wtC'),
      one('ჯილველოი', '1M1bnG-Igb0wRJU9xFpukkAGOJzCyh6Vf'),
      { label: 'ჯილველოი — II ხმა (დაბალი ტონი)', tracks: { v2: '1WdcgXflJXimBK8IKjR7m9f7_PVxCDdoQ' } },
      { label: 'ნარდანინა — ხმები (დაბალი ტონი)', tracks: { v1: '1PxcXe8q3WY2HvoV2fsILupuWI0js5oDV', v2: '1_QLdYxKduqVocW_DP7jD2vjS7i8rGdsh' } },
    ],
  },
  {
    id: 'fs-w134', num: '134', title: 'იარამაშა', region: 'achara',
    versions: [],
  },
  {
    id: 'fs-w140', num: '140', title: 'აშო ჩელა', region: 'samegrelo',
    versions: [
      { label: 'სრული', tracks: { all: '184x2NZz6IyDE6vEJUnyDj7nExeV5TBsL', v1: '1GhWB1i55iGyctFMO58ObcqAu3vqoiGQu', v2: '1FIDFgOfdO8VY2TnKbabsqgDwikKtZTVs', v3: '1M5lzafTQm4vVDy-d2nhdcZAjGFECCiXt' } },
      one('შესავალი', '1uThgmYOpLyRK2G9X80vXFpjtT9OE9GVO'),
    ],
    lyrics: `აშო ჩელა, იშო ბუსკა, ოუ ნანა, სქანი ცოდა ნანია.
სი მონობაში გეგაფილი, ოუ ნანა, სქანი ცოდა ნანინა.
სი უჩხონჩხე, სი უგულე, ოუ ნანა, სქანი ცოდა ნანინა.
სი კისელი ელაფირი, ოუ ნანა, სქანი ცოდა ნანინა.

მისამღერი: ო, ოუნანა ნანა ოუნანა სქანი ცოდა ნანინა.`,
  },
  {
    // Drive folders "139 უწინარეს" and "01 Utsinares" hold the same song
    id: 'fs-w139', num: '139', title: 'უწინარეს', region: 'guria',
    versions: [
      { label: 'გუნდი', tracks: { all: '1aGdCITBTlhAd1kYn9me0N3GvRGwhqJoI', v1: '1cDXaykys634uCqQHHM2T-yQ7hzVJy0v_', v2: '16tq_TkHdbxgD3imvH7M8DUJpXeQrEu36', v3: '1yy5xt_nQUgG-Iqq0RJ4ML5V24TAmlG9K' } },
      { label: 'ტრიო: I = კრიმანჭული, II = 2 ხმა, III = ბანი', tracks: { v1: '1pWl0h32VJiSwTMWAcyN5jrYmfsmRBlGJ', v2: '13YEnxuLbrdMVRy6N36vqQ0XttVR-fWIa', v3: '1Rdxfyht5XCqq7opwOQSNPZefYo5GeQDQ' } },
      one('ჩონგური', '1GkCJ8qeKUabEjuFvLX8UAg4LZl7Qfsvz'),
    ],
    lyrics: `უწინარეს მას ვადიდებთ, ვინაც შეჰქმნა ზღვა და ხმელი,
ვინც მარადის არსებობით უკვდავია და უცვლელი,
ვინც ჯოჯოხეთს განგვაშორა, შეგვიყვარა გვცხო ნათელი,
მისგან ვითხოვთ, აგვაშოროს ხიფათი და განსაცდელი.

შალვა, ჩემო სიყვარულო, სიცოცხლეზე მეტად ტკბილო,
ჩემი თავის სანუგეშოდ ნაშობო და გამოზრდილო.

უწინარეს მას ვადიდებთ, ვინაც შეჰქმნა ზღვა და ხმელი.`,
    docs: [
      { name: 'ნოტები', id: '1d4GL65SHuhuAmLFmkquLfHwTrJJTP2qS' },
      { name: 'ნოტები (ინგლ.)', id: '1EuyRjNG9AyRIZJZ_5naShTG9Ajx8JcR7' },
      { name: 'ინფორმაცია', id: '1pOvKECElC9qdJVA0yeriwcaP5TOj13WZ' },
      { name: 'Info (Eng.)', id: '15YCRhDCCx9IM3wkIX5FZuEQpQYacjAzx' },
    ],
  },
  {
    id: 'fs-w02', num: '02', title: 'დილი დილი დელა', region: 'samegrelo',
    versions: [],
    pendingWma: ['13Ju43UkwnJ7uVEPdLjxkV-Q5EMboNNko'],
  },
  {
    // From the "3. ქალაქური" folder; a Khevsur song, so it sits under Mtskheta-Mtianeti
    id: 'fs-c119', num: '119', title: 'არხოტო', region: 'mtianeti', municipality: 'დუშეთის მუნ.', area: 'ხევსურეთი',
    versions: [],
  },

  // ───────── ქალაქური ─────────
  {
    id: 'fs-c19', num: '19', title: 'გვიმღერია', region: 'kalakuri',
    versions: [
      { label: 'მაღალი ტონი', tracks: { all: '1qFKYvsdX48DCP5ewVdycaDRQqPgoipoi', v1: '1u3utjtKCrX5e7q70h1zlrhWSv8k7L7A1', v2: '1q6-wu9NHVEjnWkH8VjdeUJE_93yAz4yI', v3: '1JfiGwFunIhLhrMFKztXH8lU_z8Q9gxK4' } },
      { label: 'დაბალი ტონი', tracks: { v1: '1XiyYDwBwP6tBLN5IcpQxXzSbyZoKz9IP', v2: '1_OC9ruSziwYnfG81OL9iOpHIxoivc3ve', v3: '1-bkL6wBBBWEBj3rKZ4naS5zdPDmnDlz3' } },
    ],
    lyrics: `სამიათას წელზედ მეტი გვიცხოვრია როგორც ერსა,
ბევრსა შავდღეს მოვსწრებივართ, მაგრამ ბევრსაც ბედნიერსა.
გვიმღერია, კიდეც ვიმღერთ ჩვენს ტკბილ მრავალჟამიერსა. (2)

ქართველს სისხლით შეღებილი დღესაც მტკვარი არის მღვრიე,
ქართველ დედის დაზრდილ შვილებს მტრების სისხლი დაუღვრიათ.
გვიმღერია, კიდეც ვიმღერთ ჩვენს ტკბილ მრავალჟამიერსა. (2)`,
  },
  {
    id: 'fs-c21', num: '21', title: 'სულიკო', region: 'kalakuri',
    versions: [{ label: 'სრული', tracks: { all: '1ezahoP-GtEM-31ZoQz6_U6ebCozZvLt3', v1: '13eiQYKaWWaeas8zexyfHmkLdlVm4Lntz', v2: '113X56slGgw4iqVHLYDkll8e7-V1Oy8Fi', v3: '1wB0QrOg1ZFY4P159UIDFFXKqpS1m8DDK' } }],
    lyrics: `საყვარლის საფლავს ვეძებდი,
ვერ ვნახე!.. დაკარგულიყო!..
გულამოსკვნილი ვტიროდი:
„სადა ხარ, ჩემო სულიკო?!" (2)

ეკალში ვარდი შევნიშნე,
ობლად რომ ამოსულიყო,
გულის ფანცქალით ვკითხავდი:
„შენ ხომ არა ხარ სულიკო?!" (2)

სულგანაბული ბულბული
ფოთლებში მიმალულიყო,
მივეხმატკბილე ჩიტუნას:
„შენ ხომ არა ხარ სულიკო?!" (2)

შეიფრთხიალა მგოსანმა,
ყვავილს ნისკარტი შეახო,
ჩაიკვნეს-ჩაიჭიკჭიკა,
თითქოს სთქვა: „დიახ, დიახო!" (2)`,
  },
  {
    id: 'fs-c23', num: '23', title: 'გაზაფხულთან ერთად ვიტყვით სიმღერას', region: 'kalakuri',
    versions: [
      one('სრული', '1FDLRNTl_pvOvNhWih5vFhXAINmSqV7-d'),
      one('შესავალი', '1gcoerNGc-ocsaFCY6Hy5AxE95R2hJ4Bg'),
      { label: 'ფრაზა 1–2', tracks: { v1: '1TwWCjomJQhQDO1rYZ5-wGU-O5wvM5mIp', v2: '1q8Y-XOTBgoB8mExFv66z6suBvVy0LeaM', v3: '1vLKqPprc0zM_Bb12jC4F47tPJGdlTO-v' } },
      { label: 'ფრაზა 3', tracks: { v1: '1KKpFUDIL6LTJ1lxqRfg5mLanAb_LNW1x', v2: '1GB5aDEUzZogD5QdqNK0TcAQ5XAdoe4Xo', v3: '1hALVrOlMDFtl_sKyUw3Fa-SPgFvMVgoe' } },
      { label: 'ფრაზა 4', tracks: { v1: '1x5rSYx8PAdCz335CGKT-RjQXzxuNwg8-', v2: '151ZF5N6uAT4i9oiYBQ8lPy7C_QDXDW9D' } },
    ],
    lyrics: `გაზაფხულთან ერთად ვიტყვით სიმღერას,
გაზაფხული სიყვარულით იწვის,
დინჯად მხოლოდ ალაზანი მიღელავს,
რამდენი რამ უნახავს და იცის.

სიზმარივით გაფრინდება ბავშვობა,
ეს დღეები გვეხსომება, ვიცი,
პირველად რომ პაემანზე მოხვედი
და პირველი სიყვარულის ფიცი. (2)`,
  },
  {
    id: 'fs-c26', num: '26', title: 'ქარი გიმღერის ნანასა', region: 'kalakuri',
    versions: [
      { label: 'სრული', tracks: { all: '1gNq1rW2WRNxeuvQ1y-vrCmg0Ftkq8fBZ', v1: '193RSnOVCmXLHzD9zln7lRwNCjirPBPQI', v2: '1qMBhxk-eL5DtMUbKmIexUiNgEOSV4zWk', v3: '1557QycblfaexBgUKyITkm5ZBzoGckdC0' } },
      { label: 'მისამღერი', tracks: { v1: '1XradoXgSrGwgee1t2HqSZsh1YonlVkd6', v2: '1BrbuaDFPY9QUkv6-edzSlCesEmSaSSWC', v3: '1UVxvkPMCN81v8Qm7NuQb8UzooY6xDycj' } },
    ],
    lyrics: `ქარი გიმღერის ნანასა,
ზღაპარს გიამბობს ჭადარი.
ძეწნამ ალერსით ამავსო,
ეჭვებით ნაავადარი.

საქართველო, ლამაზო!
სხვა საქართველო სად არის?

მინდვრები, ქართლის მინდვრები,
ქედები, მხარგაშლილები,
მთაში ტყე-დანაბინდები,
ტყეში ქორბუდა ირმები.

საქართველო, ლამაზო!
სხვა საქართველო სად არის?`,
  },
  {
    id: 'fs-c27', num: '27', title: 'ჩონგურს სიმები გავუბი', region: 'kalakuri',
    versions: [
      { label: 'სრული', tracks: { all: '1tT9kzfcfADdDLIBEPwcGQ4CdqdUILVmd', v1: '14GRRo-UsT9Sx4DTXcpFSoayLyHjOV2RT', v2: '1Z6jD2OOJWIXbnhA4-PDX_4ejLIZ4nKww', v3: '1qgMrZCtHy2s2heRD4-vAVLeVG100dI_f' } },
      one('შესავალი', '1hKtUcB3ecXRLMFYAKbRxZHkwC4FYYrZq'),
    ],
    lyrics: `ჩანგურს სიმები გავუბი,
მოვმართე ნელა-ნელაო;
შევუხმატკბილე ერთმანეთს:
„ოდელა-დელა-დელაო!" (2)

ჩანგური საქართველოა,
სიმები ჩვენ ვართ ყველაო,
სხვადასხვა კუთხის შვილები:
„ოდელა-დელა-დელაო!" (2)

ერთი მათგანიც რომ გაწყდეს,
მაშინვე უნდა შველაო,
რომ არ გაფუჭდეს ჩანგური:
„ოდელა-დელა-დელაო!" (2)

ერთობა ჩვენთვის ტახტია,
მტრებისთვის — სახრჩობელაო!..
მტრებს „ვაი-დედა" ვაძახოთ
და ჩვენ ვთქვათ: „დელა-დელაო!" (2)

ჩანგურს სიმები გავუბი,
მოვმართე ნელა-ნელაო;
შევუხმატკბილე ერთმანეთს:
„ოდელა-დელა-დელაო!" (2)`,
  },
  {
    id: 'fs-c141', num: '141', title: 'ჩემო ციცინათელა', region: 'kalakuri',
    versions: [{ label: 'სრული', tracks: { all: '1nhoUYL926zAQs0x8CCKSrgRs71pZihYw', v1: '17nyKHkroPUspH0pijfvHnuQO1xOAJZeG', v2: '1JBgX8aKVyAuD1ELJPhbOjVx6zh8hJRSV', v3: '1f-q5TEDcvYKPiZSUCUnQQXTsbpwsvf-o' } }],
    lyrics: `ჩემო ციცინათელა!
რად დაფრენ ნელა-ნელა?
შენმა შორით ნათებამ
დამწვა და დამანელა!

ანათებ და კარგი ხარ,
მე თუმც არას მარგიხარ!
ჩემი იყო, ის მინდა,
შენ კი სხვისკენ გარბიხარ!

ისევ შენ და ისევ შენ,
ჩემო ციცინათელა,
მე ვარ შენი ერთგული,
სხვა მოგატყუებს ყველა.

ჩემო ციცინათელა!
რად დაფრენ ნელა-ნელა?
შენმა შორით ნათებამ
დამწვა და დამანელა!`,
  },
  {
    id: 'fs-c-dalie', title: 'დალიე', region: 'kalakuri',
    versions: [one('სრული', '1FKvN1uef7HND1gHl-lyep9pqs1n3NBEJ')],
    lyrics: `დალიე, ღვინო იქნება, ჰოო, დალიე, დალიე,
დალიე და შეგერგება, ჰოი, დალიე, დალიე.
ჩვენი მასპინძლის მარანში, ჰოუ, დალიე, დალიე,
სულ ლხინია და თამაში, ჰოუ, დალიე, დალიე.

ჩვენი მასპინძლის მარანში, ჰოუ, დალიე, დალიე,
ვაზის ხე ამოსულიყო, ჰოუ, დალიე, დალიე,
თავში მოსული მკრეფელი, ჰოუ, დალიე, დალიე,
ბოლომდე ჩამოსულიყო, ჰოუ, დალიე, დალიე.

დალიე და დადგი თასი, ჰოუ, დალიე, დალიე,
დალიე, ღვინო იქნება, ჰოო, დალიე, დალიე.
ჰოოო`,
  },
];

const DRIVE_VIEW = (id: string) => `https://drive.google.com/file/d/${id}/view`;
export const songDocUrl = (doc: SongDoc) => DRIVE_VIEW(doc.id);

// Compact (no artwork) SoundCloud widget
export const soundcloudEmbedUrl = (trackUrl: string) =>
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}` +
  '&color=%23d97706&auto_play=false&visual=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false';

// Player media for one version of a song (same shape the chant player uses)
export const songVersionMedia = (song: FolkSong, version: SongVersion): ChantMediaItem => {
  const url = (id?: string) => (id ? `${AUDIO_PROXY}/${id}` : '');
  const { all, v1, v2, v3 } = version.tracks;
  return {
    key: song.id,
    title: song.title,
    folderId: '',
    folderUrl: '',
    tracks: [url(v1), url(v2), url(v3), url(all)],
    availableVoices: { voice1: !!v1, voice2: !!v2, voice3: !!v3, all: !!all },
    notes: [],
    lyrics: song.lyrics,
  };
};

export const songsInRegion = (region: FolkRegionId, showOwnerOnly: boolean) =>
  FOLK_SONGS.filter(s => s.region === region && (showOwnerOnly || !s.ownerOnly));
