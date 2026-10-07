# src/data — chant books, recordings, calendar

Big files here must be searched, not read whole (see the table in the root `CLAUDE.md`).

## Chant books → book notes

Each version has `public/notes/<book>/NNN.json` + `NNN-K.webp`, named after its first number. Multi-number
litanies are one unit (e.g. kk 004 = №4–13). Small (cue-size) heads are deliberately not played.

| Folder | Book | Book page = PDF page − | Placed by |
|---|---|---|---|
| `book` | Gelati school, vol. I (№1–255), code "გ.ს." | — | `gelatiBookChants.ts`, `tsirvaChants.ts` (`TSIRVA_BOOK`) |
| `feast` | Gelati feasts, vol. II (№1–129) | 24 | `feastBookChants.ts` — tab სადღესასწაულო, ids `sd-N` |
| `kk` | Kartli-Kakheti, vol. III (№1–240), code "ქ.კ." | 16 | 3rd list in `gelatiBookChants.ts`; `TSIRVA_KK`; index `kartliKakhetiIndex.ts` |
| `triod` | Gelati Lent + Pascha, vol. IV (№1–151) | 16 | `triodionBookChants.ts` — მარხვანი `mx-N` (№1–94), ზატიკი `zt-N` (№95–151) |
| `v5` | Liturgy vol. V (№1–119 Gelati, №120–142 Shemokmedi) | 30 | `TSIRVA_V5_GS` / `TSIRVA_V5_SH`; index `liturgyVol5Index.ts` |
| `karb` | Karbelaant mode, vol. VII (№1–187) | 16 | `karbelaantBookChants.ts` (`withKarbelaantFeasts/Lent/Pascha`) |
| `pat` | Patarava 2003 (11 of 29 chants) | 18 | `pataravaBookChants.ts` |
| `v9` | Gelati vol. IX, 2023 (scan, №1–101) | 11 | `TSIRVA_V9`; 4th list in `gelatiBookChants.ts`; index `liturgyVol9Index.ts` |
| `v8` | Vol. VIII „რვახმა საცისკრო ძლისპირები" (no school named; code "რ.ძ."; no printed numbers — files 1–166) | −1 / −2 from PDF p. 108 / −3 from p. 307 | `irmosBookChants.ts` — tabs ძლისპირები (`dz-N`, 8 tones) and კატაბასიები (`kt-N`, 12 canons + Resurrection kontakia); feast names identified from the first irmos, two canons left unnamed |
| `momix` | „ჰიმნოგრაფიული კრებული" I, troparia on the Beatitudes (Kereselidze mss., code "ე.კ."; no printed numbers — files 1–268 in book order) | 0 | `beatitudesBookChants.ts` — tab მომიხსენენი, 59 groups `mm-N` (tone + day) |

- The Hymnographical collection (მომიხსენენი, დასდებელნი) is Sibelius/Opus-font engraving: the OMR needed a WinAnsi→MacRoman
  glyph map, "q=80" tempo marks, chant starts from the "Troparion N / Glory. / Now and." titles, and `SMALL_RHYTHM=1`
  (a lone small head sings only where its voice would otherwise come out short by exactly its length). Scripts: session
  scratchpad `dfa1e456…/scratchpad/omr` (`scan_momix.mjs`, `export_momix.mjs`, `gen_momix_ts.cjs`), scale 1.0478.

- Liturgy ids: first ornate kk version `v-n-4`, first plain kk `v-n-3`, further `v-n-kNNN`; vol. V `v-n-vNNN` /
  `v-n-sNNN`; vol. IX `v-n-xNNN`. Vol. III №87–98 is the 4-voice litany (voices I–IV + "ყველა").
- `public/notes/kk/139.json` has a hand fix (B♮ held across a line break, t=80–92). A re-export would undo it.
- The OMR scripts live only in the user's old session scratchpads — they are not in this repo.
- Unreviewed guesses (don't present as confirmed): vol. I↔III matches, vol. V/IX placements, which book
  version a liturgy recording follows (the `main` flag in `TSIRVA_BOOK` moves a recording to another version).

## Recordings (`chantMediaRegistry.ts`)

- `CHANT_MEDIA_REGISTRY[key]` holds a Drive folder's tracks `[voice1, voice2, voice3, all]` as
  `https://drive.usercontent.google.com/download?id=<fileId>&export=download`; at load time they are
  rewritten to the audio Worker.
- `VARIANT_MEDIA` ("chant-N|variantCode" → registry key) is the ONLY binding. Steps: `/add-recording`.
- Don't bind Drive `ნოტები` sheets for new recordings — the app shows book notes only.
- Undecided keys: 1.1 / 8.1 / 8.2 (და სულისაცა: chant-15 or chant-26?), 4 (ანტიფონები), 8.0 (no audio).

## Other choirs' chant recordings (`chantRecordings.ts`)

- `CHANT_RECORDINGS[variantId]` = recordings from Drive „ანჩისხატი“ (albums 1–4 by school) and „ალაზანი“ (Artem
  Erkomaishvili, Shavnabada), bound by version id only where one book version fits (built 2026-10-07, 56 files).
  The notes page lists them under „შემსრულებელი“ after the school's own recording. Many more chant files there are
  unbound (several versions of one school, or no notes in the app) — the user chose "don't bind when unsure".

## Folk songs (`songsData.ts`)

- Hand-made songs are `BASE_SONGS`; `FOLK_SONGS` = them + `songArchive.ts` (505 songs / 983 one-track recordings
  from Drive „ალაზანი“ + „ანჩისხატი/5 სიმღერები“, generated 2026-10-07 by a scratch script — regen would undo hand
  edits). Same title + region merges into a hand-made song (`recs`). `area` = sub-area (ხევი, თუშეთი…), list filter.
  ~275 archive files were left out (region unclear); ლაზეთი is a list-only region (`FOLK_EXTRA_REGIONS`).
- Song page: `components/maps/SongPage.tsx` (history `sgSong`), words from `song.lyrics` or `public/song-texts/<id>.json`
  (none yet — no bulk source found online; don't write lyrics from memory).
- Region guesses for many hand-made songs are unconfirmed.
- Songs with `pendingWma` wait for the user's mp3 upload to Drive; then bind the new ids and remove the flag.
- Song `fs-e12` „ქ.კ. (ვიდეოდან)“ points to an mp4 — the Worker serves only `audio/*`, so it returns 502.

## Calendar (`calendar/<year>.json`, `churchCalendar.ts`)

- Generated by `node scripts/fetch-church-calendar.mjs <old-style year>`; it also links saint lives
  (`scripts/lib/saint-lives-match.mjs`). Folder 2026 covers 14 Jan 2026 – 13 Jan 2027. Steps: `/update-calendar`.

## Texts and copyright

- მთქმელი (`mtkmeliData.ts`): full texts only for authors who died before 1956 (kept in
  `public/mtkmeli/<work id>.json`, fetched when opened; the work has `hasText: true`); others get title +
  description + wiki link. Use only titles verified on Wikipedia/Wikisource.
- Saint lives are from the Patriarchate's „წმიდანთა ცხოვრება“ (2001); the user chose to include full texts.
- Prayers: `prayers.ts` + `public/prayers/<id>.json`; `girsArs.ts` has the seasonal Axion rules.
