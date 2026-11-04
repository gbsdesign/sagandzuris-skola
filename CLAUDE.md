# საგანძურის სკოლა — Claude-ის სამუშაო ჩანაწერი

> ეს ფაილი Claude-სთვისაა: ყოველ ახალ სესიაში (კომპიუტერზეც და ღრუბელშიც) ის ავტომატურად კითხულობს,
> რომ იცოდეს პროექტის წესები და აქამდე გაკეთებული საქმე. ქვემოთ ტექსტი ინგლისურადაა, რადგან ასე უფრო ზუსტია.
> შეცვლა თავისუფლად შეიძლება.

## How to work with this user (most important)

- **Write every message in Georgian**, including short progress notes deep inside long technical tasks.
  The user is a beginner: before acting, say in Georgian what you are about to do; after each step, say what
  was done ("✅ …"). Say which stage you are at on long tasks. No long silent tool chains.
- **Don't widen scope.** Change only what was asked (one chant means one chant). Ask before deleting or moving files.
- **Ask before starting.** Before any task — and before each stage of a long one — ask the open questions first
  (one short round, recommended option first), even when the user says „აბა შენ იცი“.
- **Ask which files before heavy processing** when a request names files vaguely — the user was once charged
  for scanning the wrong books.
- **Visual quality matters**: this is a school app shown to students. Think the design through, check it at
  390px phone width before presenting. Rough visuals get rejected.
- **Roomy UI**: comfortable controls (play ~44–48px, icon buttons 36px); fit phones by wrapping, never by shrinking.
- **Never auto-scroll** a player to the playing line. No octave-leap checks in note audits.
- Never put the user's email in request headers/URLs (e.g. API User-Agent).
- **Only the steps the task needs.** Don't hand the user optional extra steps — „to be safe“ detours such as re-making a key
  they showed in a screenshot, extra settings, hardening. Only when something is actually broken or they ask.
  (The user's rule, 2026-10-28: „ეგეთ რამეებს ნუ მტენი“.)
- **Ready → merge it yourself, then say it in red.** When a chat's work is finished and its PR is ready (local checks
  pass, GitHub checks green, no conflict), merge it right away — PRs that change `firestore.rules` too — and end the reply
  with „🔴 **შეერთდა** — PR #N“ (Markdown has no red text, so the red circle + bold). Never write „შესაერთებელია“ and wait;
  only if merging is impossible (red check, conflict) say why. (The user's rule, 2026-10-27, widened 2026-10-28.)

## Saving tokens (the user pays for every session)

- **Never read these files whole** — search them (Grep) or read a small line range:

  | File | Size | What |
  |---|---|---|
  | `src/data/calendar/2026.json` | 889 KB | church calendar, one line per day |
  | `src/data/ancestorsBioTexts.ts` | 370 KB | ancestors' biographies |
  | `src/data/mtkmeliData.ts` | 93 KB | authors and works (full texts: `public/mtkmeli/<id>.json`) |
  | `src/data/library/saintLives.json` | 292 KB | saint lives index |
  | `src/data/library/dzveliAgtqma.json` | 126 KB | Sacred History book |
  | `src/data/chantMediaRegistry.ts` | 65 KB | recordings; the binding map `VARIANT_MEDIA` is near line 1320 |
  | `src/data/sitqvaWords.ts` | 195 KB | word bank of „დღის სიტყვა“ — made by `node scripts/build-sitqva-words.mjs`, never edit by hand |
  | `src/data/lyricsPool.ts` | 75 KB | folk songs' words line by line for „გააგრძელე!“ — made by `node scripts/build-lyrics-pool.mjs`, never edit by hand |
  | `public/notes/**`, `public/lives/**`, `public/prayers/**`, `public/bible/**`, `public/mtkmeli/**` | thousands of JSON files | content data |
  | `src/assets/images/*.jpg` | ~900 KB each | images — never open |

- Folder notes load only when you work there: `src/data/CLAUDE.md` (chant books, ids, recordings,
  calendar), `src/pages/notes/CLAUDE.md` (notes page, church mode, liturgy program).
- Repeated jobs have skills — use them instead of re-deriving the steps: `/add-recording`, `/publish`,
  `/phone-check`, `/update-calendar` (in `.claude/skills/`).
- A hook (`.claude/hooks/guard-big-read.mjs`) refuses whole-file Reads of text files over 200 KB — use Grep
  or offset/limit; don't try to work around it.
- Keep command output small: `npm run build 2>&1 | tail -20`, `git diff --stat` before a full diff,
  `git log --oneline -5`. Don't print whole JSON files.
- **Work split (the user asked for it, 2026-10-21):** Opus stays the main worker — plans, decides, reviews, does
  design, `firestore.rules`, publishing and anything hard to undo. Hand off only clearly specified routine work:
  `helper` (Haiku) = one small edit or lookup; `worker` (Sonnet) = a bigger mechanical job (many similar edits, data
  moves, a wide search). Each brief names the files + line ranges, the exact change and what not to touch (agents start
  cold — a vague brief costs more than doing it). Small fixes: do them directly. Review every result (`git diff`);
  if fixing it would cost more than redoing, revert and do it yourself. Say in one Georgian line who does what.
  A kind of job an agent fails twice → stop delegating it and note it here: —
- No other subagents/workflows unless the user asks.
- Progress notes in Georgian should be one or two short lines; save detail for the final summary.
- Don't re-read a file you just edited, and don't re-run a check that already passed.
- **Only the checks a change needs (the user's rule, 2026-10-28: „მხოლოდ აუცილებელი ტესტები, არ ქნას უაზროდ“; tightened
  the same night: „ემულატორები დაივიწყე“).** Run the tests of the files you changed (`npx tsx --test tests/<name>.test.ts`),
  `npm run typecheck`, and `npm run build` once before the PR — nothing else. **No Firebase emulators at all**: no local
  emulator runs, no seeded made-up data, no emulator screenshots, no local rules test — the GitHub workflow tests
  `firestore.rules` on the PR by itself. No extra review agents or repeated runs „just in case“.
- The user's task template is `docs/დავალების-შაბლონი.md`. If a request is unclear, ask one short
  question instead of exploring the whole codebase.

## Several computers, one GitHub

- The user works on several computers, with the project in a different folder on each. GitHub `main` is the one thing
  they share: never copy project files between folders or computers, and never make a second copy on one computer.
- Work only in the folder this session was opened in (the one holding this file). If the session starts outside the
  project (e.g. the user's home folder), ask which folder before touching any file.
- At session start a hook (`.claude/hooks/session-git-check.mjs`) reports the folder and how far this copy is behind
  or ahead of GitHub. Behind → tell the user and `git pull` (with their OK) before editing. When a piece of work is
  done, remind the user it reaches the other computers only after `/publish`.

## Cloud sessions

- A cloud session sees only what is pushed to GitHub. Local-only things are NOT available there: the user's
  `Downloads` folder (PDF chant books, recordings, drawings), OMR scripts in old session scratchpads, Google Drive files.
- Work on a branch and open a pull request. **Merging into `main` publishes the live site within minutes**
  (Cloudflare Pages), so tell the user clearly what a PR changes before they merge.
- Firestore rules: `.github/workflows/firestore-rules.yml` runs `tests/firestore-rules.test.mjs` in the emulator on PRs and
  publishes `firestore.rules` when it reaches main (secret `FIREBASE_SERVICE_ACCOUNT`; added 2026-10-27). Until that secret
  exists, the user publishes them by hand in the Firebase console. The reminders Worker is published by
  `.github/workflows/reminders-worker.yml` when `worker/reminders/**` reaches main (or by „Run workflow“; secret
  `CLOUDFLARE_API_TOKEN`, added 2026-10-28 — without it the run only warns). The notes Worker (`worker/notes`, R2) is
  published by `.github/workflows/notes-r2.yml` (same token; it already holds R2 · Edit). The audio Worker
  (`worker/wrangler.toml`) is still deployed from the user's PC with wrangler.

## Project basics

- React + TypeScript + Vite + Tailwind v4, Firebase (Auth + Firestore), PWA (Workbox in `vite.config.ts`).
- `npm run dev` (Vite, port 5173), `npm run typecheck`, `npm run build` (`tsc && vite build`).
- GitHub `gbsdesign/sagandzuris-skola`, branch `main` → https://sagandzuris-skola.pages.dev (auto-deploy on push).
- Firebase project `psalms-reading-group-ge-dev`. Security rules live in `firestore.rules`.
- No URL router: pages are switched by `NavigationContext` (history.state `sgNav`, `sgDepth`, …).
  Notes pages use `NotesContext` (`?c=&v=`, `?p=`), saint lives use their own `sgLife` history entry.
  The region open on the songs/მთქმელი map (or an open instrument) is `sgNav.mapItem` (`openMapItem`), so the
  one top-bar „უკან“ first returns to the map.
- Fixed/full-screen UI must respect `env(safe-area-inset-*)` (`viewport-fit=cover` is on); helpers
  `.safe-x`, `.safe-top`, `.safe-bottom`, `.safe-bleed` in `index.css`.
- **Kit rules (redesign stage 1, 2026-10-25)** — `components/ui/kit.tsx`: every inner page has the one `PageBar`
  (44px round ←, title left, 36px round 📌/✎ right; the router gives most pages theirs; full-screen windows with their own
  sticky bar use the same `BackBtn` and show the title only once the big one scrolls away, `useScrolledAway`); asking before deleting
  goes through `askConfirm` (shown by `ConfirmHost` in `App.tsx`), never `window.confirm`; new text ≥12px, nothing
  below 11px anywhere; one paper background for every page in `App.tsx`. Signing out lives only at the profile's
  bottom (`views/ProfileActions.tsx`); the admin panel opens only from the profile's wine row (`views/AdminEntry.tsx`,
  no header shield since 2026-10-27), and the profile's details are three folds with „შენახვა“ shown only while changed; the top of home is one day card of thin lines (2026-10-31): today's saints (`TodaySaintsCard`, a calendar leaf + the first
  commemoration, unfolds) and the reviews due (`home/LearnDue.tsx`); in the header the 🔍 sits in the top row on every phone (under sm).

## Audio and sheet music (details in `src/data/CLAUDE.md`)

- Recordings stay in the user's Google Drive and play through the Worker
  `https://sagandzuri-audio.mr-gabunia.workers.dev/<driveFileId>` (Drive sends no CORS headers).
  Binding is only the explicit `VARIANT_MEDIA` map — use `/add-recording`.
  **Every `<audio>` / `new Audio()` that plays a Worker URL must set `crossOrigin = 'anonymous'`** (as `ChantPlayer` does):
  the Worker answers only requests carrying the site's `Origin`, and a plain media request sends none → 403, silence
  (the „დღის ჰანგი“ bug of 2026-10-28).
- **Recordings go on in the background** and show ▶/⏸ in the phone's pull-down panel (2026-10-30, `utils/mediaControls.ts`):
  `ChantPlayer` sounds through Web Audio, which Android does not count as media, so a silent looping `<audio>` (`keepAlive`)
  plays beside it; the albums' player and a list's quick listen are named with `showInControls`. Nothing pauses on
  `visibilitychange` any more (only a list's synth preview stops), and `main.tsx` does not restart for a new version while
  `recordingSounds()`. `ChantPlayer` keys its audio on the tracks' addresses — callers build `media` afresh each render, and a
  new array used to stop the recording when a song page scrolled. The Drive folders „🎵 გალობა და სიმღერა“ and „ფოლკლორის
  ცენტრი“ must stay „anyone with the link“ (a closed folder = the Worker gets Google's sign-in page → 502, silence).
- Book notes (`public/notes/<book>/`) come from the chant-book PDFs by OMR; the books' OMR scripts are not in the repo —
  only the anthology's (`scripts/omr/`, also in the cloud). Chant tabs ხელდასხმა · ჯვრისწერა · პანაშვიდი (2026-10-29) are
  `data/riteChants.ts`; anthology versions everywhere come from `data/anthologyChants.ts` (East Georgian vols II–IV, X–XI:
  `data/anthologyEastChants.ts`, the western ones from vol. V: `data/anthologyWestChants.ts`; done: all 29 vols). The anthology's notes
  files are not in the repo: Cloudflare R2 bucket `sagandzuri-notes` behind the Worker `worker/notes`
  (https://sagandzuri-notes.mr-gabunia.workers.dev, `utils/notesBase.ts`), uploaded by pushing a branch `notes-upload`
  (`.github/workflows/notes-r2.yml`, steps in `scripts/omr/README.md`) — the site may hold only 20 000 files.
  Many version placements are unreviewed guesses — don't present them as confirmed.

## Main features (all published on main as of 2026-10-06, commit a2b345d)

- **Notes page** (details in `src/pages/notes/CLAUDE.md`): tapping a chant version opens a full notes page
  with synth, recording, church mode and the regent's „დღევანდელი წირვა“ program. The choir reads these
  notes live during the Liturgy: nothing may sound by accident, must work offline.
- **სასწავლო რეჟიმი** (2026-10-27, `components/learn/`): „სწავლა“ beside the zoom on the notes page (`LearnMode`) and
  „სასწავლო რეჟიმი“ on a song's recording (`LearnAudio`, songs without notes). Parts = lines of the book notes (a short
  line joins its neighbour) or ~12 s of a recording (`utils/learn.ts` + test); a part loops, 50/75/100%, my voice alone /
  everyone / everyone but me; singing is checked like the pearls (80% learns it), a recording's part is self-marked
  „ვიცი“. Reviews after 1, 3, 7 days. Progress `students.learning.{piece}` (`hooks/useLearning.ts`; device for guests).
  Takes go to the teacher through the pearls' store (`pearlTakes`, ids `learn~<piece>~<part>`, approval in
  `pearlShine`) — no rules change; teachers hear them in the member's window (`LearnReview`). AI teacher shares the
  pearls' 3 a day.
  Since 2026-10-28: three steps per part (`StepBar`: მოისმინე 50% my voice → ერთად 75% everyone but me → მარტო 100%, sing;
  three loops move on by themselves); a singing mirror (`LearnMirror`: the part's notes as bars, my voice as a line, moved
  into the part's key from my first steady note); a soft band over the notes picture follows the playing beat
  (`markerAt` — x of notes is guessed from their lengths, no real positions); a recording is split at its quietest
  places between 6 and 16 s (`partsAtBreaths` over `utils/audioEnergy.ts`, falls back to equal parts); a song's words
  beside every part (`wordsForPart`, only roughly — no timings); home line „დღეს გასამეორებელი“ (`home/LearnDue.tsx`,
  opens the piece through `utils/learnOpen.ts`) and one daily phone reminder on the reminders Worker
  (`utils/learnReminder.ts`, id `learn-review`, kept apart from the habits' list in `prayerReminders.ts`).
  A teacher's chant/song assignment (also 2026-10-28): the learning mode notes each piece's part count in
  `students.learnParts.{piece}` (no rules change); `assignedProgress`/`allLearned` (`utils/learn.ts` + test) — a song counts
  by its best-learned recording. Every part learned = the assignment is done (`workDone(…, mine)`; the member sees
  „ნასწავლია“, a teacher's „ჩათვლა“ still shows „ჩათვლილია“; marking on the path still counts for the teacher). A teacher's
  assignment card's „ისწავლა N/M ▾“ unfolds each member's bar (`WhoLearns`, `learn/PartsBar.tsx`); the member's window lists a
  bar per piece (`LearnReview`). The member's „სწავლა“ on an assignment opens the learning mode on the assigned voice
  (`learn/openLearning.ts`: `learnPieceOf`, `useOpenLearning`; `requestLearn(piece, voice)`).
- **კლასის სტუდია** (2026-10-29, `components/studio/ClassStudio.tsx`): a program chant with book notes gets „სტუდია“ in its
  window (`ItemSheet` in `classes/ClassProgram.tsx`). A member sings their voice over the synth (their own voice muted) and the
  take, cut by the output lag, goes to the pearls' store as `studio~<vid>` (no rules change). The class's teacher ticks whose
  takes go in, hears them together and „კლასის ჩატში“ sends one mixed MP3 (made in the browser) as a voice message.
- **Song albums** (2026-10-29; chants later): 329 albums from Drive „ფოლკლორის ცენტრი“ under the songs map („ალბომები“),
  3 534 sure takes in their songs; each album opened per member by admins — 🎧 / ⬇ apart (`data/albumAccess.ts`). Its „სხვა“
  folder (same day): two albums under the მთქმელი map and „მელექსეები“ in a region (`maps/Reciters.tsx`), an instrument with
  recordings opens a window (`views/SakravebiView.tsx`); details in `src/data/CLAUDE.md`.
- **Folk songs map** (`data/songsData.ts`, `components/maps/GeorgiaMap.tsx`; on top of the map, for everyone, the Folklore
  Centre's banner `CentreBanner` — its logo + „ფოლკლორის ცენტრის ჩანაწერები“, 2026-11-05; logo `assets/images/folk-centre-logo.png`
  cut from the user's screenshot) and **მთქმელი authors map**
  (`data/mtkmeliData.ts`, `MtkmeliMap.tsx`, shared `RegionPuzzleMap.tsx`). Full texts only for authors who
  died before 1956; others get title + description + wiki link.
- **Prayers** (`data/prayers.ts`, `public/prayers/`, `public/bible/`), psalter kathismas, 73 akathists,
  commemoration name lists (`utils/commemoration.ts`), prayer reminders via Web Push Worker
  `sagandzuri-reminders` (`worker/reminders/`; push works only on the deployed site).
- **საგანძურის გზა** (page `gz`) = „ჩემი დღე“ since 2026-10-28: `views/PathToday.tsx` „დღეს“ card (next lesson; the nearest
  assignment with „სწავლა“ + its parts bar when it has a learning mode; „დღეს გასამეორებელი“ — no habits line), the five
  round buttons (`PathOrbs`), then the habits card.
- **Habits** ticked per day (`students/{uid}.habitLog`, kept whole since 2026-10-16; each tick writes only its day),
  goals in `habitsAndManera.ts`. Views „დღე · კვირა · თვე · წელი“ + a habit's own page in `components/habits/`
  (one shared model `useHabits.tsx`; a new view = one entry in `VIEWS` in `ChvevebiPanel.tsx`), stats in
  `utils/habitStats.ts`. Ticks allowed for the last 7 days (`canTickDay`). Colours/icons/counters: `data/habitLooks.ts`,
  member's choice in `habitSetup.looks/counters`; counter numbers in `students.habitCounts` (sent 1.2 s after the last tap).
  One habit editor (2026-10-28): the habit window's ✏️ (`HabitCardEditor`); the rows only have „›“.
  Simplified the same day (the user: „ტვინი ირევა“, sketch approved): the card's head holds the day's count, the run and the
  view menu „დღე ▾“ (ⓘ „განმარტება“ moved into it); the day = 7-day strip + one status line; a row = the round button (a
  counted habit's button adds its step, +10 for the Jesus prayer) + the name + its number + „›“ — no „+“, ⓘ note (now on the
  habit's page), run or ten dots; „კვირაში და თვეში“ folds to one line „N / M“ (`sg-habits-rare-open` on the device).
- **ოსტატობა** (2026-10-27): „დღის სავარჯიშო“ on top (a teacher's assigned exercise, then the weakest marked tip, then by
  day), 11 performance tips (`MANERA_ITEMS`; `num` is the key of teachers' marks, the list shows the position; 10 = დგომა,
  11 = სუნთქვა ფრაზებს შორის were added) and 4 exercise groups — სმენა, სამხმიანობა, ხალხური ხერხები, რიტმი
  (`data/vocalDrills.ts`; a tip is drill `tip-<num>`). Every drill = lesson + timed exercise (`DrillSheet` in
  `components/mastery/ManeraLessonSheet.tsx`): synth notes from a low/high base, three voices with the student's own left
  out, a click (bpm/bar/accents), a mic tuner + recording (≤90 s) sent to teachers (`drillTakes/{uid}/takes/{drillId}`,
  rules published by the workflow; teachers hear them in the member's window, `DrillReview`). „შევასრულე“: device days
  (`utils/maneraPractice.ts`) + `students.drillDone.{id}` = last day. Teachers can assign an exercise (`assignments.exercise`).
  Scores (2026-10-28): „შეფასებით“ runs the exercise with the microphone — notes and rhythm are scored in the browser
  (`utils/drillScore.ts` + test: each look vs the step's note, any octave; claps vs the beat grid after a one-bar count-in,
  the click silent after it; the note to sing sounds only 1.2 s so the phone hears the student), the tips by the AI teacher
  (`askAiScore`, JSON score, its own 3 a day — scope `manera`). Best % in `students.drillScore.{id}` + device
  (`utils/drillScores.ts`); the ring = `useMastery` (ManeraPanel): all 27 exercises, a teacher's mark wins, unscored = 0.
- **მედავითნეობა** (page `medavitneoba`, built 2026-10-27): the reader's course on the vine's „მედავითნეობა“ label
  (section `medavitneobaTopic`, „მალე“ until the admin opens it). 8 lessons in `data/medavitneLessons.ts`, shown step by
  step (learn / order / read aloud / quiz / task) in `pages/MedavitneobaPage.tsx` + `pages/medavitneoba/parts.tsx`; the
  open lesson is `mapItem`. Prayer texts copied from the app's ლოცვანი, psalms cut from the kathismas (`loadPsalmHtml`),
  the Apostle from `public/bible/`. A reading's take stays in the browser unless „მასწავლებელს გაგზავნა“ (≤3 min, 16 kHz/24 kbps
  `toSmallMp3`) puts it in the pearls' store (ids `read~…`, `utils/dayReadings.ts`); teachers hear and „ჩათვლა“ it in the member's
  window (`learn/MedavitneReview.tsx`). „დღის წესი“ card (`medavitneoba/DayCard.tsx`, calendar feature only): today / coming
  Sunday — tone (a weekday takes the Sunday before), saints, readings parsed from the calendar text (`readingsOf` + test); an
  Apostle reading unfolds with text and recorder; the tone opens `ToneSheet` = that tone's Sunday chants in the books
  (`utils/toneChants.ts` + test: prokeimenon, alleluia, „ღმერთი უფალი“, troparion…, chips open their notes). A take of a known
  text shows its pace (`utils/readingPace.ts` + test: syllables ÷ voiced seconds; slow < 3 ≤ even ≤ 5 < fast: plain defaults,
  the user declined tempo research) in `PaceMeter`, and sends it as the take's `score` (×10). Progress in `students.medavitne`
  (`hooks/useMedavitneProgress.ts`). Content not yet checked by a priest/regent — the page says so.
  Since 2026-10-28 two tabs „გაკვეთილები · წიგნები“: „წიგნები“ (`pages/medavitneoba/Wignebi.tsx`, menu `data/wignebi.ts`,
  texts `public/wignebi/<collection>/<NN>.json`, fetched on open, kept by the service worker) = the liturgical books of the
  „საღვთისმსახურო წიგნები“ app (ღვთისმშობლის მიძინების მონასტერი) in that app's menu order: Bible (NT, OT, ტრაპეზის სახარება,
  სამოციქულო), calendar 2024–2027, კონდაკი, კურთხევანი, პარაკლიტონი, საზიარო თვენი, ჟამნი, ზატიკი, დავითნი, მგალობელთათვის,
  წარდგომები, ლოცვანი, პარაკლისები, ანდრია კრიტელი. Place = `mapItem` „w…“ (`utils/wignebiPath.ts` for „←“ after a reload).
  **Admins only** until the user has the monastery's permission (others see „მალე“). The texts were extracted from that
  app's bundle; its old nuskhuri-font texts were converted with the app's own table (archaic letters kept).
  **Generated — never edit `public/wignebi` or `data/wignebi.ts` by hand**: `scripts/wignebi/` (plain Python, no packages:
  `hermes.py` reads the app's Hermes bundle — v98 up to app 1.1.3, v99 since 1.1.4, opcode tables `ops98.txt`/`ops99.txt`
  (v99 = the opcode-name order inside hermesc 260318099 from npm) — and finds each book's module by its export name,
  `convert.py` + table = the legacy font, `build.py` writes the files, menu labels from `labels.json` keyed by the data's
  keys). `.github/workflows/wignebi-update.yml` runs `update.py` daily: asks the app's Expo update server (runtime = app
  version, probes the next ones; last update in `scripts/wignebi/state.json`), checks the hash, rebuilds, refuses an update
  that loses items or >3% of a book's text, and commits straight to main (the user's choice, 2026-10-28). A newer app from
  the Play store: `python3 scripts/wignebi/update.py --apk <file>` (then the server is asked for that version's updates).
  Applied: the 22 Sep 2026 update (commemorations ილია → შიო after Patriarch Shio III's election, 3 typos) and the 1.1.4 APK
  (199 small fixes + ზატიკი, the user's upload 2026-10-28). ზატიკი: after ჟამნი as in the app's menu, 13 items with the app's
  own labels (weeks: part 1 = კვირა … 7 = შაბათი, each day's service begins the evening before), its abbreviation codes from
  the app's own converter in `zatiki_table.json` (our output = the app's display for 99.93% of its strings, archaic letters kept).
  The shelves' last tile fills its row when left alone (`tileLook` in Wignebi.tsx).
- **ხუცური for the whole site** (2026-10-28, moved 2026-10-29): a switch in the profile („ხუცური“, `views/KhutsuriSwitch.tsx`,
  under the profile in `AppRouter`; no header button — guests have no profile, so they don't get it) sets `html.khutsuri`
  (`utils/khutsuri.ts`, device only, set before the first paint in `main.tsx`). index.css then swaps
  `--font-sans`/`--font-serif-ge` to „SG Nuskhuri“ (h1–h3: „SG Asomtavruli“) — the nuskhuri fonts of the „საღვთისმსახურო
  წიგნები“ app, moved onto Unicode Georgian by `scripts/fonts/build-sg-nuskhuri.py` (`public/fonts/sg-*.woff`, only letters +
  punctuation; digits/Latin fall back; `size-adjust: 70%` because the app's letters are ~1.5× wider). The text stays
  ordinary Georgian. Everything turns, buttons too (the user's choice). The prayer page's own „ხუცური“ turns only that prayer
  (its nuskhuri/asomtavruli conversion with red initials, `useKhutsuri` in `views/ReadingTools.tsx`), now drawn with these
  fonts: „SG Old Script“ = the same two files for only the old scripts' code points (ⴀ…ⴥ, Ⴀ…Ⴥ), first in `--font-serif-ge`,
  so any old-script letter on the site is the app's alphabet.
- **Android app** (Google Play, `android/`, 2026-10-29; memory `google-play-app`): a Trusted Web Activity of the live site
  (so the site's updates need no app update) plus the app's own Java parts in `android/app/src/main/java/ge/sagandzureli/app/`
  (version 1.1.1, code 3; minSdk 26): six home-screen widgets — buttons (the home vine's places, picked in `ButtonsConfigActivity`),
  habits (tap ticks / counts), the path's five rings + reviews due, the church day, my psalter kanon, the saying of the day — the
  icon's long-press menu (`res/xml/shortcuts.xml`), „გაზიარება → საგანძური“ into a class chat (manifest share target → the site's
  `share_target` + `public/prayer-notify-sw.js` → `components/app/ShareHost.tsx`), church mode's „არ შემაწუხო“
  (`SilenceActivity`, back after 3 h) and the prayer reminders' bell (`BellDelegationService`, `res/raw/bell.ogg`). The member's
  widgets read the reminders Worker's `/widget/*` (a secret from the profile's „ვიჯეტის დაკავშირება“, `utils/widgetLink.ts`; the
  open site leaves the summary there, `components/app/WidgetSync.tsx`); the day and saying widgets read `public/widget/days-<year>.json`
  (`node scripts/build-widget-days.mjs`). The site knows it runs in the app by `utils/androidApp.ts` and talks to the app through
  `sagandzuri://` links (`openInApp`). Widget links open `/?open=sc&id=<home button id>`. Icons: `node scripts/android/icons.mjs`.
  Only GitHub Actions can build it (`.github/workflows/android.yml` → branch `android-build`, unsigned); sign in a session.
- **Library** page (`biblioteka`): საღმრთო ისტორია, დღესასწაულები, წმიდანთა ცხოვრება.
  Footer church calendar (`data/churchCalendar.ts`, `data/calendar/<year>.json`, made by
  `node scripts/fetch-church-calendar.mjs <year>`). **The 2026 file ends 13 Jan 2027 — re-run for 2027 once
  orthodoxy.ge publishes it.** Don't add "წყარო: orthodoxy.ge" lines (the user removed them).
- **Saint lives** (`components/saints/SaintLifeOverlay.tsx`, `public/lives/`, linking in
  `scripts/lib/saint-lives-match.mjs`).
- **One search** (`components/search/`, index `data/searchIndex.ts`, matching `utils/searchMatch.ts` + test):
  header 🔍, home field, `/` or Ctrl+K. Finds functions, chants, prayers/akathists/Bible chapters („მათე 5“),
  psalter („ფს 50“), songs, chanters, feasts. Pages take the picked item via `useOpenRequest` (`utils/searchOpen.ts`).
- **აბიტურიენტს** (page `abituri`, `pages/AbituriPage.tsx` + `pages/abituri/`, data `data/abituriProgram.ts`):
  University of Chant admission — 2026 chant/boys/girls lists from galoba.edu.ge PDFs merged with the old site
  sites.google.com/view/asabituri (its Drive folders), colloquium, registration. Opened from the small label under
  „გალობა“ on the home vine. Tracks "e:<path>" play through the audio Worker's `/edu/` route.
  Theory tab (2026-10-08): 11 lessons in `data/abituriLessons.ts` built on the university's own samples (theory test =
  7 tasks: modes, intervals, chords 5/3·6·6/4, transposition, grouping, letter names, rests; 3-voice dictation), solved
  inside. Notation by abcjs (lazy, `pages/abituri/Staff.tsx`), sound by `playLessonNotes` in `utils/chantSynth.ts`;
  answers computed by `utils/musicTheory.ts` and checked in `tests/musicTheory.test.ts`. Terms as the test writes them
  (წ./დ./პ., მაჟ./მინ., „მარცვლოვანი“, German letters: B = სი♭, H = სი).
  Practice (same day): endless tasks of all 7 test kinds + by ear + 3-voice dictations (`utils/theoryDrills.ts`, tested
  in `tests/theoryDrills.test.ts`; UI `pages/abituri/drills/`), a mock test in the sample's form (32 points), colloquium
  „გამოიცანი სმენით“ (`ColloquiumQuiz.tsx`, YouTube without controls so chapter names don't show), I round practice
  (`RoundOnePractice.tsx`: motifs to sing back; sight-reading = `SIGHT_READING`, 19 short vol. I chants outside the
  program). Progress (`hooks/useAbituriProgress.ts`) in `students/{uid}.abituri` for members (device for others);
  teachers see a line in StudentsOverview. Dictations: `data/abituriDictations.ts` (the university's + 6 written here).
- **Class chat** with voice messages (`components/classes/ClassChat.tsx`, `hooks/useClassChat.ts`,
  `utils/voiceRecorder.ts`); since 2026-11-04 a teacher's / an admin's 📎 (`classes/PinSheet.tsx`: who → „კომენტარი“ or
  „დავალება“ — a real assignment for that member alone, `NewAssignment` `forWhom` + `onMade`) puts a card for one member
  (`classes/PinCard.tsx`, `hooks/useChatPins.ts`): in a class's chat it lives in `classes/{c}/pins` (rules: read by that
  member — `where to == uid` —, the class's teachers and admins only), laid in among the messages, with 🔒 and the member's
  „პასუხი“ = their private chat with the writer; in a private chat it is a message of kind `note` / `work` (`pinCard` in the rules); calls are the app's own (`components/calls/`, `utils/callSession.ts`), Jitsi is gone. Voice MP3s are Firestore Bytes
  (no Firebase Storage). Kept light on phones (2026-11-05, the user: „ჩათი ჭედავს“): `markChatSeen` writes `students.chatSeen` at
  most once a minute a chat (and when the page hides) — that record has ~16 live listeners, each write redrew much of the app —,
  this device's marks reach `useChatSeen` at once; `useChat` keeps an arrived message's object (and the list when nothing
  changed); `ChatPanel` draws the messages in a `useMemo` (`listBody`), so typing and the recording clock do not redraw them —
  give it stable props (a default like `isCall` is the module's `NEVER`); a drawing in the chat stays still until ↺.
- **Calls and messages on the phone with the app closed (2026-11-05, the user: „ზარი შედიოდეს ტელზე, როგორც მესენჯერი“)**:
  the reminders Worker's `POST /ring { token, base, end? }` (the caller's own call of the last minute in `dms/{id}` — callBy,
  callAt — or `classes/{id}/call/state` — by, at; `end` within two minutes = „გამოტოვებული ზარი“, sent by the caller's app only
  when nobody answered: `giveUpAfter`, a failed join, or `afterLeave(…, unanswered)` from the call screen's hang-up while
  „waiting“/„connecting“), `POST /chat-notify { token, base, id, pin? }` (the writer's own message of the last two minutes; text,
  voice, drawing and a teacher's card — a class's `pins/{id}` goes to its member alone; calls and games have their own pushes)
  and `POST /decline { base, uid, at, t }` (the ring's own HMAC `ringTicket`, made in the Worker from `VAPID_PRIVATE_JWK`, so the
  service worker's „უარი“ ends a private call — writes `callEnd` — without a sign-in). Who hears it: `chatTargets` in
  `reminders.js` (+ `tests/chatPush.test.mjs`): a class's members and teachers (admins may call or write without teaching it), a
  private chat's other member, the administration's chat: the member hears „ადმინისტრაცია“, a member's message goes to all staff
  (a member's call rings nobody). Devices: column `subs.chat` (schema 4; rows already bound to a person got 1), bound by
  `bindChatDevice` (`utils/groupPush.ts`; `/account` now keeps every switch the call does not name) — quietly once a day where
  notifications are allowed, else `components/calls/PhoneRingSetup.tsx` asks once at the bottom (4 s after opening, never during
  a service or a call, „მოგვიანებით“ = a week). The site calls `notifyRing` in `callActions.ts` and `notifyChat` in the senders
  (`useClassChat.ts`, `useChatPins.ts`). `public/prayer-notify-sw.js` `showTalk`: nothing while a window of the site is
  visible (the app rings itself); a ring = tag `call-<id>`, „პასუხი“ / „უარი“, kept until touched; `call-end` replaces it
  silently; a message = tag `chat-<id>` (a private chat's each message sounds — `renotify` —, a class's once, then only updated).
  Taps open `/?open=chat&id=<dmId | class:id>` or `/?open=call&b=<base>` (App.tsx: the chat + `wantAnswer`, and the incoming
  screen answers or joins once it sees the call — `takeAnswer`/`useAnswerWanted`). The Worker needs only its publish (the
  workflow does it on main).
- **Class page** (`pages/ClassPage.tsx`, rebuilt 2026-10-24, simplified 2026-10-28 „ერთი რამ, ერთ ადგილას“ from an approved
  sketch): title bar (🎵 + one ✎ for teachers — its list opens name/logo/mode, the timetable `ScheduleSheet`, the program
  `ProgramEditor`, adding a member `AddMemberSheet`; 💬 to the teacher for a member), the timetable chips, the members as one
  line „N წევრი ›“ that opens their window on a phone (a sticky left column on a computer, `lg`); the class's teachers get
  `ClassRoll` (`teacher/StudentsOverview.tsx`: attendance ✓, 💬, a name opens the member's own page, „მიწერა“/„ამოღება“).
  **A student's own page** (2026-11-04, page `student`, `pages/StudentPage.tsx`, `openStudent(uid, classId)` — mapItem
  „uid|classId“; the user: „მის გზაზე გადავდივართ, მის პირად პროფილზე და თან მაქვს ცვლილებების უფლება ზუსტად ისე როგორც მას“):
  opened by a teacher or an admin from the class roll, a member's photo / name in the class chat (`ChatPanel personOpener`)
  and the private chat's head (`PaneTitle onOpen`). On top who it is (`StudentHead`), then their „საგანძურის გზა“
  (`views/PathPageBody.tsx`, the same body as page `gz`) and their profile (`StudentProfileCard member` + outfit + home
  buttons) inside `ViewAsStudent` (`context/AuthContext.tsx`): there `useAuth()` is the student (a Proxy of the real User
  with their uid, name, photo; a member's role) and a nested `ChantSelectionProvider` holds their path, so every part reads
  and writes their record; the sign-in stays the viewer's. One-place-for-the-app caches go by `useRealAuth()` (membership,
  kids' mode, `useAccess`, album rights, centre downloads, song-text editors); `useMyClasses` / `useMyPsalterGroups` list the
  viewer's own classes / groups the student is in (a teacher may not list by the student); device side effects stay off
  there (`useViewing()`: the habits' and the review's phone reminders, the assignments' bell) and so does the microphone
  (`utils/othersPage.ts` `holdSinging` → `singingSupported()` false: the student sings their pearls and exercises
  themself). Rules: a teacher of the student (`teachesMe`) updates any field but `teacherIds`, `teacherVia`, `userId`,
  `email`, `authProvider` and the sung scores `pearls`, `drillScore`, and their `directory` name (`teachesThem`). At the bottom „მასწავლებლისთვის“ (`StudentTools` = the
  old member's window inline: pearls/takes to hear, figures, attendance, the path editor, the manera's marks, the kids'
  mode, „მიწერა“, „ამოღება“) — never shown to the student.
  Since 2026-11-04 two tabs (kept per visit in sessionStorage; the user: „პროგრამა პროგრამაა“): „პროგრამა“ (a dot = a
  member's assignment to do) — on top the chants' and songs' assignments in their own card (`ClassAssignments` in
  `classes/ClassWork.tsx`: `AssignmentsFold only="chant"` for teachers, `WorkItems` for members, who see the card only while
  there is one); then `ClassProgram`: thin progress bar, a line per item with only its status (my voices, else the learning
  bar; a teacher sees how many know it), a tap opens `ItemSheet` (ნოტები / სიმღერა, სწავლა, my voice marks, who knows each
  voice; a teacher's „დავალებად მიცემა“ = `NewAssignment` with `preset`), and for teachers „+ დამატება“ under the list
  (`ProgramQuickAdd`: the catalogue tree, saved once when it closes — order and ✕ stay in ✎ → „სასწავლო პროგრამა“); under it
  folded cards: ოსტატობა (`ClassLessons fold`, the exercises given as assignments on top — `DrillWork` as its `work`,
  `AssignmentsFold only="drill"` / `WorkItems`; an amber „დავალება“ chip on the folded line for a member), the psalter group
  (folded head line with „შენი: N“; `focus` opens it) — „ჩათი“ (`ClassChat`; a dot while unread). An assignment card =
  `WorkCardHead` — the chant's own name big + one grey line (`utils/assignmentLines.ts` + test), a tap opens its notes / song
  / exercise (`hooks/usePathItemOpener.ts`, moved out of PathOrbs); the deadline is `dueUntil` „10 ნოემბრამდე“ on both cards —
  **no „N დღეში“** (the user, 2026-11-04); the teacher's „ისწავლა N/M ▾“ unfolds the book's place, the members' bars and
  „დავალების წაშლა“. No class „მარგალიტები“ card any more (removed 2026-11-04): a teacher sees 💎 N by a member's name in the
  roll (`PearlsWaiting`, `waitingPearls` in `pearls/PearlReview.tsx`) and on the phone's members line; the member's window
  shows `PearlReview` first. „სასწავლო პროგრამა“ is the name everywhere (not „კლასის პროგრამა“). The timetable
  chips also sit under the chat's title on the messages page. Teacher-only parts never show to members; attendance is
  teacher-only in `firestore.rules` too (members no longer read it).
- **Games hub** (`pages/GamesPage.tsx`, 2026-10-27; **one list since 2026-10-30**, the user's „ყველა თამაში 1 სიად“ — no category
  tabs): every game of `data/games.ts` `GAMES` (the board games too) is a card with a button per variant it has — ონლაინ ·
  ჰიბრიდული · სამაგიდო (the user's word, was „უტელეფონო“); the app's variants open the game („სამშვილდის ღამე“ on the variant
  tapped: `requestOpen('samshvilde', 'online' | 'table')`), სამაგიდო makes the PDF on the phone (see „Kits drawn in the browser“). A game that answers to a
  known one shows it in brackets (`like`: მაფია, Wordle, Alias, კატანი…) and ⓘ unfolds 2–3 lines on what that game is and how
  ours differs (`about`; „რა? სად? როდის?“ has ⓘ without brackets). Only what is ready shows — a game and a variant alike (since
  2026-10-28 the user had the unbuilt plan games taken off; the plan doc keeps them, don't bring them back unasked); a game's app
  variants follow its section, a printed kit always shows. Since 2026-11-04 (the user's „დახვეწე, გაათანამედროვე და არ იყოს დამაბნეველი“): the three variants' legend, a search field
  (name · known game · line · ⓘ — the name counts most), „დღის თამაშები“ (`DAILY_GAMES`: a tile each, ✓ when played today, a tap
  opens the day's game), then the list under four headings (`GAME_GROUPS`: the user's own მუსიკალური · ქართული · ცოცხალი of 10-27 +
  დაფის თამაშები — still one list, no tabs; `tests/gameGroups.test.ts` keeps every game under exactly one) with chips that jump
  to them; a card's buttons stand in one row (ონლაინ filled, ჰიბრიდული tinted, სამაგიდო beige; icons only from `lg`). The vine label „თამაშები“ opens it. The pearls game stays the round button of „საგანძურის გზა“ (below), now
  under its own section `margalitebi` (open/მალე/hidden switch in the admin panel; a member's feature for it is the games'
  one — `featureOf` in `hooks/useAccess.ts`). The plan with 42 games and the six Georgianized board games:
  https://claude.ai/artifact/Dw24amtHhQvSGUd1pPE4fg
- **First two games (2026-10-28)**: „დღის ჰანგი“ (`pages/games/HangiGame.tsx`; logic `utils/hangi.ts` + test; pool
  `data/hangiPool.ts` = every recording the member may hear — `VARIANT_MEDIA` via `codeBoundMedia()`, `CHANT_RECORDINGS`, folk
  mp3s; the day's pick = rendezvous hash of `date|id`, the same for the whole school, Tbilisi day; six tries 1·2·4·7·11·16 s;
  record `students.games.hangi.days[iso]` through `hooks/useHangi.ts`, the device for guests, no rules change) and „ამიხსენი“
  (`pages/games/AmikhseniGame.tsx`; rules `utils/amikhseni.ts` + test; ~1370 cards in `data/amikhseniWords.ts`, 15 themes — the
  app's own data (chant and church, saints, ancestors, songs, instruments…) + the wider Georgian world since 2026-11-01; settings
  stay on the device, a device that had the old ten themes all on gets all fifteen; since 2026-11-04 that one-phone game is the
  „ჰიბრიდული“ tab, `pages/games/amikhseni/Table.tsx`, see the quick games below for „ონლაინ“). `components/games/TableScreen.tsx` is the full-screen face of every live game
  (wake lock, safe areas). Both open inside the hub as `mapItem` (`GameDef.item`; the bar title from `gameTitleOfItem`).
- **Word games (2026-10-28, same day, second PR)**: „დღის სიტყვა“ (`pages/games/SitqvaGame.tsx`; rules `utils/sitqva.ts` + test;
  Wordle-like, 4–6 letters, six tries, one word a day for the whole school: the day's feast always, a saint of the church calendar
  every third day (`isSaintDay`; `candidatesOfDay` over `calendar/<year>.json`), else the bank `data/sitqvaAnswers.ts` (~300 words of
  six kinds: church, region, food, nature, hero, culture — widened 2026-11-01); the hint kind is
  shown from the start; guesses must be in the bank or in `data/sitqvaWords.ts` (lazy chunk, `utils/sitqvaDictionary.ts`);
  screen keyboard `components/games/GeoKeyboard.tsx`, a physical keyboard works too; „ნახე აპში“ opens the search with the word —
  `openSearch(query)`) and „ოთხეული“ (`pages/games/OtkheuliGame.tsx`; rules `utils/otkheuli.ts` + test; Connections-like, 16 words
  in four hidden groups, four mistakes; 70 groups in `data/otkheuliGroups.ts` — curated (church, saints, chant, regions… and since
  2026-11-01 heroes, battles, castles, animals, birds, trees, films, painters, cheese, sport…) + instruments, costume parts, the
  archive's songs by region and chants by service, at most one group of a family per grid (family `virtues` = the church's and the
  knight's virtues); the day's grid `gridOfDay` + unlimited extra grids
  with a random seed, not saved). Both records go through `hooks/useDailyRecord.ts` (`students.games.<game>.days[iso]`, the device
  for guests; `useHangi` is now a wrapper of it), no rules change. All three daily games count days from 2026-10-28.
  Both got „ჰიბრიდული“ (2026-11-01): the page has two tabs „ონლაინ · ჰიბრიდული“ (`pages/games/rounds/variants.tsx` `VariantPage`, the
  tab kept in `sg-sitqva-tab` / `sg-otkheuli-tab`; the hub's buttons open their tab — `requestOpen('sitqva' | 'otkheuli', …)`).
  „ოთხეული“'s (`pages/games/otkheuli/Teams.tsx`, rules `utils/otkheuliTeams.ts` + test): 2–6 teams in turn pick four on one grid, a
  found group = 2 points in its team's colour, its link said before „ჯგუფის ჩვენება“ = +1 (the host marks it); every pick passes
  the turn, a wrong one too („ერთი აკლია!“ shows), the turn's clock (30/60/90 s) passes it as well; after three groups the last four
  join by themselves and the next team may name their link. 1–3 grids, none of a group twice. „დღის სიტყვა“'s (`pages/games/sitqva/
  Teams.tsx`, rules `utils/sitqvaTeams.ts` + test; like Lingo): a bank word (never the day's — `sitqva/dayPick.ts`), teams in turn try
  a word on one board (each row with its team's dot), found in row r = 7 − r points, the clock (30/45/60 s) passes the turn without a
  row; 3/5/7 words; „პირველი ასო ჩანს“ = easier. Kept in `sg-otkheuli-teams` / `sg-sitqva-teams`, settings `sg-*-table`. The
  teams' editor, chips and turn clock are shared: `pages/games/rounds/teams.tsx` (`TeamsEditor`, `TeamChips`, `useTurnClock`,
  `TEAM_TINT`; „ჩამოთვალე!“ uses them too).
- **Live games (2026-10-28, third PR)**: „გათვლა“ (`pages/games/GatvlaGame.tsx`; rules `utils/gatvla.ts` + test; one phone in
  the circle: names light up per beat of a rhyme and the last beat picks who starts, the picked are skipped next time; the
  „ვისი ჯერია?“ wheel picks the one asked least (counts on the device); teams of 2–4. Rhymes: the old alphabet names, numbers,
  the school's own „მთქმელი, მოძახილი, ბანი“ + the teacher's own on the device; names typed or a managed class's members
  in one tap, all in localStorage `sg-gatvla`) and „ცხელი ჩურჩხელა“ (`pages/games/ChurchkhelaGame.tsx`; rules
  `utils/churchkhela.ts` + test; Hot Potato: the phone plays a pool recording (`hangiPool`, a random start offset) and stops
  after a random 5–45 s, the bell rings, a task card comes up, „შეასრულა/ვერ“ tallied; source „ჩემი ხმით“ = the teacher sings
  and the phone only times — the mode guests get). Shared: `utils/gameSounds.ts` (openAudio in the tap, bell, tick),
  `components/games/Chip.tsx`. Nothing saved but settings; no rules change.
  Since 2026-11-04 „გათვლა“'s one-phone tool is its „ჰიბრიდული“ tab (`pages/games/gatvla/Table.tsx`, store `gatvla/store.ts` over
  `sg-gatvla`, tiles `gatvla/parts.tsx`) and „ონლაინ“ is a quick-games room „ვის შეხვდება?“ (`gatvla` in `ROUND_GAMES`/`ROOM_GAMES`/
  the rules/the Worker's titles; rules `utils/gatvlaRounds.ts` + test; face `gatvla/face.tsx`): the host reads the rhyme in the
  room's call, every phone shows the circle of the room's names (`shortNames`: first names, the whole name where two share one)
  and the rhyme's words; a player taps the one its last word lands on (`landing` = `countOut`), 1000…500 by speed, 30 s. The
  reveal counts it on every phone, a beat a name (`GATVLA_BEAT_MS`), and the one it lands on starts and leaves the circle: a
  round's `before` = who was picked so far, so the rounds give the whole order (`drawGatvla`: one round fewer than the players at
  most, the rhymes in turn). The draw gets the room's names: `RoundFace.draw(count, program, players)`.
  Since 2026-11-04 „ცხელი ჩურჩხელა“'s one phone is its „ჰიბრიდული“ tab (`pages/games/churchkhela/Table.tsx`) and „ონლაინ“ is a
  quick-games room (`churchkhela` in `ROUND_GAMES`/`ROOM_GAMES`/the rules/the Worker's titles; rules `utils/churchkhelaRounds.ts` +
  test; face `churchkhela/face.tsx`, the art and the clock `churchkhela/parts.tsx`): everybody holds the churchkhela on their own
  phone while a pool recording plays there; a round burns at a random `burn` (6–24 s, a tenth of a second) and whoever has not let
  go by then is burnt and does the round's task in the call (`taskSeats`; nobody burnt → the first to let go); a let-go earns its
  share of the time held, 10…1000 (`holdPoints`, the pick = tenths + 1, 0 = burnt). Each phone keeps the time by its own music
  (`useHeat`: `burn` after the music began on this phone — `usePieceState`, `useSnippet`'s bus —, or after `FALLBACK` 2.5 s when it
  has not; at the burn `hushSnippets` stops it), so a slow download burns nobody; the room's clock = the burn + `BURN_GRACE` 5 s.
  New face hooks: `everyPhone` (the piece always sounds on every phone, no lobby choice — on the host's phone alone its delay would
  tell), `selfTimed` (no clock, no send button; the Pick sends by itself) and `Sent` (my card once sent). On a phone on its side
  the churchkhela stands beside its button (`[@media(max-height:500px)]` classes).
  Since 2026-11-04 „მარგალიტები“ is a hub game too (item `margalitebi`, `pages/games/MargalitebiGame.tsx` = `VariantPage`, the hub
  opens its tab by `requestOpen('margalitebi', …)`): „ონლაინ“ = `PearlChests` (the path's round button stays), „ჰიბრიდული“ = „კლასის
  სკივრი“ (`pages/games/margalitebi/ClassChest.tsx`, rules `utils/pearlTeams.ts` + test): 2–6 teams in turn, a pearl of the chosen
  chest a turn (2/3/4 a team), the singer picks a voice and sings into the phone (turniri's `Sing`, whose `onScore` now also gives
  the voice); the per cent = the points, 80 % polishes — on the class's own chest too, kept on the phone (`sg-margalitebi-chest`,
  the best per voice; the pearls the class has polished in fewest voices come first); a game's takes join that chest when it ends
  (`chestWith`), so a turn can be undone till then; kept in `sg-margalitebi-teams`, settings `sg-margalitebi-table`, ✕ only pauses.
- **„რა? სად? როდის?“ (2026-10-28)**: the team quiz (`pages/games/RaSadRodisGame.tsx`, `mapItem` `rsr`; rules
  `utils/raSadRodis.ts` + test). The user's answers „1ა 2ა 3ა“: ~100 questions written by Claude from the app's own texts — 111 in
  `data/raSadRodisQuestions.ts` (+ since 2026-11-01 the shared broad bank `data/kartuliQuiz.ts`: 153 facts with three wrong answers
  each in 15 topics — history, heroes, great people, literature, film, song, dance, cuisine, costume, regions, monuments, nature,
  tales, sport, music; 264 questions, 18 topics: the faith ones — saints, sacred history, chant — after them), stable ids, not yet checked by a teacher (the setup says so) — plus the teacher's own
  („ჩემი კითხვები“, device only, `sg-rsr-mine`); every team answers the same question on paper at once, the host's phone shows it,
  counts the minute (tick at 10 and 3-2-1, bell), shows the answer + note and the host ticks who got it; topic „მოისმინე“ makes a
  question from a `hangiPool` recording (`listenQuestion`: a feast's chant → which feast, a song → its region, else the chant's name)
  and plays 20 s from a random point. `drawGame` spreads the topics, asks the unasked first (`sg-rsr-seen`, last 60), a dry topic
  lends its slot; „სხვა კითხვა“ swaps one, „წინა პასუხი“ goes back to fix ticks. The game is kept after every step (`sg-rsr-game`,
  `parseGame`), so ✕ only pauses — the setup shows „გაგრძელება“. No rules change, nothing in Firestore.
  Since 2026-11-04 that one-phone game is the „ჰიბრიდული“ tab (`pages/games/rsr/Table.tsx`; store `rsr/store.ts`, topics
  `rsr/topics.ts` + `rsr/Topics.tsx`, „ჩემი კითხვები“ `rsr/MineEditor.tsx` under both tabs) and „ონლაინ“ is a quick-games room
  (`rsr` in `ROUND_GAMES`/`ROOM_GAMES`/the rules/the Worker's titles; face `rsr/face.tsx`, device keys under `store: 'sg-rsr-klasi'`
  — `sg-rsr` is the one phone's): the host reads the question in the room's call (it is on every phone too), each player writes the
  answer on their own phone in the minute. The first game **answered in words**: a face's `typed: { placeholder }` gives the field
  and its send button in the screen's bottom bar (`rounds/typed.tsx`), the act carries `text` (≤ 80; rules: a string ≤ 240), a
  `RoundRules.typed` round keeps it in the answer and `publicView` shows everybody's `texts` only at the reveal. The app judges the
  words (`rsrMatch` in `utils/raSadRodis.ts` + test: every form of the answer — outside brackets and each bracket's content —, a
  word's stem by its endings (`stemOf`), one letter's slip in a long word, numbers as digits — roman, cardinal and ordinal words
  too — and a date's month must match; 75 % of an answer's weighty words), and at the reveal the host taps a line to judge it again
  (`judgeRound`, the room's move `judge`; the points follow). One point a right answer. A teacher's own question's other forms go
  in brackets (the editor says so). `rsrMatch` also takes a written word with the copula („ფარნავაზია“ = ფარნავაზი) and refuses a
  list of guesses: more weighty written words than the form's + `extra` (`RSR_EXTRA` 3) is no answer.
  „ამიხსენი“ online (2026-11-04, the second game answered in words; `amikhseni` in `ROUND_GAMES`/`ROOM_GAMES`/the rules/the
  Worker's titles; rules `utils/amikhseniRounds.ts` + test, kept free of the cards' data since the room's store is in the first
  bundle; face `pages/games/amikhseni/face.tsx`, device keys under `store: 'sg-amikhseni-klasi'`): the host is the explainer
  (`ROOM_GAME_INFO.host` „ამხსნელი“ — the lobby and the player's lines now name each game's own leader), the word is on their
  phone only (`Secret`; on a wide screen the round screens put `Secret` beside the clock), the players see its theme and write
  the word, one try, 1000 at once … 500 at the last second (`amikMatch` = `rsrMatch` with `AMIK_EXTRA` 2); before anybody
  answers the host may take „სხვა სიტყვა“ of the same theme (the face's `Tool`, which now gets `answered`; `swapAmikhseni`). The
  draw (`drawAmikhseni` over `drawGame`) turns the chosen themes, the words shown lately last (`sg-amikhseni-seen`, 200). Both tabs
  share the themes (`amikhseni/store.ts` over `sg-amikhseni`, chips `AmikThemes` with the print kit's colours and marks in
  `amikhseni/parts.tsx`).
- **„სამშვილდის ღამე“ on the phone (2026-10-30)**: the hybrid variant of the printed Mafia (`pages/games/SamshvildeGame.tsx`,
  screens `pages/games/samshvilde/`, `mapItem` `samshvilde`; rules `utils/samshvilde.ts` + test; its entry in `GAMES` has
  `item`, so its hub card's ონლაინ/ჰიბრიდული open it while section `tamashebi` allows, else only the PDF shows). The user's answers
  „1ა 2ა“: the printed kit's roles, table (6–16 players, piper optional 11–14, kids' variant ≤9) and words; the roles are dealt by
  the phone passed round (each sees their card secretly) or by the printed cards — then the host marks on the first night who
  wakes (`markAsks`), the boss among the spies. The phone is the host's (მემატიანე): the night in the dark `TableScreen tone="night"`
  (each step's words, who wakes, whom they point at; the warden's nod; a role that is out keeps its words and an 8 s pause), the
  morning, the speeches' clock with „ვაბრალებ“, the hands (one accused needs more than half, a tie talks 30 s and votes again),
  the verdict, the end with every card open and the chronicle. Privacy: day screens never show roles or the quiet night's reason,
  „უკან“ never goes back into the deal, the host's table opens only after a confirm. Kept after every step (`sg-samshvilde-game`,
  settings `sg-samshvilde`), ✕ only pauses. No rules change, nothing in Firestore.
- **„სამშვილდის ღამე“ online (2026-10-30)**: the user's answers „1ა 2ა + ზარი, 3ა“ — a მემატიანე who does not play hosts it on
  their phone, every player sees their role and points at night on their own phone, the app counts hands and time; anyone in a
  class (member or teacher) opens a room. The page's tabs „ონლაინ · ჰიბრიდული“ (`conf.mode`; online first when signed in).
  Engine `utils/samshvildeOnline.ts` + test: the host's phone holds `OnlineState` (the hybrid `SamGame`, uids, the step's answers
  `by`, the speech clock `clock`/`clockAt`, the hands) and writes in one batch the public view (`publicView` — no role before the
  end), each changed seat (`seatView`: role, mates, checks) and `host/state` (a reload goes on); players write only `joins/{uid}`
  and `acts/{uid}` `{key, pick, end, at}`, each applied once and only for the step's `keyOf` (`applyAct`). Store
  `utils/gameRoom.ts` + test (`createRoom`, `roomPath`) over `utils/gameRoomFirestore.ts` (`rooms`, `useRoom`, `useClassRooms`).
  Room `classes/{c}/games/{r}` + `joins`, `seats`, `acts`, `host/state`, `peers`: the host alone writes the room, seats and state; a
  seat is read only by its player and the host (not teachers). Screens `pages/games/samshvilde/online/` (`OnlineSetup`,
  `OnlineRoom`, `Lobby`, `HostGame` = the hybrid screens fed by the phones, `PlayerGame`); the hybrid screens take online props
  (`NightScreen online`, `DayScreen`/`TieScreen` `clock`+`clockAt`+`onClock` — the clock runs on every phone from the host's start,
  `VoteScreen ballots`, `VerdictScreen hands`). Invitations: a class-chat card (`sendGameMessage`, kind `game`), a push by the
  reminders Worker's `/game-invite` (`notifyGameInvite` in `utils/groupPush.ts`; devices with group or assignment reminders; link
  `/?open=samshvilde&c=&r=`) and the strip `components/games/GameInvites.tsx` (✕ = `dismissRoom`, this device); all open through
  `useOpenGameRoom` (`utils/gameRoomOpen.ts`). The game's own call (`online/GameCall.tsx`): the school's calls on the room's path
  (`gameCallInfo`), opened as the small bar (`TableScreen` and the strip sit under it); `useHush` turns the players' microphone and
  camera off at night and an out player's microphone by day (not the farewell). Not yet tried by real people on several phones.
- **The quick games (2026-10-31, the tender's top five; the user: „გააკეთე 5-ვე ონლაინ და ჰიბრიდული“, answers „აააა“)**: one
  engine of rounds, `utils/roundGames.ts` + test — a round is asked once, every player answers once on their own phone
  (`Act.ms` = their own time), the last answer or the time reveals it; each game's `RoundRules` (steps, seconds, points,
  `secret` fields kept from the view until the reveal, `valid`); the hybrid = one phone, 2–6 teams, the host marks each team
  (`HybridState`, `markTeam`, kept on the device so ✕ only pauses). The room store is generic since then: `utils/gameRoom.ts`
  `createRooms(be, engine, moves)` over a `RoomEngine` (`games` it plays; samshvilde's is `utils/samshvildeRoom.ts`), the
  app's two stores in `utils/gameRoomFirestore.ts` (`rooms` = samshvilde, `roundRooms` = the quick games: `timeUp(key)`,
  `reveal`, `next`); the rules let a room be opened for every `ROOM_GAMES` game (29 since 2026-11-04), up to 40 players, an act may carry `ms` (and `text`).
  Invitations name their game: `data/roomGames.ts` (titles, the hub item, a chat card's `room` = `game:roomId` — a
  samshvilde card keeps the bare id), the Worker's `GAME_TITLES`, `/?open=<game>&c=&r=`, icons
  `components/games/roomGameIcons.ts`; the online tab of every room game is `components/games/RoomSetup.tsx`. Screens
  `pages/games/rounds/` (`RoundsPage` = intro + tabs ონლაინ · ჰიბრიდული, `RoundsRoom`, `RoundsLobby` — 5/8/12 rounds, the
  piece on every phone (from home) or only on the host's (one room) — `RoundsHost`, `RoundsPlayer`, `RoundsHybrid`;
  `useSnippet` = one `<audio>` a screen, the piece starts at the same share `from` of the recording on every phone); a game
  is a `RoundFace` (`rounds/face.ts`; optional `Ask` = the round in words under the clock, `Options` = the game's own
  choices in the lobby and the hybrid setup, `Extra` = more on its page; a hybrid round without a piece starts its time
  with „დროის დაწყება“). Built so far: „საიდანაა სიმღერა?“ (mapItem `kutkhe`, like GeoGuessr; `utils/kutkhe.ts`
  + test: the songs map's 13 regions, neighbours `KUTKHE_NEAR`, right 1000…700 / neighbour 400…300 by speed, 40 s, a 30 s
  piece; `drawKutkhe` — a different song each round, never one region twice running, only regions with ≥3 songs, the songs
  not asked lately on the device first (`sg-kutkhe-seen`); pool `data/kutkhePool.ts` = 688 songs' whole takes from
  FOLK_SONGS — own versions that are not parts, archive recs, the Centre's mp3s, not the per-member albums — empty while the
  recordings are hidden; face `pages/games/kutkhe/` — the map to tap + region chips, the reveal green / neighbours /
  counts; hybrid marks კუთხე 2 · მეზობელი 1 · ვერა 0) and „ოთხიდან ერთი“ (mapItem `otkhi`, like Kahoot; `utils/otkhi.ts` +
  test: four answers in ა ბ გ დ colours, the right one 1000…500 by speed, 30 s; 121 own questions in `data/otkhiQuestions.ts` + the
  broad bank `data/kartuliQuiz.ts` (274, 19 topics), written by Claude from the app's texts with the right answer first — not yet checked by a teacher, the page says
  so; „მოისმინე“ = `listenItem` over `hangiPool` (a feast's chant → which feast, a chant → which one, wrong ones from its own
  service; a song → which song), a 20 s piece; the teacher's own (right + 1–3 wrong) on the device; `drawGame` of
  raSadRodis.ts is shared; topics, own questions and the asked ids on the device — `pages/games/otkhi/store.ts`
  `sg-otkhi-*`; hybrid marks სწორი 1 · ვერა 0; its four answers `rounds/four.tsx`, shared) and „ხმა-ხმად“ (mapItem `khmebi`,
  like Bandle) + „სამ ნოტში!“ (mapItem `notebi`, like Name That Tune): rules `utils/chantRounds.ts` + test — a round of three
  steps, four chant names, right 1000…800 / 650…520 / 350…280 by step and speed; the piece is the chant's book notes on the
  synthesizer (`useSnippet`'s `Clip` = a recording's piece, `{score, voices}` = from that voice down — the bass alone, + the
  middle voice, all three, from their first note, 16 s — or `{score, pitches, within}` = the top voice's first 3 / 6 different
  pitches begun within 7 / 11 s, then its first phrase; `utils/chantClips.ts`); the chants `data/chantGamePool.ts` = the
  pearls' sixty without the short answers, litanies and a tone's own pieces (41 names), plus the class's program (`draw(count,
  program)`: the room's class, on one phone all mine); one name once a game, the wrong three of the same service, old
  spelling one name (`nameKey`: ვ = უ, ჲ dropped); the asked ids on the device `sg-khmebi-seen` / `sg-notebi-seen`. A step
  moves on by its time or the host's „შემდეგი ხმა“ / „მეტი ნოტი“ (the hybrid keeps `HybridState.step`, `hybridStep`; its next
  step plays at once); hybrid marks by the step the team wrote: 3 · 2 · 1 · ვერა 0; face `pages/games/chants/face.tsx`. And
  „ხმების ტურნირი“ (mapItem `turniri`, like SingStar; `utils/turniri.ts` + test): three rounds (`fixedRounds`), a round = a
  known chant's first phrase (the same pool), every singer picks their voice I/II/III (`sg-turniri-voice`), hears its phrase
  and sings it into the phone in any key — `pages/games/turniri/Sing.tsx` scores it as the pearls do (`scoreSinging`), the
  share in per cent is the points (online sent as the act's `pick`, 0…100; a take may be sung again before sending, another
  voice drops it — `Pick`'s `onPick(null)`); no piece of its own (`clip` none). Its hybrid goes one by one (`turns`, `sides`
  „მომღერლები“): the phone passed hand to hand, each one's take kept as their mark; any name can sing (again) out of turn.
  Every quick game is now built. Not yet tried by real people on several phones. Its kit (`khmebis-turniri.js`, 7 sheets, 2026-11-01)
  is a knockout tournament: 18 chants' first phrases, each voice on its own staff with its first note (`openingOf`, seed 31), the
  brackets for 8 and 16 singers (duels numbered, „№“ of the chant), nine voting cards (ა one side, ბ the other — the class votes
  for the better of the two who sang the same phrase in the same voice) and the points sheet (three rounds, 0–3, as in the app).
  „დღის ჰანგი“ with a class (2026-11-01, the whole-list stage 1): a room game too (`hangi`, `utils/hangiRounds.ts` + test: six
  steps of the recording's start 1·2·4·7·11·16 s, four names of the same kind and service/region, 1000…250 by step; face
  `pages/games/hangi/face.tsx`, device keys under `store: 'sg-hangi-klasi'` because `sg-hangi` is the daily record). `RoundsPage`
  takes an optional `solo` tab — the daily game stays its first tab („დღის ჰანგი · ონლაინ · ჰიბრიდული“); `useSnippet`'s `Clip` may
  carry its own `seconds`.
  „ქართული აკორდი“ (mapItem `akordi`, like Perfect Ear; `utils/akordi.ts` + test) and „რვა ხმა“ (mapItem `rvakhma`, like Functional
  Ear Trainer; `utils/rvakhma.ts` + test), same day: two steps each, 1000/500 by step and speed, hybrid marks 2 · 1 · 0. A chord = a
  moment of the book notes where all three voices strike together; nine kinds by their exact spacing over the bass (`CHORD_KINDS`,
  counted from the bass as the theory names them: 1-1-1, 1-5-8, 1-4-8, 1-3-5, 1-6-8, 1-4-5, 1-5-7, 1-5-9, 1-2-5), 20 a kind in
  `data/chordPool.ts` — generated by `node scripts/build-chord-pool.mjs`, never edit by hand; levels „საწყისი“ (`BASIC_KINDS`, always
  the same four answers) / „ყველა“ (the right one + 3); it sounds as `useSnippet`'s `{notes}` clip (`playLessonNotes`, chords allowed):
  together, then from the bass up; the page's guide plays every kind. Tones: vol. VIII's heirmoi (`data/rvakhmaPool.ts`, tone t =
  files 8t+1…8t+8; five left out whose first phrase another tone's heirmos shares note for note — the test checks it on the notes),
  12 s then 26 s on the synthesizer, eight buttons, the reveal plays the tone's model to compare (`modelOf`), the eight models listed
  under the tabs. Shared: `rounds/steps.tsx` (the step bar), `rounds/samples.tsx` (a sample's ▶, `useSampler`).
  „რუკის ვიქტორინა“ (2026-11-01, the plan's №11, like Seterra; mapItem `ruka`, `utils/ruka.ts` + test): a name — a town, a lake, a
  dish, a fortress, a person — or a folk song is put on the songs map's 13 regions (`KutkheMap` with `near={false}`, Tbilisi for
  ქალაქური — `rukaRegionName`), right 1000…500 by speed, 15 s (a song 20 s); 121 places of five topics in `data/rukaPlaces.ts`
  (a note each, written by Claude, unchecked; no name may name its region — `NAMES_A_REGION`, the test checks it) + the songs
  (`data/rukaPool.ts`: `kutkhePool` takes when they can be heard — „მხოლოდ ჰანგით“ hides every title —, else the known titles);
  `drawRuka` turns the topics, spreads the regions (the least asked first, never one twice running), the unseen first. Its tabs
  „მარტო · ონლაინ · ჰიბრიდული“: „მარტო“ = ten in a row on my phone; hybrid marks 1 · 0.
  „მარტო“ is one screen for any one-step quick game (`rounds/Solo.tsx` `RoundsSolo`: the face's draw, `Ask`, `Pick` — a tap answers
  at once —, verdict, `Answer`, `Reveal` with `mine`; points by the game's own rules; `utils/soloRun.ts` + test; the best run in
  `<store>-best` on the device, `rounds/soloStore.ts`).
  „გააგრძელე!“ (2026-11-01, the plan's №10, like Don't Forget the Lyrics!; mapItem `gagrdzele`, `utils/gagrdzele.ts` + test): a folk
  song's title and the line or two before a gap — which line comes next? Four lines of the same song (none alike — `alike`, letter
  pairs), right 1000…500 by speed, 20 s; with a recording (`kutkhePool` takes) its first 12 s play first and the line asked is
  the fourth or later. The words: `data/lyricsPool.ts` — generated by `node scripts/build-lyrics-pool.mjs` from the songs' `lyrics`
  and `public/song-texts/<id>.json` (`utils/lyricLines.ts` drops singers' labels, numbers, repeat marks; a song is kept only when
  it can give a round), never edit by hand, run it again after a song's text changes. A cut = a line sung once after a line sung
  once (`cutsOf`). Tabs „მარტო · ონლაინ · ჰიბრიდული“; on one phone no options show: the teams sing or write the line from memory,
  marks ზუსტად 2 · თითქმის 1 · ვერა 0.
  „ოთხი ჰანგი, ერთი სიტყვა“ (2026-11-01, the plan's №12, like 4 Pics 1 Word; mapItem `hangebi`, `utils/hangebi.ts` + test): four
  clues, one word built from a bank of letters (`pages/games/hangebi/Bank.tsx`: a box a letter, a tap puts / gives back; a full
  word that is one of `HANGEBI_WORDS` is the pick — sent as its index, so alone it answers at once — any other says „no such
  answer“), right 1000…500 by speed. By word (40 s): the groups of „ოთხეული“ under the word that names them (`data/hangebiWords.ts`
  `KEY`; four rivers → მდინარე, a region's song titles → that region; a clue holding the answer's stem or a region's adjective is
  left out — `cluesOf`; four clues no other answer's group holds three of — `sureClues`); by ear (60 s, only when the recordings
  may be heard): a region with ≥ 4 `kutkhePool` songs, four 6 s pieces each with its own ▶ (`useSampler`), the answer the region
  (`data/hangebiPool.ts`). The first 13 `HANGEBI_WORDS` are the regions in `KUTKHE_REGIONS` order. Levels „ორივე · სიტყვით ·
  ყურით“ (`sg-hangebi-level`). Tabs „მარტო · ონლაინ · ჰიბრიდული“; on one phone the screen shows the clues, the boxes and the
  letters, the teams write the word, marks სწორი 1 · ვერა 0.
  „ექო“ (mapItem `eqo`, like Simon; `utils/eqo.ts` + test) and „მფრინავი ნოტები“ (mapItem `mprinavi`, like Staff Wars;
  `utils/mprinavi.ts` + test), 2026-11-01, both over `data/melodyPool.ts` — 42 melodies (the chant games' chants + the program's
  songs: top voice and bass as they sound, a repeated pitch once, the first 40 notes) made by `node scripts/build-melody-pool.mjs`,
  never edit by hand. ექო: a melody's opening (`eqoLine`, ≤ 8 different pitches = the keys) sounds even (`eqoTimed`) and is tapped
  back on coloured bars (`eqo/Keys.tsx`; `useLit` lights them through `useSnippet`'s bus `useSounding` — what plays and when); round
  r = 3 + r notes, the taps sent as one int (`encodeTaps`, base 9), 100 a note right from the start, 200 a note when whole; options
  „ფერებით / მხოლოდ ყურით“. „მარტო“ = endless Simon (`eqo/Solo.tsx`, best `sg-eqo-best`); its hybrid tab is a circle
  (`eqo/Circle.tsx`: the phone hand to hand, keys or singing judged by the host, a miss is out, the phrase grows once all who are in
  have played — `EqoRing`; kept in `sg-eqo-circle`, ✕ only pauses). მფრინავი: online = four notes of a melody on a staff, named in
  order (250 a note, half by the end, 20 s); „მარტო“ = notes fly from the right to the clef (`mprinavi/Flight.tsx`: three lives,
  faster every four right — `flightSeconds`); its hybrid = the same flight round the circle with the class's record
  (`sg-mprinavi-class-best`); clefs სოლის / ფას / ორივე, names დო რე მი / C D E (H = სი); the staff is drawn with abcjs's own signs
  (`mprinavi/glyphs.ts`, `Staff.tsx`). `RoundsPage` takes `table` — a node in place of the hybrid setup;
  `components/games/CircleNames.tsx` = the circle's names (`sg-circle`, a class in one tap), shared by both.
  „ხმის წყვილები“ (2026-11-01, the plan's №3, like Memory; mapItem `tsqvilebi`, `utils/tsqvilebi.ts` + test): cards face down, a
  sound card plays a chant's opening on the synthesizer (book notes, `voices: 0`, 6 s) or a folk song's take (`kutkhePool`, else the
  program's songs with notes — `data/tsqvilebiPool.ts`), its pair is its name or (easier) the same sound; 8 / 12 / 16 cards (three
  columns for twelve), chants / songs / both, kept in `sg-tsqvilebi-*`. The board (`tsqvilebi/Board.tsx`, `useBoardPlay`): a 3-D turn
  (`.tsq-*` in index.css), a miss closes once its sound is over, an open or found sound card plays again, a found pair keeps green or
  its team's colour; long names break between syllables (`softBreaks`, soft hyphens). Online = three boards (`fixedRounds`), the
  same deal on every phone, 30 s + 14 s a pair; 100 a pair + up to 600 for a cleared board by fewer moves; the answer is
  `encodeResult(pairs, moves)` and goes by itself — whole at once, else as the time runs out (the face's new `autoSend` /
  `sendLate`, RoundsPlayer). „მარტო“ = one board, fewest moves, the record per size and way (`sg-tsqvilebi-best-<cards>[-same]`);
  its hybrid tab = teams in turn on one phone (`tsqvilebi/Teams.tsx`, a pair goes again, kept in `sg-tsqvilebi-teams`).
  „მესამე ხმა“ (2026-11-01, the plan's №6, like Smule; mapItem `mesame`, rules `utils/trio.ts` + test, screens `pages/games/mesame/`):
  the phone sings two voices of a chant from its book notes, I sing the third. A take (`useTrioTake`): the microphone opens, my first
  note sounds while 3-2-1 is counted, the synthesizer plays the others (`setMuted`, or mine softly with „ჩემი ხმაც ჩუმად“); the take
  is laid on the score by the delay that fits best (`fitDelay`: the guess = play start + 50 ms + `LAG` 0.12 s, searched −0.1…+0.5 s)
  and scored per note (`scoreTrio`: in tune = within ¾ semitone of the note in any octave, `pcOff`/`foldNear`; a note's credit = its
  in-tune share ÷ 0.6, weighted by length; notes after a stop are not counted unless `strict`); the score shows at once, the MP3
  follows (`making`). The mirror `Lane.tsx` (karaoke lane: my notes run to the „now“ line, my voice a line folded by octaves, passed
  notes green when sung) + the book's line with the beat band (`components/learn/PartPicture.tsx`, moved out of LearnMode). Tabs
  „მარტო · ონლაინ · ჰიბრიდული“: „მარტო“ (`Solo.tsx`) = a chant of the class program or the pearls' chests (`chants.ts`,
  `ChantPicker` with 🎲), my voice, the opening (`openingEnd`: lines until ≥ 12 s, ≤ 3; a chant whose opening is all of it shows no
  choice — `openingIsWhole`) or the whole, ×0.8 „ნელა“; then %, hits, each line's share, the best per chant·voice·length on the
  device (`sg-mesame-best`), „მოუსმინე სამივეს“ (`mix.ts` `trioMix`: the others rendered offline, my take on them by the fitted
  delay, one MP3) and „კლასის ჩატში“ (`components/games/ClassSend.tsx`: a line + the voice message; `useMine` there = my classes and their program).
  Online = three rounds of a known chant's opening (`knownChants`, `fixedRounds`), every player in earphones on their own phone,
  the score = the round's points (sent as the act's `pick` 0…100, sung again before sending allowed, `strict` so a stop counts the
  rest as missed); 120 s. Hybrid (`Table.tsx`) = one phone's speaker sings one or two voices (`sg-mesame-table`), the class the
  rest; each voice's first note in turn, 3-2-1, the book's line on screen, the room recorded (≤ 290 s) and sent to the class chat.
  Its kit (`src/print/games/mesame-khma.js`, 6 sheets): 12 openings in three voices, two a page with each voice's first
  note named (the app's chant games' chants, seed 29), nine voice cards (I მთქმელი · II მოძახილი · III ბანი, three trios) with one
  back, a jury sheet (six trios × three rounds × დაწყება · ხმა · ბოლო, 0–2 each); the trios sing, the cards move on after a round.
  „ჩემი გუნდი“ (2026-11-01, like Incredibox; mapItem `gundi`, the hub opens its tab by `requestOpen('gundi',
  'online' | 'table')`; rules `utils/gundi.ts` + test, screens `pages/games/gundi/`): a little theatre of six (`Stage.tsx`, SVG,
  moved by rAF without React) — მთქმელი, მოძახილი, ბანი stand (the book's voices I–III), ტაში, დოლი, ფანდური sit — over a folk
  song's phrase that goes round (`loopsOf`: 6–22 s, on a bar line when the song's meter is sure — `songMeter` —, its end going back
  into its start, ≤ 3 a song; the songs = `SONG_ITEMS` with notes but 9 and 10, `gundi/songs.ts`). Each role has variants
  (`VARIANTS`: the bass ჰანგი / ბურდონი, claps, drum, panduri patterns — `trackOf`; the syllables a class says, `patternWords`). The
  engine `gundi/engine.ts` (`GundiStage`: a role joins at once, a new phrase at the pass's end; sounds `gundi/sounds.ts` — clap,
  drum, Karplus–Strong panduri; a take ≤ 120 s rendered offline from its log, `renderTake`). Tabs „სცენა“ (`Studio.tsx`: ▶, 🎲
  `randomStage`, ● → save or the class chat) and „ჰიბრიდული“ (`ClassStage.tsx`: each role phone / class / nobody — `CLASS_PARTS`;
  the conductor's screen: the class's first notes, 3-2-1, a class group tapped comes in at the next pass, beat dots, the players'
  syllables, the book's lines with the beat band, the room recorded ≤ 290 s). Device keys `sg-gundi`, `sg-gundi-klasi`,
  `sg-gundi-tab`. Its kit (`chemi-gundi.js`, 6 sheets): the eight songs' phrase 1 in three voices between repeat signs (first
  notes, the drone, the count), six role cards with the app's own figures (`FigureCard` through esbuild + react-dom/server) and
  every pattern's syllables in 2 and 3, twelve conductor's cards (a little stage of who is in; „ფინალი“ kept aside), the ensemble
  map (six roles × eight passes). `music.js` since: a score's voices on a 32nd's grid counted from its start (`onGrid` — a fast run
  no longer pushes its voice late) and a staff too full for its box is drawn again smaller.
  „ჩამოთვალე!“ (2026-11-01, the plan's №9, like Sporcle; mapItem `chamotvale`, rules `utils/chamotvale.ts` + test, screens
  `pages/games/chamotvale/`): name every member of a list against the clock (`chamoSeconds`: 15 s + 8 a member, 40–150 s). 17 lists
  in `data/chamotvaleLists.ts` (five topics: საქართველო, სარწმუნოება, მუსიკა, მსოფლიო, პატარებს; a member's `alt` names, a box's
  `hint` — a date, a value, a kind —, a list's `also` = notes for near misses; `kutkheebi` = the songs map's 13 regions in
  `KUTKHE_REGIONS` order, `map: true` fills the map). Written by Claude from well-known facts and the app's data, unchecked — the
  page says so. Matching (`tryName`): while typing only a whole strict name counts (letters only), and it waits while another
  unfound member's name goes on from it; a member's own longer name typed after its short one is swallowed (`continuesForm`,
  Entry's `tail`); Enter tries the lenient form (a last ი dropped), the `also` notes, then one or two letters' slip
  (`editDistance`, `slipsFor`) when only one member is that near. Latin typing turns Georgian; the screen keys
  (`sg-chamotvale-keys`, on by default on touch phones; `GeoKeyboard onSpace` adds „ჰარი“) stick to the screen's bottom. Tabs „მარტო ·
  ონლაინ · ჰიბრიდული“: „მარტო“ (`Solo.tsx`, the best per list `sg-chamotvale-best`); online = a round per list, the found ones
  as a bitmask (`maskOf`, ≤ 30 members), 100 each, a whole list +100 and up to +300 by time left, sent whole at once or as the
  time runs out; the reveal counts how many named each one. Hybrid (`Teams.tsx`, kept in `sg-chamotvale-teams`): 2–6 teams take
  turns on one phone (a turn's clock, a find keeps its team's colour and passes the turn, „ვერ თქვეს“ passes it, every team
  passing in a row ends it). Its kit (`chamotvale.js`, 9 sheets): ten lists a page each (the boxes with the app's hints, the
  numbered map for the regions), a blank page for the teacher's own list, the host's key on two pages with the other names
  that count, and the score sheet.
- **„ასოების ბადე“** (2026-11-01, the plan's Georgian game №3, like Word search; mapItem `bade`, rules `utils/bade.ts` + test,
  screens `pages/games/bade/`): words of a theme hidden in a square of letters, found by a finger's drag or by tapping the first
  and the last letter (`lineOf` snaps to the eight ways). Levels `LEVELS`: 8×8 · 6 words · → ↓, 10×10 · 8 · + diagonals (the
  day's), 12×12 · 9 · backwards too; `buildBade` hides each word exactly once (`countWord`), none inside another, the filler from
  the words' own letters + the alphabet. Themes `data/badeThemes.ts` = the „ოთხეული“ groups but songs/chants + five „ჩამოთვალე!“
  lists. The grid may be drawn in nuskhuri or asomtavruli (`utils/oldScripts.ts`: `toScript` moves mkhedruli by code point, shared
  with „ხუცური წარწერა“; the app's „SG Old Script“ draws them), the words stay mkhedruli and the alphabet's key
  (`AlphabetKey`) shows under the grid. Tabs „ონლაინ · ჰიბრიდული“: online = one grid a day for the whole school (`gridOfDay`,
  record `students.games.bade.days[iso]` through `useDailyRecord('bade')` — found words, `t:<secs>`, `s:<script>`; the clock
  starts at the first touch and stops while hidden) + endless extra grids of any level (not saved); hybrid (`bade/Teams.tsx`,
  rules `utils/badeTeams.ts` + test) = 2–6 teams before one screen, a team calls a word, the host draws it and taps who found it
  (or picks it in the list), 2/3/5 minutes a grid, 1–3 grids, the list shown or only the theme; ✕ pauses the clock
  (`spent` + `t0`), kept in `sg-bade-teams`; on a computer the grid stands left of the list. Its kit (`asoebis-bade.js`, 6
  sheets): twelve 10×10 grids, four a script (mkhedruli, nuskhuri, asomtavruli — the old ones with the key strip), two a page
  cut into A5 cards; the big key (33 letters in three scripts + their old names) with two own grids behind it (not cut), the
  answers with coloured capsules.
- **„ხუცური წარწერა“** (2026-11-01, the plan's Georgian game №4, like Cryptogram; mapItem `tsartsera`, rules `utils/tsartsera.ts`
  + test, screens `pages/games/tsartsera/`): a known line in asomtavruli or nuskhuri (`TS_SCRIPTS`), an empty box under each old
  letter; the player names today's letter of each (`Guesses` keyed by the true letter — one guess fills all its boxes, a guess
  used under another letter moves). Lines `data/tsartseraLines.ts` (68: Rustaveli, poems from the app's მთქმელი texts, the fathers'
  sayings, proverbs written by Claude and unchecked — the page says so; only today's 33 letters, `usable`; ids stay, add at the
  end of a kind). Ways (`sg-tsartsera-mode`): „საიდუმლო“ = 1–3 letters given (`givenLetters`), wrong guesses allowed,
  „შეცდომები“ shows them for a hint; „გასაღებით“ = the key under the board, a wrong letter refused. Tabs „ონლაინ · ჰიბრიდული“:
  online = one line a day for the whole school (`lineOfDay`, record `students.games.tsartsera.days[iso]` through
  `useDailyRecord('tsartsera')` — `t:` secs, `h:` hints, `s:` script, `m:` mode; the way there in `sg-tsartsera-now`) + endless
  extra lines (`sg-tsartsera-seen`); the letters a player read themself, without a hint, are kept per script
  (`sg-tsartsera-known`, „შენი ანბანი“). Hybrid (`tsartsera/Teams.tsx`, rules `utils/tsartseraTeams.ts` + test) = „სასწაულების
  ველი“: teams in turn call a letter — present = a point a box and the turn stays, absent = it passes; a team may read the line
  (right = the boxes left + `READ_BONUS` 5, wrong = it opens for nobody); 3/5/7 lines, a turn's clock 0/30/45/60 s, kept in
  `sg-tsartsera-teams`; the screen keyboard's back key is „უკან“ (`GeoKeyboard` `backLabel`), on a computer the board stands
  left of the keys. Its kit (`khutsuri-tsartsera.js`, 6 sheets): twenty lines four a page (asomtavruli 1–12, nuskhuri 13–20,
  each page with the key strip; the kit's `script` sizes the boxes to fill the page and stops the build on an overflow), the
  signature in old letters too („ვინ თქვა?“), a secret letter of one's own, the big key with an asomtavruli copybook behind it,
  the answers and the class game's sheet (letters called, the teams' points). The old scripts' fonts, key strip and big key are
  shared with „ასოების ბადე“'s kit: `src/print/oldScript.js`.
- **„დროის ხაზი“** (2026-11-01, the plan's Georgian game №7, like Timeline; mapItem `khazi`, rules `utils/khazi.ts` + test, screens
  `pages/games/khazi/`): an event without its year is put into a line of cards in time order — between, before or after; the year
  opens and judges, a wrong card still joins at its right place, marked (the line stays true). Cards `data/khaziCards.ts` (105, four
  decks: ისტორია h1–h30 and კულტურა k1–k26 written by Claude, unchecked — the page says so; ქართველები = the births of `MTKMELI_AUTHORS`
  and of `ANCESTORS` with a year; წირვის რიგი t1–t18 = the Liturgy's parts, `when` = their place, label „№ N“; ids stay, add at the
  end). Equal years fit either side (`fits`). Tabs „ონლაინ · ჰიბრიდული“: online = the day's line for the whole school (`dealOfDay`:
  ten cards of the three year decks, distinct years, ≤ 4 a deck; record `students.games.khazi.days[iso]` through
  `useDailyRecord('khazi')`, the marks `r:<0/1 a card>`; the line on the way in `sg-khazi-now`) + the endless game of one deck with
  three lives, its best per deck on the device (`sg-khazi-best`). Hybrid (`khazi/Teams.tsx`, rules `utils/khaziTeams.ts` + test) =
  2–6 teams in turn on one screen: right = a point and the card in the team's colour, the turn always passes, goal 5/7/10, the
  round goes to its end; turn clock 0/30/60 s, „წინა სვლის გაუქმება“, kept in `sg-khazi-teams`; on a computer the line stands left
  of the card. Its kit (`drois-khazi.js`, 9 sheets): eighteen cards of each deck (the event in front, the year + note behind), two
  sheets a deck, rules with a drawn line.
- **„ჩემი ვაზი“** (2026-11-01, the plan's Georgian game №1, like Tamagotchi; mapItem `vazi`, rules `utils/vazi.ts` + test, picture
  `utils/vineShape.ts` + `pages/games/vazi/VineArt.tsx`): every member's vine grows from what they did — nothing new is stored, it is
  read from `students/{uid}` (`deedsOf`: habits ticked, daily games `done`, the learning mode's parts by `at`, polished pearls, drills'
  last days; a guest's from the device's `sg-<game>` daily records only — `vazi/useVine.ts`). A deed = a leaf, ≤ `LEAF_CAP` 8 a day;
  a month's leaves give bunches at `BUNCH_AT` 12 · 30 · 50, green that month, ripe (purple and golden by month) after; the season
  runs from November (`seasonOf`), earlier seasons' bunches are in the qvevri (`cellar`). The wood grows from every leaf ever
  (`leaves`), the leaves drawn are the last `RECENT_DAYS` 30 days' (`recent`, picked over all the wood by `leafPlaces` — a thin vine
  loses them all over); three idle days yellow it (`yellowShare`), a month bare, never dead. Tabs „ონლაინ · ჰიბრიდული“ (`VaziGame`):
  „ონლაინ“ = my vine (`vazi/Mine.tsx`: picture, today's deeds, the month's bunch bar, the last 14 days, how it grows); „ჰიბრიდული“ =
  „რთველი“ (`vazi/Harvest.tsx`): a teacher picks a class, every member's vine on one screen (`useClassStudents`), „დავითვალოთ!“
  counts the season's bunches vine by vine. No rules change. Its kit (`chemi-vazi.js`, 6 sheets): a month's vine to colour (one
  cane winding up the page — the app's vine is too dense to colour —, 63 numbered leaves, the bunches under the 12th, 30th and
  50th) with „ჩემი თვე“ behind it (the deeds, 31 days × 8 little leaves), leaf and bunch stickers, the class's harvest chart with
  the class qvevri (210 numbered grapes) behind it, four certificates.
- **„ჩაიცვი ქართულად“** (2026-11-01, the plan's Georgian game №8, like Dress-up; mapItem `chaitsvi`, rules `utils/chaitsvi.ts` +
  test, screens `pages/games/chaitsvi/`): dress the chokha — or the Georgian dress — part by part in the order it is worn, against
  the clock. Parts, pictures and stories are „ჩემი სამოსი“'s (`SAMOSI_PARTS`, `KABA_PARTS`; the dress only while its pictures are
  published — `useKaba`); the order is `CHOKHA_STEPS` / `KABA_STEPS` (a part's `needs` + the `why` said when it comes too early; the
  chokha's hat = one of `HATS` a game, `pickHat(seed)`); a part too early goes back and costs `PENALTY_MS` 3 s. `DressBoard`
  (`Dress.tsx`): 3-2-1, then the tray in a shuffled order (`shuffled(seed)`), the figure filling as „ჩემი სამოსი“'s layers. Tabs
  „ონლაინ · ჰიბრიდული“: alone (`Solo.tsx`: with names or „მხოლოდ სურათებით“, the best per way in `sg-chaitsvi-best`, then every
  part's story) and teams in turn on one phone (`Teams.tsx`, `newDressTeams`/`recordTurn`/`ranking`, kept in `sg-chaitsvi-teams`,
  ✕ only pauses) — or a real chokha, the host tapping each part as it goes on. Its kit (`chaitsvi-qartulad.js`, 6 sheets): two
  paper dolls drawn at 1:1 in `src/print/dolls.js` (a piece = its drawing + the shapes its grey cut line goes round,
  `halo`), the chokha's ten pieces (four hats) and the dress's five, their backs mirrored with what each goes on after (`afterOf`,
  read from the app's `needs`), the host's sheet (reasons, stories, „რომელი ქუდი?“) with the scores behind it.
- **„სამი დამწერლობა“** (2026-11-01, the plan's Georgian game №2, like Duolingo; mapItem `anbani`, rules `utils/anbani.ts` + test,
  screens `pages/games/anbani/`): the old scripts learned step by step. A script's path = nine steps (`UNITS`): seven of letters,
  most frequent first so words come early (`LETTER_UNITS`: აეიმდ · ოსრლბ · ნვგთუ · კცხშქ · ტყწპზ · ჩძჯღ · ფჭჰჟ), then words
  (`WORDS_UNIT`), then lines (`LINES_UNIT`). A lesson (`buildLesson`, `Lesson.tsx`) = a new letter met („intro“: the three scripts
  and its old name), asked both ways (`pick` old → today's, `find` today's → old), traced with a finger (`trace`, `Trace.tsx`: the
  app's „SG Old Script“ drawn faint; the check paints letter and ink on 120 px masks — `traceScore`: ≥ 60 % of the letter covered,
  ≥ 70 % of the ink on it; „გამოტოვება“ after two misses), words of the letters learned so far (`readable`; four options) and a
  line's words put in order (`order`). Three hearts (`HEARTS`): a miss costs one and the exercise comes back once at the end
  (`answered`); none left — „თავიდან“. The words (`data/anbaniWords.ts`) = „დღის სიტყვა“'s answers + „ოთხეული“'s groups but the
  songs' and chants' titles; the lines = „ხუცური წარწერა“'s of 3–7 words. Progress is the daily record (`useDailyRecord('anbani')`,
  a day's `guesses` = the lesson ids done, `a1`…`a9` / `n1`…`n9`, `ap`/`np` = practice), so a step is done once its id is anywhere
  (`unitsDone`) and the streak is `streakOf`; the letters missed most stay on the device (`sg-anbani-weak`, `updateWeak`) and lead
  „გაიმეორე ნასწავლი“ (practice). Tabs „ონლაინ · ჰიბრიდული“: the path (`Path.tsx`: script chips `sg-anbani-script`, streak / today /
  steps, nine round steps zig-zag) and „სწრაფი კითხვა“ (`Teams.tsx`, rules `ReadTeams`: an old letter, word or line on one screen,
  the host taps the team that read it first — a line 2 points —, the key strip shown or hidden, 10/15/20, kept in
  `sg-anbani-teams`; on a computer everything larger). Its kit (`sami-damtserloba.js`, 11 sheets): the big key + an asomtavruli
  copybook, a nuskhuri copybook + „ჩემი გზა“ (both paths to colour, a six-week streak calendar, the master's badge), a reading sheet
  a script (each step's letters and six words of the letters so far, then twelve long words and six lines with the key), 99 letter
  cards (33 × 3 scripts, number + old name in the corner, one back) for „სამეული“ (Happy Families), „ჰოპ!“ (Snap) and memory, the
  answers and the class game with two score tables.
- **„ციხის გასაღები“** (2026-11-01, the plan's Georgian game №12 „ტაძრის გასაღები“ turned into castles — no church pictures; like an
  Escape room; mapItem `tsikhe`, rules `utils/tsikhe.ts` + test, screens `pages/games/tsikhe/`): four castles (`data/tsikheRooms.ts`:
  ნარიყალა ადვილი, ანანური and გონიო საშუალო, ქაჯეთის ციხე რთული — written by Claude, unchecked, the page says so), five doors each, then
  the gate. A door is a lock (`Door.kind`): word (may carry an old-script inscription, read with `components/games/KeyStrip.tsx`, moved
  out of anbani), code (padlock wheels; the old letters' numbers ა1…ჩ1000 — `NUMERALS`), pick, listen (a chant's or a song's opening
  from the book notes on the synthesizer — `tune`, the test checks it is in `MELODY_POOL`), order, echo (the bells of „ექო“). A door
  opened gives a letter of the key word, the five scrambled (`piecesOf`); the gate = putting them in order. 30 minutes counted up
  (`Clock {spent, t0}`, `t0` 0 = paused), hints 1 + 1 + 3 min (the third is the answer), a wrong try 30 s; the clock waits while a
  door's note shows (`solved`); ★★★ in time without hints, ★★ in time, ★ late. Tabs „ონლაინ · ჰიბრიდული“: online (`Solo.tsx`) = alone
  or friends round one phone, the run in `sg-tsikhe-run` (✕ pauses), the best per castle `sg-tsikhe-best`; hybrid (`Teams.tsx`,
  `TsikheTable`, kept in `sg-tsikhe-table`) = 1–6 teams (or the whole class as one) with the printed cards and the host's phone as
  the locks — a team brings its answer, the host taps the team and tries it on its door (options and items in the cards' order: the
  seed is `printSeed(room)`), then hands the next card; one clock, each team's own penalty, the first through the gate wins. Its kit
  (`tsikhis-gasaghebi.js`, 13 sheets): a castle = two sheets of four 99×140 mm cards (five doors + the gate, each from №2 showing the
  piece the door before gave; the castle's story; its scroll — the old script's key, ნარიყალა's with the numbers), a teacher's page a
  castle (answers, both hints, the tune's opening on a staff, the bells' phrase, the notes to read aloud), the teams' sheet and the
  hint tokens (two hints + one answer a team). A door card's empty part holds a faint castle (`.ts-fill`, dropped when too small).
- **„წინაპრის გზა“** (2026-11-01, the plan's Georgian game №10, like Choose Your Own Adventure; mapItem `tsinapari`, rules
  `utils/tsinapari.ts` + test, screens `pages/games/tsinapari/`): a real ancestor's life told as forks — at each one three ways, the
  one the ancestor took and two what-ifs, each with where it would have led (`then`) and what really happened (`real`). Four stories in
  `data/tsinapariStories.ts` (ფილიმონ ქორიძე, კარბელაშვილები, ექვთიმე კერესელიძე, არტემ ერქომაიშვილი; 5–8 forks each, their facts from
  the app's „წინაპრები“ biographies — `ancestor` = the bio's id —, the scenes and what-ifs written by Claude, unchecked, the page says
  so). The ways' order a fork = `choiceOrder(seed, step)`; stars by the ways the ancestor took (`starsOf`: all but one ★★★, half ★★).
  The monogram (`Medallion`) is the initials in asomtavruli — no portraits, and no ქ (its old capital looks like a cross). Tabs
  „ონლაინ · ჰიბრიდული“: alone (`Solo.tsx`: the run in `sg-tsinapari-run`, ✕ pauses, the best per story `sg-tsinapari-best`, the end shows
  the real path and opens the ancestor's biography when its section is open) and the class (`Teams.tsx`, `PathTable`, kept in
  `sg-tsinapari-table`): teams hold up their ა ბ გ cards, the host taps each team's letter, „რა მოხდა სინამდვილეში?“ gives a point to
  the ancestor's way (a tap after it mends a slip), or the whole class as one team picks a way. Its kit (`tsinapris-gza.js`, 13
  sheets): each story a gamebook of four pages (§ 1 + one § a way, numbers shuffled by a seed of its id; the print's script flows the
  sections over the pages, a § may go on in the next column but never over a page, a tight last page drops its note lines first,
  then the type steps down, room left becomes more note lines), the book's own „ჩემი გზა“ strip, ა ბ გ cards for six teams (the
  letter on both sides, the back in the team's colour), „ჩემი გზა“ for all four stories with „ჩემი წინაპრის გზა“ (ask the family)
  and the class's score sheet behind it, the teacher's key (the letters there are the book's; the app's hybrid shuffles anew).
- **„ნუ იტყვი!“ and „ერთი მინიშნება“** (2026-11-01, like Taboo and Just One; mapItems `tabu`, `minishneba`, the hub opens their tab by
  `requestOpen('tabu' | 'minishneba', …)`): one deck for both — `data/tabuCards.ts`, 180 cards in 12 themes (`TABU_THEMES`), a word +
  five forbidden words from the vaguest to the most telling (written by Claude, unchecked — the pages say so; one word a card, none
  holding another — the test checks it). „ნუ იტყვი!“ (`utils/tabu.ts` + test, `pages/games/tabu/`): „ონლაინ“ = the day's 20 cards for
  the whole school (`dayDeal`), the forbidden words come one by one as clues and the word is typed into letter boxes (`LetterBoxes`,
  `WordField` — the screen keys of `sg-chamotvale-keys`): 5 points with the first clue, one less a clue, a wrong word opens the next,
  after the fifth the card is lost (`tryWord`); the day's record `students.games.tabu.days[iso]` through `useDailyRecord('tabu')`
  (`p:<a digit a card>`, `pointsOf`), the run in `sg-tabu-now`; after the day free cards by theme (`sg-tabu-themes`), stats, share and
  the hub's meta line (`tabuMeta`); the vine counts it. „ჰიბრიდული“ (`tabu/Teams.tsx`, `TabuTable`, kept in `sg-tabu-teams`, settings
  `sg-tabu-table`): 2–6 teams, the explainer's phone shows the card to them and to a watcher of the next team; გამოიცნო +1 · აკრძალა −1 ·
  გამოტოვება −1 or 0; 60/90/120 s; 10/20/30 points; the turn's list can be mended before its points; the winner at the round's end
  (`tabuWinner`). „ერთი მინიშნება“ (`utils/minishneba.ts` + test, `pages/games/minishneba/`): thirteen cards (`JO_CARDS`), one try a
  word: right +1, wrong loses the next card too (the last: a won one), „არ ვიცი“ only this one (`judgeGuess`), the original's scale
  (`joVerdict`). Alone (`Solo.tsx`; `sg-minishneba-run`, `-seen`, `-best`): the clues are a card's forbidden words with the last one or
  two struck as „the same“ (`newJoRun`). The class (`Table.tsx`, `JoTable`, `sg-minishneba-table`): 3–8 names, one phone goes round —
  each giver opens the word and writes a clue in secret, the same ones and parts of the word strike themselves (`judgeClues`, `baseOf`:
  plural and last vowel off), the givers then check the notes and strike by hand what the app missed (`strikeClue`, `off`, `notesOf`),
  the phone goes to the guesser, a reveal can be mended (`mendGuess`). Kits: `nu-itqvi.js` (14 sheets: the 180 cards 47×66 mm,
  sixteen a sheet, + 12 blank, a score sheet, an example card on the cover) and `erti-minishneba.js` (11 sheets: 60 cards of five
  numbered words — 300 nouns hand-picked from the „ამიხსენი“ bank, five themes a card, the build stops if one leaves the bank —, 3
  blank, eight A6 clue boards whose back is the board turned down, a score sheet of ten games with the scale).
- **„პანტომიმა“** (2026-11-01, like Charades; mapItem `pantomima`, the hub opens its tab by `requestOpen('pantomima', 'online' |
  'table')`; rules `utils/pantomima.ts` + test, screens `pages/games/pantomima/`): 150 words in eight themes (`data/pantomimaCards.ts`
  `PANTO_THEMES`, each with the verb that says how it is shown — დაუკარი, იცეკვე, გადაიქეცი, ითამაშე, იმუშავე, ჩაიცვი, მიირთვი,
  გაითამაშე; written by Claude, unchecked — the page says so; no saint to act). Online = a quick-games room (`pantomima` in
  `ROUND_GAMES`/`ROOM_GAMES`/the rules' list/the Worker's titles): the host is the actor in the room's call, the word only on their phone
  (the face's new `Secret` hook — RoundsHost shows it under `Ask`, since `publicView` hides `secret` fields from the host too), the
  players pick it out of four of its theme (`drawPantomima`, `PANTO_RULES`: 60 s, 1000…500 by speed; `talk` = the little ones' way, set
  by the host's draw). Device keys `sg-pantomima-themes` / `-talk` / `-seen` (`pantomima/store.ts`). „ჰიბრიდული“ = `PantomimaTable`
  (`Table.tsx`, kept in `sg-pantomima-game`, settings `sg-pantomima-table`): 2–6 teams, 1/1.5/2 minutes, 1–3 rounds; the actor holds the
  phone („გამოიცნეს“ / „გამოტოვება“), or „შუბლზე“ — a 3-2-1 lead, then the word huge on a full-screen face (`Forehead`, z-75), a nod
  down = guessed, up = skipped (`facingOf` = cos β · cos γ, the screen's up-component in both ways of holding; `readTilt` with
  hysteresis, armed only once the phone stands; iPhones ask `DeviceOrientationEvent.requestPermission` in the tap), the screen's halves
  tap the same; the turn's list can be mended before its points; a skip costs nothing. Its kit (`pantomima.js`, 12 sheets): the 150
  cards 47×66 mm, sixteen a sheet (the verb in the theme's band, the word big, two words on two lines) + 10 blank, the theme on the
  back's strip, a score sheet (12 rounds × 6 teams, the app's settings to tick) and rules with the forehead and little ones' ways and
  the customary signs.
- **„ვინ ვარ მე?“** (2026-11-01, like Guess Who? and Headbanz; mapItem `vin`, the hub opens its tab by `requestOpen('vin', 'online' |
  'table')`; rules `utils/vin.ts` + test, screens `pages/games/vin/`): 50 famous Georgians in `data/vinPeople.ts` (all deceased; sex,
  birth year, kinds, the lari note, 4–5 facts — written by Claude, unchecked, the pages say so; ids stay). 19 ready yes/no questions
  (`VIN_QUESTIONS`: 12 „who“ from the kinds + 7 „born before“ `VIN_YEARS`, none anybody's year). Alone (`Solo.tsx`): the day's person
  for the whole school (`hiddenOfDay`, each once in a round of 50 days) among 24 names (`dayRun`; `boardFor` leaves out the hidden
  one's twins — people every question answers alike), the questions in a sheet, each answer greys the board out (`ruledOut`), a name
  tapped is a guess and a question too, 20 at most; the record `students.games.vin.days[iso]` through `useDailyRecord('vin')` —
  `guesses` = the asked `q:<id>` / `g:<person>`, so the day goes on on any phone; then free games of 24 or all 50 (`sg-vin-free`),
  stats, share, the hub's meta (`vinMeta`); the vine counts it. „ჰიბრიდული“ (`Table.tsx`, kept in `sg-vin-game`, settings
  `sg-vin-table`): 2–6 teams, 1–3 rounds, a turn's clock none / 2 / 3 min (`VIN_SECONDS`); the guesser's back to the screen or the phone
  on the forehead, the class sees the name and the facts and answers; „+1 კითხვა“, „გამოიცნო!“ (the guess is the last question),
  „კითხვა −1“, „ვერ გამოიცნო“; 3 points within 5 questions, 2 within 10, 1 within 20 (`vinPoints`); a phone on its side gets the
  controls in one row and the facts in two columns (`useShort`). Its kit (`vin-var-me.js`, 9 sheets): 50 cards + 4 blank, nine a
  sheet — the name, role, birth, facts and the yes-tags all on the front (the back faces the guesser) —, the board of „ვინ
  ჩაიფიქრა?“ (two players: a row a person, the tags as dots in the questions' columns, so a „no“ crosses out a column), the question
  counter (twenty circles a turn in the points' colours) and the rules of three games (forehead, the duel, „ფაქტებით“ 5…1).
- **„საიდუმლო სახელები“** (2026-11-01, like Codenames; mapItem `saidumlo`, the hub opens its tab by `requestOpen('saidumlo', 'online' |
  'table')`; rules `utils/saidumlo.ts` + test, screens `pages/games/saidumlo/`): 25 words on a board, a hidden key says whose each is.
  Alone (`Solo.tsx`): the app is the captain — the day's board for the whole school (`soloOfDay`) gives four clues one after another,
  each a group of „ოთხეული“ with its count („მწერლები და პოეტები · 3“, sizes 3·3·2·2); `buildSolo` keeps the songs' and chants' title
  groups off the board (`TITLE_FAMILIES`), puts on it no other word of a clue's group, one group of a family, and no word whose stem the
  clue's name holds (`stemIn`: „სიკეთე“ in „ქართველის სიკეთეები“) — fifteen other groups' words around them, one the trap. A word of a
  later clue counts too, four misses or the trap lose; ★★★ without a miss. The day's record `students.games.saidumlo.days[iso]`
  through `useDailyRecord('saidumlo')` (`guesses` = the words touched), then free boards (`sg-saidumlo-free`), stats, share
  (`saidumloShare`), the hub's meta (`saidumloMeta`); the vine counts it. The class (`Table.tsx`): one phone (or the class's screen) is
  the board of a four-digit code (`boardOfCode` over `data/saidumloWords.ts` = the „ამიხსენი“ bank's one-word cards but songs, saints
  and ancestors, ≤ 3 a theme; the key by `sidesFor`: the first team 9, the other 8, nobody's 7, the trap 1); the captains type the
  code in „კაპიტნის გასაღები“ on their own phones — the same words and key come up, nothing is sent (one phone only: 🔑 behind a
  confirm). A touch opens a word: a team's own keeps the turn, any other passes it, the trap loses (`tableView` over the moves);
  „სვლის დასრულება“, undo, a turn's clock none/1/1.5/2 min (`TURN_SECONDS`), wins counted across boards; kept in `sg-saidumlo-game`
  (✕ only pauses), settings `sg-saidumlo-table`; a phone on its side puts the teams and buttons beside a board that fills the height
  (`useShort`, the tiles' `size="fill"`). Its kit (`saidumlo-sakhelebi.js`, 9 sheets): 120 word cards 48×42 mm with a word on each
  side (240 words, every theme in turn, the word also upside down for the far side), 24 key cards with a key on each side (48, the
  app's `sidesFor`, half blue first, the frame in the first team's colour, ▲ = the row farthest from the captains), 27 covers (9 + 9
  of the teams — the first team takes nine —, 8 passers-by with one spare, the trap) and the turn card (blue / red); every colour also
  has its mark (waves, flame, footprints, a bolt) for a print without colour.
- **„უცხო სოფელში“** (2026-11-01, like Spyfall; mapItem `utskho`, the hub opens its tab by `requestOpen('utskho', 'online' | 'table')`;
  rules `utils/utskho.ts` + test, screens `pages/games/utskho/`): everybody knows the place but the stranger. 30 Georgian places in
  `data/utskhoPlaces.ts` (seven roles, five villagers' answers vaguest first, a note; `icon` = a lucide name of `UtskhoIcon`, the app's
  `PLACE_ICON` holds them all; written by Claude, unchecked — the pages say so; no answer holds its place's name — the test checks it;
  ids stay). Alone (`Solo.tsx`): I am the stranger — the day's place for the whole school (`placeOfDay`: each once in a round of 30
  days, `dayDeal` = it among 25 by name), the answers come one by one; 10 points, an answer more −1, a hint (`HINT_CUT` 4 places crossed
  out, three hints) −1, a wrong guess −2 (behind a confirm), three wrong lose (`soloView`, `soloStep` keeps only steps that do
  something). The day's record `students.games.utskho.days[iso]` through `useDailyRecord('utskho')` (`guesses` = the steps: `a`, `h`,
  `g:<place>`), then free games (`sg-utskho-free`), stats, share (`utskhoShare`: 💬💡❌✅), the hub's meta (`utskhoMeta`); the vine
  counts it. The class (`Table.tsx`, `UTable` kept in `sg-utskho-game`, minutes 6/8/10 in `sg-utskho-table`, names = `CircleNames`,
  3–12): the phone goes round — „მე ვარ X — ბარათის ნახვა“, the card (`SecretCard`: the place + a role or „უცხო!“, both alike from
  afar; on its side the icon beside the words), „დავიმახსოვრე“; the last card starts the clock (`dealNext`). Play: the clock, who asks
  first, every place listed, „ჩემი ბარათის ხელახლა ნახვა“; „ბრალდება“ stops the clock (who accuses — once a round, `accusers` —, whom,
  „ყველა თანახმაა“ or `accusationFailed`), „უცხო ვარ“ (who are you — only the stranger goes on —, the place, `guess`); the time over =
  the village's one vote or „ვერ შევთანხმდით“ (`timeout`); ✕ pauses the clock. Points as the original (`roundPoints`: the village 1
  each, the accuser 2; the stranger 2, or 4 for the place or an early wrong vote), the end shows every role, „შემდეგი რაუნდი“ never the
  same stranger twice running (`nextRound`), „დასრულება“ = the podium. Its kit (`utskho-sopelshi.js`, 18 sheets): 210 place cards
  63×52 mm (two places and one „უცხო“ a sheet, one back for all), eight A6 lists of the places, the score sheet (12 rounds × 8 players);
  the kit checks its points against `roundPoints` and stops the build if the app's ever change.
- **„ნახატობანა“** (2026-11-01, like Pictionary; mapItem `nakhati`, hub id `nakhatobana`; rules `utils/nakhati.ts` + test, the lines
  `utils/ink.ts` — a drawing as text: strokes on 1000×1000, colour + width digits, 4 base64url characters a point, ≤ 40 000 —
  drawn by `components/games/Ink.tsx` (`InkPad` with 7 colours + eraser, 3 widths, undo, clear, `aside` = the tools beside it on a
  phone on its side, `extra`; `InkView` still / `grow` / `replay`; `inkPng`), screens `pages/games/nakhati/`): 154 words in seven
  themes of 22 (`data/nakhatiWords.ts`, a note each, written by Claude, unchecked — the pages say so; no church thing to draw —
  the test checks it). Online = a quick-games room (`nakhati` in `ROUND_GAMES`/`ROOM_GAMES`/the rules/the Worker's titles): the
  host is the artist — the word only on their phone (`Secret`), they draw on the face's new `Tool` (RoundsHost renders it; it
  calls the room's new move `edit` → `editRound`: only the round asked now, same kind, valid) about once a second, the round's
  `ink` goes out in the view and grows on every phone; players pick the word out of four of its theme (`otkhiPoints`, 90 s); a
  round's rules may have `spent` (what it keeps once passed — nakhati drops its lines, so host/state stays small); the face's
  `hostLine` replaces the room setup's „წამყვანი“ line. „მარტო“ (`Riddle.tsx`): one of three words (`threeToDraw`) or one's own,
  drawn full screen, sent to a class chat as kind `draw` (`sendDrawMessage`: `ink`, `ans` = the word folded by `foldWord` — not
  secret, just not readable by chance —, `theme` = the theme's name; rules allow kind `draw` with those three fields' sizes) or
  saved/shared as PNG; the draft stays in `sg-nakhati-draft`. The chat shows it as `components/classes/DrawRiddle.tsx`: replay,
  a box a letter, a guess checked on the phone (`sameWord`: the word, or it without the last vowel), „ვნებდები“; what this phone
  guessed in `sg-nakhati-solved`; the tab also lists the classmates' drawings from the class chats (folded). „ჰიბრიდული“
  (`Table.tsx`, `NakhatiTable` kept in `sg-nakhati-game`, settings `sg-nakhati-table`): 2–6 teams, the artist draws on the board
  (the phone in the host's hand) or on the screen; peek → „სხვა სიტყვა“ → 60/90/120 s → „გამოიცნეს!“ / „ვერ“; after every
  circle, if chosen, „ყველა ხატავს“ (every team's artist, the same word, the host taps who guessed first); a turn's result can be
  mended; 2–4 circles. Themes, seen words: `sg-nakhati-themes` / `-seen`. Its kit (`nakhatobana.js`, 7 sheets): „სახატავი გზა“
  (56 squares, 7 a row, every row each theme once, ★ = „ყველა ხატავს“, start/finish), 22 cards of seven words — one a theme,
  shuffled with a seed — + 5 blank, six standing pawns in the app's team colours, a die net, drawing frames, the rules.
- **„საგალობო ლოტო“** (2026-11-01, like Bingo; mapItem `loto`, hub id `sagalobo-loto`; rules `utils/loto.ts` + test, screens
  `pages/games/loto/`): a card of nine names three by three (`cardOf(seed, seat, n)`: the least used names first, every card a
  different set; `LINES` = 8, `linesOf`, `lineCells`, `toLine`). Online = a quick-games room (`loto` in `ROUND_GAMES`/`ROOM_GAMES`/the
  rules/the Worker's titles): 13 rounds, every name once (`lotoRounds`); a seat's card comes from the round's seed and the seat, and
  the marks ride on from round to round inside the round itself (the rounds engine's new `carry`; `points` now gets the seat): a
  pick on my card = 100 + up to 100 by speed, each new line +300 („საგანძური!“), `NOT_MINE` = „ჩემს ბარათზე არ არის“. The face's new
  `keepPick` keeps the card on the phone after sending; `Reveal` and `verdict` get the seat, `Reveal` the names (the host: who
  closed a line, who is one short). Decks (`loto/decks.ts`, `sg-loto-deck`): chants — the pearls' known chants without
  `PLAIN_OPENINGS` (`data/lotoKit.ts`: openings on a reciting tone cannot be told by their sound — `plainOpening`, the test checks
  the list against the notes), the class program's first — on the synthesizer, 16 s from the start; songs and regions only while
  the recordings may be heard. „მარტო“ (`Solo.tsx`, `newLotoSolo`/`soloAnswer`): my card against the deck in a random order, a wrong
  tap erases my last mark and puts it back, a piece of mine let pass comes again; the run in `sg-loto-solo`, the best time per deck
  `sg-loto-best`. „ჰიბრიდული“ (`Table.tsx`, `LotoTable`, kept in `sg-loto-table`): one phone plays; printed cards (`kitCards`: 30
  cards over `LOTO_KIT`'s 20 chants, seed `KIT_SEED` 1501 — never reorder that list) are checked by their number (`checkKitCard`),
  own cards by the names tapped (`checkNames`); the wins with undo. On a phone on its side the card stands beside the rest
  (`Card.tsx` `side`, `useShort`, `CARD_SIDE`). Its kit (`sagalobo-loto.js`, 10 sheets): the 30 cards 98×90 mm six a sheet (each
  name with its service's colour, the number behind), the host's list of the 20 openings on staves, 20 slips to draw, „რა ჟღერდა“
  (four games a side: the order written by each chant — a line counts when its three names have numbers), six blank cards.
- **„საგანძურის ძებნა“** (2026-11-04, the plan's №5, like Geocaching; mapItem `dzebna`, its own tabs in `DzebnaGame.tsx` — the hub
  opens one by `requestOpen('dzebna', 'online' | 'table')`; rules `utils/dzebna.ts` + test, pools `data/dzebnaPools.ts`, screens
  `pages/games/dzebna/`): stations with a task each — კითხვა („ოთხიდან ერთი“'s), კუთხე („რუკის ვიქტორინა“'s places), დრო (the earliest
  of three „დროის ხაზი“ cards), ხუცური (a „სამი დამწერლობა“ word in old letters), მოისმინე (a chant's opening on the synthesizer) — a
  letter for each solved, scrambled (`letterOrder`); the word (`huntBank`, 4–8 letters) opens the chest (`chestCheck`: whose word /
  right letters, other order / none). „ონლაინ“ (`Solo.tsx`) = the day's hunt for the school (`soloHunt`: six regions found on the map
  by three clues, then their tasks; misses cost 10/15/10 s, the clock pauses while hidden), record `useDailyRecord('dzebna')`
  (`t:`, `x:`), free hunts after, the vine counts it. „ჰიბრიდული“ (`Table.tsx`): the teacher's phone sets it up (`Setup.tsx`: 4–8
  stations, 1–6 teams, kinds, hiding places ≤ 40 letters) — the hunt is an eight-digit code (`huntCode`, two check digits), so every
  phone works out the same tasks, team words and letters and nothing is sent; „ბარათები (PDF)“ is made in the browser (`cards.ts`:
  QR cards `/?open=dzebna&h=&s=&n=<next place packed>` read by App.tsx, team slips, the key); the teacher's phone is the chest
  (`Chest.tsx`: clock, arrivals); a scanned card opens its station on a team's phone (`Station.tsx`: team picked once, 15 s wait after a
  miss) — team phones must be signed in, the games are members'. Kit `sagandzuris-dzebna.js` (8 sheets): four hunts of six stations
  in four colours (fixed seeds, no chant; an answer's letter = the station's letter of the word, the wrong ones' letters the word
  has not; an old word's key ≤ 12 letters), six 96×90 mm cards a hunt with a line for where the next hides, team sheets for any hunt,
  the key, the chest's sign and arrivals.
- **„ეზოს მსაჯი“** (2026-11-04, the plan's „ეზოს მსაჯი“, like Capture the Flag; mapItem `ezo`, hub id `ezos-msaji`, the hub opens
  its tab by `requestOpen('ezo', 'online' | 'table')`; rules `utils/ezo.ts` + test, texts `data/ezoGames.ts`, the fields' drawings
  `utils/ezoFields.ts` (one SVG for the app and the kit), screens `pages/games/ezo/`): the teacher's phone referees five yard games —
  ორდროშობანა and ლელობურთი (two teams on a clock), დამალობანა, ზღვა ღელავს (everybody for themself), კლასობანა (one at a time). The
  plan named four; ქალაქობანა (a word game elsewhere in the plan) and „ვისი სული გსურს“ gave way to the last three. Texts written by
  Claude, unchecked — the pages say so; ids stay. „ონლაინ“ (`Rules.tsx`) = each game's rules with its field, the whistle's signs
  (`EZO_SIGNALS`, ▶ plays each — `whistle(ctx, 's' | 'l' | …)` in `utils/gameSounds.ts`) and a quiz of ten (`quizDeal`: one of each
  game at least; best in `sg-ezo-quiz-best`). „ჰიბრიდული“ (`Referee.tsx`) = the referee: names by `CircleNames` (its new `label`), teams
  split fairly by the season (`splitTeams`: snake order by `strengthOf`, a player moved by a tap; „რევანში“ keeps them —
  `keepTeams`); a match (`Match.tsx`, `EzoMatch` in `sg-ezo-match`, ✕ only pauses): 3-2-1, the long whistle, +1 a team with two
  short ones, the last minute shown, the time or an early end whistles three and records the round; hide and seek (`Seek.tsx`): the
  phone counts 20/30/50 aloud with the seeker, a long whistle, 3/5/8 minutes, two long = „ყველა შინ!“, each hider tapped found /
  home, the not found win, the first found seeks next; the sea (`Sea.tsx`): `seaWaves` 6–18 s (`seaStop`), „გაშეშდი!“ with a theme
  of `EZO_FIGURES` (never the last one twice), 10 s still, the best statue wins and leads next; hopscotch (`Turns.tsx`, `EzoTurns` in
  `sg-ezo-turns`: ten classes, „შეცდა / გაიარა“, undo). The class's season (`Season.tsx`, `sg-ezo-season`): a win 3, a draw 1, every
  member of the winning side wins (`standings`), the last line can be undone, „ახალი სეზონი“ asks first; settings `sg-ezo-conf`, the
  tab `sg-ezo-tab`. Nothing in Firestore. Its kit (`ezos-msaji.js`, 7 sheets): the cover with the referee's page (signs, fair teams,
  disputes), a page a game (field, what to bring, how to play, who wins, safety; the sea's 18 themes, a hopscotch tracking table),
  the rules quiz (12, answers upside down), 32 team cards drawn from a bag (8 blue + 8 red a sheet, numbered, one back), the
  season's wall table (30 names × 12 games) with the match sheet (two matches) behind it.
- **„მეფის კარი“ on phones** (2026-11-04, the printed Coup №6 gets its app variants; mapItem `kari`, its entry in `GAMES` has `item`,
  the hub opens its tab by `requestOpen('kari', 'online' | 'table')`, tab `sg-kari-tab`; rules `utils/mepisKari.ts` + test, screens
  `pages/games/kari/`): the kit's five courtiers (`ROLES`: ხაზინადარი = Duke, მანდატური = Assassin, სპასალარი = Captain,
  მსახურთუხუცესი = Ambassador, დედოფალი = Contessa) and seven actions (`ACTS`, the original's costs; 10 თეთრი = a must coup), 2–8
  players, a deck of 15 (20 from 7). One engine for both: a claim opens a doubt window, then a block, a doubt on the block, then the
  result (`declare`, `doubt`, `block`, `letGo`, `lose`, `keep`); the chronicle `Line` (≤ 40). „ონლაინ“ = a room of its own engine
  (`utils/kariRoom.ts` `KARI_ROOM` over `createRooms`; `kari` in `ROOM_GAMES`/the rules/the Worker's titles; store `kariRooms` /
  `useKariRoom` in `gameRoomFirestore.ts` beside `rooms` and `roundRooms`): the host's phone holds the deck and the hands, a seat
  (`kariSeat`) gets only its own cards, the view only how many each has and the turned ones (all at the end). The host may play too
  (the lobby's „მეც ვთამაშობ“; the rules let the host write its own join and acts; a new room's opener joins by itself). Every step
  has a clock (`KARI_SECS`) and the host's phone answers for the late (`timeUp`: let go; income, or the coup at 10; the first card;
  the old cards); the bluff is in the room's call. „ჰიბრიდული“ = the printed cards in hand, one phone keeps the coins, the turns and
  the order (`paper: true`: hands unknown, a doubt asks „აჩვენა?“ — phase `proof` —, the host taps the card turned), kept in
  `sg-kari-table` (✕ only pauses, an ended game is not kept), who starts in `sg-kari-conf`. Screens: `Court.tsx` (a tile a player,
  the step's story `storyOf` — second person for „შენ“), `Pads.tsx` (the actions, the step's clock, `sg-kari-hide` hides my cards,
  a tap peeks 4 s), `Play.tsx` (online), `Table.tsx` (hybrid), `Room.tsx` (lobby), `look.tsx` (colours, icons, cards, chronicle).
  Not yet tried by real people on several phones.
- **„ლურჯი სუფრა“ on phones** (2026-11-04, the printed Azul №5 gets its app variants; mapItem `lurji`, its entry in `GAMES` has
  `item`, the hub opens its tab by `requestOpen('lurji', 'online' | 'table')`, tab `sg-lurji-tab`; rules `utils/lurjiSupra.ts` +
  test, screens `pages/games/lurji/`): the kit's words and its apprentice side — 100 stamps of five ornaments (`ORN_NAMES`, the
  kit's own drawings in `lurji/ornaments.ts`), 2–4 players or teams, 5/7/9 trays (`traysFor`), the meidan with the უსტაბაში token,
  five lines, the wall `ornAt(r, c) = (c − r) mod 5`, the dye −1 −1 −2 −2 −2 −3 −3 (`FLOOR`), the bag refilled from the lid. A
  take (`take`) = all of one ornament from a tray (the rest to the meidan) or from the meidan (the day's first takes the token),
  onto a line from the right or straight onto the dye; the evening prints, scores (`pointsAt`) and charges the dye; the evening a
  row is full ends it with +2 a row, +7 a column, +10 an ornament (`bonusOf`), a tie → more full rows, else shared. „ონლაინ“ = a
  room of its own engine (`utils/lurjiRoom.ts` `LURJI_ROOM`, no seats — nothing is secret; `lurji` in `ROOM_GAMES`/the rules/the
  Worker's titles; `lurjiRooms` / `useLurjiRoom` in `gameRoomFirestore.ts`, whose visible-room hooks loop over the four stores,
  `STORES`): the host may play („მეც ვთამაშობ“), a take is the act's `pick` (`takePick`), 75 s a take, then the phone takes for the
  late one (`autoTake`: fewest spilt, most laid, lowest line), the evening's report stays 14 s (`LURJI_SECS`); „კიდევ ერთხელ“ starts
  with the player after the winner. „ჰიბრიდული“ (`Table.tsx`, kept in `sg-lurji-table`, who begins in `sg-lurji-conf`, names =
  `CircleNames`) = one phone passed round or lying in the middle: it lays the trays, prints and counts; „უკან“ takes back a take
  of the same day; ✕ only pauses. Screens: `Play.tsx` (`LurjiPlay`: the story card, trays + meidan, my board big with the legal
  lines ringed and the take's ghost, the others small; a phone on its side or a computer = two columns), `look.tsx` (`Stamp`,
  `Trays`, `Meidan`, `Loom`, `useCell`), `Room.tsx` (lobby, the step's clock). Not yet tried by real people on several phones.
- **„ორი ტახტი“ — our own game (2026-11-04; the printed №4 was a 7 Wonders Duel, now rebuilt on its own rules)**: mapItem `takhti`,
  its entry in `GAMES` has `item` and no `like`, the hub opens its tab by `requestOpen('takhti', 'online' | 'table')`, tab
  `sg-takhti-tab`; cards `data/takhtiCards.ts` (42: 12 castles of 1–3 points, 9 warriors of strength 1–3, 5 vines + 5 vessels, 6 books,
  5 envoys; notes by Claude, unchecked; ids stay), rules `utils/oriTakhti.ts` + test, screens `pages/games/takhti/`. Seat 0 = west
  (ქუთაისი), 1 = east (თბილისი); eight meetings (`ROUNDS`): five cards turn up (`OFFER`), the divider splits them into two shares (one
  card at least each — `split`, a bit a card), the chooser takes one, the divider the rest; an envoy takes one card (not an envoy)
  from the other share for its king — the chooser's envoys first, then the divider's; the roles change every meeting; 40 cards are
  laid, 2 stay in the box. The count (`scoreOf`): a castle its points, the stronger army `ARMY_PTS` 8 (a tie `ARMY_TIE` 4 each), a vine
  with a vessel = a wine of `WINE_PTS` 5, a book as many points as the court's other kinds; a tie → the army's strength, then the
  castles. One number a move (`applyPick`); `botPick` = the careful move (bot against bot 199:201 over 400 seeds). „ონლაინ“ = a room of
  its own engine (`utils/takhtiRoom.ts` `TAKHTI_ROOM`, no seats: all is open but the deck — `publicOf`; `takhti` in `ROOM_GAMES`/the
  rules/the Worker's titles; `takhtiRooms` / `useTakhtiRoom`): exactly two play, the host may be one; a step's clock (`TAKHTI_SECS`:
  split 90 s, choose 60, an envoy 40), then the host's phone moves (`timeUp` → `botPick`). „ჰიბრიდული“ (`Table.tsx`, kept in
  `sg-takhti-table`, names + who divides first in `sg-takhti-conf`) = one phone between the kings; „უკან“ only within the meeting
  (`canBack`). Screens: `Play.tsx` (the story with the eight meetings, the shares with what each would give both kings now —
  `gainsIf` —, the courts kind by kind, the results, the chronicle `lineText`; two columns on a phone on its side or a computer —
  `components/games/useTwoCols.ts`), `look.tsx`, `words.ts` (`KIND_INFO`: names, colours, one-line rules — the kit's too). Its kit is
  drawn in the browser (`takhti/printKit.ts`, see „Kits drawn in the browser“). Not yet tried by real people on several phones.
- **„ქარავანი“ — our own game (2026-11-04; the printed №3 was a Ticket to Ride, now rebuilt on its own rules the same day)**: mapItem
  `qaravani`, its entry in `GAMES` has `item` and no `like`, the hub opens its tab by `requestOpen('qaravani', 'online' | 'table')`,
  tab `sg-qaravani-tab`; the page is `React.lazy` in GamesPage — its map is ~95 KB. The board is the kit's own:
  `node scripts/build-qaravani-map.mjs` writes `data/qaravaniRoutes.ts` (47 cities with their worth 1–5 and cargo, 74 roads, for the
  rules) and `data/qaravaniMap.ts` (the drawing from the kit's `appMap()`: land, rivers and peaks, the passes, the print's names, the
  worth circles, the goods' marks) — never edit them by hand, run it again after the kit's map changes. Rules `utils/qaravani.ts` +
  test (no cards, no letters): each house places its first caravanserai in reverse order (the first house last) in a town of worth
  ≤ `START_MAX` 2 with no caravanserai in it or next to it; a turn = three dice (`DICE_N`), an abazi moves one die by one (1–6, as
  often as one has them), then a caravanserai (`INN_COST` 3, in a city of one's caravan, `INNS` 3 a house with the first) and one
  road whose cells some one, two or three dice add up to (`sumsOf`, `diceFor`; a mountain road wants a pair among the dice, a water
  road a six — `hasPair`/`hasSix`), touching one's caravan unless no free road does (`joins`, `netOf`) — or a trade (+`TRADE` 2). A
  guest's road into another's caravanserai city gives its owner +`GUEST` 1; a double road is never one house's twice, with ≤ 3 players
  one lane only (`roadOpen`). Journeys `roundsFor` 12/10/9/8, carts `cartsFor` 20/18/16/15 for 2/3/4/5. The end (`scoreOf`,
  `holdersOf`, `resultOf`): a city's worth to the house with most weight there (roads + `INN_WEIGHT` 2 a caravanserai; a tie shares it,
  rounded down), the kinds of cargo one's net reaches by `CARGO_PTS` (1, 3, 5, 8, 11, 15, 20, 25), `INN_PTS` 2 a caravanserai; a tie →
  more cities, then more abazi. The dice fall on the game's seed, so a move (`tweakPick`, `TRADE_PICK`, `claimPick`, `innPick`) is
  pure; `botPick` = the careful move, `timeUp` plays it for the late. „ონლაინ“ = a room of its own engine (`utils/qaravaniRoom.ts`
  `QARAVANI_ROOM`, no seats — nothing is secret; `qaravani` in `ROOM_GAMES`/the rules/the Worker's titles; `qaravaniRooms` /
  `useQaravaniRoom`): 2–5 play, the host may be one („მეც ვთამაშობ“; a new room's opener joins by itself), the rest watch; a turn's
  clock (`QARAVANI_SECS`: 60 s a start town, 75 a turn — an abazi does not stop it), then the host's phone moves. „ჰიბრიდული“
  (`Table.tsx`, kept in `sg-qaravani-table`, who begins in `sg-qaravani-conf`, names = `CircleNames`) = one phone in the middle of the
  table, the printed board beside it if one likes; „უკან“ only for a move that rolled nothing new (`canBack`); ✕ only pauses. Screens
  `pages/games/qaravani/`: `Map.tsx` (pinch, drag, ctrl+wheel, + / − / ⤢; a tap picks a road or a city; every city's worth in its circle
  and its cargo beside it, the roads in their owners' colours, a ring round each city in the colour of who would take it now; names as
  12 px screen labels that give way to each other — my caravan's first —, from 2.5 px a mm the print's own), `Play.tsx` (story, the
  dice — a gold mark on a die's ± says how many new roads it opens —, the roads the dice open with what each brings, the caravanserai
  to build, my caravan's points and cargo now, the houses, the chronicle, the results with every city counted; a phone on its side or
  a computer = two columns, the map sticky), `Sheets.tsx` (`RoadSheet`, `CitySheet`: what a road or a caravanserai would add, or why
  not), `look.tsx`, `Room.tsx`. Not yet tried by real people on several phones.
- **„ოქროს ხანა“ — our own game (2026-11-04; the printed №1 was a Catan, now rebuilt on its own rules)**: mapItem `okros`, its entry
  in `GAMES` has `item` and no `like`, the hub opens its tab by `requestOpen('okros', 'online' | 'table')`, tab `sg-okros-tab`; rules
  `utils/okrosKhana.ts` + test, screens `pages/games/okros/`. The board is the songs map's 13 regions (`KUTKHE_REGIONS` order,
  neighbours `NEAR` from `KUTKHE_NEAR`), each giving one good (`REGION_GOOD`: ხე, ქვა, პური, ღვინო, ოქრო; Tbilisi = the market, any
  two). A turn: ride up to `RIDE` 2 steps or stay, gather where you stop (`BASE` 2, +1 for one's estate there, +1 when the king is
  there; a hand holds ≤ `HAND_MAX` 10), then one deed or none — an estate (ხე + ქვა + პური → 2; `PLACES` 2 a region, one a house, not in
  Tbilisi, `ESTATES` 5 a house), goods for the open work here (`WORKS`: 12, one a region but Tbilisi, notes written by Claude,
  unchecked; a good = 1, 2 with the king; who fills the last box takes the card and its bonus +2…+4, a new one is drawn; `OPEN_WORKS`
  3 open) or a feast at one's own estate (პური + ღვინო → 3, 5 with the king; every other rider there +1). A year = everyone once,
  then the chronicle's next card moves the king (12 cards, regions 0–11); 2 houses play 12 years, 3 — 10, 4 — 9 (`yearsFor`), or
  until no work is open; ties → works, then estates. One number a move (`ridePick` — Tbilisi `TBILISI_PICK` + its two goods —,
  `PASS_PICK`, `BUILD_PICK`, `FEAST_PICK`, `givePick` = the counts in base 4); `botPick` = the careful move (`bestRide`,
  `bestDeed`). „ონლაინ“ = a room of its own engine (`utils/okrosRoom.ts` `OKROS_ROOM`, no seats — nothing is secret; `okros` in
  `ROOM_GAMES`/the rules/the Worker's titles; `okrosRooms` / `useOkrosRoom`): 2–4 play, the host may be one („მეც ვთამაშობ“), a
  step's clock (`OKROS_SECS`: 75 s a ride, 60 a deed), then the host's phone moves (`okrosTimeUp` → `botPick`). „ჰიბრიდული“
  (`Table.tsx`, kept in `sg-okros-table`, who begins in `sg-okros-conf`, names = `CircleNames`) = one phone in the middle of the
  table; „უკან“ takes back a move that showed nothing new; ✕ only pauses. Screens: `Board.tsx` (the map: each region's mark, its
  estates' places, the riders, the crown, the open work's castle; while a house rides, the regions it may reach stay bright and
  take a tap), `Play.tsx`, `Room.tsx`, `look.tsx` (the goods' and houses' colours and marks, shared with the kit). Its kit
  (`okros-khana.js`, 16 sheets) reads the numbers, works and names from the app: a 56×39 cm board of four A4 pieces (the regions
  in their goods' tints, each with a plate — the work's castle place, two estate places, the good's mark, the name —, a footprint
  on every border (`crossing`; crowded ones placed by hand, `CROSS_AT`; the build stops if a plate lies across a seam or a
  footprint under a plate), the years' track, the turn panel, the points track 0–49), 12 work cards A6, 12 chronicle cards with
  the houses', the first house's and the market's cards, 4 aid cards A6, 110 goods' chits, estates, markers, five folded figures,
  four rule pages (page 1 sums up a turn and the board's marks) and a box label. Not yet tried by real people on several phones.
- **Printable board games (2026-10-28, fourth PR)**: the სამაგიდო variant (was „უტელეფონო“) of the six board games (plan doc tab „6 სამაგიდო
  თამაში“) as A4 sheets, made by the button since 2026-11-04 (see „Kits drawn in the browser“) — HTML pages; shared pieces in
  `src/print/lib.js` (Noto Georgian fonts in `public/fonts/print/`, 3×3 sheets of 63×88 mm cards with crop marks,
  backs mirrored for long-edge duplex, ⌀25 mm token sheets, series stripe „საგანძურის თამაშები №N“, lucide icons as SVG), one module per
  game in `src/print/games/`. Every file prints „ყველაფერი ორმხრივად“: a module lists its physical sheets
  (`{ key, front, back? }`), `duplex()` makes each sheet two pages (a missing back = a labelled blank page) and the cover names
  sheets by number (`sheetNo`). Portraits are ornament placeholders until the user approves Gemini pictures. Built so far:
  „მეფის კარი“ (№6) and „სამშვილდის ღამე“ (№2); then (fifth PR) „ოქროს ხანა“ (№1 — since 2026-11-04 the school's own game, see
  „ოქროს ხანა“ above) and „ლურჯი სუფრა“ (№5, Azul in Erekle II's Tbilisi: 105 stamps of 20 mm on one sheet whose back
  is one indigo field, four A4-landscape boards turned onto portrait pages — apprentice / master side, trays ⌀90 mm, the უსტაბაში
  token tile-sized to fit a floor place); then (sixth PR) „ორი ტახტი“ (№4 — since 2026-11-04 the school's own game, its kit drawn in the
  browser, see below) and „ქარავანი“ (№3, since 2026-11-04 the school's own
  game — see „ქარავანი“ above; 16 sheets: a 78×56 cm map from eight one-sided A4 pieces — 47 hand-placed cities with their worth and
  cargo, 74 roads (13 mountain, 4 ship, 8 double; the 1872 railway between the doubles, only to look at), the app's region shapes,
  coast, rivers and ridges bent onto the cities by a thin-plate spline; `boardItems()` keeps each piece's bounding box so a printed
  window draws only what it shows; five help cards (a turn in front, the end's points behind), „პირველი ქარავანი“ (the journeys'
  track, its golden stops by the number of players), three cargo maps, 22 carts and four caravanserais a house, the animals as score
  markers, 55 + 11 abazi, three dice nets, a score sheet with every city west to east, four rule pages with figures and an example the
  build counts by the app's `scoreOf` (it stops if the rows don't add up); the cover's back is a glossary of the 47 places).
  A game with sheets gets `print: kit('<id>', sheets)` and `noPhone` in its `modes` in `data/games.ts`; its hub card shows the
  „სამაგიდო · PDF“ button that makes it.
  The app's word games got paper kits too (seventh PR): „დღის სიტყვა“ (grids for 4/5/6 letters, four A6 a side; 78 slips from
  `ANSWER_BANK`; the example coloured by `scoreGuess`), „ოთხეული“ (16 grids of 16 cards = the app's `buildGrid` with fixed seeds,
  kept only when every group of the list allows one answer, with variety rules; the host's answer sheet) and „ამიხსენი“ (45
  cards of six words numbered by a die — fifteen themes, three cards each, the songs only well-known titles — and a two-sided score sheet). Their
  modules import the app's own data;
  their stripe shows a label („ქართული · უტელეფონო“) instead of a number. „რა? სად? როდის?“ has one too (12 sheets): 72 question
  cards = the first four of each of the 18 topics (question in front, answer + note on the back), 9 blank cards, a two-sided score sheet
  (18 questions × 6 teams) and 24 answer slips — so keep the first four of every topic print-worthy. „ოთხიდან ერთი“'s (2026-11-04,
  `otkhidan-erti.js`, 12 sheets): 76 question cards — four a topic of its 19, the first that fit a card (≤ 110 letters, answers
  ≤ 26) and are not on „რა? სად? როდის?“'s cards — with ა ბ გ დ in the app's colours in front (the right one's place by seed 4041,
  each letter once a topic) and the right letter, answer and note behind; 5 blank cards, six square team cards (four coloured
  corners — the letter held at the top is the answer; the back shows the same letters where they are from behind, ბ left and დ
  right) and a score sheet. Both kits' topic colours and icons: `src/print/quizLook.js`.
  „გათვლა“'s (2026-11-04, `gatvla.js`, 4 sheets): the app's three rhymes with every word's beat numbered and where the last word
  lands in circles of 2–12 (`countOut`) + three frames for the class's own; „ვისი ჯერია?“ = wheels of 12 and 24 places spun with a
  paper clip on a pencil point and the fair-turns sheet (30 names, a box a turn — a pick with more boxes than the fewest spins
  again); 64 team tokens ⌀23 mm (four colours, each with its mark, 1–16) and 8 ★ „იწყებს“ to draw from a bag.
  „ცხელი ჩურჩხელა“'s (2026-11-04, `tskheli-churchkhela.js`, 6 sheets): the app's 25 tasks (`TASKS`) as cards + 2 blank, the backs
  in the kind's colour (a host may draw from one pile), four two-sided 20 cm paper churchkhelas (the app's drawing at 0.95 mm a
  unit, a tab with a hole for a thread, cut round by `halo` of `dolls.js`) with what a churchkhela is behind, and the tally
  „ვინ დაიწვა?“ (20 rounds, both sides) with the stop by a die thrown in secret (× 5 s, × 3 for the little ones).
  „მარგალიტები“'s (2026-11-04, `margalitebi.js`, 12 sheets): every pearl's three phrases note for note the app's (`phraseOf`'s count
  over `lineOf`; a voice over 26 notes on two lines — `abcOf`'s new `breaks`), a chest's twenty flowed over its five pages by the
  print's script (each staff's box trimmed to what abcjs drew; the build stops if a chest needs more), each chest's class table (a
  circle a voice, ★ golden), 70 tokens ⌀25 mm (three rows a chest with a spare, a row of spares), „ჩემი სკივრები“ to colour (both
  sides) and the rules: a team draws a token, the host sings the voice's phrase, the jury gives 2 (four notes of five — 80 %) · 1 · 0.
  The musical games' kits (2026-11-01, stage 1; the host sings, so the melodies come from the book notes): `src/print/music.js`
  draws staves with abcjs inside the print page (`abcOf` one voice, every accidental written, numbered marks; `abcScore` three voices
  under each other on one clef, tied to keep time), `melodies.js` = the chants of the app's chant games + the program's songs with
  notes, `kitParts.js` = the shared score sheet and steps. „დღის ჰანგი“ (48 melodies, the host sings 2·3·4·6·8·11 notes), „სამ ნოტში!“
  (49 bidding cards: the clue in front, the staff behind), „ხმა-ხმად“ (24 chants in three voices with four answers, three singers),
  „საიდანაა სიმღერა?“ (a 39×28 cm map of the songs map's 13 numbered regions from two A4 pieces — racha's and samtskhe's labels moved
  off the seam — and 40 song cards from `FOLK_SONGS` by a quota per region, most recorded first, no title that names a region; the
  back = the app's reveal colours on a small map), „ქართული აკორდი“ (a guide a team — the nine kinds on the bass რე, the plainest four
  big on its back —, the host's four games of ten chords drawn by the app's rules with fixed seeds, three singers or a piano; chords by
  `abcChords`, `staff(abc, { zoom })` sizes one box) and „რვა ხმა“ (the eight tones' models, two heirmoi each, a sheet a child; the
  teacher's 24 more, three a tone, two games of twelve; every staff on the octave-down clef). The big region map of these two
  map kits is `src/print/regionMap.js` (`mapBoard`, `miniMap`, `regionKey`); „რუკის ვიქტორინა“'s kit = that map + 52
  place cards (four a region, the name in front, the region, a small map and the note behind), team and score sheets.
  „გააგრძელე!“'s kit = the host's book of 30 songs' words (recorded most first, ≤ 20 lines, four a region; two columns, a song
  never split — `heightOf` holds the print's measured heights) with ✋ at up to three lines to stop before, and a score sheet.
  „ოთხი ჰანგი, ერთი სიტყვა“'s kit = 54 cards, one per puzzle by word but the songs' titles (four clues by `sureClues` in front with
  the answer's boxes, the word and the group's other words for a +1 bonus behind; five topic colours, a book — no church picture —
  for the faith's words), team and score sheets.
  „ექო“'s kit = the host's book of 39 melodies (the app's own phrases, `eqoLine`: twelve even notes, numbered over the staff and
  named under it) + a circle sheet (a row a player, a column a phrase's length, ✓/✗); „მფრინავი ნოტები“'s = 34 note cards (every
  natural from two ledger lines under the staff to two over it, treble and bass; the answer, its place and octave behind, stars
  for the ledger lines) + two help cards, a poster of both clefs and six teams' name cards (the syllable in front, the letter
  behind). Both draw their staves with `src/print/staffSvg.js` (abcjs's signs from node_modules, the notes evenly
  spaced so a word fits under each — abcjs's own layout squeezed them; `clefFor` takes the treble or the octave-down clef,
  whichever needs fewer ledger lines).
  „ხმის წყვილები“'s kit = three Memory decks of 13 pairs, each back its own colour: ა a melody's opening on a staff (the host sings
  it) ↔ its name, ბ a note on the treble staff ↔ its key on a two-octave keyboard, named, გ each region's first song of „საიდანაა
  სიმღერა?“'s kit (`SONGS`, now exported) ↔ its region on the small map; each deck's 27th card is the host's key (ბ: the notes'
  guide), taken out before play.
- **Kits drawn in the browser (the user's rule, 2026-11-04: „შენ კი არ აკეთო პდფ … პდფ ღილაკი იქნება … იქ დააგენერირებს თავად“, for every
  kit since 19:14 — „რომ შენ მარტივად ცვალო მერე რაც გინდა“)**: no ready PDFs, no Playwright, no previews — the hub's „სამაგიდო · PDF“
  (`GameDef.print.make`, a lazy import; a game page's own button = `components/games/KitButton.tsx`) makes the kit on the phone and
  saves it („მზადდება… N%“). `takhti/printKit.ts` draws on canvases (7 sheets: rules, the 42 cards + two thrones + „ლიხის ქვა“, score
  boxes). The other 47 are the old print modules moved into the app: `src/print/games/<id>.js` → `{ title, css, head, script, pages }`
  (may import the app's modules, never a top-level await); `print/makeKit.ts` lays the pages out in a hidden frame (the fonts of
  `public/fonts/print/`, abcjs, the kit's `script`, then `fitScript`), turns each A4 page into an SVG picture of its own markup with the
  fonts inside, draws it at 200 dpi and gives the JPEGs to `utils/scorePdf.ts` `buildPdf` (`margin: 0`); a browser that refuses (old
  Safari) gets the frame's print window. A musical kit reads book notes at once (`music.js` `loadScore`): list them in `print/kits.js`
  `SCORES` (a missed one is fetched on the spot with a console warning). Icons by name: `src/print/icons.js`, made by
  `node scripts/print-icons.mjs` — run it after a kit names a new lucide icon. scripts/ tools read the app and the kits through
  `scripts/lib/appData.mjs` (esbuild in memory; `globalThis.__sgLoadScore` reads the notes files).
- **Our own games, not copies (2026-11-04)**: a board or party game is the school's own game in its genre — its own mechanics and
  Georgian content —, never a known game copied one-to-one under another name. „ოქროს ხანა“, „ქარავანი“ and „ორი ტახტი“ are rebuilt;
  then the user stopped (2026-11-04 18:56: no new games, no more reworks — ლურჯი სუფრა, მეფის კარი and the word and party games
  stay as built unless asked; next is a review of every built game and the hub page, after the user's OK on its cost). A genre's
  general idea (a daily word, a team quiz, a map to tap) may stay; the hub's `like` bracket names only a game ours still resembles.
- **The games' review (2026-11-04, the user's „ყველა, ბოლომდე“; log https://claude.ai/artifact/Gok8rRVTkDm38eYB185Jo8)**: how a
  game is played is numbered steps — `components/games/HowTo.tsx` (`HowTo` = a fold, open the first time, `sg-howto`; `Steps` = the
  bare list for a game's first card) — never a long grey paragraph under „დაწყება“. A quick game's steps come from its face's
  `online` / `hybrid` words (`stepsOf` in `RoundsPage`), so a `table` setup under it has none of its own. An end screen names the
  winner through `pages/games/rounds/winLine.ts` (`winLine`: nobody above 0 → „ამჯერად ქულა არავის აქვს“, and no trophy); the
  Podium crowns only a score above 0. A board game's end says what broke a tie on points (ოქროს ხანა: works, then estates;
  ქარავანი: the number of cities, then abazi; ლურჯი სუფრა: full rows; ორი ტახტი: the army, then castles), and its online
  steps leave out who opens the room — the room card's `hostLine` says it.
- **No religious pictures in the games (the user's rule, 2026-11-01; corrected the same day: „რელიგიური და მუსიკალური კითხვები
  დატოვე, უბრალოდ ვიზუალს ნუ გამოიყენებ“)**: no cross, church, icon or domed-church mark anywhere in a game or a print kit (the
  series emblem is `grapeEmblem` in `src/print/lib.js`, the caravan map's shrines an old gate); a monument card that will get a picture is a secular one. Faith and chant stay as content —
  questions, words, feasts and saints, chant audio, place names — beside the wider Georgian topics.

## Plan part 1 (built 2026-10-06, branch `claude/peaceful-dijkstra-9lbmeb`, PR gbsdesign/sagandzuris-skola#1)

- **Roles** (`context/AuthContext.tsx`, `firestore.rules`): owner (the founder's address) names ≤3 superadmins,
  superadmins name admins, admins name teachers; staff roles in `admins/{email}.role`. Teachers manage only
  their own classes (`classes.teacherIds`) and psalter groups; students' `teacherIds` give their teachers
  access (`becomingTeacher` rule). No regent role and **no invite links** (the user removed them): members
  are added from `directory/{uid}` (name + photo only). Rules test: `tests/firestore-rules.test.mjs` (emulator).
- **Psalter group** (`utils/psalter.ts` + `tests/psalter.test.ts`, `hooks/usePsalter.ts`, `pages/PsalterPage.tsx`,
  `components/psalter/`): cycles of 1–2 days restart on the 1st and 15th (Georgian time, UTC+4); kathismas
  move +1 on the 1st and 15th; skipped kathismas show only in history. Names at every დიდებაი.
  Since 2026-10-20 a group lives only inside its class (`classes.psalterGroupId`, made from `teacher/ClassHeader.tsx`;
  no standalone „ახალი ჯგუფი“, admin sees it on the class row). The user calls a kathisma „კანონი“ in the UI.
  Since 2026-10-28 the group's members follow its class (`addClassMember`/`removeClassMember`), who reads a kanon is set
  only in the kanon's window, the rest in one settings window (`GroupSettingsSheet`); „წავიკითხე“ on a kathisma also marks
  my kanon (and, since 2026-10-30, one I took over to help — `useTakenByMe`).
  Since 2026-10-30 (the user: „ხალხს ვერ ვუნაწილებ“; „1 კანონი 2 კაცი“): **at most two readers a kanon** (`MAX_READERS`; the
  picker's `max`). The leader's „განაწილება“ row under the tiles (amber when kanons are free or people have none) opens
  `psalter/DistributionSheet.tsx`: „ხალხი“ (a person → their 20 tiles, a tap gives/takes at once) and „კანონები“ (a kanon →
  the picker). „ავტომატური შევსება“ = `fillDistribution` (keeps everyone, fills gaps: newcomer → free kanon, else one of a
  busy reader's, else beside a lone reader; a free kanon → a shared kanon's second reader moves, else the least busy);
  „ყველას თავიდან“ = `autoDistribute` (round by name, second readers past 20, extras past 40 wait). Every save goes through
  `saveOwners` (failures shown) and keeps the old distribution in `psalterGroups.assignmentLog` (`withPast`, once per cycle,
  last 12) so the history names who was to read then (`ownersThen`). A new class member gets a kanon at once
  (`joinClassGroup` → `giveKanon`). The leader sees a line when the admin's section „ფსალმუნთა ჯგუფი“ isn't open (members
  then see nothing). Two readers share one „წავიკითხე“ mark (either one's mark counts for the kanon).
  Since 2026-10-31 a member **without a kanon picks one themself**: the kanon's window offers „ჩემს კანონად არჩევა“ on a
  free kanon or beside one reader (asked once; changing it later is the teacher's) — `pickKanon` adds their uid to that
  list of the stored distribution with a `pick {k, by, at}` note, and the rule `pickingKanon` in `firestore.rules` lets a
  member write only that (own uid, one list under two readers, no kanon before). A pick writes no `assignmentLog`. The home
  shelf's kanon tile (`KathismaTile`) opens the kanon's text, its ✓ marks it read (it opened the group page before).
- **Teacher panel** (`pages/TeacherPage.tsx`, `components/teacher/`), **admin panel** (`pages/AdminPanelPage.tsx`,
  `components/admin/`): sections open/მალე/hidden (`settings/sections`); JSON export. The panel's recording-binding
  form and logo card were removed 2026-10-20 (the app still reads `settings/recordings` and `settings/logo`).
  Since 2026-10-21 (edu.doit.gov.ge style) a wine-to-gold head `admin/AdminHero.tsx` with 4 big numbers that open
  their list (those filters have no chip), class cards in a 2-column grid, „სკოლა“ as folding cards (`admin/Fold.tsx`).
  Since 2026-10-20 the „one window“ rule: წევრები (one list + count filters; a tap opens the person's window
  `admin/PersonSheet.tsx` — details, role, „დამატებითი უფლებები“, access, approve/refuse, profile edit), კლასები (class
  windows, shared `LeaderChips`). Since 2026-10-28 (stage ②) no tabs: the page has the kit's `PageBar` (role under the
  title, „სკოლა“ on the right — ⚙ from 400 px), the four numbers (`AdminHero`, „—“ until loaded, „ელოდება“ amber) switch
  between the members and the classes, and ⚙ „სკოლა“ is one window (`SchoolSheet` in `admin/SchoolTab.tsx`: sections with
  40 px buttons, most listened, `admin/ExtraRights.tsx` = the centre's recordings + song texts in one card, backup).
  Every window shows its own messages inside it (sticky `Flash`). Empty filter chips hide; „ახალი კლასი“ is the dashed
  last card. Numbers of the old სტატისტიკა tab live in `admin/StatsTab.tsx` hooks; old shortcut refs (`admin:sections`,
  `stats`, `recordings`, `requests`, `school`) still open the right part („სკოლა“ ones open the window once).
  Since 2026-10-28 (admin review, stage ①; review doc https://claude.ai/artifact/DbTEz3fwSDQkSbcxwY6yjb) a class is never
  deleted: its ✎ „არქივში“ sets `archived` on the class and its psalter group (every hook hides them, the rules close its chat,
  private chats and lessons to all but admins, the reminders Worker skips them), the fold „არქივი · N“ under the cards brings one back. `students.teacherIds` = the teachers of the member's
  classes in use (`utils/classTeachers.ts` + test): the class ✎ and the archive set it, a teacher's „ამოღება“ takes the
  class's teachers off (rule `leavingTeachers`), and the admin panel puts every list right when it opens (only with the
  server's class list, `useAllClasses().fresh`). The class ✎ keeps teachers missing from the staff list and copies the
  teachers to the class's psalter group. Errors go through `utils/errorText.ts` (plain Georgian). Tile „ყველა“ counts
  everyone; „აქტიური“ only admitted non-staff members.
  Stage ③ (2026-10-28): the person's window has „მიწერა“ (the administration's chat, `openAdminThread`), „აქტივობა“
  (`utils/personActivity.ts` + attendance of their classes), class chips that open the class page + „კლასში დამატება“
  (`addClassMember`), the kids' mode switch, who gave the role / let them in; a newcomer's class is picked before „დაშვება“.
  Filters „კლასის გარეშე“, „პროფილი არასრული“, „30+ დღე არ შემოსულა“ (chip icons hide below 400 px); a row shows the
  class instead of the e-mail; superadmins download the shown list as CSV (`utils/csv.ts`, phones without „+995“). Attention
  lines „N კლასს მასწავლებელი არ ჰყავს“, „N წევრი კლასის გარეშეა“. Class cards show „ბოლო გაკვეთილი“. Admins find people in
  the one search (group „ადამიანები“ from `directory`; `requestOpen('admin', uid)` opens the window).
  Ideas 2, 3, 5, 11 (2026-10-28): a change made at once — a role, a right, the kids' mode, a class added, a section, the
  archive — no longer asks first: the kit's `offerUndo` (dark bar, 5 s, „გაუქმება“; `UndoHost` in `App.tsx`) through
  `admin/changed.ts`, which also writes the change log `adminLog` (`utils/adminLog.ts`: admins add signed lines, superadmins
  read them in ⚙ „სკოლა“ → „ცვლილებების ჟურნალი“, nobody edits one; in the backup). ⚙ „სკოლა“ → „ტელეფონზე შეტყობინებები“
  (`utils/adminPush.ts`, `adminPush/{uid}`): „ახალი წევრი ელოდება“ (superadmins; `ensureMembership` → Worker
  `/access-request`, a tap opens `/?open=admin&person=<uid>`) and „ორშაბათის მიმოხილვა“ (Monday 10:00, `weekText`). The
  Worker sends only to people still in `admins` and adds its `subs.admin` column itself — needs only a publish of the Worker.
  Stage IV (2026-10-28): a class is edited only on its page — the ✎ list gives admins „მასწავლებლები“
  (`classes/ClassTeachersSheet.tsx`, `useLeaders` in `admin/LeaderChips.tsx`, `saveClassTeachers` also sets the members'
  teacherIds and the psalter group) and „არქივში გადატანა“, and a class nobody leads shows admins an amber „დანიშვნა“ line;
  the panel's cards have no ✎ and „ახალი კლასი“ asks only the name, then opens the page. On a computer (`useWide`, `lg`) the
  members list and the person's window stand side by side (the kit's `Sheet docked`). „გასული“ (person's window → „სკოლაში“):
  `settings/leftMembers` (`utils/leftMembers.ts`) — they keep the app; `filterTests` leaves them out of every number and
  list but the chip „გასულები“, birthdays/name days and the Worker's Monday count skip them. ⚙ „სკოლა“ → „განცხადება
  კლასებს“ (`admin/Announce.tsx`): one text into the chat of every ticked class, as the admin's message. „განყოფილებები“:
  one row per section with its „ბავშვებს“ toggle (no second list).
  Since 2026-11-01 (the user: „გამთიშველები ყველასი ცალკ-ცალკე“) the same list has „საიტის სხვა ნაწილები“ — `EXTRA_SWITCHES` in
  `data/sections.ts` (სამოსი, ნასწავლი, ოსტატობა, სამუშაო, ლოცვანი, კლასი, მიმოწერა, ძიება, კალენდარი, ჩანაწერები, აბიტურიენტს,
  დაბადების დღეები; ღია/დამალული only, kept in the same `settings/sections.state`) and „ყველას დამალვა“ (asks, undo). `useAccess().on(id)`
  reads them (admins always on); `useMembership().can` follows them for the member features of the same id; the path page `gz` stays
  while any of its parts (გზა's „დღეს“ card, ჩვევები, მარგალიტები, the orbs) is open, each part shown by its own switch.
  Ideas 7–10, 12–14 (2026-10-28, the review's last PR): under the filters „მასწავლებლები“/„ადმინები“ a teaching person's row
  says what they lead (`admin/TeacherOverview.tsx`: `TeachLine` + `useLastLessons`, one listener per class on its last
  attendance; amber = no class, or no lesson for 14+ days). „მონიშვნა“ on the members list picks several people
  (`admin/BulkActions.tsx` `BulkBar`): „კლასში“ (`addClassMembers`/`removeClassMembers` in `ClassesAdmin.tsx`, with undo),
  „დაშვება“ for waiting ones (superadmins), „ჩანაწერები“ (the centre's right). Filter „შესაძლო ორმაგი“ (`utils/duplicates.ts`:
  the same phone's last 9 digits, or the same two-word name) + an amber box in the person's window that opens the twin.
  „ჩანიშვნა“ in the person's window = an admin-only note (`utils/adminNotes.ts`, `adminNotes/{uid}` {text ≤2000, by = the
  writer's e-mail, at}; rules: admins only; in the backup). A „მალე“ section can get „გახსნის დღე“ (`settings/sections` `openOn`;
  `stateOnDay` in `data/sections.ts` opens it on that Tbilisi day; `useSections().stored` = the saved state). ⚙ „სკოლა“ →
  „სკოლის ზრდა“ (`admin/GrowthFold.tsx`, `utils/growth.ts`): new members by month from `createdAt`, active members by week from
  `settings/growth.weeks` (the panel keeps this week's count when an admin opens it — `hooks/useGrowth.ts`, so weeks start
  2026-10-28) — and „ვის რა შეუძლია“ (`admin/RolesFold.tsx`, a card per role). Idea 15 (automatic backup) waits on the user:
  phone numbers need a protected place first.
- **Access** (`hooks/useAccess.ts`): guests see chant books + synth, prayers, song/მთქმელი names only (no
  recordings anywhere); kids' mode is switched by the teacher per student (`students.kidsMode`, no PIN).
- **Home buttons** (`utils/shortcuts.ts`, `components/home/ShortcutShelf.tsx`, `students.shortcuts`, ≤8; hidden
  until chosen; class `defaultShortcuts`). Class mode filters the chant lists to the class program.
- **Reminders Worker** (`worker/reminders/`, D1 + text pushes + group/assignment reminders): published by the workflow
  above, which also does the old one-time setup of `docs/შეხსენებების-სერვერი.md` (finds or makes the D1 database, fills
  its id into wrangler.toml for the run, runs `schema.sql`, gives the Worker `FIREBASE_SA` once from `FIREBASE_SERVICE_ACCOUNT` — the user agreed 2026-10-28 — and warns when `VAPID_PRIVATE_JWK` is missing).
- `VITE_EMULATORS=1` points the app at local Firebase emulators — not used any more (the user's rule, 2026-10-28).

## Plan part 2 (tab „მე-2 ნაწილის სამუშაო გეგმა“ in the plan doc below; six stages, one PR each)

- **Stage 1 built 2026-10-06** (branch `claude/trusting-ptolemy-e66s0f`): sign-in by an e-mail link
  (`utils/emailLink.ts`, `components/access/SignInChoices.tsx`, `EmailLinkFinish.tsx`; header „შესვლა“ opens
  the sheet via `openSignIn()`). Needs "Email link (passwordless sign-in)" on in the Firebase console.
  „პირველი გაცნობა“ (`components/onboarding/FirstMeeting.tsx`): a locked form (no ✕, only „გამოსვლა“) over
  the app until the profile is complete — six cards: Georgian name, birth date (lists), region (list) + town or
  village, phone, status („დამწყები / ვგალობ / ვმღერი / ვუკრავ“), voices. Every field is required (the user's
  rule); what counts as complete is `utils/profileFields.ts` (+ `tests/profileFields.test.ts`). It waits while
  notes, the program or church mode is open. The user removed „რისთვის მოხვედით?“ — don't bring it back.
  Phone lives only in `students/{uid}.profile.phone` (not in `directory`). `AuthContext` no longer writes empty
  name/photo on sign-in.
- **Admission of new members** (pushed to main 2026-10-06, commit 261611b, with the private chats): `utils/memberAccess.ts`
  (`memberAccess/{uid}` status pending/approved/rejected + features; `accessDecisions/{uid}` who decided, superadmins
  only). Pending = guest view + „მიმდინარეობს დამატება“ (`components/access/MembershipGate.tsx`); refused = signed out
  with „დამატება შეფერხებულია“ every time. Superadmins decide in admin panel → მომხმარებლები, in the person's window (`admin/PersonSheet.tsx`; records and
  `saveAccess` in `admin/AccessRequests.tsx`).
  Old members (students doc, no memberAccess) and staff keep everything. Features not given are hidden, never locked.
  Search and the church calendar are features too (the user's choice): guests and waiting members don't get them.
- The app's Firestore database id is `ai-studio-…`, not `(default)`.

## Roadmap (ideas not built yet — confirm open questions with the user first)

Full plan (Georgian doc): https://claude.ai/code/artifact/f10aa016-d92d-4522-8968-2e6acba2d6ab

**Redesign in 8 stages (agreed 2026-10-25; audit of every page with 204 findings and the stage plan:
https://claude.ai/artifact/Q5taZYajdGvJEVpHmoHVEu).** Each stage = one PR (no emulator screenshots any more — see
„Only the checks a change needs“). 1 საძირკველი — done (kit rules above). 2 class page = the only workplace (teacher panel removed,
psalter group inside the class). 3 library lighter (no plates under the books). 4 birthdays/name days page + push
5/3/1 days before (members see month list without year; teachers/admins all). 5 women's costume beside the chokha
(images by Gemini in the chokha's style, approved by the user first; girls open it first, by `nameGender`).
6 „მანერა“ → „ოსტატობა“ (exercises, tips, step-by-step lessons the teacher builds). 7 pearls game + AI teacher that
listens (Gemini through Firebase AI Logic). 8 calls on Android (wake lock, push, TURN key from the user).

1–3. Built (see above).
4. Pearls/chests game — built 2026-10-25 (redesign stage 7, branch `claude/dazzling-goodall-inv60p`). Since 2026-10-27
   the fifth round button „მარგალიტები“ of „საგანძურის გზა“ (`PathOrbs`, body `pearls/PearlChests.tsx`; the games page is
   the hub above), shown while section `margalitebi` is open (open by default). Three chests in `data/pearls.ts` (cards on
   top: წირვა vol. IX №58–77, მწუხრი and ცისკარი from vol. I), the first phrase of the chosen voice from the book notes
   (`utils/pearls.ts` `phraseOf`), singing heard in the browser (`utils/pitch.ts`: YIN pitch, notes, key-free score —
   since 2026-10-28 an in-order alignment (LCS), so one wrong note no longer pulls the rest out of line; ≥80% polishes;
   `utils/singCapture.ts`); „სად შეცდი“ (`missedNotes`: each missed note too high / too low / not heard, numbered red on
   the mirror). Each voice keeps its own best (`pearls[id].voices`); all three polished = a golden pearl (`isGolden`),
   three dots under each pearl. Sheet `components/pearls/PearlSheet.tsx`. Best try in `students.pearls`, best take (MP3) in
   `pearlTakes/{uid}/takes/{versionId}`; the teacher hears it and approves („ჩათვლა“ → `students.pearlShine`, teachers
   only) in the member's window (`PearlReview`, first in it; the class page's own pearls card was removed 2026-11-04 — a
   💎 N by the member's name in the class roll says whose window to open). Since
   2026-10-28 every 5 shining pearls give the outfit of „ჩემი სამოსი“ its next part (`utils/pearlGifts.ts` + test,
   `hooks/usePearlGifts.ts`: the member's own app adds it from the path page — `PearlGiftBanner` in `PathOrbs` — and keeps
   `students.pearlGifts {steps, parts, seen}`; the pearls panel shows „შემდეგი ჯილდო“), and `utils/pearlWish.ts` opens a
   wished pearl on the path page (the home card „დღის მარგალიტი“ was taken off at the user's wish, 2026-10-31). „AI მასწავლებელი“ (`utils/aiTeacher.ts`, gemini-3.8-flash through
   Firebase AI Logic with the try-on's App Check; 3 a day per device, superadmins unlimited) — works only on the
   deployed site. Tested in the emulator with a fake microphone WAV (Chromium `--use-file-for-fake-audio-capture`).
- Birthdays and name days (redesign stage 4, 2026-10-25): page `birthdays` (`pages/BirthdaysPage.tsx`), records
  `birthdays/{uid}` + staff-only `birthYears/{uid}` written from the profile (`utils/birthdays.ts`), and „ანგელოზის დღე“
  the member picks from the church-calendar days that name their (baptismal) name (`components/birthdays/MyNameDay.tsx`,
  matching in `utils/nameDayMatch.ts` + test, records `nameDays/{uid}` in `utils/nameDays.ts`). Home gold line and phone
  notices 5/3/1 days before for staff: `components/home/BirthdaysSoon.tsx`.
- „ქართული კაბა“ beside the chokha (redesign stage 5, built 2026-10-25): „ჩემი სამოსი“ gets a ჩოხა / ქართული კაბა switch
  (`ChemiSamosi.tsx`; a girl's name by `nameGender` opens the kaba first; choice in `students.samosiOutfit`, parts in
  `students.kaba`). Parts in `data/kabaData.ts` (კაბა, გულისპირი, სარტყელი, ქათიბი, ლეჩაქი). The pictures are made by the
  owner in „კაბის სახელოსნო“ (`KabaStudio.tsx`, only the owner sees it): Gemini draws the whole dress in the chokha
  photo's style on green, each part is cut out of it, the green is keyed out in the browser (`utils/kabaArt.ts`), kept
  in `samosiArt/kaba-*` (Firestore bytes); members see the kaba only after „გამოქვეყნება“ (`samosiArt/kaba.published`).
  Until the owner makes and publishes the pictures on the live site, members see only the chokha.
5. **My voice**: the user wants AI to learn their voice. Plan discussed 2026-10-06: speech via ElevenLabs
   voice cloning (supports Georgian); singing via RVC voice conversion (Applio on Google Colab — the user's
   PC has only a 2 GB MX130 GPU). Generated audio is made in advance and served like other recordings.
   Nothing built yet.

Pending small tasks the user mentioned: remove the old Drive `ნოტები` sheets from `chantMediaRegistry.ts`
(only when the user asks); bind mp3s for the folk songs marked `pendingWma` once uploaded to Drive.
