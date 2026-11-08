import { useEffect } from 'react';
import { useNavigation } from '../context';

// „ოფლაინ რეჟიმი“ is no longer a page (2026-11-08): each list has its own ☁ window (components/offline/OfflineSheet.tsx)
// and the automatic part downloads by itself, unseen. An old step in the history that still points here goes home.
export const OfflinePage = () => {
  const { navigateTo } = useNavigation();
  useEffect(() => { navigateTo('home'); }, [navigateTo]);
  return null;
};
