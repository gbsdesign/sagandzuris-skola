import React, { useEffect, useMemo, useState } from 'react';
import { useAuth, useChants, useNavigation, useViewing } from '../../context';
import { useMyHabits } from '../../hooks/useMyHabits';
import { useMembership } from '../../utils/memberAccess';
import { dayKey } from '../../utils/habitsWeek';
import { busyNow } from '../../utils/appUpdate';
import { EVENING_OPEN } from '../../utils/prayerReminders';
import {
  isEvening, putOff, putOffUntil, syncEveningReminder, takeEveningRequest, useEveningAt,
} from '../../utils/eveningCheck';
import { Button, Choice, Note, Rows, Sheet } from '../ui2';
import { Blessing, celebrate, dueDailyOf } from './useHabits';

// „საღამოს კითხვა“ (utils/eveningCheck.ts): from the member's hour (21:00 unless changed) until midnight the open app asks
// once „რა შეასრულე დღეს?“ with the day's habits not ticked yet; the member ticks what they did — or nothing — and saves.
// „მოგვიანებით“ (or ✕) asks again in an hour, „დღეს აღარა“ tomorrow; a tap on the phone's notice opens it at once. Mounted once for the whole app.

export const EveningCheck: React.FC = () => {
  const { user } = useAuth();
  const viewing = !!useViewing();
  const membership = useMembership();
  const { habitLog, habitCounts, toggleHabit } = useChants();
  const { navigateTo } = useNavigation();
  const mine = useMyHabits(user?.uid);
  const at = useEveningAt();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [blessing, setBlessing] = useState(false);
  // the clock: the evening's start and midnight move the list
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const member = !!user && membership.isMember && !viewing;
  const today = dayKey(now);
  const { left, due } = useMemo(() => {
    const items = mine.groups.flatMap(g => g.items);
    const dueIds = dueDailyOf(mine.groups)(now);
    const on = habitLog[today] || [];
    return { due: dueIds, left: items.filter(h => dueIds.includes(h.id) && !on.includes(h.id)) };
  }, [mine.groups, habitLog, today, now]);
  const hasHabits = due.length > 0;
  const doneToday = hasHabits && left.length === 0;

  // the phone's notice follows: today while something is left, tomorrow once all is ticked (never on a teacher's look)
  useEffect(() => {
    if (viewing || membership.status === 'loading') return;
    syncEveningReminder({ signedIn: member && hasHabits, doneToday });
  }, [member, hasHabits, doneToday, viewing, membership.status, at]);

  const show = () => {
    if (!member) return;
    if (!left.length) { navigateTo('gz'); return; }
    setPicked(new Set());
    setOpen(true);
  };

  // the evening's own moment, once (and again an hour after „მოგვიანებით“)
  useEffect(() => {
    if (open || !member || !left.length || !isEvening(at, now)) return;
    if (Date.now() < putOffUntil() || busyNow()) return;
    show();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, member, left.length, at, open]);

  // a tap on the notice (/?open=sagamo, or the page's own notice)
  useEffect(() => {
    if (!member || !mine.groups.length) return;
    if (takeEveningRequest()) show();
    const onOpen = () => { takeEveningRequest(); show(); };
    window.addEventListener(EVENING_OPEN, onOpen);
    return () => window.removeEventListener(EVENING_OPEN, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member, mine.groups, left]);

  useEffect(() => {
    if (!blessing) return;
    const t = window.setTimeout(() => setBlessing(false), 2800);
    return () => window.clearTimeout(t);
  }, [blessing]);

  const later = () => { putOff(false); setOpen(false); };
  const enough = () => { putOff(true); setOpen(false); };
  const save = () => {
    const date = new Date();
    let ticked = 0;
    for (const h of left) if (picked.has(h.id) && toggleHabit(h.id, date)) ticked++;
    putOff(true);
    setOpen(false);
    if (ticked && ticked === left.length) { celebrate(); setBlessing(true); }
  };
  const flip = (id: string) => setPicked(p => {
    const next = new Set(p);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const counted = (id: string) => {
    const c = mine.counters[id];
    if (!c) return undefined;
    const n = habitCounts[today]?.[id] ?? 0;
    return `${n} / ${c.goal}${c.unit && c.unit !== 'ჯერ' ? ` ${c.unit}` : ''}`;
  };

  return (
    <>
      <Sheet open={open} title="დღის ბოლო 🌙" onClose={later}>
        <Note className="text-body text-ink">რა შეასრულე დღეს? მონიშნე, რაც გააკეთე.</Note>
        <Rows role="group" aria-label="დღის ჩვევები">
          {left.map(h => (
            <Choice key={h.id} multi wrap title={h.label} sub={counted(h.id)} on={picked.has(h.id)} onClick={() => flip(h.id)} />
          ))}
        </Rows>
        <div className="mt-2 flex flex-col gap-2">
          <Button full disabled={!picked.size} onClick={save}>
            {picked.size ? `მონიშვნა · ${picked.size}` : 'მონიშვნა'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button full kind="quiet" onClick={later}>მოგვიანებით</Button>
            <Button full kind="quiet" onClick={enough}>დღეს აღარა</Button>
          </div>
        </div>
        <Note>ამ კითხვის საათი ან გამორთვა — პარამეტრებში, „შეტყობინებებში“.</Note>
      </Sheet>
      {blessing && <Blessing />}
    </>
  );
};

export default EveningCheck;
