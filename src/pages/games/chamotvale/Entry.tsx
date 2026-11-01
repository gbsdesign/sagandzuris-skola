import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Send } from 'lucide-react';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { LATIN_TO_GEORGIAN, LETTERS } from '../../../utils/sitqva';
import { continuesForm, type ChamoItem, type Try } from '../../../utils/chamotvale';
import { triggerHaptic } from '../../../utils/haptics';
import { screenKeys } from './store';

// „ჩამოთვალე!“'s typing: a name fills its box the moment it is whole (no button), „Enter“ forgives a slip and says what is
// wrong — already named, not in the list, or the list's own line on a word near it. Latin letters turn Georgian as on the
// Georgian keyboard (a computer without the layout); on a phone the screen's own keyboard of 33 letters and a space types,
// unless the phone's keyboard is chosen (kept on the device).

type Msg = { tone: 'right' | 'again' | 'also' | 'none'; text: string };
const TONE: Record<Msg['tone'], string> = {
  right: 'text-[#24603d]',
  again: 'text-[#8a6d12]',
  also: 'text-[#2b5f8a]',
  none: 'text-[#b23a48]',
};

const toGeorgian = (s: string) => [...s].map(c => LATIN_TO_GEORGIAN[c] ?? c).join('');

export const Entry: React.FC<{
  items: readonly ChamoItem[];
  onTry: (text: string, enter: boolean) => Try;
  disabled?: boolean;
  /** the teacher types for a team (the words of the messages) */
  forTeam?: boolean;
  /** the board, between the field and the screen's keyboard (which stays at the screen's foot while the board scrolls) */
  children?: React.ReactNode;
}> = ({ items, onTry, disabled, forTeam, children }) => {
  const nameOf = (i: number) => items[i]?.name ?? '';
  // the member just taken by a short form, and what was typed since: its long form typed on is let through, not left in the field
  const tail = useRef<{ item: number; typed: string } | null>(null);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<Msg | null>(null);
  const [shaking, setShaking] = useState(false);
  const shakeT = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(shakeT.current), []);
  const keys = screenKeys.use();
  const input = useRef<HTMLInputElement>(null);

  const show = (t: Try, typed: string) => {
    if (t.kind === 'found') {
      triggerHaptic(12);
      setText('');
      setMsg({ tone: 'right', text: `✓ ${nameOf(t.item)}` });
      return;
    }
    if (t.kind === 'again') { triggerHaptic(20); setMsg({ tone: 'again', text: `უკვე ჩაწერილია: ${nameOf(t.item)}` }); return; }
    if (t.kind === 'also') { triggerHaptic(20); setMsg({ tone: 'also', text: t.note }); return; }
    triggerHaptic(35);
    setShaking(false);
    window.requestAnimationFrame(() => setShaking(true));
    window.clearTimeout(shakeT.current);
    shakeT.current = window.setTimeout(() => setShaking(false), 450);
    setMsg({ tone: 'none', text: typed.trim() ? `„${typed.trim()}“ ${forTeam ? 'სიაში არ არის' : 'სიაში არ არის — სცადე სხვაგვარად'}` : 'ჯერ ჩაწერე სახელი' });
  };

  const change = (v: string) => {
    const g = toGeorgian(v).slice(0, 60);
    const after = tail.current;
    if (after && g) {
      const typed = after.typed + g;
      if (continuesForm(items, after.item, typed)) { tail.current = { ...after, typed }; setText(''); return; }
    }
    tail.current = null;
    setText(g);
    const t = onTry(g, false);
    if (t.kind === 'found') { tail.current = { item: t.item, typed: g }; show(t, g); }
  };
  const enter = () => {
    if (disabled) return;
    if (!text.trim() && tail.current) { tail.current = null; return; }
    tail.current = null;
    show(onTry(text, true), text);
  };

  // the screen's keyboard: a computer's keys type too
  useEffect(() => {
    if (!keys || disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && t !== input.current && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Enter') { e.preventDefault(); enter(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); change(text.slice(0, -1)); return; }
      if (e.key === ' ' || e.key === '-') { e.preventDefault(); change(`${text}${e.key}`); return; }
      const ch = e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch) { e.preventDefault(); change(text + ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="space-y-2.5">
      <form
        onSubmit={e => { e.preventDefault(); enter(); }}
        className="flex items-center gap-2"
      >
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
          aria-label="სახელი"
          placeholder={forTeam ? 'ჩაწერე, რაც გუნდმა თქვა' : 'ჩაწერე სახელი…'}
          onChange={e => change(e.target.value)}
          className={`min-w-0 flex-1 h-12 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 text-[17px] font-bold text-[#4a3426] placeholder:text-[#b3a48f] placeholder:font-normal outline-none focus:ring-2 focus:ring-[#7a2028]/40 disabled:opacity-50 ${shaking ? 'sg-shake' : ''}`}
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
          <button
            type="submit"
            disabled={disabled}
            aria-label="შემოწმება"
            className="shrink-0 w-12 h-12 rounded-2xl bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </form>
      <p className={`min-h-[1.25rem] text-[13.5px] font-bold leading-snug ${msg ? TONE[msg.tone] : 'text-[#8c7b66]'}`} role="status" aria-live="polite">
        {msg ? msg.text : 'სახელი თავისით ჩაიწერება, როცა ბოლომდე დაწერ.'}
      </p>
      {children}
      {keys && (
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 px-4 pt-2 pb-3 bg-[#fbf6ec]/95 backdrop-blur-sm border-t border-[#e8dcc8]/70">
          <GeoKeyboard
            marks={{}}
            disabled={disabled}
            onKey={ch => change(text + ch)}
            onBack={() => change(text.slice(0, -1))}
            onSpace={() => change(`${text} `)}
            onEnter={enter}
          />
        </div>
      )}
    </div>
  );
};
