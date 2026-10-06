import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronUp } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';
import { CALENDAR_EVENT, todayIso } from '../../data/churchCalendar';
import { ChurchCalendarPanel } from '../calendar/ChurchCalendarPanel';
import { useMembership } from '../../utils/memberAccess';

interface FooterProps {
  logoUrl: string;
}

const UNFOLD_MS = 480;
const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pageBottom = () => document.documentElement.scrollHeight - window.innerHeight;

export const Footer: React.FC<FooterProps> = ({ logoUrl }) => {
  // the church calendar unfolds upward out of the bar; it stays mounted after the first opening
  const [calOpen, setCalOpen] = useState(false);
  const [calMounted, setCalMounted] = useState(false);
  const [calIso, setCalIso] = useState(todayIso);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  openRef.current = calOpen;
  // the calendar is for members a superadmin gave it to (utils/memberAccess); for others it does not show
  const canCal = useMembership().can('calendar');
  const canRef = useRef(canCal);
  canRef.current = canCal;
  useEffect(() => { if (!canCal) setCalOpen(false); }, [canCal]);

  // keep the page pinned to its end while the panel grows, so it rises from the bar;
  // then bring the panel's top (the date band) into view
  const unfold = () => {
    setCalMounted(true);
    setCalOpen(true);
    const t0 = performance.now();
    const ms = reducedMotion() ? 0 : UNFOLD_MS;
    const step = (now: number) => {
      window.scrollTo({ top: pageBottom() });
      if (now - t0 < ms) requestAnimationFrame(step);
      else if ((panelRef.current?.getBoundingClientRect().top ?? 0) < 0) {
        panelRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
    };
    requestAnimationFrame(step);
  };

  const toggle = () => {
    triggerHaptic(10);
    if (calOpen) setCalOpen(false);
    else unfold();
  };

  // "სრულად" on today's-saints card, a feast in the library: go down to the bar, then unfold there
  useEffect(() => {
    const onOpen = (e: Event) => {
      if (!canRef.current) return;
      const iso = (e as CustomEvent<string>).detail || todayIso();
      setCalIso(iso);
      if (openRef.current) {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (pageBottom() - window.scrollY < 40 || reducedMotion()) {
        unfold();
        return;
      }
      let done = false;
      const go = () => { if (!done) { done = true; window.removeEventListener('scrollend', go); unfold(); } };
      window.addEventListener('scrollend', go);
      window.setTimeout(go, 900);
      window.scrollTo({ top: pageBottom(), behavior: 'smooth' });
    };
    window.addEventListener(CALENDAR_EVENT, onOpen);
    return () => window.removeEventListener(CALENDAR_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <footer className="safe-bleed safe-bottom border-t border-[#e8dcc8] bg-[#fbf6ec]">
      {canCal && <div
        className={`grid ease-out ${calOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{ transition: `grid-template-rows ${UNFOLD_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` }}
      >
        <div ref={panelRef} className="min-h-0 overflow-hidden scroll-mt-2" inert={!calOpen}>
          {calMounted && (
            <div className={`border-b border-[#e8dcc8] transition-opacity duration-300 ${calOpen ? 'opacity-100' : 'opacity-0'}`}>
              <ChurchCalendarPanel iso={calIso} onChange={setCalIso} onClose={toggle} />
            </div>
          )}
        </div>
      </div>}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8a7a6a]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="აქ საგანძურია"
              className="w-8 h-8 rounded-lg object-contain bg-white ring-1 ring-[#e8dcc8] p-0.5"
              referrerPolicy="no-referrer"
            />
            <span className="font-serif-ge font-bold text-[#4a3426] text-[15px]">აქ საგანძურია</span>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
          {/* church calendar: unfolds upward out of the bar (full width on phones) */}
          {canCal && <button
            type="button"
            onClick={toggle}
            aria-expanded={calOpen}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 sm:h-10 px-4 rounded-full ring-1 transition-all duration-200 text-sm font-bold cursor-pointer active:scale-95 select-none ${
              calOpen
                ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec] shadow-[0_6px_16px_-8px_rgba(122,32,40,0.7)]'
                : 'bg-white/70 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426]'
            }`}
            title="საეკლესიო კალენდარი"
          >
            <CalendarDays className={`w-[18px] h-[18px] ${calOpen ? 'text-[#fbf6ec]' : 'text-[#7a2028]'}`} />
            კალენდარი
            <ChevronUp className={`w-4 h-4 transition-transform duration-300 ${calOpen ? 'rotate-180' : ''}`} />
          </button>}

          {/* Facebook Button */}
          <a
            href="https://www.facebook.com/passangermgzavrebi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/70 hover:bg-white ring-1 ring-[#e8dcc8] hover:ring-[#1877F2]/40 transition-colors duration-200 text-sm group"
            title="Facebook გვერდი"
          >
            <svg
              className="w-[18px] h-[18px] fill-[#7a2028] group-hover:fill-[#1877F2] transition-colors duration-200"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="font-semibold text-[#4a3426]">Facebook</span>
          </a>

          {/* WhatsApp Button */}
          <a
            href="https://wa.me/995591944792"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/70 hover:bg-white ring-1 ring-[#e8dcc8] hover:ring-[#25D366]/50 transition-colors duration-200 text-sm group"
            title="WhatsApp კონტაქტი"
          >
            <svg
              className="w-[18px] h-[18px] fill-[#7a2028] group-hover:fill-[#25D366] transition-colors duration-200"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.886-9.888 9.886m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
            </svg>
            <span className="font-semibold text-[#4a3426]">WhatsApp</span>
          </a>

          <span aria-hidden className="hidden md:inline-block w-px h-4 bg-[#e8dcc8]" />
          <span>© {new Date().getFullYear()} ყველა უფლება დაცულია.</span>
        </div>
      </div>
    </footer>
  );
};
