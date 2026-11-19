import React, { useEffect, useState } from 'react';
import { MessageCircle, Star } from 'lucide-react';
import { Waiting } from '../../../components/shell/PageSkeleton';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth, useNavigation } from '../../../context';
import { Card, Dot, Hero, Row, Rows, SectionLabel, Small, TopBar } from '../../../components/ui2';
import { cx } from '../../../components/ui2/cx';
import { useAllMyClasses } from '../../../components/classes/ClassPicker';
import { Birthday, ageNow, inDaysText, nextBirthday, turning, useBirthdays } from '../../../utils/birthdays';
import { NameDay, clearNameDay, saveNameDay, useNameDays } from '../../../utils/nameDays';
import { useMembership } from '../../../utils/memberAccess';
import { MONTHS_GE, MONTHS_SHORT_GE } from '../../../utils/dateNames';
import { fullName } from '../../../utils/memberName';
import { openAdminThread, openPeerThread, openThread, type Person } from '../../../hooks/useDirectChat';
import { NameDaySheetV2 } from './NameDaySheet';

/** x-dabadebis — „დაბადების დღეები“: the nearest day on top, then month by month, my own „ანგელოზის დღე“ last.
 *  Members see the day and month only; teachers and admins also the age (as the old page). */

type Ev = { key: string; uid: string; name: string; photoURL?: string; month: number; day: number } & (
  { kind: 'birth'; b: Birthday } | { kind: 'name'; saint: string }
);

const events = (births: Birthday[], names: NameDay[]): Ev[] => [
  ...births.map(b => ({ key: `b-${b.uid}`, uid: b.uid, name: b.name, photoURL: b.photoURL, month: b.month, day: b.day, kind: 'birth' as const, b })),
  ...names.map(n => ({ key: `n-${n.uid}`, uid: n.uid, name: n.name, photoURL: n.photoURL, month: n.month, day: n.day, kind: 'name' as const, saint: n.saint })),
];

const saintShort = (s: string) => s.length > 40 ? s.slice(0, 38).trimEnd() + '…' : s;

/** „მიულოცე“: the private chat with the person, as the school's chats allow it — through a class we share (a teacher's
 *  or classmates' chat), else an admin's chat with them. null when there is no way (then no button shows). */
const useCongratulate = () => {
  const { user, isAdmin } = useAuth();
  const { openDm } = useNavigation();
  const classes = useAllMyClasses();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const route = (uid: string) => {
    for (const c of classes) {
      const theyTeach = c.teacherIds.includes(uid);
      const theyIn = theyTeach || c.memberIds.includes(uid);
      if (theyIn) return { classId: c.id, cls: c, theyTeach };
    }
    return null;
  };
  const can = (uid: string) => !!user && uid !== user.uid && (!!route(uid) || isAdmin);

  const go = async (p: Person) => {
    if (!user || busy) return;
    setBusy(p.uid); setError('');
    try {
      const r = route(p.uid);
      const find = (cls: { members: { uid: string; name?: string; photoURL?: string }[]; teachers: { uid: string; name?: string; photoURL?: string }[] }): Person => {
        const m = cls.members.find(x => x.uid === user.uid) || cls.teachers.find(x => x.uid === user.uid);
        return { uid: user.uid, name: m?.name || user.displayName || '', photoURL: m?.photoURL || user.photoURL || '' };
      };
      let id: string;
      if (!r) id = await openAdminThread(p);
      else {
        const me = find(r.cls);
        const iTeach = r.cls.teacherIds.includes(user.uid);
        id = iTeach ? await openThread(me, p, r.classId) : r.theyTeach ? await openThread(p, me, r.classId) : await openPeerThread(me, p, r.classId);
      }
      openDm(id);
    } catch (e) {
      console.warn('birthdays dm: ', e);
      setError('ჩათი ვერ გაიხსნა. სცადეთ მოგვიანებით.');
    } finally {
      setBusy('');
    }
  };
  return { can, go, busy, error };
};

const DateTile: React.FC<{ day: number; month: number; today?: boolean }> = ({ day, month, today }) => (
  <span aria-hidden="true" className={cx(
    'flex size-12 shrink-0 flex-col items-center justify-center rounded-field leading-none',
    today ? 'bg-wine text-white' : 'bg-tint text-wine',
  )}>
    <span className="text-lead font-bold tabular-nums">{day}</span>
    <span className="mt-0.5 text-cap font-semibold">{MONTHS_SHORT_GE[month - 1]}</span>
  </span>
);

export const BirthdaysScreen: React.FC = () => {
  const { user, isTeacher } = useAuth();
  const { handleGoBack } = useNavigation();
  const { isMember } = useMembership();
  const births = useBirthdays(!!user && isMember, isTeacher);
  const names = useNameDays(!!user && isMember);
  const cong = useCongratulate();
  const [naming, setNaming] = useState(false);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', churchName: '' });
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'students', user.uid), s => {
      const p = s.data()?.profile || {};
      setProfile({ firstName: p.firstName || '', lastName: p.lastName || '', churchName: p.churchName || '' });
    }, () => {});
  }, [user]);

  if (!births || !names) {
    return (
      <div className="flex w-full flex-col gap-2.5 pb-4">
        <TopBar title="დაბადების დღეები" onBack={handleGoBack} />
        <Waiting field={false} />
      </div>
    );
  }

  const now = new Date();
  const all = events(births, names);
  const withNext = all.map(e => ({ e, ...nextBirthday(e, now) }));
  const nearest = [...withNext].sort((a, z) => a.days - z.days || a.e.name.localeCompare(z.e.name, 'ka'))[0];
  const thisMonth = now.getMonth() + 1;
  const months = Array.from({ length: 12 }, (_, i) => ((thisMonth - 1 + i) % 12) + 1)
    .map(m => ({ m, people: all.filter(e => e.month === m).sort((a, z) => a.day - z.day || a.name.localeCompare(z.name, 'ka')) }))
    .filter(x => x.people.length);
  const mine = names.find(n => n.uid === user?.uid);

  const lineOf = (e: Ev) => {
    if (e.kind === 'name') return `ანგელოზის დღე · ${saintShort(e.saint)}`;
    const age = isTeacher ? ageNow(e.b, now) : undefined;
    return age !== undefined ? `დაბადების დღე · ${age} წლის` : 'დაბადების დღე';
  };
  const personOf = (e: Ev): Person => ({ uid: e.uid, name: e.name, photoURL: e.photoURL || '' });

  const heroSub = (e: Ev) => {
    if (e.kind === 'name') return `ანგელოზის დღე · ${saintShort(e.saint)}`;
    const t = isTeacher ? turning(e.b, now) : undefined;
    return t !== undefined ? `დაბადების დღე · ხდება ${t}` : 'დაბადების დღე';
  };

  return (
    <div className="flex w-full flex-col gap-2.5 pb-4">
      <TopBar title="დაბადების დღეები" onBack={handleGoBack} />

      {nearest && (
        <Hero
          kicker={`${inDaysText(nearest.days)} · ${nearest.e.day} ${MONTHS_GE[nearest.e.month - 1]}`}
          title={nearest.e.name}
          sub={heroSub(nearest.e)}
          action={cong.can(nearest.e.uid) ? { label: 'მიულოცე', icon: <MessageCircle aria-hidden="true" />, onClick: () => cong.go(personOf(nearest.e)) } : undefined}
        />
      )}
      {cong.error && <p className="px-1.5 text-meta text-danger">{cong.error}</p>}

      {!all.length && <Card><p className="text-body text-mut">ჯერ არავის ჩაუწერია დაბადების თარიღი</p></Card>}

      {months.map(({ m, people }) => (
        <React.Fragment key={m}>
          <SectionLabel label={MONTHS_GE[m - 1]} className="mt-2.5" />
          <Rows>
            {people.map(e => {
              const today = nextBirthday(e, now).days === 0;
              const me = e.uid === user?.uid;
              const can = cong.can(e.uid);
              return (
                <Row
                  key={e.key}
                  lead={<DateTile day={e.day} month={e.month} today={today} />}
                  title={me ? `${e.name} (შენ)` : e.name}
                  sub={lineOf(e)}
                  right={today && !can ? <Small tone="wine">დღეს</Small> : undefined}
                  onClick={can ? () => cong.go(personOf(e)) : undefined}
                  disabled={cong.busy === e.uid}
                />
              );
            })}
          </Rows>
        </React.Fragment>
      ))}

      {user && (
        <Rows className="mt-2.5">
          <Row
            lead={<Dot icon={<Star />} />}
            title="ჩემი ანგელოზის დღე"
            sub={mine ? `${mine.day} ${MONTHS_GE[mine.month - 1]} · ${saintShort(mine.saint)}` : 'ჯერ არ არის არჩეული'}
            onClick={() => setNaming(true)}
          />
        </Rows>
      )}

      {naming && user && (
        <NameDaySheetV2
          first={profile.churchName || profile.firstName}
          mine={mine}
          onPick={async c => {
            const name = fullName(profile) || user.displayName || '';
            await saveNameDay(user.uid, name, user.photoURL || '', c);
            setNaming(false);
          }}
          onClear={async () => { await clearNameDay(user.uid); setNaming(false); }}
          onClose={() => setNaming(false)}
        />
      )}
    </div>
  );
};
