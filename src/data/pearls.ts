// The pearls game (redesign stage 7): chests of chants, each chant a pearl. A member listens to the chant's first
// phrase, sings it back into the microphone, and the pearl is polished when the phrase was sung right
// (utils/pitch.ts); it shines when a teacher has heard it and approved it. Every pearl is sung in three voices: one
// polished in all three turns golden.

export interface Chest {
  id: string;
  title: string;
  label: string; // the chest's short name on its card (the service)
  sub: string;
  pearls: string[]; // chant version ids (data/chantLookup.ts findVersion)
}

export const CHESTS: Chest[] = [
  {
    id: 'v9-58-77',
    title: 'პირველი სკივრი',
    label: 'წირვა',
    sub: 'წირვის საგალობლები, IX ტომი, №58–77',
    pearls: [
      'v-5-x58', 'v-7-x59', 'v-8-x60', 'v-10-x61', 'v-12-x62', 'v-12-x63', 'v-20-x64', 'v-21-x65', 'v-28-x66', 'v-29-x67',
      'v-30-x68', 'v-32-x69', 'v-33-x70', 'v-36-x71', 'v-36-x72', 'v-35-x73', 'v-37-x74', 'v-41-x75', 'v-39-x76', 'v-45-x77',
    ],
  },
  // vespers and matins from vol. I (Gelati school), the first version of each chant, in the service's order
  {
    id: 'v1-mwukhri',
    title: 'მეორე სკივრი',
    label: 'მწუხრი',
    sub: 'მწუხრის საგალობლები, I ტომი, №1–76',
    pearls: [
      'mw-v-1-1', 'mw-v-2-1', 'mw-v-3-1', 'mw-v-4-1', 'mw-v-5-1', 'mw-v-6-1', 'mw-v-7-1', 'mw-v-8-1', 'mw-v-10-1', 'mw-v-12-1',
      'mw-v-13-1', 'mw-v-14-1', 'mw-v-15-1', 'mw-v-16-1', 'mw-v-17-1', 'mw-v-18-1', 'mw-v-19-1', 'mw-v-20-1', 'mw-v-21-1', 'mw-v-22-1',
    ],
  },
  {
    id: 'v1-ciskari',
    title: 'მესამე სკივრი',
    label: 'ცისკარი',
    sub: 'ცისკრის საგალობლები, I ტომი, №77–142',
    pearls: [
      'ck-v-1-1', 'ck-v-2-1', 'ck-v-3-1', 'ck-v-4-1', 'ck-v-5-1', 'ck-v-6-1', 'ck-v-7-1', 'ck-v-9-1', 'ck-v-11-1', 'ck-v-15-2',
      'ck-v-16-1', 'ck-v-18-1', 'ck-v-19-2', 'ck-v-20-1', 'ck-v-21-1', 'ck-v-23-1', 'ck-v-24-1', 'ck-v-25-1', 'ck-v-26-1', 'ck-v-29-1',
    ],
  },
];

/** The chest a pearl lies in. */
export const chestOf = (id: string) => CHESTS.find(c => c.pearls.includes(id));
