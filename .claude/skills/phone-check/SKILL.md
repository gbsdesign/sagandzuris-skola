---
name: phone-check
description: Check how a page looks and fits on phones (ტელეფონზე შემოწმება) — screenshots at 360/390 px and landscape, overflow and overlap check. Use after layout or visual changes, or when the user asks how something looks on a phone.
---

# Phone check

Talk in Georgian. Ask which page(s) if the user didn't say.

1. **Serve the app.** Prefer a build preview (steady while other sessions edit):
   `npx vite build --outDir <scratch>/dist` then `npx vite preview --outDir <scratch>/dist --port 5291`.
   On the user's PC a dev server may already run on localhost:5173 — check before starting another.
2. **Open it in headless Chrome** (on the user's PC: `C:/Program Files/Google/Chrome/Application/chrome.exe`;
   in the cloud use Playwright/Chromium if available — if no browser exists, say so and stop).
   - Windows needs these flags or frames freeze: `--disable-features=CalculateNativeWinOcclusion
     --disable-backgrounding-occluded-windows --disable-renderer-backgrounding
     --disable-background-timer-throttling`, plus `Page.bringToFront`.
   - Use your own CDP port (not 9333 — parallel sessions use it).
   - Phone widths via `Emulation.setDeviceMetricsOverride` with `mobile: true`: 320, 360, 390, 430, and
     844×390 landscape. `Emulation.setSafeAreaInsetsOverride` emulates the iPhone notch.
3. **Navigate.** The app has no URL routes: pages are chosen through `history.state.sgNav`
   (NavigationContext). Notes pages use `?c=<chantId>&v=<variantId>`. Logged-in pages need a temporary
   preview page with a mock provider — delete it afterwards.
4. **Look for problems:** anything sticking out sideways, overlapping text, text spilling out of its box,
   controls under the notch/home bar (fixed UI must use `env(safe-area-inset-*)`), buttons too small.
5. **Fix by wrapping or moving, never by shrinking controls** (play ~44–48 px, icon buttons 36 px).
   The user rejects cramped or cheap-looking results — look at the screenshots yourself before showing them.
6. Report in Georgian with the screenshots and what was changed.
