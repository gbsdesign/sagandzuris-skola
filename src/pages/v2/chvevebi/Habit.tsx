import React, { useMemo, useState } from 'react';
import { Bell, BookOpen, Check, Pencil, RotateCcw } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { Button, Card, Dot, FOCUS, H2, Press, RoundButton, Row, Rows, Sheet, Small, Stats, ToggleRow, TopBar, cx } from '../../../components/ui2';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { useOpenSearchTarget } from '../../../components/search/openSearchTarget';
import { linkIcon } from '../../../components/views/HabitLinks';
import { HabitPrayerMenu, singlePrayerOf } from '../../../components/views/HabitPrayerMenu';
import { PER_WORD } from '../../../components/habits/HabitPage';
import { HabitsModel } from '../../../components/habits/useHabits';
import { COUNTER_TAP_STEP, HabitCounter } from '../../../data/habitLooks';
import { MENU_LABELS, HabitLink, setHabitAlerts } from '../../../utils/myHabits';
import { MONTHS_GE } from '../../../utils/dateNames';
import { canTickDay, dayKey } from '../../../utils/habitsWeek';
import { currentRun, goalShare, ticksBetween, ticksOf } from '../../../utils/habitStats';
import { askNotificationPermission } from '../../../utils/prayerReminders';
import { triggerHaptic } from '../../../utils/haptics';
import { settingsItem, useHabitsDate, useHabitsNav } from './nav';

// A habit's own page (board x-chveva): the big tick of the picked day (or the counter), three numbers, the month as dots,
// what the habit opens, its reminder and its note.

const NotFound: React.FC = () => {
  const { back } = useHabitsNav();
  return (
    <>
      <TopBar title="ჩვევა" onBack={back} />
      <Card className="flex flex-col items-start gap-3">
        <H2 flush>ეს ჩვევა აღარ არის</H2>
        <Button kind="soft" onClick={back}>უკან</Button>
      </Card>
    </>
  );
};

/** the day's count as a big round (each tap +1) with quick steps under it */
const CounterPad: React.FC<{ model: HabitsModel; id: string; date: Date; counter: HabitCounter; dayWord: string }> = ({ model, id, date, counter, dayWord }) => {
  const n = model.countOn(id, date);
  const done = n >= counter.goal;
  const r = 46;
  const length = 2 * Math.PI * r;
  const steps = counter.goal >= 50 ? [10, 33, 100] : counter.goal >= 10 ? [5, 10] : [1, 5];
  const open = canTickDay(date);
  const add = (k: number) => { triggerHaptic(k === 1 ? 6 : 12); model.setCount(id, Math.max(0, n + k), date); };
  return (
    <Card className="flex flex-col items-center gap-3">
      <Press
        onClick={() => add(COUNTER_TAP_STEP[id] ?? 1)}
        disabled={!open}
        aria-label={`+1 — ${n} / ${counter.goal} ${counter.unit}`}
        className={cx('relative size-44 cursor-pointer rounded-full bg-page transition active:scale-[0.97] disabled:cursor-default disabled:active:scale-100', FOCUS)}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="5" className="stroke-track" />
          {n > 0 && (
            <circle
              cx="50" cy="50" r={r} fill="none" strokeWidth="5" strokeLinecap="round" className="stroke-wine transition-[stroke-dashoffset] duration-300"
              strokeDasharray={length} strokeDashoffset={length * (1 - Math.min(1, n / counter.goal))}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-hero font-bold tabular-nums text-wine">{n}</span>
          <span className="text-meta text-mut">/ {counter.goal} {counter.unit}</span>
          {done && <span className="mt-1 inline-flex items-center gap-1 text-meta font-bold text-leaf-ink"><Check className="size-3.5" strokeWidth={3} />შესრულდა</span>}
        </span>
      </Press>
      <p className="text-meta text-mut">{dayWord} · წრეს შეეხე — +1</p>
      {open && (
        <div className="flex flex-wrap justify-center gap-2">
          <Button kind="soft" size="md" disabled={n === 0} onClick={() => add(-1)} aria-label="−1">−1</Button>
          {steps.map(k => <Button key={k} kind="soft" size="md" onClick={() => add(k)}>+{k}</Button>)}
          {n > 0 && (
            <Button kind="ghost" size="md" icon={<RotateCcw />} aria-label="განულება" onClick={() => { triggerHaptic(12); model.setCount(id, 0, date); }}>0</Button>
          )}
        </div>
      )}
    </Card>
  );
};

export const HabitScreen: React.FC<{ model: HabitsModel; id: string }> = ({ model, id }) => {
  const { user } = useAuth();
  const { go, back } = useHabitsNav();
  const [date, setDate] = useHabitsDate();
  const { openPrayer } = useNavigation();
  const access = useAccess();
  const openTarget = useOpenSearchTarget();
  const mine = useMyHabits(user?.uid);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const item = model.all.find(x => x.habit.id === id);
  const ticks = useMemo(() => ticksOf(model.log, id), [model.log, id]);
  if (!item) return <NotFound />;
  const { habit, group } = item;
  const goal = group.goal;
  const counter = model.counters[id];

  const now = new Date();
  const today = dayKey(date) === dayKey(now);
  const dayWord = today ? 'დღეს' : `${date.getDate()} ${MONTHS_GE[date.getMonth()]}`;
  const on = model.isOn(id, date);
  const open = canTickDay(date);

  const run = currentRun(ticks, goal, model.first);
  const share = goalShare(ticks, goal, model.first, new Date(now.getFullYear(), now.getMonth(), 1));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(now);

  const single = !(habit.links?.length) ? singlePrayerOf(habit.menu) : null;
  const openLink = (l: HabitLink) => {
    if (l.kind !== 'find') return;
    const state = l.section ? access.section(l.section as Parameters<typeof access.section>[0]) : 'open';
    if (state === 'locked') { askSignIn(l.title); return; }
    if (state === 'hidden' || state === 'soon') return;
    openTarget(l.open);
  };
  const remindOn = !!habit.alerts?.length;
  const setRemind = async (next: boolean) => {
    if (!user) return;
    mine.save(setHabitAlerts(mine.setup, id, next ? [0] : [])).catch(() => {});
    if (next) {
      const leave = await askNotificationPermission();
      setBlocked(leave === 'denied' || leave === 'unsupported');
    }
  };

  return (
    <>
      <TopBar
        title={habit.label}
        onBack={back}
        right={model.signedIn && <RoundButton label="ჩვევის პარამეტრები" onClick={() => go(settingsItem(id))}><Pencil aria-hidden="true" strokeWidth={1.75} /></RoundButton>}
      />
      <div className="flex flex-col gap-3 pb-4">
        {counter ? (
          <CounterPad model={model} id={id} date={date} counter={counter} dayWord={dayWord} />
        ) : (
          <Press
            onClick={() => model.toggle(id, date)}
            disabled={!open}
            aria-pressed={on}
            className={cx('flex w-full cursor-pointer items-center gap-3.5 rounded-card bg-surf p-4 text-left transition active:bg-soft disabled:cursor-default disabled:active:bg-surf', FOCUS)}
          >
            <span aria-hidden="true" className={cx('flex size-14 shrink-0 items-center justify-center rounded-full', on ? 'bg-wine text-white' : 'border-2 border-dim')}>
              {on && <Check className="size-7" strokeWidth={2.6} />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-head font-bold wrap-break-word">{on ? `${dayWord} შესრულებულია` : `${dayWord} შევასრულე`}</span>
              <span className="text-meta text-mut">{!open ? 'ამ დღის მონიშვნა აღარ შეიძლება' : on ? 'შეეხე, თუ მოხსნა გინდა' : 'შეეხე, რომ მოინიშნოს'}</span>
            </span>
          </Press>
        )}

        <Stats items={[
          { value: run, label: `${PER_WORD[goal.per]} ზედიზედ` },
          { value: share.of ? `${share.percent}%` : '—', label: 'ამ თვეს' },
          { value: ticks.size, label: 'სულ' },
        ]} />

        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <H2 flush>{MONTHS_GE[now.getMonth()]}</H2>
            <Small>{ticksBetween(ticks, monthStart, new Date(now.getFullYear(), now.getMonth() + 1, 0))} დღე</Small>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: days }, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
              const key = dayKey(d);
              const done = ticks.has(key);
              const picked = key === dayKey(date);
              const look = cx(
                'aspect-square rounded-full',
                done ? 'bg-wine' : key > todayKey ? 'bg-track' : 'bg-soft',
                picked && 'ring-2 ring-wine ring-offset-2 ring-offset-surf',
              );
              return canTickDay(d) ? (
                <Press key={i} aria-label={`${d.getDate()} ${MONTHS_GE[d.getMonth()]}${done ? ' — შესრულებულია' : ''}`} onClick={() => setDate(d)} className={cx(look, 'cursor-pointer')} />
              ) : (
                <span key={i} aria-hidden="true" className={look} />
              );
            })}
          </div>
        </Card>

        {(habit.menu || habit.links?.length || (habit.time && model.signedIn)) && (
          <Card pad="none">
            <Rows>
              {habit.menu && (
                <Row
                  lead={<Dot icon={<BookOpen />} />}
                  title="გახსენი ლოცვა"
                  sub={MENU_LABELS[habit.menu]}
                  onClick={() => (single ? openPrayer(single) : setMenuOpen(true))}
                />
              )}
              {habit.links?.map((l, i) => (
                <Row
                  key={i}
                  lead={<Dot icon={linkIcon(l)} />}
                  title={l.title}
                  sub={l.kind === 'url' ? 'ბმული' : 'აპის გვერდი'}
                  {...(l.kind === 'url' ? { href: l.url, target: '_blank' } : { onClick: () => openLink(l) })}
                />
              ))}
              {habit.time && model.signedIn && (
                <ToggleRow lead={<Dot icon={<Bell />} />} title={`შეხსენება ${habit.time.from}-ზე`} on={remindOn} onChange={on2 => void setRemind(on2)} />
              )}
            </Rows>
          </Card>
        )}
        {blocked && <p className="px-1.5 text-meta text-danger">შეტყობინებები ამ ბრაუზერში დაბლოკილია — ჩართე საიტის პარამეტრებში.</p>}

        {habit.hint && <p className="px-1.5 text-meta leading-normal text-mut">{habit.hint}</p>}
        {habit.note && <p className="px-1.5 text-body leading-normal whitespace-pre-line text-mut wrap-break-word">{habit.note}</p>}
      </div>

      {habit.menu && (
        <Sheet open={menuOpen} title={MENU_LABELS[habit.menu]} onClose={() => setMenuOpen(false)}>
          <HabitPrayerMenu menu={habit.menu} onOpen={p => { setMenuOpen(false); openPrayer(p); }} />
        </Sheet>
      )}
    </>
  );
};
