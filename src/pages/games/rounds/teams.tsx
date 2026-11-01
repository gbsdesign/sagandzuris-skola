import React, { useEffect, useRef } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { MAX_TEAMS, MIN_TEAMS } from '../../../utils/roundGames';
import { TEAM_NAMES } from '../../../utils/amikhseni';
import { bell, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { FIELD } from '../../../components/ui/kit';
import { useNow } from './parts';

// The teams of a game on one phone (2026-11-01; „ჩამოთვალე!“, „ოთხეული“, „დღის სიტყვა“): the setup's editor (how many,
// their names, a colour each), the chips of whose turn it is and the points, and a turn's clock that ticks 3-2-1 and rings
// at its end.

/** a team's colour by its place — the same in every team game */
export const TEAM_TINT = ['#2b5f8a', '#cf7428', '#4f8a3c', '#5b3f8c', '#b23a48', '#24827e'];

export interface TeamsConf { teams: number; names: string[] }

export const readTeams = (raw: unknown): TeamsConf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<TeamsConf>;
  const teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(Number(o.teams)) || 2));
  const names = TEAM_NAMES.map((n, i) => { const v = o.names?.[i]; return (typeof v === 'string' && v.trim() ? v.trim() : n).slice(0, 16); });
  return { teams, names };
};

/** the names of the teams that play */
export const teamNames = (c: TeamsConf) => c.names.slice(0, c.teams).map(n => n.trim() || 'გუნდი');

const ROUND_BTN = 'w-11 h-11 rounded-full flex items-center justify-center text-[#7a2028] ring-1 ring-[#e8dcc8] bg-white disabled:opacity-35 cursor-pointer disabled:cursor-default';

export const TeamsEditor: React.FC<{ conf: TeamsConf; onChange: (c: TeamsConf) => void }> = ({ conf, onChange }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები · {conf.teams}</p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="ერთით ნაკლები" disabled={conf.teams <= MIN_TEAMS} onClick={() => { triggerHaptic(5); onChange({ ...conf, teams: conf.teams - 1 }); }} className={ROUND_BTN}><Minus className="w-4 h-4" /></button>
        <button type="button" aria-label="ერთით მეტი" disabled={conf.teams >= MAX_TEAMS} onClick={() => { triggerHaptic(5); onChange({ ...conf, teams: conf.teams + 1 }); }} className={ROUND_BTN}><Plus className="w-4 h-4" /></button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {conf.names.slice(0, conf.teams).map((n, i) => (
        <div key={i} className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ background: TEAM_TINT[i] }} aria-hidden="true" />
          <input
            value={n}
            maxLength={16}
            aria-label={`გუნდი ${i + 1}`}
            onChange={e => onChange({ ...conf, names: conf.names.map((x, k) => (k === i ? e.target.value : x)) })}
            onBlur={() => { if (!conf.names[i].trim()) onChange({ ...conf, names: conf.names.map((x, k) => (k === i ? TEAM_NAMES[i] : x)) }); }}
            className={`${FIELD} !h-11 !pl-8 !text-[14px] font-bold`}
          />
        </div>
      ))}
    </div>
  </div>
);

/** the teams with their points; the one on turn in its colour */
export const TeamChips: React.FC<{ names: string[]; scores: number[]; turn?: number }> = ({ names, scores, turn = -1 }) => (
  <ul className="flex flex-wrap gap-1.5" aria-label="გუნდები">
    {names.map((n, t) => {
      const on = t === turn;
      return (
        <li
          key={t}
          className={`h-10 pl-2.5 pr-3 rounded-full inline-flex items-center gap-2 text-[13.5px] font-bold ${on ? 'text-white shadow-[0_2px_6px_rgba(74,52,38,0.25)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}
          style={on ? { background: TEAM_TINT[t] } : undefined}
          aria-current={on ? 'true' : undefined}
        >
          <span className="w-3 h-3 rounded-full" style={{ background: on ? '#ffffff' : TEAM_TINT[t] }} aria-hidden="true" />
          <span className="max-w-[8rem] truncate">{n}</span>
          <span className="tabular-nums">{scores[t] ?? 0}</span>
        </li>
      );
    })}
  </ul>
);

/** a turn's seconds left while `running`: the last three tick, the end rings and calls `onEnd` once (a new `t0` starts again) */
export const useTurnClock = (audio: AudioRef, t0: number, secs: number, running: boolean, onEnd: () => void): number => {
  const now = useNow(running);
  const left = running ? Math.min(secs, Math.max(0, secs - (now - t0) / 1000)) : secs;
  const whole = Math.ceil(left);
  const ticked = useRef(-1);
  const end = useRef(onEnd);
  end.current = onEnd;
  useEffect(() => { ticked.current = -1; }, [t0]);
  useEffect(() => {
    if (!running) return;
    if (whole <= 3 && whole > 0 && ticked.current !== whole) { ticked.current = whole; tick(audio.current, whole === 1); }
    if (left <= 0) { bell(audio.current); end.current(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whole, running]);
  return left;
};
