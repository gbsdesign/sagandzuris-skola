import React from 'react';
import { useNavigation, useModal } from '../context';
import { BookOpen, ChevronDown } from 'lucide-react';

interface HomePageProps {
  logoUrl: string;
}

export const HomePage: React.FC<HomePageProps> = ({ logoUrl }) => {
  const { navigateTo } = useNavigation();
  const { openModal, isModalOpen } = useModal();
  const isDocFilmsOpen = isModalOpen('docFilms');

  return (
    <div className="bg-[#f5f3f3] border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-sm text-center flex flex-col items-center">
      {/* School Logo */}
      <div className="relative mb-6">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl bg-white p-2 border border-slate-100 shadow-md flex items-center justify-center overflow-hidden hover:shadow-lg transition-shadow">
          <img
            src={logoUrl}
            alt="საგანძურის სკოლა"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Prominent Large Main "გალობა" Button */}
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-md mt-2">
        <button
          type="button"
          onClick={() => navigateTo('galoba')}
          className="w-full relative group overflow-hidden px-8 py-6 sm:py-7 rounded-2xl bg-gradient-to-br from-[#b87648] via-[#85502c] to-[#592f14] text-white font-black shadow-xl shadow-[#85502c]/45 hover:shadow-2xl hover:shadow-[#85502c]/65 active:scale-[0.98] border-2 border-[#f0bc94] ring-2 ring-amber-400/40 transition-all duration-300 cursor-pointer flex items-center justify-center"
        >
          {/* Subtle top rim light */}
          <span className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffe8d4] to-transparent"></span>
          {/* Shimmer light sweep */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"></span>
          {/* Ambient hover glow */}
          <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#ffd8b8]/40 via-transparent to-[#ffd8b8]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
          <span className="relative z-10 text-3xl sm:text-4xl md:text-5xl font-black tracking-wider leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] -mt-1 sm:-mt-1.5 pb-0.5 transition-transform duration-150 group-active:scale-95 active:scale-95">
            გალობა
          </span>
        </button>

        {/* Other Category Buttons */}
        <button
          type="button"
          onClick={() => navigateTo('simghera')}
          className="w-full relative group overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-br from-[#a06840] via-[#85502c] to-[#6d3c1c] text-white font-bold text-xl sm:text-2xl tracking-wide shadow-lg shadow-[#85502c]/30 hover:shadow-2xl hover:shadow-[#85502c]/50 active:scale-[0.97] border border-[#d8a47f]/40 transition-all duration-300 cursor-pointer"
        >
          {/* Subtle top rim light */}
          <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ffd8b8]/80 to-transparent"></span>
          {/* Shimmer light sweep */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"></span>
          {/* Ambient hover glow */}
          <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#d8a47f]/30 via-transparent to-[#d8a47f]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
          <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">სიმღერა</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          <button
            type="button"
            onClick={() => navigateTo('mtkmeli')}
            className="w-full sm:w-auto flex-1 relative group overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-br from-[#a06840] via-[#85502c] to-[#6d3c1c] text-white font-bold text-xl sm:text-2xl tracking-wide shadow-lg shadow-[#85502c]/30 hover:shadow-2xl hover:shadow-[#85502c]/50 active:scale-[0.97] border border-[#d8a47f]/40 transition-all duration-300 cursor-pointer"
          >
            {/* Subtle top rim light */}
            <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ffd8b8]/80 to-transparent"></span>
            {/* Shimmer light sweep */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"></span>
            {/* Ambient hover glow */}
            <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#d8a47f]/30 via-transparent to-[#d8a47f]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">მთქმელი</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('sakravebi')}
            className="w-full sm:w-auto flex-1 relative group overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-br from-[#a06840] via-[#85502c] to-[#6d3c1c] text-white font-bold text-xl sm:text-2xl tracking-wide shadow-lg shadow-[#85502c]/30 hover:shadow-2xl hover:shadow-[#85502c]/50 active:scale-[0.97] border border-[#d8a47f]/40 transition-all duration-300 cursor-pointer"
          >
            {/* Subtle top rim light */}
            <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ffd8b8]/80 to-transparent"></span>
            {/* Shimmer light sweep */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none"></span>
            {/* Ambient hover glow */}
            <span className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#d8a47f]/30 via-transparent to-[#d8a47f]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>
            <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">საკრავები</span>
          </button>
        </div>
      </div>

      {/* Patriarch Ilia II Quote Card */}
      <div className="mt-5 w-full max-w-md relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#d8a47f]/40 via-[#a06840]/50 to-[#d8a47f]/40 rounded-[24px] blur-md opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

        <div className="relative bg-gradient-to-b from-[#fcf9f5] via-[#faf4ed] to-[#f6ede3] border border-[#d8a47f]/50 rounded-[20px] p-4.5 sm:p-5 shadow-lg shadow-[#85502c]/8 overflow-hidden group-hover:shadow-[0_0_30px_rgba(216,164,127,0.4)] transition-all duration-500">
          <span className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#d8a47f]/70 to-transparent"></span>

          <div className="flex items-center justify-center gap-2 mb-2.5">
            <span className="h-px w-6 bg-[#d8a47f]/60"></span>
            <span className="text-base select-none leading-none drop-shadow-xs">📿</span>
            <h3 className="text-[15px] sm:text-base font-bold text-[#5c3a21] tracking-wide">
              პატრიარქი ილია II-ს სიტყვა
            </h3>
            <span className="text-base select-none leading-none drop-shadow-xs">📿</span>
            <span className="h-px w-6 bg-[#d8a47f]/60"></span>
          </div>

          <div className="relative px-1">
            <p className="text-[#3e2719] text-[13.5px] sm:text-[14px] leading-relaxed font-normal text-center select-text">
              <span className="text-[#a06840] font-bold text-lg select-none mr-1 inline-block align-baseline">„</span>
              ადამიანმა სულიერი მოღვაწეობით უნდა შექმნას ერთგვარი ჯვარი, ვერტიკალური და ჰორიზონტალური სწრაფვის. ვერტიკალური ეს არის უფლისადმი მიმართული ქართული გალობა და ჰორიზონტალური ეს არის ხალხური სიმღერა მიმართული ადამიანებისადმი.
              <span className="text-[#a06840] font-bold text-lg select-none ml-1 inline-block align-baseline">“</span>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mt-2.5 pt-2 border-t border-[#d8a47f]/25">
            <span className="text-xs text-[#85502c]/70 select-none">🤍</span>
          </div>
        </div>
      </div>

      {/* გაიცანი წინაპრები */}
      <button
        type="button"
        onClick={() => openModal('docFilms')}
        className="mt-6 w-full max-w-md flex items-center gap-4 px-8 py-6 rounded-3xl bg-white hover:bg-amber-50/70 border-2 border-slate-200/90 hover:border-amber-400/80 shadow-lg hover:shadow-xl active:scale-[0.98] active:shadow-md text-slate-800 hover:text-[#85502c] transition-all duration-300 cursor-pointer text-lg sm:text-xl font-black group select-none"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center text-amber-800 shrink-0 group-hover:scale-105 transition-transform">
          <BookOpen className="w-8 h-8 text-[#85502c]" />
        </div>
        <div className="flex-1 text-left">
          <span>გაიცანი წინაპრები</span>
          <p className="text-xs text-slate-500 font-medium mt-1">დოკუმენტური ფილმები და ისტორია</p>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 group-hover:bg-amber-100 transition-colors ${isDocFilmsOpen ? 'rotate-180 text-amber-800' : 'text-slate-400'}`}>
          <ChevronDown className="w-5 h-5 transition-transform duration-200" />
        </div>
      </button>
    </div>
  );
};
