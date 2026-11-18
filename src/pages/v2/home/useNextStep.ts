import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useNavigation } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { useMyAllClasses } from '../../../hooks/useShellCounts';
import { georgiaToday } from '../../../utils/psalter';
import { chantLookupNow, useChantLookupReady } from '../../../data/chantLookupLazy';
import { lastReading } from '../../library/readingPlace';
import { BOOKS } from '../../../data/libraryBooks';
import { openAiLesson } from '../../../components/aiLesson/open';
import { dueReviews, lessonSoon, pickNext, recentPieces, songOfPiece, type Learning, type NextStep } from './nextStep';

// The data behind the home's „გააგრძელე“ (nextStep.ts says what it shows): ONE listener on my students/{uid} record (the
// learning mode's parts, their counts, the AI lesson's days), my classes' timetables, the book place this phone remembers.
// Names come from the chant books' index once it is here (it loads a moment after the first screen) and, for a song, from
// the songs' list loaded only then — nothing heavy joins the home's first load.

interface HomeRecord { learning: Learning; parts: Record<string, number>; aiLast?: string; aiDays: number }

const useHomeRecord = (uid: string | null | undefined) => {
  const [rec, setRec] = useState<HomeRecord | null>(null);
  useEffect(() => {
    setRec(null);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const d = s.data() || {};
        setRec({
          learning: (d.learning || {}) as Learning,
          parts: (d.learnParts || {}) as Record<string, number>,
          aiLast: d.aiLesson?.last,
          aiDays: Object.keys(d.aiLesson?.days || {}).length,
        });
      },
      err => { console.warn('home:', err?.code || err); setRec({ learning: {}, parts: {}, aiDays: 0 }); },
    );
  }, [uid]);
  return rec;
};

// the songs' names, only when a song is the one to show (the list is big: it waits for that)
let songTitles: Map<string, string> | null = null;
const useSongTitles = (wanted: boolean) => {
  const [titles, setTitles] = useState(songTitles);
  useEffect(() => {
    if (!wanted || titles) return;
    let gone = false;
    void import('../../../data/songsData').then(m => {
      songTitles ??= new Map(m.FOLK_SONGS.map(s => [s.id, s.title]));
      if (!gone) setTitles(songTitles);
    }).catch(() => { if (!gone) setTitles(new Map()); });
    return () => { gone = true; };
  }, [wanted, titles]);
  return titles;
};

/** the AI lesson's length the member chose last (the lesson keeps it on the device) */
const lessonMinutes = (): 5 | 10 => { try { return localStorage.getItem('sg-ai-lesson-length') === '5' ? 5 : 10; } catch { return 10; } };

/** a chant's name without the trailing marks of the book's title (as utils/pearls chantName) */
const plainName = (title: string) => title.replace(/[\s;:,.]+$/, '');

/** The book read last on this phone, with the steps that open its contents and then the chapter (as the shelf's card). */
const bookPlace = () => {
  const last = lastReading();
  if (!last) return null;
  const id = last.shelf === 'book' ? 'dzveli' : last.steps[1].split(':')[1];
  const title = id === 'dzveli' ? 'საღმრთო ისტორია' : BOOKS.find(b => b.id === id)?.title;
  return title ? { title, n: last.n, steps: last.steps } : null;
};

export const useNextStep = (): { step: NextStep | null; go: () => void; learnPiece: string | null; learnDone: () => void } => {
  const { user } = useAuth();
  const access = useAccess();
  const { navigateTo, openMapItem, openClass } = useNavigation();
  const classes = useMyAllClasses();
  const rec = useHomeRecord(user?.uid);
  const [learnPiece, setLearnPiece] = useState<string | null>(null);

  // the clock moves on by itself: a lesson's three hours begin and end, a new day starts
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  const today = georgiaToday(now);

  const canPiece = (piece: string) => access.section(songOfPiece(piece) ? 'simghera' : 'galoba') === 'open';
  const reviews = rec ? dueReviews(rec.learning, today).filter(r => canPiece(r.piece)) : [];
  const recent = rec ? recentPieces(rec.learning, rec.parts, today).filter(r => canPiece(r.piece)) : [];
  const pieces = [...reviews, ...recent].map(r => r.piece);
  const booksReady = useChantLookupReady(pieces.some(p => !songOfPiece(p)));
  const songs = useSongTitles(pieces.some(p => !!songOfPiece(p)));

  const nameOf = (piece: string): string | null | undefined => {
    const song = songOfPiece(piece);
    if (song) return songs ? songs.get(song.songId) ?? null : undefined;
    if (!booksReady) return undefined;
    const info = chantLookupNow()?.findVersion(piece);
    return info ? plainName(info.chant.title) : null;
  };

  const lesson = user && access.can('classes') ? lessonSoon(classes, now) : null;
  const book = access.section('biblioteka') === 'open' ? bookPlace() : null;
  const aiOn = !!user && access.on('aiTeacher');
  const galobaOpen = access.section('galoba') === 'open';

  const picked = !user || !rec
    ? null
    : pickNext({
      lesson,
      fresh: !Object.keys(rec.learning).length && !rec.aiLast && !rec.aiDays,
      ai: { on: aiOn, doneToday: rec.aiLast === today, minutes: lessonMinutes() },
      galobaOpen,
      reviews,
      recent,
      book: book && { title: book.title, n: book.n },
      nameOf,
    });
  const chosen = picked === 'wait' ? null : picked;

  const go = () => {
    if (!chosen) return;
    switch (chosen.step.kind) {
      case 'lesson': if (chosen.classId) openClass(chosen.classId); return;
      case 'start': if (aiOn) openAiLesson(); else navigateTo('galoba'); return;
      case 'ai': openAiLesson(); return;
      case 'review':
      case 'learn': if (chosen.piece) setLearnPiece(chosen.piece); return;
      case 'book':
        if (!book) return;
        // two steps, the contents and then the chapter, so „უკან“ from the chapter shows the contents (as the shelf's card)
        navigateTo('biblioteka');
        openMapItem(book.steps[0]);
        window.setTimeout(() => openMapItem(book.steps[1]), 0);
        return;
    }
  };

  return { step: chosen?.step ?? null, go, learnPiece, learnDone: () => setLearnPiece(null) };
};
