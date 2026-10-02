import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserPlus,
  Trash2,
  Search,
  Users,
  Calendar,
  Clock,
  Music,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowLeft,
  Mail,
  RefreshCw,
  Award,
  Globe,
  LogIn
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth, SUPER_ADMIN_EMAIL } from '../context/AuthContext';
import { useNavigation } from '../context';
import { triggerHaptic } from '../utils/haptics';

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
  workSchedule?: Record<string, string[]>;
  completedSessions?: Record<string, number>;
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-bold"
            title="უკან დაბრუნება"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">მთავარ გვერდზე დაბრუნება</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                ადმინისტრატორის პანელი
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              სისტემის მომხმარებლების მონაცემები და ადმინისტრატორთა მართვა
            </p>
          </div>
        </div>

        {/* Current Admin Badge */}
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 rounded-2xl px-3 py-1.5 self-start sm:self-auto">
          <Award className="w-4 h-4 text-amber-700" />
          <div className="text-left">
            <span className="block text-[10px] text-amber-700 font-bold uppercase tracking-wider">
              {isSuperAdmin ? 'მთავარი ადმინი' : 'ადმინისტრატორი'}
            </span>
            <span className="text-xs font-black text-slate-800 font-mono">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback message banner if any */}
      {adminStatusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs ${
            adminStatusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {adminStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{adminStatusMessage.text}</span>
          </div>
          <button
            onClick={() => setAdminStatusMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: Admins Management */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
            <h2 className="text-base font-black text-slate-800">
              ადმინისტრატორების სია და უფლებების მინიჭება
            </h2>
          </div>
          <span className="text-xs font-bold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200/70">
            სულ: {adminsList.length}
          </span>
        </div>

        {/* Grant Admin Form */}
        <form onSubmit={handleAddAdmin} className="space-y-3">
          <label className="block text-xs font-bold text-slate-700">
            ახალი ადმინისტრატორის დამატება (ელ-ფოსტით):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="შეიყვანეთ ელ-ფოსტის მისამართი (მაგ: user@gmail.com)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 text-xs font-medium text-slate-800 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingAdmin}
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer disabled:bg-slate-300"
            >
              {isAddingAdmin ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              <span>ადმინად დანიშვნა</span>
            </button>
          </div>
        </form>

        {/* Admins Table/List */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            აქტიური ადმინისტრატორები
          </h3>
          {loadingAdmins ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              <span>იტვირთება ადმინისტრატორების სია...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {adminsList.map((adm) => {
                const isSuper = adm.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
                return (
                  <div
                    key={adm.email}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      isSuper
                        ? 'bg-amber-50/70 border-amber-200/90'
                        : 'bg-slate-50/80 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isSuper ? 'bg-amber-500 text-white' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {adm.email}
                          </span>
                          {isSuper ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shadow-2xs">
                              Super Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                              ადმინი
                            </span>
                          )}
                        </div>
                        {adm.addedAt && (
                          <span className="text-[10px] text-slate-400 block truncate">
                            დაემატა: {new Date(adm.addedAt).toLocaleDateString('ka-GE')}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAdmin(adm.email)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 active:scale-95 transition-all cursor-pointer shrink-0"
                        title="უფლების გაუქმება"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Registered Users & Students List */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-700" />
            <div>
              <h2 className="text-base font-black text-slate-800">
                რეგისტრირებული მომხმარებლების სია
              </h2>
              <p className="text-xs text-slate-500">
                მომხმარებელთა პროფილი, შესვლის წყარო, განრიგი და ადმინობის მართვა
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/70 self-start sm:self-auto">
            სულ: {studentsList.length} მომხმარებელი
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძებნა სახელით, გვარით, ელ-ფოსტით ან ქალაქით..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-xs font-medium text-slate-800 outline-none transition-all"
          />
        </div>

        {/* Users List */}
        {loadingStudents ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
            <span>იტვირთება რეგისტრირებული მომხმარებლების სია...</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
            მომხმარებელი ვერ მოიძებნა.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((st) => {
              const isExpanded = expandedUserId === st.userId;
              const fullName = [st.firstName, st.lastName].filter(Boolean).join(' ') || st.displayName || 'უსახელო მომხმარებელი';
              const completedCount = Object.values(st.completedSessions || {}).reduce((a, b) => a + b, 0);

              // Calculate schedule hours
              const scheduleDays = Object.entries(st.workSchedule || {}).filter(([_, hours]) => Array.isArray(hours) && hours.length > 0);
              const totalScheduledHours = scheduleDays.reduce((acc, [_, hours]) => acc + hours.length, 0);

              const isUserAdmin = isStudentAnAdmin(st);
              const isUserSuperAdmin = st.email && st.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

              return (
                <div
                  key={st.userId}
                  className="border border-slate-200/80 rounded-2xl overflow-hidden hover:border-amber-300/80 transition-all bg-white shadow-2xs"
                >
                  {/* Summary Row */}
                  <div
                    onClick={() => {
                      triggerHaptic(5);
                      setExpandedUserId(isExpanded ? null : st.userId);
                    }}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {st.photoURL ? (
                        <img
                          src={st.photoURL}
                          alt={fullName}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-300 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 font-black text-sm flex items-center justify-center ring-2 ring-amber-300 shrink-0">
                          {fullName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
                            {fullName}
                          </span>
                          {st.experienceLevel && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                              {Array.isArray(st.experienceLevel) ? st.experienceLevel.join(', ') : st.experienceLevel}
                            </span>
                          )}
                        </div>

                        {/* Email and Source line */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                          {st.email ? (
                            <span className="font-mono text-slate-700 font-semibold flex items-center gap-1">
                              <Mail className="w-3 h-3 text-amber-700" />
                              {st.email}
                            </span>
                          ) : (
                            <span className="text-amber-800/80 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200/60">
                              მეილი: პროფილში არ არის მითითებული
                            </span>
                          )}

                          {/* Login Source / საიდან შემოვიდნენ */}
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/80 font-medium">
                            <Globe className="w-3 h-3 text-slate-500" />
                            {st.authProvider === 'Google' || st.authProvider?.includes('google')
                              ? 'Google Auth'
                              : 'Google-ით შესვლა'}
                          </span>

                          {st.city && <span>• {st.city}</span>}
                          {st.region && <span>({st.region})</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right action group: Admin Toggle Button + Metric + Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Admin Toggle Button right next to user */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isUserSuperAdmin ? (
                          <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                            👑 მთავარი ადმინი
                          </span>
                        ) : isUserAdmin ? (
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-1 rounded-xl text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                              🛡️ ადმინია
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleStudentAdmin(st, false)}
                              className="px-2.5 py-1 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                              title="ადმინობიდან წაშლა"
                            >
                              ადმინობიდან წაშლა
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStudentAdmin(st, true)}
                            className="px-2.5 py-1 rounded-xl border border-purple-300 bg-gradient-to-r from-purple-50 to-amber-50 hover:bg-purple-100 text-purple-900 text-[10px] font-black transition-all active:scale-95 cursor-pointer shadow-2xs flex items-center gap-1"
                            title="ადმინად დამატება"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                            <span>ადმინად დამატება</span>
                          </button>
                        )}
                      </div>

                      {/* Completed sessions quick metric */}
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-emerald-700">
                          {completedCount} სესია
                        </span>
                        <span className="text-[10px] text-slate-400">
                          შესრულებული
                        </span>
                      </div>

                      {/* Expand / Collapse Chevron */}
                      <button
                        type="button"
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Card */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-[#fbf9f5] space-y-3.5 text-xs text-slate-700 animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Box 1: Voices */}
                        <div className="bg-white p-3 rounded-xl border border-amber-200/70 space-y-1">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Music className="w-3 h-3" /> არჩეული ხმები:
                          </span>
                          {st.voices && st.voices.length > 0 ? (
                            <div className="flex gap-1 flex-wrap pt-0.5">
                              {st.voices.map((v) => (
                                <span
                                  key={v}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">არ არის მითითებული</p>
                          )}
                        </div>

                        {/* Box 2: Work Schedule */}
                        <div className="bg-white p-3 rounded-xl border border-amber-200/70 space-y-1">
                          <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> კვირის განრიგი:
                          </span>
                          <p className="text-xs font-bold text-slate-800">
                            {totalScheduledHours > 0 ? `${totalScheduledHours} საათი/კვირაში (${scheduleDays.length} დღე)` : 'განრიგი არ არის გაწერილი'}
                          </p>
                          {scheduleDays.length > 0 && (
                            <p className="text-[10px] text-slate-500">
                              აქტიური დღეები: {scheduleDays.map(([d]) => d).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* Box 3: Sessions Progress */}
                        <div className="bg-white p-3 rounded-xl border border-amber-200/70 space-y-1">
                          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> პროგრესი:
                          </span>
                          <p className="text-xs font-black text-emerald-800">
                            {completedCount} დასრულებული სესია
                          </p>
                          {st.lastActiveAt && (
                            <p className="text-[10px] text-slate-400">
                              ბოლო აქტივობა: {new Date(st.lastActiveAt).toLocaleString('ka-GE')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Detailed Auth Info Box */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-purple-600" /> ავტორიზაციისა და შესვლის დეტალები:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-400">საიდან შემოვიდა: </span>
                            <span className="font-bold text-slate-800">Google ავტორიზაცია (OAuth 2.0)</span>
                          </div>
                          <div>
                            <span className="text-slate-400">ელ-ფოსტა: </span>
                            <span className="font-mono font-bold text-slate-800">{st.email || 'პროფილში არ არის მითითებული'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Firebase User ID: </span>
                            <code className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{st.userId}</code>
                          </div>
                          <div>
                            <span className="text-slate-400">რეგისტრაცია / ბოლო აქტივობა: </span>
                            <span className="font-bold text-slate-700">
                              {st.lastActiveAt ? new Date(st.lastActiveAt).toLocaleString('ka-GE') : (st.updatedAt ? new Date(st.updatedAt).toLocaleString('ka-GE') : 'ძველი ჩანაწერი')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Details row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                        {st.birthDate?.year && (
                          <span>დაბადების თარიღი: {st.birthDate.day || '1'}/{st.birthDate.month || '1'}/{st.birthDate.year}</span>
                        )}
                        {st.city && (
                          <span>ადგილმდებარეობა: {st.city} {st.region ? `(${st.region})` : ''}</span>
                        )}
                        {st.updatedAt && (
                          <span>პროფილის განახლება: {new Date(st.updatedAt).toLocaleDateString('ka-GE')}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
