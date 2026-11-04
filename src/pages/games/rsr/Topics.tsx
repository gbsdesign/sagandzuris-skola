import React, { useMemo } from 'react';
import { hangiPool } from '../../../data/hangiPool';
import { useMembership } from '../../../utils/memberAccess';
import { LISTEN, SNIPPET } from '../../../utils/raSadRodis';
import { Chip } from '../../../components/games/Chip';
import { setSettings, useConf, useMine } from './store';
import { activeTopics, topicRows } from './topics';

// The topics' chips of „რა? სად? როდის?“: in the room's lobby (the host's choice) and in the one-phone setup — one choice,
// kept on the phone.

/** the topics now: the rows, the active ids and how many questions they hold */
export const useTopics = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  // the recordings a member may hear make the „მოისმინე“ questions (none for guests)
  const listen = useMemo(() => hangiPool().length, [recordings]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = useMine();
  const { settings } = useConf();
  const rows = topicRows(listen, mine);
  const all = rows.map(t => t.id);
  const active = activeTopics(settings.topics, all);
  return { rows, all, active, available: rows.filter(t => active.includes(t.id)).reduce((s, t) => s + t.n, 0) };
};

export const RsrTopics: React.FC = () => {
  const { rows, all, active, available } = useTopics();
  const allOn = active.length === all.length;
  const toggle = (id: string) => {
    const next = active.includes(id) ? active.filter(t => t !== id) : [...active, id];
    if (next.length) setSettings({ topics: next.length === all.length ? [] : next });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
        <span className="text-[12.5px] tabular-nums text-[#9a8b7b]">{available} კითხვა</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
        <Chip on={allOn} onClick={() => setSettings({ topics: allOn ? [all[0]] : [] })}>ყველა</Chip>
        {rows.map(t => {
          const on = active.includes(t.id);
          return (
            <Chip key={t.id} on={on} onClick={() => toggle(t.id)}>
              {t.label} <span className={`tabular-nums ${on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{t.n}</span>
            </Chip>
          );
        })}
      </div>
      {active.includes(LISTEN) && (
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
          „მოისმინე“: სკოლის ჩანაწერის {SNIPPET}-წამიანი ნაწყვეტი. რომელი საგალობელია, რომელი დღესასწაულის, რომელი კუთხის სიმღერა?
        </p>
      )}
    </div>
  );
};
