import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Card, Note, Num, Row, Rows, RoundButton, Small, Stats, TopBar } from '../../../components/ui2';
import { ALL_KATHISMAS, PsalterGroup, memberName, useCycleHistory } from '../../../hooks/usePsalter';
import { Cycle, KATHISMA_COUNT, Slots, formatRange, ownersThen, previousCycle } from '../../../utils/psalter';

const SHOWN = 4;
const COUNT = 12;

/** x-psalmuni-istoria — the finished cycles one at a time (‹ ›): how many kanons were read and skipped, and per kanon who
 *  was to read it then (`ownersThen`, the distribution of that cycle) and whether they did. */
export const HistoryScreen: React.FC<{ group: PsalterGroup; current: Cycle; onBack: () => void }> = ({ group, current, onBack }) => {
  const docs = useCycleHistory(group.id, COUNT + 4);
  const since = group.startDate || (group.createdAt || '').slice(0, 10);
  const rows = useMemo(() => {
    const byId = new Map(docs.map(d => [d.id, d.slots]));
    const out: { cycle: Cycle; read: number; slots: Slots }[] = [];
    let c = previousCycle(current, group.cycleDays, group.shiftDays);
    for (let i = 0; i < COUNT; i++) {
      if (since && c.end < since) break;
      const slots = byId.get(c.id) || {};
      out.push({ cycle: c, read: ALL_KATHISMAS.filter(k => slots[k]?.readBy).length, slots });
      c = previousCycle(c, group.cycleDays, group.shiftDays);
    }
    return out;
  }, [docs, current, group.cycleDays, group.shiftDays, since]);

  const [at, setAt] = useState(0); // 0 = the latest finished cycle
  const [all, setAll] = useState(false);
  const row = rows[Math.min(at, rows.length - 1)];
  const owners = useMemo(
    () => (row ? ownersThen({ assignment: group.assignment, baseHalf: group.baseHalf, shiftDays: group.shiftDays }, group.assignmentLog, row.cycle.start, row.cycle.half) : {}),
    [row, group.assignment, group.baseHalf, group.shiftDays, group.assignmentLog],
  );
  // „წრე N“: the cycle's number counted from the group's start
  const numberOf = (c: Cycle) => {
    if (!since) return null;
    let n = 1;
    let p = previousCycle(c, group.cycleDays, group.shiftDays);
    while (p.end >= since && n < 500) { n++; p = previousCycle(p, group.cycleDays, group.shiftDays); }
    return n;
  };

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="ისტორია" sub="ფსალმუნთა ჯგუფი" onBack={onBack} />
      {!row ? (
        <Card><p className="text-body text-mut">ჯგუფი ახლახან დაიწყო — ისტორია პირველი წრის შემდეგ გამოჩნდება.</p></Card>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <RoundButton label="წინა წრე" disabled={at >= rows.length - 1} onClick={() => { setAt(i => Math.min(i + 1, rows.length - 1)); setAll(false); }}><ChevronLeft /></RoundButton>
            <div className="min-w-0 flex-1 text-center">
              <div className="truncate text-lead font-bold">წრე {numberOf(row.cycle) ?? ''}</div>
              <div className="truncate text-meta text-mut">{formatRange(row.cycle)}</div>
            </div>
            <RoundButton label="შემდეგი წრე" disabled={at === 0} onClick={() => { setAt(i => Math.max(i - 1, 0)); setAll(false); }}><ChevronRight /></RoundButton>
          </div>
          <Stats items={[{ value: row.read, label: 'წაიკითხა' }, { value: KATHISMA_COUNT - row.read, label: 'გამოტოვდა' }]} />
          <Rows>
            {ALL_KATHISMAS.slice(0, all ? KATHISMA_COUNT : SHOWN).map(k => {
              const s = row.slots[k];
              const read = !!s?.readBy;
              const who = read ? s!.readBy : s?.takenBy || (owners[k] || [])[0];
              return (
                <Row key={k} lead={<Num n={k} on={read} />} title={`კანონი ${k}`} sub={who ? memberName(group, who) : undefined}
                  right={read ? <Small>წაიკითხა</Small> : <Small tone="gold">გამოტოვდა</Small>} />
              );
            })}
          </Rows>
          {!all && KATHISMA_COUNT > SHOWN && (
            <Button kind="ghost" full icon={<ChevronDown />} onClick={() => setAll(true)}>კიდევ {KATHISMA_COUNT - SHOWN} კანონი</Button>
          )}
          {rows.length >= COUNT && <Note>ბოლო {COUNT} წრე ჩანს.</Note>}
        </>
      )}
    </div>
  );
};
