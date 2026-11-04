import React, { useEffect, useRef, useState } from 'react';
import { Check, Hand, RotateCcw, Waves } from 'lucide-react';
import { ezoGame } from '../../../data/ezoGames';
import { HOLD_SECONDS, figureOf, seaStop, type EzoRound } from '../../../utils/ezo';
import { chime, closeAudio, openAudio, seaWaves, whistle } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import { TimerRing, useNow } from '../rounds/parts';
import { roundId } from './store';

// „ზღვა ღელავს“ on the referee's phone: the sea sounds and the waves run while everybody moves; at a moment nobody knows
// (6–18 s) it stops — „გაშეშდი!“ and the statues' theme; ten seconds to hold still; then the leader names the best statue,
// who leads the next round.

type Phase = 'ready' | 'waves' | 'freeze' | 'pick';
const CHANT = ['ზღვა ღელავს ერთი…', 'ზღვა ღელავს ორი…', 'ზღვა ღელავს სამი…'];

const WaveBand: React.FC = () => (
  <div className="relative w-full h-28 overflow-hidden rounded-3xl bg-[#cfe2ef]" aria-hidden="true">
    {[0, 1, 2].map(i => (
      <svg key={i} viewBox="0 0 400 40" preserveAspectRatio="none" className="ezo-wave absolute left-0 w-[200%] h-10" style={{ top: 10 + i * 28, animationDuration: `${3.2 + i * 1.1}s`, opacity: 0.85 - i * 0.2 }}>
        <path d="M0 20q12.5-14 25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0t25 0" stroke="#2b5f8a" strokeWidth="4" fill="none" strokeLinecap="round" />
      </svg>
    ))}
  </div>
);

export const SeaScreen: React.FC<{ players: string[]; firstLeader: string; onRecord: (r: EzoRound) => void; onClose: () => void }> = ({ players, firstLeader, onRecord, onClose }) => {
  const g = ezoGame('zghva')!;
  const audio = useRef<AudioContext | null>(null);
  const stopSea = useRef<() => void>(() => { /* nothing yet */ });
  const [phase, setPhase] = useState<Phase>('ready');
  const [t0, setT0] = useState(0);
  const [stopAt, setStopAt] = useState(0);
  const [figure, setFigure] = useState<string | null>(null);
  const [leader, setLeader] = useState(firstLeader);
  const [best, setBest] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const now = useNow(phase === 'waves' || phase === 'freeze');
  const named = players.length > 1;
  useEffect(() => () => { stopSea.current(); closeAudio(audio); }, []);

  const freeze = () => {
    stopSea.current();
    whistle(audio.current, 's');
    triggerHaptic(60);
    setFigure(f => figureOf(Math.random, f));
    setT0(Date.now());
    setPhase('freeze');
  };

  useEffect(() => {
    if (phase !== 'waves') return;
    const t = setTimeout(freeze, Math.max(0, stopAt - Date.now()));
    return () => clearTimeout(t);
  }, [phase, stopAt]);

  const holdLeft = phase === 'freeze' ? Math.max(0, HOLD_SECONDS - (now - t0) / 1000) : HOLD_SECONDS;
  useEffect(() => {
    if (phase === 'freeze' && holdLeft <= 0) {
      chime(audio.current, 3);
      triggerHaptic(30);
      setPhase('pick');
    }
  }, [phase, holdLeft]);

  const go = () => {
    openAudio(audio);
    triggerHaptic(10);
    stopSea.current = seaWaves(audio.current);
    setT0(Date.now());
    setStopAt(Date.now() + seaStop(Math.random));
    setBest(null);
    setPhase('waves');
  };
  const next = (record: boolean) => {
    if (record && best) onRecord({ id: roundId(), game: 'zghva', at: Date.now(), players, winners: [best] });
    if (best) setLeader(best);
    triggerHaptic(12);
    setRound(round + 1);
    setPhase('ready');
  };
  const chantAt = Math.min(CHANT.length - 1, Math.floor((now - t0) / 2000));

  const footer = phase === 'ready'
    ? <Btn size="lg" full icon={<Waves />} onClick={go} className="!h-14 !text-[16px]">ზღვა ღელავს!</Btn>
    : phase === 'waves' ? <Btn kind="ghost" size="lg" full icon={<Hand />} onClick={freeze} className="!h-14 !text-[15.5px]">ახლავე — გაშეშდი!</Btn>
    : phase === 'freeze' ? <Btn kind="ghost" size="lg" full onClick={() => setPhase('pick')} className="!h-14 !text-[15.5px]">წამყვანი უკვე ირჩევს</Btn>
    : named
      ? (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full icon={<RotateCcw />} onClick={() => next(false)} className="!h-14 !text-[15px]">ჩაუწერლად</Btn>
          <Btn size="lg" full icon={<Check />} onClick={() => next(true)} disabled={!best} className="!h-14 !text-[15px]">ჩაწერა</Btn>
        </div>
      )
      : <Btn size="lg" full icon={<RotateCcw />} onClick={() => next(false)} className="!h-14 !text-[15.5px]">კიდევ ერთხელ</Btn>;

  return (
    <TableScreen
      title={`${g.name} · რაუნდი ${round}`}
      onClose={() => { stopSea.current(); onClose(); }}
      right={named ? <span className="px-1 text-[12px] text-[#9a8b7b] max-w-[9rem] truncate">წამყვანი: {leader}</span> : undefined}
      footer={footer}
    >
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 py-3 text-center">
        {phase === 'ready' && (
          <>
            <WaveBand />
            <p className="max-w-sm text-[14px] leading-relaxed text-[#75685a]">
              {named ? <><span className="font-bold text-[#7a2028]">{leader}</span> წამყვანია. </> : ''}
              ტელეფონი ზღვის ხმას ჩართავს — იმოძრავეთ ტალღებივით. როცა გაჩერდება, „გაშეშდი!“ — და იქცევით ქანდაკებად.
            </p>
          </>
        )}
        {phase === 'waves' && (
          <>
            <WaveBand />
            <p aria-live="polite" className="font-serif-ge text-[28px] font-bold leading-tight text-[#2b5f8a]">{CHANT[chantAt]}</p>
            <p className="text-[13px] text-[#9a8b7b]">ზღვა ღელავს — იმოძრავეთ!</p>
          </>
        )}
        {phase === 'freeze' && (
          <>
            <p aria-live="assertive" className="font-serif-ge text-[54px] font-bold leading-none text-[#7a2028]">გაშეშდი!</p>
            <p className="text-[13px] font-bold text-[#9a8b7b]">ქანდაკება —</p>
            <p className="font-serif-ge text-[24px] font-bold leading-tight text-[#4a3426]">{figure}</p>
            <TimerRing left={holdLeft} total={HOLD_SECONDS} size="sm" />
            <p className="text-[12.5px] text-[#75685a]">ვინც გაინძრა ან გაიცინა, გადის და წამყვანს ეხმარება.</p>
          </>
        )}
        {phase === 'pick' && (
          <>
            <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{figure}</p>
            <p className="text-[14px] leading-snug text-[#75685a]">წამყვანი ქანდაკებებს შეეხება — ისინი „ცოცხლდებიან“ და აჩვენებენ, ვინ არიან.</p>
            {named && (
              <>
                <p className="text-[13.5px] font-bold text-[#4a3426]">ვინ იყო საუკეთესო ქანდაკება?</p>
                <ul className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="საუკეთესო ქანდაკება">
                  {players.filter(p => p !== leader).map(p => (
                    <li key={p}>
                      <button
                        type="button"
                        aria-pressed={best === p}
                        onClick={() => { triggerHaptic(6); setBest(best === p ? null : p); }}
                        className={`w-full min-h-12 rounded-2xl px-3 text-[14px] font-bold leading-tight [overflow-wrap:anywhere] cursor-pointer active:scale-[0.98] transition ${best === p ? 'bg-[#c9a227] text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-[12.5px] text-[#9a8b7b]">ის მოიგებს და შემდეგ რაუნდს წაიყვანს.</p>
              </>
            )}
          </>
        )}
      </div>
    </TableScreen>
  );
};
