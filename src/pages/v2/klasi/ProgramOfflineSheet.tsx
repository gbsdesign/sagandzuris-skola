import React from 'react';
import { Check, CloudDownload, Info, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { Bar, Button, Dot, Helper, Row, Rows, Sheet, ToggleRow } from '../../../components/ui2';
import type { ProgramOfflineState } from '../../../components/classes/ProgramOffline';
import { setAutoOf, useAutoOf } from '../../../utils/programOffline';

// The class program on the phone (boards x-ultra-oplain, -2, -4): the window of the program card's ☁, the one question
// before a big automatic download where the phone cannot tell Wi-Fi, and the „no room“ window.

/** The phone's connection type when it tells (Android's Chrome); undefined on iPhone. */
export const connectionType = (): string | undefined =>
  (navigator as Navigator & { connection?: { type?: string } }).connection?.type;

export const ProgramOfflineSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  o: ProgramOfflineState;
  classId: string;
  word: string;
}> = ({ open, onClose, o, classId, word }) => {
  const set = useAutoOf(classId);
  const left = o.count - o.savedCount;
  const wifiSeen = !!connectionType();
  return (
    <Sheet open={open} onClose={onClose} title="ოფლაინ: კლასის პროგრამა">
      <Rows>
        {o.saved ? (
          <Row lead={<Dot icon={<Check />} color="leaf" />} title="პროგრამა ტელეფონშია" sub={`${o.count} ${word}`} />
        ) : o.busy ? (
          <div className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center gap-2 text-body font-semibold text-ink">
              <Loader2 className="size-[18px] shrink-0 animate-spin text-wine" aria-hidden="true" />
              იწერება · {o.savedCount} / {o.count}
            </div>
            <Bar value={o.count ? o.savedCount / o.count : 0} label="ჩამოწერა" />
          </div>
        ) : o.notesSaved ? (
          <Row
            lead={<Dot icon={<Check />} color="leaf" />}
            title="ნოტები ტელეფონშია"
            sub="ჩანაწერების გარეშე"
            right={<Button size="md" kind="soft" onClick={() => o.save()}>ჩანაწერებიც</Button>}
            wrap
          />
        ) : (
          <Row
            lead={<Dot icon={<CloudDownload />} />}
            title="ჯერ ტელეფონში არ არის"
            sub={`${left} ${word} · ${o.needMb} მბ`}
            right={<Button size="md" onClick={() => o.save()}>ჩამოწერა</Button>}
            wrap
          />
        )}
      </Rows>
      {o.trouble && !o.saved && <p className="px-1.5 text-meta text-danger" role="alert">{o.trouble}</p>}
      <Rows>
        <ToggleRow
          lead={<Dot icon={<RefreshCw />} />}
          title="თავისით ჩამოწერა"
          sub="როცა პროგრამა იცვლება"
          on={set.auto}
          onChange={on => setAutoOf(classId, { auto: on })}
        />
        <ToggleRow
          lead={<Dot icon={<Wifi />} />}
          title="მხოლოდ Wi-Fi-ზე"
          sub={wifiSeen ? undefined : 'ამ ტელეფონზე Wi-Fi არ ჩანს — დიდს ჯერ გკითხავთ'}
          on={set.wifi}
          onChange={on => setAutoOf(classId, { wifi: on })}
          wrap
        />
      </Rows>
      <Helper icon={<Info />}>მასწავლებელი რომ პროგრამაში საგალობლებს დაამატებს, ტაძარში უკვე ტელეფონში გექნება.</Helper>
    </Sheet>
  );
};

/** x-ultra-oplain-2 — asked once a day before a big automatic download where Wi-Fi cannot be seen. */
export const ProgramAskSheet: React.FC<{
  open: boolean; count: number; word: string; mb: number; onYes: () => void; onLater: () => void;
}> = ({ open, count, word, mb, onYes, onLater }) => (
  <Sheet open={open} onClose={onLater} title="ჩამოვწერო კლასის პროგრამა?">
    <p className="px-1.5 text-body text-ink">{count} {word} · {mb} მბ. ტაძარში ინტერნეტი არ დაგჭირდება.</p>
    <Button icon={<CloudDownload />} full onClick={onYes}>ჩამოწერა</Button>
    <Button kind="soft" full onClick={onLater}>მოგვიანებით</Button>
  </Sheet>
);

/** x-ultra-oplain-4 — not enough room: the notes alone, or nothing. */
export const ProgramSpaceSheet: React.FC<{
  open: boolean; need: number; free: number; notes: number; onNotes: () => void; onClose: () => void;
}> = ({ open, need, free, notes, onNotes, onClose }) => (
  <Sheet open={open} onClose={onClose} title="ტელეფონში ადგილი არ არის">
    <p className="px-1.5 text-body text-ink">საჭიროა {need} მბ, თავისუფალია {free} მბ. ჩანაწერების გარეშე პროგრამა {notes} მბ-ია.</p>
    <Button full onClick={onNotes}>მხოლოდ ნოტები · {notes} მბ</Button>
    <Button kind="soft" full onClick={onClose}>დახურვა</Button>
  </Sheet>
);
