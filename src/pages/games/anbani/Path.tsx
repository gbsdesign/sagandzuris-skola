import React, { useCallback, useMemo, useState } from 'react';
import { BookOpen, Check, Flame, Lock, Play, RotateCcw, ScrollText, Target } from 'lucide-react';
import {
  LETTER_UNITS, LINES_UNIT, OLD_SCRIPTS, UNITS, WORDS_UNIT, buildLesson, isOldScript, lessonId, lessonsDone, lettersThrough,
  practiceId, streakOf, unitsDone, updateWeak, withLesson, type OldScript,
} from '../../../utils/anbani';
import { tbilisiToday } from '../../../utils/hangi';
import { SCRIPT_LABEL, toScript } from '../../../utils/oldScripts';
import { triggerHaptic } from '../../../utils/haptics';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { anbaniLines, anbaniWords } from '../../../data/anbaniWords';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card } from '../../../components/ui/kit';
import { KnownAlphabet } from '../tsartsera/parts';
import { LessonScreen } from './Lesson';

// „სამი დამწერლობა“ alone (the hub's „ონლაინ“, 2026-11-01): the path of a script — asomtavruli or nuskhuri — nine round steps
// that open one by one (seven of letters, then words, then lines), the streak and the day's goal on top, „გაიმეორე“ for the
// letters missed most, and the alphabet learned so far below. The record goes through useDailyRecord('anbani'); the misses
// of each letter stay on this device (`sg-anbani-weak`).

const SCRIPT_KEY = 'sg-anbani-script';
const WEAK_KEY = 'sg-anbani-weak';
type Weak = Record<OldScript, Record<string, number>>;
const readWeak = (): Weak => {
  try {
    const o = JSON.parse(localStorage.getItem(WEAK_KEY) || 'null') as Partial<Weak> | null;
    return { asomtavruli: o?.asomtavruli ?? {}, nuskhuri: o?.nuskhuri ?? {} };
  } catch { return { asomtavruli: {}, nuskhuri: {} }; }
};
// the path's bends: each step a little to the side of the one before
const BEND = [0, 46, 70, 46, 0, -46, -70, -46, 0];

const unitTitle = (u: number) => (u === WORDS_UNIT ? 'სიტყვები' : u === LINES_UNIT ? 'სტრიქონები' : `${u + 1}. ${LETTER_UNITS[u].join(' ')}`);

export const AnbaniPath: React.FC = () => {
  const rec = useDailyRecord('anbani');
  const today = useMemo(() => tbilisiToday(), []);
  const [script, setScriptState] = useState<OldScript>(() => { try { const s = localStorage.getItem(SCRIPT_KEY); return isOldScript(s) ? s : 'asomtavruli'; } catch { return 'asomtavruli'; } });
  const setScript = (s: OldScript) => { setScriptState(s); try { localStorage.setItem(SCRIPT_KEY, s); } catch { /* private mode */ } };
  const [weak, setWeak] = useState<Weak>(readWeak);
  const [playing, setPlaying] = useState<{ unit: number | 'practice'; seed: number } | null>(null);

  const done = useMemo(() => lessonsDone(rec.days), [rec.days]);
  const reached = unitsDone(done, script);
  const streak = streakOf(rec.days, today);
  const todayDone = rec.days[today]?.guesses.length ?? 0;
  const known = lettersThrough(Math.min(reached, LETTER_UNITS.length) - 1);

  const onLetter = useCallback((letter: string, right: boolean) => {
    setWeak(w => {
      const next = { ...w, [script]: updateWeak(w[script], letter, right) };
      try { localStorage.setItem(WEAK_KEY, JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  }, [script]);

  const id = playing ? (playing.unit === 'practice' ? practiceId(script) : lessonId(script, playing.unit)) : '';
  const { save, days } = rec;
  const onWin = useCallback(() => { if (id) save(today, withLesson(days[today], id)); }, [id, save, days, today]);

  if (playing) {
    const unit = playing.unit;
    const make = (attempt: number) => buildLesson(unit, { pool: anbaniWords(), lines: anbaniLines(), weak: weak[script] }, (playing.seed + attempt * 7919) >>> 0, reached);
    return (
      <LessonScreen
        script={script}
        title={unit === 'practice' ? `გამეორება · ${SCRIPT_LABEL[script]}` : `${SCRIPT_LABEL[script]} · ${unitTitle(unit)}`}
        make={make}
        streak={streak}
        fresh={typeof unit === 'number' && unit < LETTER_UNITS.length ? LETTER_UNITS[unit] : []}
        onLetter={onLetter}
        onWin={onWin}
        onClose={() => setPlaying(null)}
      />
    );
  }

  const start = (unit: number | 'practice') => { triggerHaptic(10); setPlaying({ unit, seed: (Date.now() % 2_147_483_647) || 1 }); };

  return (
    <div className="space-y-4">
      <Card className="!p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="დამწერლობა">
          {OLD_SCRIPTS.map(s => (
            <Chip key={s} on={script === s} onClick={() => setScript(s)}>
              <span className="font-serif-ge mr-1.5 text-[15px]">{toScript('ა', s)}</span>{SCRIPT_LABEL[s]}
            </Chip>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-[#fff3e0] px-2 py-2">
            <Flame className={`mx-auto w-6 h-6 ${streak ? 'text-[#e8731c] fill-[#f6b04a]' : 'text-[#d8b48a]'}`} aria-hidden="true" />
            <p className="mt-0.5 text-[17px] font-bold tabular-nums text-[#c25b12] leading-tight">{streak}</p>
            <p className="text-[12px] text-[#9a6a3c]">დღე ზედიზედ</p>
          </div>
          <div className={`rounded-2xl px-2 py-2 ${todayDone ? 'bg-[#e6f2e9]' : 'bg-[#f6f0e4]'}`}>
            {todayDone ? <Check className="mx-auto w-6 h-6 text-[#2f7d4f] stroke-[3]" aria-hidden="true" /> : <Target className="mx-auto w-6 h-6 text-[#a0703c]" aria-hidden="true" />}
            <p className={`mt-0.5 text-[17px] font-bold tabular-nums leading-tight ${todayDone ? 'text-[#2f7d4f]' : 'text-[#4a3426]'}`}>{todayDone}</p>
            <p className="text-[12px] text-[#75685a]">{todayDone ? 'დღის მიზანი ✓' : 'დღეს — ერთი'}</p>
          </div>
          <div className="rounded-2xl bg-[#f6f0e4] px-2 py-2">
            <span className="block font-serif-ge text-[22px] leading-6 text-[#7a2028]">{toScript('ბ', script)}</span>
            <p className="mt-0.5 text-[17px] font-bold tabular-nums text-[#4a3426] leading-tight">{reached} / {UNITS}</p>
            <p className="text-[12px] text-[#75685a]">ნაბიჯი</p>
          </div>
        </div>
      </Card>

      <ol className="py-2 flex flex-col items-center gap-3" aria-label={`${SCRIPT_LABEL[script]}: გზა`}>
        {Array.from({ length: UNITS }, (_, u) => {
          const state = u < reached ? 'done' : u === reached ? 'open' : 'locked';
          const letters = u < LETTER_UNITS.length ? LETTER_UNITS[u] : null;
          const Icon = u === WORDS_UNIT ? BookOpen : ScrollText;
          return (
            <li key={u} className="flex flex-col items-center" style={{ transform: `translateX(${BEND[u]}px)` }}>
              {state === 'open' && rec.loaded && (
                <span className="mb-1.5 h-8 px-3 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#7a2028] inline-flex items-center shadow-sm">{u === 0 ? 'დაიწყე აქედან' : 'შემდეგი'}</span>
              )}
              <button
                type="button"
                disabled={state === 'locked' || !rec.loaded}
                onClick={() => start(u)}
                aria-label={`${unitTitle(u)} — ${state === 'done' ? 'გავლილია, კიდევ ერთხელ' : state === 'open' ? 'დაწყება' : 'ჯერ დაკეტილია'}`}
                className={`relative w-[76px] h-[76px] rounded-full flex items-center justify-center transition cursor-pointer disabled:cursor-default active:scale-[0.96] ${
                  state === 'done' ? 'bg-[#c9a227] text-white shadow-[0_5px_0_#a3821b]'
                    : state === 'open' ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_5px_0_#5a151c] ring-4 ring-[#7a2028]/20'
                      : 'bg-[#e9e1d3] text-[#b3a48c] shadow-[0_5px_0_#d5c9b5]'
                }`}
              >
                {letters ? <span className="font-serif-ge text-[36px] leading-none">{toScript(letters[0], script)}</span> : <Icon className="w-8 h-8" aria-hidden="true" />}
                {state === 'done' && <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#2f7d4f] ring-2 ring-white flex items-center justify-center"><Check className="w-3.5 h-3.5 stroke-[3.5]" aria-hidden="true" /></span>}
                {state === 'locked' && <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#d5c9b5] ring-2 ring-white flex items-center justify-center"><Lock className="w-3 h-3 text-white" aria-hidden="true" /></span>}
              </button>
              <span className={`mt-2.5 text-center leading-tight ${state === 'locked' ? 'text-[#b3a48c]' : 'text-[#4a3426]'}`}>
                {letters ? (
                  <>
                    <span className="block font-serif-ge text-[17px] tracking-[0.12em]">{letters.map(l => toScript(l, script)).join(' ')}</span>
                    <span className="block text-[12.5px] font-bold tracking-[0.18em]">{letters.join(' ')}</span>
                  </>
                ) : <span className="block text-[13.5px] font-bold">{unitTitle(u)}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {reached > 0 && (
        <Btn size="lg" full kind="ghost" icon={<RotateCcw />} onClick={() => start('practice')} disabled={!rec.loaded}>გაიმეორე ნასწავლი</Btn>
      )}
      {reached === 0 && rec.loaded && (
        <Btn size="lg" full icon={<Play />} onClick={() => start(0)}>პირველი გაკვეთილი</Btn>
      )}

      <Card className="!p-4">
        <KnownAlphabet script={script} known={known} />
      </Card>

      <Card tone="paper" className="!p-4 space-y-1.5 text-[13.5px] leading-snug text-[#4a3426]">
        <p className="font-serif-ge text-[15px] font-bold text-[#7a2028]">როგორ ვსწავლობთ</p>
        <p>ყოველდღე ერთი პატარა გაკვეთილი — 3–5 წუთი. შვიდ ნაბიჯში 33 ასოა (ჯერ ყველაზე ხშირი, რომ სიტყვები მალე წაიკითხო), მერე სიტყვები და სტრიქონები.</p>
        <p>სამი გული გაქვს: შეცდომა ერთს აკლებს და კითხვა ბოლოს ბრუნდება. ყოველ დღეს, როცა გაკვეთილს ასრულებ, სერია იზრდება.</p>
        <p>ძველი ასოები ძველ წიგნებსა და წარწერებს გაგიხსნის — ასომთავრული ლამაზი დიდი ასოებია, ნუსხური — ხელნაწერების ასოები.</p>
      </Card>
    </div>
  );
};
