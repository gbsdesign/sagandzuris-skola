import React from 'react';
import { Headphones, Info, Loader2, Mic, ChevronRight, RotateCcw, Send, Square } from 'lucide-react';
import { Bar, Button, Card, Helper, Num, Row, Rows, TopBar } from '../../../components/ui2';
import { Bottom, CenterNote, TeacherSays } from '../../../components/aiLesson/parts';
import { PearlIcon } from '../../../components/pearls/PearlIcon';
import { Lane } from '../../games/mesame/Lane';
import { SILENT } from '../../games/mesame/useTrioTake';
import { hitLine } from '../../../utils/aiPass';
import { RULES_SENTENCE, missSentence } from '../../../utils/aiExam';
import type { TrioNote } from '../../../utils/trio';

// The exam's screens, drawn from plain props (ExamScreen holds the take, the notes and the records): the rules, the singing
// (count-in, then my voice's notes and the time — no hints), the result (passed: the shining pearl; not passed: the same screen
// without the shine and one kind sentence).

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

export interface ExamViewProps {
  /** 'idle' = the rules */
  state: 'idle' | 'count' | 'sing' | 'score' | 'done';
  title: string;
  voiceName: string;
  tried: boolean;
  /** why the exam cannot begin (no notes, a guest, no microphone), '' when it can */
  why: string;
  loading: boolean;
  problem: string;
  count: number;
  now: number;
  section: { from: number; to: number; notes: TrioNote[] } | null;
  frames: { t: number; midi: number | null }[];
  place: (t: number) => number;
  result: { hit: number; total: number; silent: boolean; won: boolean; making: boolean; hasMp3: boolean } | null;
  sent: 'no' | 'busy' | 'yes' | 'failed';
  onBegin: () => void;
  onPractise: () => void;
  onClose: () => void;
  onStop: () => void;
  onReset: () => void;
  onSend: () => void;
}

export const ExamView: React.FC<ExamViewProps> = ({
  state, title, voiceName, tried, why, loading, problem, count, now, section, frames, place, result, sent,
  onBegin, onPractise, onClose, onStop, onReset, onSend,
}) => {
  const busy = state === 'count' || state === 'sing';
  let body: React.ReactNode;
  let bottom: React.ReactNode;
  if (state === 'done' && result) {
    const { hit, total, silent, won, making, hasMp3 } = result;
    body = silent ? (
      <CenterNote icon={<Mic />} title="ხმა არ ჩაიწერა">{SILENT} ეს ცდად არ ჩაითვალა.</CenterNote>
    ) : (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 pb-6 text-center" role="status">
        <span aria-hidden="true" className={won ? 'mb-4 flex size-[168px] items-center justify-center rounded-full bg-gold-tint/60' : 'mb-4 flex size-[168px] items-center justify-center rounded-full bg-soft/60'}>
          <span className={won ? 'flex size-[128px] items-center justify-center rounded-full bg-gold-tint' : 'flex size-[128px] items-center justify-center rounded-full bg-soft'}>
            <PearlIcon state={won ? 'shining' : 'polished'} size={92} />
          </span>
        </span>
        <h2 className="text-hero font-bold leading-tight">{won ? 'ჩაბარებულია' : 'ჯერ არ გამოვიდა'}</h2>
        <p className="max-w-[300px] text-body leading-[1.5] text-mut">{hitLine(hit, total)}{won ? ' — მთლიანად, ნამდვილი ტემპით.' : '.'}</p>
        {won ? (
          <>
            <p className="mt-3 text-lead font-bold text-wine">მარგალიტი აბრწყინდა</p>
            <p className="text-meta text-mut">ჩათვალა AI მასწავლებელმა</p>
          </>
        ) : (
          <p className="mt-3 max-w-[300px] text-lead font-semibold leading-[1.4]">{missSentence(hit, total)}</p>
        )}
      </div>
    );
    bottom = silent ? (
      <>
        <Button icon={<RotateCcw />} onClick={onReset}>ისევ ვცდი</Button>
        <Button kind="ghost" onClick={onClose}>დახურვა</Button>
      </>
    ) : won ? (
      <>
        <Button icon={<ChevronRight />} onClick={onClose}>შემდეგი საგალობელი</Button>
        {hasMp3 || making ? (
          <Button kind="ghost" icon={sent === 'busy' || making ? <Loader2 className="animate-spin" /> : <Send />}
            disabled={sent === 'busy' || sent === 'yes' || making} onClick={onSend}>
            {sent === 'yes' ? 'მასწავლებელს გაეგზავნა' : sent === 'failed' ? 'ვერ გაიგზავნა — ისევ სცადე' : 'ჩანაწერს მასწავლებელსაც ვუგზავნი'}
          </Button>
        ) : null}
      </>
    ) : (
      <>
        <Button icon={<ChevronRight />} onClick={onPractise}>გავიმეოროთ</Button>
        <Button kind="ghost" onClick={onClose}>დახურვა</Button>
      </>
    );
  } else if (state === 'score') {
    body = <p className="flex flex-1 items-center justify-center gap-2 text-body font-semibold text-mut"><Loader2 className="size-5 animate-spin" />ვითვლი…</p>;
    bottom = null;
  } else if (busy && section) {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex min-h-9 items-center justify-between gap-2 px-1">
          <span className="text-meta font-bold text-mut">{state === 'count' ? 'მოემზადე — შენი პირველი ნოტი ჟღერს' : `იმღერე ${voiceName}`}</span>
          {state === 'sing' && <span className="text-meta font-bold tabular-nums text-mut">{clock(now - section.from)} / {clock(section.to - section.from)}</span>}
        </div>
        <Card pad="none" className="relative overflow-hidden">
          <Lane notes={section.notes} now={state === 'sing' ? now : section.from} speed={1} frames={frames} place={place} height={220} />
          {state === 'count' && (
            <span className="absolute inset-0 flex items-center justify-center bg-surf/70" aria-live="assertive">
              <span className="scale-[2.6]"><span key={count} className="inline-block font-serif-ge text-hero font-bold leading-none text-wine animate-[samosi-pop_0.45s_ease-out]">{count}</span></span>
            </span>
          )}
        </Card>
        <Bar value={(now - section.from) / Math.max(1, section.to - section.from)} label="გამოცდის მსვლელობა" />
        <Helper icon={<Headphones />}>ყურსასმენით უკეთესია — მიკროფონი ტელეფონის ხმას არ გაიგონებს.</Helper>
      </div>
    );
    bottom = <Button kind="ghost" icon={<Square />} onClick={onStop}>{state === 'count' ? 'გაუქმება' : 'შეწყვეტა'}</Button>;
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <TeacherSays text={tried ? undefined : RULES_SENTENCE}>{tried ? 'დღეს უკვე სცადე. ხვალ ისევ შეგიძლია.' : RULES_SENTENCE}</TeacherSays>
        <Rows>
          <Row lead={<Num n={1} />} title="მთლიანად" sub="თავიდან ბოლომდე, შეუჩერებლად" wrap />
          <Row lead={<Num n={2} />} title="ნამდვილი ტემპით" sub="შენელება აღარ არის" wrap />
          <Row lead={<Num n={3} />} title="მინიშნების გარეშე" sub="ორი ხმა ჟღერს, შენი — არა" wrap />
        </Rows>
        <Helper icon={<Info />}>თუ დღეს არ გამოვა, ხვალ ისევ სცადე. ცდების რაოდენობა არ ითვლება.</Helper>
        {problem && <p role="alert" className="px-1.5 text-meta font-semibold text-danger">{problem}</p>}
        {why && <p role="status" className="px-1.5 text-meta font-semibold text-gold-ink">{why}</p>}
      </div>
    );
    bottom = (
      <>
        <Button icon={loading ? <Loader2 className="animate-spin" /> : <Mic />} disabled={!!why || loading || tried} onClick={onBegin}>ვიწყებ</Button>
        <Button kind="ghost" onClick={onPractise}>ჯერ კიდევ ვივარჯიშებ</Button>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-1 px-4">
        <TopBar title="გამოცდა" sub={`${voiceName} · „${title}“`} onBack={busy ? undefined : onClose} />
        {body}
      </div>
      {bottom && <Bottom>{bottom}</Bottom>}
    </>
  );
};
