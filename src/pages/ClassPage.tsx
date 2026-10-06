import React, { useState } from 'react';
import { ArrowLeft, Users, ListChecks, Check, CheckCheck, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth, useNavigation, useChants } from '../context';
import { useConfirmations } from '../hooks/useConfirmations';
import { findCatalogEntry, CATEGORY_LABEL, usesVoices, voicesOf, Voice } from '../utils/pathItems';
import { useMyClasses, useAllClasses, useTeachingClasses } from '../hooks/useClasses';
import { LessonTable } from '../components/teacher/Schedule';
import { ClassLogo } from '../components/classes/ClassLogo';
import { ClassChat } from '../components/classes/ClassChat';
import { Avatar } from '../components/classes/ChatPanel';
import { openThread, Person } from '../hooks/useDirectChat';
import type { ClassMember } from '../hooks/useClasses';

// A class's shared page: its chat, members and the common program. Members reach it from the class logo in the header.
export const ClassPage: React.FC = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  const { selectedClassId, handleGoBack, openDm } = useNavigation();
  // a private chat being opened (the other person's uid), and why it could not be
  const [opening, setOpening] = useState<string | null>(null);
  const [dmErr, setDmErr] = useState('');
  const mine = useMyClasses(user?.uid);
  const { classes: all } = useAllClasses(isAdmin);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const cls = [...mine, ...teaching, ...all].find(c => c.id === selectedClassId) || mine[0];
  const { selectedChantVariants } = useChants();
  const confirmed = useConfirmations(user?.uid);

  if (!cls) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 text-center text-[#8a7a6a]">
        კლასი ვერ მოიძებნა.
        <div className="mt-4">
          <button type="button" onClick={handleGoBack} className="h-10 px-4 rounded-full ring-1 ring-[#e8dcc8] bg-white text-[#4a3426] font-semibold cursor-pointer">
            უკან
          </button>
        </div>
      </div>
    );
  }

  // private chats: a member writes to the class's teachers, a teacher of the class to its members
  const iTeach = !!user && cls.teacherIds.includes(user.uid);
  const iAmMember = !!user && cls.memberIds.includes(user.uid);
  const person = (p: ClassMember): Person => ({ uid: p.uid, name: p.name || '', photoURL: p.photoURL || '' });
  const meHere = (): Person => {
    const p = cls.members.find(m => m.uid === user?.uid) || cls.teachers.find(m => m.uid === user?.uid);
    return { uid: user!.uid, name: p?.name || user!.displayName || '', photoURL: p?.photoURL || user!.photoURL || '' };
  };
  const writeTo = async (other: ClassMember, otherIsTeacher: boolean) => {
    setDmErr('');
    setOpening(other.uid);
    try {
      const id = otherIsTeacher ? await openThread(person(other), meHere(), cls.id) : await openThread(meHere(), person(other), cls.id);
      openDm(id);
    } catch (e) {
      console.warn('dm: ', e);
      setDmErr('პირადი ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setOpening(null);
    }
  };
  const myTeachers = iAmMember ? cls.teachers.filter(t => t.uid !== user?.uid) : [];

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-8 space-y-6 text-[#2a2017]">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-sm font-semibold text-[#4a3426] cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> უკან
      </button>

      <header className="flex flex-col items-center text-center gap-3">
        <ClassLogo name={cls.name} logo={cls.logo} className="w-24 h-24 text-4xl shadow-[0_0_0_4px_#fbf6ec,0_0_0_5px_#e8dcc8]" />
        <h1 className="font-serif-ge text-2xl sm:text-3xl font-bold text-[#4a3426]">{cls.name}</h1>
        <p className="text-sm text-[#8a7a6a]">
          {cls.members.length} წევრი{cls.teachers.length > 0 && ` · მასწავლებელი: ${cls.teachers.map(t => t.name).join(', ')}`}
        </p>
        {myTeachers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {myTeachers.map(t => (
              <button
                key={t.uid}
                type="button"
                onClick={() => writeTo(t, true)}
                disabled={opening === t.uid}
                className="h-11 max-w-full pl-1.5 pr-4 rounded-full bg-white ring-1 ring-[#7a2028]/25 hover:ring-[#7a2028]/45 text-[#7a2028] text-sm font-bold inline-flex items-center gap-2 cursor-pointer active:scale-95 transition disabled:opacity-60"
              >
                <Avatar name={t.name} photoURL={t.photoURL} className="w-8 h-8 text-sm" />
                <span className="truncate">{myTeachers.length > 1 ? `მისწერეთ: ${t.name}` : 'მისწერეთ მასწავლებელს'}</span>
                {opening === t.uid ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <MessageCircle className="w-4 h-4 shrink-0" />}
              </button>
            ))}
          </div>
        )}
        {dmErr && <p className="text-sm text-[#a02c2c]">{dmErr}</p>}
      </header>

      {cls.schedule.length > 0 && <LessonTable slots={cls.schedule} title="გაკვეთილების ცხრილი" />}

      <ClassChat cls={cls} />

      {/* common program */}
      <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426] mb-4">
          <ListChecks className="w-5 h-5 text-[#7a2028]" /> საერთო პროგრამა
        </h2>
        {cls.program.length === 0 ? (
          <p className="text-sm text-[#8a7a6a]">პროგრამა ჯერ არ არის შედგენილი.</p>
        ) : (
          <ol className="space-y-3">
            {cls.program.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#7a2028]/10 text-[#7a2028] text-sm font-bold flex items-center justify-center tabular-nums">
                  {i + 1}
                </span>
                <div className="pt-0.5 min-w-0 flex-1">
                  <p className="font-semibold text-[#2a2017]">{item.title}</p>
                  {item.id && (
                    <p className="text-xs text-[#8a7a6a]">{CATEGORY_LABEL[findCatalogEntry(item.id)?.category || 'galoba']} · {item.code}</p>
                  )}
                  {item.note && <p className="text-sm text-[#75685a] whitespace-pre-line mt-0.5">{item.note}</p>}
                  {/* the viewer's own progress on this item */}
                  {item.id && (() => {
                    const mineItem = selectedChantVariants[item.id];
                    const marked = mineItem ? voicesOf(mineItem, item.id) : [];
                    const conf = confirmed[item.id] || [];
                    const list: Voice[] = usesVoices(item.id) ? ['1', '2', '3'] : ['1'];
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {list.map(v => {
                          const isConf = conf.includes(v);
                          const isMarked = marked.includes(v);
                          return (
                            <span
                              key={v}
                              className={`h-7 px-2.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                isConf ? 'bg-emerald-700 text-white' : isMarked ? 'bg-[#7a2028] text-[#fbf6ec]' : 'bg-white ring-1 ring-[#e8dcc8] text-[#b3a594]'
                              }`}
                            >
                              {isConf ? <CheckCheck className="w-3.5 h-3.5" /> : isMarked ? <Check className="w-3.5 h-3.5" /> : null}
                              {usesVoices(item.id!) ? `${v} ხმა` : 'ნასწავლი'}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* members */}
      <section className="bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426] mb-4">
          <Users className="w-5 h-5 text-[#7a2028]" /> კლასის წევრები
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {cls.members.map(m => (
            <li key={m.uid} className={`flex items-center gap-3 p-2.5 rounded-2xl ${m.uid === user?.uid ? 'bg-[#7a2028]/5 ring-1 ring-[#7a2028]/20' : 'bg-white ring-1 ring-[#e8dcc8]'}`}>
              {m.photoURL ? (
                <img src={m.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-10 h-10 rounded-full bg-[#efe5d4] text-[#4a3426] font-bold flex items-center justify-center">
                  {m.name.charAt(0)}
                </span>
              )}
              <span className="flex-1 min-w-0 font-semibold text-[#2a2017] truncate">
                {m.name}
                {m.uid === user?.uid && <span className="ml-1.5 text-xs font-normal text-[#8a7a6a]">(შენ)</span>}
              </span>
              {iTeach && m.uid !== user?.uid && (
                <button
                  type="button"
                  onClick={() => writeTo(m, false)}
                  disabled={opening === m.uid}
                  className="w-9 h-9 shrink-0 rounded-xl ring-1 ring-[#e8dcc8] bg-white hover:ring-[#7a2028]/40 text-[#7a2028] flex items-center justify-center cursor-pointer active:scale-95 transition disabled:opacity-60"
                  title={`პირადი მიწერა: ${m.name}`}
                  aria-label={`პირადი მიწერა: ${m.name}`}
                >
                  {opening === m.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
