import React, { useEffect, useRef, useState } from 'react';
import { Check, Eye, Home, Play, Square } from 'lucide-react';
import { ezoGame } from '../../../data/ezoGames';
import { newSeek, seekResult, tapHider, type EzoRound, type SeekMark } from '../../../utils/ezo';
import { clock } from '../../../utils/amikhseni';
import { closeAudio, openAudio, tick, whistle } from '../../../utils/gameSounds';
import { triggerHaptic } from '../../../utils/haptics';
import { Btn, askConfirm } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import { TimerRing, useNow } from '../rounds/parts';
import { roundId } from './store';

// „დამალობანა“ on the referee's phone: the seeker counts aloud with the phone (a tick a number), the long whistle sends them
// seeking, the seeking time ends with two long blasts („ყველა შინ!“); meanwhile the referee taps each hider — found or safe.
// Whoever was not found wins; the first found seeks next.

type Phase = 'ready' | 'count' | 'seek' | 'end';

const MARK: Record<SeekMark, { text: string; cls: string }> = {
  hidden: { text: 'დამალულია', cls: 'bg-white ring-1 ring-[#e8dcc8] text-[#4a3426]' },
  found: { text: 'ნაპოვნია', cls: 'bg-[#b23a48] text-white ring-1 ring-[#b23a48]' },
  safe: { text: 'შინ არის', cls: 'bg-[#2f7d4f] text-white ring-1 ring-[#2f7d4f]' },
};

export const SeekScreen: React.FC<{
  players: string[];
  firstSeeker: string;
  count: number;
  minutes: number;
  onRecord: (r: EzoRound) => void;
  onClose: () => void;
}> = ({ players, firstSeeker, count, minutes, onRecord, onClose }) => {
  const g = ezoGame('damalobana')!;
  const audio = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [n, setN] = useState(0);
  const [seek, setSeek] = useState(() => newSeek(firstSeeker, players));
  const [t0, setT0] = useState(0);
  const [round, setRound] = useState(1);
  const now = useNow(phase === 'seek');
  const total = minutes * 60;
  const left = phase === 'seek' ? Math.max(0, total - (now - t0) / 1000) : total;
  const named = players.length > 1;
  useEffect(() => () => closeAudio(audio), []);

  // counting aloud with the phone: a tick a second, the last five louder
  useEffect(() => {
    if (phase !== 'count') return;
    if (n >= count) {
      whistle(audio.current, 'l');
      triggerHaptic(80);
      setT0(Date.now());
      setPhase('seek');
      return;
    }
    const t = setTimeout(() => { tick(audio.current, n + 1 > count - 5); setN(n + 1); }, n === 0 ? 300 : 1000);
    return () => clearTimeout(t);
  }, [phase, n, count]);

  useEffect(() => {
    if (phase === 'seek' && left <= 0) {
      whistle(audio.current, 'll');
      triggerHaptic(60);
      setPhase('end');
    }
  }, [phase, left]);

  const startCount = () => { openAudio(audio); triggerHaptic(10); setN(0); setPhase('count'); };
  const stop = async () => {
    if (!(await askConfirm({ title: 'ძებნა დასრულდეს?', text: 'ტელეფონი „ყველა შინ!“-ს ჩაუსტვენს.', ok: 'დასრულება' }))) return;
    openAudio(audio);
    whistle(audio.current, 'll');
    setPhase('end');
  };
  const { winners, nextSeeker } = seekResult(seek);
  const record = () => {
    if (named) onRecord({ id: roundId(), game: 'damalobana', at: Date.now(), players: [seek.seeker, ...seek.hiders], winners });
    triggerHaptic(15);
    setSeek(newSeek(nextSeeker, players));
    setRound(round + 1);
    setN(0);
    setPhase('ready');
  };

  const chips = named && (
    <ul className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2" aria-label="დამალულები">
      {seek.hiders.map(h => {
        const mk = seek.marks[h] ?? 'hidden';
        const order = seek.found.indexOf(h);
        return (
          <li key={h}>
            <button
              type="button"
              onClick={() => { triggerHaptic(6); setSeek(tapHider(seek, h)); }}
              className={`w-full min-h-[52px] rounded-2xl px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer active:scale-[0.98] transition ${MARK[mk].cls}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold leading-tight [overflow-wrap:anywhere]">{h}</span>
                <span className={`block text-[11.5px] font-bold ${mk === 'hidden' ? 'text-[#9a8b7b]' : 'text-white/85'}`}>{MARK[mk].text}{order === 0 ? ' · პირველი' : ''}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const footer = phase === 'ready'
    ? <Btn size="lg" full icon={<Eye />} onClick={startCount} className="!h-14 !text-[16px]">დათვლის დაწყება · {count}</Btn>
    : phase === 'count' ? <Btn kind="ghost" size="lg" full disabled className="!h-14 !text-[15.5px]">ითვლის… {n}</Btn>
    : phase === 'seek' ? <Btn kind="ghost" size="lg" full icon={<Square />} onClick={() => { void stop(); }} className="!h-14 !text-[15.5px]">ძებნის დასრულება</Btn>
    : (
      <Btn size="lg" full icon={named ? <Check /> : <Play />} onClick={record} className="!h-14 !text-[15.5px]">
        {named ? 'ჩაწერა · შემდეგი რაუნდი' : 'შემდეგი რაუნდი'}
      </Btn>
    );

  return (
    <TableScreen title={`${g.name} · რაუნდი ${round}`} onClose={onClose} footer={footer}>
      <div className="flex-1 w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 py-3 text-center">
        {phase === 'ready' && (
          <>
            <p className="text-[13px] font-bold text-[#9a8b7b]">მეძებარი</p>
            <p className="font-serif-ge text-[34px] font-bold leading-tight text-[#7a2028] [overflow-wrap:anywhere]">{named ? seek.seeker : 'მეძებარი „შინ“ დგება'}</p>
            <p className="max-w-sm text-[14px] leading-relaxed text-[#75685a]">
              თვალი დახუჭე და ტელეფონთან ერთად ხმამაღლა ითვალე {count}-მდე. დანარჩენები — დაიმალეთ! ძებნას {minutes} წუთი აქვს.
            </p>
          </>
        )}
        {phase === 'count' && (
          <>
            <p className="text-[13px] font-bold text-[#9a8b7b]">ხმამაღლა ითვალე!</p>
            <p aria-live="polite" className="font-serif-ge text-[120px] font-bold leading-none tabular-nums text-[#7a2028]">{n || '…'}</p>
            <p className="text-[13px] tabular-nums text-[#9a8b7b]">{count}-მდე</p>
          </>
        )}
        {phase === 'seek' && (
          <>
            <p className="font-serif-ge text-[19px] font-bold leading-snug text-[#7a2028]">„მოვდივარ! ვინც ვერ დაიმალა, ჩემი ბრალი არ არის!“</p>
            <TimerRing left={left} total={total} />
            <p className="text-[12.5px] leading-snug text-[#75685a]">{named ? 'შეეხე სახელს: ნაპოვნია → შინ არის → დამალულია.' : `${clock(Math.ceil(left))} დარჩა — ბოლოს ორი გრძელი სასტვენი.`}</p>
            {chips}
          </>
        )}
        {phase === 'end' && (
          <>
            <Home className="w-9 h-9 text-[#2f7d4f]" aria-hidden="true" />
            <p className="font-serif-ge text-[26px] font-bold leading-tight text-[#4a3426]">ყველა შინ!</p>
            {named ? (
              <>
                <p className="text-[14px] leading-snug text-[#4a3426]">
                  {winners.length ? <><span className="font-bold">გადარჩნენ:</span> {winners.join(', ')}</> : 'ყველა იპოვეს — მეძებარმა კარგად ეძება!'}
                </p>
                <p className="text-[13.5px] leading-snug text-[#75685a]">შემდეგი მეძებარი: <span className="font-bold text-[#7a2028]">{nextSeeker}</span></p>
                <p className="text-[12.5px] text-[#9a8b7b]">რამე შეგეშალა? შეასწორე, სანამ ჩაწერ.</p>
                {chips}
              </>
            ) : <p className="text-[14px] text-[#75685a]">ვინც პირველი იპოვეს, ის ეძებს შემდეგ რაუნდში.</p>}
          </>
        )}
      </div>
    </TableScreen>
  );
};
