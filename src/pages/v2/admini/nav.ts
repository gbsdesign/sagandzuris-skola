// Steps of the admin panel in the new look (redesign stage 7). The page `admin` keeps its open part in the navigation's
// `mapItem` (NavigationContext MAP_PAGES), so the phone's back walks them in order:
//   (none)              the panel (x-admini)
//   `people[~<filter>]` everyone, by the alphabet (x-savse-adamianebi)   · `pick` several at once (x-monishvna)
//   `p/<uid>[/<sub>]`   a person (x-adamiani, x-adamiani-elodeba); sub = data · classes · role · access · note · albums · edit
//   `classes[~archive]` the classes (x-admini-klasebi, x-savse-klasebi)  · `teachers` (x-admini-mastsavleblebi)
//   `school[/<part>]`   the school's settings (x-skola) and each of its pages
import type { Filter } from '../../../components/admin/UsersTab';

export type PersonSub = 'data' | 'classes' | 'role' | 'access' | 'note' | 'albums' | 'edit';
export type SchoolPart = 'announce' | 'notices' | 'sections' | 'rights' | 'albums' | 'google' | 'roles' | 'numbers' | 'top' | 'log' | 'errors';

export type AdminStep =
  | { at: 'home' }
  | { at: 'people'; filter: Filter }
  | { at: 'pick' }
  | { at: 'person'; uid: string; sub: PersonSub | null }
  | { at: 'classes'; archive: boolean }
  | { at: 'teachers' }
  | { at: 'school'; part: SchoolPart | null };

const SUBS: PersonSub[] = ['data', 'classes', 'role', 'access', 'note', 'albums', 'edit'];
const PARTS: SchoolPart[] = ['announce', 'notices', 'sections', 'rights', 'albums', 'google', 'roles', 'numbers', 'top', 'log', 'errors'];

export const stepOf = (item: string | null | undefined): AdminStep => {
  if (!item) return { at: 'home' };
  if (item === 'pick') return { at: 'pick' };
  if (item === 'teachers') return { at: 'teachers' };
  if (item === 'classes' || item === 'classes~archive') return { at: 'classes', archive: item.endsWith('archive') };
  if (item === 'people' || item.startsWith('people~')) return { at: 'people', filter: (item.split('~')[1] || 'all') as Filter };
  if (item.startsWith('p/')) {
    const [, uid, sub] = item.split('/');
    if (uid) return { at: 'person', uid, sub: SUBS.includes(sub as PersonSub) ? (sub as PersonSub) : null };
  }
  if (item === 'school' || item.startsWith('school/')) {
    const part = item.split('/')[1] as SchoolPart;
    return { at: 'school', part: PARTS.includes(part) ? part : null };
  }
  return { at: 'home' };
};

export const personItem = (uid: string, sub?: PersonSub) => `p/${uid}${sub ? `/${sub}` : ''}`;
export const peopleItem = (filter: Filter = 'all') => (filter === 'all' ? 'people' : `people~${filter}`);
export const schoolItem = (part?: SchoolPart) => (part ? `school/${part}` : 'school');
