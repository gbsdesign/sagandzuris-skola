import React, { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Eye, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { ChantSelectionProvider, ViewAsStudent, useNavigation, useRealAuth } from '../context';
import { useManagedClasses } from '../hooks/useClasses';
import type { ClassMember } from '../hooks/useClasses';
import { openAdminThread, openThread } from '../hooks/useDirectChat';
import { useAccess } from '../hooks/useAccess';
import { PageBar, askConfirm } from '../components/ui/kit';
import { Avatar } from '../components/classes/ChatPanel';
import { PathPageBody } from '../components/views/PathPageBody';
import { StudentProfileCard } from '../components/views/StudentProfileCard';
import { ChemiSamosi } from '../components/views/ChemiSamosi';
import { ShortcutShelf } from '../components/home/ShortcutShelf';
import { StudentTools } from '../components/teacher/StudentsOverview';
import { removeClassMember } from '../components/admin/ClassesAdmin';

// A student's own page, opened by their teacher or an admin (2026-11-04, the user: „მოსწავლეზე დაჭერისას იხსნებოდეს მისი
// გზა … ახალი გვერდი კი არ იქმნება, არამედ მის გზაზე გადავდივართ, მის პირად პროფილზე და თან მაქვს ცვლილებების უფლება ზუსტად
// ისე როგორც მას“): who it is on top; their „საგანძურის გზა“ and their profile as their own app shows them (ViewAsStudent —
// every part reads and writes their record; firestore.rules let their teachers and the admins write what they may); then
// the teacher's part („მასწავლებლისთვის“, the old member's window, never shown to the student). mapItem = "uid|classId".

const useStudentFace = (uid: string) => {
  const [face, setFace] = useState<{ name: string; photoURL: string } | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (!uid) return;
    setFace(null);
    setDenied(false);
    return onSnapshot(
      doc(db, 'students', uid),
      s => {
        const d = s.data() || {};
        const p = d.profile || {};
        const name = `${p.firstName || ''} ${p.lastName || ''}`.trim() || d.displayName || '';
        setFace({ name, photoURL: d.photoURL || '' });
      },
      () => setDenied(true),
    );
  }, [uid]);
  return { face, denied };
};

/** Who it is, on top of a student's page, and that the page is theirs. */
export const StudentHead: React.FC<{ name: string; photoURL: string; className?: string }> = ({ name, photoURL, className }) => (
  <section className="rounded-3xl bg-white ring-1 ring-[#e8dcc8] px-4 py-3.5">
    <div className="flex items-center gap-3">
      <Avatar name={name} photoURL={photoURL} className="w-14 h-14 text-xl" />
      <div className="min-w-0">
        <h1 className="font-serif-ge text-xl font-bold leading-tight text-[#2a2017] break-words">{name}</h1>
        <p className="mt-0.5 text-[13px] text-[#8a7a6a]">მოსწავლე{className ? ` · ${className}` : ''}</p>
      </div>
    </div>
    <p className="mt-3 flex items-start gap-2 rounded-2xl bg-[#7a2028]/[0.06] px-3 py-2.5 text-[13px] leading-snug text-[#5a2a20]">
      <Eye className="w-4 h-4 mt-px shrink-0 text-[#7a2028]" />
      <span>ხედავ ისე, როგორც {name.split(/\s+/)[0]}. რასაც აქ შეცვლი, მის გზაზე და პროფილში შეიცვლება.</span>
    </p>
  </section>
);

export const StudentPage: React.FC<{ item: string | null }> = ({ item }) => {
  const [uid = '', classId = ''] = (item || '').split('|');
  const auth = useRealAuth();
  const { handleGoBack, openDm } = useNavigation();
  const access = useAccess();
  const { classes } = useManagedClasses();
  const { face, denied } = useStudentFace(uid);
  const [note, setNote] = useState('');

  // the class it was opened from, else one of mine the student is in (the teacher's part needs one)
  const cls = classes.find(c => c.id === classId && c.memberIds.includes(uid)) || classes.find(c => c.memberIds.includes(uid)) || null;
  const member = cls?.members.find(m => m.uid === uid);
  const name = face?.name || member?.name || 'მოსწავლე';
  const photoURL = face?.photoURL || member?.photoURL || '';
  const firstName = name.split(/\s+/)[0];
  const student = useMemo(() => ({ uid, name, photoURL }), [uid, name, photoURL]);

  if (!auth.user || !auth.isTeacher || !uid) {
    return <div className="w-full max-w-lg mx-auto px-1 py-3"><PageBar title="მოსწავლე" onBack={handleGoBack} /></div>;
  }

  const meHere = () => {
    const p = cls?.teachers.find(t => t.uid === auth.user!.uid);
    return { uid: auth.user!.uid, name: p?.name || auth.user!.displayName || '', photoURL: p?.photoURL || auth.user!.photoURL || '' };
  };
  const write = async (m: ClassMember) => {
    setNote('');
    try {
      const other = { uid: m.uid, name: m.name || name, photoURL: m.photoURL || photoURL };
      const id = cls && cls.teacherIds.includes(auth.user!.uid) ? await openThread(meHere(), other, cls.id) : await openAdminThread(other);
      openDm(id);
    } catch (e) {
      console.warn('dm: ', e);
      setNote('პირადი ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    }
  };
  const remove = async (m: ClassMember) => {
    if (!cls) return false;
    if (!(await askConfirm({ title: `ამოვიღო „${m.name}“ კლასიდან?`, text: 'მისი ანგარიში და ნასწავლი არ წაიშლება.', ok: 'ამოღება', danger: true }))) return false;
    try {
      await removeClassMember(cls, m.uid);
      handleGoBack();
      return true;
    } catch {
      setNote('წევრი ვერ ამოიღო.');
      return false;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-3 space-y-5">
      {/* the name once, big, in the card under the bar */}
      <PageBar title="მოსწავლის გვერდი" onBack={handleGoBack} />

      <StudentHead name={name} photoURL={photoURL} className={cls?.name} />

      {denied ? (
        <p className="py-8 text-center text-sm text-[#8a7a6a]">ამ მოსწავლის მონაცემები ჯერ არ ჩანს.</p>
      ) : !face ? (
        <div className="py-10 flex justify-center text-[#b3a594]"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <ViewAsStudent student={student}>
          <ChantSelectionProvider>
            {/* their „საგანძურის გზა“ */}
            <PathPageBody />
            {/* their profile, as on their own profile page (the parts kept on a phone — ხუცური, widgets, calendar — stay out) */}
            <div className="max-w-lg mx-auto">
              <StudentProfileCard
                member={{ uid, email: '', displayName: name, photoURL }}
                slot={<>
                  {access.on('samosi') && <ChemiSamosi side={
                    <span className="block">
                      <span className="block font-serif-ge text-[15px] font-bold text-[#4a3426]">სამოსი</span>
                      <span className="block text-[13px] text-[#8a7a6a] leading-snug">ჩოხა და ქართული კაბა — ნაწილი ნაწილ</span>
                    </span>
                  } />}
                  <ShortcutShelf variant="profile" />
                </>}
              />
            </div>
          </ChantSelectionProvider>
        </ViewAsStudent>
      )}

      {/* the teacher's part — never shown to the student */}
      {cls && <StudentTools cls={cls} uid={uid} onWrite={write} onRemove={remove} />}
      {note && <p className="text-center text-sm font-semibold text-red-700">{note}</p>}
    </div>
  );
};
