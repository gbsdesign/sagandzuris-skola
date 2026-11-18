import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Download, Pause, Play } from 'lucide-react';
import { saveBlob } from '../../utils/chantSynth';
import { countWord } from '../../utils/aiLesson';
import { Button, Card, Duo, RoundButton, cx } from '../ui2';
import { Bottom, TeacherSays } from './parts';
import { ChoirPlayer, choirMp3, startLevels, waveOf, type ChoirParts } from './choirMix';

// „ასე ჟღერ გუნდში“ (board x-ai-gundshi), after „გალობა“: my take with the other voices, played at once; the wave shows
// how far it is; each voice's level is a slider (mine wine); „შევინახავ“ keeps the mix as an MP3, „გავაგრძელოთ“ goes on
// to the summary. Nothing here is scored.

const VOICE_NUM = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const ChoirView: React.FC<{ parts: ChoirParts; vi: number; title: string; onNext: () => void }> = ({ parts, vi, title, onNext }) => {
  const [levels, setLevels] = useState<number[]>(() => startLevels(parts, vi));
  const player = useMemo(() => new ChoirPlayer(parts, vi, startLevels(parts, vi)), [parts, vi]);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const raf = useRef(0);

  const follow = () => {
    const pos = player.position();
    setAt(pos);
    if (pos >= parts.seconds - 0.02) { player.pause(); player.seek(0); setPlaying(false); setAt(parts.seconds); return; }
    raf.current = requestAnimationFrame(follow);
  };
  const play = async () => {
    await player.play();
    setPlaying(true);
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(follow);
  };
  const toggle = () => {
    if (player.playing) { player.pause(); cancelAnimationFrame(raf.current); setPlaying(false); setAt(player.position()); return; }
    void play();
  };
  // it sounds at once — the member hears themself in the choir
  useEffect(() => {
    void play();
    return () => { cancelAnimationFrame(raf.current); player.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  const setLevel = (i: number, v: number) => setLevels(l => {
    const next = l.map((x, k) => (k === i ? v : x));
    player.setLevels(next);
    return next;
  });

  const save = async () => {
    setSaving(true); setProblem('');
    try { saveBlob(await choirMp3(parts, vi, levels), `${title} — გუნდში.mp3`); } catch (e) {
      console.warn('choir mix:', e);
      setProblem('ჩანაწერი ვერ შეინახა. კიდევ სცადე.');
    }
    setSaving(false);
  };
  const next = () => { player.pause(); cancelAnimationFrame(raf.current); onNext(); };

  const wave = useMemo(() => waveOf(parts, vi, levels), [parts, vi, levels]);
  const share = parts.seconds ? at / parts.seconds : 0;
  const others = parts.voices.length - 1;
  return (
    <>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <Card>
          <div className="flex items-center gap-3">
            <RoundButton label={playing ? 'შეჩერება' : 'მოსმენა'} size={48} tone="wine" onClick={toggle}>
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </RoundButton>
            <div aria-hidden="true" className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-[3px] overflow-hidden"
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); player.seek(((e.clientX - r.left) / r.width) * parts.seconds); setAt(player.position()); }}>
              {wave.map((h, i) => (
                <span key={i} className={cx('w-1 shrink-0 rounded-full', (i + 0.5) / wave.length <= share ? 'bg-wine' : 'bg-dim')}
                  style={{ height: `${Math.max(16, Math.round(h * 100))}%` }} />
              ))}
            </div>
          </div>
          <div className="mt-2 text-meta text-mut">
            შენი ხმა და {others === 1 ? 'მეორე ხმა' : `${countWord(others)} სხვა ხმა`} ერთად · {clock(Math.min(at, parts.seconds))} / {clock(parts.seconds)}
          </div>
        </Card>
        <TeacherSays text="ასე ჟღერ გუნდში.">ასე ჟღერ გუნდში.</TeacherSays>
        <Card pad="none" className="px-[18px] py-2">
          {levels.map((v, i) => (
            <LevelRow key={i} name={`${VOICE_NUM[i] ?? i + 1} ხმა${i === vi ? ' · შენ' : ''}`} me={i === vi} value={v} onChange={x => setLevel(i, x)} />
          ))}
        </Card>
        {problem && <p className="px-1.5 text-meta text-gold-ink">{problem}</p>}
      </div>
      <Bottom>
        <Duo>
          <Button kind="ghost" icon={<Download />} disabled={saving} onClick={save}>{saving ? 'ვამზადებ…' : 'შევინახავ'}</Button>
          {/* the arrow steps aside on a narrow phone, so the word stays whole */}
          <Button icon={<ChevronRight className="max-[379px]:hidden" />} onClick={next}>გავაგრძელოთ</Button>
        </Duo>
      </Bottom>
    </>
  );
};

/** One voice's level: its name and a bar to drag (a range field over it takes the finger and the keys). */
const LevelRow: React.FC<{ name: string; me: boolean; value: number; onChange: (v: number) => void }> = ({ name, me, value, onChange }) => (
  <label className="flex min-h-[46px] items-center gap-3">
    <span className={cx('w-24 shrink-0 text-body', me ? 'font-bold' : 'font-semibold')}>{name}</span>
    <span className="relative flex h-tap min-w-0 flex-1 items-center rounded-full has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-wine/60">
      <span aria-hidden="true" className="relative h-1.5 w-full rounded-full bg-track">
        <span className={cx('absolute inset-y-0 left-0 rounded-full', me ? 'bg-wine' : 'bg-mut')} style={{ width: `${value * 100}%` }} />
        <span className={cx('absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full', me ? 'bg-wine' : 'bg-mut')} style={{ left: `${value * 100}%` }} />
      </span>
      <input type="range" min={0} max={100} step={1} value={Math.round(value * 100)} aria-label={`${name} — ხმის სიძლიერე`}
        onChange={e => onChange(Number(e.target.value) / 100)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
    </span>
  </label>
);
