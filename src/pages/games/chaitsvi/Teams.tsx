import React, { useCallback, useState } from 'react';
import { Flag, Play, RotateCcw, Trophy } from 'lucide-react';
import { newDressTeams, parseDressTeams, ranking, recordTurn, timeText, turnOf, type DressTeams, type Outfit } from '../../../utils/chaitsvi';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { TEAM_TINT, TeamsEditor, readTeams, teamNames, type TeamsConf } from '../rounds/teams';
import { DressBoard } from './Dress';
import { pickHat, useKaba } from './Doll';
import { DressOptions, OUTFIT_LABEL } from './Solo';
import { HowTo } from '../../../components/games/HowTo';

// „ჩაიცვი ქართულად“ on one phone (the hub's „ჰიბრიდული“, 2026-11-01): the teams dress in turn — the phone goes to the team on
// turn, 3-2-1, and the fastest dressing wins (each mistake +3 s). Each team gets the parts in its own shuffled order and the
// same hat. With a real chokha the team dresses its own „model“ and the host taps each part as it goes on: the phone checks the
// order and keeps the time. Rules: utils/chaitsvi.ts; the game is kept on this phone after every turn, ✕ only pauses.

const GAME_KEY = 'sg-chaitsvi-teams';
const CONF_KEY = 'sg-chaitsvi-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { outfit: Outfit; labels: boolean }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return { ...readTeams(o), outfit: o.outfit === 'kaba' ? 'kaba' : 'chokha', labels: o.labels !== false };
};

const Dot: React.FC<{ team: number; className?: string }> = ({ team, className = 'w-3 h-3' }) => (
  <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: TEAM_TINT[team] }} aria-hidden="true" />
);

/** the teams that dressed, fastest first */
const Times: React.FC<{ g: DressTeams }> = ({ g }) => (
  <ol className="space-y-1.5">
    {ranking(g).map(r => (
      <li key={r.i} className="flex items-center gap-3 min-h-12 rounded-2xl px-3 bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]">
        <span className="w-7 shrink-0 text-center text-[14px] font-bold tabular-nums text-[#a0703c]">{r.place === 1 ? <Trophy className="inline w-4 h-4 text-[#c9a227]" aria-label="პირველი" /> : r.place}</span>
        <Dot team={r.i} />
        <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight [overflow-wrap:anywhere]">{r.name}</span>
        {r.mistakes > 0 && <span className="shrink-0 text-[12px] text-[#b5662b] tabular-nums">{r.mistakes} შეცდ.</span>}
        <span className="shrink-0 min-w-[3.5rem] text-right text-[15px] font-bold tabular-nums">{timeText(r.ms)}</span>
      </li>
    ))}
  </ol>
);

const TeamsGame: React.FC<{ g: DressTeams; setG: (g: DressTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const kaba = useKaba();
  const [dressing, setDressing] = useState(false);
  const [last, setLast] = useState<number | null>(null);
  const turn = turnOf(g);
  const hat = pickHat(g.seed);
  const title = `ჩაიცვი ქართულად · ${OUTFIT_LABEL[g.outfit]}`;

  if (dressing && turn !== null) {
    return (
      <DressBoard
        outfit={g.outfit} names={g.names} seed={g.seed + (turn + 1) * 7919} hat={hat} kaba={kaba}
        title={<span className="inline-flex items-center gap-2"><Dot team={turn} />{g.teams[turn]}</span>}
        onClose={() => setDressing(false)}
        onDone={r => { setLast(turn); setG(recordTurn(g, r.ms, r.mistakes)); setDressing(false); }}
      />
    );
  }

  const lastResult = last !== null ? g.results[last] : null;
  if (turn === null) {
    const first = ranking(g).filter(r => r.place === 1).map(r => r.name);
    return (
      <TableScreen
        title={`${title} · შედეგები`}
        onClose={onClose}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto w-full max-w-md mx-auto space-y-4 py-4">
          <div className="text-center">
            <Trophy className="mx-auto w-10 h-10 text-[#c9a227]" aria-hidden="true" />
            <p className="mt-2 font-serif-ge text-[22px] font-bold text-[#7a2028] leading-tight">{first.length > 1 ? `ფრეა: ${first.join(', ')}` : `ყველაზე სწრაფი — „${first[0]}“`}</p>
          </div>
          <Times g={g} />
        </div>
      </TableScreen>
    );
  }

  const done = g.results.filter(Boolean).length;
  return (
    <TableScreen
      title={title}
      onClose={onClose}
      footer={<Btn size="lg" full icon={<Play />} onClick={() => { triggerHaptic(10); setDressing(true); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>}
    >
      <div className="my-auto w-full max-w-md mx-auto space-y-5 py-4">
        {lastResult && last !== null && (
          <p className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 bg-[#e6f2e9] text-[#2f7d4f] text-[15.5px] font-bold text-center" role="status">
            <Dot team={last} />{g.teams[last]}: {timeText(lastResult.ms)} წამი{lastResult.mistakes ? ` · ${lastResult.mistakes} შეცდომა` : ' · უშეცდომოდ'}
          </p>
        )}
        <div className="text-center space-y-2">
          <p className="text-[14px] text-[#75685a]">გუნდი {done + 1} / {g.teams.length}</p>
          <p className="font-serif-ge text-[30px] font-bold leading-tight [overflow-wrap:anywhere]" style={{ color: TEAM_TINT[turn] }}>{g.teams[turn]}</p>
          <p className="text-[14.5px] leading-snug text-[#4a3426]">ტელეფონი გადაეცით გუნდს. „დაწყებაზე“ — 3, 2, 1 და დრო მიდის.</p>
        </div>
        {done > 0 && <Times g={g} />}
      </div>
    </TableScreen>
  );
};

export const DressTable: React.FC = () => {
  const kaba = useKaba();
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<DressTeams | null>(() => { const g = parseDressTeams(load(GAME_KEY)); return g && turnOf(g) !== null ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: DressTeams | null) => { setGameState(g); save(GAME_KEY, g && turnOf(g) !== null ? g : null); }, []);
  const outfit: Outfit = conf.outfit === 'kaba' && kaba ? 'kaba' : 'chokha';
  // a kept game in the dress waits until its pictures have come
  const canGoOn = !!game && (game.outfit === 'chokha' || !!kaba);

  const deal = (teams: string[], o: Outfit, labels: boolean) => newDressTeams(teams, o, labels, (Math.floor(Math.random() * 2 ** 31)) || 1);
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), outfit, conf.labels));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.teams, game.outfit, game.names)); };

  if (open && game && canGoOn) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {OUTFIT_LABEL[game.outfit]} · ჩაიცვა {game.results.filter(Boolean).length} / {game.teams.length} გუნდმა</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.teams.map((n, t) => { const r = game.results[t]; return r ? `${n} ${timeText(r.ms)}` : n; }).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />} disabled={!canGoOn}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="chaitsvi-table" steps={[
        'გუნდები რიგრიგობით იღებენ ტელეფონს: 3, 2, 1 — და ნაწილები სწორი რიგით უნდა ჩაიცვან.',
        'ადრე აღებული ნაწილი უკან ბრუნდება და დროს 3 წამს უმატებს. ყველაზე სწრაფი გუნდი იგებს.',
        'ყოველ გუნდს ნაწილები სხვა რიგით უწყვია, ქუდი კი ერთი და იგივეა.',
        'გაქვთ ნამდვილი ჩოხა? გუნდი თავის „მოდელს“ აცმევს, მასწავლებელი ყოველ ჩაცმულ ნაწილზე ეხება ტელეფონს. რიგს და დროს ტელეფონი ითვლის.',
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Flag className="w-4 h-4 text-[#7a2028]" /> რა ჩაიცვან</p>
          <DressOptions
            outfit={outfit} names={conf.labels} kabaOn={!!kaba}
            onOutfit={o => setConf({ ...conf, outfit: o })} onNames={v => setConf({ ...conf, labels: v })}
          />
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
    </div>
  );
};
