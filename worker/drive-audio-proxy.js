// Cloudflare Worker: serves Google Drive audio with CORS headers.
// The player routes audio through Web Audio (voices, pitch, waveform), which browsers only
// allow for files sent with Access-Control-Allow-Origin. Drive doesn't send it; this Worker does.
//
// URL format: https://<worker>.workers.dev/<driveFileId>

// Sites allowed to use this Worker (add the published site address here)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://sagandzuris-skola.pages.dev',
];
// Cloudflare Pages gives every branch its own test address: <branch>.sagandzuris-skola.pages.dev
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.sagandzuris-skola\.pages\.dev$/;
const isAllowed = (origin) => ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);

const CACHE_SECONDS = 7 * 24 * 60 * 60; // keep files at Cloudflare for a week, so Drive is rarely hit
const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Vary': 'Origin',
  };
}

function withCors(response, origin) {
  const headers = new Headers(corsHeaders(origin));
  for (const h of PASS_HEADERS) {
    const v = response.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    const id = new URL(request.url).pathname.slice(1);
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(id)) {
      return new Response('Bad file id', { status: 400, headers: corsHeaders(origin) });
    }

    // Whole file is cached once; Range requests (seeking) are answered from the cached copy
    const cache = caches.default;
    const cacheKey = new Request(`https://drive-audio-cache/${id}`);
    const range = request.headers.get('Range');

    const cached = await cache.match(range ? new Request(cacheKey, { headers: { Range: range } }) : cacheKey);
    if (cached) return withCors(cached, origin);

    const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

    // Fill the cache with the whole file in the background
    ctx.waitUntil((async () => {
      const full = await fetch(driveUrl);
      const type = full.headers.get('content-type') || '';
      if (full.ok && type.startsWith('audio/')) {
        const headers = new Headers({
          'Content-Type': type,
          'Cache-Control': `public, max-age=${CACHE_SECONDS}`,
          'Accept-Ranges': 'bytes',
        });
        const len = full.headers.get('content-length');
        if (len) headers.set('Content-Length', len);
        await cache.put(cacheKey, new Response(full.body, { status: 200, headers }));
      }
    })());

    // Answer this request straight from Drive (with the Range, if any)
    const upstream = await fetch(driveUrl, { headers: range ? { Range: range } : {} });
    const type = upstream.headers.get('content-type') || '';
    if (!upstream.ok || !type.startsWith('audio/')) {
      return new Response(`Drive did not return audio (status ${upstream.status}, ${type || 'no type'})`, {
        status: 502,
        headers: corsHeaders(origin),
      });
    }
    return withCors(upstream, origin);
  },
};
