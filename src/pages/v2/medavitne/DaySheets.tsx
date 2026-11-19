import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Check as CheckIcon, Church, ListChecks, Music, Settings2 } from 'lucide-react';
import { Button, Card, Choice, Dot, Note, Row, Rows, SectionLabel, Sheet, Small, ToggleRow, Val, cx } from '../../../components/ui2';
import { useNotes } from '../../../context/NotesContext';
import { dayMonthGe, oldDayMonthGe, openChurchCalendar } from '../../../data/churchCalendar';
import { triggerHaptic } from '../../../utils/haptics';
import { readingsOf, toneName, type Reading } from '../../../utils/dayReadings';
import { bookOf, toneChants } from '../../../utils/toneChants';
import { RANKS, rankLabel, type Patron, type Rank, type Step, type TempleOrder } from '../../../utils/dayService';
import {
  KIND_HEAD, SAT_OPTIONS, WEEKDAY_OPTIONS, foundPatron, notesRowsOf, patronWhen, usePatronSearch, type DayServiceState,
} from '../../medavitneoba/DayService';
import { SearchPill } from '../library/parts';
import { ActChip, ApostleText } from './DayParts';

// The sheets of „დღის მსახურება“ in the new look: „მეტი“ (the four tiles and two switches moved there — board x-medavitne-dghe),
// the rank (x-medavitne-rangi), the temple's order (x-medavitne-tsesi), the temple's name (x-medavitne-sakheloba), the week's
// tone (x-medavitne-khma), a step's notes and the day's readings (the course's old „დღის წესი“ card moved here).

type Versions = { title: string; sub?: string; versions: { vid: string; label: string }[]; more?: number };

/** a chant a row: its books under it and how many versions; a tap unfolds the versions (each opens its notes) */
const ChantRows: React.FC<{ rows: Versions[]; onOpen: (vid: string) => void }> = ({ rows, onOpen }) => {
  const [open, setOpen] = useState<string | null>(rows.length === 1 ? rows[0].title : null);
  return (
    <Rows>
      {rows.map(r => {
        const on = open === r.title;
        return (
          <div key={r.title} className="flex flex-col">
            <Row lead={<Dot icon={<Music />} />} title={r.title} sub={r.sub} aria-expanded={on}
              onClick={() => { triggerHaptic(8); setOpen(on ? null : r.title); }}
              right={<Val>{r.versions.length + (r.more && r.more > 0 ? r.more : 0)} ვერსია</Val>} />
            {on && (
              <div className="sg-in flex flex-wrap gap-x-2 px-4 pb-3">
                {r.versions.map(v => <ActChip key={v.vid} icon={<Music />} onClick={() => onOpen(v.vid)}>{v.label}</ActChip>)}
                {!!r.more && r.more > 0 && <Note className="w-full px-0 pt-1">და კიდევ {r.more} — „გალობის“ ჩანართში</Note>}
              </div>
            )}
          </div>
        );
      })}
    </Rows>
  );
};

const booksOf = (labels: string[]) => [...new Set(labels.map(l => l.replace(/\s*№.*$/, '').trim()))].slice(0, 3).join(' · ');

/** the week's tone: its Sunday chants in the books, by service (utils/toneChants) */
export const ToneSheet: React.FC<{ tone: number | null; onClose: () => void }> = ({ tone, onClose }) => {
  const { openNotes } = useNotes();
  const groups = useMemo(() => (tone ? toneChants(tone) : []), [tone]);
  const open = (vid: string) => { triggerHaptic(10); onClose(); openNotes(vid, 'bookmark'); };
  return (
    <Sheet open={tone !== null} onClose={onClose} title={tone ? `${toneName(tone)} · კვირის საგალობლები` : ''}>
      {groups.map(g => (
        <div key={g.service} className="flex flex-col gap-2">
          <SectionLabel label={`${g.service}${g.hint ? ` · ${g.hint}` : ''}`} />
          <ChantRows
            onOpen={open}
            rows={g.rows.map(r => {
              const labels = r.versions.map(v => `${v.book}${v.num ? ` №${v.num}` : ''}`);
              return { title: r.title, sub: booksOf(r.versions.map(v => v.book)), versions: r.versions.map((v, i) => ({ vid: v.vid, label: labels[i] })) };
            })}
          />
        </div>
      ))}
      <Note>შეხებით იხსნება ვერსიები — ნოტებით და სინთეზატორით. კვირის შუა დღეებში ზოგ საგალობელს დღის წმიდანის ხმაზე გალობენ.</Note>
    </Sheet>
  );
};

/** a step's chants with their versions that have notes */
export const NotesSheet: React.FC<{ step: Step | null; tone: number | null; onClose: () => void }> = ({ step, tone, onClose }) => {
  const { openNotes } = useNotes();
  const rows = notesRowsOf(step, tone);
  const open = (vid: string) => { triggerHaptic(10); onClose(); openNotes(vid, 'bookmark'); };
  return (
    <Sheet open={!!step} onClose={onClose} title={step ? `ნოტები · ${step.title.replace(/[„“]/g, '')}` : ''}>
      {rows.length ? (
        <ChantRows
          onOpen={open}
          rows={rows.map(r => ({
            title: r.title,
            sub: r.inTone && tone ? toneName(tone) : booksOf(r.versions.map(v => bookOf(v))),
            more: r.more,
            versions: r.versions.map(v => ({ vid: v.id, label: bookLabel(v) })),
          }))}
        />
      ) : <Note>ამ ნაწილის ნოტები ჯერ არ არის.</Note>}
    </Sheet>
  );
};
// a version's book and number („I ტომი №58“)
const bookLabel = (v: Parameters<typeof bookOf>[0]) => `${bookOf(v)}${v.bookNums?.[0] ? ` №${v.bookNums[0]}` : ''}`;

export const RankSheet: React.FC<{ open: boolean; value: Rank; guessed: Rank; onPick: (r: Rank | null) => void; onClose: () => void }> = ({
  open, value, guessed, onPick, onClose,
}) => (
  <Sheet open={open} onClose={onClose} title="მსახურების რანგი">
    <Note>აპმა გამოიცნო: {rankLabel(guessed)}. თუ შენს ტაძარში სხვაგვარად აღესრულება, აირჩიე.</Note>
    <Rows role="radiogroup" aria-label="მსახურების რანგი">
      {RANKS.map(r => (
        <Choice key={r.id} title={r.label} sub={r.hint} on={value === r.id} wrap
          onClick={() => { triggerHaptic(10); onPick(r.id === guessed ? null : r.id); onClose(); }} />
      ))}
    </Rows>
  </Sheet>
);

export const OrderSheet: React.FC<{ open: boolean; value: TempleOrder; onPick: (o: TempleOrder) => void; onClose: () => void }> = ({
  open, value, onPick, onClose,
}) => (
  <Sheet open={open} onClose={onClose} title="ჩემი ტაძრის წესი">
    <Note>ყველა ტაძარში ერთნაირად არ მსახურობენ. აირჩიე, როგორ არის შენთან.</Note>
    <SectionLabel label="შაბათ საღამოს და დიდი დღესასწაულის წინ" />
    <Rows role="radiogroup" aria-label="შაბათ საღამოს">
      {SAT_OPTIONS.map(o => (
        <Choice key={o.id} title={o.label} sub={o.hint} on={value.sat === o.id} wrap onClick={() => { triggerHaptic(10); onPick({ ...value, sat: o.id }); }} />
      ))}
    </Rows>
    <SectionLabel label="სადაგი დღის საღამოს" />
    <Rows role="radiogroup" aria-label="სადაგი დღის საღამოს">
      {WEEKDAY_OPTIONS.map(o => (
        <Choice key={o.id} title={o.label} sub={o.hint} on={value.weekday === o.id} wrap onClick={() => { triggerHaptic(10); onPick({ ...value, weekday: o.id }); }} />
      ))}
    </Rows>
  </Sheet>
);

export const PatronSheet: React.FC<{ open: boolean; value: Patron | null; onPick: (p: Patron | null) => void; onClose: () => void }> = ({
  open, value, onPick, onClose,
}) => {
  const { q, setQ, all, needle, presets, found } = usePatronSearch(open);
  const pick = (p: Patron | null) => { triggerHaptic(10); onPick(p); setQ(''); onClose(); };
  const row = (p: Patron, sub: string, key: string) => {
    const on = value?.name === p.name;
    return (
      <Row key={key} title={p.name} wrap aria-current={on || undefined} onClick={() => pick(p)}
        right={<span className="flex max-w-[45%] shrink-0 items-center gap-1.5">
          <Small className="truncate">{sub}</Small>
          {on && <CheckIcon aria-label="არჩეულია" className="size-[18px] shrink-0 text-wine" />}
        </span>} />
    );
  };
  return (
    <Sheet open={open} onClose={onClose} title="ჩემი ტაძრის სახელობა">
      <SearchPill value={q} onChange={setQ} placeholder="მოძებნე: გიორგი, ნინო…" />
      {(['lord', 'theotokos', 'saint'] as const).map(kind => {
        const list = presets.filter(p => p.kind === kind);
        if (!list.length) return null;
        return (
          <div key={kind} className="flex flex-col gap-2">
            <SectionLabel label={KIND_HEAD[kind]} />
            <Rows>{list.map(p => row(p, patronWhen(p), p.name))}</Rows>
          </div>
        );
      })}
      {found.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel label="კალენდრიდან" />
          <Rows>{found.map(f => row(foundPatron(f), dayMonthGe(f.iso), f.iso + f.name))}</Rows>
        </div>
      )}
      {needle.length >= 3 && !all && <Note>ვეძებ კალენდარში…</Note>}
      {!presets.length && !found.length && all && <Note>ვერ ვიპოვე. სცადე სხვა სიტყვა.</Note>}
      {value && <Button kind="ghost" full onClick={() => pick(null)}>ტაძრის მოხსნა</Button>}
    </Sheet>
  );
};

// the calendar's labels in words; the rest stay as written
const LABELS: Record<string, string> = {
  '': 'ლიტურგიაზე', 'ლიტ': 'ლიტურგიაზე', 'ცისკ': 'ცისკარზე', 'მწუხრ': 'მწუხრზე', 'რიგ': 'რიგისა', 'ღირ': 'ღირსისა',
};
const labelOf = (l: string) => LABELS[l] ?? l;

/** the day's readings in their order; an Apostle reading unfolds with its text and the recorder */
export const ReadingsSheet: React.FC<{ open: boolean; d: DayServiceState; onClose: () => void }> = ({ open, d, onClose }) => {
  const readings = useMemo(() => (d.day ? readingsOf(d.day) : []), [d.day]);
  const [at, setAt] = useState<number | null>(null);
  const groups: { label: string; items: { r: Reading; i: number }[] }[] = [];
  readings.forEach((r, i) => {
    const label = labelOf(r.label);
    const g = groups[groups.length - 1];
    if (g?.label === label) g.items.push({ r, i }); else groups.push({ label, items: [{ r, i }] });
  });
  return (
    <Sheet open={open} onClose={() => { setAt(null); onClose(); }} title="დღის საკითხავები">
      <Note>{dayMonthGe(d.iso)}</Note>
      {groups.length ? groups.map(g => (
        <div key={g.label + g.items[0].i} className="flex flex-col gap-2">
          <SectionLabel label={g.label} />
          <Rows>
            {g.items.map(({ r, i }) => r.apostle ? (
              <div key={i} className="flex flex-col">
                <Row lead={<Dot icon={<BookOpen />} />} title={`${r.name} ${r.ref}`} wrap aria-expanded={at === i}
                  sub={`სამოციქულო${r.zachalo ? ` · დასაბამი ${r.zachalo}` : ''} · წაიკითხე და ჩაიწერე`}
                  onClick={() => { triggerHaptic(8); setAt(a => (a === i ? null : i)); }} />
                {at === i && <div className="px-3 pb-3"><ApostleText r={r} iso={d.iso} /></div>}
              </div>
            ) : (
              <Row key={i} lead={<Dot icon={<BookOpen />} color="soft" />} title={`სახარება · ${r.name} ${r.ref}`} sub={r.zachalo ? `დასაბამი ${r.zachalo}` : undefined} wrap />
            ))}
          </Rows>
        </div>
      )) : <Note>{d.day === null ? 'ამ დღის კალენდარი ჯერ არ გამოქვეყნებულა.' : 'ამ დღეს კალენდარში საკითხავი არ წერია.'}</Note>}
      <Note>სახარებას დიაკონი ან მღვდელი კითხულობს; მედავითნე — სამოციქულოს.</Note>
    </Sheet>
  );
};

/** „მეტი“ (⋯): the week's tone, the rank, my temple and its order as four tiles, the two switches, and the day's details */
export const MoreSheet: React.FC<{ open: boolean; d: DayServiceState; onClose: () => void; onReadings: () => void }> = ({ open, d, onClose, onReadings }) => {
  const go = (fn: () => void) => { triggerHaptic(8); onClose(); fn(); };
  const tile = (icon: React.ReactNode, label: string, value: string, onClick?: () => void) => (
    <Row lead={<Dot icon={icon} />} title={value} sub={label} onClick={onClick} />
  );
  const sat = SAT_OPTIONS.find(o => o.id === d.order.sat)!.label.toLowerCase();
  const weekday = WEEKDAY_OPTIONS.find(o => o.id === d.order.weekday)!.label.toLowerCase();
  const food = d.food;
  return (
    <Sheet open={open} onClose={onClose} title="დღის მსახურება">
      <Rows>
        {tile(<Music />, 'კვირის ხმა', d.tone ? toneName(d.tone) : '—', d.tone ? () => go(() => d.setToneOpen(d.tone)) : undefined)}
        {tile(<ListChecks />, d.rank !== d.guessed ? 'რანგი · შენი' : 'რანგი', rankLabel(d.rank), () => go(() => d.setSheet('rank')))}
        {tile(<Church />, 'ჩემი ტაძარი', d.patron ? d.patron.name : 'აირჩიე სახელობა', () => go(() => d.setSheet('patron')))}
        <Row lead={<Dot icon={<Settings2 />} />} title="ჩემი ტაძრის წესი" sub={`შაბათ საღამოს — ${sat} · სადაგ დღეს — ${weekday}`} wrap
          onClick={() => go(() => d.setSheet('order'))} />
      </Rows>
      <Rows>
        <ToggleRow title="მღვდლის ტექსტები" sub={d.priestOn ? 'ჩანს მღვდლისა და დიაკვნის სიტყვებიც' : 'ჩანს მხოლოდ მედავითნისა და გუნდისა'}
          on={d.priestOn} onChange={() => { triggerHaptic(8); d.flipPriest(); }} wrap />
        <ToggleRow title="ხუცური" sub="ტექსტი ძველი ასოებით" on={d.oldOn} onChange={() => { triggerHaptic(8); d.flipOld(); }} />
      </Rows>

      <SectionLabel label={`${dayMonthGe(d.iso)} · ძვ. სტ. ${oldDayMonthGe(d.iso)}`} />
      {d.title && <Note className="-mt-1">{d.title}</Note>}
      <Card pad="sm" className={cx('flex flex-col gap-0.5', food.food === 'free' || food.food === 'meatless' ? 'bg-leaf-tint' : food.food === 'fish' ? 'bg-sea-tint' : 'bg-gold-tint')}>
        <span className="text-cap font-bold text-mut">დღის საზრდო{food.why ? ` · ${food.why}` : ''}</span>
        <span className="text-body leading-snug font-bold">{food.cal ? `${food.cal.replace(/\.$/, '')} — კალენდრით` : food.label}</span>
        {(food.extra || food.cal) && <span className="text-meta leading-snug text-mut">{food.cal ? `ტიბიკონით: ${food.label.toLowerCase()}` : food.extra}</span>}
      </Card>
      {d.templeDay && <Note className="text-leaf-ink">დღეს შენი ტაძრის დღესასწაულია — ღამისთევა.</Note>}
      {d.period !== 'octoechos' && (
        <Note>
          {d.period === 'triodion' ? 'ტრიოდის პერიოდია — მარხვის წესი გათვალისწინებულია.' : 'ზატიკის პერიოდია — აღდგომის წესი გათვალისწინებულია.'} ტრიოდის ტექსტები წიგნებში ნაკლებადაა — გადაამოწმე რეგენტთან.
        </Note>
      )}
      <Rows>
        <Row lead={<Dot icon={<BookOpen />} />} title="დღის საკითხავები" sub="სამოციქულო — წაიკითხე და ჩაიწერე" onClick={() => go(onReadings)} />
        <Row lead={<Dot icon={<CalendarDays />} />} title="სრული განგება კალენდარში" onClick={() => go(() => openChurchCalendar(d.iso))} />
      </Rows>
      <Note>ეს ზოგადი წესია ტიპიკონის მიხედვით. ტაძრებში ცოტათი განსხვავდება — გადაამოწმე მოძღვართან ან რეგენტთან.</Note>
    </Sheet>
  );
};
