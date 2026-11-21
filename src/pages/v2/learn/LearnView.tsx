import React from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Mic, MicOff, MoreHorizontal, RefreshCw, Sparkles } from 'lucide-react';
import { Bar, Button, Card, RoundButton, Seg, TopBar } from '../../../components/ui2';
import { TeacherSays } from '../../../components/aiLesson/parts';
import { VOICE_NAMES } from '../../../utils/pearls';
import type { Voice } from '../../../utils/pathItems';
import { LearnMore, type LearnMoreProps } from './LearnMore';
import { Line, MainButton, QuietButton, TileButton, Warn, type LearnAction, type LineTone } from './parts';

// The learning mode of a chant in the new look (board x-stsavla): the bar (← „სწავლა“ and the chant, ⋯), the voices, one
// phrase in a white card (the notes picture with all its marks), the coach's one sentence, ONE big button saying what to do,
// and four white buttons — slow, once more, the phrase before, the next. The steps move on by themselves; the rare things
// sit under the big button as quiet words only while they apply, the settings in ⋯. All the logic is LearnEasy's.

export interface LearnViewProps {
  onBack: () => void;
  /** the chant's name, under „სწავლა“ */
  title: string;
  voices: { count: number; value: Voice; onChange: (v: Voice) => void };
  /** „ფრაზა 1 / 10“ */
  heading: string;
  learned: number;
  /** where I am among the phrases, 0–1 */
  progress: number;
  /** a short word about this phrase ('' for none) */
  status: string;
  /** a passing line (three rounds over …) */
  toast: string;
  picture: React.ReactNode;
  /** after singing, where the notes could not be marked on the picture: a dot a note */
  dots: boolean[] | null;
  /** the notes were marked green / red on the picture */
  marked: boolean;
  /** the teacher counted this phrase */
  approved: boolean;
  say: React.ReactNode;
  sayText: string;
  saySub?: React.ReactNode;
  main: LearnAction;
  pulse: boolean;
  slow: boolean;
  onSlow: () => void;
  again: LearnAction;
  prev: LearnAction;
  next: LearnAction;
  /** under the big button, only while they apply */
  quiet: LearnAction[];
  lines: { tone: LineTone; icon?: React.ReactNode; text: React.ReactNode }[];
  ai: { text: string; problem: string } | null;
  mirror: React.ReactNode;
  warnings: React.ReactNode[];
  onMore: () => void;
  more: LearnMoreProps;
  /** after singing (board x-ultra-khmis-shepaseba): „7 / 8“, the verdict, and one sentence — the count and the one note to fix */
  result?: { hits: number; n: number; verdict: string; line: string; done?: string } | null;
  /** a screen of its own in place of the phrase (board x-ultra-khma-4): nothing was heard, or the microphone is off */
  stop?: { off: boolean; title: string; text: string; main: LearnAction; second?: LearnAction } | null;
}

/** „7 / 8“ big, the verdict beside it and the one sentence under it; a miss is never red. */
const ResultCard: React.FC<{ r: NonNullable<LearnViewProps['result']> }> = ({ r }) => (
  <Card role="status" aria-live="polite" className="flex items-center gap-4 px-5">
    <span className="shrink-0 text-hero font-bold whitespace-nowrap text-wine tabular-nums">{r.hits} / {r.n}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="text-head font-bold wrap-break-word">{r.verdict}</span>
      {r.line && <span className="text-meta leading-snug text-mut wrap-break-word">{r.line}</span>}
      {r.done && <span className="text-meta leading-snug font-bold text-leaf-ink wrap-break-word">{r.done}</span>}
    </span>
  </Card>
);

/** Nothing heard, or the microphone off: the bar, then one calm screen with its button(s) at the bottom. */
const StopScreen: React.FC<{ stop: NonNullable<LearnViewProps['stop']> }> = ({ stop }) => (
  <div className="flex min-h-[70dvh] flex-1 flex-col">
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-2.5 px-6 py-10 text-center">
      <span aria-hidden="true" className="mb-1.5 flex size-[84px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-9">
        {stop.off ? <MicOff strokeWidth={1.75} /> : <Mic strokeWidth={1.75} />}
      </span>
      <h2 className="text-title font-bold">{stop.title}</h2>
      <p className="max-w-[300px] text-body leading-normal text-mut">{stop.text}</p>
    </div>
    <div className="flex flex-col gap-2 pb-2">
      <Button full icon={stop.main.icon} onClick={stop.main.run} disabled={stop.main.disabled}>{stop.main.label}</Button>
      {stop.second && <Button full kind="ghost" icon={stop.second.icon} onClick={stop.second.run}>{stop.second.label}</Button>}
    </div>
  </div>
);

export const LearnView: React.FC<LearnViewProps> = p => (p.stop ? (
  <>
    <TopBar title="სწავლა" sub={p.title} onBack={p.onBack} />
    <StopScreen stop={p.stop} />
  </>
) : (
  <>
    <TopBar title="სწავლა" sub={p.title} onBack={p.onBack}
      right={<RoundButton label="მეტი" onClick={p.onMore}><MoreHorizontal strokeWidth={1.75} /></RoundButton>} />

    {p.voices.count > 1 && (
      <Seg<Voice> label="ჩემი ხმა" value={p.voices.value} onChange={p.voices.onChange}
        items={(['1', '2', '3'] as Voice[]).slice(0, p.voices.count).map(v => ({ id: v, label: VOICE_NAMES[v] }))} />
    )}

    {p.result && <ResultCard r={p.result} />}

    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-body font-bold wrap-break-word">{p.heading}</h2>
        <span className="shrink-0 text-meta text-mut">ნასწავლია {p.learned}</span>
      </div>
      <Bar value={p.progress} className="mt-2" label="სად ვარ ფრაზებს შორის" />
      {p.status && <p className="mt-1.5 text-meta text-mut">{p.status}</p>}
      {p.toast && (
        <p role="status" className="mt-3 rounded-field bg-gold-tint px-3 py-2 text-center text-meta font-bold text-gold-ink">{p.toast}</p>
      )}
      <div className="mt-3">{p.picture}</div>
      {p.dots && (
        <div className="mt-2.5 flex flex-wrap gap-1" aria-hidden="true">
          {p.dots.map((h, i) => <span key={i} className={h ? 'size-3.5 rounded-full bg-leaf' : 'size-3.5 rounded-full bg-gold-tint ring-[1.5px] ring-gold'} />)}
        </div>
      )}
      {(p.marked || p.dots) && (
        <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-meta font-semibold text-mut" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-leaf/25 ring-[1.5px] ring-leaf/70" />მოხვდი</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-full bg-gold/30 ring-[1.5px] ring-gold" />აცდი</span>
        </p>
      )}
      {p.approved && (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-meta font-bold text-gold-ink"><Check className="size-4" />მასწავლებელმა ჩაგითვალა</p>
      )}
    </Card>

    {!p.result && <TeacherSays text={p.sayText} sub={p.saySub}>{p.say}</TeacherSays>}

    <MainButton action={p.main} pulse={p.pulse} />

    {p.quiet.length > 0 && (
      <div className="-my-1 flex shrink-0 flex-wrap justify-center gap-x-1">
        {p.quiet.map(a => <QuietButton key={a.label} action={a} />)}
      </div>
    )}
    {p.lines.map((l, i) => <Line key={i} tone={l.tone} icon={l.icon}>{l.text}</Line>)}
    {p.ai && (p.ai.text || p.ai.problem) && (
      p.ai.problem ? <Warn>{p.ai.problem}</Warn> : (
        <Card>
          <p className="mb-1.5 flex items-center gap-1.5 text-meta font-bold text-wine"><Sparkles className="size-4" />ავტომატური სასწავლო პროგრამა</p>
          <p className="text-body leading-relaxed whitespace-pre-line text-ink">{p.ai.text}</p>
        </Card>
      )
    )}
    {p.mirror && <Card pad="sm">{p.mirror}</Card>}
    {p.warnings.map((w, i) => <Warn key={i}>{w}</Warn>)}

    <div className="grid shrink-0 grid-cols-2 gap-2.5">
      <TileButton action={{ label: 'ნელა', icon: <Clock />, run: p.onSlow }} on={p.slow} />
      <TileButton action={{ ...p.again, icon: <RefreshCw /> }} />
      <TileButton action={{ ...p.prev, icon: <ChevronLeft /> }} />
      <TileButton action={{ ...p.next, icon: <ChevronRight /> }} />
    </div>

    <LearnMore {...p.more} />
  </>
));
