// The chant notes page and "დღევანდელი წირვა" open over the app as their own full-screen pages.
// Each opening is a browser history entry, so the phone's back button/gesture returns to where it came from,
// and the address (?c=…&v=… or ?p=…) can be shared: it opens the same page directly.
import React, { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigation } from './NavigationContext';
import { findVersion } from '../data/chantLookup';
import { useLiturgy, LiturgyApi, LiturgyProgram } from '../hooks/useLiturgy';

const NotesPage = lazy(() => import('../pages/notes/NotesPage').then(m => ({ default: m.NotesPage })));
const ProgramPage = lazy(() => import('../pages/notes/ProgramPage').then(m => ({ default: m.ProgramPage })));

export type NotesOrigin = 'list' | 'program' | 'bookmark' | 'link';
interface OpenNotes { vid: string; from: NotesOrigin }

interface NotesContextType {
  notes: OpenNotes | null;
  programOpen: boolean;
  openNotes: (vid: string, from: NotesOrigin) => void;
  goNotes: (vid: string) => void;
  closeNotes: () => void;
  openProgram: () => void;
  closeProgram: () => void;
  church: boolean;
  setChurch: (on: boolean) => void;
  liturgy: LiturgyApi;
  /** the program on screen: one opened from a shared link, otherwise the teacher's draft or my class's program */
  program: LiturgyProgram | null;
  fromLink: boolean;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const notesUrl = (vid: string) => {
  const info = findVersion(vid);
  return info ? `?c=${encodeURIComponent(info.chant.id)}&v=${encodeURIComponent(vid)}` : '?';
};
export const shareNotesUrl = (vid: string) => `${window.location.origin}/${notesUrl(vid)}`;
export const shareProgramUrl = (p: LiturgyProgram) => `${window.location.origin}/?p=${p.date}~${p.items.join(',')}`;

const parseProgram = (raw: string): LiturgyProgram | null => {
  const [date, list = ''] = raw.split('~');
  const items = list.split(',').filter(id => Boolean(findVersion(id)));
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && items.length ? { date, items } : null;
};

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const nav = useNavigation();
  const liturgy = useLiturgy();
  const [notes, setNotes] = useState<OpenNotes | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [church, setChurch] = useState(false);
  const [linkProgram, setLinkProgram] = useState<LiturgyProgram | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // a shared address opens its page directly
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const v = q.get('v'), p = q.get('p');
    if (p) {
      const prog = parseProgram(p);
      if (prog) {
        setLinkProgram(prog);
        window.history.replaceState({ sgProg: 1, sgBase: 1 }, '', window.location.search);
        setProgramOpen(true);
      }
    } else if (v && findVersion(v)) {
      window.history.replaceState({ sgNotes: v, sgFrom: 'link', sgBase: 1 }, '', window.location.search);
      setNotes({ vid: v, from: 'link' });
    }
  }, []);

  // back/forward
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = e.state || {};
      setNotes(s.sgNotes && findVersion(s.sgNotes) ? { vid: s.sgNotes, from: s.sgFrom || 'list' } : null);
      setProgramOpen(Boolean(s.sgProg || s.sgUnder));
      if (!s.sgNotes) setChurch(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // the page behind an open overlay does not scroll
  useEffect(() => {
    if (!notes && !programOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [notes, programOpen]);

  // closing a page that was opened straight from a link lands on its service list
  const landOnList = useCallback((vid: string | null) => {
    const info = findVersion(vid);
    window.history.replaceState(null, '', window.location.pathname);
    if (info) {
      nav.navigateTo('galoba');
      nav.setSelectedService(info.service);
      nav.setExpandedChantId(info.chant.id);
    }
  }, [nav]);

  const openNotes = useCallback((vid: string, from: NotesOrigin) => {
    if (!findVersion(vid)) return;
    window.history.pushState({ sgNotes: vid, sgFrom: from, sgUnder: from === 'program' ? 1 : 0 }, '', notesUrl(vid));
    setNotes({ vid, from });
  }, []);

  const goNotes = useCallback((vid: string) => {
    const cur = notesRef.current;
    if (!cur || !findVersion(vid)) return;
    const s = window.history.state || {};
    window.history.replaceState({ ...s, sgNotes: vid }, '', notesUrl(vid));
    setNotes({ vid, from: cur.from });
  }, []);

  const closeNotes = useCallback(() => {
    const cur = notesRef.current;
    setChurch(false);
    if (cur?.from === 'list') {
      const info = findVersion(cur.vid);
      if (info) { nav.setSelectedService(info.service); nav.setExpandedChantId(info.chant.id); }
    }
    if (window.history.state?.sgBase) {
      setNotes(null);
      landOnList(cur?.vid ?? null);
    } else {
      window.history.back();
    }
  }, [nav, landOnList]);

  const openProgram = useCallback(() => {
    window.history.pushState({ sgProg: 1 }, '', '?p=today');
    setProgramOpen(true);
  }, []);

  const closeProgram = useCallback(() => {
    if (window.history.state?.sgBase) {
      setProgramOpen(false);
      setLinkProgram(null);
      window.history.replaceState(null, '', window.location.pathname);
      nav.navigateTo('galoba');
    } else {
      window.history.back();
    }
  }, [nav]);

  const program = linkProgram ?? liturgy.program;
  const value = useMemo<NotesContextType>(() => ({
    notes, programOpen, openNotes, goNotes, closeNotes, openProgram, closeProgram,
    church, setChurch, liturgy, program, fromLink: Boolean(linkProgram),
  }), [notes, programOpen, openNotes, goNotes, closeNotes, openProgram, closeProgram, church, liturgy, program, linkProgram]);

  return (
    <NotesContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {programOpen && <ProgramPage hidden={Boolean(notes)} />}
        {notes && <NotesPage key="notes" vid={notes.vid} from={notes.from} />}
      </Suspense>
    </NotesContext.Provider>
  );
};

export const useNotes = (): NotesContextType => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error('useNotes must be used within a NotesProvider');
  return ctx;
};
