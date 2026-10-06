import React, { lazy } from 'react';
import { useNavigation, useChants, useModal, useAuth } from '../context';
import { Sparkles, Music, ShieldCheck, ChevronRight } from 'lucide-react';
import { SubPageHeader } from '../components/layout';
import { HomePage } from '../pages/HomePage';
import { GalobaPage } from '../pages/GalobaPage';
import { StudentProfileCard } from '../components/views';
import { GzaView } from '../components/views';
import { PathPanel, PATH_ICON, PATH_TILE } from '../components/views/IndependentWorkCard';
import { ChvevebiContent } from '../components/views/ChvevebiPanel';
import { ManeraContent, ManeraAverageBadge, ManeraQuickRings } from '../components/views/ManeraPanel';
import { PathSummary } from '../components/views/PathSummary';
import { ReorderStack } from '../components/views/ReorderStack';
import { ChemiSamosi } from '../components/views/ChemiSamosi';
import { MyClassWork } from '../components/teacher/MyClassWork';
import { ShortcutShelf } from '../components/home/ShortcutShelf';
import { useAccess } from '../hooks/useAccess';
import { LockedPage } from '../components/access/SignInPrompt';
import { SECTIONS, sectionOfPage } from '../data/sections';

// Pages load when first opened, so the first visit downloads less (App wraps the router in Suspense).
const page = <T extends string>(load: () => Promise<Record<T, React.ComponentType<any>>>, name: T) =>
  lazy(() => load().then(m => ({ default: m[name] })));
const ChantDetailPage = page(() => import('../pages/ChantDetailPage'), 'ChantDetailPage');
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
const TeacherPage = page(() => import('../pages/TeacherPage'), 'TeacherPage');

interface AppRouterProps {
  logoUrl: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ logoUrl }) => {
  const { currentPage, selectedService, handleGoBack, navigateTo } = useNavigation();
  const { openModal } = useModal();
  const { isAdmin, isTeacher } = useAuth();
  const access = useAccess();
  const {
    selectedChantVariants,
    handleToggleSong,
    handleTogglePoem,
    setSelectedChantVariants,
  } = useChants();

  // a section a guest may not open, or one hidden by the admin or by the kids' mode (e.g. after a reload)
  const pageAccess = access.page(currentPage);
  if (pageAccess === 'locked') {
    return <LockedPage what={SECTIONS.find(x => x.id === sectionOfPage(currentPage))?.label || 'ეს გვერდი'} />;
  }
  if (pageAccess === 'hidden' || pageAccess === 'soon') return <HomePage logoUrl={logoUrl} />;

  if (currentPage === 'admin') {
    return isAdmin ? <AdminPanelPage logoUrl={logoUrl} /> : <HomePage logoUrl={logoUrl} />;
  }

  if (currentPage === 'class') {
    return <ClassPage />;
  }

  if (currentPage === 'psalter') {
    return <PsalterPage />;
  }

  if (currentPage === 'teacher') {
    return isTeacher ? <TeacherPage /> : <HomePage logoUrl={logoUrl} />;
  }

  if (currentPage === 'profile' && access.kids) return <HomePage logoUrl={logoUrl} />;

  if (currentPage === 'profile') {
    return (
      <div className="w-full max-w-2xl mx-auto px-1 py-3 sm:px-4 md:px-6">
        <div className="relative flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
          <h1 className="absolute inset-x-0 top-0 bottom-3.5 flex items-center justify-center pointer-events-none font-serif-ge text-xl sm:text-3xl font-bold text-[#7a2028]">
            პროფილი
          </h1>
          <button
            type="button"
            onClick={handleGoBack}
            className="relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/90 hover:border-amber-400/50 bg-slate-50/80 hover:bg-amber-50/50 active:scale-95 text-slate-700 hover:text-[#85502c] transition-all text-xs font-semibold cursor-pointer group shadow-2xs"
          >
            <span>← უკან</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="relative inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-[#4a3426] text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="ადმინის პანელი"
            >
              <ShieldCheck className="w-4 h-4 text-[#7a2028]" />
              ადმინი
            </button>
          )}
        </div>
        <div className="space-y-4">
          <ChemiSamosi />
          <ShortcutShelf variant="profile" />
          <StudentProfileCard />
        </div>
      </div>
    );
  }

  if (currentPage !== 'home') {
    return (
      <div className="flex flex-col items-center px-1 py-3 sm:px-4 md:px-6">
        <SubPageHeader
          currentPage={currentPage}
          selectedService={selectedService}
          onGoBack={handleGoBack}
        />

        <div className="w-full flex-1 min-h-[300px] flex flex-col justify-between items-center mt-1">
          {currentPage === 'galoba' && <GalobaPage />}
          
          {/* Add route handler for detail page if possible, 
              but since AppRouter is tied to currentPage state, 
              this might require a new page type or similar.
              Given the constraints, let's just handle it here. */}

          {currentPage === 'galoba-detail' && <ChantDetailPage />}

          {currentPage === 'gz' && (
            <div className="w-full max-w-2xl mx-auto mb-2 px-1 space-y-7">
              {/* the page title sits in the top bar (SubPageHeader) */}
              {/* the teacher's assignments and the lesson timetable, when there are any */}
              <MyClassWork />
              {/* the student can put these cards in their own order; my outfit comes first by default, manner last */}
              <ReorderStack
                storageKey="pathCardsOrder"
                items={[
                  { id: 'samosi', label: 'ჩემი სამოსი', node: <ChemiSamosi /> },
                  { id: 'summary', label: 'შენი გზა', node: <PathSummary /> },
                  {
                    id: 'habits', label: 'ჩვევები', node: (
                      <PathPanel id="habits" title="ჩვევები" subtitle="ლოცვითი ჩვევები სულიერი ნიადაგისთვის" icon={<Sparkles className="w-5 h-5" />}>
                        <ChvevebiContent />
                      </PathPanel>
                    ),
                  },
                  {
                    id: 'manera', label: 'მანერა', node: (
                      <PathPanel id="manera" title="მანერა" subtitle="საშემსრულებლო რჩევები" badge={<ManeraAverageBadge />} extra={<ManeraQuickRings />} icon={<Music className="w-5 h-5" />}>
                        <ManeraContent />
                      </PathPanel>
                    ),
                  },
                ]}
              />
              <GzaView
                onGoToGaloba={() => navigateTo('galoba')}
                selectedChantVariants={selectedChantVariants}
                onUpdateVariants={(next) => setSelectedChantVariants(next)}
              />
            </div>
          )}

          {currentPage === 'tsinaprebi' && <AncestorsPage />}

          {currentPage === 'prayer' && <PrayerPage />}

          {currentPage === 'commemoration' && <CommemorationPage />}

          {currentPage === 'biblioteka' && <LibraryPage />}

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
