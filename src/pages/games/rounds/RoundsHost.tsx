import React, { useEffect, useRef } from 'react';
import { ChevronRight, Eye, RotateCcw, Trophy } from 'lucide-react';
import { publicView, type RoundsState } from '../../../utils/roundGames';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import { CallBtn, type GameCall } from '../samshvilde/online/GameCall';
import type { RoundFace } from './face';
import type { Snippet } from './useSnippet';
import { AnsweredList, Podium, RoundHead, SnippetBox, Standings, TimerRing, useNow } from './parts';

// The host's phone in a quick game's room (pages/games/rounds/): it plays the round's piece, counts the time and moves the
// round on when it is over (or when the host opens it sooner), shows the answer and the points, and at the end the podium.

export const RoundsHost: React.FC<{
  s: RoundsState; face: RoundFace; snippet: Snippet; gc: GameCall; onHide: () => void;
  moves: { timeUp: (key: string) => void; reveal: () => void; next: () => void; again: () => void; close: () => void };
}> = ({ s, face, snippet, gc, onHide, moves }) => {
  const v = publicView(s);
  const asking = s.phase === 'ask';
  const now = useNow(asking);
  const left = asking ? Math.max(0, (s.t0 + v.secs * 1000 - now) / 1000) : 0;
  const key = v.key;

  // the round's piece starts with the round (and again with each of its steps), here in both ways of sound; the reveal
  // stops it (and its ▶ then plays the whole piece)
  const clip = face.clip?.(v.q, asking ? v.step : v.steps) ?? null;
  const played = useRef('');
  useEffect(() => {
    if (!asking) { snippet.stop(); return; }
    if (clip && played.current !== key) { played.current = key; snippet.play(clip); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, asking]);
  // the time over: the round opens by itself
  const over = asking && left <= 0;
  useEffect(() => { if (over) moves.timeUp(key); }, [over, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapClip = () => {
    if (!clip) return;
    if (snippet.state === 'play' || snippet.state === 'load') snippet.stop();
    else snippet.play(clip);
  };
  const right = <CallBtn gc={gc} />;
  const more = asking && v.step < v.steps;

  if (s.phase === 'end') {
    return (
      <TableScreen
        title={face.title}
        right={right}
        onClose={onHide}
        footer={(
          <div className="space-y-2">
            <Btn size="lg" full onClick={moves.again} icon={<RotateCcw />} className="!h-14 !text-[16px]">კიდევ ერთხელ</Btn>
            <button type="button" onClick={moves.close} className="w-full h-11 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">ოთახის დახურვა</button>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">თამაში დასრულდა</p>
            <Hint>{v.total} რაუნდი · {v.names.length} მოთამაშე</Hint>
          </div>
          <Podium names={v.names} scores={v.scores} />
          <Standings names={v.names} scores={v.scores} />
        </div>
      </TableScreen>
    );
  }

  if (s.phase === 'reveal') {
    const last = s.at + 1 >= s.rounds.length;
    return (
      <TableScreen
        title={face.title}
        right={right}
        onClose={onHide}
        footer={<Btn size="lg" full onClick={() => { triggerHaptic(12); moves.next(); }} icon={last ? <Trophy /> : <ChevronRight />} className="!h-14 !text-[16px]">{last ? 'შედეგები' : 'შემდეგი რაუნდი'}</Btn>}
      >
        <div className="py-2 space-y-4">
          <RoundHead at={s.at} total={s.rounds.length} />
          <face.Answer q={v.q} />
          <face.Reveal q={v.q} picks={v.picks} />
          {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} />}
          <section className="space-y-2">
            <p className="text-[13.5px] font-bold text-[#4a3426]">ქულები</p>
            <Standings names={v.names} scores={v.scores} gained={v.gained} />
          </section>
        </div>
      </TableScreen>
    );
  }

  return (
    <TableScreen
      title={face.title}
      right={right}
      onClose={onHide}
      footer={more ? (
        <div className="flex gap-3">
          <Btn kind="ghost" size="lg" onClick={() => { triggerHaptic(12); moves.reveal(); }} icon={<Eye />} className="!h-14 !px-5">პასუხი</Btn>
          <Btn size="lg" onClick={() => { triggerHaptic(12); moves.timeUp(key); }} icon={<ChevronRight />} className="!h-14 !text-[16px] flex-1">{face.nextLabel ?? 'შემდეგი'}</Btn>
        </div>
      ) : <Btn kind="ghost" size="lg" full onClick={() => { triggerHaptic(12); moves.reveal(); }} icon={<Eye />} className="!h-14 !text-[16px]">პასუხის გახსნა</Btn>}
    >
      <div className="py-2 space-y-4">
        <RoundHead at={s.at} total={s.rounds.length} />
        <div className="flex items-center gap-4">
          <TimerRing left={left} total={v.secs} />
          <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">{face.askHost}</p>
        </div>
        {face.Ask && <face.Ask q={v.q} who="host" step={v.step} steps={v.steps} />}
        {clip && (
          <SnippetBox
            state={snippet.state}
            prog={snippet.prog}
            onTap={tapClip}
            note={s.sound === 'all' ? 'ყველას თავის ტელეფონზე ჟღერს' : 'მხოლოდ შენს ტელეფონზე ჟღერს — ხმა აუწიე'}
          />
        )}
        <AnsweredList names={v.names} answered={v.answered} />
        <Hint>{more ? 'დრო რომ ამოიწურება, შემდეგი ნაბიჯი თავისით მოვა; როცა ყველა უპასუხებს, პასუხი გაიხსნება.' : 'როცა ყველა უპასუხებს ან დრო ამოიწურება, პასუხი თავისით გაიხსნება.'}</Hint>
      </div>
    </TableScreen>
  );
};
