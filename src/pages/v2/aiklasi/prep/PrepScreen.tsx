import React, { useState } from 'react';
import { Check, ChevronRight, Eye, ListChecks, Mountain, Pencil, Sparkles, Waypoints, MessageCircleQuestion } from 'lucide-react';
import { useNavigation } from '../../../../context';
import type { SchoolClass } from '../../../../hooks/useClasses';
import { Button, Dot, Duo, Helper, Note, Row, Rows, Sheet, TopBar } from '../../../../components/ui2';
import { LEVEL_WORD } from '../../../../utils/lessonPrep';
import { PART_TITLE, PrepSheet, type PartId } from './Sheets';
import { usePrep } from './usePrep';

/** x-ai-avto — „გაკვეთილის მომზადება“: the AI prepared a lesson from a chant's notes; the teacher looks, changes and approves it.
 *  Route: class mapItem `ai-prep/<variantId>`. */
export const PrepScreen: React.FC<{ cls: SchoolClass; variantId: string }> = ({ cls, variantId }) => {
  const { handleGoBack } = useNavigation();
  return <PrepView p={usePrep(cls, variantId)} handleGoBack={handleGoBack} />;
};

/** the screen itself, over what `usePrep` gives (so it can be looked at with made-up data) */
export const PrepView: React.FC<{ p: ReturnType<typeof usePrep>; handleGoBack: () => void }> = ({ p, handleGoBack }) => {
  const [part, setPart] = useState<PartId | null>(null);
  const [choose, setChoose] = useState(false);
  const [done, setDone] = useState(false);
  const { facts, draft } = p;
  const title = facts.kind === 'ready' ? facts.title : '';

  const approve = async () => { if (await p.save(true)) setDone(true); };

  let body: React.ReactNode;
  if (facts.kind === 'no-notes') {
    body = <Note>ამ საგალობელს ნოტები ჯერ არ აქვს, ამიტომ გაკვეთილს ვერ ვამზადებ.</Note>;
  } else if (facts.kind === 'loading' || !draft) {
    body = <Note>ნოტებს ვკითხულობ…</Note>;
  } else {
    const q = draft.questions.length;
    body = (
      <>
        <div className="flex shrink-0 items-center gap-2.5 rounded-tile bg-tint px-4 py-3 text-body font-semibold text-wine">
          <Sparkles aria-hidden="true" className="size-[18px] shrink-0" />
          <span className="min-w-0">ნოტებიდან გაკვეთილი მოვამზადე. ნახე და დაამტკიცე.</span>
        </div>
        <Rows>
          <Row lead={<Dot icon={<ListChecks />} />} title={`${draft.phrases} ფრაზა`} sub="სტრიქონების მიხედვით" onClick={() => setPart('phrases')} />
          <Row lead={<Dot icon={<Mountain />} />} title={`სირთულე: ${LEVEL_WORD[draft.level].toLowerCase()}`}
            sub={`${draft.leaps} · დიაპაზონი — ${draft.range}`} onClick={() => setPart('level')} />
          <Row lead={<Dot icon={<Waypoints />} />} title={`${draft.drills.length} სავარჯიშო`} sub="ნახტომი, რიტმი, სუნთქვა" onClick={() => setPart('drills')} />
          <Row lead={<Dot icon={<MessageCircleQuestion />} />} title={q ? `${q} კითხვა` : 'კითხვები არ არის'}
            sub={p.asking ? 'ვამზადებ…' : q ? 'სიტყვების მნიშვნელობა' : 'სიტყვების მნიშვნელობა · ჯერ არ მომზადებულა'} onClick={() => setPart('questions')} />
        </Rows>
        {p.aiNote && <Note>{p.aiNote}</Note>}
        <Helper icon={<Eye />}>{p.saved?.approved ? 'დამტკიცებულია — მოსწავლეები ხედავენ. ცვლილების შემდეგ ხელახლა დაამტკიცე.' : 'სანამ არ დაამტკიცებ, მოსწავლეები ვერ ხედავენ.'}</Helper>
        {p.problem && <Note className="text-danger">{p.problem}</Note>}
        <Duo>
          <Button kind="ghost" icon={<Pencil />} onClick={() => setChoose(true)}>შევცვლი</Button>
          <Button icon={<Check />} disabled={p.busy} onClick={approve}>ვამტკიცებ</Button>
        </Duo>
      </>
    );
  }

  return (
    <>
      <TopBar title="გაკვეთილის მომზადება" sub={title ? `„${title}“` : undefined} onBack={handleGoBack} />
      <div className="flex flex-col gap-3 pb-4">{body}</div>
      {draft && (
        <PrepSheet part={part} onClose={() => setPart(null)} draft={draft} setDraft={p.setDraft}
          total={facts.kind === 'ready' ? facts.analysis.phrases : draft.phrases}
          asking={p.asking} aiNote={p.aiNote} onAskAgain={p.askAgain} />
      )}
      <Sheet open={choose} title="რა შევცვალო?" onClose={() => setChoose(false)}>
        <Rows>
          {(Object.keys(PART_TITLE) as PartId[]).map(id => (
            <Row key={id} title={PART_TITLE[id]} right={<ChevronRight aria-hidden="true" className="size-[18px] text-mut" />}
              onClick={() => { setChoose(false); setPart(id); }} />
          ))}
        </Rows>
        <Button full kind="soft" disabled={p.busy} onClick={async () => { if (await p.save(false)) { setChoose(false); handleGoBack(); } }}>შევინახავ, მოგვიანებით დავამტკიცებ</Button>
      </Sheet>
      <Sheet open={done} title="დამტკიცდა" onClose={() => { setDone(false); handleGoBack(); }}>
        <Note>გაკვეთილი დამტკიცდა — მოსწავლეები ახლა ხედავენ მას დღის გაკვეთილში.</Note>
        <Button full onClick={() => { setDone(false); handleGoBack(); }}>კარგი</Button>
      </Sheet>
    </>
  );
};

export default PrepScreen;
