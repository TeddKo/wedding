CREATE TABLE uploads (
  uuid TEXT PRIMARY KEY,
  ext TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  device_id TEXT,
  fw INTEGER, fh INTEGER, tw INTEGER, th INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX uploads_ip ON uploads(ip_hash, created_at);
CREATE INDEX uploads_device ON uploads(device_id);
CREATE INDEX uploads_created ON uploads(created_at);
CREATE TABLE pw_fails (
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX pw_fails_ip ON pw_fails(ip_hash, created_at);
