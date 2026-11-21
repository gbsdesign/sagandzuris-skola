import React, { useEffect, useState } from 'react';
import { Check, MoreHorizontal, Sparkles, Volume2, X } from 'lucide-react';
import { Card, Dot, RoundButton, cx } from '../ui2';
import { LESSON_PARTS } from '../../utils/aiLesson';
import { usePhraseTexts, useTeacherVoiceAuto } from './TeacherVoice';
import { applyPhrases } from '../../utils/teacherVoice';

// The AI lesson's own pieces, the same on every screen (the prototypes' ltop, tbub, way, phrase, cen, tone, bot).

/** The lesson's top: stop · which of the five parts · minutes left · more; five bars under it. */
export const LessonTop: React.FC<{ at: number; sub: string; onClose: () => void; onMore: () => void }> = ({ at, sub, onClose, onMore }) => (
  <header className="shrink-0 px-4 pt-2.5 pb-3">
    <div className="flex items-center gap-2.5">
      <RoundButton label="გაკვეთილის შეჩერება" onClick={onClose}><X /></RoundButton>
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-head font-bold leading-tight">{LESSON_PARTS[at]?.name}</h1>
        <div className="text-meta leading-snug text-mut wrap-break-word">{sub}</div>
      </div>
      <RoundButton label="მეტი" onClick={onMore}><MoreHorizontal /></RoundButton>
    </div>
    <div role="img" aria-label={`გაკვეთილის ხუთი ნაწილიდან ${at + 1}`} className="mt-2.5 flex gap-1">
      {LESSON_PARTS.map((p, i) => <span key={p.id} className={cx('h-[5px] flex-1 rounded-full', i <= at ? 'bg-wine' : 'bg-dim')} />)}
    </div>
  </header>
);

// a Georgian voice for reading the teacher's words aloud, when the phone has one (most do not yet)
const georgianVoice = (): SpeechSynthesisVoice | null => {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    return window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ka')) ?? null;
  } catch { return null; }
};
const useGeorgianVoice = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(georgianVoice);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const again = () => setVoice(georgianVoice());
    window.speechSynthesis.addEventListener?.('voiceschanged', again);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', again);
  }, []);
  return voice;
};

/** What the AI teacher says: its mark, one to three short sentences, and — where the phone can read Georgian — a speaker. */
export const TeacherSays: React.FC<{ children: React.ReactNode; sub?: React.ReactNode; text?: string; className?: string }> = ({ children: said, sub, text: plain, className }) => {
  const voice = useGeorgianVoice();
  // the school's own words in place of the sentences it changed (settings/aiPhrases; board x-ai-prazebi)
  const texts = usePhraseTexts();
  const text = plain ? applyPhrases(plain, texts) : plain;
  const words = Array.isArray(said) && said.every(x => typeof x === 'string' || typeof x === 'number') ? said.join('') : said;
  const children = typeof words === 'string' ? applyPhrases(words, texts) : words;
  // AI step 4: the teacher's recorded voice speaks a ready sentence by itself (TeacherVoice.ts); its speaker plays it — a
  // sentence the school changed has no recording, so only the unchanged ones speak
  const recorded = useTeacherVoiceAuto(text);
  const say = () => {
    if (recorded.has) { recorded.play(); return; }
    if (!voice || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice; u.lang = voice.lang;
    window.speechSynthesis.speak(u);
  };
  return (
    <Card pad="none" className={cx('bg-tint px-3.5 py-3.5', className)} aria-label="ავტომატური სასწავლო პროგრამა ამბობს" aria-live="polite">
      <div className="flex items-start gap-2.5">
        <Dot icon={<Sparkles />} size={36} />
        <div className="min-w-0 flex-1 pt-1.5">
          <div className="text-lead leading-[1.45] wrap-break-word">{children}</div>
          {sub && <div className="mt-1 text-meta text-mut">{sub}</div>}
        </div>
        {(voice || recorded.has) && text && <RoundButton data-teacher-voice label="ხმამაღლა" size={36} tone="plain" className="text-wine" onClick={say}><Volume2 /></RoundButton>}
      </div>
    </Card>
  );
};

/** The three steps a phrase is learned in; the one on now is filled, the ones passed are ticked. */
export const Way: React.FC<{ on: number }> = ({ on }) => (
  <div aria-label="ფრაზის გზა" className="flex shrink-0 gap-1.5">
    {['ნაწილებად', 'ერთად', 'მარტო'].map((name, i) => (
      <span key={name} aria-current={i === on ? 'step' : undefined}
        className={cx('flex h-icon min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-meta font-bold [&_svg]:size-3.5',
          i === on ? 'bg-wine text-white' : i < on ? 'bg-surf text-ink' : 'bg-surf text-mut')}>
        {i < on && <Check strokeWidth={2.5} />}<span className="truncate">{name}</span>
      </span>
    ))}
  </div>
);

/** The phrase's card: whose and which phrase, the book's line (its words are printed there), then the roll. */
export const PhraseCard: React.FC<{ caption: React.ReactNode; picture?: React.ReactNode; children: React.ReactNode }> = ({ caption, picture, children }) => (
  <Card pad="none" className="px-4 pt-3.5 pb-4">
    <div className="mb-2 text-center text-meta font-semibold text-mut">{caption}</div>
    {picture && <div className="mb-3">{picture}</div>}
    {children}
  </Card>
);

/** A calm message in the middle of the screen: a round mark, a heading, one or two sentences. */
export const CenterNote: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-3.5 pb-10 text-center">
    <span aria-hidden="true" className="mb-1.5 flex size-[84px] items-center justify-center rounded-full bg-tint text-wine [&_svg]:size-9">{icon}</span>
    <h2 className="text-title font-bold leading-snug">{title}</h2>
    <p className="max-w-[300px] text-body leading-[1.55] text-mut">{children}</p>
  </div>
);

/** A warm-up note: done (wine, ticked), now (gold), next (outlined). */
export const ToneCircle: React.FC<{ name: string; state: 'done' | 'now' | 'next' }> = ({ name, state }) => (
  <span className={cx('flex size-[72px] items-center justify-center rounded-full text-head font-bold [&_svg]:size-[26px]',
    state === 'done' ? 'bg-wine text-white' : state === 'now' ? 'bg-gold-ink text-white' : 'bg-surf text-mut ring-2 ring-inset ring-dim')}>
    {state === 'done' ? <Check strokeWidth={2.5} /> : name}
  </span>
);

/** The buttons at the bottom of a lesson screen, over the page, clear of the phone's home bar. */
export const Bottom: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="sticky bottom-0 z-10 mt-auto flex shrink-0 flex-col gap-2 bg-page px-4 pt-3 pb-[max(18px,env(safe-area-inset-bottom))]">
    {children}
  </div>
);
