// Cloudflare Worker "sagandzuri-reminders": Web Push reminders for the seven-times prayers.
//
// POST /subscribe { subscription, reminders: { 'hour-12': [10, 5, 1], ... }, tz: 'Asia/Tbilisi' }
//   stores (or, with empty reminders, removes) one browser's reminders.
// The cron trigger (wrangler.toml) runs at :50, :55 and :59 of every hour and sends a push to
// each browser whose reminder falls on that minute in its own time zone. Pushes carry no payload;
// the site's service worker (public/prayer-notify-sw.js) works out which hour is near and shows it.
//
// Bindings: KV namespace REMINDERS (one key "subs"), secret VAPID_PRIVATE_JWK, var VAPID_PUBLIC_KEY.

const ALLOWED_ORIGINS = ['https://sagandzuris-skola.pages.dev', 'http://localhost:5173'];
const HOURS = { 'hour-6': 6, 'hour-9': 9, 'hour-12': 12, 'hour-15': 15, 'hour-18': 18, 'hour-21': 21, 'hour-24': 0 };
const OFFSETS = [10, 5, 1];
const MAX_SUBS = 5000;
const SUBJECT = 'https://sagandzuris-skola.pages.dev';

const cors = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = async (text) => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

const loadSubs = async (env) => (await env.REMINDERS.get('subs', 'json')) || {};

const cleanReminders = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, offsets] of Object.entries(raw)) {
    if (!(id in HOURS) || !Array.isArray(offsets)) continue;
    const ok = [...new Set(offsets.filter((m) => OFFSETS.includes(m)))];
    if (ok.length) out[id] = ok;
  }
  return out;
};

const validTz = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

async function subscribe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return [400, 'bad json'];
  }
  const sub = body && body.subscription;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || sub.endpoint.length > 1000) {
    return [400, 'bad subscription'];
  }
  const tz = typeof body.tz === 'string' && validTz(body.tz) ? body.tz : 'Asia/Tbilisi';
  const reminders = cleanReminders(body.reminders);
  const key = await sha256(sub.endpoint);
  const subs = await loadSubs(env);
  if (Object.keys(reminders).length) {
    if (!subs[key] && Object.keys(subs).length >= MAX_SUBS) return [503, 'full'];
    subs[key] = { endpoint: sub.endpoint, tz, reminders };
  } else if (subs[key]) {
    delete subs[key];
  } else {
    return [200, 'ok'];
  }
  await env.REMINDERS.put('subs', JSON.stringify(subs));
  return [200, 'ok'];
}

// ---- VAPID (RFC 8292): an ES256 JWT for the push service's origin ----

let signingKey;
const getSigningKey = async (env) =>
  (signingKey ??= await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ));

const jwtCache = new Map();
async function vapidJwt(env, audience) {
  const cached = jwtCache.get(audience);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - now > 3600) return cached.token;
  const exp = now + 12 * 3600;
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud: audience, exp, sub: SUBJECT })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await getSigningKey(env), new TextEncoder().encode(unsigned));
  const token = `${unsigned}.${b64url(sig)}`;
  jwtCache.set(audience, { token, exp });
  return token;
}

async function sendPush(env, endpoint) {
  const jwt = await vapidJwt(env, new URL(endpoint).origin);
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      TTL: '120',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Length': '0',
    },
  });
}

// minutes since local midnight in the given zone
const localMinutes = (when, tz) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(when);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') * 60 + get('minute');
};

const isDue = (entry, when) => {
  const now = localMinutes(when, entry.tz);
  for (const [id, offsets] of Object.entries(entry.reminders)) {
    for (const m of offsets) {
      if ((HOURS[id] * 60 - m + 1440) % 1440 === now) return true;
    }
  }
  return false;
};

async function runReminders(env, when) {
  const subs = await loadSubs(env);
  const due = Object.entries(subs).filter(([, entry]) => isDue(entry, when));
  if (!due.length) return;
  let gone = false;
  await Promise.all(
    due.map(async ([key, entry]) => {
      try {
        const res = await sendPush(env, entry.endpoint);
        // the browser unsubscribed or the subscription expired
        if (res.status === 404 || res.status === 410) {
          delete subs[key];
          gone = true;
        }
      } catch {
        /* try again at the next reminder */
      }
    })
  );
  if (gone) await env.REMINDERS.put('subs', JSON.stringify(subs));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/subscribe') {
      if (!ALLOWED_ORIGINS.includes(origin)) return new Response('forbidden', { status: 403, headers });
      const [status, text] = await subscribe(request, env);
      return new Response(text, { status, headers });
    }
    return new Response('sagandzuri reminders', { status: 200, headers });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runReminders(env, new Date(event.scheduledTime)));
  },
};
