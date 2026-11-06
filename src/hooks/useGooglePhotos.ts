import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Church } from '../data/churches';

// Google Maps' photos of a church in its window (pages/churches/ChurchCard.tsx), through Google's own Places API (New) —
// Google's terms do not let an app keep its photos, so they are asked for each time a window opens and shown with their
// authors. The key (a browser key held to the site's addresses and to Places API) is pasted by an admin on the page and
// kept in settings/googlePlaces { key } (settings: everyone reads, admins write).
// Cost (Google's prices, Nov 2026): the search for the place gives only its id — „Text Search Essentials (IDs Only)“,
// free without limit —; its photo list is „Place Details Pro“ (5 000 a month free) and each photo shown is „Place
// Details Photos“ (1 000 a month free). So a photo loads only when shown, and a window asks once per visit.

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
        const id = await findPlace(c, apiKey);
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
