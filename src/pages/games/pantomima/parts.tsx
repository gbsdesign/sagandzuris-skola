import React from 'react';
import { Castle, Guitar, Hammer, Music, PawPrint, Shirt, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { PANTO_THEMES, pantoTheme } from '../../../data/pantomimaCards';
import { Chip } from '../../../components/games/Chip';
import { setTalk, setThemes, useTalk, useThemes } from './store';

// The pieces of „პანტომიმა“ (2026-11-01): each theme's mark, its chip with the verb that says how a word is shown, and the
// game's own choices — the themes and the little ones' way — in the room's lobby and in the one-phone setup.

export const THEME_ICON: Record<string, LucideIcon> = {
  sakravebi: Guitar, tsekva: Music, tskhovelebi: PawPrint, sporti: Trophy, kheloba: Hammer, samosi: Shirt, supra: UtensilsCrossed,
  zghapari: Castle,
};

/** a theme's chip: its colour, its mark and how its words are shown */
export const ThemeTag: React.FC<{ theme: string; verb?: boolean; light?: boolean }> = ({ theme, verb, light }) => {
  const t = pantoTheme(theme);
  if (!t) return null;
  const Icon = THEME_ICON[t.id] ?? Music;
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-[18px] pl-1 pr-3 py-1 text-[13px] font-bold ${light ? 'bg-white/15 text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
      <span className="w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center" style={{ background: t.color }}>
        <Icon className="w-3.5 h-3.5 text-white" aria-hidden="true" />
      </span>
      <span className="min-w-0 leading-snug">{verb ? `${t.verb} · ${t.label}` : t.label}</span>
    </span>
  );
};

/** the themes (none chosen = all) and whether words may be said */
export const PantoOptions: React.FC = () => {
  const chosen = useThemes();
  const talk = useTalk();
  const all = PANTO_THEMES.map(t => t.id);
  const active = chosen.filter(id => all.includes(id));
  const allOn = !active.length || active.length === all.length;
  const toggle = (id: string) => {
    const now = allOn ? [] : active;
    const next = now.includes(id) ? now.filter(t => t !== id) : [...now, id];
    setThemes(next.length === all.length ? [] : next);
  };
  const words = PANTO_THEMES.filter(t => allOn || active.includes(t.id)).reduce((s, t) => s + t.words.length, 0);
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-[13.5px] font-bold text-[#4a3426]">როგორ ვაჩვენოთ?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="როგორ ვაჩვენოთ">
          <Chip on={!talk} onClick={() => setTalk(false)}>უსიტყვოდ</Chip>
          <Chip on={talk} onClick={() => setTalk(true)}>სიტყვებითაც — პატარებისთვის</Chip>
        </div>
        <p className="text-[12.5px] leading-snug text-[#9a8b7b]">
          {talk ? 'ახსნა სიტყვებითაც შეიძლება, ოღონდ თვითონ სიტყვა და მისი ნაწილი არ ითქმის.' : 'მხოლოდ სხეულით: არც სიტყვა, არც ხმა, არც ასოები ჰაერში.'}
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
          <span className="text-[12.5px] tabular-nums text-[#9a8b7b]">{words} სიტყვა</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="თემები">
          <Chip on={allOn} onClick={() => setThemes([])}>ყველა</Chip>
          {PANTO_THEMES.map(t => {
            const Icon = THEME_ICON[t.id] ?? Music;
            return (
              <Chip key={t.id} on={!allOn && active.includes(t.id)} onClick={() => toggle(t.id)}>
                <span className="inline-flex items-center gap-1.5"><Icon className="w-4 h-4" aria-hidden="true" />{t.label}</span>
              </Chip>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** the words of the themes chosen (all when none is) */
export const chosenWords = (themes: readonly string[]) => {
  const use = themes.filter(id => PANTO_THEMES.some(t => t.id === id));
  return PANTO_THEMES.filter(t => !use.length || use.includes(t.id)).flatMap(t => t.words.map(w => ({ w, theme: t.id })));
};
