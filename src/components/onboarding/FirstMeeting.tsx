import React, { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, DocumentData, onSnapshot, setDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { hasGeorgianName, isGeorgian, saveProfileName } from '../../utils/memberName';
import { Btn, Sheet } from '../ui/kit';
import { EMAIL_FIELD } from '../access/SignInChoices';

// "პირველი გაცნობა": a member whose profile has no Georgian name yet (everyone who signs in by e-mail, and new
// Google members) gets two short screens: who they are (name and surname, Georgian letters only) and which voice
// they sing. The answers go into the profile (students/{uid}.profile, directory/{uid}).
// Done once: students/{uid}.firstMeeting. "მოგვიანებით" hides it until the next visit.

type Voice = '1' | '2' | '3';

const VOICES: { id: Voice | 'x'; title: string; sub: string }[] = [
  { id: '1', title: 'I ხმა', sub: 'მთქმელი' },
  { id: '2', title: 'II ხმა', sub: 'მოძახილი' },
  { id: '3', title: 'III ხმა', sub: 'ბანი' },
  { id: 'x', title: 'არ ვიცი', sub: 'მასწავლებელი დაგეხმარებათ' },
];

const LATER_KEY = 'sgFirstMeetingLater';
const NOT_GEORGIAN = /[^ა-ჿᲐ-Ჿ\s-]/g;

const laterThisVisit = (uid: string) => {
  try { return sessionStorage.getItem(LATER_KEY) === uid; } catch { return false; }
};

const Choice: React.FC<{ on: boolean; onClick: () => void; title: string; sub: string }> = ({ on, onClick, title, sub }) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={on}
    onClick={onClick}
    className={`w-full min-h-[60px] flex items-center gap-3 px-4 py-3 rounded-2xl text-left cursor-pointer transition ${
      on ? 'bg-[#7a2028]/[0.07] ring-2 ring-[#7a2028]' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
    }`}
  >
    <span
      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg ${
        on ? 'bg-[#7a2028] text-white' : 'bg-white ring-2 ring-[#d9c8ac]'
      }`}
      aria-hidden
    >
      {on && <Check className="w-4.5 h-4.5" strokeWidth={3} />}
    </span>
    <span className="min-w-0">
      <span className="block text-[16px] font-bold text-[#2a2017] leading-tight">{title}</span>
      <span className="block mt-0.5 text-[13px] text-[#8a7a6a] leading-snug">{sub}</span>
    </span>
  </button>
);

export const FirstMeeting: React.FC = () => {
  const { user } = useAuth();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const [data, setData] = useState<DocumentData | null | undefined>(undefined);
  const [closed, setClosed] = useState(false);

  const [step, setStep] = useState(0);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [latin, setLatin] = useState(false);
  const [voices, setVoices] = useState<Set<Voice | 'x'>>(new Set());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    setData(undefined);
    setClosed(false);
    setPrefilled(false);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'students', uid),
      { includeMetadataChanges: false },
      snap => {
        // a device that has never seen this record answers "missing" from its cache first: wait for the server
        if (!snap.exists() && snap.metadata.fromCache) return;
        setData(snap.exists() ? snap.data() : null);
      },
      () => setData(undefined)
    );
  }, [uid]);

  const profile = data?.profile || {};

  // start from what is already known: a Georgian profile or Google name, the voices already marked
  useEffect(() => {
    if (data === undefined || prefilled || !user) return;
    setPrefilled(true);
    const parts = (user.displayName || '').trim().split(/\s+/);
    const f = profile.firstName || parts[0] || '';
    const l = profile.lastName || parts.slice(1).join(' ') || '';
    setFirst(isGeorgian(f) ? f : '');
    setLast(isGeorgian(l) ? l : '');
    const known = Array.isArray(profile.voices) ? profile.voices.filter((v: string) => v === '1' || v === '2' || v === '3') : [];
    setVoices(new Set(known));
  }, [data, prefilled, user, profile]);

  if (!uid || !user || data === undefined || closed) return null;
  if (data?.firstMeeting || hasGeorgianName(profile) || laterThisVisit(uid)) return null;

  const later = () => {
    try { sessionStorage.setItem(LATER_KEY, uid); } catch { /* asked again on the next render */ }
    setClosed(true);
  };

  const georgianOnly = (value: string, set: (v: string) => void) => {
    const kept = value.replace(NOT_GEORGIAN, '');
    setLatin(kept !== value);
    set(kept.replace(/\s{2,}/g, ' '));
    setError('');
  };

  const toggleVoice = (id: Voice | 'x') => {
    setError('');
    setVoices(prev => {
      if (id === 'x') return prev.has('x') ? new Set() : new Set(['x']);
      const next = new Set(prev);
      next.delete('x');
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const next = () => {
    if (step === 0) {
      if (!isGeorgian(first) || !isGeorgian(last)) {
        setError('ჩაწერეთ სახელიც და გვარიც ქართული ასოებით.');
        return;
      }
      setFirst(first.trim());
      setLast(last.trim());
    }
    setError('');
    setStep(s => s + 1);
  };

  const finish = async () => {
    if (voices.size === 0) { setError('მონიშნეთ ხმა ან „არ ვიცი“.'); return; }
    setSaving(true);
    setError('');
    try {
      const name = { firstName: first.trim(), lastName: last.trim(), churchName: profile.churchName || '' };
      await saveProfileName(uid, name, user.photoURL || '');
      const patch: Record<string, unknown> = {
        profile: { voices: [...voices].filter((v): v is Voice => v !== 'x').sort() },
        firstMeeting: { voiceUnknown: voices.has('x'), at: new Date().toISOString() },
      };
      await setDoc(doc(db, 'students', uid), patch, { merge: true });
      // members who came by e-mail have no name in their account: give them this one
      if (!user.displayName) await updateProfile(user, { displayName: `${name.firstName} ${name.lastName}` }).catch(() => {});
      setClosed(true);
    } catch {
      setError('ვერ შეინახა. შეამოწმეთ ინტერნეტი და სცადეთ თავიდან.');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex items-center gap-2">
      {step > 0 && (
        <Btn kind="ghost" size="lg" icon={<ArrowLeft />} onClick={() => { setError(''); setStep(s => s - 1); }} disabled={saving}>
          უკან
        </Btn>
      )}
      <div className="flex-1" />
      {step < 1 ? (
        <Btn size="lg" onClick={next}>
          შემდეგი <ArrowRight />
        </Btn>
      ) : (
        <Btn size="lg" icon={<Check />} onClick={() => void finish()} disabled={saving}>
          {saving ? 'ინახება…' : 'დასრულება'}
        </Btn>
      )}
    </div>
  );

  return (
    <Sheet open onClose={later} title="მოგესალმებით!" footer={footer}>
      <div className="space-y-4 py-1">
        <div className="flex items-center gap-1.5" aria-label={`ნაბიჯი ${step + 1} ორიდან`}>
          {[0, 1].map(i => (
            <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#7a2028]' : 'bg-[#e8dcc8]'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <div>
              <h4 className="font-serif-ge text-[20px] font-bold text-[#2a2017]">ვინ ხართ?</h4>
              <p className="mt-1 text-[15px] text-[#75685a] leading-relaxed">
                სახელი და გვარი ქართული ასოებით. ასე გიპოვით მასწავლებელი და ჯგუფი.
              </p>
            </div>
            <div>
              <label htmlFor="sg-first-name" className="block mb-1.5 text-[15px] font-bold text-[#4a3426]">სახელი</label>
              <input
                id="sg-first-name"
                lang="ka"
                autoComplete="given-name"
                value={first}
                onChange={e => georgianOnly(e.target.value, setFirst)}
                className={EMAIL_FIELD}
              />
            </div>
            <div>
              <label htmlFor="sg-last-name" className="block mb-1.5 text-[15px] font-bold text-[#4a3426]">გვარი</label>
              <input
                id="sg-last-name"
                lang="ka"
                autoComplete="family-name"
                value={last}
                onChange={e => georgianOnly(e.target.value, setLast)}
                className={EMAIL_FIELD}
              />
            </div>
            {latin && !error && (
              <p className="text-[14px] font-semibold text-[#9a6212] leading-snug">
                გთხოვთ, ქართული ასოებით — ჩართეთ ქართული კლავიატურა.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <h4 className="font-serif-ge text-[20px] font-bold text-[#2a2017]">რომელ ხმას გალობთ?</h4>
              <p className="mt-1 text-[15px] text-[#75685a] leading-relaxed">შეგიძლიათ რამდენიმე მონიშნოთ.</p>
            </div>
            <div className="space-y-2">
              {VOICES.map(v => (
                <Choice key={v.id} on={voices.has(v.id)} onClick={() => toggleVoice(v.id)} title={v.title} sub={v.sub} />
              ))}
            </div>
          </>
        )}

        {error && <p role="alert" className="text-[14px] font-semibold text-[#9b2c2c] leading-snug">{error}</p>}

        {step === 0 && (
          <button type="button" onClick={later} className="block mx-auto py-2 text-[14px] font-semibold text-[#8a7a6a] underline underline-offset-4 cursor-pointer">
            მოგვიანებით
          </button>
        )}
      </div>
    </Sheet>
  );
};
