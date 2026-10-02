import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile } from '../../types';
import { 
  Check, 
  Save, 
  User, 
  Clock, 
  Sparkles, 
  Info, 
  ChevronDown, 
  Loader2,
} from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { triggerHaptic } from '../../utils/haptics';

const STATUS_OPTIONS = [
  { id: 'დამწყები', label: '1. დამწყები' },
  { id: 'ვგალობ', label: '2. ვგალობ' },
  { id: 'ვმღერი', label: '3. ვმღერი' },
  { id: 'ვუკრავ', label: '4. ვუკრავ' },
];

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

export const StudentProfileCard: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile>(INITIAL_PROFILE);
  const [voicesDropdownOpen, setVoicesDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<string>('ორშ');
  const [savedMessage, setSavedMessage] = useState(false);
  const [savingDb, setSavingDb] = useState(false);

  // Sync profile only with Firestore on mount and prefill from Auth
  useEffect(() => {
    const user = auth.currentUser;
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
  }, []);

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

  const selectedStatuses = useMemo(() => {
    if (Array.isArray(profile.experienceLevel)) {
      return profile.experienceLevel;
    }
    if (typeof profile.experienceLevel === 'string' && profile.experienceLevel.trim()) {
      return [profile.experienceLevel];
    }
    return [];
  }, [profile.experienceLevel]);

  const handleStatusToggle = (statusId: string) => {
    setProfile(prev => {
      const current = Array.isArray(prev.experienceLevel) 
        ? prev.experienceLevel 
        : (typeof prev.experienceLevel === 'string' && prev.experienceLevel.trim() ? [prev.experienceLevel] : []);
      const exists = current.includes(statusId);
      const next = exists 
        ? current.filter(s => s !== statusId)
        : [...current, statusId];
      return {
        ...prev,
        experienceLevel: next
      };
    });
  };

  // Save profile to Firestore with explicit mergeFields to never overwrite completedSessions or selectedChantVariants
  const handleSave = async () => {
    triggerHaptic(30);
    setSavingDb(true);

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'students', user.uid), {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || `${profile.firstName} ${profile.lastName}`.trim(),
          photoURL: user.photoURL || '',
          authProvider: 'Google',
          profile,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('Note saving student profile to Firestore (offline):', err);
      }
    }

    setSavingDb(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const activeDayObj = DAYS_OF_WEEK.find(d => d.id === activeDay) || DAYS_OF_WEEK[0];
  const activeDaySelectedHours = getSelectedHoursForDay(activeDay);
  const configuredDaysList = DAYS_OF_WEEK.filter(d => getSelectedHoursForDay(d.id).length > 0);
  const isValidSchedule = configuredDaysList.length >= 2;

  const currentUser = auth.currentUser;
  const userPhoto = currentUser?.photoURL;
  const displayFullName = profile.firstName || profile.lastName 
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : currentUser?.displayName || 'მოსწავლის პროფილი';
  const userEmail = currentUser?.email;

  return (
    <div className="w-full max-w-lg mx-auto space-y-3.5">
      {/* Modern Compact Profile Header Bar */}
      <div className="bg-white/95 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-amber-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 sm:gap-3 text-left group select-none flex-1 min-w-0">
          {/* Avatar with sleek ring */}
          <div className="relative shrink-0">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt={displayFullName}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-amber-400/90 ring-offset-1 ring-offset-white shadow-2xs group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-500 to-[#85502c] text-white flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 transition-transform ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white">
                <User className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight transition-colors truncate">
                {displayFullName}
              </h2>
            </div>
            {userEmail ? (
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                {userEmail}
              </p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-amber-700 font-semibold truncate">
                პროფილის მართვა
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {savedMessage && (
            <span className="inline-flex items-center gap-1 text-emerald-800 text-[10px] sm:text-xs font-black bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/90 shadow-2xs animate-pulse">
              <Check className="w-3 h-3 stroke-[3]" />
              შენახულია
            </span>
          )}
        </div>
      </div>

      {/* FORM SECTION */}
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-amber-200/70 shadow-md space-y-4 text-slate-700">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            პირადი ინფორმაცია
          </span>
          <span className="text-[10px] text-slate-400">შეავსეთ ველები</span>
        </div>

        {/* Name inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">სახელი</label>
            <input 
              name="firstName" 
              placeholder="სახელი" 
              value={profile.firstName} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">გვარი</label>
            <input 
              name="lastName" 
              placeholder="გვარი" 
              value={profile.lastName} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
            />
          </div>
        </div>

        {/* Birthdate & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">დაბადების თარიღი</label>
            <div className="flex items-center gap-1.5">
              <input 
                name="birthDate.year" 
                placeholder="წელი" 
                value={profile.birthDate.year || ''} 
                onChange={handleChange} 
                className="w-16 px-1.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 text-center outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
              />
              <input 
                name="birthDate.month" 
                placeholder="თვე" 
                value={profile.birthDate.month || ''} 
                onChange={handleChange} 
                className="w-11 px-1 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 text-center outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
              />
              <input 
                name="birthDate.day" 
                placeholder="დღე" 
                value={profile.birthDate.day || ''} 
                onChange={handleChange} 
                className="w-11 px-1 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 text-center outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
              />
            </div>
          </div>
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">სტატუსი</label>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 active:scale-[0.98] text-xs font-semibold text-left outline-none transition-all flex items-center justify-between cursor-pointer shadow-2xs hover:border-amber-300"
            >
              <span className="truncate text-slate-700">
                {selectedStatuses.length === 0 ? (
                  <span className="text-slate-400 font-normal">აირჩიეთ სტატუსი...</span>
                ) : (
                  selectedStatuses.map(s => {
                    const item = STATUS_OPTIONS.find(opt => opt.id === s);
                    return item ? item.label : s;
                  }).join(', ')
                )}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${statusDropdownOpen ? 'rotate-180 text-amber-700' : ''}`} />
            </button>

            {statusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)}></div>
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 p-2 space-y-1.5 animate-in fade-in duration-100">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    მონიშნეთ სტატუსი:
                  </div>
                  {STATUS_OPTIONS.map(item => {
                    const active = selectedStatuses.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleStatusToggle(item.id)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          active 
                            ? 'text-amber-950 bg-amber-100/90 border border-amber-300 shadow-2xs' 
                            : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <span>{item.label}</span>
                        {active ? (
                          <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-200"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Region & City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">რეგიონი</label>
            <input 
              name="region" 
              placeholder="მაგ: ქართლი" 
              value={profile.region} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">ქალაქი / სოფელი</label>
            <input 
              name="city" 
              placeholder="მაგ: თბილისი" 
              value={profile.city} 
              onChange={handleChange} 
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 transition-all shadow-2xs" 
            />
          </div>
        </div>

        {/* Voices Selection with Individual Toggles */}
        <div className="relative space-y-1">
          <label className="text-[11px] font-bold text-slate-600 block">
            რომელი ხმა ხარ ან ფიქრობ რომ ხარ?
          </label>

          <button
            type="button"
            onClick={() => setVoicesDropdownOpen(!voicesDropdownOpen)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 active:scale-[0.98] text-xs font-semibold text-left outline-none transition-all flex items-center justify-between cursor-pointer shadow-2xs hover:border-amber-300"
          >
            <span className="truncate text-slate-700">
              {profile.voices.length === 0 
                ? <span className="text-slate-400 font-normal">აირჩიეთ ხმები (არცერთი არ არის მონიშნული)</span> 
                : profile.voices.map(v => 
                    v === '1' ? 'მთქმელი 1-ხმა' : v === '2' ? 'მოძახილი 2-ხმა' : 'ბანი 3-ხმა'
                  ).join(', ')
            }
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${voicesDropdownOpen ? 'rotate-180 text-amber-700' : ''}`} />
          </button>
          
          {voicesDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setVoicesDropdownOpen(false)}></div>
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-20 p-2 space-y-1.5 animate-in fade-in duration-100">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  მონიშნეთ თქვენი ხმა:
                </div>
                {[
                  { id: '1', label: 'მთქმელი 1-ხმა' },
                  { id: '2', label: 'მოძახილი 2-ხმა' },
                  { id: '3', label: 'ბანი 3-ხმა' }
                ].map(item => {
                  const active = profile.voices.includes(item.id as any);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleVoiceToggle(item.id as any)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                        active 
                          ? 'text-amber-950 bg-amber-100/90 border border-amber-300 shadow-2xs' 
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active ? (
                        <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-200"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* MODERN SCHEDULE BUILDER */}
        <div className="bg-gradient-to-br from-slate-50/90 via-white to-amber-50/30 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 space-y-2 shadow-2xs">
          {/* Header with Title & Badge */}
          <div className="flex items-center justify-between border-b border-amber-100/70 pb-1.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#85502c]" />
              <span className="text-xs font-bold text-slate-800">მუშაობის განრიგი</span>
              <span className="text-[10px] text-slate-400 font-medium">(06:00 – 23:00)</span>
            </div>

            <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${
              isValidSchedule 
                ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300' 
                : 'text-amber-800 bg-amber-100/90 border-amber-300'
            }`}>
              {configuredDaysList.length} დღე არჩეულია
            </span>
          </div>

          {/* 7-Day Segmented Pill Selector with Active Count Badges */}
          <div className="grid grid-cols-7 gap-1 p-0.5 bg-amber-50/60 rounded-xl border border-amber-200/60">
            {DAYS_OF_WEEK.map(day => {
              const dayHours = getSelectedHoursForDay(day.id);
              const count = dayHours.length;
              const hasHours = count > 0;
              const isSelected = activeDay === day.id;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setActiveDay(day.id)}
                  className={`py-1 rounded-lg text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center active:scale-95 ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-500 to-[#85502c] text-white shadow-xs scale-[1.02]'
                      : hasHours
                        ? 'bg-amber-100/90 text-amber-950 font-black border border-amber-300/80 hover:bg-amber-200/80'
                        : 'text-slate-600 hover:bg-white/80'
                  }`}
                >
                  <span className="text-[10px] sm:text-[11px] font-black leading-tight">{day.short}</span>
                  <span className={`text-[8px] sm:text-[9px] font-extrabold leading-none mt-0.5 ${
                    isSelected ? 'text-amber-100' : hasHours ? 'text-amber-800' : 'text-slate-400'
                  }`}>
                    {hasHours ? `${count}სთ` : '—'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Day's Instant Inline Hour Matrix */}
          <div className="bg-white/95 p-2 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                {activeDayObj.full}:
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {activeDaySelectedHours.length > 0 
                  ? `მონიშნულია: ${activeDaySelectedHours.join(', ')}` 
                  : 'აირჩიეთ საათები'}
              </span>
            </div>

            {/* 18-Hour Micro Grid */}
            <div className="grid grid-cols-6 gap-1">
              {AVAILABLE_HOURS.map(hour => {
                const isSelected = activeDaySelectedHours.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => handleHourToggle(activeDay, hour)}
                    className={`py-1 px-0.5 rounded-md text-[9px] sm:text-[10px] font-black transition-all cursor-pointer text-center select-none border active:scale-90 ${
                      isSelected
                        ? 'bg-gradient-to-br from-amber-500 to-[#85502c] text-white border-amber-700 shadow-2xs scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-amber-50/70 hover:border-amber-300'
                    }`}
                  >
                    {hour}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Note */}
          <div className={`p-1.5 px-2 rounded-xl border flex items-center gap-1.5 text-[10px] sm:text-[11px] ${
            isValidSchedule 
              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-800 font-medium' 
              : 'bg-amber-50/90 border-amber-200/90 text-amber-900 font-medium'
          }`}>
            {isValidSchedule ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <Info className="w-3 h-3 text-amber-700 shrink-0" />
            )}
            <span>მინიმუმ <strong>2 დღე</strong> უნდა აირჩიოთ, თითო-თითო საათი მაინც.</span>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={savingDb}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ba8555] via-[#a66d3d] to-[#8d5427] hover:brightness-105 text-white font-bold text-sm tracking-wide shadow-md active:scale-95 border border-[#ebd0ad]/60 transition-all flex items-center justify-center gap-2 cursor-pointer select-none disabled:opacity-60"
        >
          {savingDb ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>მონაცემების შენახვა</span>
        </button>
      </div>
    </div>
  );
};
