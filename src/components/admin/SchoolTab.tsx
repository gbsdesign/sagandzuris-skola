import React, { useState } from 'react';
import { Bytes, Timestamp, collection, getDocs } from 'firebase/firestore';
import { ChevronDown, DatabaseBackup, Download, ListChecks, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth } from '../../context';
import { Btn, Card } from '../ui/kit';
import { SectionsTab } from './SectionsTab';
import { TopChants } from './StatsTab';
import type { UserRecord } from './UsersTab';

// a small square icon, the same as a card title's
const RowIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-9 h-9 shrink-0 rounded-xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-[18px] [&>svg]:h-[18px]">{children}</span>
);

// Firestore values made plain for JSON (times as ISO text; voice-message audio is left out).
const plain = (v: unknown): unknown => {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Bytes) return `(${v.toUint8Array().length} ბაიტი აუდიო)`;
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
};

const readAll = async (path: string[]) => {
  const snap = await getDocs(collection(db, path[0], ...path.slice(1)));
  return snap.docs.map(d => ({ id: d.id, ...(plain(d.data()) as object) }));
};

// "სკოლა": the whole school in one place — sections, the most listened chants (the former „ჩანაწერები“ tab),
// and one small card with the backup export and the owner's safety checklist (folded).
// The staff are found in „მომხმარებლები“ (filter „ადმინები“), where their roles are given.
// The logo card was removed on the user's request (2026-10-20); a logo already saved in settings/logo still shows.
export const SchoolTab: React.FC<{ users: UserRecord[]; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ users, onMessage }) => {
  const { isOwner } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const [checklist, setChecklist] = useState(false);

  const exportAll = async () => {
    setExporting('იწყება…');
    try {
      const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), project: 'sagandzuris-skola' };
      for (const name of ['students', 'directory', 'admins', 'confirmations', 'settings']) {
        setExporting(name);
        out[name] = await readAll([name]);
      }
      setExporting('classes');
      const classes = await readAll(['classes']);
      for (const c of classes as { id: string }[]) {
        Object.assign(c, {
          assignments: await readAll(['classes', c.id, 'assignments']),
          attendance: await readAll(['classes', c.id, 'attendance']),
          messages: await readAll(['classes', c.id, 'messages']),
        });
      }
      out.classes = classes;
      setExporting('psalterGroups');
      const groups = await readAll(['psalterGroups']);
      for (const g of groups as { id: string }[]) Object.assign(g, { cycles: await readAll(['psalterGroups', g.id, 'cycles']) });
      out.psalterGroups = groups;

      const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sagandzuri-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      onMessage(`ასლი ჩამოიტვირთა (${Math.round(blob.size / 1024)} კბ). შეინახე უსაფრთხო ადგილას — მაგ. Google Drive-ში.`, 'success');
    } catch (e: any) {
      onMessage('ექსპორტი ვერ მოხერხდა: ' + (e?.code || e?.message || ''), 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <SectionsTab onMessage={onMessage} />
      <TopChants users={users} />

      <Card className="!py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-1">
          <RowIcon><DatabaseBackup /></RowIcon>
          <span className="flex-1 min-w-[10rem]">
            <span className="block text-[14px] font-bold text-[#4a3426]">სარეზერვო ასლი</span>
            <span className="block text-[12px] text-[#8a7a6a] leading-snug">ყველა მონაცემი ერთ ფაილად · გირჩევ თვეში ერთხელ</span>
          </span>
          <Btn size="sm" kind="ghost" icon={exporting ? <Loader2 className="animate-spin" /> : <Download />} disabled={!!exporting} onClick={exportAll}
            title="მოსწავლეები და მათი გზა, კლასები, დავალებები, დასწრება, ჩატის ტექსტი, ფსალმუნთა ჯგუფები, მოსახსენებელი სახელები. ხმოვანი შეტყობინებების აუდიო არ შედის.">
            {exporting ? `მზადდება… ${exporting}` : 'ჩამოტვირთვა'}
          </Btn>
        </div>

        {isOwner && (
          <div className="mt-2 pt-2 border-t border-[#f1e8d9]">
            <button type="button" aria-expanded={checklist} onClick={() => setChecklist(o => !o)}
              className="w-full flex items-center gap-3 py-1 text-left cursor-pointer">
              <RowIcon><ListChecks /></RowIcon>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-bold text-[#4a3426]">უსაფრთხოების შემოწმება</span>
                <span className="block text-[12px] text-[#8a7a6a] leading-snug">5 რამ Firebase-ის კონსოლში, ერთხელ · მხოლოდ შენ ხედავ</span>
              </span>
              <ChevronDown className={`w-5 h-5 shrink-0 text-[#8a7a6a] transition-transform ${checklist ? 'rotate-180' : ''}`} />
            </button>
            {checklist && (
              <ol className="mt-2 mb-1 sm:ml-12 space-y-1.5 text-[13px] leading-relaxed text-[#4a3426] list-decimal pl-5 marker:text-[#7a2028] marker:font-bold sg-in">
                <li>Project settings → Users and permissions: მფლობელი (Owner) შენ ხარ.</li>
                <li>Firestore → Rules: ჩასვი პროექტის ფაილი <code className="text-[12px] bg-[#f4ece0] px-1 rounded">firestore.rules</code> და Publish.</li>
                <li>Usage and billing → Budget alert: შეტყობინება, თუ ხარჯი გაჩნდება.</li>
                <li>Google Cloud → APIs → Credentials: API გასაღები შეზღუდე საიტის მისამართებზე.</li>
                <li>Authentication → Settings → Authorized domains: მხოლოდ საიტის მისამართები.</li>
              </ol>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
