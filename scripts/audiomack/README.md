# Audiomack ↔ Drive (2026-11-11)

The Folklore Centre's songs play from Audiomack (audiomack.com/folkcentre); the school's Drive copy stays for the
learning mode, offline and MP3. Work folder: `/tmp/am`.

0. `albums.txt` = the 299 album slugs of audiomack.com/folkcentre/albums (read in the browser: the page loads them by
   „Load More“, the site's API needs a sign-in). Fetch each page:
   `mkdir -p /tmp/am/alb && xargs -P 8 -I{} curl -sS "https://audiomack.com/folkcentre/album/{}" -o /tmp/am/alb/{}.html < albums.txt`
1. `python3 1-albums.py` → `/tmp/am/albums.json` (every album's tracks from the page's JSON-LD: name, slug, length).
2. `python3 2-durations.py` → `/tmp/am/drivedur.json` (each Drive file's length from its first bytes through the audio
   Worker; ~40 min, resumable).
3. `python3 3-match.py` → `/tmp/am/match2.json`: a Drive album is paired with the Audiomack album most of its files
   match; a file matches a track of the same title (Latin titles turned Georgian) within 1.5 s (2 s for the same
   title), voice for voice; untitled ones („ტრეკი“) only when no other track is near that length; a learning album's
   song (all voices, I, II, III) goes by its order. Weak albums are left out.
4. `python3 4-emit.py` → `public/centre/am/<n>.json` (read by `data/audiomack.ts`).
