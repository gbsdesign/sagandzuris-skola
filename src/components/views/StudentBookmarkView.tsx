import React, { useState, useEffect } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCheck,
  Music,
  X,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { TSIRVA_CHANTS } from '../../data/tsirvaChants';
import { filterValidVariants } from '../../utils/variantValidation';
import { loadGuestData, saveGuestVariants } from '../../utils/localStorageSync';
import { useNavigation } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

const VARIANT_ORDER_MAP: { [variantId: string]: number } = {};
let orderIndex = 0;
TSIRVA_CHANTS.forEach(chant => {
  chant.variants.forEach(variant => {
    VARIANT_ORDER_MAP[variant.id] = orderIndex++;
  });
});

const triggerFireworks = () => {
  try {
    const count = 180;
    const defaults = {
      origin: { y: 0.65 }
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 30,
      startVelocity: 55,
      colors: ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24']
    });
    fire(0.2, {
      spread: 60,
      colors: ['#10b981', '#34d399', '#ffffff']
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.9,
      colors: ['#059669', '#10b981', '#f59e0b']
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      colors: ['#10b981', '#ffffff', '#fbbf24']
    });
  } catch (e) {
    console.warn('Confetti launch error:', e);
  }
};

export interface SelectedChantVariantItem {
  variantId: string;
  chantId: string;
  chantName: string;
  code: string;
  label: string;
  fullTitle: string;
  isLearned?: boolean;
  voices?: ('1' | '2' | '3')[];
}

export type SelectedChantVariantsMap = {
  [variantId: string]: SelectedChantVariantItem;
};

interface StudentProfile {
  firstName: string;
  lastName: string;
  voices?: string[];
  workSchedule?: { [key: string]: string };
}

const MONTH_NAMES_GE = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

const DAYS_OF_WEEK = [
  { id: 'ორშ', short: 'ორშ', dayIndex: 1 },
  { id: 'სამ', short: 'სამ', dayIndex: 2 },
  { id: 'ოთხ', short: 'ოთხ', dayIndex: 3 },
  { id: 'ხუთ', short: 'ხუთ', dayIndex: 4 },
  { id: 'პარ', short: 'პარ', dayIndex: 5 },
  { id: 'შაბ', short: 'შაბ', dayIndex: 6 },
  { id: 'კვი', short: 'კვი', dayIndex: 0 }
];

const AVAILABLE_HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00'
];

interface GzaViewProps {
  onBack?: () => void;
  onGoToGaloba?: () => void;
  selectedChantVariants?: SelectedChantVariantsMap;
  onUpdateVariants?: (next: SelectedChantVariantsMap) => void;
}

// "გზა" PAGE COMPONENT ONLY
export const GzaView: React.FC<GzaViewProps> = ({
  onGoToGaloba,
  selectedChantVariants: externalSelectedVariants,
  onUpdateVariants
}) => {
  const { navigateTo } = useNavigation();
  const [internalVariants, setInternalVariants] = useState<SelectedChantVariantsMap>({});

  const activeVariantsMap = filterValidVariants(externalSelectedVariants || internalVariants);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      const guest = loadGuestData();
      setInternalVariants(guest.variants);
      if (onUpdateVariants) {
        onUpdateVariants(guest.variants);
      }
      return;
    }

    const userDocRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.selectedChantVariants) {
          const cleaned = filterValidVariants(data.selectedChantVariants);
          setInternalVariants(cleaned);
          if (onUpdateVariants) {
            onUpdateVariants(cleaned);
          }
        }
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

  const [isSavedToast, setIsSavedToast] = useState(false);

  const handleManualSave = async () => {
    const user = auth.currentUser;
    if (onUpdateVariants) {
      onUpdateVariants(activeVariantsMap);
    }

    if (!user) {
      saveGuestVariants(activeVariantsMap);
      setIsSavedToast(true);
      setTimeout(() => {
        setIsSavedToast(false);
      }, 2500);
      return;
    }

    try {
      const userDocRef = doc(db, 'students', user.uid);
      await setDoc(userDocRef, { selectedChantVariants: activeVariantsMap }, { mergeFields: ['selectedChantVariants'] });
    } catch (err) {
      console.warn('Firestore manual save note:', err);
    }
    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
    }, 2500);
  };

  const handleToggleVoice = async (variantId: string, voice: '1' | '2' | '3') => {
    const current = activeVariantsMap[variantId];
    if (!current) return;

    const currentVoices = Array.isArray(current.voices) ? current.voices : [];
    const hasVoice = currentVoices.includes(voice);
    
    if (!hasVoice) {
      triggerFireworks();
    }

    const nextVoices = hasVoice
      ? currentVoices.filter(v => v !== voice)
      : [...currentVoices, voice].sort();

    const nextVariants = {
      ...activeVariantsMap,
      [variantId]: {
        ...current,
        voices: nextVoices,
        isLearned: nextVoices.length > 0
      }
    };

    setInternalVariants(nextVariants);
    if (onUpdateVariants) {
      onUpdateVariants(nextVariants);
    }

    const user = auth.currentUser;
    if (!user) {
      saveGuestVariants(nextVariants);
      return;
    }

    try {
      const userDocRef = doc(db, 'students', user.uid);
      await setDoc(userDocRef, { selectedChantVariants: nextVariants }, { mergeFields: ['selectedChantVariants'] });
    } catch (err) {
      console.warn('Firestore sync note:', err);
    }
  };

  const handleToggleLearned = async (variantId: string) => {
    const current = activeVariantsMap[variantId];
    if (!current) return;

    const nextLearned = !current.isLearned;
    if (nextLearned) {
      triggerFireworks();
    }

    const nextVariants = {
      ...activeVariantsMap,
      [variantId]: {
        ...current,
        isLearned: nextLearned,
        voices: nextLearned ? (['1'] as ('1' | '2' | '3')[]) : []
      }
    };

    setInternalVariants(nextVariants);
    if (onUpdateVariants) {
      onUpdateVariants(nextVariants);
    }

    const user = auth.currentUser;
    if (!user) {
      saveGuestVariants(nextVariants);
      return;
    }

    try {
      const userDocRef = doc(db, 'students', user.uid);
      await setDoc(userDocRef, { selectedChantVariants: nextVariants }, { mergeFields: ['selectedChantVariants'] });
    } catch (err) {
      console.warn('Firestore sync note:', err);
    }
  };

  const handleRemoveVariant = async (variantId: string) => {
    const nextVariants = { ...activeVariantsMap };
    delete nextVariants[variantId];

    setInternalVariants(nextVariants);
    if (onUpdateVariants) {
      onUpdateVariants(nextVariants);
    }

    const user = auth.currentUser;
    if (!user) {
      saveGuestVariants(nextVariants);
      return;
    }

    try {
      const userDocRef = doc(db, 'students', user.uid);
      await setDoc(userDocRef, { selectedChantVariants: nextVariants }, { mergeFields: ['selectedChantVariants'] });
    } catch (err) {
      console.warn('Firestore sync note:', err);
    }
  };

  const selectedVariantsList = Object.values(activeVariantsMap).sort((a, b) => {
    const orderA = VARIANT_ORDER_MAP[a.variantId] ?? 999999;
    const orderB = VARIANT_ORDER_MAP[b.variantId] ?? 999999;
    if (orderA !== orderB) return orderA - orderB;
    return a.variantId.localeCompare(b.variantId);
  });

  const isGaloba = (item: SelectedChantVariantItem) => {
    return item.variantId.startsWith('tsirva_') || Boolean(VARIANT_ORDER_MAP[item.variantId] !== undefined);
  };

  const isMtkmeli = (item: SelectedChantVariantItem) => {
    return item.variantId.includes('_p') || item.variantId.startsWith('abk_p') || item.variantId.startsWith('sam_p');
  };

  const isSakravi = (item: SelectedChantVariantItem) => {
    return ['chonguri', 'fanduri', 'doli', 'garmoni', 'chuniri', 'changi'].some(id => item.variantId.startsWith(id));
  };

  const isSimghera = (item: SelectedChantVariantItem) => {
    return !isGaloba(item) && !isMtkmeli(item) && !isSakravi(item);
  };

  const galobaItems = selectedVariantsList.filter(isGaloba);
  const simgheraItems = selectedVariantsList.filter(isSimghera);
  const mtkmeliItems = selectedVariantsList.filter(isMtkmeli);
  const sakravebiItems = selectedVariantsList.filter(isSakravi);

  const categories = [
    {
      id: 'galoba',
      title: 'გალობა',
      unitSingular: 'საგალობელი',
      items: galobaItems,
    },
    {
      id: 'simghera',
      title: 'სიმღერა',
      unitSingular: 'სიმღერა',
      items: simgheraItems,
    },
    {
      id: 'mtkmeli',
      title: 'მთქმელი',
      unitSingular: 'ლექსი',
      items: mtkmeliItems,
    },
    {
      id: 'sakravebi',
      title: 'საკრავები',
      unitSingular: 'საკრავი',
      items: sakravebiItems,
    },
  ];

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in duration-200">
      {selectedVariantsList.length > 0 ? (
        <div className="space-y-5">
          {categories.map((cat) => {
            if (cat.items.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2">
                {/* Category Header */}
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0">
                      <Music className="w-3.5 h-3.5 text-[#85502c]" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-amber-950 uppercase tracking-wider">
                      {cat.title}
                    </h3>
                  </div>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-100/90 text-amber-900 shadow-2xs">
                    {cat.items.length} {cat.unitSingular}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {cat.items.map((item, index) => {
                    const isGS = item.code.startsWith('გ.ს.');
                    const isKK = item.code.startsWith('ქ.კ.');

                    return (
                      <div
                        key={item.variantId}
                        className="bg-white border border-amber-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs hover:border-amber-300 transition-all flex flex-col gap-1"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div
                            onClick={() => {
                              triggerHaptic(10);
                              localStorage.setItem('selectedChantId', item.chantId);
                              localStorage.setItem('selectedVariantId', item.variantId);
                              navigateTo('galoba-detail');
                            }}
                            className="flex items-start gap-1.5 min-w-0 flex-1 cursor-pointer group"
                          >
                            <span className="text-[11px] font-black text-slate-400 shrink-0 mt-0.5 min-w-[16px] text-right">
                              {index + 1}.
                            </span>
                            <div className="min-w-0 flex-1 leading-tight">
                              <h4 className="font-extrabold text-slate-800 text-xs leading-snug whitespace-normal break-words group-hover:text-amber-800 transition-colors">
                                {item.chantName}
                              </h4>
                            </div>
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 border mt-0.5 leading-none ${
                              isGS
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isKK
                                ? 'bg-sky-100 text-sky-900 border-sky-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {item.code}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(item.variantId)}
                            className="p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 cursor-pointer -mr-0.5 -mt-0.5"
                            title="სიიდან ამოშლა"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100/80">
                          {isSakravi(item) || isMtkmeli(item) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleLearned(item.variantId);
                              }}
                              className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer border flex items-center gap-1 ${
                                item.isLearned
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-1 ring-emerald-400/30'
                                  : 'bg-amber-50/60 text-amber-950 border-amber-200/80 hover:bg-amber-100/80'
                              }`}
                            >
                              {item.isLearned && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                              <span>{item.isLearned ? 'ნასწავლია' : 'შესასწავლი'}</span>
                            </button>
                          ) : (
                            (['1', '2', '3'] as const).map(vNum => {
                              const itemVoices = Array.isArray(item.voices)
                                ? item.voices.map(v => String(v))
                                : typeof (item as any).voices === 'string'
                                ? ((item as any).voices as string).split(',').map(v => v.trim())
                                : [];
                              const isVoiceActive = itemVoices.includes(String(vNum));

                              return (
                                <button
                                  key={vNum}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleVoice(item.variantId, vNum);
                                  }}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer border flex items-center gap-0.5 ${
                                    isVoiceActive
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-1 ring-emerald-400/30'
                                      : 'bg-amber-50/60 text-amber-950 border-amber-200/80 hover:bg-amber-100/80'
                                  }`}
                                >
                                  {isVoiceActive && <Check className="w-2.5 h-2.5 stroke-[3] text-white" />}
                                  <span>{vNum} ხმა</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Bottom Save Button */}
          <div className="pt-3 pb-2 flex flex-col items-center justify-center gap-1.5 border-t border-amber-200/60">
            <button
              type="button"
              onClick={handleManualSave}
              className={`w-full max-w-xs py-2.5 px-5 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98 ${
                isSavedToast
                  ? 'bg-emerald-600 text-white border border-emerald-700 shadow-emerald-200'
                  : 'bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white hover:brightness-110 border border-amber-900'
              }`}
            >
              {isSavedToast ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>წარმატებით შენახულია!</span>
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  <span>ცვლილებების შენახვა</span>
                </>
              )}
            </button>
            <span className="text-[10px] font-semibold text-slate-400">
              ცვლილებები ავტომატურადაც ინახება
            </span>
          </div>
          
          <div className="text-center pt-2 pb-1 border-t border-amber-100">
            <p className="text-xs font-bold text-amber-900 leading-tight">
              ესარის შენი უკვე ნასწავლი გაკვეთილები, <br />
              იარე წინ დააგროვე საგანძური.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center bg-white rounded-2xl border border-amber-200/80 shadow-2xs space-y-2">
          <p className="text-xs font-bold text-slate-700">
            საგანძურის გზაზე ჯერ არაფერია დამატებული.
          </p>
          <p className="text-[11px] text-slate-500">
            გადადით „გალობა“-ში, „სიმღერა“-ში, „მთქმელი“-ში ან „საკრავები“-ში და მონიშნეთ თქვენი ელემენტები.
          </p>
          {onGoToGaloba && (
            <button
              type="button"
              onClick={onGoToGaloba}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ba8555] to-[#8d5427] text-white font-bold text-xs shadow-xs hover:brightness-105 transition-all cursor-pointer mt-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>გალობის სიაში გადასვლა</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface StudentBookmarkViewProps {
  onBack: () => void;
  onGoToGaloba?: () => void;
}

// "დამოუკიდებელი სამუშაო" COMPONENT ONLY
export const StudentBookmarkView: React.FC<StudentBookmarkViewProps> = ({ onBack, onGoToGaloba }) => {
  const [profile, setProfile] = useState<StudentProfile>({ firstName: '', lastName: '' });
  const [completedSessions, setCompletedSessions] = useState<{ [key: string]: boolean }>({});

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setProfile({ firstName: '', lastName: '' });
      setCompletedSessions({});
      return;
    }

    const userDocRef = doc(db, 'students', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.profile) {
          setProfile(prev => ({
            ...prev,
            ...data.profile
          }));
        }
        if (data.completedSessions) {
          setCompletedSessions(data.completedSessions);
        } else {
          setCompletedSessions({});
        }
      } else {
        setProfile({ firstName: '', lastName: '' });
        setCompletedSessions({});
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

  const getSelectedHoursForDay = (dayId: string): string[] => {
    const raw = profile.workSchedule?.[dayId];
    if (!raw || typeof raw !== 'string') return [];
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(s => AVAILABLE_HOURS.includes(s));
  };

  const handleToggleCompleted = async (dateKey: string, hour: string) => {
    const user = auth.currentUser;
    if (!user) return;

    const sessionKey = `${dateKey}_${hour}`;
    const nextCompleted = {
      ...completedSessions,
      [sessionKey]: !completedSessions[sessionKey]
    };

    if (!nextCompleted[sessionKey]) {
      delete nextCompleted[sessionKey];
    }

    setCompletedSessions(nextCompleted);

    try {
      const userDocRef = doc(db, 'students', user.uid);
      await setDoc(userDocRef, { completedSessions: nextCompleted }, { merge: true });
    } catch (err) {
      console.warn('Failed to sync completed session to Firestore (offline):', err);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarDays: Array<{
    dayNum: number;
    dateKey: string;
    dayOfWeekId: string;
    scheduledHours: string[];
    completedCount: number;
    isFullyCompleted: boolean;
    isPartiallyCompleted: boolean;
    isToday: boolean;
  } | null> = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }

  let monthPlannedHours = 0;
  let monthActualWorkedHours = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(currentYear, currentMonth, d);
    const dayOfWeekIndex = dayDate.getDay();
    const dayObj = DAYS_OF_WEEK.find(item => item.dayIndex === dayOfWeekIndex);
    const dayId = dayObj ? dayObj.id : 'ორშ';

    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;

    const scheduled = getSelectedHoursForDay(dayId);
    monthPlannedHours += scheduled.length;

    let completedCount = 0;
    scheduled.forEach(hour => {
      const sessionKey = `${dateKey}_${hour}`;
      if (completedSessions[sessionKey]) {
        completedCount++;
        monthActualWorkedHours++;
      }
    });

    const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === d;
    const isFullyCompleted = scheduled.length > 0 && completedCount === scheduled.length;
    const isPartiallyCompleted = scheduled.length > 0 && completedCount > 0 && completedCount < scheduled.length;

    calendarDays.push({
      dayNum: d,
      dateKey,
      dayOfWeekId: dayId,
      scheduledHours: scheduled,
      completedCount,
      isFullyCompleted,
      isPartiallyCompleted,
      isToday
    });
  }

  const progressPercent = monthPlannedHours > 0
    ? Math.min(100, Math.round((monthActualWorkedHours / monthPlannedHours) * 100))
    : 0;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in duration-200">
      {/* REAL MONTHLY STATISTICS GAUGE */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/90 via-white to-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col items-center justify-center space-y-2 text-center">
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-36 h-36 bg-amber-400/15 rounded-full blur-xl pointer-events-none"></div>

        <div className="w-full flex items-center justify-between border-b border-amber-100/80 pb-2 z-10">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs shrink-0">
              <Activity className="w-3.5 h-3.5 text-[#85502c]" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight truncate">
              {MONTH_NAMES_GE[currentMonth]}ის დამოუკიდებლად მუშაობის სტატისტიკა
            </h3>
          </div>

          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shadow-2xs shrink-0 ml-1 ${
            progressPercent >= 100 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
              : progressPercent > 0 
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            {progressPercent >= 100 ? '🎉 100%' : `${progressPercent}%`}
          </span>
        </div>

        <div className="relative w-28 h-28 sm:w-32 sm:h-32 my-1 flex items-center justify-center z-10">
          <svg className="w-28 h-28 sm:w-32 sm:h-32 -rotate-90 transform drop-shadow-sm" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="bookmarkViewGoldProgress" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
            </defs>

            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-amber-100/90"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="url(#bookmarkViewGoldProgress)"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
            <div className="flex items-baseline justify-center font-black tracking-tight leading-none">
              <span className="text-2xl sm:text-3xl text-slate-900">{monthActualWorkedHours}</span>
              <span className="text-base sm:text-lg text-amber-700 font-bold mx-0.5">/</span>
              <span className="text-lg sm:text-xl text-slate-500 font-extrabold">{monthPlannedHours}</span>
            </div>
            <span className="text-[10px] font-black text-[#85502c] uppercase tracking-wider mt-1 flex items-center gap-0.5">
              <CheckCheck className="w-3 h-3 text-amber-700" />
              შესრულება
            </span>
          </div>
        </div>
      </div>

      {/* REAL MONTHLY INTERACTIVE CALENDAR */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-amber-200/70 shadow-xs overflow-hidden transition-all">
        <div 
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="flex items-center justify-between p-2.5 sm:p-3 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 hover:bg-amber-50 cursor-pointer select-none transition-colors border-b border-transparent"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800">
              <CalendarDays className="w-3.5 h-3.5 text-[#85502c]" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                {MONTH_NAMES_GE[currentMonth]} {currentYear}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                {isCalendarOpen ? '' : '• კალენდრის გახსნა'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg bg-white hover:bg-amber-100 text-slate-700 border border-amber-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="წინა თვე"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg bg-white hover:bg-amber-100 text-slate-700 border border-amber-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="შემდეგი თვე"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className={`p-1 rounded-lg text-slate-400 hover:text-amber-800 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180 text-amber-700' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {isCalendarOpen && (
          <div className="p-2.5 sm:p-3 pt-1 border-t border-amber-100/70 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS_OF_WEEK.map(day => (
                <span key={day.id} className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 py-0">
                  {day.short}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayItem, index) => {
                if (!dayItem) {
                  return <div key={`empty-${index}`} className="min-h-[42px] sm:min-h-[46px] rounded-xl bg-slate-50/20"></div>;
                }

                const hasSchedule = dayItem.scheduledHours.length > 0;

                return (
                  <div
                    key={dayItem.dateKey}
                    className={`min-h-[42px] sm:min-h-[46px] rounded-xl transition-all relative flex flex-col items-center justify-between p-1 border select-none ${
                      dayItem.isFullyCompleted
                        ? 'bg-emerald-50/90 border-emerald-300/90 shadow-2xs ring-1 ring-emerald-200'
                        : dayItem.isPartiallyCompleted
                          ? 'bg-amber-50/80 border-amber-300/90 shadow-2xs'
                          : hasSchedule
                            ? 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                            : 'bg-slate-50/40 border-slate-200/60'
                    }`}
                  >
                    <div className="w-full flex items-center justify-center">
                      <span className={`text-[10px] sm:text-[11px] leading-none font-bold ${
                        dayItem.isToday 
                          ? 'text-amber-800 underline decoration-amber-600 decoration-2 font-black' 
                          : hasSchedule 
                            ? 'text-slate-800' 
                            : 'text-slate-400'
                      }`}>
                        {dayItem.dayNum}
                      </span>
                    </div>

                    {hasSchedule ? (
                      <div className="w-full flex flex-col gap-0.5 mt-0.5">
                        {dayItem.scheduledHours.map(hour => {
                          const sessionKey = `${dayItem.dateKey}_${hour}`;
                          const isCompleted = Boolean(completedSessions[sessionKey]);

                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCompleted(dayItem.dateKey, hour);
                              }}
                              title={`${dayItem.dayNum} ${MONTH_NAMES_GE[currentMonth]}: ${hour} (${isCompleted ? 'დააჭირეთ გასაუქმებლად' : 'დააჭირეთ შესასრულებლად'})`}
                              className={`w-full py-0.5 px-0.5 rounded-md text-[8.5px] sm:text-[9.5px] font-black leading-tight transition-all flex items-center justify-center gap-0.5 cursor-pointer border shadow-2xs ${
                                isCompleted
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 scale-[1.02]'
                                  : 'bg-white text-amber-950 border-amber-300/90 hover:bg-amber-100/80 hover:border-amber-400 active:scale-95'
                              }`}
                            >
                              {isCompleted && (
                                <Check className="w-2 h-2 stroke-[3] shrink-0 text-white" />
                              )}
                              <span className="tracking-tight whitespace-nowrap">{hour}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full h-1"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
