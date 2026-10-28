import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, ChevronLeft, Clock, BookOpen, TriangleAlert, ExternalLink, PartyPopper, GraduationCap, Library } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { Bar, Empty, Tabs } from '../components/ui/kit';
import { WignebiView } from './medavitneoba/Wignebi';
import { LESSONS, LESSON_SOURCES, lessonById, type Lesson } from '../data/medavitneLessons';
import { useMedavitneProgress } from '../hooks/useMedavitneProgress';
import { StepView } from './medavitneoba/parts';
import { triggerHaptic } from '../utils/haptics';

// „მედავითნეობა“: a step-by-step course for the church reader (lessons in data/medavitneLessons.ts).
// The open lesson is `mapItem` (its id), so the top bar's „←“ and the phone's back first return to the list.
// Two tabs on top: „გაკვეთილები“ (the course) and „წიგნები“ (the liturgical books, `mapItem` „w…“ — see
// medavitneoba/Wignebi.tsx). The books show only to admins until the monastery's permission is in hand.

const CARD = 'rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)]';

const Overview: React.FC<{ done: string[]; open: (id: string) => void; onAccount: boolean }> = ({ done, open, onAccount }) => {
  const next = LESSONS.find(l => !done.includes(l.id));
  const count = LESSONS.filter(l => done.includes(l.id)).length;
  return (
    <div className="w-full max-w-2xl mx-auto mb-6 px-1">
      <header className="text-center px-2 mb-5">
        <p className="text-[12px] font-black uppercase tracking-[0.14em] text-[#a0703c]">სასწავლო კურსი · 8 გაკვეთილი</p>
        <h2 className="mt-1.5 font-serif-ge text-[22px] sm:text-[26px] font-bold leading-tight text-[#2a2017] text-balance">
          მედავითნეობა ნაბიჯ-ნაბიჯ
        </h2>
        <p className="mt-2 mx-auto max-w-md text-[15px] leading-relaxed text-[#6b5c4d] text-pretty">
          სასტარტო ლოცვებიდან ტიპიკონამდე: ისწავლე, წაიკითხე ხმამაღლა, ჩაიწერე და მოისმინე საკუთარი კითხვა.
        </p>
      </header>

      {/* progress and the way on */}
      <section className={`${CARD} p-4 sm:p-5 mb-4`}>
        <div className="flex items-baseline justify-between gap-3 mb-2.5">
          <p className="text-[15px] font-bold text-[#2a2017]">ნასწავლი</p>
          <p className="text-[14px] font-bold tabular-nums text-[#7a2028]">{count} / {LESSONS.length}</p>
        </div>
        <Bar value={count} max={LESSONS.length} tone={count === LESSONS.length ? 'green' : 'wine'} />
        {next ? (
          <button type="button" onClick={() => open(next.id)}
            className="mt-4 w-full min-h-14 px-4 py-2.5 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-black uppercase tracking-wide text-[#fbf6ec]/75">{count ? 'გააგრძელე' : 'დაიწყე'} · გაკვეთილი {LESSONS.indexOf(next) + 1}</span>
              <span className="block text-[16px] font-bold leading-snug">{next.title}</span>
            </span>
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        ) : (
          <p className="mt-3 text-[15px] font-bold text-emerald-700">ყველა გაკვეთილი ნასწავლია — ახლა კლიროსზე!</p>
        )}
        {!onAccount && <p className="mt-3 text-[13px] leading-snug text-[#8a7a6a]">ნასწავლი ამ მოწყობილობაზე ინახება.</p>}
      </section>

      <div role="note" className="flex items-start gap-3 rounded-2xl bg-[#fdf4e3] ring-1 ring-[#e9c98f] px-4 py-3 mb-5 text-left">
        <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-[#b7791f]" />
        <p className="text-[14px] leading-relaxed text-[#4a3826] text-pretty">
          ტაძრებში წესი ცოტათი განსხვავდება. რასაც აქ ისწავლი, გადაამოწმე შენს მოძღვართან ან რეგენტთან.
        </p>
      </div>

      {/* the lessons as a path: number, title, time; the done ones ticked, the next one marked */}
      <ol className="relative">
        {LESSONS.map((l, i) => {
          const isDone = done.includes(l.id);
          const isNext = next?.id === l.id;
          return (
            <li key={l.id} className="relative pl-14 pb-3 last:pb-0">
              {i < LESSONS.length - 1 && <span className={`absolute left-[21px] top-12 bottom-0 w-0.5 ${isDone ? 'bg-emerald-300' : 'bg-[#e8dcc8]'}`} aria-hidden />}
              <span className={`absolute left-0 top-2 w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-black ${
                isDone ? 'bg-emerald-600 text-white'
                  : isNext ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_0_0_5px_rgba(122,32,40,0.12)]'
                  : 'bg-white ring-1 ring-[#e8dcc8] text-[#8a7a6a]'
              }`}>
                {isDone ? <Check className="w-5 h-5" /> : i + 1}
              </span>
              <button type="button" onClick={() => open(l.id)}
                className={`${CARD} w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left cursor-pointer transition hover:ring-[#7a2028]/25 active:scale-[0.99] ${isNext ? 'ring-[#7a2028]/30' : ''}`}>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-bold leading-snug text-[#2a2017]">{l.title}</span>
                  <span className="block mt-0.5 text-[14px] leading-snug text-[#8a7a6a]">{l.sub}</span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold text-[#a0703c]">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{l.minutes} წთ</span>
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{l.steps.length} ნაბიჯი</span>
                  </span>
                </span>
                <ChevronRight className="w-5 h-5 shrink-0 text-[#c4b39c]" />
              </button>
            </li>
          );
        })}
      </ol>

      <details className="mt-6 rounded-2xl bg-white/70 ring-1 ring-[#e8dcc8] px-4 py-3 group">
        <summary className="cursor-pointer list-none flex items-center justify-between min-h-9 text-[14px] font-bold text-[#4a3426]">
          წყაროები
          <ChevronRight className="w-4 h-4 text-[#8a7a6a] transition-transform group-open:rotate-90" />
        </summary>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8a7a6a]">ლოცვების და ფსალმუნების ტექსტები აპის ლოცვანიდან და დავითნიდანაა.</p>
        <ul className="mt-2 space-y-1.5">
          {LESSON_SOURCES.map(s => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7a2028] underline underline-offset-2 decoration-[#7a2028]/30">
                {s.title}<ExternalLink className="w-3.5 h-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

const LessonView: React.FC<{ lesson: Lesson; learned: boolean; setLearned: (on: boolean) => void; openNext: (() => void) | null; back: () => void }> = ({
  lesson, learned, setLearned, openNext, back,
}) => {
  const { navigateTo } = useNavigation();
  const [at, setAt] = useState(0);
  const top = useRef<HTMLDivElement>(null);
  const total = lesson.steps.length;
  const finished = at >= total;
  const n = LESSONS.indexOf(lesson) + 1;

  useEffect(() => { setAt(0); }, [lesson.id]);
  const go = (i: number) => {
    triggerHaptic(10);
    setAt(i);
    // the step's top, under the page bar
    const y = (top.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 12;
    if (window.scrollY > y) window.scrollTo({ top: y });
  };

  return (
    <div ref={top} className="w-full max-w-2xl mx-auto mb-6 px-1 scroll-mt-4">
      <header className="px-1 mb-4">
        <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#a0703c]">გაკვეთილი {n} · {lesson.minutes} წთ</p>
        <h2 className="mt-1 font-serif-ge text-[22px] font-bold leading-tight text-[#2a2017] text-balance">{lesson.title}</h2>
      </header>

      {/* one segment per step, the last one for the end */}
      <div className="flex gap-1 mb-4 px-1" aria-label={`ნაბიჯი ${Math.min(at + 1, total)} / ${total}`}>
        {lesson.steps.map((_, i) => (
          <button key={i} type="button" onClick={() => go(i)} aria-label={`ნაბიჯი ${i + 1}`}
            className="flex-1 h-6 flex items-center cursor-pointer group">
            <span className={`block w-full h-1.5 rounded-full transition-colors ${i < at ? 'bg-[#7a2028]' : i === at ? 'bg-[#7a2028]/60' : 'bg-[#e8dcc8] group-hover:bg-[#d9c9ad]'}`} />
          </button>
        ))}
      </div>

      <section className={`${CARD} p-4 sm:p-6`}>
        {finished ? (
          <div className="text-center py-3">
            <span className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><PartyPopper className="w-8 h-8" /></span>
            <h3 className="mt-3 font-serif-ge text-[20px] font-bold text-[#2a2017]">გაკვეთილი გავლილია</h3>
            <p className="mt-1.5 mx-auto max-w-sm text-[15px] leading-relaxed text-[#6b5c4d] text-pretty">
              როცა დავალებას შეასრულებ და თავს დარწმუნებულად იგრძნობ, მონიშნე ნასწავლად.
            </p>
            <button type="button" onClick={() => { triggerHaptic(15); setLearned(!learned); }} aria-pressed={learned}
              className={`mt-5 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-bold cursor-pointer transition active:scale-[0.97] ${
                learned ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white ring-2 ring-emerald-600 text-emerald-700 hover:bg-emerald-50'
              }`}>
              <Check className="w-5 h-5" />{learned ? 'ნასწავლია' : 'ვისწავლე'}
            </button>
          </div>
        ) : (
          <StepView key={`${lesson.id}-${at}`} step={lesson.steps[at]} onPsalter={() => navigateTo('psalter')} />
        )}
      </section>

      {/* the way through the steps: roomy, wraps on a narrow phone */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 px-1">
        <button type="button" onClick={() => (at ? go(at - 1) : back())}
          className="inline-flex items-center gap-1.5 h-12 pl-3.5 pr-5 rounded-full bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426] text-[15px] font-bold cursor-pointer transition active:scale-[0.97]">
          <ChevronLeft className="w-5 h-5" />{at ? 'წინა' : 'სია'}
        </button>
        {!finished ? (
          <button type="button" onClick={() => go(at + 1)}
            className="inline-flex items-center gap-1.5 h-12 pl-6 pr-4 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[15px] font-bold cursor-pointer transition active:scale-[0.97] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            {at === total - 1 ? 'დასრულება' : 'შემდეგი'}<ChevronRight className="w-5 h-5" />
          </button>
        ) : openNext ? (
          <button type="button" onClick={openNext}
            className="inline-flex items-center gap-1.5 h-12 pl-6 pr-4 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[15px] font-bold cursor-pointer transition active:scale-[0.97] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            შემდეგი გაკვეთილი<ChevronRight className="w-5 h-5" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

type Tab = 'lessons' | 'books';
const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'lessons', label: 'გაკვეთილები', Icon: GraduationCap },
  { id: 'books', label: 'წიგნები', Icon: Library },
];

const TopTabs: React.FC<{ value: Tab }> = ({ value }) => {
  const { openMapItem } = useNavigation();
  // switching tabs replaces the place, so the phone's back leaves the page from either tab
  return (
    <div className="w-full max-w-2xl mx-auto mb-5 px-1">
      <Tabs cols={2} items={TABS} value={value} onChange={id => id !== value && openMapItem(id === 'books' ? 'w' : '', true)} />
    </div>
  );
};

export const MedavitneobaPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  const { isAdmin } = useAuth();
  const { done, setLearned, onAccount } = useMedavitneProgress();

  // the books: the shelves carry the tabs, a book's inside doesn't
  if (mapItem === 'w' || mapItem?.startsWith('w:')) {
    if (!isAdmin) return (
      <>
        <TopTabs value="books" />
        <div className="w-full max-w-2xl mx-auto mb-6 px-1">
          <Empty icon={<Library />} title="წიგნები მალე დაემატება" text="ბიბლია, ჟამნი, პარაკლიტონი, დავითნი და სხვა საღვთისმსახურო წიგნები აქ იქნება." />
        </div>
      </>
    );
    return (
      <>
        {mapItem === 'w' && <TopTabs value="books" />}
        <WignebiView item={mapItem} />
      </>
    );
  }

  const lesson = mapItem ? lessonById(mapItem) : undefined;
  if (!lesson) return (
    <>
      <TopTabs value="lessons" />
      <Overview done={done} open={id => openMapItem(id)} onAccount={onAccount} />
    </>
  );
  const i = LESSONS.indexOf(lesson);
  const next = LESSONS[i + 1];
  return (
    <LessonView
      lesson={lesson}
      learned={done.includes(lesson.id)}
      setLearned={on => setLearned(lesson.id, on)}
      openNext={next ? () => openMapItem(next.id, true) : null}
      back={handleGoBack}
    />
  );
};
