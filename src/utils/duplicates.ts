// „შესაძლო ორმაგი“ (admin panel, 2026-10-28): two accounts that may be one person — the same phone number (its last nine
// digits, so „+995 599 12 34 56“ and „599123456“ meet) or the same full name (case, spaces and a missing surname aside:
// a name of one word never counts, „ნინო“ alone is too common). Only a hint for the admin, nothing is merged.

export interface DupPerson { userId: string; name: string; phone?: string }

const phoneKey = (p?: string) => {
  const d = (p || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const nameKey = (n: string) => {
  const parts = n.toLocaleLowerCase('ka').replace(/[^\p{L}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts.join(' ') : '';
};

/** For each person who may have a twin: the others, and why („ტელეფონი“ / „სახელი“). */
export const duplicatesOf = (people: DupPerson[]): Map<string, { uid: string; why: 'phone' | 'name' }[]> => {
  const groups = new Map<string, string[]>();
  const add = (key: string, uid: string) => groups.set(key, [...(groups.get(key) || []), uid]);
  for (const p of people) {
    const phone = phoneKey(p.phone), name = nameKey(p.name);
    if (phone) add(`p:${phone}`, p.userId);
    if (name) add(`n:${name}`, p.userId);
  }
  const out = new Map<string, { uid: string; why: 'phone' | 'name' }[]>();
  for (const [key, uids] of groups) {
    if (uids.length < 2) continue;
    const why = key.startsWith('p:') ? 'phone' : 'name';
    for (const uid of uids) {
      const list = out.get(uid) || [];
      for (const other of uids) if (other !== uid && !list.some(x => x.uid === other)) list.push({ uid: other, why });
      out.set(uid, list);
    }
  }
  return out;
};
