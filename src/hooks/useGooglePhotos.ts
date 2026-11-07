import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Church } from '../data/churches';
import type { GPeriod } from '../utils/googleHours';

// Google Maps' photos of a church in its window (pages/churches/ChurchCard.tsx), through Google's own Places API (New) —
// Google's terms do not let an app keep its photos, so they are asked for each time a window opens and shown with their
// authors. The key is pasted by an admin (⚙ „სკოლა“ → „Google-ის ფოტოები“) and kept in settings/googlePlaces { key }
// (settings: everyone reads, admins write).
// Cost (Google's price list, checked 2026-11-07): the search for the place gives only its id — „Text Search Essentials
// (IDs Only)“ — and the photo list is „Place Details Essentials (IDs Only)“, both free without limit; each photo shown is
// „Place Details Photos“ (1 000 a month free). So a photo loads only when shown, and a window asks once per visit.
// The hours, website and phone (`useGoogleInfo`) are „Place Details Enterprise“ (1 000 a month free, then $20 a 1 000), so
// they load only on the window's button, once a church per visit.

let key: string | null | undefined;
const keySubs = new Set<(k: string | null) => void>();
let started = false;
const keyRef = () => doc(db, 'settings', 'googlePlaces');

export const useGooglePlacesKey = () => {
  const [k, setK] = useState<string | null | undefined>(key);
  useEffect(() => {
    if (!started) {
      started = true;
      onSnapshot(keyRef(), snap => {
        const v = snap.data()?.key;
        key = typeof v === 'string' && v.trim() ? v.trim() : null;
        keySubs.forEach(f => f(key ?? null));
      }, () => { key = null; keySubs.forEach(f => f(null)); });
    }
    keySubs.add(setK);
    setK(key);
    return () => { keySubs.delete(setK); };
  }, []);
  return k;
};

export const saveGooglePlacesKey = (k: string) => setDoc(keyRef(), { key: k.trim() });

export interface GooglePhoto { name: string; author: string; authorUri: string }

const found = new Map<string, GooglePhoto[]>();
const API = 'https://places.googleapis.com/v1';

/** the photo itself — loading it is what Google counts */
export const googlePhotoUrl = (p: GooglePhoto, apiKey: string, width = 800) =>
  `${API}/${p.name}/media?maxWidthPx=${width}&key=${encodeURIComponent(apiKey)}`;

/** the place of worship Google knows within ~400 m of the church, with its name — only its id is asked (free) */
const findPlace = async (c: Church, apiKey: string): Promise<string | null> => {
  const res = await fetch(`${API}/places:searchText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'places.id' },
    body: JSON.stringify({
      textQuery: `${c.name} ${c.place}`.trim(),
      languageCode: 'ka',
      includedType: 'place_of_worship',
      strictTypeFiltering: true,
      pageSize: 1,
      locationRestriction: { rectangle: { low: { latitude: c.lat - 0.0036, longitude: c.lng - 0.0048 }, high: { latitude: c.lat + 0.0036, longitude: c.lng + 0.0048 } } },
    }),
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  const data = await res.json();
  return data.places?.[0]?.id ?? null;
};

// a place's id may be kept (Google allows it); asked once a church per visit, shared by the photos and the hours
const placeIds = new Map<string, Promise<string | null>>();
const placeIdOf = (c: Church, apiKey: string) => {
  let p = placeIds.get(c.id);
  if (!p) {
    p = findPlace(c, apiKey);
    placeIds.set(c.id, p);
    p.catch(() => placeIds.delete(c.id));
  }
  return p;
};

const placePhotos = async (placeId: string, apiKey: string): Promise<GooglePhoto[]> => {
  const res = await fetch(`${API}/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'photos' },
  });
  if (!res.ok) throw new Error(`details ${res.status}`);
  const data = await res.json();
  return (data.photos ?? []).slice(0, 10).map((p: { name: string; authorAttributions?: { displayName?: string; uri?: string }[] }) => ({
    name: p.name,
    author: p.authorAttributions?.[0]?.displayName ?? '',
    authorUri: p.authorAttributions?.[0]?.uri ?? '',
  }));
};

/** undefined while asking (or no key yet), [] when Google has none */
export const useGooglePhotos = (c: Church | null, apiKey: string | null | undefined) => {
  const [photos, setPhotos] = useState<GooglePhoto[] | undefined>(c ? found.get(c.id) : undefined);
  useEffect(() => {
    if (!c || !apiKey || !c.located) { setPhotos(c && apiKey === null ? [] : undefined); return; }
    const kept = found.get(c.id);
    if (kept) { setPhotos(kept); return; }
    let alive = true;
    setPhotos(undefined);
    (async () => {
      try {
        const id = await placeIdOf(c, apiKey);
        const list = id ? await placePhotos(id, apiKey) : [];
        found.set(c.id, list);
        if (alive) setPhotos(list);
      } catch {
        if (alive) setPhotos([]);
      }
    })();
    return () => { alive = false; };
  }, [c, apiKey]);
  return photos;
};

// ── the hours, website and phone Google Maps knows (on the window's button) ──

export interface GoogleInfo {
  /** Google's `regularOpeningHours.periods` (utils/googleHours.ts makes the lines) */
  periods: GPeriod[];
  openNow: boolean | null;
  /** OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY or '' */
  status: string;
  website: string;
  phone: string;
  /** „+995 571 00 29 42“, for the tel: link */
  phoneIntl: string;
  /** the place on Google Maps */
  mapsUri: string;
}

/** null = Google Maps does not know this church */
const infos = new Map<string, GoogleInfo | null>();

const placeInfo = async (placeId: string, apiKey: string): Promise<GoogleInfo> => {
  const res = await fetch(`${API}/places/${encodeURIComponent(placeId)}?languageCode=ka`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'regularOpeningHours.periods,regularOpeningHours.openNow,businessStatus,websiteUri,nationalPhoneNumber,internationalPhoneNumber,googleMapsUri',
    },
  });
  if (!res.ok) throw new Error(`details ${res.status}`);
  const d = await res.json();
  return {
    periods: d.regularOpeningHours?.periods ?? [],
    openNow: typeof d.regularOpeningHours?.openNow === 'boolean' ? d.regularOpeningHours.openNow : null,
    status: d.businessStatus ?? '',
    website: d.websiteUri ?? '',
    phone: d.nationalPhoneNumber ?? '',
    phoneIntl: d.internationalPhoneNumber ?? '',
    mapsUri: d.googleMapsUri ?? '',
  };
};

export type GoogleInfoState =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'done'; info: GoogleInfo | null };

/** nothing is asked until `load()`; a church asked before in this visit shows at once */
export const useGoogleInfo = (c: Church, apiKey: string | null | undefined) => {
  const [st, setSt] = useState<GoogleInfoState>(() => (infos.has(c.id) ? { state: 'done', info: infos.get(c.id)! } : { state: 'idle' }));
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = async () => {
    if (!apiKey || !c.located) return;
    setSt({ state: 'loading' });
    try {
      const id = await placeIdOf(c, apiKey);
      const info = id ? await placeInfo(id, apiKey) : null;
      infos.set(c.id, info);
      if (alive.current) setSt({ state: 'done', info });
    } catch {
      if (alive.current) setSt({ state: 'failed' });
    }
  };
  return { ...st, load, can: !!apiKey && c.located };
};
