import React, { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { aiGate } from '../../utils/aiRules';
import { NO_BUDGET_LINE, NO_NET_LINE } from '../../utils/aiLesson';
import { Helper } from '../ui2';

// Without the internet or the AI's money (board x-ai-ugareshe): one quiet line over the step — the lesson itself needs
// neither (the notes are measured on the phone, the words are ready sentences), so it simply goes on. The month's budget
// (the school's or the member's own, utils/aiRules aiGate) is asked once a visit, and again when the internet comes back.

export type NetWhy = 'offline' | 'budget' | null;

export const useNetWhy = (uid: string | null): NetWhy => {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  const [budget, setBudget] = useState(false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => {
    if (!uid || !online) return;
    let alive = true;
    void aiGate(uid).then(why => alive && setBudget(why === 'budget'));
    return () => { alive = false; };
  }, [uid, online]);
  return !online ? 'offline' : budget ? 'budget' : null;
};

export const NetLineView: React.FC<{ why: NetWhy }> = ({ why }) => (why ? (
  <div className="shrink-0 px-4 pb-3" role="status">
    <Helper icon={<CloudOff />}>{why === 'offline' ? NO_NET_LINE : NO_BUDGET_LINE}</Helper>
  </div>
) : null);

export const NetLine: React.FC<{ uid: string | null }> = ({ uid }) => <NetLineView why={useNetWhy(uid)} />;
