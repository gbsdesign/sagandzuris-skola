import { useLayoutEffect, useRef } from 'react';
import { useNavigation } from '../../../context';
import { darkReadyPage, setDarkPage } from '../../../design/look';
import { isNewLook } from '../../../design/newLook';

// A screen over the page that still shows old parts (a drill's trainers, the entry test's steps) asks for the light look while
// they are on screen — their colours are drawn for the light paper. When they go, the page under it gets back what the router
// gave it (AppRouter: `useDarkPage(nl && darkReadyPage(page, mapItem))`).

export const useLightLook = (on: boolean) => {
  const { currentPage, mapItem } = useNavigation();
  const where = useRef({ currentPage, mapItem });
  where.current = { currentPage, mapItem };
  useLayoutEffect(() => {
    if (!on) return;
    setDarkPage(false);
    return () => setDarkPage(isNewLook() && darkReadyPage(where.current.currentPage, where.current.mapItem));
  }, [on]);
};
