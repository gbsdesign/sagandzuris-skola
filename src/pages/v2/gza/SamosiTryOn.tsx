import React, { useEffect, useRef, useState } from 'react';
import { askConfirm } from '../../../components/ui/kit';
import { TRYON_TOTAL, TryOnError, TryOnLook, dressInChokha, removeTryOn, saveTryOn } from '../../../utils/samosiTryOn';
import { TryOnSheetView } from './SamosiSheets';

// „ჩოხა შენს ფოტოზე“ (board x-potoze-chatsma) — the old SamosiTryOn's work in the new look: pick a photo, Gemini dresses
// it in this chokha (utils/samosiTryOn.ts), the picture is kept in the account; download it or delete it. Shown only to
// those given „ფოტოზე ჩოხის ჩაცმა“ (feature samosiPhoto) and never in the kids' mode (the page decides).

const MESSAGES: Record<TryOnError['kind'], string> = {
  offline: 'ინტერნეტი არ არის — შეერთდი და სცადე ისევ. ცდა არ დაგეკარგა.',
  'no-tries': 'დღევანდელი ცდა უკვე გამოყენებულია.',
  'no-picture': 'ამ ფოტოზე ჩოხა ვერ ჩაიცვა. სცადე სხვა ფოტო — სახე კარგად და პირდაპირ უნდა ჩანდეს. ცდა არ დაგეკარგა.',
  setup: 'ეს ფუნქცია ჯერ არ არის ჩართული — ადმინისტრატორმა Firebase-ში უნდა ჩართოს. ცდა არ დაგეკარგა.',
  'no-credits': 'ჩოხის ჩაცმა ახლა დროებით შეჩერებულია — სკოლა ანგარიშს მალე შეავსებს. ცდა არ დაგეკარგა.',
  failed: 'ვერ მოხერხდა. სცადე ცოტა ხანში — ცდა არ დაგეკარგა.',
};

/** the tries in one short line (the board: „დღეს დარჩა 3 ცდა“ — the whole count is gone) */
export const tryOnStatus = (t: { loaded: boolean; left: number; total: number }, unlimited: boolean) =>
  !t.loaded ? ''
    : unlimited ? 'ცდები ულიმიტოა'
    : t.total >= TRYON_TOTAL ? 'ცდები ამოიწურა'
    : t.left > 0 ? `დღეს დარჩა ${t.left} ცდა`
    : 'ხვალ კიდევ 1 ცდა გექნება';

export const TryOnSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  uid: string;
  unlimited: boolean;
  look: TryOnLook;
  /** useTryOn's answer (the page reads it for the ⋯ row too) */
  tryOn: { loaded: boolean; url: string | null; left: number; total: number };
}> = ({ open, onClose, uid, unlimited, look, tryOn }) => {
  const { url, left } = tryOn;
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // a picture made but not saved to the account (the save failed): still shown, so it can be downloaded
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setPhoto(f);
    setError(null);
  };

  const run = async () => {
    if (!photo || busy || left <= 0) return;
    setBusy(true);
    setError(null);
    let picture: Blob;
    try {
      picture = await dressInChokha(photo, look);
    } catch (err) {
      setError(MESSAGES[err instanceof TryOnError ? err.kind : 'failed']);
      setBusy(false);
      return;
    }
    try {
      await saveTryOn(uid, picture, look.chokha.id, unlimited);
      if (fresh) URL.revokeObjectURL(fresh);
      setFresh(null);
    } catch (err) {
      console.warn('Firestore samosiTryOn save note:', err);
      setFresh(URL.createObjectURL(picture));
      setError(
        err instanceof TryOnError && err.kind === 'no-tries'
          ? MESSAGES['no-tries']
          : 'სურათი მზადაა, მაგრამ ანგარიშში ვერ შეინახა — ჩამოტვირთე, რომ არ დაიკარგოს.',
      );
    }
    setPhoto(null);
    setBusy(false);
  };

  const remove = async () => {
    if (!(await askConfirm({ title: 'ჩოხიანი სურათი წავშალო?', ok: 'წაშლა', danger: true }))) return;
    removeTryOn(uid).catch(err => console.warn('Firestore samosiTryOn remove note:', err));
  };

  return (
    <>
      <TryOnSheetView
        open={open}
        // while the chokha is being put on the sheet stays
        onClose={() => { if (!busy) onClose(); }}
        kept={fresh || url}
        canDelete={!!url && !fresh}
        onDelete={() => void remove()}
        preview={preview}
        onPick={() => fileRef.current?.click()}
        onUnpick={() => setPhoto(null)}
        busy={busy}
        error={error}
        left={left}
        status={tryOnStatus(tryOn, unlimited)}
        onRun={() => void run()}
      />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
    </>
  );
};
