// The notes page's two small QR tools (beside the title): this chant's code for a phone nearby, and the camera
// that reads one — a chant of the app opens in place. The phone's back closes either.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, Flashlight, FlashlightOff, LoaderCircle, RotateCcw, X } from 'lucide-react';
import { findVersion } from '../../data/chantLookup';
import { qrTarget, type QrTarget } from '../../utils/qrLink';
import { triggerHaptic } from '../../utils/haptics';
import { useNewLook } from '../../design/newLook';

/** One history entry while open: the phone's back and Escape close it; returns the ✕'s close. */
export function useBackClose(key: string, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const back = useCallback(() => {
    if (window.history.state?.[key]) window.history.back();
    else closeRef.current();
  }, [key]);
  useEffect(() => {
    try { if (!window.history.state?.[key]) window.history.pushState({ ...(window.history.state || {}), [key]: 1 }, ''); } catch { /* still opens */ }
    const onPop = (e: PopStateEvent) => { if (!e.state?.[key]) closeRef.current(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); back(); } };
    window.addEventListener('popstate', onPop);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('keydown', onKey, true); };
  }, [key, back]);
  return back;
}

const copyText = (text: string, say: (msg: string) => void) => {
  try { navigator.clipboard.writeText(text).then(() => say('ბმული დაკოპირდა'), () => say(text)); } catch { say(text); }
};

/** This chant's QR code: another phone's camera opens the same notes. */
export const QrSheet: React.FC<{ url: string; title: string; sub: string; say: (msg: string) => void; onClose: () => void }> = ({ url, title, sub, say, onClose }) => {
  const back = useBackClose('sgQr', onClose);
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      if (alive) setSvg(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
    }).catch(() => alive && setSvg(''));
    return () => { alive = false; };
  }, [url]);
  return (
    <>
      <div className="np-qr-scrim" onClick={back} aria-hidden />
      <div className="np-qr-sheet" role="dialog" aria-label="QR კოდი">
        <div className="np-qr-grip" aria-hidden />
        <button type="button" className="np-qr-x" onClick={back} aria-label="დახურვა" title="დახურვა"><X /></button>
        <h3>{title}</h3>
        {sub && <p className="np-qr-sub">{sub}</p>}
        <div className="np-qr-code">
          {svg ? <div className="np-qr-svg" dangerouslySetInnerHTML={{ __html: svg }} /> : <LoaderCircle className="animate-spin" />}
        </div>
        <p className="np-qr-hint">მეორე ტელეფონი კამერას მიუშვერს — ეს ნოტები გაეხსნება.</p>
        <button type="button" className="np-qr-copy" onClick={() => copyText(url, say)}><Copy /> ბმულის კოპირება</button>
      </div>
    </>
  );
};

type Detect = (v: HTMLVideoElement) => Promise<string | null>;

interface BarcodeDetectorLike { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }
interface BarcodeDetectorClass {
  new (o: { formats: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

/** The phone's own reader where it has one (Android's Chrome), else jsQR on the frame's middle square. */
async function makeDetector(): Promise<Detect> {
  const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorClass }).BarcodeDetector;
  if (BD) {
    try {
      const formats = (await BD.getSupportedFormats?.()) ?? [];
      if (formats.includes('qr_code')) {
        const d = new BD({ formats: ['qr_code'] });
        return async v => (await d.detect(v))[0]?.rawValue || null;
      }
    } catch { /* fall back */ }
  }
  const { default: jsQR } = await import('jsqr');
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  return async v => {
    const w = v.videoWidth, h = v.videoHeight;
    if (!ctx || !w || !h) return null;
    const side = Math.min(w, h);
    const n = Math.round(side * Math.min(1, 640 / side));
    c.width = c.height = n;
    ctx.drawImage(v, (w - side) / 2, (h - side) / 2, side, side, 0, 0, n, n);
    const img = ctx.getImageData(0, 0, n, n);
    return jsQR(img.data, n, n, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

type CamState = 'starting' | 'live' | 'denied' | 'nocam';

/** Full-screen camera that reads a QR code. A chant of the app closes it with that chant's id. */
export const QrScanner: React.FC<{ onClose: (vid?: string) => void }> = ({ onClose }) => {
  const found = useRef<string | undefined>(undefined);
  const back = useBackClose('sgScan', () => onClose(found.current));
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CamState>('starting');
  const [other, setOther] = useState<Extract<QrTarget, { kind: 'link' | 'text' }> | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // the new look: the phone's torch, shown only when the camera has one (null = none)
  const nl = useNewLook();
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [torch, setTorch] = useState<boolean | null>(null);
  const paused = useRef(false);
  paused.current = Boolean(other);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const handle = (raw: string) => {
      const t = qrTarget(raw, window.location.href, vid => Boolean(findVersion(vid)));
      triggerHaptic(18);
      if (t.kind === 'chant') { found.current = t.vid; back(); return; }
      if (t.kind === 'app') { window.location.assign(t.path); return; }
      setOther(t);
    };
    (async () => {
      setState('starting');
      if (!navigator.mediaDevices?.getUserMedia) { setState('nocam'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (err) {
        if (!stopped) setState((err as DOMException)?.name === 'NotAllowedError' ? 'denied' : 'nocam');
        return;
      }
      if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
      const cam = stream.getVideoTracks()[0] ?? null;
      trackRef.current = cam;
      try {
        const caps = cam?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorch(caps?.torch ? false : null);
      } catch { setTorch(null); }
      const v = videoRef.current;
      if (!v) return;
      v.srcObject = stream;
      try { await v.play(); } catch { /* autoplay: the muted video starts once shown */ }
      if (stopped) return;
      setState('live');
      const detect = await makeDetector().catch(() => null);
      if (!detect) return;
      const tick = async () => {
        if (stopped) return;
        if (!paused.current && v.readyState >= 2) {
          try {
            const raw = await detect(v);
            if (raw && !stopped && !paused.current) handle(raw);
          } catch { /* one bad frame */ }
        }
        if (!stopped) timer = window.setTimeout(tick, 160);
      };
      tick();
    })();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach(t => t.stop());
      trackRef.current = null;
      setTorch(null);
    };
  }, [attempt, back]);

  const again = () => { setOther(null); setCopied(false); };
  const toggleTorch = () => {
    const cam = trackRef.current;
    if (!cam || torch === null) return;
    triggerHaptic(10);
    const on = !torch;
    cam.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).then(() => setTorch(on), () => setTorch(null));
  };

  // the new look (board x-notebi-kamera): a dark screen, the square with gold corners, the words under it and the torch
  if (nl) {
    return createPortal(
      <div className="np-scan" role="dialog" aria-modal="true" aria-label="QR კოდის წაკითხვა">
        <video ref={videoRef} className="np-scan-video" playsInline muted autoPlay aria-hidden />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-7 px-6 pt-16 pb-10 text-white">
          {state === 'live' && (
            <div aria-hidden className="relative size-[min(68vw,46vh,260px)] shrink-0 rounded-card bg-white/5 ring-[200vmax] ring-black/55">
              <i className="absolute -top-0.5 -left-0.5 size-11 rounded-tl-card border-t-4 border-l-4 border-gold-tint" />
              <i className="absolute -top-0.5 -right-0.5 size-11 rounded-tr-card border-t-4 border-r-4 border-gold-tint" />
              <i className="absolute -bottom-0.5 -left-0.5 size-11 rounded-bl-card border-b-4 border-l-4 border-gold-tint" />
              <i className="absolute -right-0.5 -bottom-0.5 size-11 rounded-br-card border-r-4 border-b-4 border-gold-tint" />
              {!other && <span className="np-scan-beam" />}
            </div>
          )}
          {state === 'live' && !other && (
            <p className="relative max-w-[300px] text-center text-lead leading-normal text-white/85">მიუშვირე QR კოდს — ნოტები თავად გაიხსნება.</p>
          )}
          {state === 'live' && !other && torch !== null && (
            <div className="relative flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleTorch}
                aria-pressed={torch}
                aria-label="ფანარი"
                title="ფანარი"
                className={`flex size-15 cursor-pointer items-center justify-center rounded-full transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 [&_svg]:size-6 ${torch ? 'bg-gold-tint text-ink' : 'bg-white/15 text-white'}`}
              >
                {torch ? <Flashlight /> : <FlashlightOff />}
              </button>
              <span className="text-meta text-white/70">ფანარი</span>
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[calc(14px+env(safe-area-inset-top,0px))] pb-3.5">
          <button
            type="button"
            onClick={back}
            aria-label="დახურვა"
            title="დახურვა"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80 [&_svg]:size-5"
          >
            <X />
          </button>
          <h2 className="min-w-0 truncate text-head font-bold text-white">QR კოდის წაკითხვა</h2>
        </div>
        {state === 'starting' && <div className="np-scan-wait"><LoaderCircle className="animate-spin" /></div>}
        {(state === 'denied' || state === 'nocam') && (
          <div className="np-scan-card">
            <b>{state === 'denied' ? 'კამერაზე წვდომა არ არის' : 'კამერა ვერ ჩაირთო'}</b>
            <p>{state === 'denied' ? 'ნება დართე კამერაზე ტელეფონის პარამეტრებში და სცადე თავიდან.' : 'ამ მოწყობილობაზე კამერა ვერ მოიძებნა.'}</p>
            <div className="np-scan-row">
              <button type="button" className="main" onClick={() => setAttempt(n => n + 1)}><RotateCcw /> თავიდან</button>
              <button type="button" onClick={back}>დახურვა</button>
            </div>
          </div>
        )}
        {other && (
          <div className="np-scan-card">
            <b>{other.kind === 'link' ? 'ეს კოდი სხვა საიტისაა' : 'კოდში წერია'}</b>
            <p className="np-scan-text">{other.kind === 'link' ? other.url : other.text}</p>
            <div className="np-scan-row">
              {other.kind === 'link'
                ? <a className="main" href={other.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> გახსნა</a>
                : (
                  <button type="button" className="main" onClick={() => copyText(other.text, () => setCopied(true))}>
                    <Copy /> {copied ? 'დაკოპირდა' : 'კოპირება'}
                  </button>
                )}
              <button type="button" onClick={again}><RotateCcw /> ხელახლა</button>
            </div>
          </div>
        )}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="np-scan" role="dialog" aria-modal="true" aria-label="QR კოდის წაკითხვა">
      <video ref={videoRef} className="np-scan-video" playsInline muted autoPlay aria-hidden />
      {state === 'live' && (
        <div className="np-scan-frame" aria-hidden>
          <i className="tl" /><i className="tr" /><i className="bl" /><i className="br" />
          {!other && <span className="np-scan-beam" />}
        </div>
      )}
      <div className="np-scan-top">
        <button type="button" className="np-scan-x" onClick={back} aria-label="დახურვა" title="დახურვა"><X /></button>
        <span>QR კოდის წაკითხვა</span>
      </div>
      {state === 'starting' && <div className="np-scan-wait"><LoaderCircle className="animate-spin" /></div>}
      {state === 'live' && !other && <p className="np-scan-hint">მიუშვირე QR კოდს — ნოტები თავად გაიხსნება</p>}
      {(state === 'denied' || state === 'nocam') && (
        <div className="np-scan-card">
          <b>{state === 'denied' ? 'კამერაზე წვდომა არ არის' : 'კამერა ვერ ჩაირთო'}</b>
          <p>{state === 'denied' ? 'ნება დართე კამერაზე ტელეფონის პარამეტრებში და სცადე თავიდან.' : 'ამ მოწყობილობაზე კამერა ვერ მოიძებნა.'}</p>
          <div className="np-scan-row">
            <button type="button" className="main" onClick={() => setAttempt(n => n + 1)}><RotateCcw /> თავიდან</button>
            <button type="button" onClick={back}>დახურვა</button>
          </div>
        </div>
      )}
      {other && (
        <div className="np-scan-card">
          <b>{other.kind === 'link' ? 'ეს კოდი სხვა საიტისაა' : 'კოდში წერია'}</b>
          <p className="np-scan-text">{other.kind === 'link' ? other.url : other.text}</p>
          <div className="np-scan-row">
            {other.kind === 'link'
              ? <a className="main" href={other.url} target="_blank" rel="noopener noreferrer"><ExternalLink /> გახსნა</a>
              : (
                <button type="button" className="main" onClick={() => copyText(other.text, () => setCopied(true))}>
                  <Copy /> {copied ? 'დაკოპირდა' : 'კოპირება'}
                </button>
              )}
            <button type="button" onClick={again}><RotateCcw /> ხელახლა</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
};
