import React, { useEffect, useState } from 'react';
import { Check, Loader2, MessageCircle, Mic } from 'lucide-react';
import { useAuth } from '../../context';
import { useMyClasses } from '../../hooks/useClasses';
import { ChatAuthor, classChatBase, sendTextMessage, sendVoiceMessage } from '../../hooks/useClassChat';
import { VOICE_MAX_SECONDS, toSmallMp3 } from '../../utils/voiceRecorder';
import { triggerHaptic } from '../../utils/haptics';
import { Avatar, Dot, Row, Rows, Sheet } from '../ui2';

// „გაზიარება → საგანძური“: a recording or a text shared from another app on the phone waits in the service worker's
// cache 'sg-share' (public/prayer-notify-sw.js) and the page opens at /?open=share. This window asks which class chat it
// goes to and sends it as the member's own message — a recording as a voice message (its first five minutes, made small
// like the app's own voice messages). Nothing is sent without that choice; ✕ throws the share away.

interface Shared { audio: Blob | null; name: string; text: string; at: number }

// a share the service worker kept less than this long ago still counts when the address lost its `?open=share` mark
const FRESH_MS = 10 * 60_000;

const readShare = async (): Promise<Shared | null> => {
  if (!('caches' in window)) return null;
  const cache = await caches.open('sg-share');
  const [a, t] = await Promise.all([cache.match('/share/audio'), cache.match('/share/text')]);
  if (!a && !t) return null;
  const audio = a ? await a.blob() : null;
  const name = a ? decodeURIComponent(a.headers.get('X-Name') || '') : '';
  const text = t ? (await t.text()).slice(0, 2000) : '';
  const at = Number((a || t)!.headers.get('X-At')) || 0;
  return { audio, name, text, at };
};
const clearShare = () => caches.open('sg-share').then(c => Promise.all([c.delete('/share/audio'), c.delete('/share/text')])).catch(() => undefined);

export const ShareHost: React.FC = () => {
  const { user } = useAuth();
  const classes = useMyClasses(user?.uid).filter(c => !c.archived);
  const [shared, setShared] = useState<Shared | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    // the address's mark can be gone before this lazy part is ready (a page step in the new look rewrites the address),
    // so a share the worker kept in the last minutes opens it too
    const url = new URL(window.location.href);
    const marked = url.searchParams.get('open') === 'share';
    if (marked) {
      url.searchParams.delete('open');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    readShare().then(s => { if (s && (marked || Date.now() - s.at < FRESH_MS)) setShared(s); }).catch(() => undefined);
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
    <Sheet open onClose={close} title="გაზიარება კლასში">
      <div className="flex items-start gap-3 rounded-card bg-tint px-4 py-3.5">
        <Dot icon={shared.audio ? <Mic /> : <MessageCircle />} size={40} className="bg-surf" />
        <div className="min-w-0 pt-0.5 text-body text-ink">
          {shared.audio && <p className="truncate font-bold">{shared.name || 'ჩანაწერი'}</p>}
          {shared.audio && <p className="text-meta text-mut">გაიგზავნება ხმოვან შეტყობინებად, პირველი 5 წუთი</p>}
          {shared.text && <p className="mt-0.5 line-clamp-4 break-words whitespace-pre-wrap">{shared.text}</p>}
        </div>
      </div>
      {!user ? (
        <p className="text-body text-mut">გასაზიარებლად შედი შენს ანგარიშზე.</p>
      ) : !classes.length ? (
        <p className="text-body text-mut">კლასში ჯერ არ ხარ — გასაზიარებელი არსად არის.</p>
      ) : state === 'sent' ? (
        <p className="flex items-center gap-2 text-lead font-bold text-leaf-ink"><Check className="size-5" /> გაიგზავნა</p>
      ) : (
        <>
          <p className="px-1 text-meta font-bold text-mut">რომელი კლასის ჩატში?</p>
          <Rows>
            {classes.map(c => (
              <Row key={c.id} lead={<Avatar name={c.name} photo={c.logo} />} title={c.name} sub={`${c.members.length} წევრი`}
                disabled={state === 'sending'}
                right={state === 'sending' ? <Loader2 className="size-5 shrink-0 animate-spin text-mut" /> : 'chev'}
                onClick={() => send(c.id)} />
            ))}
          </Rows>
          {state === 'error' ? <p className="px-1 text-meta text-danger">ვერ გაიგზავნა — სცადე ხელახლა.</p>
            : <p className="px-1 text-meta text-mut">შეხებისთანავე იგზავნება.</p>}
        </>
      )}
    </Sheet>
  );
};
