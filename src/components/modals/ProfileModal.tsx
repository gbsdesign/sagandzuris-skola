import React from 'react';
import { User as UserIcon, X, ShieldCheck } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { StudentProfileCard } from '../views/StudentProfileCard';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();
  const { navigateTo } = useNavigation();
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2a2017]/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#fbf6ec] rounded-[28px] p-4 sm:p-6 shadow-2xl ring-1 ring-[#e8dcc8] space-y-4 animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Bar with Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e8dcc8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#7a2028]/10 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-[#7a2028]" />
            </div>
            <h3 className="font-serif-ge text-base font-bold text-[#4a3426]">
              პირადი პროფილი და განრიგი
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => { onClose(); navigateTo('admin'); }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-[#4a3426] text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="ადმინის პანელი"
            >
              <ShieldCheck className="w-4 h-4 text-[#7a2028]" />
              ადმინი
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/80 ring-1 ring-[#e8dcc8] text-[#8a7a6a] hover:text-[#7a2028] hover:bg-white transition-colors cursor-pointer"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
          </div>
        </div>

        {/* Profile Card Inside Modal */}
        <StudentProfileCard />
      </SwipeToDismiss>
    </div>
  );
};
