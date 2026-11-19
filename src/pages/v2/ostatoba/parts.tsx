import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Row, Small, cx, type SmallTone } from '../../../components/ui2';
import { noteName } from '../../../utils/pearls';

// Small shared pieces of „ოსტატობა“'s new look (pages/v2/ostatoba): a score's colour, the bar that stays at a screen's
// bottom, a row that unfolds in place, the recording's red dot, the tuner and the step's ring.

/** a percent's tone: 80 and more = done (leaf), 50 and more = on the way (gold), less = grey */
export const scoreTone = (v: number): SmallTone => (v >= 80 ? 'leaf' : v >= 50 ? 'gold' : 'mut');
export const SCORE_TEXT: Record<SmallTone, string> = {
  leaf: 'text-leaf-ink', gold: 'text-gold-ink', mut: 'text-mut', wine: 'text-wine', danger: 'text-danger', ink: 'text-ink',
};

/** a score at a row's end: „85%“ in its tone */
export const ScoreTag: React.FC<{ v: number }> = ({ v }) => <Small tone={scoreTone(v)} className="tabular-nums">{v}%</Small>;

/** the buttons that stay at a screen's bottom over the page's own colour */
export const BottomBar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('sticky bottom-0 z-10 -mx-4 mt-auto flex shrink-0 flex-col gap-2 bg-page px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]', className)}>
    {children}
  </div>
);

/** a row inside `Rows` that unfolds its words under it (a chevron turning down) */
export const FoldRow: React.FC<{
  icon: React.ReactNode; title: string; sub?: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}> = ({ icon, title, sub, count, open, onToggle, children }) => (
  <div>
    <Row lead={icon} title={title} sub={open ? undefined : sub} aria-expanded={open} onClick={onToggle} right={
      <span className="flex shrink-0 items-center gap-1.5">
        {count !== undefined && <Small>{count}</Small>}
        <ChevronRight aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-90')} strokeWidth={2} />
      </span>
    } />
    {open && <div className="sg-in px-4 pt-0.5 pb-4">{children}</div>}
  </div>
);

/** the red dot of a recording that is on */
export const RecDot: React.FC = () => (
  <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
    <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-60" />
    <span className="relative size-2.5 rounded-full bg-danger" />
  </span>
);

/** my note against the one to sing, any octave: the two names, a word and a needle */
export const TunerV2: React.FC<{ midi: number | null; target: number | null; className?: string }> = ({ midi, target, className }) => {
  const diff = midi !== null && target !== null ? (((midi - target + 6) % 12) + 12) % 12 - 6 : null;
  const tone = diff === null ? 'idle' : Math.abs(diff) < 0.25 ? 'ok' : Math.abs(diff) < 0.5 ? 'near' : 'off';
  const needle = diff === null ? 50 : 50 + Math.max(-1, Math.min(1, diff)) * 45;
  const word = diff === null ? '' : tone === 'ok' ? 'ზუსტად' : diff < 0 ? 'ცოტა დაბლა' : 'ცოტა მაღლა';
  return (
    <div className={cx('flex flex-col gap-2.5', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-cap font-bold text-mut">შენ</p>
          <p className={cx('text-title leading-none font-bold', tone === 'ok' ? 'text-leaf-ink' : tone === 'idle' ? 'text-faint' : 'text-gold-ink')}>
            {midi === null ? '—' : noteName(midi)}
          </p>
        </div>
        <p aria-live="polite" className={cx('pb-0.5 text-meta font-bold', tone === 'ok' ? 'text-leaf-ink' : 'text-gold-ink')}>{word}</p>
        <div className="min-w-0 text-right">
          <p className="text-cap font-bold text-mut">ნოტი</p>
          <p className="text-title leading-none font-bold">{target === null ? '—' : noteName(target)}</p>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-3 rounded-full bg-track">
        <span className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-leaf" />
        {diff !== null && (
          <span style={{ left: `${needle}%` }} className={cx(
            'absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surf transition-[left] duration-100',
            tone === 'ok' ? 'bg-leaf' : tone === 'near' ? 'bg-gold' : 'bg-clay',
          )} />
        )}
      </div>
    </div>
  );
};

/** the step's clock: a ring that empties, the seconds left in it (a breath in the sea's colour) */
export const Ring: React.FC<{ frac: number; seconds: number; breath: boolean }> = ({ frac, seconds, breath }) => {
  const r = 62, c = 2 * Math.PI * r;
  return (
    <div className="relative size-[132px] shrink-0 self-center" role="timer" aria-label={`${seconds} წამი`}>
      <svg aria-hidden="true" viewBox="0 0 132 132" className="size-[132px] -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="8" className="stroke-track" />
        <circle cx="66" cy="66" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className={breath ? 'stroke-sea' : 'stroke-wine'}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-hero leading-none font-bold tabular-nums">{seconds}</span>
        <span className={cx('text-meta', breath ? 'font-bold text-sea' : 'text-mut')}>{breath ? 'ჩაისუნთქე' : 'წამი'}</span>
      </span>
    </div>
  );
};
