import React from 'react';
import { Eye, EyeOff, Gavel, Lock, Moon, Play, RotateCcw, ScrollText, Sun, Users } from 'lucide-react';
import {
  TIE_SPEECH, accusedOf, live, majority, speechOf, winner,
  type SamGame,
} from '../../../utils/samshvilde';
import { Btn } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import type { AudioRef } from '../../../utils/gameSounds';
import { Foot, Hands, Hint, NameGrid, RoleCard, Ring, Words, useCountdown } from './parts';

// The screens by day — the phone may lie on the table where everybody sees it, so they show names only, never a role:
// the deal (each player alone), the morning, the first day's introductions, the speeches with their accusations, the
// vote, a tie's speeches and the verdict.

const BIG = '!h-14 !text-[16px]';

interface Common { g: SamGame; right?: React.ReactNode; onBack?: () => void; onClose: () => void; onNext: () => void }

export const DealScreen: React.FC<Omit<Common, 'onBack' | 'right'>> = ({ g, onClose, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'deal') return null;
  const p = g.players[ph.at];
  const next = g.players[ph.at + 1];
  return (
    <TableScreen
      title={`დარიგება · ${ph.at + 1} / ${g.players.length}`}
      onClose={onClose}
      footer={ph.show
        ? <Btn size="lg" full icon={<EyeOff />} onClick={onNext} className={BIG}>დავიმახსოვრე — დამალე</Btn>
        : <Btn size="lg" full icon={<Eye />} onClick={onNext} className={BIG}>ჩემი როლის ნახვა</Btn>}
    >
      {ph.show ? (
        <div className="py-2 my-auto"><RoleCard p={p} /></div>
      ) : (
        <div className="my-auto flex flex-col items-center text-center gap-2 py-6">
          <div className="w-16 h-16 rounded-full bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><Users className="w-8 h-8" /></div>
          <p className="mt-2 text-[14px] font-bold text-[#9a8b7b]">ახლა როლს ნახულობს</p>
          <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{p.name}</p>
          <Hint className="max-w-xs">სხვები ეკრანს ნუ უყურებენ. ნახე, დაიმახსოვრე, დამალე და ტელეფონი გადაეცი{next ? ` — შემდეგია ${next.name}` : ' მემატიანეს'}.</Hint>
        </div>
      )}
    </TableScreen>
  );
};

/** whose turn to speak, with the clock the host starts */
const Speaker: React.FC<{ name: string; total: number; audio: AudioRef; label?: string }> = ({ name, total, audio, label = 'ლაპარაკობს' }) => {
  const c = useCountdown(total, audio);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4 flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-[#9a8b7b]">{label}</p>
        <p className="font-serif-ge text-[28px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{name}</p>
        <Btn size="sm" kind={c.started ? 'ghost' : 'primary'} icon={c.started ? <RotateCcw /> : <Play />} onClick={() => (c.started ? c.reset() : c.start())} className="mt-2.5">
          {c.started ? 'თავიდან' : `${total === 60 ? '1 წუთი' : `${total} წამი`}`}
        </Btn>
      </div>
      <Ring left={c.left} total={total} />
    </div>
  );
};

const Order: React.FC<{ g: SamGame; order: number[]; at: number; accused?: number[] }> = ({ g, order, at, accused = [] }) => (
  <ol className="flex flex-wrap gap-1.5" aria-label="რიგი">
    {order.map((i, k) => (
      <li key={i} className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[13px] font-bold ${k === at ? 'bg-[#7a2028] text-[#fbf6ec]' : k < at ? 'bg-[#f1e8d9] text-[#9a8b7b]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]'}`}>
        <span className="tabular-nums text-[11px] opacity-70">{k + 1}</span>{g.players[i].name}{accused.includes(i) && <Gavel className="w-3.5 h-3.5" aria-label="ბრალდებული" />}
      </li>
    ))}
  </ol>
);

const OverNote: React.FC<{ g: SamGame }> = ({ g }) => (winner(g) ? (
  <p className="rounded-2xl bg-[#2f7d4f]/10 ring-1 ring-[#2f7d4f]/25 px-4 py-3 text-[14px] font-bold leading-snug text-[#24603d]">თამაში დასრულდა. გახსენი მატიანე და წაიკითხე, ვინ გაიმარჯვა.</p>
) : null);

export const MorningScreen: React.FC<Common> = ({ g, right, onBack, onClose, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'morning') return null;
  const taken = g.nights.find(x => x.n === ph.n)?.taken ?? null;
  const name = taken !== null ? g.players[taken].name : '';
  const over = !!winner(g);
  const dawn = ph.n === 1 ? 'დილა თენდება, ყველა იღვიძებს.' : 'დილა თენდება სამშვილდეში, ყველა იღვიძებს.';
  return (
    <TableScreen
      title={<span className="inline-flex items-center gap-2"><Sun className="w-4 h-4 text-[#c9a24a]" />{ph.n === 1 ? 'პირველი დილა' : `დილა ${ph.n}`}</span>}
      right={right}
      onClose={onClose}
      footer={
        <Foot onBack={onBack}>
          <Btn size="lg" full onClick={onNext} icon={over ? <ScrollText /> : <Users />} className={BIG}>{over ? 'მატიანე' : ph.n === 1 ? 'გაცნობის ბჭობა' : 'ბჭობა'}</Btn>
        </Foot>
      }
    >
      <div className="py-2 space-y-4">
        <Words>„{dawn}{ph.n > 1 && (taken !== null ? ` ამ ღამეს ტყვედ წაიყვანეს ${name}.` : ' ღამე მშვიდად ჩაიარა.')}“</Words>
        {ph.n === 1 ? (
          <Hint>პირველ ღამეს გატაცება არ ყოფილა. ახლა გაცნობის ბჭობაა: ყველა რიგით ამბობს თავის ხელობას და ერთ წინადადებას თავის თავზე.</Hint>
        ) : taken !== null ? (
          <>
            <div className="rounded-2xl bg-[#7a2028] px-4 py-5 text-center text-[#fbf6ec]">
              <p className="text-[13px] font-bold text-[#fbf6ec]/80">ამ ღამეს ტყვედ წაიყვანეს</p>
              <p className="mt-1 font-serif-ge text-[30px] font-bold leading-tight [overflow-wrap:anywhere]">{name}</p>
            </div>
            <Hint>{name} ერთ დამშვიდობების წინადადებას ამბობს{g.deal === 'cards' ? ', ბარათს პირქვე დებს ტყვეობის ხალიჩაზე' : ''} და დამკვირვებელი ხდება: უყურებს, არ ლაპარაკობს, არ ანიშნებს. როლი არ ცხადდება.</Hint>
          </>
        ) : (
          <Hint>რატომ ჩაიარა მშვიდად, არ ამბობ — ეს მატიანეში ბოლოს წაიკითხება.</Hint>
        )}
        <OverNote g={g} />
      </div>
    </TableScreen>
  );
};

export const IntroScreen: React.FC<Common> = ({ g, right, onBack, onClose, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'intro') return null;
  const order = g.players.map((_, i) => i);
  const last = ph.at === order.length - 1;
  return (
    <TableScreen
      title={`გაცნობის ბჭობა · ${ph.at + 1} / ${order.length}`}
      right={right}
      onClose={onClose}
      footer={<Foot onBack={onBack}><Btn size="lg" full onClick={onNext} icon={last ? <Moon /> : undefined} className={BIG}>{last ? 'ღამე 2' : 'შემდეგი'}</Btn></Foot>}
    >
      <div className="py-2 space-y-4">
        {ph.at === 0 && <Words>„ბჭობა იწყება. თითოეული რიგით ამბობს თავის ხელობას და ერთ წინადადებას თავის თავზე.“</Words>}
        <div className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-4">
          <p className="text-[13px] font-bold text-[#9a8b7b]">ლაპარაკობს</p>
          <p className="font-serif-ge text-[30px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{g.players[ph.at].name}</p>
          <Hint className="mt-1">თავის ხელობას და ერთ წინადადებას თავის თავზე.</Hint>
        </div>
        <Order g={g} order={order} at={ph.at} />
        <Hint>ბრალდება და ხმის მიცემა დღეს არ არის — ბოლოს ისევ ღამე დგება.</Hint>
      </div>
    </TableScreen>
  );
};

export const DayScreen: React.FC<Common & { audio: AudioRef; onAccuse: (accused: number | null) => void }> = ({ g, audio, right, onBack, onClose, onNext, onAccuse }) => {
  const ph = g.phase;
  if (ph.kind !== 'day') return null;
  const speaker = ph.order[ph.at];
  const last = ph.at === ph.order.length - 1;
  const accused = accusedOf(ph.accuse);
  const mine = ph.accuse[ph.at];
  return (
    <TableScreen
      title={`ბჭობა ${ph.n} · ${ph.at + 1} / ${ph.order.length}`}
      right={right}
      onClose={onClose}
      footer={<Foot onBack={onBack}><Btn size="lg" full onClick={onNext} icon={last ? <Gavel /> : undefined} className={BIG}>{last ? (accused.length ? 'ხმის მიცემა' : 'ბჭობის შედეგი') : 'შემდეგი სიტყვა'}</Btn></Foot>}
    >
      <div className="py-2 space-y-4">
        {ph.at === 0 && <Words>„ბჭობა იწყება. თითოს ერთი სიტყვა აქვს: ვინ ეეჭვება და რატომ.“</Words>}
        <Speaker key={`${ph.n}-${ph.at}`} name={g.players[speaker].name} total={speechOf(g)} audio={audio} />
        <NameGrid
          players={g.players}
          ids={ph.order.filter(i => i !== speaker)}
          picked={mine !== null && mine !== undefined ? [mine] : []}
          onPick={i => onAccuse(mine === i ? null : i)}
          label={<>სიტყვის ბოლოს შეუძლია ერთის დაბრალება: <span className="font-serif-ge whitespace-nowrap">„ვაბრალებ …“</span></>}
        />
        {accused.length > 0 && <p className="text-[13.5px] leading-snug text-[#4a3426]"><span className="font-bold text-[#7a2028]">დღის ბრალდებულები:</span> {accused.map(i => g.players[i].name).join(', ')}</p>}
        <Order g={g} order={ph.order} at={ph.at} accused={accused} />
        <Hint>სხვები არ აწყვეტინებენ — ეს ბჭობის წესია. შეურაცხყოფა არ შეიძლება, მხოლოდ საბუთი.</Hint>
      </div>
    </TableScreen>
  );
};

export const VoteScreen: React.FC<Common & { onCounts: (counts: number[]) => void }> = ({ g, right, onBack, onClose, onNext, onCounts }) => {
  const ph = g.phase;
  if (ph.kind !== 'vote') return null;
  const voters = live(g).length;
  const one = ph.candidates.length === 1;
  const sum = ph.counts.reduce((a, b) => a + b, 0);
  const set = (k: number, v: number) => onCounts(ph.counts.map((c, i) => (i === k ? Math.max(0, Math.min(voters, v)) : c)));
  const first = g.players[ph.candidates[0]].name;
  return (
    <TableScreen
      title={ph.round === 2 ? 'ხელახლა ხმის მიცემა' : 'ხმის მიცემა'}
      right={right}
      onClose={onClose}
      footer={<Foot onBack={onBack}><Btn size="lg" full onClick={onNext} icon={<Gavel />} className={BIG}>შედეგი</Btn></Foot>}
    >
      <div className="py-2 space-y-4">
        <Words>{one ? `„ვინ ამბობს, რომ ${first} ციხეში ჩაჯდეს?“` : '„ხმას ვაძლევთ. ბრალდებულებს რიგით ვასახელებ, თითოეული ერთხელ აწევს ხელს.“'}</Words>
        <ul className="space-y-2">
          {ph.candidates.map((i, k) => (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-2.5">
              <span className="min-w-0 flex-1 font-serif-ge text-[18px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{g.players[i].name}</span>
              <Hands value={ph.counts[k]} max={voters} onChange={v => set(k, v)} label={g.players[i].name} />
            </li>
          ))}
        </ul>
        {one ? (
          <Hint>ციხეში ჯდება, თუ ხმების ნახევარზე მეტი აქვს: საჭიროა მინიმუმ <b>{majority(voters)}</b> ხელი {voters}-დან.</Hint>
        ) : (
          <p className={`text-[13.5px] font-bold tabular-nums ${sum === voters ? 'text-[#2f7d4f]' : 'text-[#9a6a10]'}`}>
            ხმები: {sum} / {voters}{sum !== voters && ' — ყველამ ერთხელ უნდა აწიოს ხელი'}
          </p>
        )}
        <Hint>ხმას აძლევს ყველა, ვინც თამაშშია — დამკვირვებლები არა. ხმის მიცემა სავალდებულოა.</Hint>
      </div>
    </TableScreen>
  );
};

export const TieScreen: React.FC<Common & { audio: AudioRef }> = ({ g, audio, right, onBack, onClose, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'tie') return null;
  const last = ph.at === ph.tied.length - 1;
  return (
    <TableScreen
      title={`ფრე · ${ph.at + 1} / ${ph.tied.length}`}
      right={right}
      onClose={onClose}
      footer={<Foot onBack={onBack}><Btn size="lg" full onClick={onNext} icon={last ? <Gavel /> : undefined} className={BIG}>{last ? 'ხელახლა ხმის მიცემა' : 'შემდეგი'}</Btn></Foot>}
    >
      <div className="py-2 space-y-4">
        <Words>„ხმები გაიყო. {ph.tied.map(i => g.players[i].name).join(' და ')} თითო {TIE_SPEECH} წამს ლაპარაკობენ, მერე ხმას მხოლოდ მათზე ვაძლევთ.“</Words>
        <Speaker key={`${ph.n}-${ph.at}`} name={g.players[ph.tied[ph.at]].name} total={TIE_SPEECH} audio={audio} />
        <Hint>თუ ისევ ფრე იქნება, დღეს ციხეში არავინ ჯდება.</Hint>
      </div>
    </TableScreen>
  );
};

export const VerdictScreen: React.FC<Common> = ({ g, right, onBack, onClose, onNext }) => {
  const ph = g.phase;
  if (ph.kind !== 'verdict') return null;
  const day = g.days.find(d => d.n === ph.n);
  const over = !!winner(g);
  const name = ph.jailed !== null ? g.players[ph.jailed].name : '';
  const why = !day?.accused.length ? 'დღეს ბრალი არავის დასდეს.' : day.tie.length ? 'ხელახლა ხმის მიცემაზეც ფრე გამოვიდა.' : 'ნახევარზე მეტი ხმა ვერ შეგროვდა.';
  return (
    <TableScreen
      title={`ბჭობა ${ph.n} · შედეგი`}
      right={right}
      onClose={onClose}
      footer={<Foot onBack={onBack}><Btn size="lg" full onClick={onNext} icon={over ? <ScrollText /> : <Moon />} className={BIG}>{over ? 'მატიანე' : `ღამე ${ph.n + 1}`}</Btn></Foot>}
    >
      <div className="py-2 space-y-4">
        <Words>„{ph.jailed !== null ? `ციხეში ჩასვეს ${name}.` : 'დღეს ციხეში არავინ ჯდება.'}“</Words>
        {ph.jailed !== null ? (
          <>
            <div className="rounded-2xl bg-[#4a3426] px-4 py-5 text-center text-[#fbf6ec]">
              <Lock className="mx-auto w-6 h-6 text-[#e2c27a]" />
              <p className="mt-1.5 text-[13px] font-bold text-[#fbf6ec]/80">ციხეში ჩასვეს</p>
              <p className="mt-0.5 font-serif-ge text-[30px] font-bold leading-tight [overflow-wrap:anywhere]">{name}</p>
            </div>
            <Hint>{name} დამკვირვებელი ხდება{g.deal === 'cards' ? ', ბარათს პირქვე დებს ციხის ხალიჩაზე' : ''}. როლი არ ცხადდება.</Hint>
          </>
        ) : <Hint>{why}</Hint>}
        <OverNote g={g} />
      </div>
    </TableScreen>
  );
};
