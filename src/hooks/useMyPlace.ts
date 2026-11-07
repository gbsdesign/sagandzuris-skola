import { useEffect, useState } from 'react';

// Where the phone is, for „ეკლესია-მონასტრები“: „ახლოს მდებარე“, the dots map's „ჩემი ადგილი“ and a church's „N კმ შენგან“ all
// share one place, asked once and kept for the visit (asked again after ten minutes).

export interface Fix { lat: number; lng: number; at: number }
export type FixState = 'idle' | 'asking' | 'denied' | 'failed' | 'none';
const FRESH_MS = 600000;

let fix: Fix | null = null;
let state: FixState = 'idle';
const subs = new Set<() => void>();
const tell = () => subs.forEach(f => f());

export const myPlace = () => fix;

/** asks the phone; resolves with the place, or null when refused or failed */
export const locateMe = (): Promise<Fix | null> => new Promise(resolve => {
  if (!('geolocation' in navigator)) { state = 'none'; tell(); resolve(null); return; }
  state = 'asking'; tell();
  navigator.geolocation.getCurrentPosition(
    p => { fix = { lat: p.coords.latitude, lng: p.coords.longitude, at: Date.now() }; state = 'idle'; tell(); resolve(fix); },
    e => { state = e.code === e.PERMISSION_DENIED ? 'denied' : 'failed'; tell(); resolve(null); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 },
  );
});

/** the place and its state; `want` asks for it on mount when there is none fresh */
export const useMyPlace = (want = false) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => tick(t => t + 1);
    subs.add(on);
    if (want && (!fix || Date.now() - fix.at > FRESH_MS) && state !== 'asking') locateMe();
    return () => { subs.delete(on); };
  }, [want]);
  return { fix, state, locate: locateMe };
};
