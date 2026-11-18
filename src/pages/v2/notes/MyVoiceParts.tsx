// The notes page's two „my voice“ helpers in the new look (boards x-idea-minus, x-idea-diapazoni): „ჩემი ხმის გარეშე“
// in the synthesizer's player, and the notes moved into my measured voice once when a chant opens. Each listens to my
// record only while it is on screen, so the old look never pays for them.
import React, { useEffect, useRef, useState } from 'react';
import type { BookScore } from '../../../utils/chantSynth';
import { triggerHaptic } from '../../../utils/haptics';
import { cx } from '../../../components/ui2';
import { useMyVoice } from './myVoice';
import { MinusButton } from './MinusBar';
import { VoicePickSheet } from './VoicePickSheet';
import { fitFor, useMyRange } from './voiceFit';
import { FitToast } from './FitToast';

const ROMAN = ['I', 'II', 'III'];

/** „ჩემი ხმის გარეშე“: asks my voice once, then the notes page turns every voice on but mine (and back). */
export const MinusControl: React.FC<{
  /** the score's voices */
  count: number;
  on: boolean;
  /** `mine`: my voice's index in the score (0-based) */
  onStart: (mine: number) => void;
  onStop: () => void;
  /** the voice question is open (the pedal waits meanwhile) */
  onPicking: (open: boolean) => void;
  say: (msg: string) => void;
  /** night paper: the pill turns quiet so it does not glare */
  dark?: boolean;
  /** beside the voices (a turned phone, a computer): only as wide as its words */
  compact?: boolean;
}> = ({ count, on, onStart, onStop, onPicking, say, dark, compact }) => {
  const { voice, save } = useMyVoice();
  const [asking, setAsking] = useState(false);
  const report = useRef(onPicking);
  report.current = onPicking;
  useEffect(() => { report.current(asking); }, [asking]);
  useEffect(() => () => report.current(false), []);

  const start = (v: '1' | '2' | '3') => {
    const i = Number(v) - 1;
    if (i >= count) { say(`ამ საგალობელს ${ROMAN[i]} ხმა არ აქვს`); return; }
    onStart(i);
  };
  const click = () => {
    triggerHaptic(10);
    if (on) { onStop(); return; }
    if (!voice) { setAsking(true); return; }
    start(voice);
  };
  return (
    <>
      <div className={cx('contents', dark && '[&>button]:bg-white/10 [&>button]:text-blush', compact && '[&>button]:w-auto')}>
        <MinusButton on={on} onClick={click} />
      </div>
      <VoicePickSheet
        open={asking}
        onClose={() => setAsking(false)}
        value={voice}
        onPick={v => { setAsking(false); void save(v); start(v); }}
      />
    </>
  );
};

/** Once a chant: the notes move into my measured voice (≤ a fourth) and a card offers „დააბრუნე“. */
export const VoiceFit: React.FC<{
  vid: string;
  /** the score of this very version (null while it loads) */
  score: BookScore | null;
  /** opened from a list or the learning mode, not in church, not following the regent */
  active: boolean;
  /** the tone is still where it opened (the person has not touched it) */
  untouched: () => boolean;
  onShift: (d: number) => void;
  onUndo: () => void;
}> = ({ vid, score, active, untouched, onShift, onUndo }) => {
  const range = useMyRange();
  const { voice } = useMyVoice();
  const done = useRef<string | null>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => { setShown(0); }, [vid]);
  useEffect(() => {
    if (!active || !score || !range || done.current === vid) return;
    done.current = vid;
    if (!untouched()) return;
    try { if (localStorage.getItem('sg-fit-off') === '1') return; } catch { /* private mode: go on */ }
    const i = voice ? Number(voice) - 1 : -1;
    const part = i >= 0 && score.voices[i]?.length ? [score.voices[i]] : score.voices;
    const d = fitFor(range, part.flat().map(n => n[2]));
    if (!d) return;
    onShift(d);
    setShown(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, score, range, voice, vid]);
  if (!shown) return null;
  return (
    <FitToast
      shift={shown}
      onUndo={() => {
        onUndo();
        try { localStorage.setItem('sg-fit-off', '1'); } catch { /* private mode */ }
        setShown(0);
      }}
      onClose={() => setShown(0)}
    />
  );
};
