import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, Eye, LogOut, Send, Trophy } from 'lucide-react';
import { placesOf, type RoundsView } from '../../../utils/roundGames';
import type { MyAct } from '../../../utils/gameRoom';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import { CallBtn, type GameCall } from '../samshvilde/online/GameCall';
import type { RoundFace } from './face';
import type { Snippet } from './useSnippet';
import { HostSoundLine, Podium, RoundHead, SnippetBox, Standings, TimerRing, placeText, useNow } from './parts';

// A player's phone in a quick game's room (pages/games/rounds/): the round's piece (when it sounds on every phone), the
// answer marked and sent once, then the wait; at the reveal what I earned and the answer; at the end the podium and my
// place. Time is counted on this phone from the moment the round reached it (a phone's clock may differ from the host's),
// and the answer says how long it took. One who is not in the game only watches.

const TONE = {
  right: 'bg-[#2f7d4f] text-white',
  near: 'bg-[#a8d1b4] text-[#1e4d31]',
  wrong: 'bg-[#4a3426] text-[#fbf6ec]',
  none: 'bg-[#4a3426]/[0.08] text-[#4a3426]',
} as const;

export const RoundsPlayer: React.FC<{
  view: RoundsView; uids: string[]; uid: string; mine: MyAct | null; face: RoundFace; snippet: Snippet; gc: GameCall;
  onAnswer: (pick: number, ms: number) => void; onHide: () => void; onLeave: () => void;
}> = ({ view: v, uids, uid, mine, face, snippet, gc, onAnswer, onHide, onLeave }) => {
  const me = uids.indexOf(uid);
  const asking = v.phase === 'ask';
  // when this round reached this phone: the host's clock is trusted only for a few seconds of delay
  const seen = useRef<{ key: string; start: number }>({ key: '', start: 0 });
  if (seen.current.key !== v.key) {
    const at = Date.now();
    seen.current = { key: v.key, start: at - Math.min(4000, Math.max(0, at - v.t0)) };
  }
  const start = seen.current.start;
  const now = useNow(asking);
  const left = asking ? Math.max(0, v.secs - (now - start) / 1000) : 0;
  const [pick, setPick] = useState<number | null>(null);
  useEffect(() => { setPick(null); }, [v.at, v.n]);

  const answered = me >= 0 && (v.answered[me] || (mine?.key === v.key && mine.pick !== null));
  const myPick = mine && mine.key === v.key ? mine.pick : null;

  // the piece: on this phone only when it sounds on every phone
  const piece = face.clip?.(v.q) ?? null;
  const clip = v.sound === 'all' ? piece : null;
  const played = useRef('');
  useEffect(() => {
    if (!asking) { snippet.stop(); return; }
    if (clip && played.current !== v.key) { played.current = v.key; snippet.play(clip.url, clip.from); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.key, asking]);
  const tapClip = () => {
    if (!clip) return;
    if (snippet.state === 'play' || snippet.state === 'load') snippet.stop();
    else snippet.play(clip.url, clip.from);
  };
  const send = () => {
    if (pick === null || answered || left <= 0) return;
    triggerHaptic(15);
    onAnswer(pick, Date.now() - start);
  };

  const right = <CallBtn gc={gc} />;
  const watching = me < 0 && (
    <p className="flex items-start gap-2 rounded-2xl bg-[#4a3426]/[0.06] px-3.5 py-2.5 text-[13px] font-bold leading-snug text-[#75685a]">
      <Eye className="w-4 h-4 shrink-0 mt-px" />ამ თამაშში არ ხარ — უყურებ.
    </p>
  );

  if (v.phase === 'end') {
    const place = me >= 0 ? placesOf(v.scores)[me] : 0;
    return (
      <TableScreen
        title={face.title}
        right={right}
        onClose={onHide}
        footer={<Btn kind="ghost" size="lg" full onClick={onLeave} icon={<LogOut />} className="!h-14 !text-[16px]">დახურვა</Btn>}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">{me >= 0 ? placeText(place) : 'თამაში დასრულდა'}</p>
            {me >= 0 && <Hint>{v.scores[me]} ქულა · {v.total} რაუნდი</Hint>}
          </div>
          <Podium names={v.names} scores={v.scores} me={me} />
          <Standings names={v.names} scores={v.scores} me={me} />
          <Hint className="text-center">წამყვანი შეიძლება კიდევ ერთ თამაშს დაიწყებს — ამ ეკრანზე გამოჩნდება.</Hint>
        </div>
      </TableScreen>
    );
  }

  if (v.phase === 'reveal') {
    const verdict = me >= 0 ? face.verdict(v.q, v.picks?.[me] ?? null) : null;
    const gained = me >= 0 ? v.gained?.[me] ?? 0 : 0;
    const place = me >= 0 ? placesOf(v.scores)[me] : 0;
    return (
      <TableScreen title={face.title} right={right} onClose={onHide}>
        <div className="py-2 space-y-4">
          <RoundHead at={v.at} total={v.total} />
          {watching}
          {verdict && (
            <div className={`rounded-3xl px-4 py-4 flex items-center gap-3 ${TONE[verdict.tone]}`} role="status">
              <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug">{verdict.text}</p>
              <p className="shrink-0 font-serif-ge text-[24px] font-bold tabular-nums">{gained > 0 ? `+${gained}` : '0'}</p>
            </div>
          )}
          <face.Answer q={v.q} />
          <face.Reveal q={v.q} picks={v.picks} mine={me >= 0 ? v.picks?.[me] ?? null : undefined} />
          {me >= 0 && <p className="text-center text-[13.5px] font-bold text-[#4a3426]">{placeText(place)} · {v.scores[me]} ქულა</p>}
          <Standings names={v.names} scores={v.scores} gained={v.gained} me={me} limit={5} />
          <Hint className="text-center">შემდეგ რაუნდს წამყვანი დაიწყებს.</Hint>
        </div>
      </TableScreen>
    );
  }

  // asked: mark and send, then wait
  const done = answered || me < 0 || left <= 0;
  return (
    <TableScreen
      title={face.title}
      right={right}
      onClose={onHide}
      footer={!done && (
        <Btn size="lg" full disabled={pick === null} onClick={send} icon={<Send />} className="!h-14 !text-[15.5px]">{face.confirm(v.q, pick)}</Btn>
      )}
    >
      <div className="py-2 space-y-4">
        <RoundHead at={v.at} total={v.total}>
          <TimerRing left={left} total={v.secs} size="sm" />
        </RoundHead>
        {watching}
        {clip ? <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} /> : piece && <HostSoundLine />}
        {face.Ask && <face.Ask q={v.q} who="player" />}
        {answered ? (
          <div className="rounded-3xl bg-[#2f7d4f]/10 ring-1 ring-[#2f7d4f]/25 px-4 py-5 text-center" role="status">
            <Check className="w-8 h-8 mx-auto text-[#2f7d4f]" />
            <p className="mt-1 font-serif-ge text-[19px] font-bold text-[#24603d]">პასუხი გაგზავნილია</p>
            {myPick !== null && <p className="mt-0.5 text-[14px] font-bold text-[#24603d]">{face.pickName(v.q, myPick)}</p>}
            <Hint className="mt-1.5">უპასუხა {v.answered.filter(Boolean).length} / {v.names.length}. პასუხი ყველასთან ერთად გაიხსნება.</Hint>
          </div>
        ) : me >= 0 && left <= 0 ? (
          <div className="rounded-3xl bg-[#4a3426]/[0.06] px-4 py-5 text-center" role="status">
            <Clock className="w-8 h-8 mx-auto text-[#75685a]" />
            <p className="mt-1 font-serif-ge text-[19px] font-bold text-[#4a3426]">დრო ამოიწურა</p>
            <Hint className="mt-1">პასუხი ახლავე გაიხსნება.</Hint>
          </div>
        ) : (
          <>
            {me >= 0 && !face.Ask && <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">{face.askPlayer}</p>}
            {me >= 0 && <face.Pick q={v.q} pick={pick} onPick={setPick} />}
          </>
        )}
      </div>
    </TableScreen>
  );
};
