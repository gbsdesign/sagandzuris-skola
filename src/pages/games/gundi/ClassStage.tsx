import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Minus, Music, Play, RotateCcw, Smartphone, Square, Users } from 'lucide-react';
import {
  PART_NAMES, ROLES, ROLE_NAMES, SINGERS, VARIANTS, activeAt, nextPart, patternWords, trackOf, variantOf, type ClassConf, type Part, type Role,
} from '../../../utils/gundi';
import { playLessonNotes, playStartNotes } from '../../../utils/chantSynth';
import { startVoiceRecording, voiceRecordingSupported, type VoiceRecording, type VoiceTake } from '../../../utils/voiceRecorder';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card, Toggle } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { ClassSend } from '../../../components/games/ClassSend';
import { TableScreen } from '../../../components/games/TableScreen';
import { PartPicture } from '../../../components/learn/PartPicture';
import { hushSnippets } from '../rounds/useSnippet';
import { GundiStage, type Phrase } from './engine';
import { LOOK, StageView } from './Stage';
import { PhrasePicker, SongPicker, TempoPicker } from './Pickers';
import { byRole, firstsOf, phraseOf, songOf, systemsOf, useSong, type LoadedSong } from './songs';
import { readClass, saveClass } from './store';

// „ჩემი გუნდი“ with the class on one phone (ჰიბრიდული): the phone's speaker loops a phrase with the performers it plays (the
// bass and the drum, say), the class does the others live. The teacher brings the class's groups in one at a time: a tap on
// a figure, and that group comes in at the start of the next pass — the last beats of the pass count down to it. Before the
// start each of the class's voices hears its first note; the book's lines are on the screen with a mark over the notes. The
// phone may record the room (its own sound is in it) and send the take to the class chat.

const PART_ICON: Record<Part, React.ComponentType<{ className?: string }>> = { phone: Smartphone, class: Users, none: Minus };
const MAX_ROOM = 290; // a voice message is at most five minutes
const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const join = (list: string[]) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} და ${list[list.length - 1]}`);

type State = 'idle' | 'count' | 'play' | 'making' | 'done';

const Conductor: React.FC<{ song: LoadedSong; phrase: Phrase; conf: ClassConf; onClose: () => void }> = ({ song, phrase, conf, onClose }) => {
  const meta = songOf(conf.song);
  const phoneRoles = ROLES.filter(r => conf.parts[r] === 'phone');
  const classRoles = ROLES.filter(r => conf.parts[r] === 'class');
  const variant = byRole(r => variantOf(r, conf.variant[r]).id);
  const loop = phrase.loop;
  const spb = 60 / (phrase.bpm * phrase.speed);
  const sys = useMemo(() => systemsOf(song.score, loop), [song.score, loop]);
  const tracks = useMemo(() => byRole(r => trackOf(loop, r, conf.variant[r])), [loop, conf.variant]);

  const [state, setState] = useState<State>('idle');
  const [count, setCount] = useState(3);
  const [phoneOn, setPhoneOn] = useState(() => byRole(r => conf.parts[r] === 'phone'));
  const [inClass, setInClass] = useState(() => byRole(() => false));
  const [pending, setPending] = useState(() => byRole(() => false));
  const [tick, setTick] = useState({ pass: 0, beat: 0 });
  const [take, setTake] = useState<VoiceTake | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const run = useRef<{ stage: GundiStage | null; rec: VoiceRecording | null; timers: number[]; over: boolean; t0: number } | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const release = () => {
    const r = run.current;
    if (!r) return null;
    r.over = true;
    r.timers.forEach(t => window.clearTimeout(t));
    r.stage?.dispose();
    return r;
  };
  useEffect(() => () => { const r = release(); r?.rec?.cancel(); run.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // the beat and the pass, a few times a second: the countdown, the dots, the groups coming in at a pass's start
  useEffect(() => {
    if (state !== 'play') return;
    let raf = 0;
    let last = { pass: 0, beat: -1, at: 0 };
    const frame = () => {
      const r = run.current;
      const p = r?.stage?.probe();
      if (p) {
        const beat = Math.floor(p.beat + 1e-6);
        const pass = p.beat < last.at - 0.5 ? last.pass + 1 : last.pass;
        if (pass !== last.pass && ROLES.some(x => pendingRef.current[x])) {
          const come = pendingRef.current;
          setInClass(cur => byRole(x => cur[x] || come[x]));
          setPending(byRole(() => false));
        }
        if (beat !== last.beat || pass !== last.pass) setTick({ pass, beat });
        last = { pass, beat, at: p.beat };
        if (r?.rec && (performance.now() - r.t0) / 1000 > MAX_ROOM) { void finish(); return; }
      }
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const start = async () => {
    if (run.current) return;
    hushSnippets();
    void playLessonNotes([]); // wakes the sound inside the tap
    triggerHaptic(12);
    setProblem('');
    setTake(null);
    setUrl(null);
    if (state === 'done') setInClass(byRole(() => false));
    setPending(byRole(() => false));
    setTick({ pass: 0, beat: 0 });
    let rec: VoiceRecording | null = null;
    if (conf.record && voiceRecordingSupported()) {
      try { rec = await startVoiceRecording(); } catch { setProblem('მიკროფონი ვერ ჩაირთო — ვმღერით ჩაწერის გარეშე.'); }
    }
    const r = { stage: null as GundiStage | null, rec, timers: [] as number[], over: false, t0: performance.now() };
    run.current = r;
    setState('count');
    // the class's voices hear their first notes, top voice first, then three beats are counted
    const firsts = firstsOf(loop).map((m, v) => (classRoles.includes(SINGERS[v]) ? m : null));
    const gap = 0.55;
    const notes = firsts.filter(m => m != null).length;
    if (notes) void playStartNotes(firsts, 0, false, gap, 0.8);
    const lead = notes ? notes * gap * 1000 + 450 : 150;
    const beatMs = Math.max(420, spb * 1000);
    setCount(3);
    r.timers.push(window.setTimeout(() => setCount(3), lead));
    r.timers.push(window.setTimeout(() => setCount(2), lead + beatMs));
    r.timers.push(window.setTimeout(() => setCount(1), lead + beatMs * 2));
    r.timers.push(window.setTimeout(() => {
      if (r.over) return;
      const stage = new GundiStage(phrase, phoneRoles, variant);
      r.stage = stage;
      void stage.play().then(() => { if (!r.over) setState('play'); });
    }, lead + beatMs * 3));
  };

  const stop = () => {
    const r = run.current;
    if (!r) return;
    if (!r.stage) { release(); r.rec?.cancel(); run.current = null; setState('idle'); return; }
    void finish();
  };

  /** a tap on a figure: the phone's performer in or out at once; a class's group comes in at the next pass, goes out at once */
  const tap = (role: Role) => {
    if (conf.parts[role] === 'phone') {
      const next = !phoneOn[role];
      setPhoneOn(cur => ({ ...cur, [role]: next }));
      run.current?.stage?.setOn(role, next);
      return;
    }
    if (conf.parts[role] !== 'class') return;
    // before the start a group is marked to sing from the first beat
    if (state !== 'play' || inClass[role]) { setInClass(cur => ({ ...cur, [role]: !cur[role] })); return; }
    setPending(cur => ({ ...cur, [role]: !cur[role] }));
  };

  const busy = state === 'count' || state === 'play';
  const on = byRole(r => (conf.parts[r] === 'phone' ? phoneOn[r] : conf.parts[r] === 'class' ? inClass[r] || pending[r] : false));
  // the names stay whole on a phone: who does the part is a small sign before the name
  const badges = byRole(r => (conf.parts[r] === 'phone' ? <Smartphone className="w-3 h-3" /> : conf.parts[r] === 'class' ? <Users className="w-3 h-3" /> : null));
  const left = loop.beats - tick.beat;
  const coming = ROLES.filter(r => pending[r]);
  // the class's groups not singing yet: the line under the stage says how to bring them in (2026-11-04, the games' review)
  const out = classRoles.filter(r => !inClass[r] && !pending[r]);
  // the class's players see their syllables (the panduri's too, said by voice when nobody has one)
  const drums = classRoles.filter(r => !SINGERS.includes(r) && (inClass[r] || pending[r]));
  const ours = classRoles.map(r => ROLE_NAMES[r]);
  const inRef = useRef(inClass);
  inRef.current = inClass;
  const probe = () => {
    const p = run.current?.stage?.probe();
    if (!p) return null;
    // the class's groups that are in move with their part too, as if the phone played it
    const busy = byRole(r => (conf.parts[r] === 'class' ? inRef.current[r] && activeAt(tracks[r], p.beat) : p.busy[r]));
    return { beat: p.beat, busy, stroke: p.stroke };
  };

  return (
    <TableScreen title={meta.title} onClose={onClose}
      right={busy && run.current?.rec ? (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold tabular-nums text-[#b3261e]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#b3261e] animate-pulse" />ჩაწერა
        </span>
      ) : undefined}
      footer={busy ? (
        <Btn full size="lg" kind="ghost" icon={<Square />} onClick={stop}>{state === 'count' ? 'გაუქმება' : 'დასრულება'}</Btn>
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
        <div className="relative">
          <StageView on={on} labels={{}} badges={badges} probe={probe} onTap={tap}
            live={byRole(r => conf.parts[r] === 'class' && inClass[r])} coming={pending} />
          {state === 'count' && (
            <span className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/55" aria-live="assertive">
              <span key={count} className="font-serif-ge text-[72px] font-bold leading-none text-[#7a2028] animate-[samosi-pop_0.45s_ease-out]">{count}</span>
            </span>
          )}
        </div>
        {problem && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-2.5 text-[13.5px] font-bold leading-snug text-amber-900" role="alert">{problem}</p>}
        {state === 'making' && <p className="flex items-center justify-center gap-2 py-8 text-[15px] font-bold text-[#75685a]"><Loader2 className="w-5 h-5 animate-spin" />ჩანაწერს ვამზადებ…</p>}

        {(state === 'idle' || state === 'count') && (
          <p className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] font-bold text-[#75685a]">
            <span className="inline-flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" />ტელეფონი</span>
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />კლასი</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#c9a24b]" />მღერის კლასი</span>
          </p>
        )}
        {(state === 'idle' || state === 'count') && (
          <p className="text-[13.5px] leading-snug text-[#75685a]">
            ჯერ კლასის ხმები პირველ ნოტებს მოისმენენ, მერე 3-2-1 და ტელეფონი იწყებს. კლასის ჯგუფს შენ შემოიყვან: შეეხე მის ფიგურას — შემდეგ წრეზე შემოვა (თუ ახლავე შეეხები, თავიდანვე იმღერებს).
          </p>
        )}

        {state === 'play' && (
          <>
            <div className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2.5" aria-live="polite">
              <span className="flex gap-1.5" aria-hidden="true">
                {Array.from({ length: loop.meter }, (_, k) => (
                  <span key={k} className={`w-3.5 h-3.5 rounded-full transition-colors ${tick.beat % loop.meter === k ? (k === 0 ? 'bg-[#7a2028]' : 'bg-[#c9a24b]') : 'bg-[#eadfcb]'}`} />
                ))}
              </span>
              <span className="min-w-0 flex-1 text-[13.5px] font-bold leading-snug text-[#4a3426]">
                {coming.length && left <= 4
                  ? <>{join(coming.map(r => ROLE_NAMES[r]))} შემოდის: <span className="font-serif-ge text-[18px] text-[#7a2028] tabular-nums">{left}</span></>
                  : coming.length ? <>{join(coming.map(r => ROLE_NAMES[r]))} შემოვა შემდეგ წრეზე</>
                  : out.length ? `წრე ${tick.pass + 1} · შეეხე კლასის ფიგურას — შემოვა`
                  : `წრე ${tick.pass + 1}`}
              </span>
            </div>
            {drums.map(r => (
              <p key={r} className="rounded-2xl px-3.5 py-2 text-[14px] font-bold text-[#fbf6ec]" style={{ background: LOOK[r].coat }}>
                {ROLE_NAMES[r]}: <span className="font-serif-ge text-[16px]">{patternWords(loop.meter, variant[r])}</span>
              </p>
            ))}
          </>
        )}

        {busy && sys.length > 0 && (
          <PartPicture score={song.score} sys={sys} beat={state === 'play' ? loop.a + Math.min(loop.beats - 0.01, tick.beat + 0.5) : null} />
        )}

        {state === 'done' && (
          <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 space-y-3">
            <p className="font-serif-ge text-[18px] font-bold leading-snug text-[#4a3426]">{take ? 'ჩანაწერი' : 'კარგი იყო!'}</p>
            {take && url ? (
              <>
                <audio controls src={url} className="w-full" />
                <ClassSend
                  text={`🎵 ჩემი გუნდი — ${meta.title} (${meta.region})\nტელეფონი: ${join(phoneRoles.map(r => ROLE_NAMES[r]))}${ours.length ? ` · კლასი: ${join(ours)}` : ''}`}
                  make={() => Promise.resolve(take)}
                />
              </>
            ) : (
              <p className="text-[13.5px] leading-snug text-[#75685a]">როლები გაცვალეთ და კიდევ ერთხელ: ვინც ტაშს უკრავდა, ახლა ბანი იყოს.</p>
            )}
          </section>
        )}
      </div>
    </TableScreen>
  );
};

/** a performer's part on the class's phone: the tile turns phone → class → nobody */
const PartTile: React.FC<{ role: Role; part: Part; onClick: () => void }> = ({ role, part, onClick }) => {
  const Ic = PART_ICON[part];
  const color = LOOK[role].coat;
  return (
    <button type="button" onClick={() => { triggerHaptic(6); onClick(); }}
      aria-label={`${ROLE_NAMES[role]}: ${PART_NAMES[part]}`}
      className="min-h-[68px] rounded-2xl px-2 py-2 text-center transition cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/50"
      style={part === 'phone' ? { background: color, color: '#fbf6ec' } : part === 'class' ? { background: '#fff', color: '#4a3426', boxShadow: `inset 0 0 0 2px ${color}` } : { background: '#f4ede1', color: '#9a8b7b' }}>
      <span className="block text-[13.5px] font-bold leading-tight">{ROLE_NAMES[role]}</span>
      <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold"><Ic className="w-3.5 h-3.5" />{PART_NAMES[part]}</span>
    </button>
  );
};

export const GundiClass: React.FC = () => {
  const [conf, setConfState] = useState<ClassConf>(readClass);
  const setConf = (patch: Partial<ClassConf>) => setConfState(c => { const n = { ...c, ...patch }; saveClass(n); return n; });
  const { song, failed } = useSong(conf.song);
  const loopIdx = song ? Math.min(conf.loop, Math.max(0, song.loops.length - 1)) : 0;
  const phrase = song ? phraseOf(song, loopIdx, conf.speed) : null;
  const [open, setOpen] = useState(false);
  const phone = ROLES.filter(r => conf.parts[r] === 'phone');
  const klasi = ROLES.filter(r => conf.parts[r] === 'class');
  const choosing = ROLES.filter(r => VARIANTS[r].length > 1 && conf.parts[r] !== 'none');

  return (
    <>
      <Card className="!p-4 sm:!p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 shrink-0 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Users className="w-5 h-5" /></span>
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">ტელეფონი და კლასი</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ტელეფონი დინამიკით ფრაზას წრეზე უკრავს — მაგალითად ბანს და დოლს — კლასი კი ცოცხლად უერთდება, ჯგუფ-ჯგუფად.</p>
          </div>
        </div>
        <SongPicker value={conf.song} onChange={num => setConf({ song: num, loop: 0 })} />
        <PhrasePicker song={song} value={loopIdx} speed={conf.speed} onChange={k => setConf({ loop: k })} />
        <TempoPicker value={conf.speed} onChange={speed => setConf({ speed })} />
        <div className="space-y-2">
          <p className="text-[13px] font-bold text-[#75685a]">ვინ რას აკეთებს <span className="font-normal">— შეეხე: ტელეფონი → კლასი → არავინ</span></p>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(r => <PartTile key={r} role={r} part={conf.parts[r]} onClick={() => setConf({ parts: { ...conf.parts, [r]: nextPart(conf.parts[r]) } })} />)}
          </div>
        </div>
        {choosing.length > 0 && (
          <div className="space-y-2.5">
            {choosing.map(r => (
              <div key={r} className="space-y-1.5">
                <p className="text-[13px] font-bold" style={{ color: LOOK[r].coat }}>{ROLE_NAMES[r]}</p>
                <div className="flex flex-wrap gap-2" role="group" aria-label={ROLE_NAMES[r]}>
                  {VARIANTS[r].map(v => <Chip key={v.id} on={variantOf(r, conf.variant[r]).id === v.id} onClick={() => setConf({ variant: { ...conf.variant, [r]: v.id } })}>{v.name}</Chip>)}
                </div>
              </div>
            ))}
          </div>
        )}
        {voiceRecordingSupported() && (
          <div className="border-t border-[#efe5d4] pt-1">
            <Toggle on={conf.record} onChange={record => setConf({ record })} label="ოთახის ჩაწერა" hint="ბოლოს მოისმენთ და კლასის ჩატში გაგზავნით" />
          </div>
        )}
        <p className="flex items-start gap-2 text-[13px] leading-snug text-[#75685a]">
          <Music className="w-5 h-5 shrink-0 text-[#7a2028]" />
          ტელეფონი მაგიდაზე დადეთ, ხმა აუწიეთ. ეკრანზე წიგნის სტრიქონი და დარტყმები ჩანს; ტაშისა და დოლის მარცვლები — „ტა ტი-ტი“, „დუმ-ტეკ“.
        </p>
        {failed && <p className="text-[13.5px] font-bold text-[#b3261e]">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>}
        <Btn full size="lg" icon={phrase || failed ? <Play /> : <Loader2 className="animate-spin" />} disabled={!phrase || !phone.length} onClick={() => setOpen(true)}>
          სცენაზე!
        </Btn>
        {!phone.length && <p className="-mt-2 text-[13px] text-[#75685a]">ტელეფონს ერთი როლი მაინც მიეცი.</p>}
        {phone.length > 0 && !klasi.length && <p className="-mt-2 text-[13px] text-[#75685a]">კლასს როლი არ აქვს — ტელეფონი მარტო დაუკრავს.</p>}
      </Card>
      {open && song && phrase && <Conductor song={song} phrase={phrase} conf={conf} onClose={() => setOpen(false)} />}
    </>
  );
};
