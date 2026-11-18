import React from 'react';
import { ChevronRight, Megaphone, MessageCircle, Sparkles, Trash2, Users } from 'lucide-react';
import { Dot, Press, Row, cx, type DotColor } from '../../../components/ui2';
import { SwipeRow, type SwipeSide } from '../../../components/ui/SwipeRow';
import { whenText } from '../../../components/layout/Bell';
import type { Notice, NoticeKind } from '../../../hooks/useNotices';

// One line of the notices page (the prototype `shetyobinebebi`): a round mark by kind — solid while new, the pale tint
// after —, what it says (two lines at most), „who · when“ under it and a chevron. A message opens its chat; a piece of
// news or an admin's notice unfolds in place (the news' words, an admin's 🗑). Swiped aside either way: hidden for me.

const ICON: Record<NoticeKind, React.ReactNode> = {
  class: <Users strokeWidth={2} />,
  dm: <MessageCircle strokeWidth={2} />,
  news: <Sparkles strokeWidth={2} />,
  all: <Megaphone strokeWidth={2} />,
};

const SOLID: Record<NoticeKind, DotColor> = { class: 'wine', dm: 'wine', news: 'gold', all: 'sea' };

/** „ახლა“, „5 წთ წინ“, „3 სთ წინ“, „გუშინ“, „6 ნოე“ */
export const agoText = (at: number, now?: number) => {
  const w = whenText(at, now);
  return /(წთ|სთ)$/.test(w) ? `${w} წინ` : w;
};

/** the grey line's first part: who wrote it (and where — a class message: the writer's first name and the class) */
const whoOf = (n: Notice) => {
  if (n.kind === 'news') return 'აპის სიახლე';
  const first = n.who.trim().split(/\s+/)[0] || n.who;
  if (n.kind === 'class' && n.card) return `${first} · შენთვის`;
  if (n.kind === 'class' && n.cls) return `${first} · ${n.cls.name}`;
  return n.who;
};

export const NoticeRow: React.FC<{
  n: Notice;
  isNew: boolean;
  open: boolean;
  now?: number;
  /** an admin may take back a notice for everyone */
  canTakeBack: boolean;
  onTap: () => void;
  onHide: () => void;
  onTakeBack: () => void;
}> = ({ n, isNew, open, now, canTakeBack, onTap, onHide, onTakeBack }) => {
  // a message opens its chat; the rest unfold
  const unfolds = !n.chat;
  const gone: SwipeSide = {
    label: 'წაშლა', icon: <Trash2 className="size-5" />, tone: 'bg-danger text-white', leave: true, run: onHide,
  };
  // news shows its title; everything else what was written
  const title = n.kind === 'news' ? n.who : n.text;
  const wide = n.kind === 'all' && open;
  const extra = open && (n.kind === 'news' || (n.kind === 'all' && canTakeBack));
  return (
    <SwipeRow left={gone} right={gone} faceBg="bg-surf" className="rounded-none! [&>div]:rounded-none!">
      <Row
        lead={<Dot icon={ICON[n.kind]} color={isNew ? SOLID[n.kind] : 'tint'} />}
        title={
          <>
            {isNew && <span className="sr-only">ახალი: </span>}
            <span className={cx(wide ? 'whitespace-pre-line' : 'line-clamp-2')}>{title}</span>
          </>
        }
        sub={
          <span className="flex min-w-0">
            <span className="min-w-0 truncate">{whoOf(n)}</span>
            <span className="shrink-0 whitespace-nowrap">&nbsp;· {agoText(n.at, now)}</span>
          </span>
        }
        wrap
        right={
          <ChevronRight
            aria-hidden="true"
            strokeWidth={2}
            className={cx('size-[18px] shrink-0 text-mut transition-transform', unfolds && open && 'rotate-90')}
          />
        }
        aria-expanded={unfolds ? open : undefined}
        onClick={onTap}
      />
      {extra && (
        <div className="flex flex-col items-start gap-1 pr-4 pb-3 pl-[62px]">
          {n.kind === 'news' && <p className="text-body whitespace-pre-line text-ink wrap-break-word">{n.text}</p>}
          {n.kind === 'all' && canTakeBack && (
            <Press
              onClick={onTakeBack}
              className="-ml-3 inline-flex h-tap cursor-pointer items-center gap-1.5 rounded-full px-3 text-meta font-bold text-danger transition active:bg-danger/10 [&_svg]:size-4"
            >
              <Trash2 aria-hidden="true" strokeWidth={2} /> ყველასთვის წაშლა
            </Press>
          )}
        </div>
      )}
    </SwipeRow>
  );
};
