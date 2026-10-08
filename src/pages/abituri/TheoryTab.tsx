import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronRight, Dumbbell, FileText } from 'lucide-react';
import { OFFICIAL_PDFS, THEORY_TOPICS } from '../../data/abituriProgram';
import type { Lesson } from '../../data/abituriLessons';
import { useAbituriProgress } from '../../hooks/useAbituriProgress';
import type { TaskKind } from '../../utils/theoryDrills';
import { triggerHaptic } from '../../utils/haptics';
import { LessonBody } from './LessonBody';
import { CARD, Pill, SectionHead } from './shared';
import { DRILLS, Trainer } from './drills/Trainer';
import { MockTest } from './drills/MockTest';

// II round — music theory, written: the test „მუსიკალური ანბანი“ (seven tasks) and the dictation.
// Practice (new tasks every time) and a mock test, then the lessons (data/abituriLessons.ts, loaded when the tab
// opens). Progress — lessons done, practice counts, test scores — stays on the member's account.

let cache: Lesson[] | null = null;
const useLessons = () => {
  const [lessons, setLessons] = useState<Lesson[] | null>(cache);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (cache) return;
    let gone = false;
    import('../../data/abituriLessons')
      .then(m => { cache = m.LESSONS; if (!gone) setLessons(m.LESSONS); })
      .catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, []);
  return { lessons, failed };
};

// a lesson's own practice: the test's task, or listening for the dictation
const drillOf = (l: Lesson): TaskKind | null => (l.task ? DRILLS[l.task - 1].kind : l.id === 'karnaxi' ? 'dictation' : null);

export const TheoryTab: React.FC = () => {
  const { lessons, failed } = useLessons();
  const progress = useAbituriProgress();
  const done = progress.progress.lessons;
  const [open, setOpen] = useState<string | null>(null);
  const [drill, setDrill] = useState<TaskKind | null>(null);
  const [jump, setJump] = useState<string | null>(null);

  // what was opened from elsewhere on the tab (a task, „შემდეგი“, „ივარჯიშე“) comes into view
  useEffect(() => {
    if (!jump) return;
    document.getElementById(jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setJump(null);
  }, [jump]);

  const show = (id: string) => { triggerHaptic(10); setOpen(id); setJump(`lesson-${id}`); };
  const practise = (k: TaskKind) => { triggerHaptic(10); setDrill(k); setJump('trainer'); };
  const byTask = (task: number) => lessons?.find(l => l.task === task);

  return (
    <div className="space-y-7">
      <section>
        <SectionHead title="მუსიკის თეორია" sub="II ტური · წერითი გამოცდა" />
        <div className={`${CARD} p-3.5 sm:p-4`}>
          <p className="px-1 text-[14px] leading-relaxed text-[#4a3426]">
            ტესტი — <b className="text-[#2a2017]">„მუსიკალური ანბანი“</b> — შვიდი დავალებისგან შედგება. თითოეულს თავისი გაკვეთილი აქვს:
          </p>
          <ol className="mt-2.5 grid sm:grid-cols-2 gap-x-3 gap-y-1">
            {THEORY_TOPICS.map((t, i) => {
              const lesson = byTask(i + 1);
              return (
                <li key={t}>
                  <button
                    type="button"
                    disabled={!lesson}
                    onClick={() => lesson && show(lesson.id)}
                    className="w-full flex items-center gap-2.5 min-h-11 px-1.5 py-1.5 rounded-xl text-left cursor-pointer hover:bg-[#fbf6ec] disabled:cursor-default group"
                  >
                    <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] text-[12.5px] font-bold">{i + 1}</span>
                    <span className="flex-1 min-w-0 text-[14px] font-semibold leading-snug text-[#2a2017] group-hover:text-[#7a2028]">{t}</span>
                    {lesson && <ChevronRight className="w-4 h-4 shrink-0 text-[#b8a68e] group-hover:text-[#7a2028]" />}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 pt-3 px-1 border-t border-[#efe5d4] text-[13px] leading-relaxed text-[#6b5c4d]">
            ტურის მეორე ნაწილია <b className="text-[#4a3426]">კარნახი</b> (ნიმუშში — ოთხტაქტიანი, სამხმიანი), მესამე —
            <b className="text-[#4a3426]"> კოლოკვიუმი</b>, მას ცალკე ჩანართი აქვს.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill href={OFFICIAL_PDFS.theoryTest} icon={<FileText className="w-4 h-4" />}>ტესტის ნიმუში</Pill>
            <Pill href={OFFICIAL_PDFS.dictation} icon={<FileText className="w-4 h-4" />}>კარნახის ნიმუში</Pill>
          </div>
        </div>
      </section>

      <section id="trainer" className="scroll-mt-24">
        <SectionHead
          title="ვარჯიში"
          sub={progress.onAccount ? 'ყოველ ჯერზე ახალი დავალება · ინახება შენს ანგარიშზე' : 'ყოველ ჯერზე ახალი დავალება'}
        />
        <div className="space-y-3">
          <Trainer progress={progress} kind={drill} setKind={setDrill} />
          <MockTest progress={progress} />
        </div>
      </section>

      <section>
        <SectionHead
          title="გაკვეთილები"
          sub={lessons && done.length ? `გავლილია ${lessons.filter(l => done.includes(l.id)).length} / ${lessons.length}` : 'საფუძვლებიდან — ტესტამდე და კარნახამდე'}
        />
        {failed && <p className="px-1 text-sm text-[#8a7a6a]">გაკვეთილები ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>}
        {!lessons && !failed && <div className={`${CARD} h-24 animate-pulse`} />}
        {lessons && (
          <ol className="space-y-2.5">
            {lessons.map((l, i) => {
              const isOpen = open === l.id;
              const isDone = done.includes(l.id);
              const next = lessons[i + 1];
              const kind = drillOf(l);
              return (
                <li key={l.id} id={`lesson-${l.id}`} className={`${CARD} overflow-hidden scroll-mt-24`}>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(10); setOpen(isOpen ? null : l.id); }}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 min-h-16 px-3.5 sm:px-4 py-2.5 text-left cursor-pointer group"
                  >
                    <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-full font-serif-ge text-[15px] font-bold ${isDone ? 'bg-[#2f6b43] text-white' : 'bg-[#7a2028]/[0.07] text-[#7a2028]'}`}>
                      {isDone ? <Check className="w-5 h-5" aria-label="გავლილია" /> : i + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-serif-ge text-[16px] font-bold leading-snug text-[#2a2017] group-hover:text-[#7a2028]">{l.title}</span>
                      <span className="block mt-0.5 text-[12.5px] font-semibold leading-snug text-[#8a7a6a]">
                        {l.task && <span className="text-[#a0703c]">ტესტი №{l.task} · </span>}
                        {l.sub}
                      </span>
                    </span>
                    <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#efe5d4] px-4 sm:px-6 pt-5 pb-5">
                      <LessonBody blocks={l.blocks} />
                      <div className="mt-7 pt-4 border-t border-[#efe5d4] flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(12); progress.toggleLesson(l.id); }}
                          aria-pressed={isDone}
                          className={`inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full text-[13.5px] font-bold cursor-pointer ring-1 ${
                            isDone ? 'bg-[#2f6b43] text-white ring-[#2f6b43]' : 'bg-[#edf6ef] text-[#24563a] ring-[#7fb893] hover:bg-[#e2f0e5]'
                          }`}
                        >
                          <Check className="w-4 h-4" /> {isDone ? 'გავლილია' : 'გავიარე'}
                        </button>
                        {kind && (
                          <button
                            type="button"
                            onClick={() => practise(kind)}
                            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer"
                          >
                            <Dumbbell className="w-4 h-4" /> ივარჯიშე ამ თემაზე
                          </button>
                        )}
                        {next && (
                          <button
                            type="button"
                            onClick={() => show(next.id)}
                            className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13.5px] font-bold hover:bg-[#5e1820] cursor-pointer shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]"
                          >
                            შემდეგი: {next.title} <ArrowRight className="w-4 h-4 shrink-0" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { triggerHaptic(10); setOpen(null); setJump(`lesson-${l.id}`); }}
                          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426] hover:text-[#7a2028] cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" /> დახურვა
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
};
