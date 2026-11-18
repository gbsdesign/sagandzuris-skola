import React from 'react';
import { Compass, Home, MessageCircle, Search, User } from 'lucide-react';
import { useAuth, useModal, useNavigation, type PageType } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useUnreadChats } from '../../hooks/useShellCounts';
import { openSignIn } from '../access/SignInPrompt';
import { triggerHaptic } from '../../utils/haptics';
import { setPendingQuery } from '../../utils/searchOpen';
import { cx, Counter, FOCUS } from '../ui2';
import { tabOf, type Tab } from './tabs';

// The new look's bottom menu (redesign stage 2, the prototypes' `nav`): a floating white pill of four places — მთავარი ·
// გზა · წერილები · პროფილი — and the round wine 🔍 beside it, in reach of the thumb on every page that has it. A guest's
// tap on a place that needs signing in asks to sign in; a tap on the place one is on goes back to its top.

const ITEMS: { id: Tab; label: string; icon: React.ReactNode; page: PageType }[] = [
  { id: 'home', label: 'მთავარი', icon: <Home />, page: 'home' },
  { id: 'gz', label: 'გზა', icon: <Compass />, page: 'gz' },
  { id: 'messages', label: 'წერილები', icon: <MessageCircle />, page: 'messages' },
  { id: 'profile', label: 'პროფილი', icon: <User />, page: 'profile' },
];

export { ITEMS as NAV_ITEMS };

export const BottomNav: React.FC = () => {
  const { user } = useAuth();
  const { currentPage, mapItem, navigateTo } = useNavigation();
  const { openModal } = useModal();
  const access = useAccess();
  const unread = useUnreadChats();
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
    navigateTo(it.page);
    window.scrollTo({ top: 0 });
  };
  const find = () => {
    triggerHaptic(10);
    if (!user) { openSignIn(); return; }
    // a fresh search starts empty („უკან“ from a result keeps its words — utils/searchOpen)
    setPendingQuery('');
    navigateTo('search');
  };

  return <BottomNavView items={shown} active={on} unread={unread} onGo={go} onSearch={search ? find : undefined} />;
};

type Item = (typeof ITEMS)[number];

/** The menu itself, from what is given (so it can be looked at without the database). */
export const BottomNavView: React.FC<{
  items: Item[]; active: Tab; unread: number; onGo: (it: Item) => void; onSearch?: () => void;
}> = ({ items: shown, active: on, unread, onGo: go, onSearch: find }) => {
  const search = !!find;
  return (
    <div className="sg-nav pointer-events-none fixed inset-x-0 bottom-0 z-40 safe-x">
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
