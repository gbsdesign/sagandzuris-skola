// Cloudflare Worker „sagandzuri-calls“: the school's own audio and video calls (a private chat's call and a class's
// call) through Cloudflare Realtime (SFU). The app never sees the Realtime secret: it sends its Firebase sign-in
// token here, and this Worker passes the call's offers and answers on to Cloudflare.
//
//   GET  /ice                          → the servers a phone uses to reach the call (STUN, and TURN when set up)
//   POST /sessions/new                 → a new connection
//   POST /sessions/<id>/tracks/new     → send one's microphone / camera, or receive someone else's
//   PUT  /sessions/<id>/renegotiate    → the answer after receiving
//   PUT  /sessions/<id>/tracks/close   → stop receiving someone who left
//
// Secrets (npx wrangler secret put …): RTC_APP_ID, RTC_APP_TOKEN — from Cloudflare → Realtime → SFU → the app.
// Optional, for phones behind strict networks: TURN_KEY_ID, TURN_KEY_TOKEN — Realtime → TURN → the key.
// Variable FIREBASE_PROJECT_ID is in wrangler.toml. Who may call whom is checked by the app's Firestore rules.

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5180',
  'https://sagandzuris-skola.pages.dev',
  'https://sagandzureli.ge',
  'https://www.sagandzureli.ge',
];
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.sagandzuris-skola\.pages\.dev$/;
const isAllowed = (origin) => ALLOWED_ORIGINS.includes(origin) || PREVIEW_ORIGIN.test(origin);

const cors = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Vary': 'Origin',
});
const json = (data, status, origin) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

// the Realtime calls this Worker passes on, nothing else
const ROUTES = [
  ['POST', /^\/sessions\/new$/],
  ['POST', /^\/sessions\/[A-Za-z0-9_-]{8,80}\/tracks\/new$/],
  ['PUT', /^\/sessions\/[A-Za-z0-9_-]{8,80}\/renegotiate$/],
  ['PUT', /^\/sessions\/[A-Za-z0-9_-]{8,80}\/tracks\/close$/],
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowed(origin)) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });

    try {
      await verifyIdToken(env, (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, ''));
    } catch {
      return json({ error: 'sign in' }, 401, origin);
    }
    if (!env.RTC_APP_ID || !env.RTC_APP_TOKEN) return json({ error: 'calls are not set up' }, 503, origin);

    const path = new URL(request.url).pathname;
    if (path === '/ice' && request.method === 'GET') return json({ iceServers: await iceServers(env) }, 200, origin);

    if (!ROUTES.some(([m, re]) => m === request.method && re.test(path))) return json({ error: 'not found' }, 404, origin);
    const body = await request.text();
    if (body.length > 200_000) return json({ error: 'too big' }, 413, origin);
    const upstream = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${env.RTC_APP_ID}${path}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${env.RTC_APP_TOKEN}`, 'Content-Type': 'application/json' },
      body: body || undefined,
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { ...cors(origin), 'Content-Type': 'application/json' },
    });
  },
};

// STUN always; TURN (short-lived, 2 hours) when the key is set up
async function iceServers(env) {
  const stun = [{ urls: 'stun:stun.cloudflare.com:3478' }];
  if (!env.TURN_KEY_ID || !env.TURN_KEY_TOKEN) return stun;
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.TURN_KEY_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 7200 }),
    });
    if (!r.ok) return stun;
    const data = await r.json();
    return Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
  } catch {
    return stun;
  }
}

// ---- Firebase ID token (the same check as the reminders Worker) ---------------------------------------------

const enc = new TextEncoder();
const dec = new TextDecoder();
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

let jwks = null;
let jwksAt = 0;
async function verifyIdToken(env, token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) throw new Error('token');
  const [h, p, s] = token.split('.');
  const header = JSON.parse(dec.decode(unb64url(h)));
  const claims = JSON.parse(dec.decode(unb64url(p)));
  const now = Date.now() / 1000;
  const project = env.FIREBASE_PROJECT_ID;
  if (header.alg !== 'RS256' || claims.aud !== project || claims.iss !== `https://securetoken.google.com/${project}`) throw new Error('aud');
  if (!claims.sub || claims.exp < now || claims.iat > now + 300) throw new Error('time');
  if (!jwks || Date.now() - jwksAt > 3600_000) {
    jwks = (await (await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')).json()).keys;
    jwksAt = Date.now();
  }
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unb64url(s), enc.encode(`${h}.${p}`)))) throw new Error('sig');
  return claims.sub;
}
