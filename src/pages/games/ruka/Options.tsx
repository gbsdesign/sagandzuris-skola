import React, { useMemo } from 'react';
import { useMembership } from '../../../utils/memberAccess';
import { RUKA_TOPICS, type RukaTopic } from '../../../utils/ruka';
import { rukaHears, rukaItems } from '../../../data/rukaPool';
import { Chip } from '../../../components/games/Chip';
import { setHide, setTopics, useOpts } from './store';

// „რუკის ვიქტორინა“'s choices: in the room's lobby (the host's), in the one-phone setup and over a run alone — the topics (each
// with how many it holds) and, when the songs can be heard, whether a song shows its title. Kept on the phone.

export const RukaOptions: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const { topics, hide } = useOpts();
  const hears = useMemo(() => rukaHears(), [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => rukaItems(hears && hide), [hears, hide]);
  const counts = useMemo(() => {
    const m = new Map<RukaTopic, number>();
    for (const it of items) m.set(it.topic, (m.get(it.topic) ?? 0) + 1);
    return m;
  }, [items]);
  const all = RUKA_TOPICS.map(t => t.id).filter(id => (counts.get(id) ?? 0) > 0);
  const active = topics.filter(t => all.includes(t));
  const on = active.length ? active : all;
  const allOn = on.length === all.length;
  const toggle = (id: RukaTopic) => {
    const next = on.includes(id) ? on.filter(t => t !== id) : [...on, id];
    if (next.length) setTopics(next.length === all.length ? [] : next);
  };
  const total = on.reduce((s, id) => s + (counts.get(id) ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
          <span className="text-[12.5px] tabular-nums text-right text-[#9a8b7b]">{total} კითხვა</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
          <Chip on={allOn} onClick={() => setTopics(allOn ? [all[0]] : [])}>ყველა</Chip>
          {RUKA_TOPICS.filter(t => all.includes(t.id)).map(t => {
            const mine = on.includes(t.id);
            return (
              <Chip key={t.id} on={mine} onClick={() => toggle(t.id)}>
                {t.label}
                <span className={`ml-1 tabular-nums ${mine ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{counts.get(t.id)}</span>
              </Chip>
            );
          })}
        </div>
      </div>
      {hears && on.includes('song') && (
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">სიმღერა</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="სიმღერის სახელი">
            <Chip on={!hide} onClick={() => setHide(false)}>სახელით და ჰანგით</Chip>
            <Chip on={hide} onClick={() => setHide(true)}>მხოლოდ ჰანგით</Chip>
          </div>
          <p className="text-[12.5px] leading-snug text-[#9a8b7b]">{hide ? 'სიმღერის სახელი არ ჩანს — კუთხე მხოლოდ ყურით უნდა იცნო.' : 'სიმღერის სახელი ჩანს და მისი ნაწყვეტიც ჟღერს.'}</p>
        </div>
      )}
    </div>
  );
};
