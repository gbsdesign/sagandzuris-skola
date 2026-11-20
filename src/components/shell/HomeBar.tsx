import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigation } from '../../context';
import { useMyNotices } from '../../hooks/useShellCounts';
import { triggerHaptic } from '../../utils/haptics';
import { RoundButton } from '../ui2';
import { useDesk } from './BottomNav';
import { SectionsMenu } from './SectionsMenu';
import { Toast } from '../ui/Toast';

// The home page's bar in the new look (redesign stage 2, the prototype `mtavari`): the school's logo, the sections' menu in
// place of its name since 2026-11-21 (SectionsMenu), and the 🔔
// with the number of notices that came since I last looked; a tap opens the notices page. A computer (lg and up) has the
// top bar instead (BottomNav's DeskBar: the same logo, name and 🔔).

export const HomeBar: React.FC<{ logoUrl: string }> = ({ logoUrl }) => (useDesk() ? null : <HomeBarLive logoUrl={logoUrl} />);

const HomeBarLive: React.FC<{ logoUrl: string }> = ({ logoUrl }) => {
  const { navigateTo } = useNavigation();
  const { count } = useMyNotices();
  const [soon, setSoon] = useState<string | null>(null);
  return (
    <>
      <HomeBarView logoUrl={logoUrl} count={count} onBell={() => { triggerHaptic(10); navigateTo('notices'); }}
        menu={<SectionsMenu onSoon={setSoon} />} />
      <Toast message={soon || ''} type="info" isVisible={!!soon} onClose={() => setSoon(null)} />
    </>
  );
};

export const HomeBarView: React.FC<{ logoUrl: string; count: number; onBell: () => void; menu?: React.ReactNode }> = ({ logoUrl, count, onBell, menu }) => (
  <header className="safe-top lg:hidden">
    <div className="relative mx-auto flex w-full max-w-4xl items-center gap-2.5 px-4 pt-3.5 pb-2.5">
      <img src={logoUrl} alt="საგანძურის სკოლის ლოგო" className="size-tap shrink-0 rounded-field bg-surf object-cover" referrerPolicy="no-referrer" />
      {menu
        ? <div className="flex min-w-0 flex-1">{menu}</div>
        : <div className="min-w-0 flex-1 truncate text-head font-bold tracking-tight">საგანძურის სკოლა</div>}
      <RoundButton label="შეტყობინებები" badge={count} onClick={onBell}>
        <Bell strokeWidth={1.75} />
      </RoundButton>
    </div>
  </header>
);
