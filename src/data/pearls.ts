// The pearls game (redesign stage 7): chests of chants, each chant a pearl. A member listens to the chant's first
// phrase, sings it back into the microphone, and the pearl is polished when the phrase was sung right
// (utils/pitch.ts); it shines when a teacher has heard it and approved it.

export interface Chest {
  id: string;
  title: string;
  sub: string;
  pearls: string[]; // chant version ids (data/chantLookup.ts findVersion)
}

export const CHESTS: Chest[] = [
  {
    id: 'v9-58-77',
    title: 'პირველი სკივრი',
    sub: 'წირვის საგალობლები, IX ტომი, №58–77',
    pearls: [
      'v-5-x58', 'v-7-x59', 'v-8-x60', 'v-10-x61', 'v-12-x62', 'v-12-x63', 'v-20-x64', 'v-21-x65', 'v-28-x66', 'v-29-x67',
      'v-30-x68', 'v-32-x69', 'v-33-x70', 'v-36-x71', 'v-36-x72', 'v-35-x73', 'v-37-x74', 'v-41-x75', 'v-39-x76', 'v-45-x77',
    ],
  },
];
