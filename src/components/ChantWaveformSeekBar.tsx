import React, { useEffect, useRef, useState } from 'react';
import { getAudioArrayBufferFromIdb } from '../utils/audioIdb';

interface ChantWaveformSeekBarProps {
  peaksUrl: string;                              // track the waveform shape is drawn from
  timeRef: React.MutableRefObject<number>;       // live playback position (read every frame)
  currentTime: number;                           // React state position, used to redraw while paused
  duration: number;
  isPlaying: boolean;
  analyser: AnalyserNode | null;
  loopStart: number | null;
  loopEnd: number | null;
  onSeek: (time: number) => void;
}

const HEIGHT = 56;
const BAR_WIDTH = 2;
const BAR_GAP = 1.5;
const PEAK_COUNT = 400;
const SEEK_KEY_STEP = 5;

// Decoded peaks are cached per URL so reopening a chant doesn't decode again
const peaksCache = new Map<string, Float32Array>();

async function loadPeaks(url: string): Promise<Float32Array> {
  const cached = peaksCache.get(url);
  if (cached) return cached;

  const buffer = (await getAudioArrayBufferFromIdb(url)) ?? (await (await fetch(url)).arrayBuffer());
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const audio = await ctx.decodeAudioData(buffer);
  const data = audio.getChannelData(0);

  const bucket = Math.max(1, Math.floor(data.length / PEAK_COUNT));
  const peaks = new Float32Array(PEAK_COUNT);
  let max = 0;
  for (let i = 0; i < PEAK_COUNT; i++) {
    let peak = 0;
    const end = Math.min(data.length, (i + 1) * bucket);
    for (let j = i * bucket; j < end; j++) {
      const v = Math.abs(data[j]);
      if (v > peak) peak = v;
    }
    peaks[i] = peak;
    if (peak > max) max = peak;
  }
  // Normalize, with a gentle curve so quiet passages stay visible
  for (let i = 0; i < PEAK_COUNT; i++) peaks[i] = max > 0 ? Math.pow(peaks[i] / max, 0.7) : 0;

  peaksCache.set(url, peaks);
  return peaks;
}

// Soft placeholder shape shown while the real waveform decodes
const PLACEHOLDER = Float32Array.from({ length: PEAK_COUNT }, (_, i) =>
  0.35 + 0.2 * Math.sin(i * 0.21) + 0.12 * Math.sin(i * 0.67 + 1)
);

const formatTime = (secs: number) => {
  const s = Math.max(0, Math.floor(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const ChantWaveformSeekBar: React.FC<ChantWaveformSeekBarProps> = ({
  peaksUrl,
  timeRef,
  currentTime,
  duration,
  isPlaying,
  analyser,
  loopStart,
  loopEnd,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);
  const [peaks, setPeaks] = useState<Float32Array | null>(() => peaksCache.get(peaksUrl) ?? null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const levelRef = useRef(0);
  const draggingRef = useRef(false);

  // Load waveform peaks
  useEffect(() => {
    if (!peaksUrl) return;
    let cancelled = false;
    setPeaks(peaksCache.get(peaksUrl) ?? null);
    loadPeaks(peaksUrl)
      .then(p => { if (!cancelled) setPeaks(p); })
      .catch(err => console.warn('Waveform decode failed:', err));
    return () => { cancelled = true; };
  }, [peaksUrl]);

  // Track container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drawing: runs every frame while playing/dragging, otherwise once per change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(HEIGHT * dpr);

    const dur = duration > 0 ? duration : 1;
    const shape = peaks ?? PLACEHOLDER;
    const barCount = Math.max(1, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
    const timeData = analyser ? new Uint8Array(analyser.fftSize) : null;

    const playedGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    playedGrad.addColorStop(0, '#fbbf24');
    playedGrad.addColorStop(0.5, '#d97706');
    playedGrad.addColorStop(1, '#fbbf24');

    let frameId: number | null = null;

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, HEIGHT);

      const t = dragTime ?? timeRef.current;
      const progressX = Math.min(1, Math.max(0, t / dur)) * width;

      // A-B loop region
      if (loopStart !== null || loopEnd !== null) {
        const x1 = ((loopStart ?? 0) / dur) * width;
        const x2 = ((loopEnd ?? dur) / dur) * width;
        if (x2 > x1) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
          ctx.fillRect(x1, 0, x2 - x1, HEIGHT);
          ctx.fillStyle = 'rgba(180, 83, 9, 0.5)';
          ctx.fillRect(x1, 0, 1, HEIGHT);
          ctx.fillRect(x2 - 1, 0, 1, HEIGHT);
        }
      }

      // Bars, batched into two paths (played / upcoming)
      const played = new Path2D();
      const upcoming = new Path2D();
      const usable = HEIGHT - 8;
      for (let i = 0; i < barCount; i++) {
        const v = shape[Math.floor((i / barCount) * shape.length)] || 0;
        const h = Math.max(2, v * usable);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const path = x + BAR_WIDTH / 2 <= progressX ? played : upcoming;
        path.roundRect(x, (HEIGHT - h) / 2, BAR_WIDTH, h, 1);
      }
      ctx.globalAlpha = peaks ? 1 : 0.5;
      ctx.fillStyle = '#e8dccb';
      ctx.fill(upcoming);
      ctx.fillStyle = playedGrad;
      ctx.fill(played);
      ctx.globalAlpha = 1;

      // Live loudness makes the playhead glow breathe with the singing
      if (isPlaying && analyser && timeData) {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const s = (timeData[i] - 128) / 128;
          sum += s * s;
        }
        levelRef.current = levelRef.current * 0.8 + Math.min(1, Math.sqrt(sum / timeData.length) * 4) * 0.2;
      } else {
        levelRef.current *= 0.9;
      }

      // Playhead
      if (t > 0 || dragTime !== null) {
        ctx.fillStyle = '#85502c';
        ctx.fillRect(progressX - 0.75, 2, 1.5, HEIGHT - 4);
        ctx.beginPath();
        ctx.arc(progressX, HEIGHT / 2, 4 + (dragTime !== null ? 1.5 : 0), 0, Math.PI * 2);
        ctx.shadowColor = 'rgba(245, 158, 11, 0.9)';
        ctx.shadowBlur = 4 + levelRef.current * 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      if (isPlaying || dragTime !== null) frameId = requestAnimationFrame(draw);
    };

    draw();
    return () => { if (frameId !== null) cancelAnimationFrame(frameId); };
  }, [width, peaks, duration, isPlaying, analyser, loopStart, loopEnd, dragTime, isPlaying ? 0 : currentTime, timeRef]);

  const timeFromEvent = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const shownTime = dragTime ?? currentTime;

  return (
    <div className="w-full select-none">
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="საგალობლის პოზიცია"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shownTime)}
        aria-valuetext={formatTime(shownTime)}
        className="relative w-full cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
        style={{ height: HEIGHT, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
          draggingRef.current = true;
          setDragTime(timeFromEvent(e));
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) setDragTime(timeFromEvent(e));
        }}
        onPointerUp={(e) => {
          if (!draggingRef.current) return;
          draggingRef.current = false;
          onSeek(timeFromEvent(e));
          setDragTime(null);
        }}
        onPointerCancel={() => { draggingRef.current = false; setDragTime(null); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(timeRef.current - SEEK_KEY_STEP); }
          if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(timeRef.current + SEEK_KEY_STEP); }
        }}
      >
        <canvas ref={canvasRef} className="block w-full" style={{ height: HEIGHT }} />

        {/* Time bubble while scrubbing */}
        {dragTime !== null && (
          <div
            className="pointer-events-none absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-[#85502c] text-white text-[11px] font-mono font-bold shadow-md"
            style={{ left: `${Math.min(92, Math.max(8, (dragTime / (duration || 1)) * 100))}%` }}
          >
            {formatTime(dragTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1 px-0.5 text-[11px] font-mono font-bold">
        <span className="text-amber-900">{formatTime(shownTime)}</span>
        <span className="text-slate-400">{formatTime(duration)}</span>
      </div>
    </div>
  );
};
