CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  pw_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  ip_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_entries_created ON entries (created_at DESC, id DESC);
CREATE INDEX idx_entries_ip ON entries (ip_hash, created_at);
