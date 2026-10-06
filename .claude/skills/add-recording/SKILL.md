---
name: add-recording
description: Bind a new chant recording from a Google Drive folder to a chant version (ჩანაწერის მიბმა). Use when the user sends a Drive folder link and says which chant/variant it belongs to.
---

# Add a recording

Talk to the user in Georgian; say what you're doing before each step.

1. **Get the inputs.** You need: the Drive folder link, and which chant + version (e.g. „მხოლოდ-შობილი, გ.ს.“
   or a screenshot of the version row). If either is missing, ask — don't guess.
2. **List the folder.** Use the Google Drive connector (search/list files in the folder id). Expect mp3 files
   named for voices: 1 / 2 / 3 / სამივე (all). If the connector isn't available (e.g. in a cloud session), ask
   the user to paste the file links instead. Files must be shared "Anyone with the link".
   - `.wma` or video files won't play (the Worker serves only `audio/*`) — tell the user to upload mp3.
3. **Find the chant id and variant code.** Search `src/data/` (Grep the chant's title) for its `chant-N` id and
   the exact variant code string (e.g. `გ.ს.`, `გ.ს. გამშვ`, `ქ.კ.`). Don't read the big data files whole.
4. **Add a registry entry** in `src/data/chantMediaRegistry.ts`, inside `CHANT_MEDIA_REGISTRY` before the closing
   `};` (Grep for `export const AUDIO_PROXY` — the registry ends just above it). Copy the shape of entry `"27"`:
   `key` (next free number), `title`, `folderId`, `folderUrl`, `voice1Url`…`allVoicesUrl` and `tracks` as
   `https://drive.usercontent.google.com/download?id=<fileId>&export=download`, `availableVoices`, and
   `notes: []` (never bind Drive note sheets — the app uses book notes).
5. **Bind it** in `VARIANT_MEDIA` (same file, near line 1320): `'chant-N|<variantCode>': '<key>',  // title`.
   This map is the only binding — no title guessing.
6. **Check.** `npm run typecheck`. Then open each track through the Worker
   `https://sagandzuri-audio.mr-gabunia.workers.dev/<fileId>` (HEAD/GET) and confirm `audio/*` with status 200.
   The Worker allows only localhost:5173 and the pages.dev origin, so test playback in the app there.
7. Tell the user what was bound, and offer `/publish`.
