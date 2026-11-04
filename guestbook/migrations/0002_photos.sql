CREATE TABLE photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  ext TEXT NOT NULL,
  w INTEGER, h INTEGER, size INTEGER,
  pw_hash TEXT, salt TEXT,
  ip_hash TEXT NOT NULL, device_id TEXT,
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX photos_ip ON photos(ip_hash, created_at);
CREATE INDEX photos_created ON photos(hidden, created_at);
CREATE INDEX photos_device ON photos(device_id);
