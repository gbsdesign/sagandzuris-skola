import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play } from 'lucide-react';
import { Button, CheckButton, Duo, Note, Press, Rows, Sheet, cx, FOCUS_IN } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { useWatchedVideos } from '../../../hooks/useWatchedVideos';
import { AttachButton, simpleEntry } from '../../../components/attach/AttachButton';
import { PATH_PREFIX } from '../../../utils/pathPrefix';
import { ETNOFORI_CHANNEL, clock, embedOf, loadEtnofori, thumbOf, watchOf, type EtnoData } from '../../../data/etnofori';
import { MONASTERY_FILMS } from '../../../data/monasteryVideos';
import { PillRow, usePaged } from './parts';

// The videos of the new look (boards x-etnopori, x-pilmebi): one row a film — its still with the length, the name, a grey
// line, „ნანახია“ at the right (students.videosSeen, as the old lists) — and the film in a window over the list (YouTube's
// own player, a film's parts as pills, ‹ › through the list shown). The open film is a history step of its page (`stay`).

/** one film as a row and in the player; `place` = its pill (a village, a monastery); `meta` = a quiet line (a film's genres),
 *  `tag` = a small mark („უფროსებისთვის“); `parts` = a film in parts, played from the window */
export interface VFilm { id: string; title: string; sub: string; secs: number; place?: string; meta?: string; tag?: string; parts?: { id: string; label: string }[] }

export type FilmNav = { open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void };

/** „ეთნოფორი“'s list, loaded once a visit (a lazy chunk) */
export const useEtno = (on = true) => {
  const [data, setData] = useState<EtnoData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    loadEtnofori().then(d => alive && setData(d), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [on]);
  return { data, failed };
};

export const etnoSongs = (data: EtnoData, regionId?: string): VFilm[] => data.songs
  .filter(s => !regionId || s[3] === regionId)
  .map(s => ({ id: s[0], title: s[1], sub: s[2] || s[4], secs: s[5], place: s[4] }));

export const etnoEpisodes = (data: EtnoData): VFilm[] => data.episodes
  .map(e => ({ id: e[0], title: `გადაცემა №${e[1]}${e[3] ? ` · ${e[3]}` : ''}`, sub: e[2], secs: e[4], place: e[2].slice(-4) }));

export const monasteryFilms = (regionId: string): VFilm[] => MONASTERY_FILMS
  .filter(f => f[3] === regionId)
  .map(f => ({ id: f[0], title: f[1], sub: `${f[4]} · ${f[2]}`, secs: f[5], place: f[4] }));

/** a film's still with its length (YouTube's picture; dimmer once watched) — the boards' `thumb` */
const Still: React.FC<{ id: string; secs: number; seen: boolean }> = ({ id, secs, seen }) => (
  <span aria-hidden="true" className="relative flex h-16 w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-field bg-night-surf text-white">
    <img src={thumbOf(id)} alt="" loading="lazy" decoding="async" className={cx('absolute inset-0 size-full object-cover', seen ? 'opacity-60' : 'opacity-90')} />
    <span className="relative flex size-8 items-center justify-center rounded-full bg-night-surf/60">
      <Play className="size-4 fill-current" strokeWidth={1.5} />
    </span>
    {secs > 0 && (
      <span className="absolute right-1.5 bottom-[5px] rounded-chip bg-night-surf/80 px-[5px] py-px text-cap leading-tight font-bold tabular-nums">{clock(secs)}</span>
    )}
  </span>
);

/** the films in rows of one card, in steps of 40 */
export const VideoRows: React.FC<{ films: VFilm[]; onPlay: (id: string) => void; empty: string }> = ({ films, onPlay, empty }) => {
  const watched = useWatchedVideos();
  const { shown, more } = usePaged(films, 40);
  if (!films.length) return <Note className="py-8 text-center">{empty}</Note>;
  return (
    <>
      <Rows>
        {shown.map(f => {
          const seen = watched.isSeen(f.id);
          return (
            <div key={f.id} className="flex items-center">
              <Press
                onClick={() => { triggerHaptic(10); onPlay(f.id); }}
                aria-label={`${f.title}${seen ? ' — ნანახია' : ''}`}
                className={cx('flex min-h-[84px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 pl-4 text-left transition-colors active:bg-soft', FOCUS_IN)}
              >
                <Still id={f.id} secs={f.secs} seen={seen} />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="line-clamp-2 text-body leading-tight font-bold wrap-break-word">{f.title}</span>
                  {f.sub && <span className="line-clamp-1 text-meta text-mut wrap-break-word">{f.sub}</span>}
                  {(f.tag || f.meta) && (
                    <span className="flex flex-wrap items-center gap-x-2 text-cap">
                      {f.tag && <span className="rounded-chip bg-gold-tint px-1.5 font-bold text-gold-ink">{f.tag}</span>}
                      {f.meta && <span className="font-semibold text-mut">{f.meta}</span>}
                    </span>
                  )}
                </span>
              </Press>
              <CheckButton
                on={seen}
                label={seen ? `${f.title} — ნანახია (მოხსნა)` : `${f.title} — ნანახად მონიშვნა`}
                onChange={() => { triggerHaptic(seen ? 8 : 15); watched.toggle(f.id); }}
                className="mr-2"
              />
            </div>
          );
        })}
      </Rows>
      {more}
    </>
  );
};

/** the open film in a window: YouTube's player, a film's parts as pills, ‹ › through the same list, „ნანახია“ */
export const VideoPlayer: React.FC<{ films: VFilm[]; open?: string; onMove: (id: string) => void; onClose: () => void }> = ({ films, open, onMove, onClose }) => {
  const watched = useWatchedVideos();
  if (!open) return null;
  const i = films.findIndex(f => f.id === open || !!f.parts?.some(p => p.id === open));
  // a film no longer in the list (a pill changed meanwhile) still plays alone
  const film = i >= 0 ? films[i] : null;
  const prev = i > 0 ? films[i - 1] : null;
  const next = i >= 0 && i < films.length - 1 ? films[i + 1] : null;
  const seen = watched.isSeen(open);
  return (
    <Sheet open title={film?.title ?? 'ვიდეო'} onClose={onClose}>
      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-tile bg-night-surf">
        <iframe
          key={open}
          className="size-full"
          src={embedOf(open)}
          title={film?.title ?? 'ვიდეო'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {film?.parts && (
        <PillRow label="ნაწილები" items={film.parts.map(p => ({ id: p.id, label: p.label, on: p.id === open, onClick: () => { if (p.id !== open) onMove(p.id); } }))} />
      )}
      {film && <Note>{[film.sub, i >= 0 && `${i + 1} / ${films.length}`].filter(Boolean).join(' · ')}</Note>}
      <Duo>
        <Button kind="ghost" icon={<ChevronLeft aria-hidden="true" />} disabled={!prev} onClick={() => prev && onMove(prev.id)}>წინა</Button>
        <Button kind="ghost" disabled={!next} onClick={() => next && onMove(next.id)}>შემდეგი <ChevronRight aria-hidden="true" className="ml-1 inline size-4" /></Button>
      </Duo>
      <Button kind={seen ? 'soft' : 'primary'} full aria-pressed={seen} onClick={() => { triggerHaptic(seen ? 8 : 15); watched.toggle(open); }}>
        {seen ? 'ნანახია ✓' : 'ნანახად მონიშვნა'}
      </Button>
      <AttachButton entry={simpleEntry(`${PATH_PREFIX.video}${open}`, film?.title ?? 'ვიდეო', 'ვიდეო', film?.sub || 'ვიდეო')} />
      <Button kind="quiet" full icon={<ExternalLink aria-hidden="true" />} href={watchOf(open)} target="_blank">YouTube-ზე გახსნა</Button>
    </Sheet>
  );
};

/** a list with its places as pills (a village, a monastery, a year) and a search, then the films and the open one */
export const PlacedVideos: React.FC<FilmNav & { all: VFilm[]; query?: string; pills: string; note?: React.ReactNode; empty?: string }> = ({
  all, query = '', pills, note, empty = 'ასეთი ვიდეო ვერ მოიძებნა', open, onPlay, onMove, onClose,
}) => {
  const places = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of all) if (f.place) c.set(f.place, (c.get(f.place) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ka'));
  }, [all]);
  const [place, setPlace] = useState<string | null>(null);
  const q = query.trim().toLowerCase();
  const films = useMemo(() => all.filter(f =>
    (!place || f.place === place) && (!q || `${f.title} ${f.sub}`.toLowerCase().includes(q))), [all, place, q]);
  return (
    <>
      {places.length > 1 && (
        <PillRow label={pills} items={[
          { id: '', label: `ყველა · ${all.length}`, on: !place, onClick: () => setPlace(null) },
          ...places.slice(0, 40).map(([p, n]) => ({ id: p, label: `${p} · ${n}`, on: place === p, onClick: () => setPlace(place === p ? null : p) })),
        ]} />
      )}
      {note && <Note>{note}</Note>}
      <VideoRows films={films} onPlay={onPlay} empty={empty} />
      <VideoPlayer films={films} open={open} onMove={onMove} onClose={onClose} />
    </>
  );
};

/** the grey line under a list of „ეთნოფორი“'s films */
export const EtnoNote: React.FC = () => (
  <>
    „ეთნოფორი“ — აჭარის ტელევიზიის გადაცემა, წამყვანი მიხეილ გაბაიძე.{' '}
    <a href={ETNOFORI_CHANNEL} target="_blank" rel="noopener noreferrer" className="font-semibold text-sea underline-offset-2 hover:underline">არხი YouTube-ზე</a>
  </>
);
