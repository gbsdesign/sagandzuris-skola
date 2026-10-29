import React, { useEffect, useState } from 'react';
import { Check, Loader2, MessageCircle, Mic, Users } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { ChatAuthor, classChatBase, sendTextMessage, sendVoiceMessage } from '../../hooks/useClassChat';
import { VOICE_MAX_SECONDS, toSmallMp3 } from '../../utils/voiceRecorder';
import { triggerHaptic } from '../../utils/haptics';
import { Btn, Sheet } from '../ui/kit';

// „გაზიარება → საგანძური“: a recording or a text shared from another app on the phone waits in the service worker's
// cache 'sg-share' (public/prayer-notify-sw.js) and the page opens at /?open=share. This window asks which class chat it
// goes to and sends it as the member's own message — a recording as a voice message (its first five minutes, made small
// like the app's own voice messages). Nothing is sent without that choice; ✕ throws the share away.

interface Shared { audio: Blob | null; name: string; text: string }

const readShare = async (): Promise<Shared | null> => {
  if (!('caches' in window)) return null;
  const cache = await caches.open('sg-share');
  const [a, t] = await Promise.all([cache.match('/share/audio'), cache.match('/share/text')]);
  if (!a && !t) return null;
  const audio = a ? await a.blob() : null;
  const name = a ? decodeURIComponent(a.headers.get('X-Name') || '') : '';
  const text = t ? (await t.text()).slice(0, 2000) : '';
  return { audio, name, text };
};
const clearShare = () => caches.open('sg-share').then(c => Promise.all([c.delete('/share/audio'), c.delete('/share/text')])).catch(() => undefined);

export const ShareHost: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid).filter(c => !c.archived);
  const [shared, setShared] = useState<Shared | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (new URL(window.location.href).searchParams.get('open') !== 'share') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('open');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    readShare().then(s => s && setShared(s)).catch(() => undefined);
  }, []);

  if (!shared) return null;
  const close = () => { setShared(null); setState('idle'); clearShare(); };

  const send = async (classId: string) => {
    if (!user) return;
    triggerHaptic(10);
    setState('sending');
    const cls = classes.find(c => c.id === classId);
    const me = cls?.members.find(m => m.uid === user.uid) || cls?.teachers.find(m => m.uid === user.uid);
    const author: ChatAuthor = {
      uid: user.uid, name: me?.name || user.displayName || 'წევრი', photoURL: me?.photoURL || user.photoURL || '',
      teacher: !!cls?.teacherIds.includes(user.uid),
    };
    try {
      const base = classChatBase(classId);
      if (shared.audio) await sendVoiceMessage(base, author, await toSmallMp3(shared.audio, VOICE_MAX_SECONDS));
      if (shared.text) await sendTextMessage(base, author, shared.text);
      setState('sent');
      window.setTimeout(close, 1200);
    } catch {
      setState('error');
    }
  };

  return (
    <Sheet open onClose={close} title="გაზიარება კლასში" locked={state === 'sending'}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/10 px-4 py-3 flex items-start gap-3">
          <span aria-hidden className="w-10 h-10 shrink-0 rounded-xl bg-white ring-1 ring-[#7a2028]/10 flex items-center justify-center text-[#7a2028]">
            {shared.audio ? <Mic className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
          </span>
          <div className="min-w-0 text-[14px] text-[#4a3426] leading-snug">
            {shared.audio && <p className="font-bold truncate">{shared.name || 'ჩანაწერი'}</p>}
            {shared.audio && <p className="text-[13px] text-[#8a7a6a]">გაიგზავნება ხმოვან შეტყობინებად, პირველი 5 წუთი</p>}
            {shared.text && <p className="whitespace-pre-wrap break-words line-clamp-4 mt-0.5">{shared.text}</p>}
          </div>
        </div>
        {!user ? (
          <p className="text-[14px] text-[#8a7a6a]">გასაზიარებლად შედი შენს ანგარიშზე.</p>
        ) : !classes.length ? (
          <p className="text-[14px] text-[#8a7a6a]">კლასში ჯერ არ ხარ — გასაზიარებელი არსად არის.</p>
        ) : state === 'sent' ? (
          <p className="flex items-center gap-2 text-[15px] font-bold text-[#2f7d4f]"><Check className="w-5 h-5" /> გაიგზავნა</p>
        ) : (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#8a7a6a]">რომელი კლასის ჩატში?</p>
            {classes.map(c => (
              <Btn key={c.id} kind="soft" full disabled={state === 'sending'} onClick={() => send(c.id)}
                icon={state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}>
                {c.name}
              </Btn>
            ))}
            {state === 'error' && <p className="text-[13px] text-[#b3261e]">ვერ გაიგზავნა — სცადე ხელახლა.</p>}
          </div>
        )}
      </div>
    </Sheet>
  );
};
