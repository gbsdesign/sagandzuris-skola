import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Eye, Minus, Play, Plus, RotateCcw, Trophy, Users } from 'lucide-react';
import { MAX_TEAMS, MIN_TEAMS, ROUND_COUNTS, hybridNext, hybridScores, markTeam, rulesOf, type HybridState } from '../../../utils/roundGames';
import { TEAM_NAMES } from '../../../utils/amikhseni';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, FIELD } from '../../../components/ui/kit';
import { bell, closeAudio, openAudio } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Hint } from '../samshvilde/parts';
import type { RoundFace } from './face';
import { useSnippet } from './useSnippet';
import { Podium, RoundHead, SnippetBox, Standings, TimerRing, useNow } from './parts';

// A quick game on one phone (the user's „ჰიბრიდული“, 2026-10-31): the host holds it, the class plays in teams. The round's
// piece plays on this phone and its time runs from the first ▶; the teams talk it over and write their answer down; the
// host opens the answer and marks each team — the phone adds it up. The game is kept on the device after every step (the
// page keeps it), so ✕ only pauses it.

export interface HybridConf { teams: number; names: string[]; count: number }

export const readHybridConf = (raw: unknown): HybridConf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<HybridConf>;
  const teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(Number(o.teams)) || 3));
  const names = TEAM_NAMES.map((n, i) => { const v = o.names?.[i]; return (typeof v === 'string' && v.trim() ? v.trim() : n).slice(0, 16); });
  return { teams, names, count: ROUND_COUNTS.includes(Number(o.count)) ? Number(o.count) : 8 };
};

export const HybridSetup: React.FC<{
  face: RoundFace; conf: HybridConf; setConf: (c: HybridConf) => void; paused: HybridState | null; empty: boolean;
  onStart: () => void; onResume: () => void;
}> = ({ face, conf, setConf, paused, empty, onStart, onResume }) => (
  <div className="space-y-4">
    {paused && (
      <Card className="!p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 basis-52">
            <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · რაუნდი {paused.at + 1} / {paused.rounds.length}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.teams.join(' · ')}</p>
          </div>
          <Btn onClick={onResume} icon={<Play />}>გაგრძელება</Btn>
        </div>
      </Card>
    )}
    <Card className="!p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები · {conf.teams}</p>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="ერთი გუნდით ნაკლები" disabled={conf.teams <= MIN_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams - 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Minus className="w-4 h-4" /></button>
          <button type="button" aria-label="ერთი გუნდით მეტი" disabled={conf.teams >= MAX_TEAMS} onClick={() => { triggerHaptic(5); setConf({ ...conf, teams: conf.teams + 1 }); }} className="w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {conf.names.slice(0, conf.teams).map((n, i) => (
          <input
            key={i}
            value={n}
            maxLength={16}
            aria-label={`გუნდი ${i + 1}`}
            onChange={e => setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? e.target.value : x)) })}
            onBlur={() => { if (!conf.names[i].trim()) setConf({ ...conf, names: conf.names.map((x, k) => (k === i ? TEAM_NAMES[i] : x)) }); }}
            className={`${FIELD} !h-11 !text-[14px] font-bold`}
          />
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">რაუნდები</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="რაუნდები">
          {ROUND_COUNTS.map(c => <Chip key={c} on={conf.count === c} onClick={() => setConf({ ...conf, count: c })}>{c}</Chip>)}
        </div>
      </div>
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13px] font-bold leading-snug text-amber-800">{face.empty}</p>}
      <Btn size="lg" full onClick={onStart} icon={<Play />} className="!h-14 !text-[16px]">{paused ? 'ახალი თამაში' : 'თამაშის დაწყება'}</Btn>
    </Card>
  </div>
);

export const HybridGame: React.FC<{ face: RoundFace; h: HybridState; setH: (h: HybridState) => void; onClose: () => void; onAgain: () => void }> = ({
  face, h, setH, onClose, onAgain,
}) => {
  const q = h.rounds[h.at];
  const snippet = useSnippet(face.clipSeconds);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const [endAt, setEndAt] = useState(0);
  const asking = h.phase === 'ask';
  const now = useNow(asking && endAt > 0);
  const total = rulesOf(q).seconds(q, 1);
  const left = endAt ? Math.max(0, (endAt - now) / 1000) : total;
  // a new round waits for its first ▶
  useEffect(() => { setEndAt(0); snippet.stop(); }, [h.at, h.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const rang = useRef(0);
  useEffect(() => {
    if (asking && endAt && left <= 0 && rang.current !== endAt) { rang.current = endAt; bell(audio.current); triggerHaptic(40); }
  }, [asking, endAt, left]);

  const clip = face.clip?.(q) ?? null;
  const tapClip = () => {
    openAudio(audio);
    if (!clip) return;
    if (snippet.state === 'play' || snippet.state === 'load') { snippet.stop(); return; }
    snippet.play(clip.url, clip.from);
    if (!endAt && asking) setEndAt(Date.now() + total * 1000);
  };
  const scores = hybridScores(h);
  const next = () => { triggerHaptic(12); snippet.stop(); setH(hybridNext(h)); };

  if (h.phase === 'end') {
    return (
      <TableScreen
        title={face.title}
        onClose={onClose}
        footer={(
          <div className="space-y-2">
            <Btn size="lg" full onClick={onAgain} icon={<RotateCcw />} className="!h-14 !text-[16px]">კიდევ ერთხელ</Btn>
            <button type="button" onClick={onClose} className="w-full h-11 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">დახურვა</button>
          </div>
        )}
      >
        <div className="py-2 space-y-4">
          <div className="text-center">
            <Trophy className="w-9 h-9 mx-auto text-[#c9a227]" />
            <p className="mt-1 font-serif-ge text-[22px] font-bold text-[#4a3426]">თამაში დასრულდა</p>
            <Hint>{h.rounds.length} რაუნდი · {h.teams.length} გუნდი</Hint>
          </div>
          <Podium names={h.teams} scores={scores} />
          <Standings names={h.teams} scores={scores} />
        </div>
      </TableScreen>
    );
  }

  if (h.phase === 'reveal') {
    const last = h.at + 1 >= h.rounds.length;
    const marks = h.marks[h.at];
    return (
      <TableScreen
        title={face.title}
        onClose={onClose}
        footer={<Btn size="lg" full onClick={next} icon={last ? <Trophy /> : <ChevronRight />} className="!h-14 !text-[16px]">{last ? 'შედეგები' : 'შემდეგი რაუნდი'}</Btn>}
      >
        <div className="py-2 space-y-4">
          <RoundHead at={h.at} total={h.rounds.length} />
          <face.Answer q={q} />
          <face.Reveal q={q} />
          <section className="space-y-2">
            <p className="text-[13.5px] font-bold text-[#4a3426]">რა დაწერა თითო გუნდმა?</p>
            <ul className="space-y-2">
              {h.teams.map((t, i) => (
                <li key={i} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-[14.5px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{t}</p>
                    <p className="shrink-0 text-[14px] font-bold tabular-nums text-[#a0703c]">{scores[i]} ქულა</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`${t} — ქულა`}>
                    {face.marks.map(m => (
                      <Chip key={m.points} on={marks[i] === m.points} onClick={() => setH(markTeam(h, i, marks[i] === m.points ? null : m.points))}>
                        {m.label}{m.points > 0 ? ` · ${m.points}` : ''}
                      </Chip>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} />}
        </div>
      </TableScreen>
    );
  }

  return (
    <TableScreen
      title={face.title}
      onClose={onClose}
      footer={<Btn size="lg" full onClick={next} icon={<Eye />} className="!h-14 !text-[16px]">პასუხის ჩვენება</Btn>}
    >
      <div className="py-2 space-y-4">
        <RoundHead at={h.at} total={h.rounds.length} />
        <div className="flex items-center gap-4">
          <TimerRing left={left} total={total} />
          <p className="min-w-0 flex-1 font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426]">{face.askTeams}</p>
        </div>
        {clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} note={endAt ? undefined : 'დრო პირველ ▶-ზე დაიწყება'} />}
        <Standings names={h.teams} scores={scores} />
      </div>
    </TableScreen>
  );
};
