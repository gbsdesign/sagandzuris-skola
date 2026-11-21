import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, AudioWaveform, Check, Equal, Hourglass, MoveUpRight, Play, Square, Wind } from 'lucide-react';
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { timelineIn } from '../../utils/learn';
import {
  findTheory, pickTheory, theoryEntry, theoryOverrides, whereLine, type TheoryHit, type TheoryId, type TheoryText,
} from '../../utils/aiTheory';
import { Button, Card, Duo, Note, Sheet } from '../ui2';
import { rollNotes } from './LiveRoll';
import { saveAiNote, useAiNote } from './useAiNote';
import type { Phrase } from './useLessonData';
import type { Who } from './usePlayer';

// „პატარა თეორია“ (board x-ai-teoria): when the new phrase shows a rule the member has not met (utils/aiTheory.ts), a sheet
// rises once — the term, what it means, where it is in this phrase, „მაგალითი“ (that place on the synthesizer) and
// „გასაგებია“. Each rule once a member: students.aiNote.seen (a guest: this device). The school may reword a term and its
// meaning: settings/aiTheory { texts: { [id]: { term, meaning } } } (admins write settings/*; ⚙ „სკოლა“ → ავტომატური სასწავლო პროგრამა).

export const THEORY_ICON: Record<TheoryId, React.ReactNode> = {
  long: <Hourglass />, leap: <MoveUpRight />, rest: <Wind />, recite: <Equal />, drone: <AudioWaveform />, half: <ArrowUpDown />,
};

const settingsRef = () => doc(db, 'settings', 'aiTheory');

/** the school's rewording, live */
export const useTheoryTexts = () => {
  const [over, setOver] = useState<Partial<Record<TheoryId, TheoryText>>>({});
  useEffect(() => onSnapshot(settingsRef(), s => setOver(theoryOverrides(s.data()?.texts)), () => undefined), []);
  return over;
};

/** an admin's rewording of one term (null: back to the app's own words) */
export const saveTheoryText = (id: TheoryId, t: TheoryText | null) =>
  setDoc(settingsRef(), { texts: { [id]: t ?? deleteField() }, at: new Date().toISOString() }, { merge: true });

const DEVICE_KEY = 'sg-ai-theory-seen';
const deviceSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(DEVICE_KEY) || '[]'); } catch { return []; } };

/** The sheet itself, from what is given. */
export const TheorySheet: React.FC<{
  open: boolean; id: TheoryId; term: string; meaning: string; where: string;
  playing: boolean; onExample: () => void; onClose: () => void;
}> = ({ open, id, term, meaning, where, playing, onExample, onClose }) => (
  <Sheet open={open} title={term} onClose={onClose}>
    <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center self-center rounded-full bg-tint text-wine [&_svg]:size-8">
      {THEORY_ICON[id]}
    </span>
    <Card pad="none" className="px-[18px] py-4">
      <p className="text-lead leading-normal wrap-break-word">{meaning}</p>
    </Card>
    <Note className="text-body">{where}</Note>
    <Duo>
      <Button kind="ghost" icon={playing ? <Square fill="currentColor" /> : <Play />} onClick={onExample}>{playing ? 'გაჩერება' : 'მაგალითი'}</Button>
      <Button icon={<Check />} onClick={onClose}>გასაგებია</Button>
    </Duo>
  </Sheet>
);

/**
 * In the phrase step: finds the phrase's first rule not met yet and offers it once, a moment after the step opens (never
 * while singing). `play` sounds a stretch (seconds from the phrase's start).
 */
export const TheoryNote: React.FC<{
  phrase: Phrase;
  /** a take or a sound is on: wait */
  hold: boolean;
  play: (s0: number, s1: number, who: Who) => void;
  stop: () => void;
  playing: boolean;
}> = ({ phrase, hold, play, stop, playing }) => {
  const ai = useAiNote();
  const over = useTheoryTexts();
  const part = phrase.parts[phrase.part];
  const line = useMemo(() => timelineIn(phrase.score, phrase.vi, part.b0, part.b1), [phrase.score, phrase.vi, part]);
  const count = useMemo(() => rollNotes(line).length, [line]);
  const lowest = phrase.score.voices.length > 1 && phrase.vi === phrase.score.voices.length - 1;
  const [hit, setHit] = useState<TheoryHit | null>(null);
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(false);
  const decided = useRef(false);

  // picked once the member's record is in; offered once the step is quiet
  useEffect(() => {
    if (decided.current || ai.note === null) return;
    decided.current = true;
    const seen = ai.uid ? ai.note.seen ?? [] : deviceSeen();
    setHit(pickTheory(findTheory(line, { lowest }), seen));
  }, [ai.note, ai.uid, line, lowest]);
  useEffect(() => {
    if (!hit || hold || open) return;
    const t = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(t);
  }, [hit, hold, open]);

  if (!hit) return null;
  const entry = theoryEntry(hit.id, over);
  const close = () => {
    if (mine) stop();
    setOpen(false);
    setHit(null);
    // met: never again
    const seen = ai.uid ? ai.note?.seen ?? [] : deviceSeen();
    const next = [...new Set([...seen, hit.id])];
    if (ai.uid) void saveAiNote(ai.uid, { seen: next });
    else try { localStorage.setItem(DEVICE_KEY, JSON.stringify(next)); } catch { /* shown again next time */ }
  };
  const example = () => {
    if (mine && playing) { stop(); setMine(false); return; }
    setMine(true);
    play(part.s0 + hit.s0, part.s0 + hit.s1, hit.who);
  };
  return (
    <TheorySheet open={open} id={hit.id} term={entry.term} meaning={entry.meaning} where={whereLine(entry, hit, count)}
      playing={mine && playing} onExample={example} onClose={close} />
  );
};
