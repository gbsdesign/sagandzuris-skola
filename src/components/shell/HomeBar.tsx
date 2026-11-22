import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { useAuth, useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { useShownPhoto } from '../../hooks/useMyPhoto';
import { useMyNotices } from '../../hooks/useShellCounts';
import { openSignIn } from '../access/SignInPrompt';
import { triggerHaptic } from '../../utils/haptics';
import { setPendingQuery } from '../../utils/searchOpen';
import { RoundButton } from '../ui2';
import { useDesk } from './BottomNav';

// The home page's bar in the new look (redesign stage 2, the prototype `mtavari`): the school's logo, the sections' menu in
// place of its name 2026-11-21 → 2026-11-22 (now gone again: the name is back), a small 🔍 and the 👤 (the profile, with my photo) — both came up from
// the phone's bottom menu the same evening (the user: „პროფილის ღილაკი ზევით აიტანე … ლუპა დაპატარავე და ზევით აიტანე
// პროფილის გვერდით“) —, and the 🔔
// with the number of notices that came since I last looked; a tap opens the notices page. A computer (lg and up) has the
// top bar instead (BottomNav's DeskBar: the same logo, name and 🔔).

export const HomeBar: React.FC<{ logoUrl: string }> = ({ logoUrl }) => (useDesk() ? null : <HomeBarLive logoUrl={logoUrl} />);

const HomeBarLive: React.FC<{ logoUrl: string }> = ({ logoUrl }) => {
  const { navigateTo } = useNavigation();
  const { user } = useAuth();
  const access = useAccess();
  const photo = useShownPhoto(user?.uid, user?.photoURL);
  const { count } = useMyNotices();
  // as the bottom menu did: a guest is asked to sign in; a member not let in yet has no search; the kids' mode no profile
  const onSearch = !user || access.can('search') ? () => {
    triggerHaptic(10);
    if (!user) { openSignIn(); return; }
    setPendingQuery('');
    navigateTo('search');
  } : undefined;
  const onProfile = access.kids ? undefined : () => {
    triggerHaptic(10);
    if (!user) { openSignIn(); return; }
    navigateTo('profile');
    window.scrollTo({ top: 0 });
  };
  return (
    // „განყოფილებები“ left the bar on 2026-11-22 (the user: „მოხსენი“) — every section is a button on the home page now
    <HomeBarView logoUrl={logoUrl} count={count} onBell={() => { triggerHaptic(10); navigateTo('notices'); }}
      onSearch={onSearch} onProfile={onProfile} photo={photo} />
  );
};

export const HomeBarView: React.FC<{
  logoUrl: string; count: number; onBell: () => void; menu?: React.ReactNode;
  onSearch?: () => void; onProfile?: () => void; photo?: string;
}> = ({ logoUrl, count, onBell, menu, onSearch, onProfile, photo }) => (
  <header className="safe-top lg:hidden">
    <div className="relative mx-auto flex w-full max-w-4xl items-center gap-2 px-4 pt-3.5 pb-2.5 max-[389px]:gap-1.5 max-[389px]:px-3">
      <img src={logoUrl} alt="საგანძურის სკოლის ლოგო" className="size-tap shrink-0 rounded-field bg-surf object-cover max-[389px]:size-10" referrerPolicy="no-referrer" />
      {/* the 🔔 stands right by the logo, before the name (2026-11-22, the user's mark on the screenshot) */}
      <RoundButton label="შეტყობინებები" size={36} badge={count} onClick={onBell}>
        <Bell strokeWidth={1.75} />
      </RoundButton>
      {menu
        ? <div className="flex min-w-0 flex-1">{menu}</div>
        : <div className="min-w-0 flex-1 truncate text-head font-bold tracking-tight">საგანძურის სკოლა</div>}
      {/* 36px rounds (a 44px finger still hits them), so „განყოფილებები“ keeps its whole name on a phone */}
      {onSearch && (
        <RoundButton label="ძებნა" size={36} onClick={onSearch}>
          <Search strokeWidth={2} />
        </RoundButton>
      )}
      {onProfile && (
        <RoundButton label="პროფილი" size={36} onClick={onProfile} className="overflow-visible">
          {photo
            ? <img src={photo} alt="" aria-hidden="true" className="size-full rounded-full object-cover" referrerPolicy="no-referrer" />
            : <User strokeWidth={1.75} />}
        </RoundButton>
      )}
    </div>
  </header>
);
