import React, { useState } from 'react';
import { Baby, ChevronRight, Hand, Quote, Sparkles } from 'lucide-react';
import { useSections } from '../../hooks/useSections';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { EST_USD_PER_CALL, saveAiRules, useAiRules, useAiUsage, type AiRules } from '../../utils/aiRules';
import { READY_SENTENCES } from '../../utils/aiLesson';
import { errorText } from '../../utils/errorText';
import { Bar, Card, Dot, Note, Row, Rows, SectionLabel, Sheet, Stepper, ToggleRow } from '../ui2';

// „AI მასწავლებელი · სკოლის წესები“ (the canvas's ai-tsesebi; admins, from ⚙ „სკოლა“): this month's spending against
// the budget, and the three rules — the day lesson for everyone or admins only (the switch `aiTeacher` of
// settings/sections), a hint before the answer, and no AI in the kids' mode. „მზა ფრაზები“ lists the teacher's ready
// sentences (utils/aiLesson.ts).

const usd = (n: number) => `${n < 10 ? n.toFixed(2).replace(/\.00$/, '') : Math.round(n)} $`;

export const AiRulesSheet: React.FC<{ open: boolean; onClose: () => void; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ open, onClose, onMessage }) => {
  const rules = useAiRules();
  const usage = useAiUsage(open);
  const sections = useSections();
  const save = async (r: Partial<AiRules>) => {
    try { await saveAiRules(r); } catch (e) { onMessage(errorText(e), 'error'); }
  };
  const setForAll = async (on: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'sections'), { state: { aiTeacher: on ? 'open' : 'hidden' }, updatedAt: new Date().toISOString() }, { merge: true });
      onMessage(on ? 'დღის გაკვეთილი ყველას გამოუჩნდა.' : 'დღის გაკვეთილი ახლა მხოლოდ ადმინებს უჩანს.', 'success');
    } catch (e) { onMessage(errorText(e), 'error'); }
  };
  return <AiRulesView open={open} onClose={onClose} rules={rules} usage={usage} forAll={sections.state.aiTeacher === 'open'} onSave={save} onForAll={setForAll} />;
};

/** The window itself, from what is given (so it can be looked at without the database). */
export const AiRulesView: React.FC<{
  open: boolean; onClose: () => void; rules: AiRules; usage: { calls: number; people: number | null }; forAll: boolean;
  onSave: (r: Partial<AiRules>) => void; onForAll: (on: boolean) => void;
}> = ({ open, onClose, rules, usage, forAll, onSave: save, onForAll: setForAll }) => {
  const [phrases, setPhrases] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const spent = usage.calls * EST_USD_PER_CALL;
  return (
    <>
      <Sheet open={open && !phrases} title="AI მასწავლებელი" onClose={onClose}>
        <div className="-mx-4 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto px-4 pb-1">
          <Card pad="none" className="px-[18px] pt-4 pb-4">
            <button type="button" className="block w-full cursor-pointer text-left" onClick={() => setBudgetOpen(o => !o)} aria-expanded={budgetOpen}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-meta font-semibold text-mut">ამ თვეში დაიხარჯა</span>
                <span className="text-meta text-mut">ბიუჯეტი {usd(rules.budget)}</span>
              </div>
              <div className="mt-0.5 text-hero font-bold">{usd(spent)}</div>
              <Bar className="mt-2.5" value={rules.budget ? spent / rules.budget : 0} h={8} label="ბიუჯეტიდან დახარჯული" />
              <div className="mt-2 text-meta text-mut">
                {usage.people ?? '…'} მოსწავლე · ერთზე არა უმეტეს {usd(rules.perStudent)} · დაახლოებით, {usage.calls} პასუხი
              </div>
            </button>
            {budgetOpen && (
              <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body font-bold">თვის ბიუჯეტი</span>
                  <Stepper label="თვის ბიუჯეტი" value={rules.budget} min={0} max={1000} step={10} format={v => `${v} $`} onChange={v => save({ budget: v })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-body font-bold">ერთ მოსწავლეზე</span>
                  <Stepper label="ერთ მოსწავლეზე" value={rules.perStudent} min={1} max={50} step={1} format={v => `${v} $`} onChange={v => save({ perStudent: v })} />
                </div>
                <p className="text-meta text-mut">როცა ბიუჯეტი ამოიწურება, AI ჩერდება და გაკვეთილი მზა ფრაზებით გრძელდება.</p>
              </div>
            )}
          </Card>
          <Rows>
            <ToggleRow lead={<Dot icon={<Sparkles />} />} title="AI მასწავლებელი"
              sub={forAll ? 'ჩართულია მთელ სკოლაში' : 'ჯერ მხოლოდ ადმინებთან'}
              on={forAll} onChange={setForAll} />
            <ToggleRow lead={<Dot icon={<Hand />} />} title="ჯერ მინიშნება" sub="პასუხს პირდაპირ არ ამბობს"
              on={rules.hintsFirst} onChange={v => save({ hintsFirst: v })} />
            <ToggleRow lead={<Dot icon={<Baby />} />} title="საბავშვო რეჟიმში" sub="AI-ს გარეშე: მზა ფრაზები"
              on={rules.kidsNoAi} onChange={v => save({ kidsNoAi: v })} />
          </Rows>
          <Rows>
            <Row lead={<Dot icon={<Quote />} />} title="მზა ფრაზები" sub="მასწავლებლის სიტყვები"
              right={<span className="flex items-center gap-1 text-meta font-semibold text-mut">{READY_SENTENCES.reduce((n, g) => n + g.lines.length, 0)}<ChevronRight className="size-[18px]" /></span>}
              onClick={() => setPhrases(true)} />
          </Rows>
          <Note>AI მასწავლებელი პროგრამაა. ნოტებს ტელეფონი ითვლის, AI მხოლოდ სიტყვებს წერს.</Note>
        </div>
      </Sheet>
      <Sheet open={open && phrases} title="მზა ფრაზები" onClose={() => setPhrases(false)}>
        <div className="-mx-4 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto px-4 pb-1">
          <p className="text-meta text-mut">ამ სიტყვებს მასწავლებელი ინტერნეტის და AI-ს გარეშე ამბობს: ნოტებს ტელეფონი ითვლის, წინადადებას ეს წესები აწყობს.</p>
          {READY_SENTENCES.map(g => (
            <section key={g.title} className="flex flex-col gap-1.5">
              <SectionLabel label={g.title} />
              <Card pad="none" className="divide-y divide-line">
                {g.lines.map(l => <p key={l} className="px-4 py-3 text-body leading-snug">{l}</p>)}
              </Card>
            </section>
          ))}
        </div>
      </Sheet>
    </>
  );
};
