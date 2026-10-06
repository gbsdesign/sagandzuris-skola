# საგანძურის სკოლა — Claude-ის სამუშაო ჩანაწერი

> ეს ფაილი Claude-სთვისაა: ყოველ ახალ სესიაში (კომპიუტერზეც და ღრუბელშიც) ის ავტომატურად კითხულობს,
> რომ იცოდეს პროექტის წესები და აქამდე გაკეთებული საქმე. ქვემოთ ტექსტი ინგლისურადაა, რადგან ასე უფრო ზუსტია.
> შეცვლა თავისუფლად შეიძლება.

## How to work with this user (most important)

- **Write every message in Georgian**, including short progress notes deep inside long technical tasks.
  The user is a beginner: before acting, say in Georgian what you are about to do; after each step, say what
  was done ("✅ …"). Say which stage you are at on long tasks. No long silent tool chains.
- **Don't widen scope.** Change only what was asked (one chant means one chant). Ask before deleting or moving files.
- **Ask which files before heavy processing** when a request names files vaguely — the user was once charged
  for scanning the wrong books.
- **Visual quality matters**: this is a school app shown to students. Think the design through, check it at
  390px phone width before presenting. Rough visuals get rejected.
- **Roomy UI**: comfortable controls (play ~44–48px, icon buttons 36px); fit phones by wrapping, never by shrinking.
- **Never auto-scroll** a player to the playing line. No octave-leap checks in note audits.
- Never put the user's email in request headers/URLs (e.g. API User-Agent).

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
- Don't start subagents/workflows unless the user asks — each one re-reads the project from scratch.
- Progress notes in Georgian should be one or two short lines; save detail for the final summary.
- Don't re-read a file you just edited, and don't re-run a check that already passed.
- The user's task template is `docs/დავალების-შაბლონი.md`. If a request is unclear, ask one short
  question instead of exploring the whole codebase.

## Cloud sessions

- A cloud session sees only what is pushed to GitHub. Local-only things are NOT available there: the user's
  `Downloads` folder (PDF chant books, recordings, drawings), OMR scripts in old session scratchpads, Google Drive files.
- Work on a branch and open a pull request. **Merging into `main` publishes the live site within minutes**
  (Cloudflare Pages), so tell the user clearly what a PR changes before they merge.
- Firestore rules are published by hand in the Firebase console (no Firebase CLI). Cloudflare Workers are
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

## Audio and sheet music (details in `src/data/CLAUDE.md`)

- Recordings stay in the user's Google Drive and play through the Worker
  `https://sagandzuri-audio.mr-gabunia.workers.dev/<driveFileId>` (Drive sends no CORS headers).
  Binding is only the explicit `VARIANT_MEDIA` map — use `/add-recording`.
- Book notes (`public/notes/<book>/`) come from the chant-book PDFs by OMR; the OMR scripts are not in the repo.
  Many version placements are unreviewed guesses — don't present them as confirmed.

## Main features (all published on main as of 2026-10-06, commit a2b345d)

- **Notes page** (details in `src/pages/notes/CLAUDE.md`): tapping a chant version opens a full notes page
  with synth, recording, church mode and the regent's „დღევანდელი წირვა“ program. The choir reads these
  notes live during the Liturgy: nothing may sound by accident, must work offline.
- **Folk songs map** (`data/songsData.ts`, `components/maps/GeorgiaMap.tsx`) and **მთქმელი authors map**
  (`data/mtkmeliData.ts`, `MtkmeliMap.tsx`, shared `RegionPuzzleMap.tsx`). Full texts only for authors who
  died before 1956; others get title + description + wiki link.
- **Prayers** (`data/prayers.ts`, `public/prayers/`, `public/bible/`), psalter kathismas, 73 akathists,
  commemoration name lists (`utils/commemoration.ts`), prayer reminders via Web Push Worker
  `sagandzuri-reminders` (`worker/reminders/`; push works only on the deployed site).
- **Habits** ticked per day (`students/{uid}.habitLog`), 7-day strip `WeekStreak.tsx`, goals in `habitsAndManera.ts`.
- **Library** page (`biblioteka`): საღმრთო ისტორია, დღესასწაულები, წმიდანთა ცხოვრება.
  Footer church calendar (`data/churchCalendar.ts`, `data/calendar/<year>.json`, made by
  `node scripts/fetch-church-calendar.mjs <year>`). **The 2026 file ends 13 Jan 2027 — re-run for 2027 once
  orthodoxy.ge publishes it.** Don't add "წყარო: orthodoxy.ge" lines (the user removed them).
- **Saint lives** (`components/saints/SaintLifeOverlay.tsx`, `public/lives/`, linking in
  `scripts/lib/saint-lives-match.mjs`).
- **One search** (`components/search/`, index `data/searchIndex.ts`, matching `utils/searchMatch.ts` + test):
  header 🔍, home field, `/` or Ctrl+K. Finds functions, chants, prayers/akathists/Bible chapters („მათე 5“),
  psalter („ფს 50“), songs, chanters, feasts. Pages take the picked item via `useOpenRequest` (`utils/searchOpen.ts`).
- **Class chat** with voice messages + Jitsi video call button (`components/classes/ClassChat.tsx`,
  `hooks/useClassChat.ts`, `utils/voiceRecorder.ts`, `utils/classCall.ts`). Voice MP3s are Firestore Bytes
  (no Firebase Storage).

## Plan part 1 (built 2026-10-06, branch `claude/peaceful-dijkstra-9lbmeb`, PR gbsdesign/sagandzuris-skola#1)

- **Roles** (`context/AuthContext.tsx`, `firestore.rules`): owner (the founder's address) names ≤3 superadmins,
  superadmins name admins, admins name teachers; staff roles in `admins/{email}.role`. Teachers manage only
  their own classes (`classes.teacherIds`) and psalter groups; students' `teacherIds` give their teachers
  access (`becomingTeacher` rule). No regent role and **no invite links** (the user removed them): members
  are added from `directory/{uid}` (name + photo only). Rules test: `tests/firestore-rules.test.mjs` (emulator).
- **Psalter group** (`utils/psalter.ts` + `tests/psalter.test.ts`, `hooks/usePsalter.ts`, `pages/PsalterPage.tsx`,
  `components/psalter/`): cycles of 1–2 days restart on the 1st and 15th (Georgian time, UTC+4); kathismas
  move +1 on the 1st and 15th; skipped kathismas show only in history. Names at every დიდებაი.
- **Teacher panel** (`pages/TeacherPage.tsx`, `components/teacher/`), **admin panel** (`pages/AdminPanelPage.tsx`,
  `components/admin/`): recordings can be bound from the panel (`settings/recordings`, `data/runtimeRecordings.ts`,
  on top of `VARIANT_MEDIA`); sections open/მალე/hidden (`settings/sections`); JSON export.
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
- Emulator check: firebase-tools in the scratchpad; the auth emulator keeps the letters at
  `/emulator/v1/projects/<id>/oobCodes`; the app's Firestore database id is `ai-studio-…`, not `(default)`.

## Roadmap (ideas not built yet — confirm open questions with the user first)

Full plan (Georgian doc): https://claude.ai/code/artifact/f10aa016-d92d-4522-8968-2e6acba2d6ab

1–3. Built (see above).
4. Pearls/chests game: listen → sing (mic pitch check) → teacher approves. First chest = vol. IX №58–77.
5. **My voice**: the user wants AI to learn their voice. Plan discussed 2026-10-06: speech via ElevenLabs
   voice cloning (supports Georgian); singing via RVC voice conversion (Applio on Google Colab — the user's
   PC has only a 2 GB MX130 GPU). Generated audio is made in advance and served like other recordings.
   Nothing built yet.

Pending small tasks the user mentioned: remove the old Drive `ნოტები` sheets from `chantMediaRegistry.ts`
(only when the user asks); bind mp3s for the folk songs marked `pendingWma` once uploaded to Drive.
