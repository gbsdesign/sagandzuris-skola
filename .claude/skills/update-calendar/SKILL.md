---
name: update-calendar
description: Download the next church-calendar year from orthodoxy.ge into the app (კალენდრის განახლება), with saint-life links. Use when the user asks to update the calendar, or when the 2027 year is needed (the 2026 file ends 13 Jan 2027).
---

# Update the church calendar

Talk in Georgian, step by step.

1. **Which year.** orthodoxy.ge keeps one folder per OLD-style year: folder 2026 = 14 Jan 2026 – 13 Jan 2027.
   The next one is 2027. Check it exists first:
   `https://www.orthodoxy.ge/calendar/2027/v2/01/0101.htm` — a 404 means not published yet; tell the user and stop.
2. **Test a few days:** `node scripts/fetch-church-calendar.mjs 2027 0101 2209 3003` prints those days
   (DDMM, old style). Compare them with the website by eye.
3. **Fetch the year:** `node scripts/fetch-church-calendar.mjs 2027` → `src/data/calendar/2027.json`.
   It links saint lives automatically (`scripts/lib/saint-lives-match.mjs`) and prints how many were linked
   (2026 had 1294 of 1850).
4. **No wiring needed:** `src/data/churchCalendar.ts` loads every `calendar/*.json` through
   `import.meta.glob`, so the new file is picked up automatically. Never read the calendar JSON files whole
   (they are ~900 KB) — Grep or read small ranges.
5. **Check:** `npm run typecheck`; open the footer calendar on a January 2027 date and on today's date.
   Don't add any "წყარო: orthodoxy.ge" line — the user removed those.
6. Report, and offer `/publish`.
