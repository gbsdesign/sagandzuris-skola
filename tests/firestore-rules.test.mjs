// Firestore rules check. Needs Java and the emulator: npx firebase emulators:exec --only firestore --project demo-sg
// "node tests/firestore-rules.test.mjs firestore.rules" (with firebase-tools and @firebase/rules-unit-testing installed
// next to it; firebase.json sets the emulator port 8085). Every case below must pass before publishing the rules.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, serverTimestamp, Bytes } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const rules = readFileSync(process.argv[2], 'utf8');
const env = await initializeTestEnvironment({ projectId: 'demo-sg', firestore: { rules, host: '127.0.0.1', port: 8085 } });

const OWNER = 'mr.gabunia@gmail.com';
const as = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const owner = as('owner', OWNER);
const sup = as('sup', 'sup@x.ge');
const adm = as('adm', 'adm@x.ge');
const oldAdm = as('old', 'old@x.ge');
const tch = as('tch', 'tch@x.ge');
const tch2 = as('tch2', 'tch2@x.ge');
const stu = as('stu', 'stu@x.ge');
const stu2 = as('stu2', 'stu2@x.ge');
const fake = as('fake', 'adm2@x.ge', false);
const guest = env.unauthenticatedContext().firestore();

let pass = 0, fail = 0;
const t = async (name, p) => {
  try { await p; pass++; } catch (e) { fail++; console.log('FAIL', name, '-', e.message.split('\n')[0]); }
};

await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, 'admins', 'sup@x.ge'), { email: 'sup@x.ge', role: 'superadmin' });
  await setDoc(doc(db, 'admins', 'adm@x.ge'), { email: 'adm@x.ge', role: 'admin' });
  await setDoc(doc(db, 'admins', 'adm2@x.ge'), { email: 'adm2@x.ge', role: 'admin' });
  await setDoc(doc(db, 'admins', 'old@x.ge'), { email: 'old@x.ge' });
  await setDoc(doc(db, 'admins', 'tch@x.ge'), { email: 'tch@x.ge', role: 'teacher' });
  await setDoc(doc(db, 'admins', 'tch2@x.ge'), { email: 'tch2@x.ge', role: 'teacher' });
  await setDoc(doc(db, 'classes', 'c1'), { name: 'A', memberIds: ['stu'], members: [{ uid: 'stu', name: 'S' }], teacherIds: ['tch'], teachers: [{ uid: 'tch', name: 'T' }], program: [] });
  await setDoc(doc(db, 'classes', 'c2'), { name: 'B', memberIds: [], members: [], program: [] }); // an old class: no teacherIds
  await setDoc(doc(db, 'students', 'stu'), { userId: 'stu', teacherIds: ['tch'], selectedChantVariants: {} });
  await setDoc(doc(db, 'students', 'stu2'), { userId: 'stu2' });
  await setDoc(doc(db, 'students', 'stu3'), { userId: 'stu3' });
});

// ---- staff
await t('owner names superadmin', assertSucceeds(setDoc(doc(owner, 'admins', 'n1@x.ge'), { email: 'n1@x.ge', role: 'superadmin' })));
await t('superadmin cannot name superadmin', assertFails(setDoc(doc(sup, 'admins', 'n2@x.ge'), { email: 'n2@x.ge', role: 'superadmin' })));
await t('superadmin names admin', assertSucceeds(setDoc(doc(sup, 'admins', 'n3@x.ge'), { email: 'n3@x.ge', role: 'admin' })));
await t('admin cannot name admin', assertFails(setDoc(doc(adm, 'admins', 'n4@x.ge'), { email: 'n4@x.ge', role: 'admin' })));
await t('admin names teacher', assertSucceeds(setDoc(doc(adm, 'admins', 'n5@x.ge'), { email: 'n5@x.ge', role: 'teacher' })));
await t('old admin (no role) names teacher', assertSucceeds(setDoc(doc(oldAdm, 'admins', 'n6@x.ge'), { email: 'n6@x.ge', role: 'teacher' })));
await t('admin cannot promote teacher to admin', assertFails(updateDoc(doc(adm, 'admins', 'n5@x.ge'), { role: 'admin' })));
await t('admin cannot remove admin', assertFails(deleteDoc(doc(adm, 'admins', 'n3@x.ge'))));
await t('superadmin removes admin', assertSucceeds(deleteDoc(doc(sup, 'admins', 'n3@x.ge'))));
await t('superadmin cannot remove superadmin', assertFails(deleteDoc(doc(sup, 'admins', 'n1@x.ge'))));
await t('teacher cannot name teacher', assertFails(setDoc(doc(tch, 'admins', 'n7@x.ge'), { email: 'n7@x.ge', role: 'teacher' })));
await t('unverified e-mail is no admin', assertFails(setDoc(doc(fake, 'admins', 'n8@x.ge'), { email: 'n8@x.ge', role: 'teacher' })));
await t('member cannot list staff', assertFails(getDocs(collection(stu, 'admins'))));
await t('teacher cannot list staff', assertFails(getDocs(collection(tch, 'admins'))));
await t('admin lists staff', assertSucceeds(getDocs(collection(adm, 'admins'))));
await t('teacher reads own staff doc', assertSucceeds(getDoc(doc(tch, 'admins', 'tch@x.ge'))));
await t('nobody deletes the owner', assertFails(deleteDoc(doc(owner, 'admins', OWNER))));

// ---- classes
await t('teacher reads own class', assertSucceeds(getDoc(doc(tch, 'classes', 'c1'))));
await t('teacher queries own classes', assertSucceeds(getDocs(query(collection(tch, 'classes'), where('teacherIds', 'array-contains', 'tch')))));
await t('member queries own classes', assertSucceeds(getDocs(query(collection(stu, 'classes'), where('memberIds', 'array-contains', 'stu')))));
await t('other teacher cannot read class', assertFails(getDoc(doc(tch2, 'classes', 'c1'))));
await t('outsider cannot read old class', assertFails(getDoc(doc(stu2, 'classes', 'c2'))));
await t('teacher edits program', assertSucceeds(updateDoc(doc(tch, 'classes', 'c1'), { program: [{ title: 'x' }], schedule: [{ day: 3, start: '18:00' }] })));
await t('teacher cannot change teachers', assertFails(updateDoc(doc(tch, 'classes', 'c1'), { teacherIds: ['tch', 'tch2'] })));
await t('teacher cannot create class', assertFails(setDoc(doc(tch, 'classes', 'c9'), { name: 'X', memberIds: [], members: [], teacherIds: ['tch'] })));
await t('admin creates class', assertSucceeds(setDoc(doc(adm, 'classes', 'c3'), { name: 'X', memberIds: [], members: [], teacherIds: ['tch2'] })));
await t('member cannot edit program', assertFails(updateDoc(doc(stu, 'classes', 'c1'), { program: [] })));
await t('member cannot add themself', assertFails(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }) })));
await t('teacher adds a member', assertSucceeds(updateDoc(doc(tch, 'classes', 'c1'), { memberIds: arrayUnion('stu3'), members: arrayUnion({ uid: 'stu3', name: 'S3' }) })));
await t('teacher links to new member', assertSucceeds(setDoc(doc(tch, 'students', 'stu3'), { teacherIds: arrayUnion('tch'), teacherVia: 'c1' }, { merge: true })));
await t('teacher reads new member', assertSucceeds(getDoc(doc(tch, 'students', 'stu3'))));
await t('teacher cannot link to a non-member', assertFails(setDoc(doc(tch, 'students', 'stu2'), { teacherIds: arrayUnion('tch'), teacherVia: 'c1' }, { merge: true })));
await t('teacher cannot link a stranger teacher', assertFails(setDoc(doc(tch, 'students', 'stu3'), { teacherIds: arrayUnion('tch2'), teacherVia: 'c1' }, { merge: true })));
await t('other teacher cannot link via foreign class', assertFails(setDoc(doc(tch2, 'students', 'stu'), { teacherIds: arrayUnion('tch2'), teacherVia: 'c1' }, { merge: true })));
await t('leave class', assertSucceeds(updateDoc(doc(stu, 'classes', 'c1'), { memberIds: arrayRemove('stu'), members: arrayRemove({ uid: 'stu', name: 'S' }) })));
await t('cannot remove someone else', assertFails(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayRemove('stu3'), members: arrayRemove({ uid: 'stu3', name: 'S3' }) })));
await env.withSecurityRulesDisabled(async c => { await updateDoc(doc(c.firestore(), 'classes', 'c1'), { memberIds: arrayUnion('stu'), members: arrayUnion({ uid: 'stu', name: 'S' }) }); });
await t('writes own directory entry', assertSucceeds(setDoc(doc(stu, 'directory', 'stu'), { uid: 'stu', name: 'S', photoURL: '' })));
await t('cannot write others directory', assertFails(setDoc(doc(stu, 'directory', 'stu2'), { uid: 'stu2', name: 'X' })));
await t('directory has no extra fields', assertFails(setDoc(doc(stu, 'directory', 'stu'), { uid: 'stu', name: 'S', email: 'x' })));
await t('teacher lists directory', assertSucceeds(getDocs(collection(tch, 'directory'))));
await t('member cannot list directory', assertFails(getDocs(collection(stu, 'directory'))));
await t('teacher writes attendance', assertSucceeds(setDoc(doc(tch, 'classes', 'c1', 'attendance', '2026-10-06'), { present: ['stu'] })));
await t('teacher reads attendance', assertSucceeds(getDoc(doc(tch, 'classes', 'c1', 'attendance', '2026-10-06'))));
await t('member cannot read attendance', assertFails(getDoc(doc(stu, 'classes', 'c1', 'attendance', '2026-10-06'))));
await t('member cannot write attendance', assertFails(setDoc(doc(stu, 'classes', 'c1', 'attendance', '2026-10-07'), { present: ['stu'] })));
await t('teacher writes assignment', assertSucceeds(setDoc(doc(tch, 'classes', 'c1', 'assignments', 'a1'), { title: 'x' })));
await t('member reads assignments', assertSucceeds(getDocs(collection(stu, 'classes', 'c1', 'assignments'))));

// ---- students
await t('teacher reads own student', assertSucceeds(getDoc(doc(tch, 'students', 'stu'))));
await t('teacher cannot read other student', assertFails(getDoc(doc(tch, 'students', 'stu2'))));
await t('teacher edits path', assertSucceeds(setDoc(doc(tch, 'students', 'stu'), { selectedChantVariants: { a: 1 } }, { mergeFields: ['selectedChantVariants'] })));
await t('teacher cannot rewrite the teacher list', assertFails(updateDoc(doc(tch, 'students', 'stu'), { teacherIds: ['tch', 'tch2'], selectedChantVariants: {} })));
await t('teacher switches kids mode', assertSucceeds(updateDoc(doc(tch, 'students', 'stu'), { kidsMode: { on: true, sections: ['galoba'] } })));
await t('teacher cannot edit profile', assertFails(updateDoc(doc(tch, 'students', 'stu'), { firstName: 'x' })));
await t('teacher writes confirmations', assertSucceeds(setDoc(doc(tch, 'confirmations', 'stu'), { a: ['1'] })));
await t('teacher cannot confirm others', assertFails(setDoc(doc(tch, 'confirmations', 'stu2'), { a: ['1'] })));
await t('student reads own confirmations', assertSucceeds(getDoc(doc(stu, 'confirmations', 'stu'))));
await t('student cannot write confirmations', assertFails(setDoc(doc(stu, 'confirmations', 'stu'), { a: ['1'] })));
await t('admin lists students', assertSucceeds(getDocs(collection(adm, 'students'))));
await t('member cannot list students', assertFails(getDocs(collection(stu, 'students'))));

// ---- e-mail link sign-in: the address counts as verified, so roles work the same as with Google
const byLink = (uid, email) => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore();
const tchLink = byLink('tch', 'tch@x.ge');
const newLink = byLink('nu', 'nu@x.ge');
await t('teacher by e-mail link reads own class', assertSucceeds(getDoc(doc(tchLink, 'classes', 'c1'))));
await t('newcomer by e-mail link registers', assertSucceeds(setDoc(doc(newLink, 'students', 'nu'), { userId: 'nu', email: 'nu@x.ge' }, { merge: true })));
await t('newcomer saves first meeting', assertSucceeds(setDoc(doc(newLink, 'students', 'nu'), { profile: { firstName: 'ნინო', lastName: 'ბერიძე', voices: ['2'] }, firstMeeting: { voiceUnknown: false } }, { merge: true })));
await t('newcomer writes own directory name', assertSucceeds(setDoc(doc(newLink, 'directory', 'nu'), { uid: 'nu', firstName: 'ნინო', lastName: 'ბერიძე' }, { merge: true })));

// ---- psalter groups
await t('teacher creates group', assertSucceeds(setDoc(doc(tch, 'psalterGroups', 'g1'), { name: 'G', teacherIds: ['tch'], teachers: [], memberIds: ['stu'], members: [{ uid: 'stu', name: 'S' }], assignment: {}, cycleDays: 2 })));
await t('member cannot create group', assertFails(setDoc(doc(stu, 'psalterGroups', 'g2'), { name: 'G', teacherIds: ['stu'], memberIds: [], members: [] })));
await t('member reads group', assertSucceeds(getDoc(doc(stu, 'psalterGroups', 'g1'))));
await t('member queries groups', assertSucceeds(getDocs(query(collection(stu, 'psalterGroups'), where('memberIds', 'array-contains', 'stu')))));
await t('outsider cannot read group', assertFails(getDoc(doc(stu2, 'psalterGroups', 'g1'))));
await t('teacher adds group member', assertSucceeds(updateDoc(doc(tch, 'psalterGroups', 'g1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }) })));
await t('member marks a kathisma', assertSucceeds(setDoc(doc(stu, 'psalterGroups', 'g1', 'cycles', '2026-10-06'), { slots: { 7: { readBy: 'stu' } }, start: '2026-10-06' }, { merge: true })));
await t('member cannot write odd fields', assertFails(setDoc(doc(stu, 'psalterGroups', 'g1', 'cycles', '2026-10-06'), { hack: 1 }, { merge: true })));
await t('outsider cannot read cycles', assertFails(getDoc(doc(stu2 === stu ? stu : as('zz', 'zz@x.ge'), 'psalterGroups', 'g1', 'cycles', '2026-10-06'))));
await t('member cannot change assignment', assertFails(updateDoc(doc(stu, 'psalterGroups', 'g1'), { assignment: { 1: ['stu'] } })));
await t('teacher changes assignment', assertSucceeds(updateDoc(doc(tch, 'psalterGroups', 'g1'), { assignment: { 1: ['stu'] } })));
await t('member leaves group', assertSucceeds(updateDoc(doc(stu2, 'psalterGroups', 'g1'), { memberIds: arrayRemove('stu2'), members: arrayRemove({ uid: 'stu2', name: 'S2' }), assignment: {} })));
await t('member renames self', assertSucceeds(updateDoc(doc(stu, 'psalterGroups', 'g1'), { members: [{ uid: 'stu', name: 'სანდრო' }] })));

// ---- private chats: a teacher and a student of their class (class c9: teacher tch2, members stu3 and stu2)
await env.withSecurityRulesDisabled(async c => {
  await setDoc(doc(c.firestore(), 'classes', 'c9'), { name: 'D', memberIds: ['stu3', 'stu2'], members: [], teacherIds: ['tch2'], teachers: [], program: [] });
});
const stu3 = as('stu3', 'stu3@x.ge');
const dm = (extra = {}) => ({
  members: ['tch2', 'stu3'], teacherUid: 'tch2', studentUid: 'stu3', classId: 'c9', room: 'r', names: {}, photos: {},
  createdAt: serverTimestamp(), lastAt: null, lastBy: '', lastText: '', read: {}, callAt: null, callBy: '', ...extra,
});
const msg = (uid, teacher, kind = 'text') => ({ uid, name: 'x', photoURL: '', teacher, kind, text: 'hi', createdAt: serverTimestamp() });
await t('teacher lists self: name and photo', assertSucceeds(setDoc(doc(tch2, 'teachers', 'tch2'), { name: 'T2', photoURL: '', updatedAt: 'now' })));
await t('teacher entry holds no e-mail', assertFails(setDoc(doc(tch2, 'teachers', 'tch2'), { name: 'T2', photoURL: '', email: 'tch2@x.ge' })));
await t('member cannot list self as teacher', assertFails(setDoc(doc(stu3, 'teachers', 'stu3'), { name: 'S3', photoURL: '' })));
await t('member reads teachers', assertSucceeds(getDoc(doc(stu3, 'teachers', 'tch2'))));
await t('student checks a chat not made yet', assertSucceeds(getDoc(doc(stu3, 'dms', 'tch2_stu3'))));
await t('student cannot open chat with a teacher not theirs', assertFails(setDoc(doc(stu3, 'dms', 'tch_stu3'), dm({ members: ['tch', 'stu3'], teacherUid: 'tch' }))));
await t('chat id must match its two people', assertFails(setDoc(doc(stu3, 'dms', 'zz_stu3'), dm())));
await t('two students cannot chat', assertFails(setDoc(doc(stu3, 'dms', 'stu2_stu3'), dm({ members: ['stu2', 'stu3'], teacherUid: 'stu2' }))));
await t('student opens chat with own teacher', assertSucceeds(setDoc(doc(stu3, 'dms', 'tch2_stu3'), dm())));
await t('student writes to own teacher', assertSucceeds(setDoc(doc(stu3, 'dms', 'tch2_stu3', 'messages', 'm1'), msg('stu3', false))));
await t('student cannot pose as teacher', assertFails(setDoc(doc(stu3, 'dms', 'tch2_stu3', 'messages', 'm2'), msg('stu3', true))));
await t('student cannot start a call', assertFails(setDoc(doc(stu3, 'dms', 'tch2_stu3', 'messages', 'm3'), msg('stu3', false, 'call'))));
await t('teacher answers', assertSucceeds(setDoc(doc(tch2, 'dms', 'tch2_stu3', 'messages', 'm4'), msg('tch2', true))));
await t('teacher starts a call', assertSucceeds(setDoc(doc(tch2, 'dms', 'tch2_stu3', 'messages', 'm5'), msg('tch2', true, 'call'))));
await t('student marks own reading', assertSucceeds(updateDoc(doc(stu3, 'dms', 'tch2_stu3'), { 'read.stu3': serverTimestamp() })));
await t("student cannot mark teacher's reading", assertFails(updateDoc(doc(stu3, 'dms', 'tch2_stu3'), { 'read.tch2': serverTimestamp() })));
await t('member lists own chats', assertSucceeds(getDocs(query(collection(stu3, 'dms'), where('members', 'array-contains', 'stu3')))));
await t('another student cannot read the chat', assertFails(getDoc(doc(stu2, 'dms', 'tch2_stu3'))));
await t('another student cannot read its messages', assertFails(getDoc(doc(stu2, 'dms', 'tch2_stu3', 'messages', 'm1'))));
await t('another teacher cannot read the chat', assertFails(getDoc(doc(tch, 'dms', 'tch2_stu3'))));
await t('admin cannot read the chat', assertFails(getDoc(doc(adm, 'dms', 'tch2_stu3'))));
await t('superadmin reads the chat', assertSucceeds(getDoc(doc(sup, 'dms', 'tch2_stu3', 'messages', 'm1'))));
await t('superadmin lists every chat', assertSucceeds(getDocs(collection(owner, 'dms'))));
await t('superadmin cannot write in the chat', assertFails(setDoc(doc(sup, 'dms', 'tch2_stu3', 'messages', 'm6'), msg('sup', false))));
await env.withSecurityRulesDisabled(async c => {
  await updateDoc(doc(c.firestore(), 'classes', 'c9'), { memberIds: ['stu2'] });
});
await t('student who left the class cannot write', assertFails(setDoc(doc(stu3, 'dms', 'tch2_stu3', 'messages', 'm7'), msg('stu3', false))));

// ---- settings
await t('guest reads settings', assertSucceeds(getDoc(doc(guest, 'settings', 'logo'))));
await t('teacher cannot write settings', assertFails(setDoc(doc(tch, 'settings', 'sections'), { a: 1 })));
await t('admin writes settings', assertSucceeds(setDoc(doc(adm, 'settings', 'sections'), { a: 1 })));

// ---- admission of new members
const ask = { status: 'pending', features: [], requestedAt: 'x', attempts: 1, lastAttemptAt: 'x' };
await t('newcomer asks to be let in', assertSucceeds(setDoc(doc(stu2, 'memberAccess', 'stu2'), ask)));
await t('newcomer cannot let themself in', assertFails(setDoc(doc(stu3, 'memberAccess', 'stu3'), { ...ask, status: 'approved', features: 'all' })));
await t('newcomer cannot give themself features', assertFails(setDoc(doc(stu3, 'memberAccess', 'stu3'), { ...ask, features: ['galoba'] })));
await t('nobody asks for another', assertFails(setDoc(doc(stu, 'memberAccess', 'stu3'), ask)));
await t('member counts own visits', assertSucceeds(updateDoc(doc(stu2, 'memberAccess', 'stu2'), { attempts: 2, lastAttemptAt: 'y' })));
await t('member cannot change own status', assertFails(updateDoc(doc(stu2, 'memberAccess', 'stu2'), { status: 'approved' })));
await t('member cannot delete own request', assertFails(deleteDoc(doc(stu2, 'memberAccess', 'stu2'))));
await t('member reads own access', assertSucceeds(getDoc(doc(stu2, 'memberAccess', 'stu2'))));
await t('member cannot read another\'s access', assertFails(getDoc(doc(stu, 'memberAccess', 'stu2'))));
await t('admin cannot list requests', assertFails(getDocs(collection(adm, 'memberAccess'))));
await t('superadmin lists requests', assertSucceeds(getDocs(collection(sup, 'memberAccess'))));
await t('superadmin lets in', assertSucceeds(updateDoc(doc(sup, 'memberAccess', 'stu2'), { status: 'approved', features: ['galoba'] })));
await t('owner refuses', assertSucceeds(updateDoc(doc(owner, 'memberAccess', 'stu2'), { status: 'rejected', features: [] })));
await t('superadmin writes who decided', assertSucceeds(setDoc(doc(sup, 'accessDecisions', 'stu2'), { by: 'sup@x.ge' })));
await t('member cannot read who decided', assertFails(getDoc(doc(stu2, 'accessDecisions', 'stu2'))));
await t('admin cannot read who decided', assertFails(getDoc(doc(adm, 'accessDecisions', 'stu2'))));

// ---- birthdays: the day and month for every admitted member, the year for staff only
const bday = (u, extra = {}) => ({ uid: u, name: 'ანა ბერიძე', photoURL: '', month: 10, day: 27, updatedAt: 'x', ...extra });
await t('member writes own birthday', assertSucceeds(setDoc(doc(stu, 'birthdays', 'stu'), bday('stu'))));
await t('member cannot write another birthday', assertFails(setDoc(doc(stu, 'birthdays', 'stu3'), bday('stu3'))));
await t('a birthday keeps no year', assertFails(setDoc(doc(stu, 'birthdays', 'stu'), bday('stu', { year: 1990 }))));
await t('a birthday month is 1–12', assertFails(setDoc(doc(stu, 'birthdays', 'stu'), bday('stu', { month: 13 }))));
await t('member reads the birthdays', assertSucceeds(getDocs(collection(stu, 'birthdays'))));
await t('refused member cannot read the birthdays', assertFails(getDocs(collection(stu2, 'birthdays'))));
await t('guest cannot read the birthdays', assertFails(getDocs(collection(guest, 'birthdays'))));
await t('member writes own birth year', assertSucceeds(setDoc(doc(stu, 'birthYears', 'stu'), { year: 1990, updatedAt: 'x' })));
await t('member cannot read birth years', assertFails(getDocs(collection(stu, 'birthYears'))));
await t('member cannot write another birth year', assertFails(setDoc(doc(stu, 'birthYears', 'stu3'), { year: 1990, updatedAt: 'x' })));
await t('teacher reads birth years', assertSucceeds(getDocs(collection(tch, 'birthYears'))));
await t('admin corrects a birthday', assertSucceeds(setDoc(doc(adm, 'birthdays', 'stu3'), bday('stu3'))));

// ---- „ოსტატობა“: the class's lessons and each member's steps done
await t('teacher writes a lesson', assertSucceeds(setDoc(doc(tch, 'classes', 'c1', 'lessons', 'l1'), { title: 'L', steps: [], order: 0 })));
await t('member reads the lessons', assertSucceeds(getDocs(collection(stu, 'classes', 'c1', 'lessons'))));
await t('member cannot write a lesson', assertFails(setDoc(doc(stu, 'classes', 'c1', 'lessons', 'l2'), { title: 'X', steps: [], order: 1 })));
await t('outsider cannot read the lessons', assertFails(getDocs(collection(stu2, 'classes', 'c1', 'lessons'))));
await t('member marks own steps', assertSucceeds(setDoc(doc(stu, 'classes', 'c1', 'lessonProgress', 'stu'), { done: { l1: ['a'] }, updatedAt: 'x' })));
await t('member cannot mark for another', assertFails(setDoc(doc(stu, 'classes', 'c1', 'lessonProgress', 'stu2'), { done: {}, updatedAt: 'x' })));
await t('teacher reads the progress', assertSucceeds(getDocs(collection(tch, 'classes', 'c1', 'lessonProgress'))));
await t("member cannot read the others' progress", assertFails(getDocs(collection(stu, 'classes', 'c1', 'lessonProgress'))));

// ---- the pearls game: the member's own tries, the teacher's approval, the kept takes
const take = (score = 85) => ({ audio: Bytes.fromUint8Array(new Uint8Array(2000)), mime: 'audio/mpeg', score, voice: '1', at: 'x' });
await t('member saves own pearls', assertSucceeds(setDoc(doc(stu, 'students', 'stu'), { pearls: { 'v-5-x58': { best: 85, voice: '1', at: 'x' } } }, { merge: true })));
await t('member cannot write own manera marks', assertFails(updateDoc(doc(stu, 'students', 'stu'), { maneraReview: { a: 1 } })));
await t('member cannot lift own marking lock', assertFails(setDoc(doc(stu, 'students', 'stu'), { marksLock: false }, { merge: true })));
await t('member cannot delete own record', assertFails(deleteDoc(doc(stu, 'students', 'stu'))));
await t('member cannot approve own pearl', assertFails(setDoc(doc(stu, 'students', 'stu'), { pearlShine: { 'v-5-x58': { voice: '1', by: 'stu', at: 'x' } } }, { merge: true })));
await t('teacher approves a pearl', assertSucceeds(setDoc(doc(tch, 'students', 'stu'), { pearlShine: { 'v-5-x58': { voice: '1', by: 'tch', at: 'x' } }, updatedAt: 'x' }, { merge: true })));
await t("teacher cannot change the member's pearls", assertFails(setDoc(doc(tch, 'students', 'stu'), { pearls: { 'v-5-x58': { best: 100, voice: '1', at: 'x' } } }, { merge: true })));
await t('member keeps a take', assertSucceeds(setDoc(doc(stu, 'pearlTakes', 'stu', 'takes', 'v-5-x58'), take())));
await t('member cannot keep a take for another', assertFails(setDoc(doc(stu, 'pearlTakes', 'stu2', 'takes', 'v-5-x58'), take())));
await t('a take must be sound bytes', assertFails(setDoc(doc(stu, 'pearlTakes', 'stu', 'takes', 'v-7-x59'), { ...take(), audio: 'x' })));
await t('a take stays small', assertFails(setDoc(doc(stu, 'pearlTakes', 'stu', 'takes', 'v-7-x59'), { ...take(), audio: Bytes.fromUint8Array(new Uint8Array(700000)) })));
await t("the member's teacher hears the takes", assertSucceeds(getDocs(collection(tch, 'pearlTakes', 'stu', 'takes'))));
await t('another teacher does not', assertFails(getDocs(collection(tch2, 'pearlTakes', 'stu', 'takes'))));
await t('another member does not', assertFails(getDocs(collection(stu2, 'pearlTakes', 'stu', 'takes'))));

// ---- „ქართული კაბა“'s pictures
const pic = () => ({ image: Bytes.fromUint8Array(new Uint8Array(3000)), mime: 'image/webp', w: 480, h: 853, at: 'x' });
await t('owner keeps a kaba picture', assertSucceeds(setDoc(doc(owner, 'samosiArt', 'kaba-full'), pic())));
await t('owner publishes the kaba', assertSucceeds(setDoc(doc(owner, 'samosiArt', 'kaba'), { published: true, at: 'x', by: OWNER })));
await t('a member cannot change the kaba pictures', assertFails(setDoc(doc(stu, 'samosiArt', 'kaba-full'), pic())));
await t('an admin cannot publish the kaba', assertFails(setDoc(doc(adm, 'samosiArt', 'kaba'), { published: false })));
await t('a kaba picture must be bytes', assertFails(setDoc(doc(owner, 'samosiArt', 'kaba-x'), { ...pic(), image: 'x' })));
await t('a guest sees the kaba pictures', assertSucceeds(getDoc(doc(guest, 'samosiArt', 'kaba-full'))));
await t('a member ticks kaba parts', assertSucceeds(setDoc(doc(stu, 'students', 'stu'), { kaba: ['kaba'], samosiOutfit: 'kaba' }, { merge: true })));

// ---- „ანგელოზის დღე“
const nd = (uid, extra = {}) => ({ uid, name: 'S', photoURL: '', month: 1, day: 27, saint: 'წმიდა ნინო', updatedAt: 'x', ...extra });
await t('member chooses own name day', assertSucceeds(setDoc(doc(stu, 'nameDays', 'stu'), nd('stu'))));
await t("member cannot choose another's name day", assertFails(setDoc(doc(stu, 'nameDays', 'stu2'), nd('stu2'))));
await t('a name day has only its fields', assertFails(setDoc(doc(stu, 'nameDays', 'stu'), nd('stu', { phone: '1' }))));
await t('a member reads the name days', assertSucceeds(getDocs(collection(stu, 'nameDays'))));
await t('a refused member does not', assertFails(getDocs(collection(stu2, 'nameDays'))));
await t('a guest does not', assertFails(getDocs(collection(guest, 'nameDays'))));
await t('member clears own name day', assertSucceeds(deleteDoc(doc(stu, 'nameDays', 'stu'))));

// „ოსტატობა“: a member's exercise recording for their teachers; the last day done on their own record
const drillTake = { audio: Bytes.fromUint8Array(new Uint8Array([1, 2, 3])), mime: 'audio/mpeg', seconds: 12, at: '2026-10-27T10:00:00Z' };
await t('member sends own exercise take', assertSucceeds(setDoc(doc(stu, 'drillTakes', 'stu', 'takes', 'ear-fifth'), drillTake)));
await t('member cannot write another one\'s take', assertFails(setDoc(doc(stu2, 'drillTakes', 'stu', 'takes', 'ear-fifth'), drillTake)));
await t('take with extra fields refused', assertFails(setDoc(doc(stu, 'drillTakes', 'stu', 'takes', 'ear-unison'), { ...drillTake, score: 1 })));
await t('member\'s teacher hears the take', assertSucceeds(getDoc(doc(tch, 'drillTakes', 'stu', 'takes', 'ear-fifth'))));
await t('another teacher cannot hear it', assertFails(getDoc(doc(tch2, 'drillTakes', 'stu', 'takes', 'ear-fifth'))));
await t('teacher cannot change the take', assertFails(setDoc(doc(tch, 'drillTakes', 'stu', 'takes', 'ear-fifth'), drillTake)));
await t('member marks an exercise done', assertSucceeds(setDoc(doc(stu, 'students', 'stu'), { drillDone: { 'ear-fifth': '2026-10-27' } }, { merge: true })));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
