import React from 'react';
import { Plus, RefreshCw, X } from 'lucide-react';
import { Area, Button, Choice, Note, RoundButton, Rows, Seg, Sheet, Stepper } from '../../../../components/ui2';
import { DRILL_ABOUT, drillTitle, LEVEL_WORD, type PrepLevel, type PrepQuestion } from '../../../../utils/lessonPrep';
import type { PrepDraft } from './usePrep';

// The four windows of „გაკვეთილის მომზადება“: each shows one part of the lesson and lets the teacher change it.

export type PartId = 'phrases' | 'level' | 'drills' | 'questions';
export const PART_TITLE: Record<PartId, string> = {
  phrases: 'ფრაზები', level: 'სირთულე', drills: 'სავარჯიშოები', questions: 'კითხვები',
};

interface Props {
  part: PartId | null;
  onClose: () => void;
  draft: PrepDraft;
  setDraft: (d: PrepDraft) => void;
  /** the notes' own phrase count (the most that can be taught) */
  total: number;
  asking: boolean;
  aiNote: string;
  onAskAgain: () => void;
}

// the exercises that fit each need (the first of a group is the one the notes ask for; the teacher may swap)
const SLOTS: string[][] = [
  ['m-echo5', 'm-iv-basic-sing', 'm-iv-all-sing'],
  ['m-rhythm-copy', 'm-rhythm-dict', 'm-text-rhythm'],
  ['m-breath', 'm-chain-breath'],
];
const SLOT_NAME = ['ნახტომი', 'რიტმი', 'სუნთქვა'];

export const PrepSheet: React.FC<Props> = ({ part, onClose, draft, setDraft, total, asking, aiNote, onAskAgain }) => {
  const setQ = (i: number, patch: Partial<PrepQuestion>) =>
    setDraft({ ...draft, questions: draft.questions.map((q, k) => (k === i ? { ...q, ...patch } : q)) });
  return (
    <Sheet open={part !== null} title={part ? PART_TITLE[part] : ''} onClose={onClose}>
      {part === 'phrases' && (
        <>
          <Note>ფრაზა = ნოტების ერთი სტრიქონი. აირჩიე, რამდენ ფრაზას ასწავლი — პირველიდან დაწყებული.</Note>
          <div className="flex items-center justify-between gap-3 rounded-card bg-surf p-4">
            <span className="min-w-0 text-lead font-bold">ფრაზები</span>
            <Stepper label="ფრაზების რაოდენობა" value={draft.phrases} min={1} max={Math.max(1, total)} onChange={v => setDraft({ ...draft, phrases: v })} format={v => `${v} / ${total}`} />
          </div>
        </>
      )}
      {part === 'level' && (
        <>
          <Note>სირთულე ნოტებიდან დათვლილია: ნახტომები და დიაპაზონი. გინდა — შეცვალე.</Note>
          <Seg<PrepLevel> label="სირთულე" value={draft.level} onChange={level => setDraft({ ...draft, level })}
            items={(['easy', 'mid', 'hard'] as PrepLevel[]).map(id => ({ id, label: LEVEL_WORD[id] }))} />
          <Rows>
            <div className="px-4 py-3 text-body">ნახტომები: <b>{draft.leaps}</b></div>
            <div className="px-4 py-3 text-body">დიაპაზონი: <b>{draft.range}</b></div>
          </Rows>
        </>
      )}
      {part === 'drills' && (
        <>
          <Note>{DRILL_ABOUT}. სამივე „ოსტატობის“ სავარჯიშოა; გინდა — სხვა აირჩიე.</Note>
          {SLOTS.map((opts, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <span className="pl-1.5 text-meta font-semibold text-mut">{SLOT_NAME[i]}</span>
              <Rows role="radiogroup" aria-label={SLOT_NAME[i]}>
                {opts.map(id => (
                  <Choice key={id} title={drillTitle(id)} on={draft.drills[i] === id}
                    onClick={() => setDraft({ ...draft, drills: draft.drills.map((d, k) => (k === i ? id : d)) })} />
                ))}
              </Rows>
            </div>
          ))}
        </>
      )}
      {part === 'questions' && (
        <>
          {aiNote && <Note>{aiNote}</Note>}
          {draft.questions.map((q, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-card bg-surf p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Area label={`კითხვა ${i + 1}`} value={q.q} rows={1} onChange={v => setQ(i, { q: v })} />
                </div>
                <RoundButton label="კითხვის წაშლა" tone="page" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, k) => k !== i) })}><X /></RoundButton>
              </div>
              <Area label="პასუხი" value={q.a} rows={1} onChange={v => setQ(i, { a: v })} />
            </div>
          ))}
          {!draft.questions.length && !asking && <Note>კითხვები არ არის. ისედაც შეგიძლია გაკვეთილის დამტკიცება.</Note>}
          <div className="flex flex-col gap-2 pb-1">
            <Button full kind="soft" icon={<RefreshCw />} disabled={asking} onClick={onAskAgain}>{asking ? 'ვამზადებ…' : 'ახალი კითხვები'}</Button>
            {draft.questions.length < 5 && (
              <Button full kind="ghost" icon={<Plus />} onClick={() => setDraft({ ...draft, questions: [...draft.questions, { q: '', a: '' }] })}>ჩემი კითხვა</Button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
};
