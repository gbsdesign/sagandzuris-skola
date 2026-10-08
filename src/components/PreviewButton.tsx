import React from 'react';
import { LoaderCircle, Play, Square } from 'lucide-react';
import { usePreview } from '../utils/listPreview';
import { triggerHaptic } from '../utils/haptics';

// The small round ▶ in a corner of a version / performer button (the size of the teacher's "+"): a quick listen
// without leaving the list. The circle is small, the tap area around it is larger.
export const PreviewButton: React.FC<{
  id: string;
  onToggle: () => void;
  label: string;
  className?: string;
}> = ({ id, onToggle, label, className = '' }) => {
  const phase = usePreview(id);
  const on = phase !== null;
  const text = on ? 'გაჩერება' : label;
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); triggerHaptic(12); onToggle(); }}
      className={`absolute z-[1] w-[18px] h-[18px] rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 before:absolute before:-inset-2 before:content-[''] ${
        on
          ? 'bg-[#b4620e] text-white shadow-[0_3px_8px_-3px_rgba(180,98,14,0.85)]'
          : 'bg-white text-[#b4620e] shadow-[inset_0_0_0_1.5px_#d9a55a] hover:bg-[#fcf1df]'
      } ${className}`}
      title={text}
      aria-label={text}
      aria-pressed={on}
    >
      {phase === 'loading' ? (
        <LoaderCircle className="w-3 h-3 animate-spin" />
      ) : phase === 'playing' ? (
        <Square className="w-2 h-2 fill-current" />
      ) : (
        <Play className="w-2.5 h-2.5 fill-current translate-x-[0.5px]" />
      )}
    </button>
  );
};
