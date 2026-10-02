import React from 'react';
import { useNavigation, useChants } from '../context';
import { SubPageHeader } from '../components/layout';
import { HomePage } from '../pages/HomePage';
import { GalobaPage } from '../pages/GalobaPage';
import { ChantDetailPage } from '../pages/ChantDetailPage';
import { StudentProfileCard } from '../components/views';
import { GzaView } from '../components/views';
import { GeorgiaMap, MtkmeliMap } from '../components/maps';
import { SakravebiView } from '../components/views';
import { AdminPanelPage } from '../pages/AdminPanelPage';

interface AppRouterProps {
  logoUrl: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ logoUrl }) => {
  const { currentPage, selectedService, handleGoBack, navigateTo } = useNavigation();
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

  if (currentPage === 'profile') {
    return (
      <div className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm">
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
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-7 md:p-8 shadow-sm flex flex-col items-center">
        <SubPageHeader
          logoUrl={logoUrl}
          currentPage={currentPage}
          selectedService={selectedService}
          onGoBack={handleGoBack}
          onGoHome={() => navigateTo('home')}
        />

        <div className="w-full flex-1 min-h-[300px] flex flex-col justify-between items-center mt-1">
          {currentPage === 'galoba' && <GalobaPage />}
          
          {/* Add route handler for detail page if possible, 
              but since AppRouter is tied to currentPage state, 
              this might require a new page type or similar.
              Given the constraints, let's just handle it here. */}

          {currentPage === 'galoba-detail' && <ChantDetailPage />}

          {currentPage === 'gz' && (
            <div className="w-full my-2 px-1">
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
