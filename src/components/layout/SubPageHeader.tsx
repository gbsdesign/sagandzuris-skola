import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PageType, ServiceType } from '../../context';
import { sectionOfPage } from '../../data/sections';
import { PinButton } from '../home/ShortcutShelf';

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
      : currentPage === 'biblioteka'
      ? 'ბიბლიოთეკა'
      : 'საკრავების საგანძური';

  // once the bar has scrolled away, a round "←" floats: bottom left on a phone / tablet (thumb reach),
  // in the empty margin left of the page column on a computer (it covers nothing there)
  const barRef = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  const [down, setDown] = useState(false);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // on a phone it steps aside while scrolling down (reading) and comes back on the way up
  useEffect(() => {
    let last = window.scrollY, raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        if (Math.abs(y - last) < 8) return;
        setDown(y > last);
        last = y;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const phoneShow = away && !down;

  return (
    <>
      {/* Compact Top Navigation Bar */}
      {/* three columns: "back" · the title centred · an empty column as wide as the first, so on a narrow
          phone the title moves aside (and wraps) instead of running under the button */}
      <div ref={barRef} className="relative w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-3.5 mb-5 border-b border-[#e8dcc8]/70">
        {/* the path page shows its title here, centred in the top bar */}
        {(currentPage === 'gz' || currentPage === 'tsinaprebi' || currentPage === 'biblioteka') && (
          <h1 className="col-start-2 row-start-1 text-center text-balance leading-tight pointer-events-none font-serif-ge text-xl sm:text-3xl font-bold text-[#7a2028]">
            {title}
          </h1>
        )}
        <button
          type="button"
          onClick={onGoBack}
          className="col-start-1 row-start-1 justify-self-start relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white hover:ring-[#7a2028]/30 active:scale-95 text-[#4a3426] hover:text-[#7a2028] transition-all text-xs font-bold cursor-pointer group shrink-0 whitespace-nowrap"
          title="უკან დაბრუნება"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>უკან</span>
        </button>
        {/* "📌" puts this section on the home page */}
        {sectionOfPage(currentPage) && <PinButton id={`section:${sectionOfPage(currentPage)}`} className="col-start-3 row-start-1 justify-self-end" />}
      </div>

      {/* the floating "←" (the page column is max-w-4xl = 896px wide and centred: its left margin starts at 50% − 448px) */}
      <button
        type="button"
        onClick={onGoBack}
        tabIndex={away ? 0 : -1}
        aria-hidden={!away}
        aria-label="უკან დაბრუნება"
        title="უკან დაბრუნება"
        className={`fixed z-40 left-[calc(env(safe-area-inset-left,0px)+16px)] bottom-[calc(env(safe-area-inset-bottom,0px)+18px)] lg:bottom-auto lg:top-4 lg:left-[max(12px,calc(50%-488px))] w-12 h-12 lg:w-10 lg:h-10 rounded-full grid place-items-center bg-[#fffdf8]/90 backdrop-blur-md ring-1 ring-[#e8dcc8] shadow-[0_10px_26px_-12px_rgba(74,52,38,0.55)] text-[#7a2028] hover:bg-white hover:ring-[#7a2028]/30 cursor-pointer group transition-[opacity,transform,background-color] duration-300 ease-out active:scale-95 ${
          phoneShow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        } ${away ? 'lg:opacity-100 lg:translate-y-0 lg:pointer-events-auto' : 'lg:opacity-0 lg:-translate-y-3 lg:pointer-events-none'}`}
      >
        <ArrowLeft className="w-5 h-5 lg:w-[18px] lg:h-[18px] group-hover:-translate-x-0.5 transition-transform" />
      </button>

      {/* Modern Arched Curved Rich Deep Navy Blue Title Header - Removed to avoid showing title as requested */}
      <div className="w-full max-w-xl pt-1 pb-1 flex flex-col items-center justify-center">
      </div>

    </>
  );
};
