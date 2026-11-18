// A widget's or the icon menu's button (/?open=sc&id=<shortcut id>): App.tsx asks here, and AppLinks' host (loaded a moment
// after the start — redesign stage 3) opens it when it mounts, so an early request is never lost.

let pending: string | null = null;
export const SHORTCUT_EVENT = 'sg-open-shortcut';

export const requestShortcut = (id: string) => {
  pending = id;
  window.dispatchEvent(new Event(SHORTCUT_EVENT));
};

/** the waiting shortcut, once */
export const takeShortcut = (): string | null => {
  const id = pending;
  pending = null;
  return id;
};
