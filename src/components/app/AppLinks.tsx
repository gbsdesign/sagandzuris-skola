import React, { useEffect } from 'react';
import { useOpenShortcut } from '../home/ShortcutShelf';
import { WidgetSync } from './WidgetSync';
import { ShareHost } from './ShareHost';
import { WidgetLinkAsk } from './WidgetLinkAsk';
import { SHORTCUT_EVENT, takeShortcut } from './appLinkRequests';

// The Android app's ways in: a widget's or the icon menu's button opens /?open=sc&id=<shortcut id> (utils/shortcuts),
// the same buttons as the home shelf, with the same guest and kids' limits. App.tsx reads the address and calls
// requestShortcut; this host, inside every provider, opens it — also when the address came before the page was ready.

export { requestShortcut } from './appLinkRequests';

const ShortcutLinkHost: React.FC = () => {
  const open = useOpenShortcut();
  useEffect(() => {
    const take = () => {
      const id = takeShortcut();
      if (id) open(id);
    };
    take();
    window.addEventListener(SHORTCUT_EVENT, take);
    return () => window.removeEventListener(SHORTCUT_EVENT, take);
  }, [open]);
  return null;
};

export const AppLinks: React.FC = () => (
  <>
    <ShortcutLinkHost />
    <WidgetSync />
    <ShareHost />
    <WidgetLinkAsk />
  </>
);
