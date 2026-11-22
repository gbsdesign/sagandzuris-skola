import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff, History, LayoutGrid, Loader2, Mic, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth, useNavigation } from '../../../context';
import { Button, Dot, Duo, Helper, Note, Press, RoundButton, Rows, Seg, Sheet, TopBar, cx } from '../../../components/ui2';
import { triggerHaptic } from '../../../utils/haptics';
import { aiGate } from '../../../utils/aiRules';
import { AiTeacherError } from '../../../utils/aiTeacher';
import { checkPlan, draftOf, planFromAi, type Answer, type AssistantScope, type CheckedPlan, type PlanPerson, type Turn } from '../../../utils/aiAssistant';
import { useVoiceSearch, voiceSupported } from '../../shell/voiceSearch';
import { ASSISTANT_PROBLEM_TEXT, askAssistant, whyOf } from './ask';
import { makeClass, sendLetters, sendToClass, type Me } from './act';
import { PlanCard, type PlanState } from './PlanCard';
import { useAssistantScope } from './useScope';
import { GearSpark } from './GearSpark';
import { setFabShown } from './fabPref';
import { setEngine, useEngine, type Engine } from './enginePref';
import { chatTime, lastChatId, listChats, loadChat, newChatId, removeChat, saveChat, setLastChatId, type ChatHead, type Saved } from './history';
import { offerUndo } from '../../../components/ui/kit';
import { nextSteps, noticedIn, offersFor, pageName } from '../../../utils/programOffers';

// x-ai-damkhmare — „ავტომატური პროგრამა“ („AI დამხმარე“ until plan 2.0): a teacher or an admin writes in plain words; the
// program answers in a pale card, or shows a plan (PlanCard) that is done only on „კი“. Since plan 2.0 (prototypes 13 · 15) it
// is told the open page, offers that page's ready requests first, says what it noticed by itself and offers next steps
// under an answer (utils/programOffers.ts). Nothing of the talk is kept: closing forgets it.

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
    <Dot icon={busy ? <Loader2 className="animate-spin" /> : <GearSpark />} />
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
export const AssistantScreen: React.FC<{
  classId?: string; page?: string; mini?: boolean; onClose: (then?: () => void) => void;
}> = ({ classId, page, mini, onClose }) => {
  const { openClass } = useNavigation();
  const { isSuperAdmin } = useAuth();
  // „გუგლის პროგრამა · ლადოს პროგრამა“: superadmins choose (enginePref); everyone else asks Google
  const picked = useEngine();
  const engine: Engine = isSuperAdmin ? picked : 'google';
  const { scope: seen, me, ready } = useAssistantScope(classId);
  // the open page in words: the program is told it, and the ready requests follow it
  const scope = useMemo(() => {
    const cls = seen.classes.find(c => c.id === seen.focus)?.name;
    return page ? { ...seen, page: pageName(page, cls) } : seen;
  }, [seen, page]);
  const deps = useMemo<AssistantDeps>(() => ({
    gate: aiGate, ask: (uid, sc, h, t) => askAssistant(uid, sc, h, t, engine), letters: sendLetters, toClass: sendToClass, makeClass, openClass,
  }), [openClass, engine]);
  return <AssistantPanel scope={scope} me={me} ready={ready} deps={deps} pageId={page} mini={mini} onClose={onClose}
    engine={isSuperAdmin ? engine : undefined} keep />;
};

export const AssistantPanel: React.FC<{
  scope: AssistantScope;
  me: Me;
  ready: boolean;
  deps: AssistantDeps;
  /** the open page (a PageType) the ready requests follow */
  pageId?: string;
  /** the floating cog's small window: a shorter head */
  mini?: boolean;
  /** the engine switch (superadmins only): shown under the head when given */
  engine?: Engine;
  /** keep the talks (history.ts): the last one comes back on opening, „+“ starts a new one, 🕘 lists the old ones */
  keep?: boolean;
  onClose: (then?: () => void) => void;
}> = ({ scope, me, ready, deps, pageId, mini, engine, keep, onClose }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [gate, setGate] = useState<Gate>(null);
  const [editing, setEditing] = useState(false);
  const [allOffers, setAllOffers] = useState(false);
  const [noticeOff, setNoticeOff] = useState(false);
  const nextId = useRef(1);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  const add = (it: NewItem) => setItems(list => [...list, { ...it, id: nextId.current++ } as Item]);
  const patchPlan = (id: number, p: Partial<Extract<Item, { kind: 'plan' }>>) =>
    setItems(list => list.map(it => (it.id === id && it.kind === 'plan' ? { ...it, ...p } : it)));

  // ——— the kept talks ———
  const [chatId, setChatId] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const [heads, setHeads] = useState<ChatHead[] | null>(null);
  const started = useRef(false);
  const fromSaved = (list: Saved[]): Item[] => list.map(i => (i.k === 'note'
    ? { id: nextId.current++, kind: 'note' as const, text: i.t, tone: 'mut' as const }
    : { id: nextId.current++, kind: i.k, text: i.t }));
  const toSaved = (list: Item[]): Saved[] => list.flatMap<Saved>(it =>
    it.kind === 'me' ? [{ k: 'me', t: it.text }]
    : it.kind === 'ai' ? [{ k: 'ai', t: it.text }]
    : it.kind === 'note' ? [{ k: 'note', t: it.text }]
    : [{ k: 'ai', t: `${it.say} (გეგმა: ${it.state === 'done' ? 'გაკეთდა' : it.state === 'dropped' ? 'გაუქმდა' : 'არ დადასტურებულა'})` }]);
  const openChat = (id: string) => {
    setChatId(id);
    setLastChatId(me.uid, id);
    setItems([]);
    setEditing(false);
    loadChat(me.uid, id).then(saved => setItems(cur => (cur.length ? cur : fromSaved(saved))), () => undefined);
  };
  const newChat = () => {
    if (busy) return;
    const id = newChatId();
    setChatId(id);
    setLastChatId(me.uid, id);
    setItems([]);
    setEditing(false);
    setText('');
  };
  useEffect(() => {
    if (!keep || !me.uid || started.current) return;
    started.current = true;
    const last = lastChatId(me.uid);
    if (last) openChat(last);
    else { const id = newChatId(); setChatId(id); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keep, me.uid]);
  useEffect(() => {
    if (!keep || !me.uid || !chatId || !items.length) return;
    const t = window.setTimeout(() => {
      setLastChatId(me.uid, chatId);
      saveChat(me.uid, chatId, toSaved(items)).catch(e => console.warn('assistant history:', e));
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, keep, me.uid, chatId]);
  const showList = () => {
    setHeads(null);
    setListOpen(true);
    listChats(me.uid).then(setHeads, () => setHeads([]));
  };
  const dropChat = (id: string) => {
    setHeads(h => (h ? h.filter(c => c.id !== id) : h));
    removeChat(me.uid, id).catch(() => undefined);
    if (id === chatId) newChat();
  };

  // the school's rules first: the kids' mode and the month's budget keep the assistant quiet
  useEffect(() => { if (me.uid) deps.gate(me.uid).then(setGate, () => undefined); }, [me.uid, deps]);

  // a new turn: down to it
  useEffect(() => {
    const el = scroller.current;
    // the first screen (greeting, what it noticed, the ready requests) is read from its top
    if (el && (items.length || busy)) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
      else {
        const why = whyOf(e);
        add({ kind: 'note', text: why ? `${ASSISTANT_PROBLEM_TEXT[kind]}\n(${why})` : ASSISTANT_PROBLEM_TEXT[kind], tone: 'danger' });
      }
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
  const focusName = scope.classes.find(c => c.id === scope.focus)?.name;
  const offers = useMemo(
    () => offersFor({ admin: scope.admin, page: pageId, className: focusName, classes: scope.classes.length }),
    [scope.admin, pageId, focusName, scope.classes.length],
  );
  const here = offers.filter(o => o.group === 'here');
  const more = offers.filter(o => o.group === 'more');
  const noticed = useMemo(() => (ready ? noticedIn(scope) : null), [ready, scope]);
  const last = items[items.length - 1];
  const pick = (c: { text: string; send: boolean }) => {
    if (c.send) void ask(c.text);
    else { setText(c.text); window.setTimeout(() => field.current?.focus(), 0); }
  };
  const chip = (c: { label: string; text: string; send: boolean }) => (
    <Press key={c.label} disabled={busy || !ready} onClick={() => pick(c)}
      className="group flex h-tap shrink-0 cursor-pointer items-center rounded-full focus-visible:outline-none disabled:cursor-default disabled:opacity-50">
      <span className="flex h-10 items-center rounded-full bg-surf px-4 text-body font-semibold whitespace-nowrap text-ink transition group-active:scale-[0.97] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-wine/60">
        {c.label}
      </span>
    </Press>
  );
  const caption = (t: string) => <p className="shrink-0 px-1.5 pt-1 text-meta font-bold text-mut">{t}</p>;
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
          <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">{it.text}</span>
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
        {mini && <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />}
        <TopBar title="ავტომატური პროგრამა" sub="პროგრამაა, არა ადამიანი · შეიძლება შეცდეს" onBack={() => onClose()}
          className={mini ? 'pt-1.5' : undefined}
          right={(keep || mini) ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {keep && (
                <RoundButton label="წინა საუბრები" onClick={showList}>
                  <History aria-hidden="true" strokeWidth={1.75} />
                </RoundButton>
              )}
              {keep && (
                <RoundButton label="ახალი საუბარი" onClick={newChat} disabled={busy}>
                  <Plus aria-hidden="true" strokeWidth={1.75} />
                </RoundButton>
              )}
              {mini && (
                // the floating cog is in the way: off it goes (back on in „პარამეტრები“, or by „დაბრუნება“ at once)
                <RoundButton label="კბილანას დამალვა" onClick={() => onClose(() => {
                  setFabShown(false);
                  offerUndo('კბილანა დაიმალა. ჩართვა: პარამეტრები', () => setFabShown(true));
                })}>
                  <EyeOff aria-hidden="true" strokeWidth={1.75} />
                </RoundButton>
              )}
            </div>
          ) : undefined} />
        {engine && (
          <Seg label="რომელი პროგრამა" className="mb-2" value={engine} onChange={setEngine}
            items={[{ id: 'google', label: 'გუგლის პროგრამა' }, { id: 'lado', label: 'ლადოს პროგრამა' }]} />
        )}
        {keep && (
          <Sheet open={listOpen} title="წინა საუბრები" onClose={() => setListOpen(false)}>
            {heads === null ? (
              <p className="py-6 text-center text-body text-mut">იტვირთება…</p>
            ) : heads.length === 0 ? (
              <p className="py-6 text-center text-body text-mut">ჯერ საუბარი არ გაქვს.</p>
            ) : (
              <Rows>
                {heads.map(c => (
                  <div key={c.id} className={cx('flex items-center gap-2 px-4 py-2', c.id === chatId && 'bg-tint')}>
                    <Press onClick={() => { setListOpen(false); if (c.id !== chatId) openChat(c.id); }}
                      className="flex min-h-tap min-w-0 flex-1 cursor-pointer flex-col justify-center text-left">
                      <span className="line-clamp-2 text-body font-semibold text-ink">{c.title}</span>
                      <span className="text-meta text-mut">{chatTime(c.at)}{c.id === chatId ? ' · ახლა ღიაა' : ''}</span>
                    </Press>
                    <RoundButton label="საუბრის წაშლა" onClick={() => dropChat(c.id)}>
                      <Trash2 aria-hidden="true" strokeWidth={1.75} />
                    </RoundButton>
                  </div>
                ))}
              </Rows>
            )}
          </Sheet>
        )}
      </div>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-0.5 pb-4">
        {scope.page && !gate && (
          <Helper icon={<LayoutGrid />}>ამ გვერდზე ხარ: <b className="font-semibold text-ink">{scope.page}</b></Helper>
        )}

        {!items.length && !gate && (
          <AiBubble>
            რით დაგეხმარო? აირჩიე მზა თხოვნა ან მომწერე. ყველაფერს მხოლოდ შენი „კი“-ს მერე ვაკეთებ.
          </AiBubble>
        )}

        {/* what the program noticed by itself (no AI call): one line and two buttons; „კი“ only prepares a plan */}
        {!items.length && !gate && noticed && !noticeOff && (
          <section aria-label="შევნიშნე" className="flex shrink-0 flex-col gap-2.5 rounded-card bg-surf p-3.5">
            <p className="text-meta font-bold text-wine">შევნიშნე</p>
            <p className="text-body leading-normal wrap-break-word text-ink">{noticed.text}</p>
            <div className="flex flex-wrap gap-2">
              <Press disabled={busy} onClick={() => { setNoticeOff(true); void ask(noticed.ask); }}
                className="flex h-tap cursor-pointer items-center rounded-full bg-wine px-5 text-body font-semibold text-white transition active:scale-[0.97] disabled:opacity-50">
                კი, მოამზადე
              </Press>
              <Press onClick={() => setNoticeOff(true)}
                className="flex h-tap cursor-pointer items-center rounded-full bg-page px-5 text-body font-semibold text-ink transition active:scale-[0.97]">
                არა
              </Press>
            </div>
          </section>
        )}

        {/* the ready requests: the page's own first, then the rest (a few, „ყველა“ unfolds them) */}
        {!items.length && !gate && (
          <div role="group" aria-label="მზა თხოვნები" className="flex shrink-0 flex-col gap-1">
            {here.length > 0 && caption('ამ გვერდზე')}
            {here.length > 0 && <div className="flex flex-wrap gap-x-2 gap-y-1">{(allOffers ? here : here.slice(0, 4)).map(chip)}</div>}
            {caption(here.length ? 'კიდევ შემიძლია' : 'მზა თხოვნები')}
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {(allOffers ? more : more.slice(0, here.length ? 2 : 4)).map(chip)}
              {!allOffers && (
                <Press onClick={() => setAllOffers(true)}
                  className="flex h-tap shrink-0 cursor-pointer items-center rounded-full px-3 text-body font-semibold text-wine focus-visible:outline-2 focus-visible:outline-wine/60">
                  ყველა ▾
                </Press>
              )}
            </div>
          </div>
        )}

        {thread}

        {/* the next steps under an answer (a plan has its own „კი“) */}
        {!busy && !open && !gate && last?.kind === 'ai' && (
          <div role="group" aria-label="შემდეგი ნაბიჯი" className="flex shrink-0 flex-wrap gap-x-2 gap-y-1">
            {nextSteps().map(chip)}
          </div>
        )}

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
                  placeholder={listening ? 'გისმენ…' : 'მომწერე, რა გავაკეთო…'}
                  aria-label="მიწერე ავტომატურ პროგრამას"
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
