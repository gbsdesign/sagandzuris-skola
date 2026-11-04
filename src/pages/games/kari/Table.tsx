import React, { useEffect, useState } from 'react';
import { Check, Landmark, Play, RotateCcw, Send, Undo2 } from 'lucide-react';
import {
  ACTS, MAX_KARI, MIN_KARI, ROLES, ROLE_IDS, block, declare, deckSize, doubt, letGo, lose, newKari, parseKari, proof, swapDone, waitingOn,
  type KariGame, type Role,
} from '../../../utils/mepisKari';
import { TableScreen } from '../../../components/games/TableScreen';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Chip } from '../../../components/games/Chip';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { Court, Story, boardOfGame } from './Court';
import { ActionPad } from './Pads';
import { Chronicle, ROLE_LOOK } from './look';

// „მეფის კარი“ on one phone (the hybrid, „კარის მდივანი“): the printed cards stay in the players' hands, the phone keeps the
// coins (no coins to cut out), the turns and the kit's order — claim → doubt → block → doubt on the block → result. Whoever
// holds the phone taps what the table says: the action and its target, who said „არ მჯერა!“, whether the card was shown,
// who blocks, which card was turned. „უკან“ mends a slip; the game is kept on the device after every step (✕ only pauses).

const GAME_KEY = 'sg-kari-table';
const CONF_KEY = 'sg-kari-conf';
const load = (k: string): unknown => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const save = (k: string, v: unknown) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const readGame = () => { const g = parseKari(load(GAME_KEY)); return g?.paper && g.phase.k !== 'end' ? g : null; };
/** who begins: a name from the list, or by lot (empty) */
const readFirst = () => { const v = load(CONF_KEY) as { first?: unknown } | null; return typeof v?.first === 'string' ? v.first : ''; };

/** the courtiers as buttons in their colours (a card turned, a block) */
const RoleButtons: React.FC<{ roles: readonly Role[]; onPick: (r: Role) => void; cols?: string }> = ({ roles, onPick, cols = 'grid-cols-2' }) => (
  <div className={`grid gap-2 ${cols}`}>
    {roles.map(r => {
      const look = ROLE_LOOK[r];
      return (
        <button key={r} type="button" onClick={() => { triggerHaptic(10); onPick(r); }} className="min-h-12 rounded-full px-3 inline-flex items-center justify-center gap-2 text-[14.5px] font-bold text-white cursor-pointer active:scale-[0.98] transition" style={{ background: look.color }}>
          <look.Icon className="w-5 h-5 shrink-0" />{ROLES[r].name}
        </button>
      );
    })}
  </div>
);

const NameChips: React.FC<{ g: KariGame; who: number[]; onPick: (i: number) => void }> = ({ g, who, onPick }) => (
  <div className="flex flex-wrap gap-2">
    {who.map(i => <Chip key={i} on={false} onClick={() => onPick(i)}>{g.players[i].name}</Chip>)}
  </div>
);

const Prompt: React.FC<{ title: React.ReactNode; children?: React.ReactNode; hint?: React.ReactNode }> = ({ title, children, hint }) => (
  <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-2.5">
    <p className="text-[14px] font-bold leading-snug text-[#4a3426]">{title}</p>
    {children}
    {hint && <p className="text-[12.5px] leading-snug text-[#75685a]">{hint}</p>}
  </section>
);

const PaperPlay: React.FC<{ g: KariGame; canBack: boolean; onStep: (g: KariGame) => void; onBack: () => void; onClose: () => void; onAgain: () => void }> = ({
  g, canBack, onStep, onBack, onClose, onAgain,
}) => {
  const [act, setAct] = useState(-1);
  const [target, setTarget] = useState(-1);
  const [all, setAll] = useState(false);
  useEffect(() => { setAct(-1); setTarget(-1); }, [g.step]);
  const ph = g.phase, c = g.claim;
  const b = boardOfGame(g);
  const name = (i: number) => <b>{g.players[i]?.name}</b>;
  const step = (next: KariGame) => { if (next !== g) { triggerHaptic(12); onStep(next); } };
  const needTarget = act >= 0 && ACTS[act].target;
  const last = g.log[g.log.length - 1];

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  switch (ph.k) {
    case 'turn': {
      body = (
        <>
          <ActionPad coins={g.players[g.turn].coins} chosen={act} onChoose={a => { setAct(a); setTarget(-1); }} />
          {needTarget && (
            <Prompt title="ვის?">
              <div className="flex flex-wrap gap-2">
                {g.players.map((p, i) => (i === g.turn || !p.hand.length ? null : <Chip key={i} on={target === i} onClick={() => setTarget(i)}>{p.name} · {p.coins}</Chip>))}
              </div>
            </Prompt>
          )}
        </>
      );
      footer = (
        <Btn size="lg" full disabled={act < 0 || (needTarget && target < 0)} onClick={() => step(declare(g, act, needTarget ? target : -1))} icon={<Send />} className="!h-14 !text-[16px]">
          {act < 0 ? 'რას აცხადებს?' : `${ACTS[act].name}${target >= 0 ? ` → ${g.players[target].name}` : ''}`}
        </Btn>
      );
      break;
    }
    case 'doubt':
      body = (
        <Prompt title="ვინ თქვა „არ მჯერა!“?" hint="ვინც პირველმა ასწია ხელი. ეჭვი მხოლოდ ახლა შეიძლება — სანამ თამაში გაგრძელდება.">
          <NameChips g={g} who={waitingOn(g)} onPick={i => step(doubt(g, i))} />
        </Prompt>
      );
      footer = <Btn size="lg" full onClick={() => step(letGo(g))} icon={<Check />} className="!h-14 !text-[16px]">ყველა ენდობა — გაგრძელება</Btn>;
      break;
    case 'proof': {
      const claimer = ph.on === 'act' ? c!.by : c!.block!.by;
      const role = ph.on === 'act' ? (ACTS[c!.act].claim as Role) : c!.block!.role;
      body = <Prompt title={<>{name(claimer)} აჩვენებს {ROLES[role].dat}?</>} hint="აქვს — აჩვენოს ყველას. არ აქვს ან არ აჩვენებს — ბლეფი იყო." />;
      footer = (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" onClick={() => step(proof(g, false))} className="!h-14 !text-[15px]">ვერ აჩვენა</Btn>
          <Btn size="lg" onClick={() => step(proof(g, true))} className="!h-14 !text-[15px]">აჩვენა</Btn>
        </div>
      );
      break;
    }
    case 'block': {
      const a = ACTS[c!.act];
      body = a.anyone ? (
        <Prompt title={<>ვინ ბლოკავს, როგორც {ROLES[a.blockers[0]].name}?</>}>
          <NameChips g={g} who={waitingOn(g)} onPick={i => step(block(g, i, a.blockers[0]))} />
        </Prompt>
      ) : (
        <Prompt title={<>{name(c!.target)} ბლოკავს?</>}>
          <RoleButtons roles={a.blockers} onPick={r => step(block(g, c!.target, r))} cols={a.blockers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} />
        </Prompt>
      );
      footer = <Btn size="lg" full onClick={() => step(letGo(g))} icon={<Check />} className="!h-14 !text-[16px]">არავინ ბლოკავს</Btn>;
      break;
    }
    case 'lose':
      body = (
        <Prompt
          title={<>{name(ph.who)} კარგავს გავლენას — რომელი ბარათი გადაბრუნდა?</>}
          hint={last?.t === 'doubt' && last.truth ? <>ნაჩვენები ბარათი დასტაში დაბრუნდეს, დასტა აირიოს და {name(last.on)} ახალს აიღებს.</> : 'გადაბრუნებული ბარათი პირაღმა დარჩება მაგიდაზე.'}
        >
          <RoleButtons roles={ROLE_IDS} onPick={r => step(lose(g, ph.who, r))} cols="grid-cols-2 sm:grid-cols-3" />
        </Prompt>
      );
      break;
    case 'swap':
      body = <Prompt title={<>{name(g.turn)} ცვლის ბარათებს</>} hint="იღებს 2 ბარათს დასტიდან, ყველას ნახავს, იტოვებს იმდენს, რამდენიც ეჭირა, დანარჩენ 2-ს დასტაში აბრუნებს და ურევს." />;
      footer = <Btn size="lg" full onClick={() => step(swapDone(g))} icon={<Check />} className="!h-14 !text-[16px]">შესრულდა</Btn>;
      break;
    case 'end':
      footer = (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" onClick={onClose} className="!h-14 !px-3">დახურვა</Btn>
          <Btn size="lg" onClick={onAgain} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
        </div>
      );
      break;
  }

  const back = canBack && ph.k !== 'end' ? (
    <button type="button" onClick={() => { triggerHaptic(8); onBack(); }} aria-label="უკან — ბოლო ნაბიჯის გაუქმება" title="უკან" className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer">
      <Undo2 className="w-5 h-5" />
    </button>
  ) : undefined;

  return (
    <TableScreen title="მეფის კარი" right={back} onClose={onClose} footer={footer}>
      <div className="py-2 space-y-3.5">
        <Story b={b} me={-1} />
        {body}
        <Court b={b} me={-1} />
        <Chronicle log={g.log} names={b.names} n={g.n} all={all} onAll={() => setAll(a => !a)} />
      </div>
    </TableScreen>
  );
};

export const KariTable: React.FC = () => {
  const names = useCircleNames();
  const [game, setGame] = useState<KariGame | null>(readGame);
  const [open, setOpen] = useState(false);
  const [hist, setHist] = useState<KariGame[]>([]);
  const [first, setFirstName] = useState(readFirst);
  useEffect(() => save(GAME_KEY, game && game.phase.k !== 'end' ? game : null), [game]);
  const n = names.length;
  const fits = n >= MIN_KARI && n <= MAX_KARI;
  const starter = names.includes(first) ? first : '';
  const setFirst = (v: string) => { setFirstName(v); save(CONF_KEY, { first: v }); };

  const begin = async () => {
    if (game && !(await askConfirm({ title: 'შეჩერებული თამაში წაიშალოს?', text: 'ახალი თამაში მის ადგილს დაიკავებს.', ok: 'ახალი თამაში' }))) return;
    const g = newKari({ names, paper: true, first: starter ? names.indexOf(starter) : undefined });
    if (!g) return;
    triggerHaptic(20);
    setHist([]);
    setGame(g);
    setOpen(true);
  };
  const close = () => { setOpen(false); if (game?.phase.k === 'end') setGame(null); };
  const again = () => {
    if (!game) return;
    const w = game.phase.k === 'end' ? game.phase.winner : undefined;
    const g = newKari({ names: game.players.map(p => p.name), paper: true, first: w });
    if (!g) return;
    setHist([]);
    setGame(g);
  };

  if (open && game) {
    return (
      <PaperPlay
        g={game}
        canBack={hist.length > 0}
        onStep={next => { setHist(h => [...h.slice(-80), game]); setGame(next); }}
        onBack={() => { const prev = hist[hist.length - 1]; if (prev) { setGame(prev); setHist(h => h.slice(0, -1)); } }}
        onClose={close}
        onAgain={again}
      />
    );
  }

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · სვლა {game.n}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug tabular-nums text-[#75685a]">კარზე რჩება {game.players.filter(p => p.hand.length).length} / {game.players.length}</p>
            </div>
            <Btn onClick={() => { triggerHaptic(10); setHist([]); setOpen(true); }} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames label="მოთამაშეები" hint="ჩაწერე, ვინ ზის მაგიდასთან — რიგით, საათის ისრის მიმართულებით." />
        <p className={`text-[12.5px] leading-snug ${fits ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
          {n < MIN_KARI ? `საჭიროა ${MIN_KARI}–${MAX_KARI} მოთამაშე — კიდევ ${MIN_KARI - n}.`
            : n > MAX_KARI ? `${MAX_KARI}-ზე მეტი: ორ მაგიდად გაიყავით — აქ ${n - MAX_KARI} სახელი მოაკელი.`
            : `${n} მოთამაშე · დასტაში ${deckSize(n)} ბარათი${n >= 7 ? ' (+5 დამატებითი)' : ''}${n === 2 ? ' · დამწყებს 1 თეთრი' : ''}.`}
        </p>
        {fits && (
          <div className="space-y-2">
            <p className="text-[13px] font-bold text-[#4a3426]">ვინ იწყებს?</p>
            <div className="flex flex-wrap gap-2">
              <Chip on={!starter} onClick={() => setFirst('')}>წილისყრით</Chip>
              {names.map(x => <Chip key={x} on={starter === x} onClick={() => setFirst(x)}>{x}</Chip>)}
            </div>
            <p className="text-[12px] leading-snug text-[#9a8b7b]">წესით იწყებს წინა თამაშის გამარჯვებული, პირველად — ყველაზე უმცროსი.</p>
          </div>
        )}
        <Btn size="lg" full disabled={!fits} onClick={() => { void begin(); }} icon={<Landmark />} className="!h-14 !text-[16px]">თამაშის დაწყება</Btn>
      </Card>
      <Card className="!p-4">
        <p className="text-[13px] font-bold text-[#4a3426]">რა გჭირდებათ</p>
        <p className="mt-1 text-[12.5px] leading-snug text-[#75685a]">
          ამოსაბეჭდის კარისკაცის ბარათები ({n >= 7 ? 20 : 15}) — თითოს ორი, პირქვე. თეთრი არ გჭირდებათ: ტელეფონი ითვლის.
        </p>
      </Card>
    </div>
  );
};
