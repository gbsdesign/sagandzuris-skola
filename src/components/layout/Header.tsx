import React, { useMemo } from 'react';
import { useAuth, useNavigation, useModal, useChants } from '../../context';
import { PWAInstallButton } from '../PWAInstallButton';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { Bookmark, User as UserIcon, LogIn, LogOut, Sparkles, Music, Compass, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  logoUrl: string;
}

// learning tools: one segmented group, all with icons
const TOOLS = [
  { modal: 'chvevebi', label: 'ჩვევები', Icon: Sparkles },
  { modal: 'manera', label: 'მანერა', Icon: Music },
  { modal: 'gza', label: 'საგანძურის გზა', Icon: Compass },
] as const;

const MONTHS_SHORT_GE = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

// Phone: [logo] … [დამოუკიდებელი სამუშაო ③] [შესვლა] / tools group below.
// Desktop (lg): one row — logo + name · tools in the middle · independent work + profile.
export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, signInWithGoogle, signOutUser, isAdmin } = useAuth();
  const { navigateTo, currentPage } = useNavigation();
  const { openModal } = useModal();
  const { selectedChantVariants = {} } = useChants();
  const selectedCount = useMemo(() => Object.keys(filterValidVariants(selectedChantVariants)).length, [selectedChantVariants]);
  const stats = useMonthlyStudyStats(user?.uid);
  const showStats = !!stats && stats.planned > 0;
  const nextLabel = stats?.next
    ? stats.next.offset === 0 ? 'დღეს' : stats.next.offset === 1 ? 'ხვალ' : `${stats.next.date.getDate()} ${MONTHS_SHORT_GE[stats.next.date.getMonth()]}`
    : '';
  const workTitle = showStats
    ? `დამოუკიდებელი სამუშაო — ${MONTHS_SHORT_GE[new Date().getMonth()]}: ${stats.worked}/${stats.planned} სთ (${stats.percent}%)\n` +
      `შესრულებული: ${stats.worked} · გამოტოვებული: ${stats.missed} · დარჩენილი: ${stats.remaining}` +
      (stats.next ? `\nშემდეგი მეცადინეობა: ${nextLabel} · ${stats.next.hour}` : '')
    : 'დამოუკიდებელი სამუშაო';

  return (
    <header className="sticky top-0 z-50 bg-[#fffdf9]/95 backdrop-blur-md border-b border-amber-100 shadow-[0_2px_12px_-6px_rgba(133,80,44,0.18)]">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2">
        {/* logo (+ name from md up) */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="order-1 flex items-center gap-2.5 p-1 pr-2 rounded-2xl hover:bg-amber-50/80 transition-all cursor-pointer text-left shrink-0 active:scale-95"
          title="მთავარი"
        >
          <img
            src={logoUrl}
            alt="საგანძურის სკოლის ლოგო"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-white ring-1 ring-amber-200/80 p-0.5 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <span className="hidden md:inline text-[15px] font-black text-[#5c3a21] tracking-tight">საგანძურის სკოლა</span>
        </button>

        {/* independent work (main button, always labelled) + install + admin + profile */}
        <div className="order-2 lg:order-3 ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={() => { triggerHaptic(10); openModal('bookmark'); }}
            className={`inline-flex items-center gap-1.5 ${showStats ? 'min-h-9 py-1' : 'h-9'} px-2.5 min-[400px]:px-3 rounded-xl bg-gradient-to-b from-amber-100 to-amber-200/80 hover:from-amber-200/70 hover:to-amber-200 text-[#6f3f1d] ring-1 ring-amber-300/80 shadow-xs text-xs min-[400px]:text-[13px] font-black tracking-tight transition-all cursor-pointer select-none active:scale-95 shrink-0`}
            title={workTitle}
          >
            <Bookmark className="w-4 h-4 text-amber-700 fill-amber-500/50 shrink-0" />
            <span className="flex flex-col items-stretch gap-0.5 text-left">
              <span className="whitespace-nowrap leading-tight">დამოუკიდებელი სამუშაო</span>
              {showStats && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900/80 leading-none">
                  <span className="flex-1 h-1.5 min-w-8 rounded-full bg-white/80 ring-1 ring-amber-300/60 overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${stats.percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-700'}`}
                      style={{ width: `${stats.percent}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap">
                    {stats.worked}/{stats.planned} სთ
                    {stats.next && <span className="hidden sm:inline"> · {nextLabel} {stats.next.hour}</span>}
                  </span>
                </span>
              )}
            </span>
            {selectedCount > 0 && (
              <span className="min-w-5 h-5 px-1 rounded-full bg-[#85502c] text-white text-[10px] font-black flex items-center justify-center leading-none">
                {selectedCount}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl ring-1 text-[13px] font-black transition-all cursor-pointer active:scale-95 shadow-xs ${
                currentPage === 'admin' ? 'bg-purple-700 text-white ring-purple-800' : 'bg-purple-50 text-purple-900 ring-purple-200 hover:bg-purple-100'
              }`}
              title="ადმინის პანელი"
            >
              <ShieldCheck className={`w-4 h-4 ${currentPage === 'admin' ? 'text-white' : 'text-purple-700'}`} />
              <span className="hidden lg:inline">ადმინი</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openModal('profile')}
                className="flex items-center gap-2 p-1 lg:pr-2.5 rounded-xl hover:bg-amber-50/80 transition-all cursor-pointer group text-left active:scale-95"
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
                  <div className="w-8 h-8 rounded-full bg-amber-100 ring-2 ring-amber-300 text-amber-900 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <span className="hidden lg:flex flex-col">
                  <span className="text-xs font-bold text-slate-800 group-hover:text-amber-900 leading-tight max-w-[140px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold leading-none">მოსწავლე</span>
                </span>
              </button>
              <button
                onClick={signOutUser}
                className="w-9 h-9 rounded-xl ring-1 ring-slate-200 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-2xs"
                title="გამოსვლა"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-b from-amber-600 to-[#85502c] hover:from-amber-700 hover:to-[#6d3c1c] text-white text-xs min-[400px]:text-[13px] font-bold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4 hidden min-[400px]:block" />
              {signingIn ? 'შესვლა...' : 'შესვლა'}
            </button>
          )}
        </div>

        {/* learning tools: one group, full width on phones, centred on desktop */}
        <nav className="order-3 lg:order-2 w-full lg:w-auto lg:mx-auto flex justify-center" aria-label="სასწავლო მასალა">
          <div className="w-full sm:w-auto flex items-stretch rounded-xl bg-white ring-1 ring-amber-200/80 shadow-xs p-0.5">
            {TOOLS.map(({ modal, label, Icon }, i) => (
              <React.Fragment key={modal}>
                {i > 0 && <span aria-hidden className="w-px my-1.5 bg-amber-200/70 shrink-0" />}
                <button
                  type="button"
                  onClick={() => { triggerHaptic(10); openModal(modal); }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-8 px-2 min-[400px]:px-3 rounded-lg text-xs min-[400px]:text-[13px] font-bold text-[#85502c] hover:bg-amber-50 transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95"
                  title={label}
                >
                  <Icon className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
};
