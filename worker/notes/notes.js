// The notes of „ქართული გალობის ანთოლოგია“ in the R2 bucket „sagandzuri-notes“ (the site's own 20 000-file limit is
// kept for everything else): a<vol>/<file>.json, its page pictures a<vol>/<file>-<k>.webp and the card pictures
// a<vol>/i/<file>.webp, read by the site at https://sagandzuri-notes.mr-gabunia.workers.dev/<key>.
// GET/HEAD are open to anyone (the notes are public, as they were on the site); PUT and the count are only for the
// upload workflow, with the key it sets for each run (secret UPLOAD_KEY).
const KEY = /^a\d+\/(?:i\/)?\d+(?:-\d+)?\.(json|webp)$/;
const TYPE = { json: 'application/json; charset=utf-8', webp: 'image/webp' };
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-expose-headers': 'etag',
  'access-control-max-age': '86400',
};
// a day on the phone / at the edge, then checked again by the ETag; the app's service worker keeps its own copy
const CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

const text = (body, status) => new Response(body, { status, headers: { ...CORS, 'content-type': 'text/plain; charset=utf-8' } });

const allowed = (request, env) => {
  const got = request.headers.get('x-upload-key') || '';
  const want = env.UPLOAD_KEY || '';
  if (!want || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.slice(1));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // how many objects are stored under a prefix (the upload workflow's check)
    if (request.method === 'GET' && key === '_count') {
      if (!allowed(request, env)) return text('forbidden', 403);
      const prefix = url.searchParams.get('prefix') || '';
      let count = 0, cursor;
      do {
        const page = await env.NOTES.list({ prefix, cursor, limit: 1000 });
        count += page.objects.length;
        cursor = page.truncated ? page.cursor : undefined;
      } while (cursor);
      return Response.json({ prefix, count }, { headers: CORS });
    }

    const m = KEY.exec(key);
    if (!m) return text('not found', 404);

    if (request.method === 'PUT') {
      if (!allowed(request, env)) return text('forbidden', 403);
      await env.NOTES.put(key, await request.arrayBuffer(), { httpMetadata: { contentType: TYPE[m[1]] } });
      return text('ok', 201);
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return text('method not allowed', 405);

    const obj = await env.NOTES.get(key, { onlyIf: request.headers });
    if (!obj) return text('not found', 404);
    const headers = { ...CORS, 'content-type': TYPE[m[1]], 'cache-control': CACHE, etag: obj.httpEtag };
    if (!('body' in obj)) return new Response(null, { status: 304, headers });
    return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
  },
};
