import React from 'react';
import {
  ALargeSmall, ArrowRight, Bell, BellOff, BookOpen, CalendarDays, Camera, ChevronsDown, Church, CircleCheck, ClipboardList,
  CloudDownload, Download, Gauge, Gem, GraduationCap, LayoutGrid, ListMusic, ListPlus, LogIn, MessageCircle, Mic, Moon, Music,
  Phone, Route, ScrollText, Share2, Shirt, Sun, SunMoon, Trash2, Type, UserRound, Users, Volume2, ZoomIn,
} from 'lucide-react';
import { Button, cx, Dot, FOCUS, Num, Press, Row, Rows } from '../../../components/ui2';
import { MK_ANSWERS, MK_TEXT, MK_TOPICS, mkAnswer, type MkAnswer, type MkTopicId } from '../../../data/mkitkhe';

// The pieces both „მკითხე“ (boards x-ultra-mkitkhe-1…5) and a page's „?“ (x-idea-adgilze-0…2) draw.

/** each answer's round mark (the boards' own where they show one) */
const ICON: Record<number, React.ReactNode> = {
  1: <Music />, 2: <Volume2 />, 3: <GraduationCap />, 4: <Mic />, 5: <CloudDownload />, 6: <Gauge />, 7: <ZoomIn />, 8: <Share2 />,
  9: <Church />, 10: <Users />, 11: <ListMusic />, 12: <CalendarDays />, 13: <MessageCircle />, 14: <Phone />, 15: <Mic />,
  16: <ClipboardList />, 17: <ScrollText />, 18: <Sun />, 19: <ALargeSmall />, 20: <Moon />, 21: <ChevronsDown />, 22: <BookOpen />,
  23: <CalendarDays />, 24: <Route />, 25: <CircleCheck />, 26: <ListPlus />, 27: <Gem />, 28: <Gem />, 29: <Shirt />, 30: <Bell />,
  31: <BellOff />, 32: <ALargeSmall />, 33: <SunMoon />, 34: <Type />, 35: <Download />, 36: <LayoutGrid />, 37: <CalendarDays />,
  38: <Camera />, 39: <LogIn />, 40: <Trash2 />,
};
export const answerIcon = (id: number) => ICON[id] ?? <Music />;

export const TOPIC_ICON: Record<MkTopicId, React.ReactNode> = {
  1: <Music />, 2: <Users />, 3: <BookOpen />, 4: <CircleCheck />, 5: <UserRound />,
};

/** a question as a row: its mark, its words, „›“ */
export const QuestionRows: React.FC<{ ids: number[]; onPick: (id: number) => void; label?: string }> = ({ ids, onPick, label }) => (
  <Rows aria-label={label}>
    {ids.map(id => {
      const a = mkAnswer(id);
      return a ? <Row key={id} lead={<Dot icon={answerIcon(id)} />} title={a.question} wrap onClick={() => onPick(id)} /> : null;
    })}
  </Rows>
);

/** the five topics with how many answers each holds (board -5) */
export const TopicRows: React.FC<{ onPick: (t: MkTopicId) => void }> = ({ onPick }) => (
  <Rows>
    {MK_TOPICS.map(t => (
      <Row key={t.id} lead={<Dot icon={TOPIC_ICON[t.id]} />} title={t.title}
        sub={`${MK_ANSWERS.filter(a => a.topic === t.id).length} პასუხი`} onClick={() => onPick(t.id)} />
    ))}
  </Rows>
);

/** white pills that wrap onto more lines (the boards' 40px pill inside a 44px finger area) */
export const Pills: React.FC<{ items: { key: string | number; label: string; onClick: () => void }[]; label?: string }> = ({ items, label }) => (
  <div role="group" aria-label={label} className="flex shrink-0 flex-wrap gap-x-2 gap-y-1">
    {items.map(it => (
      <Press key={it.key} onClick={it.onClick} className="group flex min-h-tap max-w-full min-w-0 shrink-0 cursor-pointer items-center rounded-full text-left focus-visible:outline-none">
        {/* a long question wraps onto a second line (never cut, never smaller) */}
        <span className={cx(
          'flex min-h-10 max-w-full min-w-0 items-center rounded-tile bg-surf px-4 py-2 text-body leading-snug font-semibold text-ink transition group-active:scale-[0.97]',
          'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
        )}>
          <span className="min-w-0 wrap-break-word">{it.label}</span>
        </span>
      </Press>
    ))}
  </div>
);

/** An answer's words: numbered steps (`steps`: wine numbers in a white card, as the „?“ shows them; else the chat's grey
 *  numbers), or one paragraph when the sentences explain rather than lead. */
export const AnswerBody: React.FC<{ a: MkAnswer; tone: 'chat' | 'sheet' }> = ({ a, tone }) => {
  if (a.plain || a.answer.length === 1) {
    return <p className={cx('wrap-break-word', tone === 'sheet' ? 'text-lead leading-normal' : 'text-body leading-normal')}>{a.answer.join(' ')}</p>;
  }
  return (
    <ol className={cx('flex flex-col', tone === 'sheet' ? 'gap-0' : 'gap-2.5')}>
      {a.answer.map((s, i) => (
        <li key={i} className={cx('flex items-start gap-3', tone === 'sheet' && 'py-[9px]')}>
          <Num n={i + 1} on={tone === 'sheet'} />
          <span className={cx('min-w-0 flex-1 pt-1 wrap-break-word', tone === 'sheet' ? 'text-lead leading-normal' : 'text-body leading-snug font-semibold')}>{s}</span>
        </li>
      ))}
    </ol>
  );
};

/** „გადამიყვანე იქ“ — the one button under every answer */
export const GoButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label = MK_TEXT.go }) => (
  <Button size="md" full icon={<ArrowRight strokeWidth={2} />} onClick={onClick}>{label}</Button>
);

/** the person's own question, right */
export const MyBubble: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="max-w-[78%] shrink-0 self-end rounded-tile rounded-br-chip bg-wine px-3.5 py-2.5 text-body leading-snug text-white wrap-break-word">
    {children}
  </div>
);

/** the helper's reply, left */
export const ReplyBubble: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx('flex max-w-[88%] shrink-0 flex-col gap-2.5 self-start rounded-tile rounded-bl-chip bg-surf px-4 py-3.5', className)}>
    {children}
  </div>
);

/** the board's quiet link-like word button */
export const QuietButton: React.FC<{ onClick: () => void; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  onClick, icon, children, className,
}) => (
  <Press onClick={onClick}
    className={cx('flex h-tap shrink-0 cursor-pointer items-center gap-2 self-start rounded-full px-1.5 text-body font-semibold text-wine [&_svg]:size-[18px]', FOCUS, className)}>
    {icon}
    {children}
  </Press>
);
