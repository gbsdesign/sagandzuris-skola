# src/pages/notes — notes page, church mode, liturgy program

The choir reads these notes **live during the Divine Liturgy**, standing in the church. Design for that:
nothing may sound by accident, readable in dim light, screen stays on, works offline, page turns without fuss,
moving to the next chant in service order.

## Files

- `NotesPage.tsx` + `notes.css` (`np-` classes): the full-screen notes page. Top bar with small icon+label tools
  (სინთეზატორი, ჩანაწერი, ტექსტი, [წირვა], ჩემი სია, მეტი) that open their panels; an upright phone keeps at most
  five (ტექსტი is a row in „მეტი“ there; under 360px icons only). Pinch-zoom, remembered separately
  for upright / turned / computer. The tone is set once, beside „საწყისი ბგერა“ (the recording panel's own is 🎧 ტონი).
  „ტაძრის რეჟიმი“ is the round ⛪ beside „სწავლა“ (not in „მეტი“).
- `ProgramPage.tsx` + `program.css`: „დღევანდელი წირვა“ — the teacher's chosen versions for a date.
- `NpStepper.tsx`: small +/- stepper (tone ±7).
- „სწავლა“ (`.np-learn`, beside the zoom; not in the crowded top bar) opens `components/learn/LearnMode.tsx` over
  the page (portal on body, its own `sgLearn` history entry). The home card „დღეს გასამეორებელი“ opens it straight away
  through `requestLearn(piece)` → `takeLearn(vid)` once the score has loaded.
- `src/utils/sheetReflow.ts`: chants whose book page sets lines side by side (litanies, ~17 chants) are cut on
  the picture into pieces shown one under another, up to 2× bigger (cuts found from the ink at load time).
- `src/context/NotesContext.tsx`: overlay pages + browser history/URL (`?c=&v=` for a chant, `?p=date~ids` for
  a program), church-mode state.
- `src/hooks/useLiturgy.ts`: the class's teacher (admins: any class) composes it; there is no regent role. Drafts per class in `users/{uid}/settings/liturgy` (`drafts.{classId}`; none → the class's last sent), templates in
  `…/liturgyTemplates`, "send" writes `classes/{id}.liturgy`; members read it (cached in localStorage).
- `src/utils/offlineNotes.ts`: Cache `sagandzuri-notes-v1`, shared with Workbox runtimeCaching in `vite.config.ts`.
- `src/data/hymnOrnaments.ts` + `public/hymn/top-NN|bottom-NN.webp`: drawings above the first page and below the
  last page of a chant (never at the sides). Black-and-white ones are inverted at night.
- `src/pages/galoba/LiturgyBits.tsx`: ProgramCard, ServiceDownload.

## Behaviour the user chose

- **Church mode** (2026-10-16): the notes are the main thing. Synth and recording cannot sound; top bar hidden;
  screen stays on. One slim line on top: ✕ · title · starting notes + tone · next (upright phone: no title).
  Zoom buttons, page labels, top/bottom drawings and ornaments are hidden (pinch / Ctrl+wheel still zoom).
- **Ink**: every paper colour darkens grey edges (`brightness(.75) contrast(2)` in `--sheet-filter`).
- **Starting notes**: first note of each voice, top to bottom I → II → III, 0.8 s each, 0.5 s apart;
  they follow the tone setting.
- **Paper colour**: დღე / სანთელი / ღამე / ავტომატური. Gentle motion only. Chosen 2026-10-19 for the eyes:
  სანთელი = a book's sepia page (cream paper lighter than the ground, dark-brown ink); ღამე = soft (warm grey ink
  ~9:1, never near-white). Coloured drawings with dark lines are listed in `DARK_LINES` (hymnOrnaments.ts).
- Resume where you stopped; next/previous chant in service or program order.
- Tap-a-line plays only while the synth panel is open. Playing one player stops the other.
- **Never auto-scroll** to the playing line.
- **Synth ball** (2026-10-28, reworked 2026-10-30): a small ball (`.np-ball`, a 9.6px dot inside an invisible 40px handle)
  glides on the top edge of the playing line — its x is estimated from note lengths (`markerAt`, as in „სწავლა“), not exact.
  Shown while the synth plays and while it stands paused mid-way (hidden at the start/end and in church mode). Under it a
  narrow soft stripe over all the voices (`.np-col`, `--dusk-col`) marks the notes sounding now. A finger drags the ball to
  any line; it snaps to the nearest note start (`beatAt`, the inverse of `markerAt`) and on release the synth plays from there,
  also from a pause. On/off by the ◉ button in the synth panel (`sagandzuri_ball`, on by default, remembered on the device).
- **„გუნდი მომყვება“** (2026-10-29, the user's choice: the phones turn by themselves): on the program page the teacher turns
  it on (needs the program sent; `sg-lead` in sessionStorage); every chant they open from the program goes into the class
  document's `live` { vid, at, by } (`liturgy.lead`; no rules change — teachers may update their class). A member whose program
  page or program notes is open follows a fresh lead (< 4 h, `liveNow`) — `NotesContext`; elsewhere in the app nothing opens.
  The member's line „რეგენტი ახლა: …“ has „მივყვები“ to stop following.
- **Many voices** (2026-10-29): up to X (the anthology's 10-voice litanies, vol. II №211–217). Over four voices the synth's
  voice buttons take their own row and wrap into a grid (≥44 px each), the mixer wraps too; the synth's level drops by
  √(3/n) so any number of voices sounds as loud as three; bass timbre for 5 or 7–10 voices by each voice's average pitch.
- Book notes only — no Drive `ნოტები` fallback anywhere.
- Share: WhatsApp / Facebook / Messenger / Instagram inside "მეტი" (Instagram copies the link; on phones use
  `navigator.share`).

Not testable headless without the emulators: teacher flows (need login). Mount the component in a temporary page with a mock
provider if you need a screenshot, and delete it afterwards.
