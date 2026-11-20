// The synthesizer's player docked at the notes page's bottom in the new look, like a music app (board
// x-notebi-sintezatori): the big ▶, „სინთეზატორი ▾“ (switch to the recording), the track with its two times, a ⋯ menu
// (სიძლიერე · ბურთულა · თავიდან), the fold's own pill on top (DockHandle), the voices, the tempo and „გამეორება“ (A–B). Drawn only — the notes page
// keeps the synthesizer, its refs and its handlers.
import React from 'react';
import { ChevronDown, CircleDot, Ellipsis, Headphones, Pause, Piano, Play, Repeat, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cx, FOCUS, Press, Seg, Stepper } from '../../../components/ui2';
import { MiniMenu } from './MiniMenu';
import { DockHandle } from './DockHandle';

type Track = Pick<React.HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel'>;

/** „სინთეზატორი ▾“ / „ჩანაწერი ▾“: what sounds, a small menu to switch (shared with the recording's player) */
export const SourceMenu: React.FC<{ now: 'synth' | 'rec'; onSynth?: () => void; onRec?: () => void; dark?: boolean }> = ({ now, onSynth, onRec, dark }) => {
  const label = now === 'synth' ? 'სინთეზატორი' : 'ჩანაწერი';
  const other = now === 'synth' ? onRec : onSynth;
  if (!other) return <h2 className="flex min-h-9 items-center text-body font-bold">{label}</h2>;
  return (
    <MiniMenu
      label="რა ჟღერს"
      items={[
        { id: 'synth', label: 'სინთეზატორი', icon: <Piano />, on: now === 'synth', onPick: () => { if (now !== 'synth') onSynth?.(); } },
        { id: 'rec', label: 'ჩანაწერი', icon: <Headphones />, on: now === 'rec', onPick: () => { if (now !== 'rec') onRec?.(); } },
      ]}
      trigger={(open, toggle, id) => (
        <Press
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          className={cx(
            'relative flex min-h-9 cursor-pointer items-center gap-1 self-start rounded-full text-body font-bold',
            'before:absolute before:-inset-1 [&_svg]:size-4',
            dark ? '[&_svg]:text-night-ink/70' : '[&_svg]:text-mut',
            FOCUS,
          )}
        >
          {label}
          <ChevronDown aria-hidden="true" strokeWidth={2.2} className={cx('transition-transform', open && 'rotate-180')} />
        </Press>
      )}
    />
  );
};

export const SynthPlayer: React.FC<{
  playing: boolean;
  onToggle: () => void;
  /** the chant has a recording: „სინთეზატორი ▾“ switches to it */
  onPickRec?: () => void;
  fillRef: React.RefObject<HTMLDivElement | null>;
  knobRef: React.RefObject<HTMLDivElement | null>;
  curRef: React.RefObject<HTMLSpanElement | null>;
  durRef: React.RefObject<HTMLSpanElement | null>;
  track: Track;
  /** the A–B part on the track */
  loopZone: React.CSSProperties | null;
  mixOpen: boolean;
  onMix: () => void;
  ballOn: boolean;
  onBall: () => void;
  onRestart: () => void;
  restartLabel: string;
  onFold: () => void;
  /** I, II, III … */
  voices: string[];
  allLabel: string;
  voiceOn: boolean[];
  /** one voice alone, or every voice */
  onVoice: (i: number | 'all') => void;
  volume: number[];
  onVolume: (i: number, v: number) => void;
  tempo: { idx: number; max: number; format: (i: number) => string; changed: boolean; onChange: (i: number) => void; onReset: () => void };
  loop: { stage: 0 | 1 | 2; title: string; onClick: () => void };
  /** „ჩემი ხმის გარეშე“ over the play row */
  minus?: React.ReactNode;
  /** in place of the voices while my voice is left out */
  minusVoices?: React.ReactNode;
  /** night paper: the card turns dark so nothing glares */
  dark?: boolean;
  /** a turned phone or a computer: „ჩემი ხმის გარეშე“, the voices and the tempo share one row (the notes keep the height) */
  row?: boolean;
}> = p => {
  const n = p.voices.length;
  const all = p.voiceOn.slice(0, n).every(Boolean);
  const ons = p.voiceOn.slice(0, n).map((on, i) => (on ? i : -1)).filter(i => i >= 0);
  const value = all ? 'all' : ons.length === 1 ? String(ons[0]) : '';
  const pickVoice = (id: string) => p.onVoice(id === 'all' ? 'all' : Number(id));
  const name = (v: string) => (n > 3 ? v : `${v} ხმა`);
  const dark = !!p.dark;
  const quiet = dark ? 'text-night-ink/70' : 'text-mut';

  const voicesPart = p.minusVoices
    ? (dark ? <div className="rounded-tile bg-surf p-1 text-ink">{p.minusVoices}</div> : p.minusVoices)
    : n > 4 ? (
      // more than four voices: a grid that wraps, never smaller than a finger
      <div role="group" aria-label="ხმები" className={cx('grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 rounded-tile p-1', dark ? 'bg-white/10' : 'bg-track')}>
        {p.voices.map((v, i) => (
          <Press
            key={v}
            aria-pressed={value === String(i)}
            onClick={() => pickVoice(String(i))}
            className={cx(
              'h-tap cursor-pointer rounded-full text-meta tabular-nums transition',
              value === String(i) ? 'bg-surf font-bold text-wine shadow-knob' : cx('font-semibold active:bg-ink/5', quiet),
              FOCUS,
            )}
          >
            {v}
          </Press>
        ))}
        <Press
          aria-pressed={all}
          onClick={() => pickVoice('all')}
          className={cx(
            'col-span-2 h-tap cursor-pointer rounded-full text-meta transition',
            all ? 'bg-surf font-bold text-wine shadow-knob' : cx('font-semibold active:bg-ink/5', quiet),
            FOCUS,
          )}
        >
          {p.allLabel}
        </Press>
      </div>
    ) : n > 1 ? (
      <Seg
        label="ხმები"
        value={value}
        onChange={pickVoice}
        items={[...p.voices.map((v, i) => ({ id: String(i), label: name(v) })), { id: 'all', label: p.allLabel }]}
        className={dark ? 'bg-white/10 [&_[aria-selected=false]]:text-night-ink/75' : undefined}
      />
    ) : null;

  const tempoPart = (
    <div className={cx('flex items-center gap-2', p.row && 'shrink-0')}>
      {p.tempo.changed ? (
        <Press
          onClick={p.tempo.onReset}
          aria-label="ტემპი: საწყისზე დაბრუნება"
          title="საწყისზე დაბრუნება"
          className={cx('flex h-tap cursor-pointer items-center gap-1 rounded-full pr-1 pl-1.5 text-body font-semibold [&_svg]:size-4', dark ? 'text-blush' : 'text-wine', FOCUS)}
        >
          ტემპი<RotateCcw aria-hidden="true" />
        </Press>
      ) : (
        <span className={cx('pl-1.5 text-body font-semibold', quiet)}>ტემპი</span>
      )}
      <Stepper
        label="ტემპი, ♩" value={p.tempo.idx} min={0} max={p.tempo.max} onChange={p.tempo.onChange} format={p.tempo.format}
        className={dark ? '[&_button]:bg-white/10 [&_button]:text-night-ink' : undefined}
      />
      {!p.row && <span className="flex-1" />}
      <Press
        onClick={p.loop.onClick}
        aria-label={p.loop.title}
        title={p.loop.title}
        className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none"
      >
        <span className={cx(
          'flex h-8 items-center gap-1.5 rounded-full px-3 text-meta font-bold whitespace-nowrap transition group-active:scale-95 [&_svg]:size-4',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
          p.loop.stage === 2 ? 'bg-wine text-white' : dark ? 'bg-white/10 text-blush' : 'bg-tint text-wine',
          p.loop.stage === 1 && cx('ring-2 ring-inset', dark ? 'ring-blush' : 'ring-wine'),
        )}>
          <Repeat aria-hidden="true" />
          {p.loop.stage === 0 ? 'გამეორება' : p.loop.stage === 1 ? 'ახლა — B' : 'A–B ✕'}
        </span>
      </Press>
    </div>
  );

  const mixPart = p.mixOpen && (
    <div className={cx('grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-x-3 gap-y-2 rounded-tile px-3 py-2.5', dark ? 'bg-white/5' : 'bg-page')}>
      {p.voices.map((v, i) => (
        <label key={v} className="flex min-w-0 flex-col gap-0.5 text-meta font-semibold">
          <span className="flex justify-between tabular-nums">{v} ხმა<em className={cx('font-normal not-italic', quiet)}>{Math.round(p.volume[i] * 100)}%</em></span>
          <input
            type="range" min={0} max={100} step={5} value={Math.round(p.volume[i] * 100)}
            onChange={e => p.onVolume(i, Number(e.target.value) / 100)}
            aria-label={`${v} ხმის სიძლიერე`}
            className="h-tap w-full cursor-pointer accent-wine"
          />
        </label>
      ))}
    </div>
  );

  return (
    <section aria-label="სინთეზატორი" className={cx('flex flex-col gap-2.5 rounded-card p-3 shadow-float', dark ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink')}>
      <DockHandle onFold={p.onFold} dark={dark} />
      {!p.row && p.minus}
      <div className="flex items-center gap-3">
        <Press
          onClick={p.onToggle}
          aria-label={p.playing ? 'პაუზა' : 'დაკვრა'}
          title={p.playing ? 'პაუზა' : 'დაკვრა'}
          className={cx(
            'flex size-13 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white transition',
            'active:scale-95 active:bg-wine-deep [&_svg]:size-[22px]',
            FOCUS,
          )}
        >
          {p.playing ? <Pause aria-hidden="true" fill="currentColor" /> : <Play aria-hidden="true" fill="currentColor" className="translate-x-px" />}
        </Press>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <SourceMenu now="synth" onRec={p.onPickRec} dark={dark} />
          <div
            className={cx('relative h-[5px] cursor-pointer touch-none rounded-full before:absolute before:inset-x-0 before:-inset-y-3.5', dark ? 'bg-white/15' : 'bg-track')}
            {...p.track}
          >
            {p.loopZone && <div className={cx('absolute inset-y-0 rounded-full', dark ? 'bg-blush/30' : 'bg-wine/25')} style={p.loopZone} />}
            <div ref={p.fillRef} className={cx('absolute inset-y-0 left-0 w-0 rounded-full', dark ? 'bg-blush' : 'bg-wine')} />
            <div ref={p.knobRef} className={cx('absolute top-1/2 left-0 -mt-1.5 -ml-1.5 size-3 rounded-full bg-surf shadow-knob ring-2', dark ? 'ring-blush' : 'ring-wine')} />
          </div>
          <div className={cx('flex justify-between text-cap tabular-nums', quiet)}>
            <span ref={p.curRef}>0:00</span>
            <span ref={p.durRef}>0:00</span>
          </div>
        </div>
        <MiniMenu
          label="სხვა"
          align="right"
          items={[
            { id: 'mix', label: 'სიძლიერე', icon: <SlidersHorizontal />, on: p.mixOpen, onPick: p.onMix },
            { id: 'ball', label: 'ბურთულა', icon: <CircleDot />, on: p.ballOn, onPick: p.onBall },
            { id: 'restart', label: p.restartLabel, icon: <RotateCcw />, onPick: p.onRestart },
          ]}
          trigger={(open, toggle, id) => (
            <Press
              onClick={toggle}
              aria-label="სხვა: სიძლიერე, ბურთულა, თავიდან"
              title="სხვა"
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? id : undefined}
              className={cx(
                'flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95 [&_svg]:size-5',
                dark ? 'bg-white/10 text-night-ink' : 'bg-page text-ink',
                FOCUS,
              )}
            >
              <Ellipsis aria-hidden="true" />
            </Press>
          )}
        />
      </div>

      {p.row ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {p.minus && <div className="shrink-0">{p.minus}</div>}
            {voicesPart && <div className="min-w-[220px] flex-1">{voicesPart}</div>}
            {tempoPart}
          </div>
          {mixPart}
        </>
      ) : (
        <>
          {voicesPart}
          {mixPart}
          {tempoPart}
        </>
      )}
    </section>
  );
};
