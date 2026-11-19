import React from 'react';
import { Check, Headphones, Pause, Play, Send, Trash2, X } from 'lucide-react';
import { Button, Card, Note, RoundButton, cx } from '../../../components/ui2';
import type { ManeraStep } from '../../../data/maneraLessons';
import { countInBeats, onsetsOf, roundFrames, scoredStep, type ScoreKind } from '../../../utils/drillScore';
import { MAX_TAKE_SECONDS } from '../../../utils/drillTakes';
import type { RunResult, Scoring } from '../../../components/mastery/useExercise';
import type { useMicTake } from '../../../components/mastery/useMicTake';
import { RecDot, SCORE_TEXT, TunerV2, scoreTone } from './parts';

// The exercise's cards in the new look (ExerciseV2): a scored run while it goes, its result, and my own take.

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** a scored run in progress: notes → the tuner; rhythm → the count-in, then a beat light and the claps heard; a tip → the
 *  recording's time. „შეწყვეტა“ drops the run. */
export const ScoringCard: React.FC<{
  kind: ScoreKind; step: ManeraStep | undefined; running: boolean; elapsed: number; scoring: Scoring | null;
  midi: number | null; target: number | null; onStop: () => void;
}> = ({ kind, step, running, elapsed, scoring, midi, target, onStop }) => {
  const rhythm = kind === 'rhythm' && running && step?.bpm && scoring && scoredStep(step, 'rhythm', 0);
  const beat = step?.bpm ? 60 / step.bpm : 1;
  const countIn = step ? countInBeats(step) : 0;
  const inCount = rhythm && elapsed < countIn * beat;
  const flash = rhythm && elapsed % beat < 0.12;
  const claps = rhythm && scoring && scoring.from !== null && !inCount
    ? onsetsOf(roundFrames(scoring.session.frames, scoring.from, scoring.from + elapsed * 1000)).filter(t => t >= countIn * beat - 0.15).length
    : 0;
  const recSecs = scoring ? Math.floor((performance.now() - scoring.session.t0) / 1000) : 0;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RecDot />
        <span className="text-body font-bold">შეფასება მიმდინარეობს{kind === 'ai' ? <span className="tabular-nums"> · {clock(recSecs)}</span> : ''}</span>
        <span className="ml-auto flex items-center gap-1 text-meta text-mut"><Headphones aria-hidden="true" className="size-3.5" /> ყურსასმენით</span>
      </div>
      {kind === 'pitch' && <TunerV2 midi={midi} target={running ? target : null} />}
      {kind === 'rhythm' && (
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className={cx('size-9 shrink-0 rounded-full transition-colors duration-75', flash ? 'bg-wine' : 'bg-tint')} />
          <p aria-live="polite" className="text-body font-bold">
            {!rhythm ? 'მოემზადე…' : inCount ? `ჩათვლა… ${Math.min(countIn, Math.floor(elapsed / beat) + 1)}` : <>ახლა შენ! <span className="font-semibold text-mut">· გავიგე {claps}</span></>}
          </p>
        </div>
      )}
      {kind === 'ai' && <p className="text-meta leading-snug text-mut">გაიარე ყველა ნაბიჯი — ბოლოს AI მასწავლებელი მოუსმენს ჩანაწერს.</p>}
      <Button kind="quiet" size="md" icon={<X />} onClick={onStop} className="self-start">შეწყვეტა</Button>
    </Card>
  );
};

/** the end of a scored run in the browser (the percent) — or, for a guest, why the AI teacher does not listen */
export const RunResultV2: React.FC<{ result: RunResult; best: number | undefined }> = ({ result, best }) => {
  if (result.kind === 'ai' && result.score === undefined) {
    return (
      <>
        <p className="text-head font-bold">სავარჯიშო ჩაიწერა</p>
        <p className="text-meta text-mut">{result.busy ? 'ჩანაწერი მზადდება…' : 'AI მასწავლებელი მხოლოდ შესულ წევრებს უსმენს.'}</p>
        {result.problem && <p className="text-meta text-danger">{result.problem}</p>}
      </>
    );
  }
  const pct = result.kind === 'pct' ? result.pct : result.score ?? 0;
  return (
    <>
      <p className="text-meta font-semibold text-mut">{result.kind === 'ai' ? 'AI მასწავლებლის შეფასება' : 'შენი შედეგი'}</p>
      <p className={cx('text-hero font-bold tabular-nums', SCORE_TEXT[scoreTone(pct)])}>{pct}%</p>
      <p className="text-body font-semibold">
        {result.record ? 'ახალი საუკეთესო შედეგი!' : best !== undefined ? `შენი საუკეთესო: ${best}%` : ''}
      </p>
      {result.kind === 'ai' && result.text && <p className="text-body leading-relaxed whitespace-pre-line text-left wrap-break-word">{result.text}</p>}
      {result.kind === 'pct' && (
        <p className="max-w-[320px] text-meta leading-snug text-mut">
          {pct >= 80 ? 'ძალიან კარგი! ხვალ კიდევ გაიმეორე, რომ მყარად დაგრჩეს.' : pct >= 50 ? 'კარგი დასაწყისია. ჯერ ჩვეულებრივად გაიარე და მერე ისევ შეფასებით.' : 'ჯერ შეფასების გარეშე, ნელა და ყურსასმენით ივარჯიშე — მერე ისევ სცადე.'}
        </p>
      )}
    </>
  );
};

/** my take from the tuner's recording: hear it, send it to the teachers, or drop it */
export const TakeCard: React.FC<{ mic: ReturnType<typeof useMicTake> }> = ({ mic }) => {
  if (mic.state.kind !== 'take') return null;
  const { mp3, seconds } = mic.state;
  return (
    <Card className="flex flex-col gap-3">
      <p className="text-lead font-bold">შენი ჩანაწერი · {Math.round(seconds)} წმ</p>
      {mp3 ? (
        <div className="flex flex-wrap items-center gap-2">
          <RoundButton label={mic.playing ? 'გაჩერება' : 'მოსმენა'} tone="wine" onClick={mic.play}>
            {mic.playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </RoundButton>
          {mic.user && (mic.sent === 'yes'
            ? <span className="flex items-center gap-1 text-meta font-bold text-leaf-ink"><Check aria-hidden="true" className="size-4" /> მასწავლებელს გაეგზავნა</span>
            : <Button kind="soft" size="md" icon={<Send />} disabled={mic.sent === 'busy'} onClick={() => void mic.send()}>
                {mic.sent === 'busy' ? 'იგზავნება…' : 'მასწავლებელს გაგზავნა'}
              </Button>)}
          <RoundButton label="ჩანაწერის წაშლა" tone="plain" className="ml-auto" onClick={mic.reset}><Trash2 /></RoundButton>
        </div>
      ) : (
        <p className="text-meta text-mut">ამ ბრაუზერში ჩანაწერი ვერ შეინახა.</p>
      )}
      {mic.sent === 'fail' && <p className="text-meta text-danger">ვერ გაიგზავნა. სცადე თავიდან.</p>}
      {mp3 && mic.sent !== 'yes' && mic.user && <Note className="px-0">მასწავლებელი ამ სავარჯიშოს მხოლოდ ბოლო გაგზავნილ ჩანაწერს ხედავს.</Note>}
    </Card>
  );
};

/** the tuner row's second line: what it does, its time while it records, or why the microphone did not start */
export const micLine = (mic: ReturnType<typeof useMicTake>, pitched: boolean) =>
  mic.state.kind === 'on' ? `იწერება · ${clock(mic.secs)} / ${clock(MAX_TAKE_SECONDS)}`
  : mic.state.kind === 'error' ? mic.state.text
  : pitched ? 'ზუსტად ხარ თუ არა ნოტზე' : 'ჩაიწერე და გაუგზავნე მასწავლებელს';
