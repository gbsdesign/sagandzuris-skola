import React from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { Check } from 'lucide-react';
import { db } from '../../firebase';
import { ALL_FEATURES, FEATURE_GROUPS, FeatureId, MemberStatus } from '../../utils/memberAccess';
import { Toggle } from '../ui/kit';

// New members' access (superadmins only): the records, saving a decision, and the picker of what a member may
// open. Letting in asks which features — all at once or one by one; the member never sees who decided or what was
// left out (utils/memberAccess). Everything about one person is shown in their window (PersonSheet).

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

/** A superadmin's decision: the member's own record and, apart from it, who decided. */
export const saveAccess = async (uid: string, by: string, status: 'approved' | 'rejected', features: 'all' | FeatureId[]) => {
  const at = new Date().toISOString();
  const kept = status === 'approved' ? features : [];
  const b = writeBatch(db);
  b.set(doc(db, 'memberAccess', uid), { status, features: kept, decidedAt: at }, { merge: true });
  b.set(doc(db, 'accessDecisions', uid), { by, at, status, features: kept });
  await b.commit();
};

/** What a member may open: everything (and whatever comes later), or only the ticked features. */
export const AccessPicker: React.FC<{
  all: boolean;
  picked: Set<FeatureId>;
  onChange: (all: boolean, picked: Set<FeatureId>) => void;
}> = ({ all, picked, onChange }) => {
  const toggle = (id: FeatureId) => {
    const n = new Set(picked);
    if (n.has(id)) n.delete(id); else n.add(id);
    onChange(false, n);
  };
  return (
    <div className="space-y-4">
      <Toggle
        on={all}
        onChange={on => onChange(on, new Set(ALL_FEATURES))}
        label="ყველაფერზე წვდომა"
        hint={all ? 'ყველა განყოფილება და ის ახალიც, რაც მომავალში დაემატება' : `არჩეულია ${picked.size} / ${ALL_FEATURES.length}`}
      />
      {!all && FEATURE_GROUPS.map(g => (
        <section key={g.title}>
          <h4 className="px-1 mb-1.5 text-[13px] font-bold text-[#75685a]">{g.title}</h4>
          <div className="space-y-1.5">
            {g.items.map(it => {
              const on = picked.has(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(it.id)}
                  className={`w-full min-h-[52px] flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left cursor-pointer transition ${
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
    </div>
  );
};
