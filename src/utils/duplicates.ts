// „შესაძლო ორმაგი“ (admin panel, 2026-10-28): two accounts that may be one person — the same phone number (its last nine
// digits, so „+995 599 12 34 56“ and „599123456“ meet) or the same full name (case, spaces and a missing surname aside:
// a name of one word never counts, „ნინო“ alone is too common). Only a hint for the admin, nothing is merged.
// Since 2026-11-06 a pair an admin marked „სხვა ადამიანია“ (`settings/notTwins`, utils/notTwins) is left out — pass their
// `pairKey`s as `skip`; the caller also leaves out the members marked „გასული“.

export interface DupPerson { userId: string; name: string; phone?: string }
export type DupWhy = 'phone' | 'name';

const phoneKey = (p?: string) => {
  const d = (p || '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const nameKey = (n: string) => {
  const parts = n.toLocaleLowerCase('ka').replace(/[^\p{L}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  return parts.length >= 2 ? parts.join(' ') : '';
};

/** One key for a pair, the same whichever comes first. */
export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** For each person who may have a twin: the others, and why („ტელეფონი“ / „სახელი“; the phone wins when both). */
export const duplicatesOf = (people: DupPerson[], skip: ReadonlySet<string> = new Set()): Map<string, { uid: string; why: DupWhy }[]> => {
  const groups = new Map<string, string[]>();
  const add = (key: string, uid: string) => groups.set(key, [...(groups.get(key) || []), uid]);
  for (const p of people) {
    const phone = phoneKey(p.phone), name = nameKey(p.name);
    if (phone) add(`p:${phone}`, p.userId);
    if (name) add(`n:${name}`, p.userId);
  }
  const out = new Map<string, { uid: string; why: DupWhy }[]>();
  // phones first, so a pair that shares both says „ტელეფონი“
  const keys = [...groups.keys()].sort((a, b) => Number(b.startsWith('p:')) - Number(a.startsWith('p:')));
  for (const key of keys) {
    const uids = groups.get(key)!;
    if (uids.length < 2) continue;
    const why: DupWhy = key.startsWith('p:') ? 'phone' : 'name';
    for (const uid of uids) {
      const list = out.get(uid) || [];
      for (const other of uids) {
        if (other === uid || skip.has(pairKey(uid, other)) || list.some(x => x.uid === other)) continue;
        list.push({ uid: other, why });
      }
      if (list.length) out.set(uid, list);
    }
  }
  return out;
};

/** The row's short reason: the phone when any twin shares it, else the name. */
export const whyLabel = (list: { why: DupWhy }[] = []) =>
  list.some(t => t.why === 'phone') ? 'იგივე ტელეფონი' : 'იგივე სახელი';
