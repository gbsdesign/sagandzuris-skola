import React, { useState } from 'react';
import { Bot, Eye } from 'lucide-react';
import { Button, Card, Sheet } from '../../../components/ui2';
import { HELP_PAGES, MK_TEXT, mkAnswer, type HelpPage } from '../../../data/mkitkhe';
import { useGoTarget } from './goTo';
import { openMkitkhe } from './open';
import { AnswerBody, QuestionRows } from './parts';

// The page's „?“ window (boards x-idea-adgilze — three ready questions of exactly this page, x-idea-adgilze-2 — the answer in
// up to three steps): „მაჩვენე ეკრანზე“ closes it and lights the button where it stands (or goes to its page first);
// „არა“ and „სხვა რამ მკითხე“ open „მკითხე“, to ask in one's own words. Ready answers only: no AI, works offline.

export const HelpSheet: React.FC<{ page: HelpPage; onClose: () => void }> = ({ page, onClose }) => {
  const [id, setId] = useState<number | null>(null);
  const go = useGoTarget();
  const a = id === null ? undefined : mkAnswer(id);

  const ask = () => { onClose(); openMkitkhe(); };
  const show = () => { if (!a) return; onClose(); go(a.id, { show: true }); };

  return (
    <Sheet open title={a ? a.question : MK_TEXT.onPage} onClose={onClose}>
      {a ? (
        <>
          <Card pad="none" className="px-4 py-2.5">
            <AnswerBody a={a} tone="sheet" />
          </Card>
          <Button full icon={<Eye strokeWidth={2} />} onClick={show}>{MK_TEXT.show}</Button>
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="shrink-0 pl-1.5 text-meta text-mut">{MK_TEXT.worked}</span>
            <div className="flex min-w-0 flex-1 gap-2.5 [&>*]:min-w-0 [&>*]:flex-1">
              <Button kind="ghost" onClick={onClose}>კი</Button>
              <Button kind="ghost" onClick={ask}>არა</Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <QuestionRows label={MK_TEXT.onPage} ids={HELP_PAGES[page]} onPick={setId} />
          <Button kind="ghost" full icon={<Bot strokeWidth={1.75} />} onClick={ask}>{MK_TEXT.askOther}</Button>
        </>
      )}
    </Sheet>
  );
};
