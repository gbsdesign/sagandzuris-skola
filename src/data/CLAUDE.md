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
| `dasd1` / `dasd2` | „ჰიმნოგრაფიული კრებული" II (tones I–II, files 1–250) / III (tones III–IV, 1–277): stichera on "Lord, I have cried" + the psalm verses (plain and „ჭრელი"); code "ჰ.კ." | 0 | `sticheraBookChants.ts` — tab დასადებლები, 129 groups `ds-N` (tone · day — kind). A title with no music whose footnote says "იხილე — გვ. N, # M" is a cross-reference: its button opens the chant printed on p. N (no file of its own) |
| `momix` | „ჰიმნოგრაფიული კრებული" I, troparia on the Beatitudes (Kereselidze mss., code "ე.კ."; no printed numbers — files 1–268 in book order) | 0 | `beatitudesBookChants.ts` — tab მომიხსენენი, 59 groups `mm-N` (tone + day) |

| `a28`, `a29`, … | „ქართული გალობის ანთოლოგია“ (29 vols, galobani.ge PDFs in the user's Downloads), only versions the books above lack; number with a letter → file number (76a = 761, `numLabel` shows „76a“) | PDF = book | `TSIRVA_ANTH` in `tsirvaChants.ts` (so far only მხოლოდ-შობილი); tab გელათური is a guess |
| `song` | Admission-program songs (files 1–10; 9–10 are scans: pictures only, no synth) | — | `songBookChants.ts` from `abituriProgram.ts` (`notes: N`); ids `sg-N`, in `NOTES_LISTS` only (no service tab, not in search) |

- Song notes: Finale/Petrucci PDFs from the user's Drive (abituri page folders), read with the books' OMR + `NO_WIN2MAC=1`
  (switch added to `extract.mjs`) and `SCALE=17.52/clefSize`; exporter `export_song.mjs` (`MERGE_GAP=60` = two choirs
  sound together, 6 voices; `VOICES_LAST=3` = ლაჟღვაში plays the sung voices only) and `scan2webp.mjs`, in session
  scratchpad `44aeedc9…/scratchpad`. Songs 5–7 have no tempo mark (72). Recordings on their notes page: `programMedia.ts`.
- The Hymnographical collection (მომიხსენენი, დასდებელნი) is Sibelius/Opus-font engraving: the OMR needed a WinAnsi→MacRoman
  glyph map, "q=80" tempo marks, chant starts from the "Troparion N / Glory. / Now and." titles, and `SMALL_RHYTHM=1`
  (a lone small head sings only where its voice would otherwise come out short by exactly its length). Scripts: session
  scratchpad `dfa1e456…/scratchpad/omr` (`scan_momix.mjs`, `export_momix.mjs`, `gen_momix_ts.cjs`), scale 1.0478.

- Liturgy ids: first ornate kk version `v-n-4`, first plain kk `v-n-3`, further `v-n-kNNN`; vol. V `v-n-vNNN` /
  `v-n-sNNN`; vol. IX `v-n-xNNN`. Vol. III №87–98 is the 4-voice litany (voices I–IV + "ყველა").
- `public/notes/kk/139.json` has a hand fix (B♮ held across a line break, t=80–92). A re-export would undo it.
- Accidental hand fixes (2026-10-26, checked against the page pictures): dasd1/003–012 voice I last line E3→E♭3,
  momix/001–002 voice I t=80–80.5 C♯3→C3, v9/014 voice II t=8.5,10 F♯3→F3, karb/003 voice I t=182 G♯3→G3.
  Different key signatures per voice (e.g. treble 1♭, bass 2♭) are the books' own — not OMR errors.
  Second round (same day, 331 notes in 154 files, every one checked on the page picture): the same E3→E♭3 in dasd1/dasd2
  line 5–6 and momix line 6; mid-line key changes the OMR missed (dasd1/122–125 and 138–205 line 3, feast/045, karb/045, 051, 082; kk/029; v5/087, 098; v8/029, 033,
  056, 061, 067, 135, 159); printed ♯/♮/♭ not read (v9/034 bass ♯G at every cadence, v9/031, 041, 069, 078, 090, 091,
  099, 100; v8/083; karb/153, 173). Carry fixes (an accidental the OMR held over a whole barless line, clashing
  with another voice): book/030, feast/038, karb/100, 180, kk/040, 043, v5/124. The list with the rule per line is in that thread's scratchpad `fixes.txt`.
  Third round (2026-10-27, `fixes2.txt`, 28 notes): key change missed in one or two voices (v8/020 line 5, v8/089
  line 5, v5/136 lines 8 and 11, dasd1/120 bass line 2 kept 7♭), an accidental carried past a real barline (kk/183
  line 27, v5/027 line 1, v8/028 line 3) and an unread ♮ at a line start (v5/028 line 7). These no-clash errors are
  only found by looking: the OMR does not store barlines or key signatures.
  Fourth round (2026-10-27, `fixes3.txt`, 52 notes in 43 files): the same tune repeated across many files compared copy
  to copy, the odd ones checked on the picture — dasd1/133–139, 187, 189, 204, 205 voice II line 2 F→F♯; momix/039–077
  voice II t≈23 G→G♯; dasd1/231–234 bass lines 1–3 key change missed; dasd1/023–028 bass B→B♭ at the cadence.
  Copies that differ in the book too (v5/008 vs 009, kk/183, karb/180) were left as printed.
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
- The user placed the rest on a review page (2026-10-08): `chantAlbums.ts` holds the recordings without notes as
  albums on the chant page under „ჩანაწერები“ (choirs რუსთავი / სამების გუნდი / ფაზისი, one per school,
  „დასაზუსტებელი“), opened via `mapItem` `album:<id>` (`pages/galoba/ChantAlbumPage.tsx`).
- „გადატანა“ (`placements.ts`, `components/archive/MoveSheet.tsx`): the owner and superadmins move an archive song
  recording or an album recording to another region/song/album, or between songs and chants, from the song page or
  the album row. Stored in `settings/placements` (rule: superadmins only) and laid over FOLK_SONGS / ALBUM_RECS in
  place; code edits stay the base, so prefer moving in code when regenerating lists.

## Folk songs (`songsData.ts`)

- Hand-made songs are `BASE_SONGS`; `FOLK_SONGS` = them + `songArchive.ts` (505 songs / 983 one-track recordings
  from Drive „ალაზანი“ + „ანჩისხატი/5 სიმღერები“, generated 2026-10-07 by a scratch script — regen would undo hand
  edits). Same title + region merges into a hand-made song (`recs`). `area` = sub-area (ხევი, თუშეთი…), list filter.
  ~275 archive files were left out (region unclear); ლაზეთი is a list-only region (`FOLK_EXTRA_REGIONS`), ოსეთი too;
  „დასაზუსტებელი“ (region `unsure`, a full-row card) holds the songs the user could not place.
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

## Anthology notes (`public/notes/a<vol>/`)

- Read from the vector music font of the galobani.ge anthology PDFs (Finale Petrucci / Maestro) by `omr.py` in
  `C:\Users\mrgab\AppData\Local\Temp\anth\` (outside the repo): stems, beams (also `re` rectangles), flags, dots,
  ties, triplets („3“), bracketed editorial accidentals, two voices on one staff (stems up/down); a recitation note
  (breve) = ½ beat per syllable under it; tempo 72.
- Duplicates were found by comparing the notes with the site's versions (`compare.py`): a match stays on the site
  and the anthology version is left out. Vols II and IV (East Georgian, Maestro font) and the study collections
  are not done yet.
