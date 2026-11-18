// Panels on the path page fold open in place (no popups) and always start folded. Other places (the header,
// home buttons) can open one: openPathPanel('work') leaves a one-time wish and tells a mounted panel to
// unfold and scroll into view; the panel uses the wish up, so the next visit finds it folded again.
export const PANEL_KEY = (id: string) => `pathPanel:${id}`;
export const PANEL_EVENT = 'open-path-panel';

// "habits" (the vine's and the home shelf's „ჩვევები“) = the „ჩვევები“ round button's card, id `work` since 2026-11-08 —
// it used to be dropped as always shown, so the path opened with the habits folded (the user, 2026-11-09)
const ALIASES: Record<string, string> = { habits: 'work' };

export const openPathPanel = (wish: string) => {
  const id = ALIASES[wish] ?? wish;
  try {
    localStorage.setItem(PANEL_KEY(id), '1');
  } catch { /* storage off: the event still opens it */ }
  window.dispatchEvent(new CustomEvent(PANEL_EVENT, { detail: id }));
};
