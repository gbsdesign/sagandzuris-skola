import React, { useState, useEffect } from 'react';
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  CheckCheck,
  Music,
  X,
  Sparkles,
  Headphones
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ALL_CHANTS } from '../../data/gelatiBookChants';
import { filterValidVariants } from '../../utils/variantValidation';
import { loadGuestData, saveGuestVariants } from '../../utils/localStorageSync';
import { useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { sortPathItems } from '../../utils/pathItems';
import { useConfirmations } from '../../hooks/useConfirmations';
import { ChantDetailPage } from '../../pages/ChantDetailPage';
import { getChantMedia } from '../../data/chantMediaRegistry';
import { FOLK_SONGS, getFolkRegion } from '../../data/songsData';
import { SongBody } from '../maps/GeorgiaMap';

const VARIANT_ORDER_MAP: { [variantId: string]: number } = {};
let orderIndex = 0;
ALL_CHANTS.forEach(chant => {
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

const MONTH_NAMES_GE = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

// Genitive forms ("ოქტომბრის სტატისტიკა", not "ოქტომბერიის")
const MONTH_GENITIVE_GE = [
  'იანვრის', 'თებერვლის', 'მარტის', 'აპრილის', 'მაისის', 'ივნისის',
  'ივლისის', 'აგვისტოს', 'სექტემბრის', 'ოქტომბრის', 'ნოემბრის', 'დეკემბრის'
];

// Indexed by Date.getDay() (0 = Sunday)
const WEEKDAY_FULL_GE = [
  'კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'
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
  // voices a teacher confirmed ("ჩათვლა"); the student can't undo those
  const confirmed = useConfirmations(auth.currentUser?.uid);

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

  // teacher's order first, otherwise catalogue order
  const selectedVariantsList = sortPathItems(Object.values(activeVariantsMap));

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

  // only one item is unfolded at a time, so only one player plays
  const [openId, setOpenId] = useState<string | null>(null);

  const voicesOf = (item: SelectedChantVariantItem) =>
    Array.isArray(item.voices)
      ? item.voices.map(v => String(v))
      : typeof (item as any).voices === 'string'
      ? ((item as any).voices as string).split(',').map(v => v.trim())
      : [];

  const chipOn = 'bg-[#7a2028] text-[#fbf6ec] ring-[#7a2028]';
  const chipOff = 'bg-[#fbf6ec] text-[#4a3426] ring-[#e6d9c2] hover:ring-[#7a2028]/40 hover:text-[#7a2028]';
  const chipConfirmed = 'bg-emerald-700 text-white ring-emerald-700';

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {selectedVariantsList.length > 0 ? (
        <>
          {categories.map((cat) => {
            if (cat.items.length === 0) return null;

            return (
              <section key={cat.id} className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-3 px-1 pb-1.5 border-b border-[#e6d9c2]">
                  <h3 className="font-serif-ge text-xl font-bold text-[#7a2028]">{cat.title}</h3>
                  <span className="text-[13px] text-[#8a7a6a]">
                    {cat.items.length} {cat.unitSingular}
                  </span>
                </div>

                <div className="space-y-2">
                  {cat.items.map((item, index) => {
                    const song = cat.id === 'simghera' ? FOLK_SONGS.find(s => s.id === item.variantId) : undefined;
                    const canOpen = cat.id === 'galoba' || Boolean(song);
                    const isOpen = canOpen && openId === item.variantId;
                    const recordings = cat.id === 'galoba'
                      ? (getChantMedia(item.chantId, item.code) ? 1 : 0)
                      : song?.versions.length ?? 0;
                    const title = song ? song.title : item.chantName;
                    const subtitle = song ? getFolkRegion(song.region).nameGe : item.code;
                    const itemVoices = voicesOf(item);
                    const toggleOpen = () => {
                      triggerHaptic(10);
                      setOpenId(id => (id === item.variantId ? null : item.variantId));
                    };

                    return (
                      <div
                        key={item.variantId}
                        className={`rounded-2xl bg-white ring-1 transition-all overflow-hidden ${
                          isOpen ? 'ring-[#7a2028]/30 shadow-[0_8px_24px_-12px_rgba(122,32,40,0.35)]' : 'ring-[#e6d9c2] hover:ring-[#7a2028]/25'
                        }`}
                      >
                        <div className="flex items-start gap-2 pl-3 pr-2 pt-2.5">
                          <button
                            type="button"
                            disabled={!canOpen}
                            onClick={toggleOpen}
                            className="flex-1 min-w-0 flex items-start gap-2.5 text-left cursor-pointer disabled:cursor-default group"
                            aria-expanded={isOpen}
                          >
                            <span className="shrink-0 w-6 h-6 mt-0.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#e6d9c2] text-[11px] font-bold text-[#8a7a6a] flex items-center justify-center">
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex flex-col gap-0.5">
                              <span className="font-serif-ge font-bold text-[15px] sm:text-base leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors break-words">
                                {title}
                              </span>
                              <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-[#8a7a6a]">
                                {subtitle}
                                {cat.id === 'galoba' && (
                                  <span className="inline-flex items-center gap-1">
                                    <span className="text-[#d8c9b0]">·</span>
                                    <Music className="w-3 h-3" />
                                    ნოტები
                                  </span>
                                )}
                                {recordings > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[#7a2028]/80">
                                    <span className="text-[#d8c9b0]">·</span>
                                    <Headphones className="w-3 h-3" />
                                    {cat.id === 'galoba' ? 'ჩანაწერი' : `${recordings} ჩანაწერი`}
                                  </span>
                                )}
                              </span>
                            </span>
                          </button>

                          {canOpen && (
                            <button
                              type="button"
                              onClick={toggleOpen}
                              className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                isOpen ? 'rotate-180 bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/5 text-[#7a2028] hover:bg-[#7a2028]/10'
                              }`}
                              aria-label={isOpen ? 'დახურვა' : 'ნოტები და ჩანაწერები'}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(item.variantId)}
                            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#b5a898] hover:text-[#7a2028] hover:bg-[#7a2028]/5 transition-colors cursor-pointer"
                            title="სიიდან ამოშლა"
                            aria-label="სიიდან ამოშლა"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* progress: voices learned (chants, songs) or simply learned (poems, instruments) */}
                        <div className="flex flex-wrap items-center justify-end gap-1.5 px-3 pt-2 pb-2.5">
                          {isSakravi(item) || isMtkmeli(item) ? (
                            (confirmed[item.variantId] || []).includes('1') ? (
                              <span title="მასწავლებელმა ჩათვალა" className={`h-8 px-3 rounded-full ring-1 text-xs font-bold inline-flex items-center gap-1 ${chipConfirmed}`}>
                                <CheckCheck className="w-3.5 h-3.5" />
                                ჩათვლილია
                              </span>
                            ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLearned(item.variantId)}
                              className={`h-8 px-3 rounded-full ring-1 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${item.isLearned ? chipOn : chipOff}`}
                            >
                              {item.isLearned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {item.isLearned ? 'ნასწავლია' : 'შესასწავლი'}
                            </button>
                            )
                          ) : (
                            (['1', '2', '3'] as const).map(vNum => {
                              const on = itemVoices.includes(vNum);
                              if ((confirmed[item.variantId] || []).includes(vNum)) {
                                return (
                                  <span key={vNum} title="მასწავლებელმა ჩათვალა" className={`h-8 px-3 rounded-full ring-1 text-xs font-bold inline-flex items-center gap-1 ${chipConfirmed}`}>
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    {vNum} ხმა
                                  </span>
                                );
                              }
                              return (
                                <button
                                  key={vNum}
                                  type="button"
                                  onClick={() => handleToggleVoice(item.variantId, vNum)}
                                  className={`h-8 px-3 rounded-full ring-1 text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${on ? chipOn : chipOff}`}
                                >
                                  {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  {vNum} ხმა
                                </button>
                              );
                            })
                          )}
                        </div>

                        {/* notes and recordings, as in the chant / song lists */}
                        {isOpen && (
                          <div className="border-t border-[#efe5d4] bg-[#fbf6ec]/60 p-2.5 sm:p-3 animate-in fade-in duration-200">
                            {song ? (
                              <SongBody song={song} region={getFolkRegion(song.region)} />
                            ) : (
                              <div className="rounded-xl bg-white ring-1 ring-[#e6d9c2] px-2 pb-2.5 pt-1.5">
                                <ChantDetailPage key={item.variantId} chantId={item.chantId} variantId={item.variantId} inline />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <div className="flex flex-col items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleManualSave}
              className={`h-11 px-6 rounded-full text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${
                isSavedToast ? 'bg-emerald-700 text-white' : 'bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec]'
              }`}
            >
              {isSavedToast ? <Check className="w-4 h-4 stroke-[3]" /> : <CheckCheck className="w-4 h-4" />}
              {isSavedToast ? 'შენახულია' : 'ცვლილებების შენახვა'}
            </button>
            <span className="text-xs text-[#8a7a6a]">ცვლილებები ავტომატურადაც ინახება</span>
            {Object.values(confirmed).some(v => v.length > 0) && (
              <span className="text-xs text-[#8a7a6a] inline-flex items-center gap-1">
                <CheckCheck className="w-3.5 h-3.5 text-emerald-700" /> მწვანე — მასწავლებელმა ჩათვალა
              </span>
            )}
            <p className="mt-2 font-serif-ge text-[15px] text-center text-[#4a3426] leading-relaxed">
              ეს არის შენი უკვე ნასწავლი გაკვეთილები —<br />იარე წინ, დააგროვე საგანძური.
            </p>
          </div>
        </>
      ) : (
        <div className="p-6 text-center rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e6d9c2] space-y-2">
          <p className="font-serif-ge text-base font-bold text-[#4a3426]">საგანძურის გზაზე ჯერ არაფერია დამატებული.</p>
          <p className="text-[13px] text-[#8a7a6a]">
            გადადით „გალობა“-ში, „სიმღერა“-ში, „მთქმელი“-ში ან „საკრავები“-ში და მონიშნეთ თქვენი ელემენტები.
          </p>
          {onGoToGaloba && (
            <button
              type="button"
              onClick={onGoToGaloba}
              className="mt-2 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-sm transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              გალობის სიაში გადასვლა
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
  const { openModal } = useModal();
  const [profile, setProfile] = useState<StudentProfile>({ firstName: '', lastName: '' });
  const [completedSessions, setCompletedSessions] = useState<{ [key: string]: boolean }>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(true);

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

  const monthRemainingHours = Math.max(0, monthPlannedHours - monthActualWorkedHours - monthMissedHours);

  const progressPercent = monthPlannedHours > 0
    ? Math.min(100, Math.round((monthActualWorkedHours / monthPlannedHours) * 100))
    : 0;

  // Nearest upcoming session that is not marked yet (looks two weeks ahead from today)
  const nextSession = (() => {
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
      const dateKey = toDateKey(date);
      const hour = getSelectedHoursForDay(getDayIdForDate(date)).find(h => {
        if (completedSessions[`${dateKey}_${h}`]) return false;
        return offset > 0 || parseInt(h, 10) >= today.getHours();
      });
      if (hour) return { date, hour, offset };
    }
    return null;
  })();

  const nextSessionLabel = nextSession
    ? nextSession.offset === 0
      ? 'დღეს'
      : nextSession.offset === 1
        ? 'ხვალ'
        : `${WEEKDAY_FULL_GE[nextSession.date.getDay()]}, ${nextSession.date.getDate()} ${MONTH_NAMES_GE[nextSession.date.getMonth()]}`
    : '';

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const statRows = [
    { label: 'შესრულებული', value: monthActualWorkedHours, dot: 'bg-emerald-500', text: 'text-emerald-800' },
    { label: 'გამოტოვებული', value: monthMissedHours, dot: 'bg-rose-400', text: 'text-rose-700' },
    { label: 'დარჩენილი', value: monthRemainingHours, dot: 'bg-amber-400', text: 'text-amber-900' },
  ];

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 animate-in fade-in duration-200">
      {/* REAL MONTHLY STATISTICS GAUGE */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-50/90 via-white to-amber-50/40 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="absolute -top-10 left-10 w-36 h-36 bg-amber-400/15 rounded-full blur-xl pointer-events-none"></div>

        <div className="relative w-full flex items-center justify-between gap-2 border-b border-amber-100/80 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs shrink-0">
              <Activity className="w-4 h-4 text-[#85502c]" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-snug">
              {MONTH_GENITIVE_GE[currentMonth]} სტატისტიკა
            </h3>
          </div>

          {(!isLoaded || hasAnySchedule) && (
            <span className={`text-xs font-black px-2.5 py-1 rounded-full border shadow-2xs shrink-0 ${
              progressPercent >= 100
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : progressPercent > 0
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {progressPercent >= 100 ? '🎉 100%' : `${progressPercent}%`}
            </span>
          )}
        </div>

        {isLoaded && !hasAnySchedule ? (
          <div className="relative flex flex-col items-center text-center gap-2.5 py-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300/80 flex items-center justify-center">
              <CalendarClock className="w-6 h-6 text-[#85502c]" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              ჯერ არ გაქვს არჩეული მეცადინეობის საათები
            </p>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              პროფილში მონიშნე, კვირის რომელ დღეებსა და საათებში იმეცადინებ — აქ კალენდარი და სტატისტიკა გამოჩნდება.
            </p>
            <button
              type="button"
              onClick={() => openModal('profile')}
              className="mt-1 inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white font-black text-sm shadow-xs hover:brightness-110 active:scale-98 transition-all cursor-pointer border border-amber-900"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>განრიგის დაყენება</span>
            </button>
          </div>
        ) : (
          <>
            <div className="relative flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
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
                    className="stroke-amber-100"
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
                  <span className="text-[10px] font-bold text-slate-500 mt-1">
                    საათი
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-[170px] max-w-[240px] space-y-1.5">
                {statRows.map(row => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/70 shadow-2xs"
                  >
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${row.dot}`}></span>
                      {row.label}
                    </span>
                    <span className={`text-sm font-black ${row.text}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {nextSession && (
              <div className="relative flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 pt-2.5 border-t border-amber-100/80 text-xs sm:text-sm text-center">
                <span className="flex items-center gap-1.5 font-semibold text-slate-500 whitespace-nowrap">
                  <CalendarClock className="w-4 h-4 text-amber-700 shrink-0" />
                  შემდეგი მეცადინეობა:
                </span>
                <span className="font-black text-slate-800 whitespace-nowrap">
                  {nextSessionLabel} · {nextSession.hour}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* REAL MONTHLY INTERACTIVE CALENDAR */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-amber-200/70 shadow-xs overflow-hidden transition-all">
        <div
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:p-3 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/80 hover:bg-amber-50 cursor-pointer select-none transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0">
              <CalendarDays className="w-4 h-4 text-[#85502c]" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-800 whitespace-nowrap">
                {MONTH_NAMES_GE[currentMonth]} {currentYear}
              </h3>
              {!isCalendarOpen && (
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  • კალენდრის გახსნა
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="h-9 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="მიმდინარე თვეზე დაბრუნება"
                >
                  დღეს
                </button>
              )}
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-amber-100 text-slate-700 border border-amber-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="წინა თვე"
                aria-label="წინა თვე"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white hover:bg-amber-100 text-slate-700 border border-amber-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="შემდეგი თვე"
                aria-label="შემდეგი თვე"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-amber-800 transition-transform duration-200 ${isCalendarOpen ? 'rotate-180 text-amber-700' : ''}`}
              title={isCalendarOpen ? 'კალენდრის დაკეცვა' : 'კალენდრის გახსნა'}
            >
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        </div>

        {isCalendarOpen && (
          <div className="p-2.5 sm:p-3 border-t border-amber-100/70 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
              {DAYS_OF_WEEK.map(day => (
                <span key={day.id} className="text-[10px] sm:text-[11px] font-extrabold text-slate-400">
                  {day.short}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((dayItem, index) => {
                if (!dayItem) {
                  return <div key={`empty-${index}`} className="min-h-[48px] sm:min-h-[56px]"></div>;
                }

                const hasSchedule = dayItem.scheduledHours.length > 0;

                return (
                  <div
                    key={dayItem.dateKey}
                    className={`min-h-[48px] sm:min-h-[56px] rounded-xl transition-all relative flex flex-col items-center gap-1 p-0.5 sm:p-1 border select-none ${
                      dayItem.isFullyCompleted
                        ? 'bg-emerald-50/90 border-emerald-300/90 shadow-2xs'
                        : dayItem.isPartiallyCompleted
                          ? 'bg-amber-50/80 border-amber-300/90 shadow-2xs'
                          : dayItem.isMissed
                            ? 'bg-rose-50/70 border-rose-200'
                            : hasSchedule
                              ? 'bg-amber-50/40 border-amber-200/90 shadow-2xs'
                              : dayItem.isPast
                                ? 'bg-slate-50/30 border-slate-100'
                                : 'bg-slate-50/50 border-slate-200/60'
                    } ${dayItem.isToday ? 'ring-2 ring-amber-500 ring-offset-1 ring-offset-white' : ''}`}
                  >
                    {dayItem.isFullyCompleted && (
                      <CircleCheck className="absolute top-0.5 right-0.5 w-3 h-3 text-emerald-600 hidden sm:block" />
                    )}

                    <span className={`mt-0.5 min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[11px] sm:text-xs leading-none font-bold ${
                      dayItem.isToday
                        ? 'bg-amber-600 text-white font-black'
                        : hasSchedule
                          ? 'text-slate-800'
                          : dayItem.isPast
                            ? 'text-slate-300'
                            : 'text-slate-400'
                    }`}>
                      {dayItem.dayNum}
                    </span>

                    {hasSchedule && (
                      <div className="w-full flex flex-col gap-0.5 sm:gap-1">
                        {dayItem.scheduledHours.map(hour => {
                          const sessionKey = `${dayItem.dateKey}_${hour}`;
                          const isCompleted = Boolean(completedSessions[sessionKey]);
                          const isMissedHour = dayItem.isPast && !isCompleted;

                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCompleted(dayItem.dateKey, hour);
                              }}
                              aria-pressed={isCompleted}
                              aria-label={`${dayItem.dayNum} ${MONTH_NAMES_GE[currentMonth]}, ${hour}`}
                              title={`${dayItem.dayNum} ${MONTH_NAMES_GE[currentMonth]}: ${hour} (${isCompleted ? 'დააჭირეთ გასაუქმებლად' : 'დააჭირეთ შესასრულებლად'})`}
                              className={`w-full py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-black leading-tight tracking-tight transition-all flex items-center justify-center gap-0.5 cursor-pointer border active:scale-95 ${
                                isCompleted
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                  : isMissedHour
                                    ? 'bg-white text-rose-700 border-rose-300 border-dashed hover:bg-rose-50'
                                    : 'bg-white text-amber-950 border-amber-300/90 hover:bg-amber-100/80 hover:border-amber-400 shadow-2xs'
                              }`}
                            >
                              {isCompleted && (
                                <Check className="w-2.5 h-2.5 stroke-[3] shrink-0 text-white hidden sm:block" />
                              )}
                              <span className="whitespace-nowrap">{hour}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend + hint */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-600"></span>
                  შესრულდა
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-amber-300"></span>
                  დაგეგმილი
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-white border border-dashed border-rose-300"></span>
                  გამოტოვებული
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-600"></span>
                  დღეს
                </span>
              </div>
              <p className="text-center text-[11px] text-slate-400">
                იმეცადინე? დააჭირე საათს და მოინიშნება შესრულებულად.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
