import React from 'react';
import { Crown, RotateCcw } from 'lucide-react';
import { ROLES, chronicle, isSpy, type SamGame, type Side } from '../../../utils/samshvilde';
import { Btn } from '../../../components/ui/kit';
import { TableScreen } from '../../../components/games/TableScreen';
import { Hint, Words, iconOf } from './parts';

// The end: who won, every card open, and the chronicle the host reads out — then the applause for „ქალაქის დარბაისელი“.
// The same list of players (without the chronicle) is the host's own table during the game. Online every player's phone
// shows the end too (`me` marks their own row; a player only closes it).

const statusOf = (g: SamGame, i: number, playing: string) => {
  const o = g.out[i];
  return !o ? playing : o.by === 'taken' ? `ტყვედ · ღამე ${o.at}` : `ციხეში · ბჭობა ${o.at}`;
};

/** everybody with their role and where they are; before the printed cards are marked only the names */
export const PlayerList: React.FC<{ g: SamGame; known?: boolean; playing?: string; me?: number }> = ({ g, known = true, playing = 'ბოლომდე', me = -1 }) => (
  <ul className="space-y-1.5">
    {g.players.map((p, i) => {
      const Ic = iconOf(p);
      const spy = known && isSpy(p.role);
      return (
        <li key={i} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ring-1 ${spy ? 'bg-[#7a2028]/[0.06] ring-[#7a2028]/20' : 'bg-white ring-[#e8dcc8]'} ${i === me ? '!ring-2 !ring-[#c9a24a]' : ''} ${g.out[i] ? 'opacity-70' : ''}`}>
          <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${spy ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-[#7a2028]/[0.08] text-[#7a2028]'}`}>
            {known ? <Ic className="w-5 h-5" /> : <span className="text-[13px] font-bold tabular-nums">{i + 1}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{p.name}{i === me && <span className="ml-1.5 text-[12px] font-bold text-[#a0703c]">· შენ</span>}</span>
            {known && <span className="block text-[12.5px] leading-snug text-[#75685a]">{ROLES[p.role].name}{p.trade ? ` · ${p.trade}` : ''}</span>}
          </span>
          <span className={`shrink-0 text-[12px] font-bold tabular-nums ${g.out[i] ? 'text-[#9a8b7b]' : 'text-[#2f7d4f]'}`}>{statusOf(g, i, playing)}</span>
        </li>
      );
    })}
  </ul>
);

const WIN: Record<Side, { say: string; tone: string; who: string }> = {
  city: { say: 'ძლევაჲ საკვირველი — ქალაქი დაცულია, ლაშქარი დიდგორისკენ მიდის!', tone: 'bg-[#2f7d4f] text-white', who: 'ქალაქმა გაიმარჯვა' },
  spies: { say: 'ჯაშუშებმა ციხის კარი გააღეს.', tone: 'bg-[#4a1418] text-[#fbf6ec]', who: 'ჯაშუშებმა გაიმარჯვეს' },
};

export const EndScreen: React.FC<{
  g: SamGame; onClose: () => void; onAgain?: () => void; closeLabel?: string; onHide?: () => void; me?: number; right?: React.ReactNode; note?: React.ReactNode;
}> = ({ g, onClose, onAgain, closeLabel = 'მორჩა', onHide, me, right, note }) => {
  if (g.phase.kind !== 'end') return null;
  const w = WIN[g.phase.winner];
  const ch = chronicle(g);
  return (
    <TableScreen
      title="მატიანე"
      right={right}
      onClose={onHide ?? onClose}
      footer={onAgain ? (
        <div className="grid grid-cols-2 gap-3">
          <Btn kind="ghost" size="lg" onClick={onClose}>{closeLabel}</Btn>
          <Btn size="lg" onClick={onAgain} icon={<RotateCcw />}>თავიდან</Btn>
        </div>
      ) : <Btn kind="ghost" size="lg" full onClick={onClose}>{closeLabel}</Btn>}
    >
      <div className="py-2 space-y-4">
        {note}
        <div className={`rounded-2xl px-4 py-5 text-center ${w.tone}`}>
          <Crown className="mx-auto w-7 h-7 opacity-90" />
          <p className="mt-1.5 text-[13px] font-bold opacity-85">{w.who}</p>
          <p className="mt-1 font-serif-ge text-[21px] font-bold leading-snug">„{w.say}“</p>
        </div>

        <section>
          <h3 className="mb-2 font-serif-ge text-[16px] font-bold text-[#4a3426]">ვინ ვინ იყო</h3>
          <PlayerList g={g} me={me} />
        </section>

        {ch.length > 0 && (
          <section>
            <h3 className="mb-2 font-serif-ge text-[16px] font-bold text-[#4a3426]">რა მოხდა</h3>
            <ol className="space-y-2">
              {ch.map(c => (
                <li key={c.head} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3">
                  <p className="text-[13px] font-bold text-[#7a2028]">{c.head}</p>
                  <ul className="mt-1 space-y-0.5">
                    {c.lines.map((l, k) => <li key={k} className="text-[14px] leading-snug text-[#4a3426]">{l}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        )}

        <Words label="ბოლოს">„ტყვეები თავისუფლდებიან — ყველა ერთ წრეში ბრუნდება. ახლა ტაშით ავირჩიოთ ქალაქის დარბაისელი: ვინც ყველაზე მშვიდად და ჭკვიანურად ლაპარაკობდა, თუნდაც წაგებული მხრიდან.“</Words>
        {me === undefined && <Hint>გაკვეთილის ბოლოს მემატიანე 2–3 წინადადებით იწერს მატიანეს კლასის რვეულში — ასე გროვდება სკოლის „ქართლის ცხოვრება“.</Hint>}
      </div>
    </TableScreen>
  );
};

/** the host's table during the game: every role, and who is out */
export const RosterScreen: React.FC<{ g: SamGame; onClose: () => void }> = ({ g, onClose }) => {
  const known = !(g.deal === 'cards' && g.nights.length === 0);
  return (
    <TableScreen title="მემატიანის ცხრილი" onClose={onClose} footer={<Btn size="lg" full onClick={onClose} className="!h-14 !text-[16px]">დახურვა</Btn>}>
      <div className="py-2 space-y-3">
        {!known && <Hint>ბეჭდური ბარათების როლები პირველი ღამის ბოლოს გამოჩნდება, როცა ყველას მონიშნავ.</Hint>}
        <PlayerList g={g} known={known} playing="თამაშშია" />
        {known && g.roles.includes('elder') && <Hint>{g.shield ? 'უხუცესს პირველი გატაცება ჯერ წინ აქვს.' : 'უხუცესმა პირველ გატაცებას უკვე გადაურჩა.'}</Hint>}
      </div>
    </TableScreen>
  );
};
