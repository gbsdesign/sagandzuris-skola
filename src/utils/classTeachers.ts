// Who may read a member's record: students/{uid}.teacherIds is the teachers of the classes the member is in
// (firestore.rules, teachesMe). These say what that list should be, so it can shrink as well as grow
// (2026-10-28: before, a teacher taken off a class or a member taken out kept the access for good).

export interface ClassTeachers {
  id: string;
  memberIds: string[];
  teacherIds: string[];
  archived?: boolean;
}

/** The teachers of every class (not put away in the archive) the member is in. */
export const teachersOf = (uid: string, classes: ClassTeachers[]): string[] =>
  [...new Set(classes.filter(c => !c.archived && c.memberIds.includes(uid)).flatMap(c => c.teacherIds))].sort();

/** The member has just left `cls`: its teachers who lead none of the member's other classes (of those known). */
export const teachersToDrop = (uid: string, cls: ClassTeachers, classes: ClassTeachers[]): string[] => {
  const keep = new Set(teachersOf(uid, classes.filter(c => c.id !== cls.id)));
  return cls.teacherIds.filter(t => !keep.has(t));
};

/** The record's list differs from what the classes give (in either direction). */
export const teachersDiffer = (now: string[] | undefined, should: string[]) => {
  const a = new Set(now || []);
  return a.size !== should.length || should.some(t => !a.has(t));
};
