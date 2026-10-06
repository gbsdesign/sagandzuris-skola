import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, ChevronDown, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { SAMOSI_ASPECT, SAMOSI_FIGURE, SAMOSI_PARTS, SamosiPart, samosiLayer, samosiThumb } from '../../data/samosiData';
import { SamosiArt } from './SamosiArt';

const KNOWN = new Set(SAMOSI_PARTS.map(p => p.id));
const PHOTO_PARTS = SAMOSI_PARTS.filter(p => !p.art);
const TOTAL = SAMOSI_PARTS.length;
const COLORS = ['#7a2028', '#c8962e', '#f3e3c6', '#1e2f5a'];
// slots beside the figure for the drawn parts: the cap up by the collar, the boots down by the hem
const SLOT_PLACE: Record<string, string> = { papanaki: '-right-[72px] top-[2%]', aziurebi: '-left-[72px] bottom-[12%]' };

const fireworks = (finale: boolean) => {
  const shots = finale ? 7 : 3;
  for (let i = 0; i < shots; i++) {
    setTimeout(() => {
      confetti({
        particleCount: finale ? 80 : 55,
        spread: 360,
        startVelocity: finale ? 32 : 26,
        ticks: finale ? 95 : 70,
        gravity: 0.85,
        scalar: finale ? 1 : 0.85,
        colors: COLORS,
        shapes: finale && i % 2 ? ['star'] : ['circle', 'square'],
        origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.3 },
        zIndex: 200,
        disableForReducedMotion: true,
      });
    }, i * (finale ? 260 : 220));
  }
};

// "ჩემი სამოსი": the student ticks off the parts of their chokha and watches it come together —
// a pale mannequin at first, each ticked part dropping into place in colour. Saved in students/{uid}.samosi.
// `unfolded`: always open, without the fold arrow (the path page's own "სამოსი" tab).
export const ChemiSamosi: React.FC<{ unfolded?: boolean }> = ({ unfolded }) => {
  const { user } = useAuth();
  const [folded, setOpen] = useState(false);
  const open = unfolded || folded;
  const [owned, setOwned] = useState<string[]>([]);
  // how many times each part has been ticked in this visit: a new value replays its drop animation
  const [drops, setDrops] = useState<Record<string, number>>({});
  const [cheer, setCheer] = useState<{ n: number; finale: boolean } | null>(null);
  const [shine, setShine] = useState(0);
  // the part just added: its one-sentence story shows under the figure until the next one
  const [story, setStory] = useState<SamosiPart | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), snap => {
      const v = snap.data()?.samosi;
      if (Array.isArray(v)) setOwned(v.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)));
    });
  }, [user]);

  useEffect(() => {
    if (!cheer) return;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);

  const has = (id: string) => owned.includes(id);
  const done = owned.length;
  const complete = done === TOTAL;

  const toggleOpen = () => {
    triggerHaptic(10);
    if (!open && complete) setShine(s => s + 1);
    setOpen(o => !o);
  };

  const toggle = (part: SamosiPart) => {
    const adding = !has(part.id);
    const next = adding ? [...owned, part.id] : owned.filter(id => id !== part.id);
    setOwned(next);
    triggerHaptic(adding ? 25 : 10);
    setStory(adding ? part : s => (s?.id === part.id ? null : s));
    if (adding) {
      const finale = next.length === TOTAL;
      setDrops(d => ({ ...d, [part.id]: (d[part.id] || 0) + 1 }));
      setCheer({ n: Date.now(), finale });
      fireworks(finale);
      if (finale) setShine(s => s + 1);
    }
    if (user) {
      setDoc(doc(db, 'students', user.uid), { samosi: next }, { mergeFields: ['samosi'] }).catch(err =>
        console.warn('Firestore samosi note:', err)
      );
    }
  };

  return (
    // same card look as the other tiles of "საგანძურის გზა" (PATH_TILE), without the hover lift
    <section className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] overflow-hidden">
      <Header
        unfolded={unfolded}
        onClick={toggleOpen}
        className="w-full flex items-center gap-3 p-3 sm:px-4 text-left cursor-pointer select-none hover:bg-[#fbf6ec]/60 transition-colors"
        aria-expanded={open}
      >
        <ProgressRing value={done / TOTAL} complete={complete} />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] sm:text-base font-black text-[#2a2017] leading-tight">ჩემი სამოსი</span>
          <span className={`block mt-0.5 text-xs font-semibold ${complete ? 'text-emerald-700' : 'text-[#8a7a6a]'}`}>
            {complete ? 'ჩოხა სრულადაა აწყობილი' : `${done} / ${TOTAL} შეგროვებულია`}
          </span>
        </span>
        {!unfolded && (
          <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all ${open ? 'rotate-180 bg-[#7a2028]/10 text-[#7a2028]' : 'bg-[#fbf6ec] text-[#8a7a6a]'}`}>
            <ChevronDown className="w-4 h-4" />
          </span>
        )}
      </Header>

      {open && (
        <div className="px-4 pb-4 space-y-5 animate-in fade-in duration-300">
          {/* the chokha coming together */}
          <div className="relative pt-3 pb-1 rounded-2xl bg-[radial-gradient(ellipse_at_50%_45%,#ffffff_42%,#f6efe3_100%)]">
            <div className="relative mx-auto" style={{ width: 'clamp(150px, calc(100% - 150px), 240px)' }}>
              <div
                className="relative"
                style={{
                  aspectRatio: `${SAMOSI_ASPECT}`,
                  WebkitMaskImage: 'linear-gradient(#000 84%, transparent)',
                  maskImage: 'linear-gradient(#000 84%, transparent)',
                }}
              >
                <img src={SAMOSI_FIGURE} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full grayscale contrast-90 opacity-20" />
                {PHOTO_PARTS.map(p => {
                  const on = has(p.id);
                  return (
                    <img
                      key={`${p.id}-${drops[p.id] || 0}`}
                      src={samosiLayer(p.id)}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${on && drops[p.id] ? 'samosi-drop' : ''}`}
                      style={{ opacity: on ? 1 : 0 }}
                    />
                  );
                })}
                {complete && (
                  <div
                    key={shine}
                    aria-hidden
                    className="absolute inset-0 pointer-events-none samosi-shine"
                    style={{ WebkitMaskImage: `url(${SAMOSI_FIGURE})`, WebkitMaskSize: '100% 100%', maskImage: `url(${SAMOSI_FIGURE})`, maskSize: '100% 100%' }}
                  />
                )}
              </div>

              {SAMOSI_PARTS.filter(p => p.art).map(p => (
                <Slot key={p.id} part={p} on={has(p.id)} pop={drops[p.id] || 0} className={SLOT_PLACE[p.id]} />
              ))}
            </div>

            {/* the greeting sits over the fading hem, so the part dropping into place stays visible */}
            {cheer && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none z-10" role="status" aria-live="polite">
                <div key={cheer.n} className="samosi-cheer px-6 py-3.5 rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-[#eadfcb] shadow-[0_14px_36px_-14px_rgba(74,52,38,0.5)] text-center">
                  {cheer.finale && <p className="text-[11px] font-black tracking-wide text-emerald-700">ჩოხა სრულადაა!</p>}
                  <p className="font-serif-ge text-2xl font-bold text-[#7a2028] leading-tight">გილოცავ!</p>
                  <p className="text-sm font-bold text-[#4a3426]">ღმერთს ებარებოდე!</p>
                </div>
              </div>
            )}
          </div>

          {/* the story of the part just added */}
          {story && (
            <div key={story.id} className="flex items-start gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#eadfcb] pl-2.5 pr-1.5 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300" aria-live="polite">
              <span className="w-10 h-10 shrink-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center">
                {story.art ? (
                  <SamosiArt kind={story.art} className="w-8 h-8" />
                ) : (
                  <img src={samosiThumb(story.id)} alt="" aria-hidden draggable={false} className="w-9 h-9" />
                )}
              </span>
              <p className="flex-1 min-w-0 pt-0.5 text-[13px] leading-relaxed text-[#4a3426]">
                <span className="font-bold text-[#7a2028]">{story.label}. </span>
                {story.story}
              </p>
              <button
                type="button"
                onClick={() => setStory(null)}
                aria-label="დახურვა"
                className="w-9 h-9 shrink-0 -my-1 rounded-full flex items-center justify-center text-[#a99a88] hover:text-[#7a2028] hover:bg-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* progress: one slim bar with hairline marks between the parts, the count beside it */}
          <div className="flex items-center gap-3" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={done} aria-label="შეგროვებული ნაწილები">
            <div className="relative flex-1 h-1.5 rounded-full bg-[#f1e8da] overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out ${
                  complete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-[#b04450] to-[#7a2028]'
                }`}
                style={{ width: `${(done / TOTAL) * 100}%` }}
              />
              {SAMOSI_PARTS.slice(1).map((p, i) => (
                <span key={p.id} className="absolute inset-y-0 w-0.5 -ml-px bg-white" style={{ left: `${((i + 1) / TOTAL) * 100}%` }} />
              ))}
            </div>
            {complete ? (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                <Check className="w-3 h-3 stroke-[3.5]" />
                სრულია
              </span>
            ) : (
              <span className="text-xs font-black text-[#7a2028] tabular-nums">
                {done}<span className="text-[#b3a593]">/{TOTAL}</span>
              </span>
            )}
          </div>

          {/* the parts: compact tiles, picture first; a ticked tile turns wine-tinted with a check on its picture */}
          <div className="grid grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-4 gap-2">
            {SAMOSI_PARTS.map(p => {
              const on = has(p.id);
              const pic = `transition-[filter,opacity] duration-300 ${on ? '' : 'grayscale opacity-50 group-hover:opacity-75'}`;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p)}
                  aria-pressed={on}
                  className={`group flex items-center gap-2.5 h-12 pl-1.5 pr-2 rounded-xl text-left ring-1 ring-inset transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                    on ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/35' : 'bg-[#f8f5ef] ring-transparent hover:bg-[#f2ece2]'
                  }`}
                >
                  <span className="relative w-9 h-9 shrink-0 rounded-lg bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center">
                    {p.art ? (
                      <SamosiArt kind={p.art} className={`w-7 h-7 ${pic}`} />
                    ) : (
                      <img src={samosiThumb(p.id)} alt="" aria-hidden draggable={false} className={`w-8 h-8 ${pic}`} />
                    )}
                    <span
                      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white transition-all duration-200 ${
                        on ? 'bg-[#7a2028] text-white scale-100' : 'bg-white text-transparent scale-0'
                      }`}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[4]" />
                    </span>
                  </span>
                  <span className={`flex-1 min-w-0 truncate text-[13px] font-bold ${on ? 'text-[#2a2017]' : 'text-[#7d6e5f]'}`}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

// The card's title row: a fold button, or a plain row when the card is always open
const Header: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { unfolded?: boolean }> = ({ unfolded, children, ...button }) =>
  unfolded ? (
    <div className="w-full flex items-center gap-3 p-3 sm:px-4">{children}</div>
  ) : (
    <button type="button" {...button}>{children}</button>
  );

// Thumbnail of the chokha inside a ring that fills as parts are collected
const ProgressRing: React.FC<{ value: number; complete: boolean }> = ({ value, complete }) => {
  const r = 23;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative w-[52px] h-[52px] shrink-0">
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="26" cy="26" r={r} fill="none" stroke="#efe5d4" strokeWidth="3" />
        <circle
          cx="26"
          cy="26"
          r={r}
          fill="none"
          stroke={complete ? '#059669' : '#7a2028'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center overflow-hidden">
        <img src={samosiThumb('chokha')} alt="" aria-hidden draggable={false} className="w-[34px] h-[34px]" />
      </span>
    </span>
  );
};

// Round slot beside the figure for a drawn part (cap, boots): dashed and pale until collected
const Slot: React.FC<{ part: SamosiPart; on: boolean; pop: number; className?: string }> = ({ part, on, pop, className }) => (
  <div className={`absolute flex flex-col items-center gap-1 ${className || ''}`}>
    <span
      key={on ? pop : 'off'}
      className={`relative w-14 h-14 rounded-full bg-white flex items-center justify-center transition-[border-color,box-shadow] duration-300 ${
        on ? 'border-2 border-[#7a2028] shadow-[0_6px_16px_-6px_rgba(122,32,40,0.5)] samosi-pop' : 'border-2 border-dashed border-[#d8c9b0]'
      }`}
    >
      {part.art && <SamosiArt kind={part.art} className={`w-10 h-10 transition-[filter,opacity] duration-300 ${on ? '' : 'grayscale opacity-35'}`} />}
      {on && (
        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#7a2028] text-white flex items-center justify-center ring-2 ring-white">
          <Check className="w-3 h-3 stroke-[3.5]" />
        </span>
      )}
    </span>
    <span className={`text-[11px] font-bold ${on ? 'text-[#7a2028]' : 'text-[#a99a88]'}`}>{part.label}</span>
  </div>
);
