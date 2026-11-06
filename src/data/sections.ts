import type { PageType } from '../context/NavigationContext';

// The app's sections, as the home vine and the header show them. Used by:
// • the admin's section switches (settings/sections: open, "მალე" or hidden),
// • the kids' mode a teacher turns on for a student (only the chosen sections show),
// • the home buttons ("ჩემი ღილაკები").
export type SectionId =
  | 'galoba' | 'simghera' | 'mtkmeli' | 'sakravebi' | 'medavitneoba' | 'medavitneobaTopic' | 'chvevebi' | 'tamashebi' | 'tsinaprebi'
  | 'gza' | 'biblioteka' | 'videoebi';

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
  // „მედავითნეობა“ on the vine: the reader's course (the psalter group keeps the old id)
  { id: 'medavitneobaTopic', label: 'მედავითნეობა', page: 'medavitneoba', hint: 'მედავითნის სასწავლო კურსი' },
  { id: 'chvevebi', label: 'ჩვევები', page: 'gz', hint: 'ლოცვები ჩვევებიდან იხსნება' },
  { id: 'tamashebi', label: 'თამაშები', page: 'games', hint: 'მუსიკალური · ქართული · ცოცხალი' },
  { id: 'tsinaprebi', label: 'გაიცანი წინაპრები', page: 'tsinaprebi' },
  { id: 'gza', label: 'საგანძურის გზა', page: 'gz' },
  { id: 'biblioteka', label: 'ბიბლიოთეკა', page: 'biblioteka' },
  // „ეთნოფორი“'s films: songs on the map by region + the full episodes (pages/VideosPage.tsx), open to everyone
  { id: 'videoebi', label: 'ვიდეოები', page: 'videos', hint: '„ეთნოფორი“ — სიმღერები კუთხეებით' },
];

export const sectionOfPage = (page: PageType): SectionId | null => {
  if (page === 'galoba') return 'galoba';
  if (page === 'psalter') return 'medavitneoba';
  const s = SECTIONS.find(x => x.page === page && x.id !== 'chvevebi');
  return s ? s.id : null;
};

export type SectionState = 'open' | 'soon' | 'hidden';

/** The site's other parts, each with its own switch in the same list (settings/sections.state; 2026-11-01, the user:
 *  „გამთიშველები ყველასი ცალკ-ცალკე“). Only „ღია“ / „დამალული“; hidden = gone for everyone but admins. The ids of the
 *  member's features (utils/memberAccess) are the same, so `useMembership().can` follows these switches too. */
export type ExtraId =
  | 'samosi' | 'learn' | 'manera' | 'work' | 'prayers' | 'classes' | 'messages' | 'search' | 'calendar' | 'recordings'
  | 'abituri' | 'birthdays';
export type SwitchId = SectionId | ExtraId;

export const EXTRA_SWITCHES: { id: ExtraId; label: string; hint: string }[] = [
  { id: 'samosi', label: 'ჩემი სამოსი', hint: 'ჩოხა და კაბა — გზის მრგვალი ღილაკი და პროფილის ბარათი, ფოტოზე ჩაცმაც' },
  { id: 'learn', label: 'ნასწავლი', hint: 'მარგალიტები და სკივრები, სასწავლო რეჟიმი, დავალებები, „დღეს გასამეორებელი“' },
  { id: 'manera', label: 'ოსტატობა', hint: 'სავარჯიშოები და რჩევები' },
  { id: 'work', label: 'სამუშაო', hint: 'დამოუკიდებელი სამუშაო გზაზე' },
  { id: 'prayers', label: 'ლოცვანი', hint: 'ლოცვები, ფსალმუნი, აკათისტოები, ბიბლია, მოსახსენებელი' },
  { id: 'classes', label: 'კლასი და კლასის ჩატი', hint: 'კლასის გვერდი, ჩატი, ზარები, თამაშის მოსაწვევები' },
  { id: 'messages', label: 'პირადი მიმოწერა', hint: 'წერილები და ზარები' },
  { id: 'search', label: 'ძიება', hint: '🔍 სათაურში და მთავარზე' },
  { id: 'calendar', label: 'საეკლესიო კალენდარი', hint: 'გვერდის ბოლოს, დღის წმიდანები' },
  { id: 'recordings', label: 'ჩანაწერები', hint: 'აუდიოჩანაწერები — თამაშებიც მათ იყენებს' },
  { id: 'abituri', label: 'აბიტურიენტს', hint: 'გალობის უნივერსიტეტში მისაღები პროგრამა' },
  { id: 'birthdays', label: 'დაბადების დღეები', hint: 'გვერდი და მთავარის ოქროსფერი ხაზი' },
];
export const isExtra = (id: string): id is ExtraId => EXTRA_SWITCHES.some(x => x.id === id);

/** Without the admin's settings: everything built is open; the psalter group and მედავითნეობა are "მალე". */
export const DEFAULT_SECTION_STATE: Record<SwitchId, SectionState> = {
  galoba: 'open', simghera: 'open', mtkmeli: 'open', sakravebi: 'open', medavitneoba: 'soon', medavitneobaTopic: 'soon',
  chvevebi: 'open', tamashebi: 'open', tsinaprebi: 'open', gza: 'open', biblioteka: 'open', videoebi: 'open',
  samosi: 'open', learn: 'open', manera: 'open', work: 'open', prayers: 'open', classes: 'open', messages: 'open',
  search: 'open', calendar: 'open', recordings: 'open', abituri: 'open', birthdays: 'open',
};

/** A „მალე“ section the admin gave a day (settings/sections.openOn, YYYY-MM-DD) opens by itself on that day in Georgia;
 *  `today` = the Georgian day. Every other state stays as it was set. */
export const stateOnDay = (
  state: Record<SwitchId, SectionState>, openOn: Partial<Record<SwitchId, string>>, today: string,
): Record<SwitchId, SectionState> => {
  const out = { ...state };
  for (const [id, day] of Object.entries(openOn) as [SwitchId, string][]) {
    if (out[id] === 'soon' && /^\d{4}-\d{2}-\d{2}$/.test(day || '') && day <= today) out[id] = 'open';
  }
  return out;
};

/** A kids' mode starts with these sections (the admin may choose others in settings/sections). */
export const DEFAULT_KIDS_SECTIONS: SectionId[] = ['galoba', 'simghera', 'sakravebi', 'chvevebi', 'gza'];

export interface KidsMode {
  on: boolean;
  sections: SectionId[];
  by?: string;
  at?: string;
}
