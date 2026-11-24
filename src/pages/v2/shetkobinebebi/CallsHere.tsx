import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BatteryCharging, BellRing, Check, Lock, PhoneCall, RefreshCw, Rocket, Volume2 } from 'lucide-react';
import { Button, Card, Dot, Rows, Row, SectionLabel, Two } from '../../../components/ui2';
import { bindChatDevice, myPhone, PhoneTest, pushSupported } from '../../../utils/groupPush';
import { iosCall } from '../../../utils/iosApp';

// „ზარები ამ ტელეფონზე“ (2026-11-24, the user: „რატომ არ ირეკება მოსწავლეებთან … უნდა რეკავდეს დაბლოკილ ეკრანზეც“): the
// first part of „შეტყობინებები“. Whether this phone rings for the person's calls with the app closed — asked of the
// reminders Worker (/my-phone), so it is the truth and not the device's guess —, „ჩართვა“ when it does not (before this
// the one-time card at the bottom was the only way, and „მოგვიანებით“ hid it for a week), and „სატესტო ზარი“: the server
// rings this phone ten seconds later, time to lock the screen, exactly as a class's call rings. The Play app from 1.2.2
// also tells what of its own stops a ring (`ringCheck`) and opens the right settings (`ringFix`): the call's screen on a
// locked phone (Android 14+ asks for it), the battery saver, Xiaomi's autostart, the calls' sound.

type Look = 'checking' | 'unsupported' | 'blocked' | 'off' | 'on' | 'error';
type Fix = 'fullScreen' | 'battery' | 'autostart' | 'channel' | 'notices';
interface RingCheck { fullScreen?: boolean | null; battery?: boolean; channel?: boolean; maker?: string }

const appCan = (what: string) => {
  const w = window as unknown as { sgApp?: { can?: string[] } };
  return Array.isArray(w.sgApp?.can) && w.sgApp!.can!.includes(what);
};

const TEST_SECONDS = 10;

export const CallsHere: React.FC = () => {
  const [look, setLook] = useState<Look>('checking');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<PhoneTest | null>(null);
  const [lost, setLost] = useState(false);
  const [app, setApp] = useState<RingCheck | null>(null);
  const testing = useRef(0);

  const check = useCallback(async () => {
    if (!pushSupported()) { setLook('unsupported'); return; }
    if (Notification.permission === 'denied') { setLook('blocked'); return; }
    if (appCan('ringCheck')) iosCall<RingCheck>('ringCheck').then(setApp, () => setApp(null));
    if (Notification.permission !== 'granted') { setLook('off'); return; }
    const me = await myPhone();
    if (!me) { setLook('error'); return; }
    setLook(me.bound ? 'on' : 'off');
    // a test whose answer the locked screen cut: its outcome waits on the server
    if (testing.current && me.last && Date.parse(me.last.at) >= testing.current) {
      setResult(me.last);
      setLost(false);
      testing.current = 0;
    }
  }, []);

  useEffect(() => { void check(); }, [check]);
  // back from the phone's settings (or from the locked screen after a test): look again
  useEffect(() => {
    const back = () => { if (document.visibilityState === 'visible') void check(); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [check]);

  const turnOn = async () => {
    setBusy(true);
    setErr('');
    const e = await bindChatDevice(true);
    setBusy(false);
    if (e) setErr(e);
    await check();
  };

  const test = async () => {
    setResult(null);
    setLost(false);
    testing.current = Date.now();
    setLeft(TEST_SECONDS);
    const tick = window.setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000);
    const me = await myPhone(true);
    window.clearInterval(tick);
    setLeft(0);
    if (me?.test) {
      setResult(me.test);
      testing.current = 0;
    } else {
      setLost(true);
    }
  };

  const fix = (what: Fix) => { iosCall('ringFix', { what }).catch(() => {}); };

  const rows: React.ReactNode[] = [];
  if (app?.fullScreen === false) {
    rows.push(<Row key="fs" lead={<Dot icon={<Lock />} color="gold" />} wrap title="ზარი ჩაკეტილ ეკრანზე"
      sub="ნება არ აქვს — ჩართე, რომ ზარმა ეკრანი აანთოს" right={<Button size="md" onClick={() => fix('fullScreen')}>ჩართვა</Button>} />);
  }
  if (app?.battery === false) {
    rows.push(<Row key="bat" lead={<Dot icon={<BatteryCharging />} color="gold" />} wrap title="ბატარეის დაზოგვა"
      sub="აპს აჩერებს — „ბატარეაში“ აირჩიე „შეზღუდვის გარეშე“" right={<Button size="md" onClick={() => fix('battery')}>გახსნა</Button>} />);
  }
  if (app?.maker === 'xiaomi') {
    rows.push(<Row key="auto" lead={<Dot icon={<Rocket />} color="gold" />} wrap title="ავტომატური გაშვება"
      sub="Xiaomi-ზე ჩართე საგანძურისთვის, რომ დახურულიც დარეკოს" right={<Button size="md" onClick={() => fix('autostart')}>გახსნა</Button>} />);
  }
  if (app?.channel === false) {
    rows.push(<Row key="ch" lead={<Dot icon={<Volume2 />} color="gold" />} wrap title="ზარის ხმა"
      sub="ამ აპის ზარებს ხმა გამორთული აქვს" right={<Button size="md" onClick={() => fix('channel')}>ჩართვა</Button>} />);
  }

  const head = look === 'on' ? { icon: <Check />, color: 'leaf' as const, title: 'ზარები ამ ტელეფონზე ჩართულია', sub: 'აპი დახურულიც დაგირეკავს' }
    : look === 'off' ? { icon: <BellRing />, color: 'gold' as const, title: 'ზარები ამ ტელეფონზე გამორთულია', sub: 'როცა აპი დახურულია, არ დაგირეკავს' }
    : look === 'blocked' ? { icon: <BellRing />, color: 'gold' as const, title: 'შეტყობინებები დაბლოკილია', sub: 'ჩართე ტელეფონის პარამეტრებში: აპები → საგანძური → შეტყობინებები' }
    : look === 'unsupported' ? { icon: <BellRing />, color: 'soft' as const, title: 'აქ ზარი დახურულზე ვერ მოვა', sub: 'გახსენი საგანძურის აპში ან Chrome-ში' }
    : look === 'error' ? { icon: <RefreshCw />, color: 'soft' as const, title: 'ვერ შევამოწმე', sub: 'ინტერნეტი შეამოწმე და სცადე თავიდან' }
    : { icon: <BellRing />, color: 'soft' as const, title: 'ვამოწმებ…', sub: '' };

  return (
    <>
      <SectionLabel label="ზარები ამ ტელეფონზე" />
      <Card pad="sm" className="flex flex-col gap-3" aria-busy={look === 'checking'}>
        <div className="flex items-center gap-3">
          <Dot icon={head.icon} color={head.color} />
          <Two wrap title={head.title} sub={head.sub || undefined} />
        </div>
        {err && <p role="alert" className="text-meta leading-snug font-semibold text-danger wrap-break-word">{err}</p>}
        {look === 'off' && <Button full disabled={busy} icon={<BellRing aria-hidden="true" />} onClick={() => void turnOn()}>{busy ? 'ირთვება…' : 'ჩართვა'}</Button>}
        {look === 'blocked' && appCan('ringFix') && <Button full kind="soft" onClick={() => fix('notices')}>პარამეტრების გახსნა</Button>}
        {look === 'error' && <Button full kind="soft" onClick={() => void check()}>თავიდან</Button>}
        {look === 'on' && (left > 0 ? (
          <p role="status" className="rounded-field bg-tint px-4 py-3 text-body font-semibold text-wine wrap-break-word">
            ახლა დაბლოკე ეკრანი — {left} წამში დაგირეკავს
          </p>
        ) : (
          <Button full kind="soft" icon={<PhoneCall aria-hidden="true" />} onClick={() => void test()}>სატესტო ზარი</Button>
        ))}
        {result && (
          <p role="status" className={`text-meta leading-snug wrap-break-word ${result.ok ? 'text-mut' : 'font-semibold text-danger'}`}>
            {!result.ok
              ? `ზარი ვერ გაიგზავნა (${result.why || 'უცნობი მიზეზი'}). გადატვირთე აპი და სცადე თავიდან.`
              : rows.length
                ? 'ზარი გაიგზავნა. თუ ტელეფონმა არ დარეკა, ქვემოთ ჩართე, რაც აჩერებს.'
                : 'ზარი გაიგზავნა. თუ ტელეფონმა არ დარეკა, ტელეფონის პარამეტრებში საგანძურს „ბატარეაში“ მიეცი „შეზღუდვის გარეშე“.'}
          </p>
        )}
        {lost && !result && <p role="status" className="text-meta leading-snug text-mut">პასუხი ჯერ არ მოსულა — ეკრანზე დაბრუნებისას გამოჩნდება.</p>}
      </Card>
      {rows.length > 0 && <Rows>{rows}</Rows>}
    </>
  );
};
