import React, { useEffect, useState } from 'react';
import { Bell, Compass, Home, MessageCircle, Search, User } from 'lucide-react';
import { useAuth, useModal, useNavigation, type PageType } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useMyNotices, useUnreadParts } from '../../hooks/useShellCounts';
import { useMyTeacherChat } from '../../hooks/useMyTeacherChat';
import { openSignIn } from '../access/SignInPrompt';
import { triggerHaptic } from '../../utils/haptics';
import { setPendingQuery } from '../../utils/searchOpen';
import { cx, Counter, FOCUS, RoundButton } from '../ui2';
import { tabOf, type Tab } from './tabs';

// The new look's bottom menu (redesign stage 2, the prototypes' `nav`): a floating white pill of four places — მთავარი ·
// გზა · წერილები · პროფილი — and the round wine 🔍 beside it, in reach of the thumb on every page that has it. A guest's
// tap on a place that needs signing in asks to sign in; a tap on the place one is on goes back to its top.
// On a computer (lg and up, boards x-desk-sia · x-desk-klasi) the same four places stand in a bar across the top instead —
// the school's logo and name, the tabs, the field „რას ეძებ?“ and the 🔔 (DeskBar; App.tsx puts it over every page).

const ITEMS: { id: Tab; label: string; icon: React.ReactNode; page: PageType }[] = [
  { id: 'home', label: 'მთავარი', icon: <Home />, page: 'home' },
  { id: 'gz', label: 'გზა', icon: <Compass />, page: 'gz' },
  { id: 'messages', label: 'წერილები', icon: <MessageCircle />, page: 'messages' },
  { id: 'profile', label: 'პროფილი', icon: <User />, page: 'profile' },
];

export { ITEMS as NAV_ITEMS };

/** the menu's places and what a tap does, one for the bottom pill and the computer's top bar */
const useNavPlaces = () => {
  const { user } = useAuth();
  const { currentPage, mapItem, navigateTo, openDm } = useNavigation();
  const { openModal } = useModal();
  const access = useAccess();
  const parts = useUnreadParts();
  const unread = parts.total;
  const teacherChat = useMyTeacherChat();
  const on = tabOf(currentPage, mapItem);
  const kids = Boolean(access.kids);

  const shown = ITEMS.filter(it =>
    it.id === 'gz' ? access.section('gza') !== 'hidden'
    : it.id === 'messages' ? !user || access.can('messages')
    // the kids' mode has no profile (the teacher turns it off)
    : it.id === 'profile' ? !kids
    : true);
  // guests are asked to sign in; a member a superadmin has not let in yet has no search
  const search = !user || access.can('search');

  const go = (it: (typeof ITEMS)[number]) => {
    triggerHaptic(10);
    if (!user && it.id === 'gz') { openModal('gza'); return; }
    if (!user && it.id !== 'home') { openSignIn(); return; }
    if (it.page === currentPage && !mapItem) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    // a student with one teacher: „წერილები“ opens the teacher's chat (the list is one „უკან“ away); not while another chat
    // waits unread, and not from inside the letters already (a second tap there keeps the list)
    const waiting = teacherChat ? parts.total - (parts.threads.includes(teacherChat.id) ? 1 : 0) : 0;
    if (it.id === 'messages' && teacherChat && waiting === 0 && on !== 'messages') {
      navigateTo('messages');
      window.scrollTo({ top: 0 });
      teacherChat.open().then(id => openDm(id)).catch(e => console.warn('teacher chat: ', e?.code || e));
      return;
    }
    navigateTo(it.page);
    window.scrollTo({ top: 0 });
  };
  const find = (query = '') => {
    triggerHaptic(10);
    if (!user) { openSignIn(); return; }
    // a fresh search starts empty („უკან“ from a result keeps its words — utils/searchOpen); the computer's field gives its words
    setPendingQuery(query);
    navigateTo('search');
  };

  return { shown, on, unread, go, find: search ? find : undefined, page: currentPage };
};

export const BottomNav: React.FC = () => {
  const { shown, on, unread, go, find } = useNavPlaces();
  // the app's icon shows how many chats wait (stage 4e; the Badging API — installed apps on Android, iPhone and computers)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (!nav.setAppBadge) return;
    void (unread > 0 ? nav.setAppBadge(unread) : nav.clearAppBadge?.())?.catch(() => { /* not allowed here */ });
  }, [unread]);
  return <BottomNavView items={shown} active={on} unread={unread} onGo={go} onSearch={find ? () => find() : undefined} />;
};

// a computer's width (Tailwind's lg): the top bar shows instead of the bottom pill and the home page's own bar
const DESK = '(min-width: 1024px)';
const deskNow = () => typeof window !== 'undefined' && !!window.matchMedia?.(DESK).matches;
/** true on a computer's width (lg and up), live */
export const useDesk = () => {
  const [desk, setDesk] = useState(deskNow);
  useEffect(() => {
    const mq = window.matchMedia?.(DESK);
    if (!mq) return;
    const change = () => setDesk(mq.matches);
    change();
    mq.addEventListener?.('change', change);
    return () => mq.removeEventListener?.('change', change);
  }, []);
  return desk;
};

/** The computer's bar over every page (lg and up; phones keep the bottom pill): logo and name, the four places, the field
 *  „რას ეძებ?“ (Enter opens the search page with the words) and the 🔔 of the home page's bar. Mounted only on a computer's
 *  width, so a phone keeps no listeners for it. */
export const DeskBar: React.FC<{ logoUrl: string }> = ({ logoUrl }) => (useDesk() ? <DeskBarLive logoUrl={logoUrl} /> : null);

const DeskBarLive: React.FC<{ logoUrl: string }> = ({ logoUrl }) => {
  const { shown, on, unread, go, find, page } = useNavPlaces();
  const { navigateTo } = useNavigation();
  const { count } = useMyNotices();
  return (
    <DeskBarView logoUrl={logoUrl} items={shown} active={on} unread={unread} onGo={go}
      onSearch={find && page !== 'search' ? find : undefined}
      bell={count} onBell={() => { triggerHaptic(10); navigateTo('notices'); }} />
  );
};

type Item = (typeof ITEMS)[number];

/** The computer's top bar itself, from what is given (so it can be looked at without the database). */
export const DeskBarView: React.FC<{
  logoUrl: string; items: Item[]; active: Tab; unread: number; onGo: (it: Item) => void;
  onSearch?: (query: string) => void; bell: number | null; onBell: () => void;
}> = ({ logoUrl, items, active: on, unread, onGo: go, onSearch, bell, onBell }) => {
  const [query, setQuery] = useState('');
  return (
    <header className="sg-desk hidden border-b border-line bg-surf lg:block">
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center gap-3 px-6">
        <img src={logoUrl} alt="საგანძურის სკოლის ლოგო" className="size-tap shrink-0 rounded-field bg-surf object-cover" referrerPolicy="no-referrer" />
        <span className="mr-3 shrink-0 text-head font-bold tracking-tight whitespace-nowrap">საგანძურის სკოლა</span>
        <nav aria-label="მთავარი მენიუ" className="flex min-w-0 flex-1 items-center gap-1">
          {items.map(it => {
            const active = it.id === on;
            const badge = it.id === 'messages' ? unread : 0;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => go(it)}
                aria-current={active ? 'page' : undefined}
                aria-label={badge ? `${it.label}, ${badge} წაუკითხავი` : it.label}
                className={cx(
                  'flex h-tap shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-body whitespace-nowrap transition active:scale-95',
                  '[&_svg]:size-[18px] [&_svg]:shrink-0',
                  active ? 'bg-tint font-bold text-wine [&_svg]:stroke-2' : 'font-semibold text-mut hover:bg-soft [&_svg]:stroke-[1.75]',
                  FOCUS,
                )}
              >
                {it.icon}
                {it.label}
                {!!badge && <Counter n={badge} />}
              </button>
            );
          })}
        </nav>
        {onSearch && (
          <form role="search" className="relative w-[280px] shrink-0" onSubmit={e => { e.preventDefault(); onSearch(query.trim()); setQuery(''); }}>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-mut" strokeWidth={1.75} />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="რას ეძებ?"
              aria-label="ძებნა"
              className="h-tap w-full rounded-full bg-page pr-4 pl-11 text-body text-ink placeholder:text-faint focus:ring-2 focus:ring-wine/35 focus:outline-none"
            />
          </form>
        )}
        {bell !== null && (
          <RoundButton label="შეტყობინებები" badge={bell} tone="page" onClick={onBell}>
            <Bell strokeWidth={1.75} />
          </RoundButton>
        )}
      </div>
    </header>
  );
};

/** The menu itself, from what is given (so it can be looked at without the database). */
export const BottomNavView: React.FC<{
  items: Item[]; active: Tab; unread: number; onGo: (it: Item) => void; onSearch?: () => void;
}> = ({ items: shown, active: on, unread, onGo: go, onSearch: find }) => {
  const search = !!find;
  return (
    <div className="sg-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 safe-x lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <nav aria-label="მთავარი მენიუ" className="pointer-events-auto flex h-16 min-w-0 flex-1 rounded-full bg-surf/95 px-1 py-1.5 shadow-float backdrop-blur-lg">
          {shown.map(it => {
            const active = it.id === on;
            const badge = it.id === 'messages' ? unread : 0;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => go(it)}
                aria-current={active ? 'page' : undefined}
                aria-label={badge ? `${it.label}, ${badge} წაუკითხავი` : it.label}
                className={cx(
                  'relative flex h-13 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full transition active:scale-95',
                  '[&_svg]:size-[21px] [&_svg]:shrink-0',
                  active ? 'bg-tint text-wine [&_svg]:stroke-2' : 'text-mut [&_svg]:stroke-[1.75]',
                  FOCUS,
                )}
              >
                {it.icon}
                <span className={cx('max-w-full truncate px-0.5 text-cap tracking-tight', active ? 'font-bold' : 'font-medium')}>{it.label}</span>
                {!!badge && <Counter n={badge} className="absolute top-0 right-[calc(50%-26px)]" />}
              </button>
            );
          })}
        </nav>
        {search && (
          <button
            type="button"
            onClick={find}
            aria-label="ძებნა"
            title="ძებნა"
            className={cx('pointer-events-auto flex size-15 shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white shadow-wine transition active:scale-95 active:bg-wine-deep', FOCUS)}
          >
            <Search className="size-6" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
};
