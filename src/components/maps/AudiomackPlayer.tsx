import React, { useState } from 'react';
import { audiomackSongEmbed } from '../../data/audiomack';
import { triggerHaptic } from '../../utils/haptics';

// A recording heard through Audiomack's own player (data/audiomack.ts). A learning take has a separate Audiomack track
// for each voice: the chips choose which one sounds (all voices first) — Audiomack plays one track at a time.

export const VOICE_LABELS = ['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'];
const LABELS = VOICE_LABELS;

/** The slots a take has, in the order they are offered: all voices first, then I, II, III */
export const voiceOrder = (have: unknown[]) => [3, 0, 1, 2].filter(i => have[i]);

/** The voice chips of a learning take (`have` in the player's order [I, II, III, all]) */
export const VoiceChips: React.FC<{ have: unknown[]; cur: number; onPick: (slot: number) => void }> = ({ have, cur, onPick }) => {
  const order = voiceOrder(have);
  if (order.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1" role="radiogroup" aria-label="რომელი ხმა ისმის">
      {order.map(i => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={i === cur}
          onClick={() => { triggerHaptic(8); onPick(i); }}
          className={`min-h-10 px-3.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
            i === cur ? 'bg-[#7a2028] text-white shadow-[0_4px_10px_-6px_rgba(122,32,40,0.8)]' : 'bg-[#f7f1e6] text-[#7a2028] hover:bg-[#f1e6d3]'
          }`}
        >
          {LABELS[i]}
        </button>
      ))}
    </div>
  );
};

/** `slugs` in the player's order [voice I, voice II, voice III, all]; `voice` + `onVoice` let the page hold the choice */
export const AudiomackPlayer: React.FC<{ slugs: (string | undefined)[]; title: string; voice?: number; onVoice?: (slot: number) => void }> = ({ slugs, title, voice, onVoice }) => {
  const order = voiceOrder(slugs);
  const [own, setOwn] = useState(order[0]);
  const pick = voice ?? own;
  const cur = slugs[pick] ? pick : order[0];
  const slug = slugs[cur];
  if (!slug) return null;
  return (
    <div className="flex flex-col gap-2">
      <VoiceChips have={slugs} cur={cur} onPick={i => (onVoice ? onVoice(i) : setOwn(i))} />
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
