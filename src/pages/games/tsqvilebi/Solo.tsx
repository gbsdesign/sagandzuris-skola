import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Timer, Trophy } from 'lucide-react';
import { tsqGroups } from '../../../data/tsqvilebiPool';
import {
  drawTsqvilebi, encodeResult, isClear, newBoard, tsqPoints, type TsqBoard, type TsqvilebiQ,
} from '../../../utils/tsqvilebi';
import { betterRun } from '../../../utils/soloRun';
import { tbilisiToday } from '../../../utils/hangi';
import { clock } from '../../../utils/amikhseni';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { useNow } from '../rounds/parts';
import { setSoloBest, useSoloBest } from '../rounds/soloStore';
import { Board, useBoardPlay } from './Board';
import { BoardLine, modeLine } from './face';
import { PairsList } from './Pairs';
import { TsqvilebiOptions } from './Options';
import { bestKey, modes, readSeen, rememberAsked, sizes, whats } from './store';

// „ხმის წყვილები“ alone: one board, as few moves as I can (a move is two cards); the clock runs from the first card. The record
// is kept on this phone for each size and way of pairing (rounds/soloStore.ts, `bestKey`): fewer moves first, then less time.
// At the end every pair with its ▶ — what each piece was.

interface Run { q: TsqvilebiQ; board: TsqBoard; t0: number | null; end: number | null; over: boolean; record: boolean; key: string }

const SoloGame: React.FC<{ run: Run; setRun: (f: (r: Run) => Run) => void; onClose: () => void; onAgain: () => void }> = ({ run, setRun, onClose, onAgain }) => {
  const best = useSoloBest(run.key);
  const { q, board } = run;
  const play = useBoardPlay({
    items: q.items, cards: q.cards, mode: q.mode, board,
    apply: b => {
      const t0 = run.t0 ?? Date.now();
      if (!isClear(b) || run.end) { setRun(r => ({ ...r, board: b, t0: r.t0 ?? t0 })); return; }
      // the whole board: the clock stops, the record is kept
      const end = Date.now();
      const score = tsqPoints(q, encodeResult(b.pairs, b.moves));
      const record = betterRun({ score, ms: end - t0 }, best);
      if (record) setSoloBest(run.key, { score, right: b.moves, ms: end - t0, at: tbilisiToday() });
      setRun(r => ({ ...r, board: b, t0, end, record }));
    },
  });
  // the last pair is seen turning before the end shows
  useEffect(() => {
    if (!run.end || run.over) return;
    const t = window.setTimeout(() => setRun(r => ({ ...r, over: true })), 1000);
    return () => window.clearTimeout(t);
  }, [run.end, run.over, setRun]);
  const now = useNow(!!run.t0 && !run.end);
  const secs = run.t0 ? Math.floor(((run.end ?? now) - run.t0) / 1000) : 0;

  if (run.over) {
    return (
      <TableScreen
        title="ხმის წყვილები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ხელახლა</Btn>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[28px] font-bold tabular-nums text-[#4a3426]">{board.moves} სვლა</p>
            <Hint>მთელი დაფა · {q.cards.length} ბარათი · {clock(secs)}{board.moves === q.items.length ? ' · ერთი შეცდომაც არა!' : ''}</Hint>
            {run.record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]">ახალი რეკორდი!</p>}
            {!run.record && best && <p className="mt-2 text-[13px] font-bold text-[#8a6d12]">რეკორდი: {best.right} სვლა · {clock(Math.floor(best.ms / 1000))}</p>}
          </div>
          <PairsList items={q.items} />
        </div>
      </TableScreen>
    );
  }

  return (
    <TableScreen title="ხმის წყვილები" onClose={onClose}>
      <div className="py-2 space-y-3">
        <BoardLine board={board} pairs={q.items.length}>
          <span className="inline-flex items-center gap-1 text-[#75685a]"><Timer className="w-4 h-4" />{clock(secs)}</span>
        </BoardLine>
        <Board items={q.items} cards={q.cards} mode={q.mode} board={board} play={play} />
        <Hint className="text-center">{board.moves === 0 && !board.open.length ? modeLine(q.mode) : best ? `რეკორდი: ${best.right} სვლა` : 'ხმიან ბარათზე ხელახლა დაჭერა ხმას ისევ რთავს.'}</Hint>
      </div>
    </TableScreen>
  );
};

export const TsqvilebiSolo: React.FC = () => {
  const size = sizes.use();
  const mode = modes.use();
  const best = useSoloBest(bestKey(size, mode));
  const [run, setRunState] = useState<Run | null>(null);
  const [empty, setEmpty] = useState(false);
  const setRun = React.useCallback((f: (r: Run) => Run) => setRunState(r => (r ? f(r) : r)), []);

  const start = () => {
    const pairs = sizes.read() / 2;
    const m = modes.read();
    const [q] = drawTsqvilebi({ groups: tsqGroups(whats.read()), count: 1, pairs, mode: m, seen: readSeen() });
    if (!q) { setEmpty(true); return; }
    setEmpty(false);
    rememberAsked(q.items.map(it => it.id));
    setRunState({ q, board: newBoard(q.cards.length), t0: null, end: null, over: false, record: false, key: bestKey(q.cards.length, m) });
  };

  if (run) return <SoloGame key={run.q.id + run.key} run={run} setRun={setRun} onClose={() => setRunState(null)} onAgain={start} />;

  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="font-serif-ge text-[18px] font-bold text-[#4a3426]">რამდენი სვლით გაასუფთავებ დაფას?</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
          შენ მარტო: ბარათები პირქვე აწყვია, ყოველ სვლაზე ორს ხსნი. ხმიანი ბარათი უკრავს — ცნობილი საგალობლის ან სიმღერის დასაწყისს; მისი წყვილი მისი სახელია (ან, ადვილად, იგივე ხმა). რაც ნაკლები სვლა, მით უკეთესი — რეკორდი ამ ტელეფონზე ინახება, ყოველი ზომისთვის ცალკე.
        </p>
      </div>
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Timer className="w-4 h-4 shrink-0" />შენი რეკორდი ({size} ბარათი): {best.right} სვლა · {clock(Math.floor(best.ms / 1000))}
        </p>
      )}
      <TsqvilebiOptions />
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold text-amber-900">ხმები ვერ მოიძებნა.</p>}
      <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
    </Card>
  );
};
