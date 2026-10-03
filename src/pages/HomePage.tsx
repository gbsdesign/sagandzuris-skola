import React from 'react';
import { GrapeNav } from '../components/home/GrapeNav';

interface HomePageProps {
  logoUrl: string;
}

export const HomePage: React.FC<HomePageProps> = ({ logoUrl }) => {
  return (
    <div className="rounded-[28px] bg-[#f8f2e7] border border-[#e6d9c2] px-5 py-8 sm:px-10 sm:py-12 text-center flex flex-col items-center text-[#2a2017]">
      {/* School logo straight on the parchment (multiply drops its white background), vine ornament under it */}
      <img
        src={logoUrl}
        alt="საგანძურის სკოლა"
        className="w-44 h-44 sm:w-56 sm:h-56 object-contain mix-blend-multiply"
        referrerPolicy="no-referrer"
      />
      <div className="mt-2 w-full flex justify-center">
        <GrapeNav />
      </div>

      {/* the Patriarch's words: typography only, with a cinnabar initial as in old manuscripts */}
      <figure className="mt-10 sm:mt-12 w-full max-w-md text-left">
        <blockquote className="font-serif-ge text-[15px] sm:text-base leading-relaxed text-[#3a2d22]">
          <span className="float-left font-serif-ge text-[54px] leading-[0.8] mr-2 mt-1.5 text-[#9a3324]" aria-hidden>ა</span>
          <span className="sr-only">ა</span>დამიანმა სულიერი მოღვაწეობით უნდა შექმნას ერთგვარი ჯვარი, ვერტიკალური და ჰორიზონტალური სწრაფვის. ვერტიკალური ეს არის უფლისადმი მიმართული ქართული გალობა და ჰორიზონტალური ეს არის ხალხური სიმღერა მიმართული ადამიანებისადმი.
        </blockquote>
        <figcaption className="mt-3 text-right text-[13px] text-[#75685a]">— უწმიდესი და უნეტარესი ილია II</figcaption>
      </figure>

    </div>
  );
};
