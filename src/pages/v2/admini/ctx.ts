import { createContext, useContext } from 'react';
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
