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

| `a1`–`a8`, `a28`, `a29`, … | „ქართული გალობის ანთოლოგია“ (29 vols, galobani.ge PDFs: the user's Downloads, Drive „01 ანთოლოგიის ტომეულები“, or `https://pub-f947f7afe8cc44c4928fdba6e2fbb528.r2.dev/antologia_<vol>.pdf`), only versions the books above lack; number with a letter → file number (vols I–III and XXVIII: 76a = 761; from vol. IV on ×100: 12b = 1202, because vol. IV has both 12b and №122; `numLabel` shows „76a“); a litany of short numbers = one unit file named by its first number (`numLabel` „98–107“) | PDF = book | `src/data/anthologyChants.ts` (`ATTACH` by chant id — any tab — and `NEW_ITEMS` after or before an item; East Georgian vols II–IV in `anthologyEastChants.ts` → the ქ.კ. row, vol. V on in `anthologyWestChants.ts` → გ.ს.); the rite tabs in `riteChants.ts` |
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
  Fifth round (2026-10-28, `fixes4.txt`, 19 notes in 6 files): line-end chords with a semitone/tritone clash and a note
  outside the line's key, checked on the picture — a key change after a barline missed in v8/166 lines 3 and 11, kk/210
  line 5, karb/105 line 10, karb/052 line 1 (bass), v8/084 line 8 (bass); karb/150 line 21 voice I last note B♭→A.
  The other line-end clashes are the books' own (per-voice key signatures, printed ♮, divided bass).
  Rhythm fixes (same day; a note of one voice still sounding when its next note starts, checked on the picture):
  dasd2 bass in 29 files (the bar „…შენ-ნი, ღმერ-თო, ა-ლად ცეცხ-ლი-სა“: a doubled F3 quarter → eighth, the rest of the
  line half a beat later), dasd2/003 voice II line 1 rebuilt (beats 0–10), song/004 line 8 voice I two 32nd notes read
  as quarters (everything after the line moved 1.75 beats earlier). The other overlaps are divided voices in the books.
  Silences and early line ends (same day, 104 of 180 lines checked on the picture; the rest are book rests): v5/004
  line 2 voices II–III two beats late, line 10 voice I triplet misread; dasd2/083 line 11 voice II last notes 4 beats
  early; triod/054 the OMR dropped one part of a divided voice in 14 places (voice I lines 3–6, 8, 11, 12; voices II–III
  line 12) — 60 notes added, so voice I there now overlaps itself on purpose.
  The other 76 lines + the first check's side notes (same day, each fix confirmed by a second picture check; exact notes in the
  commit of 2026-10-28 "fix 33 errors"): triod/107 key signatures (2♭) printed mid-line in lines 12, 15, 18 were ignored —
  20 notes → B♭/E♭; dropped eighth rests (a voice half a beat early, its last note stretched) in v5/131 lines 2, 3, 5,
  7, v5/132 line 10, v5/134 line 6, v5/135 line 2, v5/136 line 7 (all voices); v5/132 line 8 F→F♯ (accidental over
  the line break); v5/124 line 4 bass B♭→B, lines 10 and 13 divided voices misread (line 13 one beat shorter); v5/098
  line 2 voice II sextuplet; v8/004 and v8/005 line 6 bass (+ v8/004 voice I) rhythm; triod/140 line 1 bass divided
  part added; song/003 the 5- and 7-note runs fill one beat (3/4 bars; the song is 4 beats shorter) + line 3 eighth
  rest; song/005 missing rests (bars at 58, 107, 152.5) and voice I/II eighth + rest endings in lines 9–12.
  Voice-offset round (2026-10-28, a voice's note starts meeting the others' once moved by a fraction of a beat; each fix
  confirmed by a second picture check): a 16th read as an eighth (a voice ¼ beat late, the line's last notes stretched)
  in v8/052 l.4, v8/056 l.4, v8/090 l.10, v8/128 l.6, v8/160 l.10 and l.16; a dropped eighth rest or misread dot (½ beat)
  in dasd2/030 and 033 l.1, feast/105 l.3, triod/055 l.1; missed ties (two notes of one pitch that must sound as one) in
  karb/151 l.12, karb/163 l.23, karb/183 l.11 (voices II and III), v5/086 l.4. Not applied (the second check never ran):
  v5/133 l.8, v5/134 l.10, v5/135 l.1, v5/138 l.3, v5/140 l.2, v9/063 l.2, v9/091 l.3 — a voice looks ½–1 beat off there.
- The books' OMR scripts live only in the user's old session scratchpads — not in this repo (the anthology's are: `scripts/omr/`).
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

## Folklore Centre's Drive albums (`centreSongs.ts`, built 2026-10-29)

- Drive „ფოლკლორის ცენტრი“ = three folders — „სიმღერები“ (327 album folders, 6 896 mp3s), „გალობა“ (281, not done yet),
  „სხვა“ (16 folders, 107 files). Each album folder is one album; the user's split left suffixes „• სიმღერები“ / „• გალობები“ /
  „• სხვა“ on the names (cut off in the app).
- „სხვა“ (2026-10-29, the user's choices): a folder whose name is a song album's joins that album (13), two whole albums join the
  songs' list („მრავალხმიანობის კონფერენცია ბორჯომში“, „…თვითმასწავლებელი“), and the rest go by `songs.py` (MTKMELI, INSTRUMENT,
  FORCE, ALBUM_ONLY) — the poets' disc „ლექსის თქმა მწადის ერთისა“ and the ensemble მოყვარე's talk are the მთქმელი map's albums;
  the disc's voices are „მელექსეები“ (`centreOther.ts` by `scripts/centre/mtkmeli.py`: all in მცხეთა-მთიანეთი — the disc is
  Pshav-Khevsur poetry, the web had nothing on the poets; ივანე წიკლაური = გუდამაყარი from Aslanishvili's 1949 file; Kotetishvili's
  readings go to the poem's author or to „ხალხური ლექსები“, id `rc-folk`, not counted as a მელექსე; no texts — 20th-century poets);
  songs on a poet's words („ოდესაც გიცქერ“, „დავრდომილი სნეული“, „ჩემო კარგო ქვეყანა“) → ქალაქური; ფანდური and სალამური (one
  recording each) → the instrument's window; the 2 chants and „სმური“ (unclear whether sung) stay in their albums. Sung
  mountain „ლექსი“ there binds as a song (`NOT_SKHVA`). Inputs `other_albums.tsv` / `other_files.tsv` beside the others.
- Songs done (the user's choice: no review page — every album shows under the songs map with its own name, the sure ones
  also join their songs, the rest the user moves from the album with „გადატანა“). Generated by `scripts/centre/`
  (`dump-songs.mjs` → `songs.py` → `emit.py`; the Drive listing TSVs are not in the repo — make them again with the Drive
  connector: one `search_files` with `pageSize: 1000` per ~20 folders, `parentId = … or …`; the connector's page tokens repeat
  pages, so split by folders or by `createdTime`). Regenerating rewrites `centreSongs.ts`, `centreOther.ts` and `public/centre/`
  — moves made in the app stay (`settings/placements`, keyed by Drive file id).
- Sure = the album is one region's (expeditions, collections, region discs — the `A` table in `songs.py`), the file names the
  region, a local ensemble sings a title its region has, or the title is a song only one region has (not a genre word).
  3 491 takes: 407 songs got more, 1 247 new songs (`fc-…` ids). Files the site already had (same size as a bound file, mostly
  the „• ალაზანი“ albums) are not added again — the album row shows their song through the old file (`same`).
- Learning albums („შევისწავლოთ…“, „სასწავლო ჩანაწერები“): full + voices I–III make one take (`CentreRec.voices`, the player
  offers the voices). Album names that are a land („გურია“) read „ალბომი „გურია““ as a performer.
- **Who hears what** (2026-10-29, the user: „ვერც კი ხედავდეს რომ იქ რამეა“): `data/albumAccess.ts` — staff (teachers,
  admins) every album; a member only what an admin turned on, 🎧 listen and ⬇ download apart, for everyone
  (`settings/albumAccess.all`, ⚙ „სკოლა“ → „ალბომები“) or for them (`albumAccess/{uid}.albums`, their window → „ალბომები“;
  rules: they read, admins write). FOLK_SONGS as `songsData.ts` writes it has none of the albums' takes
  (`withCentreAlbums` adds them); `placements.ts` lays in only the allowed albums' takes (re-applied on `onAlbumAccess`), so a
  song made only of a closed album's takes, the album and the list under the map are not there for that member. In a song,
  a take needs 🎧; its MP3/offline follows ⬇. On the album page ▶ needs 🎧, ⬇ saves the mp3. The UI says only „ალბომები“
  (the user had the Folklore Centre's name taken off).
- Album page `components/maps/SongAlbumPage.tsx` (`mapItem` `album:<folder id>`, list `public/centre/<folder id>.json` fetched on
  open, cached by the service worker as `sagandzuri-centre-v1`); list under the map `CentreAlbums.tsx` (the map's search finds
  albums too). The old Audiomack recordings keep `settings/centreDownload`. The shared player is `utils/useAlbumPlayer.ts`
  (with `crossOrigin` — the chant albums had none).

## Calendar (`calendar/<year>.json`, `churchCalendar.ts`)

- Generated by `node scripts/fetch-church-calendar.mjs <old-style year>`; it also links saint lives
  (`scripts/lib/saint-lives-match.mjs`). Folder 2026 covers 14 Jan 2026 – 13 Jan 2027. Steps: `/update-calendar`.

## Texts and copyright

- მთქმელი (`mtkmeliData.ts`): full texts only for authors who died before 1956 (kept in
  `public/mtkmeli/<work id>.json`, fetched when opened; the work has `hasText: true`); others get title +
  description + wiki link. Use only titles verified on Wikipedia/Wikisource.
- Saint lives are from the Patriarchate's „წმიდანთა ცხოვრება“ (2001); the user chose to include full texts.
- Prayers: `prayers.ts` + `public/prayers/<id>.json`; `girsArs.ts` has the seasonal Axion rules.

## Anthology notes (R2 bucket `sagandzuri-notes`, not in the repo)

- Since 2026-10-30 the files `a<vol>/NNN.json`, `NNN-K.webp`, `i/NNN.webp` live in Cloudflare R2 (the site may hold only
  20 000 files) and are read from https://sagandzuri-notes.mr-gabunia.workers.dev/ (`utils/notesBase.ts`; Worker
  `worker/notes`; offline: the service worker keeps them in `sagandzuri-notes-v1` like the other notes). New or corrected
  files: push a branch `notes-upload` (workflow „Notes on R2“ — steps in `scripts/omr/README.md`). Every other book stays
  in `public/notes/<book>/`.

- Read from the vector music font of the galobani.ge anthology PDFs (Finale Petrucci / Maestro) by `scripts/omr/omr.py`
  (how to run: `scripts/omr/README.md`; in a cloud session set `ANTH_DIR` to a folder holding the PDF): stems, beams (also
  `re` rectangles), flags, dots, ties, triplets („3“), bracketed editorial accidentals, two voices on one staff (stems up and
  down close together; a stemless note beside a stemmed one), a head with two stems, small (cue) heads not played; a
  recitation note (breve) lasts until the other voices' next note (else ½ beat per syllable); tempo 72. `--to <last>`
  reads several numbers as one unit.
- Vol. I's Petrucci subset gives its glyphs other codes (heads are control characters): `REMAP_V1` in omr.py, each glyph
  identified on the page pictures (vol. VIII's subset numbers heads and rests differently again: `REMAP_V8`, chosen when
  the font has \x05); its bracketed accidentals are single glyphs; a note in round brackets and an ossia line
  („ან ასე:“) are not played; short pieces may stand two to a row (staves under 150 pt, twin numbers).
- Duplicates are found by comparing the notes with the site's versions (`compare.py`, `matrix.py`): a match stays on the
  site and the anthology version is left out. Compare within the chant's own versions, transposition-free, and also by staff
  steps (the anthology often renotates a chant without the edition's flats: same notes, other accidentals — a duplicate).
  Done: მხოლოდ-შობილი from all volumes (study collections: only 04 lists „მხოლოდ-შობილო (ხ.)“ — not compared yet); the whole
  of vol. I (2026-10-29): its Chrysostom liturgy is vol. V (same Koridze edition), its Presanctified/Holy Week chants are
  vol. IV; 54 files added — წირვა versions, მარხვანი (Lenten hours, Presanctified), the feast „წმიდა ფილიმონ მგალობელი —
  12 ივლისი“, and the new tabs პანაშვიდი (funeral), ჯვრისწერა, ხელდასხმა. A chant there that vol. VIII already has with the
  same words is shown from vol. VIII (same tune with other words — the funeral canon's irmoi — gets its own file).
  Unreviewed guesses: „ზეცით გამოჩინებულისა“ (Basil's liturgy, after შენდამი იხარებს), „მოსლვისა შენისა“ starting the
  wedding part.
- Vols. II–III (2026-10-29, East Georgian = ქ.კ. row after kk): ~560 versions in `anthologyEastChants.ts` (with vol. IV's),
  kept only when no version of the target chant (or of any book) has the same notes (≥ 0.9 by containment or intervals).
  Vols. II–III print the number beside its system (`music_top`), letter variants as „81-a“; a litany of many short numbers
  is one unit (`--to`), but a TOC range of whole versions (prokeimena „6–11 ხმა ა“, ის პოლლა 146–150) is read one by one.
  Two numbers in one row: the row is split by side, full-width lines below continue the right-hand one. Music below a
  page's footnotes (a plain small line „1) …“, not the bold markers) is an example quoted there and is not read — unless
  the chant's own number stands there. Up to 10 voices (II №211–214, 215–217). Left out: the
  fragments the book itself calls unperformable (II 36a, 289, 347; III 221, 337). New items (guesses from the books'
  introductions, vol. II pp. 18–24, vol. III pp. 11–15): the bishop's meeting chants before/after chant-1–2, აქებს სული ჩემი,
  three weekday antiphons, დიპტიქი, წარდგომანი დღიურნი, three hymns after განიცადე; feast antiphons, რაოდენთა (შობა),
  ჯვარსა შენსა (ჯვართამაღლება), feast prokeimena (III №73 under both ნათლისღება and ბზობა), Pascha's in zt-6, the funeral
  litany in pn-2, and the feast „წმიდა ძმანი კარბელაშვილნი — 24 აგვისტო“ (6 Sep new style, calendar 2026).
- Vols. IV–V (2026-10-30): IV (Chijavadze-Mikhailov's and Arakishvili's liturgy, Basil's, Holy Week, the hours, the
  Presanctified, the Karbelashvilis' wedding and ordination) → 202 versions in `anthologyEastChants.ts` (ქ.კ.); V (Khundadze's
  liturgy 1911, Koridze's Pascha and great feasts) → 129 versions in `anthologyWestChants.ts` (გ.ს.); 32 and 69 were duplicates.
  Both print their tables of contents in two columns (read by word positions) and vol. V prints some heads „@60.“ (`head_num`
  drops the „@“). New items: „ნეტარ არს კაცი (ზიარებისას)“ after chant-v5-99, four wedding chants in ჯვრისწერა (`jv-a4-192…196`),
  the feast group „შესხმანი — წმიდანთა და დღესასწაულთა“ (`sd-a5-68`, V №68–72) after sd-35. Placements are guesses.
- Vols. VI–VIII (2026-10-30) = the Heirmologion (Kereselidze's mss. Q684 — Anton Dumbadze, Q687, Q689 — Aristo Kutateladze;
  Gelati school, გ.ს.) → 479 versions in `anthologyWestChants.ts` (VI 143, VII 126, VIII 210; 33 duplicates). The user's
  choice: every irmos goes to its tone in ძლისპირები (`dz-1…8`, now `withAnthology`) — or to the katavasia canon (`kt-N`)
  whose irmos has the same opening words, ode and tone; no tone in the book („?“) → new item „ხმა უცნობია“ (`dz-a8-12`); other
  kinds go to their chants (VII: ნეტარ არს კაცი, the tone-1 anabathmoi in ck-11, Resurrection stichera in mw-8, ნათელი მხიარული,
  the wedding's წმიდანო მოწამენო / დიდება შენდა; VIII: Pascha's იპაკო, ღირს არს, უმეტესად კურთხეულსა) or, without a
  place of their own, to „სხვა საგალობლები — ძლისპირთა წიგნებიდან“ (`dz-a6-1`). A notes match with other words (a sticheron
  sung to an irmos' tune, vol. VIII's „ქება ქებულთა“ №203–220 vs vol. I) is not a duplicate: words are compared by their
  first 12 letters. Left out: VIII №202 „ფეხის-ბანა“ (the archdeacon's one-voice recitation). Placements are guesses.
