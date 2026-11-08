import React, { useState } from 'react';
import { Grape, Info } from 'lucide-react';
import { Card, Sheet, Stat } from '../../ui/kit';
import { MONTHS_GE } from '../../../utils/dateNames';
import { BUNCH_AT, LEAF_CAP, RECENT_DAYS, monthShort, vineMood, yellowShare, type Vine } from '../../../utils/vazi';
import { BUNCH_SLOTS } from '../../../utils/vineShape';
import { VineArt, type BunchLook } from './VineArt';
import { useVine } from './useVine';

// „ჩემი ვაზი“ at the head of „ჩვევები“ (2026-11-09, the user: „თამაში აქედან ამოიღე … ჩვევებს თავში … ჩვევების მოტივაციად“,
// answer „სრული, ყველაფერი ღია“; it was a game of the hub with a hybrid harvest and a print kit, both gone): my vine, what grew
// this month's bunch on its way, the last two weeks; how it grows opens from the ⓘ on the picture (the user, 2026-11-09:
// „დღეს“ off, „ინსტრუქცია პატარა ნიშით … მარჯვნივ მაღლა“). The rules are unchanged (utils/vazi.ts).


/** the season's bunches as the picture shows them: each finished month's ripe ones (purple and golden in turn), then this
 *  month's, still green */
export const bunchLooks = (v: Vine): BunchLook[] => [
  ...v.ripe.flatMap((m, i) => Array<BunchLook>(m.bunches).fill(i % 2 ? 'gold' : 'purple')),
  ...Array<BunchLook>(v.month.bunches).fill('green'),
];

export const HabitVine: React.FC = () => {
  const { vine, loaded, member, name } = useVine();
  const [info, setInfo] = useState(false);
  const looks = bunchLooks(vine);
  const { month } = vine;
  const goal = month.next ?? BUNCH_AT[BUNCH_AT.length - 1];
  const monthName = MONTHS_GE[+month.key.slice(5, 7) - 1] ?? '';
  return (
    <div className="space-y-4">
      <Card className="!p-0 overflow-hidden relative">
        <button
          type="button"
          onClick={() => setInfo(true)}
          aria-label="როგორ იზრდება ვაზი"
          title="როგორ იზრდება ვაზი"
          className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-white/90 ring-1 ring-[#e8dcc8] shadow-sm inline-flex items-center justify-center text-[#7a2028] active:scale-95 transition"
        >
          <Info className="w-[18px] h-[18px]" />
        </button>
        <VineArt
          leaves={loaded ? vine.recent : 0}
          wood={loaded ? vine.leaves : 0}
          bunches={loaded ? looks : []}
          yellow={yellowShare(vine.idle)}
          fresh={vine.today}
          name={name || undefined}
          cellar={vine.cellar}
          className="block w-full h-auto"
        />
        <div className="px-4 pt-3 pb-4 space-y-3">
          <p className="text-[15px] leading-snug font-bold text-[#4a3426]" role="status">{loaded ? vineMood(vine) : 'ვაზს ვნახულობთ…'}</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat value={vine.recent} label="ფოთოლი ვაზზე" tone="green" />
            <Stat value={vine.seasonBunches} label="მტევანი წელს" tone="wine" />
            <Stat value={vine.cellar} label="ქვევრში" />
          </div>
          {looks.length > BUNCH_SLOTS.length && (
            <p className="text-[12.5px] text-[#75685a]">ვაზზე {looks.length} მტევანია — ნახატზე {BUNCH_SLOTS.length} ჩანს.</p>
          )}
        </div>
      </Card>

      <Card className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#4b2b5f]/[0.09] text-[#4b2b5f] inline-flex items-center justify-center"><Grape className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">
              {monthName} — {month.bunches ? `${month.bunches} მტევანი მწიფდება` : 'მტევანი ჯერ არ არის'}
            </p>
            <p className="text-[13px] leading-snug text-[#75685a]">
              {month.next ? `კიდევ ${month.next - month.leaves} ფოთოლი და ${month.bunches ? 'კიდევ ერთი' : 'პირველი'} მტევანი გამოჩნდება.` : 'ამ თვეს სამივე მტევანი მოისხა!'} თვის ბოლოს მწიფდება.
            </p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-[#efe5d3] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, month.leaves)} aria-label="ამ თვის ფოთლები">
          <div className="h-full rounded-full bg-[#6c9f45] transition-[width] duration-700" style={{ width: `${Math.min(100, (month.leaves / goal) * 100)}%` }} />
        </div>
        <p className="flex justify-between text-[12px] text-[#9a8b7b] tabular-nums">
          <span>{month.leaves} ფოთოლი</span>
          <span>მტევნები: {BUNCH_AT.join(' · ')} ფოთოლზე</span>
        </p>
        {vine.ripe.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {vine.ripe.map(m => (
              <span key={m.key} className="h-8 px-3 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] inline-flex items-center gap-1.5 text-[13px] font-bold text-[#4a3426]">
                {monthShort(m.key)} <Grape className="w-3.5 h-3.5 text-[#4b2b5f]" /> {m.bunches}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">ბოლო ორი კვირა</p>
        <div className="mt-3 flex items-end gap-1" aria-label="ფოთლები დღეების მიხედვით">
          {vine.days.map((d, i) => (
            <div key={d.iso} className="flex-1 min-w-0 flex flex-col items-center gap-1" title={`${+d.iso.slice(8)} — ${d.leaves} ფოთოლი`}>
              <span className="text-[11px] font-bold tabular-nums text-[#4f7f34] h-3.5 leading-none">{d.leaves || ''}</span>
              <div
                className={`w-full max-w-[18px] rounded-md ${d.leaves ? 'bg-[#6c9f45]' : 'bg-[#e8dcc8]'} ${i === vine.days.length - 1 ? 'ring-2 ring-[#7a2028]/40 ring-offset-1' : ''}`}
                style={{ height: `${6 + (d.leaves / LEAF_CAP) * 50}px` }}
              />
              <span className={`text-[11px] tabular-nums ${i === vine.days.length - 1 ? 'font-bold text-[#7a2028]' : 'text-[#9a8b7b]'}`}>{+d.iso.slice(8)}</span>
            </div>
          ))}
        </div>
      </Card>

      <Sheet open={info} onClose={() => setInfo(false)} title="როგორ იზრდება ვაზი">
        <div className="space-y-2 text-[14px] leading-snug text-[#4a3426]">
          <p>ყოველი საქმე ფოთოლია: მონიშნული ჩვევა, დასრულებული დღის თამაში, სწავლის რეჟიმში ნავარჯიშები ნაწილი, ოსტატობის სავარჯიშო. დღეში {LEAF_CAP} ფოთოლამდე.</p>
          <p>თვეში {BUNCH_AT[0]} ფოთოლი — მტევანი, {BUNCH_AT[1]} — მეორე, {BUNCH_AT[2]} — მესამე. მტევანი მწვანეა, თვე რომ დამთავრდება — მწიფდება.</p>
          <p>წელიწადი ნოემბრიდან ოქტომბრამდეა: შემოდგომის რთველზე კლასი მტევნებს ერთად ითვლის, 1 ნოემბერს კი ისინი ქვევრში მიდის.</p>
          <p>ფოთოლი ვაზზე {RECENT_DAYS} დღე რჩება, მერე ცვივა — ვაზი კი ყოველი ფოთლით იზრდება და ძირი უმსხვილდება{vine.leaves ? ` (სულ ${vine.leaves} ფოთოლი გამოიტანა)` : ''}.</p>
          <p>სამი დღე უსაქმოდ — ვაზი ყვითლდება, მაგრამ არასოდეს კვდება: ერთი საქმეც და ისევ გამწვანდება.</p>
          {!member && <p>შედი სკოლაში — ჩვევები, სწავლა და სავარჯიშოებიც გაზრდის ვაზს. ახლა მხოლოდ ამ ტელეფონზე ნათამაშები დღის თამაშები ითვლება.</p>}
        </div>
      </Sheet>
    </div>
  );
};
