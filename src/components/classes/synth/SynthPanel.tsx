import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Pause, Play, Send, Square, Trash2, X } from 'lucide-react';
import { RoundButton } from '../../ui2';
import { Keyboard } from './Keyboard';
import { InstrChips, Stepper } from './parts';
import {
  bakeMelody, encodeMelody, MEL_MAX_MS, MEL_MAX_NOTES, renderNotes, shapeMelody, soundingSeconds, speedLabel, stepSpeed, stepTone,
  toneLabel, trimMelody, TONE_MAX, TONE_MIN, SPEEDS, type Instr, type MelNote, type Melody,
} from '../../../utils/melody';
import { keyOn, playNotes, stopMelody, wakeSound, type Playback } from '../../../utils/melodyPlay';
import { encodeMp3 } from '../../../utils/chantSynth';
import { waveOf, type VoiceTake } from '../../../utils/voiceRecorder';
import { holdUpdates } from '../../../utils/appUpdate';
import { triggerHaptic } from '../../../utils/haptics';
import { useBackToClose } from '../../../utils/backToClose';
import { askConfirm } from '../../ui/kit';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const INSTR_KEY = 'sg-synth-instr';
const readInstr = (): Instr => {
  try { const v = localStorage.getItem(INSTR_KEY); return v === 'organ' || v === 'flute' || v === 'pluck' ? v : 'piano'; } catch { return 'piano'; }
};

type Stage = { k: 'free' } | { k: 'rec'; started: number | null } | { k: 'take'; mel: Melody } | { k: 'making' };

/**
 * The chat's synthesizer (2026-11-23, the user: „სინთეზატორი … კლავიატურა … ტონის ასაწევ-დასაწევი … სიჩქარე … ჩაწერის ღილაკი“):
 * rises over the chat's field from its 🎹. One plays freely; „ჩაწერა“ writes down the keys from the first one pressed; then the
 * melody is heard and goes as a voice message — in the tone and pace set here — carrying its notes (`mel`).
 */
const SynthPanel: React.FC<{
  onClose: () => void;
  onSend: (take: VoiceTake & { mel: string }) => Promise<void>;
}> = ({ onClose, onSend }) => {
  const [instr, setInstrState] = useState<Instr>(readInstr);
  const setInstr = (i: Instr) => { setInstrState(i); try { localStorage.setItem(INSTR_KEY, i); } catch { /* private mode */ } };
  const [tone, setTone] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [stage, setStage] = useState<Stage>({ k: 'free' });
  const [lit, setLit] = useState<ReadonlySet<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [err, setErr] = useState('');

  // keys held now, and the notes written down while recording
  const voices = useRef(new Map<number, ReturnType<typeof keyOn>[]>());
  const notes = useRef<MelNote[]>([]);
  const open = useRef(new Map<number, number[]>());
  const t0 = useRef<number | null>(null);
  const play = useRef<Playback | null>(null);
  const stageRef = useRef(stage);
  stageRef.current = stage;

  useEffect(() => { holdUpdates('keys', true); return () => { holdUpdates('keys', false); stopMelody(); }; }, []);

  const litOn = (m: number, on: boolean) => setLit(s => {
    const n = new Set(s);
    if (on) n.add(m); else n.delete(m);
    return n;
  });

  const onDown = (key: number) => {
    const m = key + tone;
    const v = keyOn(instr, m);
    voices.current.set(key, [...(voices.current.get(key) ?? []), v]);
    litOn(key, true);
    const s = stageRef.current;
    if (s.k === 'rec') {
      const now = performance.now();
      if (t0.current === null) { t0.current = now; setStage({ k: 'rec', started: Date.now() }); }
      if (notes.current.length >= MEL_MAX_NOTES) { finish(); return; }
      notes.current.push([key, now - t0.current, 0]);
      open.current.set(key, [...(open.current.get(key) ?? []), notes.current.length - 1]);
    }
  };
  const onUp = (key: number) => {
    const list = voices.current.get(key) ?? [];
    const v = list.shift();
    if (list.length) voices.current.set(key, list); else voices.current.delete(key);
    v?.off(0);
    if (!list.length) litOn(key, false);
    const idx = open.current.get(key);
    const i = idx?.shift();
    if (i !== undefined && t0.current !== null) {
      const n = notes.current[i];
      n[2] = Math.max(40, performance.now() - t0.current - n[1]);
    }
  };

  // the recording's clock; it stops by itself at five minutes
  useEffect(() => {
    if (stage.k !== 'rec' || stage.started === null) return;
    const started = stage.started;
    const t = window.setInterval(() => {
      const s = (Date.now() - started) / 1000;
      setElapsed(s);
      if (s * 1000 >= MEL_MAX_MS) finish();
    }, 250);
    return () => window.clearInterval(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRec = () => {
    wakeSound();
    triggerHaptic(20);
    setErr('');
    notes.current = [];
    open.current.clear();
    t0.current = null;
    setElapsed(0);
    setStage({ k: 'rec', started: null });
  };
  function finish() {
    if (stageRef.current.k !== 'rec') return;
    // keys still held end now
    const now = t0.current === null ? 0 : performance.now() - t0.current;
    open.current.forEach(list => list.forEach(i => { notes.current[i][2] = Math.max(40, now - notes.current[i][1]); }));
    open.current.clear();
    const n = notes.current.filter(x => x[2] > 0);
    if (!n.length) { setErr('ჯერ არაფერი დაგიკრავს.'); setStage({ k: 'free' }); return; }
    triggerHaptic(20);
    setPos(0);
    setStage({ k: 'take', mel: trimMelody({ i: instr, n }) });
  }
  const cancelRec = () => { open.current.clear(); setStage({ k: 'free' }); };

  const stopPlay = () => { play.current?.stop(); play.current = null; setPlaying(false); setLit(new Set()); };
  const shaped = (mel: Melody) => shapeMelody({ ...mel, i: instr }, tone, speed);
  const togglePlay = () => {
    if (stage.k !== 'take') return;
    if (playing) { stopPlay(); return; }
    const sn = shaped(stage.mel);
    setPlaying(true);
    play.current = playNotes(sn, instr, {
      onFrame: (t, idx) => { setPos(t); setLit(new Set(idx.map(i => sn[i].midi - tone))); },
      onEnd: () => { play.current = null; setPlaying(false); setPos(0); setLit(new Set()); },
    });
  };
  // a new tone or pace while it plays: heard at once, from the start
  useEffect(() => { if (playing) { stopPlay(); } }, [tone, speed, instr]); // eslint-disable-line react-hooks/exhaustive-deps

  const discard = () => { stopPlay(); setStage({ k: 'free' }); };

  const send = async () => {
    if (stage.k !== 'take') return;
    stopPlay();
    const mel = stage.mel;
    setStage({ k: 'making' });
    setErr('');
    try {
      const baked = bakeMelody({ ...mel, i: instr }, tone, speed);
      const sn = shapeMelody(baked);
      const buf = await renderNotes(sn, instr);
      const mp3 = await encodeMp3(buf, undefined, 64);
      await onSend({ mp3, seconds: buf.duration, wave: waveOf(buf.getChannelData(0)), mel: encodeMelody(baked) });
      triggerHaptic(20);
      setTone(0);
      setSpeed(1);
      setStage({ k: 'free' });
    } catch (e) {
      console.warn('melody: ', e);
      setErr('მელოდია ვერ გაიგზავნა. სცადე თავიდან.');
      setStage({ k: 'take', mel });
    }
  };

  const close = async () => {
    if (stageRef.current.k === 'take' && !(await askConfirm({ title: 'წავშალო ჩაწერილი მელოდია?', ok: 'წაშლა', danger: true }))) return;
    stopPlay();
    onClose();
  };
  useBackToClose(true, () => { void close(); });

  const total = stage.k === 'take' ? soundingSeconds(shaped(stage.mel)) : 0;

  return (
    <div className="sg-up mx-2 mb-1 mt-2 flex flex-col gap-2 rounded-card bg-surf p-2 shadow-lift sm:mx-4" onPointerDown={wakeSound}>
      <div className="flex items-center gap-2">
        <InstrChips value={instr} onChange={setInstr} />
        <RoundButton size={36} tone="page" label="სინთეზატორის დახურვა" onClick={() => void close()}><X /></RoundButton>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Stepper label="ტონი" value={toneLabel(tone)} onMinus={() => setTone(t => stepTone(t, -1))} onPlus={() => setTone(t => stepTone(t, 1))}
          minusOff={tone <= TONE_MIN} plusOff={tone >= TONE_MAX} />
        <Stepper label="სიჩქარე" value={speedLabel(speed)} onMinus={() => setSpeed(s => stepSpeed(s, -1))} onPlus={() => setSpeed(s => stepSpeed(s, 1))}
          minusOff={speed <= SPEEDS[0]} plusOff={speed >= SPEEDS[SPEEDS.length - 1]} />
      </div>
      <Keyboard lo={36} hi={96} lit={lit} onDown={onDown} onUp={onUp} startAt={60} />

      {err && <p className="px-1 text-meta text-danger">{err}</p>}

      <div className="flex items-center gap-1.5">
        {stage.k === 'free' && (
          <button type="button" onClick={startRec}
            className="flex h-tap flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-wine px-4 text-lead font-bold text-white transition active:scale-[.98]">
            <span className="size-3 rounded-full bg-white" aria-hidden="true" /> ჩაწერა
          </button>
        )}
        {stage.k === 'rec' && (
          <>
            <RoundButton size={44} label="ჩაწერის გაუქმება" onClick={cancelRec}><X /></RoundButton>
            <div className="flex h-tap min-w-0 flex-1 items-center gap-2.5 rounded-full bg-page px-4">
              <span className="size-2.5 shrink-0 rounded-full bg-danger animate-pulse" />
              <span className="truncate text-meta text-mut">
                {stage.started === null ? 'დაუკარი — ჩაწერა პირველი კლავიშით იწყება' : <><b className="tabular-nums text-wine">{clock(elapsed)}</b> იწერება…</>}
              </span>
            </div>
            <RoundButton size={44} tone="wine" label="ჩაწერის დასრულება" onClick={finish}><Square fill="currentColor" /></RoundButton>
          </>
        )}
        {stage.k === 'take' && (
          <>
            <RoundButton size={44} label="წაშლა და თავიდან" onClick={discard} className="text-danger"><Trash2 /></RoundButton>
            <button type="button" onClick={togglePlay} aria-label={playing ? 'პაუზა' : 'მოსმენა'}
              className="flex h-tap min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-full bg-page pl-1.5 pr-4 transition active:scale-[.98]">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wine text-white [&_svg]:size-4">
                {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="translate-x-px" />}
              </span>
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-wine/20">
                <span className="block h-full rounded-full bg-wine" style={{ width: `${total ? Math.min(100, (pos / total) * 100) : 0}%` }} />
              </span>
              <span className="text-cap tabular-nums text-mut">{clock(playing ? pos : total)}</span>
            </button>
            <RoundButton size={44} tone="wine" label="გაგზავნა" onClick={send}><Send /></RoundButton>
          </>
        )}
        {stage.k === 'making' && (
          <div className="flex h-tap flex-1 items-center justify-center gap-2 rounded-full bg-page text-meta text-mut">
            <Loader2 className="size-4 animate-spin" /> იგზავნება…
          </div>
        )}
      </div>
    </div>
  );
};

export default SynthPanel;
