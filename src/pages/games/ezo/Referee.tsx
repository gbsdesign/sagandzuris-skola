import React, { useMemo, useState } from 'react';
import { ChevronRight, Clock3, Dices, Play, Shuffle, Users } from 'lucide-react';
import { EZO_GAMES, EZO_TEAMS, EZO_TINT, ezoGame, type EzoGameDef, type EzoId } from '../../../data/ezoGames';
import {
  COUNTS, keepTeams, movePlayer, newMatch, parseMatch, parseTurns, recordRound, scoreOf, splitTeams, teamWins, turnsView, leftMs,
  type EzoMatch, type EzoRound, type EzoTurns,
} from '../../../utils/ezo';
import { clock } from '../../../utils/amikhseni';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Hint } from '../samshvilde/parts';
import { Field } from './Field';
import { MatchScreen } from './Match';
import { SeekScreen } from './Seek';
import { SeaScreen } from './Sea';
import { TurnsScreen } from './Turns';
import { SeasonCard } from './Season';
import { MATCH_KEY, TURNS_KEY, readConf, readJson, setSeason, useSeason, writeConf, writeJson, type EzoConf } from './store';

// „ეზოს მსაჯი“ — the hub's „ჰიბრიდული“: the children need no phones, the teacher's phone is the referee. Pick a game, the
// names (the class in one tap), and the phone splits two fair teams by the season, keeps the clock and the points with its
// whistle, counts hide-and-seek, plays the sea, keeps hopscotch's turns and writes every winner into the season's table.

const MAX_GRID = 6;

const GameRow: React.FC<{ g: EzoGameDef; onOpen: () => void }> = ({ g, onOpen }) => (
  <button type="button" onClick={() => { triggerHaptic(6); onOpen(); }} className="w-full flex items-center gap-3 rounded-2xl p-2 pr-3 text-left bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40 active:scale-[0.99] transition cursor-pointer">
    <Field id={g.id} className="w-[84px] shrink-0 rounded-xl overflow-hidden" />
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-bold leading-tight text-[#4a3426]">{g.name}</span>
      <span className="mt-0.5 block text-[12.5px] leading-snug text-[#75685a]">
        {g.kind === 'teams' ? 'ორი გუნდი' : g.kind === 'turns' ? 'რიგრიგობით' : 'ყველა თავისთვის'} · {g.players[0]}–{g.players[1]} მოთამაშე
      </span>
    </span>
    <ChevronRight className="w-5 h-5 shrink-0 text-[#b3a594]" />
  </button>
);

const Paused: React.FC<{ title: string; line: string; onOpen: () => void }> = ({ title, line, onOpen }) => (
  <Card className="!p-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1 basis-52">
        <p className="text-[14px] font-bold text-[#4a3426]">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{line}</p>
      </div>
      <Btn onClick={onOpen} icon={<Play />}>გაგრძელება</Btn>
    </div>
  </Card>
);

/** two teams side by side; a tap moves a name to the other team */
const TeamsSplit: React.FC<{ teams: [string[], string[]]; onMove: (name: string) => void; onShuffle: () => void }> = ({ teams, onMove, onShuffle }) => {
  const season = useSeason();
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> გუნდები</p>
        <button type="button" onClick={() => { triggerHaptic(8); onShuffle(); }} className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
          <Shuffle className="w-3.5 h-3.5" />ხელახლა გაყოფა
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {([0, 1] as const).map(t => (
          <div key={t} className="rounded-2xl ring-1 ring-[#e8dcc8] bg-white overflow-hidden">
            <div className="px-3 py-2 text-white" style={{ background: EZO_TINT[t] }}>
              <p className="text-[14px] font-bold leading-tight">{EZO_TEAMS[t]} · {teams[t].length}</p>
              <p className="text-[11.5px] leading-tight text-white/85">სეზონის მოგებები: {teamWins(teams[t], season)}</p>
            </div>
            <ul className="p-2 flex flex-wrap gap-1.5">
              {teams[t].map(n => (
                <li key={n}>
                  <button type="button" onClick={() => { triggerHaptic(5); onMove(n); }} aria-label={`${n} — მეორე გუნდში`} className="h-9 px-2.5 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426] cursor-pointer active:scale-[0.97] transition">
                    {n}
                  </button>
                </li>
              ))}
              {!teams[t].length && <li className="px-1 py-1.5 text-[12px] text-[#9a8b7b]">ჯერ არავინ</li>}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[12px] leading-snug text-[#9a8b7b]">ძლიერებს — სეზონის მოგებებით — ორივე გუნდს თანაბრად უნაწილებს. სახელზე შეხება მას მეორე გუნდში გადაიყვანს.</p>
    </div>
  );
};

const Setting: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Clock3 className="w-4 h-4 text-[#7a2028]" /> {label}</p>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>{children}</div>
  </div>
);

/** pick one name (the seeker, the leader); 🎲 picks at random */
const OnePick: React.FC<{ label: string; names: string[]; value: string; onChange: (n: string) => void }> = ({ label, names, value, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[13.5px] font-bold text-[#4a3426]">{label}</p>
      <button type="button" onClick={() => { triggerHaptic(8); onChange(names[Math.floor(Math.random() * names.length)]); }} className="h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
        <Dices className="w-4 h-4" />შემთხვევით
      </button>
    </div>
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
      {names.map(n => <Chip key={n} on={value === n} onClick={() => onChange(n)}>{n}</Chip>)}
    </div>
  </div>
);

const Setup: React.FC<{
  g: EzoGameDef;
  onBack: () => void;
  onMatch: (m: EzoMatch) => void;
  onSeek: (o: { seeker: string; count: number; minutes: number }) => void;
  onSea: (leader: string) => void;
  onTurns: (t: EzoTurns) => void;
}> = ({ g, onBack, onMatch, onSeek, onSea, onTurns }) => {
  const names = useCircleNames();
  const season = useSeason();
  const [conf, setConfState] = useState<EzoConf>(readConf);
  const setConf = (c: EzoConf) => { setConfState(c); writeConf(c); };
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [split, setSplit] = useState<[string[], string[]] | null>(null);
  const teams = useMemo(() => (split ? keepTeams(split, names) : splitTeams(names, season, seed)), [split, names, season, seed]);
  const [one, setOne] = useState('');
  const pickOne = names.includes(one) ? one : names[0] ?? '';
  const minutes = conf.minutes[g.id] && g.minutes.includes(conf.minutes[g.id]) ? conf.minutes[g.id] : g.minutes[1] ?? g.minutes[0] ?? 0;
  const grid = conf.grid.filter(n => names.includes(n)).slice(0, MAX_GRID);
  const toggleGrid = (n: string) => setConf({ ...conf, grid: grid.includes(n) ? grid.filter(x => x !== n) : grid.length < MAX_GRID ? [...grid, n] : grid });

  const ready = g.kind === 'turns' ? grid.length >= 2 : true;
  const start = () => {
    triggerHaptic(10);
    if (g.kind === 'teams') onMatch(newMatch(g.id, teams, minutes));
    else if (g.id === 'damalobana') onSeek({ seeker: pickOne, count: conf.count, minutes: conf.seek });
    else if (g.id === 'zghva') onSea(pickOne);
    else onTurns({ players: grid, moves: [] });
  };
  const startText = g.kind === 'teams' ? `დაწყება · ${minutes} წუთი` : g.kind === 'turns' ? `დაწყება · ${grid.length} მოთამაშე` : 'დაწყება';

  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="h-9 px-3 rounded-full text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">← თამაშები</button>
      <Card className="!p-4 space-y-3">
        <Field id={g.id} label={`${g.name}: მოედანი`} className="w-full rounded-2xl overflow-hidden" />
        <div>
          <p className="font-serif-ge text-[19px] font-bold leading-tight text-[#4a3426]">{g.name}</p>
          <p className="mt-1 text-[13.5px] leading-snug text-[#75685a]">{g.lead}</p>
        </div>
      </Card>
      <Card className="!p-4 space-y-4">
        <CircleNames label="მოთამაშეები" hint="ჩაწერე, ვინ თამაშობს, ან ერთი შეხებით კლასი დაამატე — სეზონის ცხრილი ამ სახელებით ითვლის. სახელების გარეშეც შეიძლება." />
        {g.kind === 'teams' && names.length > 1 && (
          <TeamsSplit teams={teams} onMove={n => setSplit(movePlayer(teams, n))} onShuffle={() => { setSplit(null); setSeed(Math.floor(Math.random() * 1e9)); }} />
        )}
        {g.kind === 'teams' && (
          <Setting label="თამაშის დრო">
            {g.minutes.map(m => <Chip key={m} on={minutes === m} onClick={() => setConf({ ...conf, minutes: { ...conf.minutes, [g.id]: m } })}>{m} წუთი</Chip>)}
          </Setting>
        )}
        {g.id === 'damalobana' && (
          <>
            {names.length > 1 && <OnePick label="ვინ ეძებს?" names={names} value={pickOne} onChange={setOne} />}
            <Setting label="რამდენამდე ითვლის">
              {COUNTS.map(c => <Chip key={c} on={conf.count === c} onClick={() => setConf({ ...conf, count: c })}>{c}-მდე</Chip>)}
            </Setting>
            <Setting label="ძებნის დრო">
              {g.minutes.map(m => <Chip key={m} on={conf.seek === m} onClick={() => setConf({ ...conf, seek: m })}>{m} წუთი</Chip>)}
            </Setting>
          </>
        )}
        {g.id === 'zghva' && names.length > 1 && <OnePick label="ვინ არის წამყვანი?" names={names} value={pickOne} onChange={setOne} />}
        {g.kind === 'turns' && (
          <div className="space-y-2">
            <p className="text-[13.5px] font-bold text-[#4a3426]">ვინ ხტება ამ ხაზზე? · {grid.length}/{MAX_GRID}</p>
            {names.length ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="ვინ ხტება">
                {names.map(n => {
                  const at = grid.indexOf(n);
                  return <Chip key={n} on={at >= 0} onClick={() => toggleGrid(n)} disabled={at < 0 && grid.length >= MAX_GRID}>{at >= 0 ? `${at + 1}. ` : ''}{n}</Chip>;
                })}
              </div>
            ) : <p className="text-[12.5px] text-[#9a8b7b]">ჯერ მოთამაშეები ჩაწერე.</p>}
            <p className="text-[12px] leading-snug text-[#9a8b7b]">ერთ ხაზზე 2–6 მოთამაშე, რიგით, რომლითაც შეეხე. დიდი კლასი რამდენიმე ხაზზე თამაშობს.</p>
          </div>
        )}
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={start} disabled={!ready} className="!h-14 !text-[15.5px]">{startText}</Btn>
      <RulesFold g={g} />
    </div>
  );
};

/** the game's rules, folded under the setup */
const RulesFold: React.FC<{ g: EzoGameDef }> = ({ g }) => (
  <details className="group rounded-3xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-4 py-3">
    <summary className="min-h-10 flex items-center justify-between gap-2 cursor-pointer list-none text-[14px] font-bold text-[#4a3426]">
      წესები მსაჯისთვის<ChevronRight className="w-5 h-5 text-[#b3a594] transition-transform group-open:rotate-90" />
    </summary>
    <ol className="mt-2 space-y-1.5 text-[13.5px] leading-snug text-[#4a3426] list-decimal pl-5">
      {g.steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
    <p className="mt-2 text-[13.5px] leading-snug text-[#4a3426]"><span className="font-bold">ვინ იგებს: </span>{g.win}</p>
    <ul className="mt-2 space-y-1 text-[13px] leading-snug text-[#75685a]">{g.safe.map((s, i) => <li key={i}>• {s}</li>)}</ul>
  </details>
);

type Open = null | 'match' | 'turns' | { seek: { seeker: string; count: number; minutes: number; players: string[] } } | { sea: { leader: string; players: string[] } };

export const Referee: React.FC = () => {
  const names = useCircleNames();
  const season = useSeason();
  const [view, setView] = useState<'home' | EzoId>('home');
  const [match, setMatchState] = useState<EzoMatch | null>(() => parseMatch(readJson(MATCH_KEY)));
  const [turns, setTurnsState] = useState<EzoTurns | null>(() => parseTurns(readJson(TURNS_KEY)));
  const [open, setOpen] = useState<Open>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const setMatch = (m: EzoMatch | null) => { setMatchState(m); writeJson(MATCH_KEY, m); };
  const setTurns = (t: EzoTurns | null) => { setTurnsState(t); writeJson(TURNS_KEY, t); };
  const record = (r: EzoRound) => { setSeason(recordRound(season, r)); setFresh(r.id); };
  const close = () => { setOpen(null); setView('home'); window.scrollTo({ top: 0 }); };

  if (open === 'match' && match) return <MatchScreen m={match} setM={setMatch} onRecord={record} onClose={close} />;
  if (open === 'turns' && turns) return <TurnsScreen t={turns} setT={setTurns} onRecord={record} onClose={close} />;
  if (open && typeof open === 'object' && 'seek' in open) {
    return <SeekScreen players={open.seek.players} firstSeeker={open.seek.seeker} count={open.seek.count} minutes={open.seek.minutes} onRecord={record} onClose={close} />;
  }
  if (open && typeof open === 'object' && 'sea' in open) return <SeaScreen players={open.sea.players} firstLeader={open.sea.leader} onRecord={record} onClose={close} />;

  const g = view !== 'home' ? ezoGame(view) : undefined;
  if (g) {
    return (
      <Setup
        g={g}
        onBack={() => setView('home')}
        onMatch={async m => {
          if (match && !match.ended && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
          setMatch(m);
          setOpen('match');
        }}
        onSeek={o => setOpen({ seek: { ...o, players: names } })}
        onSea={leader => setOpen({ sea: { leader, players: names } })}
        onTurns={async t => {
          if (turns && turnsView(turns).winner === null && turns.moves.length && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული კლასობანა წაიშლება.', ok: 'ახალი თამაში' }))) return;
          setTurns(t);
          setOpen('turns');
        }}
      />
    );
  }

  const paused = match && !match.ended ? match : null;
  const pausedTurns = turns && turnsView(turns).winner === null ? turns : null;
  return (
    <div className="space-y-3">
      {paused && (() => {
        const [a, b] = scoreOf(paused);
        return <Paused title={`შეჩერებული: ${ezoGame(paused.game)?.name}`} line={`${EZO_TEAMS[0]} ${a} : ${b} ${EZO_TEAMS[1]} · დარჩა ${clock(Math.ceil(leftMs(paused, Date.now()) / 1000))}`} onOpen={() => setOpen('match')} />;
      })()}
      {pausedTurns && (() => {
        const v = turnsView(pausedTurns);
        return <Paused title="შეჩერებული: კლასობანა" line={`${pausedTurns.players.map((p, i) => `${p} ${v.level[i]}`).join(' · ')}`} onOpen={() => setOpen('turns')} />;
      })()}
      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">რას ვთამაშობთ?</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ბავშვებს ტელეფონი არ სჭირდებათ — თქვენი ტელეფონი მსაჯია: ყოფს გუნდებს, უსტვენს, ითვლის დროსა და ქულებს.</p>
        </div>
        <div className="space-y-2">{EZO_GAMES.map(x => <GameRow key={x.id} g={x} onOpen={() => { setView(x.id); window.scrollTo({ top: 0 }); }} />)}</div>
      </Card>
      <SeasonCard fresh={fresh} />
      <Hint>წესები Claude-მა ჩაწერა ისე, როგორც ბავშვები ჩვეულებრივ თამაშობენ — მასწავლებელს ჯერ არ შეუმოწმებია. თქვენი ეზოს წესი უფრო მთავარია.</Hint>
    </div>
  );
};
