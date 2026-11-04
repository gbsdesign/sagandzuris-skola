import React, { useState } from 'react';
import { ClipboardList, Clock, Dumbbell, Lock, MessageSquareText, Music, Pin, Reply } from 'lucide-react';
import type { ChatMessage } from '../../hooks/useClassChat';
import { daysUntil, dueUntil } from '../../hooks/useTeaching';
import { usePathItemOpener } from '../../hooks/usePathItemOpener';
import { assignmentLines } from '../../utils/assignmentLines';
import { findDrill } from '../../data/vocalDrills';
import { DrillSheet } from '../mastery/ManeraLessonSheet';
import { WorkCardHead } from '../teacher/AssignmentsPanel';
import { sentAt } from './ChatPanel';

// A teacher's card for one member in a chat (hooks/useChatPins.ts): a comment (gold, 📌) or an assignment (its chant big —
// a tap opens the notes, the song or the exercise —, the deadline, the teacher's note). In a class's chat it says who may
// see it (🔒), and the member gets „პასუხი“, which opens their private chat with the one who wrote it.

const firstName = (name = '') => name.trim().split(/\s+/)[0] || name;

export const PinCard: React.FC<{
  m: ChatMessage;
  /** the reader is the member it is for (else a teacher or an admin) */
  forMe: boolean;
  /** a class's chat: the 🔒 line says who sees it */
  inClass?: boolean;
  onReply?: () => void;
}> = ({ m, forMe, inClass = false, onReply }) => {
  const openerOf = usePathItemOpener();
  const [drill, setDrill] = useState<string | null>(null);
  const isWork = m.kind === 'work';
  const whom = forMe ? 'შენთვის' : `· ${m.toName || 'მოსწავლე'}`;
  const lines = isWork ? (m.drill ? { name: findDrill(m.drill)?.title || m.text, line: 'სავარჯიშო', book: '' } : assignmentLines(m.vid, m.text)) : null;
  const open = isWork ? (m.drill ? () => setDrill(m.drill!) : m.vid ? openerOf(m.vid) : null) : null;
  const n = m.due ? daysUntil(m.due) : 0;

  return (
    <div className={`w-full rounded-[20px] ring-1 overflow-hidden text-left ${isWork ? 'bg-white ring-[#e8dcc8]' : 'bg-[#fff8e6] ring-amber-200'}`}>
      <p className={`flex items-center gap-1.5 px-3.5 pt-2.5 text-[12.5px] font-bold ${isWork ? 'text-[#7a2028]' : 'text-amber-800'}`}>
        {isWork ? <ClipboardList className="w-4 h-4 shrink-0" /> : <Pin className="w-4 h-4 shrink-0" />}
        <span className="min-w-0 truncate">{isWork ? 'დავალება' : 'შენიშვნა'} {whom}</span>
      </p>
      {isWork && lines ? (
        <>
          <WorkCardHead name={lines.name} line={lines.line} icon={m.drill ? <Dumbbell /> : <Music />} open={open} className="px-3.5 py-2.5" />
          {(m.due || m.note) && (
            <div className="px-3.5 pb-1 space-y-1.5">
              {m.due && (
                <p className={`flex items-center gap-1.5 text-[13px] font-semibold ${n < 0 ? 'text-[#8a7a6a]' : n <= 2 ? 'text-amber-700' : 'text-[#4a3426]'}`}>
                  <Clock className="w-4 h-4" /> {dueUntil(m.due)}
                </p>
              )}
              {m.note && (
                <p className="flex items-start gap-1.5 text-[13px] leading-snug text-[#75685a]">
                  <MessageSquareText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#b3a594]" />
                  <span className="min-w-0 whitespace-pre-line break-words">{m.note}</span>
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="px-3.5 pt-1.5 whitespace-pre-wrap break-words text-[15px] leading-snug text-[#2a2017]">{m.text}</p>
      )}
      {inClass && (
        <p className="flex items-center gap-1.5 px-3.5 pt-2 text-[12px] text-[#8a7a6a]">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          {forMe ? 'ხედავ მხოლოდ შენ და მასწავლებლები' : `ხედავენ მხოლოდ ${firstName(m.toName)} და მასწავლებლები`}
        </p>
      )}
      <div className="flex items-center justify-between gap-3 px-3.5 pt-2 pb-2.5">
        {onReply ? (
          <button type="button" onClick={e => { e.stopPropagation(); onReply(); }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[13px] font-bold cursor-pointer active:scale-95 transition">
            <Reply className="w-4 h-4" /> პასუხი
          </button>
        ) : <span />}
        <span className="text-[11px] leading-none text-[#a89886]">{sentAt(m)}</span>
      </div>
      {m.drill && <DrillSheet drillId={drill} startTab={forMe ? 'exercise' : 'lesson'} onClose={() => setDrill(null)} />}
    </div>
  );
};
