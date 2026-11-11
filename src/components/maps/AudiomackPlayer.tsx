import React, { useState } from 'react';
import { audiomackSongEmbed } from '../../data/audiomack';
import { triggerHaptic } from '../../utils/haptics';

// A recording heard through Audiomack's own player (data/audiomack.ts). A learning take has a separate Audiomack track
// for each voice: the chips choose which one sounds (all voices first) — Audiomack plays one track at a time.

const LABELS = ['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'];

/** `slugs` in the player's order [voice I, voice II, voice III, all] */
export const AudiomackPlayer: React.FC<{ slugs: (string | undefined)[]; title: string }> = ({ slugs, title }) => {
  // all voices first, then I, II, III
  const order = [3, 0, 1, 2].filter(i => slugs[i]);
  const [pick, setPick] = useState(order[0]);
  const cur = slugs[pick] ? pick : order[0];
  const slug = slugs[cur];
  if (!slug) return null;
  return (
    <div className="flex flex-col gap-2">
      {order.length > 1 && (
        <div className="flex flex-wrap gap-1.5 px-1" role="radiogroup" aria-label="რომელი ხმა ისმის">
          {order.map(i => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === cur}
              onClick={() => { triggerHaptic(8); setPick(i); }}
              className={`min-h-10 px-3.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                i === cur ? 'bg-[#7a2028] text-white shadow-[0_4px_10px_-6px_rgba(122,32,40,0.8)]' : 'bg-[#f7f1e6] text-[#7a2028] hover:bg-[#f1e6d3]'
              }`}
            >
              {LABELS[i]}
            </button>
          ))}
        </div>
      )}
      <iframe
        key={slug}
        title={`${title} · ${LABELS[cur]}`}
        src={audiomackSongEmbed(slug)}
        className="block w-full h-[276px] border-0 rounded-xl bg-[#2a1d16]"
        allow="autoplay"
        loading="lazy"
      />
    </div>
  );
};

/** The player's place while the Audiomack list loads (a moment; then the player or the school's own) */
export const PlayerShade: React.FC = () => (
  <div className="h-[276px] rounded-xl bg-[#f3ebdd] animate-pulse" aria-label="იტვირთება" />
);
