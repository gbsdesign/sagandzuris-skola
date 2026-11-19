import React from 'react';
import { Check, GraduationCap, Play, RefreshCw } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { useNavigation } from '../../../context';
import { Bar, Button, Card, Row, Rows, TopBar, cx } from '../../../components/ui2';
import { openAiLesson } from '../../../components/aiLesson/open';
import { saveFocus } from '../../../components/aiLesson/useLessonData';
import { dayName, focusOf, oldLine, type ReadyRow } from '../../../utils/sundayReady';
import { useSunday } from './useSunday';

/** x-ai-tsirva — „კვირის წირვა“ (page `gz`, mapItem `tsirva`): which chants of the coming Sunday's Liturgy the member
 *  knows, which have gone cold, which are not learned yet — and one button that points the AI day lesson at them. */

const Mark: React.FC<{ row: ReadyRow }> = ({ row }) => (
  <span aria-hidden="true" className={cx(
    'flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-[18px]',
    row.state === 'known' ? 'bg-wine text-white' : 'bg-tint text-wine',
  )}>
    {row.state === 'known' ? <Check strokeWidth={2.5} /> : row.state === 'old' ? <RefreshCw /> : <GraduationCap />}
  </span>
);

const subOf = (r: ReadyRow) => (r.state === 'known' ? 'იცი' : r.state === 'old' ? oldLine(r.days ?? 0) : 'ჯერ არ გისწავლია');

/** The page without its data: `result` null = still loading. */
export const TsirvaView: React.FC<{
  sunday: string;
  result: { rows: ReadyRow[]; known: number; total: number } | null;
  onBack: () => void;
  onPrepare: () => void;
}> = ({ sunday, result, onBack, onPrepare }) => {
  const toDo = result ? result.rows.filter(r => r.state !== 'known').length : 0;
  return (
    <div className="flex w-full flex-col gap-2.5 pb-4">
      <TopBar title="კვირის წირვა" sub={`${dayName(sunday)} · მზად ხარ?`} onBack={onBack} />
      {!result ? (
        <Waiting field={false} />
      ) : result.total === 0 ? (
        <Card><p className="text-body text-mut">ამ კვირის წირვის საგალობლები ჯერ არ ჩანს.</p></Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="text-hero leading-none font-bold text-wine tabular-nums">{result.known}</span>
              <span className="min-w-0 flex-1 text-lead font-bold">საგალობელი იცი {result.total}-დან</span>
            </div>
            <Bar value={result.known / result.total} h={8} label={`იცი ${result.known} ${result.total}-დან`} />
          </Card>
          <Rows>
            {result.rows.map(r => <Row key={r.key} lead={<Mark row={r} />} title={r.title} sub={subOf(r)} right={null} />)}
          </Rows>
        </>
      )}
      <p className="px-1 text-meta text-mut">რა იგალობება, კალენდრიდან და სკოლის სიიდან მოდის. AI ამას არ იგონებს.</p>
      {result && result.total > 0 && (
        toDo > 0
          ? <Button full icon={<Play fill="currentColor" />} onClick={onPrepare}>მოვამზადე · დღეში 10 წუთი</Button>
          : <p className="px-1 text-lead font-bold text-wine">ყველა საგალობელი მზადაა.</p>
      )}
    </div>
  );
};

export const TsirvaScreen: React.FC = () => {
  const { handleGoBack } = useNavigation();
  const { uid, sunday, result } = useSunday();
  const prepare = () => {
    if (!uid || !result) return;
    saveFocus(uid, focusOf(result.rows, sunday));
    openAiLesson();
  };
  return <TsirvaView sunday={sunday} result={result} onBack={handleGoBack} onPrepare={prepare} />;
};

export default TsirvaScreen;
