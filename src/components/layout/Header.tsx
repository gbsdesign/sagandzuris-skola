import React, { useEffect, useState } from 'react';
import { useAuth, useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { useMyClasses, useTeachingClasses, type SchoolClass } from '../../hooks/useClasses';
import { ClassLogo } from '../classes/ClassLogo';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn, openSignIn } from '../access/SignInPrompt';
import { SearchButton } from '../search/GlobalSearch';
import { useInbox, isUnread } from '../../hooks/useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread } from '../../hooks/useClassChat';
import { User as UserIcon, LogIn, Compass, Baby, MessageCircle, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { BellButton, BellPanel } from './Bell';
import { useBellState, useNotices } from '../../hooks/useNotices';
import { useOpenRequest } from '../../utils/searchOpen';
import { useShownPhoto } from '../../hooks/useMyPhoto';

/** The header's list of my classes, when there are several (2026-11-07, the user's pick „ერთი „კლასი ▾““: three „კლასი“
 *  chips no longer fit a phone's row and pushed the page sideways). A row a class, the open one marked. */
const ClassesPanel: React.FC<{ classes: SchoolClass[]; current: string | null; onOpen: (id: string) => void }> = ({ classes, current, onOpen }) => (
  <section aria-label="ჩემი კლასები">
    <h2 className="min-h-12 flex items-center gap-2">
      <Users className="w-5 h-5 shrink-0 text-[#7a2028]" />
      <span className="font-serif-ge text-lg font-bold text-[#4a3426] truncate">ჩემი კლასები</span>
      <span className="text-sm font-bold text-[#a4927c] tabular-nums">{classes.length}</span>
    </h2>
    <ul className="space-y-2">
      {classes.map(c => {
        const here = c.id === current;
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              aria-current={here ? 'page' : undefined}
              className={`w-full min-h-14 flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-2xl text-left ring-1 transition-colors cursor-pointer active:scale-[0.99] ${
                here ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/30' : 'bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40'
              }`}
            >
              <ClassLogo name={c.name} logo={c.logo} className="w-10 h-10 shrink-0 text-sm" />
              <span className={`min-w-0 flex-1 text-[15px] font-bold leading-snug line-clamp-2 ${here ? 'text-[#7a2028]' : 'text-[#4a3426]'}`}>{c.name}</span>
              <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a594]" />
            </button>
          </li>
        );
      })}
    </ul>
  </section>
);

interface HeaderProps {
  logoUrl: string;
}

// the prayer book's mark: the library shelf's Bolnisi cross (pages/library/Shelf.tsx), in the text's colour
const PrayerCross: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden fill="currentColor">
    {[0, 90, 180, 270].map(a => <path key={a} d="M43 50 L57 50 L66 10 Q50 20 34 10 Z" transform={`rotate(${a} 50 50)`} />)}
    <circle cx="50" cy="50" r="8" />
  </svg>
);

// learning tools: the path (skills and manner open from inside it) and, since 2026-11-06, the prayer book in the
// library's place (the user: „ბიბლიოთეკის ადგილზე იხსნებოდეს ლოცვანი“) — the library itself is a round button before
// the search. The prayer book is the library's, so the library's switch and sign-in hold for both.
const TOOLS = [
  { id: 'gza', page: 'gz', label: 'საგანძურის გზა', Icon: Compass },
  { id: 'lotsvani', page: 'biblioteka', label: 'ლოცვანი', Icon: PrayerCross },
] as const;

// Phone: [logo] [📋] [🔔] … [📚] [🔍] [☁] [💬] [👤] / the learning tools below. Desktop (lg): one row — logo + name, 📋, 🔔 ·
// the tools in the middle with 📚 and 🔍 · the rest. 📋 and 🔔 drop their lists down under the header (2026-11-06, the
// user: „დავალების ღილაკიც მაღლა აიტანე საგანძურის ლოგოს მარჯვნივ და აქვე იყოს შეტყობინებების ღილაკი … ჩამოსაშლელი იყოს“).
export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, isAdmin, isTeacher } = useAuth();
  // my own cut photo when kept, else the account's
  const photo = useShownPhoto(user?.uid, user?.photoURL);
  const { navigateTo, currentPage, openClass, openDm, mapItem, openMapItem, selectedClassId } = useNavigation();
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
  // the library's switch (the admin's, the kids' mode) holds for the library's button and the prayer book alike
  const library = access.section('biblioteka');
  // the prayer book's chip left the header on 2026-11-09 — it is a big label on the home vine now (GrapeNav)
  const tools = TOOLS.filter(t => t.id !== 'lotsvani' && access.section(t.id === 'gza' ? 'gza' : 'biblioteka') !== 'hidden');
  // the student's (or teacher's) class(es) sit between the path and the prayer book
  const classes = access.can('classes') ? myClasses : [];
  const showNav = tools.length > 0 || classes.length > 0;
  const onPrayers = currentPage === 'biblioteka' && (mapItem ?? '').startsWith('prayers');

  // 🔔 and (with several classes) „კლასი ▾“: one list open at a time, under the header (the assignments' 📋 went into
  // „საგანძურის გზა“ → „ნასწავლი“ on 2026-11-08, the user: „დავალების ღილაკი მოიხსნას“)
  type Drop = 'bell' | 'classes';
  const [drop, setDrop] = useState<Drop | null>(null);
  const bell = useBellState(user?.uid);
  const allNotices = useNotices({ uid: user?.uid, chats: showChats, classes: access.can('classes') ? classes : [], threads });
  // what I swiped aside stays away (on every device of mine)
  const notices = allNotices.filter(n => !bell.hidden.has(n.id));
  // what was new at this look stays marked while the list is open
  const [seenBefore, setSeenBefore] = useState(0);
  const monthAgo = Date.now() - 30 * 86_400_000;
  const bellCount = notices.filter(n => n.at > bell.seen && n.at > monthAgo).length;
  const toggle = (which: Drop) => {
    if (drop === which) { setDrop(null); return; }
    if (which === 'bell') {
      setSeenBefore(bell.seen);
      bell.markSeen(Math.max(Date.now(), ...notices.map(n => n.at)));
    }
    setDrop(which);
  };
  // going anywhere (an assignment's notes, a chat) closes the list
  useEffect(() => { setDrop(null); }, [currentPage, mapItem, selectedClassId]);
  // a tap on an admin's notice on the phone (`/?open=bell`) opens the list (after the page it may have changed to)
  const openBell = React.useRef(() => {});
  openBell.current = () => { if (drop !== 'bell') toggle('bell'); };
  useOpenRequest('bell', () => { window.setTimeout(() => openBell.current(), 0); });

  const openTool = (id: typeof TOOLS[number]['id']) => {
    triggerHaptic(10);
    // the path is its own page; guests still get the sign-in prompt from the modal layer
    if (id === 'gza') {
      if (!user) openModal('gza');
      else navigateTo('gz');
    }
    // guests see the prayer book's button, but need to sign in to open it
    else if (library === 'locked') askSignIn('ლოცვანი');
    // the library's page opened on its prayer book in one step, so „back“ goes where one came from
    else {
      navigateTo('biblioteka');
      openMapItem('prayers');
    }
  };
  // the library's round 📚 left the header on 2026-11-09 (the user: „ბიბლიოთეკის ღილაკი აქ ჩამოიტანე“): it is a round
  // button of „საგანძურის გზა“ now (PathOrbs, „ბიბლიოთეკა“), with how many of its books are read

  // one class: its chip (with its logo) opens it; several: one „კლასი ▾“ drops the list of them (ClassesPanel)
  const classChip = `flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 pl-1.5 pr-2 min-[400px]:pr-3 rounded-full text-[13px] font-bold ${currentPage === 'class' ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`;
  const classButtons = classes.length > 0 && (
    <>
      {tools[0]?.id === 'gza' && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
      {classes.length === 1 ? (
        <button
          type="button"
          onClick={() => { triggerHaptic(10); openClass(classes[0].id); }}
          className={classChip}
          title={`${classes[0].name} — კლასის გვერდი`}
          aria-label={`კლასი: ${classes[0].name}`}
        >
          <ClassLogo name={classes[0].name} logo={classes[0].logo} className="w-7 h-7 shrink-0 text-xs" />
          <span>კლასი</span>
        </button>
      ) : (
        // (the classes' logos are in the list; here the row's own look — an icon, the word and ▾ — so the three chips
        // still fit a 360px phone, the icon going away under 380px like the others')
        <button
          type="button"
          onClick={() => { triggerHaptic(10); toggle('classes'); }}
          aria-expanded={drop === 'classes'}
          className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 px-2 rounded-full text-[13px] font-bold ${currentPage === 'class' || drop === 'classes' ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
          title="ჩემი კლასები"
          aria-label={`ჩემი კლასები: ${classes.length}`}
        >
          <Users className="w-4 h-4 text-[#7a2028] shrink-0 max-[379px]:hidden" />
          <span>კლასი</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 -ml-0.5 transition-transform ${drop === 'classes' ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  );

  return (
    <header className="relative z-50 safe-bleed safe-top bg-[#fbf6ec] border-b border-[#e8dcc8]">
      {/* an open list: a tap anywhere else closes it (the header's own buttons stay above this) */}
      {drop && <div aria-hidden className="fixed inset-0 bg-[#2a2017]/15 sg-in" onClick={() => setDrop(null)} />}

      <div className="relative max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-wrap lg:flex-nowrap items-center gap-2">
        {/* logo (+ name from md up), then 📋 and 🔔 */}
        <div className="order-1 flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 p-0.5 md:p-1 md:pr-2 rounded-2xl hover:bg-[#7a2028]/5 transition-all cursor-pointer text-left shrink-0 active:scale-95"
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
          <BellButton count={bellCount} open={drop === 'bell'} onToggle={() => toggle('bell')} />
        </div>

        {/* profile and the rest (the admin panel opens from the profile; installing the app lives in the profile and on
            the offline page) */}
        <div className="order-2 lg:order-3 ml-auto flex items-center gap-1.5 min-w-0">
          {/* 🔍 sits beside the learning tools from sm up; with none of them shown, up here — and up here on every
              phone (under sm), where the three chips need the whole row (2026-10-31) */}
          {access.can('search') && <SearchButton className={showNav ? 'sm:hidden' : ''} />}

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
                  title={unread ? `წერილები — ${unread} წაუკითხავი` : 'წერილები'}
                  aria-label={unread ? `წერილები, ${unread} წაუკითხავი` : 'წერილები'}
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
                // a phone keeps only the child's face: the row is full
                <span className="inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold shrink-0" title="საბავშვო რეჟიმი — მასწავლებელმა ჩართო" aria-label="საბავშვო რეჟიმი">
                  <Baby className="w-3.5 h-3.5" /> <span className="max-sm:hidden">საბავშვო</span>
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
                {photo ? (
                  <img
                    src={photo}
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

        {/* learning tools: one group, full width on phones, centred on desktop; 🔍 beside it */}
        {showNav && (
        <nav className="order-3 lg:order-2 w-full lg:w-auto lg:mx-auto flex justify-center gap-1.5 sm:gap-2" aria-label="სასწავლო მასალა">
          <div className="flex-1 sm:flex-none flex items-stretch rounded-full bg-white/80 ring-1 ring-[#e8dcc8] p-0.5">
            {tools.map(({ id, page, label, Icon }, i) => {
              const here = id === 'lotsvani' ? onPrayers : currentPage === page;
              return (
                <React.Fragment key={id}>
                  {/* the class(es) go in after the path, before the prayer book */}
                  {id === 'lotsvani' && classButtons}
                  {(i > 0 || (id === 'lotsvani' && classes.length > 0)) && <span aria-hidden className="w-px my-1.5 bg-[#e8dcc8] shrink-0" />}
                  <button
                    type="button"
                    onClick={() => openTool(id)}
                    className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 px-2 min-[400px]:px-3 rounded-full text-[13px] font-bold ${here ? 'bg-[#7a2028]/10 text-[#7a2028]' : 'text-[#4a3426]'} hover:bg-[#7a2028]/5 hover:text-[#7a2028] transition-colors cursor-pointer select-none whitespace-nowrap active:scale-95`}
                    title={label}
                  >
                    {/* on the narrowest phones (under 380px) only the words, so the row still fits the screen */}
                    <Icon className="w-4 h-4 text-[#7a2028] shrink-0 max-[379px]:hidden" />
                    <span>{label}</span>
                  </button>
                </React.Fragment>
              );
            })}
            {!tools.some(t => t.id === 'lotsvani') && classButtons}
          </div>
          {access.can('search') && <SearchButton className="max-sm:hidden self-center" />}
        </nav>
        )}
      </div>

      {/* the open list, under the header: the whole width on a phone, beside the logo on a computer */}
      {drop && (
        <div className="absolute inset-x-0 top-full">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-2">
            <div className={`sg-in w-full ${drop === 'classes' ? 'lg:w-[380px] lg:mx-auto' : 'lg:w-[460px]'} max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain rounded-3xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] shadow-[0_22px_48px_-20px_rgba(74,52,38,0.55)] px-4 min-[400px]:px-5 pb-4`}>
              {drop === 'classes' ? (
                <ClassesPanel
                  classes={classes}
                  current={currentPage === 'class' ? selectedClassId : null}
                  onOpen={id => { triggerHaptic(10); setDrop(null); openClass(id); }}
                />
              ) : (
                <BellPanel
                  notices={notices}
                  seenBefore={seenBefore}
                  admin={isAdmin && user ? { uid: user.uid, name: user.displayName || '' } : undefined}
                  onOpenChat={chat => { setDrop(null); openDm(chat); }}
                  onHide={bell.hide}
                  onUnhide={bell.unhide}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
