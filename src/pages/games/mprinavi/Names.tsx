import React from 'react';
import { NOTE_NAMES, type NameKind } from '../../../utils/mprinavi';
import { triggerHaptic } from '../../../utils/haptics';

// „მფრინავი ნოტები“'s seven buttons, დო to სი (or C to H), each its own colour the way children's chime bars have them.

export const NAME_TINT = ['#b23a48', '#cf7428', '#b08a12', '#4f8a3c', '#24827e', '#2b5f8a', '#5b3f8c'];

export const NameButtons: React.FC<{ kind: NameKind; disabled?: boolean; onName: (step: number) => void; mark?: { step: number; ok: boolean } | null }> = ({
  kind, disabled, onName, mark = null,
}) => (
  <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="ნოტის სახელი">
    {NOTE_NAMES[kind].map((n, i) => (
      <button
        key={n}
        type="button"
        disabled={disabled}
        onPointerDown={e => { if (disabled || e.button > 0) return; e.preventDefault(); triggerHaptic(6); onName(i); }}
        onKeyDown={e => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onName(i); } }}
        style={{
          background: NAME_TINT[i],
          boxShadow: mark && mark.step === i ? `0 0 0 3px ${mark.ok ? '#2f7d4f' : '#c2410c'}` : '0 3px 0 rgba(0,0,0,0.22)',
        }}
        className={`h-14 min-w-0 rounded-2xl font-serif-ge ${kind === 'syl' ? 'text-[15px]' : 'text-[19px]'} font-bold text-white cursor-pointer active:translate-y-[2px] disabled:opacity-50 disabled:cursor-default`}
      >
        {n}
      </button>
    ))}
  </div>
);
