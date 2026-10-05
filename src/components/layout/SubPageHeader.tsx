import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageType, ServiceType } from '../../context';

interface SubPageHeaderProps {
  currentPage: PageType;
  selectedService: ServiceType;
  onGoBack: () => void;
}

export const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  currentPage,
  selectedService,
  onGoBack,
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
      : currentPage === 'tsinaprebi'
      ? 'გაიცანი წინაპრები'
      : 'საკრავების საგანძური';

  return (
    <>
      {/* Compact Top Navigation Bar */}
      <div className="relative w-full flex items-center justify-between pb-3.5 mb-5 border-b border-[#e8dcc8]/70">
        {/* the path page shows its title here, centred in the top bar */}
        {(currentPage === 'gz' || currentPage === 'tsinaprebi') && (
          <h1 className="absolute inset-x-0 top-0 bottom-3.5 flex items-center justify-center pointer-events-none font-serif-ge text-xl sm:text-3xl font-bold text-[#7a2028]">
            {title}
          </h1>
        )}
        <button
          type="button"
          onClick={onGoBack}
          className="relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white hover:ring-[#7a2028]/30 active:scale-95 text-[#4a3426] hover:text-[#7a2028] transition-all text-xs font-bold cursor-pointer group"
          title="უკან დაბრუნება"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>უკან</span>
        </button>
      </div>

      {/* Modern Arched Curved Rich Deep Navy Blue Title Header - Removed to avoid showing title as requested */}
      <div className="w-full max-w-xl pt-1 pb-1 flex flex-col items-center justify-center">
      </div>

    </>
  );
};
