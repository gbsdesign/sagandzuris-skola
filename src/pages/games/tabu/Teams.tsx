import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BellRing, Check, ChevronRight, Flag, Play, RotateCcw, SkipForward, Timer, Trophy } from 'lucide-react';
import { TABU_CARDS } from '../../../data/tabuCards';
import {
  TABU_SECONDS, TABU_TARGETS, cycleMark, newTabuTable, parseTabuTable, playTurn, tabuScores, tabuWinner, turnPoints,
  type TabuMark, type TabuTable,
} from '../../../utils/tabu';
import { buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, Toggle, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { ThemeChip, ThemePicker } from './parts';

// „ნუ იტყვი!“ in a class (the hub's „ჰიბრიდული“, 2026-11-01, like Taboo): the phone is in the explainer's hand. The card shows
// the word and five words that may not be said; the team guesses, „გამოიცნო“ is a point, a forbidden word — „აკრძალა“ (a
// watcher of the other team looks over the shoulder) — takes one, „გამოტოვება“ costs one if the class plays so. The turn's
// end rings; the explainer mends a slip in the list, the phone goes to the next team. Rules: utils/tabu.ts; the game is kept
// on this phone after every turn, ✕ only pauses.

const GAME_KEY = 'sg-tabu-teams';
const CONF_KEY = 'sg-tabu-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const card = (id: number | undefined) => TABU_CARDS.find(c => c.id === id);

interface Conf extends TeamsConf { seconds: number; target: number; skipCost: boolean; themes: string[] }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    seconds: TABU_SECONDS.includes(o.seconds as number) ? o.seconds! : TABU_SECONDS[0],
    target: TABU_TARGETS.includes(o.target as number) ? o.target! : TABU_TARGETS[1],
    skipCost: o.skipCost !== false,
    themes: Array.isArray(o.themes) ? o.themes.filter(t => TABU_CARDS.some(c => c.theme === t)) : [],
  };
};
const MARK: Record<TabuMark, { label: string; Icon: typeof Check; tone: string; text: string }> = {
  ok: { label: 'გამოიცნო', Icon: Check, tone: 'bg-[#2f7d4f]/10', text: 'text-[#2f7d4f]' },
  skip: { label: 'გამოტოვება', Icon: SkipForward, tone: 'bg-[#8a4a2a]/10', text: 'text-[#8a4a2a]' },
  taboo: { label: 'აკრძალა', Icon: BellRing, tone: 'bg-[#b23a48]/10', text: 'text-[#b23a48]' },
};
/** how many of each mark: ✓ 3 · ⏭ 1 · 🔔 0 */
const Counts: React.FC<{ marks: { m: TabuMark }[] }> = ({ marks }) => (
  <p className="flex items-center gap-3 text-[14px] font-bold tabular-nums">
    {(['ok', 'skip', 'taboo'] as const).map(k => {
      const { Icon, text, label } = MARK[k];
      return <span key={k} className={`inline-flex items-center gap-1 ${text}`} aria-label={label}><Icon className="w-4 h-4" aria-hidden="true" />{marks.filter(x => x.m === k).length}</span>;
    })}
  </p>
);

type Phase = 'ready' | 'play' | 'review' | 'board';

const TeamsGame: React.FC<{ g: TabuTable; setG: (g: TabuTable) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const n = g.names.length;
  const scores = tabuScores(g.turns, n, g.skipCost);
  const winner = tabuWinner(g.turns, n, g.target, g.skipCost);
  const team = g.turns.length % n;
  const [phase, setPhase] = useState<Phase>(g.turns.length ? 'board' : 'ready');
  const [marks, setMarks] = useState<{ card: number; m: TabuMark }[]>([]);
  const [t0, setT0] = useState(0);
  const onCard = card(g.deck[(g.at + marks.length) % g.deck.length]);

  const left = useTurnClock(audio, t0, g.seconds, phase === 'play', () => { triggerHaptic(150); setPhase('review'); });
  const go = () => {
    openAudio(audio);
    triggerHaptic(20);
    setMarks([]);
    setT0(Date.now());
    setPhase('play');
  };
  const mark = (m: TabuMark) => {
    if (phase !== 'play' || !onCard) return;
    if (m === 'ok') { chime(audio.current, 1); triggerHaptic(15); }
    else if (m === 'taboo') { buzz(audio.current); triggerHaptic(60); }
    else triggerHaptic(8);
    setMarks(ms => [...ms, { card: onCard.id, m }]);
  };
  const confirm = () => {
    triggerHaptic(10);
    const next = playTurn(g, { team, marks });
    setG(next);
    setMarks([]);
    setPhase('board');
  };
  const close = async () => {
    if (phase === 'play' || (phase === 'review' && marks.length)) {
      if (!(await askConfirm({ title: 'სვლა შეწყდეს?', text: 'ამ სვლის ბარათები არ ჩაითვლება — ეს გუნდი თავიდან დაიწყებს.', ok: 'შეწყვეტა' }))) return;
    }
    onClose();
  };

  const turnPts = turnPoints({ team, marks }, g.skipCost);
  const round = Math.floor(g.turns.length / n) + 1;
  const last = g.turns[g.turns.length - 1];
  const gained = last ? g.names.map((_, t) => (t === last.team ? Math.max(0, turnPoints(last, g.skipCost)) : 0)) : null;

  if (winner !== null && phase === 'board') {
    return (
      <TableScreen
        title="ნუ იტყვი! · შედეგები"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4">
          <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" aria-hidden="true" />
          <Podium names={g.names} scores={scores} />
          <p className="text-center text-[15px] font-bold text-[#4a3426]">გაიმარჯვა „{g.names[winner]}“-მა · {round - 1} წრე</p>
          <Standings names={g.names} scores={scores} />
        </div>
      </TableScreen>
    );
  }

  const footer =
    phase === 'ready' ? <Btn size="lg" full icon={<Play />} onClick={go} className="!h-14 !text-[16px]">წავედით!</Btn>
    : phase === 'play' ? (
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => mark('taboo')} className="h-16 rounded-2xl bg-white ring-2 ring-[#b23a48]/50 text-[#b23a48] font-bold text-[13.5px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] cursor-pointer">
          <BellRing className="w-6 h-6" /> აკრძალა
        </button>
        <button type="button" onClick={() => mark('skip')} className="h-16 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#8a4a2a] font-bold text-[13.5px] flex flex-col items-center justify-center gap-0.5 active:scale-[0.97] cursor-pointer">
          <SkipForward className="w-6 h-6" /> გამოტოვება
        </button>
        <button type="button" onClick={() => mark('ok')} className="h-16 rounded-2xl bg-[#2f7d4f] text-white font-bold text-[14.5px] flex flex-col items-center justify-center gap-0.5 shadow-[0_6px_16px_-8px_rgba(47,125,79,0.9)] active:scale-[0.97] cursor-pointer">
          <Check className="w-6 h-6" /> გამოიცნო
        </button>
      </div>
    )
    : phase === 'review' ? <Btn size="lg" full icon={<Check />} onClick={confirm} className="!h-14 !text-[15.5px]">დადასტურება · {turnPts} ქულა</Btn>
    : <Btn size="lg" full icon={<ChevronRight />} onClick={() => { triggerHaptic(10); setPhase('ready'); }} className="!h-14 !text-[15.5px]">შემდეგი: {g.names[team]}</Btn>;

  return (
    <TableScreen
      title={`ნუ იტყვი! · ${phase === 'board' ? `წრე ${round}` : g.names[team]}`}
      onClose={() => { void close(); }}
      right={<span className="px-1 text-[12px] tabular-nums text-[#9a8b7b]">{g.target} ქულამდე</span>}
      footer={footer}
    >
      {phase === 'ready' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ჯერია</p>
          <p className="font-serif-ge text-[36px] font-bold leading-tight break-words max-w-full" style={{ color: TEAM_TINT[team] }}>{g.names[team]}</p>
          <p className="text-[13px] tabular-nums text-[#75685a]">ქულა: {scores[team]} · წრე {round}</p>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-[#75685a]">
            ამხსნელმა აიღოს ტელეფონი; მეორე გუნდიდან ერთი გვერდით დადგეს და ბარათს უყუროს — აკრძალულ სიტყვაზე „აკრძალა“-ს
            დააჭერს. სიტყვას და მის ნაწილს ვერც ამხსნელი იტყვის. {g.seconds} წამის ბოლოს ზარი დარეკავს.
          </p>
        </div>
      )}

      {phase === 'play' && onCard && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <TimerRing left={left} total={g.seconds} size="sm" />
            <div className="min-w-0 flex-1">
              <ThemeChip theme={onCard.theme} />
              <div className="mt-1.5"><Counts marks={marks} /></div>
            </div>
          </div>
          <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] shadow-[0_1px_2px_rgba(74,52,38,0.05)] overflow-hidden">
            <p className="px-5 py-6 font-serif-ge text-[34px] sm:text-[40px] lg:text-[48px] font-bold leading-tight text-center text-[#4a3426] break-words">{onCard.w}</p>
            <div className="bg-[#b23a48]/[0.07] border-t border-[#b23a48]/15 px-5 py-3.5 text-center">
              <p className="text-[12.5px] font-bold text-[#b23a48]">ნუ იტყვი:</p>
              <ul className="mt-1 grid grid-cols-1 gap-0.5">
                {onCard.no.map(w => <li key={w} className="text-[20px] lg:text-[24px] font-bold leading-snug text-[#7a2028]">{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <div className="text-center">
            <p className="text-[13px] font-bold text-[#9a8b7b]">დრო ამოიწურა</p>
            <p className="font-serif-ge text-[28px] font-bold leading-tight" style={{ color: TEAM_TINT[team] }}>{g.names[team]}: {turnPts} ქულა</p>
            <p className="mt-1 text-[12.5px] text-[#9a8b7b]">შეცდომით დააჭირე? შეეხე სიტყვას და შეიცვლება.</p>
          </div>
          {marks.length ? (
            <ul className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden divide-y divide-[#f1e8d9]">
              {marks.map((x, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(5); setMarks(ms => ms.map((y, j) => (j === i ? { ...y, m: cycleMark(y.m) } : y))); }}
                    className="w-full flex items-center gap-3 px-3 min-h-12 py-2 text-left cursor-pointer hover:bg-[#fbf6ec]"
                  >
                    <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${MARK[x.m].tone} ${MARK[x.m].text}`} aria-hidden="true">{React.createElement(MARK[x.m].Icon, { className: 'w-4 h-4' })}</span>
                    <span className="min-w-0 flex-1 text-[15px] text-[#4a3426]">{card(x.card)?.w}</span>
                    <span className={`shrink-0 text-[12.5px] font-bold ${MARK[x.m].text}`}>{MARK[x.m].label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-center text-[13px] text-[#9a8b7b]">ამ სვლაში ბარათი არ გადაბრუნებულა.</p>}
        </div>
      )}

      {phase === 'board' && (
        <div className="flex-1 flex flex-col gap-3 py-2 w-full max-w-2xl mx-auto">
          <Standings names={g.names} scores={scores} gained={gained} />
          <p className="text-center text-[12.5px] leading-snug text-[#9a8b7b]">
            {g.target} ქულამდე; როცა გუნდი მიზანს მიაღწევს, წრე ბოლომდე მიდის — ყველას თანაბარი სვლა აქვს.
            {g.skipCost ? ' გამოტოვება ერთი ქულა ღირს.' : ''}
          </p>
        </div>
      )}
    </TableScreen>
  );
};

export const TabuTeams: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<TabuTable | null>(() => {
    const g = parseTabuTable(load(GAME_KEY));
    return g && tabuWinner(g.turns, g.names.length, g.target, g.skipCost) === null ? g : null;
  });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: TabuTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const deal = (names: string[], c: Conf) =>
    newTabuTable(names, { seconds: c.seconds, target: c.target, skipCost: c.skipCost }, Math.random, TABU_CARDS.filter(x => !c.themes.length || c.themes.includes(x.theme)));
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, seconds: game.seconds, target: game.target, skipCost: game.skipCost })); };
  const size = TABU_CARDS.filter(x => !conf.themes.length || conf.themes.includes(x.theme)).length;

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const paused = game ? tabuScores(game.turns, game.names.length, game.skipCost) : [];
  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · {game.target} ქულამდე</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((nm, t) => `${nm} ${paused[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> სვლის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="სვლის დრო">
            {TABU_SECONDS.map(s => <Chip key={s} on={conf.seconds === s} onClick={() => setConf({ ...conf, seconds: s })}>{s === 60 ? '1 წუთი' : s === 120 ? '2 წუთი' : `${s} წამი`}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Flag className="w-4 h-4 text-[#7a2028]" /> მიზანი</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="მიზანი">
            {TABU_TARGETS.map(t => <Chip key={t} on={conf.target === t} onClick={() => setConf({ ...conf, target: t })}>{t} ქულა</Chip>)}
          </div>
        </div>
        <Toggle on={conf.skipCost} onChange={v => setConf({ ...conf, skipCost: v })} label="გამოტოვება ერთი ქულა ღირს" />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">თემები · {size} ბარათი</p>
          <ThemePicker value={conf.themes} onChange={t => setConf({ ...conf, themes: t })} />
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      <Hint>
        კლასი გუნდებად იყოფა. რიგრიგობით თითო გუნდიდან ერთი ხსნის: ტელეფონი სიტყვას აჩვენებს და ხუთ სიტყვას, რომელიც არ უნდა
        თქვას. გუნდი გამოიცნობს — ქულა; აკრძალული სიტყვა თქვა — მეორე გუნდის „მეთვალყურე“ ზარს რეკავს და ქულა აკლდება. დრო რომ
        ამოიწურება, ტელეფონი შემდეგ გუნდს გადაეცემა. ხელით, ჟესტით ან ნაწილით სიტყვის თქმა არ შეიძლება.
      </Hint>
    </div>
  );
};
