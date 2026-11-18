import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useViewing } from '../../context';
import { useNotes } from '../../context/NotesContext';
import { useMyClasses, useTeachingClasses } from '../../hooks/useClasses';
import { useCall } from '../../utils/callSession';
import { useOffline } from '../../utils/offlineFiles';
import { offlineSupported, onOfflineChange } from '../../utils/offlineNotes';
import { ProgramPlan, autoOf, freeMb, notesOnlyMb, planMb, planSaved, programPlan, runProgramSave, setAutoOf } from '../../utils/programOffline';
import { ProgramAskSheet, ProgramSpaceSheet, connectionType } from '../../pages/v2/klasi/ProgramOfflineSheet';

// The class program downloads by itself when it changes (board x-ultra-oplain): 20 s after the app opens, only online with
// the page on screen, on Wi-Fi where the phone can tell it, never during a service (notes, program, church mode), a call or
// a teacher's look at a student. Where Wi-Fi cannot be seen and the download is big it asks once a day; without room it
// offers the notes alone once a day. One automatic try per program version for each opening of the app.

const BIG_MB = 10;
const DELAY_MS = 20_000;
const today = () => new Date().toISOString().slice(0, 10);

type Pending = { classId: string; plan: ProgramPlan; mb: number; free?: number };

const ProgramAutoOffline: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const viewing = useViewing();
  const { notes, programOpen, church } = useNotes();
  const call = useCall();
  const off = useOffline();
  const mine = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [ask, setAsk] = useState<Pending | null>(null);
  const [space, setSpace] = useState<Pending | null>(null);
  const running = useRef(false);
  const tried = useRef(new Set<string>());

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // anything that may let it start: saved things change, the phone's network or the page's visibility changes
  useEffect(() => {
    const bump = () => setTick(n => n + 1);
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener('change', bump);
    document.addEventListener('visibilitychange', bump);
    const stop = onOfflineChange(bump);
    return () => { conn?.removeEventListener('change', bump); document.removeEventListener('visibilitychange', bump); stop(); };
  }, []);

  const classes = [...mine, ...teaching.filter(c => !mine.some(m => m.id === c.id))];
  const programKey = classes.map(c => `${c.id}:${c.program.map(p => p.id || '').join(',')}`).join('|');
  const busy = !!notes || programOpen || church || call.status !== 'idle' || !!viewing;

  useEffect(() => {
    if (!user?.uid || !ready || busy || ask || space || running.current) return;
    if (!off.online || document.visibilityState !== 'visible' || !offlineSupported()) return;
    let dead = false;
    (async () => {
      for (const cls of classes) {
        const st = autoOf(cls.id);
        if (!st.auto) continue;
        const ids = cls.program.map(p => p.id).filter((x): x is string => !!x);
        const plan = programPlan(ids);
        if (!plan.versions.length && !plan.tracks.length) continue;
        if (planSaved(plan, t => off.tracks.has(t))) continue;
        const attempt = `${cls.id}:${ids.join(',')}`;
        if (tried.current.has(attempt)) continue;
        const type = connectionType();
        // Wi-Fi only: wait while the phone says it is on mobile data
        if (st.wifi && type && type !== 'wifi' && type !== 'ethernet') continue;
        const mb = planMb(plan, t => off.tracks.has(t));
        // the phone cannot tell Wi-Fi (iPhone): a big download asks once a day
        if (st.wifi && !type && mb > BIG_MB) {
          if (st.askedDay === today()) continue;
          if (!dead) setAsk({ classId: cls.id, plan, mb });
          return;
        }
        const free = await freeMb();
        if (dead) return;
        if (free !== null && free < mb) {
          if (st.spaceDay === today()) continue;
          setAsk(null);
          setSpace({ classId: cls.id, plan, mb, free });
          return;
        }
        tried.current.add(attempt);
        running.current = true;
        void runProgramSave(plan, true).finally(() => { running.current = false; setTick(n => n + 1); });
        return;
      }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, ready, busy, ask, space, off.online, off.tracks, programKey, tick]);

  const start = (p: Pending, notesOnly = false) => {
    tried.current.add(`${p.classId}:${classes.find(c => c.id === p.classId)?.program.map(x => x.id).filter(Boolean).join(',') ?? ''}`);
    running.current = true;
    void runProgramSave(p.plan, true, notesOnly).finally(() => { running.current = false; setTick(n => n + 1); });
  };

  return (
    <>
      <ProgramAskSheet
        open={!!ask && !busy}
        count={ask ? ask.plan.versions.length + ask.plan.songs.length : 0}
        word="საგალობელი"
        mb={ask?.mb ?? 0}
        onYes={() => { if (ask) start(ask); setAsk(null); }}
        onLater={() => { if (ask) setAutoOf(ask.classId, { askedDay: today() }); setAsk(null); }}
      />
      <ProgramSpaceSheet
        open={!!space && !busy}
        need={space?.mb ?? 0}
        free={space?.free ?? 0}
        notes={space ? notesOnlyMb(space.plan) : 0}
        onNotes={() => { if (space) start(space, true); setSpace(null); }}
        onClose={() => { if (space) setAutoOf(space.classId, { spaceDay: today() }); setSpace(null); }}
      />
    </>
  );
};

export default ProgramAutoOffline;
export { ProgramAutoOffline };
