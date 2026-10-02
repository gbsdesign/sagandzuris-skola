import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ServiceType } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

export const SERVICES: Array<NonNullable<ServiceType>> = [
  'წირვა',
  'მწუხრი',
  'ცისკარი',
  'სადღესასწაულო',
  'მარხვანი',
  'ზატიკი',
];

interface ServiceTabsProps {
  onSelectService: (service: ServiceType) => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({ onSelectService }) => {
  return (
    <div className="w-full my-2 px-1 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-3">
        {SERVICES.map((serviceTitle) => (
          <button
            key={serviceTitle}
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onSelectService(serviceTitle);
            }}
            className="w-full relative group overflow-hidden py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-[#ba8555] via-[#a66d3d] to-[#8d5427] text-white font-bold text-lg sm:text-xl tracking-wide shadow-md shadow-[#8d5427]/20 hover:shadow-xl hover:shadow-[#8d5427]/35 active:scale-95 border border-[#ebd0ad]/55 hover:border-[#ffe2be] transition-all duration-300 cursor-pointer flex items-center justify-between select-none"
          >
            <span className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/20 pointer-events-none"></span>
            <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#fff1dc]/90 to-transparent"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-white/15 to-amber-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>

            <div className="relative z-10 flex items-center gap-3 text-[#fffefb] drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <span className="w-2 h-2 rounded-full bg-[#ffeed6] group-hover:scale-125 transition-all shadow-xs"></span>
              <span>{serviceTitle}</span>
            </div>

            <div className="relative z-10 text-[#ffe5c4] group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
