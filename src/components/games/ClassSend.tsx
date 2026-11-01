import React, { useState } from 'react';
import { Check, Loader2, Send } from 'lucide-react';
import { useAuth } from '../../context';
import { classChatBase, sendTextMessage, sendVoiceMessage, type ChatAuthor } from '../../hooks/useClassChat';
import type { VoiceTake } from '../../utils/voiceRecorder';
import { Btn } from '../ui/kit';
import { Chip } from './Chip';
import { useMine } from './useMine';

// A game's take to a class chat („მესამე ხმა“, „ჩემი გუნდი“): a line of what it is and the take as a voice message (the class
// studio sends its mix the same way). Shown only to one in a class; with several classes the class is picked first.

export const ClassSend: React.FC<{ text: string; make: () => Promise<VoiceTake> }> = ({ text, make }) => {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const { classes: mine } = useMine();
  const [picked, setPicked] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  if (!user || !mine.length) return null;
  const cls = mine.find(c => c.id === picked) ?? (mine.length === 1 ? mine[0] : null);

  const send = async () => {
    if (!cls) return;
    setState('sending');
    try {
      const take = await make();
      const p = cls.members.find(m => m.uid === uid) || cls.teachers.find(m => m.uid === uid);
      const author: ChatAuthor = {
        uid, name: p?.name || user.displayName || 'მგალობელი', photoURL: p?.photoURL || user.photoURL || '',
        teacher: isAdmin || cls.teachers.some(t => t.uid === uid),
      };
      const base = classChatBase(cls.id);
      await sendTextMessage(base, author, text);
      await sendVoiceMessage(base, author, take);
      setState('sent');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return <p className="flex items-center gap-2 text-[14.5px] font-bold text-[#2f7d4f]" role="status"><Check className="w-5 h-5" />გაიგზავნა „{cls?.name}“-ის ჩატში</p>;
  }
  return (
    <div className="space-y-2.5">
      {mine.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="რომელ კლასს">
          {mine.map(c => <Chip key={c.id} on={cls?.id === c.id} onClick={() => setPicked(c.id)}>{c.name}</Chip>)}
        </div>
      )}
      <Btn full size="lg" kind="ghost" disabled={!cls || state === 'sending'} onClick={() => { void send(); }}
        icon={state === 'sending' ? <Loader2 className="animate-spin" /> : <Send />}>
        {state === 'sending' ? 'იგზავნება…' : cls ? 'კლასის ჩატში გაგზავნა' : 'აირჩიე კლასი'}
      </Btn>
      {state === 'error' && <p className="text-[13.5px] font-bold text-[#b3261e]" role="alert">ვერ გაიგზავნა — სცადე ხელახლა.</p>}
    </div>
  );
};
