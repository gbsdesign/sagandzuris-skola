// Cloudflare Worker "sagandzuri-reminders": Web Push reminders.
//
// • Seven-times prayers: POST /subscribe { subscription, reminders: { 'hour-12': [10, 5, 1], ... }, tz }
//   stores one browser's prayer reminders. Cron :50, :55, :59 sends an empty push; the site's service
//   worker (public/prayer-notify-sw.js) works out which hour is near and shows it.
// • Habits: the same POST may hold reminders.habits [{ id, title, at: 'HH:MM', alerts: [minutes before], plan? }]
//   (a habit's time on its card, „მორგებული“ days in `plan`). Each minute the due ones go out with their text.
// • Group reminders: POST /account { subscription, token, psalter, assignments } binds the browser to the
//   signed-in person (the Firebase ID token proves who they are). Cron :00 sends, in Georgian time:
//   - psalter group: a nudge at the group's daily hour (20:00) to whoever hasn't read their kathisma,
//     another at the cycle's last evening (21:00), and on the 1st and 15th at 09:00 the new kathisma;
//   - assignments: at 19:00 the day before the deadline.
// • POST /group-event { token, groupId, kind: 'taken' | 'help', kathisma }: "your kathisma was taken by …"
//   to its reader, "help needed" to the group. The facts are checked in Firestore before anything is sent.
// • Admins (2026-10-28): /account with `admin: true` binds the browser to an admin's notices; what they asked for is
//   adminPush/{uid} in Firestore { waiting, weekly }. POST /access-request { token } — a newcomer's request (checked in
//   memberAccess) goes to the superadmins with `waiting`; Monday 10:00 the school's week goes to those with `weekly`.
// • Home-screen widgets of the Android app (2026-10-29): POST /widget/link { token } gives the app a secret of its own
//   (the profile's „ვიჯეტის დაკავშირება“); POST /widget/summary { token, summary } — the site, while open, leaves what the
//   widgets show (habits, the path's percentages, the psalter kanon); the app's widgets, which carry no site Origin, read
//   GET /widget/data?s=<secret> (that summary + today's ticks and counts, live from Firestore) and tick a habit with
//   POST /widget/tick { s, id } or count with POST /widget/count { s, id, add }; POST /widget/unlink { s }.
// • The phone's calendar (2026-10-29): GET /cal/<secret>.ics — great feasts, fasts and the member's lessons (ics.js);
//   the secret is one of /widget/link's, asked for by the profile's „კალენდარი ტელეფონში“.
// These pushes carry an encrypted text payload (RFC 8291, aes128gcm).
//
// Bindings (wrangler.toml): D1 database DB (schema.sql), KV namespace REMINDERS (old storage, read once to
// move the subscriptions into D1), vars VAPID_PUBLIC_KEY, FIREBASE_PROJECT_ID, FIRESTORE_DB,
// secrets VAPID_PRIVATE_JWK and FIREBASE_SA (the service account's JSON key, for reading Firestore).

import { buildIcs } from './ics.js';

const MAIN_ORIGINS = [
  'https://sagandzuris-skola.pages.dev',
  'https://sagandzureli.ge',
  'https://www.sagandzureli.ge',
  'http://localhost:5173',
];
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.sagandzuris-skola\.pages\.dev$/;
const allowedOrigin = (o) => MAIN_ORIGINS.includes(o) || PREVIEW_ORIGIN.test(o);
const HOURS = { 'hour-6': 6, 'hour-9': 9, 'hour-12': 12, 'hour-15': 15, 'hour-18': 18, 'hour-21': 21, 'hour-24': 0 };
const OFFSETS = [10, 5, 1];
const MAX_SUBS = 5000;
const SUBJECT = 'https://sagandzuris-skola.pages.dev';
const TBILISI_MS = 4 * 3600_000; // Georgia keeps UTC+4 all year
const ASSIGNMENT_HOUR = 19;
const SHIFT_HOUR = 9;

const HABIT_ALERTS = [0, 5, 10, 15, 30, 60];
const MAX_HABITS = 30;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

const enc = new TextEncoder();
const dec = new TextDecoder();

const cors = (origin) => ({
  'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : MAIN_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (text) => b64url(enc.encode(text));
const unb64url = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};
const sha256 = async (text) => b64url(await crypto.subtle.digest('SHA-256', enc.encode(text)));

// ---- storage (D1) ------------------------------------------------------------------------------------

const cleanReminders = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, offsets] of Object.entries(raw)) {
    if (id === 'habits') {
      const habits = cleanHabits(offsets);
      if (habits.length) out.habits = habits;
      continue;
    }
    if (!(id in HOURS) || !Array.isArray(offsets)) continue;
    const ok = [...new Set(offsets.filter((m) => OFFSETS.includes(m)))];
    if (ok.length) out[id] = ok;
  }
  return out;
};

// „მორგებული“ days, as the site keeps them (src/utils/myHabits.ts HabitSchedule)
const cleanPlan = (p) => {
  if (!p || typeof p !== 'object' || !DAY_KEY.test(p.start) || !['day', 'week', 'month'].includes(p.unit)) return null;
  const out = { every: Math.min(99, Math.max(1, Math.round(Number(p.every)) || 1)), unit: p.unit, start: p.start };
  if (p.unit === 'week' && Array.isArray(p.days)) {
    const days = [...new Set(p.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
    if (days.length) out.days = days;
  }
  if (typeof p.until === 'string' && DAY_KEY.test(p.until)) out.until = p.until;
  else if (Number.isInteger(p.count) && p.count > 0) out.count = Math.min(999, p.count);
  return out;
};

const cleanHabits = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_HABITS).flatMap((h) => {
    if (!h || typeof h.id !== 'string' || !HHMM.test(h.at) || !Array.isArray(h.alerts)) return [];
    const alerts = [...new Set(h.alerts.filter((m) => HABIT_ALERTS.includes(m)))].slice(0, 3);
    if (!alerts.length) return [];
    const plan = cleanPlan(h.plan);
    return [{ id: h.id.slice(0, 40), title: String(h.title || 'ჩვევა').slice(0, 60), at: h.at, alerts, ...(plan ? { plan } : {}) }];
  });
};

const validTz = (tz) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// The `admin` column came later (2026-10-28): the Worker adds it itself, once, so a deploy is all it takes.
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  const v = await env.DB.prepare("SELECT value FROM meta WHERE key = 'schema'").first();
  if (!v || Number(v.value) < 2) {
    try {
      await env.DB.prepare('ALTER TABLE subs ADD COLUMN admin INTEGER NOT NULL DEFAULT 0').run();
    } catch {
      /* already there (schema.sql of a fresh install has it) */
    }
    await env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', '2')").run();
  }
  if (!v || Number(v.value) < 3) {
    await env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS widgets (secret TEXT PRIMARY KEY, uid TEXT NOT NULL, created_at TEXT)'),
      env.DB.prepare('CREATE INDEX IF NOT EXISTS widgets_uid ON widgets (uid)'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS widget_summary (uid TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT)'),
      env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema', '3')"),
    ]);
  }
  schemaReady = true;
}

const validSubscription = (sub) =>
  sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://') && sub.endpoint.length <= 1000;

// Subscriptions used to live in one KV key; the first run moves them into D1.
let migrated = false;
async function migrateFromKv(env) {
  if (migrated || !env.REMINDERS) return;
  migrated = true;
  const done = await env.DB.prepare("SELECT value FROM meta WHERE key = 'kv-migrated'").first();
  if (done) return;
  const subs = (await env.REMINDERS.get('subs', 'json')) || {};
  const rows = Object.entries(subs).map(([key, s]) =>
    env.DB.prepare('INSERT OR IGNORE INTO subs (key, endpoint, tz, reminders, updated_at) VALUES (?, ?, ?, ?, ?)')
      .bind(key, s.endpoint, s.tz || 'Asia/Tbilisi', JSON.stringify(s.reminders || {}), new Date().toISOString())
  );
  rows.push(env.DB.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('kv-migrated', ?)").bind(new Date().toISOString()));
  await env.DB.batch(rows);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function subscribe(request, env) {
  const body = await readJson(request);
  const sub = body && body.subscription;
  if (!validSubscription(sub)) return [400, 'bad subscription'];
  const tz = typeof body.tz === 'string' && validTz(body.tz) ? body.tz : 'Asia/Tbilisi';
  const reminders = cleanReminders(body.reminders);
  const key = await sha256(sub.endpoint);
  const row = await env.DB.prepare('SELECT uid, psalter, assignments, admin FROM subs WHERE key = ?').bind(key).first();
  if (!Object.keys(reminders).length && !(row && (row.psalter || row.assignments || row.admin))) {
    await env.DB.prepare('DELETE FROM subs WHERE key = ?').bind(key).run();
    return [200, 'ok'];
  }
  if (!row) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM subs').first();
    if (n >= MAX_SUBS) return [503, 'full'];
  }
  await env.DB.prepare(
    `INSERT INTO subs (key, endpoint, p256dh, auth, tz, reminders, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET endpoint = excluded.endpoint, p256dh = COALESCE(excluded.p256dh, subs.p256dh),
       auth = COALESCE(excluded.auth, subs.auth), tz = excluded.tz, reminders = excluded.reminders, updated_at = excluded.updated_at`
  ).bind(key, sub.endpoint, sub.keys?.p256dh || null, sub.keys?.auth || null, tz, JSON.stringify(reminders), new Date().toISOString()).run();
  return [200, 'ok'];
}

async function account(request, env) {
  const body = await readJson(request);
  const sub = body && body.subscription;
  if (!validSubscription(sub) || !sub.keys?.p256dh || !sub.keys?.auth) return [400, 'bad subscription'];
  let uid;
  try {
    uid = await verifyIdToken(env, body.token);
  } catch {
    return [401, 'bad token'];
  }
  const psalter = body.psalter ? 1 : 0;
  const assignments = body.assignments ? 1 : 0;
  const key = await sha256(sub.endpoint);
  const row = await env.DB.prepare('SELECT reminders, admin FROM subs WHERE key = ?').bind(key).first();
  // an admin's notices: set when the call says so, otherwise kept (the group switches do not know of them)
  const admin = typeof body.admin === 'boolean' ? (body.admin ? 1 : 0) : (row?.admin ? 1 : 0);
  if (!psalter && !assignments && !admin && (!row || row.reminders === '{}')) {
    await env.DB.prepare('DELETE FROM subs WHERE key = ?').bind(key).run();
    return [200, 'ok'];
  }
  if (!row) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM subs').first();
    if (n >= MAX_SUBS) return [503, 'full'];
  }
  await env.DB.prepare(
    `INSERT INTO subs (key, endpoint, p256dh, auth, tz, reminders, uid, psalter, assignments, admin, updated_at)
     VALUES (?, ?, ?, ?, 'Asia/Tbilisi', '{}', ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
       uid = excluded.uid, psalter = excluded.psalter, assignments = excluded.assignments, admin = excluded.admin,
       updated_at = excluded.updated_at`
  ).bind(key, sub.endpoint, sub.keys.p256dh, sub.keys.auth, uid, psalter, assignments, admin, new Date().toISOString()).run();
  return [200, 'ok'];
}

// ---- VAPID (RFC 8292) and payload encryption (RFC 8291) ------------------------------------------------

let signingKey;
const getSigningKey = async (env) =>
  (signingKey ??= await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']));

const jwtCache = new Map();
async function vapidJwt(env, audience) {
  const cached = jwtCache.get(audience);
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - now > 3600) return cached.token;
  const exp = now + 12 * 3600;
  const unsigned = `${b64urlText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${b64urlText(JSON.stringify({ aud: audience, exp, sub: SUBJECT }))}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await getSigningKey(env), enc.encode(unsigned));
  const token = `${unsigned}.${b64url(sig)}`;
  jwtCache.set(audience, { token, exp });
  return token;
}

const hkdf = async (salt, ikm, info, bytes) => {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
};

async function encryptPayload(p256dh, auth, text) {
  const uaPublic = unb64url(p256dh);
  const authSecret = unb64url(auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(enc.encode(text), new Uint8Array([2]))));
  const header = new Uint8Array(21 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, sealed);
}

/** An empty push (prayer hours) or one with a message { title, body, tag, url }. */
async function sendPush(env, row, message) {
  const jwt = await vapidJwt(env, new URL(row.endpoint).origin);
  const headers = { TTL: message ? '21600' : '120', Urgency: message ? 'normal' : 'high', Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}` };
  if (!message) return fetch(row.endpoint, { method: 'POST', headers: { ...headers, 'Content-Length': '0' } });
  const body = await encryptPayload(row.p256dh, row.auth, JSON.stringify(message));
  return fetch(row.endpoint, { method: 'POST', headers: { ...headers, 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream' }, body });
}

/** Sends and forgets subscriptions the push service says are gone. */
async function deliver(env, sends) {
  const gone = [];
  await Promise.all(sends.map(async ([row, message]) => {
    try {
      const res = await sendPush(env, row, message);
      if (res.status === 404 || res.status === 410) gone.push(row.key);
    } catch {
      /* try again next time */
    }
  }));
  if (gone.length) await env.DB.batch(gone.map((k) => env.DB.prepare('DELETE FROM subs WHERE key = ?').bind(k)));
}

// ---- Firebase: ID tokens and Firestore reads ---------------------------------------------------------

let jwks = null;
let jwksAt = 0;
async function verifyIdToken(env, token) {
  return (await verifyIdClaims(env, token)).sub;
}
async function verifyIdClaims(env, token) {
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
  return claims;
}

let googleToken = null;
async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (googleToken && googleToken.exp - 120 > now) return googleToken.token;
  const sa = JSON.parse(env.FIREBASE_SA);
  const unsigned = `${b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64urlText(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const assertion = `${unsigned}.${b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(unsigned)))}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${assertion}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('google token');
  googleToken = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return googleToken.token;
}

const fsBase = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/${env.FIRESTORE_DB}/documents`;

const fromValue = (v) => {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  return null;
};
const fromFields = (fields) => Object.fromEntries(Object.entries(fields || {}).map(([k, v]) => [k, fromValue(v)]));

async function fsGet(env, path) {
  const res = await fetch(`${fsBase(env)}/${path}`, { headers: { Authorization: `Bearer ${await accessToken(env)}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  return fromFields((await res.json()).fields);
}

// `fields`: only these fields of each document (a big collection such as students stays small)
async function fsList(env, path, fields = []) {
  const out = [];
  let page = '';
  const mask = fields.map((f) => `&mask.fieldPaths=${encodeURIComponent(f)}`).join('');
  do {
    const res = await fetch(`${fsBase(env)}/${path}?pageSize=300${mask}${page ? `&pageToken=${page}` : ''}`, { headers: { Authorization: `Bearer ${await accessToken(env)}` } });
    if (!res.ok) throw new Error(`firestore ${res.status}`);
    const data = await res.json();
    for (const d of data.documents || []) out.push({ id: d.name.split('/').pop(), ...fromFields(d.fields) });
    page = data.nextPageToken || '';
  } while (page);
  return out;
}

// ---- the psalter rotation (same rules as src/utils/psalter.ts) ----------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const georgia = (when) => new Date(when.getTime() + TBILISI_MS);
const isoOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const wrap = (k) => ((((k - 1) % 20) + 20) % 20) + 1;
const DAY_MS = 86400_000;

// the group's shift days (1–28; none → the 1st and the 15th) and cycle length (1–7; unreadable → 2)
const shiftDaysOf = (group) => {
  const list = Array.isArray(group.shiftDays) ? group.shiftDays.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 28) : [];
  const clean = [...new Set(list)].sort((a, b) => a - b);
  return clean.length ? clean : [1, 15];
};
const cycleLen = (n) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 1 ? Math.min(v, 7) : 2;
};

// g: "now" shifted to Georgian time; group: the psalterGroups document
const cycleOf = (g, group) => {
  const days = shiftDaysOf(group);
  const n = days.length;
  const len = cycleLen(group.cycleDays);
  const y = g.getUTCFullYear(), m = g.getUTCMonth() + 1, d = g.getUTCDate();
  let month = y * 12 + (m - 1);
  let j = -1;
  for (let i = n - 1; i >= 0; i--) if (days[i] <= d) { j = i; break; }
  if (j < 0) { month -= 1; j = n - 1; }
  const at = (mi, day) => Date.UTC(Math.floor(mi / 12), mi % 12, day);
  const pStart = at(month, days[j]);
  const pEnd = (j + 1 < n ? at(month, days[j + 1]) : at(month + 1, days[0])) - DAY_MS;
  const today = Date.UTC(y, m - 1, d);
  const count = Math.max(1, Math.floor(((pEnd - pStart) / DAY_MS + 1) / len));
  const idx = Math.min(Math.floor((today - pStart) / DAY_MS / len), count - 1);
  const start = pStart + idx * len * DAY_MS;
  const end = idx === count - 1 ? pEnd : start + (len - 1) * DAY_MS;
  return { id: isoOf(new Date(start)), half: month * n + j, lastDay: today === end, shiftDay: today === pStart };
};

const ownersIn = (assignment, baseHalf, half) => {
  const shift = half - baseHalf;
  const out = {};
  for (let k = 1; k <= 20; k++) out[k] = (assignment || {})[String(wrap(k - shift))] || [];
  return out;
};
const firstName = (full) => String(full || '').split(/\s+/)[0] || 'წევრი';
const ergative = (n) => (/[აეიოუ]$/.test(n) ? `${n}მ` : `${n}მა`);
const memberName = (group, uid) => (group.members || []).find((m) => m.uid === uid)?.name || 'წევრი';

async function rowsFor(env, uids, flag) {
  if (!uids.length) return [];
  const rows = [];
  for (let i = 0; i < uids.length; i += 50) {
    const part = uids.slice(i, i + 50);
    const res = await env.DB.prepare(`SELECT key, endpoint, p256dh, auth, uid FROM subs WHERE ${flag} = 1 AND uid IN (${part.map(() => '?').join(',')})`).bind(...part).all();
    rows.push(...res.results);
  }
  return rows;
}

// ---- hourly: psalter groups and assignments ------------------------------------------------------------

async function runGroupHour(env, when) {
  const g = georgia(when);
  const hour = g.getUTCHours();
  const hh = `${pad(hour)}:00`;
  const sends = [];

  const groups = await fsList(env, 'psalterGroups');
  for (const group of groups) {
    if (group.archived) continue; // its class is in the admin's archive
    const cycle = cycleOf(g, group);
    const owners = ownersIn(group.assignment, typeof group.baseHalf === 'number' ? group.baseHalf : cycle.half, cycle.half);
    const daily = group.remindDaily === undefined ? '20:00' : group.remindDaily;
    const final = group.remindFinal === undefined ? '21:00' : group.remindFinal;
    const shiftDay = cycle.shiftDay && hour === SHIFT_HOUR;
    const isDaily = daily === hh;
    const isFinal = cycle.lastDay && final === hh;
    if (!isDaily && !isFinal && !shiftDay) continue;

    const slots = (await fsGet(env, `psalterGroups/${group.id}/cycles/${cycle.id}`))?.slots || {};
    // who answers for which unread kathisma now
    const due = new Map();
    const mine = new Map();
    for (let k = 1; k <= 20; k++) {
      const s = slots[k] || {};
      const who = s.takenBy ? [s.takenBy] : owners[k];
      for (const uid of owners[k]) mine.set(uid, [...(mine.get(uid) || []), k]);
      if (s.readBy) continue;
      for (const uid of who) due.set(uid, [...(due.get(uid) || []), k]);
    }
    const memberIds = group.memberIds || [];
    const rows = await rowsFor(env, memberIds, 'psalter');
    for (const row of rows) {
      const ks = due.get(row.uid) || [];
      if (shiftDay && (mine.get(row.uid) || []).length) {
        const list = mine.get(row.uid);
        // „ნახევარი თვე“ is true only for the 1st and the 15th; other shift days just say „from today“
        const when = shiftDaysOf(group).join() === '1,15' ? 'ამ ნახევარ თვეში' : 'დღეიდან';
        sends.push([row, { title: 'ფსალმუნთა ჯგუფი', body: `${when} შენი კანონია ${list.join(', ')} — ${group.name}`, tag: `shift-${group.id}`, url: `/?prayer=kathisma-${list[0]}` }]);
      } else if (ks.length && (isDaily || isFinal)) {
        const body = isFinal
          ? `ციკლი დღეს მთავრდება — კანონი ${ks.join(', ')} ჯერ წაკითხული არ გაქვს.`
          : `დღეს კანონი ${ks.join(', ')} ჯერ არ წაგიკითხავს. ღმერთმა შეგეწიოს!`;
        sends.push([row, { title: group.name || 'ფსალმუნთა ჯგუფი', body, tag: `psalter-${group.id}`, url: `/?prayer=kathisma-${ks[0]}` }]);
      }
    }
  }

  if (hour === ASSIGNMENT_HOUR) {
    const tomorrow = isoOf(new Date(g.getTime() + 86400_000));
    const classes = await fsList(env, 'classes');
    for (const cls of classes) {
      if (cls.archived) continue;
      const list = (await fsList(env, `classes/${cls.id}/assignments`)).filter((a) => a.due === tomorrow);
      for (const a of list) {
        const targets = Array.isArray(a.studentIds) && a.studentIds.length ? a.studentIds : cls.memberIds || [];
        for (const row of await rowsFor(env, targets, 'assignments')) {
          sends.push([row, { title: 'დავალება — ხვალ ვადაა', body: `${a.title}${a.voices?.length ? ` · ${a.voices.join(', ')} ხმა` : ''}`, tag: `asg-${a.id}`, url: '/?open=gz' }]);
        }
      }
    }
  }

  if (sends.length) await deliver(env, sends);
}

async function groupEvent(request, env) {
  const body = await readJson(request);
  if (!body) return [400, 'bad json'];
  let uid;
  try {
    uid = await verifyIdToken(env, body.token);
  } catch {
    return [401, 'bad token'];
  }
  const k = Number(body.kathisma);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(String(body.groupId)) || !(k >= 1 && k <= 20) || !['taken', 'help'].includes(body.kind)) return [400, 'bad event'];
  const group = await fsGet(env, `psalterGroups/${body.groupId}`);
  if (!group || !(group.memberIds || []).includes(uid)) return [403, 'not a member'];
  const g = georgia(new Date());
  const cycle = cycleOf(g, group);
  const slot = ((await fsGet(env, `psalterGroups/${body.groupId}/cycles/${cycle.id}`))?.slots || {})[k] || {};
  const fresh = (at) => at && Date.now() - new Date(at).getTime() < 10 * 60_000;
  const owners = ownersIn(group.assignment, typeof group.baseHalf === 'number' ? group.baseHalf : cycle.half, cycle.half)[k];
  const name = firstName(memberName(group, uid));
  let targets = [];
  let message = null;
  if (body.kind === 'taken' && slot.takenBy === uid && fresh(slot.takenAt)) {
    targets = owners.filter((o) => o !== uid);
    message = { title: group.name || 'ფსალმუნთა ჯგუფი', body: `შენი კანონი ${k} ${ergative(name)} აიღო — ამ ციკლში ის წაიკითხავს.`, tag: `taken-${group.id}-${k}`, url: '/?open=psalter' };
  } else if (body.kind === 'help' && slot.help?.by === uid && fresh(slot.help.at) && !slot.readBy && !slot.takenBy) {
    targets = (group.memberIds || []).filter((m) => m !== uid);
    message = { title: group.name || 'ფსალმუნთა ჯგუფი', body: `${name} დახმარებას ითხოვს — კანონი ${k}. თუ შეგიძლია, აიღე და წაიკითხე.`, tag: `help-${group.id}-${k}`, url: '/?open=psalter' };
  }
  if (!message) return [409, 'nothing to send'];
  const rows = await rowsFor(env, targets, 'psalter');
  await deliver(env, rows.map((r) => [r, message]));
  return [200, 'ok'];
}

// ---- admins: a newcomer waits; Monday's overview --------------------------------------------------------

// the admins who asked for a notice (adminPush/{uid}; firestore.rules lets only superadmins ask for `waiting`)
// only people who are still staff (a role taken away leaves their choice behind): superadmins for a waiting member,
// admins and superadmins for Monday's line
async function adminsWanting(env, what) {
  const [push, staff] = await Promise.all([
    fsList(env, 'adminPush', ['waiting', 'weekly']),
    fsList(env, 'admins', ['role', 'userId']),
  ]);
  const ok = new Set(staff.filter((s) => s.userId && (s.role === 'superadmin' || (what === 'weekly' && s.role === 'admin'))).map((s) => s.userId));
  return push.filter((d) => d[what] === true && ok.has(d.id)).map((d) => d.id);
}

const metaGet = async (env, key) => (await env.DB.prepare('SELECT value FROM meta WHERE key = ?').bind(key).first())?.value || null;
const metaSet = (env, key, value) => env.DB.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').bind(key, value).run();

async function accessRequest(request, env) {
  const body = await readJson(request);
  if (!body) return [400, 'bad json'];
  let claims;
  try {
    claims = await verifyIdClaims(env, body.token);
  } catch {
    return [401, 'bad token'];
  }
  const uid = claims.sub;
  // a real, fresh request — told once
  const access = await fsGet(env, `memberAccess/${uid}`);
  const fresh = access?.requestedAt && Date.now() - new Date(access.requestedAt).getTime() < 15 * 60_000;
  if (!access || access.status !== 'pending' || !fresh) return [409, 'no fresh request'];
  if (await metaGet(env, `access:${uid}`)) return [200, 'told'];
  await metaSet(env, `access:${uid}`, new Date().toISOString());
  const name = String(claims.name || '').trim().slice(0, 60);
  const message = {
    title: 'ახალი წევრი ელოდება',
    body: name ? `${name} ითხოვს სკოლაში დამატებას. შეეხე და გადაწყვიტე.` : 'ახალი ადამიანი ითხოვს სკოლაში დამატებას. შეეხე და გადაწყვიტე.',
    tag: `access-${uid}`,
    url: `/?open=admin&person=${uid}`,
  };
  const rows = await rowsFor(env, await adminsWanting(env, 'waiting'), 'admin');
  await deliver(env, rows.map((r) => [r, message]));
  return [200, 'ok'];
}

/** Monday's line: „3 ახალი წევრი · 12 აქტიური · 1 კლასს გაკვეთილი არ ჰქონია“ (empty parts left out). */
const weekText = ({ fresh, active, idle }) => {
  const parts = [];
  if (fresh) parts.push(`${fresh} ახალი წევრი`);
  parts.push(`${active} აქტიური`);
  if (idle) parts.push(`${idle} კლასს გაკვეთილი არ ჰქონია`);
  return parts.join(' · ');
};

async function runAdminWeek(env, when) {
  const week = isoOf(georgia(when));
  if (await metaGet(env, `week:${week}`)) return;
  await metaSet(env, `week:${week}`, when.toISOString());
  const uids = await adminsWanting(env, 'weekly');
  if (!uids.length) return;
  const since = new Date(when.getTime() - 7 * DAY_MS).toISOString();
  const sinceDay = isoOf(georgia(new Date(when.getTime() - 7 * DAY_MS)));
  // members marked „გასული“ (settings/leftMembers) are no longer counted
  const left = new Set(((await fsGet(env, 'settings/leftMembers').catch(() => null))?.uids || []).map(String));
  const students = (await fsList(env, 'students', ['createdAt', 'lastActiveAt'])).filter((s) => !left.has(s.id));
  const fresh = students.filter((s) => typeof s.createdAt === 'string' && s.createdAt >= since).length;
  const active = students.filter((s) => typeof s.lastActiveAt === 'string' && s.lastActiveAt >= since).length;
  // classes in use with no attendance list in the last 7 days
  let idle = 0;
  for (const c of await fsList(env, 'classes', ['archived'])) {
    if (c.archived) continue;
    const days = await fsList(env, `classes/${c.id}/attendance`, ['date']).catch(() => []);
    if (!days.some((d) => typeof d.date === 'string' && d.date >= sinceDay)) idle++;
  }
  const message = { title: 'სკოლის კვირა', body: weekText({ fresh, active, idle }), tag: `week-${week}`, url: '/?open=admin' };
  const rows = await rowsFor(env, uids, 'admin');
  await deliver(env, rows.map((r) => [r, message]));
}

// ---- the prayer hours (empty pushes, as before) --------------------------------------------------------

const localMinutes = (when, tz) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(when);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') * 60 + get('minute');
};

const isDue = (reminders, tz, when) => {
  const now = localMinutes(when, tz);
  for (const [id, offsets] of Object.entries(reminders)) {
    if (!(id in HOURS)) continue;
    for (const m of offsets) if ((HOURS[id] * 60 - m + 1440) % 1440 === now) return true;
  }
  return false;
};

async function runPrayerReminders(env, when) {
  const { results } = await env.DB.prepare("SELECT key, endpoint, tz, reminders FROM subs WHERE reminders != '{}'").all();
  const due = results.filter((r) => {
    try {
      return isDue(JSON.parse(r.reminders), r.tz, when);
    } catch {
      return false;
    }
  });
  if (due.length) await deliver(env, due.map((r) => [r, null]));
}

// ---- habits (pushes with their text) -------------------------------------------------------------------

const utcDay = (key) => new Date(`${key}T00:00:00Z`);
const nextKey = (key) => new Date(utcDay(key).getTime() + DAY_MS).toISOString().slice(0, 10);

const localDay = (when, tz) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(when).map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}`;
};

// the same rule as the site's src/utils/habitSchedule.ts (weeks start on Monday)
const fitsPlan = (p, start, d) => {
  if (p.unit === 'day') return Math.round((d - start) / DAY_MS) % p.every === 0;
  if (p.unit === 'week') {
    const days = p.days?.length ? p.days : [start.getUTCDay()];
    const monday = (x) => x.getTime() - ((x.getUTCDay() + 6) % 7) * DAY_MS;
    return days.includes(d.getUTCDay()) && (Math.round((monday(d) - monday(start)) / DAY_MS) / 7) % p.every === 0;
  }
  const months = (d.getUTCFullYear() - start.getUTCFullYear()) * 12 + d.getUTCMonth() - start.getUTCMonth();
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return months % p.every === 0 && d.getUTCDate() === Math.min(start.getUTCDate(), last);
};

const planDue = (p, key) => {
  if (key < p.start || (p.until && key > p.until)) return false;
  const start = utcDay(p.start);
  const d = utcDay(key);
  if (!fitsPlan(p, start, d)) return false;
  if (!p.count) return true;
  let n = 0;
  for (let x = start; x <= d; x = new Date(x.getTime() + DAY_MS)) if (fitsPlan(p, start, x) && ++n > p.count) return false;
  return true;
};

/** The habits' reminders due this minute in the browser's time zone (one before midnight is for the next day). */
const habitMessages = (habits, tz, when) => {
  const now = localMinutes(when, tz);
  const today = localDay(when, tz);
  const out = [];
  for (const h of habits) {
    const [hh, mm] = h.at.split(':').map(Number);
    for (const m of h.alerts) {
      let at = hh * 60 + mm - m;
      let day = today;
      if (at < 0) {
        at += 1440;
        day = nextKey(today);
      }
      if (at !== now || (h.plan && !planDue(h.plan, day))) continue;
      const soon = m === 0 ? 'დროა' : m === 60 ? '1 საათში' : `${m} წუთში`;
      out.push({ title: h.title, body: `${soon} — ${h.at}`, tag: `habit-${h.id}-${m}`, url: '/?open=gz' });
    }
  }
  return out;
};

async function runHabitReminders(env, when) {
  const { results } = await env.DB.prepare(`SELECT key, endpoint, p256dh, auth, tz, reminders FROM subs WHERE reminders LIKE '%"habits"%'`).all();
  const sends = [];
  for (const r of results) {
    if (!r.p256dh || !r.auth) continue;
    try {
      for (const message of habitMessages(JSON.parse(r.reminders).habits || [], r.tz, when)) sends.push([r, message]);
    } catch {
      /* a broken row waits for its next subscribe */
    }
  }
  if (sends.length) await deliver(env, sends);
}

// ---- home-screen widgets of the Android app ------------------------------------------------------------

const MAX_WIDGET_SECRETS = 10; // per person (phones and reinstalls)
const MAX_SUMMARY = 12_000;
const HABIT_ID = /^[\w-]{1,80}$/;
const json = (data, status = 200) => [status, JSON.stringify(data), 'application/json'];
const todayKey = (when = new Date()) => isoOf(georgia(when));
// a field path inside a map whose keys hold dashes: habitLog.`2026-10-29`
const fieldPath = (...parts) => parts.map((p) => (/^[A-Za-z_]\w*$/.test(p) ? p : `\`${p.replace(/[`\\]/g, '\\$&')}\``)).join('.');

async function widgetUid(env, secret) {
  if (typeof secret !== 'string' || secret.length < 20 || secret.length > 100) return null;
  const row = await env.DB.prepare('SELECT uid FROM widgets WHERE secret = ?').bind(await sha256(secret)).first();
  return row?.uid || null;
}

async function widgetLink(request, env) {
  const body = await readJson(request);
  let uid;
  try {
    uid = await verifyIdToken(env, body?.token);
  } catch {
    return [401, 'bad token'];
  }
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare('INSERT INTO widgets (secret, uid, created_at) VALUES (?, ?, ?)').bind(await sha256(secret), uid, new Date().toISOString()),
    env.DB.prepare(
      `DELETE FROM widgets WHERE uid = ? AND secret NOT IN (SELECT secret FROM widgets WHERE uid = ? ORDER BY created_at DESC LIMIT ${MAX_WIDGET_SECRETS})`
    ).bind(uid, uid),
  ]);
  return json({ secret });
}

async function widgetUnlink(request, env) {
  const body = await readJson(request);
  if (typeof body?.s === 'string') await env.DB.prepare('DELETE FROM widgets WHERE secret = ?').bind(await sha256(body.s)).run();
  return [200, 'ok'];
}

async function widgetSummary(request, env) {
  const body = await readJson(request);
  let uid;
  try {
    uid = await verifyIdToken(env, body?.token);
  } catch {
    return [401, 'bad token'];
  }
  const text = JSON.stringify(body.summary ?? null);
  if (!body.summary || typeof body.summary !== 'object' || text.length > MAX_SUMMARY) return [400, 'bad summary'];
  await env.DB.prepare('INSERT OR REPLACE INTO widget_summary (uid, json, updated_at) VALUES (?, ?, ?)').bind(uid, text, new Date().toISOString()).run();
  return [200, 'ok'];
}

// today's ticks and counts of one person, read without the rest of the history
async function habitDay(env, uid, day) {
  const mask = [fieldPath('habitLog', day), fieldPath('habitCounts', day)].map((f) => `mask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const res = await fetch(`${fsBase(env)}/students/${uid}?${mask}`, { headers: { Authorization: `Bearer ${await accessToken(env)}` } });
  if (res.status === 404) return { done: [], counts: {} };
  if (!res.ok) throw new Error(`firestore ${res.status}`);
  const doc = fromFields((await res.json()).fields);
  const done = doc.habitLog?.[day];
  const counts = doc.habitCounts?.[day];
  return { done: Array.isArray(done) ? done.filter((x) => typeof x === 'string') : [], counts: counts && typeof counts === 'object' ? counts : {} };
}

async function fsPatch(env, uid, paths, fields) {
  const mask = paths.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
  const res = await fetch(`${fsBase(env)}/students/${uid}?${mask}&currentDocument.exists=true`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`firestore ${res.status}`);
}

const writeDone = (env, uid, day, ids) =>
  fsPatch(env, uid, [fieldPath('habitLog', day)], ids.length
    ? { habitLog: { mapValue: { fields: { [day]: { arrayValue: { values: ids.map((stringValue) => ({ stringValue })) } } } } } }
    : {});

async function widgetData(request, env) {
  const url = new URL(request.url);
  const uid = await widgetUid(env, url.searchParams.get('s'));
  if (!uid) return [401, 'unknown'];
  const day = todayKey();
  const row = await env.DB.prepare('SELECT json, updated_at FROM widget_summary WHERE uid = ?').bind(uid).first();
  const summary = row ? JSON.parse(row.json) : null;
  return json({ day, summary, at: row?.updated_at || null, ...(await habitDay(env, uid, day)) });
}

async function widgetTick(request, env) {
  const body = await readJson(request);
  const uid = await widgetUid(env, body?.s);
  if (!uid) return [401, 'unknown'];
  if (typeof body.id !== 'string' || !HABIT_ID.test(body.id)) return [400, 'bad id'];
  const day = todayKey();
  const { done } = await habitDay(env, uid, day);
  const next = done.includes(body.id) ? done.filter((h) => h !== body.id) : [...done, body.id];
  await writeDone(env, uid, day, next);
  return json({ day, done: next });
}

// a counted habit (the Jesus prayer): adds `add` to today's number; reaching the habit's goal ticks the day
async function widgetCount(request, env) {
  const body = await readJson(request);
  const uid = await widgetUid(env, body?.s);
  if (!uid) return [401, 'unknown'];
  const add = Math.round(Number(body.add));
  if (typeof body.id !== 'string' || !HABIT_ID.test(body.id) || !(add >= 1 && add <= 1000)) return [400, 'bad count'];
  const day = todayKey();
  const { done, counts } = await habitDay(env, uid, day);
  const n = Math.min(100000, (Number(counts[body.id]) || 0) + add);
  await fsPatch(env, uid, [fieldPath('habitCounts', day, body.id)], {
    habitCounts: { mapValue: { fields: { [day]: { mapValue: { fields: { [body.id]: { integerValue: String(n) } } } } } } },
  });
  const row = await env.DB.prepare('SELECT json FROM widget_summary WHERE uid = ?').bind(uid).first();
  const goal = Number((row ? JSON.parse(row.json) : null)?.habits?.find?.((h) => h?.id === body.id)?.goal) || 0;
  let next = done;
  if (goal && n >= goal && !done.includes(body.id)) {
    next = [...done, body.id];
    await writeDone(env, uid, day, next);
  }
  return json({ day, done: next, count: n });
}

// the member's phone calendar (worker/reminders/ics.js): the same secret as the widgets, from POST /widget/link
async function calendarFeed(request, env) {
  const m = /^\/cal\/([\w-]{20,100})\.ics$/.exec(new URL(request.url).pathname);
  const uid = m && (await widgetUid(env, m[1]));
  if (!uid) return [404, 'unknown'];
  const classes = (await fsList(env, 'classes', ['name', 'archived', 'memberIds', 'teacherIds', 'schedule']))
    .filter((c) => !c.archived && ((c.memberIds || []).includes(uid) || (c.teacherIds || []).includes(uid)));
  return [200, buildIcs(classes), 'text/calendar; charset=utf-8'];
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const routes = {
      '/subscribe': subscribe, '/account': account, '/group-event': groupEvent, '/access-request': accessRequest,
      '/widget/link': widgetLink, '/widget/summary': widgetSummary,
    };
    // the app's widgets send no Origin: their secret is the proof
    const widgetRoutes = { 'GET /widget/data': widgetData, 'POST /widget/tick': widgetTick, 'POST /widget/count': widgetCount, 'POST /widget/unlink': widgetUnlink };
    const fromWidget = widgetRoutes[`${request.method} ${url.pathname}`] || (request.method === 'GET' && url.pathname.startsWith('/cal/') ? calendarFeed : null);
    const handler = fromWidget || (request.method === 'POST' ? routes[url.pathname] : null);
    if (handler) {
      if (!fromWidget && !allowedOrigin(origin)) return new Response('forbidden', { status: 403, headers });
      try {
        await migrateFromKv(env);
        await ensureSchema(env);
        const [status, text, type] = await handler(request, env);
        return new Response(text, { status, headers: type ? { ...headers, 'Content-Type': type } : headers });
      } catch (e) {
        return new Response('error', { status: 500, headers });
      }
    }
    return new Response('sagandzuri reminders', { status: 200, headers });
  },

  async scheduled(event, env, ctx) {
    const when = new Date(event.scheduledTime);
    ctx.waitUntil((async () => {
      await migrateFromKv(env);
      await ensureSchema(env);
      // the group reminders need FIREBASE_SA; without it the prayer reminders still work
      // one cron each minute: :00 the groups, :50 :55 :59 the prayer hours, every minute the habits;
      // Monday 10:00 (Georgian time) the admins' week
      const minute = when.getUTCMinutes();
      if (minute === 0) await runGroupHour(env, when).catch((e) => console.warn("group hour:", e?.message));
      const g = georgia(when);
      if (minute === 0 && g.getUTCDay() === 1 && g.getUTCHours() === 10) await runAdminWeek(env, when).catch((e) => console.warn('admin week:', e?.message));
      else if (minute === 50 || minute === 55 || minute === 59) await runPrayerReminders(env, when);
      await runHabitReminders(env, when).catch((e) => console.warn('habits:', e?.message));
    })());
  },
};

// for tests (tests/reminders-worker.test.mjs, tests/adminTools.test.ts)
export { encryptPayload, cycleOf, ownersIn, weekText };
