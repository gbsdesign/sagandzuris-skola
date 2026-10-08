import React, { useEffect } from 'react';
import { Check, Play, X } from 'lucide-react';
import { DICTATIONS, VOICES3 } from '../../../data/abituriDictations';
import type { PlayMode } from '../../../data/abituriLessons';
import { playLessonNotes } from '../../../utils/chantSynth';
import { abc, interval, intervalWords, midi, signsWords, syl, type Note } from '../../../utils/musicTheory';
import {
  DURATION_NAMES, durationAbc, isRight, letterQuestion, modeTitle, placeAbove,
  type NoteName, type Task, type TaskState,
} from '../../../utils/theoryDrills';
import { triggerHaptic } from '../../../utils/haptics';
import { Staff } from '../Staff';

// One practice task: the question (in the test's own words), the student's answer by taps, and — once revealed —
// what was right and what was wrong. Controlled: the answer lives in the parent (a drill or the mock test).

export interface TaskViewProps { task: Task; state: TaskState; set: (s: TaskState) => void; reveal: boolean }

const SYL = ['დო', 'რე', 'მი', 'ფა', 'სოლ', 'ლა', 'სი'];
const SIGNS = [{ alt: -1, label: '♭' }, { alt: 0, label: '♮' }, { alt: 1, label: '♯' }];
const WHOLE = 'L:1/1\nK:C\n';
const stack = (ns: Note[]) => (ns.length > 1 ? `[${ns.map(n => abc(n)).join('')}]` : abc(ns[0]));
const scaleAbc = (ns: Note[]) => `${WHOLE}${ns.map(n => abc(n)).join(' ')} |]`;

// a task sounds by itself once the student has played one (a browser lets sound start only after a tap)
let heard = false;

// ---------- small parts ----------

const Prompt: React.FC<{ big: string; hint: string; latin?: boolean }> = ({ big, hint, latin }) => (
  <div className="text-center px-1">
    <p className={`${latin ? 'font-sans' : 'font-serif-ge'} text-[23px] font-bold leading-tight text-[#2a2017]`}>{big}</p>
    <p className="mt-1 text-[13.5px] leading-snug text-[#6b5c4d]">{hint}</p>
  </div>
);

const Correct: React.FC<{ text: string; abc?: string; play?: PlayMode | false }> = ({ text, abc: notation, play = 'arp' }) => (
  <div className="rounded-xl bg-[#edf6ef] ring-1 ring-[#bfdcc7] px-3 pt-2.5 pb-1">
    <p className="text-[14px] font-semibold text-[#2f6b43]">სწორი პასუხი: <b className="text-[#24563a]">{text}</b></p>
    {notation ? <Staff abc={notation} play={play} className="my-2.5" /> : <div className="h-1.5" />}
  </div>
);

const tone = (state: 'idle' | 'on' | 'right' | 'wrong' | 'dim') =>
  state === 'on' ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]'
    : state === 'right' ? 'bg-[#edf6ef] text-[#24563a] ring-[#7fb893] ring-2'
    : state === 'wrong' ? 'bg-[#fbeeee] text-[#a3262f] ring-[#e7a9ae] ring-2'
    : state === 'dim' ? 'bg-white text-[#b3a28d] ring-[#efe5d4]'
    : 'bg-white text-[#2a2017] ring-[#e2d5bf] hover:ring-[#7a2028]/45 hover:text-[#7a2028]';

/** a note's name: the syllable, then its sign */
const NotePicker: React.FC<{ label?: string; value: NoteName | null; onChange: (v: NoteName) => void; locked: boolean; verdict: boolean | null }> = ({ label, value, onChange, locked, verdict }) => (
  <div className={`rounded-xl px-2.5 pt-2 pb-2.5 ring-1 ${verdict === true ? 'bg-[#f5fbf6] ring-[#7fb893]' : verdict === false ? 'bg-[#fdf6f6] ring-[#e7a9ae]' : 'bg-[#fffdf8] ring-[#efe5d4]'}`}>
    {label && (
      <p className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-[#8a7a6a]">
        {label}
        {value && <span className="text-[#2a2017]">— {syl({ ...value, oct: 4 })}</span>}
        {verdict === true && <Check className="w-4 h-4 text-[#2f6b43]" />}
        {verdict === false && <X className="w-4 h-4 text-[#a3262f]" />}
      </p>
    )}
    <div className="grid grid-cols-7 gap-1">
      {SYL.map((s, step) => (
        <button
          key={s}
          type="button"
          disabled={locked}
          onClick={() => { triggerHaptic(8); onChange({ step, alt: value?.step === step ? value.alt : 0 }); }}
          className={`min-h-10 rounded-lg ring-1 text-[13px] font-bold transition-colors cursor-pointer disabled:cursor-default ${tone(value?.step === step ? 'on' : locked ? 'dim' : 'idle')}`}
        >
          {s}
        </button>
      ))}
    </div>
    <div className="mt-1.5 flex gap-1.5">
      {SIGNS.map(g => (
        <button
          key={g.alt}
          type="button"
          disabled={locked || !value}
          onClick={() => { triggerHaptic(8); if (value) onChange({ ...value, alt: g.alt }); }}
          aria-label={g.alt < 0 ? 'ბემოლი' : g.alt > 0 ? 'დიეზი' : 'ბეკარი'}
          className={`w-12 min-h-10 rounded-lg ring-1 text-[18px] font-bold transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60 ${tone(value && value.alt === g.alt ? 'on' : locked || !value ? 'dim' : 'idle')}`}
        >
          {g.label}
        </button>
      ))}
    </div>
  </div>
);

/** options to choose from; once revealed, the right one turns green and a wrong choice red */
const Choices = <T extends string | number>({ options, value, right, reveal, onPick, render, cols = 2 }: {
  options: T[]; value: T | null; right: T; reveal: boolean; onPick: (v: T) => void; render?: (o: T) => React.ReactNode; cols?: 2 | 3;
}) => (
  <div className={`grid gap-2 ${cols === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
    {options.map(o => {
      const state = reveal ? (o === right ? 'right' : o === value ? 'wrong' : 'dim') : o === value ? 'on' : 'idle';
      return (
        <button
          key={String(o)}
          type="button"
          disabled={reveal}
          onClick={() => { triggerHaptic(8); onPick(o); }}
          className={`min-h-12 rounded-xl ring-1 px-2 py-2 text-center transition-colors cursor-pointer disabled:cursor-default ${tone(state)}`}
        >
          {render ? render(o) : <span className="text-[16px] font-bold">{o}</span>}
        </button>
      );
    })}
  </div>
);

const BigPlay: React.FC<{ onPlay: () => void }> = ({ onPlay }) => (
  <div className="flex justify-center">
    <button
      type="button"
      onClick={() => { triggerHaptic(10); onPlay(); }}
      className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[15px] font-bold shadow-[0_8px_18px_-10px_rgba(122,32,40,0.8)] hover:bg-[#5e1820] cursor-pointer"
    >
      <Play className="w-5 h-5 fill-current" /> მოსმენა
    </button>
  </div>
);

// ---------- the tasks ----------

export const TaskView: React.FC<TaskViewProps> = props => {
  const { task: t, state: s, set, reveal } = props;
  const right = reveal && isRight(t, s);

  switch (t.kind) {
    case 'mode': {
      const mine = t.answer.map((n, i) => ({ ...n, alt: s.alts[i] }));
      const cycle = (i: number) => set({ ...s, alts: s.alts.map((a, k) => (k === i ? (a === 0 ? 1 : a === 1 ? -1 : 0) : a)) });
      return (
        <div className="space-y-3">
          <Prompt big={modeTitle(t)} hint="ააგე კილო: შეეხე ნოტს და დაუწერე ნიშანი (♮ → ♯ → ♭)." />
          <Staff abc={scaleAbc(mine)} play="even" className="my-0" />
          <div className="grid grid-cols-4 gap-1.5">
            {mine.map((n, i) => {
              const fixed = i === 0 || i === 7;
              const state = reveal ? (n.alt === t.answer[i].alt ? (fixed ? 'dim' : 'right') : 'wrong') : fixed ? 'dim' : 'idle';
              return (
                <button
                  key={i}
                  type="button"
                  disabled={fixed || reveal}
                  onClick={() => { triggerHaptic(8); cycle(i); }}
                  className={`min-h-11 rounded-xl ring-1 text-[15px] font-bold transition-colors cursor-pointer disabled:cursor-default ${tone(state)}`}
                >
                  {syl(n)}
                </button>
              );
            })}
          </div>
          {reveal && !right && <Correct text={t.answer.map(syl).join(', ')} abc={scaleAbc(t.answer)} play="even" />}
        </div>
      );
    }

    case 'interval': {
      const p = s.picks[0];
      const top = p ? placeAbove(t.given, p.step, p.alt, t.label === 'წ.8') : null;
      return (
        <div className="space-y-3">
          <Prompt big={`${syl(t.given)} → ${t.label}`} hint={`${intervalWords(t.label)} ზემოთ — აირჩიე ზედა ბგერა.`} />
          <Staff abc={`${WHOLE}"_${t.label}"${stack(top ? [t.given, top] : [t.given])} |]`} play="arp" className="my-0" />
          <NotePicker label="ზედა ბგერა" value={p} onChange={v => set({ ...s, picks: [v] })} locked={reveal} verdict={reveal ? right : null} />
          {reveal && !right && <Correct text={`${syl(t.given)}–${syl(t.answer)}`} abc={`${WHOLE}"_${t.label}"${stack([t.given, t.answer])} |]`} />}
        </div>
      );
    }

    case 'chord': {
      const [p1, p2] = s.picks;
      const n1 = p1 ? placeAbove(t.bass, p1.step, p1.alt) : null;
      const n2 = p2 ? placeAbove(n1 ?? t.bass, p2.step, p2.alt) : null;
      const shown = [t.bass, ...(n1 ? [n1] : []), ...(n2 ? [n2] : [])];
      const ok = (p: NoteName | null, n: Note) => Boolean(p) && p!.step === n.step && p!.alt === n.alt;
      const label = `${t.chordKind} ${t.shape}`;
      return (
        <div className="space-y-3">
          <Prompt big={`${syl(t.bass)} → ${label}`} hint="მოცემული ბგერა ქვედაა — აირჩიე შუა და ზედა ბგერა." />
          <Staff abc={`${WHOLE}"_${label}"${stack(shown)} |]`} play="arp" className="my-0" />
          <NotePicker label="შუა ბგერა" value={p1} onChange={v => set({ ...s, picks: [v, p2] })} locked={reveal} verdict={reveal ? ok(p1, t.answer[1]) : null} />
          <NotePicker label="ზედა ბგერა" value={p2} onChange={v => set({ ...s, picks: [p1, v] })} locked={reveal} verdict={reveal ? ok(p2, t.answer[2]) : null} />
          {reveal && !right && <Correct text={t.answer.map(syl).join('–')} abc={`${WHOLE}"_${label}"${stack(t.answer)} |]`} />}
        </div>
      );
    }

    case 'letter':
      return (
        <div className="space-y-3.5">
          <Prompt big={letterQuestion(t)} latin={!t.toLetter} hint={t.toLetter ? 'როგორ იწერება ასოებით?' : 'რა ჰქვია მარცვლოვნად?'} />
          <Choices
            options={t.options}
            value={s.choice as string | null}
            right={t.answer}
            reveal={reveal}
            onPick={v => set({ ...s, choice: v })}
            render={o => <span className={`${t.toLetter ? 'font-sans text-[18px]' : 'font-serif-ge text-[15px]'} font-bold`}>{o}</span>}
          />
        </div>
      );

    case 'rest':
      return (
        <div className="space-y-3">
          <Prompt
            big={t.fromNote ? 'ნოტი → პაუზა' : 'პაუზა → ნოტი'}
            hint={t.fromNote ? 'რომელი პაუზაა ამ ნოტის ტოლი?' : 'რომელი ნოტია ამ პაუზის ტოლი?'}
          />
          <div className="mx-auto max-w-[220px]">
            <Staff abc={durationAbc(t.dur, !t.fromNote)} play={false} className="my-0" />
          </div>
          <Choices
            options={t.options}
            value={s.choice as number | null}
            right={t.dur}
            reveal={reveal}
            onPick={v => set({ ...s, choice: v })}
            render={d => (
              <span className="block pointer-events-none">
                <Staff abc={durationAbc(d, t.fromNote)} play={false} className="my-0" bare />
                {reveal && <span className="block mt-1 text-[12px] font-semibold">{DURATION_NAMES[d]}</span>}
              </span>
            )}
          />
          {reveal && (
            <p className="text-center text-[13.5px] text-[#6b5c4d]">
              {DURATION_NAMES[t.dur]} {t.fromNote ? 'ნოტი → იგივე პაუზა' : 'პაუზა → იგივე ნოტი'}.
            </p>
          )}
        </div>
      );

    case 'transpose':
      return (
        <div className="space-y-2">
          <Prompt big={`${t.label}-ით ${t.down ? 'ქვემოთ' : 'ზემოთ'}`} hint="გადაიტანე მელოდია ფურცელზე, მერე ნახე პასუხი." />
          <Staff abc={t.given} tempo={80} className="my-2" />
          {reveal && (
            <div className="rounded-xl bg-[#edf6ef] ring-1 ring-[#bfdcc7] px-3 pt-2.5 pb-1">
              <p className="text-[14px] font-semibold text-[#2f6b43]">
                {syl(t.from)} მაჟორი ({signsWords(t.from)}) → <b className="text-[#24563a]">{syl(t.to)} მაჟორი ({signsWords(t.to)})</b>
              </p>
              <Staff abc={t.answer} tempo={80} className="my-2.5" />
            </div>
          )}
        </div>
      );

    case 'group':
      return (
        <div className="space-y-2">
          <Prompt big={`დააჯგუფე ${t.meter} ზომაში`} hint="დაყავი ტაქტებად ფურცელზე, მერე ნახე პასუხი." />
          <Staff abc={t.given} tempo={84} className="my-2" />
          {reveal && (
            <div className="rounded-xl bg-[#edf6ef] ring-1 ring-[#bfdcc7] px-3 pt-2.5 pb-1">
              <p className="text-[14px] font-semibold text-[#2f6b43]">სწორად დაჯგუფებული:</p>
              <Staff abc={t.answer} tempo={84} className="my-2.5" />
            </div>
          )}
        </div>
      );

    case 'earInterval':
    case 'earChord':
      return <EarView {...props} />;

    case 'motif':
      return (
        <div className="space-y-2">
          <Prompt big="გაიმეორე მოტივი" hint="მოუსმინე, მერე ხმამაღლა იმღერე. კიდევ მოუსმინე და შეადარე — ნოტები ბოლოს ნახე." />
          {/* opened by „ნოტების ნახვა“: a fresh staff, drawn uncovered */}
          <Staff
            key={String(reveal)}
            abc={t.abc}
            tempo={72}
            hide={!reveal}
            autoPlay={!reveal}
            uncover={false}
            coverText="ნოტები დამალულია — ჯერ მოუსმინე და გაიმეორე."
            cap={t.low ? 'დაბალი ხმისთვის (ფა გასაღები).' : 'მაღალი ხმისთვის.'}
            className="my-2"
          />
        </div>
      );

    case 'dictation': {
      const d = DICTATIONS[t.index];
      return (
        <div className="space-y-2">
          <Prompt big="კარნახი" hint={`სამი ხმა · ${d.meter} · 4 ტაქტი. მოუსმინე რამდენჯერაც გინდა, ჩაწერე ფურცელზე, მერე ნახე ნოტები.`} />
          {/* opened by „პასუხის ნახვა“: a fresh staff, drawn uncovered */}
          <Staff key={String(reveal)} abc={d.abc} tempo={d.tempo} hide={!reveal} uncover={false} voices={VOICES3} start className="my-2" />
          {reveal && <p className="text-center text-[13px] font-semibold text-[#8a7a6a]">{d.title}</p>}
        </div>
      );
    }
  }
};

// by ear: the sound plays (by itself once the student has played one), the student names it
const EarView: React.FC<TaskViewProps> = ({ task: t, state: s, set, reveal }) => {
  const sounds: Note[] = t.kind === 'earInterval' ? [t.low, interval(t.low, t.label)] : t.kind === 'earChord' ? t.notes : [];
  const answer = t.kind === 'earInterval' ? t.label : t.kind === 'earChord' ? `${t.chordKind} ${t.shape}` : '';
  const play = () => {
    heard = true;
    const m = sounds.map(midi);
    void playLessonNotes(t.kind === 'earInterval'
      ? [[0, 0.9, m[0]], [1, 0.9, m[1]], [2.2, 1.6, m[0]], [2.2, 1.6, m[1]]]
      : [...m.map(x => [0, 1.6, x] as [number, number, number]), ...m.map((x, i) => [2 + i * 0.55, 0.5, x] as [number, number, number])]);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (heard) play(); }, []);
  if (t.kind !== 'earInterval' && t.kind !== 'earChord') return null;
  const options = t.options;
  return (
    <div className="space-y-3.5">
      <Prompt
        big={t.kind === 'earInterval' ? 'რა ინტერვალი ჟღერს?' : 'რა აკორდი ჟღერს?'}
        hint={t.kind === 'earInterval' ? 'ჯერ ცალ-ცალკე, მერე ერთად. მოუსმინე რამდენჯერაც გინდა.' : 'ჯერ ერთად, მერე ცალ-ცალკე. მოუსმინე რამდენჯერაც გინდა.'}
      />
      <BigPlay onPlay={play} />
      <Choices
        options={options}
        value={s.choice as string | null}
        right={answer}
        reveal={reveal}
        cols={options.length > 4 ? 3 : 2}
        onPick={v => set({ ...s, choice: v })}
        render={o => (
          <span className="block">
            <span className="block text-[16px] font-bold">{o}</span>
            {t.kind === 'earInterval' && <span className="block text-[11.5px] font-semibold leading-tight opacity-75">{intervalWords(o)}</span>}
          </span>
        )}
      />
      {reveal && <Staff abc={`${WHOLE}"_${answer}"${stack(sounds)} |]`} play="arp" className="my-0" />}
    </div>
  );
};
