import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Footprints, Pause, Play, Repeat } from 'lucide-react';
import { RoundButton, Sheet } from '../../ui2';
import { Keyboard } from './Keyboard';
import { Stepper } from './parts';
import {
  keyRangeOf, noteNameOf, partOf, shapeMelody, speedLabel, stepSpeed, stepTone, toneLabel, SPEEDS, TONE_MAX, TONE_MIN, type Melody,
} from '../../../utils/melody';
import { keyOn, playNotes, wakeSound, type Playback } from '../../../utils/melodyPlay';
import { triggerHaptic } from '../../../utils/haptics';

/**
 * A chat melody on the keys (2026-11-23, the user's ideas 3 and 4): its keys light up as it plays, so a student sees which to
 * press; „მიყევი“ rings the next key in gold and moves on when it is pressed; a part (a tap on its first and its last note)
 * plays alone, „გამეორება“ goes round it with a breath between.
 */
const MelodyKeys: React.FC<{
  mel: Melody;
  tone: number;
  speed: number;
  onTone: (t: number) => void;
  onSpeed: (s: number) => void;
  onClose: () => void;
}> = ({ mel, tone, speed, onTone, onSpeed, onClose }) => {
  const notes = useMemo(() => shapeMelody(mel, tone, speed), [mel, tone, speed]);
  const [lo, hi] = useMemo(() => keyRangeOf(notes), [notes]);
  // the part chosen: from a to b (note places); `picking` = its first note tapped, the last one is next
  const [part, setPart] = useState<{ a: number; b: number } | null>(null);
  const [picking, setPicking] = useState(false);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sounding, setSounding] = useState<number[]>([]);
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [follow, setFollow] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [praise, setPraise] = useState(false);
  const play = useRef<Playback | null>(null);

  const a = part?.a ?? 0;
  const b = part?.b ?? notes.length - 1;
  const chosen = notes.slice(a, b + 1);

  const stop = () => { play.current?.stop(); play.current = null; setPlaying(false); setSounding([]); };
  useEffect(() => () => play.current?.stop(), []);
  // a change of tone, pace, part or loop stops the playing (the next ▶ plays it the new way)
  useEffect(() => { stop(); setFollow(f => (f === null ? null : 0)); }, [tone, speed, part, loop]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    wakeSound();
    if (playing) { stop(); return; }
    setFollow(null);
    const p = partOf(notes, a, b);
    setPlaying(true);
    play.current = playNotes(p, mel.i, {
      loopGap: loop ? 1.2 : undefined,
      onFrame: (_t, lit) => setSounding(lit.map(i => p[i].idx)),
      onEnd: () => { play.current = null; setPlaying(false); setSounding([]); },
      onStop: () => { play.current = null; setPlaying(false); setSounding([]); },
    });
  };

  // the student's own keys: they sound, and in „მიყევი“ the right one moves the gold ring on
  const voices = useRef(new Map<number, ReturnType<typeof keyOn>>());
  const onDown = (m: number) => {
    voices.current.get(m)?.off(0);
    voices.current.set(m, keyOn(mel.i, m));
    setHeld(s => new Set(s).add(m));
    if (follow === null) return;
    const want = chosen[follow]?.midi;
    if (m === want) {
      if (follow + 1 >= chosen.length) {
        triggerHaptic(40);
        setPraise(true);
        setFollow(0);
        window.setTimeout(() => setPraise(false), 2200);
      } else setFollow(follow + 1);
    } else {
      triggerHaptic(40);
      setWrong(m);
      window.setTimeout(() => setWrong(w => (w === m ? null : w)), 450);
    }
  };
  const onUp = (m: number) => {
    voices.current.get(m)?.off(0);
    voices.current.delete(m);
    setHeld(s => { const n = new Set(s); n.delete(m); return n; });
  };

  const startFollow = () => {
    stop();
    wakeSound();
    setPraise(false);
    setFollow(f => (f === null ? 0 : null));
  };

  const pickNote = (i: number) => {
    triggerHaptic(8);
    if (!picking) { setPart({ a: i, b: i }); setPicking(true); return; }
    setPart(p => (p ? { a: Math.min(p.a, i), b: Math.max(p.a, i) } : { a: i, b: i }));
    setPicking(false);
  };

  const lit = useMemo(() => {
    const s = new Set(held);
    sounding.forEach(i => s.add(notes[i]?.midi));
    return s;
  }, [held, sounding, notes]);
  const target = follow !== null ? chosen[follow]?.midi ?? null : null;
  const doneUpTo = follow !== null ? a + follow : -1;

  return (
    <Sheet open title="მელოდია კლავიშებზე" onClose={() => { stop(); onClose(); }}>
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <RoundButton size={48} tone="wine" label={playing ? 'პაუზა' : 'მოსმენა'} onClick={toggle}>
            {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="translate-x-px" />}
          </RoundButton>
          <Stepper label="ტონი" value={toneLabel(tone)} onMinus={() => onTone(stepTone(tone, -1))} onPlus={() => onTone(stepTone(tone, 1))}
            minusOff={tone <= TONE_MIN} plusOff={tone >= TONE_MAX} />
          <Stepper label="სიჩქარე" value={speedLabel(speed)} onMinus={() => onSpeed(stepSpeed(speed, -1))} onPlus={() => onSpeed(stepSpeed(speed, 1))}
            minusOff={speed <= SPEEDS[0]} plusOff={speed >= SPEEDS[SPEEDS.length - 1]} />
        </div>

        <Keyboard lo={lo} hi={hi} lit={lit} target={target} wrong={wrong} onDown={onDown} onUp={onUp} startAt={lo} height={140} />

        <p role="status" className={`min-h-[1.25rem] text-center text-meta ${praise ? 'font-bold text-leaf' : 'text-mut'}`}>
          {praise ? 'ყოჩაღ! სწორად დაუკარი ✓'
            : follow !== null ? `დააჭირე ოქროსფრად მონიშნულ კლავიშს · ${follow + 1} / ${chosen.length}`
            : playing ? 'უყურე, რომელი კლავიში ანათებს' : 'მოუსმინე, მერე „მიყევი“ — და თავად დაუკარი'}
        </p>

        <div className="flex flex-col gap-1.5 rounded-card bg-surf p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-meta font-bold text-ink">ნაწილის გამეორება</span>
            {part && (
              <button type="button" onClick={() => { setPart(null); setPicking(false); }}
                className="h-8 cursor-pointer rounded-full bg-page px-3 text-cap font-semibold text-wine active:scale-95">მთლიანი</button>
            )}
          </div>
          <p className="text-cap text-mut">{picking ? 'ახლა შეეხე ბოლო ნოტს' : 'შეეხე ნაწილის პირველ ნოტს, მერე — ბოლოს'}</p>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            {notes.map((n, i) => {
              const inPart = part ? i >= part.a && i <= part.b : false;
              const now = sounding.includes(i);
              return (
                <button key={i} type="button" onClick={() => pickNote(i)} aria-label={`ნოტი ${i + 1}: ${noteNameOf(n.midi)}`} aria-pressed={inPart}
                  className={`flex h-11 min-w-[2.6rem] shrink-0 cursor-pointer flex-col items-center justify-center rounded-field px-1 transition active:scale-95 ${
                    inPart ? 'bg-wine text-white' : i < doneUpTo + 1 && follow !== null && i >= a ? 'bg-leaf/20 text-ink' : 'bg-page text-ink'
                  } ${now ? 'ring-2 ring-gold' : ''}`}>
                  <span className={`text-[11px] leading-none ${inPart ? 'text-white/75' : 'text-faint'}`}>{i + 1}</span>
                  <span className="text-meta font-semibold leading-tight">{noteNameOf(n.midi)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => { triggerHaptic(8); setLoop(v => !v); }} aria-pressed={loop}
            className={`flex h-tap flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-meta font-bold transition active:scale-[.98] [&_svg]:size-[18px] ${loop ? 'bg-wine text-white' : 'bg-surf text-wine'}`}>
            <Repeat /> გამეორება
          </button>
          <button type="button" onClick={startFollow} aria-pressed={follow !== null}
            className={`flex h-tap flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-meta font-bold transition active:scale-[.98] [&_svg]:size-[18px] ${follow !== null ? 'bg-gold text-ink' : 'bg-surf text-wine'}`}>
            <Footprints /> მიყევი
          </button>
        </div>
      </div>
    </Sheet>
  );
};

export default MelodyKeys;
