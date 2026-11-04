DROP INDEX IF EXISTS photos_created;
CREATE INDEX IF NOT EXISTS photos_visible ON photos(hidden, id);
