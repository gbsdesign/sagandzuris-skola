import React, { useState } from 'react';
import { DoorOpen, Info, Play, Send, type LucideIcon } from 'lucide-react';
import { Button, Card, Helper, Press, Row, Rows, SectionLabel, Seg, Sheet, cx } from '../../../components/ui2';
import { useNewRoomAsk } from '../../../components/games/gameVariant';

// A room game's online part in the new look (board x-tamashi-otakhi; the canvas's note: „ოთახის გახსნა ცალკე პატარა ფანჯარაა
// და არა გვერდის ბოლოში ჩამალული ბარათი … ერთი მთავარი ღილაკი“): my room to go back into, the open rooms of my classes, and one
// button that opens the window „ახალი ოთახი“ — whom to invite (a class), what the opener does („ვთამაშობ · მხოლოდ ვუძღვები“ for
// the board games, whose opener may play; the lobby's „მეც ვთამაშობ“ changes it later), „გახსენი და მოიწვიე“. The logic stays in
// components/games/RoomSetup.tsx; this is its drawing.

export interface RoomRowV2 { id: string; classId: string; title: string; sub: string; action: string; primary: boolean }

export const RoomSetupV2: React.FC<{
  Icon: LucideIcon;
  /** none: signed out or in no class — the line that says why */
  blocked?: string;
  mine?: { title: string; sub: string } | null;
  rooms: RoomRowV2[];
  classes: { id: string; name: string; count: number }[];
  picked?: string;
  onPick: (id: string) => void;
  hostLine: string;
  /** a board game: whether the opener plays or only leads, and the line said then in place of `hostLine` */
  play?: { value: boolean; set: (v: boolean) => void; line: string };
  busy: boolean;
  err: string;
  /** true once the room is open (the window closes) */
  onCreate: () => Promise<boolean>;
  onEnter: (classId: string, roomId: string) => void;
  onResume: () => void;
}> = ({ Icon, blocked, mine, rooms, classes, picked, onPick, hostLine, play, busy, err, onCreate, onEnter, onResume }) => {
  const [open, setOpen] = useState(false);
  // the game page's big „ოთახის გახსნა“ (GameFrame) opens this window at once
  useNewRoomAsk(() => {
    if (blocked || mine) return false;
    setOpen(true);
    return true;
  });
  if (blocked) return <Card><p className="text-body leading-snug wrap-break-word">{blocked}</p></Card>;
  return (
    <div className="flex w-full flex-col gap-3">
      {mine && (
        <Card className="flex flex-wrap items-center gap-3">
          <span className="flex min-w-0 flex-1 basis-48 flex-col">
            <span className="text-lead font-bold wrap-break-word">{mine.title}</span>
            <span className="text-meta text-mut">{mine.sub}</span>
          </span>
          <Button size="md" icon={<Play strokeWidth={2} />} onClick={onResume}>დაბრუნება</Button>
        </Card>
      )}

      {rooms.length > 0 && (
        <>
          <SectionLabel label="ღია ოთახები შენს კლასებში" />
          <Rows>
            {rooms.map(r => (
              <Row
                key={r.id}
                lead={<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-wine text-white [&_svg]:size-[18px]"><Icon /></span>}
                title={r.title}
                sub={r.sub}
                right={<Button size="md" kind={r.primary ? 'primary' : 'soft'} className="shrink-0" onClick={() => onEnter(r.classId, r.id)}>{r.action}</Button>}
              />
            ))}
          </Rows>
        </>
      )}

      <Button full icon={<DoorOpen strokeWidth={2} />} onClick={() => setOpen(true)}>ოთახის გახსნა</Button>

      <Sheet open={open} title="ახალი ოთახი" onClose={() => setOpen(false)}>
        <SectionLabel label="ვის ეპატიჟები" />
        <div role="radiogroup" aria-label="ვის ეპატიჟები" className="flex flex-wrap gap-2">
          {classes.map(c => {
            const on = c.id === picked;
            return (
              <Press
                key={c.id}
                role="radio"
                aria-checked={on}
                onClick={() => onPick(c.id)}
                className="group flex h-tap max-w-full cursor-pointer items-center rounded-full focus-visible:outline-none"
              >
                <span className={cx(
                  'flex h-10 max-w-full min-w-tap items-center justify-center truncate rounded-full px-4 text-body transition group-active:scale-[0.97]',
                  'group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
                  on ? 'bg-wine font-bold text-white' : 'bg-surf font-semibold text-ink',
                )}>
                  {c.name} · {c.count}
                </span>
              </Press>
            );
          })}
        </div>
        {play && (
          <>
            <SectionLabel label="შენ" />
            <Seg
              label="შენ"
              value={play.value ? 'play' : 'lead'}
              onChange={v => play.set(v === 'play')}
              items={[{ id: 'play', label: 'ვთამაშობ' }, { id: 'lead', label: 'მხოლოდ ვუძღვები' }]}
            />
          </>
        )}
        <Helper icon={<Info />}>{play ? play.line : hostLine}</Helper>
        {err && <p role="alert" className="px-1.5 text-meta font-bold text-danger">{err}</p>}
        <Button full disabled={!picked || busy} icon={<Send strokeWidth={2} />} onClick={() => { void onCreate().then(ok => { if (ok) setOpen(false); }); }}>
          {busy ? 'იხსნება…' : 'გახსენი და მოიწვიე'}
        </Button>
      </Sheet>
    </div>
  );
};
