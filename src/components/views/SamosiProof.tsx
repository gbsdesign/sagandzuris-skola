import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, Trash2, X } from 'lucide-react';
import { useAuth, useViewing } from '../../context';
import { triggerHaptic } from '../../utils/haptics';
import { askConfirm } from '../ui/kit';
import type { Outfit } from '../../utils/samosiTry';
import { PROOF_PROBLEM_TEXT, ProofError, checkRealPart, removeProof, saveProof, useProofPhoto } from '../../utils/samosiProof';

// „ჩემი სამოსი“'s real parts (utils/samosiProof.ts): the card of the part just tapped — its story and, while it is only
// tried on, the camera that makes it the member's for good; once real, its photo. Also the tiles' mark and the legend.

export type PartState = 'none' | 'tried' | 'real';

/** The little round mark on a part's picture: wine = tried on, green = real (photographed). `inline` = in a line of
 *  text (the legend), not on a picture's corner. */
export const PartMark: React.FC<{ state: PartState; big?: boolean; inline?: boolean }> = ({ state, big, inline }) => (
  <span
    className={`${inline ? 'inline-flex shrink-0' : 'absolute -top-1 -right-1'} ${big ? 'w-5 h-5' : 'w-4 h-4'} rounded-full flex items-center justify-center ring-2 ring-white transition-all duration-200 ${
      state === 'real' ? 'bg-emerald-600 text-white scale-100' : state === 'tried' ? 'bg-[#7a2028] text-white scale-100' : 'bg-white text-transparent scale-0'
    }`}
  >
    <Check className={`${big ? 'w-3 h-3' : 'w-2.5 h-2.5'} stroke-[4]`} />
  </span>
);

/** A tile's look by its part's state. */
export const tileTone = (state: PartState) =>
  state === 'real'
    ? 'bg-emerald-50/70 ring-emerald-600/35'
    : state === 'tried'
      ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/35'
      : 'bg-[#f8f5ef] ring-transparent hover:bg-[#f2ece2]';

/** What the two marks mean, in one quiet line over the tiles. */
export const ProofLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-0.5 text-[12px] leading-snug text-[#6b5a4a]">
    <span className="inline-flex items-center gap-1.5">
      <PartMark state="real" inline />
      <b className="font-bold text-emerald-800">ნამდვილი</b> — გადაღებული, სამუდამოდ
    </span>
    <span className="inline-flex items-center gap-1.5">
      <PartMark state="tried" inline />
      <b className="font-bold text-[#7a2028]">მოსინჯული</b> — გასვლისას მოიხსნება
    </span>
  </div>
);

type Step =
  | { kind: 'idle' }
  | { kind: 'checking'; preview: string }
  | { kind: 'no'; preview: string; why: string }
  | { kind: 'error'; text: string };

/** The card under the figure for the part last tapped. `onProved` runs once the AI has seen the real part and it is
 *  kept (the caller cheers); `onClose` folds the card. */
export const PartCard: React.FC<{
  outfit: Outfit;
  part: { id: string; label: string; story: string };
  pic: React.ReactNode;
  state: PartState;
  onProved: (id: string) => void;
  /** a real part taken back (it stays tried on) */
  onRemoved: (id: string) => void;
  onClose: () => void;
}> = ({ outfit, part, pic, state, onProved, onRemoved, onClose }) => {
  const { user, isOwner } = useAuth();
  const viewing = useViewing();
  const uid = user?.uid;
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [saved, setSaved] = useState(0);
  const photo = useProofPhoto(state === 'real' ? uid : undefined, state === 'real' ? part.id : null, saved);
  const real = state === 'real';
  // the photo being checked, shown small beside the answer; let go once another comes or the card goes
  const shown = useRef<string | null>(null);
  const show = (url: string | null) => {
    if (shown.current) URL.revokeObjectURL(shown.current);
    shown.current = url;
  };
  useEffect(() => () => show(null), []);

  const shoot = () => {
    if (!input.current) return;
    input.current.value = '';
    input.current.click();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file || !uid) return;
    const preview = URL.createObjectURL(file);
    show(preview);
    setStep({ kind: 'checking', preview });
    try {
      const v = await checkRealPart(uid, part, file, isOwner);
      if (!v.ok) {
        triggerHaptic(20);
        setStep({ kind: 'no', preview, why: v.why || `ფოტოზე ${part.label} ვერ დავინახე — გადაიღე ახლოდან, მთლიანად და კარგ სინათლეზე.` });
        return;
      }
      await saveProof(uid, outfit, part.id, v.small);
      show(null);
      setStep({ kind: 'idle' });
      setSaved(n => n + 1);
      onProved(part.id);
    } catch (err) {
      show(null);
      setStep({ kind: 'error', text: err instanceof ProofError ? PROOF_PROBLEM_TEXT[err.kind] : 'ფოტო ვერ შეინახა — კიდევ სცადე.' });
    }
  };

  const drop = async () => {
    if (!uid) return;
    const yes = await askConfirm({
      title: `${part.label} ნამდვილებიდან წავშალო?`,
      text: 'მისი ფოტოც წაიშლება — ნაწილი ისევ მოსინჯული გახდება.',
      ok: 'წაშლა',
      danger: true,
    });
    if (!yes) return;
    onRemoved(part.id);
    removeProof(uid, outfit, part.id).catch(err => {
      console.warn('samosi proof remove:', err?.code || err);
      setStep({ kind: 'error', text: 'ვერ წაიშალა — კიდევ სცადე.' });
    });
  };

  const busy = step.kind === 'checking';

  return (
    <div
      className={`rounded-2xl ring-1 p-2.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-300 ${real ? 'bg-emerald-50/60 ring-emerald-600/25' : 'bg-[#fbf6ec] ring-[#eadfcb]'}`}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="relative w-10 h-10 shrink-0 rounded-xl bg-white shadow-[0_1px_2px_rgba(42,32,23,0.08)] flex items-center justify-center overflow-hidden">
          {pic}
        </span>
        <p className="flex-1 min-w-0 pt-0.5 text-[13px] leading-relaxed text-[#4a3426]">
          <span className={`font-bold ${real ? 'text-emerald-800' : 'text-[#7a2028]'}`}>{part.label}. </span>
          {part.story}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="w-9 h-9 shrink-0 -my-1 rounded-full flex items-center justify-center text-[#a99a88] hover:text-[#7a2028] hover:bg-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* the real part's photo */}
      {real && (
        <div className="flex items-end gap-3">
          {photo ? (
            <img src={photo} alt={`ჩემი ${part.label}`} className="h-28 max-w-[60%] rounded-xl object-cover ring-1 ring-emerald-700/15 shadow-[0_6px_16px_-10px_rgba(20,80,50,0.6)]" />
          ) : (
            <span aria-hidden className="h-28 w-24 rounded-xl bg-white/70 ring-1 ring-emerald-700/10" />
          )}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-2">
            <span className="inline-flex items-start gap-1.5 rounded-xl bg-emerald-600/10 px-2.5 py-1.5 text-[13px] font-bold leading-snug text-emerald-800">
              <Check className="w-4 h-4 mt-px shrink-0 stroke-[3]" /> ნამდვილია — სამუდამოდ შენია
            </span>
            <button
              type="button"
              onClick={drop}
              className="-ml-1 inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full text-[13px] font-bold text-[#8a7a6a] hover:text-red-700 hover:bg-white cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" /> წაშლა
            </button>
          </div>
        </div>
      )}

      {/* tried on: the camera makes it real (not on a teacher's look — the member photographs their own) */}
      {!real && (
        <>
          {(step.kind === 'checking' || step.kind === 'no') && (
            <div className="flex items-center gap-3">
              <img src={step.preview} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-black/10" />
              {step.kind === 'checking' ? (
                <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#4a3426]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7a2028]" /> AI ამოწმებს ფოტოს…
                </span>
              ) : (
                <p className="text-[13px] leading-snug font-semibold text-amber-900">{step.why}</p>
              )}
            </div>
          )}
          {step.kind === 'error' && <p className="text-[13px] leading-snug font-semibold text-red-700">{step.text}</p>}
          {!viewing && (
            <button
              type="button"
              onClick={shoot}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2 rounded-full bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] text-[14px] font-bold cursor-pointer transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-default shadow-[0_4px_12px_-6px_rgba(122,32,40,0.7)]"
            >
              <Camera className="w-5 h-5 shrink-0" />
              {step.kind === 'no' ? 'თავიდან გადაღება' : `გადაიღე შენი ${part.label}`}
            </button>
          )}
          <p className="text-[12px] leading-snug text-[#8a7a6a] text-center">
            {viewing
              ? 'მოსინჯულია — ფოტოს მოსწავლე თავად გადაიღებს.'
              : 'ნამდვილი გაქვს? გადაიღე — AI შეამოწმებს და სამუდამოდ შენი იქნება. თუ არა, მხოლოდ მოსინჯულია და გასვლისას მოიხსნება.'}
          </p>
          <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e => onPhoto(e.target.files?.[0])} />
        </>
      )}
    </div>
  );
};
