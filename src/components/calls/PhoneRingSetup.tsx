import React, { useEffect, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useCall } from '../../utils/callSession';
import { bindChatDevice, chatBoundToday, pushSupported } from '../../utils/groupPush';
import { Btn } from '../ui/kit';

// Calls and messages on this phone even with the app closed (worker/reminders /ring and /chat-notify, 2026-11-05).
// Where notifications are already allowed the phone is bound quietly (again once a day, so a renewed subscription stays
// in place). Where the browser has not been asked yet, a small card at the bottom asks once — a few seconds after the
// app opens, never during a service (the notes, the program, church mode) or a call; „მოგვიანებით“ = again in a week.

const LATER = 'sg-ring-ask-later';
const WEEK = 7 * 86400_000;
const askedLately = () => {
  try { return Date.now() - Number(localStorage.getItem(LATER) || 0) < WEEK; } catch { return false; }
};

export const PhoneRingSetup: React.FC = () => {
  const { user } = useAuth();
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const uid = user?.uid || '';
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!uid || !pushSupported()) return;
    if (Notification.permission === 'granted') {
      if (!chatBoundToday(uid)) void bindChatDevice(false);
      return;
    }
    if (Notification.permission !== 'default' || askedLately()) return;
    const t = window.setTimeout(() => setAsk(true), 4000);
    return () => window.clearTimeout(t);
  }, [uid]);

  // the card leaves by itself a moment after „ჩართულია“
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setAsk(false), 1800);
    return () => window.clearTimeout(t);
  }, [done]);

  const turnOn = async () => {
    setBusy(true);
    setErr('');
    const e = await bindChatDevice(true);
    setBusy(false);
    if (e) setErr(e);
    else setDone(true);
  };

  // the permission window could not open (the Android app, 2026-11-06): the person gives it in the phone's settings
  // and comes back — the card then binds the phone by itself
  useEffect(() => {
    if (!err || !ask) return;
    const back = () => {
      if (document.visibilityState === 'visible' && pushSupported() && Notification.permission === 'granted') void turnOn();
    };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [err, ask]);

  if (!ask || !uid || notes || programOpen || church || call.status !== 'idle') return null;
  const later = () => {
    try { localStorage.setItem(LATER, String(Date.now())); } catch { /* private window */ }
    setAsk(false);
  };

  return (
    <div
      className="fixed z-[80] left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+12px)] w-[min(440px,calc(100%-24px))] rounded-[28px] bg-white ring-1 ring-[#e8dcc8] shadow-[0_14px_40px_-8px_rgba(74,52,38,0.45)] p-4"
      role="dialog"
      aria-label="ზარები და შეტყობინებები ტელეფონზე"
    >
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${done ? 'bg-emerald-50 text-[#2f7d4f]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
          {done ? <Check className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-snug text-[#2a2017]">
            {done ? 'ჩართულია' : 'ზარები და შეტყობინებები ტელეფონზე'}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">
            {done
              ? 'აპი დახურულიც დარეკავს და შეგატყობინებს.'
              : 'რომ აპი დახურულიც დარეკოს, როცა გირეკავენ, და გაჩვენოს, როცა გწერენ.'}
          </p>
          {err && <p className="mt-1.5 text-[13px] font-semibold text-[#a02c2c]" role="alert">{err}</p>}
        </div>
      </div>
      {!done && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Btn kind="ghost" onClick={later} disabled={busy}>მოგვიანებით</Btn>
          <Btn kind="primary" icon={<BellRing />} onClick={turnOn} disabled={busy}>{busy ? 'ირთვება…' : 'ჩართვა'}</Btn>
        </div>
      )}
    </div>
  );
};

export default PhoneRingSetup;
