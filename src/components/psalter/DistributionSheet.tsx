import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { Avatar, BackBtn, Btn, Flash, Sheet, Tabs, askConfirm, useFlash } from '../ui/kit';
import type { SchoolClass } from '../../hooks/useClasses';
import { ALL_KATHISMAS, GroupMember, PsalterGroup, firstName, saveOwners } from '../../hooks/usePsalter';
import { KATHISMA_COUNT, KATHISMA_PSALMS, MAX_READERS, autoDistribute, changedReaders, distributionState, fillDistribution } from '../../utils/psalter';
import { errorText } from '../../utils/errorText';
import { PeoplePicker } from '../people/PeoplePicker';

// „განაწილება“ (2026-10-30, the user: „ხალხს ვერ ვუნაწილებ კანონებს“): the leader's one window for who reads which kanon.
// „ხალხი“ — everyone with their kanons (or amber „კანონი არ აქვს“); a tap opens the person's twenty tiles, a tile gives or
// takes that kanon at once. „კანონები“ — the twenty with their readers; a tap opens the list to pick (at most two).
// „ავტომატური შევსება“ keeps everyone in place and only fills the gaps (utils/psalter `fillDistribution`);
// „ყველას თავიდან“ deals all twenty again by name, after a confirm.

type Owners = Record<number, string[]>;
const byName = (a: GroupMember, b: GroupMember) => a.name.localeCompare(b.name, 'ka');

/** Everyone who may read: the class's members (joining the group when they get a kanon) and the group's other readers. */
export const distributionPeople = (group: PsalterGroup, cls?: SchoolClass): GroupMember[] => [
  ...(cls ? cls.members.map(m => group.members.find(g => g.uid === m.uid) || { uid: m.uid, name: m.name || 'წევრი', prayer: '', photoURL: m.photoURL || '' }) : []),
  ...group.members.filter(m => !cls || !cls.memberIds.includes(m.uid)),
].sort(byName);

const listText = (ks: number[]) => (ks.length === 1 ? `კანონი ${ks[0]}` : `კანონი ${ks.join(', ')}`);

/** One line on how the distribution stands — for the section's „განაწილება“ row and the window's head. */
export const distributionLine = (owners: Owners, people: GroupMember[]) => {
  const s = distributionState(owners, people.map(p => p.uid));
  const parts: string[] = [];
  if (s.free.length) parts.push(s.free.length === 1 ? `კანონი ${s.free[0]} თავისუფალია` : `${s.free.length} კანონი თავისუფალია`);
  if (s.without.length) parts.push(`${s.without.length} კაცს კანონი არ აქვს`);
  return { warn: parts.length > 0, text: parts.length ? parts.join(' · ') : 'ყველას აქვს კანონი', state: s };
};

export const DistributionSheet: React.FC<{
  open: boolean; onClose: () => void; group: PsalterGroup; cls?: SchoolClass; owners: Owners;
}> = ({ open, onClose, group, cls, owners }) => {
  const msg = useFlash();
  const [tab, setTab] = useState<'people' | 'kanons'>('people');
  const [who, setWho] = useState<string | null>(null);
  const [pickK, setPickK] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const people = useMemo(() => distributionPeople(group, cls), [group, cls]);
  const order = people.map(p => p.uid);
  const line = distributionLine(owners, people);
  const nameOf = (uid: string) => people.find(p => p.uid === uid)?.name || group.members.find(m => m.uid === uid)?.name || 'წევრი';
  const kanonsOf = (uid: string) => ALL_KATHISMAS.filter(k => (owners[k] || []).includes(uid));

  const close = () => { setWho(null); setPickK(null); msg.clear(); onClose(); };

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

  // a tile of the person's view: gives the kanon (beside a lone reader too) or takes it back
  const toggle = (uid: string, k: number) => {
    const list = owners[k] || [];
    const has = list.includes(uid);
    if (!has && list.length >= MAX_READERS) return;
    const next = { ...owners, [k]: has ? list.filter(u => u !== uid) : [...list, uid] };
    void save(next, has ? `${firstName(nameOf(uid))} — კანონი ${k} მოეხსნა.` : `${firstName(nameOf(uid))} — კანონი ${k}.`);
  };

  // the result in words, true to what came out (no „ზოგს ორი“ when some have three)
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

  return (
    <>
      <Sheet
        open={open && pickK === null}
        onClose={close}
        title={person ? (
          <span className="flex items-center gap-2.5 min-w-0">
            <BackBtn onClick={() => setWho(null)} label="განაწილებაზე დაბრუნება" className="!w-9 !h-9" />
            <span className="truncate">{person.name}</span>
          </span>
        ) : 'განაწილება'}
        footer={person
          ? <Btn full onClick={() => setWho(null)}>მზადაა</Btn>
          : <Btn kind="soft" full icon={<Shuffle />} disabled={busy} onClick={() => void fill()}>ავტომატური შევსება</Btn>}
      >
        {msg.flash && (
          <div className="sticky -top-4 z-10 -mx-5 px-5 -mt-4 pt-3 pb-2 bg-[#fbf6ec]">
            <Flash flash={msg.flash} onClose={msg.clear} />
          </div>
        )}

        {person ? (
          <PersonKanons uid={person.uid} owners={owners} nameOf={nameOf} busy={busy} onToggle={k => toggle(person.uid, k)} />
        ) : (
          <div className="space-y-3">
            <p className={`px-3.5 py-2.5 rounded-2xl text-[14px] font-semibold leading-snug ${line.warn ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'}`}>
              {line.text}
              {line.state.free.length > 1 && <span className="block text-[13px] font-medium">თავისუფალი: {line.state.free.join(', ')}</span>}
            </p>

            <Tabs
              cols={2}
              value={tab}
              onChange={setTab}
              items={[
                { id: 'people', label: 'ხალხი', count: people.length, dot: line.state.without.length > 0 },
                { id: 'kanons', label: 'კანონები', count: KATHISMA_COUNT, dot: line.state.free.length > 0 },
              ]}
            />

            {tab === 'people' ? (
              people.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#8a7a6a]">კლასში ჯერ წევრები არ არიან.</p>
              ) : (
                <ul className="-mx-2 divide-y divide-[#efe3cf]">
                  {people.map(p => {
                    const ks = kanonsOf(p.uid);
                    return (
                      <li key={p.uid}>
                        <button type="button" onClick={() => setWho(p.uid)}
                          className="w-full min-h-14 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-white/70 transition-colors">
                          <Avatar name={p.name} photo={p.photoURL} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-[#2a2017] truncate">{p.name}</span>
                            <span className={`block text-[13px] ${ks.length ? 'text-[#7a2028] font-semibold' : 'text-amber-700 font-semibold'}`}>
                              {ks.length ? listText(ks) : 'კანონი არ აქვს'}
                            </span>
                          </span>
                          <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a594]" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              <ul className="-mx-2 divide-y divide-[#efe3cf]">
                {ALL_KATHISMAS.map(k => {
                  const list = owners[k] || [];
                  return (
                    <li key={k}>
                      <button type="button" onClick={() => setPickK(k)}
                        className="w-full min-h-14 flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer hover:bg-white/70 transition-colors">
                        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-serif-ge text-[18px] font-bold tabular-nums ${list.length ? 'bg-[#7a2028]/[0.07] text-[#7a2028]' : 'border border-dashed border-amber-300 text-amber-700'}`}>{k}</span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[15px] font-semibold truncate ${list.length ? 'text-[#2a2017]' : 'text-amber-700'}`}>
                            {list.length ? list.map(nameOf).join(', ') : 'თავისუფალი'}
                          </span>
                          <span className="block text-[13px] text-[#8a7a6a]">ფს. {KATHISMA_PSALMS[k - 1]}</span>
                        </span>
                        <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a594]" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="pt-2 border-t border-[#e8dcc8]">
              <p className="text-[13px] leading-relaxed text-[#8a7a6a]">
                „ავტომატური შევსება“ ვისაც კანონი აქვს, იმას უტოვებს და მხოლოდ ცარიელს ავსებს. ერთ კანონს ორზე მეტი მკითხველი არ ჰყავს.
              </p>
              <Btn kind="ghost" size="sm" className="mt-2" icon={<RotateCcw />} disabled={busy} onClick={() => void redo()}>ყველას თავიდან განაწილება</Btn>
            </div>
          </div>
        )}
      </Sheet>

      <PeoplePicker
        open={open && pickK !== null}
        onClose={() => setPickK(null)}
        title={pickK ? `კანონი ${pickK} — ვინ კითხულობს` : ''}
        people={people}
        selected={pickK ? owners[pickK] || [] : []}
        max={MAX_READERS}
        doneLabel="შენახვა"
        empty="კლასში ჯერ წევრები არ არიან."
        onDone={uids => {
          if (!pickK) return;
          const k = pickK;
          void save({ ...owners, [k]: uids }, `კანონი ${k}: ${uids.length ? uids.map(nameOf).join(', ') : 'თავისუფალია'}.`);
        }}
      />
    </>
  );
};

/** The person's twenty tiles: theirs in wine with a tick; others' show who reads them; two readers = full. */
const PersonKanons: React.FC<{ uid: string; owners: Owners; nameOf: (u: string) => string; busy: boolean; onToggle: (k: number) => void }> = ({ uid, owners, nameOf, busy, onToggle }) => (
  <div className="pt-1">
    <p className="text-[14px] leading-snug text-[#75685a]">შეეხე კანონს — მიეცემა ან მოეხსნება. ერთ კანონს ორი კაცი შეიძლება ჰყავდეს.</p>
    <ul className="mt-3 grid grid-cols-4 min-[420px]:grid-cols-5 gap-2" aria-label="20 კანონი">
      {ALL_KATHISMAS.map(k => {
        const list = owners[k] || [];
        const mine = list.includes(uid);
        const others = list.filter(u => u !== uid);
        const full = !mine && list.length >= MAX_READERS;
        return (
          <li key={k}>
            <button
              type="button"
              aria-pressed={mine}
              disabled={busy || full}
              onClick={() => onToggle(k)}
              aria-label={`კანონი ${k}${mine ? ', მისი კანონია' : full ? ', ორი მკითხველი ჰყავს' : others.length ? `, კითხულობს ${nameOf(others[0])}` : ', თავისუფალი'}`}
              className={[
                'relative w-full h-[68px] rounded-xl px-1 flex flex-col items-center justify-center cursor-pointer transition active:scale-95 disabled:cursor-default',
                mine && 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.9)]',
                !mine && !full && others.length > 0 && 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40',
                !mine && !others.length && 'text-amber-800 border border-dashed border-amber-300 bg-amber-50/50',
                full && 'bg-[#efe5d4]/60 text-[#a4927c]',
              ].filter(Boolean).join(' ')}
            >
              <span className="font-serif-ge text-[19px] font-bold leading-none tabular-nums">{k}</span>
              <span className={`mt-1 w-full text-center text-xs leading-none truncate ${mine ? 'text-[#fbf6ec]/80' : ''}`}>
                {others.length ? others.map(u => firstName(nameOf(u))).join(', ') : mine ? 'მისი' : 'ცარიელი'}
              </span>
              {mine && <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white ring-2 ring-[#fbf6ec] flex items-center justify-center" aria-hidden><Check className="w-3 h-3 stroke-[3.5]" /></span>}
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);
