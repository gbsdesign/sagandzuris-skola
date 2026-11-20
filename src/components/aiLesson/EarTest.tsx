import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CircleCheck, Mic, MicOff, RotateCcw, TriangleAlert } from 'lucide-react';
import { singingSupported, startSinging, type SingSession } from '../../utils/singCapture';
import { oldDetectPitch } from '../../utils/earOld';
import { freqToMidi } from '../../utils/pitch';
import {
  TRIAL_SECONDS, TRIAL_TAKES, octaveNote, percent, sideLine, trialResult, trialTotal, trialVerdict,
  type TrialId, type TrialResult, type TrialSide,
} from '../../utils/earTrial';
import { Bar, Button, Card, Helper, Num, RoundButton, TopBar, cx } from '../ui2';
import { CenterNote } from './parts';

// „ყურის შემოწმება“ (AI teacher 2.0, stage 1): hold a note three times — low, middle, high, four seconds each — and
// see in numbers how much of the voice the app heard. Both ears listen to the same sound: the new one (utils/ear.ts)
// and the first one (utils/earOld.ts), so the page says plainly whether the new one is better on this voice, this
// phone, this room. Nothing is saved. The numbers are utils/earTrial.ts; opened from „ჩემი ხმა“ → „ხმის ზომა“.

export type Results = Partial<Record<TrialId, TrialResult>>;

/** one ear's column in a take's card */
const Side: React.FC<{ name: string; side: TrialSide; main?: boolean }> = ({ name, side, main }) => (
  <div className={cx('min-w-0 flex-1 rounded-field px-3 py-2.5', main ? 'bg-tint' : 'bg-page')}>
    <div className={cx('text-cap font-bold', main ? 'text-wine' : 'text-mut')}>{name}</div>
    <div className="text-title leading-tight font-bold tabular-nums">{percent(side.heard)}</div>
    <div className="text-cap leading-snug text-mut wrap-break-word">{sideLine(side)}</div>
  </div>
);

export interface EarTestViewProps {
  results: Results;
  /** the take being sung now */
  active: TrialId | null;
  /** while singing: the note heard now and the time gone, 0–1 */
  live: { midi: number | null; gone: number };
  /** the microphone was refused */
  denied?: boolean;
  onSing: (id: TrialId) => void;
  onBack: () => void;
}

/** The page itself, everything by props. */
export const EarTestView: React.FC<EarTestViewProps> = ({ results, active, live, denied, onSing, onBack }) => {
  const total = trialTotal(TRIAL_TAKES.map(t => results[t.id]).filter((r): r is TrialResult => !!r));
  const verdict = total ? trialVerdict(total) : null;
  // the next take to sing is the main button; the others are quiet
  const next = TRIAL_TAKES.find(t => !results[t.id] || results[t.id]!.quiet)?.id ?? null;
  return (
    <>
      <TopBar title="ყურის შემოწმება" sub="1 წუთი · არაფერი ინახება" onBack={onBack} className="px-4" />
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-8">
        <Helper>იმღერე „ააა“ სამჯერ: დაბლა, შუაში და მაღლა — თითო {TRIAL_SECONDS} წამი. აპის ორი ყური ერთად გისმენს. ნახავ, რომელმა რამდენი გაიგო.</Helper>
        {denied && (
          <Helper icon={<MicOff />} className="text-gold-ink">მიკროფონი არ ჩაირთო. ნება დართე ტელეფონის პარამეტრებში და თავიდან სცადე.</Helper>
        )}
        {TRIAL_TAKES.map((t, i) => {
          const r = results[t.id];
          const on = active === t.id;
          return (
            <Card key={t.id} className="p-[18px]">
              <div className="flex items-center gap-3">
                <Num n={i + 1} on={on || (!!r && !r.quiet)} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lead font-bold">{t.name}</h2>
                  <div className="text-meta leading-snug text-mut wrap-break-word">
                    {r && !r.quiet && r.note !== null && !on ? `გაიგო: ${octaveNote(r.note)}` : t.hint}
                  </div>
                </div>
                {!on && r && !r.quiet && (
                  <RoundButton label={`${t.name}: თავიდან`} size={36} tone="page" disabled={!!active} onClick={() => onSing(t.id)}><RotateCcw /></RoundButton>
                )}
              </div>

              {on && (
                <div className="mt-3.5 text-center" aria-live="polite">
                  <div className={cx('text-hero font-bold', live.midi === null && 'text-faint')}>
                    {live.midi === null ? 'გისმენ…' : octaveNote(live.midi)}
                  </div>
                  <Bar value={live.gone} h={8} label="დრო" className="mt-3" />
                  <div className="mt-2 text-meta text-mut">იმღერე „ააა“ და არ გაჩერდე</div>
                </div>
              )}

              {!on && r && !r.quiet && (
                <div className="mt-3.5 flex gap-2">
                  <Side name="ახალი ყური" side={r.now} main />
                  <Side name="ძველი ყური" side={r.was} />
                </div>
              )}

              {!on && r?.quiet && (
                <p className="mt-3 text-meta leading-normal font-semibold text-gold-ink">ხმა თითქმის არ ისმოდა. ტელეფონი ახლოს მოიტანე და თავიდან იმღერე.</p>
              )}

              {!on && (!r || r.quiet) && (
                <Button full kind={next === t.id ? 'primary' : 'soft'} icon={<Mic />} disabled={!!active} className="mt-3.5"
                  onClick={() => onSing(t.id)}>
                  ვმღერი · {TRIAL_SECONDS} წამი
                </Button>
              )}
            </Card>
          );
        })}

        {total && verdict && !active && (
          <Card className="p-[18px]">
            <div className="flex items-start gap-3">
              <span aria-hidden="true" className={cx('flex shrink-0 pt-0.5 [&_svg]:size-6', verdict.good ? 'text-leaf' : 'text-gold')}>
                {verdict.good ? <CircleCheck /> : <TriangleAlert />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-lead font-bold">სულ: ახალი {percent(total.now.heard)} · ძველი {percent(total.was.heard)}</h2>
                <p className="mt-1 text-body leading-normal text-mut">{verdict.text}</p>
              </div>
            </div>
          </Card>
        )}
        <Helper>პროცენტი = შენი სიმღერის რა ნაწილი გაიგო სწორად. „შეეშალა“ — სხვა ნოტი ან სხვა ოქტავა მოეჩვენა. „გაუწყდა“ — სიმღერის შუაში ხმა დაკარგა.</Helper>
      </div>
    </>
  );
};

/** „ყურის შემოწმება“ with the microphone. */
export const EarTest: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [results, setResults] = useState<Results>({});
  const [active, setActive] = useState<TrialId | null>(null);
  const [live, setLive] = useState<{ midi: number | null; gone: number }>({ midi: null, gone: 0 });
  const [denied, setDenied] = useState(false);
  const session = useRef<SingSession | null>(null);
  const timer = useRef(0);
  const busy = useRef(false);

  useEffect(() => () => { window.clearTimeout(timer.current); session.current?.cancel(); }, []);

  const sing = useCallback(async (id: TrialId) => {
    if (busy.current) return;
    busy.current = true;
    setLive({ midi: null, gone: 0 });
    // the first ear's reading of every look the new one gets
    const was: (number | null)[] = [];
    let s: SingSession;
    try {
      s = await startSinging(
        (midi, t) => setLive({ midi, gone: Math.min(1, t / (TRIAL_SECONDS * 1000)) }), 40,
        { newEar: true, record: false, tap: (buf, rate) => { const f = oldDetectPitch(buf, rate); was.push(f ? freqToMidi(f) : null); } },
      );
    } catch { busy.current = false; setDenied(true); return; }
    session.current = s;
    setDenied(false);
    setActive(id);
    timer.current = window.setTimeout(() => {
      void s.stop().then(take => {
        if (session.current !== s) return;
        session.current = null;
        busy.current = false;
        setResults(r => ({ ...r, [id]: trialResult(take.frames, was) }));
        setActive(null);
      });
    }, TRIAL_SECONDS * 1000);
  }, []);

  if (!singingSupported()) {
    return (
      <>
        <TopBar title="ყურის შემოწმება" onBack={onBack} className="px-4" />
        <CenterNote icon={<MicOff />} title="აქ მიკროფონი არ მუშაობს">სცადე ტელეფონის აპიდან ან სხვა ბრაუზერიდან.</CenterNote>
      </>
    );
  }
  return <EarTestView results={results} active={active} live={live} denied={denied} onSing={id => void sing(id)} onBack={onBack} />;
};
