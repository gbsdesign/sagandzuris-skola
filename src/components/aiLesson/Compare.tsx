import React, { useEffect, useRef, useState } from 'react';
import { Lightbulb, Mic, Pause, Play } from 'lucide-react';
import { playLessonNotes, stopLessonNotes } from '../../utils/chantSynth';
import { Button, Card, Helper, RoundButton } from '../ui2';
import { Bottom } from './parts';
import { LiveRoll, type RollMark, type RollNote } from './LiveRoll';

// „შენ ასე — უნდა ასე“ (board x-ai-shenase): after a try that did not pass, my try and the phrase side by side, each to
// hear — „შენ“ = my own take (its recording; without one, the notes I sang on the synthesizer), „უნდა“ = my voice's
// stretch on the synthesizer at the try's pace — one line on where they differ, and „კიდევ ვცდი“ back to the step.

export interface CompareLane { marks: RollMark[]; devs?: (number | null)[] }

export const CompareView: React.FC<{
  notes: RollNote[];
  mine: CompareLane;
  want: CompareLane;
  /** the difference in one sentence (utils/aiLesson diffLine) */
  line: string;
  /** my try's recording, if the phone made one */
  mp3: Blob | null;
  /** without a recording: the notes I sang, [start s, length s, MIDI] as it sounds */
  sung?: [number, number, number][];
  /** „უნდა“: my voice's stretch on the synthesizer; `wantPlaying` while it sounds */
  onWant: () => void;
  stopWant: () => void;
  wantPlaying: boolean;
  /** where the synthesizer is, seconds from the phrase's start */
  playhead?: number | null;
  onAgain: () => void;
}> = ({ notes, mine, want, line, mp3, sung, onWant, stopWant, wantPlaying, playhead, onAgain }) => {
  const [mePlaying, setMePlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!mp3) return;
    const url = URL.createObjectURL(mp3);
    const a = new Audio(url);
    a.onended = () => setMePlaying(false);
    a.onpause = () => setMePlaying(false);
    audio.current = a;
    return () => { a.pause(); audio.current = null; URL.revokeObjectURL(url); };
  }, [mp3]);
  useEffect(() => () => { window.clearTimeout(timer.current); stopLessonNotes(); }, []);

  const stopMe = () => {
    audio.current?.pause();
    window.clearTimeout(timer.current);
    stopLessonNotes();
    setMePlaying(false);
  };
  const playMe = () => {
    if (mePlaying) { stopMe(); return; }
    stopWant();
    const a = audio.current;
    if (a) {
      a.currentTime = 0;
      void a.play().then(() => setMePlaying(true), () => setMePlaying(false));
      return;
    }
    if (!sung?.length) return;
    setMePlaying(true);
    void playLessonNotes(sung).catch(() => undefined);
    const end = Math.max(...sung.map(([t, d]) => t + d));
    timer.current = window.setTimeout(() => setMePlaying(false), end * 1000 + 300);
  };
  const playWant = () => { if (!wantPlaying) stopMe(); onWant(); };

  return (
    <>
      <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
        <LaneCard who="შენ" playing={mePlaying} disabled={!mp3 && !sung?.length} onPlay={playMe}>
          <LiveRoll notes={notes} marks={mine.marks} devs={mine.devs} height={104} />
        </LaneCard>
        <LaneCard who="უნდა" playing={wantPlaying} onPlay={playWant}>
          <LiveRoll notes={notes} marks={want.marks} height={104} playhead={wantPlaying ? playhead : null} />
        </LaneCard>
        {line && <Helper icon={<Lightbulb />}>{line}</Helper>}
      </div>
      <Bottom>
        <Button full icon={<Mic />} onClick={() => { stopMe(); stopWant(); onAgain(); }}>კიდევ ვცდი</Button>
      </Bottom>
    </>
  );
};

const LaneCard: React.FC<{ who: string; playing: boolean; disabled?: boolean; onPlay: () => void; children: React.ReactNode }> = ({
  who, playing, disabled, onPlay, children,
}) => (
  <Card pad="none" className="px-4 pt-3.5 pb-4">
    <div className="mb-2.5 flex items-center gap-3">
      <RoundButton label={`${who} — ${playing ? 'შეჩერება' : 'მოსმენა'}`} tone="wine" disabled={disabled} onClick={onPlay}>
        {playing ? <Pause fill="currentColor" /> : <Play />}
      </RoundButton>
      <span className="text-lead font-bold">{who}</span>
    </div>
    {children}
  </Card>
);
