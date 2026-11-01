import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Timer, X } from 'lucide-react';
import { PENALTY_MS, isDressed, shuffled, stepsOf, timeText, tryPut, type Outfit } from '../../../utils/chaitsvi';
import { bell, buzz, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { fireworks } from '../../../utils/samosiFireworks';
import { TableScreen } from '../../../components/games/TableScreen';
import { useWide } from '../../../components/ui/kit';
import { Doll, PartPic, labelOf, partLook, type HatPick, type KabaArt } from './Doll';

// The dressing itself, full screen: the figure, the clock and the tray of parts (in a shuffled order). 3-2-1 first — the tray
// shows and the clock starts only then, so nobody plans the order before it runs. A tap puts a part on — or sends it back with
// what must come first, and the clock jumps PENALTY_MS.

export interface Dressed { ms: number; mistakes: number; order: string[] }
type Say = { kind: 'idle' } | { kind: 'ok'; id: string } | { kind: 'no'; id: string; text: string };
const COUNT_MS = 800;

export const DressBoard: React.FC<{
  outfit: Outfit;
  names: boolean;
  seed: number;
  hat: HatPick;
  kaba: KabaArt | null;
  title: React.ReactNode;
  onClose: () => void;
  onDone: (r: Dressed) => void;
}> = ({ outfit, names, seed, hat, kaba, title, onClose, onDone }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const wide = useWide();
  const tray = useMemo(() => shuffled(stepsOf(outfit).map(s => s.id), seed), [outfit, seed]);
  const [count, setCount] = useState(3);
  const [on, setOn] = useState<string[]>([]);
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [mistakes, setMistakes] = useState(0);
  const [t0, setT0] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [say, setSay] = useState<Say>({ kind: 'idle' });
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const done = end !== null;

  // 3-2-1, then the clock
  useEffect(() => {
    if (count <= 0) return;
    tick(audio.current, false);
    const t = setTimeout(() => setCount(c => c - 1), COUNT_MS);
    return () => clearTimeout(t);
  }, [count]);
  useEffect(() => {
    if (count !== 0 || t0 !== null) return;
    tick(audio.current, true);
    const start = Date.now();
    setT0(start);
    setNow(start);
  }, [count, t0]);

  useEffect(() => {
    if (t0 === null || done) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [t0, done]);
  const shown = (t0 === null ? 0 : (end ?? now) - t0) + mistakes * PENALTY_MS;

  // the last part on: the clock stops, the fireworks, then the result
  const finish = useRef<number | null>(null);
  useEffect(() => () => { if (finish.current) clearTimeout(finish.current); }, []);

  const put = (id: string) => {
    if (done || t0 === null) return;
    const r = tryPut(outfit, on, id);
    if (!r.ok) {
      triggerHaptic(60);
      buzz(audio.current);
      setMistakes(m => m + 1);
      setShake(s => ({ id, n: (s?.n ?? 0) + 1 }));
      const first = r.missing.map(m => labelOf(outfit, m, hat));
      setSay({ kind: 'no', id, text: `ჯერ — ${first.join(', ')}. ${r.why}` });
      return;
    }
    if (on.includes(id)) return;
    triggerHaptic(25);
    chime(audio.current, 1);
    setOn(r.on);
    setDrops(d => ({ ...d, [id]: (d[id] || 0) + 1 }));
    setSay({ kind: 'ok', id });
    if (isDressed(outfit, r.on)) {
      const stop = Date.now();
      setEnd(stop);
      bell(audio.current);
      fireworks(true);
      finish.current = window.setTimeout(() => onDone({ ms: stop - t0, mistakes, order: r.on }), 1600);
    }
  };

  const look = (id: string) => partLook(outfit, id, hat, kaba);
  return (
    <TableScreen
      title={title}
      onClose={onClose}
      right={(
        <span className={`h-10 px-3 rounded-full inline-flex items-center gap-1.5 tabular-nums font-bold text-[17px] ${done ? 'bg-[#2f7d4f] text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`} aria-live="off">
          <Timer className="w-4 h-4" aria-hidden="true" />{timeText(shown)}
        </span>
      )}
    >
      <div className={`flex-1 min-h-0 ${wide ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 items-center max-w-4xl w-full mx-auto' : 'flex flex-col'}`}>
        <div className={`${wide ? '' : 'flex-1 min-h-0'} flex flex-col items-center justify-center py-1`}>
          <div style={{ width: wide ? 'min(300px, calc((100dvh - 110px) * 0.41))' : 'min(230px, calc((100dvh - 370px) * 0.41))', minWidth: 140 }}>
            <Doll outfit={outfit} on={on} hat={hat} kaba={kaba} drops={drops} done={done} />
          </div>
        </div>
        <div className="space-y-3 pb-1">
          <div className="min-h-[52px] flex items-center justify-center text-center px-1" role="status" aria-live="polite">
            {count > 0 && <p className="text-[15px] font-bold text-[#7a2028]">მოემზადე!</p>}
            {count === 0 && say.kind === 'idle' && <p className="text-[14.5px] text-[#75685a]">რა იცმევა პირველი? შეეხე ნაწილს.</p>}
            {say.kind === 'ok' && (
              <p className="text-[15px] font-bold text-[#2f7d4f] inline-flex items-center gap-1.5">
                <Check className="w-4 h-4" aria-hidden="true" />{done ? 'ჩაცმულია!' : `${look(say.id).label} — სწორია`}
              </p>
            )}
            {say.kind === 'no' && (
              <p className="text-[14.5px] leading-snug font-bold text-[#a0322e]">
                <X className="inline w-4 h-4 -mt-0.5 mr-1" aria-hidden="true" />{say.text} <span className="text-[#b5662b]">+{PENALTY_MS / 1000} წამი</span>
              </p>
            )}
          </div>
          {count > 0 ? (
            <div className="h-[200px] flex items-center justify-center" aria-hidden="true">
              <span key={count} className="samosi-pop w-28 h-28 rounded-full bg-[#7a2028] text-[#fbf6ec] font-serif-ge text-[56px] font-bold flex items-center justify-center tabular-nums">{count}</span>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {tray.map(id => {
                const l = look(id);
                const isOn = on.includes(id);
                const shaking = shake?.id === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      disabled={isOn || done}
                      onClick={() => put(id)}
                      aria-label={names ? l.label : 'ნაწილი'}
                      className={`relative w-full min-h-[92px] rounded-2xl px-1.5 pt-2 pb-1.5 flex flex-col items-center gap-1 transition cursor-pointer disabled:cursor-default ${
                        isOn ? 'bg-[#eef6ea] ring-1 ring-[#bcd9b0] opacity-60' : 'bg-white ring-1 ring-[#e8dcc8] shadow-[0_2px_6px_-3px_rgba(74,52,38,0.35)] active:scale-[0.96]'
                      } ${shaking ? 'sg-shake' : ''}`}
                      key={shaking ? `s${shake.n}` : 'b'}
                    >
                      <PartPic look={l} className="w-14 h-14" />
                      {names && <span className="text-[13px] leading-tight font-bold text-[#4a3426] text-center">{l.label}</span>}
                      {isOn && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#2f7d4f] text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3.5]" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-center text-[12.5px] text-[#9a8b7b] tabular-nums">{mistakes ? `შეცდომა: ${mistakes} · +${(mistakes * PENALTY_MS) / 1000} წამი` : 'არასწორი ნაწილი დროს +3 წამს უმატებს'}</p>
        </div>
      </div>
    </TableScreen>
  );
};
