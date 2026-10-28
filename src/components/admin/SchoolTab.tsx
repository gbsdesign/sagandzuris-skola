import React, { useState } from 'react';
import { Bytes, Timestamp, collection, getDocs } from 'firebase/firestore';
import { DatabaseBackup, Download, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { Btn, Card } from '../ui/kit';
import { useAuth } from '../../context';
import { errorText } from '../../utils/errorText';
import { SectionsTab } from './SectionsTab';
import { CentreDownloadFold } from './CentreDownload';
import { SongTextEditorsFold } from './SongTextEditors';
import { TopChants } from './StatsTab';
import type { UserRecord } from './UsersTab';

// a small square icon, the same as a folding card's
const RowIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-10 h-10 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5">{children}</span>
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

// "სკოლა": the whole school in one place, one card under another — sections and the most listened chants
// (the former „ჩანაწერები“ tab) as folding cards, the backup export, and the owner's safety checklist (folded).
// The staff are found in „წევრები“ (filter „ადმინები“), where their roles are given.
// The logo card was removed on the user's request (2026-10-20); a logo already saved in settings/logo still shows.
export const SchoolTab: React.FC<{ users: UserRecord[]; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ users, onMessage }) => {
  const { isSuperAdmin } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportAll = async () => {
    setExporting('იწყება…');
    try {
      const out: Record<string, unknown> = { exportedAt: new Date().toISOString(), project: 'sagandzuris-skola' };
      // who was let in and who decided: superadmins only (others may not read them)
      const top = ['students', 'directory', 'admins', 'confirmations', 'settings', 'songTexts', 'birthdays', 'birthYears', 'nameDays',
        ...(isSuperAdmin ? ['memberAccess', 'accessDecisions'] : [])];
      for (const name of top) {
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
          lessons: await readAll(['classes', c.id, 'lessons']),
          lessonProgress: await readAll(['classes', c.id, 'lessonProgress']),
          marks: await readAll(['classes', c.id, 'marks']),
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
    } catch (e) {
      onMessage('ასლი ვერ მომზადდა: ' + errorText(e), 'error');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-3">
      <SectionsTab onMessage={onMessage} />
      <TopChants users={users} />
      <CentreDownloadFold users={users} onMessage={onMessage} />
      <SongTextEditorsFold users={users} onMessage={onMessage} />

      <Card className="!py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-[44px]">
          <RowIcon><DatabaseBackup /></RowIcon>
          <span className="flex-1 min-w-[10rem]">
            <span className="block font-serif-ge text-[16px] font-bold text-[#4a3426] leading-snug">სარეზერვო ასლი</span>
            <span className="block text-[12.5px] text-[#8a7a6a] leading-snug mt-0.5">ყველა ჩანაწერი ერთ ფაილად — აუდიოს, პირადი ჩატებისა და სურათების გარდა</span>
          </span>
          <Btn size="sm" kind="ghost" icon={exporting ? <Loader2 className="animate-spin" /> : <Download />} disabled={!!exporting} onClick={exportAll}
            title="წევრები და მათი გზა, მიღება და ნებართვები, დაბადების და ანგელოზის დღეები, კლასები (დავალებები, დასწრება, ჩატის ტექსტი, გაკვეთილები, ნიშნები), ფსალმუნთა ჯგუფები, სიმღერების ტექსტები. არ შედის: ხმოვანი შეტყობინებები და ნამღერი, პირადი ჩატები, სურათები.">
            {exporting ? `მზადდება… ${exporting}` : 'ჩამოტვირთვა'}
          </Btn>
        </div>
      </Card>

    </div>
  );
};
