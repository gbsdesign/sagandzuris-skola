import React, { useEffect, useState } from 'react';
import { Check, CloudDownload, Download, Loader2 } from 'lucide-react';
import { cacheAudio, isAudioCached, removeCachedAudio } from '../../utils/audioCache';
import { getAudioArrayBufferFromIdb } from '../../utils/audioIdb';
import { saveBlob } from '../../utils/chantSynth';
import { triggerHaptic } from '../../utils/haptics';
import { albumRight, useAlbumAccess } from '../../data/albumAccess';
import { useCanDownloadCentre } from '../../hooks/useCentreDownload';
import type { SongTake } from './SongPage';

// Two small round buttons beside a song's recording in the list (2026-11-09, the user: „სიმღერას უნდა ჰქონდეს mp3
// ჩამოტვირთვა და ოფლაინ პატარა ღილაკი გვერდზე“): ⬇ saves the recording as an MP3 file, ☁ keeps it on the phone for
// listening without the internet (the same store the player reads — a green ✓ when kept, a tap takes it off again).
// ⬇ shows only where the player would offer it (a Centre recording follows its album's ⬇ right).

const ROUND = 'w-9 h-9 shrink-0 rounded-full grid place-items-center transition-colors cursor-pointer disabled:cursor-default';

export const TakeTools: React.FC<{ take: SongTake; title: string }> = ({ take, title }) => {
  useAlbumAccess(); // an admin's switch applies at once
  const canSaveCentre = useCanDownloadCentre();
  const canSave = !take.centre || (take.album ? albumRight(take.album).download : canSaveCentre);
  const tracks = take.media.tracks.filter(Boolean) as string[];
  const main = take.media.tracks[3] || tracks[0];
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState<'mp3' | 'cloud' | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    if (tracks.length) Promise.all(tracks.map(t => isAudioCached(t))).then(all => alive && setKept(all.every(Boolean)), () => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks.join('|')]);

  if (!main || take.embed) return null;

  const mp3 = async () => {
    triggerHaptic(10);
    setBusy('mp3');
    setFailed(false);
    try {
      let buf = await getAudioArrayBufferFromIdb(main);
      if (!buf) {
        const res = await fetch(main);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      }
      saveBlob(new Blob([buf], { type: 'audio/mpeg' }), `${title} — ${take.label}.mp3`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const cloud = async () => {
    triggerHaptic(kept ? 8 : 15);
    setBusy('cloud');
    setFailed(false);
    try {
      if (kept) {
        await Promise.all(tracks.map(t => removeCachedAudio(t)));
        setKept(false);
      } else {
        const ok = await Promise.all(tracks.map(t => cacheAudio(t)));
        setKept(ok.every(Boolean));
        if (!ok.every(Boolean)) setFailed(true);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <span className="shrink-0 flex items-center gap-1">
      {canSave && (
        <button
          type="button"
          onClick={mp3}
          disabled={busy !== null}
          className={`${ROUND} ${failed ? 'bg-red-50 text-red-700' : 'bg-[#f7f1e6] text-[#8a4b12] hover:bg-[#fcf1df]'}`}
          aria-label={`MP3-ის ჩამოტვირთვა: ${take.label}`}
          title="MP3-ის ჩამოტვირთვა"
        >
          {busy === 'mp3' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        </button>
      )}
      <button
        type="button"
        onClick={cloud}
        disabled={busy !== null}
        aria-pressed={kept}
        className={`${ROUND} ${kept ? 'bg-emerald-600 text-white' : 'bg-[#f7f1e6] text-[#8a4b12] hover:bg-[#fcf1df]'}`}
        aria-label={kept ? `ოფლაინ შენახულია: ${take.label} — შეეხე მოსახსნელად` : `ოფლაინ შენახვა: ${take.label}`}
        title={kept ? 'ოფლაინ შენახულია — შეეხე მოსახსნელად' : 'ოფლაინ შენახვა'}
      >
        {busy === 'cloud' ? <Loader2 className="w-4 h-4 animate-spin" /> : kept ? <Check className="w-4 h-4 stroke-[3]" /> : <CloudDownload className="w-4 h-4" />}
      </button>
    </span>
  );
};
