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
import { filterValidVariants } from '../../utils/variantValidation';
import { loadGuestData, saveGuestVariants } from '../../utils/localStorageSync';
import { useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { sortPathItems, categoryOf, usesVoices, PathCategory } from '../../utils/pathItems';
import { useConfirmations } from '../../hooks/useConfirmations';
import { useNotes } from '../../context/NotesContext';
import { findVersion, canOpenNotes } from '../../data/chantLookup';
import { getChantMedia } from '../../data/chantMediaRegistry';
import { FOLK_SONGS, getFolkRegion } from '../../data/songsData';
import { SongBody } from '../maps/GeorgiaMap';
import { MONTHS_GE, MONTHS_GEN_GE, WEEKDAYS_GE } from '../../utils/dateNames';

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
  /** leave out the "nothing added yet" card (the path page's summary card already shows the first step) */
  hideEmpty?: boolean;
  selectedChantVariants?: SelectedChantVariantsMap;
  onUpdateVariants?: (next: SelectedChantVariantsMap) => void;
}

// "გზა" PAGE COMPONENT ONLY
export const GzaView: React.FC<GzaViewProps> = ({
  onGoToGaloba,
  hideEmpty,
  selectedChantVariants: externalSelectedVariants,
  onUpdateVariants
}) => {
  const { navigateTo } = useNavigation();
  const [internalVariants, setInternalVariants] = useState<SelectedChantVariantsMap>({});
  // voices a teacher confirmed ("ჩათვლა"); the student can't undo those
  const confirmed = useConfirmations(auth.currentUser?.uid);
  const { openNotes } = useNotes();

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

  // the same sorting into categories as everywhere else (pathItems), so every instrument lands under საკრავები
  const inCategory = (c: PathCategory) => selectedVariantsList.filter(item => categoryOf(item.variantId) === c);
  const galobaItems = inCategory('galoba');
  const simgheraItems = inCategory('simghera');
  const mtkmeliItems = inCategory('mtkmeli');
  const sakravebiItems = inCategory('sakravebi');

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

  // voices as one segmented control: filled = learned, green = confirmed by the teacher
  const segOn = 'bg-[#7a2028] text-white shadow-[0_2px_6px_-2px_rgba(122,32,40,0.6)]';
  const segOff = 'text-[#6b5a4c] hover:bg-white hover:text-[#7a2028]';
  const segConfirmed = 'bg-emerald-600 text-white shadow-[0_2px_6px_-2px_rgba(5,150,105,0.6)]';
  const learnedOf = (item: SelectedChantVariantItem) => item.isLearned || voicesOf(item).length > 0;

  return (
    <div className="w-full mx-auto space-y-6 animate-in fade-in duration-200">
      {selectedVariantsList.length > 0 ? (
        <>
          {categories.map((cat) => {
            if (cat.items.length === 0) return null;

            return (
              <section key={cat.id} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 px-1">
                  <h3 className="flex items-center gap-2.5 font-serif-ge text-xl font-bold text-[#2a2017]">
                    <span aria-hidden className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#a3323d] to-[#7a2028]" />
                    {cat.title}
                  </h3>
                  <span className="h-7 px-3 rounded-full bg-[#7a2028]/[0.07] text-[#7a2028] text-xs font-bold inline-flex items-center tabular-nums whitespace-nowrap">
                    {cat.items.filter(learnedOf).length}/{cat.items.length} ნასწავლი
                  </span>
                </div>

                <div className="space-y-2.5">
                  {cat.items.map((item, index) => {
                    const song = cat.id === 'simghera' ? FOLK_SONGS.find(s => s.id === item.variantId) : undefined;
                    const chantVersion = cat.id === 'galoba' ? findVersion(item.variantId) : undefined;
                    const opensPage = Boolean(chantVersion && canOpenNotes(chantVersion.chant, chantVersion.variant));
                    const canOpen = opensPage || Boolean(song);
                    const isOpen = Boolean(song) && openId === item.variantId;
                    const recordings = cat.id === 'galoba'
                      ? (getChantMedia(item.chantId, item.code) ? 1 : 0)
                      : song?.versions.length ?? 0;
                    const title = song ? song.title : item.chantName;
                    const subtitle = song ? getFolkRegion(song.region).nameGe : item.code;
                    const itemVoices = voicesOf(item);
                    const toggleOpen = () => {
                      triggerHaptic(10);
                      // a chant opens its own notes page; a song still folds open here
                      if (opensPage) { openNotes(item.variantId, 'bookmark'); return; }
                      setOpenId(id => (id === item.variantId ? null : item.variantId));
                    };

                    return (
                      <div
                        key={item.variantId}
                        className={`rounded-2xl bg-white ring-1 transition-all duration-200 overflow-hidden ${
                          isOpen
                            ? 'ring-[#7a2028]/30 shadow-[0_18px_40px_-22px_rgba(122,32,40,0.55)]'
                            : 'ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-20px_rgba(42,32,23,0.35)] hover:ring-[#7a2028]/25'
                        }`}
                      >
                        <div className="flex items-start gap-2 pl-3.5 pr-2.5 pt-3">
                          <button
                            type="button"
                            disabled={!canOpen}
                            onClick={toggleOpen}
                            className="flex-1 min-w-0 flex items-start gap-2.5 text-left cursor-pointer disabled:cursor-default group"
                            aria-expanded={isOpen}
                          >
                            <span
                              className={`shrink-0 w-8 h-8 rounded-xl text-[13px] font-black flex items-center justify-center tabular-nums transition-colors ${
                                learnedOf(item) ? 'bg-gradient-to-br from-[#a3323d] to-[#7a2028] text-white' : 'bg-[#f6efe3] text-[#8a7a6a]'
                              }`}
                            >
                              {index + 1}
                            </span>
                            <span className="min-w-0 flex flex-col gap-1 pt-0.5">
                              <span className="font-serif-ge font-bold text-[15px] sm:text-base leading-snug text-[#2a2017] group-hover:text-[#7a2028] transition-colors break-words">
                                {title}
                              </span>
                              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[#8a7a6a]">
                                <span className="px-2 py-0.5 rounded-md bg-[#f6efe3] text-[#6b5a4c] font-semibold">{subtitle}</span>
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
                              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                isOpen ? 'rotate-180 bg-[#7a2028] text-white' : 'bg-[#7a2028]/[0.06] text-[#7a2028] hover:bg-[#7a2028]/[0.12]'
                              }`}
                              aria-label={isOpen ? 'დახურვა' : 'ნოტები და ჩანაწერები'}
                            >
                              {opensPage ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(item.variantId)}
                            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#c2b4a2] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.06] transition-colors cursor-pointer"
                            title="სიიდან ამოშლა"
                            aria-label="სიიდან ამოშლა"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* progress: voices learned (chants, songs) or simply learned (poems, instruments) */}
                        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 px-3.5 pt-2.5 pb-3">
                          {/* how many of the three voices are learned */}
                          {usesVoices(item.variantId) && (
                            <span className="mr-auto flex items-center gap-2 text-xs font-bold text-[#8a7a6a] tabular-nums">
                              <span className="w-14 sm:w-20 h-1.5 rounded-full bg-[#f1e8da] overflow-hidden">
                                <span
                                  className={`block h-full rounded-full transition-[width] duration-500 ${itemVoices.length >= 3 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#a3323d] to-[#7a2028]'}`}
                                  style={{ width: `${(100 * Math.min(itemVoices.length, 3)) / 3}%` }}
                                />
                              </span>
                              {Math.min(itemVoices.length, 3)}/3
                            </span>
                          )}
                          {!usesVoices(item.variantId) ? (
                            (confirmed[item.variantId] || []).includes('1') ? (
                              <span title="მასწავლებელმა ჩათვალა" className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${segConfirmed}`}>
                                <CheckCheck className="w-3.5 h-3.5" />
                                ჩათვლილია
                              </span>
                            ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleLearned(item.variantId)}
                              className={`h-9 px-4 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${item.isLearned ? segOn : 'bg-[#f6efe3] ' + segOff}`}
                            >
                              {item.isLearned && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              {item.isLearned ? 'ნასწავლია' : 'შესასწავლი'}
                            </button>
                            )
                          ) : (
                            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#f6efe3]">
                            {(['1', '2', '3'] as const).map(vNum => {
                              const on = itemVoices.includes(vNum);
                              if ((confirmed[item.variantId] || []).includes(vNum)) {
                                return (
                                  <span key={vNum} title="მასწავლებელმა ჩათვალა" className={`h-8 px-3.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${segConfirmed}`}>
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
                                  className={`h-8 px-3.5 rounded-full text-xs font-bold inline-flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${on ? segOn : segOff}`}
                                >
                                  {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  {vNum} ხმა
                                </button>
                              );
                            })}
                            </div>
                          )}
                        </div>

                        {/* notes and recordings, as in the chant / song lists */}
                        {isOpen && (
                          <div className="border-t border-[#f1e8da] bg-[#fdfaf5] p-2.5 sm:p-3 animate-in fade-in duration-200">
                            {song && <SongBody song={song} region={getFolkRegion(song.region)} />}
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
              className={`h-12 px-7 rounded-full text-sm font-bold inline-flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-[0_10px_24px_-12px_rgba(122,32,40,0.7)] ${
                isSavedToast ? 'bg-emerald-600 text-white' : 'bg-gradient-to-br from-[#8a2630] to-[#6a1b23] hover:from-[#7a2028] hover:to-[#5e1820] text-white'
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
      ) : hideEmpty ? null : (
        <div className="px-6 py-8 text-center rounded-3xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-20px_rgba(42,32,23,0.35)] space-y-2">
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

  const monthRemainingHours = Math.max(0, monthPlannedHours - monthActualWorkedHours - monthMissedHours);

  const progressPercent = monthPlannedHours > 0
    ? Math.min(100, Math.round((monthActualWorkedHours / monthPlannedHours) * 100))
    : 0;

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-200">
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
          {/* wide screens: month on the left, the picked day on the right; phones: stacked */}
          <div className="grid md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] gap-x-6 gap-y-3 items-start">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <h3 className="flex-1 font-serif-ge text-[15px] font-bold text-[#2a2017]">
                  {MONTHS_GE[currentMonth]} {currentYear}
                </h3>
                {!isViewingCurrentMonth && (
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="h-8 px-3 rounded-full bg-[#7a2028]/[0.07] hover:bg-[#7a2028]/[0.12] text-[#7a2028] text-xs font-bold transition-colors cursor-pointer active:scale-95"
                    title="მიმდინარე თვეზე დაბრუნება"
                  >
                    დღეს
                  </button>
                )}
                <button type="button" onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full ring-1 ring-[#e8dcc8] bg-white hover:ring-[#7a2028]/40 text-[#4a3426] transition-all cursor-pointer active:scale-95" title="წინა თვე" aria-label="წინა თვე">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full ring-1 ring-[#e8dcc8] bg-white hover:ring-[#7a2028]/40 text-[#4a3426] transition-all cursor-pointer active:scale-95" title="შემდეგი თვე" aria-label="შემდეგი თვე">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 text-center">
                {DAYS_OF_WEEK.map(day => (
                  <span key={day.id} className="text-[11px] font-bold text-[#b3a594]">{day.short}</span>
                ))}
              </div>

              {/* a dot per planned hour; pick a day to tick its hours */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((dayItem, index) => {
                  if (!dayItem) return <div key={`empty-${index}`} className="h-9" />;
                  const hasSchedule = dayItem.scheduledHours.length > 0;
                  const picked = pickedDay === dayItem.dateKey;
                  return (
                    <button
                      key={dayItem.dateKey}
                      type="button"
                      onClick={() => setPickedDay(dayItem.dateKey)}
                      className={`h-9 rounded-lg flex flex-col items-center justify-center gap-[3px] transition-colors cursor-pointer select-none ${
                        picked ? 'bg-[#7a2028]/[0.08] ring-[1.5px] ring-[#7a2028]' : 'hover:bg-[#fbf6ec]'
                      }`}
                      aria-pressed={picked}
                      aria-label={`${dayItem.dayNum} ${MONTHS_GE[currentMonth]}`}
                    >
                      <span className={`min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[11px] leading-none font-bold tabular-nums ${
                        dayItem.isToday ? 'bg-[#7a2028] text-[#fbf6ec]' : hasSchedule ? 'text-[#2a2017]' : 'text-[#cbbca6]'
                      }`}>
                        {dayItem.dayNum}
                      </span>
                      {hasSchedule && (
                        <span className="flex gap-0.5">
                          {dayItem.scheduledHours.map(hour => {
                            const done = Boolean(completedSessions[`${dayItem.dateKey}_${hour}`]);
                            return (
                              <span
                                key={hour}
                                className={`w-1 h-1 rounded-full ${done ? 'bg-emerald-600' : dayItem.isPast ? 'bg-rose-300' : 'bg-[#7a2028]/35'}`}
                              />
                            );
                          })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 md:pt-9">
              {/* the picked day's hours */}
              {(() => {
                const day = calendarDays.find(d => d?.dateKey === pickedDay);
                if (!day) return null;
                return (
                  <div className="rounded-2xl bg-[#fbf6ec] ring-1 ring-[#efe5d4] px-3 py-2.5 space-y-2">
                    <p className="text-sm font-bold text-[#2a2017]">
                      {day.dayNum} {MONTHS_GE[currentMonth]}
                      <span className="font-normal text-[#8a7a6a]"> · {WEEKDAYS_GE[new Date(currentYear, currentMonth, day.dayNum).getDay()]}</span>
                    </p>
                    {day.scheduledHours.length === 0 ? (
                      <p className="text-xs text-[#8a7a6a]">ამ დღეს მეცადინეობა არ არის დაგეგმილი.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {day.scheduledHours.map(hour => {
                          const done = Boolean(completedSessions[`${day.dateKey}_${hour}`]);
                          const missed = day.isPast && !done;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleToggleCompleted(day.dateKey, hour)}
                              aria-pressed={done}
                              className={`h-9 px-3.5 rounded-full text-sm font-bold tabular-nums inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                                done
                                  ? 'bg-emerald-600 text-white'
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
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3.5 gap-y-1 text-[11px] font-semibold text-[#8a7a6a] md:px-1">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-600" />შესრულდა</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#7a2028]/35" />დაგეგმილი</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-300" />გამოტოვებული</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
