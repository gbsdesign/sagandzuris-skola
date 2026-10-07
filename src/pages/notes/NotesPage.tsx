// The notes page of one chant version: the sheets fill the screen, a slim tool bar on top drops out
// the synthesizer, the recording and the text. Two fingers zoom; a turned phone keeps the line being read;
// the next chant is one tap away. Church mode silences everything except the starting notes.
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BookmarkCheck, BookmarkPlus, Check, ChevronDown, ChevronLeft, ChevronUp, Church, CloudDownload, Download, Ellipsis,
  FileText, Flame, Headphones, ListOrdered, LoaderCircle, Minus, Moon, Music2, Pause, Piano, Play, Plus, Repeat, RotateCcw,
  Scan, SlidersHorizontal, Sun, SunMoon, TextAlignStart, X, ZoomIn, ZoomOut, Pin,
} from 'lucide-react';
import './notes.css';
import { useNotes, shareNotesUrl, NotesOrigin } from '../../context/NotesContext';
import { useAuth, useChants } from '../../context';
import { MAX_SHORTCUTS, saveShortcuts, useMyShortcuts } from '../../utils/shortcuts';
import { findVersion, neighbourVersion, SCHOOL_NAMES, BOOK_NAMES, SERVICE_LISTS, schoolOf } from '../../data/chantLookup';
import { variantName } from '../../data/tsirvaChants';
import { getChantMedia, type ChantMediaItem } from '../../data/chantMediaRegistry';
import { chantRecordingMedia, chantRecordings } from '../../data/chantRecordings';
import { countPlay } from '../../utils/playStats';
import { hymnPair, hymnWidth, HymnOrnament } from '../../data/hymnOrnaments';
import { BookScore, ChantSynth, bookImageUrl, loadBookScore, encodeMp3, renderScore, saveBlob, firstNotes, playStartNotes } from '../../utils/chantSynth';
import { ChantPlayer } from '../../components/ChantPlayer';
import { NpStepper } from './NpStepper';
import { getAudioArrayBufferFromIdb } from '../../utils/audioIdb';
import { GrapeBunch, VineLeaf, Rosette, Sprig, PlateBand } from '../../components/home/PlateOrnaments';
import { isOffline, onOfflineChange, saveOffline, offlineSupported } from '../../utils/offlineNotes';
import { triggerHaptic } from '../../utils/haptics';

const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2];
const VOICE_NAMES = ['I', 'II', 'III', 'IV'];
const ZSTEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
type Paper = 'day' | 'candle' | 'night' | 'auto';
type Orient = 'port' | 'land' | 'desk';
type Panel = 'synth' | 'rec' | 'text' | null;
interface Anchor { top: boolean; i?: number; f?: number; x: number }
interface Sheet { src: string; w?: number; h?: number; page?: number }

const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v === null ? d : (JSON.parse(v) as T); } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt = (sec: number) => { const s = Math.max(0, Math.round(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0');
const coarse = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Fork: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M8 2.5v7.5a4 4 0 0 0 8 0V2.5" /><path d="M12 14v7.5" />
  </svg>
);
const IconWa = () => (<svg viewBox="0 0 24 24" aria-hidden><path fill="none" stroke="#fff" strokeWidth="1.9" strokeLinejoin="round" d="M12 3.3a8.7 8.7 0 0 0-7.5 13.1L3.4 20.6l4.3-1.1A8.7 8.7 0 1 0 12 3.3z" /><path fill="#fff" d="M9.2 7.8c-.18-.4-.37-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.66 2.66 4.1 3.62 2.02.8 2.43.64 2.87.6.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28l-1.6-.79c-.22-.08-.38-.12-.54.12-.16.24-.61.78-.75.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.92-1.18-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42l-.79-1.78z" /></svg>);
const IconFb = () => (<svg viewBox="0 0 24 24" aria-hidden><path fill="#fff" d="M13.5 21v-7.4h2.5l.38-2.9H13.5V8.86c0-.84.24-1.41 1.44-1.41h1.54V4.86c-.27-.04-1.18-.12-2.24-.12-2.21 0-3.73 1.35-3.73 3.83v2.13H7.98v2.9h2.53V21z" /></svg>);
const IconMs = () => (<svg viewBox="0 0 24 24" aria-hidden><path fill="#fff" d="M12 3C6.93 3 3 6.71 3 11.72c0 2.62 1.08 4.89 2.83 6.45.15.13.24.32.24.52l.05 1.6a.72.72 0 0 0 1.01.64l1.79-.79c.15-.07.32-.08.48-.04.82.23 1.7.35 2.6.35 5.07 0 9-3.71 9-8.73S17.07 3 12 3z" /><path fill="#8b3dff" d="M6.6 14.3l2.64-4.19c.42-.67 1.32-.83 1.95-.36l2.1 1.57c.19.15.46.15.65 0l2.84-2.15c.38-.29.88.17.62.57l-2.64 4.19c-.42.67-1.32.83-1.95.36l-2.1-1.57a.54.54 0 0 0-.65 0L7.22 14.87c-.38.29-.88-.17-.62-.57z" /></svg>);
const IconIg = () => (<svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" aria-hidden><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" /><circle cx="12" cy="12" r="3.9" /><circle cx="17.3" cy="6.7" r=".6" fill="#fff" /></svg>);

const HymnImg: React.FC<{ o: HymnOrnament; place: 'top' | 'bottom' }> = ({ o, place }) => {
  const [shown, setShown] = useState(false);
  return (
    <img
      src={o.src}
      width={o.w}
      height={o.h}
      alt=""
      aria-hidden
      draggable={false}
      className={`${place === 'top' ? 'np-o-head' : 'np-o-tail'} ${o.bw ? 'np-o-bw' : ''} ${shown ? 'in' : ''}`}
      style={{ width: `${(hymnWidth(o, place) * 100).toFixed(1)}%` }}
      onLoad={() => requestAnimationFrame(() => setShown(true))}
    />
  );
};

export const NotesPage: React.FC<{ vid: string; from: NotesOrigin }> = ({ vid, from }) => {
  const { goNotes, closeNotes, church, setChurch, liturgy, program } = useNotes();
  const { selectedChantVariants, toggleVariantSelection } = useChants();
  const { user } = useAuth();
  const { list: shortcuts } = useMyShortcuts(user?.uid);
  const info = findVersion(vid)!;
  const { chant, variant, service } = info;
  const media = getChantMedia(chant.id, variant.code);
  const title = chant.title.replace(/[;\s]+$/, '');
  const name = variant.version !== undefined ? (variantName(variant) || variant.code) : (variant.code.includes('გამშვ') ? 'გამშვენებული' : 'სადა');
  const schoolName = SCHOOL_NAMES[schoolOf(variant.code)] ?? schoolOf(variant.code);
  const lyrics = media?.lyrics;
  // recordings to choose from: the school's own first, then other choirs' recordings of this very book version
  // (chantRecordings.ts); the ჩანაწერი panel has a list to pick one
  const recSources = useMemo(() => {
    const list: { label: string; media: ChantMediaItem }[] = [];
    if (media) list.push({ label: 'საგანძურის სკოლა', media });
    for (const r of chantRecordings(vid)) list.push({ label: r.who, media: chantRecordingMedia(r, title) });
    return list;
  }, [vid, media, title]);
  const [recIdx, setRecIdx] = useState(0);
  useEffect(() => setRecIdx(0), [vid]);
  const recSource = recSources[Math.min(recIdx, recSources.length - 1)];
  const recMedia = recSource?.media;
  const pair = hymnPair(chant.id);

  // ---------- where this version sits: the program, or its service
  const seq = from === 'program' && program ? program.items : null;
  const seqIdx = seq ? seq.indexOf(vid) : -1;
  const prevId = seq ? (seqIdx > 0 ? seq[seqIdx - 1] : null) : neighbourVersion(vid, -1);
  const nextId = seq ? (seqIdx >= 0 && seqIdx < seq.length - 1 ? seq[seqIdx + 1] : null) : neighbourVersion(vid, 1);
  const serviceList = SERVICE_LISTS[info.serviceIndex][1];
  const posLabel = seq && seqIdx >= 0 ? `პროგრამა ${seqIdx + 1}/${seq.length}` : `${info.chantIndex + 1}/${serviceList.length}`;
  const nextInfo = findVersion(nextId);
  const nextLabel = (v: ReturnType<typeof findVersion>) => v ? (v.variant.version !== undefined ? variantName(v.variant) : v.variant.code) : '';

  // ---------- notes
  const [score, setScore] = useState<BookScore | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setScore(null);
    setFailed(false);
    if (variant.bookNums?.length) {
      loadBookScore(variant.bookNums[0], variant.book).then(s => alive && setScore(s)).catch(() => alive && setFailed(true));
    }
    return () => { alive = false; };
  }, [variant.bookNums, variant.book]);
  const sheets: Sheet[] = useMemo(
    () => (score ? score.img.map(im => ({ src: bookImageUrl(score, im.src), w: im.w, h: im.h, page: im.page })) : []),
    [score]
  );
  const synth = useMemo(() => (score ? new ChantSynth(score) : null), [score]);
  useEffect(() => () => synth?.dispose(), [synth]);
  const VOICES = VOICE_NAMES.slice(0, score?.voices.length ?? 3);
  const allVoices = VOICES.length > 3 ? 'ყველა' : 'სამივე';

  // ---------- refs to the page
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLDivElement>(null);
  const hlRef = useRef<HTMLDivElement>(null);
  const sysRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const fillRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const curRef = useRef<HTMLSpanElement>(null);
  const durRef = useRef<HTMLSpanElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);
  const zbadgeRef = useRef<HTMLDivElement>(null);

  // ---------- small state
  const [panel, setPanel] = useState<Panel>(null);
  const [recMounted, setRecMounted] = useState(false);
  const [recPlaying, setRecPlaying] = useState(false);
  const [recPause, setRecPause] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [paper, setPaper] = useState<Paper>(() => store.get<Paper>('sagandzuri_paper', 'day'));
  const [darkOS, setDarkOS] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [wakeOn, setWakeOn] = useState(() => store.get('sagandzuri_wake', true));
  const [wakeFailed, setWakeFailed] = useState(false);
  const [orient, setOrient] = useState<Orient>('port');
  const [tucked, setTucked] = useState(false);
  const [raised, setRaised] = useState(false);
  const [fitW, setFitW] = useState(360);
  const zoomsRef = useRef<Record<Orient, number>>({ port: 1, land: 1, desk: 1, ...store.get('sagandzuri_notes_zoom', {}) });
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(SPEEDS.indexOf(1));
  const [transpose, setTranspose] = useState(0);
  const [voiceOn, setVoiceOn] = useState([true, true, true, true]);
  const [volume, setVolume] = useState([1, 1, 1, 1]);
  const [mixOpen, setMixOpen] = useState(false);
  const [loop, setLoop] = useState<{ stage: 0 | 1 | 2; a: number | null; b: number | null }>({ stage: 0, a: null, b: null });
  const [folded, setFolded] = useState<Record<Orient, { synth: boolean; rec: boolean }>>({ port: { synth: false, rec: false }, land: { synth: true, rec: true }, desk: { synth: false, rec: false } });
  const [dots, setDots] = useState([false, false, false, false]);
  const [exporting, setExporting] = useState<{ label: string; progress: number } | null>(null);
  const [offline, setOffline] = useState(() => isOffline(vid));
  const [offlineBusy, setOfflineBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; run: () => void }; on: boolean }>({ msg: '', on: false });
  const toastTimer = useRef(0);
  const linesFlashed = useRef(false);
  const curSys = useRef(-1);
  const anchor = useRef<Anchor>({ top: true, x: 0.5 });
  const holdAnchor = useRef(true);
  const pinching = useRef(false);
  const draggingTrack = useRef(false);

  const land = orient === 'land', wide = orient === 'desk';
  const gutter = wide ? 28 : land ? 14 : 8;
  const isSaved = Boolean(selectedChantVariants?.[vid]);
  const progIdx = liturgy.role === 'teacher' ? (liturgy.program?.items.indexOf(vid) ?? -1) : -1;
  const tapLines = panel === 'synth' && !church && Boolean(score);
  const shownPaper = paper === 'auto' ? (darkOS ? 'night' : 'day') : paper;

  const showToast = useCallback((msg: string, ms = 2600, action?: { label: string; run: () => void }) => {
    setToast({ msg, action, on: true });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(t => ({ ...t, on: false })), ms);
  }, []);

  useEffect(() => onOfflineChange(() => setOffline(isOffline(vid))), [vid]);
  useEffect(() => { setOffline(isOffline(vid)); }, [vid]);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => setDarkOS(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // ---------- reading position (the sheet at the top edge and the place on it)
  const chromeVisible = useCallback(() => (tucked || church || !chromeRef.current ? 0 : chromeRef.current.offsetHeight), [tucked, church]);
  const sheetBox = () => {
    const sc = scrollerRef.current!, sh = sheetsRef.current!;
    const sr = sc.getBoundingClientRect(), r = sh.getBoundingClientRect();
    return { left: r.left - sr.left + sc.scrollLeft, top: r.top - sr.top + sc.scrollTop, w: r.width || 1, h: r.height || 1 };
  };
  const captureAnchor = useCallback(() => {
    const sc = scrollerRef.current, sh = sheetsRef.current;
    if (!sc || !sh) return;
    const b = sheetBox();
    const x = (sc.scrollLeft + sc.clientWidth / 2 - b.left) / b.w;
    if (sc.scrollTop < 4) { anchor.current = { top: true, x }; return; }
    const y = sc.getBoundingClientRect().top + chromeVisible();
    const list = [...sh.querySelectorAll<HTMLElement>('.np-sheet')];
    let i = list.findIndex(el => el.getBoundingClientRect().bottom > y);
    if (i < 0) i = list.length - 1;
    if (i < 0) return;
    const r = list[i].getBoundingClientRect();
    anchor.current = { top: false, i, f: (y - r.top) / r.height, x };
  }, [chromeVisible]);
  const restoreAnchor = useCallback(() => {
    const sc = scrollerRef.current, sh = sheetsRef.current;
    if (!sc || !sh) return;
    const a = anchor.current;
    const list = [...sh.querySelectorAll<HTMLElement>('.np-sheet')];
    const el = a.top || a.i === undefined ? null : list[Math.min(a.i, list.length - 1)];
    if (el) {
      const r = el.getBoundingClientRect();
      sc.scrollTop = r.top - sc.getBoundingClientRect().top + sc.scrollTop + (a.f ?? 0) * r.height - chromeVisible();
    } else sc.scrollTop = 0;
    const b = sheetBox();
    sc.scrollLeft = b.left + a.x * b.w - sc.clientWidth / 2;
  }, [chromeVisible]);

  // ---------- the playing line: a marker that glides from line to line
  const placeHL = useCallback((instant: boolean) => {
    const hl = hlRef.current, sh = sheetsRef.current;
    if (!hl || !sh) return;
    const el = curSys.current >= 0 ? sysRefs.current[curSys.current] : null;
    if (!el) { hl.style.opacity = '0'; return; }
    if (instant) hl.classList.add('nt');
    const sr = sh.getBoundingClientRect(), r = el.getBoundingClientRect();
    Object.assign(hl.style, { top: `${r.top - sr.top}px`, left: `${r.left - sr.left}px`, width: `${r.width}px`, height: `${r.height}px`, opacity: '1' });
    if (instant) { void hl.offsetWidth; hl.classList.remove('nt'); }
  }, []);
  const highlight = useCallback((k: number) => {
    if (k === curSys.current) return;
    curSys.current = k;
    placeHL(false);
  }, [placeHL]);

  // ---------- size: fit the screen width, times the zoom of this orientation
  const fitWidth = useCallback(() => {
    const sc = scrollerRef.current;
    return Math.max(200, Math.min((sc?.clientWidth || 360) - gutter * 2, 940));
  }, [gutter]);
  const applyWidth = (w: number) => {
    if (sheetsRef.current) sheetsRef.current.style.width = `${Math.round(w)}px`;
    placeHL(true);
  };

  useLayoutEffect(() => {
    const root = rootRef.current!, sc = scrollerRef.current!, ch = chromeRef.current!;
    let lastW = 0, lastH = 0, viewW = 0;
    const onRoot = () => {
      const w = root.clientWidth, h = root.clientHeight;
      if (!w || !h || (w === lastW && h === lastH)) return;
      lastW = w; lastH = h;
      const o: Orient = w > h && h < 560 ? 'land' : w >= 900 ? 'desk' : 'port';
      setOrient(o);
      if (o !== 'land') setTucked(false);
      root.style.setProperty('--np-h', `${h}px`);
      root.style.setProperty('--np-gut', `${o === 'desk' ? 28 : o === 'land' ? 14 : 8}px`);
      root.style.setProperty('--np-view-w', `${sc.clientWidth}px`);
      const z = clamp(Number(zoomsRef.current[o]) || 1, 0.5, 3);
      zoomRef.current = z;
      setZoom(z);
    };
    const onScroller = () => {
      const w = sc.clientWidth;
      if (w === viewW) return;
      viewW = w;
      root.style.setProperty('--np-view-w', `${w}px`);
      setFitW(Math.max(200, Math.min(w - (root.clientWidth >= 900 ? 56 : root.clientWidth > root.clientHeight && root.clientHeight < 560 ? 28 : 16), 940)));
    };
    const onChrome = () => {
      const h = ch.offsetHeight;
      sc.style.paddingTop = `${h}px`;
      root.style.setProperty('--np-chrome-h', `${h}px`);
      if (!pinching.current && !holdAnchor.current) restoreAnchor();
    };
    const ro1 = new ResizeObserver(onRoot), ro2 = new ResizeObserver(onScroller), ro3 = new ResizeObserver(onChrome);
    ro1.observe(root); ro2.observe(sc); ro3.observe(ch);
    onRoot(); onScroller(); onChrome();
    return () => { ro1.disconnect(); ro2.disconnect(); ro3.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // width changed (rotation, zoom): keep the line being read in place
  useLayoutEffect(() => {
    applyWidth(fitW * zoom);
    if (!pinching.current && !holdAnchor.current) restoreAnchor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitW, zoom]);

  const flashZoom = (z: number) => {
    const el = zbadgeRef.current;
    if (!el) return;
    el.textContent = `${Math.round(z * 100)}%`;
    el.classList.add('on');
    window.clearTimeout((el as any)._t);
    (el as any)._t = window.setTimeout(() => el.classList.remove('on'), 700);
  };
  const saveZoom = (z: number) => {
    zoomsRef.current = { ...zoomsRef.current, [orient]: z };
    store.set('sagandzuri_notes_zoom', zoomsRef.current);
  };
  const zoomAt = (z: number, mx: number, my: number, commit = true) => {
    const sc = scrollerRef.current;
    if (!sc) return;
    z = clamp(z, 0.5, 3);
    const b = sheetBox();
    const sx = (sc.scrollLeft + mx - b.left) / b.w, sy = (sc.scrollTop + my - b.top) / b.h;
    zoomRef.current = z;
    applyWidth(fitWidth() * z);
    const nb = sheetBox();
    sc.scrollLeft = nb.left + sx * nb.w - mx;
    sc.scrollTop = nb.top + sy * nb.h - my;
    flashZoom(z);
    if (commit) { setZoom(z); saveZoom(z); }
  };
  const viewCenter = (): [number, number] => {
    const sc = scrollerRef.current!;
    return [sc.clientWidth / 2, (chromeVisible() + sc.clientHeight) / 2];
  };
  const zoomStep = (dir: 1 | -1) => {
    triggerHaptic(5);
    const z = dir > 0 ? (ZSTEPS.find(s => s > zoomRef.current + 0.01) ?? 3) : ([...ZSTEPS].reverse().find(s => s < zoomRef.current - 0.01) ?? 0.5);
    holdAnchor.current = true;
    zoomAt(z, ...viewCenter());
    requestAnimationFrame(() => { holdAnchor.current = false; captureAnchor(); });
  };
  const zoomFit = () => {
    triggerHaptic(5);
    holdAnchor.current = true;
    zoomAt(1, ...viewCenter());
    requestAnimationFrame(() => { holdAnchor.current = false; captureAnchor(); });
  };

  // two fingers zoom the sheets (not the page); Ctrl + wheel on a computer
  useEffect(() => {
    const sc = scrollerRef.current!;
    let p: { d0: number; z0: number; sx: number; sy: number } | null = null;
    let raf = 0;
    let next: { z: number; mx: number; my: number } | null = null;
    const mid = (a: Touch, b: Touch) => { const sr = sc.getBoundingClientRect(); return [(a.clientX + b.clientX) / 2 - sr.left, (a.clientY + b.clientY) / 2 - sr.top]; };
    const start = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const [mx, my] = mid(a, b);
      const bx = sheetBox();
      pinching.current = true;
      p = { d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1, z0: zoomRef.current, sx: (sc.scrollLeft + mx - bx.left) / bx.w, sy: (sc.scrollTop + my - bx.top) / bx.h };
    };
    const move = (e: TouchEvent) => {
      if (!p || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const [mx, my] = mid(a, b);
      next = { z: clamp(p.z0 * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / p.d0, 0.5, 3), mx, my };
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        if (!p || !next) return;
        zoomRef.current = next.z;
        applyWidth(fitWidth() * next.z);
        const nb = sheetBox();
        sc.scrollLeft = nb.left + p.sx * nb.w - next.mx;
        sc.scrollTop = nb.top + p.sy * nb.h - next.my;
        flashZoom(next.z);
      });
    };
    const end = (e: TouchEvent) => {
      if (!p || e.touches.length >= 2) return;
      p = null;
      next = null;
      const z = zoomRef.current;
      setZoom(z);
      saveZoom(z);
      pinching.current = false;
      captureAnchor();
    };
    let wheelT = 0;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const sr = sc.getBoundingClientRect();
      zoomAt(zoomRef.current * Math.exp(-e.deltaY * 0.008), e.clientX - sr.left, e.clientY - sr.top, false);
      window.clearTimeout(wheelT);
      wheelT = window.setTimeout(() => { setZoom(zoomRef.current); saveZoom(zoomRef.current); captureAnchor(); }, 250);
    };
    sc.addEventListener('touchstart', start, { passive: true });
    sc.addEventListener('touchmove', move, { passive: false });
    sc.addEventListener('touchend', end);
    sc.addEventListener('touchcancel', end);
    sc.addEventListener('wheel', wheel, { passive: false });
    const noGesture = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', noGesture);
    return () => {
      sc.removeEventListener('touchstart', start);
      sc.removeEventListener('touchmove', move);
      sc.removeEventListener('touchend', end);
      sc.removeEventListener('touchcancel', end);
      sc.removeEventListener('wheel', wheel);
      document.removeEventListener('gesturestart', noGesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orient, gutter]);

  // scrolling: remember the place (per version), raise/tuck the bar
  const lastY = useRef(0);
  const resumeT = useRef(0);
  const onScroll = () => {
    const sc = scrollerRef.current!;
    const y = sc.scrollTop;
    if (!pinching.current && !holdAnchor.current) {
      captureAnchor();
      window.clearTimeout(resumeT.current);
      resumeT.current = window.setTimeout(() => store.set(`sagandzuri_resume:${vid}`, anchor.current), 400);
    }
    setRaised(y > 4);
    if (land && !pinching.current && !church) {
      const dy = y - lastY.current;
      if (dy > 6 && y > 60) { setTucked(true); setMoreOpen(false); }
      else if (dy < -6 || y < 20) setTucked(false);
    }
    lastY.current = y;
  };

  // a new version: back to its top, or to where its reading stopped last time
  useEffect(() => {
    holdAnchor.current = true;
    curSys.current = -1;
    setLoop({ stage: 0, a: null, b: null });
    setTranspose(0);
    setMoreOpen(false);
    setRecMounted(false);
    setRecPlaying(false);
    if (!recMedia && panel === 'rec') setPanel(null);
    if (!lyrics && panel === 'text') setPanel(null);
    const sc = scrollerRef.current;
    if (sc) { sc.scrollTop = 0; sc.scrollLeft = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid]);
  useEffect(() => {
    if (!sheets.length) return;
    const saved = store.get<Anchor | null>(`sagandzuri_resume:${vid}`, null);
    const raf = requestAnimationFrame(() => {
      if (saved && !saved.top) {
        anchor.current = saved;
        restoreAnchor();
        showToast('გაგრძელდა იქიდან, სადაც გაჩერდი', 3600, {
          label: 'თავიდან',
          run: () => { anchor.current = { top: true, x: 0.5 }; scrollerRef.current?.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }); },
        });
      } else {
        anchor.current = { top: true, x: 0.5 };
        restoreAnchor();
      }
      holdAnchor.current = false;
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  // ---------- synthesizer
  const speed = SPEEDS[speedIdx];
  const paint = useCallback((sec: number) => {
    if (!synth || !score) return;
    const f = clamp(sec / synth.duration, 0, 1);
    if (fillRef.current) fillRef.current.style.width = `${f * 100}%`;
    if (knobRef.current) knobRef.current.style.left = `${f * 100}%`;
    if (curRef.current) curRef.current.textContent = fmt(sec / speed);
    if (durRef.current) durRef.current.textContent = fmt(synth.duration / speed);
    if (miniRef.current && synth.playing) miniRef.current.style.width = `${f * 100}%`;
    const beat = synth.toBeat(sec);
    highlight(synth.playing || sec > 0 ? score.sys.findIndex(s => beat >= s[5] && beat < s[6]) : -1);
  }, [synth, score, speed, highlight]);
  useEffect(() => {
    if (!synth) return;
    synth.onEnd = () => { setPlaying(false); paint(0); highlight(-1); };
    paint(synth.position());
    if (!playing) return;
    let raf = 0;
    const loopFrame = () => { if (!draggingTrack.current) paint(synth.position()); raf = requestAnimationFrame(loopFrame); };
    raf = requestAnimationFrame(loopFrame);
    return () => cancelAnimationFrame(raf);
  }, [synth, playing, paint, highlight]);
  useEffect(() => { setPlaying(false); }, [synth]);
  useEffect(() => { synth?.setSpeed(speed); }, [synth, speed]);
  useEffect(() => { synth?.setTranspose(transpose); }, [synth, transpose]);
  useEffect(() => { voiceOn.forEach((on, i) => synth?.setMuted(i, !on)); }, [synth, voiceOn]);
  useEffect(() => { volume.forEach((v, i) => synth?.setVolume(i, v)); }, [synth, volume]);
  useEffect(() => { synth?.setLoop(loop.a, loop.b); }, [synth, loop]);

  const stopSynth = useCallback(() => { if (synth?.playing) { synth.pause(); setPlaying(false); } }, [synth]);
  const toggleSynth = async () => {
    if (!synth || church) return;
    triggerHaptic(10);
    if (synth.playing) { synth.pause(); setPlaying(false); return; }
    setRecPause(n => n + 1);
    await synth.play();
    setPlaying(true);
    countPlay(vid, 'synth');
  };
  const playFromLine = async (k: number) => {
    if (!synth || !score || church) return;
    triggerHaptic(10);
    const sec = synth.toSec(score.sys[k][5]);
    synth.seek(sec);
    paint(sec);
    if (!synth.playing) { setRecPause(n => n + 1); await synth.play(); setPlaying(true); }
  };
  const restart = () => { if (!synth) return; triggerHaptic(8); const at = loop.a ?? 0; synth.seek(at); paint(at); };
  const trackFrac = (e: React.PointerEvent, el: HTMLElement) => { const r = el.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); };
  const handleLoop = () => {
    if (!synth) return;
    triggerHaptic(8);
    const pos = synth.position();
    if (loop.stage === 0) setLoop({ stage: 1, a: pos, b: null });
    else if (loop.stage === 1 && loop.a !== null) {
      const [a, b] = pos > loop.a ? [loop.a, pos] : [pos, loop.a];
      if (b - a < 0.3) return;
      setLoop({ stage: 2, a, b });
    } else setLoop({ stage: 0, a: null, b: null });
  };

  // ---------- starting notes: top voice first, 0.8 s each, 0.5 s apart; quietly in church
  const dotTimers = useRef<number[]>([]);
  const playStart = async () => {
    if (!score) return;
    triggerHaptic(10);
    stopSynth();
    setRecPause(n => n + 1);
    dotTimers.current.forEach(t => window.clearTimeout(t));
    dotTimers.current = [];
    setDots([false, false, false, false]);
    const notes = firstNotes(score);
    await playStartNotes(notes, transpose, church);
    notes.forEach((m, i) => {
      if (m == null) return;
      dotTimers.current.push(window.setTimeout(() => setDots(d => d.map((x, k) => (k === i ? true : x))), 60 + i * 500));
      dotTimers.current.push(window.setTimeout(() => setDots(d => d.map((x, k) => (k === i ? false : x))), 60 + i * 500 + 800));
    });
  };
  useEffect(() => () => dotTimers.current.forEach(t => window.clearTimeout(t)), []);

  // ---------- panels
  const togglePanel = (p: Exclude<Panel, null>) => {
    triggerHaptic(8);
    setMoreOpen(false);
    const next = panel === p ? null : p;
    setPanel(next);
    if (next === 'rec') setRecMounted(true);
    if (next === 'synth' && !linesFlashed.current && score) {
      linesFlashed.current = true;
      sysRefs.current.forEach((b, i) => {
        if (!b) return;
        window.setTimeout(() => { b.classList.add('flash'); window.setTimeout(() => b.classList.remove('flash'), 1700); }, i * 40);
      });
      showToast('შეეხე ნოტების სტრიქონს და დაკვრა იქიდან დაიწყება', 3600);
    }
  };
  const fold = (p: 'synth' | 'rec') => setFolded(f => ({ ...f, [orient]: { ...f[orient], [p]: !f[orient][p] } }));

  // ---------- church mode
  const firstChurch = useRef(true);
  useEffect(() => {
    if (firstChurch.current) { firstChurch.current = false; if (!church) return; }
    if (church) {
      stopSynth();
      setRecPause(n => n + 1);
      setPanel(null);
      setMoreOpen(false);
      setTucked(false);
      window.setTimeout(() => showToast('🔕 ტელეფონი ჩუმ რეჟიმზე გადაიყვანე', 4600), 450);
    }
    requestAnimationFrame(restoreAnchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [church]);

  // ---------- the screen stays on (always in church)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const want = wakeOn || church;
    const acquire = async () => {
      if (!want || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) { lock.release().catch(() => {}); return; }
        setWakeFailed(false);
      } catch { setWakeFailed(true); }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible' && !lock) acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, [wakeOn, church]);

  // ---------- next / previous
  const goTo = (id: string | null, dir: 1 | -1) => {
    if (!id) return;
    triggerHaptic(10);
    stopSynth();
    setRecPause(n => n + 1);
    goNotes(id);
    const sc = scrollerRef.current;
    if (sc && !reducedMotion()) sc.animate([{ transform: `translateX(${dir * 48}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 340, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
  const close = () => { triggerHaptic(8); stopSynth(); setRecPause(n => n + 1); closeNotes(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (moreOpen) setMoreOpen(false);
      else if (panel) setPanel(null);
      else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---------- share
  const shareUrl = shareNotesUrl(vid);
  const shareText = `${title}, ${name} · საგანძურის სკოლა`;
  const copyLink = (msg: string) => {
    const done = () => showToast(msg, 3600);
    try { navigator.clipboard.writeText(shareUrl).then(done, () => showToast(shareUrl, 4200)); } catch { showToast(shareUrl, 4200); }
  };
  const shareInstagram = (e: React.MouseEvent) => {
    if (coarse() && typeof navigator.share === 'function') {
      e.preventDefault();
      navigator.share({ title, text: shareText, url: shareUrl }).catch(() => {});
    } else copyLink('ბმული დაკოპირდა. Instagram-ში ჩასვი: Direct-ში ან Story-ს ბმულის სტიკერში');
    window.setTimeout(() => setMoreOpen(false), 150);
  };

  // ---------- downloads (notes as PDF, synthesizer as MP3)
  const docName = `${title} — ${name}`;
  const runExport = async (label: string, job: (report: (p: number) => void) => Promise<void>) => {
    setMoreOpen(false);
    setExporting({ label, progress: 0 });
    try { await job(p => setExporting({ label, progress: p })); }
    catch (err) { console.error('export failed:', err); showToast('ჩამოტვირთვა ვერ მოხერხდა, სცადეთ თავიდან'); }
    finally { setExporting(null); }
  };
  const exportPdf = () => runExport('PDF', async () => {
    if (!score) return;
    const { scoreToPdf } = await import('../../utils/scorePdf');
    saveBlob(await scoreToPdf(score, docName), `${docName}.pdf`);
  });
  const exportMp3 = (which: number | 'all') => {
    const label = which === 'all' ? `${allVoices} ხმა` : `${VOICES[which]} ხმა`;
    return runExport(`MP3 · ${label}`, async report => {
      if (!score) return;
      const gains = which === 'all' ? volume.slice(0, VOICES.length) : VOICES.map((_, i) => (i === which ? 1 : 0));
      const buffer = await renderScore(score, { speed, transpose, gains });
      report(0.05);
      const blob = await encodeMp3(buffer, p => report(0.05 + 0.95 * p));
      saveBlob(blob, `${docName} — ${label}.mp3`);
    });
  };
  const recTracks = recMedia ? [3, 0, 1, 2].filter(i => recMedia.tracks[i] && (i === 3 ? recMedia.availableVoices.all : [recMedia.availableVoices.voice1, recMedia.availableVoices.voice2, recMedia.availableVoices.voice3][i])) : [];
  const saveRecMp3 = (i: number) => {
    const label = ['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'][i];
    return runExport(`ჩანაწერი · ${label}`, async () => {
      const url = recMedia!.tracks[i];
      let buf = await getAudioArrayBufferFromIdb(url);
      if (!buf) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      }
      saveBlob(new Blob([buf], { type: 'audio/mpeg' }), `${docName} — ${recSource?.label ?? 'ჩანაწერი'}, ${label}.mp3`);
    });
  };
  const keepOffline = async () => {
    if (offline) { showToast('უკვე ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება'); return; }
    if (!offlineSupported()) { showToast('ამ ბრაუზერში ჩამოწერა ვერ მუშაობს'); return; }
    setOfflineBusy(true);
    await saveOffline([vid]);
    setOfflineBusy(false);
    showToast(isOffline(vid) ? 'ჩამოწერილია: ინტერნეტის გარეშეც გაიხსნება' : 'ჩამოწერა ვერ მოხერხდა, სცადეთ თავიდან', 3600);
  };

  // ---------- render
  const lastPage = sheets.length ? sheets[sheets.length - 1].page : undefined;
  const nums = variant.bookNums ?? [];
  const numLabel = UNNUMBERED_BOOKS.has(variant.book ?? '') ? ''
    : nums.length > 1 ? `№${nums[0]}–${nums[nums.length - 1]}` : nums.length ? `№${nums[0]}` : '';
  const pageLabel = variant.page ? `გვ. ${variant.page}${lastPage && lastPage !== variant.page ? `–${lastPage}` : ''}` : '';
  const endnote = score
    ? `${BOOK_NAMES[variant.book ?? 'book'] ?? ''} · ${[numLabel, pageLabel].filter(Boolean).join(', ')}`
    : '';
  const loopTitle = loop.stage === 0 ? 'გამეორება: მონიშნე დასაწყისი (A)' : loop.stage === 1 ? 'მონიშნე დასასრული (B)' : 'გამეორების გამორთვა';
  const f = folded[orient];
  const loopZone = synth && loop.a !== null ? { left: `${(100 * loop.a) / synth.duration}%`, width: `${(100 * ((loop.b ?? synth.duration) - loop.a)) / synth.duration}%` } : null;

  return (
    <div
      ref={rootRef}
      className={`np-root ${land ? 'land' : ''} ${wide ? 'wide' : ''} ${church ? 'church' : ''} ${tapLines ? 'tap-lines' : ''}`}
      data-paper={shownPaper}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — ნოტები`}
    >
      <div ref={scrollerRef} className="np-scroller" onScroll={onScroll}>
        <div className="np-content">
          <header className="np-caption">
            <div className="np-cap-text">
              <div className="np-eyebrow">{service} · {schoolName}<span className="np-pos">{posLabel}</span></div>
              <h2 className="np-cap-title">{title}</h2>
              <div className="np-cap-meta">{name}{variant.page ? ` · გვ. ${variant.page}` : ''}</div>
            </div>
            <div className="np-cap-orn" aria-hidden>
              <VineLeaf color="#b3cbbd" className="orn-in" style={{ left: 2, top: 4, width: 30, transform: 'rotate(-24deg)' }} />
              <GrapeBunch color="#c4262e" curls className="orn-in" style={{ left: 24, top: -2, width: 50, transform: 'rotate(6deg)' }} />
              <Rosette color="#eab53a" petals={10} className="orn-in orn-spin" style={{ right: 2, top: 32, width: 17 }} />
            </div>
            <div className="np-cap-tools">
              {score && (
                <div className="np-startgrp" role="group" aria-label="საწყისი ბგერა და ტონი">
                  <button type="button" className="np-start" onClick={playStart} aria-label="საწყისი ბგერა: ხმების პირველი ბგერა რიგრიგობით">
                    <Fork /><span>საწყისი ბგერა</span>
                    <span className="np-sb-dots" aria-hidden>{VOICES.map((_, i) => <i key={i} className={dots[i] ? 'on' : ''} />)}</span>
                  </button>
                  <NpStepper
                    label="ტონი" value={signed(transpose)} changed={transpose !== 0}
                    onMinus={() => setTranspose(t => Math.max(-7, t - 1))} onPlus={() => setTranspose(t => Math.min(7, t + 1))} onReset={() => setTranspose(0)}
                    minusDisabled={transpose <= -7} plusDisabled={transpose >= 7}
                  />
                </div>
              )}
              <div className="np-zoom" role="group" aria-label="ნოტების ზომა">
                <button type="button" className="np-zb" onClick={() => zoomStep(-1)} aria-label="დაპატარავება" title="დაპატარავება"><ZoomOut /></button>
                <output>{Math.round(zoom * 100)}%</output>
                <button type="button" className="np-zb" onClick={() => zoomStep(1)} aria-label="გადიდება" title="გადიდება"><ZoomIn /></button>
                <button type="button" className="np-zb fit" onClick={zoomFit} aria-label="ეკრანზე მორგება" title="ეკრანზე მორგება"><Scan /></button>
              </div>
              {church ? (
                <div className="np-church-row">
                  <button type="button" className="np-church-x" onClick={() => { triggerHaptic(10); setChurch(false); showToast('ტაძრის რეჟიმი გამოირთო'); }}>
                    <X /> გამოსვლა
                  </button>
                  <button type="button" className="np-church-next" onClick={() => goTo(nextId, 1)} disabled={!nextId}>
                    <span>{nextInfo ? `შემდეგი: ${nextInfo.chant.title.replace(/[;\s]+$/, '')}` : 'ბოლო საგალობელია'}</span>
                    <i><ArrowRight /></i>
                  </button>
                </div>
              ) : nextId ? (
                <button type="button" className="np-next-sm" onClick={() => goTo(nextId, 1)} aria-label="შემდეგი საგალობელი" title={nextInfo ? `შემდეგი: ${nextInfo.chant.title}` : 'შემდეგი'}>
                  <ArrowRight />
                </button>
              ) : null}
            </div>
          </header>

          <div className="np-sheetswrap">
            <div ref={sheetsRef} className="np-sheets" style={{ width: Math.round(fitW * zoom) }}>
              {!sheets.length && (
                <div className="np-loading">
                  {failed ? 'ნოტების ჩატვირთვა ვერ მოხერხდა. შეამოწმე ინტერნეტი ან ჩამოწერე საგალობელი წინასწარ.' : <LoaderCircle className="animate-spin" />}
                </div>
              )}
              {sheets.map((im, ii) => (
                <React.Fragment key={im.src}>
                  <div className="np-pg">
                    <span className="mot sp l"><Sprig color="#b3cbbd" /></span>
                    <span className="mot ro"><Rosette /></span>
                    <span>{im.page ? `გვ. ${im.page}` : `ფურცელი ${ii + 1}`}</span>
                    <span className="mot ro"><Rosette color="#eab53a" petals={10} /></span>
                    <span className="mot sp r"><Sprig color="#b3cbbd" /></span>
                  </div>
                  <figure className="np-sheet">
                    {ii === 0 && <HymnImg o={pair.top} place="top" />}
                    <div className="np-pimg" style={im.w && im.h ? { aspectRatio: `${im.w} / ${im.h}` } : undefined}>
                      <img src={im.src} width={im.w} height={im.h} alt={im.page ? `ნოტები, გვ. ${im.page}` : `ნოტები, ფურცელი ${ii + 1}`} decoding="async" draggable={false} />
                      {score?.sys.map((s, k) => {
                        if (s[0] !== ii) return null;
                        const x = Math.max(0, s[1]), y = Math.max(0, s[2]);
                        return (
                          <button
                            key={k}
                            ref={el => { sysRefs.current[k] = el; }}
                            type="button"
                            className="np-sys"
                            tabIndex={tapLines ? 0 : -1}
                            onClick={() => playFromLine(k)}
                            aria-label={`დაკვრა ${k + 1}-ე სტრიქონიდან`}
                            style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${Math.min(s[3], 1 - x) * 100}%`, height: `${Math.min(s[4], 1 - y) * 100}%` }}
                          />
                        );
                      })}
                    </div>
                    {ii === sheets.length - 1 && <HymnImg o={pair.bottom} place="bottom" />}
                  </figure>
                </React.Fragment>
              ))}
              <div ref={hlRef} className="np-hl" aria-hidden />
            </div>
          </div>

          <div className="np-band" aria-hidden><PlateBand /></div>
          <nav className="np-nextbar" aria-label="საგალობლებს შორის">
            <button type="button" className="np-nb-prev" onClick={() => goTo(prevId, -1)} disabled={!prevId} aria-label="წინა საგალობელი"><ArrowLeft /></button>
            {nextInfo ? (
              <button type="button" className="np-nb-next" onClick={() => goTo(nextId, 1)}>
                <span className="nx">
                  <small>შემდეგი · {seq ? `დღევანდელი წირვა · ${seqIdx + 2}/${seq.length}` : service}</small>
                  <b>{nextInfo.chant.title.replace(/[;\s]+$/, '')}</b>
                  <span className="v">{nextLabel(nextInfo)}{nextInfo.variant.page ? ` · გვ. ${nextInfo.variant.page}` : ''}</span>
                </span>
                <span className="go"><ArrowRight /></span>
              </button>
            ) : (
              <button type="button" className="np-nb-next end" onClick={close}>
                <span className="nx"><small>{seq ? 'დღევანდელი წირვა' : service}</small><b>დასასრული</b><span className="v">{seq ? 'პროგრამა დასრულდა' : 'სიაში დაბრუნება'}</span></span>
                <span className="go"><Check /></span>
              </button>
            )}
          </nav>
          {endnote && <p className="np-endnote">{endnote}</p>}
        </div>
      </div>

      <div ref={chromeRef} className={`np-chrome ${raised ? 'raised' : ''} ${tucked ? 'tucked' : ''}`}>
        <nav className="np-bar" aria-label="ხელსაწყოები">
          <button type="button" className="np-back" onClick={close} aria-label="უკან" title="უკან"><ChevronLeft strokeWidth={2.4} /></button>
          <div className="np-tools">
            {score && (
              <button type="button" className={`np-tool ${playing ? 'live' : ''}`} data-tool="synth" aria-expanded={panel === 'synth'} onClick={() => togglePanel('synth')} title="სინთეზატორი">
                <span className="np-ico"><Piano strokeWidth={1.8} /><span className="np-eq" aria-hidden><i /><i /><i /></span></span>
                <span className="np-lb">სინთეზატორი</span>
              </button>
            )}
            {recMedia && (
              <button type="button" className={`np-tool ${recPlaying ? 'live' : ''}`} data-tool="rec" aria-expanded={panel === 'rec'} onClick={() => togglePanel('rec')} title="ჩანაწერი">
                <span className="np-ico"><Headphones strokeWidth={1.8} /><span className="np-eq" aria-hidden><i /><i /><i /></span></span>
                <span className="np-lb">ჩანაწერი</span>
              </button>
            )}
            {lyrics && (
              <button type="button" className="np-tool" data-tool="text" aria-expanded={panel === 'text'} onClick={() => togglePanel('text')} title="ტექსტი">
                <span className="np-ico"><TextAlignStart strokeWidth={1.8} /></span>
                <span className="np-lb">ტექსტი</span>
              </button>
            )}
            <button type="button" className={`np-tool ${isSaved ? 'saved' : ''}`} data-tool="save" aria-pressed={isSaved} onClick={() => { triggerHaptic(12); toggleVariantSelection(chant, variant); }} title="დამოუკიდებელ სამუშაოში დამატება">
              <span className="np-ico">{isSaved ? <BookmarkCheck strokeWidth={1.8} /> : <BookmarkPlus strokeWidth={1.8} />}</span>
              <span className="np-lb">ჩემი სია</span>
            </button>
            <button type="button" className="np-tool" data-tool="more" aria-expanded={moreOpen} aria-haspopup="true" onClick={e => { e.stopPropagation(); setMoreOpen(o => !o); }} title="მეტი">
              <span className="np-ico"><Ellipsis /></span>
              <span className="np-lb">მეტი</span>
            </button>
          </div>
        </nav>

        {panel === 'synth' && score && (
          <div className={`np-panel synth ${f.synth ? 'collapsed' : ''}`}>
            <div className="np-pin">
              <div className="np-row">
                <button type="button" className={`np-play ${playing ? 'on' : ''} ${!synth ? 'loading' : ''}`} onClick={toggleSynth} disabled={!synth} aria-label={playing ? 'პაუზა' : 'დაკვრა'}>
                  <span className="np-pi play"><Play fill="currentColor" /></span>
                  <span className="np-pi pause"><Pause fill="currentColor" /></span>
                  <span className="np-pi load"><LoaderCircle className="animate-spin" /></span>
                </button>
                <button type="button" className="np-ib np-restart" onClick={restart} aria-label="თავიდან" title={loop.a !== null ? 'A-დან' : 'თავიდან'}><RotateCcw /></button>
                <div className="np-prog">
                  <div
                    className="np-track"
                    onPointerDown={e => { if (!synth) return; draggingTrack.current = true; e.currentTarget.setPointerCapture(e.pointerId); paint(trackFrac(e, e.currentTarget) * synth.duration); }}
                    onPointerMove={e => { if (draggingTrack.current && synth) paint(trackFrac(e, e.currentTarget) * synth.duration); }}
                    onPointerUp={e => { if (!draggingTrack.current || !synth) return; draggingTrack.current = false; const sec = trackFrac(e, e.currentTarget) * synth.duration; synth.seek(sec); paint(sec); }}
                    onPointerCancel={() => { draggingTrack.current = false; }}
                  >
                    {loopZone && <div className="zone" style={loopZone} />}
                    <div ref={fillRef} className="fill" />
                    <div ref={knobRef} className="knob" />
                  </div>
                  <div className="np-time"><span ref={curRef}>0:00</span><span ref={durRef}>0:00</span></div>
                </div>
                <button type="button" className="np-ib np-chev" aria-expanded={!f.synth} onClick={() => fold('synth')} aria-label="დეტალები" title="ჩაკეცვა / გაშლა"><ChevronUp /></button>
              </div>
              <div className="np-details">
                <div className="np-dA">
                  <div className="np-row">
                    <div className="np-seg" role="group" aria-label="ხმები">
                      {VOICES.map((v, i) => (
                        <button key={v} type="button" className={voiceOn[i] ? 'on' : 'x'} aria-pressed={voiceOn[i]} onClick={() => { triggerHaptic(8); setVoiceOn(on => on.map((x, k) => (k === i ? !x : x))); }}>{v}</button>
                      ))}
                      <button type="button" className={`all ${voiceOn.slice(0, VOICES.length).every(Boolean) ? 'on' : ''}`} onClick={() => { triggerHaptic(8); setVoiceOn([true, true, true, true]); }}>{allVoices}</button>
                    </div>
                    <button type="button" className="np-ib np-mixbtn" aria-pressed={mixOpen} onClick={() => setMixOpen(o => !o)} aria-label="ხმების სიძლიერე" title="ხმების სიძლიერე"><SlidersHorizontal /></button>
                    <button type="button" className={`np-ib np-loop ${loop.stage ? 'pill' : ''} ${loop.stage === 1 ? 'half' : ''} ${loop.stage === 2 ? 'lit' : ''}`} onClick={handleLoop} title={loopTitle} aria-label="გამეორება">
                      <Repeat />{loop.stage === 1 && <span>A→</span>}{loop.stage === 2 && <span>A–B</span>}
                    </button>
                  </div>
                  {mixOpen && (
                    <div className={`np-mix ${VOICES.length > 3 ? 'four' : ''}`}>
                      {VOICES.map((v, i) => (
                        <label key={v}>
                          <span>{v} ხმა<em>{Math.round(volume[i] * 100)}%</em></span>
                          <input type="range" min={0} max={100} step={5} value={Math.round(volume[i] * 100)} onChange={e => { const val = Number(e.target.value) / 100; setVolume(p => p.map((x, k) => (k === i ? val : x))); }} />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="np-dB">
                  <div className="np-steps">
                    <NpStepper
                      label="ტემპი" value={`♩=${Math.round((score.tempos[0]?.[1] ?? 60) * speed)}`} changed={speed !== 1}
                      onMinus={() => setSpeedIdx(i => Math.max(0, i - 1))} onPlus={() => setSpeedIdx(i => Math.min(SPEEDS.length - 1, i + 1))} onReset={() => setSpeedIdx(SPEEDS.indexOf(1))}
                      minusDisabled={speedIdx === 0} plusDisabled={speedIdx === SPEEDS.length - 1}
                    />
                    <NpStepper
                      label="ტონი" value={signed(transpose)} changed={transpose !== 0}
                      onMinus={() => setTranspose(t => Math.max(-7, t - 1))} onPlus={() => setTranspose(t => Math.min(7, t + 1))} onReset={() => setTranspose(0)}
                      minusDisabled={transpose <= -7} plusDisabled={transpose >= 7}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {exporting && <p className="np-export">მზადდება {exporting.label}… {Math.round(exporting.progress * 100)}%</p>}

        {recMounted && recMedia && (
          <div className={`np-panel rec ${f.rec ? 'collapsed' : ''}`} hidden={panel !== 'rec'}>
            {recSources.length > 1 && (
              <label className="np-recpick">
                <span>შემსრულებელი</span>
                <select
                  value={recIdx}
                  onChange={e => { triggerHaptic(10); setRecPlaying(false); setRecIdx(Number(e.target.value)); }}
                  aria-label="შემსრულებლის არჩევა"
                >
                  {recSources.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
                </select>
                <ChevronDown aria-hidden />
              </label>
            )}
            <ChantPlayer
              key={`${vid}-${recIdx}`}
              chantId={chant.id}
              variantId={vid}
              media={recMedia}
              layout="panel"
              hideNotesButton
              showDetails={!f.rec}
              onToggleDetails={() => fold('rec')}
              pauseToken={recPause}
              disabled={church}
              onPlayingChange={p => { setRecPlaying(p); if (p) { stopSynth(); countPlay(vid, 'rec'); } }}
            />
          </div>
        )}

        {panel === 'text' && lyrics && (
          <div className="np-panel text">
            <div className="np-lyrics">{lyrics.split('\n').map((line, i) => <p key={i}>{line}</p>)}</div>
          </div>
        )}

        <div ref={miniRef} className={`np-mini ${playing || recPlaying ? 'on' : ''}`} style={recPlaying ? { width: '100%', ['--np-mini' as string]: '#dc8a22' } : undefined} />
      </div>

      {moreOpen && (
        <MoreMenu
          onClose={() => setMoreOpen(false)}
          shareUrl={shareUrl}
          shareText={shareText}
          onMessenger={() => copyLink(coarse() ? 'ბმული დაკოპირდა. თუ Messenger არ გაიხსნა, ჩასვი ხელით' : 'ბმული დაკოპირდა. Messenger-ში ჩასვი')}
          onInstagram={shareInstagram}
          paper={paper}
          setPaper={p => { triggerHaptic(8); setPaper(p); store.set('sagandzuri_paper', p); }}
          church={church}
          toggleChurch={() => { triggerHaptic(10); setChurch(!church); if (church) showToast('ტაძრის რეჟიმი გამოირთო'); }}
          regent={liturgy.role === 'teacher'}
          progIdx={progIdx}
          toggleProgram={() => {
            const items = liturgy.toggle(vid);
            const i = items.indexOf(vid);
            showToast(i >= 0 ? `დაემატა დღევანდელ წირვაში · №${i + 1}` : 'ამოიშალა დღევანდელი წირვიდან');
          }}
          offline={offline}
          offlineBusy={offlineBusy}
          keepOffline={keepOffline}
          wakeOn={wakeOn || church}
          wakeNote={(wakeOn || church) && (wakeFailed || !('wakeLock' in navigator)) ? 'ამ ბრაუზერში ვერ ჩაირთო' : church ? 'ტაძრის რეჟიმში ყოველთვის' : 'სანამ ნოტები ღიაა'}
          toggleWake={() => { if (church) return; setWakeOn(!wakeOn); store.set('sagandzuri_wake', !wakeOn); }}
          hasScore={Boolean(score)}
          recTracks={recTracks}
          saveRecMp3={saveRecMp3}
          voices={VOICES}
          allVoices={allVoices}
          exportPdf={exportPdf}
          exportMp3={exportMp3}
          pinned={user ? (shortcuts || []).includes(`chant:${vid}`) : null}
          togglePin={() => {
            if (!user) return;
            const list = shortcuts || [];
            const id = `chant:${vid}`;
            if (list.includes(id)) { saveShortcuts(user.uid, list.filter(x => x !== id)).catch(() => {}); showToast('მოიხსნა მთავარი გვერდიდან'); }
            else if (list.length >= MAX_SHORTCUTS) showToast(`მთავარზე უკვე ${MAX_SHORTCUTS} ღილაკია`);
            else { saveShortcuts(user.uid, [...list, id]).catch(() => {}); showToast('გავიდა მთავარ გვერდზე — „ჩემი ღილაკები“'); }
          }}
        />
      )}

      <div ref={zbadgeRef} className="np-zbadge" aria-hidden>100%</div>
      <div className={`np-toast ${toast.on ? 'on' : ''} ${toast.action ? 'has-act' : ''}`} role="status" aria-live="polite">
        <span>{toast.msg}</span>
        {toast.action && <button type="button" onClick={() => { toast.action!.run(); setToast(t => ({ ...t, on: false })); }}>{toast.action.label}</button>}
      </div>
    </div>
  );
};

const MoreMenu: React.FC<{
  onClose: () => void;
  shareUrl: string;
  shareText: string;
  onMessenger: () => void;
  onInstagram: (e: React.MouseEvent) => void;
  paper: Paper;
  setPaper: (p: Paper) => void;
  church: boolean;
  toggleChurch: () => void;
  regent: boolean;
  progIdx: number;
  toggleProgram: () => void;
  offline: boolean;
  offlineBusy: boolean;
  keepOffline: () => void;
  wakeOn: boolean;
  wakeNote: string;
  toggleWake: () => void;
  hasScore: boolean;
  recTracks: number[];
  saveRecMp3: (i: number) => void;
  voices: string[];
  allVoices: string;
  exportPdf: () => void;
  exportMp3: (which: number | 'all') => void;
  pinned: boolean | null; // null: not signed in
  togglePin: () => void;
}> = p => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!ref.current?.contains(t) && !t.closest('[data-tool="more"]')) p.onClose();
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [p]);
  const later = () => window.setTimeout(p.onClose, 150);
  const url = encodeURIComponent(p.shareUrl);
  const PAPERS: [Paper, string, string, React.ReactNode][] = [
    ['day', 'დღე', '#fff', <Sun key="d" color="#c58a1c" />],
    ['candle', 'სანთელი', '#f1dcae', <Flame key="c" color="#9b5a12" fill="#9b5a12" />],
    ['night', 'ღამე', '#1d1915', <Moon key="n" color="#e6dccb" fill="#e6dccb" />],
    ['auto', 'ავტო', 'linear-gradient(135deg,#fff 50%,#1d1915 50%)', <SunMoon key="a" color="#8c7c6b" />],
  ];
  return (
    <div ref={ref} className="np-more" role="menu">
      <div className="np-msec">გაზიარება</div>
      <div className="np-mshare">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${p.shareText}\n${p.shareUrl}`)}`} target="_blank" rel="noopener noreferrer" onClick={later}><span className="np-sh-ic wa"><IconWa /></span><span className="np-sh-lb">WhatsApp</span></a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${url}`} target="_blank" rel="noopener noreferrer" onClick={later}><span className="np-sh-ic fb"><IconFb /></span><span className="np-sh-lb">Facebook</span></a>
        <a href={coarse() ? `fb-messenger://share/?link=${url}` : 'https://www.messenger.com/'} target="_blank" rel="noopener noreferrer" onClick={() => { p.onMessenger(); later(); }}><span className="np-sh-ic ms"><IconMs /></span><span className="np-sh-lb">Messenger</span></a>
        <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noopener noreferrer" onClick={p.onInstagram}><span className="np-sh-ic ig"><IconIg /></span><span className="np-sh-lb">Instagram</span></a>
      </div>
      <div className="np-msep" />
      <div className="np-msec">ფურცლის ფერი</div>
      <div className="np-paper" role="group" aria-label="ფურცლის ფერი">
        {PAPERS.map(([k, label, bg, icon]) => (
          <button key={k} type="button" aria-pressed={p.paper === k} onClick={() => p.setPaper(k)}>
            <span className="sw2" style={{ background: bg }}>{icon}</span>{label}
          </button>
        ))}
      </div>
      <div className="np-msep" />
      <button type="button" className="np-mrow" role="menuitemcheckbox" aria-checked={p.church} onClick={p.toggleChurch}>
        <Church /><span className="txt">ტაძრის რეჟიმი<small>ხმა ითიშება, ზოლი იმალება, ეკრანი არ ქრება</small></span><span className="np-sw" aria-hidden />
      </button>
      {p.regent && (
        <button type="button" className="np-mrow" role="menuitem" onClick={p.toggleProgram}>
          <ListOrdered /><span className="txt">დღევანდელი წირვა<small>{p.progIdx >= 0 ? 'პროგრამაშია. დააჭირე ამოსაღებად' : 'ამ ვერსიის დამატება'}</small></span>
          <span className="state">{p.progIdx >= 0 ? `№${p.progIdx + 1}` : '+'}</span>
        </button>
      )}
      <button type="button" className="np-mrow" role="menuitem" onClick={p.keepOffline} disabled={p.offlineBusy}>
        <CloudDownload /><span className="txt">ინტერნეტის გარეშე<small>ნოტები, სინთეზატორი, ჩანაწერი</small></span>
        <span className={`state ${p.offline ? 'ok' : ''}`}>{p.offlineBusy ? 'იწერება…' : p.offline ? 'ჩამოწერილია' : 'ჩამოწერა'}</span>
      </button>
      {p.pinned !== null && (
        <button type="button" className="np-mrow" role="menuitemcheckbox" aria-checked={p.pinned} onClick={p.togglePin}>
          <Pin /><span className="txt">მთავარ გვერდზე<small>„ჩემი ღილაკებში“ ამ საგალობლის ღილაკი</small></span>
          <span className={`state ${p.pinned ? 'ok' : ''}`}>{p.pinned ? 'გატანილია' : 'გატანა'}</span>
        </button>
      )}
      <button type="button" className="np-mrow" role="menuitemcheckbox" aria-checked={p.wakeOn} onClick={p.toggleWake}>
        <Sun /><span className="txt">ეკრანი არ ჩაქრეს<small>{p.wakeNote}</small></span><span className="np-sw" aria-hidden />
      </button>
      {(p.hasScore || p.recTracks.length > 0) && (
        <>
          <div className="np-msep" />
          <div className="np-msec">ჩამოტვირთვა</div>
        </>
      )}
      {p.recTracks.map(i => (
        <button key={`r${i}`} type="button" className="np-mrow" role="menuitem" onClick={() => { p.onClose(); p.saveRecMp3(i); }}>
          <Headphones /><span className="txt">ჩანაწერი MP3 · {['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'][i]}{i === 3 && <small>ორიგინალი ჩანაწერი</small>}</span><Download />
        </button>
      ))}
      {p.hasScore && (
        <>
          <button type="button" className="np-mrow" role="menuitem" onClick={p.exportPdf}><FileText /><span className="txt">ნოტები (PDF)</span><Download /></button>
          <button type="button" className="np-mrow" role="menuitem" onClick={() => p.exportMp3('all')}><Music2 /><span className="txt">სინთეზატორი MP3 · {p.allVoices} ხმა<small>მიმდინარე ტემპით და ტონით</small></span><Download /></button>
          {p.voices.map((v, i) => (
            <button key={v} type="button" className="np-mrow" role="menuitem" onClick={() => p.exportMp3(i)}><Music2 /><span className="txt">სინთეზატორი MP3 · {v} ხმა</span><Download /></button>
          ))}
        </>
      )}
    </div>
  );
};
