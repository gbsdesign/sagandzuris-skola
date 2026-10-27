import type { PageType } from '../context/NavigationContext';

// The app's sections, as the home vine and the header show them. Used by:
// • the admin's section switches (settings/sections: open, "მალე" or hidden),
// • the kids' mode a teacher turns on for a student (only the chosen sections show),
// • the home buttons ("ჩემი ღილაკები").
export type SectionId =
  | 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'medavitneoba' | 'medavitneobaTopic' | 'chvevebi' | 'tamashebi' | 'tsinaprebi'
  | 'gza' | 'biblioteka' | 'margalitebi';

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
  { id: 'medavitneoba', label: 'ფსალმუნთა ჯგუფი', page: 'psalter', hint: 'ერთად ვკითხულობთ ფსალმუნს' },
  // „მედავითნეობა“ on the vine: a topic of its own, not built yet (the psalter group keeps the old id)
  { id: 'medavitneobaTopic', label: 'მედავითნეობა', hint: 'ჯერ მზადდება' },
  { id: 'chvevebi', label: 'ჩვევები', page: 'gz', hint: 'ლოცვები ჩვევებიდან იხსნება' },
  { id: 'tamashebi', label: 'თამაშები', page: 'games', hint: 'მუსიკალური · ქართული · ცოცხალი' },
  // the pearls game: a game of the hub with a switch of its own (its feature is the games' one)
  { id: 'margalitebi', label: 'მარგალიტები', page: 'pearls', hint: 'მოისმინე, იმღერე, გააპრიალე' },
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

/** Without the admin's settings: everything built is open; the pearls game (until the admin opens it), the psalter group and
 *  მედავითნეობა are "მალე". */
export const DEFAULT_SECTION_STATE: Record<SectionId, SectionState> = {
  galoba: 'open', simghera: 'open', mtkmeli: 'open', sakravebi: 'open', medavitneoba: 'soon', medavitneobaTopic: 'soon',
  chvevebi: 'open', tamashebi: 'open', margalitebi: 'soon', tsinaprebi: 'open', gza: 'open', biblioteka: 'open',
};

/** A kids' mode starts with these sections (the admin may choose others in settings/sections). */
export const DEFAULT_KIDS_SECTIONS: SectionId[] = ['galoba', 'simghera', 'sakravebi', 'chvevebi', 'gza'];

export interface KidsMode {
  on: boolean;
  sections: SectionId[];
  by?: string;
  at?: string;
}
