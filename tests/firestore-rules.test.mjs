// Firestore rules check. Needs Java and the emulator: npx firebase emulators:exec --only firestore --project demo-sg
// "node tests/firestore-rules.test.mjs firestore.rules" (with firebase-tools and @firebase/rules-unit-testing installed
// next to it; firebase.json sets the emulator port 8085). Every case below must pass before publishing the rules.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  await setDoc(doc(db, 'invites', 'CODE1'), { kind: 'class', targetId: 'c1', createdBy: 'tch' });
  await setDoc(doc(db, 'invites', 'GCODE'), { kind: 'psalter', targetId: 'g1', createdBy: 'tch' });
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
await t('join without invite fails', assertFails(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }) })));
await t('join with wrong invite fails', assertFails(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }), joinCode: 'GCODE' })));
await t('join someone else fails', assertFails(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayUnion('zzz'), members: arrayUnion({ uid: 'zzz', name: 'Z' }), joinCode: 'CODE1' })));
await t('read invite', assertSucceeds(getDoc(doc(stu2, 'invites', 'CODE1'))));
await t('list invites fails', assertFails(getDocs(collection(stu2, 'invites'))));
await t('join with invite', assertSucceeds(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }), joinCode: 'CODE1', updatedAt: 'now' })));
await t('member reads class after joining', assertSucceeds(getDoc(doc(stu2, 'classes', 'c1'))));
await t('leave class', assertSucceeds(updateDoc(doc(stu2, 'classes', 'c1'), { memberIds: arrayRemove('stu2'), members: arrayRemove({ uid: 'stu2', name: 'S2' }) })));
await t('teacher creates invite for own class', assertSucceeds(setDoc(doc(tch, 'invites', 'NEW1'), { kind: 'class', targetId: 'c1', createdBy: 'tch' })));
await t('teacher cannot invite to other class', assertFails(setDoc(doc(tch, 'invites', 'NEW2'), { kind: 'class', targetId: 'c3', createdBy: 'tch' })));
await t('member cannot create invite', assertFails(setDoc(doc(stu, 'invites', 'NEW3'), { kind: 'class', targetId: 'c1', createdBy: 'stu' })));
await t('teacher writes attendance', assertSucceeds(setDoc(doc(tch, 'classes', 'c1', 'attendance', '2026-10-06'), { present: ['stu'] })));
await t('member reads attendance', assertSucceeds(getDoc(doc(stu, 'classes', 'c1', 'attendance', '2026-10-06'))));
await t('member cannot write attendance', assertFails(setDoc(doc(stu, 'classes', 'c1', 'attendance', '2026-10-07'), { present: ['stu'] })));
await t('teacher writes assignment', assertSucceeds(setDoc(doc(tch, 'classes', 'c1', 'assignments', 'a1'), { title: 'x' })));
await t('member reads assignments', assertSucceeds(getDocs(collection(stu, 'classes', 'c1', 'assignments'))));

// ---- students
await t('teacher reads own student', assertSucceeds(getDoc(doc(tch, 'students', 'stu'))));
await t('teacher cannot read other student', assertFails(getDoc(doc(tch, 'students', 'stu2'))));
await t('teacher edits path', assertSucceeds(setDoc(doc(tch, 'students', 'stu'), { selectedChantVariants: { a: 1 } }, { mergeFields: ['selectedChantVariants'] })));
await t('teacher cannot edit profile', assertFails(updateDoc(doc(tch, 'students', 'stu'), { firstName: 'x' })));
await t('teacher writes confirmations', assertSucceeds(setDoc(doc(tch, 'confirmations', 'stu'), { a: ['1'] })));
await t('teacher cannot confirm others', assertFails(setDoc(doc(tch, 'confirmations', 'stu2'), { a: ['1'] })));
await t('student reads own confirmations', assertSucceeds(getDoc(doc(stu, 'confirmations', 'stu'))));
await t('student cannot write confirmations', assertFails(setDoc(doc(stu, 'confirmations', 'stu'), { a: ['1'] })));
await t('admin lists students', assertSucceeds(getDocs(collection(adm, 'students'))));
await t('member cannot list students', assertFails(getDocs(collection(stu, 'students'))));

// ---- psalter groups
await t('teacher creates group', assertSucceeds(setDoc(doc(tch, 'psalterGroups', 'g1'), { name: 'G', teacherIds: ['tch'], teachers: [], memberIds: ['stu'], members: [{ uid: 'stu', name: 'S' }], assignment: {}, cycleDays: 2 })));
await t('member cannot create group', assertFails(setDoc(doc(stu, 'psalterGroups', 'g2'), { name: 'G', teacherIds: ['stu'], memberIds: [], members: [] })));
await t('member reads group', assertSucceeds(getDoc(doc(stu, 'psalterGroups', 'g1'))));
await t('member queries groups', assertSucceeds(getDocs(query(collection(stu, 'psalterGroups'), where('memberIds', 'array-contains', 'stu')))));
await t('outsider cannot read group', assertFails(getDoc(doc(stu2, 'psalterGroups', 'g1'))));
await t('join group with invite', assertSucceeds(updateDoc(doc(stu2, 'psalterGroups', 'g1'), { memberIds: arrayUnion('stu2'), members: arrayUnion({ uid: 'stu2', name: 'S2' }), joinCode: 'GCODE' })));
await t('member marks a kathisma', assertSucceeds(setDoc(doc(stu, 'psalterGroups', 'g1', 'cycles', '2026-10-06'), { slots: { 7: { readBy: 'stu' } }, start: '2026-10-06' }, { merge: true })));
await t('member cannot write odd fields', assertFails(setDoc(doc(stu, 'psalterGroups', 'g1', 'cycles', '2026-10-06'), { hack: 1 }, { merge: true })));
await t('outsider cannot read cycles', assertFails(getDoc(doc(stu2 === stu ? stu : as('zz', 'zz@x.ge'), 'psalterGroups', 'g1', 'cycles', '2026-10-06'))));
await t('member cannot change assignment', assertFails(updateDoc(doc(stu, 'psalterGroups', 'g1'), { assignment: { 1: ['stu'] } })));
await t('teacher changes assignment', assertSucceeds(updateDoc(doc(tch, 'psalterGroups', 'g1'), { assignment: { 1: ['stu'] } })));
await t('member leaves group', assertSucceeds(updateDoc(doc(stu2, 'psalterGroups', 'g1'), { memberIds: arrayRemove('stu2'), members: arrayRemove({ uid: 'stu2', name: 'S2' }), assignment: {} })));
await t('member renames self', assertSucceeds(updateDoc(doc(stu, 'psalterGroups', 'g1'), { members: [{ uid: 'stu', name: 'სანდრო' }] })));

// ---- settings
await t('guest reads settings', assertSucceeds(getDoc(doc(guest, 'settings', 'logo'))));
await t('teacher cannot write settings', assertFails(setDoc(doc(tch, 'settings', 'sections'), { a: 1 })));
await t('admin writes settings', assertSucceeds(setDoc(doc(adm, 'settings', 'sections'), { a: 1 })));

console.log(`\n${pass} passed, ${fail} failed`);
await env.cleanup();
process.exit(fail ? 1 : 0);
