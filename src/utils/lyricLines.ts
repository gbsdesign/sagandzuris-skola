// A folk song's text (its `lyrics`, or public/song-texts/<id>.json) → the lines that are sung, for „გააგრძელე!“
// (utils/gagrdzele.ts): the singers' labels („1 სოლისტი:“, „გუნდი:“, „I სოლისტი (2 ხმა)“), the lines' numbers („1.“) and the
// repeat marks after a line („(2)“, „(2-ჯერ)“, „(ბანი)“) go; a letter in brackets inside a word is sung („სქან(ი)“ → „სქანი“).
// Used by scripts/build-lyrics-pool.mjs, which writes data/lyricsPool.ts.

const ROLE = '(?:სოლისტი|სოლისტები|გუნდი|ორივე|მისამღერი|მთქმელი|მოძახილი|ყველა|ბანი)';
const LABEL_ONLY = new RegExp(`^(?:[IVX]+|\\d+)?\\s*${ROLE}\\s*(?:\\([^)]*\\))?\\s*:?\\s*$`, 'u');
const LABEL = new RegExp(`^(?:[IVX]+|\\d+)?\\s*${ROLE}\\s*(?:\\([^)]*\\))?\\s*:\\s*`, 'u');
const GEO = /[ა-ჰ]/;

export const lyricLines = (text: string): string[] => {
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let l = raw.trim();
    if (!l || LABEL_ONLY.test(l)) continue;
    l = l.replace(/^\d+\s*[.)]\s*/, '').replace(LABEL, '');
    l = l.replace(/\s+\([^)]*\)/g, '').replace(/\(([^)\s]*)\)/g, '$1').replace(/[[\]()]/g, '');
    l = l.replace(/\s+([,.!?;:])/g, '$1').replace(/\s+/g, ' ').trim();
    if (GEO.test(l)) out.push(l);
  }
  return out;
};

/** a line as it is compared: no punctuation, one space */
export const lineKey = (l: string) => l.replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** a line worth asking (or offering): two words or more, eight letters or more */
export const fullLine = (l: string) => lineKey(l).split(' ').length >= 2 && (l.match(/\p{L}/gu)?.length ?? 0) >= 8;
