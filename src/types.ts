export interface StudentProfile {
  firstName: string;
  lastName: string;
  birthDate: {
    year: number;
    month: number;
    day: number;
  };
  region: string;
  city: string;
  experienceLevel: string | string[];
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
