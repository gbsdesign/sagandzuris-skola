import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, KeyRound, Shuffle, Share2, Star, X, Zap } from 'lucide-react';
import { useDailyRecord } from '../../../hooks/useDailyRecord';
import { OTKHEULI_GROUPS } from '../../../data/otkheuliGroups';
import {
  MAX_MISSES, buildSolo, saidumloDay, saidumloShare, soloOfDay, soloOver, soloPick, soloStars, soloState, type SdSolo,
} from '../../../utils/saidumlo';
import { mulberry32 } from '../../../utils/otkheuli';
import { dayNumber, hangiStats, tbilisiToday } from '../../../utils/hangi';
import { MONTHS_GE } from '../../../utils/dateNames';
import { Btn, Card, Stat } from '../../../components/ui/kit';
import { Toast } from '../../../components/ui/Toast';
import { triggerHaptic } from '../../../utils/haptics';
import { Board, Tile, type TileLook } from './parts';

// „საიდუმლო სახელები“ alone (the hub's „ონლაინ“, 2026-11-01): the app is the captain. Its four clues are groups of „ოთხეული“
// („მდინარეები · 3“), one after another; the player touches the words of the clue on a board of 25 — a word of a later clue
// counts too, any other is a miss (four lose) and one is the trap (it loses at once). One board a day for the whole school
// (`useDailyRecord('saidumlo')`, the words touched kept after each), then free boards (`sg-saidumlo-free`).

const FREE_KEY = 'sg-saidumlo-free';
const readJson = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const writeJson = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

const Lives: React.FC<{ misses: number }> = ({ misses }) => (
  <span className="inline-flex items-center gap-1" aria-label={`შეცდომა ${misses} ${MAX_MISSES}-დან`}>
    {Array.from({ length: MAX_MISSES }, (_, i) => (
      <span key={i} className={`w-3 h-3 rounded-full ${i < MAX_MISSES - misses ? 'bg-[#7a2028]' : 'bg-[#e6dccb]'}`} />
    ))}
  </span>
);

const verdictOf = (stars: number, trapped: boolean, trap: string) =>
  trapped ? `„${trap}“ არცერთ მინიშნებას არ ეკუთვნოდა — ის იყო ხაფანგი.`
  : stars === 3 ? 'ბრწყინვალე — არც ერთი შეცდომა!' : stars === 2 ? 'ძალიან კარგია!' : stars === 1 ? 'გამოვიდა — ხვალ ნაკლები შეცდომით სცადე.'
  : 'ოთხი შეცდომა — ამჯერად ვერ გამოვიდა.';

/** one board: the clue, the 25 words, once over the answer */
const Play$: React.FC<{ s: SdSolo; picks: string[]; setPicks: (p: string[]) => void; head: React.ReactNode; after?: React.ReactNode }> = ({ s, picks, setPicks, head, after }) => {
  const st = soloState(s, picks);
  const over = soloOver(st);
  const stars = soloStars(st);
  const clue = s.clues[Math.min(st.clue, s.clues.length - 1)];
  const [flash, setFlash] = useState<string | null>(null);
  useEffect(() => { setFlash(null); }, [s.key]);

  const tap = (w: string) => {
    const next = soloPick(s, picks, w);
    if (next.length === picks.length) return;
    const after = soloState(s, next);
    if (w === s.trap) { setFlash('ხაფანგი!'); triggerHaptic(120); }
    else if (after.found.includes(w)) { setFlash(null); triggerHaptic(20); }
    else { setFlash(`„${w}“ — არა.`); triggerHaptic(45); }
    setPicks(next);
  };
  const lookOf = (w: string): TileLook => {
    if (w === s.trap && st.trapped) return { kind: 'trap' };
    if (st.found.includes(w)) return { kind: 'found' };
    if (st.misses.includes(w)) return { kind: 'miss' };
    if (over && s.clues.some(c => c.words.includes(w))) return { kind: 'missed' };
    if (over && w === s.trap) return { kind: 'side', side: 'trap', faint: true };
    return { kind: 'closed' };
  };

  return (
    <div className="space-y-3">
      {head}
      {!over && clue && (
        <Card tone="paper" className="!p-4 space-y-2.5">
          <div className="flex items-center gap-2">
            <p className="text-[12.5px] font-bold text-[#9a8b7b]">მინიშნება {st.clue + 1}/{s.clues.length}</p>
            <span className="ml-auto"><Lives misses={st.misses.length} /></span>
          </div>
          <p className="font-serif-ge text-[24px] font-bold leading-tight text-[#2b5f8a]" aria-live="polite">
            {clue.label} · {clue.words.length}
          </p>
          <p className="text-[13px] leading-snug text-[#75685a]">
            იპოვე ბადეში {clue.words.length} სიტყვა ამ ჯგუფიდან · ნაპოვნია {clue.words.filter(w => st.found.includes(w)).length}/{clue.words.length}
          </p>
          <div className="flex flex-wrap gap-1.5" aria-label="მინიშნებები">
            {s.clues.map((c, i) => {
              const done = c.words.every(w => st.found.includes(w));
              const now = i === st.clue;
              return (
                <span key={c.id} className={`h-7 px-2.5 rounded-full text-[12px] font-bold inline-flex items-center gap-1 ${done ? 'bg-[#2b5f8a]/12 text-[#2b5f8a]' : now ? 'bg-[#2b5f8a] text-white' : 'bg-[#f1e8d9] text-[#9a8b7b]'}`}>
                  {done && <Check className="w-3.5 h-3.5" aria-hidden="true" />}{done || now ? c.label : `${i + 1}`}
                </span>
              );
            })}
          </div>
          {flash && <p className="text-[13.5px] font-bold text-[#7a2028]" role="status">{flash}</p>}
        </Card>
      )}
      {over && (
        <Card tone="paper" className="!p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className={`font-serif-ge text-[19px] font-bold ${st.won ? 'text-[#2b5f8a]' : 'text-[#7a2028]'}`}>{st.won ? 'ყველა სიტყვა იპოვე!' : st.trapped ? 'ხაფანგი!' : 'ვერ გამოვიდა'}</p>
            {st.won && (
              <span className="ml-auto inline-flex gap-0.5" aria-label={`${stars} ვარსკვლავი`}>
                {[0, 1, 2].map(i => <Star key={i} className={`w-5 h-5 ${i < stars ? 'fill-[#d9a21b] text-[#d9a21b]' : 'text-[#d8c9b0]'}`} />)}
              </span>
            )}
          </div>
          <p className="text-[14px] leading-snug text-[#4a3426]">{verdictOf(stars, st.trapped, s.trap)}</p>
          <ul className="space-y-1.5">
            {s.clues.map(c => (
              <li key={c.id} className="text-[13.5px] leading-snug text-[#4a3426]">
                <b className="text-[#2b5f8a]">{c.label}:</b> {c.words.join(', ')}
              </li>
            ))}
            <li className="text-[13.5px] leading-snug text-[#4a3426] inline-flex items-center gap-1"><Zap className="w-4 h-4 text-[#2a211b]" aria-hidden="true" /><b>ხაფანგი:</b> {s.trap}</li>
          </ul>
          {after}
        </Card>
      )}
      <Board>
        {s.tiles.map(w => <Tile key={w} word={w} look={lookOf(w)} onTap={over ? undefined : () => tap(w)} />)}
      </Board>
      {!over && (
        <p className="px-1 text-[12.5px] leading-snug text-[#9a8b7b]">
          შეეხე სიტყვას, რომელიც მინიშნების ჯგუფს ეკუთვნის. სხვა სიტყვა შეცდომაა — ოთხი შეცდომა და თამაში მთავრდება; ერთი სიტყვა ხაფანგია და მაშინვე აგებინებს.
        </p>
      )}
    </div>
  );
};

interface Free { seed: number; picks: string[] }
const readFree = (): Free | null => {
  const o = readJson(FREE_KEY) as Partial<Free> | null;
  return o && Number.isInteger(o.seed) && Array.isArray(o.picks) ? { seed: o.seed as number, picks: o.picks.filter((x): x is string => typeof x === 'string') } : null;
};
const freeBoard = (seed: number) => buildSolo(OTKHEULI_GROUPS, mulberry32(seed));
const allOf = (s: SdSolo) => s.clues.reduce((n, c) => n + c.words.length, 0);

export const SaidumloSolo: React.FC = () => {
  const { days, loaded, save } = useDailyRecord('saidumlo');
  const [today, setToday] = useState(tbilisiToday);
  useEffect(() => { const t = setInterval(() => setToday(tbilisiToday()), 60_000); return () => clearInterval(t); }, []);
  const [toast, setToast] = useState<string | null>(null);
  const s = useMemo(() => soloOfDay(OTKHEULI_GROUPS, today), [today]);
  const record = days[today];
  const picks = s && record?.id === s.key ? record.guesses : [];
  const setPicks = (p: string[]) => { if (s) save(today, saidumloDay(s, p)); };
  const st = s ? soloState(s, picks) : null;
  const over = !!st && soloOver(st);

  const [free, setFreeState] = useState<Free | null>(readFree);
  const setFree = (f: Free | null) => { setFreeState(f); writeJson(FREE_KEY, f); };
  const fs = useMemo(() => (free ? freeBoard(free.seed) : undefined), [free?.seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const startFree = () => { triggerHaptic(10); setFree({ seed: Math.floor(Math.random() * 2 ** 31), picks: [] }); window.scrollTo({ top: 0 }); };
  const stats = useMemo(() => hangiStats(days, today), [days, today]);

  const share = async () => {
    if (!s) return;
    const msg = saidumloShare(dayNumber(today), s, picks);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  if (free && fs) {
    const fst = soloState(fs, free.picks);
    return (
      <Play$
        s={fs}
        picks={free.picks}
        setPicks={p => setFree({ ...free, picks: p })}
        head={(
          <Card className="!p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">თავისუფალი ბადე</p>
                <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ნაპოვნია {fst.found.length}/{allOf(fs)} · არაფერი ინახება</p>
              </div>
              <button type="button" onClick={() => setFree(null)} className="w-9 h-9 shrink-0 rounded-full inline-flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer" aria-label="თამაშის დასრულება">
                <X className="w-5 h-5" />
              </button>
            </div>
          </Card>
        )}
        after={(
          <div className="flex flex-wrap gap-2">
            <Btn icon={<Shuffle />} onClick={startFree} className="flex-1 min-w-[150px]">კიდევ ერთი</Btn>
            <Btn kind="ghost" icon={<CalendarDays />} onClick={() => setFree(null)} className="flex-1 min-w-[150px]">დღის ბადე</Btn>
          </div>
        )}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!loaded || !s || !st ? (
        <Card className="!p-4"><p className="text-[14px] text-[#9a8b7b]">იტვირთება…</p></Card>
      ) : (
        <Play$
          s={s}
          picks={picks}
          setPicks={setPicks}
          head={(
            <Card className="!p-4">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-[#2b5f8a] text-white inline-flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">დღის ბადე №{dayNumber(today)} · {dateLabel(today)}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
                    {over ? (st.won ? `ყველა იპოვე · ${st.misses.length} შეცდომით` : 'დღეს ვერ გამოვიდა') : `ერთი და იგივე მთელი სკოლისთვის · ნაპოვნია ${st.found.length}/${allOf(s)}`}
                  </p>
                </div>
              </div>
            </Card>
          )}
          after={<Btn kind="ghost" icon={<Share2 />} onClick={() => { void share(); }}>გაზიარება</Btn>}
        />
      )}

      {over && (
        <>
          <Card className="!p-4 space-y-3">
            <div>
              <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">თავისუფალი ბადე</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">ახალი მინიშნებები, ახალი სიტყვები — რამდენჯერაც გინდა. ხვალ ახალი დღის ბადეა.</p>
            </div>
            <Btn icon={<Shuffle />} onClick={startFree} full>დაწყება</Btn>
          </Card>
          <Card className="!p-4">
            <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat value={stats.played} label="ნათამაშები დღე" />
              <Stat value={stats.won} label="მოგებული" tone="green" />
              <Stat value={stats.streak} label="სერია" tone="wine" />
              <Stat value={stats.best} label="საუკეთესო სერია" />
            </div>
          </Card>
        </>
      )}

      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">
        მინიშნებები „ოთხეულის“ ჯგუფებია — Claude-მა შეარჩია სკოლისთვის, მასწავლებელს ჯერ არ შეუმოწმებია.
      </p>
      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};
