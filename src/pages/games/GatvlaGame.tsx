import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Dices, ListOrdered, Plus, RotateCcw, Trash2, Users, UsersRound, X } from 'lucide-react';
import { useManagedClasses, type SchoolClass } from '../../hooks/useClasses';
import {
  BUILT_IN_RHYMES, MAX_NAMES, MAX_NAME_LEN, TEAM_COUNTS, TEAM_LABELS, beatsOf, cleanName, countingSteps, splitTeams, stillIn, wheelDelay, wheelPick, wheelSteps,
  type Rhyme,
} from '../../utils/gatvla';
import { Btn, Card, FIELD, askConfirm } from '../../components/ui/kit';
import { TableScreen } from '../../components/games/TableScreen';
import { Chip } from '../../components/games/Chip';
import { closeAudio, openAudio, tick, type AudioRef } from '../../utils/gameSounds';
import { triggerHaptic } from '../../utils/haptics';

// „გათვლა“ (games hub, 2026-10-28, live): one phone in the circle. The names light up one per beat of the rhyme and the
// last beat picks who starts (who was picked is skipped next time); the „ვისი ჯერია?“ wheel asks the one asked least;
// „გუნდები“ deals the class into teams. The rules are utils/gatvla.ts, the big screen components/games/TableScreen.tsx.
// Names, the teacher's own rhymes and the wheel's counts stay on the device; a teacher adds a class's members in one tap.

type Mode = 'count' | 'wheel' | 'teams';
interface Store { names: string[]; own: Rhyme[]; rhymeId: string; counts: Record<string, number> }

const KEY = 'sg-gatvla';
const BEAT_MS = 420;
const TEAM_TONE = ['bg-[#f6d66e] text-[#4a3a10]', 'bg-[#a8d48c] text-[#1f3d1a]', 'bg-[#a6c8ea] text-[#102a43]', 'bg-[#cfa6d4] text-[#3a1536]'];

const readStore = (): Store => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<Store> | null;
    const names = (o?.names ?? []).map(n => cleanName(String(n))).filter(Boolean).slice(0, MAX_NAMES);
    const own = (o?.own ?? []).filter(r => r && typeof r.id === 'string' && typeof r.text === 'string').map(r => ({ id: r.id, title: String(r.title || '').slice(0, 40), text: String(r.text).slice(0, 600), own: true }));
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(o?.counts ?? {})) if (typeof v === 'number' && names.includes(k)) counts[k] = v;
    return { names: [...new Set(names)], own, rhymeId: o?.rhymeId || BUILT_IN_RHYMES[0].id, counts };
  } catch { return { names: [], own: [], rhymeId: BUILT_IN_RHYMES[0].id, counts: {} }; }
};
const writeStore = (s: Store) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

const NameTile: React.FC<{ name: string; state: 'idle' | 'active' | 'out' | 'picked'; note?: string }> = ({ name, state, note }) => (
  <div
    className={`min-h-[60px] rounded-2xl px-2 py-2 flex flex-col items-center justify-center text-center font-bold leading-tight transition-colors duration-100 [overflow-wrap:anywhere] ${
      state === 'picked' ? 'bg-[#2f7d4f] text-white shadow-[0_8px_18px_-8px_rgba(47,125,79,0.9)] scale-[1.03]'
      : state === 'active' ? 'bg-[#7a2028] text-[#fbf6ec]'
      : state === 'out' ? 'bg-[#f1e8d9] text-[#b3a594]'
      : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'
    } ${name.length > 12 ? 'text-[13px]' : 'text-[15px]'}`}
  >
    {name}
    {note && <span className="mt-0.5 text-[11px] font-normal opacity-80">{note}</span>}
  </div>
);

/** counting out: the rhyme's words and the names light up beat by beat; the last beat picks */
const CountScreen: React.FC<{ names: string[]; rhyme: Rhyme; audio: AudioRef; onClose: () => void }> = ({ names, rhyme, audio, onClose }) => {
  const beats = beatsOf(rhyme.text);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [from, setFrom] = useState(0);
  const [steps, setSteps] = useState<number[]>([]);
  const [at, setAt] = useState(-1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const start = (fresh = false) => {
    triggerHaptic(20);
    openAudio(audio);
    const skip = fresh ? new Set<number>() : picked;
    const s = countingSteps(names, skip, beats.length, from);
    if (!s.length) return;
    if (fresh) setPicked(new Set());
    setSteps(s);
    setResult(null);
    setAt(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!running || at < 0) return;
    const last = at >= steps.length - 1;
    tick(audio.current, last);
    triggerHaptic(last ? 80 : 4);
    if (last) {
      const p = steps[at];
      setResult(p);
      setPicked(prev => new Set(prev).add(p));
      setFrom(p + 1);
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setAt(a => a + 1), BEAT_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, at]);

  const active = running ? steps[at] : -1;
  const everyone = result !== null && stillIn(names, picked).length === 0;

  return (
    <TableScreen
      title="გათვლა · ვინ იწყებს?"
      onClose={onClose}
      footer={
        result === null && !running ? <Btn size="lg" full onClick={() => start()} icon={<ListOrdered />} className="!h-14 !text-[16px]">გათვლა!</Btn>
        : running ? <Btn size="lg" full disabled className="!h-14 !text-[16px]">ითვლის…</Btn>
        : (
          <div className="grid grid-cols-2 gap-3">
            <Btn kind="ghost" size="lg" onClick={onClose}>მორჩა</Btn>
            <Btn size="lg" onClick={() => start(everyone)} icon={everyone ? <RotateCcw /> : <ChevronRight />}>{everyone ? 'თავიდან' : 'შემდეგი'}</Btn>
          </div>
        )
      }
    >
      <div className="py-2 space-y-4">
        <p className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5 text-center text-[15px] leading-relaxed text-[#4a3426]">
          {beats.map((w, i) => (
            <span key={i} className={`inline-block rounded-md px-1 mx-px transition-colors duration-100 ${running && i === at ? 'bg-[#7a2028] text-[#fbf6ec] font-bold' : running && i < at ? 'text-[#b3a594]' : ''}`}>{w}</span>
          ))}
        </p>
        {result !== null ? (
          <div className="text-center">
            <p className="text-[13px] font-bold text-[#9a8b7b]">იწყებს</p>
            <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#2f7d4f] break-words">{names[result]}</p>
            {everyone && <p className="mt-1 text-[12.5px] text-[#9a8b7b]">ყველა უკვე იყო — შემდეგი გათვლა თავიდან იწყება.</p>}
          </div>
        ) : (
          <p className="text-center text-[13px] text-[#75685a]">{running ? 'ითვლის…' : 'ყოველ სიტყვაზე სახელი ინთება; ვისზეც ბოლო სიტყვა მოხვდება, ის იწყებს. ვინც უკვე იყო, შემდეგ გამოტოვდება.'}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {names.map((n, i) => (
            <NameTile key={i} name={n} state={result === i ? 'picked' : active === i ? 'active' : picked.has(i) && result !== i ? 'out' : 'idle'} note={picked.has(i) && result !== i ? 'უკვე იყო' : undefined} />
          ))}
        </div>
      </div>
    </TableScreen>
  );
};

/** the wheel: the names flash faster, then slower, and stop on the one asked least */
const WheelScreen: React.FC<{ names: string[]; counts: Record<string, number>; audio: AudioRef; onPick: (name: string) => void; onReset: () => void; onClose: () => void }> = ({ names, counts, audio, onPick, onReset, onClose }) => {
  const [steps, setSteps] = useState<number[]>([]);
  const [at, setAt] = useState(-1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [cur, setCur] = useState(0);

  const spin = () => {
    triggerHaptic(20);
    openAudio(audio);
    const pick = wheelPick(names, counts, Math.random);
    const s = wheelSteps(names.length, cur, pick, 2);
    if (!s.length) return;
    setSteps(s);
    setResult(null);
    setAt(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!running || at < 0) return;
    const last = at >= steps.length - 1;
    tick(audio.current, last);
    triggerHaptic(last ? 100 : 3);
    setCur(steps[at]);
    if (last) {
      setResult(steps[at]);
      setRunning(false);
      onPick(names[steps[at]]);
      return;
    }
    const t = setTimeout(() => setAt(a => a + 1), wheelDelay(at, steps.length - 1));
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, at]);

  const shown = running ? steps[at] : result;
  const total = names.reduce((s, n) => s + (counts[n] ?? 0), 0);

  return (
    <TableScreen
      title="გათვლა · ვისი ჯერია?"
      onClose={onClose}
      right={total > 0 && !running ? <button type="button" onClick={async () => { if (await askConfirm('ჯერების თვლა გასუფთავდეს?')) onReset(); }} className="h-9 px-3 rounded-full text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">გასუფთავება</button> : undefined}
      footer={
        running ? <Btn size="lg" full disabled className="!h-14 !text-[16px]">ტრიალებს…</Btn>
        : result === null ? <Btn size="lg" full onClick={spin} icon={<Dices />} className="!h-14 !text-[16px]">დატრიალება</Btn>
        : (
          <div className="grid grid-cols-2 gap-3">
            <Btn kind="ghost" size="lg" onClick={onClose}>მორჩა</Btn>
            <Btn size="lg" onClick={spin} icon={<Dices />}>კიდევ</Btn>
          </div>
        )
      }
    >
      <div className="flex-1 flex flex-col gap-4 py-2">
        <div className={`flex-1 min-h-[150px] rounded-3xl flex flex-col items-center justify-center text-center px-5 py-6 transition-colors ${result !== null ? 'bg-[#2f7d4f] text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
          <p className={`text-[13px] font-bold ${result !== null ? 'text-white/80' : 'text-[#9a8b7b]'}`}>{result !== null ? 'ჯერია' : running ? '…' : 'ვისი ჯერია?'}</p>
          <p className="font-serif-ge text-[36px] font-bold leading-tight break-words max-w-full">{shown !== null && shown >= 0 ? names[shown] : '?'}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {names.map((n, i) => (
            <span key={i} className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[12.5px] font-bold ring-1 transition-colors ${shown === i ? 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-[#e8dcc8]'}`}>
              {n} <span className={`tabular-nums ${shown === i ? 'text-[#fbf6ec]/70' : 'text-[#9a8b7b]'}`}>{counts[n] ?? 0}</span>
            </span>
          ))}
        </div>
        <p className="text-center text-[12.5px] text-[#9a8b7b]">ბორბალი იმას ირჩევს, ვინც ყველაზე ნაკლებჯერ იყო — ასე ყველას ერთნაირად შეხვდება.</p>
      </div>
    </TableScreen>
  );
};

const TeamsScreen: React.FC<{ names: string[]; onClose: () => void }> = ({ names, onClose }) => {
  const [n, setN] = useState<number>(2);
  const [teams, setTeams] = useState(() => splitTeams(names, 2, Math.random));
  const deal = (count: number) => { triggerHaptic(20); setN(count); setTeams(splitTeams(names, count, Math.random)); };
  return (
    <TableScreen
      title="გათვლა · გუნდები"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-3">
          <Btn kind="ghost" size="lg" onClick={onClose}>მორჩა</Btn>
          <Btn size="lg" onClick={() => deal(n)} icon={<RotateCcw />}>ხელახლა</Btn>
        </div>
      }
    >
      <div className="py-2 space-y-3">
        <div className="flex justify-center gap-2">
          {TEAM_COUNTS.map(c => <Chip key={c} on={n === c} onClick={() => deal(c)} disabled={names.length < c}>{c} გუნდი</Chip>)}
        </div>
        {teams.map((t, i) => (
          <div key={i} className={`rounded-2xl px-3 py-2.5 ${TEAM_TONE[i]}`}>
            <p className="text-[13px] font-bold">{TEAM_LABELS[i]} · {t.length}</p>
            <p className="mt-1 font-serif-ge text-[17px] font-bold leading-snug">{t.join(' · ')}</p>
          </div>
        ))}
      </div>
    </TableScreen>
  );
};

const GatvlaGame: React.FC = () => {
  const [store, setStore] = useState(readStore);
  const [mode, setMode] = useState<Mode | null>(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [ownTitle, setOwnTitle] = useState('');
  const [ownText, setOwnText] = useState('');
  const { classes } = useManagedClasses();
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);

  const save = (patch: Partial<Store>) => setStore(s => { const next = { ...s, ...patch }; writeStore(next); return next; });
  const rhymes = [...BUILT_IN_RHYMES, ...store.own];
  const rhyme = rhymes.find(r => r.id === store.rhymeId) ?? rhymes[0];

  const addName = (raw: string) => {
    const n = cleanName(raw);
    if (!n || store.names.includes(n) || store.names.length >= MAX_NAMES) { setDraft(''); return; }
    triggerHaptic(5);
    save({ names: [...store.names, n] });
    setDraft('');
  };
  const removeName = (name: string) => { triggerHaptic(5); const counts = { ...store.counts }; delete counts[name]; save({ names: store.names.filter(n => n !== name), counts }); };
  const addClass = (c: SchoolClass) => {
    triggerHaptic(10);
    const add = c.members.map(m => cleanName(m.name)).filter(n => n && !store.names.includes(n));
    save({ names: [...new Set([...store.names, ...add])].slice(0, MAX_NAMES) });
  };
  const clearNames = async () => { if (await askConfirm('ყველა სახელი წაიშალოს?')) save({ names: [], counts: {} }); };
  const saveOwn = () => {
    const text = ownText.replace(/\s+/g, ' ').trim().slice(0, 600);
    if (beatsOf(text).length < 2) return;
    const title = ownTitle.trim().slice(0, 40) || beatsOf(text).slice(0, 3).join(' ') + '…';
    const r: Rhyme = { id: `own-${Date.now().toString(36)}`, title, text, own: true };
    save({ own: [...store.own, r], rhymeId: r.id });
    setOwnTitle(''); setOwnText(''); setAdding(false);
  };
  const removeOwn = async (r: Rhyme) => {
    if (!(await askConfirm(`„${r.title}“ წაიშალოს?`))) return;
    const own = store.own.filter(x => x.id !== r.id);
    save({ own, rhymeId: store.rhymeId === r.id ? BUILT_IN_RHYMES[0].id : store.rhymeId });
  };
  const bump = (name: string) => save({ counts: { ...store.counts, [name]: (store.counts[name] ?? 0) + 1 } });

  const enough = store.names.length >= 2;

  if (mode === 'count') return <CountScreen names={store.names} rhyme={rhyme} audio={audio} onClose={() => setMode(null)} />;
  if (mode === 'wheel') return <WheelScreen names={store.names} counts={store.counts} audio={audio} onPick={bump} onReset={() => save({ counts: {} })} onClose={() => setMode(null)} />;
  if (mode === 'teams') return <TeamsScreen names={store.names} onClose={() => setMode(null)} />;

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">გათვლა</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          ერთი ტელეფონი წრეში. ჩაწერე სახელები და აირჩიე: <b>გათვლა</b> — ლექსი ითვლის, ვინ იწყებს; <b>ბორბალი</b> — ვისი ჯერია ახლა, ყველას თანაბრად; <b>გუნდები</b> — ვინ ვისთან. ყველაფერი ამ ტელეფონზე რჩება.
        </p>
      </Card>

      <Card className="!p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> ვინ თამაშობს · {store.names.length}</p>
          {store.names.length > 0 && <button type="button" onClick={clearNames} className="h-8 px-2.5 rounded-full text-[12px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">გასუფთავება</button>}
        </div>
        {store.names.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {store.names.map(n => (
              <li key={n} className="inline-flex items-center h-9 pl-3 pr-1 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426]">
                {n}
                <button type="button" onClick={() => removeName(n)} aria-label={`${n} — წაშლა`} className="w-7 h-7 ml-0.5 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        ) : <p className="text-[12.5px] text-[#9a8b7b]">ჯერ არავინაა — ჩაწერე სახელები ან დაამატე კლასი.</p>}
        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); addName(draft); }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="სახელი" aria-label="სახელი" maxLength={MAX_NAME_LEN} autoComplete="off" className={FIELD} />
          <Btn type="submit" icon={<Plus />} disabled={!cleanName(draft) || store.names.length >= MAX_NAMES} className="shrink-0">დამატება</Btn>
        </form>
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {classes.map(c => <Chip key={c.id} on={false} onClick={() => addClass(c)}>+ {c.name} · {c.members.length}</Chip>)}
          </div>
        )}
      </Card>

      <Card className="!p-4 space-y-3">
        <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><ListOrdered className="w-4 h-4 text-[#7a2028]" /> გათვლის ლექსი</p>
        <div className="flex flex-wrap gap-2">
          {rhymes.map(r => <Chip key={r.id} on={rhyme.id === r.id} onClick={() => save({ rhymeId: r.id })}>{r.title}</Chip>)}
          {!adding && <Chip on={false} onClick={() => setAdding(true)}>+ ჩემი ლექსი</Chip>}
        </div>
        {adding ? (
          <div className="space-y-2 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] p-3">
            <input value={ownTitle} onChange={e => setOwnTitle(e.target.value)} placeholder="სათაური (არასავალდებულო)" aria-label="სათაური" maxLength={40} className={FIELD} />
            <textarea value={ownText} onChange={e => setOwnText(e.target.value)} placeholder="ლექსი — ყოველი სიტყვა ერთი დარტყმაა" aria-label="ლექსი" rows={3} maxLength={600} className={`${FIELD} !h-auto py-2.5 resize-none`} />
            <div className="flex gap-2">
              <Btn kind="ghost" onClick={() => { setAdding(false); setOwnTitle(''); setOwnText(''); }} className="flex-1">გაუქმება</Btn>
              <Btn icon={<Check />} disabled={beatsOf(ownText).length < 2} onClick={saveOwn} className="flex-1">შენახვა</Btn>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] leading-relaxed text-[#4a3426]">{rhyme.text}</p>
              {rhyme.own && <button type="button" onClick={() => removeOwn(rhyme)} aria-label="ლექსის წაშლა" className="w-9 h-9 shrink-0 -mr-1 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><Trash2 className="w-4 h-4" /></button>}
            </div>
            <p className="mt-1 text-[12px] tabular-nums text-[#9a8b7b]">{beatsOf(rhyme.text).length} დარტყმა</p>
          </div>
        )}
      </Card>

      <div className="space-y-2">
        <Btn size="lg" full disabled={!enough} onClick={() => setMode('count')} icon={<ListOrdered />} className="!h-14 !text-[16px]">ვინ იწყებს? · გათვლა</Btn>
        <Btn size="lg" full disabled={!enough} onClick={() => setMode('wheel')} icon={<Dices />} className="!h-14 !text-[16px]">ვისი ჯერია? · ბორბალი</Btn>
        <Btn size="lg" full disabled={!enough} onClick={() => setMode('teams')} icon={<UsersRound />} className="!h-14 !text-[16px]">გუნდები</Btn>
        {!enough && <p className="text-center text-[12.5px] text-[#9a8b7b]">ჩაწერე მინიმუმ ორი სახელი.</p>}
      </div>
    </div>
  );
};

export default GatvlaGame;
