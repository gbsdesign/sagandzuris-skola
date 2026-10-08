import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Music, Play, Square } from 'lucide-react';
import type { AudioTrackNoteItem, TuneObject } from 'abcjs';
import type { PlayMode, StaffSpec } from '../../data/abituriLessons';
import { lessonAudioReady, playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { triggerHaptic } from '../../utils/haptics';
import './staff.css';

// A lesson example on the staff (abcjs, loaded with the first example), played by the app's synth;
// the notes that sound turn red. One example sounds at a time on the whole page.

type Abcjs = typeof import('abcjs');
let loading: Promise<Abcjs> | null = null;
const loadAbcjs = () =>
  (loading ??= import('abcjs')
    .then(m => ((m as unknown as { default?: Abcjs }).default ?? m) as Abcjs)
    .catch(e => { loading = null; throw e; })); // offline before it was cached: try again next time

// the lesson's own serif: in it „წ“ (წ.5) is clearly not „ნ“
const HEAD = 'X:1\n%%annotationfont "Noto Serif Georgian" 12\n%%vocalfont "Noto Serif Georgian" 13\n';

interface Sound { at: number; len: number; midi: number; char: number }

// 'notes' plays the rhythm as written; 'even' gives every step the same time; 'arp' plays each chord
// or interval note by note and then together
const schedule = (events: AudioTrackNoteItem[], mode: PlayMode, tempo: number): Sound[] => {
  if (mode === 'notes') {
    const whole = 240 / tempo;
    return events.map(e => ({ at: e.start * whole, len: Math.max(0.12, e.duration * whole - 0.04), midi: e.pitch, char: e.startChar }));
  }
  const out: Sound[] = [];
  let t = 0;
  for (const s of [...new Set(events.map(e => e.start))].sort((a, b) => a - b)) {
    const group = events.filter(e => e.start === s).sort((a, b) => a.pitch - b.pitch);
    if (mode === 'even') {
      group.forEach(e => out.push({ at: t, len: 0.6, midi: e.pitch, char: e.startChar }));
      t += 0.66;
    } else if (group.length === 1) {
      out.push({ at: t, len: 1, midi: group[0].pitch, char: group[0].startChar });
      t += 1.3;
    } else {
      group.forEach((e, i) => out.push({ at: t + i * 0.5, len: 0.46, midi: e.pitch, char: e.startChar }));
      t += group.length * 0.5 + 0.1;
      group.forEach(e => out.push({ at: t, len: 1.4, midi: e.pitch, char: e.startChar }));
      t += 1.9;
    }
  }
  // the last step rings a little longer
  const last = Math.max(...out.map(o => o.at));
  out.forEach(o => { if (o.at === last) o.len = Math.max(o.len, 1.1); });
  return out;
};

let current: (() => void) | null = null;

/** `bare`: no box of its own (a staff inside a card or a button); `coverText`: what a covered staff says;
 * `autoPlay`: sounds once drawn, if the student has already played something */
export const Staff: React.FC<StaffSpec & { className?: string; bare?: boolean; coverText?: string; autoPlay?: boolean }> = ({
  abc, cap, play = 'notes', tempo = 84, hide, voices, start: withStart, className = 'my-4', bare, coverText, autoPlay,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const tune = useRef<TuneObject | null>(null);
  const timers = useRef<number[]>([]);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(!hide);
  const [playing, setPlaying] = useState<number | null>(null); // -1: every voice, else one voice

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    paper.current?.querySelectorAll('.abc-on').forEach(el => el.classList.remove('abc-on'));
    setPlaying(null);
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    let gone = false;
    loadAbcjs().then(abcjs => {
      if (gone || !paper.current) return;
      if (current === reset) { current = null; stopLessonNotes(); }
      reset();
      if (!shown) {
        // a covered dictation is only read (for the sound); it is drawn when opened
        paper.current.innerHTML = '';
        tune.current = abcjs.parseOnly(HEAD + abc)[0];
        setReady(true);
        return;
      }
      const scale = width < 520 ? 0.92 : 1.05;
      const [t] = abcjs.renderAbc(paper.current, HEAD + abc, {
        add_classes: true,
        scale,
        staffwidth: Math.floor(width / scale) - 6,
        paddingleft: 2,
        paddingright: 2,
        paddingtop: 6,
        paddingbottom: 2,
        foregroundColor: '#2a2017',
        // 0 = no fixed measures per line: abcjs then evens the lines out (4-3-3, not 4-4-2)
        wrap: { minSpacing: 1.8, maxSpacing: 2.7, preferredMeasuresPerLine: 0 },
      });
      tune.current = t;
      setReady(true);
      setFailed(false);
    }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, [abc, width, shown, reset]);

  // stop when the lesson closes
  useEffect(() => () => {
    if (current === reset) { current = null; stopLessonNotes(); }
    timers.current.forEach(clearTimeout);
  }, [reset]);

  const start = (voice: number) => {
    const t = tune.current;
    if (!t || play === false) return;
    triggerHaptic(10);
    const again = playing === voice;
    current?.();
    current = null;
    if (again) { stopLessonNotes(); return; }
    const events = t.setUpAudio({}).tracks.flatMap((tr, i) =>
      voice >= 0 && i !== voice ? [] : tr.filter((e): e is AudioTrackNoteItem => e.cmd === 'note'));
    if (!events.length) return;
    const sounds = schedule(events, play, tempo);
    void playLessonNotes(sounds.map(s => [s.at, s.len, s.midi] as [number, number, number]));
    const els = (char: number) =>
      ((t.getElementFromChar(char) as { abselem?: { elemset?: Element[] } } | null)?.abselem?.elemset ?? []);
    const at = (ms: number, f: () => void) => timers.current.push(window.setTimeout(f, 60 + ms));
    for (const s of sounds) {
      at(s.at * 1000, () => els(s.char).forEach(el => el.classList.add('abc-on')));
      at((s.at + s.len) * 1000, () => els(s.char).forEach(el => el.classList.remove('abc-on')));
    }
    at(Math.max(...sounds.map(s => s.at + s.len)) * 1000 + 120, () => { if (current === reset) current = null; reset(); });
    current = reset;
    setPlaying(voice);
  };

  // a new task sounds by itself once the student has played something
  const autoDone = useRef(false);
  useEffect(() => {
    if (!ready || !autoPlay || autoDone.current || !lessonAudioReady()) return;
    autoDone.current = true;
    start(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // every voice's first note, together — the dictation's starting chord
  const playStart = () => {
    const t = tune.current;
    if (!t) return;
    triggerHaptic(10);
    current?.();
    current = null;
    const firsts = t.setUpAudio({}).tracks
      .map(tr => tr.find((e): e is AudioTrackNoteItem => e.cmd === 'note'))
      .filter((e): e is AudioTrackNoteItem => Boolean(e));
    void playLessonNotes(firsts.map(e => [0, 1.6, e.pitch] as [number, number, number]));
  };

  const canPlay = play !== false;
  return (
    <figure className={className}>
      <div className={`relative rounded-2xl ${bare ? 'px-1' : 'bg-[#fffdf8] ring-1 ring-[#e8dcc8] px-2.5 sm:px-4 py-2'}`}>
        <div ref={box}>
          <div ref={paper} className={`abc-paper ${shown ? (ready ? '' : 'min-h-24') : 'h-32'}`} />
        </div>
        {failed && !ready && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-[13px] font-semibold text-[#8a7a6a]">
            ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.
          </p>
        )}
        {!shown && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-[#fbf6ec] p-3 text-center">
            <div>
              <p className="text-[13.5px] font-semibold leading-snug text-[#6b5c4d]">{coverText ?? 'ნოტები დამალულია — ჯერ მოუსმინე და ჩაწერე.'}</p>
              <button
                type="button"
                onClick={() => { triggerHaptic(10); setShown(true); }}
                className="mt-2.5 inline-flex items-center gap-1.5 min-h-10 px-4 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer"
              >
                <Eye className="w-4 h-4" /> ნოტების ჩვენება
              </button>
            </div>
          </div>
        )}
      </div>
      {canPlay && voices ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {withStart && (
            <button
              type="button"
              disabled={!ready}
              onClick={playStart}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-[13.5px] font-bold bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:text-[#7a2028] cursor-pointer disabled:opacity-50"
            >
              <Music className="w-4 h-4" /> საწყისი ბგერები
            </button>
          )}
          {[-1, ...voices.map((_, i) => i)].map(v => (
            <button
              key={v}
              type="button"
              disabled={!ready}
              onClick={() => start(v)}
              className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-[13.5px] font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                playing === v ? 'bg-[#5e1820] text-[#fbf6ec]' : v < 0 ? 'bg-[#7a2028] text-[#fbf6ec] hover:bg-[#5e1820]' : 'bg-[#fbf6ec] text-[#4a3426] ring-1 ring-[#e8dcc8] hover:text-[#7a2028]'
              }`}
            >
              {playing === v ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {v < 0 ? 'ყველა ხმა' : voices[v]}
            </button>
          ))}
        </div>
      ) : null}
      {(cap || (canPlay && !voices)) && (
        <figcaption className="mt-2 flex items-center gap-3">
          {canPlay && !voices && (
            <button
              type="button"
              disabled={!ready}
              onClick={() => start(-1)}
              aria-label={playing === -1 ? 'გაჩერება' : 'მოსმენა'}
              className={`shrink-0 grid place-items-center w-11 h-11 rounded-full text-[#fbf6ec] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)] transition-colors cursor-pointer disabled:opacity-50 ${playing === -1 ? 'bg-[#5e1820]' : 'bg-[#7a2028] hover:bg-[#5e1820]'}`}
            >
              {playing === -1 ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-[18px] h-[18px] ml-0.5 fill-current" />}
            </button>
          )}
          {cap && <span className="text-[13.5px] leading-snug text-[#6b5c4d]">{cap}</span>}
        </figcaption>
      )}
    </figure>
  );
};
