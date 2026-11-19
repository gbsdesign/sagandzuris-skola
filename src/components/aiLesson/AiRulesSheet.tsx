import React, { useState } from 'react';
import { Baby, BookOpen, ChevronDown, ChevronRight, Hand, Pencil, Quote, Sparkles, Volume2 } from 'lucide-react';
import { useSections } from '../../hooks/useSections';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { EST_USD_PER_CALL, saveAiRules, useAiRules, useAiUsage, type AiRules } from '../../utils/aiRules';
import { READY_SENTENCES } from '../../utils/aiLesson';
import { AI_THEORY } from '../../data/aiTheory';
import type { TheoryId, TheoryText } from '../../utils/aiTheory';
import { saveTheoryText, useTheoryTexts } from './Theory';
import { TheoryAdminList } from './TheoryAdmin';
import { errorText } from '../../utils/errorText';
import { TeacherVoiceStudioRow } from './TeacherVoiceStudio'; // AI step 4: the owner's voice studio
import { PHRASE_KINDS, PHRASE_MAX, VOICE_SENTENCE_LIST, sentenceHash, type PhraseKind, type PhraseTexts, type VoiceSentence } from '../../utils/teacherVoice';
import { playSample, savePhraseText, usePhraseTexts, useTeacherVoiceHere, useVoiceIndex, useVoiceSettings } from './TeacherVoice';
import { Area, Bar, Button, Card, Dot, Note, Press, RoundButton, Row, Rows, Sheet, Stepper, ToggleRow, WrapChips, cx } from '../ui2';

// „AI მასწავლებელი · სკოლის წესები“ (the canvas's ai-tsesebi; admins, from ⚙ „სკოლა“): this month's spending against
// the budget, and the three rules — the day lesson for everyone or admins only (the switch `aiTeacher` of
// settings/sections), a hint before the answer, and no AI in the kids' mode. „მზა ფრაზები“ lists the teacher's ready
// sentences (utils/teacherVoice.ts), each rewordable by the school (settings/aiPhrases, board x-ai-prazebi); „პატარა
// თეორია“ the rules the lesson names, each rewordable (settings/aiTheory).

const usd = (n: number) => `${n < 10 ? n.toFixed(2).replace(/\.00$/, '') : Math.round(n)} $`;

export const AiRulesSheet: React.FC<{ open: boolean; onClose: () => void; onMessage: (t: string, type: 'success' | 'error') => void }> = ({ open, onClose, onMessage }) => {
  const rules = useAiRules();
  const usage = useAiUsage(open);
  const sections = useSections();
  const theory = useTheoryTexts();
  const saveTheory = async (id: TheoryId, t: TheoryText | null) => {
    try { await saveTheoryText(id, t); onMessage(t ? 'ტექსტი შეინახა.' : 'დაბრუნდა აპის ტექსტი.', 'success'); } catch (e) { onMessage(errorText(e), 'error'); }
  };
  const save = async (r: Partial<AiRules>) => {
    try { await saveAiRules(r); } catch (e) { onMessage(errorText(e), 'error'); }
  };
  const setForAll = async (on: boolean) => {
    try {
      await setDoc(doc(db, 'settings', 'sections'), { state: { aiTeacher: on ? 'open' : 'hidden' }, updatedAt: new Date().toISOString() }, { merge: true });
      onMessage(on ? 'დღის გაკვეთილი ყველას გამოუჩნდა.' : 'დღის გაკვეთილი ახლა მხოლოდ ადმინებს უჩანს.', 'success');
    } catch (e) { onMessage(errorText(e), 'error'); }
  };
  const phraseTexts = usePhraseTexts();
  const savePhrase = async (sentence: string, text: string | null) => {
    try { await savePhraseText(sentence, text); onMessage(text ? 'ფრაზა შეინახა.' : 'დაბრუნდა აპის ფრაზა.', 'success'); } catch (e) { onMessage(errorText(e), 'error'); }
  };
  return <AiRulesView open={open} onClose={onClose} rules={rules} usage={usage} forAll={sections.state.aiTeacher === 'open'} onSave={save} onForAll={setForAll}
    theory={theory} onTheory={saveTheory} studio={<TeacherVoiceStudioRow />} phraseTexts={phraseTexts} onPhrase={savePhrase} />;
};

/** The window itself, from what is given (so it can be looked at without the database). */
export const AiRulesView: React.FC<{
  open: boolean; onClose: () => void; rules: AiRules; usage: { calls: number; people: number | null }; forAll: boolean;
  onSave: (r: Partial<AiRules>) => void; onForAll: (on: boolean) => void;
  /** „პატარა თეორია“: the school's rewording and its save */
  theory?: Partial<Record<TheoryId, TheoryText>>; onTheory?: (id: TheoryId, t: TheoryText | null) => Promise<void> | void;
  /** AI step 4: „მასწავლებლის ხმის სახელოსნო“ (the owner's only; TeacherVoiceStudio) */
  studio?: React.ReactNode;
  /** „მზა ფრაზები“: the school's changed sentences and their save (null = the app's own again) */
  phraseTexts?: PhraseTexts; onPhrase?: (sentence: string, text: string | null) => Promise<void> | void;
}> = ({ open, onClose, rules, usage, forAll, onSave: save, onForAll: setForAll, theory = {}, onTheory, studio, phraseTexts = {}, onPhrase }) => {
  const [phrases, setPhrases] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const spent = usage.calls * EST_USD_PER_CALL;
  return (
    <>
      <Sheet open={open && !phrases && !rulesOpen} title="AI მასწავლებელი" onClose={onClose}>
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
            <Row lead={<Dot icon={<Quote />} />} title="მზა ფრაზები"
              sub={Object.keys(phraseTexts).length ? `მასწავლებლის სიტყვები · შეცვლილი ${Object.keys(phraseTexts).length}` : 'მასწავლებლის სიტყვები'}
              right={<span className="flex items-center gap-1 text-meta font-semibold text-mut">{VOICE_SENTENCE_LIST.length}<ChevronRight className="size-[18px]" /></span>}
              onClick={() => setPhrases(true)} />
            {onTheory && (
              <Row lead={<Dot icon={<BookOpen />} />} title="პატარა თეორია" sub="წესები — ერთი წინადადებით"
                right={<span className="flex items-center gap-1 text-meta font-semibold text-mut">{AI_THEORY.length}<ChevronRight className="size-[18px]" /></span>}
                onClick={() => setRulesOpen(true)} />
            )}
          </Rows>
          {studio}
          <Note>AI მასწავლებელი პროგრამაა. ნოტებს ტელეფონი ითვლის, AI მხოლოდ სიტყვებს წერს.</Note>
        </div>
      </Sheet>
      <Sheet open={open && phrases} title="მზა ფრაზები" onClose={() => setPhrases(false)}>
        <PhraseList open={open && phrases} texts={phraseTexts} onSave={onPhrase} />
      </Sheet>
      {onTheory && (
        <Sheet open={open && rulesOpen} title="პატარა თეორია" onClose={() => setRulesOpen(false)}>
          <TheoryAdminList over={theory} onSave={onTheory} />
        </Sheet>
      )}
    </>
  );
};

// the live words said while singing: shown, not changed (they are no sentences)
const LIVE_WORDS = READY_SENTENCES.find(g => g.title === 'სიმღერისას')?.lines ?? [];

/** „მზა ფრაზები“ (board x-ai-prazebi): the teacher's every sentence by kind; a tap unfolds it to change its words. */
const PhraseList: React.FC<{ open: boolean; texts: PhraseTexts; onSave?: (sentence: string, text: string | null) => Promise<void> | void }> = ({ open, texts, onSave }) => {
  const [kind, setKind] = useState<PhraseKind>('fix');
  const [openAt, setOpenAt] = useState<string | null>(null);
  // the speaker plays a recorded sentence (the teacher's voice may sound while this list is open)
  useTeacherVoiceHere(open);
  const settings = useVoiceSettings();
  const index = useVoiceIndex();
  const shown = VOICE_SENTENCE_LIST.filter(x => x.kind === kind);
  return (
    <div className="-mx-4 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto px-4 pb-1">
      <p className="text-meta text-mut">მასწავლებლის სიტყვები · {VOICE_SENTENCE_LIST.length}. ამ სიტყვებს მასწავლებელი ინტერნეტის და AI-ს გარეშე ამბობს: ნოტებს ტელეფონი ითვლის, წინადადებას ეს წესები აწყობს.</p>
      <WrapChips label="ფრაზების სახე" items={PHRASE_KINDS} value={[kind]}
        onChange={next => { const n = next.find(k => k !== kind); if (n) { setKind(n); setOpenAt(null); } }} />
      <Card pad="none" className="divide-y divide-line">
        {shown.map(x => (
          <PhraseFold key={x.text} item={x} over={texts[sentenceHash(x.text)]} open={openAt === x.text} canSave={!!onSave}
            recorded={!!index[settings.voice]?.[sentenceHash(x.text)]}
            onToggle={() => setOpenAt(o => (o === x.text ? null : x.text))} onSave={onSave} />
        ))}
      </Card>
      {kind === 'fix' && LIVE_WORDS.length > 0 && <p className="px-1.5 text-meta text-mut">სიმღერისას: {LIVE_WORDS.join(' · ')}</p>}
      {onSave && (
        <p className="flex items-start gap-2 px-1.5 text-meta text-mut">
          <Pencil aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          შეეხე ფრაზას — სიტყვებს შეცვლი. შეცვლილ ფრაზას ჩაწერილი ხმა აღარ ამბობს — ის მხოლოდ ტექსტით ჩანს.
        </p>
      )}
    </div>
  );
};

const PhraseFold: React.FC<{
  item: VoiceSentence; over?: string; open: boolean; recorded: boolean; canSave: boolean;
  onToggle: () => void; onSave?: (sentence: string, text: string | null) => Promise<void> | void;
}> = ({ item, over, open, recorded, canSave, onToggle, onSave }) => {
  const shown = over ?? item.text;
  const [text, setText] = useState(shown);
  const [busy, setBusy] = useState(false);
  const clean = text.replace(/\s+/g, ' ').trim();
  const save = async (t: string | null) => {
    if (!onSave) return;
    setBusy(true);
    try { await onSave(item.text, t); } finally { setBusy(false); }
    if (!t) setText(item.text);
  };
  return (
    <div>
      <div className="flex items-center gap-1 pr-2">
        <Press aria-expanded={open} disabled={!canSave} onClick={onToggle}
          className="flex min-h-row min-w-0 flex-1 cursor-pointer items-center gap-2 py-2.5 pl-4 text-left active:bg-soft disabled:cursor-default">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-lead font-bold leading-snug wrap-break-word">„{shown}“</span>
            <span className="text-meta text-mut">{over ? `შეცვლილია · ${item.group}` : item.group}</span>
          </span>
          {canSave && <ChevronDown aria-hidden="true" className={cx('size-[18px] shrink-0 text-mut transition-transform', open && 'rotate-180')} />}
        </Press>
        {recorded && !over && (
          <RoundButton data-teacher-voice label="მოსმენა" size={36} tone="plain" className="text-wine" onClick={() => void playSample(item.text)}><Volume2 /></RoundButton>
        )}
      </div>
      {open && canSave && (
        <div className="flex flex-col gap-3 bg-page px-4 pt-3 pb-4">
          <Area label="მასწავლებლის სიტყვები" value={text} maxLength={PHRASE_MAX} rows={2} onChange={setText} />
          {over && <Note>აპის ფრაზა: „{item.text}“</Note>}
          {/* one under the other: „საწყისზე დაბრუნება“ does not fit half a 360 px phone */}
          <div className="flex flex-col gap-2">
            <Button full size="md" disabled={busy || !clean || clean === shown} onClick={() => save(clean === item.text ? null : clean)}>შენახვა</Button>
            {over && <Button full kind="ghost" size="md" disabled={busy} onClick={() => save(null)}>საწყისზე დაბრუნება</Button>}
          </div>
        </div>
      )}
    </div>
  );
};
