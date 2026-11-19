// Steps of the class area in the new look (redesign stage 4c). The pages `class`, `student` and `psalter` keep their open
// part in the navigation's `mapItem` (NavigationContext MAP_PAGES), so the phone's back walks them in order.
//   class:    (none) the class page · `order` its program's order (x-klasi-programa-dalageba) · `ai-report` the AI's week
//             (x-ai-angarishi) · `ai-note` the instruction to the AI (x-ai-mititeba)
//   student:  `<uid>|<classId>` the student's page (x-mostsavle) · `…|gza` the chants learned (x-mostsavle-gza)
//             · `…|ostatoba` the mastery's marks (x-mostsavle-ostatoba)
//   psalter:  (none) the group (x-psalmuni) · `dist` who reads which kanon (x-psalmuni-ganatsileba) · `history` (x-psalmuni-istoria)

export const CLASS_ORDER = 'order';
/** the AI teacher's tools: the week's report and the teacher's instruction (src/pages/v2/aiklasi) */
export const AI_REPORT = 'ai-report';
export const AI_NOTE = 'ai-note';
/** the AI's lesson prepared from a program chant's notes (x-ai-avto): `ai-prep/<variantId>` */
export const AI_PREP = 'ai-prep/';
export const prepItem = (variantId: string) => `${AI_PREP}${variantId}`;

export type StudentSub = 'gza' | 'ostatoba';
export const studentItem = (uid: string, classId: string, sub?: StudentSub) => `${uid}|${classId}${sub ? `|${sub}` : ''}`;
export const parseStudentItem = (item: string | null | undefined): { uid: string; classId: string; sub: StudentSub | null } | null => {
  if (!item) return null;
  const [uid, classId = '', sub] = item.split('|');
  if (!uid) return null;
  return { uid, classId, sub: sub === 'gza' || sub === 'ostatoba' ? sub : null };
};

/** the class page's tab kept for the visit (ClassScreen reads it; „მკითხე“ opens the class on a tab with it) */
export type ClassTab = 'program' | 'chat' | 'people';
export const CLASS_TAB_KEY = 'sg-class-tab:';
export const keepClassTab = (classId: string, tab: ClassTab) => {
  try { sessionStorage.setItem(CLASS_TAB_KEY + classId, tab); } catch { /* private window: the page opens on its first tab */ }
};
/** the same, and a class page open now turns to that tab at once (ClassScreen listens) */
export const CLASS_TAB_EVENT = 'sg-class-tab';
export const askClassTab = (classId: string, tab: ClassTab) => {
  keepClassTab(classId, tab);
  window.dispatchEvent(new CustomEvent<{ classId: string; tab: ClassTab }>(CLASS_TAB_EVENT, { detail: { classId, tab } }));
};

export const PSALTER_DIST = 'dist';
export const PSALTER_HISTORY = 'history';
