import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus } from 'lucide-react';
import { useAuth } from '../../context';
import { PrayerHour } from '../../data/prayers';
import { Btn, FIELD, Sheet } from '../ui/kit';
import { loadPsalmFirstWords, loadPsalmHtml, useHourPsalms } from '../../utils/hourPsalms';
import { searchNormalize } from '../../utils/searchMatch';
import { FoldedPrayer } from './PrayerText';

// The end of one of the seven hours, after „მოწყალებისა კარი“: the psalms one added for this hour
// (only this one), folded, and „ფსალმუნის დამატება“ — all 150 by number and first words, a tap adds or takes away.
export const HourPsalms: React.FC<{ hour: PrayerHour }> = ({ hour }) => {
  const { user } = useAuth();
  const { list, toggle } = useHourPsalms(user?.uid, hour.id);
  const [picking, setPicking] = useState(false);

  return (
    <>
      {list.map(n => (
        <FoldedPrayer
          key={`${hour.id}:${n}`}
          id={`psalm-${n}`}
          label={`ფსალმუნი ${n}`}
          load={() => loadPsalmHtml(n)}
          onRemove={() => toggle(n)}
          className="mt-3"
        />
      ))}
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="mt-3 w-full min-h-12 px-4 rounded-2xl border border-dashed border-[#7a2028]/30 flex items-center justify-center gap-2 font-sans text-[14px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.04] cursor-pointer active:scale-[0.99] transition"
      >
        <Plus className="w-[18px] h-[18px]" />
        ფსალმუნის დამატება
      </button>
      <PsalmPicker open={picking} onClose={() => setPicking(false)} hour={hour} chosen={list} onToggle={toggle} />
    </>
  );
};

const PsalmPicker: React.FC<{ open: boolean; onClose: () => void; hour: PrayerHour; chosen: number[]; onToggle: (n: number) => void }> = ({
  open,
  onClose,
  hour,
  chosen,
  onToggle,
}) => {
  const [first, setFirst] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return setQuery('');
    if (first) return;
    setFailed(false);
    loadPsalmFirstWords().then(setFirst, () => setFailed(true));
  }, [open, first]);

  // a number finds the psalms that start with it ("5" → 5, 50–59), words find the first words
  const rows = useMemo(() => {
    const all = (first || []).map((words, i) => ({ n: i + 1, words }));
    const q = query.trim();
    if (!q) return all;
    if (/^\d+$/.test(q)) return all.filter(r => String(r.n).startsWith(q));
    const nq = searchNormalize(q);
    return all.filter(r => searchNormalize(r.words).includes(nq));
  }, [first, query]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="ფსალმუნის დამატება"
      footer={
        <Btn full onClick={onClose}>
          მზადაა
        </Btn>
      }
    >
      <p className="font-sans text-[13px] font-semibold text-[#8a7a6a] mb-3">ემატება მხოლოდ ლოცვას {hour.label}.</p>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="ნომერი ან სიტყვა"
        aria-label="ფსალმუნის ძებნა"
        className={FIELD}
      />
      {failed ? (
        <p className="py-8 text-center font-sans text-[14px] text-[#8a7a6a]">სია ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>
      ) : !first ? (
        <Loader2 className="w-6 h-6 my-8 mx-auto animate-spin text-[#7a2028]" />
      ) : rows.length === 0 ? (
        <p className="py-8 text-center font-sans text-[14px] text-[#8a7a6a]">ასეთი ფსალმუნი ვერ მოიძებნა.</p>
      ) : (
        <ul className="mt-2 -mx-2">
          {rows.map(({ n, words }) => {
            const on = chosen.includes(n);
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => onToggle(n)}
                  aria-pressed={on}
                  className={`w-full min-h-12 px-2 py-1.5 flex items-center gap-3 text-left rounded-xl cursor-pointer transition-colors ${
                    on ? 'bg-[#7a2028]/[0.07]' : 'hover:bg-[#7a2028]/[0.04]'
                  }`}
                >
                  <span className="w-8 shrink-0 text-right font-sans text-[14px] font-bold tabular-nums text-[#8a7a6a]">{n}</span>
                  <span className="flex-1 min-w-0 font-serif-ge text-[15.5px] leading-snug text-[#2a2017]">{words}</span>
                  <span
                    className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                      on ? 'bg-[#7a2028] text-white' : 'ring-1 ring-[#7a2028]/25 text-[#7a2028]'
                    }`}
                  >
                    {on ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
};
