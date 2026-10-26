import React, { lazy, useEffect, useRef, useState } from 'react';
import { useNavigation, useChants, useAuth, PageType } from '../context';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { PageBar } from '../components/ui/kit';
import { PinButton } from '../components/home/ShortcutShelf';
import { ProfileActions } from '../components/views/ProfileActions';
import { prayerTitle } from '../data/prayers';
import { HomePage } from '../pages/HomePage';
import { GalobaPage } from '../pages/GalobaPage';
import { StudentProfileCard } from '../components/views';
import { ChvevebiContent } from '../components/views/ChvevebiPanel';
import { PATH_ORBS, PathOrbs } from '../components/views/PathOrbs';
import { PathTabs } from '../components/views/PathTabs';
import { ChemiSamosi } from '../components/views/ChemiSamosi';
import { ShortcutShelf } from '../components/home/ShortcutShelf';
import { useAccess } from '../hooks/useAccess';
import { LockedPage } from '../components/access/SignInPrompt';
import { SECTIONS, sectionOfPage } from '../data/sections';
import { useMyPsalterGroups } from '../hooks/usePsalter';
import { useAllClasses, useMyClasses, useTeachingClasses } from '../hooks/useClasses';
import { useSelectedGroupId } from '../components/psalter/selectedGroup';

// Fetches the newest version of the app (the service worker takes over at once — registerType 'autoUpdate') and
// starts it again. A page's file that is missing while online means a newer version was published after this tab
// was opened: its old file is gone from the site.
const reloadFresh = async () => {
  try {
    const sw = navigator.serviceWorker;
    const reg = await sw?.getRegistration();
    if (sw && reg) {
      await reg.update();
      if (reg.installing || reg.waiting) {
        await new Promise<void>(done => {
          const t = setTimeout(done, 10_000);
          sw.addEventListener('controllerchange', () => { clearTimeout(t); done(); }, { once: true });
        });
      }
    }
  } catch { /* reload anyway */ }
  window.location.reload();
};

// The page loader tries the new version once by itself; if the page still fails after that, „გვერდი ვერ
// ჩაიტვირთა“ shows — a real problem is never hidden (the user's wish, 2026-10-20).
const RELOADED_KEY = 'sg-fresh-reload';
const tryFreshOnce = (): boolean => {
  if (!navigator.onLine) return false;
  try {
    const at = Number(sessionStorage.getItem(RELOADED_KEY) || 0);
    if (Date.now() - at < 120_000) return false;
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    return false;
  }
  void reloadFresh();
  return true;
};

// A page whose file is not on the phone yet and cannot be fetched: offline before it was ever opened (some pages
// are not downloaded in advance — vite.config.ts globIgnores), or still failing after the new version was fetched.
// Says so instead of the error box; „ხელახლა ცდა“ fetches the newest version and starts again.
const NotLoaded: React.FC = () => {
  const { navigateTo } = useNavigation();
  return (
    <div className="w-full max-w-sm mx-auto py-16 px-4 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-3xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><WifiOff className="w-8 h-8" /></div>
      <p className="font-serif-ge text-xl font-bold text-[#4a3426]">გვერდი ვერ ჩაიტვირთა</p>
      <p className="text-[15px] text-[#75685a]">ინტერნეტის გარეშე ეს გვერდი მხოლოდ მაშინ იხსნება, თუ ერთხელ უკვე გახსნილი იყო. შეამოწმეთ ინტერნეტი და სცადეთ ხელახლა.</p>
      <div className="flex flex-wrap justify-center gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => void reloadFresh()}
          className="h-11 px-5 rounded-full bg-[#7a2028] text-[#fbf6ec] font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition"
        >
          <RefreshCw className="w-4 h-4" />ხელახლა ცდა
        </button>
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="h-11 px-5 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[#4a3426] font-bold cursor-pointer active:scale-95 transition"
        >
          მთავარზე
        </button>
      </div>
    </div>
  );
};

// Pages load when first opened, so the first visit downloads less (App wraps the router in Suspense).
// While the new version is being fetched the loader stays pending (the Suspense spinner shows).
const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType<any>>>, name: T) =>
  lazy(() => load().then(
    m => ({ default: m[name] }),
    () => (tryFreshOnce() ? new Promise<never>(() => {}) : { default: NotLoaded }),
  ));
const GeorgiaMap = page(() => import('../components/maps/GeorgiaMap'), 'GeorgiaMap');
const MtkmeliMap = page(() => import('../components/maps/MtkmeliMap'), 'MtkmeliMap');
const SakravebiView = page(() => import('../components/views/SakravebiView'), 'SakravebiView');
const AdminPanelPage = page(() => import('../pages/AdminPanelPage'), 'AdminPanelPage');
const ClassPage = page(() => import('../pages/ClassPage'), 'ClassPage');
const AncestorsPage = page(() => import('../pages/AncestorsPage'), 'AncestorsPage');
const PrayerPage = page(() => import('../pages/PrayerPage'), 'PrayerPage');
const CommemorationPage = page(() => import('../pages/CommemorationPage'), 'CommemorationPage');
const LibraryPage = page(() => import('../pages/LibraryPage'), 'LibraryPage');
const PsalterPage = page(() => import('../pages/PsalterPage'), 'PsalterPage');
const MessagesPage = page(() => import('../pages/MessagesPage'), 'MessagesPage');
const AbituriPage = page(() => import('../pages/AbituriPage'), 'AbituriPage');
const OfflinePage = page(() => import('../pages/OfflinePage'), 'OfflinePage');
const BirthdaysPage = page(() => import('../pages/BirthdaysPage'), 'BirthdaysPage');
const GamesPage = page(() => import('../pages/GamesPage'), 'GamesPage');

/** „ფსალმუნთა ჯგუფი“ (the vine, the home tile, a reminder): the class page of the group's class, opened at its psalter
 *  section; a group no class holds (made before 2026-10-20) keeps the old group page. Waits a moment for the classes. */
const PsalterOrClass: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { groups, loading } = useMyPsalterGroups(user?.uid);
  const selectedId = useSelectedGroupId();
  const mine = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const { classes: all } = useAllClasses(isAdmin);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setWaited(true), 1500);
    return () => window.clearTimeout(t);
  }, []);
  const group = groups.find(g => g.id === selectedId) || groups[0];
  const cls = group && [...mine, ...teaching, ...all].find(c => c.psalterGroupId === group.id);
  if (cls) return <ClassPage classId={cls.id} focus="psalter" />;
  if (user && (loading || (group && !waited))) return <div className="py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>;
  return <PsalterPage />;
};

interface AppRouterProps {
  logoUrl: string;
}

// the title the one PageBar shows on each inner page (the prayer page's comes from the prayer itself)
const PAGE_TITLES: Partial<Record<PageType, string>> = {
  galoba: 'გალობა',
  simghera: 'სიმღერა',
  mtkmeli: 'მთქმელი',
  sakravebi: 'საკრავები',
  gz: 'საგანძურის გზა',
  tsinaprebi: 'გაიცანი წინაპრები',
  biblioteka: 'ბიბლიოთეკა',
  abituri: 'აბიტურიენტს',
  offline: 'ოფლაინ რეჟიმი',
  commemoration: 'მოსახსენებელი',
  birthdays: 'დაბადების დღეები',
  games: 'თამაშები',
};
// an open library book shows its own name in the bar (the shelf's covers; LibraryPage's `mapItem` „book:12“)
const LIBRARY_BOOKS: Record<string, string> = {
  book: 'საღმრთო ისტორია', lives: 'წმიდანთა ცხოვრება', feasts: 'დღესასწაულები', prayers: 'ლოცვანი',
  sasuliero: 'სასულიერო წიგნები', audio: 'საგალობლების mp3',
};

export const AppRouter: React.FC<AppRouterProps> = ({ logoUrl }) => {
  const { currentPage, selectedPrayerId, mapItem, handleGoBack, navigateTo } = useNavigation();
  const { user, loading, isAdmin, isTeacher } = useAuth();
  const access = useAccess();
  const {
    selectedChantVariants,
    handleToggleSong,
    handleTogglePoem,
  } = useChants();

  // signing out leaves for the home page, so no signed-in page (profile, chats…) stays on screen with old data
  const prevUid = useRef(user?.uid);
  useEffect(() => {
    if (prevUid.current && !user) {
      navigateTo('home');
      window.scrollTo({ top: 0 });
    }
    prevUid.current = user?.uid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // a section a guest may not open, or one hidden by the admin or by the kids' mode (e.g. after a reload)
  const pageAccess = access.page(currentPage);
  if (pageAccess === 'locked') {
    return <LockedPage what={SECTIONS.find(x => x.id === sectionOfPage(currentPage))?.label || 'ეს გვერდი'} />;
  }
  if (pageAccess === 'hidden' || pageAccess === 'soon') return <HomePage logoUrl={logoUrl} />;

  if (currentPage === 'admin') {
    return isAdmin ? <AdminPanelPage /> : <HomePage logoUrl={logoUrl} />;
  }

  if (currentPage === 'class') {
    return <ClassPage />;
  }

  // the psalter group lives on its class's page (redesign stage 2); a group with no class keeps its old page
  if (currentPage === 'psalter') {
    return <PsalterOrClass />;
  }

  // private chats (signed in only)
  // the messages page: the list, and the open chat beside it ('dm'; on a phone the chat alone)
  if (currentPage === 'messages' || currentPage === 'dm') {
    return user ? <MessagesPage logoUrl={logoUrl} /> : <HomePage logoUrl={logoUrl} />;
  }

  // the old teacher panel (a remembered page, an old link): its parts live on the class page
  if (currentPage === 'teacher') {
    return isTeacher ? <ClassPage /> : <HomePage logoUrl={logoUrl} />;
  }

  // the birthdays are for admitted members (and staff) only
  if (currentPage === 'birthdays' && !(user && access.member)) return <HomePage logoUrl={logoUrl} />;

  // signed out (e.g. "back" after leaving): the profile has nothing to show
  if (currentPage === 'profile' && (access.kids || (!user && !loading))) return <HomePage logoUrl={logoUrl} />;

  if (currentPage === 'profile') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 py-3 sm:px-4 md:px-6">
        <PageBar title="პროფილი" onBack={handleGoBack} className="mb-5" />
        <div className="space-y-4">
          <ChemiSamosi />
          <ShortcutShelf variant="profile" />
          <StudentProfileCard />
          {/* install the app · leave the account (asks first) */}
          <ProfileActions />
        </div>
      </div>
    );
  }

  if (currentPage !== 'home') {
    // the one bar: „←“, the page's title, and 📌 for a page that can be a home button
    const section = sectionOfPage(currentPage);
    const pin = currentPage === 'prayer' && selectedPrayerId ? `prayer:${selectedPrayerId}`
      : currentPage === 'commemoration' ? 'special:commemoration'
      : currentPage === 'birthdays' ? 'special:birthdays'
      : section ? `section:${section}` : null;
    const book = currentPage === 'biblioteka' ? LIBRARY_BOOKS[(mapItem ?? '').split(':')[0]] : undefined;
    const title = currentPage === 'prayer' && selectedPrayerId ? prayerTitle(selectedPrayerId) : book ?? PAGE_TITLES[currentPage] ?? '';
    return (
      <div className="flex flex-col items-center px-1 py-3 sm:px-4 md:px-6">
        <PageBar title={title} onBack={handleGoBack} right={pin ? <PinButton id={pin} /> : undefined} className="w-full mb-4" />

        <div className="w-full flex-1 min-h-[300px] flex flex-col justify-between items-center mt-1">
          {currentPage === 'galoba' && <GalobaPage />}

          {currentPage === 'gz' && (
            <div className="w-full max-w-2xl mx-auto mb-2 px-1">
              {/* the page title sits in the top bar (PageBar); four round buttons on top (სამოსი, ნასწავლი —
                  with the teacher's assignments —, მანერა, სამუშაო) in the member's order, the habits under them */}
              <PathTabs
                orbs={{ labels: PATH_ORBS, render: order => <PathOrbs order={order} /> }}
                cards={[
                  {
                    id: 'habits',
                    label: 'ჩვევები',
                    node: (
                      <section className="w-full rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-3 py-3.5 sm:p-4">
                        <ChvevebiContent />
                      </section>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {currentPage === 'tsinaprebi' && <AncestorsPage />}

          {currentPage === 'prayer' && <PrayerPage />}

          {currentPage === 'commemoration' && <CommemorationPage />}

          {currentPage === 'biblioteka' && <LibraryPage />}

          {currentPage === 'abituri' && <AbituriPage />}

          {currentPage === 'offline' && <OfflinePage />}

          {currentPage === 'birthdays' && <BirthdaysPage />}

          {currentPage === 'games' && <GamesPage />}

          {currentPage === 'simghera' && (
            <div className="w-full my-2 px-1">
              <GeorgiaMap
                selectedChantVariants={selectedChantVariants}
                onToggleSong={handleToggleSong}
              />
            </div>
          )}

          {currentPage === 'mtkmeli' && (
            <div className="w-full my-2 px-1">
              <MtkmeliMap
                selectedChantVariants={selectedChantVariants}
                onTogglePoem={handleTogglePoem}
              />
            </div>
          )}

          {currentPage === 'sakravebi' && (
            <div className="w-full my-2 px-1">
              <SakravebiView selectedChantVariants={selectedChantVariants} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return <HomePage logoUrl={logoUrl} />;
};
