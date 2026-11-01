import React, { useEffect, useRef, useState } from 'react';
import { Check, Dices, Download, Loader2, Pause, Play, Plus, Square } from 'lucide-react';
import { ROLES, ROLE_NAMES, VARIANTS, randomStage, variantOf, type Role, type StageConf } from '../../../utils/gundi';
import { saveBlob } from '../../../utils/chantSynth';
import type { VoiceTake } from '../../../utils/voiceRecorder';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card } from '../../../components/ui/kit';
import { ClassSend } from '../../../components/games/ClassSend';
import { hushSnippets } from '../rounds/useSnippet';
import { GundiStage, MAX_TAKE, renderTake } from './engine';
import { LOOK, StageView, type StageProbe } from './Stage';
import { PhrasePicker, SongPicker, TempoPicker } from './Pickers';
import { byRole, phraseOf, songOf, useSong } from './songs';
import { readStage, saveStage } from './store';

// „ჩემი გუნდი“ on the stage (the „სცენა“ tab, the hub's „ონლაინ“): pick a song and its phrase, let the performers in one by
// one — a tap on a figure or on its card — choose what each plays, record up to two minutes and send it to the class chat.
// The music starts with the first one let in and stops when the last goes (unless recording).

const clock = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

type Rec = { state: 'idle' } | { state: 'on' } | { state: 'making'; progress: number } | { state: 'done'; take: VoiceTake; url: string; title: string; text: string };

/** the thin line under the stage: how far the pass is */
const PassBar: React.FC<{ probe: () => StageProbe & { beats: number } | null }> = ({ probe }) => {
  const bar = useRef<HTMLSpanElement | null>(null);
  const ref = useRef(probe);
  ref.current = probe;
  useEffect(() => {
    let raf = 0;
    const frame = () => {
      const p = ref.current();
      if (bar.current) bar.current.style.width = p ? `${Math.min(100, (p.beat / p.beats) * 100).toFixed(2)}%` : '0%';
      raf = window.requestAnimationFrame(frame);
    };
    raf = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(raf);
  }, []);
  return (
    <span className="block h-1.5 rounded-full bg-[#eadfcb] overflow-hidden" aria-hidden="true">
      <span ref={bar} className="block h-full rounded-full bg-[#c9a24b]" style={{ width: '0%' }} />
    </span>
  );
};

/** a performer's card: in or out (the head row), and what they play */
const RoleCard: React.FC<{ role: Role; on: boolean; variant: string; onToggle: () => void; onVariant: (id: string) => void }> = ({ role, on, variant, onToggle, onVariant }) => {
  const list = VARIANTS[role];
  const v = variantOf(role, variant);
  const color = LOOK[role].coat;
  return (
    <div className={`rounded-2xl p-2.5 transition ${on ? 'bg-white' : 'bg-white/60'}`} style={{ boxShadow: on ? `inset 0 0 0 2px ${color}, 0 1px 3px rgba(74,52,38,0.1)` : 'inset 0 0 0 1px #e8dcc8' }}>
      <button type="button" onClick={() => { triggerHaptic(8); onToggle(); }} aria-pressed={on}
        className="w-full min-h-10 flex items-center gap-2 rounded-xl px-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]/50">
        <span className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors"
          style={on ? { background: color, color: '#fbf6ec' } : { background: '#fff', color: '#9a8b7b', boxShadow: 'inset 0 0 0 1.5px #d6cdc1' }}>
          {on ? <Check className="w-4 h-4" strokeWidth={3} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[14.5px] font-bold" style={{ color: on ? color : '#8a7d70' }}>{ROLE_NAMES[role]}</span>
      </button>
      {list.length > 1 ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`${ROLE_NAMES[role]} — რას უკრავს`}>
          {list.map(x => {
            const picked = x.id === v.id;
            return (
              <button key={x.id} type="button" aria-pressed={picked && on}
                onClick={() => { triggerHaptic(5); onVariant(x.id); }}
                className="h-9 px-3 rounded-full text-[12.5px] font-bold transition cursor-pointer active:scale-[0.97]"
                style={picked && on ? { background: color, color: '#fbf6ec' }
                  : picked ? { background: '#fff', color, boxShadow: `inset 0 0 0 1.5px ${color}` }
                  : { background: '#fff', color: '#75685a', boxShadow: 'inset 0 0 0 1px #e8dcc8' }}
              >
                {x.name}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="mt-1.5 px-1 text-[12px] leading-snug text-[#75685a]">{v.hint}</p>
    </div>
  );
};

export const GundiStudio: React.FC = () => {
  const [conf, setConfState] = useState<StageConf>(readStage);
  const confRef = useRef(conf);
  confRef.current = conf;
  const setConf = (patch: Partial<StageConf>) => setConfState(c => { const n = { ...c, ...patch }; saveStage(n); return n; });
  const { song, failed } = useSong(conf.song);
  const loopIdx = song ? Math.min(conf.loop, Math.max(0, song.loops.length - 1)) : 0;
  const phrase = song ? phraseOf(song, loopIdx, conf.speed) : null;
  const on = byRole(r => conf.on.includes(r));
  const variant = byRole(r => variantOf(r, conf.variant[r]).id);
  const meta = songOf(conf.song);

  const stage = useRef<GundiStage | null>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState<number | null>(null);
  const [rec, setRec] = useState<Rec>({ state: 'idle' });
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef(rec);
  recRef.current = rec;

  useEffect(() => () => { stage.current?.dispose(); stage.current = null; }, []);
  useEffect(() => () => { if (rec.state === 'done') URL.revokeObjectURL(rec.url); }, [rec]);

  // a new phrase or tempo waits for the end of the pass; a new song starts at once
  const lastSong = useRef(conf.song);
  const phraseKey = phrase ? `${conf.song}:${phrase.loop.a}:${conf.speed}` : '';
  useEffect(() => {
    const s = stage.current;
    if (!s || !phrase) return;
    const newSong = lastSong.current !== conf.song;
    lastSong.current = conf.song;
    s.setPhrase(phrase, newSong);
    setWaiting(s.waiting ? loopIdx : null);
  }, [phraseKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // the chip's „…“ goes when the new phrase begins
  useEffect(() => {
    if (waiting == null) return;
    const t = window.setInterval(() => { if (!stage.current?.waiting) setWaiting(null); }, 150);
    return () => window.clearInterval(t);
  }, [waiting]);
  // the recording's clock
  useEffect(() => {
    if (rec.state !== 'on') return;
    const t = window.setInterval(() => setRecSec(stage.current?.recSeconds() ?? 0), 250);
    return () => window.clearInterval(t);
  }, [rec.state]);

  const engine = () => {
    if (!stage.current && phrase) {
      stage.current = new GundiStage(phrase, confRef.current.on, byRole(r => variantOf(r, confRef.current.variant[r]).id));
      stage.current.onTakeFull = () => { void stopRec(); };
    }
    return stage.current;
  };

  const play = async () => {
    const s = engine();
    if (!s) return;
    hushSnippets();
    await s.play();
    setPlaying(s.playing);
  };
  const pause = () => {
    if (recRef.current.state === 'on') void stopRec();
    stage.current?.stop();
    setPlaying(false);
    setWaiting(null);
  };

  const stopRec = async () => {
    const s = stage.current;
    if (!s || recRef.current.state !== 'on') return;
    const log = s.stopRecording();
    if (!log || log.end < 0.5) { setRec({ state: 'idle' }); return; }
    setRec({ state: 'making', progress: 0 });
    const c = confRef.current;
    const m = songOf(c.song);
    const who = ROLES.filter(r => c.on.includes(r)).map(r => (VARIANTS[r].length > 1 ? `${ROLE_NAMES[r]} (${variantOf(r, c.variant[r]).name})` : ROLE_NAMES[r]));
    try {
      const take = await renderTake(log, progress => setRec(cur => (cur.state === 'making' ? { state: 'making', progress } : cur)));
      setRec({
        state: 'done', take, url: URL.createObjectURL(take.mp3), title: m.title,
        text: `🎵 ჩემი გუნდი — ${m.title} (${m.region})${who.length ? `\n${who.join(' · ')}` : ''}`,
      });
    } catch {
      setRec({ state: 'idle' });
    }
  };
  const startRec = async () => {
    if (!playing) await play();
    const s = stage.current;
    if (!s?.playing) return;
    if (rec.state === 'done') URL.revokeObjectURL(rec.url);
    s.startRecording();
    setRecSec(0);
    setRec({ state: 'on' });
  };

  /** a performer in or out: the first one in starts the music, the last one out stops it (unless recording) */
  const toggle = (role: Role, want?: boolean) => {
    const next = want ?? !on[role];
    const list = next ? [...new Set([...conf.on, role])] : conf.on.filter(r => r !== role);
    setConf({ on: ROLES.filter(r => list.includes(r)) });
    const s = engine();
    s?.setOn(role, next);
    if (next && !s?.playing) void play();
    if (!list.length && s?.playing && recRef.current.state !== 'on') pause();
  };
  const choose = (role: Role, id: string) => {
    const was = on[role] && variant[role] === id;
    setConf({ variant: { ...conf.variant, [role]: id } });
    stage.current?.setVariant(role, id);
    toggle(role, !was);
  };
  const shuffle = () => {
    triggerHaptic(10);
    const r = randomStage(Math.random);
    const loops = song?.loops.length ?? 1;
    setConf({ on: r.on, variant: r.variant, loop: Math.random() < 0.5 ? Math.floor(Math.random() * loops) : conf.loop });
    const s = engine();
    if (s) {
      for (const role of ROLES) { s.setVariant(role, r.variant[role] ?? VARIANTS[role][0].id); s.setOn(role, r.on.includes(role)); }
      if (!s.playing) void play();
    }
  };

  const probe = () => {
    const p = stage.current?.probe();
    return p ? { beat: p.beat, beats: p.phrase.loop.beats, busy: p.busy, stroke: p.stroke } : null;
  };
  const nobody = !conf.on.length;

  return (
    <div className="space-y-3">
      <SongPicker value={conf.song} onChange={num => setConf({ song: num, loop: 0 })} />
      <StageView on={on} labels={{}} probe={probe} onTap={role => toggle(role)} />
      <PassBar probe={probe} />
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={!phrase}
          onClick={() => { triggerHaptic(12); if (playing) pause(); else { if (nobody) toggle('bani', true); else void play(); } }}
          aria-label={playing ? 'პაუზა' : 'დაკვრა'}
          className="w-14 h-14 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_2px_6px_rgba(122,32,40,0.35)] transition active:scale-95 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7a2028]/50"
        >
          {!phrase && !failed ? <Loader2 className="w-6 h-6 animate-spin" /> : playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        <button type="button" onClick={shuffle} disabled={!phrase} aria-label="შემთხვევითი გუნდი"
          className="w-11 h-11 shrink-0 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center transition active:scale-95 disabled:opacity-40 cursor-pointer hover:ring-[#7a2028]/40">
          <Dices className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1" />
        {rec.state === 'on' ? (
          <button type="button" onClick={() => { triggerHaptic(10); void stopRec(); }}
            className="h-11 shrink-0 rounded-full px-4 inline-flex items-center gap-2 bg-[#b3261e] text-white text-[14px] font-bold tabular-nums cursor-pointer active:scale-[0.97]">
            <Square className="w-4 h-4" />{clock(recSec)} / {clock(MAX_TAKE)}
          </button>
        ) : (
          <button type="button" disabled={!phrase || rec.state === 'making'} onClick={() => { triggerHaptic(10); void startRec(); }}
            className="h-11 shrink-0 rounded-full px-4 inline-flex items-center gap-2 bg-white ring-1 ring-[#e8dcc8] text-[#b3261e] text-[14px] font-bold cursor-pointer transition active:scale-[0.97] disabled:opacity-40 hover:ring-[#b3261e]/40">
            <span className="w-3 h-3 rounded-full bg-[#b3261e]" />ჩაწერა
          </button>
        )}
      </div>
      {failed && <p className="text-[13.5px] font-bold text-[#b3261e]" role="alert">ნოტები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>}
      {nobody && !playing && phrase && (
        <p className="rounded-2xl bg-[#c9a24b]/15 px-3.5 py-2.5 text-[13.5px] leading-snug text-[#5a4632]">
          შეეხე ფიგურას ან ბარათს — შემოვა და დაიწყებს. დაიწყე ბანით, მერე სხვები შემოიყვანე.
        </p>
      )}

      {rec.state === 'making' && (
        <p className="flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-[#75685a]" role="status">
          <Loader2 className="w-5 h-5 animate-spin" />ჩანაწერი მზადდება… {Math.round(rec.progress * 100)}%
        </p>
      )}
      {rec.state === 'done' && (
        <Card className="!p-4 space-y-3">
          <p className="font-serif-ge text-[17px] font-bold text-[#4a3426]">შენი ჩანაწერი</p>
          <audio controls src={rec.url} className="w-full" />
          <Btn full kind="ghost" icon={<Download />} onClick={() => saveBlob(rec.take.mp3, `ჩემი გუნდი — ${rec.title}.mp3`)}>შენახვა</Btn>
          <ClassSend text={rec.text} make={() => Promise.resolve(rec.take)} />
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ROLES.map(r => <RoleCard key={r} role={r} on={on[r]} variant={variant[r]} onToggle={() => toggle(r)} onVariant={id => choose(r, id)} />)}
      </div>

      <Card className="!p-4 space-y-3">
        <PhrasePicker song={song} value={loopIdx} speed={conf.speed} waiting={waiting} onChange={k => setConf({ loop: k })} />
        <TempoPicker value={conf.speed} onChange={speed => setConf({ speed })} />
        <p className="text-[12.5px] leading-snug text-[#75685a]">
          {meta.title} — {meta.region} სიმღერა, სასწავლო პროგრამის ნოტებით. ფრაზა წრეზე ბრუნავს; ახალი ფრაზა და ტემპი შემდეგი წრიდან ირთვება.
        </p>
      </Card>
    </div>
  );
};
