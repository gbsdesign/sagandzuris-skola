// The recording's player docked at the notes page's bottom in the new look — the synthesizer's twin: „ჩანაწერი ▾“
// (back to the synthesizer), the fold's own pill on top (DockHandle, as on the synthesizer), the performer when there are several, then the recording's own player
// (ChantPlayer, given as children). It stays mounted while folded, so a recording plays on.
import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cx, FOCUS } from '../../../components/ui2';
import { SourceMenu } from './SynthPlayer';
import { DockHandle } from './DockHandle';

export const RecPlayer: React.FC<{
  /** folded away (the recording may still play) */
  hidden: boolean;
  /** the synthesizer exists: „ჩანაწერი ▾“ switches back to it */
  onPickSynth?: () => void;
  onFold: () => void;
  /** whose recordings there are; the pick shows only with more than one */
  performers: string[];
  performer: number;
  onPerformer: (i: number) => void;
  dark?: boolean;
  /** the recording's player itself */
  children: React.ReactNode;
}> = ({ hidden, onPickSynth, onFold, performers, performer, onPerformer, dark, children }) => (
  <section
    aria-label="ჩანაწერი"
    hidden={hidden}
    className={cx('flex flex-col gap-2.5 rounded-card p-3 shadow-float', dark ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink')}
  >
    <DockHandle onFold={onFold} dark={dark} />
    <div className="flex items-center gap-3 pl-1">
      <div className="flex min-w-0 flex-1">
        <SourceMenu now="rec" onSynth={onPickSynth} dark={dark} />
      </div>
    </div>
    {performers.length > 1 && (
      <label className="relative flex items-center gap-2.5">
        <span className={cx('shrink-0 pl-1 text-meta font-semibold', dark ? 'text-night-ink/70' : 'text-mut')}>შემსრულებელი</span>
        <select
          value={performer}
          onChange={e => onPerformer(Number(e.target.value))}
          aria-label="შემსრულებლის არჩევა"
          className={cx(
            'h-tap min-w-0 flex-1 cursor-pointer appearance-none truncate rounded-field pr-10 pl-3.5 text-body font-bold outline-none',
            dark ? 'bg-white/10 text-night-ink' : 'bg-page text-ink',
            FOCUS,
          )}
        >
          {performers.map((p, i) => <option key={i} value={i}>{p}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className={cx('pointer-events-none absolute right-3 size-[18px]', dark ? 'text-blush' : 'text-wine')} />
      </label>
    )}
    {/* the recording's player draws itself with the notes page's own colours (np-recvars, notes.css) */}
    <div className="np-recvars">{children}</div>
  </section>
);
