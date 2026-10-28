import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Repeat } from 'lucide-react';
import { useAuth } from '../../context';
import { findVersion } from '../../data/chantLookup';
import { BookScore, ChantSynth, bookImageUrl, makeTimeMap } from '../../utils/chantSynth';
import { afterTry, learnTakeId, markerAt, melodyIn, partsOfScore, timelineIn } from '../../utils/learn';
import { VOICE_NAMES } from '../../utils/pearls';
import { georgiaToday } from '../../utils/psalter';
import { useLearning } from '../../hooks/useLearning';
import { usePearls } from '../../hooks/usePearls';
import { triggerHaptic } from '../../utils/haptics';
import { chantName } from '../pearls/PearlSheet';
import type { Voice } from '../../utils/pathItems';
import { Choice, LOOPS_PER_STEP, LearnFrame, LearnTips, PartsBar, ReviewReminder, SPEEDS, SingPanel, Step, StepBar } from './LearnShared';

// „სასწავლო რეჟიმი“ of a chant: the book's notes cut into parts (a line of notes each). Each part goes by three steps:
// მოისმინე (50%, my voice alone, three times round) → ერთად (75%, everyone but me) → მარტო (I sing, the phone
// checks it on a mirror). A mark runs over the part's notes while it sounds. Progress in students.learning
// (useLearning); takes go to the teacher like the pearls' (learn~ ids).

type Mix = 'mine' | 'all' | 'others';
const ordinal = (n: number) => (n === 1 ? 'პირველი' : `მე-${n}`);

/** `voice`: the voice to start on (a teacher's assignment); otherwise the one named in the profile. */
export const LearnMode: React.FC<{ vid: string; score: BookScore; voice?: Voice; onClose: () => void }> = ({ vid, score, voice: asked, onClose }) => {
  const info = findVersion(vid);
  const { user, isSuperAdmin } = useAuth();
  const uid = user?.uid ?? null;
  const pearls = usePearls(uid);
  const { rec, loaded, savePart, noteParts } = useLearning(uid, vid);
  const today = georgiaToday();
  const parts = useMemo(() => partsOfScore(score), [score]);
  const voiceCount = Math.min(3, score.voices.length);
  const askedOk = !!asked && Number(asked) <= voiceCount;
  const [voice, setVoice] = useState<Voice>(askedOk ? asked! : '1');
  const [voicePicked, setVoicePicked] = useState(askedOk);
  const [current, setCurrent] = useState<number | 'all'>(0);
  const [mix, setMix] = useState<Mix>('mine');
  const [speed, setSpeed] = useState(0.5);
  const [step, setStep] = useState<Step>(1);
  const [loops, setLoops] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState(0);
  const [beat, setBeat] = useState<number | null>(null);
  const synth = useMemo(() => new ChantSynth(score), [score]);
  const toBeat = useMemo(() => makeTimeMap(score.tempos).toBeat, [score]);
  const raf = useRef(0);
  const stepRef = useRef<Step>(1);
  const loopsRef = useRef(0);
  const lastPos = useRef(0);
  const recRef = useRef(rec);
  recRef.current = rec;

  // the voice named in the profile, until another is picked
  useEffect(() => {
    if (!voicePicked && pearls.loaded) setVoice(Number(pearls.voice) <= voiceCount ? pearls.voice : '1');
  }, [pearls.loaded, pearls.voice, voicePicked, voiceCount]);
  // the teacher's bars need the number of parts
  useEffect(() => { if (loaded) noteParts(parts.length); }, [loaded, parts.length]);
  // open on the first part not yet learned (or one due for review)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !loaded) return;
    opened.current = true;
    const due = parts.findIndex((_, i) => rec[i]?.due && rec[i].due! <= today && rec[i].level < 4);
    const fresh = parts.findIndex((_, i) => !rec[i] || rec[i].level <= 0);
    const first = due >= 0 ? due : fresh >= 0 ? fresh : 0;
    setCurrent(first);
    goStep((rec[first]?.level ?? 0) >= 1 ? 3 : 1);
  }, [rec, loaded]);

  const vi = Number(voice) - 1;
  const range = current === 'all'
    ? (() => { let k = 0; while (k < parts.length && (rec[k]?.level ?? 0) >= 1) k++; return { s0: parts[0].s0, s1: parts[Math.max(0, k - 1)].s1, b0: parts[0].b0, b1: parts[Math.max(0, k - 1)].b1, sys: parts.slice(0, Math.max(1, k)).flatMap(p => p.sys) }; })()
    : parts[current] ?? parts[0];
  const target = useMemo(() => melodyIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const timeline = useMemo(() => timelineIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);

  // the synth follows the choices
  useEffect(() => {
    score.voices.forEach((_, i) => synth.setMuted(i, mix === 'mine' ? i !== vi : mix === 'others' ? i === vi : false));
  }, [synth, mix, vi, score]);
  useEffect(() => { synth.setSpeed(speed); }, [synth, speed]);
  useEffect(() => {
    synth.setLoop(range.s0, range.s1);
    synth.seek(range.s0);
    setHead(0);
    setBeat(null);
    lastPos.current = range.s0;
  }, [synth, range.s0, range.s1]);
  useEffect(() => () => { cancelAnimationFrame(raf.current); synth.dispose(); }, [synth]);

  // a step: its speed and what sounds; the last one is for singing, so the music stops
  const goStep = (n: Step) => {
    stepRef.current = n;
    loopsRef.current = 0;
    setStep(n);
    setLoops(0);
    if (n === 1) { setSpeed(0.5); setMix('mine'); }
    else if (n === 2) { setSpeed(0.75); setMix(voiceCount > 1 ? 'others' : 'all'); }
    else { setSpeed(1); setMix('mine'); synth.pause(); setPlaying(false); setBeat(null); }
  };

  const follow = () => {
    const len = range.s1 - range.s0;
    const pos = synth.position();
    // back at the part's start: once more round; after three the path moves on
    if (pos < lastPos.current - 0.2) {
      loopsRef.current += 1;
      setLoops(loopsRef.current);
      if (loopsRef.current >= LOOPS_PER_STEP && stepRef.current < 3) goStep((stepRef.current + 1) as Step);
    }
    lastPos.current = pos;
    setHead(len > 0 ? Math.max(0, Math.min(1, (pos - range.s0) / len)) : 0);
    setBeat(toBeat(pos));
    if (synth.playing) raf.current = requestAnimationFrame(follow);
    else setBeat(null);
  };
  useEffect(() => { cancelAnimationFrame(raf.current); if (playing) raf.current = requestAnimationFrame(follow); }, [playing, range.s0, range.s1]);

  const stop = () => { synth.pause(); setPlaying(false); setBeat(null); };
  const toggle = async () => {
    triggerHaptic(10);
    if (synth.playing) { stop(); return; }
    const pos = synth.position();
    await synth.play(pos >= range.s0 && pos < range.s1 ? pos : range.s0);
    setPlaying(true);
  };

  const onTry = (pct: number, ok: boolean) => {
    if (current === 'all') return; // the joined parts are practice: the parts keep their own records
    savePart(current, afterTry(recRef.current[current], pct, ok, today));
  };

  const pick = (p: number | 'all') => {
    stop();
    setCurrent(p);
    goStep(p !== 'all' && (rec[p]?.level ?? 0) >= 1 ? 3 : p === 'all' ? 2 : 1);
  };
  const title = info ? chantName(info.chant.title) : '';
  const num = info?.variant.bookNums?.[0];
  const partName = current === 'all' ? 'ნასწავლი ფრაზები ერთად' : `${ordinal(current + 1)} ფრაზა`;
  const sendId = learnTakeId(vid, current);

  return (
    <LearnFrame title={title} subtitle={`სასწავლო რეჟიმი${num ? ` · №${num}` : ''}`} onClose={() => { stop(); onClose(); }}>
      <PartsBar count={parts.length} rec={rec} today={today} current={current} onPick={pick} noun="ფრაზა" />

      {voiceCount > 1 && (
        <Choice<Voice> label="ჩემი ხმა" value={voice} onChange={v => { setVoicePicked(true); setVoice(v); }}
          options={(['1', '2', '3'] as Voice[]).slice(0, voiceCount).map(v => ({ value: v, label: VOICE_NAMES[v] }))} />
      )}

      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[13px] font-extrabold text-[#7a2028]">{partName}</h2>
          <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-[#8c7c6b]"><Repeat className="w-3.5 h-3.5" />წრეზე</span>
        </div>
        <StepBar step={step} loops={loops} onStep={n => goStep(n)} hints={[
          'ნელა, მხოლოდ შენი ხმა. მოისმინე სამჯერ და მიჰყევი ნიშანს ნოტებზე.',
          voiceCount > 1 ? 'შენი ხმა ჩუმადაა: იმღერე დანარჩენებთან ერთად.' : 'იმღერე ჟღერადობასთან ერთად.',
          'ახლა მარტო იმღერე ქვემოთ. შეგიძლია ჯერ კიდევ ერთხელ მოისმინო.',
        ]} />
        <PartPicture score={score} sys={range.sys} beat={beat} />
        {!range.sys.length && (
          <div className="h-1.5 rounded-full bg-[#efe6d6] overflow-hidden" aria-hidden>
            <div className="h-full bg-[#7a2028] rounded-full" style={{ width: `${head * 100}%` }} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggle} aria-label={playing ? 'გაჩერება' : 'მოსმენა'}
            className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)]">
            {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1 flex flex-col gap-3 min-[460px]:flex-row min-[460px]:gap-5">
            <Choice<number> label="სისწრაფე" value={speed} onChange={setSpeed} options={SPEEDS} />
          </div>
        </div>
        {voiceCount > 1 && (
          <Choice<Mix> label="რა ისმის" value={mix} onChange={setMix}
            options={[{ value: 'mine', label: 'ჩემი ხმა' }, { value: 'all', label: 'ყველა' }, { value: 'others', label: 'ჩემ გარეშე' }]} />
        )}
      </section>

      <SingPanel
        target={target}
        cue={target[0] ?? null}
        seconds={range.s1 - range.s0}
        uid={uid}
        unlimited={isSuperAdmin}
        voice={voice}
        about={{ title, voice: VOICE_NAMES[voice], what: partName }}
        sendId={sendId}
        approved={Boolean(pearls.shine[sendId])}
        onBeforeSing={stop}
        onTry={onTry}
        timeline={timeline}
        focus={step === 3}
      />

      {uid && <ReviewReminder />}
      <LearnTips />
    </LearnFrame>
  );
};

/** The part's lines cut out of the book's page, one under another; while it sounds a mark runs over the notes (its place
 *  on the line is estimated — the page has no note positions — so it is a soft band, not a hairline). */
const PartPicture: React.FC<{ score: BookScore; sys: number[]; beat: number | null }> = ({ score, sys, beat }) => {
  if (!sys.length) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] p-1.5">
      {sys.map(k => {
        const [ii, x, y, w, h, t0, t1] = score.sys[k];
        const im = score.img[ii];
        if (!im) return null;
        const here = beat != null && beat >= t0 && beat < t1;
        return (
          <div key={k} className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: `${w * im.w} / ${h * im.h}` }}>
            <img src={bookImageUrl(score, im.src)} alt="" draggable={false}
              className="absolute max-w-none select-none [filter:brightness(.8)_contrast(1.8)]"
              style={{ width: `${100 / w}%`, height: `${100 / h}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }} />
            {here && (
              <span aria-hidden className="absolute top-0 bottom-0 w-[14px] -ml-[7px] rounded-full bg-[#7a2028]/15 ring-1 ring-[#7a2028]/30 pointer-events-none transition-[left] duration-150 ease-linear"
                style={{ left: `${markerAt(score, k, beat) * 100}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
