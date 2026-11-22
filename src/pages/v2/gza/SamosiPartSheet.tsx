import React, { useEffect, useRef, useState } from 'react';
import { useAuth, useViewing } from '../../../context';
import { askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import type { Outfit } from '../../../utils/samosiTry';
import { PROOF_PROBLEM_TEXT, ProofError, checkRealPart, removeProof, saveProof, useProofPhoto } from '../../../utils/samosiProof';
import { PartSheetView, ProofStep } from './SamosiSheets';

// A part's card in a sheet — the old PartCard's work (components/views/SamosiProof.tsx) in the new look: the camera → the
// AI's check (utils/samosiProof.ts) → the photo kept in samosiProof/{uid}/parts/{id} and the part in students.samosiReal /
// .kabaReal; a real part shows its photo and „წაშლა“ (back to tried). A teacher's look has no camera.

export const PartSheet: React.FC<{
  outfit: Outfit;
  part: { id: string; label: string; story: string };
  pic: React.ReactNode;
  real: boolean;
  onClose: () => void;
  /** the AI saw the real part and it is kept (the page cheers) */
  onProved: (id: string) => void;
  /** a real part taken back: it stays tried on */
  onRemoved: (id: string) => void;
  /** a teacher's or an admin's photo of a student's part, from the letters' list (2026-11-22): theirs, with the camera */
  forUid?: string;
}> = ({ outfit, part, pic, real, onClose, onProved, onRemoved, forUid }) => {
  const { user, isOwner } = useAuth();
  const viewing = !!useViewing() && !forUid;
  const uid = forUid ?? user?.uid;
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ProofStep>({ kind: 'idle' });
  const [saved, setSaved] = useState(0);
  const photo = useProofPhoto(real ? uid : undefined, real ? part.id : null, saved);
  // the photo being checked, shown small beside the answer; let go once another comes or the sheet goes
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
      const v = await checkRealPart(uid, part, file, isOwner || !!forUid);
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

  return (
    <>
      <PartSheetView
        open
        // while the AI looks at the photo the sheet stays
        onClose={() => { if (step.kind !== 'checking') onClose(); }}
        part={part}
        pic={pic}
        real={real}
        photo={photo}
        step={step}
        viewing={viewing}
        onShoot={shoot}
        onDrop={() => void drop()}
      />
      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={e => void onPhoto(e.target.files?.[0])} />
    </>
  );
};
