import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Eye, Footprints, Play, Printer, RotateCcw, Users } from 'lucide-react';
import { TSINAPARI_STORIES, tsinapariStory } from '../../../data/tsinapariStories';
import {
  LETTERS, choiceOrder, newTable, parseTable, rightCount, starsOf, tableNext, tableOver, tablePick, tablePlaces, tableReveal, type PathStory, type PathTable,
} from '../../../utils/tsinapari';
import { triggerHaptic } from '../../../utils/haptics';
import { Chip } from '../../../components/games/Chip';
import { TableScreen } from '../../../components/games/TableScreen';
import { KitButton } from '../../../components/games/KitButton';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { Podium } from '../rounds/parts';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, type TeamsConf } from '../rounds/teams';
import { Stars } from '../tsikhe/parts';
import { AMBER, FactBox, ForkDots, ForkHead, GREEN, Medallion, RealPath, UNCHECKED, WayButton, waysOf } from './parts';

// „წინაპრის გზა“ with the class (the hub's „ჰიბრიდული“, 2026-11-01): the host reads a fork from the phone, every team holds up
// one of its printed letter cards ა ბ გ at once, the host taps each team's letter — or, the whole class as one, the letter
// most hands went up for — and „რა მოხდა?“ tells the real way, where the others would have led, and gives the points. The
// game is kept after every tap (`sg-tsinapari-table`), so ✕ only pauses it.

const GAME_KEY = 'sg-tsinapari-table';
const CONF_KEY = 'sg-tsinapari-table-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { story: string; whole: boolean }
const readConf = (): Conf => {
  const o = (load(CONF_KEY) ?? {}) as Partial<Conf>;
  return { ...readTeams(o), story: typeof o.story === 'string' && tsinapariStory(o.story) ? o.story : TSINAPARI_STORIES[0].id, whole: !!o.whole };
};

/** a team's three letters: before the story the team's vote, after it a slip to mend */
const TeamRow: React.FC<{ g: PathTable; t: number; onPick: (c: number) => void; order: readonly number[] }> = ({ g, t, onPick, order }) => {
  const team = g.teams[t];
  const now = g.shown ? team.picks[team.picks.length - 1] : team.pick;
  const got = g.shown && now === 0;
  return (
    <li className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2 flex items-center gap-2.5">
      <span className="w-3 h-3 shrink-0 rounded-full" style={{ background: TEAM_TINT[t] }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold leading-tight text-[#4a3426] truncate">{team.name}</span>
        <span className="block text-[12.5px] tabular-nums text-[#75685a]">
          {team.points} ქულა{g.shown && (got ? <b className="ml-1.5" style={{ color: GREEN }}>+1</b> : now === -1 ? <span className="ml-1.5" style={{ color: AMBER }}>არ აირჩია</span> : null)}
        </span>
      </span>
      <span className="flex gap-1.5" role="group" aria-label={`${team.name}: ასო`}>
        {order.map((c, i) => {
          const on = now === c;
          const bg = !on ? '#fff' : g.shown ? (c === 0 ? GREEN : AMBER) : TEAM_TINT[t];
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => { triggerHaptic(6); onPick(c); }}
              className="w-11 h-11 rounded-full flex items-center justify-center font-serif-ge text-[17px] font-bold cursor-pointer active:scale-95 transition"
              style={{ background: bg, color: on ? '#fff' : '#7a2028', boxShadow: on ? 'none' : 'inset 0 0 0 1px #e8dcc8' }}
            >
              {LETTERS[i]}
            </button>
          );
        })}
      </span>
    </li>
  );
};

const ForkTable: React.FC<{ story: PathStory; g: PathTable; setG: (g: PathTable) => void; whole: boolean }> = ({ story, g, setG, whole }) => {
  const s = story.steps[g.step];
  const order = choiceOrder(g.seed, g.step);
  const ways = waysOf(story, g.step, order);
  const wide = useWide();
  const classPick = g.shown ? g.teams[0].picks[g.teams[0].picks.length - 1] : g.teams[0].pick;
  const votes = (c: number) => g.teams.filter(t => (g.shown ? t.picks[t.picks.length - 1] : t.pick) === c).length;
  const told = useRef<HTMLDivElement>(null);
  useEffect(() => { if (g.shown) told.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [g.shown]);

  const fork = (
    <div className="space-y-3.5">
      <ForkHead story={story} step={g.step} />
      <p className={`${wide ? 'text-[19px]' : 'text-[16.5px]'} leading-relaxed text-[#4a3426]`}>{s.scene}</p>
      <p className={`font-serif-ge ${wide ? 'text-[22px]' : 'text-[19px]'} font-bold`} style={{ color: story.tint }}>{s.ask}</p>
      <div className="space-y-2">
        {ways.map(w => {
          const n = whole ? 0 : votes(w.c);
          const picked = whole ? classPick === w.c : n > 0;
          const state = !g.shown ? (whole && picked ? 'chosen' : 'idle') : w.c === 0 ? 'right' : picked ? 'picked-wrong' : 'other';
          return (
            <WayButton
              key={w.c}
              story={story}
              letter={w.letter}
              text={w.text}
              state={state}
              onClick={whole ? () => { triggerHaptic(6); setG(tablePick(g, 0, w.c)); } : undefined}
              note={(
                <>
                  {!g.shown && whole && classPick === w.c && <span className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-bold" style={{ color: story.tint }}><Check className="w-3.5 h-3.5" />კლასის არჩევანი</span>}
                  {!whole && n > 0 && g.shown && <span className="mt-1 block text-[12.5px] font-bold text-[#75685a]">{n} გუნდმა აირჩია</span>}
                  {g.shown && w.c !== 0 && <span className="mt-1 block text-[13.5px] leading-snug text-[#75685a]">{s.wrong[w.c - 1].then}</span>}
                </>
              )}
            />
          );
        })}
      </div>
      {g.shown && (
        <div ref={told} className="rounded-2xl px-4 py-3 scroll-mb-4" style={{ background: `${GREEN}12` }}>
          <p className="text-[14px] font-bold" style={{ color: GREEN }}>რა მოხდა სინამდვილეში</p>
          <p className={`mt-1 ${wide ? 'text-[17px]' : 'text-[15.5px]'} leading-relaxed text-[#4a3426]`}>{s.real}</p>
        </div>
      )}
    </div>
  );
  if (whole) return <div className="w-full max-w-2xl mx-auto">{fork}</div>;
  const teams = (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#4a3426]"><Users className="w-4 h-4 text-[#7a2028]" />{g.shown ? 'გუნდების არჩევანი — შეცდომა? შეასწორეთ' : 'რომელი ასო ასწიეს?'}</p>
      <ul className="space-y-2">
        {g.teams.map((_, t) => <TeamRow key={t} g={g} t={t} order={order} onPick={c => setG(tablePick(g, t, c))} />)}
      </ul>
    </div>
  );
  return wide ? (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-[minmax(0,1fr)_23rem] gap-6 items-start">{fork}<div className="sticky top-0">{teams}</div></div>
  ) : (
    <div className="w-full max-w-xl mx-auto space-y-5">{fork}{teams}</div>
  );
};

const EndTable: React.FC<{ story: PathStory; g: PathTable; whole: boolean }> = ({ story, g, whole }) => {
  const total = story.steps.length;
  const places = tablePlaces(g);
  const best = g.teams.filter((_, i) => places[i] === 1).map(t => t.name);
  return (
    <div className="w-full max-w-xl mx-auto py-2 space-y-4">
      <div className="text-center">
        <Medallion story={story} size={84} />
        <p className="mt-2 font-serif-ge text-[23px] font-bold leading-tight" style={{ color: story.tint }}>{story.hero}</p>
      </div>
      {whole ? (
        <div className="text-center">
          <p className="text-[16px] text-[#4a3426]">კლასმა <b className="tabular-nums">{g.teams[0].points} / {total}</b> გასაყარზე წინაპარივით აირჩია</p>
          <div className="mt-1"><Stars n={starsOf(g.teams[0].points, total)} size="lg" /></div>
        </div>
      ) : (
        <>
          <p className="text-center text-[16px] font-bold text-[#4a3426]">{best.length > 1 ? `ფრეა: ${best.join(', ')}` : `გაიმარჯვა: ${best[0]}`}</p>
          <Podium names={g.teams.map(t => t.name)} scores={g.teams.map(t => t.points)} />
        </>
      )}
      <p className="text-[15.5px] leading-relaxed text-[#4a3426]">{story.outro}</p>
      <FactBox story={story} />
      <RealPath story={story} picks={whole ? g.teams[0].picks : story.steps.map((_, i) => (g.teams.some(t => t.picks[i] === 0) ? 0 : 1))} />
      {!whole && <p className="text-[12.5px] leading-snug text-[#75685a]">✓ — ამ გასაყარზე ერთმა გუნდმა მაინც გამოიცნო ნამდვილი გზა.</p>}
    </div>
  );
};

const TableGame: React.FC<{ g: PathTable; setG: (g: PathTable) => void; whole: boolean; onClose: () => void; onAgain: () => void }> = ({ g, setG, whole, onClose, onAgain }) => {
  const story = tsinapariStory(g.story)!;
  const total = story.steps.length;
  const over = tableOver(g, total);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { scroller.current?.parentElement?.scrollTo({ top: 0 }); }, [g.step]);
  const reveal = () => { triggerHaptic(20); setG(tableReveal(g)); };
  const footer = over ? (
    <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
      <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15px]">დასრულება</Btn>
      <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15px]">თავიდან</Btn>
    </div>
  ) : g.shown ? (
    <Btn size="lg" full icon={<Footprints />} onClick={() => setG(tableNext(g, total))} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">
      {g.step + 1 < total ? 'შემდეგი გასაყარი' : 'შედეგები'}
    </Btn>
  ) : (
    <Btn size="lg" full icon={<Eye />} onClick={reveal} className="!h-14 !text-[16px] !flex max-w-xl mx-auto">
      რა მოხდა სინამდვილეში?{!whole && ` · ${g.teams.filter(t => t.pick !== -1).length}/${g.teams.length}`}
    </Btn>
  );
  const dots = whole ? g.teams[0].picks : g.teams[0].picks.map((_, i) => (g.teams.some(t => t.picks[i] === 0) ? 0 : 1));
  const wide = useWide();
  const box = over ? 'max-w-xl' : whole ? 'max-w-2xl' : wide ? 'max-w-6xl' : 'max-w-xl';
  return (
    <TableScreen title={over ? story.hero : `${story.hero} · ${g.step + 1} / ${total}`} onClose={onClose} footer={footer}>
      <div ref={scroller} className="flex flex-col gap-4 pt-1 min-h-full">
        <div className={`w-full ${box} mx-auto`}><ForkDots story={story} picks={dots} at={over ? total : g.step} /></div>
        {over ? <EndTable story={story} g={g} whole={whole} /> : <ForkTable story={story} g={g} setG={setG} whole={whole} />}
      </div>
    </TableScreen>
  );
};

export const TsinapariTableGame: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(readConf);
  const [game, setGameState] = useState<PathTable | null>(() => parseTable(load(GAME_KEY), tsinapariStory));
  const [open, setOpen] = useState(false);
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const setGame = useCallback((g: PathTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);

  const names = conf.whole ? ['კლასი'] : teamNames(conf);
  const whole = !!game && game.teams.length === 1;
  const start = async () => {
    if (game && !tableOver(game, tsinapariStory(game.story)!.steps.length) && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(newTable(conf.story, names, (Date.now() % 2_147_483_647) || 1));
    setOpen(true);
  };
  const close = () => { if (game && tableOver(game, tsinapariStory(game.story)!.steps.length)) setGame(null); setOpen(false); };
  const again = () => { if (game) setGame(newTable(game.story, game.teams.map(t => t.name), (Date.now() % 2_147_483_647) || 1)); };

  if (open && game) return <TableGame g={game} setG={setGame} whole={whole} onClose={close} onAgain={again} />;

  const pausedStory = game ? tsinapariStory(game.story) : undefined;
  const paused = game && pausedStory && !tableOver(game, pausedStory.steps.length) ? game : null;
  return (
    <div className="space-y-4">
      {paused && pausedStory && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {pausedStory.hero} · გასაყარი {paused.step + 1} / {pausedStory.steps.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{paused.teams.map(t => `${t.name} — ${rightCount(t.picks)}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ვისი გზა?</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TSINAPARI_STORIES.map(s => {
              const on = conf.story === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => { triggerHaptic(6); setConf({ ...conf, story: s.id }); }}
                    aria-pressed={on}
                    className="w-full h-full rounded-2xl px-2 py-3 flex flex-col items-center gap-2 text-center cursor-pointer active:scale-[0.98] transition bg-white"
                    style={{ boxShadow: on ? `inset 0 0 0 2.5px ${s.tint}` : 'inset 0 0 0 1px #e8dcc8' }}
                  >
                    <Medallion story={s} size={52} />
                    <span className="text-[14px] font-bold leading-tight" style={{ color: on ? s.tint : '#4a3426' }}>{s.hero}</span>
                    <span className="text-[12px] text-[#75685a]">{s.steps.length} გასაყარი · {s.years}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ვინ თამაშობს</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="ვინ თამაშობს">
            <Chip on={!conf.whole} onClick={() => setConf({ ...conf, whole: false })}>გუნდები ეჯიბრებიან</Chip>
            <Chip on={conf.whole} onClick={() => setConf({ ...conf, whole: true })}>მთელი კლასი ერთად</Chip>
          </div>
        </div>
        {!conf.whole && <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />}
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      <KitButton
        id="tsinapris-gza"
        name="წინაპრის გზა"
        icon={<Printer className="w-4.5 h-4.5" />}
        className="flex w-full items-center justify-center gap-2 h-12 rounded-full bg-white ring-1 ring-[#e8dcc8] text-[14px] font-bold text-[#7a2028] hover:ring-[#7a2028]/40"
      >
        ა ბ გ ბარათები და წიგნი-თამაში · PDF
      </KitButton>
      <Hint>
        {conf.whole ? (
          <>მასწავლებელი გასაყარს ხმამაღლა კითხულობს, კლასი სამ გზაზე ხელის აწევით აძლევს ხმას. შეეხეთ იმ გზას, რომელმაც მეტი ხმა მიიღო, და მერე „რა მოხდა სინამდვილეში?“ — ტელეფონი ნამდვილ გზას გეტყვით და იმასაც, სად წაიყვანდა სხვები.</>
        ) : (
          <>დაბეჭდეთ ა ბ გ ბარათები — თითო გუნდს სამი. მასწავლებელი გასაყარს ხმამაღლა კითხულობს, გუნდები თათბირობენ და ერთ ბარათს ერთდროულად სწევენ. შეეხეთ თითოეული გუნდის ასოს და მერე „რა მოხდა სინამდვილეში?“ — ტელეფონი ნამდვილ გზას გეტყვით, ქულებს თვითონ დაითვლის.</>
        )}
      </Hint>
      <p className="text-[12.5px] leading-snug text-[#75685a]">{UNCHECKED}</p>
    </div>
  );
};

