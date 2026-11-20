import React from 'react';
import { cx } from '../../../components/ui2';
import { RUN_BOLD, RUN_RED, RUN_SMALL, type CalPara, type CalendarDay } from '../../../data/churchCalendar';
import { openSaintLife } from '../../../data/saintLives';
import { triggerHaptic } from '../../../utils/haptics';

// The day's whole text as orthodoxy.ge writes it (the old calendar window's body, in the new look): the week's name, the
// commemorations, readings, fasts and notes with the source's red, bold and small print. A saint whose life is in the
// library is underlined and opens it.

type LifeLink = [number, number, string];

const linksOf = (day: CalendarDay, pi: number): LifeLink[] => {
  const out: LifeLink[] = [];
  for (const s of day.s) {
    if (s.l && s.at?.[0] === pi) out.push([s.at[1], s.at[2], s.l]);
    for (const x of s.ls || []) if (x[3] === pi && x[4] !== undefined && x[5] !== undefined) out.push([x[4], x[5], x[2]]);
  }
  return out.sort((a, b) => a[0] - b[0]);
};

const isSmall = (p: CalPara) => {
  let small = 0, all = 0;
  for (const [t, f = 0] of p) {
    const n = t.replace(/\s/g, '').length;
    all += n;
    if (f & RUN_SMALL) small += n;
  }
  return all > 0 && small / all > 0.5;
};

const Run: React.FC<{ text: string; f: number }> = ({ text, f }) => {
  const body = text.split('\n').map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{l}</React.Fragment>);
  const cls = cx(!!(f & RUN_BOLD) && 'font-bold', !!(f & RUN_RED) && 'text-wine');
  return cls ? <span className={cls}>{body}</span> : <>{body}</>;
};

const Para: React.FC<{ para: CalPara; links: LifeLink[] }> = ({ para, links }) => {
  // the runs cut where a link starts or ends; a link keeps the runs' bold and red inside it
  const pieces: { text: string; f: number; life: string | null }[] = [];
  let pos = 0;
  for (const [text, f = 0] of para) {
    let from = 0;
    while (from < text.length) {
      const at = pos + from;
      const link = links.find(([s, e]) => at >= s && at < e);
      const next = link ? link[1] : Math.min(...links.map(([s]) => s).filter(s => s > at), Infinity);
      const to = Math.min(text.length, next - pos);
      pieces.push({ text: text.slice(from, to), f, life: link ? link[2] : null });
      from = to;
    }
    pos += text.length;
  }
  const groups: { life: string | null; pieces: typeof pieces }[] = [];
  for (const p of pieces) {
    const last = groups[groups.length - 1];
    if (last && last.life === p.life) last.pieces.push(p);
    else groups.push({ life: p.life, pieces: [p] });
  }
  return (
    <>
      {groups.map((g, i) => {
        const body = g.pieces.map((p, j) => <Run key={j} text={p.text} f={p.f} />);
        if (!g.life) return <React.Fragment key={i}>{body}</React.Fragment>;
        const life = g.life;
        // a span, not a <button>: a button is always an inline block, so a long name took whole lines and left its „;“ alone
        const go = () => { triggerHaptic(8); openSaintLife(life); };
        return (
          <span
            key={i}
            role="button"
            tabIndex={0}
            onClick={go}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}
            className="cursor-pointer rounded-chip underline decoration-wine/40 decoration-1 underline-offset-4 active:bg-tint"
          >
            {body}
          </span>
        );
      })}
    </>
  );
};

export const DayText: React.FC<{ day: CalendarDay }> = ({ day }) => (
  <div className="flex flex-col font-serif-ge text-ink">
    {day.t && <p className="font-sans text-body font-bold wrap-break-word">{day.t}</p>}
    {day.p.map((p, i) => {
      if (!p.length) return null;
      const afterGap = i > 0 && !day.p[i - 1].length;
      return (
        <p key={i} className={cx(
          'wrap-break-word',
          i === 0 && !day.t ? '' : afterGap ? 'mt-3' : 'mt-1.5',
          isSmall(p) ? 'text-meta leading-relaxed text-mut' : 'text-body leading-relaxed',
        )}>
          <Para para={p} links={linksOf(day, i)} />
        </p>
      );
    })}
    {day.c && (
      <p className="mt-3 rounded-field bg-page px-3 py-2 font-sans text-meta leading-snug text-mut">
        ეს დღე ეკლესიის წესებით არის შედგენილი. ოფიციალური კალენდრის გამოსვლისას თავისით შეიცვლება.
      </p>
    )}
  </div>
);
