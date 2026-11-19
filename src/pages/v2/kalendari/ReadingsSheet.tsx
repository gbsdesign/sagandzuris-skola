import React, { useEffect, useState } from 'react';
import { TextSkeleton } from '../../../components/shell/PageSkeleton';
import { Card, Note, Sheet } from '../../../components/ui2';
import type { Reading, VerseRange } from '../../../utils/dayReadings';
import { readingShort } from './calendarBits';

// „დღის საკითხავები“ (board x-kalendari): the day's readings one under another — the service they belong to, the book and
// the verses, then the text itself from the app's Bible (public/bible/<book>.json). The Old Testament has no file there:
// only its place is shown.

const LABELS: Record<string, string> = {
  'ლიტ': 'ლიტურგიაზე', 'მწუხრ': 'მწუხრზე', 'ცისკ': 'ცისკარზე', 'რიგ': 'რიგითი', 'ღირ': 'ღირსისა',
};
const labelOf = (l: string) => LABELS[l.replace(/\.$/, '')] ?? l;

const books = new Map<string, Promise<string[]>>();
const bibleBook = (file: string) => {
  if (!books.has(file)) {
    const load = fetch(`/bible/${file}.json`).then(r => r.json()).then((d: { chapters: string[] }) => d.chapters);
    load.catch(() => books.delete(file));
    books.set(file, load);
  }
  return books.get(file)!;
};

type Verse = { n: number; text: string };
type Part = { ch: number; verses: Verse[] };

// a chapter's text is written „1. … 2. …“; to = 999: to its end
const versesOf = (chapters: string[], r: VerseRange): Verse[] => {
  const text = (chapters[r.ch - 1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return text.split(/\s(?=\d+\.\s)/)
    .map(v => /^\s*(\d+)\.\s([\s\S]*)$/.exec(v))
    .filter((m): m is RegExpExecArray => !!m)
    .map(m => ({ n: Number(m[1]), text: m[2].trim() }))
    .filter(v => v.n >= r.from && v.n <= r.to);
};

const ReadingText: React.FC<{ r: Reading }> = ({ r }) => {
  const [parts, setParts] = useState<Part[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!r.file) return;
    let alive = true;
    bibleBook(r.file).then(
      ch => { if (alive) setParts(r.ranges.map(x => ({ ch: x.ch, verses: versesOf(ch, x) }))); },
      () => { if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [r]);
  if (!r.file) return <Note className="px-0">ძველი აღთქმის საკითხავი — ტექსტი აპში ჯერ არ არის.</Note>;
  if (failed) return <p className="text-meta text-danger">ტექსტი ვერ ჩაიტვირთა — შეამოწმე ინტერნეტი.</p>;
  if (!parts) return <TextSkeleton tools={false} lines={4} />;
  const many = new Set(parts.map(p => p.ch)).size > 1;
  return (
    <div className="flex flex-col gap-1 font-serif-ge text-body leading-relaxed">
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && parts[i - 1].ch === p.ch && <p aria-hidden="true" className="text-center text-mut">…</p>}
          {many && (i === 0 || parts[i - 1].ch !== p.ch) && <p className="mt-1 font-sans text-meta font-bold text-mut">თავი {p.ch}</p>}
          {p.verses.map(v => (
            <p key={v.n}><sup className="mr-1 font-sans text-cap font-bold text-wine">{v.n}</sup>{v.text}</p>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
};

export const ReadingsSheet: React.FC<{ open: boolean; readings: Reading[]; onClose: () => void }> = ({ open, readings, onClose }) => (
  <Sheet open={open} title="დღის საკითხავები" onClose={onClose}>
    {readings.map((r, i) => (
      <Card key={i} className="flex flex-col gap-2">
        <div className="flex flex-col">
          {r.label && <span className="text-meta font-semibold text-mut">{labelOf(r.label)}</span>}
          <h3 className="text-lead font-bold wrap-break-word">{r.name} · {readingShort(r).replace(`${r.abbr} `, '')}</h3>
          {r.zachalo !== undefined && <span className="text-meta text-mut">დას. {r.zachalo}</span>}
        </div>
        <ReadingText r={r} />
      </Card>
    ))}
  </Sheet>
);
