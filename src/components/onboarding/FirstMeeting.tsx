import React, { Fragment, useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, DocumentData, onSnapshot, setDoc } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Check, ChevronDown, LogOut } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { hasGeorgianName, isGeorgian, saveProfileName } from '../../utils/memberName';
import { MONTHS_GE } from '../../utils/dateNames';
import {
  ABILITY_OPTIONS, AbilityId, GEORGIAN_REGIONS, INTEREST_OPTIONS, InterestId, daysInMonth, isPlaceholderBirth,
  abilitiesOf, normalizePhone, profileComplete, showPhone, validBirth,
} from '../../utils/profileFields';
import { INSTRUMENTS_LIST } from '../../data/instrumentsData';
import { Btn, Sheet } from '../ui/kit';
import { EMAIL_FIELD } from '../access/SignInChoices';
import { useMembership } from '../../utils/memberAccess';

// "პირველი გაცნობა": until a member's profile holds everything below, this form covers the app and cannot be
// closed (only "გამოსვლა"). Seven short cards, one question each, with what is already known filled in: name and
// surname (Georgian letters), birth date, region and town or village, phone, abilities (with the instruments they
// play and where they chant), interests, voices. The answers go into
// the profile (students/{uid}.profile, the same fields the profile card edits) and directory/{uid} (name only);
// students/{uid}.firstMeeting marks it done. It waits while the notes page, the liturgy program or church mode is
// open, so nothing covers the notes during a service.

type Voice = '1' | '2' | '3';

const VOICES: { id: Voice | 'x'; title: string; sub: string }[] = [
  { id: '1', title: 'I ხმა', sub: 'მთქმელი' },
  { id: '2', title: 'II ხმა', sub: 'მოძახილი' },
  { id: '3', title: 'III ხმა', sub: 'ბანი' },
  { id: 'x', title: 'არ ვიცი', sub: 'მასწავლებელი დაგეხმარებათ' },
];

const STEPS = 7;
const PHONE_EXAMPLE = '599\u00a012\u00a034\u00a056'; // kept on one line
const NOT_GEORGIAN = /[^ა-ჿᲐ-Ჿ\s-]/g;
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1919 }, (_, i) => THIS_YEAR - i);

interface Answers {
  first: string;
  last: string;
  day: number;
  month: number;
  year: number;
  region: string;
  city: string;
  phone: string;
  abilities: AbilityId[];
  abilityOther: string;
  instruments: string[];
  chantPlace: string;
  interests: InterestId[];
  interestOther: string;
  voices: (Voice | 'x')[];
}

const EMPTY: Answers = {
  first: '', last: '', day: 0, month: 0, year: 0, region: '', city: '', phone: '',
  abilities: [], abilityOther: '', instruments: [], chantPlace: '', interests: [], interestOther: '', voices: [],
};

const short = (v: string) => v.trim().length < 2;

/** What is missing on a card ('' = fine). */
const problem = (a: Answers, step: number) => {
  switch (step) {
    case 0: return isGeorgian(a.first) && isGeorgian(a.last) ? '' : 'ჩაწერეთ სახელიც და გვარიც ქართული ასოებით.';
    case 1: return validBirth(a) ? '' : 'აირჩიეთ რიცხვი, თვე და წელი.';
    case 2: return !a.region ? 'აირჩიეთ რეგიონი.' : a.city.trim().length < 2 ? 'ჩაწერეთ ქალაქი ან სოფელი.' : '';
    case 3: return normalizePhone(a.phone) ? '' : `ჩაწერეთ ტელეფონის ნომერი, მაგალითად: ${PHONE_EXAMPLE}`;
    case 4:
      if (!a.abilities.length) return 'მონიშნეთ ერთი მაინც.';
      if (a.abilities.includes('galoba') && short(a.chantPlace)) return 'ჩაწერეთ, სად გალობთ.';
      if (a.abilities.includes('dakvra') && !a.instruments.length) return 'აირჩიეთ, რაზე უკრავთ.';
      if (a.abilities.includes('skhva') && short(a.abilityOther)) return 'ჩაწერეთ, რა შეგიძლიათ.';
      return '';
    case 5:
      if (!a.interests.length) return 'მონიშნეთ ერთი მაინც.';
      if (a.interests.includes('skhva') && short(a.interestOther)) return 'ჩაწერეთ, რა გაინტერესებთ.';
      return '';
    case 6: return a.voices.length ? '' : 'მონიშნეთ ხმა ან „არ ვიცი“.';
  }
  return '';
};

/** A follow-up question that opens right under the choice it belongs to. */
const FollowUp: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ml-3 pl-4 py-2 border-l-[3px] border-[#7a2028]/25">{children}</div>
);

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
      className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg ${on ? 'bg-[#7a2028] text-white' : 'bg-white ring-2 ring-[#d9c8ac]'}`}
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

const FieldLabel: React.FC<{ htmlFor: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block mb-1.5 text-[15px] font-bold text-[#4a3426]">{children}</label>
);

/** A native list (the phone opens its own wheel), styled like the text fields. */
const Pick: React.FC<{ id: string; value: string | number; onChange: (v: string) => void; placeholder: string; children: React.ReactNode }> = ({
  id, value, onChange, placeholder, children,
}) => (
  <div className="relative">
    <select
      id={id}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`${EMAIL_FIELD} appearance-none pl-3.5 pr-9 cursor-pointer ${value ? '' : 'text-[#b3a594]'}`}
    >
      <option value="" disabled>{placeholder}</option>
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8a7a6a]" aria-hidden />
  </div>
);

const Heading: React.FC<{ title: string; text?: string }> = ({ title, text }) => (
  <div>
    <h4 className="font-serif-ge text-[20px] font-bold text-[#2a2017]">{title}</h4>
    {text && <p className="mt-1 text-[15px] text-[#75685a] leading-relaxed">{text}</p>}
  </div>
);

export const FirstMeeting: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const membership = useMembership().status;
  const { notes, programOpen, church } = useNotes();
  const uid = user && !user.isAnonymous ? user.uid : null;
  const [data, setData] = useState<DocumentData | null | undefined>(undefined);
  const [closed, setClosed] = useState(false);
  const [a, setA] = useState<Answers>(EMPTY);
  const [step, setStep] = useState(0);
  const [latin, setLatin] = useState(false);
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
      snap => {
        // a device that has never seen this record answers "missing" from its cache first: wait for the server
        if (!snap.exists() && snap.metadata.fromCache) return;
        setData(snap.exists() ? snap.data() : null);
      },
      () => setData(undefined)
    );
  }, [uid]);

  const profile = data?.profile || {};

  // start from what is already known, on the first card that still needs an answer
  useEffect(() => {
    if (data === undefined || prefilled || !user) return;
    setPrefilled(true);
    const parts = (user.displayName || '').trim().split(/\s+/);
    const f = profile.firstName || parts[0] || '';
    const l = profile.lastName || parts.slice(1).join(' ') || '';
    const b = profile.birthDate || {};
    const birthKnown = validBirth(b) && (!!data?.firstMeeting || !isPlaceholderBirth(b));
    const phone = normalizePhone(profile.phone);
    const voices: (Voice | 'x')[] = Array.isArray(profile.voices) ? profile.voices.filter((v: string) => v === '1' || v === '2' || v === '3') : [];
    const known: Answers = {
      first: isGeorgian(f) ? f : '',
      last: isGeorgian(l) ? l : '',
      day: birthKnown ? b.day : 0,
      month: birthKnown ? b.month : 0,
      year: birthKnown ? b.year : 0,
      region: GEORGIAN_REGIONS.includes(profile.region) ? profile.region : '',
      city: profile.city || '',
      phone: phone ? showPhone(phone) : profile.phone || '',
      abilities: abilitiesOf(profile),
      abilityOther: profile.abilityOther || '',
      instruments: Array.isArray(profile.instruments) ? profile.instruments.filter((x: string) => INSTRUMENTS_LIST.some(i => i.id === x)) : [],
      chantPlace: profile.chantPlace || '',
      interests: Array.isArray(profile.interests) ? profile.interests.filter((x: string): x is InterestId => INTEREST_OPTIONS.some(o => o.id === x)) : [],
      interestOther: profile.interestOther || '',
      voices: voices.length ? voices : data?.firstMeeting?.voiceUnknown ? ['x'] : [],
    };
    setA(known);
    const gap = Array.from({ length: STEPS }, (_, i) => i).find(s => problem(known, s));
    setStep(gap ?? 0);
  }, [data, prefilled, user, profile]);

  if (!uid || !user || data === undefined || closed || !prefilled) return null;
  if (notes || programOpen || church) return null;
  // one a superadmin refused is signed out at once (MembershipGate): nothing to fill in
  if (membership === 'rejected') return null;
  if (profileComplete(data)) return null;

  const isNew = !hasGeorgianName(profile) && !data?.firstMeeting;
  const set = (patch: Partial<Answers>) => { setA(prev => ({ ...prev, ...patch })); setError(''); };

  const georgianOnly = (value: string, key: 'first' | 'last') => {
    const kept = value.replace(NOT_GEORGIAN, '');
    setLatin(kept !== value);
    set({ [key]: kept.replace(/\s{2,}/g, ' ') });
  };

  const setBirth = (patch: Partial<Pick<Answers, 'day' | 'month' | 'year'>>) => {
    const next = { ...a, ...patch };
    // 31 April and the like: the day is chosen again
    if (next.day && next.month && next.day > daysInMonth(next.year, next.month)) next.day = 0;
    set({ day: next.day, month: next.month, year: next.year });
  };

  const toggle = <T extends string>(list: T[], id: T): T[] => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  // „ჯერ ვიწყებ“ stands alone
  const toggleAbility = (id: AbilityId) => {
    if (id === 'beginner') set({ abilities: a.abilities.includes('beginner') ? [] : ['beginner'] });
    else set({ abilities: toggle(a.abilities.filter(x => x !== 'beginner'), id) });
  };

  const toggleVoice = (id: Voice | 'x') => {
    if (id === 'x') set({ voices: a.voices.includes('x') ? [] : ['x'] });
    else set({ voices: toggle(a.voices.filter(v => v !== 'x'), id) });
  };

  const next = () => {
    const p = problem(a, step);
    if (p) { setError(p); return; }
    if (step === 0) set({ first: a.first.trim(), last: a.last.trim() });
    if (step === 3) set({ phone: showPhone(normalizePhone(a.phone)!) });
    setStep(s => s + 1);
  };

  const finish = async () => {
    const p = problem(a, STEPS - 1);
    if (p) { setError(p); return; }
    setSaving(true);
    setError('');
    try {
      const name = { firstName: a.first.trim(), lastName: a.last.trim(), churchName: profile.churchName || '' };
      await saveProfileName(uid, name, user.photoURL || '');
      await setDoc(doc(db, 'students', uid), {
        profile: {
          birthDate: { year: a.year, month: a.month, day: a.day },
          region: a.region,
          city: a.city.trim(),
          phone: normalizePhone(a.phone),
          abilities: a.abilities,
          abilityOther: a.abilities.includes('skhva') ? a.abilityOther.trim() : '',
          instruments: a.abilities.includes('dakvra') ? INSTRUMENTS_LIST.map(i => i.id).filter(id => a.instruments.includes(id)) : [],
          chantPlace: a.abilities.includes('galoba') ? a.chantPlace.trim() : '',
          interests: INTEREST_OPTIONS.map(o => o.id).filter(id => a.interests.includes(id)),
          interestOther: a.interests.includes('skhva') ? a.interestOther.trim() : '',
          voices: a.voices.filter((v): v is Voice => v !== 'x').sort(),
        },
        firstMeeting: { voiceUnknown: a.voices.includes('x'), at: new Date().toISOString() },
      }, { merge: true });
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
      {step < STEPS - 1 ? (
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
    <Sheet open locked onClose={() => {}} title={isNew ? 'მოგესალმებით!' : 'შეავსეთ პროფილი'} footer={footer}>
      <div className="space-y-4 py-1">
        <div>
          <div className="flex items-center gap-1.5" aria-label={`ნაბიჯი ${step + 1} ${STEPS}-დან`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[#7a2028]' : 'bg-[#e8dcc8]'}`} />
            ))}
          </div>
          <p className="mt-2 text-[13px] text-[#8a7a6a]">ყველა ველი სავალდებულოა · {step + 1} / {STEPS}</p>
        </div>

        {step === 0 && (
          <>
            <Heading title="ვინ ხართ?" text="სახელი და გვარი ქართული ასოებით. ასე გიპოვით მასწავლებელი და ჯგუფი." />
            <div>
              <FieldLabel htmlFor="sg-first-name">სახელი</FieldLabel>
              <input id="sg-first-name" lang="ka" autoComplete="given-name" value={a.first} onChange={e => georgianOnly(e.target.value, 'first')} className={EMAIL_FIELD} />
            </div>
            <div>
              <FieldLabel htmlFor="sg-last-name">გვარი</FieldLabel>
              <input id="sg-last-name" lang="ka" autoComplete="family-name" value={a.last} onChange={e => georgianOnly(e.target.value, 'last')} className={EMAIL_FIELD} />
            </div>
            {latin && !error && (
              <p className="text-[14px] font-semibold text-[#9a6212] leading-snug">გთხოვთ, ქართული ასოებით — ჩართეთ ქართული კლავიატურა.</p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <Heading title="დაბადების თარიღი" text="აირჩიეთ სიიდან." />
            <div className="grid grid-cols-[0.9fr_1.75fr_1.2fr] gap-2">
              <div>
                <FieldLabel htmlFor="sg-birth-day">რიცხვი</FieldLabel>
                <Pick id="sg-birth-day" value={a.day} placeholder="—" onChange={v => setBirth({ day: Number(v) })}>
                  {Array.from({ length: a.month ? daysInMonth(a.year, a.month) : 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                </Pick>
              </div>
              <div>
                <FieldLabel htmlFor="sg-birth-month">თვე</FieldLabel>
                <Pick id="sg-birth-month" value={a.month} placeholder="—" onChange={v => setBirth({ month: Number(v) })}>
                  {MONTHS_GE.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Pick>
              </div>
              <div>
                <FieldLabel htmlFor="sg-birth-year">წელი</FieldLabel>
                <Pick id="sg-birth-year" value={a.year} placeholder="—" onChange={v => setBirth({ year: Number(v) })}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </Pick>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Heading title="სად ცხოვრობთ?" />
            <div>
              <FieldLabel htmlFor="sg-region">რეგიონი</FieldLabel>
              <Pick id="sg-region" value={a.region} placeholder="აირჩიეთ რეგიონი" onChange={v => set({ region: v })}>
                {GEORGIAN_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </Pick>
            </div>
            <div>
              <FieldLabel htmlFor="sg-city">ქალაქი ან სოფელი</FieldLabel>
              <input id="sg-city" lang="ka" autoComplete="address-level2" value={a.city} onChange={e => set({ city: e.target.value })} className={EMAIL_FIELD} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <Heading title="ტელეფონის ნომერი" text={`მაგალითად: ${PHONE_EXAMPLE}. ბავშვისთვის ჩაწერეთ მშობლის ნომერი.`} />
            <div>
              <FieldLabel htmlFor="sg-phone">ნომერი</FieldLabel>
              <input id="sg-phone" type="tel" inputMode="tel" autoComplete="tel" value={a.phone} onChange={e => set({ phone: e.target.value })} className={EMAIL_FIELD} />
            </div>
            <p className="text-[13px] text-[#8a7a6a] leading-relaxed">ნომერს ხედავენ მხოლოდ თქვენი მასწავლებლები და სკოლის ადმინისტრაცია.</p>
          </>
        )}

        {step === 4 && (
          <>
            <Heading title="შესაძლებლობები" text="რა შეგიძლიათ? შეგიძლიათ რამდენიმე მონიშნოთ." />
            <div className="space-y-2">
              {ABILITY_OPTIONS.map(o => {
                const on = a.abilities.includes(o.id);
                return (
                  <Fragment key={o.id}>
                    <Choice on={on} onClick={() => toggleAbility(o.id)} title={o.title} sub={o.sub} />
                    {on && o.id === 'galoba' && (
                      <FollowUp>
                        <FieldLabel htmlFor="sg-chant-place">სად გალობთ?</FieldLabel>
                        <input id="sg-chant-place" lang="ka" placeholder="ტაძარი, ქალაქი ან სოფელი" value={a.chantPlace}
                          onChange={e => set({ chantPlace: e.target.value })} className={EMAIL_FIELD} />
                      </FollowUp>
                    )}
                    {on && o.id === 'dakvra' && (
                      <FollowUp>
                        <p className="mb-2 text-[14px] font-bold text-[#4a3426]">რაზე უკრავთ?</p>
                        <div className="flex flex-wrap gap-2">
                          {INSTRUMENTS_LIST.map(i => {
                            const picked = a.instruments.includes(i.id);
                            return (
                              <button key={i.id} type="button" role="checkbox" aria-checked={picked}
                                onClick={() => set({ instruments: toggle(a.instruments, i.id) })}
                                className={`h-11 px-4 inline-flex items-center gap-1.5 rounded-full text-[15px] font-semibold cursor-pointer transition ${
                                  picked ? 'bg-[#7a2028] text-white' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                                }`}>
                                {picked && <Check className="w-4 h-4" strokeWidth={3} />}
                                {i.nameGe}
                              </button>
                            );
                          })}
                        </div>
                      </FollowUp>
                    )}
                    {on && o.id === 'skhva' && (
                      <FollowUp>
                        <FieldLabel htmlFor="sg-ability-other">რა შეგიძლიათ?</FieldLabel>
                        <input id="sg-ability-other" lang="ka" value={a.abilityOther}
                          onChange={e => set({ abilityOther: e.target.value })} className={EMAIL_FIELD} />
                      </FollowUp>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <Heading title="ინტერესები" text="რა გაინტერესებთ? შეგიძლიათ რამდენიმე მონიშნოთ." />
            <div className="space-y-2">
              {INTEREST_OPTIONS.map(o => {
                const on = a.interests.includes(o.id);
                return (
                  <Fragment key={o.id}>
                    <Choice on={on} onClick={() => set({ interests: toggle(a.interests, o.id) })} title={o.title} sub={o.sub} />
                    {on && o.id === 'skhva' && (
                      <FollowUp>
                        <FieldLabel htmlFor="sg-interest-other">რა გაინტერესებთ?</FieldLabel>
                        <input id="sg-interest-other" lang="ka" value={a.interestOther}
                          onChange={e => set({ interestOther: e.target.value })} className={EMAIL_FIELD} />
                      </FollowUp>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <Heading title="რომელ ხმას გალობთ?" text="შეგიძლიათ რამდენიმე მონიშნოთ." />
            <div className="space-y-2">
              {VOICES.map(v => (
                <Choice key={v.id} on={a.voices.includes(v.id)} onClick={() => toggleVoice(v.id)} title={v.title} sub={v.sub} />
              ))}
            </div>
          </>
        )}

        {error && <p role="alert" className="text-[14px] font-semibold text-[#9b2c2c] leading-snug">{error}</p>}

        {step === 0 && (
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="mx-auto flex items-center gap-1.5 py-2 text-[14px] font-semibold text-[#8a7a6a] underline underline-offset-4 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> გამოსვლა
          </button>
        )}
      </div>
    </Sheet>
  );
};
