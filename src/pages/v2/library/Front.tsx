import React, { useState } from 'react';
import { BookOpen, CalendarDays, ChevronDown, ChevronRight, Disc3, Headphones, LoaderCircle, Music } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { useMembership } from '../../../utils/memberAccess';
import { askSignIn } from '../../../components/access/SignInPrompt';
import { openChurchCalendar, todayIso } from '../../../data/churchCalendar';
import { CHANT_ALBUMS } from '../../../data/chantAlbums';
import { BOOKS } from '../../../data/libraryBooks';
import { useShownAlbums } from '../../../components/maps/CentreAlbums';
import { OfflineButton } from '../../../components/offline/OfflineButton';
import { Dot, Hero, Press, Row, Rows, SectionLabel, Small, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { lastReading } from '../../library/readingPlace';
import { exportBusy, useExportState } from '../../library/SynthDownload';
import { useShelfOrder } from '../../library/Shelf';
import { PinRound } from '../gza/parts';
import { Page } from './parts';

// x-biblioteka — the library's front room in the new look: where the reader stopped (a wine card), the books as cloth covers
// three to a row, all on one screen (no wooden board, plates or lamp), then the recordings and the church calendar.

type CoverId = 'prayers' | 'book' | 'lives' | 'feasts' | 'sasuliero' | 'patriarq' | 'paisi' | 'tsinaprebi';

/** the cloth: a design-rule colour under index.css `.sg-cloth`'s weave and shade (`-deep`: the bright ones, a darker cloth) */
const COVERS: { id: CoverId; title: string; cloth: string }[] = [
  { id: 'prayers', title: 'ლოცვანი', cloth: 'bg-wine' },
  { id: 'book', title: 'საღმრთო ისტორია', cloth: 'bg-sea' },
  { id: 'lives', title: 'წმიდანთა ცხოვრება', cloth: 'bg-leaf' },
  // soft hyphens: a long word breaks as a book would break it
  { id: 'feasts', title: 'დღესას­წაულები', cloth: 'bg-gold sg-cloth-deep' },
  { id: 'sasuliero', title: 'სასულიერო წიგნები', cloth: 'bg-clay sg-cloth-deep' },
  { id: 'patriarq', title: 'საპატრიარ­ქოს ბიბლიოთეკა', cloth: 'bg-wine-deep' },
  { id: 'paisi', title: 'ვიდეო­თეკა', cloth: 'bg-plum sg-cloth-deep' },
  { id: 'tsinaprebi', title: 'გაიცანი წინაპრები', cloth: 'bg-ink' },
];
const DEFAULT_ORDER = COVERS.map(c => c.id);

const Cover: React.FC<{ title: string; cloth: string; onOpen: () => void; className?: string }> = ({ title, cloth, onOpen, className }) => (
  <Press
    onClick={onOpen}
    aria-label={title.replace(/­/g, '')}
    className={cx(
      'sg-cloth flex h-[132px] min-w-0 cursor-pointer rounded-field p-1.5 transition active:scale-[0.97]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
      cloth,
      className,
    )}
  >
    <span className="flex min-w-0 flex-1 items-center justify-center rounded-chip border-[1.5px] border-gold-tint/70 p-1.5 text-center font-serif-ge text-meta leading-snug font-semibold text-night-ink wrap-break-word min-[380px]:text-body">
      {title}
    </span>
  </Press>
);

// a folded group of albums inside the listening card: the row, then its albums as rows under it
const FOLD_KEYS = { chant: 'sg-library-recordings-open', folk: 'sg-library-folk-albums-open' } as const;
const wasOpen = (k: string) => { try { return sessionStorage.getItem(k) === '1'; } catch { return false; } };
const useFold = (key: string) => {
  const [open, setOpen] = useState(() => wasOpen(key));
  const toggle = () => {
    triggerHaptic(10);
    setOpen(o => {
      try { sessionStorage.setItem(key, o ? '0' : '1'); } catch { /* this visit only */ }
      return !o;
    });
  };
  return [open, toggle] as const;
};
const FoldChev: React.FC<{ open: boolean }> = ({ open }) => (
  <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} strokeWidth={2} />
);
const FOLK_FIRST = 8;
// an album row stands under its group's name (the round mark's width)
const Indent: React.FC = () => <span aria-hidden="true" className="w-icon shrink-0" />;
const Chev: React.FC = () => <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;

export const Front: React.FC<{ onOpen: (id: string) => void }> = ({ onOpen }) => {
  const { user, isAdmin } = useAuth();
  const { navigateTo, handleGoBack } = useNavigation();
  const access = useAccess();
  const canCal = useMembership().can('calendar');
  const job = useExportState();
  const last = lastReading();
  const { order, saved } = useShelfOrder(user?.uid);
  const [chantOpen, toggleChant] = useFold(FOLD_KEYS.chant);
  const [folkOpen, toggleFolk] = useFold(FOLD_KEYS.folk);
  const [folkAll, setFolkAll] = useState(false);
  const folk = useShownAlbums();
  const recordings = access.can('recordings');

  // „გაიცანი წინაპრები“ opens its own page by its section's switch (a guest is asked to sign in); „ვიდეოთეკა“ by the videos'
  const ancestors = access.section('tsinaprebi');
  const videos = access.section('videoebi') === 'open';
  // a member's own order of the books if they set one once (useShelfOrder), else the board's
  const ids: CoverId[] = saved
    ? [...(order.filter(id => DEFAULT_ORDER.includes(id as CoverId)) as CoverId[]), 'paisi']
    : DEFAULT_ORDER;
  const covers = [...new Set(ids)]
    .map(id => COVERS.find(c => c.id === id)!)
    .filter(c => (c.id === 'paisi' ? videos : c.id === 'tsinaprebi' ? ancestors === 'open' || ancestors === 'locked' : true));

  const open = (id: CoverId) => {
    triggerHaptic(10);
    if (id !== 'tsinaprebi') return onOpen(id);
    if (ancestors === 'open') navigateTo('tsinaprebi');
    else if (ancestors === 'locked') askSignIn('გაიცანი წინაპრები');
  };

  const bookTitle = last ? (last.shelf === 'book' ? 'საღმრთო ისტორია' : BOOKS.find(b => b.id === last.book)?.title ?? 'სასულიერო წიგნები') : '';
  const busy = exportBusy(job);
  const shownFolk = folkAll ? folk : folk.slice(0, FOLK_FIRST);

  return (
    <Page>
      <TopBar title="ბიბლიოთეკა" onBack={handleGoBack} right={<><PinRound id="section:biblioteka" /><OfflineButton kind="library" /></>} />

      {last && (
        <Hero
          kicker={<>გააგრძელე კითხვა · თავი {last.n}{last.total ? ` / ${last.total}` : ''}</>}
          title={bookTitle}
          sub={last.title || undefined}
          // two steps, the contents and then the chapter, so „უკან“ from the chapter shows the contents
          action={{ label: 'კითხვა', icon: <BookOpen aria-hidden="true" />, onClick: () => { onOpen(last.steps[0]); window.setTimeout(() => onOpen(last.steps[1]), 0); } }}
        />
      )}

      <SectionLabel label="წიგნები" />
      <div className="grid shrink-0 grid-cols-3 gap-2.5 lg:grid-cols-6">
        {covers.map((c, i) => (
          <Cover
            key={c.id}
            title={c.title}
            cloth={c.cloth}
            onOpen={() => open(c.id)}
            // a seventh book stands in the middle of its row
            className={covers.length % 3 === 1 && i === covers.length - 1 ? 'col-start-2 lg:col-start-auto' : undefined}
          />
        ))}
      </div>

      {(user || recordings || folk.length > 0) && (
        <>
          <SectionLabel label="მოსასმენი" className="mt-1" />
          <Rows>
            {/* the chant books as mp3 — for members, as before */}
            {user && (
              <Row
                lead={<Dot icon={<Headphones />} />}
                title="საგალობლების mp3"
                wrap
                sub={busy
                  ? <span className="inline-flex items-center gap-1.5 font-bold text-wine tabular-nums"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />მზადდება · {job!.done} / {job!.total}</span>
                  : 'წიგნ-წიგნ, სინთეზატორით დაკრული'}
                onClick={() => { triggerHaptic(10); onOpen('audio'); }}
              />
            )}
            {/* the choirs' and schools' recordings, folded (an album = `album:<id>`) */}
            {recordings && (
              <Row
                lead={<Dot icon={<Music />} />}
                title="ჩანაწერები"
                sub="გუნდები და სკოლები"
                aria-expanded={chantOpen}
                onClick={toggleChant}
                right={<FoldChev open={chantOpen} />}
              />
            )}
            {recordings && chantOpen && CHANT_ALBUMS.filter(a => a.id !== 'unsure' || isAdmin).map(a => (
              <Row key={a.id} lead={<Indent />} title={a.title} sub={a.note} onClick={() => { triggerHaptic(15); onOpen(`album:${a.id}`); }} />
            ))}
            {/* the Folklore Centre's song albums, folded too (`falbum:<id>`) */}
            {folk.length > 0 && (
              <Row
                lead={<Dot icon={<Disc3 />} />}
                title="ხალხური სიმღერების ალბომები"
                sub={`ფოლკლორის ცენტრი · ${folk.length} ალბომი`}
                aria-expanded={folkOpen}
                onClick={toggleFolk}
                right={<FoldChev open={folkOpen} />}
              />
            )}
            {folk.length > 0 && folkOpen && shownFolk.map(([id, name, n]) => (
              <Row key={id} lead={<Indent />} title={name} right={<><Small>{n}</Small><Chev /></>}
                onClick={() => { triggerHaptic(10); onOpen(`falbum:${id}`); }} />
            ))}
            {folk.length > FOLK_FIRST && folkOpen && !folkAll && (
              <Row lead={<Indent />} title={<span className="text-wine">კიდევ {folk.length - FOLK_FIRST} ალბომი</span>} right={null}
                onClick={() => { triggerHaptic(10); setFolkAll(true); }} />
            )}
          </Rows>
        </>
      )}

      {/* the church calendar (members a superadmin gave it to): opens as a sheet over the page */}
      {canCal && (
        <Rows>
          <Row
            lead={<Dot icon={<CalendarDays />} />}
            title="საეკლესიო კალენდარი"
            wrap
            sub="დღის წმიდანები და დღესასწაულები"
            onClick={() => { triggerHaptic(10); openChurchCalendar(todayIso()); }}
          />
        </Rows>
      )}
    </Page>
  );
};
