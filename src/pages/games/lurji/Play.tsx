import React, { useEffect, useState } from 'react';
import { Check, Crown, LogOut, RotateCcw, Sunrise } from 'lucide-react';
import { ORN_NAMES, TRAY_NO, countAt, fits, fullRows, landing, type LurjiGame, type Orn } from '../../../utils/lurjiSupra';
import { TableScreen } from '../../../components/games/TableScreen';
import { Btn } from '../../../components/ui/kit';
import { triggerHaptic } from '../../../utils/haptics';
import { LILA, LILA_DEEP, Loom, Meidan, Stamp, Token, Trays, eveningText, takeText, useCell, type Sel } from './look';

// „ლურჯი სუფრა“ being played, online and on one phone alike: the day's story, the trays and the meidan, the board on turn
// (mine online) big and the others small. A take = a tap on a stamp (all of its ornament there), a tap on a line or on the
// dye, then „დადება“. The evening shows what each cloth printed and what it brought; the end, the bonuses and the winner.

export interface LurjiActs {
  /** a take for the board on turn (missing: not mine to take now) */
  take?: (src: number, o: Orn, line: number) => void;
  /** the evening's report seen: the morning (the host's phone, the one phone) */
  next?: () => void;
  again?: () => void;
  close?: () => void;
  leave?: () => void;
}

const MiniBoard: React.FC<{ g: LurjiGame; i: number; me: number }> = ({ g, i, me }) => {
  const b = g.boards[i], ph = g.phase;
  const report = ph.k !== 'take' ? ph.report[i] : null;
  const turn = ph.k === 'take' && g.turn === i;
  return (
    <li className={`min-w-0 rounded-2xl px-2.5 py-2 ${turn ? 'bg-[#fffaf0] ring-2 ring-[#e2c27a]' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
      <p className="flex items-baseline justify-between gap-1.5">
        <span className="min-w-0 text-[13px] font-bold leading-tight text-[#4a3426] [overflow-wrap:anywhere]">{g.names[i]}{i === me && <span className="block text-[11.5px] text-[#a0703c]">შენ</span>}</span>
        <span className="shrink-0 text-[13px] font-bold tabular-nums text-[#1f3a5f]">{b.score}</span>
      </p>
      <div className="mt-1.5"><Loom b={b} cell={13} mini fresh={report?.placed} /></div>
      <p className={`mt-1 text-[11.5px] font-bold leading-tight ${turn ? 'text-[#8a5a1c]' : 'text-[#75685a]'}`}>
        {turn ? 'იღებს…' : report ? eveningText(report) : g.token === i ? 'ხვალ იწყებს' : ' '}
      </p>
    </li>
  );
};

export const LurjiPlay: React.FC<{
  g: LurjiGame;
  /** my board online (−1: I watch); on one phone −1 — the board on turn is the big one */
  me: number;
  one?: boolean;
  /** my take is on its way to the host */
  sent?: boolean;
  clock?: React.ReactNode;
  acts: LurjiActs;
  right?: React.ReactNode;
  /** under the story: a watcher's line, the host's room button */
  note?: React.ReactNode;
  onHide: () => void;
}> = ({ g, me, one, sent, clock, acts, right, note, onHide }) => {
  const ph = g.phase;
  const cell = useCell();
  const [sel, setSel] = useState<Sel | null>(null);
  const [line, setLine] = useState<number | null>(null);
  useEffect(() => { setSel(null); setLine(null); }, [g.step]);
  const focus = me >= 0 ? me : ph.k === 'take' ? g.turn : -1;
  const mine = ph.k === 'take' && !!acts.take && !sent && focus === g.turn;
  const b = focus >= 0 ? g.boards[focus] : null;
  const count = sel ? countAt(g, sel.src, sel.o) : 0;
  const token = !!sel && sel.src < 0 && g.token < 0;

  const pickStamp = (s: Sel) => {
    triggerHaptic(5);
    if (sel && sel.src === s.src && sel.o === s.o) { setSel(null); setLine(null); return; }
    setSel(s);
    // a line chosen before stays only if the new stamps may go there
    setLine(l => (l === null || l < 0 || (b && fits(b, l, s.o)) ? l : null));
  };
  const pickLine = (k: number) => { triggerHaptic(5); setLine(l => (l === k ? null : k)); };
  const send = () => {
    if (!sel || line === null || !acts.take) return;
    triggerHaptic(15);
    acts.take(sel.src, sel.o, line);
    setSel(null);
    setLine(null);
  };

  // ---------- the story ----------
  const nm = (i: number) => (i === me ? 'შენ' : g.names[i]);
  let head: React.ReactNode, sub: React.ReactNode = null;
  if (ph.k === 'take') {
    head = mine ? (one ? <>სვლაა: {g.names[g.turn]}</> : 'შენი სვლაა') : <>{g.names[g.turn]} იღებს ბეჭდებს</>;
    sub = mine
      ? sel ? <>{count} {ORN_NAMES[sel.o]} · {sel.src < 0 ? 'მეიდანი' : `ლანგარი ${TRAY_NO[sel.src]}`}{token && ' · ნიშანიც შენია'} — {line === null ? 'სად დადებ?' : line < 0 ? 'საღებავზე' : `ზოლი ${line + 1}`}</>
        : 'აიღე ერთი ორნამენტის ყველა ბეჭედი — ლანგრიდან ან მეიდნიდან.'
      : g.log.length ? takeText(g.log[g.log.length - 1], g.names) : 'დილაა: ლანგრებზე ახალი ბეჭდებია.';
  } else if (ph.k === 'evening') {
    head = 'საღამო: ბეჭდვა';
    sub = 'სავსე ზოლის ბეჭედი სუფრაზე გადავიდა და ქება მოიტანა; საღებავმა დააკლო.';
  } else {
    const w = ph.winners;
    // the praise tied: the end says the full rows decided (2026-11-04, the games' review)
    const tied = w.length === 1 ? g.boards.findIndex((b, i) => i !== w[0] && b.score === g.boards[w[0]].score) : -1;
    head = w.length > 1 ? <>{w.map(i => g.names[i]).join(' და ')} — {w.length === 2 ? 'ორივე' : 'ყველა'} უსტაბაშია!</> : w[0] === me ? 'შენ გაიმარჯვე!' : <>{g.names[w[0]]} იმარჯვებს!</>;
    sub = w.length > 1 ? 'ქება და სავსე რიგები ტოლია — უსტაბაშობა იყოფა.'
      : tied >= 0 ? <>ქება ტოლია — გადაწყვიტა სავსე რიგებმა: {g.names[w[0]]} {fullRows(g.boards[w[0]])}, {g.names[tied]} {fullRows(g.boards[tied])}.</>
      : 'ამქარმა უსტაბაში აირჩია — ყველაზე მეტი ქება.';
  }
  const story = (
    <section className="rounded-3xl text-[#fbf6ec] px-4 py-3.5 shadow-[0_14px_30px_-20px_rgba(31,58,95,0.9)]" style={{ background: `linear-gradient(135deg, ${LILA}, ${LILA_DEEP})` }} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-[#cfe0f5]">დღე {g.day}</p>
          <p className="mt-0.5 font-serif-ge text-[19px] font-bold leading-snug [overflow-wrap:anywhere]">{head}</p>
          {sub && <p className="mt-1 text-[13px] leading-snug text-[#fbf6ec]/85">{sub}</p>}
        </div>
        {clock}
      </div>
      {ph.k === 'evening' && (
        <ul className="mt-2.5 space-y-1">
          {g.names.map((n, i) => (
            <li key={i} className="flex items-baseline justify-between gap-2 text-[13px] leading-snug">
              <span className="min-w-0 font-bold [overflow-wrap:anywhere]">{nm(i)}</span>
              <span className="shrink-0 text-[#fbf6ec]/85 tabular-nums">{eveningText(ph.report[i])} → <b className="text-white">{ph.report[i].to}</b></span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  // ---------- the end: bonuses and the order ----------
  const finale = ph.k === 'end' && (
    <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3 space-y-2">
      <p className="text-[13px] font-bold text-[#4a3426]">ბონუსები და ქება</p>
      <ol className="space-y-1.5">
        {g.names.map((_, i) => i).sort((x, y) => g.boards[y].score - g.boards[x].score || fullRows(g.boards[y]) - fullRows(g.boards[x])).map(i => {
          const bo = ph.bonus[i];
          const parts = [bo.rows && `${bo.rows} რიგი +${bo.rows * 2}`, bo.cols && `${bo.cols} სვეტი +${bo.cols * 7}`, bo.orns && `${bo.orns} ორნამენტი +${bo.orns * 10}`].filter(Boolean);
          return (
            <li key={i} className="flex items-baseline justify-between gap-2 text-[13px] leading-snug text-[#4a3426]">
              <span className="min-w-0">{ph.winners.includes(i) && <Crown className="inline w-4 h-4 -mt-0.5 mr-1 text-[#a67c2e]" />}<b>{nm(i)}</b> <span className="text-[#75685a]">{parts.length ? parts.join(' · ') : 'ბონუსის გარეშე'}</span></span>
              <b className="shrink-0 text-[15px] tabular-nums text-[#1f3a5f]">{g.boards[i].score}</b>
            </li>
          );
        })}
      </ol>
    </section>
  );

  // ---------- the footer ----------
  let footer: React.ReactNode = null;
  if (mine) {
    footer = (
      <Btn size="lg" full disabled={!sel || line === null} onClick={send} icon={<Check />} className="!h-14 !text-[16px]">
        {!sel ? 'აირჩიე ბეჭდები' : line === null ? 'აირჩიე ზოლი' : line < 0 ? 'საღებავზე დაღვრა' : `დადება · ზოლი ${line + 1}`}
      </Btn>
    );
  } else if (ph.k === 'take' && sent) {
    footer = <p className="text-center text-[13px] font-bold text-[#75685a]">გაგზავნილია…</p>;
  } else if (ph.k === 'evening') {
    footer = acts.next
      ? <Btn size="lg" full onClick={acts.next} icon={<Sunrise />} className="!h-14 !text-[16px]">დილა · დღე {g.day + 1}</Btn>
      : <p className="text-center text-[13px] font-bold text-[#75685a]">მალე დილა დადგება — ახალი ბეჭდები ლანგრებზე.</p>;
  } else if (ph.k === 'end') {
    footer = acts.again ? (
      <div className="grid grid-cols-2 gap-2">
        <Btn kind="ghost" size="lg" onClick={acts.close} className="!h-14 !px-3 whitespace-nowrap">{one ? 'დახურვა' : 'ოთახის დახურვა'}</Btn>
        <Btn size="lg" onClick={acts.again} icon={<RotateCcw />} className="!h-14 !px-3 whitespace-nowrap">კიდევ ერთხელ</Btn>
      </div>
    ) : acts.leave ? <Btn kind="ghost" size="lg" full onClick={acts.leave} icon={<LogOut />} className="!h-14">დახურვა</Btn> : null;
  }

  const others = g.names.map((_, i) => i).filter(i => i !== focus);
  const pick = mine && sel ? { o: sel.o, count, token, line, onLine: pickLine } : undefined;
  return (
    <TableScreen title="ლურჯი სუფრა" right={right} onClose={onHide} footer={footer}>
      <div className="py-2 space-y-3.5 w-full max-w-[880px] mx-auto">
        <div className={`grid gap-3.5 items-start ${b ? 'lg:grid-cols-2 [@media(max-height:500px)]:grid-cols-2' : ''}`}>
        <div className="min-w-0 space-y-3.5">
          {story}
          {note}
          {ph.k === 'take' && (
            <section className="space-y-2.5">
              <Trays g={g} cell={cell} sel={mine ? sel : null} onPick={mine ? pickStamp : undefined} />
              <Meidan g={g} size={Math.round(cell * 0.9)} sel={mine ? sel : null} onPick={mine ? pickStamp : undefined} />
            </section>
          )}
        </div>
        {b && (
          <section className={`rounded-2xl bg-white px-3 py-3 ${mine ? 'ring-2 ring-[#e2c27a]' : 'ring-1 ring-[#e8dcc8]'}`}>
            <div className="mb-2.5 flex items-baseline justify-between gap-2">
              <p className="min-w-0 text-[14px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{focus === me ? 'შენი სუფრა' : g.names[focus]}</p>
              <p className="shrink-0 text-[13px] font-bold text-[#1f3a5f]">ქება <span className="text-[17px] tabular-nums">{b.score}</span></p>
            </div>
            <Loom b={b} cell={cell} pick={pick} fresh={ph.k !== 'take' ? ph.report[focus].placed : undefined} />
            {mine && sel && line !== null && (() => {
              const l = landing(b, line, count, token);
              return (l.onFloor || l.toLid || token) ? (
                <p className="mt-2 text-[12.5px] font-bold leading-snug text-[#8e2431]">
                  {token && <span className="inline-flex items-center gap-1 align-middle mr-1"><Token size={16} />ნიშანი საღებავზე</span>}
                  {l.onFloor > 0 && <>{token ? ' · ' : ''}{l.onFloor} ბეჭედი დაიღვრება</>}
                  {l.toLid > 0 && <> · {l.toLid} გოდორში</>}
                </p>
              ) : null;
            })()}
          </section>
        )}
        </div>
        {focus < 0 && (
          <ul className="space-y-2.5">
            {g.names.map((n, i) => (
              <li key={i} className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3 py-3">
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <p className="min-w-0 text-[14px] font-bold text-[#4a3426] [overflow-wrap:anywhere]">{n}</p>
                  <p className="shrink-0 text-[13px] font-bold text-[#1f3a5f]">ქება <span className="text-[17px] tabular-nums">{g.boards[i].score}</span></p>
                </div>
                <Loom b={g.boards[i]} cell={cell} fresh={ph.k !== 'take' ? ph.report[i].placed : undefined} />
              </li>
            ))}
          </ul>
        )}
        {finale}
        {focus >= 0 && others.length > 0 && (
          <ul className={`grid gap-2 ${others.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-[220px]'} sm:grid-cols-3`}>
            {others.map(i => <MiniBoard key={i} g={g} i={i} me={me} />)}
          </ul>
        )}
        {ph.k === 'take' && g.log.length > 1 && (
          <section className="rounded-2xl bg-white ring-1 ring-[#e8dcc8] px-3.5 py-3">
            <p className="text-[12.5px] font-bold text-[#75685a]">დღეს</p>
            <ul className="mt-1 space-y-0.5">
              {g.log.slice(-4).reverse().map(l => <li key={l.n} className="flex items-center gap-1.5 text-[12.5px] leading-snug text-[#4a3426]"><Stamp o={l.o} size={14} />{takeText(l, g.names)}</li>)}
            </ul>
          </section>
        )}
      </div>
    </TableScreen>
  );
};
