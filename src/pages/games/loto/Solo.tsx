import React, { useEffect, useState } from 'react';
import { ChevronRight, Play, RotateCcw, TicketCheck, Timer, Trophy } from 'lucide-react';
import {
  CARD_SIZE, LOTO_CLIP, LOTO_ROUNDS, LOTO_SECONDS, NOT_MINE, lineCells, linesOf, newLotoSolo, parseLotoSolo, soloAnswer, soloDone,
  toLine, type LotoSolo,
} from '../../../utils/loto';
import { clock } from '../../../utils/amikhseni';
import { triggerHaptic } from '../../../utils/haptics';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn, Card, askConfirm } from '../../../components/ui/kit';
import { useMine } from '../../../components/games/useMine';
import { Hint } from '../samshvilde/parts';
import { SnippetBox, TimerRing, useNow } from '../rounds/parts';
import { useSnippet, type Clip } from '../rounds/useSnippet';
import { LotoCard, NotMine, useShort } from './Card';
import { Treasure, LotoOptions } from './face';
import { DECK_LABEL, makeDeck, openDecks } from './decks';
import { SOLO_RUN, decks, keepBest, loadKey, readBest, save } from './store';

// „საგალობო ლოტო“ alone (the plan's online variant: „მარტო ყურსასმენით“): one card of nine over a deck of thirteen; the pieces
// sound one by one and I mark them, or say „not on my card“. A mark stays; a wrong name wipes my last mark and that piece comes
// back later, so does a piece of mine I let go — until the card is full. The time I took is the score; the best per deck stays
// on this phone, and so does a game on its way (✕ only pauses).

const clipOf = (s: LotoSolo, piece: number): Clip | null => {
  const p = s.pieces[piece];
  if (!p) return null;
  if (p.book && p.num) return { score: { book: p.book, num: p.num }, voices: 0, seconds: LOTO_CLIP };
  return p.url ? { url: p.url, from: p.from ?? 0.2, seconds: LOTO_CLIP } : null;
};
const secs = (ms: number) => clock(Math.round(ms / 1000));

interface Run { s: LotoSolo; phase: 'ask' | 'show' | 'end'; t0: number; record?: boolean }

const readRun = (): LotoSolo | null => parseLotoSolo(loadKey(SOLO_RUN));

const WORDS = {
  mark: { tone: 'bg-[#2f7d4f] text-white', text: 'მონიშნე!' },
  clear: { tone: 'bg-[#a8d1b4] text-[#1e4d31]', text: 'სწორია — შენს ბარათზე არ არის' },
  missed: { tone: 'bg-[#4a3426] text-[#fbf6ec]', text: 'შენ გქონდა! მერე კიდევ მოვა' },
  wrong: { tone: 'bg-[#4a3426] text-[#fbf6ec]', text: 'არა!' },
} as const;

export const LotoSoloGame: React.FC = () => {
  const { program } = useMine();
  const [run, setRun] = useState<Run | null>(null);
  const [saved, setSaved] = useState<LotoSolo | null>(() => readRun());
  const [empty, setEmpty] = useState(false);
  const deck = decks.use();
  const open = openDecks();
  const cur = open.includes(deck) ? deck : 'chants';
  const best = readBest(cur);
  const snippet = useSnippet(LOTO_CLIP);
  const short = useShort();
  const now = useNow(run?.phase === 'ask');
  const s = run?.s ?? null;
  const piece = s && run?.phase !== 'end' ? s.queue[0] : undefined;
  const left = run?.phase === 'ask' ? Math.max(0, LOTO_SECONDS - (now - run.t0) / 1000) : 0;

  const keep = (x: LotoSolo | null) => { save(SOLO_RUN, x); setSaved(x); };
  /** in a tap: the next piece plays at once */
  const play = (x: LotoSolo) => {
    const c = x.queue.length ? clipOf(x, x.queue[0]) : null;
    if (c) snippet.play(c); else snippet.stop();
    return Date.now();
  };
  const begin = (x: LotoSolo) => {
    snippet.unlock();
    setRun({ s: x, phase: 'ask', t0: play(x) });
  };
  const start = () => {
    const d = makeDeck(cur, LOTO_ROUNDS, program);
    const x = d ? newLotoSolo(cur, d.names, d.pieces) : null;
    if (!x) { setEmpty(true); return; }
    setEmpty(false);
    keep(x);
    begin(x);
  };
  const answer = (pick: number) => {
    if (!run || run.phase !== 'ask' || !s) return;
    const ms = Math.min(LOTO_SECONDS * 1000, Date.now() - run.t0);
    const x = soloAnswer(s, pick, ms);
    triggerHaptic(x.last?.result === 'mark' || x.last?.result === 'clear' ? 12 : 30);
    snippet.stop();
    if (soloDone(x)) {
      keep(null);
      const record = keepBest(x.deck, { ms: x.spent, mistakes: x.mistakes, heard: x.heard });
      setRun({ s: x, phase: 'end', t0: run.t0, record });
      return;
    }
    keep(x);
    setRun({ s: x, phase: 'show', t0: run.t0 });
  };
  const next = () => { if (run && run.phase === 'show') setRun({ s: run.s, phase: 'ask', t0: play(run.s) }); };
  // the time over: not on my card
  const timedOut = run?.phase === 'ask' && left <= 0;
  useEffect(() => { if (timedOut) answer(NOT_MINE); }, [timedOut]); // eslint-disable-line react-hooks/exhaustive-deps
  // the answer's word stays a moment, then the next piece comes (sound may start without a tap: the first one let it)
  useEffect(() => {
    if (run?.phase !== 'show') return;
    const t = window.setTimeout(next, 2200);
    return () => window.clearTimeout(t);
  }, [run?.phase, run?.s.heard]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => { snippet.stop(); setRun(null); };
  const restart = async () => {
    if (saved && !(await askConfirm({ title: 'ახალი ბარათი?', text: 'დაწყებული თამაში წაიშლება.', ok: 'ახალი ბარათი' }))) return;
    start();
  };

  if (run && s) {
    if (run.phase === 'end') {
      const endBtns = (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full onClick={close} className="!h-14 !text-[15.5px]">დახურვა</Btn>
          <Btn size="lg" full onClick={start} icon={<RotateCcw />} className="!h-14 !text-[15.5px]">ახალი ბარათი</Btn>
        </div>
      );
      return (
        <TableScreen title="საგალობო ლოტო" onClose={close} footer={short ? undefined : <div className="mx-auto w-full max-w-[600px]">{endBtns}</div>}>
          <div className={short ? 'flex items-start justify-center gap-4 py-1' : 'mx-auto w-full max-w-[600px] py-2 space-y-4'}>
            <div className={short ? 'min-w-0 max-w-[420px] flex-1 space-y-4' : 'space-y-4'}>
              <Treasure sub="სრული ბარათი — ცხრავე მონიშნულია" />
              <div className="text-center">
                <Trophy className="mx-auto h-9 w-9 text-[#c9a227]" />
                <p className="mt-1 font-serif-ge text-[30px] font-bold tabular-nums text-[#4a3426]">{secs(s.spent)}</p>
                <Hint>{s.heard} ნაწყვეტი · {s.mistakes ? `${s.mistakes} შეცდომა` : 'უშეცდომოდ'}{s.firstLine ? ` · პირველი ხაზი: ნაწყვეტი ${s.firstLine}` : ''}</Hint>
                {run.record && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#c9a227]/15 px-3 py-1 text-[13.5px] font-bold text-[#8a6d12]">ახალი რეკორდი!</p>}
              </div>
              {short && endBtns}
            </div>
            <LotoCard names={s.names} card={s.card} marked={s.marks} lines={lineCells(s.card, s.marks)} side={short} />
          </div>
        </TableScreen>
      );
    }
    const last = s.last;
    const showing = run.phase === 'show' && last;
    const clip = piece !== undefined ? clipOf(s, piece) : null;
    const tapClip = () => {
      if (!clip || run.phase !== 'ask') return;
      if (snippet.state === 'play' || snippet.state === 'load') snippet.stop(); else snippet.play(clip);
    };
    const lineNow = showing && last.result === 'mark' && linesOf(s.card, s.marks) > linesOf(s.card, s.marks.slice(0, -1));
    const need = toLine(s.card, s.marks);
    const status = (
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] font-bold tabular-nums text-[#75685a]">
          მონიშნული {s.marks.length} / {CARD_SIZE} · ნაწყვეტი {s.heard + (run.phase === 'ask' ? 1 : 0)}{s.mistakes ? ` · შეცდომა ${s.mistakes}` : ''}
        </p>
        {run.phase === 'ask' && <TimerRing left={left} total={LOTO_SECONDS} size="sm" />}
      </div>
    );
    const word = showing ? (
      lineNow ? <Treasure first={linesOf(s.card, s.marks) === 1} /> : (
        <div className={`rounded-3xl px-4 py-3.5 ${WORDS[last.result].tone}`} role="status">
          <p className="font-serif-ge text-[19px] font-bold leading-snug">{WORDS[last.result].text}</p>
          {last.result !== 'clear' && (
            <p className="mt-0.5 text-[13.5px] font-bold opacity-90">
              ჟღერდა „{s.names[last.piece]}“{last.result === 'wrong' ? (s.card.includes(last.piece) ? ' — ის შენს ბარათზეა, კიდევ მოვა' : ' — ის შენს ბარათზე არ არის') : ''}
            </p>
          )}
          {last.erased !== undefined && <p className="mt-0.5 text-[13px] opacity-90">წაიშალა შენი ბოლო მონიშვნა — „{s.names[last.erased]}“, ის კიდევ მოვა.</p>}
        </div>
      )
    ) : (
      clip && <SnippetBox state={snippet.state} prog={snippet.prog} onTap={tapClip} />
    );
    const cardEl = (
      <LotoCard
        names={s.names}
        card={s.card}
        marked={s.marks}
        lines={lineCells(s.card, s.marks)}
        right={showing && last.result === 'missed' ? last.piece : undefined}
        wrong={showing && last.result === 'wrong' && last.pick >= 0 ? last.pick : undefined}
        fresh={showing && last.result === 'mark' ? last.piece : undefined}
        onTap={run.phase === 'ask' ? answer : undefined}
        side={short}
      />
    );
    const asking = run.phase === 'ask' && (
      <>
        <NotMine on={false} onClick={() => answer(NOT_MINE)} />
        <p className="text-center text-[12.5px] font-bold text-[#9a8b7b]">{need === 1 ? 'ხაზამდე ერთიღა გაკლია!' : 'შეცდომა ბოლო მონიშვნას შლის.'}</p>
      </>
    );
    const nextBtn = <Btn size="lg" full onClick={next} icon={<ChevronRight />} className="!h-14 !text-[16px]">შემდეგი ნაწყვეტი</Btn>;
    return (
      <TableScreen title="საგალობო ლოტო" onClose={close} footer={showing && !short ? <div className="mx-auto w-full max-w-[600px]">{nextBtn}</div> : undefined}>
        {short ? (
          <div className="flex items-start justify-center gap-4 py-1">
            <div className="min-w-0 max-w-[420px] flex-1 space-y-3">
              {status}
              {word}
              {asking}
              {showing && nextBtn}
            </div>
            {cardEl}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[600px] py-2 space-y-3.5">
            {status}
            {word}
            {cardEl}
            {asking}
          </div>
        )}
      </TableScreen>
    );
  }

  return (
    <Card className="!p-4 sm:!p-5 space-y-4">
      <div>
        <p className="flex items-center gap-2 font-serif-ge text-[18px] font-bold text-[#4a3426]"><TicketCheck className="h-5 w-5 text-[#7a2028]" />ბარათი მარტოს</p>
        <p className="mt-1.5 text-[13px] leading-snug text-[#75685a]">
          ბარათზე ცხრა სახელია. ნაწყვეტები ერთმანეთის მიყოლებით ჟღერს: თუ შენს ბარათზეა, მონიშნე, თუ არა — „არ არის“. შეცდომა შენს ბოლო
          მონიშვნას შლის. თამაში მაშინ მთავრდება, როცა ცხრავე მონიშნულია — რაც უფრო მალე, მით უკეთესი. ყურსასმენით ჯობია.
        </p>
      </div>
      {best && (
        <p className="flex items-center gap-2 rounded-2xl bg-[#c9a227]/10 px-3.5 py-2.5 text-[13.5px] font-bold text-[#6f5610]">
          <Timer className="h-4 w-4 shrink-0" />შენი რეკორდი ({DECK_LABEL[cur]}): {secs(best.ms)} · {best.mistakes ? `${best.mistakes} შეცდომა` : 'უშეცდომოდ'}
        </p>
      )}
      <LotoOptions />
      {empty && <p className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-3.5 py-2.5 text-[13px] font-bold text-amber-900">ამ ბარათისთვის ნაწყვეტები ვერ მოიძებნა.</p>}
      {saved ? (
        <div className="grid grid-cols-2 gap-2">
          <Btn kind="ghost" size="lg" full onClick={restart} icon={<RotateCcw />} className="!h-14 !text-[15px]">ახალი</Btn>
          <Btn size="lg" full onClick={() => begin(saved)} icon={<Play />} className="!h-14 !text-[15.5px]">გაგრძელება</Btn>
        </div>
      ) : (
        <Btn size="lg" full onClick={start} icon={<Play />} className="!h-14 !text-[16px]">დაწყება</Btn>
      )}
      {saved && <Hint>დაწყებული: {DECK_LABEL[saved.deck]} · მონიშნული {saved.marks.length} / {CARD_SIZE}</Hint>}
    </Card>
  );
};
