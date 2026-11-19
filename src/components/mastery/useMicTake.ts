import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context';
import { MAX_TAKE_SECONDS, saveDrillTake } from '../../utils/drillTakes';
import { startSinging, type SingSession } from '../../utils/singCapture';

// The microphone under an exercise (ManeraLessonSheet's MicPanel): a tuner's note (my note against the one to sing) and a
// recording of the whole try, up to MAX_TAKE_SECONDS, to hear back and send to the teachers. Shared by the old drawing
// and the new look's switch „ტიუნერი“ (pages/v2/ostatoba/ExerciseV2).

export type MicState = { kind: 'off' } | { kind: 'on'; started: number } | { kind: 'take'; mp3: Blob | null; seconds: number } | { kind: 'error'; text: string };

export const useMicTake = (drillId: string) => {
  const { user } = useAuth();
  const [state, setState] = useState<MicState>({ kind: 'off' });
  const [midi, setMidi] = useState<number | null>(null);
  const [secs, setSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sent, setSent] = useState<'no' | 'busy' | 'yes' | 'fail'>('no');
  const session = useRef<SingSession | null>(null);
  const audio = useRef<{ a: HTMLAudioElement; url: string } | null>(null);
  const smooth = useRef<number | null>(null);

  const stopAudio = () => {
    if (audio.current) { audio.current.a.pause(); URL.revokeObjectURL(audio.current.url); audio.current = null; }
    setPlaying(false);
  };
  useEffect(() => () => { session.current?.cancel(); stopAudio(); }, []);

  const start = async () => {
    stopAudio();
    setSent('no');
    try {
      smooth.current = null;
      session.current = await startSinging(m => {
        // a light smoothing so the needle doesn't shiver; a gap in the voice clears it
        smooth.current = m === null ? null : smooth.current === null || Math.abs(m - smooth.current) > 1 ? m : smooth.current * 0.6 + m * 0.4;
        setMidi(smooth.current);
      });
      setState({ kind: 'on', started: Date.now() });
    } catch {
      setState({ kind: 'error', text: 'მიკროფონი ვერ ჩაირთო. ნება მიეცი ბრაუზერს და სცადე თავიდან.' });
    }
  };
  const stop = useCallback(async () => {
    const s = session.current;
    session.current = null;
    setMidi(null);
    if (!s) return;
    const take = await s.stop();
    setState({ kind: 'take', mp3: take.mp3, seconds: take.seconds });
  }, []);

  useEffect(() => {
    if (state.kind !== 'on') return;
    const t = window.setInterval(() => {
      const s = (Date.now() - state.started) / 1000;
      setSecs(s);
      if (s >= MAX_TAKE_SECONDS) void stop();
    }, 250);
    return () => window.clearInterval(t);
  }, [state, stop]);

  const play = () => {
    if (state.kind !== 'take' || !state.mp3) return;
    if (playing) { stopAudio(); return; }
    const url = URL.createObjectURL(state.mp3);
    const a = new Audio(url);
    a.onended = stopAudio;
    audio.current = { a, url };
    setPlaying(true);
    a.play().catch(stopAudio);
  };
  const send = async () => {
    if (state.kind !== 'take' || !state.mp3 || !user) return;
    setSent('busy');
    try { await saveDrillTake(user.uid, drillId, state.mp3, state.seconds); setSent('yes'); } catch { setSent('fail'); }
  };

  /** back to „off“: the take is dropped (a new one may start) */
  const reset = () => { session.current?.cancel(); session.current = null; setMidi(null); stopAudio(); setState({ kind: 'off' }); setSent('no'); };
  return { user, state, setState, midi, secs, playing, sent, setSent, start, stop, play, send, stopAudio, reset };
};
