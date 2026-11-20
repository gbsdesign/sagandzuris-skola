import React, { useEffect, useMemo, useState } from 'react';
import { hideNav } from '../../../design/newLook';
import { Check, Download, Plus, Users } from 'lucide-react';
import { useAuth } from '../../../context';
import { Avatar, Button, Check as Tick, Chips, Helper, Row, Rows, Sheet, Small, TopBar } from '../../../components/ui2';
import { CHIPS, type Filter, type UserRecord } from '../../../components/admin/UsersTab';
import { useBulkActions } from '../../../components/admin/BulkActions';
import type { SchoolClass } from '../../../hooks/useClasses';
import { useAdmin } from './ctx';
import { FILTER_NAMES } from './Home';
import { PersonRow, Screen } from './parts';
import { usePersonLine } from './People';

/** x-monishvna — several people ticked, then one act at the bottom: into a class, let in (superadmins), the centre's
 *  recordings. „გაუქმება“ (top right) leaves without doing anything. */
export const PickScreen: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { d, test, back, say } = useAdmin();
  const line = usePersonLine();
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [choosing, setChoosing] = useState(false);

  const count = (f: Filter) => d.users.filter(test[f]).length;
  const chips = (['all', ...(isSuperAdmin ? ['pending' as Filter] : []), ...CHIPS.map(c => c.id)] as Filter[])
    .map(f => ({ f, n: count(f) })).filter(x => x.f === 'all' || x.n > 0);
  const shown = useMemo(() => d.users.filter(test[filter]).sort((a, b) => a.name.localeCompare(b.name, 'ka')), [d.users, test, filter]);
  const picked = d.users.filter(u => sel.has(u.userId));
  const tick = (uid: string) => setSel(s => { const n = new Set(s); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  const allShown = shown.length > 0 && shown.every(u => sel.has(u.userId));

  const bulk = useBulkActions({ picked, staff: d.staff, access: d.access, onDone: back, onMessage: say });
  // the bar takes the bottom menu's place while people are ticked
  useEffect(() => hideNav(), []);
  const toClass = (c: SchoolClass) => { void bulk.toClass(c).then(ok => { if (ok) setChoosing(false); }); };

  return (
    <Screen className="pb-40">
      <TopBar title="მონიშვნა" onBack={back} right={<Button kind="quiet" size="md" onClick={back}>გაუქმება</Button>} />
      <Chips label="ფილტრი" value={filter} onChange={setFilter}
        items={chips.map(c => ({ id: c.f, label: `${c.f === 'all' ? 'ყველა' : FILTER_NAMES[c.f] || c.f} ${c.n}` }))} />
      {shown.length === 0 ? <Helper>აქ ჯერ არავინ არის.</Helper> : (
        <Rows role="group" aria-label="ადამიანები">
          <Row role="checkbox" aria-checked={allShown} lead={<Tick on={allShown} size={26} />} right={null}
            title={`ყველა · ${shown.length}`} onClick={() => setSel(allShown ? new Set() : new Set(shown.map(u => u.userId)))} />
          {shown.map((u: UserRecord) => (
            <PersonRow key={u.userId} u={u} sub={line(u)} role="checkbox" aria-checked={sel.has(u.userId)} right={null}
              lead={<Tick on={sel.has(u.userId)} size={26} />} onClick={() => tick(u.userId)} />
          ))}
        </Rows>
      )}

      {/* the dark bar at the bottom: how many, and what can be done with them */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div role="toolbar" aria-label="მონიშნულები"
          className="sg-up pointer-events-auto mx-auto flex max-w-[560px] flex-wrap items-center gap-2 rounded-card bg-ink py-2 pr-2 pl-5 text-white shadow-float">
          <span className="mr-auto text-body font-bold tabular-nums">{bulk.n ? `${bulk.n} მონიშნულია` : 'მონიშნე ადამიანები'}</span>
          {bulk.waiting.length > 0 && (
            <Button size="md" icon={<Check />} onClick={() => void bulk.letIn()} disabled={bulk.busy}>დაშვება · {bulk.waiting.length}</Button>
          )}
          {bulk.noRight.length > 0 && (
            <Button size="md" icon={<Download />} onClick={() => void bulk.giveRight()} disabled={bulk.busy}
              title="ფოლკლორის ცენტრის ჩანაწერების ჩამოწერა — მონიშნულ წევრებს">ჩანაწერები · {bulk.noRight.length}</Button>
          )}
          <Button size="md" icon={<Users />} onClick={() => setChoosing(true)} disabled={bulk.busy || !bulk.n || !d.classes.length}>კლასში</Button>
        </div>
      </div>

      <Sheet open={choosing} onClose={() => setChoosing(false)} title={`კლასში ჩაწერა · ${bulk.n}`}>
        <Helper>აირჩიე კლასი — მონიშნულები ერთად ჩაიწერებიან (ვინც უკვე იქაა, ისე დარჩება).</Helper>
        <Rows>
          {d.classes.map(c => {
            const fresh = picked.filter(u => !c.memberIds.includes(u.userId)).length;
            return (
              <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo || undefined} />} title={c.name}
                sub={`${c.members.length} წევრი${fresh < bulk.n ? ` · ${bulk.n - fresh} უკვე აქაა` : ''}`}
                right={fresh > 0 ? <Small tone="wine" className="flex items-center gap-1"><Plus className="size-4" />{fresh}</Small> : <Check aria-label="ყველა უკვე აქაა" className="size-4 text-mut" />}
                onClick={() => toClass(c)} disabled={bulk.busy || !fresh} />
            );
          })}
        </Rows>
      </Sheet>
    </Screen>
  );
};
