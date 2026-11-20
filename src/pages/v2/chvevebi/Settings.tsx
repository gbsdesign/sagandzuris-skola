import React, { Suspense, lazy, useState } from 'react';
import { BookOpen, Check, Link2, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context';
import { useMyHabits } from '../../../hooks/useMyHabits';
import { Button, Card, Dot, Duo, Field, Area, H2, Note, Row, Rows, SectionLabel, Seg, Sheet, Stepper, ToggleRow, TopBar, Val, WrapChips, cx } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { HabitIcon } from '../../../components/habits/HabitIcon';
import { buttonOf, fromButton, linkIcon, sameLink } from '../../../components/views/HabitLinks';
import { alertWord, newSchedule } from '../../../components/views/HabitPlanEditor';
import { HabitsModel } from '../../../components/habits/useHabits';
import { coreOf } from '../../../utils/shortcuts';
import { COUNTER_UNITS, HABIT_ICON_IDS, HABIT_TONES, MAX_COUNTER_GOAL, TONE_IDS } from '../../../data/habitLooks';
import { HABIT_GROUPS } from '../../../data/habitsAndManera';
import {
  ALERT_CHOICES, HabitLink, HabitSchedule, MAX_ALERTS, MAX_LINKS, MENU_LABELS, normalizeUrl, removeHabit, setHabitAlerts, setHabitCounter, setHabitGroup,
  setHabitLabel, setHabitLinks, setHabitLook, setHabitMenu, setHabitRichNote, setHabitSchedule, setHabitTime, siteName,
} from '../../../utils/myHabits';
import { WEEKDAYS_SHORT_GE } from '../../../utils/dateNames';
import { dayKey } from '../../../utils/habitsWeek';
import { parseDay } from '../../../utils/habitStats';
import { plainToHtml } from '../../../utils/richNote';
import { askNotificationPermission } from '../../../utils/prayerReminders';
import { useHabitsNav } from './nav';
import { MenuChoice, MenuSheet, TimeBox } from './NewHabit';

/** one choice out of pills that wrap onto more lines (a settings row must show all its choices at once) */
const OneOf = <T extends string>({ items, value, onChange, label }: {
  items: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string;
}): React.ReactElement => (
  <WrapChips label={label} items={items} value={[value]} onChange={next => { const picked = next.find(x => x !== value); if (picked) onChange(picked); }} />
);

// A habit's settings (board x-chveva-linki): its buttons first, then every other setting of the old editor — saved at once.

const SearchPanel = lazy(() => import('../../../components/search/SearchPanel').then(m => ({ default: m.SearchPanel })));
const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];
const DATE_BOX = 'h-10 rounded-full bg-page px-3.5 text-body font-semibold text-ink tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-wine/60';
const groupTitle = (g: { id: string; title: string }) => (g.id === 'daily' ? 'ყოველდღე' : g.title);

/** „ბმულის დამატება“: an address and, if wanted, a name for the button */
const LinkSheet: React.FC<{ open: boolean; onClose: () => void; onAdd: (l: HabitLink) => void }> = ({ open, onClose, onAdd }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [bad, setBad] = useState(false);
  React.useEffect(() => { if (open) { setUrl(''); setTitle(''); setBad(false); } }, [open]);
  const add = () => {
    const href = normalizeUrl(url);
    if (!href) { setBad(true); return; }
    onAdd({ kind: 'url', url: href, title: title.trim() || siteName(href) });
    onClose();
  };
  return (
    <Sheet open={open} title="ბმულის დამატება" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); add(); }}>
        <Field label="მისამართი" type="url" inputMode="url" value={url} onChange={v => { setUrl(v); setBad(false); }} placeholder="მაგ. galoba.edu.ge" autoFocus
          hint={bad ? 'მისამართი ვერ ვიცანი — მაგ. https://galoba.edu.ge' : undefined} aria-invalid={bad} />
        <Field label="ღილაკის სახელი — თუ გინდა" value={title} onChange={setTitle} placeholder="მაგ. დილის ლოცვის ჩანაწერი" maxLength={40} />
        <Duo className="pt-1">
          <Button kind="ghost" onClick={onClose}>გაუქმება</Button>
          <Button type="submit" disabled={!url.trim()}>დამატება</Button>
        </Duo>
      </form>
    </Sheet>
  );
};

const DateBox: React.FC<{ value: string; onChange: (v: string) => void; label: string; min?: string }> = ({ value, onChange, label, min }) => (
  <input type="date" aria-label={label} min={min} value={value} onChange={e => e.target.value && onChange(e.target.value)} className={cx(DATE_BOX, 'w-40 text-center')} />
);

/** „მორგებული“: every N days / weeks (on chosen weekdays) / months, from a day, ending never, on a day or after N times */
const ScheduleCard: React.FC<{ plan: HabitSchedule; onChange: (s: HabitSchedule) => void }> = ({ plan: s, onChange }) => {
  const set = (p: Partial<HabitSchedule>) => onChange({ ...s, ...p });
  const start = parseDay(s.start);
  const days = s.days?.length ? s.days : [start.getDay()];
  const ends = s.until ? 'until' : s.count ? 'count' : 'never';
  const later = (n: number) => dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + n));
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lead font-bold">ყოველ</span>
        <Stepper label="რამდენ" value={s.every} min={1} max={99} onChange={every => set({ every })} />
      </div>
      <Seg
        label="დღე, კვირა თუ თვე"
        items={[{ id: 'day', label: 'დღეში' }, { id: 'week', label: 'კვირაში' }, { id: 'month', label: 'თვეში' }]}
        value={s.unit}
        onChange={unit => set({ unit, days: unit === 'week' ? days : undefined })}
      />
      {s.unit === 'week' && (
        <WrapChips
          label="კვირის დღეები"
          items={MONDAY_FIRST.map(d => ({ id: String(d), label: WEEKDAYS_SHORT_GE[d] }))}
          value={days.map(String)}
          // one day at least stays chosen
          onChange={next => next.length && set({ days: next.map(Number) })}
        />
      )}
      {s.unit === 'month' && <p className="text-meta text-mut">თვის {start.getDate()} რიცხვში</p>}
      <div className="flex items-center justify-between gap-2">
        <span className="text-body font-semibold">დან</span>
        <DateBox label="დან" value={s.start} onChange={v => set({ start: v })} />
      </div>
      <Seg
        label="როდის სრულდება"
        items={[{ id: 'never', label: 'უვადოდ' }, { id: 'until', label: 'თარიღამდე' }, { id: 'count', label: 'ჯერამდე' }]}
        value={ends}
        onChange={v => set(v === 'until' ? { until: later(30), count: undefined } : v === 'count' ? { count: 10, until: undefined } : { until: undefined, count: undefined })}
      />
      {ends === 'until' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold">ბოლო დღე</span>
          <DateBox label="ბოლო დღე" min={s.start} value={s.until ?? s.start} onChange={v => set({ until: v })} />
        </div>
      )}
      {ends === 'count' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold">რამდენჯერ</span>
          <Stepper label="რამდენჯერ" value={s.count ?? 10} min={1} max={999} onChange={count => set({ count })} />
        </div>
      )}
    </Card>
  );
};

type Mine = ReturnType<typeof useMyHabits>;

const Body: React.FC<{ mine: Mine; id: string }> = ({ mine, id }) => {
  const { setup, groups } = mine;
  const { back } = useHabitsNav();
  const habit = groups.flatMap(g => g.items).find(h => h.id === id)!;
  const group = groups.find(g => g.items.some(h => h.id === id))?.id ?? 'daily';
  const look = mine.looks[id];
  const counter = mine.counters[id];
  const plan = habit.schedule;
  const links = habit.links ?? [];
  const keep = (next: Parameters<typeof mine.save>[0]) => void mine.save(next).catch(() => {});

  // the name follows the stored label until the person types
  const [typed, setTyped] = useState<string | null>(null);
  const name = typed ?? habit.label;
  const setName = setTyped;
  const [note, setNote] = useState(habit.note ?? '');
  const [word, setWord] = useState(counter && !COUNTER_UNITS.includes(counter.unit) ? counter.unit : '');
  const [adding, setAdding] = useState(false);
  const [finding, setFinding] = useState(false);
  const [shown, setShown] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const full = links.length >= MAX_LINKS;
  const alerts = habit.alerts ?? [];

  const addLink = (l: HabitLink) => { if (!links.some(x => sameLink(x, l))) keep(setHabitLinks(setup, id, [...links, l])); };
  const changeAlerts = async (next: number[]) => {
    if (next.length > MAX_ALERTS) return;
    keep(setHabitAlerts(setup, id, next));
    if (next.length > alerts.length) {
      const leave = await askNotificationPermission();
      setBlocked(leave === 'denied' || leave === 'unsupported');
    }
  };
  const remove = async () => {
    if (!(await askConfirm({ title: `წაიშალოს „${habit.label}“?`, ok: 'წაშლა', danger: true }))) return;
    keep(removeHabit(setup, id));
    // one step back: the habit's own page (if that is where it came from) says it is gone
    back();
  };

  const units = counter && !COUNTER_UNITS.includes(counter.unit) ? [...COUNTER_UNITS, counter.unit] : COUNTER_UNITS;
  const groupItems = [
    ...HABIT_GROUPS.filter(g => g.id !== 'sacraments' || (!plan && group === g.id)).map(g => ({ id: g.id, label: groupTitle(g) })),
    { id: 'custom', label: 'მორგებული' },
  ];

  return (
    <div className="flex flex-col gap-3 pb-4">
      <SectionLabel label="ღილაკები" />
      <Card pad="none">
        <Rows>
          {links.map((l, i) => (
            <Row key={i} lead={<Dot icon={linkIcon(l)} />} title={l.title} wrap sub={l.kind === 'url' ? 'ბმული' : 'აპის გვერდი'} onClick={() => setShown(i)} />
          ))}
          {!full && <Row lead={<Dot icon={<Plus />} />} title="დამატება" onClick={() => setAdding(true)} />}
          {!full && <Row lead={<Dot icon={<Search />} />} title="აპის გვერდის დამატება" sub="ძებნით" onClick={() => setFinding(true)} />}
        </Rows>
      </Card>
      {full && <Note>მეტი ღილაკი აღარ ეტევა — ჯერ ერთი მოხსენი.</Note>}

      <SectionLabel label="ჩვევა" />
      <Field
        label="სახელი" value={name} onChange={setName} maxLength={60}
        onBlur={() => { if (name.trim() && name.trim() !== habit.label) keep(setHabitLabel(setup, id, name)); setTyped(null); }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        />
      <Card className="flex flex-col gap-3">
        <div role="group" aria-label="ფერი" className="flex flex-wrap">
          {TONE_IDS.map(t => {
            const on = t === look.tone;
            return (
              <button key={t} type="button" aria-pressed={on} aria-label={HABIT_TONES[t].name} title={HABIT_TONES[t].name}
                onClick={() => keep(setHabitLook(setup, id, { tone: t }))}
                className="flex size-tap cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-wine/60">
                <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: HABIT_TONES[t].c }}>
                  {on && <Check className="size-4" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="ხატულა" className="flex flex-wrap gap-1.5">
          {HABIT_ICON_IDS.map((i, n) => {
            const on = i === look.icon;
            return (
              <button key={i} type="button" aria-pressed={on} aria-label={`ხატულა ${n + 1}`} onClick={() => keep(setHabitLook(setup, id, { icon: i }))}
                className={cx('flex size-tap shrink-0 cursor-pointer items-center justify-center rounded-full', on ? 'text-white' : 'bg-page text-ink')}
                style={on ? { background: HABIT_TONES[look.tone].c } : undefined}>
                <HabitIcon icon={i} className="size-5" />
              </button>
            );
          })}
        </div>
      </Card>

      <SectionLabel label="რამდენად ხშირად" />
      <OneOf
        label="რამდენად ხშირად"
        items={groupItems}
        value={plan ? 'custom' : group}
        onChange={g => keep(g === 'custom' ? setHabitSchedule(setup, id, plan ?? newSchedule()) : setHabitGroup(setup, id, g))}
      />
      {plan && <ScheduleCard plan={plan} onChange={s => keep(setHabitSchedule(setup, id, s))} />}

      <SectionLabel label="დრო და შეხსენებები" />
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body font-semibold">დაწყება</span>
          <TimeBox label="დაწყება" value={habit.time?.from ?? ''} onChange={v => keep(setHabitTime(setup, id, v ? { from: v, to: habit.time?.to } : null))} />
        </div>
        {habit.time && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-body font-semibold">დასრულება</span>
              <TimeBox label="დასრულება" value={habit.time.to ?? ''} onChange={v => keep(setHabitTime(setup, id, { from: habit.time!.from, to: v || undefined }))} />
            </div>
            <WrapChips
              label="შეხსენებები"
              items={ALERT_CHOICES.map(m => ({ id: String(m), label: alertWord(m) }))}
              value={alerts.map(String)}
              onChange={next => void changeAlerts(next.map(Number))}
            />
            {blocked && <p className="text-meta text-danger">შეტყობინებები ამ ბრაუზერში დაბლოკილია — ჩართე საიტის პარამეტრებში.</p>}
          </>
        )}
      </Card>

      <Card pad="none">
        <Rows>
          <Row lead={<Dot icon={<BookOpen />} />} title="რა გაიხსნას" right={<Val>{habit.menu ? MENU_LABELS[habit.menu] : 'არაფერი'}</Val>} onClick={() => setMenuOpen(true)} />
          <ToggleRow
            title="დათვლა რიცხვით"
            on={!!counter}
            onChange={on => keep(setHabitCounter(setup, id, on ? { goal: 10, unit: 'ჯერ' } : 'none'))}
          />
        </Rows>
      </Card>
      {counter && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-body font-semibold">მიზანი დღეში</span>
            <Stepper label="მიზანი დღეში" value={counter.goal} min={1} max={MAX_COUNTER_GOAL} onChange={goal => keep(setHabitCounter(setup, id, { goal, unit: counter.unit }))} />
          </div>
          <OneOf label="რას ითვლის" items={units.map(u => ({ id: u, label: u }))} value={counter.unit} onChange={unit => { setWord(''); keep(setHabitCounter(setup, id, { goal: counter.goal, unit })); }} />
        </Card>
      )}
      {counter && (
        <Field
          label="ან შენი სიტყვა" value={word} onChange={setWord} maxLength={20} placeholder="სიტყვა"
          onBlur={() => { const w = word.trim(); if (w && w !== counter.unit) keep(setHabitCounter(setup, id, { goal: counter.goal, unit: w })); }}
          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        />
      )}

      <SectionLabel label="აღწერა" />
      <Area
        label="აღწერა" hideLabel value={note} onChange={setNote} placeholder="რა უნდა მახსოვდეს…" maxLength={500}
        onBlur={() => note.trim() !== (habit.note ?? '').trim() && keep(setHabitRichNote(setup, id, plainToHtml(note.trim())))}
      />

      <Card pad="none">
        <Rows>
          <Row lead={<Dot icon={<Trash2 />} />} title="ჩვევის წაშლა" tone="danger" right={null} onClick={() => void remove()} />
        </Rows>
      </Card>

      <LinkSheet open={adding} onClose={() => setAdding(false)} onAdd={addLink} />
      <MenuSheet
        open={menuOpen}
        value={(habit.menu ?? 'none') as MenuChoice}
        onPick={m => keep(setHabitMenu(setup, id, m))}
        onClose={() => setMenuOpen(false)}
      />
      <Sheet open={shown !== null && !!links[shown]} title={links[shown ?? 0]?.title ?? ''} onClose={() => setShown(null)}>
        <Rows>
          <Row lead={<Dot icon={<Link2 />} />} title={links[shown ?? 0]?.kind === 'url' ? 'ბმული' : 'აპის გვერდი'} sub={links[shown ?? 0]?.kind === 'url' ? (links[shown ?? 0] as { url: string }).url : undefined} right={null} />
        </Rows>
        <Button kind="danger" onClick={() => { if (shown !== null) keep(setHabitLinks(setup, id, links.filter((_, j) => j !== shown))); setShown(null); }}>ღილაკის მოხსნა</Button>
      </Sheet>
      {finding && (
        <Suspense fallback={null}>
          <SearchPanel
            onClose={() => setFinding(false)}
            pick={{
              title: `„${habit.label}“ — რა მივამაგრო? · ${links.length}/${MAX_LINKS}`,
              isOn: pid => links.some(l => buttonOf(l) === coreOf(pid)),
              full,
              fullNote: 'მეტი ღილაკი აღარ ეტევა — ჯერ ერთი მოხსენი.',
              onPick: (pid, title, sub) =>
                links.some(l => buttonOf(l) === coreOf(pid))
                  ? keep(setHabitLinks(setup, id, links.filter(l => buttonOf(l) !== coreOf(pid))))
                  : !full && addLink(fromButton(pid, title, sub)),
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export const SettingsScreen: React.FC<{ model: HabitsModel; id: string }> = ({ model, id }) => {
  const { user } = useAuth();
  const { back } = useHabitsNav();
  const mine = useMyHabits(user?.uid);
  const item = model.all.find(x => x.habit.id === id);
  const ready = !!user && mine.groups.some(g => g.items.some(h => h.id === id));
  return (
    <>
      <TopBar title={item?.habit.label ?? 'ჩვევა'} sub="ჩვევა" onBack={back} />
      {ready ? <Body key={id} mine={mine} id={id} /> : (
        <Card className="flex flex-col items-start gap-3">
          <H2 flush>{user ? 'ეს ჩვევა აღარ არის' : 'ჩვევების შესაცვლელად შედი ანგარიშში'}</H2>
          <Button kind="soft" onClick={back}>უკან</Button>
        </Card>
      )}
    </>
  );
};
