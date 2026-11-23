import React, { Suspense, lazy, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../../context';
import { useManagedClasses } from '../../hooks/useClasses';
import { Button, Dot, Row, Sheet } from '../ui2';
import type { PathItem } from '../../utils/pathItems';
import { triggerHaptic } from '../../utils/haptics';

// The light part of „კლასს ან მოსწავლეს მიმაგრება“ (2026-11-23): who may pin, the entry's shape, and the button / row each
// section shows. The steps themselves (AttachFlow, with the class saving) load only when the window opens.

const AttachFlow = lazy(() => import('./AttachFlow').then(m => ({ default: m.AttachFlow })));

export interface AttachEntry {
  /** the path / program id (a chant version, a song, a poem, or `v:` `b:` `a:` for a film, a book, an admission piece) */
  id: string;
  /** the name written in the program */
  title: string;
  code?: string;
  /** the path's record of it */
  item: () => PathItem;
}

/** An entry for a thing with no voices of its own to mark (a film, a book, an admission piece) or any simple one. */
export const simpleEntry = (id: string, title: string, code: string, label = code): AttachEntry => ({
  id, title, code,
  item: () => ({ variantId: id, chantId: id, chantName: title, code, label, fullTitle: title, isLearned: false, voices: [] }),
});

/** who may pin: a teacher with a class to lead, or an admin */
export const useCanAttach = () => {
  const { isTeacher, isAdmin } = useAuth();
  const { classes } = useManagedClasses();
  return !!isTeacher && (classes.length > 0 || !!isAdmin);
};

/** The row as the chant version's menu has it — for any page; shown only to those who may pin. */
export const AttachButton: React.FC<{ entry: AttachEntry; className?: string; above?: boolean }> = ({ entry, className, above }) => {
  const may = useCanAttach();
  const [open, setOpen] = useState(false);
  if (!may) return null;
  return (
    <>
      <Button kind="soft" full className={className} icon={<GraduationCap aria-hidden="true" />} onClick={() => { triggerHaptic(10); setOpen(true); }}>
        კლასს ან მოსწავლეს მიმაგრება
      </Button>
      {open && (
        <Sheet open above={above} title={entry.title} onClose={() => setOpen(false)}>
          <Suspense fallback={null}><AttachFlow entry={entry} /></Suspense>
        </Sheet>
      )}
    </>
  );
};

/** The same as a row of a list (Rows), with the chant menu's words. */
export const AttachRow: React.FC<{ entry: AttachEntry; above?: boolean }> = ({ entry, above }) => {
  const may = useCanAttach();
  const [open, setOpen] = useState(false);
  if (!may) return null;
  return (
    <>
      <Row lead={<Dot icon={<GraduationCap />} />} title="კლასს ან მოსწავლეს მიმაგრება" sub="პროგრამაში ან მოსწავლის გზაზე" wrap
        onClick={() => { triggerHaptic(10); setOpen(true); }} />
      {open && (
        <Sheet open above={above} title={entry.title} onClose={() => setOpen(false)}>
          <Suspense fallback={null}><AttachFlow entry={entry} /></Suspense>
        </Sheet>
      )}
    </>
  );
};
