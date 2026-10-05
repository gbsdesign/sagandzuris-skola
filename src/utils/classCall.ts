// A class's video call: one fixed Jitsi Meet room per class; the random class id keeps the room unguessable.
// It opens outside the app, because meet.jit.si cuts embedded calls after 5 minutes.
// The call starts once a teacher signs in there (Google); students join without an account.

export const classCallLink = (classId: string) => `https://meet.jit.si/SagandzurisSkola-${classId}`;

/** The room link with the class name as the call's title and the viewer's name filled in. */
export const classCallUrl = (classId: string, className: string, myName: string) =>
  `${classCallLink(classId)}#config.subject=${encodeURIComponent(JSON.stringify(className))}` +
  `&userInfo.displayName=${encodeURIComponent(JSON.stringify(myName))}`;
