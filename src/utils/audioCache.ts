import {
  saveAudioToArrayBufferIdb,
  getAudioArrayBufferFromIdb,
  isAudioInIndexedDB,
  removeAudioFromIndexedDB,
} from './audioIdb';

// Clean up any legacy Cache API caches to free device storage and prevent duplicate caching
if (typeof caches !== 'undefined') {
  caches.keys().then((keys) => {
    keys.forEach((k) => {
      if (k.startsWith('chants-audio-')) {
        caches.delete(k).catch(() => {});
      }
    });
  }).catch(() => {});
}

/**
 * Downloads audio file and saves ArrayBuffer exclusively to IndexedDB (100% offline, zero duplication)
 */
export async function cacheAudio(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();

    // Store raw ArrayBuffer directly into IndexedDB
    return await saveAudioToArrayBufferIdb(url, arrayBuffer);
  } catch (e) {
    console.error('Audio caching to IndexedDB failed:', e);
    return false;
  }
}

/**
 * Retrieves a playable object URL from IndexedDB ArrayBuffer
 */
export async function getCachedAudioUrl(url: string): Promise<string | null> {
  try {
    const buffer = await getAudioArrayBufferFromIdb(url);
    if (!buffer) return null;
    const blob = new Blob([buffer], { type: 'audio/mpeg' });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Checks if audio is stored in IndexedDB
 */
export async function isAudioCached(url: string): Promise<boolean> {
  return isAudioInIndexedDB(url);
}

/**
 * Removes cached audio entry from IndexedDB
 */
export async function removeCachedAudio(url: string): Promise<boolean> {
  return removeAudioFromIndexedDB(url);
}

/**
 * Clears all audio entries from legacy caches if any
 */
export async function clearAudioCache(): Promise<void> {
  if (typeof caches !== 'undefined') {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('chants-audio-')).map((k) => caches.delete(k))
      );
    } catch {}
  }
}
