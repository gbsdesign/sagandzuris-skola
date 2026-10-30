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
| `omr.py <vol> <num> <outDir> <startPdfPage> [--file N] [--to LAST] [--json-only]` | one chant (or, with `--to`, the numbers up to LAST as one unit) → JSON + pictures; prints `!` for a system whose voices end at different beats (a reading error to fix) |
| `compare.py "vol:num:page,…" "book/157,kk/154,…"` | reads versions and ranks them against the site's versions (1.0 = same) |
| `matrix.py "a2:277,…,kk/154"` | top / middle / bass similarity between read versions and site versions, exact pitches |
| `diffv.py a2:284 kk/154` | where two versions differ, voice by voice |
| `sysdbg.py <vol> <pdfPage> <systemTop>` | the notes read from one system (`OMR_DBG=<staff>` also prints the two-voice layering) |
| `render.py <vol> <pdfPage> <dpi> <out.png>` | a page as a picture, to look at |
| `find.py` | finds a chant's name in all volumes and study collections (edit the patterns inside) |

Read versions for comparing go to `%TEMP%/omr-cmp`, not into the repo. The rules (what counts as a duplicate,
which tab, file numbers like 76a = 761, from vol. IV on 12b = 1202) are in `src/data/CLAUDE.md` and `TSIRVA_ANTH` in `src/data/tsirvaChants.ts`.
