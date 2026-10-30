import React, { useState } from 'react';
import { Moon } from 'lucide-react';
import { holder, inPlay, isSpy, live, stepsOf, targetsOf, type NightActs } from '../../../../utils/samshvilde';
import { waitingFor, type OnlineState } from '../../../../utils/samshvildeOnline';
import { TableScreen } from '../../../../components/games/TableScreen';
import { Btn, askConfirm } from '../../../../components/ui/kit';
import type { AudioRef } from '../../../../utils/gameSounds';
import { Hint, RosterBtn, Words } from '../parts';
import { NightScreen } from '../NightScreen';
import { DayScreen, IntroScreen, MorningScreen, TieScreen, VerdictScreen, VoteScreen } from '../DayScreens';
import { EndScreen, RosterScreen } from '../EndScreen';
import { CallBtn, type GameCall } from './GameCall';
import { SeenList } from './bits';

// The host's phone in the online game (მემატიანე, who does not play): the one-phone game's screens, fed by the players'
// phones — the deal shows who has looked, the night what each role chose, the speeches end on the speaker's phone, the
// hands come in by themselves. The host reads the words aloud in the call, starts the speech clock on every phone and moves
// the game on; moving on while somebody still has to answer asks first. The table with every role opens after a confirm.

export interface HostMoves {
  next: () => void;
  acts: (acts: NightActs) => void;
  accuse: (accused: number | null) => void;
  clock: () => void;
  back: () => void;
  again: () => void;
  close: () => void;
}

const lastHands = (s: OnlineState, n: number) => [...s.hands].reverse().find(h => h.n === n) ?? null;

/** what moving on now leaves out, in words (null: nothing) */
const leftOut = (s: OnlineState): { title: string; text: string } | null => {
  const g = s.g;
  const ph = g.phase;
  const names = (ids: number[]) => ids.map(i => g.players[i].name).join(', ');
  const w = waitingFor(s);
  if (ph.kind === 'deal') return w.length ? { title: 'ყველას არ უნახავს თავისი როლი', text: `ჯერ არ უნახავს: ${names(w)}. მაინც დაიწყოს ღამე?` } : null;
  if (ph.kind === 'vote') return w.length ? { title: 'ყველას არ მიუცია ხმა', text: `ელოდება: ${names(w)}. ვინც ხმა არ მისცა, არავის მისცა.` } : null;
  if (ph.kind !== 'night') return null;
  const step = stepsOf(g, ph.n)[ph.step];
  if (step === 'spies' && ph.acts.spies === undefined && targetsOf(g, 'spies', ph.n).length) {
    const boss = holder(g, 'boss');
    const bossPick = inPlay(g, boss) ? s.by[boss] ?? null : null;
    return {
      title: 'ჯაშუშები ვერ შეთანხმდნენ',
      text: bossPick !== null ? `თავკაცის არჩევანი ჩაითვლება: ${g.players[bossPick].name}.` : 'ამ ღამეს არავინ მიჰყავთ.',
    };
  }
  return w.length ? { title: 'ჯერ არ აურჩევია', text: `${names(w)} ჯერ ირჩევს. თუ გააგრძელებ, ამ ღამეს მისი არჩევანი არ ჩაითვლება.` } : null;
};

const HostDeal: React.FC<{ s: OnlineState; right: React.ReactNode; onHide: () => void; onNext: () => void }> = ({ s, right, onHide, onNext }) => {
  const names = s.g.players.map(p => p.name);
  const seen = s.by.flatMap((x, i) => (x === 1 ? [i] : []));
  return (
    <TableScreen
      title="როლების დარიგება"
      right={right}
      onClose={onHide}
      footer={<Btn size="lg" full icon={<Moon />} onClick={onNext} className="!h-14 !text-[16px]">ღამის დაწყება</Btn>}
    >
      <div className="py-2 space-y-4">
        <Words>„თითოეული თავის ტელეფონზე ნახულობს თავის როლს. ნახეთ ისე, რომ სხვამ ვერ დაინახოს, დაიმახსოვრეთ და დამალეთ.“</Words>
        <SeenList names={names} seen={seen} />
        <Hint>როცა ყველა ნახავს, დაიწყე ღამე. ყველას როლს შენი ცხრილი აჩვენებს (ზემოთ, მარჯვნივ) — გახსენი მხოლოდ მაშინ, როცა ეკრანს სხვა ვერ ხედავს.</Hint>
      </div>
    </TableScreen>
  );
};

export const HostGame: React.FC<{ s: OnlineState; canBack: boolean; audio: AudioRef; gc: GameCall; moves: HostMoves; onHide: () => void }> = ({
  s, canBack, audio, gc, moves, onHide,
}) => {
  const [roster, setRoster] = useState(false);
  const g = s.g;
  const ph = g.phase;
  const night = ph.kind === 'night';
  const openRoster = async () => {
    if (await askConfirm({ title: 'მემატიანის ცხრილი გაიხსნას?', text: 'აქ ყველას როლი ჩანს. გახსენი მხოლოდ მაშინ, როცა ეკრანს სხვა ვერ ხედავს — არც ვიდეოში.', ok: 'გახსნა' })) setRoster(true);
  };
  const next = async () => {
    const miss = leftOut(s);
    if (miss && !(await askConfirm({ title: miss.title, text: miss.text, ok: 'გაგრძელება' }))) return;
    moves.next();
  };
  const right = <><CallBtn gc={gc} dark={night} /><RosterBtn dark={night} onClick={openRoster} /></>;
  const common = { g, right, onBack: canBack ? moves.back : undefined, onClose: onHide };

  if (roster) return <RosterScreen g={g} onClose={() => setRoster(false)} />;
  switch (ph.kind) {
    case 'deal': return <HostDeal s={s} right={right} onHide={onHide} onNext={next} />;
    case 'night':
      return (
        <NightScreen
          {...common}
          audio={audio}
          online={{ den: live(g).filter(i => isSpy(g.players[i].role)).map(i => ({ i, pick: s.by[i] ?? null })) }}
          onChange={p => { if (p.acts) moves.acts(p.acts); }}
          onNext={next}
        />
      );
    case 'morning': return <MorningScreen {...common} onNext={next} />;
    case 'intro': return <IntroScreen {...common} online onNext={next} />;
    case 'day': return <DayScreen {...common} audio={audio} clock={s.clock} clockAt={s.clockAt} onClock={moves.clock} onAccuse={moves.accuse} onNext={next} />;
    case 'vote': return <VoteScreen {...common} ballots={s.by} onCounts={() => { /* the hands come from the phones */ }} onNext={next} />;
    case 'tie': return <TieScreen {...common} audio={audio} clock={s.clock} clockAt={s.clockAt} onClock={moves.clock} onNext={next} />;
    case 'verdict': return <VerdictScreen {...common} hands={lastHands(s, ph.n)} onNext={next} />;
    case 'end':
      return (
        <EndScreen
          g={g}
          right={<CallBtn gc={gc} />}
          onHide={onHide}
          onClose={moves.close}
          closeLabel="დახურვა"
          onAgain={async () => {
            if (await askConfirm({ title: 'იგივე მოთამაშეებით თავიდან?', text: 'როლები ხელახლა დარიგდება და ყველა თავის ტელეფონზე ნახავს.', ok: 'თავიდან' })) moves.again();
          }}
        />
      );
  }
};
