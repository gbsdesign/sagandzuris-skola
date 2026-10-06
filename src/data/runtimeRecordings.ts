import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { ChantMediaItem } from './chantMediaRegistry';

// Recordings bound from the admin panel ("ჩანაწერების მიბმა"), on top of the ones written in code
// (VARIANT_MEDIA in chantMediaRegistry.ts): settings/recordings
//   { bindings: { "chant-5|გ.ს.": { title, tracks: [voice1, voice2, voice3, all] (Drive file ids), addedBy, addedAt } } }
// They play through the same audio Worker. A binding here wins over one in code.

export interface RecordingBinding {
  title: string;
  tracks: [string, string, string, string];
  addedBy?: string;
  addedAt?: string;
}

const AUDIO_PROXY = 'https://sagandzuri-audio.mr-gabunia.workers.dev';
export const RUNTIME_MEDIA: Record<string, ChantMediaItem> = {};

// Guests don't see the live recordings at all (only the book notes and the synthesizer).
let recordingsHidden = true;
export const setRecordingsHidden = (hidden: boolean) => { recordingsHidden = hidden; };
export const recordingsAreHidden = () => recordingsHidden;
let bindings: Record<string, RecordingBinding> = {};
let version = 0;
const listeners = new Set<() => void>();

export const proxyUrl = (fileId: string) => (fileId ? `${AUDIO_PROXY}/${fileId}` : '');

/** The Drive file id in any usual Drive link (or the id itself). */
export const driveFileId = (text: string) => {
  const t = text.trim();
  return (
    /\/file\/d\/([A-Za-z0-9_-]{20,})/.exec(t)?.[1] ||
    /[?&]id=([A-Za-z0-9_-]{20,})/.exec(t)?.[1] ||
    (/^[A-Za-z0-9_-]{20,}$/.test(t) ? t : '')
  );
};

const toItem = (key: string, b: RecordingBinding): ChantMediaItem => {
  const [v1, v2, v3, all] = b.tracks.map(proxyUrl);
  return {
    key: `admin:${key}`,
    title: b.title,
    folderId: '',
    folderUrl: '',
    voice1Url: v1 || undefined,
    voice2Url: v2 || undefined,
    voice3Url: v3 || undefined,
    allVoicesUrl: all || undefined,
    tracks: [v1, v2, v3, all],
    availableVoices: { voice1: !!v1, voice2: !!v2, voice3: !!v3, all: !!all },
    notes: [],
  };
};

let started = false;
/** Starts listening once (the app's root calls it); offline, the last copy comes from the cache. */
export const startRecordingBindings = () => {
  if (started) return;
  started = true;
  onSnapshot(
    doc(db, 'settings', 'recordings'),
    snap => {
      bindings = (snap.data()?.bindings as Record<string, RecordingBinding>) || {};
      for (const k of Object.keys(RUNTIME_MEDIA)) delete RUNTIME_MEDIA[k];
      for (const [k, b] of Object.entries(bindings)) {
        if (b && Array.isArray(b.tracks) && b.tracks.some(Boolean)) RUNTIME_MEDIA[k] = toItem(k, b);
      }
      version++;
      listeners.forEach(l => l());
    },
    err => console.warn('recordings note:', err?.code || err)
  );
};

export const getBindings = () => bindings;

/** Re-renders when the bindings change (so a new recording shows up at once). */
export const useRecordingBindings = () => {
  const [, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return bindings;
};
