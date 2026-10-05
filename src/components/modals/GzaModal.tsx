import React from 'react';
import { Bookmark, X, Sparkles, Music } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { GzaView } from '../views/StudentBookmarkView';
import { useNavigation, useChants, useModal } from '../../context';

interface GzaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GzaModal: React.FC<GzaModalProps> = ({ isOpen, onClose }) => {
  const { navigateTo } = useNavigation();
  const { selectedChantVariants, setSelectedChantVariants } = useChants();
  const { openModal } = useModal();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-50/95 backdrop-blur-md rounded-3xl p-3 sm:p-5 shadow-2xl border border-amber-200/90 space-y-3 animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs">
              <Bookmark className="w-4 h-4 text-[#85502c]" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              საგანძურის გზა
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-300 shadow-2xs"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* skills and manner live inside the path now (moved out of the header) */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { modal: 'chvevebi', label: 'ჩვევები', Icon: Sparkles },
            { modal: 'manera', label: 'მანერა', Icon: Music },
          ] as const).map(({ modal, label, Icon }) => (
            <button
              key={modal}
              type="button"
              onClick={() => openModal(modal, 'gza')}
              className="inline-flex items-center justify-center gap-2 h-11 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 hover:bg-[#7a2028]/5 text-sm font-bold text-[#4a3426] hover:text-[#7a2028] transition-colors cursor-pointer active:scale-95"
            >
              <Icon className="w-4 h-4 text-[#7a2028]" />
              {label}
            </button>
          ))}
        </div>

        <GzaView
          onGoToGaloba={() => {
            onClose();
            navigateTo('galoba');
          }}
          selectedChantVariants={selectedChantVariants}
          onUpdateVariants={(next) => setSelectedChantVariants(next)}
        />
      </SwipeToDismiss>
    </div>
  );
};
