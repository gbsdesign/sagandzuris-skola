import React, { useRef } from 'react';
import { Bold } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Card, cx, Dot, Note, Rows, ToggleRow, TopBar } from '../../../components/ui2';
import { setTextBold, setTextStep, TEXT_STEPS, useTextLook } from '../../../design/look';
import { triggerHaptic } from '../../../utils/haptics';

// „ტექსტის ზომა“ (settings mapItem `text`; boards x-ultra-teqsti, -2): a sample line of a prayer, five steps from small to
// very big, and bold letters. The whole app follows at once (design/look.ts); a reading page's own − / + work on top.

const LAST = TEXT_STEPS.length - 1;

/** five steps on a line; a tap, a drag or the arrow keys move it */
const StepSlider: React.FC<{ value: number; onChange: (v: number) => void }> = ({ value, onChange }) => {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const stepAt = (x: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return value;
    const ratio = (x - r.left - 13) / Math.max(1, r.width - 26);
    return Math.max(0, Math.min(LAST, Math.round(ratio * LAST)));
  };
  const set = (v: number) => { if (v !== value) { triggerHaptic(8); onChange(v); } };
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (d) { e.preventDefault(); set(Math.max(0, Math.min(LAST, value + d))); }
    else if (e.key === 'Home') { e.preventDefault(); set(0); }
    else if (e.key === 'End') { e.preventDefault(); set(LAST); }
  };
  const at = (i: number) => `calc(13px + (100% - 26px) * ${i / LAST})`;
  return (
    <div
      ref={box}
      role="slider"
      tabIndex={0}
      aria-label="ტექსტის ზომა"
      aria-valuemin={0}
      aria-valuemax={LAST}
      aria-valuenow={value}
      aria-valuetext={TEXT_STEPS[value].name}
      onKeyDown={onKey}
      onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); set(stepAt(e.clientX)); }}
      onPointerMove={e => { if (dragging.current) set(stepAt(e.clientX)); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      className="relative h-tap min-w-0 flex-1 cursor-pointer touch-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60"
    >
      <span aria-hidden="true" className="absolute top-1/2 right-[13px] left-[13px] h-[3px] -translate-y-1/2 rounded-full bg-dim" />
      <span aria-hidden="true" className="absolute top-1/2 left-[13px] h-[3px] -translate-y-1/2 rounded-full bg-wine transition-[width]"
        style={{ width: `calc((100% - 26px) * ${value / LAST})` }} />
      {TEXT_STEPS.map((s, i) => (
        <span
          key={s.pct}
          aria-hidden="true"
          style={{ left: at(i) }}
          className={cx(
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all',
            i === value ? 'size-[26px] bg-wine shadow-lift' : cx('size-2.5', i < value ? 'bg-wine' : 'bg-dim'),
          )}
        />
      ))}
    </div>
  );
};

export const TextSizeScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { step, bold } = useTextLook();
  return (
    <div className="flex w-full flex-col gap-3 pb-5">
      <TopBar title="ტექსტის ზომა" onBack={handleGoBack} />
      <Card className="px-5 pt-[18px] pb-5">
        <div className="mb-2 text-meta font-semibold text-mut">ასე გამოჩნდება</div>
        <p className="font-serif-ge text-title leading-[1.75] text-ink wrap-break-word">მამაო ჩვენო, რომელი ხარ ცათა შინა, წმიდა იყავნ სახელი შენი…</p>
      </Card>
      <Card className="px-[18px] pt-[18px] pb-3.5">
        <div className="flex items-center gap-3.5">
          <span aria-hidden="true" className="text-body font-bold">ა</span>
          <StepSlider value={step} onChange={setTextStep} />
          <span aria-hidden="true" className="text-hero font-bold">ა</span>
        </div>
        <div aria-hidden="true" className="mt-1.5 text-center text-body font-bold text-wine">{TEXT_STEPS[step].name}</div>
      </Card>
      <Rows>
        <ToggleRow lead={<Dot icon={<Bold />} />} title="მსხვილი ასოები" on={bold} onChange={setTextBold} />
      </Rows>
      <Note>იცვლება ყველგან: ლოცვანი, წიგნები, ნოტების ტექსტი, სიები და ღილაკები.</Note>
    </div>
  );
};
