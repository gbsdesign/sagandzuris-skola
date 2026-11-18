import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigation } from '../../../context';
import { useOpenRequest } from '../../../utils/searchOpen';
import { Row, Rows, TopBar } from '../../../components/ui2';
import { BOOKS } from '../../../data/libraryBooks';
import { getChantAlbum } from '../../../data/chantAlbums';
import { CENTRE_SONG_ALBUMS } from '../../../data/centreSongs';
import { PrayerSearchButton } from '../../../components/maps/songSearch';
import { CommemorationButton } from '../../../components/prayers/CommemorationButton';
import type { BookNav } from '../../library/BookHead';
import { PrayersTab } from '../../library/PrayersTab';
import { PatriarchLibrary } from '../../library/PatriarchLibrary';
import { lastChapter } from '../../library/readingPlace';
import { ChantAlbumPage } from '../../galoba/ChantAlbumPage';
import { SongAlbumPage } from '../../../components/maps/SongAlbumPage';
import { SongPage } from '../../../components/maps/SongPage';
import { triggerHaptic } from '../../../utils/haptics';
import { Front } from './Front';
import { BookV2 } from './BookV2';
import { LivesV2 } from './LivesV2';
import { FeastsV2 } from './FeastsV2';
import { PaisiV2 } from './PaisiV2';
import { Mp3V2 } from './Mp3V2';
import { Page } from './parts';

// „ბიბლიოთეკა“ in the new look (redesign stage 6b, boards x-biblioteka … x-mp3). The steps are the old page's (LibraryPage):
// `mapItem` = a shelf („book“, „lives“, „feasts“, „prayers“, „sasuliero“, „audio“, „paisi“) and its part („book:12“,
// „lives:m9“, „feasts:2“, „sasuliero:ati:3“, „paisi:<YouTube id>“), or an album („album:<id>“, „falbum:<id>“).

const SHELVES = ['book', 'lives', 'feasts', 'prayers', 'sasuliero', 'patriarq', 'audio', 'paisi'] as const;
type Shelf = (typeof SHELVES)[number];
const isShelf = (id: string | null | undefined): id is Shelf => SHELVES.includes(id as Shelf);

/** „სასულიერო წიგნები“: the books of the holy fathers; with one book its contents open at once (as before) */
const SpiritualV2: React.FC<{ nav: BookNav }> = ({ nav }) => {
  const [id, ...rest] = (nav.part ?? '').split(':');
  const open = BOOKS.find(b => b.id === id) ?? (BOOKS.length === 1 ? BOOKS[0] : undefined);
  if (open) {
    const inner: BookNav = {
      part: rest.length ? rest.join(':') : null,
      go: (part, replace) => nav.go(part ? `${open.id}:${part}` : open.id, replace),
      up: nav.up,
    };
    return <BookV2 key={open.id} nav={inner} load={open.load} place={open.id} title={open.title} sub={b => `${b.author} · ${b.chapters.length} თავი`} />;
  }
  return (
    <Page>
      <TopBar title="სასულიერო წიგნები" sub="წმიდა მამების სწავლებანი" onBack={nav.up} />
      <Rows>
        {BOOKS.map(b => {
          const last = lastChapter(b.id);
          return (
            <Row key={b.id} title={b.title} wrap sub={`${b.author} · ${b.chapters} თავი${last ? ` · გაჩერდით: თავი ${last.n}` : ''}`}
              onClick={() => { triggerHaptic(10); nav.go(b.id); }} right={<ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />} />
          );
        })}
      </Rows>
    </Page>
  );
};

export const LibraryV2: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  // a book picked in the search, or a chapter of it from a button („book:12“)
  useOpenRequest('biblioteka', id => { if (isShelf(id.split(':')[0])) openMapItem(id); });
  const [shelf, ...rest] = (mapItem ?? '').split(':');
  const open = isShelf(shelf) ? shelf : null;
  const part = rest.length ? rest.join(':') : null;
  const nav: BookNav = {
    part,
    go: (p, replace) => openMapItem(p ? `${open}:${p}` : open!, replace),
    up: handleGoBack,
  };

  // an album of chant recordings (a choir, a school) and a Folklore Centre album: the old pages under the new bar
  if (mapItem?.startsWith('album:')) {
    return (
      <Page>
        <TopBar title={getChantAlbum(mapItem.slice(6))?.title ?? 'ჩანაწერები'} sub="ჩანაწერები" onBack={handleGoBack} />
        <ChantAlbumPage albumId={mapItem.slice(6)} />
      </Page>
    );
  }
  if (mapItem?.startsWith('falbum:')) {
    const id = mapItem.slice(7);
    return (
      <Page>
        <TopBar title={CENTRE_SONG_ALBUMS.find(a => a[0] === id)?.[1] ?? 'ალბომი'} sub="ფოლკლორის ცენტრი" onBack={handleGoBack} />
        <SongAlbumPage albumId={id} />
        <SongPage />
      </Page>
    );
  }

  if (!open) return <Front onOpen={openMapItem} />;

  return (
    <div key={open}>
      {open === 'book' ? <BookV2 nav={nav} title="საღმრთო ისტორია" />
        : open === 'lives' ? <LivesV2 nav={nav} />
        : open === 'feasts' ? <FeastsV2 group={part} onAll={() => openMapItem('feasts', true)} onBack={handleGoBack} />
        : open === 'sasuliero' ? <SpiritualV2 nav={nav} />
        : open === 'patriarq' ? (
          // the Patriarchate's library: its own lists and books under the new bar
          <Page>
            <TopBar title="საპატრიარქოს ბიბლიოთეკა" onBack={handleGoBack} />
            <PatriarchLibrary nav={nav} />
          </Page>
        )
        : open === 'audio' ? <Mp3V2 onBack={handleGoBack} />
        : open === 'paisi' ? (
          // a film opens over the list (`stay`), ‹ › turn it in place
          <PaisiV2
            open={part ?? undefined}
            onPlay={id => openMapItem(`paisi:${id}`, false, true)}
            onMove={id => openMapItem(`paisi:${id}`, true, true)}
            onClose={handleGoBack}
            onBack={handleGoBack}
          />
        ) : (
          // „ლოცვანი“: the prayer book's own parts under the new bar (its new look is the prayers' stage)
          <Page>
            <TopBar title="ლოცვანი" onBack={handleGoBack} right={<><PrayerSearchButton /><CommemorationButton /></>} />
            <PrayersTab key={part} at={part} />
          </Page>
        )}
    </div>
  );
};

export default LibraryV2;
