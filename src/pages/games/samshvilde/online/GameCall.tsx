import React, { useEffect, useRef } from 'react';
import { Maximize2, Phone, PhoneOff, Video } from 'lucide-react';
import { callState, joinCall, leaveCall, setCallSmall, toggleCam, toggleMic, useCall, useLivePeers, type CallKind } from '../../../../utils/callSession';
import { gameCallInfo } from '../../../../components/calls/callActions';
import type { Me } from '../../../../utils/gameRoom';
import { Btn } from '../../../../components/ui/kit';
import { triggerHaptic } from '../../../../utils/haptics';
import { Hint } from '../parts';

// The game's own call (the user's „ზარის გაშვება … ვიდეო ზარი“): the school's calls (utils/callSession.ts) under the room,
// base classes/{classId}/games/{roomId}. It opens shrunk to its bar, so the game stays in front; the bar's ⤢ shows the
// faces. Nobody is rung — the players are in the game already. At night a player's microphone and camera go off by
// themselves and come back in the morning as they were (useHush); the host keeps reading aloud.

export const useGameCall = (base: string, me: Me, host: string) => {
  const call = useCall();
  const peers = useLivePeers(base);
  const inIt = call.info?.base === base && call.status !== 'idle' && call.status !== 'ended';
  const join = async (kind: CallKind) => {
    // the call screen would cover the game while it connects: it starts as the bar
    const p = joinCall(gameCallInfo(base, 'სამშვილდის ღამე', me, host), kind);
    setCallSmall(true);
    if (await p) setCallSmall(true);
  };
  return { peers: peers.length, inIt, join, show: () => setCallSmall(false), leave: () => { void leaveCall(); } };
};
export type GameCall = ReturnType<typeof useGameCall>;

/** the bar's button: into the call (with how many are in it already); in the call its own bar takes over */
export const CallBtn: React.FC<{ gc: GameCall; dark?: boolean }> = ({ gc, dark }) => {
  if (gc.inIt) return null;
  return (
    <button
      type="button"
      onClick={() => { triggerHaptic(10); void gc.join('audio'); }}
      aria-label={gc.peers ? `ზარში შესვლა — ზარშია ${gc.peers}` : 'ზარის დაწყება'}
      title={gc.peers ? 'ზარში შესვლა' : 'ზარის დაწყება'}
      className={`relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center cursor-pointer ${dark ? 'text-[#e2c27a] hover:bg-white/10' : 'text-[#7a2028] hover:bg-[#7a2028]/[0.07]'}`}
    >
      <Phone className="w-5 h-5" />
      {gc.peers > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold leading-[18px] text-center tabular-nums">{gc.peers}</span>
      )}
    </button>
  );
};

/** the lobby's card: by voice or with the camera, and who is in the call */
export const CallCard: React.FC<{ gc: GameCall }> = ({ gc }) => (
  <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5 space-y-3">
    <div className="flex items-center gap-3">
      <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${gc.inIt ? 'bg-emerald-600 text-white' : 'bg-emerald-600/10 text-emerald-700'}`}>
        <Phone className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight text-[#4a3426]">თამაშის ზარი</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">
          {gc.inIt ? `ზარში ხარ${gc.peers > 1 ? ` · ${gc.peers} მონაწილე` : ''}` : gc.peers ? `ზარშია ${gc.peers}` : 'ჯერ არავინაა ზარში'}
        </p>
      </div>
    </div>
    {gc.inIt ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" icon={<Maximize2 />} onClick={gc.show}>გაშლა</Btn>
        <Btn kind="danger" icon={<PhoneOff />} onClick={gc.leave}>გათიშვა</Btn>
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" icon={<Phone />} onClick={() => void gc.join('audio')}>ხმით</Btn>
        <Btn icon={<Video />} onClick={() => void gc.join('video')}>ვიდეოთი</Btn>
      </div>
    )}
    <Hint>ზარში ერთმანეთს ხედავთ და ბჭობთ, მემატიანე ღამის სიტყვებს ხმამაღლა კითხულობს. ღამით მიკროფონი და კამერა თავისით ითიშება, დილით ისევ ირთვება.</Hint>
  </section>
);

/** a player's microphone (`mic`) and camera (`cam`) go off while asked and come back as they were: the night darkens
 *  both, one who is out keeps their microphone off by day. A player may still turn them on by hand. */
export const useHush = (mic: boolean, cam: boolean, gc: GameCall) => {
  const was = useRef<{ mic?: boolean; cam?: boolean }>({});
  useEffect(() => {
    if (!gc.inIt) { was.current = {}; return; }
    const c = callState();
    const w = was.current;
    if (mic && w.mic === undefined) { w.mic = c.mic; if (c.mic) toggleMic(); }
    else if (!mic && w.mic !== undefined) { const on = w.mic; w.mic = undefined; if (on && !callState().mic) toggleMic(); }
    if (cam && w.cam === undefined) { w.cam = c.cam; if (c.cam) void toggleCam(); }
    else if (!cam && w.cam !== undefined) { const on = w.cam; w.cam = undefined; if (on && !callState().cam) void toggleCam(); }
  }, [mic, cam, gc.inIt]);
};
