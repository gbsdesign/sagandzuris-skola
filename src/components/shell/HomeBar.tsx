import React from 'react';
import { Bell } from 'lucide-react';
import { useNavigation } from '../../context';
import { useMyNotices } from '../../hooks/useShellCounts';
import { triggerHaptic } from '../../utils/haptics';
import { RoundButton } from '../ui2';
import { useDesk } from './BottomNav';

// The home page's bar in the new look (redesign stage 2, the prototype `mtavari`): the school's logo and name, and the 🔔
// with the number of notices that came since I last looked; a tap opens the notices page. A computer (lg and up) has the
// top bar instead (BottomNav's DeskBar: the same logo, name and 🔔).

export const HomeBar: React.FC<{ logoUrl: string }> = ({ logoUrl }) => (useDesk() ? null : <HomeBarLive logoUrl={logoUrl} />);

const HomeBarLive: React.FC<{ logoUrl: string }> = ({ logoUrl }) => {
  const { navigateTo } = useNavigation();
  const { count } = useMyNotices();
  return <HomeBarView logoUrl={logoUrl} count={count} onBell={() => { triggerHaptic(10); navigateTo('notices'); }} />;
};

export const HomeBarView: React.FC<{ logoUrl: string; count: number; onBell: () => void }> = ({ logoUrl, count, onBell }) => (
  <header className="safe-top lg:hidden">
    <div className="mx-auto flex w-full max-w-4xl items-center gap-2.5 px-4 pt-3.5 pb-2.5">
      <img src={logoUrl} alt="საგანძურის სკოლის ლოგო" className="size-tap shrink-0 rounded-field bg-surf object-cover" referrerPolicy="no-referrer" />
      <div className="min-w-0 flex-1 truncate text-head font-bold tracking-tight">საგანძურის სკოლა</div>
      <RoundButton label="შეტყობინებები" badge={count} onClick={onBell}>
        <Bell strokeWidth={1.75} />
      </RoundButton>
    </div>
  </header>
);
