import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import { Avatar, Button, Card, Dot, Row, Rows, Sheet, Small, TopBar, cx, FOCUS, Note } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { distributionLine, distributionPeople } from '../../../components/psalter/DistributionSheet';
import type { SchoolClass } from '../../../hooks/useClasses';
import { ALL_KATHISMAS, PsalterGroup, firstName, saveOwners } from '../../../hooks/usePsalter';
import { MAX_READERS, autoDistribute, changedReaders, distributionState, fillDistribution } from '../../../utils/psalter';
import { errorText } from '../../../utils/errorText';
import { Msg, useMsg } from './parts';

type Owners = Record<number, string[]>;

/** x-psalmuni-ganatsileba — who reads which kanon. Everyone reads it; the group's leaders change it (the old
 *  „განაწილება“ window: a person's twenty tiles, „ავტომატური შევსება“, „ყველას თავიდან“ after a confirm). */
export const DistScreen: React.FC<{ group: PsalterGroup; cls?: SchoolClass; owners: Owners; canLead: boolean; onBack: () => void }> = ({
  group, cls, owners, canLead, onBack,
}) => {
  const msg = useMsg();
  const [who, setWho] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const people = useMemo(() => distributionPeople(group, cls), [group, cls]);
  const order = people.map(p => p.uid);
  const line = distributionLine(owners, people);
  const nameOf = (uid: string) => people.find(p => p.uid === uid)?.name || group.members.find(m => m.uid === uid)?.name || 'წევრი';
  const kanonsOf = (uid: string) => ALL_KATHISMAS.filter(k => (owners[k] || []).includes(uid));

  const save = async (next: Owners, ok: string) => {
    const joining = people.filter(p => !group.memberIds.includes(p.uid) && ALL_KATHISMAS.some(k => (next[k] || []).includes(p.uid)));
    setBusy(true);
    try {
      await saveOwners(group, next, joining);
      msg.ok(ok);
    } catch (e) {
      msg.fail(`ვერ შეინახა. ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (uid: string, k: number) => {
    const list = owners[k] || [];
    const has = list.includes(uid);
    if (!has && list.length >= MAX_READERS) return;
    void save({ ...owners, [k]: has ? list.filter(u => u !== uid) : [...list, uid] },
      has ? `${firstName(nameOf(uid))} — კანონი ${k} მოეხსნა.` : `${firstName(nameOf(uid))} — კანონი ${k}.`);
  };

  // the result in words, true to what came out
  const summary = (next: Owners) => {
    const s = distributionState(next, order);
    const extra: string[] = [];
    if (s.most >= 2) extra.push(`ზოგს ${s.most} კანონი აქვს`);
    if (s.shared.length) extra.push(`${s.shared.length} კანონს ორი მკითხველი ჰყავს`);
    if (s.without.length) extra.push(`${s.without.length} კაცი მარაგშია — ყველა კანონს უკვე ორი ჰყავს`);
    return extra.length ? ` ${extra.join(' · ')}.` : '';
  };

  const fill = async () => {
    if (!order.length) { msg.fail('ჯერ არავინაა, ვისაც კანონი მიეცემა.'); return; }
    const next = fillDistribution(owners, order);
    const changed = changedReaders(owners, next);
    if (!changed.length) { msg.ok('შესაცვლელი არაფერია.'); return; }
    const had = changed.filter(u => kanonsOf(u).length > 0 && ALL_KATHISMAS.some(k => (next[k] || []).includes(u)));
    if (had.length && !(await askConfirm({
      title: 'შევავსო?',
      text: `ახლებს კანონი მიეცემა; ${had.map(u => firstName(nameOf(u))).join(', ')} — კანონი შეეცვლება (ერთი კანონი სხვას გადაეცემა ან თავისუფალზე გადავა). დანარჩენებს არაფერი ეცვლება.`,
      ok: 'შევსება',
    }))) return;
    const got = changed.filter(u => kanonsOf(u).length === 0).length;
    void save(next, `შეივსო${got ? `: ${got} კაცს მიეცა კანონი` : ''}.${summary(next)}`);
  };

  const redo = async () => {
    if (!order.length) { msg.fail('ჯერ არავინაა, ვისაც კანონი მიეცემა.'); return; }
    if (!(await askConfirm({ title: 'ყველას თავიდან?', text: 'ყველას ახალი კანონი მიეცემა სახელების რიგით; არსებული განაწილება შეიცვლება.', ok: 'თავიდან განაწილება', danger: true }))) return;
    const next = autoDistribute(order);
    void save(next, `განაწილდა.${summary(next)}`);
  };

  const person = who ? people.find(p => p.uid === who) || null : null;
  const withoutN = line.state.without.length;

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar title="განაწილება" sub="ვის რომელი კანონი აქვს" onBack={onBack} />
      {line.warn && (
        <Card pad="sm" className="flex items-center gap-3">
          <Dot icon={<Info />} size={40} />
          <p className="min-w-0 flex-1 text-body leading-snug">
            {withoutN > 0 ? `${withoutN === 1 ? 'ერთ წევრს' : `${withoutN} წევრს`} კანონი ჯერ არ აქვს.` : 'ყველა წევრს აქვს კანონი.'}
            {line.state.free.length > 0 && <span className="block text-meta text-mut">თავისუფალია: {line.state.free.join(', ')}</span>}
          </p>
        </Card>
      )}
      {people.length === 0 ? (
        <Note>ჯგუფში ჯერ წევრები არ არიან.</Note>
      ) : (
        <Rows>
          {people.map(p => {
            const ks = kanonsOf(p.uid);
            return (
              <Row key={p.uid} lead={<Avatar name={p.name} photo={p.photoURL} />} title={p.name} wrap
                onClick={canLead ? () => setWho(p.uid) : undefined}
                right={<Small tone={ks.length ? 'ink' : 'gold'}>{ks.length ? (ks.length === 1 ? `კანონი ${ks[0]}` : `კანონი ${ks.join(', ')}`) : 'ჯერ არ აქვს'}</Small>} />
            );
          })}
        </Rows>
      )}
      <Msg msg={msg.msg} onClose={msg.clear} />
      {canLead && (
        <div className="mt-2 flex flex-col gap-2.5">
          <Button full icon={<CheckCircle2 />} disabled={busy} onClick={() => void fill()}>ახლებს მიეცი კანონი</Button>
          <Button full kind="ghost" icon={<RotateCcw />} disabled={busy} onClick={() => void redo()}>ყველას თავიდან გაუნაწილე</Button>
          <Note>„ახლებს მიეცი კანონი“ ვისაც კანონი აქვს, იმას უტოვებს და მხოლოდ ცარიელს ავსებს. ერთ კანონს ორზე მეტი მკითხველი არ ჰყავს.</Note>
        </div>
      )}
      {canLead && person && (
        <Sheet open onClose={() => setWho(null)} title={person.name}>
          <Note>შეეხე კანონს — მიეცემა ან მოეხსნება. ერთ კანონს ორი კაცი შეიძლება ჰყავდეს.</Note>
          <ul className="grid grid-cols-4 gap-2" aria-label="20 კანონი">
            {ALL_KATHISMAS.map(k => {
              const list = owners[k] || [];
              const mine = list.includes(person.uid);
              const others = list.filter(u => u !== person.uid);
              const full = !mine && list.length >= MAX_READERS;
              return (
                <li key={k} className="min-w-0">
                  <button type="button" aria-pressed={mine} disabled={busy || full} onClick={() => toggle(person.uid, k)}
                    aria-label={`კანონი ${k}${mine ? ', მისი კანონია' : full ? ', ორი მკითხველი ჰყავს' : others.length ? `, კითხულობს ${nameOf(others[0])}` : ', თავისუფალი'}`}
                    className={cx(
                      'relative flex min-h-14 w-full flex-col items-center justify-center rounded-field px-1 py-1.5 transition',
                      mine ? 'bg-wine text-white' : full ? 'bg-soft text-mut' : others.length ? 'bg-surf text-ink' : 'bg-gold-tint text-gold-ink',
                      full ? 'cursor-default' : 'cursor-pointer active:scale-95', FOCUS,
                    )}>
                    <span className="text-lead leading-tight font-bold tabular-nums">{k}</span>
                    <span className="w-full truncate text-center text-cap leading-tight">
                      {others.length ? others.map(u => firstName(nameOf(u))).join(', ') : mine ? 'მისი' : 'ცარიელი'}
                    </span>
                    {mine && <Check aria-hidden="true" className="absolute top-1 right-1 size-3.5" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
          <Msg msg={msg.msg} onClose={msg.clear} />
          <Button full onClick={() => setWho(null)}>მზადაა</Button>
        </Sheet>
      )}
    </div>
  );
};
