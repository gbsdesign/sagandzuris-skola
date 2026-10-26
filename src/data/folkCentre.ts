// Recordings of the Folklore Centre (ფოლკლორის ცენტრი, folk.gov.ge), published on Audiomack (audiomack.com/folkcentre).
// They join a folk song as further performances, under the performer's name only. Played in Audiomack's own player
// until an mp3 of the recording is in the school's Drive (`mp3`): then the school's player plays it, and its MP3 /
// offline menu shows only to members an admin allowed (settings/centreDownload, hooks/useCentreDownload.ts).

export interface CentreRec {
  who: string;   // performer, as the take's label: „ანსამბლი „ბასიანი““
  note?: string; // a number when one performer sang it twice
  page: string;  // Audiomack path after audiomack.com/: 'folkcentre/song/<slug>'
  mp3?: string;  // Drive file id, once the file is in the school's Drive
}

/** song id (data/songsData.ts) → the Centre's recordings of it */
export const CENTRE_SONG_RECS: Record<string, CentreRec[]> = {
  'fa-adila-alipasa-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/2adila-alipasha', note: '1' }, { who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/3adila-alipasha-2', note: '2' }], // ადილა-ალიფაშა
  'fa-alilo-gu': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/09-alilo-gurian-lbedenashvili-mjavakhishvili-gchigogidze' }], // ალილო
  'fa-alilo-im': [{ who: 'ბერძენიშვილები', page: 'folkcentre/song/track-14-5' }], // ალილო
  'fa-alilo-ra-raca': [{ who: 'ანსამბლი „ბინული“', page: 'folkcentre/song/track-6-50' }], // ალილო
  'fa-alilosa-sv': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/14-alilosa-svaneti-kamashukeli-gabashidze-vtsiklauri-mjavakhishv' }], // ალილოსა
  'fa-barbal-dolas-sv': [{ who: 'ჩანაწერი 1950 წ.', page: 'folkcentre/song/cd16-35-01-03-svaneti-lanchvali-1950-332682041' }], // ბარბალ დოლაშ
  'fa-bedinera-sm': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/track-1-60' }], // ბედინერა
  'fa-berikaci-ka': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-10-32' }], // ბერიკაცი
  'fa-berikaci-var-ka': [{ who: 'მარო თარხნიშვილის გუნდი', page: 'folkcentre/song/track-10' }], // ბერიკაცი ვარ
  'fa-cakrulo-ka': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-1-49' }], // ჩაკრულო
  'fa-camokruli-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/15tsamokruli' }], // წამოკრული
  'fa-cinckaro-ka': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-6-27' }], // წინწყარო
  'fa-cmidao-gmerto-un': [{ who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/19-tsmidao-ghmerto-zemosvanuri' }], // წმიდაო ღმერთო
  'fa-cona-sk': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/22-chona-kartli-mjavakhishvili-tpapidze' }, { who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-4-27' }], // ჭონა
  'fa-cven-msvidoba-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/12chven-mshvidoba', note: '1' }, { who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/13chven-mshvidoba-2', note: '2' }], // ჩვენ მშვიდობა
  'fa-ierisi-gu': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-13-29' }], // იერიში
  'fa-kviria-sv': [{ who: 'ჩანაწერი 1950 წ.', page: 'folkcentre/song/cd16-32-00-44-svaneti-kala-1950-332672980' }], // კვირია
  'fa-madlobeli-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/06-madlobeli' }], // მადლობელი
  'fa-mravaljamieri-im': [{ who: 'ბერძენიშვილები', page: 'folkcentre/song/track-19-4', note: '1' }, { who: 'ბერძენიშვილები', page: 'folkcentre/song/track-24-1', note: '2' }], // მრავალჟამიერი
  'fa-mravaljamieri-sk': [{ who: 'მარო თარხნიშვილის გუნდი', page: 'folkcentre/song/track-22' }], // მრავალჟამიერი
  'fa-ocesxvei-sm': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/track-5-37' }], // ოჩეშხვეი
  'fa-odoia-sm': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-7-29' }], // ოდოია
  'fa-orira-gu': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/03-orira-guria-gabashidze-dtsintsadze-mjavakhishvili-lbedenashvili' }], // ორირა
  'fa-pacxa-sm': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/12-fatskha-samegrelo-gabashidze-mjavakhishvili-gkananadze-gnarma' }], // ფაცხა
  'fa-patara-sakvarelo-im': [{ who: 'ბერძენიშვილები', page: 'folkcentre/song/track-4-5' }], // პატარა საყვარელო
  'fa-sadgegrzelo-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/9sadgegrdzelo' }], // სადღეგრძელო
  'fa-semozaxili-ka': [{ who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/13-shemodzakhili-kakhuri' }, { who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/01-shemodzakhili-kakheti-mjavakhishvili-gabashidze' }], // შემოძახილი
  'fa-sesia-sm': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/track-5-36' }], // სესია
  'fa-si-kouli-bata-sm': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/track-9-37' }], // სი ქოული ბატა
  'fa-svidkaca-gu': [{ who: 'ანსამბლი „შავნაბადა“', page: 'folkcentre/song/21-shvidkatsa-guria-mjavakhishvili-lbedenashvili-gabashidze-dtsin' }], // შვიდკაცა
  'fa-tamar-dedpal-sv': [{ who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/1-tamar-dedpal-kvemosvanuri' }], // თამარ დედფალ
  'fa-tuta-axali-sm': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/track-17-34' }], // თუთა ახალი
  'fa-vaxtanguri-gu': [{ who: 'შევისწავლოთ ხალხური სიმღერა', page: 'folkcentre/song/-517' }], // ვახტანგური
  'fa-veengara-sm': [{ who: 'ანსამბლი „ბინული“', page: 'folkcentre/song/track-9-50' }, { who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/16-veengara-megruli' }], // ვეენგარა
  'fa-voisa-ac': [{ who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/10-voisa-acharuli' }], // ვოისა
  'fa-xasanbegura-gu': [{ who: 'ჯემალ ჭკუასელი', page: 'folkcentre/song/1xasanbegura' }, { who: 'ჩანაწერი 1929 წ.', page: 'folkcentre/song/khasanbegura-khalkh-momgheralta-gundi-mjavanadzisa-da-abesadzis-khemdzghvanel' }], // ხასანბეგურა
  'fs-c21': [{ who: 'ანსამბლი „ბინული“', page: 'folkcentre/song/track-14-48' }], // სულიკო
  'fs-e8': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-16-28' }], // ცანგალა და გოგონა
  'fs-w118': [{ who: 'ანსამბლი „ბასიანი“', page: 'folkcentre/song/8-imeruli-mgzavruli' }], // იმერული მგზავრული
  'fs-w136': [{ who: 'სახელმწიფო ანსამბლი', page: 'folkcentre/song/track-17-27' }], // მარებელი
};

export const audiomackEmbedUrl = (page: string) => {
  const [artist, kind, ...slug] = page.split('/');
  return `https://audiomack.com/embed/${artist}/${kind}/${slug.join('/')}?background=1&color=7a2028`;
};
