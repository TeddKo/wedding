CREATE TABLE poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  norm TEXT NOT NULL UNIQUE,
  creator_key TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE poll_votes (
  voter_key TEXT PRIMARY KEY,
  option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL
);
CREATE INDEX poll_votes_option ON poll_votes(option_id);
CREATE INDEX poll_options_ip ON poll_options(ip_hash, created_at);
