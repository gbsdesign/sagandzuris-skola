import React, { useEffect, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context';
import { askConfirm } from '../../../components/ui/kit';
import { Avatar, Button, Helper, Rows, TopBar } from '../../../components/ui2';
import { listDeleted, restoreMember, wipeMember } from '../../../utils/memberRemoval';
import { useAdmin } from './ctx';
import { Screen } from './parts';

// „წაშლილები“ (2026-11-22, the user: „წაშლილების სია ჩემს პროფილში ადმინებში … იქიდან აღდგენა ან სამუდამოდ წაშლა“): the members a
// superadmin deleted from the school (utils/memberRemoval.ts). „აღდგენა“ gives back their access and classes; „სამუდამოდ“ wipes the
// account like one's own „ანგარიშის წაშლა“ (chat messages stay).

type Row = { uid: string; name: string; photoURL: string; at: string };

export const DeletedScreen: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { d, back, say, fail } = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState('');
  const load = () => listDeleted().then(setRows, () => setRows([]));
  useEffect(() => { void load(); }, []);
  const by = user?.email || user?.uid || '';

  const restore = async (r: Row) => {
    setBusy(r.uid);
    try { await restoreMember(r.uid, by, d.classes); say(`${r.name} — აღდგა.`, 'success'); await load(); } catch { fail('ვერ აღდგა — სცადე თავიდან.'); }
    setBusy('');
  };
  const wipe = async (r: Row) => {
    const ok = await askConfirm({ title: `${r.name} — სამუდამოდ წაშლა?`, text: 'ანგარიში და მისი მონაცემები სამუდამოდ წაიშლება. ამის დაბრუნება შეუძლებელია.', ok: 'სამუდამოდ წაშლა', danger: true });
    if (!ok) return;
    setBusy(r.uid);
    const why = await wipeMember(r.uid);
    setBusy('');
    if (why) fail(why); else { say(`${r.name} — სამუდამოდ წაიშალა.`, 'success'); await load(); }
  };

  return (
    <Screen>
      <TopBar title="წაშლილები" sub={rows ? `${rows.length} წევრი` : undefined} onBack={back} />
      {!isSuperAdmin ? <Helper>ეს სია მხოლოდ სუპერადმინს უჩანს.</Helper>
        : rows === null ? <Helper>იტვირთება…</Helper>
        : rows.length === 0 ? <Helper>წაშლილი წევრი არ არის.</Helper>
        : (
          <Rows>
            {rows.map(r => (
              <div key={r.uid} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.name} photo={r.photoURL} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-bold text-ink">{r.name}</p>
                    {r.at && <p className="text-meta text-mut">წაიშალა {new Date(r.at).toLocaleDateString('ka-GE', { day: 'numeric', month: 'long' })}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button kind="ghost" size="md" icon={<RotateCcw />} disabled={!!busy} onClick={() => void restore(r)}>აღდგენა</Button>
                  <Button kind="ghost" size="md" icon={<Trash2 />} disabled={!!busy} className="text-danger" onClick={() => void wipe(r)}>სამუდამოდ</Button>
                </div>
              </div>
            ))}
          </Rows>
        )}
    </Screen>
  );
};
