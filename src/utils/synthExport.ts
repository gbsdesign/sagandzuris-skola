// "საგალობლების mp3" in the library: every book chant as the synthesizer plays it (all voices, speed 1,
// no transposition), rendered and encoded in this browser and packed into one ZIP, a folder per book.
// The job lives here, not in a component, so it carries on when the member opens another page.
import { SERVICE_LISTS, BOOK_NAMES } from '../data/chantLookup';
import { encodeMp3, loadBookScore, renderScore, saveBlob } from './chantSynth';
import { ZipWriter, ZipSink } from './zipWriter';

export interface ExportItem { book: string; nums: number[]; title: string }

// the books in the order of their volumes
export const EXPORT_BOOKS = ['book', 'feast', 'kk', 'triod', 'v5', 'karb', 'v9', 'pat', 'momix', 'v8', 'dasd1', 'dasd2'] as const;

let items: ExportItem[] | null = null;
/** One entry per notes file: the first chant version that uses it gives the name. */
export const exportItems = (): ExportItem[] => {
  if (items) return items;
  const seen = new Map<string, ExportItem>();
  for (const [, list] of SERVICE_LISTS) {
    for (const chant of list) {
      for (const v of chant.variants ?? []) {
        if (!v.bookNums?.length) continue;
        const book = v.book ?? 'book';
        const key = `${book}/${v.bookNums[0]}`;
        if (seen.has(key)) continue;
        const version = v.version?.trim();
        seen.set(key, { book, nums: v.bookNums, title: version ? `${chant.title} — ${version}` : chant.title });
      }
    }
  }
  items = [...seen.values()].sort((a, b) => a.nums[0] - b.nums[0]);
  return items;
};

// measured over all books (27 h for 1067 chants): about 91 s a chant; 64 kbit/s mono = 8 KB a second
const AVG_SECONDS = 91;
const KBPS = 64;
export const estimateMb = (count: number) => Math.round((count * AVG_SECONDS * KBPS) / 8 / 1024);
// a computer made vol. IX (82 chants) in 5 minutes with three lanes: about 3.6 s a chant
export const estimateMinutes = (count: number) => Math.max(1, Math.round((count * 3.6) / 60));

const pad3 = (n: number) => String(n).padStart(3, '0');
const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90).trim();
const fileName = (it: ExportItem) => {
  const first = it.nums[0];
  const last = it.nums[it.nums.length - 1];
  const num = last !== first ? `${pad3(first)}-${pad3(last)}` : pad3(first);
  return `${clean(BOOK_NAMES[it.book] ?? it.book)}/${num} ${clean(it.title)}.mp3`;
};

export interface ExportState {
  phase: 'running' | 'saving' | 'done' | 'cancelled' | 'failed';
  done: number;
  total: number;
  current: string; // the chant being made
  failed: number;  // chants that could not be made (left out of the ZIP)
}

let state: ExportState | null = null;
let cancelFlag = false;
const listeners = new Set<() => void>();
const set = (s: ExportState | null) => { state = s; listeners.forEach(l => l()); };

export const getExport = () => state;
export const onExportChange = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const cancelExport = () => { cancelFlag = true; };
export const clearExport = () => { if (state && state.phase !== 'running' && state.phase !== 'saving') set(null); };

type SaveFilePicker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) =>
  Promise<{ createWritable: () => Promise<{ write: (d: Uint8Array) => Promise<void>; close: () => Promise<void>; abort?: () => Promise<void> }> }>;

const keepAwake = () => {
  let lock: { release: () => Promise<void> } | null = null;
  const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
  const acquire = () => { if (nav.wakeLock && document.visibilityState === 'visible') nav.wakeLock.request('screen').then(l => { lock = l; }, () => {}); };
  const onVis = () => acquire();
  acquire();
  document.addEventListener('visibilitychange', onVis);
  const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', warn);
  return () => {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('beforeunload', warn);
    lock?.release().catch(() => {});
  };
};

/**
 * Makes the ZIP of the chosen books. Must be called from a tap: in Chrome and Edge on a computer the
 * file is picked first and written to disk as it grows; elsewhere the browser keeps the parts and saves at the end.
 */
export const startExport = async (books: string[]) => {
  if (state?.phase === 'running' || state?.phase === 'saving') return;
  const list = exportItems().filter(it => books.includes(it.book));
  if (!list.length) return;
  const zipName = books.length === 1
    ? `${clean(BOOK_NAMES[books[0]] ?? books[0])} — სინთეზატორი.zip`
    : 'საგალობლები — სინთეზატორი.zip';

  // where the archive goes
  let disk: Awaited<ReturnType<Awaited<ReturnType<SaveFilePicker>>['createWritable']>> | null = null;
  const picker = (window as unknown as { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: zipName, types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] });
      disk = await handle.createWritable();
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // the member closed the save window
      disk = null;
    }
  }
  const parts: BlobPart[] = [];
  const sink: ZipSink = disk
    ? { write: d => disk!.write(d) }
    : { write: async d => { parts.push(d as BlobPart); } };
  const zip = new ZipWriter(sink);

  cancelFlag = false;
  const release = keepAwake();
  let done = 0;
  let failed = 0;
  set({ phase: 'running', done, total: list.length, current: list[0].title, failed });

  // a few chants at once: rendering and encoding (in workers) overlap
  const lanes = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
  let next = 0;
  const lane = async () => {
    while (!cancelFlag && next < list.length) {
      const it = list[next++];
      set({ ...state!, current: it.title });
      try {
        const score = await loadBookScore(it.nums[0], it.book);
        const buffer = await renderScore(score, { speed: 1, transpose: 0, gains: score.voices.map(() => 1) });
        if (cancelFlag) break;
        const blob = await encodeMp3(buffer, undefined, KBPS);
        await zip.add(fileName(it), new Uint8Array(await blob.arrayBuffer()));
      } catch (err) {
        console.error('synth export:', it.book, it.nums[0], err);
        failed++;
      }
      done++;
      set({ ...state!, done, failed });
    }
  };

  try {
    await Promise.all(Array.from({ length: lanes }, lane));
    if (cancelFlag) {
      await disk?.abort?.().catch(() => {});
      set({ ...state!, phase: 'cancelled' });
      return;
    }
    set({ ...state!, phase: 'saving', current: '' });
    await zip.finish();
    if (disk) await disk.close();
    else saveBlob(new Blob(parts, { type: 'application/zip' }), zipName);
    set({ ...state!, phase: 'done' });
  } catch (err) {
    console.error('synth export failed:', err);
    await disk?.abort?.().catch(() => {});
    set({ ...state!, phase: 'failed' });
  } finally {
    release();
  }
};
