import React, { useMemo } from 'react';
import { hangiPool } from '../../../data/hangiPool';
import { useMembership } from '../../../utils/memberAccess';
import { LISTEN, OTKHI_CLIP } from '../../../utils/otkhi';
import { Chip } from '../../../components/games/Chip';
import { setTopics, useMine, useTopics } from './store';
import { activeTopics, topicList } from './topics';

// The topics' chips of „ოთხიდან ერთი“: in the room's lobby (the host's choices) and in the one-phone setup. Kept on the phone.

export const Topics: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  // the recordings a member may hear make the „მოისმინე“ questions (none for guests)
  const listen = useMemo(() => hangiPool().length > 0, [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMine();
  const chosen = useTopics();
  const list = topicList(listen, mine);
  const all = list.map(t => t.id);
  const active = activeTopics(chosen, all);
  const allOn = active.length === all.length;
  const toggle = (id: string) => {
    const next = active.includes(id) ? active.filter(t => t !== id) : [...active, id];
    if (next.length) setTopics(next.length === all.length ? [] : next);
  };
  const written = list.filter(t => active.includes(t.id)).reduce((s, t) => s + t.n, 0);
  const listenOn = listen && active.includes(LISTEN);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
        <span className="text-[12.5px] tabular-nums text-right text-[#9a8b7b]">{written} კითხვა{listenOn ? ' + ჩანაწერები' : ''}</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
        <Chip on={allOn} onClick={() => setTopics(allOn ? [all[0]] : [])}>ყველა</Chip>
        {list.map(t => {
          const on = active.includes(t.id);
          return (
            <Chip key={t.id} on={on} onClick={() => toggle(t.id)}>
              {t.label}
              {t.n > 0 && <span className={`ml-1 tabular-nums ${on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{t.n}</span>}
            </Chip>
          );
        })}
      </div>
      {listenOn && (
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">„მოისმინე“: სკოლის ჩანაწერის {OTKHI_CLIP}-წამიანი ნაწყვეტი — რომელი საგალობელია, რომელი დღესასწაულის, რომელი სიმღერა?</p>
      )}
    </div>
  );
};
