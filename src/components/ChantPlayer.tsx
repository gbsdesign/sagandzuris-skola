import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RefreshCw, Check, Download, CloudDownload, Music, Video, RotateCcw, RotateCw, Repeat, Gauge, Music2, ChevronRight, ChevronUp, SlidersHorizontal } from 'lucide-react';
import * as Tone from 'tone';
import soundTouchProcessorUrl from '@soundtouchjs/audio-worklet/processor?url';
import { ALL_CHANTS } from '../data/gelatiBookChants';
import { variantName } from '../data/tsirvaChants';
import { getChantMedia, type ChantMediaItem } from '../data/chantMediaRegistry';
import { triggerHaptic } from '../utils/haptics';
import { isAudioCached, cacheAudio } from '../utils/audioCache';
import { getAudioArrayBufferFromIdb } from '../utils/audioIdb';
import { ChantWaveformSeekBar } from './ChantWaveformSeekBar';
import { Stepper } from './Stepper';
import { saveBlob } from '../utils/chantSynth';
import { NpStepper } from '../pages/notes/NpStepper';

// The recording player: a chant version's recording (chantId + variantId) or a folk song's (media).
// Used by the notes page (layout 'panel') and the folk-songs map (layout 'card').

const SPEED_KEY = 'sagandzuri_player_speed';
const PITCH_KEY = 'sagandzuri_player_pitch';
const SEEK_STEP = 5; // seconds

const SPEED_STEPS = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5];

// Pitch stage: input → dry (pitch 0) / wet (shifted) → output, crossfaded on change.
// Wet path is SoundTouch (WSOLA), which stays clean on low male voices; Tone.PitchShift's
// short delay-line grains made them buzz and double when shifted down. Falls back to
// Tone.PitchShift only if the browser can't load the AudioWorklet.
let soundTouchModule: Promise<void> | null = null;
const loadSoundTouch = (rawCtx: AudioContext) => {
  if (!soundTouchModule) {
    soundTouchModule = rawCtx.audioWorklet.addModule(soundTouchProcessorUrl).catch(err => {
      soundTouchModule = null;
      throw err;
    });
  }
  return soundTouchModule;
};

interface PitchStage {
  input: Tone.Gain;
  setPitch: (semitones: number) => void;
  dispose: () => void;
}

const createPitchStage = async (output: Tone.InputNode, semitones: number): Promise<PitchStage> => {
  const ctx = Tone.getContext();
  const input = new Tone.Gain(1);
  const dry = new Tone.Gain(semitones === 0 ? 1 : 0).connect(output);
  const wet = new Tone.Gain(semitones === 0 ? 0 : 1).connect(output);
  input.connect(dry);

  let setShift: (n: number) => void;
  let disposeShifter: () => void;
  try {
    await loadSoundTouch(ctx.rawContext as AudioContext);
    const st = ctx.createAudioWorkletNode('soundtouch-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      processorOptions: { sampleBufferType: 'circular' },
    });
    const semitoneParam = st.parameters.get('pitchSemitones')!;
    semitoneParam.value = semitones;
    input.connect(st);
    Tone.connect(st, wet);
    setShift = n => { semitoneParam.value = n; };
    disposeShifter = () => {
      try { st.disconnect(); } catch (_) {}
      st.port.close();
    };
  } catch (err) {
    console.warn('SoundTouch unavailable, using Tone.PitchShift:', err);
    const ps = new Tone.PitchShift({ pitch: semitones, windowSize: 0.1, feedback: 0 }).connect(wet);
    input.connect(ps);
    setShift = n => { ps.pitch = n; };
    disposeShifter = () => ps.dispose();
  }

  return {
    input,
    setPitch: n => {
      if (n !== 0) setShift(n);
      dry.gain.rampTo(n === 0 ? 1 : 0, 0.03);
      wet.gain.rampTo(n === 0 ? 0 : 1, 0.03);
    },
    dispose: () => {
      disposeShifter();
      input.dispose();
      dry.dispose();
      wet.dispose();
    },
  };
};

const readStoredNumber =(key: string, fallback: number, min: number, max: number) => {
  try {
    const val = parseFloat(localStorage.getItem(key) ?? '');
    return Number.isFinite(val) && val >= min && val <= max ? val : fallback;
  } catch {
    return fallback;
  }
};

interface ChantPlayerProps {
  chantId?: string;
  variantId?: string;
  // A recording that isn't a chant variant (folk songs): media and titles are passed in directly
  media?: ChantMediaItem;
  title?: string;
  subtitle?: string;
  // the notes page: notes and lyrics have their own places there, details can fold away,
  // and the page stops this player when the synthesizer starts (pauseToken changes) or church mode is on
  hideNotesButton?: boolean;
  showDetails?: boolean;
  pauseToken?: number;
  disabled?: boolean;
  onPlayingChange?: (playing: boolean) => void;
  // 'panel': the notes page's compact recording panel (same look as its synthesizer; styles in notes.css)
  layout?: 'card' | 'panel';
  onToggleDetails?: () => void;
}

export const ChantPlayer: React.FC<ChantPlayerProps> = ({ chantId, variantId, media, title, subtitle, hideNotesButton = false, showDetails = true, pauseToken, disabled = false, onPlayingChange, layout = 'card', onToggleDetails }) => {
  const chant = chantId ? ALL_CHANTS.find(c => c.id === chantId) : undefined;
  const variant = chant?.variants?.find(v => v.id === variantId);

  // Always bound: the callers render the player only for recordings that have media
  const mediaItem = media ?? getChantMedia(chantId, variant?.code)!;
  const displayTitle = title ?? chant?.title;
  const displaySubtitle = subtitle ?? variant?.label;

  const activeTracks = mediaItem.tracks;
  const notes = mediaItem.notes;
  const lyrics = mediaItem.lyrics;
  const notesTitle = mediaItem.title;

  // Audio Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => readStoredNumber(SPEED_KEY, 1.0, 0.5, 2.5));
  const [pitchShiftVal, setPitchShiftVal] = useState<number>(() => Math.round(readStoredNumber(PITCH_KEY, 0, -7, 7))); // Semitones (-7 to 7)
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(mediaItem.duration ?? 153);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  // 3 Voices state + dedicated 'სამივე' mode
  // Recordings without a full mix start on their separate voices
  const hasMix = mediaItem.availableVoices.all;
  const [isAllVoicesActive, setIsAllVoicesActive] = useState(hasMix);
  const [voice1Active, setVoice1Active] = useState(!hasMix && mediaItem.availableVoices.voice1);
  const [voice2Active, setVoice2Active] = useState(!hasMix && mediaItem.availableVoices.voice2);
  const [voice3Active, setVoice3Active] = useState(!hasMix && mediaItem.availableVoices.voice3);
  // Per-voice volume (0-1), applied in individual voices mode
  const [voiceVolumes, setVoiceVolumes] = useState<number[]>([1, 1, 1]);

  // Cache Status
  const [cacheStatus, setCacheStatus] = useState<boolean[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Native Audio Engine References (100% C++ Hardware Sonic/WSOLA Engine)
  // Completely eliminates Tone.GrainPlayer's granular chopper vibrations, flutter, and offset multiplication jumping bugs
  const audioElementsRef = useRef<(HTMLAudioElement | null)[]>([]);
  // Per-track lengths: songs' separate voices can be shorter than the full mix
  const trackDurationsRef = useRef<number[]>([]);
  const mediaSourcesRef = useRef<(MediaElementAudioSourceNode | null)[]>([]);
  const channelsRef = useRef<(Tone.Channel | null)[]>([]);
  const pitchShiftRef = useRef<PitchStage | null>(null);
  const pitchShiftValRef = useRef(pitchShiftVal);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const currentTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Check Caching on Mount
  useEffect(() => {
    let mounted = true;
    const checkCache = async () => {
      const statuses = await Promise.all(
        activeTracks.map(track => track ? isAudioCached(track) : Promise.resolve(false))
      );
      if (mounted) setCacheStatus(statuses);
    };
    checkCache();
    return () => { mounted = false; };
  }, [activeTracks]);

  // Helper to format seconds as mm:ss
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  // Synchronize Channel Mute States with Studio Anti-Click Micro-Ramps (15ms)
  const applyAudioMutes = useCallback(() => {
    const channels = channelsRef.current;
    if (channels.length < 4) return;
    const now = Tone.now();

    const setMute = (ch: Tone.Channel | null, isMuted: boolean, index: number, gain = 1) => {
      if (ch) {
        try {
          ch.volume.cancelScheduledValues(now);
          ch.volume.rampTo(isMuted ? -Infinity : Tone.gainToDb(gain), 0.015, now);
        } catch (_) {
          ch.mute = isMuted;
        }
      }
      const directAudio = audioElementsRef.current[index];
      if (directAudio && !mediaSourcesRef.current[index]) {
        directAudio.muted = isMuted;
        directAudio.volume = gain;
      }
    };

    if (isAllVoicesActive) {
      // 'სამივე' track (Index 3) unmuted, individual stems muted
      setMute(channels[0], true, 0);
      setMute(channels[1], true, 1);
      setMute(channels[2], true, 2);
      setMute(channels[3], false, 3);
    } else {
      // Individual stems mode: Mix (Index 3) muted, stems follow their toggle states
      setMute(channels[0], !voice1Active, 0, voiceVolumes[0]);
      setMute(channels[1], !voice2Active, 1, voiceVolumes[1]);
      setMute(channels[2], !voice3Active, 2, voiceVolumes[2]);
      setMute(channels[3], true, 3);
    }
  }, [isAllVoicesActive, voice1Active, voice2Active, voice3Active, voiceVolumes]);

  useEffect(() => {
    applyAudioMutes();
  }, [applyAudioMutes]);

  // Initialize Native Audio Elements with Web Audio Graph & Tone.PitchShift
  useEffect(() => {
    let isCancelled = false;

    const initAudioEngine = async () => {
      try {
        setIsLoading(true);

        const rawCtx = Tone.getContext().rawContext as AudioContext;

        // Dispose previous audio elements safely
        audioElementsRef.current.forEach(a => {
          try {
            if (a) {
              a.pause();
              a.removeAttribute('src');
              a.load();
            }
          } catch (_) {}
        });
        audioElementsRef.current = [];
        trackDurationsRef.current = [];
        mediaSourcesRef.current = [];
        channelsRef.current.forEach(ch => { try { ch?.dispose(); } catch (_) {} });
        channelsRef.current = [];
        if (pitchShiftRef.current) {
          try { pitchShiftRef.current.dispose(); } catch (_) {}
          pitchShiftRef.current = null;
        }
        if (analyserRef.current) {
          try { analyserRef.current.disconnect(); } catch (_) {}
          analyserRef.current = null;
        }

        // Master Limiter (-1 dBFS) to prevent clipping
        const limiter = new Tone.Limiter(-1).toDestination();

        // Native Master Analyser for Georgian Polyphonic Waveform Visualizer
        const analyser = rawCtx.createAnalyser();
        analyser.fftSize = 128;
        limiter.connect(analyser);
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

        // Master pitch stage (pitch 0 = untouched dry signal)
        const pitchShift = await createPitchStage(limiter, pitchShiftValRef.current);
        if (isCancelled) {
          pitchShift.dispose();
          limiter.dispose();
          return;
        }
        pitchShiftRef.current = pitchShift;

        const newAudios: HTMLAudioElement[] = [];
        const newSources: MediaElementAudioSourceNode[] = [];
        const newChannels: Tone.Channel[] = [];

        for (let i = 0; i < activeTracks.length; i++) {
          const url = activeTracks[i];
          if (!url) {
            newAudios.push(null as unknown as HTMLAudioElement);
            newSources.push(null as unknown as MediaElementAudioSourceNode);
            newChannels.push(null as unknown as Tone.Channel);
            continue;
          }

          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          // Enable browser C++ Sonic pitch preservation for speed changes
          audio.preservesPitch = true;
          audio.playbackRate = playbackSpeed;

          // Check local IndexedDB storage first for 100% offline playback
          try {
            const idbBuf = await getAudioArrayBufferFromIdb(url);
            if (idbBuf) {
              const blob = new Blob([idbBuf], { type: 'audio/mp3' });
              audio.src = URL.createObjectURL(blob);
            } else {
              audio.src = url;
            }
          } catch (_) {
            audio.src = url;
          }

          const updateDur = () => {
            if (audio.duration && !isNaN(audio.duration) && audio.duration > 0 && isFinite(audio.duration)) {
              const ds = trackDurationsRef.current;
              ds[i] = audio.duration;
              setDuration(Math.round(hasMix && ds[3] ? ds[3] : Math.max(...ds.filter(Boolean))));
            }
          };
          audio.onloadedmetadata = updateDur;
          audio.ondurationchange = updateDur;
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            updateDur();
          }

          // Connect native audio to Tone.Channel via Web Audio MediaElementSource
          try {
            const sourceNode = rawCtx.createMediaElementSource(audio);
            const channel = new Tone.Channel({ volume: 0, mute: false });
            Tone.connect(sourceNode, channel);
            channel.connect(pitchShift.input);

            newAudios.push(audio);
            newSources.push(sourceNode);
            newChannels.push(channel);
          } catch (e) {
            console.warn('Media element source setup warning:', e);
            newAudios.push(audio);
            newSources.push(null as unknown as MediaElementAudioSourceNode);
            newChannels.push(null as unknown as Tone.Channel);
          }
        }

        if (isCancelled) return;

        audioElementsRef.current = newAudios;
        mediaSourcesRef.current = newSources;
        channelsRef.current = newChannels;
        applyAudioMutes();
        setIsLoading(false);
      } catch (err) {
        console.error('Audio engine init error:', err);
        if (!isCancelled) setIsLoading(false);
      }
    };

    initAudioEngine();

    return () => {
      isCancelled = true;
      audioElementsRef.current.forEach(a => {
        try {
          if (a) {
            a.pause();
            a.removeAttribute('src');
            a.load();
          }
        } catch (_) {}
      });
      audioElementsRef.current = [];
      mediaSourcesRef.current = [];
      channelsRef.current.forEach(ch => { try { ch?.dispose(); } catch (_) {} });
      channelsRef.current = [];
      if (pitchShiftRef.current) {
        try { pitchShiftRef.current.dispose(); } catch (_) {}
        pitchShiftRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeTracks]);

  // Live Position Tracking via requestAnimationFrame (Sample-Accurate Native Hardware Clock)
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const maxDur = duration || 153;
    const effectiveLoopStart = loopStart ?? 0;
    const effectiveLoopEnd = loopEnd ?? maxDur;
    // Position is tracked every frame, but the UI re-renders at most 10x/sec
    let lastUiUpdate = 0;

    const updateTime = (timestamp: number) => {
      const audios = audioElementsRef.current;
      const primary = audios[3] || audios[0];
      if (primary) {
        const pos = primary.currentTime;

        if (isLoopEnabled && pos >= effectiveLoopEnd) {
          audios.forEach(a => {
            if (a) a.currentTime = effectiveLoopStart;
          });
          currentTimeRef.current = effectiveLoopStart;
          setCurrentTime(effectiveLoopStart);
        } else if (!isLoopEnabled && pos >= maxDur) {
          audios.forEach(a => {
            try { a?.pause(); } catch (_) {}
          });
          setIsPlaying(false);
          currentTimeRef.current = 0;
          setCurrentTime(0);
          return;
        } else {
          currentTimeRef.current = pos;
          if (timestamp - lastUiUpdate >= 100) {
            lastUiUpdate = timestamp;
            setCurrentTime(pos);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(updateTime);
    };

    animFrameRef.current = requestAnimationFrame(updateTime);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, duration, isLoopEnabled, loopStart, loopEnd]);

  // Handle Seek: instantaneous seek across all 4 channels
  const handleSeek = (newTime: number) => {
    const maxDur = duration || 153;
    const safeTime = Math.max(0, Math.min(newTime, maxDur));
    currentTimeRef.current = safeTime;
    setCurrentTime(safeTime);

    audioElementsRef.current.forEach(a => {
      if (a) a.currentTime = safeTime;
    });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setPositionState({ duration: maxDur, playbackRate: playbackSpeed, position: safeTime });
      } catch (_) {}
    }
  };

  const handleSkip = (delta: number) => {
    triggerHaptic(10);
    handleSeek(currentTimeRef.current + delta);
  };

  // Remember speed & pitch for the next session
  useEffect(() => {
    try { localStorage.setItem(SPEED_KEY, String(playbackSpeed)); } catch (_) {}
  }, [playbackSpeed]);

  useEffect(() => {
    try { localStorage.setItem(PITCH_KEY, String(pitchShiftVal)); } catch (_) {}
  }, [pitchShiftVal]);

  // 1. SPEED CONTROL ONLY (0.5x - 2.5x):
  // Updates playbackRate on HTMLAudioElements with preservesPitch=true.
  // NEVER changes the musical pitch of the chant! NEVER jumps! ZERO vibrations!
  useEffect(() => {
    audioElementsRef.current.forEach(a => {
      if (a) {
        a.playbackRate = playbackSpeed;
        a.preservesPitch = true;
      }
    });
  }, [playbackSpeed]);

  // 2. PITCH CONTROL ONLY (-7 to +7 Semitones):
  // Updates the pitch stage independently without affecting playback speed/tempo!
  // When pitch = 0: 100% dry master bypass (zero latency, pristine studio sound)
  useEffect(() => {
    pitchShiftValRef.current = pitchShiftVal;
    pitchShiftRef.current?.setPitch(pitchShiftVal);
  }, [pitchShiftVal]);

  // Playback Toggle
  const handlePlayToggle = async () => {
    triggerHaptic(10);
    const audios = audioElementsRef.current;
    if (!audios.length) return;

    try {
      await Tone.start();
      const rawCtx = Tone.getContext().rawContext as AudioContext;
      if (rawCtx && rawCtx.state !== 'running') {
        await rawCtx.resume();
      }
    } catch (_) {}

    if (!isPlaying && disabled) return;
    if (isPlaying) {
      // Pause
      audios.forEach(a => {
        try { a?.pause(); } catch (_) {}
      });
      setIsPlaying(false);
    } else {
      // Play: synchronize all elements to the exact current time
      const curTime = currentTimeRef.current || 0;
      audios.forEach(a => {
        if (a) {
          a.currentTime = curTime;
          a.playbackRate = playbackSpeed;
          a.preservesPitch = true;
        }
      });
      applyAudioMutes();

      try {
        await Promise.all(audios.map(a => a?.play().catch(() => {})));
        setIsPlaying(true);
      } catch (err) {
        console.warn('Audio play error:', err);
      }
    }
  };

  const onPlayingChangeRef = useRef(onPlayingChange);
  onPlayingChangeRef.current = onPlayingChange;
  useEffect(() => { onPlayingChangeRef.current?.(isPlaying); }, [isPlaying]);
  useEffect(() => {
    if (pauseToken === undefined && !disabled) return;
    audioElementsRef.current.forEach(a => { try { a?.pause(); } catch (_) {} });
    setIsPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseToken, disabled]);

  // Lock-screen / notification controls (Media Session API).
  // Handlers go through refs so they always call the latest closures.
  const playToggleRef = useRef(handlePlayToggle);
  const seekRef = useRef(handleSeek);
  const isPlayingRef = useRef(isPlaying);
  playToggleRef.current = handlePlayToggle;
  seekRef.current = handleSeek;
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: displayTitle || 'წმიდაო ღმერთო',
      artist: displaySubtitle || 'საგანძურის სკოლა',
      album: 'საგანძურის სკოლა',
      artwork: [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
    });

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => { if (!isPlayingRef.current) playToggleRef.current(); }],
      ['pause', () => { if (isPlayingRef.current) playToggleRef.current(); }],
      ['seekbackward', (d) => seekRef.current(currentTimeRef.current - (d.seekOffset || SEEK_STEP))],
      ['seekforward', (d) => seekRef.current(currentTimeRef.current + (d.seekOffset || SEEK_STEP))],
      ['seekto', (d) => { if (d.seekTime != null) seekRef.current(d.seekTime); }],
    ];
    handlers.forEach(([action, handler]) => {
      try { ms.setActionHandler(action, handler); } catch (_) {}
    });

    return () => {
      handlers.forEach(([action]) => {
        try { ms.setActionHandler(action, null); } catch (_) {}
      });
      ms.metadata = null;
      ms.playbackState = 'none';
    };
  }, [displayTitle, displaySubtitle]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    try {
      navigator.mediaSession.setPositionState({
        duration: duration || 153,
        playbackRate: playbackSpeed,
        position: Math.min(currentTimeRef.current, duration || 153),
      });
    } catch (_) {}
  }, [isPlaying, duration, playbackSpeed]);

  // Offline Download Handler (Pure IndexedDB Storage - 100% Offline)
  const handleDownloadStems = async () => {
    try {
      triggerHaptic(15);
      setIsDownloading(true);
      const validTracks = activeTracks.filter(Boolean);
      await Promise.all(validTracks.map(track => cacheAudio(track)));
      const statuses = await Promise.all(
        activeTracks.map(track => track ? isAudioCached(track) : Promise.resolve(false))
      );
      setCacheStatus(statuses);
    } catch (e) {
      console.error('Download stems failed:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  // Instant download for sheet music pages
  const handleDownloadNote = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const validTracks = activeTracks.filter(Boolean);
  const allCached = validTracks.length > 0 && validTracks.every((t) => {
    const idx = activeTracks.indexOf(t);
    return idx !== -1 && cacheStatus[idx];
  });

  // One-button A-B repeat: 1st tap marks A, 2nd marks B and starts repeating, 3rd clears
  const handleLoopButton = () => {
    triggerHaptic(10);
    const t = currentTimeRef.current;
    if (loopStart === null) {
      setLoopStart(t);
      setLoopEnd(null);
      setIsLoopEnabled(false);
    } else if (!isLoopEnabled) {
      const a = Math.min(loopStart, t);
      const b = Math.max(loopStart, t);
      if (b - a < 0.5) return; // ignore a B too close to A
      setLoopStart(a);
      setLoopEnd(b);
      setIsLoopEnabled(true);
    } else {
      setLoopStart(null);
      setLoopEnd(null);
      setIsLoopEnabled(false);
    }
  };
  const loopStage = isLoopEnabled ? 2 : loopStart !== null ? 1 : 0;

  const speedIdx = SPEED_STEPS.findIndex(s => Math.abs(s - playbackSpeed) < 0.001);
  const stepSpeed = (dir: 1 | -1) => {
    const next = dir > 0
      ? SPEED_STEPS.find(s => s > playbackSpeed + 0.001)
      : [...SPEED_STEPS].reverse().find(s => s < playbackSpeed - 0.001);
    if (next !== undefined) setPlaybackSpeed(next);
  };

  const voiceAvailable = [
    mediaItem ? mediaItem.availableVoices.voice1 : true,
    mediaItem ? mediaItem.availableVoices.voice2 : true,
    mediaItem ? mediaItem.availableVoices.voice3 : true,
  ];
  const voiceActive = [voice1Active, voice2Active, voice3Active];
  const voiceSetters = [setVoice1Active, setVoice2Active, setVoice3Active];

  // MP3 download of the recording itself: the offline copy if there is one, otherwise the network
  const [mp3MenuOpen, setMp3MenuOpen] = useState(false);
  const [savingTrack, setSavingTrack] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const mp3MenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mp3MenuOpen) return;
    const close = (e: PointerEvent) => { if (!mp3MenuRef.current?.contains(e.target as Node)) setMp3MenuOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [mp3MenuOpen]);
  const TRACK_LABELS = ['I ხმა', 'II ხმა', 'III ხმა', 'სამივე ხმა'];
  const mp3Tracks = [3, 0, 1, 2].filter(i => activeTracks[i] && (i === 3 ? mediaItem.availableVoices.all : voiceAvailable[i]));
  const handleSaveMp3 = async (i: number) => {
    const url = activeTracks[i];
    if (!url) return;
    setMp3MenuOpen(false);
    setSaveFailed(false);
    setSavingTrack(i);
    try {
      let buf = await getAudioArrayBufferFromIdb(url);
      if (!buf) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buf = await res.arrayBuffer();
      }
      const versionName = variant?.version !== undefined ? variantName(variant) : displaySubtitle;
      saveBlob(new Blob([buf], { type: 'audio/mpeg' }), `${[displayTitle, versionName, TRACK_LABELS[i]].filter(Boolean).join(' — ')}.mp3`);
    } catch (err) {
      console.error('MP3 download failed:', err);
      setSaveFailed(true);
    } finally {
      setSavingTrack(null);
    }
  };

  const [mixOpen, setMixOpen] = useState(false);
  if (layout === 'panel') {
    const voiceOn = (i: number) => !isAllVoicesActive && voiceActive[i];
    const pitchLabel = pitchShiftVal > 0 ? `+${pitchShiftVal}` : pitchShiftVal < 0 ? `−${-pitchShiftVal}` : '0';
    return (
      <div className="np-pin">
        <div className="np-row">
          <button type="button" className="np-ib np-rskip" onClick={() => handleSkip(-SEEK_STEP)} disabled={isLoading} aria-label={`${SEEK_STEP} წამით უკან`} title={`${SEEK_STEP} წამით უკან`}>
            <RotateCcw /><span className="n">{SEEK_STEP}</span>
          </button>
          <button
            type="button"
            className={`np-play ${isPlaying ? 'on' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={handlePlayToggle}
            disabled={isLoading || (disabled && !isPlaying)}
            aria-label={isPlaying ? 'პაუზა' : 'დაკვრა'}
          >
            <span className="np-pi play"><Play fill="currentColor" /></span>
            <span className="np-pi pause"><Pause fill="currentColor" /></span>
            <span className="np-pi load"><RefreshCw className="animate-spin" /></span>
          </button>
          <button type="button" className="np-ib np-rskip" onClick={() => handleSkip(SEEK_STEP)} disabled={isLoading} aria-label={`${SEEK_STEP} წამით წინ`} title={`${SEEK_STEP} წამით წინ`}>
            <RotateCw /><span className="n">{SEEK_STEP}</span>
          </button>
          <div className="np-prog">
            <ChantWaveformSeekBar
              peaksUrl={activeTracks[3] || activeTracks.find(Boolean) || ''}
              timeRef={currentTimeRef}
              currentTime={currentTime}
              duration={duration || 153}
              isPlaying={isPlaying}
              analyser={analyserNode}
              loopStart={loopStart}
              loopEnd={loopEnd}
              onSeek={handleSeek}
              height={38}
              timeClassName="np-time"
            />
          </div>
          {onToggleDetails && (
            <button type="button" className="np-ib np-chev" aria-expanded={showDetails} onClick={onToggleDetails} aria-label="დეტალები" title="ჩაკეცვა / გაშლა">
              <ChevronUp />
            </button>
          )}
        </div>
        <div className="np-details">
          <div className="np-dA">
            <div className="np-row">
              {/* a one-track recording (another choir's) has no voices to switch or balance */}
              {voiceAvailable.some(Boolean) && <>
              <div className="np-seg" role="group" aria-label="ხმები">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    type="button"
                    className={voiceOn(i) ? 'on' : ''}
                    disabled={!voiceAvailable[i]}
                    aria-pressed={voiceOn(i)}
                    onClick={() => { triggerHaptic(8); setIsAllVoicesActive(false); voiceSetters[i](prev => !prev); }}
                  >
                    {['I', 'II', 'III'][i]}
                  </button>
                ))}
                <button
                  type="button"
                  className={`all ${isAllVoicesActive ? 'on' : ''}`}
                  disabled={!mediaItem.availableVoices.all && !mediaItem.availableVoices.voice1}
                  onClick={() => { triggerHaptic(8); setIsAllVoicesActive(prev => !prev); setVoice1Active(false); setVoice2Active(false); setVoice3Active(false); }}
                >
                  სამივე
                </button>
              </div>
              <button type="button" className="np-ib np-mixbtn" aria-pressed={mixOpen} onClick={() => setMixOpen(o => !o)} aria-label="ხმების სიძლიერე" title="ხმების სიძლიერე">
                <SlidersHorizontal />
              </button>
              </>}
              <button
                type="button"
                className={`np-ib np-loop ${loopStage ? 'pill' : ''} ${loopStage === 1 ? 'half' : ''} ${loopStage === 2 ? 'lit' : ''}`}
                onClick={handleLoopButton}
                disabled={isLoading}
                title={loopStage === 0 ? 'გამეორება: მონიშნე დასაწყისი (A)' : loopStage === 1 ? 'მონიშნე დასასრული (B)' : 'გამეორების გამორთვა'}
                aria-label="გამეორება"
              >
                <Repeat />{loopStage === 1 && <span>A→B</span>}{loopStage === 2 && <span>A–B</span>}
              </button>
              {mediaItem.videoUrl && (
                <a className="np-ib np-video" href={mediaItem.videoUrl} target="_blank" rel="noopener noreferrer" title="ვიდეოს გახსნა" aria-label="ვიდეოს გახსნა">
                  <Video />
                </a>
              )}
            </div>
            {mixOpen && (
              <div className={`np-mix ${isAllVoicesActive ? 'dim' : ''}`}>
                {[0, 1, 2].map(i => (
                  <label key={i}>
                    <span>{['I', 'II', 'III'][i]} ხმა<em>{Math.round(voiceVolumes[i] * 100)}%</em></span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(voiceVolumes[i] * 100)}
                      disabled={!voiceAvailable[i]}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) / 100;
                        setVoiceVolumes(prev => prev.map((v, idx) => (idx === i ? val : v)));
                      }}
                    />
                  </label>
                ))}
                <p className="np-mix-note">სიძლიერე მუშაობს, როცა ხმები ცალ-ცალკეა ჩართული</p>
              </div>
            )}
          </div>
          <div className="np-dB">
            <div className="np-steps">
              <NpStepper
                label="სიჩქარე"
                value={`${Number(playbackSpeed.toFixed(2))}×`}
                changed={playbackSpeed !== 1}
                onMinus={() => stepSpeed(-1)}
                onPlus={() => stepSpeed(1)}
                onReset={() => setPlaybackSpeed(1)}
                minusDisabled={speedIdx === 0 || playbackSpeed <= SPEED_STEPS[0]}
                plusDisabled={playbackSpeed >= SPEED_STEPS[SPEED_STEPS.length - 1]}
              />
              <NpStepper
                label="ტონი"
                value={pitchLabel}
                changed={pitchShiftVal !== 0}
                onMinus={() => setPitchShiftVal(p => Math.max(-7, p - 1))}
                onPlus={() => setPitchShiftVal(p => Math.min(7, p + 1))}
                onReset={() => setPitchShiftVal(0)}
                minusDisabled={pitchShiftVal <= -7}
                plusDisabled={pitchShiftVal >= 7}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const roundBtn = 'h-9 rounded-full border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 text-[11px] font-bold flex items-center justify-center gap-0.5 transition-all cursor-pointer active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Transport: repeat · −5 · play · +5 · offline · video */}
      <div className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={handleLoopButton}
          disabled={isLoading}
          className={`${roundBtn} px-2 sm:px-2.5 whitespace-nowrap ${
            loopStage === 2
              ? '!bg-amber-500 !border-amber-500 !text-white shadow-sm'
              : loopStage === 1
              ? '!border-amber-400 !text-amber-800 !bg-amber-50'
              : ''
          }`}
          title={loopStage === 0 ? 'გამეორება: მონიშნე დასაწყისი (A)' : loopStage === 1 ? 'მონიშნე დასასრული (B)' : 'გამეორების გამორთვა'}
          aria-label="გამეორება"
        >
          <Repeat className="w-4 h-4" />
          {loopStage === 1 && <span>A→B</span>}
          {loopStage === 2 && <span>A–B</span>}
        </button>

        <button type="button" onClick={() => handleSkip(-SEEK_STEP)} disabled={isLoading} className={`${roundBtn} px-2 sm:px-2.5`} aria-label={`${SEEK_STEP} წამით უკან`} title={`${SEEK_STEP} წამით უკან`}>
          <RotateCcw className="w-4 h-4" />
          <span>{SEEK_STEP}</span>
        </button>

        <button
          type="button"
          onClick={handlePlayToggle}
          disabled={isLoading}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
            isPlaying ? 'bg-[#85502c] hover:bg-[#6c4021] text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
          } disabled:bg-slate-300 disabled:cursor-not-allowed active:scale-95`}
          aria-label={isPlaying ? 'პაუზა' : 'დაკვრა'}
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current translate-x-0.5" />
          )}
        </button>

        <button type="button" onClick={() => handleSkip(SEEK_STEP)} disabled={isLoading} className={`${roundBtn} px-2 sm:px-2.5`} aria-label={`${SEEK_STEP} წამით წინ`} title={`${SEEK_STEP} წამით წინ`}>
          <RotateCw className="w-4 h-4" />
          <span>{SEEK_STEP}</span>
        </button>

        {/* one download menu: MP3 files of the recording + saving it for offline listening */}
        <div ref={mp3MenuRef}>
          <button
            type="button"
            onClick={() => { triggerHaptic(10); setMp3MenuOpen(o => !o); }}
            disabled={!validTracks.length || savingTrack !== null}
            className={`${roundBtn} w-9 ${allCached ? '!text-emerald-700 !border-emerald-200' : ''}`}
            title="ჩამოტვირთვა (MP3 / ოფლაინ)"
            aria-label="ჩამოტვირთვა"
          >
            {savingTrack !== null || isDownloading ? <RefreshCw className="w-4 h-4 animate-spin text-amber-600" /> : <Download className="w-4 h-4" />}
          </button>
          {mp3MenuOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-30 w-60 max-w-full rounded-xl border border-amber-200 bg-white shadow-lg py-1 overflow-hidden">
              {mp3Tracks.map(i => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSaveMp3(i)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-amber-50 cursor-pointer"
                >
                  <Music2 className={`w-4 h-4 ${i === 3 ? 'text-amber-600' : 'text-slate-400'}`} /> MP3 · {TRACK_LABELS[i]}
                </button>
              ))}
              {mp3Tracks.length > 0 && (
                <p className="px-3 pt-0.5 pb-1.5 text-[10px] text-slate-400 leading-snug">ორიგინალი ჩანაწერი — სიჩქარე და ტონი არ იცვლება</p>
              )}
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={() => { setMp3MenuOpen(false); handleDownloadStems(); }}
                disabled={isDownloading || allCached}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-amber-50 cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
              >
                {allCached ? <Check className="w-4 h-4 text-emerald-600 stroke-[3]" /> : <CloudDownload className="w-4 h-4 text-amber-600" />}
                {allCached ? 'შენახულია ოფლაინ' : 'ოფლაინ შენახვა (ინტერნეტის გარეშე)'}
              </button>
            </div>
          )}
        </div>

        {mediaItem?.videoUrl && (
          <a
            href={mediaItem.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${roundBtn} w-9`}
            title="ვიდეოს გახსნა"
            aria-label="ვიდეოს გახსნა"
          >
            <Video className="w-4 h-4" />
          </a>
        )}
      </div>

      {saveFailed && (
        <p className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">ჩამოტვირთვა ვერ მოხერხდა, სცადეთ თავიდან</p>
      )}

      {/* Waveform seek bar: visualizer + progress in one */}
      <div className="w-full bg-white/95 border border-amber-100/90 rounded-xl px-3 pt-3 pb-1.5 shadow-2xs">
        <ChantWaveformSeekBar
          peaksUrl={activeTracks[3] || activeTracks.find(Boolean) || ''}
          timeRef={currentTimeRef}
          currentTime={currentTime}
          duration={duration || 153}
          isPlaying={isPlaying}
          analyser={analyserNode}
          loopStart={loopStart}
          loopEnd={loopEnd}
          onSeek={handleSeek}
        />
      </div>

      {showDetails && (<>
      {/* Voices: segmented control; per-voice volume appears under each voice in individual mode.
          A one-track recording (a song from the archive) has nothing to switch: no control. */}
      {voiceAvailable.some(Boolean) && <div className="w-full grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/70">
        {[0, 1, 2].map(i => {
          const isOn = !isAllVoicesActive && voiceActive[i];
          return (
            <div key={i} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={!voiceAvailable[i]}
                onClick={() => {
                  triggerHaptic(10);
                  setIsAllVoicesActive(false);
                  voiceSetters[i](prev => !prev);
                }}
                className={`h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
                  isOn ? 'bg-white text-amber-800 shadow-sm ring-1 ring-amber-300' : 'text-slate-500 hover:text-slate-700'
                } disabled:opacity-35 disabled:cursor-not-allowed`}
                title={voiceAvailable[i] ? `${['I', 'II', 'III'][i]} ხმის ჩართვა/გამორთვა` : `${['I', 'II', 'III'][i]} ხმა არ მოიძებნა`}
              >
                {['I', 'II', 'III'][i]}
              </button>
              {!isAllVoicesActive && (
                <div className={`px-1 pb-0.5 flex flex-col items-center transition-opacity ${isOn ? '' : 'opacity-40'}`}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={Math.round(voiceVolumes[i] * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) / 100;
                      setVoiceVolumes(prev => prev.map((v, idx) => (idx === i ? val : v)));
                    }}
                    className="w-full accent-amber-600 h-1 cursor-pointer"
                    aria-label={`${['I', 'II', 'III'][i]} ხმის სიმაღლე`}
                  />
                  <span className="text-[9px] font-mono font-bold text-slate-500 leading-none mt-0.5">
                    {Math.round(voiceVolumes[i] * 100)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <button
          type="button"
          disabled={mediaItem ? !mediaItem.availableVoices.all && !mediaItem.availableVoices.voice1 : false}
          onClick={() => {
            triggerHaptic(10);
            setIsAllVoicesActive(prev => !prev);
            setVoice1Active(false);
            setVoice2Active(false);
            setVoice3Active(false);
          }}
          className={`h-9 rounded-xl font-black text-xs transition-all cursor-pointer ${
            isAllVoicesActive ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
          } disabled:opacity-35 disabled:cursor-not-allowed`}
        >
          სამივე
        </button>
      </div>}

      {/* Speed & pitch steppers */}
      <div className="w-full flex flex-wrap items-center gap-2">
        <Stepper
          icon={<Gauge className="w-3.5 h-3.5 text-amber-600" />}
          label="სიჩქარე"
          value={`${Number(playbackSpeed.toFixed(2))}×`}
          isDefault={playbackSpeed === 1}
          onMinus={() => stepSpeed(-1)}
          onPlus={() => stepSpeed(1)}
          onReset={() => setPlaybackSpeed(1)}
          minusDisabled={speedIdx === 0 || playbackSpeed <= SPEED_STEPS[0]}
          plusDisabled={playbackSpeed >= SPEED_STEPS[SPEED_STEPS.length - 1]}
        />
        <Stepper
          icon={<Music2 className="w-3.5 h-3.5 text-amber-600" />}
          label="ტონი"
          value={pitchShiftVal > 0 ? `+${pitchShiftVal}` : String(pitchShiftVal)}
          isDefault={pitchShiftVal === 0}
          onMinus={() => setPitchShiftVal(p => Math.max(-7, p - 1))}
          onPlus={() => setPitchShiftVal(p => Math.min(7, p + 1))}
          onReset={() => setPitchShiftVal(0)}
          minusDisabled={pitchShiftVal <= -7}
          plusDisabled={pitchShiftVal >= 7}
        />
      </div>

      </>)}

      {/* Sheet music & lyrics */}
      {!hideNotesButton && (<>
      <button
        type="button"
        onClick={() => {
          triggerHaptic(15);
          setIsNotesModalOpen(true);
        }}
        className="w-full h-10 px-3 rounded-full bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200/70 flex items-center gap-2 text-left transition-all cursor-pointer active:scale-[0.99]"
      >
        <Music className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="flex-1 text-xs font-extrabold text-slate-700">ნოტები და ტექსტი</span>
        {notes.length > 0 && (
          <span className="text-[10px] font-bold text-amber-800 bg-white/80 px-2 py-0.5 rounded-full border border-amber-200/70">
            {notes.length} გვ.
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-amber-700/70 shrink-0" />
      </button>

      </>)}

      {/* Sheet Music Modal Overlay */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85dvh] overflow-y-auto border border-amber-100 shadow-2xl flex flex-col p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Music className="w-5 h-5 text-amber-600" />
                საგალობლის ნოტები და ტექსტი
              </h3>
              <button
                onClick={() => {
                  triggerHaptic(10);
                  setIsNotesModalOpen(false);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-center py-4">
              {/* Real Notes / Sheet Music */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3">
                    {notes.map((note, idx) => (
                      <div key={note.id || idx} className="rounded-xl overflow-hidden border border-amber-200/80 shadow-xs bg-slate-50">
                        <div className="px-3 py-1.5 bg-amber-100/60 border-b border-amber-200/60 flex items-center justify-between text-xs font-bold text-amber-900">
                          <div className="flex items-center gap-1.5">
                            <span>ნოტების ფურცელი {idx + 1}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic(10);
                                handleDownloadNote(note.url, `${notesTitle}-${idx + 1}.png`);
                              }}
                              className="p-1 rounded-md text-amber-800 hover:text-amber-950 bg-amber-200/60 hover:bg-amber-300/70 transition-all cursor-pointer inline-flex items-center justify-center active:scale-90"
                              title="ნოტის ჩამოტვირთვა"
                              aria-label={`ნოტების ფურცელი ${idx + 1}-ის ჩამოტვირთვა`}
                            >
                              <Download className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{note.name}</span>
                        </div>
                        <img
                          src={note.url}
                          alt={`${notesTitle} ნოტები ${idx + 1}`}
                          className="w-full h-auto object-contain max-h-96"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-amber-200 rounded-2xl p-8 bg-amber-50/30 flex flex-col items-center justify-center space-y-3">
                  <Music className="w-12 h-12 text-amber-600 stroke-[1.5]" />
                  <p className="text-xs font-black text-[#85502c]">
                    {displayTitle || 'წმიდაო ღმერთო'} — {displaySubtitle || 'გელათის სკოლა'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                    აქ წარმოდგენილია საგალობლის ნოტები ხმების მიხედვით. შეგიძლიათ გამოიყენოთ ოფლაინ რეჟიმში სამუშაოდ.
                  </p>
                </div>
              )}

              {/* Georgian Lyrics details - Compact & Neat */}
              {lyrics && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-left space-y-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ტექსტი (Lyrics)</h4>
                  <p className="text-xs font-medium text-slate-700 leading-snug whitespace-pre-line text-center italic font-serif">
                    {lyrics}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                triggerHaptic(10);
                setIsNotesModalOpen(false);
              }}
              className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm transition-all shadow-md active:scale-95"
            >
              ფანჯრის დახურვა
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
