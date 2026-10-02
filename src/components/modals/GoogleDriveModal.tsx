import React from 'react';
import { FolderOpen, ExternalLink, HardDrive, FileText, Music, Cloud, CheckCircle2, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { useAuth } from '../../context';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const driveResources = [
    {
      title: 'სანოტო კრებულები და ხელნაწერები',
      desc: 'ქართული გალობის სანოტო პარტიტურები, ძველი და ახალი გამოცემების PDF კრებულები',
      icon: FileText,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-700 border-amber-200',
      badge: 'PDF / ნოტები',
      link: 'https://drive.google.com/',
    },
    {
      title: 'აუდიო არქივი და სამხმიანი ჩანაწერები',
      desc: 'საგალობლების ხმათა მიხედვით გაშლილი აუდიო ფაილები (მთქმელი, კრინი, ბანი)',
      icon: Music,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-700 border-blue-200',
      badge: 'Audio / MP3',
      link: 'https://drive.google.com/',
    },
    {
      title: 'სასწავლო და სამუშაო მასალები',
      desc: 'დამატებითი სახელმძღვანელოები, ტექსტები, ანოტაციები და კვლევითი მასალები',
      icon: FolderOpen,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-200',
      badge: 'დოკუმენტები',
      link: 'https://drive.google.com/',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500/15 to-indigo-500/20 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg sm:text-xl flex items-center gap-2">
                Google Drive საცავი
              </h3>
              <p className="text-xs text-slate-500">
                საგალობლების ციფრული არქივი და ღრუბლოვანი რესურსები
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Drive Status */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-amber-50/50 border border-blue-100/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-slate-800 block">
                {user ? (user.displayName || user.email) : 'სტუმრის რეჟიმი'}
              </span>
              <span className="text-slate-500 text-[11px]">
                {user ? 'Google Drive დაკავშირებულია' : 'შესვლა Google ანგარიშით'}
              </span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> აქტიური
          </span>
        </div>

        {/* Drive resource items */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            ხელმისაწვდომი რესურსები
          </span>
          {driveResources.map((item, idx) => {
            const Icon = item.icon;
            return (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-300/80 transition-all text-left block"
              >
                <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${item.color} shrink-0 mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-amber-900 transition-colors">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shrink-0">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors shrink-0 self-center ml-1" />
              </a>
            );
          })}
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-400">
            ფაილები ხელმისაწვდომია ნებისმიერ მოწყობილობაზე
          </p>
          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>Drive-ის გახსნა</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </SwipeToDismiss>
    </div>
  );
};
