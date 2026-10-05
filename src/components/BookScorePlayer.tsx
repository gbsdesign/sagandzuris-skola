import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileText, Gauge, Maximize2, Music2, Pause, Piano, Play, RefreshCw, Repeat, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { BookScore, ChantSynth, bookImageUrl, encodeMp3, loadBookScore, renderScore, saveBlob } from '../utils/chantSynth';
import { Stepper } from './Stepper';
import { triggerHaptic } from '../utils/haptics';

const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2];
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const VOICE_NAMES = ['I', 'II', 'III', 'IV'];
const ZOOM_KEY = 'sagandzuri_score_zoom';

const fmt = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const readZoom = () => {
  try {
    const z = parseFloat(localStorage.getItem(ZOOM_KEY) ?? '');
    return ZOOMS.includes(z) ? z : 1;
  } catch {
    return 1;
  }
};

const iconBtn =
  'w-9 h-9 shrink-0 rounded-full border border-slate-200 bg-white hover:bg-dusk-50 hover:border-dusk-300 text-slate-600 flex items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed';

interface BookScorePlayerProps {
  nums: number[];   // chant numbers of this version (one file, named after the first)
  book?: string;    // folder under public/notes: Gelati school book (default), 'feast', 'kk' (Kartli-Kakheti, vol. III), 'triod', 'v5' (Gelati + Shemokmedi liturgy, vol. V), 'karb' (Karbelashvili mode, vol. VII), 'pat' (Patarava, Shemokmedi school) or 'v9' (Gelati, vol. IX)
  page?: number;
  source?: string;
  title?: string;   // chant title, for downloaded file names
  name?: string;    // version name, e.g. "145 ხუნდაძე"
}

// Sheet music from a chant book + a synthesizer that plays it.
// The line being played is highlighted; tapping a line plays from there.
export const BookScorePlayer: React.FC<BookScorePlayerProps> = ({ nums, book, page, source, title, name }) => {
  const first = nums[0];
  const [score, setScore] = useState<BookScore | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setScore(null);
    setFailed(false);
    loadBookScore(first, book).then(s => alive && setScore(s)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [first, book]);

  const synth = useMemo(() => (score ? new ChantSynth(score) : null), [score]);
  const VOICES = VOICE_NAMES.slice(0, score?.voices.length ?? 3);
  const allVoices = VOICES.length > 3 ? 'ყველა' : 'სამივე';
  useEffect(() => () => synth?.dispose(), [synth]);

  const [playing, setPlaying] = useState(false);
  const [curSys, setCurSys] = useState(-1);
  const [speedIdx, setSpeedIdx] = useState(SPEEDS.indexOf(1));
  const [transpose, setTranspose] = useState(0);
  // per voice; the 4-voice litany of vol. III has a fourth (low bass), other chants use the first three
  const [voiceOn, setVoiceOn] = useState([true, true, true, true]);
  const [volume, setVolume] = useState([1, 1, 1, 1]);
  // loop: 0 off, 1 from A to the end, 2 from A to B (same steps as the recording player)
  const [loopStage, setLoopStage] = useState<0 | 1 | 2>(0);
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [zoom, setZoom] = useState(readZoom);
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState<{ label: string; progress: number } | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timeRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const speed = SPEEDS[speedIdx];

  const sysAt = (sec: number) => {
    if (!synth || !score) return -1;
    const beat = synth.toBeat(sec);
    return score.sys.findIndex(s => beat >= s[5] && beat < s[6]);
  };

  // progress bars + time are written straight to the DOM; only the highlighted line is state
  const paint = (sec: number) => {
    if (!synth) return;
    for (const bar of barRefs.current) if (bar) bar.style.width = `${(100 * sec) / synth.duration}%`;
    if (timeRef.current) timeRef.current.textContent = `${fmt(sec / speed)} / ${fmt(synth.duration / speed)}`;
    const k = sysAt(sec);
    setCurSys(prev => (prev === k ? prev : k));
  };

  useEffect(() => {
    if (!synth) return;
    synth.onEnd = () => { setPlaying(false); paint(0); setCurSys(-1); };
    paint(synth.position());
    if (!playing) return;
    let raf = 0;
    const loop = () => { paint(synth.position()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synth, playing, speedIdx, fullscreen]);

  useEffect(() => { synth?.setSpeed(speed); }, [synth, speed]);
  useEffect(() => { synth?.setTranspose(transpose); }, [synth, transpose]);
  useEffect(() => { voiceOn.forEach((on, i) => synth?.setMuted(i, !on)); }, [synth, voiceOn]);
  useEffect(() => { volume.forEach((v, i) => synth?.setVolume(i, v)); }, [synth, volume]);
  useEffect(() => { synth?.setLoop(loopA, loopB); }, [synth, loopA, loopB]);

  useEffect(() => {
    try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch { /* storage unavailable */ }
  }, [zoom]);

  // full screen: lock the page behind it, Esc closes
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [fullscreen]);

  // the download menu closes on any outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const toggle = async () => {
    if (!synth) return;
    triggerHaptic(10);
    if (synth.playing) { synth.pause(); setPlaying(false); }
    else { await synth.play(); setPlaying(true); }
  };
  const restart = () => {
    if (!synth) return;
    triggerHaptic(10);
    const at = loopA ?? 0;
    synth.seek(at);
    paint(at);
  };
  const handleLoop = () => {
    if (!synth) return;
    triggerHaptic(10);
    const pos = synth.position();
    if (loopStage === 0) {
      setLoopA(pos); setLoopB(null); setLoopStage(1);
    } else if (loopStage === 1 && loopA !== null) {
      const [a, b] = pos > loopA ? [loopA, pos] : [pos, loopA];
      if (b - a < 0.3) return;
      setLoopA(a); setLoopB(b); setLoopStage(2);
    } else {
      setLoopA(null); setLoopB(null); setLoopStage(0);
    }
  };
  const playFromLine = async (k: number) => {
    if (!synth || !score) return;
    triggerHaptic(10);
    const sec = synth.toSec(score.sys[k][5]);
    synth.seek(sec);
    paint(sec);
    if (!synth.playing) { await synth.play(); setPlaying(true); }
  };
  const seekBar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!synth) return;
    const r = e.currentTarget.getBoundingClientRect();
    const sec = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * synth.duration;
    synth.seek(sec);
    paint(sec);
  };
  const stepZoom = (d: number) => {
    triggerHaptic(5);
    setZoom(z => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + d))]);
  };

  const baseBpm = score?.tempos[0]?.[1] ?? 60;
  const docName = `${title ?? 'საგალობელი'} — ${name ?? `№${first}`}`;
  const audioName = [
    docName,
    speed !== 1 && `♩=${Math.round(baseBpm * speed)}`,
    transpose !== 0 && `ტონი ${transpose > 0 ? '+' : ''}${transpose}`,
  ].filter(Boolean).join(', ');

  const runExport = async (label: string, job: (report: (p: number) => void) => Promise<void>) => {
    setMenuOpen(false);
    setExportFailed(false);
    setExporting({ label, progress: 0 });
    try {
      await job(p => setExporting({ label, progress: p }));
    } catch (err) {
      console.error('export failed:', err);
      setExportFailed(true);
    } finally {
      setExporting(null);
    }
  };
  const exportPdf = () =>
    runExport('PDF', async () => {
      if (!score) return;
      const { scoreToPdf } = await import('../utils/scorePdf');
      saveBlob(await scoreToPdf(score, docName), `${docName}.pdf`);
    });
  const exportMp3 = (which: number | 'all') => {
    const label = which === 'all' ? `${allVoices} ხმა` : `${VOICES[which]} ხმა`;
    return runExport(`MP3 · ${label}`, async report => {
      if (!score) return;
      // the full mix keeps the current voice volumes; a single voice is exported on its own
      const gains = which === 'all' ? volume.slice(0, VOICES.length) : VOICES.map((_, i) => (i === which ? 1 : 0));
      const buffer = await renderScore(score, { speed, transpose, gains });
      report(0.05);
      const blob = await encodeMp3(buffer, p => report(0.05 + 0.95 * p));
      saveBlob(blob, `${audioName} — ${label}.mp3`);
    });
  };

  if (failed) {
    return <div className="text-center text-[11px] text-slate-400 py-3">ნოტების ჩატვირთვა ვერ მოხერხდა</div>;
  }

  const loopTitle =
    loopStage === 0 ? 'გამეორება: მონიშნე დასაწყისი (A)' : loopStage === 1 ? 'მონიშნე დასასრული (B) — მანამდე მეორდება ბოლომდე' : 'გამეორების გამორთვა';
  const loopRegion =
    synth && loopA !== null ? { left: `${(100 * loopA) / synth.duration}%`, width: `${(100 * ((loopB ?? synth.duration) - loopA)) / synth.duration}%` } : null;

  const playButton = (size: string) => (
    <button
      type="button"
      onClick={toggle}
      disabled={!synth}
      className={`${size} shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed text-white ${
        playing ? 'bg-dusk-800 hover:bg-dusk-900' : 'bg-dusk-600 hover:bg-dusk-700'
      }`}
      aria-label={playing ? 'პაუზა' : 'ნოტების დაკვრა'}
    >
      {!synth ? <RefreshCw className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
    </button>
  );
  const restartButton = (
    <button type="button" onClick={restart} disabled={!synth} className={iconBtn} aria-label="თავიდან" title={loopA !== null ? 'A-დან' : 'თავიდან'}>
      <RotateCcw className="w-4 h-4" />
    </button>
  );
  const loopButton = (
    <button
      type="button"
      onClick={handleLoop}
      disabled={!synth}
      className={`${iconBtn} ${loopStage ? 'w-auto px-2.5' : ''} ${
        loopStage === 2 ? '!bg-dusk-500 !border-dusk-500 !text-white shadow-sm' : loopStage === 1 ? '!border-dusk-400 !text-dusk-800 !bg-dusk-50' : ''
      }`}
      title={loopTitle}
      aria-label="გამეორება"
    >
      <Repeat className="w-4 h-4" />
      {loopStage === 1 && <span className="text-[11px] font-bold">A→</span>}
      {loopStage === 2 && <span className="text-[11px] font-bold">A–B</span>}
    </button>
  );
  const zoomControls = (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => stepZoom(-1)} disabled={zoom === ZOOMS[0]} className={iconBtn} aria-label="დაპატარავება" title="დაპატარავება">
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => { triggerHaptic(5); setZoom(1); }}
        className={`w-12 text-center font-mono text-xs font-black cursor-pointer ${zoom === 1 ? 'text-slate-600' : 'text-dusk-700'}`}
        title="საწყისი ზომა"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" onClick={() => stepZoom(1)} disabled={zoom === ZOOMS[ZOOMS.length - 1]} className={iconBtn} aria-label="გადიდება" title="გადიდება">
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );

  // the score itself (rendered either inline or in the full-screen view, never both)
  const scoreView = !score ? (
    <div className="h-40 flex items-center justify-center text-slate-300">
      <RefreshCw className="w-5 h-5 animate-spin" />
    </div>
  ) : (
    <div className="mx-auto" style={{ width: fullscreen ? `calc(${zoom} * min(100%, 960px))` : `${zoom * 100}%` }}>
      {score.img.map((im, ii) => (
        <div key={im.src}>
          <div className={`px-2 py-0.5 bg-dusk-50/70 border-dusk-100 text-[9px] font-bold text-slate-400 text-right ${ii ? 'border-y' : 'border-b'}`}>
            გვ. {im.page}
          </div>
          {/* boxes are fractions of the image, so they share its box */}
          <div className="relative">
            <img
              src={bookImageUrl(score, im.src)}
              width={im.w}
              height={im.h}
              alt={`ნოტები, გვ. ${im.page}`}
              className="block w-full h-auto select-none"
              loading="lazy"
              draggable={false}
            />
            {score.sys.map((s, k) =>
              s[0] === ii ? (
                <button
                  key={k}
                  type="button"
                  onClick={() => playFromLine(k)}
                  className={`absolute rounded-md transition-colors cursor-pointer ${
                    k === curSys ? 'bg-dusk-300/25 ring-2 ring-dusk-400/70' : 'hover:bg-dusk-200/15'
                  }`}
                  // (a few boxes reach a hair past the image edge: kept inside it)
                  style={{ left: `${Math.max(0, s[1]) * 100}%`, top: `${Math.max(0, s[2]) * 100}%`, width: `${Math.min(s[3], 1 - Math.max(0, s[1])) * 100}%`, height: `${Math.min(s[4], 1 - Math.max(0, s[2])) * 100}%` }}
                  aria-label={`დაკვრა ${k + 1}-ე სტრიქონიდან`}
                  title="დაკვრა ამ სტრიქონიდან"
                />
              ) : null
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const menuItem = 'w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-dusk-50 cursor-pointer';

  // its own steel-blue card, so it never blends with the (amber) recording player above it
  return (
    <section className="w-full rounded-xl border border-dusk-200 bg-dusk-50/60 p-2.5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2 px-0.5 min-w-0">
        <Piano className="w-5 h-5 text-dusk-600 shrink-0" />
        <span className="text-sm sm:text-base font-black text-dusk-900 shrink-0">სინთეზატორი</span>
        <span className="truncate text-[11px] font-semibold text-dusk-500">
          · წიგნის ნოტები, {nums.length > 1 ? `№${nums[0]}–${nums[nums.length - 1]}` : `№${nums[0]}`}
          {page ? `, გვ. ${page}` : ''}
          {source ? ` · ${source}` : ''}
        </span>
      </div>

      {/* controls use the full card width; on a narrow phone the rows wrap instead of running off the screen */}
      <div className="w-full flex flex-col gap-2.5">
      {/* Transport: play · from start · loop · progress · download (on a phone the download sits before the bar) */}
      <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-2">
        {playButton('w-11 h-11')}
        {restartButton}
        {loopButton}
        <div ref={menuRef} className="sm:order-last">
          <button
            type="button"
            onClick={() => { triggerHaptic(10); setMenuOpen(o => !o); }}
            disabled={!score || Boolean(exporting)}
            className={iconBtn}
            aria-label="ჩამოტვირთვა"
            title="ჩამოტვირთვა (PDF / MP3)"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin text-dusk-600" /> : <Download className="w-4 h-4" />}
          </button>
          {menuOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-30 w-60 max-w-full rounded-xl border border-dusk-200 bg-white shadow-lg py-1 overflow-hidden">
              <button type="button" className={menuItem} onClick={exportPdf}>
                <FileText className="w-4 h-4 text-dusk-600" /> ნოტები (PDF)
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button type="button" className={menuItem} onClick={() => exportMp3('all')}>
                <Music2 className="w-4 h-4 text-dusk-600" /> MP3 · {allVoices} ხმა
              </button>
              {VOICES.map((v, i) => (
                <button key={v} type="button" className={menuItem} onClick={() => exportMp3(i)}>
                  <Music2 className="w-4 h-4 text-slate-400" /> MP3 · {v} ხმა
                </button>
              ))}
              <p className="px-3 pt-1 pb-1.5 text-[10px] text-slate-400 leading-snug">MP3 იწერება მიმდინარე ტემპით და ტონით</p>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-[70px] flex flex-col gap-1">
          <div className="relative h-2.5 rounded-full bg-slate-200/80 overflow-hidden cursor-pointer" onClick={seekBar} role="presentation">
            {loopRegion && <div className="absolute inset-y-0 bg-dusk-200" style={loopRegion} />}
            <div ref={el => { barRefs.current[0] = el; }} className="relative h-full bg-dusk-500 rounded-full" style={{ width: 0 }} />
          </div>
          <span ref={timeRef} className="text-[10px] font-mono font-bold text-slate-500 text-right">0:00 / 0:00</span>
        </div>
      </div>
      {exporting && (
        <p className="text-[11px] font-semibold text-dusk-800 bg-dusk-50 border border-dusk-200 rounded-lg px-3 py-1.5">
          მზადდება {exporting.label}… {Math.round(exporting.progress * 100)}%
        </p>
      )}
      {exportFailed && (
        <p className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">ჩამოტვირთვა ვერ მოხერხდა, სცადეთ თავიდან</p>
      )}

      {/* Voices: on/off + volume of each */}
      <div className={`w-full grid ${VOICES.length > 3 ? 'grid-cols-5' : 'grid-cols-4'} gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70`}>
        {VOICES.map((v, i) => (
          <div key={v} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => { triggerHaptic(10); setVoiceOn(on => on.map((x, k) => (k === i ? !x : x))); }}
              className={`h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                voiceOn[i] ? 'bg-white text-dusk-800 shadow-sm ring-1 ring-dusk-300' : 'text-slate-400 line-through'
              }`}
              title={`${v} ხმის ჩართვა/გამორთვა`}
            >
              {v}
            </button>
            <div className={`px-1 pb-0.5 flex flex-col items-center transition-opacity ${voiceOn[i] ? '' : 'opacity-40'}`}>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(volume[i] * 100)}
                onChange={e => {
                  const val = parseInt(e.target.value, 10) / 100;
                  setVolume(prev => prev.map((x, k) => (k === i ? val : x)));
                }}
                className="w-full accent-dusk-600 h-1 cursor-pointer"
                aria-label={`${v} ხმის სიმაღლე`}
              />
              <span className="text-[9px] font-mono font-bold text-slate-500 leading-none mt-0.5">{Math.round(volume[i] * 100)}%</span>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => { triggerHaptic(10); setVoiceOn([true, true, true, true]); }}
          className={`h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
            voiceOn.every(Boolean) ? 'bg-dusk-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {allVoices}
        </button>
      </div>

      {/* Tempo & pitch */}
      <div className="w-full flex flex-wrap items-center gap-2">
        <Stepper
          icon={<Gauge className="w-3.5 h-3.5 text-dusk-600" />}
          tone="dusk"
          label="ტემპი"
          value={`♩=${Math.round(baseBpm * speed)}`}
          isDefault={speed === 1}
          onMinus={() => setSpeedIdx(i => Math.max(0, i - 1))}
          onPlus={() => setSpeedIdx(i => Math.min(SPEEDS.length - 1, i + 1))}
          onReset={() => setSpeedIdx(SPEEDS.indexOf(1))}
          minusDisabled={speedIdx === 0}
          plusDisabled={speedIdx === SPEEDS.length - 1}
        />
        <Stepper
          icon={<Music2 className="w-3.5 h-3.5 text-dusk-600" />}
          tone="dusk"
          label="ტონი"
          value={transpose > 0 ? `+${transpose}` : String(transpose)}
          isDefault={transpose === 0}
          onMinus={() => setTranspose(p => Math.max(-7, p - 1))}
          onPlus={() => setTranspose(p => Math.min(7, p + 1))}
          onReset={() => setTranspose(0)}
          minusDisabled={transpose <= -7}
          plusDisabled={transpose >= 7}
        />
      </div>

      {/* Sheet music: zoom, full screen; tap a line to play from it */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {zoomControls}
        <button
          type="button"
          onClick={() => { triggerHaptic(10); setFullscreen(true); }}
          disabled={!score}
          title="სრულ ეკრანზე"
          aria-label="სრულ ეკრანზე"
          className="h-9 px-3 rounded-full border border-slate-200 bg-white hover:bg-dusk-50 hover:border-dusk-300 text-slate-600 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="max-[400px]:hidden">სრულ ეკრანზე</span>
        </button>
      </div>
      </div>

      <div className="w-full rounded-xl border border-dusk-200/80 bg-white overflow-x-auto overflow-y-hidden">
        {fullscreen ? <div className="py-6 text-center text-[11px] text-slate-400">ნოტები სრულ ეკრანზეა გახსნილი</div> : scoreView}
      </div>

      {/* portal: a transformed ancestor (accordion animation) must not capture position: fixed */}
      {fullscreen && createPortal(
        <div className="fixed inset-0 z-[70] safe-x safe-top safe-bottom bg-white flex flex-col" role="dialog" aria-modal="true" aria-label="ნოტები">
          <div className="shrink-0 border-b border-dusk-200 bg-dusk-50/90">
            <div className="flex items-center gap-2 px-3 py-2">
              {playButton('w-10 h-10')}
              {restartButton}
              {loopButton}
              <span className="flex-1 min-w-0 truncate text-xs font-black text-slate-700">
                {title}
                {name && <span className="font-bold text-dusk-700"> · {name}</span>}
              </span>
              <div className="hidden sm:block">{zoomControls}</div>
              <button
                type="button"
                onClick={() => { triggerHaptic(10); setFullscreen(false); }}
                className={iconBtn}
                aria-label="დახურვა"
                title="დახურვა (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="sm:hidden flex justify-center pb-2">{zoomControls}</div>
            <div className="relative h-1 bg-dusk-100">
              <div ref={el => { barRefs.current[1] = el; }} className="h-full bg-dusk-500" style={{ width: 0 }} />
            </div>
          </div>
          <div className="flex-1 overflow-auto">{scoreView}</div>
        </div>,
        document.body
      )}
    </section>
  );
};
