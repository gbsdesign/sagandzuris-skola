// A student's page opened by their teacher (context/AuthContext ViewAsStudent) is open: the student's pearls and exercises
// are sung by the student only, so the microphone's buttons stay away while it is (utils/singCapture `singingSupported`).
// Kept apart, without imports, so the sign-in context does not pull the recorder into the first bundle.
let open = 0;
export const holdSinging = () => { open += 1; return () => { open -= 1; }; };
export const singingOnOthersPage = () => open > 0;
