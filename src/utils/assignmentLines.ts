import { findVersion, schoolOf } from '../data/chantLookup';
import { isChantGroup, variantLines, versionMeta } from '../data/tsirvaChants';

// An assignment's card (2026-11-04, the user: „დამაბნეველი ბარათი თვალს ღლის“): the chant's own name big, one grey line
// under it (the kind, tone and style, the service), and the book's place apart — shown only when the card is unfolded.
// „გ.ს. IV ტომი · ნათლისმცემელო ქრისტესო, ხმა ვ, გამშვენებული · გვ. 17 (ტროპარი · №20 · ყველიერის კვირის მწუხრი)“ →
// name „ნათლისმცემელო ქრისტესო“, line „ტროპარი · ხმა ვ · გამშვენებული · ყველიერის კვირის მწუხრი“, book „გ.ს. IV ტომი · №20 · გვ. 17“.

export interface AssignmentLines {
  name: string;
  /** the small line under the name ('' when there is nothing to add) */
  line: string;
  /** where it is printed ('' when unknown) */
  book: string;
}

/** A title closing on a bracket — „… (145 ხუნდაძე, გვ. 205)“ — keeps the bracket as its line. */
export const splitTitle = (title: string): AssignmentLines => {
  const m = title.match(/^(.*\S)\s*\(([^()]+)\)\s*$/);
  return m ? { name: m[1], line: m[2], book: '' } : { name: title, line: '', book: '' };
};

const join = (parts: (string | false | undefined)[]) => {
  const seen = new Set<string>();
  return parts
    .map(p => (p || '').trim())
    .filter(p => p && !seen.has(p) && (seen.add(p), true))
    .join(' · ');
};

/** The name, line and book of an assigned chant or song (`title` is the assignment's stored title, used when the
 *  version is not in the books — a folk song, an old id). */
export const assignmentLines = (variantId: string | undefined, title: string): AssignmentLines => {
  const info = variantId ? findVersion(variantId) : undefined;
  if (!info) return splitTitle(title);
  const { chant, variant: v } = info;
  const group = isChantGroup(chant.id) ? chant.title.replace(/[;\s]+$/, '') : '';
  if (v.version === undefined || !v.page) {
    return { name: v.chantName || chant.title, line: join([versionMeta(chant.id, chant.title, v), group]), book: '' };
  }
  const L = variantLines(chant.id, chant.title, v);
  // „ნათლისმცემელო ქრისტესო, ხმა ვ, გამშვენებული“: the name before the first comma, the rest goes to the line
  const [main, ...rest] = L.name.split(/,\s*/);
  const school = schoolOf(v.code);
  return {
    name: main || L.name,
    line: join([
      L.source !== L.name && !L.version.includes(L.source) && L.source,
      L.version !== L.name && L.version,
      ...rest,
      group,
    ]),
    book: join([/^\S+\.\S*\.$/.test(school) ? `${school} ${L.card.top}` : L.card.top]),
  };
};
