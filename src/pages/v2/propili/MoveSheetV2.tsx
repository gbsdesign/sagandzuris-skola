import React, { useId } from 'react';
import { ArrowRight, Info, LoaderCircle, RotateCcw } from 'lucide-react';
import { Button, Choice, Field, Helper, Note, Rows, Seg, Sheet } from '../../../components/ui2';
import { CHANT_ALBUMS, ChantAlbumId } from '../../../data/chantAlbums';
import type { FolkRegionId } from '../../../data/songsData';
import { placeName, type MoveTarget, type useMoveSheet } from '../../../components/archive/MoveSheet';
import { triggerHaptic } from '../../../utils/haptics';
import { ErrorLine, SelectField } from './parts';

// x-gadatana — „გადატანა“ of a recording in the new look (only the owner and the superadmins see it; opened from a song's
// recordings and the albums). The same as before: songs or chants on top, the region or album, the title, one button. The
// old window's two extras stay: „მხოლოდ ეს ჩანაწერი / მთელი სიმღერა“ when a song has more recordings, and the way back
// to where it came from (components/archive/MoveSheet `useMoveSheet` holds the logic).

export const MoveSheetV2: React.FC<{ target: MoveTarget; m: ReturnType<typeof useMoveSheet>; onClose: () => void }> = ({ target, m, onClose }) => {
  const listId = useId();
  const { from, kind, setKind, region, setRegion, album, setAlbum, title, setTitle, titles, whole, all, setAll, busy, error, moved, home, save, reset, regions } = m;
  return (
    <Sheet open title="გადატანა" onClose={onClose}>
      <Note className="-mt-1">{target.who} · ახლა: {from ? placeName(from) : 'მხოლოდ ალბომში'}</Note>
      <form className="flex flex-col gap-3" noValidate onSubmit={e => { e.preventDefault(); save(); }}>
        <Seg label="სად" value={kind} onChange={k => { triggerHaptic(10); setKind(k); }}
          items={[{ id: 'song', label: 'სიმღერები' }, { id: 'chant', label: 'გალობა' }]} />
        {kind === 'song' ? (
          <SelectField label="კუთხე" placeholder="აირჩიე კუთხე" value={region} onChange={v => setRegion(v as FolkRegionId)}>
            {regions.map(r => <option key={r.id} value={r.id}>{r.nameGe}</option>)}
          </SelectField>
        ) : (
          <SelectField label="ალბომი" placeholder="აირჩიე ალბომი" value={album} onChange={v => setAlbum(v as ChantAlbumId)}>
            {CHANT_ALBUMS.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
          </SelectField>
        )}
        <Field label={kind === 'song' ? 'სიმღერა' : 'საგალობელი'} placeholder="სათაური" value={title} onChange={setTitle} list={listId} />
        <datalist id={listId}>{titles.map(t => <option key={t} value={t} />)}</datalist>
        <Helper icon={<Info />}>
          {kind === 'song'
            ? 'იგივე სახელი იმავე კუთხეში — ჩანაწერი იმ სიმღერას დაემატება; ახალი სახელი — ახალი სიმღერა.'
            : 'ამ სათაურით გამოჩნდება ალბომში.'}
        </Helper>

        {whole && (
          <Rows role="radiogroup" aria-label="რა გადავიტანო">
            <Choice title="მხოლოდ ეს ჩანაწერი" on={!all} onClick={() => setAll(false)} />
            <Choice title={`მთელი სიმღერა (${target.songRecIds!.length} ჩანაწერი)`} on={all} onClick={() => setAll(true)} />
          </Rows>
        )}

        {error && <ErrorLine>{error}</ErrorLine>}
        <Button type="submit" full disabled={busy} className="mt-4"
          icon={busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}>
          გადატანა
        </Button>
        {moved && (home || target.centre) && (
          <Button full kind="quiet" disabled={busy} onClick={reset} icon={<RotateCcw />} title={home ? placeName(home) : undefined}>
            {home ? 'თავდაპირველ ადგილზე' : 'მხოლოდ ალბომში'}
          </Button>
        )}
      </form>
    </Sheet>
  );
};
