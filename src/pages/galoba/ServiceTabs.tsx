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

// a short gloss under each service name
const NOTES: Record<NonNullable<ServiceType>, string> = {
  'წირვა': 'საღმრთო ლიტურგია',
  'მწუხრი': 'საღამოს ლოცვა',
  'ცისკარი': 'დილის ლოცვა',
  'სადღესასწაულო': 'დღესასწაულთა საგალობლები',
  'მარხვანი': 'დიდმარხვის საგალობლები',
  'ზატიკი': 'აღდგომის საგალობლები',
};

// sections whose chants are not in the app yet: shown under the services, marked "მალე", not clickable.
// When a book fills one, it moves into SERVICES above.
const COMING: Array<{ title: string; note: string }> = [
  { title: 'ტროპარები', note: 'საზოგადო ტროპარები და ზიარნი' },
  { title: 'პანაშვიდი', note: 'პანაშვიდისა და წესის აგების საგალობლები' },
  { title: 'მომიხსენენი', note: '„სასუფეველსა შენსა მომიხსენენ“' },
  { title: 'ძლისპირები', note: 'აღდგომის ძლისპირები, 8 ხმა' },
  { title: 'კატაბასიები', note: 'წლიური ციკლისა · აღდგომის კონდაკები, 8 ხმა' },
  { title: 'ოხითები', note: 'ოხითები და კონდაკები' },
  { title: 'აღდგომის ოხითები', note: '8 ხმა' },
  { title: 'დასადებლები', note: '„უფალო, ღაღადვყავ“, ხმა ა–დ' },
];

interface ServiceTabsProps {
  onSelectService: (service: ServiceType) => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({ onSelectService }) => {
  return (
    <div className="w-full my-2 px-1 flex flex-col items-center">
      {/* as wide as the "დღევანდელი წირვა" card above (max-w-2xl) */}
      <div className="w-full max-w-2xl flex flex-col gap-2.5">
        {SERVICES.map((serviceTitle) => (
          <button
            key={serviceTitle}
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onSelectService(serviceTitle);
            }}
            className="w-full group flex items-center gap-3 py-3 pl-5 pr-3.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e6d9c2] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:bg-white hover:ring-[#7a2028]/30 hover:shadow-[0_6px_18px_-8px_rgba(122,32,40,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]"
          >
            <span className="flex-1 min-w-0">
              <span className="block font-serif-ge font-bold text-lg sm:text-xl leading-tight text-[#7a2028]">{serviceTitle}</span>
              <span className="block mt-0.5 text-[13px] text-[#8a7a6a] leading-snug">{NOTES[serviceTitle]}</span>
            </span>
            <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#7a2028] bg-[#7a2028]/5 group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec] transition-colors" aria-hidden>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}
        {COMING.map(({ title, note }) => (
          <div
            key={title}
            aria-disabled="true"
            className="w-full flex items-center gap-3 py-3 pl-5 pr-3.5 rounded-2xl bg-[#fbf6ec]/70 ring-1 ring-[#e6d9c2] select-none cursor-default"
          >
            <span className="flex-1 min-w-0">
              <span className="block font-serif-ge font-bold text-lg sm:text-xl leading-tight text-[#7a2028]/60">{title}</span>
              <span className="block mt-0.5 text-[13px] text-[#8a7a6a]/80 leading-snug">{note}</span>
            </span>
            <span className="shrink-0 px-2.5 py-1 rounded-full text-[12px] font-semibold leading-none text-[#8a7a6a] bg-[#e6d9c2]/60">მალე</span>
          </div>
        ))}
      </div>
    </div>
  );
};
