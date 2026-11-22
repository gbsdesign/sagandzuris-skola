import React, { useEffect, useState } from 'react';
import { BookOpen, Bell, CalendarDays, Check, LifeBuoy, LogOut, MoreHorizontal, PenLine, Pencil, Undo2, Users } from 'lucide-react';
import { useLongPress } from '../../../hooks/useLongPress';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useNavigation } from '../../../context';
import { Button, Card, Chips, Dot, FOCUS, Helper, Hero, Note, Press, RoundButton, Row, Rows, TopBar, ToggleRow, cx } from '../../../components/ui2';
import { Field, Sheet } from '../../../components/ui2';
import { askConfirm } from '../../../components/ui/kit';
import { useKathismaActions } from '../../../components/psalter/useKathismaActions';
import { openPsalterGroup } from '../../../components/psalter/selectedGroup';
import { ALL_KATHISMAS, PsalterGroup, ergative, firstName, memberName, pickKanon, useGroupNow } from '../../../hooks/usePsalter';
import { KATHISMA_COUNT, KATHISMA_PSALMS, MAX_READERS, formatLeft, formatRange, msLeft, pickableKanons, readCount, responsible, shiftDaysText, slotState, wrap } from '../../../utils/psalter';
import { errorText } from '../../../utils/errorText';
import { pushSupported, setGroupPush, useGroupPush } from '../../../utils/groupPush';
import { fullName, hasGeorgianName, isGeorgian, saveProfileName, useProfileName } from '../../../utils/memberName';
import { useAuth } from '../../../context';
import { PSALTER_DIST, PSALTER_HISTORY } from '../klasi/nav';
import { DistScreen } from './DistScreen';
import { HistoryScreen } from './HistoryScreen';
import { ParamsSheet } from './ParamsSheet';
import { KanonGrid, Msg, kanonDat, kanonName, psalmsOf, useGroupTarget, useMsg } from './parts';
import { leaveGroup } from './groupOps';

// „ფსალმუნთა ჯგუფი“ in the new look (boards x-psalmuni, x-psalmuni-ganatsileba, x-psalmuni-istoria, x-psalmuni-parametrebi).
// Page `psalter`: the group (mapItem none), `dist` who reads which kanon, `history` the finished cycles — see klasi/nav.ts.
// Every behaviour of the old group page stays: marking read, asking for help, taking another's kanon, picking a kanon of
// one's own, the reminders switch, leaving; the leader's settings and distribution live in their own parts.

export const PsalterScreen: React.FC = () => {
  const { mapItem, handleGoBack } = useNavigation();
  const t = useGroupTarget();

  if (!t.user) {
    return (
      <div className="flex w-full flex-col gap-3 pb-4">
        <TopBar title="ფსალმუნთა ჯგუფი" sub="ერთად ვკითხულობთ ფსალმუნს" onBack={handleGoBack} />
        <Empty title="ფსალმუნთა ჯგუფი" text="ჯგუფში ყოველი წევრი თავის კანონს კითხულობს და ერთად მთელ ფსალმუნს ასრულებენ. შედი ანგარიშში, რომ შენი ჯგუფი ნახო." />
      </div>
    );
  }
  if (t.loading) {
    return (
      <div className="flex w-full flex-col gap-3 pb-4">
        <TopBar title="ფსალმუნთა ჯგუფი" onBack={handleGoBack} />
        <Waiting field={false} />
      </div>
    );
  }
  if (!t.group) {
    return (
      <div className="flex w-full flex-col gap-3 pb-4">
        <TopBar title="ფსალმუნთა ჯგუფი" sub="ერთად ვკითხულობთ ფსალმუნს" onBack={handleGoBack} />
        <Empty
          title="ჯერ ფსალმუნთა ჯგუფში არ ხარ"
          text="მასწავლებელი დაგამატებს ჯგუფში — მერე აქ გამოჩნდება შენი კანონი. ჯგუფი კლასის გვერდზე იქმნება."
        />
      </div>
    );
  }
  return <GroupScreen key={t.group.id} group={t.group} cls={t.cls} canLead={t.canLead} groups={t.groups} item={mapItem} />;
};

const Empty: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <Card className="flex flex-col items-center gap-2 px-6 py-8 text-center">
    <Dot icon={<BookOpen />} size={40} />
    <h2 className="text-head font-bold">{title}</h2>
    <p className="text-body leading-snug text-mut">{text}</p>
  </Card>
);

type Cls = ReturnType<typeof useGroupTarget>['cls'];

const GroupScreen: React.FC<{ group: PsalterGroup; cls: Cls; canLead: boolean; groups: PsalterGroup[]; item: string | null }> = ({ group, cls, canLead, groups, item }) => {
  const { user } = useAuth();
  const uid = user!.uid;
  const { handleGoBack } = useNavigation();
  const g = useGroupNow(group, uid);
  const [params, setParams] = useState(false);
  const { cycle } = g;
  const { openMapItem } = useNavigation();

  if (!cycle) return null;
  if (item === PSALTER_DIST) return <DistScreen group={group} cls={cls} owners={g.owners} canLead={canLead} onBack={handleGoBack} />;
  if (item === PSALTER_HISTORY) return <HistoryScreen group={group} current={cycle} onBack={handleGoBack} />;

  return (
    <div className="flex w-full flex-col gap-3 pb-4">
      <TopBar
        title="ფსალმუნთა ჯგუფი"
        sub={`${cls?.name || group.name} · ${group.memberIds.length} წევრი`}
        onBack={handleGoBack}
        right={canLead ? <RoundButton label="ჯგუფის პარამეტრები" onClick={() => setParams(true)}><MoreHorizontal /></RoundButton> : undefined}
      />
      {groups.length > 1 && (
        <Chips label="ჯგუფი" items={groups.map(x => ({ id: x.id, label: x.name }))} value={group.id} onChange={openPsalterGroup} />
      )}
      <Body group={group} uid={uid} canLead={canLead} now={g} onDist={() => openMapItem(PSALTER_DIST)} onHistory={() => openMapItem(PSALTER_HISTORY)} />
      {canLead && (
        <ParamsSheet open={params} onClose={() => setParams(false)} group={group} cls={cls}
          onDistribute={() => { setParams(false); openMapItem(PSALTER_DIST); }} onDeleted={() => { setParams(false); handleGoBack(); }} />
      )}
    </div>
  );
};

/** The group unfolded under the „სწავლა“ list's head (2026-11-22, the user: „ფსალმუნთა ჯგუფი … დაბლა შლიდეს მათთვის ვინც
 *  ფსალმუნთა ჯგუფშია“): the page's Body without its bar; „ვინ რომელ კანონს“ and „ეს წრე“ open the page `psalter` on them. */
export const PsalterFold: React.FC = () => {
  const t = useGroupTarget();
  if (!t.user || t.loading) return <Waiting field={false} rows={3} quiet />;
  if (!t.group) return null;
  return <FoldBody key={t.group.id} group={t.group} canLead={t.canLead} groups={t.groups} />;
};

const FoldBody: React.FC<{ group: PsalterGroup; canLead: boolean; groups: PsalterGroup[] }> = ({ group, canLead, groups }) => {
  const { user } = useAuth();
  const uid = user!.uid;
  const g = useGroupNow(group, uid);
  const { navigateTo, openMapItem } = useNavigation();
  if (!g.cycle) return null;
  const onPage = (item: string) => { navigateTo('psalter'); openMapItem(item); };
  return (
    <div className="flex flex-col gap-3">
      {groups.length > 1 && (
        <Chips label="ჯგუფი" items={groups.map(x => ({ id: x.id, label: x.name }))} value={group.id} onChange={openPsalterGroup} />
      )}
      <Body group={group} uid={uid} canLead={canLead} now={g} onDist={() => onPage(PSALTER_DIST)} onHistory={() => onPage(PSALTER_HISTORY)} />
    </div>
  );
};

type Now = ReturnType<typeof useGroupNow>;

export const Body: React.FC<{ group: PsalterGroup; uid: string; canLead: boolean; now: Now; onDist: () => void; onHistory: () => void }> = ({
  group, uid, canLead, now, onDist, onHistory,
}) => {
  const { openPrayer } = useNavigation();
  const { cycle, slots, owners, mine, takenFromMe, helpWanted } = now;
  const actions = useKathismaActions(group, cycle);
  const msg = useMsg();
  const settings = useGroupPush();
  const [pushBusy, setPushBusy] = useState(false);
  const [tile, setTile] = useState<number | null>(null);
  const [pick, setPick] = useState<number | null | false>(false); // false = closed, null = open with nothing chosen
  const [leaving, setLeaving] = useState(false);
  const [more, setMore] = useState(false);
  const isMember = group.memberIds.includes(uid);
  const read = readCount(slots);
  const othersHelp = helpWanted.filter(h => h.by !== uid);
  const canPick = isMember && !ALL_KATHISMAS.some(k => (owners[k] || []).includes(uid)) && ALL_KATHISMAS.some(k => (owners[k] || []).length < MAX_READERS);
  // the kanon the card shows: the first of mine not yet read, else the first
  const focus = mine.find(k => !slots[k]?.readBy) ?? mine[0];
  const rest = mine.filter(k => k !== focus);
  const helpable = focus !== undefined && !slots[focus]?.readBy && (owners[focus] || []).includes(uid) && slots[focus]?.takenBy !== uid;
  // the action messages (marked, taken, failed) come from the actions' own flash
  const flash = actions.message;
  useEffect(() => { if (flash) { (flash.type === 'success' ? msg.ok : msg.fail)(flash.text); actions.clearMessage(); } }, [flash]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePush = async () => {
    setPushBusy(true);
    const err = await setGroupPush({ ...settings, psalter: !settings.psalter });
    if (err) msg.fail(err);
    setPushBusy(false);
  };

  const mineTools = (k: number) => {
    const s = slots[k];
    const done = !!s?.readBy;
    const canToggle = !done || s?.readBy === uid;
    return { s, done, canToggle };
  };

  // the card's small ✎ (2026-11-22, the user: „ეს მოხაზული ფუნქციები პატარა ფანქარით ჩასვი მაღლა მარჯვნივ“): who reads which,
  // this cycle, „ვერ ვკითხულობ“ and the reminder open in a window instead of standing under the numbers
  const pencil = (
    <Press onClick={() => setMore(true)} aria-label="ჯგუფი და შეხსენება"
      className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white transition active:scale-95 active:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 [&_svg]:size-[17px]">
      <Pencil />
    </Press>
  );
  const rowDist = <Row lead={<Dot icon={<Users />} />} title="ვინ რომელ კანონს კითხულობს" onClick={() => { setMore(false); onDist(); }} />;
  const rowCycle = <Row lead={<Dot icon={<CalendarDays />} />} title="ეს წრე" sub={formatRange(cycle!)} onClick={() => { setMore(false); onHistory(); }} />;
  const tookBack = mine.filter(k => slots[k]?.takenBy === uid && !slots[k]?.readBy);

  return (
    <>
      {isMember && <NameNotice group={group} />}

      {!isMember ? (
        <Helper icon={<Users />}>შენ ამ ჯგუფს ხელმძღვანელობ. თუ თავადაც კითხულობ, ჩართე „მეც ვკითხულობ“ ჯგუფის პარამეტრებში (⋯).</Helper>
      ) : focus === undefined ? (
        <Hero
          kicker="შენი კანონი დღეს"
          title="კანონი ჯერ არ გაქვს"
          sub={canPick ? 'აირჩიე თავისუფალი კანონი — მერე გააგრძელებ.' : 'მარაგში ხარ — თუ ვინმე დახმარებას ითხოვს, შეგიძლია მისი კანონი აიღო.'}
          action={canPick ? { label: 'აირჩიე კანონი', icon: <Check />, onClick: () => setPick(null) } : undefined}
          corner={pencil}
        />
      ) : (
        <Hero
          kicker="შენი კანონი დღეს"
          title={kanonName(focus)}
          sub={`ფსალმუნი ${KATHISMA_PSALMS[focus - 1]}${mineTools(focus).done ? ' · წაკითხულია' : ` · დარჩა ${formatLeft(msLeft(cycle!, now.now))}`}`}
          corner={pencil}
        >
          <div className="mt-2.5 flex flex-wrap gap-2">
            <HeroButton filled icon={<BookOpen />} label="წაიკითხე" onClick={() => openPrayer(`kathisma-${focus}`)} />
            <HeroButton
              icon={<Check />}
              disabled={!mineTools(focus).canToggle || actions.busy === focus}
              pressed={mineTools(focus).done}
              onClick={() => void (mineTools(focus).done ? actions.unread(focus) : actions.read(focus))}
            >
              {mineTools(focus).done ? 'წაკითხულია' : 'წავიკითხე'}
            </HeroButton>
          </div>
        </Hero>
      )}

      {rest.length > 0 && (
        <Rows>
          {rest.map(k => {
            const { done, canToggle } = mineTools(k);
            return (
              <Row key={k} lead={<Dot icon={<BookOpen />} />} title={`კანონი ${k}`} sub={psalmsOf(k)}
                onClick={() => openPrayer(`kathisma-${k}`)}
                right={
                  <Button kind={done ? 'ghost' : 'soft'} size="md" disabled={!canToggle || actions.busy === k}
                    onClick={e => { e.stopPropagation(); void (done ? actions.unread(k) : actions.read(k)); }}>
                    {done ? 'წაკითხულია' : 'წავიკითხე'}
                  </Button>
                } />
            );
          })}
        </Rows>
      )}

      {takenFromMe.map(k => (
        <Helper key={k} icon={<LifeBuoy />}>შენი კანონი {k} {ergative(firstName(memberName(group, slots[k]?.takenBy)))} აიღო — ამ წრეში მისი წასაკითხია.</Helper>
      ))}

      {isMember && othersHelp.length > 0 && (
        <Rows>
          {othersHelp.map(h => (
            <Row key={h.k} lead={<Dot icon={<LifeBuoy />} color="gold" />} title={`${firstName(memberName(group, h.by))} · კანონი ${h.k}`} sub="დახმარებას ითხოვს"
              right={<Button size="md" disabled={actions.busy === h.k} onClick={() => void actions.take(h.k)}>აღება</Button>} />
          ))}
        </Rows>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-head font-bold">დღეს წაიკითხა</h2>
          <span className="text-body font-bold text-wine tabular-nums">{read} / {KATHISMA_COUNT}</span>
        </div>
        <ul className="grid grid-cols-10 gap-1" aria-label="წრის 20 კანონი">
          {ALL_KATHISMAS.map(k => {
            const s = slots[k];
            const done = !!s?.readBy;
            const own = owners[k] || [];
            const state = slotState(s, own, false);
            const mineK = responsible(s, own).includes(uid);
            const help = !!s?.help && !done;
            // a long press marks it read (or takes the mark back) where the window's own buttons would; elsewhere it opens the window
            const onLong = () => {
              if (actions.busy === k) return;
              if (!done && (mineK || canLead)) void actions.read(k);
              else if (done && (s?.readBy === uid || canLead)) void actions.unread(k);
              else setTile(k);
            };
            return (
              <li key={k}>
                <KanonTile k={k} done={done} help={help} taken={state === 'taken'} mine={mineK}
                  onTap={() => openPrayer(`kathisma-${k}`)} onLong={onLong} />
              </li>
            );
          })}
        </ul>
        {read === KATHISMA_COUNT && <Note className="px-0">მთელი ფსალმუნი წაკითხულია — დიდება ღმერთს!</Note>}
      </Card>

      {/* a leader who doesn't read has no card for the ✎ — the two rows stay here for them */}
      {!isMember && <Rows>{rowDist}{rowCycle}</Rows>}
      <Msg msg={msg.msg} onClose={msg.clear} />

      <Sheet open={more} onClose={() => setMore(false)} title="ფსალმუნთა ჯგუფი">
        <Rows>
          {rowDist}
          {rowCycle}
          {isMember && helpable && focus !== undefined && (
            <ToggleRow lead={<Dot icon={<LifeBuoy />} />} title="ვერ ვკითხულობ" sub="ჯგუფს დახმარებას სთხოვ"
              on={!!slots[focus]?.help} disabled={actions.busy === focus}
              onChange={on => void (on ? actions.askHelp(focus) : actions.cancelHelp(focus))} />
          )}
          {/* a kanon I took for someone: its „დაბრუნება“ lived in the number's window, which a tap no longer opens */}
          {tookBack.map(k => (
            <Row key={k} lead={<Dot icon={<Undo2 />} />} title={`კანონი ${k} — დაბრუნება`} sub="აღებულს ჯგუფს დაუბრუნებ"
              onClick={() => { setMore(false); void actions.giveBack(k); }} />
          ))}
          {isMember && pushSupported() && (
            <ToggleRow lead={<Dot icon={<Bell />} />} title={group.remindDaily ? `შეხსენება ${group.remindDaily}-ზე` : 'შეხსენებები'}
              on={settings.psalter} disabled={pushBusy} onChange={() => void togglePush()} />
          )}
        </Rows>
        {isMember && !pushSupported() && <Note>ეს ბრაუზერი შეტყობინებებს ვერ მიიღებს. iPhone-ზე ჯერ დაამატე საიტი მთავარ ეკრანზე.</Note>}
      </Sheet>

      {isMember && !canLead && (
        <Press disabled={leaving} onClick={async () => {
          setLeaving(true);
          const err = await leaveGroup(group, uid);
          setLeaving(false);
          if (err) msg.fail(err);
        }} className={cx('mx-auto flex h-tap cursor-pointer items-center gap-2 px-4 text-body font-bold text-mut', FOCUS)}>
          <LogOut className="size-[18px]" /> ჯგუფიდან გასვლა
        </Press>
      )}

      <KanonSheet group={group} k={tile} uid={uid} now={now} canLead={canLead} isMember={isMember} actions={actions} canPick={canPick}
        onClose={() => setTile(null)} onPick={k => { setTile(null); setPick(k); }} />
      {canPick && <PickSheet group={group} uid={uid} owners={owners} open={pick !== false} first={pick || null} onClose={() => setPick(false)} onDone={msg.ok} onFail={msg.fail} />}
    </>
  );
};

/** The two buttons on the wine card: the white round 📖 (only the sign — 2026-11-22, the user: „სიტყვა წაიკითხე … მოხსენი მარტო
 *  ნიშანი დარჩეს“; `label` is its spoken name) and the glass „წავიკითხე“. */
const HeroButton: React.FC<{ children?: React.ReactNode; label?: string; icon: React.ReactNode; onClick: () => void; filled?: boolean; pressed?: boolean; disabled?: boolean }> = ({
  children, label, icon, onClick, filled, pressed, disabled,
}) => (
  <Press onClick={onClick} disabled={disabled} aria-pressed={pressed} aria-label={children ? undefined : label}
    className={cx(
      'inline-flex h-tap min-w-0 cursor-pointer items-center gap-2 rounded-full text-body font-bold whitespace-nowrap transition active:scale-[0.97] disabled:cursor-default disabled:opacity-60 [&_svg]:size-[18px] [&_svg]:shrink-0',
      children ? 'pr-5 pl-4' : 'w-tap justify-center [&_svg]:size-5',
      filled ? 'bg-white text-wine' : pressed ? 'bg-white/30 text-white' : 'bg-white/15 text-white active:bg-white/25',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
    )}>
    {icon}{children && <span className="min-w-0 truncate">{children}</span>}
  </Press>
);

/** One of the 20 numbers: a tap opens the kanon to read, a long press marks it read (2026-11-22, the user: „ციფრზე დაჭერისას
 *  პირდაპირ ფსალმუნს ხსნიდეს, დიდხანს დაჭერისას კი პირდაპირ ინიშნებოდეს წაკითხულად“). */
const KanonTile: React.FC<{ k: number; done: boolean; help: boolean; taken: boolean; mine: boolean; onTap: () => void; onLong: () => void }> = ({
  k, done, help, taken, mine, onTap, onLong,
}) => {
  const press = useLongPress(onLong);
  return (
    <button
      type="button"
      {...press}
      onClick={onTap}
      aria-label={`კანონი ${k}${done ? ', წაკითხულია' : help ? ', დახმარებას ითხოვს' : ''} — დააჭირე წასაკითხად, დიდხანს დააჭირე წაკითხულად მოსანიშნად`}
      className={cx(
        // a tap target of 36px with the kanon's number, so the tile says which kanon it is
        'flex h-9 w-full cursor-pointer touch-manipulation items-center justify-center rounded-chip text-meta font-semibold tabular-nums transition select-none [-webkit-touch-callout:none] active:scale-95',
        done ? 'bg-wine text-white' : taken || help ? 'bg-gold-tint text-gold-ink' : 'bg-track text-mut',
        mine && !done && 'ring-2 ring-wine',
        FOCUS,
      )}
    >{k}</button>
  );
};

type Actions = ReturnType<typeof useKathismaActions>;

/** A kanon's window (a tap on its small box): who reads it, and only the actions that fit. */
const KanonSheet: React.FC<{
  group: PsalterGroup; k: number | null; uid: string; now: Now; canLead: boolean; isMember: boolean; actions: Actions; canPick: boolean;
  onClose: () => void; onPick: (k: number) => void;
}> = ({ group, k, uid, now, canLead, isMember, actions, canPick, onClose, onPick }) => {
  const { openPrayer } = useNavigation();
  const shown = useLastShown(k);
  if (shown === null) return null;
  const { slots, owners } = now;
  const slot = slots[shown];
  const own = owners[shown] || [];
  const who = responsible(slot, own);
  const state = slotState(slot, own, false);
  const mine = who.includes(uid);
  const ownerMine = own.includes(uid);
  const help = !!slot?.help && state !== 'read' && state !== 'taken';
  const names = (list: (string | undefined)[]) => list.filter(Boolean).map(u => memberName(group, u)).join(', ');
  const status =
    state === 'read' ? `წაიკითხა: ${names([slot?.readBy])}`
      : state === 'taken' ? `${names([slot?.takenBy])} აიღო ${names(own) ? `(${names(own)}-ის ნაცვლად)` : ''}`
      : state === 'free' ? 'ჯერ არავის აბარია'
      : help ? `${names(who)} — დახმარებას ითხოვს`
      : `${who.length > 1 ? 'კითხულობენ' : 'კითხულობს'}: ${names(who)}`;
  const run = (fn: () => Promise<unknown>) => { onClose(); void fn(); };
  const pickable = canPick && own.length < MAX_READERS;
  return (
    <Sheet open={k !== null} onClose={onClose} title={`კანონი ${shown} · ${psalmsOf(shown)}`}>
      <p className={cx('text-body leading-snug', state === 'read' ? 'text-leaf-ink' : help ? 'text-gold-ink' : 'text-ink')}>{status}</p>
      <div className="flex flex-col gap-2">
        <Button kind="ghost" full icon={<BookOpen />} onClick={() => { onClose(); openPrayer(`kathisma-${shown}`); }}>კითხვა</Button>
        {state !== 'read' && (mine || canLead) && <Button full icon={<Check />} onClick={() => run(() => actions.read(shown))}>წავიკითხე</Button>}
        {state === 'read' && (slot?.readBy === uid || canLead) && <Button kind="ghost" full onClick={() => run(() => actions.unread(shown))}>მონიშვნის გაუქმება</Button>}
        {isMember && help && !mine && <Button full onClick={() => run(() => actions.take(shown))}>აღება — მე წავიკითხავ</Button>}
        {state === 'taken' && slot?.takenBy === uid && <Button kind="ghost" full onClick={() => run(() => actions.giveBack(shown))}>დაბრუნება</Button>}
        {ownerMine && state === 'unread' && (slot?.help
          ? <Button kind="ghost" full icon={<LifeBuoy />} onClick={() => run(() => actions.cancelHelp(shown))}>დახმარების თხოვნის გაუქმება</Button>
          : <Button kind="ghost" full icon={<LifeBuoy />} onClick={() => run(() => actions.askHelp(shown))}>ვერ ვკითხულობ — დახმარება მჭირდება</Button>)}
        {pickable && (
          <>
            <Note>{own.length ? 'შეგიძლია მეორე მკითხველი გახდე — ეს კანონი შენიც იქნება.' : 'ეს კანონი თავისუფალია — შეგიძლია შენ აირჩიო.'}</Note>
            <Button full onClick={() => onPick(shown)}>ჩემს კანონად არჩევა</Button>
          </>
        )}
      </div>
    </Sheet>
  );
};

/** The number last shown, so a closing window keeps its words while it leaves. */
const useLastShown = (k: number | null) => {
  const [last, setLast] = useState<number | null>(k);
  useEffect(() => { if (k !== null) setLast(k); }, [k]);
  return k ?? last;
};

/** A member without a kanon takes a free one (or the second place beside one reader) — the old tile window's „ჩემს კანონად არჩევა“. */
const PickSheet: React.FC<{
  group: PsalterGroup; uid: string; owners: Record<number, string[]>; open: boolean; first: number | null; onClose: () => void;
  onDone: (t: string) => void; onFail: (t: string) => void;
}> = ({ group, uid, owners, open, first, onClose, onDone, onFail }) => {
  const [sel, setSel] = useState<number | null>(first);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setSel(first); }, [open, first]);
  const pickable = pickableKanons(owners);
  const freeOnes = pickable.every(k => !(owners[k] || []).length);
  const shift = shiftDaysText(group.shiftDays);
  const go = async () => {
    if (sel === null) return;
    const k = sel;
    if (!(await askConfirm({
      title: `კანონი ${k} შენი იყოს?`,
      text: `ყოველი თვის ${shift} რიცხვში შემდეგ კანონზე გადახვალ (${k} → ${wrap(k + 1)}). შეცვლა მერე მასწავლებელს შეუძლია.`,
      ok: 'არჩევა',
    }))) return;
    setBusy(true);
    try {
      await pickKanon(group, k, uid);
      onClose();
      onDone(`კანონი ${k} შენია. ღმერთმა შეგეწიოს!`);
    } catch (e) {
      onClose();
      onFail(String((e as { code?: string })?.code || '').includes('permission-denied')
        ? 'ვერ მოხერხდა — ეს კანონი ალბათ ახლახან სხვამ აირჩია. სცადე სხვა.'
        : `ვერ შეინახა. ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onClose={onClose} title="აირჩიე შენი კანონი">
      <KanonGrid pickable={pickable} sel={sel} onSel={setSel} disabled={busy}
        sub={k => (freeOnes || !(owners[k] || []).length ? psalmsOf(k) : (owners[k] || []).map(u => firstName(memberName(group, u))).join(', '))} />
      {!freeOnes && <Note>თავისუფალი აღარ დარჩა — აირჩიე, ვის გვერდით წაიკითხავ.</Note>}
      <Button full disabled={sel === null || busy} icon={<Check />} onClick={() => void go()}>
        {sel === null ? 'აირჩიე კანონი' : `ვირჩევ ${kanonDat(sel)}`}
      </Button>
    </Sheet>
  );
};

/** The group prays for its members by name: ask for the Georgian name when it isn't there yet. */
const NameNotice: React.FC<{ group: PsalterGroup }> = ({ group }) => {
  const { user } = useAuth();
  const profile = useProfileName(user?.uid);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState({ firstName: '', lastName: '', churchName: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (profile) setName(profile); }, [profile]);
  const entry = group.members.find(m => m.uid === user?.uid);
  if (!profile || !entry || (hasGeorgianName(profile) && isGeorgian(entry.name))) return null;

  const save = async () => {
    if (!hasGeorgianName(name)) { setError('სახელი და გვარი ქართული ასოებით ჩაწერე.'); return; }
    if (name.churchName && !isGeorgian(name.churchName)) { setError('მოსახსენებელი სახელიც ქართულად.'); return; }
    setSaving(true);
    try {
      await saveProfileName(user!.uid, name, user!.photoURL || '');
      setOpen(false);
    } catch {
      setError('ვერ შეინახა. სცადე ხელახლა.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Rows>
        <Row lead={<Dot icon={<PenLine />} color="gold" />} title="ჩაწერე სახელი და გვარი ქართულად" sub={`ჯგუფი წევრებს სახელით მოიხსენიებს — ახლა „${entry.name}“ ხარ.`} wrap onClick={() => setOpen(true)} />
      </Rows>
      <Sheet open={open} onClose={() => setOpen(false)} title="სახელი მოსახსენებლად">
        <Field label="სახელი" value={name.firstName} onChange={v => setName(n => ({ ...n, firstName: v }))} placeholder="ნინო" />
        <Field label="გვარი" value={name.lastName} onChange={v => setName(n => ({ ...n, lastName: v }))} placeholder="ბერიძე" />
        <Field label="ნათლობის სახელი" hint="თუ განსხვავდება" value={name.churchName} onChange={v => setName(n => ({ ...n, churchName: v }))} placeholder={name.firstName || 'ნინო'} />
        {hasGeorgianName(name) && <Note>ჯგუფში ასე გამოჩნდები: <b>{fullName(name)}</b></Note>}
        {error && <p className="px-1.5 text-meta font-semibold text-danger">{error}</p>}
        <Button full disabled={saving} onClick={() => void save()}>{saving ? 'ინახება…' : 'შენახვა'}</Button>
      </Sheet>
    </>
  );
};

export default PsalterScreen;
