import React, { useState } from 'react';
import { ArrowLeft, MessageCircle, Loader2, PenLine, Eye } from 'lucide-react';
import { useAuth, useNavigation } from '../context';
import { useMyClasses, useTeachingClasses } from '../hooks/useClasses';
import {
  useDirectThreads, useAllThreads, useTeacherCards, contactsOf, openThread, otherOf, isUnread, Contact, DirectThread, Person,
} from '../hooks/useDirectChat';
import { Avatar, hhmm, dayLabel } from '../components/classes/ChatPanel';

// today: the time; earlier: the day
const when = (d: Date | null) => (!d ? '' : d.toDateString() === new Date().toDateString() ? hhmm(d) : dayLabel(d));

const Row: React.FC<{
  name: string; photoURL: string; sub: React.ReactNode; time?: string; unread?: boolean; busy?: boolean; onClick: () => void;
}> = ({ name, photoURL, sub, time, unread, busy, onClick }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full min-h-[64px] flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white ring-1 ring-[#e8dcc8] hover:ring-[#7a2028]/35 text-left cursor-pointer active:scale-[0.99] transition disabled:opacity-60"
    >
      <Avatar name={name} photoURL={photoURL} className="w-11 h-11 text-base" />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className={`truncate text-[15px] ${unread ? 'font-bold text-[#2a2017]' : 'font-semibold text-[#2a2017]'}`}>{name}</span>
          {time && <span className={`shrink-0 text-xs tabular-nums ${unread ? 'font-bold text-[#7a2028]' : 'text-[#a89886]'}`}>{time}</span>}
        </span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`truncate text-sm ${unread ? 'text-[#4a3426] font-semibold' : 'text-[#8a7a6a]'}`}>{sub}</span>
          {busy ? <Loader2 className="w-4 h-4 shrink-0 animate-spin text-[#a89886]" />
            : unread && <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-[#c62828]" aria-label="წაუკითხავი" />}
        </span>
      </span>
    </button>
  </li>
);

// Private chats between a teacher and a student of their class: one's chats, whom one may start writing to,
// and for the superadmin every chat in the school (read only). Opened from the header's chat button.
export const MessagesPage: React.FC = () => {
  const { user, isSuperAdmin, isTeacher } = useAuth();
  const { handleGoBack, openDm } = useNavigation();
  const memberOf = useMyClasses(user?.uid);
  const { classes: teaching } = useTeachingClasses(isTeacher ? user?.uid : null);
  const { threads, loading } = useDirectThreads(user?.uid);
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const all = useAllThreads(isSuperAdmin && tab === 'all');
  const [opening, setOpening] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const uid = user?.uid || '';
  const classes = [...memberOf, ...teaching.filter(t => !memberOf.some(m => m.id === t.id))];
  const contacts = contactsOf(classes, uid);
  const cards = useTeacherCards(contacts.some(c => !c.iTeach));
  // a teacher's own name and photo are fresher than the copy in the class
  const fresh = (c: Contact): Contact => (!c.iTeach && cards[c.uid] ? { ...c, name: cards[c.uid].name || c.name, photoURL: cards[c.uid].photoURL || c.photoURL } : c);
  const talking = new Set(threads.map(t => otherOf(t, uid).uid));
  const newOnes = contacts.filter(c => !talking.has(c.uid)).map(fresh);

  if (!user) return null;

  const me = (classId: string): Person => {
    const c = classes.find(x => x.id === classId);
    const p = c?.members.find(m => m.uid === uid) || c?.teachers.find(m => m.uid === uid);
    return { uid, name: p?.name || user.displayName || '', photoURL: p?.photoURL || user.photoURL || '' };
  };

  const start = async (c: Contact) => {
    setErr('');
    setOpening(c.uid);
    try {
      const person: Person = { uid: c.uid, name: c.name, photoURL: c.photoURL };
      const id = c.iTeach ? await openThread(me(c.classId), person, c.classId) : await openThread(person, me(c.classId), c.classId);
      openDm(id);
    } catch (e) {
      console.warn('dm: ', e);
      setErr('ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setOpening(null);
    }
  };

  const preview = (t: DirectThread) => (t.lastText ? `${t.lastBy === uid ? 'შენ: ' : ''}${t.lastText}` : 'ჯერ შეტყობინება არ არის');

  const tabBtn = (id: 'mine' | 'all', label: string, Icon: typeof Eye) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`flex-1 h-11 rounded-full text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition ${
        tab === id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#7a2028] hover:bg-[#7a2028]/[0.06]'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-1 py-4 sm:py-8 space-y-6 text-[#2a2017]">
      <button
        type="button"
        onClick={handleGoBack}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-sm font-semibold text-[#4a3426] cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" /> უკან
      </button>

      <header className="flex flex-col items-center text-center gap-2">
        <span className="w-14 h-14 rounded-full bg-[#7a2028]/[0.07] ring-1 ring-[#7a2028]/20 flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-[#7a2028]" />
        </span>
        <h1 className="font-serif-ge text-2xl sm:text-3xl font-bold text-[#4a3426]">პირადი შეტყობინებები</h1>
        <p className="text-sm text-[#8a7a6a] max-w-md">მასწავლებელი და მისი მოსწავლე — მხოლოდ ორნი.</p>
      </header>

      {isSuperAdmin && (
        <div className="flex gap-1 p-1 rounded-full bg-white/80 ring-1 ring-[#e8dcc8]" role="group" aria-label="ჩათების ჩვენება">
          {tabBtn('mine', 'ჩემი', MessageCircle)}
          {tabBtn('all', 'ყველა ჩათი', Eye)}
        </div>
      )}

      {err && <p className="text-center text-sm text-[#a02c2c]">{err}</p>}

      {tab === 'all' && isSuperAdmin ? (
        <section className="space-y-3">
          <p className="text-sm text-[#8a7a6a] px-1">სკოლის ყველა პირადი ჩათი — მხოლოდ სანახავად.</p>
          {all.loading ? (
            <div className="py-10 flex justify-center text-[#b3a594]"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : all.threads.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8a7a6a]">პირადი ჩათები ჯერ არ არის.</p>
          ) : (
            <ul className="space-y-2">
              {all.threads.map(t => (
                <Row
                  key={t.id}
                  name={`${t.names[t.teacherUid] || 'მასწავლებელი'} — ${t.names[t.studentUid] || 'მოსწავლე'}`}
                  photoURL={t.photos[t.studentUid] || ''}
                  sub={t.lastText || 'ჯერ შეტყობინება არ არის'}
                  time={when(t.lastAt)}
                  onClick={() => openDm(t.id)}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section className="space-y-3">
            {loading ? (
              <div className="py-10 flex justify-center text-[#b3a594]"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : threads.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#8a7a6a]">
                ჯერ პირადი ჩათი არ გაქვთ.{newOnes.length > 0 && <><br />აირჩიეთ ქვემოთ, ვის მისწეროთ.</>}
              </p>
            ) : (
              <ul className="space-y-2">
                {threads.map(t => {
                  const o = otherOf(t, uid);
                  const card = cards[o.uid];
                  return (
                    <Row
                      key={t.id}
                      name={card?.name || o.name || 'უსახელო'}
                      photoURL={card?.photoURL || o.photoURL}
                      sub={preview(t)}
                      time={when(t.lastAt)}
                      unread={isUnread(t, uid)}
                      onClick={() => openDm(t.id)}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          {newOnes.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-serif-ge text-lg font-bold text-[#4a3426] px-1">
                <PenLine className="w-5 h-5 text-[#7a2028]" /> {newOnes.every(c => !c.iTeach) ? 'მისწერეთ მასწავლებელს' : 'ახალი საუბარი'}
              </h2>
              <ul className="space-y-2">
                {newOnes.map(c => (
                  <Row
                    key={c.uid}
                    name={c.name || 'უსახელო'}
                    photoURL={c.photoURL}
                    sub={c.iTeach ? `მოსწავლე · ${c.className}` : `მასწავლებელი · ${c.className}`}
                    busy={opening === c.uid}
                    onClick={() => start(c)}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
};
