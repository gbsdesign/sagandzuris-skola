import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUp, Clock, Leaf, MessageCircleQuestionMark, Mic, Quote, Search, Sparkles, Square } from 'lucide-react';
import { findVersion } from '../../data/chantLookup';
import { makeTimeMap } from '../../utils/chantSynth';
import { wordsForPart } from '../../utils/learn';
import {
  ASK_SCOPE_LINE, OFFLINE_ANSWER, SOURCE_LINE, breathAnswer, lateAnswer, lateStart, pickAskWord, readQuestion, readyQuestions,
  schoolAnswer, voiceWord, type AskKind, type AskQuestion, type AskSource,
} from '../../utils/aiAsk';
import { AiTeacherError } from '../../utils/aiTeacher';
import { useApprovedPrep } from '../../pages/v2/aiklasi/prep/usePrep';
import { Dot, RoundButton, Row, Rows, Sheet, cx } from '../ui2';
import type { Phrase } from './useLessonData';
import { askChantQuestion, askProblemText } from './AskAi';
import { speechSupported, useSpeechOnce } from './VoiceCommands';

// „ჰკითხე მასწავლებელს“ (board x-ai-kitkhe): a question about the phrase being sung. Three ready ones made from the phrase
// (a word's meaning, why my voice starts late — only when it does —, where to breathe), a field of one's own (typed or
// said), and the line „პასუხობს მხოლოდ გალობაზე და აპზე“. The answer comes first from the school's material
// (utils/aiAsk.ts), the AI only when that has none (AskAi.ts); faith questions go to the priest. Offline: the material only.

export interface AskShown { q: string; text: string; source: AskSource | null; busy?: boolean; problem?: boolean }

const ICON: Record<AskKind, React.ReactNode> = { meaning: <Quote />, late: <Clock />, breath: <Leaf />, free: <MessageCircleQuestionMark /> };

/** the phrase's words, roughly (the chant's text shared out over its phrases), loaded when the sheet opens */
const usePhraseWords = (phrase: Phrase | null, open: boolean) => {
  const [words, setWords] = useState<string[]>([]);
  useEffect(() => {
    setWords([]);
    if (!open || !phrase) return;
    let gone = false;
    (async () => {
      const info = findVersion(phrase.piece);
      if (!info) return;
      const { getChantMedia } = await import('../../data/chantMediaRegistry');
      const text = getChantMedia(info.chant.id, info.variant.code)?.lyrics ?? '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (!gone) setWords(wordsForPart(lines, phrase.part, phrase.parts.length));
    })().catch(() => undefined);
    return () => { gone = true; };
  }, [open, phrase?.piece, phrase?.part]); // eslint-disable-line react-hooks/exhaustive-deps
  return words;
};

export const AskSheet: React.FC<{ open: boolean; onClose: () => void; phrase: Phrase | null; uid: string | null }> = ({ open, onClose, phrase, uid }) => {
  const words = usePhraseWords(phrase, open);
  const prep = useApprovedPrep(open ? phrase?.piece : null);
  const [answer, setAnswer] = useState<AskShown | null>(null);
  useEffect(() => { if (!open) setAnswer(null); }, [open]);

  // what the notes say about my voice in this phrase
  const facts = useMemo(() => {
    if (!phrase) return null;
    const part = phrase.parts[phrase.part];
    if (!part) return null;
    const { toSec } = makeTimeMap(phrase.score.tempos);
    const late = lateStart(phrase.score.voices, phrase.vi, part.b0, part.b1, toSec);
    return { late, lateText: lateAnswer(late), breath: breathAnswer(phrase.score.voices[phrase.vi] ?? [], part.b0, part.b1) };
  }, [phrase]);
  const word = pickAskWord(words) ?? (phrase ? pickAskWord([phrase.title]) : null);
  const questions = facts ? readyQuestions({ word, late: !!facts.late }) : [];

  const ask = async (q: AskQuestion) => {
    if (!facts || !phrase || answer?.busy) return;
    const school = schoolAnswer(q, { prep: prep?.questions ?? [], breath: facts.breath, late: facts.lateText });
    if (school) { setAnswer({ q: q.text, text: school.text, source: school.source }); return; }
    if (navigator.onLine === false || !uid) { setAnswer({ q: q.text, text: OFFLINE_ANSWER, source: null }); return; }
    setAnswer({ q: q.text, text: '', source: null, busy: true });
    try {
      const text = await askChantQuestion(uid, q, { title: phrase.title, voice: voiceWord(phrase.vi), phrase: phrase.part + 1, words });
      setAnswer({ q: q.text, text, source: 'ai' });
    } catch (e) {
      setAnswer({ q: q.text, text: askProblemText(e instanceof AiTeacherError ? e.kind : 'failed'), source: null, problem: true });
    }
  };

  return <AskView open={open} onClose={onClose} questions={questions} answer={answer} onAsk={q => void ask(q)} />;
};

/** The sheet itself, from what is given (so it can be looked at without the database). */
export const AskView: React.FC<{
  open: boolean; onClose: () => void; questions: AskQuestion[]; answer: AskShown | null; onAsk: (q: AskQuestion) => void;
}> = ({ open, onClose, questions, answer, onAsk }) => {
  const [text, setText] = useState('');
  useEffect(() => { if (!open) setText(''); }, [open]);
  const speech = useSpeechOnce(said => { setText(said); onAsk(readQuestion(said)); });
  useEffect(() => { if (!open) speech.stop(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const canSpeak = speechSupported();
  const send = () => { const t = text.trim(); if (t && !answer?.busy) onAsk(readQuestion(t)); };
  const typing = text.trim().length > 0;
  return (
    <Sheet open={open} title="ჰკითხე მასწავლებელს" onClose={onClose}>
      {answer && (
        <section aria-live="polite" className="flex shrink-0 items-start gap-2.5 rounded-card bg-tint px-3.5 py-3.5">
          <Dot icon={<Sparkles />} size={36} />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="text-meta font-semibold text-mut wrap-break-word">{answer.q}</div>
            <div className={cx('mt-1 text-lead leading-[1.45] wrap-break-word', answer.problem && 'text-gold-ink')}>
              {answer.busy ? 'ვფიქრობ…' : answer.text}
            </div>
            {answer.source && !answer.busy && <div className="mt-1.5 text-meta text-mut">{SOURCE_LINE[answer.source]}</div>}
          </div>
        </section>
      )}
      {questions.length > 0 && (
        <Rows>
          {questions.map(q => (
            <Row key={q.text} wrap lead={<Dot icon={ICON[q.kind]} />} title={q.text} disabled={answer?.busy} onClick={() => onAsk(q)} />
          ))}
        </Rows>
      )}
      <form className="flex shrink-0 items-center gap-2.5" onSubmit={e => { e.preventDefault(); send(); }}>
        <label className="flex h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-full bg-surf px-[18px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
          <Search aria-hidden="true" className="size-5 shrink-0 text-mut" />
          <input value={speech.listening ? speech.heard : text} onChange={e => setText(e.target.value)} maxLength={200}
            placeholder={speech.listening ? 'გისმენ…' : 'სხვა კითხვა…'} aria-label="სხვა კითხვა" enterKeyHint="send"
            className="min-w-0 flex-1 bg-transparent text-lead text-ink outline-none placeholder:text-faint" />
        </label>
        {typing || !canSpeak
          ? <RoundButton label="გაგზავნა" size={48} tone="wine" type="submit" disabled={!typing || !!answer?.busy}><ArrowUp /></RoundButton>
          : <RoundButton label={speech.listening ? 'შეჩერება' : 'ხმით კითხვა'} size={48} tone="wine" disabled={!!answer?.busy}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}>
              {speech.listening ? <Square fill="currentColor" /> : <Mic />}
            </RoundButton>}
      </form>
      <p className="shrink-0 pb-1 text-center text-meta text-mut">{ASK_SCOPE_LINE}</p>
    </Sheet>
  );
};
