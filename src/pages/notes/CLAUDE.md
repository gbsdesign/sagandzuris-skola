# src/pages/notes — notes page, church mode, liturgy program

The choir reads these notes **live during the Divine Liturgy**, standing in the church. Design for that:
nothing may sound by accident, readable in dim light, screen stays on, works offline, page turns without fuss,
moving to the next chant in service order.

## Files

- `NotesPage.tsx` + `notes.css` (`np-` classes): the full-screen notes page. Top bar with small icon+label tools
  (სინთეზატორი, ჩანაწერი, ტექსტი, ჩემი სია, მეტი) that open their panels. Pinch-zoom, remembered separately
  for upright / turned / computer.
- `ProgramPage.tsx` + `program.css`: „დღევანდელი წირვა“ — the teacher's chosen versions for a date.
- `NpStepper.tsx`: small +/- stepper (tone ±7).
- `src/context/NotesContext.tsx`: overlay pages + browser history/URL (`?c=&v=` for a chant, `?p=date~ids` for
  a program), church-mode state.
- `src/hooks/useLiturgy.ts`: the class's teacher (admins: any class) composes it; there is no regent role. Draft in `users/{uid}/settings/liturgy`, templates in
  `…/liturgyTemplates`, "send" writes `classes/{id}.liturgy`; members read it (cached in localStorage).
- `src/utils/offlineNotes.ts`: Cache `sagandzuri-notes-v1`, shared with Workbox runtimeCaching in `vite.config.ts`.
- `src/data/hymnOrnaments.ts` + `public/hymn/top-NN|bottom-NN.webp`: drawings above the first page and below the
  last page of a chant (never at the sides). Black-and-white ones are inverted at night.
- `src/pages/galoba/LiturgyBits.tsx`: ProgramCard, ServiceDownload.

## Behaviour the user chose

- **Church mode**: synth and recording cannot sound; only the starting-notes button stays; top bar hidden;
  screen stays on. "✕ გამოსვლა" + "შემდეგი: …" sit at the top under the tone stepper.
- **Starting notes**: first note of each voice, top to bottom I → II → III, 0.8 s each, 0.5 s apart;
  they follow the tone setting.
- **Paper colour**: დღე / სანთელი / ღამე / ავტომატური. Gentle motion only.
- Resume where you stopped; next/previous chant in service or program order.
- Tap-a-line plays only while the synth panel is open. Playing one player stops the other.
- **Never auto-scroll** to the playing line.
- Book notes only — no Drive `ნოტები` fallback anywhere.
- Share: WhatsApp / Facebook / Messenger / Instagram inside "მეტი" (Instagram copies the link; on phones use
  `navigator.share`).

Not testable headless without the emulators: teacher flows (need login). Mount the component in a temporary page with a mock
provider if you need a screenshot, and delete it afterwards.
