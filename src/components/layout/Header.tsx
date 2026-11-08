import React, { useEffect, useState } from 'react';
import { useAuth, useNavigation, useModal } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { useAccess } from '../../hooks/useAccess';
import { askSignIn, openSignIn } from '../access/SignInPrompt';
import { SearchButton } from '../search/GlobalSearch';
import { useInbox, isUnread } from '../../hooks/useDirectChat';
import { useClassLasts, useChatSeen, isClassUnread } from '../../hooks/useClassChat';
import { User as UserIcon, LogIn, Compass, Library, Baby, MessageCircle } from 'lucide-react';
import { BellButton, BellPanel } from './Bell';
import { useBellState, useNotices } from '../../hooks/useNotices';
import { useOpenRequest } from '../../utils/searchOpen';
import { useShownPhoto } from '../../hooks/useMyPhoto';

interface HeaderProps {
  logoUrl: string;
}

// One row (2026-11-09, the user: „საგანძურის გზა გადაიტანე მაღლა … კლასი მრგვალად … საგანძურის გზაში“, answers „კომპასი და
// წარწერა გზა · ზედა რიგი მოიხსნას“): [logo] [🔔] [🧭 გზა] … [🔍] [📚] [💬] [👤]. The classes are a round button of the path now
// (PathOrbs „კლასი“), the prayer book a label on the home vine. 🔔 drops its list down under the header.
export const Header: React.FC<HeaderProps> = ({ logoUrl }) => {
  const { user, signingIn, isAdmin, isTeacher } = useAuth();
  // my own cut photo when kept, else the account's
  const photo = useShownPhoto(user?.uid, user?.photoURL);
  const { navigateTo, currentPage, openDm, mapItem, selectedClassId } = useNavigation();
  const memberOf = useMyClasses(user?.uid);
  // a teacher's own classes too (their chats' unread marks and notices)
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
  // the path's own switch (data/sections)
  const showPath = access.section('gza') !== 'hidden';
  const onPath = currentPage === 'gz';
  // the library's round 📚, back in the header right of the 🔍 (2026-11-09, the user: „ბიბლიოთეკის ნიშანი დააბრუნე უკან
  // ისევ ლუპის მარჯვნივ“); the path's „ბიბლიოთეკა“ button stays too
  const library = access.section('biblioteka');
  const onLibrary = currentPage === 'biblioteka' && !(mapItem ?? '').startsWith('prayers');

  // 🔔's list, under the header (the assignments' 📋 went into „საგანძურის გზა“ → „ნასწავლი“ on 2026-11-08, the classes'
  // „კლასი ▾“ into the path's „კლასი“ button on 2026-11-09)
  type Drop = 'bell';
  const [drop, setDrop] = useState<Drop | null>(null);
  const bell = useBellState(user?.uid);
  const allNotices = useNotices({ uid: user?.uid, chats: showChats, classes: access.can('classes') ? myClasses : [], threads });
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

  // the path is its own page; guests get the sign-in prompt from the modal layer
  const openPath = () => {
    triggerHaptic(10);
    if (!user) openModal('gza');
    else navigateTo('gz');
  };

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
          {/* „საგანძურის გზა“ — the compass and the word „გზა“ (the user's pick) */}
          {showPath && (
            <button
              type="button"
              onClick={openPath}
              aria-current={onPath ? 'page' : undefined}
              className={`h-9 pl-2.5 pr-3 rounded-full ring-1 inline-flex items-center gap-1.5 text-[13px] font-bold transition-all cursor-pointer active:scale-95 shrink-0 ${
                onPath
                  ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]'
                  : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#4a3426]'
              }`}
              title="საგანძურის გზა"
              aria-label="საგანძურის გზა"
            >
              <Compass className={`w-[18px] h-[18px] ${onPath ? '' : 'text-[#7a2028]'}`} />
              <span>გზა</span>
            </button>
          )}
        </div>

        {/* profile and the rest (the admin panel opens from the profile; installing the app lives in the profile and on
            the offline page) */}
        <div className="order-2 ml-auto flex items-center gap-1.5 min-w-0">
          {access.can('search') && <SearchButton />}
          {library !== 'hidden' && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                if (library === 'locked') askSignIn('ბიბლიოთეკა');
                else navigateTo('biblioteka');
              }}
              className={`w-9 h-9 shrink-0 rounded-full ring-1 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                onLibrary
                  ? 'bg-[#7a2028] ring-[#7a2028] text-[#fbf6ec]'
                  : 'bg-white/80 hover:bg-white ring-[#e8dcc8] hover:ring-[#7a2028]/40 text-[#7a2028]'
              }`}
              title="ბიბლიოთეკა"
              aria-label="ბიბლიოთეკა"
            >
              <Library className="w-[18px] h-[18px]" />
            </button>
          )}

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

      </div>

      {/* the open list, under the header: the whole width on a phone, beside the logo on a computer */}
      {drop && (
        <div className="absolute inset-x-0 top-full">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 pt-2">
            <div className={`sg-in w-full lg:w-[460px] max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain rounded-3xl bg-[#fffdf8] ring-1 ring-[#e8dcc8] shadow-[0_22px_48px_-20px_rgba(74,52,38,0.55)] px-4 min-[400px]:px-5 pb-4`}>
              <BellPanel
                  notices={notices}
                  seenBefore={seenBefore}
                  admin={isAdmin && user ? { uid: user.uid, name: user.displayName || '' } : undefined}
                  onOpenChat={chat => { setDrop(null); openDm(chat); }}
                  onHide={bell.hide}
                  onUnhide={bell.unhide}
                />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
