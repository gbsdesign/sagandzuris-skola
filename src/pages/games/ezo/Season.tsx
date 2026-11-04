import React, { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { EZO_TEAMS, ezoGame } from '../../../data/ezoGames';
import { DRAW_POINTS, WIN_POINTS, dropLast, placesOfRows, standings, type EzoRound } from '../../../utils/ezo';
import { Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { freshSeason, setSeason, useSeason } from './store';

// „ეზოს მსაჯი“: the class's season on the referee's phone — every recorded round, a win 3 points, a draw 1.

const FROM = ['იანვრიდან', 'თებერვლიდან', 'მარტიდან', 'აპრილიდან', 'მაისიდან', 'ივნისიდან', 'ივლისიდან', 'აგვისტოდან', 'სექტემბრიდან', 'ოქტომბრიდან', 'ნოემბრიდან', 'დეკემბრიდან'];
const since = (t: number) => { const d = new Date(t); return `${d.getDate()} ${FROM[d.getMonth()]}`; };

/** one line of a recorded round */
export const roundLine = (r: EzoRound) => {
  const name = ezoGame(r.game)?.name ?? '';
  if (r.score) return `${name} · ${EZO_TEAMS[0]} ${r.score[0]} : ${r.score[1]} ${EZO_TEAMS[1]}`;
  if (!r.winners.length) return `${name} · გამარჯვებულის გარეშე`;
  return `${name} · ${r.winners.length > 1 ? 'გაიმარჯვეს' : 'გაიმარჯვა'}: ${r.winners.join(', ')}`;
};

export const SeasonCard: React.FC<{ fresh?: string | null }> = ({ fresh }) => {
  const s = useSeason();
  const [all, setAll] = useState(false);
  const rows = useMemo(() => standings(s), [s]);
  const places = placesOfRows(rows);
  const last = s.log[s.log.length - 1];
  const shown = all ? rows : rows.slice(0, 10);
  const undoLast = async () => {
    if (!last || !(await askConfirm({ title: 'ბოლო ჩანაწერი წაიშალოს?', text: roundLine(last), ok: 'წაშლა' }))) return;
    triggerHaptic(10);
    setSeason(dropLast(s));
  };
  const renew = async () => {
    if (!(await askConfirm({ title: 'ახალი სეზონი დაიწყოს?', text: 'ცხრილი და ყველა ჩანაწერი წაიშლება.', ok: 'ახალი სეზონი' }))) return;
    triggerHaptic(10);
    freshSeason();
  };
  return (
    <Card className="!p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#c9a227]/15 text-[#8a6416] flex items-center justify-center"><Trophy className="w-5 h-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-serif-ge text-[16px] font-bold leading-tight text-[#4a3426]">სეზონის ცხრილი</p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{s.log.length ? `${s.log.length} თამაში · ${since(s.start)}` : 'ჯერ არაფერია ჩაწერილი'}</p>
        </div>
      </div>
      {rows.length > 0 ? (
        <>
          <div role="table" aria-label="სეზონის ცხრილი" className="rounded-2xl ring-1 ring-[#e8dcc8] overflow-hidden">
            <div role="row" className="grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] items-center h-9 px-2 bg-[#fbf6ec] text-[12px] font-bold text-[#9a8b7b]">
              <span role="columnheader" className="text-center">#</span>
              <span role="columnheader">სახელი</span>
              <span role="columnheader" className="text-center">თამ.</span>
              <span role="columnheader" className="text-center">მოგ.</span>
              <span role="columnheader" className="text-right pr-1">ქულა</span>
            </div>
            {shown.map((r, i) => (
              <div key={r.name} role="row" className={`grid grid-cols-[2.25rem_1fr_3rem_3rem_3.5rem] items-center min-h-11 px-2 border-t border-[#f1e8d9] text-[14px] text-[#4a3426] ${places[i] === 1 ? 'bg-[#c9a227]/[0.08]' : ''}`}>
                <span role="cell" className="text-center font-bold tabular-nums text-[#a0703c]">{places[i]}</span>
                <span role="cell" className="min-w-0 font-bold leading-tight [overflow-wrap:anywhere]">{r.name}</span>
                <span role="cell" className="text-center tabular-nums text-[#75685a]">{r.played}</span>
                <span role="cell" className="text-center tabular-nums text-[#75685a]">{r.wins}</span>
                <span role="cell" className="text-right pr-1 font-bold tabular-nums">{r.points}</span>
              </div>
            ))}
          </div>
          {rows.length > 10 && (
            <button type="button" onClick={() => setAll(!all)} className="h-10 px-3 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
              <ChevronDown className={`w-4 h-4 transition-transform ${all ? 'rotate-180' : ''}`} />{all ? 'ათეული' : `ყველა · ${rows.length}`}
            </button>
          )}
        </>
      ) : (
        <p className="text-[13px] leading-snug text-[#75685a]">ჩაწერეთ მოთამაშეების სახელები და ითამაშეთ — ყოველი თამაშის ბოლოს გამარჯვებულები აქ ჩაიწერება.</p>
      )}
      {last && (
        <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${fresh === last.id ? 'bg-[#2f7d4f]/[0.08] ring-1 ring-[#2f7d4f]/30' : 'bg-[#fbf6ec]'}`}>
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#4a3426]"><span className="font-bold">{fresh === last.id ? 'ჩაიწერა: ' : 'ბოლოს: '}</span>{roundLine(last)}</p>
          <button type="button" onClick={() => { void undoLast(); }} aria-label="ბოლო ჩანაწერის წაშლა" className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><Undo2 className="w-4 h-4" /></button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-[#9a8b7b]">მოგება — {WIN_POINTS} ქულა, ფრე — {DRAW_POINTS}.</p>
        {s.log.length > 0 && (
          <button type="button" onClick={() => { void renew(); }} className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" />ახალი სეზონი
          </button>
        )}
      </div>
    </Card>
  );
};
