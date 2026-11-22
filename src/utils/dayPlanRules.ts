// Pure rules of „დღის მსახურება“'s chant list (utils/dayPlan.ts keeps the store).

export const planKey = (iso: string, service: string) => `${iso}~${service}`;

/** the service's chants as the Typikon orders its steps, each once */
export const autoChants = (steps: { chants?: string[] }[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of steps) for (const id of s.chants ?? []) if (!seen.has(id)) { seen.add(id); out.push(id); }
  return out;
};

/** the list shown: the member's own order when kept (only chants that still exist), else the Typikon's */
export const planList = (saved: string[] | undefined, auto: string[], known: (id: string) => boolean): string[] => {
  if (!saved) return auto;
  const out: string[] = [];
  for (const id of saved) if (known(id) && !out.includes(id)) out.push(id);
  return out;
};

/** one item moved from → to */
export const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
};

/** Lado's answer → the chants it named that are among the offered, in its order; null when it gave none */
export const parsePlan = (raw: string, offered: Set<string>): { ids: string[]; note: string } | null => {
  const m = /\{[\s\S]*\}/.exec(raw);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { ids?: unknown; note?: unknown };
    const ids = Array.isArray(j.ids) ? [...new Set(j.ids.filter((x): x is string => typeof x === 'string' && offered.has(x)))] : [];
    if (!ids.length) return null;
    return { ids, note: typeof j.note === 'string' ? j.note.trim().slice(0, 400) : '' };
  } catch {
    return null;
  }
};
