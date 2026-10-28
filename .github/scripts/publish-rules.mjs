// Publishes firestore.rules to the app's named database through the Firebase Rules API.
// (`firebase deploy` first asks the Service Usage API whether Firestore is on, and the Admin SDK's service account
// may not read that — so the two calls `firebase deploy` makes in the end are made here directly.)
// Usage: node publish-rules.mjs <project> <databaseId> <rules file>; credentials from GOOGLE_APPLICATION_CREDENTIALS.
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';

const [project, db, file] = process.argv.slice(2);
const base = `https://firebaserules.googleapis.com/v1/projects/${project}`;
const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();

const call = async (what, opts) => {
  try { return (await client.request(opts)).data; } catch (e) {
    const err = e.response?.data?.error;
    console.error(`::error::${what} failed: ${err ? `${err.code} ${err.status} — ${err.message}` : e.message}`);
    process.exit(1);
  }
};

const ruleset = await call('Creating the ruleset', {
  url: `${base}/rulesets`, method: 'POST',
  data: { source: { files: [{ name: 'firestore.rules', content: readFileSync(file, 'utf8') }] } },
});
const release = db && db !== '(default)' ? `cloud.firestore/${db}` : 'cloud.firestore';
await call('Releasing it', {
  url: `${base}/releases/${release}`, method: 'PATCH',
  data: { release: { name: `projects/${project}/releases/${release}`, rulesetName: ruleset.name } },
});
console.log(`Published ${ruleset.name} to ${release}`);
