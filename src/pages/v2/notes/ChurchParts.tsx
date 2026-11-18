// Church mode in the new look (board x-tadzris-rezhimi): a dark line over the notes (✕ · the tone · the starting notes)
// and a dark card at the bottom that goes to the next chant. Only the starting notes sound here.
import React from 'react';
import { ArrowRight, Minus, Plus, X } from 'lucide-react';
import { cx, FOCUS, Press, RoundButton } from '../../../components/ui2';
import { Fork, StartDots } from './BottomBar';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');

const toneButton = cx(
  'flex h-tap w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-90',
  'disabled:cursor-default disabled:opacity-35 disabled:active:scale-100 [&_svg]:size-[18px]',
  FOCUS,
);

export const ChurchBar: React.FC<{
  onExit: () => void;
  /** a turned phone or a computer has room for the name */
  title?: string;
  tone?: { value: number; onChange: (v: number) => void };
  /** the starting notes; only when the chant has notes that sound */
  onStart?: () => void;
  dots: boolean[];
  voices: number;
}> = ({ onExit, title, tone, onStart, dots, voices }) => (
  <header className="flex items-center gap-2.5 px-4 pt-1 pb-2.5 text-night-ink">
    <RoundButton label="ტაძრის რეჟიმიდან გამოსვლა" tone="glass" onClick={onExit}><X /></RoundButton>
    {title
      ? <h2 className="min-w-0 flex-1 truncate text-lead font-bold">{title}</h2>
      : <span className="flex-1" />}
    {tone && (
      <div role="group" aria-label="ტონი" className="flex h-tap shrink-0 items-center rounded-full bg-white/15 px-1 text-white">
        <Press aria-label="ტონი დაბლა" disabled={tone.value <= -7} onClick={() => tone.onChange(tone.value - 1)} className={toneButton}>
          <Minus strokeWidth={2.2} />
        </Press>
        <output aria-live="polite" className="px-1 text-body font-bold whitespace-nowrap tabular-nums">ტონი {signed(tone.value)}</output>
        <Press aria-label="ტონი მაღლა" disabled={tone.value >= 7} onClick={() => tone.onChange(tone.value + 1)} className={toneButton}>
          <Plus strokeWidth={2.2} />
        </Press>
      </div>
    )}
    {onStart && (
      <RoundButton label="საწყისი ბგერა: ხმების პირველი ბგერა რიგრიგობით" tone="glass" onClick={onStart}>
        <Fork />
        <StartDots lit={dots} count={voices} dark className="absolute bottom-1 left-1/2 -translate-x-1/2" />
      </RoundButton>
    )}
  </header>
);

export const ChurchNext: React.FC<{
  /** the next chant, or none at the end */
  next: { title: string; sub: string } | null;
  /** what the last chant's card says under „ბოლო საგალობელია“ */
  endNote: string;
  onNext: () => void;
}> = ({ next, endNote, onNext }) => (
  <div className="flex items-center gap-3 rounded-card bg-night-surf/95 py-3 pr-3 pl-[18px] text-night-ink shadow-float backdrop-blur-md">
    <div className="min-w-0 flex-1">
      {next ? (
        <>
          <div className="text-meta text-night-ink/70">შემდეგი</div>
          <div className="truncate text-head font-bold">{next.title}</div>
          {next.sub && <div className="truncate text-meta text-night-ink/70">{next.sub}</div>}
        </>
      ) : (
        <>
          <div className="truncate text-head font-bold">ბოლო საგალობელია</div>
          {endNote && <div className="truncate text-meta text-night-ink/70">{endNote}</div>}
        </>
      )}
    </div>
    <Press
      onClick={onNext}
      disabled={!next}
      aria-label={next ? `შემდეგი: ${next.title}` : 'ბოლო საგალობელია'}
      title={next ? `შემდეგი: ${next.title}` : 'ბოლო საგალობელია'}
      className={cx(
        'flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white transition',
        'active:scale-95 active:bg-wine-deep disabled:cursor-default disabled:opacity-40 disabled:active:scale-100 [&_svg]:size-[22px]',
        FOCUS,
      )}
    >
      <ArrowRight aria-hidden="true" />
    </Press>
  </div>
);

/** the words under the notes, folded out under the top bar (the old „ტექსტი“ panel) */
export const LyricsPanel: React.FC<{ text: string; onClose: () => void; dark: boolean }> = ({ text, onClose, dark }) => (
  <div className={cx('relative mx-2 mb-2 rounded-tile', dark ? 'bg-night-surf text-night-ink' : 'bg-surf text-ink')}>
    <RoundButton label="ტექსტის დახურვა" size={36} tone={dark ? 'glass' : 'page'} className="absolute top-2 right-2 z-10" onClick={onClose}>
      <X />
    </RoundButton>
    <div className="max-h-[40dvh] overflow-y-auto px-12 py-3.5 text-center font-serif-ge text-body">
      {text.split('\n').map((line, i) => <p key={i} className="mx-auto mb-1.5 max-w-[34em] text-balance">{line}</p>)}
    </div>
  </div>
);
