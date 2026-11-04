import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flag, Play, RotateCcw, Timer, Undo2, X } from 'lucide-react';
import { KHAZI_CARDS, khaziCard } from '../../../data/khaziCards';
import { PICK_LABEL, dealDeck, deckOf, isPick, sortLine, type KhaziPick } from '../../../utils/khazi';
import { KHAZI_GOALS, KHAZI_TURN_SECS, newKhaziTeams, parseKhaziTeams, placeCard, timeUp, undo, winners, type KhaziTeams } from '../../../utils/khaziTeams';
import { bell, buzz, chime, closeAudio, openAudio, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm, useWide } from '../../../components/ui/kit';
import { Podium, Standings, TimerRing } from '../rounds/parts';
import { TEAM_TINT, TeamChips, TeamsEditor, readTeams, teamNames, useTurnClock, type TeamsConf } from '../rounds/teams';
import { HandCard, PickChips, TimeLine, type Reveal } from './parts';
import { HowTo } from '../../../components/games/HowTo';

// „დროის ხაზი“ on one screen (the hub's „ჰიბრიდული“, 2026-11-01): the phone on the table or a projector shows the one line of
// the class. In turn a team gets the next card, says where it goes, the host taps that gap; the year opens and judges. Right —
// the card stays in the team's colour, a point; wrong — it goes to its right place, marked. Rules: utils/khaziTeams.ts; the game
// is kept on this phone after every step, ✕ only pauses.

const GAME_KEY = 'sg-khazi-teams';
const CONF_KEY = 'sg-khazi-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const known = (id: string) => !!khaziCard(id);

interface Conf extends TeamsConf { pick: KhaziPick; goal: number; secs: number }
const readConf = (raw: unknown): Conf => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<Conf>;
  return {
    ...readTeams(o),
    pick: isPick(o.pick) ? o.pick : 'all',
    goal: KHAZI_GOALS.includes(o.goal as typeof KHAZI_GOALS[number]) ? o.goal! : 5,
    secs: KHAZI_TURN_SECS.includes(o.secs as typeof KHAZI_TURN_SECS[number]) ? o.secs! : 0,
  };
};

const TeamsGame: React.FC<{ g: KhaziTeams; setG: (g: KhaziTeams) => void; onClose: () => void; onAgain: () => void }> = ({ g, setG, onClose, onAgain }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => { openAudio(audio); return () => closeAudio(audio); }, []);
  const wide = useWide();
  const latest = useRef(g);
  latest.current = g;
  // back on the screen: the turn's clock starts afresh
  useEffect(() => { if (!latest.current.over) setG({ ...latest.current, t0: Date.now() }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // after a placement the verdict stays until „შემდეგი“; a reload goes straight on
  const [reveal, setReveal] = useState<Reveal>(null);
  const hand = !g.over ? khaziCard(g.order[g.at]) ?? null : null;
  const placing = !!hand && !reveal;
  const left = useTurnClock(audio, g.t0, g.secs || 1, placing && g.secs > 0, () => {
    const now = latest.current;
    const id = now.order[now.at];
    buzz(audio.current);
    setG(timeUp(now, Date.now()));
    if (id) setReveal({ id, ok: false });
  });

  const place = (gap: number) => {
    if (!placing || !hand) return;
    const after = placeCard(g, gap, khaziCard, Date.now());
    if (after === g) return;
    const ok = !!after.last?.ok;
    if (ok) chime(audio.current, 3); else buzz(audio.current);
    triggerHaptic(ok ? 20 : 45);
    setG(after);
    setReveal({ id: hand.id, ok });
  };
  const next = () => {
    setReveal(null);
    if (g.over) bell(audio.current);
    setG({ ...g, t0: Date.now() });
  };

  if (g.over && !reveal) {
    const win = winners(g);
    return (
      <TableScreen
        title="დროის ხაზი · შედეგები"
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
          <p className="text-center text-[15px] font-bold text-[#4a3426]">{win.length > 1 ? `ფრეა: ${win.join(', ')}` : `გაიმარჯვა „${win[0]}“-მა`}</p>
          <Standings names={g.names} scores={g.scores} />
          <Card className="!p-3">
            <TimeLine line={sortLine(g.placed, khaziCard)} card={khaziCard} tint={t => TEAM_TINT[t]} big={wide} />
          </Card>
        </div>
      </TableScreen>
    );
  }

  const shown = reveal ? khaziCard(reveal.id) : null;
  const who = g.last && reveal ? g.names[g.last.team] : g.names[g.turn];
  const panel = placing && hand ? (
    <div className="space-y-2">
      <HandCard
        card={hand}
        big={wide}
        hint={<><b style={{ color: TEAM_TINT[g.turn] }}>ჯერი: {g.names[g.turn]}</b> — სად ჩაჯდება? გუნდი ამბობს, შენ „აქ ჩასვი“-ს ეხები.</>}
      />
      <Btn kind="ghost" full icon={<Undo2 />} disabled={!g.prev} onClick={() => { setReveal(null); setG(undo(g, Date.now())); }}>წინა სვლის გაუქმება</Btn>
    </div>
  ) : shown && reveal ? (
    <div className="space-y-2">
      <p
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[16px] lg:text-[18px] font-bold ${reveal.ok ? 'bg-[#e6f2e9] text-[#2f7d4f]' : 'bg-[#fde8e8] text-[#b23a48]'}`}
        role="status"
      >
        {reveal.ok ? <Check className="w-5 h-5 shrink-0" /> : <X className="w-5 h-5 shrink-0" />}
        {reveal.ok ? `სწორია! ${shown.label} · ${who} +1` : `არა — ${shown.label}. ბარათი თავის ადგილზე დადგა.`}
      </p>
      <Btn size="lg" full icon={g.over ? <Flag /> : <Play />} onClick={next} className="!h-14 !text-[15.5px]">{g.over ? 'შედეგები' : 'შემდეგი გუნდი'}</Btn>
    </div>
  ) : null;

  return (
    <TableScreen title={`დროის ხაზი · ${PICK_LABEL[g.pick]}`} onClose={onClose} footer={wide ? undefined : panel}>
      {/* a phone: the teams, the line, the card at the foot; a wide screen (a projector): the line left, the rest right */}
      <div className="py-2 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-x-6 lg:items-start">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-2">
          <TeamChips names={g.names} scores={g.scores} turn={placing ? g.turn : -1} />
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-[#75685a]">
              მიზანი — {g.goal} ბარათი · დასტაში დარჩა {Math.max(0, g.order.length - g.at)}
            </p>
            {placing && g.secs > 0 && <TimerRing left={left} total={g.secs} size="sm" />}
          </div>
          {wide && panel}
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <TimeLine line={sortLine(g.placed, khaziCard)} card={khaziCard} onGap={placing ? place : undefined} reveal={reveal} tint={t => TEAM_TINT[t]} big={wide} />
        </div>
      </div>
    </TableScreen>
  );
};

export const KhaziTable: React.FC = () => {
  const [conf, setConfState] = useState<Conf>(() => readConf(load(CONF_KEY)));
  const setConf = (c: Conf) => { setConfState(c); save(CONF_KEY, c); };
  const [game, setGameState] = useState<KhaziTeams | null>(() => { const g = parseKhaziTeams(load(GAME_KEY), known); return g && !g.over ? g : null; });
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: KhaziTeams | null) => { setGameState(g); save(GAME_KEY, g && !g.over ? g : null); }, []);

  const deal = (names: string[], c: Conf) =>
    newKhaziTeams(names, c.pick, dealDeck(KHAZI_CARDS, c.pick, Math.floor(Math.random() * 2 ** 31)), c.goal, c.secs, Date.now());
  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(deal(teamNames(conf), conf));
    setOpen(true);
  };
  const again = () => { if (game) setGame(deal(game.names, { ...conf, pick: game.pick, goal: game.goal, secs: game.secs })); };
  // a deck smaller than the teams' goals together can end before anyone reaches it — say so
  const size = deckOf(KHAZI_CARDS, conf.pick).length;

  if (open && game) return <TeamsGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული: {PICK_LABEL[game.pick]} · ხაზზე {game.placed.length} ბარათი</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((n, t) => `${n} ${game.scores[t]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <HowTo id="khazi-table" steps={[
        'ეკრანი მთელ კლასს ერთ ხაზს აჩვენებს: ის ერთი ბარათით იწყება, თავისი წლით.',
        'თითო გუნდი რიგრიგობით იღებს ახალ ბარათს (წელი არ ჩანს) და ამბობს, სად ჩაჯდება: ზემოთ ადრეა, ქვემოთ — გვიან.',
        'მასწავლებელი იქ აჭერს „აქ ჩასვი“-ს და წელი იხსნება. სწორია — ბარათი გუნდის ფერით რჩება და გუნდს ქულა ეწერება; არასწორია — ბარათი თავის ადგილზე დგება.',
        'ჯერი ყოველთვის გადადის. ვინც მიზანს მიაღწევს, წრე მაინც ბოლომდე მიდის, რომ ყველას თანაბარი სვლა ჰქონდეს. „წირვის რიგში“ წლის ნაცვლად წირვის ნაწილის ადგილია.',
      ]} />
      <Card className="!p-4 space-y-4">
        <TeamsEditor conf={conf} onChange={c => setConf({ ...conf, ...c })} />
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426]">ბარათები</p>
          <PickChips value={conf.pick} onChange={p => setConf({ ...conf, pick: p })} />
          <p className="text-[12.5px] text-[#75685a]">დასტაში {size} ბარათია.</p>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Flag className="w-4 h-4 text-[#7a2028]" /> მიზანი — სწორად ჩასმული ბარათი</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="მიზანი">
            {KHAZI_GOALS.map(n => <Chip key={n} on={conf.goal === n} onClick={() => setConf({ ...conf, goal: n })}>{n}</Chip>)}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> დრო სვლაზე</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="დრო სვლაზე">
            {KHAZI_TURN_SECS.map(s => <Chip key={s} on={conf.secs === s} onClick={() => setConf({ ...conf, secs: s })}>{s ? `${s} წამი` : 'უსაათოდ'}</Chip>)}
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">დაწყება</Btn>
    </div>
  );
};
