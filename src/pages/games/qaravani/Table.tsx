import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Play, Route, Undo2 } from 'lucide-react';
import { MAX_Q, MIN_Q, applyPick, cartsFor, newQaravani, parseQaravani, resultOf, type QGame } from '../../../utils/qaravani';
import { qSeat, qView } from '../../../utils/qaravaniRoom';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { QaravaniPlay } from './Play';
import { Animal, lineText } from './look';

// „ქარავანი“ on one phone (the hybrid): the phone goes from hand to hand round the table — the cards and the letters are secret,
// so between two players it shows only whose turn it is („მე ვარ …“ opens theirs). The phone keeps the decks, lays the open
// cards, turns the mountain's weather and counts every letter at the end, so nobody sorts 110 cards or counts the longest road.
// „უკან“ takes back a move that showed nothing new (a road, an inn, the letters kept at the start); ✕ only pauses.

const GAME_KEY = 'sg-qaravani-table';
const CONF_KEY = 'sg-qaravani-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseQaravani(load(GAME_KEY)); return g && g.phase.k !== 'end' ? g : null; };
/** who begins: a name from the list, or by lot (empty) */
const readFirst = () => { const v = load(CONF_KEY) as { first?: unknown } | null; return typeof v?.first === 'string' ? v.first : ''; };

/** who holds the phone now: at the deal the next one still choosing (from the first player on), else the one on turn */
const holderOf = (g: QGame) => {
  const ph = g.phase, n = g.players.length;
  if (ph.k === 'end') return -1;
  if (ph.k === 'start') {
    for (let k = 0; k < n; k++) { const s = (g.first + k) % n; if (!ph.kept[s]) return s; }
    return -1;
  }
  return g.turn;
};
/** a move may be taken back when it showed nothing new: no card or letter came out of a deck, the open cards stayed */
const canBack = (prev: QGame | undefined, g: QGame) => !!prev && g.phase.k !== 'end' && (prev.phase.k === 'turn' || prev.phase.k === 'start')
  && prev.deck.length === g.deck.length && prev.tdeck.length === g.tdeck.length && prev.face.join() === g.face.join();

export const QaravaniTable: React.FC = () => {
  const names = useCircleNames();
  const [game, setGame] = useState<QGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<QGame[]>([]);
  const [shown, setShown] = useState(-1);
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
    setShown(-1);
    setGame(g);
    setOpen(true);
  };
  const holder = game ? holderOf(game) : -1;
  const step = (pick: number) => {
    if (!game || holder < 0) return;
    const next = applyPick(game, holder, pick);
    if (next === game) return;
    setHist(h => [...h.slice(-40), game]);
    setGame(next);
  };
  const close = () => { setOpen(false); setShown(-1); if (game?.phase.k === 'end') setGame(null); };
  const again = () => {
    if (!game) return;
    const w = resultOf(game).order[0] ?? -1;
    const g = newQaravani({ names: game.players.map(p => p.name), first: (w + 1) % game.players.length, rnd: Math.random });
    if (!g) return;
    setHist([]);
    setShown(-1);
    setGame(g);
  };
  const online = useMemo(() => (game ? { g: game, uids: [], t0: 0 } : null), [game]);
  const view = useMemo(() => (online ? qView(online) : null), [online]);
  const seat = useMemo(() => (online && holder >= 0 ? qSeat(online, holder) : null), [online, holder]);

  if (open && game && view) {
    const prev = hist[hist.length - 1];
    const back = canBack(prev, game) ? (
      <button
        type="button"
        onClick={() => { triggerHaptic(8); setGame(prev); setHist(h => h.slice(0, -1)); setShown(holderOf(prev)); }}
        aria-label="უკან — ბოლო სვლის გაუქმება"
        title="უკან"
        className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"
      >
        <Undo2 className="w-5 h-5" />
      </button>
    ) : undefined;
    // between two players: only whose turn it is — and what the last one did
    if (holder >= 0 && shown !== holder) {
      const last = game.log.length ? lineText(game.log[game.log.length - 1], view.names, -1) : '';
      const deal = game.phase.k === 'start';
      return (
        <TableScreen
          title="ქარავანი"
          right={back}
          onClose={close}
          footer={(
            <Btn size="lg" full onClick={() => { triggerHaptic(15); setShown(holder); }} icon={<Eye />} className="!h-14 !text-[16px]">
              მე ვარ {view.names[holder]} — ვაჩვენო
            </Btn>
          )}
        >
          <div className="my-auto flex flex-col items-center text-center gap-4 py-8 [@media(max-height:500px)]:flex-row [@media(max-height:500px)]:justify-center [@media(max-height:500px)]:text-left [@media(max-height:500px)]:gap-6 [@media(max-height:500px)]:py-3">
            <Animal p={holder} size={92} />
            <div className="min-w-0 flex flex-col items-center gap-3 [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-2">
              <p className="text-[13px] font-bold text-[#75685a]">{deal ? 'წერილების არჩევა' : 'სვლა'}</p>
              <p className="font-serif-ge text-[26px] font-bold leading-tight text-[#2b1e14] [overflow-wrap:anywhere]">გადაეცი ტელეფონი: {view.names[holder]}</p>
              <p className="max-w-xs text-[13px] leading-snug text-[#75685a]">ბარათები და წერილები საიდუმლოა — სხვები ეკრანს ნუ უყურებენ.</p>
              {last && <p className="max-w-sm rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2.5 text-[13px] leading-snug text-[#4a3426]">{last}</p>}
            </div>
          </div>
        </TableScreen>
      );
    }
    return <QaravaniPlay v={view} seat={seat} me={holder} one right={back} acts={{ pick: step, again, close }} onHide={close} />;
  }

  const where = game && (game.phase.k === 'start' ? 'წერილების არჩევა' : game.players.map(p => `${p.name} ${p.pts}`).join(' · '));
  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{where}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setShown(-1); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames label="ქარავნები" hint="2–5 მოთამაშე (ან გუნდი) — სახელები იმ რიგით, როგორც სხედხართ." />
        <p className={`text-[12.5px] font-bold ${fitsN ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
          {n < MIN_Q ? `კიდევ ${MIN_Q - n} — საჭიროა ${MIN_Q}–${MAX_Q}` : n > MAX_Q ? `${MAX_Q}-ზე მეტია: ${n - MAX_Q} ზედმეტი` : `მზადაა: ${n} ქარავანი · თითოს ${cartsFor(n)} ურემი და 3 ქარვასლა`}
        </p>
        {fitsN && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#4a3426]">ვინ იწყებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!starter} onClick={() => setFirst('')}>წილისყრით</Chip>
              {names.map(x => <Chip key={x} on={starter === x} onClick={() => setFirst(x)}>{x}</Chip>)}
            </div>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ქაღალდის წესით იწყებს ის, ვისაც ყველაზე მეტი ქართული ქალაქი უნახავს.</p>
          </div>
        )}
        <Btn size="lg" full disabled={!fitsN} onClick={() => { void begin(); }} icon={<Route />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
      <Card className="!p-4">
        <p className="text-[13px] font-bold text-[#4a3426]">როგორ ვთამაშობთ</p>
        <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
          ტელეფონი ხელიდან ხელში გადადის: ვისი სვლაცაა, ის ხსნის თავის ბარათებს და წერილებს, იღებს ბარათს, იკავებს გზას რუკაზე,
          იღებს წერილებს ან აშენებს ქარვასლას. დასტას ტელეფონი ურევს, მთაში ამინდს ის ხსნის და ბოლოს ყველა წერილს და გრძელ გზას ის
          ითვლის. ამობეჭდილი რუკა მაგიდაზეც შეიძლება იდოს — ურმები მასზე დადგით, ქულები კი ტელეფონმა დაითვალოს.
        </p>
      </Card>
    </div>
  );
};
