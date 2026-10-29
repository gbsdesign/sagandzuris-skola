import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Check, Headphones, Loader2, Mic, Pause, Play, RotateCcw, Send, Square, Users } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import type { SchoolClass } from '../../hooks/useClasses';
import { saveTake, takeUrl, usePearlTakes, type PearlTake } from '../../hooks/usePearls';
import { classChatBase, sendTextMessage, sendVoiceMessage, type ChatAuthor } from '../../hooks/useClassChat';
import { ChantSynth, encodeMp3, loadBookScore, type BookScore } from '../../utils/chantSynth';
import { findVersion } from '../../data/chantLookup';
import { SMALL_MAX_SECONDS, VOICE_MAX_SECONDS, WAVE_BARS, startVoiceRecording, toSmallMp3, voiceRecordingSupported, type VoiceRecording } from '../../utils/voiceRecorder';
import type { Voice } from '../../utils/pathItems';
import { triggerHaptic } from '../../utils/haptics';
import { Avatar } from '../classes/ChatPanel';
import { Btn, Sheet } from '../ui/kit';

// „კლასის სტუდია“ (2026-10-29): every member records their own voice of a program chant at home, singing with the
// synth's other voices in the earphones; the take starts where the synth starts, so the takes lie on one another.
// It goes to the teachers through the pearls' store (pearlTakes, id `studio~<version>`, no rules change). The teacher
// picks whose takes go in, hears them together and sends the mix to the class chat as one voice message.

export const studioTakeId = (vid: string) => `studio~${vid}`;
/** a program item the studio can make: a chant version with book notes */
export const studioPiece = (id: string) => Boolean(findVersion(id)?.variant.bookNums?.length);

const VOICE_LABEL: Record<Voice, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };
// the synth starts 50 ms after play(); the phone's own output delay comes on top
const OUTPUT_DELAY = 0.09;

const useScore = (vid: string) => {
  const [score, setScore] = useState<BookScore | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const v = findVersion(vid)?.variant;
    if (!v?.bookNums?.length) { setFailed(true); return; }
    let alive = true;
    loadBookScore(v.bookNums[0], v.book || 'book').then(s => alive && setScore(s), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [vid]);
  return { score, failed };
};

const titleOf = (vid: string) => findVersion(vid)?.chant.title.replace(/[;\s]+$/, '') ?? 'გალობა';

/** The member's side: record my voice over the others, listen, send. */
export const StudioRecord: React.FC<{ vid: string; onClose: () => void }> = ({ vid, onClose }) => {
  const { user } = useAuth();
  const { score, failed } = useScore(vid);
  const sent = usePearlTakes(user?.uid)[studioTakeId(vid)];
  const [voice, setVoice] = useState<Voice>('1');
  const [phase, setPhase] = useState<'idle' | 'rec' | 'making' | 'ready' | 'sending' | 'sent' | 'error'>('idle');
  const [take, setTake] = useState<{ mp3: Blob; url: string } | null>(null);
  const [problem, setProblem] = useState('');
  const run = useRef<{ rec: VoiceRecording; synth: ChantSynth; t0: number; lag: number } | null>(null);
  const voices = Math.min(3, score?.voices.length ?? 3);

  useEffect(() => () => {
    run.current?.synth.dispose();
    run.current?.rec.cancel();
  }, []);
  useEffect(() => () => { if (take) URL.revokeObjectURL(take.url); }, [take]);

  const start = async () => {
    if (!score) return;
    triggerHaptic(12);
    setProblem('');
    let rec: VoiceRecording;
    try {
      rec = await startVoiceRecording();
    } catch {
      setProblem('მიკროფონი ვერ ჩაირთო — მიეცი ნებართვა და სცადე ხელახლა.');
      return;
    }
    const t0 = performance.now();
    const synth = new ChantSynth(score);
    score.voices.forEach((_, i) => synth.setMuted(i, i === Number(voice) - 1));
    synth.onEnd = () => void stop();
    await synth.play(0);
    run.current = { rec, synth, t0, lag: (performance.now() - t0) / 1000 + 0.05 + OUTPUT_DELAY };
    setPhase('rec');
  };

  const stop = async () => {
    const r = run.current;
    if (!r) return;
    run.current = null;
    r.synth.dispose();
    setPhase('making');
    try {
      const whole = await r.rec.stop();
      const small = await toSmallMp3(whole.mp3, SMALL_MAX_SECONDS, r.lag);
      setTake({ mp3: small.mp3, url: URL.createObjectURL(small.mp3) });
      setPhase('ready');
    } catch {
      setPhase('error');
    }
  };

  const send = async () => {
    if (!user || !take) return;
    triggerHaptic(12);
    setPhase('sending');
    try {
      await saveTake(user.uid, studioTakeId(vid), take.mp3, 0, voice);
      setPhase('sent');
    } catch {
      setPhase('error');
    }
  };

  return (
    <Sheet open onClose={onClose} title="სტუდია" locked={phase === 'rec' || phase === 'making' || phase === 'sending'}>
      <div className="space-y-4">
        <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">{titleOf(vid)}</p>
        <p className="flex items-start gap-2 text-[14px] leading-snug text-[#75685a]">
          <Headphones className="w-5 h-5 shrink-0 text-[#7a2028]" />
          ყურსასმენი გაიკეთე: დანარჩენ ხმებს ყურში გაიგებ, მიკროფონი კი მხოლოდ შენს ხმას ჩაწერს. მასწავლებელი ყველას ჩანაწერს ერთად შეაერთებს.
        </p>
        {failed && <p className="text-[14px] text-[#b3261e]">ამ გალობის ნოტები ვერ ჩაიტვირთა.</p>}
        {!voiceRecordingSupported() && <p className="text-[14px] text-[#b3261e]">ამ ბრაუზერში ჩაწერა ვერ მუშაობს.</p>}
        {score && voices > 1 && (phase === 'idle' || phase === 'error') && (
          <div>
            <p className="text-[13px] font-bold text-[#8a7a6a]">რომელ ხმას იმღერებ?</p>
            <div className="mt-2 flex gap-2">
              {(['1', '2', '3'] as Voice[]).slice(0, voices).map(v => (
                <button key={v} type="button" aria-pressed={voice === v} onClick={() => { triggerHaptic(8); setVoice(v); }}
                  className={`h-11 px-4 rounded-full text-[14px] font-bold cursor-pointer transition ${voice === v ? 'bg-[#7a2028] text-white' : 'bg-white ring-1 ring-[#e3d6c1] text-[#4a3426]'}`}>
                  {VOICE_LABEL[v]}
                </button>
              ))}
            </div>
          </div>
        )}
        {sent && phase === 'idle' && (
          <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#2f7d4f]"><Check className="w-4 h-4" /> შენი ჩანაწერი ({VOICE_LABEL[sent.voice]}) მასწავლებელთანაა. ახალი ჩანაწერი მას შეცვლის.</p>
        )}
        {problem && <p className="text-[14px] text-[#b3261e]">{problem}</p>}

        {(phase === 'idle' || phase === 'error') && score && (
          <Btn full size="lg" icon={<Mic />} onClick={start}>ჩაწერა — {VOICE_LABEL[voice]}</Btn>
        )}
        {phase === 'error' && <p className="text-[13.5px] text-[#b3261e]">რაღაც ვერ გამოვიდა — სცადე ხელახლა.</p>}
        {phase === 'rec' && (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-[15px] font-bold text-[#b3261e]"><span className="w-2.5 h-2.5 rounded-full bg-[#b3261e] animate-pulse" /> იწერება — იმღერე შენი ხმა</p>
            <Btn full size="lg" kind="danger" icon={<Square />} onClick={() => void stop()}>დასრულება</Btn>
          </div>
        )}
        {phase === 'making' && <p className="flex items-center gap-2 text-[14px] text-[#8a7a6a]"><Loader2 className="w-4 h-4 animate-spin" /> ვამზადებ…</p>}
        {(phase === 'ready' || phase === 'sending' || phase === 'sent') && take && (
          <div className="space-y-3">
            <audio controls src={take.url} className="w-full" />
            {phase === 'sent' ? (
              <p className="flex items-center gap-2 text-[15px] font-bold text-[#2f7d4f]"><Check className="w-5 h-5" /> გაეგზავნა მასწავლებელს</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Btn kind="ghost" size="lg" icon={<RotateCcw />} disabled={phase === 'sending'} onClick={() => { setTake(null); setPhase('idle'); }}>თავიდან</Btn>
                <Btn size="lg" icon={phase === 'sending' ? <Loader2 className="animate-spin" /> : <Send />} disabled={phase === 'sending'} onClick={send}>გაგზავნა</Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
};

interface Row { uid: string; name: string; photoURL: string; take: PearlTake }

const decode = async (ctx: BaseAudioContext, t: PearlTake) => ctx.decodeAudioData((t.audio.toUint8Array().slice().buffer) as ArrayBuffer);

const waveOf = (samples: Float32Array) => {
  const size = Math.max(1, Math.floor(samples.length / WAVE_BARS));
  const rms = Array.from({ length: WAVE_BARS }, (_, b) => {
    let sum = 0;
    for (let i = b * size; i < Math.min(samples.length, (b + 1) * size); i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / size);
  });
  const top = Math.max(...rms) || 1;
  return rms.map(v => Math.round((v / top) * 9)).join('');
};

/** The teacher's side: the class's takes of one chant, picked, heard together and sent to the class chat. */
export const StudioMix: React.FC<{ cls: SchoolClass; vid: string; onClose: () => void }> = ({ cls, vid, onClose }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [state, setState] = useState<'idle' | 'playing' | 'sending' | 'sent' | 'error'>('idle');
  const playing = useRef<{ ctx: AudioContext; srcs: AudioBufferSourceNode[] } | null>(null);
  const one = useRef<HTMLAudioElement | null>(null);
  const [oneId, setOneId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const people = [...cls.members, ...cls.teachers.filter(t => !cls.members.some(m => m.uid === t.uid))];
    Promise.all(people.map(async m => {
      const snap = await getDoc(doc(db, 'pearlTakes', m.uid, 'takes', studioTakeId(vid))).catch(() => null);
      return snap?.exists() ? { uid: m.uid, name: m.name, photoURL: m.photoURL || '', take: { id: snap.id, ...(snap.data() as Omit<PearlTake, 'id'>) } } : null;
    })).then(list => {
      if (!alive) return;
      const found = list.filter((r): r is Row => !!r).sort((a, b) => a.take.voice.localeCompare(b.take.voice) || a.name.localeCompare(b.name, 'ka'));
      setRows(found);
      setChosen(new Set(found.map(r => r.uid)));
    });
    return () => { alive = false; };
  }, [cls, vid]);

  const stopAll = () => {
    playing.current?.srcs.forEach(s => { try { s.stop(); } catch { /* already over */ } });
    playing.current?.ctx.close().catch(() => {});
    playing.current = null;
    one.current?.pause();
    setOneId(null);
    if (state === 'playing') setState('idle');
  };
  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const picked = (rows ?? []).filter(r => chosen.has(r.uid));

  const playOne = (r: Row) => {
    triggerHaptic(8);
    if (oneId === r.uid) { stopAll(); return; }
    stopAll();
    const a = new Audio(takeUrl(r.take));
    a.onended = () => setOneId(null);
    one.current = a;
    setOneId(r.uid);
    void a.play();
  };

  const playTogether = async () => {
    triggerHaptic(10);
    if (state === 'playing') { stopAll(); return; }
    stopAll();
    const ctx = new AudioContext();
    const buffers = await Promise.all(picked.map(r => decode(ctx, r.take)));
    const level = ctx.createGain();
    level.gain.value = 1 / Math.sqrt(Math.max(1, buffers.length));
    level.connect(ctx.destination);
    const at = ctx.currentTime + 0.15;
    const srcs = buffers.map(b => {
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(level);
      s.start(at);
      return s;
    });
    const longest = srcs.reduce((a, s) => (s.buffer!.duration > a.buffer!.duration ? s : a), srcs[0]);
    if (longest) longest.onended = () => { playing.current = null; ctx.close().catch(() => {}); setState('idle'); };
    playing.current = { ctx, srcs };
    setState('playing');
  };

  const send = async () => {
    if (!user || !picked.length) return;
    triggerHaptic(12);
    stopAll();
    setState('sending');
    try {
      const rate = 24000;
      const probe = new AudioContext();
      const buffers = await Promise.all(picked.map(r => decode(probe, r.take)));
      probe.close().catch(() => {});
      const seconds = Math.min(VOICE_MAX_SECONDS, Math.max(...buffers.map(b => b.duration)));
      const off = new OfflineAudioContext(1, Math.ceil(seconds * rate), rate);
      for (const b of buffers) {
        const s = off.createBufferSource();
        s.buffer = b;
        s.connect(off.destination);
        s.start(0);
      }
      const mix = await off.startRendering();
      const data = mix.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
      if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
      const mp3 = await encodeMp3(mix, undefined, 48);
      const author: ChatAuthor = {
        uid: user.uid, name: cls.teachers.find(t => t.uid === user.uid)?.name || user.displayName || 'მასწავლებელი',
        photoURL: user.photoURL || '', teacher: true,
      };
      const base = classChatBase(cls.id);
      const names = picked.map(r => `${r.name} (${VOICE_LABEL[r.take.voice]})`).join(', ');
      await sendTextMessage(base, author, `🎵 ჯგუფური გალობა — ${titleOf(vid)}\n${names}`);
      await sendVoiceMessage(base, author, { mp3, seconds, wave: waveOf(data) });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <Sheet open onClose={onClose} title="სტუდია" locked={state === 'sending'}>
      <div className="space-y-4">
        <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">{titleOf(vid)}</p>
        {!rows ? (
          <p className="flex items-center gap-2 text-[14px] text-[#8a7a6a]"><Loader2 className="w-4 h-4 animate-spin" /> ვეძებ ჩანაწერებს…</p>
        ) : !rows.length ? (
          <p className="text-[14px] leading-relaxed text-[#75685a]">
            ჯერ არავის ჩაუწერია. წევრები გალობის ფანჯარაში „სტუდიას“ დააჭერენ, თავიანთ ხმას ჩაწერენ და აქ გამოჩნდება.
          </p>
        ) : (
          <>
            <p className="text-[13.5px] text-[#75685a]">მონიშნე, ვისი ჩანაწერი შევიდეს. ყველა ერთად ჟღერს, ერთ დროს იწყება.</p>
            <ul className="divide-y divide-[#efe5d4] border-y border-[#efe5d4]">
              {rows.map(r => {
                const on = chosen.has(r.uid);
                return (
                  <li key={r.uid} className="flex items-center gap-3 py-2">
                    <button type="button" aria-pressed={on} onClick={() => { triggerHaptic(8); setChosen(s => { const n = new Set(s); if (n.has(r.uid)) n.delete(r.uid); else n.add(r.uid); return n; }); }}
                      aria-label={`${r.name} — ${on ? 'შედის' : 'არ შედის'}`}
                      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition ${on ? 'bg-[#7a2028] text-white' : 'bg-white ring-1 ring-[#e3d6c1] text-transparent'}`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                    <Avatar name={r.name} photoURL={r.photoURL} className="w-8 h-8 text-xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-semibold text-[#2a2017]">{r.name}</span>
                      <span className="block text-[12.5px] text-[#8a7a6a]">{VOICE_LABEL[r.take.voice]}</span>
                    </span>
                    <button type="button" onClick={() => playOne(r)} aria-label={oneId === r.uid ? 'გაჩერება' : 'მოსმენა'}
                      className="w-11 h-11 shrink-0 rounded-full bg-white ring-1 ring-[#e3d6c1] text-[#7a2028] flex items-center justify-center cursor-pointer">
                      {oneId === r.uid ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="grid grid-cols-2 gap-2.5">
              <Btn kind="ghost" size="lg" icon={state === 'playing' ? <Pause /> : <Users />} disabled={!picked.length || state === 'sending'} onClick={playTogether}>
                {state === 'playing' ? 'გაჩერება' : 'ერთად მოსმენა'}
              </Btn>
              <Btn size="lg" icon={state === 'sending' ? <Loader2 className="animate-spin" /> : <Send />} disabled={!picked.length || state === 'sending' || state === 'sent'} onClick={send}>
                {state === 'sending' ? 'იგზავნება…' : 'კლასის ჩატში'}
              </Btn>
            </div>
            {state === 'sent' && <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#2f7d4f]"><Check className="w-5 h-5" /> ჯგუფური გალობა კლასის ჩატშია</p>}
            {state === 'error' && <p className="text-[13.5px] text-[#b3261e]">ვერ გაიგზავნა — სცადე ხელახლა.</p>}
          </>
        )}
      </div>
    </Sheet>
  );
};
