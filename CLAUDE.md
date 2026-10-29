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
  `CLOUDFLARE_API_TOKEN`, added 2026-10-28 — without it the run only warns). The audio Worker (`worker/wrangler.toml`) is
  still deployed from the user's PC with wrangler.

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
  no header shield since 2026-10-27), and the profile's details are three folds with „შენახვა“ shown only while changed; today's saints are a folded line at the top of home (`TodaySaintsCard`).

## Audio and sheet music (details in `src/data/CLAUDE.md`)

- Recordings stay in the user's Google Drive and play through the Worker
  `https://sagandzuri-audio.mr-gabunia.workers.dev/<driveFileId>` (Drive sends no CORS headers).
  Binding is only the explicit `VARIANT_MEDIA` map — use `/add-recording`.
  **Every `<audio>` / `new Audio()` that plays a Worker URL must set `crossOrigin = 'anonymous'`** (as `ChantPlayer` does):
  the Worker answers only requests carrying the site's `Origin`, and a plain media request sends none → 403, silence
  (the „დღის ჰანგი“ bug of 2026-10-28).
- Book notes (`public/notes/<book>/`) come from the chant-book PDFs by OMR; the OMR scripts are not in the repo.
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
  beside every part (`wordsForPart`, only roughly — no timings); home card „დღეს გასამეორებელი“ (`home/LearnDue.tsx`,
  opens the piece through `utils/learnOpen.ts`) and one daily phone reminder on the reminders Worker
  (`utils/learnReminder.ts`, id `learn-review`, kept apart from the habits' list in `prayerReminders.ts`).
  A teacher's chant/song assignment (also 2026-10-28): the learning mode notes each piece's part count in
  `students.learnParts.{piece}` (no rules change); `assignedProgress`/`allLearned` (`utils/learn.ts` + test) — a song counts
  by its best-learned recording. Every part learned = the assignment is done (`workDone(…, mine)`; the member sees
  „ნასწავლია“, a teacher's „ჩათვლა“ still shows „ჩათვლილია“; marking on the path still counts for the teacher). The class's
  „დავალებები“ chip „ისწავლა N/M“ unfolds each member's bar (`WhoLearns`, `learn/PartsBar.tsx`); the member's window lists a
  bar per piece (`LearnReview`). The member's „სწავლა“ on an assignment opens the learning mode on the assigned voice
  (`learn/openLearning.ts`: `learnPieceOf`, `useOpenLearning`; `requestLearn(piece, voice)`).
- **კლასის სტუდია** (2026-10-29, `components/studio/ClassStudio.tsx`): a program chant with book notes gets „სტუდია“ in its
  window (`ItemSheet` in `classes/ClassProgram.tsx`). A member sings their voice over the synth (their own voice muted) and the
  take, cut by the output lag, goes to the pearls' store as `studio~<vid>` (no rules change). The class's teacher ticks whose
  takes go in, hears them together and „კლასის ჩატში“ sends one mixed MP3 (made in the browser) as a voice message.
- **Song albums** (2026-10-29, songs only so far; chants and „სხვა“ later): 327 albums from Drive „ფოლკლორის ცენტრი“ under
  the songs map („ალბომები“), 3 491 sure takes in their songs; each album opened per member by admins — 🎧 / ⬇ apart
  (`data/albumAccess.ts`; details in `src/data/CLAUDE.md`).
- **Folk songs map** (`data/songsData.ts`, `components/maps/GeorgiaMap.tsx`) and **მთქმელი authors map**
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
  (version 1.1.0, code 2; minSdk 26): six home-screen widgets — buttons (the home vine's places, picked in `ButtonsConfigActivity`),
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
  `utils/voiceRecorder.ts`); calls are the app's own (`components/calls/`, `utils/callSession.ts`), Jitsi is gone. Voice MP3s are Firestore Bytes
  (no Firebase Storage).
- **Class page** (`pages/ClassPage.tsx`, rebuilt 2026-10-24, simplified 2026-10-28 „ერთი რამ, ერთ ადგილას“ from an approved
  sketch): title bar (🎵 + one ✎ for teachers — its list opens name/logo/mode, the timetable `ScheduleSheet`, the program
  `ProgramEditor`, adding a member `AddMemberSheet`; 💬 to the teacher for a member), the timetable chips, the members as one
  line „N წევრი ›“ that opens their window on a phone (a sticky left column on a computer, `lg`); the class's teachers get
  `ClassRoll` (`teacher/StudentsOverview.tsx`: attendance ✓, 💬, a name opens the member's window, „მიწერა“/„ამოღება“).
  Then three tabs (kept per visit in sessionStorage): „პროგრამა“ — `ClassProgram`: thin progress bar, a line per item with
  only its status (my voices, else the learning bar; a teacher sees how many know it), a tap opens `ItemSheet` (ნოტები /
  სიმღერა, სწავლა, my voice marks, who knows each voice); under it folded cards: ოსტატობა (`ClassLessons fold`), the
  teachers' pearls, the psalter group (folded head line with „შენი: N“; `focus` opens it) — „დავალებები“
  (`classes/ClassWork.tsx`: `AssignmentsFold` for teachers, `WorkItems` for members; a dot = a member's assignment to do) —
  „ჩათი“ (`ClassChat`; a dot while unread). „სასწავლო პროგრამა“ is the name everywhere (not „კლასის პროგრამა“). The timetable
  chips also sit under the chat's title on the messages page. Teacher-only parts never show to members; attendance is
  teacher-only in `firestore.rules` too (members no longer read it).
- **Games hub** (`pages/GamesPage.tsx`, 2026-10-27): „თამაშები“ is a hub of three category tabs (მუსიკალური · ქართული ·
  ცოცხალი) from `data/games.ts`; every game carries its variant chips (ონლაინ · ჰიბრიდული · უტელეფონო); only ready games show,
  plus the one being built as a „მალე“ row (since 2026-10-28 the user had the other unbuilt plan games taken off — none is being
  built since „რა? სად? როდის?“ was finished; the plan doc keeps the rest, don't bring them back unasked); the board games are
  paper only (one „უტელეფონო“ chip, a plain card + the print strip); the vine label „თამაშები“ opens it. The pearls game stays the round button of „საგანძურის გზა“ (below), now
  under its own section `margalitebi` (open/მალე/hidden switch in the admin panel; a member's feature for it is the games'
  one — `featureOf` in `hooks/useAccess.ts`). The plan with 42 games and the six Georgianized board games:
  https://claude.ai/artifact/Dw24amtHhQvSGUd1pPE4fg
- **First two games (2026-10-28)**: „დღის ჰანგი“ (`pages/games/HangiGame.tsx`; logic `utils/hangi.ts` + test; pool
  `data/hangiPool.ts` = every recording the member may hear — `VARIANT_MEDIA` via `codeBoundMedia()`, `CHANT_RECORDINGS`, folk
  mp3s; the day's pick = rendezvous hash of `date|id`, the same for the whole school, Tbilisi day; six tries 1·2·4·7·11·16 s;
  record `students.games.hangi.days[iso]` through `hooks/useHangi.ts`, the device for guests, no rules change) and „ამიხსენი“
  (`pages/games/AmikhseniGame.tsx`; rules `utils/amikhseni.ts` + test; ~1000 cards in `data/amikhseniWords.ts` built from the
  app's own data; settings stay on the device). `components/games/TableScreen.tsx` is the full-screen face of every live game
  (wake lock, safe areas). Both open inside the hub as `mapItem` (`GameDef.item`; the bar title from `gameTitleOfItem`).
- **Word games (2026-10-28, same day, second PR)**: „დღის სიტყვა“ (`pages/games/SitqvaGame.tsx`; rules `utils/sitqva.ts` + test;
  Wordle-like, 4–6 letters, six tries, one word a day for the whole school: the day's feast or a saint of the church calendar
  (`candidatesOfDay` over `calendar/<year>.json`), else the bank `data/sitqvaAnswers.ts` (church words, places); the hint kind is
  shown from the start; guesses must be in the bank or in `data/sitqvaWords.ts` (lazy chunk, `utils/sitqvaDictionary.ts`);
  screen keyboard `components/games/GeoKeyboard.tsx`, a physical keyboard works too; „ნახე აპში“ opens the search with the word —
  `openSearch(query)`) and „ოთხეული“ (`pages/games/OtkheuliGame.tsx`; rules `utils/otkheuli.ts` + test; Connections-like, 16 words
  in four hidden groups, four mistakes; ~50 groups in `data/otkheuliGroups.ts` — curated + instruments, costume parts, the archive's
  songs by region and chants by service, at most one group of a family per grid; the day's grid `gridOfDay` + unlimited extra grids
  with a random seed, not saved). Both records go through `hooks/useDailyRecord.ts` (`students.games.<game>.days[iso]`, the device
  for guests; `useHangi` is now a wrapper of it), no rules change. All three daily games count days from 2026-10-28.
- **Live games (2026-10-28, third PR)**: „გათვლა“ (`pages/games/GatvlaGame.tsx`; rules `utils/gatvla.ts` + test; one phone in
  the circle: names light up per beat of a rhyme and the last beat picks who starts, the picked are skipped next time; the
  „ვისი ჯერია?“ wheel picks the one asked least (counts on the device); teams of 2–4. Rhymes: the old alphabet names, numbers,
  the school's own „მთქმელი, მოძახილი, ბანი“ + the teacher's own on the device; names typed or a managed class's members
  in one tap, all in localStorage `sg-gatvla`) and „ცხელი ჩურჩხელა“ (`pages/games/ChurchkhelaGame.tsx`; rules
  `utils/churchkhela.ts` + test; Hot Potato: the phone plays a pool recording (`hangiPool`, a random start offset) and stops
  after a random 5–45 s, the bell rings, a task card comes up, „შეასრულა/ვერ“ tallied; source „ჩემი ხმით“ = the teacher sings
  and the phone only times — the mode guests get). Shared: `utils/gameSounds.ts` (openAudio in the tap, bell, tick),
  `components/games/Chip.tsx`. Nothing saved but settings; no rules change.
- **„რა? სად? როდის?“ (2026-10-28)**: the team quiz (`pages/games/RaSadRodisGame.tsx`, `mapItem` `rsr`; rules
  `utils/raSadRodis.ts` + test). The user's answers „1ა 2ა 3ა“: ~100 questions written by Claude from the app's own texts — 111 in
  `data/raSadRodisQuestions.ts`, 8 topics, stable ids, not yet checked by a teacher (the setup says so) — plus the teacher's own
  („ჩემი კითხვები“, device only, `sg-rsr-mine`); every team answers the same question on paper at once, the host's phone shows it,
  counts the minute (tick at 10 and 3-2-1, bell), shows the answer + note and the host ticks who got it; topic „მოისმინე“ makes a
  question from a `hangiPool` recording (`listenQuestion`: a feast's chant → which feast, a song → its region, else the chant's name)
  and plays 20 s from a random point. `drawGame` spreads the topics, asks the unasked first (`sg-rsr-seen`, last 60), a dry topic
  lends its slot; „სხვა კითხვა“ swaps one, „წინა პასუხი“ goes back to fix ticks. The game is kept after every step (`sg-rsr-game`,
  `parseGame`), so ✕ only pauses — the setup shows „გაგრძელება“. No rules change, nothing in Firestore.
- **Printable board games (2026-10-28, fourth PR)**: the „უტელეფონო“ variant of the six board games (plan doc tab „6 სამაგიდო
  თამაში“) as A4 PDFs in `public/games/print/<id>.pdf` (not precached; `/games/print/` is in the PWA's navigateFallbackDenylist).
  Made by `node scripts/print-games/build.mjs [id…] [--previews=<dir>]` — HTML printed by Playwright's Chromium; shared pieces in
  `scripts/print-games/lib.mjs` (Noto Georgian fonts fetched into a gitignored folder, 3×3 sheets of 63×88 mm cards with crop marks,
  backs mirrored for long-edge duplex, ⌀25 mm token sheets, series stripe „საგანძურის თამაშები №N“, lucide icons as SVG), one module per
  game in `scripts/print-games/games/`. Every file prints „ყველაფერი ორმხრივად“: a module lists its physical sheets
  (`{ key, front, back? }`), `duplex()` makes each sheet two pages (a missing back = a labelled blank page) and the cover names
  sheets by number (`sheetNo`). Portraits are ornament placeholders until the user approves Gemini pictures. Built so far:
  „მეფის კარი“ (№6) and „სამშვილდის ღამე“ (№2); then (fifth PR) „ოქროს ხანა“ (№1, Catan: 19 hexes 79 mm, a frame of six A4 pieces
  ≈50×43 cm whose ends meet by letters ა–ვ, 18 numbers laid by the letters' spiral so 6 and 8 never touch, 9 gates with fixed place
  names, A6 cards via `placedSheet`) and „ლურჯი სუფრა“ (№5, Azul in Erekle II's Tbilisi: 105 stamps of 20 mm on one sheet whose back
  is one indigo field, four A4-landscape boards turned onto portrait pages — apprentice / master side, trays ⌀90 mm, the უსტაბაში
  token tile-sized to fit a floor place); then (sixth PR) „ორი ტახტი“ (№4, 7 Wonders Duel between the western (ქუთაისი) and eastern
  (თბილისი) thrones: 73 age cards with the original costs/effects under Georgian names, 8 help cards, 12 Georgian monuments 96×62 mm,
  board „ლიხის გზა“ in two A4-landscape pieces, the knight as a fold-up tent, coins 1/3/6 თეთრი) and „ქარავანი“ (№3, Ticket to Ride
  Europe in late-XIX-century Georgia: a 78×56 cm map from eight one-sided A4 pieces — 47 hand-placed cities, 74 roads (13 mountain, 4 ship,
  8 double; the 1872 railway between the doubles), the app's region shapes, coast, rivers and ridges bent onto the cities by a thin-plate
  spline; `boardItems()` keeps each piece's bounding box so a printed window draws only what it shows; 110 caravan cards of 8 goods + 14
  locomotives, 40 + 6 „მგზავრის წერილი“ whose points are checked against the map's shortest paths at build time and must name every city,
  40 carts a player (35 with five), caravanserais = TTR stations, animals as score markers; the cover's back is a glossary of the 47 places).
  A game with sheets gets `print: { href, sheets }` in `data/games.ts`; its hub card
  shows a wine „დასაბეჭდი ფურცლები“ strip („PDF · N ფურცელი“, one line; „PDF · “ hidden below 400 px) and its „უტელეფონო“ chip turns wine.
  The app's word games got paper kits too (seventh PR): „დღის სიტყვა“ (grids for 4/5/6 letters, four A6 a side; 78 slips from
  `ANSWER_BANK`; the example coloured by `scoreGuess`), „ოთხეული“ (16 grids of 16 cards = the app's `buildGrid` with fixed seeds,
  kept only when every group of the list allows one answer, with variety rules; the host's answer sheet) and „ამიხსენი“ (36
  cards of six words numbered by a die — ten themes, the songs only well-known titles — and a two-sided score sheet). Their
  modules read the app's TypeScript data through `scripts/print-games/appData.mjs` (esbuild in memory, firebase/React stubbed);
  their stripe shows a label („ქართული · უტელეფონო“) instead of a number. „რა? სად? როდის?“ has one too (8 sheets): 40 question
  cards = the first five of each topic (question in front, answer + note on the back), 5 blank cards, a two-sided score sheet
  (18 questions × 6 teams) and 24 answer slips — so keep the first five of every topic print-worthy.

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
  my kanon.
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
   only) in the member's window (`PearlReview`) or on the class page (`pearls/ClassPearls.tsx`, teachers only, since
   2026-10-28: „მოსასმენი“ queue — ▶ fetches the take on demand, „ჩათვლა“ — and one table of members × chests). Since
   2026-10-28 every 5 shining pearls give the outfit of „ჩემი სამოსი“ its next part (`utils/pearlGifts.ts` + test,
   `hooks/usePearlGifts.ts`: the member's own app adds it from the path page — `PearlGiftBanner` in `PathOrbs` — and keeps
   `students.pearlGifts {steps, parts, seen}`; the pearls panel shows „შემდეგი ჯილდო“), and the home page has
   „დღის მარგალიტი“ (`home/PearlOfDay.tsx`: the same pearl for the whole school, hangi's `pickOfDay`; a tap opens it on the
   path page through `utils/pearlWish.ts`). „AI მასწავლებელი“ (`utils/aiTeacher.ts`, gemini-3.8-flash through
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
