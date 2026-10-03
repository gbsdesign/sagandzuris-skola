import React from 'react';
import { Sparkles, X, Check, RefreshCw } from 'lucide-react';
import { SwipeToDismiss } from '../ui/SwipeToDismiss';
import { HABIT_GROUPS, HABIT_ITEMS } from '../../data/habitsAndManera';
import { useChants } from '../../context';
import { formatNextHabitsReset } from '../../utils/habitsWeek';

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
    <button
      type="button"
      role="checkbox"
      aria-checked={isChecked}
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none active:scale-[0.98] active:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
        isChecked
          ? 'bg-amber-100/70 border-amber-300 text-amber-950 shadow-2xs'
          : 'bg-white/90 border-slate-200/90 text-slate-800 hover:border-amber-200 hover:bg-amber-50/30'
      }`}
    >
      <span className="flex-1 min-w-0 space-y-1">
        <span className="block font-medium text-sm leading-snug">{label}</span>
        {isChecked && (
          <span className="inline-block text-[11px] sm:text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
            ჩვევა მიღწეულია
          </span>
        )}
      </span>
      <span
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
          isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
        }`}
      >
        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
      </span>
    </button>
  );
}

export const ChvevebiModal: React.FC<ChvevebiModalProps> = ({ isOpen, onClose }) => {
  const { habitsStats, saveHabitsToFirestore } = useChants();

  if (!isOpen) return null;

  const doneCount = HABIT_ITEMS.filter((habit) => habitsStats[habit.id]).length;
  const totalCount = HABIT_ITEMS.length;
  const allDone = doneCount === totalCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onClose()}
    >
      <SwipeToDismiss
        onDismiss={onClose}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-50/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 shadow-2xl border border-amber-200/90 space-y-4 animate-in zoom-in-95 duration-200 text-slate-800"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-2xs shrink-0">
              <Sparkles className="w-5 h-5 text-[#85502c]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
              სწორი სულიერი ნიადაგის შესაქმნელად ლოცვითი ჩვევები
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-300 shadow-2xs shrink-0"
            title="დახურვა"
            aria-label="დახურვა"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-slate-700 space-y-2">
            <p className="font-bold text-amber-900">განმარტება:</p>
            <p>
              ნიადაგი არის ის, რაშიც მყარად არის „ჩაფლული“ საძირკველი, ხოლო საძირკველზე დგას შენობა — ანუ მგალობლის შემოქმედება.
            </p>
            <p>
              სწორი ნიადაგის მომზადების გარეშე ვერ დამყარდება ვერც საძირკველი და ვერც მგალობლის შემოქმედება. ქვემოთ მოცემულია ჩვევები, რომლებიც საჭიროა სწორი სულიერი ნიადაგის მოსამზადებლად.
            </p>
          </div>

          {/* Weekly progress */}
          <div className="bg-white/90 border border-amber-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-bold text-amber-950">ამ კვირის პროგრესი</p>
                <p className="text-xs text-slate-500">
                  {allDone ? 'ყველა ჩვევა შესრულებულია!' : 'მონიშნე, რაც ამ კვირაში შეასრულე'}
                </p>
              </div>
              <p className="font-black text-xl text-amber-950 tabular-nums shrink-0">
                {doneCount}
                <span className="text-sm font-bold text-slate-400"> / {totalCount}</span>
              </p>
            </div>
            <div
              className="h-2.5 rounded-full bg-amber-100 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={doneCount}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-amber-900/80">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>
                სია თავიდან დაიწყება: <span className="font-bold">{formatNextHabitsReset()}</span>
              </span>
            </p>
          </div>

          {HABIT_GROUPS.map((group) => {
            const groupDone = group.items.filter((habit) => habitsStats[habit.id]).length;
            return (
              <section key={group.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <h4 className="text-xs sm:text-sm font-extrabold text-amber-900">{group.title}</h4>
                  <span className="text-xs font-bold text-slate-400 tabular-nums">
                    {groupDone} / {group.items.length}
                  </span>
                </div>
                {group.items.map((habit) => (
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
              </section>
            );
          })}
        </div>
      </SwipeToDismiss>
    </div>
  );
};
