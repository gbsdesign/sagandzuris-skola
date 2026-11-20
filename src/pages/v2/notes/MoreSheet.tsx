// „მეტი“ of the notes page in the new look (board x-notebi-meti): one sheet with two groups — how the notes look
// (tone, size, paper, the text, the screen, the pedal) and what to do with this chant (my list, the service, share and
// QR, the camera, offline, files, the home button). Drawn only — the notes page keeps every state and handler.
import React, { useState } from 'react';
import {
  Bookmark, ChevronDown, CloudDownload, Download, File, FileText, Footprints, Headphones, ListPlus, Music2, Pin, QrCode, Scan,
  ScanLine, Send, Sun, Type, ZoomIn,
} from 'lucide-react';
import { cx, FOCUS, FOCUS_IN, Press, RoundButton, Row, Rows, SectionLabel, Sheet, Small, Stepper, ToggleRow } from '../../../components/ui2';
import { Fork } from './BottomBar';

export type Paper = 'day' | 'candle' | 'night' | 'auto';

const PAPERS: { id: Paper; label: string; look: string }[] = [
  { id: 'day', label: 'დღე', look: 'bg-surf' },
  { id: 'candle', label: 'სანთელი', look: 'bg-gold-tint' },
  { id: 'night', label: 'ღამე', look: 'bg-night-surf' },
  { id: 'auto', label: 'ავტომატური', look: 'bg-linear-135 from-surf from-50% to-night-surf to-50%' },
];

/** a row's wine icon (the board's rows have no round under it) */
const Ic: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span aria-hidden="true" className="flex w-6 shrink-0 justify-center text-wine [&_svg]:size-5">{children}</span>
);

/** a file's buttons: one a voice */
const FilePills: React.FC<{ icon: React.ReactNode; label: string; items: { label: string; aria: string; onClick: () => void }[] }> = ({ icon, label, items }) => (
  <div role="group" aria-label={label} className="flex flex-col gap-2 py-3 pr-3 pl-4">
    <span className="flex items-center gap-2.5 text-body font-semibold"><Ic>{icon}</Ic>{label}</span>
    <div className="flex flex-wrap gap-1.5 pl-[34px]">
      {items.map(it => (
        <Press
          key={it.aria}
          onClick={it.onClick}
          aria-label={it.aria}
          className={cx('flex h-tap min-w-tap cursor-pointer items-center justify-center rounded-full bg-page px-4 text-body font-bold transition active:scale-95 active:bg-soft', FOCUS)}
        >
          {it.label}
        </Press>
      ))}
    </div>
  </div>
);

export const MoreSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** the tone (−7…+7); only when the chant has notes that sound */
  tone?: { value: number; onChange: (v: number) => void };
  zoom: { pct: number; canIn: boolean; canOut: boolean; onIn: () => void; onOut: () => void; onFit: () => void };
  paper: Paper;
  onPaper: (p: Paper) => void;
  /** the words under the notes; only when the chant has them */
  text?: { on: boolean; onToggle: () => void };
  wake: { on: boolean; note: string; locked: boolean; onToggle: () => void };
  onPedal: () => void;
  saved: { on: boolean; onToggle: () => void };
  /** the teacher's service being composed: this chant's № in it, or null */
  program?: { num: number | null; onToggle: () => void };
  onShare: () => void;
  /** „გაუგზავნე კლასს ან მოსწავლეს“: teachers and admins only */
  onSend?: () => void;
  onScan: () => void;
  offline: { done: boolean; busy: boolean; onSave: () => void };
  /** PDF of the notes, MP3 of the synthesizer per voice, MP3 of the recording per voice */
  files: {
    pdf?: () => void;
    voices: string[];
    allLabel: string;
    mp3?: (which: number | 'all') => void;
    recTracks: number[];
    recMp3: (i: number) => void;
  } | null;
  /** null: not signed in */
  pinned: boolean | null;
  onPin: () => void;
}> = p => {
  const [files, setFiles] = useState(false);
  const zoomed = p.zoom.pct !== 100;
  return (
    <Sheet open={p.open} title="მეტი" onClose={p.onClose}>
      <SectionLabel label="როგორ ჩანს" />
      <Rows>
        {p.tone && (
          <Row
            lead={<Ic><Fork /></Ic>}
            title="ტონი"
            right={(
              <Stepper
                label="ტონი" value={p.tone.value} min={-7} max={7} onChange={p.tone.onChange}
                format={v => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0')}
              />
            )}
          />
        )}
        <Row
          lead={<Ic><ZoomIn /></Ic>}
          title="ზომა"
          right={(
            <span className="flex items-center gap-1.5">
              {zoomed && (
                <RoundButton label="ეკრანზე მორგება" size={36} tone="page" onClick={p.zoom.onFit}><Scan /></RoundButton>
              )}
              {/* a step bigger or smaller (pinch still zooms freely): the value is only the % shown */}
              <Stepper
                label="ნოტების ზომა" value={1} min={p.zoom.canOut ? 0 : 1} max={p.zoom.canIn ? 2 : 1}
                onChange={v => (v > 1 ? p.zoom.onIn() : p.zoom.onOut())}
                format={() => `${p.zoom.pct}%`}
                className="[&_output]:min-w-12"
              />
            </span>
          )}
        />
        <Row
          lead={<Ic><File /></Ic>}
          title="ფურცელი"
          right={(
            <span role="group" aria-label="ფურცლის ფერი" className="-mr-1 flex">
              {PAPERS.map(it => (
                <Press
                  key={it.id}
                  aria-pressed={p.paper === it.id}
                  aria-label={`ფურცელი: ${it.label}`}
                  title={it.label}
                  onClick={() => p.onPaper(it.id)}
                  className="group flex h-tap w-[38px] cursor-pointer items-center justify-center rounded-full focus-visible:outline-none"
                >
                  <span className={cx(
                    'size-7 rounded-full transition group-active:scale-90',
                    'group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-wine/60',
                    it.look,
                    p.paper === it.id ? 'ring-2 ring-wine ring-offset-2 ring-offset-surf' : 'ring-1 ring-dim',
                  )} />
                </Press>
              ))}
            </span>
          )}
        />
        {p.text && (
          <ToggleRow lead={<Ic><Type /></Ic>} title="ტექსტი ნოტების ქვეშ" on={p.text.on} onChange={p.text.onToggle} />
        )}
        <ToggleRow
          lead={<Ic><Sun /></Ic>}
          title="ეკრანი არ ჩაქრეს"
          sub={p.wake.note || (p.wake.locked ? 'ტაძრის რეჟიმში ყოველთვის' : undefined)}
          on={p.wake.on}
          onChange={p.wake.onToggle}
          disabled={p.wake.locked}
          wrap
        />
        <Row lead={<Ic><Footprints /></Ic>} title="ხელების გარეშე · პედალი" onClick={p.onPedal} />
      </Rows>

      <SectionLabel label="ეს საგალობელი" />
      <Rows>
        <ToggleRow lead={<Ic><Bookmark /></Ic>} title="ჩემს სიაში დამატება" sub={p.saved.on ? 'სიაშია — დამოუკიდებელი სამუშაო' : undefined}
          on={p.saved.on} onChange={p.saved.onToggle} wrap />
        {p.program && (
          <Row
            lead={<Ic><ListPlus /></Ic>}
            title={p.program.num ? `წირვაშია · №${p.program.num}` : 'წირვაში დამატება'}
            right={p.program.num ? <Small tone="wine">ამოღება</Small> : 'chev'}
            onClick={p.program.onToggle}
          />
        )}
        {p.onSend && (
          <Row lead={<Ic><Send /></Ic>} title="გაუგზავნე კლასს ან მოსწავლეს" sub="ჩათში" onClick={p.onSend} wrap />
        )}
        <Row lead={<Ic><QrCode /></Ic>} title="გაზიარება და QR" onClick={p.onShare} />
        <Row lead={<Ic><ScanLine /></Ic>} title="QR კოდის წაკითხვა" sub="კამერით" onClick={p.onScan} />
        <Row
          lead={<Ic><CloudDownload /></Ic>}
          title="ჩამოწერა ოფლაინისთვის"
          right={(
            <Small tone={p.offline.done ? 'leaf' : 'wine'}>
              {p.offline.busy ? 'იწერება…' : p.offline.done ? '✓ ჩამოწერილია' : 'ჩამოწერა'}
            </Small>
          )}
          // saved or saving: a plain line that only says so
          onClick={p.offline.busy || p.offline.done ? undefined : p.offline.onSave}
        />
        {p.files && (
          <Row
            lead={<Ic><Download /></Ic>}
            title="ფაილები: PDF და MP3"
            aria-expanded={files}
            right={<ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', files && 'rotate-180')} />}
            onClick={() => setFiles(o => !o)}
          />
        )}
        {p.files && files && p.files.pdf && (
          <Press
            onClick={p.files.pdf}
            className={cx('flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-2 pr-4 pl-4 text-left text-body font-semibold active:bg-soft', FOCUS_IN)}
          >
            <Ic><FileText /></Ic>
            <span className="min-w-0 flex-1">ნოტები · PDF</span>
            <Download aria-hidden="true" className="size-[18px] text-mut" />
          </Press>
        )}
        {p.files && files && p.files.mp3 && (
          <FilePills
            icon={<Music2 />}
            label="სინთეზატორი · MP3"
            items={[
              { label: p.files.allLabel, aria: `სინთეზატორი, ${p.files.allLabel} ხმა`, onClick: () => p.files!.mp3!('all') },
              ...p.files.voices.map((v, i) => ({ label: v, aria: `სინთეზატორი, ${v} ხმა`, onClick: () => p.files!.mp3!(i) })),
            ]}
          />
        )}
        {p.files && files && p.files.recTracks.length > 0 && (
          <FilePills
            icon={<Headphones />}
            label="ჩანაწერი · MP3"
            items={p.files.recTracks.map(i => ({
              label: ['I', 'II', 'III', 'სამივე'][i],
              aria: `ჩანაწერი, ${['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'][i]}`,
              onClick: () => p.files!.recMp3(i),
            }))}
          />
        )}
        {p.pinned !== null && (
          <ToggleRow lead={<Ic><Pin /></Ic>} title="მთავარზე ღილაკად" on={p.pinned} onChange={p.onPin} />
        )}
      </Rows>
    </Sheet>
  );
};
