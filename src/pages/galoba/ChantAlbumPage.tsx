import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Headphones, LoaderCircle, Pause, Play } from 'lucide-react';
import { ALBUM_RECS, AlbumRec, getChantAlbum } from '../../data/chantAlbums';
import { AUDIO_PROXY } from '../../data/chantMediaRegistry';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../context';
import { usePlacements } from '../../data/placements';
import { MoveSheet, MoveTarget } from '../../components/archive/MoveSheet';
import { stopPreview } from '../../utils/listPreview';
import { triggerHaptic } from '../../utils/haptics';

// One album of chant recordings without notes (a choir, a school, „დასაზუსტებელი“): the list grouped by performer,
// one recording sounds at a time; the playing one shows a bar to move through it. Nothing plays by itself.

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

type Phase = 'loading' | 'playing' | 'paused';

const useAlbumPlayer = () => {
  const audio = useRef<HTMLAudioElement | null>(null);
  const current = useRef<string | null>(null);
  const [cur, setCur] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('paused');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    // hiding the app pauses; leaving the album stops
    const onHide = () => { if (document.hidden) audio.current?.pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      const a = audio.current;
      if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
    };
  }, []);

  const element = () => {
    if (audio.current) return audio.current;
    const a = new Audio();
    a.preload = 'metadata';
    a.ontimeupdate = () => setTime(a.currentTime);
    a.ondurationchange = () => setDur(Number.isFinite(a.duration) ? a.duration : 0);
    a.onwaiting = () => setPhase('loading');
    a.onplaying = () => setPhase('playing');
    a.onpause = () => setPhase('paused');
    a.onended = () => setPhase('paused');
    a.onerror = () => setPhase('paused');
    return (audio.current = a);
  };

  const play = (a: HTMLAudioElement, id: string) => {
    stopPreview();
    a.play().catch(() => { if (current.current === id) setPhase('paused'); });
  };

  const toggle = (id: string) => {
    triggerHaptic(12);
    const a = element();
    if (current.current === id) {
      if (a.paused) play(a, id);
      else a.pause();
      return;
    }
    current.current = id;
    setCur(id);
    setTime(0);
    setDur(0);
    setPhase('loading');
    a.src = `${AUDIO_PROXY}/${id}`;
    play(a, id);
  };

  const seek = (t: number) => {
    if (audio.current) audio.current.currentTime = t;
    setTime(t);
  };

  return { cur, phase, time, dur, toggle, seek };
};

export const ChantAlbumPage: React.FC<{ albumId: string }> = ({ albumId }) => {
  const album = getChantAlbum(albumId);
  const { can } = useAccess();
  const player = useAlbumPlayer();
  // the owner and the superadmins move a recording to another album or to the songs
  const { isSuperAdmin } = useAuth();
  const placed = usePlacements();
  const [moving, setMoving] = useState<MoveTarget | null>(null);

  // one block per performer, the largest first
  const groups = useMemo(() => {
    const map = new Map<string, AlbumRec[]>();
    for (const r of album ? ALBUM_RECS[album.id] : []) {
      if (!map.has(r[2])) map.set(r[2], []);
      map.get(r[2])!.push(r);
    }
    return [...map].sort((a, b) => b[1].length - a[1].length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album, placed]);

  if (!album) return null;
  const total = ALBUM_RECS[album.id].length;
  // a choir's album needs no performer heading: its title says it
  const oneGroup = groups.length === 1 && groups[0][0] === album.title;

  return (
    <div className="galoba-font w-full my-2 px-1 flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-3">
        <header className="mx-1 flex flex-col gap-1">
          <h1 className="font-serif-ge text-[22px] sm:text-2xl font-bold leading-tight text-[#7a2028] text-balance">{album.title}</h1>
          <p className="text-[13px] leading-snug text-[#8a7a6a]">{album.note}</p>
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#b4620e]">
            <Headphones className="w-3.5 h-3.5" />
            {total} ჩანაწერი
          </p>
        </header>

        {!can('recordings') ? (
          <p className="px-4 py-6 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e6d9c2] text-center text-[14px] text-[#8a7a6a]">
            ჩანაწერები სკოლის წევრებისთვისაა.
          </p>
        ) : (
          groups.map(([who, recs]) => (
            <section key={who} className="rounded-2xl bg-white ring-1 ring-[#e6d9c2] shadow-[0_1px_3px_rgba(74,52,38,0.06)] overflow-hidden">
              {!oneGroup && (
                <h2 className="px-4 py-2.5 bg-[#fbf6ec] border-b border-[#efe5d4] text-[13.5px] font-extrabold text-[#574739] flex items-baseline justify-between gap-3">
                  <span className="min-w-0">{who}</span>
                  <span className="shrink-0 text-[12px] font-semibold text-[#a0907c] tabular-nums">{recs.length}</span>
                </h2>
              )}
              <ul className="divide-y divide-[#efe5d4]">
                {recs.map(([id, title, recWho, note]) => {
                  const on = player.cur === id;
                  const phase = on ? player.phase : 'paused';
                  return (
                    <li key={id} className={`px-3.5 py-3 flex flex-col gap-2 transition-colors ${on ? 'bg-[#fcf6ea]' : ''}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => player.toggle(id)}
                          className={`shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7a2028] ${
                            on ? 'bg-[#7a2028] text-white shadow-[0_6px_14px_-6px_rgba(122,32,40,0.7)]' : 'bg-[#7a2028]/[0.07] text-[#7a2028] hover:bg-[#7a2028]/[0.12]'
                          }`}
                          aria-label={phase === 'playing' ? `პაუზა: ${title}` : `მოსმენა: ${title}`}
                        >
                          {phase === 'loading' ? (
                            <LoaderCircle className="w-5 h-5 animate-spin" />
                          ) : phase === 'playing' ? (
                            <Pause className="w-[18px] h-[18px] fill-current" />
                          ) : (
                            <Play className="w-[18px] h-[18px] fill-current translate-x-[1px]" />
                          )}
                        </button>
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <span className="text-[16px] font-bold leading-snug text-[#2a2017] break-words">{title}</span>
                          {note && <span className="text-[12.5px] leading-snug text-[#8c7c6b] break-words">{note}</span>}
                        </div>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => { triggerHaptic(10); setMoving({ id, from: { kind: 'chant', album: album.id, title }, who: recWho }); }}
                            className="ml-auto shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[#b4620e] hover:bg-[#fcf1df] cursor-pointer"
                            title="გადატანა"
                            aria-label={`გადატანა: ${title}`}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {on && (
                        <div className="flex items-center gap-2.5 pl-[58px] max-[359px]:pl-0">
                          <span className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{clock(player.time)}</span>
                          <input
                            type="range"
                            min={0}
                            max={player.dur || 0}
                            step={0.5}
                            value={Math.min(player.time, player.dur || 0)}
                            onChange={e => player.seek(Number(e.target.value))}
                            disabled={!player.dur}
                            className="flex-1 min-w-0 h-8 accent-[#7a2028] cursor-pointer disabled:opacity-40"
                            aria-label="გადახვევა"
                          />
                          <span className="w-9 text-[11.5px] font-semibold tabular-nums text-[#8c7c6b]">{player.dur ? clock(player.dur) : '–:––'}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
      {moving && <MoveSheet target={moving} onClose={() => setMoving(null)} />}
    </div>
  );
};
