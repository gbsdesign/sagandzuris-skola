import React, { useState } from 'react';
import { BookOpen, ExternalLink, Music, Play, X } from 'lucide-react';

// "Meet the ancestors": portraits of the great chanters lead the page,
// then the documentary film and the reading links (they used to sit in a popup).
const PORTRAITS = [
  { src: '/home/karbelashvili.jpg', name: 'წმ. ძმები კარბელაშვილები' },
  { src: '/home/koridze.jpg', name: 'წმ. ფილიმონ ქორიძე' },
  { src: '/home/kereselidze.jpg', name: 'წმ. ექვთიმე კერესელიძე' },
];

const LINKS = [
  { href: 'https://www.galobani.ge/library/biografia', label: 'ცნობილი მგალობლების ისტორიები', Icon: BookOpen },
  { href: 'https://www.galobani.ge/library/istoria', label: 'ისტორია ქართული საეკლესიო საგალობლების ნოტებზე გადაღებისა', Icon: Music },
];

const VIDEO_ID = 'F-7QoI2ULlM';

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#7a2028]/70">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#e6d9c2]" />
    {children}
    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#e6d9c2]" />
  </h2>
);

// A light film card: only the thumbnail loads; the YouTube player appears on tap.
const FilmCard: React.FC = () => {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?start=2&autoplay=1`}
          title="გალობის რაინდები"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        ></iframe>
        <button
          type="button"
          onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
          title="დახურვა"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group w-full flex items-center gap-4 p-2.5 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-sm hover:shadow-md hover:ring-[#7a2028]/30 transition-all text-left cursor-pointer active:scale-[0.99]"
    >
      <div className="relative w-32 sm:w-40 aspect-video shrink-0 rounded-xl overflow-hidden bg-stone-800">
        <img
          src={`https://i.ytimg.com/vi/${VIDEO_ID}/mqdefault.jpg`}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 text-[#7a2028] fill-[#7a2028] translate-x-px" />
          </span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-serif-ge font-bold text-base sm:text-lg text-slate-800 group-hover:text-[#7a2028] transition-colors">
          გალობის რაინდები
        </p>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">დოკუმენტური ფილმი · odishitv</p>
      </div>
    </button>
  );
};

export const AncestorsPage: React.FC = () => (
  <div className="w-full max-w-2xl mx-auto mb-4 px-1 space-y-7">
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
      {PORTRAITS.map(({ src, name }) => (
        <figure
          key={src}
          className="group relative w-[calc(50%-0.375rem)] sm:w-[calc((100%-2rem)/3)] aspect-[3/4] rounded-3xl overflow-hidden bg-stone-200 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <img
            src={src}
            alt={name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-center font-serif-ge text-sm sm:text-base font-bold leading-snug text-white drop-shadow">
            {name}
          </figcaption>
        </figure>
      ))}
    </div>

    <section className="space-y-3">
      <SectionLabel>ფილმი</SectionLabel>
      <FilmCard />
    </section>

    <section className="space-y-3">
      <SectionLabel>წაიკითხე</SectionLabel>
      <div className="space-y-2.5">
        {LINKS.map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-sm hover:shadow-md hover:ring-[#7a2028]/30 transition-all duration-200 text-slate-800 hover:text-[#7a2028]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fbf6ec] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#7a2028]" />
              </div>
              <span className="font-semibold text-sm sm:text-base">{label}</span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#7a2028] group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        ))}
      </div>
    </section>
  </div>
);
