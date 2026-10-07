export interface StudentProfile {
  firstName: string;
  lastName: string;
  churchName?: string; // the name for the commemoration lists (psalter group); empty = the first name
  birthDate: {
    year: number;
    month: number;
    day: number;
  };
  region: string;
  city: string;
  phone?: string; // "+995…" (utils/profileFields normalizePhone)
  experienceLevel: string | string[]; // the old „სტატუსი“ (before abilities and interests)
  abilities?: string[];      // utils/profileFields ABILITY_OPTIONS
  abilityOther?: string;
  instruments?: string[];    // data/instrumentsData ids
  chantPlace?: string;       // where they chant
  interests?: string[];      // INTEREST_OPTIONS
  interestOther?: string;
  voices: ('1' | '2' | '3')[];
  workSchedule: {
    [day: string]: string; // e.g. { 'ორშ': '10:00 - 12:00', ... }
  };
}

export interface SoilTask {
  title: string;
  description: string;
  isCompleted: boolean;
}

export interface FoundationItem {
  techniqueName: string;
  progressPercentage: number;
  advice: string;
}

export interface RepertoireItem {
  chantName: string;
  category: string;
  status: 'learned' | 'in_progress' | 'to_learn';
}

export interface StudentBookmark {
  profile: StudentProfile;
  tasks: SoilTask[];
  foundation: FoundationItem[];
  repertoire: RepertoireItem[];
}

export interface AudioLoopState {
  loopStart: number | null;
  loopEnd: number | null;
  isLoopActive: boolean;
}

export type PlaybackSpeed = 0.5 | 0.75 | 0.9 | 1.0 | 1.25;

export interface AudioCacheStatus {
  isCached: boolean;
  isDownloading: boolean;
}
