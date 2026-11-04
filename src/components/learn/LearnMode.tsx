import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Headphones, Pause, Play } from 'lucide-react';
import { useAuth } from '../../context';
import { findVersion } from '../../data/chantLookup';
import { BookScore, ChantSynth, makeTimeMap } from '../../utils/chantSynth';
import { LearnPart, LearnRecord, afterTry, learnTakeId, melodyIn, partsOfScore, timelineIn } from '../../utils/learn';
import { VOICE_NAMES } from '../../utils/pearls';
import { georgiaToday } from '../../utils/psalter';
import { useLearning } from '../../hooks/useLearning';
import { usePearls } from '../../hooks/usePearls';
import { triggerHaptic } from '../../utils/haptics';
import { chantName } from '../pearls/PearlSheet';
import type { Voice } from '../../utils/pathItems';
import { Choice, LOOPS_PER_STEP, LearnFrame, LearnLevel, LearnTips, LevelSwitch, PartsBar, ReviewReminder, SPEEDS, SettingsFold, SingPanel, Step, StepBar, VoiceChoice, getLearnLevel, setLearnLevel } from './LearnShared';
import { LearnEasy } from './LearnEasy';
import { PartPicture } from './PartPicture';

// „სასწავლო რეჟიმი“ of a chant: the book's notes cut into parts (a line of notes each), learned in one of two ways
// (LevelSwitch, remembered on the device):
// • „მარტივი“ (LearnEasy, the default): a part in small pieces — hear one, sing it back, the next; then the whole.
// • „სრული“ (LearnFull): each part by three steps — მოისმინე (50%, my voice alone, three times round) → ერთად (75%,
//   everyone but me) → მარტო (I sing, the phone checks it on a mirror); speed and what sounds folded under „მორგება“.
// Progress in students.learning (useLearning) is the same for both; takes go to the teacher like the pearls' (learn~ ids).

// 'ears': my voice in the left ear, the others in the right (one earphone each, or headphones)
type Mix = 'mine' | 'all' | 'others' | 'ears';
const ordinal = (n: number) => (n === 1 ? 'პირველი' : `მე-${n}`);
const MIX_NAMES: Record<Mix, string> = { mine: 'მხოლოდ ჩემი ხმა', all: 'ყველა ხმა', others: 'ჩემ გარეშე', ears: 'ყურებში ცალ-ცალკე' };

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
  const [level, setLevel] = useState<LearnLevel>(getLearnLevel);
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
    setCurrent(due >= 0 ? due : fresh >= 0 ? fresh : 0);
  }, [rec, loaded]);

  const onTry = (part: number, pct: number, ok: boolean) => savePart(part, afterTry(recRef.current[part], pct, ok, today));
  const pickLevel = (l: LearnLevel) => { setLevel(l); setLearnLevel(l); };
  const title = info ? chantName(info.chant.title) : '';
  const num = info?.variant.bookNums?.[0];
  const easyPart = current === 'all' ? 0 : Math.max(0, Math.min(parts.length - 1, current));

  return (
    <LearnFrame title={title} subtitle={`სასწავლო რეჟიმი${num ? ` · №${num}` : ''}`} onClose={onClose}>
      <LevelSwitch value={level} onChange={pickLevel} />

      {voiceCount > 1 && (
        <VoiceChoice count={voiceCount} value={voice} names={VOICE_NAMES} onChange={v => { setVoicePicked(true); setVoice(v); }} />
      )}

      {level === 'easy' ? (
        <LearnEasy
          vid={vid} score={score} parts={parts} rec={rec} today={today} loaded={loaded}
          current={easyPart} onPick={p => setCurrent(Math.max(0, Math.min(parts.length - 1, p)))}
          voice={voice} uid={uid} sendId={p => learnTakeId(vid, p)} onTry={onTry} onFull={() => pickLevel('full')}
        />
      ) : (
        <LearnFull
          vid={vid} score={score} parts={parts} rec={rec} today={today} loaded={loaded} current={current} setCurrent={setCurrent}
          voice={voice} voiceCount={voiceCount} uid={uid} unlimited={isSuperAdmin} title={title}
          approved={id => Boolean(pearls.shine[id])} onTry={onTry}
        />
      )}

      {uid && <ReviewReminder />}
      <LearnTips easy={level === 'easy'} />
    </LearnFrame>
  );
};

/** „სრული“: a part by three steps, the music in a loop; the hand-set controls folded. */
const LearnFull: React.FC<{
  vid: string; score: BookScore; parts: LearnPart[]; rec: LearnRecord; today: string; loaded: boolean;
  current: number | 'all'; setCurrent: (p: number | 'all') => void;
  voice: Voice; voiceCount: number; uid: string | null; unlimited: boolean; title: string;
  approved: (sendId: string) => boolean; onTry: (part: number, pct: number, ok: boolean) => void;
}> = ({ vid, score, parts, rec, today, loaded, current, setCurrent, voice, voiceCount, uid, unlimited, title, approved, onTry: tryPart }) => {
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

  // a part opens on its first step — a learned one (a review) on singing alone; the joined parts on „ერთად“
  useEffect(() => {
    if (!loaded) return;
    stop();
    goStep(current !== 'all' && (rec[current]?.level ?? 0) >= 1 ? 3 : current === 'all' ? 2 : 1);
  }, [current, loaded]);

  const vi = Number(voice) - 1;
  const range = current === 'all'
    ? (() => { let k = 0; while (k < parts.length && (rec[k]?.level ?? 0) >= 1) k++; return { s0: parts[0].s0, s1: parts[Math.max(0, k - 1)].s1, b0: parts[0].b0, b1: parts[Math.max(0, k - 1)].b1, sys: parts.slice(0, Math.max(1, k)).flatMap(p => p.sys) }; })()
    : parts[current] ?? parts[0];
  const target = useMemo(() => melodyIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);
  const timeline = useMemo(() => timelineIn(score, vi, range.b0, range.b1), [score, vi, range.b0, range.b1]);

  // the synth follows the choices
  useEffect(() => {
    score.voices.forEach((_, i) => {
      synth.setMuted(i, mix === 'mine' ? i !== vi : mix === 'others' ? i === vi : false);
      synth.setPan(i, mix === 'ears' ? (i === vi ? -1 : 1) : 0);
    });
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
    tryPart(current, pct, ok);
  };

  const pick = (p: number | 'all') => { stop(); setCurrent(p); };
  const partName = current === 'all' ? 'ნასწავლი ფრაზები ერთად' : `${ordinal(current + 1)} ფრაზა`;
  const sendId = learnTakeId(vid, current);

  return (
    <>
      <PartsBar count={parts.length} rec={rec} today={today} current={current} onPick={pick} noun="ფრაზა" />

      <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-3">
        <h2 className="text-[13px] font-extrabold text-[#7a2028]">{partName}</h2>
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
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#75685a]">
            <b className="text-[#4a3426]">{playing ? 'ისმის' : 'მოსმენა'}:</b> {voiceCount > 1 ? MIX_NAMES[mix] : 'ნოტები'} · {Math.round(speed * 100)}%
          </p>
        </div>
        <SettingsFold summary={voiceCount > 1 ? 'სისწრაფე, რა ისმის' : 'სისწრაფე'}>
          <Choice<number> label="სისწრაფე" value={speed} onChange={setSpeed} options={SPEEDS} />
          {voiceCount > 1 && (
            <Choice<Mix> label="რა ისმის" value={mix} onChange={setMix}
              options={[{ value: 'mine', label: 'ჩემი ხმა' }, { value: 'all', label: 'ყველა' }, { value: 'others', label: 'ჩემ გარეშე' }, { value: 'ears', label: 'ყურებში' }]} />
          )}
          {voiceCount > 1 && mix === 'ears' && (
            <p className="flex items-start gap-2 text-[13px] leading-snug text-[#8c7c6b]">
              <Headphones className="w-4 h-4 mt-0.5 shrink-0" />
              ყურსასმენით: მარცხენა ყურში შენი ხმაა, მარჯვენაში — დანარჩენები. ერთ ყურს მოხსნი და მხოლოდ ერთ მხარეს გაიგებ.
            </p>
          )}
          <p className="text-[12.5px] leading-snug text-[#8c7c6b]">ნაბიჯები ამას თავად აყენებს — აქ მხოლოდ მაშინ შეცვალე, თუ სხვანაირად გინდა.</p>
        </SettingsFold>
      </section>

      <SingPanel
        target={target}
        cue={target[0] ?? null}
        seconds={range.s1 - range.s0}
        uid={uid}
        unlimited={unlimited}
        voice={voice}
        about={{ title, voice: VOICE_NAMES[voice], what: partName }}
        sendId={sendId}
        approved={approved(sendId)}
        onBeforeSing={stop}
        onTry={onTry}
        timeline={timeline}
        focus={step === 3}
      />
    </>
  );
};
