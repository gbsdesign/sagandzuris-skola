// The reminders Worker's push encryption and psalter rules.
// Run: node tests/reminders-worker.test.mjs <path to a folder with node_modules/http_ece> (npm i http_ece@1 there)
import { createECDH, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { encryptPayload, cycleOf, ownersIn } from '../worker/reminders/reminders.js';

const ece = createRequire(`${process.argv[2] || process.cwd()}/`)('http_ece');
const b64url = (b) => Buffer.from(b).toString('base64url');

// a browser's subscription keys
const ua = createECDH('prime256v1');
ua.generateKeys();
const auth = randomBytes(16);
const text = JSON.stringify({ title: 'ფსალმუნთა ჯგუფი', body: 'დღეს კანონი 8 ჯერ არ წაგიკითხავს.', url: '/?prayer=kathisma-8' });

const sealed = await encryptPayload(b64url(ua.getPublicKey()), b64url(auth), text);
const opened = ece.decrypt(Buffer.from(sealed), { version: 'aes128gcm', privateKey: ua, authSecret: auth });
assert.equal(opened.toString('utf8'), text);
console.log('push payload decrypts: ok');

// the same cycles as src/utils/psalter.ts (31 Oct is the third day of the 29–31 cycle)
const at = (iso) => new Date(`${iso}T08:00:00Z`);
assert.deepEqual(cycleOf(at('2026-10-31'), 2), { id: '2026-10-29', endDay: 31, half: (2026 * 12 + 9) * 2 + 1, lastDay: true });
assert.equal(cycleOf(at('2026-10-15'), 2).id, '2026-10-15');
assert.equal(cycleOf(at('2026-10-14'), 1).lastDay, true);
const owners = ownersIn({ 7: ['nino'], 20: ['giorgi'] }, 100, 101);
assert.deepEqual(owners[8], ['nino']);
assert.deepEqual(owners[1], ['giorgi']);
console.log('cycles and rotation: ok');
