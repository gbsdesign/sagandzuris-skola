import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightLeft, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { FOLK_EXTRA_REGIONS, FOLK_REGIONS, FOLK_SONGS, FolkRegionId, getFolkRegion } from '../../data/songsData';
import { ALBUM_RECS, CHANT_ALBUMS, ChantAlbumId, getChantAlbum } from '../../data/chantAlbums';
import { Placement, moveRecordings, originalPlace, placementOf, resetRecordings } from '../../data/placements';
import { triggerHaptic } from '../../utils/haptics';

// „გადატანა“ of one recording (or of all a song's recordings): to a region and song title among the songs, or to an
// album and chant title among the chant recordings. Only the owner and the superadmins see it.

const REGIONS = [...FOLK_REGIONS, ...FOLK_EXTRA_REGIONS];

const placeName = (p?: Placement) =>
  !p ? '' : p.kind === 'song' ? `სიმღერა · ${getFolkRegion(p.region)?.nameGe ?? p.region} · ${p.title}` : `გალობა · ${getChantAlbum(p.album)?.title ?? p.album} · ${p.title}`;

export interface MoveTarget {
  /** the recording the button belongs to */
  id: string;
  /** where it is now */
  from: Placement;
  /** who sings it, for the heading */
  who: string;
  /** a song's other recordings: "the whole song" moves them together */
  songRecIds?: string[];
}

export const MoveSheet: React.FC<{ target: MoveTarget; onClose: () => void }> = ({ target, onClose }) => {
  const { from } = target;
  const [kind, setKind] = useState<'song' | 'chant'>(from.kind);
  const [region, setRegion] = useState<FolkRegionId>(from.kind === 'song' ? from.region : 'unsure');
  const [album, setAlbum] = useState<ChantAlbumId>(from.kind === 'chant' ? from.album : 'unsure');
  const [title, setTitle] = useState(from.title);
  const whole = (target.songRecIds?.length ?? 0) > 1;
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ids = all && target.songRecIds ? target.songRecIds : [target.id];
  const moved = ids.some(id => placementOf(id));
  const home = originalPlace(target.id);

  // titles already in the chosen place, offered while typing
  const titles = useMemo(() => {
    const list = kind === 'song' ? FOLK_SONGS.filter(s => s.region === region).map(s => s.title) : (ALBUM_RECS[album] ?? []).map(r => r[1]);
    return [...new Set(list)].sort((a, b) => a.localeCompare(b, 'ka'));
  }, [kind, region, album]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (job: () => Promise<void>) => {
    triggerHaptic(15);
    setBusy(true);
    setError('');
    try {
      await job();
      onClose();
    } catch {
      setError('ვერ შეინახა. შეამოწმეთ ინტერნეტი ან უფლება და სცადეთ ხელახლა.');
      setBusy(false);
    }
  };
  const save = () => {
    const t = title.trim();
    if (!t) { setError('დაწერეთ სათაური.'); return; }
    const to: Placement = kind === 'song' ? { kind, region, title: t } : { kind, album, title: t };
    void run(() => moveRecordings(ids, to));
  };

  const field = 'w-full min-h-12 rounded-xl border border-[#e2d3bb] bg-white px-3 text-[16px] text-[#2a2017] focus:outline-none focus:border-[#d9a55a] focus:ring-[3px] focus:ring-[#b4620e]/15';

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-[#2a2017]/45 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-sheet-title"
        onClick={e => e.stopPropagation()}
        className="galoba-font w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain bg-[#faf6ef] rounded-t-3xl sm:rounded-3xl shadow-2xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-[#7a2028] text-white flex items-center justify-center"><ArrowRightLeft className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <h2 id="move-sheet-title" className="font-serif-ge text-[19px] font-bold leading-tight text-[#7a2028]">გადატანა</h2>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#8c7c6b] break-words">{target.who} · ახლა: {placeName(from)}</p>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#8c7c6b] hover:bg-[#efe5d4] cursor-pointer" aria-label="დახურვა">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* songs or chants */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#efe5d4]" role="radiogroup" aria-label="სად">
          {(['song', 'chant'] as const).map(k => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => { triggerHaptic(10); setKind(k); }}
              className={`min-h-11 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${kind === k ? 'bg-white text-[#7a2028] shadow-sm' : 'text-[#8c7c6b]'}`}
            >
              {k === 'song' ? 'სიმღერები' : 'გალობა'}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-[#574739]">{kind === 'song' ? 'კუთხე' : 'ალბომი'}</span>
          {kind === 'song' ? (
            <select value={region} onChange={e => setRegion(e.target.value as FolkRegionId)} className={field}>
              {REGIONS.map(r => <option key={r.id} value={r.id}>{r.nameGe}</option>)}
            </select>
          ) : (
            <select value={album} onChange={e => setAlbum(e.target.value as ChantAlbumId)} className={field}>
              {CHANT_ALBUMS.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-bold text-[#574739]">{kind === 'song' ? 'სიმღერა' : 'საგალობელი'}</span>
          <input value={title} onChange={e => setTitle(e.target.value)} list="move-sheet-titles" className={field} placeholder="სათაური" />
          <datalist id="move-sheet-titles">{titles.map(t => <option key={t} value={t} />)}</datalist>
          <span className="text-[11.5px] leading-snug text-[#a0907c]">
            {kind === 'song' ? 'იგივე სახელი იმავე კუთხეში — ჩანაწერი იმ სიმღერას დაემატება; ახალი სახელი — ახალი სიმღერა.' : 'სათაური, რომლითაც ალბომში გამოჩნდება.'}
          </span>
        </label>

        {whole && (
          <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="რა გადავიტანო">
            {[false, true].map(v => (
              <button
                key={String(v)}
                type="button"
                role="radio"
                aria-checked={all === v}
                onClick={() => setAll(v)}
                className={`min-h-11 px-3 rounded-xl border text-left text-[14px] font-semibold flex items-center gap-2.5 cursor-pointer ${all === v ? 'bg-white border-[#d9a55a] text-[#2a2017]' : 'border-[#e2d3bb] text-[#8c7c6b]'}`}
              >
                <span className={`w-4 h-4 shrink-0 rounded-full border-2 ${all === v ? 'border-[#7a2028] bg-[#7a2028] shadow-[inset_0_0_0_2px_#fff]' : 'border-[#cdbfa9]'}`} />
                {v ? `მთელი სიმღერა (${target.songRecIds!.length} ჩანაწერი)` : 'მხოლოდ ეს ჩანაწერი'}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-[13px] font-semibold text-[#9a3412]">{error}</p>}

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="flex-1 min-w-[10rem] min-h-12 rounded-full bg-[#7a2028] text-white text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <LoaderCircle className="w-4 h-4 animate-spin" />}
            გადატანა
          </button>
          {moved && home && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => resetRecordings(ids))}
              className="flex-1 min-w-[10rem] min-h-12 px-4 rounded-full bg-white border border-[#e2d3bb] text-[14px] font-bold text-[#574739] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              title={placeName(home)}
            >
              <RotateCcw className="w-4 h-4" />
              თავდაპირველ ადგილზე
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
