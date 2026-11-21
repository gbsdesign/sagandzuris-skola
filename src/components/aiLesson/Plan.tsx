import React from 'react';
import { Info } from 'lucide-react';
import type { PlanRow } from '../../utils/aiPlan';
import { Button, Card, Duo, Helper, Num, Row, Rows, TopBar } from '../ui2';
import { Bottom } from './parts';

// „შენი გეგმა“ (board ai-gegma): the goal with its pace, the levels ahead with their weeks (made by utils/aiPlan's
// planOf from the member's own answers), the promise that a missed day loses nothing, and „შევცვლი“ · „დავიწყოთ“.
// A pure view: the lead's wrapper gives it the words.

export const PlanView: React.FC<{
  /** the goal in words, e.g. „წირვაზე გალობა“ (goalLabel) */
  goal: string;
  /** „კვირაში 5 დღე · დღეში 10 წუთი“ (paceLine) */
  pace: string;
  rows: PlanRow[];
  onBack: () => void;
  onChange: () => void;
  onStart: () => void;
}> = ({ goal, pace, rows, onBack, onChange, onStart }) => (
  <>
    <TopBar className="px-4" title="შენი გეგმა" sub="ავტომატურმა სასწავლო პროგრამამ შეადგინა" onBack={onBack} />
    <div className="flex flex-col gap-3 px-4 pt-0.5 pb-4">
      <Card pad="none" className="px-[18px] py-4">
        <div className="text-meta font-semibold text-mut">მიზანი</div>
        <div className="mt-0.5 text-title font-bold wrap-break-word">{goal}</div>
        <div className="mt-1.5 text-body text-mut">{pace}</div>
      </Card>
      <Rows aria-label="დონეები">
        {rows.map((r, i) => (
          <Row key={r.level} lead={<Num n={i + 1} on={i === 0} />} title={r.name}
            sub={r.last ? r.what : `${r.weeks} კვირა · ${r.what}`} wrap right={null} />
        ))}
      </Rows>
      <Helper icon={<Info strokeWidth={1.75} />}>დღეს თუ გამოტოვებ, გეგმა თავისით გადაეწყობა. არაფერი იკარგება.</Helper>
    </div>
    <Bottom>
      <Duo>
        <Button kind="ghost" icon={<PencilMark />} onClick={onChange}>შევცვლი</Button>
        <Button icon={<PlayMark />} onClick={onStart}>დავიწყოთ</Button>
      </Duo>
    </Bottom>
  </>
);

/** The boards' own pencil (18px). */
const PencilMark: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m13.5 6.5 4 4" />
  </svg>
);

/** The boards' own play mark: outlined at 18px beside another button, filled and drawn at 16px on a lone wide button
 *  (the kit sizes every button icon 18px, so the filled one's box is widened to draw it at 16). */
export const PlayMark: React.FC<{ filled?: boolean }> = ({ filled }) => (
  <svg aria-hidden="true" viewBox={filled ? '-1.5 -1.5 27 27' : '0 0 24 24'} fill={filled ? 'currentColor' : 'none'} stroke="currentColor"
    strokeWidth={filled ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5.5v13l10.5-6.5z" />
  </svg>
);
