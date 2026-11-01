import React, { useEffect, useRef, useState } from 'react';
import {
  AudioLines, BookOpen, GraduationCap, House, Keyboard, MapPin, Music, Palette, PawPrint, Plus, Scissors, Send, Shield, Trophy, UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { TABU_THEMES, tabuTheme } from '../../../data/tabuCards';
import { LATIN_TO_GEORGIAN, LETTERS } from '../../../utils/sitqva';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { Chip } from '../../../components/games/Chip';
import { triggerHaptic } from '../../../utils/haptics';
import { screenKeys } from '../chamotvale/store';

// The pieces of „ნუ იტყვი!“ and „ერთი მინიშნება“ (2026-11-01): a theme's chip, the word's letter boxes, the five clues as
// chips (the next hidden one is the button that opens it), the typing of a word — the screen's 33 keys or the phone's own,
// a computer's keys either way — and the theme chips of a setup.

export const THEME_ICON: Record<string, LucideIcon> = {
  supra: UtensilsCrossed, buneba: PawPrint, istoria: Shield, literatura: BookOpen, musika: Music, galoba: AudioLines,
  kutkhe: MapPin, qopa: House, sporti: Trophy, khelovneba: Palette, skola: GraduationCap, samosi: Scissors,
};

export const ThemeChip: React.FC<{ theme: string; big?: boolean }> = ({ theme, big }) => {
  const t = tabuTheme(theme);
  if (!t) return null;
  const Icon = THEME_ICON[t.id] ?? BookOpen;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-white ring-1 ring-[#e8dcc8] font-bold text-[#4a3426] ${big ? 'h-10 pl-2.5 pr-4 text-[15px]' : 'h-8 pl-2 pr-3 text-[12.5px]'}`}>
      <Icon className={big ? 'w-5 h-5' : 'w-4 h-4'} style={{ color: t.color }} aria-hidden="true" />
      {t.label}
    </span>
  );
};

/** the word's boxes: what is typed while the card plays, the word itself green or red once it is over */
export const LetterBoxes: React.FC<{ word: string; typed: string; state: 'play' | 'right' | 'lost'; shake?: boolean }> = ({ word, typed, state, shake }) => {
  const n = [...word].length;
  const shown = state === 'play' ? [...typed] : [...word];
  const tone = state === 'right' ? 'bg-[#2f7d4f] text-white ring-[#2f7d4f]' : state === 'lost' ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : '';
  return (
    <div className={`flex justify-center gap-1 ${shake ? 'sg-shake' : ''}`} aria-label={state === 'play' ? `${n} ასო, ჩაწერილია ${shown.length}` : word} role="img">
      {Array.from({ length: n }, (_, i) => {
        const ch = shown[i] ?? '';
        const next = state === 'play' && i === shown.length;
        return (
          <span
            key={i}
            className={`flex-1 min-w-0 max-w-[44px] h-12 rounded-xl ring-1 inline-flex items-center justify-center font-serif-ge text-[20px] font-bold ${tone || (ch ? 'bg-white ring-[#7a2028]/45 text-[#4a3426]' : next ? 'bg-white ring-2 ring-[#7a2028]/40' : 'bg-white/70 ring-[#e8dcc8]')}`}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** the five clues of a card, the vaguest first: the ones out, then the next as „+ მინიშნება“, then question marks; at the end all five */
export const ClueChips: React.FC<{ clues: readonly string[]; shown: number; over: boolean; onMore?: () => void }> = ({ clues, shown, over, onMore }) => (
  <ol className="flex flex-wrap gap-2" aria-label="მინიშნებები">
    {clues.map((w, i) => {
      if (i < shown) {
        return (
          <li key={i} className="h-11 pl-1.5 pr-3.5 rounded-full bg-white ring-1 ring-[#7a2028]/30 inline-flex items-center gap-2 text-[16px] font-bold text-[#4a3426]">
            <span className="w-8 h-8 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13px] inline-flex items-center justify-center" aria-hidden="true">{i + 1}</span>
            {w}
          </li>
        );
      }
      if (over) {
        return (
          <li key={i} className="h-11 pl-1.5 pr-3.5 rounded-full bg-[#f1e8d9]/70 inline-flex items-center gap-2 text-[16px] text-[#75685a]">
            <span className="w-8 h-8 rounded-full bg-white text-[#9a8b7b] text-[13px] font-bold inline-flex items-center justify-center" aria-hidden="true">{i + 1}</span>
            {w}
          </li>
        );
      }
      if (i === shown && onMore) {
        return (
          <li key={i}>
            <button
              type="button"
              onClick={() => { triggerHaptic(8); onMore(); }}
              className="h-11 pl-2 pr-3.5 rounded-full border-2 border-dashed border-[#7a2028]/40 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.05] active:scale-[0.97] cursor-pointer"
            >
              <Plus className="w-4 h-4" /> მინიშნება <span className="font-normal text-[#9a8b7b]">−1</span>
            </button>
          </li>
        );
      }
      return (
        <li key={i} className="h-11 w-12 rounded-full border-2 border-dashed border-[#e8dcc8] inline-flex items-center justify-center text-[16px] font-bold text-[#c9b9a1]" aria-label="დამალული">?</li>
      );
    })}
  </ol>
);

/** a computer's keys while `on`: letters (Georgian, or the Latin layout's keys as the Georgian layout maps them), ⌫, Enter */
export const useLetterKeys = (on: boolean, h: { letter: (ch: string) => void; back: () => void; enter: () => void }) => {
  const ref = useRef(h);
  ref.current = h;
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (window.history.state?.sgFind) return;
      if (e.key === 'Enter') { if (el?.tagName === 'BUTTON') return; e.preventDefault(); ref.current.enter(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); ref.current.back(); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); ref.current.letter(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);
};

const toGeorgian = (s: string) => [...s].map(c => LATIN_TO_GEORGIAN[c] ?? c).join('');

/** a free word typed (its length unknown): a field, the screen's keyboard at the foot unless the phone's own is chosen
 * (the choice is „ჩამოთვალე!“'s, kept on the device); `onSubmit` gets the word, the field empties */
export const WordField: React.FC<{
  onSubmit: (word: string) => void;
  placeholder: string;
  enterLabel?: string;
  disabled?: boolean;
  /** what sits between the field and the screen's keyboard */
  children?: React.ReactNode;
  max?: number;
}> = ({ onSubmit, placeholder, enterLabel = 'შემოწმება', disabled, children, max = 30 }) => {
  const [text, setText] = useState('');
  const keys = screenKeys.use();
  const input = useRef<HTMLInputElement>(null);
  const [shake, setShake] = useState(false);
  const submit = () => {
    if (disabled) return;
    const w = text.trim();
    if (!w) { setShake(false); window.requestAnimationFrame(() => setShake(true)); triggerHaptic(25); return; }
    setText('');
    onSubmit(w);
  };
  const type = (v: string) => setText(toGeorgian(v).replace(/[^ა-ჰ ]/g, '').slice(0, max));
  useLetterKeys(keys && !disabled, { letter: ch => type(text + ch), back: () => type(text.slice(0, -1)), enter: submit });
  return (
    <div className="space-y-2.5">
      <form onSubmit={e => { e.preventDefault(); submit(); }} className="flex items-center gap-2">
        <input
          ref={input}
          value={text}
          readOnly={keys}
          inputMode={keys ? 'none' : 'text'}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-label={placeholder}
          placeholder={placeholder}
          onChange={e => type(e.target.value)}
          onAnimationEnd={() => setShake(false)}
          className={`min-w-0 flex-1 h-12 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 text-[18px] font-bold text-[#4a3426] placeholder:text-[#b3a48f] placeholder:font-normal placeholder:text-[15px] outline-none focus:ring-2 focus:ring-[#7a2028]/40 disabled:opacity-50 ${shake ? 'sg-shake' : ''}`}
        />
        <button
          type="button"
          onClick={() => { screenKeys.set(!keys); if (keys) setTimeout(() => input.current?.focus(), 0); }}
          aria-label={keys ? 'ტელეფონის კლავიატურა' : 'ეკრანის ქართული კლავიატურა'}
          aria-pressed={keys}
          title={keys ? 'ტელეფონის კლავიატურა' : 'ეკრანის ქართული კლავიატურა'}
          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-95 cursor-pointer ${keys ? 'bg-[#7a2028]/[0.12] text-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#7a2028]'}`}
        >
          <Keyboard className="w-5 h-5" />
        </button>
        {!keys && (
          <button type="submit" disabled={disabled} aria-label={enterLabel} className="shrink-0 w-12 h-12 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center active:scale-95 disabled:opacity-50 cursor-pointer">
            <Send className="w-5 h-5" />
          </button>
        )}
      </form>
      {children}
      {keys && (
        <div className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70">
          <GeoKeyboard marks={{}} disabled={disabled} onKey={ch => type(text + ch)} onBack={() => type(text.slice(0, -1))} onEnter={submit} enterLabel={enterLabel} />
        </div>
      )}
    </div>
  );
};

/** the themes a game deals from: none off = every theme; at least one stays on */
export const ThemePicker: React.FC<{ value: string[]; onChange: (v: string[]) => void }> = ({ value, onChange }) => {
  const all = value.length === 0 || value.length >= TABU_THEMES.length;
  const on = (id: string) => all || value.includes(id);
  const toggle = (id: string) => {
    const cur = all ? TABU_THEMES.map(t => t.id) : value;
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    if (!next.length) return;
    onChange(next.length >= TABU_THEMES.length ? [] : next);
  };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="თემები">
      <Chip on={all} onClick={() => onChange([])}>ყველა</Chip>
      {TABU_THEMES.map(t => {
        const Icon = THEME_ICON[t.id] ?? BookOpen;
        return (
          <Chip key={t.id} on={!all && on(t.id)} onClick={() => toggle(t.id)}>
            <span className="inline-flex items-center gap-1.5">
              <Icon className="w-4 h-4" style={{ color: !all && on(t.id) ? undefined : t.color }} aria-hidden="true" />{t.label}
            </span>
          </Chip>
        );
      })}
    </div>
  );
};
