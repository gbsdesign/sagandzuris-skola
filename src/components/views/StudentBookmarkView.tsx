import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { MONTHS_GE, WEEKDAYS_GE } from '../../utils/dateNames';

export const triggerFireworks = () => {
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
  order?: number;           // set when a teacher arranges the path
  assignedByClass?: string; // class that put it here
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

interface StudentBookmarkViewProps {
  onBack: () => void;
  onGoToGaloba?: () => void;
}

// "დამოუკიდებელი სამუშაო" COMPONENT ONLY
export const StudentBookmarkView: React.FC<StudentBookmarkViewProps> = ({ onBack, onGoToGaloba }) => {
  const { closeModal } = useModal();
  const { navigateTo } = useNavigation();
  const [profile, setProfile] = useState<StudentProfile>({ firstName: '', lastName: '' });
  const [completedSessions, setCompletedSessions] = useState<{ [key: string]: boolean }>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  // day whose hours are shown under the calendar (today by default)
  const [pickedDay, setPickedDay] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setProfile({ firstName: '', lastName: '' });
      setCompletedSessions({});
      setIsLoaded(true);
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
      setIsLoaded(true);
    }, (error) => {
      if (error?.code === 'permission-denied') {
        console.warn('Firestore subscription permission denied (typically due to sign out).');
      } else {
        handleFirestoreError(error, OperationType.GET, `students/${user.uid}`);
      }
      setIsLoaded(true);
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

  const getDayIdForDate = (date: Date): string => {
    const dayObj = DAYS_OF_WEEK.find(item => item.dayIndex === date.getDay());
    return dayObj ? dayObj.id : 'ორშ';
  };

  const toDateKey = (date: Date): string => {
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${monthStr}-${dayStr}`;
  };

  const handleToggleCompleted = async (dateKey: string, hour: string) => {
    const user = auth.currentUser;
    if (!user) return;

    triggerHaptic(10);

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
      // replace the whole map: a plain merge would keep an un-ticked session
      await setDoc(userDocRef, { completedSessions: nextCompleted }, { mergeFields: ['completedSessions'] });
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

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const isViewingCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
  const todayKey = toDateKey(today);
  const hasAnySchedule = DAYS_OF_WEEK.some(day => getSelectedHoursForDay(day.id).length > 0);

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
    isMissed: boolean;
    isPast: boolean;
    isToday: boolean;
  } | null> = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null);
  }

  let monthPlannedHours = 0;
  let monthActualWorkedHours = 0;
  let monthMissedHours = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDate = new Date(currentYear, currentMonth, d);
    const dayId = getDayIdForDate(dayDate);
    const dateKey = toDateKey(dayDate);

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

    // YYYY-MM-DD keys compare correctly as plain strings
    const isPast = dateKey < todayKey;
    const isToday = dateKey === todayKey;
    const isFullyCompleted = scheduled.length > 0 && completedCount === scheduled.length;
    const isPartiallyCompleted = scheduled.length > 0 && completedCount > 0 && completedCount < scheduled.length;
    const isMissed = isPast && scheduled.length > 0 && completedCount === 0;

    if (isPast) {
      monthMissedHours += scheduled.length - completedCount;
    }

    calendarDays.push({
      dayNum: d,
      dateKey,
      dayOfWeekId: dayId,
      scheduledHours: scheduled,
      completedCount,
      isFullyCompleted,
      isPartiallyCompleted,
      isMissed,
      isPast,
      isToday
    });
  }

  const progressPercent = monthPlannedHours > 0
    ? Math.min(100, Math.round((monthActualWorkedHours / monthPlannedHours) * 100))
    : 0;

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      {isLoaded && !hasAnySchedule ? (
        <div className="flex flex-col items-center text-center gap-2.5 py-4">
          <span className="w-12 h-12 rounded-2xl bg-[#7a2028]/[0.07] text-[#7a2028] flex items-center justify-center">
            <CalendarClock className="w-6 h-6" />
          </span>
          <p className="font-serif-ge text-[15px] font-bold text-[#2a2017]">ჯერ არ გაქვს არჩეული მეცადინეობის საათები</p>
          <p className="text-[13px] text-[#8a7a6a] max-w-xs leading-relaxed">
            პროფილში მონიშნე, კვირის რომელ დღეებსა და საათებში იმეცადინებ — აქ კალენდარი გამოჩნდება.
          </p>
          <button
            type="button"
            onClick={() => { closeModal(); navigateTo('profile'); }}
            className="mt-1 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-sm transition-colors cursor-pointer active:scale-95"
          >
            <CalendarPlus className="w-4 h-4" />
            განრიგის დაყენება
          </button>
        </div>
      ) : (
        <>
          {/* the viewed month in one line: a slim bar (done, missed) and its hours */}
          <div className="space-y-2">
            <div className="h-1.5 rounded-full bg-[#efe5d4] overflow-hidden flex" aria-hidden>
              <div className="h-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${monthPlannedHours ? (100 * monthActualWorkedHours) / monthPlannedHours : 0}%` }} />
              <div className="h-full bg-rose-300 transition-[width] duration-500" style={{ width: `${monthPlannedHours ? (100 * monthMissedHours) / monthPlannedHours : 0}%` }} />
            </div>
            {monthMissedHours > 0 && (
              <p className="text-[12px] font-semibold text-[#75685a] tabular-nums"><b className="font-black text-[#2a2017]">{monthMissedHours}</b> საათი გამოტოვებული</p>
            )}
          </div>

          {/* wide screens: month on the left, the picked day on the right; phones: stacked */}
          <div className="grid md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] gap-x-6 gap-y-4 items-start">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <h3 className="flex-1 text-[15px] font-black text-[#2a2017]">
                  {MONTHS_GE[currentMonth]} <span className="font-semibold text-[#a4927c]">{currentYear}</span>
                </h3>
                {!isViewingCurrentMonth && (
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="h-9 px-3 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.12] text-[#7a2028] text-xs font-bold transition-colors cursor-pointer active:scale-95"
                    title="მიმდინარე თვეზე დაბრუნება"
                  >
                    დღეს
                  </button>
                )}
                <button type="button" onClick={handlePrevMonth} className="w-9 h-9 flex items-center justify-center rounded-full text-[#75685a] hover:bg-[#7a2028]/[0.06] hover:text-[#7a2028] transition-colors cursor-pointer active:scale-95" title="წინა თვე" aria-label="წინა თვე">
                  <ChevronLeft className="w-[18px] h-[18px]" />
                </button>
                <button type="button" onClick={handleNextMonth} className="w-9 h-9 flex items-center justify-center rounded-full text-[#75685a] hover:bg-[#7a2028]/[0.06] hover:text-[#7a2028] transition-colors cursor-pointer active:scale-95" title="შემდეგი თვე" aria-label="შემდეგი თვე">
                  <ChevronRight className="w-[18px] h-[18px]" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center">
                {DAYS_OF_WEEK.map(day => (
                  <span key={day.id} className="text-[11px] font-bold text-[#b3a594]">{day.short}</span>
                ))}
              </div>

              {/* a dot per planned hour; pick a day to tick its hours */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {calendarDays.map((dayItem, index) => {
                  if (!dayItem) return <div key={`empty-${index}`} className="h-11" />;
                  const hasSchedule = dayItem.scheduledHours.length > 0;
                  const picked = pickedDay === dayItem.dateKey;
                  return (
                    <button
                      key={dayItem.dateKey}
                      type="button"
                      onClick={() => setPickedDay(dayItem.dateKey)}
                      className={`h-11 rounded-xl flex flex-col items-center justify-center gap-[3px] transition-colors cursor-pointer select-none ${
                        picked ? 'bg-[#7a2028]/[0.09]' : 'hover:bg-[#fbf6ec]'
                      }`}
                      aria-pressed={picked}
                      aria-label={`${dayItem.dayNum} ${MONTHS_GE[currentMonth]}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] leading-none font-bold tabular-nums ${
                        dayItem.isToday ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_3px_8px_-3px_rgba(122,32,40,0.7)]'
                          : picked ? 'text-[#7a2028]'
                          : hasSchedule ? 'text-[#2a2017]' : 'text-[#cdbfa9]'
                      }`}>
                        {dayItem.dayNum}
                      </span>
                      <span className="h-1 flex gap-0.5">
                        {dayItem.scheduledHours.map(hour => {
                          const done = Boolean(completedSessions[`${dayItem.dateKey}_${hour}`]);
                          return (
                            <span
                              key={hour}
                              className={`w-1 h-1 rounded-full ${done ? 'bg-emerald-500' : dayItem.isPast ? 'bg-rose-300' : 'bg-[#7a2028]/35'}`}
                            />
                          );
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* the picked day: its hours to tick */}
            {(() => {
              const day = calendarDays.find(d => d?.dateKey === pickedDay);
              if (!day) return null;
              const allDone = day.scheduledHours.length > 0 && day.completedCount === day.scheduledHours.length;
              return (
                <div className="pt-3 border-t border-[#efe5d4] md:mt-11 md:pt-0 md:border-t-0 md:pl-6 md:border-l space-y-3">
                  <div>
                    {day.isToday && <p className="text-[11.5px] font-bold text-[#7a2028]">დღეს</p>}
                    <p className="text-[15px] font-black text-[#2a2017] leading-tight">
                      {day.dayNum} {MONTHS_GE[currentMonth]}
                      <span className="font-semibold text-[#8a7a6a]"> · {WEEKDAYS_GE[new Date(currentYear, currentMonth, day.dayNum).getDay()]}</span>
                    </p>
                  </div>
                  {day.scheduledHours.length === 0 ? (
                    <p className="text-[13px] text-[#8a7a6a]">ამ დღეს მეცადინეობა არ არის დაგეგმილი.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {day.scheduledHours.map(hour => {
                          const done = Boolean(completedSessions[`${day.dateKey}_${hour}`]);
                          const missed = day.isPast && !done;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleToggleCompleted(day.dateKey, hour)}
                              aria-pressed={done}
                              className={`h-11 px-4 rounded-full text-[15px] font-bold tabular-nums inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                                done
                                  ? 'bg-emerald-500 text-white shadow-[0_4px_12px_-6px_rgba(5,150,105,0.8)]'
                                  : missed
                                    ? 'bg-white text-rose-700 border border-dashed border-rose-300'
                                    : 'bg-white text-[#7a2028] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
                              }`}
                            >
                              {done && <Check className="w-4 h-4 stroke-[3]" />}
                              {hour}
                            </button>
                          );
                        })}
                      </div>
                      {allDone && <p className="text-[12px] font-semibold text-emerald-700">ყველა საათი შესრულებულია</p>}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};
