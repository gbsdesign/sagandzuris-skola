import React from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { HABIT_ITEMS } from '../../data/habitsAndManera';
import { useChants } from '../../context';

interface ChvevebiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function HabitRow({
  label,
  isChecked,
  onToggle,
}: {
  label: string;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-start justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer select-none active:scale-[0.98] active:shadow-none ${
        isChecked
          ? 'bg-amber-100/70 border-amber-300 text-amber-950 shadow-2xs'
          : 'bg-white/90 border-slate-200/90 hover:border-amber-200 hover:bg-amber-50/30'
      }`}
    >
      <span className="font-medium text-xs sm:text-sm flex-1">{label}</span>
      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {isChecked && (
          <span className="text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
            ჩვევა მიღწეულია
          </span>
        )}
        <div
          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
            isChecked
              ? 'bg-amber-600 border-amber-600 text-white'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </div>
      </div>
    </div>
  );
}

export const ChvevebiModal: React.FC<ChvevebiModalProps> = ({ isOpen, onClose }) => {
  const { habitsStats, saveHabitsToFirestore } = useChants();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-50/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-amber-200/90 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
      >
        <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#85502c]" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800">
              სწორის სულიერი ნიადაგის შესაქმნელად ლოცვითი ჩვევები
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-300 shadow-2xs shrink-0"
            title="დახურვა"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3 sm:p-4 text-slate-700 space-y-2">
            <p className="font-bold text-amber-900">განმარტება:</p>
            <p>
              ნიადაგი ეს არის რაშიც მყარად არის „ჩაფლულია“ საძირკველი, ხოლო საძირკველზე დგას შენობა ანუ მგალობლის შემოქმედება.
            </p>
            <p>
              სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება საძირკველი და ვერც მგალობლის შემოქმედება. აქ მოცემულია ჩვევების სია, თუ რა არის საჭირო სწორი სულიერი ნიადაგის მოსამზადებლად:
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {HABIT_ITEMS.map((habit) => (
              <HabitRow
                key={habit.id}
                label={habit.label}
                isChecked={Boolean(habitsStats[habit.id])}
                onToggle={() => {
                  const next = { ...habitsStats, [habit.id]: !habitsStats[habit.id] };
                  saveHabitsToFirestore(next);
                }}
              />
            ))}
          </div>

          {/* Compact Notification Banner at bottom */}
          <div className="bg-amber-100/60 border border-amber-300/80 rounded-xl p-2.5 sm:p-3 text-amber-950 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-900 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <p className="text-[11px] sm:text-xs text-amber-900 leading-tight flex-1">
              <span className="font-bold">შეტყობინება (ყოველ კვირას 09:00 სთ):</span> სია ავტომატურად იწმინდება კვირაში ერთხელ — ხელახლა შეავსე და მონიშნე შენი ჩვევები.
            </p>
          </div>
        </div>
      </SwipeToDismiss>
    </div>
  );
};
