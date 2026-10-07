import React, { useMemo, useState } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { Check, ChevronDown, Hourglass, Search, ShieldAlert, SlidersHorizontal, UserCheck, X } from 'lucide-react';
import { db } from '../../firebase';
import { useAuth, SUPER_ADMIN_EMAIL } from '../../context';
import { agoLabel } from '../../hooks/useTeaching';
import { showPhone } from '../../utils/profileFields';
import { ALL_FEATURES, ALWAYS_OPEN, FEATURE_GROUPS, FeatureId, MemberStatus } from '../../utils/memberAccess';
import { Avatar, Btn, Card, CardTitle, FIELD, Pill, Sheet, Toggle } from '../ui/kit';
import type { StaffRecord, UserRecord } from './UsersTab';

// „ახალი წევრები“ (superadmins only), above the users list: who waits to be let in, who was refused (and how often
// they tried again), and what each member let in may open. Letting in asks which features — all at once or one by
// one; the member never sees who decided or what was left out (utils/memberAccess).

export interface AccessRecord {
  status: MemberStatus;
  features: 'all' | FeatureId[];
  requestedAt?: string;
  attempts?: number;
  lastAttemptAt?: string;
  decidedAt?: string;
}
export interface DecisionRecord { by?: string; at?: string }

export const toAccess = (d: any): AccessRecord => ({
  status: d.status === 'approved' || d.status === 'rejected' ? d.status : 'pending',
  features: d.features === 'all' ? 'all' : Array.isArray(d.features) ? d.features : [],
  requestedAt: d.requestedAt,
  attempts: d.attempts,
  lastAttemptAt: d.lastAttemptAt,
  decidedAt: d.decidedAt,
});

const VOICE: Record<string, string> = { '1': 'I ხმა', '2': 'II ხმა', '3': 'III ხმა' };
const featureCount = (f: 'all' | FeatureId[]) => (f === 'all' ? ALL_FEATURES.length : f.filter(x => ALL_FEATURES.includes(x)).length);

export const AccessRequests: React.FC<{
  users: UserRecord[];
  staff: StaffRecord[];
  access: Record<string, AccessRecord>;
  decisions: Record<string, DecisionRecord>;
  onMessage: (text: string, type: 'success' | 'error') => void;
}> = ({ users, staff, access, decisions, onMessage }) => {
  const { user } = useAuth();
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [q, setQ] = useState('');

  // staff never wait: they are left out of every list here
  const staffEmails = useMemo(() => new Set([SUPER_ADMIN_EMAIL, ...staff.map(s => s.email)]), [staff]);
  const members = useMemo(() => users.filter(u => !staffEmails.has(u.email.toLowerCase())), [users, staffEmails]);
  const pending = members
    .filter(u => access[u.userId]?.status === 'pending')
    .sort((a, b) => (access[a.userId].requestedAt || '').localeCompare(access[b.userId].requestedAt || ''));
  const refused = members
    .filter(u => access[u.userId]?.status === 'rejected')
    .sort((a, b) => (access[b.userId].lastAttemptAt || '').localeCompare(access[a.userId].lastAttemptAt || ''));
  // let in, or a member from before approvals (no request at all: everything)
  const admitted = useMemo(() => {
    const s = q.trim().toLowerCase();
    return members
      .filter(u => !access[u.userId] || access[u.userId].status === 'approved')
      .filter(u => !s || `${u.name} ${u.email}`.toLowerCase().includes(s))
      .sort((a, b) => a.name.localeCompare(b.name, 'ka'));
  }, [members, access, q]);

  const decide = async (u: UserRecord, status: 'approved' | 'rejected', features: 'all' | FeatureId[]) => {
    setBusy(u.userId);
    const at = new Date().toISOString();
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'memberAccess', u.userId), { status, features: status === 'approved' ? features : [], decidedAt: at }, { merge: true });
      b.set(doc(db, 'accessDecisions', u.userId), { by: user?.email || '', at, status, features: status === 'approved' ? features : [] });
      await b.commit();
      onMessage(status === 'approved' ? `${u.name} დაემატა.` : `${u.name}: დამატება შეფერხდა.`, 'success');
      return true;
    } catch {
      onMessage('ვერ შეინახა — შეამოწმეთ ინტერნეტი ან უფლებები.', 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const refuse = (u: UserRecord) => {
    if (!window.confirm(`${u.name} — დამატების შეფერხება? ის ანგარიშიდან გავა და შემდეგ შესვლებზეც ამას ნახავს, სანამ არ დაუშვებთ. მონაცემები შეინახება.`)) return;
    void decide(u, 'rejected', []);
  };

  return (
    <Card className="space-y-4">
      <CardTitle
        icon={<UserCheck />}
        title="ახალი წევრები"
        hint="ახალი წევრი ვერაფერს ხსნის, სანამ აქ არ დაუშვებთ. ვინ დაუშვა და რა შეეზღუდა, წევრი ვერ ხედავს."
      />

      {/* waiting */}
      {pending.length === 0 ? (
        <p className="flex items-center gap-2 text-[14px] text-[#8a7a6a] px-1">
          <Check className="w-4 h-4 text-emerald-700" /> ახალი მოთხოვნა არ არის.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-[13px] font-bold text-[#9a6212] px-1">
            <Hourglass className="w-4 h-4" /> ელოდება დადასტურებას · {pending.length}
          </p>
          {pending.map(u => {
            const a = access[u.userId];
            const facts = [
              u.birth && ['დაბადება', u.birth],
              (u.region || u.city) && ['ადგილი', [u.city, u.region].filter(Boolean).join(', ')],
              u.phone && ['ტელეფონი', showPhone(u.phone) || u.phone],
              u.abilities && ['შესაძლებლობები', u.abilities],
              u.interests && ['ინტერესები', u.interests],
              u.voices.length > 0 && ['ხმა', u.voices.map(v => VOICE[v] || v).join(', ')],
            ].filter(Boolean) as [string, string][];
            return (
              <div key={u.userId} className="rounded-2xl bg-[#fdf8ee] ring-1 ring-[#ecd9b4] p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} photo={u.photoURL} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#2a2017] truncate">{u.name}</p>
                    <p className="text-xs text-[#8a7a6a] truncate">{u.email || 'ელფოსტა არ არის'}</p>
                    <p className="text-xs text-[#8a7a6a]">
                      მოთხოვნა: {agoLabel(a.requestedAt)}{(a.attempts || 0) > 1 && <span className="whitespace-nowrap"> · შემოვიდა {a.attempts}-ჯერ</span>}
                    </p>
                  </div>
                </div>
                {facts.length > 0 ? (
                  <dl className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    {facts.map(([k, v]) => (
                      <div key={k} className="flex gap-1.5 min-w-0">
                        <dt className="text-[#8a7a6a] shrink-0">{k}:</dt>
                        <dd className="text-[#2a2017] font-medium break-words min-w-0">{v}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <Pill tone="amber">პროფილს ჯერ ავსებს</Pill>
                )}
                <div className="flex flex-wrap gap-2">
                  <Btn icon={<Check />} onClick={() => setEditing(u)} disabled={busy === u.userId} className="flex-1 min-w-[130px]">
                    დაშვება
                  </Btn>
                  <Btn kind="danger" icon={<X />} onClick={() => refuse(u)} disabled={busy === u.userId} className="flex-1 min-w-[130px]">
                    უარყოფა
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* refused */}
      {refused.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-[13px] font-bold text-[#9b2c2c] px-1">
            <ShieldAlert className="w-4 h-4" /> შეფერხებული · {refused.length}
          </p>
          <ul className="divide-y divide-[#f1e8d9] rounded-2xl ring-1 ring-[#efe3cf] bg-white/70 px-3">
            {refused.map(u => {
              const a = access[u.userId];
              const tries = Math.max(0, (a.attempts || 0) - 1);
              return (
                <li key={u.userId} className="flex items-center gap-3 py-3">
                  <Avatar name={u.name} photo={u.photoURL} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#2a2017] break-words leading-snug">{u.name}</p>
                    <p className="text-xs text-[#8a7a6a]">
                      {tries > 0 ? `შესვლის მცდელობა: ${tries} · ბოლოს ${agoLabel(a.lastAttemptAt)}` : `შეფერხდა ${agoLabel(a.decidedAt)}`}
                    </p>
                  </div>
                  <Btn kind="soft" size="sm" icon={<Check />} onClick={() => setEditing(u)} disabled={busy === u.userId}>დაშვება</Btn>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* let in: what each may open */}
      <div>
        <button
          type="button"
          onClick={() => setShowMembers(s => !s)}
          aria-expanded={showMembers}
          className="w-full min-h-[44px] flex items-center gap-2 px-1 text-left text-[14px] font-bold text-[#4a3426] cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#7a2028]" />
          <span className="flex-1">წევრების წვდომა · {members.filter(u => !access[u.userId] || access[u.userId].status === 'approved').length}</span>
          <ChevronDown className={`w-4 h-4 text-[#8a7a6a] transition-transform ${showMembers ? 'rotate-180' : ''}`} />
        </button>
        {showMembers && (
          <div className="mt-2 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ძებნა სახელით ან ელფოსტით" className={`${FIELD} pl-10`} />
            </div>
            <ul className="divide-y divide-[#f1e8d9] rounded-2xl ring-1 ring-[#efe3cf] bg-white/70 px-3">
              {admitted.map(u => {
                const a = access[u.userId];
                const n = a ? featureCount(a.features) : ALL_FEATURES.length;
                const by = decisions[u.userId]?.by;
                return (
                  <li key={u.userId} className="flex items-center gap-3 py-3">
                    <Avatar name={u.name} photo={u.photoURL} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#2a2017] break-words leading-snug">{u.name}</p>
                      <p className="text-xs text-[#8a7a6a] truncate">
                        {!a ? 'ძველი წევრი' : by ? `დაუშვა: ${by}` : 'დაშვებული'}
                      </p>
                      <Pill className="mt-1" tone={n === ALL_FEATURES.length ? 'green' : 'amber'}>
                        {!a || a.features === 'all' ? 'ყველაფერი' : `${n} / ${ALL_FEATURES.length}`}
                      </Pill>
                    </div>
                    <Btn kind="ghost" size="sm" onClick={() => setEditing(u)} disabled={busy === u.userId}>შეცვლა</Btn>
                  </li>
                );
              })}
              {admitted.length === 0 && <li className="py-6 text-center text-sm text-[#8a7a6a]">ვერ მოიძებნა.</li>}
            </ul>
          </div>
        )}
      </div>

      {editing && (
        <FeatureSheet
          key={editing.userId}
          who={editing}
          current={access[editing.userId]}
          busy={busy === editing.userId}
          onClose={() => setEditing(null)}
          onRefuse={access[editing.userId]?.status === 'approved' || !access[editing.userId]
            ? () => { const u = editing; setEditing(null); refuse(u); }
            : undefined}
          onSave={async f => { if (await decide(editing, 'approved', f)) setEditing(null); }}
        />
      )}
    </Card>
  );
};

/** Which features a member may open: everything at once, or one by one. */
const FeatureSheet: React.FC<{
  who: UserRecord;
  current?: AccessRecord;
  busy: boolean;
  onClose: () => void;
  onSave: (f: 'all' | FeatureId[]) => void;
  onRefuse?: () => void;
}> = ({ who, current, busy, onClose, onSave, onRefuse }) => {
  const admitted = !current || current.status === 'approved';
  // a newcomer starts with everything ticked; a member keeps what they have
  const start = !current || current.status !== 'approved' ? 'all' : current.features;
  const [all, setAll] = useState(start === 'all');
  const [picked, setPicked] = useState<Set<FeatureId>>(() => new Set(start === 'all' ? ALL_FEATURES : start));
  const toggle = (id: FeatureId) => setPicked(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const none = !all && picked.size === 0;

  const footer = (
    <div className="flex flex-wrap items-center gap-2">
      <Btn kind="ghost" size="lg" onClick={onClose} disabled={busy}>გაუქმება</Btn>
      <Btn size="lg" icon={<Check />} className="flex-1 min-w-[170px]" disabled={busy || none}
        onClick={() => onSave(all ? 'all' : ALL_FEATURES.filter(f => picked.has(f)))}>
        {busy ? 'ინახება…' : none ? 'აირჩიეთ ერთი მაინც' : admitted && current ? 'შენახვა' : 'დაშვება'}
      </Btn>
    </div>
  );

  return (
    <Sheet open onClose={onClose} title={`წვდომა — ${who.name}`} footer={footer} wide>
      <div className="space-y-4 py-1">
        <div className="rounded-2xl bg-[#7a2028]/[0.05] ring-1 ring-[#7a2028]/15 px-4">
          <Toggle
            on={all}
            onChange={on => { setAll(on); if (on) setPicked(new Set(ALL_FEATURES)); }}
            label="ყველაფერზე წვდომა"
            hint="ყველა განყოფილება და ის ახალიც, რაც მომავალში დაემატება"
          />
        </div>

        {FEATURE_GROUPS.map(g => (
          <section key={g.title}>
            <h3 className="px-1 mb-1.5 text-[13px] font-bold text-[#75685a]">{g.title}</h3>
            <div className="space-y-1.5">
              {g.items.map(it => {
                const on = all || picked.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => { if (all) { setAll(false); setPicked(new Set(ALL_FEATURES.filter(f => f !== it.id))); } else toggle(it.id); }}
                    className={`w-full min-h-[56px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left cursor-pointer transition ${
                      on ? 'bg-white ring-2 ring-[#7a2028]/70' : 'bg-white/60 ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'
                    }`}
                  >
                    <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-lg ${on ? 'bg-[#7a2028] text-white' : 'bg-white ring-2 ring-[#d9c8ac]'}`} aria-hidden>
                      {on && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-[#2a2017]">{it.label}</span>
                      <span className="block text-[13px] text-[#8a7a6a] leading-snug">{it.text}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="px-1 text-[13px] text-[#8a7a6a] leading-relaxed">{ALWAYS_OPEN} არჩეულის გარდა დანარჩენი წევრს უბრალოდ არ უჩანს.</p>

        {onRefuse && (
          <button type="button" onClick={onRefuse} disabled={busy}
            className="mx-auto flex items-center gap-1.5 min-h-[44px] px-3 text-[14px] font-semibold text-[#9b2c2c] underline underline-offset-4 cursor-pointer">
            <ShieldAlert className="w-4 h-4" /> დამატების შეფერხება
          </button>
        )}
      </div>
    </Sheet>
  );
};
