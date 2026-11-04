import React, { useEffect, useState } from 'react';
import { Play, Route, Undo2 } from 'lucide-react';
import { INNS, MAX_Q, MIN_Q, applyPick, cartsFor, newQaravani, parseQaravani, resultOf, roundsFor, scoreOf, type QGame } from '../../../utils/qaravani';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { QaravaniPlay } from './Play';

// „ქარავანი“ on one phone (the hybrid): nothing is secret, so the phone lies in the middle of the table (or goes round); it rolls
// the dice for the house on turn, keeps the roads, the abazi and the caravanserais, and counts every city and cargo at the end. The
// printed board may lie beside it, its carts laid by hand. „უკან“ takes back a move that rolled nothing new (an abazi on a die, a
// caravanserai, a start town before the last); ✕ only pauses.

const GAME_KEY = 'sg-qaravani-table';
const CONF_KEY = 'sg-qaravani-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseQaravani(load(GAME_KEY)); return g && g.phase.k !== 'end' ? g : null; };
/** who begins: a name from the list, or by lot (empty) */
const readFirst = () => { const v = load(CONF_KEY) as { first?: unknown } | null; return typeof v?.first === 'string' ? v.first : ''; };
/** a move may be taken back when the dice did not fall anew (the dice are the game's seed: a new roll would be known) */
const canBack = (prev: QGame | undefined, g: QGame) => !!prev && g.phase.k !== 'end' && prev.seed === g.seed;

export const QaravaniTable: React.FC = () => {
  const names = useCircleNames();
  const [game, setGame] = useState<QGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<QGame[]>([]);
  const [first, setFirstName] = useState(readFirst);
  useEffect(() => save(GAME_KEY, game && game.phase.k !== 'end' ? game : null), [game]);
  const n = names.length;
  const fitsN = n >= MIN_Q && n <= MAX_Q;
  const starter = names.includes(first) ? first : '';
  const setFirst = (v: string) => { setFirstName(v); save(CONF_KEY, { first: v }); };

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newQaravani({ names, first: starter ? names.indexOf(starter) : undefined, rnd: Math.random });
    if (!g) return;
    triggerHaptic(20);
    setHist([]);
    setGame(g);
    setOpen(true);
  };
  const step = (pick: number) => {
    if (!game) return;
    const next = applyPick(game, game.turn, pick);
    if (next === game) return;
    setHist(h => [...h.slice(-60), game]);
    setGame(next);
  };
  const close = () => { setOpen(false); if (game?.phase.k === 'end') setGame(null); };
  const again = () => {
    if (!game) return;
    const w = resultOf(game).winners[0] ?? -1;
    const g = newQaravani({ names: game.players.map(p => p.name), first: (w + 1) % game.players.length, rnd: Math.random });
    if (!g) return;
    setHist([]);
    setGame(g);
  };

  if (open && game) {
    const prev = hist[hist.length - 1];
    const back = canBack(prev, game) ? (
      <button type="button" onClick={() => { triggerHaptic(8); setGame(prev); setHist(h => h.slice(0, -1)); }} aria-label="უკან — ბოლო სვლის გაუქმება" title="უკან" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
        <Undo2 className="w-5 h-5" />
      </button>
    ) : undefined;
    return <QaravaniPlay g={game} me={-1} one right={back} acts={{ pick: step, again, close }} onHide={close} />;
  }

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · {game.phase.k === 'start' ? 'ქარვასლების დადგმა' : `მოგზაურობა ${game.round}/${roundsFor(game.players.length)}`}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{(() => { const rows = scoreOf(game.owner, game.inn, game.players.length); return game.players.map((p, i) => `${p.name} ${rows[i].total}`).join(' · '); })()}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames label="ქარავნები" hint="2–5 მოთამაშე ან გუნდი — სახელები იმ რიგით, როგორც სხედხართ." />
        <p className={`text-[12.5px] font-bold ${fitsN ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
          {n < MIN_Q ? `კიდევ ${MIN_Q - n} — საჭიროა ${MIN_Q}–${MAX_Q}` : n > MAX_Q ? `${MAX_Q}-ზე მეტია: გუნდებად გაიყავით (${n - MAX_Q} ზედმეტი)` : `მზადაა: ${n} ქარავანი · ${roundsFor(n)} მოგზაურობა · თითოს ${cartsFor(n)} ურემი და ${INNS} ქარვასლა`}
        </p>
        {fitsN && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#4a3426]">ვინ იწყებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!starter} onClick={() => setFirst('')}>წილისყრით</Chip>
              {names.map(x => <Chip key={x} on={starter === x} onClick={() => setFirst(x)}>{x}</Chip>)}
            </div>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ქაღალდის წესით იწყებს ყველაზე ახალგაზრდა. პირველ ქარვასლებს უკუღმა დგამენ: პირველი მოთამაშე — ბოლოს.</p>
          </div>
        )}
        <Btn size="lg" full disabled={!fitsN} onClick={() => { void begin(); }} icon={<Route />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
    </div>
  );
};
