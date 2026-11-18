import React, { useEffect, useRef } from 'react';
import { useNavigation } from '../../context';
import { SEARCH_EVENT, setPendingQuery, useOpenRequest } from '../../utils/searchOpen';

// The new look's ways in (redesign stage 2): every „open the search“ (the menu's 🔍, `/` or Ctrl+K, a game's „ნახე აპში“)
// opens the search page with its words, and the 🔔's links (`/?open=bell`, a notice on the phone) open the notices page.
// In the old look the header and the search overlay (GlobalSearch) do this.

export const ShellLinks: React.FC = () => {
  const { navigateTo, currentPage } = useNavigation();
  const nav = useRef({ navigateTo, currentPage });
  nav.current = { navigateTo, currentPage };

  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent<unknown>).detail;
      setPendingQuery(typeof q === 'string' ? q : '');
      if (nav.current.currentPage !== 'search') nav.current.navigateTo('search');
    };
    // "/" or Ctrl/⌘+K on a keyboard; never over the notes page, the program, a saint's life or a song
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
      const k = (e.key === 'k' || e.key === 'K' || e.key === 'ქ') && (e.ctrlKey || e.metaKey);
      if (!k && (e.key !== '/' || typing || e.ctrlKey || e.metaKey || e.altKey)) return;
      const st = window.history.state || {};
      if (st.sgNotes || st.sgProg || st.sgLife || st.sgSong) return;
      e.preventDefault();
      setPendingQuery('');
      if (nav.current.currentPage !== 'search') nav.current.navigateTo('search');
    };
    window.addEventListener(SEARCH_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(SEARCH_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useOpenRequest('bell', () => { window.setTimeout(() => nav.current.navigateTo('notices'), 0); });
  return null;
};
