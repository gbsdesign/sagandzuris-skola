import React, { useRef, useState } from 'react';
import { Bytes, Timestamp, collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { Download, ImageUp, RotateCcw, ShieldCheck, Crown, ListChecks, Loader2 } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, SUPER_ADMIN_EMAIL, MAX_EXTRA_SUPERADMINS, ROLE_LABEL } from '../../context';
import { imageFileToDataUrl } from '../../hooks/useClasses';
import { Btn, Card, CardTitle, Pill } from '../ui/kit';
import { StaffRecord } from './UsersTab';

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

// "სკოლა": backup export, the school logo, the staff list and a short safety checklist.
export const SchoolTab: React.FC<{ staff: StaffRecord[]; logoUrl: string; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ staff, logoUrl, onMessage }) => {
  const { isOwner } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

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

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const url = await imageFileToDataUrl(f, 320);
      await setDoc(doc(db, 'settings', 'logo'), { logoUrl: url, updatedAt: new Date().toISOString() });
      onMessage('ლოგო შეიცვალა.', 'success');
    } catch {
      onMessage('ლოგო ვერ შეინახა.', 'error');
    }
  };
  const resetLogo = async () => {
    if (!window.confirm('დავაბრუნო სკოლის თავდაპირველი ლოგო?')) return;
    await deleteDoc(doc(db, 'settings', 'logo')).then(() => onMessage('თავდაპირველი ლოგო დაბრუნდა (გვერდის განახლების შემდეგ).', 'success')).catch(() => onMessage('ვერ შეიცვალა.', 'error'));
  };

  const admins = [...staff].filter(s => s.role !== 'teacher').sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role === 'superadmin' ? -1 : 1));
  const extra = staff.filter(s => s.role === 'superadmin' && s.email !== SUPER_ADMIN_EMAIL).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle icon={<Download />} title="სარეზერვო ასლი" hint="ყველა მონაცემი ერთ ფაილად: მოსწავლეები და მათი გზა, კლასები, დავალებები, დასწრება, ჩატის ტექსტი, ფსალმუნთა ჯგუფები, მოსახსენებელი სახელები." />
        <Btn icon={exporting ? <Loader2 className="animate-spin" /> : <Download />} disabled={!!exporting} onClick={exportAll}>
          {exporting ? `მზადდება… ${exporting}` : 'ექსპორტი (JSON)'}
        </Btn>
        <p className="mt-2 text-xs text-[#8a7a6a]">გირჩევ თვეში ერთხელ. ხმოვანი შეტყობინებების აუდიო ფაილში არ შედის.</p>
      </Card>

      <Card>
        <CardTitle icon={<ImageUp />} title="სკოლის ლოგო" />
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="ლოგო" className="w-20 h-20 rounded-2xl object-contain bg-white ring-1 ring-[#e8dcc8] p-1" referrerPolicy="no-referrer" />
          <div className="flex flex-wrap gap-2">
            <Btn kind="ghost" icon={<ImageUp />} onClick={() => file.current?.click()}>ახალი ლოგო</Btn>
            <Btn kind="ghost" icon={<RotateCcw />} onClick={resetLogo}>თავდაპირველი</Btn>
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={pickLogo} />
        </div>
      </Card>

      <Card>
        <CardTitle icon={<ShieldCheck />} title={`ადმინისტრაცია · ${admins.length}`} hint={`როლს „მომხმარებლებში“ ცვლი. სუპერადმინი მფლობელის გარდა: ${extra}/${MAX_EXTRA_SUPERADMINS}`} />
        <ul className="divide-y divide-[#f1e8d9]">
          {admins.map(a => (
            <li key={a.email} className="flex items-center gap-3 py-2.5">
              <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${a.role === 'superadmin' ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-[#efe5d4] text-[#4a3426]'}`}>
                {a.role === 'superadmin' ? <Crown className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#2a2017] truncate">{a.name || a.email}</span>
                <span className="block text-xs text-[#8a7a6a] truncate">{a.email}</span>
              </span>
              <Pill tone={a.role === 'superadmin' ? 'solid' : 'brown'}>{a.email === SUPER_ADMIN_EMAIL ? 'მფლობელი' : ROLE_LABEL[a.role]}</Pill>
            </li>
          ))}
        </ul>
      </Card>

      {isOwner && (
        <Card tone="paper">
          <CardTitle icon={<ListChecks />} title="უსაფრთხოების შემოწმება" hint="Firebase-ის კონსოლში ერთხელ გასაკეთებელი (console.firebase.google.com)" />
          <ol className="space-y-2 text-[14px] leading-relaxed text-[#4a3426] list-decimal pl-5 marker:text-[#7a2028] marker:font-bold">
            <li>Project settings → Users and permissions: მფლობელი (Owner) შენ ხარ.</li>
            <li>Firestore → Rules: ჩასვი პროექტის ფაილი <code className="text-[12px] bg-white px-1 rounded">firestore.rules</code> და Publish.</li>
            <li>Usage and billing → Budget alert: შეტყობინება, თუ ხარჯი გაჩნდება.</li>
            <li>Google Cloud → APIs → Credentials: API გასაღები შეზღუდე საიტის მისამართებზე.</li>
            <li>Authentication → Settings → Authorized domains: მხოლოდ საიტის მისამართები.</li>
          </ol>
        </Card>
      )}
    </div>
  );
};
