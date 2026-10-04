import React, { useMemo } from 'react';
import { useAuth, useNavigation, useModal, useChants } from '../../context';
import { PWAInstallButton } from '../PWAInstallButton';
import { triggerHaptic } from '../../utils/haptics';
import { filterValidVariants } from '../../utils/variantValidation';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { useMyClasses } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { Bookmark, User as UserIcon, LogIn, LogOut, Compass } from 'lucide-react';

interface HeaderProps {
  logoUrl: string;
}

// learning tools: the path (skills and manner open from inside it)
const TOOLS = [
  { modal: 'gza', label: 'საგანძურის გზა', Icon: Compass },
] as const;

const MONTHS_SHORT_GE = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

// Phone: [logo] … [დამოუკიდებელი სამუშაო ③] [შესვლა] / tools group below.
// Desktop (lg): one row — logo + name · tools in the middle · independent work + profile.
export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, signInWithGoogle, signOutUser } = useAuth();
  const { navigateTo, currentPage, openClass } = useNavigation();
  const myClasses = useMyClasses(user?.uid);
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
    <header className="relative z-50 bg-[#fbf6ec] border-b border-[#e8dcc8]">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2">
        {/* logo (+ name from md up) */}
        <button
          type="button"
          onClick={() => navigateTo('home')}
          className="order-1 flex items-center gap-2.5 p-1 pr-2 rounded-2xl hover:bg-[#7a2028]/5 transition-all cursor-pointer text-left shrink-0 active:scale-95"
          title="მთავარი"
        >
          <img
            src={logoUrl}
            alt="საგანძურის სკოლის ლოგო"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain bg-white ring-1 ring-[#e8dcc8] p-0.5"
            referrerPolicy="no-referrer"
          />
          <span className="hidden md:inline font-serif-ge text-base font-bold text-[#4a3426]">საგანძურის სკოლა</span>
        </button>

        {/* independent work (main button, always labelled) + install + admin + profile */}
        <div className="order-2 lg:order-3 ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={() => { triggerHaptic(10); openModal('bookmark'); }}
            className={`inline-flex items-center gap-1.5 ${showStats ? 'min-h-9 py-1' : 'h-9'} px-2.5 min-[400px]:px-3 rounded-xl bg-white/80 hover:bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-xs min-[400px]:text-[13px] font-black tracking-tight transition-all cursor-pointer select-none active:scale-95 shrink-0`}
            title={workTitle}
          >
            <Bookmark className="w-4 h-4 text-[#7a2028] fill-[#7a2028]/20 shrink-0" />
            <span className="flex flex-col items-stretch gap-0.5 text-left">
              <span className="whitespace-nowrap leading-tight">დამოუკიდებელი სამუშაო</span>
              {showStats && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#8a7a6a] leading-none">
                  <span className="flex-1 h-1.5 min-w-8 rounded-full bg-[#efe5d4] overflow-hidden">
                    <span
                      className={`block h-full rounded-full ${stats.percent >= 100 ? 'bg-emerald-500' : 'bg-[#7a2028]'}`}
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
              <span className="min-w-5 h-5 px-1 rounded-full bg-[#7a2028] text-[#fbf6ec] text-[10px] font-black flex items-center justify-center leading-none">
                {selectedCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5">
              {/* the student's class(es): logo before the avatar, opens the class page */}
              {myClasses.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openClass(c.id)}
                  className="shrink-0 rounded-full p-0.5 hover:ring-2 hover:ring-[#7a2028]/30 transition-all cursor-pointer active:scale-95"
                  title={`${c.name} — კლასის გვერდი`}
                  aria-label={`კლასი: ${c.name}`}
                >
                  <ClassLogo name={c.name} logo={c.logo} className="w-8 h-8 text-sm" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => openModal('profile')}
                className="shrink-0 rounded-full p-0.5 hover:ring-2 hover:ring-[#7a2028]/30 transition-all cursor-pointer active:scale-95"
                title={`${user.displayName || user.email} — პროფილი`}
                aria-label="პროფილის გახსნა"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'მოსწავლე'}
                    className="w-8 h-8 rounded-full ring-2 ring-[#e8dcc8] object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#efe5d4] ring-2 ring-[#e8dcc8] text-[#4a3426] flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </button>
              <button
                onClick={signOutUser}
                className="w-9 h-9 rounded-xl ring-1 ring-[#e8dcc8] bg-white/80 text-[#8a7a6a] hover:text-[#7a2028] hover:bg-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="გამოსვლა"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              disabled={signingIn}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-xs min-[400px]:text-[13px] font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4 hidden min-[400px]:block" />
              {signingIn ? 'შესვლა...' : 'შესვლა'}
            </button>
          )}
        </div>

        {/* learning tools: one group, full width on phones, centred on desktop */}
        <nav className="order-3 lg:order-2 w-full lg:w-auto lg:mx-auto flex justify-center" aria-label="სასწავლო მასალა">
          <div className="w-full sm:w-auto flex items-stretch rounded-xl bg-white/80 ring-1 ring-[#e8dcc8] p-0.5">
            {TOOLS.map(({ modal, label, Icon }, i) => (
              <React.Fragment key={modal}>
                {i > 0 && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    // the path is its own page; guests still get the sign-in prompt from the modal layer
                    if (modal === 'gza' && user) navigateTo('gz');
                    else openModal(modal);
                  }}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-8 px-2 min-[400px]:px-3 rounded-lg text-xs min-[400px]:text-[13px] font-bold ${modal === 'gza' && currentPage === 'gz' ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
                  title={label}
                >
                  <Icon className="w-4 h-4 text-[#7a2028] shrink-0" />
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
