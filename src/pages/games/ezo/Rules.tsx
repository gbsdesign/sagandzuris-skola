import React, { useRef, useState } from 'react';
import { Check, ChevronRight, ListChecks, ListOrdered, MapPin, Megaphone, Package, Play, RotateCcw, ShieldCheck, Star, Trophy, X } from 'lucide-react';
import { EZO_GAMES, EZO_SIGNALS, ezoGame, type EzoGameDef, type EzoId } from '../../../data/ezoGames';
import { QUIZ_SIZE, quizDeal, quizStars, type EzoQuizCard } from '../../../utils/ezo';
import { buzz, chime, closeAudio, openAudio, whistle } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, Card } from '../../../components/ui/kit';
import { Chip } from '../../../components/games/Chip';
import { Hint } from '../samshvilde/parts';
import { Letter } from '../rounds/four';
import { Field } from './Field';
import { QUIZ_BEST_KEY, readJson, writeJson } from './store';

// „ეზოს მსაჯი“ — the hub's „ონლაინ“: the five yard games' rules as picture cards, the referee's whistle to hear, and a quiz
// of ten on the rules (one of every game at least) — learned at home, played in the yard.

const PATTERN: Record<(typeof EZO_SIGNALS)[number]['id'], string> = { go: 'l', stop: 's', point: 'ss', end: 'sss', home: 'll' };

const Part: React.FC<{ title: string; Icon: typeof Package; children: React.ReactNode }> = ({ title, Icon, children }) => (
  <section className="space-y-1.5">
    <h3 className="text-[13.5px] font-bold text-[#7a2028] flex items-center gap-1.5"><Icon className="w-4 h-4" aria-hidden="true" />{title}</h3>
    {children}
  </section>
);

const RuleCard: React.FC<{ g: EzoGameDef }> = ({ g }) => (
  <Card className="!p-0 overflow-hidden">
    <Field id={g.id} label={`${g.name}: მოედნის სურათი`} className="w-full bg-[#fbf6ec] p-3" />
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-serif-ge text-[21px] font-bold leading-tight text-[#4a3426]">{g.name}</h2>
        <p className="mt-0.5 text-[12.5px] text-[#9a8b7b]">
          ({g.like}) · {g.players[0]}–{g.players[1]} მოთამაშე{g.minutes.length ? ` · ${g.minutes[0]}–${g.minutes[g.minutes.length - 1]} წუთი` : ''}
        </p>
        <p className="mt-2 text-[14.5px] leading-snug text-[#4a3426]">{g.lead}</p>
      </div>
      <Part title="რა გვჭირდება" Icon={Package}>
        <ul className="space-y-1 text-[13.5px] leading-snug text-[#4a3426]">{g.needs.map((x, i) => <li key={i} className="flex gap-2"><span className="text-[#c9a227]">•</span><span>{x}</span></li>)}</ul>
      </Part>
      <Part title="მოედანი" Icon={MapPin}>
        <ul className="space-y-1 text-[13.5px] leading-snug text-[#4a3426]">{g.setup.map((x, i) => <li key={i} className="flex gap-2"><span className="text-[#c9a227]">•</span><span>{x}</span></li>)}</ul>
      </Part>
      <Part title="როგორ ვთამაშობთ" Icon={ListOrdered}>
        <ol className="space-y-2">
          {g.steps.map((x, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[14px] leading-snug text-[#4a3426]">
              <span className="w-6 h-6 mt-px shrink-0 rounded-full bg-[#7a2028] text-white text-[12.5px] font-bold flex items-center justify-center tabular-nums">{i + 1}</span>
              <span>{x}</span>
            </li>
          ))}
        </ol>
      </Part>
      <Part title="ვინ იგებს" Icon={Trophy}>
        <p className="text-[14px] leading-snug text-[#4a3426]">{g.win}</p>
      </Part>
      <Part title="უსაფრთხოდ" Icon={ShieldCheck}>
        <ul className="space-y-1 text-[13.5px] leading-snug text-[#4a3426]">{g.safe.map((x, i) => <li key={i} className="flex gap-2"><span className="text-[#2f7d4f]">✓</span><span>{x}</span></li>)}</ul>
      </Part>
    </div>
  </Card>
);

const Signals: React.FC = () => {
  const audio = useRef<AudioContext | null>(null);
  React.useEffect(() => () => closeAudio(audio), []);
  return (
    <Card className="!p-4 space-y-3">
      <p className="font-serif-ge text-[16px] font-bold text-[#4a3426] flex items-center gap-2"><Megaphone className="w-5 h-5 text-[#7a2028]" />მსაჯის სასტვენი</p>
      <ul className="space-y-1.5">
        {EZO_SIGNALS.map(s => (
          <li key={s.id} className="flex items-center gap-3 min-h-12 rounded-2xl bg-[#fbf6ec] px-2 py-1.5">
            <button type="button" onClick={() => { openAudio(audio); triggerHaptic(6); whistle(audio.current, PATTERN[s.id]); }} aria-label={`${s.sign} — მოსმენა`} className="w-10 h-10 shrink-0 rounded-full bg-[#7a2028] text-white flex items-center justify-center cursor-pointer active:scale-[0.95] transition">
              <Play className="w-4 h-4 ml-0.5" />
            </button>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold leading-tight text-[#4a3426]">{s.sign}</span>
              <span className="block text-[12.5px] leading-snug text-[#75685a]">{s.says}</span>
            </span>
            <span className="shrink-0 flex items-center gap-1 pr-1" aria-hidden="true">
              {[...PATTERN[s.id]].map((p, i) => <span key={i} className={`h-2 rounded-full bg-[#7a2028] ${p === 'l' ? 'w-7' : 'w-2.5'}`} />)}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const readBest = () => { const v = readJson(QUIZ_BEST_KEY); return typeof v === 'number' ? v : null; };

const Quiz: React.FC<{ deal: EzoQuizCard[]; onClose: () => void; onAgain: () => void }> = ({ deal, onClose, onAgain }) => {
  const audio = useRef<AudioContext | null>(null);
  const [at, setAt] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [best, setBest] = useState(readBest);
  React.useEffect(() => () => closeAudio(audio), []);
  const done = at >= deal.length;
  const q = deal[Math.min(at, deal.length - 1)];

  const choose = (i: number) => {
    if (pick !== null) return;
    openAudio(audio);
    setPick(i);
    if (i === q.right) { setRight(right + 1); chime(audio.current, 2); triggerHaptic(12); }
    else { buzz(audio.current); triggerHaptic(60); }
  };
  const next = () => {
    triggerHaptic(6);
    if (at + 1 >= deal.length) {
      if (best === null || right > best) { setBest(right); writeJson(QUIZ_BEST_KEY, right); }
    }
    setAt(at + 1);
    setPick(null);
  };

  if (done) {
    const stars = quizStars(right, deal.length);
    return (
      <Card className="!p-5 space-y-4 text-center">
        <div className="flex justify-center gap-1.5" aria-label={`${stars} ვარსკვლავი`}>
          {[0, 1, 2].map(i => <Star key={i} className={`w-9 h-9 ${i < stars ? 'text-[#c9a227] fill-[#c9a227]' : 'text-[#e8dcc8]'}`} />)}
        </div>
        <p className="font-serif-ge text-[28px] font-bold text-[#4a3426] tabular-nums">{right} / {deal.length}</p>
        <p className="text-[14px] leading-snug text-[#75685a]">
          {right === deal.length ? 'ყველა სწორია — შენ თვითონ შეგიძლია ეზოში მსაჯობა!' : right >= deal.length - 2 ? 'კარგია! ერთი-ორი წესი კიდევ გადახედე.' : 'წესები კიდევ ერთხელ წაიკითხე და სცადე თავიდან.'}
        </p>
        {best !== null && <p className="text-[13px] text-[#9a8b7b]">საუკეთესო: {best} / {QUIZ_SIZE}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full onClick={onClose} className="!h-12">წესები</Btn>
          <Btn size="lg" full icon={<RotateCcw />} onClick={onAgain} className="!h-12">თავიდან</Btn>
        </div>
      </Card>
    );
  }

  const game = q.game ? ezoGame(q.game) : undefined;
  return (
    <Card className="!p-4 space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[13px] font-bold tabular-nums text-[#9a8b7b]">კითხვა {at + 1} / {deal.length}</p>
        <div className="flex-1 h-2 rounded-full bg-[#f1e8d9] overflow-hidden"><div className="h-full rounded-full bg-[#7a2028] transition-[width]" style={{ width: `${(at / deal.length) * 100}%` }} /></div>
        <button type="button" onClick={onClose} aria-label="ვიქტორინის დახურვა" className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#7a2028] hover:bg-[#7a2028]/[0.07] cursor-pointer"><X className="w-5 h-5" /></button>
      </div>
      <div>
        <p className="text-[12.5px] font-bold text-[#a0703c]">{game ? game.name : 'ეზოს თამაშები'}</p>
        <p className="mt-1 font-serif-ge text-[18.5px] font-bold leading-snug text-[#4a3426]">{q.q}</p>
      </div>
      <ul className="space-y-2">
        {q.options.map((o, i) => {
          const isRight = pick !== null && i === q.right;
          const isWrong = pick === i && i !== q.right;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={pick !== null}
                className={`w-full min-h-14 rounded-2xl px-3 py-2 flex items-center gap-3 text-left cursor-pointer transition active:scale-[0.99] disabled:cursor-default ${isRight ? 'bg-[#2f7d4f]/[0.1] ring-2 ring-[#2f7d4f]' : isWrong ? 'bg-[#b23a48]/[0.08] ring-2 ring-[#b23a48]' : 'bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/40'} ${pick !== null && !isRight && !isWrong ? 'opacity-60' : ''}`}
              >
                <Letter i={i} size="sm" />
                <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-snug text-[#4a3426]">{o}</span>
                {isRight && <Check className="w-5 h-5 shrink-0 text-[#2f7d4f]" />}
                {isWrong && <X className="w-5 h-5 shrink-0 text-[#b23a48]" />}
              </button>
            </li>
          );
        })}
      </ul>
      {pick !== null && (
        <div className="space-y-3">
          <p role="status" className={`text-[14px] font-bold ${pick === q.right ? 'text-[#2f7d4f]' : 'text-[#b23a48]'}`}>
            {pick === q.right ? 'სწორია!' : `არა — სწორია: ${q.options[q.right]}`}
          </p>
          {q.note && <p className="text-[13.5px] leading-snug text-[#75685a]">{q.note}</p>}
          <Btn size="lg" full icon={<ChevronRight />} onClick={next} className="!h-12">{at + 1 >= deal.length ? 'შედეგი' : 'შემდეგი'}</Btn>
        </div>
      )}
    </Card>
  );
};

export const EzoRules: React.FC = () => {
  const [game, setGame] = useState<EzoId>('ordrosha');
  const [deal, setDeal] = useState<EzoQuizCard[] | null>(null);
  const [round, setRound] = useState(0);
  const best = readBest();
  const g = ezoGame(game)!;
  const startQuiz = () => { triggerHaptic(10); setDeal(quizDeal(Math.floor(Math.random() * 1e9))); setRound(round + 1); window.scrollTo({ top: 0 }); };

  if (deal) return <Quiz key={round} deal={deal} onClose={() => setDeal(null)} onAgain={startQuiz} />;
  return (
    <div className="space-y-3">
      <Card className="!p-4 space-y-3">
        <div>
          <p className="font-serif-ge text-[17px] font-bold leading-snug text-[#4a3426]">ეზოს თამაშების წესები</p>
          <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">ხუთი თამაში სურათებით. წაიკითხე, მოისმინე მსაჯის სასტვენი და ვიქტორინით შეამოწმე — ეზოში კი მასწავლებლის ტელეფონი იქნება მსაჯი.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="თამაში">
          {EZO_GAMES.map(x => <Chip key={x.id} on={game === x.id} onClick={() => setGame(x.id)}>{x.name}</Chip>)}
        </div>
      </Card>
      <RuleCard key={g.id} g={g} />
      <Card tone="paper" className="!p-4 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-[#7a2028]/[0.08] text-[#7a2028] flex items-center justify-center"><ListChecks className="w-5 h-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-serif-ge text-[16px] font-bold text-[#4a3426]">წესების ვიქტორინა</p>
            <p className="mt-0.5 text-[13px] leading-snug text-[#75685a]">{QUIZ_SIZE} კითხვა ხუთივე თამაშზე{best !== null ? ` · საუკეთესო: ${best}/${QUIZ_SIZE}` : ''}</p>
          </div>
        </div>
        <Btn size="lg" full icon={<Play />} onClick={startQuiz} className="!h-12">დაწყება</Btn>
      </Card>
      <Signals />
      <Hint>წესები და კითხვები Claude-მა დაწერა ისე, როგორც ბავშვები ჩვეულებრივ თამაშობენ — მასწავლებელს ჯერ არ შეუმოწმებია.</Hint>
    </div>
  );
};
