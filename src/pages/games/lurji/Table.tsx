import React, { useEffect, useState } from 'react';
import { LayoutGrid, Play, Undo2 } from 'lucide-react';
import { MAX_LURJI, MIN_LURJI, dawn, newLurji, parseLurji, take, traysFor, winnersOf, type LurjiGame } from '../../../utils/lurjiSupra';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { LurjiPlay } from './Play';

// „ლურჯი სუფრა“ on one phone (the hybrid): the phone goes from hand to hand round the table — or lies in the middle — and the
// one on turn takes on it; the phone lays the trays every morning, prints every evening and counts the praise, so nobody
// cuts out a stamp or counts a chain. „უკან“ takes the last take back; the game is kept on the device (✕ only pauses).

const GAME_KEY = 'sg-lurji-table';
const CONF_KEY = 'sg-lurji-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseLurji(load(GAME_KEY)); return g && g.phase.k !== 'end' ? g : null; };
/** who begins: a name from the list, or by lot (empty) */
const readFirst = () => { const v = load(CONF_KEY) as { first?: unknown } | null; return typeof v?.first === 'string' ? v.first : ''; };

export const LurjiTable: React.FC = () => {
  const names = useCircleNames();
  const [game, setGame] = useState<LurjiGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<LurjiGame[]>([]);
  const [first, setFirstName] = useState(readFirst);
  useEffect(() => save(GAME_KEY, game && game.phase.k !== 'end' ? game : null), [game]);
  const n = names.length;
  const fitsN = n >= MIN_LURJI && n <= MAX_LURJI;
  const starter = names.includes(first) ? first : '';
  const setFirst = (v: string) => { setFirstName(v); save(CONF_KEY, { first: v }); };

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newLurji({ names, first: starter ? names.indexOf(starter) : undefined, rnd: Math.random });
    if (!g) return;
    triggerHaptic(20);
    setHist([]);
    setGame(g);
    setOpen(true);
  };
  const step = (next: LurjiGame) => { if (!game || next === game) return; setHist(h => [...h.slice(-60), game]); setGame(next); };
  const close = () => { setOpen(false); if (game?.phase.k === 'end') setGame(null); };
  const again = () => {
    if (!game) return;
    const w = winnersOf(game)[0] ?? -1;
    const g = newLurji({ names: game.names, first: (w + 1) % game.names.length, rnd: Math.random });
    if (!g) return;
    setHist([]);
    setGame(g);
  };

  if (open && game) {
    const prev = hist[hist.length - 1];
    // a take may be taken back while its day goes on (never the morning's draw)
    const canBack = !!prev && game.phase.k === 'take' && prev.day === game.day && prev.phase.k === 'take';
    const back = canBack ? (
      <button type="button" onClick={() => { triggerHaptic(8); setGame(prev); setHist(h => h.slice(0, -1)); }} aria-label="უკან — ბოლო სვლის გაუქმება" title="უკან" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#1f3a5f] hover:bg-[#1f3a5f]/[0.07] cursor-pointer">
        <Undo2 className="w-5 h-5" />
      </button>
    ) : undefined;
    return (
      <LurjiPlay
        g={game}
        me={-1}
        one
        right={back}
        acts={{
          take: (src, o, line) => step(take(game, src, o, line)),
          next: () => { triggerHaptic(10); setHist([]); step(dawn(game)); },
          again,
          close,
        }}
        onHide={close}
      />
    );
  }

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · დღე {game.day}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{game.names.map((x, i) => `${x} ${game.boards[i].score}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames label="მოთამაშეები" hint="ჩაწერე, ვინ ზის მაგიდასთან — რიგით, საათის ისრის მიმართულებით. გუნდებიც შეიძლება." />
        <p className={`text-[12.5px] leading-snug ${fitsN ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
          {n < MIN_LURJI ? `საჭიროა ${MIN_LURJI}–${MAX_LURJI} მოთამაშე ან გუნდი — კიდევ ${MIN_LURJI - n}.`
            : n > MAX_LURJI ? `${MAX_LURJI}-ზე მეტი: გუნდებად გაიყავით — აქ ${n - MAX_LURJI} სახელი მოაკელი.`
            : `${n} მოთამაშე · ${traysFor(n)} ლანგარი.`}
        </p>
        {fitsN && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#4a3426]">ვინ იწყებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!starter} onClick={() => setFirst('')}>წილისყრით</Chip>
              {names.map(x => <Chip key={x} on={starter === x} onClick={() => setFirst(x)}>{x}</Chip>)}
            </div>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">წესით იწყებს, ვისაც ბოლოს უნახავს ნამდვილი ლურჯი სუფრა.</p>
          </div>
        )}
        <Btn size="lg" full disabled={!fitsN} onClick={() => { void begin(); }} icon={<LayoutGrid />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
      <Card className="!p-4">
        <p className="text-[13px] font-bold text-[#4a3426]">როგორ ვთამაშობთ</p>
        <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
          ტელეფონი ხელიდან ხელში გადადის ან მაგიდის შუაშია: ვისი სვლაცაა, ის ირჩევს ბეჭდებს და ზოლს. ლანგრებს ტელეფონი ავსებს, საღამოს თვითონ ბეჭდავს და ქებას ითვლის. დაბეჭდილი ნაკრები არ გჭირდებათ — ან მისი დაფები გვერდზე დადეთ და იქაც აწყვეთ.
        </p>
      </Card>
    </div>
  );
};
