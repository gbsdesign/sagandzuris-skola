import { createContext, useContext, useState } from 'react';
import type { AdminData } from '../../../components/admin/useAdminData';
import type { Filter, UserRecord } from '../../../components/admin/UsersTab';
import type { Say } from './parts';

/** What every screen of the panel shares: the data, the filters' tests, the twins, the way to a step and the message line. */
export interface AdminCtx {
  d: AdminData;
  test: Record<Filter, (u: UserRecord) => boolean>;
  statusOf: (u: UserRecord) => string | undefined;
  twins: Map<string, { uid: string; why: 'phone' | 'name' }[]>;
  twinIds: ReadonlySet<string>;
  /** a step of the panel (nav.ts); `replace` swaps the step on screen */
  go: (item: string | null, replace?: boolean) => void;
  back: () => void;
  say: Say;
  fail: (text: string) => void;
  /** a computer: the list and the person side by side */
  wide: boolean;
}

export const AdminContext = createContext<AdminCtx | null>(null);
export const useAdmin = () => {
  const c = useContext(AdminContext);
  if (!c) throw new Error('useAdmin outside the admin panel');
  return c;
};

/** A search field's text kept for the visit (sessionStorage): it is still there after a person or a class was opened and
 *  „უკან“ came back (the screen unmounts in between). */
export const useKeptText = (key: string): [string, (v: string) => void] => {
  const k = `sg-admin-q-${key}`;
  const [v, setV] = useState(() => { try { return sessionStorage.getItem(k) || ''; } catch { return ''; } });
  return [v, (x: string) => { setV(x); try { sessionStorage.setItem(k, x); } catch { /* private mode */ } }];
};
