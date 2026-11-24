import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ClipboardList, GraduationCap, Plus } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useChants, useNavigation, useViewing } from '../../../context';
import { useAccess } from '../../../hooks/useAccess';
import { openAiLesson } from '../../../components/aiLesson/open';
import { PearlIcon } from '../../../components/pearls/PearlIcon';
import { TokenIcon } from '../../../components/pearls/Tokens';
import { writePath } from '../../../components/admin/MemberPathEditor';
import { askConfirm, offerUndo } from '../../../components/ui/kit';
import { removeAiPass, saveConfirmation, useConfirmations } from '../../../hooks/useConfirmations';
import { useMarksLock, usePathMarks } from '../../../hooks/usePathMarks';
import { usePathItemOpener } from '../../../hooks/usePathItemOpener';
import { pearlOf, type PearlState } from '../../../utils/pathPearls';
import {
  CATEGORY_LABEL, categoryOf, findCatalogEntry, searchCatalog, sortPathItems, usesVoices, voicesOf,
  type CatalogEntry, type PathItem, type Voice,
} from '../../../utils/pathItems';
import { filterValidSoft } from '../../../utils/variantValidationLazy';
import { errorText } from '../../../utils/errorText';
import { Bar, Card, Chips, Dot, Helper, Note, Press, RoundButton, Row, Rows, Sheet, cx, FOCUS } from '../../../components/ui2';
import { chestIdOf } from '../../../components/pearls/LearnChests';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { chipsOf } from '../gza/chips';
import { SearchBox } from '../klasi/teacher/SearchBox';
import { studentItem } from '../klasi/nav';
import { pathSummary, recordFromDoc } from '../../../utils/masteryPath';
import { ArrangeSheet, Held } from '../klasi/ArrangeSheet';

// the student's own fold = the whole „საგანძური“ page without its bar (the user, 2026-11-21: „გზას რომ ჩახსნიდი … ჩამოსაშლელად
// პირდაპირ ჩათში“, answer „მთელი გზა, როგორც გზის გვერდზე“) — loaded only when the fold opens
const SagandzuriPage = React.lazy(() => import('../gza/Sagandzuri').then(m => ({ default: m.SagandzuriPage })));

// „რა ისწავლა · რას სწავლობს“ at the top of a private chat (2026-11-21, the user: „მაღლა ჩამოსაშლელი სია … საგანძურის გზა …
// აქედანვე შეიძლებოდეს სიის ცვლილება, დამატება, წაშლა, ჩათვლა“; answers „ორივეს · ოთხივე · დაკეცილი ერთი ხაზი · პირდაპირ აპში“).
// Since 2026-11-22 the folded line is gone: the head's sign „გზა“ (before the phone, `PathSigns`) drops the path under the head,
// a second tap folds it (`ChatPath` is drawn only while open), as on „საგანძური“ (pearl, name, voices 1 · 2 · 3).
// The teacher's (or the administration's) side: a voice's tap = „ჩათვლა“ (a mark the student had not made is made too), a tap
// on a counted voice takes it off (with „გაუქმება“); „+ დამატება“ puts a chant on the path; a tap on a name opens its window:
// notes, „დავალებად მიცემა“ (the chat's 📎 window, already on that chant), „სიიდან ამოშლა“; on top the two numbers and the bar,
// chips by service, as on „საგანძური“. The student's side (since the evening of 2026-11-21): the whole „საგანძური“ page in the
// fold — numbers, assignments, chips, the list with its flights, ✎, ოსტატობა.

type Mark = 'off' | 'on' | 'ok';

const MARK_LOOK: Record<Mark, string> = {
  ok: 'bg-leaf text-white',
  on: 'bg-wine text-white',
  off: 'border-[1.5px] border-dim text-mut',
};

type PathMap = Record<string, PathItem>;

interface Item {
  it: PathItem;
  id: string;
  name: string;
  sub: string;
  token: 'pearl' | 'grape' | 'scroll';
  pearl: PearlState;
  voiced: boolean;
  marks: Mark[];
  /** its chip (a service, the songs, the poems) */
  chip: string;
}

const KIND_WORD: Record<string, string> = { simghera: 'სიმღერა', mtkmeli: 'მთქმელი', sakravebi: 'საკრავი' };
const VOICES: Voice[] = ['1', '2', '3'];
const ROMAN: Record<Voice, string> = { '1': 'I', '2': 'II', '3': 'III' };

const itemsOf = (path: PathMap, all: Record<string, Voice[]>): Item[] =>
  sortPathItems(Object.values(filterValidSoft(path)).filter(it => it && it.variantId)).map(it => {
    const id = it.variantId;
    const c = categoryOf(id);
    const voiced = usesVoices(id);
    const have = voicesOf(it, id);
    const ok = all[id] || [];
    return {
      it,
      id,
      name: it.chantName || id,
      sub: c === 'galoba' ? it.code || '' : KIND_WORD[c] ?? '',
      token: c === 'galoba' ? 'pearl' : c === 'mtkmeli' ? 'scroll' : 'grape',
      pearl: pearlOf(it, ok),
      voiced,
      marks: (voiced ? VOICES : (['1'] as Voice[])).map((v): Mark => (ok.includes(v) ? 'ok' : have.includes(v) ? 'on' : 'off')),
      chip: chestIdOf(id),
    };
  });

/** the student's path, live (a teacher's or an admin's look) */
const useStudentPath = (uid: string, on: boolean) => {
  const [rec, setRec] = useState<{ map: PathMap; data: Record<string, unknown> } | null>(null);
  useEffect(() => {
    if (!on || !uid) { setRec(null); return; }
    return onSnapshot(
      doc(db, 'students', uid),
      snap => {
        const data = (snap.exists() ? snap.data() : {}) as Record<string, unknown>;
        setRec({ map: (data.selectedChantVariants || {}) as PathMap, data });
      },
      () => setRec({ map: {}, data: {} }),
    );
  }, [uid, on]);
  return rec;
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="flex flex-col">
    <span className="text-hero leading-[1.1] font-bold tracking-tight tabular-nums">{value}</span>
    <span className="text-meta text-mut">{label}</span>
  </div>
);

const Token: React.FC<{ item: Item; size: number }> = ({ item, size }) =>
  item.token === 'pearl'
    ? <PearlIcon state={item.pearl} size={size} seed={item.id} />
    : <TokenIcon kind={item.token} state={item.pearl} size={size} />;

/** One small sign in the chat's head, before the phone: an icon with a word under it (2026-11-22, the user: „ყურმილის წინ
 *  ნიშნებად გადაიტანე … ერთს გზა … მეორეს ლოგო … ავტ.პროგ.“). */
const HeadSign: React.FC<{ icon: React.ReactNode; word: string; label: string; onClick: () => void; active?: boolean; expanded?: boolean }> = ({
  icon, word, label, onClick, active, expanded,
}) => (
  <Press
    onClick={onClick}
    aria-label={label}
    aria-expanded={expanded}
    title={label}
    className={cx(
      'flex h-tap min-w-tap shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-field px-1.5 transition active:scale-95',
      active ? 'bg-tint text-wine' : 'bg-surf text-wine',
      FOCUS,
    )}
  >
    <span className="flex size-[18px] items-center justify-center [&_svg]:size-[18px]">{icon}</span>
    {word && <span className="text-cap leading-none font-semibold whitespace-nowrap">{word}</span>}
  </Press>
);

/** The chat head's two signs: „გზა“ (a tap drops the path under the head, again folds it) and „ავტ.პროგ.“ — the automatic
 *  teaching program's day lesson, with the program's own cog-and-spark. */
export const PathSigns: React.FC<{ open: boolean; onToggle: () => void }> = ({ open, onToggle }) => {
  const viewing = useViewing();
  const access = useAccess();
  const autoLesson = !viewing && access.on('aiTeacher');
  return (
    <>
      <HeadSign icon={<PearlIcon state="shining" size={18} />} word="" label={open ? 'გზის დაკეცვა' : 'გზა — ისწავლა · სწავლობს'}
        onClick={onToggle} active={open} expanded={open} />
      {/* the automatic teaching program: only its sign, a teacher at the board (2026-11-22, the user: „ავტ.პროგ. ტექსტი წაშალე და
          მარტო ლოგო დატოვე … ეს ლოგო სმაილებიდან“ — 👩‍🏫) */}
      {autoLesson && (
        <RoundButton label="ავტომატური სასწავლო პროგრამა — დღის გაკვეთილი" onClick={openAiLesson}>
          <span aria-hidden="true" className="text-title leading-none">👩‍🏫</span>
        </RoundButton>
      )}
    </>
  );
};

/** The dropped path (drawn only while „გზა“ is open). `student` = whose path; `editor` = the teacher's / the administration's side (else it is the student's own). */
export const ChatPath: React.FC<{
  student: string;
  studentName: string;
  editor: boolean;
  /** the chat's class (the student's page opens under it) */
  classId?: string;
  /** the chat's 📎 window opened on this chant („დავალებად მიცემა“) */
  onAssign?: (e: CatalogEntry) => void;
}> = ({ student, studentName, editor, classId = '', onAssign }) => {
  const { user } = useAuth();
  const own = useChants().selectedChantVariants;
  const marks = usePathMarks();
  const theirRec = useStudentPath(student, editor);
  const theirs = theirRec?.map ?? null;
  const teacherConf = useConfirmations(editor ? student : null);
  const allConf = useConfirmations(student, { withAi: true });
  const lock = useMarksLock(student);
  const opener = usePathItemOpener();
  const { navigateTo, openMapItem, openStudent, currentPage } = useNavigation();
  const [chip, setChip] = useState('all');
  const [picked, setPicked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState('');

  const path: PathMap | null = editor ? theirs : (own as PathMap);
  const items = useMemo(() => (path ? itemsOf(path, allConf) : []), [path, allConf]);
  const learned = items.filter(i => i.pearl === 'shining');
  const chips = useMemo(() => chipsOf(items.map(i => i.chip)), [items]);
  const current = chips.some(c => c.id === chip) ? chip : 'all';
  const shown = current === 'all' ? items : items.filter(i => i.chip === current);
  const voiceSlots = items.reduce((n, i) => n + (i.voiced ? i.marks.length : 0), 0);
  const voices = items.reduce((n, i) => n + (i.voiced ? i.marks.filter(m => m !== 'off').length : 0), 0);
  const locked = !!lock?.on;

  const access = useAccess();
  // the student's „ოსტატობა“ on the teacher's side too (2026-11-22, the user: „მთელი გზა აბა სადაა ოსტატობა?“)
  const theirMastery = useMemo(() => (editor && theirRec ? pathSummary(recordFromDoc(theirRec.data)) : null), [editor, theirRec]);
  if (!user || (editor && path === null)) return null;

  const save = (next: PathMap) => writePath(student, next).catch(e => setErr('ვერ შეინახა: ' + errorText(e)));
  const withVoices = (it: PathItem, voices: Voice[]): PathItem => ({ ...it, voices, isLearned: voices.length > 0 });

  // the teacher's tap: not counted → counted (marked too); counted → taken off, mark and all
  const teacherTap = (item: Item, v: Voice) => {
    if (!path) return;
    setErr('');
    const id = item.id;
    const before = path[id];
    const conf = teacherConf[id] || [];
    const have = voicesOf(before, id);
    const by = user.email || '';
    if ((allConf[id] || []).includes(v)) {
      const byAi = !conf.includes(v);
      const nextConf = conf.filter(x => x !== v);
      const nextHave = item.voiced ? have.filter(x => x !== v) : [];
      (byAi ? removeAiPass(student, id, v) : saveConfirmation(student, id, nextConf, by))
        .catch(e => setErr('ჩათვლა ვერ მოიხსნა: ' + errorText(e)));
      save({ ...path, [id]: withVoices(before, nextHave) });
      if (!byAi) {
        offerUndo('ჩათვლა მოიხსნა', () => {
          saveConfirmation(student, id, conf, by).catch(() => {});
          save({ ...path, [id]: before });
        });
      }
      return;
    }
    const nextConf = [...new Set([...conf, v])].sort() as Voice[];
    saveConfirmation(student, id, nextConf, by).catch(e => setErr('ჩათვლა ვერ შეინახა: ' + errorText(e)));
    if (!have.includes(v)) save({ ...path, [id]: withVoices(before, item.voiced ? [...new Set([...have, v])].sort() as Voice[] : ['1']) });
  };

  const tap = (item: Item, i: number) => {
    const v = (item.voiced ? VOICES[i] : '1') as Voice;
    if (editor) teacherTap(item, v);
    else marks.toggle(item.id, v);
  };

  const remove = async (item: Item) => {
    if (!path) return;
    const ok = await askConfirm({ title: `მოვხსნა „${item.name}“ ${studentName}-ის სიიდან?`, ok: 'მოხსნა', danger: true });
    if (!ok) return;
    const next = { ...path };
    delete next[item.id];
    save(next);
    setPicked(null);
    offerUndo('სიიდან მოიხსნა', () => save({ ...next, [item.id]: path[item.id] }));
  };

  // a line's long press (or tap): move it among the lines shown — the whole list gets steady `order`s, so the move sticks
  const move = (item: Item, dir: -1 | 1) => {
    if (!path) return;
    const i = shown.findIndex(x => x.id === item.id);
    const other = shown[i + dir];
    if (i < 0 || !other) return;
    const list = items.map(x => x.it);
    const a = list.findIndex(x => x.variantId === item.id);
    const b = list.findIndex(x => x.variantId === other.id);
    [list[a], list[b]] = [list[b], list[a]];
    save({ ...path, ...Object.fromEntries(list.map((it, n) => [it.variantId, { ...path[it.variantId], order: n }])) });
  };

  const add = (e: CatalogEntry) => {
    if (!path || path[e.id]) return;
    save({ ...path, [e.id]: e.make() });
  };

  const pickedItem = picked ? items.find(i => i.id === picked) ?? null : null;
  const pickedOpen = pickedItem ? opener(pickedItem.id) : null;
  const toMastery = () => {
    if (currentPage !== 'gz') navigateTo('gz');
    openMapItem('ostatoba');
  };

  const row = (item: Item) => {
    const go = editor ? () => setPicked(item.id) : opener(item.id);
    const name = (
      <span className="flex min-w-0 flex-col">
        <span className="text-body leading-tight font-semibold wrap-break-word">{item.name}</span>
        {item.sub && <span className="text-meta text-mut wrap-break-word">{item.sub}</span>}
      </span>
    );
    return (
      <Held key={item.id} onLong={() => setPicked(item.id)}>
      <div className="flex min-h-[60px] items-center gap-2.5 py-1 pr-2 pl-4">
        <span className="flex size-6 shrink-0 items-center justify-center"><Token item={item} size={18} /></span>
        {go ? (
          <Press onClick={go} className={cx('flex min-h-tap min-w-0 flex-1 cursor-pointer items-center rounded-field text-left', FOCUS)}>{name}</Press>
        ) : (
          <span className="flex min-w-0 flex-1 items-center">{name}</span>
        )}
        <span role="group" aria-label="ხმები" className="flex shrink-0">
          {item.marks.map((m, i) => {
            const off = !editor && (locked || m === 'ok');
            return (
              <Press
                key={i}
                aria-pressed={m !== 'off'}
                aria-label={item.voiced ? `${item.name} — ${ROMAN[VOICES[i]]} ხმა` : `${item.name} — ნასწავლი`}
                title={editor
                  ? (m === 'ok' ? 'ჩათვლილია — შეეხე მოსახსნელად' : 'შეეხე ჩასათვლელად')
                  : (m === 'ok' ? 'მასწავლებელმა ჩათვალა' : locked ? 'მონიშვნას მასწავლებელი აკეთებს' : 'შეეხე, როცა ისწავლი')}
                disabled={off}
                onClick={() => tap(item, i)}
                className={cx('flex h-tap w-10 cursor-pointer items-center justify-center rounded-full disabled:cursor-default active:[&>span]:scale-90', FOCUS)}
              >
                <span className={cx(
                  'flex size-[34px] items-center justify-center rounded-full text-meta font-bold tabular-nums transition [&_svg]:size-4',
                  MARK_LOOK[m], !editor && locked && m !== 'ok' && 'opacity-60',
                )}>
                  {item.voiced ? i + 1 : <Check strokeWidth={2.6} />}
                </span>
              </Press>
            );
          })}
        </span>
      </div>
      </Held>
    );
  };

  return (
    <div className="px-3.5 pb-2">
      {!editor && (
        <div className="max-h-[72dvh] overflow-x-hidden overflow-y-auto overscroll-contain px-0.5">
          <Suspense fallback={<Waiting />}>
            <SagandzuriPage bare onMastery={toMastery} />
          </Suspense>
        </div>
      )}

      {editor && (
        <div className="flex max-h-[72dvh] flex-col gap-2 overflow-x-hidden overflow-y-auto overscroll-contain">
          {items.length > 0 && (
            <Card pad="none" className="flex shrink-0 flex-col gap-2.5 px-[18px] py-4">
              <div className="flex items-start gap-7">
                <Stat value={`${learned.length} / ${items.length}`} label="საგალობელი" />
                {voiceSlots > 0 && <Stat value={`${voices} / ${voiceSlots}`} label="ხმა" />}
              </div>
              <Bar value={voiceSlots ? voices / voiceSlots : learned.length / items.length} h={8} />
            </Card>
          )}
          {chips.length > 2 && (
            <div className="shrink-0 px-1">
              <Chips items={chips} value={current} onChange={setChip} label={`${studentName}-ის საგალობლები`} />
            </div>
          )}
          {items.length > 0 && <Helper icon={<Check />}>ხმაზე შეხება — ჩათვლა. კიდევ ერთხელ — მოხსნა.</Helper>}
          {err && <Note className="text-danger">{err}</Note>}
          {shown.length > 0 && <Rows className="shrink-0">{shown.map(row)}</Rows>}
          <Rows className="shrink-0">
            <Row lead={<Dot icon={<Plus />} />} title="დამატება" sub="საგალობელი, სიმღერა, ლექსი" onClick={() => setAdding(true)} />
          </Rows>
          {theirMastery && access.on('manera') && (
            <Rows className="mt-1 shrink-0">
              <Row lead={<Dot icon={<GraduationCap />} />} title="ოსტატობა" sub={`დონე ${theirMastery.level} · ${theirMastery.pct}%`}
                onClick={() => { openStudent(student, classId); openMapItem(studentItem(student, classId, 'ostatoba')); }} />
            </Rows>
          )}
        </div>
      )}

      {editor && (
        <>
          <ArrangeSheet open={!!pickedItem} title={pickedItem?.name ?? ''} onClose={() => setPicked(null)}
            at={pickedItem ? shown.findIndex(x => x.id === pickedItem.id) : -1} count={shown.length}
            onMove={dir => { if (pickedItem) move(pickedItem, dir); }}
            onDelete={() => { if (pickedItem) void remove(pickedItem); }} deleteSub={`${studentName}-ის სიიდან`}>
            {pickedItem && (
              <>
                {pickedOpen && (
                  <Row lead={<Dot icon={<BookOpen />} />} title={categoryOf(pickedItem.id) === 'galoba' ? 'ნოტები' : 'გახსნა'}
                    onClick={() => { setPicked(null); pickedOpen(); }} />
                )}
                {onAssign && findCatalogEntry(pickedItem.id) && (
                  <Row lead={<Dot icon={<ClipboardList />} />} title="დავალებად მიცემა" sub={`${studentName}-ს`}
                    onClick={() => { const e = findCatalogEntry(pickedItem.id); setPicked(null); if (e) onAssign(e); }} />
                )}
              </>
            )}
          </ArrangeSheet>
          <AddSheet open={adding} onClose={() => setAdding(false)} taken={id => !!path?.[id]} onPick={add} />
        </>
      )}
    </div>
  );
};

/** „დამატება“: a search over every chant, song, poem and instrument; a tap puts it on the path (and stays for more). */
const AddSheet: React.FC<{ open: boolean; onClose: () => void; taken: (id: string) => boolean; onPick: (e: CatalogEntry) => void }> = ({
  open, onClose, taken, onPick,
}) => {
  const [q, setQ] = useState('');
  useEffect(() => { if (open) setQ(''); }, [open]);
  const found = useMemo(() => (open && q.trim() ? searchCatalog(q.trim(), 25) : []), [open, q]);
  return (
    <Sheet open={open} title="სიაში დამატება" onClose={onClose}>
      <SearchBox value={q} onChange={setQ} placeholder="მოძებნე სახელით" autoFocus />
      {!q.trim() && <Note>ჩაწერე საგალობლის ან სიმღერის სახელი.</Note>}
      {q.trim() && found.length === 0 && <Note>ვერაფერი მოიძებნა.</Note>}
      {found.length > 0 && (
        <Rows>
          {found.map(e => {
            const have = taken(e.id);
            return (
              <Row
                key={e.id}
                lead={<Dot icon={have ? <Check /> : <Plus />} color={have ? 'leaf' : 'tint'} />}
                title={e.title}
                sub={have ? 'უკვე სიაშია' : CATEGORY_LABEL[e.category]}
                wrap
                right={null}
                disabled={have}
                onClick={() => onPick(e)}
              />
            );
          })}
        </Rows>
      )}
    </Sheet>
  );
};
