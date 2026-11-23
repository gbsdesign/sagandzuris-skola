import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Play } from 'lucide-react';
import { Button, CheckButton, Duo, Hero, Note, Press, Rows, Seg, Sheet, Small, TopBar, cx, FOCUS_IN } from '../../../components/ui2';
import { AttachButton, simpleEntry } from '../../../components/attach/AttachButton';
import { PATH_PREFIX } from '../../../utils/pathPrefix';
import { triggerHaptic } from '../../../utils/haptics';
import { useWatchedVideos } from '../../../hooks/useWatchedVideos';
import { PAISI_PARTS, PaisiPart } from '../../../data/paisiVideos';
import { Page } from './parts';

// x-videoteka — „ვიდეოთეკა“'s St Paisios in the new look: the seasons as one switch, where the viewer stopped on a wine card,
// then the episodes in order, a watched one ticked („ნანახია“ — the old list's mark, students.videosSeen). A film opens in a
// window over the list as before (`paisi:<YouTube id>`, ‹ › turn it in place).

// YouTube's addresses (data/etnofori's, kept here so the library does not load the songs' list)
const thumbOf = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
const embedOf = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
const watchOf = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
};
const minutes = (s: number) => `${Math.round(s / 60)} წუთი`;

// the season names on the switch (short, so three fit a phone)
const SHORT: Record<string, string> = { s1: 'I სეზონი', s2: 'II სეზონი', dub: 'ქართულად' };

// the episode opened last, on this device: „გააგრძელე“
const LAST_KEY = 'sg-paisi-last';
const readLast = () => { try { return localStorage.getItem(LAST_KEY); } catch { return null; } };
const keepLast = (id: string) => { try { localStorage.setItem(LAST_KEY, id); } catch { /* this visit only */ } };

type Ep = { id: string; n: number; secs: number; part: PaisiPart; i: number };
const ALL: Ep[] = PAISI_PARTS.flatMap(part => part.eps.map(([id, n, secs], i) => ({ id, n, secs, part, i })));
const epOf = (id?: string | null) => ALL.find(e => e.id === id);

const Still: React.FC<{ ep: Ep; seen: boolean }> = ({ ep, seen }) => (
  <span aria-hidden="true" className="relative flex h-16 w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-field bg-ink text-white">
    <img src={thumbOf(ep.id)} alt="" loading="lazy" decoding="async" className={cx('absolute inset-0 size-full object-cover', seen ? 'opacity-60' : 'opacity-90')} />
    <span className="relative flex size-8 items-center justify-center rounded-full bg-ink/55">
      <Play className="size-4 fill-current" strokeWidth={1.5} />
    </span>
    <span className="absolute right-1.5 bottom-[5px] rounded-chip bg-ink/70 px-[5px] py-px text-cap leading-tight font-bold tabular-nums">{clock(ep.secs)}</span>
  </span>
);

/** the open episode in a window: YouTube's own player, ‹ › through the season, „ნანახია“ */
const Player: React.FC<{ open?: string; onMove: (id: string) => void; onClose: () => void }> = ({ open, onMove, onClose }) => {
  const watched = useWatchedVideos();
  const ep = epOf(open);
  if (!open) return null;
  const eps = ep?.part.eps ?? [];
  const prev = ep && ep.i > 0 ? eps[ep.i - 1][0] : null;
  const next = ep && ep.i < eps.length - 1 ? eps[ep.i + 1][0] : null;
  const seen = watched.isSeen(open);
  return (
    <Sheet open title={ep ? `სერია ${ep.n}` : 'ვიდეო'} onClose={onClose}>
      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-tile bg-ink">
        <iframe
          key={open}
          className="size-full"
          src={embedOf(open)}
          title={ep ? `სერია ${ep.n}` : 'ვიდეო'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {ep && <Note>{ep.part.label} · {ep.part.sub} · {ep.i + 1} / {eps.length}</Note>}
      <Duo>
        <Button kind="ghost" icon={<ChevronLeft aria-hidden="true" />} disabled={!prev} onClick={() => prev && onMove(prev)}>წინა</Button>
        <Button kind="ghost" disabled={!next} onClick={() => next && onMove(next)}>შემდეგი <ChevronRight aria-hidden="true" className="ml-1 inline size-4" /></Button>
      </Duo>
      <Button kind={seen ? 'soft' : 'primary'} full aria-pressed={seen} onClick={() => { triggerHaptic(seen ? 8 : 15); watched.toggle(open); }}>
        {seen ? 'ნანახია ✓' : 'ნანახად მონიშვნა'}
      </Button>
      <AttachButton entry={simpleEntry(`${PATH_PREFIX.video}${open}`, ep ? `${ep.part.label} · სერია ${ep.n}` : 'ვიდეო', 'ვიდეო', 'წმინდა პაისი')} />
      <Button kind="quiet" full icon={<ExternalLink aria-hidden="true" />} href={watchOf(open)} target="_blank">YouTube-ზე გახსნა</Button>
    </Sheet>
  );
};

export const PaisiV2: React.FC<{ open?: string; onPlay: (id: string) => void; onMove: (id: string) => void; onClose: () => void; onBack: () => void }> = ({
  open, onPlay, onMove, onClose, onBack,
}) => {
  const watched = useWatchedVideos();
  // after a reload the open episode picks its own season; else the season of the episode opened last
  const [partId, setPartId] = useState(() => epOf(open)?.part.id ?? epOf(readLast())?.part.id ?? PAISI_PARTS[0].id);
  const part = PAISI_PARTS.find(p => p.id === partId) ?? PAISI_PARTS[0];
  const eps = useMemo(() => ALL.filter(e => e.part.id === part.id), [part]);

  // „გააგრძელე“: the episode opened last; once it is watched, the next one of its season not watched yet
  const resume = useMemo(() => {
    const last = epOf(readLast());
    if (!last) return null;
    if (!watched.isSeen(last.id)) return { ep: last, fresh: false };
    const after = ALL.find(e => e.part.id === last.part.id && e.i > last.i && !watched.isSeen(e.id));
    return after ? { ep: after, fresh: true } : null;
  }, [watched, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const play = (id: string) => { keepLast(id); onPlay(id); };
  const move = (id: string) => { keepLast(id); onMove(id); };

  return (
    <Page>
      <TopBar title="ვიდეოთეკა" sub={`წმინდა პაისი · ${part.sub}`} onBack={onBack} />
      <Seg
        label="სეზონები"
        items={PAISI_PARTS.map(p => ({ id: p.id, label: SHORT[p.id] ?? p.label }))}
        value={part.id}
        onChange={id => { triggerHaptic(8); setPartId(id); }}
      />

      {resume && (
        <Hero
          kicker={resume.fresh ? `შემდეგი · ${resume.ep.part.label}` : `გააგრძელე · ${resume.ep.part.label}`}
          title={`სერია ${resume.ep.n}`}
          sub={minutes(resume.ep.secs)}
          action={{ label: 'ყურება', icon: <Play aria-hidden="true" className="fill-current" />, onClick: () => play(resume.ep.id) }}
        />
      )}

      <Rows>
        {eps.map(ep => {
          const seen = watched.isSeen(ep.id);
          return (
            <div key={ep.id} className="flex items-center">
              <Press
                onClick={() => { triggerHaptic(10); play(ep.id); }}
                aria-label={`სერია ${ep.n}${seen ? ' — ნანახია' : ''}`}
                className={cx('flex min-h-[84px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-2.5 pl-4 text-left transition-colors active:bg-soft', FOCUS_IN)}
              >
                <Still ep={ep} seen={seen} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body leading-tight font-bold">სერია {ep.n}</span>
                  <Small bold={false}>{seen ? 'ნანახია' : minutes(ep.secs)}</Small>
                </span>
              </Press>
              <CheckButton
                on={seen}
                label={seen ? `სერია ${ep.n} — ნანახია (მოხსნა)` : `სერია ${ep.n} — ნანახად მონიშვნა`}
                onChange={() => { triggerHaptic(seen ? 8 : 15); watched.toggle(ep.id); }}
                className="mr-2"
              />
            </div>
          );
        })}
      </Rows>
      <Note>{part.label} · {part.sub} · {eps.length} სერია. ნანახი სერიები „ნასწავლის“ ვიდეოების სკივრს ავსებს.</Note>

      <Player open={open} onMove={move} onClose={onClose} />
    </Page>
  );
};
