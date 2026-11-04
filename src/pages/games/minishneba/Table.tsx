import React, { useCallback, useState } from 'react';
import { Eye, Flag, Play, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { TABU_CARDS, TABU_THEMES } from '../../../data/tabuCards';
import {
  JO_CARDS, MAX_PLAYERS, MIN_PLAYERS, giversOf, guessTable, guesserOf, joScore, joVerdict, mendGuess, newJoTable, nextTableCard, notesOf,
  openWord, parseJoTable, strikeClue, tableOver, writeClue, type JoTable,
} from '../../../utils/minishneba';
import { shuffle } from '../../../utils/otkheuli';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { ThemeChip, ThemePicker, WordField } from '../tabu/parts';
import { JoDots, Notes, RESULT_TEXT, Verdict, type Note } from './parts';
import { HowTo } from '../../../components/games/HowTo';

// „ერთი მინიშნება“ round one phone (the hub's „ჰიბრიდული“, 2026-11-01, like Just One): in turn one player guesses, the others
// get the phone one by one, see the word and write one clue in secret. The same clues — and a clue holding the word — are
// struck by the phone before the guesser sees what is left; one try. Thirteen cards; the class plays together against the
// deck. Rules: utils/minishneba.ts; kept on this phone after every step (`sg-minishneba-table`), ✕ only pauses.

const GAME_KEY = 'sg-minishneba-table';
const THEMES_KEY = 'sg-minishneba-themes';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const cardOf = (g: JoTable, i = g.at) => TABU_CARDS.find(c => c.id === g.deck[i]);
const readThemes = (): string[] => { const v = load(THEMES_KEY); return Array.isArray(v) ? v.filter((x): x is string => TABU_THEMES.some(t => t.id === x)) : []; };

const Big: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = 'text-[#7a2028]' }) => (
  <p className={`font-serif-ge text-[34px] lg:text-[46px] font-bold leading-tight text-center break-words max-w-full ${tone}`}>{children}</p>
);

const TableGame: React.FC<{ g: JoTable; setG: (g: JoTable) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const wide = useWide();
  // once all have written: the givers look the clues over, then the guesser takes the phone (not kept: a reload starts the check again)
  const [step, setStep] = useState<'check' | 'hand' | 'guess'>('check');
  const card = cardOf(g);
  const guesser = guesserOf(g);
  const givers = giversOf(g);
  const score = joScore(g);
  const notes: Note[] = notesOf(g).map(n => ({ text: n.text, fate: n.fate, who: g.names[n.seat] }));

  if (tableOver(g)) {
    return (
      <TableScreen
        title="ერთი მინიშნება · შედეგი"
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-4 py-4 text-center">
          <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" aria-hidden="true" />
          <Big>{score}/{g.deck.length}</Big>
          <p className="text-[16px] font-bold text-[#4a3426]">{joVerdict(score)}</p>
          <div className="flex justify-center"><JoDots res={g.res} n={g.deck.length} /></div>
          <ul className="mx-auto max-w-sm text-left space-y-1">
            {g.deck.map((_, i) => {
              const r = g.res[i];
              return (
                <li key={i} className="flex items-center gap-2 text-[14px] text-[#4a3426]">
                  <span className="w-6 text-right tabular-nums text-[#9a8b7b]">{i + 1}</span>
                  <b className="min-w-0 flex-1">{cardOf(g, i)?.w}</b>
                  <span className="text-[12px] text-[#9a8b7b]">{g.names[i % g.names.length]}</span>
                  <span className={`w-20 text-right text-[12.5px] font-bold ${r === 'right' ? 'text-[#2f7d4f]' : r === 'wrong' ? 'text-[#b23a48]' : 'text-[#9a8b7b]'}`}>{r ? RESULT_TEXT[r] : ''}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </TableScreen>
    );
  }

  const head = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <JoDots res={g.res} n={g.deck.length} at={g.at} />
      <span className="text-[13px] font-bold text-[#75685a]">გამოიცნობს: <span className="text-[#7a2028]">{g.names[guesser]}</span></span>
    </div>
  );
  const written = givers.filter(s => g.clues[s].trim()).length;

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  if (g.phase === 'pass') {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
        <p className="text-[13px] font-bold text-[#9a8b7b]">გადაეცი ტელეფონი</p>
        <Big>{g.names[g.giver]}</Big>
        <p className="max-w-sm text-[14px] leading-relaxed text-[#75685a]">
          {g.names[guesser]} ეკრანს არ უყურებს! დაწერილია {written}/{givers.length}.
        </p>
      </div>
    );
    footer = <Btn size="lg" full icon={<Eye />} onClick={() => { triggerHaptic(10); setG(openWord(g)); }} className="!h-14 !text-[15.5px]">მე ვარ {g.names[g.giver]} — სიტყვის ნახვა</Btn>;
  } else if (g.phase === 'write' && card) {
    body = (
      <div className="flex-1 flex flex-col gap-4 py-3">
        <div className="text-center space-y-2">
          <ThemeChip theme={card.theme} />
          <Big tone="text-[#4a3426]">{card.w}</Big>
          <p className="text-[14px] leading-snug text-[#75685a]">
            <b className="text-[#7a2028]">{g.names[g.giver]}</b>, დაწერე ერთი სიტყვა-მინიშნება — გამოიცნობს {g.names[guesser]}. ვინც
            სხვასავით დაწერს, ორივე წაიშლება: იფიქრე თავისებურად!
          </p>
        </div>
        <WordField key={`${g.at}-${g.giver}`} placeholder="შენი მინიშნება" enterLabel="შენახვა" max={24} onSubmit={w => { triggerHaptic(15); setG(writeClue(g, w)); }} />
      </div>
    );
  } else if (g.phase === 'guess' && step === 'check') {
    body = (
      <div className="flex-1 flex flex-col gap-3 py-2">
        <div className="text-center space-y-1">
          <p className="font-serif-ge text-[22px] font-bold text-[#7a2028]">შეამოწმეთ მინიშნებები</p>
          <p className="text-[14px] leading-snug text-[#75685a]">
            {g.names[guesser]} ჯერ არ უყურებს! ერთნაირი ან ერთი ძირის სიტყვები ტელეფონმა წაშალა; თუ რამე გამორჩა, შეეხეთ — წაიშლება
            (მეორე შეხებით ბრუნდება).
          </p>
        </div>
        {card && <p className="text-center text-[15px] text-[#4a3426]">სიტყვა: <b>{card.w}</b></p>}
        <Notes notes={notes} open big={wide} onTap={i => { triggerHaptic(8); setG(strikeClue(g, givers[i])); }} />
      </div>
    );
    footer = <Btn size="lg" full icon={<Play />} onClick={() => { triggerHaptic(10); setStep('hand'); }} className="!h-14 !text-[15.5px]">მზადაა — გადაეცით ტელეფონი</Btn>;
  } else if (g.phase === 'guess' && step === 'hand') {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
        <p className="text-[13px] font-bold text-[#9a8b7b]">გადაეცით ტელეფონი</p>
        <Big>{g.names[guesser]}</Big>
        <p className="max-w-sm text-[14px] leading-relaxed text-[#75685a]">მინიშნებები შენთვის მზადაა. ერთი ცდა გაქვს!</p>
      </div>
    );
    footer = <Btn size="lg" full icon={<Eye />} onClick={() => { triggerHaptic(10); setStep('guess'); }} className="!h-14 !text-[15.5px]">მე ვარ {g.names[guesser]} — ვნახო</Btn>;
  } else if (g.phase === 'guess') {
    body = (
      <div className="flex-1 flex flex-col gap-3 py-2">
        <div className="flex items-center justify-between gap-2">
          {card && <ThemeChip theme={card.theme} big={wide} />}
          <Btn kind="ghost" size="sm" icon={<Flag />} onClick={() => { setStep('check'); setG(guessTable(g, null)); }}>არ ვიცი</Btn>
        </div>
        <Notes notes={notes} big={wide} />
        <WordField key={`guess-${g.at}`} placeholder="რა სიტყვაა? ერთი ცდა" enterLabel="გამოცნობა" onSubmit={w => { triggerHaptic(15); setStep('check'); setG(guessTable(g, w)); }} />
      </div>
    );
  } else if (g.phase === 'reveal' && card) {
    const r = g.res[g.at];
    const last = g.at + 1 >= g.deck.length;
    body = (
      <div className="flex-1 flex flex-col gap-3 py-2">
        <div className="text-center"><Big tone="text-[#4a3426]">{card.w}</Big></div>
        <Verdict res={r} word={card.w} guess={g.guess} last={last} />
        {(r === 'right' || r === 'wrong') && (
          <Btn kind="ghost" size="sm" icon={<Undo2 />} onClick={() => { triggerHaptic(10); setG(mendGuess(g)); }} className="self-center">
            {r === 'right' ? 'არა, არასწორი იყო' : 'მაინც სწორია — იგივე სიტყვაა'}
          </Btn>
        )}
        <Notes notes={notes} open big={wide} />
      </div>
    );
    footer = <Btn size="lg" full icon={<Play />} onClick={() => { triggerHaptic(10); setG(nextTableCard(g)); }} className="!h-14 !text-[15.5px]">{tableOver(nextTableCard(g)) ? 'შედეგი' : 'შემდეგი ბარათი'}</Btn>;
  }

  return (
    <TableScreen
      title={`ერთი მინიშნება · ${Math.min(g.at + 1, g.deck.length)}/${g.deck.length}`}
      onClose={onClose}
      right={<span className="px-1 text-[13px] font-bold tabular-nums text-[#2f7d4f]">✓ {score}</span>}
      footer={footer}
    >
      <div className="flex-1 flex flex-col gap-3 py-2 lg:max-w-3xl lg:mx-auto lg:w-full">
        {head}
        {body}
      </div>
    </TableScreen>
  );
};

export const MinishnebaTable: React.FC = () => {
  const names = useCircleNames();
  const [themes, setThemesState] = useState(readThemes);
  const setThemes = (t: string[]) => { setThemesState(t); save(THEMES_KEY, t); };
  const [game, setGameState] = useState<JoTable | null>(() => { const g = parseJoTable(load(GAME_KEY)); return g && !tableOver(g) ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: JoTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const deal = (players: string[]) => {
    const pool = TABU_CARDS.filter(c => !themes.length || themes.includes(c.theme));
    return newJoTable(players, shuffle(pool.map(c => c.id), Math.random).slice(0, JO_CARDS));
  };
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    const g = deal(names);
    if (!g) return;
    triggerHaptic(10);
    setGame(g);
    setOpen(true);
  };
  const again = () => { if (game) { const g = deal(game.names); if (g) setGame(g); } };

  if (open && game) return <TableGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  const few = names.length < MIN_PLAYERS;
  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · ბარათი {Math.min(game.at + 1, game.deck.length)}/{game.deck.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.join(', ')} · ქულა {joScore(game)}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="minishneba-table" steps={[
        'კლასი ერთად თამაშობს დასტის წინააღმდეგ: ცამეტი სიტყვა.',
        'რიგრიგობით ერთი გამოიცნობს და ეკრანს არ უყურებს.',
        'დანარჩენები ტელეფონს ერთმანეთს გადასცემენ: თითოეული სიტყვას ხედავს და ერთ სიტყვა-მინიშნებას წერს ისე, რომ სხვებმა არ დაინახონ.',
        'ტელეფონი ერთნაირ მინიშნებებს შლის — ამიტომ ჯობია თავისებური სიტყვა.',
        'გამომცნობს ერთი ცდა აქვს: სწორია — ქულა; არასწორი — შემდეგი ბარათიც იკარგება; „არ ვიცი“ — მხოლოდ ეს ბარათი.',
      ]} />
      <Card className="!p-4 space-y-4">
        <CircleNames hint={`${MIN_PLAYERS}–${MAX_PLAYERS} მოთამაშე, წრის რიგით: რიგრიგობით თითო გამოიცნობს, დანარჩენები მინიშნებას წერენ.`} />
        {names.length > MAX_PLAYERS && <p className="text-[12.5px] text-[#8a6d12]">ითამაშებს პირველი {MAX_PLAYERS} — დანარჩენები მომდევნო თამაშში.</p>}
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">თემები</p>
          <ThemePicker value={themes} onChange={setThemes} />
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} disabled={few} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">
        {few ? `საჭიროა ${MIN_PLAYERS} მოთამაშე მაინც` : 'დაწყება'}
      </Btn>
    </div>
  );
};
