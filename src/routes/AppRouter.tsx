import React from 'react';
import { useNavigation, useChants, useModal } from '../context';
import { Sparkles, Music } from 'lucide-react';
import { SubPageHeader } from '../components/layout';
import { HomePage } from '../pages/HomePage';
import { GalobaPage } from '../pages/GalobaPage';
import { ChantDetailPage } from '../pages/ChantDetailPage';
import { StudentProfileCard } from '../components/views';
import { GzaView } from '../components/views';
import { GeorgiaMap, MtkmeliMap } from '../components/maps';
import { SakravebiView } from '../components/views';
import { AdminPanelPage } from '../pages/AdminPanelPage';
import { ClassPage } from '../pages/ClassPage';

interface AppRouterProps {
  logoUrl: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ logoUrl }) => {
  const { currentPage, selectedService, handleGoBack, navigateTo } = useNavigation();
  const { openModal } = useModal();
  const {
    selectedChantVariants,
    handleToggleSong,
    handleTogglePoem,
    handleToggleInstrument,
    setSelectedChantVariants,
  } = useChants();

  if (currentPage === 'admin') {
    return <AdminPanelPage />;
  }

  if (currentPage === 'class') {
    return <ClassPage />;
  }

  if (currentPage === 'profile') {
    return (
      <div className="px-1 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/90 hover:border-amber-400/50 bg-slate-50/80 hover:bg-amber-50/50 active:scale-95 text-slate-700 hover:text-[#85502c] transition-all text-xs font-semibold cursor-pointer group shadow-2xs"
          >
            <span>← უკან დაბრუნება</span>
          </button>
        </div>
        <StudentProfileCard />
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
            <div className="w-full max-w-2xl mx-auto my-2 px-1 space-y-5">
              <h1 className="font-serif-ge text-2xl sm:text-3xl font-bold text-[#7a2028] text-center">საგანძურის გზა</h1>
              {/* skills and manner (they used to sit in the path's popup) */}
              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { modal: 'chvevebi', label: 'ჩვევები', Icon: Sparkles },
                  { modal: 'manera', label: 'მანერა', Icon: Music },
                ] as const).map(({ modal, label, Icon }) => (
                  <button
                    key={modal}
                    type="button"
                    onClick={() => openModal(modal)}
                    className="inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e6d9c2] hover:bg-white hover:ring-[#7a2028]/30 text-[15px] font-bold text-[#4a3426] hover:text-[#7a2028] transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Icon className="w-4 h-4 text-[#7a2028]" />
                    {label}
                  </button>
                ))}
              </div>
              <GzaView
                onGoToGaloba={() => navigateTo('galoba')}
                selectedChantVariants={selectedChantVariants}
                onUpdateVariants={(next) => setSelectedChantVariants(next)}
              />
            </div>
          )}

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
              <SakravebiView
                selectedChantVariants={selectedChantVariants}
                onToggleInstrument={handleToggleInstrument}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return <HomePage logoUrl={logoUrl} />;
};
