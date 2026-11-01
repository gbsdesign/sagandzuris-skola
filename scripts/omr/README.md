# Anthology notes reader (ანთოლოგიის ნოტების ამომღები)

Reads chants from the galobani.ge „ქართული გალობის ანთოლოგია“ PDFs (in the user's
`Downloads/ქართული გალობა - galobani.ge/01 ანთოლოგიის ტომეულები`) into the app's notes:
`a<vol>/NNN.json` + page pictures `NNN-K.webp` + card picture `i/NNN.webp`.
The PDFs' music is vector text (Finale Petrucci or Maestro font), so nothing is guessed from images.

**These files are not in the repository** (since 2026-10-30: the site may hold only 20 000 files). They live in the
Cloudflare R2 bucket `sagandzuri-notes` and the app reads them from https://sagandzuri-notes.mr-gabunia.workers.dev/
(`src/utils/notesBase.ts`, Worker `worker/notes`). To publish new or corrected files, push a branch `notes-upload`
that holds only `.github/workflows/notes-r2.yml`, `worker/notes/` and the files under `notes/a<vol>/…`
(`git worktree add --orphan -b notes-upload <dir>`, copy them in, commit, push): the workflow „Notes on R2“ uploads
them (a file with the same name is replaced), checks the counts and deletes the branch. The chant lists
(`src/data/anthology*.ts`) still go through an ordinary PR.

Needs Python with `pymupdf` and `pillow` (`python -m pip install --user pymupdf pillow`). Run with
`python -E -P` so the user's site-packages load but no file next to the PDFs can be imported.

In a cloud session (no Downloads folder) put the volume's PDF in a folder whose sorted names put the wanted volume
at its number (e.g. only `01 - ტომი I.pdf` for vol. 1) and set `ANTH_DIR` to it. The PDFs:
`https://pub-f947f7afe8cc44c4928fdba6e2fbb528.r2.dev/antologia_<vol>.pdf` (galobani.ge's library).

| Script | What |
|---|---|
| `omr.py <vol> <num> <outDir> <startPdfPage> [--file N] [--to LAST] [--json-only]` | one chant (or, with `--to`, the numbers up to LAST as one unit) → JSON + pictures; prints `!` for a system whose voices end at different beats (a reading error to fix); `SAME_NUM_ENDS=1` ends the chant where its own number is printed again (vol. XVI's „62.“ twice); `NEAR_ALL=1` ends it at any other number (vol. XXVII's №33 printed „64.“) |
| `compare.py "vol:num:page,…" "book/157,kk/154,…"` | reads versions and ranks them against the site's versions (1.0 = same) |
| `matrix.py "a2:277,…,kk/154"` | top / middle / bass similarity between read versions and site versions, exact pitches |
| `diffv.py a2:284 kk/154` | where two versions differ, voice by voice |
| `sysdbg.py <vol> <pdfPage> <systemTop>` | the notes read from one system (`OMR_DBG=<staff>` also prints the two-voice layering) |
| `render.py <vol> <pdfPage> <dpi> <out.png>` | a page as a picture, to look at |
| `find.py` | finds a chant's name in all volumes and study collections (edit the patterns inside) |

Checks (2026-11-01): `OMR_AUDIT=1` prints each key change found inside a line (`K …`) and accidentals no note took
(`? …`); `OMR_SPELL=1` adds each note's letter and alteration to the JSON (`spell`, for same-letter clash checks — strip it
before uploading); `OMR_ACCDBG=<systemTop>/<staff>` prints how every note of one staff got its accidental. A warning `!`
names the line (`line N`). What the reader now handles (all 4 153 files of the site were read again with it):
an accidental belongs only to a note on its own staff step (a key signature's last ♭ beside a neighbouring first note
was taken for that note's: A read as A♭, E as E♯); a key signature whose last sign stands < 8 pt before the first note;
key changes inside a line (a row of ♮/♯/♭, or one sign after a barline or at the same place on every staff; an editors'
sign over or under a note is not one); each line reads only its own width (two lines printed side by side read each
other's notes, and a piece played twice); the bracketed ♯ ♭ of vols II–XXIX (`a A [ {`, ♮ = `N`; one over or under a
note is matched by its middle, wins over a printed accidental — „(♯)“ over a ♮F is the editors' F♯ — and also holds for the
same note repeated right after it); the 16th flags `R r`; a bracketed fermata does not drop the
note under it; a crossed pair of stems (the stem-up note the lower) is read both as two voices and as notes that follow
each other, and the reading whose length the other staves have wins.

Second round (2026-11-01 evening, the user: „სხვადასხვა ხერხებით … რამე ხომ არ გამოიპარა“). `OMR_AUDIT=1` now also
prints, per line, a voice that falls silent with no rest printed or a note cut by its next one (`? … gap|cut` — the
other voices' notes struck at the same place set the time, so a misread length shows here), and flags, dots, „3“s and
„5/6/7“s that no note took (`? … unused flag|dot|3|tuplet`; signs of small notes are skipped; most unused dots are
repeat signs and staccatos). Fixed after looking at what they found: a head's normal size goes with its staff's line
spacing (smaller staves — a footnote's or a whole piece's — lost their ♭/♯), and a staff whose heads are all smaller
than the other staves' is still sung (vol. II's bass) — a short small system beside the music (a cue „თა! მომიხს…“)
stays silent; a key change before a line's first note (a line that starts with rests); a small note's own ♭/♯ no longer
lands on the full-size note beside it (C read as C♭); a drawing's beams are read with their short 16th beams (4 pt wide —
they were dropped, so a dotted 8th + 16th read 8th + 8th); two voices' rests printed at one place are one rest; a whole
note printed beside a quarter of the same pitch is the other voice's (a unison); five, six or seven notes of one value
under „5“ „6“ „7“ fill the time of four. Tried and dropped: a second printed as two stems the same way read as one
chord (more gaps elsewhere); comparing near-copies of one chant across the volumes (their differences are the editions').

Third round (2026-11-01 night, the user: „გაასწორე ეგ 2000“ — the ~2 000 gaps the second round's audit found). Fixed:
a beamed note's stem may be up to 9 line spaces long when it ends on a beam (any stem up to 7) — a 16th whose two beams
stand far from its head looked stemless and was taken for a second voice, after which every other note of the line went
to that voice and was lost (the most common cause); only a whole note is paired with its neighbour as a second voice (a
stemless filled or half head is a stem not found); a small head up to 2 pt beside a full one keeps its own stem; a
second's two notes printed side by side, stems up and down, are two voices (heads touching with the stems on the outer
sides, or — the stem-up note the lower — a little apart); at a barline a staff's two voices meet again (one left behind
holds its last note); a „3“ printed against a note head (the words join them: „3œ“) is read from its own text span, and
a triplet's window is matched by its stems (a stem up stands at the head's right edge), also among one stem direction's
notes (a head both voices sing stands in the row twice); a dot after a rest. Whatever gap is left is filled: a note
lasts until its voice's next note or rest, and a voice's last note until the line ends (the audit still prints the gaps
as read, before this). All 4 153 files read again: gaps 2 073 → 947, lines whose voices end apart 205 → 95; 534 files
changed and were uploaded.

Read versions for comparing go to `%TEMP%/omr-cmp`, not into the repo. The rules (what counts as a duplicate,
which tab, file numbers like 76a = 761, from vol. IV on 12b = 1202) are in `src/data/CLAUDE.md` and `TSIRVA_ANTH` in `src/data/tsirvaChants.ts`.
