import type { PageType } from '../context/NavigationContext';

// The app's sections, as the home vine and the header show them. Used by:
// • the admin's section switches (settings/sections: open, "მალე" or hidden),
// • the kids' mode a teacher turns on for a student (only the chosen sections show),
// • the home buttons ("ჩემი ღილაკები").
export type SectionId =
  | 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'medavitneoba' | 'chvevebi' | 'tamashebi' | 'tsinaprebi'
  | 'gza' | 'biblioteka';

export interface SectionDef {
  id: SectionId;
  label: string;
  page?: PageType;     // where it leads (none: not built yet)
  hint?: string;
}

export const SECTIONS: SectionDef[] = [
  { id: 'galoba', label: 'გალობა', page: 'galoba' },
  { id: 'simghera', label: 'სიმღერა', page: 'simghera' },
  { id: 'mtkmeli', label: 'მთქმელი', page: 'mtkmeli' },
  { id: 'sakravebi', label: 'საკრავები', page: 'sakravebi' },
  { id: 'medavitneoba', label: 'მედავითნეობა', page: 'psalter', hint: 'ფსალმუნთა ჯგუფი' },
  { id: 'chvevebi', label: 'ჩვევები', page: 'gz', hint: 'ლოცვები ჩვევებიდან იხსნება' },
  { id: 'tamashebi', label: 'თამაშები', hint: 'ჯერ მზადდება' },
  { id: 'tsinaprebi', label: 'გაიცანი წინაპრები', page: 'tsinaprebi' },
  { id: 'gza', label: 'საგანძურის გზა', page: 'gz' },
  { id: 'biblioteka', label: 'ბიბლიოთეკა', page: 'biblioteka' },
];

export const sectionOfPage = (page: PageType): SectionId | null => {
  if (page === 'galoba') return 'galoba';
  if (page === 'psalter') return 'medavitneoba';
  const s = SECTIONS.find(x => x.page === page && x.id !== 'chvevebi');
  return s ? s.id : null;
};

export type SectionState = 'open' | 'soon' | 'hidden';

/** Without the admin's settings: everything built is open, games are "მალე". */
export const DEFAULT_SECTION_STATE: Record<SectionId, SectionState> = {
  galoba: 'open', simghera: 'open', mtkmeli: 'open', sakravebi: 'open', medavitneoba: 'open',
  chvevebi: 'open', tamashebi: 'soon', tsinaprebi: 'open', gza: 'open', biblioteka: 'open',
};

/** A kids' mode starts with these sections (the admin may choose others in settings/sections). */
export const DEFAULT_KIDS_SECTIONS: SectionId[] = ['galoba', 'simghera', 'sakravebi', 'chvevebi', 'gza'];

export interface KidsMode {
  on: boolean;
  sections: SectionId[];
  by?: string;
  at?: string;
}
