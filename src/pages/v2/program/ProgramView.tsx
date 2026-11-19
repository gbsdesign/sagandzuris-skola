import React, { useRef } from 'react';
import { Church, Ellipsis, GripVertical, Plus, Radio, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button, Card, Dot, Note, Num, Press, Row, Rows, RoundButton, ToggleRow, TopBar, Two, cx } from '../../../components/ui2';
import { SwipeRow } from '../../../components/ui/SwipeRow';
import { triggerHaptic } from '../../../utils/haptics';

// „დღევანდელი წირვა“ as a picture of its props (boards x-dghevandeli): the regent's list with drag handles and a swipe to
// remove, „+ საგალობლის დამატება“, the AI row, „გაუგზავნე კლასს“ and the church mode. A member sees the same list read-only.

const NUM_WORDS = ['', 'ერთი', 'ორი', 'სამი', 'ოთხი', 'ხუთი', 'ექვსი', 'შვიდი', 'რვა', 'ცხრა', 'ათი'];

export interface ProgramRowData { id: string; title: string; sub: string }

export interface ProgramViewProps {
  /** „კვირა, 1 ნოემბერი“ */
  day: string;
  /** the class's name; empty = none yet */
  className?: string;
  rows: ProgramRowData[];
  /** the regent edits; a member only reads */
  regent: boolean;
  /** shown instead of a list when there is no program at all (a guest, nothing sent yet) */
  empty?: string;
  /** the AI row (only while the teacher's switch is on) */
  ai?: boolean;
  /** the regent's send state */
  send?: { label: string; busy?: boolean; done?: boolean; note?: string };
  /** a member's line: when the teacher sent it */
  sentNote?: string;
  /** a member: the regent's chant right now */
  live?: { title: string; following: boolean; onToggle: () => void } | null;
  /** the regent's „გუნდი მომყვება“: one switch on the page (board x-ultra-gundi-1) */
  lead?: { on: boolean; busy?: boolean; sub: string; onChange: (on: boolean) => void };
  onBack: () => void;
  onMore: () => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onAdd: () => void;
  onAi: () => void;
  onSend: () => void;
  onChurch: () => void;
}

/** a row of the list: number, name over its book line, and for the regent a handle to drag by */
const ListRow: React.FC<{
  row: ProgramRowData; n: number; regent: boolean; onOpen: () => void; onRemove: () => void; onDrag: (e: React.PointerEvent<HTMLElement>) => void;
}> = ({ row, n, regent, onOpen, onRemove, onDrag }) => {
  const body = (
    <div className="flex items-center bg-surf">
      <Press
        onClick={onOpen}
        className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-2 pr-1 pl-4 text-left transition-colors active:bg-soft"
      >
        <Num n={n} />
        <Two title={row.title} sub={row.sub} wrap />
      </Press>
      {regent && (
        <span
          role="button"
          aria-label={`${row.title}: გადაადგილება`}
          title="გადაადგილება"
          onPointerDown={onDrag}
          className="flex size-tap shrink-0 cursor-grab touch-none items-center justify-center text-faint select-none"
        >
          <GripVertical aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </span>
      )}
    </div>
  );
  if (!regent) return body;
  return (
    <SwipeRow
      faceBg="bg-surf"
      className="rounded-none!"
      left={{ label: 'ამოღება', icon: <Trash2 className="size-4" />, tone: 'bg-danger text-white', leave: true, run: onRemove }}
    >
      {body}
    </SwipeRow>
  );
};

export const ProgramView: React.FC<ProgramViewProps> = ({
  day, className, rows, regent, empty, ai, send, sentNote, live, lead, onBack, onMore, onOpen, onRemove, onMove, onAdd, onAi, onSend, onChurch,
}) => {
  const list = useRef<HTMLDivElement>(null);

  // drag the handle to change the order: the others step aside while the finger moves
  const startDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (!regent || !list.current) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const li = handle.closest<HTMLElement>('[data-pp]');
    if (!li) return;
    const all = [...list.current.querySelectorAll<HTMLElement>('[data-pp]')];
    const from = all.indexOf(li);
    const step = li.offsetHeight;
    const y0 = e.clientY;
    let to = from;
    li.style.position = 'relative';
    li.style.zIndex = '2';
    li.style.opacity = '0.92';
    try { handle.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      to = Math.max(0, Math.min(all.length - 1, from + Math.round(dy / step)));
      all.forEach((r, j) => {
        if (r === li) return;
        const off = j > from && j <= to ? -step : j < from && j >= to ? step : 0;
        r.style.transition = 'transform 0.15s';
        r.style.transform = off ? `translateY(${off}px)` : '';
      });
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      all.forEach(r => { r.style.transform = ''; r.style.transition = ''; });
      li.style.position = '';
      li.style.zIndex = '';
      li.style.opacity = '';
      if (to !== from) { triggerHaptic(10); onMove(from, to); }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const count = rows.length;
  const line = [className, empty === undefined ? `${count} საგალობელი` : ''].filter(Boolean).join(' · ');

  return (
    <div className="flex w-full flex-1 flex-col gap-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      <TopBar
        title="დღევანდელი წირვა"
        sub={day}
        onBack={onBack}
        right={empty === undefined ? <RoundButton label="მეტი" onClick={onMore}><Ellipsis /></RoundButton> : undefined}
      />

      {empty !== undefined ? (
        <Card><p className="text-body leading-normal text-mut">{empty}</p></Card>
      ) : (
        <>
          <p className="truncate px-1.5 text-meta font-semibold text-mut">{line || `${count} საგალობელი`}</p>
          {sentNote && <Note className="-mt-1.5">{sentNote}</Note>}

          {live && (
            <Card pad="sm" className="flex items-center gap-2.5">
              <Dot icon={<Radio />} />
              <Two title="რეგენტი ახლა" sub={live.title} />
              <Button size="md" kind={live.following ? 'soft' : 'ghost'} onClick={live.onToggle} aria-pressed={live.following}>
                {live.following ? 'მივყვები' : 'მიყოლა'}
              </Button>
            </Card>
          )}

          <Rows>
            {rows.length === 0 && (
              <p className="px-4 py-4 text-body leading-normal text-mut">
                {regent ? 'პროგრამა ცარიელია — დაამატე საგალობლები ან აირჩიე შაბლონი.' : 'პროგრამა ცარიელია.'}
              </p>
            )}
            <div ref={list} className="divide-y divide-line">
              {rows.map((r, i) => (
                <div key={r.id} data-pp>
                  <ListRow row={r} n={i + 1} regent={regent} onOpen={() => onOpen(r.id)} onRemove={() => onRemove(r.id)} onDrag={startDrag} />
                </div>
              ))}
            </div>
          </Rows>

          {regent && (
            <Button kind="ghost" full icon={<Plus />} onClick={onAdd}>საგალობლის დამატება</Button>
          )}

          {ai && (
            <Rows>
              <Row
                lead={<Dot icon={<Sparkles />} size={40} />}
                title="მოემზადე AI მასწავლებელთან"
                sub={count ? `10 წუთი · ამ ${NUM_WORDS[count] ?? count} საგალობლიდან` : '10 წუთი'}
                wrap
                onClick={onAi}
              />
            </Rows>
          )}
        </>
      )}

      <div className={cx('mt-auto flex flex-col gap-2.5 pt-3')}>
        {regent && empty === undefined && lead && (
          <Rows>
            <ToggleRow lead={<Dot icon={<Radio />} />} title="გუნდი მომყვება" sub={lead.sub} wrap
              on={lead.on} disabled={lead.busy || !count} onChange={lead.onChange} />
          </Rows>
        )}
        {regent && empty === undefined && send && (
          <>
            {send.note && <Note className="text-center">{send.note}</Note>}
            <Button full icon={<Send />} disabled={!count || send.busy} onClick={onSend} kind={send.done ? 'soft' : 'primary'}>{send.label}</Button>
          </>
        )}
        {empty === undefined && <Button kind={regent ? 'ghost' : 'primary'} full icon={<Church />} disabled={!count} onClick={onChurch}>გახსენი ტაძრის რეჟიმში</Button>}
      </div>
    </div>
  );
};
