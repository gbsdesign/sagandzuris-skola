import React from 'react';
import { CalendarDays, CircleCheck, CloudDownload, FileText, LayoutTemplate, QrCode, Users } from 'lucide-react';
import { Dot, Row, Rows, Sheet, Val } from '../../../components/ui2';

// The bar's ⋯ of the program: what the old page held that the board leaves out — the date, the class, the templates, keeping
// the program offline, the QR code and the PDF. („გუნდი მომყვება“ stands on the page itself since stage 7 — board x-ultra-gundi-1.)

export interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  regent: boolean;
  /** the date as shown, and its ISO value for the picker */
  dateText: string;
  dateValue: string;
  onDate: (iso: string) => void;
  /** the regent's classes (a choice only with several) */
  classes: { id: string; name: string }[];
  classId: string | null;
  className?: string;
  onClass: (id: string) => void;
  onTemplates: () => void;
  hasItems: boolean;
  offline: { done: boolean; busy: boolean; label: string };
  onOffline: () => void;
  onQr: () => void;
  onPdf: () => void;
  pdfBusy: boolean;
}

/** a row that opens the phone's own picker: the picker is laid over it, invisible */
const Picker: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="relative">{children}</div>;

export const MoreSheet: React.FC<MoreSheetProps> = p => (
  <Sheet open={p.open} title="მეტი" onClose={p.onClose}>
    {p.regent && (
      <Rows>
        <Picker>
          <Row lead={<Dot icon={<CalendarDays />} />} title="თარიღი" right={<Val>{p.dateText}</Val>} />
          <input type="date" value={p.dateValue} aria-label="თარიღი"
            onChange={e => e.target.value && p.onDate(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </Picker>
        {p.classes.length > 1 ? (
          <Picker>
            <Row lead={<Dot icon={<Users />} />} title="რომელ კლასს" right={<Val>{p.className ?? ''}</Val>} />
            <select value={p.classId ?? ''} aria-label="რომელ კლასს" onChange={e => p.onClass(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0">
              {p.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Picker>
        ) : null}
        <Row lead={<Dot icon={<LayoutTemplate />} />} title="შაბლონები" onClick={p.onTemplates} />
      </Rows>
    )}
    <Rows>
      <Row
        lead={<Dot icon={p.offline.done ? <CircleCheck /> : <CloudDownload />} />}
        title="ჩამოწერა ოფლაინისთვის"
        sub={p.offline.label}
        wrap
        disabled={!p.hasItems || p.offline.busy}
        onClick={p.onOffline}
      />
      <Row lead={<Dot icon={<QrCode />} />} title="QR კოდი" disabled={!p.hasItems} onClick={p.onQr} />
      <Row lead={<Dot icon={<FileText />} />} title="PDF" sub={p.pdfBusy ? 'მზადდება…' : undefined} disabled={!p.hasItems || p.pdfBusy} onClick={p.onPdf} />
    </Rows>
  </Sheet>
);
