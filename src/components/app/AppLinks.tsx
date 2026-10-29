import React, { useEffect } from 'react';
import { useOpenShortcut } from '../home/ShortcutShelf';
import { WidgetSync } from './WidgetSync';
import { ShareHost } from './ShareHost';

// The Android app's ways in: a widget's or the icon menu's button opens /?open=sc&id=<shortcut id> (utils/shortcuts),
// the same buttons as the home shelf, with the same guest and kids' limits. App.tsx reads the address and calls
// requestShortcut; this host, inside every provider, opens it — also when the address came before the page was ready.

let pending: string | null = null;
const EVENT = 'sg-open-shortcut';

export const requestShortcut = (id: string) => {
  pending = id;
  window.dispatchEvent(new Event(EVENT));
};

const ShortcutLinkHost: React.FC = () => {
  const open = useOpenShortcut();
  useEffect(() => {
    const take = () => {
      if (!pending) return;
      const id = pending;
      pending = null;
      open(id);
    };
    take();
    window.addEventListener(EVENT, take);
    return () => window.removeEventListener(EVENT, take);
  }, [open]);
  return null;
};

export const AppLinks: React.FC = () => (
  <>
    <ShortcutLinkHost />
    <WidgetSync />
    <ShareHost />
  </>
);
