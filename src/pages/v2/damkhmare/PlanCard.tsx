import React, { useState } from 'react';
import { Check, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Area, Avatar, Button, Dot, Field, Helper, Row, Rows, ToggleRow } from '../../../components/ui2';
import { MAX_NAME, MAX_TEXT, slotsText, whoLine, type AssistantScope, type CheckedPlan, type PlanPerson } from '../../../utils/aiAssistant';
import { ClassSheet, PeopleSheet, SlotsSheet } from './PlanSheets';

// x-ai-damkhmare-gegma / -klasi: „ასე გავაკეთებ“ — the plan as rows (who, how; or the new class's name, lessons, teacher,
// members), the letter's words in a white card, and why nothing happens without „კი“. While open every row can be changed;
// once done or dropped it stays as a quiet record of the talk.

export type PlanState = 'open' | 'doing' | 'done';

const Faces: React.FC<{ people: PlanPerson[] }> = ({ people }) => (
  <span aria-hidden="true" className="flex shrink-0 items-center">
    {people.slice(0, 4).map((p, i) => (
      <Avatar key={p.uid} name={p.name} photo={p.photo} size={32} className={i ? '-ml-2.5 ring-2 ring-surf' : 'ring-2 ring-surf'} />
    ))}
  </span>
);

const Chev: React.FC = () => <ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} />;

export const PlanCard: React.FC<{
  plan: CheckedPlan;
  say: string;
  scope: AssistantScope;
  state: PlanState;
  editing: boolean;
  onChange: (next: CheckedPlan) => void;
  onDrop: () => void;
}> = ({ plan, say, scope, state, editing, onChange, onDrop }) => {
  const [sheet, setSheet] = useState<'people' | 'class' | 'slots' | null>(null);
  const live = state === 'open';
  const press = (s: 'people' | 'class' | 'slots') => (live ? () => setSheet(s) : undefined);

  let rows: React.ReactNode;
  let words: React.ReactNode = null;
  if (plan.kind === 'message' || plan.kind === 'classMessage') {
    const text = plan.text;
    const setText = (v: string) => onChange({ ...plan, text: v.slice(0, MAX_TEXT) });
    rows = plan.kind === 'message' ? (
      <>
        <Row title={whoLine(plan.to.length, plan.label)} sub="ვის" onClick={press('people')}
          right={<span className="flex items-center gap-1.5"><Faces people={plan.to} />{live && <Chev />}</span>} />
        <Row title="პირადი წერილი თითოეულს" sub="როგორ" />
      </>
    ) : (
      <>
        <Row title={plan.className} sub="ვის" onClick={press('class')}
          right={<span className="flex items-center gap-1.5"><Avatar name={plan.className} size={32} />{live && <Chev />}</span>} />
        <Row title="კლასის ჩატში — ყველა წევრი ნახავს" sub="როგორ" wrap />
      </>
    );
    words = editing && live ? (
      <Area label="წერილის ტექსტი" hideLabel value={text} onChange={setText} maxLength={MAX_TEXT} rows={4} />
    ) : (
      <section className="shrink-0 rounded-card bg-surf px-[18px] py-4">
        <p className="text-lead leading-normal whitespace-pre-wrap wrap-break-word">„{text}“</p>
      </section>
    );
  } else {
    // as the board: only the members row is pressed at once; name, lessons and teacher change under „შეცვლა“
    const edit = editing && live;
    const teacher = plan.teachMe ? 'შენ' : 'ჯერ არავინ — მერე დანიშნავ';
    rows = (
      <>
        {edit ? (
          <div className="px-4 py-3">
            {/* on the white card the field takes the page's colour, so it reads as a field */}
            <Field label="სახელი" className="[&_input]:bg-page" value={plan.name} onChange={v => onChange({ ...plan, name: v.slice(0, MAX_NAME) })} />
          </div>
        ) : (
          <Row title={plan.name || '—'} sub="სახელი" />
        )}
        <Row title={plan.slots.length ? slotsText(plan.slots) : 'ჯერ არ არის'} sub="ცხრილი" wrap
          onClick={edit ? () => setSheet('slots') : undefined} right={edit ? <Chev /> : null} />
        {edit ? (
          <ToggleRow title={teacher} sub="მასწავლებელი" wrap on={plan.teachMe} onChange={on => onChange({ ...plan, teachMe: on })} />
        ) : (
          <Row title={teacher} sub="მასწავლებელი" wrap />
        )}
        <Row title={`${plan.members.length} არჩეულია`} sub="წევრები" onClick={press('people')}
          right={<span className="flex items-center gap-1.5"><Faces people={plan.members} />{live && <Chev />}</span>} />
      </>
    );
  }

  return (
    <>
      <section className="flex shrink-0 flex-col gap-1 rounded-card bg-tint px-3.5 pt-3.5 pb-1.5" aria-label="AI-ს გეგმა">
        <div className="flex items-center gap-2.5 pb-1">
          <Dot icon={<Sparkles />} />
          <h2 className="min-w-0 flex-1 text-head font-bold">{state === 'done' ? 'გავაკეთე' : 'ასე გავაკეთებ'}</h2>
          {live && <Button kind="quiet" size="md" onClick={onDrop}>არა</Button>}
        </div>
        {say && <p className="px-1 pb-2 text-body leading-normal wrap-break-word">{say}</p>}
        <Rows className="mb-2">{rows}</Rows>
      </section>
      {words}
      {live && (
        <Helper icon={<ShieldCheck />}>
          {plan.kind === 'createClass' ? 'კლასს მხოლოდ ადმინი ქმნის — აქაც შენი „კი“ საჭიროა.' : 'შენი „კი“-ს გარეშე არაფერი გაიგზავნება.'}
        </Helper>
      )}
      {live && plan.kind === 'createClass' && (
        <div role="status" className="flex shrink-0 items-center gap-2.5 rounded-tile bg-leaf-tint px-4 py-3 text-body font-bold text-leaf-ink">
          <Check aria-hidden="true" className="size-[18px] shrink-0" />
          <span className="min-w-0 wrap-break-word">
            {plan.members.length ? 'როცა დაადასტურებ: „კლასი შეიქმნა — წევრებს შეატყობინე.“' : 'როცა დაადასტურებ: „კლასი შეიქმნა.“'}
          </span>
        </div>
      )}

      {plan.kind === 'message' && (
        <PeopleSheet open={sheet === 'people'} title="ვის მივწერო" scope={scope} chosen={plan.to}
          onClose={to => { setSheet(null); onChange({ ...plan, to }); }} />
      )}
      {plan.kind === 'createClass' && (
        <>
          <PeopleSheet open={sheet === 'people'} title="წევრები" scope={scope} chosen={plan.members}
            onClose={members => { setSheet(null); onChange({ ...plan, members }); }} />
          <SlotsSheet open={sheet === 'slots'} slots={plan.slots} onClose={slots => { setSheet(null); onChange({ ...plan, slots }); }} />
        </>
      )}
      {plan.kind === 'classMessage' && (
        <ClassSheet open={sheet === 'class'} scope={scope} value={plan.classId} onClose={() => setSheet(null)}
          onPick={id => onChange({ ...plan, classId: id, className: scope.classes.find(c => c.id === id)?.name ?? plan.className })} />
      )}
    </>
  );
};
