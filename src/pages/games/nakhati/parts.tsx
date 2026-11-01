import React, { useEffect, useState } from 'react';
import { Castle, Guitar, Hammer, Mountain, PawPrint, Shirt, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { NAKHATI_THEMES, nakhatiTheme } from '../../../data/nakhatiWords';
import { Chip } from '../../../components/games/Chip';
import { setThemes, useThemes } from './store';

// The pieces of „ნახატობანა“ (2026-11-01): each theme's mark and chip, and the game's own choice — the themes — in the room's
// lobby, the one-phone setup and the riddle.

export const THEME_ICON: Record<string, LucideIcon> = {
  sufra: UtensilsCrossed, samosi: Shirt, musika: Guitar, buneba: PawPrint, adgilebi: Mountain, sakme: Hammer, zghapari: Castle,
};

/** a theme's chip: its colour, its mark and its name */
export const ThemeTag: React.FC<{ theme: string; light?: boolean }> = ({ theme, light }) => {
  const t = nakhatiTheme(theme);
  if (!t) return null;
  const Icon = THEME_ICON[t.id] ?? UtensilsCrossed;
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-[18px] pl-1 pr-3 py-1 text-[13px] font-bold ${light ? 'bg-white/15 text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
      <span className="w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center" style={{ background: t.color }}>
        <Icon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-snug">{t.label}</span>
    </span>
  );
};

/** the themes to draw from (none chosen = all) */
export const NakhatiOptions: React.FC = () => {
  const chosen = useThemes();
  const all = NAKHATI_THEMES.map(t => t.id);
  const active = chosen.filter(id => all.includes(id));
  const allOn = !active.length || active.length === all.length;
  const toggle = (id: string) => {
    const now = allOn ? [] : active;
    const next = now.includes(id) ? now.filter(t => t !== id) : [...now, id];
    setThemes(next.length === all.length ? [] : next);
  };
  const words = NAKHATI_THEMES.filter(t => allOn || active.includes(t.id)).reduce((s, t) => s + t.words.length, 0);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
        <span className="text-[12.5px] tabular-nums text-[#9a8b7b]">{words} სიტყვა</span>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
        <Chip on={allOn} onClick={() => setThemes([])}>ყველა</Chip>
        {NAKHATI_THEMES.map(t => {
          const Icon = THEME_ICON[t.id] ?? UtensilsCrossed;
          return (
            <Chip key={t.id} on={!allOn && active.includes(t.id)} onClick={() => toggle(t.id)}>
              <span className="inline-flex items-center gap-1.5"><Icon className="w-4 h-4" aria-hidden="true" />{t.label}</span>
            </Chip>
          );
        })}
      </div>
    </div>
  );
};

/** the words of the themes chosen (all when none is) */
export const chosenWords = (themes: readonly string[]) => {
  const use = themes.filter(id => NAKHATI_THEMES.some(t => t.id === id));
  return NAKHATI_THEMES.filter(t => !use.length || use.includes(t.id)).flatMap(t => t.words.map(x => ({ w: x.w, theme: t.id })));
};

/** a phone on its side: the pad's tools go beside it */
const SHORT = '(max-height: 500px)';
export const useShort = () => {
  const [short, setShort] = useState(() => window.matchMedia(SHORT).matches);
  useEffect(() => {
    const m = window.matchMedia(SHORT);
    const h = () => setShort(m.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return short;
};

/** the pad's side on a phone on its side: the screen's height but its bar */
export const SHORT_SIDE = 'max(170px, calc(100dvh - 92px - env(safe-area-inset-top) - env(safe-area-inset-bottom)))';

export const UNCHECKED = 'სიტყვები და ახსნები Claude-მა შეარჩია სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.';
export const DRAW_RULE = 'ხატე მხოლოდ ნახატი: ასოები, ციფრები და ნიშნები არ შეიძლება.';
