-- D1 database for the reminders Worker (run once: npx wrangler d1 execute sagandzuri-reminders --remote --file=schema.sql)
CREATE TABLE IF NOT EXISTS subs (
  key TEXT PRIMARY KEY,            -- SHA-256 of the push endpoint
  endpoint TEXT NOT NULL,
  p256dh TEXT,                     -- the browser's keys, for messages with text
  auth TEXT,
  tz TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
  reminders TEXT NOT NULL DEFAULT '{}', -- seven-times prayers: { "hour-12": [10, 5, 1] }
  uid TEXT,                        -- the signed-in person (group and assignment reminders)
  psalter INTEGER NOT NULL DEFAULT 0,
  assignments INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS subs_uid ON subs (uid);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
