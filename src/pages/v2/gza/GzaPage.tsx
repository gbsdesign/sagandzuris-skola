import React, { useEffect } from 'react';
import { useNavigation } from '../../../context';
import { usePanelWish } from '../../../components/views/IndependentWorkCard';
import { clearTried } from '../../../utils/samosiTry';
import { GzaList } from './GzaList';
import { SagandzuriPage } from './Sagandzuri';
import { SamosiPage } from './Samosi';
import { TsirvaScreen } from '../tsirva/TsirvaScreen';
import { screenOf } from '../chvevebi/nav';
import { Certificate, LevelsScreen, LEVELS_ITEM, certOf } from '../doneebi';
import { EXTRA_ITEM, LESSONS_ITEM, OSTATOBA_ITEM } from '../ostatoba/nav';

const ChvevebiPage = React.lazy(() => import('../chvevebi/ChvevebiPage'));
const ClassesListScreen = React.lazy(() => import('../klasi/ClassesList').then(m => ({ default: m.ClassesListScreen })));
// „ოსტატობა“'s screens (x-ostatoba and its lists, ../ostatoba)
const OstatobaScreen = React.lazy(() => import('../ostatoba/OstatobaScreen').then(m => ({ default: m.OstatobaScreen })));
const LessonsScreen = React.lazy(() => import('../ostatoba/LessonsScreen').then(m => ({ default: m.LessonsScreen })));
const ExtraScreen = React.lazy(() => import('../ostatoba/LessonsScreen').then(m => ({ default: m.ExtraScreen })));

// Page `gz` in the new look: the list (x-gza) and the path's own pages, each a step of its own in history by the
// navigation's `mapItem` — `sagandzuri` (x-sagandzuri), `samosi` (x-samosi), `chvevebi…` (the habits, `../chvevebi`) and
// `ostatoba…` („ოსტატობა“, x-ostatoba: its first screen, the lessons, the extra exercises — ../ostatoba/nav — and the levels).

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
  if (mapItem === OSTATOBA_ITEM) return <OstatobaScreen />;
  if (mapItem === LESSONS_ITEM) return <LessonsScreen />;
  if (mapItem === EXTRA_ITEM) return <ExtraScreen />;
  return <GzaList onOpen={item => openMapItem(item)} />;
};
