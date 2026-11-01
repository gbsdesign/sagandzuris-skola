import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff, Flag, Play, Pointer, RotateCcw, Timer, Trophy } from 'lucide-react';
import { UTSKHO_PLACES, utskhoPlace } from '../../../data/utskhoPlaces';
import {
  MAX_PLAYERS, MINUTES, MIN_PLAYERS, accusationFailed, dealNext, finish, leftMs, newTable, nextRound, parseTable, pause, resume,
  roundPoints, strangerWon, type UEnd, type UTable,
} from '../../../utils/utskho';
import { bell, buzz, chime, closeAudio, openAudio, tick, type AudioRef } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Chip } from '../../../components/games/Chip';
import { CircleNames, useCircleNames } from '../../../components/games/CircleNames';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { Foot, Hint, NameGrid, Ring } from '../samshvilde/parts';
import { Podium, Standings, useNow } from '../rounds/parts';
import { PLACE_ICON, PlaceBadge, PlaceGrid, PlaceTile, SecretCard, StrangerIcon } from './parts';

// „უცხო სოფელში“ on one phone (the hub's „ჰიბრიდული“, 2026-11-01): the phone goes round the circle and each sees their card in
// secret — the place and a role, or „უცხო ხარ“. Then the clock (6/8/10 minutes) runs on the table with the thirty places
// listed; the players ask each other questions. Anybody may stop it to accuse (once a round; everybody but the accused must
// agree), the stranger may stop it to name the place; when the time is up the village agrees on one — or does not. Points as
// in the original (utils/utskho.ts). Kept on this phone after every step (`sg-utskho-game`), ✕ pauses the clock.

const GAME_KEY = 'sg-utskho-game';
const CONF_KEY = 'sg-utskho-table';
const load = (key: string): unknown => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const save = (key: string, v: unknown) => { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } };
const readMinutes = () => { const o = load(CONF_KEY) as { minutes?: unknown } | null; return MINUTES.includes(o?.minutes as number) ? (o!.minutes as number) : 8; };

export const POINTS_LINE = 'სოფელი იგებს — თითოს 1 ქულა, ვინც უცხო დაასახელა — 2. უცხო იგებს — 2 ქულა, ან 4, თუ ადგილს გამოიცნობს ან სოფელი დროზე ადრე სოფლელს დაადანაშაულებს.';

type Flow =
  | { kind: 'accuse'; accuser: number | null; accused: number | null }
  | { kind: 'guess'; who: number | null; pick: string | null }
  | { kind: 'peek'; who: number | null };

const Title: React.FC<{ children: React.ReactNode; sub?: React.ReactNode }> = ({ children, sub }) => (
  <div className="text-center space-y-1.5">
    <p className="font-serif-ge text-[24px] font-bold leading-tight text-[#7a2028]">{children}</p>
    {sub && <p className="mx-auto max-w-md text-[14px] leading-snug text-[#75685a]">{sub}</p>}
  </div>
);

/** the places everybody may think of, small, while the clock runs */
const AllPlaces: React.FC = () => (
  <div>
    <p className="mb-2 text-[13px] font-bold text-[#4a3426]">შესაძლო ადგილები · {UTSKHO_PLACES.length}</p>
    <ul className="flex flex-wrap gap-1.5">
      {[...UTSKHO_PLACES].sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(p => {
        const Icon = PLACE_ICON[p.icon];
        return (
          <li key={p.id} className="h-9 pl-2 pr-3 rounded-full bg-white ring-1 ring-[#e8dcc8] inline-flex items-center gap-1.5 text-[13px] font-bold text-[#4a3426]">
            <Icon className="w-4 h-4 text-[#7a2028]" aria-hidden="true" />{p.name}
          </li>
        );
      })}
    </ul>
  </div>
);

/** how the round ended, in words */
const endLine = (g: UTable, end: UEnd): { head: string; text: string } => {
  const r = g.round;
  const n = g.names;
  const place = utskhoPlace(r.place)?.name ?? '';
  if (end.kind === 'guess') {
    const said = utskhoPlace(end.guess)?.name ?? end.guess;
    return end.guess === r.place
      ? { head: 'უცხომ გაიმარჯვა!', text: `${n[r.stranger]} გაიმხილა და თქვა „${said}“ — სწორია.` }
      : { head: 'სოფელმა გაიმარჯვა!', text: `${n[r.stranger]} გაიმხილა და თქვა „${said}“, ჩვენ კი „${place}“-ში ვიყავით.` };
  }
  if (end.kind === 'timeout') return { head: 'უცხომ გაიმარჯვა!', text: 'დრო ამოიწურა და სოფელი ვერ შეთანხმდა — უცხო გადარჩა.' };
  const who = n[end.accused];
  if (end.accused === r.stranger) {
    return { head: 'სოფელმა გაიმარჯვა!', text: end.accuser !== null ? `${n[end.accuser]} დაასახელა ${who} — და მართალი იყო.` : `სოფელმა ერთად დაასახელა ${who} — და მართალი იყო.` };
  }
  return { head: 'უცხომ გაიმარჯვა!', text: `სოფელმა დაასახელა ${who}, მაგრამ ის სოფლელი იყო${end.late ? '.' : ' — უცხოს 4 ქულა.'}` };
};

const TableGame: React.FC<{ g: UTable; setG: (g: UTable) => void; onClose: () => void; onAgain: () => void; onEnd: () => void }> = ({ g, setG, onClose, onAgain, onEnd }) => {
  const audio: AudioRef = useRef<AudioContext | null>(null);
  useEffect(() => () => closeAudio(audio), []);
  const r = g.round;
  const n = g.names.length;
  const place = utskhoPlace(r.place);
  const [showCard, setShowCard] = useState(false);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [vote, setVote] = useState<number | null>(null);
  const [final, setFinal] = useState(false);
  const playing = r.phase === 'play';
  const now = useNow(playing && r.pausedAt === null);
  const leftS = Math.ceil(leftMs(g, now) / 1000);
  const timeUp = playing && leftS <= 0;
  const total = g.minutes * 60;

  // the clock's sounds: a tick at a minute left and at the last three seconds, the bell at the end (once — not after a reload)
  const prev = useRef(leftS);
  useEffect(() => {
    const was = prev.current;
    prev.current = leftS;
    if (!playing || r.pausedAt !== null || leftS === was) return;
    if (was > 0 && leftS <= 0) { bell(audio.current); triggerHaptic(120); return; }
    if (leftS === 60 || (leftS > 0 && leftS <= 3)) { tick(audio.current, leftS === 60); triggerHaptic(15); }
  }, [leftS, playing, r.pausedAt]);
  useEffect(() => { setShowCard(false); setFlow(null); setVote(null); }, [r.place, r.stranger]);

  const set = (next: UTable) => setG(next);
  const stopFor = (f: Flow) => { triggerHaptic(10); setFlow(f); if (f.kind !== 'peek') set(pause(g, Date.now())); };
  const back = () => { setFlow(null); set(resume(g, Date.now())); };
  const end = (e: UEnd) => {
    const won = strangerWon(r, e);
    set(finish(g, e, Date.now()));
    setFlow(null);
    setVote(null);
    if (won) buzz(audio.current); else chime(audio.current, 3);
    triggerHaptic(60);
  };
  const close = () => {
    setShowCard(false);
    setFlow(null);
    if (playing && r.pausedAt === null && !timeUp) set(pause(g, Date.now()));
    onClose();
  };

  // ---- the end of the game: the podium ----
  if (final) {
    const best = Math.max(...g.scores);
    const winners = g.names.filter((_, i) => g.scores[i] === best);
    return (
      <TableScreen
        title="უცხო სოფელში · შედეგები"
        onClose={onEnd}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Btn kind="ghost" size="lg" full onClick={onEnd} className="!h-14 !text-[15.5px]">დახურვა</Btn>
            <Btn size="lg" full icon={<RotateCcw />} onClick={() => { setFinal(false); onAgain(); }} className="!h-14 !text-[15.5px]">თავიდან</Btn>
          </div>
        )}
      >
        <div className="my-auto space-y-5 py-4 w-full max-w-2xl mx-auto">
          <Trophy className="w-10 h-10 mx-auto text-[#b8860b]" aria-hidden="true" />
          <Podium names={g.names} scores={g.scores} />
          <p className="text-center text-[15px] font-bold text-[#4a3426]">
            {winners.length > 1 ? `ფრეა: ${winners.join(', ')}` : `გაიმარჯვა „${winners[0]}“-მა`} · {g.played} რაუნდი
          </p>
          <Standings names={g.names} scores={g.scores} />
        </div>
      </TableScreen>
    );
  }

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;
  const big = '!h-14 !text-[15.5px]';

  if (r.phase === 'deal') {
    const who = g.names[r.dealt];
    if (!showCard) {
      body = (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-6">
          <p className="text-[13px] font-bold text-[#9a8b7b]">გადაეცი ტელეფონი · ბარათი {r.dealt + 1}/{n}</p>
          <p className="font-serif-ge text-[40px] font-bold leading-tight text-[#7a2028] break-words max-w-full">{who}</p>
          <p className="max-w-sm text-[14px] leading-relaxed text-[#75685a]">სხვები ეკრანს ნუ უყურებენ! ბარათი მხოლოდ შენთვისაა.</p>
        </div>
      );
      footer = <Btn size="lg" full icon={<Eye />} onClick={() => { openAudio(audio); triggerHaptic(10); setShowCard(true); }} className={big}>მე ვარ {who} — ბარათის ნახვა</Btn>;
    } else {
      body = <div className="flex-1 flex items-center py-4"><SecretCard place={place} role={r.roles[r.dealt]} name={who} /></div>;
      const last = r.dealt + 1 >= n;
      footer = (
        <Btn size="lg" full icon={<EyeOff />} onClick={() => { triggerHaptic(10); setShowCard(false); set(dealNext(g, Date.now())); }} className={big}>
          {last ? 'დავიმახსოვრე — დრო იწყება!' : 'დავიმახსოვრე — დამალვა'}
        </Btn>
      );
    }
  } else if (r.phase === 'end' && r.end && place) {
    const { head, text } = endLine(g, r.end);
    const villagers = !strangerWon(r, r.end);
    const gained = roundPoints(r, r.end, n);
    body = (
      <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <p className={`font-serif-ge text-[26px] font-bold leading-tight ${villagers ? 'text-[#2f7d4f]' : 'text-[#7a2028]'}`}>{head}</p>
          <p className="text-[14.5px] leading-snug text-[#4a3426]">{text}</p>
        </div>
        <div className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-16 h-16 rounded-3xl bg-[#2a211b] text-[#f0d9a0] inline-flex items-center justify-center shrink-0" aria-hidden="true"><StrangerIcon className="w-8 h-8" /></span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-[#9a8b7b]">უცხო იყო</p>
              <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{g.names[r.stranger]}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlaceBadge p={place} size="lg" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-bold text-[#9a8b7b]">ადგილი</p>
              <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#4a3426]">{place.name}</p>
            </div>
          </div>
          <p className="text-[14px] leading-snug text-[#4a3426]">{place.note}</p>
          <p className="text-[13px] leading-snug text-[#75685a]">
            {g.names.map((nm, i) => `${nm} — ${i === r.stranger ? 'უცხო' : r.roles[i]}`).join(' · ')}
          </p>
        </div>
        <Standings names={g.names} scores={g.scores} gained={gained} />
      </div>
    );
    footer = (
      <div className="flex gap-2">
        <Btn kind="ghost" size="lg" onClick={() => { triggerHaptic(10); setFinal(true); }} className={`${big} shrink-0`}>დასრულება</Btn>
        <Btn size="lg" icon={<ChevronRight />} onClick={() => { triggerHaptic(10); set(nextRound(g, UTSKHO_PLACES, Math.random)); }} className={`${big} flex-1`}>შემდეგი რაუნდი</Btn>
      </div>
    );
  } else if (playing && flow?.kind === 'peek') {
    if (flow.who === null) {
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
          <Title sub="დაგავიწყდა როლი? აირჩიე შენი სახელი — ბარათი მხოლოდ შენ ნახე.">ვინ ხარ?</Title>
          <NameGrid players={g.names.map(name => ({ name }))} ids={g.names.map((_, i) => i)} picked={[]} onPick={i => setFlow({ kind: 'peek', who: i })} />
        </div>
      );
      footer = <Btn kind="ghost" size="lg" full onClick={() => setFlow(null)} className={big}>გაუქმება</Btn>;
    } else {
      body = <div className="flex-1 flex items-center py-4"><SecretCard place={place} role={r.roles[flow.who]} name={g.names[flow.who]} /></div>;
      footer = <Btn size="lg" full icon={<EyeOff />} onClick={() => { triggerHaptic(10); setFlow(null); }} className={big}>დამალვა</Btn>;
    }
  } else if (playing && flow?.kind === 'accuse') {
    const free = g.names.map((_, i) => i).filter(i => !r.accusers.includes(i));
    if (flow.accuser === null) {
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
          <Title sub={r.accusers.length ? `ამ რაუნდში უკვე სცადეს: ${r.accusers.map(i => g.names[i]).join(', ')}.` : 'საათი გაჩერდა. თითოეულს რაუნდში ერთი ბრალდება აქვს.'}>ვინ ბრალდებს?</Title>
          <NameGrid players={g.names.map(name => ({ name }))} ids={free} picked={[]} onPick={i => setFlow({ ...flow, accuser: i })} />
        </div>
      );
      footer = <Btn kind="ghost" size="lg" full onClick={back} className={big}>გაუქმება — ვთამაშობთ</Btn>;
    } else if (flow.accused === null) {
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
          <Title sub={`${g.names[flow.accuser]}, ვინ არის შენი აზრით უცხო?`}>ვის ბრალდებს?</Title>
          <NameGrid players={g.names.map(name => ({ name }))} ids={g.names.map((_, i) => i).filter(i => i !== flow.accuser)} picked={[]} onPick={i => setFlow({ ...flow, accused: i })} />
        </div>
      );
      footer = <Btn kind="ghost" size="lg" full onClick={() => setFlow({ ...flow, accuser: null })} className={big}>უკან</Btn>;
    } else {
      const who = g.names[flow.accused];
      body = (
        <div className="flex-1 flex flex-col justify-center gap-4 py-4 w-full max-w-xl mx-auto">
          <Title sub={`ჯერ ${who} თავს იმართლებს. მერე ყველა დანარჩენი ერთად ამბობს: „კი“ ან „არა“. ერთხმად „კი“ — და ბარათი იხსნება; ერთი „არა“ — და თამაში გრძელდება.`}>
            „{who}“ უცხოა?
          </Title>
        </div>
      );
      const accuser = flow.accuser;
      const accused = flow.accused;
      footer = (
        <div className="space-y-2">
          <Btn size="lg" full icon={<Check />} onClick={() => end({ kind: 'vote', accused, accuser, late: false })} className={big}>ყველა თანახმაა — ბარათი გავხსნათ</Btn>
          <Foot onBack={() => setFlow({ ...flow, accused: null })}>
            <Btn kind="ghost" size="lg" full onClick={() => { triggerHaptic(10); setFlow(null); set(accusationFailed(g, accuser, Date.now())); }} className={big}>არა — ვთამაშობთ</Btn>
          </Foot>
        </div>
      );
    }
  } else if (playing && flow?.kind === 'guess') {
    if (flow.who === null) {
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
          <Title sub="საათი გაჩერდა. უცხო გაიმხელს თავს და ადგილს ერთხელ ასახელებს: სწორია — 4 ქულა, არასწორი — სოფელი იგებს.">ვინ ხარ?</Title>
          <NameGrid players={g.names.map(name => ({ name }))} ids={g.names.map((_, i) => i)} picked={[]} onPick={i => setFlow({ ...flow, who: i })} />
        </div>
      );
      footer = <Btn kind="ghost" size="lg" full onClick={back} className={big}>გაუქმება — ვთამაშობთ</Btn>;
    } else if (flow.who !== r.stranger) {
      body = (
        <div className="flex-1 flex flex-col justify-center gap-4 py-4 w-full max-w-xl mx-auto">
          <Title sub="ადგილს მხოლოდ უცხო ასახელებს. შენ თუ გგონია, რომ ვინმე უცხოა — „ბრალდება“.">{g.names[flow.who]}, შენ სოფლელი ხარ</Title>
        </div>
      );
      footer = <Btn size="lg" full icon={<Play />} onClick={back} className={big}>თამაშში დაბრუნება</Btn>;
    } else {
      const pick = flow.pick ? utskhoPlace(flow.pick) : undefined;
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-4xl mx-auto">
          <Title sub={`${g.names[flow.who]}, სად ვართ? აირჩიე ერთი.`}>უცხო გაიმხილა!</Title>
          <PlaceGrid>
            {[...UTSKHO_PLACES].sort((a, b) => a.name.localeCompare(b.name, 'ka')).map(p => (
              <PlaceTile key={p.id} p={p} look={flow.pick === p.id ? 'reveal' : 'open'} onTap={() => setFlow({ ...flow, pick: p.id })} />
            ))}
          </PlaceGrid>
        </div>
      );
      footer = (
        <Foot onBack={() => setFlow({ ...flow, who: null, pick: null })}>
          <Btn size="lg" full icon={<Check />} disabled={!pick} onClick={() => { if (flow.pick) end({ kind: 'guess', guess: flow.pick }); }} className={big}>
            {pick ? `„${pick.name}“ — ვამბობ!` : 'აირჩიე ადგილი'}
          </Btn>
        </Foot>
      );
    }
  } else if (timeUp) {
    if (vote === null) {
      body = (
        <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-2xl mx-auto">
          <Title sub="სოფელმა ერთად უნდა გადაწყვიტოს, ვინ არის უცხო. მოილაპარაკეთ და აირჩიეთ ერთი.">დრო ამოიწურა!</Title>
          <NameGrid players={g.names.map(name => ({ name }))} ids={g.names.map((_, i) => i)} picked={[]} onPick={setVote} />
        </div>
      );
      footer = <Btn kind="ghost" size="lg" full icon={<Flag />} onClick={() => end({ kind: 'timeout' })} className={big}>ვერ შევთანხმდით</Btn>;
    } else {
      const who = g.names[vote];
      const accused = vote;
      body = (
        <div className="flex-1 flex flex-col justify-center gap-4 py-4 w-full max-w-xl mx-auto">
          <Title sub={`${who} თავს იმართლებს, მერე ყველა დანარჩენი ერთად ამბობს „კი“ ან „არა“. ერთი „არა“ — სხვა აირჩიეთ ან „ვერ შევთანხმდით“.`}>„{who}“ უცხოა?</Title>
        </div>
      );
      footer = (
        <div className="space-y-2">
          <Btn size="lg" full icon={<Check />} onClick={() => end({ kind: 'vote', accused, accuser: null, late: true })} className={big}>ყველა თანახმაა — ბარათი გავხსნათ</Btn>
          <Foot onBack={() => setVote(null)}>
            <Btn kind="ghost" size="lg" full icon={<Flag />} onClick={() => end({ kind: 'timeout' })} className={big}>ვერ შევთანხმდით</Btn>
          </Foot>
        </div>
      );
    }
  } else if (playing && r.pausedAt !== null) {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-6">
        <Ring left={leftS} total={total} />
        <Title sub="საათი გაჩერებულია. როცა ყველა მზადაა — გააგრძელეთ.">შესვენება</Title>
      </div>
    );
    footer = <Btn size="lg" full icon={<Play />} onClick={() => { openAudio(audio); triggerHaptic(10); set(resume(g, Date.now())); }} className={big}>გაგრძელება</Btn>;
  } else if (playing) {
    body = (
      <div className="flex-1 flex flex-col gap-4 py-2 w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Ring left={leftS} total={total} />
          <div className="min-w-0 space-y-1">
            <p className="text-[13px] font-bold text-[#9a8b7b]">პირველ კითხვას სვამს</p>
            <p className="font-serif-ge text-[22px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{g.names[r.first]}</p>
            <p className="text-[13px] leading-snug text-[#75685a]">ვინც უპასუხა, ის სვამს შემდეგს — ოღონდ არა იმას, ვინც ჰკითხა.</p>
          </div>
        </div>
        <button type="button" onClick={() => stopFor({ kind: 'peek', who: null })} className="self-start h-10 px-3 -ml-1 rounded-full text-[13px] font-bold text-[#7a2028] inline-flex items-center gap-1.5 hover:bg-[#7a2028]/[0.07] cursor-pointer">
          <Eye className="w-4 h-4" aria-hidden="true" />ჩემი ბარათის ხელახლა ნახვა
        </button>
        <AllPlaces />
      </div>
    );
    footer = (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" full icon={<StrangerIcon />} onClick={() => stopFor({ kind: 'guess', who: null, pick: null })} className={big}>უცხო ვარ</Btn>
        <Btn size="lg" full icon={<Pointer />} onClick={() => stopFor({ kind: 'accuse', accuser: null, accused: null })} className={big}>ბრალდება</Btn>
      </div>
    );
  }

  return (
    <TableScreen
      title={`უცხო სოფელში · რაუნდი ${g.played + (r.phase === 'end' ? 0 : 1)}`}
      onClose={close}
      right={<span className="px-1 text-[12px] tabular-nums text-[#9a8b7b]">{g.minutes} წუთი</span>}
      footer={footer}
    >
      {body}
    </TableScreen>
  );
};

export const UtskhoTable: React.FC = () => {
  const names = useCircleNames();
  const [minutes, setMinutesState] = useState(readMinutes);
  const setMinutes = (m: number) => { setMinutesState(m); save(CONF_KEY, { minutes: m }); };
  const [game, setGameState] = useState<UTable | null>(() => parseTable(load(GAME_KEY), UTSKHO_PLACES));
  const [open, setOpen] = useState(false);
  const setGame = useCallback((g: UTable | null) => { setGameState(g); save(GAME_KEY, g); }, []);
  const players = names.slice(0, MAX_PLAYERS);
  const few = players.length < MIN_PLAYERS;

  const start = async () => {
    if (game && !(await askConfirm({ title: 'ახალი თამაში დაიწყოს?', text: 'შეჩერებული თამაში წაიშლება.', ok: 'ახალი თამაში' }))) return;
    triggerHaptic(10);
    setGame(newTable(players, minutes, UTSKHO_PLACES, Math.random));
    setOpen(true);
  };
  const again = () => { if (game) setGame(newTable(game.names, game.minutes, UTSKHO_PLACES, Math.random)); };

  if (open && game) return <TableGame g={game} setG={setGame} onClose={() => setOpen(false)} onAgain={again} onEnd={() => { setGame(null); setOpen(false); }} />;

  return (
    <div className="space-y-4">
      {game && (
        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-[14px] font-bold text-[#4a3426]">შეჩერებული თამაში · რაუნდი {game.played + (game.round.phase === 'end' ? 0 : 1)}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[#75685a]">{game.names.map((nm, i) => `${nm} ${game.scores[i]}`).join(' · ')}</p>
            </div>
            <Btn onClick={() => setOpen(true)} icon={<Play />}>გაგრძელება</Btn>
          </div>
        </Card>
      )}
      <Card className="!p-4 space-y-4">
        <CircleNames hint={`${MIN_PLAYERS}–${MAX_PLAYERS} მოთამაშე. ერთ-ერთი უცხო იქნება — ვინ, ტელეფონი იცის.`} />
        {names.length > MAX_PLAYERS && <p className="text-[12.5px] text-[#8a6d12]">ითამაშებს პირველი {MAX_PLAYERS} — დანარჩენები მომდევნო თამაშში.</p>}
        <div className="space-y-2">
          <p className="text-[13.5px] font-bold text-[#4a3426] flex items-center gap-1.5"><Timer className="w-4 h-4 text-[#7a2028]" /> რაუნდის დრო</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="რაუნდის დრო">
            {MINUTES.map(m => <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>{m} წუთი</Chip>)}
          </div>
        </div>
      </Card>
      <Btn size="lg" full icon={<Play />} disabled={few} onClick={() => { void start(); }} className="!h-14 !text-[15.5px]">
        {few ? `საჭიროა ${MIN_PLAYERS} მოთამაშე მაინც` : 'დაწყება'}
      </Btn>
      <Hint>
        ყველა ერთ ადგილას ხართ — ერთის გარდა: უცხომ არ იცის, სად. ტელეფონი წრეში გადადის და თითოეული საიდუმლოდ ხედავს თავის ბარათს:
        ადგილს და როლს, ან „უცხო ხარ“. მერე ერთმანეთს კითხვებს უსვამთ („აქ ხშირად მოდიხარ?“, „რა გაცვია?“) — ისე, რომ სოფლელებმა
        ერთმანეთი იცნონ, უცხომ კი ვერ მიხვდეს. ნებისმიერ დროს შეგიძლიათ ვინმეს ბრალდება; უცხოს კი — გაიმხილოს თავი და ადგილი თქვას.
      </Hint>
      <Hint>{POINTS_LINE}</Hint>
      <p className="px-1 text-[12px] leading-snug text-[#9a8b7b]">ადგილები და როლები Claude-მა დაწერა სკოლისთვის — მასწავლებელს ჯერ არ შეუმოწმებია.</p>
    </div>
  );
};
