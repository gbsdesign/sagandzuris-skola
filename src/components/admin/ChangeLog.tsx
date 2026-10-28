import React, { useState } from 'react';
import { Archive, Baby, History, KeyRound, LayoutGrid, Loader2, School, ShieldCheck, Undo2, UserCheck, UserPlus } from 'lucide-react';
import { LogKind, useAdminLog } from '../../utils/adminLog';
import { shortDate } from '../../utils/dateNames';
import { Btn } from '../ui/kit';
import { Fold } from './Fold';

const ICON: Record<LogKind, React.ReactNode> = {
  role: <ShieldCheck />, access: <UserCheck />, class: <School />, archive: <Archive />, section: <LayoutGrid />,
  right: <KeyRound />, kids: <Baby />, member: <UserPlus />, undo: <Undo2 />,
};
const PAGE = 40;

const when = (iso: string) => {
  const d = new Date(iso);
  return `${shortDate(iso)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ⚙ „სკოლა“ → „ცვლილებების ჟურნალი“ (superadmins): who changed what and when, the newest first — roles, letting people
// in, classes and the archive, sections, rights, the kids' mode, and every „გაუქმება“. Lines are only added
// (utils/adminLog.ts); nobody can change or delete one.
export const ChangeLog: React.FC = () => {
  const [count, setCount] = useState(PAGE);
  const { lines, loading } = useAdminLog(true, count);
  const last = lines[0];
  return (
    <Fold icon={<History />} title="ცვლილებების ჟურნალი"
      summary={loading ? '…' : last ? `ბოლო: ${when(last.at)} · ${last.byName || last.by}` : 'ჯერ ცარიელია'}>
      {lines.length === 0 ? (
        <p className="py-1 text-[13px] text-[#8a7a6a]">{loading ? 'იტვირთება…' : 'ჯერ არაფერი შეცვლილა. აქ ჩაიწერება როლები, დაშვება, კლასები, განყოფილებები და უფლებები.'}</p>
      ) : (
        <ul>
          {lines.map(l => (
            <li key={l.id} className="flex items-start gap-3 py-2 border-b border-[#f1e8d9] last:border-0">
              <span className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-[#f4ece0] text-[#7a5a3a] flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">{ICON[l.kind] || <History />}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-[#2a2017] leading-snug break-words">{l.text}</span>
                <span className="block text-[12px] text-[#8a7a6a] leading-snug mt-0.5">{l.byName || l.by} · {when(l.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {lines.length >= count && (
        <div className="pt-2">
          <Btn size="sm" kind="ghost" icon={loading ? <Loader2 className="animate-spin" /> : undefined} onClick={() => setCount(c => c + PAGE)}>მეტის ჩვენება</Btn>
        </div>
      )}
    </Fold>
  );
};
