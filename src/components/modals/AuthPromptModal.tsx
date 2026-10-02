import React from 'react';
import { LogIn, X, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context';
import { triggerHaptic } from '../../utils/haptics';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFeatureName?: string;
}

export const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  isOpen,
  onClose,
  targetFeatureName = 'ამ განყოფილებით',
}) => {
  const { signingIn, signInWithGoogle } = useAuth();

  if (!isOpen) return null;

  const handleSignIn = async () => {
    triggerHaptic(15);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      console.error('Sign in error:', err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-200 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200 text-slate-800"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => onClose()}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Lock / Key Icon Banner */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-400/40 text-[#85502c] flex items-center justify-center shadow-inner mt-2">
          <Lock className="w-8 h-8 text-[#85502c]" />
        </div>

        {/* Modal Title & Description */}
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-black text-slate-800">
            საჭიროა ავტორიზაცია
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm">
            <span className="font-bold text-amber-900">{targetFeatureName}</span> სარგებლობისთვის, თქვენი მონაცემების, შეფასებებისა და პირადი პროგრესის უსაფრთხოდ შესანახად გთხოვთ გაიაროთ ავტორიზაცია.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="w-full bg-amber-50/50 rounded-2xl p-3.5 border border-amber-200/60 text-left space-y-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>პირადი პროგრესისა და შეფასებების შენახვა</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>მონიშნული საგალობლებისა და ჩანაწერების სინქრონიზაცია</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>წვდომა ყველა მოწყობილობიდან ნებისმიერ დროს</span>
          </div>
        </div>

        {/* Google Sign-in CTA Button */}
        <div className="w-full pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-600 via-[#a06840] to-[#85502c] hover:from-amber-700 hover:to-[#6d3c1c] text-white font-black text-sm tracking-wide shadow-lg shadow-amber-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer border border-amber-300/40 select-none"
          >
            <LogIn className="w-4 h-4" />
            <span>{signingIn ? 'მიმდინარეობს შესვლა...' : 'Google ანგარიშით შესვლა'}</span>
          </button>

          <button
            type="button"
            onClick={() => onClose()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
          >
            გაუქმება
          </button>
        </div>
      </div>
    </div>
  );
};
