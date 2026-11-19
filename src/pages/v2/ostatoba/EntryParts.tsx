import React from 'react';
import { Mic, Play, Route, Timer } from 'lucide-react';
import { Bullets, Button, Card, Note, Row, Rows, Small } from '../../../components/ui2';
import { MASTERY_LEVELS } from '../../../data/masteryPath';
import type { EntryResult } from '../../../utils/masteryPath';

// „საწყისი ტესტი“ in the new look (board x-ostatoba-testi): its start as three short lines — how long, what it needs, what it
// gives — and one button; its end as the level it suggests with the five parts' shares. The steps between them are the old
// test's (components/mastery/EntryTest).

export const EntryIntro: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <>
    <Bullets items={[
      { icon: <Timer />, title: '5 წუთი', sub: 'ხუთი მოკლე ნაბიჯი' },
      { icon: <Mic />, title: 'მიკროფონი', sub: 'აპი მოგისმენს' },
      { icon: <Route />, title: 'შედეგი', sub: 'გეტყვის, რომელი დონიდან დაიწყო' },
    ]} />
    <Note>იმღერე მშვიდად, წყნარ ოთახში.</Note>
    <div className="pt-6">
      <Button full icon={<Play fill="currentColor" />} onClick={onStart}>დაწყება</Button>
    </div>
  </>
);

const LINES: [keyof EntryResult, string][] = [
  ['hold', 'ნოტის დაჭერა'], ['higher', 'მაღლა თუ დაბლა'], ['echo1', 'ერთი ნოტის გამეორება'], ['echo3', 'სამი ნოტის გამეორება'], ['intervals', 'ინტერვალები'],
];

export const EntryResultView: React.FC<{ score: EntryResult; level: number; onStart: (level: number) => void }> = ({ score, level, onStart }) => (
  <>
    <Card className="flex flex-col items-center gap-1 text-center">
      <p className="text-meta font-semibold text-mut">გირჩევთ</p>
      <p className="text-title font-bold wrap-break-word">დონე {level} · {MASTERY_LEVELS[level].name}</p>
      <p className="mt-1 text-body leading-snug text-mut wrap-break-word">{MASTERY_LEVELS[level].goal}</p>
    </Card>
    <Rows aria-label="შედეგი">
      {LINES.map(([key, name]) => {
        const v = score[key];
        return <Row key={key} title={name} right={<Small tone={v >= 0.75 ? 'leaf' : v >= 0.5 ? 'gold' : 'mut'} className="tabular-nums">{Math.round(v * 100)}%</Small>} />;
      })}
    </Rows>
    <div className="flex flex-col gap-2 pt-2">
      <Button full onClick={() => onStart(level)}>დონე {level}-დან დაწყება</Button>
      {level > 0 && <Button full kind="ghost" onClick={() => onStart(0)}>მაინც 0-დან დავიწყებ</Button>}
    </div>
  </>
);
