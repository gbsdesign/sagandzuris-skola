import { useEffect, useState } from 'react';

// Which psalter group the group page shows (a person may read in several); remembered on this device.
const KEY = 'sg-psalter-group';
const CHANGED = 'sg-psalter-group-changed';

export const openPsalterGroup = (id: string) => {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(CHANGED));
};

const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export const useSelectedGroupId = () => {
  const [id, setId] = useState<string | null>(read);
  useEffect(() => {
    const sync = () => setId(read());
    window.addEventListener(CHANGED, sync);
    return () => window.removeEventListener(CHANGED, sync);
  }, []);
  return id;
};
