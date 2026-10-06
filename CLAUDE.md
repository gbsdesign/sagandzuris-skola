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
- Fixed/full-screen UI must respect `env(safe-area-inset-*)` (`viewport-fit=cover` is on); helpers
  `.safe-x`, `.safe-top`, `.safe-bottom`, `.safe-bleed` in `index.css`.

## Audio (recordings)

- Recordings stay in the user's Google Drive. Drive has no CORS, so every audio link goes through the Worker
  `https://sagandzuri-audio.mr-gabunia.workers.dev/<driveFileId>` (code `worker/drive-audio-proxy.js`).
  It allows only localhost:5173 and the pages.dev origin, and serves only `audio/*`.
- Binding: `getChantMedia(chantId, variantCode)` uses only the explicit `VARIANT_MEDIA` map in
  `chantMediaRegistry.ts` ("chant-N|variantCode" → registry key). No title guessing, no fallback tracks.
  Unbound variants show "ჩანაწერი ჯერ არ არის".
- New recording workflow: the user shares a Drive folder (1/2/3/სამივე mp3) and says which variant; bind the
  file ids in `chantMediaRegistry.ts`. Do NOT bind Drive `ნოტები` sheets — the app uses book notes only.
- Known issue: song `fs-e12` version „ქ.კ. (ვიდეოდან)“ points to an mp4 → Worker returns 502.

## Book sheet music + synthesizer

- Notes read from the chant books by OMR, stored as `public/notes/<book>/NNN.json` + `NNN-K.webp`:
  `book` (vol. I, Gelati), `feast` (II), `kk` (III Kartli-Kakheti), `triod` (IV), `v5` (V liturgy),
  `karb` (VII Karbelaant), `pat` (Patarava), `v9` (IX, scan).
- Data files placing them: `gelatiBookChants.ts`, `tsirvaChants.ts`, `feastBookChants.ts`,
  `triodionBookChants.ts`, `karbelaantBookChants.ts`, `pataravaBookChants.ts`, index files `*Index.ts`.
- The OMR scripts are not in the repo. `public/notes/kk/139.json` has a hand fix (B♮ held across a line break) —
  a re-export would undo it.
- Many placements of versions are my guesses the user hasn't reviewed — don't present them as confirmed.

## Main features (all published on main as of 2026-10-06, commit a2b345d)

- **Notes page** (`pages/notes/NotesPage.tsx`, `ProgramPage.tsx`, `context/NotesContext.tsx`): tapping a chant
  version opens a full notes page. Church mode (nothing can sound, only starting notes, screen on), paper
  colours (დღე/სანთელი/ღამე/ავტომატური), resume, next chant, offline save (`utils/offlineNotes.ts`),
  „დღევანდელი წირვა“ program by the regent (= admin) sent to a class (`hooks/useLiturgy.ts`).
  Hymnography ornaments: `data/hymnOrnaments.ts` + `public/hymn/`.
  The choir reads these notes live during the Liturgy: nothing may sound by accident, must work offline.
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
- **Class chat** with voice messages + Jitsi video call button (`components/classes/ClassChat.tsx`,
  `hooks/useClassChat.ts`, `utils/voiceRecorder.ts`, `utils/classCall.ts`). Voice MP3s are Firestore Bytes
  (no Firebase Storage).

## Roadmap (ideas not built yet — confirm open questions with the user first)

Full plan (Georgian doc): https://claude.ai/code/artifact/f10aa016-d92d-4522-8968-2e6acba2d6ab

1. Cleanup / security, teacher role scoped to own classes, invites.
2. **Psalter group**: each member gets a kathisma (1–20), shifts +1 on the 1st of the month; mark read, „აღება“.
3. Home shortcuts / pin button, kids or class restrict mode.
4. Pearls/chests game: listen → sing (mic pitch check) → teacher approves. First chest = vol. IX №58–77.
5. **My voice**: the user wants AI to learn their voice. Plan discussed 2026-10-06: speech via ElevenLabs
   voice cloning (supports Georgian); singing via RVC voice conversion (Applio on Google Colab — the user's
   PC has only a 2 GB MX130 GPU). Generated audio is made in advance and served like other recordings.
   Nothing built yet.

Pending small tasks the user mentioned: remove the old Drive `ნოტები` sheets from `chantMediaRegistry.ts`
(only when the user asks); bind mp3s for the folk songs marked `pendingWma` once uploaded to Drive.
