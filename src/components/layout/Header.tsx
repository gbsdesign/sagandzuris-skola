import React from 'react';
import { useAuth, useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn, openSignIn } from '../access/SignInPrompt';
import { SearchButton } from '../search/GlobalSearch';
import { OfflineButton } from '../offline/OfflineButton';
import { useInbox, isUnread } from '../../hooks/useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread } from '../../hooks/useClassChat';
import { User as UserIcon, LogIn, Compass, Library, Baby, MessageCircle } from 'lucide-react';
import { useKhutsuriSetting } from '../../utils/khutsuri';

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

// the round „Ⴞ“ (asomtavruli ხ) beside the profile: ხუცური on / off for the whole site, kept on this device
const KhutsuriButton: React.FC = () => {
  const [on, set] = useKhutsuriSetting();
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      title={on ? 'ხუცური ჩართულია — დაბრუნება მხედრულზე' : 'ხუცური — ძველი ქართული დამწერლობა'}
      aria-label="ხუცური — ძველი ქართული დამწერლობა"
      className={`w-9 h-9 shrink-0 rounded-full ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
        on ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]' : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
      }`}
    >
      <span aria-hidden className="text-[19px] leading-none translate-y-[1px]" style={{ fontFamily: '"SG Asomtavruli", var(--font-serif-ge)' }}>Ⴞ</span>
    </button>
  );
};

export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, isAdmin, isTeacher } = useAuth();
  const { navigateTo, currentPage, openClass } = useNavigation();
  const memberOf = useMyClasses(user?.uid);
  // a teacher reaches their own classes' pages from the header too
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const myClasses = [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
  // private chats: one's own and, for admins, the administration's (messages page)
  const { threads } = useInbox(user?.uid, isAdmin);
  const { openModal } = useModal();
  const access = useAccess();
  // a member a superadmin has not let in (or not given these) sees no class or private chats; every other member
  // may at least write to the administration
  const showChats = !!user && access.can('messages');
  // the 💬 count: unread private chats and class chats with a message after I last read them (on any device)
  const lasts = useClassLasts(showChats && access.can('classes') ? myClasses.map(c => c.id) : []);
  const seen = useChatSeen(showChats ? user?.uid : null);
  const unread = user
    ? threads.filter(t => isUnread(t, user.uid)).length + myClasses.filter(c => isClassUnread(lasts[c.id], seen[c.id], user.uid)).length
    : 0;
  // kids' mode: no profile settings and no signing out (the teacher turns it off)
  const kids = Boolean(access.kids);
  // the learning tools the admin's switches and the kids' mode leave visible
  const tools = TOOLS.filter(t => access.section(t.id === 'gza' ? 'gza' : 'biblioteka') !== 'hidden');
  // the student's (or teacher's) class(es) sit between the path and the library
  const classes = access.can('classes') ? myClasses : [];
  const showNav = tools.length > 0 || classes.length > 0;
  const classButtons = classes.map((c, i) => (
    <React.Fragment key={c.id}>
      {(tools[0]?.id === 'gza' || i > 0) && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
      <button
        type="button"
        onClick={() => { triggerHaptic(10); openClass(c.id); }}
        className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 pl-1.5 pr-2 min-[400px]:pr-3 rounded-full text-[13px] font-bold ${currentPage === 'class' ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
        title={`${c.name} — კლასის გვერდი`}
        aria-label={`კლასი: ${c.name}`}
      >
        <ClassLogo name={c.name} logo={c.logo} className="w-7 h-7 text-xs" />
        <span>კლასი</span>
      </button>
    </React.Fragment>
  ));

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

        {/* independent work (icon + count) + profile (the admin panel opens from the profile; installing the app lives
            in the profile and on the offline page) */}
        <div className="order-2 lg:order-3 ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
          {/* the search sits beside the learning tools; with none of them shown, up here — and up here on a narrow
              phone (under 400px), where the three chips need the whole row */}
          {access.can('search') && <SearchButton className={showNav ? 'min-[400px]:hidden' : ''} />}
          {/* offline mode: the cloud shows whether the app works without internet */}
          <OfflineButton />
          {/* ხუცური: the whole site in the old script (nuskhuri text, asomtavruli headings) */}
          <KhutsuriButton />

          {user ? (
            <div className="flex items-center gap-1.5">
              {showChats && (
                <button
                  type="button"
                  onClick={() => navigateTo('messages')}
                  className={`relative w-9 lg:w-auto lg:px-3 lg:gap-1.5 h-9 rounded-full ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ${
                    currentPage === 'messages' || currentPage === 'dm'
                      ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]'
                      : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
                  }`}
                  title={unread ? `შეტყობინებები — ${unread} წაუკითხავი` : 'შეტყობინებები'}
                  aria-label={unread ? `შეტყობინებები, ${unread} წაუკითხავი` : 'შეტყობინებები'}
                >
                  <MessageCircle className="w-[18px] h-[18px]" />
                  <span className="hidden lg:inline text-[13px] font-bold">წერილები</span>
                  {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[#c62828] text-white text-[11px] font-black flex items-center justify-center leading-none ring-2 ring-[#fbf6ec]">
                      {unread}
                    </span>
                  )}
                </button>
              )}
              {kids && (
                <span className="inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shrink-0" title="საბავშვო რეჟიმი — მასწავლებელმა ჩართო">
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
              {/* signing out lives at the bottom of the profile page (ProfileActions), behind a question */}
            </div>
          ) : (
            <button
              onClick={openSignIn}
              disabled={signingIn}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[13px] font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4 hidden min-[400px]:block" />
              {signingIn ? 'შესვლა...' : 'შესვლა'}
            </button>
          )}
        </div>

        {/* learning tools: one group, full width on phones, centred on desktop; the search beside it */}
{showNav && (
        <nav className="order-3 lg:order-2 w-full lg:w-auto lg:mx-auto flex justify-center gap-1.5 sm:gap-2" aria-label="სასწავლო მასალა">
          <div className="flex-1 sm:flex-none flex items-stretch rounded-full bg-white/80 ring-1 ring-[#e8dcc8] p-0.5">
            {tools.map(({ id, page, label, Icon }, i) => (
              <React.Fragment key={id}>
                {/* the class(es) go in after the path, before the library */}
                {id === 'biblioteka' && classButtons}
                {(i > 0 || (id === 'biblioteka' && classes.length > 0)) && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
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
                  className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 px-2 min-[400px]:px-3 rounded-full text-[13px] font-bold ${currentPage === page ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
                  title={label}
                >
                  <Icon className="w-4 h-4 text-[#7a2028] shrink-0" />
                  <span>{label}</span>
                </button>
              </React.Fragment>
            ))}
            {!tools.some(t => t.id === 'biblioteka') && classButtons}
          </div>
          {access.can('search') && <SearchButton className="max-[399px]:hidden" />}
        </nav>
        )}
      </div>
    </header>
  );
};
