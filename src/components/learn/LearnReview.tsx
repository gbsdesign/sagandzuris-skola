import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Pause, Play } from 'lucide-react';
import { useAuth } from '../../context';
import { findVersion } from '../../data/chantLookup';
import { FOLK_SONGS } from '../../data/songsData';
import { LearnRecord, parseLearnTakeId, parseSongPiece, pieceProgress } from '../../utils/learn';
import { PearlShine, VOICE_NAMES } from '../../utils/pearls';
import { shinePearl, takeUrl, usePearlTakes } from '../../hooks/usePearls';
import { askConfirm, Btn } from '../ui/kit';
import { chantName } from '../pearls/PearlSheet';
import { PartsBar } from './PartsBar';

// The member's learning mode in their window (teachers, admins): each piece's bar of parts (gold = learned), and the
// takes — hear a part the member sent and approve it („ჩათვლა“, kept in students.pearlShine under the take's id).
// Shown once the member has learned something.

export const pieceTitle = (piece: string) => {
  const song = parseSongPiece(piece);
  if (song) return FOLK_SONGS.find(s => s.id === song.songId)?.title || piece;
  const info = findVersion(piece);
  return info ? `${info.variant.bookNums?.[0] ? `№${info.variant.bookNums[0]} ` : ''}${chantName(info.chant.title)}` : piece;
};

export const LearnReview: React.FC<{
  uid: string; learning?: Record<string, LearnRecord>; parts?: Record<string, number>; shine?: Record<string, PearlShine>;
}> = ({ uid, learning = {}, parts = {}, shine = {} }) => {
  const { user } = useAuth();
  const pieces = Object.keys(learning);
  const takes = usePearlTakes(uid, pieces.length > 0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const stop = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(null);
  };
  useEffect(() => stop, []);
  if (!pieces.length) return null;

  const sent = Object.values(takes)
    .map(t => ({ t, id: parseLearnTakeId(t.id) }))
    .filter((x): x is { t: typeof x.t; id: NonNullable<typeof x.id> } => Boolean(x.id))
    .sort((a, b) => Number(Boolean(shine[a.t.id])) - Number(Boolean(shine[b.t.id])) || b.t.at.localeCompare(a.t.at));

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
    if (!on && !(await askConfirm({ title: 'ჩათვლის მოხსნა?', text: 'წევრი ამ ნაწილს ჩათვლილად აღარ დაინახავს.', ok: 'მოხსნა' }))) return;
    shinePearl(uid, id, on ? { voice: takes[id]?.voice || '1', by: user?.email || '', at: new Date().toISOString() } : null)
      .catch(e => setError('ვერ შეინახა: ' + (e?.message || e?.code || '')));
  };

  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#75685a]">
        <GraduationCap className="w-4 h-4 text-[#7a2028]" />
        სასწავლო რეჟიმი · {pieces.length} ნაწარმოები
      </p>
      <ul className="mt-2.5 space-y-2.5">
        {pieces.map(piece => {
          const total = parts[piece];
          const p = total > 0 ? pieceProgress(piece, learning[piece], total) : null;
          const n = p ? p.learned : Object.values(learning[piece] || {}).filter(r => r.level >= 1).length;
          return (
            <li key={piece}>
              <p className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#4a3426]">{pieceTitle(piece)}</span>
                <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#8a7a6a]">{p ? `${n}/${p.total}` : `ნასწავლი ${n}`}</span>
              </p>
              {p && <PartsBar p={p} className="mt-1" />}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12.5px] font-bold text-[#8a7a6a]">გამოგზავნილი ჩანაწერები</p>
      {sent.length > 0 ? (
        <ul className="mt-1 divide-y divide-[#f1e8d9]">
          {sent.map(({ t, id }) => (
            <li key={t.id} className="py-2.5 flex items-center gap-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-[#4a3426] truncate">{pieceTitle(id.piece)}</p>
                <p className="text-[12px] text-[#8a7a6a]">
                  {id.part === 'all' ? 'ნაწილები ერთად' : `ნაწილი ${id.part + 1}`} · {VOICE_NAMES[t.voice]}{t.score > 0 ? ` · ${t.score}%` : ''} · {t.at.slice(0, 10)}
                </p>
              </div>
              <button type="button" onClick={() => play(t.id)} aria-label={playing === t.id ? 'გაჩერება' : 'მოსმენა'}
                className="shrink-0 w-10 h-10 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center cursor-pointer hover:bg-[#7a2028]/[0.14]">
                {playing === t.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              {shine[t.id]
                ? <Btn kind="ghost" size="sm" onClick={() => approve(t.id, false)}>ჩათვლილია</Btn>
                : <Btn kind="primary" size="sm" onClick={() => approve(t.id, true)}>ჩათვლა</Btn>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[13px] text-[#8a7a6a]">ჯერ არ არის.</p>
      )}
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
    </div>
  );
};
