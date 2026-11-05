import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context';
import { findVersion } from '../../data/chantLookup';
import type { BookScore } from '../../utils/chantSynth';
import { afterTry, partsOfScore } from '../../utils/learn';
import { VOICE_NAMES, chantName } from '../../utils/pearls';
import { georgiaToday } from '../../utils/psalter';
import { useLearning } from '../../hooks/useLearning';
import { usePearls } from '../../hooks/usePearls';
import type { Voice } from '../../utils/pathItems';
import { LearnFrame, LearnTips, ReviewReminder, VoiceChoice } from './LearnShared';
import { LearnEasy } from './LearnEasy';

// „სასწავლო რეჟიმი“ of a chant: the book's notes cut into parts (a line of notes each), each learned in steps —
// small pieces, „ერთად“, „მარტო“ (LearnEasy; one way for everybody since 2026-11-05, the „მარტივი · სრული“ switch is gone).
// Progress in students.learning (useLearning); takes go to the teacher like the pearls' (learn~ ids).

/** `voice`: the voice to start on (a teacher's assignment); otherwise the one named in the profile. */
export const LearnMode: React.FC<{ vid: string; score: BookScore; voice?: Voice; onClose: () => void }> = ({ vid, score, voice: asked, onClose }) => {
  const info = findVersion(vid);
  const { user, isSuperAdmin } = useAuth();
  const uid = user?.uid ?? null;
  const pearls = usePearls(uid);
  const { rec, loaded, savePart, noteParts } = useLearning(uid, vid);
  const today = georgiaToday();
  const parts = useMemo(() => partsOfScore(score), [score]);
  const voiceCount = Math.min(3, score.voices.length);
  const askedOk = !!asked && Number(asked) <= voiceCount;
  const [voice, setVoice] = useState<Voice>(askedOk ? asked! : '1');
  const [voicePicked, setVoicePicked] = useState(askedOk);
  const [current, setCurrent] = useState<number | 'all'>(0);
  const recRef = useRef(rec);
  recRef.current = rec;

  // the voice named in the profile, until another is picked
  useEffect(() => {
    if (!voicePicked && pearls.loaded) setVoice(Number(pearls.voice) <= voiceCount ? pearls.voice : '1');
  }, [pearls.loaded, pearls.voice, voicePicked, voiceCount]);
  // the teacher's bars need the number of parts
  useEffect(() => { if (loaded) noteParts(parts.length); }, [loaded, parts.length]);
  // open on the first part not yet learned (or one due for review)
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !loaded) return;
    opened.current = true;
    const due = parts.findIndex((_, i) => rec[i]?.due && rec[i].due! <= today && rec[i].level < 4);
    const fresh = parts.findIndex((_, i) => !rec[i] || rec[i].level <= 0);
    setCurrent(due >= 0 ? due : fresh >= 0 ? fresh : 0);
  }, [rec, loaded]);

  const onTry = (part: number, pct: number, ok: boolean) => savePart(part, afterTry(recRef.current[part], pct, ok, today));
  const title = info ? chantName(info.chant.title) : '';
  const num = info?.variant.bookNums?.[0];

  return (
    <LearnFrame title={title} subtitle={`სასწავლო რეჟიმი${num ? ` · №${num}` : ''}`} onClose={onClose}>
      {voiceCount > 1 && (
        <VoiceChoice count={voiceCount} value={voice} names={VOICE_NAMES} onChange={v => { setVoicePicked(true); setVoice(v); }} />
      )}

      <LearnEasy
        vid={vid} score={score} parts={parts} rec={rec} today={today} loaded={loaded}
        current={current} onPick={p => setCurrent(p === 'all' ? 'all' : Math.max(0, Math.min(parts.length - 1, p)))}
        voice={voice} voiceName={VOICE_NAMES[voice]} title={title} uid={uid} unlimited={isSuperAdmin}
        approved={id => Boolean(pearls.shine[id])} onTry={onTry}
      />

      {uid && <ReviewReminder />}
      <LearnTips />
    </LearnFrame>
  );
};
