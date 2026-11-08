import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ServiceType } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

type Service = NonNullable<ServiceType>;

// The sections of the chant page, in order, each with a short gloss under its name. A section whose chants are
// not in the app yet has no `service`: it is only named in the one quiet „მალე: …“ line under the list. When a book
// fills one, give it its service (ServiceType + the chant list in chantLookup / chantSearch).
// `other` = folded under „სხვა მსახურებები“ at the list's end (the user, 2026-11-08: „ეს 4 ჩამოსაშლელად“).
const SECTIONS: Array<{ title: string; note: string; service?: Service; other?: true }> = [
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
  { title: 'პანაშვიდი', note: 'პანაშვიდისა და წესის აგების საგალობლები', service: 'პანაშვიდი', other: true },
  { title: 'ჯვრისწერა', note: 'ქორწინების საიდუმლო', service: 'ჯვრისწერა', other: true },
  { title: 'ხელდასხმა', note: 'მღვდლად კურთხევა', service: 'ხელდასხმა', other: true },
  { title: 'პარაკლისი', note: 'ღმრთისმშობლისა და იესო ტკბილისა', service: 'პარაკლისი', other: true },
  { title: 'ოხითები', note: 'ოხითები და კონდაკები' },
  { title: 'აღდგომის ოხითები', note: '8 ხმა' },
];

// The fold stays as the member left it (back from a service it is still open), kept on the device
const OPEN_KEY = 'sg-galoba-other-open';
const readOpen = () => { try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; } };
const keepOpen = (open: boolean) => { try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* private mode */ } };

const CARD = 'w-full group flex items-center gap-3 py-3 pl-5 pr-3 max-[399px]:gap-2 max-[399px]:pl-4 max-[399px]:pr-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:bg-white hover:ring-[#7a2028]/30 hover:shadow-[0_6px_18px_-8px_rgba(122,32,40,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]';
// Big but light (the user, 2026-11-08: the heavy serif „looked ugly“): the header chips' sans, semibold, 22 px; „სადღესასწაულო“
// must stay whole on a 360 px phone
const TITLE = 'flex-1 min-w-0 galoba-font font-semibold text-[22px] sm:text-[24px] max-[350px]:text-[20px] leading-snug tracking-[0.01em] text-[#7a2028] break-words';
const ROUND = 'shrink-0 w-8 h-8 max-[399px]:w-7 max-[399px]:h-7 rounded-full flex items-center justify-center transition-colors';

interface ServiceTabsProps {
  onSelectService: (service: ServiceType) => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({ onSelectService }) => {
  const [open, setOpen] = useState(readOpen);
  const soon = SECTIONS.filter(s => !s.service).map(s => s.title);
  const main = SECTIONS.filter(s => s.service && !s.other);
  const other = SECTIONS.filter(s => s.service && s.other);

  const row = ({ title, service }: (typeof SECTIONS)[number]) => (
    <button
      key={title}
      type="button"
      onClick={() => {
        triggerHaptic(15);
        onSelectService(service!);
      }}
      className={CARD}
    >
      <span className={TITLE}>{title}</span>
      <span className={`${ROUND} text-[#7a2028] bg-[#7a2028]/5 group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec]`} aria-hidden>
        <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );

  const toggle = () => {
    triggerHaptic(10);
    setOpen(o => { keepOpen(!o); return !o; });
  };

  return (
    <div className="w-full my-2 px-1 flex flex-col items-center">
      {/* as wide as the „მიმდინარე მსახურება“ card above (max-w-2xl) */}
      <div className="w-full max-w-2xl flex flex-col gap-2">
        {main.map(s => row(s))}

        {other.length > 0 && (
          <div>
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-controls="galoba-other-services"
              className={`${CARD} ${open ? 'bg-white ring-[#7a2028]/25' : ''}`}
            >
              <span className={TITLE}>სხვა მსახურებები</span>
              <span className={`${ROUND} ${open ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#7a2028] bg-[#7a2028]/5 group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec]'}`} aria-hidden>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
              </span>
            </button>
            {/* opens smoothly (grid rows 0fr → 1fr); the four hang under it on a thin line, so they read as its part */}
            <div
              id="galoba-other-services"
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              inert={!open}
            >
              <div className="overflow-hidden -mr-1 pr-1">
                <div className="ml-4 pl-3 max-[399px]:ml-3 max-[399px]:pl-2.5 pt-2 pb-1 border-l-2 border-[#e8dcc8] flex flex-col gap-2">
                  {other.map(s => row(s))}
                </div>
              </div>
            </div>
          </div>
        )}

        {soon.length > 0 && (
          <p className="mx-1 -mt-0.5 text-[13px] leading-snug text-[#8a7a6a]"><span className="font-semibold">მალე:</span> {soon.join(' · ')}</p>
        )}
      </div>
    </div>
  );
};
