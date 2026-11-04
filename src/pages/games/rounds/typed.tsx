import React from 'react';
import { Check, Send, X } from 'lucide-react';
import { TEXT_MAX } from '../../../utils/roundGames';
import { Btn, FIELD } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';

// A quick game answered in words (2026-11-04, „რა? სად? როდის?“; face.ts `typed`): the field a player writes in, the host's
// list at the reveal (each one's words, right or not — a tap judges again) and the same list, read only, on the players'
// phones.

/** the player's field and its send button, one row at the screen's bottom (in view on a phone on its side too); Enter sends */
export const TypedField: React.FC<{ value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string }> = ({ value, onChange, onSend, placeholder }) => (
  <form onSubmit={e => { e.preventDefault(); if (value.trim()) onSend(); }} className="flex items-center gap-2">
    <input
      id="typed-answer"
      value={value}
      onChange={e => onChange(e.target.value.slice(0, TEXT_MAX))}
      maxLength={TEXT_MAX}
      placeholder={placeholder}
      aria-label="შენი პასუხი"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="send"
      className={`${FIELD} !h-14 !text-[17px] min-w-0 flex-1`}
    />
    <Btn type="submit" size="lg" disabled={!value.trim()} icon={<Send />} className="!h-14 !px-5 shrink-0">გაგზავნა</Btn>
  </form>
);

/** under the question while the field waits */
export const TYPED_HINT = 'პასუხი ქვემოთ დაწერე. ერთხელ იგზავნება; დრო რომ ამოიწურება, დაწერილი თავისით წავა.';

/** my verdict at the reveal: what I wrote and whether it counted */
export const typedVerdict = (text: string | null, gained: number) => {
  if (!text) return { tone: 'none' as const, text: 'პასუხი არ გაგიგზავნია' };
  return gained > 0 ? { tone: 'right' as const, text: 'სწორია — ჩაითვალა!' } : { tone: 'wrong' as const, text: 'არ ჩაითვალა' };
};

/** everybody's words at the reveal: the host's (a tap judges again) or a player's (read only, mine marked) */
export const TypedAnswers: React.FC<{
  names: string[]; texts: (string | null)[] | null | undefined; gained: number[] | null | undefined;
  me?: number; onJudge?: (seat: number, ok: boolean) => void;
}> = ({ names, texts, gained, me = -1, onJudge }) => {
  const rows = names.map((name, seat) => ({ name, seat, text: texts?.[seat] ?? null, ok: (gained?.[seat] ?? 0) > 0 }));
  const sent = rows.filter(r => r.text);
  const right = rows.filter(r => r.ok).length;
  // the answers first, then who sent none
  const order = [...sent, ...rows.filter(r => !r.text)];
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13.5px] font-bold text-[#4a3426]">{onJudge ? 'პასუხები — შეამოწმე' : 'ვინ რა დაწერა'}</p>
        <p className="text-[12.5px] tabular-nums text-[#9a8b7b]">სწორი {right} / {names.length}</p>
      </div>
      {onJudge && <p className="text-[12.5px] leading-snug text-[#75685a]">აპმა წინასწარ მონიშნა. რომელიც სწორად არ შეაფასა, შეეხე და შეცვალე — ქულები თავისით გასწორდება.</p>}
      <ul className="space-y-1.5">
        {order.map(r => {
          const mine = r.seat === me;
          const body = (
            <>
              <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${r.ok ? 'bg-white/20' : r.text ? 'bg-[#4a3426]/[0.08] text-[#9a8b7b]' : 'bg-transparent'}`}>
                {r.ok ? <Check className="w-4 h-4" /> : r.text ? <X className="w-4 h-4" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[12.5px] font-bold leading-tight ${r.ok ? 'text-white/85' : 'text-[#9a8b7b]'}`}>{r.name}{mine ? ' · შენ' : ''}</span>
                <span className={`block text-[15px] font-bold leading-snug [overflow-wrap:anywhere] ${r.ok ? 'text-white' : r.text ? 'text-[#4a3426]' : 'text-[#b9a993] italic font-normal'}`}>{r.text ?? 'არ უპასუხია'}</span>
              </span>
            </>
          );
          const look = `w-full min-h-14 rounded-2xl px-3 py-2 flex items-center gap-2.5 text-left ring-1 transition ${r.ok ? 'bg-[#2f7d4f] text-white ring-[#2f7d4f]' : 'bg-white ring-[#e8dcc8]'} ${mine && !r.ok ? '!ring-2 !ring-[#7a2028]/40' : ''}`;
          return (
            <li key={r.seat}>
              {onJudge && r.text ? (
                <button
                  type="button"
                  aria-pressed={r.ok}
                  aria-label={`${r.name}: ${r.text} — ${r.ok ? 'ჩათვლილია, შეეხე და გააუქმე' : 'არ არის ჩათვლილი, შეეხე და ჩაუთვალე'}`}
                  onClick={() => { triggerHaptic(8); onJudge(r.seat, !r.ok); }}
                  className={`${look} active:scale-[0.98] cursor-pointer`}
                >
                  {body}
                </button>
              ) : <div className={look}>{body}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
