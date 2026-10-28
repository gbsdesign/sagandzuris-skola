import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gem, Loader2, Pause, Play } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import type { ClassMember, SchoolClass } from '../../hooks/useClasses';
import { useClassStudents } from '../../hooks/useTeaching';
import { CHESTS } from '../../data/pearls';
import { findVersion } from '../../data/chantLookup';
import { PearlRecord, PearlShine, VOICE_NAMES, chantName, isGolden, pearlState } from '../../utils/pearls';
import { PearlTake, shinePearl, takeUrl } from '../../hooks/usePearls';
import { Avatar } from '../classes/ChatPanel';
import { Flash, useFlash } from '../ui/kit';
import { PearlIcon } from './PearlIcon';
import { PearlReview } from './PearlReview';
import { triggerHaptic } from '../../utils/haptics';

// „მარგალიტები“ of a class (2026-10-28), for its teachers on the class page. On top the takes waiting for a teacher's
// ear („მოსასმენი“: polished, not yet shining, newest first): ▶ fetches the take only when asked, „ჩათვლა“ makes the
// pearl shine. Under it one table of every member's pearls by chest — how many are polished, the gold part of the bar
// shining — and the golden ones; a member's row unfolds their whole list (PearlReview, as in the member's window).
// Shown once any member has played.

const PEARL_IDS = CHESTS.flatMap(c => c.pearls);
const WAITING_SHOWN = 5;

interface Row { m: ClassMember; pearls: Record<string, PearlRecord>; shine: Record<string, PearlShine> }
interface Waiting { r: Row; id: string; rec: PearlRecord }

export const ClassPearls: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const { user } = useAuth();
  const records = useClassStudents(cls);
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState<string | null>(null);
  const [allWaiting, setAllWaiting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const msg = useFlash();

  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);

  const rows: Row[] = cls.members.map(m => ({ m, pearls: records[m.uid]?.data?.pearls || {}, shine: records[m.uid]?.data?.pearlShine || {} }));
  const played = (r: Row) => PEARL_IDS.some(id => r.pearls[id] || r.shine[id]);
  if (!rows.some(played)) return null;

  const waiting: Waiting[] = rows
    .flatMap(r => PEARL_IDS.filter(id => pearlState(r.pearls[id], r.shine[id]) === 'polished').map(id => ({ r, id, rec: r.pearls[id] })))
    .sort((a, b) => (b.rec.at || '').localeCompare(a.rec.at || ''));
  const shownWaiting = allWaiting ? waiting : waiting.slice(0, WAITING_SHOWN);

  const keyOf = (w: Waiting) => `${w.r.m.uid}/${w.id}`;
  const play = async (w: Waiting) => {
    const key = keyOf(w);
    if (playing === key) { stop(); return; }
    stop();
    setBusy(key);
    try {
      const snap = await getDoc(doc(db, 'pearlTakes', w.r.m.uid, 'takes', w.id));
      if (!snap.exists()) { msg.fail('ჩანაწერი ვერ მოიძებნა.'); return; }
      const url = takeUrl({ id: snap.id, ...(snap.data() as Omit<PearlTake, 'id'>) });
      const a = new Audio(url);
      a.onended = stop;
      audio.current = { a, url };
      setPlaying(key);
      await a.play().catch(stop);
    } catch {
      msg.fail('ჩანაწერი ვერ ჩაიტვირთა.');
    } finally {
      setBusy(b => (b === key ? null : b));
    }
  };

  const approve = (w: Waiting) => {
    triggerHaptic(15);
    if (playing === keyOf(w)) stop();
    shinePearl(w.r.m.uid, w.id, { voice: w.rec.voice, by: user?.email || '', at: new Date().toISOString() })
      .then(() => msg.ok(`ჩაითვალა: ${w.r.m.name}`))
      .catch(e => msg.fail('ვერ შეინახა' + (e?.code === 'permission-denied' ? ': ბაზის წესები არ უშვებს.' : '.')));
  };

  return (
    <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] px-3 sm:px-4 pt-1 pb-1" aria-label="მარგალიტები">
      <button type="button" onClick={() => { triggerHaptic(8); setOpen(o => !o); }} aria-expanded={open}
        className="w-full min-h-14 flex items-center gap-2 px-1 text-left cursor-pointer">
        <Gem className="w-5 h-5 shrink-0 text-[#7a2028]" />
        <h2 className="flex-1 min-w-0 font-serif-ge text-lg font-bold text-[#4a3426] truncate">მარგალიტები</h2>
        {waiting.length > 0 && (
          <span className="shrink-0 h-7 px-2.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-xs font-bold flex items-center tabular-nums">
            {waiting.length} მოსასმენი
          </span>
        )}
        <ChevronDown className={`w-5 h-5 shrink-0 text-[#a4927c] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pb-3 space-y-4 sg-in">
          {msg.flash && <Flash flash={msg.flash} onClose={msg.clear} />}

          {/* the takes to hear and approve */}
          {waiting.length > 0 ? (
            <div>
              <p className="px-1 text-[13px] font-bold text-[#75685a]">მოსასმენი · გაპრიალებული, ჯერ ჩაუთვლელი</p>
              <ul className="mt-1 divide-y divide-[#f1e8d9]">
                {shownWaiting.map(w => {
                  const info = findVersion(w.id);
                  const key = keyOf(w);
                  return (
                    <li key={key} className="py-2 flex items-center gap-2.5">
                      <Avatar name={w.r.m.name} photoURL={w.r.m.photoURL} className="w-9 h-9 text-sm shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-[#2a2017] truncate">{w.r.m.name}</p>
                        <p className="text-[12px] leading-snug text-[#75685a] truncate">
                          {info ? `№${info.variant.bookNums?.[0]} ${chantName(info.chant.title)}` : w.id}
                        </p>
                        <p className="text-[12px] leading-snug font-bold text-[#7a2028] tabular-nums">{VOICE_NAMES[w.rec.voice]} · {w.rec.best}%</p>
                      </div>
                      <button type="button" onClick={() => play(w)} aria-label={playing === key ? 'გაჩერება' : 'მოსმენა'}
                        className="shrink-0 w-11 h-11 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.14]">
                        {busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : playing === key ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <button type="button" onClick={() => approve(w)}
                        className="shrink-0 h-9 px-3.5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[13px] font-bold cursor-pointer active:scale-[0.97] transition">
                        ჩათვლა
                      </button>
                    </li>
                  );
                })}
              </ul>
              {waiting.length > WAITING_SHOWN && (
                <button type="button" onClick={() => setAllWaiting(v => !v)}
                  className="mt-1 min-h-10 px-1 text-[13px] font-bold text-[#7a2028] cursor-pointer hover:underline">
                  {allWaiting ? 'ნაკლები' : `კიდევ ${waiting.length - WAITING_SHOWN}`}
                </button>
              )}
            </div>
          ) : (
            <p className="px-1 text-[13px] text-[#75685a]">მოსასმენი ჯერ არაფერია: ყველა გაპრიალებული მარგალიტი ჩათვლილია.</p>
          )}

          {/* every member by chest */}
          <div>
            <p className="px-1 text-[13px] font-bold text-[#75685a]">კლასის მარგალიტები · გაპრიალებული სკივრების მიხედვით</p>
            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_repeat(3,52px)_30px] gap-x-1 items-end px-1 pb-1.5 border-b border-[#efe5d4]">
              <span />
              {CHESTS.map(c => <span key={c.id} className="text-center text-[12px] font-bold text-[#8a7a6a] truncate">{c.label}</span>)}
              <span className="flex justify-center" title="ოქროსფერი: სამივე ხმაზე" aria-label="ოქროსფერი"><PearlIcon state="polished" golden size={22} /></span>
            </div>
            <ul className="divide-y divide-[#f6efe3]">
              {rows.map(r => {
                const on = member === r.m.uid;
                const golden = PEARL_IDS.filter(id => isGolden(r.pearls[id])).length;
                return (
                  <li key={r.m.uid}>
                    <button type="button" onClick={() => { triggerHaptic(8); setMember(on ? null : r.m.uid); }} aria-expanded={on}
                      className={`w-full min-h-12 py-1.5 grid grid-cols-[minmax(0,1fr)_repeat(3,52px)_30px] gap-x-1 items-center px-1.5 rounded-xl text-left cursor-pointer transition-colors ${on ? 'bg-[#7a2028]/[0.05]' : 'hover:bg-[#fbf6ec]'}`}>
                      <span className={`min-w-0 line-clamp-2 break-words text-[13px] leading-tight font-semibold ${played(r) ? 'text-[#2a2017]' : 'text-[#a4927c]'}`}>{r.m.name}</span>
                      {CHESTS.map(c => {
                        const polished = c.pearls.filter(id => { const s = pearlState(r.pearls[id], r.shine[id]); return s === 'polished' || s === 'shining'; }).length;
                        const shining = c.pearls.filter(id => r.shine[id]).length;
                        return (
                          <span key={c.id} className="flex flex-col items-center gap-1" title={`${c.label}: გაპრიალებული ${polished}, ბრწყინავს ${shining}`}>
                            <span className={`text-[13px] font-bold tabular-nums ${polished ? 'text-[#4a3426]' : 'text-[#cbbca6]'}`}>{polished}</span>
                            <span className="relative w-full h-1.5 rounded-full bg-[#efe5d4] overflow-hidden">
                              <span className="absolute inset-y-0 left-0 rounded-full bg-[#7a2028]/75" style={{ width: `${(100 * polished) / c.pearls.length}%` }} />
                              <span className="absolute inset-y-0 left-0 rounded-full bg-[#c9962a]" style={{ width: `${(100 * shining) / c.pearls.length}%` }} />
                            </span>
                          </span>
                        );
                      })}
                      <span className={`text-center text-[13px] font-bold tabular-nums ${golden ? 'text-[#9a6a1c]' : 'text-[#cbbca6]'}`}>{golden}</span>
                    </button>
                    {on && (
                      <div className="pb-2 pt-1 sg-in">
                        {played(r)
                          ? <PearlReview uid={r.m.uid} pearls={r.pearls} shine={r.shine} />
                          : <p className="px-2 py-2 text-[13px] text-[#75685a]">{r.m.name} მარგალიტებს ჯერ არ უმღერია.</p>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 px-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8a7a6a]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#7a2028]/75" /> გაპრიალებული</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-[#c9962a]" /> ბრწყინავს (ჩათვლილი)</span>
              <span>· სახელზე დაჭერა — სრული სია</span>
            </p>
          </div>
        </div>
      )}
    </section>
  );
};
