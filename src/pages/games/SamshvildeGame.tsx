import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Moon, Play, Plus, Printer, Smartphone, Users, Wifi, X } from 'lucide-react';
import { useAuth } from '../../context';
import { useManagedClasses, useMyClasses, useTeachingClasses, type SchoolClass } from '../../hooks/useClasses';
import {
  MAX_PLAYERS, MIN_PLAYERS, ROLES, dayNext, dealNext, introNext, kidsAllowed, live, morningNext, newGame, nightNext, parseGame, piperOptional,
  roleCounts, roleSet, tieNext, verdictNext, voteDone,
  type Deal, type SamGame,
} from '../../utils/samshvilde';
import { MAX_NAMES, MAX_NAME_LEN, cleanName } from '../../utils/gatvla';
import { Btn, Card, FIELD, Tabs, Toggle, askConfirm } from '../../components/ui/kit';
import { Chip } from '../../components/games/Chip';
import { closeAudio } from '../../utils/gameSounds';
import { triggerHaptic } from '../../utils/haptics';
import { useOpenRequest } from '../../utils/searchOpen';
import { rooms, useRoom } from '../../utils/gameRoomFirestore';
import { ROLE_ICON, RosterBtn } from './samshvilde/parts';
import { OnlineRoom } from './samshvilde/online/OnlineRoom';
import { OnlineSetup, meOf } from './samshvilde/online/OnlineSetup';
import { NightScreen } from './samshvilde/NightScreen';
import { DayScreen, DealScreen, IntroScreen, MorningScreen, TieScreen, VerdictScreen, VoteScreen } from './samshvilde/DayScreens';
import { EndScreen, RosterScreen } from './samshvilde/EndScreen';

// „სამშვილდის ღამე“ on the phone (games hub, 2026-10-30, live, hybrid): the school's Mafia, the same game as the printed
// kit (public/games/print/samshvildis-game.pdf). The user's answers „1ა 2ა“: the printed roles and words; the roles are
// dealt by the phone passed round, or the printed cards are dealt and the host marks on the first night who woke up.
// The phone is the host's (მემატიანე) helper: the night's words and choices, the morning, the speeches' clock, the
// accusations, the hands, and the chronicle at the end. The game is kept on the device after every step (✕ only pauses)
// and „უკან“ goes one step back. Rules utils/samshvilde.ts, screens pages/games/samshvilde/.
// Online (the same evening, the user's „მთავარი თამაშია“, answers „1ა 2ა + ზარი 3ა“): anybody in a class opens a room and
// is its host; the class is invited (chat, phone, the strip on top); everybody plays on their own phone, in the game's own
// call. Engine utils/samshvildeOnline.ts, the room utils/gameRoom.ts, screens pages/games/samshvilde/online/.

const KEY = 'sg-samshvilde';
const GAME_KEY = 'sg-samshvilde-game';
const PRINT = '/games/print/samshvildis-game.pdf';

type Mode = 'online' | 'table';
interface Conf { names: string[]; piper: boolean; kids: boolean; deal: Deal; mode?: Mode }

const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, value: unknown) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};
const readConf = (): Conf => {
  const o = load(KEY) as Partial<Conf> | null;
  const names = Array.isArray(o?.names) ? [...new Set(o.names.map(n => cleanName(String(n))).filter(Boolean))].slice(0, MAX_NAMES) : [];
  return { names, piper: !!o?.piper, kids: !!o?.kids, deal: o?.deal === 'cards' ? 'cards' : 'phone', mode: o?.mode === 'online' || o?.mode === 'table' ? o.mode : undefined };
};
const readGame = () => { const g = parseGame(load(GAME_KEY)); return g && g.phase.kind !== 'end' ? g : null; };

const phaseLabel = (g: SamGame) => {
  const ph = g.phase;
  switch (ph.kind) {
    case 'deal': return `დარიგება · ${ph.at + 1} / ${g.players.length}`;
    case 'night': return ph.n === 1 ? 'პირველი ღამე' : `ღამე ${ph.n}`;
    case 'morning': return `დილა ${ph.n}`;
    case 'intro': return 'გაცნობის ბჭობა';
    case 'end': return 'დასრულდა';
    default: return `ბჭობა ${ph.n}`;
  }
};

const SamshvildeGame: React.FC = () => {
  const [conf, setConf] = useState(readConf);
  const [game, setGame] = useState<SamGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<SamGame[]>([]);
  const [roster, setRoster] = useState(false);
  const [draft, setDraft] = useState('');
  const [rolesOpen, setRolesOpen] = useState(false);
  const { classes } = useManagedClasses();
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);

  // ——— online: my classes (as a member or their teacher), this phone's room, the room's screen
  const { user, isAdmin } = useAuth();
  const uid = user?.uid || '';
  const member = useMyClasses(uid);
  const { classes: teaching } = useTeachingClasses(uid || null);
  const mine = useMemo(
    () => [...member, ...teaching.filter(t => !member.some(m => m.id === t.id))].sort((a, b) => a.name.localeCompare(b.name, 'ka')),
    [member, teaching],
  );
  const session = useRoom();
  const [roomOpen, setRoomOpen] = useState(false);
  const showRoom = roomOpen && !!session;
  const joinWish = useRef<{ key: string; at: number } | null>(null);
  const [nudge, setNudge] = useState(0);
  // the online game is the main one for a signed-in member; a guest starts with the one phone
  const mode: Mode = conf.mode ?? (uid ? 'online' : 'table');
  useEffect(() => { rooms.setVisible(showRoom); }, [showRoom]);
  useEffect(() => () => rooms.setVisible(false), []);

  // the game is kept after every step (a finished one is let go)
  useEffect(() => save(GAME_KEY, game && game.phase.kind !== 'end' ? game : null), [game]);

  const setC = (patch: Partial<Conf>) => setConf(c => { const next = { ...c, ...patch }; save(KEY, next); return next; });

  /** into a room (an invitation, a row of the list, a new room): one room at a time on this phone */
  const enter = async (classId: string, roomId: string) => {
    if (!user) return;
    const cur = rooms.get();
    if (cur && (cur.classId !== classId || cur.roomId !== roomId) && cur.room?.host === uid && cur.room.status !== 'over') {
      const ok = await askConfirm({ title: 'შენს ოთახს ტოვებ?', text: 'შენ ხარ მემატიანე: სანამ არ დაბრუნდები, იქ თამაში შეჩერებულია. ოთახი ამ გვერდზე დაგხვდება.', ok: 'გადასვლა' });
      if (!ok) return;
    }
    rooms.open(classId, roomId, meOf(user, mine.find(c => c.id === classId)));
    joinWish.current = { key: `${classId}/${roomId}`, at: Date.now() };
    setRoomOpen(true);
    if (conf.mode !== 'online') setC({ mode: 'online' });
  };
  useOpenRequest('samshvilde', id => {
    const [classId, roomId] = id.split('/');
    if (classId && roomId) void enter(classId, roomId);
  });
  // an invitation's „შესვლა“ joins the lobby once the room is known (not the host's own, not twice), named as the class's
  // list names me — an invitation opened at once waits up to 4 s for that list
  useEffect(() => {
    const s = session;
    const w = joinWish.current;
    if (!s || !user || s.room === undefined || w?.key !== `${s.classId}/${s.roomId}`) return;
    const cls = mine.find(c => c.id === s.classId);
    const wait = 4000 - (Date.now() - w.at);
    if (!cls && wait > 0) {
      const t = setTimeout(() => setNudge(n => n + 1), wait);
      return () => clearTimeout(t);
    }
    joinWish.current = null;
    if (s.room && s.room.status === 'lobby' && s.room.host !== s.me.uid && !s.joins.some(j => j.uid === s.me.uid)) void rooms.join(meOf(user, cls));
  }, [session, mine, nudge, user]);
  const addName = (raw: string) => {
    const n = cleanName(raw);
    setDraft('');
    if (!n || conf.names.includes(n) || conf.names.length >= MAX_NAMES) return;
    triggerHaptic(5);
    setC({ names: [...conf.names, n] });
  };
  const removeName = (n: string) => { triggerHaptic(5); setC({ names: conf.names.filter(x => x !== n) }); };
  const addClass = (c: SchoolClass) => {
    triggerHaptic(10);
    const add = c.members.map(m => cleanName(m.name)).filter(n => n && !conf.names.includes(n));
    setC({ names: [...new Set([...conf.names, ...add])].slice(0, MAX_NAMES) });
  };
  const clearNames = async () => { if (await askConfirm('ყველა სახელი წაიშალოს?')) setC({ names: [] }); };

  const n = conf.names.length;
  const fits = n >= MIN_PLAYERS && n <= MAX_PLAYERS;
  const kids = conf.kids && kidsAllowed(n);
  const roles = fits ? roleSet({ players: n, piper: conf.piper, kids }) : [];

  // ——— the game's steps

  const go = (next: SamGame) => {
    if (!game || next === game) return;
    setHist(h => [...h.slice(-60), game]);
    setGame(next);
  };
  const prev = hist[hist.length - 1];
  const back = prev && prev.phase.kind !== 'deal' ? () => { setGame(prev); setHist(h => h.slice(0, -1)); } : undefined;

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newGame(conf.names, { deal: conf.deal, piper: conf.piper, kids: conf.kids });
    if (!g) return;
    triggerHaptic(20);
    setHist([]);
    setRoster(false);
    setGame(g);
    setOpen(true);
  };
  const resume = () => {
    if (!game) return;
    triggerHaptic(10);
    // a card left open goes face down again: the phone may be in somebody else's hands now
    if (game.phase.kind === 'deal' && game.phase.show) setGame({ ...game, phase: { ...game.phase, show: false } });
    setHist([]);
    setOpen(true);
  };
  const close = () => { setOpen(false); setRoster(false); if (game?.phase.kind === 'end') setGame(null); };
  const again = () => {
    if (!game) return;
    const g = newGame(game.players.map(p => p.name), { deal: game.deal, piper: game.roles.includes('piper'), kids: game.kids });
    if (!g) return;
    setHist([]);
    setGame(g);
  };
  const openRoster = async () => {
    if (await askConfirm({ title: 'მემატიანის ცხრილი გაიხსნას?', text: 'აქ ყველას როლი ჩანს. გახსენი მხოლოდ მაშინ, როცა ეკრანს სხვა ვერ ხედავს.', ok: 'გახსნა' })) setRoster(true);
  };

  if (showRoom && session) {
    return (
      <OnlineRoom
        snap={session}
        who={user ? meOf(user, mine.find(c => c.id === session.classId)) : undefined}
        className={mine.find(c => c.id === session.classId)?.name ?? ''}
        opts={{ piper: conf.piper, kids: conf.kids }}
        setOpts={o => setC(o)}
        onHide={() => setRoomOpen(false)}
      />
    );
  }

  if (open && game) {
    const ph = game.phase;
    const night = ph.kind === 'night';
    const right = <RosterBtn dark={night} onClick={openRoster} />;
    const common = { g: game, right, onBack: back, onClose: close };
    if (roster) return <RosterScreen g={game} onClose={() => setRoster(false)} />;
    switch (ph.kind) {
      case 'deal': return <DealScreen g={game} onClose={close} onNext={() => go(dealNext(game))} />;
      case 'night':
        return (
          <NightScreen
            {...common}
            audio={audio}
            onChange={p => setGame({ ...game, phase: { ...ph, acts: p.acts ?? ph.acts, marks: p.marks ?? ph.marks } })}
            onNext={() => go(nightNext(game))}
          />
        );
      case 'morning': return <MorningScreen {...common} onNext={() => go(morningNext(game))} />;
      case 'intro': return <IntroScreen {...common} onNext={() => go(introNext(game))} />;
      case 'day':
        return <DayScreen {...common} audio={audio} onAccuse={a => setGame({ ...game, phase: { ...ph, accuse: ph.accuse.map((x, k) => (k === ph.at ? a : x)) } })} onNext={() => go(dayNext(game))} />;
      case 'vote': return <VoteScreen {...common} onCounts={counts => setGame({ ...game, phase: { ...ph, counts } })} onNext={() => go(voteDone(game))} />;
      case 'tie': return <TieScreen {...common} audio={audio} onNext={() => go(tieNext(game))} />;
      case 'verdict': return <VerdictScreen {...common} onNext={() => go(verdictNext(game))} />;
      case 'end': return <EndScreen g={game} onClose={close} onAgain={again} />;
    }
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Card tone="wine" className="!p-4 sm:!p-5">
        <p className="font-serif-ge text-[17px] font-bold leading-snug">სამშვილდის ღამე</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          1121 წელი, დიდგორის ბრძოლის წინ. სამშვილდის მკვიდრთა შორის მტრის ჯაშუშები იმალებიან: ღამით ერთ ქალაქელს ტყვედ იტაცებენ,
          დილით ქალაქი ბჭობს და ხმით წყვეტს, ვინ ჩასვას ციხეში. ქალაქი იმარჯვებს, როცა ყველა ჯაშუში ციხეშია; ჯაშუშები — როცა
          მათი რიცხვი დანარჩენებს გაუტოლდება.
        </p>
        <p className="mt-2 text-[12.5px] leading-snug text-[#fbf6ec]/85">
          {mode === 'online'
            ? 'ონლაინ: ყველა თავის ტელეფონზე ფარულად ნახულობს თავის როლს, ღამის არჩევანს თვითონ აკეთებს და ხმასაც ტელეფონზე აძლევს. ერთი არ თამაშობს — მემატიანე: ოთახს ხსნის, კლასს იწვევს და თამაშს უძღვება, ღამის სიტყვებს თამაშის ზარში კითხულობს.'
            : 'ერთი არ თამაშობს — ის მემატიანეა და ტელეფონი მას უჭირავს: ტელეფონი ღამის სიტყვებს აჩვენებს, ღამეს თვითონ ითვლის, ბჭობაზე დროს ზომავს და ხმებს ითვლის, ბოლოს კი მატიანეს ჰყვება.'}
        </p>
      </Card>

      <Tabs
        cols={2}
        value={mode}
        onChange={m => setC({ mode: m })}
        items={[{ id: 'online', label: 'ონლაინ', Icon: Wifi }, { id: 'table', label: 'ერთი ტელეფონით', Icon: Smartphone }]}
      />

      {mode === 'online' ? (
        <OnlineSetup user={user} isAdmin={isAdmin} classes={mine} session={session} onEnter={(c, r) => { void enter(c, r); }} onResume={() => setRoomOpen(true)} />
      ) : (
        <>
          {game && (
            <Card className="!p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 basis-52">
                  <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · {phaseLabel(game)}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">თამაშშია {live(game).length} / {game.players.length}</p>
                </div>
                <Btn onClick={resume} icon={<Play />}>გაგრძელება</Btn>
              </div>
            </Card>
          )}

          <Card className="!p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Users className="w-4 h-4 text-[#7a2028]" /> ვინ თამაშობს · {n}</p>
              {n > 0 && <button type="button" onClick={clearNames} className="h-8 px-2.5 rounded-full text-[12px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">გასუფთავება</button>}
            </div>
            {n > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {conf.names.map(x => (
                  <li key={x} className="inline-flex items-center h-9 pl-3 pr-1 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13.5px] font-bold text-[#4a3426]">
                    {x}
                    <button type="button" onClick={() => removeName(x)} aria-label={`${x} — წაშლა`} className="w-7 h-7 ml-0.5 rounded-full flex items-center justify-center text-[#9a8b7b] hover:text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] text-[#9a8b7b]">ჯერ არავინაა — ჩაწერე სახელები ან დაამატე კლასი. მემატიანე აქ არ ჩაიწერება.</p>}
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); addName(draft); }}>
              <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="სახელი" aria-label="სახელი" maxLength={MAX_NAME_LEN} autoComplete="off" className={FIELD} />
              <Btn type="submit" icon={<Plus />} disabled={!cleanName(draft) || n >= MAX_NAMES} className="shrink-0">დამატება</Btn>
            </form>
            {classes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {classes.map(c => <Chip key={c.id} on={false} onClick={() => addClass(c)}>+ {c.name} · {c.members.length}</Chip>)}
              </div>
            )}
            <p className={`text-[12.5px] leading-snug ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
              {n < MIN_PLAYERS ? `საჭიროა ${MIN_PLAYERS}–${MAX_PLAYERS} მოთამაშე — კიდევ ${MIN_PLAYERS - n}.`
                : n > MAX_PLAYERS ? `${MAX_PLAYERS}-ზე მეტი: ორ მაგიდად გაიყავით, ორი მემატიანით — აქ ${n - MAX_PLAYERS} სახელი მოაკელი.`
                : `${n} მოთამაშე და მემატიანე.`}
            </p>
          </Card>

          {fits && (
            <Card className="!p-4 space-y-3">
              <p className="text-[13px] font-bold text-[#4a3426] flex items-center gap-1.5"><Moon className="w-4 h-4 text-[#7a2028]" /> როლები · {n} მოთამაშე</p>
              <ul className="flex flex-wrap gap-1.5">
                {roleCounts(roles).map(({ id, n: k }) => {
                  const Ic = ROLE_ICON[id];
                  return (
                    <li key={id} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-[#fbf6ec] ring-1 ring-[#e8dcc8] text-[13px] font-bold text-[#4a3426]">
                      <Ic className="w-4 h-4 text-[#7a2028]" />{ROLES[id].name}{k > 1 && <span className="tabular-nums text-[#7a2028]">×{k}</span>}
                    </li>
                  );
                })}
              </ul>
              {piperOptional(n) && !kids && (
                <Toggle on={conf.piper} onChange={v => setC({ piper: v })} label="მესტვირე" hint="გამოცდილი ჯგუფისთვის: ღამით ერთს აძინებს. მაშინ ერთი მოქალაქე ნაკლებია." />
              )}
              {kidsAllowed(n) && (
                <Toggle on={conf.kids} onChange={v => setC({ kids: v })} label="პატარებისთვის" hint="მხოლოდ ჯაშუშები, ციხისთავი, მკურნალი და მოქალაქეები; სიტყვა 30 წამი." />
              )}
              <button type="button" onClick={() => setRolesOpen(o => !o)} aria-expanded={rolesOpen} className="w-full flex items-center justify-between gap-2 h-10 text-[13px] font-bold text-[#7a2028] cursor-pointer">
                რას აკეთებს თითო როლი
                <ChevronDown className={`w-4 h-4 transition-transform ${rolesOpen ? 'rotate-180' : ''}`} />
              </button>
              {rolesOpen && (
                <ul className="space-y-2">
                  {roleCounts(roles).map(({ id }) => {
                    const Ic = ROLE_ICON[id];
                    return (
                      <li key={id} className="flex gap-3 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] px-3 py-2.5">
                        <Ic className="w-5 h-5 shrink-0 mt-0.5 text-[#7a2028]" />
                        <p className="text-[13px] leading-snug text-[#4a3426]"><b>{ROLES[id].name}.</b> {ROLES[id].text}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          <Card className="!p-4 space-y-3">
            <p className="text-[13px] font-bold text-[#4a3426]">როლებს ვინ არიგებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={conf.deal === 'phone'} onClick={() => setC({ deal: 'phone' })}><span className="inline-flex items-center gap-1.5"><Smartphone className="w-4 h-4" />ტელეფონი</span></Chip>
              <Chip on={conf.deal === 'cards'} onClick={() => setC({ deal: 'cards' })}><span className="inline-flex items-center gap-1.5"><Printer className="w-4 h-4" />დაბეჭდილი ბარათები</span></Chip>
            </div>
            <p className="text-[12.5px] leading-snug text-[#75685a]">
              {conf.deal === 'phone'
                ? 'ტელეფონი ხელიდან ხელში გადადის და ყველა ფარულად ნახულობს თავის როლს. ბარათები არ სჭირდება.'
                : 'მემატიანე დაბეჭდილ ბარათებს ურიგებს. პირველ ღამეს, როცა როლები იღვიძებენ, ტელეფონში მონიშნავს, ვინ ვინაა.'}
            </p>
            {conf.deal === 'cards' && (
              <a href={PRINT} target="_blank" rel="noopener" className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full bg-[#7a2028]/[0.08] text-[13px] font-bold text-[#7a2028] hover:bg-[#7a2028]/[0.14]">
                <Printer className="w-4 h-4" /> დასაბეჭდი ფურცლები (PDF)
              </a>
            )}
          </Card>

          <div className="space-y-2">
            <Btn size="lg" full disabled={!fits} onClick={begin} icon={<Moon />} className="!h-14 !text-[16px]">{game ? 'ახალი თამაში' : 'თამაშის დაწყება'}</Btn>
            {!fits && <p className="text-center text-[12.5px] text-[#9a8b7b]">ჩაწერე {MIN_PLAYERS}-დან {MAX_PLAYERS}-მდე სახელი.</p>}
          </div>
        </>
      )}
    </div>
  );
};

export default SamshvildeGame;
