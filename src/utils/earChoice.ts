// Which ear the microphone listens with (AI teacher 2.0, stage 1): the new one (utils/ear.ts) for the people its switch
// `newEar` is open for — admins first, everyone once the school opens it (data/sections EXTRA_SWITCHES) — and the first
// one (utils/earOld.ts) for the rest. App.tsx reads the switch (useAccess) and sets it here, so utils/singCapture.ts can
// follow without the access hooks.

let on = false;

export const setNewEar = (v: boolean) => { on = v; };
export const newEarOn = () => on;
