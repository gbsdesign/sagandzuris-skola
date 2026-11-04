import React, { useEffect, useState } from 'react';
import { Crown, Play, Undo2 } from 'lucide-react';
import { CAPITALS, ROUNDS, SIDES, applyPick, newTakhti, parseTakhti, scoreOf, winnersOf, type TakhtiGame } from '../../../utils/oriTakhti';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, FIELD, Label, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { TakhtiPlay } from './Play';
import { ThroneMark } from './look';

// „ორი ტახტი“ on one phone (the hybrid): the phone lies between the two kings and the one on turn touches it — it turns the
// gifts up, keeps both courts and counts them, so nobody sorts cards. „უკან“ takes the last move back while the meeting goes
// on (a new meeting has turned new cards up); the game is kept on the device (✕ only pauses).

const GAME_KEY = 'sg-takhti-table';
const CONF_KEY = 'sg-takhti-conf';
const NAME_MAX = 24;
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseTakhti(load(GAME_KEY)); return g && g.phase.k !== 'end' && g.deck.length ? g : null; };
interface Conf { names: [string, string]; first: number }
const readConf = (): Conf => {
  const v = load(CONF_KEY) as Partial<Conf> | null;
  const names = Array.isArray(v?.names) ? v.names.map(n => (typeof n === 'string' ? n.slice(0, NAME_MAX) : '')) : [];
  return { names: [names[0] ?? '', names[1] ?? ''], first: v?.first === 0 || v?.first === 1 ? v.first : -1 };
};

/** a move may be taken back while its meeting goes on (the next meeting's cards are already seen) */
const canBack = (prev: TakhtiGame | undefined, g: TakhtiGame) => !!prev && g.phase.k !== 'end' && prev.round === g.round;

export const TakhtiTable: React.FC = () => {
  const [game, setGame] = useState<TakhtiGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<TakhtiGame[]>([]);
  const [conf, setConfState] = useState<Conf>(readConf);
  useEffect(() => save(GAME_KEY, game && game.phase.k !== 'end' ? game : null), [game]);
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const names = conf.names.map((n, i) => n.trim() || SIDES[i]);
  const sameNames = names[0] === names[1];

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newTakhti({ names, first: conf.first >= 0 ? conf.first : undefined, rnd: Math.random });
    if (!g) return;
    triggerHaptic(20);
    setHist([]);
    setGame(g);
    setOpen(true);
  };
  const step = (n: number) => {
    if (!game) return;
    const next = applyPick(game, n);
    if (next === game) return;
    setHist(h => [...h.slice(-20), game]);
    setGame(next);
  };
  const close = () => { setOpen(false); if (game?.phase.k === 'end') setGame(null); };
  // the loser divides first next time (a shared throne: by lot)
  const again = () => {
    if (!game) return;
    const w = winnersOf(game);
    const g = newTakhti({ names: game.names, first: w.length === 1 ? 1 - w[0] : undefined, rnd: Math.random });
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
    return <TakhtiPlay g={game} me={-1} one right={back} acts={{ pick: step, again, close }} onHide={close} />;
  }

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · შეხვედრა {Math.min(game.round + 1, ROUNDS)} / {ROUNDS}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">{game.names.map((x, i) => `${x} ${scoreOf(game.courts, i).total}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map(i => (
            <div key={i}>
              <Label htmlFor={`takhti-name-${i}`}>
                <span className="inline-flex items-center gap-1.5"><ThroneMark side={i} size={20} />{SIDES[i]} · {CAPITALS[i]}</span>
              </Label>
              <input
                id={`takhti-name-${i}`}
                value={conf.names[i]}
                onChange={e => { const n: [string, string] = [...conf.names]; n[i] = e.target.value.slice(0, NAME_MAX); setConf({ ...conf, names: n }); }}
                placeholder={SIDES[i]}
                maxLength={NAME_MAX}
                autoComplete="off"
                className={FIELD}
              />
            </div>
          ))}
        </div>
        {sameNames && <p className="text-[12.5px] font-bold text-[#9a6a10]">ორ მეფეს ერთი სახელი აქვს — ერთ-ერთს სხვა დაარქვი.</p>}
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#4a3426]">ვინ ყოფს პირველად?</p>
          <div className="flex flex-wrap gap-2">
            <Chip on={conf.first < 0} onClick={() => setConf({ ...conf, first: -1 })}>წილისყრით</Chip>
            {[0, 1].map(i => <Chip key={i} on={conf.first === i} onClick={() => setConf({ ...conf, first: i })}>{names[i]}</Chip>)}
          </div>
          <p className="text-[12px] leading-snug text-[#9a8b7b]">მერე ყოფა რიგრიგობით გადადის: ყოველი მეფე ოთხჯერ ყოფს და ოთხჯერ ირჩევს.</p>
        </div>
        <Btn size="lg" full disabled={sameNames} onClick={() => { void begin(); }} icon={<Crown />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
      <Card className="!p-4">
        <p className="text-[13px] font-bold text-[#4a3426]">როგორ ვთამაშობთ</p>
        <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
          ტელეფონი ორ მეფეს შორის დევს. გამყოფი ბარათებს ეხება და ორ წილად ყოფს, მერე ტელეფონს მეორეს აჩვენებს — ის წილს
          ირჩევს. ელჩს ტელეფონი თავად ახსენებს. ბარათებს ტელეფონი შლის, ორივე კარს ინახავს და ბოლოს ითვლის. ორი გუნდიც შეიძლება —
          მაშინ გუნდი თათბირობს და ერთი ეხება. „უკან“ ბოლო სვლას აუქმებს, სანამ შეხვედრა გრძელდება.
        </p>
      </Card>
    </div>
  );
};
