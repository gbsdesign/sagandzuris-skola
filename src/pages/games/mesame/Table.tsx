import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Music, Play, RotateCcw, Smartphone, Square, Users } from 'lucide-react';
import { ChantSynth, firstNotes, makeTimeMap, playLessonNotes, playStartNotes, stopLessonNotes } from '../../../utils/chantSynth';
import { startVoiceRecording, voiceRecordingSupported, type VoiceRecording, type VoiceTake } from '../../../utils/voiceRecorder';
import { triggerHaptic } from '../../../utils/haptics';
import { Bar, Btn, Card, Toggle } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { TableScreen } from '../../../components/games/TableScreen';
import { PartPicture } from '../../../components/learn/PartPicture';
import { hushSnippets } from '../rounds/useSnippet';
import { trioChants } from './chants';
import { ChantPicker } from './ChantPicker';
import { ClassSend } from '../../../components/games/ClassSend';
import { SLOW, VOICE_LABELS, VOICE_SHORT, lengthText, openingIsWhole, sectionOf, systemAt, trioVoices, useChantScore, type LoadedChant, type Section } from './plan';
import { readTable, saveTable, type TableConf } from './store';
import { useMine } from '../../../components/games/useMine';

// „მესამე ხმა“ on one phone (ჰიბრიდული): the phone's speaker sings one or two voices of a chant, the class sings the rest
// live. Before the start each voice's first note sounds in turn; then the book's line being sung is on the screen with a
// mark running over it. The phone records the room (no echo cancelling, so its own voices are in it) and the take can go
// to the class chat.

const NAMES = ['მთქმელი', 'მოძახილი', 'ბანი'];
const ROMAN = ['I', 'II', 'III'];
const COUNT_MS = 800;
/** a voice message is at most five minutes */
const MAX_TAKE = 290;

const join = (list: string[]) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} და ${list[list.length - 1]}`);
const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

type State = 'idle' | 'count' | 'play' | 'making' | 'done';

const Conductor: React.FC<{
  title: string; loaded: LoadedChant; section: Section; phone: number[]; speed: number; record: boolean; onClose: () => void;
}> = ({ title, loaded, section, phone, speed, record, onClose }) => {
  const [state, setState] = useState<State>('idle');
  const [count, setCount] = useState(3);
  const [now, setNow] = useState(section.from);
  const [problem, setProblem] = useState('');
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const run = useRef<{ synth: ChantSynth | null; rec: VoiceRecording | null; raf: number; timers: number[]; over: boolean; t0: number } | null>(null);
  const map = useMemo(() => makeTimeMap(loaded.score.tempos), [loaded.score]);
  const voices = trioVoices(loaded);
  const lines = loaded.parts.filter(p => p.s0 < section.to - 0.05);

  const release = () => {
    const r = run.current;
    if (!r) return null;
    r.over = true;
    window.cancelAnimationFrame(r.raf);
    r.timers.forEach(t => window.clearTimeout(t));
    r.synth?.dispose();
    stopLessonNotes();
    return r;
  };
  useEffect(() => () => { const r = release(); r?.rec?.cancel(); run.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const finish = async () => {
    const r = release();
    run.current = null;
    if (!r) return;
    if (!r.rec) { setState('done'); return; }
    setState('making');
    try {
      const t = await r.rec.stop();
      setTake(t);
      setUrl(URL.createObjectURL(t.mp3));
    } catch {
      setProblem('ჩანაწერი ვერ შეინახა.');
    }
    setState('done');
  };

  const go = async () => {
    const r = run.current;
    if (!r || r.over) return;
    const synth = new ChantSynth(loaded.score);
    loaded.score.voices.forEach((_, i) => { if (i < 3 && !phone.includes(i)) synth.setMuted(i, true); });
    if (speed !== 1) synth.setSpeed(speed);
    synth.onEnd = () => { void finish(); };
    r.synth = synth;
    await synth.play(section.from);
    if (r.over) { synth.dispose(); return; }
    setState('play');
    const frame = () => {
      if (r.over) return;
      const pos = synth.position();
      setNow(pos);
      if (pos >= section.to - 0.02 || (r.rec && (performance.now() - r.t0) / 1000 > MAX_TAKE)) { void finish(); return; }
      r.raf = window.requestAnimationFrame(frame);
    };
    r.raf = window.requestAnimationFrame(frame);
  };

  const start = async () => {
    if (run.current) return;
    hushSnippets();
    // wakes the sound inside the tap
    void playLessonNotes([]);
    triggerHaptic(12);
    setProblem('');
    setTake(null);
    setUrl(null);
    setNow(section.from);
    let rec: VoiceRecording | null = null;
    if (record && voiceRecordingSupported()) {
      try { rec = await startVoiceRecording(); } catch { setProblem('მიკროფონი ვერ ჩაირთო — ვგალობთ ჩაწერის გარეშე.'); }
    }
    const r = { synth: null, rec, raf: 0, timers: [] as number[], over: false, t0: performance.now() };
    run.current = r;
    setCount(3);
    setState('count');
    // each voice's first note in the section, top voice first
    const firsts = loaded.score.voices.slice(0, 3).map(list => {
      const n = list.filter(([b]) => b >= map.toBeat(section.from) - 1e-6).sort((a, b) => a[0] - b[0])[0];
      return n ? n[2] : null;
    });
    void playStartNotes(firsts.some(m => m != null) ? firsts : firstNotes(loaded.score).slice(0, 3), 0, false, 0.5, 0.75);
    r.timers.push(window.setTimeout(() => setCount(2), COUNT_MS));
    r.timers.push(window.setTimeout(() => setCount(1), COUNT_MS * 2));
    r.timers.push(window.setTimeout(() => { void go(); }, COUNT_MS * 3));
  };

  const stop = () => {
    const r = run.current;
    if (!r) return;
    if (!r.synth) { release(); r.rec?.cancel(); run.current = null; setState('idle'); return; }
    void finish();
  };

  const beat = state === 'play' ? map.toBeat(now) : map.toBeat(section.from);
  const sys = systemAt(loaded.score, beat);
  const line = Math.max(0, lines.findIndex(p => now >= p.s0 - 1e-6 && now < p.s1 - 1e-6));
  const busy = state === 'count' || state === 'play';
  const ours = [0, 1, 2].slice(0, voices).filter(v => !phone.includes(v));

  return (
    <TableScreen title={title} onClose={onClose}
      footer={busy ? (
        <Btn full size="lg" kind="ghost" icon={<Square />} onClick={stop}>{state === 'count' ? 'გაუქმება' : 'გაჩერება'}</Btn>
      ) : state === 'done' ? (
        <div className="grid grid-cols-2 gap-2.5">
          <Btn size="lg" kind="ghost" icon={<RotateCcw />} onClick={() => { void start(); }}>ხელახლა</Btn>
          <Btn size="lg" onClick={onClose}>დახურვა</Btn>
        </div>
      ) : state === 'idle' ? (
        <Btn full size="lg" icon={<Play />} onClick={() => { void start(); }}>დაწყება</Btn>
      ) : undefined}
    >
      <div className="mx-auto w-full max-w-xl flex flex-col gap-3 pt-1">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].slice(0, voices).map(v => {
            const mine = phone.includes(v);
            return (
              <div key={v} className={`rounded-2xl px-2 py-2.5 text-center ring-1 ${mine ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8]'}`}>
                <p className="font-serif-ge text-[20px] font-bold leading-none">{ROMAN[v]}</p>
                <p className={`mt-1 text-[12.5px] font-bold ${mine ? 'text-[#fbf6ec]/85' : 'text-[#75685a]'}`}>{NAMES[v]}</p>
                <p className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold">
                  {mine ? <Smartphone className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}{mine ? 'ტელეფონი' : 'თქვენ'}
                </p>
              </div>
            );
          })}
        </div>
        {problem && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13.5px] font-bold leading-snug text-amber-900" role="alert">{problem}</p>}
        {state === 'making' && <p className="flex items-center justify-center gap-2 py-10 text-[15px] font-bold text-[#75685a]"><Loader2 className="w-5 h-5 animate-spin" />ჩანაწერს ვამზადებ…</p>}
        {state !== 'making' && state !== 'done' && (
          <>
            <div className="flex items-center justify-between gap-2 min-h-8">
              <span className="text-[13.5px] font-bold text-[#75685a]" aria-live="polite">
                {state === 'count' ? 'საწყისი ნოტები — ზემოდან ქვემოთ' : state === 'play' ? `სტრიქონი ${line + 1} / ${lines.length}` : `ჯერ ყველა ხმის პირველი ნოტი ჟღერს, მერე 3-2-1.`}
              </span>
              {state === 'play' && run.current?.rec && (
                <span className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums text-[#b3261e]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b3261e] animate-pulse" />{clock((now - section.from) / speed)}
                </span>
              )}
            </div>
            <div className="relative">
              {sys !== null ? <PartPicture score={loaded.score} sys={[sys]} beat={state === 'play' ? beat : null} />
                : <div className="h-24 rounded-xl bg-white ring-1 ring-[#e8dcc8]" />}
              {state === 'count' && (
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70" aria-live="assertive">
                  <span key={count} className="font-serif-ge text-[64px] font-bold leading-none text-[#7a2028] animate-[samosi-pop_0.45s_ease-out]">{count}</span>
                </span>
              )}
            </div>
            <Bar value={Math.max(0, now - section.from)} max={section.to - section.from} />
          </>
        )}
        {state === 'done' && (
          <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 space-y-3">
            <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">{take ? 'ჩანაწერი' : 'კარგი იყო!'}</p>
            {take && url ? (
              <>
                <audio controls src={url} className="w-full" />
                <ClassSend
                  text={`🎵 მესამე ხმა — ${title}\nტელეფონი: ${join(phone.map(v => VOICE_SHORT[v]))} · კლასი: ${join(ours.map(v => VOICE_SHORT[v]))}`}
                  make={() => Promise.resolve(take)}
                />
              </>
            ) : (
              <p className="text-[13.5px] leading-snug text-[#75685a]">ხმები შეცვალეთ და კიდევ ერთხელ: ვინც მთქმელი იყო, ახლა ბანი იყოს.</p>
            )}
          </section>
        )}
      </div>
    </TableScreen>
  );
};

export const TrioTable: React.FC = () => {
  const { program } = useMine();
  const chants = useMemo(() => trioChants(program), [program]);
  const [conf, setConfState] = useState<TableConf>(readTable);
  const setConf = (patch: Partial<TableConf>) => setConfState(c => { const n = { ...c, ...patch }; saveTable(n); return n; });
  const chant = chants.find(c => c.id === conf.chant) ?? chants[0] ?? null;
  const { loaded, failed } = useChantScore(chant?.book, chant?.num);
  const voices = trioVoices(loaded);
  const phone = conf.phone.filter(v => v < voices).length ? conf.phone.filter(v => v < voices) : [voices - 1];
  const speed = conf.slow ? SLOW : 1;
  const short = loaded ? openingIsWhole(loaded) : false;
  const opening = loaded ? sectionOf(loaded, 0, false) : null;
  const section = loaded ? sectionOf(loaded, 0, conf.whole || short) : null;
  const [open, setOpen] = useState(false);
  const ours = [0, 1, 2].slice(0, voices).filter(v => !phone.includes(v));

  const toggle = (v: number) => {
    if (phone.includes(v)) { if (phone.length > 1) setConf({ phone: phone.filter(x => x !== v) }); return; }
    setConf({ phone: (phone.length >= 2 ? [phone[1], v] : [...phone, v]).sort() });
  };

  return (
    <>
      <Card className="!p-4 sm:!p-5 space-y-4">
        {/* how it goes is the „როგორ ვითამაშოთ“ steps above (2026-11-04): the card only names itself */}
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Users className="w-5 h-5" /></span>
          <p className="min-w-0 font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">ტელეფონი და კლასი</p>
        </div>
        <ChantPicker chants={chants} value={chant} onChange={c => setConf({ chant: c.id })} />
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#75685a]">ტელეფონი გალობს</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="ტელეფონი გალობს">
            {VOICE_LABELS.slice(0, voices).map((label, v) => <Chip key={v} on={phone.includes(v)} onClick={() => toggle(v)}>{label}</Chip>)}
          </div>
          <p className="text-[13px] leading-snug text-[#75685a]">
            {ours.length ? <>კლასი ცოცხლად: <b className="text-[#4a3426]">{join(ours.map(v => VOICE_LABELS[v]))}</b></> : 'ერთი ხმა მაინც კლასისაა.'}
          </p>
        </div>
        {short && loaded ? (
          <p className="text-[13px] font-bold text-[#75685a]">მოკლე საგალობელია — მთლიანად, {lengthText(loaded.duration / speed)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#75685a]">რამდენი</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="რამდენი">
              <Chip on={!conf.whole} onClick={() => setConf({ whole: false })}>დასაწყისი{opening ? ` · ${lengthText((opening.to - opening.from) / speed)}` : ''}</Chip>
              <Chip on={conf.whole} onClick={() => setConf({ whole: true })}>მთლიანად{loaded ? ` · ${lengthText(loaded.duration / speed)}` : ''}</Chip>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#75685a]">ტემპი</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="ტემპი">
            <Chip on={!conf.slow} onClick={() => setConf({ slow: false })}>ჩვეულებრივ</Chip>
            <Chip on={conf.slow} onClick={() => setConf({ slow: true })}>ნელა</Chip>
          </div>
        </div>
        {voiceRecordingSupported() && (
          <div className="border-t border-[#efe5d4] pt-1">
            <Toggle on={conf.record} onChange={record => setConf({ record })} label="ოთახის ჩაწერა" hint="ბოლოს მოისმენთ და კლასის ჩატში გაგზავნით" />
          </div>
        )}
        <p className="flex items-start gap-2 text-[13px] leading-snug text-[#75685a]">
          <Music className="w-5 h-5 shrink-0 text-[#7a2028]" />
          ტელეფონი მაგიდაზე დადეთ, ხმა აუწიეთ. ეკრანზე წიგნის სტრიქონი ჩანს, რომელსაც ახლა გალობთ.
        </p>
        {failed && <p className="text-[13.5px] font-bold text-[#b3261e]">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>}
        <Btn full size="lg" icon={loaded || failed ? <Play /> : <Loader2 className="animate-spin" />} disabled={!loaded || !ours.length} onClick={() => setOpen(true)}>
          გავიდეთ სცენაზე
        </Btn>
      </Card>
      {open && loaded && section && chant && (
        <Conductor title={chant.title} loaded={loaded} section={section} phone={phone} speed={speed} record={conf.record} onClose={() => setOpen(false)} />
      )}
    </>
  );
};
