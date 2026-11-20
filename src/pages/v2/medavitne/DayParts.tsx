import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, BookOpen, ChevronDown, Flag, Music, ScrollText } from 'lucide-react';
import { Card, Press, cx } from '../../../components/ui2';
import { useNavigation } from '../../../context';
import { triggerHaptic } from '../../../utils/haptics';
import { dayTakeId, toneName, type Reading } from '../../../utils/dayReadings';
import { readableText, syllableCount } from '../../../utils/readingPace';
import { WHO_LABEL, type DayInput, type Extra, type Hymn, type Read, type Step } from '../../../utils/dayService';
import type { TextSrc } from '../../../utils/serviceTexts';
import { kathismaSrc, loadBookParts, loadSlice, useTroparia, type Text } from '../../medavitneoba/DayService';
import { bibleRangesHtml } from '../../medavitneoba/parts';
import { PROSE_V2, Waiting } from './parts';
import { Recorder } from './Recorder';

// What opens under a step of „დღის მსახურება“ in the new look (board x-medavitne-dghe: „ტექსტი შეხებით იხსნება“): the
// step's line, the reader's text in order, the priest's words, the troparia and the books — the old page's pieces
// (pages/medavitneoba/DayService.tsx) drawn with the design's colours.

export const whoLine = (s: Step) => s.who.map(w => WHO_LABEL[w]).join(', ');

/** a small pill that does something under a step (a kanon, a prayer, a book, the tone, a text to unfold) */
export const ActChip: React.FC<{ icon?: React.ReactNode; on?: boolean; onClick: () => void; children: React.ReactNode; expand?: boolean }> = ({
  icon, on, onClick, children, expand,
}) => (
  <Press onClick={() => { triggerHaptic(8); onClick(); }} aria-expanded={expand ? !!on : undefined}
    className="group flex min-h-tap max-w-full shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none">
    <span className={cx(
      'flex min-h-10 max-w-full items-center gap-1.5 rounded-full px-3.5 py-2 text-left text-meta leading-snug font-bold transition',
      'group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60',
      '[&_svg]:size-4 [&_svg]:shrink-0',
      on ? 'bg-wine text-white' : 'bg-tint text-wine',
    )}>
      {icon}<span className="min-w-0 wrap-break-word">{children}</span>
      {expand && <ChevronDown aria-hidden="true" className={cx('transition-transform', on && 'rotate-180')} />}
    </span>
  </Press>
);

const useSlice = (src: TextSrc) => {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadSlice(src).then(v => alive && setTexts(v), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [src]);
  return { texts, failed };
};

const TextBlock: React.FC<{ t: Text }> = ({ t }) => (
  <div className="flex flex-col gap-1">
    <p className="font-sans text-meta font-bold text-gold-ink">{t.head.replace(/\.\s*$/, '')}</p>
    <div className={PROSE_V2}>{t.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
  </div>
);

/** a run of book sections as reading text: a heading is the book's own rubric or opening words */
const Sections: React.FC<{ src: TextSrc; speakers?: boolean }> = ({ src, speakers }) => {
  const { texts, failed } = useSlice(src);
  if (!texts) return <Waiting failed={failed} className="py-3 font-sans" />;
  if (!texts.length) return <p className="font-sans text-meta text-mut">ეს ტექსტი წიგნში ვერ ვიპოვე — გახსენი წიგნი ქვემოთ.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {texts.map((t, i) => (
        <div key={i}>
          {t.head && <p className={speakers ? 'font-sans text-cap font-bold text-gold-ink' : 'text-body leading-snug font-bold text-wine'}>{t.head}</p>}
          {t.paras.length > 0 && <div className={cx(PROSE_V2, t.head && 'mt-0.5')}>{t.paras.map((p, j) => <p key={j}>{p}</p>)}</div>}
        </div>
      ))}
    </div>
  );
};

const SliceText: React.FC<{ src: TextSrc }> = ({ src }) => {
  const { texts, failed } = useSlice(src);
  return (
    <Card pad="sm" className="sg-in flex flex-col gap-2 bg-gold-tint/40">
      <p className="text-meta font-bold text-mut">{src.label}</p>
      {texts ? (texts.length ? texts.map((t, i) => <TextBlock key={i} t={t} />) : <p className="text-meta text-mut">ამ დღისთვის წიგნში ტექსტი ვერ ვიპოვე.</p>)
        : <Waiting failed={failed} className="py-3" />}
    </Card>
  );
};

const HymnRow: React.FC<{ h: Hymn; texts?: Text[]; shown?: boolean }> = ({ h, texts, shown }) => {
  const [open, setOpen] = useState(!!shown);
  const has = !!texts?.length;
  return (
    <li className="rounded-field bg-surf">
      <Press disabled={!has} onClick={() => setOpen(o => !o)} aria-expanded={has ? open : undefined}
        className="flex min-h-tap w-full items-center gap-3 px-3.5 py-2 text-left disabled:cursor-default">
        <span className="flex min-w-0 flex-1 flex-col">
          {h.glory && <span className="text-cap font-bold text-gold-ink">{h.glory === 'glory' ? 'დიდება…' : 'აწდა…'}</span>}
          <span className="text-body leading-snug font-semibold wrap-break-word">{h.label}</span>
        </span>
        {has && <ChevronDown aria-hidden="true" className={cx('size-5 shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
      </Press>
      {texts && !has && (
        <p className="-mt-1 px-3.5 pb-2.5 text-meta leading-snug text-mut">
          {h.role === 'saint' ? 'საკუთარი ტექსტი ჟამნში არ აქვს — იკითხება საზიარო, წმიდანის დასის მიხედვით (თვენი)' : 'ტექსტი აპში ჯერ არ არის'}
        </p>
      )}
      {open && texts && <div className="sg-in flex flex-col gap-2 px-4 pb-3.5">{texts.map((t, i) => <TextBlock key={i} t={t} />)}</div>}
    </li>
  );
};

const Troparia: React.FC<{ inp: DayInput; at: 'vespers' | 'matins' | 'hours' | 'liturgy'; only?: 'tr' | 'ko'; prev?: boolean; shown?: boolean }> = ({
  inp, at, only, prev, shown,
}) => {
  const { troparia, kontakia, textOf } = useTroparia(inp, at, prev);
  const list = (label: string, hymns: Hymn[], k: 'tr' | 'ko') => (
    <div className="flex flex-col gap-1">
      <p className="font-sans text-meta font-bold text-gold-ink">{label}</p>
      <ul className="flex flex-col gap-1.5">{hymns.map((h, i) => <HymnRow key={`${i}-${!!textOf(h, k)?.length}`} h={h} texts={textOf(h, k)} shown={shown} />)}</ul>
    </div>
  );
  return (
    <div className="sg-in flex flex-col gap-3 font-sans">
      {only !== 'ko' && list(troparia.length > 1 ? 'ტროპარნი' : 'ტროპარი', troparia, 'tr')}
      {only !== 'tr' && kontakia.length > 0 && list(kontakia.length > 1 ? 'კონდაკნი' : 'კონდაკი', kontakia, 'ko')}
    </div>
  );
};

/** an Apostle reading: its verses and the recorder (the take may go to the teacher) */
export const ApostleText: React.FC<{ r: Reading; iso: string }> = ({ r, iso }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    bibleRangesHtml(r.file, r.ranges).then(h => alive && setHtml(h), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [r]);
  return (
    <div className="sg-in flex flex-col gap-2.5">
      <Card pad="sm" className={cx(PROSE_V2, 'bg-gold-tint/40 px-4')}>
        {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Waiting failed={failed} className="font-sans" />}
      </Card>
      <Recorder sendId={dayTakeId(r, iso)} syllables={html ? syllableCount(readableText(html)) : undefined} />
    </div>
  );
};

/** a prayer of ლოცვანი opened under its step (the page no longer leaves for the prayer's own page) */
const PrayerInline: React.FC<{ id: string }> = ({ id }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`/prayers/${id}.json`).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((d: { html: string }) => alive && setHtml(d.html), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [id]);
  return (
    <Card pad="sm" className={cx(PROSE_V2, 'sg-in bg-gold-tint/40 px-4')}>
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Waiting failed={failed} className="font-sans" />}
    </Card>
  );
};

/** a book (or one part of it) opened under its step; a book of page pictures keeps the way to the book itself */
const BookInline: React.FC<{ coll: string; n: number; part?: number; onBook: () => void }> = ({ coll, n, part, onBook }) => {
  const [parts, setParts] = useState<{ label: string; texts: Text[] }[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadBookParts(coll, n, part).then(v => alive && setParts(v), () => alive && setFailed(true));
    return () => { alive = false; };
  }, [coll, n, part]);
  if (!parts) return <Waiting failed={failed} className="py-3" />;
  if (!parts.some(p => p.texts.length)) return (
    <Press onClick={onBook} className="flex min-h-tap cursor-pointer items-center gap-1.5 self-start rounded-full px-2 text-meta font-bold text-wine [&_svg]:size-4">
      <BookOpen aria-hidden="true" />წიგნი სურათებადაა — გახსნა
    </Press>
  );
  return (
    <Card pad="sm" className="sg-in flex flex-col gap-4 bg-gold-tint/40 px-3.5 font-serif-ge">
      {parts.map((p, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          {parts.length > 1 && <p className="font-sans text-meta font-bold text-gold-ink">{p.label}</p>}
          {p.texts.map((t, j) => (
            <div key={j}>
              {t.head && <p className="text-body leading-snug font-bold text-wine">{t.head}</p>}
              {t.paras.length > 0 && <div className={cx(PROSE_V2, t.head && 'mt-0.5')}>{t.paras.map((x, k) => <p key={k}>{x}</p>)}</div>}
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
};

const Extras: React.FC<{ step: Step; inp: DayInput; onTone: () => void }> = ({ step, inp, onTone }) => {
  const { openMapItem } = useNavigation();
  // a step with no reading of its own shows its first text at once — the kanon, the prayer or the book it names
  const [open, setOpen] = useState<number | null>(() => {
    if (step.read) return null;
    const i = (step.extras ?? []).findIndex(x => x.kind === 'kathisma' || x.kind === 'prayer');
    return i < 0 ? null : (step.extras![i].kind === 'kathisma' ? 2000 : 3000) + i;
  });
  const [showHymns, setShowHymns] = useState(false);
  const chips: React.ReactNode[] = [];
  const blocks: React.ReactNode[] = [];
  (step.extras ?? []).forEach((x: Extra, i) => {
    // every text unfolds here, under its step — nothing leaves for another page (the user, 2026-11-20)
    const fold = (id: number, label: React.ReactNode, body: React.ReactNode) => {
      chips.push(<ActChip key={i} icon={<BookOpen />} expand on={open === id} onClick={() => setOpen(o => (o === id ? null : id))}>{label}</ActChip>);
      if (open === id) blocks.push(<React.Fragment key={`f${id}`}>{body}</React.Fragment>);
    };
    if (x.kind === 'kathisma') fold(2000 + i, x.glory === 1 ? `კანონი ${x.n} · პირველი დიდება` : `კანონი ${x.n}`,
      <Card pad="sm" className="sg-in bg-gold-tint/40 px-3.5 font-serif-ge"><Sections src={kathismaSrc(x.n, x.glory)} /></Card>);
    else if (x.kind === 'prayer') fold(3000 + i, x.label, <PrayerInline id={x.id} />);
    else if (x.kind === 'book') fold(4000 + i, x.label,
      <BookInline coll={x.coll} n={x.n} part={x.part} onBook={() => openMapItem(`w:c:${x.coll}:${x.n}${x.part !== undefined ? `:${x.part}` : ''}`)} />);
    else if (x.kind === 'tone' && inp.tone) chips.push(<ActChip key={i} icon={<Music />} onClick={onTone}>{toneName(inp.tone)} — ნოტები</ActChip>);
    else if (x.kind === 'troparia') {
      chips.push(<ActChip key={i} expand on={showHymns} onClick={() => setShowHymns(s => !s)}>რიგი და ტექსტები</ActChip>);
      if (showHymns) blocks.push(<Troparia key={`t${i}`} inp={inp} at={x.at} />);
    } else if (x.kind === 'text') {
      const id = 1000 + i;
      chips.push(<ActChip key={i} icon={<ScrollText />} expand on={open === id} onClick={() => setOpen(o => (o === id ? null : id))}>{x.label}</ActChip>);
      if (open === id) blocks.push(<SliceText key={`x${i}`} src={x.src} />);
    } else if (x.kind === 'readings') {
      const many = x.items.filter(y => y.apostle).length > 1;
      x.items.forEach((r, j) => {
        if (!r.apostle) return;
        const id = i * 10 + j;
        chips.push(
          <ActChip key={`${i}-${j}`} icon={<BookOpen />} expand on={open === id} onClick={() => setOpen(o => (o === id ? null : id))}>
            {many ? `წაიკითხე · ${r.name} ${r.ref}` : 'წაიკითხე და ჩაიწერე'}
          </ActChip>);
        if (open === id) blocks.push(<ApostleText key={`a${id}`} r={r} iso={inp.iso} />);
      });
    }
  });
  if (!chips.length) return null;
  return (
    <>
      <div className="flex flex-wrap gap-x-2">{chips}</div>
      {blocks}
    </>
  );
};

const ReadFlow: React.FC<{ read: Read[]; inp: DayInput }> = ({ read, inp }) => (
  <Card pad="sm" className="flex flex-col gap-3 border-l-4 border-wine bg-gold-tint/40 px-3.5 font-serif-ge">
    {read.map((r, i) => (
      'say' in r ? <div key={i} className={PROSE_V2}><p>{r.say}</p></div>
        : 'src' in r ? <Sections key={i} src={r.src} />
        : 'kathisma' in r ? <Sections key={i} src={kathismaSrc(r.kathisma)} />
        : <Troparia key={i} inp={inp} at={r.hymns} only={r.only} prev={r.prev} shown />
    ))}
  </Card>
);

const PriestText: React.FC<{ list: TextSrc[] }> = ({ list }) => (
  <Card pad="sm" className="flex flex-col gap-3 bg-soft px-3.5 font-serif-ge">
    {list.map((src, i) => (
      <div key={i} className="flex flex-col gap-1">
        <p className="font-sans text-meta font-bold text-mut">{src.label}</p>
        <Sections src={src} speakers />
      </div>
    ))}
  </Card>
);

/** „შემდეგი“ at the end of an opened step: the next step's name — or the next service's (`across`). `strong`: the step the
 *  reader is on, where it is the one thing to press. */
export const NextButton: React.FC<{ kicker: string; title: string; strong?: boolean; across?: boolean; onClick: () => void }> = ({
  kicker, title, strong, across, onClick,
}) => (
  <Press onClick={onClick}
    className={cx(
      'flex min-h-tap-lg w-full cursor-pointer items-center gap-3 rounded-tile px-4 py-2.5 text-left transition active:scale-[0.99]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60 [&_svg]:size-5 [&_svg]:shrink-0',
      strong ? 'bg-wine text-white' : 'bg-tint text-wine',
    )}>
    <span className="flex min-w-0 flex-1 flex-col">
      <span className={cx('text-cap font-bold', strong ? 'text-white/85' : 'text-mut')}>{kicker}</span>
      <span className="line-clamp-2 text-body leading-snug font-bold wrap-break-word">{title}</span>
    </span>
    {across ? <ArrowRight aria-hidden="true" strokeWidth={2} /> : <ArrowDown aria-hidden="true" strokeWidth={2} />}
  </Press>
);

/** a quiet way to say that something here does not match the service (it goes to the administration as a letter) */
export const ReportLink: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Press onClick={onClick}
    className="-mb-2.5 flex min-h-tap cursor-pointer items-center gap-1.5 self-end rounded-full px-2 text-meta font-semibold text-mut focus-visible:outline-2 focus-visible:outline-wine/60 [&_svg]:size-4 [&_svg]:shrink-0">
    <Flag aria-hidden="true" strokeWidth={1.75} />შეცდომა ვნახე
  </Press>
);

/** everything under an opened step; `children` — what closes it („შემდეგი“, „შეცდომა ვნახე“) */
export const StepBody: React.FC<{ s: Step; inp: DayInput; priestOn: boolean; onTone: () => void; children?: React.ReactNode }> = ({
  s, inp, priestOn, onTone, children,
}) => (
  <div className="sg-in flex flex-col gap-2.5 px-4 pt-0.5 pb-4">
    {s.note && <p className="text-body leading-snug font-semibold text-wine">{s.note}</p>}
    {s.hint && <p className="text-meta leading-snug text-mut">{s.hint}</p>}
    {s.read && <ReadFlow read={s.read} inp={inp} />}
    {priestOn && s.pt && <PriestText list={s.pt} />}
    <Extras step={s} inp={inp} onTone={onTone} />
    {children}
  </div>
);
