import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile } from '../../types';
import { 
  Check, 
  Save, 
  User, 
  Clock, 
  Sparkles, 
  Info, 
  Loader2,
  IdCard,
  Mic,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context';
import { Pill } from '../ui/kit';
import { Fold } from '../admin/Fold';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { triggerHaptic } from '../../utils/haptics';
import { isGeorgian, renameInGroups } from '../../utils/memberName';
import { writeDirectory } from '../../utils/directory';
import { ABILITY_OPTIONS, AbilityId, GEORGIAN_REGIONS, INTEREST_OPTIONS, abilitiesOf, normalizePhone } from '../../utils/profileFields';
import { INSTRUMENTS_LIST } from '../../data/instrumentsData';

const INITIAL_PROFILE: StudentProfile = {
  firstName: '',
  lastName: '',
  birthDate: { year: 2000, month: 1, day: 1 },
  region: '',
  city: '',
  experienceLevel: [],
  voices: [],
  workSchedule: {},
};

const DAYS_OF_WEEK = [
  { id: 'ორშ', short: 'ორშ', full: 'ორშაბათი', jsDay: 1 },
  { id: 'სამ', short: 'სამ', full: 'სამშაბათი', jsDay: 2 },
  { id: 'ოთხ', short: 'ოთხ', full: 'ოთხშაბათი', jsDay: 3 },
  { id: 'ხუთ', short: 'ხუთ', full: 'ხუთშაბათი', jsDay: 4 },
  { id: 'პარ', short: 'პარ', full: 'პარასკევი', jsDay: 5 },
  { id: 'შაბ', short: 'შაბ', full: 'შაბათი', jsDay: 6 },
  { id: 'კვი', short: 'კვი', full: 'კვირა', jsDay: 0 },
];

// All available hours from 06:00 to 23:00
const AVAILABLE_HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${h.toString().padStart(2, '0')}:00`;
});

/** Whose profile an admin edits from the admin panel (without it: my own). */
export interface ProfileOwner { uid: string; email: string; displayName: string; photoURL: string }

/** A profile: a head card (photo, name, role, voice, place), then `slot` (the profile page puts the admin panel's row,
 *  the outfit and the home buttons there), then the details as three folding cards. „შენახვა“ shows only while
 *  something differs from what is saved. */
export const StudentProfileCard: React.FC<{ member?: ProfileOwner; slot?: React.ReactNode }> = ({ member, slot }) => {
  const { isAdmin, isSuperAdmin, isTeacher } = useAuth();
  const [profile, setProfile] = useState<StudentProfile>(INITIAL_PROFILE);
  // the saved profile as text (set after each snapshot), to tell whether anything is changed
  const [baseline, setBaseline] = useState<string | null>(null);
  const [synced, setSynced] = useState(0);
  const [activeDay, setActiveDay] = useState<string>('ორშ');
  const [savedMessage, setSavedMessage] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [savingDb, setSavingDb] = useState(false);

  // Sync profile only with Firestore on mount and prefill from Auth
  useEffect(() => {
    const user = member
      ? { uid: member.uid, displayName: member.displayName }
      : auth.currentUser;
    if (!user) return;

    if (user.displayName) {
      setProfile(prev => {
        if (!prev.firstName && !prev.lastName) {
          const parts = (user.displayName || '').trim().split(' ');
          const first = parts[0] || '';
          const last = parts.slice(1).join(' ') || '';
          return {
            ...prev,
            firstName: first,
            lastName: last
          };
        }
        return prev;
      });
    }

    const userDocRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      setSynced(n => n + 1);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) {
          let loadedVoices = Array.isArray(data.profile.voices) ? data.profile.voices : [];
          // If legacy data had all 3 voices auto-marked by old mock default, clean to empty
          if (loadedVoices.length === 3 && loadedVoices.includes('1') && loadedVoices.includes('2') && loadedVoices.includes('3')) {
             loadedVoices = [];
          }

          setProfile(prev => ({
            ...prev,
            ...data.profile,
            firstName: data.profile.firstName || prev.firstName,
            lastName: data.profile.lastName || prev.lastName,
            voices: loadedVoices,
            workSchedule: data.profile.workSchedule || {}
          }));
        } else {
          setProfile(INITIAL_PROFILE);
        }
      } else {
        setProfile(INITIAL_PROFILE);
      }
    }, (error) => {
      if (error?.code === 'permission-denied') {
        console.warn('Firestore subscription permission denied (typically due to sign out).');
      } else {
        handleFirestoreError(error, OperationType.GET, `students/${user.uid}`);
      }
    });

    return () => unsubscribe();
  }, [member?.uid]);

  // runs after the snapshot's profile is in place
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (synced) setBaseline(JSON.stringify(profile)); }, [synced]);

  // Helper to get selected hours list for a day of week
  const getSelectedHoursForDay = (dayId: string): string[] => {
    const raw = profile.workSchedule?.[dayId];
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(s => AVAILABLE_HOURS.includes(s));
  };

  // Toggle hour in profile setup for the active day
  const handleHourToggle = (dayId: string, hour: string) => {
    const currentHours = getSelectedHoursForDay(dayId);
    let nextHours: string[];
    
    if (currentHours.includes(hour)) {
      nextHours = currentHours.filter(h => h !== hour);
    } else {
      nextHours = [...currentHours, hour].sort((a, b) => {
        return parseInt(a.split(':')[0]) - parseInt(b.split(':')[0]);
      });
    }

    setProfile(prev => {
      const updatedSchedule = { ...(prev.workSchedule || {}) };
      if (nextHours.length === 0) {
        delete updatedSchedule[dayId];
      } else {
        updatedSchedule[dayId] = nextHours.join(', ');
      }
      return {
        ...prev,
        workSchedule: updatedSchedule
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('birthDate.')) {
      const field = name.split('.')[1] as keyof StudentProfile['birthDate'];
      setProfile(prev => ({
        ...prev,
        birthDate: { ...prev.birthDate, [field]: parseInt(value) || 0 }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVoiceToggle = (voice: '1' | '2' | '3') => {
    setProfile(prev => {
      const exists = prev.voices.includes(voice);
      const nextVoices = exists 
        ? prev.voices.filter(v => v !== voice) 
        : [...prev.voices, voice];
      return {
        ...prev,
        voices: nextVoices
      };
    });
  };

  // abilities (with the instruments they play and where they chant) and interests — the same as "პირველი გაცნობა"
  const abilities = useMemo(() => abilitiesOf(profile), [profile]);
  const interests = profile.interests || [];
  const toggleAbility = (id: AbilityId) => setProfile(prev => {
    const cur = abilitiesOf(prev);
    const next = id === 'beginner'
      ? (cur.includes('beginner') ? [] : ['beginner'])
      : (cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]).filter(x => x !== 'beginner');
    return { ...prev, abilities: next };
  });
  const toggleIn = (key: 'instruments' | 'interests', id: string) => setProfile(prev => {
    const cur = prev[key] || [];
    return { ...prev, [key]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });

  // Save profile to Firestore with explicit mergeFields to never overwrite completedSessions or selectedChantVariants
  const handleSave = async () => {
    triggerHaptic(30);
    setSavingDb(true);
    setSaveFailed(false);

    // an admin saves only the member's profile: their account fields (e-mail, photo, name in the account) stay theirs
    if (member) {
      const first = profile.firstName.trim(), last = profile.lastName.trim(), church = (profile.churchName || '').trim();
      try {
        await setDoc(doc(db, 'students', member.uid), {
          profile: { ...profile, phone: normalizePhone(profile.phone) ?? (profile.phone || '') },
          updatedAt: new Date().toISOString()
        }, { merge: true });
        void writeDirectory(member.uid, { firstName: first, lastName: last, churchName: church });
        if (isGeorgian(first) && isGeorgian(last)) void renameInGroups(member.uid, `${first} ${last}`, church || first, member.photoURL);
        setSavedMessage(true);
        setBaseline(JSON.stringify(profile));
        setTimeout(() => setSavedMessage(false), 2500);
      } catch {
        setSaveFailed(true);
      }
      setSavingDb(false);
      return;
    }

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'students', user.uid), {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
          photoURL: user.photoURL || '',
          authProvider: user.providerData.some(pd => pd.providerId === 'google.com') ? 'Google' : 'email',
          profile: { ...profile, phone: normalizePhone(profile.phone) ?? (profile.phone || '') },
          updatedAt: new Date().toISOString()
        }, { merge: true });
        // teachers find me by this name, and my psalter groups list me by it
        void writeDirectory(user.uid, { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), churchName: (profile.churchName || '').trim() });
        if (isGeorgian(profile.firstName) && isGeorgian(profile.lastName)) {
          void renameInGroups(user.uid, `${profile.firstName.trim()} ${profile.lastName.trim()}`, (profile.churchName || profile.firstName).trim(), user.photoURL || '');
        }
      } catch (err) {
        console.warn('Note saving student profile to Firestore (offline):', err);
      }
    }

    setSavingDb(false);
    setSavedMessage(true);
    setBaseline(JSON.stringify(profile));
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const activeDayObj = DAYS_OF_WEEK.find(d => d.id === activeDay) || DAYS_OF_WEEK[0];
  const activeDaySelectedHours = getSelectedHoursForDay(activeDay);
  const configuredDaysList = DAYS_OF_WEEK.filter(d => getSelectedHoursForDay(d.id).length > 0);
  const isValidSchedule = configuredDaysList.length >= 2;

  const currentUser = member || auth.currentUser;
  const userPhoto = currentUser?.photoURL;
  const displayFullName = profile.firstName || profile.lastName
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : currentUser?.displayName || 'მოსწავლის პროფილი';
  const userEmail = currentUser?.email;

  const field = 'w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#d9c8ac] focus:ring-2 focus:ring-[#7a2028]/40 text-sm text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';
  const label = 'block mb-1.5 text-xs font-semibold text-[#75685a]';
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-sm font-semibold transition-colors cursor-pointer select-none active:scale-95 ${
      active ? 'bg-[#7a2028] text-[#fbf6ec] ring-1 ring-[#7a2028]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
    }`;
  const VOICES = [
    { id: '1', label: 'მთქმელი · 1 ხმა' },
    { id: '2', label: 'მოძახილი · 2 ხმა' },
    { id: '3', label: 'ბანი · 3 ხმა' },
  ] as const;

  // what each folded part says while closed
  const voiceNames = VOICES.filter(v => profile.voices.includes(v.id)).map(v => v.label.split(' · ')[0]);
  const place = [profile.city, profile.region].filter(Boolean).join(', ');
  const personalSummary = [place, profile.phone].filter(Boolean).join(' · ') || 'შეავსე შენი მონაცემები';
  const skillsSummary = [
    ...voiceNames,
    ...ABILITY_OPTIONS.filter(a => abilities.includes(a.id)).map(a => a.title),
  ].join(' · ') || 'ხმა, შესაძლებლობები, ინტერესები';
  const scheduleSummary = configuredDaysList.length ? configuredDaysList.map(d => d.short).join(', ') : 'დღეები ჯერ არ არის არჩეული';
  const role = member ? null : isSuperAdmin ? 'სუპერადმინი' : isAdmin ? 'ადმინი' : isTeacher ? 'მასწავლებელი' : 'წევრი';
  const dirty = baseline === null || baseline !== JSON.stringify(profile);

  return (
    <div className="w-full max-w-lg mx-auto space-y-3 text-[#2a2017]">
      {/* who: a soft wine-to-gold band, the photo over its edge, the name and a few words about me */}
      <section className="relative overflow-hidden rounded-3xl bg-white/80 ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05),0_12px_30px_-22px_rgba(74,52,38,0.45)]">
        <div aria-hidden className="h-16 bg-gradient-to-r from-[#5e1820] via-[#7a2028] to-[#b08646]">
          <span className="block w-full h-full bg-[radial-gradient(circle_at_85%_-20%,rgba(243,217,164,0.45),transparent_55%)]" />
        </div>
        <div className="px-4 sm:px-5 pb-4 flex items-start gap-3.5">
          <div className="relative shrink-0 -mt-9">
            {userPhoto ? (
              <img src={userPhoto} alt={displayFullName} referrerPolicy="no-referrer"
                className="w-[72px] h-[72px] rounded-full object-cover ring-4 ring-white bg-[#efe5d4] shadow-md" />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-[#efe5d4] text-[#7a2028] flex items-center justify-center ring-4 ring-white shadow-md">
                <User className="w-8 h-8" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-2.5">
            <h2 className="font-serif-ge text-[19px] leading-tight font-bold text-[#4a3426] truncate">{displayFullName}</h2>
            <p className="text-[13px] text-[#8a7a6a] truncate">{userEmail || 'პროფილი'}</p>
          </div>
        </div>
        {(role || voiceNames.length > 0 || place || savedMessage) && (
          <div className="px-4 sm:px-5 pb-4 -mt-1.5 flex flex-wrap gap-1.5">
            {savedMessage && <Pill tone="green"><Check /> შენახულია</Pill>}
            {role && <Pill tone={role === 'წევრი' ? 'brown' : 'wine'}>{role}</Pill>}
            {voiceNames.map(v => <Pill key={v} tone="muted"><Mic /> {v}</Pill>)}
            {place && <Pill tone="muted"><MapPin /> {place}</Pill>}
          </div>
        )}
      </section>

      {slot}

      <Fold icon={<IdCard />} title="პირადი ინფორმაცია" summary={personalSummary}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>სახელი</label>
              <input name="firstName" placeholder="სახელი" value={profile.firstName} onChange={handleChange} className={field} />
            </div>
            <div>
              <label className={label}>გვარი</label>
              <input name="lastName" placeholder="გვარი" value={profile.lastName} onChange={handleChange} className={field} />
            </div>
            {/* groups and the commemoration lists need the name in Georgian letters */}
            {(profile.firstName || profile.lastName) && !(isGeorgian(profile.firstName) && isGeorgian(profile.lastName)) && (
              <p className="col-span-2 -mt-1 text-xs leading-snug text-[#9a3324]">
                სახელი და გვარი ქართული ასოებით ჩაწერე — ასე გამოჩნდები ჯგუფში და მოსახსენებელში.
              </p>
            )}
            <div className="col-span-2">
              <label className={label}>სახელი მოსახსენებლად <span className="font-normal text-[#8a7a6a]">— ნათლობის სახელი, თუ განსხვავდება</span></label>
              <input name="churchName" placeholder={profile.firstName || 'მაგ: ნინო'} value={profile.churchName || ''} onChange={handleChange} className={field} />
            </div>
            <div className="col-span-2">
              <label className={label}>რეგიონი</label>
              <select name="region" value={profile.region} onChange={handleChange} className={`${field} cursor-pointer`}>
                <option value="" disabled>აირჩიე რეგიონი</option>
                {/* an old free-text region stays visible until another is chosen */}
                {[...GEORGIAN_REGIONS, ...(profile.region && !GEORGIAN_REGIONS.includes(profile.region) ? [profile.region] : [])].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>ქალაქი / სოფელი</label>
              <input name="city" placeholder="მაგ: თბილისი" value={profile.city} onChange={handleChange} className={field} />
            </div>
            <div>
              <label className={label}>ტელეფონი</label>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="599 12 34 56" value={profile.phone || ''} onChange={handleChange} className={field} />
            </div>
          </div>

          <div>
            <label className={label}>დაბადების თარიღი</label>
            <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2 max-w-xs">
              <input name="birthDate.year" inputMode="numeric" placeholder="წელი" value={profile.birthDate.year || ''} onChange={handleChange} className={`${field} text-center font-semibold`} />
              <input name="birthDate.month" inputMode="numeric" placeholder="თვე" value={profile.birthDate.month || ''} onChange={handleChange} className={`${field} text-center font-semibold`} />
              <input name="birthDate.day" inputMode="numeric" placeholder="დღე" value={profile.birthDate.day || ''} onChange={handleChange} className={`${field} text-center font-semibold`} />
            </div>
          </div>

        </div>
      </Fold>

      <Fold icon={<Sparkles />} title="გალობა და ინტერესები" summary={skillsSummary}>
        <div className="space-y-4">
          <div>
            <label className={label}>შესაძლებლობები</label>
            <div className="flex flex-wrap gap-2">
              {ABILITY_OPTIONS.map(item => {
                const active = abilities.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => toggleAbility(item.id)} className={chip(active)} aria-pressed={active}>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {item.title}
                  </button>
                );
              })}
            </div>
            {abilities.includes('galoba') && (
              <div className="mt-3">
                <label className={label}>სად გალობთ?</label>
                <input placeholder="ტაძარი, ქალაქი ან სოფელი" value={profile.chantPlace || ''}
                  onChange={e => setProfile(prev => ({ ...prev, chantPlace: e.target.value }))} className={field} />
              </div>
            )}
            {abilities.includes('dakvra') && (
              <div className="mt-3">
                <label className={label}>რაზე უკრავთ?</label>
                <div className="flex flex-wrap gap-2">
                  {INSTRUMENTS_LIST.map(item => {
                    const active = (profile.instruments || []).includes(item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => toggleIn('instruments', item.id)} className={chip(active)} aria-pressed={active}>
                        {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        {item.nameGe}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {abilities.includes('skhva') && (
              <div className="mt-3">
                <label className={label}>სხვა — რა შეგიძლიათ?</label>
                <input value={profile.abilityOther || ''} onChange={e => setProfile(prev => ({ ...prev, abilityOther: e.target.value }))} className={field} />
              </div>
            )}
          </div>

          <div>
            <label className={label}>ინტერესები</label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(item => {
                const active = interests.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => toggleIn('interests', item.id)} className={chip(active)} aria-pressed={active}>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {item.title}
                  </button>
                );
              })}
            </div>
            {interests.includes('skhva') && (
              <div className="mt-3">
                <label className={label}>სხვა — რა გაინტერესებთ?</label>
                <input value={profile.interestOther || ''} onChange={e => setProfile(prev => ({ ...prev, interestOther: e.target.value }))} className={field} />
              </div>
            )}
          </div>

          <div>
            <label className={label}>რომელი ხმა ხარ ან ფიქრობ რომ ხარ?</label>
            <div className="flex flex-wrap gap-2">
              {VOICES.map(item => {
                const active = profile.voices.includes(item.id);
                return (
                  <button key={item.id} type="button" onClick={() => handleVoiceToggle(item.id)} className={chip(active)} aria-pressed={active}>
                    {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Fold>

      <Fold icon={<Clock />} title="მუშაობის განრიგი" summary={scheduleSummary}>
        <div className="space-y-3.5">
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS_OF_WEEK.map(day => {
              const count = getSelectedHoursForDay(day.id).length;
              const isSelected = activeDay === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDay(day.id)}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-[#7a2028] text-[#fbf6ec]'
                      : count > 0
                        ? 'bg-[#7a2028]/10 text-[#7a2028] hover:bg-[#7a2028]/15'
                        : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                  }`}
                >
                  <span className="text-xs font-bold leading-tight">{day.short}</span>
                  <span className={`text-[11px] font-semibold leading-none mt-1 ${isSelected ? 'text-[#fbf6ec]/80' : 'opacity-70'}`}>
                    {count > 0 ? `${count} სთ` : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold text-[#4a3426]">{activeDayObj.full}</span>
            <span className="text-xs text-[#8a7a6a] truncate">
              {activeDaySelectedHours.length > 0 ? activeDaySelectedHours.join(', ') : 'აირჩიეთ საათები (06:00 – 23:00)'}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {AVAILABLE_HOURS.map(hour => {
              const isSelected = activeDaySelectedHours.includes(hour);
              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => handleHourToggle(activeDay, hour)}
                  className={`h-9 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer select-none active:scale-95 ${
                    isSelected ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] hover:ring-[#7a2028]/40'
                  }`}
                >
                  {hour}
                </button>
              );
            })}
          </div>

          <p className={`flex items-center gap-2 text-xs ${isValidSchedule ? 'text-emerald-800' : 'text-[#75685a]'}`}>
            {isValidSchedule ? <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" /> : <Info className="w-3.5 h-3.5 shrink-0" />}
            <span>მინიმუმ <strong>2 დღე</strong> უნდა აირჩიოთ, თითო-თითო საათი მაინც.</span>
          </p>
        </div>
      </Fold>

      {/* the save button shows only while something is changed, and stays in reach at the bottom */}
      {(dirty || savingDb || saveFailed) && (
        <div className="sticky bottom-3 z-10 pt-1 sg-in">
          <button
            type="button"
            onClick={handleSave}
            disabled={savingDb}
            className="w-full h-12 rounded-2xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-[15px] shadow-[0_10px_24px_-8px_rgba(122,32,40,0.55)] active:scale-[0.98] transition-colors flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-60"
          >
            {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>ცვლილებების შენახვა</span>
          </button>
          {saveFailed && <p role="alert" className="mt-1.5 text-center text-[13px] font-semibold text-[#9b2c2c]">ვერ შეინახა — სცადე თავიდან.</p>}
        </div>
      )}
    </div>
  );
};
