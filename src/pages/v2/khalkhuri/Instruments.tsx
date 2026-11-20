import React, { useState } from 'react';
import { Drum, Guitar, Music, Piano, Wind } from 'lucide-react';
import { Dot, Note, Row, Rows, Sheet, Small } from '../../../components/ui2';
import { INSTRUMENTS_LIST, type InstrumentItem } from '../../../data/instrumentsData';
import { getFolkRegion } from '../../../data/songsData';
import { CENTRE_INSTRUMENT_TAKES } from '../../../data/centreOther';
import { albumRight, useAlbumAccess } from '../../../data/albumAccess';
import { useAlbumPlayer } from '../../../utils/useAlbumPlayer';
import { triggerHaptic } from '../../../utils/haptics';
import { TakeLine } from './takes';
import { Chev } from './parts';

// „საკრავი“ in the new look (board x-sakravi): the instruments as rows — a mark of their kind, the name, where they are played.
// One with recordings (the Centre's albums the person may hear) opens a window with them; the others say lessons are coming.

const ICON: Record<string, React.ReactNode> = {
  chonguri: <Guitar />, fanduri: <Guitar />, chuniri: <Guitar />, changi: <Guitar />, gitara: <Guitar />,
  salamuri: <Wind />, larchemi: <Wind />, doli: <Drum />, garmoni: <Piano />,
};

type Take = (typeof CENTRE_INSTRUMENT_TAKES)[string][number];
const takesOf = (id: string): Take[] => (CENTRE_INSTRUMENT_TAKES[id] ?? []).filter(t => albumRight(t[2]).listen);

/** where an instrument is played, in words (the regions' names; else its line) */
const whereOf = (i: InstrumentItem) => (i.regions.length ? i.regions.map(id => getFolkRegion(id).nameGe).join(' · ') : i.where);

const InstrumentSheet: React.FC<{ instrument: InstrumentItem | null; onClose: () => void }> = ({ instrument, onClose }) => {
  const player = useAlbumPlayer();
  const takes = instrument ? takesOf(instrument.id) : [];
  return (
    <Sheet open={!!instrument} title={instrument?.nameGe ?? ''} onClose={() => { player.stop(); onClose(); }}>
      {instrument && (
        <Rows>
          <Row title="სად უკრავენ" sub={whereOf(instrument)} wrap />
        </Rows>
      )}
      {takes.length > 0 && (
        <Rows>
          {takes.map(([file, title, , album, note]) => (
            <TakeLine key={file} id={file} title={title} note={[note, `ალბომი „${album}“`].filter(Boolean).join(' · ')} player={player} />
          ))}
        </Rows>
      )}
      <Note>{takes.length ? 'გაკვეთილები მალე დაემატება.' : 'ჩანაწერები და გაკვეთილები მალე დაემატება.'}</Note>
    </Sheet>
  );
};

/** the instruments as rows; `line` = the grey line (a region's own word for it, or where it is played) */
export const InstrumentRows: React.FC<{
  list?: InstrumentItem[];
  line?: (i: InstrumentItem) => string;
  selected?: Record<string, unknown>;
  empty?: string;
}> = ({ list = INSTRUMENTS_LIST, line = whereOf, selected = {}, empty = 'ამ კუთხის საკრავები ჯერ არ დამატებულა' }) => {
  useAlbumAccess(); // an admin's switch applies at once
  const [open, setOpen] = useState<InstrumentItem | null>(null);
  if (!list.length) return <Note className="py-8 text-center">{empty}</Note>;
  return (
    <>
      <Rows>
        {list.map(i => {
          const n = takesOf(i.id).length;
          return (
            <Row
              key={i.id}
              lead={<Dot icon={ICON[i.id] ?? <Music />} />}
              title={i.nameGe}
              sub={line(i)}
              wrap
              onClick={() => { triggerHaptic(8); setOpen(i); }}
              right={n > 0 || selected[i.id] ? (
                <>
                  {selected[i.id] ? <Small tone="leaf">✓ სიაშია</Small> : <Small>{n} ჩანაწერი</Small>}
                  <Chev />
                </>
              ) : undefined}
            />
          );
        })}
      </Rows>
      <InstrumentSheet instrument={open} onClose={() => setOpen(null)} />
    </>
  );
};
