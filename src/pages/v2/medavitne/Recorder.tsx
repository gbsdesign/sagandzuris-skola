import React from 'react';
import { Check, Gauge, LoaderCircle, Mic, RotateCcw, Send, Square, X } from 'lucide-react';
import { Button, Card, Note, Press, RoundButton, cx } from '../../../components/ui2';
import { readClock, useReadAloud } from '../../medavitneoba/parts';
import { PACE_ADVICE, PACE_HIGH, PACE_LOW } from '../../medavitneoba/PaceMeter';
import { PACE, PACE_NAMES, paceNumber, type Pace } from '../../../utils/readingPace';
import { SMALL_MAX_SECONDS, voiceRecordingSupported } from '../../../utils/voiceRecorder';

// „ჩაიწერე შენი კითხვა“ in the new look (board x-medavitne-kitkhva): one white card — the round wine microphone, what to do,
// and once recorded: the take to hear, its pace and „მასწავლებელს გაგზავნა“. The logic is the old card's (useReadAloud).

const ZONES = [
  { zone: 'slow', from: PACE_LOW, to: PACE.slow, bar: 'bg-gold-tint' },
  { zone: 'even', from: PACE.slow, to: PACE.fast, bar: 'bg-leaf-tint' },
  { zone: 'fast', from: PACE.fast, to: PACE_HIGH, bar: 'bg-gold-tint' },
] as const;

const PaceView: React.FC<{ pace: Pace }> = ({ pace }) => {
  if (pace.partial) return <Note className="px-0">ჩანაწერი ტექსტისთვის ძალიან მოკლეა. ტექსტი ბოლომდე წაიკითხე და ტემპს დაგითვლი.</Note>;
  const at = Math.min(98, Math.max(2, ((pace.rate - PACE_LOW) / (PACE_HIGH - PACE_LOW)) * 100));
  return (
    <div role="group" aria-label={`ტემპი: ${PACE_NAMES[pace.zone]}`} className="flex flex-col gap-2 rounded-field bg-page px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="inline-flex items-center gap-1.5 text-body font-bold">
          <Gauge aria-hidden="true" className="size-4 text-wine" />ტემპი:
          <span className={pace.zone === 'even' ? 'text-leaf-ink' : 'text-gold-ink'}>{PACE_NAMES[pace.zone]}</span>
        </span>
        <span className="text-meta text-mut tabular-nums">{paceNumber(pace.rate)} მარცვალი წამში</span>
      </div>
      <div aria-hidden="true" className="relative">
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {ZONES.map(z => <span key={z.zone} className={z.bar} style={{ flexGrow: z.to - z.from, flexBasis: 0 }} />)}
        </div>
        <span className="absolute top-1/2 -mt-2 -ml-2 size-4 rounded-full bg-wine shadow-knob ring-[3px] ring-surf" style={{ left: `${at}%` }} />
      </div>
      <div aria-hidden="true" className="flex text-cap font-semibold text-mut">
        {ZONES.map(z => (
          <span key={z.zone} className={cx('text-center', pace.zone === z.zone && 'font-bold text-ink')} style={{ flexGrow: z.to - z.from, flexBasis: 0 }}>
            {PACE_NAMES[z.zone]}
          </span>
        ))}
      </div>
      <p className="text-meta leading-snug text-ink">{PACE_ADVICE[pace.zone]}</p>
    </div>
  );
};

export const Recorder: React.FC<{ sendId?: string; syllables?: number; className?: string }> = ({ sendId, syllables, className }) => {
  const r = useReadAloud(sendId, syllables);
  if (!voiceRecordingSupported()) return null;
  const { state } = r;
  const take = r.take.current;
  return (
    <Card pad="sm" className={cx('flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        {state === 'rec' ? (
          <Press aria-label="გაჩერება" onClick={() => void r.stop()}
            className="flex size-tap-lg shrink-0 cursor-pointer items-center justify-center rounded-full bg-danger text-white ring-[6px] ring-danger/15 transition active:scale-95">
            <Square className="size-5 fill-current" />
          </Press>
        ) : state === 'busy' ? (
          <span className="flex size-tap-lg shrink-0 items-center justify-center rounded-full bg-tint text-wine"><LoaderCircle className="size-5 animate-spin" /></span>
        ) : (
          <RoundButton size={48} tone="wine" label={state === 'ready' ? 'თავიდან ჩაწერა' : 'ჩაწერა'} onClick={() => void r.start()}>
            {state === 'ready' ? <RotateCcw aria-hidden="true" /> : <Mic aria-hidden="true" />}
          </RoundButton>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead font-bold leading-snug">
            {state === 'rec' ? <>ჩაიწერება… <span className="tabular-nums text-danger">{readClock(r.secs)}</span></>
              : state === 'busy' ? 'მზადდება…'
              : state === 'ready' ? 'მოისმინე შენი კითხვა'
              : 'ჩაიწერე შენი კითხვა'}
          </span>
          <span className="text-meta leading-snug text-mut">
            {state === 'denied' ? 'მიკროფონზე წვდომა არ არის — ნება დართე ბრაუზერის პარამეტრებში.'
              : r.uid ? 'მხოლოდ შენ გესმის, სანამ მასწავლებელს არ გაუგზავნი'
              : 'ჩანაწერი არსად იგზავნება — მხოლოდ შენ გესმის.'}
          </span>
        </div>
        {state === 'rec' && (
          <RoundButton size={36} tone="plain" label="გაუქმება" onClick={r.cancel}><X aria-hidden="true" /></RoundButton>
        )}
      </div>

      {state === 'ready' && r.url && <audio controls src={r.url} className="h-11 w-full" />}
      {r.pace && <PaceView pace={r.pace} />}
      {state === 'ready' && Boolean(syllables) && take?.speech === null && (
        <Note className="px-0">ტემპს ვერ დავითვლი: ჩანაწერში ხმა ვერ გავიგე. მიკროფონი შეამოწმე.</Note>
      )}
      {r.uid && sendId && r.shine[sendId] && r.sent === 'no' && (
        <span className="inline-flex items-center gap-1.5 text-body font-bold text-leaf-ink"><Check aria-hidden="true" className="size-4" />მასწავლებელმა ჩაგითვალა</span>
      )}
      {r.uid && sendId && state === 'ready' && take && (
        <div className="flex flex-col gap-2">
          {r.sent === 'yes' ? (
            <span className="inline-flex min-h-tap items-center gap-1.5 text-body font-bold text-leaf-ink"><Check aria-hidden="true" className="size-4" />გაეგზავნა მასწავლებელს</span>
          ) : (
            <Button kind="soft" size="md" disabled={r.sent === 'busy'} onClick={() => void r.send()}
              icon={r.sent === 'busy' ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}>
              მასწავლებელს გაგზავნა
            </Button>
          )}
          {r.sent === 'failed' && <p className="text-meta text-danger">ვერ გაიგზავნა — შეამოწმე ინტერნეტი და სცადე თავიდან.</p>}
          {r.sent !== 'yes' && take.seconds > SMALL_MAX_SECONDS + 1 && (
            <Note className="px-0">გაიგზავნება პირველი {SMALL_MAX_SECONDS / 60} წუთი.</Note>
          )}
        </div>
      )}
    </Card>
  );
};
