import React, { useEffect, useRef } from 'react';
import { Check, Crown, RotateCcw, Undo2, X } from 'lucide-react';
import { ezoGame } from '../../../data/ezoGames';
import { KLASI, turnsMove, turnsUndo, turnsView, type EzoRound, type EzoTurns } from '../../../utils/ezo';
import { buzz, chime, closeAudio, openAudio, whistle } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import { TEAM_TINT } from '../rounds/teams';
import { useShort } from '../utskho/parts';
import { Field } from './Field';
import { roundId } from './store';

// „კლასობანა“ on the referee's phone: whose turn it is and into which class the pebble goes; „გაიარა“ — the next class, the
// same player; „შეცდა“ — the turn passes. Whoever passes the tenth class first wins. Undo goes back a step.

const ordinal = (n: number) => (n === 1 ? 'პირველ' : `მე-${n}`);

export const TurnsScreen: React.FC<{ t: EzoTurns; setT: (t: EzoTurns | null) => void; onRecord: (r: EzoRound) => void; onClose: () => void }> = ({ t, setT, onRecord, onClose }) => {
  const g = ezoGame('klasobana')!;
  const audio = useRef<AudioContext | null>(null);
  const short = useShort();
  const v = turnsView(t);
  const cur = v.turn;
  const level = v.level[cur];
  useEffect(() => () => closeAudio(audio), []);

  const move = (ok: boolean) => {
    openAudio(audio);
    const next = turnsMove(t, ok ? 'ok' : 'miss');
    const nv = turnsView(next);
    if (nv.winner !== null) { whistle(audio.current, 'sss'); triggerHaptic(60); }
    else if (ok) { chime(audio.current, 2); triggerHaptic(12); }
    else { buzz(audio.current); triggerHaptic(60); }
    setT(next);
  };
  const record = () => {
    if (v.winner === null) return;
    onRecord({ id: roundId(), game: 'klasobana', at: Date.now(), players: [...t.players], winners: [t.players[v.winner]] });
    triggerHaptic(15);
    setT(null);
    onClose();
  };

  const list = (
    <ol className="w-full space-y-1.5" aria-label="ვინ რომელ კლასშია">
      {t.players.map((p, i) => (
        <li key={p} className={`flex items-center gap-2.5 ${short ? 'min-h-10' : 'min-h-11'} rounded-2xl px-3 ${i === cur && v.winner === null ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
          <span className="w-3 h-3 shrink-0 rounded-full" style={{ background: TEAM_TINT[i % TEAM_TINT.length] }} />
          <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{p}</span>
          <span className="flex gap-[3px]" aria-hidden="true">
            {Array.from({ length: KLASI }, (_, k) => <span key={k} className={`w-1.5 h-4 rounded-full ${k < v.level[i] ? 'bg-[#2f7d4f]' : 'bg-[#e8dcc8]'}`} />)}
          </span>
          <span className="w-10 shrink-0 text-right text-[13px] font-bold tabular-nums text-[#75685a]">{v.level[i]}/{KLASI}</span>
        </li>
      ))}
    </ol>
  );

  if (v.winner !== null) {
    return (
      <TableScreen
        title={`${g.name} · შედეგი`}
        onClose={() => { setT(null); onClose(); }}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full icon={<Undo2 />} onClick={() => setT(turnsUndo(t))} className="!h-14 !text-[15px]">უკან</Btn>
            <Btn size="lg" full icon={<Check />} onClick={record} className="!h-14 !text-[15px]">ჩაწერა</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-xl mx-auto space-y-4 py-4 text-center">
          <Crown className="w-10 h-10 mx-auto text-[#c9a227]" aria-hidden="true" />
          <p className="font-serif-ge text-[28px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">გაიმარჯვა {t.players[v.winner]}!</p>
          <p className="text-[14px] text-[#75685a]">ყველა კლასი პირველმა გაიარა.</p>
          {list}
        </div>
      </TableScreen>
    );
  }

  const field = <Field id="klasobana" pebble={level + 1} done={level} label={`კლასობანა: კენჭი ${ordinal(level + 1)} კლასში`} className={short ? 'w-full max-w-[15rem] mx-auto' : 'w-full'} />;
  return (
    <TableScreen
      title={g.name}
      onClose={onClose}
      right={t.moves.length > 0 ? (
        <button type="button" onClick={() => { triggerHaptic(8); setT(turnsUndo(t)); }} className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
          <RotateCcw className="w-4 h-4" />უკან
        </button>
      ) : undefined}
      footer={(
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => move(false)} className="h-16 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#b23a48] font-bold text-[15px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] cursor-pointer">
            <X className="w-6 h-6" />შეცდა
          </button>
          <button type="button" onClick={() => move(true)} className="h-16 rounded-2xl bg-[#2f7d4f] text-white font-bold text-[15px] flex flex-col items-center justify-center gap-0.5 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer">
            <Check className="w-6 h-6" />გაიარა
          </button>
        </div>
      )}
    >
      <div className={`flex-1 w-full mx-auto py-2 ${short ? 'max-w-4xl grid grid-cols-2 gap-4 items-center' : 'max-w-xl flex flex-col justify-center gap-4'}`}>
        <div className={`text-center ${short ? 'space-y-1.5' : 'space-y-3'}`}>
          {!short && <p className="text-[13px] font-bold text-[#9a8b7b]">ხტება</p>}
          <p className={`font-serif-ge font-bold leading-tight [overflow-wrap:anywhere] ${short ? 'text-[24px]' : 'text-[32px]'}`} style={{ color: TEAM_TINT[cur % TEAM_TINT.length] }}>{t.players[cur]}</p>
          <p className="text-[15px] font-bold text-[#4a3426]">კენჭი — {ordinal(level + 1)} კლასში</p>
          {field}
        </div>
        {list}
      </div>
    </TableScreen>
  );
};
