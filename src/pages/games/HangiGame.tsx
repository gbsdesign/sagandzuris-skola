import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Flame, Headphones, Pause, Play, Share2, SkipForward, Volume2 } from 'lucide-react';
import { useMembership } from '../../utils/memberAccess';
import { useHangi } from '../../hooks/useHangi';
import { hangiPool, hangiTitles } from '../../data/hangiPool';
import {
  MAX_TRIES, SNIPPETS, afterGuess, dayNumber, emptyDay, hangiStats, pickOfDay, sameTitle, shareText, suggestTitles, tbilisiToday, unlockedSeconds,
  type HangiDay,
} from '../../utils/hangi';
import { Btn, Card, Empty, FIELD, Stat } from '../../components/ui/kit';
import { Toast } from '../../components/ui/Toast';
import { triggerHaptic } from '../../utils/haptics';
import { MONTHS_GE } from '../../utils/dateNames';

// „დღის ჰანგი“ (games hub, 2026-10-28): one recording a day for the whole school. The player hears its first second, names
// the chant or song from the pool's titles, and every try opens a little more (1 · 2 · 4 · 7 · 11 · 16 s, six tries). The
// day, the pick and the record are utils/hangi.ts; the pool data/hangiPool.ts; the saved days hooks/useHangi.ts. Nothing
// sounds before the play button is tapped.

const LAST = SNIPPETS[SNIPPETS.length - 1];

const dateLabel = (iso: string) => `${+iso.slice(8, 10)} ${MONTHS_GE[+iso.slice(5, 7) - 1]}`;

const HangiGame: React.FC = () => {
  const { can } = useMembership();
  const recordings = can('recordings');
  const { days, loaded, save, member } = useHangi();
  const [today, setToday] = useState(tbilisiToday);
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  // the day turns at midnight in Georgia, even with the page open
  useEffect(() => {
    const t = setInterval(() => setToday(tbilisiToday()), 60_000);
    return () => clearInterval(t);
  }, []);
  // the recordings a member may hear decide the pool (App.tsx sets the hidden flag from the same membership before this renders)
  const pool = useMemo(() => hangiPool(), [recordings, loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const titles = useMemo(() => hangiTitles(pool), [pool]);
  const pick = useMemo(() => pickOfDay(pool, today), [pool, today]);

  const saved = days[today];
  const day: HangiDay = pick && saved && saved.id === pick.id ? saved : emptyDay(pick?.id ?? '');
  const limit = unlockedSeconds(day);
  const next = day.done ? null : SNIPPETS[Math.min(day.guesses.length + 1, MAX_TRIES - 1)];
  const stats = useMemo(() => hangiStats(days, today), [days, today]);
  const n = dayNumber(today);

  const stop = () => { audio.current?.pause(); setPlaying(false); };

  // The element is made as soon as the day's pick is known, so the first tap plays at once; nothing sounds before that tap.
  // The Worker answers only requests that carry the site's Origin, which a plain media request does not send — so the
  // element asks with CORS (crossOrigin), exactly as ChantPlayer does.
  useEffect(() => {
    if (!pick) return;
    const a = new Audio();
    a.crossOrigin = 'anonymous';
    a.preload = 'auto';
    a.src = pick.url;
    a.addEventListener('ended', () => setPlaying(false));
    a.addEventListener('error', () => { setPlaying(false); setFailed(true); });
    audio.current = a;
    setFailed(false);
    setPos(0);
    return () => { a.pause(); a.removeAttribute('src'); a.load(); audio.current = null; setPlaying(false); };
  }, [pick]);

  const play = async () => {
    const a = audio.current;
    if (!pick || !a) return;
    triggerHaptic(10);
    if (playing) { stop(); return; }
    if (failed) { setFailed(false); a.load(); }
    a.currentTime = 0;
    setPos(0);
    try { await a.play(); setPlaying(true); } catch { setPlaying(false); setToast('ჩანაწერი ვერ ჩაირთო — შეამოწმე ინტერნეტი და სცადე კიდევ'); }
  };

  // the snippet stops where the ladder says; the position moves the bar
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audio.current;
      if (!a) return;
      const t = a.currentTime;
      const r = Math.round(t * 20) / 20;
      setPos(p => (p === r ? p : r));
      if (a.ended || (limit !== Infinity && t >= limit)) { a.pause(); setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, limit]);

  const suggestions = useMemo(() => suggestTitles(titles, text), [titles, text]);
  const exact = useMemo(() => titles.find(t => sameTitle(t, text)), [titles, text]);

  const submit = (title: string) => {
    if (!pick || day.done) return;
    triggerHaptic(20);
    stop();
    setText('');
    save(today, afterGuess(day, title, pick.title));
  };

  const share = async () => {
    const msg = shareText(n, day);
    triggerHaptic(10);
    try {
      if (navigator.share) { await navigator.share({ text: msg }); return; }
      await navigator.clipboard.writeText(msg);
      setToast('შედეგი დაკოპირდა — ჩასვი ჩატში');
    } catch { /* the share sheet was closed */ }
  };

  if (!loaded) return <div className="w-full max-w-2xl px-1 py-6 text-center text-[13px] text-[#8a7a6a]">იტვირთება…</div>;

  if (!pool.length || !pick) {
    return (
      <div className="w-full max-w-2xl">
        <Empty
          icon={<Headphones />}
          title="ჩანაწერები ჯერ არ გაქვს ჩართული"
          text="„დღის ჰანგი“ სკოლის ჩანაწერებით თამაშდება. ჩანაწერებს სკოლის ადმინისტრატორი რთავს — მიმართე მას."
        />
      </div>
    );
  }

  const shown = Math.min(pos, LAST);

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif-ge text-[17px] font-bold leading-snug">დღის ჰანგი · №{n}</p>
            <p className="mt-0.5 text-[13px] text-[#fbf6ec]/85">{dateLabel(today)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/15 px-3 h-9 text-[13px] font-bold tabular-nums" title="სერია">
            <Flame className="w-4 h-4" /> {stats.streak}
          </div>
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          მოუსმინე ერთ წამს და გამოიცანი, რომელი საგალობელი ან სიმღერაა. ყოველი ცდა ცოტა მეტს გახსნის — სულ ექვსი ცდაა, ხვალ ახალი ჰანგი იქნება.
        </p>
      </Card>

      <Card className="!p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={play}
            aria-label={playing ? 'გაჩერება' : 'მოსმენა'}
            className="w-14 h-14 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center shadow-[0_6px_16px_-8px_rgba(122,32,40,0.8)] active:scale-95 transition cursor-pointer"
          >
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-[12.5px] text-[#75685a]">
              <span className="font-bold">{day.done ? 'მთელი ჩანაწერი' : `ისმის ${limit} წამი`}</span>
              <span className="tabular-nums">{shown.toFixed(1)} წმ</span>
            </div>
            <div className="mt-1.5 flex h-3 gap-0.5 rounded-full overflow-hidden bg-[#f1e8d9]" aria-hidden="true">
              {SNIPPETS.map((s, i) => {
                const from = i ? SNIPPETS[i - 1] : 0;
                const open = limit >= s;
                const fill = Math.max(0, Math.min(1, (shown - from) / (s - from)));
                return (
                  <div key={s} className={`relative h-full ${open ? 'bg-[#7a2028]/25' : 'bg-transparent'}`} style={{ width: `${((s - from) / LAST) * 100}%` }}>
                    {open && <div className="absolute inset-y-0 left-0 bg-[#7a2028]" style={{ width: `${fill * 100}%` }} />}
                  </div>
                );
              })}
            </div>
            <p className={`mt-1 text-[12px] ${failed ? 'text-[#c0392b]' : 'text-[#9a8b7b]'}`}>
              {failed ? 'ჩანაწერი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი და სცადე კიდევ' : next ? `შემდეგი ცდის მერე: ${next} წამი` : day.done ? 'დღის თამაში დასრულდა' : 'ბოლო ცდაა'}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-1.5 px-1" aria-label={`ცდა ${day.guesses.length} ${MAX_TRIES}-დან`}>
        {Array.from({ length: MAX_TRIES }, (_, i) => {
          const g = day.guesses[i];
          const right = day.won && i === day.guesses.length - 1;
          const cls = g === undefined ? 'bg-[#e8dcc8]' : right ? 'bg-[#2f7d4f]' : g ? 'bg-[#c0392b]' : 'bg-[#9a8b7b]';
          return <span key={i} className={`h-2.5 flex-1 rounded-full ${cls}`} />;
        })}
        <span className="ml-2 text-[12px] tabular-nums text-[#75685a]">{day.guesses.length}/{MAX_TRIES}</span>
      </div>

      {!day.done ? (
        <Card className="!p-4">
          <label htmlFor="hangi-guess" className="block mb-1.5 text-[12.5px] font-bold text-[#75685a]">რომელია?</label>
          <input
            id="hangi-guess"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="დაიწყე სათაურის წერა…"
            autoComplete="off"
            className={FIELD}
          />
          {suggestions.length > 0 && !exact && (
            <ul className="mt-2 rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
              {suggestions.map(t => (
                <li key={t}>
                  <button type="button" onClick={() => { triggerHaptic(5); setText(t); }} className="w-full text-left px-3 min-h-11 py-2 text-[14px] leading-snug text-[#4a3426] hover:bg-[#fbf6ec] cursor-pointer">
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {text.trim() && !suggestions.length && !exact && <p className="mt-2 text-[12.5px] text-[#9a8b7b]">ასეთი სათაური სიაში არ არის — სცადე სხვა სიტყვა.</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="ghost" icon={<SkipForward />} onClick={() => submit('')} className="flex-1 min-w-[140px]">გამოტოვება</Btn>
            <Btn icon={<Check />} disabled={!exact} onClick={() => exact && submit(exact)} className="flex-1 min-w-[140px]">გამოცნობა</Btn>
          </div>
          {day.guesses.length > 0 && (
            <ul className="mt-3 space-y-1 text-[13px]">
              {day.guesses.map((g, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={`w-5 text-center font-bold ${g ? 'text-[#c0392b]' : 'text-[#9a8b7b]'}`}>{g ? '✗' : '–'}</span>
                  <span className={g ? 'text-[#4a3426]' : 'text-[#9a8b7b]'}>{g || 'გამოტოვებული'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card tone="paper" className="!p-4">
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">{day.won ? `გამოიცანი ${day.guesses.length} ცდაში! 🎉` : 'დღეს ვერ გამოიცანი'}</p>
          <p className="mt-1.5 text-[15px] font-bold leading-snug text-[#7a2028]">{pick.title}</p>
          <p className="text-[12.5px] text-[#75685a]">{pick.sub}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn kind="ghost" icon={playing ? <Pause /> : <Volume2 />} onClick={play}>{playing ? 'გაჩერება' : 'მოუსმინე მთლიანად'}</Btn>
            <Btn kind="ghost" icon={<Share2 />} onClick={share}>გაზიარება</Btn>
          </div>
          <p className="mt-3 text-[12.5px] leading-snug text-[#9a8b7b]">ხვალ ახალი ჰანგი იქნება. {member ? 'შედეგი შენს ჩანაწერშია.' : 'შედეგი ამ ტელეფონზე ინახება.'}</p>
        </Card>
      )}

      <Card className="!p-4">
        <p className="font-serif-ge text-[15px] font-bold text-[#4a3426]">შენი სტატისტიკა</p>
        <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat value={stats.played} label="ნათამაშები" />
          <Stat value={stats.played ? `${Math.round((stats.won / stats.played) * 100)}%` : '–'} label="გამოცნობილი" />
          <Stat value={stats.streak} label="სერია" tone="wine" />
          <Stat value={stats.best} label="საუკეთესო" />
        </div>
        <p className="mt-3 mb-1.5 text-[12.5px] font-bold text-[#75685a]">რამდენ ცდაში</p>
        <ul className="space-y-1">
          {stats.dist.map((c, i) => {
            const max = Math.max(1, ...stats.dist);
            return (
              <li key={i} className="flex items-center gap-2 text-[12px] tabular-nums text-[#75685a]">
                <span className="w-3 text-right">{i + 1}</span>
                <span className="flex-1 h-3 rounded-full bg-[#f1e8d9] overflow-hidden"><span className="block h-full rounded-full bg-[#7a2028]/70" style={{ width: `${(c / max) * 100}%` }} /></span>
                <span className="w-5 text-right">{c}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Toast message={toast || ''} type="info" isVisible={!!toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default HangiGame;
