// Georgian names of the months and weekdays, shared by every date the app shows.
// Months are indexed by Date.getMonth() (0 = January), weekdays by Date.getDay() (0 = Sunday).
// (Prayer books name the days liturgically — „კვირიაკე“ — that list stays in data/prayers.ts.)

export const MONTHS_GE = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

/** Genitive: „ოქტომბრის სტატისტიკა“, „15 ოქტომბრის“ */
export const MONTHS_GEN_GE = ['იანვრის', 'თებერვლის', 'მარტის', 'აპრილის', 'მაისის', 'ივნისის', 'ივლისის', 'აგვისტოს', 'სექტემბრის', 'ოქტომბრის', 'ნოემბრის', 'დეკემბრის'];

export const MONTHS_SHORT_GE = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

export const WEEKDAYS_GE = ['კვირა', 'ორშაბათი', 'სამშაბათი', 'ოთხშაბათი', 'ხუთშაბათი', 'პარასკევი', 'შაბათი'];

export const WEEKDAYS_SHORT_GE = ['კვ', 'ორ', 'სა', 'ოთ', 'ხუ', 'პა', 'შა'];

/** „28 ოქტ“, with the year when it is another one; '' for a missing or broken date. */
export const shortDate = (iso?: string, now: Date = new Date()) => {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT_GE[d.getMonth()]}${d.getFullYear() === now.getFullYear() ? '' : ` ${d.getFullYear()}`}`;
};
