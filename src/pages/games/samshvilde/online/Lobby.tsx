import React, { useState } from 'react';
import { Check, LogIn, LogOut, Moon, X } from 'lucide-react';
import { MAX_PLAYERS, MIN_PLAYERS, ROLES, kidsAllowed, piperOptional, roleCounts, roleSet } from '../../../../utils/samshvilde';
import type { Joined, RoomDoc } from '../../../../utils/gameRoom';
import { TableScreen } from '../../../../components/games/TableScreen';
import { Btn, Toggle } from '../../../../components/ui/kit';
import { triggerHaptic } from '../../../../utils/haptics';
import { Hint, ROLE_ICON } from '../parts';
import { CallBtn, CallCard, type GameCall } from './GameCall';
import { Avatar, firstName } from './bits';

// The room before the game: who came in (the class's members joined from the invitation), the roles their number gives,
// the game's call. The host sees ✕ by each name (a phone that left without a word) and starts; a player comes in or goes.

export interface LobbyOpts { piper: boolean; kids: boolean }

/** who came into the room; the host sees ✕ by each name */
export const People: React.FC<{ joins: Joined[]; me: string; onKick?: (uid: string) => void }> = ({ joins, me, onKick }) => (
  joins.length ? (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
      {joins.map(j => (
        <li key={j.uid} className={`flex min-w-0 items-center gap-2 min-h-12 rounded-2xl bg-white ring-1 ring-[#e8dcc8] py-1.5 pl-1.5 ${onKick ? 'pr-0.5' : 'pr-2.5'}`}>
          <Avatar name={j.name} photoURL={j.photoURL} size="sm" />
          <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">
            {j.name}{j.uid === me && <span className="ml-1 text-[12px] text-[#a0703c]">· შენ</span>}
          </span>
          {onKick && (
            <button
              type="button"
              onClick={() => { triggerHaptic(8); onKick(j.uid); }}
              aria-label={`${j.name} — ოთახიდან გაყვანა`}
              title="ოთახიდან გაყვანა"
              className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  ) : <p className="rounded-2xl bg-white/60 border border-dashed border-[#e2d3bd] px-4 py-5 text-center text-[13px] leading-snug text-[#9a8b7b]">ჯერ არავინ შემოსულა. მოწვევა კლასის ჩატში და ტელეფონზე მივიდა.</p>
);

const countLine = (n: number) => (n < MIN_PLAYERS ? `კიდევ ${MIN_PLAYERS - n} — საჭიროა ${MIN_PLAYERS}–${MAX_PLAYERS} მოთამაშე`
  : n > MAX_PLAYERS ? `${MAX_PLAYERS}-ზე მეტია: ${n - MAX_PLAYERS} ზედმეტი`
  : `მზადაა: ${n} მოთამაშე`);

export const Lobby: React.FC<{
  room: RoomDoc; joins: Joined[]; me: string; className: string; gc: GameCall; error: string; onHide: () => void;
  host?: { opts: LobbyOpts; setOpts: (o: LobbyOpts) => void; start: () => void; kick: (uid: string) => void; close: () => void };
  player?: { join: () => Promise<boolean>; leave: () => void };
}> = ({ room, joins, me, className, gc, error, onHide, host, player }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const n = joins.length;
  const fits = n >= MIN_PLAYERS && n <= MAX_PLAYERS;
  const joined = joins.some(j => j.uid === me);
  const opts = host?.opts;
  const kids = !!opts?.kids && kidsAllowed(n);
  const roles = host && fits ? roleSet({ players: n, piper: !!opts?.piper, kids }) : [];
  const join = async () => {
    if (!player || busy) return;
    setBusy(true);
    const ok = await player.join();
    setFailed(!ok);
    setBusy(false);
  };

  const footer = host
    ? <Btn size="lg" full disabled={!fits} onClick={host.start} icon={<Moon />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
    : joined
      ? <Btn kind="ghost" size="lg" full onClick={player?.leave} icon={<LogOut />} className="!h-14 !text-[16px]">ოთახიდან გასვლა</Btn>
      : <Btn size="lg" full disabled={busy} onClick={join} icon={<LogIn />} className="!h-14 !text-[16px]">შესვლა</Btn>;

  return (
    <TableScreen title={className ? `ოთახი · ${className}` : 'ოთახი'} right={<CallBtn gc={gc} />} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-4">
        {error && <p className="rounded-2xl bg-red-50 ring-1 ring-red-200 px-4 py-2.5 text-[13px] font-bold text-red-700" role="alert">{error}</p>}

        <div className="rounded-3xl bg-[#1b1830] text-[#ece3d2] px-4 py-4 shadow-[0_14px_30px_-20px_rgba(27,24,48,0.9)]">
          {host ? (
            <>
              <p className="text-[12px] font-bold text-[#e2c27a]">შენ ხარ მემატიანე</p>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug text-[#f5ecdc]">კლასს მოწვევა გაეგზავნა — ჩატში და ტელეფონზე.</p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#c9bfae]">შენ არ თამაშობ: თამაშს უძღვები და ღამის სიტყვებს კითხულობ. როცა ყველა შემოვა, დაიწყე.</p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold text-[#e2c27a]">მემატიანე · {room.hostName}</p>
              <p className="mt-1 font-serif-ge text-[19px] font-bold leading-snug text-[#f5ecdc] inline-flex items-center gap-2">
                {joined ? <><Check className="w-5 h-5 text-[#e2c27a]" />ოთახში ხარ</> : `${firstName(room.hostName)} გიწვევს თამაშში`}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#c9bfae]">
                {joined ? 'დაელოდე — მემატიანე თამაშს მალე დაიწყებს. როლს შენს ტელეფონზე ნახავ, ფარულად.' : 'შემოდი და მემატიანე თამაშს დაიწყებს. როლს შენს ტელეფონზე ნახავ, ფარულად.'}
              </p>
            </>
          )}
        </div>

        {failed && !joined && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold text-amber-800">ვერ შევედი. შეიძლება თამაში უკვე დაიწყო — სცადე თავიდან.</p>}

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">მოთამაშეები · {n}</p>
            <p className={`text-[12.5px] font-bold tabular-nums text-right ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>{countLine(n)}</p>
          </div>
          <People joins={joins} me={me} onKick={host?.kick} />
        </section>

        {host && fits && opts && (
          <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
            <p className="text-[13.5px] font-bold text-[#4a3426]">როლები · {n} მოთამაშე</p>
            <ul className="flex flex-wrap gap-1.5">
              {roleCounts(roles).map(({ id, n: k }) => {
                const Ic = ROLE_ICON[id];
                return (
                  <li key={id} className="inline-flex items-center gap-1.5 min-h-9 px-3 py-1 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426]">
                    <Ic className="w-4 h-4 text-[#7a2028]" />{ROLES[id].name}{k > 1 && <span className="tabular-nums text-[#7a2028]">×{k}</span>}
                  </li>
                );
              })}
            </ul>
            {piperOptional(n) && !kids && (
              <Toggle on={opts.piper} onChange={v => host.setOpts({ ...opts, piper: v })} label="მესტვირე" hint="გამოცდილი ჯგუფისთვის: ღამით ერთს აძინებს. მაშინ ერთი მოქალაქე ნაკლებია." />
            )}
            {kidsAllowed(n) && (
              <Toggle on={opts.kids} onChange={v => host.setOpts({ ...opts, kids: v })} label="პატარებისთვის" hint="მხოლოდ ჯაშუშები, ციხისთავი, მკურნალი და მოქალაქეები; სიტყვა 30 წამი." />
            )}
          </section>
        )}

        <CallCard gc={gc} />

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
