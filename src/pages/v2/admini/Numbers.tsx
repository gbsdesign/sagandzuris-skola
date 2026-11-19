import React, { useMemo, useState } from 'react';
import {
  Archive, Baby, Bug, DatabaseBackup, Headphones, History, KeyRound, LayoutGrid, List, Loader2, School, ShieldCheck, Trash2,
  Undo2, UserCheck, UserPlus,
} from 'lucide-react';
import { useAuth } from '../../../context';
import { Bar, Button, Card, Dot, Helper, Note, Num, Row, Rows, SectionLabel, Sheet, Stats, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { exportBackup } from '../../../components/admin/SchoolTab';
import { ERROR_KIND, deviceName, errorWhen, pageName } from '../../../components/admin/ErrorLogFold';
import { findVersion } from '../../../data/chantLookup';
import { useGrowthWeeks } from '../../../hooks/useGrowth';
import { useAdminLog, type LogKind } from '../../../utils/adminLog';
import { clearErrorLog, deleteError, useErrorLog, type ErrorEntry } from '../../../utils/errorLog';
import { errorText } from '../../../utils/errorText';
import { MONTHS_GE, MONTHS_SHORT_GE, shortDate } from '../../../utils/dateNames';
import { monthCounts, weekSeries } from '../../../utils/growth';
import { tbilisiToday } from '../../../utils/hangi';
import { useAdmin } from './ctx';
import { schoolItem } from './nav';
import { Screen } from './parts';

// the ten chants listened to most, all members together (each member's `plays`)
const useTopChants = () => {
  const { d } = useAdmin();
  return useMemo(() => {
    const sum = new Map<string, number>();
    for (const u of d.users) for (const [vid, n] of Object.entries(u.plays)) sum.set(vid, (sum.get(vid) || 0) + (Number(n) || 0));
    return [...sum.entries()]
      .map(([vid, n]) => ({ vid, n, info: findVersion(vid) }))
      .filter((x): x is { vid: string; n: number; info: NonNullable<ReturnType<typeof findVersion>> } => !!x.info)
      .sort((a, b) => b.n - a.n)
      .slice(0, 10);
  }, [d.users]);
};
const titleOf = (t: string) => t.replace(/[;\s]+$/, '');
const hhmm = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

interface Point { key: string; label: string; full: string; n: number | null }

/** A column chart in the design's colours: every column its number, the latest in wine; „ცხრილად“ lists them all. */
const Columns: React.FC<{ title: string; data: Point[]; unit: (n: number) => string; every: number }> = ({ title, data, unit, every }) => {
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map(p => p.n ?? 0));
  const last = data.length - 1;
  return (
    <Card as="div" className="flex flex-col gap-3">
      <h2 className="text-body font-bold">{title}</h2>
      <div role="img" aria-label={`${title}: ${data.map(p => `${p.full} — ${p.n === null ? 'არ დათვლილა' : unit(p.n)}`).join(', ')}`}>
        <div aria-hidden="true" className="flex h-[132px] items-end gap-0.5 border-b border-line">
          {data.map((p, i) => (
            <div key={p.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end" title={`${p.full}: ${p.n === null ? 'არ დათვლილა' : unit(p.n)}`}>
              {p.n === null ? <span className="mb-1 size-1.5 rounded-full bg-dim" /> : (
                <>
                  {p.n > 0 && <span className="mb-1 text-cap leading-none font-bold text-mut tabular-nums">{p.n}</span>}
                  <span className={cx('w-[70%] max-w-6 rounded-t-chip', i === last ? 'bg-wine' : 'bg-wine/45')}
                    style={{ height: p.n ? Math.max(3, Math.round((p.n / max) * 100)) : 0 }} />
                </>
              )}
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="mt-1 flex gap-0.5">
          {data.map((p, i) => (
            <span key={p.key} className="min-w-0 flex-1 overflow-visible text-center text-cap whitespace-nowrap text-mut">
              {(last - i) % every === 0 ? p.label : ''}
            </span>
          ))}
        </div>
      </div>
      <Button kind="quiet" size="md" className="-mb-1 self-start px-3" onClick={() => setTable(t => !t)} aria-expanded={table}>
        {table ? 'ცხრილის დამალვა' : 'ცხრილად'}
      </Button>
      {table && (
        <table className="w-full text-meta">
          <tbody>
            {[...data].reverse().map(p => (
              <tr key={p.key} className="border-b border-line last:border-0">
                <td className="py-1.5 text-mut">{p.full}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{p.n === null ? '—' : p.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
};

const dayName = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_SHORT_GE[+iso.slice(5, 7) - 1]}`;

/** x-skola-tsiprebi — three numbers, the chart, and the lines to the most listened, the logs and the backup. */
export const NumbersScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { d, test, go, back, say } = useAdmin();
  const { weeks } = useGrowthWeeks();
  const today = tbilisiToday();
  const [weekly, setWeekly] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const top = useTopChants();
  const log = useAdminLog(isSuperAdmin, 1);
  const errors = useErrorLog(true, 100);

  const months = useMemo<Point[]>(() => monthCounts(d.users.map(u => u.createdAt), today).map(m => {
    const [y, mo] = m.key.split('-').map(Number);
    return { key: m.key, n: m.n, label: MONTHS_SHORT_GE[mo - 1], full: `${MONTHS_GE[mo - 1]} ${y}` };
  }), [d.users, today]);
  const byWeek = useMemo<Point[]>(() => weekSeries(weeks, today).map(w => ({
    key: w.key, n: w.n, label: dayName(w.key), full: `კვირა ${dayName(w.key)}-დან`,
  })), [weeks, today]);
  const ready = !d.loading && !d.failed.users;
  const count = (f: 'all' | 'week') => d.users.filter(test[f]).length;

  const backup = async () => {
    setExporting('იწყება…');
    try {
      const size = await exportBackup(isSuperAdmin, setExporting);
      say(`ასლი ჩამოიტვირთა (${Math.round(size / 1024)} კბ). შეინახე უსაფრთხო ადგილას — მაგ. Google Drive-ში.`, 'success');
    } catch (e) {
      say('ასლი ვერ მომზადდა: ' + errorText(e), 'error');
    } finally {
      setExporting(null);
    }
  };
  const lastLog = log.lines[0];
  const lastError = errors.lines[0];

  return (
    <Screen>
      <TopBar title="ციფრები" onBack={back} />
      <Stats items={[
        { value: ready ? months[months.length - 1]?.n ?? 0 : '—', label: 'ახალი ამ თვეში' },
        { value: ready && d.staffLoaded ? count('week') : '—', label: 'აქტიური ამ კვირას' },
        { value: ready ? count('all') : '—', label: 'სულ' },
      ]} />
      {weekly && byWeek.length >= 2
        ? <Columns title="აქტიური წევრები კვირების მიხედვით" data={byWeek} unit={n => `${n} აქტიური`} every={4} />
        : <Columns title="ახალი წევრები თვეების მიხედვით" data={months} unit={n => `${n} ახალი`} every={2} />}
      {byWeek.length >= 2 ? (
        <Button kind="ghost" full onClick={() => setWeekly(w => !w)}>
          {weekly ? 'ახალი წევრები თვეების მიხედვით' : 'აქტიური წევრები კვირების მიხედვით'}
        </Button>
      ) : (
        <Note>აქტიური წევრები კვირების მიხედვით ითვლება, როცა ადმინი პანელს ხსნის — გრაფიკი მეორე კვირიდან გამოჩნდება.</Note>
      )}
      <Rows>
        <Row lead={<Dot icon={<Headphones />} />} title="ყველაზე მოსმენადი" onClick={() => go(schoolItem('top'))}
          sub={top[0] ? `პირველი: ${titleOf(top[0].info.chant.title)}` : 'მოსმენები ჯერ არ დაგროვილა'} />
        {isSuperAdmin && (
          <Row lead={<Dot icon={<List />} />} title="ცვლილებების ჟურნალი" onClick={() => go(schoolItem('log'))}
            sub={log.loading ? '…' : lastLog ? `ბოლო: ${shortDate(lastLog.at)} · ${lastLog.byName || lastLog.by}` : 'ჯერ ცარიელია'} />
        )}
        <Row lead={<Dot icon={<Bug />} />} title="შეცდომების ჟურნალი" onClick={() => go(schoolItem('errors'))}
          sub={errors.loading ? '…' : lastError ? `ბოლო: ${errorWhen(lastError.last)} · ${errors.lines.length} სახის` : 'ჯერ ცარიელია'} />
        <Row lead={<Dot icon={exporting ? <Loader2 className="animate-spin" /> : <DatabaseBackup />} />} title="სარეზერვო ასლი"
          sub={exporting ? `მზადდება… ${exporting}` : 'ყველა ჩანაწერი ერთ ფაილად'} disabled={!!exporting} onClick={() => void backup()} />
      </Rows>
      <Helper>
        ასლში: წევრები და მათი გზა, მიღება და ნებართვები, დაბადების და ანგელოზის დღეები, კლასები (დავალებები, დასწრება, ჩატის ტექსტი,
        გაკვეთილები, ნიშნები), ფსალმუნთა ჯგუფები, სიმღერების ტექსტები. არ შედის: ხმოვანი შეტყობინებები და ნამღერი, პირადი ჩატები, სურათები.
      </Helper>
      <Note>ახალი წევრი — ვინც იმ თვეში პირველად შემოვიდა. აქტიური — ვინც ბოლო 7 დღეში შემოვიდა (ადმინების, მასწავლებლების და გასულების გარდა).</Note>
    </Screen>
  );
};

/** x-skola-mosmenadi — the most listened versions, five first, then all ten. */
export const TopScreen: React.FC = () => {
  const { back } = useAdmin();
  const top = useTopChants();
  const [all, setAll] = useState(false);
  const max = top[0]?.n || 1;
  const shown = all ? top : top.slice(0, 5);
  return (
    <Screen>
      <TopBar title="ყველაზე მოსმენადი" sub="ყველა წევრი ერთად" onBack={back} />
      {top.length === 0 ? <Helper>მოსმენები ჯერ არ დაგროვილა.</Helper> : (
        <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
          {shown.map((t, i) => (
            <li key={t.vid} className="flex min-h-row items-center gap-3 py-2.5 pr-4 pl-4">
              <Num n={i + 1} on={i < 3} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="sg-fit min-w-0 flex-1 truncate text-lead font-bold">{titleOf(t.info.chant.title)}</span>
                  <span className="shrink-0 text-body font-bold text-wine tabular-nums">{t.n}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="max-w-[60%] shrink-0 truncate text-meta text-mut">{t.info.service} · {t.info.variant.code}</span>
                  <Bar value={t.n / max} className="min-w-0 flex-1" />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {top.length > 5 && (
        <Button kind="ghost" full onClick={() => setAll(a => !a)}>{all ? 'ნაკლების ჩვენება' : `ყველას ნახვა · ${top.length}`}</Button>
      )}
    </Screen>
  );
};

const LOG_ICON: Record<LogKind, React.ReactNode> = {
  role: <ShieldCheck />, access: <UserCheck />, class: <School />, archive: <Archive />, section: <LayoutGrid />,
  right: <KeyRound />, kids: <Baby />, member: <UserPlus />, undo: <Undo2 />,
};
const LOG_PAGE = 40;
// a day's heading: „დღეს“, „გუშინ“, then the date
const dayHead = (iso: string) => {
  const day = tbilisiToday(Date.parse(iso));
  const today = tbilisiToday();
  const yesterday = tbilisiToday(Date.now() - 86_400_000);
  return day === today ? 'დღეს' : day === yesterday ? 'გუშინ' : shortDate(`${day}T12:00:00`);
};

/** x-skola-zhurnali — who changed what and when, by days (superadmins); nobody edits or deletes a line. */
export const LogScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { back } = useAdmin();
  const [count, setCount] = useState(LOG_PAGE);
  const { lines, loading } = useAdminLog(isSuperAdmin, count);
  const days = useMemo(() => {
    const m = new Map<string, typeof lines>();
    for (const l of lines) { const k = dayHead(l.at); m.set(k, [...(m.get(k) || []), l]); }
    return [...m.entries()];
  }, [lines]);
  return (
    <Screen>
      <TopBar title="ცვლილებების ჟურნალი" sub="ვინ რა შეცვალა" onBack={back} />
      {!isSuperAdmin ? <Helper>ჟურნალს მხოლოდ სუპერადმინები ხედავენ.</Helper> : lines.length === 0 ? (
        <Helper>{loading ? 'იტვირთება…' : 'ჯერ არაფერი შეცვლილა. აქ ჩაიწერება როლები, დაშვება, კლასები, განყოფილებები და უფლებები.'}</Helper>
      ) : (
        <>
          {days.map(([day, list]) => (
            <React.Fragment key={day}>
              <SectionLabel label={day} />
              <Rows>
                {list.map(l => (
                  <Row key={l.id} lead={<Dot icon={LOG_ICON[l.kind] || <History />} />} title={l.text} wrap
                    sub={`${l.byName || l.by} · ${hhmm(l.at)}`} />
                ))}
              </Rows>
            </React.Fragment>
          ))}
          {lines.length >= count && (
            <Button kind="ghost" full icon={loading ? <Loader2 className="animate-spin" /> : undefined} onClick={() => setCount(c => c + LOG_PAGE)}>მეტის ჩვენება</Button>
          )}
          <Note>ჩანაწერს ვერავინ ცვლის და ვერ შლის.</Note>
        </>
      )}
    </Screen>
  );
};

const ERR_PAGE = 30;

/** „შეცდომების ჟურნალი“ — what broke on members' phones (no names), the newest first; a line opens its details. */
export const ErrorsScreen: React.FC = () => {
  const { back, say } = useAdmin();
  const { lines, loading } = useErrorLog(true, 100);
  const [count, setCount] = useState(ERR_PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = lines.find(l => l.id === openId);
  const remove = async (l: ErrorEntry) => {
    setBusy(true);
    try { await deleteError(l.id); setOpenId(null); } catch (e) { say(errorText(e), 'error'); } finally { setBusy(false); }
  };
  const clear = async () => {
    if (!(await askConfirm({ title: 'ჟურნალი მთლიანად გასუფთავდეს?', text: `წაიშლება ${lines.length} სახის შეცდომა. ახალი თავიდან ჩაიწერება.`, ok: 'გასუფთავება', danger: true }))) return;
    setBusy(true);
    try { await clearErrorLog(lines.map(l => l.id)); say('ჟურნალი გასუფთავდა.', 'success'); } catch (e) { say(errorText(e), 'error'); } finally { setBusy(false); }
  };
  return (
    <Screen>
      <TopBar title="შეცდომების ჟურნალი" sub="რა გაფუჭდა წევრებთან" onBack={back} />
      {lines.length === 0 ? (
        <Helper>{loading ? 'იტვირთება…' : 'ჯერ არაფერი გაფუჭებულა. თუ ვინმესთან აპი შეფერხდება, აქ გამოჩნდება.'}</Helper>
      ) : (
        <>
          <Rows>
            {lines.slice(0, count).map(l => (
              <Row key={l.id} lead={<Dot icon={<Bug />} />} wrap onClick={() => setOpenId(l.id)}
                title={<span className="line-clamp-2">{l.msg}</span>}
                sub={`${pageName(l.where)} · ${l.count}-ჯერ · ბოლოს ${errorWhen(l.last)} · ${deviceName(l.dev)}`} />
            ))}
          </Rows>
          {lines.length > count && <Button kind="ghost" full onClick={() => setCount(c => c + ERR_PAGE)}>მეტის ჩვენება</Button>}
          <Button kind="quiet" icon={<Trash2 />} className="self-start text-danger" disabled={busy} onClick={() => void clear()}>ჟურნალის გასუფთავება</Button>
        </>
      )}
      <Note>აქ ჩანს, რა გაფუჭდა: რა, რომელ გვერდზე და რამდენჯერ. სახელები არ იწერება.</Note>

      <Sheet open={!!open} onClose={() => setOpenId(null)} title="შეცდომა">
        {open && (
          <>
            <p className="px-1 text-body font-semibold wrap-break-word">{open.msg}</p>
            <Note>
              {ERROR_KIND[open.kind] || open.kind} · {pageName(open.where)} · {open.count}-ჯერ · პირველად: {errorWhen(open.first)} · ბოლოს: {errorWhen(open.last)}
              {' · '}{deviceName(open.dev)}{open.ver ? ` · ვერსია: ${open.ver}` : ''}
            </Note>
            {open.stack && (
              <pre tabIndex={0} className={cx('shrink-0 overflow-x-auto rounded-field bg-surf p-3 font-mono text-cap leading-snug whitespace-pre text-ink', FOCUS_IN)}>{open.stack}</pre>
            )}
            <Button kind="ghost" full icon={busy ? <Loader2 className="animate-spin" /> : <Trash2 />} disabled={busy} onClick={() => void remove(open)}>წაშლა</Button>
          </>
        )}
      </Sheet>
    </Screen>
  );
};
