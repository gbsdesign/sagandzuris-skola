import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Delete, KeyRound, Lightbulb, RotateCcw, ScrollText, X } from 'lucide-react';
import {
  HINTS, HINT_COST, codeRight, echoNotes, itemsShown, optionOrder, orderRight, piecesOf, shapeOf, wordRight, type Door, type TsikheRoom,
} from '../../../utils/tsikhe';
import { checkTaps, eqoTimed, keysOf, pitchName } from '../../../utils/eqo';
import { LATIN_TO_GEORGIAN, LETTERS } from '../../../utils/sitqva';
import { bell, buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { MELODY_POOL } from '../../../data/melodyPool';
import { GeoKeyboard } from '../../../components/games/GeoKeyboard';
import { KeyStrip } from '../../../components/games/KeyStrip';
import { Btn } from '../../../components/ui/kit';
import { useSnippet } from '../rounds/useSnippet';
import { SnippetBox } from '../rounds/parts';
import { Letter } from '../rounds/four';
import { Shape } from '../hangebi/Bank';
import { Keys, Taps, useLit } from '../eqo/Keys';
import { CarvedPlate, NumeralScroll } from './parts';

// A door of „ციხის გასაღები“ and its lock — the same on the phone alone and on the class's screen: a word typed on the screen's
// keyboard (an inscription in old letters to read, with the alphabet's key), digits on a padlock's wheels, one of four names, a
// tune to name, events or places to put in their order, the bells' phrase to tap back. Under it the hints, each for a minute (the
// answer for three). The gate: the key's pieces put in their order.

/** the screen's sounds: a door opens, a wrong try, the gate (one context for the screen, opened in a tap) */
export const useTsikheSounds = () => {
  const ref: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(ref), []);
  return useMemo(() => ({
    open: () => { openAudio(ref); },
    right: () => chime(openAudio(ref), 2),
    wrong: () => buzz(openAudio(ref)),
    out: () => bell(openAudio(ref)),
  }), []);
};
export type TsikheSounds = ReturnType<typeof useTsikheSounds>;

const LABELS = ['ა', 'ბ', 'გ', 'დ', 'ე', 'ვ'];
const melodyOf = (id: string) => MELODY_POOL.find(m => m.id === id);

/** a physical keyboard while the screen is the game's: letters (or the Latin layout's), digits, ⌫ and ⏎ */
const useTyping = (on: boolean, f: { letter?: (ch: string) => void; digit?: (d: number) => void; back: () => void; enter: () => void }) => {
  const ref = useRef(f);
  ref.current = f;
  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const h = ref.current;
      if (e.key === 'Enter') { e.preventDefault(); h.enter(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); h.back(); return; }
      if (h.digit && /^\d$/.test(e.key)) { e.preventDefault(); h.digit(+e.key); return; }
      const ch = h.letter && e.key.length === 1 ? (LETTERS.includes(e.key) ? e.key : LATIN_TO_GEORGIAN[e.key]) : undefined;
      if (ch && h.letter) { e.preventDefault(); h.letter(ch); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);
};

/** a short line under a lock: wrong, or what to do */
const Say: React.FC<{ text: string | null; bad?: boolean }> = ({ text, bad = true }) => (
  <p className={`min-h-[1.25rem] text-center text-[13.5px] font-bold ${bad ? 'text-[#b23a48]' : 'text-[#75685a]'}`} role="status">{text ?? ''}</p>
);

// ---------- a word ----------
const WordLock: React.FC<{ door: Extract<Door, { kind: 'word' }>; onRight: () => void; sounds: TsikheSounds; big: boolean }> = ({ door, onRight, sounds, big }) => {
  const shape = useMemo(() => shapeOf(door.answer), [door.answer]);
  const n = useMemo(() => [...shape].filter(c => c === '_').length, [shape]);
  const [letters, setLetters] = useState<string[]>([]);
  const [shake, setShake] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const full = letters.length >= n;
  const type = (ch: string) => { if (letters.length < n) { setLetters([...letters, ch]); setSay(null); } };
  const back = () => { setLetters(letters.slice(0, -1)); setSay(null); };
  const check = () => {
    if (!full) { setSay(`ჯერ ყველა უჯრა შეავსე — ${n} ასო`); return; }
    // the boxes keep the answer's spaces, so the typed letters are compared as the answer's words
    let at = 0;
    const typed = [...shape].map(c => (c === '_' ? letters[at++] : c)).join('');
    if (wordRight(door, typed)) { sounds.right(); onRight(); return; }
    sounds.wrong();
    triggerHaptic(40);
    setShake(s => s + 1);
    setSay('ეს არ არის — სცადე სხვა სიტყვა');
  };
  useTyping(true, { letter: type, back, enter: check });
  return (
    <div className="sticky bottom-0 z-10 mt-auto -mx-4 px-4 pt-3 pb-2 bg-[#fbf6ec] border-t border-[#e8dcc8] shadow-[0_-6px_14px_-10px_rgba(74,52,38,0.35)] space-y-2.5">
      <div key={shake} className={shake ? 'sg-shake' : ''}>
        <Shape shape={shape} letters={Array.from({ length: n }, (_, i) => letters[i] ?? null)} tone={full && say ? 'wrong' : 'plain'} />
      </div>
      <Say text={say} />
      <div className={big ? 'max-w-xl mx-auto' : ''}>
        <GeoKeyboard marks={{}} onKey={type} onBack={back} onEnter={check} enterLabel="გაღება" />
      </div>
    </div>
  );
};

// ---------- a padlock's wheels ----------
const CodeLock: React.FC<{ door: Extract<Door, { kind: 'code' }>; onRight: () => void; sounds: TsikheSounds; big: boolean }> = ({ door, onRight, sounds, big }) => {
  const n = door.answer.length;
  const [digits, setDigits] = useState<number[]>(() => Array(n).fill(0));
  const [cur, setCur] = useState(0);
  const [shake, setShake] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const turn = (i: number, by: number) => { triggerHaptic(6); setDigits(d => d.map((x, k) => (k === i ? (x + by + 10) % 10 : x))); setCur(i); setSay(null); };
  const check = () => {
    if (codeRight(door, digits.join(''))) { sounds.right(); onRight(); return; }
    sounds.wrong();
    triggerHaptic(40);
    setShake(s => s + 1);
    setSay('საკეტი არ გაიღო — სხვა კოდი სცადე');
  };
  useTyping(true, {
    digit: d => { setDigits(x => x.map((v, k) => (k === cur ? d : v))); setCur(c => Math.min(n - 1, c + 1)); setSay(null); },
    back: () => setCur(c => Math.max(0, c - 1)),
    enter: check,
  });
  const btn = `${big ? 'w-20 h-14' : 'w-16 h-12'} rounded-2xl flex items-center justify-center bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] active:scale-[0.96] cursor-pointer`;
  return (
    <div className="sticky bottom-0 z-10 mt-auto -mx-4 px-4 pt-3 pb-2 bg-[#fbf6ec] border-t border-[#e8dcc8] shadow-[0_-6px_14px_-10px_rgba(74,52,38,0.35)] space-y-3">
      <div key={shake} className={`flex justify-center ${big ? 'gap-4' : 'gap-2.5'} ${shake ? 'sg-shake' : ''}`} role="group" aria-label="კოდის საკეტი">
        {digits.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <button type="button" className={btn} onClick={() => turn(i, 1)} aria-label={`${i + 1}-ე ციფრი: მეტი`}><ChevronUp className="w-6 h-6" /></button>
            <span
              className={`${big ? 'w-20 h-24 text-[52px]' : 'w-16 h-[74px] text-[40px]'} rounded-2xl flex items-center justify-center font-bold tabular-nums text-[#fbf6ec] bg-[linear-gradient(180deg,#5b4636,#3d2c22)] shadow-[inset_0_3px_8px_rgba(0,0,0,0.45)] ${i === cur ? 'ring-[3px] ring-[#c9a227]' : ''}`}
              aria-live="polite"
            >
              {d}
            </span>
            <button type="button" className={btn} onClick={() => turn(i, -1)} aria-label={`${i + 1}-ე ციფრი: ნაკლები`}><ChevronDown className="w-6 h-6" /></button>
          </div>
        ))}
      </div>
      <Say text={say} />
      <Btn size="lg" full icon={<KeyRound />} onClick={check} className={`!h-14 !text-[16px] ${big ? 'max-w-md mx-auto' : ''}`}>გაღება</Btn>
    </div>
  );
};

// ---------- one of four ----------
const PickLock: React.FC<{ options: readonly string[]; order: number[]; wrong: readonly number[]; onRight: () => void; onMiss: (o: number) => void; sounds: TsikheSounds; big: boolean }> = ({
  options, order, wrong, onRight, onMiss, sounds, big,
}) => {
  const [shook, setShook] = useState<{ i: number; n: number } | null>(null);
  return (
    <ul className={`grid gap-2 ${big ? 'grid-cols-2' : 'sm:grid-cols-2'}`} role="group" aria-label="პასუხები">
      {order.map((o, pos) => {
        const out = wrong.includes(o);
        return (
          <li key={o}>
            <button
              type="button"
              disabled={out}
              onClick={() => {
                triggerHaptic(8);
                if (o === 0) { sounds.right(); onRight(); return; }
                sounds.wrong();
                setShook({ i: o, n: (shook?.n ?? 0) + 1 });
                onMiss(o);
              }}
              key={shook?.i === o ? shook.n : 0}
              className={`w-full h-full ${big ? 'min-h-20' : 'min-h-14'} flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-[background-color,transform] active:scale-[0.99] cursor-pointer disabled:cursor-default ${out ? 'bg-[#f1ece4] opacity-60' : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'} ${shook?.i === o ? 'sg-shake' : ''}`}
            >
              {out ? <span className="w-9 h-9 shrink-0 rounded-full bg-[#d8cfc1] flex items-center justify-center"><X className="w-4.5 h-4.5 text-white" /></span> : <Letter i={pos} />}
              <span className={`min-w-0 flex-1 font-bold leading-snug [overflow-wrap:anywhere] ${big ? 'text-[20px]' : 'text-[15.5px]'} ${out ? 'text-[#9a8b7b] line-through' : 'text-[#4a3426]'}`}>{options[o]}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

// ---------- events or places in their order ----------
const OrderLock: React.FC<{ items: readonly string[]; shown: number[]; onRight: () => void; onMiss: () => void; sounds: TsikheSounds; big: boolean }> = ({ items, shown, onRight, onMiss, sounds, big }) => {
  const [picked, setPicked] = useState<number[]>([]);
  const [bad, setBad] = useState(0);
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);
  const tap = (i: number) => {
    if (bad && picked.length === items.length) return;
    triggerHaptic(6);
    const at = picked.indexOf(i);
    if (at >= 0) { setPicked(picked.slice(0, at)); return; }
    const next = [...picked, i];
    setPicked(next);
    if (next.length < items.length) return;
    if (orderRight(next, items.length)) { sounds.right(); onRight(); return; }
    sounds.wrong();
    triggerHaptic(40);
    setBad(b => b + 1);
    onMiss();
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => setPicked([]), 1100);
  };
  const wrongNow = !!bad && picked.length === items.length;
  return (
    <div className="space-y-2.5">
      <ol key={bad} className={`space-y-2 ${wrongNow ? 'sg-shake' : ''}`} aria-label="დასალაგებელი">
        {shown.map((i, pos) => {
          const n = picked.indexOf(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => tap(i)}
                className={`w-full ${big ? 'min-h-16' : 'min-h-14'} flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left cursor-pointer active:scale-[0.99] transition-colors ${n >= 0 ? (wrongNow ? 'bg-amber-50 ring-2 ring-amber-400' : 'bg-[#7a2028]/[0.06] ring-2 ring-[#7a2028]') : 'bg-white ring-1 ring-[#e8dcc8] hover:bg-[#fbf6ec]'}`}
              >
                <span className="w-8 h-8 shrink-0 rounded-full bg-[#4a3426]/[0.08] flex items-center justify-center font-serif-ge text-[15px] font-bold text-[#4a3426]">{LABELS[pos]}</span>
                <span className={`min-w-0 flex-1 font-bold leading-snug [overflow-wrap:anywhere] text-[#4a3426] ${big ? 'text-[19px]' : 'text-[15px]'}`}>{items[i]}</span>
                <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[16px] font-bold tabular-nums ${n >= 0 ? (wrongNow ? 'bg-amber-500 text-white' : 'bg-[#7a2028] text-white') : 'border-2 border-dashed border-[#d9c9ae]'}`}>
                  {n >= 0 ? n + 1 : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <Say text={wrongNow ? 'რიგი არ ემთხვევა — თავიდან სცადე (+30 წამი)' : picked.length ? null : 'შეეხე პირველს, მერე მეორეს…'} bad={wrongNow} />
      {picked.length > 0 && !wrongNow && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setPicked([])} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97]">
            <RotateCcw className="w-4 h-4" />თავიდან
          </button>
        </div>
      )}
    </div>
  );
};

// ---------- the bells: a phrase to tap back ----------
const EchoLock: React.FC<{ door: Extract<Door, { kind: 'echo' }>; onRight: () => void; sounds: TsikheSounds }> = ({ door, onRight, sounds }) => {
  const melody = melodyOf(door.melody);
  const notes = useMemo(() => (melody ? echoNotes(melody.top, door.count) : []), [melody, door.count]);
  const keys = useMemo(() => keysOf(notes), [notes]);
  const snip = useSnippet(20);
  const lit = useLit();
  const [taps, setTaps] = useState<number[]>([]);
  const [flash, setFlash] = useState<{ key: number; ok: boolean; n: number } | null>(null);
  const [wrongFrom, setWrongFrom] = useState(-1);
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);
  const playing = snip.state === 'play' || snip.state === 'load';
  const hear = () => { setTaps([]); setWrongFrom(-1); if (playing) snip.stop(); else snip.play({ notes: eqoTimed(notes) }); };
  const tap = (i: number) => {
    if (playing || wrongFrom >= 0) return;
    const next = [...taps, i];
    const res = checkTaps(notes, keys, next);
    setFlash({ key: i, ok: res !== 'wrong', n: next.length });
    setTaps(next);
    if (res === 'done') { sounds.right(); onRight(); return; }
    if (res === 'wrong') {
      triggerHaptic(40);
      sounds.wrong();
      setWrongFrom(next.length - 1);
      window.clearTimeout(wait.current);
      wait.current = window.setTimeout(() => { setTaps([]); setWrongFrom(-1); }, 1100);
    }
  };
  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 260);
    return () => window.clearTimeout(t);
  }, [flash]);
  if (!melody) return null;
  const at = lit.midi !== null ? keys.indexOf(lit.midi) : -1;
  return (
    <div className="space-y-3.5">
      <SnippetBox state={snip.state} prog={snip.prog} onTap={hear} note="მოუსმინე — ზარები აინთება" />
      <Taps keys={keys} taps={taps} length={notes.length} wrongFrom={wrongFrom} />
      <Keys keys={keys} lit={playing ? at : -1} flash={flash} disabled={playing} onTap={tap} />
      <Say text={wrongFrom >= 0 ? 'არა — ზარები თავიდან იწყება' : playing ? 'ისმის…' : taps.length ? null : 'ახლა შენ — დაუკარი იგივე'} bad={wrongFrom >= 0} />
    </div>
  );
};

// ---------- the hints ----------
const costText = (ms: number) => (ms >= 60_000 ? `+${ms / 60_000} წთ` : `+${ms / 1000} წმ`);
export const HintBox: React.FC<{ lines: string[]; shown: number; onHint: () => void; answerLine: string; big?: boolean }> = ({ lines, shown, onHint, answerLine, big = false }) => {
  const all = [...lines.slice(0, HINTS - 1), answerLine];
  return (
    <div className="space-y-2">
      {all.slice(0, shown).map((h, i) => (
        <p key={i} className={`samosi-pop rounded-2xl px-3.5 py-2.5 leading-snug ${i === HINTS - 1 ? 'bg-[#e6f2e9] text-[#1e4d31] font-bold' : 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'} ${big ? 'text-[17px]' : 'text-[14px]'}`}>
          {i === HINTS - 1 ? <KeyRound className="inline w-4 h-4 -mt-0.5 mr-1.5" aria-hidden="true" /> : <Lightbulb className="inline w-4 h-4 -mt-0.5 mr-1.5 text-amber-600" aria-hidden="true" />}
          {h}
        </p>
      ))}
      {shown < HINTS && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => { triggerHaptic(8); onHint(); }}
            className="h-11 px-4 rounded-full inline-flex items-center gap-2 text-[14px] font-bold bg-white ring-1 ring-amber-300 text-amber-900 cursor-pointer active:scale-[0.97] hover:bg-amber-50"
          >
            {shown === HINTS - 1 ? <KeyRound className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
            {shown === HINTS - 1 ? 'პასუხი' : shown ? 'კიდევ მინიშნება' : 'მინიშნება'}
            <span className="text-[12.5px] font-bold text-amber-700">{costText(HINT_COST[shown])}</span>
          </button>
        </div>
      )}
    </div>
  );
};

/** the third hint: the answer as this screen shows it (an option with its letter, an order by its letters, the bells by name) */
const answerLine = (door: Door, index: number, seed: number) => {
  switch (door.kind) {
    case 'word': return `პასუხი: ${door.answer}`;
    case 'code': return `კოდი: ${door.answer}`;
    case 'pick': case 'listen': {
      const pos = optionOrder(door.options.length, seed, index).indexOf(0);
      return `პასუხი: ${LABELS[pos]} — ${door.options[0]}`;
    }
    case 'order': {
      const shown = itemsShown(door.items.length, seed, index);
      return `რიგი: ${door.items.map((_, i) => LABELS[shown.indexOf(i)]).join(' → ')}`;
    }
    case 'echo': {
      const m = melodyOf(door.melody);
      return m ? `ზარები: ${echoNotes(m.top, door.count).map(pitchName).join(' · ')}` : '';
    }
  }
};

// ---------- the door ----------
export const DoorPanel: React.FC<{
  door: Door;
  index: number;
  seed: number;
  wrong: readonly number[];
  hints: number;
  onRight: () => void;
  onMiss: (option?: number) => void;
  onHint: () => void;
  sounds: TsikheSounds;
  big?: boolean;
  tint: string;
}> = ({ door, index, seed, wrong, hints, onRight, onMiss, onHint, sounds, big = false, tint }) => {
  const [key, setKey] = useState(true);
  const order = useMemo(() => ('options' in door ? optionOrder(door.options.length, seed, index) : []), [door, seed, index]);
  const shown = useMemo(() => (door.kind === 'order' ? itemsShown(door.items.length, seed, index) : []), [door, seed, index]);
  const listen = useSnippet(14);
  const carved = 'carved' in door ? door.carved : undefined;
  return (
    <div className={`flex-1 flex flex-col gap-3.5 ${big ? 'max-w-3xl mx-auto w-full' : ''}`}>
      <div>
        <p className={`font-serif-ge font-bold leading-tight ${big ? 'text-[28px]' : 'text-[20px]'}`} style={{ color: tint }}>{door.title}</p>
        <p className={`mt-1.5 leading-relaxed text-[#4a3426] ${big ? 'text-[20px]' : 'text-[15px]'}`}>{door.ask}</p>
      </div>
      {carved && <CarvedPlate carved={carved} big={big} />}
      {door.kind === 'code' && door.scroll && <NumeralScroll big={big} />}
      {carved && door.kind === 'word' && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { triggerHaptic(6); setKey(k => !k); }}
            aria-expanded={key}
            className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] cursor-pointer active:scale-[0.97]"
          >
            <ScrollText className="w-4 h-4" />ანბანის გასაღები {key ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {key && <KeyStrip script={carved.script} big={big} />}
        </div>
      )}
      {door.kind === 'listen' && (
        <SnippetBox
          state={listen.state}
          prog={listen.prog}
          onTap={() => (listen.state === 'play' || listen.state === 'load' ? listen.stop() : listen.play({ score: door.tune, voices: 0, seconds: 14 }))}
          note="სინთეზატორი წიგნის ნოტებით უკრავს"
        />
      )}
      {(door.kind === 'pick' || door.kind === 'listen') && (
        <PickLock options={door.options} order={order} wrong={wrong} onRight={() => { listen.stop(); onRight(); }} onMiss={o => onMiss(o)} sounds={sounds} big={big} />
      )}
      {door.kind === 'order' && <OrderLock items={door.items} shown={shown} onRight={onRight} onMiss={() => onMiss()} sounds={sounds} big={big} />}
      {door.kind === 'echo' && <EchoLock door={door} onRight={onRight} sounds={sounds} />}
      <HintBox lines={[...door.hints]} shown={hints} onHint={onHint} answerLine={answerLine(door, index, seed)} big={big} />
      {door.kind === 'word' && <WordLock key={index} door={door} onRight={onRight} sounds={sounds} big={big} />}
      {door.kind === 'code' && <CodeLock key={index} door={door} onRight={onRight} sounds={sounds} big={big} />}
    </div>
  );
};

// ---------- the gate: the key's pieces in their order ----------
export const GatePanel: React.FC<{
  room: TsikheRoom;
  hints: number;
  onHint: () => void;
  onRight: () => void;
  sounds: TsikheSounds;
  big?: boolean;
  tint: string;
}> = ({ room, hints, onHint, onRight, sounds, big = false, tint }) => {
  const pieces = useMemo(() => piecesOf(room), [room]);
  const n = pieces.length;
  const [placed, setPlaced] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  const [say, setSay] = useState<string | null>(null);
  const wait = useRef(0);
  useEffect(() => () => window.clearTimeout(wait.current), []);
  const put = (t: number) => {
    if (placed.includes(t) || placed.length >= n) return;
    triggerHaptic(6);
    const next = [...placed, t];
    setPlaced(next);
    setSay(null);
    if (next.length < n) return;
    if (next.map(i => pieces[i]).join('') === room.key) { sounds.out(); onRight(); return; }
    sounds.wrong();
    triggerHaptic(40);
    setShake(s => s + 1);
    setSay('ჭიშკარი არ გაიღო — სხვა რიგი სცადე');
    window.clearTimeout(wait.current);
    wait.current = window.setTimeout(() => setPlaced([]), 1100);
  };
  const letters = Array.from({ length: n }, (_, i) => (placed[i] === undefined ? null : pieces[placed[i]]));
  const keyLetters = [...room.key];
  return (
    <div className={`flex flex-col gap-4 ${big ? 'max-w-3xl mx-auto w-full' : ''}`}>
      <div>
        <p className={`font-serif-ge font-bold leading-tight ${big ? 'text-[28px]' : 'text-[20px]'}`} style={{ color: tint }}>ჭიშკარი</p>
        <p className={`mt-1.5 leading-relaxed text-[#4a3426] ${big ? 'text-[20px]' : 'text-[15px]'}`}>{room.gate.ask}</p>
      </div>
      <div key={shake} className={`py-1 ${shake ? 'sg-shake' : ''}`}>
        <Shape shape={'_'.repeat(n)} letters={letters} onBox={i => { setPlaced(placed.slice(0, i)); setSay(null); }} tone={say ? 'wrong' : 'plain'} />
      </div>
      <Say text={say ?? (placed.length ? null : 'შეეხე ნაწილებს იმ რიგით, როგორც სიტყვაშია')} bad={!!say} />
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="გასაღების ნაწილები">
        {pieces.map((ch, t) => {
          const used = placed.includes(t);
          return (
            <button
              key={t}
              type="button"
              disabled={used}
              onClick={() => put(t)}
              className={`${big ? 'w-20 h-[88px] text-[42px]' : 'w-14 h-16 text-[30px]'} rounded-2xl font-serif-ge font-bold transition-[opacity,transform] ${used ? 'opacity-25' : 'bg-[#c9a227] text-white shadow-[0_4px_0_#a3821b] active:translate-y-[2px] active:shadow-none cursor-pointer'}`}
            >
              {ch}
            </button>
          );
        })}
      </div>
      {placed.length > 0 && !say && (
        <div className="flex justify-center">
          <button type="button" onClick={() => setPlaced(placed.slice(0, -1))} className="h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[13px] font-bold bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] cursor-pointer active:scale-[0.97]">
            <Delete className="w-4 h-4" />წაშლა
          </button>
        </div>
      )}
      <HintBox
        lines={[`პირველი ასოა „${keyLetters[0]}“.`, `ბოლო ასოა „${keyLetters[n - 1]}“.`]}
        shown={hints}
        onHint={onHint}
        answerLine={`სიტყვა: ${room.key}`}
        big={big}
      />
    </div>
  );
};
