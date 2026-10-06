// A class's video call: one fixed Jitsi Meet room per class; the random class id keeps the room unguessable.
// A teacher's private call with a student: one room per pair, named by a random key kept in the pair's
// private chat (dms/{id}.room), which only the two of them can read.
// Calls open outside the app, because meet.jit.si cuts embedded calls after 5 minutes.
// The call starts once a teacher signs in there (Google); students join without an account.

export const classCallLink = (classId: string) => `https://meet.jit.si/SagandzurisSkola-${classId}`;

/** a room link with the call's title and the viewer's name filled in */
const withNames = (link: string, title: string, myName: string) =>
  `${link}#config.subject=${encodeURIComponent(JSON.stringify(title))}` +
  `&userInfo.displayName=${encodeURIComponent(JSON.stringify(myName))}`;

/** The room link with the class name as the call's title and the viewer's name filled in. */
export const classCallUrl = (classId: string, className: string, myName: string) =>
  withNames(classCallLink(classId), className, myName);

/** A private call's room, titled with the two names. */
export const privateCallUrl = (room: string, title: string, myName: string) =>
  withNames(`https://meet.jit.si/SagandzurisSkola-pm-${room}`, title, myName);
