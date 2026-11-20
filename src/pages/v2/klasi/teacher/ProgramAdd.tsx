import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check as CheckIcon, Feather, KeyRound, Library, Music, Piano, Users } from 'lucide-react';
import { Waiting } from '../../../../components/shell/PageSkeleton';
import type { ProgramItem, SchoolClass } from '../../../../hooks/useClasses';
import { searchCatalog } from '../../../../utils/pathItems';
import { triggerHaptic } from '../../../../utils/haptics';
import { saveClassProgram } from '../../../../components/admin/ClassesAdmin';
import { entryNode, roots, searchButtons, type Node } from '../../../../components/teacher/ClassProgramPanel';
import { Button, Check, Dot, Note, Press, Row, Rows, Sheet, cx } from '../../../../components/ui2';
import { SearchBox } from './SearchBox';

/** x-klasi-programashi-damateba — adding to the class's program. The seven sources as rows; a tap goes in (chants by
 *  service down to every version, the prayer book, the library, songs, poems, instruments, the great chanters), where
 *  items are ticked; „არჩეულია N“ + „მზადაა“. What is ticked is saved once, when the window closes — the members' paths
 *  with it (the old quick add's behaviour). */

const ICONS: Record<string, React.ReactNode> = {
  g: <Music />, 's': <KeyRound />, m: <Feather />, i: <Piano />,
  'c:prayers': <BookOpen />, 'c:library': <Library />, 'c:ancestors': <Users />,
};

export const ProgramAddSheet: React.FC<{ cls: SchoolClass; open: boolean; onClose: () => void }> = ({ cls, open, onClose }) => {
  const [draft, setDraft] = useState<ProgramItem[]>(cls.program);
  const [path, setPath] = useState<Node[]>([]);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Node[] | null>(null);
  const [problem, setProblem] = useState('');
  const top = useMemo(() => (open ? roots() : []), [open]);
  const here = path[path.length - 1];

  const pending = useRef<ProgramItem[] | null>(null);
  const saved = useRef(false);
  pending.current = JSON.stringify(draft) !== JSON.stringify(cls.program) ? draft : null;
  const clsRef = useRef(cls);
  clsRef.current = cls;

  useEffect(() => {
    if (!open) return;
    setDraft(clsRef.current.program);
    setPath([]);
    setQ('');
    setProblem('');
    saved.current = false;
  }, [open]);

  const flush = async () => {
    const next = pending.current;
    if (!next || saved.current) return true;
    saved.current = true;
    try {
      const failed = await saveClassProgram(clsRef.current, next);
      if (failed) setProblem(`პროგრამა შენახულია, მაგრამ ${failed} წევრის გზა ვერ განახლდა.`);
      return true;
    } catch {
      saved.current = false;
      setProblem('პროგრამა ვერ შეინახა.');
      return false;
    }
  };
  // leaving the page with the window open keeps what was ticked
  useEffect(() => () => { void flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (words.length) {
      setRows([...searchCatalog(q, 30).map(entryNode), ...searchButtons(words)]);
      return;
    }
    const next = here?.children ? here.children() : top;
    if (!(next instanceof Promise)) { setRows(next); return; }
    let live = true;
    setRows(null);
    next.then(r => live && setRows(r), () => live && setRows([]));
    return () => { live = false; };
  }, [open, here, q, top]);

  const toggle = (item: ProgramItem) => {
    triggerHaptic(10);
    setDraft(d => (d.some(p => p.id === item.id) ? d.filter(p => p.id !== item.id) : [...d, item]));
  };
  const close = async () => {
    // a failed save keeps the window open with the reason
    if (await flush()) onClose();
  };
  const on = new Set(draft.map(p => p.id));
  const searching = !!q.trim();
  const atTop = !searching && path.length === 0;

  return (
    <Sheet open={open} onClose={close} title="პროგრამაში დამატება" className="min-h-[60dvh]">
      <SearchBox value={q} onChange={setQ} placeholder="მოძებნე საგალობელი, ლოცვა…" />
      {!searching && path.length > 0 && (
        <Press
          onClick={() => setPath(p => p.slice(0, -1))}
          className="flex min-h-tap shrink-0 cursor-pointer items-center gap-2 rounded-full px-1.5 text-left text-body font-bold text-wine"
        >
          <ArrowLeft aria-hidden="true" className="size-[18px] shrink-0" />
          <span className="min-w-0 truncate">{path.map(n => n.title).join(' › ')}</span>
        </Press>
      )}
      {rows === null ? (
        <Waiting field={false} rows={5} quiet />
      ) : rows.length === 0 ? (
        <Note>ვერ მოიძებნა.</Note>
      ) : (
        <Rows>
          {rows.map(n => {
            if (n.children) {
              return (
                <Row
                  key={n.key}
                  lead={atTop ? <Dot icon={ICONS[n.key] ?? <Music />} /> : undefined}
                  title={n.title}
                  sub={n.sub}
                  wrap
                  onClick={() => { setQ(''); setPath(p => [...p, n]); }}
                />
              );
            }
            const item = n.item;
            const added = !!item && on.has(item.id);
            return (
              <Row
                key={n.key}
                role="checkbox"
                aria-checked={added}
                lead={<Check on={added} size={26} />}
                title={n.title}
                sub={n.sub}
                wrap
                right={null}
                onClick={item ? () => toggle(item) : undefined}
              />
            );
          })}
        </Rows>
      )}
      {problem && <p className="px-1.5 text-meta text-danger">{problem}</p>}
      <div className={cx('sticky bottom-0 -mx-4 mt-auto flex shrink-0 items-center justify-between gap-3 bg-page px-5 pt-2 pb-1')}>
        <span className="min-w-0 truncate text-lead font-semibold text-mut">არჩეულია {draft.length}</span>
        <Button icon={<CheckIcon />} onClick={close}>მზადაა</Button>
      </div>
    </Sheet>
  );
};
