import React, { useState } from 'react';
import { Check, Eye, EyeOff, Gavel, Hand, Lock, Moon, Sun, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import {
  KIDS_SPEECH, ROLES, SPEECH, TIE_SPEECH, accusedOf, isSpy, majority,
  type Answer, type Player,
} from '../../../../utils/samshvilde';
import { NO, type NightAsk, type PubPhase, type PubView, type SeatView } from '../../../../utils/samshvildeOnline';
import type { MyAct } from '../../../../utils/gameRoom';
import { TableScreen } from '../../../../components/games/TableScreen';
import { Btn } from '../../../../components/ui/kit';
import { openAudio, type AudioRef } from '../../../../utils/gameSounds';
import { triggerHaptic } from '../../../../utils/haptics';
import { HandsList, Hint, NameGrid, ROLE_ICON, RoleCard, Words } from '../parts';
import { wordsOf } from '../NightScreen';
import { Order, Speaker } from '../DayScreens';
import { EndScreen } from '../EndScreen';
import { CallBtn, useHush, type GameCall } from './GameCall';
import { CardBack, ObserverLine, RoleBtn, SeenList, WaitHost } from './bits';

// A player's own phone in the online game: the room's public view (names, who is out, the phase — never anybody's role)
// and the player's own seat (their card, whom they know, the night's question to them). Every answer goes to the host's
// phone as an act on the step's key (`onAct`); the host's phone moves the game on. Someone in the class who is not in
// the game only watches. The night looks the same on every phone from afar: dark, the host's words, and only the one
// whose role wakes sees the names.

type Ph<K extends PubPhase['kind']> = Extract<PubPhase, { kind: K }>;

interface Ctx {
  view: PubView;
  names: string[];
  /** my seat (-1: only watching) */
  me: number;
  seat: SeatView | null;
  /** my answer to this very step (shown at once, before the host's phone takes it) */
  mine: MyAct | null;
  playing: boolean;
  audio: AudioRef;
  act: (pick: number | null, end?: boolean) => void;
  right: (dark?: boolean) => React.ReactNode;
  onHide: () => void;
}

const BIG = '!h-14 !text-[16px]';
const asPlayers = (names: string[]) => names.map(name => ({ name }));

const Screen: React.FC<{ ctx: Ctx; title: React.ReactNode; night?: boolean; footer?: React.ReactNode; children: React.ReactNode }> = ({ ctx, title, night, footer, children }) => (
  <TableScreen tone={night ? 'night' : 'day'} title={title} right={ctx.right(night)} onClose={ctx.onHide} footer={footer}>
    <div className="py-2 space-y-4">{children}</div>
  </TableScreen>
);

const MoonTitle: React.FC<{ n: number }> = ({ n }) => (
  <span className="inline-flex items-center gap-2"><Moon className="w-4 h-4 text-[#e2c27a]" />{n === 1 ? 'პირველი ღამე' : `ღამე ${n}`}</span>
);

// ——— the deal

const Deal: React.FC<{ ctx: Ctx; ph: Ph<'deal'> }> = ({ ctx, ph }) => {
  const [show, setShow] = useState(false);
  const { seat, me, names } = ctx;
  const done = ph.seen.includes(me) || ctx.mine?.pick === 1;
  if (show && seat) {
    return (
      <Screen
        ctx={ctx}
        title="შენი როლი"
        footer={<Btn size="lg" full icon={<EyeOff />} onClick={() => { setShow(false); if (!done) ctx.act(1); }} className={BIG}>დავიმახსოვრე — დამალე</Btn>}
      >
        <RoleCard p={{ name: names[me], role: seat.role, trade: seat.trade }} />
      </Screen>
    );
  }
  if (me >= 0 && !done) {
    return (
      <Screen
        ctx={ctx}
        title="შენი როლი"
        footer={<Btn size="lg" full icon={<Eye />} disabled={!seat} onClick={() => { openAudio(ctx.audio); setShow(true); }} className={BIG}>{seat ? 'ჩემი როლის ნახვა' : 'ბარათი მოდის…'}</Btn>}
      >
        <div className="pt-2"><CardBack /></div>
        <Hint className="text-center max-w-xs mx-auto">ნახე ისე, რომ ეკრანი სხვამ ვერ დაინახოს — არც ვიდეოში. დაიმახსოვრე და დამალე.</Hint>
      </Screen>
    );
  }
  return (
    <Screen ctx={ctx} title="როლების დარიგება">
      <ObserverLine me={me} out={null} />
      {me >= 0 && (
        <div className="rounded-2xl bg-[#2f7d4f]/10 ring-1 ring-[#2f7d4f]/20 px-4 py-3.5 flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-full bg-[#2f7d4f] text-white flex items-center justify-center"><Check className="w-5 h-5" /></span>
          <p className="text-[15px] font-bold leading-snug text-[#24603d]">შენი როლი ნახე. ზემოთ <Eye className="inline w-4 h-4 -mt-0.5" /> ღილაკით ისევ ნახავ.</p>
        </div>
      )}
      <SeenList names={names} seen={ph.seen} />
      <WaitHost>როცა ყველა ნახავს, მემატიანე ღამეს დაიწყებს.</WaitHost>
    </Screen>
  );
};

// ——— the night

const Answered: React.FC<{ answer: Answer | null; name: string }> = ({ answer, name }) => {
  if (!answer) return null;
  const look = answer === 'spy'
    ? { Icon: ThumbsUp, head: 'ჯაშუშია!', tone: 'bg-[#e2c27a] text-[#241f36]' }
    : answer === 'no'
      ? { Icon: ThumbsDown, head: 'ჯაშუში არაა', tone: 'bg-white/[0.1] text-[#f5ecdc] ring-1 ring-white/20' }
      : { Icon: Hand, head: 'ამ ღამეს პასუხი არ არის', tone: 'bg-white/[0.1] text-[#f5ecdc] ring-1 ring-white/20' };
  return (
    <div className={`rounded-2xl px-4 py-4 flex items-center gap-3 ${look.tone}`} role="status">
      <look.Icon className="w-8 h-8 shrink-0" />
      <div className="min-w-0">
        {answer !== 'none' && <p className="text-[13px] font-bold opacity-80 [overflow-wrap:anywhere]">{name}</p>}
        <p className="font-serif-ge text-[21px] font-bold leading-snug">{look.head}</p>
      </div>
    </div>
  );
};

/** whom the seat knows: the spies their den, the warden and the guard each other */
const Mates: React.FC<{ seat: SeatView; names: string[]; dark?: boolean }> = ({ seat, names, dark }) => (
  <ul className="space-y-1.5">
    {seat.mates.map(m => {
      const Ic = ROLE_ICON[m.role];
      return (
        <li key={m.i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${dark ? 'bg-white/[0.07] ring-1 ring-white/15' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
          <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${dark ? 'bg-[#e2c27a]/15 text-[#e2c27a]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}><Ic className="w-[18px] h-[18px]" /></span>
          <span className={`min-w-0 flex-1 text-[15px] font-bold leading-tight [overflow-wrap:anywhere] ${dark ? 'text-[#f5ecdc]' : 'text-[#4a3426]'}`}>{names[m.i]}</span>
          <span className={`shrink-0 text-[12.5px] font-bold ${dark ? 'text-[#e2c27a]' : 'text-[#7a2028]'}`}>{ROLES[m.role].name}</span>
        </li>
      );
    })}
  </ul>
);

const Spies: React.FC<{ ctx: Ctx; ask: Extract<NightAsk, { step: 'spies' }> }> = ({ ctx, ask }) => {
  const { names, me } = ctx;
  const minePick = ctx.mine?.key === ask.key ? ctx.mine.pick : ask.den.find(d => d.i === me)?.pick ?? null;
  const den = ask.den.map(d => (d.i === me ? { ...d, pick: minePick } : d));
  const first = den[0]?.pick ?? null;
  const agreed = den.length > 0 && first !== null && den.every(d => d.pick === first) ? first : null;
  const thinking = den.filter(d => d.pick === null && d.i !== me);
  const others = (i: number) => {
    const who = den.filter(d => d.pick === i && d.i !== me);
    return who.length ? <span className="block mt-0.5 text-[12px] font-normal opacity-80 [overflow-wrap:anywhere]">{who.map(d => names[d.i]).join(', ')}</span> : null;
  };
  return (
    <>
      <NameGrid dark players={asPlayers(names)} ids={ask.targets} picked={minePick !== null ? [minePick] : []} onPick={i => ctx.act(minePick === i ? null : i)} note={others} label="ვინ მიგყავთ ტყვედ?" />
      {agreed !== null ? (
        <p className="rounded-2xl bg-[#e2c27a] px-4 py-3 text-[15px] font-bold leading-snug text-[#241f36]" role="status">შეთანხმდით: {names[agreed]}</p>
      ) : (
        <Hint dark>
          ყველამ ერთი სახელი უნდა აირჩიოს{thinking.length ? ` · ჯერ ფიქრობს: ${thinking.map(d => names[d.i]).join(', ')}` : ''}.{' '}
          {ask.boss < 0 ? 'თუ ვერ შეთანხმდით, ამ ღამეს არავინ მიგყავთ.' : ask.boss === me ? 'თუ ვერ შეთანხმდით, შენი არჩევანი ჩაითვლება.' : `თუ ვერ შეთანხმდით, თავკაცის (${names[ask.boss]}) არჩევანი ჩაითვლება.`}
        </Hint>
      )}
    </>
  );
};

const CheckAsk: React.FC<{ ctx: Ctx; ask: Extract<NightAsk, { step: 'check' }> }> = ({ ctx, ask }) => {
  const { names, me } = ctx;
  const [sel, setSel] = useState<number | null>(null);
  const sent = ctx.mine?.key === ask.key && ctx.mine.pick !== null;
  if (ask.pick !== null) {
    return (
      <>
        {ask.by !== me && <Hint dark>{names[ask.by]} შეამოწმა:</Hint>}
        <Answered answer={ask.answer} name={names[ask.pick]} />
        <Hint dark>დაიმახსოვრე. მემატიანე მალე დაგაძინებს.</Hint>
      </>
    );
  }
  if (ask.by !== me) return <p className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 px-4 py-3 text-[15px] leading-snug text-[#f5ecdc]"><b>{names[ask.by]}</b> ამოწმებს… პასუხი აქაც გამოჩნდება.</p>;
  if (sent) return <p className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 px-4 py-3 text-[15px] font-bold leading-snug text-[#e2c27a]">მოწმდება: {names[ctx.mine!.pick!]}…</p>;
  return (
    <>
      <NameGrid dark players={asPlayers(names)} ids={ask.targets} picked={sel !== null ? [sel] : []} onPick={i => setSel(sel === i ? null : i)} label="ვის ამოწმებ?" />
      <Btn kind="light" size="lg" full disabled={sel === null} onClick={() => sel !== null && ctx.act(sel)} className={BIG}>
        {sel !== null ? `შემოწმება: ${names[sel]}` : 'აირჩიე ერთი'}
      </Btn>
      <Hint dark>ღამეში ერთს ამოწმებ — არჩევანს მერე ვეღარ შეცვლი.</Hint>
    </>
  );
};

const Night: React.FC<{ ctx: Ctx; ph: Ph<'night'> }> = ({ ctx, ph }) => {
  const { seat, names, me, view } = ctx;
  const ask = seat?.night && seat.night.key === view.key ? seat.night : null;
  const { say } = wordsOf(view, ph.step);
  const dots = (
    <div className="flex items-center justify-center gap-1.5" role="img" aria-label={`ნაბიჯი ${ph.at + 1} / ${ph.of}`}>
      {Array.from({ length: ph.of }, (_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === ph.at ? 'w-6 bg-[#e2c27a]' : i < ph.at ? 'w-1.5 bg-[#e2c27a]/60' : 'w-1.5 bg-white/20'}`} />)}
    </div>
  );
  if (!ask) {
    return (
      <Screen ctx={ctx} night title={<MoonTitle n={ph.n} />}>
        {dots}
        <div className="flex flex-col items-center text-center pt-6 pb-2">
          <div className="w-24 h-24 rounded-full bg-[#e2c27a]/10 flex items-center justify-center shadow-[0_0_70px_rgba(226,194,122,0.22)]"><Moon className="w-11 h-11 text-[#e2c27a]" /></div>
          <p className="mt-5 font-serif-ge text-[26px] font-bold leading-tight text-[#f5ecdc]">სამშვილდეს სძინავს</p>
          <Hint dark className="mt-1.5 max-w-xs">
            {me < 0 || view.out[me] ? 'ღამით მხოლოდ თამაშში მყოფი როლები იღვიძებენ.' : 'დახუჭე თვალები. როცა შენი ჯერი იქნება, აქ გამოჩნდება.'}
          </Hint>
        </div>
        <Words dark label="მემატიანე კითხულობს">„{say}“</Words>
      </Screen>
    );
  }
  const own = { name: names[me], role: seat!.role, trade: seat!.trade } as Player;
  const Ic = ROLE_ICON[own.role];
  const pickNow = ask.step === 'piper' || ask.step === 'healer' ? (ctx.mine?.key === ask.key ? ctx.mine.pick : ask.pick) : null;
  return (
    <Screen ctx={ctx} night title={<MoonTitle n={ph.n} />}>
      {dots}
      <div className="flex items-center gap-3 rounded-2xl bg-[#e2c27a] px-4 py-3 text-[#241f36]" role="status">
        <span className="w-11 h-11 shrink-0 rounded-full bg-[#241f36]/10 flex items-center justify-center"><Ic className="w-6 h-6" /></span>
        <div className="min-w-0">
          <p className="font-serif-ge text-[22px] font-bold leading-tight">გაიღვიძე!</p>
          <p className="text-[13px] font-bold opacity-80">{ROLES[own.role].name}</p>
        </div>
      </div>
      <Words dark label="მემატიანე კითხულობს">„{say}“</Words>

      {ask.step === 'meet' && (
        ask.meet === 'meetSpies' || ask.meet === 'meetWarden' ? (
          seat!.mates.length ? (
            <section className="space-y-2">
              <p className="text-[13px] font-bold text-[#e2c27a]">{ask.meet === 'meetSpies' ? 'შენი თანამოძმეები' : 'შენი მეწყვილე'}</p>
              <Mates seat={seat!} names={names} dark />
              <Hint dark>{ask.meet === 'meetSpies' ? 'დაიმახსოვრე. ამ ღამეს არავინ მიგყავთ.' : 'ერთად ამოწმებთ და ერთმანეთს ენდობით.'}</Hint>
            </section>
          ) : <Hint dark>{ask.meet === 'meetSpies' ? 'ამ თამაშში ერთადერთი ჯაშუში ხარ. ამ ღამეს არავინ მიგყავს.' : 'მემატიანე გიცნობს. დაელოდე, სანამ დაგაძინებს.'}</Hint>
        ) : <Hint dark>მემატიანე გიცნობს. დაელოდე, სანამ დაგაძინებს.</Hint>
      )}

      {(ask.step === 'piper' || ask.step === 'healer') && (
        <>
          <NameGrid
            dark
            players={asPlayers(names)}
            ids={ask.targets}
            picked={pickNow !== null ? [pickNow] : []}
            onPick={i => ctx.act(pickNow === i ? null : i)}
            label={ask.step === 'piper' ? 'ვის აძინებ ამ ღამეს?' : 'რომელ სახლს იცავ ლამპრით?'}
          />
          <Hint dark>
            {pickNow !== null ? `შენი არჩევანი: ${names[pickNow]}. შეცვლა შეიძლება, სანამ მემატიანე გააგრძელებს. ` : ''}
            {ask.step === 'piper' ? 'ზედიზედ ერთსა და იმავეს არა, საკუთარ თავს არა.' : 'შენი სახლიც შეგიძლია, ოღონდ ზედიზედ ერთსა და იმავეს არა.'}
          </Hint>
        </>
      )}

      {ask.step === 'spies' && <Spies ctx={ctx} ask={ask} />}
      {ask.step === 'check' && <CheckAsk key={ask.key} ctx={ctx} ask={ask} />}
    </Screen>
  );
};

// ——— by day

const Morning: React.FC<{ ctx: Ctx; ph: Ph<'morning'> }> = ({ ctx, ph }) => {
  const { names, me } = ctx;
  const dawn = ph.n === 1 ? 'დილა თენდება, ყველა იღვიძებს.' : 'დილა თენდება სამშვილდეში, ყველა იღვიძებს.';
  const name = ph.taken !== null ? names[ph.taken] : '';
  return (
    <Screen ctx={ctx} title={<span className="inline-flex items-center gap-2"><Sun className="w-4 h-4 text-[#c9a24a]" />{ph.n === 1 ? 'პირველი დილა' : `დილა ${ph.n}`}</span>}>
      <Words label="მემატიანე კითხულობს">„{dawn}{ph.n > 1 && (ph.taken !== null ? ` ამ ღამეს ტყვედ წაიყვანეს ${name}.` : ' ღამე მშვიდად ჩაიარა.')}“</Words>
      {ph.n === 1 ? (
        <Hint>ახლა გაცნობის ბჭობაა: ყველა რიგით ამბობს თავის ხელობას და ერთ წინადადებას თავის თავზე.</Hint>
      ) : ph.taken !== null ? (
        <>
          <div className="rounded-2xl bg-[#7a2028] px-4 py-5 text-center text-[#fbf6ec]">
            <p className="text-[13px] font-bold text-[#fbf6ec]/80">{ph.taken === me ? 'ამ ღამეს ტყვედ წაგიყვანეს' : 'ამ ღამეს ტყვედ წაიყვანეს'}</p>
            <p className="mt-1 font-serif-ge text-[30px] font-bold leading-tight [overflow-wrap:anywhere]">{ph.taken === me ? 'შენ' : name}</p>
          </div>
          <Hint>
            {ph.taken === me
              ? 'თქვი ერთი დამშვიდობების წინადადება. მერე დამკვირვებელი ხარ: უყურებ, არ ლაპარაკობ და ხმას არ აძლევ. შენი როლი საიდუმლოდ რჩება.'
              : `${name} ერთ დამშვიდობების წინადადებას იტყვის და დამკვირვებელი ხდება. როლი არ ცხადდება.`}
          </Hint>
        </>
      ) : (
        <Hint>რატომ ჩაიარა მშვიდად, არ ცხადდება — ეს მატიანეში ბოლოს წაიკითხება.</Hint>
      )}
      <WaitHost />
    </Screen>
  );
};

/** my turn to speak: the card in wine, and „დავასრულე“ */
const MyTurn: React.FC<{ head: string; children: React.ReactNode }> = ({ head, children }) => (
  <div className="rounded-2xl bg-[#7a2028] px-4 py-4 text-[#fbf6ec] shadow-[0_10px_24px_-14px_rgba(122,32,40,0.9)]">
    <p className="font-serif-ge text-[24px] font-bold leading-tight">{head}</p>
    <div className="mt-1 text-[14px] leading-snug text-[#fbf6ec]/90">{children}</div>
  </div>
);

const endBtn = (ctx: Ctx, pick: number | null, label = 'დავასრულე') => {
  const sent = !!ctx.mine?.end && ctx.mine.key === ctx.view.key;
  return <Btn size="lg" full icon={<Check />} disabled={sent} onClick={() => ctx.act(pick, true)} className={BIG}>{sent ? 'გაიგზავნა…' : label}</Btn>;
};

const Intro: React.FC<{ ctx: Ctx; ph: Ph<'intro'> }> = ({ ctx, ph }) => {
  const { names, me, seat } = ctx;
  const mineTurn = ph.at === me;
  const order = names.map((_, i) => i);
  return (
    <Screen ctx={ctx} title={`გაცნობის ბჭობა · ${ph.at + 1} / ${names.length}`} footer={mineTurn ? endBtn(ctx, null) : undefined}>
      {mineTurn ? (
        <MyTurn head="შენი ჯერია">
          თქვი შენი ხელობა და ერთი წინადადება შენს თავზე.{' '}
          {seat?.trade ? <>შენი ხელობა ბარათზე: <b>{seat.trade}</b>.</> : 'ხელობა თვითონ მოიფიქრე.'}
        </MyTurn>
      ) : (
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ლაპარაკობს</p>
          <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{names[ph.at]}</p>
          <Hint className="mt-1">თავის ხელობას და ერთ წინადადებას თავის თავზე.</Hint>
        </div>
      )}
      <Order names={names} order={order} at={ph.at} />
      <ObserverLine me={me} out={null} />
      <Hint>ბრალდება და ხმის მიცემა დღეს არ არის — ბოლოს ისევ ღამე დგება.</Hint>
    </Screen>
  );
};

const Day: React.FC<{ ctx: Ctx; ph: Ph<'day'> }> = ({ ctx, ph }) => {
  const { names, me, view } = ctx;
  const speaker = ph.order[ph.at];
  const mineTurn = speaker === me;
  const now = mineTurn && ctx.mine?.key === view.key ? ctx.mine.pick : ph.accuse[ph.at] ?? null;
  const accuse = ph.accuse.map((x, k) => (k === ph.at ? now : x));
  const accused = accusedOf(accuse);
  const total = view.kids ? KIDS_SPEECH : SPEECH;
  return (
    <Screen ctx={ctx} title={`ბჭობა ${ph.n} · ${ph.at + 1} / ${ph.order.length}`} footer={mineTurn ? endBtn(ctx, now) : undefined}>
      <ObserverLine me={me} out={me >= 0 ? view.out[me] : null} />
      {ph.at === 0 && !mineTurn && <Words label="მემატიანე კითხულობს">„ბჭობა იწყება. თითოს ერთი სიტყვა აქვს: ვინ ეეჭვება და რატომ.“</Words>}
      <Speaker key={`${ph.n}-${ph.at}`} name={names[speaker]} label={mineTurn ? 'შენი სიტყვაა' : 'ლაპარაკობს'} total={total} audio={ctx.audio} clock={view.clock} clockAt={view.clockAt} sound={mineTurn}>
        {!mineTurn && now !== null && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] leading-snug text-[#4a3426]"><Gavel className="w-4 h-4 text-[#7a2028]" />აბრალებს: <b className="[overflow-wrap:anywhere]">{names[now]}</b></p>
        )}
      </Speaker>
      {mineTurn && (
        <NameGrid
          players={asPlayers(names)}
          ids={ph.order.filter(i => i !== speaker)}
          picked={now !== null ? [now] : []}
          onPick={i => ctx.act(now === i ? null : i)}
          label={<>ვის აბრალებ? (თუ გინდა) — <span className="font-serif-ge whitespace-nowrap">„ვაბრალებ …“</span></>}
        />
      )}
      {accused.length > 0 && <p className="text-[13.5px] leading-snug text-[#4a3426]"><span className="font-bold text-[#7a2028]">დღის ბრალდებულები:</span> {accused.map(i => names[i]).join(', ')}</p>}
      <Order names={names} order={ph.order} at={ph.at} accused={accused} />
      <Hint>{mineTurn ? 'როცა მორჩები, დააჭირე „დავასრულე“-ს — შემდეგი სიტყვა თავისით დაიწყება.' : 'სხვები არ აწყვეტინებენ — ეს ბჭობის წესია. შეურაცხყოფა არ შეიძლება, მხოლოდ საბუთი.'}</Hint>
    </Screen>
  );
};

const Vote: React.FC<{ ctx: Ctx; ph: Ph<'vote'> }> = ({ ctx, ph }) => {
  const { names, me, view, playing } = ctx;
  const one = ph.candidates.length === 1;
  const cur = ctx.mine?.key === view.key ? ctx.mine.pick : null;
  const live = names.map((_, i) => i).filter(i => !view.out[i]);
  const voted = new Set(ph.voted);
  if (playing && cur !== null) voted.add(me);
  const choose = (v: number) => { triggerHaptic(10); ctx.act(cur === v ? null : v); };
  const big = (on: boolean) => `min-h-14 rounded-2xl px-4 py-3 flex items-center justify-center gap-2 text-[16px] font-bold leading-tight cursor-pointer transition active:scale-[0.98] ${
    on ? 'bg-[#7a2028] text-[#fbf6ec] shadow-[0_8px_18px_-10px_rgba(122,32,40,0.9)]' : 'bg-white text-[#4a3426] ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'}`;
  return (
    <Screen ctx={ctx} title={ph.round === 2 ? 'ხელახლა ხმის მიცემა' : 'ხმის მიცემა'}>
      <ObserverLine me={me} out={me >= 0 ? view.out[me] : null} />
      <Words label="მემატიანე კითხულობს">{one ? `„ვინ ამბობს, რომ ${names[ph.candidates[0]]} ციხეში ჩაჯდეს?“` : '„ხმას ვაძლევთ: თითოეული ერთ ბრალდებულს ირჩევს.“'}</Words>
      {playing && (one ? (
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" aria-pressed={cur === ph.candidates[0]} onClick={() => choose(ph.candidates[0])} className={big(cur === ph.candidates[0])}><Lock className="w-5 h-5" />ციხეში</button>
          <button type="button" aria-pressed={cur === NO} onClick={() => choose(NO)} className={big(cur === NO)}><X className="w-5 h-5" />არა</button>
        </div>
      ) : (
        <div className="space-y-2">
          {ph.candidates.map(c => (
            <button key={c} type="button" aria-pressed={cur === c} onClick={() => choose(c)} className={`w-full ${big(cur === c)} !justify-start`}>
              <span className="min-w-0 flex-1 text-left font-serif-ge text-[18px] [overflow-wrap:anywhere]">{names[c]}</span>
              {cur === c && <Check className="w-5 h-5 shrink-0" />}
            </button>
          ))}
        </div>
      ))}
      {playing && (
        <Hint>
          {cur === null ? 'შეეხე შენს არჩევანს.' : `შენი ხმა: ${cur === NO ? 'არა' : one ? 'ციხეში' : names[cur]}. შეცვლა შეიძლება, სანამ მემატიანე შედეგს გამოაცხადებს.`}
        </Hint>
      )}
      <section>
        <p className={`text-[13.5px] font-bold tabular-nums ${voted.size >= live.length ? 'text-[#2f7d4f]' : 'text-[#4a3426]'}`}>ხმა მისცა: {Math.min(voted.size, live.length)} / {live.length}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {live.map(i => (
            <li key={i} className={`inline-flex items-center gap-1 min-h-8 px-2.5 py-1 rounded-full text-[13px] font-bold ${voted.has(i) ? 'bg-[#2f7d4f]/10 text-[#24603d]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#9a8b7b]'}`}>
              {voted.has(i) && <Check className="w-3.5 h-3.5" />}{names[i]}
            </li>
          ))}
        </ul>
      </section>
      {one && <Hint>ციხეში ჯდება, თუ ხმების ნახევარზე მეტი აქვს: საჭიროა მინიმუმ {majority(live.length)} ხმა {live.length}-დან.</Hint>}
    </Screen>
  );
};

const Tie: React.FC<{ ctx: Ctx; ph: Ph<'tie'> }> = ({ ctx, ph }) => {
  const { names, me, view } = ctx;
  const speaker = ph.tied[ph.at];
  const mineTurn = speaker === me;
  return (
    <Screen ctx={ctx} title={`ფრე · ${ph.at + 1} / ${ph.tied.length}`} footer={mineTurn ? endBtn(ctx, null) : undefined}>
      <Words label="მემატიანე კითხულობს">„ხმები გაიყო. {ph.tied.map(i => names[i]).join(' და ')} თითო {TIE_SPEECH} წამს ლაპარაკობენ, მერე ხმას მხოლოდ მათზე ვაძლევთ.“</Words>
      <Speaker key={`${ph.n}-${ph.at}`} name={names[speaker]} label={mineTurn ? 'შენი სიტყვაა' : 'ლაპარაკობს'} total={TIE_SPEECH} audio={ctx.audio} clock={view.clock} clockAt={view.clockAt} sound={mineTurn} />
      {ph.hands && <HandsList names={names} hands={ph.hands} />}
      <Hint>თუ ისევ ფრე იქნება, დღეს ციხეში არავინ ჯდება.</Hint>
    </Screen>
  );
};

const Verdict: React.FC<{ ctx: Ctx; ph: Ph<'verdict'> }> = ({ ctx, ph }) => {
  const { names, me } = ctx;
  const name = ph.jailed !== null ? names[ph.jailed] : '';
  const why = !ph.accused.length ? 'დღეს ბრალი არავის დასდეს.' : ph.hands?.round === 2 ? 'ხელახლა ხმის მიცემაზეც ფრე გამოვიდა.' : 'ნახევარზე მეტი ხმა ვერ შეგროვდა.';
  return (
    <Screen ctx={ctx} title={`ბჭობა ${ph.n} · შედეგი`}>
      <Words label="მემატიანე კითხულობს">„{ph.jailed !== null ? `ციხეში ჩასვეს ${name}.` : 'დღეს ციხეში არავინ ჯდება.'}“</Words>
      {ph.jailed !== null ? (
        <>
          <div className="rounded-2xl bg-[#4a3426] px-4 py-5 text-center text-[#fbf6ec]">
            <Lock className="mx-auto w-6 h-6 text-[#e2c27a]" />
            <p className="mt-1.5 text-[13px] font-bold text-[#fbf6ec]/80">{ph.jailed === me ? 'ციხეში ჩაგსვეს' : 'ციხეში ჩასვეს'}</p>
            <p className="mt-0.5 font-serif-ge text-[30px] font-bold leading-tight [overflow-wrap:anywhere]">{ph.jailed === me ? 'შენ' : name}</p>
          </div>
          <Hint>{ph.jailed === me ? 'ამიერიდან დამკვირვებელი ხარ: უყურებ, არ ლაპარაკობ და ხმას არ აძლევ. შენი როლი საიდუმლოდ რჩება.' : `${name} დამკვირვებელი ხდება. როლი არ ცხადდება.`}</Hint>
        </>
      ) : <Hint>{why}</Hint>}
      {ph.hands && <HandsList names={names} hands={ph.hands} />}
      <WaitHost />
    </Screen>
  );
};

// ——— my card, any time

const Peek: React.FC<{ ctx: Ctx; night: boolean; onClose: () => void }> = ({ ctx, night, onClose }) => {
  const { seat, names, me, view } = ctx;
  if (!seat) return null;
  const spy = isSpy(seat.role);
  const ph = view.phase;
  const metSpies = !(ph.kind === 'deal' || (ph.kind === 'night' && ph.n === 1 && ph.at < 1));
  const mates = seat.mates.length ? (
    <div className="mt-3 text-left space-y-1.5">
      <p className="text-[12px] font-bold text-[#7a2028]">{spy ? 'შენი თანამოძმეები' : 'შენი მეწყვილე'}</p>
      <Mates seat={seat} names={names} />
    </div>
  ) : spy && metSpies ? <p className="mt-3 rounded-xl bg-[#7a2028]/[0.07] px-3 py-2 text-[13px] leading-snug text-[#7a2028]">ამ თამაშში ერთადერთი ჯაშუში ხარ.</p> : undefined;
  return (
    <TableScreen
      tone={night ? 'night' : 'day'}
      title="ჩემი როლი"
      onClose={onClose}
      footer={<Btn kind={night ? 'light' : 'primary'} size="lg" full icon={<EyeOff />} onClick={onClose} className={BIG}>დამალვა</Btn>}
    >
      <div className="py-2 space-y-4">
        <RoleCard p={{ name: names[me], role: seat.role, trade: seat.trade }}>{mates}</RoleCard>
        {seat.checks.length > 0 && (
          <section>
            <p className={`mb-2 text-[13px] font-bold ${night ? 'text-[#e2c27a]' : 'text-[#4a3426]'}`}>შენი შემოწმებები</p>
            <ul className="space-y-1.5">
              {seat.checks.map(c => (
                <li key={c.n} className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-2.5">
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#9a8b7b]">ღამე {c.n}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{names[c.who]}</span>
                  <span className={`shrink-0 text-[13px] font-bold ${c.answer === 'spy' ? 'text-[#7a2028]' : 'text-[#75685a]'}`}>{c.answer === 'spy' ? 'ჯაშუშია' : c.answer === 'no' ? 'ჯაშუში არაა' : 'პასუხი არ იყო'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </TableScreen>
  );
};

export const PlayerGame: React.FC<{
  view: PubView; uids: string[]; uid: string; seat: SeatView | null; mine: MyAct | null; gc: GameCall; audio: AudioRef;
  onAct: (pick: number | null, end: boolean) => void; onHide: () => void; onLeave: () => void;
}> = ({ view, uids, uid, seat: mySeat, mine: myAct, gc, audio, onAct, onHide, onLeave }) => {
  const [peek, setPeek] = useState(false);
  const me = uids.indexOf(uid);
  const seat = me >= 0 && mySeat?.i === me ? mySeat : null;
  const ph = view.phase;
  const night = ph.kind === 'night';
  const out = me >= 0 ? view.out[me] : null;
  // the night darkens every microphone and camera; one who is out keeps quiet by day too — but the one taken says their
  // farewell in the morning, and at the end everybody talks again
  const farewell = ph.kind === 'morning' && out?.by === 'taken' && out.at === ph.n;
  useHush(night || (!!out && !farewell && ph.kind !== 'end'), night, gc);
  const mine = myAct && myAct.key === view.key ? myAct : null;
  // „ჩემი როლი“ only once the card was looked at the deal's way (its look is what tells the host)
  const looked = ph.kind !== 'deal' || ph.seen.includes(me) || mine?.pick === 1;

  const ctx: Ctx = {
    view, names: view.names, me, seat, playing: me >= 0 && !out, audio, mine,
    act: (pick, end = false) => { openAudio(audio); onAct(pick, end); },
    right: dark => <>{seat && looked && <RoleBtn dark={dark} onClick={() => setPeek(true)} />}<CallBtn gc={gc} dark={dark} /></>,
    onHide,
  };
  if (peek && seat) return <Peek ctx={ctx} night={night} onClose={() => setPeek(false)} />;
  switch (ph.kind) {
    case 'deal': return <Deal ctx={ctx} ph={ph} />;
    case 'night': return <Night ctx={ctx} ph={ph} />;
    case 'morning': return <Morning ctx={ctx} ph={ph} />;
    case 'intro': return <Intro ctx={ctx} ph={ph} />;
    case 'day': return <Day ctx={ctx} ph={ph} />;
    case 'vote': return <Vote ctx={ctx} ph={ph} />;
    case 'tie': return <Tie ctx={ctx} ph={ph} />;
    case 'verdict': return <Verdict ctx={ctx} ph={ph} />;
    default:
      return view.final
        ? <EndScreen g={view.final} me={me} onClose={onLeave} closeLabel="დახურვა" onHide={onHide} right={<CallBtn gc={gc} />} />
        : null;
  }
};
