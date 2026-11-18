import React, { useState } from 'react';
import { Check, ChevronRight, Loader2, Plus } from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useNavigation } from '../../../context';
import { Avatar, Badge, Button, Dot, Field, Row, Rows, Sheet, TopBar } from '../../../components/ui2';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { nextLesson } from '../../../components/teacher/Schedule';
import { classChatBase, isClassUnread, useChatSeen, useClassLasts } from '../../../hooks/useClassChat';
import { useUnreadCounts, type CountAsk } from '../../../hooks/useUnreadCounts';
import { logChange } from '../../../utils/adminLog';
import { errorText } from '../../../utils/errorText';
import { triggerHaptic } from '../../../utils/haptics';
import type { LessonSlot } from '../../../hooks/useClasses';

/** The next lesson in words, as the old timetable line says it: „ხვალ“, „დღეს“, „4 დღეში“ (the time follows). */
export const lessonWhen = (n: number) => (n === 0 ? 'დღეს' : n === 1 ? 'ხვალ' : `${n} დღეში`);

/** „ხვალ, 18:00–22:00“ — null when the class has no timetable. */
export const nextLessonWords = (slots: LessonSlot[], withPlace = false): string | null => {
  const next = nextLesson(slots);
  if (!next) return null;
  const { slot, inDays } = next;
  const place = withPlace && slot.note?.trim() ? ` · ${slot.note.trim()}` : '';
  return `${lessonWhen(inDays)}, ${slot.start}${slot.end ? `–${slot.end}` : ''}${place}`;
};
/** Only the start: „ხვალ 18:00“ (the list's grey line). */
const nextLessonShort = (slots: LessonSlot[]): string | null => {
  const next = nextLesson(slots);
  return next ? `${lessonWhen(next.inDays)} ${next.slot.start}` : null;
};

/** x-klasebi — „ჩემი კლასები“: a page in place of the old picker's window. */
export const ClassesListScreen: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { handleGoBack, openClass } = useNavigation();
  const classes = useAllMyClasses();
  const ids = classes.map(c => c.id);
  const lasts = useClassLasts(ids);
  const seen = useChatSeen(user?.uid);
  const unread = classes.filter(c => !!user && isClassUnread(lasts[c.id], seen[c.id], user.uid));
  const asks: CountAsk[] = unread.map(c => ({ id: c.id, base: classChatBase(c.id), since: seen[c.id] || 0, upTo: lasts[c.id]?.at?.getTime() ?? 0 }));
  const counts = useUnreadCounts(asks);

  const [naming, setNaming] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // as the admin panel's „ახალი კლასი“: the name only, then the class's own page opens (rules: only admins create a class)
  const create = async () => {
    const name = (naming || '').trim();
    if (!name) { setErr('კლასს სახელი სჭირდება.'); return; }
    setSaving(true);
    setErr('');
    try {
      const ref = doc(collection(db, 'classes'));
      const now = new Date().toISOString();
      await setDoc(ref, {
        name, logo: '', teacherIds: [], teachers: [], memberIds: [], members: [], program: [], classMode: false, defaultShortcuts: [],
        createdAt: now, createdBy: user?.email || '', updatedAt: now,
      });
      triggerHaptic(30);
      logChange('class', `კლასი „${name}“ შეიქმნა`, ref.id);
      setNaming(null);
      openClass(ref.id);
    } catch (e) {
      setErr('კლასი ვერ შეიქმნა: ' + errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2.5 pb-4">
      <TopBar title="ჩემი კლასები" onBack={handleGoBack} />
      {classes.length > 0 && (
        <Rows>
          {classes.map(c => {
            const next = nextLessonShort(c.schedule);
            const n = counts[c.id] ?? (unread.some(u => u.id === c.id) ? 1 : 0);
            return (
              <Row
                key={c.id}
                lead={<Avatar name={c.name} photo={c.logo} />}
                title={c.name}
                sub={`${c.members.length} წევრი${next ? ` · ${next}` : ''}`}
                right={<span className="flex shrink-0 items-center gap-2">{n > 0 && <Badge n={n} />}<ChevronRight aria-hidden="true" className="size-[18px] shrink-0 text-mut" strokeWidth={2} /></span>}
                onClick={() => openClass(c.id)}
              />
            );
          })}
        </Rows>
      )}
      {isAdmin && (
        <Rows>
          <Row
            lead={<Dot icon={<Plus />} size={40} />}
            title="ახალი კლასი"
            sub="მასწავლებლისთვის"
            onClick={() => { setErr(''); setNaming(''); }}
          />
        </Rows>
      )}
      <Sheet open={naming !== null} onClose={() => setNaming(null)} title="ახალი კლასი">
        <Field label="კლასის სახელი" value={naming || ''} onChange={setNaming} placeholder="მაგ: გურჯაანის ჯგუფი" autoFocus
          onKeyDown={e => { if (e.key === 'Enter') void create(); }} hint="დანარჩენს კლასის გვერდზე დაამატებ." />
        {err && <p role="alert" className="px-1.5 text-meta text-danger">{err}</p>}
        <Button full icon={saving ? <Loader2 className="animate-spin" /> : <Check />} onClick={create} disabled={saving || !(naming || '').trim()}>
          შექმნა და გახსნა
        </Button>
      </Sheet>
    </div>
  );
};
