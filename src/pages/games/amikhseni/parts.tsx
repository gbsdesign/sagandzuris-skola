import React, { useMemo } from 'react';
import {
  Clapperboard, Guitar, House, Landmark, MicVocal, Mountain, Music, Music4, ScrollText, Shirt, Sparkles, Swords, Trees, Trophy,
  Utensils, type LucideIcon,
} from 'lucide-react';
import { WORD_CATEGORIES } from '../../../data/amikhseniWords';
import { buildDeck } from '../../../utils/amikhseni';
import { Chip } from '../../../components/games/Chip';
import { ALL_CATS, setSettings, useConf } from './store';

// The pieces of „ამიხსენი“ both tabs share (2026-11-04): each theme's colour and mark (the print kit's,
// src/print/games/amikhseni.js), its chip, and the themes to choose — in the room's lobby and in the one-phone
// setup alike.

export const THEME_LOOK: Record<string, { color: string; Icon: LucideIcon }> = {
  galoba: { color: '#4a55a0', Icon: Music4 },
  musika: { color: '#2f5d8a', Icon: Music },
  sakravebi: { color: '#a0522d', Icon: Guitar },
  simgera: { color: '#6b4c9a', Icon: MicVocal },
  kutkhe: { color: '#2f7d4f', Icon: Mountain },
  samosi: { color: '#b0475f', Icon: Shirt },
  samzareulo: { color: '#c7701e', Icon: Utensils },
  buneba: { color: '#6f8a1f', Icon: Trees },
  gmirebi: { color: '#7a2028', Icon: Swords },
  kino: { color: '#3f4652', Icon: Clapperboard },
  sporti: { color: '#1c7f86', Icon: Trophy },
  tsmindanebi: { color: '#8e3d7f', Icon: Sparkles },
  tsinaprebi: { color: '#3d6b6b', Icon: ScrollText },
  qopa: { color: '#5a4636', Icon: House },
  istoria: { color: '#b0841f', Icon: Landmark },
};
const lookOf = (id: string) => THEME_LOOK[id] ?? { color: '#7a2028', Icon: Music };
export const themeLabel = (id: string) => WORD_CATEGORIES.find(c => c.id === id)?.label ?? '';

/** a theme's chip: its colour, its mark and its name */
export const ThemeTag: React.FC<{ theme: string; light?: boolean; big?: boolean }> = ({ theme, light, big }) => {
  const label = themeLabel(theme);
  if (!label) return null;
  const { color, Icon } = lookOf(theme);
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-[18px] pl-1 pr-3 py-1 font-bold ${big ? 'text-[15px]' : 'text-[13px]'} ${light ? 'bg-white/15 text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
      <span className={`${big ? 'w-7 h-7' : 'w-6 h-6'} shrink-0 rounded-full inline-flex items-center justify-center`} style={{ background: color }}>
        <Icon className={`${big ? 'w-4 h-4' : 'w-3.5 h-3.5'} text-white`} aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-snug">{label}</span>
    </span>
  );
};

/** the themes the words come from (both tabs): „ყველა“, or any of them — one at least */
export const AmikThemes: React.FC = () => {
  const { settings } = useConf();
  const chosen = settings.categories;
  const allOn = chosen.length === ALL_CATS.length;
  const words = useMemo(() => buildDeck(WORD_CATEGORIES, chosen, () => 0.5).length, [chosen]);
  const toggle = (id: string) => {
    const next = chosen.includes(id) ? chosen.filter(c => c !== id) : [...chosen, id];
    if (next.length) setSettings({ categories: ALL_CATS.filter(c => next.includes(c)) });
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
        <span className="text-[12.5px] tabular-nums text-[#9a8b7b]">{words} სიტყვა</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
        <Chip on={allOn} onClick={() => setSettings({ categories: ALL_CATS })}>ყველა</Chip>
        {WORD_CATEGORIES.map(c => {
          const on = chosen.includes(c.id);
          const { Icon } = lookOf(c.id);
          return (
            <Chip key={c.id} on={on} onClick={() => toggle(c.id)}>
              <span className="inline-flex items-center gap-1.5">
                <Icon className="w-4 h-4" aria-hidden="true" />{c.label}
                <span className={`tabular-nums ${on ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{c.words.length}</span>
              </span>
            </Chip>
          );
        })}
      </div>
    </div>
  );
};
