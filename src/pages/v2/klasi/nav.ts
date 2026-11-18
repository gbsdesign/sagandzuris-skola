// Steps of the class area in the new look (redesign stage 4c). The pages `class`, `student` and `psalter` keep their open
// part in the navigation's `mapItem` (NavigationContext MAP_PAGES), so the phone's back walks them in order.
//   class:    (none) the class page · `order` its program's order (x-klasi-programa-dalageba)
//   student:  `<uid>|<classId>` the student's page (x-mostsavle) · `…|gza` the chants learned (x-mostsavle-gza)
//             · `…|ostatoba` the mastery's marks (x-mostsavle-ostatoba)
//   psalter:  (none) the group (x-psalmuni) · `dist` who reads which kanon (x-psalmuni-ganatsileba) · `history` (x-psalmuni-istoria)

export const CLASS_ORDER = 'order';

export type StudentSub = 'gza' | 'ostatoba';
export const studentItem = (uid: string, classId: string, sub?: StudentSub) => `${uid}|${classId}${sub ? `|${sub}` : ''}`;
export const parseStudentItem = (item: string | null | undefined): { uid: string; classId: string; sub: StudentSub | null } | null => {
  if (!item) return null;
  const [uid, classId = '', sub] = item.split('|');
  if (!uid) return null;
  return { uid, classId, sub: sub === 'gza' || sub === 'ostatoba' ? sub : null };
};

export const PSALTER_DIST = 'dist';
export const PSALTER_HISTORY = 'history';
