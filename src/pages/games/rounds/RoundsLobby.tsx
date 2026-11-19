import React, { useState } from 'react';
import { Check, LogIn, LogOut, Play } from 'lucide-react';
import type { Joined, RoomDoc } from '../../../utils/gameRoom';
import { MAX_ROUND_PLAYERS, ROUND_COUNTS, type Sound } from '../../../utils/roundGames';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { CallBtn, CallCard, type GameCall } from '../samshvilde/online/GameCall';
import { People } from '../samshvilde/online/Lobby';
import { firstName } from '../samshvilde/online/bits';
import { stepsOf, type RoundFace } from './face';
import { ROOM_GAME_INFO } from '../../../data/roomGames';
import { useNewLook } from '../../../design/newLook';
import { LobbyFoot, LobbyV2, type LobbyPerson } from '../../v2/tamashebi/LobbyV2';

// A quick game's room before the game (pages/games/rounds/): who came in, and the host's choices — how many rounds, where the
// sound plays (on every phone, everybody at home; or only on the host's, everybody in one room). The host starts, a player
// comes in or goes.

export interface RoundsOpts { count: number; sound: Sound }

const countLine = (n: number) => (n < 1 ? 'ჯერ არავინაა — საჭიროა ერთი მოთამაშე მაინც'
  : n > MAX_ROUND_PLAYERS ? `${MAX_ROUND_PLAYERS}-ზე მეტია: ${n - MAX_ROUND_PLAYERS} ზედმეტი`
  : `მზადაა: ${n} მოთამაშე`);

export const RoundsLobby: React.FC<{
  face: RoundFace; room: RoomDoc; joins: Joined[]; me: string; className: string; gc: GameCall; onHide: () => void;
  host?: { opts: RoundsOpts; setOpts: (o: RoundsOpts) => void; start: () => void; kick: (uid: string) => void; close: () => void; empty: boolean };
  player?: { join: () => Promise<boolean>; leave: () => void };
}> = ({ face, room, joins, me, className, gc, onHide, host, player }) => {
  const nl = useNewLook();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = joins.length;
  const fits = n >= 1 && n <= MAX_ROUND_PLAYERS;
  const joined = joins.some(j => j.uid === me);
  // who leads it (the explainer of „ამიხსენი“, the actor of „პანტომიმა“…) and how one answers
  const lead = ROOM_GAME_INFO[face.game].host;
  const answerVerb = face.typed ? 'დაწერ' : 'მონიშნავ';
  const join = async () => {
    if (!player || busy) return;
    setBusy(true);
    const ok = await player.join();
    setFailed(!ok);
    setBusy(false);
  };

  const footer = host
    ? <Btn size="lg" full disabled={!fits || host.empty} onClick={host.start} icon={<Play />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
    : joined
      ? <Btn kind="ghost" size="lg" full onClick={player?.leave} icon={<LogOut />} className="!h-14 !text-[16px]">ოთახიდან გასვლა</Btn>
      : <Btn size="lg" full disabled={busy} onClick={join} icon={<LogIn />} className="!h-14 !text-[16px]">შესვლა</Btn>;

  const opts = host?.opts;
  // the new look (board x-otakhi-molodini): who leads and who came in, a row each; the rules in a window; one main button
  if (nl) {
    const people: LobbyPerson[] = [
      { uid: room.host, name: room.hostName, sub: 'უძღვება', status: 'მზადაა', ready: true, me: room.host === me },
      ...joins.filter(j => j.uid !== room.host).map(j => ({ uid: j.uid, name: j.name, photo: j.photoURL || undefined, status: j.uid === me ? 'მზადაა' : 'შემოვიდა', ready: j.uid === me, me: j.uid === me })),
    ];
    return (
      <TableScreen
        title={face.title}
        right={<CallBtn gc={gc} />}
        onClose={onHide}
        footer={<LobbyFoot kind={host ? 'start' : joined ? 'leave' : 'join'} disabled={host ? !fits || host.empty : busy} onClick={host ? host.start : joined ? () => player?.leave() : () => { void join(); }} />}
      >
        <LobbyV2
          lead={host
            ? { title: `შენ ხარ ${lead}${className ? ` · ${className}` : ''}`, text: 'კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე. შენ არ თამაშობ: რაუნდებს უძღვები. როცა ყველა შემოვა, დაიწყე.' }
            : joined
              ? { title: 'ოთახში ხარ', text: `დაელოდე — ${lead} თამაშს მალე დაიწყებს. პასუხს შენს ტელეფონზე ${answerVerb}.` }
              : { title: `${firstName(room.hostName)} გიწვევს თამაშში`, text: `${lead} · ${room.hostName}${className ? ` · ${className}` : ''}. შემოდი და პასუხს შენს ტელეფონზე ${answerVerb}.` }}
          warn={[
            ...(failed && !joined ? ['ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.'] : []),
            ...(host?.empty ? [face.empty] : []),
          ]}
          people={people}
          countLine={countLine(n)}
          fits={fits}
          onKick={host?.kick}
          rounds={host && opts ? (face.fixedRounds ? { fixed: face.fixedRounds } : { value: opts.count, options: [...ROUND_COUNTS], set: c => host.setOpts({ ...opts, count: c }) }) : undefined}
          sound={host && opts && face.clip && !face.everyPhone ? {
            value: opts.sound,
            set: v => host.setOpts({ ...opts, sound: v }),
            hint: opts.sound === 'all' ? 'სახლიდან თამაშისთვის: ყველა თავის ტელეფონზე ისმენს.' : 'ერთ ოთახში ხართ: ნაწყვეტი შენს ტელეფონზე ჟღერს, ყველა უსმენს და პასუხს თავისაზე ნიშნავს.',
          } : undefined}
          extra={host && face.Options ? <face.Options /> : undefined}
          call={<CallCard gc={gc} hint={face.callHint} />}
          steps={stepsOf(face.online)}
          onCloseRoom={host?.close}
          helper={host ? 'თამაში იწყება, როცა „თამაშის დაწყებას“ დააჭერ.' : 'თამაში იწყება, როცა წამყვანი „დაწყებას“ დააჭერს. მანამდე ოთახიდან გასვლა შეგიძლია.'}
        />
      </TableScreen>
    );
  }
  return (
    <TableScreen title={className ? `ოთახი · ${className}` : 'ოთახი'} right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-[#7a2028] to-[#5e1820] text-[#fbf6ec] px-4 py-4 shadow-[0_14px_30px_-20px_rgba(122,32,40,0.9)]">
          <p className="text-[12px] font-bold text-[#f0d9a8] flex items-center gap-1.5"><face.Icon className="w-4 h-4" />{face.title}</p>
          {host ? (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug">შენ ხარ {lead}. კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე.</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">შენ არ თამაშობ: რაუნდებს უძღვები. როცა ყველა შემოვა, დაიწყე.</p>
            </>
          ) : (
            <>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug flex items-center gap-2">
                {joined ? <><Check className="w-5 h-5 text-[#f0d9a8]" />ოთახში ხარ</> : `${firstName(room.hostName)} გიწვევს თამაშში`}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#fbf6ec]/85">
                {joined ? `დაელოდე — ${lead} თამაშს მალე დაიწყებს. პასუხს შენს ტელეფონზე ${answerVerb}.` : `${lead} · ${room.hostName}. შემოდი და პასუხს შენს ტელეფონზე ${answerVerb}.`}
              </p>
            </>
          )}
        </div>

        {failed && !joined && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold text-amber-800">ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.</p>}
        {host?.empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold leading-snug text-amber-800">{face.empty}</p>}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">მოთამაშეები · {n}</p>
            <p className={`text-[12.5px] font-bold tabular-nums text-right ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>{countLine(n)}</p>
          </div>
          <People joins={joins} me={me} onKick={host?.kick} />
        </section>

        {host && opts && (
          <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3.5">
            {face.fixedRounds ? <p className="text-[13.5px] font-bold text-[#4a3426]">რაუნდები · {face.fixedRounds}</p> : (
              <div className="space-y-2">
                <p className="text-[13.5px] font-bold text-[#4a3426]">რაუნდები</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="რაუნდები">
                  {ROUND_COUNTS.map(c => <Chip key={c} on={opts.count === c} onClick={() => host.setOpts({ ...opts, count: c })}>{c}</Chip>)}
                </div>
              </div>
            )}
            {face.Options && <face.Options />}
            {face.clip && !face.everyPhone && (
              <div className="space-y-2">
                <p className="text-[13.5px] font-bold text-[#4a3426]">სად ჟღერს ნაწყვეტი</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="სად ჟღერს ნაწყვეტი">
                  <Chip on={opts.sound === 'all'} onClick={() => host.setOpts({ ...opts, sound: 'all' })}>ყველას ტელეფონზე</Chip>
                  <Chip on={opts.sound === 'host'} onClick={() => host.setOpts({ ...opts, sound: 'host' })}>მხოლოდ ჩემზე</Chip>
                </div>
                <Hint>{opts.sound === 'all' ? 'სახლიდან თამაშისთვის: ყველა თავის ტელეფონზე ისმენს.' : 'ერთ ოთახში ხართ: ნაწყვეტი შენს ტელეფონზე ჟღერს, ყველა უსმენს და პასუხს თავისაზე ნიშნავს.'}</Hint>
              </div>
            )}
          </section>
        )}

        <CallCard gc={gc} hint={face.callHint} />

        {host && (
          <div className="flex justify-center">
            <button type="button" onClick={host.close} className="h-11 px-4 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">ოთახის დახურვა</button>
          </div>
        )}
        {!host && <Hint className="text-center">სანამ თამაში დაიწყება, ოთახიდან გასვლა შეგიძლია.</Hint>}
      </div>
    </TableScreen>
  );
};
