import React, { useEffect, useRef, useState } from 'react';
import { Check, Mic, Square, RotateCcw, X, Loader2 } from 'lucide-react';
import { PROSE, FoldedPrayer } from '../../components/views/PrayerText';
import { loadPsalmHtml } from '../../utils/hourPsalms';
import { startVoiceRecording, voiceRecordingSupported, type VoiceRecording } from '../../utils/voiceRecorder';
import { triggerHaptic } from '../../utils/haptics';
import type { LessonStep } from '../../data/medavitneLessons';

// The step views of a „მედავითნეობა“ lesson (pages/MedavitneobaPage.tsx).

/** „**bold**“ inside a lesson's line */
export const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 ? <strong key={i} className="font-bold text-[#4a3426]">{part}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    )}
  </>
);

const StepTitle: React.FC<{ eyebrow: string; title: string }> = ({ eyebrow, title }) => (
  <div className="mb-4">
    <p className="text-[12px] font-black uppercase tracking-[0.12em] text-[#a0703c]">{eyebrow}</p>
    <h3 className="mt-1 font-serif-ge text-[20px] font-bold leading-snug text-[#2a2017] text-balance">{title}</h3>
  </div>
);

const Learn: React.FC<{ step: Extract<LessonStep, { kind: 'learn' }> }> = ({ step }) => (
  <div>
    <StepTitle eyebrow="ვისწავლოთ" title={step.title} />
    <div className="space-y-3 text-[16px] leading-relaxed text-[#4a3826] text-pretty">
      {step.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}
    </div>
    {step.points && (
      <ul className="mt-4 space-y-2.5">
        {step.points.map((p, i) => (
          <li key={i} className="flex gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-4 py-3 text-[15px] leading-relaxed text-[#4a3826]">
            <span className="mt-[9px] w-2 h-2 shrink-0 rounded-full bg-[#7a2028]" aria-hidden />
            <span><Rich text={p} /></span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const Order: React.FC<{ step: Extract<LessonStep, { kind: 'order' }> }> = ({ step }) => (
  <div>
    <StepTitle eyebrow="თანმიმდევრობა" title={step.title} />
    {step.intro && <p className="-mt-1 mb-4 text-[15px] leading-relaxed text-[#6b5c4d] text-pretty">{step.intro}</p>}
    <ol className="relative">
      {step.items.map(([name, note], i) => (
        <li key={i} className="relative flex gap-3.5 pb-4 last:pb-0">
          {/* the rail between the numbers */}
          {i < step.items.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-[#e8dcc8]" aria-hidden />}
          <span className="relative w-8 h-8 shrink-0 rounded-full bg-[#7a2028]/[0.08] ring-1 ring-[#7a2028]/20 text-[#7a2028] text-[13px] font-black flex items-center justify-center">{i + 1}</span>
          <div className="min-w-0 pt-1">
            <p className="text-[15px] font-bold leading-snug text-[#2a2017]">{name}</p>
            {note && <p className="mt-0.5 text-[14px] leading-snug text-[#8a7a6a]">{note}</p>}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

// verses from..to of a chapter of the Apostle (public/bible/<book>.json, verses written „6. …“)
const bibleVerses = async (book: string, ch: number, from: number, to: number) => {
  const data: { chapters: string[] } = await (await fetch(`/bible/${book}.json`)).json();
  const text = (data.chapters[ch - 1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const start = text.search(new RegExp(`(^|\\s)${from}\\.\\s`));
  const end = text.search(new RegExp(`(^|\\s)${to + 1}\\.\\s`));
  if (start < 0) throw new Error('verses');
  // a verse a line, its number in wine
  return text.slice(start, end > start ? end : undefined).trim()
    .split(/\s(?=\d+\.\s)/)
    .map(v => v.replace(/^(\d+)\.\s/, '<sup class="font-sans font-bold text-[#7a2028] mr-1">$1</sup>'))
    .map(v => `<p>${v}</p>`).join('');
};

const ReadText: React.FC<{ step: Extract<LessonStep, { kind: 'read' }> }> = ({ step }) => {
  const one = step.psalms?.length === 1 ? step.psalms[0] : null;
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setHtml(null);
    setFailed(false);
    const load = one ? loadPsalmHtml(one)
      : step.bible ? bibleVerses(step.bible.book, step.bible.ch, step.bible.from, step.bible.to)
      : null;
    load?.then(h => alive && setHtml(h), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [one, step.bible]);

  return (
    <div className={`${PROSE} rounded-2xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] px-4 py-4 sm:px-6 sm:py-5`}>
      {step.lines?.map((l, i) => <p key={i}>{l}</p>)}
      {step.bible && <p className="!mb-2 font-sans text-[13px] font-bold text-[#8a7a6a]">{step.bible.name} {step.bible.ch}, {step.bible.from}–{step.bible.to}</p>}
      {(one || step.bible) && (html
        ? <div dangerouslySetInnerHTML={{ __html: html }} />
        : <p className="font-sans text-[14px] text-[#8a7a6a]">{failed ? 'ტექსტის ჩატვირთვა ვერ მოხერხდა — შეამოწმე ინტერნეტი.' : 'იტვირთება…'}</p>)}
      {!one && step.psalms?.map(n => (
        <FoldedPrayer key={n} id={`psalm-${n}`} label={`ფსალმუნი ${n}`} load={() => loadPsalmHtml(n)} className="mb-2.5 last:mb-0" />
      ))}
    </div>
  );
};

const MAX_SECONDS = 20 * 60;
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Record one's own reading and hear it back; the take stays in the browser and is never sent anywhere. */
export const ReadAloud: React.FC = () => {
  const [state, setState] = useState<'idle' | 'rec' | 'busy' | 'ready' | 'denied'>('idle');
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const rec = useRef<VoiceRecording | null>(null);
  const timer = useRef<number>(0);

  const clear = () => { window.clearInterval(timer.current); };
  useEffect(() => () => { clear(); rec.current?.cancel(); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const stop = async () => {
    clear();
    const r = rec.current;
    rec.current = null;
    if (!r) return;
    setState('busy');
    try {
      const take = await r.stop();
      setUrl(URL.createObjectURL(take.mp3));
      setState('ready');
    } catch { setState('idle'); }
  };
  const start = async () => {
    triggerHaptic(10);
    setUrl(null);
    try {
      rec.current = await startVoiceRecording();
    } catch { setState('denied'); return; }
    setSecs(0);
    setState('rec');
    const t0 = Date.now();
    timer.current = window.setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setSecs(s);
      if (s >= MAX_SECONDS) void stop();
    }, 250);
  };
  const cancel = () => { clear(); rec.current?.cancel(); rec.current = null; setState('idle'); };

  if (!voiceRecordingSupported()) return null;
  return (
    <div className="mt-4 rounded-2xl bg-[#7a2028]/[0.035] ring-1 ring-[#7a2028]/15 px-4 py-3.5">
      <div className="flex items-center gap-3">
        {state === 'rec' ? (
          <button type="button" onClick={() => void stop()} aria-label="გაჩერება"
            className="w-12 h-12 shrink-0 rounded-full bg-[#b3261e] text-white flex items-center justify-center cursor-pointer active:scale-95 transition shadow-[0_0_0_6px_rgba(179,38,30,0.15)]">
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : state === 'busy' ? (
          <span className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028]/10 text-[#7a2028] flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></span>
        ) : (
          <button type="button" onClick={() => void start()} aria-label={state === 'ready' ? 'თავიდან ჩაწერა' : 'ჩაწერა'}
            className="w-12 h-12 shrink-0 rounded-full bg-[#7a2028] text-[#fbf6ec] flex items-center justify-center cursor-pointer active:scale-95 transition hover:bg-[#5e1820] shadow-[0_6px_14px_-8px_rgba(122,32,40,0.7)]">
            {state === 'ready' ? <RotateCcw className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-[#2a2017]">
            {state === 'rec' ? <>ჩაიწერება… <span className="tabular-nums text-[#b3261e]">{clock(secs)}</span></>
              : state === 'busy' ? 'მზადდება…'
              : state === 'ready' ? 'მოისმინე შენი კითხვა'
              : 'ჩაიწერე შენი კითხვა'}
          </p>
          <p className="text-[13px] leading-snug text-[#8a7a6a]">
            {state === 'denied' ? 'მიკროფონზე წვდომა არ არის — ნება დართე ბრაუზერის პარამეტრებში.'
              : 'ჩანაწერი არსად იგზავნება — მხოლოდ შენ გესმის.'}
          </p>
        </div>
        {state === 'rec' && (
          <button type="button" onClick={cancel} aria-label="გაუქმება"
            className="w-9 h-9 shrink-0 rounded-full text-[#8a7a6a] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {state === 'ready' && url && <audio controls src={url} className="mt-3 w-full h-11" />}
    </div>
  );
};

const Read: React.FC<{ step: Extract<LessonStep, { kind: 'read' }> }> = ({ step }) => (
  <div>
    <StepTitle eyebrow="წავიკითხოთ ხმამაღლა" title={step.title} />
    {step.intro && <p className="-mt-1 mb-4 text-[15px] leading-relaxed text-[#6b5c4d] text-pretty">{step.intro}</p>}
    <ReadText step={step} />
    <ReadAloud />
  </div>
);

const Quiz: React.FC<{ step: Extract<LessonStep, { kind: 'quiz' }> }> = ({ step }) => {
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === step.answer;
  return (
    <div>
      <StepTitle eyebrow="შეამოწმე თავი" title={step.question} />
      <div className="space-y-2.5">
        {step.options.map((o, i) => {
          const chosen = pick === i;
          // a wrong pick is marked alone, so the next try is still a real one; the right one ends the question
          const tone = right && i === step.answer ? 'bg-emerald-50 ring-emerald-500 text-emerald-900'
            : chosen ? 'bg-red-50 ring-red-300 text-red-900'
            : right ? 'bg-white ring-[#e8dcc8] text-[#8a7a6a]'
            : 'bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#2a2017]';
          return (
            <button key={i} type="button" disabled={pick !== null && right}
              onClick={() => { triggerHaptic(i === step.answer ? 15 : 30); setPick(i); }}
              className={`w-full min-h-12 px-4 py-2.5 rounded-2xl ring-1 text-left text-[15px] font-bold leading-snug flex items-center gap-3 cursor-pointer transition active:scale-[0.99] disabled:cursor-default ${tone}`}>
              <span className="flex-1">{o}</span>
              {right && i === step.answer && <Check className="w-5 h-5 shrink-0 text-emerald-600" />}
              {chosen && !right && <X className="w-5 h-5 shrink-0 text-red-500" />}
            </button>
          );
        })}
      </div>
      {pick !== null && (
        <p className={`mt-4 rounded-2xl px-4 py-3 text-[15px] leading-relaxed sg-in ${right ? 'bg-emerald-50 text-emerald-900' : 'bg-[#fdf4e3] text-[#4a3826]'}`}>
          <strong>{right ? 'სწორია! ' : 'არასწორია. '}</strong>{right ? step.explain : 'დაფიქრდი და სხვა პასუხი სცადე.'}
        </p>
      )}
    </div>
  );
};

const Task: React.FC<{ step: Extract<LessonStep, { kind: 'task' }>; onPsalter: () => void }> = ({ step, onPsalter }) => (
  <div>
    <StepTitle eyebrow="ვარჯიში" title={step.title} />
    <ul className="space-y-2.5">
      {step.body.map((t, i) => (
        <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-[#4a3826]">
          <span className="mt-0.5 w-6 h-6 shrink-0 rounded-lg ring-2 ring-[#7a2028]/30" aria-hidden />
          <span className="text-pretty"><Rich text={t} /></span>
        </li>
      ))}
    </ul>
    {step.open === 'psalter' && (
      <button type="button" onClick={onPsalter}
        className="mt-4 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-[#7a2028]/[0.08] hover:bg-[#7a2028]/[0.14] text-[#7a2028] text-sm font-bold cursor-pointer transition active:scale-[0.97]">
        ფსალმუნთა ჯგუფი
      </button>
    )}
  </div>
);

export const StepView: React.FC<{ step: LessonStep; onPsalter: () => void }> = ({ step, onPsalter }) =>
  step.kind === 'learn' ? <Learn step={step} />
  : step.kind === 'order' ? <Order step={step} />
  : step.kind === 'read' ? <Read step={step} />
  : step.kind === 'quiz' ? <Quiz step={step} />
  : <Task step={step} onPsalter={onPsalter} />;
