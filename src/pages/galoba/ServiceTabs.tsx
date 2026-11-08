import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ServiceType } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

type Service = NonNullable<ServiceType>;

// The sections of the chant page, in order, each with a short gloss under its name. A section whose chants are
// not in the app yet has no `service`: it is only named in the one quiet „მალე: …“ line under the list. When a book
// fills one, give it its service (ServiceType + the chant list in chantLookup / chantSearch).
const SECTIONS: Array<{ title: string; note: string; service?: Service }> = [
  { title: 'წირვა', note: 'საღმრთო ლიტურგია', service: 'წირვა' },
  { title: 'მწუხრი', note: 'საღამოს ლოცვა', service: 'მწუხრი' },
  { title: 'ცისკარი', note: 'დილის ლოცვა', service: 'ცისკარი' },
  { title: 'სადღესასწაულო', note: 'დღესასწაულთა საგალობლები', service: 'სადღესასწაულო' },
  { title: 'მარხვანი', note: 'დიდმარხვის საგალობლები', service: 'მარხვანი' },
  { title: 'ზატიკი', note: 'აღდგომის საგალობლები', service: 'ზატიკი' },
  { title: 'მომიხსენენი', note: 'ნეტარებათა ტროპარები, 8 ხმა', service: 'მომიხსენენი' },
  { title: 'ძლისპირები', note: 'აღდგომის ძლისპირები, 8 ხმა', service: 'ძლისპირები' },
  { title: 'კატავასიები', note: 'წლიური ციკლისა · აღდგომის კონდაკები, 8 ხმა', service: 'კატაბასიები' },
  { title: 'დასადებლები', note: '„უფალო, ღაღადვყავ“, ხმა ა–დ', service: 'დასადებლები' },
  { title: 'ტროპარები', note: 'საზოგადო ტროპარები და ზიარნი' },
  { title: 'პანაშვიდი', note: 'პანაშვიდისა და წესის აგების საგალობლები', service: 'პანაშვიდი' },
  { title: 'ჯვრისწერა', note: 'ქორწინების საიდუმლო', service: 'ჯვრისწერა' },
  { title: 'ხელდასხმა', note: 'მღვდლად კურთხევა', service: 'ხელდასხმა' },
  { title: 'პარაკლისი', note: 'ღმრთისმშობლისა და იესო ტკბილისა', service: 'პარაკლისი' },
  { title: 'ოხითები', note: 'ოხითები და კონდაკები' },
  { title: 'აღდგომის ოხითები', note: '8 ხმა' },
];

interface ServiceTabsProps {
  onSelectService: (service: ServiceType) => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({ onSelectService }) => {
  const soon = SECTIONS.filter(s => !s.service).map(s => s.title);
  return (
    <div className="w-full my-2 px-1 flex flex-col items-center">
      {/* as wide as the „მიმდინარე მსახურება“ card above (max-w-2xl) */}
      <div className="w-full max-w-2xl flex flex-col gap-2">
        {SECTIONS.map(({ title, service }) => service && (
          <button
            key={title}
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onSelectService(service);
            }}
            className="w-full group flex items-center gap-3 py-3 pl-5 pr-3 max-[399px]:gap-2 max-[399px]:pl-4 max-[399px]:pr-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:bg-white hover:ring-[#7a2028]/30 hover:shadow-[0_6px_18px_-8px_rgba(122,32,40,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]"
          >
            {/* Big but light (the user, 2026-11-08: the heavy serif „looked ugly“): the header chips' sans, semibold, 22 px; „სადღესასწაულო“
                must stay whole on a 360 px phone */}
            <span className="flex-1 min-w-0 galoba-font font-semibold text-[22px] sm:text-[24px] max-[350px]:text-[20px] leading-snug tracking-[0.01em] text-[#7a2028] break-words">{title}</span>
            <span className="shrink-0 w-8 h-8 max-[399px]:w-7 max-[399px]:h-7 rounded-full flex items-center justify-center text-[#7a2028] bg-[#7a2028]/5 group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec] transition-colors" aria-hidden>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ))}

        {soon.length > 0 && (
          <p className="mx-1 -mt-0.5 text-[13px] leading-snug text-[#8a7a6a]"><span className="font-semibold">მალე:</span> {soon.join(' · ')}</p>
        )}
      </div>
    </div>
  );
};
