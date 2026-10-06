// Name checks without Firebase (memberName.ts re-exports them), so plain helpers and tests can use them.

const GEORGIAN = /^[ა-ჿᲐ-Ჿ]+(?:[\s-][ა-ჿᲐ-Ჿ]+)*$/;
export const isGeorgian = (s: string | undefined) => !!s && GEORGIAN.test(s.trim());

export interface ProfileName {
  firstName: string;
  lastName: string;
  churchName: string;
}

export const fullName = (p: Partial<ProfileName> | undefined) => [p?.firstName, p?.lastName].map(x => (x || '').trim()).filter(Boolean).join(' ');
export const prayerName = (p: Partial<ProfileName> | undefined) => (p?.churchName || p?.firstName || '').trim();
export const hasGeorgianName = (p: Partial<ProfileName> | undefined) => isGeorgian(p?.firstName) && isGeorgian(p?.lastName);
