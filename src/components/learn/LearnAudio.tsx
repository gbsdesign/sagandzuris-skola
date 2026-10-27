import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Repeat } from 'lucide-react';
import { useAuth } from '../../context';
import type { ChantMediaItem } from '../../data/chantMediaRegistry';
import { afterTry, learnTakeId, partsOfRecording } from '../../utils/learn';
import { VOICE_NAMES } from '../../utils/pearls';
import { georgiaToday } from '../../utils/psalter';
import { getAudioArrayBufferFromIdb } from '../../utils/audioIdb';
import { useLearning } from '../../hooks/useLearning';
import { usePearls } from '../../hooks/usePearls';
import { triggerHaptic } from '../../utils/haptics';
import type { Voice } from '../../utils/pathItems';
import { Choice, LearnFrame, LearnTips, PartsBar, SPEEDS, SingPanel } from './LearnShared';

// „სასწავლო რეჟიმი“ of a song that has a recording but no notes: the recording cut into parts of about 12 seconds.
// A part plays in a loop, slower if wanted (the pitch stays), and — when the song has its voices recorded apart —
// my voice alone or everyone but me. I sing it, hear myself and say whether I know it; the take can go to the teacher.

const ordinal = (n: number) => (n === 1 ? 'პირველი' : `მე-${n}`);
const VOICES: Voice[] = ['1', '2', '3'];
type Mix = 'mine' | 'all' | 'others';

export const LearnAudio: React.FC<{ piece: string; media: ChantMediaItem; title: string; subtitle: string; onClose: () => void }> = ({ piece, media, title, subtitle, onClose }) => {
  const { user, isSuperAdmin } = useAuth();
  const uid = user?.uid ?? null;
  const pearls = usePearls(uid);
  const { rec, loaded, savePart } = useLearning(uid, piece);
  const today = georgiaToday();
  // the voices recorded apart play together (in step), or the one recording of everyone
  const sources = useMemo(() => {
    const voices = VOICES.map((v, i) => ({ v: v as Voice | 'all', url: media.tracks[i] })).filter(t => t.url);
    return voices.length ? voices : media.tracks[3] ? [{ v: 'all' as const, url: media.tracks[3] }] : [];
  }, [media.tracks.join('|')]); // the page makes a new media object on every render
  const split = sources.length > 1;
  const [voice, setVoice] = useState<Voice>('1');
  const [voicePicked, setVoicePicked] = useState(false);
  const [mix, setMix] = useState<Mix>('mine');
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);
  const [current, setCurrent] = useState<number | 'all'>(0);
  const [speed, setSpeed] = useState(0.75);
  const [playing, setPlaying] = useState(false);
  const [head, setHead] = useState(0);
  const els = useRef<HTMLAudioElement[]>([]);
  const raf = useRef(0);
  const recRef = useRef(rec);
  recRef.current = rec;
  const parts = useMemo(() => partsOfRecording(duration), [duration]);

  // the voice named in the profile, until another is picked
  useEffect(() => {
    if (!voicePicked && pearls.loaded && (!split || sources.some(s => s.v === pearls.voice))) setVoice(pearls.voice);
  }, [pearls.loaded, pearls.voice, voicePicked, sources, split]);

  // the audio, a saved copy on the device first
  useEffect(() => {
    if (!sources.length) { setFailed(true); return; }
    let alive = true;
    const blobs: string[] = [];
    els.current = sources.map(({ url }) => {
      const a = new Audio();
      a.preload = 'auto';
      a.preservesPitch = true;
      a.onloadedmetadata = () => { if (alive && Number.isFinite(a.duration) && a.duration > 0) setDuration(d => Math.max(d, a.duration)); };
      a.onerror = () => alive && setFailed(true);
      getAudioArrayBufferFromIdb(url).catch(() => null).then(buf => {
        if (!alive) return;
        if (buf) { const u = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })); blobs.push(u); a.src = u; } else a.src = url;
      });
      return a;
    });
    return () => { alive = false; els.current.forEach(a => a.pause()); els.current = []; blobs.forEach(u => URL.revokeObjectURL(u)); cancelAnimationFrame(raf.current); };
  }, [sources]);

  // which voices sound
  useEffect(() => {
    els.current.forEach((a, i) => {
      const v = sources[i]?.v;
      a.muted = !split ? false : mix === 'mine' ? v !== voice : mix === 'others' ? v === voice : false;
    });
  }, [mix, voice, split, sources, duration]);
  useEffect(() => { els.current.forEach(a => { a.playbackRate = speed; }); }, [speed, duration]);

  // open on the first part not yet learned (or one due for review)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !loaded || !parts.length) return;
    opened.current = true;
    const due = parts.findIndex((_, i) => rec[i]?.due && rec[i].due! <= today && rec[i].level < 4);
    const fresh = parts.findIndex((_, i) => !rec[i] || rec[i].level <= 0);
    setCurrent(due >= 0 ? due : fresh >= 0 ? fresh : 0);
  }, [rec, loaded, parts]);

  const range = useMemo(() => {
    if (!parts.length) return { s0: 0, s1: 0 };
    if (current !== 'all') return parts[current] ?? parts[0];
    let k = 0;
    while (k < parts.length && (rec[k]?.level ?? 0) >= 1) k++;
    return { s0: 0, s1: parts[Math.max(0, k - 1)].s1 };
  }, [parts, current, rec]);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const seekAll = (t: number) => els.current.forEach(a => { a.currentTime = t; });
  // loop the part: back to its start when it ends; the voices are kept in step
  const follow = () => {
    const [lead, ...rest] = els.current;
    if (!lead) return;
    const { s0, s1 } = rangeRef.current;
    if (lead.currentTime >= s1 - 0.05 || lead.currentTime < s0 - 0.5) seekAll(s0);
    else rest.forEach(a => { if (Math.abs(a.currentTime - lead.currentTime) > 0.12) a.currentTime = lead.currentTime; });
    setHead(s1 > s0 ? Math.max(0, Math.min(1, (lead.currentTime - s0) / (s1 - s0))) : 0);
    if (!lead.paused) raf.current = requestAnimationFrame(follow);
  };

  const stop = () => { els.current.forEach(a => a.pause()); setPlaying(false); cancelAnimationFrame(raf.current); };
  const toggle = async () => {
    const lead = els.current[0];
    if (!lead) return;
    triggerHaptic(10);
    if (!lead.paused) { stop(); return; }
    seekAll(lead.currentTime < range.s0 || lead.currentTime >= range.s1 - 0.05 ? range.s0 : lead.currentTime);
    try {
      await Promise.all(els.current.map(a => { a.playbackRate = speed; return a.play(); }));
      setPlaying(true);
      raf.current = requestAnimationFrame(follow);
    } catch { stop(); }
  };

  const pick = (p: number | 'all') => {
    stop();
    setCurrent(p);
    seekAll(p === 'all' ? 0 : parts[p]?.s0 ?? 0);
    setHead(0);
  };

  const onTry = (pct: number, ok: boolean) => {
    if (current === 'all') return;
    savePart(current, afterTry(recRef.current[current], pct, ok, today));
  };

  const partName = current === 'all' ? 'ნასწავლი ნაწილები ერთად' : `${ordinal(current + 1)} ნაწილი`;
  const sendId = learnTakeId(piece, current);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <LearnFrame title={title} subtitle={`სასწავლო რეჟიმი · ${subtitle}`} onClose={() => { stop(); onClose(); }}>
      {failed ? (
        <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] py-10 text-center text-sm text-[#8a7a6a]">ჩანაწერი ვერ ჩაიტვირთა — ინტერნეტი შეამოწმე.</p>
      ) : !parts.length ? (
        <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] py-10 text-center text-sm text-[#8a7a6a]">ჩანაწერი იტვირთება…</p>
      ) : (
        <>
          <PartsBar count={parts.length} rec={rec} today={today} current={current} onPick={pick} noun="ნაწილი" />

          {split && (
            <Choice<Voice> label="ჩემი ხმა" value={voice} onChange={v => { setVoicePicked(true); setVoice(v); }}
              options={sources.map(s => ({ value: s.v as Voice, label: VOICE_NAMES[s.v as Voice] }))} />
          )}

          <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-extrabold text-[#7a2028]">1 · მოისმინე — {partName}</h2>
              <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-bold text-[#8c7c6b]"><Repeat className="w-3.5 h-3.5" />წრეზე</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={toggle} aria-label={playing ? 'გაჩერება' : 'მოსმენა'}
                className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)]">
                {playing ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
              </button>
              <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                <div className="h-1.5 rounded-full bg-[#efe6d6] overflow-hidden" aria-hidden>
                  <div className="h-full bg-[#7a2028] rounded-full" style={{ width: `${head * 100}%` }} />
                </div>
                <p className="text-[12px] font-bold text-[#8c7c6b] tabular-nums">{fmt(range.s0)} – {fmt(range.s1)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:gap-5">
              <Choice<number> label="სისწრაფე" value={speed} onChange={setSpeed} options={SPEEDS} />
              {split && (
                <Choice<Mix> label="რა ისმის" value={mix} onChange={setMix}
                  options={[{ value: 'mine', label: 'ჩემი ხმა' }, { value: 'all', label: 'ყველა' }, { value: 'others', label: 'ჩემ გარეშე' }]} />
              )}
            </div>
          </section>

          <SingPanel
            target={null}
            cue={null}
            seconds={range.s1 - range.s0}
            uid={uid}
            unlimited={isSuperAdmin}
            voice={voice}
            about={{ title, voice: VOICE_NAMES[voice], what: partName, song: true }}
            sendId={sendId}
            approved={Boolean(pearls.shine[sendId])}
            onBeforeSing={stop}
            onTry={onTry}
          />

          <LearnTips song />
        </>
      )}
    </LearnFrame>
  );
};
