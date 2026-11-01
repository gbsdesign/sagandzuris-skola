import React, { useState } from 'react';
import { Check, Dices, ListOrdered, MapPinned, Trophy } from 'lucide-react';
import { CHAMO_LISTS } from '../../../data/chamotvaleLists';
import { CHAMO_TOPICS, chamoSeconds, type ChamoList, type ChamoTopic } from '../../../utils/chamotvale';
import { clock } from '../../../utils/amikhseni';
import { triggerHaptic } from '../../../utils/haptics';
import { Chip } from '../../../components/games/Chip';
import { bests, readSeen } from './store';

// „ჩამოთვალე!“'s lists to choose from: the topics as chips, a card a list — how many members, the time, my best alone. A tap
// plays it (alone) or chooses it (the teams' setup); 🎲 takes one not played lately.

export const timeText = (ms: number) => clock(Math.round(ms / 1000));

/** a list not played lately on this phone, of the topic shown */
export const randomList = (topic: ChamoTopic | null): ChamoList => {
  const pool = CHAMO_LISTS.filter(l => !topic || l.topic === topic);
  const seen = readSeen();
  const fresh = pool.filter(l => !seen.includes(l.id));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
};

export const ListPicker: React.FC<{ chosen?: string | null; onPick: (l: ChamoList) => void }> = ({ chosen, onPick }) => {
  const [topic, setTopic] = useState<ChamoTopic | null>(null);
  const best = bests.use();
  const lists = CHAMO_LISTS.filter(l => !topic || l.topic === topic);
  const pick = (l: ChamoList) => { triggerHaptic(8); onPick(l); };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="თემა">
        <Chip on={!topic} onClick={() => setTopic(null)}>ყველა</Chip>
        {CHAMO_TOPICS.map(t => <Chip key={t.id} on={topic === t.id} onClick={() => setTopic(t.id)}>{t.label}</Chip>)}
      </div>
      <ul className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2">
        {lists.map(l => {
          const b = best[l.id];
          const on = chosen === l.id;
          const whole = b && b.found >= b.n;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => pick(l)}
                aria-pressed={chosen !== undefined ? on : undefined}
                className={`w-full min-h-[64px] rounded-2xl px-3.5 py-2.5 text-left flex items-center gap-3 transition active:scale-[0.99] cursor-pointer ${on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_2px_8px_rgba(122,32,40,0.3)]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:bg-[#fbf6ec]'}`}
              >
                <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${on ? 'bg-white/15' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`} aria-hidden="true">
                  {l.map ? <MapPinned className="w-5 h-5" /> : <ListOrdered className="w-5 h-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-bold leading-snug">{l.title}</span>
                  <span className={`mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] font-bold ${on ? 'text-[#fbf6ec]/80' : 'text-[#8c7b66]'}`}>
                    <span>{l.items.length} · {clock(chamoSeconds(l.items.length))}</span>
                    {b && (
                      <span className={`inline-flex items-center gap-1 ${on ? '' : whole ? 'text-[#2f7d4f]' : 'text-[#a0703c]'}`}>
                        {whole ? <Check className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
                        {whole ? `სრული · ${timeText(b.ms)}` : `${b.found} / ${b.n}`}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => pick(randomList(topic))}
        className="w-full h-12 rounded-2xl bg-[#7a2028]/[0.07] text-[#7a2028] text-[14px] font-bold inline-flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
      >
        <Dices className="w-5 h-5" /> შემთხვევითი სია
      </button>
    </div>
  );
};
