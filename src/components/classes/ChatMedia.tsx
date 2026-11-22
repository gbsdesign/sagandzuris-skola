import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Loader2, Send, X } from 'lucide-react';
import { loadPartsUrl, type ChatMessage } from '../../hooks/useClassChat';
import { useBackToClose } from '../../utils/backToClose';
import { triggerHaptic } from '../../utils/haptics';
import { Sheet } from '../ui2';

// The chat's photos and files (2026-11-22, the user: „ფოტოს ატვირთვა, გადაღება, ვოისი და ფაილი … როგორც მესენჯერში“) and the
// quick button's choice: the arrow, or an emoji sent with one tap on an empty field.

const sizeWords = (n: number) => (n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} მბ` : `${Math.max(1, Math.round(n / 1024))} კბ`);

/** Saves a made file: a link with its name (the iPhone app gives it to the share sheet). */
const saveUrl = (url: string, name: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

export const PhotoBubble: React.FC<{ m: ChatMessage; base: string; stamp: string; meta: React.ReactNode }> = ({ m, base, stamp, meta }) => {
  const [open, setOpen] = useState(false);
  const ratio = m.w && m.h ? Math.min(1.6, Math.max(0.6, m.h / m.w)) : 1;
  return (
    <>
      <button type="button" onClick={() => { triggerHaptic(8); setOpen(true); }} aria-label="ფოტოს გახსნა"
        className="relative block w-[min(64vw,260px)] cursor-pointer overflow-hidden rounded-tile bg-soft">
        {m.thumb
          ? <img src={m.thumb} alt="ფოტო" className="block w-full object-cover" style={{ aspectRatio: `1 / ${ratio}` }} draggable={false} />
          : <span className="block w-full" style={{ aspectRatio: '1 / 1' }} />}
        <span className={`absolute right-1.5 bottom-1.5 rounded-full bg-black/45 px-1.5 py-1 ${stamp} text-white`}>{meta}</span>
      </button>
      {open && <PhotoViewer m={m} base={base} onClose={() => setOpen(false)} />}
    </>
  );
};

const PhotoViewer: React.FC<{ m: ChatMessage; base: string; onClose: () => void }> = ({ m, base, onClose }) => {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useBackToClose(true, onClose);
  useEffect(() => {
    let live = true;
    loadPartsUrl(base, m, m.mime || 'image/jpeg').then(u => { if (live) setUrl(u); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [base, m]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="ფოტო" className="fixed inset-0 z-[80] flex flex-col bg-black safe-top safe-bottom" onClick={onClose}>
      <div className="flex shrink-0 items-center justify-between gap-2 p-3" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="დახურვა"
          className="flex size-tap cursor-pointer items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25"><X /></button>
        <span className="min-w-0 truncate text-meta text-white/80">{m.name}</span>
        <button type="button" disabled={!url} onClick={() => url && saveUrl(url, `foto-${m.id}.jpg`)} aria-label="შენახვა"
          className="flex size-tap cursor-pointer items-center justify-center rounded-full bg-white/15 text-white active:bg-white/25 disabled:opacity-40"><Download /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <img src={url || m.thumb} alt="ფოტო" draggable={false} onClick={e => e.stopPropagation()}
          className={`max-h-full max-w-full object-contain ${url ? '' : 'blur-sm'}`} />
        {!url && !failed && <Loader2 className="absolute size-8 animate-spin text-white/80" aria-label="იტვირთება" />}
        {failed && <p className="absolute bottom-6 rounded-full bg-black/60 px-4 py-2 text-meta text-white">სრული ფოტო ვერ ჩაიტვირთა.</p>}
      </div>
    </div>,
    document.body,
  );
};

export const FileBubble: React.FC<{ m: ChatMessage; base: string; mine: boolean; stamp: string; meta: React.ReactNode }> = ({ m, base, mine, stamp, meta }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const name = m.fileName || 'ფაილი';
  const get = async () => {
    setBusy(true);
    setFailed(false);
    try {
      saveUrl(await loadPartsUrl(base, m, m.mime || 'application/octet-stream'), name);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-1 py-0.5">
      <button type="button" onClick={get} disabled={busy} aria-label={`${name} — გადმოწერა`}
        className="flex min-w-[min(60vw,220px)] cursor-pointer items-center gap-2.5 text-left disabled:cursor-default">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${mine ? 'bg-white/15 text-white' : 'bg-tint text-wine'}`}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <FileText className="size-5" />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="line-clamp-2 text-body font-semibold break-words">{name}</span>
          <span className={`text-cap ${mine ? 'text-white/80' : 'text-mut'}`}>
            {failed ? 'ვერ ჩამოიტვირთა — სცადე ხელახლა' : `${sizeWords(m.size || 0)} · გადმოწერა`}
          </span>
        </span>
      </button>
      <p className={`flex justify-end ${stamp}`}>{meta}</p>
    </div>
  );
};

// ---- the quick button (2026-11-22, the user: „ეს დააპატარავე და გაგზავნის ისარი ჩასვი … დიდხანს დაჭერისას ამოდიოდეს ფანჯარა და
// სმაილის შეცვლა შემეძლოს … თავდაპირველად კი ისარი ეყენოს ყველგან“): the device's choice, the arrow by default ----

const QUICK_KEY = 'sg-chat-quick';
export const QUICK_EMOJIS = ['❤️', '👍', '🙏', '😊', '😂', '😍', '👏', '🔥', '🌹', '🎵', '✅', '🤝'];
const readQuick = () => {
  try {
    const v = localStorage.getItem(QUICK_KEY) || '';
    return QUICK_EMOJIS.includes(v) ? v : '';
  } catch { return ''; }
};
export const useQuickEmoji = () => {
  const [quick, setQuick] = useState(readQuick);
  const choose = (v: string) => {
    setQuick(v);
    try { if (v) localStorage.setItem(QUICK_KEY, v); else localStorage.removeItem(QUICK_KEY); } catch { /* private mode */ }
  };
  return [quick, choose] as const;
};

export const QuickSheet: React.FC<{ open: boolean; quick: string; onPick: (v: string) => void; onClose: () => void }> = ({ open, quick, onPick, onClose }) => {
  const opt = (v: string, body: React.ReactNode, label: string) => (
    <button key={v || 'arrow'} type="button" aria-pressed={quick === v} aria-label={label}
      onClick={() => { triggerHaptic(10); onPick(v); onClose(); }}
      className={`flex h-14 cursor-pointer items-center justify-center rounded-tile text-title leading-none transition active:scale-95 ${
        quick === v ? 'bg-tint ring-2 ring-wine' : 'bg-surf active:bg-soft'}`}>
      {body}
    </button>
  );
  return (
    <Sheet open={open} onClose={onClose} title="სწრაფი ღილაკი">
      <div className="flex flex-col gap-3 pb-1">
        <p className="px-1 text-meta text-mut">ცარიელ ველზე არჩეული ემოჯი ერთი შეხებით გაიგზავნება. ისარი — მხოლოდ ტექსტის გაგზავნა.</p>
        <div className="grid grid-cols-4 gap-2">
          {opt('', <Send className="size-6 text-wine" aria-hidden="true" />, 'ისარი')}
          {QUICK_EMOJIS.map(e => opt(e, <span aria-hidden="true">{e}</span>, e))}
        </div>
      </div>
    </Sheet>
  );
};
