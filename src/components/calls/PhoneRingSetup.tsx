import React, { useEffect, useState } from 'react';
import { BellRing, Check } from 'lucide-react';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useCall } from '../../utils/callSession';
import { bindChatDevice, chatBoundFresh, pushSupported } from '../../utils/groupPush';
import { Btn } from '../ui/kit';
import { useNewLook } from '../../design/newLook';
import { RingAsk } from '../../pages/v2/shetkobinebebi/RingAsk';
import { iosCall, isIphoneApp } from '../../utils/iosApp';

// Calls and messages on this phone even with the app closed (worker/reminders /ring and /chat-notify, 2026-11-05).
// Where notifications are already allowed the phone is bound quietly (again once a day, so a renewed subscription stays
// in place). Where the browser has not been asked yet, a small card at the bottom asks once — a few seconds after the
// app opens, never during a service (the notes, the program, church mode) or a call; „მოგვიანებით“ = again in a week.

// the iPhone app without its push parts (null: not asked yet)
let iphoneNoPush: boolean | null = null;

const LATER = 'sg-ring-ask-later';
const DAY = 86400_000;
// a student is asked again the next day until the phone rings for calls (2026-11-24, the user: „ზარი არ შედის არავისთან“ —
// the week's pause left most phones unbound); the staff keep the week (2026-11-12, the user: „წარამარა ამას მწერ“)
const askedWithin = (gap: number) => {
  try { return Date.now() - Number(localStorage.getItem(LATER) || 0) < gap; } catch { return false; }
};
const appCan = (what: string) => {
  const w = window as unknown as { sgApp?: { can?: string[]; call?: (fn: string, a?: unknown) => Promise<unknown> } };
  return Array.isArray(w.sgApp?.can) && w.sgApp!.can!.includes(what);
};
/** the Play app (1.2.2+) opens its own notification settings */
const openNoticeSettings = () => {
  const w = window as unknown as { sgApp?: { call: (fn: string, a?: unknown) => Promise<unknown> } };
  w.sgApp?.call('ringFix', { what: 'notices' }).catch(() => {});
};

export const PhoneRingSetup: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const askedLately = () => askedWithin(isTeacher ? 7 * DAY : DAY);
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  // the new look draws the card of board x-zarebi-baneri over the bottom menu
  const nl = useNewLook();
  const uid = user?.uid || '';
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  // the store apps' Notification.permission comes from the app a moment after the page starts (and the phone's settings
  // can change it while the app is away): a granted phone that is not bound yet is bound a little later and on every
  // coming back too, so a call never misses an app phone that only answered late (2026-11-24, „აპში არ რეკავს“)
  useEffect(() => {
    if (!uid || !pushSupported()) return;
    const again = () => {
      if (document.visibilityState === 'visible' && Notification.permission === 'granted' && !chatBoundFresh(uid)) void bindChatDevice(false);
    };
    const t = window.setTimeout(again, 3000);
    document.addEventListener('visibilitychange', again);
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', again); };
  }, [uid]);

  useEffect(() => {
    if (!uid || !pushSupported()) return;
    let live = true;
    let t = 0;
    void (async () => {
      // the iPhone app rings only once its push is set up (GoogleService-Info.plist + the APNs key): no card it cannot keep
      if (isIphoneApp() && iphoneNoPush === null) {
        const info = await iosCall<{ firebase?: boolean }>('info').catch(() => null);
        iphoneNoPush = !info?.firebase;
      }
      if (!live || (isIphoneApp() && iphoneNoPush)) return;
      if (Notification.permission === 'granted') {
        if (chatBoundFresh(uid)) return;
        // allowed but not bound: say why it failed (at most once a day for a student, a week for the staff)
        const e = await bindChatDevice(false);
        if (live && e && !askedLately()) { setErr(e); setAsk(true); }
        return;
      }
      // not asked yet, or blocked in the phone's settings: the card says what to do
      if (askedLately()) return;
      t = window.setTimeout(() => { if (live) setAsk(true); }, 4000);
    })();
    return () => { live = false; window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // the card leaves by itself a moment after „ჩართულია“
  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setAsk(false), 1800);
    return () => window.clearTimeout(t);
  }, [done]);

  const turnOn = async () => {
    // blocked: only the phone's settings can turn it on (the Play app opens them; elsewhere the card says the way)
    if (pushSupported() && Notification.permission === 'denied' && appCan('ringFix')) { openNoticeSettings(); return; }
    setBusy(true);
    setErr('');
    const e = await bindChatDevice(true);
    setBusy(false);
    if (e) {
      setErr(e);
      // a failed try counts as „მოგვიანებით“: the card does not come back on every opening (2026-11-12, the user:
      // „წარამარა ამას მწერ“); coming back from the phone's settings with notifications on still binds (below)
      try { localStorage.setItem(LATER, String(Date.now())); } catch { /* private window */ }
    } else setDone(true);
  };

  // the Android app's first opening asks the phone itself: once allowed, bind at once and drop the card
  useEffect(() => {
    if (!uid) return;
    const changed = () => {
      if (!pushSupported() || Notification.permission !== 'granted') return;
      setAsk(false);
      void bindChatDevice(false);
    };
    window.addEventListener('sg-notify-perm', changed);
    return () => window.removeEventListener('sg-notify-perm', changed);
  }, [uid]);

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

  const blocked = pushSupported() && Notification.permission === 'denied';
  if (nl) {
    return (
      <RingAsk done={done} busy={busy} err={err} overNav={false} onLater={later} onTurnOn={() => void turnOn()}
        blocked={blocked} canOpen={appCan('ringFix')} />
    );
  }
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
