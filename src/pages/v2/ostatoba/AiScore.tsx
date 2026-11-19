import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AudioLines, Hourglass, Mic, RefreshCw, Sparkles, WifiOff } from 'lucide-react';
import { Bar, Button, Card, Num, Rows, TopBar, cx } from '../../../components/ui2';
import { AI_GRADE_DOTS, AI_GRADE_WORD, AI_LINES, type AiGrade, type AiGrades } from '../../../utils/drillScore';

// „ოსტატობა“'s AI score in the new look (boards x-ultra-ai 1–4): a screen of its own over the exercise — before recording
// (three steps, „ჩაწერა“), while it listens (no spinner: a bar that fills), the answer (always three lines of one word —
// „კარგია“, „თითქმის“, „სავარჯიშოა“ — and one tip in one sentence), and the month's limit. On top it always says that
// this is a program, not a person. Without the internet the take waits on the phone (utils/aiScoreQueue). The exercise
// and its logic stay in components/mastery/ManeraLessonSheet; this only draws.

export type AiScoreState =
  | { kind: 'intro' }
  | { kind: 'listening' }
  | { kind: 'answer'; grades: AiGrades; tip: string }
  | { kind: 'limit' }
  | { kind: 'offline'; kept: boolean }
  | { kind: 'problem'; text: string };

export interface AiScoreActions {
  onBack: () => void;
  /** „ჩაწერა“ / „კიდევ ერთხელ“: the scored run again */
  onRecord: () => void;
  /** a problem: ask once more with the same take */
  onRetry?: () => void;
  /** the month's limit: the tuner instead */
  onTuner: () => void;
}

/** The tint card that says who listens: a program. */
const ProgramCard: React.FC<{ done: boolean }> = ({ done }) => (
  <div className="flex shrink-0 items-center gap-3 rounded-card bg-tint px-4 py-3.5">
    <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center text-wine [&_svg]:size-[22px]"><Sparkles /></span>
    <span className="flex min-w-0 flex-col">
      <span className="text-lead font-bold wrap-break-word">{done ? 'AI მასწავლებელმა მოგისმინა' : 'AI მასწავლებელი მოგისმენს'}</span>
      <span className="text-meta text-mut">ეს პროგრამაა და არა ადამიანი</span>
    </span>
  </div>
);

/** A calm middle of the screen: a round mark, a title, a sentence (and what goes under them). */
const Middle: React.FC<{ icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }> = ({ icon, title, text, children }) => (
  <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
    <span aria-hidden="true" className="mb-1.5 flex size-[84px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-9">{icon}</span>
    <h2 className="text-title font-bold wrap-break-word">{title}</h2>
    <p className="max-w-[300px] text-body leading-normal text-mut">{text}</p>
    {children}
  </div>
);

const GRADE_TONE: Record<AiGrade, string> = { good: 'text-wine', almost: 'text-mut', practice: 'text-gold-ink' };

/** One line of the answer: its name, three marks, its one word. */
const GradeRow: React.FC<{ label: string; grade: AiGrade }> = ({ label, grade }) => (
  <div className="flex min-h-14 items-center gap-3 py-2 pr-4 pl-4">
    <span className="min-w-0 flex-1 text-lead font-bold wrap-break-word">{label}</span>
    <span aria-hidden="true" className="flex shrink-0 gap-1">
      {[0, 1, 2].map(i => <span key={i} className={cx('h-2 w-5 rounded-full', i < AI_GRADE_DOTS[grade] ? 'bg-wine' : 'bg-track')} />)}
    </span>
    <span className={cx('w-[86px] shrink-0 text-right text-meta font-bold', GRADE_TONE[grade])}>{AI_GRADE_WORD[grade]}</span>
  </div>
);

/** While it listens: a bar that fills over ~20 s and waits near its end (no spinner). */
const Waiting: React.FC = () => {
  const [t, setT] = useState(0);
  useEffect(() => {
    const at = Date.now();
    const id = window.setInterval(() => setT((Date.now() - at) / 1000), 250);
    return () => window.clearInterval(id);
  }, []);
  return <Bar value={Math.min(0.92, t / 20)} h={8} label="AI ისმენს" className="mt-3 max-w-[220px]" />;
};

/** The screen as a picture of its state (for the overlay and the preview). */
export const AiScoreView: React.FC<{ title: string; state: AiScoreState } & AiScoreActions> = ({ title, state, onBack, onRecord, onRetry, onTuner }) => {
  let body: React.ReactNode;
  let foot: React.ReactNode = null;
  switch (state.kind) {
    case 'intro':
      body = (
        <>
          <ProgramCard done={false} />
          <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
            {['გაიარე სავარჯიშო მიკროფონით', 'იმღერე ისე, როგორც ვარჯიშზე', 'პასუხი 10–20 წამში მოვა'].map((s, i) => (
              <li key={s} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <Num n={i + 1} />
                <span className="min-w-0 flex-1 text-lead font-bold wrap-break-word">{s}</span>
              </li>
            ))}
          </ol>
        </>
      );
      foot = <Button full icon={<Mic />} onClick={onRecord}>ჩაწერა</Button>;
      break;
    case 'listening':
      body = <Middle icon={<Sparkles />} title="ვუსმენ შენს ჩანაწერს…" text="10–20 წამი. გვერდიდან ნუ გახვალ."><Waiting /></Middle>;
      break;
    case 'answer':
      body = (
        <>
          <ProgramCard done />
          <Rows aria-label="შეფასება">
            {AI_LINES.map(l => <GradeRow key={l.id} label={l.label} grade={state.grades[l.id]} />)}
          </Rows>
          {state.tip && (
            <Card>
              <p className="text-meta font-semibold text-mut">ერთი რჩევა</p>
              <p className="mt-1.5 text-lead leading-relaxed wrap-break-word">{state.tip}</p>
            </Card>
          )}
        </>
      );
      foot = <Button full icon={<RefreshCw />} onClick={onRecord}>კიდევ ერთხელ</Button>;
      break;
    case 'limit':
      body = <Middle icon={<Hourglass />} title="ამ თვის ლიმიტი ამოიწურა" text="AI-ს შეფასება შემდეგ თვეში დაბრუნდება. საზომი და მზა შესწორებები ისევ მუშაობს." />;
      foot = (
        <>
          <Button full icon={<AudioLines />} onClick={onTuner}>ტიუნერით ვარჯიში</Button>
          <Button full kind="ghost" onClick={onBack}>უკან სავარჯიშოზე</Button>
        </>
      );
      break;
    case 'offline':
      body = (
        <Middle icon={<WifiOff />} title="ინტერნეტი არ არის"
          text={state.kept
            ? 'შეფასებას ინტერნეტი სჭირდება. ჩანაწერი შენახულია — როცა დაბრუნდება, გამოგიგზავნი.'
            : 'შეფასებას ინტერნეტი სჭირდება. ამ ბრაუზერში ჩანაწერი ვერ შეინახა — ინტერნეტით კიდევ სცადე.'} />
      );
      foot = <Button full kind="ghost" onClick={onBack}>უკან სავარჯიშოზე</Button>;
      break;
    default:
      body = <Middle icon={<Sparkles />} title="პასუხი ვერ მოვიდა" text={state.text} />;
      foot = (
        <>
          {onRetry && <Button full icon={<RefreshCw />} onClick={onRetry}>კიდევ სცადე</Button>}
          <Button full kind="ghost" onClick={onBack}>უკან სავარჯიშოზე</Button>
        </>
      );
  }
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col gap-3 px-4 pb-[max(18px,env(safe-area-inset-bottom))]">
      <TopBar title="შეფასება" sub={title} onBack={onBack} />
      {body}
      {foot && <div className="mt-auto flex flex-col gap-2 pt-3">{foot}</div>}
    </div>
  );
};

const STEP = 'sgAiScore';

/** The screen over the exercise, with a history step of its own (`sgAiScore`): the phone's back closes only it. */
export const AiScoreScreen: React.FC<{ open: boolean; onClose: () => void; title: string; state: AiScoreState } & Omit<AiScoreActions, 'onBack'>> = ({
  open, onClose, ...rest
}) => {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    try { if (!window.history.state?.[STEP]) window.history.pushState({ ...(window.history.state || {}), [STEP]: 1 }, ''); } catch { /* opens anyway */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.[STEP]) closeRef.current(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); back(); } };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey, true); };
  }, [open]);
  const back = () => { if (window.history.state?.[STEP]) window.history.back(); else closeRef.current(); };
  if (!open) return null;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="შეფასება"
      className="sg-in fixed inset-0 z-[85] overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <AiScoreView {...rest} onBack={back} />
    </div>,
    document.body,
  );
};

/** Closes the screen's history step (when the screen goes from inside the exercise, e.g. „ჩაწერა“). */
export const leaveAiScore = () => { if (window.history.state?.[STEP]) window.history.back(); };
