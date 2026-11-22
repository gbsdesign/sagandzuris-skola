import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Helper, Rows, TopBar } from '../../../components/ui2';
import { SERVICE_CHANTS } from '../../galoba/chantSearch';
import { setDeleted, useChantListEdits } from '../../../utils/chantListEdits';
import { useAdmin } from './ctx';
import { Screen } from './parts';

// „წაშლილი საგალობლები“ (2026-11-22): the chants an admin deleted from a service's list by a long press (utils/chantListEdits.ts);
// „აღდგენა“ puts one back in its place.

export const DeletedChantsScreen: React.FC = () => {
  const { back, say, fail } = useAdmin();
  const edits = useChantListEdits();
  const [busy, setBusy] = useState('');
  const rows = Object.entries(edits).flatMap(([service, e]) => (e.deleted ?? []).map(id => {
    const chant = (SERVICE_CHANTS as Record<string, { id: string; title?: string }[]>)[service]?.find(c => c.id === id);
    return { service, id, title: (chant?.title || id).replace(/[;\s]+$/, ''), at: e.deletedAt?.[id] || '' };
  }));
  const restore = async (r: typeof rows[number]) => {
    setBusy(r.service + r.id);
    try { await setDeleted(r.service, r.id, false); say(`„${r.title}“ — აღდგა.`, 'success'); } catch { fail('ვერ აღდგა — სცადე თავიდან.'); }
    setBusy('');
  };
  return (
    <Screen>
      <TopBar title="წაშლილი საგალობლები" sub={`${rows.length} საგალობელი`} onBack={back} />
      {rows.length === 0 ? <Helper>წაშლილი საგალობელი არ არის.</Helper> : (
        <Rows>
          {rows.map(r => (
            <div key={r.service + r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-body font-bold text-ink wrap-break-word">{r.title}</p>
                <p className="text-meta text-mut">{r.service}{r.at && ` · წაიშალა ${new Date(r.at).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}`}</p>
              </div>
              <Button kind="ghost" size="md" icon={<RotateCcw />} disabled={!!busy} onClick={() => void restore(r)}>აღდგენა</Button>
            </div>
          ))}
        </Rows>
      )}
    </Screen>
  );
};
