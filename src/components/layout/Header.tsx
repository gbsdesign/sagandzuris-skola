import React from 'react';
import { useAuth, useNavigation, useModal } from '../../context';
import { PWAInstallButton } from '../PWAInstallButton';
import { triggerHaptic } from '../../utils/haptics';
import {
  Bookmark,
  User as UserIcon,
  LogOut,
  Sparkles,
  Music,
  ShieldCheck,
} from 'lucide-react';

interface HeaderProps {
  logoUrl: string;
}

export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, signInWithGoogle, signOutUser, isAdmin } = useAuth();
  const { navigateTo, currentPage } = useNavigation();
  const { openModal } = useModal();

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        {/* Top row on mobile / Left side on desktop: Logo, "დამოუკიდებელი სამუშაო", & Profile */}
        <div className="w-full flex items-center justify-between sm:w-auto sm:justify-start gap-2.5">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center hover:opacity-80 transition-all cursor-pointer text-left shrink-0 p-1 rounded-2xl hover:bg-slate-100 active:scale-95"
            title="მთავარი"
          >
            <img
              src={logoUrl}
              alt="საგანძურის სკოლის ლოგო"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-slate-50 border border-slate-200/80 p-0.5 shadow-2xs"
              referrerPolicy="no-referrer"
            />
          </button>

          {/* "დამოუკიდებელი სამუშაო" & PWA Install Button */}
          <div className="flex items-center gap-1.5">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                openModal('bookmark');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-black cursor-pointer select-none active:scale-95 shadow-2xs bg-gradient-to-r from-amber-50/90 via-white to-amber-50/90 text-[#85502c] border-amber-300/90 hover:bg-amber-100 shrink-0"
              title="დამოუკიდებელი სამუშაო"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-700 fill-amber-500/30 shrink-0" />
              <span className="tracking-tight">დამოუკიდებელი სამუშაო</span>
            </button>
          </div>

          {/* Profile & Signout for mobile right corner */}
          <div className="sm:hidden flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => navigateTo('admin')}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-90 shadow-2xs ${
                  currentPage === 'admin'
                    ? 'bg-purple-700 text-white border-purple-800'
                    : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                }`}
                title="ადმინის პანელი"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700" />
              </button>
            )}
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => openModal('profile')}
                  className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-amber-50/80 active:scale-90 transition-all cursor-pointer"
                  title="პროფილის გახსნა"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'მოსწავლე'}
                      className="w-8 h-8 rounded-full ring-2 ring-amber-400/80 object-cover shadow-2xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-100 ring-2 ring-amber-300 text-amber-900 flex items-center justify-center font-black text-xs">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </button>
                <button
                  onClick={signOutUser}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 active:scale-90 transition-all cursor-pointer shadow-2xs"
                  title="გამოსვლა"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-[#85502c] text-white font-bold text-xs shadow-2xs cursor-pointer active:scale-95"
              >
                {signingIn ? '...' : 'შესვლა'}
              </button>
            )}
          </div>
        </div>

        {/* Header Action Buttons Group */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={() => openModal('chvevebi')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer select-none active:scale-95 shadow-sm bg-amber-100/30 hover:bg-amber-100/60 text-[#85502c] border-amber-200/50"
            title="ჩვევები"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>ჩვევები</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('manera')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer select-none active:scale-95 shadow-sm bg-amber-100/30 hover:bg-amber-100/60 text-[#85502c] border-amber-200/50"
            title="მანერა"
          >
            <Music className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>მანერა</span>
          </button>

          <button
            type="button"
            onClick={() => openModal('gza')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer select-none active:scale-95 shadow-sm bg-amber-100/30 hover:bg-amber-100/60 text-[#85502c] border-amber-200/50"
            title="საგანძურის გზა"
          >
            <span>საგანძურის გზა</span>
          </button>
        </div>

        {/* Desktop Profile & SignOut */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-black cursor-pointer select-none active:scale-95 shadow-2xs ${
                currentPage === 'admin'
                  ? 'bg-purple-700 text-white border-purple-800 shadow-sm'
                  : 'bg-gradient-to-r from-purple-50 to-amber-50 text-purple-900 border-purple-200/90 hover:bg-purple-100 hover:border-purple-300'
              }`}
              title="ადმინის პანელი"
            >
              <ShieldCheck className={`w-4 h-4 ${currentPage === 'admin' ? 'text-white' : 'text-purple-700'}`} />
              <span>ადმინი</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => openModal('profile')}
                className="flex items-center gap-2 p-1 px-2.5 py-1 rounded-xl hover:bg-amber-50/80 border border-transparent hover:border-amber-300/80 transition-all cursor-pointer group text-left"
                title="პროფილის გახსნა"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'მოსწავლე'}
                    className="w-8 h-8 rounded-full ring-2 ring-amber-400/80 object-cover shadow-2xs group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-amber-100 ring-2 ring-amber-300 text-amber-900 flex items-center justify-center font-black text-xs">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900 leading-tight">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold leading-none">
                    მოსწავლე
                  </span>
                </div>
              </button>
              <button
                onClick={signOutUser}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 active:scale-90 transition-all cursor-pointer shadow-2xs"
                title="გამოსვლა"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-[#85502c] hover:from-amber-700 hover:to-[#6d3c1c] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {signingIn ? 'შესვლა...' : 'შესვლა'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
