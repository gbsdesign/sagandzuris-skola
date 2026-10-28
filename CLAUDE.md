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
- **Ready to merge → say it in red.** When a chat's work is finished and its PR is ready (checks green, no conflict),
  end the reply with a line in red: „🔴 **შესაერთებელია** — PR #N“ (Markdown has no red text, so the red circle + bold),
  so the user knows to press „Merge“. (The user's rule, 2026-10-27.)

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
  exists, the user publishes them by hand in the Firebase console. Cloudflare Workers are
  deployed from the user's PC with wrangler — a cloud session can edit `worker/` but cannot deploy it.

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
- **Folk songs map** (`data/songsData.ts`, `components/maps/GeorgiaMap.tsx`) and **მთქმელი authors map**
  (`data/mtkmeliData.ts`, `MtkmeliMap.tsx`, shared `RegionPuzzleMap.tsx`). Full texts only for authors who
  died before 1956; others get title + description + wiki link.
- **Prayers** (`data/prayers.ts`, `public/prayers/`, `public/bible/`), psalter kathismas, 73 akathists,
  commemoration name lists (`utils/commemoration.ts`), prayer reminders via Web Push Worker
  `sagandzuri-reminders` (`worker/reminders/`; push works only on the deployed site).
- **Habits** ticked per day (`students/{uid}.habitLog`, kept whole since 2026-10-16; each tick writes only its day),
  goals in `habitsAndManera.ts`. Views „დღე · კვირა · თვე · წელი“ + a habit's own page in `components/habits/`
  (one shared model `useHabits.tsx`; a new view = one entry in `VIEWS` in `ChvevebiPanel.tsx`), stats in
  `utils/habitStats.ts`. Ticks allowed for the last 7 days (`canTickDay`). Colours/icons/counters: `data/habitLooks.ts`,
  member's choice in `habitSetup.looks/counters`; counter numbers in `students.habitCounts` (sent 1.2 s after the last tap).
  One habit editor (2026-10-28): the habit window's ✏️ (`HabitCardEditor`); the rows only have „›“.
- **ოსტატობა** (2026-10-27): „დღის სავარჯიშო“ on top (a teacher's assigned exercise, then the weakest marked tip, then by
  day), 11 performance tips (`MANERA_ITEMS`; `num` is the key of teachers' marks, the list shows the position; 10 = დგომა,
  11 = სუნთქვა ფრაზებს შორის were added) and 4 exercise groups — სმენა, სამხმიანობა, ხალხური ხერხები, რიტმი
  (`data/vocalDrills.ts`; a tip is drill `tip-<num>`). Every drill = lesson + timed exercise (`DrillSheet` in
  `components/mastery/ManeraLessonSheet.tsx`): synth notes from a low/high base, three voices with the student's own left
  out, a click (bpm/bar/accents), a mic tuner + recording (≤90 s) sent to teachers (`drillTakes/{uid}/takes/{drillId}`,
  rules published by the workflow; teachers hear them in the member's window, `DrillReview`). „შევასრულე“: device days
  (`utils/maneraPractice.ts`) + `students.drillDone.{id}` = last day. Teachers can assign an exercise (`assignments.exercise`).
- **მედავითნეობა** (page `medavitneoba`, built 2026-10-27): the reader's course on the vine's „მედავითნეობა“ label
  (section `medavitneobaTopic`, „მალე“ until the admin opens it). 8 lessons in `data/medavitneLessons.ts`, shown step by
  step (learn / order / read aloud / quiz / task) in `pages/MedavitneobaPage.tsx` + `pages/medavitneoba/parts.tsx`; the
  open lesson is `mapItem`. Prayer texts copied from the app's ლოცვანი, psalms cut from the kathismas (`loadPsalmHtml`),
  the Apostle from `public/bible/`. Recording one's reading stays in the browser. Progress in `students.medavitne`
  (`hooks/useMedavitneProgress.ts`). Content not yet checked by a priest/regent — the page says so.
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
- **Class page** (`pages/ClassPage.tsx`, rebuilt 2026-10-24): members in a sticky left column on a computer (`lg`), a
  folded line on top on a phone; the class's teachers get `ClassRoll` (`teacher/StudentsOverview.tsx`: attendance ✓,
  💬, a name opens the member's window, now with „მიწერა“/„ამოღება“). „სასწავლო პროგრამა“ (renamed everywhere from
  „კლასის პროგრამა“) is compact: one thin progress bar, „დავალებები“ folding open beside the title (red dot = an
  assignment still to do; teachers manage them there — `AssignmentsFold`, past ones under „ძველი · N“). The program is
  changed in place by its ✎ (`ProgramEditor`); the members card's „+“ adds one person (`AddMemberSheet`). The timetable is one line of chips under the
  class title (and under the chat's title on the messages page), changed by ✎ (`ScheduleSheet`). Teacher-only parts never show to members; attendance is teacher-only in
  `firestore.rules` too (members no longer read it).
- **Games hub** (`pages/GamesPage.tsx`, 2026-10-27): „თამაშები“ is a hub of three category tabs (მუსიკალური · ქართული ·
  ცოცხალი) from `data/games.ts`; every game carries its variant chips (ონლაინ · ჰიბრიდული · უტელეფონო); unbuilt games are
  „მალე“ rows; the vine label „თამაშები“ opens it. The pearls game stays the round button of „საგანძურის გზა“ (below), now
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
- **Printable board games (2026-10-28, fourth PR)**: the „უტელეფონო“ variant of the six board games (plan doc tab „6 სამაგიდო
  თამაში“) as A4 PDFs in `public/games/print/<id>.pdf` (not precached; `/games/print/` is in the PWA's navigateFallbackDenylist).
  Made by `node scripts/print-games/build.mjs [id…] [--previews=<dir>]` — HTML printed by Playwright's Chromium; shared pieces in
  `scripts/print-games/lib.mjs` (Noto Georgian fonts fetched into a gitignored folder, 3×3 sheets of 63×88 mm cards with crop marks,
  backs mirrored for long-edge duplex, ⌀25 mm token sheets, series stripe „საგანძურის თამაშები №N“, lucide icons as SVG), one module per
  game in `scripts/print-games/games/`. Every file prints „ყველაფერი ორმხრივად“: a module lists its physical sheets
  (`{ key, front, back? }`), `duplex()` makes each sheet two pages (a missing back = a labelled blank page) and the cover names
  sheets by number (`sheetNo`). Portraits are ornament placeholders until the user approves Gemini pictures. Built so far:
  „მეფის კარი“ (№6) and „სამშვილდის ღამე“ (№2). A game with sheets gets `print: { href, sheets }` in `data/games.ts`; its hub card
  shows a wine „დასაბეჭდი ფურცლები“ strip („PDF · N ფურცელი“) and its „უტელეფონო“ chip turns wine.

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
  Since 2026-10-20 three tabs on the „one window“ rule: წევრები (one list + count filters; a tap opens the
  person's window `admin/PersonSheet.tsx` — details, role, access, approve/refuse, profile edit), კლასები (class and
  group windows, shared `LeaderChips`), სკოლა (sections, most listened, backup + folded safety list). Numbers of the
  old სტატისტიკა tab live in `admin/StatsTab.tsx` hooks; old shortcut refs `admin:sections`/`admin:stats` still open.
- **Access** (`hooks/useAccess.ts`): guests see chant books + synth, prayers, song/მთქმელი names only (no
  recordings anywhere); kids' mode is switched by the teacher per student (`students.kidsMode`, no PIN).
- **Home buttons** (`utils/shortcuts.ts`, `components/home/ShortcutShelf.tsx`, `students.shortcuts`, ≤8; hidden
  until chosen; class `defaultShortcuts`). Class mode filters the chant lists to the class program.
- **Reminders Worker** (`worker/reminders/`, D1 + text pushes + group/assignment reminders): code is ready; the
  user must do the one-time setup from `docs/შეხსენებების-სერვერი.md` on their PC (D1, `FIREBASE_SA`, deploy).
- Dev check with made-up data: `VITE_EMULATORS=1 npm run dev` + Firebase emulators (auth 9099, firestore 8085).

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
- Emulator check: firebase-tools in the scratchpad; the auth emulator keeps the letters at
  `/emulator/v1/projects/<id>/oobCodes`; the app's Firestore database id is `ai-studio-…`, not `(default)`.

## Roadmap (ideas not built yet — confirm open questions with the user first)

Full plan (Georgian doc): https://claude.ai/code/artifact/f10aa016-d92d-4522-8968-2e6acba2d6ab

**Redesign in 8 stages (agreed 2026-10-25; audit of every page with 204 findings and the stage plan:
https://claude.ai/artifact/Q5taZYajdGvJEVpHmoHVEu).** Each stage = one PR, shown to the user with emulator
screenshots first. 1 საძირკველი — done (kit rules above). 2 class page = the only workplace (teacher panel removed,
psalter group inside the class). 3 library lighter (no plates under the books). 4 birthdays/name days page + push
5/3/1 days before (members see month list without year; teachers/admins all). 5 women's costume beside the chokha
(images by Gemini in the chokha's style, approved by the user first; girls open it first, by `nameGender`).
6 „მანერა“ → „ოსტატობა“ (exercises, tips, step-by-step lessons the teacher builds). 7 pearls game + AI teacher that
listens (Gemini through Firebase AI Logic). 8 calls on Android (wake lock, push, TURN key from the user).

1–3. Built (see above).
4. Pearls/chests game — built 2026-10-25 (redesign stage 7, branch `claude/dazzling-goodall-inv60p`). Since 2026-10-27
   the fifth round button „მარგალიტები“ of „საგანძურის გზა“ (`PathOrbs`, body `pearls/PearlChests.tsx`; the games page is
   the hub above), shown while section `margalitebi` is open (open by default). Chests in `data/pearls.ts` (first =
   vol. IX №58–77), the first phrase of the chosen voice from the book notes (`utils/pearls.ts` `phraseOf`), singing
   heard in the browser (`utils/pitch.ts`: YIN pitch, notes, key-free score; ≥80% polishes; `utils/singCapture.ts`),
   sheet `components/pearls/PearlSheet.tsx`. Best try in `students.pearls`, best take (MP3) in
   `pearlTakes/{uid}/takes/{versionId}`; the teacher hears it and approves („ჩათვლა“ → `students.pearlShine`, teachers
   only) in the member's window (`PearlReview`). „AI მასწავლებელი“ (`utils/aiTeacher.ts`, gemini-3.8-flash through
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
