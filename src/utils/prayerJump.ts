// Open a prayer at one of its headings (x-mosakhsenebeli's „წაიკითხე ლოცვა სახელებით“ → the morning prayer's
// „ლოცვა ცოცხალთათვის“ / „ლოცვა გარდაცვალებულთათვის“). The caller sets the heading, then opens the prayer; the prayer
// page takes it once its text is drawn and scrolls there.

let pending: { prayerId: string; heading: string } | null = null;

export const prayerAt = (prayerId: string, heading: string) => { pending = { prayerId, heading }; };

/** the heading asked for this prayer, once (another prayer opened meanwhile drops it) */
export const takePrayerAt = (prayerId: string): string | null => {
  const p = pending;
  pending = null;
  return p && p.prayerId === prayerId ? p.heading : null;
};

export const hasPrayerAt = (prayerId: string) => pending?.prayerId === prayerId;
