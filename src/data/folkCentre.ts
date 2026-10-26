// Recordings of the Folklore Centre (ფოლკლორის ცენტრი, folk.gov.ge), published on Audiomack (audiomack.com/folkcentre).
// They join a folk song as further performances, under the performer's name only. Played in Audiomack's own player
// until an mp3 of the recording is in the school's Drive (`mp3`): then the school's player plays it, and its MP3 /
// offline menu shows only to members an admin allowed (settings/centreDownload, hooks/useCentreDownload.ts).

export interface CentreRec {
  who: string;   // performer, as the take's label: „ხუხუნაიშვილები“
  page: string;  // Audiomack path after audiomack.com/: 'folkcentre/song/<slug>'
  mp3?: string;  // Drive file id, once the file is in the school's Drive
}

/** song id (data/songsData.ts) → the Centre's recordings of it */
export const CENTRE_SONG_RECS: Record<string, CentreRec[]> = {
};

export const audiomackEmbedUrl = (page: string) => {
  const [artist, kind, ...slug] = page.split('/');
  return `https://audiomack.com/embed/${kind}/${artist}/${slug.join('/')}?background=1&color=7a2028`;
};
