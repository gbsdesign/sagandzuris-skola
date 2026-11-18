import React from 'react';
import { Check, Headphones, Loader2, Mic, RotateCcw, Send, Square } from 'lucide-react';
import { Button, Card, Dot, Duo, Press, Seg, cx, FOCUS } from '../../../components/ui2';
import type { Voice } from '../../../utils/pathItems';
import { Line } from './parts';

// Recording my voice over the others in the new look (board x-studia): the voice on top, the earphones' advice standing out,
// one big round microphone in the middle, and a grey line on what comes after. Drawn from plain props (RecordBody holds the
// recording, the lag cut and the sending).

export type RecordPhase = 'idle' | 'rec' | 'making' | 'ready' | 'sending' | 'sent' | 'error';

const VOICE_LABEL: Record<Voice, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };

export const RecordView: React.FC<{
  phase: RecordPhase;
  /** the notes are here (the synth can sing the others) */
  ready: boolean;
  failed: boolean;
  supported: boolean;
  voices: number;
  voice: Voice;
  onVoice: (v: Voice) => void;
  /** my take of this chant already with the teacher */
  sentBefore: Voice | null;
  problem: string;
  takeUrl: string | null;
  teacher: boolean;
  onStart: () => void;
  onStop: () => void;
  onAgain: () => void;
  onSend: () => void;
}> = ({ phase, ready, failed, supported, voices, voice, onVoice, sentBefore, problem, takeUrl, teacher, onStart, onStop, onAgain, onSend }) => {
  const waiting = phase === 'idle' || phase === 'error';
  const recording = phase === 'rec';
  const taken = (phase === 'ready' || phase === 'sending' || phase === 'sent') && !!takeUrl;
  return (
    <div className="flex flex-1 flex-col gap-3">
      {ready && voices > 1 && waiting && (
        <Seg<Voice> label="შენი ხმა" value={voice} onChange={onVoice}
          items={(['1', '2', '3'] as Voice[]).slice(0, voices).map(v => ({ id: v, label: VOICE_LABEL[v] }))} />
      )}
      {(waiting || recording) && (
        <Card pad="none" className="bg-tint px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Dot icon={<Headphones />} size={40} />
            <div className="min-w-0">
              <p className="text-lead font-bold">გაიკეთე ყურსასმენი</p>
              <p className="text-meta leading-snug text-mut">დანარჩენ ხმებს ყურში გაიგებ, მიკროფონი მხოლოდ შენს ხმას ჩაწერს.</p>
            </div>
          </div>
        </Card>
      )}

      {failed && <Line tone="danger">ამ გალობის ნოტები ვერ ჩაიტვირთა.</Line>}
      {!supported && <Line tone="danger">ამ ბრაუზერში ჩაწერა ვერ მუშაობს.</Line>}
      {sentBefore && phase === 'idle' && (
        <Line tone="leaf" icon={<Check />}>შენი ჩანაწერი ({VOICE_LABEL[sentBefore]}) უკვე გაგზავნილია. ახალი ჩანაწერი მას შეცვლის.</Line>
      )}

      <div className="min-h-6 flex-1" />

      {taken ? (
        <div className="flex shrink-0 flex-col gap-3">
          <p className="text-center text-head font-bold">შენი ჩანაწერი · {VOICE_LABEL[voice]}</p>
          <Card pad="sm">
            <audio controls src={takeUrl!} className="w-full" />
          </Card>
          {phase === 'sent' ? (
            <Line tone="leaf" icon={<Check />}>{teacher ? 'დაემატა კლასის ჩანაწერებს' : 'გაეგზავნა მასწავლებელს'}</Line>
          ) : (
            <Duo>
              <Button kind="ghost" icon={<RotateCcw />} disabled={phase === 'sending'} onClick={onAgain}>თავიდან</Button>
              <Button icon={phase === 'sending' ? <Loader2 className="animate-spin" /> : <Send />} disabled={phase === 'sending'} onClick={onSend}>
                {teacher ? 'დამატება' : 'გაგზავნა'}
              </Button>
            </Duo>
          )}
        </div>
      ) : (waiting && !failed) || recording || phase === 'making' ? (
        <div className="flex shrink-0 flex-col items-center gap-3.5">
          <Press
            onClick={recording ? onStop : onStart}
            disabled={phase === 'making' || (waiting && !ready)}
            aria-label={recording ? 'დასრულება' : `ჩაწერა — ${VOICE_LABEL[voice]}`}
            className={cx(
              'relative flex size-28 cursor-pointer items-center justify-center rounded-full bg-wine text-white shadow-wine transition',
              'hover:bg-wine-deep active:scale-95 disabled:cursor-default disabled:opacity-60 disabled:active:scale-100 [&_svg]:size-10',
              FOCUS,
            )}
          >
            {recording && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-wine/40 motion-safe:animate-ping" />}
            {phase === 'making' || (waiting && !ready)
              ? <Loader2 className="relative animate-spin" />
              : recording ? <Square className="relative" fill="currentColor" /> : <Mic className="relative" strokeWidth={1.75} />}
          </Press>
          <div className="text-center" aria-live="polite">
            {recording ? (
              <>
                <p className="flex items-center justify-center gap-2 text-head font-bold">
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-danger motion-safe:animate-pulse" />იწერება
                </p>
                <p className="text-body text-mut">იმღერე შენი ხმა · დააჭირე, როცა მორჩები</p>
              </>
            ) : phase === 'making' ? (
              <p className="text-head font-bold">ვამზადებ…</p>
            ) : (
              <>
                <p className="text-head font-bold">ჩაწერე {VOICE_LABEL[voice]}</p>
                <p className="text-body text-mut">იმღერე ბოლომდე</p>
              </>
            )}
          </div>
        </div>
      ) : null}

      {problem && <Line tone="danger">{problem}</Line>}
      {phase === 'error' && <Line tone="danger">რაღაც ვერ გამოვიდა — სცადე ხელახლა.</Line>}

      <div className="min-h-6 flex-1" />

      {(waiting || recording) && (
        <p className="shrink-0 px-1.5 text-meta leading-normal text-mut">
          {teacher
            ? 'მერე მოუსმენ და დაამატებ — „კლასის ჩანაწერებში“ სხვებთან ერთად გამოჩნდება.'
            : 'მერე მოუსმენ და გაუგზავნი მასწავლებელს — ის სამივე ხმას ერთად შეაერთებს.'}
        </p>
      )}
    </div>
  );
};
