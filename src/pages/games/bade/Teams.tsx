import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag, Grid3x3, ListChecks, Play, RotateCcw, Timer, Trophy, Undo2, X } from 'lucide-react';
import { BADE_THEMES } from '../../../data/badeThemes';
import { LEVELS, LEVEL_IDS, indexCells, isLevel, randomGrid, wordOnLine, type BadeGrid as Grid, type LevelId } from '../../../utils/bade';
import {
  BADE_GRIDS, BADE_MINUTES, NOBODY, badeFind, badeMissed, badeNext, badePause, badeResume, badeStart, badeTime, badeUndo, newBadeTeams, parseBadeTeams,
  type BadeTeams,
} from '../../../utils/badeTeams';
import { SCRIPT_BY, isScript, toScript, type Script } from '../../../utils/oldScripts';
import { bell, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { BadeGrid, type Mark } from './Grid';
import { AlphabetKey, ScriptChips, WordList } from './parts';
import { HowTo } from '../../../components/games/HowTo';

// „ასოების ბადე“ on one phone (the plan's hybrid, 2026-11-01): the grid big on the screen or a projector, one clock for the
// grid. The teams look at once and shout what they see; the teacher draws the word on the grid (or taps it in the list) and
// taps the team that found it — a word, a point. The rules are utils/badeTeams.ts; the game is kept on this phone after every
// word, and ✕ pauses its clock.

const GAME_KEY = 'sg-bade-teams';
const CONF_KEY = 'sg-bade-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { level: LevelId; script: Script; minutes: number; grids: number; list: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    level: isLevel(o.level) ? o.level : 'mid',
    script: isScript(o.script) ? o.script : 'mkhedruli',
    minutes: BADE_MINUTES.includes(o.minutes as typeof BADE_MINUTES[number]) ? o.minutes! : 3,
    grids: BADE_GRIDS.includes(o.grids as typeof BADE_GRIDS[number]) ? o.grids! : 1,
    list: o.list !== false,
  };
};

const freshGrid = (level: LevelId, used: string[]): Grid | undefined => randomGrid(BADE_THEMES, level, Math.floor(Math.random() * 2 ** 31), used);

const MISSED_TINT = '#9a8b7b';

const TeamsGame: React.FC<{ g: BadeTeams; setG: (g: BadeTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  // the clock goes on when the screen opens and stops when it closes
  const latest = useRef(g);
  latest.current = g;
  useEffect(() => { setG(badeResume(latest.current, Date.now())); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { setG(badePause(latest.current, Date.now())); onClose(); };

  const playing = g.phase === 'play';
  const left = useTurnClock(audio, badeStart(g), g.secs, playing && g.t0 > 0, () => setG(badeTime(latest.current, Date.now())));

  // a word drawn or tapped waits for the team that found it
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => { setPending(null); }, [g.at, g.phase]);
  const { grid } = g;
  const cellsOf = (i: number) => indexCells(grid.placed[i], grid.size);

  const onLine = (cells: number[]) => {
    const i = wordOnLine(grid, cells);
    if (i < 0) return false;
    if (g.owner[i] === NOBODY) setPending(i);
    return true;
  };
  const give = (team: number) => {
    if (pending === null) return;
    triggerHaptic(20);
    const after = badeFind(g, pending, team, Date.now());
    if (after.phase !== 'play') bell(audio.current); // the last word: the grid is done before its time
    setG(after);
    setPending(null);
  };
  const endGrid = async () => {
    if (await askConfirm({ title: 'ბადე დასრულდეს?', text: 'ვერნაპოვნი სიტყვები გამოჩნდება.', ok: 'დასრულება' })) setG(badeTime(latest.current, Date.now()));
  };
  const next = () => setG(badeNext(g, freshGrid(g.level, g.used), Date.now()));

  const letters = grid.cells.map(c => toScript(c, g.script));
  const marks: Mark[] = grid.placed.flatMap((p, i) => {
    const who = g.owner[i];
    if (who !== NOBODY) return [{ cells: cellsOf(i), color: TEAM_TINT[who] }];
    return g.phase !== 'play' ? [{ cells: cellsOf(i), color: MISSED_TINT, dashed: true }] : [];
  });
  const items = grid.placed.map((p, i) => {
    const who = g.owner[i];
    return { word: p.word, color: who !== NOBODY ? TEAM_TINT[who] : undefined, who: who !== NOBODY ? g.names[who] : undefined, missed: g.phase !== 'play' && who === NOBODY };
  });
  const shownItems = g.list || g.phase !== 'play' ? items : items.filter(it => it.color);
  const leftWords = g.owner.filter(o => o === NOBODY).length;

  if (g.phase === 'over') {
    return (
      <TableScreen
        title="ასოების ბადე · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4">
          <Podium names={g.names} scores={g.scores} />
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  const footer = pending !== null ? (
    <div className="space-y-2">
      <p className="text-center text-[15px] font-bold text-[#4a3426]">ვინ იპოვა „{grid.placed[pending].word}“?</p>
      <div className={`grid gap-2 ${g.names.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {g.names.map((n, t) => (
          <button
            key={t}
            type="button"
            onClick={() => give(t)}
            className="h-14 rounded-2xl px-2 text-[15px] font-bold text-white truncate cursor-pointer active:scale-[0.97] transition shadow-[0_2px_6px_rgba(74,52,38,0.25)]"
            style={{ background: TEAM_TINT[t] }}
          >
            {n}
          </button>
        ))}
      </div>
      <Btn kind="ghost" full icon={<X />} onClick={() => setPending(null)}>არავის</Btn>
    </div>
  ) : g.phase === 'grid' ? (
    <Btn size="lg" full icon={g.at + 1 >= g.count ? <Trophy /> : <Play />} onClick={next} className="!h-14 !text-[15.5px]">
      {g.at + 1 >= g.count ? 'შედეგები' : 'შემდეგი ბადე'}
    </Btn>
  ) : (
    <div className="flex gap-2">
      <Btn kind="ghost" full icon={<Undo2 />} disabled={!g.last} onClick={() => setG(badeUndo(g))}>უკან</Btn>
      <Btn kind="ghost" full icon={<Flag />} onClick={() => { void endGrid(); }}>დასრულება</Btn>
    </div>
  );

  return (
    <TableScreen
      title={`ასოების ბადე · ${g.at + 1}/${g.count}`}
      onClose={close}
      footer={footer}
    >
      {/* a phone: the teams, the theme, the grid, the words; a wide screen (a projector): the grid tall on the left */}
      <div className="py-2 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6 lg:gap-y-3 lg:items-start">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1">
          <TeamChips names={g.names} scores={g.scores} />
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[16px] font-bold leading-snug text-[#4a3426]">
              თემა: {grid.theme.title}
              <span className="block text-[13.5px] font-normal text-[#75685a]">{playing ? `დარჩა ${leftWords} სიტყვა` : badeMissed(g) ? `ვერ იპოვეთ ${badeMissed(g)}` : 'ყველა ნაპოვნია!'}</span>
            </p>
            {playing && <TimerRing left={left} total={g.secs} size="sm" />}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[min(100%,max(320px,calc(100dvh-250px)))] lg:mx-0 lg:max-w-none lg:w-[min(calc(100dvh-150px),56vw)] lg:col-start-1 lg:row-start-1 lg:row-span-2">
          <BadeGrid
            size={grid.size}
            letters={letters}
            marks={marks}
            onLine={playing ? onLine : undefined}
            flash={pending !== null ? cellsOf(pending) : null}
            label={`ასოების ბადე, თემა: ${grid.theme.title}`}
          />
        </div>
        <div className="min-w-0 space-y-3 lg:col-start-2 lg:row-start-2">
          {g.phase === 'grid' && <p className="font-serif-ge text-[18px] font-bold text-[#7a2028]">{leftWords ? `ბადე ${g.at + 1} დასრულდა` : `ბადე ${g.at + 1} ამოხსნილია!`}</p>}
          {shownItems.length > 0 && <WordList items={shownItems} onPick={playing ? i => setPending(grid.placed.findIndex(p => p.word === shownItems[i].word)) : undefined} picked={pending !== null ? shownItems.findIndex(it => it.word === grid.placed[pending].word) : null} />}
          {g.phase === 'grid' && <Standings names={g.names} scores={g.scores} />}
          <AlphabetKey script={g.script} />
        </div>
      </div>
    </TableScreen>
  );
};

export const BadeTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<BadeTeams | null>(() => { const g = parseBadeTeams(load(GAME_KEY)); return g && g.phase !== 'over' ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: BadeTeams | null) => { setGameState(g); save(GAME_KEY, g && g.phase !== 'over' ? g : null); }, []);

  const deal = (names: string[], c: Conf) => {
    const grid = freshGrid(c.level, []);
    return grid ? newBadeTeams(names, c.grids, c.level, c.script, c.list, c.minutes * 60, grid, Date.now()) : null;
  };
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const g = deal(teamNames(conf), conf);
    if (!g) return;
    triggerHaptic(10);
    setGame(g);
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, level: game.level, script: game.script, list: game.list, minutes: game.secs / 60, grids: game.count })); };

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: ბადე {game.at + 1}/{game.count}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((n, t) => `${n} ${game.scores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="bade-table" steps={[
        'ტელეფონი ან ეკრანი მთელ კლასს ბადეს უჩვენებს და დროს ითვლის.',
        'გუნდები ერთდროულად ეძებენ და ნაპოვნ სიტყვას ხმამაღლა ამბობენ.',
        'მასწავლებელი სიტყვას ბადეზე თითით ხაზავს (ან სიაში აჭერს) და ირჩევს, რომელმა გუნდმა იპოვა. სიტყვა ერთი ქულაა.',
        '„მხოლოდ თემა“ უფრო რთულია: სიტყვები არ ჩანს, მხოლოდ თემა და რაოდენობა.',
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Grid3x3 className="w-4 h-4 text-[#7a2028]" /> ბადე</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სიძნელე">
            {LEVEL_IDS.map(l => <Chip key={l} on={conf.level === l} onClick={() => setConf({ ...conf, level: l })}>{LEVELS[l].label}</Chip>)}
          </div>
          <p className="text-[12.5px] text-[#75685a]">{LEVELS[conf.level].note}, {LEVELS[conf.level].words} სიტყვა</p>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">დამწერლობა</p>
          <ScriptChips value={conf.script} onChange={s => setConf({ ...conf, script: s })} />
          {conf.script !== 'mkhedruli' && <p className="text-[12.5px] leading-snug text-[#75685a]">ბადე {SCRIPT_BY[conf.script]}, სიტყვები მხედრულად — ეკრანზე ანბანის გასაღებიც ჩანს.</p>}
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> დრო ბადეზე</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="დრო ბადეზე">
            {BADE_MINUTES.map(m => <Chip key={m} on={conf.minutes === m} onClick={() => setConf({ ...conf, minutes: m })}>{m} წუთი</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ბადეები</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ბადეები">
            {BADE_GRIDS.map(n => <Chip key={n} on={conf.grids === n} onClick={() => setConf({ ...conf, grids: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-[#7a2028]" /> სიტყვების სია</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სიტყვების სია">
            <Chip on={conf.list} onClick={() => setConf({ ...conf, list: true })}>ჩანს</Chip>
            <Chip on={!conf.list} onClick={() => setConf({ ...conf, list: false })}>მხოლოდ თემა</Chip>
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
    </div>
  );
};
