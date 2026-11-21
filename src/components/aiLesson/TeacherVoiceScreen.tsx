import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Church, Gauge, Sparkles, User, Volume2 } from 'lucide-react';
import { Choice, Dot, Note, RoundButton, Row, Rows, Sheet, ToggleRow, Val } from '../ui2';
import {
  SPEED_WORD, VOICE_SENTENCES, VOICE_WORD, sentenceHash, type VoiceKind, type VoiceSettings, type VoiceSpeed,
} from '../../utils/teacherVoice';
import { playSample, saveVoiceSettings, useVoiceIndex, useVoiceSettings, type VoiceIndex } from './TeacherVoice';

// „მასწავლებლის ხმა“ (board x-ai-khma): a screen inside the lesson, from its ⋯. A sample of the teacher's words with a
// speaker, whether the teacher speaks or only writes, a woman's or a man's voice, the pace; in church mode it is always
// silent. Kept on the device (sg-ai-voice).

const SAMPLE = 'ეს ფრაზა უკვე იცი. გადავიდეთ შემდეგზე.';

export const TeacherVoiceScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const settings = useVoiceSettings();
  const index = useVoiceIndex();
  // a history step of its own: the phone's „back“ returns to the lesson
  const close = useRef(onBack);
  close.current = onBack;
  useEffect(() => {
    try { window.history.pushState({ ...(window.history.state || {}), sgAiVoice: 1 }, ''); } catch { /* the ← still closes */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.sgAiVoice) close.current(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const back = () => { if (window.history.state?.sgAiVoice) window.history.back(); else onBack(); };
  return createPortal(
    <TeacherVoiceView settings={settings} index={index} onBack={back} onChange={saveVoiceSettings} onSample={() => playSample(SAMPLE)} />,
    document.body,
  );
};

/** The screen itself, from what is given (so it can be looked at without the database). */
export const TeacherVoiceView: React.FC<{
  settings: VoiceSettings; index: VoiceIndex; onBack: () => void;
  onChange: (p: Partial<VoiceSettings>) => void; onSample: () => Promise<boolean>;
}> = ({ settings, index, onBack, onChange, onSample }) => {
  const [pick, setPick] = useState<'voice' | 'speed' | null>(null);
  const [noSample, setNoSample] = useState(false);
  const recorded = VOICE_SENTENCES.filter(s => index[settings.voice]?.[sentenceHash(s)]).length;
  const sample = async () => { setNoSample(!(await onSample())); };
  return (
    <div className="fixed inset-0 z-[72] flex flex-col overflow-y-auto overscroll-contain bg-page pt-[env(safe-area-inset-top)] text-ink safe-x">
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-4 pb-8">
        <header className="flex shrink-0 items-center gap-2.5 pt-3.5 pb-1">
          <RoundButton label="უკან" onClick={onBack}><ArrowLeft /></RoundButton>
          <div className="min-w-0 flex-1 pl-0.5">
            <h1 className="truncate text-title font-bold leading-tight tracking-tight">მასწავლებლის ხმა</h1>
            <div className="truncate text-meta text-mut">ავტომატური სასწავლო პროგრამა</div>
          </div>
        </header>
        <section className="flex shrink-0 items-start gap-2.5 rounded-card bg-tint py-3.5 pr-2 pl-4" aria-label="ნიმუში">
          <span aria-hidden="true" className="flex shrink-0 pt-1 text-wine [&_svg]:size-5"><Sparkles /></span>
          <p className="min-w-0 flex-1 pt-0.5 text-lead leading-[1.45] wrap-break-word">{SAMPLE}</p>
          <RoundButton data-teacher-voice label="მოსმენა" size={36} tone="plain" className="text-wine" onClick={() => void sample()}><Volume2 /></RoundButton>
        </section>
        {noSample && <Note>ამ ხმით ჯერ არაფერია ჩაწერილი — ჯერ მხოლოდ ტექსტით ჩანს.</Note>}
        <Rows>
          <ToggleRow lead={<Dot icon={<Volume2 />} />} title="ხმით მელაპარაკოს" sub="ან მხოლოდ ტექსტით"
            on={settings.on} onChange={on => onChange({ on })} />
          <Row lead={<Dot icon={<User />} />} title="ხმა" right={<Val>{VOICE_WORD[settings.voice]}</Val>} onClick={() => setPick('voice')} />
          <Row lead={<Dot icon={<Gauge />} />} title="სიჩქარე" right={<Val>{SPEED_WORD[settings.speed]}</Val>} onClick={() => setPick('speed')} />
          <Row lead={<Dot icon={<Church />} />} title="ტაძრის რეჟიმში" sub="ყოველთვის ჩუმადაა" right={null} />
        </Rows>
        <Note>
          {recorded >= VOICE_SENTENCES.length
            ? 'მზა წინადადებები ერთხელაა ჩაწერილი და ტელეფონში ინახება. AI-ს ახალი სიტყვები ჯერ მხოლოდ ტექსტით ჩანს.'
            : `${VOICE_WORD[settings.voice]} ხმით ჩაწერილია ${recorded} / ${VOICE_SENTENCES.length} მზა წინადადება — დანარჩენი ჯერ ტექსტით ჩანს. AI-ს ახალი სიტყვებიც ჯერ მხოლოდ ტექსტით.`}
        </Note>
      </div>
      <Sheet open={pick === 'voice'} title="ხმა" onClose={() => setPick(null)}>
        <Rows role="radiogroup" aria-label="ხმა">
          {(['female', 'male'] as VoiceKind[]).map(v => (
            <Choice key={v} title={VOICE_WORD[v]} on={settings.voice === v} onClick={() => { onChange({ voice: v }); setPick(null); }} />
          ))}
        </Rows>
      </Sheet>
      <Sheet open={pick === 'speed'} title="სიჩქარე" onClose={() => setPick(null)}>
        <Rows role="radiogroup" aria-label="სიჩქარე">
          {(['slow', 'normal', 'fast'] as VoiceSpeed[]).map(v => (
            <Choice key={v} title={SPEED_WORD[v]} on={settings.speed === v} onClick={() => { onChange({ speed: v }); setPick(null); }} />
          ))}
        </Rows>
      </Sheet>
    </div>
  );
};
