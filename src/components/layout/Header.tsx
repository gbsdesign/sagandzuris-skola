import React from 'react';
import { useAuth, useNavigation, useModal } from '../../context';
import { PWAInstallButton } from '../PWAInstallButton';
import { triggerHaptic } from '../../utils/haptics';
import { useMonthlyStudyStats } from '../../hooks/useMonthlyStudyStats';
import { nextLessonLabel, useSelectedCount, openPathPanel } from '../views/IndependentWorkCard';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn } from '../access/SignInPrompt';
import { SearchButton } from '../search/GlobalSearch';
import { Bookmark, User as UserIcon, LogIn, LogOut, Compass, ShieldCheck, Library, GraduationCap, Baby } from 'lucide-react';
import { MONTHS_SHORT_GE } from '../../utils/dateNames';

interface HeaderProps {
  logoUrl: string;
}

// learning tools: the path (skills and manner open from inside it) and the library (open to guests too)
const TOOLS = [
  { id: 'gza', page: 'gz', label: 'საგანძურის გზა', Icon: Compass },
  { id: 'biblioteka', page: 'biblioteka', label: 'ბიბლიოთეკა', Icon: Library },
] as const;

// Phone: [logo] … [🔖 ③] [შესვლა] / tools group below. The full independent-work card lives on the path page.
// Desktop (lg): one row — logo + name · tools in the middle · independent work + profile.
export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, signInWithGoogle, signOutUser, isAdmin, isTeacher } = useAuth();
  const { navigateTo, currentPage, openClass } = useNavigation();
  const memberOf = useMyClasses(user?.uid);
  // a teacher reaches their own classes' pages from the header too
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const myClasses = [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
  const { openModal } = useModal();
  const selectedCount = useSelectedCount();
  const access = useAccess();
  // kids' mode: no profile settings and no signing out (the teacher turns it off)
  const kids = Boolean(access.kids);
  // the learning tools the admin's switches and the kids' mode leave visible
  const tools = TOOLS.filter(t => access.section(t.id === 'gza' ? 'gza' : 'biblioteka') !== 'hidden');
  const stats = useMonthlyStudyStats(user?.uid);
  const showStats = !!stats && stats.planned > 0;
  const workTitle = showStats
    ? `დამოუკიდებელი სამუშაო — ${MONTHS_SHORT_GE[new Date().getMonth()]}: ${stats.worked}/${stats.planned} სთ (${stats.percent}%)\n` +
      `შესრულებული: ${stats.worked} · გამოტოვებული: ${stats.missed} · დარჩენილი: ${stats.remaining}` +
      (stats.next ? `\nშემდეგი მეცადინეობა: ${nextLessonLabel(stats.next)} · ${stats.next.hour}` : '')
    : 'დამოუკიდებელი სამუშაო';

  return (
    <header className="relative z-50 safe-bleed safe-top bg-[#fbf6ec] border-b border-[#e8dcc8]">
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

        {/* independent work (icon + count) + install + admin + profile */}
        <div className="order-2 lg:order-3 ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* the search sits beside the learning tools; with none of them shown, up here */}
          {tools.length === 0 && <SearchButton />}
          <PWAInstallButton compact />
          {/* teachers (and admins): the teacher's panel */}
          {isTeacher && (
            <button
              type="button"
              onClick={() => navigateTo('teacher')}
              className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                currentPage === 'teacher' ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
              }`}
              title="მასწავლებლის პანელი"
              aria-label="მასწავლებლის პანელი"
            >
              <GraduationCap className="w-4 h-4" />
            </button>
          )}
          {/* admins only: shield icon to the admin panel */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className={`w-9 h-9 rounded-xl ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                currentPage === 'admin' ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
              }`}
              title="ადმინ პანელი"
              aria-label="ადმინ პანელი"
            >
              <ShieldCheck className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              // signed in: unfold the panel on the path page; guests get the sign-in prompt
              if (user) { openPathPanel('work'); navigateTo('gz'); } else openModal('bookmark');
            }}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl bg-white/80 hover:bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 transition-all cursor-pointer select-none active:scale-95 shrink-0"
            title={workTitle}
            aria-label={workTitle}
          >
            <Bookmark className="w-4 h-4 text-[#7a2028] fill-[#7a2028]/20 shrink-0" />
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
              {kids && (
                <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold shrink-0" title="საბავშვო რეჟიმი — მასწავლებელმა ჩართო">
                  <Baby className="w-3.5 h-3.5" /> საბავშვო
                </span>
              )}
              <button
                type="button"
                onClick={() => !kids && navigateTo('profile')}
                disabled={kids}
                className="shrink-0 rounded-full p-0.5 hover:ring-2 hover:ring-[#7a2028]/30 transition-all cursor-pointer active:scale-95 disabled:cursor-default disabled:hover:ring-0"
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
              {!kids && <button
                onClick={signOutUser}
                className="w-9 h-9 rounded-xl ring-1 ring-[#e8dcc8] bg-white/80 text-[#8a7a6a] hover:text-[#7a2028] hover:bg-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                title="გამოსვლა"
              >
                <LogOut className="w-4 h-4" />
              </button>}
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

        {/* learning tools: one group, full width on phones, centred on desktop; the search beside it */}
{tools.length > 0 && (
        <nav className="order-3 lg:order-2 w-full lg:w-auto lg:mx-auto flex justify-center gap-1.5 sm:gap-2" aria-label="სასწავლო მასალა">
          <div className="flex-1 sm:flex-none flex items-stretch rounded-xl bg-white/80 ring-1 ring-[#e8dcc8] p-0.5">
            {tools.map(({ id, page, label, Icon }, i) => (
              <React.Fragment key={id}>
                {i > 0 && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(10);
                    // the path is its own page; guests still get the sign-in prompt from the modal layer
                    if (id === 'gza' && !user) openModal('gza');
                    // guests see the library's button, but need to sign in to open it
                    else if (id === 'biblioteka' && access.section('biblioteka') === 'locked') askSignIn('ბიბლიოთეკა');
                    else navigateTo(page);
                  }}
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-8 px-2 min-[400px]:px-3 rounded-lg text-xs min-[400px]:text-[13px] font-bold ${currentPage === page ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
                  title={label}
                >
                  <Icon className="w-4 h-4 text-[#7a2028] shrink-0" />
                  <span>{label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
          <SearchButton />
        </nav>
        )}
      </div>
    </header>
  );
};
