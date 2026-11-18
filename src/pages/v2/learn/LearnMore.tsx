import React from 'react';
import { ArrowUpDown, Bell, Headphones, RotateCcw } from 'lucide-react';
import { Card, Choice, Dot, Note, Row, Rows, SectionLabel, Seg, Sheet, Stepper, ToggleRow } from '../../../components/ui2';
import { learnTips, useReviewReminder } from '../../../components/learn/LearnShared';
import type { LearnAction } from './parts';

// The learning mode's „⋯“ (board x-stsavla's notes): what was on the screen and is needed only now and then — the rare ways
// (the notes big, the learned phrases together), „მორგება“ (speed, what is heard, tone, earphones), „გამეორების
// შეხსენება“ and „როგორ ვისწავლო“ — the same controls the old look has, in the kit's window.

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

export interface LearnMoreProps {
  open: boolean;
  onClose: () => void;
  /** rare ways, only those that apply now */
  ways: LearnAction[];
  speed: number;
  speeds: { value: number; label: string }[];
  onSpeed: (v: number) => void;
  /** what is heard (a chant of two voices or more) */
  mix: { value: string; options: { id: string; label: string }[]; onChange: (id: string) => void } | null;
  tone: number;
  onTone: (v: number) => void;
  /** me in the left ear, the others in the right (a chant of two voices or more) */
  phones: { on: boolean; onChange: (on: boolean) => void } | null;
  /** a member: the reviews' reminder */
  reminder: boolean;
}

export const LearnMore: React.FC<LearnMoreProps> = ({ open, onClose, ways, speed, speeds, onSpeed, mix, tone, onTone, phones, reminder }) => (
  <Sheet open={open} title="მეტი" onClose={onClose}>
    {ways.length > 0 && (
      <Rows>
        {ways.map(w => (
          <Row key={w.label} lead={w.icon ? <Dot icon={w.icon} /> : undefined} title={w.label} onClick={w.run} disabled={w.disabled} wrap />
        ))}
      </Rows>
    )}

    <SectionLabel label="მორგება" />
    <div className="flex shrink-0 flex-col gap-1.5">
      <span className="px-1.5 text-meta font-semibold text-mut">სისწრაფე</span>
      <Seg label="სისწრაფე" value={String(speed)} onChange={v => onSpeed(Number(v))}
        items={speeds.map(s => ({ id: String(s.value), label: s.label }))} />
    </div>
    {mix && (
      <div className="flex shrink-0 flex-col gap-1.5">
        <span className="px-1.5 text-meta font-semibold text-mut">რა ისმის</span>
        <Rows role="radiogroup" aria-label="რა ისმის">
          {mix.options.map(o => <Choice key={o.id} title={o.label} on={mix.value === o.id} onClick={() => mix.onChange(o.id)} />)}
        </Rows>
      </div>
    )}
    <Rows>
      <Row lead={<Dot icon={<ArrowUpDown />} />} title="ტონი" sub={tone ? `${signed(tone)} ნახევარტონი` : 'როგორც ნოტებშია'}
        right={<Stepper label="ტონი" value={tone} min={-7} max={7} onChange={onTone} format={v => (v ? signed(v) : '0')} />} />
      {tone !== 0 && <Row lead={<Dot icon={<RotateCcw />} />} title="ნოტებისაზე" onClick={() => onTone(0)} right={null} />}
      {phones && (
        <ToggleRow lead={<Dot icon={<Headphones />} />} title="ყურსასმენი" wrap
          sub="შენი ხმა მარცხენა ყურში, დანარჩენები — მარჯვენაში („ყველა“ და „ჩემი ხმა წინ“)"
          on={phones.on} onChange={phones.onChange} />
      )}
    </Rows>
    {mix && <Note>„რა ისმის“-ს ყოველი ნაბიჯი თავად ირჩევს — აქ მაშინ შეცვალე, თუ სხვანაირად გინდა.</Note>}

    {reminder && <Reminder />}

    <SectionLabel label="როგორ ვისწავლო" />
    <Card>
      <ul className="flex flex-col gap-2.5">
        {learnTips().map(([h, t]) => (
          <li key={h} className="text-body leading-snug text-ink wrap-break-word"><b className="text-wine">{h}.</b> {t}</li>
        ))}
      </ul>
    </Card>
  </Sheet>
);

/** „გამეორების შეხსენება“: the switch and the hours (the old look's ReviewReminder, the same store). */
const Reminder: React.FC = () => {
  const { at, note, turn, times } = useReviewReminder();
  return (
    <>
      <SectionLabel label="გამეორების შეხსენება" />
      <Rows>
        <ToggleRow lead={<Dot icon={<Bell />} />} title="შეხსენება" wrap
          sub={at ? `იმ დღეს, როცა გასამეორებელი გაქვს, ${at}-ზე` : 'ტელეფონი შეგახსენებს, როცა ნასწავლი გასამეორებელია'}
          on={Boolean(at)} onChange={on => { void turn(on ? '19:00' : ''); }} />
      </Rows>
      {at && <Seg label="საათი" value={at} onChange={t => { void turn(t); }} items={times.map(t => ({ id: t, label: t }))} />}
      {note && <p role="status" className="shrink-0 px-1.5 text-meta leading-normal text-gold-ink wrap-break-word">{note}</p>}
    </>
  );
};
