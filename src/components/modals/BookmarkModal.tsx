import React from 'react';
import { Bookmark, X } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { StudentBookmarkView } from '../views/StudentBookmarkView';
import { useNavigation } from '../../context';

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BookmarkModal: React.FC<BookmarkModalProps> = ({ isOpen, onClose }) => {
  const { navigateTo } = useNavigation();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-slate-50/95 backdrop-blur-md rounded-3xl p-3 sm:p-5 shadow-2xl border border-amber-200/90 space-y-3 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Bar with Close Button */}
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs">
              <Bookmark className="w-4 h-4 text-[#85502c] fill-amber-500/30" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800">
              დამოუკიდებელი სამუშაო
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

        {/* Student Bookmark View Inside Modal */}
        <StudentBookmarkView
          onBack={onClose}
          onGoToGaloba={() => {
            onClose();
            navigateTo('galoba');
          }}
        />
      </SwipeToDismiss>
    </div>
  );
};
