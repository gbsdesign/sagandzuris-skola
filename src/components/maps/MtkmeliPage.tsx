import React, { Suspense, lazy, useState } from 'react';
import { Feather, Loader2, Video } from 'lucide-react';
import { useNavigation } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { Tabs } from '../ui/kit';
import { MtkmeliMap } from './MtkmeliMap';

const VideosPage = lazy(() => import('../../pages/VideosPage').then(m => ({ default: m.VideosPage })));

// „ვიდეოები“ live on „მთქმელი“'s page since 2026-11-08 (the user: „ვიდეოების ინტეგრაცია მოახდინე მთქმელში როგორც საკრავების
// მოხდა სიმღერებში … მთქმელი ეწერება მარტო მთავარზე და ვიდეოების ღილაკი მოიხსნება“): two tabs on top, as on the songs' page;
// the vine's label stays „მთქმელი“. The old page `videos` (a home button, the churches' TV reports, old history steps)
// opens this page on the videos' tab (`startTab`). The chosen tab is kept for the visit.
export type MtkmeliTab = 'mtkmeli' | 'videos';
const TAB_KEY = 'sg-mtkmeli-tab';
const readTab = (): MtkmeliTab => {
  try { return sessionStorage.getItem(TAB_KEY) === 'videos' ? 'videos' : 'mtkmeli'; } catch { return 'mtkmeli'; }
};
const keepTab = (t: MtkmeliTab) => { try { sessionStorage.setItem(TAB_KEY, t); } catch { /* private mode */ } };

interface MtkmeliPageProps {
  startTab?: MtkmeliTab;
  selectedChantVariants?: Record<string, any>;
  onTogglePoem?: (poemId: string, poemTitle: string, author: string, regionCode: string, regionName: string) => void;
}

export const MtkmeliPage: React.FC<MtkmeliPageProps> = ({ startTab, selectedChantVariants, onTogglePoem }) => {
  const access = useAccess();
  // each part follows its own switch (the admin's, the kids' mode, a member's rights): with one of them closed, no tabs
  const withPoets = access.section('mtkmeli') === 'open';
  const withVideos = access.section('videoebi') === 'open';
  const [tab, setTab] = useState<MtkmeliTab>(() => {
    if (startTab) keepTab(startTab);
    return startTab ?? readTab();
  });
  const chooseTab = (t: MtkmeliTab) => { setTab(t); keepTab(t); };
  const shown: MtkmeliTab = !withVideos ? 'mtkmeli' : !withPoets ? 'videos' : tab;
  // the tabs stand only over the two first screens: inside a region or a list the bar's „უკან“ leads back
  const { mapItem } = useNavigation();

  return (
    <div className="w-full flex flex-col gap-3">
      {!mapItem && withPoets && withVideos && (
        <Tabs<MtkmeliTab>
          cols={2}
          value={shown}
          onChange={chooseTab}
          items={[
            { id: 'mtkmeli', label: 'მთქმელი', Icon: Feather },
            { id: 'videos', label: 'ვიდეოები', Icon: Video },
          ]}
        />
      )}
      {shown === 'videos' ? (
        <Suspense fallback={<div className="w-full py-24 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#7a2028]" /></div>}>
          <VideosPage />
        </Suspense>
      ) : (
        <MtkmeliMap selectedChantVariants={selectedChantVariants} onTogglePoem={onTogglePoem} />
      )}
    </div>
  );
};
