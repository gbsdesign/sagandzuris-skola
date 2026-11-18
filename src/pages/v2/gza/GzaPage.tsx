import React, { useEffect } from 'react';
import { useNavigation } from '../../../context';
import { Card, RoundButton, TopBar } from '../../../components/ui2';
import { MasteryContent } from '../../../components/mastery/MasteryContent';
import { usePanelWish } from '../../../components/views/IndependentWorkCard';
import { clearTried } from '../../../utils/samosiTry';
import { GzaList } from './GzaList';
import { SagandzuriPage } from './Sagandzuri';
import { SamosiPage } from './Samosi';
import { TsirvaScreen } from '../tsirva/TsirvaScreen';
import { screenOf } from '../chvevebi/nav';
import { Certificate, LevelsScreen, LEVELS_ITEM, certOf } from '../doneebi';
import { Route } from 'lucide-react';

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
  // the coming Sunday's Liturgy: what I know of it (AI step 3, board x-ai-tsirva)
  if (mapItem === 'tsirva') return <TsirvaScreen />;
  // the habits' screens (stage 4b): the day, the views, a habit, the changes, the vine
  if (screenOf(mapItem)) return <ChvevebiPage />;
  // several classes: their list as a page (x-klasebi, stage 4c)
  if (mapItem === 'klasebi') return <ClassesListScreen />;
  // „ოსტატობის გზა“'s levels and a level's certificate (stage doneebi)
  if (mapItem === LEVELS_ITEM) return <LevelsScreen />;
  if (certOf(mapItem) !== null) return <Certificate />;
  if (mapItem === 'ostatoba') {
    return (
      <div className="flex w-full flex-col gap-2 pb-4">
        <TopBar title="ოსტატობა" onBack={handleGoBack} right={
          <RoundButton label="ოსტატობის გზა" onClick={() => openMapItem(LEVELS_ITEM)}><Route strokeWidth={1.75} /></RoundButton>
        } />
        <Card pad="sm"><MasteryContent /></Card>
      </div>
    );
  }
  return <GzaList onOpen={item => openMapItem(item)} />;
};
