import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageType, ServiceType } from '../../context';

interface SubPageHeaderProps {
  logoUrl: string;
  currentPage: PageType;
  selectedService: ServiceType;
  onGoBack: () => void;
  onGoHome: () => void;
}

export const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  logoUrl,
  currentPage,
  selectedService,
  onGoBack,
  onGoHome,
}) => {
  const title =
    currentPage === 'galoba'
      ? 'გალობის საგანძური'
      : currentPage === 'simghera'
      ? 'სიმღერის საგანძური'
      : currentPage === 'mtkmeli'
      ? 'მთქმელის საგანძური'
      : currentPage === 'gz'
      ? 'საგანძურის გზა'
      : 'საკრავების საგანძური';

  return (
    <>
      {/* Compact Top Navigation Bar */}
      <div className="w-full flex items-center justify-between pb-3.5 mb-5 border-b border-slate-100">
        <button
          type="button"
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200/90 hover:border-amber-400/50 bg-slate-50/80 hover:bg-amber-50/50 active:scale-95 text-slate-700 hover:text-[#85502c] transition-all text-xs font-semibold cursor-pointer group shadow-2xs"
          title="უკან დაბრუნება"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>უკან</span>
        </button>

        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img
            src={logoUrl}
            alt="საგანძურის სკოლა"
            className="w-6 h-6 rounded-md object-contain bg-slate-50 border border-slate-200/60 p-0.5"
          />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            საგანძურის სკოლა
          </span>
        </button>
      </div>

      {/* Modern Arched Curved Rich Deep Navy Blue Title Header - Removed to avoid showing title as requested */}
      <div className="w-full max-w-xl pt-1 pb-1 flex flex-col items-center justify-center">
      </div>

    </>
  );
};
