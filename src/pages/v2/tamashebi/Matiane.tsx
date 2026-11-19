import React, { useState } from 'react';
import { Check, LogOut, RotateCcw, Send, Trophy } from 'lucide-react';
import { TableScreen } from '../../../components/games/TableScreen';
import { Button, Card, Num, SectionLabel, cx } from '../../../components/ui2';
import { winLine } from '../../games/rounds/winLine';
import { useAuth } from '../../../context';
import { useMine } from '../../../components/games/useMine';
import { useVisibleRoomClass } from '../../../utils/gameRoomFirestore';
import { classChatBase, sendTextMessage, type ChatAuthor } from '../../../hooks/useClassChat';

// „თამაში დასრულდა · მატიანე“ — one end for the room games (board x-otakhi-matiane): who won (by points through rounds/winLine:
// nobody above 0 → „ამჯერად ქულა არავის აქვს“ and no trophy; a side's win in its own words), the places, the game's own count of
// the end, the game's chronicle in its own lines, then „კიდევ ერთხელ“ and „დახურვა“ at the bottom. A room of a class the
// person is in also gets „მატიანე კლასის ჩატში“: the end in short words (the winner, the places, the chronicle's last lines) as
// an ordinary text message from the person; „დახურვა“ then steps down to a quiet text button.

export interface MatianePlace { name: string; place: number; score?: React.ReactNode; me?: boolean }
export interface MatianeGroup { head?: React.ReactNode; lines: React.ReactNode[] }

/** competition places of an order already sorted by the game's rules: equal neighbours share a place */
export const placesFrom = <T,>(order: readonly T[], same: (a: T, b: T) => boolean): number[] => {
  const out: number[] = [];
  order.forEach((x, k) => { out.push(k > 0 && same(order[k - 1], x) ? out[k - 1] : k + 1); });
  return out;
};

const FOLD = 8;

/** a node's words (a chronicle line, a score) as plain text */
const textOf = (n: React.ReactNode): string => {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (React.isValidElement(n)) return textOf((n.props as { children?: React.ReactNode }).children);
  return '';
};
const oneLine = (t: string) => t.replace(/\s+/g, ' ').trim();
// a line said to the phone's own player („შენ…“) reads wrong in the class's chat, so it is left out there
const SAID_TO_ME = /(^|[\s„(])შენ/;

/** the end in short words for the class's chat */
export const matianeText = (o: {
  game: string; label: string | null; title: React.ReactNode; places?: MatianePlace[]; chronicle?: MatianeGroup[];
}): string => {
  const out = [`📜 „${o.game}“ — მატიანე`];
  let head = oneLine(textOf(o.title));
  let label = o.label;
  // „შენ მოიგე“ is this phone's word: the chat names the first places instead
  if (SAID_TO_ME.test(head)) {
    const first = (o.places ?? []).filter(p => p.place === 1).map(p => oneLine(p.name));
    head = first.join(', ');
    label = first.length > 1 ? 'გაიმარჯვეს' : 'გაიმარჯვა';
  }
  if (head) out.push(label ? `${label}: ${head}` : head);
  (o.places ?? []).slice(0, 8).forEach(p => {
    const score = oneLine(textOf(p.score));
    out.push(`${p.place}. ${oneLine(p.name)}${score ? ` · ${score}` : ''}`);
  });
  const lines = (o.chronicle ?? []).flatMap(g => g.lines.map(l => oneLine(textOf(l)))).filter(l => l && !SAID_TO_ME.test(l));
  if (lines.length) out.push('', ...lines.slice(-4));
  // a chat message holds at most 2000 letters (firestore.rules)
  return out.join('\n').slice(0, 2000);
};

/** „მატიანე კლასის ჩატში“: shown only on a room of a class the person is in */
const useChronicleSend = (text: () => string) => {
  const { user, isAdmin } = useAuth();
  const classId = useVisibleRoomClass();
  const { classes } = useMine();
  const cls = classId ? classes.find(c => c.id === classId) : undefined;
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  if (!user || !cls) return null;
  const send = async () => {
    const uid = user.uid;
    const p = cls.members.find(m => m.uid === uid) || cls.teachers.find(m => m.uid === uid);
    const author: ChatAuthor = {
      uid, name: p?.name || user.displayName || 'მგალობელი', photoURL: p?.photoURL || user.photoURL || '',
      teacher: isAdmin || cls.teachers.some(t => t.uid === uid),
    };
    setState('sending');
    try { await sendTextMessage(classChatBase(cls.id), author, text()); setState('sent'); } catch { setState('error'); }
  };
  return { state, send, name: cls.name };
};

export const Matiane: React.FC<{
  /** the game's name, under the screen's title */
  game: string;
  onClose: () => void;
  right?: React.ReactNode;
  /** a win by points: the winners' names and the best score */
  win?: { winners: string[]; top: number };
  /** a side's win (no points): its label and words */
  side?: { label: string; title: React.ReactNode };
  /** what decided it, or the game's last word */
  why?: React.ReactNode;
  places?: MatianePlace[];
  /** the game's own count of the end, under its label */
  extra?: React.ReactNode;
  extraLabel?: string;
  chronicle?: MatianeGroup[];
  /** under the chronicle: the game's last words */
  after?: React.ReactNode;
  again?: () => void;
  close?: { label: string; onClick: () => void };
}> = ({ game, onClose, right, win, side, why, places, extra, extraLabel, chronicle, after, again, close }) => {
  const [all, setAll] = useState(false);
  const nobody = !!win && win.top <= 0;
  const title = side ? side.title : win ? winLine(win.winners, win.top, n => n) : null;
  const label = side ? side.label : win && !nobody && win.winners.length === 1 ? 'გაიმარჯვა' : null;
  const lines = (chronicle ?? []).reduce((n, g) => n + g.lines.length, 0);
  // folded: only the last lines of the last groups
  let budget = all ? Infinity : FOLD;
  const shown = (chronicle ?? []).slice().reverse().map(g => {
    const take = Math.max(0, Math.min(g.lines.length, budget));
    budget -= take;
    return { head: g.head, lines: g.lines.slice(g.lines.length - take) };
  }).reverse().filter(g => g.lines.length > 0);

  const chat = useChronicleSend(() => matianeText({ game, label, title, places, chronicle }));

  const footer = (again || close || chat) && (
    <div className="flex flex-col gap-2">
      {again && <Button full icon={<RotateCcw strokeWidth={2} />} onClick={again}>კიდევ ერთხელ</Button>}
      {chat && (
        <Button full kind="ghost" disabled={chat.state === 'sending' || chat.state === 'sent'}
          icon={chat.state === 'sent' ? <Check strokeWidth={2} /> : <Send strokeWidth={1.75} />} onClick={() => void chat.send()}>
          {chat.state === 'sent' ? `გაიგზავნა „${chat.name}“-ის ჩატში` : chat.state === 'sending' ? 'იგზავნება…' : 'მატიანე კლასის ჩატში'}
        </Button>
      )}
      {chat?.state === 'error' && <p role="alert" className="px-1.5 text-center text-meta font-semibold text-danger">ვერ გაიგზავნა — სცადე ხელახლა.</p>}
      {close && <Button full kind={chat ? 'quiet' : 'ghost'} icon={<LogOut strokeWidth={1.75} />} onClick={close.onClick}>{close.label}</Button>}
    </div>
  );

  return (
    <TableScreen title="თამაში დასრულდა" sub={`${game} · მატიანე`} right={right} onClose={onClose} footer={footer || undefined}>
      <div className="flex flex-col gap-3 py-1">
        {title !== null && (
          <Card className="flex items-center gap-3.5" aria-label="გამარჯვებული">
            {!nobody && (
              <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-6">
                <Trophy strokeWidth={1.75} />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              {label && <span className="text-meta text-mut">{label}</span>}
              <span className={cx('leading-tight font-bold wrap-break-word', side ? 'text-head' : 'text-title')}>{title}</span>
              {why && <span className="mt-1 text-meta leading-snug text-mut wrap-break-word">{why}</span>}
            </span>
          </Card>
        )}

        {places && places.length > 0 && (
          <ol className="flex shrink-0 flex-col divide-y divide-line overflow-hidden rounded-card bg-surf">
            {places.map((p, i) => (
              <li key={i} className={cx('flex min-h-14 items-center gap-3 py-2 pr-4 pl-4', p.me && 'bg-tint')}>
                <Num n={p.place} on={p.place === 1 && !nobody} />
                <span className="min-w-0 flex-1 text-lead leading-tight font-bold wrap-break-word">
                  {p.name}{p.me && <span className="ml-1 text-meta font-semibold text-wine">· შენ</span>}
                </span>
                {p.score !== undefined && <span className="shrink-0 text-meta font-bold whitespace-nowrap tabular-nums">{p.score}</span>}
              </li>
            ))}
          </ol>
        )}

        {extra && (
          <>
            {extraLabel && <SectionLabel label={extraLabel} />}
            {extra}
          </>
        )}

        {lines > 0 && (
          <>
            <SectionLabel label="მატიანე" />
            <Card className="flex flex-col gap-2">
              {shown.map((g, k) => (
                <div key={k} className="flex flex-col gap-1">
                  {g.head && <p className="text-meta font-bold text-wine">{g.head}</p>}
                  <ul className="flex flex-col gap-1">
                    {g.lines.map((l, j) => <li key={j} className="text-body leading-snug wrap-break-word">{l}</li>)}
                  </ul>
                </div>
              ))}
              {lines > FOLD && (
                <Button kind="quiet" size="md" className="self-start" onClick={() => setAll(a => !a)}>
                  {all ? 'ნაკლები' : `მთელი მატიანე · ${lines}`}
                </Button>
              )}
            </Card>
          </>
        )}
        {after}
      </div>
    </TableScreen>
  );
};
