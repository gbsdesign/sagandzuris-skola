import React, { useState } from 'react';
import { ChevronRight, MessageCircleQuestionMark, Mic, Volume2 } from 'lucide-react';
import { useNotes } from '../../context/NotesContext';
import { useAccess, useKidsMode } from '../../hooks/useAccess';
import { useCall } from '../../utils/callSession';
import { Dot, Press, Row, Rows, ToggleRow, cx } from '../ui2';
import { VOICE_WORD } from '../../utils/teacherVoice';
import { speechSupported, setVoiceCommandsOn, useVoiceCommandsOn } from './VoiceCommands';
import { useTeacherVoiceHere, useVoiceSettings } from './TeacherVoice';

// The AI lesson's three helpers of AI step 4 in one place: „ჰკითხე“ (AskSheet), „ხმით მართვა“ (VoiceCommands) and
// „მასწავლებლის ხმა“ (TeacherVoice*). Shown only while the switch „ავტომატური სასწავლო პროგრამა“ is on for the person and never in
// the kids' mode; the voice commands and the teacher's voice are quiet in church mode and during a call.

/** church mode, when the notes' context is there (it always is in the app) */
const useChurch = () => {
  try { return useNotes().church; } catch { return false; }
};

export const useLessonExtras = () => {
  const access = useAccess();
  const kids = useKidsMode();
  const church = useChurch();
  const call = useCall();
  const inCall = call.status === 'connecting' || call.status === 'waiting' || call.status === 'live';
  const shown = access.on('aiTeacher') && !kids;
  const calm = church || inCall;
  const commands = useVoiceCommandsOn();
  const [ask, setAsk] = useState(false);
  const [voiceScreen, setVoiceScreen] = useState(false);
  useTeacherVoiceHere(shown && !calm);
  return {
    shown,
    /** the voice commands listen (between tries; the phrase decides the pause) */
    listen: shown && !calm && commands && speechSupported() && !ask && !voiceScreen,
    commands, ask, setAsk, voiceScreen, setVoiceScreen,
  };
};
export type LessonExtras = ReturnType<typeof useLessonExtras>;

/** The rows in the lesson's ⋯: ask (while a phrase is open), voice commands, the teacher's voice. */
export const LessonExtrasMenu: React.FC<{ x: LessonExtras; canAsk: boolean; onPick: () => void }> = ({ x, canAsk, onPick }) => {
  const voice = useVoiceSettings();
  if (!x.shown) return null;
  return (
    <Rows>
      {canAsk && (
        <Row lead={<Dot icon={<MessageCircleQuestionMark />} />} title="ჰკითხე" sub="კითხვა ამ ფრაზაზე"
          onClick={() => { onPick(); x.setAsk(true); }} />
      )}
      {speechSupported() && (
        <ToggleRow lead={<Dot icon={<Mic />} />} title="ხმით მართვა" sub="„კიდევ ერთხელ“, „ნელა“, „შემდეგი“"
          on={x.commands} onChange={setVoiceCommandsOn} />
      )}
      <Row lead={<Dot icon={<Volume2 />} />} title="მასწავლებლის ხმა" sub={voice.on ? `${VOICE_WORD[voice.voice]} ხმა` : 'მხოლოდ ტექსტით'}
        onClick={() => { onPick(); x.setVoiceScreen(true); }} />
    </Rows>
  );
};

/** „ჰკითხე მასწავლებელს ›“ — a quiet line under the phrase. */
export const AskLink: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className }) => (
  <Press onClick={onClick} className={cx(
    'flex h-tap w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 text-meta font-semibold text-wine [&_svg]:size-4 [&_svg]:shrink-0',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60', className,
  )}>
    <MessageCircleQuestionMark aria-hidden="true" />ჰკითხე მასწავლებელს<ChevronRight aria-hidden="true" />
  </Press>
);
