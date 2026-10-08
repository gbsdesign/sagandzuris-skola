import React from 'react';
import { ChevronRight, Headphones } from 'lucide-react';
import { ServiceType } from '../../context';
import { ALBUM_RECS, CHANT_ALBUMS, ChantAlbumId } from '../../data/chantAlbums';
import { usePlacements } from '../../data/placements';
import { triggerHaptic } from '../../utils/haptics';

type Service = NonNullable<ServiceType>;

// The sections of the chant page, in order, each with a short gloss under its name. A section whose chants are
// not in the app yet has no `service`: it is shown marked "მალე" and does not open. When a book fills one, give it
// its service (ServiceType + the chant list in chantLookup / chantSearch).
const SECTIONS: Array<{ title: string; note: string; service?: Service }> = [
  { title: 'წირვა', note: 'საღმრთო ლიტურგია', service: 'წირვა' },
  { title: 'მწუხრი', note: 'საღამოს ლოცვა', service: 'მწუხრი' },
  { title: 'ცისკარი', note: 'დილის ლოცვა', service: 'ცისკარი' },
  { title: 'სადღესასწაულო', note: 'დღესასწაულთა საგალობლები', service: 'სადღესასწაულო' },
  { title: 'მარხვანი', note: 'დიდმარხვის საგალობლები', service: 'მარხვანი' },
  { title: 'ზატიკი', note: 'აღდგომის საგალობლები', service: 'ზატიკი' },
  { title: 'ტროპარები', note: 'საზოგადო ტროპარები და ზიარნი' },
  { title: 'პანაშვიდი', note: 'პანაშვიდისა და წესის აგების საგალობლები' },
  { title: 'მომიხსენენი', note: 'ნეტარებათა ტროპარები, 8 ხმა', service: 'მომიხსენენი' },
  { title: 'ძლისპირები', note: 'აღდგომის ძლისპირები, 8 ხმა', service: 'ძლისპირები' },
  { title: 'კატაბასიები', note: 'წლიური ციკლისა · აღდგომის კონდაკები, 8 ხმა', service: 'კატაბასიები' },
  { title: 'ოხითები', note: 'ოხითები და კონდაკები' },
  { title: 'აღდგომის ოხითები', note: '8 ხმა' },
  { title: 'დასადებლები', note: '„უფალო, ღაღადვყავ“, ხმა ა–დ', service: 'დასადებლები' },
];

interface ServiceTabsProps {
  onSelectService: (service: ServiceType) => void;
  /** recordings without notes (choirs, schools, „დასაზუსტებელი“); left out for those who may not hear recordings */
  onOpenAlbum?: (id: ChantAlbumId) => void;
}

export const ServiceTabs: React.FC<ServiceTabsProps> = ({ onSelectService, onOpenAlbum }) => {
  usePlacements(); // the album counts follow a moved recording
  return (
    <div className="w-full my-2 px-1 flex flex-col items-center">
      {/* as wide as the "დღევანდელი წირვა" card above (max-w-2xl) */}
      <div className="w-full max-w-2xl flex flex-col gap-2.5">
        {SECTIONS.map(({ title, note, service }) => service ? (
          <button
            key={title}
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onSelectService(service);
            }}
            className="w-full group flex items-center gap-3 py-3 pl-5 pr-3.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e6d9c2] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:bg-white hover:ring-[#7a2028]/30 hover:shadow-[0_6px_18px_-8px_rgba(122,32,40,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]"
          >
            <span className="flex-1 min-w-0">
              <span className="block font-serif-ge font-bold text-lg sm:text-xl leading-tight text-[#7a2028]">{title}</span>
              <span className="block mt-0.5 text-[13px] text-[#8a7a6a] leading-snug">{note}</span>
            </span>
            <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#7a2028] bg-[#7a2028]/5 group-hover:bg-[#7a2028] group-hover:text-[#fbf6ec] transition-colors" aria-hidden>
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        ) : (
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

        {onOpenAlbum && (
          <>
            <div className="mt-5 mb-0.5 mx-1 flex items-center gap-2.5" role="heading" aria-level={2}>
              <Headphones className="w-[18px] h-[18px] text-[#b4620e]" aria-hidden />
              <span className="font-serif-ge font-bold text-[19px] leading-tight text-[#7a2028]">ჩანაწერები</span>
              <span className="h-px flex-1 bg-gradient-to-r from-[#e6d9c2] to-transparent" aria-hidden />
            </div>
            {CHANT_ALBUMS.map(({ id, title, note }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onOpenAlbum(id);
                }}
                className="w-full group flex items-center gap-3 py-3 pl-5 pr-3.5 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-[0_1px_3px_rgba(74,52,38,0.08)] hover:ring-[#b4620e]/40 hover:shadow-[0_6px_18px_-8px_rgba(180,98,14,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7a2028]"
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-serif-ge font-bold text-[17px] sm:text-lg leading-tight text-[#2a2017]">{title}</span>
                  <span className="block mt-0.5 text-[13px] text-[#8a7a6a] leading-snug">
                    {ALBUM_RECS[id].length} ჩანაწერი · {note}
                  </span>
                </span>
                <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#b4620e] bg-[#b4620e]/[0.08] group-hover:bg-[#b4620e] group-hover:text-white transition-colors" aria-hidden>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
