import React from 'react';

interface FooterProps {
  logoUrl: string;
}

export const Footer: React.FC<FooterProps> = ({ logoUrl }) => {
  return (
    <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src={logoUrl}
              alt="აქ საგანძურია"
              className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200/80 p-0.5 shadow-xs"
              referrerPolicy="no-referrer"
            />
            <span className="font-semibold text-slate-700 text-sm">აქ საგანძურია</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
          {/* Facebook Button */}
          <a
            href="https://www.facebook.com/passangermgzavrebi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-[#1877F2]/5 text-slate-700 hover:text-[#1877F2] transition-all duration-200 border border-slate-200 hover:border-[#1877F2]/30 font-medium text-xs sm:text-sm group shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="Facebook გვერდი"
          >
            <svg
              className="w-5 h-5 fill-[#1877F2] group-hover:scale-110 transition-transform duration-200"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span className="font-semibold text-slate-700 group-hover:text-[#1877F2] transition-colors">Facebook</span>
          </a>

          {/* WhatsApp Button */}
          <a
            href="https://wa.me/995591944792"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-[#25D366]/5 text-slate-700 hover:text-[#128C7E] transition-all duration-200 border border-slate-200 hover:border-[#25D366]/40 font-medium text-xs sm:text-sm group shadow-xs hover:shadow-md hover:-translate-y-0.5"
            title="WhatsApp კონტაქტი"
          >
            <svg
              className="w-5 h-5 fill-[#25D366] group-hover:scale-110 transition-transform duration-200"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.886-9.888 9.886m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
            </svg>
            <span className="font-semibold text-slate-700 group-hover:text-[#128C7E] transition-colors">WhatsApp</span>
          </a>

          <span className="hidden md:inline-block text-slate-300">|</span>
          <span className="text-slate-500">© {new Date().getFullYear()} ყველა უფლება დაცულია.</span>
        </div>
      </div>
    </footer>
  );
};
