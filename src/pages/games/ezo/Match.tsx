import React, { useEffect, useRef, useState } from 'react';
import { Check, Flag, Megaphone, Pause, Play, RotateCcw, Square, Undo2 } from 'lucide-react';
import { EZO_TEAMS, EZO_TEAMS_DAT, EZO_TEAMS_ERG, EZO_TINT, ezoGame } from '../../../data/ezoGames';
import {
  LAST_MINUTE, addPoint, endMatch, kickOff, leftMs, matchRound, matchWinner, pauseMatch, resumeMatch, scoreOf, undoPoint, type EzoMatch, type EzoRound,
} from '../../../utils/ezo';
import { clock } from '../../../utils/amikhseni';
import { closeAudio, openAudio, tick, whistle } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, askConfirm } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import { useNow } from '../rounds/parts';
import { useShort } from '../utskho/parts';
import { roundId } from './store';

// „ეზოს მსაჯი“: a teams game on the referee's phone — 3-2-1 and the long whistle, the clock, a big button a team for its
// point (two short blasts), the whistle to stop play, the last minute, three short blasts at the end; the result goes into
// the season by itself. ✕ only pauses (the game is kept on the phone).

const Clock: React.FC<{ left: number; total: number; big?: boolean }> = ({ left, total, big }) => {
  const s = Math.ceil(left / 1000);
  const urgent = left <= LAST_MINUTE;
  return (
    <div className="w-full flex flex-col items-center gap-2">
      <p role="timer" aria-label={`დარჩა ${clock(s)}`} className={`font-serif-ge font-bold tabular-nums leading-none ${big ? 'text-[72px]' : 'text-[52px]'} ${urgent ? 'text-[#c0392b]' : 'text-[#4a3426]'}`}>{clock(s)}</p>
      <div className="w-full max-w-xs h-2 rounded-full bg-[#f1e8d9] overflow-hidden">
        <div className={`h-full rounded-full ${urgent ? 'bg-[#c0392b]' : 'bg-[#7a2028]'}`} style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%`, transition: 'width 0.25s linear' }} />
      </div>
    </div>
  );
};

const TeamButton: React.FC<{ t: 0 | 1; score: number; point: string; names: string[]; live: boolean; onTap: () => void; short: boolean }> = ({ t, score, point, names, live, onTap, short }) => (
  <button
    type="button"
    onClick={onTap}
    disabled={!live}
    aria-label={`${EZO_TEAMS[t]} — ${point} (${score})`}
    className={`w-full ${short ? 'h-full min-h-0' : 'min-h-[176px]'} rounded-3xl px-3 py-3 flex flex-col items-center justify-center gap-1 text-white cursor-pointer transition active:scale-[0.97] disabled:cursor-default ${live ? 'shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)]' : 'opacity-90'}`}
    style={{ background: EZO_TINT[t] }}
  >
    <span className="text-[15px] font-bold leading-tight">{EZO_TEAMS[t]}</span>
    <span className={`font-serif-ge font-bold tabular-nums leading-none ${short ? 'text-[54px]' : 'text-[64px]'}`}>{score}</span>
    {live
      ? <span className="mt-1 h-9 px-3.5 rounded-full bg-white/20 inline-flex items-center gap-1.5 text-[14px] font-bold"><Flag className="w-4 h-4" />+1 {point}</span>
      : names.length > 0 && <span className="mt-1 max-w-full text-[12.5px] leading-snug text-white/90 [overflow-wrap:anywhere]">{names.join(', ')}</span>}
  </button>
);

export const MatchScreen: React.FC<{
  m: EzoMatch;
  setM: (m: EzoMatch | null) => void;
  onRecord: (r: EzoRound) => void;
  onClose: () => void;
}> = ({ m, setM, onRecord, onClose }) => {
  const g = ezoGame(m.game)!;
  const point = g.point ?? 'ქულა';
  const audio = useRef<AudioContext | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);
  const short = useShort();
  const running = m.t0 > 0 && !m.ended;
  const now = useNow(running);
  const left = leftMs(m, now);
  const lastMinute = useRef(left <= LAST_MINUTE);
  const finishing = useRef(false);
  const mRef = useRef(m);
  mRef.current = m;
  useEffect(() => () => closeAudio(audio), []);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const finish = (at: number) => {
    if (finishing.current) return;
    finishing.current = true;
    const done = endMatch(mRef.current, at);
    whistle(audio.current, 'sss');
    triggerHaptic(60);
    setM(done);
    const r = matchRound(done, Date.now(), roundId());
    onRecord(r);
    setRecorded(r.id);
  };

  // the time is up; the last minute is said once
  useEffect(() => {
    if (!running) return;
    if (left <= 0) { finish(m.t0 + (m.ms - m.spent)); return; }
    if (left <= LAST_MINUTE && !lastMinute.current) {
      lastMinute.current = true;
      tick(audio.current, true);
      triggerHaptic(60);
      setBanner('ბოლო წუთი!');
    }
  });

  // 3-2-1, then the long whistle starts the clock
  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      whistle(audio.current, 'l');
      triggerHaptic(80);
      setM(kickOff(mRef.current, Date.now()));
      setCount(null);
      return;
    }
    tick(audio.current, count === 1);
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [count, setM]);

  const start = () => { openAudio(audio); triggerHaptic(10); setCount(3); };
  const score = (t: 0 | 1) => {
    openAudio(audio);
    whistle(audio.current, 'ss');
    triggerHaptic(60);
    setM(addPoint(m, t, Date.now()));
    setBanner(`${point} — ${EZO_TEAMS_DAT[t]}! ${m.game === 'ordrosha' ? 'დროშა ადგილზე, ყველა თავის ნახევარში.' : 'ბურთი შუა წრეში, გუნდები თავის ნახევარში.'}`);
  };
  const pause = () => { openAudio(audio); whistle(audio.current, 's'); triggerHaptic(20); setM(pauseMatch(m, Date.now())); };
  const resume = () => { openAudio(audio); whistle(audio.current, 'l'); triggerHaptic(20); setM(resumeMatch(m, Date.now())); };
  const stopPlay = () => { openAudio(audio); whistle(audio.current, 's'); triggerHaptic(15); };
  const end = async () => {
    if (!(await askConfirm({ title: 'თამაში ახლა დასრულდეს?', text: 'შედეგი სეზონის ცხრილში ჩაიწერება.', ok: 'დასრულება' }))) return;
    openAudio(audio);
    finish(Date.now());
  };
  const close = () => { setM(pauseMatch(m, Date.now())); onClose(); };
  const again = () => {
    finishing.current = false;
    lastMinute.current = false;
    setRecorded(null);
    setM({ ...m, spent: 0, t0: 0, points: [], kicked: false, ended: false });
  };

  const [a, b] = scoreOf(m);

  if (m.ended) {
    const w = matchWinner(m);
    return (
      <TableScreen
        title={`${g.name} · შედეგი`}
        onClose={() => { setM(null); onClose(); }}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={() => { setM(null); onClose(); }} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={again} className="!h-14 !text-[15.5px]">რევანში</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-2xl mx-auto space-y-5 py-4 text-center">
          <div className="flex items-center justify-center gap-4">
            {([0, 1] as const).map(t => (
              <div key={t} className="flex-1 max-w-[11rem] rounded-3xl px-3 py-4 text-white" style={{ background: EZO_TINT[t], opacity: w === null || w === t ? 1 : 0.55 }}>
                <p className="text-[15px] font-bold">{EZO_TEAMS[t]}</p>
                <p className="font-serif-ge text-[60px] font-bold leading-none tabular-nums">{t === 0 ? a : b}</p>
              </div>
            ))}
          </div>
          <p className="font-serif-ge text-[24px] font-bold leading-tight text-[#4a3426]">{w === null ? 'ფრე!' : `გაიმარჯვეს ${EZO_TEAMS_ERG[w]}!`}</p>
          {w !== null && m.teams[w].length > 0 && <p className="text-[14px] leading-snug text-[#75685a] [overflow-wrap:anywhere]">{m.teams[w].join(', ')}</p>}
          <p className="text-[13.5px] leading-snug text-[#75685a]">ახლა — ხელის ჩამორთმევა: ყოველი მოთამაშე მოწინააღმდეგეს ხელს ართმევს.</p>
          {recorded && <p className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#2f7d4f]"><Check className="w-4 h-4" />ჩაიწერა სეზონის ცხრილში</p>}
          <p className="text-[12.5px] text-[#9a8b7b]">„რევანში“ — იგივე გუნდები, ახალი თამაში. ნახევრები გაცვალეთ.</p>
        </div>
      </TableScreen>
    );
  }

  const live = m.kicked && count === null;
  const status = count !== null ? 'მზადება…' : !m.kicked ? 'გუნდები თავის ნახევარში' : running ? (left <= LAST_MINUTE ? 'ბოლო წუთი!' : 'თამაში მიდის') : 'პაუზა';
  const footer = !m.kicked
    ? <Btn size="lg" full icon={<Play />} onClick={start} disabled={count !== null} className="!h-14 !text-[16px]">დაწყება · 3-2-1 და სასტვენი</Btn>
    : (
      <div className="grid grid-cols-2 gap-2">
        {running
          ? <Btn kind="ghost" size="lg" full icon={<Pause />} onClick={pause} className="!h-14 !text-[15.5px]">პაუზა</Btn>
          : <Btn size="lg" full icon={<Play />} onClick={resume} className="!h-14 !text-[15.5px]">გაგრძელება</Btn>}
        <Btn kind="ghost" size="lg" full icon={<Square />} onClick={() => { void end(); }} className="!h-14 !text-[15.5px]">დასრულება</Btn>
      </div>
    );

  const centre = (
    <div className={`flex flex-col items-center gap-3 ${short ? 'justify-center' : ''}`}>
      <p className={`text-[13px] font-bold ${running && left <= LAST_MINUTE ? 'text-[#c0392b]' : 'text-[#9a8b7b]'}`}>{status}</p>
      {count !== null
        ? <p aria-live="assertive" className="font-serif-ge text-[88px] font-bold leading-none text-[#7a2028] tabular-nums">{count}</p>
        : <Clock left={left} total={m.ms} big={!short} />}
      <button
        type="button"
        onClick={stopPlay}
        disabled={!m.kicked}
        className="mt-1 w-[76px] h-[76px] rounded-full bg-[#4a3426] text-[#fbf6ec] flex flex-col items-center justify-center gap-0.5 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.6)] active:scale-[0.95] transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
      >
        <Megaphone className="w-6 h-6" />
        <span className="text-[11.5px] font-bold">სასტვენი</span>
      </button>
    </div>
  );

  return (
    <TableScreen
      title={g.name}
      onClose={close}
      right={m.points.length > 0 && !m.ended ? (
        <button type="button" onClick={() => { triggerHaptic(10); setM(undoPoint(m)); }} aria-label="ბოლო ქულის გაუქმება" className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
          <Undo2 className="w-4 h-4" />ქულა
        </button>
      ) : undefined}
      footer={footer}
    >
      {short ? (
        <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto grid grid-cols-[1fr_auto_1fr] gap-4 items-stretch py-1">
          <TeamButton t={0} score={a} point={point} names={m.teams[0]} live={live} onTap={() => score(0)} short />
          <div className="flex flex-col justify-center min-w-[12rem]">{centre}{banner && <p role="status" className="mt-2 max-w-[14rem] text-center text-[13px] font-bold leading-snug text-[#7a2028]">{banner}</p>}</div>
          <TeamButton t={1} score={b} point={point} names={m.teams[1]} live={live} onTap={() => score(1)} short />
        </div>
      ) : (
        <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col justify-center gap-4 py-2">
          {centre}
          <p role="status" className={`min-h-[2.6rem] px-2 text-center text-[13.5px] font-bold leading-snug text-[#7a2028] transition-opacity ${banner ? 'opacity-100' : 'opacity-0'}`}>{banner ?? ''}</p>
          <div className="grid grid-cols-2 gap-3">
            <TeamButton t={0} score={a} point={point} names={m.teams[0]} live={live} onTap={() => score(0)} short={false} />
            <TeamButton t={1} score={b} point={point} names={m.teams[1]} live={live} onTap={() => score(1)} short={false} />
          </div>
        </div>
      )}
    </TableScreen>
  );
};
