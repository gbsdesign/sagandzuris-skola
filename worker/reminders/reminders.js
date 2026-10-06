// Cloudflare Worker "sagandzuri-reminders": Web Push reminders.
//
// • Seven-times prayers: POST /subscribe { subscription, reminders: { 'hour-12': [10, 5, 1], ... }, tz }
//   stores one browser's prayer reminders. Cron :50, :55, :59 sends an empty push; the site's service
//   worker (public/prayer-notify-sw.js) works out which hour is near and shows it.
// • Group reminders: POST /account { subscription, token, psalter, assignments } binds the browser to the
//   signed-in person (the Firebase ID token proves who they are). Cron :00 sends, in Georgian time:
//   - psalter group: a nudge at the group's daily hour (20:00) to whoever hasn't read their kathisma,
//     another at the cycle's last evening (21:00), and on the 1st and 15th at 09:00 the new kathisma;
//   - assignments: at 19:00 the day before the deadline.
// • POST /group-event { token, groupId, kind: 'taken' | 'help', kathisma }: "your kathisma was taken by …"
//   to its reader, "help needed" to the group. The facts are checked in Firestore before anything is sent.
// These pushes carry an encrypted text payload (RFC 8291, aes128gcm).
//
// Bindings (wrangler.toml): D1 database DB (schema.sql), KV namespace REMINDERS (old storage, read once to
// move the subscriptions into D1), vars VAPID_PUBLIC_KEY, FIREBASE_PROJECT_ID, FIRESTORE_DB,
// secrets VAPID_PRIVATE_JWK and FIREBASE_SA (the service account's JSON key, for reading Firestore).

const MAIN_ORIGINS = ['https://sagandzuris-skola.pages.dev', 'http://localhost:5173'];
const PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+\.sagandzuris-skola\.pages\.dev$/;
const allowedOrigin = (o) => MAIN_ORIGINS.includes(o) || PREVIEW_ORIGIN.test(o);
const HOURS = { 'hour-6': 6, 'hour-9': 9, 'hour-12': 12, 'hour-15': 15, 'hour-18': 18, 'hour-21': 21, 'hour-24': 0 };
const OFFSETS = [10, 5, 1];
const MAX_SUBS = 5000;
const SUBJECT = 'https://sagandzuris-skola.pages.dev';
const TBILISI_MS = 4 * 3600_000; // Georgia keeps UTC+4 all year
const ASSIGNMENT_HOUR = 19;
const SHIFT_HOUR = 9;

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
  const row = await env.DB.prepare('SELECT uid, psalter, assignments FROM subs WHERE key = ?').bind(key).first();
  if (!Object.keys(reminders).length && !(row && (row.psalter || row.assignments))) {
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
  const row = await env.DB.prepare('SELECT reminders FROM subs WHERE key = ?').bind(key).first();
  if (!psalter && !assignments && (!row || row.reminders === '{}')) {
    await env.DB.prepare('DELETE FROM subs WHERE key = ?').bind(key).run();
    return [200, 'ok'];
  }
  if (!row) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM subs').first();
    if (n >= MAX_SUBS) return [503, 'full'];
  }
  await env.DB.prepare(
    `INSERT INTO subs (key, endpoint, p256dh, auth, tz, reminders, uid, psalter, assignments, updated_at)
     VALUES (?, ?, ?, ?, 'Asia/Tbilisi', '{}', ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
       uid = excluded.uid, psalter = excluded.psalter, assignments = excluded.assignments, updated_at = excluded.updated_at`
  ).bind(key, sub.endpoint, sub.keys.p256dh, sub.keys.auth, uid, psalter, assignments, new Date().toISOString()).run();
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

async function fsList(env, path) {
  const out = [];
  let page = '';
  do {
    const res = await fetch(`${fsBase(env)}/${path}?pageSize=300${page ? `&pageToken=${page}` : ''}`, { headers: { Authorization: `Bearer ${await accessToken(env)}` } });
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
const halfIndex = (y, m, d) => (y * 12 + (m - 1)) * 2 + (d >= 15 ? 1 : 0);
const wrap = (k) => ((((k - 1) % 20) + 20) % 20) + 1;

const cycleOf = (g, cycleDays) => {
  const y = g.getUTCFullYear(), m = g.getUTCMonth() + 1, d = g.getUTCDate();
  const len = cycleDays === 1 ? 1 : 2;
  const first = d >= 15 ? 15 : 1;
  const last = d >= 15 ? new Date(Date.UTC(y, m, 0)).getUTCDate() : 14;
  const count = Math.max(1, Math.floor((last - first + 1) / len));
  const idx = Math.min(Math.floor((d - first) / len), count - 1);
  const startDay = first + idx * len;
  const endDay = idx === count - 1 ? last : startDay + len - 1;
  return { id: `${y}-${pad(m)}-${pad(startDay)}`, endDay, half: halfIndex(y, m, startDay), lastDay: d === endDay };
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
    const cycle = cycleOf(g, group.cycleDays);
    const owners = ownersIn(group.assignment, typeof group.baseHalf === 'number' ? group.baseHalf : cycle.half, cycle.half);
    const daily = group.remindDaily === undefined ? '20:00' : group.remindDaily;
    const final = group.remindFinal === undefined ? '21:00' : group.remindFinal;
    const shiftDay = (g.getUTCDate() === 1 || g.getUTCDate() === 15) && hour === SHIFT_HOUR;
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
        sends.push([row, { title: 'ფსალმუნთა ჯგუფი', body: `ამ ნახევარ თვეში შენი კანონია ${list.join(', ')} — ${group.name}`, tag: `shift-${group.id}`, url: `/?prayer=kathisma-${list[0]}` }]);
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
  const cycle = cycleOf(g, group.cycleDays);
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

// ---- the prayer hours (empty pushes, as before) --------------------------------------------------------

const localMinutes = (when, tz) => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(when);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return get('hour') * 60 + get('minute');
};

const isDue = (reminders, tz, when) => {
  const now = localMinutes(when, tz);
  for (const [id, offsets] of Object.entries(reminders)) {
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const routes = { '/subscribe': subscribe, '/account': account, '/group-event': groupEvent };
    const handler = request.method === 'POST' ? routes[url.pathname] : null;
    if (handler) {
      if (!allowedOrigin(origin)) return new Response('forbidden', { status: 403, headers });
      try {
        await migrateFromKv(env);
        const [status, text] = await handler(request, env);
        return new Response(text, { status, headers });
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
      // the group reminders need FIREBASE_SA; without it the prayer reminders still work
      if (when.getUTCMinutes() === 0) await runGroupHour(env, when).catch((e) => console.warn("group hour:", e?.message));
      else await runPrayerReminders(env, when);
    })());
  },
};

// for tests (tests/reminders-worker.test.mjs)
export { encryptPayload, cycleOf, ownersIn };
