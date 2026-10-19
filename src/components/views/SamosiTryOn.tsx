import React, { useEffect, useRef, useState } from 'react';
import { Camera, ChevronRight, Download, ImagePlus, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context';
import { useAccess } from '../../hooks/useAccess';
import { Btn, IconBtn, Sheet } from '../ui/kit';
import { TRYON_TOTAL, TryOnError, TryOnLook, dressInChokha, removeTryOn, saveTryOn, useTryOn } from '../../utils/samosiTryOn';

const MESSAGES: Record<TryOnError['kind'], string> = {
  offline: 'ინტერნეტი არ არის — შეერთდი და სცადე ისევ. ცდა არ დაგეკარგა.',
  'no-tries': 'დღევანდელი ცდა უკვე გამოყენებულია.',
  'no-picture': 'ამ ფოტოზე ჩოხა ვერ ჩაიცვა. სცადე სხვა ფოტო — სახე კარგად და პირდაპირ უნდა ჩანდეს. ცდა არ დაგეკარგა.',
  setup: 'ეს ფუნქცია ჯერ არ არის ჩართული — ადმინისტრატორმა Firebase-ში უნდა ჩართოს. ცდა არ დაგეკარგა.',
  'no-credits': 'ჩოხის ჩაცმა ახლა დროებით შეჩერებულია — სკოლა ანგარიშს მალე შეავსებს. ცდა არ დაგეკარგა.',
  failed: 'ვერ მოხერხდა. სცადე ცოტა ხანში — ცდა არ დაგეკარგა.',
};

const LINK_BTN =
  'inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-bold cursor-pointer select-none transition active:scale-[0.97] bg-[#7a2028]/[0.08] hover:bg-[#7a2028]/[0.14] text-[#7a2028] [&>svg]:w-[18px] [&>svg]:h-[18px]';

// "ჩემი სამოსი" on the member's own photo (utils/samosiTryOn.ts): one row in the open card with the kept
// picture and the tries left; a tap opens one window to pick a photo, dress it, download or delete the result.
// Shown only to those given "ფოტოზე ჩოხის ჩაცმა" (feature samosiPhoto).
export const SamosiTryOn: React.FC<{ look: TryOnLook }> = ({ look }) => {
  const color = look.chokha;
  const { user } = useAuth();
  const access = useAccess();
  const allowed = !!user && access.can('samosiPhoto');
  const { loaded, url, left, total } = useTryOn(allowed ? user?.uid : null);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  // a picture made but not saved to the account (the save failed): still shown, so it can be downloaded
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (!allowed || !user) return null;

  const shown = fresh || url;
  const status =
    total >= TRYON_TOTAL ? 'ცდები ამოიწურა' : left > 0 ? `დღეს დარჩა ${left} ცდა · სულ ${TRYON_TOTAL - total}` : 'ხვალ კიდევ 1 ცდა გექნება';

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
      await saveTryOn(user.uid, picture, color.id);
      if (fresh) URL.revokeObjectURL(fresh);
      setFresh(null);
    } catch (err) {
      console.warn('Firestore samosiTryOn save note:', err);
      setFresh(URL.createObjectURL(picture));
      setError(
        err instanceof TryOnError && err.kind === 'no-tries'
          ? MESSAGES['no-tries']
          : 'სურათი მზადაა, მაგრამ ანგარიშში ვერ შეინახა — ჩამოტვირთე, რომ არ დაიკარგოს.'
      );
    }
    setPhoto(null);
    setBusy(false);
  };

  const remove = () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setConfirmDelete(false);
    removeTryOn(user.uid).catch(err => console.warn('Firestore samosiTryOn remove note:', err));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 p-2 pr-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#eadfcb] text-left cursor-pointer transition-colors hover:bg-[#f6eedf] active:scale-[0.99]"
      >
        <span className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-white flex items-center justify-center text-[#7a2028] shadow-[0_1px_2px_rgba(42,32,23,0.08)]">
          {shown ? <img src={shown} alt="" aria-hidden className="w-full h-full object-cover object-top" /> : <Camera className="w-5 h-5" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-bold text-[#2a2017] leading-tight">{shown ? 'ჩემი ფოტო ჩოხაში' : 'ჩაიცვი ჩოხა შენს ფოტოზე'}</span>
          <span className="block mt-0.5 text-xs font-semibold text-[#8a7a6a]">{loaded ? status : ' '}</span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 text-[#b3a593]" />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        locked={busy}
        title="ფოტოზე ჩაცმა"
        footer={
          <div className="space-y-2">
            <Btn
              kind="primary"
              size="lg"
              full
              disabled={!photo || busy || left <= 0}
              onClick={run}
              icon={busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
            >
              {busy ? 'ვაცმევ ჩოხას…' : 'ჩოხის ჩაცმა'}
            </Btn>
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-xs font-semibold text-[#8a7a6a]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full ring-1 ring-inset ring-black/15" style={{ background: color.hex }} aria-hidden />
                {color.label}
              </span>
              {look.hat && (
                <>
                  <span aria-hidden>·</span>
                  <span>{look.hat.label}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{status}</span>
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {/* the kept picture, while no new photo is picked */}
          {shown && !photo && (
            <figure className="space-y-2.5">
              <img src={shown} alt="ჩემი ფოტო ჩოხაში" className="w-full max-h-[56dvh] object-contain rounded-2xl bg-white ring-1 ring-[#eadfcb]" />
              <div className="flex flex-wrap items-center gap-2">
                <a href={shown} download="chokha.jpg" className={LINK_BTN}>
                  <Download />
                  ჩამოტვირთვა
                </a>
                {url && !fresh && (
                  <Btn kind="danger" size="sm" icon={<Trash2 />} onClick={remove}>
                    {confirmDelete ? 'წავშალო?' : 'წაშლა'}
                  </Btn>
                )}
              </div>
            </figure>
          )}

          {/* the new photo: a picker, then its preview (dimmed while the chokha is being put on) */}
          {photo && preview ? (
            <div className="relative">
              <img src={preview} alt="არჩეული ფოტო" className="w-full max-h-[52dvh] object-contain rounded-2xl bg-white ring-1 ring-[#eadfcb]" />
              {busy ? (
                <div className="absolute inset-0 rounded-2xl bg-[#2a2017]/50 flex flex-col items-center justify-center gap-1.5 text-white text-center px-6" role="status">
                  <Loader2 className="w-8 h-8 animate-spin mb-1" />
                  <p className="text-[15px] font-bold">ვაცმევ ჩოხას…</p>
                  <p className="text-xs opacity-85">ეს 10–30 წამს გრძელდება</p>
                </div>
              ) : (
                <IconBtn label="სხვა ფოტო" onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-white/90 shadow-[0_2px_8px_rgba(42,32,23,0.2)]">
                  <X />
                </IconBtn>
              )}
            </div>
          ) : (
            left > 0 && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-7 px-6 rounded-2xl border-2 border-dashed border-[#d8c9b0] bg-white/60 text-center cursor-pointer transition-colors hover:bg-white hover:border-[#7a2028]/40"
              >
                <ImagePlus className="w-7 h-7 text-[#7a2028] mb-1" />
                <span className="text-[15px] font-bold text-[#7a2028]">{shown ? 'ახალი ფოტო' : 'აირჩიე ფოტო'}</span>
                <span className="text-xs text-[#8a7a6a]">სახე ან მთლიანი ტანი — კარგად განათებული, სახე პირდაპირ</span>
              </button>
            )
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />

          {error && <p className="rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2.5 text-[13px] leading-relaxed text-red-800" role="alert">{error}</p>}

          <p className="text-[11px] leading-relaxed text-[#9a8b7a]">
            ფოტო დასამუშავებლად Google-ის AI-ს (Gemini) ეგზავნება. ანგარიშში მხოლოდ ჩოხიანი სურათი ინახება — მას მხოლოდ შენ და სკოლის
            ადმინისტრაცია ხედავთ.
          </p>
        </div>
      </Sheet>
    </>
  );
};
