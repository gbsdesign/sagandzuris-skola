import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Hourglass, Info } from 'lucide-react';
import { Card, Dot, Helper, Note, Num, Rows, Sheet, Choice, ToggleRow } from '../../../components/ui2';
import { useWaitForPedal } from './usePedal';
import type { PedalPrefs } from './pedal';

const STEPS = ['ჩართე პედალი.', 'ტელეფონის Bluetooth-ში აირჩიე ის.', 'დააჭირე ერთხელ — აქ გამოჩნდება.'];

/** First-time setup: three steps, then it waits for one press. */
export const PedalSetupSheet: React.FC<{ open: boolean; onClose: () => void; onReady: () => void }> = ({ open, onClose, onReady }) => {
  const [heard, setHeard] = useState(false);
  useEffect(() => { if (!open) setHeard(false); }, [open]);
  useWaitForPedal(open && !heard, () => setHeard(true));
  useEffect(() => {
    if (!heard) return;
    const t = setTimeout(onReady, 1200);
    return () => clearTimeout(t);
  }, [heard, onReady]);
  return (
    <Sheet open={open} title="ხელების გარეშე" onClose={onClose}>
      <Card pad="none" className="flex flex-col gap-4 p-5">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <Num n={i + 1} on />
            <span className="min-w-0 flex-1 text-lead font-semibold wrap-break-word">{s}</span>
          </div>
        ))}
      </Card>
      <Rows aria-live="polite">
        <div className="flex min-h-14 items-center gap-2.5 py-2 pr-3 pl-4">
          <Dot icon={heard ? <Check strokeWidth={2.6} /> : <Hourglass />} color={heard ? 'leaf' : 'tint'} />
          <span className="min-w-0 flex-1 text-lead font-bold wrap-break-word">
            {heard ? 'პედალი მუშაობს' : 'ველოდები პედლის დაჭერას…'}
          </span>
        </div>
      </Rows>
      <Helper icon={<Info />}>პედალი ტელეფონისთვის ჩვეულებრივი კლავიატურაა. აპში ცალკე არაფერი ყენდება.</Helper>
    </Sheet>
  );
};

/** Settings: how far one press goes, a second pedal, the next chant at the end. */
export const PedalSettingsSheet: React.FC<{
  open: boolean; onClose: () => void; prefs: PedalPrefs; onChange: (p: PedalPrefs) => void;
}> = ({ open, onClose, prefs, onChange }) => (
  <Sheet open={open} title="პედალი" onClose={onClose}>
    <h3 className="px-1 text-meta font-semibold text-mut">ერთი დაჭერა</h3>
    <Rows role="radiogroup" aria-label="ერთი დაჭერა">
      <Choice title="ერთი ეკრანით ქვემოთ" on={prefs.step === 'screen'} onClick={() => onChange({ ...prefs, step: 'screen' })} />
      <Choice title="ნახევარი ეკრანით" on={prefs.step === 'half'} onClick={() => onChange({ ...prefs, step: 'half' })} />
    </Rows>
    <Rows>
      <ToggleRow
        lead={<Dot icon={<ChevronLeft />} />}
        title="მეორე პედალი — უკან" sub="თუ ორი პედალი გაქვს" wrap
        on={prefs.back} onChange={v => onChange({ ...prefs, back: v })}
      />
      <ToggleRow
        lead={<Dot icon={<ChevronRight />} />}
        title="ბოლოში — შემდეგი საგალობელი" wrap
        on={prefs.nextAtEnd} onChange={v => onChange({ ...prefs, nextAtEnd: v })}
      />
    </Rows>
    <Helper icon={<Info />}>თავისით არაფერი გადაიხვევა — მხოლოდ შენი დაჭერით.</Helper>
  </Sheet>
);

/** The dark card shown after the first press. */
export const PedalToast: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="sg-up flex w-full max-w-[520px] items-center gap-3 rounded-card bg-ink p-3.5 text-white shadow-float">
        <span aria-hidden="true" className="flex size-icon shrink-0 items-center justify-center rounded-full bg-leaf [&_svg]:size-[18px]">
          <Check strokeWidth={2.6} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-lead font-bold">პედალი მუშაობს</span>
          <span className="text-meta text-white/80 wrap-break-word">ერთი დაჭერა — ნოტები ერთი ეკრანით ჩამოდის</span>
        </span>
      </div>
    </div>
  );
};
