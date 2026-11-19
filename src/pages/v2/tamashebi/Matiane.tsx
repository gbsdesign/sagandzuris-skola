import React, { useState } from 'react';
import { LogOut, RotateCcw, Trophy } from 'lucide-react';
import { TableScreen } from '../../../components/games/TableScreen';
import { Button, Card, Num, SectionLabel, cx } from '../../../components/ui2';
import { winLine } from '../../games/rounds/winLine';

// „თამაში დასრულდა · მატიანე“ — one end for the room games (board x-otakhi-matiane): who won (by points through rounds/winLine:
// nobody above 0 → „ამჯერად ქულა არავის აქვს“ and no trophy; a side's win in its own words), the places, the game's own count of
// the end, the game's chronicle in its own lines, then „კიდევ ერთხელ“ and „დახურვა“ at the bottom.

export interface MatianePlace { name: string; place: number; score?: React.ReactNode; me?: boolean }
export interface MatianeGroup { head?: React.ReactNode; lines: React.ReactNode[] }

/** competition places of an order already sorted by the game's rules: equal neighbours share a place */
export const placesFrom = <T,>(order: readonly T[], same: (a: T, b: T) => boolean): number[] => {
  const out: number[] = [];
  order.forEach((x, k) => { out.push(k > 0 && same(order[k - 1], x) ? out[k - 1] : k + 1); });
  return out;
};

const FOLD = 8;

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

  const footer = (again || close) && (
    <div className="flex flex-col gap-2">
      {again && <Button full icon={<RotateCcw strokeWidth={2} />} onClick={again}>კიდევ ერთხელ</Button>}
      {close && <Button full kind="ghost" icon={<LogOut strokeWidth={1.75} />} onClick={close.onClick}>{close.label}</Button>}
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
