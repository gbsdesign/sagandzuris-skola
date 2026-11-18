import React, { useEffect } from 'react';
import { useNavigation } from '../../../context';
import { Card, TopBar } from '../../../components/ui2';
import { MasteryContent } from '../../../components/mastery/MasteryContent';
import { usePanelWish } from '../../../components/views/IndependentWorkCard';
import { clearTried } from '../../../utils/samosiTry';
import { GzaList } from './GzaList';
import { SagandzuriPage } from './Sagandzuri';
import { SamosiPage } from './Samosi';
import { screenOf } from '../chvevebi/nav';

const ChvevebiPage = React.lazy(() => import('../chvevebi/ChvevebiPage'));
const ClassesListScreen = React.lazy(() => import('../klasi/ClassesList').then(m => ({ default: m.ClassesListScreen })));

// Page `gz` in the new look: the list (x-gza) and the path's own pages, each a step of its own in history by the
// navigation's `mapItem` — `sagandzuri` (x-sagandzuri), `samosi` (x-samosi), `chvevebi…` (the habits, `../chvevebi`) and `ostatoba` (the old „ოსტატობა“, which the old „საგანძური“ card held at its bottom).

export type GzaItem = 'sagandzuri' | 'samosi' | 'chvevebi' | 'ostatoba';

export const GzaPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  // the parts only tried on come off once the path page is left (as the old page did)
  useEffect(() => () => clearTried(), []);
  // other places ask for a part of the path (openPathPanel: the vine's „ჩვევები“, a home button, a game)
  usePanelWish(['learn', 'manera', 'work'], id => openMapItem(id === 'work' ? 'chvevebi' : id === 'manera' ? 'ostatoba' : 'sagandzuri'));

  if (mapItem === 'sagandzuri') return <SagandzuriPage onBack={handleGoBack} onMastery={() => openMapItem('ostatoba')} />;
  if (mapItem === 'samosi') return <SamosiPage onBack={handleGoBack} />;
  // the habits' screens (stage 4b): the day, the views, a habit, the changes, the vine
  if (screenOf(mapItem)) return <ChvevebiPage />;
  // several classes: their list as a page (x-klasebi, stage 4c)
  if (mapItem === 'klasebi') return <ClassesListScreen />;
  if (mapItem === 'ostatoba') {
    return (
      <div className="flex w-full flex-col gap-2 pb-4">
        <TopBar title="ოსტატობა" onBack={handleGoBack} />
        <Card pad="sm"><MasteryContent /></Card>
      </div>
    );
  }
  return <GzaList onOpen={item => openMapItem(item)} />;
};
