import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, Loader2, Mic, Pencil, Sparkles } from 'lucide-react';
import { useNavigation } from '../../../context';
import { Button, Dot, Duo, Helper, Note, Press, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { aiGate } from '../../../utils/aiRules';
import { AiTeacherError } from '../../../utils/aiTeacher';
import { checkPlan, draftOf, planFromAi, readyAsks, type Answer, type AssistantScope, type CheckedPlan, type PlanPerson, type Turn } from '../../../utils/aiAssistant';
import { useVoiceSearch, voiceSupported } from '../../shell/voiceSearch';
import { ASSISTANT_PROBLEM_TEXT, askAssistant } from './ask';
import { makeClass, sendLetters, sendToClass, type Me } from './act';
import { PlanCard, type PlanState } from './PlanCard';
import { useAssistantScope } from './useScope';

// x-ai-damkhmare — „AI დამხმარე“: a teacher or an admin writes in plain words; three ready requests as chips; the AI answers
// in a pale card, or shows a plan (PlanCard) that is done only on „კი“. Nothing of the talk is kept: closing forgets it.

type Item =
  | { id: number; kind: 'me'; text: string }
  | { id: number; kind: 'ai'; text: string }
  | { id: number; kind: 'note'; text: string; tone: 'mut' | 'danger' | 'leaf'; classId?: string }
  | { id: number; kind: 'plan'; say: string; plan: CheckedPlan; state: PlanState | 'dropped' };

type Gate = null | 'kids' | 'budget';
// Omit over each member of the union
type NewItem = Item extends unknown ? (Item extends infer T ? (T extends Item ? Omit<T, 'id'> : never) : never) : never;

const MeBubble: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex shrink-0 justify-end">
    <div className="max-w-[280px] rounded-tile rounded-br-chip bg-wine px-4 py-3 text-body text-white whitespace-pre-wrap wrap-break-word">{text}</div>
  </div>
);

const AiBubble: React.FC<{ children: React.ReactNode; busy?: boolean }> = ({ children, busy }) => (
  <section className="flex shrink-0 items-start gap-2.5 rounded-card bg-tint p-3.5" aria-live={busy ? 'polite' : undefined}>
    <Dot icon={busy ? <Loader2 className="animate-spin" /> : <Sparkles />} />
    <div className="min-w-0 flex-1 pt-1.5 text-body whitespace-pre-wrap wrap-break-word">{children}</div>
  </section>
);

/** What the panel does in the world — the real ones below; the preview gives its own. */
export interface AssistantDeps {
  gate: (uid: string) => Promise<Gate>;
  ask: (uid: string, scope: AssistantScope, history: Turn[], text: string) => Promise<Answer>;
  letters: (me: Me, to: PlanPerson[], text: string) => Promise<{ sent: number; failed: number }>;
  toClass: (me: Me, classId: string, text: string) => Promise<unknown>;
  makeClass: (me: Me, plan: Extract<CheckedPlan, { kind: 'createClass' }>) => Promise<{ id: string; lost: number }>;
  openClass: (id: string) => void;
}

/** Page-less wiring: the person's scope from Firestore, the AI and the writes. */
export const AssistantScreen: React.FC<{ classId?: string; onClose: (then?: () => void) => void }> = ({ classId, onClose }) => {
  const { openClass } = useNavigation();
  const { scope, me, ready } = useAssistantScope(classId);
  const deps = useMemo<AssistantDeps>(() => ({
    gate: aiGate, ask: askAssistant, letters: sendLetters, toClass: sendToClass, makeClass, openClass,
  }), [openClass]);
  return <AssistantPanel scope={scope} me={me} ready={ready} deps={deps} onClose={onClose} />;
};

export const AssistantPanel: React.FC<{
  scope: AssistantScope;
  me: Me;
  ready: boolean;
  deps: AssistantDeps;
  onClose: (then?: () => void) => void;
}> = ({ scope, me, ready, deps, onClose }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState<Gate>(null);
  const [editing, setEditing] = useState(false);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const add = (it: NewItem) => setItems(list => [...list, { ...it, id: nextId.current++ } as Item]);
  const patchPlan = (id: number, p: Partial<Extract<Item, { kind: 'plan' }>>) =>
    setItems(list => list.map(it => (it.id === id && it.kind === 'plan' ? { ...it, ...p } : it)));

  // the school's rules first: the kids' mode and the month's budget keep the assistant quiet
  useEffect(() => { if (me.uid) deps.gate(me.uid).then(setGate, () => undefined); }, [me.uid, deps]);

  // a new turn: down to it
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [items.length, busy]);

  const open = items.find((it): it is Extract<Item, { kind: 'plan' }> => it.kind === 'plan' && (it.state === 'open' || it.state === 'doing'));
  const check = useMemo(() => (open ? checkPlan(draftOf(open.plan), scope) : null), [open, scope]);

  const history = (): Turn[] => items.flatMap<Turn>(it =>
    it.kind === 'me' ? [{ who: 'me', text: it.text }]
    : it.kind === 'ai' ? [{ who: 'ai', text: it.text }]
    : it.kind === 'plan' ? [{ who: 'ai', text: `${it.say} (გეგმა: ${it.state === 'done' ? 'გაკეთდა' : it.state === 'dropped' ? 'გაუქმდა' : 'ელოდება'})` }]
    : []);

  const ask = async (words: string) => {
    const t = words.trim();
    if (!t || busy || !ready || !me.uid || gate) return;
    const before = history();
    add({ kind: 'me', text: t });
    setText('');
    setBusy(true);
    try {
      const answer = await deps.ask(me.uid, scope, before, t);
      const draft = answer.plan ? planFromAi(answer.plan, scope) : null;
      const checked = draft ? checkPlan(draft, scope) : null;
      if (checked?.ok) {
        setEditing(false);
        add({ kind: 'plan', say: answer.say, plan: checked.plan, state: 'open' });
      } else {
        if (answer.say) add({ kind: 'ai', text: answer.say });
        if (checked && !checked.ok) add({ kind: 'note', text: `ამას ვერ გავაკეთებ: ${checked.why}`, tone: 'danger' });
        else if (answer.plan && !draft) add({ kind: 'note', text: 'გეგმა ვერ შევადგინე — სცადე სხვა სიტყვებით.', tone: 'danger' });
      }
    } catch (e) {
      const kind = e instanceof AiTeacherError ? e.kind : 'failed';
      if (kind === 'kids' || kind === 'budget') setGate(kind);
      else add({ kind: 'note', text: ASSISTANT_PROBLEM_TEXT[kind], tone: 'danger' });
    } finally {
      setBusy(false);
    }
  };

  const doIt = async () => {
    if (!open || !check?.ok) return;
    const plan = check.plan;
    patchPlan(open.id, { plan, state: 'doing' });
    setEditing(false);
    triggerHaptic(20);
    try {
      if (plan.kind === 'message') {
        const r = await deps.letters(me, plan.to, plan.text);
        if (!r.sent) throw new Error('none sent');
        patchPlan(open.id, { state: 'done' });
        add({ kind: 'note', tone: r.failed ? 'danger' : 'leaf', text: r.failed ? `გაიგზავნა ${r.sent}, ${r.failed}-ს ვერ — შეამოწმე ინტერნეტი.` : `გაიგზავნა ${r.sent} წერილი.` });
      } else if (plan.kind === 'classMessage') {
        await deps.toClass(me, plan.classId, plan.text);
        patchPlan(open.id, { state: 'done' });
        add({ kind: 'note', tone: 'leaf', text: `გაიგზავნა „${plan.className}“-ის ჩატში.` });
      } else {
        const r = await deps.makeClass(me, plan);
        patchPlan(open.id, { state: 'done' });
        add({
          kind: 'note', tone: r.lost ? 'danger' : 'leaf', classId: r.id,
          text: r.lost ? `კლასი შეიქმნა, ${r.lost} წევრი ვერ ჩაჯდა — კლასის გვერდზე დაამატე.`
            : plan.members.length ? 'კლასი შეიქმნა — წევრებს შევატყობინე.' : 'კლასი შეიქმნა.',
        });
      }
      triggerHaptic(30);
    } catch (e) {
      console.warn('assistant deed: ', (e as { code?: string })?.code || e);
      patchPlan(open.id, { state: 'open' });
      add({ kind: 'note', tone: 'danger', text: plan.kind === 'createClass' ? 'კლასი ვერ შეიქმნა — სცადე თავიდან.' : 'ვერ გაიგზავნა — შეამოწმე ინტერნეტი და სცადე თავიდან.' });
    }
  };

  const voice = useVoiceSearch(heard => setText(t => (t.trim() ? `${t.trim()} ${heard}` : heard)));
  const listening = voice.state === 'listening';
  const chips = readyAsks(scope.admin);
  const doing = open?.state === 'doing';

  const thread = items.map(it => {
    if (it.kind === 'me') return <MeBubble key={it.id} text={it.text} />;
    if (it.kind === 'ai') return <AiBubble key={it.id}>{it.text}</AiBubble>;
    if (it.kind === 'note') {
      return (
        <div key={it.id} role="status" className={cx(
          'flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-tile px-4 py-3 text-body font-bold',
          it.tone === 'leaf' ? 'bg-leaf-tint text-leaf-ink' : it.tone === 'danger' ? 'bg-surf text-danger' : 'bg-surf text-mut',
        )}>
          {it.tone === 'leaf' && <Check aria-hidden="true" className="size-[18px] shrink-0" />}
          <span className="min-w-0 flex-1 wrap-break-word">{it.text}</span>
          {it.classId && (
            <Press onClick={() => onClose(() => deps.openClass(it.classId!))}
              className="flex h-tap shrink-0 cursor-pointer items-center gap-0.5 text-meta font-bold text-wine">
              კლასის გახსნა<ChevronRight aria-hidden="true" className="size-[18px]" />
            </Press>
          )}
        </div>
      );
    }
    if (it.state === 'dropped') {
      return (
        <React.Fragment key={it.id}>
          {it.say && <AiBubble>{it.say}</AiBubble>}
          <Note>გეგმა გაუქმდა — არაფერი გაგზავნილა.</Note>
        </React.Fragment>
      );
    }
    return (
      <PlanCard
        key={it.id}
        plan={it.plan}
        say={it.say}
        scope={scope}
        state={it.state === 'doing' ? 'doing' : it.state}
        editing={editing && it.state === 'open'}
        onChange={plan => patchPlan(it.id, { plan })}
        onDrop={() => { setEditing(false); patchPlan(it.id, { state: 'dropped' }); }}
      />
    );
  });

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col">
      <div className="shrink-0 px-4">
        <TopBar title="AI დამხმარე" sub="სკოლის მართვა · შეიძლება შეცდეს" onBack={() => onClose()} />
      </div>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-0.5 pb-4">
        {!open && !gate && (
          <div role="group" aria-label="მზა თხოვნები" className="flex shrink-0 flex-wrap gap-x-2 gap-y-1">
            {chips.map(c => (
              <Press
                key={c.label}
                disabled={busy || !ready}
                onClick={() => {
                  if (c.send) void ask(c.text);
                  else { setText(c.text); window.setTimeout(() => field.current?.focus(), 0); }
                }}
                className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none disabled:cursor-default disabled:opacity-50"
              >
                <span className="flex h-10 items-center rounded-full bg-surf px-4 text-body font-semibold whitespace-nowrap text-ink transition group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60">
                  {c.label}
                </span>
              </Press>
            ))}
          </div>
        )}

        {!items.length && !gate && (
          <AiBubble>
            {scope.admin
              ? 'რით დაგეხმარო? შემიძლია შეგიჯამო მოსწავლეები, მივწერო ვინმეს ან შევქმნა კლასი — ყველაფერი მხოლოდ შენი „კი“-ს მერე.'
              : 'რით დაგეხმარო? შემიძლია შეგიჯამო შენი მოსწავლეები ან მივწერო ვინმეს — ყველაფერი მხოლოდ შენი „კი“-ს მერე.'}
          </AiBubble>
        )}

        {thread}

        {busy && <AiBubble busy>ვფიქრობ…</AiBubble>}
        {!ready && !busy && !gate && <Note>ვკითხულობ შენს კლასებს…</Note>}

        {gate && (
          <AiBubble>{ASSISTANT_PROBLEM_TEXT[gate]}</AiBubble>
        )}

        {!open && !gate && <Helper icon={<Eye />}>ხედავს მხოლოდ იმას, რისი ნახვაც შენ შეგიძლია.</Helper>}
        {open && check && !check.ok && <p role="alert" className="shrink-0 px-1.5 text-meta font-semibold text-danger">{check.why}</p>}
      </div>

      {!gate && (
        <footer className="shrink-0 px-4 pt-2 pb-[max(18px,env(safe-area-inset-bottom))]">
          {open ? (
            <Duo>
              <Button kind="ghost" icon={editing ? <Check /> : <Pencil />} disabled={doing} onClick={() => setEditing(e => !e)}>
                {editing ? 'მზადაა' : 'შეცვლა'}
              </Button>
              <Button disabled={doing || !check?.ok} onClick={() => { void doIt(); }}>
                {doing
                  ? (open.plan.kind === 'createClass' ? 'იქმნება…' : 'იგზავნება…')
                  : (open.plan.kind === 'createClass' ? 'კი, შექმენი' : 'კი, გაგზავნე')}
              </Button>
            </Duo>
          ) : (
            <form
              className="flex items-end gap-2"
              onSubmit={e => { e.preventDefault(); void ask(text); }}
            >
              <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-1 rounded-card bg-surf py-1.5 pr-1.5 pl-[18px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-wine/60">
                <textarea
                  ref={field}
                  rows={1}
                  value={listening && voice.heard ? voice.heard : text}
                  onChange={e => setText(e.target.value.slice(0, 1000))}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(text); } }}
                  placeholder={listening ? 'გისმენ…' : 'მიწერე AI-ს…'}
                  aria-label="მიწერე AI-ს"
                  className="field-sizing-content max-h-32 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-body leading-normal text-ink outline-none placeholder:text-mut"
                />
                {voiceSupported() && (
                  <Press
                    aria-label={listening ? 'მოსმენის შეჩერება' : 'ხმით'}
                    title={listening ? 'მოსმენის შეჩერება' : 'ხმით'}
                    aria-pressed={listening}
                    onClick={() => (listening ? voice.stop() : voice.start())}
                    className={cx(
                      'relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition active:scale-95',
                      'before:absolute before:-inset-0.5 before:rounded-full [&_svg]:size-5',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60',
                      listening ? 'animate-pulse bg-wine text-white' : 'bg-tint text-wine',
                    )}
                  >
                    <Mic aria-hidden="true" strokeWidth={1.75} />
                  </Press>
                )}
              </div>
              <Press
                type="submit"
                aria-label="გაგზავნა"
                title="გაგზავნა"
                disabled={busy || !ready || !text.trim()}
                className="flex size-[52px] shrink-0 cursor-pointer items-center justify-center rounded-full bg-wine text-white transition active:scale-95 active:bg-wine-deep disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine/60 [&_svg]:size-[22px]"
              >
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <ChevronRight aria-hidden="true" strokeWidth={1.75} />}
              </Press>
            </form>
          )}
          {voice.error && <p role="alert" className="px-1.5 pt-1.5 text-meta text-danger">{voice.error}</p>}
        </footer>
      )}
    </div>
  );
};
