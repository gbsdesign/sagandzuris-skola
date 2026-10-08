import React from 'react';
import { useNavigation } from '../context';
import { BookTab } from './library/BookTab';
import { BookNav } from './library/BookHead';
import { FeastsTab } from './library/FeastsTab';
import { LivesTab } from './library/LivesTab';
import { SynthDownload } from './library/SynthDownload';
import { SHELF_IDS, Shelf, ShelfId } from './library/Shelf';
import { useOpenRequest } from '../utils/searchOpen';

// "ბიბლიოთეკა": a shelf of books — Svimon Mchedlidze's Sacred History, the lives of the saints and the
// church feasts (from orthodoxy.ge) — and the chant recordings. A book ("lives") and a part of it
// ("lives:m9", "book:12") are steps of their own, so "back" (the top bar's or the phone's) goes from
// a chapter to the contents and from the contents to the shelf.

const isShelfId = (id: string | null | undefined): id is ShelfId => SHELF_IDS.includes(id as ShelfId);

export const LibraryPage: React.FC = () => {
  const { mapItem, openMapItem, handleGoBack } = useNavigation();
  // a book picked in the search
  useOpenRequest('biblioteka', id => { if (isShelfId(id)) openMapItem(id); });
  const [shelf, ...rest] = (mapItem ?? '').split(':');
  const open = isShelfId(shelf) ? shelf : null;
  const nav: BookNav = {
    part: rest.length ? rest.join(':') : null,
    go: (part, replace) => openMapItem(part ? `${open}:${part}` : open!, replace),
    up: handleGoBack,
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-2 px-1">
      {!open ? (
        <Shelf onOpen={openMapItem} />
      ) : (
        <div key={open} className="animate-[galoba-unfold_0.25s_ease_both]">
          {open === 'book' ? <BookTab nav={nav} /> : open === 'feasts' ? <FeastsTab /> : open === 'lives' ? <LivesTab nav={nav} /> : <SynthDownload />}
        </div>
      )}
    </div>
  );
};
