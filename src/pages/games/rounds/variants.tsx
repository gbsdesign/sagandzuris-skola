import React, { useState } from 'react';
import { Users, Wifi } from 'lucide-react';
import { useOpenRequest, type OpenTarget } from '../../../utils/searchOpen';
import { Tabs } from '../../../components/ui/kit';

// A game whose „ონლაინ“ is played alone on the phone and whose „ჰიბრიდული“ is teams on one phone („დღის სიტყვა“,
// „ოთხეული“, 2026-11-01): two tabs, the one last used kept on the device; the hub's variant buttons ask for a tab.

type Tab = 'online' | 'table';

export const VariantPage: React.FC<{ target: OpenTarget; store: string; online: React.ReactNode; table: React.ReactNode }> = ({ target, store, online, table }) => {
  const [tab, setTabState] = useState<Tab>(() => { try { return localStorage.getItem(store) === 'table' ? 'table' : 'online'; } catch { return 'online'; } });
  const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem(store, t); } catch { /* private mode */ } };
  useOpenRequest(target, id => setTab(id === 'table' ? 'table' : 'online'));
  return (
    <div className="w-full max-w-2xl space-y-4">
      <Tabs cols={2} value={tab} onChange={setTab} items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ჰიბრიდული', Icon: Users }]} />
      {tab === 'online' ? online : table}
    </div>
  );
};
