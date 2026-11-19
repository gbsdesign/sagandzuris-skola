// „მაჩვენე ეკრანზე“ (board x-idea-adgilze-2): the button an answer speaks of is lit for a moment where it stands. A page marks
// it with `data-help="<answer id> …"` (several ids, spaces between) — the place itself: the button that does it, or the card
// it is on. A button only on the way there (the profile's ⚙ for the reminders, the path's „საგანძური“ row) is marked
// `data-help-way="…"`: the page's „?“ lights it, „მკითხე“'s „გადამიყვანე იქ“ goes on past it. The notes page's own parts,
// which this area may not touch, are found by their names instead (EXTRA). The ring itself is index.css's `.sg-help-lit`
// (none for reduced motion: it only stays still).

const EXTRA: Record<number, string[]> = {
  // the notes page (pages/v2/notes: BottomBar, SynthPlayer)
  2: [
    '[aria-label="სინთეზატორი"] [role="group"][aria-label="ხმები"]', '[role="group"][aria-label="ხმები"]',
    '[aria-label="სინთეზატორი"]', '[aria-label="ნოტების ხელსაწყოები"]',
  ],
  3: ['[aria-label="ნოტების ხელსაწყოები"] [title^="სასწავლო რეჟიმი"]'],
  6: ['[aria-label="სინთეზატორი"]', '[aria-label="ნოტების ხელსაწყოები"]'],
  7: ['[aria-label="ნოტების ხელსაწყოები"] [title="მეტი"]'],
  8: ['[aria-label="ნოტების ხელსაწყოები"] [title="მეტი"]'],
  9: ['[aria-label="ნოტების ხელსაწყოები"] [title^="ტაძრის რეჟიმი"]'],
  // the chat's microphone (components/classes/ChatPanel)
  15: ['button[aria-label="ხმოვანი შეტყობინების ჩაწერა"]'],
  // the prayer page's „ავტო“ (its own wrapper lays out the tools' row — no mark of ours around it)
  21: ['[aria-label="კითხვის ხელსაწყოები"] > span > button'],
};

const LIT_MS = 1400;

/** on the screen and not under something that lies over it (the notes page over the list, a closing window) */
const shown = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0 || getComputedStyle(el).visibility === 'hidden') return false;
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  // off the screen now: it is brought into view when lit
  if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return true;
  const hit = document.elementFromPoint(x, y);
  return !hit || el === hit || el.contains(hit);
};

/** the element an answer speaks of on the screen now, or null; `ways`: a button on the way there counts too */
export const helpTarget = (id: number, ways = true): HTMLElement | null => {
  const tries = [`[data-help~="${id}"]`, ...(EXTRA[id] ?? []), ...(ways ? [`[data-help-way~="${id}"]`] : [])];
  for (const sel of tries) {
    let found: Element[] = [];
    try { found = Array.from(document.querySelectorAll(sel)); } catch { /* a selector the browser cannot read */ }
    const el = found.find(shown);
    if (el) return el;
  }
  return null;
};

/** Lights it for a moment (brought into view first when it is off the screen). False when it is not here. */
export const lightHelp = (id: number, ways = true): boolean => {
  const el = helpTarget(id, ways);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('sg-help-lit');
  // restart the ring when it is lit again soon
  void el.offsetWidth;
  el.classList.add('sg-help-lit');
  window.setTimeout(() => el.classList.remove('sg-help-lit'), LIT_MS);
  return true;
};

/** After going to another page: light the button once it has come (a lazy page may take a moment). */
export const lightSoon = (id: number, tries = 10) => {
  const step = (left: number) => {
    if (lightHelp(id) || left <= 0) return;
    window.setTimeout(() => step(left - 1), 250);
  };
  window.setTimeout(() => step(tries), 450);
};
