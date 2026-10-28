import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { useAuth } from '../../context';
import { CHESTS } from '../../data/pearls';
import { findVersion } from '../../data/chantLookup';
import { PearlRecord, PearlShine, isGolden, pearlState, VOICE_IDS, voiceBests } from '../../utils/pearls';
import { shinePearl, takeUrl, usePearlTakes } from '../../hooks/usePearls';
import { askConfirm, Btn } from '../ui/kit';
import { PearlIcon } from './PearlIcon';
import { STATE_TEXT, chantName } from './PearlSheet';

// The member's pearls in their window (teachers, admins): hear the best take and approve it („ჩათვლა“), after
// which the pearl shines for the member. Shown only once the member has played.
const ORDER = { polished: 0, tried: 1, shining: 2, new: 3 };
const ROMAN = { '1': 'I', '2': 'II', '3': 'III' } as const;
// „I 85% · II 60%“: the best in each voice sung
const bestsText = (rec: PearlRecord) => {
  const b = voiceBests(rec);
  return VOICE_IDS.filter(v => b[v] != null).map(v => `${ROMAN[v]} ${b[v]}%`).join(' · ');
};

export const PearlReview: React.FC<{ uid: string; pearls?: Record<string, PearlRecord>; shine?: Record<string, PearlShine> }> = ({ uid, pearls = {}, shine = {} }) => {
  const { user } = useAuth();
  const ids = CHESTS.flatMap(c => c.pearls).filter(id => pearls[id] || shine[id]);
  const takes = usePearlTakes(uid, ids.length > 0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);
  if (!ids.length) return null;

  const play = (id: string) => {
    if (playing === id) { stop(); return; }
    stop();
    const t = takes[id];
    if (!t) return;
    const url = takeUrl(t);
    const a = new Audio(url);
    a.onended = stop;
    audio.current = { a, url };
    setPlaying(id);
    a.play().catch(stop);
  };

  const approve = async (id: string, on: boolean) => {
    setError('');
    if (!on && !(await askConfirm({ title: 'ჩათვლის მოხსნა?', text: 'მარგალიტი აღარ იბრწყინებს.', ok: 'მოხსნა' }))) return;
    const voice = takes[id]?.voice || pearls[id]?.voice || '1';
    shinePearl(uid, id, on ? { voice, by: user?.email || '', at: new Date().toISOString() } : null)
      .catch(e => setError('ვერ შეინახა: ' + (e?.code === 'permission-denied' ? 'ბაზის წესებში pearlShine ჯერ არ არის დამატებული.' : e?.message || '')));
  };

  const rows = ids
    .map(id => ({ id, info: findVersion(id), state: pearlState(pearls[id], shine[id]) }))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state]);
  const polished = rows.filter(r => r.state === 'polished' || r.state === 'shining').length;
  const shining = rows.filter(r => r.state === 'shining').length;

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
      <p className="text-[13px] font-bold text-[#75685a]">მარგალიტები · გაპრიალებული {polished}{shining ? ` · ბრწყინავს ${shining}` : ''}</p>
      <ul className="mt-1 divide-y divide-[#f1e8d9]">
        {rows.map(({ id, info, state }) => (
          <li key={id} className="py-2.5 flex items-center gap-2.5">
            <PearlIcon state={state} golden={isGolden(pearls[id])} size={40} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-[#4a3426] truncate">
                {info ? `№${info.variant.bookNums?.[0]} ${chantName(info.chant.title)}` : id}
              </p>
              <p className="text-[12px] text-[#8a7a6a]">
                {STATE_TEXT[state]}{pearls[id] ? ` · ${bestsText(pearls[id])}` : ''}
              </p>
            </div>
            {takes[id] && (
              <button type="button" onClick={() => play(id)} aria-label={playing === id ? 'გაჩერება' : 'მოსმენა'}
                className="shrink-0 w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.14]">
                {playing === id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            )}
            {state === 'shining'
              ? <Btn kind="ghost" size="sm" onClick={() => approve(id, false)}>ჩათვლილია</Btn>
              : <Btn kind={state === 'polished' ? 'primary' : 'ghost'} size="sm" onClick={() => approve(id, true)}>ჩათვლა</Btn>}
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
    </div>
  );
};
