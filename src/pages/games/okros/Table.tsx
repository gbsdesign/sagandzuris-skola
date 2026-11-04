import React, { useEffect, useState } from 'react';
import { Map as MapIcon, Play, Undo2 } from 'lucide-react';
import { MAX_OK, MIN_OK, applyPick, newOkros, parseOkros, rank, yearsFor, type OkrosGame } from '../../../utils/okrosKhana';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { OkrosPlay } from './Play';

// „ოქროს ხანა“ on one phone (the hybrid): nothing is secret, so the phone lies in the middle of the table (or goes round) and the
// house on turn rides and acts on it; the phone keeps the goods, the estates and the works' boxes, sends the king on every year
// and counts the points. The printed board may lie beside it, its riders moved by hand. „უკან“ takes back a move that showed
// nothing new (a ride, an estate, a share that did not finish a work); ✕ only pauses.

const GAME_KEY = 'sg-okros-table';
const CONF_KEY = 'sg-okros-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseOkros(load(GAME_KEY)); return g && g.phase.k !== 'end' ? g : null; };
/** who begins: a name from the list, or by lot (empty) */
const readFirst = () => { const v = load(CONF_KEY) as { first?: unknown } | null; return typeof v?.first === 'string' ? v.first : ''; };
/** a move may be taken back when it showed nothing new: no work came out, the king did not move */
const canBack = (prev: OkrosGame | undefined, g: OkrosGame) => !!prev && g.phase.k !== 'end' && prev.year === g.year && prev.deck.length === g.deck.length
  && prev.open.map(o => o.id).join() === g.open.map(o => o.id).join();

export const OkrosTable: React.FC = () => {
  const names = useCircleNames();
  const [game, setGame] = useState<OkrosGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<OkrosGame[]>([]);
  const [first, setFirstName] = useState(readFirst);
  useEffect(() => save(GAME_KEY, game && game.phase.k !== 'end' ? game : null), [game]);
  const n = names.length;
  const fitsN = n >= MIN_OK && n <= MAX_OK;
  const starter = names.includes(first) ? first : '';
  const setFirst = (v: string) => { setFirstName(v); save(CONF_KEY, { first: v }); };

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newOkros({ names, first: starter ? names.indexOf(starter) : undefined, rnd: Math.random });
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
    const w = rank(game).winners[0] ?? -1;
    const g = newOkros({ names: game.players.map(p => p.name), first: (w + 1) % game.players.length, rnd: Math.random });
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
    return <OkrosPlay g={game} me={-1} one right={back} acts={{ pick: step, again, close }} onHide={close} />;
  }

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · წელი {game.year}/{game.years}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{game.players.map(p => `${p.name} ${p.pts}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames label="სახლები" hint="2–4 მოთამაშე ან გუნდი — სახელები იმ რიგით, როგორც სხედხართ." />
        <p className={`text-[12.5px] font-bold ${fitsN ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
          {n < MIN_OK ? `კიდევ ${MIN_OK - n} — საჭიროა ${MIN_OK}–${MAX_OK}` : n > MAX_OK ? `${MAX_OK}-ზე მეტია: გუნდებად გაიყავით (${n - MAX_OK} ზედმეტი)` : `მზადაა: ${n} სახლი · ${yearsFor(n)} წელი · თითოს 5 მამული`}
        </p>
        {fitsN && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#4a3426]">ვინ იწყებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!starter} onClick={() => setFirst('')}>წილისყრით</Chip>
              {names.map(x => <Chip key={x} on={starter === x} onClick={() => setFirst(x)}>{x}</Chip>)}
            </div>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ქაღალდის წესით იწყებს ყველაზე ახალგაზრდა.</p>
          </div>
        )}
        <Btn size="lg" full disabled={!fitsN} onClick={() => { void begin(); }} icon={<MapIcon />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
      <Card className="!p-4">
        <p className="text-[13px] font-bold text-[#4a3426]">როგორ ვთამაშობთ</p>
        <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
          ტელეფონი მაგიდის შუაშია ან ხელიდან ხელში გადადის: ვისი სვლაცაა, ის ირჩევს კუთხეს და საქმეს. ნივთებს, მამულებს და საქმეების
          უჯრებს ტელეფონი ინახავს, ყოველ წელს მეფეს ის აგზავნის და ქულებს ის ითვლის. ამობეჭდილი რუკა მაგიდაზეც შეიძლება იდოს —
          მხედრები მასზე გადაადგილეთ.
        </p>
      </Card>
    </div>
  );
};
