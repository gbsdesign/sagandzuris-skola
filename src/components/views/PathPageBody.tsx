import React from 'react';
import { useAccess } from '../../hooks/useAccess';
import { ChvevebiContent } from './ChvevebiPanel';
import { PATH_ORBS, PathOrbs } from './PathOrbs';
import { PathTabs } from './PathTabs';

/** The body of „საგანძურის გზა“ (page `gz`) — also a student's own page opened by their teacher (pages/StudentPage.tsx,
 *  inside ViewAsStudent, so every part reads that student's record). Every round button has its own switch (data/sections
 *  EXTRA_SWITCHES); the pearls and their chests live in „ნასწავლი“ since 2026-11-05. */
export const PathPageBody: React.FC = () => {
  const access = useAccess();
  const pathOrbs = PATH_ORBS.filter(o => access.on(o.id));
  const habitsOpen = access.section('chvevebi') === 'open';
  return (
    <div className="w-full max-w-2xl mx-auto mb-2 px-1 space-y-5">
      {/* „ჩემი დღე“: the page title sits in the top bar; the four round buttons (სამოსი, ნასწავლი — with the pearls, the
          chests and the teacher's assignments —, ოსტატობა, სამუშაო) in the member's order, the habits under them. The „დღეს“
          card on top was taken off at the user's wish (2026-11-05). */}
      <PathTabs
        orbs={pathOrbs.length ? { labels: pathOrbs, render: order => <PathOrbs order={order} /> } : undefined}
        cards={!habitsOpen ? [] : [
          {
            id: 'habits',
            label: 'ჩვევები',
            node: (
              <section id="path-habits" className="w-full scroll-mt-4 rounded-2xl bg-white ring-1 ring-[#2a2017]/[0.07] shadow-[0_1px_2px_rgba(42,32,23,0.05),0_10px_28px_-18px_rgba(42,32,23,0.35)] px-3 py-3.5 sm:p-4">
                <ChvevebiContent />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
};
