import React from 'react';
import { Ear, Info, Play, Search, Square, RefreshCw, ChevronRight, Mic, Pause } from 'lucide-react';
import { Button, Dot, Press, Rows, SectionLabel, Small, Two, TopBar, cx } from '../../../components/ui2';
import { MicRings } from '../../shell/search/VoiceSheet';

// „ძებნა სიმღერით“ as a picture of its props (boards x-ultra-simgherit, -1, -3, -4): start, listening, three answers, nothing found.

export type SingStage = 'start' | 'listening' | 'results' | 'none';

export interface SingRow { key: string; title: string; sub: string; label: 'ძალიან' | 'ჰგავს' | 'ოდნავ' }

export interface SingViewProps {
  stage: SingStage;
  /** seconds sung so far and the most the search takes */
  seconds?: number;
  total?: number;
  /** the voice's loudness 0…1, newest last */
  levels?: number[];
  rows?: SingRow[];
  /** the row whose opening sounds now */
  playing?: string | null;
  /** a line under the start's words (the microphone was refused) */
  error?: string;
  onBack: () => void;
  onStart: () => void;
  onStop: () => void;
  onWords: () => void;
  onPlay: (key: string) => void;
  onOpen: (key: string) => void;
}

const BARS = 28;

/** the live wave: the newest loudness at the right, the older ones fading to the left */
const Wave: React.FC<{ levels: number[] }> = ({ levels }) => {
  const tail = levels.slice(-BARS);
  const bars = [...Array.from({ length: BARS - tail.length }, () => 0), ...tail];
  return (
    <div aria-hidden="true" className="flex h-12 items-center justify-center gap-[3px]">
      {bars.map((v, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-wine transition-[height] duration-100"
          style={{ height: `${6 + Math.round(Math.min(1, v) * 36)}px`, opacity: 0.35 + 0.65 * (i / BARS) }}
        />
      ))}
    </div>
  );
};

const Frame: React.FC<{ onBack: () => void; children: React.ReactNode }> = ({ onBack, children }) => (
  <div className="flex w-full flex-1 flex-col gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
    <TopBar title="ძებნა სიმღერით" onBack={onBack} />
    {children}
  </div>
);

export const SingView: React.FC<SingViewProps> = ({
  stage, seconds = 0, total = 10, levels = [], rows = [], playing, error, onBack, onStart, onStop, onWords, onPlay, onOpen,
}) => {
  if (stage === 'listening') {
    return (
      <Frame onBack={onBack}>
        <div className="flex flex-1 flex-col items-center gap-3 pt-8 text-center">
          <MicRings size="lg" />
          <h2 className="mt-2 text-head font-bold">გისმენ…</h2>
          <p aria-live="off" className="text-body text-mut tabular-nums">{Math.min(total, Math.floor(seconds))} / {total} წამი</p>
          <Wave levels={levels} />
        </div>
        <Button kind="ghost" full icon={<Square />} onClick={onStop}>შეწყვეტა</Button>
      </Frame>
    );
  }
  if (stage === 'results') {
    return (
      <Frame onBack={onBack}>
        <SectionLabel label="ყველაზე მეტად ჰგავს" />
        <Rows>
          {rows.map(r => (
            <div key={r.key} className="flex items-center gap-2.5 pl-4">
              <Press
                onClick={() => onPlay(r.key)}
                aria-label={playing === r.key ? `${r.title}: შეჩერება` : `${r.title}: დასაწყისის მოსმენა`}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tint text-wine transition active:scale-95 [&_svg]:size-[18px]"
              >
                {playing === r.key ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
              </Press>
              <Press
                onClick={() => onOpen(r.key)}
                className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 pr-3 text-left transition-colors active:bg-soft"
              >
                <Two title={r.title} sub={r.sub} />
                <Small tone={r.label === 'ძალიან' ? 'wine' : 'mut'}>{r.label}</Small>
                <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />
              </Press>
            </div>
          ))}
        </Rows>
        <div className="flex gap-2 px-1.5 text-meta leading-normal text-mut">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>მრგვალი ღილაკი დაუკრავს დასაწყისს — შეადარე ყურით.</span>
        </div>
        <div className="mt-auto pt-3">
          <Button kind="ghost" full icon={<RefreshCw />} onClick={onStart}>არცერთი არ არის — თავიდან ვცდი</Button>
        </div>
      </Frame>
    );
  }
  if (stage === 'none') {
    return (
      <Frame onBack={onBack}>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Dot icon={<Ear />} size={40} className="mb-2 size-[84px]! [&_svg]:size-9!" />
          <h2 className="text-title font-bold">ვერ ვიცანი</h2>
          <p className="text-body leading-normal text-mut">სცადე უფრო ხმამაღლა ან საგალობლის დასაწყისიდან.</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <Button full icon={<Mic />} onClick={onStart}>კიდევ ვცდი</Button>
          <Button kind="ghost" full icon={<Search />} onClick={onWords}>ძებნა სიტყვებით</Button>
        </div>
      </Frame>
    );
  }
  return (
    <Frame onBack={onBack}>
      <div className="flex flex-1 flex-col items-center gap-2 pt-8 text-center">
        <MicRings size="lg" still />
        <h2 className={cx('mt-3 text-head font-bold')}>იმღერე ან წაიღიღინე</h2>
        <p className="px-4 text-body leading-normal text-mut">10 წამი საკმარისია.<br />სიტყვები საჭირო არ არის.</p>
        {error && <p role="alert" className="px-4 text-body leading-normal font-semibold text-danger">{error}</p>}
      </div>
      <div className="flex flex-col gap-2.5">
        <Button full icon={<Mic />} onClick={onStart}>დაწყება</Button>
        <Button kind="ghost" full icon={<Search />} onClick={onWords}>ძებნა სიტყვებით</Button>
      </div>
    </Frame>
  );
};
