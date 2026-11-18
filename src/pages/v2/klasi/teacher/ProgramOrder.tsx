import React, { useEffect, useRef, useState } from 'react';
import { Check, GripVertical, Plus, X } from 'lucide-react';
import { useNavigation } from '../../../../context';
import type { ProgramItem, SchoolClass } from '../../../../hooks/useClasses';
import { useDragSort } from '../../../../components/ui/useDragSort';
import { askConfirm } from '../../../../components/ui/kit';
import { saveClassProgram } from '../../../../components/admin/ClassesAdmin';
import { programLines } from '../../../../components/teacher/ClassProgramPanel';
import { Button, Card, FOCUS, Note, RoundButton, Two, TopBar, cx } from '../../../../components/ui2';
import { ProgramAddSheet } from './ProgramAdd';

/** x-klasi-programa-dalageba — the program's order, a page of its own (class mapItem `order`): a handle to drag each row,
 *  a round ✕ (asks first), „+ დამატება“ and the big „მზადაა“. A change is saved at once, as the old editor did at „მზადაა“,
 *  and the members' paths follow (`saveClassProgram`). */
export const ProgramOrderScreen: React.FC<{ cls: SchoolClass }> = ({ cls }) => {
  const { handleGoBack } = useNavigation();
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState('');
  // what was just changed, shown until the class's own list has caught up
  const [local, setLocal] = useState<ProgramItem[] | null>(null);
  const list = local ?? cls.program;
  const stamp = JSON.stringify(cls.program);
  useEffect(() => { setLocal(null); }, [stamp]);

  const latest = useRef(list);
  latest.current = list;
  const save = async (next: ProgramItem[]) => {
    setLocal(next);
    setProblem('');
    try {
      const failed = await saveClassProgram(cls, next);
      if (failed) setProblem(`პროგრამა შენახულია, მაგრამ ${failed} წევრის გზა ვერ განახლდა.`);
    } catch {
      setLocal(null);
      setProblem('პროგრამა ვერ შეინახა.');
    }
  };

  const keyOf = (p: ProgramItem, i: number) => p.id || `#${i}`;
  const keys = list.map(keyOf);
  const { container, order, dragging, grip } = useDragSort(keys, next => {
    const byKey = new Map(latest.current.map((p, i) => [keyOf(p, i), p]));
    void save(next.map(k => byKey.get(k)).filter((p): p is ProgramItem => !!p));
  });
  const byKey = new Map(list.map((p, i) => [keyOf(p, i), p]));

  const remove = async (p: ProgramItem) => {
    const name = programLines(p).title;
    if (!(await askConfirm({ title: `ამოვიღო „${name}“ პროგრამიდან?`, text: 'წევრების გზიდანაც ამოვა.', ok: 'ამოღება', danger: true }))) return;
    await save(latest.current.filter(x => x !== p));
  };

  return (
    <>
      <TopBar title="სასწავლო პროგრამა" onBack={handleGoBack} />
      <div className="flex flex-col gap-3 pb-4">
        {list.length === 0 ? (
          <Note>პროგრამა ჯერ ცარიელია.</Note>
        ) : (
          <Card pad="none">
            <ul ref={el => { container.current = el; }} className="flex flex-col divide-y divide-line">
              {order.map(k => {
                const p = byKey.get(k);
                if (!p) return null;
                const lines = programLines(p);
                const g = grip(k);
                return (
                  <li key={k} data-sort-id={k} className={cx('relative flex min-h-row items-center bg-surf', dragging === k && 'z-10 shadow-lift')}>
                    <button
                      type="button"
                      {...g}
                      // Alt + ↑ / ↓ moves it too (the plain arrows as well)
                      aria-label={`${lines.title} — გადაადგილება (ისრები)`}
                      title="გადაათრიე"
                      className={cx('flex size-tap shrink-0 items-center justify-center text-faint touch-none select-none', dragging === k ? 'cursor-grabbing text-wine' : 'cursor-grab', FOCUS)}
                    >
                      <GripVertical className="size-5" aria-hidden="true" />
                    </button>
                    <Two title={lines.title} sub={lines.sub} className="py-2" />
                    <RoundButton label={`${lines.title} — პროგრამიდან ამოღება`} size={36} tone="page" className="mx-3" onClick={() => remove(p)}>
                      <X aria-hidden="true" />
                    </RoundButton>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
        {problem && <p className="px-1.5 text-meta text-danger">{problem}</p>}
        <Button kind="ghost" full icon={<Plus />} onClick={() => setAdding(true)}>დამატება</Button>
        <Button full icon={<Check />} onClick={handleGoBack} className="mt-2">მზადაა</Button>
      </div>
      <ProgramAddSheet cls={cls} open={adding} onClose={() => setAdding(false)} />
    </>
  );
};
