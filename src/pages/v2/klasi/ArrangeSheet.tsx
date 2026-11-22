import React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Dot, Row, Rows, Sheet } from '../../../components/ui2';
import { useLongPress } from '../../../hooks/useLongPress';

// A program line's long press (2026-11-22, the user: „პროგრამის საგალობელზე დიდხანს დაჭერისას … გადაადგილება და წაშლა კლასის
// ჩათებშიც და პირად მიმოწერაშიც“): the class program in the class chat's fold and a student's path in a private chat. The
// window stays open while moving, so a line can go several places in a row.

/** A line that answers a long press (or a right click); a plain tap still reaches the line's own button. */
export const Held: React.FC<{ onLong: () => void; children: React.ReactNode }> = ({ onLong, children }) => {
  const lp = useLongPress(onLong);
  return <div {...lp} className="select-none [-webkit-touch-callout:none]">{children}</div>;
};

export const ArrangeSheet: React.FC<{
  open: boolean;
  title: string;
  /** place in the list, from 0 */
  at: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  deleteSub?: string;
  onClose: () => void;
  /** more rows under the moves (e.g. notes, „დავალებად მიცემა“) */
  children?: React.ReactNode;
}> = ({ open, title, at, count, onMove, onDelete, deleteSub, onClose, children }) => (
  <Sheet open={open} title={title} onClose={onClose}>
    <Rows>
      <Row lead={<Dot icon={<ArrowUp />} />} title="მაღლა აწევა" sub={`ადგილი ${at + 1} / ${count}`} right={null}
        disabled={at <= 0} onClick={() => onMove(-1)} />
      <Row lead={<Dot icon={<ArrowDown />} />} title="დაბლა ჩამოწევა" right={null}
        disabled={at < 0 || at >= count - 1} onClick={() => onMove(1)} />
      {children}
      <Row lead={<Dot icon={<Trash2 />} color="soft" />} title="წაშლა" sub={deleteSub} tone="danger" right={null} onClick={onDelete} />
    </Rows>
  </Sheet>
);
