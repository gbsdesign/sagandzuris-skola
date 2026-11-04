// A game's printed kit, made in the browser and saved (2026-11-04: the kits of src/print/ are drawn by the app — no ready
// PDFs, so a kit follows every change of its game). The games hub's „სამაგიდო · PDF“ and a game's own „… · PDF“ share it.
// `make` gives the PDF, or null when the browser opened its print window instead (nothing to save).
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export type KitMake = (progress?: (done: number, total: number) => void) => Promise<Blob | null>;

/** a kit of src/print/ by its id (its file in src/print/games/) */
export const kitOf = (id: string): KitMake => progress => import('../../print/makeKit').then(m => m.makeKit(id, progress));

/** a file the browser made, saved under a readable name */
export const saveFile = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

/** making the kit: `run` makes and saves it as `<name>.pdf`; `note` = „მზადდება… N%“ / „ვერ შეიქმნა“ / '' */
export const useKitMaker = (make: KitMake, name: string) => {
  const [state, setState] = useState<'' | 'busy' | 'failed'>('');
  const [share, setShare] = useState(-1);
  const run = async () => {
    if (state === 'busy') return;
    triggerHaptic(8);
    setState('busy');
    setShare(-1);
    try {
      const pdf = await make((done, total) => setShare(total ? Math.round((done / total) * 100) : -1));
      if (pdf) saveFile(pdf, `${name}.pdf`);
      setState('');
    } catch {
      setState('failed');
      setTimeout(() => setState(''), 4000);
    }
  };
  const note = state === 'busy' ? `მზადდება…${share > 0 ? ` ${share}%` : ''}` : state === 'failed' ? 'ვერ შეიქმნა' : '';
  return { busy: state === 'busy', note, run };
};

/** a game page's own kit button: its icon becomes a spinner while the kit is made, the note follows the label */
export const KitButton: React.FC<{ id: string; name: string; icon: React.ReactNode; className: string; children: React.ReactNode }> = ({ id, name, icon, className, children }) => {
  const { busy, note, run } = useKitMaker(kitOf(id), name);
  return (
    <button type="button" onClick={() => { void run(); }} aria-busy={busy} className={`${className} cursor-pointer`}>
      {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : icon}
      {children}
      {note && <span className="font-normal opacity-75 tabular-nums">· {note}</span>}
    </button>
  );
};
