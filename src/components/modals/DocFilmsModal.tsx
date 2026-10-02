import React from 'react';
import { BookOpen, ExternalLink, Music, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';

interface DocFilmsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocFilmsModal: React.FC<DocFilmsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 sm:p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-800 shadow-2xs">
              <BookOpen className="w-5 h-5 text-[#85502c]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg sm:text-xl">
                გაიცანი წინაპრები
              </h3>
              <p className="text-xs text-slate-500">დოკუმენტური ფილმები და ისტორია</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Embedded YouTube Player */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-black">
          <iframe
            className="w-full h-full"
            src="https://www.youtube-nocookie.com/embed/F-7QoI2ULlM?start=2"
            title="გაიცანი წინაპრები - გალობის საგანძური"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>

        {/* External Reference Links */}
        <div className="space-y-2 pt-1">
          <a
            href="https://www.galobani.ge/library/biografia"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50/70 to-stone-50 border border-amber-200/60 hover:border-amber-400 hover:shadow-xs transition-all duration-200 text-slate-800 hover:text-[#85502c]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-[#85502c]" />
              </div>
              <span className="font-semibold text-xs sm:text-sm">
                ცნობილი მგალობლების ისტორიები
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#85502c] group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>

          <a
            href="https://www.galobani.ge/library/istoria"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-50/70 to-stone-50 border border-amber-200/60 hover:border-amber-400 hover:shadow-xs transition-all duration-200 text-slate-800 hover:text-[#85502c]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Music className="w-3.5 h-3.5 text-[#85502c]" />
              </div>
              <span className="font-semibold text-xs sm:text-sm">
                ისტორია ქართული საეკლესიო საგალობლების ნოტებზე გადაღებისა
              </span>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#85502c] group-hover:translate-x-0.5 transition-all shrink-0" />
          </a>
        </div>
      </SwipeToDismiss>
    </div>
  );
};
