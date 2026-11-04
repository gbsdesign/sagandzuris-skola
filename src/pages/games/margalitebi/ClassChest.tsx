import React, { useCallback, useState } from 'react';
import { ArrowRight, Gem, Play, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import { CHESTS } from '../../../data/pearls';
import { findVersion } from '../../../data/chantLookup';
import { chantName, isGolden, pearlState, POLISH_PCT, type PearlRecord } from '../../../utils/pearls';
import type { Voice } from '../../../utils/pathItems';
import {
  PER_TEAM, chestCounts, chestWith, isOver, newPearlTeams, parseClassChest, parsePearlTeams, recordTake, standings, teamOf,
  teamScores, turnOf, undoTake, type ClassChest, type PearlTeams, type Take,
} from '../../../utils/pearlTeams';
import type { PublicQ } from '../../../utils/roundGames';
import { PearlIcon, VoiceDots } from '../../../components/pearls/PearlIcon';
import { ChestIcon } from '../../../components/pearls/PearlChests';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Bar, Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Hint } from '../samshvilde/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, type TeamsConf } from '../rounds/teams';
import { Sing, pctTone } from '../turniri/Sing';
import { triggerHaptic } from '../../../utils/haptics';

// „კლასის სკივრი“ — „მარგალიტები“ on one phone (the hub's „ჰიბრიდული“, 2026-11-04): 2–6 teams take the phone in turn, a pearl
// of the chosen chest a turn; the team's singer picks a voice, hears its first phrase and sings it, scored as the pearls are
// (turniri/Sing.tsx). The take's per cent is the team's points, 80 % polishes the pearl — on the class's own chest too, kept on
// this phone: the best take in each voice, the pearls the class has polished least come first. A game is kept after every turn
// (✕ only pauses); its takes join the class's chest when it ends, so a turn can be undone till then. Rules: utils/pearlTeams.ts.

const GAME_KEY = 'sg-margalitebi-teams';
const CONF_KEY = 'sg-margalitebi-table';
const CHEST_KEY = 'sg-margalitebi-chest';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };

interface Conf extends TeamsConf { chest: string; perTeam: number }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    chest: CHESTS.some(c => c.id === o.chest) ? o.chest! : CHESTS[0].id,
    perTeam: (PER_TEAM as readonly number[]).includes(Number(o.perTeam)) ? Number(o.perTeam) : 2,
  };
};

const ROMAN = ['I', 'II', 'III'];
const chestOfId = (id: string) => CHESTS.find(c => c.id === id) ?? CHESTS[0];

/** the class's voices of a pearl as a pearl's record, for the pearls' own drawing */
const recOf = (v: [number, number, number] | undefined): PearlRecord | undefined => {
  if (!v || v.every(p => p < 0)) return undefined;
  const voices: Partial<Record<Voice, number>> = {};
  v.forEach((p, i) => { if (p >= 0) voices[String(i + 1) as Voice] = p; });
  const best = Math.max(...v);
  return { best, voice: String(v.indexOf(best) + 1) as Voice, at: '', voices };
};

const pearlOf = (id: string) => {
  const info = findVersion(id);
  return info ? { num: info.variant.bookNums?.[0] ?? 0, book: info.variant.book || 'book', name: chantName(info.chant.title) } : null;
};

const Dot: React.FC<{ team: number; className?: string }> = ({ team, className = 'w-3 h-3' }) => (
  <span className={`inline-block shrink-0 rounded-full ${className}`} style={{ background: TEAM_TINT[team] }} aria-hidden="true" />
);

/** a pearl as the class has it: its drawing and the three voices' dots */
const ClassPearl: React.FC<{ chest: ClassChest; id: string; size?: number }> = ({ chest, id, size = 44 }) => {
  const rec = recOf(chest[id]);
  const golden = isGolden(rec);
  return (
    <>
      <PearlIcon state={pearlState(rec, undefined)} golden={golden} size={size} />
      <VoiceDots rec={rec} golden={golden} />
    </>
  );
};

/** the three chests with what the class has polished in each; the chosen one with a wine rim */
const ChestCards: React.FC<{ chest: ClassChest; on: string; onPick: (id: string) => void }> = ({ chest, on, onPick }) => (
  <div role="radiogroup" aria-label="სკივრი" className="grid grid-cols-3 gap-2">
    {CHESTS.map(c => {
      const n = chestCounts(chest, c.id);
      const sel = c.id === on;
      return (
        <button key={c.id} type="button" role="radio" aria-checked={sel} onClick={() => { triggerHaptic(8); onPick(c.id); }}
          className={`flex flex-col items-center gap-1 rounded-2xl px-1.5 pt-2 pb-2.5 cursor-pointer transition ${
            sel ? 'bg-white ring-2 ring-[#7a2028] shadow-[0_6px_16px_-10px_rgba(122,32,40,0.6)]' : 'bg-[#fbf6ec] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`}>
          <ChestIcon full={n.polished === n.total} size={44} />
          <span className="text-[13px] font-bold leading-tight text-[#4a3426]">{c.label}</span>
          <span className="text-[12px] font-semibold tabular-nums text-[#8a7a6a]">{n.polished}/{n.total}</span>
          <span className="w-full px-1"><Bar value={n.polished} max={n.total} /></span>
        </button>
      );
    })}
  </div>
);

/** the teams by points, a place each */
const Standings: React.FC<{ g: PearlTeams }> = ({ g }) => (
  <ol className="space-y-1.5">
    {standings(g).map(r => (
      <li key={r.i} className="flex items-center gap-3 min-h-12 rounded-2xl px-3 bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]">
        <span className="w-7 shrink-0 text-center text-[14px] font-bold tabular-nums text-[#a0703c]">{r.place === 1 ? <Trophy className="inline w-4 h-4 text-[#c9a227]" aria-label="პირველი" /> : r.place}</span>
        <Dot team={r.i} />
        <span className="min-w-0 flex-1 text-[14px] font-bold leading-tight [overflow-wrap:anywhere]">{r.name}</span>
        {r.polished > 0 && <span className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-bold text-[#2f7d4f] tabular-nums"><Gem className="w-3.5 h-3.5" aria-hidden="true" />{r.polished}</span>}
        <span className="shrink-0 min-w-[3.5rem] text-right text-[15px] font-bold tabular-nums">{r.points}</span>
      </li>
    ))}
  </ol>
);

/** every turn of the game: the team, the pearl, the voice and the per cent */
const Takes: React.FC<{ g: PearlTeams }> = ({ g }) => (
  <ul className="divide-y divide-[#efe5d4] rounded-2xl bg-white ring-1 ring-[#e8dcc8]">
    {g.takes.map((k, i) => {
      const p = pearlOf(g.order[i]);
      return (
        <li key={i} className="flex items-center gap-2.5 min-h-11 px-3 py-1.5 text-[13.5px] text-[#4a3426]">
          <Dot team={teamOf(g, i)} />
          <span className="min-w-0 flex-1 leading-snug"><span className="font-bold tabular-nums text-[#7a2028]">№{p?.num}</span> {p?.name}</span>
          {k ? (
            <>
              <span className="shrink-0 text-[12.5px] font-bold text-[#8a7a6a]">{ROMAN[k.voice]}</span>
              <span className={`shrink-0 w-11 text-right font-bold tabular-nums ${pctTone(k.pct)}`}>{k.pct}%</span>
            </>
          ) : <span className="shrink-0 text-[12.5px] text-[#8a7a6a]">გამოტოვა</span>}
        </li>
      );
    })}
  </ul>
);

const ClassGame: React.FC<{
  g: PearlTeams; chest: ClassChest; setG: (g: PearlTeams) => void; onClose: () => void; onAgain: () => void;
}> = ({ g, chest, setG, onClose, onAgain }) => {
  const [take, setTake] = useState<Take>(null);
  const c = chestOfId(g.chest);
  const title = `მარგალიტები · ${c.label}`;
  const scores = teamScores(g);
  const have = chestWith(chest, g);

  if (isOver(g)) {
    const rows = standings(g);
    const first = rows.filter(r => r.place === 1).map(r => r.name);
    const n = chestCounts(have, g.chest);
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
            <p className="mt-2 font-serif-ge text-[22px] font-bold text-[#7a2028] leading-tight">{first.length > 1 ? `ფრეა: ${first.join(', ')}` : `გაიმარჯვა გუნდმა „${first[0]}“`}</p>
          </div>
          <Standings g={g} />
          <p className="flex items-center gap-2.5 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-2.5 text-[13.5px] leading-snug text-[#4a3426]">
            <ChestIcon full={n.polished === n.total} size={36} />
            <span>კლასის სკივრი „{c.label}“: გაპრიალებული <b className="tabular-nums">{n.polished}/{n.total}</b>{n.golden ? <> · ოქროსფერი <b className="tabular-nums">{n.golden}</b></> : null}</span>
          </p>
          <Takes g={g} />
        </div>
      </TableScreen>
    );
  }

  const t = turnOf(g);
  const team = teamOf(g, t);
  const id = g.order[t];
  const p = pearlOf(id);
  const voices = have[id];
  const next = (k: Take) => { triggerHaptic(k ? 14 : 6); setG(recordTake(g, k ? k.pct : null, k ? k.voice : 0)); setTake(null); };

  return (
    <TableScreen
      title={title}
      onClose={onClose}
      footer={(
        <div className="flex gap-2">
          {t > 0 && (
            <button type="button" aria-label="წინა სვლის გაუქმება" title="წინა სვლის გაუქმება"
              onClick={() => { triggerHaptic(6); setG(undoTake(g)); setTake(null); }}
              className="w-14 h-14 shrink-0 rounded-2xl bg-white ring-1 ring-[#e8dcc8] text-[#7a2028] flex items-center justify-center cursor-pointer">
              <Undo2 className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
          <Btn kind="ghost" size="lg" onClick={() => next(null)} className="!h-14 !px-4 !text-[15.5px] flex-1 min-w-0">გამოტოვება</Btn>
          <Btn size="lg" icon={<ArrowRight />} disabled={!take} onClick={() => next(take)} className="!h-14 !px-4 !text-[15.5px] flex-1 min-w-0">შემდეგი</Btn>
        </div>
      )}
    >
      {/* on a phone on its side the pearl stands beside the singing */}
      <div className="w-full max-w-md mx-auto space-y-3.5 py-3 [@media(max-height:500px)]:max-w-3xl [@media(max-height:500px)]:grid [@media(max-height:500px)]:grid-cols-2 [@media(max-height:500px)]:items-start [@media(max-height:500px)]:gap-4 [@media(max-height:500px)]:space-y-0">
        <div className="space-y-3.5">
        <TeamChips names={g.teams} scores={scores} turn={team} />
        <div className="flex items-center gap-3 rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
          <span className="shrink-0 flex flex-col items-center"><ClassPearl chest={have} id={id} size={52} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-bold text-[#8a7a6a] tabular-nums">სვლა {t + 1} / {g.order.length} · №{p?.num}</p>
            <p className="font-serif-ge text-[19px] font-bold leading-snug text-[#4a3426] [overflow-wrap:anywhere]">{p?.name ?? '—'}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">
              {voices && voices.some(x => x >= 0) ? `კლასს: ${ROMAN.map((r, v) => `${r} ${voices[v] >= 0 ? `${voices[v]}%` : '—'}`).join(' · ')}` : 'კლასს ეს მარგალიტი ჯერ არ უმღერია'}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-2 text-[15px] font-bold leading-snug" style={{ color: TEAM_TINT[team] }}>
          <Dot team={team} />„{g.teams[team]}“ მღერის
        </p>
        </div>
        <div className="space-y-3.5">
        {p && <Sing key={`${t}-${id}`} q={{ kind: 'turniri', book: p.book, num: p.num } as PublicQ} onScore={(pct, voice) => setTake(pct === null ? null : { pct, voice: voice === 1 || voice === 2 ? voice : 0 })} />}
        {take && (
          <p className={`rounded-2xl px-4 py-2.5 text-center text-[14.5px] font-bold ${take.pct >= POLISH_PCT ? 'bg-[#e6f2e9] text-[#2f7d4f]' : 'bg-[#fbf6ec] text-[#75685a]'}`} role="status">
            {take.pct >= POLISH_PCT ? 'მარგალიტი გაპრიალდა! ' : ''}+{take.pct} ქულა „{g.teams[team]}“-ს
          </p>
        )}
        </div>
      </div>
    </TableScreen>
  );
};

export const ClassChestTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [chest, setChestState] = useState<ClassChest>(() => parseClassChest(load(CHEST_KEY)));
  const setChest = (c: ClassChest) => { setChestState(c); save(CHEST_KEY, Object.keys(c).length ? c : null); };
  const [game, setGameState] = useState<PearlTeams | null>(() => { const g = parsePearlTeams(load(GAME_KEY)); return g && !isOver(g) ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: PearlTeams | null) => { setGameState(g); save(GAME_KEY, g && !isOver(g) ? g : null); }, []);
  // a game's takes join the class's chest once it ends (or gives way to a new one)
  const play = (g: PearlTeams) => { if (isOver(g)) setChest(chestWith(chest, g)); setGame(g); };

  const deal = (teams: string[], chestId: string, perTeam: number, have: ClassChest) => newPearlTeams({ chest: chestId, teams, perTeam, have });
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაშის ნამღერი კლასის სკივრში დარჩება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    const have = game ? chestWith(chest, game) : chest;
    if (game) setChest(have);
    setGame(deal(teamNames(conf), conf.chest, conf.perTeam, have));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.teams, game.chest, Math.max(1, Math.round(game.order.length / game.teams.length)), chestWith(chest, game))); };
  const clear = async () => {
    if (!(await askConfirm({ title: 'კლასის სკივრი გასუფთავდეს?', text: 'სამივე სკივრის ნამღერი ამ ტელეფონიდან წაიშლება — მაგ., სხვა კლასისთვის.', ok: 'გასუფთავება' }))) return;
    setChest({});
  };

  if (open && game) return <ClassGame g={game} chest={chest} setG={play} onClose={() => { setOpen(false); if (isOver(game)) setGameState(null); }} onAgain={again} />;

  const c = chestOfId(conf.chest);
  const n = chestCounts(chest, c.id);
  const turns = conf.teams * conf.perTeam;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: „{chestOfId(game.chest).label}“ · სვლა {turnOf(game) + 1} / {game.order.length}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.teams.map((t, i) => `${t} ${teamScores(game)[i]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <div className="space-y-2.5">
          <p className="text-[13.5px] font-bold text-[#4a3426]">კლასის სკივრი</p>
          <ChestCards chest={chest} on={c.id} onPick={id => setConf({ ...conf, chest: id })} />
        </div>
        <div key={c.id} className="sg-in">
          <p className="text-[12.5px] leading-snug text-[#75685a]">
            {c.sub} · კლასმა გააპრიალა {n.polished}{n.golden ? ` · ოქროსფერი ${n.golden}` : ''} · წერტილები — I, II და III ხმა
          </p>
          <div className="mt-3 grid grid-cols-5 gap-x-1 gap-y-3">
            {c.pearls.map(id => (
              <span key={id} className="flex flex-col items-center">
                <ClassPearl chest={chest} id={id} size={40} />
                <span className="mt-0.5 text-[12px] font-bold tabular-nums text-[#7a2028]">№{pearlOf(id)?.num}</span>
              </span>
            ))}
          </div>
        </div>
      </Card>
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={x => setConf({ ...conf, ...x })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Gem className="w-4 h-4 text-[#7a2028]" /> მარგალიტი თითო გუნდს</p>
          <div className="flex flex-wrap gap-2">
            {PER_TEAM.map(k => <Chip key={k} on={conf.perTeam === k} onClick={() => setConf({ ...conf, perTeam: k })}>{k}</Chip>)}
          </div>
          <p className="text-[12.5px] leading-snug text-[#75685a] tabular-nums">სულ {turns} სვლა · დაახლოებით {Math.max(5, Math.round(turns * 1.5))} წუთი</p>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
      <Hint>
        გუნდები რიგრიგობით იღებენ ტელეფონს. ყოველ სვლაზე — სკივრის ერთი მარგალიტი: გუნდის მომღერალი ირჩევს ხმას, ისმენს მის პირველ
        ფრაზას და მღერის მას ტელეფონში — თავისთვის მოსახერხებელ ტონში. რამდენი პროცენტიც, იმდენი ქულა; 80 %-ზე მარგალიტი
        პრიალდება — კლასის სკივრშიც, რომელიც ამ ტელეფონზე ინახება. ჯერ ის მარგალიტები მოდის, რომლებიც კლასს ყველაზე ნაკლებ ხმაში
        აქვს გაპრიალებული, ასე რომ გაკვეთილიდან გაკვეთილამდე კლასი სამივე სკივრს ავსებს.
      </Hint>
      {Object.keys(chest).length > 0 && (
        <button type="button" onClick={() => { void clear(); }} className="min-h-11 text-[13px] font-bold text-[#7a2028] underline underline-offset-2 cursor-pointer">
          კლასის სკივრის გასუფთავება
        </button>
      )}
    </div>
  );
};
