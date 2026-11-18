import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context';
import { findVersion } from '../../../data/chantLookup';
import { useOpenLearning } from '../../../components/learn/openLearning';
import { VOICE_SHORT, sectionOf, useChantScore } from '../../games/mesame/plan';
import { useTrioTake } from '../../games/mesame/useTrioTake';
import { saveTake } from '../../../hooks/usePearls';
import { placeOf } from '../../../utils/trio';
import { singingSupported } from '../../../utils/singCapture';
import { toSmallMp3 } from '../../../utils/voiceRecorder';
import { georgiaToday } from '../../../utils/psalter';
import { chantName } from '../../../utils/pearls';
import { passed, triedToday } from '../../../utils/aiPass';
import { examCount, examTakeId } from '../../../utils/aiExam';
import type { Voice } from '../../../utils/pathItems';
import { saveExamTry, useExamRecord } from './useExamRecord';
import { ExamView } from './ExamView';

// The AI teacher's exam (AI step 3, boards x-ai-gamocda-tsin and x-ai-gamocda): one voice of a chant, the whole of it, at its
// real tempo, the other voices sounding and mine not, no hint. The phone counts the notes (the engine of „მესამე ხმა“, `strict`:
// a stop counts the rest as missed); 90 % passes (utils/aiPass.ts) and the voice's pearl shines like a teacher's „ჩათვლა“. One
// exam a day a voice, tries are not counted. A full-screen layer above the bottom menu; opened by `openExam` (./open.ts).

/** the smallest take the pearls' store takes (< 600 KB): about three minutes at 24 kbps */
const SEND_SECONDS = 185;

export const ExamScreen: React.FC<{ variantId: string; voice: Voice; fromLearning: boolean; onClose: () => void }> = ({ variantId, voice, fromLearning, onClose }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const rec = useExamRecord(uid);
  const openLearning = useOpenLearning();
  const info = findVersion(variantId);
  const num = info?.variant.bookNums?.[0];
  const { loaded, failed } = useChantScore(info?.variant.book || 'book', num);
  const vi = Number(voice) - 1;
  const title = info ? chantName(info.chant.title) : '';
  const voiceName = VOICE_SHORT[vi] ?? '';
  const section = useMemo(() => (loaded ? sectionOf(loaded, vi, true) : null), [loaded, vi]);
  const take = useTrioTake();
  const day = georgiaToday();
  const tried = triedToday(rec.tries, variantId, voice, day);
  const can = singingSupported() && !!uid;
  const r = take.result;

  // the count: all notes of the voice, the ones not sung (a stop included) are missed
  const score = r && take.state === 'done' ? examCount(r.credits) : null;
  const silent = !!r && r.frames.every(f => f.midi === null);
  const won = !!score && !silent && passed(score.hit, score.total);

  // a finished try is written once (a silent take is not a try: the microphone heard nothing)
  const saved = useRef<unknown>(null);
  useEffect(() => {
    if (!r || !score || silent || !uid || saved.current === r) return;
    saved.current = r;
    saveExamTry(uid, variantId, voice, day, won ? { at: new Date().toISOString(), hit: score.hit, total: score.total } : null)
      .catch(e => console.warn('exam save:', (e as { code?: string })?.code || e));
  }, [r, score, silent, uid, won]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'failed'>('no');
  useEffect(() => { if (take.state === 'idle') setSent('no'); }, [take.state]);

  const begin = () => {
    if (!loaded || !section || !can || tried) return;
    void take.start({ score: loaded.score, voice: vi, from: section.from, to: section.to, speed: 1, guide: false, notes: section.notes, strict: true });
  };
  const close = () => { take.cancel(); onClose(); };
  const practise = () => {
    take.cancel();
    onClose();
    if (fromLearning) return;
    window.setTimeout(() => openLearning(variantId, voice), 150);
  };
  const sendTake = async () => {
    if (!r?.mp3 || !uid || !score) return;
    setSent('busy');
    try {
      const small = await toSmallMp3(r.mp3, SEND_SECONDS);
      await saveTake(uid, examTakeId(variantId, voice), small.mp3, Math.round((score.hit / Math.max(1, score.total)) * 100), voice);
      setSent('yes');
    } catch (e) {
      console.warn('exam take send:', (e as { code?: string })?.code || e);
      setSent('failed');
    }
  };

  const live = take.live();
  const frames = r ? r.frames : (live?.frames ?? []).map(f => ({ t: f.t / 1000, midi: f.midi }));
  const place = r ? placeOf(0, r.delay, 1) : live?.place ?? (() => -1e9);
  const why = failed || !info ? 'ამ საგალობლის ნოტები ვერ ჩაიტვირთა.'
    : !uid ? 'გამოცდისთვის ჯერ შედი ანგარიშში.'
    : !singingSupported() ? 'ამ ტელეფონზე მიკროფონით გამოცდა ვერ ჩატარდება.'
    : '';

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="გამოცდა"
      className="fixed inset-0 z-[88] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <ExamView
        state={take.state} title={title} voiceName={voiceName} tried={tried} why={why} loading={!failed && !!info && !loaded} problem={take.problem}
        count={take.count} now={take.now} section={section} frames={frames} place={place}
        result={r && score ? { hit: score.hit, total: score.total, silent, won, making: r.making, hasMp3: !!r.mp3 } : null}
        sent={sent} onBegin={begin} onPractise={practise} onClose={close} onStop={take.stop} onReset={take.reset}
        onSend={() => { void sendTake(); }}
      />
    </div>,
    document.body,
  );
};
