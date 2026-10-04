import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Search,
  Users,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  ArrowLeft,
  Mail,
  RefreshCw,
  GraduationCap,
  X,
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useNavigation } from '../context';
import { triggerHaptic } from '../utils/haptics';
import { useAllClasses } from '../hooks/useClasses';
import { HABIT_ITEMS } from '../data/habitsAndManera';
import { getHabitsWeekKey } from '../utils/habitsWeek';
import { ClassesAdmin, AdminStudent } from '../components/admin/ClassesAdmin';

interface AdminRecord {
  email: string;
  role?: string;
  addedBy?: string;
  addedAt?: string;
}

interface StudentUserRecord {
  userId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  authProvider?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: {
    year?: string;
    month?: string;
    day?: string;
  };
  region?: string;
  city?: string;
  experienceLevel?: string | string[];
  voices?: string[];
  workSchedule?: Record<string, string | string[]>;
  completedSessions?: Record<string, number>;
  habitsDone?: number; // habits ticked this week (students no longer see a counter; teachers do)
  updatedAt?: string;
  lastActiveAt?: string;
  createdAt?: string;
}

export const AdminPanelPage: React.FC = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { handleGoBack } = useNavigation();

  // State
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [studentsList, setStudentsList] = useState<StudentUserRecord[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // New admin input
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminStatusMessage, setAdminStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Expanded users
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Real-time listener for admins collection
  useEffect(() => {
    const unsubAdmins = onSnapshot(
      collection(db, 'admins'),
      (snapshot) => {
        const list: AdminRecord[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as AdminRecord;
          list.push({
            email: data.email || d.id,
            role: data.role || 'admin',
            addedBy: data.addedBy || '',
            addedAt: data.addedAt || '',
          });
        });

        // Ensure super admin is included at top
        const hasSuper = list.some((a) => a.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
        if (!hasSuper) {
          list.unshift({
            email: SUPER_ADMIN_EMAIL,
            role: 'superadmin',
            addedBy: 'სისტემა',
            addedAt: '',
          });
        }

        setAdminsList(list);
        setLoadingAdmins(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'admins');
        setLoadingAdmins(false);
      }
    );

    return () => unsubAdmins();
  }, []);

  // Real-time listener for registered students/users
  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const list: StudentUserRecord[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const profile = data.profile || {};
          const detectedEmail = data.email || profile.email || data.userEmail || data.mail || '';
          const detectedProvider = data.authProvider || data.providerId || (detectedEmail ? 'Google' : 'Google Auth');

          list.push({
            userId: d.id,
            email: detectedEmail,
            displayName: data.displayName || '',
            photoURL: data.photoURL || '',
            authProvider: detectedProvider,
            firstName: profile.firstName || data.firstName || '',
            lastName: profile.lastName || data.lastName || '',
            birthDate: profile.birthDate || data.birthDate,
            region: profile.region || data.region,
            city: profile.city || data.city,
            experienceLevel: profile.experienceLevel || data.experienceLevel,
            voices: Array.isArray(profile.voices) ? profile.voices : Array.isArray(data.voices) ? data.voices : [],
            workSchedule: profile.workSchedule || data.workSchedule || {},
            completedSessions: data.completedSessions || {},
            habitsDone: data.habitsWeek === getHabitsWeekKey()
              ? HABIT_ITEMS.filter(h => data.habitsStats?.[h.id]).length
              : 0,
            updatedAt: data.updatedAt || '',
            lastActiveAt: data.lastActiveAt || data.updatedAt || '',
            createdAt: data.createdAt || data.updatedAt || '',
          });
        });
        setStudentsList(list);
        setLoadingStudents(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
        setLoadingStudents(false);
      }
    );

    return () => unsubStudents();
  }, []);

  // Check if a specific student is an admin
  const isStudentAnAdmin = (st: StudentUserRecord) => {
    const emailMatch = st.email && adminsList.some((a) => a.email.toLowerCase() === st.email?.toLowerCase());
    const idMatch = adminsList.some((a) => a.email.toLowerCase() === st.userId.toLowerCase());
    return Boolean(emailMatch || idMatch);
  };

  // Toggle admin rights directly from a user row
  const handleToggleStudentAdmin = async (student: StudentUserRecord, makeAdmin: boolean) => {
    let emailToUse = (student.email || '').trim().toLowerCase();

    if (makeAdmin) {
      if (!emailToUse) {
        const inputEmail = window.prompt(
          `მომხმარებელ "${student.firstName || student.displayName || 'უსახელო'}"-ს მონაცემებში არ აქვს მითითებული მეილი.\nშეიყვანეთ მისი ელ-ფოსტა ადმინისტრატორად დასანიშნად:`,
          ''
        );
        if (!inputEmail || !inputEmail.includes('@')) {
          if (inputEmail !== null) {
            alert('გთხოვთ შეიყვანოთ სწორი ელ-ფოსტის მისამართი.');
          }
          return;
        }
        emailToUse = inputEmail.trim().toLowerCase();

        // Also save this email into student record in Firestore
        try {
          await setDoc(doc(db, 'students', student.userId), { email: emailToUse }, { merge: true });
        } catch (_) {}
      }

      try {
        triggerHaptic(20);
        await setDoc(doc(db, 'admins', emailToUse), {
          email: emailToUse,
          role: 'admin',
          userId: student.userId,
          addedBy: user?.email || 'admin',
          addedAt: new Date().toISOString(),
        });
        setAdminStatusMessage({
          text: `ადმინისტრატორის უფლება წარმატებით მიენიჭა: ${emailToUse}`,
          type: 'success',
        });
        triggerHaptic(35);
      } catch (err: any) {
        setAdminStatusMessage({
          text: 'შეცდომა ადმინის დამატებისას: ' + (err.message || ''),
          type: 'error',
        });
      }
    } else {
      // Remove admin
      if (emailToUse === SUPER_ADMIN_EMAIL.toLowerCase()) {
        alert('მთავარი ადმინისტრატორის უფლებების გაუქმება შეუძლებელია.');
        return;
      }
      const confirmed = window.confirm(`დარწმუნებული ხართ, რომ გსურთ ადმინისტრატორის უფლების გაუქმება: ${emailToUse || student.displayName}?`);
      if (!confirmed) return;

      try {
        triggerHaptic(15);
        if (emailToUse) {
          await deleteDoc(doc(db, 'admins', emailToUse));
        }
        // Also check if doc exists by userId
        await deleteDoc(doc(db, 'admins', student.userId)).catch(() => {});
        setAdminStatusMessage({
          text: `ადმინისტრატორის უფლება გაუქმებულია: ${emailToUse || student.displayName}`,
          type: 'success',
        });
        triggerHaptic(30);
      } catch (err: any) {
        setAdminStatusMessage({
          text: 'შეცდომა უფლების გაუქმებისას: ' + (err.message || ''),
          type: 'error',
        });
      }
    }
  };

  // Add new admin handler by manual input
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToGrant = newAdminEmail.trim().toLowerCase();

    if (!emailToGrant || !emailToGrant.includes('@')) {
      setAdminStatusMessage({ text: 'გთხოვთ შეიყვანოთ სწორი ელ-ფოსტის მისამართი.', type: 'error' });
      return;
    }

    // Check if already in admins
    const alreadyAdmin = adminsList.some((a) => a.email.toLowerCase() === emailToGrant);
    if (alreadyAdmin) {
      setAdminStatusMessage({ text: 'ეს მომხმარებელი უკვე არის ადმინისტრატორთა სიაში.', type: 'error' });
      return;
    }

    try {
      setIsAddingAdmin(true);
      setAdminStatusMessage(null);
      triggerHaptic(15);

      const adminDocRef = doc(db, 'admins', emailToGrant);
      await setDoc(adminDocRef, {
        email: emailToGrant,
        role: 'admin',
        addedBy: user?.email || 'admin',
        addedAt: new Date().toISOString(),
      });

      setNewAdminEmail('');
      setAdminStatusMessage({
        text: `უფლება წარმატებით მიენიჭა: ${emailToGrant}`,
        type: 'success',
      });
      triggerHaptic(30);
    } catch (err: any) {
      setAdminStatusMessage({
        text: 'შეცდომა ადმინის დამატებისას: ' + (err.message || 'დაუკავშირდით სერვერს'),
        type: 'error',
      });
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Revoke admin handler from admin list
  const handleRemoveAdmin = async (adminEmail: string) => {
    if (adminEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert('მთავარი ადმინისტრატორის უფლებების გაუქმება შეუძლებელია.');
      return;
    }

    const confirmed = window.confirm(`დარწმუნებული ხართ, რომ გსურთ ადმინისტრატორის უფლების გაუქმება: ${adminEmail}?`);
    if (!confirmed) return;

    try {
      triggerHaptic(15);
      await deleteDoc(doc(db, 'admins', adminEmail.toLowerCase()));
      setAdminStatusMessage({
        text: `ადმინისტრატორის უფლება გაუქმებულია: ${adminEmail}`,
        type: 'success',
      });
      triggerHaptic(30);
    } catch (err: any) {
      setAdminStatusMessage({
        text: 'შეცდომა უფლების გაუქმებისას: ' + (err.message || ''),
        type: 'error',
      });
    }
  };

  // Filter students based on search
  const filteredStudents = studentsList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = `${s.firstName} ${s.lastName} ${s.displayName}`.toLowerCase().includes(q);
    const emailMatch = (s.email || '').toLowerCase().includes(q);
    const cityMatch = (s.city || '').toLowerCase().includes(q);
    const regionMatch = (s.region || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || cityMatch || regionMatch;
  });

  const { classes, loading: loadingClasses } = useAllClasses(isAdmin);
  const [tab, setTab] = useState<'users' | 'classes' | 'admins'>('users');
  const showMessage = (text: string, type: 'success' | 'error') => setAdminStatusMessage({ text, type });

  const nameOf = (s: StudentUserRecord) =>
    [s.firstName, s.lastName].filter(Boolean).join(' ') || s.displayName || s.email || 'უსახელო მომხმარებელი';
  const classStudents: AdminStudent[] = studentsList.map(s => ({ userId: s.userId, name: nameOf(s), email: s.email, photoURL: s.photoURL }));

  // schedule is saved as "10:00, 11:00" strings (older records may hold arrays)
  const hoursOf = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map(x => x.trim()).filter(Boolean) : [];

  const card = 'bg-white/70 rounded-3xl ring-1 ring-[#e8dcc8] p-4 sm:p-6';
  const field = 'w-full h-11 px-3.5 rounded-xl bg-white ring-1 ring-[#e8dcc8] focus:ring-2 focus:ring-[#7a2028]/40 text-sm text-[#2a2017] placeholder:text-[#b3a594] outline-none transition';
  const TABS = [
    { id: 'users', label: 'მომხმარებლები', Icon: Users, count: studentsList.length },
    { id: 'classes', label: 'კლასები', Icon: GraduationCap, count: classes.length },
    { id: 'admins', label: 'ადმინები', Icon: ShieldCheck, count: adminsList.length },
  ] as const;

  return (
    <div className="w-full max-w-4xl mx-auto px-1 py-4 sm:py-6 space-y-5 pb-12 text-[#2a2017] animate-in fade-in duration-300">
      {/* title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleGoBack}
          className="w-10 h-10 shrink-0 rounded-full ring-1 ring-[#e8dcc8] bg-white/80 hover:bg-white text-[#4a3426] flex items-center justify-center cursor-pointer active:scale-95"
          title="უკან დაბრუნება"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif-ge text-xl sm:text-2xl font-bold text-[#4a3426]">ადმინ პანელი</h1>
          <p className="text-xs sm:text-sm text-[#8a7a6a] truncate">
            {isSuperAdmin ? 'მთავარი ადმინი' : 'ადმინისტრატორი'} · {user?.email}
          </p>
        </div>
      </div>

      {/* tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-white/70 ring-1 ring-[#e8dcc8]">
        {TABS.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => { triggerHaptic(8); setTab(id); }}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-sm font-bold transition-colors cursor-pointer ${
              tab === id ? 'bg-[#7a2028] text-[#fbf6ec]' : 'text-[#4a3426] hover:bg-[#7a2028]/5'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0 hidden min-[420px]:block" />
            <span className="truncate">{label}</span>
            <span className={`text-xs tabular-nums ${tab === id ? 'text-[#fbf6ec]/75' : 'text-[#8a7a6a]'}`}>{count}</span>
          </button>
        ))}
      </div>

      {adminStatusMessage && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-semibold flex items-center justify-between gap-2 ${
          adminStatusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'bg-red-50 text-red-800 ring-1 ring-red-200'
        }`}>
          <span className="flex items-center gap-2">
            {adminStatusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {adminStatusMessage.text}
          </span>
          <button type="button" onClick={() => setAdminStatusMessage(null)} className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center cursor-pointer" title="დახურვა">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* USERS */}
      {tab === 'users' && (
        <section className={`${card} space-y-4`}>
          <div className="relative">
            <Search className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძებნა სახელით, ელფოსტით ან ქალაქით"
              className={`${field} pl-10`}
            />
          </div>

          {loadingStudents ? (
            <p className="py-8 text-center text-sm text-[#8a7a6a] flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> იტვირთება...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#8a7a6a]">მომხმარებელი ვერ მოიძებნა.</p>
          ) : (
            <ul className="divide-y divide-[#f1e8d9] -mx-1">
              {filteredStudents.map((st) => {
                const isExpanded = expandedUserId === st.userId;
                const fullName = nameOf(st);
                const completedCount = Object.values(st.completedSessions || {}).reduce((a, b) => a + b, 0);
                const scheduleDays = Object.entries(st.workSchedule || {}).map(([d, h]) => [d, hoursOf(h)] as const).filter(([, h]) => h.length > 0);
                const totalScheduledHours = scheduleDays.reduce((acc, [, h]) => acc + h.length, 0);
                const isUserAdmin = isStudentAnAdmin(st);
                const isUserSuperAdmin = !!st.email && st.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                const statuses = Array.isArray(st.experienceLevel) ? st.experienceLevel : st.experienceLevel ? [st.experienceLevel] : [];
                const userClasses = classes.filter(c => c.memberIds.includes(st.userId));

                return (
                  <li key={st.userId} className="px-1">
                    <button
                      type="button"
                      onClick={() => { triggerHaptic(5); setExpandedUserId(isExpanded ? null : st.userId); }}
                      className="w-full flex items-center gap-3 py-3 text-left cursor-pointer group"
                    >
                      {st.photoURL ? (
                        <img src={st.photoURL} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="w-11 h-11 rounded-full bg-[#efe5d4] text-[#4a3426] font-bold flex items-center justify-center shrink-0">
                          {fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#2a2017] truncate group-hover:text-[#7a2028]">{fullName}</span>
                          {isUserSuperAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4a3426] text-[#fbf6ec]">მთავარი ადმინი</span>
                          ) : isUserAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4a3426]/10 text-[#4a3426]">ადმინი</span>
                          ) : null}
                          {userClasses.map(c => (
                            <span key={c.id} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#7a2028]/10 text-[#7a2028]">{c.name}</span>
                          ))}
                        </span>
                        <span className="block text-xs text-[#8a7a6a] truncate">
                          {st.email || 'ელფოსტა არ არის მითითებული'}
                          {st.city && ` · ${st.city}`}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block text-sm font-bold text-[#2a2017] tabular-nums">{completedCount}</span>
                        <span className="block text-[11px] text-[#8a7a6a]">სესია</span>
                      </span>
                      <ChevronDown className={`w-4 h-4 text-[#b3a594] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mb-3 p-4 rounded-2xl bg-[#fbf6ec] ring-1 ring-[#e8dcc8] space-y-4 text-sm animate-in fade-in duration-150">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                          <Info label="სტატუსი" value={statuses.join(', ') || '—'} />
                          <Info label="ჩვევები ამ კვირაში" value={`${st.habitsDone || 0} / ${HABIT_ITEMS.length}`} />
                          <Info label="ხმა" value={(st.voices || []).map(v => (v === '1' ? 'მთქმელი' : v === '2' ? 'მოძახილი' : v === '3' ? 'ბანი' : v)).join(', ') || '—'} />
                          <Info
                            label="კვირის განრიგი"
                            value={totalScheduledHours > 0 ? `${totalScheduledHours} სთ · ${scheduleDays.map(([d]) => d).join(', ')}` : 'არ არის გაწერილი'}
                          />
                          <Info label="ადგილი" value={[st.city, st.region].filter(Boolean).join(', ') || '—'} />
                          <Info
                            label="დაბადების თარიღი"
                            value={st.birthDate?.year ? `${st.birthDate.day || 1}/${st.birthDate.month || 1}/${st.birthDate.year}` : '—'}
                          />
                          <Info
                            label="ბოლო აქტივობა"
                            value={st.lastActiveAt ? new Date(st.lastActiveAt).toLocaleString('ka-GE') : '—'}
                          />
                          <Info label="შესვლა" value="Google" />
                          <Info label="User ID" value={<code className="text-xs break-all">{st.userId}</code>} />
                        </dl>

                        {!isUserSuperAdmin && (
                          <div className="pt-3 border-t border-[#e8dcc8]">
                            {isUserAdmin ? (
                              <button type="button" onClick={() => handleToggleStudentAdmin(st, false)} className="h-10 px-4 rounded-full ring-1 ring-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold cursor-pointer inline-flex items-center gap-2">
                                <Trash2 className="w-4 h-4" /> ადმინობის გაუქმება
                              </button>
                            ) : (
                              <button type="button" onClick={() => handleToggleStudentAdmin(st, true)} className="h-10 px-4 rounded-full ring-1 ring-[#e8dcc8] bg-white hover:ring-[#7a2028]/40 text-[#4a3426] text-sm font-semibold cursor-pointer inline-flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-[#7a2028]" /> ადმინად დანიშვნა
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* CLASSES */}
      {tab === 'classes' && (
        <section className={card}>
          <ClassesAdmin classes={classes} loading={loadingClasses} students={classStudents} onMessage={showMessage} />
        </section>
      )}

      {/* ADMINS */}
      {tab === 'admins' && (
        <section className={`${card} space-y-5`}>
          <form onSubmit={handleAddAdmin} className="space-y-2">
            <label className="block text-xs font-semibold text-[#75685a]">ახალი ადმინის დამატება ელფოსტით</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-[#b3a594] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  className={`${field} pl-10`}
                />
              </div>
              <button
                type="submit"
                disabled={isAddingAdmin}
                className="h-11 px-5 rounded-xl bg-[#7a2028] hover:bg-[#5e1820] text-[#fbf6ec] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isAddingAdmin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                დანიშვნა
              </button>
            </div>
          </form>

          {loadingAdmins ? (
            <p className="py-6 text-center text-sm text-[#8a7a6a]">იტვირთება...</p>
          ) : (
            <ul className="divide-y divide-[#f1e8d9]">
              {adminsList.map((adm) => {
                const isSuper = adm.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                return (
                  <li key={adm.email} className="flex items-center gap-3 py-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSuper ? 'bg-[#4a3426] text-[#fbf6ec]' : 'bg-[#efe5d4] text-[#4a3426]'}`}>
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-[#2a2017] truncate">{adm.email}</span>
                      <span className="block text-xs text-[#8a7a6a]">
                        {isSuper ? 'მთავარი ადმინი' : 'ადმინი'}
                        {adm.addedAt && ` · დაემატა ${new Date(adm.addedAt).toLocaleDateString('ka-GE')}`}
                      </span>
                    </span>
                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdmin(adm.email)}
                        className="w-9 h-9 rounded-full text-[#8a7a6a] hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer shrink-0"
                        title="უფლების გაუქმება"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs text-[#8a7a6a]">{label}</dt>
    <dd className="font-semibold text-[#2a2017] break-words">{value}</dd>
  </div>
);
